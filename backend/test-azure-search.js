// Test Azure AI Search endpoint
import axios from 'axios'

const endpoint = process.env.AZURE_SEARCH_ENDPOINT || 'https://noeliq-search.search.windows.net'
const apiKey = process.env.AZURE_SEARCH_API_KEY || ''

console.log('🔍 Testing Azure AI Search\n')
console.log('Endpoint:', endpoint)
console.log('API Key:', apiKey.substring(0, 10) + '...\n')

// Test 1: Check if it's accessible
console.log('Test 1: Checking service accessibility...')
try {
  const response = await axios.get(`${endpoint}/indexes?api-version=2024-07-01`, {
    headers: {
      'api-key': apiKey,
    },
    timeout: 5000,
  })
  console.log('✅ Service is accessible')
  console.log('Indexes found:', response.data?.value?.length || 0)
  if (response.data?.value) {
    console.log('Available indexes:', response.data.value.map(i => i.name).join(', '))
  }
} catch (error) {
  console.log('❌ Cannot access service:', error.message)
  if (error.response) {
    console.log('Status:', error.response.status)
    console.log('Response:', JSON.stringify(error.response.data, null, 2))
  }
}

console.log('\n' + '='.repeat(60))
console.log('\n⚠️  IMPORTANT: Azure AI Search is for searching YOUR indexed content,')
console.log('   NOT for web search. It searches documents you have indexed.')
console.log('\nFor web reviews, you need:')
console.log('  - Bing Search API (web search)')
console.log('  - OR Azure AI Search with web content indexed')
console.log('  - OR alternative web search APIs')
