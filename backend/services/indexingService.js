import { searchClient } from '../lib/azureSearchClient.js'

const indexingService = {
  async indexChunks(chunksWithEmbeddings) {
    try {
      // Format chunks for Azure AI Search
      const documents = chunksWithEmbeddings.map((chunk) => {
        const doc = {
          chunk_id: String(chunk.chunk_id || `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
          sku: String(chunk.sku || ''),
          section_title: String(chunk.section_title || ''),
          section_type: String(chunk.section_type || chunk.section_title || ''),
          section_body: String(chunk.section_body || ''),
          embedding_vector: Array.isArray(chunk.embedding_vector) ? chunk.embedding_vector : [],
          importance_score: typeof chunk.importance_score === 'number' ? chunk.importance_score : 0.5,
          warranty_restrictions: chunk.warranty_restrictions ? String(chunk.warranty_restrictions) : null,
          last_updated_ts: chunk.last_updated_ts || new Date().toISOString(),
          source_hash: chunk.source_hash ? String(chunk.source_hash) : null,
        }

        // Add pricing and offer fields if available
        if (chunk.current_price !== undefined) {
          doc.current_price = parseFloat(chunk.current_price) || null
        }
        if (chunk.list_price !== undefined) {
          doc.list_price = parseFloat(chunk.list_price) || null
        }
        if (chunk.has_offers !== undefined) {
          doc.has_offers = Boolean(chunk.has_offers)
        }
        if (chunk.offer_names && Array.isArray(chunk.offer_names)) {
          doc.offer_names = chunk.offer_names.map(n => String(n))
        }
        if (chunk.is_clearance !== undefined) {
          doc.is_clearance = Boolean(chunk.is_clearance)
        }
        if (chunk.clearance_price !== undefined) {
          doc.clearance_price = parseFloat(chunk.clearance_price) || null
        }
        if (chunk.b2b_price !== undefined) {
          doc.b2b_price = parseFloat(chunk.b2b_price) || null
        }

        return doc
      })

      // Upload to Azure AI Search
      const result = await searchClient.uploadDocuments(documents)

      return result
    } catch (error) {
      console.error('Error indexing chunks:', error)
      throw new Error(`Indexing failed: ${error.message}`)
    }
  },

  async deleteChunksForSKU(sku) {
    try {
      // First, retrieve all chunks for this SKU
      const chunks = await searchClient.search('', {
        filter: `sku eq '${sku}'`,
        top: 1000, // Adjust based on expected chunk count
      })

      if (chunks.length > 0) {
        // Delete all chunks for this SKU
        const deleteDocs = chunks.map((chunk) => ({
          chunk_id: chunk.chunk_id,
          sku: chunk.sku,
        }))

        await searchClient.deleteDocuments(deleteDocs)
      }

      return { deleted: chunks.length }
    } catch (error) {
      console.error('Error deleting chunks:', error)
      throw error
    }
  },
}

export default indexingService

