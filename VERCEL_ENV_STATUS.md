# Vercel Environment Variables Status

## Current Status

✅ **Backend Project** (`backend`) has **14 variables** set for **Production** only.

### Issues Found:

1. ⚠️ **Missing `USE_TURN_ORCHESTRATOR`** variable
2. ⚠️ **Most variables only set for Production** (missing Preview and Development)
3. ⚠️ **`FRONTEND_URL`** only set for Development, Preview, Production (but may need update)

## Required Variables (15 total)

Based on `SINGLE_PROJECT_DEPLOYMENT.md`:

### ✅ Already Set (14/15)
1. `AZURE_OPENAI_ENDPOINT` - ✅ Production only
2. `AZURE_OPENAI_API_KEY` - ✅ Production only
3. `AZURE_OPENAI_DEPLOYMENT_NAME` - ✅ Production only
4. `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` - ✅ Production only
5. `AZURE_SEARCH_ENDPOINT` - ✅ Production only
6. `AZURE_SEARCH_API_KEY` - ✅ Production only
7. `AZURE_SEARCH_INDEX_NAME` - ✅ Production only
8. `PORT` - ✅ Production only
9. `NODE_ENV` - ✅ Production only
10. `ADMIN_TOKEN` - ✅ Production only
11. `STAFF_TOKEN` - ✅ Production only
12. `RAG_CHUNK_LIMIT` - ✅ Production only
13. `USE_OPTIMIZED_RAG` - ✅ Production only
14. `FRONTEND_URL` - ✅ All environments

### ❌ Missing (1/15)
15. `USE_TURN_ORCHESTRATOR` - ❌ **NOT SET**

## Action Required

### Option 1: Add Missing Variable via Dashboard

1. Go to Vercel Dashboard → `backend` project → Settings → Environment Variables
2. Click **"Add New"**
3. Set:
   - Key: `USE_TURN_ORCHESTRATOR`
   - Value: `true`
   - Environments: ☑️ Production, ☑️ Preview, ☑️ Development
4. Click **Save**

### Option 2: Add Missing Variable via CLI

```bash
cd backend
echo "true" | vercel env add USE_TURN_ORCHESTRATOR production
echo "true" | vercel env add USE_TURN_ORCHESTRATOR preview
echo "true" | vercel env add USE_TURN_ORCHESTRATOR development
```

### Option 3: Add All Variables for Preview/Development

Currently, most variables are only set for Production. To add them for Preview and Development:

**Via Dashboard:**
1. For each existing variable, click **Edit**
2. Check ☑️ Preview and ☑️ Development
3. Enter the same value
4. Click **Save**

**Via CLI:**
```bash
cd backend

# For each variable, add for preview and development:
echo "your-value" | vercel env add VARIABLE_NAME preview
echo "your-value" | vercel env add VARIABLE_NAME development
```

## Quick Fix Script

Run this to add `USE_TURN_ORCHESTRATOR` for all environments:

```bash
cd /Users/323905/Documents/VibeCoding/NoelIQ/backend

# Add USE_TURN_ORCHESTRATOR
echo "true" | vercel env add USE_TURN_ORCHESTRATOR production
echo "true" | vercel env add USE_TURN_ORCHESTRATOR preview
echo "true" | vercel env add USE_TURN_ORCHESTRATOR development
```

## Verification

After adding variables:

1. **Check via CLI:**
   ```bash
   cd backend
   vercel env ls
   ```

2. **Check via Dashboard:**
   - Go to Settings → Environment Variables
   - Verify all 15 variables are present
   - Verify each has all 3 environments selected

3. **Redeploy:**
   ```bash
   vercel --prod
   ```

## Summary

- ✅ 14/15 variables already set
- ❌ Missing: `USE_TURN_ORCHESTRATOR`
- ⚠️ Most variables only set for Production (should also set for Preview/Development)

## Next Steps

1. Add `USE_TURN_ORCHESTRATOR=true` for all environments
2. (Optional) Add existing variables for Preview/Development environments
3. Redeploy backend
4. Test deployment

