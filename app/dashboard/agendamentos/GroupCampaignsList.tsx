"use client";

import { deleteScheduleAction } from './actions';

interface GroupCampaignsListProps {
  schedules: any[];
}

export default function GroupCampaignsList({ schedules }: GroupCampaignsListProps) {
  
  const handleCancelGroupSchedule = async (scheduleId: string, groupName: string) => {
    if (confirm(`Deseja cancelar esta campanha do grupo "${groupName}"?`)) {
      const result = await deleteScheduleAction(scheduleId);
      if (!result.success) {
        alert(`Erro ao cancelar agendamento: ${result.error}`);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-xl text-slate-800">Campanhas de Grupo Ativas</h2>
        <span className="bg-teal-100 text-teal-700 text-xs px-3 py-1 rounded-full font-bold">
          {schedules.length} Campanhas Ativas
        </span>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <div className="text-3xl mb-3">📢</div>
          <p className="text-slate-500 font-medium">Nenhuma campanha programada para grupos no momento.</p>
          <p className="text-xs text-slate-400 mt-1">Crie uma nova programação para grupos utilizando o formulário lateral.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((camp: any) => {
            const groupName = camp.group?.name || 'Grupo Desconhecido';
            return (
              <div 
                key={camp.id} 
                className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="bg-teal-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                      Campanha em Grupo
                    </span>
                    <button
                      onClick={() => handleCancelGroupSchedule(camp.id, groupName)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1 hover:bg-rose-50 rounded-lg"
                      title="Cancelar campanha"
                    >
                      🗑️
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-slate-800 leading-tight mb-1">{groupName}</h3>
                  
                  <div className="text-xs text-slate-600 mt-3 space-y-1">
                    <p className="font-medium flex items-center gap-1.5 text-slate-700">
                      <span>Assunto:</span>
                      <span className="font-bold">
                        {camp.is_random ? `Trilha Randômica (${camp.category})` : camp.template?.title}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span>Frequência:</span>
                      <span className="font-bold capitalize">{camp.frequency}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span>Próximo envio:</span>
                      <span className="font-bold text-slate-800">
                        {new Date(camp.next_run_at).toLocaleDateString('pt-BR')} às {new Date(camp.next_run_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200/50 flex justify-between items-center">
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ativo no Bot
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
