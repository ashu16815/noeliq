# Deploy to Vercel - Complete Guide

## ✅ Both Projects Deployed

### Backend
- **URL**: `https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app`
- **Status**: Deployed
- **⚠️ NEEDS**: Environment variables set in Vercel Dashboard

### Frontend  
- **URL**: `https://frontend-weld-nu-80.vercel.app`
- **Status**: Deployed
- **⚠️ NEEDS**: `VITE_API_BASE_URL` environment variable updated

## 🔧 Critical: Set Environment Variables BEFORE Testing

### Step 1: Backend Environment Variables

**Go to Vercel Dashboard → backend project → Settings → Environment Variables**

Add these 14 variables:

```bash
# Azure OpenAI (4)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Azure Search (3)
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-search-api-key-here
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
```

**Important:**
- Set for **Production**, **Preview**, and **Development**
- After adding, redeploy: `cd backend && vercel --prod`

### Step 2: Frontend Environment Variable

**Go to Vercel Dashboard → frontend project → Settings → Environment Variables**

Add or update:

```bash
VITE_API_BASE_URL=https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app/api
```

**Important:**
- Set for **Production**, **Preview**, and **Development**
- After adding, redeploy: `cd frontend && vercel --prod`

## 🚀 Redeploy Commands

After setting environment variables:

```bash
# Redeploy backend
cd backend
vercel --prod

# Redeploy frontend
cd frontend
vercel --prod
```

## ✅ Verification Steps

1. **Test backend health**:
   ```
   https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test frontend**:
   - Visit: `https://frontend-weld-nu-80.vercel.app/chat`
   - Open console (F12)
   - Set auth token:
     ```javascript
     localStorage.setItem('noeliq_token', 'staff-access')
     ```
   - Refresh page
   - Try a query: "laptop"

3. **Check for errors**:
   - Browser console should show no 404 errors
   - API calls should go to new backend URL
   - Responses should work (after env vars are set)

## 📝 Quick Reference

- **Backend URL**: `https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app`
- **Frontend URL**: `https://frontend-weld-nu-80.vercel.app`
- **Frontend API Base**: `https://backend-9jz2aesxl-ashu16815-gmailcoms-projects.vercel.app/api`
- **Auth Token**: `staff-access`

## ⚠️ Common Issues

1. **404 Errors**: Backend missing environment variables
2. **CORS Errors**: Frontend URL not in backend CORS (already fixed)
3. **Auth Errors**: Token not set in localStorage
4. **Old Backend URL**: Frontend env var not updated

See `QUICK_FIX_STEPS.md` for detailed troubleshooting.
