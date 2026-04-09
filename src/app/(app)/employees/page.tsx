"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const createEmployeeSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'กรุณากรอกข้อมูลให้ครบถ้วน')
        .max(200, 'ชื่อ-นามสกุลของท่านมีความยาวเกินไป')
        .regex(/^[\u0E00-\u0E7Fa-zA-Z\s'-]+$/, 'กรุณากรอกตัวอักษรไทยหรืออังกฤษเท่านั้น'),
    email: z.string().trim().min(1, 'กรุณากรอกข้อมูลให้ครบถ้วน').email('กรุณากรอกอีเมลให้ถูกต้อง').max(200, 'กรุณากรอกอีเมลให้ถูกต้อง'),
    password: z
        .string()
        .min(1, 'กรุณากรอกข้อมูลให้ครบถ้วน')
        .min(15, 'รหัสผ่านต้องมีอย่างน้อย 15 ตัวอักษร')
        .max(128, 'รหัสผ่านของท่านมีจำนวนยาวเกินไป'),
});

import {
    Users, ArrowLeft, Camera, Loader2, Plus, Edit3, Save, Search, UserX, RotateCcw, Mail, Lock, KeyRound, UserCheck, Clock, CheckCircle, X
} from "lucide-react";
import Link from "next/link";
import { getAvatarUrl, normalizeDept, type Department } from '@/frontend/lib/constants';

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

interface PendingEmployee {
    id: string;
    name: string;
    user_id: string | null;
    created_at: string;
    profiles?: { email: string; } | null;
}

function normalizeEmployee(e: Record<string, unknown>): Employee {
    const dept = e.departmentId as Record<string, unknown> | null
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
        is_active: Boolean(e.isActive ?? true),
        user_id: e.userId ? String(e.userId) : null,
    }
}

function normalizePending(e: Record<string, unknown>): PendingEmployee {
    const userDoc = e.userId as Record<string, unknown> | null
    return {
        id: String(e._id),
        name: String(e.name ?? ''),
        user_id: userDoc ? String(userDoc._id ?? '') : null,
        created_at: e.createdAt ? String(e.createdAt) : '',
        profiles: userDoc?.email ? { email: String(userDoc.email) } : null,
    }
}


