export default function DashboardPage() {
  return (
    <div className="p-8 h-full overflow-auto bg-slate-50">
      <h1 className="text-3xl font-bold mb-2 text-slate-800">Visão Geral</h1>
      <p className="text-slate-500 mb-8">Bem-vindo ao painel da Secretaria de Saúde. Aqui você acompanha o desempenho do robô.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-teal-500">
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wider">Pacientes Cadastrados</h3>
          <p className="text-4xl font-bold text-slate-800 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wider">Atendimentos Automáticos</h3>
          <p className="text-4xl font-bold text-slate-800 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wider">Transbordos Pendentes</h3>
          <p className="text-4xl font-bold text-slate-800 mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
