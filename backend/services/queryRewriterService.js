// Query Rewriter Service
// Uses LLM to rewrite user queries with full context and derive filters

import { chatClient } from '../lib/azureOpenAIClient.js'

const queryRewriterService = {
  /**
   * Rewrite user query with full context
   * Returns: { resolved_query, filters, compare_list, constraints }
   */
  async rewrite(userText, conversationState, resolvedEntities, intent) {
    try {
      const systemPrompt = `You are a query rewriter for a retail assistant. Given user_text and conversation_state, you MUST return ONLY valid JSON with no markdown, no code blocks, no explanations.

Required JSON format:
{
  "resolved_query": "string - fully specified query including category/brand/budget/use_case inferred from the thread",
  "filters": {
    "category": "string|null",
    "brand": "string|null",
    "price_max": "number|null",
    "size_inches": "number|null"
  },
  "compare_list": ["sku"] - array of SKUs to compare (empty if not a comparison query),
  "constraints": ["string"] - array of constraint keywords/features
}

Rules:
- If active_sku exists in conversation_state and user did not name a new SKU, assume the question is about active_sku.
- If user says "alternatives iPhone", attempt to resolve a comparable iPhone SKU in the same price band and category.
- Derive filters like category, brand, price_max from conversation_state.
- resolved_query should be fully specified: include category/brand/budget/size/use_case inferred from the thread.
- If intent.need_compare is true, include both active_sku and candidate SKUs in compare_list.
- CRITICAL: Return ONLY the JSON object, nothing else. No markdown, no code blocks, no explanations, no text before or after.`

      // Build context summary for LLM
      const contextSummary = this.buildContextSummary(conversationState, resolvedEntities, intent)

      const userPrompt = `User question: "${userText}"

Conversation state:
${contextSummary}

Resolved entities:
- active_sku: ${resolvedEntities.active_sku || 'null'}
- category: ${resolvedEntities.category || 'null'}
- brand: ${resolvedEntities.brand || 'null'}
- budget: ${resolvedEntities.budget || 'null'}
- use_case: ${resolvedEntities.use_case || 'null'}
- candidate_skus: ${JSON.stringify(resolvedEntities.candidate_skus || [])}

Intent:
- intent: ${intent.intent}
- need_compare: ${intent.need_compare}
- ask_specs: ${intent.ask_specs}
- ask_alternatives: ${intent.ask_alternatives}
- ask_details: ${intent.ask_details}

Rewrite the query and return JSON only.`

      const response = await chatClient.getChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: 600, // Increased to ensure complete JSON responses
        temperature: 0.2, // Lower temperature for more consistent JSON
        response_format: { type: 'json_object' }, // Force JSON response format
      })

      const answerText = response.choices[0]?.message?.content || ''
      
      // Extract JSON from response
      let jsonText = answerText.trim()
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      }
      
      // Extract JSON object if response contains text before/after JSON
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }

      // Try to fix incomplete JSON (common LLM issue)
      if (jsonText && !jsonText.endsWith('}')) {
        // Try to find the last complete JSON object
        const lastBrace = jsonText.lastIndexOf('}')
        if (lastBrace > 0) {
          jsonText = jsonText.substring(0, lastBrace + 1)
        } else {
          // If no closing brace, try to add missing braces
          if (jsonText.includes('{') && !jsonText.includes('}')) {
            const openBraces = (jsonText.match(/\{/g) || []).length
            const closeBraces = (jsonText.match(/\}/g) || []).length
            const missingBraces = openBraces - closeBraces
            if (missingBraces > 0) {
              jsonText = jsonText + '\n' + '}'.repeat(missingBraces)
            }
          }
        }
      }

      // Safety check: ensure we have valid JSON to parse
      if (!jsonText || !jsonText.includes('{')) {
        console.warn(`[QueryRewriter] No valid JSON found in response, using fallback`)
        console.warn(`[QueryRewriter] Raw response (first 300 chars): ${answerText.substring(0, 300)}`)
        return this.fallbackRewrite(userText, conversationState, resolvedEntities, intent)
      }

      let result
      try {
        result = JSON.parse(jsonText)
      } catch (parseError) {
        console.warn(`[QueryRewriter] JSON parse error: ${parseError.message}`)
        console.warn(`[QueryRewriter] JSON text (first 300 chars): ${jsonText.substring(0, 300)}`)
        console.warn(`[QueryRewriter] Attempting fallback rewrite`)
        // Fallback to fallbackRewrite
        return this.fallbackRewrite(userText, conversationState, resolvedEntities, intent)
      }

      // Build compare_list from intent and resolved entities
      let compareList = result.compare_list || []
      if (intent.need_compare) {
        // If comparison intent, include active_sku and candidate_skus
        if (conversationState.active_sku && !compareList.includes(conversationState.active_sku)) {
          compareList.unshift(conversationState.active_sku)
        }
        if (resolvedEntities.candidate_skus && resolvedEntities.candidate_skus.length > 0) {
          compareList = [...new Set([...compareList, ...resolvedEntities.candidate_skus])]
        }
      }

      // Validate and sanitize filters
      const filters = {
        category: result.filters?.category || resolvedEntities.category || conversationState.active_category || null,
        brand: result.filters?.brand || resolvedEntities.brand || conversationState.active_brand || null,
        price_max: result.filters?.price_max || resolvedEntities.budget || conversationState.budget_cap || null,
        size_inches: result.filters?.size_inches || conversationState.constraints?.size_inches || null,
      }

      // Remove null/undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined) {
          delete filters[key]
        }
      })

      // Build resolved_query (fallback if LLM didn't provide good one)
      let resolvedQuery = result.resolved_query || userText
      if (result.resolved_query && result.resolved_query.length < 10) {
        // LLM query too short, enhance it
        resolvedQuery = this.enhanceQuery(userText, conversationState, resolvedEntities)
      }

      return {
        resolved_query: resolvedQuery,
        filters,
        compare_list: compareList.filter(sku => sku), // Remove nulls
        constraints: result.constraints || this.extractConstraints(userText),
      }
    } catch (error) {
      console.error('Error in query rewriting:', error)
      // Fallback to simple rewriting
      return this.fallbackRewrite(userText, conversationState, resolvedEntities, intent)
    }
  },

  /**
   * Build context summary for LLM
   */
  buildContextSummary(conversationState, resolvedEntities, intent) {
    const parts = []

    if (conversationState.active_sku) {
      parts.push(`Active SKU: ${conversationState.active_sku}`)
    }
    if (conversationState.active_category) {
      parts.push(`Category: ${conversationState.active_category}`)
    }
    if (conversationState.active_brand) {
      parts.push(`Brand: ${conversationState.active_brand}`)
    }
    if (conversationState.budget_cap) {
      parts.push(`Budget cap: $${conversationState.budget_cap}`)
    }
    if (conversationState.use_case) {
      parts.push(`Use case: ${conversationState.use_case}`)
    }
    if (conversationState.constraints?.size_inches) {
      parts.push(`Size: ${conversationState.constraints.size_inches} inches`)
    }
    if (conversationState.recent_skus && conversationState.recent_skus.length > 0) {
      parts.push(`Recent SKUs: ${conversationState.recent_skus.join(', ')}`)
    }

    return parts.length > 0 ? parts.join('\n') : 'No active context'
  },

  /**
   * Enhance query if LLM provided a short/inadequate one
   */
  enhanceQuery(userText, conversationState, resolvedEntities) {
    const parts = [userText]

    if (resolvedEntities.category && !userText.toLowerCase().includes(resolvedEntities.category.toLowerCase())) {
      parts.push(resolvedEntities.category)
    }
    if (resolvedEntities.use_case) {
      parts.push(resolvedEntities.use_case)
    }
    if (resolvedEntities.budget) {
      parts.push(`under $${resolvedEntities.budget}`)
    }

    return parts.join(' ')
  },

  /**
   * Extract constraints from user text
   */
  extractConstraints(userText) {
    const constraints = []
    const text = userText.toLowerCase()

    // Common constraint keywords
    const constraintPatterns = [
      /hdmi\s*2\.1/i,
      /(\d+)\s*hz/i,
      /dolby\s+(?:atmos|vision)/i,
      /(?:qled|oled|led|mini\s*led)/i,
      /(?:4k|8k|uhd)/i,
      /hdr/i,
      /refresh\s+rate/i,
      /gaming/i,
      /streaming/i,
      /wireless\s+charging/i,
      /usb\s*c/i,
    ]

    for (const pattern of constraintPatterns) {
      const match = text.match(pattern)
      if (match && !constraints.includes(match[0])) {
        constraints.push(match[0])
      }
    }

    return constraints
  },

  /**
   * Fallback rewriting if LLM fails
   */
  fallbackRewrite(userText, conversationState, resolvedEntities, intent) {
    // Build resolved_query
    let resolvedQuery = userText
    if (conversationState.active_sku && !resolvedEntities.active_sku) {
      // If we have active SKU but user didn't mention new product, assume question is about active SKU
      resolvedQuery = `${userText} ${conversationState.active_category || ''} ${conversationState.active_brand || ''}`.trim()
    } else if (resolvedEntities.active_sku) {
      // New product mentioned
      resolvedQuery = `${userText} ${resolvedEntities.category || ''} ${resolvedEntities.brand || ''}`.trim()
    }

    // Build filters
    const filters = {}
    if (resolvedEntities.category || conversationState.active_category) {
      filters.category = resolvedEntities.category || conversationState.active_category
    }
    if (resolvedEntities.brand || conversationState.active_brand) {
      filters.brand = resolvedEntities.brand || conversationState.active_brand
    }
    if (resolvedEntities.budget || conversationState.budget_cap) {
      filters.price_max = resolvedEntities.budget || conversationState.budget_cap
    }
    if (conversationState.constraints?.size_inches) {
      filters.size_inches = conversationState.constraints.size_inches
    }

    // Build compare_list
    let compareList = []
    if (intent.need_compare) {
      if (conversationState.active_sku) {
        compareList.push(conversationState.active_sku)
      }
      if (resolvedEntities.candidate_skus && resolvedEntities.candidate_skus.length > 0) {
        compareList = [...new Set([...compareList, ...resolvedEntities.candidate_skus])]
      }
    }

    return {
      resolved_query: resolvedQuery,
      filters,
      compare_list: compareList,
      constraints: this.extractConstraints(userText),
    }
  },
}

export default queryRewriterService

