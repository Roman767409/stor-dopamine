# DopamineStore — Opis projektu

*Projekt systemu informatycznego · Digital Wellbeing & Mindful Shopping*

Wersja dokumentu: 1.0 · Etap: 09.11.2026 · Autor: \[imię i nazwisko\] · Grupa: \[numer grupy\] · Prowadzący: \[imię i nazwisko\]

## 0. Zgodność z wymaganiami prowadzącego

Na etapie 09.11.2026 należy przedstawić: opis rozwiązania, schemat API, opis procesów, użytkowników, przypadków użycia, bazy danych oraz komunikacji między modułami. Poniższa tabela wskazuje, w którym rozdziale dokumentu znajduje się każdy z punktów.

| Wymaganie | Rozdział dokumentu |
| --- | --- |
| Opis rozwiązania | 2 |
| Użytkownicy / aktorzy (role) | 3 |
| Przypadki użycia | 4 |
| Opis procesów (procesy biznesowe) | 5 |
| Baza danych (schemat, ERD) | 6 |
| Schemat API (specyfikacja REST API) | 7 |
| Komunikacja między modułami | 8 |
| Dodatkowo: bezpieczeństwo, przypadki brzegowe, testowanie, wdrożenie, ryzyka | 9–12 |

## 1. Podsumowanie projektu i analiza pomysłu

### 1.1. O czym jest projekt

**DopamineStore** to aplikacja webowa, która w pełni imituje sklep internetowy: witrynę, koszyk, składanie zamówienia, płatność i śledzenie przesyłki. Różnica względem zwykłego sklepu jest jedna, ale zasadnicza: **wszystkie pieniądze są wirtualne**. Użytkownik kupuje za wewnętrzną walutę (Dopamine Points, DP), a prawdziwe płatności są niemożliwe z samej architektury systemu.

Podstawa psychologiczna: u osób skłonnych do zakupów impulsywnych reakcja dopaminowa pojawia się na etapie wyboru, dodawania do koszyka, „płatności” i oczekiwania na przesyłkę, a nie w momencie posiadania przedmiotu. DopamineStore daje te etapy bez konsekwencji finansowych. Każdy symulowany zakup zwiększa licznik **„zaoszczędzonych prawdziwych pieniędzy”**, co jest prezentowane na dashboardzie jako pozytywne wzmocnienie (mindful shopping, czyli świadoma konsumpcja).

### 1.2. Kluczowe encje i główna niezmienność (invariant)

System operuje na użytkownikach, produktach i kategoriach, zamówieniach i ich pozycjach oraz dzienniku audytu. Główny invariant (reguła, której nie wolno naruszyć w żadnych okolicznościach):

> Odjęcie kwoty od virtual\_balance, zwiększenie total\_saved\_amount, utworzenie orders i order\_items odbywa się **w jednej transakcji ACID**: albo wszystko, albo nic.

## 2. Opis rozwiązania

### 2.1. Problem i aktualność

Impulsywne zakupy online są powszechnym problemem cyfrowego dobrostanu. Czynniki: nieskończone rekomendacje, promocje ograniczone czasowo, płatność jednym kliknięciem, brak fizycznego kontaktu z pieniędzmi. Skutki: straty finansowe, poczucie winy, gromadzenie niepotrzebnych rzeczy. Istniejące rozwiązania (blokery, przypomnienia o budżecie) działają przez zakaz. DopamineStore działa przez **zastąpienie**: potrzeba występująca w procesie zakupu jest zaspokajana w bezpieczny sposób.

### 2.2. Cel i zadania systemu

**Cel:** zapewnić użytkownikowi pełne doświadczenie e-commerce na wirtualnym saldzie oraz zwizualizować „zaoszczędzone” prawdziwe pieniądze.

Konkretne cele projektu:

1. Zrealizować pełny cykl: katalog → koszyk → checkout → obciążenie wirtualnego salda → śledzenie dostawy.
2. Zapewnić integralność danych (wirtualnych finansów) dzięki transakcjom ACID.
3. Zrealizować model dostępu oparty na rolach (RBAC) dla trzech typów użytkowników.
4. Zapewnić pełny audyt wszystkich zmian stanu systemu (pełny monitoring operacji).
5. Wdrożyć system w chmurze w darmowych planach (Vercel, Render, Supabase) wraz z udokumentowaną obsługą ograniczeń tych platform.

### 2.3. Kluczowa wartość

| Dla kogo | Wartość |
| --- | --- |
| Użytkownik | Bezpieczne zaspokojenie potrzeby zakupowej, odwrócony licznik oszczędności, poczucie kontroli |
| Administrator | Zarządzanie katalogiem, pełna przejrzystość zdarzeń w systemie, analityka |
| Deweloper / prowadzący | Demonstracja pełnego stosu: REST API, RBAC, transakcje, audyt, wdrożenie w chmurze |

### 2.4. Grupa docelowa

Dorośli użytkownicy, którzy dostrzegają u siebie skłonność do zakupów impulsywnych i chcą zastąpić realne wydatki symulacją. Także: studenci i psychologowie jako środowisko demonstracyjne. Dodatkowo system nie zbiera prawdziwych danych płatniczych, więc nie podlega wymaganiom PCI DSS.

### 2.5. Koncepcja wirtualnej waluty i „oszczędności”

- **virtual\_balance** to dostępne saldo w DP. Wartość początkowa to 100 000,00 DP.
- **total\_saved\_amount** to skumulowana suma wszystkich zakończonych symulowanych zakupów. Interpretacja dla użytkownika: „Tyle prawdziwych pieniędzy mogłeś wydać, ale nie wydałeś”.
- Wzór: po każdym udanym zamówieniu `virtual_balance -= total_price`, `total_saved_amount += total_price`. Stąd invariant: `virtual_balance + total_saved_amount = 100000.00` do momentu ręcznego zasilenia (jeśli zostanie zrealizowane).
- Ceny produktów są podawane w DP i domyślnie odpowiadają w przybliżeniu realnym cenom odpowiedników w złotych/hrywnach/dolarach (pole przeliczenia nie jest potrzebne, 1 DP = 1 jednostka umowna).
- Możliwość „resetu” salda przez użytkownika w razie potrzeby: osobny endpoint, z zapisem w audit\_logs.

### 2.6. Granice projektu (Scope)

**In scope (wchodzi w zakres):**

- rejestracja, logowanie, uwierzytelnianie JWT;
- przeglądanie katalogu, wyszukiwanie, filtrowanie wg kategorii, sortowanie;
- koszyk po stronie klienta;
- imitacja checkoutu z walidacją algorytmem Luhna;
- wirtualny portfel, atomowe obciążenie;
- śledzenie przesyłki po numerze, historia zdarzeń;
- dashboard oszczędności;
- panel administratora: CRUD produktów, przegląd logów audytu, analityka ogólna;
- pełny audyt operacji.

**Out of scope (poza zakresem):**

- prawdziwe płatności, integracje z bramkami płatniczymi;
- prawdziwa logistyka, integracje z przewoźnikami;
- wysyłka e-maili (możliwe rozszerzenie);
- natywna aplikacja mobilna;
- zwroty towarów (returns) i anulowanie zamówienia po jego utworzeniu.

### 2.7. Wymagania funkcjonalne

| ID | Wymaganie | Aktor | Priorytet |
| --- | --- | --- | --- |
| FR-01 | Rejestracja przez email i hasło | Gość | Must |
| FR-02 | Logowanie, otrzymanie JWT | Gość, Klient, Admin | Must |
| FR-03 | Przeglądanie listy produktów z paginacją | Wszyscy | Must |
| FR-04 | Przeglądanie karty produktu | Wszyscy | Must |
| FR-05 | Wyszukiwanie i filtr wg kategorii, ceny | Wszyscy | Should |
| FR-06 | Dodawanie/usuwanie produktów w koszyku, zmiana ilości | Klient | Must |
| FR-07 | Składanie zamówienia z podaniem adresu i karty | Klient | Must |
| FR-08 | Walidacja karty algorytmem Luhna bez zapisu numeru | System | Must |
| FR-09 | Atomowe obciążenie virtual\_balance i naliczenie total\_saved\_amount | System | Must |
| FR-10 | Generowanie unikalnego numeru śledzenia | System | Must |
| FR-11 | Śledzenie przesyłki po numerze | Klient, Gość\* | Must |
| FR-12 | Przeglądanie historii zamówień | Klient | Should |
| FR-13 | Dashboard oszczędności (suma, liczba, wykres w czasie) | Klient | Must |
| FR-14 | CRUD produktów i kategorii | Admin | Must |
| FR-15 | Przeglądanie i filtrowanie logów audytu | Admin | Must |
| FR-16 | Ogólna analityka obrotu systemu | Admin | Should |
| FR-17 | Reset wirtualnego salda | Klient | Could |
| FR-18 | Wskaźnik „budzenia serwera” (cold start) | System (UI) | Must |

\*Śledzenie po numerze jest dostępne bez autoryzacji tylko w trybie „publicznego śledzenia” z minimalnym zestawem danych (status i daty, bez adresu i składu zamówienia). Zob. rozdział 7.

### 2.8. Wymagania niefunkcjonalne

| ID | Kategoria | Wymaganie |
| --- | --- | --- |
| NFR-01 | Wydajność | Odpowiedź API na odczyt katalogu nie dłużej niż 500 ms przy „ciepłym” serwerze; na zapis zamówienia nie dłużej niż 1500 ms |
| NFR-02 | Dostępność | Docelowa dostępność 99% w ramach ograniczeń darmowych planów; cold start do 50 s obsługiwany w UI |
| NFR-03 | Bezpieczeństwo | Hasła haszowane (bcrypt/argon2), JWT z ograniczonym czasem życia, HTTPS wszędzie, CORS ograniczony do domeny frontendu |
| NFR-04 | Integralność | Wszystkie operacje zmiany salda wykonywane w jednej transakcji ACID na poziomie nie niższym niż READ COMMITTED z jawną blokadą |
| NFR-05 | Audytowalność | Każda zmiana stanu (INSERT/UPDATE/DELETE encji biznesowych, logowanie, błędy uwierzytelniania) jest rejestrowana w audit\_logs |
| NFR-06 | Skalowalność | Backend bezstanowy (stateless), skalowanie poziome możliwe bez zmian w kodzie |
| NFR-07 | Utrzymywalność | Architektura warstwowa, migracje Alembic, automatyczne generowanie OpenAPI |
| NFR-08 | Testowalność | Pokrycie logiki biznesowej warstwy serwisowej testami jednostkowymi nie mniejsze niż 70% |
| NFR-09 | Użyteczność | Układ responsywny (mobile-first), dostępność WCAG 2.1 AA na poziomie kontrastu i nawigacji klawiaturą |
| NFR-10 | Poufność | Prawdziwe dane płatnicze nie są zbierane ani przechowywane w żadnych okolicznościach |

