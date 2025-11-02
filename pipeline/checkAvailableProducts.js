#!/usr/bin/env node

/**
 * Check which products are available in Azure AI Search
 * Usage: node pipeline/checkAvailableProducts.js [search-term]
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
  console.warn('⚠️ Could not load .env file')
}

import { searchClient } from '../backend/lib/azureSearchClient.js'

async function checkAvailableProducts(searchTerm = '') {
  console.log('\n🔍 Checking Available Products in Azure AI Search\n')
  console.log('='.repeat(60))

  try {
    // Search for product overview chunks (these have the product names)
    const results = await searchClient.search(searchTerm || '*', {
      filter: searchTerm ? undefined : undefined, // No filter, get any products
      top: 50, // Get up to 50 products
      select: ['sku', 'section_title', 'section_body'], // Only get these fields
    })

    console.log(`\n✅ Found ${results.length} chunks\n`)

    // Group by SKU
    const productsBySku = {}
    
    for (const chunk of results) {
      const sku = chunk.sku
      if (!sku) continue

      if (!productsBySku[sku]) {
        productsBySku[sku] = {
          sku,
          name: null,
          category: null,
          chunks: [],
        }
      }

      productsBySku[sku].chunks.push({
        title: chunk.section_title,
        body: chunk.section_body?.substring(0, 100) + '...',
      })

      // Try to extract product name and category from Product Overview chunks
      if (chunk.section_title === 'Product Overview' || chunk.section_title?.includes('Product')) {
        const body = chunk.section_body || ''
        const nameMatch = body.match(/Product[:\s]+([^\n(]+?)(?:\s*\(SKU:|$)/i)
        if (nameMatch && nameMatch[1]) {
          productsBySku[sku].name = nameMatch[1].trim()
        }
        const categoryMatch = body.match(/Category[:\s]+([^\n]+)/i)
        if (categoryMatch && categoryMatch[1]) {
          productsBySku[sku].category = categoryMatch[1].trim()
        }
      }
    }

    const uniqueProducts = Object.values(productsBySku)
    
    // Separate products with Product Overview (best for testing)
    const productsWithOverview = uniqueProducts.filter(p => 
      p.chunks.some(c => c.title === 'Product Overview')
    )
    
    console.log(`\n📦 Products Found: ${uniqueProducts.length} total`)
    console.log(`   ✅ With Product Overview: ${productsWithOverview.length} (best for testing)`)
    console.log(`   ⚠️  Without Product Overview: ${uniqueProducts.length - productsWithOverview.length}`)
    console.log('\n' + '='.repeat(60))

    // Show products WITH Product Overview first (best for testing)
    console.log('\n🎯 BEST PRODUCTS TO TEST (Have Product Overview):\n')
    const displayProducts = productsWithOverview.slice(0, 15)
    
    displayProducts.forEach((product, idx) => {
      console.log(`\n${idx + 1}. SKU: ${product.sku}`)
      console.log(`   Product: ${product.name || 'Unknown'}`)
      if (product.category) console.log(`   Category: ${product.category}`)
      console.log(`   Chunks: ${product.chunks.length} (${product.chunks.map(c => c.title).join(', ')})`)
      console.log(`   `)
      console.log(`   💡 Test queries:`)
      if (product.name && product.name !== 'Unknown') {
        const firstWords = product.name.split(' ').slice(0, 3).join(' ')
        console.log(`      - "What is ${firstWords}?"`)
        console.log(`      - "Tell me about ${firstWords}"`)
      }
      console.log(`      - "What are the features?" (with SKU ${product.sku})`)
      console.log(`      - "Tell me about SKU ${product.sku}"`)
    })

    if (productsWithOverview.length > 15) {
      console.log(`\n... and ${productsWithOverview.length - 15} more products with Product Overview`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n✅ Check complete!')
    
    return uniqueProducts
  } catch (error) {
    console.error('❌ Error checking products:', error)
    throw error
  }
}

// CLI execution
const searchTerm = process.argv[2] || ''

checkAvailableProducts(searchTerm)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

