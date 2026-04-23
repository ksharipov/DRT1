// Deterministic seed data for NexTrade AI Reporting Assistant demo
// Domain: Family Entertainment Centers (FECs)

export const SUPPLIER_1_ID = 'ven-f47ac10b-58cc-4372-a567-000000000001'
export const SUPPLIER_2_ID = 'ven-f47ac10b-58cc-4372-a567-000000000002'

export interface Vendor {
  id: string; company_name: string; contact_email: string; status: string; created_at: string
}
export interface Customer {
  id: string; email: string; region: string; signup_date: string
}
export interface Product {
  id: string; vendor_id: string; sku: string; name: string; category: string; unit_price: number; created_at: string
}
export interface Order {
  id: string; customer_id: string; order_date: string; status: string; total_amount: number; shipped_at: string | null; delivered_at: string | null
}
export interface OrderItem {
  id: string; order_id: string; product_id: string; quantity: number; unit_price: number
}
export interface OrderCancellation {
  id: string; order_id: string; reason_category: string; detailed_reason: string; cancelled_at: string
}

// --- Mulberry32 deterministic RNG ---
function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = makeRng(42)
const rand = () => rng()
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]

// --- Vendors ---
export const vendors: Vendor[] = [
  { id: SUPPLIER_1_ID, company_name: 'Supplier 1', contact_email: 'orders@supplier1.com', status: 'active', created_at: '2022-01-10 09:00:00' },
  { id: SUPPLIER_2_ID, company_name: 'Supplier 2', contact_email: 'orders@supplier2.com', status: 'active', created_at: '2022-01-12 09:00:00' },
]

