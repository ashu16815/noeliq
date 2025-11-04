# Stable Environment Variables Setup

## Important URLs

These are the **stable URLs** that should be used for environment variables:

### Frontend
- **URL**: `https://frontend-weld-nu-80.vercel.app/`
- **Chat Page**: `https://frontend-weld-nu-80.vercel.app/chat`

### Backend
- **URL**: `https://backend-mauve-five-83.vercel.app/`
- **API Base**: `https://backend-mauve-five-83.vercel.app/api`
- **Health Check**: `https://backend-mauve-five-83.vercel.app/api/health`

## Environment Variables Setup

### ⚠️ DO NOT Auto-Update Environment Variables

These URLs are stable and should **NOT** be automatically updated on each deployment. Set them once and leave them.

### Frontend Environment Variables

**Vercel Dashboard → Frontend Project → Settings → Environment Variables**

Add or update:
```
VITE_API_BASE_URL=https://backend-mauve-five-83.vercel.app/api
```

**Settings:**
- ☑️ Production
- ☑️ Preview
- ☑️ Development

**Important:**
- Make sure it includes `/api` at the end
- Do NOT change this on each deployment
- This is the stable backend URL

### Backend Environment Variables

**Vercel Dashboard → Backend Project → Settings → Environment Variables**

#### Required: Frontend URL for CORS
```
FRONTEND_URL=https://frontend-weld-nu-80.vercel.app
```

**Settings:**
- ☑️ Production
- ☑️ Preview
- ☑️ Development

#### Complete Backend Environment Variables (15 total)

**Azure OpenAI (4):**
```
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large
```

**Azure Search (3):**
```
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-search-api-key
AZURE_SEARCH_INDEX_NAME=noeliq-products
```

**Server (2):**
```
PORT=5000
NODE_ENV=production
```

**Authentication (2):**
```
ADMIN_TOKEN=your-secure-admin-token
STAFF_TOKEN=staff-access
```

**RAG Configuration (3):**
```
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false
USE_TURN_ORCHESTRATOR=true
```

**Frontend URL (1):**
```
FRONTEND_URL=https://frontend-weld-nu-80.vercel.app
```

## Setup Instructions

### Step 1: Set Frontend Environment Variable

1. Go to https://vercel.com/dashboard
2. Select **frontend** project
3. Go to **Settings** → **Environment Variables**
4. Add or update `VITE_API_BASE_URL`:
   - Value: `https://backend-mauve-five-83.vercel.app/api`
   - Select: Production, Preview, Development
   - Click **Save**

### Step 2: Set Backend Environment Variables

1. Go to https://vercel.com/dashboard
2. Select **backend** project
3. Go to **Settings** → **Environment Variables**
4. Add or update `FRONTEND_URL`:
   - Value: `https://frontend-weld-nu-80.vercel.app`
   - Select: Production, Preview, Development
   - Click **Save**
5. Ensure all 15 variables are set (see list above)

### Step 3: Verify

1. **Test Backend Health:**
   ```bash
   curl https://backend-mauve-five-83.vercel.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Frontend:**
   - Visit: `https://frontend-weld-nu-80.vercel.app/chat`
   - Check browser console - should see: `✅ Auth token initialized: staff-access`
   - Test asking a question - should work without 401 errors

## Important Notes

### ✅ DO:
- Use these stable URLs for environment variables
- Set variables once and keep them
- Update only if URLs actually change (rare)

### ❌ DON'T:
- Don't auto-update env vars on each deployment
- Don't use deployment-hash URLs (they change every deployment)
- Don't change env vars unless URLs actually change

## Why These URLs Are Stable

These URLs (`frontend-weld-nu-80` and `backend-mauve-five-83`) appear to be:
- Stable Vercel deployment URLs
- Custom domain aliases
- Or production URLs that don't change

Unlike deployment-hash URLs (like `backend-23z0pvzm9-...`), these remain consistent.

## Troubleshooting

### If Frontend Can't Connect to Backend

1. Check `VITE_API_BASE_URL` in frontend env vars
2. Verify it points to: `https://backend-mauve-five-83.vercel.app/api`
3. Make sure it includes `/api` at the end

### If Backend Has CORS Errors

1. Check `FRONTEND_URL` in backend env vars
2. Verify it points to: `https://frontend-weld-nu-80.vercel.app`
3. Redeploy backend after updating

### If You See 401 Errors

1. Check `STAFF_TOKEN=staff-access` in backend env vars
2. Frontend auto-initializes token, but backend must match
3. Verify token is set for all environments (Production, Preview, Development)

