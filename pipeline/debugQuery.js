#!/usr/bin/env node

/**
 * Debug script to test each step of the query process
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '../backend/.env')

try {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const equalIndex = trimmed.indexOf('=')
      const key = trimmed.substring(0, equalIndex).trim()
      let value = trimmed.substring(equalIndex + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value) {
        process.env[key] = value
      }
    }
  })
  console.log('✅ Loaded environment variables')
} catch (error) {
  console.warn('⚠️ Could not load .env file:', error.message)
}

import { embeddingClient } from '../backend/lib/azureOpenAIClient.js'
import { searchClient } from '../backend/lib/azureSearchClient.js'
import productRetrievalService from '../backend/services/productRetrievalService.js'
import ragRetrievalService from '../backend/services/ragRetrievalService.js'

async function debugQuery(sku, question) {
  console.log('\n🔍 DEBUGGING QUERY PROCESS\n')
  console.log('='.repeat(70))
  console.log(`SKU: ${sku}`)
  console.log(`Question: ${question}`)
  console.log('='.repeat(70))
  
  // Step 1: Test embedding generation
  console.log('\n📝 Step 1: Testing question embedding generation...')
  try {
    const embedding = await ragRetrievalService.generateQuestionEmbedding(question)
    console.log(`✅ Embedding generated: ${embedding.length} dimensions`)
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)
  } catch (error) {
    console.error(`❌ Error generating embedding:`, error.message)
    console.error(error.stack)
    return
  }
  
  // Step 2: Test RAG retrieval
  console.log('\n🔍 Step 2: Testing RAG chunk retrieval...')
  try {
    const chunks = await ragRetrievalService.retrieveRelevantChunks({
      sku,
      question,
      limit: 5,
    })
    console.log(`✅ Retrieved ${chunks.length} chunks`)
    if (chunks.length > 0) {
      chunks.forEach((chunk, idx) => {
        console.log(`\n   Chunk ${idx + 1}:`)
        console.log(`   - Section: ${chunk.section_title}`)
        console.log(`   - SKU: ${chunk.sku}`)
        console.log(`   - Body preview: ${chunk.section_body.substring(0, 100)}...`)
      })
    } else {
      console.log(`⚠️  No chunks found! This could be why the query fails.`)
      console.log(`   Possible reasons:`)
      console.log(`   - Product SKU ${sku} not yet indexed (only ~3,500/101,176 chunks indexed)`)
      console.log(`   - Azure AI Search query failed`)
      console.log(`   - Filter syntax issue`)
    }
  } catch (error) {
    console.error(`❌ Error retrieving chunks:`, error.message)
    console.error(error.stack)
  }
  
  // Step 3: Test product record retrieval
  console.log('\n📦 Step 3: Testing product record retrieval...')
  try {
    const product = await productRetrievalService.getProductRecord(sku)
    if (product) {
      console.log(`✅ Product found:`)
      console.log(`   - SKU: ${product.sku}`)
      console.log(`   - Name: ${product.name}`)
      console.log(`   - Brand: ${product.brand}`)
      console.log(`   - Category: ${product.category}`)
    } else {
      console.log(`⚠️  Product record not found for SKU ${sku}`)
      console.log(`   Product data might not be stored yet.`)
    }
  } catch (error) {
    console.error(`❌ Error retrieving product:`, error.message)
    console.error(error.stack)
  }
  
  // Step 4: Test Azure AI Search directly
  console.log('\n🔎 Step 4: Testing Azure AI Search directly...')
  try {
    const embedding = await ragRetrievalService.generateQuestionEmbedding(question)
    const filter = sku ? `sku eq '${sku}'` : null
    
    console.log(`   Filter: ${filter || '(none)'}`)
    const results = await searchClient.search('', {
      vectorSearchOptions: {
        queries: [
          {
            kind: 'vector',
            vector: embedding,
            kNearestNeighborsCount: 5,
            fields: 'embedding_vector',
          },
        ],
      },
      filter,
      top: 5,
    })
    
    console.log(`✅ Search returned ${results.length} documents`)
    if (results.length > 0) {
      console.log(`   Sample document:`)
      console.log(`   - SKU: ${results[0].sku}`)
      console.log(`   - Section: ${results[0].section_title}`)
      console.log(`   - Has embedding: ${!!results[0].embedding_vector}`)
    } else {
      console.log(`⚠️  No documents returned from Azure AI Search`)
      console.log(`   Try without SKU filter to see if any documents exist:`)
      const allResults = await searchClient.search('', {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: embedding,
              kNearestNeighborsCount: 5,
              fields: 'embedding_vector',
            },
          ],
        },
        top: 5,
      })
      console.log(`   Without filter: ${allResults.length} documents found`)
      if (allResults.length > 0) {
        console.log(`   Sample SKUs in index: ${allResults.slice(0, 3).map(r => r.sku).join(', ')}`)
      }
    }
  } catch (error) {
    console.error(`❌ Error in Azure AI Search:`, error.message)
    console.error(error.stack)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ Debug complete!')
  console.log('='.repeat(70))
}

const sku = process.argv[2] || '237383'
const question = process.argv[3] || 'What are the key features?'

debugQuery(sku, question)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })

