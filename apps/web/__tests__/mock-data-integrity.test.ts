import { describe, it, expect } from 'vitest'
import {
  brands, products, menuItems, users,
  initialOrders, initialComments, initialNotifications,
} from '../src/lib/mock-data'

const productIds = new Set(products.map(p => p.id))
const brandIds = new Set(brands.map(b => b.id))
const userIds = new Set(users.map(u => u.id))
const commentIds = new Set(initialComments.map(c => c.id))
const orderIds = new Set(initialOrders.map(o => o.id))

describe('Demo mock data integrity (no orphans)', () => {
  it('every product references an existing brand (or none)', () => {
    for (const p of products) {
      if (p.brandId !== null) {
        expect(brandIds.has(p.brandId), `product ${p.id} → brand ${p.brandId}`).toBe(true)
      }
    }
  })

  it('every order item references an existing product and user', () => {
    for (const o of initialOrders) {
      expect(userIds.has(o.userId), `order ${o.id} userId`).toBe(true)
      for (const item of o.items) {
        expect(productIds.has(item.productId), `order ${o.id} item → product ${item.productId}`).toBe(true)
      }
    }
  })

  it('every delivery references an existing order and driver', () => {
    for (const o of initialOrders) {
      if (!o.delivery) continue
      expect(o.delivery.orderId, 'delivery.orderId matches parent').toBe(o.id)
      expect(userIds.has(o.delivery.driverId), `delivery driver ${o.delivery.driverId}`).toBe(true)
    }
  })

  it('every comment references an existing product, user and parent', () => {
    for (const c of initialComments) {
      expect(productIds.has(c.productId), `comment ${c.id} productId`).toBe(true)
      expect(userIds.has(c.userId), `comment ${c.id} userId`).toBe(true)
      if (c.parentId !== null) {
        expect(commentIds.has(c.parentId), `comment ${c.id} parentId`).toBe(true)
      }
    }
  })

  it('every notification references an existing user/order/product', () => {
    for (const n of initialNotifications) {
      expect(userIds.has(n.userId), `notification ${n.id} userId`).toBe(true)
      if (n.orderId !== null) {
        expect(orderIds.has(n.orderId), `notification ${n.id} orderId`).toBe(true)
      }
      const data = n.data as { productId?: string } | null
      if (data?.productId !== undefined) {
        expect(productIds.has(data.productId), `notification ${n.id} data.productId`).toBe(true)
      }
    }
  })

  it('menu option children reference their parent option', () => {
    for (const m of menuItems) {
      for (const opt of m.options) {
        expect(opt.menuItemId, `option ${opt.id} parent`).toBe(m.id)
        for (const ch of opt.choices) {
          expect(ch.menuOptionId, `choice ${ch.id} parent`).toBe(opt.id)
        }
      }
    }
  })

  it('order totals equal items subtotal + delivery fee', () => {
    for (const o of initialOrders) {
      const itemsTotal = o.items.reduce((s, i) => s + i.subtotal, 0)
      expect(Math.round((itemsTotal + o.deliveryFee) * 100) / 100, `order ${o.id} total`).toBe(o.total)
    }
  })

  it('featured and discount demo products exist so homepage demo sections render', () => {
    expect(products.some(p => p.isFeatured && p.isActive)).toBe(true)
    expect(products.some(p => p.hasDiscount && p.isActive)).toBe(true)
  })
})
