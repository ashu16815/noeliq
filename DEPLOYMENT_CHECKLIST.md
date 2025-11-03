# NoelIQ Deployment Checklist

Complete deployment guide for GitHub and Vercel (Backend + Frontend separate deployments).

## Prerequisites

- [ ] GitHub account and repository created
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] Azure OpenAI credentials (endpoint, API key, deployment names)
- [ ] Azure AI Search credentials (endpoint, API key, index name)

---

## Step 1: Prepare for GitHub

### 1.1 Verify `.gitignore`

Ensure `.gitignore` includes:
- `.env` files
- `node_modules/`
- `backend/data/*.json` (but keep `.gitkeep`)
- Build outputs

### 1.2 Commit and Push to GitHub

```bash
# Check git status
git status

# Add all files (except those in .gitignore)
git add .

# Commit
git commit -m "Initial commit: NoelIQ backend and frontend"

# Push to GitHub
git push origin main
```

**Verify on GitHub**: Check that `.env` files are NOT visible in the repository.

---

## Step 2: Deploy Backend to Vercel

### 2.1 Create Backend Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `NoelIQ` repository
5. Click **"Import"**

### 2.2 Configure Backend Project

**Root Directory:**
- Click **"Edit"** next to Root Directory
- Change to: `backend`
- Click **"Save"**

**Framework Preset:**
- Select: **Other**

**Build Settings:**
- **Build Command**: (leave empty)
- **Output Directory**: (leave empty)
- **Install Command**: `npm install`

**Project Name:**
- Change to: `noeliq-api` (or your preferred name)

### 2.3 Add Backend Environment Variables

**Before deploying**, click **"Environment Variables"** and add ALL of these:

#### Required Variables (Copy from your local `.env`):

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Azure AI Search Configuration
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-search-api-key-here
AZURE_SEARCH_INDEX_NAME=noeliq-products

# Server Configuration
PORT=5000
NODE_ENV=production

# Authentication Tokens (generate secure tokens)
ADMIN_TOKEN=your-secure-admin-token-here
STAFF_TOKEN=your-secure-staff-token-here

# RAG Configuration
RAG_CHUNK_LIMIT=5
USE_OPTIMIZED_RAG=false

# Turn Orchestrator (recommended for production)
USE_TURN_ORCHESTRATOR=true
```

**Important:**
- Click **"Add"** after each variable
- Select **Production**, **Preview**, and **Development** for each variable
- Replace `your-*-key-here` with actual values from your local `.env` file
- Generate secure tokens: `openssl rand -hex 32` (for ADMIN_TOKEN and STAFF_TOKEN)

### 2.4 Deploy Backend

1. Click **"Deploy"**
2. Wait for deployment to complete (2-5 minutes)
3. **Copy the deployment URL** (e.g., `https://noeliq-api-xxx.vercel.app`)
4. Test the API endpoint: `https://noeliq-api-xxx.vercel.app/api/stores`

**Save this URL** - you'll need it for the frontend configuration!

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Frontend Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `NoelIQ` repository (same repo!)
5. Click **"Import"**

### 3.2 Configure Frontend Project

**Root Directory:**
- Click **"Edit"** next to Root Directory
- Change to: `frontend`
- Click **"Save"**

**Framework Preset:**
- Select: **Vite**

**Build Settings:**
- **Build Command**: `npm run build` (auto-filled)
- **Output Directory**: `dist` (auto-filled)
- **Install Command**: `npm install` (auto-filled)

**Project Name:**
- Keep as: `noeliq` (or your preferred name)

### 3.3 Add Frontend Environment Variables

Add **ONE** environment variable:

```bash
VITE_API_BASE_URL=https://noeliq-api-xxx.vercel.app/api
```

**Important:**
- Replace `xxx` with your actual backend deployment URL from Step 2.4!
- Select **Production**, **Preview**, and **Development**
- Click **"Save"**

### 3.4 Deploy Frontend

1. Click **"Deploy"**
2. Wait for deployment to complete (2-5 minutes)
3. **Copy the frontend URL** (e.g., `https://noeliq.vercel.app`)

---

## Step 4: Update CORS Configuration

After both deployments, update backend CORS to allow frontend requests:

1. Go to your backend project in Vercel
2. Edit `backend/app.js` via GitHub or local
3. Update CORS origin to include your frontend URL:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://noeliq.vercel.app',  // Add your frontend URL here
  'https://noeliq-*.vercel.app', // Allow preview deployments
]
```

4. Commit and push changes:
```bash
git add backend/app.js
git commit -m "Update CORS for production frontend URL"
git push origin main
```

5. Vercel will auto-redeploy the backend with the new CORS config

---

## Step 5: Verify Deployment

### 5.1 Test Backend API

```bash
# Test stores endpoint
curl https://noeliq-api-xxx.vercel.app/api/stores

