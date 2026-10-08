// ============ FIREBASE INITIALIZATION ============
let db = null;
let auth = null;
let firebaseReady = false;

function initializeFirebase() {
    const firebaseConfig = {
        databaseURL: "https://atlas-cafe-inventory-default-rtdb.firebaseio.com"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    db = firebase.database();
    auth = firebase.auth();
    firebaseReady = true;
    console.log('Firebase initialized successfully');
}

// Initialize Firebase when page loads
window.addEventListener('DOMContentLoaded', () => {
    // Try to initialize Firebase
    try {
        initializeFirebase();
        // Give Firebase a moment to fully initialize, then start listeners
        setTimeout(() => {
            loadCafesFromStorage(); // Load from storage first for instant UI
            loadTransactionsFromStorage();
            initializeCafesListener(); // Then sync with Firebase
            initializeTransactionsListener();
        }, 500);
    } catch (error) {
        console.warn('Firebase initialization warning:', error);
        // Fall back to localStorage
        loadCafesFromStorage();
        loadTransactionsFromStorage();
    }
});

// ============ DATA MANAGEMENT ============
function getDefaultDepts() {
    return {
        'BARISTA': {
            'Coffee/Syrup': {
                'Coffee': ['Atlas', 'Kilim', 'Argana', 'Tuareg', 'Mazagan'],
                'Milk': ['Whole', 'Skim', 'H&H', '2%', 'Oat', 'Almond', 'Soy', 'Coconut'],
                'Syrups': ['Vanilla', 'SF Vanilla', 'Hazelnut', 'SF Hazelnut', 'Caramel', 'SF Caramel', 'Wild Strawberry', 'Lavender', 'Raspberry', 'Salted Caramel']
            },
            'Cups/Containers': {
                'Plastic Cups': ['12oz', '16oz', '24oz'],
                'Paper Cups': ['8oz', '12oz', '16oz'],
                'Containers': ['2oz Container', '8oz Container', '12oz Container', '24oz Container', 'Iced Cup 16oz'],
                'Lids': ['Plastic Lids', 'Paper Lids']
            },
            'Beverages': {
                'Bottled Drinks': ['Something & Nothing', 'Saratoga', 'Olipop', 'Once Upon a Coconut', 'Essential Water', 'Evian Water'],
                'Spices/Toppings': ['All Spices', 'Garlic', 'Anise', 'Sesame Seed']
            }
        },
        'KITCHEN': {
            'Proteins': {
                'Dairy': ['Cream Cheese', 'Vegan Cream Cheese', 'Cheddar Jack', 'Feta', 'Goat', 'Fresh Mozzarella'],
                'Meats': ['Smoked Turkey', 'Grilled Chicken', 'Sausage', 'Meatball', 'Smoked Salmon', 'Tuna']
            },
            'Condiments': {
                'Dressings': ['Balsamic Vinaigrette', 'Creamy Caesar', 'Honey Dijon', 'Spicy Mustard', 'Mayo', 'Ketchup', 'Sesame Ginger', 'BBQ Sauce', 'Olive Oil'],
                'Sauces': ['Raspberry Vinaigrette', 'Pesto Sauce', 'Roasted Pepper']
            },
            'Snacks': {
                'Chips': ['Cracked Pepper', 'BBQ', 'Bee Sting', 'Cream Cheese & Chives']
            },
            'Grocery': {
                'Sweeteners': ['White Sugar', 'Brown Sugar', 'Honey'],
                'Dry Goods': ['Gluten Free Oats', 'Granola', 'Coconut'],
                'Other': ['Maple Syrup', 'Dark Chocolate', 'Peanut Butter', 'Custard']
            }
        },
        'JUICE BAR': {
            'Smoothie Ingredients': {
                'Acai': ['Acai Base', 'Pitaya Flower'],
                'Juice Base': ['Mango', 'Strawberry', 'Blueberry']
            },
            'Toppings': {
                'Fruits': ['Raspberries', 'Blueberries', 'Strawberries'],
                'Mix-ins': ['Granola', 'Coconut', 'Honey']
            }
        },
        'PREP': {
            'Paper Supplies': {
                'Cups': ['8oz Cups', '12oz Cups', 'Lids'],
                'Napkins': ['Dinner Napkins', 'Customer Napkins', 'Coffee Sleeves'],
                'Bags': ['Paper Bag', 'Shopping Bag', 'Wax Paper']
            },
            'Plastic Supplies': {
                'Cups': ['12oz Cups', '16oz Cups', '24oz Cups'],
                'Containers': ['1oz Container', '2oz Container', 'Plastic Wrapping Film'],
                'Utensils': ['Plastic Forks', 'Plastic Knives', 'Straws', 'Spoons']
            },
            'Cleaning': {
                'Supplies': ['Bleach', 'Towel', 'Mops', 'Hand Soap'],
                'Trash': ['Black Garbage Bags', 'Trash Liners']
            }
        }
    };
}

// In-memory cache for cafes
let cafesCache = {};

// Initialize cafes cache from Firebase with real-time listener
function initializeCafesListener() {
    if (!firebaseReady || !db) return;

    db.ref('cafes').on('value', snapshot => {
        if (snapshot.exists()) {
            cafesCache = snapshot.val();
            console.log('Cafes updated from Firebase:', Object.keys(cafesCache).length, 'cafés');
            // Update displays if user is logged in
            if (currentUser) {
                updateTransactionDisplays();
                if (currentUser.isAdmin) {
                    displayAdminCafes();
                } else if (currentUser.cafeName) {
                    displayDepartments();
                    updateCafeTransactions();
                }
            }
        } else {
            cafesCache = {};
        }
    }, error => {
        console.error('Error listening to cafes:', error);
        // Fall back to localStorage
        loadCafesFromStorage();
    });
}

function loadCafesFromStorage() {
    try {
        const stored = localStorage.getItem('atlas_cafes');
        cafesCache = stored ? JSON.parse(stored) : {};
        return cafesCache;
    } catch (e) {
        console.error('Error loading cafés:', e);
        return {};
    }
}

function loadCafes() {
    // Return cached data (which is kept in sync with Firebase)
    return cafesCache;
}

function saveCafes(cafes) {
    try {
        // Update local cache immediately
        cafesCache = cafes;

        // Save to localStorage as fallback
        localStorage.setItem('atlas_cafes', JSON.stringify(cafes));

        // Save to Firebase if ready
        if (firebaseReady && db) {
            db.ref('cafes').set(cafes).catch(error => {
                console.error('Error saving to Firebase:', error);
                alert('Error syncing with cloud. Using local storage.');
            });
        }
    } catch (e) {
        console.error('Error saving cafés:', e);
        alert('Error saving data. Storage may be full.');
    }
}

// In-memory cache for transactions
let transactionsCache = [];

// Initialize transactions cache from Firebase with real-time listener
function initializeTransactionsListener() {
    if (!firebaseReady || !db) return;

    db.ref('transactions').on('value', snapshot => {
        if (snapshot.exists()) {
            transactionsCache = snapshot.val();
            console.log('Transactions updated from Firebase:', transactionsCache.length, 'entries');
            // Update displays if user is logged in
            if (currentUser) {
                updateTransactionDisplays();
            }
        } else {
            transactionsCache = [];
        }
    }, error => {
        console.error('Error listening to transactions:', error);
        // Fall back to localStorage
        loadTransactionsFromStorage();
    });
}

function loadTransactionsFromStorage() {
    try {
        const stored = localStorage.getItem('atlas_transactions');
        transactionsCache = stored ? JSON.parse(stored) : [];
        return transactionsCache;
    } catch (e) {
        console.error('Error loading transactions:', e);
        return [];
    }
}

function loadTransactions() {
    // Return cached data (which is kept in sync with Firebase)
    return transactionsCache;
}

function saveTransactions(transactions) {
    try {
        // Update local cache immediately
        transactionsCache = transactions;

        // Save to localStorage as fallback
        localStorage.setItem('atlas_transactions', JSON.stringify(transactions));

        // Save to Firebase if ready
        if (firebaseReady && db) {
            db.ref('transactions').set(transactions).catch(error => {
                console.error('Error saving transactions to Firebase:', error);
            });
        }
    } catch (e) {
        console.error('Error saving transactions:', e);
    }
}

function logTransaction(cafeName, action, details, loginType = 'Staff') {
    const transactions = loadTransactions();
    const timestamp = new Date().toLocaleString();
    transactions.push({
        timestamp,
        cafeName,
        loginType,
        action,
        details
    });
    saveTransactions(transactions);
    updateTransactionDisplays();
}

function updateTransactionDisplays() {
    if (currentUser && currentUser.cafeName) {
        updateCafeTransactions();
    }
    if (currentUser && currentUser.isAdmin) {
        updateSystemTransactions();
    }
}

function updateCafeTransactions() {
    const transactions = loadTransactions().filter(t => t.cafeName === currentUser.cafeName);
    const container = document.getElementById('cafe-transactions');
    
    if (transactions.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light);">No transactions yet</div>';
        return;
    }

    container.innerHTML = transactions.reverse().map(t => `
        <div class="transaction-entry">
            <span class="transaction-time">${t.timestamp}</span>
            <span class="transaction-type">[${t.loginType}]</span>
            <span class="transaction-action">${t.action}</span>
            <div style="color: var(--text-light); margin-top: 5px; font-size: 0.85em;">${t.details}</div>
        </div>
    `).join('');
}

