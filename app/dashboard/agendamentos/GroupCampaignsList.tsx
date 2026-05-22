"use client";

import { useState } from 'react';
import { deleteScheduleAction, editScheduleDateAction } from './actions';
import { Edit2, Trash2, Check, X } from 'lucide-react';

interface GroupCampaignsListProps {
  schedules: any[];
  isManager?: boolean;
}

export default function GroupCampaignsList({ schedules, isManager }: GroupCampaignsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleCancelGroupSchedule = async (scheduleId: string, groupName: string) => {
    if (confirm(`Deseja cancelar esta campanha do grupo "${groupName}"?`)) {
      const result = await deleteScheduleAction(scheduleId);
      if (!result.success) {
        alert(`Erro ao cancelar agendamento: ${result.error}`);
      }
    }
  };

  const handleStartEdit = (schedule: any) => {
    setEditingId(schedule.id);
    // Para preencher o input datetime-local com a data atual formatada: YYYY-MM-DDTHH:mm
    // O next_run_at já está em UTC. Precisamos formatar em tempo local para o input
    const d = new Date(schedule.next_run_at);
    // Cria string YYYY-MM-DDTHH:mm usando métodos get locais
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setEditDate(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const handleSaveEdit = async (scheduleId: string) => {
    if (!editDate) return;
    setIsSaving(true);
    const result = await editScheduleDateAction(scheduleId, editDate);
    setIsSaving(false);
    if (result.success) {
      setEditingId(null);
    } else {
      alert(`Erro ao editar agendamento: ${result.error}`);
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
                    {new Date(camp.next_run_at).getTime() < new Date().getTime() ? (
                      <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase shadow-sm">
                        Campanha Finalizada / Vencida
                      </span>
                    ) : (
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase shadow-sm">
                        Campanha Agendada
                      </span>
                    )}
                    {isManager && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(camp)}
                          className="text-slate-300 hover:text-indigo-500 transition-colors p-1.5 hover:bg-indigo-50 rounded-lg"
                          title="Editar data/hora"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancelGroupSchedule(camp.id, groupName)}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 hover:bg-rose-50 rounded-lg"
                          title="Cancelar campanha"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-slate-800 leading-tight mb-1">{groupName}</h3>
                  <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md mb-2">
                    {camp.group?.patient_group_members?.[0]?.count || 0} Pacientes
                  </span>
                  
                  <div className="text-xs text-slate-600 mt-2 space-y-1">
                    <p className="font-medium flex items-center gap-1.5 text-slate-700">
                      <span>Assunto:</span>
                      <span className="font-bold">
                        {camp.custom_title || camp.template?.title || (camp.is_random ? `Trilha Randômica (${camp.category})` : 'Campanha')}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span>Frequência:</span>
                      <span className="font-bold capitalize">{camp.frequency}</span>
                    </p>
                    <div className="flex items-start gap-1.5">
                      <span>Próximo envio:</span>
                      {editingId === camp.id ? (
                        <div className="flex flex-col gap-2 w-full mt-1">
                          <input 
                            type="datetime-local" 
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full text-xs p-1.5 border border-indigo-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <div className="flex gap-1 justify-end">
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => handleSaveEdit(camp.id)}
                              disabled={isSaving}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 rounded-md transition-colors flex items-center gap-1"
                            >
                              {isSaving ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-800">
                          {new Date(camp.next_run_at).toLocaleDateString('pt-BR')} às {new Date(camp.next_run_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm relative overflow-hidden">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Prévia da Mensagem</span>
                    <p className="text-xs text-slate-600 italic line-clamp-3 leading-relaxed">
                      {camp.is_random 
                        ? "✨ O conteúdo será criado dinamicamente e personalizado pela IA no momento do envio." 
                        : (camp.custom_content || camp.template?.content || "Nenhum conteúdo definido.")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200/50 flex justify-between items-center">
                  {new Date(camp.next_run_at).getTime() < new Date().getTime() ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-bold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      Processada pelo Bot
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Aguardando Bot
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
