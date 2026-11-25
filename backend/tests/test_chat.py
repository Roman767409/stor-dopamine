import pytest
from sqlalchemy import func, select, text

from app.models import AuditLog
from app.services.chat_service import (
    SUGGESTIONS,
    TIPS,
    detect_intent,
    detect_language,
    format_dp,
    polish_plural,
    tip_index,
)
from helpers import item, place_order

CHAT_URL = "/api/chat"


def ask(client, headers, message, lang=None):
    payload = {"message": message}
    if lang is not None:
        payload["lang"] = lang
    response = client.post(CHAT_URL, json=payload, headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {"reply", "intent", "suggestions"}
    assert len(body["suggestions"]) <= 3
    return body


# --- HTTP contract ---


def test_chat_without_token_returns_401(client):
    response = client.post(CHAT_URL, json={"message": "hello"})
    assert response.status_code == 401


@pytest.mark.parametrize("message", ["", "   ", "\n\t "])
def test_empty_message_returns_422(client, auth_headers, message):
    response = client.post(CHAT_URL, json={"message": message}, headers=auth_headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_too_long_message_returns_422(client, auth_headers):
    response = client.post(CHAT_URL, json={"message": "a" * 501}, headers=auth_headers)
    assert response.status_code == 422


def test_max_length_message_after_trim_is_accepted(client, auth_headers):
    message = "  " + "a" * 500 + "  "
    response = client.post(CHAT_URL, json={"message": message}, headers=auth_headers)
    assert response.status_code == 200


def test_missing_message_returns_422(client, auth_headers):
    response = client.post(CHAT_URL, json={}, headers=auth_headers)
    assert response.status_code == 422


@pytest.mark.parametrize("lang", ["en", "pl", "uk"])
def test_supported_lang_is_accepted(client, auth_headers, lang):
    body = ask(client, auth_headers, "hello", lang)
    assert body["intent"] == "greeting"


@pytest.mark.parametrize("lang", ["de", "PL", "", "english", 1])
def test_unsupported_lang_returns_422(client, auth_headers, lang):
    response = client.post(
        CHAT_URL, json={"message": "hello", "lang": lang}, headers=auth_headers
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# --- detect_intent / detect_language unit tests ---


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("Привіт!", "greeting"),
        ("Вітаю", "greeting"),
        ("hello there", "greeting"),
        ("Hi", "greeting"),
        ("hey!", "greeting"),
        ("Який у мене баланс?", "balance"),
        ("Скільки DP залишилось?", "balance"),
        ("скільки в мене грошей", "balance"),
        ("What is my balance?", "balance"),
        ("how many DP do I have", "balance"),
        ("Скільки я заощадив?", "savings"),
        ("Скільки я зекономив", "savings"),
        ("show my savings", "savings"),
        ("How much have I saved?", "savings"),
        ("Де моє замовлення?", "last_order"),
        ("Статус посилки", "last_order"),
        ("Where is my order?", "last_order"),
        ("parcel tracking", "last_order"),
        ("Дуже хочу купити нові кросівки", "impulse"),
        ("Не можу зупинитись", "impulse"),
        ("I want to buy a new phone", "impulse"),
        ("I can’t stop shopping", "impulse"),
        ("Дай пораду", "tips"),
        ("Як не витрачати гроші?", "tips"),
        ("Give me a tip", "tips"),
        ("any advice?", "tips"),
        ("Що це за сайт?", "about"),
        ("Як працює магазин?", "about"),
        ("How does it work?", "about"),
        ("tell me about this", "about"),
        ("Дякую!", "thanks"),
        ("thank you", "thanks"),
        ("Що ти вмієш?", "help"),
        ("help", "help"),
        ("what can you do", "help"),
        ("qwerty", "unknown"),
        ("Погода сьогодні", "unknown"),
        ("nothing special", "unknown"),
    ],
)
def test_detect_intent(message, expected):
    assert detect_intent(message) == expected


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        # impulse beats everything
        ("Привіт, хочу купити телефон, який статус замовлення?", "impulse"),
        ("I want to buy something, what is my order status?", "impulse"),
        # last_order beats savings and balance
        ("Скільки я заощадив і де моє замовлення?", "last_order"),
        ("order and balance", "last_order"),
        # savings beats balance
        ("Баланс і заощадження", "savings"),
        ("balance and savings", "savings"),
        # balance beats tips and about
        ("what is my balance, any tip?", "balance"),
        # tips beats about, help, thanks, greeting
        ("Привіт, дякую, дай пораду", "tips"),
        ("hello, help me with advice", "tips"),
        # about beats help
        ("help: what is DopamineStore?", "about"),
        # help beats thanks and greeting
        ("hi, thanks, help", "help"),
        # thanks beats greeting
        ("Привіт і дякую", "thanks"),
    ],
)
def test_detect_intent_priority(message, expected):
    assert detect_intent(message) == expected


