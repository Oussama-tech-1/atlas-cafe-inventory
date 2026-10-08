# ATLAS - Café Inventory Management System

A complete, web-based inventory management solution for multi-café operations with role-based access control, transaction logging, and GitHub Pages hosting.

## Features

- **Three-Tier Access System**
  - **Admin**: Create and manage cafés, configure audit passwords
  - **Café Manager**: Daily stock in/out operations, no name tracking required
  - **Audit Manager**: Set minimum stock thresholds, standard units, upload item photos

- **Inventory Hierarchy**
  - Café → Department → Section → Category → Item
  - Default structure: Barista, Kitchen, Bakery, Juice Bar departments

- **Real Photo Support**
  - Upload actual photos of items instead of emojis
  - Base64 encoding for localStorage compatibility
  - Max dimensions: 300px × 300px

- **Smart Stock Alerts**
  - **OK**: Stock above minimum threshold (green badge)
  - **LOW**: Stock below minimum (yellow badge)
  - **OUT**: Stock at 0 (red badge)

- **Complete Audit Trail**
  - Transaction logging for all changes per café
  - Timestamp, user action, and details tracked
  - Exportable audit history

## Quick Start

### For Users

1. Open `index.html` in your web browser
2. **First Time Admin Setup**:
   - Click "Admin Login"
   - Create your first café (e.g., "Downtown Café")
   - Set an Audit Manager password
3. **Café Manager Login**:
   - Select café name
   - Perform Stock In/Out operations
4. **Audit Manager Login**:
   - Use the password you set
   - Upload item photos
   - Set minimum stock levels
   - Configure standard units

### Data Storage

All data is stored locally in your browser's localStorage:
- `atlas_cafes`: Café structures and inventory
- `atlas_transactions`: Complete audit trail

**Note**: Data persists only on this device/browser. For multi-device access, consider backend database integration.

## File Structure

```
atlas-cafe-inventory/
├── index.html          # Complete application (44 KB)
├── README.md          # This file
└── .gitignore         # Git exclusions
```

## Technology Stack

- **Frontend**: Pure HTML5 + CSS3 + Vanilla JavaScript (no dependencies)
- **Storage**: Browser localStorage with deep cloning for data isolation
- **Hosting**: GitHub Pages (static site)
- **Format**: Single-file application for easy deployment

## Deployment to GitHub Pages

### Step 1: Create Repository on GitHub

1. Visit [https://github.com/new](https://github.com/new)
2. **Repository name**: `atlas-cafe-inventory`
3. **Description**: "ATLAS - Café Inventory Management System"
4. **Public**: Yes (required for GitHub Pages)
5. Click "Create repository"

### Step 2: Deploy Files

After creating the repository, you have two options:

#### Option A: Using Git Command Line (Recommended)

```bash
cd /path/to/atlas-repo
git config user.name "Your Name"
git config user.email "your-email@example.com"
git add .
git commit -m "Initial ATLAS deployment"
git branch -M main
git remote set-url origin https://github.com/Oussama-tech-1/atlas-cafe-inventory.git
git push -u origin main
```

#### Option B: Using GitHub Web Interface

1. Go to your repository: `https://github.com/Oussama-tech-1/atlas-cafe-inventory`
2. Click "Add file" → "Upload files"
3. Drag and drop `index.html`, `README.md`, and `.gitignore`
4. Click "Commit changes"

### Step 3: Enable GitHub Pages

1. Go to repository Settings
2. Navigate to "Pages" (left sidebar)
3. **Source**: Select "Deploy from a branch"
4. **Branch**: Select `main` (or `master`)
5. **Folder**: Select `/ (root)`
6. Click "Save"

### Step 4: Access Your Live Site

GitHub Pages will provide a URL like:
```
https://Oussama-tech-1.github.io/atlas-cafe-inventory/
```

Your ATLAS system is now live! Share this link with your café managers.

## How It Works

### Data Flow

```
Login Stage
    ↓
├─→ Admin: Create/manage cafés, set audit passwords
├─→ Café Manager: Stock in/out operations
└─→ Audit Manager: Configure thresholds, upload photos
    ↓
localStorage (Deep cloning prevents cross-café contamination)
    ↓
Transaction Log (Audit trail for compliance)
```

### Key Concepts

**Deep Cloning**: Prevents changes in one café from affecting others
```javascript
JSON.parse(JSON.stringify(café)) // Deep copy
```

**Role-Based Visibility**: Different UI elements based on access level
- Admin sees: Café management dashboard
- Café Manager sees: Stock in/out operations
- Audit Manager sees: Photo upload, threshold settings

**Status Calculation**:
```
if (item.stock === 0) → "OUT" (red)
else if (item.stock < item.minimum) → "LOW" (yellow)
else → "OK" (green)
```

## Customization

### Change Primary Colors

Edit the CSS variables in `index.html` head section:
```css
:root {
    --primary: #667eea;           /* Main color */
    --primary-dark: #764ba2;      /* Hover state */
    --accent: #D4A574;            /* Accent color */
    /* ... other colors ... */
}
```

### Add/Modify Default Departments

Edit the `getDefaultDepts()` function to customize the initial structure for new cafés.

### Adjust Image Size

Find `.item-image img` in the CSS and modify dimensions:
```css
.item-image img {
    max-width: 400px;  /* Change as needed */
    max-height: 400px;
}
```

## Troubleshooting

### Data Not Persisting
- **Issue**: Data disappears on page refresh
- **Solution**: Check browser's localStorage is enabled (Settings → Privacy → Cookies)

### Can't Upload Photos
- **Issue**: Image upload section not visible
- **Solution**: Log in as Audit Manager (not regular Staff)

### Performance Issues
- **Issue**: Slow with many items
- **Solution**: localStorage is limited to ~5-10MB. For large inventories, consider backend integration.

### GitHub Pages Not Updating
- **Issue**: Changes don't appear online
- **Solution**: 
  1. Verify files are pushed to `main` branch
  2. Check Settings → Pages shows correct branch
  3. Wait 1-2 minutes for GitHub Pages to rebuild
  4. Clear browser cache (Ctrl+Shift+Delete)

## Security Considerations

### Current Implementation (Frontend)
- Passwords stored in localStorage (not encrypted)
- No server-side validation
- Data visible to anyone with browser access

### For Production Use
- Implement backend authentication (Node.js, Python, etc.)
- Encrypt sensitive data at rest
- Use HTTPS (automatic with GitHub Pages)
- Add role-based database layer
- Implement audit log backup

## Migration to Backend

To add a backend database:

1. Replace `localStorage` calls with API endpoints
2. Implement server authentication
3. Add encryption for sensitive data
4. Set up database (PostgreSQL, MongoDB, etc.)
5. Deploy backend (Heroku, AWS, DigitalOcean, etc.)

Example API structure:
```
POST /api/auth/login
POST /api/cafes/{cafeId}/items/{itemId}/stockin
POST /api/cafes/{cafeId}/items/{itemId}/stockout
GET /api/cafes/{cafeId}/transactions
```

## Support & Updates

For issues or feature requests:
1. Check this README first
2. Review transaction logs for data issues
3. Verify browser console for JavaScript errors (F12)

## License

ATLAS - Café Inventory Management System
Created with Claude Code

---

**Live Site**: https://Oussama-tech-1.github.io/atlas-cafe-inventory/

**Repository**: https://github.com/Oussama-tech-1/atlas-cafe-inventory
