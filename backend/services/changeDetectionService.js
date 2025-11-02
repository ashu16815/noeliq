import crypto from 'crypto'
import dbClient from '../lib/dbClient.js'

const changeDetectionService = {
  async detectChanges(newProducts) {
    // Calculate hash for each product
    const newHashes = new Map()
    newProducts.forEach((product) => {
      const hash = this.computeProductHash(product)
      newHashes.set(product.sku, hash)
      // Store hash in product for later use
      product.raw_source_version_hash = hash
    })

    // Get existing hashes from JSON storage
    const existingStatuses = await dbClient.getSyncStatus()
    const existingHashes = new Map()
    existingStatuses.forEach((status) => {
      if (status.last_seen_hash) {
        existingHashes.set(status.sku, status.last_seen_hash)
      }
    })

    // Compare hashes
    const changedSKUs = []
    const newSKUs = []
    const unchangedSKUs = []

    newHashes.forEach((newHash, sku) => {
      const existingHash = existingHashes.get(sku)
      if (!existingHash) {
        newSKUs.push(sku)
      } else if (existingHash !== newHash) {
        changedSKUs.push(sku)
      } else {
        unchangedSKUs.push(sku)
      }
    })

    // Detect removed SKUs (exist in DB but not in new products)
    const removedSKUs = []
    existingHashes.forEach((hash, sku) => {
      if (!newHashes.has(sku)) {
        removedSKUs.push(sku)
      }
    })

    return {
      changedSKUs,
      newSKUs,
      unchangedSKUs,
      removedSKUs,
      totalProcessed: newProducts.length,
    }
  },

  computeProductHash(product) {
    // Create a hash of key product fields that would trigger re-embedding
    const hashableFields = {
      name: product.name,
      brand: product.brand,
      category: product.category,
      specs: product.specs,
      features: product.features,
      selling_points: product.selling_points,
      warranty_info: product.warranty_info,
      recommended_attachments: product.recommended_attachments,
    }

    const hashString = JSON.stringify(hashableFields)
    return crypto.createHash('sha256').update(hashString).digest('hex')
  },
}

export default changeDetectionService