def test_short_greeting_words_do_not_match_inside_other_words():
    # "hi" inside "this"/"nothing" and "hey" inside "they" are not greetings
    assert detect_intent("this thing") == "unknown"
    assert detect_intent("they said") == "unknown"


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("Привіт", "uk"),
        ("Який мій баланс?", "uk"),
        ("hello DopaBot, де замовлення?", "uk"),
        ("What is my balance?", "en"),
        ("12345 !!!", "en"),
    ],
)
def test_detect_language(message, expected):
    assert detect_language(message) == expected


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        # With and without Polish diacritics
        ("Cześć!", "greeting"),
        ("czesc", "greeting"),
        ("Hej", "greeting"),
        ("Witaj, DopaBot", "greeting"),
        ("Dzień dobry", "greeting"),
        ("dzien dobry", "greeting"),
        ("Jakie mam saldo?", "balance"),
        ("ile mam dp?", "balance"),
        ("Stan konta", "balance"),
        ("Ile zaoszczędziłem?", "savings"),
        ("ile zaoszczedzilam", "savings"),
        ("Moje oszczędności", "savings"),
        ("moje oszczednosci", "savings"),
        ("Gdzie jest moje zamówienie?", "last_order"),
        ("gdzie jest moje zamowienie", "last_order"),
        ("Gdzie moja paczka?", "last_order"),
        ("Gdzie jest moja przesyłka?", "last_order"),
        ("gdzie jest moja przesylka", "last_order"),
        ("Numer śledzenia", "last_order"),
        ("sledzenie paczki", "last_order"),
        ("Chcę kupić nowe buty", "impulse"),
        ("chce kupic nowe buty", "impulse"),
        ("Kusi mnie nowy telefon", "impulse"),
        ("Nie mogę przestać kupować", "impulse"),
        ("nie moge przestac kupowac", "impulse"),
        ("Chyba jestem zakupoholiczką", "impulse"),
        ("Daj mi poradę", "tips"),
        ("daj mi porade", "tips"),
        ("Jakieś wskazówki?", "tips"),
        ("Jak nie wydawać pieniędzy?", "tips"),
        ("jak przestac", "tips"),
        ("Co to jest?", "about"),
        ("Coś o projekcie", "about"),
        ("Jak to działa?", "about"),
        ("jak to dziala", "about"),
        ("Dziękuję!", "thanks"),
        ("dziekuje", "thanks"),
        ("Dzięki", "thanks"),
        ("Pomocy!", "help"),
        ("Pomóż mi", "help"),
        ("pomoz mi", "help"),
        ("Co potrafisz?", "help"),
        ("co umiesz", "help"),
        ("Pogoda na jutro", "unknown"),
    ],
)
def test_detect_intent_polish(message, expected):
    assert detect_intent(message) == expected


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        # impulse beats everything, last_order beats savings and balance
        ("Cześć, chcę kupić telefon, jaki jest status zamówienia?", "impulse"),
        ("Saldo i zamówienie", "last_order"),
        # savings beats balance, tips beats thanks and greeting
        ("Saldo i oszczędności", "savings"),
        ("Hej, dzięki, daj poradę", "tips"),
        # help beats thanks, thanks beats greeting
        ("Dzięki, pomocy", "help"),
        ("Cześć i dziękuję", "thanks"),
    ],
)
def test_detect_intent_polish_priority(message, expected):
    assert detect_intent(message) == expected


def test_polish_keywords_start_at_a_word_boundary():
    # "hej" inside "chejka", "pomoc" inside "wspomocnik", "porad" inside "doporadztwo"
    assert detect_intent("chejka") == "unknown"
    assert detect_intent("wspomocnik") == "unknown"
    assert detect_intent("doporadztwo") == "unknown"


