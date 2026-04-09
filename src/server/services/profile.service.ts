import { connectDB } from '../db'
import User from '../models/User'
import Employee from '../models/Employee'
import type { AuthPayload } from '../auth/jwt'

export async function getMyProfile(payload: AuthPayload) {
  await connectDB()

  const user = await User.findById(payload.sub)
    .select('fullName')
    .lean()

  if (!user) return null

  const employee = await Employee.findOne({ userId: payload.sub })
    .select('_id name')
    .lean()

  return {
    _id: payload.sub,
    email: payload.email,
    role: payload.role,
    isApproved: payload.isApproved,
    fullName: user.fullName ?? null,
    employeeId: employee?._id?.toString() ?? null,
    employeeName: employee?.name ?? null,
  }
}
