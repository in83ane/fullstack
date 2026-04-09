'use client';

import React from 'react';
import { CalendarRange } from 'lucide-react';
import { formatDisplayDate } from '@/frontend/lib/utils';

interface DurationBannerProps {
  startDate: string;
  endDate: string;
}

export default function DurationBanner({ startDate, endDate }: DurationBannerProps) {
  const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div className="flex items-center gap-2 -mt-2">
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-2xl text-sm font-black">
        <CalendarRange size={14} />
        งานยาว {days} วัน · {formatDisplayDate(startDate)} ถึง {formatDisplayDate(endDate)}
      </div>
    </div>
  );
}
