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
    
    const startTime = Date.now()
    const logId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    
    try {
      // Extract maxTokens and temperature - GPT-5 doesn't support custom temperature
      const { maxTokens, temperature, ...restOptions } = options
      const maxCompletionTokens = maxTokens || 1000
      
      // Log chat request
      const messageCount = messages.length
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content?.substring(0, 100) || ''
      console.log(`[Azure OpenAI] [${logId}] 💬 CHAT REQUEST`)
      console.log(`[Azure OpenAI] [${logId}]   Model: ${deploymentName}`)
      console.log(`[Azure OpenAI] [${logId}]   Messages: ${messageCount}`)
      console.log(`[Azure OpenAI] [${logId}]   Last user message: "${lastUserMessage}${lastUserMessage.length >= 100 ? '...' : ''}"`)
      console.log(`[Azure OpenAI] [${logId}]   Max tokens: ${maxCompletionTokens}`)
      
      // GPT-5 models use max_completion_tokens instead of max_tokens
      // GPT-5 only supports temperature=1 (default), so don't pass it
      const response = await clientInstance.chat.completions.create({
        model: deploymentName,
        messages,
        max_completion_tokens: maxCompletionTokens, // GPT-5 uses max_completion_tokens
        ...restOptions, // Spread remaining options (without maxTokens or temperature)
      })
      
      const duration = Date.now() - startTime
      const answerText = response.choices[0]?.message?.content || ''
      const finishReason = response.choices[0]?.finish_reason || 'unknown'
      const usage = response.usage || {}
      
      // Log chat response
      console.log(`[Azure OpenAI] [${logId}] ✅ CHAT SUCCESS`)
      console.log(`[Azure OpenAI] [${logId}]   Response length: ${answerText.length} chars`)
      console.log(`[Azure OpenAI] [${logId}]   Finish reason: ${finishReason}`)
      if (usage.prompt_tokens || usage.completion_tokens || usage.total_tokens) {
        console.log(`[Azure OpenAI] [${logId}]   Tokens: prompt=${usage.prompt_tokens || 0}, completion=${usage.completion_tokens || 0}, total=${usage.total_tokens || 0}`)
      }
      console.log(`[Azure OpenAI] [${logId}]   Duration: ${duration}ms`)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Azure OpenAI] [${logId}] ❌ CHAT ERROR`)
      console.error(`[Azure OpenAI] [${logId}]   Error: ${error.message}`)
      console.error(`[Azure OpenAI] [${logId}]   Duration: ${duration}ms`)
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
    
    const startTime = Date.now()
    const logId = `embed_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    
    try {
      // Handle both string and array of strings
      const inputs = Array.isArray(input) ? input : [input]
      
      // Log embedding request
      console.log(`[Azure OpenAI] [${logId}] 🔢 EMBEDDING REQUEST`)
      console.log(`[Azure OpenAI] [${logId}]   Model: ${embeddingDeploymentName}`)
      console.log(`[Azure OpenAI] [${logId}]   Inputs: ${inputs.length}`)
      const previewText = typeof inputs[0] === 'string' ? inputs[0].substring(0, 80) : '[...]'
      console.log(`[Azure OpenAI] [${logId}]   Preview: "${previewText}${inputs[0]?.length > 80 ? '...' : ''}"`)
      
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
      
      const duration = Date.now() - startTime
      const usage = response.usage || {}
      const embeddingLength = response.data?.[0]?.embedding?.length || 0
      
      // Log embedding response
      console.log(`[Azure OpenAI] [${logId}] ✅ EMBEDDING SUCCESS`)
      console.log(`[Azure OpenAI] [${logId}]   Embeddings: ${response.data?.length || 0}`)
      console.log(`[Azure OpenAI] [${logId}]   Dimensions: ${embeddingLength}`)
      if (usage.prompt_tokens || usage.total_tokens) {
        console.log(`[Azure OpenAI] [${logId}]   Tokens: prompt=${usage.prompt_tokens || 0}, total=${usage.total_tokens || 0}`)
      }
      console.log(`[Azure OpenAI] [${logId}]   Duration: ${duration}ms`)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Azure OpenAI] [${logId}] ❌ EMBEDDING ERROR`)
      console.error(`[Azure OpenAI] [${logId}]   Error: ${error.message}`)
      console.error(`[Azure OpenAI] [${logId}]   Duration: ${duration}ms`)
      throw new Error(`Embedding API error: ${error.message}`)
    }
  },
}

export default getClient

