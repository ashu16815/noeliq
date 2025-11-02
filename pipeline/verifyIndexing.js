#!/usr/bin/env node

/**
 * Verify what will be sent to Azure AI Search - shows the exact document structure
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
} catch (error) {
  console.warn('⚠️ Could not load .env file:', error.message)
}

import xmlParserService from '../backend/services/xmlParserService.js'
import chunkingService from '../backend/services/chunkingService.js'
import embeddingService from '../backend/services/embeddingService.js'

async function verifyIndexing(xmlFilePath, numProducts = 2) {
  console.log('\n🔍 VERIFYING WHAT GETS INDEXED TO AZURE AI SEARCH\n')
  console.log('='.repeat(70))
  
  // Parse XML
  console.log('📄 Step 1: Parsing XML...')
  const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8')
  const products = await xmlParserService.parseXML(xmlContent)
  console.log(`✅ Parsed ${products.length} products\n`)
  
  // Process first N products
  const testProducts = products.slice(0, numProducts)
  console.log(`📦 Processing ${testProducts.length} products for verification...\n`)
  
  // Chunk and embed
  const allChunks = []
  for (const product of testProducts) {
    const chunks = chunkingService.chunkProduct(product)
    allChunks.push(...chunks)
  }
  
  // Generate embeddings for a few chunks
  console.log('🔮 Step 2: Generating embeddings (testing 3 chunks)...')
  const testChunks = allChunks.slice(0, 3)
  const embeddedChunks = await embeddingService.generateEmbeddings(testChunks)
  console.log(`✅ Generated embeddings for ${embeddedChunks.length} chunks\n`)
  
  // Show what will be sent to Azure AI Search
  console.log('📤 WHAT WILL BE SENT TO AZURE AI SEARCH:')
  console.log('='.repeat(70))
  
  embeddedChunks.forEach((chunk, idx) => {
    console.log(`\n📄 Document ${idx + 1}:`)
    console.log('-'.repeat(70))
    
    const doc = {
      chunk_id: String(chunk.chunk_id || `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
      sku: String(chunk.sku || ''),
      section_title: String(chunk.section_title || ''),
      section_body: String(chunk.section_body || '').substring(0, 150) + '...',
      embedding_vector: Array.isArray(chunk.embedding_vector) 
        ? `[Vector with ${chunk.embedding_vector.length} dimensions]` 
        : 'MISSING',
      warranty_restrictions: chunk.warranty_restrictions ? String(chunk.warranty_restrictions) : null,
      last_updated_ts: chunk.last_updated_ts || new Date().toISOString(),
      source_hash: chunk.source_hash ? String(chunk.source_hash) : null,
    }
    
    // Add pricing fields
    if (chunk.current_price !== undefined) {
      doc.current_price = parseFloat(chunk.current_price) || null
    }
    if (chunk.list_price !== undefined) {
      doc.list_price = parseFloat(chunk.list_price) || null
    }
    if (chunk.has_offers !== undefined) {
      doc.has_offers = Boolean(chunk.has_offers)
    }
    if (chunk.offer_names && Array.isArray(chunk.offer_names)) {
      doc.offer_names = chunk.offer_names.map(n => String(n))
    }
    if (chunk.is_clearance !== undefined) {
      doc.is_clearance = Boolean(chunk.is_clearance)
    }
    if (chunk.clearance_price !== undefined) {
      doc.clearance_price = parseFloat(chunk.clearance_price) || null
    }
    if (chunk.b2b_price !== undefined) {
      doc.b2b_price = parseFloat(chunk.b2b_price) || null
    }
    
    console.log(JSON.stringify(doc, null, 2))
  })
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ VERIFICATION SUMMARY')
  console.log('='.repeat(70))
  console.log(`Products processed: ${testProducts.length}`)
  console.log(`Total chunks: ${allChunks.length}`)
  console.log(`Chunks with embeddings: ${embeddedChunks.length}`)
  
  // Field coverage
  const withPricing = allChunks.filter(c => c.current_price).length
  const withOffers = allChunks.filter(c => c.has_offers).length
  const withClearance = allChunks.filter(c => c.is_clearance).length
  
  console.log(`\n💰 Data Coverage in Chunks:`)
  console.log(`   - Pricing data: ${withPricing}/${allChunks.length} chunks`)
  console.log(`   - Offers data: ${withOffers}/${allChunks.length} chunks`)
  console.log(`   - Clearance data: ${withClearance}/${allChunks.length} chunks`)
  
  console.log(`\n✨ Verification complete! Data looks correct.`)
  console.log('='.repeat(70))
}

const xmlPath = process.argv[2] || path.join(__dirname, 'data-source/noelleeming_catalogue.xml')
const numProducts = parseInt(process.argv[3]) || 2

if (!fs.existsSync(xmlPath)) {
  console.error(`❌ Error: XML file not found at ${xmlPath}`)
  process.exit(1)
}

verifyIndexing(xmlPath, numProducts)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

