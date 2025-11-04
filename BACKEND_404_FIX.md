# Backend 404 Error Fix

## Issue
The backend was returning `404 Not Found` errors for `/ask` endpoint in Vercel.

## Root Causes
1. **Missing environment variables** - Backend needs all Azure credentials to function
2. **CORS configuration** - Frontend URL wasn't in allowed origins
3. **Serverless export** - App needed proper export for Vercel serverless functions

## Fixes Applied

### 1. Updated app.js
- Added frontend URL to CORS origins
- Fixed serverless export (only start HTTP server when not in Vercel)
- Properly exports Express app for Vercel

### 2. Updated vercel.json
- Removed conflicting `functions` property
- Kept `builds` configuration for `@vercel/node`

## Critical: Set Environment Variables

The backend **will not work** until environment variables are set in Vercel:

1. Go to Vercel Dashboard → **backend** project → Settings → Environment Variables
2. Add all variables from `VERCEL_ENV_VARS.md`:
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT_NAME`
   - `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`
   - `AZURE_SEARCH_ENDPOINT`
   - `AZURE_SEARCH_API_KEY`
   - `AZURE_SEARCH_INDEX_NAME`
   - `PORT=5000`
   - `NODE_ENV=production`
   - `ADMIN_TOKEN`
   - `STAFF_TOKEN`
   - `RAG_CHUNK_LIMIT=5`
   - `USE_OPTIMIZED_RAG=false`
   - `USE_TURN_ORCHESTRATOR=true`

3. Set for **Production**, **Preview**, and **Development**
4. **Redeploy backend** after adding variables

## Test After Fix

1. Check backend health: `https://backend-ovaqgrhci-ashu16815-gmailcoms-projects.vercel.app/api/health`
2. Test /ask endpoint with proper authentication
3. Check Vercel logs for any errors

## Next Steps

1. ✅ Set all backend environment variables
2. ✅ Redeploy backend
3. ✅ Test endpoints
4. ✅ Verify frontend can connect to backend

