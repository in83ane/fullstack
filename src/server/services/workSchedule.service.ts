import mongoose from 'mongoose'
import { connectDB } from '../db'
import WorkSchedule, { IWorkSchedule } from '../models/WorkSchedule'
import Employee from '../models/Employee'

export async function getEmployeeIdByUserId(userId: string): Promise<string | null> {
  await connectDB()
  const emp = await Employee.findOne({ userId }).select('_id').lean()
  return emp?._id?.toString() ?? null
}

export async function listWorkSchedules(filter?: {
  employeeId?: string
  userId?: string
}): Promise<IWorkSchedule[]> {
  await connectDB()
  const query: Record<string, unknown> = {}

  if (filter?.employeeId) {
    const oid = new mongoose.Types.ObjectId(filter.employeeId)
    query.$or = [{ employeeIds: oid }, { employeeId: oid }]
  }
  if (filter?.userId) {
    query.userId = new mongoose.Types.ObjectId(filter.userId)
  }

  return WorkSchedule.find(query).sort({ workDate: -1, createdAt: -1 }).lean()
}

export async function createWorkSchedule(
  data: Partial<IWorkSchedule> & { userId: string }
): Promise<IWorkSchedule> {
  await connectDB()
  return WorkSchedule.create({ ...data, status: 'pending' })
}

export async function updateWorkSchedule(
  id: string,
  data: Partial<IWorkSchedule>
): Promise<IWorkSchedule | null> {
  await connectDB()
  return WorkSchedule.findByIdAndUpdate(id, data, { new: true }).lean()
}

export async function deleteWorkSchedule(id: string): Promise<void> {
  await connectDB()
  await WorkSchedule.findByIdAndDelete(id)
}

export async function bulkUpdateStatus(
  ids: string[],
  data: Partial<IWorkSchedule>
): Promise<void> {
  await connectDB()
  await WorkSchedule.updateMany(
    { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } },
    data
  )
}
