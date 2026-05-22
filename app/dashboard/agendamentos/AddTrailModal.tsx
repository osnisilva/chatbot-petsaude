"use client";

import { useState } from 'react';
import { createScheduleAction } from './actions';

interface AddTrailModalProps {
  patientId: string;
  patientName: string;
  templates: any[];
  onClose: () => void;
}

export default function AddTrailModal({ patientId, patientName, templates, onClose }: AddTrailModalProps) {
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState<'template' | 'random' | 'custom'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('enfermagem');
  const [frequency, setFrequency] = useState('unica');

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

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    formData.append('message_type', messageType);
    formData.append('category', messageType === 'random' ? selectedCategory : templateCategory);
    formData.append('frequency', frequency);

    const result = await createScheduleAction(formData);
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      alert("Erro ao adicionar trilha: " + result.error);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Adicionar Trilha / Campanha</h2>
        <p className="text-slate-500 text-sm mb-6">Paciente: <span className="font-bold text-slate-700">{patientName}</span></p>
        
        <form action={handleSubmit} className="space-y-6">
          <input type="hidden" name="patient_id" value={patientId} />
          
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mensagem Referência (Assunto)</label>
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
                  ✨ **Modo Inteligente Ativado:** O sistema enviará mensagens variadas da mesma categoria escolhida, usando IA para validar a segurança física do paciente.
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

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-2xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-2xl shadow-sm transition-colors"
            >
              {loading ? "Salvando..." : "Ativar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
