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
order_cancellations (id VARCHAR PK, order_id FK→orders.id UNIQUE, reason_category, detailed_reason TEXT, cancelled_at TIMESTAMP)

Key relationships:
- A vendor has many products
- An order has many order_items; each order_item references one product
- Revenue = order_items.quantity * order_items.unit_price
- order_cancellations does NOT contain "why" the customer cancelled (reason_category is operational, not customer-stated)
- All monetary values are in USD

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
1. Always JOIN through products (alias p) to enable vendor filtering via p.vendor_id = '{VENDOR_ID}'
2. For sales/revenue queries, use order_items joined to orders — exclude cancelled orders unless explicitly asked
3. Return ONLY valid DuckDB SQL — no CTEs unless necessary, no semicolons
4. If the question cannot be answered from available data (e.g. asking "why" customers cancelled), set canAnswer=false
5. Do NOT make up data or infer things not in the schema

Chart type selection:
- "bar": rankings, top-N lists, comparisons between named items
- "line": trends over time (daily/weekly/monthly)
- "pie": proportions, breakdowns that sum to 100%
- "grouped_bar": comparing two metrics side-by-side across categories or time periods
- "kpi": single number result
- null: text-only answer (canAnswer=false or purely informational)

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
        content: `Vendor: ${vendorName}\nQuestion: ${question}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const parsed = JSON.parse(raw) as Text2SQLResult
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
