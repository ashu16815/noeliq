# Vercel Deployment Setup

## Overview

We'll deploy **two separate projects** on Vercel:
1. **Backend API** (`noeliq-api`) - Node.js serverless functions
2. **Frontend** (`noeliq`) - Static React site

## Prerequisites

- GitHub repository created and pushed (see SETUP_GITHUB.md)
- Vercel account (sign up at https://vercel.com)

## Part 1: Deploy Backend API

### 1. Create Backend Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `noeliq` repository
5. Click **"Import"**

### 2. Configure Backend Project

In the project configuration:

**Root Directory:**
- Click "Edit" next to Root Directory
- Change to: `backend`
- Click "Save"

**Framework Preset:**
- Select: **Other**

**Build Settings:**
- **Build Command**: (leave empty)
- **Output Directory**: (leave empty)
- **Install Command**: `npm install`

**Project Name:**
- Change to: `noeliq-api` (or keep default)

### 3. Add Backend Environment Variables

**Before deploying**, click **"Environment Variables"** and add ALL required variables:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-actual-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Azure AI Search Configuration
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-actual-search-api-key-here
AZURE_SEARCH_INDEX_NAME=noeliq-products

# Server Configuration
PORT=5000
NODE_ENV=production

# Authentication Tokens (generate secure tokens)
ADMIN_TOKEN=generate-secure-admin-token
STAFF_TOKEN=generate-secure-staff-token

# RAG Configuration
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false

# Turn Orchestrator (recommended for production)
USE_TURN_ORCHESTRATOR=true
```

**Important:**
- Click **"Add"** after each variable
- Select **Production**, **Preview**, and **Development** for each
- Replace `your-actual-*-key-here` with real values from your `.env` file
- Generate secure tokens: `openssl rand -hex 32` (for ADMIN_TOKEN and STAFF_TOKEN)
- See `VERCEL_ENV_VARS.md` for optional advanced configuration variables

### 4. Deploy Backend

1. Click **"Deploy"**
2. Wait for deployment to complete
3. **Copy the deployment URL** (e.g., `https://noeliq-api-xxx.vercel.app`)

## Part 2: Deploy Frontend

### 1. Create Frontend Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `noeliq` repository (same repo!)
5. Click **"Import"**

### 2. Configure Frontend Project

**Root Directory:**
- Change to: `frontend`

**Framework Preset:**
- Select: **Vite**

**Build Settings:**
- **Build Command**: `npm run build` (auto-filled)
- **Output Directory**: `dist` (auto-filled)
- **Install Command**: `npm install` (auto-filled)

**Project Name:**
- Keep as: `noeliq` (or change if you prefer)

### 3. Add Frontend Environment Variables

Add **ONE** environment variable:

```bash
VITE_API_BASE_URL=https://noeliq-api-xxx.vercel.app/api
```

**Important:** Replace `xxx` with your actual backend deployment URL!

### 4. Deploy Frontend

1. Click **"Deploy"**
2. Wait for deployment
3. **Copy the frontend URL** (e.g., `https://noeliq.vercel.app`)

## Part 3: Update CORS

After both deployments, update backend CORS to include frontend URL:

1. Go to backend project in Vercel
2. Edit `backend/app.js` (via GitHub)
3. Update CORS origin to include your frontend URL
4. Push changes → Vercel auto-redeploys

## Part 4: Test Deployment

1. Visit your frontend URL: `https://noeliq.vercel.app`
2. Open browser console (F12)
3. Set auth token:
   ```javascript
   localStorage.setItem('noeliq_token', 'staff-access')
   ```
4. Refresh page
5. Test a query!

## Troubleshooting

### Backend not working?
- Check Vercel Function Logs
- Verify all environment variables are set correctly
- Check backend logs in Vercel dashboard

### CORS errors?
- Ensure frontend URL is in backend CORS config
- Check backend environment variables
- Verify backend is deployed and accessible

### API timeouts?
- Vercel free tier: 10s timeout
- Vercel Pro: 60s timeout
- Optimize queries or upgrade plan

## URLs Reference

- **Backend**: `https://noeliq-api.vercel.app`
- **Frontend**: `https://noeliq.vercel.app`

Save these URLs for configuration!
