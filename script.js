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

        // Initialize with sample café if empty
        if (Object.keys(cafesData).length === 0) {
            console.log('Initializing with sample Pause Cafe');
            cafesData['Pause Cafe'] = {
                staffPassword: 'staff123',
                auditPassword: 'audit123',
                brandColor: '#C85A3A',
                departments: getDefaultDepartments(),
                inventory: {},
                createdDate: new Date().toISOString(),
                logo: '☕',
                backgroundImage: ''
            };
            saveAllData();
        }

        // FIX: If Pause Cafe exists but has no departments, reinitialize it
        if (cafesData['Pause Cafe']) {
            const pauseCafe = cafesData['Pause Cafe'];
            if (!pauseCafe.departments || Object.keys(pauseCafe.departments).length === 0) {
                console.log('Repairing Pause Cafe - adding default departments');
                pauseCafe.departments = getDefaultDepartments();
                pauseCafe.staffPassword = pauseCafe.staffPassword || 'staff123';
                pauseCafe.auditPassword = pauseCafe.auditPassword || 'audit123';
                pauseCafe.brandColor = pauseCafe.brandColor || '#C85A3A';
                pauseCafe.logo = pauseCafe.logo || '☕';
                pauseCafe.inventory = pauseCafe.inventory || {};
                saveAllData();
            }
        }
    } catch (e) {
        console.error('Load error:', e);
        cafesData = {
            'Pause Cafe': {
                staffPassword: 'staff123',
                auditPassword: 'audit123',
                brandColor: '#C85A3A',
                departments: getDefaultDepartments(),
                inventory: {},
                createdDate: new Date().toISOString(),
                logo: '☕',
                backgroundImage: ''
            }
        };
        transactionsData = [];
        saveAllData();
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
        const logoDisplay = cafe.logo || '☕';
        html += '<div class="card" onclick="editCafe(\'' + cafeName + '\')" style="cursor: pointer;">';
        html += '<div style="font-size: 2.5em; margin-bottom: 10px;">' + logoDisplay + '</div>';
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
        createdDate: new Date().toISOString(),
        logo: '☕',
        backgroundImage: '',
        logoFile: null
    };

    saveAllData();
    alert('Café created successfully!');
    showAdminDashboard();
    logTransaction('SYSTEM', 'Café Created', 'New café: ' + name, 'Admin');
}

function editCafe(cafeName) {
    const cafe = cafesData[cafeName];

    // Debug logging
    console.log('editCafe called for:', cafeName);
    console.log('cafe object:', cafe);
    console.log('cafe.departments:', cafe ? cafe.departments : 'cafe is undefined');

    const brandColor = cafe.brandColor || '#C85A3A';
    let html = '<button class="btn-secondary" onclick="showAdminDashboard()" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: ' + brandColor + '; margin-bottom: 20px;">' + cafeName + ' Settings</h2>';

    html += '<div class="admin-section">';
    html += '<h3>☕ Café Branding</h3>';
    html += '<div class="form-group"><label class="form-label">Café Name</label><input type="text" id="cafe-name-input" class="form-input" value="' + cafeName + '" disabled></div>';

    html += '<div class="form-group"><label class="form-label">Brand Color (Hex)</label><input type="text" id="brand-color-input" class="form-input" value="' + (cafe.brandColor || '#C85A3A') + '"></div>';

    html += '<div class="form-group"><label class="form-label">Logo/Icon Text</label><input type="text" id="cafe-logo-input" class="form-input" value="' + (cafe.logo || '☕') + '" maxlength="3"></div>';

    html += '<div class="form-group"><label class="form-label">Logo Image</label>';
    html += '<div class="image-upload-section">';
    html += '<input type="file" id="cafe-logo-file" accept="image/*" onchange="previewCafeLogo(\'' + cafeName + '\')">';
    if (cafe.logoFile) {
        html += '<div style="margin-top: 10px; font-size: 0.9em; color: #666;">✓ Logo uploaded</div>';
    }
    html += '</div></div>';

    html += '<div class="form-group"><label class="form-label">Background Image</label>';
    html += '<div class="image-upload-section">';
    html += '<input type="file" id="cafe-bg-file" accept="image/*" onchange="previewCafeBG(\'' + cafeName + '\')">';
    if (cafe.backgroundImage) {
        html += '<div style="margin-top: 10px; font-size: 0.9em; color: #666;">✓ Background uploaded</div>';
    }
    html += '</div></div>';

    html += '<button class="btn" onclick="updateCafeBrand(\'' + cafeName + '\')">Update Branding</button>';
    html += '</div>';

    html += '<div class="admin-section">';
    html += '<h3>Departments</h3>';
    html += '<button class="btn" onclick="addDepartment(\'' + cafeName + '\')">+ Add Department</button>';
    html += '<div class="grid" style="margin-top: 15px;">';

    let deptCount = 0;
    if (cafe && cafe.departments) {
        for (const deptName in cafe.departments) {
            // Skip metadata fields
            if (deptName.startsWith('_')) continue;

            deptCount++;
            const dept = cafe.departments[deptName];
            const deptIcon = dept._icon || '📁';
            const deptImage = dept._image;

            html += '<div class="card">';
            if (deptImage) {
                html += '<img src="' + deptImage + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">';
            } else {
                html += '<div style="font-size: 2.5em; text-align: center; margin-bottom: 10px;">' + deptIcon + '</div>';
            }
            html += '<div class="card-title">' + deptName + '</div>';
            html += '<button class="btn-secondary" style="width: 100%; margin-top: 10px; font-size: 0.85em;" onclick="manageDepartment(\'' + cafeName + '\', \'' + deptName + '\')">Manage</button>';
            html += '<button class="btn-secondary" style="width: 100%; margin-top: 5px; font-size: 0.85em;" onclick="editDepartmentImage(\'' + cafeName + '\', \'' + deptName + '\')">🖼️ Image</button>';
            html += '<button class="btn-danger" style="width: 100%; margin-top: 5px;" onclick="deleteDepartment(\'' + cafeName + '\', \'' + deptName + '\')">Delete</button>';
            html += '</div>';
        }
    }

    console.log('Department count:', deptCount);

    html += '</div>';
    if (deptCount === 0) {
        html += '<p style="color: #999; margin-top: 20px;">No departments yet. Click the button above to add one.</p>';
    }
    html += '</div>';

    document.getElementById('admin-content').innerHTML = html;
}