### 2.9. Stos technologiczny i uzasadnienie

| Warstwa | Technologia | Uzasadnienie wyboru |
| --- | --- | --- |
| Frontend | React 18 + Vite + Tailwind CSS | Szybki build, podejście komponentowe, style użytkowe do szybkiego responsywnego layoutu |
| Klient HTTP | Axios (lub Fetch) | Interceptory dla JWT i globalna obsługa cold start |
| Routing klienta | React Router | Nawigacja SPA, trasy chronione według ról |
| Stan | React Context / Zustand | Koszyk i sesja bez zbędnej złożoności |
| Backend | Python 3.12 + FastAPI + Uvicorn | Wysoka wydajność (ASGI), walidacja Pydantic, automatyczna dokumentacja OpenAPI/Swagger |
| ORM | SQLAlchemy 2.x + Alembic | Transakcje, migracje schematu, ochrona przed SQL injection |
| Uwierzytelnianie | JWT (PyJWT / python-jose) + passlib (bcrypt) | Sesje bezstanowe, standard branżowy |
| Baza danych | PostgreSQL (Supabase) | Model relacyjny, ACID, JSONB, trwałość poza efemerycznym systemem plików Render |
| Hosting frontendu | Vercel | Autodeploy z Gita, CDN |
| Hosting backendu | Render (Web Service) | Darmowy PaaS dla Pythona |
| Testy | pytest, httpx TestClient, Vitest | Pokrycie API i logiki UI |
| CI/CD | GitHub Actions | Linting, testy, autodeploy |

### 2.10. Architektura wysokiego poziomu

System ma klasyczną trójwarstwową architekturę (three-tier) z podziałem na klienta, API i magazyn danych.

&#91;embedded content: architektura wysokiego poziomu · 3 warstwy\]

&#91;embedded content: trzy części systemu · 4 bloki\]

Rysunek pokazuje trzy części systemu: stronę (React, „sala”), serwer (FastAPI, „kuchnia”) i bazę danych (PostgreSQL, „magazyn”).

Wewnętrzna struktura backendu (warstwy):

| Warstwa | Odpowiedzialność | Przykład |
| --- | --- | --- |
| Router (warstwa API) | HTTP, walidacja schematów Pydantic, zależności autoryzacji | `routers/orders.py` |
| Service (logika biznesowa) | Reguły dziedziny, granice transakcji | `services/order_service.py` |
| Repository (dostęp do danych) | Zapytania SQLAlchemy, bez reguł biznesowych | `repositories/order_repo.py` |
| Models / Schemas | Modele ORM i DTO Pydantic | `models/`, `schemas/` |
| Core | Konfiguracja, bezpieczeństwo, zależności, obsługa błędów | `core/security.py` |
| Audit | Middleware/dekorator zapisu zdarzeń | `audit/logger.py` |

Struktura repozytorium:

```
dopaminestore/
  frontend/            # React + Vite
    src/pages, components, api, store, hooks
  backend/
    app/
      main.py
      core/ (config, security, deps, errors)
      models/ schemas/ repositories/ services/ routers/ audit/
    alembic/           # migracje
    tests/
  .github/workflows/   # CI
  docs/                # ten dokument, diagramy
```

### 2.11. Schemat wdrożenia (Deployment)

| Komponent | Platforma | Konfiguracja |
| --- | --- | --- |
| SPA | Vercel | Zmienna VITE\_API\_URL, autodeploy gałęzi main |
| API | Render Web Service | Komenda startowa: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; zmienne: DATABASE\_URL, JWT\_SECRET, ALLOWED\_ORIGINS |
| Baza danych | Supabase PostgreSQL | Połączenie przez connection pooler (port 6543, tryb transaction), TLS obowiązkowy |

Sekrety są przechowywane wyłącznie w zmiennych środowiskowych platform i nigdy nie trafiają do repozytorium (`.env` dodano do `.gitignore`, w repozytorium znajduje się tylko `.env.example`).

## 3. Użytkownicy i aktorzy

### 3.1. Wykaz aktorów

| Aktor | Typ | Opis | Uwierzytelnianie |
| --- | --- | --- | --- |
| Gość (Guest) | Człowiek, główny | Niezalogowany odwiedzający. Może jedynie przeglądać katalog i karty produktów, rejestrować się i logować | Brak |
| Klient (Client) | Człowiek, główny | Zarejestrowany użytkownik. Ma wirtualny portfel, koszyk, zamówienia, dashboard | JWT, role=client |
| Administrator (Admin) | Człowiek, główny | Zarządza katalogiem, przegląda audyt i analitykę ogólną. Konto jest tworzone skryptem seed, a nie przez publiczną rejestrację | JWT, role=admin |
| Wykonawca w tle (Background Worker) | System, drugorzędny | Wewnętrzny mechanizm FastAPI BackgroundTasks, zapisuje logi audytu po wysłaniu odpowiedzi klientowi | Wewnętrzny |
| Chmurowa baza danych (Supabase) | System, drugorzędny | Zewnętrzna usługa przechowywania danych | Ciąg połączenia |

### 3.2. Macierz uprawnień (RBAC)

&#91;embedded content: trzy role · uprawnienia w skrócie\]

Gość tylko przegląda i rejestruje się, klient kupuje, a administrator zarządza katalogiem i dziennikiem.

Oznaczenia: ✔ dozwolone, ✖ zabronione, (własne) tylko własne dane.

| Zasób / operacja | Gość | Klient | Admin |
| --- | --- | --- | --- |
| Rejestracja, logowanie | ✔ | ✔ | ✔ |
| Przeglądanie katalogu i karty produktu | ✔ | ✔ | ✔ |
| Koszyk (po stronie klienta) | ✖ (wymagana rejestracja) | ✔ | ✔ |
| Tworzenie zamówienia | ✖ | ✔ | ✖ |
| Historia zamówień | ✖ | ✔ (własne) | ✔ (wszystkie, tylko odczyt) |
| Śledzenie po numerze | ✔ (tryb publiczny) | ✔ (pełny, własne) | ✔ |
| Saldo portfela | ✖ | ✔ (własne) | ✖ |
| Dashboard oszczędności | ✖ | ✔ (własny) | ✖ |
| Tworzenie/edycja/usuwanie produktów | ✖ | ✖ | ✔ |
| Zarządzanie kategoriami | ✖ | ✖ | ✔ |
| Logi audytu | ✖ | ✖ | ✔ |
| Analityka ogólna | ✖ | ✖ | ✔ |

Administrator nie ma wirtualnego portfela i nie składa zamówień: rozdziela to role i upraszcza audyt (administrator nie może jednocześnie „kupować” dla siebie i zmieniać katalogu).

### 3.3. Uwierzytelnianie i autoryzacja

- Rejestracja tworzy użytkownika z rolą `client`. Rola `admin` jest nadawana wyłącznie skryptem seed lub bezpośrednią zmianą w bazie.
- Logowanie zwraca `access_token` (JWT, ważność 30 minut) oraz `refresh_token` (ważność 7 dni). Payload tokena: `sub` (id użytkownika), `role`, `exp`, `iat`.
- Autoryzacja jest zrealizowana zależnościami FastAPI: `get_current_user` i `require_role(...)`. Sprawdzenie roli odbywa się **na backendzie**, UI jedynie ukrywa niedostępne elementy.
- Błędy: 401 Unauthorized (brak lub nieważny token), 403 Forbidden (token ważny, rola niewystarczająca).

## 4. Przypadki użycia

### 4.1. Wykaz przypadków użycia

| ID | Nazwa | Aktor główny | Priorytet |
| --- | --- | --- | --- |
| UC-01 | Przeglądanie katalogu i karty produktu | Gość, Klient | Must |
| UC-02 | Zarządzanie koszykiem | Klient | Must |
| UC-03 | Imitacja checkoutu | Klient | Must |
| UC-04 | Obciążenie wirtualnego salda i naliczenie oszczędności | System (w ramach UC-03) | Must |
| UC-05 | Monitorowanie przesyłki po numerze śledzenia | Klient, Gość | Must |
| UC-06 | Zarządzanie produktami (CRUD) | Administrator | Must |
| UC-07 | Przeglądanie logów audytu | Administrator | Must |
| UC-08 | Rejestracja | Gość | Must |
| UC-09 | Logowanie (uwierzytelnianie) | Gość | Must |
| UC-10 | Przeglądanie dashboardu oszczędności | Klient | Must |
| UC-11 | Przeglądanie historii zamówień | Klient | Should |
| UC-12 | Przeglądanie analityki ogólnej | Administrator | Should |
| UC-13 | Reset wirtualnego salda | Klient | Could |
| UC-14 | Zarządzanie kategoriami | Administrator | Must |
| UC-15 | Walidacja karty (algorytm Luhna) | System (w ramach UC-03) | Must |
| UC-16 | Zapis zdarzenia w audycie | System (w ramach wszystkich zmian stanu) | Must |

### 4.2. Diagram przypadków użycia (reprezentacja tekstowa, poprawiona zgodnie z regułami UML)

Reguła: **include** oznacza obowiązkowe zachowanie zagnieżdżone (przypadek bazowy nie może zakończyć się bez niego); **extend** oznacza opcjonalne rozszerzenie wykonywane pod warunkiem.

