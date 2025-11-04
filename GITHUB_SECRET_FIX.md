# Fixing GitHub Secret Detection

GitHub detected secrets in your commit history. You have two options:

## Option 1: Allow Secrets (for test/development keys only)

If these are test or development keys, you can temporarily allow them:

1. Click these GitHub links to allow the secrets:
   - [Allow Azure OpenAI Key](https://github.com/ashu16815/noeliq/security/secret-scanning/unblock-secret/34zCjsU2RG5J5R3xTYj0f3aeyCI)
   - [Allow Azure Search Admin Key](https://github.com/ashu16815/noeliq/security/secret-scanning/unblock-secret/34zCjxsAVyAXHUsmWV5Yb4EWHWa)

2. After allowing, push again:
   ```bash
   git push origin main
   ```

**⚠️ Warning**: Only do this for test/development keys. For production keys, use Option 2.

## Option 2: Remove Secrets from History (recommended)

Remove secrets from all commits using `git filter-repo`:

```bash
# Install git-filter-repo (if not installed)
pip install git-filter-repo

# Remove secrets from history
git filter-repo --path backend/ENV.md --path set-vercel-env.sh --path create-index-rest.sh --invert-paths

# Force push (warning: this rewrites history)
git push origin main --force
```

## Option 3: Start Fresh Branch

If you want to start clean without the secret history:

```bash
# Create a new orphan branch (no history)
git checkout --orphan clean-main
git add .
git commit -m "Initial commit: Clean version without secrets"
git branch -D main
git branch -m main
git push origin main --force
```

## After Fixing

1. **Rotate the keys** that were exposed in Git history
2. **Never commit secrets** again - use `.env` files (already in `.gitignore`)
3. **Use GitHub Secrets** or Vercel environment variables for production

## Next Steps

Once the push succeeds:
1. Deploy to Vercel (see `DEPLOYMENT_CHECKLIST.md`)
2. Set environment variables in Vercel dashboard
3. Never commit actual credentials to Git