# Test with auth (replace YOUR_STAFF_TOKEN)
curl -H "Authorization: Bearer YOUR_STAFF_TOKEN" \
  https://noeliq-api-xxx.vercel.app/api/ask \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"question": "test query"}'
```

### 5.2 Test Frontend

1. Visit your frontend URL: `https://noeliq.vercel.app`
2. Open browser console (F12)
3. Set auth token:
   ```javascript
   localStorage.setItem('noeliq_token', 'YOUR_STAFF_TOKEN')
   ```
4. Refresh page
5. Test a query (e.g., "find laptop below 1000")

### 5.3 Check Logs

- **Backend logs**: Vercel Dashboard → Backend Project → Functions → View Logs
- **Frontend logs**: Browser Console (F12)

---

## Step 6: Environment Variable Verification

### 6.1 Backend Variables Checklist

Verify all these are set in Vercel (Backend Project):

- [ ] `AZURE_OPENAI_ENDPOINT`
- [ ] `AZURE_OPENAI_API_KEY`
- [ ] `AZURE_OPENAI_DEPLOYMENT_NAME`
- [ ] `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`
- [ ] `AZURE_SEARCH_ENDPOINT`
- [ ] `AZURE_SEARCH_API_KEY`
- [ ] `AZURE_SEARCH_INDEX_NAME`
- [ ] `PORT`
- [ ] `NODE_ENV` (should be `production`)
- [ ] `ADMIN_TOKEN`
- [ ] `STAFF_TOKEN`
- [ ] `RAG_CHUNK_LIMIT`
- [ ] `USE_OPTIMIZED_RAG`
- [ ] `USE_TURN_ORCHESTRATOR` (recommended: `true`)

### 6.2 Frontend Variables Checklist

Verify this is set in Vercel (Frontend Project):

- [ ] `VITE_API_BASE_URL` (should point to backend API URL)

---

## Troubleshooting

### Backend not working?

- [ ] Check Vercel Function Logs (Dashboard → Functions → Logs)
- [ ] Verify all environment variables are set correctly
- [ ] Check backend logs in Vercel dashboard
- [ ] Ensure `USE_TURN_ORCHESTRATOR=true` if using new pipeline

### CORS errors?

- [ ] Ensure frontend URL is in backend CORS config
- [ ] Check backend environment variables are set
- [ ] Verify backend is deployed and accessible
- [ ] Test backend URL directly: `curl https://noeliq-api-xxx.vercel.app/api/stores`

### API timeouts?

- [ ] **Vercel Free tier**: 10s timeout limit
- [ ] **Vercel Pro**: 60s timeout limit
- [ ] Turn orchestrator can take 20-40 seconds
- [ ] Consider upgrading to Vercel Pro or optimizing queries

### Frontend can't connect to backend?

- [ ] Verify `VITE_API_BASE_URL` is set correctly
- [ ] Check backend URL is accessible
- [ ] Ensure backend is deployed successfully
- [ ] Check browser console for errors

### Environment variables not working?

- [ ] Ensure variables are set for **Production**, **Preview**, and **Development**
- [ ] Redeploy after adding/updating variables
- [ ] Check variable names match exactly (case-sensitive)
- [ ] Verify no extra spaces or quotes in values

---

## URLs Reference

Save these URLs for reference:

- **Backend API**: `https://noeliq-api-xxx.vercel.app`
- **Frontend**: `https://noeliq.vercel.app`
- **GitHub Repo**: `https://github.com/your-username/NoelIQ`

---

## Next Steps

After successful deployment:

1. [ ] Set up custom domains (optional)
2. [ ] Configure monitoring and alerts
3. [ ] Set up CI/CD for automatic deployments
4. [ ] Document API endpoints for team
5. [ ] Set up error tracking (e.g., Sentry)

---

## Security Checklist

- [ ] Never commit `.env` files to Git
- [ ] Use secure, randomly generated tokens for `ADMIN_TOKEN` and `STAFF_TOKEN`
- [ ] Rotate API keys periodically
- [ ] Use different tokens for production vs development
- [ ] Enable Vercel environment variable encryption
- [ ] Review and restrict CORS origins
- [ ] Monitor API usage and costs

---

## Support

If you encounter issues:

1. Check Vercel Function Logs
2. Review browser console errors
3. Verify all environment variables
4. Test backend API directly with `curl`
5. Check GitHub Actions (if using CI/CD)
