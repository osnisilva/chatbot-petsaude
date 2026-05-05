"use client";

import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onOpenSidebar: () => void;
}

export default function MobileHeader({ onOpenSidebar }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenSidebar}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
          aria-label="Abrir menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-teal-500 rounded-full"></div>
          <span className="font-black text-slate-800 tracking-tighter">ACS-Online</span>
        </div>
      </div>
      
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
        ACS
      </div>
    </header>
  );
}
