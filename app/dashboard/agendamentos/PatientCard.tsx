"use client";

import { useState } from 'react';
import { deleteScheduleAction, deleteAllSchedulesForPatientAction } from './actions';
import AddTrailModal from './AddTrailModal';

interface PatientCardProps {
  patientId: string;
  patientName: string;
  ubsName: string;
  comorbidities: string[];
  campaigns: any[];
  templates: any[];
}

export default function PatientCard({ patientId, patientName, ubsName, comorbidities, campaigns, templates }: PatientCardProps) {
  const [showModal, setShowModal] = useState(false);

  // Pega as iniciais para o avatar
  const initials = patientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all relative group/card">
      <div className="flex gap-4 items-start mb-6">
        {/* Avatar com Iniciais */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-100 shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-800 leading-tight truncate">{patientName}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ubsName}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => setShowModal(true)}
                className="bg-slate-50 text-slate-400 hover:bg-emerald-600 hover:text-white p-2 rounded-xl transition-all flex items-center justify-center text-xs font-bold shadow-sm"
                title="Adicionar nova trilha"
              >
                ➕
              </button>
              <button 
                onClick={async () => {
                  if (confirm("Deseja realmente remover o paciente do acompanhamento? Todas as trilhas ativas dele serão canceladas.")) {
                    await deleteAllSchedulesForPatientAction(patientId);
                  }
                }}
                className="bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition-all flex items-center justify-center text-xs font-bold shadow-sm"
                title="Remover paciente do acompanhamento (Excluir todas as trilhas)"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Badges de Comorbidades */}
          {comorbidities && comorbidities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {comorbidities.map((c, idx) => (
                <span 
                  key={idx} 
                  className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Trilhas Ativas</p>
        {campaigns.map((camp: any) => (
          <div key={camp.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 group">
            <div className="flex-1 min-w-0 pr-4">
              <div className="font-bold text-sm text-slate-700 truncate flex items-center gap-1">
                {camp.is_random ? (
                  <>
                    <span className="text-emerald-600">✨</span> 
                    Trilha de {camp.category.charAt(0).toUpperCase() + camp.category.slice(1)}
                  </>
                ) : (
                  (camp.template as any)?.title
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold capitalize ${camp.is_random ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {camp.frequency}
                </span>
                <span className="text-[10px] text-slate-400">
                  Próximo: {new Date(camp.next_run_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button 
              onClick={async () => {
                if (confirm("Deseja cancelar esta trilha?")) {
                  await deleteScheduleAction(camp.id);
                }
              }}
              className="text-slate-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <AddTrailModal 
          patientId={patientId}
          patientName={patientName}
          templates={templates}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
