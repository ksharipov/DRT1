'use client'

import { useState } from 'react'
import ChartRenderer from './ChartRenderer'
import type { ChartType } from '@/lib/text2sql'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  sql?: string | null
  chartType?: ChartType
  columns?: string[]
  rows?: Record<string, unknown>[]
  error?: string
}

export default function ChatMessage({ msg }: { msg: Message }) {
  const [sqlOpen, setSqlOpen] = useState(false)

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-lg px-4 py-3 rounded text-sm text-white"
          style={{ backgroundColor: '#1A1A1A' }}
        >
          {msg.text}
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex justify-start">
      <div className="max-w-2xl w-full">
        {/* AI label */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#39FF14' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#39FF14', letterSpacing: '0.1em' }}>
            AI RESPONSE
          </span>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded p-4 border-l-4"
          style={{ borderLeftColor: '#39FF14', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
        >
          {msg.error ? (
            <p className="text-sm" style={{ color: '#DC2626' }}>{msg.error}</p>
          ) : (
            <>
              <p className="text-sm leading-relaxed mb-3" style={{ color: '#1A1A1A' }}>
                {msg.text}
              </p>

              {msg.chartType && msg.columns && msg.rows && msg.rows.length > 0 && (
                <div className="mt-2">
                  <ChartRenderer chartType={msg.chartType} columns={msg.columns} rows={msg.rows} />
                </div>
              )}

              {msg.sql && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <button
                    onClick={() => setSqlOpen(o => !o)}
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: '#6C757D' }}
                  >
                    <span style={{ transform: sqlOpen ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
                    View SQL
                  </button>

                  {sqlOpen && (
                    <pre
                      className="mt-2 p-3 rounded text-xs overflow-x-auto"
                      style={{ backgroundColor: '#F8F9FA', color: '#1A1A1A', fontFamily: 'ui-monospace, monospace', border: '1px solid #E5E7EB' }}
                    >
                      {msg.sql}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
