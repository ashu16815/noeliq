# Deployment Guide: NoelIQ to Vercel

## Overview

NoelIQ consists of two components:
1. **Frontend**: React + Vite (static site)
2. **Backend**: Node.js + Express (API server)

We'll deploy them as separate Vercel projects for better isolation and scaling.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Azure OpenAI credentials
- Azure AI Search credentials

## Step 1: Initialize Git Repository

```bash
cd /Users/323905/Documents/VibeCoding/NoelIQ

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: NoelIQ retail assistant"
```

## Step 2: Create GitHub Repository

### Option A: Using GitHub CLI (if installed)

```bash
# Create repo and push
gh repo create noeliq --public --source=. --remote=origin --push
```

### Option B: Using GitHub Web Interface

1. Go to https://github.com/new
2. Repository name: `noeliq`
3. Description: "AI-powered retail sales assistant for Noel Leeming"
4. Choose Public or Private
5. **Don't** initialize with README (we already have files)
6. Click "Create repository"
7. Then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/noeliq.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy Backend to Vercel

### 3.1 Create Backend Project

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import GitHub repository: `noeliq`
4. Configure:
   - **Project Name**: `noeliq-api`
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
   - **Build Command**: (leave empty - not needed for Node.js)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

### 3.2 Set Backend Environment Variables

In Vercel project settings → Environment Variables, add:

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://twg-test-ai1.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://noeliq-ai-search.search.windows.net
AZURE_SEARCH_API_KEY=your-search-api-key
AZURE_SEARCH_INDEX_NAME=noeliq-products

# Server
PORT=5000
NODE_ENV=production

# Authentication
ADMIN_TOKEN=your-secure-admin-token
STAFF_TOKEN=your-secure-staff-token

# RAG Configuration
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false
```

**Important**: Set for **Production**, **Preview**, and **Development** environments.

### 3.3 Deploy Backend

Click "Deploy". Vercel will:
1. Install dependencies
2. Deploy backend API
3. Provide URL like: `https://noeliq-api.vercel.app`

## Step 4: Deploy Frontend to Vercel

### 4.1 Create Frontend Project

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import same repository: `noeliq`
4. Configure:
   - **Project Name**: `noeliq` (or `noeliq-app`)
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 4.2 Set Frontend Environment Variables

```bash
# API Base URL (your backend URL)
VITE_API_BASE_URL=https://noeliq-api.vercel.app/api
```

### 4.3 Update Frontend API Client

Update `frontend/src/lib/apiClient.ts` to use environment variable:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
```

(Already configured!)

### 4.4 Deploy Frontend

Click "Deploy". Frontend will be available at: `https://noeliq.vercel.app`

## Step 5: Configure CORS

The backend needs to allow requests from the frontend domain.

Update `backend/app.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://noeliq.vercel.app',
    'https://noeliq-*.vercel.app', // Preview deployments
  ],
  credentials: true,
}))
```

## Step 6: Test Deployment

1. Visit frontend URL: `https://noeliq.vercel.app`
2. Open browser console
3. Set auth token: `localStorage.setItem('noeliq_token', 'staff-access')`
4. Refresh and test a query

## Troubleshooting

### Backend Not Starting

- Check Vercel function logs
- Verify all environment variables are set
- Check `backend/package.json` has correct entry point

### CORS Errors

- Verify CORS configuration includes frontend domain
- Check backend allows OPTIONS requests

### API Timeouts

- Vercel has 10s timeout for free tier (60s for Pro)
- Consider using Vercel Pro or optimizing response time
- For long operations, use background jobs

### Environment Variables Not Loading

- Ensure variables are set for correct environment (Production/Preview)
- Restart deployment after adding variables
- Check variable names match exactly (case-sensitive)

## Production Checklist

- [ ] All environment variables configured in Vercel
- [ ] CORS configured for frontend domain
- [ ] Authentication tokens secured (not in code)
- [ ] Frontend API URL points to backend
- [ ] Test queries working
- [ ] Store selector working
- [ ] Product search working
- [ ] Error handling working

## Monitoring

- **Vercel Dashboard**: View deployments, logs, analytics
- **Function Logs**: Check backend execution logs
- **Analytics**: Track frontend performance

## Next Steps

1. Set up custom domains (optional)
2. Configure monitoring/alerting
3. Set up CI/CD for auto-deployment
4. Add error tracking (e.g., Sentry)
5. Optimize performance

## Support

For issues:
- Check Vercel deployment logs
- Review environment variables
- Test locally first
- Check Azure service status
