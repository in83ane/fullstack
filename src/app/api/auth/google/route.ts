import { NextRequest, NextResponse } from 'next/server'
import { googleClient, generateCodeVerifier, generateState } from '@/server/auth/google'

export async function GET(_request: NextRequest) {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()

  const url = googleClient.createAuthorizationURL(state, codeVerifier, [
    'openid',
    'email',
    'profile',
  ])

  const response = NextResponse.redirect(url)

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 min
    path: '/',
  }

  response.cookies.set('oauth_state', state, cookieOpts)
  response.cookies.set('oauth_verifier', codeVerifier, cookieOpts)

  return response
}
