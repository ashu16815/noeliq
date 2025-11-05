// Test script for Bing Grounding Search API / Bing Search API
// Run: node test-web-search.js

import axios from 'axios'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') })

const testWebSearch = async () => {
  console.log('🔍 Testing Web Search API\n')
  
  // Get configuration
  const searchProvider = process.env.WEB_SEARCH_PROVIDER || 'bing_grounding'
  const configuredEndpoint = process.env.WEB_SEARCH_ENDPOINT
  const searchApiKey = process.env.WEB_SEARCH_API_KEY
  const searchRegion = process.env.WEB_SEARCH_REGION || 'en-NZ'
  
  console.log('Configuration:')
  console.log(`  Provider: ${searchProvider}`)
  console.log(`  Configured Endpoint: ${configuredEndpoint || 'Not set'}`)
  console.log(`  Region: ${searchRegion}`)
  console.log(`  API Key: ${searchApiKey ? '✅ Set' : '❌ Missing'}\n`)
  
  if (!searchApiKey) {
    console.error('❌ ERROR: WEB_SEARCH_API_KEY is not set in environment variables')
    console.error('   Please set it in backend/.env file')
    process.exit(1)
  }
  
  // Test query - similar to what we'd use for a product review
  const testQuery = 'Samsung Galaxy S24 reviews pros cons site:trustedreviews.com OR site:techradar.com'
  
  console.log(`Test Query: "${testQuery}"\n`)
  
  // Try different endpoint formats
  const endpointVariants = []
  
  if (configuredEndpoint) {
    endpointVariants.push({
      name: 'Configured Endpoint',
      url: configuredEndpoint,
      params: { q: testQuery, count: 5, mkt: searchRegion, safeSearch: searchProvider === 'bing_grounding' ? 'Strict' : 'Moderate' },
    })
  }
  
  // Common endpoint formats to try
  endpointVariants.push(
    {
      name: 'Bing Grounding Search (Cognitive Services)',
      url: 'https://api.cognitive.microsoft.com/binggrounding/v1/search',
      params: { q: testQuery, count: 5, mkt: searchRegion, safeSearch: 'Strict' },
    },
    {
      name: 'Bing Search v7 (Microsoft)',
      url: 'https://api.bing.microsoft.com/v7.0/search',
      params: { q: testQuery, count: 5, mkt: searchRegion, safeSearch: 'Moderate' },
    },
    {
      name: 'Bing Search v7 (Alternative)',
      url: 'https://api.cognitive.microsoft.com/bing/v7.0/search',
      params: { q: testQuery, count: 5, mkt: searchRegion, safeSearch: 'Moderate' },
    }
  )
  
  let lastError = null
  let successCount = 0
  
  for (const variant of endpointVariants) {
    console.log(`Trying: ${variant.name}`)
    console.log(`  Endpoint: ${variant.url}\n`)
    
    try {
      const startTime = Date.now()
      const response = await axios.get(variant.url, {
        params: variant.params,
        headers: {
          'Ocp-Apim-Subscription-Key': searchApiKey,
        },
        timeout: 10000,
      })
      
      const duration = Date.now() - startTime
      
      console.log(`✅ SUCCESS with ${variant.name} (${duration}ms)\n`)
      successCount++
      
      // Parse results
      const webPages = response.data?.webPages
      const results = webPages?.value || []
      
      console.log(`📊 Results: ${results.length} items found\n`)
      
      if (results.length === 0) {
        console.log('⚠️  WARNING: No results returned')
        console.log('   Response keys:', Object.keys(response.data || {}))
        console.log('   This might still be a valid response (just no results)\n')
        continue
      }
      
      // Display first few results
      console.log('Sample Results:\n')
      results.slice(0, 3).forEach((result, idx) => {
        console.log(`${idx + 1}. ${result.name || result.title || 'No title'}`)
        console.log(`   URL: ${result.url || result.displayUrl || 'No URL'}`)
        const snippet = (result.snippet || result.description || 'No snippet').substring(0, 150)
        console.log(`   Snippet: ${snippet}...`)
        console.log()
      })
      
      // Test summary extraction (like our service does)
      console.log('Testing result extraction...')
      const extractedResults = results.map(r => ({
        title: r.name || r.title || '',
        snippet: r.snippet || r.description || '',
        url: r.url || r.displayUrl || '',
      }))
      
      console.log(`✅ Extracted ${extractedResults.length} results`)
      if (extractedResults.length > 0) {
        console.log(`   Sample title: "${extractedResults[0].title}"`)
        console.log(`   Sample snippet length: ${extractedResults[0].snippet.length} chars`)
      }
      
      console.log('\n✅ All tests passed!')
      console.log(`\n💡 Working endpoint: ${variant.url}`)
      console.log(`💡 Recommended: Update WEB_SEARCH_ENDPOINT to "${variant.url}"`)
      console.log(`💡 Recommended: Update WEB_SEARCH_PROVIDER to "${searchProvider === 'bing_grounding' ? 'bing_grounding' : 'bing'}"`)
      
      return // Success - exit early
      
    } catch (error) {
      lastError = error
      console.log(`❌ Failed: ${error.message}`)
      if (error.response) {
        console.log(`   Status: ${error.response.status}`)
        const errorData = error.response.data
        if (errorData?.error?.message) {
          console.log(`   Error: ${errorData.error.message}`)
        }
        
        if (error.response.status === 401) {
          console.log('   💡 Authentication issue - check API key')
        } else if (error.response.status === 404) {
          console.log('   💡 Endpoint not found - wrong URL or service not available')
        } else if (error.response.status === 403) {
          console.log('   💡 Forbidden - check subscription/quota or service availability')
        }
      } else if (error.request) {
        console.log('   💡 No response - check network/endpoint URL')
      }
      console.log()
      
      // Continue to next variant
      continue
    }
  }
  
  // If we get here, all variants failed
  console.error('\n❌ All endpoint variants failed\n')
  
  if (lastError) {
    console.error('Last error:', lastError.message)
    
    if (lastError.response) {
      console.error(`Status: ${lastError.response.status}`)
      const errorData = lastError.response.data
      if (errorData) {
        console.error('Response:', JSON.stringify(errorData, null, 2))
      }
      
      if (lastError.response.status === 401) {
        console.error('\n💡 Authentication Error:')
        console.error('   - Check that your API key is correct')
        console.error('   - Verify the key matches the service type')
        console.error('   - Make sure the key is not expired')
        console.error('   - Check if the service requires a different authentication method')
      } else if (lastError.response.status === 404) {
        console.error('\n💡 Endpoint Not Found:')
        console.error('   - Verify the endpoint URL is correct')
        console.error('   - Check if Bing Grounding Search is available in your Azure subscription')
        console.error('   - Note: Microsoft has retired some Bing Search APIs')
        console.error('   - Consider using Azure AI Services (Azure OpenAI with grounding)')
        console.error('   - Or use alternative search APIs')
      } else if (lastError.response.status === 403) {
        console.error('\n💡 Forbidden - Subscription/Quota Issue:')
        console.error('   - Check your Azure subscription status')
        console.error('   - Verify you have quota available')
        console.error('   - Check if the service is enabled in your subscription')
        console.error('   - Verify the service is available in your region')
      }
    }
  }
  
  console.error('\n📝 Alternative Options:')
  console.error('   1. Use Azure OpenAI with web grounding (if available)')
  console.error('   2. Use alternative search APIs (SerpAPI, Zenserp, etc.)')
  console.error('   3. Check Azure Portal for available Cognitive Services')
  console.error('   4. Consider using Azure AI Search for internal content only')
  
  process.exit(1)
}

// Run the test
testWebSearch().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
