import { embeddingClient } from '../lib/azureOpenAIClient.js'

const embeddingService = {
  async generateEmbeddings(chunks, retries = 3) {
    // Extract text bodies from chunks
    const texts = chunks.map((chunk) => chunk.section_body)

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Generate embeddings in batch
        const response = await embeddingClient.getEmbeddings(texts)

        // Map embeddings back to chunks
        const chunksWithEmbeddings = chunks.map((chunk, index) => ({
          ...chunk,
          embedding_vector: response.data[index]?.embedding || [],
        }))

        return chunksWithEmbeddings
      } catch (error) {
        const isTimeout = error.message?.includes('ETIMEDOUT') || 
                         error.message?.includes('timeout') ||
                         error.message?.includes('TIMEOUT')
        
        if (isTimeout && attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000) // Exponential backoff, max 30s
          console.warn(`⚠️ Embedding timeout (attempt ${attempt}/${retries}), retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        console.error(`Error generating embeddings (attempt ${attempt}/${retries}):`, error)
        if (attempt === retries) {
          throw new Error(`Embedding generation failed after ${retries} attempts: ${error.message}`)
        }
      }
    }
  },

  async generateEmbeddingForText(text) {
    try {
      const response = await embeddingClient.getEmbeddings([text])
      return response.data[0]?.embedding || []
    } catch (error) {
      console.error('Error generating embedding for text:', error)
      throw error
    }
  },
}

export default embeddingService

