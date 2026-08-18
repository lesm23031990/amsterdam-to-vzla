import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app } from '../index'
import http from 'http'

vi.mock('../lib/db', () => {
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@ejemplo.com',
    password: '',
    name: 'Test User',
    phone: '+584141234567',
    role: 'cliente',
    createdAt: new Date('2026-07-27'),
  }

  let users: any[] = []

  return {
    db: {
      user: {
        findUnique: vi.fn(({ where }: { where: { id?: string; email?: string } }) => {
          return Promise.resolve(users.find(u => u.email === where.email || u.id === where.id) || null)
        }),
        create: vi.fn(({ data }: { data: any }) => {
          const newUser = { ...mockUser, ...data, id: mockUser.id }
          users.push(newUser)
          return Promise.resolve({ ...newUser, select: undefined })
        }),
        update: vi.fn(({ where, data }: { where: { id: string }; data: any }) => {
          const idx = users.findIndex(u => u.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          users[idx] = { ...users[idx], ...data }
          return Promise.resolve(users[idx])
        }),
      },
    },
  }
})

function request(method: string, path: string, body?: any, token?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)
    server.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') return

      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: addr.port,
        path,
        method,
        headers: { 'Content-Type': 'application/json' } as any,
      }

      if (token) {
        (options.headers as any)['Authorization'] = `Bearer ${token}`
      }

      const req = http.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          server.close()
          resolve({ status: res.statusCode || 0, body: data ? JSON.parse(data) : {} })
        })
      })

      req.on('error', reject)
      if (body) req.write(JSON.stringify(body))
      req.end()
    })
  })
}

describe('Auth - Register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registra un usuario correctamente', async () => {
    const res = await request('POST', '/api/v1/auth/register', {
      email: 'nuevo@ejemplo.com',
      password: 'Str0ngPass1',
      name: 'Nuevo Usuario',
      phone: '+584141234567',
      role: 'cliente',
    })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.user.email).toBe('nuevo@ejemplo.com')
    expect(res.body.data.token).toBeTruthy()
  })

  it('rechaza email duplicado', async () => {
    await request('POST', '/api/v1/auth/register', {
      email: 'test@ejemplo.com',
      password: 'Str0ngPass1',
      name: 'Test',
      role: 'cliente',
    })
    const res = await request('POST', '/api/v1/auth/register', {
      email: 'test@ejemplo.com',
      password: 'Str0ngPass1',
      name: 'Test',
      role: 'cliente',
    })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('El email ya está registrado')
  })

  it('rechaza password débil', async () => {
    const res = await request('POST', '/api/v1/auth/register', {
      email: 'weak@ejemplo.com',
      password: 'abc',
      name: 'Test',
      role: 'cliente',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Password')
  })

  it('ignora role enviado y siempre crea cliente', async () => {
    const res = await request('POST', '/api/v1/auth/register', {
      email: 'bad@ejemplo.com',
      password: 'Str0ngPass1',
      name: 'Test',
      role: 'superadmin',
    })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.user.role).toBe('cliente')
  })

  it('rechaza email inválido', async () => {
    const res = await request('POST', '/api/v1/auth/register', {
      email: 'no-es-un-email',
      password: 'Str0ngPass1',
      name: 'Test',
      role: 'cliente',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('email')
  })
})

describe('Auth - Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inicia sesión con credenciales válidas', async () => {
    const res = await request('POST', '/api/v1/auth/login', {
      email: 'test@ejemplo.com',
      password: 'Str0ngPass1',
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.token).toBeTruthy()
  })

  it('rechaza credenciales inválidas', async () => {
    const res = await request('POST', '/api/v1/auth/login', {
      email: 'noexiste@ejemplo.com',
      password: 'WrongPass1',
    })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Credenciales inválidas')
  })

  it('requiere email y password', async () => {
    const res = await request('POST', '/api/v1/auth/login', { email: 'test@ejemplo.com' })
    expect(res.status).toBe(400)
  })
})

describe('Auth - Me', () => {
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    const res = await request('POST', '/api/v1/auth/login', {
      email: 'test@ejemplo.com',
      password: 'Str0ngPass1',
    })
    token = res.body.data?.token
  })

  it('obtiene perfil con token válido', async () => {
    const res = await request('GET', '/api/v1/auth/me', undefined, token)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.email).toBeTruthy()
  })

  it('rechaza sin token', async () => {
    const res = await request('GET', '/api/v1/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
  })
})
