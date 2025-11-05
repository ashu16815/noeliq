// Web Review Cache
// Caches web review and comparison results with TTL

import dbClient from '../lib/dbClient.js'

const CACHE_TTL_DAYS = parseInt(process.env.WEB_REVIEW_CACHE_TTL_DAYS || '7', 10)
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000

const webReviewCache = {
  /**
   * Get cached review or fetch new one
   * @param {string} sku - Product SKU
   * @param {Object} productMetadata - Product metadata
   * @param {Function} fetchFn - Function to fetch if not cached
   * @returns {Promise<Object|null>} Review summary
   */
  async getOrFetchReview(sku, productMetadata, fetchFn) {
    try {
      // Check cache
      const cached = await this.getCachedReview(sku)
      if (cached) {
        console.log(`[WebReviewCache] ✅ Using cached review for SKU ${sku}`)
        return cached
      }

      // Fetch new review
      console.log(`[WebReviewCache] 🔄 Fetching new review for SKU ${sku}`)
      const review = await fetchFn(sku, productMetadata)
      
      if (review) {
        await this.setCachedReview(sku, review)
      }
      
      return review
    } catch (error) {
      console.error(`[WebReviewCache] ❌ Error in getOrFetchReview:`, error.message)
      return null
    }
  },

  /**
   * Get cached comparison or fetch new one
   * @param {string} skuLeft - First SKU
   * @param {string} skuRight - Second SKU
   * @param {Object} productLeft - Product metadata for left
   * @param {Object} productRight - Product metadata for right
   * @param {Function} fetchFn - Function to fetch if not cached
   * @returns {Promise<Object|null>} Comparison summary
   */
  async getOrFetchComparison(skuLeft, skuRight, productLeft, productRight, fetchFn) {
    try {
      const cacheKey = this.getComparisonKey(skuLeft, skuRight)
      
      // Check cache
      const cached = await this.getCachedComparison(cacheKey)
      if (cached) {
        console.log(`[WebReviewCache] ✅ Using cached comparison for ${skuLeft} vs ${skuRight}`)
        return cached
      }

      // Fetch new comparison
      console.log(`[WebReviewCache] 🔄 Fetching new comparison for ${skuLeft} vs ${skuRight}`)
      const comparison = await fetchFn(skuLeft, skuRight, productLeft, productRight)
      
      if (comparison) {
        await this.setCachedComparison(cacheKey, comparison)
      }
      
      return comparison
    } catch (error) {
      console.error(`[WebReviewCache] ❌ Error in getOrFetchComparison:`, error.message)
      return null
    }
  },

  /**
   * Get cached review
   */
  async getCachedReview(sku) {
    try {
      const cache = await dbClient.getWebReviewCache()
      const cached = cache.reviews?.[sku]
      
      if (!cached) {
        return null
      }

      // Check if expired
      const expiresAt = new Date(cached.expires_at)
      if (expiresAt < new Date()) {
        console.log(`[WebReviewCache] Cache expired for SKU ${sku}`)
        await this.deleteCachedReview(sku)
        return null
      }

      return cached.review_summary
    } catch (error) {
      console.error(`[WebReviewCache] Error getting cached review:`, error.message)
      return null
    }
  },

  /**
   * Set cached review
   */
  async setCachedReview(sku, reviewSummary) {
    try {
      const cache = await dbClient.getWebReviewCache()
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS)

      if (!cache.reviews) {
        cache.reviews = {}
      }

      cache.reviews[sku] = {
        review_summary,
        expires_at: expiresAt.toISOString(),
      }

      await dbClient.setWebReviewCache(cache)
      console.log(`[WebReviewCache] ✅ Cached review for SKU ${sku} (expires: ${expiresAt.toISOString()})`)
    } catch (error) {
      console.error(`[WebReviewCache] Error setting cached review:`, error.message)
      // Don't throw - caching failure shouldn't break the flow
    }
  },

  /**
   * Get cached comparison
   */
  async getCachedComparison(cacheKey) {
    try {
      const cache = await dbClient.getWebReviewCache()
      const cached = cache.comparisons?.[cacheKey]
      
      if (!cached) {
        return null
      }

      // Check if expired
      const expiresAt = new Date(cached.expires_at)
      if (expiresAt < new Date()) {
        console.log(`[WebReviewCache] Cache expired for comparison ${cacheKey}`)
        await this.deleteCachedComparison(cacheKey)
        return null
      }

      return cached.comparison_summary
    } catch (error) {
      console.error(`[WebReviewCache] Error getting cached comparison:`, error.message)
      return null
    }
  },

  /**
   * Set cached comparison
   */
  async setCachedComparison(cacheKey, comparisonSummary) {
    try {
      const cache = await dbClient.getWebReviewCache()
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS)

      if (!cache.comparisons) {
        cache.comparisons = {}
      }

      cache.comparisons[cacheKey] = {
        comparison_summary: comparisonSummary,
        expires_at: expiresAt.toISOString(),
      }

      await dbClient.setWebReviewCache(cache)
      console.log(`[WebReviewCache] ✅ Cached comparison for ${cacheKey}`)
    } catch (error) {
      console.error(`[WebReviewCache] Error setting cached comparison:`, error.message)
    }
  },

  /**
   * Delete cached review
   */
  async deleteCachedReview(sku) {
    try {
      const cache = await dbClient.getWebReviewCache()
      if (cache.reviews?.[sku]) {
        delete cache.reviews[sku]
        await dbClient.setWebReviewCache(cache)
      }
    } catch (error) {
      console.error(`[WebReviewCache] Error deleting cached review:`, error.message)
    }
  },

  /**
   * Delete cached comparison
   */
  async deleteCachedComparison(cacheKey) {
    try {
      const cache = await dbClient.getWebReviewCache()
      if (cache.comparisons?.[cacheKey]) {
        delete cache.comparisons[cacheKey]
        await dbClient.setWebReviewCache(cache)
      }
    } catch (error) {
      console.error(`[WebReviewCache] Error deleting cached comparison:`, error.message)
    }
  },

  /**
   * Get comparison cache key
   */
  getComparisonKey(skuLeft, skuRight) {
    // Always sort SKUs to ensure same comparison regardless of order
    const sorted = [skuLeft, skuRight].sort()
    return `${sorted[0]}|${sorted[1]}`
  },
}

export default webReviewCache

