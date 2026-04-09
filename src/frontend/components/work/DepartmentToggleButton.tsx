'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { type Department, type Employee } from '@/frontend/lib/constants';

interface DepartmentToggleButtonProps {
  dept: Department;
  isChecked: boolean;
  formData: {
    worker_role: string[];
    selected_workers: string[];
    selected_worker_ids: string[];
  };
  masterEmployees: Employee[];
  onToggle: (newFormData: {
    worker_role: string[];
    selected_workers: string[];
    selected_worker_ids: string[];
  }) => void;
}

export default function DepartmentToggleButton({
  dept,
  isChecked,
  formData,
  masterEmployees,
  onToggle,
}: DepartmentToggleButtonProps) {
  const handleClick = () => {
    const newRoles = isChecked
      ? formData.worker_role.filter((r) => r !== dept.name)
      : [...formData.worker_role, dept.name];

    const updatedWorkers: string[] = [];
    const updatedWorkerIds: string[] = [];

    formData.selected_worker_ids.forEach((id, index) => {
      const emp = masterEmployees.find((e) => e.id === id);
      if (emp && emp.departments && newRoles.includes(emp.departments.name)) {
        updatedWorkers.push(formData.selected_workers[index]);
        updatedWorkerIds.push(id);
      }
    });

    onToggle({
      worker_role: newRoles,
      selected_workers: updatedWorkers,
      selected_worker_ids: updatedWorkerIds,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-between p-3 rounded-xl md:rounded-2xl transition-all text-sm ${
        isChecked ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
      }`}
    >
      <span className="font-bold">{dept.name}</span>
      <div
        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${
          isChecked ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200'
        }`}
      >
        {isChecked && <Check size={13} className="text-white" />}
      </div>
    </button>
  );
}
