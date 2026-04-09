import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, handleAuthError } from '@/server/auth/requireAuth'
import * as wsService from '@/server/services/workSchedule.service'

const createWorkSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'workDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  workTime: z.string().regex(/^\d{2}:\d{2}$/, 'workTime must be HH:mm'),
  workShift: z.string().optional(),
  department: z.string().min(1, 'department is required'),
  detail: z.string().min(1, 'detail is required'),
  workerRole: z.string().min(1, 'workerRole is required'),
  worker: z.string().optional(),
  employeeId: z.string().nullable().optional(),
  employeeIds: z.array(z.string()).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const payload = await requireAuth(request)
    const isAdmin = payload.role === 'admin' || payload.role === 'owner'

    let employeeId = request.nextUrl.searchParams.get('employeeId') ?? undefined

    if (!isAdmin) {
      // user ปกติ → หา employeeId ของตัวเองจาก DB
      const ownEmployeeId = await wsService.getEmployeeIdByUserId(payload.sub)
      // ถ้าส่ง employeeId มาแต่ไม่ใช่ของตัวเอง → 403
      if (employeeId && employeeId !== ownEmployeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // บังคับให้ query เฉพาะ employeeId ของตัวเอง
      employeeId = ownEmployeeId ?? 'none'
    }
    // query ด้วย employeeId ที่กำหนดไว้แล้ว
    const schedules = await wsService.listWorkSchedules({ employeeId })
    return NextResponse.json({ schedules })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await requireAuth(request)
    const body = await request.json()

    const parsed = createWorkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const schedule = await wsService.createWorkSchedule(
      { ...parsed.data, userId: payload.sub } as unknown as Parameters<typeof wsService.createWorkSchedule>[0]
    )
    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
