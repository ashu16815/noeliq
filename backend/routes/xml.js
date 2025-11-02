import express from 'express'
import multer from 'multer'
import xmlParserService from '../services/xmlParserService.js'
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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/xml' || file.mimetype === 'text/xml' || file.originalname.endsWith('.xml')) {
      cb(null, true)
    } else {
      cb(new Error('Only XML files are allowed'), false)
    }
  },
})

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const sourceLabel = req.body.source_label || req.file.originalname
    const xmlContent = req.file.buffer.toString('utf-8')

    // Parse XML
    const parsedProducts = await xmlParserService.parseXML(xmlContent)

    // Detect changes
    const changes = await changeDetectionService.detectChanges(parsedProducts)

    // Store parsed products and change detection results
    await dbClient.storeParsedProducts(parsedProducts, sourceLabel)
    
    // Store stores data if available in metadata
    if (parsedProducts._parseMetadata?.stores) {
      await dbClient.storeStores(parsedProducts._parseMetadata.stores, sourceLabel)
    }
    
    // Remove metadata before storing products
    delete parsedProducts._parseMetadata
    
    await dbClient.updateSyncStatus(changes.changedSKUs, changes.newSKUs)

    res.json({
      parsed_skus: parsedProducts.length,
      changed_skus: changes.changedSKUs.length,
      new_skus: changes.newSKUs.length,
      status: 'parsed',
      message: 'XML parsed successfully. Use /admin/reindex to process changes.',
    })
  } catch (error) {
    console.error('Error in /admin/xml/upload route:', error)
    res.status(500).json({
      error: error.message || 'Failed to process XML',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

export default router