function updateCafeBrand(cafeName) {
    const color = document.getElementById('brand-color-input').value;
    const logo = document.getElementById('cafe-logo-input').value || '☕';

    cafesData[cafeName].brandColor = color;
    cafesData[cafeName].logo = logo;

    // Handle logo file upload
    const logoFile = document.getElementById('cafe-logo-file').files[0];
    if (logoFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            cafesData[cafeName].logoFile = e.target.result;
            saveAllData();
        };
        reader.readAsDataURL(logoFile);
    }

    // Handle background file upload
    const bgFile = document.getElementById('cafe-bg-file').files[0];
    if (bgFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            cafesData[cafeName].backgroundImage = e.target.result;
            saveAllData();
        };
        reader.readAsDataURL(bgFile);
    }

    saveAllData();
    alert('Branding updated!');
    editCafe(cafeName);
    logTransaction(cafeName, 'Branding Updated', 'Color: ' + color + ', Logo: ' + logo, 'Admin');
}

function previewCafeLogo(cafeName) {
    const file = document.getElementById('cafe-logo-file').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('Logo preview:', e.target.result.substring(0, 50));
        };
        reader.readAsDataURL(file);
    }
}

function previewCafeBG(cafeName) {
    const file = document.getElementById('cafe-bg-file').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('Background preview:', e.target.result.substring(0, 50));
        };
        reader.readAsDataURL(file);
    }
}

