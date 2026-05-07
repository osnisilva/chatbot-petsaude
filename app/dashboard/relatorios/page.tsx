"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import ComorbidityMap from './components/ComorbidityMap';
import DemographicChart from './components/DemographicChart';
import CarePathwayStats from './components/CarePathwayStats';

export default function RelatoriosPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'epi' | 'demo' | 'trilhas'>('epi');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [ubsList, setUbsList] = useState<any[]>([]);
  const [selectedUbs, setSelectedUbs] = useState<string>('');

  useEffect(() => {
    async function fetchFilterData() {
      const { data: ubs } = await supabase.from('ubs').select('id, name').order('name');
      if (ubs) setUbsList(ubs);
    }
    fetchFilterData();
  }, []);

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);
      
      // 1. Buscar Pacientes (para Epi e Demo)
      let patientsQuery = supabase.from('patients').select('*');
      if (selectedUbs) patientsQuery = patientsQuery.eq('ubs_id', selectedUbs);
      const { data: patients } = await patientsQuery;

      // 2. Buscar Dados de Trilhas
      let trailsQuery = supabase.from('messages').select('status, sender_type, created_at');
      // Nota: Filtro de UBS em mensagens precisaria de join, por enquanto pegamos geral ou filtramos no cliente se tivermos ubs_id em sessions
      const { data: messages } = await trailsQuery;

      setData({ patients: patients || [], messages: messages || [] });
      setLoading(false);
    }
    
    fetchReportData();
  }, [selectedUbs]);

  return (
    <div className="p-4 md:p-10 h-full overflow-auto bg-[#F4F7F9]">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Relatórios Estratégicos</h1>
          <p className="text-slate-500 mt-2 text-base md:text-lg">Inteligência de dados para gestão de saúde.</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <select 
            value={selectedUbs}
            onChange={(e) => setSelectedUbs(e.target.value)}
            className="w-full md:w-64 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          >
            <option value="">Todas as Unidades</option>
            {ubsList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('epi')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'epi' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          🩺 Epidemiológico
        </button>
        <button 
          onClick={() => setActiveTab('demo')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'demo' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          👥 Demográfico
        </button>
        <button 
          onClick={() => setActiveTab('trilhas')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'trilhas' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          📈 Trilhas de Cuidado
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 font-bold animate-pulse">
            Processando inteligência de dados...
        </div>
      ) : (
        <div className="space-y-10">
          {activeTab === 'epi' && <ComorbidityMap patients={data.patients} />}
          {activeTab === 'demo' && <DemographicChart patients={data.patients} />}
          {activeTab === 'trilhas' && <CarePathwayStats messages={data.messages} />}
        </div>
      )}
    </div>
  );
}
