import { db } from './lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 12)

  const admin = await db.user.upsert({
    where: { email: 'admin@amsterdamtovzla.com' },
    create: { email: 'admin@amsterdamtovzla.com', password: await hash('Admin123!'), name: 'Admin', role: 'admin' },
    update: {},
  })

  const storeOwners = [
    { email: 'carlos@test.com', name: 'Carlos Mendoza', phone: '+584161234501', storeSlug: 'congelados-del-este' },
    { email: 'maria@test.com', name: 'María Pérez', phone: '+584161234502', storeSlug: 'comida-rapida-supplies' },
    { email: 'ana@test.com', name: 'Ana Guerrero', phone: '+584161234504', storeSlug: 'helados-y-mas' },
  ]

  for (const owner of storeOwners) {
    await db.user.upsert({
      where: { email: owner.email },
      create: { email: owner.email, password: await hash('Test1234'), name: owner.name, phone: owner.phone, role: 'cliente' },
      update: {},
    })
  }

  const client = await db.user.upsert({
    where: { email: 'cliente@test.com' },
    create: { email: 'cliente@test.com', password: await hash('Test1234'), name: 'María García', phone: '+584161234568', role: 'cliente' },
    update: {},
  })

  const storesData = [
    {
      slug: 'congelados-del-este', name: 'Congelados del Este', category: 'congelados',
      description: 'Productos congelados de primera calidad para tu hogar o negocio.',
      phone: '+584161234569', address: 'Av. Principal, San Cristóbal', ownerEmail: 'carlos@test.com',
      coverImage: 'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?w=800',
      logoImage: 'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?w=200',
      products: [
        { name: 'Nuggets de Pollo x1kg', price: 8.50, stock: 50, desc: 'Nuggets crocantes de pollo, listos para freír.' },
        { name: 'Hamburguesas Congeladas x10', price: 12.00, stock: 40, desc: 'Hamburguesas de carne 100% res, 150g c/u.' },
        { name: 'Papas Fritas Congeladas x2kg', price: 6.00, stock: 60, desc: 'Papas pre-fritas, listas para horno o freidora.' },
        { name: 'Pizza Pepperoni Congelada', price: 7.50, stock: 30, desc: 'Pizza familiar lista para hornear.' },
        { name: 'Helado Familiar Vainilla 1L', price: 5.00, stock: 25, desc: 'Helado cremoso de vainilla natural.' },
        { name: 'Aros de Cebolla x500g', price: 4.50, stock: 35, desc: 'Aros de cebolla empanizados.' },
        { name: 'Dedos de Queso Mozzarella x1kg', price: 7.00, stock: 20, desc: 'Dedos de queso listos para freír.' },
        { name: 'Pollo Entero Congelado', price: 10.00, stock: 15, desc: 'Pollo entero limpio, aprox 2.5kg.' },
        { name: 'Filetes de Pescado x500g', price: 6.50, stock: 20, desc: 'Filetes de merluza empanizados.' },
        { name: 'Vegetales Mixtos Congelados x1kg', price: 4.00, stock: 40, desc: 'Mix de brócoli, zanahoria, maíz y arvejas.' },
      ],
    },
    {
      slug: 'comida-rapida-supplies', name: 'Comida Rápida Supplies', category: 'comida-rapida',
      description: 'Insumos y suministros para negocios de comida rápida.',
      phone: '+584161234570', address: 'CC Sambil, Local 15, San Cristóbal', ownerEmail: 'maria@test.com',
      coverImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
      logoImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200',
      products: [
        { name: 'Pan de Hamburguesa x12', price: 4.00, stock: 50, desc: 'Pan suave con ajonjolí para hamburguesas.' },
        { name: 'Pan de Hot Dog x12', price: 3.50, stock: 60, desc: 'Pan largo y suave para hot dogs.' },
        { name: 'Salsa de Tomate 5L', price: 8.00, stock: 20, desc: 'Salsa tipo ketchup para negocio.' },
        { name: 'Mostaza Industrial 3L', price: 6.50, stock: 25, desc: 'Mostaza amarilla para food service.' },
        { name: 'Mayonesa 4L', price: 7.00, stock: 20, desc: 'Mayonesa cremosa para uso comercial.' },
        { name: 'Papel Aluminio Rollo', price: 5.00, stock: 30, desc: 'Rollo de 30m para envolver alimentos.' },
        { name: 'Servilletas x500', price: 3.00, stock: 40, desc: 'Servilletas blancas de papel.' },
        { name: 'Vasos Plásticos x100', price: 4.50, stock: 35, desc: 'Vasos de 16oz transparentes.' },
        { name: 'Platos Desechables x50', price: 6.00, stock: 25, desc: 'Platos de cartón resistentes.' },
        { name: 'Gasas para Hamburguesa x200', price: 5.50, stock: 30, desc: 'Separadores de papel para hamburguesas.' },
      ],
    },
    {
      slug: 'helados-y-mas', name: 'Helados y Más', category: 'congelados',
      description: 'Helados, paletas y postres congelados artesanales.',
      phone: '+584161234572', address: 'Mercado Principal, Local 8', ownerEmail: 'ana@test.com',
      coverImage: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800',
      logoImage: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200',
      products: [
        { name: 'Donas Congeladas x24', price: 12.00, stock: 20, desc: 'Donas glaseadas listas para descongelar.' },
        { name: 'Paletas de Chocolate x12', price: 6.00, stock: 30, desc: 'Paletas bañadas en chocolate belga.' },
        { name: 'Torta Helada Chocolate 1kg', price: 10.00, stock: 10, desc: 'Torta helada de chocolate premium.' },
        { name: 'Torta Helada Vainilla 1kg', price: 9.00, stock: 10, desc: 'Torta helada de vainilla clásica.' },
        { name: 'Brownies Congelados x12', price: 8.00, stock: 15, desc: 'Brownies de chocolate intenso.' },
        { name: 'Cheesecake de Fresa', price: 11.00, stock: 8, desc: 'Cheesecake con salsa de fresa natural.' },
        { name: 'Mousse de Mango Congelado', price: 7.50, stock: 12, desc: 'Mousse cremoso de mango tropical.' },
        { name: 'Tiramisú Congelado', price: 12.00, stock: 6, desc: 'Tiramisú italiano con café real.' },
      ],
    },
  ]

  for (const sd of storesData) {
    const owner = await db.user.findUnique({ where: { email: sd.ownerEmail } })
    if (!owner) continue

    const store = await db.store.upsert({
      where: { slug: sd.slug },
      create: { name: sd.name, slug: sd.slug, description: sd.description, phone: sd.phone, address: sd.address, category: sd.category, coverImage: sd.coverImage, logoImage: sd.logoImage, ownerId: owner.id },
      update: {},
    })

    await db.product.deleteMany({ where: { storeId: store.id } })
    await db.product.createMany({
      data: sd.products.map(p => ({
        storeId: store.id, name: p.name, description: p.desc, price: p.price, currency: 'USD', category: sd.category,
        images: [sd.coverImage], stock: p.stock, isActive: true,
      })),
    })
  }

  console.log('Seed completado: 3 tiendas, 28 productos, admin + clientes de prueba')
  console.log('\n📧 Credenciales:')
  console.log('   Admin:  admin@amsterdamtovzla.com / Admin123!')
  console.log('   Cliente: cliente@test.com / Test1234')
}

main().catch(console.error).finally(() => db.$disconnect())
