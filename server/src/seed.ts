import { db } from './lib/db'
import bcrypt from 'bcryptjs'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 12)

  // Admin
  await db.user.upsert({
    where: { email: 'admin@amsterdamtovzla.com' },
    create: { email: 'admin@amsterdamtovzla.com', password: await hash('Admin123!'), name: 'Admin', role: 'admin' },
    update: {},
  })

  // Test clients
  await db.user.upsert({
    where: { email: 'cliente@test.com' },
    create: { email: 'cliente@test.com', password: await hash('Test1234'), name: 'María García', phone: '+584161234568', role: 'cliente' },
    update: {},
  })

  // Brands (proveedores)
  const brandsData = [
    {
      name: 'Tiffany Foods',
      logoImage: 'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?w=200',
      description: 'Productos congelados de primera calidad',
      phone: '+584161234569',
      products: [
        { name: 'Nuggets de Pollo x1kg', price: 8.50, stock: 50, desc: 'Nuggets crocantes de pollo, listos para freír.', category: 'congelados' },
        { name: 'Hamburguesas Congeladas x10', price: 12.00, stock: 40, desc: 'Hamburguesas de carne 100% res, 150g c/u.', category: 'congelados' },
        { name: 'Papas Fritas Congeladas x2kg', price: 6.00, stock: 60, desc: 'Papas pre-fritas, listas para horno o freidora.', category: 'congelados' },
        { name: 'Pizza Pepperoni Congelada', price: 7.50, stock: 30, desc: 'Pizza familiar lista para hornear.', category: 'congelados' },
        { name: 'Aros de Cebolla x500g', price: 4.50, stock: 35, desc: 'Aros de cebolla empanizados.', category: 'congelados' },
        { name: 'Dedos de Queso Mozzarella x1kg', price: 7.00, stock: 20, desc: 'Dedos de queso listos para freír.', category: 'congelados' },
        { name: 'Pollo Entero Congelado', price: 10.00, stock: 15, desc: 'Pollo entero limpio, aprox 2.5kg.', category: 'congelados' },
        { name: 'Filetes de Pescado x500g', price: 6.50, stock: 20, desc: 'Filetes de merluza empanizados.', category: 'congelados' },
      ],
    },
    {
      name: 'Frisaba',
      logoImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200',
      description: 'Insumos y suministros para comida rápida',
      phone: '+584161234570',
      products: [
        { name: 'Pan de Hamburguesa x12', price: 4.00, stock: 50, desc: 'Pan suave con ajonjolí para hamburguesas.', category: 'panaderia' },
        { name: 'Pan de Hot Dog x12', price: 3.50, stock: 60, desc: 'Pan largo y suave para hot dogs.', category: 'panaderia' },
        { name: 'Salsa de Tomate 5L', price: 8.00, stock: 20, desc: 'Salsa tipo ketchup para negocio.', category: 'salsas' },
        { name: 'Mostaza Industrial 3L', price: 6.50, stock: 25, desc: 'Mostaza amarilla para food service.', category: 'salsas' },
        { name: 'Mayonesa 4L', price: 7.00, stock: 20, desc: 'Mayonesa cremosa para uso comercial.', category: 'salsas' },
        { name: 'Servilletas x500', price: 3.00, stock: 40, desc: 'Servilletas blancas de papel.', category: 'insumos' },
        { name: 'Vasos Plásticos x100', price: 4.50, stock: 35, desc: 'Vasos de 16oz transparentes.', category: 'insumos' },
        { name: 'Platos Desechables x50', price: 6.00, stock: 25, desc: 'Platos de cartón resistentes.', category: 'insumos' },
      ],
    },
    {
      name: 'Helados Artesanales SC',
      logoImage: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200',
      description: 'Helados, paletas y postres congelados artesanales',
      phone: '+584161234572',
      products: [
        { name: 'Donas Congeladas x24', price: 12.00, stock: 20, desc: 'Donas glaseadas listas para descongelar.', category: 'postres' },
        { name: 'Paletas de Chocolate x12', price: 6.00, stock: 30, desc: 'Paletas bañadas en chocolate belga.', category: 'postres' },
        { name: 'Torta Helada Chocolate 1kg', price: 10.00, stock: 10, desc: 'Torta helada de chocolate premium.', category: 'postres' },
        { name: 'Torta Helada Vainilla 1kg', price: 9.00, stock: 10, desc: 'Torta helada de vainilla clásica.', category: 'postres' },
        { name: 'Brownies Congelados x12', price: 8.00, stock: 15, desc: 'Brownies de chocolate intenso.', category: 'postres' },
        { name: 'Cheesecake de Fresa', price: 11.00, stock: 8, desc: 'Cheesecake con salsa de fresa natural.', category: 'postres' },
        { name: 'Mousse de Mango Congelado', price: 7.50, stock: 12, desc: 'Mousse cremoso de mango tropical.', category: 'postres' },
        { name: 'Tiramisú Congelado', price: 12.00, stock: 6, desc: 'Tiramisú italiano con café real.', category: 'postres' },
      ],
    },
  ]

  // Productos sin marca (Amsterdam Frozen Foods)
  const unbrandedProducts = [
    { name: 'Helado Familiar Vainilla 1L', price: 5.00, stock: 25, desc: 'Helado cremoso de vainilla natural.', category: 'congelados' },
    { name: 'Vegetales Mixtos Congelados x1kg', price: 4.00, stock: 40, desc: 'Mix de brócoli, zanahoria, maíz y arvejas.', category: 'congelados' },
    { name: 'Gasas para Hamburguesa x200', price: 5.50, stock: 30, desc: 'Separadores de papel para hamburguesas.', category: 'insumos' },
    { name: 'Papel Aluminio Rollo', price: 5.00, stock: 30, desc: 'Rollo de 30m para envolver alimentos.', category: 'insumos' },
  ]

  // Create brands and their products
  for (const bd of brandsData) {
    const slug = slugify(bd.name)
    const brand = await db.brand.upsert({
      where: { slug },
      create: { name: bd.name, slug, description: bd.description, phone: bd.phone, logoImage: bd.logoImage },
      update: {},
    })

    await db.product.deleteMany({ where: { brandId: brand.id } })
    await db.product.createMany({
      data: bd.products.map(p => ({
        brandId: brand.id,
        name: p.name,
        description: p.desc,
        price: p.price,
        currency: 'USD',
        category: p.category,
        images: [bd.logoImage],
        stock: p.stock,
        isActive: true,
      })),
    })
  }

  // Create unbranded products
  const defaultImage = 'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?w=200'
  await db.product.createMany({
    data: unbrandedProducts.map(p => ({
      brandId: null,
      name: p.name,
      description: p.desc,
      price: p.price,
      currency: 'USD',
      category: p.category,
      images: [defaultImage],
      stock: p.stock,
      isActive: true,
    })),
  })

  console.log('Seed completado: 3 marcas, 28 productos con marca, 4 sin marca, admin + cliente')
  console.log('\n📧 Credenciales:')
  console.log('   Admin:  admin@amsterdamtovzla.com / Admin123!')
  console.log('   Cliente: cliente@test.com / Test1234')
}

main().catch(console.error).finally(() => db.$disconnect())
