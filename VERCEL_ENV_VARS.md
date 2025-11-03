# Vercel Environment Variables Configuration

## Backend Project (`noeliq-api`)

Copy these to Vercel → Project Settings → Environment Variables:

### Required Variables

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Azure AI Search Configuration
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
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

# Turn Orchestrator (recommended for production)
USE_TURN_ORCHESTRATOR=true
```

### Optional Variables (Advanced Configuration)

These have sensible defaults and are optional:

```bash
# Azure Search retrieval settings
AZURE_SEARCH_TOP=24
MAX_CHUNKS_AFTER_DIVERSIFY=10
MIN_CHUNK_SCORE=0.55
K_SEMANTIC=12
K_LEXICAL=12

# Summarization settings
USE_SUMMARIZATION=true
SUMMARIZATION_MODEL=gpt-4o-mini
SUMMARIZATION_MAX_TOKENS=900

# Main LLM settings
MAIN_LLM_MODEL=gpt-4o
MAIN_LLM_TEMPERATURE=0.3

# Intent classifier settings
INTENT_CLASSIFIER_USE_LLM=true
INTENT_CLASSIFIER_MODEL=gpt-4o-mini
INTENT_CLASSIFIER_TEMPERATURE=0.1

# Query rewriter settings
QUERY_REWRITER_MODEL=gpt-4o-mini
QUERY_REWRITER_TEMPERATURE=0.3
QUERY_REWRITER_MAX_TOKENS=500
```

**Important**: 
- Replace `your-*-key-here` with actual values from Azure Portal
- Generate secure tokens: `openssl rand -hex 32`
- Set for **Production**, **Preview**, and **Development** environments
- Only set optional variables if you need to override defaults

## Frontend Project (`noeliq`)

```bash
# API Base URL (set after backend deploys)
VITE_API_BASE_URL=https://noeliq-api-xxx.vercel.app/api
```

**Note**: 
- Replace `xxx` with your actual backend deployment URL
- Set this after backend deployment
- Update for both Production and Preview environments

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
