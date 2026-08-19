import { db } from '../lib/db'

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>,
  orderId?: string
) {
  return db.notification.create({
    data: {
      userId,
      type: type as any,
      title,
      message,
      data: data || null,
      orderId: orderId || null,
    },
  })
}

export async function getUnreadCount(userId: string) {
  return db.notification.count({
    where: { userId, read: false },
  })
}
