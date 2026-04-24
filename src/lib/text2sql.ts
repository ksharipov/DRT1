import Anthropic from '@anthropic-ai/sdk'
import { SUPPLIER_1_ID, SUPPLIER_2_ID } from './seed-data'

const client = new Anthropic()

export type ChartType = 'bar' | 'line' | 'pie' | 'grouped_bar' | 'kpi' | null

export interface Text2SQLResult {
  canAnswer: boolean
  sql: string | null
  chartType: ChartType
  textAnswer: string
}

const SCHEMA_DESCRIPTION = `
Database schema (DuckDB):

vendors        (id VARCHAR PK, company_name, contact_email, status, created_at TIMESTAMP)
customers      (id VARCHAR PK, email, region, signup_date TIMESTAMP)
products       (id VARCHAR PK, vendor_id FK→vendors.id, sku, name, category, unit_price DECIMAL)
orders         (id VARCHAR PK, customer_id FK→customers.id, order_date TIMESTAMP, status ['pending'|'shipped'|'delivered'|'cancelled'], total_amount DECIMAL, shipped_at TIMESTAMP nullable, delivered_at TIMESTAMP nullable)
order_items    (id VARCHAR PK, order_id FK→orders.id, product_id FK→products.id, quantity INTEGER, unit_price DECIMAL)
order_cancellations (id VARCHAR PK, order_id FK→orders.id UNIQUE, reason_category VARCHAR nullable, detailed_reason TEXT nullable, cancelled_at TIMESTAMP)

Key relationships:
- A vendor has many products
- An order has many order_items; each order_item references one product
- Revenue = order_items.quantity * order_items.unit_price — for per-product breakdowns always use SUM(oi.quantity * oi.unit_price), never o.total_amount
- For product labels in results, always use p.name (never p.sku or p.id)
- For customer labels in results, always use c.email (customers have no name field)
- Cancellation reasons are NOT stored — reason_category and detailed_reason are always NULL
- All monetary values are in USD
- Data covers the last 30 days

IMPORTANT: The vendor filter will be injected automatically. Your SQL MUST include:
  JOIN products p ON order_items.product_id = p.id (or equivalent alias)
  AND use the placeholder '{VENDOR_ID}' exactly as a string literal where you need the vendor filter:
  Example: WHERE p.vendor_id = '{VENDOR_ID}'
  or: AND p.vendor_id = '{VENDOR_ID}'
`

