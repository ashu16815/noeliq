#!/usr/bin/env node
/**
 * Environment Variable Checker
 * 
 * Verifies that all required environment variables are set.
 * Run this before deployment to ensure nothing is missing.
 * 
 * Usage:
 *   node check-env.js
 *   node check-env.js --strict  (fail on missing optional vars)
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env file
dotenv.config({ path: join(__dirname, '.env') })

const strictMode = process.argv.includes('--strict')

// Required environment variables
const requiredVars = {
  // Azure OpenAI
  'AZURE_OPENAI_ENDPOINT': 'Azure OpenAI endpoint URL',
  'AZURE_OPENAI_API_KEY': 'Azure OpenAI API key',
  'AZURE_OPENAI_DEPLOYMENT_NAME': 'Azure OpenAI chat model deployment name',
  'AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME': 'Azure OpenAI embedding model deployment name',
  
  // Azure AI Search
  'AZURE_SEARCH_ENDPOINT': 'Azure AI Search endpoint URL',
  'AZURE_SEARCH_API_KEY': 'Azure AI Search API key',
  'AZURE_SEARCH_INDEX_NAME': 'Azure AI Search index name',
  
  // Server
  'PORT': 'Server port (default: 5000)',
  'NODE_ENV': 'Environment (development/production)',
  
  // Authentication
  'ADMIN_TOKEN': 'Admin authentication token',
  'STAFF_TOKEN': 'Staff authentication token',
}

// Optional environment variables (with defaults)
const optionalVars = {
  'RAG_CHUNK_LIMIT': 'Number of chunks to retrieve (default: 5)',
  'USE_OPTIMIZED_RAG': 'Use optimized RAG retrieval (default: false)',
  'USE_TURN_ORCHESTRATOR': 'Use turn orchestrator pipeline (default: false)',
  
  // Turn Orchestrator Advanced Config
  'AZURE_SEARCH_TOP': 'Azure Search top results (default: 24)',
  'MAX_CHUNKS_AFTER_DIVERSIFY': 'Max chunks after diversification (default: 10)',
  'MIN_CHUNK_SCORE': 'Minimum chunk score threshold (default: 0.55)',
  'K_SEMANTIC': 'Semantic search results (default: 12)',
  'K_LEXICAL': 'Lexical search results (default: 12)',
  'USE_SUMMARIZATION': 'Enable context summarization (default: true)',
  'SUMMARIZATION_MODEL': 'Summarization model (default: gpt-4o-mini)',
  'SUMMARIZATION_MAX_TOKENS': 'Max tokens for summarization (default: 900)',
  'MAIN_LLM_MODEL': 'Main LLM model (default: gpt-4o)',
  'MAIN_LLM_TEMPERATURE': 'Main LLM temperature (default: 0.3)',
  'INTENT_CLASSIFIER_USE_LLM': 'Use LLM for intent classification (default: true)',
  'INTENT_CLASSIFIER_MODEL': 'Intent classifier model (default: gpt-4o-mini)',
  'INTENT_CLASSIFIER_TEMPERATURE': 'Intent classifier temperature (default: 0.1)',
  'QUERY_REWRITER_MODEL': 'Query rewriter model (default: gpt-4o-mini)',
  'QUERY_REWRITER_TEMPERATURE': 'Query rewriter temperature (default: 0.3)',
  'QUERY_REWRITER_MAX_TOKENS': 'Query rewriter max tokens (default: 500)',
}

// Check variables
let missingRequired = []
let missingOptional = []
let presentVars = []

console.log('🔍 Checking environment variables...\n')

// Check required variables
for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName]
  if (!value || value.trim() === '') {
    missingRequired.push({ varName, description })
  } else {
    presentVars.push({ varName, description, value: maskValue(varName, value) })
  }
}

// Check optional variables
for (const [varName, description] of Object.entries(optionalVars)) {
  const value = process.env[varName]
  if (!value || value.trim() === '') {
    missingOptional.push({ varName, description })
  } else {
    presentVars.push({ varName, description, value: maskValue(varName, value) })
  }
}

// Display results
console.log('✅ Set Variables:\n')
if (presentVars.length > 0) {
  presentVars.forEach(({ varName, description, value }) => {
    console.log(`  ✓ ${varName.padEnd(35)} ${description}`)
    console.log(`    Value: ${value}\n`)
  })
} else {
  console.log('  (none)\n')
}

if (missingRequired.length > 0) {
  console.log('❌ Missing Required Variables:\n')
  missingRequired.forEach(({ varName, description }) => {
    console.log(`  ✗ ${varName.padEnd(35)} ${description}`)
  })
  console.log('')
}

if (missingOptional.length > 0) {
  console.log('⚠️  Missing Optional Variables (will use defaults):\n')
  missingOptional.forEach(({ varName, description }) => {
    console.log(`  ○ ${varName.padEnd(35)} ${description}`)
  })
  console.log('')
}

// Summary
console.log('─'.repeat(60))
console.log(`Total Required: ${Object.keys(requiredVars).length}`)
console.log(`Missing Required: ${missingRequired.length}`)
console.log(`Set Required: ${Object.keys(requiredVars).length - missingRequired.length}`)
console.log(`Set Optional: ${Object.keys(optionalVars).length - missingOptional.length}`)
console.log('─'.repeat(60))

// Exit code
if (missingRequired.length > 0) {
  console.log('\n❌ FAILED: Missing required environment variables!')
  console.log('   Please set all required variables before deploying.\n')
  process.exit(1)
} else if (strictMode && missingOptional.length > 0) {
  console.log('\n⚠️  WARNING: Some optional variables are missing (--strict mode).')
  console.log('   This is OK for development, but consider setting them for production.\n')
  process.exit(0)
} else {
  console.log('\n✅ PASSED: All required environment variables are set!\n')
  process.exit(0)
}

// Helper: Mask sensitive values
function maskValue(varName, value) {
  if (varName.includes('KEY') || varName.includes('TOKEN') || varName.includes('SECRET')) {
    if (value.length <= 8) {
      return '***'
    }
    return value.substring(0, 4) + '...' + value.substring(value.length - 4)
  }
  return value
}

