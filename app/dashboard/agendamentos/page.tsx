import { createClient } from '@/utils/supabase/server';
import PatientCard from './PatientCard';
import { createScheduleAction } from './actions';
import ScheduleFormFields from './ScheduleFormFields';

export default async function AgendamentosPage() {
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

  // 2. Buscar Todos os Pacientes
  let patientsQuery = supabase.from('patients').select('id, name, phone_number, comorbidities');
  
  if (!isSecretaria && acs?.ubs_id) {
    patientsQuery = patientsQuery.eq('ubs_id', acs.ubs_id);
  }
  
  const { data: allPatients } = await patientsQuery;
  const availablePatients = allPatients || [];

  // 3. Buscar Templates da Biblioteca
  const { data: templates } = await supabase.from('health_templates').select('id, title, category');

  // 4. Buscar Agendamentos Ativos
  let schedulesQuery = supabase.from('scheduled_messages')
    .select(`
      id, patient_id, frequency, next_run_at, status, is_random, category,
      patient:patient_id(name, ubs:ubs_id(name)),
      template:template_id(title, category)
    `)
    .order('next_run_at', { ascending: true });

  if (!isSecretaria && acs?.id) {
    schedulesQuery = schedulesQuery.eq('acs_id', acs.id);
  }

  const { data: schedules } = await schedulesQuery;

  // 5. Agrupar Agendamentos por Paciente
  const groupedSchedules = (schedules || []).reduce((acc: any, s: any) => {
    const pId = s.patient_id;
    if (!acc[pId]) {
      acc[pId] = {
        patientName: (s.patient as any)?.name || 'Paciente Desconhecido',
        ubsName: (s.patient as any)?.ubs?.name || '-',
        campaigns: []
      };
    }
    acc[pId].campaigns.push(s);
    return acc;
  }, {});

  const patientIds = Object.keys(groupedSchedules);

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50/50">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Trilhas de Cuidado</h1>
          <p className="text-slate-500 mt-2">Gerencie as campanhas ativas e programe novos lembretes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Formulário de Criação (Lateral) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-8">
            <h2 className="font-bold text-lg text-slate-800 mb-4">Nova Programação</h2>
            <form action={createScheduleAction} className="space-y-4">
              <ScheduleFormFields availablePatients={availablePatients} templates={templates || []} />
            </form>
          </div>
        </div>

        {/* Lista de Cards Grouped by Patient */}
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-xl text-slate-800">Pacientes em Acompanhamento</h2>
            <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold">
              {patientIds.length} Pacientes Ativos
            </span>
          </div>

          {patientIds.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
              <div className="text-4xl mb-4">📅</div>
              <p className="text-slate-500 font-medium">Nenhum paciente com trilha ativa no momento.</p>
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
                    campaigns={group.campaigns}
                    templates={templates || []}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
