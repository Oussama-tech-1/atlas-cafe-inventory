// ============ FIREBASE INITIALIZATION ============
let db = null;
let firebaseReady = false;

function initializeFirebase() {
    const firebaseConfig = {
        databaseURL: "https://atlas-cafe-inventory-default-rtdb.firebaseio.com"
    };
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    firebaseReady = true;
    console.log('Firebase initialized');
}

window.addEventListener('DOMContentLoaded', () => {
    try {
        initializeFirebase();
        setTimeout(() => {
            loadAllData();
            initializeListeners();
        }, 500);
    } catch (error) {
        console.warn('Firebase warning:', error);
        loadAllData();
    }
});

// ============ DATA STORAGE ============
let cafesData = {};
let transactionsData = [];
let currentUser = null;

function loadAllData() {
    try {
        const stored = localStorage.getItem('atlas_cafes') || '{}';
        cafesData = JSON.parse(stored);
        const txStored = localStorage.getItem('atlas_transactions') || '[]';
        transactionsData = JSON.parse(txStored);
    } catch (e) {
        console.error('Load error:', e);
        cafesData = {};
        transactionsData = [];
    }
}

function saveAllData() {
    try {
        localStorage.setItem('atlas_cafes', JSON.stringify(cafesData));
        localStorage.setItem('atlas_transactions', JSON.stringify(transactionsData));
        if (firebaseReady && db) {
            db.ref('cafes').set(cafesData);
            db.ref('transactions').set(transactionsData);
        }
    } catch (e) {
        console.error('Save error:', e);
    }
}

function initializeListeners() {
    if (!firebaseReady || !db) return;
    db.ref('cafes').on('value', snapshot => {
        if (snapshot.exists()) {
            cafesData = snapshot.val();
            if (currentUser) updateDisplay();
        }
    });
    db.ref('transactions').on('value', snapshot => {
        if (snapshot.exists()) {
            transactionsData = snapshot.val() || [];
            if (currentUser) updateDisplay();
        }
    });
}

function logTransaction(cafeName, action, details, userRole) {
    const transaction = {
        cafe: cafeName,
        action,
        details,
        role: userRole,
        timestamp: new Date().toLocaleString(),
        date: new Date().toISOString()
    };
    transactionsData.push(transaction);
    saveAllData();
}

// ============ LOGIN ============
function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(f => f.style.display = 'none');
    event.target.classList.add('active');
    document.getElementById(tab + '-login').style.display = 'block';
}

function loginAdmin() {
    const password = document.getElementById('admin-password').value;
    if (password === 'admin123') {
        currentUser = { isAdmin: true };
        document.getElementById('login-stage').classList.remove('active');
        document.getElementById('admin-stage').classList.add('active');
        showAdminDashboard();
        logTransaction('SYSTEM', 'Admin Login', 'Administrator logged in', 'Admin');
    } else {
        alert('Invalid password');
    }
}

function loginStaff() {
    const cafeName = document.getElementById('staff-cafe').value.trim();
    const password = document.getElementById('staff-password').value;
    if (!cafeName || !cafesData[cafeName]) {
        alert('Café not found');
        return;
    }
    if (cafesData[cafeName].staffPassword !== password) {
        alert('Invalid password');
        return;
    }
    currentUser = { cafeName, isStaff: true };
    document.getElementById('login-stage').classList.remove('active');
    document.getElementById('staff-stage').classList.add('active');
    document.getElementById('staff-cafe-name').textContent = cafeName;
    showStaffDashboard();
    logTransaction(cafeName, 'Staff Login', 'Staff logged in', 'Staff');
}

function loginAudit() {
    const cafeName = document.getElementById('audit-cafe').value.trim();
    const password = document.getElementById('audit-password').value;
    if (!cafeName || !cafesData[cafeName]) {
        alert('Café not found');
        return;
    }
    if (cafesData[cafeName].auditPassword !== password) {
        alert('Invalid password');
        return;
    }
    currentUser = { cafeName, isAudit: true };
    document.getElementById('login-stage').classList.remove('active');
    document.getElementById('audit-stage').classList.add('active');
    document.getElementById('audit-cafe-name').textContent = cafeName;
    showAuditDashboard();
    logTransaction(cafeName, 'Audit Login', 'Audit manager logged in', 'Audit Manager');
}

