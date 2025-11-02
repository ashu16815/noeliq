# Fix 401 Unauthorized Error

## The Problem
You're getting `401 (Unauthorized)` because the authentication token isn't set in your browser.

## Quick Fix

### Step 1: Open Browser Console
Press `F12` to open DevTools, then go to the **Console** tab.

### Step 2: Set the Token
Paste this into the console and press Enter:

```javascript
localStorage.setItem('noeliq_token', 'staff-access')
```

### Step 3: Verify it's Set
Check it worked:

```javascript
localStorage.getItem('noeliq_token')
```

Should return: `"staff-access"`

### Step 4: Refresh the Page
Press `F5` or `Cmd+R` (Mac) / `Ctrl+R` (Windows) to refresh.

### Step 5: Try Again
Make a query in the UI - it should work now!

## Why This Happens
- The frontend needs the token in `localStorage` to authenticate API requests
- The token value comes from `backend/.env` → `STAFF_TOKEN`
- If it's not set, the API returns 401 Unauthorized

## One-Line Fix
In browser console:
```javascript
localStorage.setItem('noeliq_token', 'staff-access'); location.reload();
```

