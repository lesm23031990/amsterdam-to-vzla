import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../lib/db'
import { authMiddleware, generateToken, AuthPayload } from '../middleware/auth'

const router = Router()

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
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
      res.status(409).json({ ok: false, error: 'El email ya está registrado' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: role || 'cliente',
      },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    })

    const token = generateToken({ userId: user.id, role: user.role as AuthPayload['role'], email: user.email })

    res.status(201).json({
      ok: true,
      data: { user, token },
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ ok: false, error: 'Error al registrar usuario' })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ ok: false, error: 'Email y contraseña son requeridos' })
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

    const token = generateToken({ userId: user.id, role: user.role as AuthPayload['role'], email: user.email })

    res.json({
      ok: true,
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ ok: false, error: 'Error al iniciar sesión' })
  }
})

router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    })

    if (!user) {
      res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
      return
    }

    res.json({ ok: true, data: user })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener usuario' })
  }
})

router.patch('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email } = req.body

    if (email) {
      const existing = await db.user.findUnique({ where: { email } })
      if (existing && existing.id !== req.user!.userId) {
        res.status(409).json({ ok: false, error: 'El email ya está en uso' })
        return
      }
    }

    const user = await db.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(email && { email }),
      },
      select: { id: true, email: true, name: true, phone: true, role: true },
    })

    res.json({ ok: true, data: user })
  } catch (error) {
    console.error('Update me error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar usuario' })
  }
})

export default router