```
Aktor Gość:
  UC-01 Przeglądanie katalogu
  UC-05 Monitorowanie przesyłki (tryb publiczny)
  UC-08 Rejestracja
  UC-09 Logowanie

Aktor Klient (dziedziczy po Gościu):
  UC-01, UC-02, UC-03, UC-05, UC-10, UC-11, UC-13
  UC-02 Zarządzanie koszykiem  -- warunek wstępny: autoryzacja (UC-09)
  UC-03 Imitacja checkoutu   <<include>> UC-15 Walidacja karty
  UC-03 Imitacja checkoutu   <<include>> UC-04 Obciążenie salda
  UC-03 Imitacja checkoutu   <<include>> UC-16 Zapis w audycie
  UC-05 Monitorowanie przesyłki <<extend>>  UC-03  (opcjonalnie, po udanym checkoucie)
  UC-13 Reset salda          <<include>> UC-16

Aktor Administrator:
  UC-06 Zarządzanie produktami  <<include>> UC-16
  UC-14 Zarządzanie kategoriami <<include>> UC-16
  UC-07 Przeglądanie logów audytu
  UC-12 Analityka ogólna

Uwaga: UC-09 Logowanie <<include>> UC-16 (udane i nieudane próby są logowane).
```

### 4.3. Szczegółowa specyfikacja kluczowych przypadków użycia

#### UC-08. Rejestracja

| Pole | Opis |
| --- | --- |
| Aktor | Gość |
| Warunki wstępne | Użytkownik nie jest zalogowany, email nie jest zarejestrowany |
| Wyzwalacz | Kliknięcie „Zarejestruj się” |
| Scenariusz główny | 1) Użytkownik wpisuje email i hasło. 2) Frontend sprawdza format email i siłę hasła (min. 8 znaków, litera i cyfra). 3) POST /api/auth/register. 4) Backend normalizuje email (małe litery), sprawdza unikalność, haszuje hasło (bcrypt), tworzy rekord users z rolą client, virtual\_balance = 100000.00, total\_saved\_amount = 0. 5) Zdarzenie USER\_REGISTERED jest zapisywane w audit\_logs. 6) Zwracane jest 201 Created. |
| Scenariusze alternatywne | A1: email już istnieje, 409 Conflict. A2: nieprawidłowe dane, 422 Unprocessable Entity. |
| Warunki końcowe | Utworzono konto z saldem początkowym |

#### UC-09. Logowanie

| Pole | Opis |
| --- | --- |
| Aktor | Gość |
| Scenariusz główny | 1) Wpisanie emaila i hasła. 2) POST /api/auth/login. 3) Backend znajduje użytkownika, porównuje hash. 4) Wydaje access\_token (30 min) i refresh\_token (7 dni). 5) Frontend zapisuje tokeny i przekierowuje według roli: client do katalogu, admin do panelu. 6) Zdarzenie USER\_LOGIN. |
| Scenariusze alternatywne | A1: błędne dane, 401 Unauthorized (jednakowy komunikat dla nieistniejącego emaila i błędnego hasła, aby nie ujawniać istnienia konta) oraz zdarzenie LOGIN\_FAILED. A2: 5 nieudanych prób w ciągu 15 min z jednego IP, 429 Too Many Requests. |
| Warunki końcowe | Klient ma ważny JWT |

#### UC-01. Przeglądanie katalogu

| Pole | Opis |
| --- | --- |
| Aktor | Gość, Klient |
| Scenariusz główny | 1) Otwarcie strony katalogu. 2) GET /api/products?page=1&page\_size=12 (opcjonalnie category, q, min\_price, max\_price, sort). 3) Backend zwraca tylko is\_active = true. 4) Wyświetlenie kart. 5) Kliknięcie karty, GET /api/products/{id}. |
| Scenariusze alternatywne | A1: serwer jeszcze się budzi (cold start), wyświetlane są szkielety z komunikatem (rozdział 10.1). A2: produkt nie istnieje lub jest nieaktywny, 404 Not Found. A3: pusty wynik, komunikat „Nic nie znaleziono”. |

#### UC-02. Zarządzanie koszykiem

| Pole | Opis |
| --- | --- |
| Aktor | Klient |
| Warunki wstępne | Użytkownik jest zalogowany (dla Gościa przycisk „Do koszyka” otwiera okno logowania/rejestracji) |
| Scenariusz główny | 1) Klient dodaje produkt, zmienia ilość (1–99) lub usuwa. 2) Koszyk jest przechowywany w stanie React i localStorage (klucz cart:{user\_id}). 3) Wyświetlana jest suma pośrednia i porównanie z aktualnym saldem. |
| Zasady | Koszyk **nie** jest przechowywany na serwerze do momentu checkoutu. Ceny w koszyku mają charakter informacyjny, ostateczne ceny zawsze ustala serwer. |
| Scenariusze alternatywne | A1: suma przekracza saldo, UI wyświetla ostrzeżenie i blokuje przycisk checkoutu (serwer sprawdza ponownie). |

#### UC-03. Imitacja checkoutu

| Pole | Opis |
| --- | --- |
| Aktor | Klient |
| Warunki wstępne | Użytkownik jest zalogowany; koszyk nie jest pusty; na virtual\_balance jest wystarczająco środków (sprawdzane wstępnie w UI i ostatecznie na serwerze) |
| Wyzwalacz | Kliknięcie „Złóż zamówienie” |
| Scenariusz główny | 1) Wyświetlane jest okno modalne z zastrzeżeniem: „To jest symulacja, używaj wyłącznie testowych numerów kart”. 2) Klient wpisuje fikcyjne dane dostawy (imię i nazwisko, adres, miasto, kod pocztowy, kraj) oraz numer testowej karty (np. 4242 4242 4242 4242), datę ważności, CVC. 3) Frontend wykonuje walidację mock (UC-15). 4) Frontend wysyła POST /api/orders **bez numeru karty**: tylko items, shipping\_address oraz Idempotency-Key. 5) Backend wykonuje UC-04. 6) Zwracane jest 201 z order\_id i tracking\_number. 7) Frontend czyści koszyk i pokazuje ekran „Zamówienie utworzone” z animacją-nagrodą oraz przyciskiem „Śledź przesyłkę”. |
| Scenariusze alternatywne | A1: niewystarczające środki, 400 Bad Request (kod INSUFFICIENT\_FUNDS), transakcja wycofana. A2: produkt stał się nieaktywny, 409 Conflict (PRODUCT\_UNAVAILABLE). A3: nieprawidłowa karta, błąd w UI, żądanie nie jest wysyłane do backendu. A4: duplikat żądania z tym samym Idempotency-Key, zwracane jest już utworzone zamówienie z 200 OK. A5: przerwanie połączenia, UI pokazuje komunikat, ponowne wysłanie jest bezpieczne dzięki Idempotency-Key. |
| Warunki końcowe | Utworzono orders i order\_items; wygenerowano tracking\_number; saldo i oszczędności zaktualizowano; koszyk wyczyszczono; zapis ORDER\_CREATED w audit\_logs |

#### UC-04. Obciążenie salda i naliczenie oszczędności

| Pole | Opis |
| --- | --- |
| Aktor | System (wewnętrzny przypadek UC-03) |
| Scenariusz główny | W jednej transakcji: 1) SELECT … FOR UPDATE na wierszu użytkownika. 2) Obliczenie total\_price na serwerze według aktualnych cen produktów. 3) Sprawdzenie virtual\_balance >= total\_price. 4) INSERT orders, INSERT order\_items (z price\_at\_purchase). 5) UPDATE users SET virtual\_balance = virtual\_balance - total\_price, total\_saved\_amount = total\_saved\_amount + total\_price. 6) COMMIT. |
| Scenariusze alternatywne | A1: saldo niewystarczające, ROLLBACK, 400 Bad Request. A2: błąd bazy danych na dowolnym kroku, ROLLBACK, 500 Internal Server Error, klient otrzymuje bezpieczny komunikat bez szczegółów technicznych. |
| Gwarancje | Atomowość: niemożliwy jest stan „pieniądze pobrane, zamówienia brak” i odwrotnie |

#### UC-05. Monitorowanie przesyłki

| Pole | Opis |
| --- | --- |
| Aktor | Klient, Gość (tryb publiczny) |
| Scenariusz główny | 1) Użytkownik wpisuje tracking\_number (format DS-XXXXXXXXXX) lub przechodzi ze strony zamówienia. 2) GET /api/orders/track/{tracking\_number}. 3) Backend znajduje zamówienie i oblicza status na podstawie różnicy czasu (rozdział 5.3). 4) Zwracany jest bieżący status, szacowana data dostawy i historia zdarzeń. |
| Scenariusze alternatywne | A1: numer śledzenia nie istnieje, 404 Not Found. A2: nieprawidłowy format, 422. |
| Tryb publiczny | Dla niezalogowanych zwracany jest tylko status, daty i historia zdarzeń, bez adresu i składu zamówienia |

#### UC-10. Dashboard oszczędności

| Pole | Opis |
| --- | --- |
| Aktor | Klient |
| Scenariusz główny | GET /api/analytics/savings zwraca total\_saved\_amount, transactions\_count, średnią wartość zamówienia, największe zamówienie, rozkład według kategorii oraz szereg czasowy za 30 dni. Frontend wyświetla duże karty z metrykami i wykres. |
| Elementy motywacyjne | Tekst „Nie wydałeś X prawdziwych pieniędzy”, kamienie milowe (1 000, 10 000, 50 000 DP), porównanie z poprzednim tygodniem |

#### UC-06. Zarządzanie produktami (administrator)

| Pole | Opis |
| --- | --- |
| Aktor | Administrator |
| Warunki wstępne | Zalogowany administrator |
| Scenariusz główny | POST /api/products (tworzenie), PUT /api/products/{id} (pełna zmiana), PATCH (częściowa), DELETE /api/products/{id} (miękkie usunięcie: is\_active = false, ponieważ order\_items odwołują się do produktu). Każda czynność jest zapisywana w audit\_logs (PRODUCT\_CREATED, PRODUCT\_UPDATED, PRODUCT\_DEACTIVATED). |
| Scenariusze alternatywne | A1: rola inna niż admin, 403 Forbidden. A2: nieprawidłowa cena (<= 0) lub nieistniejąca kategoria, 422. |

#### UC-07. Przeglądanie logów audytu

| Pole | Opis |
| --- | --- |
| Aktor | Administrator |
| Scenariusz główny | GET /api/admin/audit-logs z filtrami według użytkownika, typu akcji i zakresu dat, paginacja. Wyświetlenie tabeli: czas, użytkownik, akcja, IP, rozwinięty payload JSON. |
| Ograniczenia | Logi są dostępne tylko do odczytu, API nie udostępnia zmiany ani usuwania wpisów (append-only) |

