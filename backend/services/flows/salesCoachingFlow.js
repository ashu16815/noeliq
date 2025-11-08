// Sales Coaching Flow
// Handles objection handling, scripts, and coaching questions

import generationService from '../generationService.js'
import ragRetrievalOptimizedService from '../ragRetrievalOptimizedService.js'
import conversationService from '../conversationService.js'

const salesCoachingFlow = {
  /**
   * Process a sales coaching question
   * @param {Object} params - { user_text, conversation_state, conversation_id, store_id }
   * @returns {Promise<Object>} - Structured answer with sales_script and coaching_tips
   */
  async process({ user_text, conversation_state, conversation_id, store_id }) {
    console.log(`[SalesCoachingFlow] Processing coaching question: "${user_text.substring(0, 50)}..."`)
    
    // Optionally retrieve 2-3 high-relevance chunks for context (if category is known)
    let optionalChunks = []
    if (conversation_state?.active_category) {
      try {
        // Search for coaching-relevant chunks (benefits, features, selling points)
        optionalChunks = await ragRetrievalOptimizedService.retrieveRelevantChunks({
          sku: null,
          question: user_text,
          limit: 3,
          filters: { category: conversation_state.active_category },
        })
        console.log(`[SalesCoachingFlow] Retrieved ${optionalChunks.length} optional chunks for context`)
      } catch (error) {
        console.warn(`[SalesCoachingFlow] Could not retrieve optional chunks:`, error.message)
      }
    }
    
    // Build coaching-specific prompt
    const contextText = optionalChunks.length > 0
      ? optionalChunks.map(c => c.section_body).join('\n\n').substring(0, 500)
      : ''
    
    const coachingPrompt = `You are coaching a store rep on how to handle a customer question or objection.

Question: ${user_text}

${conversation_state?.active_category ? `Context: The rep is currently discussing ${conversation_state.active_category} products.` : ''}
${conversation_state?.active_sku ? `Active product: SKU ${conversation_state.active_sku}` : ''}

${contextText ? `Product context (optional reference):\n${contextText}\n` : ''}

Your job is to provide:
1. A sales_script: 1-3 sentences the rep can say verbatim to the customer (friendly, empathetic, clear).
2. coaching_tips: Bullet points helping the rep handle follow-up questions or objections.
3. What to avoid: Any promises or claims that could be problematic (e.g., never guarantee exact battery hours).

IMPORTANT:
- Never reply with "check our catalogue" or "let me find a product" as the main answer.
- Provide concrete talking points the rep can use immediately.
- Keep safety and accuracy in mind (no unrealistic promises).
- If the question is about a specific feature (e.g., battery life), explain it in simple language and suggest what questions to ask the customer to understand their needs better.

Respond with JSON:
{
  "summary": "Brief 1-2 sentence summary of your coaching advice",
  "key_points": ["Key talking points or concepts"],
  "sales_script": {"lines": ["Sentence 1 the rep can say", "Sentence 2 if needed"]},
  "coaching_tips": ["Tip 1", "Tip 2", "Tip 3"],
  "attachments": [],
  "stock_and_fulfilment": {"this_store_qty": null, "nearby": [], "fulfilment_summary": null},
  "alternative_if_oos": {"alt_sku": null, "alt_name": null, "why_this_alt": null, "key_diff": null},
  "sentiment_note": null,
  "compliance_flags": [],
  "product_metadata": null,
  "customer_voice": null,
  "comparison_voice": {"enabled": false, "headline_summary": null, "areas_better_left": [], "areas_better_right": [], "tie_or_neutral_areas": [], "recommendation_by_use_case": []},
  "shortlist_items": [],
  "specs_fields": {},
  "warranty_summary": null,
  "technical_notes": []
}`

    // Call LLM with coaching prompt
    const answer = await generationService.buildPromptAndCallLLM({
      question: user_text,
      relevantChunks: optionalChunks,
      context_summary: contextText || null,
      productRecord: null,
      availability: null,
      alternative: null,
      conversationContext: [],
      conversation_state: conversation_state,
      customer_intent: null,
      review_summary: null,
      compare_list: [],
      productRecords: {},
      web_review_summary: null,
      web_comparison_summary: null,
      shortlist_items: [],
      custom_user_prompt: coachingPrompt, // Use custom coaching prompt
    })
    
    // Ensure sales_script and coaching_tips are present
    if (!answer.sales_script || !answer.sales_script.lines || answer.sales_script.lines.length === 0) {
      answer.sales_script = { lines: ['Let me help you with that.'] }
    }
    
    if (!answer.coaching_tips || answer.coaching_tips.length === 0) {
      answer.coaching_tips = ['Ask the customer about their specific needs to tailor your response.']
    }
    
    console.log(`[SalesCoachingFlow] ✅ Generated coaching answer with ${answer.sales_script.lines.length} script lines and ${answer.coaching_tips.length} tips`)
    
    return answer
  },
}

export default salesCoachingFlow

