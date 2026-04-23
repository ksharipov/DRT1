import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api'
import { vendors, customers, products, generateOrderData } from './seed-data'

let connectionPromise: Promise<DuckDBConnection> | null = null

function esc(v: string | null): string {
  if (v === null) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

async function batchInsert(conn: DuckDBConnection, sql: string[]) {
  await conn.run('BEGIN')
  for (const s of sql) await conn.run(s)
  await conn.run('COMMIT')
}

async function initDB(): Promise<DuckDBConnection> {
  const instance = await DuckDBInstance.create(':memory:')
  const conn = await instance.connect()

  // Schema
  await conn.run(`CREATE TABLE vendors (
    id VARCHAR PRIMARY KEY, company_name VARCHAR NOT NULL,
    contact_email VARCHAR NOT NULL, status VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL
  )`)
  await conn.run(`CREATE TABLE customers (
    id VARCHAR PRIMARY KEY, email VARCHAR NOT NULL,
    region VARCHAR NOT NULL, signup_date TIMESTAMP NOT NULL
  )`)
  await conn.run(`CREATE TABLE products (
    id VARCHAR PRIMARY KEY, vendor_id VARCHAR NOT NULL, sku VARCHAR NOT NULL,
    name VARCHAR NOT NULL, category VARCHAR NOT NULL,
    unit_price DOUBLE NOT NULL, created_at TIMESTAMP NOT NULL
  )`)
  await conn.run(`CREATE TABLE orders (
    id VARCHAR PRIMARY KEY, customer_id VARCHAR NOT NULL,
    order_date TIMESTAMP NOT NULL, status VARCHAR NOT NULL,
    total_amount DOUBLE NOT NULL,
    shipped_at TIMESTAMP, delivered_at TIMESTAMP
  )`)
  await conn.run(`CREATE TABLE order_items (
    id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL, product_id VARCHAR NOT NULL,
    quantity INTEGER NOT NULL, unit_price DOUBLE NOT NULL
  )`)
  await conn.run(`CREATE TABLE order_cancellations (
    id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL UNIQUE,
    reason_category VARCHAR, detailed_reason TEXT,
    cancelled_at TIMESTAMP NOT NULL
  )`)

  await conn.run('CREATE INDEX idx_products_vendor_id ON products(vendor_id)')
  await conn.run('CREATE INDEX idx_orders_customer_id ON orders(customer_id)')
  await conn.run('CREATE INDEX idx_orders_order_date ON orders(order_date)')
  await conn.run('CREATE INDEX idx_orders_status ON orders(status)')
  await conn.run('CREATE INDEX idx_order_items_order_id ON order_items(order_id)')
  await conn.run('CREATE INDEX idx_order_items_product_id ON order_items(product_id)')

  // Seed — small tables first
  await batchInsert(conn, vendors.map(v =>
    `INSERT INTO vendors VALUES (${esc(v.id)},${esc(v.company_name)},${esc(v.contact_email)},${esc(v.status)},${esc(v.created_at)})`
  ))
  await batchInsert(conn, customers.map(c =>
    `INSERT INTO customers VALUES (${esc(c.id)},${esc(c.email)},${esc(c.region)},${esc(c.signup_date)})`
  ))
  await batchInsert(conn, products.map(p =>
    `INSERT INTO products VALUES (${esc(p.id)},${esc(p.vendor_id)},${esc(p.sku)},${esc(p.name)},${esc(p.category)},${p.unit_price},${esc(p.created_at)})`
  ))

  // Seed orders in chunks of 500
  const { orders, orderItems, cancellations } = generateOrderData()

  const orderSqls = orders.map(o =>
    `INSERT INTO orders VALUES (${esc(o.id)},${esc(o.customer_id)},${esc(o.order_date)},${esc(o.status)},${o.total_amount},${esc(o.shipped_at)},${esc(o.delivered_at)})`
  )
  for (let i = 0; i < orderSqls.length; i += 500) {
    await batchInsert(conn, orderSqls.slice(i, i + 500))
  }

  const itemSqls = orderItems.map(it =>
    `INSERT INTO order_items VALUES (${esc(it.id)},${esc(it.order_id)},${esc(it.product_id)},${it.quantity},${it.unit_price})`
  )
  for (let i = 0; i < itemSqls.length; i += 500) {
    await batchInsert(conn, itemSqls.slice(i, i + 500))
  }

  if (cancellations.length > 0) {
    await batchInsert(conn, cancellations.map(c =>
      `INSERT INTO order_cancellations VALUES (${esc(c.id)},${esc(c.order_id)},NULL,NULL,${esc(c.cancelled_at)})`
    ))
  }

  return conn
}

export function getDB(): Promise<DuckDBConnection> {
  if (!connectionPromise) {
    connectionPromise = initDB()
  }
  return connectionPromise
}

export async function runQuery(
  sql: string
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const conn = await getDB()
  const reader = await conn.runAndReadAll(sql)
  const columns = reader.columnNames()
  const rawRows = reader.getRows()

  const rows = rawRows.map(row =>
    Object.fromEntries(
      columns.map((col, i) => {
        const v = row[i]
        // Convert BigInt and timestamp objects to serializable values
        if (typeof v === 'bigint') return [col, Number(v)]
        if (v !== null && typeof v === 'object' && 'micros' in v) {
          // DuckDB timestamp object — convert micros to ISO string
          const ms = Number((v as { micros: bigint }).micros) / 1000
          return [col, new Date(ms).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')]
        }
        return [col, v]
      })
    )
  )

  return { columns, rows }
}