// --- Products: Supplier 1 — Food & Beverage ---
export const products: Product[] = [
  // Food — Supplier 1
  { id: 'p-s1-001', vendor_id: SUPPLIER_1_ID, sku: 'FB-PIZZA-SL', name: 'Pizza Slice', category: 'Hot Food', unit_price: 3.50, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-002', vendor_id: SUPPLIER_1_ID, sku: 'FB-HDOG-STD', name: 'Hot Dog', category: 'Hot Food', unit_price: 2.75, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-003', vendor_id: SUPPLIER_1_ID, sku: 'FB-NACH-LG', name: 'Nachos with Cheese', category: 'Snacks', unit_price: 4.25, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-004', vendor_id: SUPPLIER_1_ID, sku: 'FB-PCORN-SM', name: 'Popcorn (Small)', category: 'Snacks', unit_price: 2.00, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-005', vendor_id: SUPPLIER_1_ID, sku: 'FB-PCORN-LG', name: 'Popcorn (Large)', category: 'Snacks', unit_price: 3.50, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-006', vendor_id: SUPPLIER_1_ID, sku: 'FB-SDRK-SM', name: 'Soft Drink (Small)', category: 'Beverages', unit_price: 1.75, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-007', vendor_id: SUPPLIER_1_ID, sku: 'FB-SDRK-LG', name: 'Soft Drink (Large)', category: 'Beverages', unit_price: 2.75, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-008', vendor_id: SUPPLIER_1_ID, sku: 'FB-SLSH-STD', name: 'Slushie', category: 'Beverages', unit_price: 3.25, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-009', vendor_id: SUPPLIER_1_ID, sku: 'FB-CTNY-STD', name: 'Cotton Candy', category: 'Snacks', unit_price: 3.00, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-010', vendor_id: SUPPLIER_1_ID, sku: 'FB-PRTZ-BT', name: 'Pretzel Bites', category: 'Hot Food', unit_price: 4.50, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-011', vendor_id: SUPPLIER_1_ID, sku: 'FB-CKTN-6PC', name: 'Chicken Tenders (6pc)', category: 'Hot Food', unit_price: 6.50, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-012', vendor_id: SUPPLIER_1_ID, sku: 'FB-FRFR-LG', name: 'French Fries', category: 'Hot Food', unit_price: 3.25, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-013', vendor_id: SUPPLIER_1_ID, sku: 'FB-ICRM-CUP', name: 'Ice Cream Cup', category: 'Desserts', unit_price: 3.75, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-014', vendor_id: SUPPLIER_1_ID, sku: 'FB-JBOX-STD', name: 'Juice Box', category: 'Beverages', unit_price: 1.50, created_at: '2022-02-01 00:00:00' },
  { id: 'p-s1-015', vendor_id: SUPPLIER_1_ID, sku: 'FB-CAKE-SL', name: 'Birthday Cake Slice', category: 'Desserts', unit_price: 4.00, created_at: '2022-02-01 00:00:00' },
  // Equipment — Supplier 2
  { id: 'p-s2-001', vendor_id: SUPPLIER_2_ID, sku: 'EQ-TKNDISP-STD', name: 'Arcade Token Dispenser', category: 'Arcade', unit_price: 1200.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-002', vendor_id: SUPPLIER_2_ID, sku: 'EQ-TKTRM-PRO', name: 'Ticket Redemption Machine', category: 'Redemption', unit_price: 2800.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-003', vendor_id: SUPPLIER_2_ID, sku: 'EQ-LTVEST-STD', name: 'Laser Tag Vest', category: 'Laser Tag', unit_price: 450.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-004', vendor_id: SUPPLIER_2_ID, sku: 'EQ-LTGUN-STD', name: 'Laser Tag Gun', category: 'Laser Tag', unit_price: 320.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-005', vendor_id: SUPPLIER_2_ID, sku: 'EQ-TRPMAT-10', name: 'Trampoline Mat (10ft)', category: 'Inflatables', unit_price: 180.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-006', vendor_id: SUPPLIER_2_ID, sku: 'EQ-FMPIT-50', name: 'Foam Pit Block Set (50pcs)', category: 'Inflatables', unit_price: 350.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-007', vendor_id: SUPPLIER_2_ID, sku: 'EQ-BMPCR-STD', name: 'Bumper Car Unit', category: 'Rides', unit_price: 8500.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-008', vendor_id: SUPPLIER_2_ID, sku: 'EQ-GKTR-SET4', name: 'Go-Kart Tire Set (4)', category: 'Rides', unit_price: 280.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-009', vendor_id: SUPPLIER_2_ID, sku: 'EQ-AIRHK-STD', name: 'Air Hockey Table', category: 'Arcade', unit_price: 1850.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-010', vendor_id: SUPPLIER_2_ID, sku: 'EQ-BLBMP-SET', name: 'Bowling Lane Bumper Set', category: 'Arcade', unit_price: 420.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-011', vendor_id: SUPPLIER_2_ID, sku: 'EQ-PRZCNT-PRO', name: 'Prize Redemption Counter', category: 'Redemption', unit_price: 3200.00, created_at: '2022-02-15 00:00:00' },
  { id: 'p-s2-012', vendor_id: SUPPLIER_2_ID, sku: 'EQ-VRHED-STD', name: 'VR Headset Unit', category: 'Arcade', unit_price: 950.00, created_at: '2022-02-15 00:00:00' },
]

const foodProducts = products.filter(p => p.vendor_id === SUPPLIER_1_ID)
const equipProducts = products.filter(p => p.vendor_id === SUPPLIER_2_ID)

// --- Customers (FEC operators) ---
export const customers: Customer[] = [
  { id: 'cust-001', email: 'purchasing@funzonefec.com', region: 'Northeast', signup_date: '2023-01-15 08:00:00' },
  { id: 'cust-002', email: 'ops@adventurelandfec.com', region: 'Southeast', signup_date: '2022-11-20 08:00:00' },
  { id: 'cust-003', email: 'orders@kidskingdoment.com', region: 'Midwest', signup_date: '2023-03-10 08:00:00' },
  { id: 'cust-004', email: 'supply@bounceandplay.com', region: 'Southwest', signup_date: '2022-08-05 08:00:00' },
  { id: 'cust-005', email: 'mgr@galaxyarcadefun.com', region: 'West Coast', signup_date: '2023-06-01 08:00:00' },
  { id: 'cust-006', email: 'buy@thrillzoneent.com', region: 'Northeast', signup_date: '2022-12-15 08:00:00' },
  { id: 'cust-007', email: 'orders@happytimesfec.com', region: 'Southeast', signup_date: '2023-02-28 08:00:00' },
  { id: 'cust-008', email: 'supply@allstarfamilyfun.com', region: 'Midwest', signup_date: '2023-04-20 08:00:00' },
]

// Customer weights (to distribute orders unevenly but not dominated by one)
const customerWeights = [18, 15, 14, 13, 12, 11, 10, 7]
const customerCdf = customerWeights.reduce<number[]>((acc, w) => {
  acc.push((acc[acc.length - 1] ?? 0) + w)
  return acc
}, [])
const totalCw = customerCdf[customerCdf.length - 1]
function pickCustomer(): Customer {
  const r = rand() * totalCw
  const idx = customerCdf.findIndex(v => v > r)
  return customers[idx >= 0 ? idx : 0]
}

// Product weights within each supplier (some products more popular)
const foodWeights = [14, 12, 10, 9, 8, 8, 7, 6, 5, 5, 5, 5, 4, 3, 3]
const foodCdf = foodWeights.reduce<number[]>((acc, w) => { acc.push((acc[acc.length - 1] ?? 0) + w); return acc }, [])
const totalFw = foodCdf[foodCdf.length - 1]

const equipWeights = [10, 9, 10, 10, 9, 8, 7, 9, 8, 8, 6, 6]
const equipCdf = equipWeights.reduce<number[]>((acc, w) => { acc.push((acc[acc.length - 1] ?? 0) + w); return acc }, [])
const totalEw = equipCdf[equipCdf.length - 1]

function pickProduct(type: 's1' | 's2'): Product {
  if (type === 's1') {
    const r = rand() * totalFw
    const idx = foodCdf.findIndex(v => v > r)
    return foodProducts[idx >= 0 ? idx : 0]
  } else {
    const r = rand() * totalEw
    const idx = equipCdf.findIndex(v => v > r)
    return equipProducts[idx >= 0 ? idx : 0]
  }
}

// --- Date generation (last 24 months with seasonality) ---
const BASE_DATE = new Date('2024-04-24T00:00:00Z')
const END_DATE = new Date('2026-04-23T23:59:59Z')
const DATE_RANGE_MS = END_DATE.getTime() - BASE_DATE.getTime()

function seasonalRand(): number {
  // Try up to 5 times to get a date that passes the seasonality filter
  for (let i = 0; i < 5; i++) {
    const ms = rand() * DATE_RANGE_MS
    const d = new Date(BASE_DATE.getTime() + ms)
    const month = d.getMonth() // 0-indexed
    // Summer (5,6,7) and December (11) get 1.5x — accept with 100% in peak, 66% off-peak
    const isPeak = month >= 5 && month <= 7 || month === 11
    if (isPeak || rand() < 0.66) return BASE_DATE.getTime() + ms
  }
  return BASE_DATE.getTime() + rand() * DATE_RANGE_MS
}

function tsToStr(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
}

// Status distribution: 65% delivered, 20% shipped, 10% pending, 5% cancelled
const STATUS_CDF = [0.65, 0.85, 0.95, 1.00]
function pickStatus(): string {
  const r = rand()
  if (r < STATUS_CDF[0]) return 'delivered'
  if (r < STATUS_CDF[1]) return 'shipped'
  if (r < STATUS_CDF[2]) return 'pending'
  return 'cancelled'
}

const CANCEL_REASONS = [
  { category: 'Customer Request', detail: 'Customer contacted support to cancel the order before shipment.' },
  { category: 'Out of Stock', detail: 'Item was unavailable after order was placed due to inventory shortage.' },
  { category: 'Shipping Issue', detail: 'Carrier was unable to deliver to the specified address.' },
  { category: 'Payment Failed', detail: 'Payment authorization was declined and customer did not retry.' },
  { category: 'Duplicate Order', detail: 'Customer accidentally submitted the same order twice.' },
]

// --- Generate Orders, Order Items, Cancellations ---
export function generateOrderData(): {
  orders: Order[]
  orderItems: OrderItem[]
  cancellations: OrderCancellation[]
} {
  const orders: Order[] = []
  const orderItems: OrderItem[] = []
  const cancellations: OrderCancellation[] = []

  let cancelCount = 0
  const MAX_CANCELS = 490

  function makeOrder(idx: number, type: 's1' | 's2') {
    const orderId = `ord-${type}-${String(idx).padStart(6, '0')}`
    const customer = pickCustomer()
    const orderMs = seasonalRand()
    const orderDate = tsToStr(orderMs)
    const status = pickStatus()

    // Build items (1–4 per order)
    const itemCount = randInt(1, 4)
    const usedProducts = new Set<string>()
    const items: OrderItem[] = []

    for (let i = 0; i < itemCount; i++) {
      let product = pickProduct(type)
      // Avoid duplicate products in same order
      let attempts = 0
      while (usedProducts.has(product.id) && attempts < 10) {
        product = pickProduct(type)
        attempts++
      }
      usedProducts.add(product.id)

      const qty = type === 's1' ? randInt(1, 8) : randInt(1, 3)
      // Slight price variance ±10%
      const priceVariance = 0.90 + rand() * 0.20
      const unitPrice = Math.round(product.unit_price * priceVariance * 100) / 100

      items.push({
        id: `${orderId}-item-${i + 1}`,
        order_id: orderId,
        product_id: product.id,
        quantity: qty,
        unit_price: unitPrice,
      })
    }

    const totalAmount = Math.round(items.reduce((s, it) => s + it.quantity * it.unit_price, 0) * 100) / 100

    let shippedAt: string | null = null
    let deliveredAt: string | null = null
    if (status === 'shipped' || status === 'delivered') {
      shippedAt = tsToStr(orderMs + randInt(1, 3) * 86400000)
    }
    if (status === 'delivered') {
      deliveredAt = tsToStr(orderMs + randInt(4, 10) * 86400000)
    }

    orders.push({ id: orderId, customer_id: customer.id, order_date: orderDate, status, total_amount: totalAmount, shipped_at: shippedAt, delivered_at: deliveredAt })
    orderItems.push(...items)

    if (status === 'cancelled' && cancelCount < MAX_CANCELS) {
      cancelCount++
      const reason = pick(CANCEL_REASONS)
      cancellations.push({
        id: `cancel-${orderId}`,
        order_id: orderId,
        reason_category: reason.category,
        detailed_reason: reason.detail,
        cancelled_at: tsToStr(orderMs + randInt(0, 2) * 86400000),
      })
    }
  }

  // 4000 food orders, 2000 equipment orders
  for (let i = 0; i < 4000; i++) makeOrder(i, 's1')
  for (let i = 0; i < 2000; i++) makeOrder(i, 's2')

  return { orders, orderItems, cancellations }
}