function updateSystemTransactions() {
    const transactions = loadTransactions();
    const container = document.getElementById('system-transactions');
    
    if (transactions.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light);">No transactions yet</div>';
        return;
    }

    container.innerHTML = transactions.reverse().slice(0, 50).map(t => `
        <div class="transaction-entry">
            <span class="transaction-time">${t.timestamp}</span>
            <span style="color: #666;">Café: ${t.cafeName}</span>
            <span class="transaction-type">[${t.loginType}]</span>
            <span class="transaction-action">${t.action}</span>
        </div>
    `).join('');
}

// ============ LOGIN SYSTEM ============
let currentUser = null;

function switchLoginTab(tab) {
    document.querySelectorAll('.login-form').forEach(f => f.style.display = 'none');
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    
    if (tab === 'admin') {
        document.getElementById('admin-login').style.display = 'block';
    } else if (tab === 'staff') {
        document.getElementById('staff-login').style.display = 'block';
    } else if (tab === 'audit') {
        document.getElementById('audit-login').style.display = 'block';
    }
    
    event.target.classList.add('active');
}

function loginAdmin() {
    const password = document.getElementById('admin-password').value;
    if (password === 'admin123') {
        // Authenticate with Firebase
        const adminEmail = 'admin@atlas-internal';
        const adminPassword = 'atlas_admin_' + password;

        auth.signInWithEmailAndPassword(adminEmail, adminPassword)
            .then(userCredential => {
                currentUser = { isAdmin: true, uid: userCredential.user.uid };
                showAdminDashboard();
                logTransaction('SYSTEM', 'Admin Login', 'Administrator logged in', 'Admin');
            })
            .catch(error => {
                // If user doesn't exist, create account
                if (error.code === 'auth/user-not-found') {
                    auth.createUserWithEmailAndPassword(adminEmail, adminPassword)
                        .then(userCredential => {
                            currentUser = { isAdmin: true, uid: userCredential.user.uid };
                            showAdminDashboard();
                            logTransaction('SYSTEM', 'Admin Login', 'Administrator logged in', 'Admin');
                        })
                        .catch(err => {
                            console.error('Auth error:', err);
                            alert('Authentication error. Please try again.');
                        });
                } else {
                    alert('Invalid admin password');
                }
            });
    } else {
        alert('Invalid admin password');
    }
}

