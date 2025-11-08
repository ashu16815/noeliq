// General Info Flow
// Handles general tech concept questions not tied to specific products

import generationService from '../generationService.js'
import ragRetrievalOptimizedService from '../ragRetrievalOptimizedService.js'

const generalInfoFlow = {
  /**
   * Process a general info question
   * @param {Object} params - { user_text, conversation_state, conversation_id, store_id }
   * @returns {Promise<Object>} - Structured answer explaining the concept
   */
  async process({ user_text, conversation_state, conversation_id, store_id }) {
    console.log(`[GeneralInfoFlow] Processing general info question: "${user_text.substring(0, 50)}..."`)
    
    // Optionally search for category-relevant chunks if helpful
    let optionalChunks = []
    try {
      // Try to find relevant category chunks (e.g., "OLED" might match TV category chunks)
      optionalChunks = await ragRetrievalOptimizedService.retrieveRelevantChunks({
        sku: null,
        question: user_text,
        limit: 2,
        filters: {},
      })
      console.log(`[GeneralInfoFlow] Retrieved ${optionalChunks.length} optional chunks for context`)
    } catch (error) {
      console.warn(`[GeneralInfoFlow] Could not retrieve optional chunks:`, error.message)
    }
    
    const contextText = optionalChunks.length > 0
      ? optionalChunks.map(c => c.section_body).join('\n\n').substring(0, 300)
      : ''
    
    const infoPrompt = `You are NoelIQ, an expert sales floor assistant for Noel Leeming in New Zealand.

A store rep is asking you to explain a general tech concept so they can better help customers.

Question: ${user_text}

${contextText ? `Optional product context:\n${contextText}\n` : ''}

Your job is to:
1. Explain the concept clearly in simple, friendly language that a store rep can understand and relay to customers.
2. Keep it aligned with Noel Leeming's tone (helpful, trustworthy, not overly technical).
3. Optionally end with a gentle CTA hinting at product discovery (e.g., "Ask me to show you a TV that's good for bright rooms" if relevant).

IMPORTANT:
- Answer from your general knowledge; you don't need to find a specific product.
- Keep explanations practical and relevant to retail sales.
- Never reveal internal strategies or unsafe advice.

Respond with JSON:
{
  "summary": "Brief 1-2 sentence summary explaining the concept",
  "key_points": ["Key point 1", "Key point 2", "Key point 3"],
  "sales_script": {"lines": []},
  "coaching_tips": [],
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
      custom_user_prompt: infoPrompt, // Use custom info prompt
    })
    
    console.log(`[GeneralInfoFlow] ✅ Generated info answer`)
    
    return answer
  },
}

export default generalInfoFlow

