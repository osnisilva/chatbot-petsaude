import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  // Buscar sessão
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Buscar perfil do ACS
  const { data: acsProfile } = await supabase
    .from('acs')
    .select('name, ubs:ubs_id(name)')
    .eq('auth_user_id', session.user.id)
    .single();

  const userName = acsProfile?.name || 'Administrador';
  const unitName = (acsProfile?.ubs as any)?.name || 'Secretaria de Saúde';

  return (
    <div className="flex h-screen bg-[#F4F7F9] text-slate-800 font-sans selection:bg-teal-100">
      {/* Sidebar Premium */}
      <aside className="w-64 bg-white flex flex-col border-r border-slate-100 shadow-[2px_0_15px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 flex flex-col gap-4">
          <div className="w-full flex justify-center">
            <img 
            src="/logo.png" 
            alt="Logos Secretaria de Saúde e PET-Saúde" 
            className="w-full h-auto object-contain max-h-24 mb-6"
          />
          </div>
          <div className="flex items-center gap-2 px-2 border-t border-slate-50 pt-4">
            <div className="w-2 h-6 bg-teal-500 rounded-full"></div>
            <span className="text-xl font-black text-slate-800 tracking-tighter">
              ACS-Online
            </span>
          </div>
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
          
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 mt-6 mb-2">Trilhas de Cuidado</div>
          <Link href="/dashboard/biblioteca" className="block px-4 py-3 rounded-2xl transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 font-medium hover:shadow-[0_2px_10px_rgba(16,185,129,0.05)] flex items-center gap-2">
            📚 Biblioteca
          </Link>
          <Link href="/dashboard/agendamentos" className="block px-4 py-3 rounded-2xl transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 font-medium hover:shadow-[0_2px_10px_rgba(16,185,129,0.05)] flex items-center gap-2">
            📅 Agendamentos (ACS)
          </Link>
        </nav>
        
        <div className="p-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative group cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex-shrink-0 flex items-center justify-center text-white font-bold">
                {userName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-700 truncate">{userName}</p>
                <p className="text-xs text-slate-500 truncate" title={unitName}>{unitName}</p>
              </div>
            </div>
            {/* Botão Sair sutil */}
            <form action="/auth/signout" method="post" className="mt-3 border-t border-slate-200 pt-3">
              <button type="submit" className="text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-widest w-full text-left">
                Sair do Sistema
              </button>
            </form>
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