## 5. Opis procesów

### 5.1. Mapa procesów

| Nr | Proces | Inicjator | Rozdział |
| --- | --- | --- | --- |
| P1 | Rejestracja i uwierzytelnianie | Gość | 5.4 |
| P2 | Tworzenie koszyka | Klient | 5.5 |
| P3 | Tworzenie zamówienia (Order Flow) | Klient | 5.2 |
| P4 | Śledzenie dostawy (Tracking) | Klient, Gość | 5.3 |
| P5 | Obliczanie analityki oszczędności | Klient | 5.6 |
| P6 | Audyt i monitoring | System | 5.7 |
| P7 | Zarządzanie katalogiem | Administrator | 5.8 |

### 5.2. Proces tworzenia zamówienia (Order Flow)

Kolejność kroków z podziałem odpowiedzialności między warstwami:

&#91;embedded content: zakup w sześciu krokach\]

Zakup przechodzi sześć kroków: od koszyka na stronie, przez sprawdzenie kwoty i salda na serwerze, po utworzenie zamówienia i śledzenie przesyłki.

| Krok | Wykonawca | Czynność |
| --- | --- | --- |
| 1 | React (UI) | Zbiera items \[{product\_id, qty}\] z koszyka, waliduje formularz dostawy i kartę (Luhn) |
| 2 | React (UI) | Generuje Idempotency-Key (UUID) dla tej próby checkoutu |
| 3 | React (UI) | POST /api/orders z nagłówkami Authorization i Idempotency-Key |
| 4 | FastAPI router | Sprawdzenie JWT, roli client; walidacja schematu Pydantic (karty w schemacie brak; nadmiarowe pola są odrzucane) |
| 5 | order\_service | Sprawdzenie Idempotency-Key: jeśli klucz został już przetworzony, zwrócić istniejące zamówienie |
| 6 | order\_service | BEGIN transakcji |
| 7 | order\_repo | SELECT … FROM users WHERE id = :uid FOR UPDATE (blokada wiersza, ochrona przed jednoczesnymi checkoutami) |
| 8 | order\_repo | Pobranie produktów według id; sprawdzenie is\_active; obliczenie total\_price z cen serwerowych |
| 9 | order\_service | Sprawdzenie virtual\_balance >= total\_price; jeśli nie, ROLLBACK i 400 |
| 10 | order\_repo | INSERT orders (status = CREATED, tracking\_number, total\_price, shipping\_address JSONB) |
| 11 | order\_repo | INSERT order\_items dla każdej pozycji z price\_at\_purchase |
| 12 | order\_repo | UPDATE users: virtual\_balance -= total\_price, total\_saved\_amount += total\_price |
| 13 | order\_service | COMMIT; przy dowolnym wyjątku ROLLBACK |
| 14 | router | Dodaje BackgroundTask: zapis ORDER\_CREATED w audit\_logs |
| 15 | router | Zwraca 201 Created {order\_id, tracking\_number, new\_balance} |
| 16 | React (UI) | Czyści koszyk, aktualizuje saldo w nagłówku, pokazuje ekran sukcesu |

Generowanie numeru śledzenia: prefiks DS- i 10 znaków z alfabetu bez niejednoznacznych liter (bez 0, O, 1, I), kryptograficznie losowe (secrets). Przy kolizji z ograniczeniem UNIQUE generowanie jest powtarzane (do 5 prób).

Gwarancje praktyczne:

- Saldo nigdy nie staje się ujemne: dodatkowy CHECK (virtual\_balance >= 0) w bazie jako ostatnia linia obrony.
- Klient nie może podmienić ceny ani kwoty: backend ignoruje wszelkie ceny z żądania.
- Podwójne kliknięcie nie tworzy dwóch zamówień: Idempotency-Key jest przechowywany w tabeli orders (pole idempotency\_key, UNIQUE razem z user\_id).

### 5.3. Proces śledzenia dostawy (Tracking Module)

Dostawa jest symulowana jako proces rozciągnięty w czasie. Aby nie zależeć od zadań w tle, które znikają przy usypianiu darmowej instancji Render, **status jest zawsze obliczany w trakcie żądania** z różnicy między bieżącym czasem (UTC) a created\_at zamówienia.

Tabela progów (wartości są ustawiane zmiennymi środowiskowymi, więc łatwo je zmienić na potrzeby demonstracji dla prowadzącego):

| Przedział od created\_at | Status | Zdarzenie w historii |
| --- | --- | --- |
| 0 – 30 sekund | CREATED | Zamówienie utworzono |
| 30 sekund – 10 minut | PROCESSING | Zamówienie jest kompletowane |
| 10 minut – 2 godziny | IN\_TRANSIT | Paczka przekazana do doręczenia |
| ponad 2 godziny | DELIVERED | Paczkę doręczono |

&#91;embedded content: statusy przesyłki · 4 etapy w czasie\]

Serwer nie korzysta z zegarów w tle, tylko przy każdym zapytaniu oblicza status z różnicy czasu.

Wzory:

```
elapsed = utcnow() - created_at
status  = CREATED     if elapsed < 30s
          PROCESSING  if elapsed < 10min
          IN_TRANSIT  if elapsed < 2h
          DELIVERED   otherwise
estimated_delivery = created_at + 2h
history = wszystkie zdarzenia, których próg już minął, ze znacznikiem czasu created_at + próg
```

Dodatkowo:

- **Tryb demo.** Zmienna TRACKING\_SPEED\_FACTOR (domyślnie 1) przyspiesza odliczanie; na potrzeby obrony projektu można ustawić np. 60, a dostawa zakończy się w 2 minuty.
- **Leniwy zapis.** Jeśli obliczony status różni się od zapisanego w orders.status, przy GET backend aktualizuje zapisany status i zapisuje zdarzenie ORDER\_STATUS\_CHANGED (operacja idempotentna). Dzięki temu analityka administratora może grupować zamówienia według statusu bez obliczeń.
- **Dlaczego nie cron.** Darmowa instancja Render usypia się po 15 minutach bez żądań, a schedulery w tle nie mają gwarancji wykonania. Obliczanie według różnicy czasu jest deterministyczne i nie wymaga żadnego procesu w tle.
- **BackgroundTasks** są używane wyłącznie do zapisu audytu po wysłaniu odpowiedzi klientowi, a nie do zmiany statusów.

### 5.4. Proces rejestracji i uwierzytelniania

1. Rejestracja: walidacja, haszowanie hasła (bcrypt, cost 12), utworzenie użytkownika z rolą client i saldem początkowym.
2. Logowanie: sprawdzenie hasha, wydanie pary tokenów. Access-token jest krótkotrwały (30 min), refresh-token dłuższy (7 dni) i używany przez POST /api/auth/refresh.
3. Każde chronione żądanie: nagłówek Authorization: Bearer ...; zależność get\_current\_user sprawdza podpis, termin ważności i istnienie użytkownika; require\_role sprawdza rolę.
4. Wylogowanie: klient usuwa tokeny; (opcjonalnie) serwer dodaje refresh-token do czarnej listy.
5. Interceptor Axios przy 401 automatycznie próbuje refresh, a jeśli się nie uda, przekierowuje na stronę logowania.

### 5.5. Proces tworzenia koszyka (po stronie klienta)

- Stan koszyka: tablica {product\_id, title, price, image\_url, qty} w kontekście React, duplikowana w localStorage.
- Koszyk należy do konkretnego użytkownika (klucz zawiera user\_id) i jest czyszczony przy wylogowaniu lub po udanym checkoucie.
- Przed checkoutem UI sprawdza przez GET /api/products/{id}, że produkt nadal jest aktywny, i aktualizuje cenę do wyświetlenia.
- Limity: do 99 sztuk jednej pozycji i do 50 różnych pozycji w koszyku.

### 5.6. Proces obliczania analityki oszczędności

Metryki dashboardu klienta są obliczane agregatami SQL i buforowane na frontendzie (React Query, 60 sekund):

```
total_saved_amount  : wartość z users (aktualizowana transakcyjnie)
transactions_count  : SELECT COUNT(*) FROM orders WHERE user_id = :uid
average_order       : SELECT AVG(total_price) FROM orders WHERE user_id = :uid
by_category         : SUM(oi.quantity * oi.price_at_purchase) GROUP BY categories.name
daily_series_30d    : SUM(total_price) GROUP BY date_trunc('day', created_at) za 30 dni
```

Kontrola spójności (używana w testach i w raporcie administratora): suma total\_price wszystkich zamówień użytkownika powinna być równa total\_saved\_amount (przy braku ręcznych resetów).

### 5.7. Proces audytu i monitoringu

Audyt w pełni pokrywa wymaganie prowadzącego dotyczące pełnego monitoringu operacji (pełny monitoring operacji).

**Co jest logowane:**

| action\_type | Zdarzenie |
| --- | --- |
| USER\_REGISTERED | Utworzono użytkownika |
| USER\_LOGIN / LOGIN\_FAILED | Udane i nieudane logowanie |
| ORDER\_CREATED | Utworzono zamówienie (kwota, liczba pozycji, order\_id) |
| ORDER\_STATUS\_CHANGED | Zmiana zapisanego statusu dostawy |
| BALANCE\_RESET | Reset salda |
| PRODUCT\_CREATED / UPDATED / DEACTIVATED | Działania administratora na katalogu |
| CATEGORY\_CREATED / UPDATED / DELETED | Działania administratora na kategoriach |
| ACCESS\_DENIED | Próba dostępu z niewystarczającą rolą (403) |
| AUDIT\_LOGS\_VIEWED | Przeglądanie logów przez administratora |

**Jak jest logowane:**

1. Warstwa serwisowa wywołuje audit.record(action\_type, user\_id, payload) po udanej zmianie stanu.
2. Zapis jest wykonywany przez BackgroundTask **po** wysłaniu odpowiedzi, osobną sesją bazy, więc błąd audytu nie psuje głównej operacji, a jedynie trafia do logu systemowego.
3. Middleware dodatkowo rejestruje IP (z uwzględnieniem X-Forwarded-For od Render) i request\_id.
4. Tabela audit\_logs jest append-only: na poziomie bazy rola aplikacji ma tylko INSERT i SELECT.

