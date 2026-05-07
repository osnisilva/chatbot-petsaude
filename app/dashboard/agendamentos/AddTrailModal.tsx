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

  async function handleSubmit(formData: FormData) {
    setLoading(true);
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
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Adicionar Trilha</h2>
        <p className="text-slate-500 text-sm mb-6">Paciente: <span className="font-bold text-slate-700">{patientName}</span></p>
        
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="patient_id" value={patientId} />
          
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
