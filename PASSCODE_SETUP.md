# Passcode Protection Setup

## Overview

The NoelIQ platform now requires a passcode to access. This protects the platform from unauthorized access.

## Default Passcode

**Default Passcode:** `noeliq2024`

## Configuration

### Local Development

Create a `.env` file in the `frontend` directory:

```bash
VITE_PLATFORM_PASSCODE=noeliq2024
```

Or use the default if not set.

### Vercel Deployment

Add the environment variable in Vercel Dashboard:

1. Go to your frontend project in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - **Name:** `VITE_PLATFORM_PASSCODE`
   - **Value:** Your desired passcode (e.g., `noeliq2024`)
   - **Environment:** Production, Preview, Development (as needed)
4. Redeploy the frontend

## Features

- ✅ Beautiful login screen with lock icon
- ✅ Password input field (hidden characters)
- ✅ Error messages for incorrect passcode
- ✅ Authentication stored in localStorage
- ✅ Auto-expires after 24 hours
- ✅ Session persists across page refreshes

## Security Notes

- The passcode is checked on the frontend (client-side)
- For production, consider implementing backend authentication
- Current implementation uses localStorage (24-hour expiration)
- Users need to re-enter passcode after 24 hours

## Changing the Passcode

1. Update `VITE_PLATFORM_PASSCODE` in Vercel environment variables
2. Redeploy the frontend
3. Users will need to enter the new passcode on next access (after 24 hours or clearing localStorage)

## Testing

1. Clear localStorage: `localStorage.clear()` in browser console
2. Refresh the page
3. Enter passcode: `noeliq2024` (or your custom passcode)
4. Should redirect to `/chat` upon success

