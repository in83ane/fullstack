import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOnly, handleAuthError } from '@/server/auth/requireAuth'
import * as deptService from '@/server/services/department.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOnly(request)
    const { id } = await params
    const data = await request.json()
    if (data.colorCode && !/^#[0-9A-Fa-f]{6}$/.test(data.colorCode)) {
      return NextResponse.json({ error: 'Invalid color code' }, { status: 400 })
    }
    const department = await deptService.updateDepartment(id, data)
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }
    return NextResponse.json({ department })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOnly(request)
    const { id } = await params
    await deptService.deleteDepartment(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
