import 'dotenv/config'
import { db } from './lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 12)

  const plans = [
    { id: 'plan-basico', name: 'Plan Básico', price: 15, currency: 'USD', interval: 'monthly', features: ['Hasta 50 productos', 'Soporte por email'] },
    { id: 'plan-premium', name: 'Plan Premium', price: 30, currency: 'USD', interval: 'monthly', features: ['Productos ilimitados', 'Soporte prioritario', 'Estadísticas avanzadas'] },
    { id: 'plan-ilimitado', name: 'Plan Ilimitado', price: 60, currency: 'USD', interval: 'monthly', features: ['Todo incluido', 'Soporte 24/7', 'Sin comisiones', 'API acceso completo'] },
  ]

  for (const plan of plans) {
    await db.subscriptionPlan.upsert({ where: { id: plan.id }, create: plan, update: {} })
  }

  const admin = await db.user.upsert({
    where: { email: 'admin@amsterdamtovzla.com' },
    create: { email: 'admin@amsterdamtovzla.com', password: await hash('Admin123!'), name: 'Admin', role: 'admin' },
    update: {},
  })

  const storeOwners = [
    { email: 'carlos@test.com', name: 'Carlos Mendoza', phone: '+584161234501', storeSlug: 'panaderia-san-cristobal' },
    { email: 'maria@test.com', name: 'María Pérez', phone: '+584161234502', storeSlug: 'electro-hogar' },
    { email: 'jose@test.com', name: 'José Contreras', phone: '+584161234503', storeSlug: 'moda-urbana' },
    { email: 'ana@test.com', name: 'Ana Guerrero', phone: '+584161234504', storeSlug: 'artesania-andina' },
    { email: 'luis@test.com', name: 'Luis Rojas', phone: '+584161234505', storeSlug: 'super-bodegon' },
    { email: 'carmen@test.com', name: 'Carmen Duque', phone: '+584161234506', storeSlug: 'pizzeria-roma' },
  ]

  for (const owner of storeOwners) {
    await db.user.upsert({
      where: { email: owner.email },
      create: { email: owner.email, password: await hash('Test1234'), name: owner.name, phone: owner.phone, role: 'tienda' },
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
      slug: 'panaderia-san-cristobal', name: 'Panadería San Cristóbal', category: 'comida',
      description: 'Pan artesanal, tortas y postres tradicionales. Horneamos con amor desde 1990.',
      phone: '+584161234569', address: 'Av. Principal, Carrera 5 #10-20', ownerEmail: 'carlos@test.com',
      coverImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
      logoImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
      products: [
        { name: 'Pan Artesanal de Trigo', price: 3.50, stock: 50, desc: 'Pan de trigo orgánico horneado en horno de leña. 500g.' },
        { name: 'Pan de Cachito', price: 1.20, stock: 100, desc: 'Pan relleno de jamón y queso amarillo. Ideal para desayuno.' },
        { name: 'Torta Tres Leches', price: 12.00, stock: 10, desc: 'Torta esponjosa bañada en tres leches con crema chantillí.' },
        { name: 'Golfeados (6 uds)', price: 4.50, stock: 20, desc: 'Pan dulce enrollado con papelón, queso y anís.' },
        { name: 'Pan de Jamón', price: 5.00, stock: 15, desc: 'Pan relleno de jamón, tocineta, pasas y aceitunas.' },
        { name: 'Croissant de Chocolate', price: 2.50, stock: 30, desc: 'Croissant hojaldrado relleno de chocolate belga.' },
        { name: 'Bizcocho de Zanahoria', price: 8.00, stock: 8, desc: 'Bizcocho húmedo de zanahoria con frosting de queso crema.' },
        { name: 'Pan Integral con Semillas', price: 4.00, stock: 40, desc: 'Pan de harina integral con chía y linaza. 400g.' },
        { name: 'Empanadas de Carne (6 uds)', price: 6.00, stock: 25, desc: 'Empanadas fritas rellenas de carne mechada.' },
        { name: 'Tequeños (12 uds)', price: 5.50, stock: 20, desc: 'Palitos de queso envueltos en masa. Ideales para fiestas.' },
        { name: 'Pónchalo', price: 2.00, stock: 35, desc: 'Pan dulce relleno de crema pastelera con cobertura de chocolate.' },
        { name: 'Pastelito de Pollo', price: 1.80, stock: 50, desc: 'Pastelito horneado relleno de pollo y vegetales.' },
      ],
    },
    {
      slug: 'electro-hogar', name: 'Electro Hogar', category: 'electronica',
      description: 'Electrodomésticos, gadgets y tecnología para tu hogar al mejor precio.',
      phone: '+584161234570', address: 'CC Sambil, Local 15, Nivel 2', ownerEmail: 'maria@test.com',
      coverImage: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800',
      logoImage: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=200',
      products: [
        { name: 'Auriculares Bluetooth Sony', price: 45.00, stock: 20, desc: 'Auriculares inalámbricos con cancelación de ruido.' },
        { name: 'Cargador Portátil 20000mAh', price: 25.00, stock: 30, desc: 'Batería externa rápida con doble puerto USB.' },
        { name: 'Parlante Portátil JBL', price: 35.00, stock: 15, desc: 'Altavoz Bluetooth resistente al agua. 12h de batería.' },
        { name: 'Smart TV 43" 4K', price: 320.00, stock: 8, desc: 'Televisor LED Ultra HD con Smart TV integrado.' },
        { name: 'Lámpara LED Inteligente', price: 18.00, stock: 25, desc: 'Lámpara WiFi con cambio de color y control por app.' },
        { name: 'Teclado Mecánico RGB', price: 40.00, stock: 12, desc: 'Teclado gaming con switches Cherry MX y retroiluminación.' },
        { name: 'Mouse Inalámbrico', price: 15.00, stock: 40, desc: 'Mouse ergonómico con sensor óptico de 1600 DPI.' },
        { name: 'Cámara Web HD 1080p', price: 30.00, stock: 18, desc: 'Cámara con micrófono integrado y enfoque automático.' },
        { name: 'Hub USB-C 7 puertos', price: 22.00, stock: 22, desc: 'Adaptador multiusb con HDMI, USB3.0 y lector SD.' },
        { name: 'Smartwatch Deportivo', price: 55.00, stock: 10, desc: 'Reloj inteligente con GPS, pulsómetro y 30 modos deportivos.' },
      ],
    },
    {
      slug: 'moda-urbana', name: 'Moda Urbana SC', category: 'ropa',
      description: 'Ropa casual, zapatos y accesorios. Las mejores marcas internacionales.',
      phone: '+584161234571', address: 'Calle 7 #15-30, Centro', ownerEmail: 'jose@test.com',
      coverImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
      logoImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200',
      products: [
        { name: 'Camiseta Algodón Premium', price: 18.00, stock: 50, desc: 'Camiseta de algodón orgánico. Disponible en 6 colores.' },
        { name: 'Jeans Skinny Fit', price: 35.00, stock: 30, desc: 'Jeans elásticos de corte moderno. Tallas S-XL.' },
        { name: 'Chaqueta Impermeable', price: 55.00, stock: 15, desc: 'Chaqueta cortaviento con capucha desmontable.' },
        { name: 'Zapatos Deportivos', price: 48.00, stock: 20, desc: 'Zapatillas ligeras con suela amortiguada. Ideal para caminar.' },
        { name: 'Mochila Urbana 25L', price: 32.00, stock: 18, desc: 'Mochila con compartimento para laptop de 15 pulgadas.' },
        { name: 'Gorra Snapback', price: 12.00, stock: 40, desc: 'Gorra ajustable con visera plana. Diseño exclusivo.' },
        { name: 'Shorts Deportivos', price: 15.00, stock: 35, desc: 'Shorts ligeros con bolsillos y cintura elástica.' },
        { name: 'Bufanda Tejida', price: 10.00, stock: 25, desc: 'Bufanda de lana merino. Suave y abrigadora.' },
        { name: 'Cinturón Cuero', price: 22.00, stock: 20, desc: 'Cinturón de cuero genuino con hebilla plateada.' },
        { name: 'Bolso Cruzado', price: 28.00, stock: 12, desc: 'Bolso pequeño de cuero sintético con correa ajustable.' },
      ],
    },
    {
      slug: 'artesania-andina', name: 'Artesanía Andina', category: 'artesania',
      description: 'Artesanía tradicional tachirense. Tejidos, cerámica y recuerdos de la región.',
      phone: '+584161234572', address: 'Mercado Principal, Local 8', ownerEmail: 'ana@test.com',
      coverImage: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbea78?w=800',
      logoImage: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbea78?w=200',
      products: [
        { name: 'Mochila Wayuu', price: 45.00, stock: 10, desc: 'Mochila tejida a mano por artesanas Wayuu. Diseño único.' },
        { name: 'Jarrón Cerámica Pintado', price: 28.00, stock: 8, desc: 'Jarrón decorativo hecho a mano con pintura tradicional.' },
        { name: 'Poncho Lana de Oveja', price: 55.00, stock: 6, desc: 'Poncho artesanal tejido en lana de oveja. Abrigado y ligero.' },
        { name: 'Set de Tazas Arcilla', price: 22.00, stock: 15, desc: '4 tazas de arcilla cocida con esmaltado natural.' },
        { name: 'Sombrero Paja', price: 18.00, stock: 12, desc: 'Sombrero tradicional de paja tejida. Ideal para el sol.' },
        { name: 'Alcancía Cerdito Cerámica', price: 12.00, stock: 20, desc: 'Alcancía decorativa de cerámica pintada a mano.' },
        { name: 'Tapiz Bordado', price: 35.00, stock: 5, desc: 'Tapiz mural bordado con motivos andinos. 60x40cm.' },
        { name: 'Pulsera Tejida', price: 5.00, stock: 50, desc: 'Pulsera artesanal de hilo encerado con dije de plata.' },
      ],
    },
    {
      slug: 'super-bodegon', name: 'Súper Bodegón', category: 'comida',
      description: 'Abasto con productos nacionales e importados. Licores, enlatados, dulces y más.',
      phone: '+584161234573', address: 'Av. Ferrero Tamayo, Local 3', ownerEmail: 'luis@test.com',
      coverImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
      logoImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
      products: [
        { name: 'Café Premium Molido 500g', price: 8.50, stock: 40, desc: 'Café 100% arábico molido. Sabor intenso y aroma inconfundible.' },
        { name: 'Chocolate Artesanal 70%', price: 4.00, stock: 30, desc: 'Barra de chocolate oscuro hecho con cacao venezolano.' },
        { name: 'Arroz 5kg', price: 6.00, stock: 60, desc: 'Arroz blanco de primera calidad. Bolsa de 5kg.' },
        { name: 'Aceite de Oliva Extra Virgen 1L', price: 12.00, stock: 20, desc: 'Aceite de oliva italiano prensado en frío.' },
        { name: 'Mermelada de Fresa Artesanal', price: 5.50, stock: 25, desc: 'Mermelada casera sin conservantes. Frasco 350g.' },
        { name: 'Cerveza Artesanal IPA 6pk', price: 10.00, stock: 30, desc: 'Pack de 6 botellas de cerveza IPA artesanal.' },
        { name: 'Queso Parmesano 250g', price: 7.00, stock: 15, desc: 'Queso parmesano curado importado. Ideal para pastas.' },
        { name: 'Galletas Artesanales Caja', price: 6.50, stock: 20, desc: 'Caja de galletas surtidas horneadas al día.' },
        { name: 'Jugo Natural de Naranja 1L', price: 3.00, stock: 40, desc: 'Jugo de naranja recién exprimido. Sin azúcar añadida.' },
        { name: 'Pasta Artesanal 500g', price: 3.50, stock: 35, desc: 'Pasta de sémola de trigo duro. Hecha a mano.' },
      ],
    },
    {
      slug: 'pizzeria-roma', name: 'Pizzería Roma', category: 'comida',
      description: 'Auténtica pizza italiana horneada en horno de leña. También pastas y ensaladas.',
      phone: '+584161234574', address: 'Calle 5 con Carrera 3, Las Palmas', ownerEmail: 'carmen@test.com',
      coverImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      logoImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200',
      products: [
        { name: 'Pizza Margherita', price: 10.00, stock: 20, desc: 'Salsa de tomate, mozzarella fresca y albahaca. 8 porciones.' },
        { name: 'Pizza Pepperoni', price: 12.00, stock: 20, desc: 'Pepperoni, mozzarella y salsa de tomate. 8 porciones.' },
        { name: 'Pizza Cuatro Quesos', price: 13.00, stock: 15, desc: 'Mozzarella, gorgonzola, parmesano y fontina.' },
        { name: 'Pizza Hawaiana', price: 11.00, stock: 18, desc: 'Jamón, piña, mozzarella y salsa de tomate.' },
        { name: 'Pasta Carbonara', price: 9.00, stock: 15, desc: 'Spaghetti con huevo, panceta, parmesano y pimienta.' },
        { name: 'Ensalada César', price: 7.00, stock: 20, desc: 'Lechuga romana, crutones, parmesano y aderezo césar.' },
        { name: 'Lasaña Bolognese', price: 11.00, stock: 10, desc: 'Capas de pasta, carne molida, bechamel y queso gratinado.' },
        { name: 'Calzone Clásico', price: 10.00, stock: 12, desc: 'Pizza rellena de jamón, champiñones y mozzarella.' },
        { name: 'Bruschetta (4 uds)', price: 6.00, stock: 20, desc: 'Pan tostado con tomate, albahaca y aceite de oliva.' },
        { name: 'Tiramisú', price: 5.00, stock: 15, desc: 'Postre italiano clásico con café, mascarpone y cacao.' },
        { name: 'Refresco 500ml', price: 1.50, stock: 100, desc: 'Refresco de cola, naranja o limón bien frío.' },
        { name: 'Agua Mineral 1L', price: 1.00, stock: 100, desc: 'Agua mineral natural sin gas.' },
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

    const existingSub = await db.storeSubscription.findFirst({ where: { storeId: store.id } })
    if (!existingSub) {
      const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1)
      await db.storeSubscription.create({ data: { storeId: store.id, planId: 'plan-premium', status: 'active', expiresAt } })
    }

    await db.product.deleteMany({ where: { storeId: store.id } })
    await db.product.createMany({
      data: sd.products.map(p => ({
        storeId: store.id, name: p.name, description: p.desc, price: p.price, currency: 'USD', category: sd.category,
        images: [sd.coverImage], stock: p.stock, isActive: true,
      })),
    })
  }

  console.log('Seed completado: 6 tiendas, 62 productos, admin + clientes de prueba')
  console.log('\n📧 Credenciales:')
  console.log('   Admin:  admin@amsterdamtovzla.com / Admin123!')
  console.log('   Cliente: cliente@test.com / Test1234')
  console.log('   Tiendas: (cualquiera de abajo) / Test1234')
  for (const o of storeOwners) console.log(`   ${o.name}: ${o.email}`)
}

main().catch(console.error).finally(() => db.$disconnect())
