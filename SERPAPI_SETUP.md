# SerpAPI Setup Guide for Web Reviews

## Overview

NoelIQ now uses SerpAPI (Google Search) for web review enrichment instead of Bing Search APIs.

## Setup Steps

### 1. Get SerpAPI Key

1. Go to https://serpapi.com/
2. Sign up for an account
3. Get your API key from the dashboard
4. Note: Free tier has limited requests, paid plans available

### 2. Configure Environment Variables

Add these to `backend/.env`:

```bash
# Enable web reviews
USE_WEB_REVIEWS=true

# SerpAPI Configuration
SERPAPI_ENDPOINT=https://serpapi.com/search.json
SERPAPI_API_KEY=your-serpapi-key-here
SERPAPI_LOCATION="Auckland, New Zealand"
SERPAPI_GL=nz
SERPAPI_HL=en
SERPAPI_RESULTS_PER_QUERY=8
```

### 3. For Vercel Deployment

Add these environment variables in Vercel Dashboard:

1. Go to your backend project → Settings → Environment Variables
2. Add:
   - `USE_WEB_REVIEWS=true`
   - `SERPAPI_ENDPOINT=https://serpapi.com/search.json`
   - `SERPAPI_API_KEY=your-key-here`
   - `SERPAPI_LOCATION=Auckland, New Zealand`
   - `SERPAPI_GL=nz`
   - `SERPAPI_HL=en`
   - `SERPAPI_RESULTS_PER_QUERY=8`

### 4. Test the Configuration

```bash
cd backend
node test-serpapi.js
```

This will test:
- ✅ API key validity
- ✅ Endpoint connectivity
- ✅ Query execution
- ✅ Result extraction

## How It Works

### For Single Product Reviews

1. User asks about a product (e.g., "Tell me about iPhone 15")
2. System builds queries: `"iPhone 15 review pros cons"`, `"iPhone 15 customer reviews"`
3. SerpAPI searches Google and returns organic results
4. LLM summarizes results into structured JSON:
   ```json
   {
     "overall_sentiment": "mostly positive",
     "top_pros": ["Great camera", "Long battery life"],
     "top_cons": ["Pricey", "Heavy"],
     "best_for": ["Photography", "Social media"],
     "not_ideal_for": ["Budget buyers"],
     "notable_issues": ["Some users report slow updates"]
   }
   ```
5. Results cached for 7 days
6. Included in LLM prompt as `customer_voice`

### For Product Comparisons

1. User asks to compare (e.g., "Compare iPhone 15 with Galaxy S24")
2. System builds queries: `"iPhone 15 vs Galaxy S24"`, `"iPhone 15 review"`, `"Galaxy S24 review"`
3. SerpAPI searches for comparison articles
4. LLM synthesizes comparison:
   ```json
   {
     "headline_summary": "Galaxy offers better camera flexibility; iPhone wins on ecosystem.",
     "areas_better_for_left": ["customisation", "screen brightness"],
     "areas_better_for_right": ["video recording", "integration with Mac/iPad"],
     "recommendation_by_use_case": [...]
   }
   ```
5. Included in LLM prompt as `comparison_voice`

## Features

- ✅ Uses Google Search via SerpAPI (reliable, widely available)
- ✅ New Zealand location bias (`location: "Auckland, New Zealand"`)
- ✅ Caches results for 7 days (prevents rate limits)
- ✅ Graceful fallback (system continues without web data if API fails)
- ✅ Safe, compliant (no source attribution, only summaries)
- ✅ LLM summarization (no verbatim quotes)

## Cost Considerations

- SerpAPI has free tier with limited requests
- Paid plans available for higher volume
- Results are cached for 7 days to minimize API calls
- System works without web reviews if API unavailable

## Troubleshooting

### Test Command
```bash
cd backend
node test-serpapi.js
```

### Common Issues

1. **401 Unauthorized**: API key is invalid or expired
   - Check key in SerpAPI dashboard
   - Verify key is active

2. **429 Rate Limit**: Too many requests
   - Wait a moment and retry
   - Check your SerpAPI plan limits

3. **No Results**: Query might be too specific
   - System will gracefully continue without web data
   - Check logs for specific error messages

## Notes

- SerpAPI uses Google Search, so results are comprehensive
- Location bias ensures NZ-relevant results
- All web data is summarized by LLM (no verbatim quotes)
- System continues without web data if API fails