function addDepartment(cafeName) {
    const deptName = prompt('Enter department name:');
    if (!deptName) return;
    if (cafesData[cafeName].departments[deptName]) {
        alert('Department exists');
        return;
    }
    cafesData[cafeName].departments[deptName] = {
        _icon: '📁',
        _image: null
    };
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

function editDepartmentImage(cafeName, deptName) {
    const cafe = cafesData[cafeName];
    const dept = cafe.departments[deptName];
    const brandColor = cafe.brandColor || '#C85A3A';

    let html = '<button class="btn-secondary" onclick="editCafe(\'' + cafeName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: ' + brandColor + ';">Edit Department: ' + deptName + '</h2>';

    html += '<div class="admin-section">';
    html += '<h3>Department Icon</h3>';
    html += '<div class="form-group"><label class="form-label">Icon (emoji or text, max 3 chars)</label>';
    html += '<input type="text" id="dept-icon" class="form-input" value="' + (dept._icon || '📁') + '" maxlength="3"></div>';
    html += '</div>';

    html += '<div class="admin-section">';
    html += '<h3>Department Image</h3>';
    html += '<div class="image-upload-section">';
    html += '<input type="file" id="dept-image-file" accept="image/*" onchange="previewDeptImage()">';
    if (dept._image) {
        html += '<div style="margin-top: 10px;"><img src="' + dept._image + '" style="max-width: 200px; max-height: 200px; border-radius: 8px;"></div>';
        html += '<button class="btn-danger" style="margin-top: 10px; width: 100%;" onclick="removeDepartmentImage(\'' + cafeName + '\', \'' + deptName + '\')">Remove Image</button>';
    }
    html += '</div>';
    html += '</div>';

    html += '<button class="btn" style="width: 100%;" onclick="saveDepartmentImage(\'' + cafeName + '\', \'' + deptName + '\')">Save Changes</button>';

    document.getElementById('admin-content').innerHTML = html;
}

function saveDepartmentImage(cafeName, deptName) {
    const cafe = cafesData[cafeName];
    const dept = cafe.departments[deptName];

    const icon = document.getElementById('dept-icon').value || '📁';
    dept._icon = icon;

    const imageFile = document.getElementById('dept-image-file').files[0];
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            dept._image = e.target.result;
            saveAllData();
            alert('Department image saved!');
            editCafe(cafeName);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveAllData();
        alert('Department updated!');
        editCafe(cafeName);
    }
}

function removeDepartmentImage(cafeName, deptName) {
    if (confirm('Remove department image?')) {
        cafesData[cafeName].departments[deptName]._image = null;
        saveAllData();
        editDepartmentImage(cafeName, deptName);
    }
}

function previewDeptImage() {
    const file = document.getElementById('dept-image-file').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('Department image selected');
        };
        reader.readAsDataURL(file);
    }
}

function editSectionImage(cafeName, deptName, sectionName) {
    const cafe = cafesData[cafeName];
    const section = cafe.departments[deptName][sectionName];
    const brandColor = cafe.brandColor || '#C85A3A';

    let html = '<button class="btn-secondary" onclick="manageDepartment(\'' + cafeName + '\', \'' + deptName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: ' + brandColor + ';">Edit Section: ' + sectionName + '</h2>';

    html += '<div class="admin-section">';
    html += '<h3>Section Icon</h3>';
    html += '<div class="form-group"><label class="form-label">Icon (emoji or text, max 3 chars)</label>';
    html += '<input type="text" id="section-icon" class="form-input" value="' + (section._icon || '📋') + '" maxlength="3"></div>';
    html += '</div>';

    html += '<div class="admin-section">';
    html += '<h3>Section Image</h3>';
    html += '<div class="image-upload-section">';
    html += '<input type="file" id="section-image-file" accept="image/*" onchange="previewSectionImage()">';
    if (section._image) {
        html += '<div style="margin-top: 10px;"><img src="' + section._image + '" style="max-width: 200px; max-height: 200px; border-radius: 8px;"></div>';
        html += '<button class="btn-danger" style="margin-top: 10px; width: 100%;" onclick="removeSectionImage(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')">Remove Image</button>';
    }
    html += '</div>';
    html += '</div>';

    html += '<button class="btn" style="width: 100%;" onclick="saveSectionImage(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')">Save Changes</button>';

    document.getElementById('admin-content').innerHTML = html;
}

function saveSectionImage(cafeName, deptName, sectionName) {
    const section = cafesData[cafeName].departments[deptName][sectionName];

    const icon = document.getElementById('section-icon').value || '📋';
    section._icon = icon;

    const imageFile = document.getElementById('section-image-file').files[0];
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            section._image = e.target.result;
            saveAllData();
            alert('Section image saved!');
            manageDepartment(cafeName, deptName);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveAllData();
        alert('Section updated!');
        manageDepartment(cafeName, deptName);
    }
}

function removeSectionImage(cafeName, deptName, sectionName) {
    if (confirm('Remove section image?')) {
        cafesData[cafeName].departments[deptName][sectionName]._image = null;
        saveAllData();
        editSectionImage(cafeName, deptName, sectionName);
    }
}

function previewSectionImage() {
    const file = document.getElementById('section-image-file').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('Section image selected');
        };
        reader.readAsDataURL(file);
    }
}

