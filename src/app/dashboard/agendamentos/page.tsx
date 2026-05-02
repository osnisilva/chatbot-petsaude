import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export default async function AgendamentosPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return null;

  // 1. Obter Perfil do ACS Logado
  const { data: acs } = await supabase
    .from('acs')
    .select('id, ubs_id, ubs:ubs_id(name)')
    .eq('auth_user_id', session.user.id)
    .single();

  const isSecretaria = acs?.ubs?.name === 'Secretaria de Saúde';

  // 2. Buscar Pacientes elegíveis (Aqueles que têm comorbidades registradas)
  // Se for secretaria, vê todos com comorbidade. Se for ACS comum, só da sua UBS.
  let patientsQuery = supabase.from('patients').select('id, name, phone_number, comorbidities');
  
  if (!isSecretaria && acs) {
    patientsQuery = patientsQuery.eq('ubs_id', acs.ubs_id);
  }
  
  const { data: allPatients } = await patientsQuery;
  const eligiblePatients = (allPatients || []).filter(p => p.comorbidities && p.comorbidities.length > 0);

  // 3. Buscar Templates da Biblioteca
  const { data: templates } = await supabase.from('health_templates').select('id, title, category');

  // 4. Buscar Agendamentos Ativos
  let schedulesQuery = supabase.from('scheduled_messages')
    .select(`
      id, frequency, next_run_at, status,
      patient:patient_id(name),
      template:template_id(title, category)
    `)
    .order('next_run_at', { ascending: true });

  if (!isSecretaria && acs) {
    schedulesQuery = schedulesQuery.eq('acs_id', acs.id);
  }

  const { data: schedules } = await schedulesQuery;

  // -----------------------------------------------------
  // Ação de Servidor: Salvar Agendamento
  // -----------------------------------------------------
  async function createSchedule(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const acsProfile = await supabase.from('acs').select('id').eq('auth_user_id', session.user.id).single();

    const patient_id = formData.get('patient_id');
    const template_id = formData.get('template_id');
    const frequency = formData.get('frequency');
    const next_run_at = new Date().toISOString(); // Começa agendado pra agora/hoje

    await supabase.from('scheduled_messages').insert({
      acs_id: acsProfile.data?.id,
      patient_id,
      template_id,
      frequency,
      next_run_at,
      status: 'active'
    });

    revalidatePath('/dashboard/agendamentos');
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Agendamento de Campanhas</h1>
          <p className="text-slate-500 mt-2">Programe trilhas de cuidado para seus pacientes com comorbidades.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Criação */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit">
          <h2 className="font-bold text-lg text-slate-800 mb-4">Novo Agendamento</h2>
          
          <form action={createSchedule} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Paciente (Apenas com Comorbidades)</label>
              <select name="patient_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium">
                <option value="">Selecione o paciente...</option>
                {eligiblePatients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.comorbidities?.join(', ')})</option>
                ))}
              </select>
              {eligiblePatients.length === 0 && (
                <p className="text-xs text-rose-500 mt-2">Nenhum paciente com comorbidade cadastrada na sua UBS.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Template (Biblioteca)</label>
              <select name="template_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium">
                <option value="">Selecione a mensagem...</option>
                {templates?.map(t => (
                  <option key={t.id} value={t.id}>{t.category.toUpperCase()} - {t.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Frequência de Envio</label>
              <select name="frequency" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium">
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={eligiblePatients.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-2xl shadow-sm transition-colors mt-2"
            >
              Programar Envio
            </button>
          </form>
        </div>

        {/* Lista de Agendamentos */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-lg text-slate-800 mb-4">Campanhas Ativas</h2>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">Paciente</th>
                  <th className="p-4 font-bold">Campanha (Assunto)</th>
                  <th className="p-4 font-bold">Frequência</th>
                  <th className="p-4 font-bold">Próximo Envio</th>
                  <th className="p-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules && schedules.length > 0 ? (
                  schedules.map(schedule => (
                    <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{schedule.patient?.name}</td>
                      <td className="p-4 text-slate-600 font-medium">{schedule.template?.title}</td>
                      <td className="p-4">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-lg font-bold capitalize">
                          {schedule.frequency}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                        {new Date(schedule.next_run_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-lg font-bold">
                          Ativo
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                      Nenhuma campanha ativa no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
