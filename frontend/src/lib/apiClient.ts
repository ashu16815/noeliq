import axios from 'axios'

// Ensure API_BASE_URL always ends with /api
const envApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const API_BASE_URL = envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout (turn orchestrator with multiple LLM calls can take 20-40 seconds)
})

// Request interceptor for auth (MVP: simple token)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('noeliq_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    console.warn('⚠️ No auth token found in localStorage. Set it with: localStorage.setItem("noeliq_token", "staff-access")')
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.data)
    } else {
      console.error('Network Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export interface AskRequest {
  sku?: string
  question: string
  store_id?: string
  conversation_id?: string
}

export interface Attachment {
  sku: string | null
  name: string
  why_sell: string
}

export interface AvailabilityNearby {
  store_name: string
  qty: number
  distance_km: number
  fulfilment_option: string
}

export interface StockAndFulfilment {
  this_store_qty: number | null
  nearby: AvailabilityNearby[]
  fulfilment_summary: string
}

export interface AlternativeIfOOS {
  alt_sku: string | null
  alt_name: string | null
  why_this_alt: string | null
  key_diff: string | null
}

// Alias for compatibility with StockBlock component
export interface Availability {
  this_store_qty: number | null
  nearby: AvailabilityNearby[]
  fulfilment: string
}

export interface AskResponse {
  conversation_id: string
  summary: string
  key_points: string[]
  attachments: Attachment[]
  stock_and_fulfilment: StockAndFulfilment
  alternative_if_oos: AlternativeIfOOS
  sentiment_note: string | null
  compliance_flags: string[]
  citations: string[]
}

export const api = {
  ask: async (data: AskRequest): Promise<AskResponse> => {
    const response = await apiClient.post<AskResponse>('/ask', data)
    return response.data
  },

  getAvailability: async (sku: string): Promise<any> => {
    const response = await apiClient.get(`/availability/${sku}`)
    return response.data
  },

  // Admin endpoints
  uploadXML: async (file: File, sourceLabel: string): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source_label', sourceLabel)
    const response = await apiClient.post('/admin/xml/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  reindex: async (skus: string[]): Promise<any> => {
    const response = await apiClient.post('/admin/reindex', { skus })
    return response.data
  },

  getSyncStatus: async (sku?: string): Promise<any> => {
    const params = sku ? { sku } : {}
    const response = await apiClient.get('/admin/sync-status', { params })
    return response.data
  },

  getLogs: async (): Promise<any> => {
    const response = await apiClient.get('/admin/logs')
    return response.data
  },

  getStores: async (): Promise<any> => {
    const response = await apiClient.get('/stores')
    return response.data
  },

  searchProducts: async (query: string, limit: number = 10): Promise<ProductSearchResult[]> => {
    const response = await apiClient.get('/products/search', {
      params: { q: query, limit },
    })
    return response.data
  },
}

export interface ProductSearchResult {
  sku: string
  name: string
  category: string
  price: number | null
  preview: string
}

export default apiClient

