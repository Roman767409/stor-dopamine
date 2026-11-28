# DopamineStore: demo script (≈ 10 minutes)

This script walks through the whole product for a presentation: the shopper
journey first, then the admin side, then the engineering guarantees (append-only
audit log and the test suite). Each step lists what to do, what the audience
should see, and the accounts and commands to use.

## Accounts

| Account | Email | Password | Role |
| --- | --- | --- | --- |
| Shopper (registered live) | `demo@test.com` | `Demo12345` | client |
| Administrator (prepared in advance) | `admin@test.com` | `Admin12345` | admin |

Passwords need at least 8 characters with a letter and a digit. If
`demo@test.com` already exists from a rehearsal, use a new address such as
`demo2@test.com`.

## Preparation (before the presentation)

1. Start the database, backend and frontend as described in the
   [README](../README.md#running-locally-windows-cmd):

   ```bat
   cd backend
   docker compose up -d
   venv\Scripts\activate
   alembic upgrade head
   python seed.py
   uvicorn app.main:app --reload
   ```

   In a second terminal:

   ```bat
   cd frontend
   npm run dev
   ```

2. **Shorten the delivery simulation** so that the parcel goes through all
   statuses during the demo. In `backend/app/services/tracking_service.py`,
   change the three constants at the top of the file:

   ```python
   # Demo values (default: seconds=30, minutes=10, hours=2)
   PROCESSING_AFTER = timedelta(seconds=10)
   IN_TRANSIT_AFTER = timedelta(seconds=30)
   DELIVERED_AFTER = timedelta(seconds=60)
   ```

   `uvicorn --reload` picks up the change automatically. These are the only
   values to change, and **they must be reverted before the test step**
   (step 14), because the tests check the real thresholds.

3. **Create the admin account.** Register `admin@test.com` / `Admin12345` at
   http://localhost:5173/login, log out, then promote it:

   ```bat
   docker exec -it stor-dopamine-db psql -U dopamine -d dopaminestore -c "UPDATE users SET role='admin' WHERE email='admin@test.com';"
   ```

   Expected output: `UPDATE 1`.

4. Open these in advance:
   - browser tab: http://localhost:5173
   - browser tab: http://127.0.0.1:8000/docs (Swagger, as a backup)
   - terminal with `psql` for step 13:
     `docker exec -it stor-dopamine-db psql -U dopamine -d dopaminestore`
   - terminal in `backend` with the venv activated for step 14

## Script

### 1. Idea (≈ 30 s)

**Do:** Open the home page.

**Say:** "DopamineStore is a shopping simulator for mindful shopping. You go
through the whole buying experience with virtual Dopamine Points. Every
purchase counts as real money saved."

**Language (≈ 15 s):** In the header, click **PL**, then **UA**, then back to
**EN** (on a phone the switch is in the ☰ menu). The whole interface changes
at once, without a reload, and amounts follow the language (`100,000 DP` in
English, `100 000 DP` in Polish and Ukrainian). Reload the page: the chosen
language stays. Continue the demo in English.

### 2. Registration (≈ 40 s)

**Do:** Go to **Login → register**, enter `demo@test.com` / `Demo12345`.

**Expect:** You are signed in, and the header shows the balance
**100,000 DP**.

**Optional:** Register the same email in upper case (`DEMO@TEST.COM`). The
form shows that the email is already registered, because emails are unique
regardless of case.

### 3. Catalog and search (≈ 1 min)

**Do:** Open **Shop**. Type `lamp` or `mug` in the search box, then pick a
category (e.g. Electronics) and change the sorting.

**Expect:** The list narrows to matching products. Filtering, search and
sorting are done by the API (`GET /api/products?q=…&category=…&sort=…`).

**Translated names (≈ 20 s):** With the Electronics filter still on, click
**PL**, then **UA** in the header. Product titles and the category names in
the filter change at once (`Wireless headphones` → `Słuchawki bezprzewodowe`
→ `Бездротові навушники`), the selected category stays, and the page does not
reload. Search works in any language: `słuchawki` or `навушники` finds the
same product. Switch back to **EN**.

### 4. Cart (≈ 40 s)

**Do:** Open a product (e.g. "Smartwatch", 6 900 DP) and add it to the
cart. Add a second product, then open **Cart** and change a quantity.

**Expect:** The cart shows the items, the total and **Your balance**. If the
total exceeded the balance, the cart would show **Not enough DP**.

**Optional:** Switch to **PL** on the cart page: the titles in the cart follow
the language too, then switch back to **EN**.

### 5. Checkout (≈ 1 min)

**Do:** Click checkout, fill in the shipping address and the test card form,
and place the order.

**Expect:** An **Order created** screen with a tracking number
(`DS-` + 10 characters), the total and the **New balance**.

**Say:** "The card form never leaves the browser; the backend receives only
product ids, quantities and the address. Prices are recalculated on the
server, and the whole checkout is one ACID transaction: the balance debit,
the order, its lines and the audit entry are saved together or not at all.
The `Idempotency-Key` header guarantees that a double click or a network
retry never charges twice."

### 6. Parcel tracking (≈ 1 min)

**Do:** Click the tracking number, or open **Track parcel** and paste it.

**Expect:** A four-step timeline. With the demo thresholds from the
preparation section, the status moves Created → Processing (10 s) →
In transit (30 s) → Delivered (60 s). The page refreshes every 5 seconds on
its own.

**Say:** "There is no background job. The status is calculated from the time
since the order was created, and it is saved when it moves forward, so it
never goes back. In production the steps are 30 seconds, 10 minutes and
2 hours."

### 7. Savings dashboard (≈ 40 s)

**Do:** Open the **Dashboard**.

**Expect:** Total saved equal to the order total, the current balance, the
order statistics, spending by category, a 30-day chart and the comparison of
the last 7 days with the previous 7 days.

### 8. DopaBot chat assistant (≈ 1 min)

**Do:** Open the 💬 button in the bottom-right corner. Click the quick
buttons **What's my balance?**, **Where is my parcel?** and **Give me a tip**,
then type `I want to buy a new phone`.

**Expect:**

- The balance reply shows the real balance, e.g. `86 200 DP`.
- The parcel reply shows the tracking number from step 5, the total, the
  item count and the current status.
- A tip against impulse buying (the same question always gets the same tip).
- For the phone: three reflective questions, the 24-hour rule and a
  suggestion to put the phone in this simulator's cart instead.
- Each answer offers new quick buttons.

**Languages (≈ 20 s):** Switch the interface to **PL** and click
**Jakie mam saldo?**: the answer and the new quick buttons are in Polish.
Then type `What is my balance?`: the bot answers in English, because the reply
follows the language of the message (Ukrainian questions such as
`Який мій баланс?` get Ukrainian answers). A neutral message such as `ok` gets
the interface language. Switch back to **EN**.

**Say:** "DopaBot is rule-based on purpose: keyword matching in English,
Polish and Ukrainian and the user's own data, with no external AI service.
The chat history is not stored anywhere: reload the page and it is gone."

### 9. Balance reset (≈ 30 s)

**Do:** Open **Profile → Reset balance to 100,000 DP** and confirm.

**Expect:** The balance returns to **100,000 DP**, while total saved stays
the same. Resetting again is refused because the balance is already at the
starting amount (`NOTHING_TO_RESET`).

### 10. Admin: product management (≈ 1 min)

**Do:** Log out, log in as `admin@test.com` / `Admin12345` and open
**Admin panel** in the header menu. In **Products**, add a product (e.g.
"Demo Speaker", 1 200 DP). In the **Translations** block fill the titles
`Demo Speaker` (English), `Głośnik demo` (Polski) and `Демо-колонка`
(Українська). Switch the header to **PL** and back: the table shows the
Polish title. Then edit its price and deactivate it.

**Expect:** The product appears in the table and then becomes inactive. In
the Shop tab it is no longer visible. Deactivation is a soft delete, so past
orders keep their reference. The edit form always shows the base title plus
the translations, whatever the UI language.

**Optional:** Show that the demo shopper cannot open `/admin` (the API
returns 403 `FORBIDDEN` for the client role).

### 11. Admin: audit log (≈ 1 min)

**Do:** Open **Logs**. Filter by action `PRODUCT_UPDATED`, expand
**Details**, then filter by actor `demo@test.com`.

**Expect:** `PRODUCT_CREATED`, `PRODUCT_UPDATED` (with old and new price) and
`PRODUCT_DELETED` by `admin@test.com`. For the shopper you see
`ORDER_CREATED` and `BALANCE_RESET`. Each entry has the actor email, the
entity, JSON details and a request id.

### 12. Admin: analytics (≈ 40 s)

**Do:** Open **Analytics**.

**Expect:** Number of users and orders, total volume, average order value,
active products, orders by status, top products, top categories and the
orders volume per day. Switching the language renames the top products and
categories without a reload.

### 13. The audit log cannot be changed, even with SQL (≈ 1 min)

**Do:** In the prepared `psql` terminal:

```sql
SELECT id, action, actor_email, created_at
FROM audit_logs ORDER BY id DESC LIMIT 5;

UPDATE audit_logs SET action = 'HACKED'
WHERE id = (SELECT max(id) FROM audit_logs);

DELETE FROM audit_logs WHERE id = (SELECT max(id) FROM audit_logs);

TRUNCATE audit_logs;
```

**Expect:** The `SELECT` shows the latest entries. Each of the three changes
fails with:

```text
ERROR:  audit_logs is append-only
```

**Say:** "Database triggers block UPDATE, DELETE and TRUNCATE. History can
only be added to, never rewritten, not even by someone with direct database
access to the app's tables."

Exit with `\q`.

### 14. Automated tests (≈ 1 min)

**Do:** First **revert the demo thresholds** in
`backend/app/services/tracking_service.py` back to
`seconds=30`, `minutes=10`, `hours=2`. Then, in the `backend` terminal with
the venv activated:

```bat
pytest -q
```

**Expect:** `244 passed` in about two minutes.

**Say:** "The tests run on a separate database, `dopaminestore_test`, which
is recreated on every run; the dev data you just saw is never touched. They
cover auth and token rotation, checkout, idempotency, RBAC, the audit log and
a race test: two parallel purchases that the balance can cover only once give
exactly one success and one `INSUFFICIENT_FUNDS`."

## If something goes wrong

| Problem | Fix |
| --- | --- |
| The site shows network errors | Check that uvicorn is running on port 8000 and that `docker ps` lists `stor-dopamine-db`. |
| The catalog is empty | Run `python seed.py` in `backend`. |
| No **Admin panel** link after the `UPDATE` | Log out and log in again as `admin@test.com`. |
| The parcel stays in Created | Check that the demo thresholds were saved and uvicorn reloaded. |
| Tracking tests fail in step 14 | The demo thresholds are still in `tracking_service.py`; revert them. |
