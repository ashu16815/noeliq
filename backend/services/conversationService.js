// Service to track conversation context for continuity
// MVP: In-memory per session. Later: persist per conversation_id

const conversationContexts = new Map()

const conversationService = {
  getConversationContext(conversationId) {
    if (!conversationId) {
      return {
        active_sku: null,
        recent_turns: [],
        customer_priority: null, // e.g., 'gaming', 'work from home', 'budget under $1500'
        last_price_mentioned: null,
      }
    }

    return conversationContexts.get(conversationId) || {
      active_sku: null,
      recent_turns: [],
      customer_priority: null,
      last_price_mentioned: null,
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

  addTurn(conversationId, question, answer, sku = null) {
    if (!conversationId) return

    const context = this.getConversationContext(conversationId)
    
    // Update active SKU if provided
    if (sku) {
      context.active_sku = sku
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
}

export default conversationService

