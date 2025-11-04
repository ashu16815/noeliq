# Frontend Environment Variable Setup

## Quick Setup

On the Vercel Environment Variables page for your **frontend** project:

### Add This Variable:

**Key:**
```
VITE_API_BASE_URL
```

**Value:**
```
https://backend-ovaqgrhci-ashu16815-gmailcoms-projects.vercel.app/api
```

### Steps:

1. **Key Field**: Type `VITE_API_BASE_URL`
2. **Value Field**: Type `https://backend-ovaqgrhci-ashu16815-gmailcoms-projects.vercel.app/api`
3. **Environments**: Select "All Environments" (or individually select Production, Preview, Development)
4. Click **"Save"** button
5. After saving, **redeploy** the frontend:
   ```bash
   cd frontend
   vercel --prod
   ```

## Why This Is Needed

The frontend needs to know where the backend API is located. The `VITE_API_BASE_URL` environment variable is used in `frontend/src/lib/apiClient.ts` to configure the API base URL.

## Verification

After setting and redeploying, test by:
1. Visiting your frontend URL
2. Opening browser console (F12)
3. Check Network tab - API calls should go to the backend URL

## Troubleshooting

- **CORS errors?** Make sure backend CORS allows your frontend URL
- **404 errors?** Verify the backend URL is correct and backend is deployed
- **Still not working?** Check Vercel deployment logs for both frontend and backend

