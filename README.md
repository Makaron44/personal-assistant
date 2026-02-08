# 📱 Personal Assistant PWA

Nowoczesna aplikacja PWA do zarządzania codziennymi sprawami - terminy dokumentów, lokalizacja przedmiotów i pogoda.

**🌐 Demo: [makaron44.github.io/personal-assistant](https://makaron44.github.io/personal-assistant/)**

---

## ✨ Funkcje

### 📅 Terminy Dokumentów
- Śledzenie dat ważności dokumentów (dowód, paszport, itp.)
- **Kolorowe oznaczenia**: 🟢 >10 dni | 🟡 5-9 dni | 🔴 <5 dni
- **Eksport do Apple Calendar** - plik ICS z przypomnieniami (7 dni i 1 dzień przed)

### 🏠 Lokalizator "Gdzie Co Jest"
- Zapisywanie lokalizacji przedmiotów w domu
- **Zdjęcia miejsc** z automatyczną kompresją (~95% redukcji)
- Wyszukiwarka, kategorie, notatki

### 🌤️ Pogoda
- Aktualna pogoda z **geolokalizacją**
- Prognoza godzinowa (24h) i dzienna (7 dni)
- API: Open-Meteo (bez klucza API)

### 📱 PWA
- Instalacja na ekran główny (iPhone/Android)
- **Działa offline** dzięki Service Worker
- **Przycisk aktualizacji** 🔄 do pobierania nowych wersji

---

## 🛠️ Technologie

| Technologia | Zastosowanie |
|-------------|--------------|
| HTML/CSS/JS | Frontend |
| IndexedDB | Lokalne dane |
| Canvas API | Kompresja zdjęć |
| Service Worker | Offline + cache |
| Open-Meteo API | Pogoda |

---

## 🚀 Uruchomienie lokalne

```bash
# Python
python -m http.server 8080

# Node.js
npx serve
```

Otwórz: http://localhost:8080

---

## 📁 Struktura

```
├── index.html      # Struktura HTML
├── styles.css      # Style (dark theme, glassmorphism)
├── app.js          # Logika aplikacji
├── db.js           # IndexedDB
├── sw.js           # Service Worker
├── manifest.json   # PWA manifest
└── icons/          # Ikony PWA
```

---

## 📲 Instalacja na iPhone

1. Otwórz link w Safari
2. Kliknij "Udostępnij" → "Dodaj do ekranu początkowego"
3. Gotowe! ☰ Menu w lewym górnym rogu

---

## 📄 Licencja

MIT