@pytest.mark.parametrize(
    ("message", "hint", "expected"),
    [
        # Cyrillic wins over everything, including the hint
        ("Привіт", "pl", "uk"),
        ("hello, де замовлення?", "en", "uk"),
        # Polish letters or Polish keywords
        ("Łódź", None, "pl"),
        ("Zażółć gęślą jaźń", "en", "pl"),
        ("ile mam dp", None, "pl"),
        ("chce kupic buty", "en", "pl"),
        # English keywords
        ("What is my balance?", None, "en"),
        ("What is my balance?", "pl", "en"),
        ("impulse buying", "pl", "en"),
        # Neutral messages: the hint decides, English without a hint
        ("ok", "pl", "pl"),
        ("ok", "uk", "uk"),
        ("ok", None, "en"),
        ("12345 !!!", None, "en"),
        ("12345 !!!", "unknown-lang", "en"),
        # "status" is the same word in English and Polish: neutral
        ("status?", "pl", "pl"),
        ("status?", None, "en"),
    ],
)
def test_detect_language_with_polish_and_hint(message, hint, expected):
    assert detect_language(message, hint) == expected


@pytest.mark.parametrize(
    ("count", "expected"),
    [
        (1, "produkt"),
        (2, "produkty"),
        (4, "produkty"),
        (5, "produktów"),
        (11, "produktów"),
        (12, "produktów"),
        (14, "produktów"),
        (21, "produktów"),
        (22, "produkty"),
        (104, "produkty"),
        (112, "produktów"),
    ],
)
def test_polish_plural(count, expected):
    assert polish_plural(count, "produkt", "produkty", "produktów") == expected


def test_suggestions_are_detected_as_their_own_language():
    for lang, prompts in SUGGESTIONS.items():
        for prompt in prompts.values():
            assert detect_language(prompt) == lang, (lang, prompt)


def test_suggestions_are_recognized_by_the_bot():
    expected = {
        "balance": "balance",
        "order": "last_order",
        "savings": "savings",
        "tip": "tips",
        "about": "about",
    }
    for lang, prompts in SUGGESTIONS.items():
        for key, prompt in prompts.items():
            assert detect_intent(prompt) == expected[key], (lang, prompt)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (86200, "86 200 DP"),
        (100000, "100 000 DP"),
        (0, "0 DP"),
        ("97531.50", "97 531.50 DP"),
        ("1234567.89", "1 234 567.89 DP"),
    ],
)
def test_format_dp(value, expected):
    assert format_dp(value) == expected


def test_tip_sets_are_large_enough_and_aligned():
    assert len(TIPS["uk"]) >= 8
    assert len(TIPS["uk"]) == len(TIPS["en"]) == len(TIPS["pl"])


# --- Replies with real user data ---


def test_balance_reply_uses_real_balance(client, register_and_login, make_product):
    account = register_and_login()
    headers = account["headers"]
    assert place_order(client, headers, [item(make_product(price="1234.50"))]).status_code == 201

    body = ask(client, headers, "What is my balance?")
    assert body["intent"] == "balance"
    assert "98 765.50 DP" in body["reply"]
    assert "reset" not in body["reply"]

    uk = ask(client, headers, "Який мій баланс?")
    assert "98 765.50 DP" in uk["reply"]
    assert uk["reply"].startswith("Ваш поточний баланс")


def test_low_balance_reply_suggests_reset(client, register_and_login, make_product):
    account = register_and_login()
    headers = account["headers"]
    assert place_order(client, headers, [item(make_product(price="95000.00"))]).status_code == 201

    body = ask(client, headers, "balance")
    assert "5 000 DP" in body["reply"]
    assert "reset" in body["reply"]
    uk = ask(client, headers, "баланс")
    assert "профілі" in uk["reply"]


def test_savings_and_last_order_without_orders(client, auth_headers):
    savings = ask(client, auth_headers, "How much have I saved?")
    assert savings["intent"] == "savings"
    assert "no orders yet" in savings["reply"]
    assert "first virtual purchase" in savings["reply"]

    last = ask(client, auth_headers, "Де моє замовлення?")
    assert last["intent"] == "last_order"
    assert "немає замовлень" in last["reply"]


def test_savings_and_last_order_after_orders(
    client, register_and_login, make_product
):
    account = register_and_login()
    headers = account["headers"]
    first = place_order(client, headers, [item(make_product(price="1000.00"))])
    assert first.status_code == 201
    latest = place_order(
        client,
        headers,
        [item(make_product(price="2500.00"), 2), item(make_product(price="300.00"))],
    )
    assert latest.status_code == 201
    order = latest.json()

    savings = ask(client, headers, "my savings")
    assert "6 300 DP" in savings["reply"]
    assert "2 virtual orders" in savings["reply"]

    last = ask(client, headers, "Where is my order?")
    assert order["tracking_number"] in last["reply"]
    assert "5 300 DP" in last["reply"]
    assert "3 items" in last["reply"]
    assert "created" in last["reply"]

    uk = ask(client, headers, "Статус замовлення")
    assert order["tracking_number"] in uk["reply"]
    assert "товарів: 3" in uk["reply"]


