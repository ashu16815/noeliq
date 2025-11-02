// Service to chunk product data into semantically useful sections

const chunkingService = {
  chunkProduct(product) {
    const chunks = []

    // Define section importance scores (higher = more important for retrieval)
    const IMPORTANCE_SCORES = {
      'Product Overview': 1.0,        // Most important - contains name, brand, category
      'Selling Points': 0.9,          // High - key selling features
      'Features': 0.8,                // High - product features
      'Specifications': 0.7,          // Medium-high - technical details
      'Gaming Performance': 0.8,     // High - specific use case
      'Pricing and Offers': 0.6,      // Medium - pricing info
      'Business Pricing': 0.5,        // Medium - B2B pricing
      'Dimensions/Fit': 0.4,          // Low-medium - fit info
      'Warranty Terms': 0.3,          // Low - warranty details
    }

    // Helper to add chunk with metadata
    const addChunk = (sectionTitle, sectionBody, importanceScore = 0.5) => {
      chunks.push({
        section_title: sectionTitle,
        section_type: sectionTitle, // Use same value for now
        section_body: sectionBody,
        sku: product.sku,
        importance_score: importanceScore,
      })
    }

    // Chunk by section type
    if (product.name) {
      addChunk(
        'Product Overview',
        `Product: ${product.name} (SKU: ${product.sku})\nBrand: ${product.brand}\nCategory: ${product.category}`,
        IMPORTANCE_SCORES['Product Overview']
      )
    }

    if (product.features && product.features.length > 0) {
      addChunk(
        'Features',
        `Features:\n${product.features.map((f) => `- ${f}`).join('\n')}`,
        IMPORTANCE_SCORES['Features']
      )
    }

    if (product.selling_points && product.selling_points.length > 0) {
      addChunk(
        'Selling Points',
        `Key selling points:\n${product.selling_points.map((sp) => `- ${sp}`).join('\n')}`,
        IMPORTANCE_SCORES['Selling Points']
      )
    }

    if (product.specs && Object.keys(product.specs).length > 0) {
      // Chunk specs into logical groups if they exist
      addChunk(
        'Specifications',
        `Specifications:\n${Object.entries(product.specs)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')}`,
        IMPORTANCE_SCORES['Specifications']
      )
    }

    // Gaming performance (common question area)
    if (this.hasGamingRelatedSpecs(product)) {
      addChunk(
        'Gaming Performance',
        this.extractGamingInfo(product),
        IMPORTANCE_SCORES['Gaming Performance']
      )
    }

    // Dimensions/Fit
    if (product.specs && (product.specs.dimensions || product.specs.size || product.specs.weight)) {
      addChunk(
        'Dimensions/Fit',
        `Dimensions and fit information:\n${
          product.specs.dimensions || product.specs.size || ''
        }\n${product.specs.weight ? `Weight: ${product.specs.weight}` : ''}`,
        IMPORTANCE_SCORES['Dimensions/Fit']
      )
    }

    // Warranty terms
    if (product.warranty_info) {
      addChunk(
        'Warranty Terms',
        product.warranty_info,
        IMPORTANCE_SCORES['Warranty Terms']
      )
      // Add warranty restrictions as metadata on last chunk
      if (product.safety_notes && chunks.length > 0) {
        chunks[chunks.length - 1].warranty_restrictions = product.safety_notes
      }
    }

    // Recommended attachments
    if (product.recommended_attachments && product.recommended_attachments.length > 0) {
      addChunk(
        'Recommended Attachments',
        `Most people also pick up:\n${product.recommended_attachments
          .map((att) => `- ${att.name} (SKU: ${att.sku}): ${att.why_sell}`)
          .join('\n')}`,
        0.7 // Medium-high importance for attachments
      )
    }

    // Pricing and Offers (with structured fields for filtering)
    if (product.pricing || product.offers || product.clearanceInfo) {
      const pricingInfo = []
      
      if (product.pricing?.currentPrice) {
        pricingInfo.push(`Current price: $${product.pricing.currentPrice}`)
      }
      if (product.pricing?.listPrice && product.pricing.listPrice !== product.pricing.currentPrice) {
        pricingInfo.push(`List price: $${product.pricing.listPrice}`)
      }

      const offerNames = []
      if (product.offers && product.offers.length > 0) {
        product.offers.forEach(offer => {
          if (offer.name) offerNames.push(offer.name)
          if (offer.discount?.percent) {
            pricingInfo.push(`Special offer: ${offer.name} - ${offer.discount.percent}% off`)
          }
        })
      }

      if (product.clearanceInfo) {
        pricingInfo.push(`Clearance: ${product.clearanceInfo.reason} - $${product.clearanceInfo.clearancePrice}`)
      }

      if (pricingInfo.length > 0) {
        addChunk(
          'Pricing and Offers',
          pricingInfo.join('\n'),
          IMPORTANCE_SCORES['Pricing and Offers']
        )
        // Add pricing metadata to last chunk
        if (chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1]
          lastChunk.current_price = product.pricing?.currentPrice || product.pricing?.listPrice || null
          lastChunk.list_price = product.pricing?.listPrice || null
          lastChunk.has_offers = product.offers && product.offers.length > 0
          lastChunk.offer_names = offerNames
          lastChunk.is_clearance = !!product.clearanceInfo
          lastChunk.clearance_price = product.clearanceInfo?.clearancePrice || null
        }
      }
    }

    // B2B Pricing (for business customers)
    if (product.b2bPricing) {
      addChunk(
        'Business Pricing',
        `B2B pricing available: $${product.b2bPricing.price} (minimum quantity: ${product.b2bPricing.minimumQuantity})`,
        IMPORTANCE_SCORES['Business Pricing']
      )
      // Add B2B price metadata
      if (chunks.length > 0) {
        chunks[chunks.length - 1].b2b_price = product.b2bPricing.price || null
      }
    }

    // FAQ
    if (product.faq && product.faq.length > 0) {
      addChunk(
        'FAQ',
        product.faq
          .map((item) => `Q: ${item.q}\nA: ${item.a}`)
          .join('\n\n'),
        0.5 // Medium importance
      )
    }

    return chunks
  },

  hasGamingRelatedSpecs(product) {
    const gamingKeywords = ['refresh', 'hz', 'gaming', 'response', 'input lag', 'hdmi 2.1', 'vrr', 'gsync', 'freesync']
    const searchText = JSON.stringify(product.specs || {}).toLowerCase()
    return gamingKeywords.some((keyword) => searchText.includes(keyword))
  },

  extractGamingInfo(product) {
    const gamingInfo = []
    const specs = product.specs || {}

    if (specs.refresh_rate || specs['refresh-rate']) {
      gamingInfo.push(`Refresh Rate: ${specs.refresh_rate || specs['refresh-rate']}`)
    }
    if (specs.response_time || specs['response-time']) {
      gamingInfo.push(`Response Time: ${specs.response_time || specs['response-time']}`)
    }
    if (specs.hdmi_ports || specs.hdmi) {
      gamingInfo.push(`HDMI Ports: ${specs.hdmi_ports || specs.hdmi}`)
    }

    return gamingInfo.length > 0
      ? `Gaming Performance:\n${gamingInfo.join('\n')}`
      : 'Gaming performance information available in specifications.'
  },
}

export default chunkingService

