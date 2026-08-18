import { db } from './lib/db'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import authRoutes from './routes/auth'
import brandRoutes from './routes/brands'
import productRoutes from './routes/products'
import cartRoutes from './routes/cart'
import checkoutRoutes from './routes/checkout'
import deliveryRoutes from './routes/delivery'
import fastfoodRoutes from './routes/fastfood'
import adminRoutes from './routes/admin'
import assistantRoutes from './routes/assistant'

const app = express()
const httpServer = createServer(app)
const corsOriginRaw = process.env.CORS_ORIGIN || '*'
const corsOrigin: string | string[] =
  corsOriginRaw === '*' ? '*' : corsOriginRaw.split(',').map((s) => s.trim()).filter(Boolean)
const io = new SocketIOServer(httpServer, { cors: { origin: corsOrigin } })

app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '10mb' }))

app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true, name: 'amsterdam-to-vzla' })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/brands', brandRoutes)
app.use('/api/v1/products', productRoutes)
app.use('/api/v1/cart', cartRoutes)
app.use('/api/v1/checkout', checkoutRoutes)
app.use('/api/v1/delivery', deliveryRoutes)
app.use('/api/v1/fastfood', fastfoodRoutes)
app.use('/api/v1/assistant', assistantRoutes)
app.use('/api/v1/admin', adminRoutes)

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id)
  socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id))
})

const PORT = process.env.PORT || 3001
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`\n  amsterdam-to-vzla server corriendo en http://localhost:${PORT}`)
  })
}

export { app, io }
