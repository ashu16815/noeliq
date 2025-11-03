// Turn Orchestrator Configuration
// Centralized configuration for retrieval, summarization, and LLM settings

const turnOrchestratorConfig = {
  retrieval: {
    azure_search_top: parseInt(process.env.AZURE_SEARCH_TOP || '24', 10),
    max_chunks_after_diversify: parseInt(process.env.MAX_CHUNKS_AFTER_DIVERSIFY || '10', 10),
    min_score: parseFloat(process.env.MIN_CHUNK_SCORE || '0.55'),
    k_semantic: parseInt(process.env.K_SEMANTIC || '12', 10),
    k_lexical: parseInt(process.env.K_LEXICAL || '12', 10),
  },

  summarization: {
    enabled: process.env.USE_SUMMARIZATION !== 'false', // Default true
    model: process.env.SUMMARIZATION_MODEL || 'gpt-4o-mini',
    max_tokens: parseInt(process.env.SUMMARIZATION_MAX_TOKENS || '900', 10),
  },

  llm_main: {
    model: process.env.MAIN_LLM_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.MAIN_LLM_TEMPERATURE || '0.3'),
  },

  intent_classifier: {
    use_llm_fallback: process.env.INTENT_CLASSIFIER_USE_LLM !== 'false', // Default true
    llm_model: process.env.INTENT_CLASSIFIER_MODEL || 'gpt-4o-mini',
    llm_temperature: parseFloat(process.env.INTENT_CLASSIFIER_TEMPERATURE || '0.1'),
  },

  query_rewriter: {
    model: process.env.QUERY_REWRITER_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.QUERY_REWRITER_TEMPERATURE || '0.3'),
    max_tokens: parseInt(process.env.QUERY_REWRITER_MAX_TOKENS || '500', 10),
  },
}

export default turnOrchestratorConfig

