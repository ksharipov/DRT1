# NexTrade AI — Vendor Reporting Assistant

A Text-to-SQL AI demo built for a take-home assignment. Vendors ask questions in plain English and get instant charts and KPIs powered by Claude + DuckDB WASM.

**Live demo:** ask for the URL separately (password-protected to limit API usage).

---

## Assignment

Build an AI-powered reporting assistant where a vendor can type a natural-language question about their sales data and receive a meaningful visual answer — chart, KPI, or table.

**Core requirements:**
- Natural language → SQL → chart pipeline
- Multi-vendor support: each vendor sees only their own data
- At least bar, line, and KPI chart types
- In-memory database seeded with realistic demo data
- Deployed and publicly accessible

---

## What Was Built

### Stack
- **Next.js 16** (App Router) — frontend + API routes
- **Claude claude-sonnet-4-6** (Anthropic) — Text-to-SQL engine
- **DuckDB WASM** (`@duckdb/duckdb-wasm` blocking bundle) — in-memory analytical DB, runs on Vercel Lambda with no native dependencies
- **Recharts** — chart rendering
- **Tailwind CSS v4** — styling

### Data
Two vendors in the **Family Entertainment Center (FEC)** domain:

| Vendor | Line of Business | Products | Orders (30 days) |
|---|---|---|---|
| Supplier 1 | Food & Beverage | 15 SKUs — hot food, snacks, beverages, desserts | ~4,000 |
| Supplier 2 | Entertainment Equipment | 12 SKUs — arcade, laser tag, rides, redemption | ~2,000 |

Orders are deterministically generated (fixed seed) with realistic price variance (±10%), 1–4 items per order, statuses distributed across pending / shipped / delivered / cancelled, and shipped/delivered timestamps consistent with order dates.

### Chart Types
`bar` · `line` · `pie` · `grouped_bar` · `kpi` — selected automatically by the AI based on the question type.

---

## Additions Beyond the Original Spec

### Voice Input
A microphone button activates the Web Speech API. The transcribed text is placed in the input field; the user reviews it before submitting. Shown only in browsers that support `SpeechRecognition`.

### Vendor Dropdown Shows Line of Business
The switcher displays both the supplier name **and** the line of business (e.g. *Supplier 1 — Food & Beverage*), not just the name. This makes it immediately clear what data set you are querying.

### Auto-Expanding Input
The question input grows as you type (up to ~5 lines) and shrinks back after sending. Supports multi-line questions via Shift+Enter.

### Scrollable Bar Charts
Horizontal bar charts with many items (e.g. all customers) scroll vertically within a fixed-height container rather than pushing the page down.

### Boundary Conditions Tested and Enforced in the Prompt
- **Vendor isolation:** every query JOINs through `order_items → products → vendor_id`, even for customer-level questions. A query that bypasses this join produces wrong results.
- **Cancelled orders:** revenue queries automatically exclude cancelled orders; cancellation-specific queries do not; success/failure rate queries use conditional aggregation.
- **Status-filtered queries:** phrases like "only delivered orders" or "just shipped" are treated as WHERE filters — they do not change the aggregation metric (revenue remains revenue).
- **Monetary vs quantity:** "sales" without qualification defaults to revenue (`SUM(qty × price)`). Unit counts are used only when explicitly asked ("how many items", "number of units").
- **Grouped bar charts:** use DuckDB `PIVOT` to produce wide-format data (one column per group). Long-format `(week, category, revenue)` would silently break the chart renderer.
- **Best-per-group queries:** "top product per week" concatenates group and winner into one label column, preventing the string column from being misread as a numeric metric.
- **Out-of-scope questions:** the AI declines questions unrelated to sales data with a clear message rather than hallucinating an answer.
- **Single-column results:** if a query would produce only a label column with no metric, the AI is instructed to always add a numeric aggregate — preventing empty or broken charts.

### Password Protection
A simple password gate on the login page limits access to the shared Anthropic API key. Without it the demo would be freely callable by anyone who finds the URL.

### SQL Debug Panel
Each AI response includes a collapsible **View SQL** toggle that shows the exact DuckDB query that was generated and executed. Intended for engineers reviewing or demonstrating the system — not end-user facing.

---

## Running Locally

```bash
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY, DEMO_PASSWORD, JWT_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter the demo password, pick a vendor, and start asking questions.

```bash
npm run build   # production build (forces webpack — see Technical Notes)
```

---

## Technical Notes

### Bundler: webpack required
`next build --webpack` (set in both `package.json` and `vercel.json`) is required.
Turbopack on Vercel activates a platform-level native DuckDB adapter (`@duckdb/node-api`) that fails with a missing `libduckdb.so` on Amazon Linux 2.

### DuckDB WASM constraints
- **ICU extension disabled:** `SET autoinstall_known_extensions = false` is applied at startup. This means `current_date`, `now()`, `ILIKE`, and locale `STRFTIME` codes (`%B`, `%A`) are unavailable. The current date is injected as a literal in every AI request.
- **HUGEINT handling:** `SUM(INTEGER)` returns DuckDB's `HUGEINT` type, which Arrow JS serializes as a 128-bit `Decimal`. `runQuery` in `db.ts` decodes this from its `Uint32Array` representation — without this, all unit-count aggregates appear as zero.
- **WASM paths:** resolved via `process.cwd()`, not `require.resolve()` — Turbopack virtualizes the latter.

### Prompt engineering
All Text-to-SQL rules and the ChartRenderer column contract are documented in [`docs/PROMPTING.md`](docs/PROMPTING.md). Read it before modifying `src/lib/text2sql.ts` or `src/components/ChartRenderer.tsx`.

---

## Project Structure

```
src/
  app/
    page.tsx               — login screen
    app/page.tsx           — main chat UI
    api/auth/route.ts      — password → JWT cookie
    api/query/route.ts     — NL question → SQL → result
  components/
    ChatMessage.tsx        — message bubble + chart + SQL debug toggle
    ChartRenderer.tsx      — Recharts wrapper for all chart types
  lib/
    text2sql.ts            — Claude prompt + JSON output schema
    db.ts                  — DuckDB WASM init, seed, query runner
    seed-data.ts           — deterministic vendors / products / order generator
    auth.ts                — JWT sign/verify (jose)
docs/
  PROMPTING.md             — Text-to-SQL rules and ChartRenderer contract
scripts/
  build-db.ts              — optional local script to export a .ddb file for DBeaver inspection
```