**Czego nie loguje się (redakcja danych wrażliwych):** hasła, hashe haseł, tokeny, numery kart i CVC. Payload przechodzi przez funkcję redact(), która zastępuje takie klucze znakami \*\*\*.

### 5.8. Proces zarządzania katalogiem

- Utworzenie produktu wymaga istniejącej kategorii, ceny > 0 i nazwy o długości 3–120 znaków.
- Usunięcie jest miękkie (is\_active = false): historyczne zamówienia zachowują powiązanie i price\_at\_purchase.
- Zmiana ceny nie wpływa na już utworzone zamówienia dzięki price\_at\_purchase.
- Każda zmiana jest rejestrowana w audit\_logs z wartościami przed i po (before/after w payload).

### 5.9. Obsługa błędów

Wszystkie błędy są zwracane w jednolitym formacie (szczegóły w rozdziale 7.2): kod, komunikat, request\_id. Szczegóły techniczne i stack trace nie są przekazywane klientowi, a trafiają wyłącznie do logu serwera.

## 6. Baza danych

### 6.1. Wybór SZBD

Używany jest **PostgreSQL w chmurze Supabase** (DBaaS), dostęp przez SQLAlchemy ORM. Powody wyboru zamiast lokalnego SQLite:

- System plików Render jest efemeryczny: przy uśpieniu darmowej instancji lub ponownym wdrożeniu lokalny plik bazy zostaje utracony, więc dane użytkowników nie zostałyby zachowane.
- PostgreSQL zapewnia pełnowartościowe transakcje ACID, blokowanie wierszy (SELECT … FOR UPDATE), typ NUMERIC dla pieniędzy, JSONB dla adresu i payloadu audytu oraz indeksy częściowe.
- Supabase daje connection pooler, automatyczne kopie zapasowe i panel do podglądu danych podczas obrony.

Połączenie odbywa się przez DATABASE\_URL ze zmiennych środowiskowych Render, z obowiązkowym TLS i poolerem w trybie transaction (port 6543); pula w aplikacji jest niewielka (pool\_size = 5, max\_overflow = 5), aby zmieścić się w limitach darmowego planu.

### 6.2. ERD (Mermaid)

Poniższy diagram przedstawia wszystkie tabele z ich polami oraz powiązania między nimi.

&#91;embedded content: ERD · 7 tabel i powiązania 1 : N\]

&#91;embedded content: uproszczony schemat bazy danych · 6 tabel\]

Uproszczony schemat: użytkownik składa zamówienia, zamówienie składa się z pozycji, pozycja wskazuje produkt, a produkt należy do kategorii; dziennik zapisuje działania użytkowników.

### 6.3. Słownik danych

#### users

| Pole | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| id | UUID | PK, default gen\_random\_uuid() | Identyfikator |
| email | VARCHAR(254) | NOT NULL, UNIQUE (po lower(email)) | Login; przechowywany małymi literami |
| password\_hash | VARCHAR(255) | NOT NULL | Hash bcrypt |
| role | VARCHAR(16) | NOT NULL, default client, CHECK in (client, admin) | Rola RBAC |
| virtual\_balance | NUMERIC(14,2) | NOT NULL, default 100000.00, CHECK >= 0 | Saldo w DP |
| total\_saved\_amount | NUMERIC(14,2) | NOT NULL, default 0.00, CHECK >= 0 | Skumulowane oszczędności |
| created\_at | TIMESTAMPTZ | NOT NULL, default now() | Data utworzenia |
| updated\_at | TIMESTAMPTZ | NOT NULL, default now() | Ostatnia zmiana |

#### categories

| Pole | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| id | SERIAL | PK | Identyfikator |
| name | VARCHAR(80) | NOT NULL, UNIQUE | Nazwa |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | Identyfikator URL (np. electronics) |

#### products

| Pole | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| id | UUID | PK | Identyfikator |
| category\_id | INT | FK categories(id), NOT NULL, ON DELETE RESTRICT | Kategoria |
| title | VARCHAR(120) | NOT NULL | Nazwa |
| description | TEXT | NOT NULL, default pusty ciąg | Opis |
| price | NUMERIC(12,2) | NOT NULL, CHECK > 0 | Cena w DP |
| image\_url | VARCHAR(500) | NULL | Odnośnik do obrazu |
| is\_active | BOOLEAN | NOT NULL, default true | Znacznik widoczności (miękkie usuwanie) |
| created\_at / updated\_at | TIMESTAMPTZ | NOT NULL | Daty |

#### orders

| Pole | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| id | UUID | PK | Identyfikator |
| user\_id | UUID | FK users(id), NOT NULL | Właściciel |
| tracking\_number | VARCHAR(16) | NOT NULL, UNIQUE | Format DS-XXXXXXXXXX |
| idempotency\_key | VARCHAR(64) | NOT NULL, UNIQUE razem z user\_id | Ochrona przed duplikatami |
| total\_price | NUMERIC(14,2) | NOT NULL, CHECK > 0 | Kwota zamówienia |
| status | VARCHAR(16) | NOT NULL, default CREATED, CHECK in (CREATED, PROCESSING, IN\_TRANSIT, DELIVERED) | Ostatni zapisany status (aktualny jest obliczany w locie) |
| shipping\_address | JSONB | NOT NULL | Fikcyjny adres: full\_name, line1, city, postal\_code, country |
| created\_at | TIMESTAMPTZ | NOT NULL, default now() | Baza odliczania dla trackingu |

#### order\_items

| Pole | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| id | UUID | PK | Identyfikator |
| order\_id | UUID | FK orders(id), NOT NULL, ON DELETE CASCADE | Zamówienie |
| product\_id | UUID | FK products(id), NOT NULL, ON DELETE RESTRICT | Produkt |
| quantity | INT | NOT NULL, CHECK between 1 and 99 | Ilość |
| price\_at\_purchase | NUMERIC(12,2) | NOT NULL, CHECK > 0 | Cena jednostkowa w momencie zakupu (migawka) |

Dodatkowo: UNIQUE (order\_id, product\_id), aby jedna pozycja nie powtarzała się w zamówieniu.

#### audit\_logs

| Pole | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| id | UUID | PK | Identyfikator |
| user\_id | UUID | FK users(id), NULL, ON DELETE SET NULL | Inicjator (NULL dla zdarzeń anonimowych, np. nieudanego logowania) |
| action\_type | VARCHAR(40) | NOT NULL | Typ zdarzenia (rozdział 5.7) |
| payload\_json | JSONB | NOT NULL, default pusty obiekt | Szczegóły zdarzenia (oczyszczone z danych wrażliwych) |
| ip\_address | VARCHAR(45) | NULL | IPv4/IPv6 |
| timestamp | TIMESTAMPTZ | NOT NULL, default now() | Czas zdarzenia |

#### refresh\_tokens

| Pole | Typ | Ograniczenia | Opis |
| --- | --- | --- | --- |
| id | UUID | PK | Identyfikator |
| user\_id | UUID | FK users(id), ON DELETE CASCADE | Właściciel |
| token\_hash | VARCHAR(64) | NOT NULL, UNIQUE | Hash SHA-256 tokena (sam token nie jest przechowywany) |
| expires\_at | TIMESTAMPTZ | NOT NULL | Termin wygaśnięcia |
| revoked\_at | TIMESTAMPTZ | NULL | Czas unieważnienia |

### 6.4. Indeksy

| Indeks | Tabela / pola | Cel |
| --- | --- | --- |
| uq\_users\_email\_lower | users (lower(email)) UNIQUE | Szybkie logowanie, unikalność bez względu na wielkość liter |
| ix\_products\_active\_category | products (is\_active, category\_id) | Filtrowanie katalogu |
| ix\_products\_title\_trgm | products USING gin (title gin\_trgm\_ops), w razie potrzeby | Wyszukiwanie po nazwie (ILIKE) |
| ix\_orders\_user\_created | orders (user\_id, created\_at DESC) | Historia zamówień użytkownika, szereg czasowy |
| uq\_orders\_tracking | orders (tracking\_number) UNIQUE | Natychmiastowe wyszukiwanie po numerze śledzenia |
| uq\_orders\_user\_idem | orders (user\_id, idempotency\_key) UNIQUE | Idempotentność |
| ix\_order\_items\_order | order\_items (order\_id) | Pobieranie składu zamówienia |
| ix\_audit\_ts | audit\_logs (timestamp DESC) | Przeglądanie chronologiczne |
| ix\_audit\_user\_action | audit\_logs (user\_id, action\_type) | Filtry administratora |

