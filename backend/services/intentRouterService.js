// Intent Router Service
// Classifies user queries into intent types and routes to appropriate flows

const intentRouterService = {
  /**
   * Classify user intent from text and conversation state
   * @param {string} userText - User's question
   * @param {Object} conversationState - Current conversation state
   * @returns {Promise<Object>} - { intent, needs_catalogue, needs_reviews, confidence }
   */
  async classifyIntent(userText, conversationState = {}, providedSku = null) {
    const text = userText.toLowerCase().trim()
    
    // Extract flags for routing decisions
    // Check if SKU is provided in payload OR mentioned in text
    const hasExplicitSku = providedSku !== null || /sku\s*[:\s]*\d+|barcode|scan/i.test(userText)
    const hasProductMention = /\b(iphone|galaxy|samsung|apple|laptop|phone|tv|tablet|watch|headphone|speaker|monitor|camera)\b/i.test(userText)
    const hasComparePhrase = /\b(compare|vs|versus|difference|better|alternative|instead)\b/i.test(userText)
    const hasCategoryQuery = /\b(show|find|recommend|suggest|need|looking for|want)\s+(me\s+)?(a|an|some|any)\s+[a-z]+/i.test(userText)
    const hasBudgetQuery = /\b(under|below|less than|around|about|budget|cheap|affordable)\s*\$?\d+/i.test(userText)
    
    // SALES_COACHING patterns
    const coachingPatterns = [
      /what\s+(should|do)\s+I\s+(say|tell|explain|respond|answer)/i,
      /how\s+(do|can)\s+I\s+(explain|tell|say|handle|address|deal)/i,
      /customer\s+(is|has|says|asks|worried|concerned|wants|needs)/i,
      /how\s+to\s+(explain|position|sell|pitch|talk|handle)/i,
      /what\s+if\s+(customer|they|client)/i,
      /objection|objecting|concern|worried|hesitant|skeptical/i,
      /script|talking\s+points|sales\s+script|what\s+to\s+say/i,
    ]
    
    const isCoachingQuery = coachingPatterns.some(pattern => pattern.test(userText))
    
    // GENERAL_INFO patterns (tech concepts, not product-specific)
    const generalInfoPatterns = [
      /what\s+(is|are|does|do)\s+(oled|qled|refresh\s+rate|hdr|4k|8k|bluetooth|wifi|usb|hdmi|processor|cpu|gpu|ram|ssd|hdd)/i,
      /explain\s+(oled|qled|refresh\s+rate|hdr|4k|8k|bluetooth|wifi|usb|hdmi|processor|cpu|gpu|ram|ssd|hdd)/i,
      /difference\s+between\s+(oled|qled|hdr|4k|8k|bluetooth|wifi|usb|hdmi|processor|cpu|gpu|ram|ssd|hdd)/i,
      /what\s+(does|do)\s+(oled|qled|refresh\s+rate|hdr|4k|8k|bluetooth|wifi|usb|hdmi|processor|cpu|gpu|ram|ssd|hdd)\s+mean/i,
    ]
    
    const isGeneralInfoQuery = generalInfoPatterns.some(pattern => pattern.test(userText)) && !hasProductMention
    
    // COMPARISON patterns
    const isComparisonQuery = hasComparePhrase && (hasProductMention || conversationState.active_sku || hasExplicitSku)
    
    // PRODUCT_DEEPDIVE patterns (specific product already in context)
    const isDeepDiveQuery = (
      hasExplicitSku ||
      /tell\s+me\s+(more|about|details|info)/i.test(userText) ||
      /(this|that|it|one)\s+(one|model|product|item)/i.test(userText)
    ) && (conversationState.active_sku || hasExplicitSku)
    
    // PRODUCT_DISCOVERY patterns (category/budget queries)
    const isDiscoveryQuery = (
      hasCategoryQuery ||
      hasBudgetQuery ||
      (hasProductMention && !isCoachingQuery && !isComparisonQuery && !isDeepDiveQuery)
    ) && !isCoachingQuery && !isGeneralInfoQuery
    
    // Classification logic with priority
    let intent = 'GENERAL_INFO' // Default fallback
    let needs_catalogue = false
    let needs_reviews = false
    let confidence = 0.5
    
    if (isCoachingQuery) {
      intent = 'SALES_COACHING'
      needs_catalogue = false // Optional, not required
      needs_reviews = false
      confidence = 0.9
    } else if (isGeneralInfoQuery) {
      intent = 'GENERAL_INFO'
      needs_catalogue = false
      needs_reviews = false
      confidence = 0.85
    } else if (isComparisonQuery) {
      intent = 'COMPARISON'
      needs_catalogue = true
      needs_reviews = true
      confidence = 0.8
    } else if (isDeepDiveQuery) {
      intent = 'PRODUCT_DEEPDIVE'
      needs_catalogue = true
      needs_reviews = true
      confidence = 0.85
    } else if (isDiscoveryQuery) {
      intent = 'PRODUCT_DISCOVERY'
      needs_catalogue = true
      needs_reviews = false // Optional, can be added later
      confidence = 0.8
    }
    
    // Override: If explicit SKU is provided or mentioned, force PRODUCT_DEEPDIVE
    if (hasExplicitSku) {
      intent = 'PRODUCT_DEEPDIVE'
      needs_catalogue = true
      needs_reviews = true
      confidence = 0.95
      console.log(`[IntentRouter] SKU detected (${providedSku || 'in text'}) - forcing PRODUCT_DEEPDIVE`)
    }
    
    console.log(`[IntentRouter] Classified: "${userText.substring(0, 50)}..." → ${intent} (confidence: ${confidence}, needs_catalogue: ${needs_catalogue}, needs_reviews: ${needs_reviews})`)
    
    return {
      intent,
      needs_catalogue,
      needs_reviews,
      confidence,
    }
  },
}

export default intentRouterService

