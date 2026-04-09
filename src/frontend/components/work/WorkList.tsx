'use client';

import React from 'react';
import {
  Pencil,
  Trash2,
  Timer,
  Clock,
  CalendarRange,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { formatDisplayDate, handleKeyClick } from '@/frontend/lib/utils';
import { WorkerAvatarList } from './WorkerComponents';
import type { Employee } from '@/frontend/lib/constants';
import type { WorkScheduleItem } from '@/frontend/lib/work';

interface WorkListProps {
  items: WorkScheduleItem[];
  deptColorMap: Record<string, string>;
  masterEmployees: Employee[];
  isAdmin: boolean;
  onEdit: (item: WorkScheduleItem, workerIds: string[], workerNames: string[]) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (item: WorkScheduleItem) => void;
  onShowModal: (show: boolean) => void;
}

export default function WorkList({
  items,
  deptColorMap,
  masterEmployees,
  isAdmin,
  onEdit,
  onDelete,
  onOpenDetail,
  onShowModal,
}: WorkListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-black text-slate-700 mb-2">ไม่มีงานที่กำลังดำเนินการ</h3>
        <p className="text-sm text-slate-400 font-medium">งานที่ยังไม่เสร็จจะแสดงที่นี่</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:gap-4">
      {items.map((item) => {
        const workBaseColor = deptColorMap[item.worker_role?.split(', ')[0] || ''] || '#94a3b8';
        const workerList = item.worker ? item.worker.split(', ') : [];
        const roles = item.worker_role ? item.worker_role.split(', ') : [];
        const employeeIds = item.employee_ids ?? [];
        const isMultiDay = item.end_date && item.end_date !== item.work_date;

        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            className="group bg-white rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-sm border-2 border-white hover:border-slate-200 transition-all cursor-pointer relative overflow-hidden"
            onClick={() => {
              onOpenDetail(item);
              onShowModal(true);
            }}
            onKeyDown={(e) =>
              handleKeyClick(e, () => {
                onOpenDetail(item);
                onShowModal(true);
              })
            }
          >
            <div
              className="absolute top-0 left-0 w-2 h-full"
              style={{ backgroundColor: workBaseColor }}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex -space-x-3">
                  <WorkerAvatarList
                    workerList={workerList}
                    employeeIds={employeeIds}
                    masterEmployees={masterEmployees}
                    deptColorMap={deptColorMap}
                    workBaseColor={workBaseColor}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {roles.map((role) => (
                      <span
                        key={role}
                        className="px-2.5 py-0.5 rounded-lg text-[10px] font-black text-white"
                        style={{ backgroundColor: deptColorMap[role] || '#94a3b8' }}
                      >
                        {role}
                      </span>
                    ))}
                    {item.worker && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200">
                        <Users size={10} className="text-slate-500" />
                        <span className="truncate max-w-[150px]">{item.worker}</span>
                      </span>
                    )}
                    {isMultiDay && (
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100">
                        {Math.round(
                          (new Date(item.end_date!).getTime() -
                            new Date(item.work_date).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + 1}{' '}
                        วัน
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-slate-800 text-base md:text-lg truncate">
                    {item.department}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 font-medium line-clamp-1">
                    {item.detail}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 font-bold">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {item.work_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarRange size={12} /> {formatDisplayDate(item.work_date)}
                      {isMultiDay ? ` - ${formatDisplayDate(item.end_date)}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item, employeeIds as string[], workerList);
                      }}
                      className="p-2.5 rounded-xl bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                {item.status === 'inprogress' && (
                  <span className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-700 text-xs font-black flex items-center gap-1.5">
                    <Timer size={14} className="animate-pulse" /> กำลังดำเนินการ
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
