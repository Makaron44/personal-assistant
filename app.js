// ============================================
// Personal Assistant - Main Application Logic
// ============================================

// Current state
let currentView = 'deadlines';
let currentModalType = null;
let editingId = null;

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
        return `
            <div class="card" data-id="${item.id}">
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

    const item = { name, location, category, notes };

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
