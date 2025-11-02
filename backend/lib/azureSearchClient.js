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

    try {
      const searchOptions = {
        vectorSearchOptions: options.vectorSearchOptions,
        filter: options.filter,
        top: options.top || 5,
        ...options,
      }

      const results = await clientInstance.search(searchText, searchOptions)
      const documents = []
      for await (const result of results.results) {
        documents.push(result.document)
      }
      return documents
    } catch (error) {
      console.error('Azure AI Search Error:', error)
      throw new Error(`Search API error: ${error.message}`)
    }
  },

  uploadDocuments: async (documents) => {
    const clientInstance = getClient()
    if (!clientInstance) {
      throw new Error('Azure AI Search client not configured')
    }

    try {
      const result = await clientInstance.uploadDocuments(documents)
      console.log(`✅ Uploaded ${documents.length} documents to Azure AI Search`)
      return result
    } catch (error) {
      console.error('Azure AI Search Upload Error:', error)
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

