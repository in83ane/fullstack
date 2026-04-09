import { connectDB } from '../db'
import LoginAttempt from '../models/LoginAttempt'

export class RateLimitError extends Error {
  retryAfter: number
  constructor(retryAfter: number) {
    super(`Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

const ACCOUNT_WINDOW_MS = 15 * 60 * 1000   // 15 min
const ACCOUNT_MAX = 5
const ACCOUNT_LOCK_MS = 15 * 60 * 1000     // lock 15 min

const IP_WINDOW_MS = 60 * 60 * 1000        // 1 hour
const IP_MAX = 10
const IP_LOCK_MS = 60 * 60 * 1000          // lock 1 hour

export async function checkRateLimit(ip: string, email: string): Promise<void> {
  await connectDB()
  const now = new Date()

  // Check by email (account lockout)
  const emailRecord = await LoginAttempt.findOne({ email })
  if (emailRecord?.lockedUntil && emailRecord.lockedUntil > now) {
    const retryAfter = Math.ceil((emailRecord.lockedUntil.getTime() - now.getTime()) / 1000)
    throw new RateLimitError(retryAfter)
  }

  // Check by IP
  const ipRecord = await LoginAttempt.findOne({ ip })
  if (ipRecord?.lockedUntil && ipRecord.lockedUntil > now) {
    const retryAfter = Math.ceil((ipRecord.lockedUntil.getTime() - now.getTime()) / 1000)
    throw new RateLimitError(retryAfter)
  }
}

export async function recordFailedAttempt(ip: string, email: string): Promise<void> {
  await connectDB()
  const now = new Date()

  // Update email record
  const emailRecord = await LoginAttempt.findOne({ email })
  if (!emailRecord || now.getTime() - emailRecord.windowStart.getTime() > ACCOUNT_WINDOW_MS) {
    await LoginAttempt.findOneAndUpdate(
      { email },
      { email, ip, attempts: 1, windowStart: now, lockedUntil: null },
      { upsert: true }
    )
  } else {
    const newAttempts = emailRecord.attempts + 1
    const lockedUntil = newAttempts >= ACCOUNT_MAX
      ? new Date(now.getTime() + ACCOUNT_LOCK_MS)
      : null
    await LoginAttempt.updateOne({ email }, { attempts: newAttempts, lockedUntil })
  }

  // Update IP record
  const ipRecord = await LoginAttempt.findOne({ ip, email: { $exists: false } }) ??
    await LoginAttempt.findOne({ ip })
  if (!ipRecord || now.getTime() - (ipRecord.windowStart?.getTime() ?? 0) > IP_WINDOW_MS) {
    await LoginAttempt.findOneAndUpdate(
      { ip, email: ip }, // use ip as email key for IP-only records
      { ip, email: ip, attempts: 1, windowStart: now, lockedUntil: null },
      { upsert: true }
    )
  } else {
    // count all IP attempts across emails
    const ipAttempts = await LoginAttempt.aggregate([
      { $match: { ip, windowStart: { $gte: new Date(now.getTime() - IP_WINDOW_MS) } } },
      { $group: { _id: null, total: { $sum: '$attempts' } } }
    ])
    const total = ipAttempts[0]?.total ?? 0
    if (total >= IP_MAX) {
      await LoginAttempt.updateMany(
        { ip },
        { lockedUntil: new Date(now.getTime() + IP_LOCK_MS) }
      )
    }
  }
}

export async function clearRateLimit(email: string): Promise<void> {
  await connectDB()
  await LoginAttempt.deleteMany({ email })
}
