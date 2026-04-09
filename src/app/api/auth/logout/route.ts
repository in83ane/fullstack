import { NextRequest, NextResponse } from 'next/server'
import { logoutUser } from '@/server/services/auth.service'
import { clearAuthCookies, getAccessToken } from '@/server/auth/session'
import { verifyAccessToken } from '@/server/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const token = getAccessToken(request)
    if (token) {
      try {
        const payload = await verifyAccessToken(token)
        await logoutUser(payload.sub!)
      } catch {
        // Token already invalid — still clear cookies
      }
    }
  } catch {
    // Best-effort logout
  }

  const response = NextResponse.json({ success: true })
  clearAuthCookies(response)
  return response
}
