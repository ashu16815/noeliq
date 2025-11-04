# Better Vercel Deployment Strategy

## Problem with Current Approach

1. **URLs change with each deployment** - Each deployment gets a new hash in the URL
2. **Manual env var updates** - Frontend env var must be updated after every backend deployment
3. **Maintenance overhead** - Two separate projects to manage
4. **401 errors** - Frontend points to old backend URLs

## Recommended Solution: Single Vercel Project (Monorepo)

Deploy both frontend and backend from **one Vercel project** using routes.

### Benefits:
- ✅ Single URL for both frontend and backend
- ✅ No need to update frontend env vars
- ✅ Simpler CORS configuration
- ✅ Easier to manage
- ✅ Better for preview deployments

### How It Works:

```
Your Domain: https://noeliq.vercel.app
├── /api/* → Backend API (Node.js serverless functions)
└── /* → Frontend (React static files)
```

## Implementation Steps

### Step 1: Restructure for Single Project

1. **Create root `vercel.json`** (already exists, needs update)
2. **Move API routes to serverless functions** OR keep Express app
3. **Configure routes** to serve frontend and backend

### Step 2: Update vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/package.json",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "buildCommand": "npm run build",
        "outputDirectory": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/app.js"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/dist/$1"
    }
  ]
}
```

### Step 3: Update Frontend API Client

Since API is on same domain, use relative URLs:

```typescript
const API_BASE_URL = '/api'  // Same domain, no env var needed!
```

### Step 4: Deploy Single Project

1. Go to Vercel Dashboard
2. Delete existing separate projects (or keep them as backup)
3. Create NEW project from same repo
4. **Root Directory**: Leave as root (`.`)
5. Set all environment variables in ONE place
6. Deploy

## Alternative: Use Custom Domain (Easier, No Code Changes)

### Option A: Custom Domain for Backend

1. In Vercel Dashboard → Backend project → Settings → Domains
2. Add custom domain: `api.noeliq.com` (or your domain)
3. Update frontend env var once: `VITE_API_BASE_URL=https://api.noeliq.com/api`
4. URLs won't change anymore!

### Option B: Vercel Project Aliases

1. Use Vercel's project aliases feature
2. Set backend alias: `backend.noeliq.vercel.app`
3. Set frontend alias: `noeliq.vercel.app`
4. URLs stay stable

## Quick Fix for Current Issue (Immediate)

The frontend is calling `backend-mauve-five-83.vercel.app` (old URL).

**Fix:**
1. Go to Vercel Dashboard → Frontend project → Settings → Environment Variables
2. Update `VITE_API_BASE_URL` to:
   ```
   https://backend-qi098tcez-ashu16815-gmailcoms-projects.vercel.app/api
   ```
3. Redeploy frontend

**But this will break again on next backend deployment!**

## Recommended: Single Project Approach

I recommend implementing the single project approach. It's more maintainable and solves the URL problem permanently.

Would you like me to:
1. ✅ Implement single project setup (requires code changes)
2. ✅ Set up custom domain (requires domain purchase)
3. ✅ Just fix the immediate issue (temporary)

