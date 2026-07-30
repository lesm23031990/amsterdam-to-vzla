import { Router, Request, Response } from 'express'
import { db } from '../lib/db'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body
    if (!message) {
      res.status(400).json({ ok: false, error: 'Mensaje es requerido' })
      return
    }

    let conversation
    if (conversationId) {
      conversation = await db.conversation.findUnique({ where: { id: conversationId } })
      if (!conversation || conversation.userId !== req.user!.userId) {
        res.status(404).json({ ok: false, error: 'Conversación no encontrada' })
        return
      }
    } else {
      conversation = await db.conversation.create({
        data: { userId: req.user!.userId },
      })
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    const apiKey = process.env.OPENROUTER_API_KEY
    let reply: string
    let suggestedActions: string[] = []

    if (apiKey) {
      const previousMessages = await db.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20,
      })

      const chatMessages = previousMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const systemMessage = {
        role: 'system',
        content: 'Eres un asistente virtual de amsterdamToVzla, una plataforma de comercio electrónico en San Cristóbal, Venezuela. Ayudas a clientes con dudas sobre compras, pedidos, entregas, etc. Responde en español de forma clara y concisa.',
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [systemMessage, ...chatMessages],
          max_tokens: 500,
        }),
      })

      if (!response.ok) {
        throw new Error('OpenRouter API error: ' + response.statusText)
      }

      const data = await response.json() as { choices: { message: { content: string } }[] }
      reply = data.choices?.[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje.'
    } else {
      reply = 'Soy el asistente de amsterdamToVzla. ¿En qué puedo ayudarte?'
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: reply,
      },
    })

    suggestedActions = [
      'Ver mis pedidos',
      'Rastrear entrega',
      'Buscar productos',
      'Ayuda con pago',
      'Hablar con soporte',
    ]

    res.json({ ok: true, data: { conversationId: conversation.id, reply, suggestedActions } })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ ok: false, error: 'Error al procesar mensaje' })
  }
})

router.get('/conversations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const conversations = await db.conversation.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    })

    const data = conversations.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
      lastMessage: c.messages[0] || null,
    }))

    res.json({ ok: true, data })
  } catch (error) {
    console.error('List conversations error:', error)
    res.status(500).json({ ok: false, error: 'Error al listar conversaciones' })
  }
})

router.get('/conversations/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const conversation = await db.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    })

    if (!conversation) {
      res.status(404).json({ ok: false, error: 'Conversación no encontrada' })
      return
    }
    if (conversation.userId !== req.user!.userId) {
      res.status(403).json({ ok: false, error: 'No autorizado para ver esta conversación' })
      return
    }

    res.json({ ok: true, data: conversation })
  } catch (error) {
    console.error('Get conversation error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener conversación' })
  }
})

router.delete('/conversations/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const conversation = await db.conversation.findUnique({ where: { id: req.params.id } })
    if (!conversation) {
      res.status(404).json({ ok: false, error: 'Conversación no encontrada' })
      return
    }
    if (conversation.userId !== req.user!.userId) {
      res.status(403).json({ ok: false, error: 'No autorizado para eliminar esta conversación' })
      return
    }

    await db.message.deleteMany({ where: { conversationId: conversation.id } })
    await db.conversation.delete({ where: { id: conversation.id } })
    res.json({ ok: true, data: null })
  } catch (error) {
    console.error('Delete conversation error:', error)
    res.status(500).json({ ok: false, error: 'Error al eliminar conversación' })
  }
})

export default router
