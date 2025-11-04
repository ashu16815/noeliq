# Vercel Environment Variables Setup Guide

## Required Environment Variables (15 total)

Based on `SINGLE_PROJECT_DEPLOYMENT.md`, here's the complete list:

### Azure OpenAI (4 variables)
1. `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint URL
2. `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
3. `AZURE_OPENAI_DEPLOYMENT_NAME` - Deployment name (e.g., `gpt-4o`)
4. `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` - Embedding deployment (e.g., `text-embedding-3-large`)

### Azure AI Search (3 variables)
5. `AZURE_SEARCH_ENDPOINT` - Your Azure Search endpoint URL
6. `AZURE_SEARCH_API_KEY` - Your Azure Search API key
7. `AZURE_SEARCH_INDEX_NAME` - Index name (e.g., `noeliq-products`)

### Server Configuration (2 variables)
8. `PORT` - Server port (e.g., `5000`)
9. `NODE_ENV` - Environment (e.g., `production`)

### Authentication (2 variables)
10. `ADMIN_TOKEN` - Secure admin token (generate with `openssl rand -hex 32`)
11. `STAFF_TOKEN` - Staff token (e.g., `staff-access`)

### RAG Configuration (3 variables)
12. `RAG_CHUNK_LIMIT` - Chunk limit (e.g., `5`)
13. `USE_OPTIMIZED_RAG` - Use optimized RAG (e.g., `false`)
14. `USE_TURN_ORCHESTRATOR` - Use turn orchestrator (e.g., `true`)

### Frontend URL (1 variable - optional)
15. `FRONTEND_URL` - Frontend URL (will be set after deployment)

## Setup Methods

### Method 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Select your project (or create new single project)
3. Go to **Settings** → **Environment Variables**
4. For each variable above:
   - Click **Add New**
   - Enter **Key** (e.g., `AZURE_OPENAI_ENDPOINT`)
   - Enter **Value** (your actual value)
   - Select **Production**, **Preview**, and **Development**
   - Click **Save**
5. Repeat for all 15 variables

### Method 2: Vercel CLI (Interactive)

Run the script:
```bash
chmod +x set-vercel-env.sh
./set-vercel-env.sh <project-name>
```

Or manually:
```bash
# Set for Production
vercel env add AZURE_OPENAI_ENDPOINT production
# (paste value when prompted)

vercel env add AZURE_OPENAI_API_KEY production
# (paste value when prompted)

# ... repeat for all variables ...

# Set for Preview
vercel env add AZURE_OPENAI_ENDPOINT preview
# (paste value when prompted)

# ... repeat for all variables ...

# Set for Development
vercel env add AZURE_OPENAI_ENDPOINT development
# (paste value when prompted)

# ... repeat for all variables ...
```

### Method 3: Vercel CLI with .env file (Advanced)

Create a `.vercel-env` file with your values, then use `vercel env pull` and `vercel env push`.

## Quick Setup Checklist

Use this checklist to ensure all variables are set:

### Azure OpenAI
- [ ] `AZURE_OPENAI_ENDPOINT`
- [ ] `AZURE_OPENAI_API_KEY`
- [ ] `AZURE_OPENAI_DEPLOYMENT_NAME`
- [ ] `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`

### Azure Search
- [ ] `AZURE_SEARCH_ENDPOINT`
- [ ] `AZURE_SEARCH_API_KEY`
- [ ] `AZURE_SEARCH_INDEX_NAME`

### Server
- [ ] `PORT`
- [ ] `NODE_ENV`

### Auth
- [ ] `ADMIN_TOKEN`
- [ ] `STAFF_TOKEN`

### RAG
- [ ] `RAG_CHUNK_LIMIT`
- [ ] `USE_OPTIMIZED_RAG`
- [ ] `USE_TURN_ORCHESTRATOR`

### Frontend
- [ ] `FRONTEND_URL` (set after deployment)

## Verification

After setting all variables:

1. **Check in Dashboard**:
   - Go to Settings → Environment Variables
   - Verify all 15 variables are listed
   - Check they're set for Production, Preview, and Development

2. **Test with CLI**:
   ```bash
   vercel env ls
   ```

3. **Redeploy**:
   ```bash
   vercel --prod
   ```

## Important Notes

- **DO NOT** set `VITE_API_BASE_URL` - Frontend will use relative `/api` automatically
- Set variables for **all three environments** (Production, Preview, Development)
- **STAFF_TOKEN** must be `staff-access` to match frontend default
- **FRONTEND_URL** can be updated after deployment with actual URL

## Getting Your Values

### Azure OpenAI
1. Go to Azure Portal
2. Navigate to your OpenAI resource
3. Go to **Keys and Endpoint**
4. Copy **Endpoint** and **Key 1**

### Azure AI Search
1. Go to Azure Portal
2. Navigate to your Search service
3. Go to **Keys**
4. Copy **URL** and **Primary admin key**

### Generate Admin Token
```bash
openssl rand -hex 32
```

## Troubleshooting

### Variables Not Working After Deployment

1. **Redeploy**: Environment variables require redeployment
   ```bash
   vercel --prod
   ```

2. **Check Environment**: Ensure variables are set for the correct environment

3. **Check Names**: Variable names are case-sensitive

4. **Check Values**: Ensure no extra spaces or quotes

### Missing Variables

If you see errors about missing variables:
1. Check Vercel logs: `vercel logs <deployment-url>`
2. Verify all variables are set in dashboard
3. Redeploy after adding variables

