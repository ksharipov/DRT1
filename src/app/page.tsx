'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/app')
      } else {
        setError('Invalid password. Please try again.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col" style={{ backgroundColor: '#008080' }}>
      <header className="px-8 py-5 flex items-center gap-3">
        <div className="w-6 h-6 rounded-sm" style={{ backgroundColor: '#39FF14' }} />
        <span className="text-white font-bold text-xl tracking-tight">NexTrade</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded p-8" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#008080', letterSpacing: '0.1em' }}>
              AI REPORTING ASSISTANT
            </p>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A', letterSpacing: '-0.035em' }}>
              Vendor Sign In
            </h1>
            <p className="text-sm mb-6" style={{ color: '#6C757D' }}>
              Enter your access password to continue.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6C757D', letterSpacing: '0.08em' }}>
                  PASSWORD
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter access password"
                  className="w-full px-3 py-2.5 text-sm rounded border outline-none"
                  style={{ borderColor: '#E5E7EB', color: '#1A1A1A' }}
                  onFocus={e => (e.target.style.borderColor = '#008080')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-2.5 text-sm font-semibold text-white rounded"
                style={{ backgroundColor: '#008080', opacity: loading || !password ? 0.55 : 1, cursor: loading || !password ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
