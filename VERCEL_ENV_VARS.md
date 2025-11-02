# Vercel Environment Variables Configuration

## Backend Project (`noeliq-api`)

Copy these to Vercel → Project Settings → Environment Variables:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://twg-test-ai1.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Azure AI Search Configuration
AZURE_SEARCH_ENDPOINT=https://noeliq-ai-search.search.windows.net
AZURE_SEARCH_API_KEY=your-azure-search-api-key-here
AZURE_SEARCH_INDEX_NAME=noeliq-products

# Server Configuration
PORT=5000
NODE_ENV=production

# Authentication Tokens (generate secure tokens)
ADMIN_TOKEN=generate-secure-token-here
STAFF_TOKEN=generate-secure-token-here

# RAG Configuration
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false
```

**Important**: 
- Replace `your-*-key-here` with actual values from Azure Portal
- Generate secure tokens: `openssl rand -hex 32`
- Set for **Production**, **Preview**, and **Development** environments

## Frontend Project (`noeliq`)

```bash
# API Base URL (will be set after backend deploys)
VITE_API_BASE_URL=https://noeliq-api.vercel.app/api
```

**Note**: Update this after backend deployment with actual backend URL.

## How to Add in Vercel

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter **Key** and **Value**
5. Select environments: Production, Preview, Development
6. Click **Save**
7. **Redeploy** project for changes to take effect

## Security Notes

- ⚠️ Never commit `.env` files to Git
- ⚠️ Never share API keys publicly
- ⚠️ Rotate tokens periodically
- ⚠️ Use different tokens for production vs development
