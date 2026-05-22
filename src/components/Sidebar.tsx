"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useUnread } from './UnreadProvider';

interface SidebarProps {
  userName: string;
  unitName: string;
  userRole: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ userName, unitName, userRole, userEmail, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { totalUnread } = useUnread();

  // Fechar sidebar ao mudar de rota em dispositivos móveis
  useEffect(() => {
    onClose();
  }, [pathname]);

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white flex flex-col border-r border-slate-100 shadow-[2px_0_15px_rgba(0,0,0,0.02)] z-50
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between lg:block">
            <img
              src="/logo-acs.png"
              alt="Secretaria Municipal de Saúde de Piraí e PET-Saúde"
              className="w-40 lg:w-full h-auto object-contain max-h-20"
            />
            <button 
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Fechar menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="flex items-center gap-2 px-2 border-t border-slate-100 pt-3">
            <div className="w-2 h-6 bg-teal-500 rounded-full"></div>
            <span className="text-xl font-black text-slate-800 tracking-tighter">
              ACS-Online
            </span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 mb-4">Menu Principal</div>
          
          <SidebarLink href="/dashboard" active={pathname === '/dashboard'}>
            Visão Geral
          </SidebarLink>
          <SidebarLink href="/dashboard/pacientes" active={pathname.startsWith('/dashboard/pacientes') && !pathname.startsWith('/dashboard/pacientes/grupos')}>
            Pacientes
          </SidebarLink>
          <SidebarLink href="/dashboard/grupos" active={pathname.startsWith('/dashboard/grupos')}>
            Grupos de Saúde
          </SidebarLink>
          <SidebarLink href="/dashboard/chat" active={pathname.startsWith('/dashboard/chat')}>
            <div className="flex items-center justify-between w-full">
              <span>Chat ao Vivo</span>
              {totalUnread > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {totalUnread}
                </span>
              )}
            </div>
          </SidebarLink>
          
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 mt-6 mb-2">Trilhas de Cuidado</div>
          <SidebarLink href="/dashboard/biblioteca" active={pathname.startsWith('/dashboard/biblioteca')} variant="emerald">
            📚 Biblioteca
          </SidebarLink>
          <SidebarLink href="/dashboard/agendamentos" active={pathname.startsWith('/dashboard/agendamentos')} variant="emerald">
            📅 Agendamentos (ACS)
          </SidebarLink>

          {(userRole === 'admin_ti' || userRole === 'gerente') && (
            <>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-4 mt-6 mb-2">Administração</div>
              <SidebarLink href="/dashboard/equipe" active={pathname.startsWith('/dashboard/equipe')}>
                👥 Gestão de Equipe
              </SidebarLink>
              <SidebarLink href="/dashboard/relatorios" active={pathname.startsWith('/dashboard/relatorios')}>
                📊 Relatórios
              </SidebarLink>
            </>
          )}
        </nav>
        
        <div className="p-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative group cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex-shrink-0 flex items-center justify-center text-white font-bold">
                {userName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-700 truncate">{userName}</p>
                <p className="text-[10px] font-mono text-slate-400 truncate mb-0.5">{userEmail}</p>
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
    </>
  );
}

function SidebarLink({ href, children, active, variant = 'teal' }: { href: string, children: React.ReactNode, active: boolean, variant?: 'teal' | 'emerald' }) {
  const styles = {
    teal: active 
      ? 'bg-teal-50 text-teal-700 shadow-[0_2px_10px_rgba(20,184,166,0.05)]' 
      : 'text-slate-500 hover:bg-teal-50 hover:text-teal-700',
    emerald: active
      ? 'bg-emerald-50 text-emerald-700 shadow-[0_2px_10px_rgba(16,185,129,0.05)]'
      : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
  };

  return (
    <Link 
      href={href} 
      className={`block px-4 py-3 rounded-2xl transition-all duration-200 font-medium flex items-center gap-2 ${styles[variant]}`}
    >
      {children}
    </Link>
  );
}
