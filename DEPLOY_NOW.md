# Quick Deploy to Vercel

## ✅ Step 1: Deploy Backend

```bash
cd backend
vercel --prod
```

**When prompted:**
- Set up and deploy? **Yes**
- Which scope? **Select your account**
- Link to existing project? **No** (or Yes if you have one)
- Project name? **noeliq-api** (or your choice)
- Directory? **./** (current directory)
- Override settings? **No**

**After deployment:**
- Copy the deployment URL (e.g., `https://noeliq-api-xxx.vercel.app`)

## ✅ Step 2: Set Backend Environment Variables

Before the backend will work, set environment variables:

```bash
cd backend
vercel env add AZURE_OPENAI_ENDPOINT production
# Paste: https://your-resource.openai.azure.com/
# Repeat for preview and development

vercel env add AZURE_OPENAI_API_KEY production
# Paste your actual API key
# Repeat for preview and development

# Continue for all variables (see VERCEL_ENV_VARS.md)
```

**Or use Vercel Dashboard:**
1. Go to https://vercel.com
2. Select your `noeliq-api` project
3. Settings → Environment Variables
4. Add all variables from `VERCEL_ENV_VARS.md`

## ✅ Step 3: Update Frontend Config

After backend deploys, update `frontend/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://noeliq-api-xxx.vercel.app/api/$1"
    }
  ]
}
```

Replace `xxx` with your actual backend URL.

## ✅ Step 4: Deploy Frontend

```bash
cd frontend
vercel --prod
```

**When prompted:**
- Link to existing project? **No**
- Project name? **noeliq** (or your choice)
- Directory? **./** (current directory)

## ✅ Step 5: Set Frontend Environment Variable

```bash
cd frontend
vercel env add VITE_API_BASE_URL production
# Paste: https://noeliq-api-xxx.vercel.app/api
```

## ✅ Step 6: Redeploy

After setting environment variables, redeploy:

```bash
# Backend
cd backend
vercel --prod

# Frontend
cd frontend
vercel --prod
```

## 🎉 Done!

Your app should be live at:
- **Backend**: `https://noeliq-api-xxx.vercel.app`
- **Frontend**: `https://noeliq-xxx.vercel.app`