function editItemImage(cafeName, deptName, sectionName, itemName) {
    const cafe = cafesData[cafeName];
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const item = cafe.inventory[itemId];
    const brandColor = cafe.brandColor || '#C85A3A';

    let html = '<button class="btn-secondary" onclick="manageSection(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: ' + brandColor + ';">Edit Item: ' + itemName + '</h2>';

    html += '<div class="admin-section">';
    html += '<h3>Item Icon</h3>';
    html += '<div class="form-group"><label class="form-label">Icon (emoji or text, max 3 chars)</label>';
    html += '<input type="text" id="item-icon" class="form-input" value="' + (item && item._icon ? item._icon : '📦') + '" maxlength="3"></div>';
    html += '</div>';

    html += '<div class="admin-section">';
    html += '<h3>Item Image</h3>';
    html += '<div class="image-upload-section">';
    html += '<input type="file" id="item-image-file" accept="image/*" onchange="previewItemImage()">';
    if (item && item._image) {
        html += '<div style="margin-top: 10px;"><img src="' + item._image + '" style="max-width: 200px; max-height: 200px; border-radius: 8px;"></div>';
        html += '<button class="btn-danger" style="margin-top: 10px; width: 100%;" onclick="removeItemImage(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">Remove Image</button>';
    }
    html += '</div>';
    html += '</div>';

    html += '<button class="btn" style="width: 100%;" onclick="saveItemImage(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">Save Changes</button>';

    document.getElementById('admin-content').innerHTML = html;
}

function saveItemImage(cafeName, deptName, sectionName, itemName) {
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const item = cafesData[cafeName].inventory[itemId];

    const icon = document.getElementById('item-icon').value || '📦';
    item._icon = icon;

    const imageFile = document.getElementById('item-image-file').files[0];
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            item._image = e.target.result;
            saveAllData();
            alert('Item image saved!');
            manageSection(cafeName, deptName, sectionName);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveAllData();
        alert('Item updated!');
        manageSection(cafeName, deptName, sectionName);
    }
}

function removeItemImage(cafeName, deptName, sectionName, itemName) {
    if (confirm('Remove item image?')) {
        const itemId = deptName + '|' + sectionName + '|' + itemName;
        cafesData[cafeName].inventory[itemId]._image = null;
        saveAllData();
        editItemImage(cafeName, deptName, sectionName, itemName);
    }
}

function previewItemImage() {
    const file = document.getElementById('item-image-file').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('Item image selected');
        };
        reader.readAsDataURL(file);
    }
}

function manageDepartment(cafeName, deptName) {
    const cafe = cafesData[cafeName];
    const brandColor = cafe.brandColor || '#C85A3A';
    let html = '<button class="btn-secondary" onclick="editCafe(\'' + cafeName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: ' + brandColor + ';">' + deptName + ' Sections</h2>';
    html += '<button class="btn" onclick="addSection(\'' + cafeName + '\', \'' + deptName + '\')">+ Add Section</button>';
    html += '<div class="grid" style="margin-top: 20px;">';

    const dept = cafe.departments[deptName];
    for (const sectionName in dept) {
        // Skip metadata fields
        if (sectionName.startsWith('_')) continue;

        const section = dept[sectionName];
        const sectionIcon = section._icon || '📋';
        const sectionImage = section._image;

        html += '<div class="card">';
        if (sectionImage) {
            html += '<img src="' + sectionImage + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">';
        } else {
            html += '<div style="font-size: 2.5em; text-align: center; margin-bottom: 10px;">' + sectionIcon + '</div>';
        }
        html += '<div class="card-title">' + sectionName + '</div>';
        html += '<button class="btn-secondary" style="width: 100%; margin-top: 10px; font-size: 0.85em;" onclick="manageSection(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')">Items</button>';
        html += '<button class="btn-secondary" style="width: 100%; margin-top: 5px; font-size: 0.85em;" onclick="editSectionImage(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')">🖼️ Image</button>';
        html += '<button class="btn-danger" style="width: 100%; margin-top: 5px;" onclick="deleteSection(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')">Delete</button>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('admin-content').innerHTML = html;
}

