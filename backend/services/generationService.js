import { chatClient } from '../lib/azureOpenAIClient.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Full system prompt embedded for serverless compatibility
// This ensures the prompt is always available in Vercel/serverless environments
const FULL_SYSTEM_PROMPT = `You are NoelIQ, an in-store retail expert for Noel Leeming in New Zealand.

Your job is to help a store team member serve a real customer standing right in front of them.

You are currently in a conversation with a store consultant. Use the conversation history to keep context and maintain continuity across multiple turns.

**IMPORTANT: Conversation Continuity**
- If the user asks another question without specifying a new product, assume it's about the currently discussed SKU or topic from the conversation history.
- Use conversation history to reference previous answers when appropriate (e.g., "As I mentioned earlier..." or "Building on what we discussed...").
- Treat the conversation as a continuous thread where follow-up questions relate to the same product or context unless explicitly stated otherwise.
- Pay attention to customer intent and priorities mentioned in earlier turns (e.g., budget constraints, use cases like gaming, work from home, etc.).

Answer in friendly, plain New Zealand English.

Use ONLY the provided internal product context, stock availability, warranty_info, and attach recommendations.

You MAY also incorporate generic, broadly known, non-sensitive review sentiment or category-level buying considerations, phrased as general trends (e.g. 'Reviewers usually say the blacks are very deep for movies' or 'Customers often like that this laptop stays quiet during video calls').

If you provide general sentiment, keep it high-level and do not reference any confidential source or any specific named reviewer.

**Web Review Data (if provided):**
- You will sometimes receive web_review_summary and web_comparison_summary data.
- Use web_review_summary to describe what customers and reviewers commonly like or dislike, but keep it generic and safe.
- Use web_comparison_summary when the user wants to compare products, focusing on use case and trade-offs, not spec lists.
- If there is any conflict between internal structured product data and web summaries, INTERNAL DATA WINS.
- Never quote or attribute to a specific website, brand, review platform, or named reviewer; summarise across sources instead.
- Phrase external sentiment as 'Reviewers often say…', 'Customers online commonly report…', or 'Typical feedback is…'.

Be honest about pros and trade-offs. It's okay to say 'This one is brighter, but the other one does motion better for live sport.'

Always try to help the rep make the sale today: mention if it's in stock here, where else it can be picked up today, or what the closest alternative is if it's out of stock.

Always propose relevant attachments in a helpful, not pushy way. Example: 'Most people also pick up a HDMI 2.1 cable so they can get full 120Hz from their PS5.'

If you are not certain, say: 'Let me check that for you.' Never invent technical specs.

Never reveal cost price, margin, supplier rebate structures, internal promo plans, competitor deal terms, or how price match works internally.

Never make safety promises that aren't in warranty_info.

Never give installation or electrical advice that could be unsafe. Instead say: 'I can't confirm that part here — let me grab someone in-store who can help set that up safely for you.'

Customer-facing clarity matters. Keep answers short and skimmable so the rep can read or show it to the shopper.

## Response Format

You must return a structured JSON response with these exact fields:

{
  "summary": "1-2 friendly sentences that directly answer what the customer asked",
  "key_points": ["bullet strings focusing on what's relevant to their use case, not generic spec dumps"],
  "attachments": [
    {
      "sku": "string | null",
      "name": "string",
      "why_sell": "string"
    }
  ],
  "stock_and_fulfilment": {
    "this_store_qty": "number | null",
    "nearby": [
      {
        "store_name": "string",
        "qty": "number",
        "distance_km": "number",
        "fulfilment_option": "string"
      }
    ],
    "fulfilment_summary": "string"
  },
  "alternative_if_oos": {
    "alt_sku": "string | null",
    "alt_name": "string | null",
    "why_this_alt": "string | null",
    "key_diff": "string | null"
  },
  "sentiment_note": "generic safe external sentiment / common feedback / who this is good for",
  "compliance_flags": ["string notes if you had to refuse something or avoid margin etc."],
  "product_metadata": {
    "name": "string | null",
    "image_url": "string | null",
    "price_band": "string | null (e.g. 'Under $1000', '$1000-$1500')",
    "sku": "string | null",
    "hero_features": ["string"]
  },
  "sales_script": {
    "lines": ["string"]
  },
  "customer_voice": {
    "overall_sentiment": "string | null (e.g. 'mostly positive', 'mixed')",
    "top_pros": ["string"],
    "top_cons": ["string"],
    "best_for": ["string"],
    "not_ideal_for": ["string"],
    "notable_issues": ["string"]
  },
  "comparison_voice": {
    "enabled": "boolean (true if comparing products)",
    "headline_summary": "string | null",
    "areas_better_left": ["string"],
    "areas_better_right": ["string"],
    "tie_or_neutral_areas": ["string"],
    "recommendation_by_use_case": [
      {
        "use_case": "string",
        "better_choice": "left|right|either",
        "explanation": "string"
      }
    ]
  },
  "shortlist_items": [
    {
      "sku": "string",
      "name": "string",
      "hero_feature": "string",
      "price": "number | null",
      "stock_indicator": "string | null"
    }
  ],
  "specs_fields": {
    "[key: string]": "string"
  },
  "warranty_summary": "string | null",
  "technical_notes": ["string"]
}

If you can't fill a field, set it to null or an empty array. Do not hallucinate.

Note: customer_voice and comparison_voice should be populated when web review data is available. If web review data is not provided, these fields can be null or empty.`

