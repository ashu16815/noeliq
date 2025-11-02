import express from 'express'
import changeDetectionService from '../services/changeDetectionService.js'
import dbClient from '../lib/dbClient.js'

const router = express.Router()

// Admin auth middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized - Admin access required' })
  }
  next()
}

router.use(authenticateAdmin)

router.post('/reindex', async (req, res) => {
  try {
    const { skus } = req.body

    if (!Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ error: 'skus array is required' })
    }

    // TODO: Trigger reindex job for specified SKUs
    // This would call the pipeline/runIncrementalUpdate.js
    
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    res.json({
      job_id: jobId,
      status: 'started',
      skus_count: skus.length,
    })
  } catch (error) {
    console.error('Error in /admin/reindex route:', error)
    res.status(500).json({
      error: error.message || 'Failed to trigger reindex',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

router.get('/sync-status', async (req, res) => {
  try {
    const { sku } = req.query

    // Query sync status from database
    const statuses = await dbClient.getSyncStatus(sku || null)

    res.json(statuses)
  } catch (error) {
    console.error('Error in /admin/sync-status route:', error)
    res.status(500).json({
      error: error.message || 'Failed to fetch sync status',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const logs = await dbClient.getLogs(limit)

    res.json(logs)
  } catch (error) {
    console.error('Error in /admin/logs route:', error)
    res.status(500).json({
      error: error.message || 'Failed to fetch logs',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

export default router

