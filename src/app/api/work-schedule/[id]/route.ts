import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, handleAuthError, requireAdmin } from '@/server/auth/requireAuth'
import * as wsService from '@/server/services/workSchedule.service'

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, 'ids must not be empty'),
  update: z.object({
    status: z.enum(['pending', 'inprogress', 'complete']),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    startPhotoUrl: z.string().optional(),
    completePhotoUrl: z.string().optional(),
    summary: z.string().optional(),
  }),
})

const singleUpdateSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  workTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workShift: z.string().optional(),
  department: z.string().min(1).optional(),
  detail: z.string().min(1).optional(),
  workerRole: z.string().optional(),
  worker: z.string().optional(),
  employeeId: z.string().nullable().optional(),
  employeeIds: z.array(z.string()).optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  status: z.enum(['pending', 'inprogress', 'complete']).optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  startPhotoUrl: z.string().optional(),
  completePhotoUrl: z.string().optional(),
  summary: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const body = await request.json()

    // Bulk update
    if (body.ids !== undefined) {
      const parsed = bulkUpdateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
      }
      await wsService.bulkUpdateStatus(parsed.data.ids, parsed.data.update as never)
      return NextResponse.json({ success: true })
    }

    // Single update
    const parsed = singleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const schedule = await wsService.updateWorkSchedule(id, parsed.data as never)
    if (!schedule) {
      return NextResponse.json({ error: 'Work schedule not found' }, { status: 404 })
    }
    return NextResponse.json({ schedule })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request)
    const { id } = await params
    await wsService.deleteWorkSchedule(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