### 6.5. Przykład DDL (kluczowe tabele)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'client' CHECK (role IN ('client','admin')),
  virtual_balance NUMERIC(14,2) NOT NULL DEFAULT 100000.00 CHECK (virtual_balance >= 0),
  total_saved_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (total_saved_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tracking_number VARCHAR(16) NOT NULL UNIQUE,
  idempotency_key VARCHAR(64) NOT NULL,
  total_price NUMERIC(14,2) NOT NULL CHECK (total_price > 0),
  status VARCHAR(16) NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED','PROCESSING','IN_TRANSIT','DELIVERED')),
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  price_at_purchase NUMERIC(12,2) NOT NULL CHECK (price_at_purchase > 0),
  UNIQUE (order_id, product_id)
);
```

### 6.6. Transakcje i spójność danych

&#91;embedded content: transakcja · wszystko albo nic\]

Trzy czynności tworzą jedną transakcję: jeśli którakolwiek zawiedzie, baza danych cofa wszystkie.

- Wszystkie zmiany dotyczące pieniędzy są wykonywane w jednej transakcji SQLAlchemy: session.begin() ... session.commit() dopiero na końcu łańcucha, przy dowolnym wyjątku session.rollback().
- Poziom izolacji READ COMMITTED (domyślny w PostgreSQL) wraz z jawnym blokowaniem wiersza użytkownika (SELECT ... FOR UPDATE). Dwa jednoczesne checkouty tego samego użytkownika wykonują się kolejno, więc podwójne obciążenie jest niemożliwe.
- Wartości pieniężne w Pythonie są reprezentowane typem Decimal z zaokrągleniem ROUND\_HALF\_UP do 2 miejsc; float nie jest używany do pieniędzy.
- Obrona w głąb: ograniczenia CHECK (saldo >= 0, cena > 0, ilość 1–99) zadziałają nawet wtedy, gdy w kodzie aplikacji pojawi się błąd.
- Migawka ceny (price\_at\_purchase) gwarantuje, że zmiana katalogu nigdy nie zmieni historycznych zamówień.

### 6.7. Migracje, dane początkowe, kopie zapasowe

- Schemat jest tworzony i zmieniany wyłącznie migracjami Alembic (wersjonowanie, wycofanie downgrade).
- Skrypt seed tworzy: konto administratora (hasło ze zmiennej środowiskowej, nie z kodu), 5–8 kategorii, 40–60 produktów demonstracyjnych.
- Supabase automatycznie tworzy codzienne kopie zapasowe; dodatkowo dla projektu dostępny jest eksport przez pg\_dump.
- Polityka przechowywania audytu: wpisy starsze niż 12 miesięcy można archiwizować; usuwanie nie jest przewidziane w API.

## 7. Schemat API (Specyfikacja REST API)

### 7.1. Zasady ogólne

| Parametr | Wartość |
| --- | --- |
| Bazowy URL | https://{backend}.onrender.com/api |
| Format | JSON, UTF-8; nagłówek Content-Type: application/json |
| Uwierzytelnianie | Authorization: Bearer {JWT} dla chronionych endpointów |
| Czas | ISO 8601 w UTC (np. 2026-11-09T12:00:00Z) |
| Pieniądze | Ciągi znaków z dwoma miejscami po przecinku (np. 1499.00), aby uniknąć błędów float |
| Paginacja | Parametry page (od 1) i page\_size (domyślnie 12, maksymalnie 100); odpowiedź: items, total, page, page\_size |
| Idempotentność | Nagłówek Idempotency-Key dla POST /api/orders |
| Śledzenie żądań | Każda odpowiedź zawiera X-Request-ID; ten sam identyfikator trafia do logów |
| Dokumentacja | Swagger UI pod /docs, OpenAPI JSON pod /openapi.json (generowane automatycznie przez FastAPI) |
| CORS | Dozwolony wyłącznie origin frontendu (zmienna ALLOWED\_ORIGINS) |

### 7.2. Format błędów i kody odpowiedzi

Jednolity format błędu:

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Niewystarczające środki na wirtualnym saldzie",
    "details": {"required": "2499.00", "available": "1200.00"},
    "request_id": "7f3c2a..."
  }
}
```

| HTTP | Kiedy | Przykładowe kody |
| --- | --- | --- |
| 200 OK | Udany odczyt/aktualizacja |  |
| 201 Created | Utworzono zasób |  |
| 204 No Content | Udane usunięcie/wylogowanie |  |
| 400 Bad Request | Naruszono regułę biznesową | INSUFFICIENT\_FUNDS, EMPTY\_ORDER |
| 401 Unauthorized | Brak lub nieważny token, błędne logowanie | INVALID\_CREDENTIALS, TOKEN\_EXPIRED |
| 403 Forbidden | Niewystarczające uprawnienia | FORBIDDEN\_ROLE |
| 404 Not Found | Zasób nie istnieje | PRODUCT\_NOT\_FOUND, TRACKING\_NOT\_FOUND |
| 409 Conflict | Konflikt stanu | EMAIL\_TAKEN, PRODUCT\_UNAVAILABLE |
| 422 Unprocessable Entity | Błąd walidacji Pydantic | VALIDATION\_ERROR |
| 429 Too Many Requests | Przekroczono limit | RATE\_LIMITED |
| 500 Internal Server Error | Nieprzewidziany błąd | INTERNAL\_ERROR |
| 503 Service Unavailable | Baza danych niedostępna | DB\_UNAVAILABLE |

### 7.3. Pełny wykaz endpointów

| Nr | Metoda i ścieżka | Dostęp | Przeznaczenie | Sukces |
| --- | --- | --- | --- | --- |
| 1 | POST /api/auth/register | Gość | Rejestracja | 201 |
| 2 | POST /api/auth/login | Gość | Logowanie, wydanie tokenów | 200 |
| 3 | POST /api/auth/refresh | Gość z refresh-tokenem | Odświeżenie access-tokena | 200 |
| 4 | POST /api/auth/logout | Zalogowany | Unieważnienie refresh-tokena | 204 |
| 5 | GET /api/auth/me | Zalogowany | Profil, rola, saldo | 200 |
| 6 | GET /api/products | Wszyscy | Lista produktów (filtry, wyszukiwanie, paginacja) | 200 |
| 7 | GET /api/products/{id} | Wszyscy | Karta produktu | 200 / 404 |
| 8 | POST /api/products | Admin | Utworzenie produktu | 201 |
| 9 | PUT /api/products/{id} | Admin | Pełna zmiana produktu | 200 |
| 10 | PATCH /api/products/{id} | Admin | Zmiana częściowa | 200 |
| 11 | DELETE /api/products/{id} | Admin | Dezaktywacja (miękkie usunięcie) | 204 |
| 12 | GET /api/categories | Wszyscy | Lista kategorii | 200 |
| 13 | POST /api/categories | Admin | Utworzenie kategorii | 201 |
| 14 | PUT /api/categories/{id} | Admin | Zmiana kategorii | 200 |
| 15 | DELETE /api/categories/{id} | Admin | Usunięcie pustej kategorii | 204 / 409 |
| 16 | GET /api/wallet/balance | Client | Aktualne saldo | 200 |
| 17 | POST /api/wallet/reset | Client | Reset salda do 100000 DP | 200 |
| 18 | GET /api/analytics/savings | Client | Dashboard oszczędności | 200 |
| 19 | POST /api/orders | Client | Utworzenie zamówienia (checkout) | 201 / 200 (powtórzenie) |
| 20 | GET /api/orders | Client | Historia własnych zamówień | 200 |
| 21 | GET /api/orders/{id} | Client (własne), Admin | Szczegóły zamówienia | 200 / 404 |
| 22 | GET /api/orders/track/{tracking\_number} | Wszyscy (różna pełność danych) | Śledzenie przesyłki | 200 / 404 |
| 23 | GET /api/admin/audit-logs | Admin | Logi audytu z filtrami | 200 |
| 24 | GET /api/admin/analytics/overview | Admin | Analityka ogólna obrotu | 200 |
| 25 | GET /api/health | Wszyscy | Sprawdzenie stanu (także do rozgrzewania serwera) | 200 |

### 7.4. Kontrakty kluczowych endpointów

#### POST /api/auth/register

Żądanie: {email, password}. Walidacja: email wg RFC 5322 (EmailStr), hasło 8–72 znaki, co najmniej jedna litera i jedna cyfra.

Odpowiedź 201: {id, email, role}. Błędy: 409 EMAIL\_TAKEN, 422 VALIDATION\_ERROR.

#### POST /api/auth/login

```json
// żądanie
{"email": "anna@example.com", "password": "Secret123"}

// odpowiedź 200
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "b1c2...",
  "token_type": "bearer",
  "expires_in": 1800,
  "role": "client"
}
```

#### GET /api/products

Parametry: page, page\_size, category (slug), q (wyszukiwanie po nazwie), min\_price, max\_price, sort (price\_asc, price\_desc, newest).

```json
{
  "items": [
    {"id": "3f2b...", "title": "Słuchawki bezprzewodowe", "price": "1499.00",
     "image_url": "https://.../p1.jpg", "category": {"id": 2, "name": "Elektronika", "slug": "electronics"}}
  ],
  "total": 48, "page": 1, "page_size": 12
}
```

#### POST /api/products (Admin)

Żądanie: {title, category\_id, price, description, image\_url?}. Odpowiedź 201: pełny obiekt produktu. Błędy: 401, 403, 422 (price <= 0), 404 (kategoria nie istnieje).

#### POST /api/orders (Client)

Nagłówki: Authorization, Idempotency-Key. Treść **nie zawiera danych karty**.

```json
// żądanie
{
  "items": [{"product_id": "3f2b...", "qty": 2}, {"product_id": "9a10...", "qty": 1}],
  "shipping_address": {
    "full_name": "Anna Kowalska", "line1": "ul. Testowa 1",
    "city": "Wrocław", "postal_code": "50-001", "country": "PL"
  }
}

// odpowiedź 201
{
  "order_id": "c7d1...",
  "tracking_number": "DS-7K2M9QX4TB",
  "total_price": "3498.00",
  "new_balance": "96502.00",
  "total_saved_amount": "3498.00"
}
```

Błędy: 400 INSUFFICIENT\_FUNDS lub EMPTY\_ORDER, 409 PRODUCT\_UNAVAILABLE, 422 VALIDATION\_ERROR, 401/403.

#### GET /api/orders/track/{tracking\_number}

```json
{
  "tracking_number": "DS-7K2M9QX4TB",
  "status": "IN_TRANSIT",
  "created_at": "2026-11-09T12:00:00Z",
  "estimated_delivery": "2026-11-09T14:00:00Z",
  "history": [
    {"status": "CREATED", "at": "2026-11-09T12:00:00Z", "note": "Zamówienie utworzono"},
    {"status": "PROCESSING", "at": "2026-11-09T12:00:30Z", "note": "Zamówienie jest kompletowane"},
    {"status": "IN_TRANSIT", "at": "2026-11-09T12:10:00Z", "note": "Paczka przekazana do doręczenia"}
  ]
}
```

Dla zalogowanego właściciela dodatkowo zwracane są items i shipping\_address. Błędy: 404 TRACKING\_NOT\_FOUND.

#### GET /api/wallet/balance

Odpowiedź 200: {virtual\_balance: "96502.00", currency: "DP"}.

#### GET /api/analytics/savings

```json
{
  "total_saved_amount": "3498.00",
  "transactions_count": 1,
  "average_order": "3498.00",
  "largest_order": "3498.00",
  "by_category": [{"category": "Elektronika", "amount": "2998.00"}],
  "daily_series": [{"date": "2026-11-09", "amount": "3498.00"}]
}
```

#### GET /api/admin/audit-logs (Admin)

Parametry: user\_id, action\_type, date\_from, date\_to, page, page\_size. Odpowiedź 200: {items: \[{id, timestamp, action\_type, user\_id, ip\_address, payload\_json}\], total, page, page\_size}.

### 7.5. Ograniczenia i aspekty niefunkcjonalne API

