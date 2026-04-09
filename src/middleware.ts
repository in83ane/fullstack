import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './server/auth/jwt'

const pathsByRole: Record<string, string[]> = {
  owner: ['/home', '/price', '/calendar', '/map', '/admin-management', '/settings'],
  admin: ['/home', '/price', '/calendar', '/map', '/employees', '/departments', '/settings'],
  user: ['/home', '/calendar', '/settings', '/map'],
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip auth paths and api routes
  if (path.startsWith('/auth/') || path.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Root path — redirect based on auth state
  if (path === '/') {
    const token = request.cookies.get('access_token')?.value
    if (token) {
      try {
        await verifyAccessToken(token)
        return NextResponse.redirect(new URL('/home', request.url))
      } catch {
        // token invalid — fall through to login redirect
      }
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const allProtectedPaths = Object.values(pathsByRole).flat()
  const isProtectedRoute = allProtectedPaths.some((p) => path.startsWith(p))

  if (!isProtectedRoute) return NextResponse.next()

  const token = request.cookies.get('access_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  try {
    const payload = await verifyAccessToken(token)

    const isAdminOrOwner = payload.role === 'admin' || payload.role === 'owner'
    const isApproved = isAdminOrOwner ? true : payload.isApproved

    if (!isApproved) {
      return NextResponse.redirect(new URL('/auth/pending', request.url))
    }

    const allowedPaths = pathsByRole[payload.role] ?? []
    const hasAccess = allowedPaths.some((p) => path.startsWith(p))

    if (!hasAccess) {
      return NextResponse.redirect(new URL('/home', request.url))
    }

    return NextResponse.next()
  } catch {
    // Token expired or invalid — attempt refresh
    const refreshToken = request.cookies.get('refresh_token')?.value
    if (refreshToken) {
      const refreshUrl = new URL('/api/auth/refresh', request.url)
      refreshUrl.searchParams.set('returnUrl', path)
      return NextResponse.redirect(refreshUrl)
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
