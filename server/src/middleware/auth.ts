import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'

export interface AuthPayload {
  userId: string
  role: 'cliente' | 'admin'
  email: string
}

export interface DriverSession {
  id: string
  userId: string
  isActive: boolean
  isOnline: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
      driver?: DriverSession
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'Token requerido' })
    return
  }
  try {
    const token = header.slice(7)
    req.user = jwt.verify(token, JWT_SECRET) as AuthPayload
    next()
  } catch {
    res.status(401).json({ ok: false, error: 'Token inválido o expirado' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ ok: false, error: 'No autorizado para esta acción' })
      return
    }
    next()
  }
}

/**
 * Autoriza a usuarios con un registro Driver activo.
 * Según spec-16, un repartidor mantiene rol `cliente` + perfil en `drivers`.
 */
export async function requireDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ ok: false, error: 'Token requerido' })
    return
  }

  try {
    const driver = await db.driver.findUnique({ where: { userId: req.user.userId } })

    if (!driver || !driver.isActive) {
      res.status(403).json({ ok: false, error: 'No autorizado: no eres un repartidor activo' })
      return
    }

    req.driver = {
      id: driver.id,
      userId: driver.userId,
      isActive: driver.isActive,
      isOnline: driver.isOnline,
    }
    next()
  } catch (error) {
    console.error('Require driver error:', error)
    res.status(500).json({ ok: false, error: 'Error al validar repartidor' })
  }
}
