import express from 'express'
import dbClient from '../lib/dbClient.js'

const router = express.Router()

// Simple auth middleware (MVP)
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token !== process.env.STAFF_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

router.get('/', authenticate, async (req, res) => {
  try {
    const stores = await dbClient.getStores()
    res.json(stores)
  } catch (error) {
    console.error('Error fetching stores:', error)
    res.status(500).json({ error: 'Failed to fetch stores' })
  }
})

export default router

