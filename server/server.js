import 'dotenv/config'
import dns from 'node:dns'
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import authRoutes from './routes/authRoutes.js'
import sleepRoutes from './routes/sleepRoutes.js'
import foodRoutes from './routes/foodRoutes.js'
import habitRoutes from './routes/habitRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'

// Use the host's resolver by default (important on platforms like Render).
// Override only when a custom resolver has been configured explicitly.
const dnsServers = (process.env.DNS_SERVERS || '').split(',').map((server) => server.trim()).filter(Boolean)
if (dnsServers.length) dns.setServers(dnsServers)

const required = ['MONGO_URI', 'JWT_SECRET', 'PORT']
const missing = required.filter((key) => !process.env[key]?.trim())
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}
const invalid = []
if (!/^mongodb(?:\+srv)?:\/\//i.test(process.env.MONGO_URI)) invalid.push('MONGO_URI')
if (!Number.isInteger(Number(process.env.PORT)) || Number(process.env.PORT) < 1 || Number(process.env.PORT) > 65535) invalid.push('PORT (must be between 1 and 65535)')
if (invalid.length) {
  console.error(`Invalid environment configuration: ${invalid.join(', ')}`)
  process.exit(1)
}

const app = express()
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header (for example health checks) are allowed.
    if (!origin) return callback(null, true)
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    const isVercel = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(origin)
    callback(null, isLocal || isVercel || allowedOrigins.includes(origin))
  },
}))
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (_req, res) => res.json({ success: true }))
app.use('/api/auth', authRoutes)
app.use('/api/sleep', sleepRoutes)
app.use('/api/food', foodRoutes)
app.use('/api/habits', habitRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use((err, _req, res, _next) => {
  console.error('Request failed:', err.message)
  res.status(err.status || 500).json({ success: false, message: err.message || 'Something went wrong' })
})

try {
  await mongoose.connect(process.env.MONGO_URI)
  app.listen(Number(process.env.PORT), () => console.log(`Server listening on port ${process.env.PORT}`))
} catch (error) {
  console.error('Unable to connect to MongoDB:', error.message)
  process.exit(1)
}
