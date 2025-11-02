#!/usr/bin/env node

/**
 * Incremental update script - processes only changed/new SKUs
 * Usage: node pipeline/runIncrementalUpdate.js [sku1] [sku2] ...
 */

import chunkingService from '../backend/services/chunkingService.js'
import embeddingService from '../backend/services/embeddingService.js'
import indexingService from '../backend/services/indexingService.js'
import productRetrievalService from '../backend/services/productRetrievalService.js'
import dbClient from '../backend/lib/dbClient.js'

async function runIncrementalUpdate(skus) {
  console.log(`Starting incremental update for ${skus.length} SKU(s)...`)

  try {
    const allChunks = []

    // Step 1: Retrieve and chunk products
    for (const sku of skus) {
      console.log(`Processing SKU: ${sku}`)
      
      // TODO: Retrieve product from parsed JSON storage
      const product = await productRetrievalService.getProductRecord(sku)
      
      if (!product) {
        console.warn(`Product not found for SKU: ${sku}`)
        continue
      }

      // Chunk the product
      const chunks = chunkingService.chunkProduct(product)
      allChunks.push(...chunks)
    }

    if (allChunks.length === 0) {
      console.log('No chunks to process')
      return { chunksProcessed: 0 }
    }

    // Step 2: Delete old chunks for these SKUs
    for (const sku of skus) {
      await indexingService.deleteChunksForSKU(sku)
    }

    // Step 3: Generate embeddings
    console.log('Generating embeddings...')
    const batchSize = 10
    const chunksWithEmbeddings = []
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize)
      const embeddedBatch = await embeddingService.generateEmbeddings(batch)
      chunksWithEmbeddings.push(...embeddedBatch)
    }

    // Step 4: Index new chunks
    console.log('Indexing chunks...')
    await indexingService.indexChunks(chunksWithEmbeddings)

    // Step 5: Update sync status
    for (const sku of skus) {
      await dbClient.updateSyncStatus([sku], [])
    }

    console.log('Incremental update complete!')
    return {
      skusProcessed: skus.length,
      chunksGenerated: allChunks.length,
      chunksIndexed: chunksWithEmbeddings.length,
    }
  } catch (error) {
    console.error('Error during incremental update:', error)
    throw error
  }
}

// CLI execution
const skus = process.argv.slice(2)

if (skus.length === 0) {
  console.error('Error: Please provide SKU(s) to update')
  console.error('Usage: node pipeline/runIncrementalUpdate.js SKU1 SKU2 ...')
  process.exit(1)
}

runIncrementalUpdate(skus)
  .then((result) => {
    console.log('Result:', result)
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