function loginStaff() {
    const cafeName = document.getElementById('staff-cafe').value.trim();
    const password = document.getElementById('staff-password').value;

    if (!cafeName) {
        alert('Please enter café name');
        return;
    }

    const cafes = loadCafes();
    if (!cafes[cafeName]) {
        alert('Café not found');
        return;
    }

    if (cafes[cafeName].staffPassword !== password) {
        alert('Invalid password');
        return;
    }

    // Authenticate with Firebase
    const staffEmail = cafeName.toLowerCase().replace(/\s+/g, '.') + '@atlas-staff';
    const staffPasswordAuth = 'staff_' + password;

    auth.signInWithEmailAndPassword(staffEmail, staffPasswordAuth)
        .then(userCredential => {
            currentUser = {
                cafeName,
                isStaff: true,
                auditAccess: false,
                uid: userCredential.user.uid
            };
            showManagerDashboard();
            logTransaction(cafeName, 'Staff Login', 'Staff member logged in', 'Staff');
        })
        .catch(error => {
            // If user doesn't exist, create account
            if (error.code === 'auth/user-not-found') {
                auth.createUserWithEmailAndPassword(staffEmail, staffPasswordAuth)
                    .then(userCredential => {
                        currentUser = {
                            cafeName,
                            isStaff: true,
                            auditAccess: false,
                            uid: userCredential.user.uid
                        };
                        showManagerDashboard();
                        logTransaction(cafeName, 'Staff Login', 'Staff member logged in', 'Staff');
                    })
                    .catch(err => {
                        console.error('Auth error:', err);
                        alert('Authentication error. Please try again.');
                    });
            } else {
                alert('Authentication error. Please try again.');
            }
        });
}

