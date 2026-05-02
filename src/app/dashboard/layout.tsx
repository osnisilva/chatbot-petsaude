import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F4F7F9] text-slate-800 font-sans selection:bg-teal-100">
      {/* Sidebar Premium */}
      <aside className="w-64 bg-white flex flex-col border-r border-slate-100 shadow-[2px_0_15px_rgba(0,0,0,0.02)] z-10">
        <div className="p-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-sm flex items-center justify-center">
            <span className="text-white font-bold text-lg">+</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 tracking-tight">
            Painel Saúde
          </span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 mb-4">Menu Principal</div>
          <Link href="/dashboard" className="block px-4 py-3 rounded-2xl transition-all duration-200 hover:bg-teal-50 hover:text-teal-700 text-slate-500 font-medium hover:shadow-[0_2px_10px_rgba(20,184,166,0.05)]">
            Visão Geral
          </Link>
          <Link href="/dashboard/pacientes" className="block px-4 py-3 rounded-2xl transition-all duration-200 hover:bg-teal-50 hover:text-teal-700 text-slate-500 font-medium hover:shadow-[0_2px_10px_rgba(20,184,166,0.05)]">
            Pacientes
          </Link>
          <Link href="/dashboard/chat" className="block px-4 py-3 rounded-2xl transition-all duration-200 hover:bg-teal-50 hover:text-teal-700 text-slate-500 font-medium hover:shadow-[0_2px_10px_rgba(20,184,166,0.05)]">
            Chat ao Vivo
          </Link>
        </nav>
        
        <div className="p-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-bold text-slate-700">Dr. Gestor</p>
                <p className="text-xs text-slate-500">Administrador</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-50/50 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        {children}
      </main>
    </div>
  );
}
