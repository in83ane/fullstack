'use client';

import React from 'react';
import { X, Check, AlertTriangle, TrendingDown, User } from 'lucide-react';
import { getAvatarUrl, type Employee } from '@/frontend/lib/constants';

export interface RecommendedWorker extends Employee {
  load: number;
  hasConflict: boolean;
}

interface WorkerAvatarListProps {
  workerList: string[];
  employeeIds: string[] | null;
  masterEmployees: Employee[];
  deptColorMap: Record<string, string>;
  workBaseColor: string;
}

export function WorkerAvatarList({
  workerList,
  employeeIds,
  masterEmployees,
  deptColorMap,
  workBaseColor,
}: WorkerAvatarListProps) {
  if (workerList.length === 0) {
    return (
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border-4 border-slate-200 text-slate-300">
        <User size={22} />
      </div>
    );
  }

  return (
    <>
      {workerList.map((workerName, index) => {
        const empId = (employeeIds ?? [])[index];
        const emp = empId
          ? masterEmployees.find((e) => e.id === empId)
          : masterEmployees.find((e) => e.name === workerName);
        const empBorderColor = deptColorMap[emp?.departments?.name || ''] || workBaseColor;
        return (
          <div
            key={index}
            className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white overflow-hidden border-4 shadow-md transition-transform hover:-translate-y-1 relative"
            style={{ borderColor: empBorderColor, zIndex: 10 - index }}
          >
            <img
              src={emp?.image_url || getAvatarUrl(workerName)}
              className="w-full h-full object-cover"
              alt={workerName}
            />
          </div>
        );
      })}
    </>
  );
}

interface WorkerDropdownProps {
  recommendedWorkers: RecommendedWorker[];
  searchInput: string;
  selectedWorkerIds: string[] | null;
  onSelectWorker: (emp: RecommendedWorker) => void;
}

export function WorkerDropdown({
  recommendedWorkers,
  searchInput,
  selectedWorkerIds,
  onSelectWorker,
}: WorkerDropdownProps) {
  const filtered = recommendedWorkers.filter((e) =>
    e.name.toLowerCase().includes(searchInput.toLowerCase())
  );

  if (filtered.length === 0) {
    return (
      <div className="absolute z-[100] w-full top-full bg-white shadow-2xl rounded-2xl md:rounded-3xl mt-1 max-h-52 overflow-auto border-2 border-slate-100 p-1.5 animate-in slide-in-from-top-2">
        <div className="py-6 text-center text-slate-400">
          <p className="text-sm font-bold">ไม่มีพนักงานชื่อนี้</p>
          <p className="text-xs font-medium mt-0.5 text-slate-300">ลองค้นหาด้วยชื่ออื่น</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute z-[100] w-full top-full bg-white shadow-2xl rounded-2xl md:rounded-3xl mt-1 max-h-52 overflow-auto border-2 border-slate-100 p-1.5 animate-in slide-in-from-top-2">
      {filtered.map((emp) => {
        const ids = selectedWorkerIds ?? [];
        const alreadySelected = ids.includes(emp.id);
        return (
          <button
            key={emp.id}
            type="button"
            disabled={emp.hasConflict || alreadySelected}
            onClick={() => onSelectWorker(emp)}
            className={`w-full p-3 rounded-xl md:rounded-2xl flex justify-between items-center ${
              emp.hasConflict || alreadySelected
                ? 'opacity-50 bg-red-50 cursor-not-allowed'
                : 'hover:bg-slate-50 transition-all'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <img
                src={emp.image_url || getAvatarUrl(emp.name)}
                alt={emp.name}
                className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-sm"
              />
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm">{emp.name}</p>
                <p className="text-[10px] uppercase font-black text-slate-400">
                  {emp.departments?.name}
                </p>
              </div>
            </div>
            {alreadySelected ? (
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl flex items-center gap-1">
                <Check size={11} /> เลือกแล้ว
              </span>
            ) : emp.hasConflict ? (
              <span className="text-[10px] font-black text-red-500 bg-red-100 px-2.5 py-1 rounded-xl flex items-center gap-1">
                <AlertTriangle size={11} /> ไม่ว่าง
              </span>
            ) : (
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl flex items-center gap-1">
                <TrendingDown size={11} /> งานค้าง: {emp.load}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
