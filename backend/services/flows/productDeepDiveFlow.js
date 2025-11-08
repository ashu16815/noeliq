// Product Deep Dive Flow
// Handles PRODUCT_DEEPDIVE intent - detailed information about a specific SKU

import productRetrievalService from '../productRetrievalService.js'
import ragRetrievalOptimizedService from '../ragRetrievalOptimizedService.js'
import availabilityService from '../availabilityService.js'
import similarProductService from '../similarProductService.js'
import generationService from '../generationService.js'
import conversationService from '../conversationService.js'
import loggingService from '../loggingService.js'
import webReviewCache from '../webReviewCache.js'
import webReviewService from '../webReviewService.js'

const productDeepDiveFlow = {
  /**
   * Process a product deep dive query
   * @param {Object} params - { user_text, sku, conversation_state, conversation_id, store_id }
   * @returns {Promise<Object>} - Structured answer with full product details
   */
  async process({ user_text, sku, conversation_state, conversation_id, store_id }) {
    try {
      console.log(`[ProductDeepDiveFlow] Processing deep dive for SKU: ${sku}`)
      
      // Step 1: Validate SKU
      if (!sku) {
        console.warn(`[ProductDeepDiveFlow] No SKU provided, cannot perform deep dive`)
        // Fallback to general flow
        return {
          conversation_id,
          summary: "I need a specific product SKU to provide detailed information. Please select a product or provide a SKU.",
          key_points: [],
          attachments: [],
          stock_and_fulfilment: {
            this_store_qty: null,
            nearby: [],
            fulfilment_summary: null,
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
        }
      }
      
      // Normalize SKU to string (ensure consistency)
      const normalizedSku = String(sku).trim()
      console.log(`[ProductDeepDiveFlow] Normalized SKU: "${normalizedSku}" (original: "${sku}")`)
      
      // Step 2: Query Azure AI Search for chunks with this SKU
      console.log(`[ProductDeepDiveFlow] Querying Azure AI Search for SKU ${normalizedSku}`)
      const topChunks = await ragRetrievalOptimizedService.retrieveRelevantChunks({
        sku: normalizedSku, // Filter by SKU
        question: user_text || `Tell me about product SKU ${normalizedSku}`,
        limit: 20, // Get more chunks for deep dive
        filters: {},
        customer_intent: null,
      })
      
      console.log(`[ProductDeepDiveFlow] Retrieved ${topChunks.length} chunks for SKU ${normalizedSku}`)
      
      // Step 3: Get product record (always try to get it, even if chunks are missing)
      let productRecord = await productRetrievalService.getProductRecord(normalizedSku)
      
      // If no chunks found, try multiple fallback strategies
      if (topChunks.length === 0) {
        console.warn(`[ProductDeepDiveFlow] No chunks found for SKU ${normalizedSku}, attempting fallback strategies`)
        
        // Strategy 1: Try productSearchService (same source as shortlist builder)
        // Use a broader search query that matches how shortlist finds products
        let productInfo = null
        if (productRecord) {
          productInfo = productRecord
          console.log(`[ProductDeepDiveFlow] ✅ Found product record from JSON storage`)
        } else {
          // Strategy 2: Query Azure AI Search with broader query (like shortlist does)
          try {
            const productSearchService = (await import('../productSearchService.js')).default
            console.log(`[ProductDeepDiveFlow] Attempting productSearchService lookup for SKU ${normalizedSku}`)
            // Try multiple search strategies
            let searchResults = []
            
            // Try 1: Direct SKU search
            searchResults = await productSearchService.searchProducts(`SKU ${normalizedSku}`, 10)
            console.log(`[ProductDeepDiveFlow] Direct SKU search returned ${searchResults.length} results`)
            
            // Try 2: If not found, try broader search (like shortlist does for category queries)
            if (searchResults.length === 0 || !searchResults.find(p => String(p.sku).trim() === normalizedSku)) {
              console.log(`[ProductDeepDiveFlow] Trying broader search for SKU ${normalizedSku}`)
              const broaderResults = await productSearchService.searchProducts(normalizedSku, 20)
              searchResults = broaderResults
              console.log(`[ProductDeepDiveFlow] Broader search returned ${searchResults.length} results`)
            }
            
            if (searchResults.length > 0) {
              console.log(`[ProductDeepDiveFlow] Sample SKUs from search: ${searchResults.slice(0, 5).map(p => `"${String(p.sku).trim()}"`).join(', ')}`)
            }
            
            const matchingProduct = searchResults.find(p => {
              const productSku = String(p.sku || '').trim()
              return productSku === normalizedSku
            })
            
            if (matchingProduct) {
              console.log(`[ProductDeepDiveFlow] ✅ Found product via productSearchService: ${matchingProduct.name} (SKU: ${matchingProduct.sku})`)
              // Try to get full record now that we know it exists
              productRecord = await productRetrievalService.getProductRecord(normalizedSku)
              if (productRecord) {
                productInfo = productRecord
              } else {
                // Build minimal product info from search result
                productInfo = {
                  name: matchingProduct.name || `Product ${normalizedSku}`,
                  brand: null,
                  category: matchingProduct.category || null,
                  pricing: {
                    currentPrice: matchingProduct.price || null,
                    listPrice: matchingProduct.price || null,
                  },
                  specs: {},
                  selling_points: [],
                }
              }
            } else {
              console.warn(`[ProductDeepDiveFlow] ⚠️ productSearchService found ${searchResults.length} results but none match SKU ${normalizedSku}`)
            }
          } catch (error) {
            console.warn(`[ProductDeepDiveFlow] ⚠️ productSearchService lookup failed:`, error.message)
          }
        }
        
        // Strategy 3: If still no product info, try querying chunks without SKU filter and filter in memory
        if (!productInfo) {
          try {
            console.log(`[ProductDeepDiveFlow] Attempting broad search to find SKU ${normalizedSku}`)
            const broadChunks = await ragRetrievalOptimizedService.retrieveRelevantChunks({
              sku: null, // No SKU filter - broad search
              question: `product SKU ${normalizedSku}`,
              limit: 50,
              filters: {},
              customer_intent: null,
            })
            
            console.log(`[ProductDeepDiveFlow] Broad search returned ${broadChunks.length} chunks`)
            if (broadChunks.length > 0) {
              const sampleSkus = [...new Set(broadChunks.slice(0, 10).map(c => String(c.sku).trim()).filter(Boolean))]
              console.log(`[ProductDeepDiveFlow] Sample SKUs from broad search: ${sampleSkus.join(', ')}`)
            }
            
            // Filter chunks by SKU in memory (try both string and number comparison)
            const matchingChunks = broadChunks.filter(c => {
              const chunkSku = String(c.sku || '').trim()
              return chunkSku === normalizedSku || chunkSku === String(parseInt(normalizedSku))
            })
            if (matchingChunks.length > 0) {
              console.log(`[ProductDeepDiveFlow] ✅ Found ${matchingChunks.length} chunks via broad search`)
              // Use these chunks for the deep dive - reassign topChunks
              topChunks.push(...matchingChunks)
            } else {
              console.warn(`[ProductDeepDiveFlow] ❌ No chunks found even with broad search`)
              // Final fallback: Check if product exists in parsed products (even if not indexed)
              // This handles cases where products are in XML but not yet indexed to Azure Search
              const dbClient = (await import('../../lib/dbClient.js')).default
              const allParsedSkus = await dbClient.getAllParsedProductSKUs()
              if (allParsedSkus.includes(normalizedSku)) {
                console.log(`[ProductDeepDiveFlow] ⚠️ SKU ${normalizedSku} exists in parsed products but not in search index - may need reindexing`)
              }
            }
          } catch (error) {
            console.warn(`[ProductDeepDiveFlow] ⚠️ Broad search failed:`, error.message)
          }
        }
        
        // If we have product info but no chunks, build a response from product info
        if (productInfo && topChunks.length === 0) {
          const brand = productInfo.brand || null
          const productName = productInfo.name || `Product ${normalizedSku}`
          const price = productInfo.pricing?.currentPrice || productInfo.pricing?.listPrice || productInfo.list_price || productInfo.current_price || null
          
          // Get stock
          const stockInfo = await availabilityService.getAvailability(normalizedSku, store_id)
          
          // Build key points from product info
          const keyPoints = []
          if (productInfo.specs) {
            if (productInfo.specs.ram) keyPoints.push(`${productInfo.specs.ram} RAM`)
            if (productInfo.specs.storage) keyPoints.push(`${productInfo.specs.storage} storage`)
            if (productInfo.specs.screen_size) keyPoints.push(`${productInfo.specs.screen_size} display`)
            if (productInfo.specs.processor) keyPoints.push(productInfo.specs.processor)
          }
          if (productInfo.selling_points && productInfo.selling_points.length > 0) {
            keyPoints.push(...productInfo.selling_points.slice(0, 3))
          }
          if (productInfo.features && productInfo.features.length > 0) {
            keyPoints.push(...productInfo.features.slice(0, 2).map(f => typeof f === 'string' ? f : f['#text'] || String(f)))
          }
          
          return {
            conversation_id,
            summary: `Here's what I found for ${productName}${brand ? ` (${brand})` : ''}.`,
            key_points: keyPoints.length > 0 ? keyPoints : ['Product details available - see below for more information'],
            attachments: [],
            stock_and_fulfilment: stockInfo,
            alternative_if_oos: {
              alt_sku: null,
              alt_name: null,
              why_this_alt: null,
              key_diff: null,
            },
            product_metadata: {
              name: productName,
              image_url: productInfo.image_url || null,
              price_band: price ? (price < 500 ? 'Under $500' : price < 1000 ? 'Under $1,000' : price < 1500 ? '$1,000 - $1,500' : 'Over $1,500') : null,
              sku: normalizedSku,
              hero_features: keyPoints.slice(0, 3),
            },
            sentiment_note: null,
            compliance_flags: [],
            citations: [],
          }
        }
        
        // If we still have no product info and no chunks, return error
        if (!productInfo && topChunks.length === 0) {
          return {
            conversation_id,
            summary: `I couldn't find detailed information for SKU ${normalizedSku} in our catalogue. Please verify the SKU or try a different product.`,
            key_points: [],
            attachments: [],
            stock_and_fulfilment: {
              this_store_qty: null,
              nearby: [],
              fulfilment_summary: null,
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
          }
        }
      }
      
      // Step 4: Extract product information from chunks and record
      // Ensure we have productRecord - try again with normalized SKU if needed
      if (!productRecord) {
        productRecord = await productRetrievalService.getProductRecord(normalizedSku)
      }
      
      const brand = productRecord?.brand || topChunks.find(c => c.brand)?.brand || 'Unknown Brand'
      const productName = productRecord?.name || topChunks.find(c => c.section_title?.includes('Product'))?.section_body?.match(/Product[:\s]+([^\n(]+)/i)?.[1]?.trim() || `Product ${normalizedSku}`
      const model = productRecord?.specs?.model || productRecord?.model || null
      const price = productRecord?.list_price || productRecord?.current_price || productRecord?.pricing?.listPrice || null
      
      // Determine price band
      let priceBand = null
      if (price) {
        if (price < 500) priceBand = 'Under $500'
        else if (price < 1000) priceBand = 'Under $1,000'
        else if (price < 1500) priceBand = '$1,000 - $1,500'
        else if (price < 2000) priceBand = '$1,500 - $2,000'
        else priceBand = 'Over $2,000'
      }
      
      // Step 5: Get stock availability
      const stockInfo = await availabilityService.getAvailability(normalizedSku, store_id)
      
      // Step 6: Optionally fetch web review summary
      let webReviewSummary = null
      if (productRecord?.brand && model) {
        try {
          webReviewSummary = await webReviewCache.getOrFetchReview({
            sku: normalizedSku,
            brand: productRecord.brand,
            model: model,
            category: productRecord.category || null,
            list_price: price || null,
          })
        } catch (error) {
          console.warn(`[ProductDeepDiveFlow] Web review fetch failed:`, error.message)
        }
      }
      
      // Step 7: Build context summary from chunks
      const contextSummary = topChunks.map(c => `[${c.section_title || 'Unknown'}]\n${c.section_body || ''}`).join('\n\n')
      
      // Step 8: Generate answer using LLM
      const answer = await generationService.buildPromptAndCallLLM({
        question: user_text || `Tell me about product SKU ${normalizedSku}`,
        relevantChunks: topChunks,
        context_summary: contextSummary,
        productRecord: productRecord,
        availability: stockInfo,
        alternative: null,
        conversationContext: [],
        conversation_state: conversation_state,
        customer_intent: null,
        review_summary: webReviewSummary,
        compare_list: [],
        productRecords: productRecord ? { [normalizedSku]: { name: productName, category: productRecord.category, price: price } } : {},
        web_review_summary: webReviewSummary,
        web_comparison_summary: null,
        shortlist_items: [],
        custom_user_prompt: null,
        custom_system_prompt: `You are NoelIQ, an expert in-store assistant for Noel Leeming.
You are now giving a deep-dive explanation of ONE specific product identified by SKU ${normalizedSku}.
Use the provided product context (brand, product_name, model, price, key_features, specs, warranty, attachments, stock, review_summary).
Your job is to help a store rep talk about this product confidently to a customer.
Start with a strong one-sentence summary that includes the product name (not just the SKU) and why it fits the customer's goal.
Then provide 4–6 bullet points highlighting the most important features for the stated use case (e.g. work from home, social media, gaming).
Always include stock/availability info and suggest 2–3 relevant attachments with 'why' explanations.
If review summary is provided, add a short 'What customers are saying' text based on it.
Never respond with 'check our catalogue for detailed specs' as your main answer for deep-dive. Instead, surface those specs directly in a clear way.`,
      })
      
      // Step 9: Update conversation state
      await conversationService.updateConversationState(conversation_id, {
        active_sku: normalizedSku,
        active_category: productRecord?.category || null,
        last_query: user_text,
      })
      
      // Step 10: Return structured answer
      return {
        ...answer,
        conversation_id: conversation_id,
        citations: topChunks.map(c => c.chunk_id).filter(Boolean),
        product_metadata: {
          name: productName,
          image_url: productRecord?.image_url || null,
          price_band: priceBand,
          sku: normalizedSku,
          hero_features: answer.key_points?.slice(0, 3) || [],
        },
      }
    } catch (error) {
      console.error(`[ProductDeepDiveFlow] Error processing deep dive:`, error)
      return {
        conversation_id,
        summary: `I encountered an error while retrieving information for SKU ${sku}. Please try again or contact support.`,
        key_points: [],
        attachments: [],
        stock_and_fulfilment: {
          this_store_qty: null,
          nearby: [],
          fulfilment_summary: null,
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
      }
    }
  },
}

export default productDeepDiveFlow
