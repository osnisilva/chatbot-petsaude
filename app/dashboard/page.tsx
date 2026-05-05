import { createClient } from '@/utils/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Total de Pacientes
  const { count: totalPatients } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  // 2. Atendimentos IA (mensagens do bot hoje)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: messagesToday } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_type', 'bot')
    .gte('created_at', today.toISOString());

  // 3. Aguardando ACS (Transbordos)
  const { count: waitingAcs } = await supabase
    .from('chat_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'escalated');

  // 4. LGPD Stats
  const { data: lgpdData } = await supabase.from('patients').select('lgpd_consent');
  const lgpd = {
    aceito: lgpdData?.filter(p => p.lgpd_consent === true).length || 0,
    recusado: lgpdData?.filter(p => p.lgpd_consent === false).length || 0,
    pendente: lgpdData?.filter(p => p.lgpd_consent === null).length || 0,
    total: lgpdData?.length || 0
  };

  // 5. Comorbidades (Agregação simples)
  const { data: comorbData } = await supabase.from('patients').select('comorbidities');
  const comorbMap: Record<string, number> = {};
  comorbData?.forEach(p => {
    p.comorbidities?.forEach((c: string) => {
      comorbMap[c] = (comorbMap[c] || 0) + 1;
    });
  });
  const sortedComorb = Object.entries(comorbMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // 6. Agendamentos de Hoje
  const { count: scheduledToday } = await supabase
    .from('scheduled_messages')
    .select('*', { count: 'exact', head: true })
    .gte('next_run_at', today.toISOString())
    .lt('next_run_at', new Date(today.getTime() + 86400000).toISOString());

  // 7. Status do Bot (Última atividade)
  const { data: lastBotMsg } = await supabase
    .from('messages')
    .select('created_at')
    .eq('sender_type', 'bot')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const isBotOnline = lastBotMsg ? (new Date().getTime() - new Date(lastBotMsg.created_at).getTime() < 7200000) : false;

  return (
    <div className="p-4 md:p-10 h-full overflow-auto bg-[#F4F7F9]">
      {/* Header com Status do Sistema */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 md:mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 mt-2 text-base md:text-lg">Monitoramento em tempo real da rede de saúde.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 md:px-5 py-2 md:py-3 rounded-2xl shadow-sm border border-slate-100 w-full md:w-auto">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isBotOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
            <span className="text-sm font-bold text-slate-700">
                Status do Bot: {isBotOnline ? 'OPERACIONAL' : 'OFFLINE'}
            </span>
        </div>
      </div>
      
      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Pacientes na Base</h3>
          <p className="text-5xl font-black text-slate-800">{totalPatients || 0}</p>
          <div className="mt-4 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-lg">ATIVOS</span>
              <p className="text-slate-400 text-xs font-medium">Sincronizado com e-SUS</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Respostas da IA (Hoje)</h3>
          <p className="text-5xl font-black text-slate-800">{messagesToday || 0}</p>
          <div className="mt-4 flex items-center gap-2">
              <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-1 rounded-lg">ECONOMIA DE TEMPO</span>
              <p className="text-slate-400 text-xs font-medium">Atendimentos automatizados</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Aguardando ACS</h3>
          <p className="text-5xl font-black text-slate-800">{waitingAcs || 0}</p>
          <div className="mt-4 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${waitingAcs && waitingAcs > 0 ? 'bg-rose-100 text-rose-700 animate-bounce' : 'bg-slate-100 text-slate-500'}`}>
                  {waitingAcs && waitingAcs > 0 ? 'URGENTE' : 'ESTÁVEL'}
              </span>
              <p className="text-slate-400 text-xs font-medium">Solicitações de transbordo</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Painel de Comorbidades */}
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                🩺 Perfil de Comorbidades
            </h3>
            <div className="space-y-5">
                {sortedComorb.length > 0 ? sortedComorb.map(([name, count]) => (
                    <div key={name}>
                        <div className="flex justify-between text-sm font-bold mb-2">
                            <span className="capitalize text-slate-700">{name}</span>
                            <span className="text-slate-500">{count} pacientes</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full" 
                                style={{ width: `${(count / (totalPatients || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )) : (
                    <p className="text-slate-400 text-center py-10">Nenhum dado de comorbidade disponível.</p>
                )}
            </div>
        </div>

        {/* Painel LGPD e Agendamentos */}
        <div className="space-y-6">
            {/* LGPD */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <h3 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                    ⚖️ Conformidade LGPD
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-emerald-600">ACEITO</span>
                            <span>{lgpd.aceito}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${(lgpd.aceito / (lgpd.total || 1)) * 100}%` }}></div>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-amber-500">PENDENTE</span>
                            <span>{lgpd.pendente}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${(lgpd.pendente / (lgpd.total || 1)) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-rose-500">RECUSADO</span>
                            <span>{lgpd.recusado}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500" style={{ width: `${(lgpd.recusado / (lgpd.total || 1)) * 100}%` }}></div>
                        </div>
                    </div>
                    <div className="w-32 h-32 rounded-full border-[12px] border-slate-50 flex items-center justify-center relative">
                        <div className="text-center">
                            <p className="text-2xl font-black text-slate-800">{Math.round((lgpd.aceito / (lgpd.total || 1)) * 100)}%</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Seguro</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Próximos Disparos */}
            <div className="bg-gradient-to-br from-teal-600 to-emerald-700 p-8 rounded-3xl shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📅</div>
                <h3 className="text-xl font-bold mb-2">Trilhas de Cuidado</h3>
                <p className="text-teal-100 mb-6 text-sm">Mensagens automáticas programadas para hoje.</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-5xl font-black">{scheduledToday || 0}</p>
                        <p className="text-xs font-bold text-teal-100 mt-2 uppercase tracking-widest">Disparos Agendados</p>
                    </div>
                    <a href="/dashboard/agendamentos" className="bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-xs font-bold border border-white/20">
                        Ver detalhes →
                    </a>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
