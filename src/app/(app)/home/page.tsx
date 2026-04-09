'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, X, Clock, Briefcase, Pencil, Trash2, Maximize, Minimize, Users,
  Loader2, CheckCircle2, Save, Settings, CircleDollarSign, MapPin, Undo2,
  PlusIcon, ChevronDown, Shield, PlayCircle
} from 'lucide-react';
import Link from 'next/link';
import PhotoUploadModal from '@/frontend/components/PhotoUploadModal';
import { uploadWorkPhoto } from '@/frontend/lib/uploadWorkPhoto';
import { formatDisplayDate } from '@/frontend/lib/utils';
import { LONGDO_KEY, searchPlaces, type LongdoResult, type Employee } from '@/frontend/lib/constants';
import { normalizeWork, getThaiShift, type WorkScheduleItem, type WorkForm } from '@/frontend/lib/work';
import {
  WorkDetailModal, WorkList, DurationBanner, DepartmentToggleButton,
  WorkerDropdown
} from '@/frontend/components/work';
import { useWorkData } from '@/frontend/hooks/useWorkData';

// ============================================================================
// Hooks
// ============================================================================

function useLocationSearch() {
  const [locationSuggestions, setLocationSuggestions] = useState<LongdoResult[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const locationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLocationInput = useCallback((value: string, onChange: (v: string) => void) => {
    onChange(value);
    if (locationDebounce.current) clearTimeout(locationDebounce.current);
    if (!value.trim() || value.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    setLocationSearching(true);
    locationDebounce.current = setTimeout(async () => {
      const results = await searchPlaces(value);
      setLocationSuggestions(results);
      setShowLocationSuggestions(results.length > 0);
      setLocationSearching(false);
    }, 400);
  }, []);

  const handleSelectLocation = useCallback((result: LongdoResult, onChange: (v: string) => void) => {
    onChange(result.name);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  }, []);

  return {
    locationSuggestions,
    showLocationSuggestions,
    locationSearching,
    handleLocationInput,
    handleSelectLocation,
    setShowLocationSuggestions,
  };
}

function useRecommendedWorkers(
  formData: WorkForm,
  masterEmployees: Employee[],
  allWorkData: WorkScheduleItem[],
  editingId: string | null
) {
  return useMemo(() => {
    if (formData.worker_role.length === 0) return [];
    return masterEmployees
      .filter((emp) => emp.departments && formData.worker_role.includes(emp.departments.name))
      .map((emp) => {
        const load = allWorkData.filter(
          (w) => !w.status?.includes('complete') && (w.employee_ids ?? []).includes(emp.id)
        ).length;
        const hasConflict = allWorkData.some((w) => {
          if (w.id === editingId || w.status === 'complete') return false;
          if (w.work_date !== formData.work_date || w.work_time !== formData.work_time) return false;
          return (w.employee_ids ?? []).includes(emp.id);
        });
        return { ...emp, load, hasConflict };
      })
      .sort((a, b) => a.load - b.load);
  }, [formData.worker_role, formData.work_date, formData.work_time, masterEmployees, allWorkData, editingId]);
}

function useFilteredWork(allWorkData: WorkScheduleItem[], searchTerm: string) {
  return useMemo(() => {
    const lower = searchTerm.toLowerCase();
    if (!searchTerm.trim()) return [...allWorkData].filter((item) => item.status !== 'complete');
    return [...allWorkData].filter((item) =>
      ((item.department ?? '') + (item.detail ?? '') + (item.worker ?? '') + (item.worker_role ?? ''))
        .toLowerCase()
        .includes(lower)
    );
  }, [allWorkData, searchTerm]);
}

// ============================================================================
// Form Components
// ============================================================================

function FormHeader({ editingId, onCancel }: { editingId: string | null; onCancel: () => void }) {
  return (
    <div className="flex justify-between items-center mb-4 md:mb-8">
      <h2 className="text-base md:text-xl font-black flex items-center gap-2">
        {editingId ? (
          <>
            <Pencil size={18} className="text-orange-500" />
            กำลังแก้ไขแผนงาน
          </>
        ) : (
          <>
            <PlusIcon size={18} className="text-emerald-500" />
            สร้างแผนงานใหม่
          </>
        )}
      </h2>
      {editingId && (
        <button
          onClick={onCancel}
          className="text-xs font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
        >
          <Undo2 size={15} /> ยกเลิก
        </button>
      )}
    </div>
  );
}

function LocationInput({
  value,
  onChange,
  locationSearch,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  locationSearch: ReturnType<typeof useLocationSearch>;
  inputRef: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    locationSuggestions,
    showLocationSuggestions,
    locationSearching,
    handleLocationInput,
    handleSelectLocation,
    setShowLocationSuggestions,
  } = locationSearch;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node))
        setShowLocationSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inputRef, setShowLocationSuggestions]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase opacity-50 ml-2 tracking-wider">
        สถานที่ / หน่วยงาน
      </label>
      <div className="relative" ref={inputRef}>
        <MapPin className="absolute left-3 top-[14px] text-slate-400 z-10" size={16} />
        {locationSearching && <Loader2 size={13} className="absolute right-3 top-[16px] text-slate-400 animate-spin z-10" />}
        <input
          required
          className="h-11 md:h-[60px] pl-9 pr-4 bg-slate-50 border-2 rounded-xl md:rounded-2xl font-bold w-full focus:bg-white focus:border-slate-900 transition-all outline-none text-sm"
          placeholder="พิมพ์ชื่อสถานที่..."
          value={value}
          onChange={(e) => handleLocationInput(e.target.value, onChange)}
          onFocus={() => locationSuggestions.length > 0 && setShowLocationSuggestions(true)}
        />
        {showLocationSuggestions && locationSuggestions.length > 0 && (
          <div className="absolute z-[120] w-full bg-white shadow-2xl rounded-xl md:rounded-2xl mt-1 border-2 border-slate-100 overflow-hidden">
            {locationSuggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={() => handleSelectLocation(s, onChange)}
                className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
              >
                <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400 truncate">{s.address}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkerSelector({
  formData,
  recommendedWorkers,
  onChange,
}: {
  formData: WorkForm;
  recommendedWorkers: ReturnType<typeof useRecommendedWorkers>;
  onChange: (data: Partial<WorkForm>) => void;
}) {
  const removeWorker = (index: number) => {
    onChange({
      selected_workers: formData.selected_workers.filter((_, i) => i !== index),
      selected_worker_ids: (formData.selected_worker_ids ?? []).filter((_, i) => i !== index),
    });
  };

  const addWorker = (emp: { id: string; name: string }) => {
    onChange({
      selected_workers: [...formData.selected_workers, emp.name],
      selected_worker_ids: [...(formData.selected_worker_ids ?? []), emp.id],
      current_worker_input: '',
    });
  };

  return (
    <div className="flex flex-col gap-1.5 relative">
      <label className="text-[10px] font-black uppercase opacity-50 ml-2 tracking-wider flex justify-between">
        มอบหมายช่าง <span className="hidden md:inline">(กรองความว่าง + ภาระงาน)</span>
      </label>
      <div className="flex flex-wrap items-center gap-1.5 px-3 bg-slate-50 border-2 rounded-xl md:rounded-2xl min-h-[44px] md:min-h-[60px] border-slate-200 shadow-inner">
        {formData.selected_workers.map((w, idx) => (
          <span
            key={(formData.selected_worker_ids ?? [])[idx] ?? w}
            className="bg-slate-900 text-white px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm animate-in zoom-in-95"
          >
            {w}
            <X
              size={12}
              className="cursor-pointer hover:text-red-400"
              onClick={() => removeWorker(idx)}
            />
          </span>
        ))}
        <input
          placeholder={formData.worker_role.length > 0 ? 'พิมพ์ชื่อช่าง...' : 'กรุณาเลือกแผนกก่อน...'}
          className="flex-grow bg-transparent p-1.5 font-bold outline-none disabled:cursor-not-allowed text-sm"
          value={formData.current_worker_input}
          disabled={formData.worker_role.length === 0}
          onChange={(e) => onChange({ current_worker_input: e.target.value })}
        />
      </div>
      {formData.current_worker_input && formData.worker_role.length > 0 && (
        <WorkerDropdown
          recommendedWorkers={recommendedWorkers}
          searchInput={formData.current_worker_input}
          selectedWorkerIds={formData.selected_worker_ids}
          onSelectWorker={addWorker}
        />
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function HomePage() {
  const {
    user,
    allWorkData,
    masterEmployees,
    departments,
    loading,
    refreshData,
    isAdmin,
    isOwner,
  } = useWorkData();

  const locationInputRef = useRef<HTMLDivElement | null>(null);
  const deptDropdownRef = useRef<HTMLDivElement | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isTableZoomed, setIsTableZoomed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<WorkScheduleItem | null>(null);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoModal, setPhotoModal] = useState<{ mode: 'start' | 'complete'; id: string; detail: string } | null>(null);
  const [workSummary, setWorkSummary] = useState('');

  const locationSearch = useLocationSearch();

  const initialFormState: WorkForm = {
    work_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()),
    end_date: '',
    work_time: '08:30',
    department: '',
    detail: '',
    worker_role: [],
    current_worker_input: '',
    selected_workers: [],
    selected_worker_ids: [],
  };

  const [formData, setFormData] = useState<WorkForm>(initialFormState);

  const recommendedWorkers = useRecommendedWorkers(formData, masterEmployees, allWorkData, editingId);
  const filteredWork = useFilteredWork(allWorkData, searchTerm);

  const deptColorMap = useMemo(
    () =>
      departments.reduce((acc, curr) => {
        acc[curr.name] = curr.color_code;
        return acc;
      }, {} as Record<string, string>),
    [departments]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node))
        setIsDeptOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const geocodeDepartment = async (placeName: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch(
        `https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(placeName)}&limit=1&key=${LONGDO_KEY}`
      );
      const data = await res.json();
      const item = data.data?.[0];
      if (item?.lat && item?.lon) return { lat: item.lat, lng: item.lon };
    } catch {}
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.worker_role.length === 0) return alert('กรุณาเลือกอย่างน้อย 1 แผนก');
    if (formData.end_date && formData.end_date < formData.work_date)
      return alert('วันที่จบต้องไม่น้อยกว่าวันที่เริ่ม');

    setSubmitting(true);
    const coords = formData.department ? await geocodeDepartment(formData.department) : null;

    const payload = {
      workDate: formData.work_date,
      endDate: formData.end_date || formData.work_date,
      workTime: formData.work_time,
      workShift: getThaiShift(formData.work_time),
      department: formData.department,
      detail: formData.detail,
      workerRole: formData.worker_role.join(', '),
      worker: formData.selected_workers.join(', '),
      employeeId: formData.selected_worker_ids[0] || null,
      employeeIds: formData.selected_worker_ids,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };

    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/work-schedule/${editingId}` : '/api/work-schedule';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Unknown' }));
      alert('บันทึกไม่สำเร็จ: ' + error);
    } else {
      setFormData(initialFormState);
      setEditingId(null);
      await refreshData();
    }
    setSubmitting(false);
  };

  const handleStatusAction = (id: string, status: 'inprogress' | 'complete', detail: string) => {
    setShowWorkModal(false);
    setPhotoModal({ mode: status === 'inprogress' ? 'start' : 'complete', id, detail });
  };

  const handlePhotoConfirm = async (file: File, summary?: string) => {
    if (!photoModal) return;
    const { mode, id } = photoModal;

    try {
      const photoUrl = await uploadWorkPhoto(file, id, mode);
      const status = mode === 'start' ? 'inprogress' : 'complete';
      const updateData: Record<string, string> = { status };

      if (mode === 'start') {
        updateData.startedAt = new Date().toISOString();
        updateData.startPhotoUrl = photoUrl;
      } else {
        updateData.completedAt = new Date().toISOString();
        updateData.completePhotoUrl = photoUrl;
        if (summary) updateData.summary = summary;
      }

      const res = await fetch(`/api/work-schedule/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        alert('บันทึกข้อมูลไม่สำเร็จ');
        return;
      }

      await refreshData();
      setPhotoModal(null);
      setWorkSummary('');
    } catch (err) {
      console.error('Upload error:', err);
      alert('อัพโหลดรูปไม่สำเร็จ: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleEdit = (item: WorkScheduleItem, workerIds: string[], workerNames: string[]) => {
    setEditingId(item.id);
    setFormData({
      ...initialFormState,
      work_date: item.work_date,
      end_date: item.end_date || item.work_date,
      work_time: item.work_time,
      department: item.department,
      detail: item.detail,
      worker_role: item.worker_role.split(', '),
      selected_workers: workerNames,
      selected_worker_ids: workerIds,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('ลบงานนี้?')) {
      await fetch(`/api/work-schedule/${id}`, { method: 'DELETE' });
      await refreshData();
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center font-black text-slate-400 text-xl animate-pulse">
        Loading...
      </div>
    );

  return (
    <main
      className={`transition-all duration-300 ${
        isTableZoomed ? 'fixed inset-0 bg-slate-50 z-50 p-3 overflow-y-auto' : 'max-w-[1400px] mx-auto p-3 md:p-8'
      }`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes status-glow-red { 0%, 100% { background-color: #ffffff; } 50% { background-color: #fef2f2; } }
            @keyframes status-glow-orange { 0%, 100% { background-color: #ffffff; } 50% { background-color: #fffbeb; } }
            .glow-overdue { animation: status-glow-red 2s infinite ease-in-out; }
            .glow-inprogress { animation: status-glow-orange 2.5s infinite ease-in-out; }
          `,
        }}
      />

      <header
        className={`mb-4 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
          isTableZoomed ? 'hidden' : ''
        }`}
      >
        <h1 className="text-lg md:text-3xl font-black text-slate-900 flex items-center gap-2">
          <div className="p-2 md:p-3 bg-slate-900 rounded-xl md:rounded-2xl text-white shadow-xl">
            <Briefcase size={20} />
          </div>
          ระบบจัดการตารางงาน
        </h1>
        {isAdmin && (
          <div className="flex flex-wrap gap-2 animate-in fade-in duration-500 w-full md:w-auto">
            {!isOwner && (
              <>
                <Link
                  href="/employees"
                  className="bg-white border-2 px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-black text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 shadow-sm text-sm"
                >
                  <Users size={15} /> พนักงาน
                </Link>
                <Link
                  href="/departments"
                  className="bg-white border-2 px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-black text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 shadow-sm text-sm"
                >
                  <Settings size={15} /> แผนก
                </Link>
              </>
            )}
            <Link
              href="/price"
              className="bg-amber-50 border-2 border-amber-200 px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-black text-amber-600 hover:bg-amber-600 hover:text-white transition-all flex items-center gap-1.5 shadow-sm text-sm"
            >
              <CircleDollarSign size={15} />ราคาสินค้า
            </Link>
            {isOwner && (
              <Link
                href="/admin-management"
                className="bg-slate-900 border-2 border-slate-900 px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-black text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm text-sm"
              >
                <Shield size={15} /> จัดการแอดมิน
              </Link>
            )}
          </div>
        )}
      </header>

      {isAdmin && !isTableZoomed && (
        <section
          className={`bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border-4 p-4 md:p-8 mb-5 md:mb-12 transition-all animate-in slide-in-from-top-4 ${
            editingId ? 'border-orange-500 scale-[1.01]' : 'border-white'
          }`}
        >
          <FormHeader
            editingId={editingId}
            onCancel={() => {
              setEditingId(null);
              setFormData(initialFormState);
            }}
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase opacity-50 ml-2 tracking-wider">
                  วันที่เริ่ม
                </label>
                <input
                  type="date"
                  required
                  className="h-11 md:h-[60px] px-3 md:px-4 bg-slate-50 border-2 rounded-xl md:rounded-2xl font-bold outline-none w-full focus:bg-white focus:border-slate-900 transition-all text-sm"
                  value={formData.work_date}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const newEnd =
                      formData.end_date && formData.end_date < newStart ? newStart : formData.end_date;
                    setFormData({ ...formData, work_date: newStart, end_date: newEnd });
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase opacity-50 ml-2 tracking-wider flex items-center gap-1">
                  <Clock size={10} /> วันที่จบ
                </label>
                <input
                  type="date"
                  min={formData.work_date}
                  className="h-11 md:h-[60px] px-3 md:px-4 bg-slate-50 border-2 rounded-xl md:rounded-2xl font-bold outline-none w-full focus:bg-white focus:border-emerald-500 transition-all text-sm"
                  value={formData.end_date || formData.work_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase opacity-50 ml-2 tracking-wider">
                  เวลานัดหมาย
                </label>
                <input
                  type="time"
                  required
                  className="h-11 md:h-[60px] px-3 md:px-4 bg-slate-50 border-2 rounded-xl md:rounded-2xl font-bold outline-none w-full focus:bg-white focus:border-slate-900 transition-all text-sm"
                  value={formData.work_time}
                  onChange={(e) => setFormData({ ...formData, work_time: e.target.value })}
                />
              </div>

              <div className="col-span-2 md:col-span-1 relative flex flex-col gap-1.5" ref={deptDropdownRef}>
                <label className="text-[10px] font-black uppercase opacity-50 ml-2 tracking-wider">
                  ประเภทงาน
                </label>
                <button
                  type="button"
                  onClick={() => setIsDeptOpen(!isDeptOpen)}
                  className="h-11 md:h-[60px] w-full px-3 md:px-4 bg-slate-50 border-2 rounded-xl md:rounded-2xl font-bold text-left flex justify-between items-center hover:border-slate-400 transition-all text-sm"
                >
                  <span className="truncate">
                    {formData.worker_role.length > 0
                      ? formData.worker_role.join(', ')
                      : 'คลิกเพื่อเลือกแผนก...'}
                  </span>
                  <ChevronDown size={18} className={`transition-transform ${isDeptOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDeptOpen && (
                  <div className="absolute z-[110] w-full top-[85px] md:top-[95px] bg-white shadow-2xl rounded-2xl md:rounded-3xl p-2 md:p-3 border-2 border-slate-100 grid grid-cols-1 gap-1">
                    {departments.map((dept) => (
                      <DepartmentToggleButton
                        key={dept.id}
                        dept={dept}
                        isChecked={formData.worker_role.includes(dept.name)}
                        formData={formData}
                        masterEmployees={masterEmployees}
                        onToggle={(newFormData) => setFormData({ ...formData, ...newFormData })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {formData.end_date && formData.end_date !== formData.work_date && (
              <DurationBanner startDate={formData.work_date} endDate={formData.end_date} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
              <LocationInput
                value={formData.department}
                onChange={(v) => setFormData({ ...formData, department: v })}
                locationSearch={locationSearch}
                inputRef={locationInputRef}
              />

              <WorkerSelector
                formData={formData}
                recommendedWorkers={recommendedWorkers}
                onChange={(data) => setFormData({ ...formData, ...data })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase opacity-50 ml-2 tracking-wider">
                รายละเอียดงาน
              </label>
              <textarea
                rows={3}
                required
                className="p-3 md:p-5 bg-slate-50 border-2 rounded-xl md:rounded-[1.5rem] font-bold w-full focus:bg-white focus:border-slate-900 transition-all outline-none text-sm"
                placeholder="ระบุสิ่งที่ต้องทำ..."
                value={formData.detail}
                onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-xl flex items-center justify-center gap-2.5 shadow-lg transition-all ${
                editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'
              } text-white active:scale-[0.98]`}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : editingId ? (
                <CheckCircle2 size={20} />
              ) : (
                <Save size={20} />
              )}
              {editingId ? 'ยืนยันการแก้ไขข้อมูล' : 'บันทึกลงตารางปฏิบัติงาน'}
            </button>
          </form>
        </section>
      )}

      <section className="space-y-4 md:space-y-6">
        <div className="flex justify-between items-center bg-white p-2 md:p-3 rounded-2xl md:rounded-3xl border-2 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              placeholder="ค้นหางาน..."
              className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-slate-50 rounded-xl md:rounded-2xl font-bold outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsTableZoomed(!isTableZoomed)}
            className="ml-3 p-2.5 bg-white border-2 rounded-xl md:rounded-2xl hover:bg-slate-900 hover:text-white transition-all"
          >
            {isTableZoomed ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        <WorkList
          items={filteredWork}
          deptColorMap={deptColorMap}
          masterEmployees={masterEmployees}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOpenDetail={setSelectedWork}
          onShowModal={setShowWorkModal}
        />
      </section>

      {showWorkModal && selectedWork && (
        <WorkDetailModal
          work={selectedWork}
          deptColorMap={deptColorMap}
          masterEmployees={masterEmployees}
          onClose={() => setShowWorkModal(false)}
          onStatusAction={handleStatusAction}
        />
      )}

      {photoModal && (
        <PhotoUploadModal
          mode={photoModal.mode}
          jobDetail={photoModal.detail}
          onConfirm={handlePhotoConfirm}
          onCancel={() => {
            setPhotoModal(null);
            setWorkSummary('');
          }}
          summary={workSummary}
          onSummaryChange={setWorkSummary}
        />
      )}
    </main>
  );
}
