import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import askRoutes from './routes/ask.js'
import adminRoutes from './routes/admin.js'
import availabilityRoutes from './routes/availability.js'
import xmlRoutes from './routes/xml.js'
import storesRoutes from './routes/stores.js'
import productsRoutes from './routes/products.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',              // Local dev
    'http://localhost:3000',              // Local dev alt
    'https://noeliq.vercel.app',          // Production frontend
    'https://frontend-4q888npxw-ashu16815-gmailcoms-projects.vercel.app', // Current frontend deployment
    /https:\/\/frontend.*\.vercel\.app$/,  // Frontend preview deployments
    /https:\/\/noeliq.*\.vercel\.app$/,  // Preview deployments
    /https:\/\/.*-.*\.vercel\.app$/,     // Vercel preview URLs
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-staff-id', 'x-store-id'],
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/ask', askRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/xml', xmlRoutes)
app.use('/api/stores', storesRoutes)
app.use('/api/products', productsRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`NoelIQ backend server running on port ${PORT}`)
  })
}

// Export for Vercel serverless
export default app

