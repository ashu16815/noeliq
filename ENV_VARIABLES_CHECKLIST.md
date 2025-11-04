# Environment Variables Checklist for Single Project Deployment

## Complete List (15 Variables)

Use this checklist to ensure all environment variables are set in Vercel Dashboard.

### ✅ Azure OpenAI (4)
- [ ] `AZURE_OPENAI_ENDPOINT` = `https://your-resource.openai.azure.com/`
- [ ] `AZURE_OPENAI_API_KEY` = `your-api-key`
- [ ] `AZURE_OPENAI_DEPLOYMENT_NAME` = `gpt-4o`
- [ ] `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` = `text-embedding-3-large`

### ✅ Azure AI Search (3)
- [ ] `AZURE_SEARCH_ENDPOINT` = `https://your-search-service.search.windows.net`
- [ ] `AZURE_SEARCH_API_KEY` = `your-search-api-key`
- [ ] `AZURE_SEARCH_INDEX_NAME` = `noeliq-products`

### ✅ Server Configuration (2)
- [ ] `PORT` = `5000`
- [ ] `NODE_ENV` = `production`

### ✅ Authentication (2)
- [ ] `ADMIN_TOKEN` = `your-secure-admin-token` (generate with `openssl rand -hex 32`)
- [ ] `STAFF_TOKEN` = `staff-access` ⚠️ **Must match frontend default**

### ✅ RAG Configuration (3)
- [ ] `RAG_CHUNK_LIMIT` = `5`
- [ ] `USE_OPTIMIZED_RAG` = `false`
- [ ] `USE_TURN_ORCHESTRATOR` = `true`

### ✅ Frontend URL (1) - Set after deployment
- [ ] `FRONTEND_URL` = `https://your-project.vercel.app` (update after deployment)

## Setup Instructions

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com/dashboard
2. Select your project (or create new single project)
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Each Variable
For each variable above:
1. Click **"Add New"** button
2. Enter the **Key** (variable name)
3. Enter the **Value** (your actual value)
4. **IMPORTANT**: Select all three environments:
   - ☑️ Production
   - ☑️ Preview  
   - ☑️ Development
5. Click **"Save"**
6. Repeat for all 15 variables

### Step 3: Verify
After adding all variables:
1. Scroll through the list
2. Verify all 15 variables are present
3. Check each has all three environments selected

### Step 4: Redeploy
After setting variables:
```bash
vercel --prod
```

## Quick Copy-Paste Values (Default/Example)

If you need to set values quickly, use these defaults (replace with your actual values):

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Azure Search
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-search-api-key-here
AZURE_SEARCH_INDEX_NAME=noeliq-products

# Server
PORT=5000
NODE_ENV=production

# Auth
ADMIN_TOKEN=your-secure-admin-token-here
STAFF_TOKEN=staff-access

# RAG
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false
USE_TURN_ORCHESTRATOR=true

# Frontend (update after deployment)
FRONTEND_URL=https://your-project.vercel.app
```

## Critical Notes

⚠️ **DO NOT** set `VITE_API_BASE_URL` - Frontend will use relative `/api` automatically

⚠️ **STAFF_TOKEN** must be `staff-access` to match frontend default token

⚠️ Set variables for **all three environments** (Production, Preview, Development)

⚠️ **Redeploy** after setting variables for them to take effect

## Verification Commands

Check variables via CLI:
```bash
vercel env ls
```

Test deployment:
```bash
curl https://your-project.vercel.app/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

