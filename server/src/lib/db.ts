import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = process.env.DATABASE_URL
  ? new PrismaPg({ connectionString: process.env.DATABASE_URL })
  : new PrismaPg({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: String(process.env.DB_PASSWORD ?? ''),
      database: process.env.DB_NAME ?? 'amsterdam_to_vzla',
    })

export const db = new PrismaClient({ adapter })
