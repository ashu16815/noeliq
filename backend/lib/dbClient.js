import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Check if we're in a serverless/read-only environment (Vercel, AWS Lambda, etc.)
const isServerlessEnv = () => {
  return (
    process.env.VERCEL === '1' ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.cwd().includes('/var/task') ||
    process.cwd().includes('/tmp')
  )
}

const IS_SERVERLESS = isServerlessEnv()

// JSON file storage paths
const DATA_DIR = path.join(__dirname, '../data')
const SYNC_STATUS_FILE = path.join(DATA_DIR, 'sync-status.json')
const LOGS_FILE = path.join(DATA_DIR, 'logs.json')
const PARSED_PRODUCTS_FILE = path.join(DATA_DIR, 'parsed-products.json')

// Ensure data directory exists (only in non-serverless environments)
const ensureDataDir = async () => {
  if (IS_SERVERLESS) {
    // Skip directory creation in serverless - we won't write files anyway
    return
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating data directory:', error)
  }
}

// Initialize on module load
await ensureDataDir()

// Helper functions for JSON file operations
const readJSONFile = async (filePath, defaultValue = []) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default
      return defaultValue
    }
    console.error(`Error reading ${filePath}:`, error)
    return defaultValue
  }
}

const writeJSONFile = async (filePath, data) => {
  // Skip file writes in serverless environments (read-only filesystem)
  if (IS_SERVERLESS) {
    console.log(`[dbClient] Skipping file write in serverless environment: ${path.basename(filePath)}`)
    console.log(`[dbClient] Data preview:`, JSON.stringify(data).substring(0, 200))
    return // Silently skip - don't throw error
  }
  
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    // If error is EROFS (read-only filesystem), just log and continue
    if (error.code === 'EROFS') {
      console.warn(`[dbClient] Read-only filesystem detected, skipping write to ${path.basename(filePath)}`)
      return
    }
    console.error(`Error writing ${filePath}:`, error)
    // Don't throw in production - logging failures shouldn't break the app
    if (process.env.NODE_ENV === 'development') {
      throw error
    }
  }
}