function logout() {
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
    let html = '<h2 style="color: #C85A3A; margin-bottom: 20px;">Manage Cafés</h2>';

    html += '<div class="admin-section">';
    html += '<h3>Create New Café</h3>';
    html += '<div class="form-group"><label class="form-label">Café Name</label><input type="text" id="new-cafe-name" class="form-input" placeholder="e.g., Pause Cafe"></div>';
    html += '<div class="form-group"><label class="form-label">Staff Password</label><input type="password" id="new-staff-password" class="form-input"></div>';
    html += '<div class="form-group"><label class="form-label">Audit Password</label><input type="password" id="new-audit-password" class="form-input"></div>';
    html += '<div class="form-group"><label class="form-label">Brand Color (Hex)</label><input type="text" id="new-brand-color" class="form-input" placeholder="#C85A3A" value="#C85A3A"></div>';
    html += '<button class="btn" onclick="createNewCafe()">Create Café</button>';
    html += '</div>';

    html += '<h2 style="color: #C85A3A; margin: 30px 0 20px 0;">Existing Cafés</h2>';
    html += '<div class="grid">';

    for (const cafeName in cafesData) {
        const cafe = cafesData[cafeName];
        html += '<div class="card" onclick="editCafe(\'' + cafeName + '\')">';
        html += '<div style="font-size: 2em; margin-bottom: 10px;">☕</div>';
        html += '<div class="card-title">' + cafeName + '</div>';
        html += '<div class="card-subtitle">Click to manage</div>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('admin-content').innerHTML = html;
}

function createNewCafe() {
    const name = document.getElementById('new-cafe-name').value.trim();
    const staffPwd = document.getElementById('new-staff-password').value;
    const auditPwd = document.getElementById('new-audit-password').value;
    const color = document.getElementById('new-brand-color').value;

    if (!name || !staffPwd || !auditPwd) {
        alert('Please fill all fields');
        return;
    }

    if (cafesData[name]) {
        alert('Café already exists');
        return;
    }

    // Create cafe with default structure
    cafesData[name] = {
        staffPassword: staffPwd,
        auditPassword: auditPwd,
        brandColor: color || '#C85A3A',
        departments: getDefaultDepartments(),
        inventory: {},
        createdDate: new Date().toISOString()
    };

    saveAllData();
    alert('Café created successfully!');
    showAdminDashboard();
    logTransaction('SYSTEM', 'Café Created', 'New café: ' + name, 'Admin');
}

function editCafe(cafeName) {
    const cafe = cafesData[cafeName];
    let html = '<button class="btn-secondary" onclick="showAdminDashboard()" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: #C85A3A; margin-bottom: 20px;">' + cafeName + ' Settings</h2>';

    html += '<div class="admin-section">';
    html += '<h3>Brand Customization</h3>';
    html += '<div class="form-group"><label class="form-label">Brand Color</label><input type="text" id="brand-color-input" class="form-input" value="' + (cafe.brandColor || '#C85A3A') + '"></div>';
    html += '<button class="btn" onclick="updateCafeBrand(\'' + cafeName + '\')">Update Brand</button>';
    html += '</div>';

    html += '<div class="admin-section">';
    html += '<h3>Departments</h3>';
    html += '<button class="btn" onclick="addDepartment(\'' + cafeName + '\')">+ Add Department</button>';
    html += '<div class="grid" style="margin-top: 15px;">';

    for (const deptName in cafe.departments) {
        html += '<div class="card">';
        html += '<div style="font-size: 2em;">📁</div>';
        html += '<div class="card-title">' + deptName + '</div>';
        html += '<button class="btn-secondary" style="width: 100%; margin-top: 10px;" onclick="manageDepartment(\'' + cafeName + '\', \'' + deptName + '\')">Manage</button>';
        html += '<button class="btn-danger" style="width: 100%; margin-top: 5px;" onclick="deleteDepartment(\'' + cafeName + '\', \'' + deptName + '\')">Delete</button>';
        html += '</div>';
    }

    html += '</div>';
    html += '</div>';

    document.getElementById('admin-content').innerHTML = html;
}

function updateCafeBrand(cafeName) {
    const color = document.getElementById('brand-color-input').value;
    cafesData[cafeName].brandColor = color;
    saveAllData();
    alert('Brand updated!');
    editCafe(cafeName);
    logTransaction(cafeName, 'Brand Updated', 'New color: ' + color, 'Admin');
}

function addDepartment(cafeName) {
    const deptName = prompt('Enter department name:');
    if (!deptName) return;
    if (cafesData[cafeName].departments[deptName]) {
        alert('Department exists');
        return;
    }
    cafesData[cafeName].departments[deptName] = {};
    saveAllData();
    editCafe(cafeName);
    logTransaction(cafeName, 'Department Added', deptName, 'Admin');
}

function deleteDepartment(cafeName, deptName) {
    if (confirm('Delete department: ' + deptName + '?')) {
        delete cafesData[cafeName].departments[deptName];
        saveAllData();
        editCafe(cafeName);
        logTransaction(cafeName, 'Department Deleted', deptName, 'Admin');
    }
}

function manageDepartment(cafeName, deptName) {
    const cafe = cafesData[cafeName];
    let html = '<button class="btn-secondary" onclick="editCafe(\'' + cafeName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: #C85A3A;">' + deptName + ' Sections</h2>';
    html += '<button class="btn" onclick="addSection(\'' + cafeName + '\', \'' + deptName + '\')">+ Add Section</button>';
    html += '<div class="grid" style="margin-top: 20px;">';

    const dept = cafe.departments[deptName];
    for (const sectionName in dept) {
        html += '<div class="card">';
        html += '<div style="font-size: 2em;">📋</div>';
        html += '<div class="card-title">' + sectionName + '</div>';
        html += '<button class="btn-secondary" style="width: 100%; margin-top: 10px;" onclick="manageSection(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')">Items</button>';
        html += '<button class="btn-danger" style="width: 100%; margin-top: 5px;" onclick="deleteSection(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')">Delete</button>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('admin-content').innerHTML = html;
}

