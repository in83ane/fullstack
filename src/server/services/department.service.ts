import { connectDB } from '../db'
import Department, { IDepartment } from '../models/Department'

export async function listDepartments(): Promise<IDepartment[]> {
  await connectDB()
  return Department.find().sort({ createdAt: -1 }).lean()
}

export async function createDepartment(data: {
  name: string
  colorCode?: string
}): Promise<IDepartment> {
  await connectDB()
  return Department.create({ name: data.name.trim(), colorCode: data.colorCode ?? '#334155' })
}

export async function updateDepartment(
  id: string,
  data: Partial<{ name: string; colorCode: string }>
): Promise<IDepartment | null> {
  await connectDB()
  return Department.findByIdAndUpdate(id, data, { new: true }).lean()
}

export async function deleteDepartment(id: string): Promise<void> {
  await connectDB()
  await Department.findByIdAndDelete(id)
}
