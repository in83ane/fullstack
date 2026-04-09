'use client';

import React from 'react';
import { X, MapPin, Clock, CalendarRange, Camera } from 'lucide-react';
import { formatDisplayDate, handleKeyClick } from '@/frontend/lib/utils';
import { PhotoSection, TimelineSection } from '@/frontend/components/WorkComponents';
import { getAvatarUrl, type Employee, type Department } from '@/frontend/lib/constants';
import type { WorkScheduleItem } from '@/frontend/lib/work';

interface WorkDetailModalProps {
  work: WorkScheduleItem;
  deptColorMap: Record<string, string>;
  masterEmployees: Employee[];
  onClose: () => void;
  onStatusAction: (id: string, status: 'inprogress' | 'complete', detail: string) => void;
}

export default function WorkDetailModal({
  work,
  deptColorMap,
  masterEmployees,
  onClose,
  onStatusAction,
}: WorkDetailModalProps) {
  const roles = work.worker_role ? work.worker_role.split(', ') : [];
  const roleColors = roles.map((r) => deptColorMap[r] || '#94a3b8');
  const barStyle =
    roleColors.length > 1
      ? { background: `linear-gradient(to right, ${roleColors.join(', ')})` }
      : { backgroundColor: roleColors[0] || '#94a3b8' };
  const isMultiDay = work.end_date && work.end_date !== work.work_date;

  return (
    <div
      role="button"
      tabIndex={0}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
      onKeyDown={(e) => handleKeyClick(e, onClose)}
    >
      <div
        className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] w-full md:max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="shrink-0">
          <div className="h-2.5 w-full" style={barStyle} />
          <div className="flex justify-center pt-2 md:hidden">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>
        </div>

        <div className="overflow-y-auto p-5 md:p-10">
          <div className="flex justify-between items-start mb-5 md:mb-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg md:text-2xl font-black text-slate-800 leading-tight">
                รายละเอียดงาน
              </h3>
              <div className="flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role, i) => (
                    <span
                      key={role}
                      className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-white shadow-sm"
                      style={{ backgroundColor: roleColors[i] || '#94a3b8' }}
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-400 bg-slate-100">
                    ไม่ระบุแผนก
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-50 rounded-xl md:rounded-2xl text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm font-bold">
              <div className="p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase mb-1.5 font-black tracking-wider">
                  สถานที่
                </p>
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin size={15} className="text-blue-500 shrink-0" />
                  <span className="truncate">{work.department || 'ไม่ระบุ'}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase mb-1.5 font-black tracking-wider">
                  เวลานัดหมาย
                </p>
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock size={15} className="text-blue-500" />
                  {work.work_time} น.
                </div>
              </div>
            </div>

            <div
              className={`grid gap-3 text-sm font-bold ${
                isMultiDay ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              <div className="p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase mb-1.5 font-black tracking-wider">
                  วันที่เริ่ม
                </p>
                <div className="flex items-center gap-2 text-slate-700">
                  <CalendarRange size={15} className="text-blue-500 shrink-0" />
                  <span>{formatDisplayDate(work.work_date)}</span>
                </div>
              </div>
              {isMultiDay && work.end_date && (
                <div className="p-4 bg-emerald-50 rounded-xl md:rounded-2xl border border-emerald-100">
                  <p className="text-[10px] text-emerald-500 uppercase mb-1.5 font-black tracking-wider">
                    วันที่จบ ·{' '}
                    {Math.round(
                      (new Date(work.end_date).getTime() -
                        new Date(work.work_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1}{' '}
                    วัน
                  </p>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CalendarRange size={15} className="text-emerald-500 shrink-0" />
                    <span>{formatDisplayDate(work.end_date)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider ml-2">
                ทีมช่างที่ปฏิบัติงาน
              </p>
              <div className="grid grid-cols-1 gap-2">
                {work.worker ? (
                  work.worker.split(', ').map((workerName, idx) => {
                    const empId = (work.employee_ids ?? [])[idx];
                    const emp = empId
                      ? masterEmployees.find((e) => e.id === empId)
                      : masterEmployees.find((e) => e.name === workerName);
                    const empDept = emp?.departments?.name || '';
                    const empColor = deptColorMap[empDept] || '#64748b';
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 md:p-3 rounded-xl md:rounded-2xl border-2"
                        style={{
                          borderColor: `${empColor}20`,
                          backgroundColor: `${empColor}05`,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-10 h-10 rounded-xl border-4 overflow-hidden shadow-sm"
                            style={{ borderColor: empColor }}
                          >
                            <img
                              src={emp?.image_url || getAvatarUrl(workerName)}
                              alt={workerName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{workerName}</p>
                            <p
                              className="text-[10px] font-bold opacity-60 uppercase"
                              style={{ color: empColor }}
                            >
                              {empDept || 'ไม่ระบุแผนก'}
                            </p>
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: empColor }} />
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl md:rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold text-sm">
                    ยังไม่มีการมอบหมายช่าง
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-slate-900 text-white font-bold shadow-xl shadow-slate-200">
              <p className="text-[10px] opacity-50 uppercase mb-2 font-black tracking-widest">
                รายละเอียดงาน
              </p>
              <p className="text-base md:text-lg leading-relaxed">
                {work.detail || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </p>
            </div>

            <PhotoSection
              startPhotoUrl={work.start_photo_url}
              completePhotoUrl={work.complete_photo_url}
            />
            <TimelineSection
              startedAt={work.started_at}
              completedAt={work.completed_at}
              summary={work.summary}
            />
          </div>

          <div className="flex gap-3 mt-6 md:mt-10">
            {work.status === 'pending' && (
              <button
                onClick={() => onStatusAction(work.id, 'inprogress', work.detail)}
                className="flex-[2] py-3.5 md:py-4 bg-blue-600 rounded-xl md:rounded-2xl text-white font-black text-sm shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Camera size={16} /> เริ่มดำเนินงาน
              </button>
            )}
            {work.status === 'inprogress' && (
              <button
                onClick={() => onStatusAction(work.id, 'complete', work.detail)}
                className="flex-[2] bg-emerald-600 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-white font-black text-sm shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Camera size={16} /> เสร็จสิ้น
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3.5 md:py-4 bg-slate-100 rounded-xl md:rounded-2xl font-black text-sm text-slate-500 hover:bg-slate-200 transition-colors active:scale-95"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
