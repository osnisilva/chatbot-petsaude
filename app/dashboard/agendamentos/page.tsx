import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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

  // 2. Buscar Todos os Pacientes (Removido o filtro de comorbidade a pedido do usuário)
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
      id, patient_id, frequency, next_run_at, status,
      patient:patient_id(name),
      template:template_id(title, category)
    `)
    .order('next_run_at', { ascending: true });

  if (!isSecretaria && acs?.id) {
    schedulesQuery = schedulesQuery.eq('acs_id', acs.id);
  }

  const { data: schedules } = await schedulesQuery;

  // 5. Agrupar Agendamentos por Paciente para a visão em Cards
  const groupedSchedules = (schedules || []).reduce((acc: any, s: any) => {
    const pId = s.patient_id;
    if (!acc[pId]) {
      acc[pId] = {
        patientName: (s.patient as any)?.name || 'Paciente Desconhecido',
        campaigns: []
      };
    }
    acc[pId].campaigns.push(s);
    return acc;
  }, {});

  const patientIds = Object.keys(groupedSchedules);

  // -----------------------------------------------------
  // Ações de Servidor
  // -----------------------------------------------------
  async function createSchedule(formData: FormData) {
    "use server";
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const acsProfile = await supabase.from('acs').select('id').eq('auth_user_id', user.id).single();
      if (!acsProfile.data) throw new Error("Perfil ACS não encontrado");

      const patient_id = formData.get('patient_id');
      const template_id = formData.get('template_id');
      const frequency = formData.get('frequency');
      const next_run_at = new Date().toISOString();

      const { error } = await supabase.from('scheduled_messages').insert({
        acs_id: acsProfile.data.id,
        patient_id,
        template_id,
        frequency,
        next_run_at,
        status: 'active'
      });

      if (error) throw error;
      revalidatePath('/dashboard/agendamentos');
    } catch (err: any) {
      console.error('Erro ao criar agendamento:', err.message);
    }
  }

  async function deleteSchedule(formData: FormData) {
    "use server";
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const id = formData.get('schedule_id');
      if (!id) return;

      await supabase.from('scheduled_messages').delete().eq('id', id);
      revalidatePath('/dashboard/agendamentos');
    } catch (err: any) {
      console.error('Erro ao excluir agendamento:', err.message);
    }
  }

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
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-0">
            <h2 className="font-bold text-lg text-slate-800 mb-4">Nova Programação</h2>
            <form action={createSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Paciente</label>
                <select name="patient_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium">
                  <option value="">Selecione...</option>
                  {availablePatients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.comorbidities?.length > 0 ? `(${p.comorbidities.join(', ')})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Template</label>
                <select name="template_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium">
                  <option value="">Selecione a mensagem...</option>
                  {templates?.map(t => (
                    <option key={t.id} value={t.id}>{t.category.toUpperCase()} - {t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Frequência</label>
                <select name="frequency" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium">
                  <option value="diario">Diário</option>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={availablePatients.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-2xl shadow-sm transition-colors mt-2"
              >
                Ativar Trilha
              </button>
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
                  <div key={pId} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{group.patientName}</h3>
                        <p className="text-xs text-slate-400 font-mono">ID: {pId.substring(0, 8)}...</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl">
                        👤
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Trilhas Ativas</p>
                      {group.campaigns.map((camp: any) => (
                        <div key={camp.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 group">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="font-bold text-sm text-slate-700 truncate">{(camp.template as any)?.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-bold capitalize">
                                {camp.frequency}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Próximo: {new Date(camp.next_run_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <form action={deleteSchedule}>
                            <input type="hidden" name="schedule_id" value={camp.id} />
                            <button type="submit" className="text-slate-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl">
                              🗑️
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
