// Optimized RAG Retrieval Service
// Implements hybrid search, reranking, deduplication, and context optimization

import { embeddingClient } from '../lib/azureOpenAIClient.js'
import { searchClient } from '../lib/azureSearchClient.js'
import { chatClient } from '../lib/azureOpenAIClient.js'

const CONFIG = {
  azure_search_top: 30,           // Retrieve more initially for reranking
  rerank_max_chunks: 10,           // Final chunks to send to LLM
  chunk_score_threshold: 0.55,     // Minimum relevance score
  max_context_tokens: 5000,        // Max tokens before summarization
  embedding_model: 'text-embedding-3-large',
  summarizer_model: 'gpt-4o-mini', // For context compression
  use_summarization: true,         // Enable mini-summary step
}

const ragRetrievalOptimizedService = {
  /**
   * Main retrieval method with full optimization pipeline
   */
  async retrieveRelevantChunks({ sku, question, limit = 10, filters = {} }) {
    try {
      // Step 1: Generate embedding for the question
      const questionEmbedding = await this.generateQuestionEmbedding(question)

      // Step 2: Build hybrid query (vector + keyword search)
      const results = await this.hybridSearch(question, questionEmbedding, sku, filters)

      // Step 3: Filter by score threshold
      const filteredResults = this.filterByScore(results, CONFIG.chunk_score_threshold)

      // Step 4: Rerank, deduplicate, and diversify
      const rerankedChunks = this.rerankAndDiversify(filteredResults, CONFIG.rerank_max_chunks || limit)

      // Step 5: Optionally summarize if context is too large
      const finalChunks = await this.condenseContextIfNeeded(rerankedChunks, CONFIG.max_context_tokens)

      return finalChunks
    } catch (error) {
      console.error('Error in optimized retrieval:', error)
      // Fallback to simple retrieval
      return this.fallbackRetrieval(question, sku, limit)
    }
  },

  /**
   * Hybrid search: Combine vector search + keyword/lexical search
   */
  async hybridSearch(question, questionEmbedding, sku, filters = {}) {
    // Build filter string
    let filterString = null
    const filterParts = []
    
    if (sku) {
      filterParts.push(`sku eq '${sku}'`)
    }
    
    // Add metadata filters if provided
    if (filters.brand) {
      filterParts.push(`brand eq '${filters.brand}'`)
    }
    if (filters.category) {
      filterParts.push(`category eq '${filters.category}'`)
    }
    if (filters.importance_score) {
      filterParts.push(`importance_score ge ${filters.importance_score}`)
    }
    
    if (filterParts.length > 0) {
      filterString = filterParts.join(' and ')
    }

      // Hybrid search: vector + keyword
      // Note: Azure AI Search hybrid search combines both automatically when you provide both searchText and vectorSearchOptions
      const searchResults = await searchClient.search(question, {
        // Keyword/lexical search on question text (searches section_body and section_title)
        
        // Vector search
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: questionEmbedding,
              kNearestNeighborsCount: CONFIG.azure_search_top, // Get more for reranking
              fields: ['embedding_vector'],
            },
          ],
        },
        
        // Filters
        filter: filterString,
        
        // Top results (hybrid will combine both search types)
        top: CONFIG.azure_search_top,
        
        // Select relevant fields
        select: ['sku', 'section_title', 'section_body', 'section_type', 'importance_score', '@search.score'],
      })

    return searchResults.map((result) => ({
      sku: result.sku,
      section_title: result.section_title,
      section_body: result.section_body,
      section_type: result.section_type || result.section_title,
      importance_score: result.importance_score || 0.5,
      search_score: result['@search.score'] || 0,
      chunk_id: result.chunk_id,
    }))
  },

  /**
   * Filter results by minimum relevance score
   */
  filterByScore(results, threshold) {
    return results.filter(result => result.search_score >= threshold)
  },

  /**
   * Rerank, deduplicate, and ensure diversity across SKUs and section types
   */
  rerankAndDiversify(results, maxChunks) {
    // Group by SKU and section_type to avoid duplicates
    const grouped = {}
    results.forEach(chunk => {
      const key = `${chunk.sku}_${chunk.section_type}`
      if (!grouped[key] || chunk.search_score > grouped[key].search_score) {
        grouped[key] = chunk
      }
    })

    // Convert back to array and sort by score
    const uniqueChunks = Object.values(grouped)
      .sort((a, b) => b.search_score - a.search_score)

    // Ensure diversity: prioritize different section types
    const finalChunks = []
    const sectionTypesSeen = new Set()
    const skusSeen = new Set()

    // First pass: get one chunk per SKU-section combination, prioritizing high scores
    for (const chunk of uniqueChunks) {
      if (finalChunks.length >= maxChunks) break
      
      const sectionKey = chunk.section_type || chunk.section_title
      const skuKey = chunk.sku
      
      // Prioritize chunks from different sections and SKUs
      const isDiverse = !sectionTypesSeen.has(sectionKey) || !skusSeen.has(skuKey)
      
      if (isDiverse || finalChunks.length < maxChunks / 2) {
        finalChunks.push(chunk)
        sectionTypesSeen.add(sectionKey)
        skusSeen.add(skuKey)
      }
    }

    // Second pass: fill remaining slots with highest scoring chunks
    for (const chunk of uniqueChunks) {
      if (finalChunks.length >= maxChunks) break
      
      const key = `${chunk.sku}_${chunk.section_type}`
      if (!finalChunks.find(c => `${c.sku}_${c.section_type}` === key)) {
        finalChunks.push(chunk)
      }
    }

    // Sort final results by score
    return finalChunks
      .sort((a, b) => b.search_score - a.search_score)
      .slice(0, maxChunks)
  },

  /**
   * Condense context if it exceeds token limits using gpt-4o-mini
   */
  async condenseContextIfNeeded(chunks, maxTokens) {
    // Estimate tokens (rough: 1 token ≈ 4 chars)
    const contextText = chunks.map(c => c.section_body).join('\n\n')
    const estimatedTokens = Math.ceil(contextText.length / 4)

    if (estimatedTokens <= maxTokens || !CONFIG.use_summarization) {
      return chunks
    }

    console.log(`[RAG] Context too large (${estimatedTokens} tokens), summarizing...`)

    try {
      const summaryPrompt = `Summarize these product information chunks while retaining ALL product-specific facts, specifications, and key details. Maintain accuracy and completeness:

${chunks.map((c, i) => `[${i + 1}] ${c.section_title}\n${c.section_body}`).join('\n\n')}

Return a concise but comprehensive summary that preserves all factual information.`

      const summaryResponse = await chatClient.getChatCompletions([
        { role: 'system', content: 'You are a technical summarizer. Preserve all factual product details.' },
        { role: 'user', content: summaryPrompt },
      ], {
        maxTokens: 2000, // Max summary length
      })

      const summaryText = summaryResponse.choices[0]?.message?.content || contextText

      // Create a synthetic chunk from summary
      return [{
        sku: chunks[0]?.sku || null,
        section_title: 'Product Summary',
        section_body: summaryText,
        section_type: 'Summary',
        importance_score: 1.0,
        search_score: 1.0,
        chunk_id: 'summary',
      }]
    } catch (error) {
      console.warn('[RAG] Summarization failed, using original chunks:', error.message)
      // If summarization fails, just truncate chunks
      return chunks.slice(0, CONFIG.rerank_max_chunks)
    }
  },

  /**
   * Generate embedding for question
   */
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

  /**
   * Fallback to simple retrieval if optimized fails
   */
  async fallbackRetrieval(question, sku, limit) {
    console.warn('[RAG] Falling back to simple retrieval')
    const questionEmbedding = await this.generateQuestionEmbedding(question)
    const filter = sku ? `sku eq '${sku}'` : null

    const results = await searchClient.search('', {
      vectorSearchOptions: {
        queries: [
          {
            kind: 'vector',
            vector: questionEmbedding,
            kNearestNeighborsCount: limit,
            fields: ['embedding_vector'],
          },
        ],
      },
      filter,
      top: limit,
    })

    return results.map((chunk) => ({
      section_title: chunk.section_title,
      section_body: chunk.section_body,
      sku: chunk.sku,
      chunk_id: chunk.chunk_id,
    }))
  },

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    Object.assign(CONFIG, newConfig)
  },
}

export default ragRetrievalOptimizedService
