// Test script for SerpAPI
// Run: node test-serpapi.js

import axios from 'axios'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

const testSerpAPI = async () => {
  console.log('🔍 Testing SerpAPI\n')
  console.log('='.repeat(60))
  
  const serpEndpoint = process.env.SERPAPI_ENDPOINT || 'https://serpapi.com/search.json'
  const serpApiKey = process.env.SERPAPI_API_KEY
  const location = process.env.SERPAPI_LOCATION || 'Auckland, New Zealand'
  const gl = process.env.SERPAPI_GL || 'nz'
  const hl = process.env.SERPAPI_HL || 'en'
  const num = parseInt(process.env.SERPAPI_RESULTS_PER_QUERY || '8', 10)

  console.log('Configuration:')
  console.log(`  Endpoint: ${serpEndpoint}`)
  console.log(`  Location: ${location}`)
  console.log(`  Country: ${gl}`)
  console.log(`  Language: ${hl}`)
  console.log(`  Results per query: ${num}`)
  console.log(`  API Key: ${serpApiKey ? '✅ Set' : '❌ Missing'}\n`)
  
  if (!serpApiKey) {
    console.error('❌ ERROR: SERPAPI_API_KEY is not set in environment variables')
    console.error('   Please set it in backend/.env file')
    console.error('   Get your key from: https://serpapi.com/')
    process.exit(1)
  }
  
  // Test query - similar to what we'd use for a product review
  const testQuery = 'Samsung Galaxy S24 review pros cons'
  
  console.log(`Test Query: "${testQuery}"\n`)
  console.log('Making API request...\n')
  
  try {
    const startTime = Date.now()
    
    const response = await axios.get(serpEndpoint, {
      params: {
        engine: 'google',
        q: testQuery,
        api_key: serpApiKey,
        location,
        gl,
        hl,
        num,
      },
      timeout: 15000, // 15 second timeout
    })
    
    const duration = Date.now() - startTime
    
    console.log(`✅ API Request Successful (${duration}ms)\n`)
    console.log('Response Structure:')
    console.log(`  Status: ${response.status}`)
    console.log(`  Response keys:`, Object.keys(response.data || {}).join(', '))
    console.log()
    
    // Parse results
    const organicResults = response.data?.organic_results || []
    
    console.log(`📊 Results: ${organicResults.length} items found\n`)
    
    if (organicResults.length === 0) {
      console.log('⚠️  WARNING: No organic results returned')
      console.log('   Full response:', JSON.stringify(response.data, null, 2))
      return
    }
    
    // Display first few results
    console.log('Sample Results:\n')
    organicResults.slice(0, 3).forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.title || 'No title'}`)
      console.log(`   URL: ${result.link || result.displayed_link || 'No URL'}`)
      const snippet = (result.snippet || 'No snippet').substring(0, 150)
      console.log(`   Snippet: ${snippet}...`)
      console.log()
    })
    
    // Test snippet extraction (like our service does)
    console.log('Testing snippet extraction...')
    const snippets = organicResults
      .map(r => ({
        title: r.title || '',
        snippet: r.snippet || '',
        url: r.link || r.displayed_link || '',
      }))
      .filter(r => r.snippet && r.snippet.trim().length > 0)
    
    console.log(`✅ Extracted ${snippets.length} snippets`)
    if (snippets.length > 0) {
      console.log(`   Sample title: "${snippets[0].title}"`)
      console.log(`   Sample snippet length: ${snippets[0].snippet.length} chars`)
      console.log(`   Sample combined: "${snippets[0].title} — ${snippets[0].snippet.substring(0, 100)}..."`)
    }
    
    console.log('\n✅ All tests passed!')
    console.log('\n💡 SerpAPI is working correctly!')
    console.log('💡 You can now enable web reviews by setting:')
    console.log('   USE_WEB_REVIEWS=true')
    
  } catch (error) {
    console.error('\n❌ API Request Failed\n')
    console.error('Error:', error.message)
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`)
      console.error(`Status Text: ${error.response.statusText}`)
      console.error('Response:', JSON.stringify(error.response.data, null, 2))
      
      if (error.response.status === 401) {
        console.error('\n💡 This is likely an authentication error.')
        console.error('   - Check your SerpAPI key is correct')
        console.error('   - Verify the key is active in your SerpAPI account')
        console.error('   - Check if you have credits/quota available')
      } else if (error.response.status === 429) {
        console.error('\n💡 Rate limit exceeded.')
        console.error('   - Wait a moment and try again')
        console.error('   - Check your SerpAPI plan limits')
      } else if (error.response.status === 400) {
        console.error('\n💡 Bad request.')
        console.error('   - Check your query parameters')
        console.error('   - Verify location/gl/hl values are valid')
      }
    } else if (error.request) {
      console.error('No response received. Check your network connection and endpoint URL.')
      console.error('Request config:', {
        url: error.config?.url,
        method: error.config?.method,
      })
    }
    
    process.exit(1)
  }
}

// Run the test
testSerpAPI().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

