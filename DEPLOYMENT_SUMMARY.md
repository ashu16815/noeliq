# NoelIQ Deployment Summary

Quick reference for deploying NoelIQ to GitHub and Vercel.

## Quick Start

1. **Verify environment variables**: `cd backend && npm run check-env`
2. **Push to GitHub**: `git push origin main`
3. **Deploy Backend to Vercel**: See `DEPLOYMENT_CHECKLIST.md` Step 2
4. **Deploy Frontend to Vercel**: See `DEPLOYMENT_CHECKLIST.md` Step 3
5. **Update CORS**: Add frontend URL to backend CORS config

## Required Environment Variables

### Backend (14 required variables)

```bash
# Azure OpenAI (4)
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY
AZURE_OPENAI_DEPLOYMENT_NAME
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME

# Azure AI Search (3)
AZURE_SEARCH_ENDPOINT
AZURE_SEARCH_API_KEY
AZURE_SEARCH_INDEX_NAME

# Server (2)
PORT=5000
NODE_ENV=production

# Authentication (2)
ADMIN_TOKEN
STAFF_TOKEN

# RAG (2)
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false

# Turn Orchestrator (1)
USE_TURN_ORCHESTRATOR=true
```

### Frontend (1 required variable)

```bash
VITE_API_BASE_URL=https://noeliq-api-xxx.vercel.app/api
```

## Deployment Checklist

See `DEPLOYMENT_CHECKLIST.md` for complete step-by-step instructions.

## Environment Variable Verification

Before deploying, verify all variables are set:

```bash
cd backend
npm run check-env
```

This will show:
- ✅ Set variables (with masked values)
- ❌ Missing required variables
- ⚠️ Missing optional variables (will use defaults)

## Files Created/Updated

1. **`backend/env.template`** - Updated with all variables including `USE_TURN_ORCHESTRATOR`
2. **`backend/check-env.js`** - Script to verify environment variables
3. **`DEPLOYMENT_CHECKLIST.md`** - Complete deployment guide
4. **`VERCEL_ENV_VARS.md`** - Updated with all variables
5. **`SETUP_VERCEL.md`** - Updated deployment instructions

## Key Points

- **Backend and Frontend are separate Vercel projects** (same GitHub repo, different root directories)
- **Environment variables must be set in Vercel** for both projects
- **Frontend `VITE_API_BASE_URL` must point to backend URL** after backend deploys
- **CORS must be updated** to allow frontend requests
- **Turn Orchestrator is recommended** for production (`USE_TURN_ORCHESTRATOR=true`)

## Troubleshooting

- **Check logs**: Vercel Dashboard → Functions → Logs
- **Verify env vars**: Use `npm run check-env` in backend
- **Test API**: `curl https://noeliq-api-xxx.vercel.app/api/stores`
- **Check CORS**: Ensure frontend URL is in backend CORS config

## Next Steps

After successful deployment:

1. Test the application
2. Set up custom domains (optional)
3. Configure monitoring
4. Document API endpoints
5. Set up error tracking

