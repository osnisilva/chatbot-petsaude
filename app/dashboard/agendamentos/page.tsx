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

  // 2. Buscar Pacientes elegíveis (Aqueles que têm comorbidades registradas)
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
      id, frequency, next_run_at, status,
      patient:patient_id(name),
      template:template_id(title, category)
    `)
    .order('next_run_at', { ascending: true });

  if (!isSecretaria && acs?.id) {
    schedulesQuery = schedulesQuery.eq('acs_id', acs.id);
  }

  const { data: schedules } = await schedulesQuery;

  // -----------------------------------------------------
  // Ação de Servidor: Salvar Agendamento
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
      // Como é Server Action em RSC, o log vai para o terminal do servidor.
      // Em uma aplicação real, poderíamos usar useFormState para mostrar o erro na UI.
    }
  }

  // -----------------------------------------------------
  // Ação de Servidor: Excluir/Cancelar Agendamento
  // -----------------------------------------------------
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
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Agendamento de Campanhas</h1>
          <p className="text-slate-500 mt-2">Programe trilhas de cuidado para seus pacientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Criação */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit">
          <h2 className="font-bold text-lg text-slate-800 mb-4">Novo Agendamento</h2>
          
          <form action={createSchedule} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Paciente</label>
              <select name="patient_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium">
                <option value="">Selecione o paciente...</option>
                {availablePatients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.comorbidities?.length > 0 ? `(${p.comorbidities.join(', ')})` : ''}</option>
                ))}
              </select>
              {availablePatients.length === 0 && (
                <p className="text-xs text-rose-500 mt-2">Nenhum paciente cadastrado na sua UBS.</p>
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
              disabled={availablePatients.length === 0}
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
                  <th className="p-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules && schedules.length > 0 ? (
                  schedules.map(schedule => (
                    <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{(schedule.patient as any)?.name}</td>
                      <td className="p-4 text-slate-600 font-medium">{(schedule.template as any)?.title}</td>
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
                      <td className="p-4 text-right">
                        <form action={deleteSchedule}>
                          <input type="hidden" name="schedule_id" value={schedule.id} />
                          <button type="submit" title="Cancelar Campanha" className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50">
                            🗑️
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
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
