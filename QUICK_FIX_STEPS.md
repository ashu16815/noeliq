# Quick Fix Steps for Vercel Errors

## Problem Summary
- Frontend calling old backend URL: `backend-mauve-five-83.vercel.app`
- Correct backend URL: `backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app`
- Missing auth token
- Backend may need environment variables

## Fix 1: Update Frontend Environment Variable

**In Vercel Dashboard:**

1. Go to: https://vercel.com/dashboard
2. Select your **frontend** project
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_API_BASE_URL` or add it if missing
5. Set value to:
   ```
   https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app/api
   ```
6. Select **Production**, **Preview**, and **Development**
7. Click **Save**
8. **Redeploy** (go to Deployments tab and click "Redeploy" on latest, or run `vercel --prod`)

## Fix 2: Set Backend Environment Variables

**Critical - Backend won't work without these:**

1. Go to Vercel Dashboard → **backend** project
2. **Settings** → **Environment Variables**
3. Add all 14 variables (see list below)
4. Set for **All Environments**
5. **Redeploy** backend

**Required Variables:**
```
AZURE_OPENAI_ENDPOINT=your-endpoint
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large
AZURE_SEARCH_ENDPOINT=your-endpoint
AZURE_SEARCH_API_KEY=your-key
AZURE_SEARCH_INDEX_NAME=noeliq-products
PORT=5000
NODE_ENV=production
ADMIN_TOKEN=your-token
STAFF_TOKEN=staff-access
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false
USE_TURN_ORCHESTRATOR=true
```

## Fix 3: Set Auth Token in Browser

After frontend redeploys, open browser console and run:

```javascript
localStorage.setItem('noeliq_token', 'staff-access')
```

Then refresh the page.

## Verification

1. Check backend health (should work after env vars are set):
   ```
   https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app/api/health
   ```

2. Check frontend console - should see calls to new backend URL

3. Test a query - should work after all fixes

## Current URLs

- **Frontend**: `https://frontend-weld-nu-80.vercel.app`
- **Backend**: `https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app`
- **Frontend API URL**: `https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app/api`