// Load system prompt template
// Try to load from file first (for local development), fallback to embedded prompt
const loadSystemPrompt = () => {
  try {
    const promptPath = path.join(__dirname, '../../prompts/noeliq_system_prompt.md')
    const filePrompt = fs.readFileSync(promptPath, 'utf-8')
    console.log('[GenerationService] ✅ Loaded system prompt from file')
    return filePrompt
  } catch (error) {
    // In serverless environments (Vercel), file system access may be limited
    // Use embedded prompt as fallback
    console.log('[GenerationService] Using embedded system prompt (serverless environment)')
    return FULL_SYSTEM_PROMPT
  }
}

const systemPrompt = loadSystemPrompt()

/**
 * Build a generic, safe review summary for a product category/SKU
 * Returns template-like text that adds expert-level context without violating compliance
 */
const buildReviewSummary = (productRecord, relevantChunks) => {
  // Infer product category from product record or chunks
  let category = null
  
  if (productRecord?.category) {
    category = productRecord.category.toLowerCase()
  } else if (productRecord?.name) {
    const name = productRecord.name.toLowerCase()
    if (name.includes('tv') || name.includes('television')) {
      category = 'tv'
    } else if (name.includes('laptop') || name.includes('notebook')) {
      category = 'laptop'
    } else if (name.includes('phone') || name.includes('smartphone')) {
      category = 'phone'
    } else if (name.includes('tablet')) {
      category = 'tablet'
    } else if (name.includes('headphone') || name.includes('earbud')) {
      category = 'audio'
    }
  }

  // Also check chunks for category indicators
  if (!category && relevantChunks.length > 0) {
    const combinedText = relevantChunks.map(c => c.section_body || '').join(' ').toLowerCase()
    if (combinedText.includes('television') || combinedText.includes('tv ') || combinedText.includes('display')) {
      category = 'tv'
    } else if (combinedText.includes('laptop') || combinedText.includes('notebook')) {
      category = 'laptop'
    } else if (combinedText.includes('smartphone') || combinedText.includes('mobile phone')) {
      category = 'phone'
    }
  }

  // Generic category-based review summaries (safe, compliant templates)
  const reviewTemplates = {
    tv: "Public reviews typically highlight: great picture quality with deep blacks and vibrant colors, good brightness for well-lit rooms, and smooth motion handling for sports and gaming. Some reviewers mention that larger models may need a wider stand space, and wall mounting requires proper studs. Many customers appreciate the smart TV features and ease of setup.",
    laptop: "Public reviews typically highlight: good performance for everyday tasks, comfortable keyboard and trackpad, and decent battery life for portable use. Some reviewers mention that display brightness can vary, and fan noise may be noticeable under heavy workloads. Many customers appreciate the build quality and portability.",
    phone: "Public reviews typically highlight: excellent camera quality for photos and videos, smooth performance for apps and multitasking, and good battery life for daily use. Some reviewers mention that screen size may not suit everyone, and the camera bump can make it wobble on flat surfaces. Many customers appreciate the premium build and regular software updates.",
    tablet: "Public reviews typically highlight: great display for media consumption and reading, smooth performance for apps, and good battery life for all-day use. Some reviewers mention that larger models can be heavy for extended holding, and accessories like keyboards are often recommended for productivity. Many customers appreciate the versatility and portability.",
    audio: "Public reviews typically highlight: clear sound quality with good bass response, comfortable fit for extended wear, and effective noise cancellation in noisy environments. Some reviewers mention that battery life can vary with usage patterns, and connectivity may occasionally drop in crowded areas. Many customers appreciate the build quality and sound isolation.",
  }

  // Default generic template if category not found
  const defaultTemplate = "Public reviews typically highlight positive aspects of product quality and performance, with some reviewers noting practical considerations like size, weight, or setup requirements. Many customers appreciate the overall value and features offered."

  if (category && reviewTemplates[category]) {
    return reviewTemplates[category]
  }

  // Try to infer from product name or features
  if (productRecord?.name) {
    const name = productRecord.name.toLowerCase()
    
    // Check for specific features mentioned that could inform review sentiment
    if (name.includes('gaming') || relevantChunks.some(c => c.section_body?.toLowerCase().includes('gaming'))) {
      return "Public reviews typically highlight: excellent performance for gaming with high refresh rates and low input lag, great color accuracy for immersive experiences, and good cooling under load. Some reviewers mention that gaming-focused models prioritize performance over battery life. Many customers appreciate the gaming-specific features and responsiveness."
    }
    
    if (name.includes('oled') || relevantChunks.some(c => c.section_body?.toLowerCase().includes('oled'))) {
      return "Public reviews typically highlight: exceptional picture quality with perfect blacks and infinite contrast, vibrant colors, and excellent viewing angles. Some reviewers mention that OLED displays can be susceptible to burn-in with static content over very long periods. Many customers appreciate the premium picture quality and thin design."
    }
    
    if (name.includes('qled') || relevantChunks.some(c => c.section_body?.toLowerCase().includes('qled'))) {
      return "Public reviews typically highlight: excellent brightness and color volume, great for well-lit rooms, and good color accuracy. Some reviewers mention that black levels may not be as deep as OLED in dark rooms. Many customers appreciate the vibrant colors and brightness."
    }
  }

  return defaultTemplate
}

