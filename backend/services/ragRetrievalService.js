import { embeddingClient } from '../lib/azureOpenAIClient.js'
import { searchClient } from '../lib/azureSearchClient.js'

const ragRetrievalService = {
  async retrieveRelevantChunks({ sku, question, limit = 5, customer_intent = null }) {
    try {
      // Step 1: Build enhanced query that includes customer intent
      let enhancedQuestion = question
      if (customer_intent) {
        // Append intent summary to question for better retrieval
        enhancedQuestion = `${question} ${customer_intent}`
      }

      // Step 2: Generate embedding for the enhanced question
      const questionEmbedding = await this.generateQuestionEmbedding(enhancedQuestion)

      // Step 3: Build filter for SKU if provided
      const filter = sku ? `sku eq '${sku}'` : null

      // Step 4: Perform vector search
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

      const mappedChunks = chunks.map((chunk) => ({
        section_title: chunk.section_title,
        section_body: chunk.section_body,
        sku: chunk.sku,
        chunk_id: chunk.chunk_id,
      }))

      // Step 5: If no chunks found and we have customer intent, add intent as synthetic chunk
      if (mappedChunks.length === 0 && customer_intent) {
        return [{
          section_title: 'Customer Intent',
          section_body: customer_intent,
          sku: sku || null,
          chunk_id: 'intent_synthetic',
        }]
      }

      return mappedChunks
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

