"""DopaBot: a rule-based chat assistant.

No external AI services are used: the intent is recognized by keywords and the
reply is built from templates plus the current user's real data. Messages are
neither stored nor logged (privacy); this module only reads from the database.
"""

import re
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import User
from app.repositories import order_repository
from app.services import tracking_service

UK = "uk"
EN = "en"

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

# Keywords per intent. Cyrillic keywords are word stems matched as substrings.
# Latin keywords must start at a word boundary ("order" matches "orders" but
# "hi" does not match "this"); WHOLE_WORDS must also end at a word boundary.
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
WHOLE_WORDS = {"hi", "hey"}

_CYRILLIC = re.compile(r"[Ѐ-ӿ]")
_APOSTROPHES = str.maketrans({"’": "'", "ʼ": "'", "`": "'"})


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


# Lower-case, unify apostrophes and collapse whitespace
def normalize(message: str) -> str:
    return " ".join(message.translate(_APOSTROPHES).lower().split())


# Pure keyword-based intent detection (no database access)
def detect_intent(message: str) -> str:
    text = normalize(message)
    for intent in INTENT_PRIORITY:
        if any(pattern.search(text) for pattern in _INTENT_PATTERNS[intent]):
            return intent
    return UNKNOWN


# Ukrainian if the message contains any Cyrillic letter, English otherwise
def detect_language(message: str) -> str:
    return UK if _CYRILLIC.search(message) else EN


# "86 200 DP"; cents are shown only when present ("97 531.50 DP")
def format_dp(value) -> str:
    amount = Decimal(value or 0).quantize(Decimal("0.01"))
    if amount == amount.to_integral_value():
        text = f"{int(amount):,}"
    else:
        text = f"{amount:,.2f}"
    return text.replace(",", " ") + " DP"


# Tips against impulse buying; the same index in both languages is the same tip
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

STATUS_LABELS = {
    UK: {
        "CREATED": "створено",
        "PROCESSING": "обробляється",
        "IN_TRANSIT": "в дорозі",
        "DELIVERED": "доставлено",
    },
    EN: {
        "CREATED": "created",
        "PROCESSING": "processing",
        "IN_TRANSIT": "in transit",
        "DELIVERED": "delivered",
    },
}

# Follow-up prompts; each of them is recognized by detect_intent
SUGGESTIONS = {
    UK: {
        "balance": "Який мій баланс?",
        "order": "Де моє замовлення?",
        "savings": "Скільки я заощадив?",
        "tip": "Дай пораду",
        "about": "Як працює DopamineStore?",
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
    EN: (
        "I can:\n"
        "• show your DP balance;\n"
        "• tell you how much you have saved;\n"
        "• show the status of your latest order;\n"
        "• give a tip against impulse buying;\n"
        "• help when you really want to buy something."
    ),
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
    else:
        reply = (
            f"You have saved {saved} of real money across {orders_count} "
            f"virtual order{'s' if orders_count != 1 else ''}. Great job!"
        )
    return reply, _suggest(lang, "order", "balance", "tip")


def _last_order(db: Session, user: User, lang: str) -> tuple[str, list[str]]:
    rows = order_repository.list_user_orders(db, user.id, offset=0, limit=1)
    if not rows:
        reply = (
            "У вас ще немає замовлень."
            if lang == UK
            else "You have no orders yet."
        )
        return reply, _suggest(lang, "about", "balance", "tip")

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
    else:
        reply = (
            f"Your latest order {order.tracking_number}: {total}, "
            f"{items_count} item{'s' if items_count != 1 else ''}. "
            f"Current status: {label}."
        )
    return reply, _suggest(lang, "savings", "balance", "tip")


def _impulse(db: Session, user: User, lang: str) -> tuple[str, list[str]]:
    if lang == UK:
        reply = (
            "Зупинімося на хвилинку й подумаймо:\n"
            "1. Чи справді вам потрібна ця річ?\n"
            "2. Чи планували ви купити її ще вчора?\n"
            "3. Що ви відчуваєте просто зараз: нудьгу, втому, тривогу?\n"
            "Правило 24 годин: відкладіть покупку на добу. Якщо бажання минеться, "
            "річ була не потрібна.\n"
            "А поки додайте її в кошик цього симулятора: отримаєте дофамін без витрат."
        )
    else:
        reply = (
            "Let's pause for a moment and think:\n"
            "1. Do you really need this item?\n"
            "2. Did you plan to buy it yesterday?\n"
            "3. What are you feeling right now: boredom, tiredness, anxiety?\n"
            "The 24-hour rule: put the purchase off for a day. If the urge fades, "
            "you did not need it.\n"
            "Meanwhile, add it to the cart of this simulator: you get the dopamine "
            "without spending."
        )
    return reply, _suggest(lang, "tip", "savings", "balance")


# Deterministic choice: the same message always gets the same tip
def tip_index(message: str) -> int:
    return sum(ord(ch) for ch in normalize(message)) % len(TIPS[EN])


def _tips(db: Session, user: User, lang: str, message: str) -> tuple[str, list[str]]:
    tip = TIPS[lang][tip_index(message)]
    prefix = "Порада: " if lang == UK else "Tip: "
    return prefix + tip, _suggest(lang, "tip", "savings", "balance")


def _about(lang: str) -> tuple[str, list[str]]:
    if lang == UK:
        reply = (
            "DopamineStore: симулятор онлайн-шопінгу для усвідомлених покупок. "
            "Ви купуєте за віртуальні Dopamine Points (старт: 100 000 DP), "
            "а кожна покупка рахується як заощаджені реальні гроші."
        )
    else:
        reply = (
            "DopamineStore is an online shopping simulator for mindful shopping. "
            "You buy with virtual Dopamine Points (100 000 DP to start), and every "
            "purchase counts as real money saved."
        )
    return reply, _suggest(lang, "balance", "savings", "tip")


def _simple(intent: str, lang: str) -> tuple[str, list[str]]:
    if intent == "greeting":
        reply = (
            "Привіт! Я DopaBot, ваш помічник у DopamineStore. Чим допомогти?"
            if lang == UK
            else "Hi! I'm DopaBot, your DopamineStore assistant. How can I help?"
        )
        return reply, _suggest(lang, "balance", "order", "tip")
    if intent == "thanks":
        reply = (
            "Будь ласка! Звертайтеся будь-коли."
            if lang == UK
            else "You're welcome! Ask me anything anytime."
        )
        return reply, _suggest(lang, "savings", "tip")
    if intent == "help":
        return CAPABILITIES[lang], _suggest(lang, "balance", "order", "tip")
    # unknown
    intro = (
        "Вибачте, я не зрозумів запитання. "
        if lang == UK
        else "Sorry, I did not understand that. "
    )
    return intro + CAPABILITIES[lang], _suggest(lang, "balance", "order", "tip")


# Build DopaBot's answer for the current user. Read-only: nothing is stored.
def reply(db: Session, user: User, message: str) -> dict:
    intent = detect_intent(message)
    lang = detect_language(message)

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
