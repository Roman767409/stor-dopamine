"""DopaBot: a rule-based chat assistant.

No external AI services are used: the intent is recognized by keywords and the
reply is built from templates plus the current user's real data. Messages are
neither stored nor logged (privacy); this module only reads from the database.

Languages: English, Polish and Ukrainian. The reply language follows the
message (Cyrillic -> Ukrainian, Polish letters or keywords -> Polish, English
keywords -> English); a neutral message ("ok", "12345") gets the UI language
sent by the client as a hint.
"""

import re
import unicodedata
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import User
from app.repositories import order_repository
from app.services import tracking_service

UK = "uk"
PL = "pl"
EN = "en"
LANGUAGES = (EN, PL, UK)

LOW_BALANCE_THRESHOLD = Decimal("10000")

# Intents in priority order: when several match, the first one wins
INTENT_PRIORITY = (
    "impulse",
    "last_order",
    "savings",
    "balance",
    "tips",
    "about",
    "help",
    "thanks",
    "greeting",
)
UNKNOWN = "unknown"

# English and Ukrainian keywords per intent. Cyrillic keywords are word stems
# matched as substrings. Latin keywords must start at a word boundary ("order"
# matches "orders" but "hi" does not match "this"); WHOLE_WORDS must also end
# at a word boundary.
INTENT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "greeting": ("привіт", "вітаю", "hello", "hi", "hey"),
    "balance": ("баланс", "скільки dp", "скільки в мене", "balance", "how many dp"),
    "savings": ("економ", "заощад", "зберіг", "savings", "saved"),
    "last_order": (
        "замовлен",
        "посилк",
        "статус",
        "трек",
        "order",
        "parcel",
        "tracking",
        "status",
    ),
    "impulse": (
        "хочу купити",
        "хочеться купити",
        "не можу зупинитись",
        "імпульс",
        "i want to buy",
        "can't stop shopping",
        "impulse",
    ),
    "tips": ("порад", "як не витрачати", "tip", "advice", "how to stop"),
    "about": ("що це", "про проєкт", "як працює", "what is", "how does it work", "about"),
    "thanks": ("дякую", "дякс", "thanks", "thank you"),
    "help": ("допомож", "що ти вмієш", "help", "what can you do"),
}

# Polish keywords per intent (stems, start at a word boundary). They are matched
# against the message folded to ASCII (see fold), so "chce kupic" typed without
# diacritics matches "chcę kupić" as well.
POLISH_INTENT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "greeting": ("cześć", "hej", "witaj", "dzień dobry"),
    "balance": ("saldo", "ile mam", "ile dp", "stan konta"),
    "savings": ("oszczęd", "zaoszczędz"),
    "last_order": ("zamówien", "paczk", "przesyłk", "status", "śledz", "numer śledzenia"),
    "impulse": (
        "chcę kupić",
        "chce kupić",
        "kusi mnie",
        "nie mogę przestać",
        "impuls",
        "zakupoholi",
    ),
    "tips": ("porad", "wskazówk", "jak nie wydawać", "jak przestać"),
    "about": ("co to jest", "o projekcie", "jak to działa"),
    "thanks": ("dziękuję", "dzięki"),
    "help": ("pomoc", "pomóż", "co potrafisz", "co umiesz"),
}

WHOLE_WORDS = {"hi", "hey"}

# Keywords that are words in both English and Polish ("status") or that match
# an English word ("impuls" in "impulse"): they still select the intent but say
# nothing about the language, so such messages fall through to the next rule.
NEUTRAL_LANGUAGE_KEYWORDS = {"status", "impuls"}

_CYRILLIC = re.compile(r"[Ѐ-ӿ]")
_POLISH_LETTERS = re.compile(r"[ąćęłńóśźż]")
_APOSTROPHES = str.maketrans({"’": "'", "ʼ": "'", "`": "'"})


# Lower-case, unify apostrophes and collapse whitespace
def normalize(message: str) -> str:
    return " ".join(message.translate(_APOSTROPHES).lower().split())


# Removes diacritics: "chcę kupić" -> "chce kupic". "ł" has no Unicode
# decomposition, so it is replaced explicitly. Used for Polish keywords only:
# folding would also change Cyrillic letters such as "й" and "ї".
def fold(text: str) -> str:
    text = text.replace("ł", "l").replace("Ł", "L")
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def _keyword_pattern(keyword: str) -> re.Pattern[str]:
    escaped = re.escape(keyword)
    if _CYRILLIC.search(keyword):
        return re.compile(escaped)
    end = r"\b" if keyword in WHOLE_WORDS else ""
    return re.compile(rf"(?<![a-z0-9]){escaped}{end}")


