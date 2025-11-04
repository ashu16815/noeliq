# Current Vercel Deployment URLs

**Last Updated**: Latest deployment (with consistent stock quantities fix)

## Backend
- **Production URL**: `https://backend-23z0pvzm9-ashu16815-gmailcoms-projects.vercel.app`
- **API Base URL**: `https://backend-23z0pvzm9-ashu16815-gmailcoms-projects.vercel.app/api`
- **Health Check**: `https://backend-23z0pvzm9-ashu16815-gmailcoms-projects.vercel.app/api/health`

## Frontend
- **Production URL**: `https://frontend-3dxdndq1j-ashu16815-gmailcoms-projects.vercel.app`
- **Chat Page**: `https://frontend-3dxdndq1j-ashu16815-gmailcoms-projects.vercel.app/chat`

## Environment Variables Needed

### Backend (`FRONTEND_URL`)
```
FRONTEND_URL=https://frontend-3dxdndq1j-ashu16815-gmailcoms-projects.vercel.app
```
⚠️ **Update in Vercel Dashboard after deployment**

### Frontend (`VITE_API_BASE_URL`)
```
VITE_API_BASE_URL=https://backend-23z0pvzm9-ashu16815-gmailcoms-projects.vercel.app/api
```
⚠️ **Update in Vercel Dashboard after deployment**

**Note**: The code now auto-appends `/api` if missing, but it's still recommended to include it in the env variable.

### Backend (15 variables including STAFF_TOKEN)
See `VERCEL_ENV_VARS.md` for complete list.

**Important**: Make sure `STAFF_TOKEN=staff-access` is set in backend environment variables!

## Quick Test

1. **Backend Health**:
   ```bash
   curl https://backend-23z0pvzm9-ashu16815-gmailcoms-projects.vercel.app/api/health
   ```

2. **Frontend**:
   - Visit: `https://frontend-3dxdndq1j-ashu16815-gmailcoms-projects.vercel.app/chat`
   - ✅ Auth token is now auto-initialized (no manual setup needed!)
   - Check browser console - should see: `✅ Auth token initialized: staff-access`
   - Test asking a question - should work without 401 errors

## Note

Vercel URLs may change with each deployment. Check Vercel Dashboard for current production URLs.

