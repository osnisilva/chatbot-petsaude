"use client";

import { useState } from 'react';

interface ScheduleFormFieldsProps {
  availablePatients: any[];
  availableGroups: any[];
  templates: any[];
}

export default function ScheduleFormFields({ availablePatients, availableGroups, templates }: ScheduleFormFieldsProps) {
  const [targetType, setTargetType] = useState<'patient' | 'group'>('patient');
  const [messageType, setMessageType] = useState<'template' | 'random' | 'custom'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('enfermagem');
  const [frequency, setFrequency] = useState('unica');

  // Encontra a categoria do template selecionado se for do tipo template
  const templateCategory = templates.find(t => t.id === selectedTemplateId)?.category || '';

  const categorias = [
    { value: 'enfermagem', label: 'Enfermagem' },
    { value: 'nutricao', label: 'Nutrição' },
    { value: 'educacao_fisica', label: 'Educação Física' },
    { value: 'psicologia', label: 'Psicologia' },
    { value: 'lembrete_medicamento', label: 'Lembrete de Medicamento' }
  ];

  // Quando muda o tipo de mensagem, ajusta a frequência recomendada
  const handleMessageTypeChange = (type: 'template' | 'random' | 'custom') => {
    setMessageType(type);
    if (type === 'custom') {
      setFrequency('unica');
    } else {
      setFrequency('semanal');
    }
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name="message_type" value={messageType} />
      <input type="hidden" name="category" value={messageType === 'random' ? selectedCategory : templateCategory} />

      {/* Target Type: Paciente ou Grupo */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Destinatário</label>
        <div className="bg-slate-50 p-1 rounded-2xl flex border border-slate-200 mb-2">
          <button 
            type="button"
            onClick={() => setTargetType('patient')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${targetType === 'patient' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
          >
            Paciente
          </button>
          <button 
            type="button"
            onClick={() => setTargetType('group')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${targetType === 'group' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
          >
            Grupo
          </button>
        </div>
      </div>

      {/* Seleção do Destinatário */}
      {targetType === 'patient' ? (
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

      {/* Tipo de Mensagem */}
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
          <button 
            type="button"
            onClick={() => handleMessageTypeChange('custom')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${messageType === 'custom' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
          >
            Personalizada
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

      {messageType === 'custom' && (
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
      )}

      {/* Programar Data e Hora do Envio */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
          Data e Hora do Envio (Opcional)
        </label>
        <input 
          type="datetime-local" 
          name="next_run_at" 
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium" 
        />
        <p className="text-[10px] text-slate-400 mt-1">Deixe em branco para disparar imediatamente.</p>
      </div>

      {/* Frequência */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Frequência</label>
        <select 
          name="frequency" 
          required 
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
        >
          <option value="unica">Envio Único (Disparo Pontual)</option>
          <option value="diario">Diário</option>
          <option value="semanal">Semanal</option>
          <option value="quinzenal">Quinzenal</option>
          <option value="mensal">Mensal</option>
        </select>
      </div>

      <button 
        type="submit" 
        disabled={availablePatients.length === 0 && targetType === 'patient'}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-2xl shadow-sm transition-colors mt-2"
      >
        Ativar Campanha / Trilha
      </button>
    </div>
  );
}
