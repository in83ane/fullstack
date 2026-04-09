'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeWork, type WorkScheduleItem, type WorkForm } from '@/frontend/lib/work';
import { normalizeEmployee, normalizeDept, type Employee, type Department } from '@/frontend/lib/constants';

interface User {
  id: string;
  role: string;
  name?: string;
  employeeId?: string | null;
}

interface UseWorkDataReturn {
  user: User | null;
  allWorkData: WorkScheduleItem[];
  masterEmployees: Employee[];
  departments: Department[];
  loading: boolean;
  refreshData: () => Promise<void>;
  isAdmin: boolean;
  isOwner: boolean;
}

export function useWorkData(): UseWorkDataReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allWorkData, setAllWorkData] = useState<WorkScheduleItem[]>([]);
  const [masterEmployees, setMasterEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!user) return;

    try {
      const activeRole = user.role;
      const activeEmployeeId = user.employeeId ?? null;

      const wsUrl =
        activeRole !== 'admin' && activeRole !== 'owner' && activeEmployeeId
          ? `/api/work-schedule?employeeId=${activeEmployeeId}`
          : '/api/work-schedule';

      const [wsRes, empsRes, deptsRes] = await Promise.all([
        fetch(wsUrl),
        fetch('/api/employees?active=true'),
        fetch('/api/departments'),
      ]);

      if (wsRes.ok) {
        const { schedules } = await wsRes.json();
        const normalized = (schedules as Record<string, unknown>[]).map(normalizeWork);
        const sorted = normalized.sort((a, b) =>
          `${a.work_date}T${a.work_time}`.localeCompare(`${b.work_date}T${b.work_time}`)
        );
        setAllWorkData(sorted);
      }

      if (empsRes.ok) {
        const { employees } = await empsRes.json();
        setMasterEmployees((employees as Record<string, unknown>[]).map(normalizeEmployee));
      }

      if (deptsRes.ok) {
        const { departments } = await deptsRes.json();
        setDepartments((departments as Record<string, unknown>[]).map(normalizeDept));
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, [user]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const res = await fetch('/api/profiles/me');
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        const { user: profile } = await res.json();
        const userRole = profile?.role || 'user';
        const userName = profile?.employeeName || profile?.email?.split('@')[0] || 'User';
        const employeeId = profile?.employeeId || null;

        const userData = {
          id: String(profile._id),
          role: userRole,
          name: userName,
          employeeId,
        };

        setUser(userData);
      } catch (err) {
        console.error('Error initializing:', err);
        router.push('/auth/login');
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    if (user) {
      refreshData().then(() => setLoading(false));
    }
  }, [user, refreshData]);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  const isOwner = user?.role === 'owner';

  return {
    user,
    allWorkData,
    masterEmployees,
    departments,
    loading,
    refreshData,
    isAdmin,
    isOwner,
  };
}
