// Service to find alternative products when primary SKU is out of stock
// Uses semantic similarity via Azure AI Search

import { searchClient } from '../lib/azureSearchClient.js'
import { embeddingClient } from '../lib/azureOpenAIClient.js'
import productRetrievalService from './productRetrievalService.js'

const similarProductService = {
  async getAlternativeIfOOS(sku, store_id) {
    try {
      // Get the primary product to understand what we're looking for
      const primaryProduct = await productRetrievalService.getProductRecord(sku)
      
      if (!primaryProduct) {
        return null
      }

      // Generate embedding for the primary product name/description
      const productQuery = `${primaryProduct.name} ${primaryProduct.category}`
      const response = await embeddingClient.getEmbeddings([productQuery])
      const productEmbedding = response.data[0].embedding

      // Search for similar products, excluding the original SKU
      const similarProducts = await searchClient.search('', {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: productEmbedding,
              kNearestNeighborsCount: 3,
              fields: ['embedding_vector'], // Must be an array
            },
          ],
        },
        filter: `sku ne '${sku}'`, // Exclude the original SKU
        top: 3,
      })

      // TODO: Check which similar products are in stock
      // For MVP, return the first similar product
      if (similarProducts.length > 0) {
        const altSku = similarProducts[0].sku
        const altProduct = await productRetrievalService.getProductRecord(altSku)
        
        return {
          alt_sku: altSku,
          alt_name: altProduct.name,
          why_this_alt: `Similar ${altProduct.category} with comparable features`,
          key_diff: this.generateKeyDifference(primaryProduct, altProduct),
        }
      }

      return null
    } catch (error) {
      console.error('Error finding alternative product:', error)
      return null
    }
  },

  generateKeyDifference(primary, alternative) {
    // Simple difference detection
    // TODO: Implement more sophisticated comparison
    if (primary.category !== alternative.category) {
      return `Different category: ${primary.category} vs ${alternative.category}`
    }
    return 'Similar specifications with minor differences'
  },
}

export default similarProductService

