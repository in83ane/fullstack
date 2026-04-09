'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Navigation, Loader2, ExternalLink, X, Clock, MapPin,
  Building2, Search, ChevronDown, LocateFixed, PlayCircle, CheckCircle2,
  Timer, CalendarRange, Camera,
} from 'lucide-react';
import type { MapTask, MapComponentProps } from '@/frontend/components/MapComponent';
import PhotoUploadModal from '@/frontend/components/PhotoUploadModal';
import { uploadWorkPhoto } from '@/frontend/lib/uploadWorkPhoto';
import { formatDisplayDate, formatTimestamp, calcDuration } from '@/frontend/lib/utils';
import { LONGDO_KEY, getAvatarUrl, searchPlaces, type LongdoResult, type Employee } from '@/frontend/lib/constants';

interface WorkScheduleRow {
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
}

function normalizeWorkRow(w: Record<string, unknown>): WorkScheduleRow {
  return {
    id: String(w._id),
    detail: String(w.detail ?? ''),
    department: String(w.department ?? ''),
    work_date: w.workDate ? String(w.workDate).substring(0, 10) : '',
    end_date: w.endDate ? String(w.endDate).substring(0, 10) : null,
    work_time: String(w.workTime ?? ''),
    worker: String(w.worker ?? ''),
    worker_role: String(w.workerRole ?? ''),
    status: (w.status as WorkScheduleRow['status']) ?? 'pending',
    lat: (w.lat as number) ?? null,
    lng: (w.lng as number) ?? null,
    started_at: w.startedAt ? String(w.startedAt) : null,
    completed_at: w.completedAt ? String(w.completedAt) : null,
    employee_ids: Array.isArray(w.employeeIds) ? (w.employeeIds as unknown[]).map(String) : null,
    start_photo_url: w.startPhotoUrl ? String(w.startPhotoUrl) : null,
    complete_photo_url: w.completePhotoUrl ? String(w.completePhotoUrl) : null,
  }
}

const MapComponent = dynamic<MapComponentProps>(
  () => import('../../../frontend/components/MapComponent'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-100 flex flex-col items-center justify-center rounded-[2.5rem]">
        <Loader2 className="animate-spin text-slate-400" size={40} />
        <p className="text-slate-500 mt-4 font-medium">กำลังโหลดแผนที่...</p>
      </div>
    ),
  }
);

function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

function isActiveOnDate(work: WorkScheduleRow, date: string): boolean {
  const effectiveEnd = work.end_date || work.work_date;
  return work.work_date <= date && effectiveEnd >= date;
}

function isMultiDay(work: WorkScheduleRow): boolean {
  return !!work.end_date && work.end_date !== work.work_date;
}

function buildMapTasks(todayRows: WorkScheduleRow[], deptColorMap: Record<string, string>): MapTask[] {
  const result: MapTask[] = [];
  for (const w of todayRows) {
    if (!w.lat || !w.lng) continue;
    const roles = w.worker_role?.split(', ') ?? [];
    const color = deptColorMap[roles[0]] || '#64748b';
    result.push({ id: w.id, name: w.detail, location: w.department, lat: w.lat, lng: w.lng, status: w.status, work_time: w.work_time, color });
  }
  return result;
}