- **Rate limiting:** 5 prób logowania na 15 minut z jednego IP; 100 żądań na minutę z jednego IP dla pozostałych endpointów (biblioteka slowapi).
- **Walidacja:** wszystkie schematy wejściowe Pydantic mają extra = forbid, więc nieznane pola (np. próba przekazania price w zamówieniu) są odrzucane.
- **Wersjonowanie:** prefiks /api; przyszłe przejście na /api/v1 nie zepsuje klienta dzięki jednej stałej bazowego URL we frontendzie.
- **Buforowanie:** GET /api/products i /api/categories mogą zwracać Cache-Control: public, max-age=30.

## 8. Komunikacja między modułami

### 8.1. Moduły systemu

**Frontend (React SPA):**

| Moduł | Odpowiedzialność |
| --- | --- |
| auth | Formularze rejestracji/logowania, przechowywanie tokenów, trasy chronione według roli |
| catalog | Lista, wyszukiwanie, filtry, karta produktu |
| cart | Stan koszyka (Context + localStorage), obliczanie sumy |
| checkout | Formularze dostawy i karty, walidacja Luhna, zastrzeżenie, wysyłka zamówienia |
| tracking | Formularz wyszukiwania numeru śledzenia, oś czasu statusów, automatyczne odświeżanie |
| dashboard | Metryki i wykres oszczędności, saldo |
| admin | CRUD produktów i kategorii, tabela logów audytu, analityka |
| api-client | Jedna instancja Axios: dodawanie JWT, refresh przy 401, obsługa cold start, normalizacja błędów |

**Backend (FastAPI):**

| Moduł | Odpowiedzialność | Zależy od |
| --- | --- | --- |
| auth | Rejestracja, logowanie, JWT, refresh, role | users, audit |
| catalog | Produkty i kategorie | baza danych, audit (dla zmian administratora) |
| orders | Checkout, historia, idempotentność | wallet, catalog, audit |
| wallet | Saldo, reset, obciążenie (wywoływane z orders we wspólnej transakcji) | users |
| tracking | Obliczanie statusu dostawy na podstawie czasu | orders |
| analytics | Agregaty dla klienta i administratora | orders, order\_items, users |
| audit | Zapis i odczyt dziennika zdarzeń | baza danych |
| core | Konfiguracja, bezpieczeństwo, zależności, obsługa błędów, rate limiting | wszystkie |

### 8.2. Rodzaje komunikacji

| Powiązanie | Protokół / mechanizm | Synchroniczność | Format |
| --- | --- | --- | --- |
| Przeglądarka do API | HTTPS, REST | Synchronicznie | JSON |
| API do bazy danych | SQL po TLS przez SQLAlchemy i pooler Supabase | Synchronicznie | SQL, zapytania parametryzowane |
| Moduł do modułu wewnątrz backendu | Wywołania funkcji warstwy serwisowej (in-process) | Synchronicznie | Obiekty Pythona, DTO Pydantic |
| Po odpowiedzi do audit | FastAPI BackgroundTasks | Asynchronicznie (po wysłaniu odpowiedzi) | Payload JSON |
| Frontend: komponent do komponentu | React Context / props | Synchronicznie | Obiekty JS |
| Frontend do magazynu przeglądarki | localStorage | Synchronicznie | JSON |

Ważne: w projekcie nie ma mikroserwisów ani kolejek komunikatów. Backend jest **modularnym monolitem**: moduły współpracują przez wywołania funkcji w obrębie jednego procesu, co upraszcza transakcyjność (jedna transakcja na cały łańcuch checkoutu) i pasuje do darmowego hostingu.

### 8.3. Zasady zależności między warstwami

- Router wywołuje tylko Service; Service wywołuje Repository i inne Service; Repository pracuje wyłącznie z bazą danych.
- Zależności zwrotne są zabronione (Repository nie zna Routera).
- Moduł audit nie zależy od modułów biznesowych, a jedynie otrzymuje od nich zdarzenia.
- Moduł orders jest jedynym miejscem, w którym zmieniają się saldo i oszczędności, tzn. inne moduły nie mają prawa wykonywać UPDATE balance bezpośrednio.

### 8.4. Diagram sekwencji: checkout

&#91;embedded content: diagram sekwencji · checkout\]

### 8.5. Diagram sekwencji: śledzenie dostawy

&#91;embedded content: diagram sekwencji · śledzenie dostawy\]

### 8.6. Diagram sekwencji: uwierzytelnianie i refresh

&#91;embedded content: diagram sekwencji · uwierzytelnianie i refresh\]

### 8.7. Kontrakt danych między frontendem a backendem

- Jedno źródło prawdy: schemat OpenAPI generowany automatycznie przez FastAPI. Typy TypeScript/klienta JS można z niego generować (openapi-typescript), co wyklucza rozbieżności.
- Klient nigdy nie ufa własnym obliczeniom pieniędzy: sumy z UI mają charakter ilustracyjny, serwer zwraca wartości ostateczne.
- Timeouty i ponowienia: Axios timeout 60 sekund dla pierwszego żądania (cold start), potem 15 sekund; ponowienie żądań GET do 2 razy z opóźnieniem przy 502/503/504; POST są ponawiane tylko z tym samym Idempotency-Key.

## 9. Bezpieczeństwo

### 9.1. Wykaz zagrożeń i środków zaradczych

| Zagrożenie (OWASP) | Środek w projekcie |
| --- | --- |
| Złamanie haseł, wyciek bazy | bcrypt (cost 12), minimalne wymagania dla hasła, rate limiting logowania |
| Kradzież/podrobienie tokena | Podpis HS256 z długim sekretem w zmiennej środowiskowej, krótki czas życia access-tokena, refresh-tokeny przechowywane wyłącznie w postaci hasha |
| Podniesienie uprawnień (broken access control) | Sprawdzanie roli na backendzie w każdym chronionym endpoincie; sprawdzanie własności zasobu (zamówienie, saldo) według user\_id z tokena |
| SQL injection | Wyłącznie parametryzowane zapytania SQLAlchemy ORM, bez konkatenacji SQL |
| XSS | React domyślnie escapuje wyjście; zabroniony dangerouslySetInnerHTML; Content-Security-Policy na Vercel |
| CSRF | Token przekazywany w nagłówku Authorization, a nie w cookie, więc klasyczny CSRF jest niemożliwy |
| Podmiana ceny lub kwoty | Serwer ignoruje ceny z klienta, Pydantic extra = forbid |
| Podwójne obciążenie (race condition) | Blokada wiersza użytkownika, Idempotency-Key |
| Zgadywanie numerów śledzenia | 10 losowych znaków (około 2^50 kombinacji), rate limiting, tryb publiczny nie zwraca adresu |
| Brute force i DDoS | Rate limiting (slowapi), ograniczenie rozmiaru treści żądania |
| Wyciek sekretów | Sekrety wyłącznie w zmiennych środowiskowych, .env w .gitignore, skanowanie sekretów w CI |
| Niebezpieczne zależności | Dependabot / pip-audit / npm audit w CI |

### 9.2. Ochrona fikcyjnych danych płatniczych

Projekt jest celowo zaprojektowany tak, aby prawdziwe dane płatnicze **nie mogły** trafić do systemu:

1. Przed wprowadzeniem karty wyświetlane jest obowiązkowe okno modalne z zastrzeżeniem, że to symulacja i że należy używać wyłącznie numerów testowych (np. 4242 4242 4242 4242).
2. Numer, data ważności i CVC są walidowane na frontendzie (Luhn + format); do backendu **nie są w ogóle wysyłane** (w schemacie POST /api/orders nie ma dla nich pól, a extra = forbid odrzuci próbę ich przekazania).
3. Jeśli w przyszłej wersji walidacja Luhna będzie wykonywana także po stronie serwera, numer zostanie przetworzony w pamięci i odrzucony na poziomie schematu Pydantic (pole nie trafia do modelu ORM i nie jest logowane; redact() w audycie zastępuje klucze card, cvc, number).
4. Podczas walidacji w UI odrzucane są numery, które nie przechodzą Luhna; zaleca się akceptowanie tylko znanych zakresów testowych.
5. Ponieważ prawdziwe karty nie są przetwarzane, wymagania PCI DSS nie mają zastosowania do projektu.

### 9.3. Dane osobowe (RODO / GDPR)

| Dane | Po co | Środek |
| --- | --- | --- |
| email | Login | Przechowywany wyłącznie do uwierzytelniania; nie jest przekazywany osobom trzecim |
| password\_hash | Uwierzytelnianie | Wyłącznie hash |
| Adres IP w audit\_logs | Bezpieczeństwo i audyt (uzasadniony interes) | Przechowywany nie dłużej niż 12 miesięcy; dostępny wyłącznie dla administratora |
| Fikcyjny adres dostawy | Symulacja | Użytkownik jest ostrzegany, aby wpisywał dane zmyślone |

Prawa użytkownika: możliwość usunięcia konta (prośba do administratora lub przyszły endpoint DELETE /api/auth/me); przy usunięciu users.id w audit\_logs jest zamieniane na NULL (ON DELETE SET NULL), co anonimizuje historię.

### 9.4. Transport i nagłówki

- HTTPS wymuszony (Vercel i Render zapewniają TLS automatycznie); połączenie z Supabase wyłącznie po TLS.
- Nagłówki bezpieczeństwa: Strict-Transport-Security, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy.
- CORS: dozwolona wyłącznie domena frontendu, metody i nagłówki ograniczone do niezbędnych.

## 10. Przypadki brzegowe i sytuacje trudne

### 10.1. Cold start darmowego serwera Render

Problem: darmowa instancja usypia po 15 minutach bez żądań, wybudzenie trwa do ok. 50 sekund, a strona wygląda na „zawieszoną”.

Rozwiązanie:

1. Przy ładowaniu SPA od razu wysyłane jest lekkie GET /api/health (rozgrzewka), równolegle z renderowaniem szkieletu strony.
2. Jeśli brak odpowiedzi przez ponad 3 sekundy, UI pokazuje animowane szkielety z tekstem „Budzimy serwery DopamineStore (może to potrwać do minuty)…” oraz wskaźnik postępu.
3. api-client ma wydłużony timeout (60 s) dla pierwszego żądania i automatyczne ponowienia GET przy 502/503/504.
4. Po udanej odpowiedzi stan „obudzony” jest zapamiętywany i do następnego bezczynności szkielety z wyjaśnieniem nie są pokazywane.
5. Przed demonstracją dla prowadzącego serwer jest rozgrzewany ręcznie (otworzyć /api/health 1–2 minuty przed początkiem).

