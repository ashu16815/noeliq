# Vercel Deployment Errors - Fix Guide

## Issues Identified

1. **404 Errors**: Frontend calling old backend URL (`backend-mauve-five-83.vercel.app`)
2. **Missing Auth Token**: Frontend needs auth token in localStorage
3. **Backend Environment Variables**: Backend may be missing required variables

## Fix Steps

### 1. Update Frontend Environment Variable

The frontend is using an old backend URL. Update it:

1. Go to Vercel Dashboard → **frontend** project → Settings → Environment Variables
2. Find or add `VITE_API_BASE_URL`
3. Update the value to:
   ```
   https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app/api
   ```
4. Make sure it's set for **Production**, **Preview**, and **Development**
5. Click **Save**
6. **Redeploy frontend**:
   ```bash
   cd frontend
   vercel --prod
   ```

### 2. Set Auth Token in Browser

After the frontend is updated, in the browser console:

```javascript
localStorage.setItem('noeliq_token', 'staff-access')
```

Then refresh the page.

### 3. Set Backend Environment Variables (CRITICAL)

The backend needs all environment variables. Without them, it returns 404:

1. Go to Vercel Dashboard → **backend** project → Settings → Environment Variables
2. Add ALL these variables:

**Azure OpenAI (4):**
```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large
```

**Azure Search (3):**
```
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-search-api-key-here
AZURE_SEARCH_INDEX_NAME=noeliq-products
```

**Server (2):**
```
PORT=5000
NODE_ENV=production
```

**Auth (2):**
```
ADMIN_TOKEN=your-secure-admin-token
STAFF_TOKEN=staff-access
```

**RAG (3):**
```
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false
USE_TURN_ORCHESTRATOR=true
```

3. Set for **Production**, **Preview**, and **Development**
4. **Redeploy backend** after adding:
   ```bash
   cd backend
   vercel --prod
   ```

## Verification

After all fixes:

1. ✅ Frontend uses correct backend URL
2. ✅ Auth token is set in browser
3. ✅ Backend has all environment variables
4. ✅ Both projects redeployed

Test by:
- Visiting frontend: `https://frontend-weld-nu-80.vercel.app/chat`
- Setting auth token in console
- Making a query (e.g., "laptop")

## Current URLs

- **Frontend**: `https://frontend-weld-nu-80.vercel.app`
- **Backend**: `https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app`
- **Frontend API Base URL**: `https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app/api`