export default function MapPage() {

  const [isAdmin, setIsAdmin] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [empSearch, setEmpSearch] = useState('');

  const [works, setWorks] = useState<WorkScheduleRow[]>([]);
  const [deptColorMap, setDeptColorMap] = useState<Record<string, string>>({});
  const [mapTasks, setMapTasks] = useState<MapTask[]>([]);
  const [orderedTasks, setOrderedTasks] = useState<MapTask[]>([]);
  const [isRouteReady, setIsRouteReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [startInput, setStartInput] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('map_startInput') ?? '';
  });
  const [startPoint, setStartPoint] = useState<[number, number] | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const s = localStorage.getItem('map_startPoint');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [suggestions, setSuggestions] = useState<LongdoResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [gpsPos, setGpsPos] = useState<[number, number] | null>(null);
  const [gpsTrigger, setGpsTrigger] = useState(0);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startInputRef = useRef<HTMLDivElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedWork, setSelectedWork] = useState<WorkScheduleRow | null>(null);

  // Photo upload state
  const [photoModal, setPhotoModal] = useState<{ mode: 'start' | 'complete'; id: string; detail: string } | null>(null);

  // ────────────────────────────────────────────────
  // Init
  // ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [profileRes, empsRes, deptsRes] = await Promise.all([
        fetch('/api/profiles/me'),
        fetch('/api/employees?active=true'),
        fetch('/api/departments'),
      ]);
      if (!profileRes.ok) { setLoading(false); return; }

      const { user: profile } = await profileRes.json();
      const admin = profile?.role === 'admin' || profile?.role === 'owner';
      const empId = profile?.employeeId ?? null;
      setIsAdmin(admin);

      if (empsRes.ok) {
        const { employees: empsData } = await empsRes.json();
        setEmployees((empsData as Record<string, unknown>[]).map(e => {
          const dept = e.departmentId as Record<string, unknown> | null;
          return {
            id: String(e._id),
            name: String(e.name ?? ''),
            image_url: e.imageUrl ? String(e.imageUrl) : null,
            departments: dept ? { name: String(dept.name ?? ''), color_code: String(dept.colorCode ?? '') } : null,
          } as Employee;
        }));
      }

      if (deptsRes.ok) {
        const { departments: deptsData } = await deptsRes.json();
        const colorMap = (deptsData as Record<string, unknown>[]).reduce((acc: Record<string, string>, d) => {
          acc[String(d.name)] = String(d.colorCode ?? ''); return acc;
        }, {});
        setDeptColorMap(colorMap);
      }

      if (!admin && empId) setSelectedEmployeeId(empId);
      setLoading(false);
    };
    init();
  }, []);

  // ────────────────────────────────────────────────
  // Fetch works
  // ────────────────────────────────────────────────
  useEffect(() => {
    const fetchWorks = async () => {
      const targetId = selectedEmployeeId;
      if (!targetId) {
        setWorks([]); setMapTasks([]); setOrderedTasks([]);
        setIsRouteReady(false);
        return;
      }

      const today = todayStr();
      const wsRes = await fetch(`/api/work-schedule?employeeId=${targetId}`);
      if (!wsRes.ok) return;
      const { schedules: rawData } = await wsRes.json();
      const allRows = (rawData as Record<string, unknown>[]).map(normalizeWorkRow);
      const rows = allRows.filter(w => {
        const effectiveEnd = w.end_date || w.work_date;
        return w.work_date <= today && effectiveEnd >= today;
      });
      const todayRows = rows.filter(w => isActiveOnDate(w, today));
      const activeWorks = todayRows.filter(w => w.status !== 'complete');
      setWorks(activeWorks);

      const tasks: MapTask[] = buildMapTasks(todayRows, deptColorMap);
      setMapTasks(tasks);
      setOrderedTasks([]);
      setIsRouteReady(false);
    };
    fetchWorks();
  }, [selectedEmployeeId]);

  const handleOrderChange = useCallback((newOrder: MapTask[], isReady: boolean) => {
    if (isReady) {
      if (newOrder.length === 0) {
        setOrderedTasks([]);
        setIsRouteReady(false);
        return;
      }
      const inprogressTasks = newOrder.filter(t => t.status === 'inprogress');
      const pendingTasks = newOrder.filter(t => t.status === 'pending');
      setOrderedTasks([...inprogressTasks, ...pendingTasks]);
      setIsRouteReady(true);
    } else {
      setOrderedTasks([]);
      setIsRouteReady(false);
    }
  }, []);

  // ────────────────────────────────────────────────
  // Photo-aware status update
  // ────────────────────────────────────────────────
  const handleStatusAction = (id: string, status: 'inprogress' | 'complete', detail: string) => {
    setShowModal(false);
    setPhotoModal({ mode: status === 'inprogress' ? 'start' : 'complete', id, detail });
  };

  const handlePhotoConfirm = async (file: File) => {
    if (!photoModal) return;
    const { mode, id } = photoModal;

    const photoUrl = await uploadWorkPhoto(file, id, mode);

    const status = mode === 'start' ? 'inprogress' : 'complete';
    const updates: Record<string, string> = { status };
    if (mode === 'start') {
      updates.startedAt = new Date().toISOString();
      updates.startPhotoUrl = photoUrl;
    } else {
      updates.completedAt = new Date().toISOString();
      updates.completePhotoUrl = photoUrl;
    }

    await fetch(`/api/work-schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const snakeUpdates = {
      started_at: updates.startedAt,
      start_photo_url: updates.startPhotoUrl,
      completed_at: updates.completedAt,
      complete_photo_url: updates.completePhotoUrl,
    };
    setWorks(prev =>
      status === 'complete'
        ? prev.filter(w => w.id !== id)
        : prev.map(w => w.id === id ? { ...w, status, ...snakeUpdates } as WorkScheduleRow : w)
    );
    setMapTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    setOrderedTasks(prev =>
      status === 'complete'
        ? prev.filter(t => t.id !== id)
        : prev.map(t => t.id === id ? { ...t, status } : t)
    );
    setSelectedWork(prev => prev?.id === id ? { ...prev, status, ...snakeUpdates } as WorkScheduleRow : prev);
    setPhotoModal(null);
  };

  // ────────────────────────────────────────────────
  // Start input / GPS
  // ────────────────────────────────────────────────
  const handleStartInputChange = (value: string) => {
    setStartInput(value);
    setStartPoint(null);
    setIsRouteReady(false);
    setOrderedTasks([]);
    localStorage.removeItem('map_startPoint');
    localStorage.setItem('map_startInput', value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!value.trim() || value.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      const results = await searchPlaces(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearching(false);
    }, 400);
  };

  const handleSelectSuggestion = (result: LongdoResult) => {
    const pt: [number, number] = [result.lat, result.lon];
    setStartPoint(pt);
    setStartInput(result.name);
    localStorage.setItem('map_startPoint', JSON.stringify(pt));
    localStorage.setItem('map_startInput', result.name);
    setSuggestions([]); setShowSuggestions(false);
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition( // NOSONAR
      pos => { setGpsPos([pos.coords.latitude, pos.coords.longitude]); setGpsTrigger(t => t + 1); },
      err => console.warn(err)
    );
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (startInputRef.current && !startInputRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase()));

  if (loading) return (
    <div className="h-screen flex items-center justify-center lg:pl-20">
      <Loader2 className="animate-spin text-slate-300" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:pl-20 pb-24 lg:pb-6">
      <div className="p-4 space-y-4">

        {/* Header */}
        <header className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 rounded-2xl text-white shadow-xl shrink-0"><Navigation size={20} /></div>
              <div>
                <h1 className="text-base font-black text-slate-900 leading-tight">ระบบจัดเส้นทางงาน</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">Route Optimization</p>
              </div>
            </div>

            {isAdmin && (
              <div className="relative" style={{ minWidth: 0 }}>
                <button onClick={() => setEmpDropdownOpen(!empDropdownOpen)}
                  className="h-[44px] px-3 bg-slate-50 border-2 rounded-2xl font-bold flex items-center gap-2 hover:border-slate-400 transition-all max-w-[180px] sm:max-w-[220px]">
                  {selectedEmployee ? (
                    <>
                      <img src={selectedEmployee.image_url || getAvatarUrl(selectedEmployee.name)} className="w-7 h-7 rounded-xl object-cover shrink-0" alt={selectedEmployee.name} />
                      <span className="text-slate-800 font-bold text-sm truncate">{selectedEmployee.name}</span>
                    </>
                  ) : <span className="text-slate-400 text-sm">เลือกพนักงาน</span>}
                  <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${empDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {empDropdownOpen && (
                  <div className="absolute right-0 z-50 w-64 bg-white shadow-2xl rounded-2xl mt-2 border border-slate-100 overflow-hidden">
                    <div className="p-2 border-b border-slate-50">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input autoFocus placeholder="ค้นหาชื่อ..." value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 rounded-xl text-sm font-bold outline-none" />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-2 space-y-1">
                      {filteredEmployees.map(emp => (
                        <button key={emp.id} onClick={() => { setSelectedEmployeeId(emp.id); setEmpDropdownOpen(false); setEmpSearch(''); localStorage.removeItem('map_lastOrdered'); }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedEmployeeId === emp.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                          <img src={emp.image_url || getAvatarUrl(emp.name)} className="w-8 h-8 rounded-xl object-cover shrink-0" alt={emp.name} />
                          <div className="text-left min-w-0">
                            <p className="font-bold text-sm leading-tight truncate">{emp.name}</p>
                            <p className="text-[10px] opacity-60 uppercase font-black truncate">{emp.departments?.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">จุดเริ่มต้น</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow" ref={startInputRef}>
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin z-10" />}
                <input value={startInput} onChange={e => handleStartInputChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="พิมพ์ชื่อสถานที่..."
                  className={`w-full pl-9 pr-4 py-3 bg-slate-50 border-2 rounded-2xl font-bold text-sm outline-none transition-all ${startPoint ? 'border-emerald-300 bg-emerald-50' : 'border-transparent focus:border-slate-300'}`} />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full bg-white shadow-2xl rounded-2xl mt-1 border border-slate-100 overflow-hidden">
                    {suggestions.map((s, idx) => (
                      <button key={idx} type="button" onMouseDown={() => handleSelectSuggestion(s)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0">
                        <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{s.name}</p>
                          <p className="text-xs text-slate-400 font-medium truncate">{s.address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={handleUseGPS}
                className="w-full sm:w-auto px-4 py-3 bg-blue-50 text-blue-600 border-2 border-blue-100 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-all">
                <LocateFixed size={16} /> ตำแหน่งปัจจุบัน
              </button>
            </div>
            {startPoint && <p className="text-xs text-emerald-600 font-bold mt-1.5 ml-2">✓ พบตำแหน่งแล้ว — พร้อมคำนวณเส้นทาง</p>}
          </div>
        </header>

        {!selectedEmployeeId ? (
          <div className="bg-white rounded-[2rem] p-16 text-center border border-slate-100">
            <Navigation size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">เลือกพนักงานเพื่อดูเส้นทางงาน</p>
          </div>
        ) : (
          <>
            {/* Map */}
            <div className="bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden" style={{ height: 'clamp(260px, 45vw, 480px)' }}>
              {mapTasks.length > 0 ? (
                <MapComponent
                  tasks={mapTasks}
                  startPoint={startPoint}
                  gpsPos={gpsPos}
                  gpsTrigger={gpsTrigger}
                  onOrderChange={handleOrderChange}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <MapPin size={40} className="mb-3" />
                  <p className="font-bold text-sm">ไม่มีงานที่มีพิกัดสำหรับวันนี้</p>
                </div>
              )}
            </div>

            {/* Route order */}
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
              <h2 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm">
                <Navigation size={16} className="text-blue-600" /> ลำดับเส้นทางที่เหมาะสม
              </h2>
              {!startPoint ? (
                <p className="text-sm text-slate-400 font-bold text-center py-4">กรอกจุดเริ่มต้นเพื่อคำนวณเส้นทาง</p>
              ) : !isRouteReady ? (
                <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  <p className="text-sm font-bold">กำลังคำนวณ...</p>
                </div>
              ) : (
                <div className="space-y-3 relative">
                  <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-slate-100" />
                  {orderedTasks.map((task, idx) => {
                    const isComplete = task.status === 'complete';
                    const isInProgress = task.status === 'inprogress';
                    return (
                      <div key={task.id} className={`flex gap-3 items-center transition-opacity ${isComplete ? 'opacity-40' : ''}`}>
                        <div className={`z-10 w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-black shadow-lg ring-4 ring-white shrink-0 ${isComplete ? 'bg-emerald-500' : isInProgress ? 'bg-amber-500' : 'bg-slate-900'}`}>
                          {isComplete
                            ? <CheckCircle2 size={16} strokeWidth={2.5} />
                            : isInProgress
                              ? <PlayCircle size={16} strokeWidth={2.5} />
                              : idx + 1}
                        </div>
                        <div className={`flex-grow p-3 rounded-2xl flex justify-between items-center min-w-0 ${isInProgress ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'}`}>
                          <div className="min-w-0 mr-2">
                            <p className="font-black text-slate-800 text-sm truncate">{task.location}</p>
                            <p className="text-xs text-slate-400 font-bold mt-0.5 truncate">{task.name}</p>
                            {isInProgress && <p className="text-[10px] text-amber-600 font-black mt-1 uppercase tracking-wide">กำลังดำเนินงาน</p>}
                          </div>
                          <button type="button" onClick={() => {
                            const ua = navigator.userAgent;
                            const isIOS = ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod');
                            const isAndroid = ua.includes('Android');
                            const url = isIOS
                              ? `comgooglemaps://?daddr=${task.lat},${task.lng}&directionsmode=driving`
                              : isAndroid
                                ? `google.navigation:q=${task.lat},${task.lng}`
                                : `https://www.google.com/maps/dir/?api=1&destination=${task.lat},${task.lng}`;
                            window.open(url, '_blank');
                          }} className="flex items-center gap-1 text-[10px] text-blue-600 font-black bg-blue-50 px-2.5 py-1.5 rounded-xl shrink-0">
                            <ExternalLink size={10} /> Maps
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Work list */}
            <div className="space-y-3">
              <h2 className="font-black text-slate-800 px-1 text-sm">งานที่รอดำเนินการวันนี้ ({works.length})</h2>
              {works.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 text-slate-300">
                  <p className="font-bold text-sm">ไม่มีงานค้างสำหรับวันนี้</p>
                </div>
              ) : (() => {
                const orderMap = new Map(orderedTasks.map((t, i) => [t.id, i]));
                const sortedWorks = [...works].sort((a, b) => {
                  const ia = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
                  const ib = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
                  return ia - ib;
                });
                return sortedWorks.map(work => {
                  const orderIdx = orderMap.get(work.id);
                  const roles = work.worker_role?.split(', ') ?? [];
                  const colors = roles.map(r => deptColorMap[r] || '#94a3b8');
                  const barStyle = colors.length > 1 ? { background: `linear-gradient(to bottom, ${colors.join(', ')})` } : { backgroundColor: colors[0] };
                  const isOverdue = new Date(`${work.work_date}T${work.work_time}`) < new Date() && work.status === 'pending';
                  const isInProgress = work.status === 'inprogress';
                  return (
                    <div key={work.id} onClick={() => { setSelectedWork(work); setShowModal(true); }}
                      className="relative bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden flex items-stretch cursor-pointer hover:shadow-md transition-all active:scale-[0.99]">
                      <div className="w-2.5 shrink-0" style={barStyle} />
                      <div className="p-4 flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {orderIdx !== undefined && (
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full text-white ${isInProgress ? 'bg-amber-500' : 'bg-slate-900'}`}>
                              #{orderIdx + 1}
                            </span>
                          )}
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full text-white uppercase ${isOverdue ? 'bg-red-500' : isInProgress ? 'bg-amber-500' : 'bg-slate-400'}`}>
                            {isOverdue ? 'OVERDUE' : work.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-black text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-xl truncate max-w-[160px]">
                            <MapPin size={12} className="shrink-0" /> {work.department}
                          </span>
                          <span className="text-xs font-black text-slate-600 flex items-center gap-1">
                            <Clock size={12} /> {work.work_time} น.
                          </span>
                        </div>
                        <p className="text-base font-black text-slate-800 leading-tight">{work.detail}</p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════
          Modal รายละเอียดงาน
      ════════════════════════════════ */}
      {showModal && selectedWork && (() => {
        const roles = selectedWork.worker_role?.split(', ') ?? [];
        const colors = roles.map(r => deptColorMap[r] || '#94a3b8');
        const barStyle = colors.length > 1 ? { background: `linear-gradient(to right, ${colors.join(', ')})` } : { backgroundColor: colors[0] };
        const mainColor = colors[0] || '#94a3b8';
        const duration = calcDuration(selectedWork.started_at, selectedWork.completed_at);
        const hasTime = selectedWork.started_at || selectedWork.completed_at;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowModal(false)}>
            {/* ── FIXED: max-h + flex-col so inner content scrolls ── */}
            <div
              className="bg-white w-full sm:max-w-lg sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90dvh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Sticky top bar */}
              <div className="shrink-0">
                <div className="h-3 w-full" style={barStyle} />
                <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1.5 rounded-full bg-slate-200" /></div>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto p-6 sm:p-10">
                {/* Title */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-black text-slate-800 leading-tight">รายละเอียดงาน</h3>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role, i) => (
                        <span key={role} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase text-white shadow-sm" style={{ backgroundColor: colors[i] || '#94a3b8' }}>{role}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 shrink-0 ml-3"><X size={18} /></button>
                </div>

                <div className="space-y-3">
                  {/* สถานที่ + เวลานัดหมาย */}
                  <div className="grid grid-cols-2 gap-3 text-sm font-bold">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase mb-1.5 font-black tracking-wider">สถานที่</p>
                      <div className="flex items-center gap-2 text-slate-700"><Building2 size={14} className="text-blue-500 shrink-0" /><span className="truncate">{selectedWork.department}</span></div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase mb-1.5 font-black tracking-wider">เวลานัดหมาย</p>
                      <div className="flex items-center gap-2 text-slate-700"><Clock size={14} className="text-blue-500" />{selectedWork.work_time} น.</div>
                    </div>
                  </div>

                  {/* วันที่ (รองรับ multi-day) */}
                  <div className={`grid gap-3 text-sm font-bold ${isMultiDay(selectedWork) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase mb-1.5 font-black tracking-wider">วันที่</p>
                      <div className="flex items-center gap-2 text-slate-700">
                        <CalendarRange size={14} className="text-blue-500 shrink-0" />
                        <span>{formatDisplayDate(selectedWork.work_date)}</span>
                      </div>
                    </div>
                    {isMultiDay(selectedWork) && (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] text-emerald-500 uppercase mb-1.5 font-black tracking-wider">วันที่จบ</p>
                        <div className="flex items-center gap-2 text-emerald-700">
                          <CalendarRange size={14} className="text-emerald-500 shrink-0" />
                          <span>{formatDisplayDate(selectedWork.end_date)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* รายละเอียดงาน */}
                  <div className="p-6 rounded-[2rem] bg-slate-900 text-white font-bold shadow-xl">
                    <p className="text-[10px] opacity-50 uppercase mb-2 font-black tracking-widest">รายละเอียดงาน</p>
                    <p className="text-base leading-relaxed">{selectedWork.detail || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                  </div>

                  {/* รูปยืนยันงาน */}
                  {(selectedWork.start_photo_url || selectedWork.complete_photo_url) && (
                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Camera size={11} /> รูปยืนยันงาน
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-3">
                        {selectedWork.start_photo_url ? (
                          <div>
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <PlayCircle size={10} /> รูปเริ่มงาน
                            </p>
                            <a href={selectedWork.start_photo_url} target="_blank" rel="noopener noreferrer">
                              <img src={selectedWork.start_photo_url} alt="เริ่มงาน" className="w-full h-28 object-cover rounded-xl border-2 border-blue-100 hover:opacity-90 transition-opacity" />
                            </a>
                          </div>
                        ) : (
                          <div className="h-28 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <p className="text-[9px] font-bold text-slate-300 text-center">ยังไม่มีรูปเริ่มงาน</p>
                          </div>
                        )}
                        {selectedWork.complete_photo_url ? (
                          <div>
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <CheckCircle2 size={10} /> รูปเสร็จงาน
                            </p>
                            <a href={selectedWork.complete_photo_url} target="_blank" rel="noopener noreferrer">
                              <img src={selectedWork.complete_photo_url} alt="เสร็จงาน" className="w-full h-28 object-cover rounded-xl border-2 border-emerald-100 hover:opacity-90 transition-opacity" />
                            </a>
                          </div>
                        ) : (
                          <div className="h-28 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <p className="text-[9px] font-bold text-slate-300 text-center">ยังไม่มีรูปเสร็จงาน</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* บันทึกเวลาดำเนินงาน */}
                  {hasTime && (
                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
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
                              {selectedWork.started_at
                                ? formatTimestamp(selectedWork.started_at)
                                : <span className="text-slate-300">ยังไม่ได้เริ่ม</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={15} className="text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">เสร็จสิ้น</p>
                            <p className="text-sm font-bold text-slate-800">
                              {selectedWork.completed_at
                                ? formatTimestamp(selectedWork.completed_at)
                                : <span className="text-slate-300">ยังไม่เสร็จ</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-6">
                  {selectedWork.status === 'pending' && (
                    <button
                      onClick={() => handleStatusAction(selectedWork.id, 'inprogress', selectedWork.detail)}
                      className="flex-[2] py-4 rounded-2xl text-white font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      style={{ backgroundColor: mainColor }}
                    >
                      <Camera size={18} /> เริ่มดำเนินงาน
                    </button>
                  )}
                  {selectedWork.status === 'inprogress' && (
                    <button
                      onClick={() => handleStatusAction(selectedWork.id, 'complete', selectedWork.detail)}
                      className="flex-[2] bg-emerald-600 py-4 rounded-2xl text-white font-black text-sm shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Camera size={18} /> เสร็จสิ้น
                    </button>
                  )}
                  <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-sm text-slate-500 hover:bg-slate-200 active:scale-95 transition-all">ย้อนกลับ</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {photoModal && (
        <PhotoUploadModal
          mode={photoModal.mode}
          jobDetail={photoModal.detail}
          onConfirm={handlePhotoConfirm}
          onCancel={() => setPhotoModal(null)}
        />
      )}
    </div>
  );
}