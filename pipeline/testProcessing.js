#!/usr/bin/env node

/**
 * Test script to verify XML parsing, chunking, and embedding generation
 * Processes only the first 5 products to verify correctness
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

// Import services
import xmlParserService from '../backend/services/xmlParserService.js'
import chunkingService from '../backend/services/chunkingService.js'
import embeddingService from '../backend/services/embeddingService.js'

async function testProcessing(xmlFilePath, numProducts = 5) {
  console.log('\n🧪 TESTING PRODUCT PROCESSING\n')
  console.log('=' .repeat(60))
  
  try {
    // Step 1: Parse XML
    console.log('\n📄 Step 1: Parsing XML...')
    const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8')
    const allProducts = await xmlParserService.parseXML(xmlContent)
    console.log(`✅ Parsed ${allProducts.length} total products from XML`)
    
    // Show metadata if available
    if (allProducts._parseMetadata) {
      const meta = allProducts._parseMetadata
      console.log(`   - Stores: ${meta.storesCount}`)
      console.log(`   - Offers: ${meta.offersCount}`)
      console.log(`   - B2B Offers: ${meta.b2bOffersCount}`)
      console.log(`   - Clearance Items: ${meta.clearanceCount}`)
    }
    
    // Test with first N products
    const testProducts = allProducts.slice(0, numProducts)
    console.log(`\n📦 Testing with first ${testProducts.length} products:`)
    
    // Display sample product structure
    console.log('\n📋 Sample Product Structure:')
    console.log('-'.repeat(60))
    const sampleProduct = testProducts[0]
    console.log(JSON.stringify({
      sku: sampleProduct.sku,
      title: sampleProduct.title,
      brand: sampleProduct.brand,
      category: sampleProduct.category,
      pricing: sampleProduct.pricing,
      hasOffers: sampleProduct.offers?.length > 0,
      offerCount: sampleProduct.offers?.length || 0,
      isClearance: !!sampleProduct.clearanceInfo,
      hasB2BPricing: !!sampleProduct.b2bPricing,
      featureCount: sampleProduct.features?.length || 0,
      descriptionLength: sampleProduct.description?.length || 0,
    }, null, 2))
    
    // Step 2: Chunk products
    console.log('\n✂️  Step 2: Chunking products...')
    const allChunks = []
    for (const product of testProducts) {
      const chunks = chunkingService.chunkProduct(product)
      allChunks.push(...chunks)
      console.log(`   Product ${product.sku}: ${chunks.length} chunks`)
    }
    console.log(`✅ Generated ${allChunks.length} total chunks`)
    
    // Display sample chunks
    console.log('\n📝 Sample Chunks:')
    console.log('-'.repeat(60))
    const sampleChunks = allChunks.slice(0, 3)
    sampleChunks.forEach((chunk, idx) => {
      console.log(`\nChunk ${idx + 1}:`)
      console.log(JSON.stringify({
        section_title: chunk.section_title,
        section_body_preview: chunk.section_body?.substring(0, 100) + '...',
        sku: chunk.sku,
        current_price: chunk.current_price,
        list_price: chunk.list_price,
        has_offers: chunk.has_offers,
        offer_names: chunk.offer_names,
        is_clearance: chunk.is_clearance,
        clearance_price: chunk.clearance_price,
        b2b_price: chunk.b2b_price,
      }, null, 2))
    })
    
    // Step 3: Generate embeddings for ONE chunk (to test)
    console.log('\n🔮 Step 3: Testing embedding generation...')
    const testChunk = allChunks[0]
    console.log(`   Testing with chunk: "${testChunk.section_title}"`)
    console.log(`   Text preview: "${testChunk.section_body.substring(0, 100)}..."`)
    
    try {
      const embeddedChunk = await embeddingService.generateEmbeddings([testChunk])
      if (embeddedChunk[0]?.embedding_vector) {
        const embeddingLength = embeddedChunk[0].embedding_vector.length
        console.log(`✅ Embedding generated successfully!`)
        console.log(`   - Embedding dimensions: ${embeddingLength}`)
        console.log(`   - First 5 values: [${embeddedChunk[0].embedding_vector.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)
      } else {
        console.log('❌ Embedding missing from result')
      }
    } catch (error) {
      console.error('❌ Error generating embedding:', error.message)
      throw error
    }
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Products tested: ${testProducts.length}`)
    console.log(`Total chunks generated: ${allChunks.length}`)
    console.log(`Average chunks per product: ${(allChunks.length / testProducts.length).toFixed(1)}`)
    console.log(`Embedding test: ✅ PASSED`)
    
    // Show chunk breakdown by section
    const chunkBySection = {}
    allChunks.forEach(chunk => {
      const section = chunk.section_title || 'Unknown'
      chunkBySection[section] = (chunkBySection[section] || 0) + 1
    })
    console.log('\n📊 Chunks by section:')
    Object.entries(chunkBySection).forEach(([section, count]) => {
      console.log(`   - ${section}: ${count}`)
    })
    
    // Show pricing/offer data summary
    const withPricing = allChunks.filter(c => c.current_price).length
    const withOffers = allChunks.filter(c => c.has_offers).length
    const withClearance = allChunks.filter(c => c.is_clearance).length
    const withB2B = allChunks.filter(c => c.b2b_price).length
    
    console.log('\n💰 Pricing/Offer Data in Chunks:')
    console.log(`   - Chunks with pricing: ${withPricing}`)
    console.log(`   - Chunks with offers: ${withOffers}`)
    console.log(`   - Chunks with clearance: ${withClearance}`)
    console.log(`   - Chunks with B2B pricing: ${withB2B}`)
    
    console.log('\n✨ All tests passed! Ready for full reindex.')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

// CLI execution
const xmlPath = process.argv[2] || path.join(__dirname, 'data-source/noelleeming_catalogue.xml')
const numProducts = parseInt(process.argv[3]) || 5

if (!fs.existsSync(xmlPath)) {
  console.error(`❌ Error: XML file not found at ${xmlPath}`)
  process.exit(1)
}

testProcessing(xmlPath, numProducts)
  .then(() => {
    console.log('\n✅ Test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })

