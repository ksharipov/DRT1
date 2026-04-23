import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { textToSQL } from '@/lib/text2sql'
import { runQuery } from '@/lib/db'
import { SUPPLIER_1_ID, SUPPLIER_2_ID } from '@/lib/seed-data'

const ALLOWED_VENDOR_IDS = new Set([SUPPLIER_1_ID, SUPPLIER_2_ID])

export async function POST(req: NextRequest) {
  // Auth check
  const token = req.cookies.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question, vendorId } = await req.json()

  if (!question?.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  // Vendor isolation: only allow known demo vendor UUIDs
  if (!ALLOWED_VENDOR_IDS.has(vendorId)) {
    return NextResponse.json({ error: 'Invalid vendor' }, { status: 400 })
  }

  try {
    const result = await textToSQL(question, vendorId)

    if (!result.canAnswer || !result.sql) {
      return NextResponse.json({
        canAnswer: false,
        sql: null,
        chartType: null,
        textAnswer: result.textAnswer,
        columns: [],
        rows: [],
      })
    }

    const { columns, rows } = await runQuery(result.sql)

    // Serialize any BigInt values
    const safeRows = rows.map(row =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])
      )
    )

    return NextResponse.json({
      canAnswer: true,
      sql: result.sql,
      chartType: result.chartType,
      textAnswer: result.textAnswer,
      columns,
      rows: safeRows,
    })
  } catch (err) {
    console.error('Query error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Query failed: ${msg}` }, { status: 500 })
  }
}
