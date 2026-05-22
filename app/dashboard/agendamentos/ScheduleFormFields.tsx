"use client";

import { useState } from 'react';

interface ScheduleFormFieldsProps {
  availablePatients: any[];
  availableGroups: any[];
  templates: any[];
}

export default function ScheduleFormFields({ availablePatients, availableGroups, templates }: ScheduleFormFieldsProps) {
  const [targetType, setTargetType] = useState<'patient' | 'group'>('patient');
  const [isRandom, setIsRandom] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Encontra a categoria do template selecionado para enviar ao backend
  const selectedCategory = templates.find(t => t.id === selectedTemplateId)?.category || '';

  return (
    <div className="space-y-4">
      <input type="hidden" name="is_random" value={isRandom.toString()} />
      <input type="hidden" name="category" value={selectedCategory} />

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

      <div className="bg-slate-50 p-1 rounded-2xl flex border border-slate-200">
        <button 
          type="button"
          onClick={() => setIsRandom(false)}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${!isRandom ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
        >
          Enviar sempre esta
        </button>
        <button 
          type="button"
          onClick={() => setIsRandom(true)}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${isRandom ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
        >
          Variar (mesmo tema)
        </button>
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
    </div>
  );
}
