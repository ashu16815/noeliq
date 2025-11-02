# Deployment Checklist

## ✅ Pre-Deployment

- [x] Git repository initialized
- [x] Files committed
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Vercel account created

## 🚀 Backend Deployment (`noeliq-api`)

- [ ] Project created in Vercel
- [ ] Root directory set to `backend`
- [ ] Environment variables added:
  - [ ] `AZURE_OPENAI_ENDPOINT`
  - [ ] `AZURE_OPENAI_API_KEY`
  - [ ] `AZURE_OPENAI_DEPLOYMENT_NAME`
  - [ ] `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`
  - [ ] `AZURE_SEARCH_ENDPOINT`
  - [ ] `AZURE_SEARCH_API_KEY`
  - [ ] `AZURE_SEARCH_INDEX_NAME`
  - [ ] `PORT=5000`
  - [ ] `NODE_ENV=production`
  - [ ] `ADMIN_TOKEN`
  - [ ] `STAFF_TOKEN`
  - [ ] `RAG_CHUNK_LIMIT=5`
  - [ ] `USE_OPTIMIZED_RAG=false`
- [ ] Deployed successfully
- [ ] Backend URL saved: `https://________________.vercel.app`

## 🎨 Frontend Deployment (`noeliq`)

- [ ] Project created in Vercel
- [ ] Root directory set to `frontend`
- [ ] Framework preset: Vite
- [ ] Environment variable added:
  - [ ] `VITE_API_BASE_URL=https://noeliq-api-xxx.vercel.app/api`
- [ ] Deployed successfully
- [ ] Frontend URL saved: `https://________________.vercel.app`

## 🔧 Post-Deployment

- [ ] Updated backend CORS with frontend URL
- [ ] Tested frontend loads correctly
- [ ] Tested authentication (set token in console)
- [ ] Tested product search
- [ ] Tested store selection
- [ ] Tested query functionality

## 📝 Notes

Backend URL: _____________________________________

Frontend URL: _____________________________________

Test Date: _____________________________________

Issues Found: _____________________________________

