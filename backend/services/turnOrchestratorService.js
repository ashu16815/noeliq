// Turn Orchestrator Service
// Orchestrates the full pipeline: intent → entity → context → query → retrieve → condense → enrich → generate

import intentClassifierService from './intentClassifierService.js'
import entityResolverService from './entityResolverService.js'
import contextManagerService from './contextManagerService.js'
import queryRewriterService from './queryRewriterService.js'
import ragRetrievalOptimizedService from './ragRetrievalOptimizedService.js'
import condenserService from './condenserService.js'
import enricherService from './enricherService.js'
import generationService from './generationService.js'
import availabilityService from './availabilityService.js'
import similarProductService from './similarProductService.js'
import productRetrievalService from './productRetrievalService.js'
import loggingService from './loggingService.js'
import conversationService from './conversationService.js'

const turnOrchestratorService = {
  /**
   * Process a single turn in the conversation
   * @param {Object} params - { conversation_id, store_id, user_text, sku (optional barcode scan) }
   * @returns {Promise<Object>} - Structured answer + metadata
   */
  async processTurn({ conversation_id, store_id, user_text, sku: providedSku }) {
    try {
      console.log(`[TurnOrchestrator] Processing turn for conversation ${conversation_id}`)
      
      // Step 1: Load or create conversation state
      const conversationState = conversationService.getConversationContext(conversation_id)
      if (store_id && !conversationState.store_id) {
        conversationService.updateConversationContext(conversation_id, { store_id })
      }

      // Step 2: Intent classification
      console.log(`[TurnOrchestrator] Step 2: Classifying intent...`)
      const intent = await intentClassifierService.detect(user_text, conversationState)
      console.log(`[TurnOrchestrator] Intent: ${intent.intent}, need_compare: ${intent.need_compare}`)

      // Step 3: Entity resolution
      console.log(`[TurnOrchestrator] Step 3: Resolving entities...`)
      let resolvedEntities = await entityResolverService.resolve(user_text, conversationState)
      
      // Override with provided SKU if available (e.g., from barcode scan)
      if (providedSku) {
        resolvedEntities.active_sku = providedSku
        // Try to get category/brand from product record
        const product = await productRetrievalService.getProductRecord(providedSku)
        if (product) {
          resolvedEntities.category = product.category || resolvedEntities.category
          resolvedEntities.brand = product.brand || resolvedEntities.brand
        }
      }
      
      console.log(`[TurnOrchestrator] Resolved: active_sku=${resolvedEntities.active_sku}, category=${resolvedEntities.category}, brand=${resolvedEntities.brand}`)

      // Step 4: Update conversation state
      console.log(`[TurnOrchestrator] Step 4: Updating conversation state...`)
      const updatedState = contextManagerService.update(
        conversation_id,
        resolvedEntities,
        intent,
        user_text
      )

      // Step 5: Query rewriting
      console.log(`[TurnOrchestrator] Step 5: Rewriting query...`)
      const rewrittenQuery = await queryRewriterService.rewrite(
        user_text,
        updatedState,
        resolvedEntities,
        intent
      )
      console.log(`[TurnOrchestrator] Resolved query: "${rewrittenQuery.resolved_query}"`)
      console.log(`[TurnOrchestrator] Filters:`, rewrittenQuery.filters)
      console.log(`[TurnOrchestrator] Compare list:`, rewrittenQuery.compare_list)

      // Step 6: Retrieve relevant chunks
      console.log(`[TurnOrchestrator] Step 6: Retrieving chunks...`)
      const activeSku = resolvedEntities.active_sku || updatedState.active_sku
      const customerIntent = conversationService.buildIntentSummary(updatedState.customer_intent)
      
      // For general recommendation queries, use candidate_skus if available, or no SKU filter
      let skuForRetrieval = activeSku
      let compareList = rewrittenQuery.compare_list || []
      
      // If we have candidate_skus but no active_sku (general recommendation), use candidate_skus for retrieval
      if (!activeSku && resolvedEntities.candidate_skus && resolvedEntities.candidate_skus.length > 0) {
        compareList = resolvedEntities.candidate_skus.slice(0, 5) // Use top 5 candidates
        console.log(`[TurnOrchestrator] General recommendation query - retrieving for ${compareList.length} candidate SKUs`)
      }
      
      const topChunks = await ragRetrievalOptimizedService.retrieveRelevantChunks({
        sku: skuForRetrieval, // null for general queries = no SKU filter
        question: rewrittenQuery.resolved_query,
        limit: 15, // Retrieve more chunks when we need multiple SKUs
        filters: rewrittenQuery.filters,
        customer_intent: customerIntent,
        compare_list: compareList.length > 0 ? compareList : undefined,
      })
      console.log(`[TurnOrchestrator] Retrieved ${topChunks.length} chunks from ${new Set(topChunks.map(c => c.sku)).size} unique SKUs`)

      // Step 7: Condense context if needed
      console.log(`[TurnOrchestrator] Step 7: Condensing context...`)
      let contextSummary
      if (condenserService.needsCondensation(topChunks, 900)) {
        contextSummary = await condenserService.condense(topChunks, 900)
        console.log(`[TurnOrchestrator] Condensed to ${contextSummary.length} chars`)
      } else {
        // Use chunks directly
        contextSummary = topChunks.map(c => `[${c.section_title || 'Unknown'}]\n${c.section_body || ''}`).join('\n\n')
      }

      // Step 8: Get product records for all SKUs found in chunks (for product names)
      console.log(`[TurnOrchestrator] Step 8: Getting product records for all SKUs...`)
      const uniqueSkus = [...new Set(topChunks.map(c => c.sku).filter(Boolean))]
      const productRecords = {}
      
      // Fetch product records for all unique SKUs in parallel
      await Promise.all(
        uniqueSkus.map(async (sku) => {
          try {
            const record = await productRetrievalService.getProductRecord(sku)
            if (record && record.name) {
              productRecords[sku] = {
                name: record.name,
                category: record.category || null,
                price: record.list_price || record.current_price || null,
              }
            } else {
              // Fallback: Try to extract product name from chunks
              const skuChunks = topChunks.filter(c => c.sku === sku)
              for (const chunk of skuChunks) {
                if (chunk.section_title === 'Product Overview' || chunk.section_title?.includes('Product')) {
                  const body = chunk.section_body || ''
                  const nameMatch = body.match(/Product[:\s]+([^\n(]+?)(?:\s*\(SKU:|$)/i)
                  if (nameMatch && nameMatch[1]) {
                    let extractedName = nameMatch[1].trim()
                    extractedName = extractedName.replace(/^[-•]\s*/, '')
                    extractedName = extractedName.replace(/\s*\(SKU:\s*\d+\)/gi, '')
                    if (extractedName.length > 3 && !extractedName.match(/^(Features|Specifications|Key|Selling|Points|Category|Brand|SKU)/i)) {
                      productRecords[sku] = {
                        name: extractedName,
                        category: null,
                        price: null,
                      }
                      break // Found name, move to next SKU
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.warn(`[TurnOrchestrator] Could not fetch product record for SKU ${sku}:`, error.message)
          }
        })
      )
      
      console.log(`[TurnOrchestrator] Fetched ${Object.keys(productRecords).length} product records (with names)`)
      
      // Get primary product record for review hints
      const productRecord = activeSku ? (productRecords[activeSku] || await productRetrievalService.getProductRecord(activeSku)) : null
      const reviewSummary = enricherService.genericReviewHints(
        activeSku,
        resolvedEntities.category || updatedState.active_category,
        productRecord,
        topChunks
      )

      // Step 9: Get availability and alternatives
      console.log(`[TurnOrchestrator] Step 9: Getting availability...`)
      let availability = null
      let alternative = null
      
      if (store_id) {
        // For general recommendation queries, we might have multiple SKUs but no activeSku
        // Get availability for the first SKU found in chunks, or use activeSku if available
        const skuForAvailability = activeSku || (uniqueSkus.length > 0 ? uniqueSkus[0] : null)
        
        if (skuForAvailability) {
          availability = await availabilityService.getAvailability(skuForAvailability, store_id)
          console.log(`[TurnOrchestrator] Availability for SKU ${skuForAvailability}: ${availability?.this_store_qty ?? 'null'} units`)
          
          if (availability && availability.this_store_qty === 0) {
            alternative = await similarProductService.getAlternativeIfOOS(skuForAvailability, store_id)
          }
          
          // For general queries with multiple SKUs, add a note about checking other products
          if (!activeSku && uniqueSkus.length > 1) {
            availability.fulfilment = (availability.fulfilment || '') + 
              ` (Note: Check availability for other options: ${uniqueSkus.slice(1, 4).join(', ')})`
          }
        } else {
          // No SKU found at all - provide generic message
          availability = {
            sku: null,
            store_id,
            this_store_qty: null,
            nearby: [],
            fulfilment: 'Select a specific product to check availability',
            last_checked_ts: new Date().toISOString(),
          }
        }
      } else {
        // No store selected
        availability = {
          sku: activeSku || null,
          store_id: null,
          this_store_qty: null,
          nearby: [],
          fulfilment: 'Select a store to check availability',
          last_checked_ts: new Date().toISOString(),
        }
      }

      // Step 10: Build conversation history
      const conversationHistory = conversationService.buildConversationHistory(conversation_id, 3)

      // Step 11: Generate answer
      console.log(`[TurnOrchestrator] Step 11: Generating answer...`)
      console.log(`[TurnOrchestrator] Input to generation service:`)
      console.log(`[TurnOrchestrator]   - Context summary length: ${contextSummary.length} chars`)
      console.log(`[TurnOrchestrator]   - Top chunks: ${topChunks.length}`)
      console.log(`[TurnOrchestrator]   - Product records: ${Object.keys(productRecords).length} SKUs`)
      console.log(`[TurnOrchestrator]   - Active SKU: ${activeSku || 'null'}`)
      console.log(`[TurnOrchestrator]   - Compare list: [${rewrittenQuery.compare_list.join(', ') || 'none'}]`)
      const answer = await generationService.buildPromptAndCallLLM({
        question: user_text,
        relevantChunks: topChunks, // Pass original chunks for citations
        context_summary: contextSummary, // Pass condensed summary for prompt
        productRecord,
        availability,
        alternative,
        conversationContext: conversationHistory,
        conversation_state: updatedState,
        review_summary: reviewSummary,
        compare_list: rewrittenQuery.compare_list,
        customer_intent: customerIntent,
        productRecords, // Pass all product records so names can be included with SKUs
      })

      console.log(`[TurnOrchestrator] Generated answer:`)
      console.log(`[TurnOrchestrator]   - Summary length: ${answer.summary?.length || 0} chars`)
      console.log(`[TurnOrchestrator]   - Key points: ${answer.key_points?.length || 0} items`)
      console.log(`[TurnOrchestrator]   - Attachments: ${answer.attachments?.length || 0} items`)
      console.log(`[TurnOrchestrator]   - Alternative SKU: ${answer.alternative_if_oos?.alt_sku || 'none'}`)

      // Step 12: Update conversation state with turn
      conversationService.addTurn(conversation_id, user_text, answer, activeSku || providedSku)

      // Step 13: Log the turn
      await loggingService.logAnswer({
        store_id,
        staff_id: null, // Could be extracted from headers if needed
        sku: activeSku || null,
        question: user_text,
        answer_length: answer.summary?.length || 0,
        oos_alternative_shown: !!answer.alternative_if_oos?.alt_sku,
        attachments_suggested: answer.attachments?.length > 0,
      })

      console.log(`[TurnOrchestrator] ✅ Turn processed successfully`)
      console.log(`[TurnOrchestrator] Returning answer with ${topChunks.filter(c => c.chunk_id).length} citations`)
      
      return {
        ...answer,
        citations: topChunks.map(c => c.chunk_id).filter(Boolean),
        conversation_id: conversation_id,
      }
    } catch (error) {
      console.error('[TurnOrchestrator] Error processing turn:', error)
      throw error
    }
  },
}

export default turnOrchestratorService

