"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, UserX, Trash2, AlertCircle, UserCheck } from "lucide-react";

interface Department {
  id: string;
  name: string;
  color_code: string;
}

interface Employee {
  id: string;
  staff_id: string;
  name: string;
  image_url: string | null;
  department_id: string | null;
  departments: Department | null;
  is_active: boolean;
  user_id?: string | null;
}

function normalizeEmployee(e: Record<string, unknown>): Employee {
  const dept = e.departmentId as Record<string, unknown> | null;
  return {
    id: String(e._id),
    staff_id: e.staffId ? String(e.staffId) : '',
    name: String(e.name ?? ''),
    image_url: e.imageUrl ? String(e.imageUrl) : null,
    department_id: dept ? String(dept._id ?? '') : null,
    departments: dept ? {
      id: String(dept._id ?? ''),
      name: String(dept.name ?? ''),
      color_code: String(dept.colorCode ?? ''),
    } : null,
    is_active: Boolean(e.isActive ?? false),
    user_id: e.userId ? String(e.userId) : null,
  };
}

export default function DisabledEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDisabled = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees?disabled=true');
      if (!res.ok) throw new Error('Fetch failed');
      const { employees: data } = await res.json();
      setEmployees((data as Record<string, unknown>[]).map(normalizeEmployee));
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDisabled(); }, [fetchDisabled]);

  const handleRestore = async (emp: Employee) => {
    const email = prompt(`ดึงคุณ ${emp.name} กลับเข้าทำงาน\nกรุณาระบุ Email สำหรับใช้ Login:`);
    if (!email) return;

    const atIdx = email.indexOf('@');
    if (atIdx <= 0 || atIdx >= email.length - 1) { alert("กรุณาระบุ Email ที่ถูกต้อง"); return; }
    const dotIdx = email.lastIndexOf('.');
    if (dotIdx <= atIdx + 1 || dotIdx >= email.length - 1) { alert("กรุณาระบุ Email ที่ถูกต้อง"); return; }

    const password = prompt(`ตั้งรหัสผ่านใหม่สำหรับคุณ ${emp.name}\n(อย่างน้อย 15 ตัวอักษร):`);
    if (!password) return;
    if (password.length < 15) { alert("รหัสผ่านต้องมีอย่างน้อย 15 ตัวอักษร"); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true, email, password }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

      alert(`ดึงคุณ ${emp.name} กลับเข้าทำงานเรียบร้อยแล้ว\n\nEmail: ${email}`);
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : "ไม่ทราบสาเหตุ"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForever = async (emp: Employee) => {
    if (!confirm(`ยืนยันการลบคุณ ${emp.name} ออกจากระบบถาวร?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
    } catch (err) {
      alert("ไม่สามารถลบข้อมูลได้: " + (err instanceof Error ? err.message : "ไม่ทราบสาเหตุ"));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const s = searchQuery.toLowerCase();
      return (e.name?.toLowerCase().includes(s) ?? false) || (e.staff_id?.includes(searchQuery) ?? false);
    });
  }, [employees, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto p-3 md:p-8">
      <header className="mb-5 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 md:p-3 bg-slate-900 rounded-xl md:rounded-2xl text-white shadow-xl">
            <UserX size={20} />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">Inactive Staff</h1>
            <p className="text-slate-400 font-bold text-xs md:text-sm">รายชื่อพนักงานที่พ้นสภาพ</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/employees")}
          className="text-slate-400 hover:text-slate-900 font-bold text-sm flex items-center gap-1.5 px-2 transition-colors"
        >
          <ArrowLeft size={16} /> กลับไปหน้าจัดการพนักงาน
        </button>
      </header>

      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden min-h-[300px]">
        <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-72 md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ค้นหาพนักงานที่พ้นสภาพ..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-slate-900 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-slate-400 text-sm font-bold shrink-0">ทั้งหมด {filtered.length} รายการ</div>
        </div>

        <div className="p-4 md:p-6 space-y-3">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-slate-200" size={36} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-300 font-bold flex flex-col items-center gap-2">
              <AlertCircle size={40} className="opacity-20" />
              <p className="text-sm">ไม่มีข้อมูลพนักงานที่พ้นสภาพ</p>
            </div>
          ) : (
            filtered.map((emp) => (
              <div
                key={emp.id}
                className="p-3.5 md:p-4 rounded-[1.5rem] border-2 border-slate-50 bg-white flex items-center gap-3 group transition-all hover:border-slate-100 shadow-sm hover:shadow-md"
              >
                <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl overflow-hidden grayscale opacity-50 bg-slate-100 flex-shrink-0">
                  <img
                    src={emp.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`}
                    className="w-full h-full object-cover"
                    alt={emp.name}
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-black text-slate-500 group-hover:text-slate-900 transition-all truncate text-sm md:text-base">{emp.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                    ID: {emp.staff_id} · {emp.departments?.name || 'ทั่วไป'}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(emp)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-black rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md"
                  >
                    <UserCheck size={14} />
                    <span>ดึงกลับ</span>
                  </button>
                  <button
                    onClick={() => handleDeleteForever(emp)}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    title="ลบประวัติถาวร"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <footer className="mt-6 text-center">
        <p className="text-slate-400 text-[11px] font-medium italic px-4">
          * พนักงานที่พ้นสภาพจะถูกลบบัญชีผู้ใช้เดิมออกเพื่อความปลอดภัย การดึงกลับเข้าทำงานต้องกำหนดรหัสผ่านใหม่เสมอ
        </p>
      </footer>
    </div>
  );
}
