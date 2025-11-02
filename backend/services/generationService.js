import { chatClient } from '../lib/azureOpenAIClient.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load system prompt template
// With increased token limits, we can use the full detailed prompt
const loadSystemPrompt = () => {
  try {
    const promptPath = path.join(__dirname, '../../prompts/noeliq_system_prompt.md')
    return fs.readFileSync(promptPath, 'utf-8')
  } catch (error) {
    console.warn('Could not load system prompt file, using default')
    return `You are NoelIQ, an in-store retail expert for Noel Leeming in New Zealand. Answer in friendly, plain New Zealand English. Use ONLY provided context. Say "Let me check that for you" if unsure. Never reveal cost price, margin, or internal strategy. Return valid JSON only.`
  }
}

const systemPrompt = loadSystemPrompt()

const generationService = {
  async buildPromptAndCallLLM({
    question,
    relevantChunks,
    productRecord,
    availability,
    alternative,
    conversationContext = [],
  }) {
    try {
      // Build context from retrieved chunks
      // With increased token limits, we can use more context
      const contextBlocks = relevantChunks
        .map((chunk) => {
          // Limit each chunk body to 500 chars (increased from 300)
          const body = chunk.section_body || ''
          const truncatedBody = body.length > 500 ? body.substring(0, 500) + '...' : body
          return `[${chunk.section_title}]\n${truncatedBody}`
        })
        .join('\n\n')
      
      // Use full context now that token limits are increased
      const truncatedContext = contextBlocks

      // Build business rules blocks
      const businessRules = []
      
      if (availability) {
        businessRules.push(`Stock: This store has ${availability.this_store_qty || 0} units.`)
        if (availability.nearby && availability.nearby.length > 0) {
          businessRules.push(
            `Nearby stores: ${availability.nearby.map(s => `${s.store_name} (${s.qty} available, ${s.distance_km}km)`).join('; ')}`
          )
        }
      }

      if (alternative && alternative.alt_sku) {
        businessRules.push(
          `Alternative product (out of stock): ${alternative.alt_name} (SKU: ${alternative.alt_sku}). Why: ${alternative.why_this_alt}. Key difference: ${alternative.key_diff || 'None'}`
        )
      }

      if (productRecord && productRecord.recommended_attachments) {
        const attachments = productRecord.recommended_attachments
          .map((att) => `- ${att.name} (SKU: ${att.sku}): ${att.why_sell}`)
          .join('\n')
        businessRules.push(`Recommended attachments:\n${attachments}`)
      }

      // Build stock and fulfilment info
      const stockInfo = []
      if (availability) {
        if (availability.this_store_qty !== null) {
          stockInfo.push(`This store: ${availability.this_store_qty || 0} units`)
        } else if (availability.fulfilment && !availability.fulfilment.includes('Select')) {
          stockInfo.push(`Store info: ${availability.fulfilment}`)
        }
        if (availability.nearby && availability.nearby.length > 0) {
          stockInfo.push(`Nearby: ${availability.nearby.map(s => `${s.store_name} (${s.qty} available, ${s.distance_km}km)`).join('; ')}`)
        }
      }

      // Build the prompt with structured output request - keep it concise
      const userPrompt = `Question: ${question}

Context:
${truncatedContext || 'No specific context found for this question.'}

${businessRules.length > 0 ? `Additional information:\n${businessRules.join('\n')}` : ''}

${stockInfo.length > 0 ? `Stock availability:\n${stockInfo.join('\n')}` : ''}

You MUST respond with a valid JSON object. Your response should be ONLY JSON, no other text.

Required JSON structure:
{
  "summary": "1-2 friendly sentences that directly answer what the customer asked",
  "key_points": ["bullet strings focusing on what's relevant to their use case"],
  "attachments": [{"sku": "string or null", "name": "string", "why_sell": "string"}],
  "stock_and_fulfilment": {
    "this_store_qty": ${availability?.this_store_qty ?? 'null'},
    "nearby": ${JSON.stringify(availability?.nearby || [])},
    "fulfilment_summary": "${availability?.fulfilment || 'Check availability'}"
  },
  "alternative_if_oos": {
    "alt_sku": ${alternative?.alt_sku ? `"${alternative.alt_sku}"` : 'null'},
    "alt_name": ${alternative?.alt_name ? `"${alternative.alt_name}"` : 'null'},
    "why_this_alt": ${alternative?.why_this_alt ? `"${alternative.why_this_alt}"` : 'null'},
    "key_diff": ${alternative?.key_diff ? `"${alternative.key_diff}"` : 'null'}
  },
  "sentiment_note": "generic safe external sentiment / common feedback / who this is good for",
  "compliance_flags": []
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- Make the summary friendly and conversational (1-2 sentences)
- Use the context provided to answer the question accurately
- If you don't have enough info, still return JSON with summary explaining what you found`

      // Build messages array
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationContext, // Add conversation history if available
        { role: 'user', content: userPrompt },
      ]

      // Call Azure OpenAI
      // With increased token limits, we can request larger responses
      const response = await chatClient.getChatCompletions(messages, {
        maxTokens: 2000, // Increased for better JSON responses
      })

      const answerText = response.choices[0]?.message?.content || ""
      console.log(`[Query] LLM response length: ${answerText.length} chars`)
      if (answerText.length > 0) {
        console.log(`[Query] LLM response preview: ${answerText.substring(0, 200)}`)
      } else {
        console.warn(`[Query] ⚠️ LLM returned empty response!`)
        console.warn(`[Query] Full response object:`, JSON.stringify(response, null, 2).substring(0, 500))
      }
      
      // If response is empty, generate a helpful answer from context
      if (!answerText || answerText.trim().length < 10) {
        console.warn(`[Query] ⚠️ Empty response, generating answer from context`)
        return this.generateFromContext({
          question,
          relevantChunks,
          productRecord,
          availability,
          alternative,
        })
      }
      
      // Try to parse as JSON
      let structuredAnswer
      try {
        // Extract JSON from response (might have markdown code blocks)
        let jsonText = answerText.trim()
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        }
        structuredAnswer = JSON.parse(jsonText)
        
        // Validate required fields
        if (!structuredAnswer.summary) {
          throw new Error('Missing summary field')
        }
        
        console.log(`[Query] ✅ Successfully parsed JSON response`)
      } catch (parseError) {
        console.warn(`[Query] ⚠️ Failed to parse JSON response:`, parseError.message)
        console.warn(`[Query] Raw response (first 500 chars):`, answerText.substring(0, 500))
        
        // Fallback: Try to extract useful info from text response
        structuredAnswer = this.parseTextResponse(answerText, {
          productRecord,
          availability,
          alternative,
        })
      }

      return {
        ...structuredAnswer,
        citations: relevantChunks.map((c) => c.chunk_id),
      }
    } catch (error) {
      console.error('Error in generationService:', error)
      throw new Error(`Failed to generate answer: ${error.message}`)
    }
  },

  extractSellPoints(answerText, productRecord) {
    // Simple extraction - in production, use structured output or better parsing
    const sellPoints = []
    
    if (productRecord?.selling_points) {
      // Use product record selling points if available
      sellPoints.push(...productRecord.selling_points)
    } else {
      // Extract bullet points from answer text
      const bulletMatches = answerText.match(/[•\-\*]\s*(.+)/g)
      if (bulletMatches) {
        sellPoints.push(...bulletMatches.map((m) => m.replace(/^[•\-\*]\s*/, '')))
      }
    }

    return sellPoints.slice(0, 5) // Limit to top 5
  },

  generateFromContext({ question, relevantChunks, productRecord, availability, alternative }) {
    // Generate a helpful answer even if LLM fails
    const contextText = relevantChunks
      .map((chunk) => chunk.section_body)
      .join('\n\n')
      .substring(0, 500)

    // Extract key info from chunks
    const keyPoints = []
    if (contextText.includes('Gaming')) {
      keyPoints.push('Great for gaming with high refresh rates')
    }
    if (contextText.includes('120Hz') || contextText.includes('120 Hz')) {
      keyPoints.push('120Hz refresh rate for smooth gameplay')
    }
    if (contextText.includes('HDMI 2.1')) {
      keyPoints.push('HDMI 2.1 support for next-gen consoles')
    }

    // Build summary from question intent
    let summary = "Based on our product catalogue, "
    if (question.toLowerCase().includes('gaming')) {
      summary += "I found some great gaming options for you."
    } else if (question.toLowerCase().includes('cheaper') || question.toLowerCase().includes('under')) {
      summary += "here are some more affordable options."
    } else {
      summary += "I have some options that match what you're looking for."
    }

    return {
      summary,
      key_points: keyPoints.length > 0 ? keyPoints : ['Check our catalogue for detailed specs'],
      attachments: (productRecord?.recommended_attachments || []).map(att => ({
        sku: att.sku || null,
        name: att.name,
        why_sell: att.why_sell || '',
      })),
      stock_and_fulfilment: {
        this_store_qty: availability?.this_store_qty ?? null,
        nearby: availability?.nearby || [],
        fulfilment_summary: availability?.fulfilment || 'Check availability in store',
      },
      alternative_if_oos: alternative || {
        alt_sku: null,
        alt_name: null,
        why_this_alt: null,
        key_diff: null,
      },
      sentiment_note: null,
      compliance_flags: [],
    }
  },

  parseTextResponse(answerText, { productRecord, availability, alternative }) {
    // Try to extract structured info from plain text response
    const summary = answerText.split('\n')[0] || "Let me check that for you."
    
    // Extract bullets
    const keyPoints = this.extractSellPoints(answerText, productRecord)
    
    // Extract attachments mentions
    const attachments = []
    if (answerText.match(/also pick up|also get|most people/i)) {
      // Try to find attachment mentions
      if (productRecord?.recommended_attachments) {
        attachments.push(...productRecord.recommended_attachments.map(att => ({
          sku: att.sku || null,
          name: att.name,
          why_sell: att.why_sell || '',
        })))
      }
    }

    return {
      summary: summary.length > 200 ? summary.substring(0, 200) : summary,
      key_points: keyPoints,
      attachments,
          stock_and_fulfilment: {
            this_store_qty: availability?.this_store_qty ?? null,
            nearby: availability?.nearby || [],
            fulfilment_summary: availability?.fulfilment || (availability ? 'Store selected - ask about a specific product for availability' : 'Select a store to check availability'),
          },
      alternative_if_oos: alternative || {
        alt_sku: null,
        alt_name: null,
        why_this_alt: null,
        key_diff: null,
      },
      sentiment_note: null,
      compliance_flags: [],
    }
  },
}

export default generationService

