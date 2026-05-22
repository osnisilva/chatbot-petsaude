"use client";

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, Filter, Heart } from 'lucide-react';
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

  // Estados específicos para a Busca Ativa
  const [buscaAtivaEnabled, setBuscaAtivaEnabled] = useState(false);
  const [selectedComorbidade, setSelectedComorbidade] = useState('all');
  const [semContatoPeriod, setSemContatoPeriod] = useState('30'); // '15', '30', '60', 'never'

  // Estados para seleção em lote e grupos
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<string>('');
  const [batchAdding, setBatchAdding] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Obter sessão e perfil do usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('acs')
          .select('role, ubs_id')
          .eq('auth_user_id', session.user.id)
          .single();
        if (profile) {
          setUserRole(profile.role);
          
          // Buscar grupos da UBS do ACS logado
          if (profile.ubs_id) {
            const { data: groupsData } = await supabase
              .from('patient_groups')
              .select('id, name')
              .eq('ubs_id', profile.ubs_id)
              .order('name');
            if (groupsData) {
              setGroupsList(groupsData);
            }
          }
        }
      }

      // Buscar pacientes com sessões de chat incluídas para calcular último contato
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id, name, phone_number, cns_masked, lgpd_consent, comorbidities,
          ubs:ubs_id (id, name),
          chat_sessions (updated_at, status)
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

      // Verificar parâmetros na URL para ativar Busca Ativa e filtrar por UBS
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('buscaAtiva') === 'true') {
          setBuscaAtivaEnabled(true);
        }
        const ubsIdFromUrl = urlParams.get('ubsId');
        if (ubsIdFromUrl) {
          setSelectedUbs(ubsIdFromUrl);
        }
      }

      setLoading(false);
    }
    
    fetchData();
  }, []);

  // Helper para obter informações de inatividade
  const getDiasSemContato = (paciente: any) => {
    const sessions = paciente.chat_sessions;
    if (!sessions || sessions.length === 0) return null;
    
    const timestamps = sessions.map((s: any) => new Date(s.updated_at).getTime());
    const maxTimestamp = Math.max(...timestamps);
    
    const diffTime = Math.abs(new Date().getTime() - maxTimestamp);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      dias: diffDays,
      data: new Date(maxTimestamp).toLocaleDateString('pt-BR')
    };
  };

  // Mapeia todas as comorbidades exclusivas dos pacientes para preencher o filtro
  const uniqueComorbidades = useMemo(() => {
    const set = new Set<string>();
    pacientes.forEach(p => {
      p.comorbidities?.forEach((c: string) => {
        if (c) set.add(c);
      });
    });
    return Array.from(set).sort();
  }, [pacientes]);

  const filteredPacientes = useMemo(() => {
    return pacientes.filter((p) => {
      const matchesSearch = 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.cns_masked?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesUbs = 
        selectedUbs === 'all' || 
        (p.ubs as any)?.id === selectedUbs;

      if (!matchesSearch || !matchesUbs) return false;

      // Filtros do Modo Busca Ativa
      if (buscaAtivaEnabled) {
        // 1. Deve ter pelo menos uma comorbidade
        if (!p.comorbidities || p.comorbidities.length === 0) return false;

        // 2. Filtrar por comorbidade específica se selecionada
        if (selectedComorbidade !== 'all' && !p.comorbidities.includes(selectedComorbidade)) {
          return false;
        }

        // 3. Filtrar por período de inatividade
        const contato = getDiasSemContato(p);
        if (semContatoPeriod === 'never') {
          return contato === null; // Nunca contatado
        } else {
          const limitDays = parseInt(semContatoPeriod, 10);
          if (contato === null) {
            return true; // Quem nunca foi contatado entra em qualquer período de inatividade
          }
          return contato.dias >= limitDays;
        }
      }

      return true;
    });
  }, [pacientes, searchTerm, selectedUbs, buscaAtivaEnabled, selectedComorbidade, semContatoPeriod]);

  // Função para adicionar pacientes selecionados ao grupo em lote
  const handleBatchAddToGroup = async () => {
    if (!selectedTargetGroupId || selectedPatientIds.length === 0) return;
    setBatchAdding(true);

    try {
      const { addMembersToGroupAction } = await import('../grupos/actions');
      const result = await addMembersToGroupAction(selectedTargetGroupId, selectedPatientIds);

      if (result.success) {
        const groupName = groupsList.find(g => g.id === selectedTargetGroupId)?.name || 'grupo';
        alert(`${result.count} paciente(s) adicionado(s) com sucesso ao grupo "${groupName}".`);
        setSelectedPatientIds([]);
        setSelectedTargetGroupId('');
      } else {
        alert(`Erro ao adicionar pacientes: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Ocorreu um erro: ${err.message}`);
    } finally {
      setBatchAdding(false);
    }
  };

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

          {userRole === 'admin_ti' && (
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

      {/* Painel Elegante de Busca Ativa */}
      <div className={`mb-8 p-6 rounded-3xl border transition-all duration-300 ${
        buscaAtivaEnabled 
          ? 'bg-gradient-to-br from-amber-500/10 to-rose-500/10 border-amber-200 shadow-[0_8px_30px_rgb(245,158,11,0.05)]' 
          : 'bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl transition-colors duration-300 ${
              buscaAtivaEnabled ? 'bg-gradient-to-br from-amber-500 to-rose-500 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              <Heart className={`h-6 w-6 ${buscaAtivaEnabled ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-slate-800">Módulo de Busca Ativa</h2>
              <p className="text-sm text-slate-500 font-medium">Localize pacientes crônicos sem contato recente no WhatsApp</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Modo Busca Ativa</span>
            <button
              onClick={() => setBuscaAtivaEnabled(!buscaAtivaEnabled)}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 ${
                buscaAtivaEnabled ? 'bg-gradient-to-r from-amber-500 to-rose-500 justify-end' : 'bg-slate-200 justify-start'
              }`}
              id="busca-ativa-toggle"
            >
              <span className="bg-white w-6 h-6 rounded-full shadow-md transition-all duration-300"></span>
            </button>
          </div>
        </div>

        {buscaAtivaEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-amber-200/30">
            {/* Seletor de Período Sem Contato */}
            <div className="space-y-2">
              <label className="text-xs font-black text-amber-800 uppercase tracking-widest block">Período Sem Contato</label>
              <select
                value={semContatoPeriod}
                onChange={(e) => setSemContatoPeriod(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-700 font-bold"
              >
                <option value="15">Mais de 15 dias</option>
                <option value="30">Mais de 30 dias (Recomendado)</option>
                <option value="60">Mais de 60 dias</option>
                <option value="never">Nunca Contatado</option>
              </select>
            </div>

            {/* Seletor de Comorbidade */}
            <div className="space-y-2">
              <label className="text-xs font-black text-amber-800 uppercase tracking-widest block">Filtrar Comorbidade</label>
              <select
                value={selectedComorbidade}
                onChange={(e) => setSelectedComorbidade(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-700 font-bold capitalize"
              >
                <option value="all">Todas as Comorbidades</option>
                {uniqueComorbidades.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            {/* Mini Resumo */}
            <div className="bg-white/60 border border-amber-200/40 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Atenção Necessária</p>
                <p className="text-2xl font-black text-amber-900 mt-1">{filteredPacientes.length} Pacientes</p>
              </div>
              <span className="text-3xl animate-bounce">🚨</span>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Ações em Lote */}
      {selectedPatientIds.length > 0 && (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <span className="bg-teal-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-sm">
              {selectedPatientIds.length}
            </span>
            <span className="text-sm font-bold text-teal-800">pacientes selecionados</span>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedTargetGroupId}
              onChange={(e) => setSelectedTargetGroupId(e.target.value)}
              className="px-4 py-2.5 bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-xs font-bold text-slate-700 w-full sm:w-56"
            >
              <option value="">Adicionar ao Grupo...</option>
              {groupsList.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            
            <button
              onClick={handleBatchAddToGroup}
              disabled={!selectedTargetGroupId || batchAdding}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 uppercase tracking-wider flex-shrink-0"
            >
              {batchAdding ? 'Adicionando...' : 'Confirmar'}
            </button>
            
            <button
              onClick={() => {
                setSelectedPatientIds([]);
                setSelectedTargetGroupId('');
              }}
              className="text-xs text-slate-500 hover:text-slate-700 font-bold px-2 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100">
                <th className="p-6 font-bold w-12">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                    checked={filteredPacientes.length > 0 && selectedPatientIds.length === filteredPacientes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPatientIds(filteredPacientes.map(p => p.id));
                      } else {
                        setSelectedPatientIds([]);
                      }
                    }}
                  />
                </th>
                <th className="p-6 font-bold">Nome Completo</th>
                <th className="p-6 font-bold">Comorbidades (e-SUS)</th>
                <th className="p-6 font-bold">WhatsApp</th>
                {buscaAtivaEnabled ? (
                  <>
                    <th className="p-6 font-bold">Inatividade</th>
                    <th className="p-6 font-bold text-right">Ação</th>
                  </>
                ) : (
                  <>
                    <th className="p-6 font-bold">Unidade (UBS)</th>
                    <th className="p-6 font-bold">Termo LGPD</th>
                  </>
                )}
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
                    {pacientes.length === 0 ? 'Nenhum paciente cadastrado.' : 'Nenhum paciente atende aos critérios de busca selecionados.'}
                  </td>
                </tr>
              ) : (
                filteredPacientes.map((p) => (
                  <tr 
                    key={p.id} 
                    className="border-b border-slate-50 hover:bg-teal-50/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/chat?patientId=${p.id}`)}
                  >
                    <td className="p-6 w-12" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                        checked={selectedPatientIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPatientIds(prev => [...prev, p.id]);
                          } else {
                            setSelectedPatientIds(prev => prev.filter(id => id !== p.id));
                          }
                        }}
                      />
                    </td>
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
                    
                    {buscaAtivaEnabled ? (
                      <>
                        <td className="p-6">
                          {(() => {
                            const contato = getDiasSemContato(p);
                            if (contato === null) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                                  Nunca Contatado
                                </span>
                              );
                            }
                            
                            // Cores de acordo com a gravidade da inatividade
                            let colorClass = 'bg-emerald-100 text-emerald-700';
                            let dotClass = 'bg-emerald-500';
                            if (contato.dias >= 60) {
                              colorClass = 'bg-rose-100 text-rose-700';
                              dotClass = 'bg-rose-500';
                            } else if (contato.dias >= 30) {
                              colorClass = 'bg-amber-100 text-amber-700';
                              dotClass = 'bg-amber-500';
                            }
                            
                            return (
                              <div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${colorClass} shadow-sm`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotClass} ${contato.dias >= 30 ? 'animate-pulse' : ''}`}></span>
                                  Há {contato.dias} {contato.dias === 1 ? 'dia' : 'dias'}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">Última msg: {contato.data}</p>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/dashboard/chat?patientId=${p.id}`)}
                            className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-rose-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg hover:from-amber-600 hover:to-rose-600 transition-all duration-300 uppercase tracking-wider"
                          >
                            <span>Chamar</span>
                            <span className="text-[10px]">→</span>
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-6 text-slate-500">{(p.ubs as any)?.name || '-'}</td>
                        <td className="p-6">
                          {p.lgpd_consent === true && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Aceito</span>}
                          {p.lgpd_consent === false && <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Recusado</span>}
                          {p.lgpd_consent === null && <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Pendente</span>}
                        </td>
                      </>
                    )}
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