def test_last_order_status_is_computed_without_writing(
    client, register_and_login, make_product, db_session
):
    account = register_and_login()
    headers = account["headers"]
    order = place_order(client, headers, [item(make_product(price="10.00"))]).json()
    db_session.execute(
        text("UPDATE orders SET created_at = now() - interval '700 seconds' WHERE id = :id"),
        {"id": order["order_id"]},
    )
    db_session.commit()

    body = ask(client, headers, "order status")
    assert "in transit" in body["reply"]

    stored = db_session.execute(
        text("SELECT status FROM orders WHERE id = :id"), {"id": order["order_id"]}
    ).scalar_one()
    assert stored == "CREATED"


def test_impulse_reply_contains_24_hour_rule(client, auth_headers):
    en = ask(client, auth_headers, "I want to buy new headphones right now")
    assert en["intent"] == "impulse"
    assert "24-hour rule" in en["reply"]
    assert en["reply"].count("?") >= 3

    uk = ask(client, auth_headers, "Дуже хочу купити нові навушники")
    assert "24 годин" in uk["reply"]
    assert "кошик" in uk["reply"]


def test_tips_are_deterministic(client, auth_headers):
    first = ask(client, auth_headers, "Give me a tip")
    second = ask(client, auth_headers, "Give me a tip")
    assert first["intent"] == "tips"
    assert first["reply"] == second["reply"]
    assert first["reply"].removeprefix("Tip: ") in TIPS["en"]

    uk = ask(client, auth_headers, "Дай пораду")
    assert uk["reply"].removeprefix("Порада: ") in TIPS["uk"]


def test_unknown_returns_suggestions(client, auth_headers):
    body = ask(client, auth_headers, "qwerty")
    assert body["intent"] == "unknown"
    assert body["suggestions"] == [
        "What is my balance?",
        "Where is my order?",
        "Give me a tip",
    ]
    assert "I can" in body["reply"]

    uk = ask(client, auth_headers, "абвгд")
    assert uk["suggestions"] == ["Який мій баланс?", "Де моє замовлення?", "Дай пораду"]


@pytest.mark.parametrize(
    ("message", "intent"),
    [
        ("Привіт", "greeting"),
        ("thanks!", "thanks"),
        ("help", "help"),
        ("What is DopamineStore?", "about"),
    ],
)
def test_simple_intents_reply(client, auth_headers, message, intent):
    body = ask(client, auth_headers, message)
    assert body["intent"] == intent
    assert body["reply"]
    assert body["suggestions"]


# --- Polish replies ---


def test_polish_balance_reply_uses_real_balance(client, register_and_login, make_product):
    account = register_and_login()
    headers = account["headers"]
    assert place_order(client, headers, [item(make_product(price="1234.50"))]).status_code == 201

    body = ask(client, headers, "Jakie mam saldo?")
    assert body["intent"] == "balance"
    assert body["reply"] == "Twoje saldo wynosi 98 765.50 DP."
    assert body["suggestions"] == [
        "Ile udało mi się zaoszczędzić?",
        "Gdzie jest moje zamówienie?",
        "Daj mi poradę",
    ]


def test_polish_low_balance_reply_suggests_reset(client, register_and_login, make_product):
    account = register_and_login()
    headers = account["headers"]
    assert place_order(client, headers, [item(make_product(price="95000.00"))]).status_code == 201

    body = ask(client, headers, "saldo")
    assert "5 000 DP" in body["reply"]
    assert "w profilu" in body["reply"]


def test_polish_savings_and_last_order_without_orders(client, auth_headers):
    savings = ask(client, auth_headers, "Moje oszczędności")
    assert "Nie masz jeszcze żadnych zamówień" in savings["reply"]
    last = ask(client, auth_headers, "gdzie jest moja paczka")
    assert last["reply"] == "Nie masz jeszcze żadnych zamówień."


