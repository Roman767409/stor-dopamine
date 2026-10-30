DopamineStore: lista ekranów dla projektanta
O projekcie
DopamineStore to sklep internetowy, w którym wszystkie pieniądze są wirtualne. Użytkownik dokonuje zakupu za pomocą wewnętrznej waluty DP (Punktów Dopamine), a system pokazuje, ile prawdziwych pieniędzy „zaoszczędził”, nie wydając ich. Cel projektu: sklep powinien wyglądać atrakcyjnie i sprawiać wrażenie prawdziwego, ale jednocześnie mieć uspokajający, pozytywny nastrój. Nie agresywne rabaty i timery, ale poczucie kontroli i małych zwycięstw.
Saldo początkowe każdego użytkownika: 100 000 DP.
Ogólne wymagania
• Adaptacyjny układ, najpierw wersja mobilna, potem desktopowa.
• Wystarczający kontrast tekstu i przycisków dla łatwego czytania.
• ​​Saldo DP (dla autoryzowanych użytkowników) i licznik koszyka są zawsze widoczne w nagłówku strony.
• Na stronach płatności znajduje się wyraźne ostrzeżenie: „To jest symulacja, używaj tylko numerów kart testowych”.
• Wymagane stany: ładowanie (szkielet), pusty wynik, błąd.
Ekrany
1. Katalog produktów (główny)
• Siatka kart produktów: zdjęcie, nazwa, cena w DP, przycisk „Dodaj do koszyka”.
• Wyszukiwanie według nazwy, filtrowanie według kategorii i ceny, sortowanie.
• Paginacja (12 produktów na stronie).
• Status „Nic nie znaleziono”.
• Status „Serwer się wybudza” (szkielety z komunikatem, ponieważ darmowy hosting uruchamia się powoli).
2. Karta produktu
• Duże zdjęcie, nazwa, opis, kategoria, cena w DP.
• Wybór ilości (od 1 do 99) i przycisk „Dodaj do koszyka”.
• Dla gościa przycisk otwiera okno logowania lub rejestracji.
3. Logowanie i rejestracja
• Formularz logowania: adres e-mail i hasło.
• Formularz rejestracyjny: adres e-mail i hasło (minimum 8 znaków, litery i cyfry).
• Komunikat o błędzie: adres e-mail już istnieje, nieprawidłowe dane.
4. Koszyk
• Lista produktów: zdjęcie, nazwa, ilość (zmienna), cena, przycisk „Usuń”.
• Suma częściowa i aktualne saldo obok siebie.
• Jeśli kwota jest większa niż saldo: ostrzeżenie, a przycisk „Przejdź do kasy” jest zablokowany.
• Przycisk „Przejdź do kasy”.
5. Przejście do kasy (okno modalne lub strona)
• Ostrzeżenie o symulacji.
• Pola dostawy: imię i nazwisko, adres, miasto, kod pocztowy, kraj.
• Pola karty testowej: numer (np. 4242 4242 4242 4242), data ważności, kod CVC.
• Przycisk „Zapłać DP”.
• Ekran powodzenia: „Zamówienie utworzone” z ładną animacją nagrody, numerem śledzenia i przyciskiem „Śledź paczkę”.
6. Śledzenie przesyłki
• Pole numeru śledzenia (format DS-XXXXXXXXXX).
• Oś czasu statusu z datami: od utworzenia do dostawy.
• Przewidywana data doręczenia.
• ​​Błędy: brak numeru, niepoprawny format.
7. Panel oszczędności
• Duże karty metryczne: kwota „zaoszczędzonych”, liczba zamówień, średnia wartość zamówienia, największe zamówienie.
• Wykres 30-dniowy.
• Podział według kategorii.
• Tekst motywacyjny: „Nie wydałeś X prawdziwych pieniędzy”.
• Kamienie milowe: 1000, 10 000, 50 000 DP.
• Porównanie z poprzednim tygodniem.
8. Historia zamówień
• Lista zamówień: data, kwota, status, przycisk „Śledź”.
• Szczegóły zamówienia: lista produktów, adres, numer śledzenia.
Panel administracyjny (opcjonalnie dla projektanta)
Tę część wykonam samodzielnie, korzystając z prostego szablonu: tabeli produktów z możliwością dodawania, edycji i wyłączania, przeglądania rejestru działań i ogólnej analityki.
Co wysłać w odpowiedzi?
• Układy w Figmie lub gotowe strony HTML.
• Paleta kolorów i czcionki.
• Ikony i obrazy w osobnych plikach.