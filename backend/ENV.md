# Environment Variables Configuration

## Location

Create a `.env` file in the `backend/` directory:

```
NoelIQ/
└── backend/
    ├── .env          ← CREATE THIS FILE HERE
    ├── app.js
    ├── package.json
    └── ...
```

## Required Variables

Copy the template below into `backend/.env` and fill in your values:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://twg-test-ai1.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

# Azure AI Search Configuration
AZURE_SEARCH_ENDPOINT=https://noeliq-ai-search.search.windows.net
AZURE_SEARCH_API_KEY=your-search-api-key-here
AZURE_SEARCH_INDEX_NAME=noeliq-products

# No database needed - using JSON file storage in backend/data/

# Server Configuration
PORT=5000
NODE_ENV=development

# Authentication Tokens (MVP: simple tokens)
ADMIN_TOKEN=admin-access
STAFF_TOKEN=staff-access
```

## How to Get Azure Credentials

### Azure OpenAI
1. Go to Azure Portal → Your Azure OpenAI resource
2. Go to "Keys and Endpoint" section
3. Copy:
   - **Endpoint** → `AZURE_OPENAI_ENDPOINT`
   - **Key 1** → `AZURE_OPENAI_API_KEY`
4. Go to "Model deployments" and note:
   - Chat model deployment name → `AZURE_OPENAI_DEPLOYMENT_NAME`
   - Embedding model deployment name → `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`

### Azure AI Search
1. Go to Azure Portal → Your Azure AI Search resource
2. Go to "Keys" section
3. Copy:
   - **URL** → `AZURE_SEARCH_ENDPOINT`
   - **admin key** → `AZURE_SEARCH_API_KEY`
4. Use the index name you created → `AZURE_SEARCH_INDEX_NAME`

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` file to git (it's in `.gitignore`)
- Never share your API keys
- Use different tokens for development and production
- Rotate tokens/keys periodically

## Testing Your Configuration

After creating `.env`, test it:

```bash
cd backend
node -e "require('dotenv').config(); console.log('Azure OpenAI Endpoint:', process.env.AZURE_OPENAI_ENDPOINT ? '✓ Set' : '✗ Missing')"
```

## Example `.env` File Structure

Your `backend/.env` should look like this (with real values):

```bash
AZURE_OPENAI_ENDPOINT=https://twg-test-ai1.openai.azure.com/
AZURE_OPENAI_API_KEY=abc123def456...
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large

AZURE_SEARCH_ENDPOINT=https://my-search.search.windows.net
AZURE_SEARCH_API_KEY=xyz789abc123...
AZURE_SEARCH_INDEX_NAME=noeliq-products

PORT=5000
NODE_ENV=development

ADMIN_TOKEN=super-secret-admin-token-2024
STAFF_TOKEN=super-secret-staff-token-2024
```

## Troubleshooting

### Variables not loading?
- Make sure `.env` is in the `backend/` directory (same level as `app.js`)
- Restart your server after creating/updating `.env`
- Check for typos in variable names
- Ensure no quotes around values (unless the value itself needs quotes)

### Getting "undefined" for variables?
- Verify `dotenv.config()` is called in `app.js` (it is!)
- Check file is named exactly `.env` (not `.env.txt` or `.env.example`)
- Make sure you're running from the `backend/` directory

