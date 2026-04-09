import mongoose from 'mongoose'
import { connectDB } from '../db'
import Employee, { IEmployee } from '../models/Employee'
import User from '../models/User'
import { hashPassword } from '../auth/password'

async function getNextStaffId(): Promise<string> {
  const last = await Employee.findOne({ staffId: { $ne: null } })
    .sort({ createdAt: -1 })
    .select('staffId')
    .lean()
  if (!last?.staffId) return '1'
  const num = parseInt(last.staffId)
  return isNaN(num) ? '1' : (num + 1).toString()
}

export async function listEmployees(filter?: {
  active?: boolean
  pending?: boolean
  disabled?: boolean
  userId?: string
}): Promise<IEmployee[]> {
  await connectDB()
  const query: Record<string, unknown> = {}

  if (filter?.active !== undefined) query.isActive = filter.active
  if (filter?.pending) {
    query.isActive = false
    query.userId = { $ne: null }
  }
  if (filter?.disabled) {
    query.isActive = false
    query.userId = null
  }
  if (filter?.userId) {
    query.userId = new mongoose.Types.ObjectId(filter.userId)
  }

  const q = Employee.find(query)
    .populate('departmentId', 'name colorCode')
    .sort({ createdAt: -1 })

  if (filter?.pending || filter?.userId || filter?.disabled) {
    q.populate('userId', 'email')
  }

  return q.lean()
}

export async function getEmployeeById(id: string): Promise<IEmployee | null> {
  await connectDB()
  return Employee.findById(id).populate('departmentId', 'name colorCode').lean()
}

export async function createEmployee(data: {
  name: string
  email: string
  password: string
  departmentId?: string
  staffId?: string
}): Promise<IEmployee> {
  await connectDB()

  const passwordHash = await hashPassword(data.password)
  const user = await User.create({
    email: data.email.toLowerCase().trim(),
    passwordHash,
    fullName: data.name,
    role: 'user',
    isApproved: true,
  })

  const employee = await Employee.create({
    name: data.name,
    departmentId: data.departmentId ?? null,
    staffId: data.staffId ?? null,
    userId: user._id,
    isActive: true,
  })

  return Employee.findById(employee._id)
    .populate('departmentId', 'name colorCode')
    .lean() as Promise<IEmployee>
}

export async function updateEmployee(
  id: string,
  data: Partial<{
    name: string
    departmentId: string | null
    staffId: string | null
    imageUrl: string | null
    isActive: boolean
    userId: string | null
  }>
): Promise<IEmployee | null> {
  await connectDB()
  return Employee.findByIdAndUpdate(id, data, { new: true })
    .populate('departmentId', 'name colorCode')
    .lean()
}

export async function deleteEmployee(id: string): Promise<void> {
  await connectDB()
  const emp = await Employee.findById(id)
  if (!emp) return

  if (emp.userId) {
    await User.findByIdAndDelete(emp.userId)
  }
  await Employee.findByIdAndDelete(id)
}

export async function resetEmployeePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  await connectDB()
  const hash = await hashPassword(newPassword)
  await User.findByIdAndUpdate(userId, { passwordHash: hash })
}

export async function approveEmployee(
  employeeId: string,
  departmentId?: string
): Promise<void> {
  await connectDB()
  const nextStaffId = await getNextStaffId()

  const updateData: Record<string, unknown> = { isActive: true, staffId: nextStaffId }
  if (departmentId) updateData.departmentId = new mongoose.Types.ObjectId(departmentId)

  const emp = await Employee.findByIdAndUpdate(employeeId, updateData)
  if (emp?.userId) {
    await User.findByIdAndUpdate(emp.userId, { isApproved: true })
  }
}

export async function restoreEmployee(
  employeeId: string,
  email: string,
  password: string
): Promise<void> {
  await connectDB()
  const passwordHash = await hashPassword(password)

  const nextStaffId = await getNextStaffId()

  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'user',
    isApproved: true,
  })

  await Employee.findByIdAndUpdate(employeeId, {
    isActive: true,
    userId: user._id,
    staffId: nextStaffId,
  })
}

export async function countPendingEmployees(): Promise<number> {
  await connectDB()
  return Employee.countDocuments({
    isActive: false,
    userId: { $ne: null },
  })
}
