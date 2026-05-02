import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export default async function BibliotecaPage() {
  const supabase = await createClient();
  
  // Buscar templates
  const { data: templates } = await supabase
    .from('health_templates')
    .select(`*, acs:created_by(name)`)
    .order('created_at', { ascending: false });

  async function createTemplate(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return;

    const { data: acs } = await supabase.from('acs').select('id').eq('auth_user_id', session.user.id).single();

    await supabase.from('health_templates').insert({
      category: formData.get('category'),
      title: formData.get('title'),
      content: formData.get('content'),
      created_by: acs?.id
    });

    revalidatePath('/dashboard/biblioteca');
  }

  async function deleteTemplate(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = formData.get('id');
    if (!id) return;
    await supabase.from('health_templates').delete().eq('id', id);
    revalidatePath('/dashboard/biblioteca');
  }

  async function editTemplate(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = formData.get('id');
    if (!id) return;
    await supabase.from('health_templates').update({
      category: formData.get('category'),
      title: formData.get('title'),
      content: formData.get('content')
    }).eq('id', id);
    revalidatePath('/dashboard/biblioteca');
  }

  const categoryColors: Record<string, string> = {
    'nutricao': 'bg-orange-100 text-orange-700',
    'educacao_fisica': 'bg-blue-100 text-blue-700',
    'enfermagem': 'bg-rose-100 text-rose-700',
    'psicologia': 'bg-purple-100 text-purple-700',
    'lembrete_medicamento': 'bg-emerald-100 text-emerald-700'
  };

  const categoryNames: Record<string, string> = {
    'nutricao': '🍎 Nutrição',
    'educacao_fisica': '🏃‍♂️ Educação Física',
    'enfermagem': '🩺 Enfermagem',
    'psicologia': '🧠 Psicologia',
    'lembrete_medicamento': '💊 Lembrete de Medicamento'
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Biblioteca de Saúde</h1>
          <p className="text-slate-500 mt-2">Mensagens padrão da equipe multidisciplinar.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Criação */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit">
          <h2 className="font-bold text-lg text-slate-800 mb-4">Novo Template</h2>
          <form action={createTemplate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
              <select name="category" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium appearance-none">
                <option value="nutricao">Nutrição</option>
                <option value="educacao_fisica">Educação Física</option>
                <option value="enfermagem">Enfermagem</option>
                <option value="psicologia">Psicologia</option>
                <option value="lembrete_medicamento">Lembrete de Medicamento</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Título (Assunto)</label>
              <input type="text" name="title" required placeholder="Ex: Benefícios da Caminhada" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mensagem (Corpo do WhatsApp)</label>
              <textarea name="content" required rows={5} placeholder="Escreva a mensagem que o paciente irá receber..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium resize-none"></textarea>
            </div>
            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-2xl shadow-sm transition-colors mt-2">
              Salvar na Biblioteca
            </button>
          </form>
        </div>

        {/* Lista de Templates */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-lg text-slate-800 mb-4">Templates Disponíveis</h2>
          {templates && templates.length > 0 ? (
            templates.map(template => (
              <div key={template.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-3 group relative overflow-hidden">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   {/* O botão de Editar poderia abrir um modal, por simplicidade estamos apenas usando o botão Delete por enquanto, ou podemos usar Client Components depois */}
                   <form action={deleteTemplate}>
                      <input type="hidden" name="id" value={template.id} />
                      <button type="submit" title="Excluir Template" className="bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 p-2 rounded-xl shadow-sm transition-all">
                        🗑️
                      </button>
                   </form>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-bold ${categoryColors[template.category]}`}>
                    {categoryNames[template.category]}
                  </span>
                  <span className="text-xs text-slate-400 font-medium mr-10">
                    Autor: {template.acs?.name || 'Sistema'}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-slate-800">{template.title}</h3>
                <p className="text-slate-600 bg-slate-50 p-4 rounded-2xl text-sm whitespace-pre-wrap font-medium leading-relaxed border border-slate-100">
                  {template.content}
                </p>
              </div>
            ))
          ) : (
             <div className="text-center p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-300 text-slate-500 font-medium">
                Nenhum template cadastrado ainda. Crie o primeiro ao lado!
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
