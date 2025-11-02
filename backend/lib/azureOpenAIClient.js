import OpenAI from 'openai'

// Function to get config (allows late loading of env vars)
const getConfig = () => {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  const embeddingDeploymentName = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME
  
  return { endpoint, apiKey, deploymentName, embeddingDeploymentName }
}

// Initialize client lazily
let client = null
const getClient = () => {
  if (!client) {
    const { endpoint, apiKey, deploymentName } = getConfig()
    if (!endpoint || !apiKey || !deploymentName) {
      console.warn('Warning: Azure OpenAI configuration incomplete. Some features may not work.')
      return null
    }
    client = new OpenAI({
      apiKey: apiKey,
      baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
      defaultQuery: { 'api-version': '2024-02-15-preview' },
      defaultHeaders: { 'api-key': apiKey },
    })
  }
  return client
}

export const chatClient = {
  getChatCompletions: async (messages, options = {}) => {
    const { deploymentName } = getConfig()
    const clientInstance = getClient()
    if (!clientInstance || !deploymentName) {
      throw new Error('Azure OpenAI client not configured')
    }
    try {
      // Extract maxTokens and temperature - GPT-5 doesn't support custom temperature
      const { maxTokens, temperature, ...restOptions } = options
      // GPT-5 models use max_completion_tokens instead of max_tokens
      // GPT-5 only supports temperature=1 (default), so don't pass it
      const response = await clientInstance.chat.completions.create({
        model: deploymentName,
        messages,
        max_completion_tokens: maxTokens || 1000, // GPT-5 uses max_completion_tokens
        ...restOptions, // Spread remaining options (without maxTokens or temperature)
      })
      return response
    } catch (error) {
      console.error('Azure OpenAI Chat API Error:', error)
      throw new Error(`OpenAI API error: ${error.message}`)
    }
  },
}

export const embeddingClient = {
  getEmbeddings: async (input) => {
    const { endpoint, apiKey, embeddingDeploymentName } = getConfig()
    if (!endpoint || !apiKey || !embeddingDeploymentName) {
      throw new Error('Azure OpenAI client not configured')
    }
    try {
      // Handle both string and array of strings
      const inputs = Array.isArray(input) ? input : [input]
      
      // Create separate client for embeddings with correct deployment
      const embeddingClientInstance = new OpenAI({
        apiKey: apiKey,
        baseURL: `${endpoint}/openai/deployments/${embeddingDeploymentName}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: { 'api-key': apiKey },
      })
      
      const response = await embeddingClientInstance.embeddings.create({
        model: embeddingDeploymentName,
        input: inputs,
      })
      return response
    } catch (error) {
      console.error('Azure OpenAI Embedding API Error:', error)
      throw new Error(`Embedding API error: ${error.message}`)
    }
  },
}

export default getClient

