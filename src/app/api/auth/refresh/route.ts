import { NextRequest, NextResponse } from 'next/server'
import { refreshTokens, AuthError } from '@/server/services/auth.service'
import { getRefreshToken, setAuthCookies } from '@/server/auth/session'

export async function GET(request: NextRequest) {
  const returnUrl = request.nextUrl.searchParams.get('returnUrl') ?? '/home'

  try {
    const refreshToken = getRefreshToken(request)
    if (!refreshToken) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const { accessToken, refreshToken: newRefreshToken } = await refreshTokens(refreshToken)

    const response = NextResponse.redirect(new URL(returnUrl, request.url))
    setAuthCookies(response, accessToken, newRefreshToken)
    return response
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    console.error('Refresh error:', error)
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}
