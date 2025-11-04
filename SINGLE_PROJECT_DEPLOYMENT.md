# Single Vercel Project Deployment Guide

## Overview

This guide shows how to deploy both frontend and backend as **one Vercel project**, eliminating the URL mismatch issues.

## Benefits

✅ **No more URL changes** - One stable URL  
✅ **No env var updates** - Frontend automatically uses `/api`  
✅ **Simpler CORS** - Same origin, no CORS issues  
✅ **Easier management** - One project instead of two  

## Architecture

```
Single Vercel Project: https://noeliq.vercel.app
├── /api/* → Backend (Express serverless function)
└── /* → Frontend (React static files)
```

## Setup Steps

### Step 1: Delete/Archive Old Separate Projects (Optional)

1. Go to Vercel Dashboard
2. You can keep old projects as backup or delete them
3. We'll create a new single project

### Step 2: Create New Single Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository: `noeliq`
4. Configure:
   - **Project Name**: `noeliq` (or your preferred name)
   - **Root Directory**: `.` (root, not `backend` or `frontend`)
   - **Framework Preset**: Other
   - **Build Command**: (leave empty - handled by vercel.json)
   - **Output Directory**: (leave empty - handled by vercel.json)
   - **Install Command**: `cd backend && npm install && cd ../frontend && npm install`

### Step 3: Set Environment Variables

Add ALL environment variables in ONE place:

```bash
# Azure OpenAI (4)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Azure Search (3)
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-search-key
AZURE_SEARCH_INDEX_NAME=noeliq-products

# Server (2)
PORT=5000
NODE_ENV=production

# Auth (2)
ADMIN_TOKEN=your-secure-admin-token
STAFF_TOKEN=staff-access

# RAG (3)
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false
USE_TURN_ORCHESTRATOR=true

# Frontend URL (optional, for CORS if needed)
FRONTEND_URL=https://noeliq.vercel.app
```

**Important:**
- Set for **Production**, **Preview**, and **Development**
- **DO NOT** set `VITE_API_BASE_URL` - it will use relative `/api` automatically

### Step 4: Deploy

Click **"Deploy"** and wait for build to complete.

### Step 5: Verify

1. **Test API**: `https://your-project.vercel.app/api/health`
2. **Test Frontend**: `https://your-project.vercel.app/chat`
3. **Test Chat**: Should work without 401 errors!

## How It Works

### Routing (vercel.json)

```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/app.js"  // All /api/* routes go to backend
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/dist/$1"  // All other routes serve frontend
    }
  ]
}
```

### Frontend API Client

The frontend automatically detects:
- **Production + no env var** → Uses `/api` (same domain)
- **Development** → Uses `http://localhost:5000/api`
- **Env var set** → Uses the env var (for separate deployments if needed)

## Migration from Separate Projects

If you have existing separate projects:

1. **Option A**: Create new single project (recommended)
   - Keep old projects as backup
   - Test new single project
   - Switch DNS/domains when ready

2. **Option B**: Convert existing project
   - Update root directory to `.`
   - Update vercel.json
   - Redeploy

## Troubleshooting

### Build Fails

**Error**: "Cannot find module"
- **Fix**: Update install command to install both backend and frontend deps

**Error**: "Build command failed"
- **Fix**: Check that `frontend/package.json` has `build` script

### 401 Errors Still Occur

1. Check `STAFF_TOKEN` is set in environment variables
2. Clear browser cache/localStorage
3. Check browser console for errors

### CORS Errors

With single project, CORS shouldn't be an issue. But if you see CORS errors:
1. Check `FRONTEND_URL` env var matches your deployment URL
2. Check backend CORS configuration in `backend/app.js`

## Rollback Plan

If single project doesn't work:
1. Keep old separate projects as backup
2. Revert to separate deployments
3. Set `VITE_API_BASE_URL` env var in frontend project

## Next Steps

After successful deployment:
1. ✅ Test all endpoints
2. ✅ Set up custom domain (optional)
3. ✅ Configure preview deployments
4. ✅ Set up monitoring

