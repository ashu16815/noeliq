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
  async retrieveRelevantChunks({ sku, question, limit = 10, filters = {}, customer_intent = null, compare_list = [] }) {
    try {
      // Step 1: Build enhanced query that includes customer intent
      let enhancedQuestion = question
      if (customer_intent) {
        // Append intent summary to question for better retrieval
        enhancedQuestion = `${question} ${customer_intent}`
      }

      // Step 2: Generate embedding for the enhanced question
      const questionEmbedding = await this.generateQuestionEmbedding(enhancedQuestion)

      // Step 3: Handle compare_list or general recommendation queries
      let allResults = []
      if (compare_list && compare_list.length > 0) {
        // Retrieve chunks for each SKU in compare_list
        for (const compareSku of compare_list) {
          const results = await this.hybridSearch(enhancedQuestion, questionEmbedding, compareSku, filters)
          allResults.push(...results)
        }
        // Also retrieve for primary SKU if it's not in compare_list
        if (sku && !compare_list.includes(sku)) {
          const primaryResults = await this.hybridSearch(enhancedQuestion, questionEmbedding, sku, filters)
          allResults.push(...primaryResults)
        }
      } else if (!sku) {
        // No SKU filter = general recommendation query - retrieve without SKU filter to get multiple options
        // Retrieve more results to ensure we get diverse SKUs
        console.log(`[RAG] 🔍 General query (no SKU filter) - retrieving chunks for all SKUs`)
        console.log(`[RAG] Enhanced question: "${enhancedQuestion}"`)
        console.log(`[RAG] Filters:`, filters)
        allResults = await this.hybridSearch(enhancedQuestion, questionEmbedding, null, filters)
        const uniqueSkus = [...new Set(allResults.map(r => r.sku).filter(Boolean))]
        console.log(`[RAG] General query - retrieved ${allResults.length} chunks from ${uniqueSkus.length} unique SKUs: ${uniqueSkus.join(', ')}`)
      } else {
        // Normal single-SKU retrieval
        allResults = await this.hybridSearch(enhancedQuestion, questionEmbedding, sku, filters)
      }

      // Step 4: Filter by score threshold
      const filteredResults = this.filterByScore(allResults, CONFIG.chunk_score_threshold)

      // Step 5: Rerank, deduplicate, and diversify (ensures diversity across SKUs for comparison)
      const rerankedChunks = this.rerankAndDiversify(filteredResults, CONFIG.rerank_max_chunks || limit, compare_list)
      const rerankedUniqueSkus = [...new Set(rerankedChunks.map(c => c.sku).filter(Boolean))]
      console.log(`[RAG] After reranking: ${rerankedChunks.length} chunks from ${rerankedUniqueSkus.length} unique SKUs: ${rerankedUniqueSkus.join(', ')}`)

      // Step 6: Optionally summarize if context is too large
      const finalChunks = await this.condenseContextIfNeeded(rerankedChunks, CONFIG.max_context_tokens)

      // Step 7: If no chunks found and we have customer intent, add intent as synthetic chunk
      if (finalChunks.length === 0 && customer_intent) {
        console.log(`[RAG] No chunks found - using synthetic intent chunk`)
        return [{
          section_title: 'Customer Intent',
          section_body: customer_intent,
          sku: sku || (compare_list && compare_list.length > 0 ? compare_list[0] : null),
          chunk_id: 'intent_synthetic',
          section_type: 'Intent',
          importance_score: 0.8,
          search_score: 0.8,
        }]
      }

      const finalUniqueSkus = [...new Set(finalChunks.map(c => c.sku).filter(Boolean))]
      console.log(`[RAG] ✅ Final chunks: ${finalChunks.length} chunks from ${finalUniqueSkus.length} unique SKUs: ${finalUniqueSkus.join(', ')}`)
      if (finalChunks.length > 0) {
        console.log(`[RAG] Sample chunk: SKU ${finalChunks[0].sku}, section: ${finalChunks[0].section_title || 'Unknown'}, preview: ${(finalChunks[0].section_body || '').substring(0, 100)}...`)
      }

      return finalChunks
    } catch (error) {
      console.error('Error in optimized retrieval:', error)
      // Fallback to simple retrieval
      return this.fallbackRetrieval(question, sku, limit, customer_intent)
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
    
    // Add metadata filters if provided (only for fields that exist in index schema)
    // Note: category, brand, size_inches don't exist in index schema - can't filter by them
    // Price filtering: use current_price or list_price fields that exist in schema
    if (filters.price_max) {
      // Filter by list_price if available (prefer list_price over current_price for consistent filtering)
      filterParts.push(`list_price le ${filters.price_max}`)
    }
    // Note: Only use filters for fields that definitely exist in the deployed index
    // importance_score and section_type may not be in actual deployed index - commented out for safety
    // if (filters.importance_score) {
    //   filterParts.push(`importance_score ge ${filters.importance_score || 0.5}`)
    // }
    
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
        
        // Select relevant fields (only fields that exist in actual deployed index)
        // Note: @search.score is automatically included, don't add it to select
        // Using only core fields that definitely exist: sku, section_title, section_body, chunk_id
        select: ['sku', 'section_title', 'section_body', 'chunk_id'],
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
   * @param {Array} results - Array of chunk results
   * @param {number} maxChunks - Maximum chunks to return
   * @param {Array} compare_list - List of SKUs being compared (for ensuring diversity across SKUs)
   */
  rerankAndDiversify(results, maxChunks, compare_list = []) {
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

    // Ensure diversity: prioritize different section types and SKUs
    const finalChunks = []
    const sectionTypesSeen = new Set()
    const skusSeen = new Set()
    const sectionTypesBySku = {} // Track section types per SKU

    // If comparing, ensure we get chunks from each SKU
    const targetSkus = compare_list.length > 0 ? compare_list : [...new Set(uniqueChunks.map(c => c.sku).filter(Boolean))]

    // First pass: get one chunk per section type per SKU (for comparison)
    if (compare_list.length > 0) {
      // For comparison, prioritize getting same section types from different SKUs
      const sectionTypes = [...new Set(uniqueChunks.map(c => c.section_type || c.section_title).filter(Boolean))]
      
      for (const sectionType of sectionTypes) {
        if (finalChunks.length >= maxChunks) break
        
        // Get top chunk for each SKU with this section type
        for (const sku of targetSkus) {
          if (finalChunks.length >= maxChunks) break
          
          const chunk = uniqueChunks.find(c => 
            c.sku === sku && 
            (c.section_type || c.section_title) === sectionType &&
            !finalChunks.find(fc => fc.sku === c.sku && (fc.section_type || fc.section_title) === sectionType)
          )
          
          if (chunk) {
            finalChunks.push(chunk)
            sectionTypesSeen.add(sectionType)
            skusSeen.add(sku)
          }
        }
      }
    }

    // Second pass: fill remaining slots with highest scoring diverse chunks
    for (const chunk of uniqueChunks) {
      if (finalChunks.length >= maxChunks) break
      
      const sectionKey = chunk.section_type || chunk.section_title
      const skuKey = chunk.sku
      const key = `${chunk.sku}_${chunk.section_type}`
      
      // Skip if already included
      if (finalChunks.find(c => `${c.sku}_${c.section_type}` === key)) {
        continue
      }
      
      // Prioritize diversity
      const isDiverse = !sectionTypesSeen.has(sectionKey) || !skusSeen.has(skuKey)
      
      if (isDiverse || finalChunks.length < maxChunks) {
        finalChunks.push(chunk)
        sectionTypesSeen.add(sectionKey)
        skusSeen.add(skuKey)
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
  async fallbackRetrieval(question, sku, limit, customer_intent = null) {
    console.warn('[RAG] Falling back to simple retrieval')
    
    // Enhance question with intent if available
    let enhancedQuestion = question
    if (customer_intent) {
      enhancedQuestion = `${question} ${customer_intent}`
    }
    
    const questionEmbedding = await this.generateQuestionEmbedding(enhancedQuestion)
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

    const mappedResults = results.map((chunk) => ({
      section_title: chunk.section_title,
      section_body: chunk.section_body,
      sku: chunk.sku,
      chunk_id: chunk.chunk_id,
    }))

    // If no chunks found and we have customer intent, add intent as synthetic chunk
    if (mappedResults.length === 0 && customer_intent) {
      return [{
        section_title: 'Customer Intent',
        section_body: customer_intent,
        sku: sku || null,
        chunk_id: 'intent_synthetic',
        section_type: 'Intent',
        importance_score: 0.8,
        search_score: 0.8,
      }]
    }

    return mappedResults
  },

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    Object.assign(CONFIG, newConfig)
  },
}

export default ragRetrievalOptimizedService
