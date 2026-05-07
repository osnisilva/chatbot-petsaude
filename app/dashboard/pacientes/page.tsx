"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function PacientesPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPacientes() {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id, name, phone_number, cns_masked, lgpd_consent,
          ubs:ubs_id (name)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPacientes(data);
      }
      setLoading(false);
    }
    
    fetchPacientes();
  }, []);

  return (
    <div className="p-4 md:p-10 h-full overflow-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Pacientes</h1>
          <p className="text-slate-500 mt-2 text-base md:text-lg">Base de dados unificada do e-SUS</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100">
                <th className="p-6 font-bold">Nome Completo</th>
                <th className="p-6 font-bold">WhatsApp</th>
                <th className="p-6 font-bold">CNS</th>
                <th className="p-6 font-bold">Unidade (UBS)</th>
                <th className="p-6 font-bold">Termo LGPD</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Carregando dados...</td>
                </tr>
              ) : pacientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Nenhum paciente cadastrado.</td>
                </tr>
              ) : (
                pacientes.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-teal-50/30 transition-colors">
                    <td className="p-6 font-bold text-slate-700">{p.name}</td>
                    <td className="p-6 text-slate-500 font-medium">{p.phone_number}</td>
                    <td className="p-6 text-slate-400 font-mono text-sm">{p.cns_masked || '-'}</td>
                    <td className="p-6 text-slate-500">{(p.ubs as any)?.name || '-'}</td>
                    <td className="p-6">
                      {p.lgpd_consent === true && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Aceito</span>}
                      {p.lgpd_consent === false && <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Recusado</span>}
                      {p.lgpd_consent === null && <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Pendente</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
