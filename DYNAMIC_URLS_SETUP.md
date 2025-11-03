# Dynamic URLs Configuration

All URLs are now configured via environment variables - no more hardcoding!

## What Changed

### Backend
- **CORS origins** now dynamically use `FRONTEND_URL` environment variable
- Removed all hardcoded frontend URLs from `app.js`
- Still includes localhost for development and regex patterns for Vercel previews

### Frontend
- **Already using** `VITE_API_BASE_URL` environment variable (no change needed)
- Removed hardcoded backend URL from `vercel.json` (frontend code handles it)

## Environment Variables Required

### Backend Environment Variables

**New Required Variable:**
```bash
FRONTEND_URL=https://frontend-xxx.vercel.app
```

**Example:**
```bash
FRONTEND_URL=https://frontend-k7p72nzus-ashu16815-gmailcoms-projects.vercel.app
```

**All Backend Variables (15 total now):**
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

# Server (3)
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://frontend-xxx.vercel.app  # NEW!

# Auth (2)
ADMIN_TOKEN=your-secure-admin-token
STAFF_TOKEN=staff-access

# RAG (3)
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false
USE_TURN_ORCHESTRATOR=true
```

### Frontend Environment Variables

**Required Variable:**
```bash
VITE_API_BASE_URL=https://backend-xxx.vercel.app/api
```

**Example:**
```bash
VITE_API_BASE_URL=https://backend-gepc6xyhb-ashu16815-gmailcoms-projects.vercel.app/api
```

## How to Set in Vercel

### Backend Project

1. Go to Vercel Dashboard → **backend** project → Settings → Environment Variables
2. Add `FRONTEND_URL` with your frontend deployment URL
3. Set for **Production**, **Preview**, and **Development**
4. **Redeploy** after adding

### Frontend Project

1. Go to Vercel Dashboard → **frontend** project → Settings → Environment Variables
2. Add/update `VITE_API_BASE_URL` with your backend API URL (include `/api`)
3. Set for **Production**, **Preview**, and **Development**
4. **Redeploy** after adding

## Benefits

✅ **No hardcoded URLs** - All URLs come from environment variables
✅ **Easy updates** - Just update env vars, no code changes needed
✅ **Works for all environments** - Production, Preview, Development
✅ **Preview deployments** - Regex patterns still work for Vercel previews

## How It Works

### Backend CORS
- Checks `process.env.FRONTEND_URL` and adds it to allowed origins
- Falls back to localhost for development
- Uses regex patterns for Vercel preview deployments

### Frontend API Calls
- Uses `import.meta.env.VITE_API_BASE_URL` from environment variable
- Falls back to `http://localhost:5000/api` for local development

## Testing

1. **Local Development**: URLs default to localhost (no env vars needed)
2. **Vercel Production**: Set both `FRONTEND_URL` and `VITE_API_BASE_URL`
3. **Vercel Previews**: Regex patterns handle preview URLs automatically

## Migration Notes

If you already have deployments:
1. Add `FRONTEND_URL` to backend environment variables
2. Update `VITE_API_BASE_URL` in frontend if needed
3. Redeploy both projects

No code changes needed - just update environment variables!