function addSection(cafeName, deptName) {
    const sectionName = prompt('Enter section name:');
    if (!sectionName) return;
    cafesData[cafeName].departments[deptName][sectionName] = {
        _icon: '📋',
        _image: null
    };
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
    const brandColor = cafe.brandColor || '#C85A3A';
    let html = '<button class="btn-secondary" onclick="manageDepartment(\'' + cafeName + '\', \'' + deptName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: ' + brandColor + ';">' + sectionName + ' Items</h2>';
    html += '<div class="form-group"><input type="text" id="new-item-name" class="form-input" placeholder="Item name"><button class="btn" onclick="addItem(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\')">+ Add Item</button></div>';
    html += '<div class="grid" style="margin-top: 20px;">';

    const section = cafe.departments[deptName][sectionName];
    for (const itemName in section) {
        // Skip metadata fields
        if (itemName.startsWith('_')) continue;

        const itemId = deptName + '|' + sectionName + '|' + itemName;
        const item = cafe.inventory[itemId];
        const itemIcon = item && item._icon ? item._icon : '📦';
        const itemImage = item && item._image ? item._image : null;

        html += '<div class="card">';
        if (itemImage) {
            html += '<img src="' + itemImage + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">';
        } else {
            html += '<div style="font-size: 2.5em; text-align: center; margin-bottom: 10px;">' + itemIcon + '</div>';
        }
        html += '<div class="card-title">' + itemName + '</div>';
        html += '<button class="btn-secondary" style="width: 100%; margin-top: 10px; font-size: 0.85em;" onclick="editItemImage(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">🖼️ Image</button>';
        html += '<button class="btn-danger" style="width: 100%; margin-top: 5px;" onclick="deleteItem(\'' + cafeName + '\', \'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')">Delete</button>';
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
        unit: 'units',
        _icon: '📦',
        _image: null
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
    const brandColor = cafe.brandColor || '#C85A3A';
    const logo = cafe.logo || '☕';

    let html = '<div style="text-align: center; margin-bottom: 20px;">';
    html += '<div style="font-size: 2em; margin-bottom: 10px;">' + logo + '</div>';
    html += '<h2 style="color: ' + brandColor + '; margin: 0 0 20px 0;">Departments</h2>';
    html += '</div>';
    html += '<div class="grid">';

    for (const deptName in cafe.departments) {
        if (deptName.startsWith('_')) continue;

        const dept = cafe.departments[deptName];
        const deptIcon = dept._icon || '📁';
        const deptImage = dept._image;

        html += '<div class="card" onclick="showStaffSections(\'' + deptName + '\')" style="cursor: pointer;">';
        if (deptImage) {
            html += '<img src="' + deptImage + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">';
        } else {
            html += '<div style="font-size: 2.5em; text-align: center; margin-bottom: 10px;">' + deptIcon + '</div>';
        }
        html += '<div class="card-title">' + deptName + '</div>';
        html += '</div>';
    }

    html += '</div>';
    html += '<h2 style="color: ' + brandColor + '; margin-top: 30px; margin-bottom: 20px;">Recent Transactions</h2>';
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
    const brandColor = cafe.brandColor || '#C85A3A';

    let html = '<button class="btn-secondary" onclick="showStaffDashboard()" style="margin-bottom: 20px;">← Back to Departments</button>';
    html += '<h2 style="color: ' + brandColor + ';">' + deptName + ' Sections</h2>';
    html += '<div class="grid">';

    for (const sectionName in dept) {
        if (sectionName.startsWith('_')) continue;

        const section = dept[sectionName];
        const sectionIcon = section._icon || '📋';
        const sectionImage = section._image;

        html += '<div class="card" onclick="showStaffItems(\'' + deptName + '\', \'' + sectionName + '\')" style="cursor: pointer;">';
        if (sectionImage) {
            html += '<img src="' + sectionImage + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">';
        } else {
            html += '<div style="font-size: 2.5em; text-align: center; margin-bottom: 10px;">' + sectionIcon + '</div>';
        }
        html += '<div class="card-title">' + sectionName + '</div>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('staff-content').innerHTML = html;
}

function showStaffItems(deptName, sectionName) {
    const cafe = cafesData[currentUser.cafeName];
    const section = cafe.departments[deptName][sectionName];
    const brandColor = cafe.brandColor || '#C85A3A';

    let html = '<button class="btn-secondary" onclick="showStaffSections(\'' + deptName + '\')" style="margin-bottom: 20px;">← Back to Sections</button>';
    html += '<h2 style="color: ' + brandColor + ';">' + sectionName + ' Items</h2>';
    html += '<div class="grid">';

    for (const itemName in section) {
        if (itemName.startsWith('_')) continue;

        const itemId = deptName + '|' + sectionName + '|' + itemName;
        const item = cafe.inventory[itemId];
        const itemIcon = item && item._icon ? item._icon : '📦';
        const itemImage = item && item._image ? item._image : null;

        html += '<div class="card" onclick="selectStaffItem(\'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')" style="cursor: pointer;">';
        if (itemImage) {
            html += '<img src="' + itemImage + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">';
        } else {
            html += '<div style="font-size: 2.5em; text-align: center; margin-bottom: 10px;">' + itemIcon + '</div>';
        }
        html += '<div class="card-title">' + itemName + '</div>';
        html += '<div class="card-subtitle">Stock: ' + (item ? formatStock(item) : '0') + '</div>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('staff-content').innerHTML = html;
}

function selectStaffItem(deptName, sectionName, itemName) {
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const cafe = cafesData[currentUser.cafeName];
    const item = cafe.inventory[itemId];
    const brandColor = cafe.brandColor || '#C85A3A';

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
    const brandColor = cafe.brandColor || '#C85A3A';
    const logo = cafe.logo || '☕';

    let html = '<div style="text-align: center; margin-bottom: 20px;">';
    html += '<div style="font-size: 2em; margin-bottom: 10px;">' + logo + '</div>';
    html += '<h2 style="color: ' + brandColor + '; margin: 0 0 20px 0;">Departments</h2>';
    html += '</div>';
    html += '<div class="grid">';

    for (const deptName in cafe.departments) {
        if (deptName.startsWith('_')) continue;

        const dept = cafe.departments[deptName];
        const deptIcon = dept._icon || '📁';
        const deptImage = dept._image;

        html += '<div class="card" onclick="showAuditSections(\'' + deptName + '\')" style="cursor: pointer;">';
        if (deptImage) {
            html += '<img src="' + deptImage + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">';
        } else {
            html += '<div style="font-size: 2.5em; text-align: center; margin-bottom: 10px;">' + deptIcon + '</div>';
        }
        html += '<div class="card-title">' + deptName + '</div>';
        html += '</div>';
    }

    html += '</div>';
    html += '<h2 style="color: ' + brandColor + '; margin-top: 30px; margin-bottom: 20px;">Transaction Log</h2>';
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
    const brandColor = cafe.brandColor || '#C85A3A';
    let html = '<button class="btn-secondary" onclick="showAuditDashboard()" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: ' + brandColor + ';">' + deptName + ' Sections</h2>';
    html += '<div class="grid">';

    for (const sectionName in cafe.departments[deptName]) {
        if (sectionName.startsWith('_')) continue;

        const section = cafe.departments[deptName][sectionName];
        const sectionIcon = section._icon || '📋';
        const sectionImage = section._image;

        html += '<div class="card" onclick="showAuditItems(\'' + deptName + '\', \'' + sectionName + '\')" style="cursor: pointer;">';
        if (sectionImage) {
            html += '<img src="' + sectionImage + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">';
        } else {
            html += '<div style="font-size: 2.5em; text-align: center; margin-bottom: 10px;">' + sectionIcon + '</div>';
        }
        html += '<div class="card-title">' + sectionName + '</div>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('audit-content').innerHTML = html;
}

function showAuditItems(deptName, sectionName) {
    const cafe = cafesData[currentUser.cafeName];
    const brandColor = cafe.brandColor || '#C85A3A';
    let html = '<button class="btn-secondary" onclick="showAuditSections(\'' + deptName + '\')" style="margin-bottom: 20px;">← Back</button>';
    html += '<h2 style="color: ' + brandColor + ';">' + sectionName + ' Inventory</h2>';
    html += '<div class="grid">';

    for (const itemName in cafe.departments[deptName][sectionName]) {
        if (itemName.startsWith('_')) continue;

        const itemId = deptName + '|' + sectionName + '|' + itemName;
        const item = cafe.inventory[itemId];
        const itemIcon = item && item._icon ? item._icon : '📦';
        const itemImage = item && item._image ? item._image : null;

        html += '<div class="card" onclick="selectAuditItem(\'' + deptName + '\', \'' + sectionName + '\', \'' + itemName + '\')" style="cursor: pointer;">';
        if (itemImage) {
            html += '<img src="' + itemImage + '" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">';
        } else {
            html += '<div style="font-size: 2.5em; text-align: center; margin-bottom: 10px;">' + itemIcon + '</div>';
        }
        html += '<div class="card-title">' + itemName + '</div>';
        html += '<div class="card-subtitle">Stock: ' + (item ? formatStock(item) : '0') + '</div>';
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('audit-content').innerHTML = html;
}

function selectAuditItem(deptName, sectionName, itemName) {
    const itemId = deptName + '|' + sectionName + '|' + itemName;
    const cafe = cafesData[currentUser.cafeName];
    const item = cafe.inventory[itemId];
    const brandColor = cafe.brandColor || '#C85A3A';

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
    html += '<h3 style="color: ' + brandColor + ';">Audit Settings</h3>';
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
