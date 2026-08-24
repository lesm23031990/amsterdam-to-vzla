import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import path from 'path'
import dotenv from 'dotenv'

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
const envPath = path.resolve(__dirname, '..', envFile)
dotenv.config({ path: envPath })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Exchange rates
  await prisma.exchangeRate.createMany({
    data: [
      { currency: 'Bs', rate: 36.50 },
      { currency: 'USD', rate: 0.024 },
    ],
    skipDuplicates: true,
  })

  // Brands
  const frozenBrand = await prisma.brand.create({
    data: {
      name: 'Congelados Venezuela',
      slug: 'congelados-venezuela',
      description: 'Productos congelados de alta calidad',
      phone: '+58 276-1234567',
      logoImage: 'https://placehold.co/100x100',
    },
  })

  const fastFoodBrand = await prisma.brand.create({
    data: {
      name: 'FastFood Supplies',
      slug: 'fastfood-supplies',
      description: 'Insumos para comida rápida',
      phone: '+58 276-7654321',
      logoImage: 'https://placehold.co/100x100',
    },
  })

  // Products
  await prisma.product.createMany({
    data: [
      { name: 'Tequeños de Queso', description: 'Los mejores tequeños artesanales', priceCop: 15000, price: 15000, category: 'Congelados', images: ['https://placehold.co/400x300'], stock: 100, isFeatured: true, hasDiscount: false, discountPercent: 0, brandId: frozenBrand.id },
      { name: 'Mini Pizzas', description: 'Mini pizzas listas para hornear', priceCop: 22000, price: 22000, category: 'Congelados', images: ['https://placehold.co/400x300'], stock: 50, isFeatured: true, hasDiscount: true, discountPercent: 15, brandId: frozenBrand.id },
      { name: 'Empanadas de Carne', description: 'Empanadas pre-hechas', priceCop: 18000, price: 18000, category: 'Congelados', images: ['https://placehold.co/400x300'], stock: 75, hasDiscount: false, discountPercent: 0, brandId: frozenBrand.id },
      { name: 'Papas Fritas Congeladas', description: 'Bolsa 1kg papas premium', priceCop: 12000, price: 12000, category: 'Congelados', images: ['https://placehold.co/400x300'], stock: 200, hasDiscount: true, discountPercent: 30, brandId: fastFoodBrand.id },
      { name: 'Palitos de Mozzarella', description: 'Palitos para freír', priceCop: 16000, price: 16000, category: 'Congelados', images: ['https://placehold.co/400x300'], stock: 0, hasDiscount: false, discountPercent: 0, brandId: fastFoodBrand.id },
      { name: 'Deditos de Queso', description: 'Deditos crujientes', priceCop: 14000, price: 14000, category: 'Congelados', images: ['https://placehold.co/400x300'], stock: 30, hasDiscount: false, discountPercent: 0, brandId: fastFoodBrand.id },
    ],
  })

  // Admin user
  const adminEmail = 'admin@amsterdam.dev'
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash('Admin1234', 12)
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin Demo',
        role: 'admin',
        phone: '+58 414-0000000',
      },
    })
  }

  console.log('✅ Seed completed!')
  console.log('👤 Admin: admin@amsterdam.dev / Admin1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
