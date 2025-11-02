#!/usr/bin/env node

/**
 * Inspect a specific product by SKU to see all extracted data
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

async function inspectProduct(xmlFilePath, skuToFind = null) {
  console.log('\n🔍 PRODUCT INSPECTION\n')
  console.log('='.repeat(60))
  
  // Parse XML
  console.log('📄 Parsing XML...')
  const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8')
  const products = await xmlParserService.parseXML(xmlContent)
  console.log(`✅ Found ${products.length} products\n`)
  
  // Find product
  let product
  if (skuToFind) {
    product = products.find(p => String(p.sku) === String(skuToFind))
    if (!product) {
      console.log(`❌ Product with SKU ${skuToFind} not found`)
      console.log(`Showing first product instead:\n`)
      product = products[0]
    } else {
      console.log(`✅ Found product with SKU ${skuToFind}\n`)
    }
  } else {
    product = products[0]
    console.log(`Showing first product (SKU: ${product.sku}):\n`)
  }
  
  // Display full product data
  console.log('📦 FULL PRODUCT DATA:')
  console.log('-'.repeat(60))
  console.log(JSON.stringify(product, null, 2))
  
  // Display chunks
  console.log('\n✂️  CHUNKS GENERATED:')
  console.log('-'.repeat(60))
  const chunks = chunkingService.chunkProduct(product)
  console.log(`Total chunks: ${chunks.length}\n`)
  
  chunks.forEach((chunk, idx) => {
    console.log(`\nChunk ${idx + 1}: ${chunk.section_title}`)
    console.log(`  SKU: ${chunk.sku}`)
    console.log(`  Body: ${chunk.section_body.substring(0, 200)}${chunk.section_body.length > 200 ? '...' : ''}`)
    if (chunk.current_price) console.log(`  Current Price: $${chunk.current_price}`)
    if (chunk.list_price) console.log(`  List Price: $${chunk.list_price}`)
    if (chunk.has_offers) console.log(`  Has Offers: Yes (${chunk.offer_names?.length || 0} offers)`)
    if (chunk.is_clearance) console.log(`  Clearance: Yes ($${chunk.clearance_price})`)
    if (chunk.b2b_price) console.log(`  B2B Price: $${chunk.b2b_price}`)
  })
  
  console.log('\n' + '='.repeat(60))
}

const xmlPath = process.argv[2] || path.join(__dirname, 'data-source/noelleeming_catalogue.xml')
const sku = process.argv[3] || null

if (!fs.existsSync(xmlPath)) {
  console.error(`❌ Error: XML file not found at ${xmlPath}`)
  process.exit(1)
}

inspectProduct(xmlPath, sku)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

