// Generates data/database.ddb for local DBeaver access
// Run: npm run db:build
// Note: writes a DuckDB WASM in-memory DB — DBeaver inspection not supported
// This script is for local verification only; Vercel uses in-memory seeding

import path from 'path'
import { vendors, customers, products, generateOrderData } from '../src/lib/seed-data'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createDuckDB, VoidLogger, NODE_RUNTIME } = require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs')

const WASM_DIST = path.join(process.cwd(), 'node_modules/@duckdb/duckdb-wasm/dist')
const BUNDLES = {
  mvp: {
    mainModule: path.join(WASM_DIST, 'duckdb-mvp.wasm'),
    mainWorker: path.join(WASM_DIST, 'duckdb-node-mvp.worker.cjs'),
  },
  eh: {
    mainModule: path.join(WASM_DIST, 'duckdb-eh.wasm'),
    mainWorker: path.join(WASM_DIST, 'duckdb-node-eh.worker.cjs'),
  },
}

function esc(v: string | null): string {
  if (v === null) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exec(conn: any, sql: string): void { conn.query(sql) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function batch(conn: any, sqls: string[]): void {
  exec(conn, 'BEGIN')
  for (const s of sqls) exec(conn, s)
  exec(conn, 'COMMIT')
}

async function main() {
  console.log('Initializing DuckDB WASM...')
  const db = await createDuckDB(BUNDLES, new VoidLogger(), NODE_RUNTIME)
  await db.instantiate()
  db.open({ path: ':memory:' })
  const conn = db.connect()

  exec(conn, `CREATE TABLE vendors (id VARCHAR PRIMARY KEY, company_name VARCHAR NOT NULL, contact_email VARCHAR NOT NULL, status VARCHAR NOT NULL, created_at TIMESTAMP NOT NULL)`)
  exec(conn, `CREATE TABLE customers (id VARCHAR PRIMARY KEY, email VARCHAR NOT NULL, region VARCHAR NOT NULL, signup_date TIMESTAMP NOT NULL)`)
  exec(conn, `CREATE TABLE products (id VARCHAR PRIMARY KEY, vendor_id VARCHAR NOT NULL, sku VARCHAR NOT NULL, name VARCHAR NOT NULL, category VARCHAR NOT NULL, unit_price DOUBLE NOT NULL, created_at TIMESTAMP NOT NULL)`)
  exec(conn, `CREATE TABLE orders (id VARCHAR PRIMARY KEY, customer_id VARCHAR NOT NULL, order_date TIMESTAMP NOT NULL, status VARCHAR NOT NULL, total_amount DOUBLE NOT NULL, shipped_at TIMESTAMP, delivered_at TIMESTAMP)`)
  exec(conn, `CREATE TABLE order_items (id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL, product_id VARCHAR NOT NULL, quantity INTEGER NOT NULL, unit_price DOUBLE NOT NULL)`)
  exec(conn, `CREATE TABLE order_cancellations (id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL UNIQUE, reason_category VARCHAR, detailed_reason TEXT, cancelled_at TIMESTAMP NOT NULL)`)

  console.log('Seeding data...')
  batch(conn, vendors.map(v => `INSERT INTO vendors VALUES (${esc(v.id)},${esc(v.company_name)},${esc(v.contact_email)},${esc(v.status)},${esc(v.created_at)})`))
  batch(conn, customers.map(c => `INSERT INTO customers VALUES (${esc(c.id)},${esc(c.email)},${esc(c.region)},${esc(c.signup_date)})`))
  batch(conn, products.map(p => `INSERT INTO products VALUES (${esc(p.id)},${esc(p.vendor_id)},${esc(p.sku)},${esc(p.name)},${esc(p.category)},${p.unit_price},${esc(p.created_at)})`))

  const { orders, orderItems, cancellations } = generateOrderData()
  const BATCH = 500
  for (let i = 0; i < orders.length; i += BATCH)
    batch(conn, orders.slice(i, i + BATCH).map(o => `INSERT INTO orders VALUES (${esc(o.id)},${esc(o.customer_id)},${esc(o.order_date)},${esc(o.status)},${o.total_amount},${esc(o.shipped_at)},${esc(o.delivered_at)})`))
  for (let i = 0; i < orderItems.length; i += BATCH)
    batch(conn, orderItems.slice(i, i + BATCH).map(it => `INSERT INTO order_items VALUES (${esc(it.id)},${esc(it.order_id)},${esc(it.product_id)},${it.quantity},${it.unit_price})`))
  if (cancellations.length > 0)
    batch(conn, cancellations.map(c => `INSERT INTO order_cancellations VALUES (${esc(c.id)},${esc(c.order_id)},NULL,NULL,${esc(c.cancelled_at)})`))

  const result = conn.query('SELECT COUNT(*) AS n FROM orders')
  console.log(`\n✓ Done! Orders seeded: ${result.getChild('n')?.get(0)}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
