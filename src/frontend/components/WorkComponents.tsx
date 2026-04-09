'use client';

import React from 'react';
import {
  X, Camera, PlayCircle, CheckCircle2, Timer, MapPin, Clock, CalendarRange,
  Building2
} from 'lucide-react';
import { formatDisplayDate, formatTimestamp, calcDuration, handleKeyClick } from '@/frontend/lib/utils';

// Photo section component
export function PhotoSection({
  startPhotoUrl,
  completePhotoUrl
}: {
  startPhotoUrl: string | null | undefined;
  completePhotoUrl: string | null | undefined;
}) {
  if (!startPhotoUrl && !completePhotoUrl) return null;

  return (
    <div className="rounded-xl md:rounded-2xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Camera size={11} /> รูปยืนยันงาน
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3">
        {startPhotoUrl ? (
          <div>
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <PlayCircle size={10} /> รูปเริ่มงาน
            </p>
            <a href={startPhotoUrl} target="_blank" rel="noopener noreferrer">
              <img src={startPhotoUrl} alt="เริ่มงาน" className="w-full h-28 object-cover rounded-xl border-2 border-blue-100 hover:opacity-90 transition-opacity" />
            </a>
          </div>
        ) : (
          <div className="h-28 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
            <p className="text-[9px] font-bold text-slate-300 text-center">ยังไม่มีรูปเริ่มงาน</p>
          </div>
        )}
        {completePhotoUrl ? (
          <div>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <CheckCircle2 size={10} /> รูปเสร็จงาน
            </p>
            <a href={completePhotoUrl} target="_blank" rel="noopener noreferrer">
              <img src={completePhotoUrl} alt="เสร็จงาน" className="w-full h-28 object-cover rounded-xl border-2 border-emerald-100 hover:opacity-90 transition-opacity" />
            </a>
          </div>
        ) : (
          <div className="h-28 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
            <p className="text-[9px] font-bold text-slate-300 text-center">ยังไม่มีรูปเสร็จงาน</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Timeline section component
interface TimelineSectionProps {
  startedAt: string | null | undefined;
  completedAt: string | null | undefined;
  summary?: string | null;
}

export function TimelineSection({ startedAt, completedAt, summary }: TimelineSectionProps) {
  if (!startedAt && !completedAt) return null;

  const duration = calcDuration(startedAt, completedAt);

  return (
    <div className="rounded-xl md:rounded-2xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Timer size={11} /> บันทึกเวลาดำเนินงาน
        </span>
        {duration && (
          <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Timer size={10} /> รวม {duration}
          </span>
        )}
      </div>
      <div className="divide-y divide-slate-50">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <PlayCircle size={15} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">เริ่มดำเนินงาน</p>
            <p className="text-sm font-bold text-slate-800">
              {startedAt ? formatTimestamp(startedAt) : <span className="text-slate-300">ยังไม่ได้เริ่ม</span>}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">เสร็จสิ้น</p>
            <p className="text-sm font-bold text-slate-800">
              {completedAt ? formatTimestamp(completedAt) : <span className="text-slate-300">ยังไม่เสร็จ</span>}
            </p>
            {summary && (
              <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 size={10} /> สรุปรายการ
                </p>
                <p className="text-sm font-bold text-emerald-800">{summary}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Common interfaces for work items
export interface BaseWorkItem {
  id: string;
  detail: string;
  department: string;
  work_date: string;
  end_date: string | null;
  work_time: string;
  worker: string;
  worker_role: string;
  status: 'pending' | 'inprogress' | 'complete';
  lat: number | null;
  lng: number | null;
  started_at: string | null;
  completed_at: string | null;
  employee_ids: string[] | null;
  start_photo_url?: string | null;
  complete_photo_url?: string | null;
  summary?: string | null;
}

// CSS for animations
export const statusAnimationStyles = `
  @keyframes status-glow-red { 0%, 100% { background-color: #ffffff; } 50% { background-color: #fef2f2; } }
  @keyframes status-glow-orange { 0%, 100% { background-color: #ffffff; } 50% { background-color: #fffbeb; } }
  .glow-overdue { animation: status-glow-red 2s infinite ease-in-out; }
  .glow-inprogress { animation: status-glow-orange 2.5s infinite ease-in-out; }
`;

// Calendar specific styles
export const calendarAnimationStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
  .thai-font-container { font-family: 'Prompt', sans-serif !important; }

  @keyframes pulse-red-dynamic {
    0%, 100% { background-color: var(--dept-color); }
    50% { background-color: #ef4444; }
  }
  @keyframes pulse-yellow-dynamic {
    0%, 100% { background-color: var(--dept-color); }
    50% { background-color: #f59e0b; }
  }

  .animate-overdue { animation: pulse-red-dynamic 2.5s infinite ease-in-out; color: white !important; }
  .animate-inprogress { animation: pulse-yellow-dynamic 3s infinite ease-in-out; color: white !important; }
  .calendar-event-card { transition: all 0.2s ease; cursor: pointer; border: none !important; }
  .calendar-event-card:hover { transform: translateY(-2px); filter: brightness(1.05); z-index: 40; }
  .main-timeline-scroll::-webkit-scrollbar { height: 6px; width: 4px; }
  .main-timeline-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
`;

// Utility function to get animation class based on status
export function getStatusAnimationClass(status: string, startTime: Date, now: Date): string {
  const isOverdue = status === 'pending' && startTime < now;
  const isInProgress = status === 'inprogress';
  return isOverdue ? 'animate-overdue' : isInProgress ? 'animate-inprogress' : '';
}

// Common card props interface
export interface WorkCardBaseProps {
  work: {
    id: string;
    deptColor: string;
    status: string;
    startTime: Date;
    work_time: string;
    detail: string;
    department: string;
    worker: string;
    isMultiDay: boolean;
    endDate: Date | null;
    durationDays: number;
  };
  now: Date;
}

// Common card click handler wrapper
export function createCardClickHandler(work: WorkCardBaseProps['work'], onClick: (work: WorkCardBaseProps['work']) => void) {
  return {
    onClick: () => onClick(work),
    onKeyDown: (e: React.KeyboardEvent) => handleKeyClick(e, () => onClick(work))
  };
}