const dbClient = {
  // Sync Status
  async getSyncStatus(sku = null) {
    try {
      const syncStatus = await readJSONFile(SYNC_STATUS_FILE, [])
      
      if (sku) {
        const status = syncStatus.find(s => s.sku === sku)
        return status ? [status] : []
      }
      
      return syncStatus.sort((a, b) => a.sku.localeCompare(b.sku))
    } catch (error) {
      console.error('Error fetching sync status:', error)
      throw error
    }
  },

  async updateSyncStatus(changedSKUs, newSKUs) {
    try {
      const allSKUs = [...changedSKUs, ...newSKUs]
      const syncStatus = await readJSONFile(SYNC_STATUS_FILE, [])
      
      // Create a map for quick lookup
      const statusMap = new Map(syncStatus.map(s => [s.sku, s]))
      
      // Update or create status for each SKU
      allSKUs.forEach((sku) => {
        const existing = statusMap.get(sku)
        if (existing) {
          existing.status = 'stale'
          existing.needs_reembed = true
          existing.last_seen_hash = null
          existing.updated_at = new Date().toISOString()
        } else {
          statusMap.set(sku, {
            sku,
            status: 'stale',
            needs_reembed: true,
            last_seen_hash: null,
            last_embedded_hash: null,
            last_successful_embed_ts: null,
            error_message: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      })
      
      // Write back to file
      await writeJSONFile(SYNC_STATUS_FILE, Array.from(statusMap.values()))
    } catch (error) {
      console.error('Error updating sync status:', error)
      // Don't throw in serverless - file writes aren't critical
      if (!IS_SERVERLESS && process.env.NODE_ENV === 'development') {
        throw error
      }
    }
  },

  async updateSyncStatusForSKU(sku, updates) {
    try {
      const syncStatus = await readJSONFile(SYNC_STATUS_FILE, [])
      const index = syncStatus.findIndex(s => s.sku === sku)
      
      if (index !== -1) {
        syncStatus[index] = {
          ...syncStatus[index],
          ...updates,
          updated_at: new Date().toISOString(),
        }
      } else {
        syncStatus.push({
          sku,
          ...updates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
      
      await writeJSONFile(SYNC_STATUS_FILE, syncStatus)
    } catch (error) {
      console.error('Error updating sync status for SKU:', error)
      // Don't throw in serverless - file writes aren't critical
      if (!IS_SERVERLESS && process.env.NODE_ENV === 'development') {
        throw error
      }
    }
  },

  // Logs
  async getLogs(limit = 100) {
    try {
      const logs = await readJSONFile(LOGS_FILE, [])
      return logs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching logs:', error)
      throw error
    }
  },

  async storeLog(logData) {
    try {
      // In serverless, just log to console instead of file
      if (IS_SERVERLESS) {
        console.log('[Log]', JSON.stringify({
          ...logData,
          timestamp: logData.timestamp ? new Date(logData.timestamp).toISOString() : new Date().toISOString(),
        }))
        return
      }
      
      const logs = await readJSONFile(LOGS_FILE, [])
      logs.push({
        ...logData,
        timestamp: logData.timestamp ? new Date(logData.timestamp).toISOString() : new Date().toISOString(),
      })
      
      // Keep only last 10000 logs to prevent file from growing too large
      const trimmedLogs = logs.slice(-10000)
      await writeJSONFile(LOGS_FILE, trimmedLogs)
    } catch (error) {
      // In serverless or if write fails, just log to console
      console.error('Error storing log:', error)
      console.log('[Log]', JSON.stringify(logData))
      // Don't throw - logging failures shouldn't break the app
    }
  },

  // Parsed Products Storage
  async storeParsedProducts(products, sourceLabel) {
    try {
      const timestamp = new Date().toISOString()
      const parsedProducts = await readJSONFile(PARSED_PRODUCTS_FILE, {})
      
      // Store products keyed by SKU
      products.forEach(product => {
        parsedProducts[product.sku] = {
          ...product,
          source_label: sourceLabel,
          last_parsed_ts: timestamp,
        }
      })
      
      // Also store metadata
      parsedProducts._metadata = {
        last_source_label: sourceLabel,
        last_parsed_ts: timestamp,
        total_skus: Object.keys(parsedProducts).filter(k => k !== '_metadata').length,
      }
      
      await writeJSONFile(PARSED_PRODUCTS_FILE, parsedProducts)
      console.log(`Stored ${products.length} parsed products from ${sourceLabel}`)
    } catch (error) {
      console.error('Error storing parsed products:', error)
      // Don't throw in serverless - file writes aren't critical for runtime
      if (!IS_SERVERLESS && process.env.NODE_ENV === 'development') {
        throw error
      }
    }
  },

  // Get parsed product
  async getParsedProduct(sku) {
    try {
      const parsedProducts = await readJSONFile(PARSED_PRODUCTS_FILE, {})
      return parsedProducts[sku] || null
    } catch (error) {
      console.error('Error getting parsed product:', error)
      return null
    }
  },

  // Get all parsed product SKUs
  async getAllParsedProductSKUs() {
    try {
      const parsedProducts = await readJSONFile(PARSED_PRODUCTS_FILE, {})
      return Object.keys(parsedProducts).filter(k => k !== '_metadata')
    } catch (error) {
      console.error('Error getting parsed product SKUs:', error)
      return []
    }
  },

  // Store Stores data
  async storeStores(stores, sourceLabel) {
    try {
      const STORES_FILE = path.join(DATA_DIR, 'stores.json')
      const storesData = await readJSONFile(STORES_FILE, {})
      
      storesData.stores = stores
      storesData.last_updated = new Date().toISOString()
      storesData.source_label = sourceLabel
      
      await writeJSONFile(STORES_FILE, storesData)
      console.log(`Stored ${stores.length} stores`)
    } catch (error) {
      console.error('Error storing stores:', error)
      // Don't throw in serverless - file writes aren't critical for runtime
      if (!IS_SERVERLESS && process.env.NODE_ENV === 'development') {
        throw error
      }
    }
  },

  // Get stores
  async getStores() {
    try {
      const STORES_FILE = path.join(DATA_DIR, 'stores.json')
      const storesData = await readJSONFile(STORES_FILE, {})
      return storesData.stores || []
    } catch (error) {
      console.error('Error getting stores:', error)
      return []
    }
  },

  // Web Review Cache
  async getWebReviewCache() {
    try {
      const WEB_REVIEW_CACHE_FILE = path.join(DATA_DIR, 'web-review-cache.json')
      const cache = await readJSONFile(WEB_REVIEW_CACHE_FILE, {
        reviews: {},
        comparisons: {},
      })
      return cache
    } catch (error) {
      console.error('Error getting web review cache:', error)
      return { reviews: {}, comparisons: {} }
    }
  },

  async setWebReviewCache(cache) {
    try {
      const WEB_REVIEW_CACHE_FILE = path.join(DATA_DIR, 'web-review-cache.json')
      await writeJSONFile(WEB_REVIEW_CACHE_FILE, cache)
    } catch (error) {
      console.error('Error setting web review cache:', error)
      // Don't throw - caching failures shouldn't break the flow
    }
  },
}

export default dbClient

