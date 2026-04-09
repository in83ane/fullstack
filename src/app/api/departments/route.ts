import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdminOnly, handleAuthError } from '@/server/auth/requireAuth'
import * as deptService from '@/server/services/department.service'

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    const departments = await deptService.listDepartments()
    return NextResponse.json({ departments })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminOnly(request)
    const data = await request.json()
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (data.colorCode && !/^#[0-9A-Fa-f]{6}$/.test(data.colorCode)) {
      return NextResponse.json({ error: 'Invalid color code' }, { status: 400 })
    }
    const department = await deptService.createDepartment(data)
    return NextResponse.json({ department }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
