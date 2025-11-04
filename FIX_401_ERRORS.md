# Fix 401 Unauthorized Errors

## Issue
Backend is returning `401 Unauthorized` for `/api/ask` and `/api/stores` endpoints.

## Root Cause
The `STAFF_TOKEN` environment variable is either:
1. Not set in Vercel backend environment variables
2. Set to a different value than what the frontend is sending

## Solution

### Step 1: Set STAFF_TOKEN in Backend

1. Go to Vercel Dashboard → **backend** project → Settings → Environment Variables
2. Find or add `STAFF_TOKEN`
3. Set value to:
   ```
   staff-access
   ```
4. **Important**: Set for **Production**, **Preview**, and **Development**
5. Click **Save**

### Step 2: Verify Frontend Token

The frontend should send `staff-access` in the Authorization header. To set it in browser:

1. Open browser console (F12)
2. Run:
   ```javascript
   localStorage.setItem('noeliq_token', 'staff-access')
   ```
3. Refresh the page

### Step 3: Set All Backend Environment Variables

The backend needs **all 15 environment variables** set. Critical ones:

**Authentication:**
```bash
STAFF_TOKEN=staff-access
ADMIN_TOKEN=your-secure-admin-token
```

**Server:**
```bash
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://frontend-6bu5mjlbt-ashu16815-gmailcoms-projects.vercel.app
```

**Azure OpenAI (4 variables):**
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large
```

**Azure Search (3 variables):**
```bash
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-search-key
AZURE_SEARCH_INDEX_NAME=noeliq-products
```

**RAG (3 variables):**
```bash
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false
USE_TURN_ORCHESTRATOR=true
```

### Step 4: Redeploy Backend

After setting all variables, redeploy:
```bash
cd backend
vercel --prod
```

Or redeploy from Vercel Dashboard.

## Verification

After fixing:
1. ✅ Check backend logs - should show 200 status codes
2. ✅ Test `/api/stores` - should return stores list
3. ✅ Test `/api/ask` - should process queries
4. ✅ No more 401 errors

## Quick Test

```bash
# Test with auth token
curl -H "Authorization: Bearer staff-access" \
  https://backend-fcumlibyl-ashu16815-gmailcoms-projects.vercel.app/api/stores
```

Should return stores data, not 401.

## Common Issues

1. **Token mismatch**: Frontend sends `staff-access` but backend has different token
2. **Missing env var**: `STAFF_TOKEN` not set in Vercel
3. **Wrong environment**: Variable set only for Production, not Preview/Development
4. **Not redeployed**: Variables set but backend not redeployed

## Summary

The 401 errors are because `STAFF_TOKEN` environment variable is missing or doesn't match. Set it to `staff-access` in Vercel backend environment variables and redeploy.