function addSection(cafeName, deptName) {
    const sectionName = prompt('Enter section name:');
    if (!sectionName) return;
    cafesData[cafeName].departments[deptName][sectionName] = {};
    saveAllData();
    manageDepartment(cafeName, deptName);
    logTransaction(cafeName, 'Section Added', deptName + ' > ' + sectionName, 'Admin');
}

function deleteSection(cafeName, deptName, sectionName) {
    if (confirm('Delete section: ' + sectionName + '?')) {
        delete cafesData[cafeName].departments[deptName][sectionName];
        saveAllData();
        manageDepartment(cafeName, deptName);
        logTransaction(cafeName, 'Section Deleted', deptName + ' > ' + sectionName, 'Admin');
    }
}

function manageSection(cafeName, deptName, sectionName) {
    const cafe = cafesData[cafeName];
    let html = '<button class="btn-secondary" onclick="manageDepartment(\'' + cafeName + '\', \'' + deptName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: #C85A3A;">' + sectionName + ' Items</h2>';
    html += '<div class="form-group"><input type="text" id="new-item-name" class="form-input" placeholder="Item name"><button class="btn" onclick="addItem(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')">+ Add Item</button></div>';
    html += '<div class="grid" style="margin-top: 20px;">';

    const section = cafe.departments[deptName][sectionName];
    for (const itemName in section) {
        html += '<div class="card">';
        html += '<div style="font-size: 2em;">📦</div>';
        html += '<div class="card-title">' + itemName + '</div>';
        html += '<button class="btn-danger" style="width: 100%; margin-top: 10px;" onclick="deleteItem(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">Delete</button>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('admin-content').innerHTML = html;
}

function addItem(cafeName, deptName, sectionName) {
    const itemName = document.getElementById('new-item-name').value.trim();
    if (!itemName) return;

    const itemId = deptName + '|' + sectionName + '|' + itemName;
    cafesData[cafeName].inventory[itemId] = {
        name: itemName,
        stock: 0,
        minimum: 5,
        unitsPerBox: 1,
        unit: 'units'
    };
    cafesData[cafeName].departments[deptName][sectionName][itemName] = true;

    saveAllData();
    manageSection(cafeName, deptName, sectionName);
    logTransaction(cafeName, 'Item Added', deptName + ' > ' + sectionName + ' > ' + itemName, 'Admin');
}

function deleteItem(cafeName, deptName, sectionName, itemName) {
    if (confirm('Delete item: ' + itemName + '?')) {
        const itemId = deptName + '|' + sectionName + '|' + itemName;
        delete cafesData[cafeName].inventory[itemId];
        delete cafesData[cafeName].departments[deptName][sectionName][itemName];
        saveAllData();
        manageSection(cafeName, deptName, sectionName);
        logTransaction(cafeName, 'Item Deleted', deptName + ' > ' + sectionName + ' > ' + itemName, 'Admin');
    }
}

