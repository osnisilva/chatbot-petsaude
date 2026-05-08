"use client";

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PacientesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUbs, setSelectedUbs] = useState('all');
  const [userRole, setUserRole] = useState('acs');
  const [ubsList, setUbsList] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      // Obter sessão e perfil do usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('acs')
          .select('role')
          .eq('auth_user_id', session.user.id)
          .single();
        if (profile) {
          setUserRole(profile.role);
        }
      }

      // Buscar pacientes
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id, name, phone_number, cns_masked, lgpd_consent, comorbidities,
          ubs:ubs_id (id, name)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPacientes(data);
      }

      // Buscar lista de UBS para o filtro
      const { data: ubsData } = await supabase
        .from('ubs')
        .select('id, name')
        .order('name');
      
      if (ubsData) {
        setUbsList(ubsData);
      }

      setLoading(false);
    }
    
    fetchData();
  }, []);

  const filteredPacientes = useMemo(() => {
    return pacientes.filter((p) => {
      const matchesSearch = 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.cns_masked?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesUbs = 
        selectedUbs === 'all' || 
        (p.ubs as any)?.id === selectedUbs;

      return matchesSearch && matchesUbs;
    });
  }, [pacientes, searchTerm, selectedUbs]);

  return (
    <div className="p-4 md:p-10 h-full overflow-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 md:mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Pacientes</h1>
          <p className="text-slate-500 mt-2 text-base md:text-lg">Base de dados unificada do e-SUS</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64 lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar por nome ou CPF..."
              className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm bg-white text-slate-700 font-medium placeholder-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {userRole === 'secretaria' && (
            <div className="relative w-full sm:w-48 lg:w-56">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-slate-400" />
              </div>
              <select
                className="pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm bg-white text-slate-700 appearance-none font-medium truncate"
                value={selectedUbs}
                onChange={(e) => setSelectedUbs(e.target.value)}
              >
                <option value="all">Todas as Unidades</option>
                {ubsList.map(ubs => (
                  <option key={ubs.id} value={ubs.id}>{ubs.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100">
                <th className="p-6 font-bold">Nome Completo</th>
                <th className="p-6 font-bold">Comorbidades (e-SUS)</th>
                <th className="p-6 font-bold">WhatsApp</th>
                <th className="p-6 font-bold">Unidade (UBS)</th>
                <th className="p-6 font-bold">Termo LGPD</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Carregando dados...</td>
                </tr>
              ) : filteredPacientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    {pacientes.length === 0 ? 'Nenhum paciente cadastrado.' : 'Nenhum paciente encontrado na pesquisa.'}
                  </td>
                </tr>
              ) : (
                filteredPacientes.map((p) => (
                  <tr 
                    key={p.id} 
                    className="border-b border-slate-50 hover:bg-teal-50/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/chat?patientId=${p.id}`)}
                  >
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
                        <span className="text-slate-300 text-xs italic">Nenhuma registrada</span>
                      )}
                    </td>
                    <td className="p-6 text-slate-500 font-medium">{p.phone_number}</td>
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