function loginAudit() {
    const cafeName = document.getElementById('audit-cafe').value.trim();
    const password = document.getElementById('audit-password').value;

    if (!cafeName) {
        alert('Please enter café name');
        return;
    }

    const cafes = loadCafes();
    if (!cafes[cafeName]) {
        alert('Café not found');
        return;
    }

    if (cafes[cafeName].auditPassword !== password) {
        alert('Invalid audit password');
        return;
    }

    // Authenticate with Firebase
    const auditEmail = cafeName.toLowerCase().replace(/\s+/g, '.') + '@atlas-audit';
    const auditPasswordAuth = 'audit_' + password;

    auth.signInWithEmailAndPassword(auditEmail, auditPasswordAuth)
        .then(userCredential => {
            currentUser = {
                cafeName,
                isStaff: true,
                auditAccess: true,
                uid: userCredential.user.uid
            };
            showManagerDashboard();
            logTransaction(cafeName, 'Audit Manager Login', 'Audit manager logged in', 'Audit Manager');
        })
        .catch(error => {
            // If user doesn't exist, create account
            if (error.code === 'auth/user-not-found') {
                auth.createUserWithEmailAndPassword(auditEmail, auditPasswordAuth)
                    .then(userCredential => {
                        currentUser = {
                            cafeName,
                            isStaff: true,
                            auditAccess: true,
                            uid: userCredential.user.uid
                        };
                        showManagerDashboard();
                        logTransaction(cafeName, 'Audit Manager Login', 'Audit manager logged in', 'Audit Manager');
                    })
                    .catch(err => {
                        console.error('Auth error:', err);
                        alert('Authentication error. Please try again.');
                    });
            } else {
                alert('Authentication error. Please try again.');
            }
        });
}

function logout() {
    // Sign out from Firebase
    if (auth) {
        auth.signOut().then(() => {
            console.log('Signed out from Firebase');
        }).catch(error => {
            console.error('Error signing out:', error);
        });
    }

    currentUser = null;
    document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
    document.getElementById('login-stage').classList.add('active');
    document.getElementById('admin-password').value = '';
    document.getElementById('staff-cafe').value = '';
    document.getElementById('staff-password').value = '';
    document.getElementById('audit-cafe').value = '';
    document.getElementById('audit-password').value = '';
}

// ============ ADMIN DASHBOARD ============
function showAdminDashboard() {
    document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
    document.getElementById('admin-stage').classList.add('active');
    displayAdminCafes();
    updateSystemTransactions();
}

