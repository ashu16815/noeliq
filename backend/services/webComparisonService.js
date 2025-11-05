// Web Comparison Service
// Compares multiple SKUs using web search data

import axios from 'axios'
import { chatClient } from '../lib/azureOpenAIClient.js'

const webComparisonService = {
  /**
   * Get comparison summary for two SKUs
   * @param {string} skuLeft - First SKU
   * @param {string} skuRight - Second SKU
   * @param {Object} productLeft - Product metadata for left SKU
   * @param {Object} productRight - Product metadata for right SKU
   * @returns {Promise<Object>} Comparison summary
   */
  async getComparisonSummary(skuLeft, skuRight, productLeft, productRight) {
    try {
      console.log(`[WebComparison] 🔍 Comparing SKU ${skuLeft} vs SKU ${skuRight}`)
      
      const { brand: brandLeft, model: modelLeft } = productLeft || {}
      const { brand: brandRight, model: modelRight } = productRight || {}

      if (!brandLeft || !modelLeft || !brandRight || !modelRight) {
        console.warn(`[WebComparison] ⚠️ Missing brand/model for comparison, skipping`)
        return null
      }

      // Build comparison queries with site filters
      const queries = this.buildComparisonQueries(brandLeft, modelLeft, brandRight, modelRight)

      // Fetch web search results
      const searchResults = await this.performWebSearch(queries)
      
      if (!searchResults || searchResults.length === 0) {
        console.warn(`[WebComparison] ⚠️ No search results found for comparison`)
        return null
      }

      console.log(`[WebComparison] Found ${searchResults.length} search results`)

      // Summarize comparison using LLM
      const summary = await this.summarizeComparison(
        searchResults,
        brandLeft,
        modelLeft,
        brandRight,
        modelRight
      )
      
      return {
        sku_left: skuLeft,
        sku_right: skuRight,
        ...summary,
        last_fetched_at: new Date().toISOString(),
      }
    } catch (error) {
      console.error(`[WebComparison] ❌ Error comparing SKUs:`, error.message)
      return null
    }
  },

  /**
   * Build comparison queries with site filters
   */
  buildComparisonQueries(brandLeft, modelLeft, brandRight, modelRight) {
    const reviewSites = [
      'site:trustedreviews.com',
      'site:techradar.com',
      'site:whathifi.com',
      'site:cnet.com',
      'site:theverge.com',
      'site:engadget.com',
    ]
    const siteFilter = reviewSites.join(' OR ')

    return [
      `${brandLeft} ${modelLeft} vs ${brandRight} ${modelRight} (${siteFilter})`,
      `${brandLeft} ${modelLeft} vs ${brandRight} ${modelRight} battery camera performance (${siteFilter})`,
      `${brandLeft} ${modelLeft} long term review (${siteFilter})`,
      `${brandRight} ${modelRight} long term review (${siteFilter})`,
    ]
  },

  /**
   * Perform web search using Azure Bing Grounding Search API or Bing Search API
   */
  async performWebSearch(queries) {
    const searchProvider = process.env.WEB_SEARCH_PROVIDER || 'bing'
    const searchEndpoint = process.env.WEB_SEARCH_ENDPOINT
    const searchApiKey = process.env.WEB_SEARCH_API_KEY
    const maxResults = parseInt(process.env.WEB_SEARCH_MAX_RESULTS || '8', 10)

    if (!searchEndpoint || !searchApiKey) {
      console.warn(`[WebComparison] ⚠️ Web search API not configured`)
      return []
    }

    try {
      const allResults = []

      for (const query of queries.slice(0, 4)) {
        try {
          let response
          
          if (searchProvider === 'bing_grounding') {
            // Bing Grounding Search API
            response = await axios.get(searchEndpoint, {
              params: {
                q: query,
                count: Math.min(maxResults, 5),
                mkt: process.env.WEB_SEARCH_REGION || 'en-NZ',
                safeSearch: 'Strict',
              },
              headers: {
                'Ocp-Apim-Subscription-Key': searchApiKey,
              },
              timeout: 5000,
            })
          } else {
            // Standard Bing Search API (fallback)
            response = await axios.get(searchEndpoint, {
              params: {
                q: query,
                count: Math.min(maxResults, 5),
                mkt: process.env.WEB_SEARCH_REGION || 'en-NZ',
                safeSearch: 'Moderate',
              },
              headers: {
                'Ocp-Apim-Subscription-Key': searchApiKey,
              },
              timeout: 5000,
            })
          }

          // Handle both Bing Grounding Search and standard Bing Search response formats
          const results = response.data?.webPages?.value || []
          allResults.push(...results.map(r => ({
            title: r.name || r.title || '',
            snippet: r.snippet || r.description || '',
            url: r.url || r.displayUrl || '',
            query,
          })))
        } catch (error) {
          console.warn(`[WebComparison] Search query failed: "${query}"`, error.message)
          if (error.response) {
            console.warn(`[WebComparison] Response status: ${error.response.status}`)
          }
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

      console.log(`[WebComparison] Retrieved ${uniqueResults.length} unique results from ${searchProvider}`)
      return uniqueResults.slice(0, maxResults)
    } catch (error) {
      console.error(`[WebComparison] ❌ Web search API error:`, error.message)
      return []
    }
  },

  /**
   * Summarize comparison using LLM
   */
  async summarizeComparison(searchResults, brandLeft, modelLeft, brandRight, modelRight) {
    try {
      const searchContext = searchResults.map((r, idx) => 
        `[Source ${idx + 1}]\nTitle: ${r.title}\nSummary: ${r.snippet}`
      ).join('\n\n')

      const systemPrompt = `You are a product comparison synthesizer. Given search results comparing two products, extract real-world differences customers care about.

Rules:
- NEVER quote specific sources, websites, or reviewers by name
- Frame everything as trade-offs, not absolutes
- Use phrases like "Reviews often say...", "Common feedback is..."
- Never state a device is objectively 'bad'
- Focus on: camera, battery, performance, screen, ecosystem, longevity
- Ground statements in typical review patterns
- Never guarantee future software updates or compatibility beyond what's stated

Return ONLY valid JSON with this structure:
{
  "headline_summary": "string (e.g. 'Galaxy offers better camera flexibility; iPhone wins on ecosystem and longevity.')",
  "areas_better_for_left": ["string (e.g. 'screen brightness', 'customisation')"],
  "areas_better_for_right": ["string (e.g. 'video recording', 'integration with other Apple devices')"],
  "tie_or_neutral_areas": ["string"],
  "recommendation_by_use_case": [
    {
      "use_case": "string (e.g. 'social media and casual photos')",
      "better_choice": "left|right|either",
      "explanation": "string"
    }
  ],
  "notable_issues_both": ["string (e.g. 'both can feel big in small hands')"]
}`

      const userPrompt = `Compare: ${brandLeft} ${modelLeft} (left) vs ${brandRight} ${modelRight} (right)

Search Results:
${searchContext}

Synthesize the comparison into the JSON structure above.`

      const response = await chatClient.getChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      })

      const answerText = response.choices[0]?.message?.content || ''
      
      // Parse JSON
      let jsonText = answerText.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      }

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }

      const summary = JSON.parse(jsonText)

      console.log(`[WebComparison] ✅ Comparison summarized`)

      return summary
    } catch (error) {
      console.error(`[WebComparison] ❌ Error summarizing comparison:`, error.message)
      return {
        headline_summary: null,
        areas_better_for_left: [],
        areas_better_for_right: [],
        tie_or_neutral_areas: [],
        recommendation_by_use_case: [],
        notable_issues_both: [],
      }
    }
  },
}

export default webComparisonService

