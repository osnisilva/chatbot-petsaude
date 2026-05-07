"use client";

import { useState } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';

interface DashboardUIProps {
  userName: string;
  unitName: string;
  userRole: string;
  children: React.ReactNode;
}

export default function DashboardUI({ userName, unitName, userRole, children }: DashboardUIProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F4F7F9] text-slate-800 font-sans selection:bg-teal-100 overflow-hidden">
      <Sidebar 
        userName={userName} 
        unitName={unitName} 
        userRole={userRole}
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <MobileHeader onOpenSidebar={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-teal-50/50 rounded-full blur-[60px] md:blur-[100px] -z-10 pointer-events-none"></div>
          {children}
        </main>
      </div>
    </div>
  );
}
