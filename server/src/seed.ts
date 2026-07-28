import { db } from './lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const plans = [
    { name: 'Plan Básico', price: 15, currency: 'USD', interval: 'monthly', features: ['Hasta 50 productos', 'Soporte por email'] },
    { name: 'Plan Premium', price: 30, currency: 'USD', interval: 'monthly', features: ['Productos ilimitados', 'Soporte prioritario', 'Estadísticas avanzadas'] },
    { name: 'Plan Ilimitado', price: 60, currency: 'USD', interval: 'monthly', features: ['Todo incluido', 'Soporte 24/7', 'Sin comisiones', 'API acceso completo'] },
  ]

  for (const plan of plans) {
    await db.subscriptionPlan.upsert({
      where: { id: plan.name },
      create: { ...plan, id: plan.name.toLowerCase().replace(/\s/g, '-') },
      update: {},
    })
  }

  const adminPassword = await bcrypt.hash('Admin123!', 12)
  await db.user.upsert({
    where: { email: 'admin@amsterdamtovzla.com' },
    create: { email: 'admin@amsterdamtovzla.com', password: adminPassword, name: 'Admin', role: 'admin' },
    update: {},
  })

  console.log('Seed completed: plans + admin user')
}

main().catch(console.error).finally(() => db.$disconnect())
