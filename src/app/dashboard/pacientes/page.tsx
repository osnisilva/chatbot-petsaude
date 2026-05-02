"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase para o frontend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PacientesPage() {
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
    <div className="p-8 h-full overflow-auto bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pacientes</h1>
          <p className="text-slate-500">Gerencie a base de dados do e-SUS</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
          <span>+</span> Novo Paciente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Nome</th>
                <th className="p-4 font-semibold">Telefone</th>
                <th className="p-4 font-semibold">CNS</th>
                <th className="p-4 font-semibold">UBS</th>
                <th className="p-4 font-semibold">LGPD</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Carregando dados...</td>
                </tr>
              ) : pacientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Nenhum paciente cadastrado.</td>
                </tr>
              ) : (
                pacientes.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{p.name}</td>
                    <td className="p-4 text-slate-600">{p.phone_number}</td>
                    <td className="p-4 text-slate-600">{p.cns_masked || '-'}</td>
                    <td className="p-4 text-slate-600">{p.ubs?.name || '-'}</td>
                    <td className="p-4">
                      {p.lgpd_consent === true && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Aceito</span>}
                      {p.lgpd_consent === false && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Recusado</span>}
                      {p.lgpd_consent === null && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">Pendente</span>}
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