function ResetPasswordModal({ employee, onClose }: { employee: Employee; onClose: () => void; }) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleReset = async () => {
        setError(null);
        if (!newPassword || !confirmPassword) { setError("กรุณากรอกรหัสผ่านให้ครบ"); return; }
        if (newPassword !== confirmPassword) { setError("รหัสผ่านไม่ตรงกัน"); return; }
        if (newPassword.length < 6) { setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/employees/${employee.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "เกิดข้อผิดพลาด");
            setSuccess(true);
            setTimeout(() => onClose(), 1500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full md:max-w-sm bg-white rounded-t-[2rem] md:rounded-[2rem] border-4 border-white shadow-2xl p-6 md:p-8 space-y-4">
                <div className="flex justify-center mb-1 md:hidden">
                    <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900 rounded-xl text-white"><KeyRound size={17} /></div>
                    <div>
                        <h2 className="text-base font-black text-slate-900">รีเซ็ตรหัสผ่าน</h2>
                        <p className="text-xs font-bold text-slate-400">{employee.name} {employee.staff_id ? <span className="text-slate-300">#{employee.staff_id}</span> : null}</p>
                    </div>
                </div>
                {success ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-100">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-sm font-black text-emerald-700">รีเซ็ตรหัสผ่านสำเร็จ!</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                                <input type="password" placeholder="รหัสผ่านใหม่" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-10 p-3.5 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-xl font-bold outline-none text-sm" />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                                <input type="password" placeholder="ยืนยันรหัสผ่านใหม่" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-10 p-3.5 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-xl font-bold outline-none text-sm" />
                            </div>
                        </div>
                        {error && <p className="text-xs font-bold text-rose-500 bg-rose-50 border-2 border-rose-100 px-4 py-3 rounded-xl">{error}</p>}
                        <div className="flex gap-2 pt-1">
                            <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black hover:bg-slate-200 transition-all text-sm">ยกเลิก</button>
                            <button onClick={handleReset} disabled={loading} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={15} /> : <KeyRound size={15} />} บันทึก
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ApproveModal({ employee, onClose, onApprove }: { employee: PendingEmployee; onClose: () => void; onApprove: (deptId: string) => void; }) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDept, setSelectedDept] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchDepartments() {
            const res = await fetch('/api/departments');
            if (res.ok) {
                const { departments: data } = await res.json();
                setDepartments((data as Record<string, unknown>[]).map(normalizeDept));
            }
        }
        fetchDepartments();
    }, []);

    const handleApprove = async () => {
        if (!selectedDept) {
            console.log('No department selected');
            return;
        }
        console.log('Approving with dept:', selectedDept);
        setLoading(true);
        try {
            onApprove(selectedDept);
        } catch (err) {
            console.error('Approval error:', err);
        } finally {
            setLoading(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full md:max-w-sm bg-white rounded-t-[2rem] md:rounded-[2rem] border-4 border-white shadow-2xl p-6 md:p-8 space-y-4">
                <div className="flex justify-center mb-1 md:hidden">
                    <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-600 rounded-xl text-white"><UserCheck size={17} /></div>
                    <div>
                        <h2 className="text-base font-black text-slate-900">อนุมัติพนักงาน</h2>
                        <p className="text-xs font-bold text-slate-400">{employee.name}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-slate-600">เลือกแผนกสำหรับพนักงาน:</p>
                    <select
                        className="w-full p-3.5 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-xl font-bold outline-none text-sm"
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                    >
                        <option value="">เลือกแผนก...</option>
                        {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                    </select>
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black hover:bg-slate-200 transition-all text-sm">ยกเลิก</button>
                    <button onClick={handleApprove} disabled={loading || !selectedDept} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle size={15} />} อนุมัติ
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function EmployeesPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [pendingEmployees, setPendingEmployees] = useState<PendingEmployee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState<boolean>(true);
    const [uploading, setUploading] = useState<boolean>(false);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');

    const [formData, setFormData] = useState({ name: "", staff_id: "", department_id: "", email: "", password: "" });
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [resetTarget, setResetTarget] = useState<Employee | null>(null);
    const [approveTarget, setApproveTarget] = useState<PendingEmployee | null>(null);

    const resetForm = useCallback(() => {
        setIsEditing(false);
        setEditId(null);
        setPreviewUrl(null);
        setFile(null);
        setShowForm(false);
        setFormData({ name: "", staff_id: "", department_id: "", email: "", password: "" });
    }, []);

    const refreshData = useCallback(async () => {
        try {
            const [empRes, pendingRes, deptRes] = await Promise.all([
                fetch('/api/employees?active=true'),
                fetch('/api/employees?pending=true'),
                fetch('/api/departments'),
            ]);
            if (empRes.ok) {
                const { employees: data } = await empRes.json();
                setEmployees((data as Record<string, unknown>[]).map(normalizeEmployee));
            }
            if (pendingRes.ok) {
                const { employees: data } = await pendingRes.json();
                setPendingEmployees((data as Record<string, unknown>[]).map(normalizePending));
            }
            if (deptRes.ok) {
                const { departments: data } = await deptRes.json();
                setDepartments((data as Record<string, unknown>[]).map(normalizeDept));
            }
        } catch (err) { console.error("Refresh Error:", err); }
    }, []);

    useEffect(() => {
        const init = async () => { setLoading(true); await refreshData(); setLoading(false); };
        init();
    }, [refreshData]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const s = searchQuery.toLowerCase();
            return (emp.name?.toLowerCase().includes(s) ?? false) || (emp.staff_id?.toString().includes(searchQuery) ?? false);
        });
    }, [employees, searchQuery]);

    const handleDisable = async (emp: Employee) => {
        if (!confirm(`ย้ายคุณ ${emp.name} ไปที่หน้าพนักงานที่ออกแล้ว?`)) return;
        try {
            const res = await fetch(`/api/employees/${emp.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: false, userId: null }),
            });
            if (!res.ok) throw new Error('Update failed');
            setEmployees(prev => prev.filter(e => e.id !== emp.id));
        } catch (err) { alert("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : "ไม่ทราบสาเหตุ")); }
    };

    const handleApprove = async (employee: PendingEmployee, departmentId: string) => {
        if (!departmentId) { alert('กรุณาเลือกแผนก'); return; }
        try {
            const res = await fetch(`/api/employees/${employee.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approve: true, departmentId }),
            });
            if (!res.ok) throw new Error('Approve failed');
            await refreshData();
            setApproveTarget(null);
        } catch (err) {
            alert("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : "ไม่ทราบสาเหตุ"));
        }
    };

    const handleReject = async (employee: PendingEmployee) => {
        if (!confirm(`ปฏิเสธคำขอของ ${employee.name}?\nบัญชีนี้จะถูกลบออกจากระบบ`)) return;
        try {
            const res = await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setPendingEmployees(prev => prev.filter(e => e.id !== employee.id));
        } catch (err) {
            alert("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : "ไม่ทราบสาเหตุ"));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            let finalImageUrl = previewUrl;

            // อัปโหลดรูปภาพถ้ามี
            if (file) {
                const formDataUpload = new FormData();
                formDataUpload.append('file', file);
                const uploadRes = await fetch('/api/files', { method: 'POST', body: formDataUpload });
                if (!uploadRes.ok) throw new Error('ไม่สามารถอัปโหลดรูปภาพ');
                const { url } = await uploadRes.json();
                finalImageUrl = url;
            }

            if (isEditing && editId) {
                const res = await fetch(`/api/employees/${editId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formData.name.trim(),
                        departmentId: formData.department_id || null,
                        imageUrl: finalImageUrl,
                    }),
                });
                if (!res.ok) {
                    const { error } = await res.json().catch(() => ({ error: 'Update failed' }));
                    throw new Error(error);
                }
            } else {
                const validation = createEmployeeSchema.safeParse({
                    name: formData.name.trim(),
                    email: formData.email,
                    password: formData.password,
                })
                if (!validation.success) {
                    alert(validation.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
                    setUploading(false)
                    return
                }
                const res = await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formData.name.trim(),
                        email: formData.email,
                        password: formData.password,
                        departmentId: formData.department_id || null,
                        imageUrl: finalImageUrl,
                    }),
                });
                if (!res.ok) {
                    const { error } = await res.json().catch(() => ({ error: 'Create failed' }));
                    throw new Error(error);
                }
            }

            alert(isEditing ? "อัปเดตข้อมูลสำเร็จ" : "เพิ่มพนักงานและสร้างบัญชีสำเร็จ");
            await resetForm();
            await refreshData();
        } catch (err: unknown) {
            console.error('Submit error:', err);
            const error = err as Error;
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-300" size={40} /></div>;

    return (
        <main className="max-w-7xl mx-auto p-3 md:p-8 min-h-screen bg-slate-50/30">
            <header className="mb-5 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 md:p-3 bg-slate-900 rounded-xl md:rounded-2xl text-white shadow-xl"><Users size={20} /></div>
                    <div>
                        <h1 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">Staff Management</h1>
                        <p className="text-slate-400 font-bold text-xs md:text-sm">จัดการพนักงานและบัญชีเข้าใช้งาน</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/employees/disabled" className="bg-white border-2 border-slate-200 px-3 py-2 rounded-xl font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all shadow-sm text-sm">
                        <UserX size={16} className="text-slate-900" /> พนักงานที่ออกแล้ว
                    </Link>
                    <button onClick={() => router.push("/home")} className="text-slate-400 hover:text-slate-900 font-bold text-sm flex items-center gap-1.5 ml-2 px-2 transition-colors">
                        <ArrowLeft size={16} /> กลับ
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                    พนักงานปัจจุบัน ({employees.length})
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                    รออนุมัติ
                    {pendingEmployees.length > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px]">{pendingEmployees.length}</span>
                    )}
                </button>
            </div>

            {activeTab === 'active' && (
                <>
                    <div className="lg:hidden mb-4">
                        <button onClick={() => { setShowForm(true); setIsEditing(false); setEditId(null); setPreviewUrl(null); setFile(null); }}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg text-sm active:scale-[0.98] transition-all">
                            <Plus size={18} /> เพิ่มพนักงานใหม่
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8 items-start">
                        <section className={`lg:col-span-4 ${showForm || isEditing ? 'block' : 'hidden lg:block'}`}>
                            {(showForm || isEditing) && (
                                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={resetForm} />
                            )}
                            <div className={`
                                lg:static lg:z-auto lg:shadow-none lg:rounded-[2.5rem] lg:border-4
                                fixed bottom-0 left-0 right-0 z-50 lg:relative
                                bg-white shadow-2xl border-t-4 lg:border-4
                                rounded-t-[2rem] lg:rounded-[2.5rem]
                                transition-all
                                ${isEditing ? 'border-orange-500' : 'border-white'}
                            `}>
                                <form onSubmit={handleSubmit} className="p-5 md:p-8">
                                    <div className="flex justify-center mb-3 lg:hidden">
                                        <div className="w-10 h-1 bg-slate-200 rounded-full" />
                                    </div>

                                    <div className="flex flex-col items-center mb-5 md:mb-8">
                                        <div className="relative" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-100 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 border-white cursor-pointer hover:border-slate-900 transition-all flex items-center justify-center shadow-inner">
                                                <img src={file ? URL.createObjectURL(file) : (previewUrl || getAvatarUrl(formData.name))} className="w-full h-full object-cover" alt="profile" />
                                                <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-[1.5rem] md:rounded-[2rem]"><Camera className="text-white" size={20} /></div>
                                            </div>
                                            <div className="absolute -top-2 -right-2 bg-slate-900 text-white px-2.5 py-0.5 rounded-lg font-black shadow-lg border-2 border-white text-[10px]">ID: {formData.staff_id}</div>
                                        </div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ข้อมูลส่วนตัว</label>
                                            <input type="text" placeholder="ชื่อ-นามสกุล..." className="w-full p-3.5 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-xl font-bold outline-none text-sm" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                            <select className="w-full p-3.5 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-xl font-bold outline-none text-sm" value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} required>
                                                <option value="">เลือกแผนก...</option>
                                                {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                                            </select>
                                        </div>

                                        {!isEditing && (
                                            <div className="space-y-2 pt-2 border-t-2 border-slate-50">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">บัญชีล็อคอิน</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <input type="email" placeholder="อีเมล" className="w-full pl-10 p-3.5 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-xl font-bold outline-none text-sm" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required={!isEditing} />
                                                </div>
                                                <div className="relative">
                                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <input type="password" placeholder="รหัสผ่าน (อย่างน้อย 15 ตัวอักษร)" className="w-full pl-10 p-3.5 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-xl font-bold outline-none text-sm" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!isEditing} minLength={15} />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            <button type="submit" disabled={uploading} className={`flex-grow py-3.5 text-white rounded-xl font-black shadow-xl flex items-center justify-center gap-2 transition-all text-sm ${isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                                                {uploading ? <Loader2 className="animate-spin" size={17} /> : (isEditing ? <Save size={17} /> : <Plus size={17} />)}
                                                {isEditing ? "อัปเดตข้อมูล" : "เพิ่มพนักงาน"}
                                            </button>
                                            {isEditing && (
                                                <button type="button" onClick={resetForm} className="px-4 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black hover:bg-slate-200 transition-all flex items-center justify-center"><RotateCcw size={16} /></button>
                                            )}
                                            <button type="button" onClick={resetForm} className="px-4 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black hover:bg-slate-200 transition-all lg:hidden text-sm">ยกเลิก</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </section>

                        <section className="lg:col-span-8">
                            <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden min-h-[300px]">
                                <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <h3 className="text-base md:text-lg font-black text-slate-900">พนักงานปัจจุบัน ({filteredEmployees.length})</h3>
                                    <div className="relative w-full sm:w-56 md:w-64">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="text" placeholder="ค้นหา..." className="w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-100 rounded-xl font-bold text-sm focus:border-slate-900 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 md:p-6">
                                    {filteredEmployees.map((emp) => (
                                        <div key={emp.id} className={`group p-3.5 rounded-[1.5rem] border-2 bg-white flex items-center gap-3 transition-all ${editId === emp.id ? 'border-orange-200 bg-orange-50/30 shadow-inner' : 'border-slate-50 hover:shadow-xl'}`}>
                                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl overflow-hidden border-4 border-white shadow-md flex-shrink-0">
                                                <img src={emp.image_url || getAvatarUrl(emp.name)} className="w-full h-full object-cover" alt={emp.name} />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="font-black text-slate-900 truncate text-sm md:text-base">{emp.name}</div>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-400">#{emp.staff_id}</span>
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded text-white" style={{ backgroundColor: emp.departments?.color_code || '#000' }}>{emp.departments?.name || 'ทั่วไป'}</span>
                                                    {emp.user_id && <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-600">มีบัญชี</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setIsEditing(true); setEditId(emp.id); setFormData({ name: emp.name, staff_id: emp.staff_id, department_id: emp.department_id || "", email: "", password: "" }); setPreviewUrl(emp.image_url); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-slate-300 hover:text-orange-500" title="แก้ไขข้อมูล"><Edit3 size={15} /></button>
                                                {emp.user_id && (
                                                    <button onClick={() => setResetTarget(emp)} className="p-2 text-slate-300 hover:text-sky-500" title="รีเซ็ตรหัสผ่าน"><KeyRound size={15} /></button>
                                                )}
                                                <button onClick={() => handleDisable(emp)} className="p-2 text-slate-300 hover:text-rose-500" title="ย้ายไปพนักงานที่ออกแล้ว"><UserX size={15} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>
                </>
            )}

            {activeTab === 'pending' && (
                <section>
                    <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden min-h-[300px]">
                        <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/30">
                            <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
                                <Clock size={18} className="text-amber-500" />
                                พนักงานรออนุมัติ ({pendingEmployees.length})
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">พนักงานที่สมัครเข้ามาเองและรอการอนุมัติจากแอดมิน</p>
                        </div>

                        {pendingEmployees.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={24} className="text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-bold">ไม่มีพนักงานรออนุมัติ</p>
                                <p className="text-sm text-slate-400 mt-1">ไม่มีคำขอสมัครใหม่ในขณะนี้</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 md:p-6">
                                {pendingEmployees.map((emp) => (
                                    <div key={emp.id} className="p-4 rounded-[1.5rem] border-2 border-amber-100 bg-amber-50/30 flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-4 border-white shadow-md flex-shrink-0">
                                            <img src={getAvatarUrl(emp.name)} className="w-full h-full object-cover" alt={emp.name} />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="font-black text-slate-900 truncate">{emp.name}</div>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-700">รออนุมัติ</span>
                                                <span className="text-[10px] text-slate-500">{emp.profiles?.email || 'ไม่มีอีเมล'}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">สมัครเมื่อ {new Date(emp.created_at).toLocaleDateString('th-TH')}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setApproveTarget(emp)}
                                                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all"
                                                title="อนุมัติ"
                                            >
                                                <UserCheck size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleReject(emp)}
                                                className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all"
                                                title="ปฏิเสธ"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {resetTarget && <ResetPasswordModal employee={resetTarget} onClose={() => setResetTarget(null)} />}
            {approveTarget && (
                <ApproveModal
                    employee={approveTarget}
                    onClose={() => setApproveTarget(null)}
                    onApprove={(deptId) => handleApprove(approveTarget, deptId)}
                />
            )}
        </main>
    );
}