_INTENT_PATTERNS = {
    intent: tuple(_keyword_pattern(k) for k in keywords)
    for intent, keywords in INTENT_KEYWORDS.items()
}
_POLISH_PATTERNS = {
    intent: tuple(_keyword_pattern(fold(k)) for k in keywords)
    for intent, keywords in POLISH_INTENT_KEYWORDS.items()
}

# Language signals: Latin keywords of each language, without the neutral ones
_ENGLISH_SIGNALS = tuple(
    _keyword_pattern(k)
    for keywords in INTENT_KEYWORDS.values()
    for k in keywords
    if not _CYRILLIC.search(k) and k not in NEUTRAL_LANGUAGE_KEYWORDS
)
_POLISH_SIGNALS = tuple(
    _keyword_pattern(fold(k))
    for keywords in POLISH_INTENT_KEYWORDS.values()
    for k in keywords
    if k not in NEUTRAL_LANGUAGE_KEYWORDS
)


def _matches(patterns, text: str) -> bool:
    return any(pattern.search(text) for pattern in patterns)


# Pure keyword-based intent detection (no database access)
def detect_intent(message: str) -> str:
    text = normalize(message)
    folded = fold(text)
    for intent in INTENT_PRIORITY:
        if _matches(_INTENT_PATTERNS[intent], text) or _matches(_POLISH_PATTERNS[intent], folded):
            return intent
    return UNKNOWN


# Reply language, checked in this order:
# 1. any Cyrillic letter -> Ukrainian;
# 2. a Polish letter (ąćęłńóśźż) or a Polish keyword -> Polish;
# 3. an English keyword -> English;
# 4. otherwise the client's hint (UI language) if it is supported, else English.
def detect_language(message: str, hint: str | None = None) -> str:
    text = normalize(message)
    if _CYRILLIC.search(text):
        return UK
    if _POLISH_LETTERS.search(text) or _matches(_POLISH_SIGNALS, fold(text)):
        return PL
    if _matches(_ENGLISH_SIGNALS, text):
        return EN
    return hint if hint in LANGUAGES else EN


# "86 200 DP"; cents are shown only when present ("97 531.50 DP")
def format_dp(value) -> str:
    amount = Decimal(value or 0).quantize(Decimal("0.01"))
    if amount == amount.to_integral_value():
        text = f"{int(amount):,}"
    else:
        text = f"{amount:,.2f}"
    return text.replace(",", " ") + " DP"


# Polish plural form: 1 produkt, 2-4 produkty (but 12-14 produktów), 5+ produktów
def polish_plural(count: int, one: str, few: str, many: str) -> str:
    if count == 1:
        return one
    if count % 10 in (2, 3, 4) and count % 100 not in (12, 13, 14):
        return few
    return many


# Tips against impulse buying; the same index in every language is the same tip
TIPS = {
    UK: (
        "Складіть список покупок заздалегідь і купуйте лише те, що в ньому є.",
        "Почекайте 24 години перед будь-якою незапланованою покупкою.",
        "Видаліть збережені картки з магазинів: зайвий крок дає час подумати.",
        "Відпишіться від розсилок зі знижками: «акція» не означає «потрібно».",
        "Порахуйте ціну в годинах своєї роботи: чи варта річ стільки часу?",
        "Не заходьте в магазини, коли вам сумно, нудно чи ви втомилися.",
        "Перед покупкою знайдіть удома річ, яка вже виконує ту саму роль.",
        "Встановіть місячний ліміт на «приємні дрібниці» й записуйте кожну витрату.",
        "Залиште товар у кошику на тиждень: часто бажання зникає саме.",
    ),
    PL: (
        "Przygotuj listę zakupów z wyprzedzeniem i kupuj tylko to, co się na niej znajduje.",
        "Odczekaj 24 godziny przed każdym nieplanowanym zakupem.",
        "Usuń zapisane karty ze sklepów internetowych: dodatkowy krok daje czas do namysłu.",
        "Wypisz się z newsletterów z promocjami: „okazja” nie znaczy „potrzeba”.",
        "Przelicz cenę na godziny swojej pracy: czy ta rzecz jest warta tyle czasu?",
        "Nie rób zakupów, kiedy dopada Cię smutek, nuda albo zmęczenie.",
        "Zanim coś kupisz, poszukaj w domu rzeczy, która już spełnia tę samą funkcję.",
        "Ustal miesięczny limit na drobne przyjemności i zapisuj każdy wydatek.",
        "Zostaw produkt w koszyku na tydzień: ochota na zakup często mija sama.",
    ),
    EN: (
        "Write a shopping list in advance and buy only what is on it.",
        "Wait 24 hours before any unplanned purchase.",
        "Remove saved cards from shops: one extra step gives you time to think.",
        "Unsubscribe from sale newsletters: \"on sale\" does not mean \"needed\".",
        "Count the price in hours of your work: is the item worth that much time?",
        "Avoid shopping when you feel sad, bored or tired.",
        "Before buying, look for something at home that already does the same job.",
        "Set a monthly limit for small treats and write down every expense.",
        "Leave the item in your cart for a week: the urge often fades by itself.",
    ),
}

