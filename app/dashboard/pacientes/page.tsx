"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { updatePatientComorbidities } from './actions';

export default function PacientesPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [comorbiditiesInput, setComorbiditiesInput] = useState("");

  useEffect(() => {
    async function fetchPacientes() {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id, name, phone_number, cns_masked, lgpd_consent, comorbidities,
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

  const handleSaveComorbidities = async () => {
    if (!editingPatient) return;
    
    const list = comorbiditiesInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const result = await updatePatientComorbidities(editingPatient.id, list);
    
    if (result.success) {
      setPacientes(prev => prev.map(p => p.id === editingPatient.id ? { ...p, comorbidities: list } : p));
      setEditingPatient(null);
    } else {
      alert("Erro ao salvar: " + result.error);
    }
  };

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
                <th className="p-6 font-bold">Comorbidades</th>
                <th className="p-6 font-bold">WhatsApp</th>
                <th className="p-6 font-bold">Unidade (UBS)</th>
                <th className="p-6 font-bold">Ações</th>
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
                    <td className="p-6">
                      <div className="font-bold text-slate-700">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-tight">{p.cns_masked || 'CNS não informado'}</div>
                    </td>
                    <td className="p-6">
                      {p.comorbidities && p.comorbidities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.comorbidities.map((c: string, i: number) => (
                            <span key={i} className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">{c}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">Nenhuma</span>
                      )}
                    </td>
                    <td className="p-6 text-slate-500 font-medium">{p.phone_number}</td>
                    <td className="p-6 text-slate-500">{(p.ubs as any)?.name || '-'}</td>
                    <td className="p-6">
                      <button 
                        onClick={() => {
                          setEditingPatient(p);
                          setComorbiditiesInput(p.comorbidities?.join(', ') || "");
                        }}
                        className="text-emerald-600 hover:text-emerald-800 font-bold text-xs bg-emerald-50 px-3 py-2 rounded-xl transition-colors"
                      >
                        EDITAR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Simples de Edição */}
      {editingPatient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Editar Comorbidades</h2>
            <p className="text-slate-500 text-sm mb-6">Paciente: <span className="font-bold text-slate-700">{editingPatient.name}</span></p>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Comorbidades (separadas por vírgula)</label>
              <input 
                type="text"
                value={comorbiditiesInput}
                onChange={(e) => setComorbiditiesInput(e.target.value)}
                placeholder="Ex: Diabetes, Hipertensão"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 mt-2">Pacientes com comorbidades aparecem na aba de Agendamentos.</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingPatient(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-2xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveComorbidities}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl shadow-sm transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
