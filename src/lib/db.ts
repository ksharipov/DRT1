import duckdb from 'duckdb'
import { vendors, customers, products, generateOrderData } from './seed-data'

let dbPromise: Promise<duckdb.Database> | null = null

function esc(v: string | null): string {
  if (v === null) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

function dbRun(db: duckdb.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) =>
    db.run(sql, (err) => (err ? reject(err) : resolve()))
  )
}

function dbAll(db: duckdb.Database, sql: string): Promise<duckdb.RowData[]> {
  return new Promise((resolve, reject) =>
    db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows ?? [])))
  )
}

async function batchInsert(db: duckdb.Database, sqls: string[]) {
  await dbRun(db, 'BEGIN')
  for (const s of sqls) await dbRun(db, s)
  await dbRun(db, 'COMMIT')
}

async function initDB(): Promise<duckdb.Database> {
  const db = new duckdb.Database(':memory:')

  await dbRun(db, `CREATE TABLE vendors (
    id VARCHAR PRIMARY KEY, company_name VARCHAR NOT NULL,
    contact_email VARCHAR NOT NULL, status VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL
  )`)
  await dbRun(db, `CREATE TABLE customers (
    id VARCHAR PRIMARY KEY, email VARCHAR NOT NULL,
    region VARCHAR NOT NULL, signup_date TIMESTAMP NOT NULL
  )`)
  await dbRun(db, `CREATE TABLE products (
    id VARCHAR PRIMARY KEY, vendor_id VARCHAR NOT NULL, sku VARCHAR NOT NULL,
    name VARCHAR NOT NULL, category VARCHAR NOT NULL,
    unit_price DOUBLE NOT NULL, created_at TIMESTAMP NOT NULL
  )`)
  await dbRun(db, `CREATE TABLE orders (
    id VARCHAR PRIMARY KEY, customer_id VARCHAR NOT NULL,
    order_date TIMESTAMP NOT NULL, status VARCHAR NOT NULL,
    total_amount DOUBLE NOT NULL,
    shipped_at TIMESTAMP, delivered_at TIMESTAMP
  )`)
  await dbRun(db, `CREATE TABLE order_items (
    id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL, product_id VARCHAR NOT NULL,
    quantity INTEGER NOT NULL, unit_price DOUBLE NOT NULL
  )`)
  await dbRun(db, `CREATE TABLE order_cancellations (
    id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL UNIQUE,
    reason_category VARCHAR, detailed_reason TEXT,
    cancelled_at TIMESTAMP NOT NULL
  )`)

  await dbRun(db, 'CREATE INDEX idx_products_vendor_id ON products(vendor_id)')
  await dbRun(db, 'CREATE INDEX idx_orders_customer_id ON orders(customer_id)')
  await dbRun(db, 'CREATE INDEX idx_orders_order_date ON orders(order_date)')
  await dbRun(db, 'CREATE INDEX idx_orders_status ON orders(status)')
  await dbRun(db, 'CREATE INDEX idx_order_items_order_id ON order_items(order_id)')
  await dbRun(db, 'CREATE INDEX idx_order_items_product_id ON order_items(product_id)')

  await batchInsert(db, vendors.map(v =>
    `INSERT INTO vendors VALUES (${esc(v.id)},${esc(v.company_name)},${esc(v.contact_email)},${esc(v.status)},${esc(v.created_at)})`
  ))
  await batchInsert(db, customers.map(c =>
    `INSERT INTO customers VALUES (${esc(c.id)},${esc(c.email)},${esc(c.region)},${esc(c.signup_date)})`
  ))
  await batchInsert(db, products.map(p =>
    `INSERT INTO products VALUES (${esc(p.id)},${esc(p.vendor_id)},${esc(p.sku)},${esc(p.name)},${esc(p.category)},${p.unit_price},${esc(p.created_at)})`
  ))

  const { orders, orderItems, cancellations } = generateOrderData()

  const orderSqls = orders.map(o =>
    `INSERT INTO orders VALUES (${esc(o.id)},${esc(o.customer_id)},${esc(o.order_date)},${esc(o.status)},${o.total_amount},${esc(o.shipped_at)},${esc(o.delivered_at)})`
  )
  for (let i = 0; i < orderSqls.length; i += 500) {
    await batchInsert(db, orderSqls.slice(i, i + 500))
  }

  const itemSqls = orderItems.map(it =>
    `INSERT INTO order_items VALUES (${esc(it.id)},${esc(it.order_id)},${esc(it.product_id)},${it.quantity},${it.unit_price})`
  )
  for (let i = 0; i < itemSqls.length; i += 500) {
    await batchInsert(db, itemSqls.slice(i, i + 500))
  }

  if (cancellations.length > 0) {
    await batchInsert(db, cancellations.map(c =>
      `INSERT INTO order_cancellations VALUES (${esc(c.id)},${esc(c.order_id)},NULL,NULL,${esc(c.cancelled_at)})`
    ))
  }

  return db
}

export function getDB(): Promise<duckdb.Database> {
  if (!dbPromise) {
    dbPromise = initDB()
  }
  return dbPromise
}

export async function runQuery(
  sql: string
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const db = await getDB()
  const rawRows = await dbAll(db, sql)

  const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : []

  const rows = rawRows.map(row =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => {
        if (v instanceof Date) {
          const iso = v.toISOString()
          return [k, iso.endsWith('T00:00:00.000Z')
            ? iso.slice(0, 10)
            : iso.replace('T', ' ').replace(/\.\d+Z$/, '')]
        }
        if (typeof v === 'bigint') return [k, Number(v)]
        return [k, v]
      })
    )
  )

  return { columns, rows }
}
