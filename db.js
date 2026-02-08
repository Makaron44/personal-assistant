// ============================================
// Personal Assistant - IndexedDB Database
// ============================================

const DB_NAME = 'PersonalAssistantDB';
const DB_VERSION = 1;

let db = null;

// Initialize Database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open database');
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('Database opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Create Deadlines store
            if (!database.objectStoreNames.contains('deadlines')) {
                const deadlinesStore = database.createObjectStore('deadlines', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                deadlinesStore.createIndex('name', 'name', { unique: false });
                deadlinesStore.createIndex('date', 'date', { unique: false });
            }

            // Create Items store
            if (!database.objectStoreNames.contains('items')) {
                const itemsStore = database.createObjectStore('items', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                itemsStore.createIndex('name', 'name', { unique: false });
                itemsStore.createIndex('category', 'category', { unique: false });
                itemsStore.createIndex('location', 'location', { unique: false });
            }

            console.log('Database structure created');
        };
    });
}

// ============================================
// Deadlines CRUD Operations
// ============================================

function addDeadline(deadline) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['deadlines'], 'readwrite');
        const store = transaction.objectStore('deadlines');
        
        deadline.createdAt = new Date().toISOString();
        deadline.updatedAt = new Date().toISOString();
        
        const request = store.add(deadline);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function updateDeadline(deadline) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['deadlines'], 'readwrite');
        const store = transaction.objectStore('deadlines');
        
        deadline.updatedAt = new Date().toISOString();
        
        const request = store.put(deadline);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteDeadline(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['deadlines'], 'readwrite');
        const store = transaction.objectStore('deadlines');
        
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function getAllDeadlines() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['deadlines'], 'readonly');
        const store = transaction.objectStore('deadlines');
        
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getDeadlineById(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['deadlines'], 'readonly');
        const store = transaction.objectStore('deadlines');
        
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ============================================
// Items CRUD Operations
// ============================================

function addItem(item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['items'], 'readwrite');
        const store = transaction.objectStore('items');
        
        item.createdAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        
        const request = store.add(item);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function updateItem(item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['items'], 'readwrite');
        const store = transaction.objectStore('items');
        
        item.updatedAt = new Date().toISOString();
        
        const request = store.put(item);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteItem(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['items'], 'readwrite');
        const store = transaction.objectStore('items');
        
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function getAllItems() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['items'], 'readonly');
        const store = transaction.objectStore('items');
        
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getItemById(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['items'], 'readonly');
        const store = transaction.objectStore('items');
        
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function searchItemsByName(query) {
    return new Promise((resolve, reject) => {
        getAllItems()
            .then(items => {
                const filtered = items.filter(item => 
                    item.name.toLowerCase().includes(query.toLowerCase()) ||
                    item.location.toLowerCase().includes(query.toLowerCase())
                );
                resolve(filtered);
            })
            .catch(reject);
    });
}
