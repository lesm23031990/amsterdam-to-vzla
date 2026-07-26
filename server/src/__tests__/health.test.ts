import { describe, it, expect } from 'vitest'
import { app } from '../index'
import http from 'http'

function get(path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app)
    server.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') return
      http.get(`http://localhost:${addr.port}${path}`, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          server.close()
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) })
        })
      }).on('error', reject)
    })
  })
}

describe('Health endpoint', () => {
  it('returns ok with app name', async () => {
    const res = await get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.name).toBe('amsterdam-to-vzla')
  })
})