TIP_PREFIX = {UK: "Порада: ", PL: "Porada: ", EN: "Tip: "}

STATUS_LABELS = {
    UK: {
        "CREATED": "створено",
        "PROCESSING": "обробляється",
        "IN_TRANSIT": "в дорозі",
        "DELIVERED": "доставлено",
    },
    PL: {
        "CREATED": "utworzone",
        "PROCESSING": "w przygotowaniu",
        "IN_TRANSIT": "w drodze",
        "DELIVERED": "dostarczone",
    },
    EN: {
        "CREATED": "created",
        "PROCESSING": "processing",
        "IN_TRANSIT": "in transit",
        "DELIVERED": "delivered",
    },
}

# Follow-up prompts; each of them is recognized by detect_intent
# and detected as its own language by detect_language
SUGGESTIONS = {
    UK: {
        "balance": "Який мій баланс?",
        "order": "Де моє замовлення?",
        "savings": "Скільки я заощадив?",
        "tip": "Дай пораду",
        "about": "Як працює DopamineStore?",
    },
    PL: {
        "balance": "Jakie mam saldo?",
        "order": "Gdzie jest moje zamówienie?",
        "savings": "Ile udało mi się zaoszczędzić?",
        "tip": "Daj mi poradę",
        "about": "Jak to działa?",
    },
    EN: {
        "balance": "What is my balance?",
        "order": "Where is my order?",
        "savings": "How much have I saved?",
        "tip": "Give me a tip",
        "about": "How does it work?",
    },
}

CAPABILITIES = {
    UK: (
        "Я вмію:\n"
        "• показати ваш баланс DP;\n"
        "• розповісти, скільки ви заощадили;\n"
        "• показати статус останнього замовлення;\n"
        "• дати пораду проти імпульсивних покупок;\n"
        "• допомогти, коли дуже хочеться щось купити."
    ),
    PL: (
        "Potrafię:\n"
        "• pokazać Twoje saldo DP;\n"
        "• powiedzieć, ile udało Ci się zaoszczędzić;\n"
        "• sprawdzić status Twojego ostatniego zamówienia;\n"
        "• podsunąć poradę, jak nie ulegać impulsywnym zakupom;\n"
        "• pomóc, kiedy bardzo chcesz coś kupić."
    ),
    EN: (
        "I can:\n"
        "• show your DP balance;\n"
        "• tell you how much you have saved;\n"
        "• show the status of your latest order;\n"
        "• give a tip against impulse buying;\n"
        "• help when you really want to buy something."
    ),
}

NO_ORDERS = {
    UK: "У вас ще немає замовлень.",
    PL: "Nie masz jeszcze żadnych zamówień.",
    EN: "You have no orders yet.",
}


def _suggest(lang: str, *keys: str) -> list[str]:
    return [SUGGESTIONS[lang][key] for key in keys][:3]


def _balance(db: Session, user: User, lang: str) -> tuple[str, list[str]]:
    balance = format_dp(user.virtual_balance)
    low = Decimal(user.virtual_balance) < LOW_BALANCE_THRESHOLD
    if lang == UK:
        reply = f"Ваш поточний баланс: {balance}."
        if low:
            reply += " Баланс невеликий: його можна скинути до 100 000 DP у профілі."
    elif lang == PL:
        reply = f"Twoje saldo wynosi {balance}."
        if low:
            reply += " Saldo jest już niskie: w profilu możesz przywrócić je do 100 000 DP."
    else:
        reply = f"Your current balance is {balance}."
        if low:
            reply += " Your balance is low: you can reset it to 100 000 DP in your profile."
    return reply, _suggest(lang, "savings", "order", "tip")


