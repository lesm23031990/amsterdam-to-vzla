import { Router, Request, Response } from 'express'
import { db } from '../lib/db'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const rates = await db.exchangeRate.findMany()

    const rateMap: Record<string, number> = {}
    rateMap['COP'] = 1

    for (const r of rates) {
      rateMap[r.currency] = r.rate
    }

    if (!rateMap['Bs']) rateMap['Bs'] = 36.50
    if (!rateMap['USD']) rateMap['USD'] = 0.024

    res.json({
      ok: true,
      data: {
        base: 'COP',
        rates: rateMap,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Get rates error:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener tasas de cambio' })
  }
})

router.patch('/:currency', async (req: Request, res: Response) => {
  try {
    const { currency } = req.params
    const { rate } = req.body

    if (!rate || rate <= 0) {
      res.status(400).json({ ok: false, error: 'La tasa debe ser mayor a 0' })
      return
    }

    const updated = await db.exchangeRate.upsert({
      where: { currency },
      update: { rate },
      create: { currency, rate },
    })

    res.json({ ok: true, data: updated })
  } catch (error) {
    console.error('Update rate error:', error)
    res.status(500).json({ ok: false, error: 'Error al actualizar tasa' })
  }
})

export default router
