// Diagnostic script for Web Search API issues
// Run: node diagnose-web-search.js

import axios from 'axios'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

const apiKey = process.env.WEB_SEARCH_API_KEY

console.log('🔍 Web Search API Diagnostic\n')
console.log('='.repeat(60))

if (!apiKey) {
  console.error('❌ WEB_SEARCH_API_KEY is not set')
  console.error('\nPlease set it in backend/.env file:')
  console.error('WEB_SEARCH_API_KEY=your-key-here')
  process.exit(1)
}

console.log(`✅ API Key found (length: ${apiKey.length} characters)`)
console.log(`   First 10 chars: ${apiKey.substring(0, 10)}...`)
console.log(`   Last 10 chars: ...${apiKey.substring(apiKey.length - 10)}`)

console.log('\n' + '='.repeat(60))
console.log('Testing Endpoints:\n')

const endpoints = [
  {
    name: 'Bing Search v7 (Microsoft)',
    url: 'https://api.bing.microsoft.com/v7.0/search',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    params: { q: 'test', count: 1 },
  },
  {
    name: 'Bing Search v7 (Cognitive Services)',
    url: 'https://api.cognitive.microsoft.com/bing/v7.0/search',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    params: { q: 'test', count: 1 },
  },
  {
    name: 'Bing Grounding Search',
    url: 'https://api.cognitive.microsoft.com/binggrounding/v1/search',
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    params: { q: 'test', count: 1 },
  },
]

let workingEndpoint = null

for (const endpoint of endpoints) {
  console.log(`Testing: ${endpoint.name}`)
  console.log(`  URL: ${endpoint.url}`)
  
  try {
    const response = await axios.get(endpoint.url, {
      params: endpoint.params,
      headers: endpoint.headers,
      timeout: 5000,
      validateStatus: () => true, // Don't throw on any status
    })
    
    if (response.status === 200) {
      console.log(`  ✅ SUCCESS! Status: ${response.status}`)
      const results = response.data?.webPages?.value || []
      console.log(`  📊 Results: ${results.length} items`)
      workingEndpoint = endpoint
      break
    } else if (response.status === 401) {
      console.log(`  ⚠️  Status: ${response.status} - Authentication failed`)
      console.log(`     This endpoint exists but API key is invalid/expired`)
      console.log(`     OR the key is for a different service type`)
    } else if (response.status === 404) {
      console.log(`  ❌ Status: ${response.status} - Endpoint not found`)
      console.log(`     This service might not be available in your subscription`)
    } else if (response.status === 403) {
      console.log(`  ⚠️  Status: ${response.status} - Forbidden`)
      console.log(`     Check subscription/quota or service availability`)
    } else {
      console.log(`  ⚠️  Status: ${response.status}`)
      if (response.data) {
        console.log(`     Response:`, JSON.stringify(response.data).substring(0, 200))
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log(`  ❌ Network error: ${error.message}`)
    } else {
      console.log(`  ❌ Error: ${error.message}`)
    }
  }
  
  console.log()
}

console.log('='.repeat(60))

if (workingEndpoint) {
  console.log('\n✅ FOUND WORKING ENDPOINT!')
  console.log(`\nRecommended configuration:`)
  console.log(`WEB_SEARCH_ENDPOINT=${workingEndpoint.url}`)
  console.log(`WEB_SEARCH_PROVIDER=${workingEndpoint.url.includes('binggrounding') ? 'bing_grounding' : 'bing'}`)
  console.log(`WEB_SEARCH_API_KEY=${apiKey.substring(0, 10)}...`)
  console.log(`WEB_SEARCH_REGION=en-NZ`)
} else {
  console.log('\n❌ NO WORKING ENDPOINT FOUND\n')
  console.log('Possible Issues:')
  console.log('1. API Key is invalid or expired')
  console.log('2. API Key is for a different service (not Bing Search)')
  console.log('3. Bing Search service is not enabled in your Azure subscription')
  console.log('4. Service endpoints have changed or been retired')
  console.log('\nNext Steps:')
  console.log('1. Check Azure Portal → Your Cognitive Services resource')
  console.log('2. Verify the API key matches the service type')
  console.log('3. Check if Bing Search is enabled in your subscription')
  console.log('4. Get the correct endpoint URL from Azure Portal')
  console.log('5. Consider using alternative search APIs or disable web reviews')
  console.log('\nTo disable web reviews (recommended for now):')
  console.log('Set USE_WEB_REVIEWS=false in environment variables')
}

console.log('\n' + '='.repeat(60))