// ============ STAFF DASHBOARD ============
function showStaffDashboard() {
    const cafe = cafesData[currentUser.cafeName];
    let html = '<h2 style="color: #C85A3A; margin-bottom: 20px;">Departments</h2>';
    html += '<div class="grid">';

    for (const deptName in cafe.departments) {
        html += '<div class="card" onclick="showStaffSections(\'' + deptName + '\')">';
        html += '<div style="font-size: 2.5em;">📁</div>';
        html += '<div class="card-title">' + deptName + '</div>';
        html += '</div>';
    }

    html += '</div>';
    html += '<h2 style="color: #C85A3A; margin-top: 30px; margin-bottom: 20px;">Recent Transactions</h2>';
    html += '<div class="transaction-log">';

    const cafeTxs = transactionsData.filter(t => t.cafe === currentUser.cafeName).slice(-10).reverse();
    for (const tx of cafeTxs) {
        html += '<div class="transaction-item"><span class="transaction-time">' + tx.timestamp + '</span><br>';
        html += '<span class="transaction-user">' + tx.role + ':</span> ' + tx.action + ' - ' + tx.details + '</div>';
    }

    html += '</div>';
    document.getElementById('staff-content').innerHTML = html;
}

function showStaffSections(deptName) {
    const cafe = cafesData[currentUser.cafeName];
    const dept = cafe.departments[deptName];

    let html = '<button class="btn-secondary" onclick="showStaffDashboard()" style="margin-bottom: 20px;">← Back to Departments</button>';
    html += '<h2 style="color: #C85A3A;">' + deptName + ' Sections</h2>';
    html += '<div class="grid">';

    for (const sectionName in dept) {
        html += '<div class="card" onclick="showStaffItems(\'' + deptName + '\', \'' + sectionName + '\')">';
        html += '<div style="font-size: 2.5em;">📋</div>';
        html += '<div class="card-title">' + sectionName + '</div>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('staff-content').innerHTML = html;
}

function showStaffItems(deptName, sectionName) {
    const cafe = cafesData[currentUser.cafeName];
    const section = cafe.departments[deptName][sectionName];

    let html = '<button class="btn-secondary" onclick="showStaffSections(\'' + deptName + '\')" style="margin-bottom: 20px;">← Back to Sections</button>';
    html += '<h2 style="color: #C85A3A;">' + sectionName + ' Items</h2>';
    html += '<div class="grid">';

    for (const itemName in section) {
        const itemId = deptName + '|' + sectionName + '|' + itemName;
        const item = cafe.inventory[itemId];
        html += '<div class="card" onclick="selectStaffItem(\'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">';
        html += '<div style="font-size: 2.5em;">📦</div>';
        html += '<div class="card-title">' + itemName + '</div>';
        html += '<div class="card-subtitle">Stock: ' + (item ? formatStock(item) : '0') + '</div>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('staff-content').innerHTML = html;
}

function selectStaffItem(deptName, sectionName, itemName) {
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const item = cafesData[currentUser.cafeName].inventory[itemId];

    let html = '<button class="btn-secondary" onclick="showStaffItems(\'' + deptName + '\', \'' + sectionName + '\')" style="margin-bottom: 20px;">← Back to Items</button>';
    html += '<div class="item-detail">';
    html += '<h2>' + itemName + '</h2>';
    html += '<div class="stock-display">' + formatStock(item) + '</div>';
    html += '<div style="margin: 20px 0;">';
    html += '<div class="form-group"><label class="form-label">Quantity (units)</label><input type="number" id="qty-input" class="form-input" value="1" min="1"></div>';
    html += '<div class="action-buttons">';
    html += '<button class="btn-success" onclick="staffStockIn(\'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">📥 Stock In</button>';
    html += '<button class="btn-danger" onclick="staffStockOut(\'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">📤 Stock Out</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    document.getElementById('staff-content').innerHTML = html;
}

function staffStockIn(deptName, sectionName, itemName) {
    const qty = parseInt(document.getElementById('qty-input').value) || 1;
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const cafe = cafesData[currentUser.cafeName];

    if (!cafe.inventory[itemId]) {
        cafe.inventory[itemId] = { stock: 0, minimum: 5, unitsPerBox: 1 };
    }

    const oldStock = cafe.inventory[itemId].stock;
    cafe.inventory[itemId].stock += qty;
    saveAllData();

    logTransaction(currentUser.cafeName, 'Stock In', itemName + ': ' + oldStock + ' → ' + cafe.inventory[itemId].stock + ' (+' + qty + ')', 'Staff');
    selectStaffItem(deptName, sectionName, itemName);
}

function staffStockOut(deptName, sectionName, itemName) {
    const qty = parseInt(document.getElementById('qty-input').value) || 1;
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const cafe = cafesData[currentUser.cafeName];

    if (!cafe.inventory[itemId]) {
        alert('Item not found');
        return;
    }

    if (cafe.inventory[itemId].stock < qty) {
        alert('Insufficient stock');
        return;
    }

    const oldStock = cafe.inventory[itemId].stock;
    cafe.inventory[itemId].stock -= qty;
    saveAllData();

    logTransaction(currentUser.cafeName, 'Stock Out', itemName + ': ' + oldStock + ' → ' + cafe.inventory[itemId].stock + ' (-' + qty + ')', 'Staff');
    selectStaffItem(deptName, sectionName, itemName);
}

// ============ AUDIT DASHBOARD ============
function showAuditDashboard() {
    const cafe = cafesData[currentUser.cafeName];
    let html = '<h2 style="color: #C85A3A; margin-bottom: 20px;">Departments</h2>';
    html += '<div class="grid">';

    for (const deptName in cafe.departments) {
        html += '<div class="card" onclick="showAuditSections(\'' + deptName + '\')">';
        html += '<div style="font-size: 2.5em;">📁</div>';
        html += '<div class="card-title">' + deptName + '</div>';
        html += '</div>';
    }

    html += '</div>';
    html += '<h2 style="color: #C85A3A; margin-top: 30px; margin-bottom: 20px;">Transaction Log</h2>';
    html += '<div class="transaction-log">';

    const cafeTxs = transactionsData.filter(t => t.cafe === currentUser.cafeName).slice(-20).reverse();
    for (const tx of cafeTxs) {
        html += '<div class="transaction-item"><span class="transaction-time">' + tx.timestamp + '</span><br>';
        html += '<span class="transaction-user">[' + tx.role + ']</span> ' + tx.action + ': ' + tx.details + '</div>';
    }

    html += '</div>';
    document.getElementById('audit-content').innerHTML = html;
}

function showAuditSections(deptName) {
    const cafe = cafesData[currentUser.cafeName];
    let html = '<button class="btn-secondary" onclick="showAuditDashboard()" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: #C85A3A;">' + deptName + ' Sections</h2>';
    html += '<div class="grid">';

    for (const sectionName in cafe.departments[deptName]) {
        html += '<div class="card" onclick="showAuditItems(\'' + deptName + '\', \'' + sectionName + '\')">';
        html += '<div style="font-size: 2.5em;">📋</div>';
        html += '<div class="card-title">' + sectionName + '</div>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('audit-content').innerHTML = html;
}

function showAuditItems(deptName, sectionName) {
    const cafe = cafesData[currentUser.cafeName];
    let html = '<button class="btn-secondary" onclick="showAuditSections(\'' + deptName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: #C85A3A;">' + sectionName + ' Inventory</h2>';
    html += '<div class="grid">';

    for (const itemName in cafe.departments[deptName][sectionName]) {
        const itemId = deptName + '|' + sectionName + '|' + itemName;
        const item = cafe.inventory[itemId];
        html += '<div class="card" onclick="selectAuditItem(\'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">';
        html += '<div style="font-size: 2.5em;">📦</div>';
        html += '<div class="card-title">' + itemName + '</div>';
        html += '<div class="card-subtitle">Stock: ' + (item ? formatStock(item) : '0') + '</div>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('audit-content').innerHTML = html;
}

function selectAuditItem(deptName, sectionName, itemName) {
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const item = cafesData[currentUser.cafeName].inventory[itemId];

    let html = '<button class="btn-secondary" onclick="showAuditItems(\'' + deptName + '\', \'' + sectionName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<div class="item-detail">';
    html += '<h2>' + itemName + '</h2>';
    html += '<div class="stock-display">' + formatStock(item) + '</div>';
    html += '<div style="margin: 20px 0;">';
    html += '<div class="form-group"><label class="form-label">Quantity (units)</label><input type="number" id="qty-input" class="form-input" value="1" min="1"></div>';
    html += '<div class="action-buttons">';
    html += '<button class="btn-success" onclick="auditStockIn(\'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">📥 Stock In</button>';
    html += '<button class="btn-danger" onclick="auditStockOut(\'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">📤 Stock Out</button>';
    html += '</div>';
    html += '<div style="margin-top: 25px; border-top: 2px solid #ddd; padding-top: 20px;">';
    html += '<h3 style="color: #C85A3A;">Audit Settings</h3>';
    html += '<div class="form-group"><label class="form-label">Minimum Stock</label><input type="number" id="min-input" class="form-input" value="' + (item ? item.minimum : 5) + '"></div>';
    html += '<div class="form-group"><label class="form-label">Units Per Box</label><input type="number" id="units-per-box" class="form-input" value="' + (item ? item.unitsPerBox : 1) + '" min="1"></div>';
    html += '<button class="btn" onclick="saveAuditSettings(\'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">Save Settings</button>';
    html += '</div>';
    html += '</div>';
    document.getElementById('audit-content').innerHTML = html;
}

function auditStockIn(deptName, sectionName, itemName) {
    const qty = parseInt(document.getElementById('qty-input').value) || 1;
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const cafe = cafesData[currentUser.cafeName];

    if (!cafe.inventory[itemId]) {
        cafe.inventory[itemId] = { stock: 0, minimum: 5, unitsPerBox: 1 };
    }

    const oldStock = cafe.inventory[itemId].stock;
    cafe.inventory[itemId].stock += qty;
    saveAllData();

    logTransaction(currentUser.cafeName, 'Stock In', itemName + ': ' + oldStock + ' → ' + cafe.inventory[itemId].stock + ' (+' + qty + ')', 'Audit Manager');
    selectAuditItem(deptName, sectionName, itemName);
}

function auditStockOut(deptName, sectionName, itemName) {
    const qty = parseInt(document.getElementById('qty-input').value) || 1;
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const cafe = cafesData[currentUser.cafeName];

    if (!cafe.inventory[itemId] || cafe.inventory[itemId].stock < qty) {
        alert('Insufficient stock');
        return;
    }

    const oldStock = cafe.inventory[itemId].stock;
    cafe.inventory[itemId].stock -= qty;
    saveAllData();

    logTransaction(currentUser.cafeName, 'Stock Out', itemName + ': ' + oldStock + ' → ' + cafe.inventory[itemId].stock + ' (-' + qty + ')', 'Audit Manager');
    selectAuditItem(deptName, sectionName, itemName);
}

function saveAuditSettings(deptName, sectionName, itemName) {
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const cafe = cafesData[currentUser.cafeName];

    cafe.inventory[itemId].minimum = parseInt(document.getElementById('min-input').value) || 5;
    cafe.inventory[itemId].unitsPerBox = parseInt(document.getElementById('units-per-box').value) || 1;

    saveAllData();
    alert('Settings saved!');
    selectAuditItem(deptName, sectionName, itemName);
    logTransaction(currentUser.cafeName, 'Settings Updated', itemName, 'Audit Manager');
}

// ============ UTILITIES ============
function formatStock(item) {
    if (!item) return '0 units';
    const stock = item.stock || 0;
    const unitsPerBox = item.unitsPerBox || 1;
    const boxes = Math.floor(stock / unitsPerBox);
    const units = stock % unitsPerBox;

    if (unitsPerBox === 1) return stock + ' units';
    if (units === 0) return stock + ' units (' + boxes + ' boxes)';
    return stock + ' units (' + boxes + ' boxes + ' + units + ' units)';
}

function getDefaultDepartments() {
    return {
        'BARISTA': {
            'Coffee/Syrup': {
                'Coffee': true,
                'Milk': true,
                'Syrups': true
            },
            'Cups/Containers': {
                'Plastic Cups': true,
                'Paper Cups': true
            }
        },
        'KITCHEN': {
            'Proteins': {
                'Dairy': true,
                'Meats': true
            },
            'Condiments': {
                'Dressings': true,
                'Sauces': true
            }
        },
        'JUICE BAR': {
            'Smoothie Ingredients': {
                'Acai': true,
                'Juice Base': true
            }
        },
        'PREP': {
            'Paper Supplies': {
                'Cups': true,
                'Napkins': true
            },
            'Plastic Supplies': {
                'Cups': true,
                'Containers': true
            }
        }
    };
}

function updateDisplay() {
    if (currentUser.isAdmin) showAdminDashboard();
    else if (currentUser.isStaff) showStaffDashboard();
    else if (currentUser.isAudit) showAuditDashboard();
}
