import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../lib/db'
import { generateToken, authMiddleware } from '../middleware/auth'

const router = Router()

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, phone, role } = req.body

  const validRoles = ['cliente', 'tienda', 'repartidor']
  if (!email || !password || !name || !role) {
    res.status(400).json({ ok: false, error: 'Faltan campos requeridos: email, password, name, role' })
    return
  }

  if (!validRoles.includes(role)) {
    res.status(400).json({ ok: false, error: `Rol inválido. Válidos: ${validRoles.join(', ')}` })
    return
  }

  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    res.status(400).json({ ok: false, error: 'Password debe tener mínimo 8 caracteres, 1 mayúscula y 1 número' })
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    res.status(400).json({ ok: false, error: 'Formato de email inválido' })
    return
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    res.status(400).json({ ok: false, error: 'Email ya registrado' })
    return
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await db.user.create({
    data: { email, password: hashedPassword, name, phone, role },
    select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
  })

  const token = generateToken({ userId: user.id, role: user.role, email: user.email })

  res.status(201).json({ ok: true, data: { user, token } })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'Email y password requeridos' })
    return
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ ok: false, error: 'Credenciales inválidas' })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ ok: false, error: 'Credenciales inválidas' })
    return
  }

  const token = generateToken({ userId: user.id, role: user.role, email: user.email })

  res.json({
    ok: true,
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    },
  })
})

router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const user = await db.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
  })

  if (!user) {
    res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
    return
  }

  res.json({ ok: true, data: user })
})

router.patch('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { name, phone } = req.body

  const user = await db.user.update({
    where: { id: req.user!.userId },
    data: { ...(name && { name }), ...(phone && { phone }) },
    select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
  })

  res.json({ ok: true, data: user })
})

export default router
