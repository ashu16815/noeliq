# Quick Deployment Guide

## 1. Initialize Git & Push to GitHub

```bash
cd /Users/323905/Documents/VibeCoding/NoelIQ

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: NoelIQ retail assistant"

# Create GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/noeliq.git
git branch -M main
git push -u origin main
```

**OR** create repo on GitHub.com first, then push.

## 2. Deploy Backend to Vercel

1. Go to: https://vercel.com/dashboard → "Add New" → "Project"
2. Import GitHub repo: `noeliq`
3. Configure:
   - **Root Directory**: `backend`
   - **Project Name**: `noeliq-api`
   - **Framework**: Other
4. **Environment Variables** (add all):
   ```
   AZURE_OPENAI_ENDPOINT=...
   AZURE_OPENAI_API_KEY=...
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini
   AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large
   AZURE_SEARCH_ENDPOINT=...
   AZURE_SEARCH_API_KEY=...
   AZURE_SEARCH_INDEX_NAME=noeliq-products
   PORT=5000
   NODE_ENV=production
   ADMIN_TOKEN=...
   STAFF_TOKEN=...
   RAG_CHUNK_LIMIT=5
   USE_OPTIMIZED_RAG=false
   ```
5. Deploy → Get backend URL: `https://noeliq-api.vercel.app`

## 3. Deploy Frontend to Vercel

1. Go to: https://vercel.com/dashboard → "Add New" → "Project"
2. Import same repo: `noeliq`
3. Configure:
   - **Root Directory**: `frontend`
   - **Project Name**: `noeliq`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   ```
   VITE_API_BASE_URL=https://noeliq-api.vercel.app/api
   ```
5. Deploy → Get frontend URL: `https://noeliq.vercel.app`

## 4. Update Backend CORS

Update `backend/app.js` to allow frontend domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://noeliq.vercel.app',
    'https://noeliq-*.vercel.app',
  ],
  credentials: true,
}))
```

Then redeploy backend.

## 5. Test

Visit: `https://noeliq.vercel.app`
1. Open console
2. `localStorage.setItem('noeliq_token', 'staff-access')`
3. Refresh and test!

See `docs/DEPLOYMENT.md` for detailed guide.
