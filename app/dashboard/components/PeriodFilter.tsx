"use client";

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface PeriodFilterProps {
  currentPeriod: string | null;
}

export default function PeriodFilter({ currentPeriod }: PeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePeriodChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'hoje') {
      params.set('period', value);
    } else {
      params.delete('period');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative w-full sm:w-auto sm:min-w-[180px]">
      <select
        value={currentPeriod || 'hoje'}
        onChange={(e) => handlePeriodChange(e.target.value)}
        className="w-full pl-4 pr-10 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer transition-all hover:border-teal-200"
      >
        <option value="hoje">Hoje</option>
        <option value="7d">Últimos 7 dias</option>
        <option value="30d">Este Mês</option>
        <option value="all">Todo o período</option>
      </select>
      
      {/* Custom arrow for the select */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
  );
}
