import crypto from 'crypto'

/**
 * Utility function to compute hash for a product SKU
 * Used for change detection
 */

export function computeSkuHash(product) {
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
}

export default computeSkuHash

