# Grounding with Bing Search - Important Information

## What You Have

Based on the Azure Portal screenshots, you have:
- **Resource Type:** "Grounding with Bing Search" (Microsoft.BingGroundingSearch)
- **Resource Name:** `noeliq-search`
- **Location:** Global
- **Status:** Active
- **API Key:** `95c2e6c7af5f48b694abbb9cf130939d`

## Critical Finding

⚠️ **This resource is NOT a standalone web search API!**

According to Azure Portal:
- "This resource can only be used as a tool in Azure AI Foundry Agent Service"
- "These keys are used to connect your Grounding with Bing Search resource with Azure AI Foundry Agent Service"

## What This Means

1. **Not a Direct REST API**: This service is designed to be used within Azure AI Foundry, not as a standalone search API
2. **Integration Required**: It's meant to be integrated into Azure AI Foundry Agent Service workflows
3. **Different Use Case**: This is for grounding LLM responses with web search, not for direct web search queries

## Options for NoelIQ

### Option 1: Use Azure OpenAI with Grounding (Recommended)
If you have Azure OpenAI, some models support web grounding:
- Check if your Azure OpenAI deployment supports grounding
- Use the grounding feature in Azure OpenAI API calls
- This would be the most integrated approach

### Option 2: Use Alternative Search APIs
Since direct Bing Search APIs are limited, consider:
- **SerpAPI** - Provides Bing Search API wrapper
- **Zenserp** - Bing Search API service
- **Google Custom Search API** - If you have Google Cloud

### Option 3: Disable Web Reviews (Current Recommendation)
The NoelIQ system works excellently without web reviews:
- Uses internal product data (XML, specs, features)
- Provides comprehensive product information
- No external dependencies
- Set `USE_WEB_REVIEWS=false` in environment variables

### Option 4: Check for Direct Bing Search Resource
You might need to create a separate "Bing Search" resource (not Grounding with Bing Search):
- In Azure Portal, search for "Bing Search"
- Create a new Bing Search resource
- This would give you a direct REST API endpoint

## Current Status

- ✅ Your API key is valid for "Grounding with Bing Search"
- ❌ This service cannot be used as a direct REST API
- ✅ NoelIQ works perfectly without web reviews
- ✅ Web review code is ready if/when you get a direct search API

## Recommendation

For now, **disable web reviews** and use internal product data:

```bash
USE_WEB_REVIEWS=false
```

The system will:
- Use internal product information from XML
- Provide expert-level product recommendations
- Include specs, features, warranty, stock info
- Work reliably without external dependencies

If you want to enable web reviews later:
1. Create a separate "Bing Search" resource in Azure Portal
2. Or use an alternative search API service
3. Update environment variables with the correct endpoint and key

