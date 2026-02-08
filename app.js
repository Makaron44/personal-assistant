// ============================================
// Personal Assistant - Main Application Logic
// ============================================

// Current state
let currentView = 'deadlines';
let currentModalType = null;
let editingId = null;
let currentImageData = null; // For storing compressed image

// Category icons mapping
const categoryIcons = {
    'other': '📦',
    'documents': '📄',
    'tools': '🔧',
    'electronics': '💻',
    'clothes': '👕',
    'kitchen': '🍳'
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize database
    try {
        await initDB();
        console.log('App initialized');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Błąd inicjalizacji bazy danych');
    }

    // Set current date
    updateCurrentDate();

    // Load initial data
    await loadDeadlines();
    await loadItems();

    // Register Service Worker
    registerServiceWorker();
});

function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateElement.textContent = now.toLocaleDateString('pl-PL', options);
}

// ============================================
// View Switching
// ============================================

function switchView(view) {
    currentView = view;

    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    document.getElementById(`${view}-view`).classList.add('active');

    // Load weather when switching to weather view
    if (view === 'weather') {
        loadWeather();
    }
}

// ============================================
// Modal Management
// ============================================

function openModal(type, id = null) {
    currentModalType = type;
    editingId = id;

    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const deadlineForm = document.getElementById('deadline-form');
    const itemForm = document.getElementById('item-form');

    // Reset forms
    deadlineForm.reset();
    itemForm.reset();
    document.getElementById('deadline-id').value = '';
    document.getElementById('item-id').value = '';

    // Show appropriate form
    deadlineForm.classList.toggle('active', type === 'deadline');
    itemForm.classList.toggle('active', type === 'item');

    if (type === 'deadline') {
        title.textContent = id ? 'Edytuj Termin' : 'Dodaj Termin';
        if (id) loadDeadlineForEdit(id);
    } else {
        title.textContent = id ? 'Edytuj Przedmiot' : 'Dodaj Przedmiot';
        if (id) loadItemForEdit(id);
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentModalType = null;
    editingId = null;
    resetImageUpload();
}

// Close modal when clicking outside
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// ============================================
// Deadlines Management
// ============================================

async function loadDeadlines() {
    try {
        const deadlines = await getAllDeadlines();
        renderDeadlines(deadlines);
    } catch (error) {
        console.error('Failed to load deadlines:', error);
    }
}

function renderDeadlines(deadlines) {
    const list = document.getElementById('deadlines-list');
    const empty = document.getElementById('deadlines-empty');

    if (deadlines.length === 0) {
        list.innerHTML = '';
        empty.classList.add('visible');
        return;
    }

    empty.classList.remove('visible');

    // Sort by date (closest first)
    deadlines.sort((a, b) => new Date(a.date) - new Date(b.date));

    list.innerHTML = deadlines.map(deadline => {
        const status = getDeadlineStatus(deadline.date);
        return `
            <div class="card" data-id="${deadline.id}">
                <div class="card-header">
                    <div class="card-title">📄 ${escapeHtml(deadline.name)}</div>
                    <span class="card-status ${status.class}">${status.label}</span>
                </div>
                <div class="card-info">
                    📅 Ważny do: ${formatDate(deadline.date)}
                </div>
                ${deadline.notes ? `<div class="card-notes">${escapeHtml(deadline.notes)}</div>` : ''}
                <div class="card-actions">
                    <button class="btn-action btn-edit" onclick="openModal('deadline', ${deadline.id})">
                        ✏️ Edytuj
                    </button>
                    <button class="btn-action btn-delete" onclick="confirmDeleteDeadline(${deadline.id})">
                        🗑️ Usuń
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getDeadlineStatus(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(dateStr);
    deadline.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { class: 'status-expired', label: 'Wygasł!' };
    } else if (diffDays <= 30) {
        return { class: 'status-danger', label: `${diffDays} dni` };
    } else if (diffDays <= 90) {
        return { class: 'status-warning', label: `${diffDays} dni` };
    } else {
        return { class: 'status-ok', label: 'OK' };
    }
}

async function loadDeadlineForEdit(id) {
    try {
        const deadline = await getDeadlineById(id);
        if (deadline) {
            document.getElementById('deadline-name').value = deadline.name;
            document.getElementById('deadline-date').value = deadline.date;
            document.getElementById('deadline-notes').value = deadline.notes || '';
            document.getElementById('deadline-id').value = deadline.id;
        }
    } catch (error) {
        console.error('Failed to load deadline:', error);
    }
}

async function saveDeadline(event) {
    event.preventDefault();

    const name = document.getElementById('deadline-name').value.trim();
    const date = document.getElementById('deadline-date').value;
    const notes = document.getElementById('deadline-notes').value.trim();
    const id = document.getElementById('deadline-id').value;

    if (!name || !date) {
        showToast('Wypełnij wymagane pola');
        return;
    }

    const deadline = { name, date, notes };

    try {
        if (id) {
            deadline.id = parseInt(id);
            await updateDeadline(deadline);
            showToast('Termin zaktualizowany');
        } else {
            await addDeadline(deadline);
            showToast('Termin dodany');
        }

        closeModal();
        await loadDeadlines();
    } catch (error) {
        console.error('Failed to save deadline:', error);
        showToast('Błąd zapisu');
    }
}

async function confirmDeleteDeadline(id) {
    if (confirm('Czy na pewno chcesz usunąć ten termin?')) {
        try {
            await deleteDeadline(id);
            showToast('Termin usunięty');
            await loadDeadlines();
        } catch (error) {
            console.error('Failed to delete deadline:', error);
            showToast('Błąd usuwania');
        }
    }
}

// ============================================
// Items Management
// ============================================

async function loadItems() {
    try {
        const items = await getAllItems();
        renderItems(items);
    } catch (error) {
        console.error('Failed to load items:', error);
    }
}

function renderItems(items) {
    const list = document.getElementById('items-list');
    const empty = document.getElementById('items-empty');

    if (items.length === 0) {
        list.innerHTML = '';
        empty.classList.add('visible');
        return;
    }

    empty.classList.remove('visible');

    // Sort alphabetically
    items.sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    list.innerHTML = items.map(item => {
        const icon = categoryIcons[item.category] || '📦';
        const imageHtml = item.image ? `
            <div class="card-image" onclick="openImageModal('${item.image.replace(/'/g, "\\'")}')"> 
                <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy">
            </div>` : '';
        return `
            <div class="card" data-id="${item.id}">
                ${imageHtml}
                <div class="card-category">${icon} ${getCategoryName(item.category)}</div>
                <div class="card-header">
                    <div class="card-title">${escapeHtml(item.name)}</div>
                </div>
                <div class="card-info">
                    📍 ${escapeHtml(item.location)}
                </div>
                ${item.notes ? `<div class="card-notes">${escapeHtml(item.notes)}</div>` : ''}
                <div class="card-actions">
                    <button class="btn-action btn-edit" onclick="openModal('item', ${item.id})">
                        ✏️ Edytuj
                    </button>
                    <button class="btn-action btn-delete" onclick="confirmDeleteItem(${item.id})">
                        🗑️ Usuń
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryName(category) {
    const names = {
        'other': 'Inne',
        'documents': 'Dokumenty',
        'tools': 'Narzędzia',
        'electronics': 'Elektronika',
        'clothes': 'Ubrania',
        'kitchen': 'Kuchnia'
    };
    return names[category] || 'Inne';
}

async function loadItemForEdit(id) {
    try {
        const item = await getItemById(id);
        if (item) {
            document.getElementById('item-name').value = item.name;
            document.getElementById('item-location').value = item.location;
            document.getElementById('item-category').value = item.category;
            document.getElementById('item-notes').value = item.notes || '';
            document.getElementById('item-id').value = item.id;

            // Load image if exists
            if (item.image) {
                currentImageData = item.image;
                displayImagePreview(item.image);
            }
        }
    } catch (error) {
        console.error('Failed to load item:', error);
    }
}

async function saveItem(event) {
    event.preventDefault();

    const name = document.getElementById('item-name').value.trim();
    const location = document.getElementById('item-location').value.trim();
    const category = document.getElementById('item-category').value;
    const notes = document.getElementById('item-notes').value.trim();
    const id = document.getElementById('item-id').value;

    if (!name || !location) {
        showToast('Wypełnij wymagane pola');
        return;
    }

    const item = { name, location, category, notes, image: currentImageData };

    try {
        if (id) {
            item.id = parseInt(id);
            await updateItem(item);
            showToast('Przedmiot zaktualizowany');
        } else {
            await addItem(item);
            showToast('Przedmiot dodany');
        }

        closeModal();
        await loadItems();
    } catch (error) {
        console.error('Failed to save item:', error);
        showToast('Błąd zapisu');
    }
}

async function confirmDeleteItem(id) {
    if (confirm('Czy na pewno chcesz usunąć ten przedmiot?')) {
        try {
            await deleteItem(id);
            showToast('Przedmiot usunięty');
            await loadItems();
        } catch (error) {
            console.error('Failed to delete item:', error);
            showToast('Błąd usuwania');
        }
    }
}

async function searchItems() {
    const query = document.getElementById('search-input').value.trim();

    try {
        if (query.length === 0) {
            await loadItems();
        } else {
            const items = await searchItemsByName(query);
            renderItems(items);
        }
    } catch (error) {
        console.error('Failed to search items:', error);
    }
}

// ============================================
// Utilities
// ============================================

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');

    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// ============================================
// Image Handling (Compression & Preview)
// ============================================

const MAX_IMAGE_WIDTH = 1200;
const IMAGE_QUALITY = 0.8;

// Compress image using Canvas API
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if needed
                if (width > MAX_IMAGE_WIDTH) {
                    height = (height * MAX_IMAGE_WIDTH) / width;
                    width = MAX_IMAGE_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to compressed JPEG
                const compressedDataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
                resolve(compressedDataUrl);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Handle image file selection
async function previewImage(event) {
    const file = event.target.files[0];

    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
        showToast('Wybierz plik graficzny');
        return;
    }

    // Show loading
    const preview = document.getElementById('image-preview');
    preview.innerHTML = `
        <div class="weather-loading">
            <div class="spinner"></div>
            <p>Kompresja...</p>
        </div>
    `;

    try {
        const originalSize = (file.size / 1024).toFixed(0);
        const compressedDataUrl = await compressImage(file);

        // Calculate compressed size (approximate from base64)
        const compressedSize = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

        currentImageData = compressedDataUrl;
        displayImagePreview(compressedDataUrl);

        showToast(`Zdjęcie skompresowane: ${originalSize}KB → ${compressedSize}KB`);
    } catch (error) {
        console.error('Image compression failed:', error);
        showToast('Błąd kompresji zdjęcia');
        resetImageUpload();
    }
}

// Display image in preview area
function displayImagePreview(dataUrl) {
    const preview = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-image-btn');

    preview.innerHTML = `<img src="${dataUrl}" alt="Podgląd">`;
    preview.onclick = () => openImageModal(dataUrl);
    removeBtn.style.display = 'block';
}

// Remove image from form
function removeImage() {
    currentImageData = null;
    resetImageUpload();
    showToast('Zdjęcie usunięte');
}

// Reset image upload to initial state
function resetImageUpload() {
    currentImageData = null;

    const preview = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-image-btn');
    const fileInput = document.getElementById('item-image');

    preview.innerHTML = `
        <div class="image-preview-placeholder">
            <span class="image-icon">📷</span>
            <span>Kliknij aby dodać zdjęcie</span>
        </div>
    `;
    preview.onclick = () => document.getElementById('item-image').click();

    if (removeBtn) removeBtn.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

// Open full-screen image modal
function openImageModal(imageSrc) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('image-modal-img');

    img.src = imageSrc;
    modal.classList.add('active');

    // Prevent scrolling
    document.body.style.overflow = 'hidden';
}

// Close full-screen image modal
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    modal.classList.remove('active');

    // Restore scrolling
    document.body.style.overflow = '';
}

// ============================================
// Service Worker Registration
// ============================================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
}

// ============================================
// Weather API (Open-Meteo - Free, No API Key)
// ============================================

// Default location (Rogoźno) - used as fallback
const DEFAULT_LAT = 52.7460;
const DEFAULT_LON = 16.9963;
const DEFAULT_LOCATION = 'Rogoźno';

// Current weather location
let weatherLat = DEFAULT_LAT;
let weatherLon = DEFAULT_LON;
let weatherLocation = DEFAULT_LOCATION;

// Weather code to icon and description mapping
const weatherCodes = {
    0: { icon: '☀️', desc: 'Bezchmurnie' },
    1: { icon: '🌤️', desc: 'Przeważnie bezchmurnie' },
    2: { icon: '⛅', desc: 'Częściowe zachmurzenie' },
    3: { icon: '☁️', desc: 'Pochmurno' },
    45: { icon: '🌫️', desc: 'Mgła' },
    48: { icon: '🌫️', desc: 'Szadź' },
    51: { icon: '🌧️', desc: 'Lekka mżawka' },
    53: { icon: '🌧️', desc: 'Mżawka' },
    55: { icon: '🌧️', desc: 'Gęsta mżawka' },
    61: { icon: '🌧️', desc: 'Lekki deszcz' },
    63: { icon: '🌧️', desc: 'Deszcz' },
    65: { icon: '🌧️', desc: 'Silny deszcz' },
    66: { icon: '🌨️', desc: 'Marznący deszcz' },
    67: { icon: '🌨️', desc: 'Silny marznący deszcz' },
    71: { icon: '❄️', desc: 'Lekki śnieg' },
    73: { icon: '❄️', desc: 'Śnieg' },
    75: { icon: '❄️', desc: 'Silny śnieg' },
    77: { icon: '🌨️', desc: 'Ziarna śniegu' },
    80: { icon: '🌦️', desc: 'Lekkie opady' },
    81: { icon: '🌦️', desc: 'Opady deszczu' },
    82: { icon: '⛈️', desc: 'Silne opady' },
    85: { icon: '🌨️', desc: 'Lekkie opady śniegu' },
    86: { icon: '🌨️', desc: 'Silne opady śniegu' },
    95: { icon: '⛈️', desc: 'Burza' },
    96: { icon: '⛈️', desc: 'Burza z gradem' },
    99: { icon: '⛈️', desc: 'Silna burza z gradem' }
};

function getWeatherInfo(code) {
    return weatherCodes[code] || { icon: '🌡️', desc: 'Nieznana pogoda' };
}

// Get user's location
async function getUserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.log('Geolocation not supported, using default location');
            resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON, name: DEFAULT_LOCATION });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // Try to get location name using reverse geocoding
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pl`
                    );
                    const data = await response.json();
                    const name = data.address?.city || data.address?.town || data.address?.village || 'Twoja lokalizacja';
                    resolve({ lat, lon, name });
                } catch (error) {
                    resolve({ lat, lon, name: 'Twoja lokalizacja' });
                }
            },
            (error) => {
                console.log('Geolocation error:', error.message);
                resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON, name: DEFAULT_LOCATION });
            },
            { timeout: 10000, enableHighAccuracy: false }
        );
    });
}

async function loadWeather() {
    const container = document.getElementById('weather-content');
    const header = document.querySelector('#weather-view .section-header h2');

    // Show loading state
    container.innerHTML = `
        <div class="weather-loading">
            <div class="spinner"></div>
            <p>Pobieranie lokalizacji...</p>
        </div>
    `;

    try {
        // Get user location
        const location = await getUserLocation();
        weatherLat = location.lat;
        weatherLon = location.lon;
        weatherLocation = location.name;

        // Update header with location name
        header.textContent = `🌤️ Pogoda - ${weatherLocation}`;

        container.innerHTML = `
            <div class="weather-loading">
                <div class="spinner"></div>
                <p>Ładowanie pogody...</p>
            </div>
        `;

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherLat}&longitude=${weatherLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FWarsaw&forecast_days=7`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Nie udało się pobrać pogody');
        }

        const data = await response.json();
        renderWeather(data);
        showToast('Pogoda zaktualizowana');

    } catch (error) {
        console.error('Weather fetch error:', error);
        container.innerHTML = `
            <div class="empty-state visible">
                <div class="empty-icon">⚠️</div>
                <p>Nie udało się pobrać pogody</p>
                <button class="btn-primary" onclick="loadWeather()">Spróbuj ponownie</button>
            </div>
        `;
    }
}

