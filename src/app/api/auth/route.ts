import { NextRequest, NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.DEMO_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await signToken({ authenticated: true })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })
  return res
}
