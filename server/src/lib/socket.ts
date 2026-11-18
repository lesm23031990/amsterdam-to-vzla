import jwt from 'jsonwebtoken'
import type { Server, Socket } from 'socket.io'
import { db } from './db'
import { JWT_SECRET, type AuthPayload } from '../middleware/auth'

export interface JoinAck {
  ok: boolean
  error?: string
}

/**
 * Valida el JWT enviado en el handshake (`auth.token`).
 * Sin token válido la conexión se rechaza, de modo que nadie pueda
 * escuchar rooms ajenas (notificaciones, tracking de pedidos).
 */
export function authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token
  if (typeof token !== 'string' || token.trim().length === 0) {
    next(new Error('Token requerido'))
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    socket.data.userId = payload.userId
    socket.data.role = payload.role
    next()
  } catch {
    next(new Error('Token inválido o expirado'))
  }
}

export function registerSocketHandlers(io: Server): void {
  io.use(authenticateSocket)

  io.on('connection', (socket: Socket) => {
    console.log('Cliente conectado:', socket.id)

    // Room personal: solo el propio usuario (o admin) puede unirse.
    socket.on('join', (userId: string) => {
      if (!socket.data.userId) return
      if (userId !== socket.data.userId && socket.data.role !== 'admin') {
        console.warn(`Socket ${socket.id} intentó unirse al room ajeno ${userId}`)
        return
      }
      socket.join(userId)
      console.log(`Usuario ${userId} unido a su room`)
    })

    // Room por pedido: requiere ser dueño del pedido (o admin).
    socket.on('join:order', async (orderId: string, ack?: (res: JoinAck) => void) => {
      try {
        if (typeof orderId !== 'string' || orderId.trim().length === 0) {
          ack?.({ ok: false, error: 'orderId requerido' })
          return
        }

        const order = await db.order.findUnique({
          where: { id: orderId },
          select: { userId: true },
        })

        if (!order) {
          ack?.({ ok: false, error: 'Pedido no encontrado' })
          return
        }

        if (order.userId !== socket.data.userId && socket.data.role !== 'admin') {
          ack?.({ ok: false, error: 'No autorizado para seguir este pedido' })
          return
        }

        socket.join(orderId)
        ack?.({ ok: true })
        console.log(`Socket ${socket.id} unido al pedido ${orderId}`)
      } catch (error) {
        console.error('Join order error:', error)
        ack?.({ ok: false, error: 'Error al unirse al pedido' })
      }
    })

    socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id))
  })
}
