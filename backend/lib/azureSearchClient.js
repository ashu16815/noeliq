import { SearchClient, AzureKeyCredential } from '@azure/search-documents'

// Function to get config (allows late loading of env vars)
const getConfig = () => {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT
  const apiKey = process.env.AZURE_SEARCH_API_KEY
  const indexName = process.env.AZURE_SEARCH_INDEX_NAME
  
  return { endpoint, apiKey, indexName }
}

// Initialize client lazily
let client = null
const getClient = () => {
  if (!client) {
    const { endpoint, apiKey, indexName } = getConfig()
    if (!endpoint || !apiKey || !indexName) {
      console.warn('Warning: Azure AI Search configuration incomplete. Some features may not work.')
      return null
    }
    client = new SearchClient(endpoint, indexName, new AzureKeyCredential(apiKey))
  }
  return client
}

export const searchClient = {
  search: async (searchText, options = {}) => {
    const clientInstance = getClient()
    if (!clientInstance) {
      throw new Error('Azure AI Search client not configured')
    }

    const startTime = Date.now()
    const logId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    
    try {
      const searchOptions = {
        vectorSearchOptions: options.vectorSearchOptions,
        filter: options.filter,
        top: options.top || 5,
        ...options,
      }

      // Log search request
      console.log(`[Azure AI Search] [${logId}] 🔍 SEARCH REQUEST`)
      console.log(`[Azure AI Search] [${logId}]   Query: "${searchText?.substring(0, 100)}${searchText?.length > 100 ? '...' : ''}"`)
      console.log(`[Azure AI Search] [${logId}]   Options: top=${searchOptions.top}, filter=${searchOptions.filter ? 'yes' : 'no'}, vector=${searchOptions.vectorSearchOptions ? 'yes' : 'no'}`)

      const results = await clientInstance.search(searchText, searchOptions)
      const documents = []
      let resultCount = 0
      for await (const result of results.results) {
        documents.push(result.document)
        resultCount++
      }
      
      const duration = Date.now() - startTime
      
      // Log search response
      console.log(`[Azure AI Search] [${logId}] ✅ SEARCH SUCCESS`)
      console.log(`[Azure AI Search] [${logId}]   Results: ${resultCount} documents`)
      console.log(`[Azure AI Search] [${logId}]   Duration: ${duration}ms`)
      
      return documents
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Azure AI Search] [${logId}] ❌ SEARCH ERROR`)
      console.error(`[Azure AI Search] [${logId}]   Error: ${error.message}`)
      console.error(`[Azure AI Search] [${logId}]   Duration: ${duration}ms`)
      throw new Error(`Search API error: ${error.message}`)
    }
  },

  uploadDocuments: async (documents) => {
    const clientInstance = getClient()
    if (!clientInstance) {
      throw new Error('Azure AI Search client not configured')
    }

    const startTime = Date.now()
    const logId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    try {
      console.log(`[Azure AI Search] [${logId}] 📤 UPLOAD REQUEST`)
      console.log(`[Azure AI Search] [${logId}]   Documents: ${documents.length}`)
      
      const result = await clientInstance.uploadDocuments(documents)
      const duration = Date.now() - startTime
      
      console.log(`[Azure AI Search] [${logId}] ✅ UPLOAD SUCCESS`)
      console.log(`[Azure AI Search] [${logId}]   Uploaded: ${documents.length} documents`)
      console.log(`[Azure AI Search] [${logId}]   Duration: ${duration}ms`)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Azure AI Search] [${logId}] ❌ UPLOAD ERROR`)
      console.error(`[Azure AI Search] [${logId}]   Error: ${error.message}`)
      console.error(`[Azure AI Search] [${logId}]   Duration: ${duration}ms`)
      throw new Error(`Search upload error: ${error.message}`)
    }
  },

  deleteDocuments: async (documents) => {
    const clientInstance = getClient()
    if (!clientInstance) {
      throw new Error('Azure AI Search client not configured')
    }

    try {
      const result = await clientInstance.deleteDocuments(documents)
      return result
    } catch (error) {
      console.error('Azure AI Search Delete Error:', error)
      throw new Error(`Search delete error: ${error.message}`)
    }
  },
}

export default getClient

