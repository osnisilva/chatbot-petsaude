import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import UbsFilter from './components/UbsFilter';
import PeriodFilter from './components/PeriodFilter';
import EngagementTable from './components/EngagementTable';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ubs?: string; period?: string }>;
}) {
  const supabase = await createClient();
  const { ubs: ubsParam, period } = await searchParams;

  // 1. Identificar usuário e permissões
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('acs')
    .select('role, ubs_id, ubs:ubs_id(name)')
    .eq('auth_user_id', session.user.id)
    .single();

  const isSecretaria = (profile?.ubs as any)?.name === 'Secretaria de Saúde';
  const isAdmin = profile?.role === 'admin_ti' || isSecretaria;
  const isManager = profile?.role === 'gerente' && !isSecretaria;
  
  // Definir qual UBS filtrar
  // Se for manager, sempre usa a dele. Se for admin, usa o param ou null (todos).
  let selectedUbsId = isManager ? profile.ubs_id : (ubsParam || null);

  // 2. Buscar Lista de UBS (apenas para Admin)
  let ubsList: any[] = [];
  if (isAdmin) {
    const { data } = await supabase.from('ubs').select('id, name').order('name');
    ubsList = data || [];
  }

  // --- QUERIES COM FILTRO ---
  
  // Helper para aplicar filtro de UBS
  const applyFilter = (query: any) => {
    if (selectedUbsId) {
      return query.eq('ubs_id', selectedUbsId);
    }
    return query;
  };

  // 1. Total de Pacientes
  const { count: totalPatients } = await applyFilter(
    supabase.from('patients').select('*', { count: 'exact', head: true })
  );

  // 2. Cálculo da Data Inicial com base no período
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let startDate = today;
  if (period === '7d') {
    startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30d') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Início deste mês
  } else if (period === 'all') {
    startDate = new Date(2020, 0, 1); // Data bem antiga
  }

  // Helper para filtro de UBS nas subqueries
  const patientUbsFilter = selectedUbsId ? supabase.from('patients').select('id').eq('ubs_id', selectedUbsId) : null;

  // 3. Fluxo de Mensagens (Enviadas e Recebidas no período)
  let sentQuery = supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('sender_type', ['bot', 'acs'])
    .gte('created_at', startDate.toISOString());
    
  let receivedQuery = supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_type', 'patient')
    .gte('created_at', startDate.toISOString());
  
  if (selectedUbsId) {
    const sessionsInUbs = supabase.from('chat_sessions').select('id').filter('patient_id', 'in', patientUbsFilter!);
    sentQuery = sentQuery.filter('session_id', 'in', sessionsInUbs);
    receivedQuery = receivedQuery.filter('session_id', 'in', sessionsInUbs);
  }
  
  const { count: messagesSent } = await sentQuery;
  const { count: messagesReceived } = await receivedQuery;
  const totalMessages = (messagesSent || 0) + (messagesReceived || 0);

  // 4. Aguardando ACS (Transbordos)
  let waitingQuery = supabase
    .from('chat_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'escalated');
  
  if (selectedUbsId) {
    waitingQuery = waitingQuery.filter('patient_id', 'in', 
        supabase.from('patients').select('id').eq('ubs_id', selectedUbsId)
    );
  }
  const { count: waitingAcs } = await waitingQuery;

  // 4. LGPD Stats
  let lgpdQuery = supabase.from('patients').select('lgpd_consent');
  if (selectedUbsId) lgpdQuery = lgpdQuery.eq('ubs_id', selectedUbsId);
  const { data: lgpdData } = await lgpdQuery;
  
  const lgpd = {
    aceito: lgpdData?.filter(p => p.lgpd_consent === true).length || 0,
    recusado: lgpdData?.filter(p => p.lgpd_consent === false).length || 0,
    pendente: lgpdData?.filter(p => p.lgpd_consent === null).length || 0,
    total: lgpdData?.length || 0
  };

  // 5. Comorbidades
  let comorbQuery = supabase.from('patients').select('comorbidities');
  if (selectedUbsId) comorbQuery = comorbQuery.eq('ubs_id', selectedUbsId);
  const { data: comorbData } = await comorbQuery;
  
  const comorbMap: Record<string, number> = {};
  comorbData?.forEach(p => {
    (p.comorbidities as string[] | null)?.forEach((c: string) => {
      comorbMap[c] = (comorbMap[c] || 0) + 1;
    });
  });
  const sortedComorb = Object.entries(comorbMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // 6. Agendamentos do Período
  let scheduledQuery = supabase
    .from('scheduled_messages')
    .select('*', { count: 'exact', head: true })
    .gte('next_run_at', startDate.toISOString());
    
  if (period !== 'all') {
    let endDate = new Date(today.getTime() + 86400000); // Fim de hoje
    if (period === '7d') endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    else if (period === '30d') endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
    
    scheduledQuery = scheduledQuery.lt('next_run_at', endDate.toISOString());
  }
  
  if (selectedUbsId) {
    scheduledQuery = scheduledQuery.filter('patient_id', 'in', 
        supabase.from('patients').select('id').eq('ubs_id', selectedUbsId)
    );
  }
  const { count: scheduledToday } = await scheduledQuery;

  // 7. Status do Bot (Última atividade)
  const { data: lastBotMsg } = await supabase
    .from('messages')
    .select('created_at')
    .eq('sender_type', 'bot')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const isBotOnline = lastBotMsg ? (new Date().getTime() - new Date(lastBotMsg.created_at).getTime() < 7200000) : false;

  // 7.5. Busca Ativa: Pacientes com comorbidades sem contato há mais de 30 dias (ou sem qualquer contato)
  let activeSearchQuery = supabase
    .from('patients')
    .select('id, comorbidities, chat_sessions(updated_at)');
  
  if (selectedUbsId) {
    activeSearchQuery = activeSearchQuery.eq('ubs_id', selectedUbsId);
  }
  
  const { data: activeSearchPatients } = await activeSearchQuery;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const countActiveSearch = activeSearchPatients?.filter(p => {
    // Deve possuir comorbidades
    if (!p.comorbidities || p.comorbidities.length === 0) return false;
    
    const sessions = p.chat_sessions as any[];
    // Se não tiver nenhuma sessão de chat, nunca foi contatado (busca ativa necessária)
    if (!sessions || sessions.length === 0) return true;
    
    // Pega a última atualização entre as sessões
    const lastUpdate = Math.max(...sessions.map(s => new Date(s.updated_at).getTime()));
    return lastUpdate < thirtyDaysAgo.getTime();
  }).length || 0;

  // 8. Dados de Engajamento por ACS (Apenas para Gestores)
  let engagementData: any[] = [];
  if (isAdmin || isManager) {
    // Pegar IDs de sessões que têm mensagens do Bot
    const { data: sessionsWithBot } = await supabase
      .from('messages')
      .select('session_id')
      .eq('sender_type', 'bot');
    
    const sessionIds = [...new Set(sessionsWithBot?.map(s => s.session_id) || [])];

    if (sessionIds.length > 0) {
      // Pegar IDs de pacientes dessas sessões
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('patient_id')
        .in('id', sessionIds);
      
      const patientIds = [...new Set(sessions?.map(s => s.patient_id) || [])];

      if (patientIds.length > 0) {
        let patientAcsQuery = supabase
          .from('patients')
          .select('id, acs:acs_id(id, name, ubs:ubs_id(name))')
          .not('acs_id', 'is', null)
          .in('id', patientIds);

        if (selectedUbsId) patientAcsQuery = patientAcsQuery.eq('ubs_id', selectedUbsId);

        const { data: patientsWithBot } = await patientAcsQuery;
        
        const engagementMap: Record<string, any> = {};
        patientsWithBot?.forEach(p => {
          if (!p.acs) return;
          const acs = (p.acs as any);
          if (!engagementMap[acs.id]) {
            engagementMap[acs.id] = {
              acs_id: acs.id,
              acs_name: acs.name,
              ubs_name: acs.ubs?.name || '-',
              bot_patients_count: 0
            };
          }
          engagementMap[acs.id].bot_patients_count++;
        });
        engagementData = Object.values(engagementMap).sort((a, b) => b.bot_patients_count - a.bot_patients_count);
      }
    }
  }

  return (
    <div className="p-4 md:p-10 h-full overflow-auto bg-[#F4F7F9]">
      {/* Header com Filtro e Status */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Visão Geral</h1>
          <div className="flex items-center gap-3">
             <p className="text-slate-500 text-base md:text-lg">Monitoramento em tempo real.</p>
             {isAdmin && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Gestor Central</span>}
             {isManager && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Gestão Local</span>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Componente de Filtro de UBS */}
            <UbsFilter 
                ubsList={ubsList} 
                currentUbsId={selectedUbsId}
                currentUbsName={(profile?.ubs as any)?.name}
                disabled={!isAdmin} 
            />

            {/* Componente de Filtro de Período */}
            <PeriodFilter currentPeriod={period || null} />

            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 w-full sm:w-auto">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isBotOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                    Bot: {isBotOnline ? 'OPERACIONAL' : 'OFFLINE'}
                </span>
            </div>
        </div>
      </div>
      
      {/* Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Fluxo de Mensagens</h3>
          <p className="text-5xl font-black text-slate-800">{totalMessages}</p>
          <div className="mt-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                  <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-md w-16 text-center">ENVIADAS</span>
                  <p className="text-slate-500 text-xs font-bold">{messagesSent || 0}</p>
              </div>
              <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md w-16 text-center">RECEBIDAS</span>
                  <p className="text-slate-500 text-xs font-bold">{messagesReceived || 0}</p>
              </div>
          </div>
        </div>

        <Link href="/dashboard/chat" className="block bg-white p-8 rounded-3xl shadow-[0_8px_30_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group cursor-pointer hover:border-rose-200 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-10 group-hover:scale-110 group-hover:bg-rose-100 transition-all duration-500"></div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 group-hover:text-rose-600 transition-colors">Em Atendimento</h3>
          <p className="text-5xl font-black text-slate-800">{waitingAcs || 0}</p>
          <div className="mt-4 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${waitingAcs && waitingAcs > 0 ? 'bg-rose-100 text-rose-700 animate-bounce' : 'bg-slate-100 text-slate-500'}`}>
                  {waitingAcs && waitingAcs > 0 ? 'URGENTE' : 'ESTÁVEL'}
              </span>
              <p className="text-slate-400 text-xs font-medium">Atendimentos manuais em andamento</p>
          </div>
        </Link>

        <Link href={`/dashboard/pacientes?buscaAtiva=true${selectedUbsId ? `&ubsId=${selectedUbsId}` : ''}`} className="block bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group cursor-pointer hover:border-amber-200 hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-50 to-rose-50 rounded-bl-full -z-10 group-hover:scale-110 transition-all duration-500"></div>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 group-hover:text-amber-600 transition-colors">Busca Ativa</h3>
          <p className="text-5xl font-black text-slate-800">{countActiveSearch}</p>
          <div className="mt-4 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${countActiveSearch > 0 ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                  {countActiveSearch > 0 ? 'PENDENTE' : 'EM DIA'}
              </span>
              <p className="text-slate-400 text-xs font-medium">Inativos há &gt;30 dias</p>
          </div>
        </Link>
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
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <span className="text-4xl mb-2">📊</span>
                        <p className="font-medium">Nenhum dado disponível nesta unidade.</p>
                    </div>
                )}
            </div>
        </div>

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
                <p className="text-teal-100 mb-6 text-sm">Mensagens automáticas programadas.</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-5xl font-black">{scheduledToday || 0}</p>
                        <p className="text-xs font-bold text-teal-100 mt-2 uppercase tracking-widest">Disparos Hoje</p>
                    </div>
                    <a href="/dashboard/agendamentos" className="bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-xs font-bold border border-white/20">
                        Ver detalhes →
                    </a>
                </div>
            </div>
        </div>
      </div>

      {/* Painel de Engajamento por Profissional (Apenas Admin/Gerente) */}
      {(isAdmin || isManager) && (
        <div className="mt-10">
          <EngagementTable 
            data={engagementData} 
            totalPatients={totalPatients || 0} 
          />
        </div>
      )}
    </div>
  );
}
