import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOnly, handleAuthError } from '@/server/auth/requireAuth'
import * as employeeService from '@/server/services/employee.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOnly(request)
    const { id } = await params
    const data = await request.json()

    // Password reset
    if (data.newPassword) {
      const emp = await employeeService.getEmployeeById(id)
      if (!emp?.userId) {
        return NextResponse.json({ error: 'Employee has no user account' }, { status: 400 })
      }
      await employeeService.resetEmployeePassword(emp.userId.toString(), data.newPassword)
      return NextResponse.json({ success: true })
    }

    // Approval (with optional department)
    if (data.approve === true) {
      await employeeService.approveEmployee(id, data.departmentId)
      return NextResponse.json({ success: true })
    }

    // Restore disabled employee
    if (data.restore === true) {
      if (!data.email || !data.password) {
        return NextResponse.json({ error: 'Email and password required for restore' }, { status: 400 })
      }
      await employeeService.restoreEmployee(id, data.email, data.password)
      return NextResponse.json({ success: true })
    }

    const employee = await employeeService.updateEmployee(id, data)
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    return NextResponse.json({ employee })
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
    await employeeService.deleteEmployee(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