function renderWeather(data) {
    const container = document.getElementById('weather-content');
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    const currentWeather = getWeatherInfo(current.weather_code);

    // Get next 24 hours
    const now = new Date();
    const currentHour = now.getHours();

    // Build hourly forecast HTML
    let hourlyHtml = '';
    for (let i = 0; i < 24; i++) {
        const hourIndex = currentHour + i;
        if (hourIndex < hourly.time.length) {
            const time = new Date(hourly.time[hourIndex]);
            const temp = Math.round(hourly.temperature_2m[hourIndex]);
            const weather = getWeatherInfo(hourly.weather_code[hourIndex]);
            const timeStr = i === 0 ? 'Teraz' : time.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

            hourlyHtml += `
                <div class="weather-hour">
                    <div class="weather-hour-time">${timeStr}</div>
                    <div class="weather-hour-icon">${weather.icon}</div>
                    <div class="weather-hour-temp">${temp}°</div>
                </div>
            `;
        }
    }

    // Build daily forecast HTML
    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    let dailyHtml = '';
    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(daily.time[i]);
        const dayName = i === 0 ? 'Dziś' : (i === 1 ? 'Jutro' : dayNames[date.getDay()]);
        const weather = getWeatherInfo(daily.weather_code[i]);
        const high = Math.round(daily.temperature_2m_max[i]);
        const low = Math.round(daily.temperature_2m_min[i]);

        dailyHtml += `
            <div class="weather-day">
                <div class="weather-day-name">${dayName}</div>
                <div class="weather-day-icon">${weather.icon}</div>
                <div class="weather-day-temps">
                    <span class="weather-day-high">${high}°</span>
                    <span class="weather-day-low">${low}°</span>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <!-- Current Weather -->
        <div class="weather-current">
            <div class="weather-current-main">
                <div class="weather-icon">${currentWeather.icon}</div>
                <div class="weather-temp">${Math.round(current.temperature_2m)}°C</div>
            </div>
            <div class="weather-desc">${currentWeather.desc}</div>
            <div class="weather-details">
                <div class="weather-detail">
                    <div class="weather-detail-label">Wilgotność</div>
                    <div class="weather-detail-value">${current.relative_humidity_2m}%</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Wiatr</div>
                    <div class="weather-detail-value">${Math.round(current.wind_speed_10m)} km/h</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Odczuwalna</div>
                    <div class="weather-detail-value">${Math.round(current.temperature_2m)}°C</div>
                </div>
            </div>
        </div>

        <!-- Hourly Forecast -->
        <div class="weather-hourly">
            <h3>⏰ Prognoza godzinowa</h3>
            <div class="weather-hourly-scroll">
                ${hourlyHtml}
            </div>
        </div>

        <!-- Daily Forecast -->
        <div class="weather-daily">
            <h3>📅 Prognoza 7-dniowa</h3>
            ${dailyHtml}
        </div>
    `;
}

