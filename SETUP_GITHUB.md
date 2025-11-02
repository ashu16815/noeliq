# Setting Up GitHub Repository

## Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `noeliq`
3. Description: "AI-powered retail sales assistant for Noel Leeming"
4. Choose: **Public** or **Private** (your choice)
5. ⚠️ **DO NOT** check "Initialize with README" (we already have files)
6. Click "Create repository"

## Step 2: Connect Local Repo to GitHub

After creating the repo, GitHub will show you commands. Run these:

```bash
cd /Users/323905/Documents/VibeCoding/NoelIQ

# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/noeliq.git
git branch -M main
git push -u origin main
```

**OR** if you prefer SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/noeliq.git
git branch -M main
git push -u origin main
```

## Step 3: Verify

Check that everything is connected:

```bash
git remote -v
```

You should see:
```
origin  https://github.com/YOUR_USERNAME/noeliq.git (fetch)
origin  https://github.com/YOUR_USERNAME/noeliq.git (push)
```

## Troubleshooting

### Authentication Issues

If you get authentication errors:
- Use GitHub Personal Access Token instead of password
- Generate token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Use token as password when prompted

### Large Files

If you get errors about large files, check `.gitignore` includes:
- `*.xml` (XML catalogue files)
- `backend/data/*.json` (data files)
- `node_modules/`
