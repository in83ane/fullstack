import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/server/auth/requireAuth'
import { getMyProfile } from '@/server/services/profile.service'

export async function GET(request: NextRequest) {
  try {
    const payload = await requireAuth(request)
    const profile = await getMyProfile(payload)
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ user: profile })
  } catch (error) {
    return handleAuthError(error)
  }
}
