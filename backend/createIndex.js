import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SearchIndexClient, AzureKeyCredential } from '@azure/search-documents'
import dotenv from 'dotenv'

// Load .env
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const endpoint = process.env.AZURE_SEARCH_ENDPOINT
const apiKey = process.env.AZURE_SEARCH_API_KEY
const indexName = process.env.AZURE_SEARCH_INDEX_NAME

if (!endpoint || !apiKey || !indexName) {
  console.error('❌ Missing Azure Search configuration in .env')
  process.exit(1)
}

async function createIndex() {
  try {
    console.log(`Creating index '${indexName}' in Azure AI Search...`)
    
    const indexClient = new SearchIndexClient(endpoint, new AzureKeyCredential(apiKey))
    
    // Load index definition
    const indexDefPath = path.join(__dirname, '../infra/azure-search-index-definition.json')
    const indexDefinition = JSON.parse(fs.readFileSync(indexDefPath, 'utf-8'))
    
    // Check if index exists
    try {
      await indexClient.getIndex(indexName)
      console.log(`⚠️  Index '${indexName}' already exists.`)
      console.log(`✅ Index is ready to use!`)
      return
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error
      }
      // Index doesn't exist, continue to create
    }
    
    // Create the index
    await indexClient.createIndex(indexDefinition)
    console.log(`✅ Successfully created index '${indexName}'`)
    
  } catch (error) {
    console.error('❌ Error creating index:', error.message)
    if (error.details?.error?.message) {
      console.error('Details:', error.details.error.message)
    }
    process.exit(1)
  }
}

createIndex()

