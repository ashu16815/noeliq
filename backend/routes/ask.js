import express from 'express'
import productRetrievalService from '../services/productRetrievalService.js'
import ragRetrievalService from '../services/ragRetrievalService.js'
import ragRetrievalOptimizedService from '../services/ragRetrievalOptimizedService.js'
import availabilityService from '../services/availabilityService.js'
import similarProductService from '../services/similarProductService.js'
import generationService from '../services/generationService.js'
import loggingService from '../services/loggingService.js'
import conversationService from '../services/conversationService.js'
import turnOrchestratorService from '../services/turnOrchestratorService.js'

const router = express.Router()

// Simple auth middleware (MVP)
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token !== process.env.STAFF_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

router.post('/', authenticate, async (req, res) => {
  try {
    const { sku: providedSku, question, store_id, conversation_id } = req.body

    if (!question) {
      return res.status(400).json({ error: 'question is required' })
    }

    // Get or create conversation context
    const conversationId = conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Check if turn orchestrator is enabled
    const useTurnOrchestrator = process.env.USE_TURN_ORCHESTRATOR === 'true'

    if (useTurnOrchestrator) {
      // Use new turn orchestrator pipeline
      console.log(`[Query] Using turn orchestrator pipeline`)
      
      try {
        const result = await turnOrchestratorService.processTurn({
          conversation_id: conversationId,
          store_id,
          user_text: question,
          sku: providedSku,
        })

        // Return structured response
        res.json({
          conversation_id: result.conversation_id || conversationId,
          summary: result.summary || "Let me check that for you.",
          key_points: result.key_points || [],
          attachments: result.attachments || [],
          stock_and_fulfilment: result.stock_and_fulfilment || {
            this_store_qty: null,
            nearby: [],
            fulfilment_summary: null,
          },
          alternative_if_oos: result.alternative_if_oos || {
            alt_sku: null,
            alt_name: null,
            why_this_alt: null,
            key_diff: null,
          },
          sentiment_note: result.sentiment_note || null,
          compliance_flags: result.compliance_flags || [],
          citations: result.citations || [],
        })
        return
      } catch (orchestratorError) {
        console.error('[Query] Turn orchestrator error, falling back to legacy flow:', orchestratorError)
        // Fall through to legacy flow
      }
    }

    // Legacy flow (existing implementation)
    // Infer SKU from context if not provided (e.g., "cheaper?", "has Dolby Atmos?")
    const sku = providedSku || conversationService.inferSKUFromContext(conversationId, question, providedSku)

    console.log(`[Query] SKU: ${sku || 'none'}, Question: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"`)

    // Log the question
    await loggingService.logQuestion({
      store_id,
      staff_id: req.headers['x-staff-id'] || null,
      sku: sku || null,
      question,
      conversation_id,
    })

    // Step 0.5: Get customer intent from conversation context, extract intent from current question, and merge
    const existingIntent = conversationService.getCustomerIntent(conversationId)
    const currentQuestionIntent = conversationService.extractCustomerIntent(question)
    const mergedIntent = conversationService.mergeIntent(existingIntent, currentQuestionIntent)
    const intentSummary = conversationService.buildIntentSummary(mergedIntent)
    
    if (intentSummary) {
      console.log(`[Query] Customer intent: ${intentSummary}`)
    }

    // Step 1: Retrieve relevant chunks via RAG (use optimized service if enabled)
    const useOptimizedRAG = process.env.USE_OPTIMIZED_RAG === 'true'
    const chunkLimit = parseInt(process.env.RAG_CHUNK_LIMIT || '5', 10)
    
    console.log(`[Query] Step 1: Retrieving relevant chunks (${useOptimizedRAG ? 'optimized' : 'standard'}, limit: ${chunkLimit})...`)
    
    const relevantChunks = useOptimizedRAG
      ? await ragRetrievalOptimizedService.retrieveRelevantChunks({
          sku,
          question,
          limit: chunkLimit,
          filters: {}, // Can add brand, category filters here
          customer_intent: intentSummary,
        })
      : await ragRetrievalService.retrieveRelevantChunks({
          sku,
          question,
          limit: chunkLimit,
          customer_intent: intentSummary,
        })
    
    console.log(`[Query] Found ${relevantChunks.length} relevant chunks (requested: ${chunkLimit})`)

    // Step 1.5: Extract SKU from chunks if not provided but mentioned in chunks
    let effectiveSku = sku
    if (!effectiveSku && relevantChunks.length > 0) {
      // Try to find SKU in chunks (most common SKU in results)
      const skuCounts = {}
      relevantChunks.forEach(chunk => {
        if (chunk.sku) {
          skuCounts[chunk.sku] = (skuCounts[chunk.sku] || 0) + 1
        }
      })
      
      // Use the most frequently mentioned SKU
      const sortedSKUs = Object.entries(skuCounts).sort((a, b) => b[1] - a[1])
      if (sortedSKUs.length > 0) {
        effectiveSku = sortedSKUs[0][0]
        console.log(`[Query] Extracted SKU from chunks: ${effectiveSku} (mentioned ${sortedSKUs[0][1]} times)`)
      }
    }

    // Step 2: Get structured product record if SKU available
    let productRecord = null
    if (effectiveSku) {
      productRecord = await productRetrievalService.getProductRecord(effectiveSku)
    }

    // Step 3: Get availability (check if store_id is provided)
    let availability = null
    if (store_id) {
      // If we have a SKU (provided or extracted), get specific product availability
      if (effectiveSku) {
        availability = await availabilityService.getAvailability(effectiveSku, store_id)
        console.log(`[Query] Availability checked for SKU ${effectiveSku}: ${availability?.this_store_qty ?? 'null'} units`)
      } else {
        // No SKU found - return a generic availability structure
        availability = {
          sku: null,
          store_id,
          this_store_qty: null,
          nearby: [],
          fulfilment: 'Select a product to check specific availability',
        }
      }
    }

    // Step 4: Get alternative if OOS (use effectiveSku)
    let alternative = null
    if (availability && availability.this_store_qty === 0 && effectiveSku) {
      alternative = await similarProductService.getAlternativeIfOOS(effectiveSku, store_id)
    }

    // Step 5: Get conversation history for context
    const conversationHistory = conversationService.buildConversationHistory(conversationId, 3)

    // Step 6: Generate answer
    console.log(`[Query] Step 6: Generating answer with LLM...`)
    const answer = await generationService.buildPromptAndCallLLM({
      question,
      relevantChunks,
      productRecord,
      availability,
      alternative,
      conversationContext: conversationHistory,
      customer_intent: intentSummary,
    })

    // Step 7: Update conversation context (use effectiveSku for tracking)
    conversationService.addTurn(conversationId, question, answer, effectiveSku || sku)

    // Step 8: Log the answer
    await loggingService.logAnswer({
      store_id,
      staff_id: req.headers['x-staff-id'] || null,
      sku: effectiveSku || sku || null,
      question,
      answer_length: answer.summary?.length || 0,
      oos_alternative_shown: !!answer.alternative_if_oos?.alt_sku,
      attachments_suggested: answer.attachments?.length > 0,
    })

    // Step 9: Return structured response (new format)
    res.json({
      conversation_id: conversationId,
      summary: answer.summary || "Let me check that for you.",
      key_points: answer.key_points || [],
      attachments: answer.attachments || [],
      stock_and_fulfilment: (() => {
        // If LLM provided stock_and_fulfilment, clean it up if store_id is present
        if (answer.stock_and_fulfilment) {
          let fulfilmentSummary = answer.stock_and_fulfilment.fulfilment_summary || ''
          
          // If store_id is set, replace confusing prompts with better messages
          if (store_id) {
            // Remove confusing "Select a..." messages when store is already selected
            if (fulfilmentSummary.toLowerCase().includes('select a specific') || 
                fulfilmentSummary.toLowerCase().includes('select a store') ||
                fulfilmentSummary.toLowerCase().includes('select a service') ||
                fulfilmentSummary.toLowerCase().includes('select a product')) {
              // Only use LLM's message if it has actual stock info
              if (answer.stock_and_fulfilment.this_store_qty !== null || 
                  (answer.stock_and_fulfilment.nearby && answer.stock_and_fulfilment.nearby.length > 0)) {
                // Keep LLM's message if it has real data
                fulfilmentSummary = fulfilmentSummary
              } else {
                // Replace with clearer message
                fulfilmentSummary = availability?.fulfilment || 'Store selected - ask about a specific product to check availability'
              }
            }
          } else {
            // No store selected - use LLM's message or fallback
            fulfilmentSummary = fulfilmentSummary || 'Select a store to check availability'
          }
          
          return {
            ...answer.stock_and_fulfilment,
            fulfilment_summary: fulfilmentSummary,
          }
        }
        
        // Fallback: use availability data if available
        return {
          this_store_qty: availability?.this_store_qty ?? null,
          nearby: availability?.nearby || [],
          fulfilment_summary: availability?.fulfilment || (store_id ? 'Store selected - ask about a specific product to check availability' : 'Select a store to check availability'),
        }
      })(),
      alternative_if_oos: answer.alternative_if_oos || {
        alt_sku: null,
        alt_name: null,
        why_this_alt: null,
        key_diff: null,
      },
      sentiment_note: answer.sentiment_note || null,
      compliance_flags: answer.compliance_flags || [],
      citations: answer.citations || [],
    })
    console.log(`[Query] ✅ Response sent (summary: ${answer.summary?.substring(0, 50)}..., ${answer.citations?.length || 0} citations)`)
  } catch (error) {
    console.error('Error in /ask route:', error)
    console.error('Error stack:', error.stack)
    console.error('Request body:', { sku, question, store_id, conversation_id })
    
    // Graceful fallback
    const conversationId = req.body.conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    res.status(200).json({
      conversation_id: conversationId,
      summary: "I'm sorry, I encountered an issue. Let me check that for you.",
      key_points: [],
      attachments: [],
      stock_and_fulfilment: {
        this_store_qty: null,
        nearby: [],
        fulfilment_summary: '',
      },
      alternative_if_oos: {
        alt_sku: null,
        alt_name: null,
        why_this_alt: null,
        key_diff: null,
      },
      sentiment_note: null,
      compliance_flags: [],
      citations: [],
    })
  }
})

export default router

