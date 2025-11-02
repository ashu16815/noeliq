# Azure OpenAI Configuration

## Required Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large
```

## Setup Steps

1. **Create Azure OpenAI Resource**
   - Go to Azure Portal → Create Resource → Azure OpenAI
   - Choose your subscription, resource group, region
   - Select pricing tier (Standard S0 or higher recommended)

2. **Deploy Models**
   - Navigate to your Azure OpenAI resource → Model deployments
   - Deploy `gpt-4o` (or `gpt-4` / `gpt-35-turbo` for testing)
   - Deploy `text-embedding-3-large` for embeddings

3. **Get Endpoint and Key**
   - Go to Keys and Endpoint section
   - Copy the Endpoint URL → `AZURE_OPENAI_ENDPOINT`
   - Copy Key 1 → `AZURE_OPENAI_API_KEY`

4. **Verify Deployments**
   - Check that both chat and embedding deployments are active
   - Note the exact deployment names → use in `AZURE_OPENAI_DEPLOYMENT_NAME` and `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`

## Model Recommendations

- **Chat Model**: `gpt-4o` (best balance of cost and capability) or `gpt-4` for production
- **Embedding Model**: `text-embedding-3-large` (recommended) or `text-embedding-ada-002` (cheaper alternative)

## Rate Limits

- Monitor usage in Azure Portal → Metrics
- Consider request throttling for high-volume stores
- Embeddings are typically faster and cheaper than chat completions

## Security

- Never commit API keys to version control
- Use environment variables or Azure Key Vault in production
- Rotate keys periodically

