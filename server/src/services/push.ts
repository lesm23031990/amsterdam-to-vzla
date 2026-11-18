import { db } from '../lib/db'

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
export const MAX_PUSH_BATCH_SIZE = 100

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, string>
}

interface ExpoPushTicket {
  status?: 'ok' | 'error'
  details?: { error?: string }
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[]
}

interface ExpoPushRequestBody {
  to: string
  sound: 'default'
  title: string
  body: string
  priority: 'high'
  channelId: string
  data: Record<string, string>
}

/**
 * Envía una notificación push a todos los dispositivos registrados del usuario.
 *
 * Es fire-and-forget: cualquier fallo (red, Expo caído, tabla vacía) se registra
 * en el log pero nunca interrumpe la creación de la notificación ni la respuesta
 * HTTP que lo originó. Los tokens que Expo reporta como `DeviceNotRegistered`
 * se eliminan para no reintentar dispositivos desinstalados.
 */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<void> {
  try {
    const tokens = await db.pushToken.findMany({
      where: { userId },
      select: { token: true },
    })

    if (tokens.length === 0) return

    const staleTokens: string[] = []

    for (let index = 0; index < tokens.length; index += MAX_PUSH_BATCH_SIZE) {
      const batch = tokens.slice(index, index + MAX_PUSH_BATCH_SIZE)
      const body: ExpoPushRequestBody[] = batch.map(({ token }) => ({
        to: token,
        sound: 'default',
        title: message.title,
        body: message.body,
        priority: 'high',
        channelId: 'default',
        data: { ...(message.data ?? {}) },
      }))

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          console.error(`Expo push respondió ${response.status}`)
          continue
        }

        const payload = (await response.json()) as ExpoPushResponse
        payload.data?.forEach((ticket, ticketIndex) => {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const stale = batch[ticketIndex]
            if (stale) staleTokens.push(stale.token)
          }
        })
      } catch (batchError) {
        console.error('Error enviando lote de push:', batchError)
      }
    }

    if (staleTokens.length > 0) {
      await db.pushToken.deleteMany({ where: { token: { in: staleTokens } } })
    }
  } catch (error) {
    console.error('Error enviando push:', error)
  }
}
