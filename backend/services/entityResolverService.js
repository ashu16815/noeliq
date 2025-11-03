// Entity Resolver Service
// Resolves entities (SKUs, categories, brands, budget, use cases) from user text + conversation state

import productSearchService from './productSearchService.js'
import productRetrievalService from './productRetrievalService.js'
import conversationService from './conversationService.js'

const entityResolverService = {
  /**
   * Resolve entities from user text and conversation state
   * Returns: { active_sku, candidate_skus[], category, brand, budget, use_case }
   */
  async resolve(userText, conversationState = {}) {
    try {
      const resolved = {
        active_sku: null,
        candidate_skus: [],
        category: null,
        brand: null,
        budget: null,
        use_case: null,
      }

      // Extract budget from text
      resolved.budget = this.extractBudget(userText, conversationState)

      // Extract use case from text
      resolved.use_case = this.extractUseCase(userText, conversationState)

      // Extract category hints
      const categoryHints = this.extractCategory(userText)

      // Extract brand hints
      const brandHints = this.extractBrand(userText)

      // If user provided SKU explicitly (e.g., from barcode scan), use it
      const explicitSku = this.extractExplicitSku(userText)
      if (explicitSku) {
        resolved.active_sku = explicitSku
        // Try to get category/brand from product record
        const product = await productRetrievalService.getProductRecord(explicitSku)
        if (product) {
          resolved.category = product.category || categoryHints
          resolved.brand = product.brand || brandHints
        }
        return resolved
      }

      // Check if this is a general recommendation query (e.g., "laptop below 1000") vs specific product query
      const isGeneralRecommendation = this.isGeneralRecommendationQuery(userText, conversationState)
      
      // Check if user mentions a product name/brand/model
      const productMention = this.detectProductMention(userText)
      
      if (productMention) {
        // Search for products matching the mention
        const searchQuery = productMention.query
        const products = await productSearchService.searchProducts(searchQuery, 5)
        
        if (products.length > 0) {
          if (isGeneralRecommendation) {
            // For general queries (e.g., "laptop below 1000"), don't set active_sku
            // Instead, populate candidate_skus for comparison
            resolved.candidate_skus = products.map(p => p.sku).slice(0, 5) // Get top 5 options
            // Don't set active_sku - let retrieval find multiple options
          } else {
            // For specific product queries, set active_sku
            resolved.active_sku = products[0].sku
            resolved.candidate_skus = products.map(p => p.sku)
          }
          
          if (products[0].category) {
            resolved.category = products[0].category
          }
        }
      } else if (isGeneralRecommendation && (resolved.category || resolved.budget)) {
        // For general queries without specific product mention, search by category + budget
        const searchQuery = `${resolved.category || 'product'} under ${resolved.budget || ''}`
        const products = await productSearchService.searchProducts(searchQuery, 5)
        if (products.length > 0) {
          resolved.candidate_skus = products.map(p => p.sku).slice(0, 5)
          // Don't set active_sku for general recommendations
        }
      }

      // Handle "alternatives iPhone" pattern - find comparable iPhone in same price band
      if (/alternative.*iphone|iphone.*alternative|compare.*iphone|iphone.*compare/i.test(userText)) {
        const iphoneSku = await this.findComparableProduct('iPhone', conversationState)
        if (iphoneSku) {
          resolved.candidate_skus.push(iphoneSku)
          // Keep current active_sku if it exists (for comparison)
          if (conversationState.active_sku && !resolved.candidate_skus.includes(conversationState.active_sku)) {
            resolved.candidate_skus.unshift(conversationState.active_sku)
          }
        }
      }

      // If no new SKU found but we have conversation state active_sku, use it
      // BUT: Don't use it for general recommendation queries
      if (!resolved.active_sku && conversationState.active_sku && !this.isGeneralRecommendationQuery(userText, conversationState)) {
        resolved.active_sku = conversationState.active_sku
      }

      // Infer category/brand from conversation state if not found in text
      if (!resolved.category) {
        resolved.category = conversationState.active_category || categoryHints
      }
      if (!resolved.brand) {
        resolved.brand = conversationState.active_brand || brandHints
      }

      return resolved
    } catch (error) {
      console.error('Error in entity resolution:', error)
      // Fallback to conversation state
      return {
        active_sku: conversationState.active_sku || null,
        candidate_skus: [],
        category: conversationState.active_category || null,
        brand: conversationState.active_brand || null,
        budget: conversationState.budget_cap || null,
        use_case: conversationState.use_case || null,
      }
    }
  },

  /**
   * Extract budget from text
   */
  extractBudget(text, conversationState) {
    const budgetPatterns = [
      /(?:under|below|less than|max|maximum|up to|around|about)\s*\$?(\d+[k]?)/i,
      /budget\s*(?:of|is)?\s*\$?(\d+[k]?)/i,
      /\$(\d+[k]?)/i,
    ]

    for (const pattern of budgetPatterns) {
      const match = text.match(pattern)
      if (match) {
        let amount = match[1]
        if (amount.toLowerCase().endsWith('k')) {
          amount = (parseFloat(amount) * 1000).toString()
        }
        return parseFloat(amount)
      }
    }

    // Fallback to conversation state
    return conversationState.budget_cap || conversationState.customer_intent?.budget_range
      ? parseFloat(conversationState.customer_intent.budget_range || conversationState.budget_cap)
      : null
  },

  /**
   * Extract use case from text
   */
  extractUseCase(text, conversationState) {
    const useCasePatterns = [
      { pattern: /gaming/i, label: 'gaming' },
      { pattern: /work\s+from\s+home|wfh/i, label: 'work from home' },
      { pattern: /bright\s+room/i, label: 'bright room' },
      { pattern: /dark\s+room/i, label: 'dark room' },
      { pattern: /office/i, label: 'office' },
      { pattern: /streaming/i, label: 'streaming' },
      { pattern: /movies|movie\s+watching/i, label: 'movies' },
      { pattern: /sports/i, label: 'sports' },
      { pattern: /video\s+calls|videoconferencing/i, label: 'video calls' },
    ]

    for (const { pattern, label } of useCasePatterns) {
      if (pattern.test(text)) {
        return label
      }
    }

    return conversationState.use_case || null
  },

  /**
   * Extract category hints from text
   */
  extractCategory(text) {
    const categoryPatterns = [
      { pattern: /tv|television|smart tv/i, category: 'TV' },
      { pattern: /laptop|notebook|computer/i, category: 'Laptop' },
      { pattern: /phone|smartphone|mobile|iphone|android/i, category: 'Phone' },
      { pattern: /tablet|ipad/i, category: 'Tablet' },
      { pattern: /headphone|earbud|earphone|audio/i, category: 'Audio' },
      { pattern: /watch|smartwatch/i, category: 'Watch' },
      { pattern: /camera/i, category: 'Camera' },
    ]

    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(text)) {
        return category
      }
    }

    return null
  },

  /**
   * Extract brand hints from text
   */
  extractBrand(text) {
    const brandPatterns = [
      /apple|iphone|ipad|macbook/i,
      /samsung|galaxy/i,
      /lg/i,
      /sony/i,
      /panasonic/i,
      /dell|alienware/i,
      /hp|hewlett/i,
      /lenovo/i,
      /asus|rog/i,
      /nintendo/i,
      /microsoft|surface|xbox/i,
    ]

    for (const pattern of brandPatterns) {
      const match = text.match(pattern)
      if (match) {
        // Normalize brand names
        const brand = match[0].toLowerCase()
        if (brand.includes('apple') || brand.includes('iphone')) return 'Apple'
        if (brand.includes('samsung') || brand.includes('galaxy')) return 'Samsung'
        if (brand.includes('lg')) return 'LG'
        if (brand.includes('sony')) return 'Sony'
        if (brand.includes('panasonic')) return 'Panasonic'
        if (brand.includes('dell')) return 'Dell'
        if (brand.includes('hp') || brand.includes('hewlett')) return 'HP'
        if (brand.includes('lenovo')) return 'Lenovo'
        if (brand.includes('asus') || brand.includes('rog')) return 'ASUS'
        if (brand.includes('nintendo')) return 'Nintendo'
        if (brand.includes('microsoft') || brand.includes('surface') || brand.includes('xbox')) return 'Microsoft'
        return match[0].charAt(0).toUpperCase() + match[0].slice(1)
      }
    }

    return null
  },

  /**
   * Extract explicit SKU from text (e.g., "SKU 123456" or just numbers)
   */
  extractExplicitSku(text) {
    const skuPatterns = [
      /sku[:\s]+(\d+)/i,
      /^(\d{6,})$/, // Standalone 6+ digit number
      /\b(\d{6,})\b/, // 6+ digit number as word boundary
    ]

    for (const pattern of skuPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  },

  /**
   * Detect product mention in text (brand + model, or just model name)
   */
  detectProductMention(text) {
    // Common product mention patterns
    const patterns = [
      /(?:iPhone|iPad|MacBook|Galaxy|Note|S\d+|LG|Sony|Panasonic|Dell|HP|Lenovo|ASUS|ROG|Xbox|PlayStation|Nintendo)[\s\w]*/i,
      /(?:TV|Television|Laptop|Phone|Tablet|Watch|Camera)[\s\w]*/i,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return { query: match[0].trim() }
      }
    }

    return null
  },

  /**
   * Check if query is a general recommendation query (e.g., "laptop below 1000")
   * vs a specific product query (e.g., "Tell me about the MacBook Pro")
   */
  isGeneralRecommendationQuery(userText, conversationState) {
    const text = userText.toLowerCase()
    
    // General recommendation patterns
    const generalPatterns = [
      /^(find|show|give|recommend|suggest|what|which|list).*(laptop|phone|tv|tablet|watch|camera|headphone)/i,
      /(laptop|phone|tv|tablet|watch|camera|headphone).*(below|under|less than|around|about|max|budget)/i,
      /(below|under|less than|around|about|max|budget).*\$(laptop|phone|tv|tablet|watch|camera|headphone)/i,
    ]
    
    // Specific product patterns (opposite)
    const specificPatterns = [
      /(tell me|what is|details|specs|features|about|this|that|it)/i,
      /\b(sku|model|exact|specific)\b/i,
    ]
    
    // If it matches general patterns and NOT specific patterns, it's a general recommendation
    const isGeneral = generalPatterns.some(p => p.test(text)) && !specificPatterns.some(p => p.test(text))
    
    // Also check if there's a budget constraint but no specific product mentioned
    const hasBudget = /(below|under|less than|around|about|max|budget).*\d+/i.test(text)
    const hasCategory = /(laptop|phone|tv|tablet|watch|camera|headphone)/i.test(text)
    const noSpecificProduct = !conversationState.active_sku
    
    return isGeneral || (hasBudget && hasCategory && noSpecificProduct)
  },

  /**
   * Find comparable product (e.g., iPhone in same price band as current product)
   */
  async findComparableProduct(productName, conversationState) {
    try {
      // Search for the product
      const products = await productSearchService.searchProducts(productName, 10)
      
      if (products.length === 0) {
        return null
      }

      // If we have a budget constraint, filter by price
      const budget = conversationState.budget_cap || 
                    (conversationState.customer_intent?.budget_range 
                      ? parseFloat(conversationState.customer_intent.budget_range) 
                      : null)

      if (budget) {
        // Find products within similar price range (±20%)
        const filtered = products.filter(p => {
          const price = parseFloat(p.price) || 0
          return price > 0 && price <= budget * 1.2 && price >= budget * 0.8
        })
        if (filtered.length > 0) {
          return filtered[0].sku
        }
      }

      // Return first result if no budget constraint
      return products[0].sku
    } catch (error) {
      console.error('Error finding comparable product:', error)
      return null
    }
  },
}

export default entityResolverService

