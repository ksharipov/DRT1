'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatMessage, { type Message } from '@/components/ChatMessage'
import { SUPPLIER_1_ID, SUPPLIER_2_ID } from '@/lib/seed-data'

const VENDORS = [
  { id: SUPPLIER_1_ID, name: 'Supplier 1', label: 'Food & Beverage' },
  { id: SUPPLIER_2_ID, name: 'Supplier 2', label: 'Entertainment Equipment' },
]

const SUGGESTIONS = [
  'What were my top 5 products last month?',
  'Show me my daily sales for the last 30 days',
  'What is my revenue breakdown by category?',
  'How do my sales this week compare to last week?',
  'Which customers order from me the most?',
  'What is my total revenue this year?',
]

export default function AppPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [vendorId, setVendorId] = useState(SUPPLIER_1_ID)
  const [listening, setListening] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognizerRef = useRef<any>(null)
  const router = useRouter()

  const hasSpeech = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listening) { recognizerRef.current?.stop(); return }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
    }
    rec.start()
    recognizerRef.current = rec
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const currentVendor = VENDORS.find(v => v.id === vendorId) ?? VENDORS[0]

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text.trim(), vendorId }),
      })

      if (res.status === 401) {
        router.push('/')
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: 'assistant', text: '',
          error: data.error ?? 'Something went wrong. Please try again.',
        }])
        return
      }

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.textAnswer,
        sql: data.sql,
        chartType: data.chartType,
        columns: data.columns,
        rows: data.rows,
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant', text: '',
        error: 'Network error. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 shrink-0" style={{ backgroundColor: '#008080' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: '#39FF14' }} />
          <span className="text-white font-bold text-lg tracking-tight">NexTrade</span>
          <span className="text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-widest" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            AI
          </span>
        </div>

        {/* Vendor switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>Viewing as</span>
          <select
            value={vendorId}
            onChange={e => {
              setVendorId(e.target.value)
              setMessages([])
            }}
            className="text-sm font-semibold rounded px-3 py-1.5 border-0 outline-none cursor-pointer"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            {VENDORS.map(v => (
              <option key={v.id} value={v.id} style={{ backgroundColor: '#008080', color: '#fff' }}>
                {v.name} — {v.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-8 pb-4">
              <div className="w-10 h-10 rounded flex items-center justify-center mb-4" style={{ backgroundColor: '#008080' }}>
                <span style={{ color: '#39FF14', fontSize: 20 }}>◈</span>
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#1A1A1A', letterSpacing: '-0.03em' }}>
                Ask anything about your sales
              </h2>
              <p className="text-sm text-center max-w-sm" style={{ color: '#6C757D' }}>
                Type a question in plain English. {currentVendor.name} data only.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-xs px-3 py-2.5 rounded border transition-colors"
                    style={{ borderColor: '#E5E7EB', color: '#1A1A1A', backgroundColor: '#fff' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#008080' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <ChatMessage key={msg.id} msg={msg} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 px-4 py-3 bg-white rounded border-l-4" style={{ borderLeftColor: '#39FF14', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#39FF14' }} />
                <span className="text-xs" style={{ color: '#6C757D' }}>Analyzing your data…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-4 bg-white" style={{ borderTop: '1px solid #E5E7EB' }}>
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <div className="flex-1 flex items-center gap-2 rounded border px-3 py-2" style={{ borderColor: '#E5E7EB' }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = '#008080')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#39FF14' }} />
            {hasSpeech && (
              <button
                onClick={startVoice}
                title={listening ? 'Stop recording' : 'Voice input'}
                className="shrink-0 text-base leading-none transition-colors"
                style={{ color: listening ? '#ef4444' : '#6C757D', animation: listening ? 'pulse 1s infinite' : 'none' }}
              >
                🎤
              </button>
            )}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={listening ? 'Listening…' : `Ask ${currentVendor.name} anything about your sales…`}
              disabled={loading}
              className="flex-1 text-sm outline-none resize-none bg-transparent"
              style={{ color: '#1A1A1A', maxHeight: 120 }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 px-4 py-2 text-sm font-semibold text-white rounded"
            style={{ backgroundColor: '#008080', opacity: !input.trim() || loading ? 0.5 : 1, cursor: !input.trim() || loading ? 'not-allowed' : 'pointer' }}
          >
            →
          </button>
        </div>
        <p className="text-center mt-1.5 text-xs" style={{ color: '#6C757D' }}>
          ENTER TO SEND · SHIFT + ENTER FOR NEWLINE · <span style={{ color: '#39FF14' }}>● AI READY</span>
        </p>
      </div>
    </div>
  )
}
