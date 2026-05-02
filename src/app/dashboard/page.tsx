export default function DashboardPage() {
  return (
    <div className="p-10 h-full overflow-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Visão Geral</h1>
        <p className="text-slate-500 mt-2 text-lg">Acompanhe o desempenho do atendimento automatizado e transbordos.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Pacientes Cadastrados</h3>
          <p className="text-5xl font-black text-slate-800">1.204</p>
          <p className="text-emerald-500 text-sm font-semibold mt-4 flex items-center gap-1">↑ 12% este mês</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Atendimentos IA</h3>
          <p className="text-5xl font-black text-slate-800">856</p>
          <p className="text-teal-500 text-sm font-semibold mt-4 flex items-center gap-1">↑ 4% hoje</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Aguardando ACS</h3>
          <p className="text-5xl font-black text-slate-800">12</p>
          <p className="text-rose-500 text-sm font-semibold mt-4 flex items-center gap-1">Ação requerida</p>
        </div>
      </div>
    </div>
  );
}
