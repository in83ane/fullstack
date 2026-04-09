// Types and utilities for work schedule

export interface WorkScheduleItem {
  id: string;
  work_date: string;
  end_date: string | null;
  work_time: string;
  work_shift: string;
  department: string;
  detail: string;
  worker_role: string;
  worker: string;
  employee_id: string | null;
  employee_ids: string[] | null;
  user_id: string | null;
  status: 'pending' | 'inprogress' | 'complete' | null;
  lat: number | null;
  lng: number | null;
  started_at: string | null;
  completed_at: string | null;
  start_photo_url?: string | null;
  complete_photo_url?: string | null;
  summary?: string | null;
}

export interface WorkForm {
  work_date: string;
  end_date: string;
  work_time: string;
  department: string;
  detail: string;
  worker_role: string[];
  current_worker_input: string;
  selected_workers: string[];
  selected_worker_ids: string[];
}

export function normalizeWork(w: Record<string, unknown>): WorkScheduleItem {
  return {
    id: String(w._id),
    work_date: w.workDate ? String(w.workDate).substring(0, 10) : '',
    end_date: w.endDate ? String(w.endDate).substring(0, 10) : null,
    work_time: String(w.workTime ?? ''),
    work_shift: String(w.workShift ?? ''),
    department: String(w.department ?? ''),
    detail: String(w.detail ?? ''),
    worker_role: String(w.workerRole ?? ''),
    worker: String(w.worker ?? ''),
    employee_id: w.employeeId ? String(w.employeeId) : null,
    employee_ids: Array.isArray(w.employeeIds) ? (w.employeeIds as unknown[]).map(String) : null,
    user_id: w.userId ? String(w.userId) : null,
    status: (w.status as 'pending' | 'inprogress' | 'complete') ?? null,
    lat: (w.lat as number) ?? null,
    lng: (w.lng as number) ?? null,
    started_at: w.startedAt ? String(w.startedAt) : null,
    completed_at: w.completedAt ? String(w.completedAt) : null,
    start_photo_url: w.startPhotoUrl ? String(w.startPhotoUrl) : null,
    complete_photo_url: w.completePhotoUrl ? String(w.completePhotoUrl) : null,
    summary: w.summary ? String(w.summary) : null,
  };
}

export function getThaiShift(timeStr: string): string {
  const [h] = (timeStr || '08:30').split(':').map(Number);
  if (h >= 5 && h < 12) return 'เช้า';
  if (h >= 12 && h < 18) return 'บ่าย';
  return 'ค่ำ/ดึก';
}