def test_polish_savings_and_last_order_after_orders(client, register_and_login, make_product):
    account = register_and_login()
    headers = account["headers"]
    assert place_order(client, headers, [item(make_product(price="1000.00"))]).status_code == 201
    latest = place_order(
        client,
        headers,
        [item(make_product(price="2500.00"), 2), item(make_product(price="300.00"))],
    )
    assert latest.status_code == 201
    order = latest.json()

    savings = ask(client, headers, "Ile zaoszczędziłem?")
    assert "6 300 DP" in savings["reply"]
    assert "2 wirtualne zamówienia" in savings["reply"]

    last = ask(client, headers, "Gdzie jest moje zamówienie?")
    assert last["intent"] == "last_order"
    assert order["tracking_number"] in last["reply"]
    assert "5 300 DP" in last["reply"]
    assert "3 produkty" in last["reply"]
    assert last["reply"].endswith("Obecny status: utworzone.")


def test_polish_single_product_and_computed_status(
    client, register_and_login, make_product, db_session
):
    account = register_and_login()
    headers = account["headers"]
    order = place_order(client, headers, [item(make_product(price="10.00"))]).json()
    db_session.execute(
        text("UPDATE orders SET created_at = now() - interval '700 seconds' WHERE id = :id"),
        {"id": order["order_id"]},
    )
    db_session.commit()

    body = ask(client, headers, "numer sledzenia")
    assert "1 produkt." in body["reply"]
    assert body["reply"].endswith("Obecny status: w drodze.")


def test_polish_impulse_reply_contains_24_hour_rule(client, auth_headers):
    body = ask(client, auth_headers, "Chcę kupić nowe słuchawki")
    assert body["intent"] == "impulse"
    assert "Zasada 24 godzin" in body["reply"]
    assert body["reply"].count("?") >= 3
    assert "koszyka" in body["reply"]


def test_polish_tips_are_deterministic(client, auth_headers):
    first = ask(client, auth_headers, "Daj mi poradę")
    second = ask(client, auth_headers, "Daj mi poradę")
    assert first["intent"] == "tips"
    assert first["reply"] == second["reply"]
    tip = first["reply"].removeprefix("Porada: ")
    # Same formula as in the other languages
    assert tip == TIPS["pl"][tip_index("Daj mi poradę")]
    other = ask(client, auth_headers, "jakieś wskazówki")
    assert other["reply"].removeprefix("Porada: ") == TIPS["pl"][tip_index("jakieś wskazówki")]


@pytest.mark.parametrize(
    ("message", "intent", "start"),
    [
        ("Cześć!", "greeting", "Cześć! Jestem DopaBot"),
        ("Dzięki!", "thanks", "Nie ma za co"),
        ("Co potrafisz?", "help", "Potrafię:"),
        ("Jak to działa?", "about", "DopamineStore to symulator"),
    ],
)
def test_polish_simple_intents_reply(client, auth_headers, message, intent, start):
    body = ask(client, auth_headers, message)
    assert body["intent"] == intent
    assert body["reply"].startswith(start)
    assert body["suggestions"]


def test_neutral_message_uses_ui_language(client, auth_headers):
    pl = ask(client, auth_headers, "ok", "pl")
    assert pl["intent"] == "unknown"
    assert pl["reply"].startswith("Przepraszam, nie zrozumiałem")
    assert pl["suggestions"] == ["Jakie mam saldo?", "Gdzie jest moje zamówienie?", "Daj mi poradę"]

    uk = ask(client, auth_headers, "ok", "uk")
    assert uk["reply"].startswith("Вибачте")

    default = ask(client, auth_headers, "ok")
    assert default["reply"].startswith("Sorry")


def test_message_language_wins_over_ui_language(client, auth_headers):
    english = ask(client, auth_headers, "What is my balance?", "pl")
    assert english["reply"].startswith("Your current balance")
    polish = ask(client, auth_headers, "Jakie mam saldo?", "en")
    assert polish["reply"].startswith("Twoje saldo")
    ukrainian = ask(client, auth_headers, "Який мій баланс?", "pl")
    assert ukrainian["reply"].startswith("Ваш поточний баланс")


def test_chat_is_not_written_to_audit_log(client, register_and_login, db_session):
    account = register_and_login()
    count = select(func.count()).select_from(AuditLog).where(
        AuditLog.actor_email == account["email"]
    )
    before = db_session.scalar(count)
    for message in ["hello", "balance", "my order", "tip", "I want to buy"]:
        ask(client, account["headers"], message)
    db_session.expire_all()
    assert db_session.scalar(count) == before
