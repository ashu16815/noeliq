import express from 'express'
import availabilityService from '../services/availabilityService.js'

const router = express.Router()

// Simple auth middleware (MVP)
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || (token !== process.env.STAFF_TOKEN && token !== process.env.ADMIN_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

router.get('/:sku', authenticate, async (req, res) => {
  try {
    const { sku } = req.params
    const store_id = req.query.store_id || req.headers['x-store-id']

    if (!store_id) {
      return res.status(400).json({ error: 'store_id is required (query param or header)' })
    }

    const availability = await availabilityService.getAvailability(sku, store_id)

    res.json(availability)
  } catch (error) {
    console.error('Error in /availability route:', error)
    res.status(500).json({
      error: error.message || 'Failed to fetch availability',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

export default router

