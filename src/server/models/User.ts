import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  email: string
  passwordHash: string | null
  googleId: string | null
  role: 'user' | 'admin' | 'owner'
  isApproved: boolean
  fullName: string | null
  failedLoginAttempts: number
  refreshTokenHash: string | null
  refreshTokenExpiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null, unique: true, sparse: true },
    role: { type: String, enum: ['user', 'admin', 'owner'], default: 'user' },
    isApproved: { type: Boolean, default: false },
    fullName: { type: String, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
)

const User: Model<IUser> = mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)
export default User
