# Current Vercel Deployment URLs

**Last Updated**: Stable URLs (DO NOT auto-update env variables)

## ⚠️ Important: Stable URLs

These are **stable URLs** that should be used for environment variables. **DO NOT** auto-update env variables on each deployment.

## Backend
- **Production URL**: `https://backend-mauve-five-83.vercel.app/`
- **API Base URL**: `https://backend-mauve-five-83.vercel.app/api`
- **Health Check**: `https://backend-mauve-five-83.vercel.app/api/health`

## Frontend
- **Production URL**: `https://frontend-weld-nu-80.vercel.app/`
- **Chat Page**: `https://frontend-weld-nu-80.vercel.app/chat`

## Environment Variables Setup

### Backend (`FRONTEND_URL`)
```
FRONTEND_URL=https://frontend-weld-nu-80.vercel.app
```
✅ **Set once and leave it** - Do NOT update on each deployment

### Frontend (`VITE_API_BASE_URL`)
```
VITE_API_BASE_URL=https://backend-mauve-five-83.vercel.app/api
```
✅ **Set once and leave it** - Do NOT update on each deployment

**Note**: The code now auto-appends `/api` if missing, but it's still recommended to include it in the env variable.

### Backend (15 variables including STAFF_TOKEN)
See `VERCEL_ENV_VARS.md` for complete list.

**Important**: Make sure `STAFF_TOKEN=staff-access` is set in backend environment variables!

## Quick Test

1. **Backend Health**:
   ```bash
   curl https://backend-mauve-five-83.vercel.app/api/health
   ```

2. **Frontend**:
   - Visit: `https://frontend-weld-nu-80.vercel.app/chat`
   - ✅ Auth token is now auto-initialized (no manual setup needed!)
   - Check browser console - should see: `✅ Auth token initialized: staff-access`
   - Test asking a question - should work without 401 errors

## Important Notes

### ✅ DO:
- Use these stable URLs for environment variables
- Set variables once in Vercel Dashboard
- Keep them unchanged unless URLs actually change

### ❌ DON'T:
- Don't auto-update env vars on each deployment
- Don't use deployment-hash URLs (they change every deployment)
- Don't change env vars unless URLs actually change

## Setup Guide

See `STABLE_ENV_VARIABLES_SETUP.md` for detailed setup instructions.

## Note

These are stable URLs that remain consistent. Deployment-hash URLs (like `backend-23z0pvzm9-...`) change with each deployment, but these stable URLs should be used for environment variables.

