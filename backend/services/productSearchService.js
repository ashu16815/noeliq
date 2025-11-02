// Service to search for products by natural language query
// Uses Azure AI Search vector search to find products

import { embeddingClient } from '../lib/azureOpenAIClient.js'
import { searchClient } from '../lib/azureSearchClient.js'
import productRetrievalService from './productRetrievalService.js'

const productSearchService = {
  async searchProducts(query, limit = 10) {
    try {
      // Step 1: Generate embedding for the product search query
      const queryEmbedding = await this.generateQueryEmbedding(query)

      // Step 2: Perform vector search to find relevant product chunks
      const chunks = await searchClient.search('', {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: queryEmbedding,
              kNearestNeighborsCount: limit * 5, // Get more chunks to find unique SKUs
              fields: ['embedding_vector'],
            },
          ],
        },
        top: limit * 5,
      })

      // Step 3: Group chunks by SKU and extract product info
      const productsBySku = {}
      
      for (const chunk of chunks) {
        const sku = chunk.sku
        if (!sku) continue

        if (!productsBySku[sku]) {
          productsBySku[sku] = {
            sku,
            name: null,
            category: null,
            price: chunk.current_price || chunk.list_price || null,
            sections: [],
          }
        }

        const body = chunk.section_body || ''
        const title = chunk.section_title || ''

        // Extract product name from various patterns
        // Prioritize "Product Overview" chunks for best results
        if (!productsBySku[sku].name || (title === 'Product Overview' && !productsBySku[sku].name.startsWith('Product'))) {
          let nameMatch = null
          
          // Pattern 1: "Product: [name]" - BEST PATTERN for Product Overview chunks
          if (title === 'Product Overview' || title.includes('Product')) {
            nameMatch = body.match(/Product[:\s]+([^\n(]+?)(?:\s*\(SKU:|$)/i)
            // If found "Product: [name]", extract just the name
            if (nameMatch && nameMatch[1]) {
              let extractedName = nameMatch[1].trim()
              // Remove common prefixes/suffixes
              extractedName = extractedName.replace(/^[-•]\s*/, '')
              extractedName = extractedName.replace(/\s*\(SKU:\s*\d+\)/gi, '')
              extractedName = extractedName.replace(/\s+SKU:\s*\d+$/gi, '')
              if (extractedName.length > 3 && !extractedName.match(/^(Features|Specifications|Key|Selling|Points|Category|Brand|SKU)/i)) {
                productsBySku[sku].name = extractedName
                continue // Skip other patterns if we found it in Product Overview
              }
            }
          }
          
          // Pattern 2: Look for brand and model in specs
          if (!productsBySku[sku].name && title === 'Specifications') {
            const brandMatch = body.match(/Brand[:\s]+([^\n,;]+)/i)
            const modelMatch = body.match(/Model[:\s]+([^\n,;]+)/i)
            if (brandMatch && modelMatch) {
              const combined = `${brandMatch[1].trim()} ${modelMatch[1].trim()}`
              if (combined.length > 5 && combined.length < 100) {
                productsBySku[sku].name = combined
                continue
              }
            } else if (brandMatch && brandMatch[1].trim().length > 3) {
              productsBySku[sku].name = brandMatch[1].trim()
              continue
            } else if (modelMatch && modelMatch[1].trim().length > 3) {
              productsBySku[sku].name = modelMatch[1].trim()
              continue
            }
          }

          // Pattern 3: "Name: [name]" or "Title: [name]" (only if no name found yet)
          if (!productsBySku[sku].name) {
            nameMatch = body.match(/(?:Name|Title)[:\s]+([^\n(]+?)(?:\s*\(SKU:|$)/i)
            if (nameMatch && nameMatch[1]) {
              let extractedName = nameMatch[1].trim()
              extractedName = extractedName.replace(/^[-•]\s*/, '')
              extractedName = extractedName.replace(/\s*\(SKU:\s*\d+\)/gi, '')
              if (extractedName.length > 3 && !extractedName.match(/^(Features|Specifications|Key|Selling|Points|Category|Brand)/i)) {
                productsBySku[sku].name = extractedName
              }
            }
          }
        }

        // Extract category from various patterns
        if (!productsBySku[sku].category) {
          const categoryMatch = body.match(/Category[:\s]+([^\n]+)/i) ||
                               body.match(/^Category:\s*(.+)/i) ||
                               body.match(/Type[:\s]+([^\n]+)/i)
          if (categoryMatch && categoryMatch[1]) {
            productsBySku[sku].category = categoryMatch[1].trim()
          }
        }

        // Store relevant sections for preview
        if (body && body.length > 10) {
          productsBySku[sku].sections.push({
            title,
            preview: body.substring(0, 150).trim(),
          })
        }
      }

      // Step 4: Try to get product names from parsed products JSON if extraction failed
      for (const sku in productsBySku) {
        if (!productsBySku[sku].name || productsBySku[sku].name.startsWith('Product ')) {
          try {
            const productRecord = await productRetrievalService.getProductRecord(sku)
            if (productRecord && productRecord.name) {
              productsBySku[sku].name = productRecord.name
              if (!productsBySku[sku].category && productRecord.category) {
                productsBySku[sku].category = productRecord.category
              }
            }
          } catch (error) {
            // Silent fail - continue without product record
          }
        }
      }

      // Step 5: Convert to array and sort by relevance (most chunks = most relevant)
      const products = Object.values(productsBySku)
        .sort((a, b) => b.sections.length - a.sections.length)
        .slice(0, limit)
        .map(product => {
          // Clean up product name - remove SKU if included
          let cleanedName = product.name || `Product ${product.sku}`
          
          // Remove "(SKU: xxx)" pattern from name
          cleanedName = cleanedName.replace(/\s*\(SKU:\s*\d+\)/gi, '').trim()
          
          // Remove standalone SKU numbers at the end
          cleanedName = cleanedName.replace(/\s+SKU:\s*\d+$/gi, '').trim()
          
          // If name is still the fallback, try to extract from first section
          if (cleanedName === `Product ${product.sku}` && product.sections.length > 0) {
            const firstSection = product.sections[0].preview || ''
            // Try to find product name in specifications or features
            const specMatch = firstSection.match(/model[:\s]+([^\n,;]+)/i)
            if (specMatch && specMatch[1]) {
              cleanedName = specMatch[1].trim()
            }
          }

          return {
            sku: product.sku,
            name: cleanedName,
            category: product.category || 'Unknown',
            price: product.price,
            preview: product.sections[0]?.preview || '',
          }
        })

      return products
    } catch (error) {
      console.error('Error searching products:', error)
      return []
    }
  },

  async generateQueryEmbedding(query) {
    try {
      const response = await embeddingClient.getEmbeddings([query])
      if (response.data && response.data.length > 0) {
        return response.data[0].embedding
      }
      throw new Error('No embedding returned')
    } catch (error) {
      console.error('Error generating query embedding:', error)
      throw error
    }
  },
}

export default productSearchService

