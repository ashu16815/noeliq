import express from 'express'
import productSearchService from '../services/productSearchService.js'

const router = express.Router()

// Simple auth middleware (MVP)
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token !== process.env.STAFF_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, limit } = req.query

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter "q" is required' })
    }

    const searchLimit = parseInt(limit) || 10
    const products = await productSearchService.searchProducts(q.trim(), searchLimit)

    res.json(products)
  } catch (error) {
    console.error('Error in /products/search route:', error)
    res.status(500).json({ 
      error: 'Failed to search products',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

export default router

