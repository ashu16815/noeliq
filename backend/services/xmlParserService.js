import { XMLParser } from 'fast-xml-parser'

const xmlParserService = {
  async parseXML(xmlContent) {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: true,
        parseTrueNumberOnly: false,
      })

      const parsedData = parser.parse(xmlContent)

      // Extract all sections: stores, items, offers, b2bOfferDetails, onlineClearance
      const parsedSections = {
        stores: this.extractStores(parsedData),
        items: this.extractItems(parsedData),
        offers: this.extractOffers(parsedData),
        b2bOfferDetails: this.extractB2BOffers(parsedData),
        onlineClearance: this.extractOnlineClearance(parsedData),
      }

      // Store stores data separately for availability lookups
      // This will be saved by the caller (storeParsedProducts can handle it)
      
      // Normalize products and enrich with offers, pricing, clearance info
      const products = this.enrichProductsWithOffers(
        parsedSections.items,
        parsedSections.offers,
        parsedSections.b2bOfferDetails,
        parsedSections.onlineClearance
      )

      // Attach metadata about what was parsed (for logging/debugging)
      products._parseMetadata = {
        storesCount: parsedSections.stores.length,
        offersCount: parsedSections.offers.length,
        b2bOffersCount: parsedSections.b2bOfferDetails.length,
        clearanceCount: parsedSections.onlineClearance.length,
        stores: parsedSections.stores, // Include stores data
      }

      console.log(`Parsed ${products.length} products, ${parsedSections.stores.length} stores, ${parsedSections.offers.length} offers, ${parsedSections.b2bOfferDetails.length} B2B offers, ${parsedSections.onlineClearance.length} clearance items`)

      return products
    } catch (error) {
      console.error('Error parsing XML:', error)
      throw new Error(`XML parsing failed: ${error.message}`)
    }
  },

  extractStores(parsedData) {
    let stores = null
    if (parsedData?.['nlgWebSite']?.['stores']?.['store']) {
      stores = parsedData.nlgWebSite.stores.store
    } else if (parsedData?.['stores']?.['store']) {
      stores = parsedData.stores.store
    } else if (parsedData?.stores?.store) {
      stores = parsedData.stores.store
    }

    if (stores) {
      return Array.isArray(stores) ? stores : [stores]
    }
    return []
  },

  extractItems(parsedData) {
    // Noel Leeming XML structure: nlgWebSite.items.item[]
    let items = null
    if (parsedData?.['nlgWebSite']?.['items']?.['item']) {
      items = parsedData.nlgWebSite.items.item
    } else if (parsedData?.['items']?.['item']) {
      items = parsedData.items.item
    } else if (parsedData?.items?.item) {
      items = parsedData.items.item
    }

    if (items) {
      return Array.isArray(items) ? items : [items]
    }
    return []
  },

  extractOffers(parsedData) {
    let offers = null
    if (parsedData?.['nlgWebSite']?.['offers']?.['offer']) {
      offers = parsedData.nlgWebSite.offers.offer
    } else if (parsedData?.['offers']?.['offer']) {
      offers = parsedData.offers.offer
    } else if (parsedData?.offers?.offer) {
      offers = parsedData.offers.offer
    }

    if (offers) {
      return Array.isArray(offers) ? offers : [offers]
    }
    return []
  },

  extractB2BOffers(parsedData) {
    let b2bOffers = null
    if (parsedData?.['nlgWebSite']?.['b2bOfferDetails']?.['b2bOfferDetail']) {
      b2bOffers = parsedData.nlgWebSite.b2bOfferDetails.b2bOfferDetail
    } else if (parsedData?.['b2bOfferDetails']?.['b2bOfferDetail']) {
      b2bOffers = parsedData.b2bOfferDetails.b2bOfferDetail
    } else if (parsedData?.b2bOfferDetails?.b2bOfferDetail) {
      b2bOffers = parsedData.b2bOfferDetails.b2bOfferDetail
    }

    if (b2bOffers) {
      return Array.isArray(b2bOffers) ? b2bOffers : [b2bOffers]
    }
    return []
  },

  extractOnlineClearance(parsedData) {
    // onlineClearance may contain clearanceGroups (category-based) rather than individual items
    let clearance = null
    const clearanceSection = parsedData?.['nlgWebSite']?.['onlineClearance'] || 
                             parsedData?.['onlineClearance'] || 
                             parsedData?.onlineClearance
    
    if (clearanceSection) {
      // Check for individual clearance items
      if (clearanceSection.clearanceItem) {
        clearance = Array.isArray(clearanceSection.clearanceItem) 
          ? clearanceSection.clearanceItem 
          : [clearanceSection.clearanceItem]
      } else if (clearanceSection.clearanceGroup) {
        // Contains clearance groups (categories) - items marked as special=true or have clearance pricing are clearance
        // We'll identify clearance items from the items themselves (item.special or item.price context)
        return []
      }
    }

    if (clearance) {
      return Array.isArray(clearance) ? clearance : [clearance]
    }
    return []
  },

  enrichProductsWithOffers(items, offers, b2bOffers, clearanceItems) {
    // Create lookup maps for faster matching
    const offerMap = new Map()
    offers.forEach(offer => {
      if (offer.selection?.include?.itemCode) {
        const itemCodes = Array.isArray(offer.selection.include.itemCode) 
          ? offer.selection.include.itemCode 
          : [offer.selection.include.itemCode]
        itemCodes.forEach(code => {
          if (!offerMap.has(code)) {
            offerMap.set(code, [])
          }
          offerMap.get(code).push(offer)
        })
      }
      // Handle allItems offers
      if (offer.selection?.include?.allItems === true) {
        // This applies to all items - store separately
        if (!offerMap.has('*')) {
          offerMap.set('*', [])
        }
        offerMap.get('*').push(offer)
      }
    })

    const b2bOfferMap = new Map()
    b2bOffers.forEach(b2b => {
      const itemCode = b2b['@_itemCode'] || b2b.itemCode
      if (itemCode) {
        b2bOfferMap.set(String(itemCode), b2b)
      }
    })

    const clearanceMap = new Map()
    clearanceItems.forEach(clearance => {
      const itemCode = clearance['@_itemCode'] || clearance.itemCode
      if (itemCode) {
        clearanceMap.set(String(itemCode), clearance)
      }
    })

    // Also check items marked with special="true" or have clearance pricing
    items.forEach(item => {
      const itemCode = String(item['@_itemCode'] || item.itemCode || '')
      if (item['@_special'] === 'true' || item.special === true || item.special === 'true') {
        if (!clearanceMap.has(itemCode)) {
          clearanceMap.set(itemCode, { reason: 'Special clearance item' })
        }
      }
    })

    // Enrich each item with offers and pricing
    return items.map(item => {
      const itemCode = String(item['@_itemCode'] || item.itemCode || '')
      const enriched = {
        ...item,
        applicableOffers: offerMap.get(itemCode) || offerMap.get('*') || [],
        b2bOffer: b2bOfferMap.get(itemCode) || null,
        isClearance: clearanceMap.has(itemCode),
        clearanceInfo: clearanceMap.get(itemCode) || null,
      }
      return this.normalizeProduct(enriched)
    })
  },

  normalizeProduct(rawProduct) {
    // Extract features (can be array or single object)
    const features = []
    if (rawProduct.feature) {
      const featureArray = Array.isArray(rawProduct.feature) 
        ? rawProduct.feature 
        : [rawProduct.feature]
      features.push(...featureArray.map(f => {
        // Handle feature objects with @_sequence and type
        if (typeof f === 'object' && f['#text']) {
          return f['#text']
        }
        return typeof f === 'string' ? f : JSON.stringify(f)
      }))
    }

    // Extract selling points from description and features
    const selling_points = []
    if (rawProduct.description) {
      selling_points.push(rawProduct.description)
    }
    // Add key features as selling points (filter out selling text features)
    const keyFeatures = features.filter(f => {
      const text = (typeof f === 'string' ? f : String(f)).toLowerCase()
      return !text.includes('designed specifically') && 
             !text.includes('provides') &&
             text.length < 100 // Short features only
    })
    selling_points.push(...keyFeatures.slice(0, 5))

    // Extract warranty info
    const warrantyMonths = rawProduct.manufacturerWarranty || ''
    const warranty_info = warrantyMonths 
      ? `Manufacturer warranty: ${warrantyMonths} months`
      : ''

    // Build specs object
    const specs = {}
    if (rawProduct.model) specs.model = rawProduct.model
    if (rawProduct.size) specs.size = rawProduct.size
    if (rawProduct.shippingWeight) specs.weight = `${rawProduct.shippingWeight}kg`
    if (rawProduct.listPrice) specs.listPrice = `$${rawProduct.listPrice}`

    // Extract pricing information
    const pricing = {}
    if (rawProduct.listPrice) pricing.listPrice = parseFloat(rawProduct.listPrice)
    if (rawProduct.price?.value) pricing.currentPrice = parseFloat(rawProduct.price.value)
    
    // Extract applicable offers
    const applicableOffers = rawProduct.applicableOffers || []
    const activeOffers = applicableOffers.filter(offer => {
      const now = new Date()
      const effective = offer.effective ? new Date(offer.effective) : null
      const expires = offer.expires ? new Date(offer.expires) : null
      return (!effective || effective <= now) && (!expires || expires >= now)
    })

    // Extract B2B pricing if available
    const b2bPricing = rawProduct.b2bOffer ? {
      price: parseFloat(rawProduct.b2bOffer.price || 0),
      minimumQuantity: parseInt(rawProduct.b2bOffer.minimumQuantity || 1),
    } : null

    // Extract clearance info
    const clearanceInfo = rawProduct.isClearance && rawProduct.clearanceInfo ? {
      clearancePrice: parseFloat(rawProduct.clearanceInfo.price || 0),
      reason: rawProduct.clearanceInfo.reason || 'Clearance item',
    } : null

    // Normalize product data to internal schema
    return {
      sku: rawProduct['@_itemCode'] || rawProduct.itemCode || rawProduct.sku || rawProduct.id || 'UNKNOWN',
      name: rawProduct.shortDescription || rawProduct.description || rawProduct.name || '',
      brand: rawProduct.brand || rawProduct.manufacturer || '',
      category: this.mapCategory(rawProduct.groupCode, rawProduct.subGroupCode),
      specs: specs,
      features: features,
      selling_points: selling_points,
      faq: [],
      warranty_info: warranty_info,
      recommended_attachments: [],
      safety_notes: '',
      pricing: pricing,
      offers: activeOffers,
      b2bPricing: b2bPricing,
      clearanceInfo: clearanceInfo,
      raw_source_version_hash: null, // Will be set by change detection
    }
  },

  mapCategory(groupCode, subGroupCode) {
    // Map Noel Leeming group codes to categories
    const categoryMap = {
      '1': { '11': 'TV', '12': 'Audio', '13': 'Computers', '14': 'Mobile' },
      '2': { '21': 'Home Appliances', '22': 'Kitchen' },
      '3': { '31': 'Gaming', '32': 'Cameras' },
    }
    
    const group = groupCode?.toString() || ''
    const subGroup = subGroupCode?.toString() || ''
    
    return categoryMap[group]?.[subGroup] || `Group ${groupCode}-${subGroupCode}` || 'General'
  },
}

export default xmlParserService