const generationService = {
  async buildPromptAndCallLLM({
    question,
    relevantChunks = [],
    context_summary = null, // Condensed context from condenser (preferred)
    productRecord,
    availability,
    alternative,
    conversationContext = [],
    conversation_state = null, // Full conversation state
    customer_intent = null,
    review_summary = null, // Review summary from enricher (preferred)
    compare_list = [], // List of SKUs being compared
    productRecords = {}, // Map of SKU -> {name, category, price} for all products in context
    web_review_summary = null, // Web review summary from webReviewService
    web_comparison_summary = null, // Web comparison summary from webComparisonService
    shortlist_items = [], // Pre-built shortlist items for general recommendations
    custom_user_prompt = null, // Custom user prompt (for coaching/general info flows)
    custom_system_prompt = null, // Custom system prompt (optional override)
  }) {
    try {
      // Use context_summary if provided (from condenser), otherwise build from chunks
      let truncatedContext
      if (context_summary) {
        truncatedContext = context_summary
      } else if (relevantChunks && relevantChunks.length > 0) {
        // Fallback: build context from chunks
        const contextBlocks = relevantChunks
          .map((chunk) => {
            const body = chunk.section_body || ''
            const truncatedBody = body.length > 500 ? body.substring(0, 500) + '...' : body
            return `[${chunk.section_title || 'Unknown'}]\n${truncatedBody}`
          })
          .join('\n\n')
        truncatedContext = contextBlocks
      } else {
        truncatedContext = 'No specific context found for this question.'
      }

      // Build customer intent context block
      const intentBlocks = []
      if (customer_intent) {
        intentBlocks.push(`Customer Intent:\n${customer_intent}`)
      }

      // Build active context from conversation state
      const activeContextBlocks = []
      if (conversation_state) {
        if (conversation_state.active_sku) {
          activeContextBlocks.push(`Active product: SKU ${conversation_state.active_sku}`)
        }
        if (conversation_state.budget_cap) {
          activeContextBlocks.push(`Budget: under $${conversation_state.budget_cap}`)
        }
        if (conversation_state.use_case) {
          activeContextBlocks.push(`Use case: ${conversation_state.use_case}`)
        }
      }

      // Use review_summary if provided (from enricher), otherwise fallback to buildReviewSummary
      let reviewSummaryText = review_summary
      if (!reviewSummaryText) {
        reviewSummaryText = buildReviewSummary(productRecord, relevantChunks)
      }
      const reviewBlocks = []
      if (reviewSummaryText) {
        reviewBlocks.push(`Review Summary:\n${reviewSummaryText}`)
      }

      // Add web review context if available
      const webReviewBlocks = []
      if (web_review_summary) {
        const webReviewContext = []
        if (web_review_summary.overall_sentiment) {
          webReviewContext.push(`Overall sentiment: ${web_review_summary.overall_sentiment}`)
        }
        if (web_review_summary.top_pros && web_review_summary.top_pros.length > 0) {
          webReviewContext.push(`Common pros: ${web_review_summary.top_pros.join(', ')}`)
        }
        if (web_review_summary.top_cons && web_review_summary.top_cons.length > 0) {
          webReviewContext.push(`Common cons: ${web_review_summary.top_cons.join(', ')}`)
        }
        if (web_review_summary.best_for && web_review_summary.best_for.length > 0) {
          webReviewContext.push(`Best for: ${web_review_summary.best_for.join(', ')}`)
        }
        if (web_review_summary.not_ideal_for && web_review_summary.not_ideal_for.length > 0) {
          webReviewContext.push(`Not ideal for: ${web_review_summary.not_ideal_for.join(', ')}`)
        }
        if (web_review_summary.notable_issues && web_review_summary.notable_issues.length > 0) {
          webReviewContext.push(`Notable issues: ${web_review_summary.notable_issues.join(', ')}`)
        }
        
        if (webReviewContext.length > 0) {
          webReviewBlocks.push(`Web Review Summary (from multiple sources):\n${webReviewContext.join('\n')}`)
        }
      }

      // Add web comparison context if available
      const webComparisonBlocks = []
      if (web_comparison_summary) {
        const comparisonContext = []
        if (web_comparison_summary.headline_summary) {
          comparisonContext.push(`Comparison summary: ${web_comparison_summary.headline_summary}`)
        }
        if (web_comparison_summary.areas_better_for_left && web_comparison_summary.areas_better_for_left.length > 0) {
          comparisonContext.push(`Left product better at: ${web_comparison_summary.areas_better_for_left.join(', ')}`)
        }
        if (web_comparison_summary.areas_better_for_right && web_comparison_summary.areas_better_for_right.length > 0) {
          comparisonContext.push(`Right product better at: ${web_comparison_summary.areas_better_for_right.join(', ')}`)
        }
        if (web_comparison_summary.recommendation_by_use_case && web_comparison_summary.recommendation_by_use_case.length > 0) {
          const useCaseRecs = web_comparison_summary.recommendation_by_use_case
            .map(rec => `${rec.use_case}: ${rec.better_choice} (${rec.explanation})`)
            .join('\n')
          comparisonContext.push(`Use case recommendations:\n${useCaseRecs}`)
        }
        
        if (comparisonContext.length > 0) {
          webComparisonBlocks.push(`Web Comparison Summary:\n${comparisonContext.join('\n')}`)
        }
      }

      // Build compare list context if comparing
      const compareBlocks = []
      if (compare_list && compare_list.length > 0) {
        compareBlocks.push(`Comparing products: SKUs ${compare_list.join(', ')}`)
      }
      
      // Detect if this is a general recommendation query (multiple SKUs in context)
      const uniqueSkus = [...new Set(relevantChunks.map(c => c.sku).filter(Boolean))]
      const isGeneralRecommendation = uniqueSkus.length > 1 && !compare_list?.length
      
      // Build product info context with names for all SKUs
      if (Object.keys(productRecords).length > 0) {
        const productInfoList = uniqueSkus
          .filter(sku => productRecords[sku])
          .slice(0, 10) // Limit to top 10
          .map(sku => {
            const info = productRecords[sku]
            return `SKU ${sku}: ${info.name}${info.price ? ` ($${info.price})` : ''}${info.category ? ` - ${info.category}` : ''}`
          })
        
        if (productInfoList.length > 0) {
          compareBlocks.push(`Product information:\n${productInfoList.join('\n')}`)
        }
      }
      
      if (isGeneralRecommendation && uniqueSkus.length > 1) {
        compareBlocks.push(`Multiple product options found: Present these ${uniqueSkus.length} options with their SKUs and names in your key_points`)
      }

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

      // Log what we're sending to LLM
      console.log(`[GenerationService] 📝 Building LLM prompt`)
      console.log(`[GenerationService]   Question: "${question}"`)
      console.log(`[GenerationService]   Context length: ${truncatedContext.length} chars`)
      console.log(`[GenerationService]   Active context blocks: ${activeContextBlocks.length}`)
      console.log(`[GenerationService]   Compare blocks: ${compareBlocks.length}`)
      console.log(`[GenerationService]   Product records: ${Object.keys(productRecords).length} SKUs`)
      console.log(`[GenerationService]   Is general recommendation: ${isGeneralRecommendation}`)
      if (isGeneralRecommendation) {
        console.log(`[GenerationService]   Unique SKUs in context: ${uniqueSkus.join(', ')}`)
      }
      
      // Use custom prompt if provided (for coaching/general info flows), otherwise build standard prompt
      let userPrompt
      if (custom_user_prompt) {
        userPrompt = custom_user_prompt
      } else {
        userPrompt = `Question: ${question}

${intentBlocks.length > 0 ? `${intentBlocks.join('\n\n')}\n\n` : ''}${activeContextBlocks.length > 0 ? `Active Context:\n${activeContextBlocks.join(', ')}\n\n` : ''}${compareBlocks.length > 0 ? `${compareBlocks.join('\n')}\n\n` : ''}Context:
${truncatedContext}

${reviewBlocks.length > 0 ? `\n${reviewBlocks.join('\n\n')}\n` : ''}${webReviewBlocks.length > 0 ? `\n${webReviewBlocks.join('\n\n')}\n` : ''}${webComparisonBlocks.length > 0 ? `\n${webComparisonBlocks.join('\n\n')}\n` : ''}${businessRules.length > 0 ? `\nAdditional information:\n${businessRules.join('\n')}` : ''}

${stockInfo.length > 0 ? `Stock availability:\n${stockInfo.join('\n')}` : ''}

${conversationContext.length > 0 ? `\nNote: Use the conversation history provided above to maintain context. If the user's question is a follow-up, assume it relates to the same product or topic discussed earlier unless they specify otherwise.` : ''}
${isGeneralRecommendation ? `\nIMPORTANT: This is a general recommendation query with multiple product options. 
- Present 3-5 different options in your key_points, ALWAYS including both the product name AND SKU for each option (e.g., "Option 1: [Product Name] (SKU 123456) - description"). 
- Compare them briefly to help the customer choose.
- Populate the shortlist_items array with the top 3-5 products from the candidate options, including name, hero_feature (one key selling point), price, and stock_indicator if available.` : ''}
${shortlist_items && shortlist_items.length > 0 ? `\nPre-built shortlist items available: ${JSON.stringify(shortlist_items.map(item => ({ sku: item.sku, name: item.name })))}. Use these in your shortlist_items response.` : ''}
${Object.keys(productRecords).length > 0 ? `\nWhen mentioning any SKU in your response, ALWAYS include the corresponding product name from the Product information provided above. Format: "[Product Name] (SKU [number])"` : ''}
${compare_list.length > 0 ? `\nIf comparing products, highlight key differences and similarities between the SKUs listed.` : ''}

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
  "compliance_flags": [],
  "product_metadata": {"name": "string | null", "image_url": "string | null", "price_band": "string | null", "sku": "string | null", "hero_features": ["string"]},
  "sales_script": {"lines": ["string"]},
  "customer_voice": {"overall_sentiment": "string | null", "top_pros": ["string"], "top_cons": ["string"], "best_for": ["string"], "not_ideal_for": ["string"], "notable_issues": ["string"]},
  "comparison_voice": {"enabled": "boolean", "headline_summary": "string | null", "areas_better_left": ["string"], "areas_better_right": ["string"], "tie_or_neutral_areas": ["string"], "recommendation_by_use_case": [{"use_case": "string", "better_choice": "string", "explanation": "string"}]},
  "shortlist_items": [{"sku": "string", "brand": "string", "product_name": "string", "model": "string | null", "headline_features": ["string (2-3 key features)"], "price_band": "string | null (e.g. 'Under $1,000')"}],
  "specs_fields": {"[key: string]": "string"},
  "warranty_summary": "string | null",
  "technical_notes": ["string"]
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- Make the summary friendly and conversational (1-2 sentences)
- Use the context provided to answer the question accurately
- If you don't have enough info, still return JSON with summary explaining what you found`
      }
      
      // Load system prompt (use custom if provided)
      const systemPrompt = custom_system_prompt || loadSystemPrompt()

      // Build messages array
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationContext, // Add conversation history if available
        { role: 'user', content: userPrompt },
      ]

      // Call Azure OpenAI
      // With increased token limits, we can request larger responses
      // For deep dive queries, we need more tokens for detailed responses
      const isDeepDive = custom_system_prompt && custom_system_prompt.includes('deep-dive')
      const maxTokens = isDeepDive ? 4000 : 3000 // More tokens for deep dive responses
      const response = await chatClient.getChatCompletions(messages, {
        maxTokens: maxTokens,
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
          shortlist_items,
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
          shortlist_items,
        })
      }

      // Extract active SKU from productRecord or conversation_state
      const activeSku = productRecord?.sku || conversation_state?.active_sku || (productRecord && Object.keys(productRecords).length === 1 ? Object.keys(productRecords)[0] : null)
      
      // Ensure all new fields have defaults if not present
      const enrichedAnswer = {
        ...structuredAnswer,
        product_metadata: structuredAnswer.product_metadata || (productRecord && activeSku ? {
          name: productRecord.name || productRecords[activeSku]?.name || null,
          image_url: null,
          price_band: productRecord.list_price ? `$${productRecord.list_price}` : (productRecord.pricing?.listPrice ? `$${productRecord.pricing.listPrice}` : (productRecords[activeSku]?.price ? `$${productRecords[activeSku].price}` : null)),
          sku: activeSku,
          hero_features: []
        } : null),
        sales_script: structuredAnswer.sales_script || { lines: [] },
        coaching_tips: structuredAnswer.coaching_tips || [],
        customer_voice: structuredAnswer.customer_voice || (web_review_summary ? {
          overall_sentiment: web_review_summary.overall_sentiment || null,
          top_pros: web_review_summary.top_pros || [],
          top_cons: web_review_summary.top_cons || [],
          best_for: web_review_summary.best_for || [],
          not_ideal_for: web_review_summary.not_ideal_for || [],
          notable_issues: web_review_summary.notable_issues || []
        } : null),
        comparison_voice: structuredAnswer.comparison_voice || (web_comparison_summary ? {
          enabled: true,
          headline_summary: web_comparison_summary.headline_summary || null,
          areas_better_left: web_comparison_summary.areas_better_for_left || [],
          areas_better_right: web_comparison_summary.areas_better_for_right || [],
          tie_or_neutral_areas: [],
          recommendation_by_use_case: web_comparison_summary.recommendation_by_use_case || []
        } : {
          enabled: false,
          headline_summary: null,
          areas_better_left: [],
          areas_better_right: [],
          tie_or_neutral_areas: [],
          recommendation_by_use_case: []
        }),
        // Use pre-built shortlist_items if available (from turnOrchestrator), otherwise use LLM's response
        // Pre-built items take priority because they're based on actual candidate SKUs
        shortlist_items: (shortlist_items && shortlist_items.length > 0)
          ? shortlist_items
          : (structuredAnswer.shortlist_items && structuredAnswer.shortlist_items.length > 0 ? structuredAnswer.shortlist_items : []),
        specs_fields: structuredAnswer.specs_fields || {},
        warranty_summary: structuredAnswer.warranty_summary || null,
        technical_notes: structuredAnswer.technical_notes || [],
        coaching_tips: structuredAnswer.coaching_tips || [],
        citations: relevantChunks.map((c) => c.chunk_id),
      }
      
      return enrichedAnswer
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

  generateFromContext({ question, relevantChunks, productRecord, availability, alternative, shortlist_items = [] }) {
    // Generate a helpful answer even if LLM fails
    const contextText = relevantChunks
      .map((chunk) => chunk.section_body)
      .join('\n\n')
      .substring(0, 2000) // Increased context window for better extraction

    // Extract key info from chunks more intelligently
    const keyPoints = []
    
    // Extract product name and basic info
    const productName = productRecord?.name || question.match(/SKU\s*(\d+)/i)?.[1] ? `Product SKU ${question.match(/SKU\s*(\d+)/i)?.[1]}` : 'this product'
    
    // Extract features from chunks - look for common patterns
    const featurePatterns = [
      { pattern: /(\d+\.\d+["']?\s*(?:inch|"|inches)?\s*(?:HD|Full HD|4K|8K|OLED|QLED|display|screen))/i, prefix: 'Display: ' },
      { pattern: /(\d+GB?\s*(?:RAM|memory|storage|SSD|HDD))/i, prefix: 'Memory/Storage: ' },
      { pattern: /(\d+mAh\s*battery)/i, prefix: 'Battery: ' },
      { pattern: /(\d+MP\s*camera)/i, prefix: 'Camera: ' },
      { pattern: /(octa-core|quad-core|dual-core)/i, prefix: 'Processor: ' },
      { pattern: /(warranty|guarantee)/i, prefix: 'Warranty: ' },
    ]
    
    for (const { pattern, prefix } of featurePatterns) {
      const match = contextText.match(pattern)
      if (match && !keyPoints.some(kp => kp.includes(match[1]))) {
        keyPoints.push(prefix + match[1])
      }
    }
    
    // Extract selling points from section titles
    const sectionTitles = relevantChunks
      .map(c => c.section_title)
      .filter(Boolean)
      .filter((title, idx, arr) => arr.indexOf(title) === idx) // Unique
    
    for (const title of sectionTitles.slice(0, 3)) {
      if (title && !title.includes('Product Overview') && !keyPoints.some(kp => kp.toLowerCase().includes(title.toLowerCase()))) {
        // Extract a sentence from chunks with this section title
        const sectionChunk = relevantChunks.find(c => c.section_title === title)
        if (sectionChunk?.section_body) {
          const firstSentence = sectionChunk.section_body.split(/[.!?]/)[0].trim()
          if (firstSentence && firstSentence.length > 20 && firstSentence.length < 150) {
            keyPoints.push(firstSentence)
          }
        }
      }
    }
    
    // Fallback: extract any meaningful sentences from chunks
    if (keyPoints.length < 3) {
      const sentences = contextText.split(/[.!?]\s+/).filter(s => s.length > 30 && s.length < 200)
      for (const sentence of sentences.slice(0, 3 - keyPoints.length)) {
        if (!keyPoints.some(kp => kp.includes(sentence.substring(0, 20)))) {
          keyPoints.push(sentence.trim())
        }
      }
    }
    
    // Build summary from question intent and product info
    let summary = ""
    if (productRecord?.name) {
      summary = `The ${productRecord.name}`
      if (productRecord.list_price || productRecord.pricing?.listPrice) {
        const price = productRecord.list_price || productRecord.pricing.listPrice
        summary += ` ($${price})`
      }
      summary += " is"
      if (question.toLowerCase().includes('gaming')) {
        summary += " a solid option for gaming"
      } else if (question.toLowerCase().includes('work') || question.toLowerCase().includes('wfh')) {
        summary += " well-suited for work from home"
      } else {
        summary += " a good choice"
      }
      summary += "."
    } else if (question.toLowerCase().includes('sku')) {
      summary = `This product is available and ready to help your customer.`
    } else {
      summary = "Based on our product catalogue, "
      if (question.toLowerCase().includes('gaming')) {
        summary += "I found some great gaming options for you."
      } else if (question.toLowerCase().includes('cheaper') || question.toLowerCase().includes('under')) {
        summary += "here are some more affordable options."
      } else {
        summary += "I have some options that match what you're looking for."
      }
    }

    return {
      summary,
      key_points: keyPoints.length > 0 ? keyPoints : (productRecord ? [
        productRecord.name ? `${productRecord.name} is available.` : 'Product is available.',
        availability?.this_store_qty ? `${availability.this_store_qty} available in this store.` : 'Check availability in store.',
        'See product details above for specifications.'
      ] : ['Check our catalogue for detailed specs']),
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
      shortlist_items: shortlist_items || [],
      product_metadata: null,
      sales_script: { lines: [] },
      coaching_tips: [],
      customer_voice: null,
      comparison_voice: {
        enabled: false,
        headline_summary: null,
        areas_better_left: [],
        areas_better_right: [],
        tie_or_neutral_areas: [],
        recommendation_by_use_case: []
      },
      shortlist_items: shortlist_items || [],
      specs_fields: {},
      warranty_summary: null,
      technical_notes: [],
    }
  },

  parseTextResponse(answerText, { productRecord, availability, alternative, shortlist_items = [] }) {
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
      product_metadata: null,
      sales_script: { lines: [] },
      customer_voice: null,
      comparison_voice: {
        enabled: false,
        headline_summary: null,
        areas_better_left: [],
        areas_better_right: [],
        tie_or_neutral_areas: [],
        recommendation_by_use_case: []
      },
      shortlist_items: shortlist_items || [],
      specs_fields: {},
      warranty_summary: null,
      technical_notes: [],
    }
  },
}

export default generationService

