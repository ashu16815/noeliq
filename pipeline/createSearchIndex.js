#!/usr/bin/env node

/**
 * Create Azure AI Search index
 * Usage: node pipeline/createSearchIndex.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SearchIndexClient, AzureKeyCredential } from '@azure/search-documents'

// Load environment variables
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
  console.error('❌ Could not load .env file:', error.message)
  process.exit(1)
}

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
      console.log(`⚠️  Index '${indexName}' already exists. Delete it first if you want to recreate it.`)
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