def _savings(db: Session, user: User, lang: str) -> tuple[str, list[str]]:
    orders_count = order_repository.count_user_orders(db, user.id)
    if orders_count == 0:
        if lang == UK:
            reply = (
                "У вас ще немає замовлень. Ідея DopamineStore: ви проходите весь шлях "
                "покупки з віртуальними DP, а реальні гроші залишаються з вами. "
                "Спробуйте першу віртуальну покупку в каталозі!"
            )
        elif lang == PL:
            reply = (
                "Nie masz jeszcze żadnych zamówień. Pomysł na DopamineStore jest prosty: "
                "przechodzisz całą drogę zakupów z wirtualnymi DP, a prawdziwe pieniądze "
                "zostają w Twoim portfelu. Spróbuj pierwszego wirtualnego zakupu w sklepie!"
            )
        else:
            reply = (
                "You have no orders yet. The idea of DopamineStore: you go through "
                "the whole shopping experience with virtual DP, while your real money "
                "stays with you. Try your first virtual purchase in the shop!"
            )
        return reply, _suggest(lang, "about", "balance", "tip")

    saved = format_dp(user.total_saved_amount)
    if lang == UK:
        reply = (
            f"Ви заощадили {saved} реальних грошей за {orders_count} "
            f"віртуальних замовлень. Чудова робота!"
        )
    elif lang == PL:
        orders = polish_plural(
            orders_count, "wirtualne zamówienie", "wirtualne zamówienia", "wirtualnych zamówień"
        )
        reply = (
            f"Masz już za sobą {orders_count} {orders}, a w portfelu zostało Ci "
            f"{saved} prawdziwych pieniędzy. Świetna robota!"
        )
    else:
        reply = (
            f"You have saved {saved} of real money across {orders_count} "
            f"virtual order{'s' if orders_count != 1 else ''}. Great job!"
        )
    return reply, _suggest(lang, "order", "balance", "tip")


def _last_order(db: Session, user: User, lang: str) -> tuple[str, list[str]]:
    rows = order_repository.list_user_orders(db, user.id, offset=0, limit=1)
    if not rows:
        return NO_ORDERS[lang], _suggest(lang, "about", "balance", "tip")

    order, items_count = rows[0]
    # Computed for display only: the chat never writes to the database
    status = tracking_service.effective_status(
        order.status, order.created_at, tracking_service.utc_now()
    )
    label = STATUS_LABELS[lang][status]
    total = format_dp(order.total_price)
    if lang == UK:
        reply = (
            f"Ваше останнє замовлення {order.tracking_number}: {total}, "
            f"товарів: {items_count}. Поточний статус: {label}."
        )
    elif lang == PL:
        products = polish_plural(items_count, "produkt", "produkty", "produktów")
        reply = (
            f"Twoje ostatnie zamówienie {order.tracking_number}: {total}, "
            f"{items_count} {products}. Obecny status: {label}."
        )
    else:
        reply = (
            f"Your latest order {order.tracking_number}: {total}, "
            f"{items_count} item{'s' if items_count != 1 else ''}. "
            f"Current status: {label}."
        )
    return reply, _suggest(lang, "savings", "balance", "tip")


IMPULSE_REPLIES = {
    UK: (
        "Зупинімося на хвилинку й подумаймо:\n"
        "1. Чи справді вам потрібна ця річ?\n"
        "2. Чи планували ви купити її ще вчора?\n"
        "3. Що ви відчуваєте просто зараз: нудьгу, втому, тривогу?\n"
        "Правило 24 годин: відкладіть покупку на добу. Якщо бажання минеться, "
        "річ була не потрібна.\n"
        "А поки додайте її в кошик цього симулятора: отримаєте дофамін без витрат."
    ),
    PL: (
        "Zatrzymajmy się na chwilę i zastanówmy:\n"
        "1. Czy naprawdę potrzebujesz tej rzeczy?\n"
        "2. Czy ten zakup był w planach jeszcze wczoraj?\n"
        "3. Co czujesz w tej chwili: nudę, zmęczenie, niepokój?\n"
        "Zasada 24 godzin: odłóż zakup na dobę. Jeśli ochota minie, ta rzecz "
        "nie była Ci potrzebna.\n"
        "A tymczasem wrzuć ją do koszyka w tym symulatorze: dostaniesz porcję "
        "dopaminy bez wydawania pieniędzy."
    ),
    EN: (
        "Let's pause for a moment and think:\n"
        "1. Do you really need this item?\n"
        "2. Did you plan to buy it yesterday?\n"
        "3. What are you feeling right now: boredom, tiredness, anxiety?\n"
        "The 24-hour rule: put the purchase off for a day. If the urge fades, "
        "you did not need it.\n"
        "Meanwhile, add it to the cart of this simulator: you get the dopamine "
        "without spending."
    ),
}


