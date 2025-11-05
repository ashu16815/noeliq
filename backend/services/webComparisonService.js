// Web Comparison Service
// Compares multiple SKUs using SerpAPI (Google Search)

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

      // Build comparison queries
      const queries = this.buildComparisonQueries(brandLeft, modelLeft, brandRight, modelRight)

      // Fetch web search results using SerpAPI
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
   * Build comparison queries for SerpAPI
   */
  buildComparisonQueries(brandLeft, modelLeft, brandRight, modelRight) {
    return [
      `${brandLeft} ${modelLeft} vs ${brandRight} ${modelRight}`,
      `${brandLeft} ${modelLeft} vs ${brandRight} ${modelRight} battery camera performance`,
      `${brandLeft} ${modelLeft} review battery camera performance`,
      `${brandRight} ${modelRight} review battery camera performance`,
    ]
  },

  /**
   * Fetch SerpAPI snippets for a query
   */
  async fetchSerpSnippets(query) {
    const serpEndpoint = process.env.SERPAPI_ENDPOINT || 'https://serpapi.com/search.json'
    const serpApiKey = process.env.SERPAPI_API_KEY
    const location = process.env.SERPAPI_LOCATION || 'Auckland, New Zealand'
    const gl = process.env.SERPAPI_GL || 'nz'
    const hl = process.env.SERPAPI_HL || 'en'
    const num = parseInt(process.env.SERPAPI_RESULTS_PER_QUERY || '8', 10)

    if (!serpApiKey) {
      console.warn(`[WebComparison] ⚠️ SerpAPI not configured`)
      return []
    }

    try {
      console.log(`[WebComparison] Fetching from SerpAPI: "${query}"`)
      
      const response = await axios.get(serpEndpoint, {
        params: {
          engine: 'google',
          q: query,
          api_key: serpApiKey,
          location,
          gl,
          hl,
          num,
        },
        timeout: 10000,
      })

      const organicResults = response.data?.organic_results || []
      
      const snippets = organicResults
        .map(r => ({
          title: r.title || '',
          snippet: r.snippet || '',
          url: r.link || r.displayed_link || '',
        }))
        .filter(r => r.snippet && r.snippet.trim().length > 0)

      console.log(`[WebComparison] Retrieved ${snippets.length} results from SerpAPI`)
      return snippets
    } catch (error) {
      console.error(`[WebComparison] ❌ SerpAPI error:`, error.message)
      if (error.response) {
        console.error(`[WebComparison] Status: ${error.response.status}`)
      }
      return []
    }
  },

  /**
   * Perform web search using SerpAPI
   */
  async performWebSearch(queries) {
    try {
      const allResults = []

      for (const query of queries.slice(0, 4)) {
        try {
          const snippets = await this.fetchSerpSnippets(query)
          allResults.push(...snippets.map(s => ({
            title: s.title,
            snippet: s.snippet,
            url: s.url,
            query,
          })))
        } catch (error) {
          console.warn(`[WebComparison] Search query failed: "${query}"`, error.message)
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

      const maxResults = parseInt(process.env.SERPAPI_RESULTS_PER_QUERY || '8', 10)
      console.log(`[WebComparison] Total unique results: ${uniqueResults.length}`)
      return uniqueResults.slice(0, maxResults)
    } catch (error) {
      console.error(`[WebComparison] ❌ Web search error:`, error.message)
      return []
    }
  },

  /**
   * Summarize comparison using LLM
   */
  async summarizeComparison(searchResults, brandLeft, modelLeft, brandRight, modelRight) {
    try {
      // Build context from search results - combine title and snippet
      const snippetsText = searchResults
        .map((r, idx) => `${r.title} — ${r.snippet}`)
        .filter(s => s.trim().length > 0)
        .slice(0, 10)
        .join('\n\n')

      if (!snippetsText || snippetsText.length < 50) {
        console.warn(`[WebComparison] ⚠️ Insufficient snippets for comparison`)
        return {
          headline_summary: null,
          areas_better_for_left: [],
          areas_better_for_right: [],
          tie_or_neutral_areas: [],
          recommendation_by_use_case: [],
          notable_issues_both: [],
        }
      }

      const systemPrompt = `You are a product comparison synthesizer. Given search results comparing two products from various public web sources, extract real-world differences customers care about.

Rules:
- NEVER quote specific sources, websites, or reviewers by name
- Frame everything as trade-offs, not absolutes
- Use phrases like "Reviews often say...", "Common feedback is..."
- Never state a device is objectively 'bad'
- Focus on: camera, battery, performance, screen, ecosystem, longevity
- Ground statements in typical review patterns
- Never guarantee future software updates or compatibility beyond what's stated
- Do NOT quote sentences verbatim - rephrase in your own words

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

Search Results from various public sources:
${snippetsText}

Synthesize the comparison into the JSON structure above. Extract patterns across multiple sources.`

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
