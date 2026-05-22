import { createClient } from '@/utils/supabase/server';
import PatientCard from './PatientCard';
import { createScheduleAction } from './actions';
import ScheduleFormFields from './ScheduleFormFields';
import GroupCampaignsList from './GroupCampaignsList';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ tab?: string }> | { tab?: string };
}

export default async function AgendamentosPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const tab = resolvedParams?.tab || 'individual';

  const supabase = await createClient();
  const { data: { user: session } } = await supabase.auth.getUser();
  
  if (!session) return null;

  // 1. Obter Perfil do ACS Logado
  const { data: acs } = await supabase
    .from('acs')
    .select('id, ubs_id, ubs:ubs_id(name)')
    .eq('auth_user_id', session.id)
    .single();

  const isSecretaria = (acs?.ubs as any)?.name === 'Secretaria de Saúde';

  // 2. Buscar Todos os Pacientes e Grupos
  let patientsQuery = supabase.from('patients').select('id, name, phone_number, comorbidities');
  let groupsQuery = supabase.from('patient_groups').select('id, name');
  
  if (!isSecretaria && acs?.ubs_id) {
    patientsQuery = patientsQuery.eq('ubs_id', acs.ubs_id);
    groupsQuery = groupsQuery.eq('ubs_id', acs.ubs_id);
  }
  
  const { data: allPatients } = await patientsQuery;
  const availablePatients = allPatients || [];

  const { data: allGroups } = await groupsQuery;
  const availableGroups = allGroups || [];

  // 3. Buscar Templates da Biblioteca
  const { data: templates } = await supabase.from('health_templates').select('id, title, category');

  // 4. Buscar Agendamentos Ativos (Individuais e de Grupo)
  let schedulesQuery = supabase.from('scheduled_messages')
    .select(`
      id, patient_id, group_id, frequency, next_run_at, status, is_random, category, custom_title, custom_content,
      patient:patient_id(name, comorbidities, ubs:ubs_id(name)),
      group:group_id(name, patient_group_members(count)),
      template:template_id(title, category, content)
    `)
    .order('next_run_at', { ascending: true });

  if (!isSecretaria && acs?.id) {
    schedulesQuery = schedulesQuery.eq('acs_id', acs.id);
  }

  const { data: schedules } = await schedulesQuery;

  // 5. Separar agendamentos individuais e de grupo
  const individualSchedules = (schedules || []).filter(s => s.patient_id !== null);
  const groupSchedules = (schedules || []).filter(s => s.group_id !== null);

  // 6. Agrupar Agendamentos Individuais por Paciente
  const groupedSchedules = individualSchedules.reduce((acc: any, s: any) => {
    const pId = s.patient_id;
    if (!acc[pId]) {
      acc[pId] = {
        patientName: (s.patient as any)?.name || 'Paciente Desconhecido',
        ubsName: (s.patient as any)?.ubs?.name || '-',
        comorbidities: (s.patient as any)?.comorbidities || [],
        campaigns: []
      };
    }
    acc[pId].campaigns.push(s);
    return acc;
  }, {});

  const patientIds = Object.keys(groupedSchedules);

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50/50">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Agendamentos e Campanhas</h1>
          <p className="text-slate-500 mt-2">Envie orientações de saúde personalizadas ou gerencie disparos coletivos da UBS.</p>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="flex border-b border-slate-200 mb-8" role="tablist" aria-label="Opções de Agendamento">
        <Link 
          href="/dashboard/agendamentos?tab=individual"
          role="tab"
          aria-selected={tab === 'individual'}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === 'individual' 
              ? 'border-emerald-600 text-emerald-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          👤 Acompanhamento Individual (Trilhas)
        </Link>
        <Link 
          href="/dashboard/agendamentos?tab=grupo"
          role="tab"
          aria-selected={tab === 'grupo'}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === 'grupo' 
              ? 'border-emerald-600 text-emerald-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          👥 Campanhas de Grupo (Lote)
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Formulário de Criação (Lateral) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-8">
            <h2 className="font-bold text-lg text-slate-800 mb-4">
              {tab === 'individual' ? 'Nova Trilha Individual' : 'Nova Campanha de Grupo'}
            </h2>
              <ScheduleFormFields 
                availablePatients={availablePatients} 
                availableGroups={availableGroups}
                templates={templates || []} 
                tab={tab}
              />
          </div>
        </div>

        {/* Lista de Campanhas */}
        <div className="lg:col-span-3 space-y-8">
          
          {tab === 'grupo' ? (
            /* Campanhas de Grupo */
            <GroupCampaignsList schedules={groupSchedules} />
          ) : (
            /* Pacientes Individuais */
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-xl text-slate-800">Trilhas Individuais Ativas</h2>
                <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold">
                  {patientIds.length} Pacientes Ativos
                </span>
              </div>

              {patientIds.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
                  <div className="text-4xl mb-4">📅</div>
                  <p className="text-slate-500 font-medium">Nenhum paciente com trilha individual ativa no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {patientIds.map(pId => {
                    const group = groupedSchedules[pId];
                    return (
                      <PatientCard 
                        key={pId}
                        patientId={pId}
                        patientName={group.patientName}
                        ubsName={group.ubsName}
                        comorbidities={group.comorbidities}
                        campaigns={group.campaigns}
                        templates={templates || []}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