def _impulse(db: Session, user: User, lang: str) -> tuple[str, list[str]]:
    return IMPULSE_REPLIES[lang], _suggest(lang, "tip", "savings", "balance")


# Deterministic choice: the same message always gets the same tip
def tip_index(message: str) -> int:
    return sum(ord(ch) for ch in normalize(message)) % len(TIPS[EN])


def _tips(db: Session, user: User, lang: str, message: str) -> tuple[str, list[str]]:
    tip = TIPS[lang][tip_index(message)]
    return TIP_PREFIX[lang] + tip, _suggest(lang, "tip", "savings", "balance")


ABOUT_REPLIES = {
    UK: (
        "DopamineStore: симулятор онлайн-шопінгу для усвідомлених покупок. "
        "Ви купуєте за віртуальні Dopamine Points (старт: 100 000 DP), "
        "а кожна покупка рахується як заощаджені реальні гроші."
    ),
    PL: (
        "DopamineStore to symulator zakupów online dla osób, które chcą kupować "
        "świadomie. Płacisz wirtualnymi punktami Dopamine Points (na start "
        "100 000 DP), a każdy zakup liczy się jako zaoszczędzone prawdziwe pieniądze."
    ),
    EN: (
        "DopamineStore is an online shopping simulator for mindful shopping. "
        "You buy with virtual Dopamine Points (100 000 DP to start), and every "
        "purchase counts as real money saved."
    ),
}


def _about(lang: str) -> tuple[str, list[str]]:
    return ABOUT_REPLIES[lang], _suggest(lang, "balance", "savings", "tip")


GREETINGS = {
    UK: "Привіт! Я DopaBot, ваш помічник у DopamineStore. Чим допомогти?",
    PL: "Cześć! Jestem DopaBot, Twój pomocnik w DopamineStore. W czym mogę pomóc?",
    EN: "Hi! I'm DopaBot, your DopamineStore assistant. How can I help?",
}
THANKS_REPLIES = {
    UK: "Будь ласка! Звертайтеся будь-коли.",
    PL: "Nie ma za co! Pytaj, kiedy tylko chcesz.",
    EN: "You're welcome! Ask me anything anytime.",
}
UNKNOWN_INTROS = {
    UK: "Вибачте, я не зрозумів запитання. ",
    PL: "Przepraszam, nie zrozumiałem pytania. ",
    EN: "Sorry, I did not understand that. ",
}


def _simple(intent: str, lang: str) -> tuple[str, list[str]]:
    if intent == "greeting":
        return GREETINGS[lang], _suggest(lang, "balance", "order", "tip")
    if intent == "thanks":
        return THANKS_REPLIES[lang], _suggest(lang, "savings", "tip")
    if intent == "help":
        return CAPABILITIES[lang], _suggest(lang, "balance", "order", "tip")
    # unknown
    return UNKNOWN_INTROS[lang] + CAPABILITIES[lang], _suggest(lang, "balance", "order", "tip")


# Build DopaBot's answer for the current user. Read-only: nothing is stored.
# `lang` is the client's UI language, used only when the message itself is neutral.
def reply(db: Session, user: User, message: str, lang: str | None = None) -> dict:
    intent = detect_intent(message)
    lang = detect_language(message, lang)

    if intent == "balance":
        text, suggestions = _balance(db, user, lang)
    elif intent == "savings":
        text, suggestions = _savings(db, user, lang)
    elif intent == "last_order":
        text, suggestions = _last_order(db, user, lang)
    elif intent == "impulse":
        text, suggestions = _impulse(db, user, lang)
    elif intent == "tips":
        text, suggestions = _tips(db, user, lang, message)
    elif intent == "about":
        text, suggestions = _about(lang)
    else:
        text, suggestions = _simple(intent, lang)

    return {"reply": text, "intent": intent, "suggestions": suggestions}
