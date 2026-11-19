import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { buildPublicUrl, parseImagePayload, saveImage } from '../services/uploads'

const router = Router()

// POST /api/v1/uploads — sube una imagen (base64) para comentarios. Auth requerida.
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = parseImagePayload(req.body)
    if (!parsed.ok) {
      res.status(parsed.status).json({ ok: false, error: parsed.error })
      return
    }

    const saved = await saveImage(parsed.image)
    const origin = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`

    res.status(201).json({
      ok: true,
      data: {
        url: buildPublicUrl(saved.url, origin),
        path: saved.url,
        size: saved.size,
        contentType: saved.contentType,
      },
    })
  } catch (error) {
    console.error('Upload image error:', error)
    res.status(500).json({ ok: false, error: 'Error al subir imagen' })
  }
})

export default router
