// Condenser Service
// Summarizes retrieved chunks into condensed context using gpt-4o-mini

import { chatClient } from '../lib/azureOpenAIClient.js'

const CONDENSER_CONFIG = {
  model: 'gpt-4o-mini',
  max_tokens: 900,
  temperature: 0.1,
}

const condenserService = {
  /**
   * Condense retrieved chunks into a concise summary
   * @param {Array} chunks - Array of chunk objects with section_title, section_body, sku, etc.
   * @param {number} maxTokens - Maximum tokens for summary (default 900)
   * @returns {Promise<string>} - Condensed context summary
   */
  async condense(chunks, maxTokens = CONDENSER_CONFIG.max_tokens) {
    if (!chunks || chunks.length === 0) {
      return 'No product context available.'
    }

    // Estimate tokens (rough: 1 token ≈ 4 chars)
    const chunksText = chunks.map(c => `[${c.section_title || 'Unknown'}]\n${c.section_body || ''}`).join('\n\n')
    const estimatedTokens = Math.ceil(chunksText.length / 4)

    // If already under limit, return as-is
    if (estimatedTokens <= maxTokens) {
      return chunksText
    }

    try {
      const systemPrompt = `You are a context summarizer for a retail assistant. Summarize the following product information chunks into a crisp, factual context summary.

Instructions:
- Keep ALL product-specific facts, specifications, and key details
- Remove fluff, marketing language, and redundant information
- Preserve safety/warranty constraints and important warnings
- Maintain accuracy - do not invent or change facts
- Keep the summary concise and well-organized
- Focus on what's relevant for answering customer questions
- Keep it under ${maxTokens} tokens (approximately ${Math.floor(maxTokens * 4)} characters)

Return ONLY the summarized text, no markdown, no code blocks, no explanations.`

      const userPrompt = `Summarize these product chunks:

${chunksText}

Provide a concise summary that preserves all factual information.`

      const response = await chatClient.getChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: maxTokens,
        temperature: CONDENSER_CONFIG.temperature,
      })

      const summary = response.choices[0]?.message?.content || chunksText.substring(0, maxTokens * 4)

      return summary.trim()
    } catch (error) {
      console.error('Error in condensation:', error)
      // Fallback: truncate chunks text
      return chunksText.substring(0, maxTokens * 4) + '...'
    }
  },

  /**
   * Check if condensation is needed
   */
  needsCondensation(chunks, maxTokens = CONDENSER_CONFIG.max_tokens) {
    if (!chunks || chunks.length === 0) {
      return false
    }

    const chunksText = chunks.map(c => `[${c.section_title || 'Unknown'}]\n${c.section_body || ''}`).join('\n\n')
    const estimatedTokens = Math.ceil(chunksText.length / 4)

    return estimatedTokens > maxTokens
  },

  /**
   * Update condenser configuration
   */
  updateConfig(newConfig) {
    Object.assign(CONDENSER_CONFIG, newConfig)
  },
}

export default condenserService

