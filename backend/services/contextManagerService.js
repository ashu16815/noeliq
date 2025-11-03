// Context Manager Service
// Manages conversation state updates based on resolved entities and rules

import conversationService from './conversationService.js'

const contextManagerService = {
  /**
   * Update conversation state based on resolved entities
   * Rules:
   * - New product mentioned → update active_sku, recent_skus
   * - "Compare with X" → keep current active_sku, add to compare_list
   * - Budget/use case mentioned → update constraints
   * - "Details please" + active_sku → treat as specs follow-up
   */
  update(conversationId, resolvedEntities, intent, userText = '') {
    if (!conversationId) return null

    const currentState = conversationService.getConversationContext(conversationId)
    const updates = {}

    // Rule 1: New product mentioned → update active_sku and recent_skus
    if (resolvedEntities.active_sku && 
        resolvedEntities.active_sku !== currentState.active_sku &&
        !resolvedEntities.candidate_skus.includes(currentState.active_sku)) {
      // Move current active_sku to recent_skus if it exists
      if (currentState.active_sku && !currentState.recent_skus.includes(currentState.active_sku)) {
        updates.recent_skus = [...(currentState.recent_skus || []), currentState.active_sku]
      }
      updates.active_sku = resolvedEntities.active_sku
    }

    // Rule 2: "Compare with X" → keep current active_sku, don't override
    if (intent.need_compare && currentState.active_sku) {
      // Keep current active_sku, but note candidate_skus for comparison
      if (resolvedEntities.candidate_skus.length > 0) {
        // Don't update active_sku, just track candidates
        // This is handled in query rewriter with compare_list
      }
    } else if (resolvedEntities.active_sku && resolvedEntities.active_sku !== currentState.active_sku) {
      // Normal product switch
      updates.active_sku = resolvedEntities.active_sku
      if (currentState.active_sku && !currentState.recent_skus.includes(currentState.active_sku)) {
        updates.recent_skus = [...(currentState.recent_skus || []), currentState.active_sku]
      }
    }

    // Rule 3: Update category/brand if detected and not already set
    if (resolvedEntities.category && !currentState.active_category) {
      updates.active_category = resolvedEntities.category
    }
    if (resolvedEntities.brand && !currentState.active_brand) {
      updates.active_brand = resolvedEntities.brand
    }

    // Rule 4: Update budget if mentioned
    if (resolvedEntities.budget) {
      updates.budget_cap = resolvedEntities.budget
      // Also update customer_intent budget_range for backward compatibility
      if (!currentState.customer_intent) {
        currentState.customer_intent = { budget_range: null, use_cases: [], key_features: [], priority: null }
      }
      currentState.customer_intent.budget_range = resolvedEntities.budget.toString()
    }

    // Rule 5: Update use case if mentioned
    if (resolvedEntities.use_case) {
      updates.use_case = resolvedEntities.use_case
    }

    // Rule 6: Update constraints from text
    const constraints = this.extractConstraints(userText, currentState)
    if (constraints.size_inches || constraints.must_have.length > 0 || constraints.nice_to_have.length > 0) {
      updates.constraints = constraints
    }

    // Rule 7: "Details please" + active_sku → no state change, just signal intent
    if (intent.ask_details && currentState.active_sku && 
        /details|more info|tell me more|explain/i.test(userText)) {
      // Don't change active_sku, just ensure it's still active
      if (!updates.active_sku) {
        updates.active_sku = currentState.active_sku
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      conversationService.updateConversationState(conversationId, updates)
    }

    // Also update customer_intent if we modified it
    if (currentState.customer_intent && currentState.customer_intent.budget_range !== currentState.customer_intent.budget_range) {
      conversationService.updateConversationContext(conversationId, {
        customer_intent: currentState.customer_intent,
      })
    }

    // Return updated state
    return conversationService.getConversationContext(conversationId)
  },

  /**
   * Extract constraints from user text
   */
  extractConstraints(userText, currentState) {
    const constraints = {
      size_inches: currentState.constraints?.size_inches || null,
      must_have: [...(currentState.constraints?.must_have || [])],
      nice_to_have: [...(currentState.constraints?.nice_to_have || [])],
    }

    const text = userText.toLowerCase()

    // Extract size constraints (e.g., "65 inch", "13 inch laptop")
    const sizePatterns = [
      /(\d+)\s*(?:inch|"|inches)/i,
      /(\d+)\s*(?:inch|")\s*(?:tv|display|screen)/i,
    ]

    for (const pattern of sizePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        constraints.size_inches = parseFloat(match[1])
        break
      }
    }

    // Extract must-have features
    const mustHavePatterns = [
      /must\s+have|need|required|essential|require/i,
    ]

    if (mustHavePatterns.some(p => p.test(text))) {
      // Extract features after "must have" or "need"
      const afterMustHave = text.split(/must\s+have|need|required|essential|require/i)[1]
      if (afterMustHave) {
        const features = this.extractFeatures(afterMustHave)
        constraints.must_have.push(...features)
      }
    }

    // Extract nice-to-have features
    const niceToHavePatterns = [
      /nice\s+to\s+have|prefer|would like|wish|want/i,
    ]

    if (niceToHavePatterns.some(p => p.test(text))) {
      const afterNice = text.split(/nice\s+to\s+have|prefer|would like|wish|want/i)[1]
      if (afterNice) {
        const features = this.extractFeatures(afterNice)
        constraints.nice_to_have.push(...features)
      }
    }

    // Deduplicate
    constraints.must_have = [...new Set(constraints.must_have)]
    constraints.nice_to_have = [...new Set(constraints.nice_to_have)]

    return constraints
  },

  /**
   * Extract feature mentions from text
   */
  extractFeatures(text) {
    const features = []
    const featurePatterns = [
      /hdmi\s*2\.1/i,
      /(\d+)\s*hz/i,
      /dolby\s+(?:atmos|vision)/i,
      /(?:qled|oled|led|mini\s*led)/i,
      /(?:4k|8k|uhd)/i,
      /hdr(?:\s*\d+)?/i,
      /refresh\s+rate/i,
      /(?:wifi\s*)?6[ei]?/i,
      /bluetooth/i,
      /usb\s*(?:c|type\s*c)/i,
      /thunderbolt/i,
      /nfc/i,
      /wireless\s+charging/i,
    ]

    for (const pattern of featurePatterns) {
      const match = text.match(pattern)
      if (match) {
        features.push(match[0])
      }
    }

    return features
  },
}

export default contextManagerService

