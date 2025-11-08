// Turn Orchestrator Service
// Orchestrates the full pipeline: intent → entity → context → query → retrieve → condense → enrich → generate

import intentClassifierService from './intentClassifierService.js'
import intentRouterService from './intentRouterService.js'
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
import salesCoachingFlow from './flows/salesCoachingFlow.js'
import generalInfoFlow from './flows/generalInfoFlow.js'

const turnOrchestratorService = {
  /**
   * Process a single turn in the conversation
   * @param {Object} params - { conversation_id, store_id, user_text, sku (optional barcode scan) }
   * @returns {Promise<Object>} - Structured answer + metadata
   */
  async processTurn({ conversation_id, store_id, user_text, sku: providedSku }) {
    try {
      console.log(`[TurnOrchestrator] Processing turn for conversation ${conversation_id}`)
      
      // Step 0: Load conversation state and classify intent using router
      const conversationState = conversationService.getConversationContext(conversation_id)
      if (store_id && !conversationState.store_id) {
        conversationService.updateConversationContext(conversation_id, { store_id })
      }
      
        // Classify intent using intent router (pass providedSku if available)
        const intentClassification = await intentRouterService.classifyIntent(user_text, conversationState, providedSku)
        console.log(`[TurnOrchestrator] Intent Router: ${intentClassification.intent} (confidence: ${intentClassification.confidence})`)
      
      // Route to appropriate flow based on intent
      if (intentClassification.intent === 'SALES_COACHING') {
        console.log(`[TurnOrchestrator] Routing to Sales Coaching Flow`)
        return await salesCoachingFlow.process({
          user_text,
          conversation_state: conversationState,
          conversation_id,
          store_id,
        })
      }
      
      if (intentClassification.intent === 'GENERAL_INFO') {
        console.log(`[TurnOrchestrator] Routing to General Info Flow`)
        return await generalInfoFlow.process({
          user_text,
          conversation_state: conversationState,
          conversation_id,
          store_id,
        })
      }
      
      if (intentClassification.intent === 'PRODUCT_DEEPDIVE') {
        console.log(`[TurnOrchestrator] Routing to Product Deep Dive Flow`)
        const { default: productDeepDiveFlow } = await import('./flows/productDeepDiveFlow.js')
        return await productDeepDiveFlow.process({
          user_text,
          sku: providedSku || conversationState.active_sku,
          conversation_state: conversationState,
          conversation_id,
          store_id,
        })
      }
      
      // For PRODUCT_DISCOVERY and COMPARISON intents, continue with existing product flow
      console.log(`[TurnOrchestrator] Routing to Product Flow (${intentClassification.intent})`)

      // Step 2: Intent classification (for product flows, still use existing classifier)
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
      
      // For general recommendations, also include candidate SKUs even if not in chunks yet
      if (!activeSku && resolvedEntities.candidate_skus && resolvedEntities.candidate_skus.length > 0) {
        resolvedEntities.candidate_skus.forEach(sku => {
          if (!uniqueSkus.includes(sku)) {
            uniqueSkus.push(sku)
          }
        })
      }
      
      const productRecords = {}
      
      // Fetch product records for all unique SKUs in parallel
      await Promise.all(
        uniqueSkus.map(async (sku) => {
          try {
            const record = await productRetrievalService.getProductRecord(sku)
            if (record && record.name) {
              productRecords[sku] = {
                name: record.name,
                brand: record.brand || null,
                category: record.category || null,
                price: record.list_price || record.current_price || record.pricing?.listPrice || null,
                specs: record.specs || null,
                model: record.model || record.specs?.model || null,
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
      
      // Build shortlist items for general recommendation queries
      let shortlistItems = []
      const isGeneralRecommendation = !activeSku && resolvedEntities.candidate_skus && resolvedEntities.candidate_skus.length > 0
      if (isGeneralRecommendation) {
        console.log(`[TurnOrchestrator] Building shortlist for ${resolvedEntities.candidate_skus.length} candidate SKUs`)
        
        // Use candidate_products from entityResolver if available (they already have names extracted)
        const candidateProducts = resolvedEntities.candidate_products || []
        console.log(`[TurnOrchestrator] Using ${candidateProducts.length} candidate products from entity resolver`)
        
        // Build shortlist from candidate SKUs - extract real product information
        for (const sku of resolvedEntities.candidate_skus.slice(0, 5)) {
          try {
            const skuChunks = topChunks.filter(c => c.sku === sku)
            
            // Try to get full product record first (best source of truth)
            let fullRecord = null
            try {
              fullRecord = await productRetrievalService.getProductRecord(sku)
            } catch (error) {
              // Ignore - will use chunks as fallback
            }
            
            // Extract product name FIRST (prefer candidate_products from entityResolver, then full record, then chunks)
            let productName = null
            // Try from candidate_products first (they already have extracted names from productSearchService)
            const candidateProduct = candidateProducts.find(p => p.sku === sku)
            if (candidateProduct?.name) {
              // Use the product name from search results - it's already extracted
              productName = candidateProduct.name.trim()
              // Only use if it's not a generic "Product <SKU>" name
              if (productName.match(/^Product\s+\d+$/i)) {
                productName = null // Will fall back to other sources
              }
            }
            
            // Extract brand (try multiple sources)
            let brand = fullRecord?.brand || null
            // Try from productRecords cache
            if (!brand && productRecords[sku]?.brand) {
              brand = productRecords[sku].brand
            }
            // Extract brand from product name if we have one from candidateProduct
            if (!brand && candidateProduct?.name) {
              // Common patterns: "NOKIA 5 SMARTPHONE BLACK", "OPPO AX5 SMARTPHONE", "Samsung Galaxy A15"
              const brandPatterns = [
                /^(Apple|Samsung|LG|Sony|HP|Dell|Lenovo|ASUS|Microsoft|Panasonic|Nokia|NOKIA|Motorola|OnePlus|Xiaomi|Oppo|OPPO|Vivo|Realme|Honor|Huawei)\b/i,
                /^([A-Z]+)\s+(?:SMARTPHONE|PHONE|LAPTOP|TV|TABLET)/i, // Uppercase brand at start
              ]
              for (const pattern of brandPatterns) {
                const match = candidateProduct.name.match(pattern)
                if (match) {
                  brand = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
                  // Keep the full product name - don't remove brand
                  // The frontend will show brand separately if available
                  if (!productName) {
                    productName = candidateProduct.name.trim()
                  }
                  break
                }
              }
            }
            // Try from chunks - look for brand in any chunk
            if (!brand && skuChunks.length > 0) {
              for (const chunk of skuChunks) {
                const body = chunk.section_body || ''
                // Try multiple patterns for brand
                const brandPatterns = [
                  /\b(Brand|Manufacturer|Made by)[:\s]+([A-Z][a-zA-Z\s&]+)/i,
                  /\b([A-Z][a-zA-Z]+)\s+(iPhone|Galaxy|MacBook|ThinkPad|XPS|Spectre|Yoga)/i, // Apple iPhone, Samsung Galaxy, etc.
                  /^(Apple|Samsung|LG|Sony|HP|Dell|Lenovo|ASUS|Microsoft|Panasonic)\b/i, // Brand at start
                ]
                for (const pattern of brandPatterns) {
                  const match = body.match(pattern)
                  if (match) {
                    brand = match[2] || match[1]
                    if (brand && brand.length > 1 && brand.length < 30) {
                      brand = brand.trim()
                      break
                    }
                  }
                }
                if (brand) break
              }
            }
            // Try extracting from product name if it starts with a brand (fallback)
            if (!brand && productName) {
              const brandFromName = productName.match(/^(Apple|Samsung|LG|Sony|HP|Dell|Lenovo|ASUS|Microsoft|Panasonic|Nokia|Motorola|OnePlus|Xiaomi|Oppo|Vivo|Realme|Honor|Huawei)\b/i)
              if (brandFromName) {
                brand = brandFromName[1]
              }
            }
            // Don't set brand to 'Unknown Brand' - leave it null so frontend can hide it gracefully
            
            // Continue extracting product name if not found yet
            if (!productName) {
              productName = fullRecord?.name || null
            }
            if (!productName && productRecords[sku]?.name) {
              productName = productRecords[sku].name
            }
            if (!productName && skuChunks.length > 0) {
              // Try all chunks, not just Product Overview
              for (const chunk of skuChunks) {
                const body = chunk.section_body || ''
                // Try multiple patterns
                const namePatterns = [
                  /Product[:\s]+([^\n(]+?)(?:\s*\(SKU:|$)/i,
                  /^([A-Z][^\n:]+?)(?:\s*\(SKU:|$)/, // Line starting with capital
                  /([A-Z][a-zA-Z0-9\s\.\"-]+(?:Phone|Laptop|TV|Tablet|Watch|Camera|Headphone))/i, // Product type pattern
                ]
                for (const pattern of namePatterns) {
                  const nameMatch = body.match(pattern)
                  if (nameMatch && nameMatch[1]) {
                    productName = nameMatch[1].trim().replace(/^[-•]\s*/, '').replace(/\s*\(SKU:\s*\d+\)/gi, '')
                    if (productName.length > 5 && productName.length < 100 && !productName.match(/^(Features|Specifications|Key|Selling|Points|Category|Brand|SKU|Product Overview)/i)) {
                      break
                    } else {
                      productName = null // Reset if invalid
                    }
                  }
                }
                if (productName) break
              }
            }
            // If still no name, construct from brand + category
            if (!productName) {
              const category = fullRecord?.category || resolvedEntities.category || 'Product'
              if (brand) {
                productName = `${brand} ${category}`
              } else {
                // Only use "Product <SKU>" as last resort
                productName = `Product ${sku}`
              }
            }
            
            // Extract model
            let model = null
            if (fullRecord?.specs?.model) {
              model = fullRecord.specs.model
            } else if (fullRecord?.model) {
              model = fullRecord.model
            } else if (skuChunks.length > 0) {
              for (const chunk of skuChunks) {
                const body = chunk.section_body || ''
                const modelMatch = body.match(/\b(Model|Model Number)[:\s]+([A-Z0-9\-]+)/i)
                if (modelMatch && modelMatch[2]) {
                  model = modelMatch[2].trim()
                  break
                }
              }
            }
            
            // Extract headline features (2-3 key specs/features)
            const headlineFeatures = []
            if (fullRecord) {
              // Try to get key specs - prioritize based on category
              if (fullRecord.specs) {
                const category = fullRecord.category || resolvedEntities.category || ''
                const catLower = category.toLowerCase()
                
                if (catLower.includes('phone') || catLower.includes('mobile')) {
                  // For phones: storage, battery, camera, screen
                  if (fullRecord.specs.storage) {
                    const storage = fullRecord.specs.storage.replace(/\s*GB\s*/i, 'GB')
                    headlineFeatures.push(`${storage} storage`)
                  }
                  if (fullRecord.specs.battery || fullRecord.specs.battery_life) {
                    headlineFeatures.push('All-day battery')
                  }
                  if (fullRecord.specs.camera || fullRecord.specs.rear_camera) {
                    headlineFeatures.push('Good camera for photos')
                  }
                  if (fullRecord.specs.screen_size || fullRecord.specs.display_size) {
                    const screen = fullRecord.specs.screen_size || fullRecord.specs.display_size
                    headlineFeatures.push(`${screen} display`)
                  }
                } else if (catLower.includes('laptop')) {
                  // For laptops: RAM, SSD, screen, CPU
                  if (fullRecord.specs.ram) {
                    const ram = fullRecord.specs.ram.replace(/\s*GB\s*/i, 'GB')
                    headlineFeatures.push(`${ram} RAM`)
                  }
                  if (fullRecord.specs.storage || fullRecord.specs.ssd) {
                    const storage = (fullRecord.specs.storage || fullRecord.specs.ssd).replace(/\s*GB\s*/i, 'GB')
                    headlineFeatures.push(`${storage} SSD`)
                  }
                  if (fullRecord.specs.screen_size) {
                    headlineFeatures.push(`${fullRecord.specs.screen_size} screen`)
                  }
                  if (fullRecord.specs.processor || fullRecord.specs.cpu) {
                    const cpu = fullRecord.specs.processor || fullRecord.specs.cpu
                    if (cpu.length < 30) headlineFeatures.push(cpu)
                  }
                } else {
                  // Generic: just use available specs
                  if (fullRecord.specs.ram) headlineFeatures.push(`${fullRecord.specs.ram} RAM`)
                  if (fullRecord.specs.storage) headlineFeatures.push(`${fullRecord.specs.storage} storage`)
                  if (fullRecord.specs.screen_size) headlineFeatures.push(`${fullRecord.specs.screen_size} display`)
                }
              }
              // Use selling points if available and we don't have enough features
              if (headlineFeatures.length < 2 && fullRecord.selling_points && fullRecord.selling_points.length > 0) {
                const additional = fullRecord.selling_points.slice(0, 3 - headlineFeatures.length)
                headlineFeatures.push(...additional.map(sp => {
                  // Make selling points shorter if needed
                  if (sp.length > 50) return sp.substring(0, 47) + '...'
                  return sp
                }))
              }
            }
            // Fallback to chunks
            if (headlineFeatures.length === 0 && skuChunks.length > 0) {
              // Try selling points/features chunks first
              const sellingPointChunk = skuChunks.find(c => 
                c.section_title?.includes('Selling') || 
                c.section_title?.includes('Feature') || 
                c.section_title?.includes('Key') ||
                c.section_title?.includes('Benefit')
              )
              if (sellingPointChunk?.section_body) {
                const sentences = sellingPointChunk.section_body.split(/[.!?]\s+/).filter(s => s.length > 10 && s.length < 100)
                headlineFeatures.push(...sentences.slice(0, 3).map(s => s.trim()))
              }
              // Try specs chunk for RAM, storage, screen size
              if (headlineFeatures.length === 0) {
                const specsChunk = skuChunks.find(c => c.section_title?.includes('Spec') || c.section_title?.includes('Technical'))
                if (specsChunk?.section_body) {
                  const body = specsChunk.section_body
                  // Extract common specs
                  const ramMatch = body.match(/\b(\d+\s*GB?\s*RAM|\d+\s*GB?\s*memory)/i)
                  const storageMatch = body.match(/\b(\d+\s*GB?\s*storage|\d+\s*GB?\s*SSD|\d+\s*GB?\s*HDD)/i)
                  const screenMatch = body.match(/\b(\d+[\."]\d*["\s]*inch|\d+["\s]*inch|Full\s*HD|HD|4K|OLED|QLED)/i)
                  if (ramMatch) headlineFeatures.push(ramMatch[1])
                  if (storageMatch) headlineFeatures.push(storageMatch[1])
                  if (screenMatch) headlineFeatures.push(screenMatch[1])
                  
                  // If still no features, use first few lines
                  if (headlineFeatures.length === 0) {
                    const lines = body.split('\n').filter(l => l.trim().length > 5 && l.trim().length < 80)
                    headlineFeatures.push(...lines.slice(0, 3).map(l => l.trim().replace(/^[-•]\s*/, '')))
                  }
                }
              }
              // Try any chunk for key phrases
              if (headlineFeatures.length === 0) {
                for (const chunk of skuChunks.slice(0, 3)) {
                  const body = chunk.section_body || ''
                  // Look for key phrases
                  const phrases = body.match(/(\d+\s*GB\s*(?:RAM|storage)|Full\s*HD|long\s*battery|fast\s*processor|great\s*for\s*\w+)/gi)
                  if (phrases && phrases.length > 0) {
                    headlineFeatures.push(...phrases.slice(0, 3).map(p => p.trim()))
                    break
                  }
                }
              }
            }
            // Ensure we have at least something meaningful
            if (headlineFeatures.length === 0) {
              headlineFeatures.push('Good value option')
            }
            
            // Extract real price information
            const priceValue = fullRecord?.pricing?.currentPrice || fullRecord?.pricing?.listPrice || fullRecord?.list_price || fullRecord?.current_price || productRecords[sku]?.price || null
            const priceCompare = fullRecord?.pricing?.listPrice || fullRecord?.list_price || null
            const priceCurrency = 'NZD' // Default to NZD for now
            
            // Extract feature headline (first feature from XML, or first selling point)
            let featureHeadline = null
            if (fullRecord?.features && fullRecord.features.length > 0) {
              // Features are normalized to strings in xmlParserService, so just take the first one
              const firstFeature = fullRecord.features[0]
              
              if (typeof firstFeature === 'string') {
                // Truncate to ~80 chars for display
                featureHeadline = firstFeature.length > 80 ? firstFeature.substring(0, 77) + '...' : firstFeature
              } else if (typeof firstFeature === 'object') {
                // Handle raw XML feature objects (shouldn't happen after normalization, but handle it)
                if (firstFeature['#text']) {
                  const text = firstFeature['#text']
                  featureHeadline = text.length > 80 ? text.substring(0, 77) + '...' : text
                } else if (firstFeature.text) {
                  const text = firstFeature.text
                  featureHeadline = text.length > 80 ? text.substring(0, 77) + '...' : text
                }
              }
            }
            // Fallback to first selling point if no feature
            if (!featureHeadline && fullRecord?.selling_points && fullRecord.selling_points.length > 0) {
              const firstSellingPoint = fullRecord.selling_points[0]
              featureHeadline = firstSellingPoint.length > 100 ? firstSellingPoint.substring(0, 97) + '...' : firstSellingPoint
            }
            // Fallback to first headline feature if available
            if (!featureHeadline && headlineFeatures.length > 0) {
              featureHeadline = headlineFeatures[0]
            }
            
            // Extract active offer badge
            let offerBadge = null
            if (fullRecord?.offers && fullRecord.offers.length > 0) {
              // Find best active offer (highest percent, earliest expiry)
              const now = new Date()
              const activeOffers = fullRecord.offers.filter(offer => {
                const effective = offer.effective ? new Date(offer.effective) : null
                const expires = offer.expires ? new Date(offer.expires) : null
                return (!effective || effective <= now) && (!expires || expires >= now)
              })
              
              if (activeOffers.length > 0) {
                // Sort by percent (desc) then expiry (asc)
                activeOffers.sort((a, b) => {
                  const aPercent = a.discount?.percent || 0
                  const bPercent = b.discount?.percent || 0
                  if (bPercent !== aPercent) return bPercent - aPercent
                  const aExpires = a.expires ? new Date(a.expires) : new Date('2099-12-31')
                  const bExpires = b.expires ? new Date(b.expires) : new Date('2099-12-31')
                  return aExpires - bExpires
                })
                
                const bestOffer = activeOffers[0]
                const offerName = bestOffer.name || 'Special Offer'
                const offerPercent = bestOffer.discount?.percent || 0
                const offerExpires = bestOffer.expires ? new Date(bestOffer.expires) : null
                
                // Format expiry date (NZ format: "7 Oct 2025")
                let expiryText = ''
                if (offerExpires) {
                  const day = offerExpires.getDate()
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                  const month = monthNames[offerExpires.getMonth()]
                  const year = offerExpires.getFullYear()
                  expiryText = ` until ${day} ${month} ${year}`
                }
                
                if (offerPercent > 0) {
                  offerBadge = `${offerPercent}% off ${offerName}${expiryText}`
                } else {
                  offerBadge = `${offerName}${expiryText}`
                }
              }
            }
            
            shortlistItems.push({
              sku: String(sku),
              brand: brand,
              product_name: productName,
              model: model,
              headline_features: headlineFeatures.slice(0, 3), // Keep for backward compatibility
              price_band: null, // Deprecated - use price_value instead
              price_value: priceValue,
              price_currency: priceCurrency,
              price_compare: priceCompare && priceCompare > (priceValue || 0) ? priceCompare : null,
              feature_headline: featureHeadline,
              offer_badge: offerBadge,
            })
          } catch (error) {
            console.warn(`[TurnOrchestrator] Error building shortlist item for SKU ${sku}:`, error.message)
          }
        }
        console.log(`[TurnOrchestrator] ✅ Built ${shortlistItems.length} shortlist items for general recommendation`)
        if (shortlistItems.length > 0) {
          console.log(`[TurnOrchestrator] Shortlist items: ${shortlistItems.map(item => `${item.name} (${item.sku})`).join(', ')}`)
        } else {
          console.warn(`[TurnOrchestrator] ⚠️ No shortlist items built - chunks: ${topChunks.length}, candidate SKUs: ${resolvedEntities.candidate_skus?.length || 0}`)
          // Even if we can't get full details, create basic shortlist items from candidate SKUs
          if (resolvedEntities.candidate_skus && resolvedEntities.candidate_skus.length > 0) {
            for (const sku of resolvedEntities.candidate_skus.slice(0, 5)) {
              // Try to get at least brand and basic info
              let brand = 'Unknown Brand'
              let productName = `Product ${sku}`
              try {
                const basicRecord = await productRetrievalService.getProductRecord(sku)
                if (basicRecord) {
                  brand = basicRecord.brand || 'Unknown Brand'
                  productName = basicRecord.name || `${brand} Product`
                }
              } catch (error) {
                // Use defaults
              }
              
              shortlistItems.push({
                sku: String(sku),
                brand: brand,
                product_name: productName,
                model: null,
                headline_features: ['Check product details'],
                price_band: resolvedEntities.budget ? `Under $${resolvedEntities.budget}` : null,
              })
            }
            console.log(`[TurnOrchestrator] Created ${shortlistItems.length} basic shortlist items from candidate SKUs`)
          }
        }
      }
      
      // Get primary product record for review hints
      const productRecord = activeSku ? (productRecords[activeSku] || await productRetrievalService.getProductRecord(activeSku)) : null
      const reviewSummary = enricherService.genericReviewHints(
        activeSku,
        resolvedEntities.category || updatedState.active_category,
        productRecord,
        topChunks
      )

      // Step 8.5: Fetch web reviews and comparisons (if enabled)
      let webReviewSummary = null
      let webComparisonSummary = null
      
      const useWebReviews = process.env.USE_WEB_REVIEWS === 'true'
      if (useWebReviews) {
        console.log(`[TurnOrchestrator] Step 8.5: Fetching web reviews...`)
        
        // Import web services (dynamic to avoid circular dependencies)
        const webReviewService = (await import('./webReviewService.js')).default
        const webComparisonService = (await import('./webComparisonService.js')).default
        const webReviewCache = (await import('./webReviewCache.js')).default
        
        // Helper function to extract model from product record
        const extractModel = (product) => {
          if (!product) return null
          let model = product.specs?.model || null
          
          // If model not in specs, try to extract from product name
          if (!model && product.name && product.brand) {
            const nameWithoutBrand = product.name.replace(new RegExp(`^${product.brand}\\s+`, 'i'), '').trim()
            const modelMatch = nameWithoutBrand.match(/^([A-Za-z0-9\s]+?)(?:\s|$)/)
            if (modelMatch && modelMatch[1].length > 1) {
              model = modelMatch[1].trim()
            } else if (nameWithoutBrand.length < 50) {
              model = nameWithoutBrand
            }
          }
          return model
        }
        
        // Fetch web review for active SKU
        if (activeSku && productRecord) {
          try {
            const fullProductRecord = await productRetrievalService.getProductRecord(activeSku)
            if (fullProductRecord && fullProductRecord.brand) {
              const model = extractModel(fullProductRecord)
              
              if (fullProductRecord.brand && model) {
                // Prepare metadata with model at top level for web review service
                const metadataForWebReview = {
                  brand: fullProductRecord.brand,
                  model: model,
                  category: fullProductRecord.category || null,
                  list_price: fullProductRecord.list_price || fullProductRecord.pricing?.listPrice || null,
                }
                
                console.log(`[TurnOrchestrator] Fetching web review for ${fullProductRecord.brand} ${model}`)
                
                webReviewSummary = await webReviewCache.getOrFetchReview(
                  activeSku,
                  metadataForWebReview,
                  (sku, metadata) => webReviewService.getReviewSummary(sku, metadata)
                )
                if (webReviewSummary) {
                  console.log(`[TurnOrchestrator] ✅ Web review fetched: ${webReviewSummary.top_pros?.length || 0} pros, ${webReviewSummary.top_cons?.length || 0} cons`)
                } else {
                  console.log(`[TurnOrchestrator] ℹ️ No web review summary returned`)
                }
              } else {
                console.log(`[TurnOrchestrator] ℹ️ Skipping web review - missing brand or model (brand: ${fullProductRecord.brand}, model: ${model})`)
              }
            }
          } catch (error) {
            console.warn(`[TurnOrchestrator] ⚠️ Web review fetch failed:`, error.message)
            // Continue without web review - don't break the flow
          }
        }
        
        // For general recommendation queries (no activeSku but have candidate_skus), fetch web review for top candidate
        if (!activeSku && resolvedEntities.candidate_skus && resolvedEntities.candidate_skus.length > 0 && !webReviewSummary) {
          try {
            // Try to fetch web review for the first candidate SKU that has brand/model
            for (const candidateSku of resolvedEntities.candidate_skus.slice(0, 3)) { // Try top 3 candidates
              try {
                const fullProductRecord = await productRetrievalService.getProductRecord(candidateSku)
                if (fullProductRecord && fullProductRecord.brand) {
                  const model = extractModel(fullProductRecord)
                  
                  if (fullProductRecord.brand && model) {
                    const metadataForWebReview = {
                      brand: fullProductRecord.brand,
                      model: model,
                      category: fullProductRecord.category || null,
                      list_price: fullProductRecord.list_price || fullProductRecord.pricing?.listPrice || null,
                    }
                    
                    console.log(`[TurnOrchestrator] Fetching web review for candidate SKU ${candidateSku} (${fullProductRecord.brand} ${model})`)
                    
                    webReviewSummary = await webReviewCache.getOrFetchReview(
                      candidateSku,
                      metadataForWebReview,
                      (sku, metadata) => webReviewService.getReviewSummary(sku, metadata)
                    )
                    if (webReviewSummary) {
                      console.log(`[TurnOrchestrator] ✅ Web review fetched for candidate: ${webReviewSummary.top_pros?.length || 0} pros, ${webReviewSummary.top_cons?.length || 0} cons`)
                      break // Found a valid review, stop trying other candidates
                    }
                  }
                }
              } catch (error) {
                console.warn(`[TurnOrchestrator] ⚠️ Failed to fetch web review for candidate SKU ${candidateSku}:`, error.message)
                // Continue to next candidate
              }
            }
          } catch (error) {
            console.warn(`[TurnOrchestrator] ⚠️ Web review fetch for candidates failed:`, error.message)
            // Continue without web review - don't break the flow
          }
        }
        
        // Fetch comparison if compare intent
        if (intent.need_compare && rewrittenQuery.compare_list && rewrittenQuery.compare_list.length >= 2) {
          try {
            const compareSkus = rewrittenQuery.compare_list.slice(0, 2) // Compare first two
            const productLeft = await productRetrievalService.getProductRecord(compareSkus[0])
            const productRight = await productRetrievalService.getProductRecord(compareSkus[1])
            
            const modelLeft = extractModel(productLeft)
            const modelRight = extractModel(productRight)
            
            if (productLeft?.brand && modelLeft && productRight?.brand && modelRight) {
              // Prepare metadata with model at top level for comparison service
              const metadataLeft = {
                brand: productLeft.brand,
                model: modelLeft,
                category: productLeft.category || null,
              }
              const metadataRight = {
                brand: productRight.brand,
                model: modelRight,
                category: productRight.category || null,
              }
              
              console.log(`[TurnOrchestrator] Fetching web comparison for ${productLeft.brand} ${modelLeft} vs ${productRight.brand} ${modelRight}`)
              
              webComparisonSummary = await webReviewCache.getOrFetchComparison(
                compareSkus[0],
                compareSkus[1],
                metadataLeft,
                metadataRight,
                (skuL, skuR, prodL, prodR) => webComparisonService.getComparisonSummary(skuL, skuR, prodL, prodR)
              )
              if (webComparisonSummary) {
                console.log(`[TurnOrchestrator] ✅ Web comparison fetched`)
              }
            } else {
              console.log(`[TurnOrchestrator] ℹ️ Skipping web comparison - missing brand/model (Left: ${productLeft?.brand}/${modelLeft}, Right: ${productRight?.brand}/${modelRight})`)
            }
          } catch (error) {
            console.warn(`[TurnOrchestrator] ⚠️ Web comparison fetch failed:`, error.message)
            // Continue without comparison - don't break the flow
          }
        }
      }

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
      console.log(`[TurnOrchestrator]   - Shortlist items: ${shortlistItems.length} items`)
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
        web_review_summary: webReviewSummary, // Web review data
        web_comparison_summary: webComparisonSummary, // Web comparison data
        shortlist_items: shortlistItems, // Pass shortlist items for general recommendations
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
      console.log(`[TurnOrchestrator] Answer includes shortlist_items: ${answer.shortlist_items?.length || 0} items`)
      
      // Ensure shortlist_items are preserved if they were built
      const finalAnswer = {
        ...answer,
        citations: topChunks.map(c => c.chunk_id).filter(Boolean),
        conversation_id: conversation_id,
      }
      
      // If we built shortlist items but they're not in the answer, add them
      if (shortlistItems.length > 0 && (!finalAnswer.shortlist_items || finalAnswer.shortlist_items.length === 0)) {
        console.log(`[TurnOrchestrator] ⚠️ Shortlist items missing from answer, adding ${shortlistItems.length} items`)
        finalAnswer.shortlist_items = shortlistItems
      }
      
      return finalAnswer
    } catch (error) {
      console.error('[TurnOrchestrator] Error processing turn:', error)
      throw error
    }
  },
}

export default turnOrchestratorService

