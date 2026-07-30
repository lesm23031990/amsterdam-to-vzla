import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import authRoutes from './routes/auth'

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true, name: 'amsterdam-to-vzla' })
})

app.use('/api/v1/auth', authRoutes)

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id)
  socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id))
})

const PORT = process.env.PORT || 3001
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`\n  amsterdam-to-vzla server corriendo en http://localhost:${PORT}`)
    console.log(`  API: http://localhost:${PORT}/api/v1/health\n`)
  })
}

export { app, io }
