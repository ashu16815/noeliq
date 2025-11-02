import { embeddingClient } from '../lib/azureOpenAIClient.js'
import { searchClient } from '../lib/azureSearchClient.js'

const ragRetrievalService = {
  async retrieveRelevantChunks({ sku, question, limit = 5 }) {
    try {
      // Step 1: Generate embedding for the question
      const questionEmbedding = await this.generateQuestionEmbedding(question)

      // Step 2: Build filter for SKU if provided
      const filter = sku ? `sku eq '${sku}'` : null

      // Step 3: Perform vector search
      const chunks = await searchClient.search('', {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: questionEmbedding,
              kNearestNeighborsCount: limit, // Use full limit with increased token capacity
              fields: ['embedding_vector'], // Must be an array
            },
          ],
        },
        filter,
        top: limit,
      })

      return chunks.map((chunk) => ({
        section_title: chunk.section_title,
        section_body: chunk.section_body,
        sku: chunk.sku,
        chunk_id: chunk.chunk_id,
      }))
    } catch (error) {
      console.error('Error retrieving relevant chunks:', error)
      // Return empty array on error - graceful degradation
      return []
    }
  },

  async generateQuestionEmbedding(question) {
    try {
      const response = await embeddingClient.getEmbeddings([question])
      if (response.data && response.data.length > 0) {
        return response.data[0].embedding
      }
      throw new Error('No embedding returned')
    } catch (error) {
      console.error('Error generating question embedding:', error)
      throw error
    }
  },
}

export default ragRetrievalService

