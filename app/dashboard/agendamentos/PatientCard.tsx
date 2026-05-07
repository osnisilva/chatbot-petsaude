"use client";

import { useState } from 'react';
import { deleteScheduleAction } from './actions';
import AddTrailModal from './AddTrailModal';

interface PatientCardProps {
  patientId: string;
  patientName: string;
  campaigns: any[];
  templates: any[];
}

export default function PatientCard({ patientId, patientName, campaigns, templates }: PatientCardProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-slate-800">{patientName}</h3>
          <p className="text-xs text-slate-400 font-mono">ID: {patientId.substring(0, 8)}...</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
          title="Adicionar nova trilha"
        >
          <span>➕</span>
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Trilhas Ativas</p>
        {campaigns.map((camp: any) => (
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
