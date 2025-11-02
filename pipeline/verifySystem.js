import { searchClient } from '../backend/lib/azureSearchClient.js'
import productRetrievalService from '../backend/services/productRetrievalService.js'
import ragRetrievalService from '../backend/services/ragRetrievalService.js'
import { embeddingClient } from '../backend/lib/azureOpenAIClient.js'
import dbClient from '../backend/lib/dbClient.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env manually
const envPath = path.join(__dirname, '../backend/.env')
try {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const equalIndex = trimmed.indexOf('=')
      const key = trimmed.substring(0, equalIndex).trim()
      let value = trimmed.substring(equalIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value) process.env[key] = value
    }
  })
} catch (e) {
  console.warn('⚠️  Could not load .env file')
}

const VERIFICATION_TESTS = {
  'Azure AI Search Index': async () => {
    try {
      const result = await searchClient.search('*', {
        top: 1000,
        includeTotalCount: true,
      })
      const totalCount = result.count || result.length || 0
      const uniqueSKUs = new Set()
      const sections = new Set()
      
      result.slice(0, 100).forEach(doc => {
        if (doc.sku) uniqueSKUs.add(doc.sku)
        if (doc.section_title) sections.add(doc.section_title)
      })
      
      return {
        status: totalCount > 0 ? '✅ PASS' : '❌ FAIL',
        details: {
          'Total Documents': totalCount.toLocaleString(),
          'Unique SKUs (sample)': uniqueSKUs.size,
          'Section Types': sections.size,
          'Sample Sections': Array.from(sections).slice(0, 5).join(', '),
        },
      }
    } catch (error) {
      return {
        status: '❌ FAIL',
        details: { Error: error.message },
      }
    }
  },

  'Vector Search': async () => {
    try {
      const testQuery = 'gaming laptop'
      const chunks = await ragRetrievalService.retrieveRelevantChunks({
        sku: null,
        question: testQuery,
        limit: 5,
      })
      
      return {
        status: chunks.length > 0 ? '✅ PASS' : '⚠️  WARN',
        details: {
          'Test Query': testQuery,
          'Chunks Retrieved': chunks.length,
          'Has Embeddings': chunks.every(c => c.section_body) ? 'Yes' : 'No',
        },
      }
    } catch (error) {
      return {
        status: '❌ FAIL',
        details: { Error: error.message },
      }
    }
  },

  'Embedding Generation': async () => {
    try {
      const testText = 'test embedding generation'
      const response = await embeddingClient.getEmbeddings([testText])
      
      return {
        status: response.data && response.data[0]?.embedding ? '✅ PASS' : '❌ FAIL',
        details: {
          'Embedding Dimensions': response.data?.[0]?.embedding?.length || 0,
          'Model': process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'Not set',
        },
      }
    } catch (error) {
      return {
        status: '❌ FAIL',
        details: { Error: error.message },
      }
    }
  },

  'Product Search': async () => {
    try {
      // Import dynamically to avoid circular dependencies
      const { default: productSearchService } = await import('../backend/services/productSearchService.js')
      const results = await productSearchService.searchProducts('smart watch', 5)
      
      return {
        status: results.length > 0 ? '✅ PASS' : '⚠️  WARN',
        details: {
          'Query': 'smart watch',
          'Products Found': results.length,
          'Sample Products': results.slice(0, 3).map(p => `${p.name} (SKU: ${p.sku})`).join(', '),
        },
      }
    } catch (error) {
      return {
        status: '❌ FAIL',
        details: { Error: error.message },
      }
    }
  },

  'Data Files': async () => {
    const dataDir = path.join(__dirname, '../backend/data')
    const files = {
      'Stores': 'stores.json',
      'Parsed Products': 'parsed-products.json',
      'Sync Status': 'sync-status.json',
      'Logs': 'logs.json',
    }
    
    const results = {}
    for (const [name, filename] of Object.entries(files)) {
      const filePath = path.join(dataDir, filename)
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          if (name === 'Stores') {
            results[name] = `✅ ${Array.isArray(data.stores) ? data.stores.length : 0} stores`
          } else if (name === 'Parsed Products') {
            results[name] = `✅ ${Array.isArray(data.products) ? data.products.length : 0} products`
          } else {
            results[name] = '✅ Exists'
          }
        } catch (e) {
          results[name] = '⚠️  Invalid JSON'
        }
      } else {
        results[name] = '⚠️  Missing'
      }
    }
    
    return {
      status: Object.values(results).every(r => r.startsWith('✅')) ? '✅ PASS' : '⚠️  WARN',
      details: results,
    }
  },

  'Environment Configuration': async () => {
    const required = {
      'Azure OpenAI Endpoint': process.env.AZURE_OPENAI_ENDPOINT,
      'Azure OpenAI API Key': process.env.AZURE_OPENAI_API_KEY ? '✅ Set' : '❌ Missing',
      'Chat Deployment': process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      'Embedding Deployment': process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
      'Search Endpoint': process.env.AZURE_SEARCH_ENDPOINT,
      'Search API Key': process.env.AZURE_SEARCH_API_KEY ? '✅ Set' : '❌ Missing',
      'Index Name': process.env.AZURE_SEARCH_INDEX_NAME,
      'RAG Chunk Limit': process.env.RAG_CHUNK_LIMIT || '5 (default)',
    }
    
    const allSet = Object.values(required).every(v => v && !v.includes('Missing'))
    
    return {
      status: allSet ? '✅ PASS' : '❌ FAIL',
      details: required,
    }
  },
}

async function runVerification() {
  console.log('\n🔍 NOELIQ SYSTEM VERIFICATION')
  console.log('='.repeat(60))
  console.log('')
  
  const results = {}
  
  for (const [testName, testFn] of Object.entries(VERIFICATION_TESTS)) {
    try {
      console.log(`Testing: ${testName}...`)
      results[testName] = await testFn()
    } catch (error) {
      results[testName] = {
        status: '❌ FAIL',
        details: { Error: error.message },
      }
    }
  }
  
  console.log('\n📊 VERIFICATION RESULTS')
  console.log('='.repeat(60))
  console.log('')
  
  let allPassed = true
  for (const [testName, result] of Object.entries(results)) {
    console.log(`${result.status} ${testName}`)
    for (const [key, value] of Object.entries(result.details)) {
      console.log(`   ${key}: ${value}`)
    }
    console.log('')
    
    if (!result.status.includes('✅')) {
      allPassed = false
    }
  }
  
  console.log('='.repeat(60))
  if (allPassed) {
    console.log('✅ ALL CHECKS PASSED - System is ready!')
  } else {
    console.log('⚠️  Some checks failed - review details above')
  }
  console.log('')
  
  return results
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runVerification()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Verification failed:', error)
      process.exit(1)
    })
}

export default runVerification
