import './lib/load-env'
import { db } from './lib/db'

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function main() {
  const active = await db.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, isFeatured: true, hasDiscount: true, discountPercent: true, soldCount: true, stock: true },
  })

  if (active.length === 0) {
    console.log('No hay productos activos. Crea productos desde /admin primero.')
    return
  }

  // Featured: ensure at least 3 for the bento (top sellers first)
  const featured = active.filter(p => p.isFeatured)
  let featuredChanged: string[] = []
  if (featured.length < 3) {
    const candidates = shuffle(active.filter(p => !p.isFeatured && p.stock > 0))
      .sort((a, b) => b.soldCount - a.soldCount)
    const toFix = candidates.slice(0, 3 - featured.length)
    for (const p of toFix) {
      await db.product.update({ where: { id: p.id }, data: { isFeatured: true } })
      featuredChanged.push(p.name)
    }
  }

  // Offers: ensure exactly 4 active discounts (like the prototype "Ofertas del Dia")
  const currentOffers = active.filter(p => p.hasDiscount)
  const usedPercentages = new Set(currentOffers.map(o => o.discountPercent))
  let offersChanged: string[] = []
  if (currentOffers.length < 4) {
    const candidates = shuffle(active.filter(p => !p.hasDiscount && p.stock > 0))
    const toFix = candidates.slice(0, 4 - currentOffers.length)
    for (const p of toFix) {
      let pct = randomInt(25, 36)
      while (usedPercentages.has(pct)) pct = randomInt(25, 36)
      usedPercentages.add(pct)
      await db.product.update({ where: { id: p.id }, data: { hasDiscount: true, discountPercent: pct } })
      offersChanged.push(`${p.name} (-${pct}%)`)
    }
  }

  console.log('--- Seed de home completado ---')
  console.log(`Destacados: ${featured.length + featuredChanged.length}${featuredChanged.length ? ` | nuevos: ${featuredChanged.join(', ')}` : ' (ya estaban bien)'}`)
  console.log(`Ofertas: ${currentOffers.length + offersChanged.length}${offersChanged.length ? ` | nuevas: ${offersChanged.join(', ')}` : ' (ya estaban bien)'}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
