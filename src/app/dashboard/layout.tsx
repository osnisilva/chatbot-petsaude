import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-slate-700 text-teal-400">
          Painel Saúde
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <Link href="/dashboard" className="block px-4 py-3 rounded-lg transition-colors hover:bg-slate-800 hover:text-teal-400">
            Visão Geral
          </Link>
          <Link href="/dashboard/pacientes" className="block px-4 py-3 rounded-lg transition-colors hover:bg-slate-800 hover:text-teal-400">
            Pacientes
          </Link>
          <Link href="/dashboard/chat" className="block px-4 py-3 rounded-lg transition-colors hover:bg-slate-800 hover:text-teal-400">
            Chat ao Vivo
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <Link href="/login" className="block w-full text-left px-4 py-2 text-slate-400 hover:text-white transition-colors">
            Sair
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