Dodatkowo: darmowy projekt Supabase może zostać wstrzymany po dłuższej (około tygodniowej) bezczynności, dlatego przed obroną należy upewnić się, że projekt jest aktywny.

### 10.2. Transakcyjność licznika oszczędności

Problem: jeśli po obciążeniu środków baza danych ulegnie awarii przed utworzeniem zamówienia, pieniądze „przepadną”.

Rozwiązanie: Session.commit() jest wywoływane tylko raz na końcu łańcucha; każdy błąd powoduje Session.rollback(). Saldo i oszczędności zmieniają się wyłącznie razem z udanym utworzeniem orders i order\_items. W testach ten scenariusz jest sprawdzany przez wymuszone zgłoszenie błędu po UPDATE users: stan bazy po wycofaniu musi być zgodny z początkowym.

### 10.3. Bezpieczeństwo fikcyjnych danych płatniczych

Zob. rozdział 9.2: zastrzeżenie, Luhn wyłącznie jako walidacja mock, dane karty nie są przekazywane ani przechowywane, payload jest oczyszczany na poziomie schematów.

### 10.4. Efemeryczność systemu plików Render

Lokalny SQLite byłby kasowany przy każdym wdrożeniu lub restarcie kontenera. Dlatego użyto chmurowego PostgreSQL (Supabase) przez DATABASE\_URL ze zmiennych środowiskowych Render. Obrazy produktów są przechowywane nie w systemie plików, lecz jako zewnętrzne odnośniki (image\_url) lub w Supabase Storage.

### 10.5. Żądania jednoczesne

Dwa checkouty z różnych kart przeglądarki: wiersz użytkownika jest blokowany, drugie żądanie czeka na zakończenie pierwszego i widzi już zaktualizowane saldo; jeśli środków brakuje, zwraca 400. Podwójne kliknięcie przycisku: Idempotency-Key zwraca to samo zamówienie bez ponownego obciążenia, a przycisk w UI jest blokowany na czas żądania.

### 10.6. Zmiana ceny lub dezaktywacja produktu w trakcie składania zamówienia

Produkt w koszyku może się zmienić między dodaniem a checkoutem. Serwer zawsze używa aktualnej ceny; jeśli suma całkowita różni się od pokazanej, UI otrzymuje nową sumę i prosi o potwierdzenie; jeśli produkt jest nieaktywny, zwracane jest 409 PRODUCT\_UNAVAILABLE z listą pozycji, które należy usunąć.

### 10.7. Wyczerpanie salda

Gdy wirtualne saldo się kończy, UI proponuje „Zresetuj saldo” (UC-13). Reset ustawia virtual\_balance = 100000.00, **nie zmienia** total\_saved\_amount ani historii zamówień i jest zapisywany w audycie (BALANCE\_RESET). Dzięki temu logika „oszczędności” pozostaje metryką kumulatywną.

### 10.8. Czas i strefy czasowe

Wszystkie znaczniki czasu są przechowywane w UTC (TIMESTAMPTZ), w kodzie używane jest datetime.now(timezone.utc) (zamiast przestarzałego utcnow()); czas lokalny wyświetla wyłącznie frontend według strefy czasowej przeglądarki.

### 10.9. Pula połączeń Supabase

Z poolerem w trybie transaction nie działają poprawnie prepared statements; przy użyciu sterownika asyncpg trzeba wyłączyć statement cache, a rozmiar puli utrzymywać niewielki, aby nie wyczerpać limitu połączeń darmowego planu.

## 11. Testowanie, wdrożenie i utrzymanie

### 11.1. Strategia testowania

| Poziom | Narzędzie | Co jest sprawdzane |
| --- | --- | --- |
| Jednostkowe | pytest | Obliczanie statusu dostawy, Luhn, redact(), generowanie numeru śledzenia, zaokrąglanie pieniędzy |
| Integracyjne | pytest + httpx TestClient + testowa baza PostgreSQL | Wszystkie endpointy, RBAC (200/401/403), checkout, wycofanie transakcji, idempotentność |
| Frontend | Vitest + React Testing Library | Koszyk, walidacja formularzy, przekierowanie według roli |
| E2E (ręczne/Playwright) | Playwright | Scenariusz: rejestracja, koszyk, checkout, śledzenie, dashboard |
| Obciążeniowe (podstawowe) | locust / k6 | 20 jednoczesnych użytkowników na katalogu i checkoucie |

Kluczowe przypadki testowe:

1. Checkout przy wystarczającym saldzie zmienia saldo i oszczędności o tę samą kwotę.
2. Checkout przy niewystarczającym saldzie zwraca 400, baza danych nie zmienia się.
3. Błąd po obciążeniu prowadzi do pełnego wycofania.
4. Dwa równoległe checkouty nie obciążą więcej, niż jest na saldzie.
5. Powtórne żądanie z tym samym Idempotency-Key nie tworzy drugiego zamówienia.
6. Klient otrzymuje 403 na /api/admin/audit-logs, Gość otrzymuje 401 na /api/orders.
7. Status zamówienia odpowiada tabeli progów na granicach 29/31 s, 9/11 min, 119/121 min (ze sterowanym zegarem w teście).
8. Numer karty i CVC nie pojawiają się ani w bazie, ani w audit\_logs.
9. Dezaktywowany produkt nie wyświetla się w katalogu i nie może zostać zamówiony.

### 11.2. CI/CD

| Krok | Czynność |
| --- | --- |
| 1 | GitHub Actions na każdy pull request: lint (ruff, eslint), testy backendu i frontendu, pip-audit / npm audit |
| 2 | Scalenie do main: Vercel automatycznie wdraża frontend |
| 3 | Scalenie do main: Render automatycznie wdraża backend; przed startem wykonywane jest alembic upgrade head |
| 4 | Po wdrożeniu smoke test: GET /api/health i GET /api/products |

### 11.3. Zmienne środowiskowe

| Zmienna | Gdzie | Przeznaczenie |
| --- | --- | --- |
| DATABASE\_URL | Render | Ciąg połączenia z Supabase PostgreSQL |
| JWT\_SECRET | Render | Sekret podpisu tokenów |
| ACCESS\_TOKEN\_MINUTES, REFRESH\_TOKEN\_DAYS | Render | Czas życia tokenów |
| ALLOWED\_ORIGINS | Render | Dozwolone origin dla CORS |
| TRACKING\_SPEED\_FACTOR, TRACKING\_THRESHOLDS | Render | Szybkość i progi symulacji dostawy |
| ADMIN\_SEED\_EMAIL, ADMIN\_SEED\_PASSWORD | Tylko w momencie seed | Utworzenie administratora |
| VITE\_API\_URL | Vercel | Adres backendu |

### 11.4. Monitoring w działaniu

- Strukturalne logi JSON backendu z request\_id (dostępne w panelu Render).
- Monitoring biznesowy przez tabelę audit\_logs i panel administratora.
- Sprawdzanie dostępności: GET /api/health (można też podłączyć darmowy zewnętrzny monitor, który przy okazji zapobiegnie usypianiu, o ile nie jest to sprzeczne z regulaminem planu).

## 12. Ryzyka i plan realizacji

### 12.1. Ryzyka

| Ryzyko | Prawdopodobieństwo | Wpływ | Środek zaradczy |
| --- | --- | --- | --- |
| Cold start podczas demonstracji | Wysokie | Średni | Rozgrzewka przed obroną, szkielety, health-ping |
| Wstrzymanie darmowego projektu Supabase | Średnie | Wysoki | Sprawdzenie projektu dobę przed obroną, regularne zapytania |
| Błąd w logice obciążenia | Niskie | Wysoki | Testy integracyjne transakcji, CHECK w bazie |
| Brak czasu na pełną funkcjonalność | Średnie | Średni | Priorytetyzacja MoSCoW (Must / Should / Could) |
| Limity darmowych planów | Średnie | Średni | Mała pula połączeń, buforowanie, minimum procesów w tle |
| Wyciek sekretów do repozytorium | Niskie | Wysoki | .env w .gitignore, skanowanie sekretów |

### 12.2. Etapy realizacji

| Etap | Zawartość |
| --- | --- |
| 0. Opis projektu (09.11.2026) | Ten dokument: architektura, API, procesy, użytkownicy, przypadki użycia, baza danych, komunikacja modułów |
| 1. Szkielet | Repozytorium, CI, FastAPI + Alembic + schemat bazy, React + Vite + Tailwind, wdrożenie „Hello World” na Vercel/Render/Supabase |
| 2. Rdzeń | Auth + RBAC, katalog, kategorie, dane seed |
| 3. Zakupy | Koszyk, checkout, transakcyjne obciążenie, idempotentność |
| 4. Dostawa i analityka | Tracking, dashboard oszczędności, analityka administratora |
| 5. Audyt | audit\_logs, middleware, przegląd przez administratora |
| 6. Jakość | Testy, bezpieczeństwo, UX cold start, dokumentacja, scenariusz demo |

## 13. Słownik pojęć

| Termin | Znaczenie |
| --- | --- |
| DP (Dopamine Points) | Wewnętrzna wirtualna waluta systemu |
| Mindful shopping | Świadoma konsumpcja |
| ACID | Atomicity, Consistency, Isolation, Durability: właściwości transakcji |
| RBAC | Role-Based Access Control: rozdział dostępu według ról |
| JWT | JSON Web Token: podpisany token uwierzytelniający |
| Idempotency-Key | Unikalny klucz żądania, który czyni ponowne wysłanie bezpiecznym |
| Cold start | Długa pierwsza odpowiedź serwera po uśpieniu |
| Algorytm Luhna | Suma kontrolna do weryfikacji numerów kart płatniczych |
| BackgroundTasks | Mechanizm FastAPI do wykonywania kodu po wysłaniu odpowiedzi |
| Audit log | Niezmienny dziennik zdarzeń systemu |
| Soft delete | Miękkie usunięcie: rekord jest oznaczany jako nieaktywny, ale nie jest usuwany z bazy |
| Pooler | Usługa pośrednicząca zarządzająca pulą połączeń z bazą danych |
