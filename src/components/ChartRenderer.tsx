'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'
import type { ChartType } from '@/lib/text2sql'

interface Props {
  chartType: ChartType
  columns: string[]
  rows: Record<string, unknown>[]
}

const COLORS = ['#008080', '#39FF14', '#6C757D', '#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v) || 0
  return 0
}

function fmtValue(v: unknown): string {
  const n = toNum(v)
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  return `$${n.toFixed(2)}`
}

function fmtLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function ChartRenderer({ chartType, columns, rows }: Props) {
  if (!rows.length || !columns.length) return null

  const [labelCol, ...valueColumns] = columns

  // KPI: single value
  if (chartType === 'kpi') {
    const val = rows[0][valueColumns[0] ?? labelCol]
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <p className="text-5xl font-bold" style={{ color: '#008080', letterSpacing: '-0.04em' }}>
          {toNum(val) >= 100 ? `$${toNum(val).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : toNum(val).toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm mt-2" style={{ color: '#6C757D' }}>{fmtLabel(valueColumns[0] ?? labelCol)}</p>
      </div>
    )
  }

  // PIE
  if (chartType === 'pie') {
    const valCol = valueColumns[0] ?? columns[1]
    const data = rows.map(r => ({ name: String(r[labelCol] ?? ''), value: toNum(r[valCol]) }))
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`} labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => fmtValue(v)} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // LINE
  if (chartType === 'line') {
    const data = rows.map(r => ({ label: String(r[labelCol] ?? ''), ...Object.fromEntries(valueColumns.map(c => [c, toNum(r[c])])) }))
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6C757D' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6C757D' }} tickFormatter={v => `$${Number(v).toLocaleString()}`} />
          <Tooltip formatter={(v) => fmtValue(v)} />
          {valueColumns.map((col, i) => (
            <Line key={col} type="monotone" dataKey={col} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} name={fmtLabel(col)} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // GROUPED BAR
  if (chartType === 'grouped_bar') {
    const data = rows.map(r => ({ label: String(r[labelCol] ?? ''), ...Object.fromEntries(valueColumns.map(c => [c, toNum(r[c])])) }))
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6C757D' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6C757D' }} tickFormatter={v => `$${Number(v).toLocaleString()}`} />
          <Tooltip formatter={(v) => fmtValue(v)} />
          <Legend formatter={fmtLabel} />
          {valueColumns.map((col, i) => (
            <Bar key={col} dataKey={col} fill={COLORS[i % COLORS.length]} name={fmtLabel(col)} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // BAR (horizontal, default)
  const valCol = valueColumns[0] ?? columns[1] ?? labelCol
  const data = rows.map(r => ({ label: String(r[labelCol] ?? ''), value: toNum(r[valCol]) }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#6C757D' }} tickFormatter={v => `$${Number(v).toLocaleString()}`} />
        <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12, fill: '#1A1A1A' }} />
        <Tooltip formatter={(v) => fmtValue(v)} />
        <Bar dataKey="value" fill="#008080" name={fmtLabel(valCol)} radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
