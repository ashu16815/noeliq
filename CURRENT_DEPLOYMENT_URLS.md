# Current Vercel Deployment URLs

**Last Updated**: Latest deployment

## Backend
- **Production URL**: `https://backend-fcumlibyl-ashu16815-gmailcoms-projects.vercel.app`
- **API Base URL**: `https://backend-fcumlibyl-ashu16815-gmailcoms-projects.vercel.app/api`
- **Health Check**: `https://backend-fcumlibyl-ashu16815-gmailcoms-projects.vercel.app/api/health`

## Frontend
- **Production URL**: `https://frontend-6bu5mjlbt-ashu16815-gmailcoms-projects.vercel.app`
- **Chat Page**: `https://frontend-6bu5mjlbt-ashu16815-gmailcoms-projects.vercel.app/chat`

## Environment Variables Needed

### Backend (`FRONTEND_URL` - NEW!)
```
FRONTEND_URL=https://frontend-6bu5mjlbt-ashu16815-gmailcoms-projects.vercel.app
```

### Frontend (`VITE_API_BASE_URL`)
```
VITE_API_BASE_URL=https://backend-fcumlibyl-ashu16815-gmailcoms-projects.vercel.app/api
```

**Note**: The code now auto-appends `/api` if missing, but it's still recommended to include it in the env variable.

### Backend (14 variables)
See `VERCEL_ENV_VARS.md` for complete list.

## Quick Test

1. **Backend Health**:
   ```bash
   curl https://backend-eocje45kk-ashu16815-gmailcoms-projects.vercel.app/api/health
   ```

2. **Frontend**:
   - Visit: `https://frontend-k7p72nzus-ashu16815-gmailcoms-projects.vercel.app/chat`
   - Set auth token in console:
     ```javascript
     localStorage.setItem('noeliq_token', 'staff-access')
     ```
   - Refresh and test

## Note

Vercel URLs may change with each deployment. Check Vercel Dashboard for current production URLs.

