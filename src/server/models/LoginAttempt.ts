import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ILoginAttempt extends Document {
  ip: string
  email: string
  attempts: number
  windowStart: Date
  lockedUntil: Date | null
}

const LoginAttemptSchema = new Schema<ILoginAttempt>({
  ip: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  attempts: { type: Number, default: 1 },
  windowStart: { type: Date, default: Date.now },
  lockedUntil: { type: Date, default: null },
})

// Auto-delete documents after 1 hour of creation
LoginAttemptSchema.index({ windowStart: 1 }, { expireAfterSeconds: 3600 })

const LoginAttempt: Model<ILoginAttempt> =
  mongoose.models.LoginAttempt ??
  mongoose.model<ILoginAttempt>('LoginAttempt', LoginAttemptSchema)
export default LoginAttempt
