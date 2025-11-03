// Intent Classifier Service
// Classifies user intent from text + conversation state

import { chatClient } from '../lib/azureOpenAIClient.js'

const intentClassifierService = {
  /**
   * Detect user intent from text and conversation state
   * Returns: { intent, need_compare, ask_specs, ask_alternatives, ask_details }
   */
  async detect(userText, conversationState = {}) {
    try {
      // Pattern-based classification first (fast, deterministic)
      const patternResult = this.detectByPatterns(userText, conversationState)
      
      // If pattern-based is confident, return it
      if (patternResult.confidence === 'high') {
        return patternResult.result
      }

      // For ambiguous cases, use LLM fallback
      if (patternResult.confidence === 'medium' || patternResult.confidence === 'low') {
        const llmResult = await this.detectByLLM(userText, conversationState)
        // Merge pattern and LLM results, prefer LLM for ambiguous cases
        return {
          ...patternResult.result,
          ...llmResult,
          // LLM can override intent type if it's more confident
          intent: llmResult.intent || patternResult.result.intent,
        }
      }

      return patternResult.result
    } catch (error) {
      console.error('Error in intent classification:', error)
      // Fallback to pattern-based if LLM fails
      return this.detectByPatterns(userText, conversationState).result
    }
  },

  /**
   * Pattern-based intent detection (fast, deterministic)
   */
  detectByPatterns(userText, conversationState) {
    const text = userText.toLowerCase()
    const hasActiveSku = !!conversationState.active_sku
    const isFollowUp = hasActiveSku && (
      /^(what|how|does|is|can|will|tell me about|give me|show me|details|more)/i.test(userText) ||
      /^(this|that|it|the same|same)/i.test(userText)
    )

    let intent = 'recommendation'
    let need_compare = false
    let ask_specs = false
    let ask_alternatives = false
    let ask_details = false
    let confidence = 'medium'

    // Compare intent
    if (/compare|comparison|vs|versus|difference|vs\.|better than|against/i.test(text)) {
      intent = 'compare'
      need_compare = true
      confidence = 'high'
    }

    // Alternatives intent
    if (/alternative|instead|other option|different|another|else|other choice/i.test(text)) {
      intent = 'alternatives'
      ask_alternatives = true
      confidence = 'high'
    }

    // Specs intent
    if (/spec|specification|feature|technical|specs|what.*features|what.*specs/i.test(text)) {
      intent = 'specs'
      ask_specs = true
      confidence = 'high'
    }

    // Details intent
    if (/detail|tell me more|more info|information|about|explain|describe/i.test(text)) {
      intent = 'details'
      ask_details = true
      confidence = 'medium'
    }

    // Follow-up intent (if active_sku exists and question is vague)
    if (isFollowUp && intent === 'recommendation') {
      intent = 'follow_up'
      ask_details = true
      confidence = 'high'
    }

    // Ambiguous cases (low confidence)
    if (text.length < 20 && intent === 'recommendation' && !hasActiveSku) {
      confidence = 'low'
    }

    return {
      result: {
        intent,
        need_compare,
        ask_specs,
        ask_alternatives,
        ask_details,
      },
      confidence,
    }
  },

  /**
   * LLM-based intent detection for ambiguous cases
   */
  async detectByLLM(userText, conversationState) {
    const systemPrompt = `You are an intent classifier for a retail assistant. Classify the user's intent from their question.

Available intent types:
- compare: User wants to compare products
- specs: User asks about specifications/features
- alternatives: User wants alternative products
- details: User wants more information/details
- recommendation: User wants a product recommendation
- follow_up: User asks a follow-up question about a product already discussed

Return ONLY valid JSON with these exact keys:
{
  "intent": "one of: compare, specs, alternatives, details, recommendation, follow_up",
  "need_compare": boolean,
  "ask_specs": boolean,
  "ask_alternatives": boolean,
  "ask_details": boolean
}`

    const contextInfo = conversationState.active_sku 
      ? `Context: User is currently discussing SKU ${conversationState.active_sku}`
      : 'Context: No active product discussion'

    const userPrompt = `${contextInfo}

User question: "${userText}"

Classify the intent and return JSON only.`

    try {
      const response = await chatClient.getChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: 200,
        temperature: 0.1, // Low temperature for consistent classification
      })

      const answerText = response.choices[0]?.message?.content || ''
      
      // Extract JSON from response
      let jsonText = answerText.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      }

      const result = JSON.parse(jsonText)
      
      // Validate result structure
      return {
        intent: result.intent || 'recommendation',
        need_compare: result.need_compare || false,
        ask_specs: result.ask_specs || false,
        ask_alternatives: result.ask_alternatives || false,
        ask_details: result.ask_details || false,
      }
    } catch (error) {
      console.warn('LLM intent classification failed, using pattern-based:', error.message)
      // Fallback to pattern-based
      return this.detectByPatterns(userText, conversationState).result
    }
  },
}

export default intentClassifierService

