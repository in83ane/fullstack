import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { registerUser } from '@/server/services/auth.service'

const registerBodySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'fullName is required')
    .max(200, 'fullName is too long')
    .regex(/^[\u0E00-\u0E7Fa-zA-Z\s'-]+$/, 'Invalid characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(254, 'Email is too long')
    .toLowerCase(),
  password: z
    .string()
    .min(15, 'Password doesnt meet the security requirments')
    .max(128, 'Password is too long'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = registerBodySchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input data'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { email, password, fullName } = parsed.data

    await registerUser(email, password, fullName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
