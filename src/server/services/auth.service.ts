import crypto from 'crypto'
import { connectDB } from '../db'
import User, { IUser } from '../models/User'
import Employee from '../models/Employee'
import { hashPassword, verifyPassword } from '../auth/password'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt'
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '../auth/rateLimit'

export class AuthError extends Error {
  constructor(message = 'Invalid email or password') {
    super(message)
    this.name = 'AuthError'
  }
}

export class AccountLockedError extends Error {
  retryAfter: number
  constructor(retryAfter: number) {
    super(`Account locked. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`)
    this.name = 'AccountLockedError'
    this.retryAfter = retryAfter
  }
}

type TokenPair = { accessToken: string; refreshToken: string }

async function issueTokens(user: IUser): Promise<TokenPair> {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    isApproved: user.role === 'admin' || user.role === 'owner' ? true : user.isApproved,
  }
  const accessToken = await signAccessToken(payload)
  const refreshToken = await signRefreshToken(payload)

  // Store hashed refresh token
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await User.updateOne(
    { _id: user._id },
    { refreshTokenHash: tokenHash, refreshTokenExpiresAt: expiresAt }
  )

  return { accessToken, refreshToken }
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<void> {
  await connectDB()

  // Check for existing email — silent: always return success-like (don't leak existence)
  const existing = await User.findOne({ email: email.toLowerCase().trim() })
  if (existing)
    throw new AuthError("Email already in use")

  const passwordHash = await hashPassword(password)
  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    fullName,
    role: 'user',
    isApproved: false,
  })

  // Create inactive employee record
  await Employee.create({ name: fullName ?? email, userId: user._id, isActive: false })
}

export async function loginUser(
  email: string,
  password: string,
  ip: string
): Promise<{ user: IUser } & TokenPair> {
  await connectDB()

  try {
    await checkRateLimit(ip, email.toLowerCase().trim())
  } catch (e: unknown) {
    if (e instanceof Error && 'retryAfter' in e) {
      throw new AccountLockedError((e as { retryAfter: number }).retryAfter)
    }
    throw e
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })

  // Generic error — don't reveal if user exists or not
  if (!user || !user.passwordHash) {
    await recordFailedAttempt(ip, email.toLowerCase().trim())
    throw new AuthError()
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    await recordFailedAttempt(ip, email.toLowerCase().trim())
    throw new AuthError()
  }

  // Successful login — clear rate limit
  await clearRateLimit(email.toLowerCase().trim())

  const tokens = await issueTokens(user)
  return { user, ...tokens }
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  await connectDB()

  let payload
  try {
    payload = await verifyRefreshToken(refreshToken)
  } catch {
    throw new AuthError('Invalid refresh token')
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const user = await User.findOne({
    _id: payload.sub,
    refreshTokenHash: tokenHash,
    refreshTokenExpiresAt: { $gt: new Date() },
  })

  if (!user) throw new AuthError('Invalid refresh token')

  return issueTokens(user)
}

export async function logoutUser(userId: string): Promise<void> {
  await connectDB()
  await User.updateOne(
    { _id: userId },
    { refreshTokenHash: null, refreshTokenExpiresAt: null }
  )
}

export async function handleGoogleUser(
  googleId: string,
  email: string,
  name: string | null
): Promise<{ user: IUser } & TokenPair> {
  await connectDB()

  // Find by googleId first, then by email
  let user = await User.findOne({ googleId })
  if (!user) {
    user = await User.findOne({ email: email.toLowerCase().trim() })
    if (user) {
      // Link Google to existing account
      user.googleId = googleId
      await user.save()
    }
  }

  if (!user) {
    // New user via Google
    user = await User.create({
      email: email.toLowerCase().trim(),
      googleId,
      fullName: name,
      role: 'user',
      isApproved: false,
    })
    await Employee.create({ name: name ?? email, userId: user._id, isActive: false })
  }

  const tokens = await issueTokens(user)
  return { user, ...tokens }
}