function createCafe() {
    const name = document.getElementById('new-cafe-name').value.trim();
    const staffPassword = document.getElementById('new-staff-password').value;
    const auditPassword = document.getElementById('new-audit-password').value;

    if (!name || !staffPassword || !auditPassword) {
        alert('Please fill in all fields');
        return;
    }

    const cafes = loadCafes();
    if (cafes[name]) {
        alert('Café already exists');
        return;
    }

    const defaultDepts = getDefaultDepts();
    const cafeData = {
        name,
        staffPassword,
        auditPassword,
        structure: JSON.parse(JSON.stringify(defaultDepts)),
        inventory: {}
    };

    Object.keys(defaultDepts).forEach(dept => {
        Object.keys(defaultDepts[dept]).forEach(section => {
            Object.keys(defaultDepts[dept][section]).forEach(category => {
                defaultDepts[dept][section][category].forEach(item => {
                    const itemId = `${dept}|${section}|${category}|${item}`;
                    cafeData.inventory[itemId] = {
                        name: item,
                        stock: 0,
                        minimum: 5,
                        unit: 'box',
                        image: null
                    };
                });
            });
        });
    });

    cafes[name] = cafeData;
    saveCafes(cafes);
    
    document.getElementById('new-cafe-name').value = '';
    document.getElementById('new-staff-password').value = '';
    document.getElementById('new-audit-password').value = '';
    
    displayAdminCafes();
    logTransaction(name, 'Café Created', 'New café created with default structure', 'Admin');
    alert('Café created successfully!');
}

