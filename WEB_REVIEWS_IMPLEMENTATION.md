# Web Enriched Reviews & Comparison - Implementation Summary

## Overview

This implementation adds web review and comparison capabilities to NoelIQ, allowing the system to fetch and summarize customer reviews from the web to enrich product answers.

## What's Been Implemented

### ✅ Backend Services

1. **webReviewService.js**
   - Fetches web reviews using Azure Bing Search API
   - Builds product-specific search queries (e.g., "iPhone 15 review", "Samsung Galaxy S24 pros cons")
   - Summarizes results using LLM into structured JSON
   - Returns: overall_sentiment, top_pros, top_cons, best_for, not_ideal_for, notable_issues

2. **webComparisonService.js**
   - Compares two SKUs using web search
   - Fetches comparison articles and reviews
   - Summarizes into structured comparison data
   - Returns: headline_summary, areas_better_for_left/right, recommendation_by_use_case

3. **webReviewCache.js**
   - Caches review and comparison results with 7-day TTL
   - Prevents repeated API calls for same SKUs
   - Handles cache expiration automatically
   - Uses dbClient for persistent storage

4. **turnOrchestratorService.js** (Updated)
   - Integrated web review fetching (Step 8.5)
   - Fetches reviews for active SKU when available
   - Fetches comparisons when compare intent is detected
   - Gracefully handles failures (continues without web data)

5. **generationService.js** (Updated)
   - Added web_review_summary and web_comparison_summary parameters
   - Includes web review/comparison context in LLM prompt
   - Updated system prompt to handle web data safely
   - Extended response schema to include customer_voice and comparison_voice fields

6. **dbClient.js** (Updated)
   - Added getWebReviewCache() and setWebReviewCache() methods
   - Handles web review cache storage

### ✅ Configuration

- **env.template** updated with web review configuration
- Environment variables:
  - `USE_WEB_REVIEWS=false` (enable feature)
  - `WEB_SEARCH_ENDPOINT` (Azure Bing Search API endpoint)
  - `WEB_SEARCH_API_KEY` (API key)
  - `WEB_SEARCH_REGION=en-NZ` (market region)
  - `WEB_SEARCH_MAX_RESULTS=8` (max results per query)
  - `WEB_REVIEW_CACHE_TTL_DAYS=7` (cache expiration)

## How It Works

### Review Flow

1. User asks about a product (e.g., "Tell me about iPhone 15")
2. Turn orchestrator detects active SKU and product metadata
3. If `USE_WEB_REVIEWS=true`, webReviewCache checks for cached review
4. If not cached, webReviewService:
   - Builds search queries (e.g., "iPhone 15 review", "iPhone 15 customer reviews")
   - Calls Azure Bing Search API
   - Summarizes results using LLM
   - Caches result for 7 days
5. Web review summary passed to generationService
6. LLM incorporates web review data into answer
7. Response includes customer_voice section

### Comparison Flow

1. User asks to compare (e.g., "Compare iPhone 15 with Galaxy S24")
2. Intent classifier detects compare intent
3. Turn orchestrator fetches comparison for both SKUs
4. webComparisonService:
   - Searches for comparison articles
   - Summarizes into structured comparison
   - Caches result
5. Comparison data included in LLM prompt
6. Response includes comparison_voice section

## Safety & Compliance

- ✅ Never quotes specific sources or reviewers
- ✅ Never stores full copyrighted text (only summaries)
- ✅ Uses generic phrasing: "Reviewers often say...", "Customers commonly report..."
- ✅ Internal data always wins in conflicts
- ✅ Graceful fallback if web search fails
- ✅ All web access is server-side (browser never calls external APIs)

## Next Steps (UI Components)

### Pending Implementation

1. **CustomerVoicePanel.tsx**
   - Display customer_voice data from API response
   - Show top_pros with 👍 icons
   - Show top_cons with ⚠️ icons
   - Display best_for and not_ideal_for as chips
   - Show notable_issues as subtle warnings

2. **ComparisonPanel.tsx**
   - Display comparison_voice when enabled
   - Side-by-side comparison layout
   - Show areas_better_left/right
   - Display recommendation_by_use_case
   - Show tie_or_neutral_areas

3. **AnswerCard.tsx** (Update)
   - Integrate CustomerVoicePanel
   - Integrate ComparisonPanel
   - Render below main summary

## Testing

### Enable Feature

1. Set environment variable: `USE_WEB_REVIEWS=true`
2. Configure Azure Bing Search API:
   - `WEB_SEARCH_ENDPOINT=https://api.bing.microsoft.com/v7.0/search`
   - `WEB_SEARCH_API_KEY=your-key-here`
3. Restart backend

### Test Queries

- "Tell me about iPhone 15" → Should fetch web reviews
- "Compare iPhone 15 with Galaxy S24" → Should fetch comparison
- Check logs for: `[WebReview]` and `[WebComparison]` messages

## API Response Structure

The API response now includes:

```json
{
  "summary": "...",
  "key_points": [...],
  "customer_voice": {
    "overall_sentiment": "mostly positive",
    "top_pros": ["Great camera", "Long battery life"],
    "top_cons": ["Pricey", "Heavy"],
    "best_for": ["Photography", "Social media"],
    "not_ideal_for": ["Budget buyers"],
    "notable_issues": ["Some users report slow updates"]
  },
  "comparison_voice": {
    "enabled": true,
    "headline_summary": "...",
    "areas_better_left": [...],
    "areas_better_right": [...],
    "recommendation_by_use_case": [...]
  }
}
```

## Notes

- Web reviews are optional - system works fine without them
- Caching prevents API rate limits
- All web data is summarized, never raw text
- Internal product data remains source of truth
- Web data is enrichment only

