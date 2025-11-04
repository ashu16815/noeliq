# API Routes Fix

## Issue Identified

The frontend is calling:
- `https://backend-mauve-five-83.vercel.app/stores` ❌ (404)
- `https://backend-mauve-five-83.vercel.app/ask` ❌ (404)

But should be calling:
- `https://backend-mauve-five-83.vercel.app/api/stores` ✅
- `https://backend-mauve-five-83.vercel.app/api/ask` ✅

## Root Cause

The `VITE_API_BASE_URL` environment variable in Vercel is likely set to:
```
https://backend-mauve-five-83.vercel.app
```

Instead of:
```
https://backend-mauve-five-83.vercel.app/api
```

## Fix Applied

The frontend code now automatically ensures `/api` is appended if missing from `VITE_API_BASE_URL`.

## Action Required

### Update Frontend Environment Variable

1. Go to Vercel Dashboard → **frontend** project → Settings → Environment Variables
2. Find `VITE_API_BASE_URL`
3. Update to:
   ```
   https://backend-mauve-five-83.vercel.app/api
   ```
   OR use the latest backend URL:
   ```
   https://backend-e2ghf5yqn-ashu16815-gmailcoms-projects.vercel.app/api
   ```
4. **Important**: Make sure it ends with `/api`
5. Set for **Production**, **Preview**, and **Development**
6. **Redeploy frontend** after updating

## Verification

After fixing:
- ✅ Frontend calls: `https://backend-xxx.vercel.app/api/stores`
- ✅ Frontend calls: `https://backend-xxx.vercel.app/api/ask`
- ✅ No more 404 errors
- ✅ Health check: `https://backend-xxx.vercel.app/api/health` ✅ (already working)

## Current Working Backend

The health endpoint confirms the backend is working:
- ✅ `https://backend-mauve-five-83.vercel.app/api/health` - Working

So the backend is fine, just need to:
1. Update `VITE_API_BASE_URL` to include `/api`
2. Optionally update to latest backend URL
3. Redeploy frontend

