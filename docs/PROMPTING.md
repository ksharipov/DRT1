# Text-to-SQL Prompt Engineering Guide

This document describes the rules embedded in `src/lib/text2sql.ts` and the contracts
between the AI-generated SQL and `ChartRenderer.tsx`. Every rule here was added in
response to a real bug — do not remove them without understanding the consequence.

---

## System Prompt Rules

### Rule 1 — Mandatory JOIN through products (vendor isolation)

Every query **must** include:
```sql
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE p.vendor_id = '{VENDOR_ID}'
```
This applies even to customer-level queries. Without this JOIN, the `{VENDOR_ID}`
placeholder cannot be injected and vendor isolation breaks — one vendor sees another's data.

---

### Rule 2 — Order status handling (four patterns)

| Query type | SQL pattern |
|---|---|
| Sales / revenue | `AND o.status != 'cancelled'` |
| Cancellation counts / trends | No status filter |
| Success / failure rate | `COUNT(CASE WHEN o.status IN ('shipped','delivered') THEN 1 END) * 100.0 / COUNT(*)` |
| Status-filtered ranking ("only delivered", "just shipped", "I only need pending") | `WHERE o.status = 'delivered'` — this is a **scope filter**, not a metric change |

The fourth pattern is critical: phrases like "count only delivered orders" or "I only need
dispatched" describe a WHERE filter, **not** an instruction to use `COUNT()` aggregation.
The metric remains revenue (see Rule 10).

---

### Rule 7 — SELECT only plottable columns

Never include helper columns (sort keys, intermediate calculations) in SELECT.
DuckDB supports ORDER BY expressions not in SELECT:
```sql
ORDER BY EXTRACT(DOW FROM o.order_date)  -- valid even if not in SELECT
```

---

### Rule 8 — Every result set must have a numeric metric

Label-only result sets produce broken charts. Always add an aggregate:

| Question | SQL pattern |
|---|---|
| "list products ever sold" | `SELECT p.name, SUM(oi.quantity * oi.unit_price) AS revenue` |
| "list my customers" | `SELECT c.email, COUNT(DISTINCT o.id) AS orders` |
| "list zero-sales days" | `generate_series` LEFT JOIN with `HAVING COALESCE(SUM(...), 0) = 0` |

**Best/top ONE winner per group** ("best category per week", "top product per day"):
Concatenate group and winner into a single label column — always return exactly 2 columns:
```sql
SELECT (DATE_TRUNC('week', o.order_date)::DATE::TEXT || ' — ' || p.category) AS label,
       SUM(oi.quantity * oi.unit_price) AS revenue
FROM ...
QUALIFY RANK() OVER (PARTITION BY DATE_TRUNC('week', o.order_date)::DATE ORDER BY revenue DESC) = 1
ORDER BY label
```
**Never return 3 columns (group, winner, metric)** — `toNum('Hot Food') = 0` and the chart
renders empty.

---

### Rule 9 — No ICU extension functions

The DuckDB WASM build used in this project does **not** have the ICU extension available.
The following will crash at runtime:

| Forbidden | Alternative |
|---|---|
| `current_date`, `now()`, `today()` | Use `DATE 'YYYY-MM-DD'` literal injected in the user message |
| `STRFTIME('%B', ...)`, `STRFTIME('%A', ...)` | Use `EXTRACT(MONTH FROM ...)` |
| `ILIKE` | Use `LIKE` (case-sensitive) |
| `SIMILAR TO`, `regexp_*` | Avoid regex entirely |

The current date is injected as `Today: YYYY-MM-DD` in every user message.

---

### Rule 10 — Monetary vs quantity metrics

| Signal in question | Metric | Column naming |
|---|---|---|
| "sales", "revenue", "how much", "earnings" | `SUM(oi.quantity * oi.unit_price) AS revenue` | Must include `revenue`, `amount`, or `price` for `$` formatting |
| "how many", "number of", "no of", "units", "items", "average units" | `SUM(oi.quantity)` or `COUNT(...)` | Must NOT include `revenue`/`amount`/`price` — use `units`, `count`, `orders` |
| Ambiguous / default | Revenue | — |

Status-filter phrases ("count only delivered", "I only need shipped") are **scope filters**,
not quantity triggers — the metric stays monetary.

Rule 10 applies **inside PIVOT subqueries** too (see grouped_bar section below).

---

## Chart Type Contract

The AI selects `chartType` and the SQL shape must match what `ChartRenderer.tsx` expects.

### ChartRenderer column contract

```typescript
const [labelCol, ...valueColumns] = columns
```

- `labelCol` = first column = X-axis label or category name
- `valueColumns` = all remaining columns = **must be numeric**

If a string column ends up in `valueColumns`, `toNum('Hot Food') = 0` → empty chart.

### grouped_bar — PIVOT required (wide-format)

`grouped_bar` requires **wide-format** data: one row per X-axis label, one numeric column per group.
Use DuckDB `PIVOT`:

```sql
PIVOT (
  SELECT DATE_TRUNC('week', o.order_date)::DATE AS week,
         p.category,
         SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE p.vendor_id = '{VENDOR_ID}' AND o.status != 'cancelled'
  GROUP BY week, p.category
) ON category USING SUM(revenue) GROUP BY week ORDER BY week
```

Result columns: `[week, Beverages, Desserts, Hot Food, ...]` — one numeric column per category.

**Never return long-format** `(week, category, revenue)` for grouped_bar.

### Currency formatting

`ChartRenderer` applies `$` formatting to columns whose name matches `/revenue|amount|price/i`.
Quantity columns (`units_sold`, `order_count`, `avg_units`, etc.) must not contain these words.

---

## DuckDB WASM Constraints

### HUGEINT → Arrow Decimal128

`SUM(INTEGER)` in DuckDB returns `HUGEINT`. Arrow JS serializes this as a `Decimal` type;
`.get(i)` returns a `Uint32Array` of 4 elements (128-bit little-endian).

`runQuery` in `db.ts` handles this:
```typescript
} else if (typeName === 'Decimal' && v instanceof Uint32Array && v.length >= 2) {
  obj[col] = v[1] * 0x100000000 + v[0]
}
```

Without this handler, all `SUM(quantity)` results appear as `0`.

### Turbopack / webpack

`vercel.json` forces `next build --webpack`. Turbopack on Vercel activates `@duckdb/node-api`
(native binary, requires `libduckdb.so`) which is absent on Amazon Linux 2 and crashes the Lambda.

---

## Label conventions

| Data | SQL alias | Reason |
|---|---|---|
| Product name | `p.name` | `p.sku` is an internal code (e.g. `FB-PIZZA-SL`), not readable |
| Customer | `c.email` | `customers` table has no `name` field |
