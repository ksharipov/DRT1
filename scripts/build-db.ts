// Generates data/database.ddb for local DBeaver access
// Run: npm run db:build

import { DuckDBInstance } from '@duckdb/node-api'
import { vendors, customers, products, generateOrderData } from '../src/lib/seed-data'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, unlinkSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = resolve(__dirname, '../data/database.ddb')

function esc(v: string | null): string {
  if (v === null) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

async function main() {
  if (existsSync(dbPath)) { unlinkSync(dbPath); console.log('Removed existing database.ddb') }
  if (existsSync(dbPath + '.wal')) unlinkSync(dbPath + '.wal')

  console.log('Creating database…')
  const instance = await DuckDBInstance.create(dbPath)
  const conn = await instance.connect()

  await conn.run(`CREATE TABLE vendors (id VARCHAR PRIMARY KEY, company_name VARCHAR NOT NULL, contact_email VARCHAR NOT NULL, status VARCHAR NOT NULL, created_at TIMESTAMP NOT NULL)`)
  await conn.run(`CREATE TABLE customers (id VARCHAR PRIMARY KEY, email VARCHAR NOT NULL, region VARCHAR NOT NULL, signup_date TIMESTAMP NOT NULL)`)
  await conn.run(`CREATE TABLE products (id VARCHAR PRIMARY KEY, vendor_id VARCHAR NOT NULL, sku VARCHAR NOT NULL, name VARCHAR NOT NULL, category VARCHAR NOT NULL, unit_price DOUBLE NOT NULL, created_at TIMESTAMP NOT NULL)`)
  await conn.run(`CREATE TABLE orders (id VARCHAR PRIMARY KEY, customer_id VARCHAR NOT NULL, order_date TIMESTAMP NOT NULL, status VARCHAR NOT NULL, total_amount DOUBLE NOT NULL, shipped_at TIMESTAMP, delivered_at TIMESTAMP)`)
  await conn.run(`CREATE TABLE order_items (id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL, product_id VARCHAR NOT NULL, quantity INTEGER NOT NULL, unit_price DOUBLE NOT NULL)`)
  await conn.run(`CREATE TABLE order_cancellations (id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL UNIQUE, reason_category VARCHAR, detailed_reason TEXT, cancelled_at TIMESTAMP NOT NULL)`)
  await conn.run('CREATE INDEX idx_products_vendor_id ON products(vendor_id)')
  await conn.run('CREATE INDEX idx_orders_customer_id ON orders(customer_id)')
  await conn.run('CREATE INDEX idx_orders_order_date ON orders(order_date)')
  await conn.run('CREATE INDEX idx_orders_status ON orders(status)')
  await conn.run('CREATE INDEX idx_order_items_order_id ON order_items(order_id)')
  await conn.run('CREATE INDEX idx_order_items_product_id ON order_items(product_id)')

  console.log('Seeding vendors, customers, products…')
  await conn.run('BEGIN')
  for (const v of vendors)
    await conn.run(`INSERT INTO vendors VALUES (${esc(v.id)},${esc(v.company_name)},${esc(v.contact_email)},${esc(v.status)},${esc(v.created_at)})`)
  for (const c of customers)
    await conn.run(`INSERT INTO customers VALUES (${esc(c.id)},${esc(c.email)},${esc(c.region)},${esc(c.signup_date)})`)
  for (const p of products)
    await conn.run(`INSERT INTO products VALUES (${esc(p.id)},${esc(p.vendor_id)},${esc(p.sku)},${esc(p.name)},${esc(p.category)},${p.unit_price},${esc(p.created_at)})`)
  await conn.run('COMMIT')

  console.log('Generating seed data…')
  const { orders, orderItems, cancellations } = generateOrderData()
  console.log(`Orders: ${orders.length}, Items: ${orderItems.length}, Cancellations: ${cancellations.length}`)

  console.log('Inserting orders…')
  await conn.run('BEGIN')
  const BATCH = 200
  for (let i = 0; i < orders.length; i += BATCH) {
    const batch = orders.slice(i, i + BATCH)
    const values = batch.map(o => `(${esc(o.id)},${esc(o.customer_id)},${esc(o.order_date)},${esc(o.status)},${o.total_amount},${esc(o.shipped_at)},${esc(o.delivered_at)})`).join(',')
    await conn.run(`INSERT INTO orders VALUES ${values}`)
  }
  await conn.run('COMMIT')

  console.log('Inserting order items…')
  await conn.run('BEGIN')
  for (let i = 0; i < orderItems.length; i += BATCH) {
    const batch = orderItems.slice(i, i + BATCH)
    const values = batch.map(it => `(${esc(it.id)},${esc(it.order_id)},${esc(it.product_id)},${it.quantity},${it.unit_price})`).join(',')
    await conn.run(`INSERT INTO order_items VALUES ${values}`)
  }
  await conn.run('COMMIT')

  console.log('Inserting cancellations…')
  if (cancellations.length > 0) {
    await conn.run('BEGIN')
    for (const c of cancellations)
      await conn.run(`INSERT INTO order_cancellations VALUES (${esc(c.id)},${esc(c.order_id)},NULL,NULL,${esc(c.cancelled_at)})`)
    await conn.run('COMMIT')
  }

  const r = await conn.runAndReadAll('SELECT COUNT(*) as n FROM orders')
  console.log(`\n✓ Done! Orders in DB: ${r.getRows()[0][0]}`)

  await conn.run('CHECKPOINT')
  console.log(`✓ database.ddb: ${dbPath}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
