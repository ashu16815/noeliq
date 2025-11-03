# Frontend Environment Variable Update

## Current Frontend URL
`https://frontend-weld-nu-80.vercel.app`

## Backend URL
`https://backend-ovaqgrhci-ashu16815-gmailcoms-projects.vercel.app`

## Required Environment Variable

In your **frontend** Vercel project settings:

**Key:**
```
VITE_API_BASE_URL
```

**Value:**
```
https://backend-ovaqgrhci-ashu16815-gmailcoms-projects.vercel.app/api
```

## Steps to Set

1. Go to Vercel Dashboard → **frontend** project → Settings → Environment Variables
2. Add or update the variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://backend-ovaqgrhci-ashu16815-gmailcoms-projects.vercel.app/api`
3. Select **All Environments** (or Production, Preview, Development individually)
4. Click **Save**
5. **Redeploy frontend**:
   ```bash
   cd frontend
   vercel --prod
   ```

## After Setting

1. ✅ Frontend will be able to connect to backend
2. ✅ CORS is already configured to allow `frontend-weld-nu-80.vercel.app`
3. ✅ Test by visiting frontend and making a query

## Important Notes

- The backend URL is: `https://backend-ovaqgrhci-ashu16815-gmailcoms-projects.vercel.app`
- The API base URL must include `/api` at the end
- Make sure to set for all environments (Production, Preview, Development)
- Redeploy after setting environment variables