const SYSTEM_PROMPT = `You are a Text-to-SQL engine for a vendor analytics dashboard.
The logged-in user is a vendor who can only see their own data.

${SCHEMA_DESCRIPTION}

Rules:
1. EVERY query MUST include JOIN order_items oi ON oi.order_id = o.id AND JOIN products p ON p.id = oi.product_id — this applies even to customer queries. These joins are required for vendor filtering via p.vendor_id = '{VENDOR_ID}'. A query without them will produce wrong results.
2. Handling order status in SQL:
   - Sales/revenue/unit-quantity queries: ALWAYS add AND o.status != 'cancelled' (where o is the orders alias)
     Example: WHERE p.vendor_id = '{VENDOR_ID}' AND o.status != 'cancelled'
   - Cancellation queries (counts or trends of cancelled orders): no status filter needed
   - Success/failure rate queries: use conditional aggregation, do NOT add a WHERE filter on status
     Example: COUNT(CASE WHEN o.status IN ('shipped','delivered') THEN 1 END) * 100.0 / COUNT(*) AS success_rate
   - Status-filter queries ("only delivered", "only shipped", "count only X orders", "for delivered orders", "among shipped orders"): add WHERE o.status = 'delivered' (or the requested status). These are valid data questions — NEVER return canAnswer=false for a status-filtered sales or customer query.
     Example: "best customers for delivered orders only" → WHERE p.vendor_id = '{VENDOR_ID}' AND o.status = 'delivered'
3. Return ONLY valid DuckDB SQL — no CTEs unless necessary, no semicolons
4. If the question is not about sales, orders, products, revenue, or customer data — set canAnswer=false and textAnswer="I can only answer questions about your sales and order data."
5. If the question cannot be answered from available data (e.g. asking "why" customers cancelled), set canAnswer=false
6. Do NOT make up data or infer things not in the schema
7. Only SELECT columns that should appear in the chart (label + metric). Never add helper columns (sort keys, intermediate calculations) to the SELECT list. For ordering by a non-displayed expression use it directly in ORDER BY — DuckDB supports ORDER BY EXTRACT(DOW FROM o.order_date) without it being in SELECT.
8. "List" or enumeration queries MUST always include a numeric metric column — never return a label-only result set. Examples:
   - "list products ever sold" → SELECT p.name, SUM(oi.quantity * oi.unit_price) AS revenue ... ORDER BY revenue DESC (bar)
   - "list my customers" → SELECT c.email, COUNT(DISTINCT o.id) AS orders ... (bar)
   - "list zero-sales days" → SELECT d.day::DATE AS date, 0 AS revenue FROM generate_series(DATE 'YYYY-MM-DD' - INTERVAL '29 days', DATE 'YYYY-MM-DD', INTERVAL '1 day') AS d(day) LEFT JOIN orders o ON o.order_date::DATE = d.day::DATE AND o.status != 'cancelled' LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id AND p.vendor_id = '{VENDOR_ID}' GROUP BY d.day HAVING COALESCE(SUM(oi.quantity * oi.unit_price), 0) = 0 ORDER BY d.day (bar) — returns ONLY days with $0 revenue; if the result is empty the textAnswer must say "You had no days with zero sales in the last 30 days — every day generated revenue."
   This ensures the chart always has a plottable metric. chartType: null is ONLY for canAnswer=false or purely informational text questions (e.g. "what does SKU mean?").
9. Never use current_date, current_timestamp, now(), today(), or any dynamic date function — these require the ICU extension which is not available. The current date is provided in the "Today:" field of each message. Use it as a DATE literal: DATE '2026-04-24'. For date arithmetic: DATE '2026-04-24' - INTERVAL '30 days'. Also never use STRFTIME with locale format codes (%B, %A, etc.), ILIKE, SIMILAR TO, or regexp_* functions.
10. Metric selection — monetary vs quantity:
    - MONETARY: use SUM(oi.quantity * oi.unit_price) AS revenue when the question is about money, value, sales amount, revenue, earnings, "how much" (in dollars). Name the column with 'revenue', 'amount', or 'sales_value' so it displays with a $ sign.
    - QUANTITY: use SUM(oi.quantity) or COUNT(...) when the question mentions units, items, pieces, "how many", "number of", "no of", "count", "average units", "average number of items/units/products". Name the column with 'units', 'items', 'count', 'orders', or 'products' — NEVER use 'revenue', 'amount', or 'price' in quantity column names.
    - DEFAULT (ambiguous): use monetary/revenue.
    Examples:
    - "how much did we sell" → SUM(oi.quantity * oi.unit_price) AS revenue  [monetary]
    - "top products by sales" → SUM(oi.quantity * oi.unit_price) AS revenue  [monetary]
    - "average no of units per product" → AVG(sub.qty) … AS avg_units  [quantity, no $]
    - "how many items were ordered" → SUM(oi.quantity) AS units_sold  [quantity, no $]
    - "how many orders" → COUNT(DISTINCT o.id) AS order_count  [quantity, no $]

Chart type selection:
- "pie": ALWAYS use for category breakdowns, distribution by type/category, product mix, share or proportion queries. Keywords that trigger pie: "by category", "breakdown", "distribution", "share", "mix", "proportion", "percentage of total"
- "bar": rankings, top-N lists (top 5, top 10), comparisons between specific named items where pie is not appropriate, enumeration queries ("list all X")
- "line": trends over time (daily/weekly/monthly)
- "grouped_bar": comparing two metrics side-by-side across categories or time periods. SQL MUST return wide-format: one row per X-axis label, one numeric column per group. Use DuckDB PIVOT:
  Example (categories by week): PIVOT (SELECT DATE_TRUNC('week', o.order_date)::DATE AS week, p.category, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE p.vendor_id = '{VENDOR_ID}' AND o.status != 'cancelled' GROUP BY week, p.category) ON category USING SUM(revenue) GROUP BY week ORDER BY week
  This produces columns [week, Beverages, Hot Food, ...] — one numeric column per category. NEVER return long-format (week, category, revenue) for grouped_bar — toNum('Hot Food') = 0 and the chart breaks.
- "kpi": single number result
- null: ONLY for canAnswer=false or purely informational text questions with no data to show

Respond ONLY with valid JSON, no markdown:
{
  "canAnswer": boolean,
  "sql": "SELECT ... (null if canAnswer=false)",
  "chartType": "bar"|"line"|"pie"|"grouped_bar"|"kpi"|null,
  "textAnswer": "1-2 sentence plain English answer or explanation"
}`

export async function textToSQL(
  question: string,
  vendorId: string
): Promise<Text2SQLResult> {
  const vendorName = vendorId === SUPPLIER_1_ID ? 'Supplier 1 (Food & Beverage)'
    : vendorId === SUPPLIER_2_ID ? 'Supplier 2 (Entertainment Equipment)'
    : 'Unknown Vendor'

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Today: ${new Date().toISOString().slice(0, 10)}\nVendor: ${vendorName}\nQuestion: ${question}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match?.[0] ?? cleaned) as Text2SQLResult
    if (parsed.canAnswer && parsed.sql) {
      // Inject the real vendor UUID
      parsed.sql = parsed.sql.replace(/'\{VENDOR_ID\}'/g, `'${vendorId}'`)
    }
    return parsed
  } catch {
    return {
      canAnswer: false,
      sql: null,
      chartType: null,
      textAnswer: "I couldn't process that question. Please try rephrasing it.",
    }
  }
}
