// Service to track conversation context for continuity
// MVP: In-memory per session. Later: persist per conversation_id

const conversationContexts = new Map()

const conversationService = {
  getConversationContext(conversationId) {
    const defaultState = {
      conversation_id: conversationId,
      store_id: null,
      active_category: null,
      active_brand: null,
      active_sku: null,
      recent_skus: [],
      budget_cap: null,
      use_case: null,
      constraints: {
        size_inches: null,
        must_have: [],
        nice_to_have: [],
      },
      recent_turns: [],
      customer_priority: null, // Legacy field - e.g., 'gaming', 'work from home', 'budget under $1500'
      last_price_mentioned: null,
      last_turn_at: null,
      customer_intent: {
        budget_range: null,
        use_cases: [],
        key_features: [],
        priority: null,
      },
    }

    if (!conversationId) {
      return defaultState
    }

    const existing = conversationContexts.get(conversationId)
    if (!existing) {
      return defaultState
    }

    // Ensure all new fields exist (migration for existing conversations)
    return {
      ...defaultState,
      ...existing,
      constraints: {
        ...defaultState.constraints,
        ...(existing.constraints || {}),
      },
      customer_intent: {
        ...defaultState.customer_intent,
        ...(existing.customer_intent || {}),
      },
    }
  },

  updateConversationContext(conversationId, updates) {
    if (!conversationId) return

    const context = this.getConversationContext(conversationId)
    Object.assign(context, updates)
    conversationContexts.set(conversationId, context)

    // Keep only last 10 turns for context
    if (context.recent_turns && context.recent_turns.length > 10) {
      context.recent_turns = context.recent_turns.slice(-10)
    }
  },

  /**
   * Extract customer intent from text (budget, use cases, key features)
   */
  extractCustomerIntent(text) {
    if (!text || typeof text !== 'string') {
      return {
        budget_range: null,
        use_cases: [],
        key_features: [],
        priority: null,
      }
    }

    const intent = {
      budget_range: null,
      use_cases: [],
      key_features: [],
      priority: null,
    }

    const lowerText = text.toLowerCase()

    // Extract budget constraints
    const budgetPatterns = [
      /(?:under|below|less than|max|maximum|up to|around|about)\s*\$?(\d+[k]?)/i,
      /budget\s*(?:of|is)?\s*\$?(\d+[k]?)/i,
      /\$(\d+[k]?)/i,
    ]

    for (const pattern of budgetPatterns) {
      const match = text.match(pattern)
      if (match) {
        let amount = match[1]
        // Convert "2k" to "2000"
        if (amount.toLowerCase().endsWith('k')) {
          amount = (parseFloat(amount) * 1000).toString()
        }
        intent.budget_range = amount
        break
      }
    }

    // Extract use cases
    const useCasePatterns = [
      { pattern: /gaming/i, label: 'gaming' },
      { pattern: /work\s+from\s+home|wfh/i, label: 'work from home' },
      { pattern: /bright\s+room/i, label: 'bright room' },
      { pattern: /dark\s+room/i, label: 'dark room' },
      { pattern: /office/i, label: 'office' },
      { pattern: /streaming/i, label: 'streaming' },
      { pattern: /movies|movie\s+watching/i, label: 'movies' },
      { pattern: /sports/i, label: 'sports' },
      { pattern: /video\s+calls|videoconferencing/i, label: 'video calls' },
      { pattern: /photo\s+editing|video\s+editing/i, label: 'content creation' },
    ]

    for (const { pattern, label } of useCasePatterns) {
      if (pattern.test(text) && !intent.use_cases.includes(label)) {
        intent.use_cases.push(label)
      }
    }

    // Extract key features/technical terms
    const featurePatterns = [
      /(?:hdmi\s*)?2\.1/i,
      /(\d+)\s*hz/i,
      /dolby\s+(?:atmos|vision)/i,
      /(?:qled|oled|led|mini\s*led)/i,
      /(?:4k|8k|uhd)/i,
      /hdr(?:\s*\d+)?/i,
      /refresh\s+rate/i,
      /(?:wifi\s*)?6[ei]?/i,
      /bluetooth\s*(\d+\.?\d*)?/i,
      /usb\s*(?:c|type\s*c|\d+)/i,
      /thunderbolt/i,
    ]

    for (const pattern of featurePatterns) {
      const match = text.match(pattern)
      if (match && !intent.key_features.includes(match[0])) {
        intent.key_features.push(match[0])
      }
    }

    // Determine priority from use cases
    if (intent.use_cases.length > 0) {
      intent.priority = intent.use_cases[0]
    }

    return intent
  },

  /**
   * Merge new intent with existing intent (accumulate, don't replace)
   */
  mergeIntent(existingIntent, newIntent) {
    return {
      budget_range: newIntent.budget_range || existingIntent.budget_range,
      use_cases: [...new Set([...existingIntent.use_cases, ...newIntent.use_cases])],
      key_features: [...new Set([...existingIntent.key_features, ...newIntent.key_features])],
      priority: newIntent.priority || existingIntent.priority,
    }
  },

  /**
   * Build a concise intent summary for retrieval/prompting
   */
  buildIntentSummary(intent) {
    if (!intent || (!intent.budget_range && intent.use_cases.length === 0 && intent.key_features.length === 0)) {
      return null
    }

    const parts = []

    if (intent.use_cases.length > 0) {
      parts.push(intent.use_cases.join(', '))
    }

    if (intent.key_features.length > 0) {
      parts.push(intent.key_features.join(', '))
    }

    if (intent.budget_range) {
      parts.push(`under $${intent.budget_range}`)
    }

    return parts.length > 0 ? `Customer wants ${parts.join(', ')}.` : null
  },

  /**
   * Get customer intent from conversation context
   */
  getCustomerIntent(conversationId) {
    const context = this.getConversationContext(conversationId)
    return context.customer_intent || {
      budget_range: null,
      use_cases: [],
      key_features: [],
      priority: null,
    }
  },

  addTurn(conversationId, question, answer, sku = null) {
    if (!conversationId) return

    const context = this.getConversationContext(conversationId)
    
    // Update active SKU if provided
    if (sku) {
      context.active_sku = sku
    }

    // Extract intent from current question
    const newIntent = this.extractCustomerIntent(question)
    
    // Merge with existing intent (accumulate, don't replace)
    const existingIntent = context.customer_intent || {
      budget_range: null,
      use_cases: [],
      key_features: [],
      priority: null,
    }
    context.customer_intent = this.mergeIntent(existingIntent, newIntent)

    // Also update legacy customer_priority field for backward compatibility
    if (context.customer_intent.priority || context.customer_intent.use_cases.length > 0) {
      const priorityParts = []
      if (context.customer_intent.priority) {
        priorityParts.push(context.customer_intent.priority)
      }
      if (context.customer_intent.budget_range) {
        priorityParts.push(`budget under $${context.customer_intent.budget_range}`)
      }
      context.customer_priority = priorityParts.join(', ') || null
    }

    // Add turn to history
    context.recent_turns.push({
      question,
      answer_summary: answer?.summary || answer?.answer_text || '',
      timestamp: new Date().toISOString(),
    })

    this.updateConversationContext(conversationId, context)
  },

  inferSKUFromContext(conversationId, currentQuestion, providedSku) {
    // If SKU is provided, use it
    if (providedSku) {
      return providedSku
    }

    // Check if question references "this", "it", "that", "cheaper", etc. - likely same product
    const contextReferencePattern = /(this|that|it|cheaper|better|same|other)/i
    if (contextReferencePattern.test(currentQuestion)) {
      const context = this.getConversationContext(conversationId)
      return context.active_sku
    }

    return null
  },

  buildConversationHistory(conversationId, limit = 5) {
    const context = this.getConversationContext(conversationId)
    if (!context.recent_turns || context.recent_turns.length === 0) {
      return []
    }

    // Return last N turns as messages for LLM context
    return context.recent_turns.slice(-limit).flatMap(turn => [
      { role: 'user', content: turn.question },
      { role: 'assistant', content: turn.answer_summary },
    ])
  },

  /**
   * Update conversation state with structured updates
   */
  updateConversationState(conversationId, updates) {
    if (!conversationId) return

    const context = this.getConversationContext(conversationId)
    
    // Handle nested updates for constraints
    if (updates.constraints) {
      context.constraints = {
        ...context.constraints,
        ...updates.constraints,
        must_have: [...new Set([...context.constraints.must_have, ...(updates.constraints.must_have || [])])],
        nice_to_have: [...new Set([...context.constraints.nice_to_have, ...(updates.constraints.nice_to_have || [])])],
      }
      delete updates.constraints
    }

    // Update active SKU and maintain recent_skus
    if (updates.active_sku && updates.active_sku !== context.active_sku) {
      if (context.active_sku && !context.recent_skus.includes(context.active_sku)) {
        context.recent_skus.push(context.active_sku)
      }
      context.active_sku = updates.active_sku
      delete updates.active_sku
    }

    // Update timestamp
    updates.last_turn_at = new Date().toISOString()

    // Apply other updates
    Object.assign(context, updates)
    
    this.updateConversationContext(conversationId, context)
  },

  /**
   * Get active context summary
   */
  getActiveContext(conversationId) {
    const context = this.getConversationContext(conversationId)
    return {
      active_sku: context.active_sku,
      active_category: context.active_category,
      active_brand: context.active_brand,
      budget_cap: context.budget_cap,
      use_case: context.use_case,
      constraints: context.constraints,
      recent_skus: context.recent_skus,
    }
  },

  /**
   * Clear active SKU (useful for product switching)
   */
  clearActiveSKU(conversationId) {
    if (!conversationId) return

    const context = this.getConversationContext(conversationId)
    if (context.active_sku && !context.recent_skus.includes(context.active_sku)) {
      context.recent_skus.push(context.active_sku)
    }
    context.active_sku = null
    this.updateConversationContext(conversationId, context)
  },
}

export default conversationService

