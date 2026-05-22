"use client";

import { useState, useEffect } from 'react';
import { createScheduleAction } from './actions';

interface ScheduleFormFieldsProps {
  availablePatients: any[];
  availableGroups: any[];
  templates: any[];
  tab: string; // 'individual' | 'grupo'
}

export default function ScheduleFormFields({ availablePatients, availableGroups, templates, tab }: ScheduleFormFieldsProps) {
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState<'template' | 'random' | 'custom'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('enfermagem');
  const [frequency, setFrequency] = useState('semanal');

  // Sincroniza os estados ao alternar as abas
  useEffect(() => {
    if (tab === 'individual') {
      setMessageType('template');
      setFrequency('semanal');
    } else {
      setMessageType('custom');
      setFrequency('unica');
    }
  }, [tab]);

  // Encontra a categoria do template selecionado se for do tipo template
  const templateCategory = templates.find(t => t.id === selectedTemplateId)?.category || '';

  const categorias = [
    { value: 'enfermagem', label: 'Enfermagem' },
    { value: 'nutricao', label: 'Nutrição' },
    { value: 'educacao_fisica', label: 'Educação Física' },
    { value: 'psicologia', label: 'Psicologia' },
    { value: 'lembrete_medicamento', label: 'Lembrete de Medicamento' }
  ];

  const handleMessageTypeChange = (type: 'template' | 'random' | 'custom') => {
    setMessageType(type);
    if (type === 'custom') {
      setFrequency('unica');
    } else {
      setFrequency('semanal');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createScheduleAction(formData);
    setLoading(false);
    
    if (result.success) {
      alert("Agendamento criado com sucesso!");
    } else {
      alert("Atenção: " + result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="message_type" value={messageType} />
      <input type="hidden" name="category" value={messageType === 'random' ? selectedCategory : templateCategory} />

      {/* Seleção do Destinatário (Paciente ou Grupo dependendo da Aba) */}
      {tab === 'individual' ? (
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Paciente</label>
          <select name="patient_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium">
            <option value="">Selecione...</option>
            {availablePatients.map(p => (
              <option key={p.id} value={p.id}>{p.name} {p.comorbidities?.length > 0 ? `(${p.comorbidities.join(', ')})` : ''}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Grupo de Saúde</label>
          <select name="group_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium">
            <option value="">Selecione...</option>
            {availableGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Configuração Condicional baseado na Aba */}
      {tab === 'individual' ? (
        <div className="space-y-4">
          {/* Tipo de Conteúdo de Mensagem para Individual */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Conteúdo da Mensagem</label>
            <div className="bg-slate-50 p-1 rounded-2xl flex border border-slate-200 mb-2">
              <button 
                type="button"
                onClick={() => handleMessageTypeChange('template')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${messageType === 'template' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
              >
                Biblioteca
              </button>
              <button 
                type="button"
                onClick={() => handleMessageTypeChange('random')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${messageType === 'random' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
              >
                Inteligente
              </button>
            </div>
          </div>

          {/* Renderização condicional do campo de Mensagem */}
          {messageType === 'template' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mensagem Referência</label>
              <select 
                name="template_id" 
                required 
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
              >
                <option value="">Selecione a mensagem...</option>
                {templates?.map(t => (
                  <option key={t.id} value={t.id}>{t.category.toUpperCase()} - {t.title}</option>
                ))}
              </select>
            </div>
          )}

          {messageType === 'random' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tema da Trilha</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
                >
                  {categorias.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  ✨ **Modo Inteligente:** O sistema variará as mensagens enviadas usando templates da categoria selecionada, avaliando comorbidades do paciente antes do envio.
                </p>
              </div>
            </div>
          )}

          {/* Frequência Individual */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Frequência</label>
            <select 
              name="frequency" 
              required 
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
            >
              <option value="diario">Diário</option>
              <option value="semanal">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Inputs de Mensagem Customizada para Grupo */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Assunto da Campanha</label>
              <input 
                type="text" 
                name="custom_title" 
                required
                placeholder="Ex: Campanha de Vacinação COVID/Gripe"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Texto da Mensagem</label>
              <textarea 
                name="custom_content" 
                required
                rows={4}
                placeholder="Digite a mensagem personalizada que será enviada para o WhatsApp..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
              />
            </div>
          </div>

          {/* Programar Data e Hora do Envio (Apenas para Grupo) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Data e Hora do Envio
            </label>
            <input 
              type="datetime-local" 
              name="next_run_at" 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium" 
            />
          </div>

          {/* Força Envio Único oculto para Grupo */}
          <input type="hidden" name="frequency" value="unica" />
        </div>
      )}

      <button 
        type="submit" 
        disabled={
          loading ||
          (tab === 'individual' && availablePatients.length === 0) ||
          (tab === 'grupo' && availableGroups.length === 0)
        }
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-2xl shadow-sm transition-colors mt-2"
      >
        {loading ? 'Aguarde...' : (tab === 'individual' ? 'Ativar Trilha de Cuidado' : 'Agendar / Disparar Campanha')}
      </button>
    </form>
  );
}