function displayAdminCafes() {
    const cafes = loadCafes();
    const container = document.getElementById('admin-cafe-list');
    
    if (Object.keys(cafes).length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light);">No cafés yet. Create one above.</p>';
        return;
    }

    container.innerHTML = Object.keys(cafes).map(name => {
        const cafe = cafes[name];
        const itemCount = Object.keys(cafe.inventory).length;
        return `
            <div class="cafe-card">
                <h3>☕ ${name}</h3>
                <p>Items: ${itemCount}</p>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-danger btn-small" onclick="deleteCafe('${name}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteCafe(name) {
    if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
        const cafes = loadCafes();
        delete cafes[name];
        saveCafes(cafes);
        displayAdminCafes();
        logTransaction(name, 'Café Deleted', 'Café was deleted', 'Admin');
    }
}

// ============ MANAGER DASHBOARD ============
function showManagerDashboard() {
    document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
    document.getElementById('manager-stage').classList.add('active');
    document.getElementById('manager-cafe-title').textContent = currentUser.cafeName;
    
    if (currentUser.auditAccess) {
        document.getElementById('structure-tab').style.display = 'block';
        document.getElementById('manager-role-badge').textContent = '👤 Audit Manager';
    } else {
        document.getElementById('structure-tab').style.display = 'none';
        document.getElementById('manager-role-badge').textContent = '👤 Staff';
    }
    
    displayDepartments();
    updateCafeTransactions();
}

function displayDepartments() {
    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    const container = document.getElementById('dept-grid');

    container.innerHTML = Object.keys(cafe.structure).map(dept => `
        <div class="dept-card" onclick="selectDepartment('${dept}')">
            <div class="dept-name">${dept}</div>
        </div>
    `).join('');
}

function selectDepartment(deptName) {
    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    const sections = cafe.structure[deptName];

    let html = `<h2 style="margin-bottom: 20px;">${deptName}</h2>`;
    
    Object.keys(sections).forEach(section => {
        const categories = sections[section];
        html += `
            <div class="category-section">
                <div class="category-header">${section}</div>
                <div style="margin-bottom: 20px;">
        `;
        
        Object.keys(categories).forEach(category => {
            const items = categories[category];
            html += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: var(--text-dark); margin-left: 10px;">${category}</strong>
                    <div class="items-grid">
            `;
            
            items.forEach(item => {
                const itemId = `${deptName}|${section}|${category}|${item}`;
                const itemData = cafe.inventory[itemId] || {
                    name: item,
                    stock: 0,
                    minimum: 5,
                    unit: 'box',
                    image: null
                };
                
                let statusClass = 'status-ok';
                let statusText = 'OK';
                if (itemData.stock === 0) {
                    statusClass = 'status-out';
                    statusText = 'OUT';
                } else if (itemData.stock < itemData.minimum) {
                    statusClass = 'status-low';
                    statusText = 'LOW';
                }
                
                html += `
                    <div class="item-card" onclick="selectItem('${deptName}', '${section}', '${category}', '${item}')">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        <div class="item-name">${item}</div>
                        <div style="font-size: 0.8em; color: var(--text-light); margin-top: 5px;">Stock: ${itemData.stock}</div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        });
        
        html += '</div></div>';
    });

    document.getElementById('inventory-content').innerHTML = html;
    document.getElementById('dept-grid').style.display = 'none';
    document.getElementById('inventory-section').style.display = 'block';
}

function selectItem(deptName, sectionName, categoryName, itemName) {
    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    const itemId = `${deptName}|${sectionName}|${categoryName}|${itemName}`;
    const itemData = cafe.inventory[itemId] || {
        name: itemName,
        stock: 0,
        minimum: 5,
        unit: 'box',
        image: null
    };

    let statusClass = 'status-ok';
    let statusText = 'OK';
    if (itemData.stock === 0) {
        statusClass = 'status-out';
        statusText = 'OUT';
    } else if (itemData.stock < itemData.minimum) {
        statusClass = 'status-low';
        statusText = 'LOW';
    }

    let html = `
        <button class="btn btn-primary" onclick="backToDepts()" style="margin-bottom: 20px;">← Back</button>
        <div class="item-detail">
            <div class="breadcrumb">${deptName} > ${sectionName} > ${categoryName}</div>
            <div class="item-name-large">${itemName}</div>
            <span class="status-badge ${statusClass}" style="position: static; display: inline-block; margin-bottom: 20px;">${statusText}</span>
            
            ${itemData.image ? `<div class="item-image"><img src="${itemData.image}" alt="${itemName}"></div>` : ''}
            
            <div class="stock-display">${itemData.stock}</div>
            
            <div class="stock-controls">
                <input type="number" id="qty-input" class="quantity-input" value="1" min="1">
                <button class="btn btn-success" onclick="stockIn('${deptName}', '${sectionName}', '${categoryName}', '${itemName}')">📥 Stock In</button>
                <button class="btn btn-danger" onclick="stockOut('${deptName}', '${sectionName}', '${categoryName}', '${itemName}')">📤 Stock Out</button>
            </div>
    `;

    if (currentUser.auditAccess) {
        html += `
            <div style="margin-top: 30px; border-top: 2px solid #ddd; padding-top: 20px;">
                <h3 style="margin-bottom: 15px;">Audit Manager Controls</h3>
                <div class="form-group">
                    <label class="form-label">Minimum Stock Threshold</label>
                    <input type="number" id="min-input" class="form-input" value="${itemData.minimum}" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Standard Unit</label>
                    <select id="unit-input" class="form-input">
                        <option value="box" ${itemData.unit === 'box' ? 'selected' : ''}>Box</option>
                        <option value="unit" ${itemData.unit === 'unit' ? 'selected' : ''}>Unit</option>
                        <option value="case" ${itemData.unit === 'case' ? 'selected' : ''}>Case</option>
                        <option value="piece" ${itemData.unit === 'piece' ? 'selected' : ''}>Piece</option>
                        <option value="liter" ${itemData.unit === 'liter' ? 'selected' : ''}>Liter</option>
                    </select>
                </div>
                <div class="image-upload-section">
                    <label class="form-label">Upload Item Photo</label>
                    <input type="file" id="image-input" accept="image/*" onchange="previewImage()">
                    <div id="image-preview"></div>
                </div>
                <button class="btn btn-primary" onclick="updateAuditSettings('${deptName}', '${sectionName}', '${categoryName}', '${itemName}')">Save Audit Settings</button>
            </div>
        `;
    }

    html += '</div>';
    document.getElementById('inventory-content').innerHTML = html;
}

function stockIn(deptName, sectionName, categoryName, itemName) {
    const qty = parseInt(document.getElementById('qty-input').value) || 1;
    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    const itemId = `${deptName}|${sectionName}|${categoryName}|${itemName}`;
    
    if (!cafe.inventory[itemId]) {
        cafe.inventory[itemId] = {
            name: itemName,
            stock: 0,
            minimum: 5,
            unit: 'box',
            image: null
        };
    }
    
    const oldStock = cafe.inventory[itemId].stock;
    cafe.inventory[itemId].stock += qty;
    saveCafes(cafes);
    
    logTransaction(
        currentUser.cafeName,
        'Stock In',
        `${itemName}: ${oldStock} → ${cafe.inventory[itemId].stock} (+${qty})`,
        currentUser.auditAccess ? 'Audit Manager' : 'Staff'
    );
    
    selectItem(deptName, sectionName, categoryName, itemName);
}

function stockOut(deptName, sectionName, categoryName, itemName) {
    const qty = parseInt(document.getElementById('qty-input').value) || 1;
    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    const itemId = `${deptName}|${sectionName}|${categoryName}|${itemName}`;
    
    if (!cafe.inventory[itemId]) {
        cafe.inventory[itemId] = {
            name: itemName,
            stock: 0,
            minimum: 5,
            unit: 'box',
            image: null
        };
    }
    
    if (cafe.inventory[itemId].stock < qty) {
        alert('Insufficient stock');
        return;
    }
    
    const oldStock = cafe.inventory[itemId].stock;
    cafe.inventory[itemId].stock -= qty;
    saveCafes(cafes);
    
    logTransaction(
        currentUser.cafeName,
        'Stock Out',
        `${itemName}: ${oldStock} → ${cafe.inventory[itemId].stock} (-${qty})`,
        currentUser.auditAccess ? 'Audit Manager' : 'Staff'
    );
    
    selectItem(deptName, sectionName, categoryName, itemName);
}

function previewImage() {
    const input = document.getElementById('image-input');
    const preview = document.getElementById('image-preview');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 150px; max-height: 150px; margin-top: 10px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updateAuditSettings(deptName, sectionName, categoryName, itemName) {
    const minimum = parseInt(document.getElementById('min-input').value) || 5;
    const unit = document.getElementById('unit-input').value;
    const imageInput = document.getElementById('image-input');
    
    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    const itemId = `${deptName}|${sectionName}|${categoryName}|${itemName}`;
    
    if (!cafe.inventory[itemId]) {
        cafe.inventory[itemId] = {
            name: itemName,
            stock: 0,
            minimum: 5,
            unit: 'box',
            image: null
        };
    }
    
    cafe.inventory[itemId].minimum = minimum;
    cafe.inventory[itemId].unit = unit;
    
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            cafe.inventory[itemId].image = e.target.result;
            saveCafes(cafes);
            logTransaction(
                currentUser.cafeName,
                'Updated Item',
                `${itemName}: minimum=${minimum}, unit=${unit}, photo uploaded`,
                'Audit Manager'
            );
            selectItem(deptName, sectionName, categoryName, itemName);
            alert('Item updated successfully!');
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        saveCafes(cafes);
        logTransaction(
            currentUser.cafeName,
            'Updated Item',
            `${itemName}: minimum=${minimum}, unit=${unit}`,
            'Audit Manager'
        );
        selectItem(deptName, sectionName, categoryName, itemName);
        alert('Item updated successfully!');
    }
}

function backToDepts() {
    document.getElementById('inventory-section').style.display = 'none';
    document.getElementById('dept-grid').style.display = 'grid';
    displayDepartments();
}

function switchManagerTab(tab) {
    document.getElementById('inventory-tab').style.display = 'none';
    document.getElementById('structure-tab-content').style.display = 'none';
    document.getElementById('transactions-tab-content').style.display = 'none';
    
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    if (tab === 'inventory') {
        document.getElementById('inventory-tab').style.display = 'block';
        document.querySelector('[onclick="switchManagerTab(\'inventory\')"]').classList.add('active');
    } else if (tab === 'structure') {
        document.getElementById('structure-tab-content').style.display = 'block';
        document.querySelector('[onclick="switchManagerTab(\'structure\')"]').classList.add('active');
        displayStructureEditor();
    } else if (tab === 'transactions') {
        document.getElementById('transactions-tab-content').style.display = 'block';
        document.querySelector('[onclick="switchManagerTab(\'transactions\')"]').classList.add('active');
        updateCafeTransactions();
    }
}

function displayStructureEditor() {
    if (!currentUser.auditAccess) {
        alert('Only Audit Managers can edit structure');
        return;
    }

    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    const structure = cafe.structure;

    let html = '<div style="margin-bottom: 30px;"><h3 style="margin-bottom: 15px;">Manage Departments, Sections, Categories & Items</h3>';
    
    Object.keys(structure).forEach(dept => {
        html += `
            <div class="structure-editor">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4>${dept}</h4>
                    <button class="btn btn-danger btn-small" onclick="deleteDept('${dept}')">Delete Department</button>
                </div>
        `;

        Object.keys(structure[dept]).forEach(section => {
            html += `
                <div style="margin-left: 20px; margin-bottom: 15px; padding: 15px; background: var(--bg-light); border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>${section}</strong>
                        <button class="btn btn-danger btn-small" onclick="deleteSection('${dept}', '${section}')">Delete Section</button>
                    </div>
            `;

            Object.keys(structure[dept][section]).forEach(category => {
                const items = structure[dept][section][category];
                html += `
                    <div style="margin-left: 20px; margin-bottom: 10px; padding: 10px; background: white; border-left: 3px solid var(--primary); border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong>${category}</strong>
                            <button class="btn btn-danger btn-small" onclick="deleteCategory('${dept}', '${section}', '${category}')">Delete Category</button>
                        </div>
                        <div style="font-size: 0.9em; color: var(--text-light);">
                            Items: ${items.join(', ')}
                        </div>
                    </div>
                `;
            });

            html += `
                <button class="btn btn-primary btn-small" onclick="addCategory('${dept}', '${section}')" style="margin-left: 20px; margin-bottom: 10px;">+ Add Category</button>
                </div>
            `;
        });

        html += `
            <button class="btn btn-primary btn-small" onclick="addSection('${dept}')" style="margin-left: 20px; margin-bottom: 15px;">+ Add Section</button>
            </div>
        `;
    });

    html += '<button class="btn btn-primary" onclick="addDepartment()" style="margin-top: 15px;">+ Add Department</button></div>';
    
    document.getElementById('structure-editor-container').innerHTML = html;
}

function addDepartment() {
    const name = prompt('Enter new department name:');
    if (!name) return;

    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    
    if (cafe.structure[name]) {
        alert('Department already exists');
        return;
    }

    cafe.structure[name] = {};
    saveCafes(cafes);
    logTransaction(currentUser.cafeName, 'Added Department', `New department: ${name}`, 'Audit Manager');
    displayStructureEditor();
}

function addSection(dept) {
    const name = prompt('Enter new section name:');
    if (!name) return;

    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    
    if (cafe.structure[dept][name]) {
        alert('Section already exists');
        return;
    }

    cafe.structure[dept][name] = {};
    saveCafes(cafes);
    logTransaction(currentUser.cafeName, 'Added Section', `New section: ${dept} > ${name}`, 'Audit Manager');
    displayStructureEditor();
}

function addCategory(dept, section) {
    const name = prompt('Enter new category name:');
    if (!name) return;

    const cafes = loadCafes();
    const cafe = cafes[currentUser.cafeName];
    
    if (cafe.structure[dept][section][name]) {
        alert('Category already exists');
        return;
    }

    cafe.structure[dept][section][name] = [];
    saveCafes(cafes);
    logTransaction(currentUser.cafeName, 'Added Category', `New category: ${dept} > ${section} > ${name}`, 'Audit Manager');
    displayStructureEditor();
}

function deleteDept(dept) {
    if (confirm(`Delete department "${dept}"? All items will be deleted.`)) {
        const cafes = loadCafes();
        const cafe = cafes[currentUser.cafeName];
        delete cafe.structure[dept];
        saveCafes(cafes);
        logTransaction(currentUser.cafeName, 'Deleted Department', `Deleted: ${dept}`, 'Audit Manager');
        displayStructureEditor();
    }
}

function deleteSection(dept, section) {
    if (confirm(`Delete section "${section}"?`)) {
        const cafes = loadCafes();
        const cafe = cafes[currentUser.cafeName];
        delete cafe.structure[dept][section];
        saveCafes(cafes);
        logTransaction(currentUser.cafeName, 'Deleted Section', `Deleted: ${dept} > ${section}`, 'Audit Manager');
        displayStructureEditor();
    }
}

function deleteCategory(dept, section, category) {
    if (confirm(`Delete category "${category}"?`)) {
        const cafes = loadCafes();
        const cafe = cafes[currentUser.cafeName];
        delete cafe.structure[dept][section][category];
        saveCafes(cafes);
        logTransaction(currentUser.cafeName, 'Deleted Category', `Deleted: ${dept} > ${section} > ${category}`, 'Audit Manager');
        displayStructureEditor();
    }
}

function backToInventory() {
    switchManagerTab('inventory');
}
