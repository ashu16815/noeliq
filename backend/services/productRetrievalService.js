// Service to retrieve structured product records from JSON storage
import dbClient from '../lib/dbClient.js'

const productRetrievalService = {
  async getProductRecord(sku) {
    try {
      const product = await dbClient.getParsedProduct(sku)
      if (product) {
        // Remove metadata fields
        const { source_label, last_parsed_ts, ...productData } = product
        return productData
      }
      
      // Return null if not found (this is expected if products weren't stored to JSON)
      // System still works using Azure AI Search chunks, so this is not an error
      return null
    } catch (error) {
      console.error(`Error retrieving product record for SKU ${sku}:`, error)
      return null
    }
  },

  async getRecommendedAttachments(sku) {
    const product = await this.getProductRecord(sku)
    return product?.recommended_attachments || []
  },
}

export default productRetrievalService

