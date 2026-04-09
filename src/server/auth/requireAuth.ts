import { NextRequest } from 'next/server'
import { verifyAccessToken, type AuthPayload } from './jwt'

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

function getTokenFromRequest(request: NextRequest): string {
  const token = request.cookies.get('access_token')?.value
  if (!token) throw new AuthError()
  return token
}

export async function requireAuth(request: NextRequest): Promise<AuthPayload> {
  const token = getTokenFromRequest(request)
  try {
    return await verifyAccessToken(token)
  } catch {
    throw new AuthError()
  }
}

export async function requireAdmin(request: NextRequest): Promise<AuthPayload> {
  const payload = await requireAuth(request)
  if (payload.role !== 'admin' && payload.role !== 'owner') {
    throw new ForbiddenError()
  }
  return payload
}

export async function requireAdminOnly(request: NextRequest): Promise<AuthPayload> {
  const payload = await requireAuth(request)
  if (payload.role !== 'admin') {
    throw new ForbiddenError()
  }
  return payload
}

export async function requireOwner(request: NextRequest): Promise<AuthPayload> {
  const payload = await requireAuth(request)
  if (payload.role !== 'owner') {
    throw new ForbiddenError()
  }
  return payload
}

export function handleAuthError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  console.error(error)
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
