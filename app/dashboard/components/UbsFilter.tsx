"use client";

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface UbsFilterProps {
  ubsList: { id: string, name: string }[];
  currentUbsId: string | null;
  currentUbsName?: string;
  disabled?: boolean;
}

export default function UbsFilter({ ubsList, currentUbsId, currentUbsName, disabled }: UbsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleUbsChange = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set('ubs', id);
    } else {
      params.delete('ubs');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative w-full sm:w-auto sm:min-w-[300px] sm:max-w-[400px]">
      <select
        disabled={disabled}
        value={currentUbsId || ''}
        onChange={(e) => handleUbsChange(e.target.value)}
        className={`
          w-full pl-4 pr-12 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm 
          text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 
          appearance-none cursor-pointer transition-all truncate
          ${disabled ? 'opacity-70 bg-slate-50 cursor-not-allowed' : 'hover:border-teal-200'}
        `}
      >
        <option value="">{disabled ? (currentUbsName || 'Sua Unidade') : 'Todas as Unidades (Total)'}</option>
        {ubsList.map((ubs) => (
          <option key={ubs.id} value={ubs.id}>
            {ubs.name}
          </option>
        ))}
      </select>
      
      {/* Custom arrow for the select */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
  );
}
