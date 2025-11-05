// Web Review Service
// Fetches and summarizes web reviews for products using web search API

import axios from 'axios'
import { chatClient } from '../lib/azureOpenAIClient.js'

const webReviewService = {
  /**
   * Get web review summary for a SKU
   * @param {string} sku - Product SKU
   * @param {Object} productMetadata - Product metadata (brand, model, category, price)
   * @returns {Promise<Object>} Review summary
   */
  async getReviewSummary(sku, productMetadata) {
    try {
      console.log(`[WebReview] 🔍 Fetching reviews for SKU ${sku}`)
      
      const { brand, model, category, list_price } = productMetadata || {}
      
      if (!brand || !model) {
        console.warn(`[WebReview] ⚠️ Missing brand/model for SKU ${sku}, skipping web review`)
        return null
      }

      // Build search queries
      const queries = this.buildReviewQueries(brand, model, category)
      
      // Fetch web search results
      const searchResults = await this.performWebSearch(queries)
      
      if (!searchResults || searchResults.length === 0) {
        console.warn(`[WebReview] ⚠️ No search results found for SKU ${sku}`)
        return null
      }

      console.log(`[WebReview] Found ${searchResults.length} search results`)

      // Summarize results using LLM
      const summary = await this.summarizeReviews(searchResults, brand, model, category)
      
      return {
        sku,
        ...summary,
        sources_used_count: searchResults.length,
        last_fetched_at: new Date().toISOString(),
      }
    } catch (error) {
      console.error(`[WebReview] ❌ Error fetching reviews for SKU ${sku}:`, error.message)
      // Don't throw - return null so pipeline continues without web data
      return null
    }
  },

  /**
   * Build review-oriented search queries
   */
  buildReviewQueries(brand, model, category) {
    const baseQueries = [
      `${brand} ${model} review`,
      `${brand} ${model} customer reviews`,
      `${brand} ${model} pros cons`,
    ]

    // Category-specific queries
    if (category?.toLowerCase().includes('phone') || category?.toLowerCase().includes('smartphone')) {
      baseQueries.push(`${brand} ${model} camera battery display review`)
    } else if (category?.toLowerCase().includes('laptop') || category?.toLowerCase().includes('notebook')) {
      baseQueries.push(`${brand} ${model} performance battery review`)
    } else if (category?.toLowerCase().includes('gaming')) {
      baseQueries.push(`${brand} ${model} gaming performance review`)
    }

    return baseQueries
  },

  /**
   * Perform web search using Azure Bing Search API
   */
  async performWebSearch(queries) {
    const searchEndpoint = process.env.WEB_SEARCH_ENDPOINT
    const searchApiKey = process.env.WEB_SEARCH_API_KEY
    const maxResults = parseInt(process.env.WEB_SEARCH_MAX_RESULTS || '8', 10)

    if (!searchEndpoint || !searchApiKey) {
      console.warn(`[WebReview] ⚠️ Web search API not configured (WEB_SEARCH_ENDPOINT or WEB_SEARCH_API_KEY missing)`)
      return []
    }

    try {
      const allResults = []

      // Search for each query
      for (const query of queries.slice(0, 3)) { // Limit to 3 queries to avoid rate limits
        try {
          const response = await axios.get(searchEndpoint, {
            params: {
              q: query,
              count: Math.min(maxResults, 5), // Get 5 results per query
              mkt: process.env.WEB_SEARCH_REGION || 'en-NZ',
              safeSearch: 'Moderate',
            },
            headers: {
              'Ocp-Apim-Subscription-Key': searchApiKey,
            },
            timeout: 5000, // 5 second timeout
          })

          const results = response.data?.webPages?.value || []
          allResults.push(...results.map(r => ({
            title: r.name || '',
            snippet: r.snippet || '',
            url: r.url || '',
            query,
          })))
        } catch (error) {
          console.warn(`[WebReview] Search query failed: "${query}"`, error.message)
          // Continue with other queries
        }
      }

      // Deduplicate by URL
      const uniqueResults = []
      const seenUrls = new Set()
      for (const result of allResults) {
        if (result.url && !seenUrls.has(result.url)) {
          seenUrls.add(result.url)
          uniqueResults.push(result)
        }
      }

      return uniqueResults.slice(0, maxResults)
    } catch (error) {
      console.error(`[WebReview] ❌ Web search API error:`, error.message)
      return []
    }
  },

  /**
   * Summarize search results into structured review summary using LLM
   */
  async summarizeReviews(searchResults, brand, model, category) {
    try {
      // Build context from search results
      const searchContext = searchResults.map((r, idx) => 
        `[Source ${idx + 1}]\nTitle: ${r.title}\nSummary: ${r.snippet}`
      ).join('\n\n')

      const systemPrompt = `You are a review summarizer. Given search results about a product, extract and synthesize safe, high-level insights about what customers and reviewers commonly say.

Rules:
- NEVER quote specific sources, websites, or reviewers by name
- NEVER include exact star ratings from single sources
- Use phrases like "Reviewers often say...", "Customers commonly report...", "Typical feedback is..."
- Be factual and neutral - no brand-defamatory language
- Focus on pros/cons, use cases, and notable patterns
- If multiple sources agree on a rating, you can say "around X/5 from multiple review sites"
- Keep it concise and actionable

Return ONLY valid JSON with this structure:
{
  "overall_sentiment": "string (e.g. 'mostly positive', 'mixed, strong performance but average battery')",
  "star_rating_band": "string|null (e.g. 'around 4/5' if multiple sources agree, else null)",
  "top_pros": ["string"],
  "top_cons": ["string"],
  "best_for": ["string (e.g. 'social media and casual photos', 'serious gaming')"],
  "not_ideal_for": ["string (e.g. 'low-light photography')"],
  "notable_issues": ["string (e.g. 'some users report slow software updates')"]
}`

      const userPrompt = `Product: ${brand} ${model}${category ? ` (${category})` : ''}

Search Results:
${searchContext}

Summarize the reviews into the JSON structure above.`

      const response = await chatClient.getChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: 800,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      })

      const answerText = response.choices[0]?.message?.content || ''
      
      // Parse JSON (handle markdown code blocks)
      let jsonText = answerText.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      }

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }

      const summary = JSON.parse(jsonText)

      console.log(`[WebReview] ✅ Summarized reviews: ${summary.top_pros?.length || 0} pros, ${summary.top_cons?.length || 0} cons`)

      return summary
    } catch (error) {
      console.error(`[WebReview] ❌ Error summarizing reviews:`, error.message)
      // Return safe fallback
      return {
        overall_sentiment: null,
        star_rating_band: null,
        top_pros: [],
        top_cons: [],
        best_for: [],
        not_ideal_for: [],
        notable_issues: [],
      }
    }
  },
}

export default webReviewService

