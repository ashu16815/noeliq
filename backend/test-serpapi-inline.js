// Test SerpAPI with inline key
// Usage: SERPAPI_API_KEY=your-key node test-serpapi-inline.js

import axios from 'axios'

const SERPAPI_KEY = process.env.SERPAPI_API_KEY

if (!SERPAPI_KEY) {
  console.error('❌ SERPAPI_API_KEY not provided')
  console.error('\nUsage:')
  console.error('  SERPAPI_API_KEY=your-key-here node test-serpapi-inline.js')
  process.exit(1)
}

console.log('🔍 Testing SerpAPI with provided key\n')
console.log('API Key length:', SERPAPI_KEY.length)
console.log('First 10 chars:', SERPAPI_KEY.substring(0, 10) + '...\n')

const testQuery = 'Samsung Galaxy S24 review pros cons'
const location = 'Auckland, New Zealand'
const gl = 'nz'
const hl = 'en'
const num = 8

console.log(`Test Query: "${testQuery}"`)
console.log(`Location: ${location}`)
console.log(`Country: ${gl}, Language: ${hl}\n`)
console.log('Making API request...\n')

try {
  const startTime = Date.now()
  
  const response = await axios.get('https://serpapi.com/search.json', {
    params: {
      engine: 'google',
      q: testQuery,
      api_key: SERPAPI_KEY,
      location,
      gl,
      hl,
      num,
    },
    timeout: 15000,
  })
  
  const duration = Date.now() - startTime
  
  console.log(`✅ API Request Successful (${duration}ms)\n`)
  
  const organicResults = response.data?.organic_results || []
  console.log(`📊 Results: ${organicResults.length} items found\n`)
  
  if (organicResults.length === 0) {
    console.log('⚠️  WARNING: No organic results returned')
    console.log('Response keys:', Object.keys(response.data || {}))
    process.exit(1)
  }
  
  console.log('Sample Results:\n')
  organicResults.slice(0, 5).forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.title || 'No title'}`)
    console.log(`   URL: ${result.link || result.displayed_link || 'No URL'}`)
    const snippet = (result.snippet || 'No snippet').substring(0, 150)
    console.log(`   Snippet: ${snippet}...`)
    console.log()
  })
  
  // Test snippet extraction
  console.log('Testing snippet extraction...')
  const snippets = organicResults
    .map(r => `${r.title || ''} — ${r.snippet || ''}`)
    .filter(s => s.trim().length > 0)
  
  console.log(`✅ Extracted ${snippets.length} snippets`)
  console.log(`   Sample: "${snippets[0].substring(0, 100)}..."`)
  
  console.log('\n✅ SerpAPI is working correctly!')
  console.log('\n💡 Next steps:')
  console.log('   1. Add SERPAPI_API_KEY to backend/.env file')
  console.log('   2. Set USE_WEB_REVIEWS=true')
  console.log('   3. Restart backend server')
  
} catch (error) {
  console.error('\n❌ API Request Failed\n')
  console.error('Error:', error.message)
  
  if (error.response) {
    console.error(`Status: ${error.response.status}`)
    const errorData = error.response.data
    if (errorData) {
      console.error('Response:', JSON.stringify(errorData, null, 2))
    }
    
    if (error.response.status === 401) {
      console.error('\n💡 Authentication error:')
      console.error('   - Check your SerpAPI key is correct')
      console.error('   - Verify key is active in SerpAPI dashboard')
    } else if (error.response.status === 429) {
      console.error('\n💡 Rate limit exceeded')
      console.error('   - Wait a moment and try again')
      console.error('   - Check your SerpAPI plan limits')
    }
  }
  
  process.exit(1)
}

