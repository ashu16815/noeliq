#!/usr/bin/env node

/**
 * Full reindex script - processes all products from scratch
 * Usage: node pipeline/runFullReindex.js [path-to-xml-file]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables before importing services
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '../backend/.env')

// Manually load .env file
try {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const equalIndex = trimmed.indexOf('=')
      const key = trimmed.substring(0, equalIndex).trim()
      let value = trimmed.substring(equalIndex + 1).trim()
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value) {
        process.env[key] = value
      }
    }
  })
  console.log('✅ Loaded environment variables from .env')
} catch (error) {
  console.warn('⚠️ Could not load .env file:', error.message)
  console.warn('Please ensure backend/.env exists with Azure credentials')
}

// Now import services (they will use the env vars)
import xmlParserService from '../backend/services/xmlParserService.js'
import chunkingService from '../backend/services/chunkingService.js'
import embeddingService from '../backend/services/embeddingService.js'
import indexingService from '../backend/services/indexingService.js'

async function runFullReindex(xmlFilePath) {
  console.log('Starting full reindex...')

  try {
    // Step 1: Parse XML
    console.log('Step 1: Parsing XML...')
    const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8')
    const products = await xmlParserService.parseXML(xmlContent)
    console.log(`Parsed ${products.length} products`)

    // Step 2: Chunk products
    console.log('Step 2: Chunking products...')
    const allChunks = []
    for (const product of products) {
      const chunks = chunkingService.chunkProduct(product)
      allChunks.push(...chunks)
    }
    console.log(`Generated ${allChunks.length} chunks`)

    // Step 3: Generate embeddings and index in batches
    console.log('Step 3: Generating embeddings and indexing to Azure AI Search...')
    // Process in batches to avoid API limits and index incrementally
    const embeddingBatchSize = 10
    const indexingBatchSize = 100 // Upload to Azure Search in larger batches
    const chunksWithEmbeddings = []
    let indexedCount = 0
    
    for (let i = 0; i < allChunks.length; i += embeddingBatchSize) {
      const batch = allChunks.slice(i, i + embeddingBatchSize)
      
      // Retry with exponential backoff on timeout
      let embeddedBatch
      try {
        embeddedBatch = await embeddingService.generateEmbeddings(batch, 5) // 5 retries
      } catch (error) {
        console.error(`❌ Failed to embed batch ${i}-${i + embeddingBatchSize} after retries:`, error.message)
        console.log(`⏭️  Skipping this batch and continuing...`)
        continue // Skip this batch and continue
      }
      
      chunksWithEmbeddings.push(...embeddedBatch)
      
      // Index in batches to Azure Search as we go
      if (chunksWithEmbeddings.length >= indexingBatchSize || i + embeddingBatchSize >= allChunks.length) {
        const batchToIndex = chunksWithEmbeddings.splice(0, indexingBatchSize)
        try {
          await indexingService.indexChunks(batchToIndex)
          indexedCount += batchToIndex.length
          console.log(`✅ Indexed ${indexedCount}/${allChunks.length} chunks to Azure AI Search`)
        } catch (error) {
          console.error(`❌ Error indexing batch: ${error.message}`)
          // Continue with next batch even if one fails
        }
      }
      
      console.log(`Processed ${Math.min(i + embeddingBatchSize, allChunks.length)}/${allChunks.length} chunks (embedded)`)
    }
    
    // Index any remaining chunks
    if (chunksWithEmbeddings.length > 0) {
      try {
        await indexingService.indexChunks(chunksWithEmbeddings)
        indexedCount += chunksWithEmbeddings.length
        console.log(`✅ Indexed final ${chunksWithEmbeddings.length} chunks`)
      } catch (error) {
        console.error(`❌ Error indexing final batch: ${error.message}`)
      }
    }

    console.log('Full reindex complete!')
    return {
      productsProcessed: products.length,
      chunksGenerated: allChunks.length,
      chunksIndexed: chunksWithEmbeddings.length,
    }
  } catch (error) {
    console.error('Error during full reindex:', error)
    throw error
  }
}

// CLI execution
const xmlPath = process.argv[2] || path.join(__dirname, '../data/sample-catalog.xml')

if (!fs.existsSync(xmlPath)) {
  console.error(`Error: XML file not found at ${xmlPath}`)
  process.exit(1)
}

runFullReindex(xmlPath)
  .then((result) => {
    console.log('Result:', result)
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

