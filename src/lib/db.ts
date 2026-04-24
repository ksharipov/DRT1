import path from 'path'
import { vendors, customers, products, generateOrderData } from './seed-data'

// Use the blocking (synchronous) Node.js bundle — no native deps, pure WASM
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createDuckDB, VoidLogger, NODE_RUNTIME } = require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs')

// Resolve paths to WASM and worker files at runtime from node_modules
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conn = any

let connPromise: Promise<Conn> | null = null

function esc(v: string | null): string {
  if (v === null) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

function exec(conn: Conn, sql: string): void {
  conn.query(sql)
}

function batchInsert(conn: Conn, sqls: string[]): void {
  exec(conn, 'BEGIN')
  for (const s of sqls) exec(conn, s)
  exec(conn, 'COMMIT')
}

async function initConn(): Promise<Conn> {
  const db = await createDuckDB(BUNDLES, new VoidLogger(), NODE_RUNTIME)
  await db.instantiate()
  db.open({ path: ':memory:' })
  const conn = db.connect()

  exec(conn, 'SET autoinstall_known_extensions = false')
  exec(conn, 'SET autoload_known_extensions = false')

  exec(conn, `CREATE TABLE vendors (
    id VARCHAR PRIMARY KEY, company_name VARCHAR NOT NULL,
    contact_email VARCHAR NOT NULL, status VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL
  )`)
  exec(conn, `CREATE TABLE customers (
    id VARCHAR PRIMARY KEY, email VARCHAR NOT NULL,
    region VARCHAR NOT NULL, signup_date TIMESTAMP NOT NULL
  )`)
  exec(conn, `CREATE TABLE products (
    id VARCHAR PRIMARY KEY, vendor_id VARCHAR NOT NULL, sku VARCHAR NOT NULL,
    name VARCHAR NOT NULL, category VARCHAR NOT NULL,
    unit_price DOUBLE NOT NULL, created_at TIMESTAMP NOT NULL
  )`)
  exec(conn, `CREATE TABLE orders (
    id VARCHAR PRIMARY KEY, customer_id VARCHAR NOT NULL,
    order_date TIMESTAMP NOT NULL, status VARCHAR NOT NULL,
    total_amount DOUBLE NOT NULL,
    shipped_at TIMESTAMP, delivered_at TIMESTAMP
  )`)
  exec(conn, `CREATE TABLE order_items (
    id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL, product_id VARCHAR NOT NULL,
    quantity INTEGER NOT NULL, unit_price DOUBLE NOT NULL
  )`)
  exec(conn, `CREATE TABLE order_cancellations (
    id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL UNIQUE,
    reason_category VARCHAR, detailed_reason TEXT,
    cancelled_at TIMESTAMP NOT NULL
  )`)

  exec(conn, 'CREATE INDEX idx_products_vendor_id ON products(vendor_id)')
  exec(conn, 'CREATE INDEX idx_orders_customer_id ON orders(customer_id)')
  exec(conn, 'CREATE INDEX idx_orders_order_date ON orders(order_date)')
  exec(conn, 'CREATE INDEX idx_orders_status ON orders(status)')
  exec(conn, 'CREATE INDEX idx_order_items_order_id ON order_items(order_id)')
  exec(conn, 'CREATE INDEX idx_order_items_product_id ON order_items(product_id)')

  batchInsert(conn, vendors.map(v =>
    `INSERT INTO vendors VALUES (${esc(v.id)},${esc(v.company_name)},${esc(v.contact_email)},${esc(v.status)},${esc(v.created_at)})`
  ))
  batchInsert(conn, customers.map(c =>
    `INSERT INTO customers VALUES (${esc(c.id)},${esc(c.email)},${esc(c.region)},${esc(c.signup_date)})`
  ))
  batchInsert(conn, products.map(p =>
    `INSERT INTO products VALUES (${esc(p.id)},${esc(p.vendor_id)},${esc(p.sku)},${esc(p.name)},${esc(p.category)},${p.unit_price},${esc(p.created_at)})`
  ))

  const { orders, orderItems, cancellations } = generateOrderData()

  const orderSqls = orders.map(o =>
    `INSERT INTO orders VALUES (${esc(o.id)},${esc(o.customer_id)},${esc(o.order_date)},${esc(o.status)},${o.total_amount},${esc(o.shipped_at)},${esc(o.delivered_at)})`
  )
  for (let i = 0; i < orderSqls.length; i += 500) batchInsert(conn, orderSqls.slice(i, i + 500))

  const itemSqls = orderItems.map(it =>
    `INSERT INTO order_items VALUES (${esc(it.id)},${esc(it.order_id)},${esc(it.product_id)},${it.quantity},${it.unit_price})`
  )
  for (let i = 0; i < itemSqls.length; i += 500) batchInsert(conn, itemSqls.slice(i, i + 500))

  if (cancellations.length > 0) {
    batchInsert(conn, cancellations.map(c =>
      `INSERT INTO order_cancellations VALUES (${esc(c.id)},${esc(c.order_id)},NULL,NULL,${esc(c.cancelled_at)})`
    ))
  }

  return conn
}

export function getDB(): Promise<Conn> {
  if (!connPromise) connPromise = initConn()
  return connPromise
}

export async function runQuery(
  sql: string
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const conn = await getDB()
  // conn.query() is synchronous in the blocking bundle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table: any = conn.query(sql)

  const columns: string[] = table.schema.fields.map((f: { name: string }) => f.name)
  const rows: Record<string, unknown>[] = []

  for (let i = 0; i < table.numRows; i++) {
    const obj: Record<string, unknown> = {}
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const field: any = table.schema.fields[j]
      const v = table.getChild(col)?.get(i) ?? null
      const typeName: string = field?.type?.constructor?.name ?? ''

      if (typeName === 'Timestamp_' && typeof v === 'number') {
        // Milliseconds since epoch → "YYYY-MM-DD HH:MM:SS"
        obj[col] = new Date(v).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
      } else if (typeName === 'Date_' && typeof v === 'number') {
        // Milliseconds since epoch (midnight UTC) → "YYYY-MM-DD"
        obj[col] = new Date(v).toISOString().slice(0, 10)
      } else if (typeof v === 'bigint') {
        obj[col] = Number(v)
      } else if (typeName === 'Decimal' && v instanceof Uint32Array && v.length >= 2) {
        // DuckDB HUGEINT → Arrow Decimal128 (128-bit little-endian, 4 × Uint32)
        obj[col] = v[1] * 0x100000000 + v[0]
      } else {
        obj[col] = v
      }
    }
    rows.push(obj)
  }

  return { columns, rows }
}
