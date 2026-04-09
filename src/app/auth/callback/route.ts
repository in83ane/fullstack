import { NextRequest, NextResponse } from 'next/server'
import { googleClient } from '@/server/auth/google'
import { handleGoogleUser } from '@/server/services/auth.service'
import { setAuthCookies } from '@/server/auth/session'
import { decodeIdToken } from 'arctic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const storedState = request.cookies.get('oauth_state')?.value
  const codeVerifier = request.cookies.get('oauth_verifier')?.value

  // Validate state to prevent CSRF
  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return NextResponse.redirect(new URL('/auth/login?error=oauth_failed', request.url))
  }

  try {
    const tokens = await googleClient.validateAuthorizationCode(code, codeVerifier)
    const idToken = tokens.idToken()

    const claims = decodeIdToken(idToken) as {
      sub: string
      email: string
      name?: string
    }

    if (!claims.sub || typeof claims.sub !== 'string') {
      throw new Error('Invalid Google token: missing sub')
    }
    if (!claims.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)) { // NOSONAR
      throw new Error('Invalid Google token: invalid email')
    }
    if (claims.name && claims.name.length > 200) {
      claims.name = claims.name.slice(0, 200)
    }

    const { user, accessToken, refreshToken } = await handleGoogleUser(
      claims.sub,
      claims.email,
      claims.name ?? null
    )

    const isAdmin = user.role === 'admin' || user.role === 'owner'
    const isApproved = isAdmin || user.isApproved

    const redirectUrl = isApproved ? '/home' : '/auth/pending'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.url
    const response = NextResponse.redirect(new URL(redirectUrl, baseUrl))

    setAuthCookies(response, accessToken, refreshToken)

    // Clear oauth cookies
    response.cookies.set('oauth_state', '', { maxAge: 0, path: '/' })
    response.cookies.set('oauth_verifier', '', { maxAge: 0, path: '/' })

    return response
  } catch (error) {
    console.error('OAuth callback error:', error instanceof Error ? error.message : error)
    return NextResponse.redirect(new URL('/auth/login?error=oauth_failed', request.url))
  }
}
