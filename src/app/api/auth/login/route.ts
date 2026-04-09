import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { loginUser, AuthError, AccountLockedError } from '@/server/services/auth.service'
import { setAuthCookies } from '@/server/auth/session'

const loginBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(254, 'Email is too long')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = loginBodySchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid credentials format'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { email, password } = parsed.data

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1'

    const { user, accessToken, refreshToken } = await loginUser(email, password, ip)

    const isAdmin = user.role === 'admin' || user.role === 'owner'
    const isApproved = isAdmin || user.isApproved

    const response = NextResponse.json({
      user: { email: user.email, role: user.role, isApproved },
    })

    setAuthCookies(response, accessToken, refreshToken)
    return response
  } catch (error) {
    if (error instanceof AccountLockedError) {
      const response = NextResponse.json({ error: error.message }, { status: 429 })
      response.headers.set('Retry-After', String(error.retryAfter))
      return response
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
