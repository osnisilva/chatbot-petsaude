"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Users, Plus, Trash2, UserMinus, Search, AlertCircle, Calendar } from 'lucide-react';
import { createGroupAction, deleteGroupAction, removeMemberFromGroupAction } from './actions';

export default function GruposPage() {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState('acs');
  const [ubsId, setUbsId] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados do formulário de criação
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do grupo selecionado
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  useEffect(() => {
    setMounted(true);
    async function fetchInitialData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile, error: profileError } = await supabase
          .from('acs')
          .select('role, ubs_id')
          .eq('auth_user_id', session.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("Não foi possível carregar seu perfil de agente comunitário");
        }

        setUserRole(profile.role);
        setUbsId(profile.ubs_id);

        await fetchGroups(profile.ubs_id);
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // Buscar todos os grupos da UBS
  async function fetchGroups(currentUbsId: string) {
    const { data, error } = await supabase
      .from('patient_groups')
      .select(`
        id, 
        name, 
        description, 
        created_at,
        patient_group_members(count)
      `)
      .eq('ubs_id', currentUbsId)
      .order('name');

    if (error) {
      console.error("Erro ao buscar grupos:", error.message);
    } else if (data) {
      const formattedGroups = data.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        created_at: g.created_at,
        memberCount: g.patient_group_members?.[0]?.count || 0
      }));
      setGrupos(formattedGroups);
    }
  }

  // Buscar membros de um grupo selecionado
  async function fetchMembers(groupId: string) {
    setLoadingMembers(true);
    setErrorMsg(null);
    const { data, error } = await supabase
      .from('patient_group_members')
      .select(`
        patient:patient_id (
          id, 
          name, 
          phone_number, 
          comorbidities, 
          cns_masked
        )
      `)
      .eq('group_id', groupId);

    if (error) {
      console.error("Erro ao buscar membros:", error.message);
      setErrorMsg(`Erro ao carregar membros do grupo: ${error.message}`);
    } else if (data) {
      const formattedMembers = data
        .map((m: any) => m.patient)
        .filter((p: any) => p !== null);
      setMembers(formattedMembers);
    }
    setLoadingMembers(false);
  }

  // Selecionar um grupo para ver os detalhes
  const handleSelectGroup = async (grupo: any) => {
    setSelectedGroup(grupo);
    await fetchMembers(grupo.id);
  };

  // Submeter formulário de criação
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !ubsId) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('name', newName);
    formData.append('description', newDescription);

    const result = await createGroupAction(formData);

    if (result.success) {
      setNewName('');
      setNewDescription('');
      setSuccessMsg('Grupo de saúde criado com sucesso!');
      await fetchGroups(ubsId);
    } else {
      setErrorMsg(result.error || 'Erro ao criar grupo');
    }
    setIsSubmitting(false);
  };

  // Excluir grupo
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Deseja realmente excluir o grupo "${groupName}"? Esta ação removerá todos os membros e campanhas ativas deste grupo e não poderá ser desfeita.`)) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await deleteGroupAction(groupId);

    if (result.success) {
      setSuccessMsg(`Grupo "${groupName}" excluído com sucesso.`);
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setMembers([]);
      }
      if (ubsId) await fetchGroups(ubsId);
    } else {
      setErrorMsg(result.error || 'Erro ao excluir grupo');
    }
  };

  // Remover membro individual de um grupo
  const handleRemoveMember = async (patientId: string, patientName: string) => {
    if (!selectedGroup) return;
    if (!confirm(`Deseja remover ${patientName} do grupo "${selectedGroup.name}"?`)) {
      return;
    }

    const result = await removeMemberFromGroupAction(selectedGroup.id, patientId);

    if (result.success) {
      setSuccessMsg(`Membro removido com sucesso.`);
      // Recarregar membros
      await fetchMembers(selectedGroup.id);
      // Recarregar contagem de membros na lista de grupos
      if (ubsId) await fetchGroups(ubsId);
    } else {
      setErrorMsg(result.error || 'Erro ao remover membro');
    }
  };

  // Filtrar membros baseado na busca
  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    m.cns_masked?.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  const isManagerOrAdmin = userRole === 'gerente' || userRole === 'admin_ti';

  return (
    <div className="p-4 md:p-10 h-full overflow-y-auto bg-slate-50/50">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <Users className="h-9 w-9 text-teal-600" />
          Grupos de Saúde e Campanhas
        </h1>
        <p className="text-slate-500 mt-2 text-base md:text-lg">
          Gerencie grupos de apoio e campanhas de vacinação ou prevenção da sua unidade.
        </p>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium text-sm">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-2.5 shadow-sm">
          <svg className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Painel Esquerdo (Largo, 2/3): Membros do Grupo Selecionado ("os grupos") */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full flex flex-col min-h-[500px]">
              
              {/* Header do Painel */}
              <div className="border-b border-slate-100 pb-5 mb-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{selectedGroup.name}</h2>
                  {selectedGroup.description && (
                    <p className="text-slate-500 mt-1.5 text-sm">{selectedGroup.description}</p>
                  )}
                </div>
                
                {/* Busca nos membros */}
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar membros..."
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl w-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Lista de Membros */}
              <div className="flex-1 overflow-y-auto">
                {loadingMembers ? (
                  <p className="text-slate-400 text-center py-12">Carregando membros...</p>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum paciente encontrado neste grupo.</p>
                    <p className="text-xs text-slate-400 mt-1">Para adicionar pacientes, use a listagem geral em Pacientes.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 flex justify-between items-center transition-all duration-200"
                      >
                        <div>
                          <div className="font-bold text-slate-700">{member.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{member.cns_masked || 'CNS não informado'}</span>
                            <span className="text-slate-300 text-xs">•</span>
                            <span className="text-xs text-slate-500 font-medium">{member.phone_number}</span>
                          </div>
                          {member.comorbidities?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.comorbidities.map((c: string, idx: number) => (
                                <span key={idx} className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="flex items-center gap-1 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 px-3 py-2 border border-slate-100 hover:border-rose-100 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <UserMinus className="h-4 w-4" />
                          <span className="hidden sm:inline">Retirar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 h-full flex flex-col justify-center items-center min-h-[500px]">
              <div className="bg-teal-50 p-6 rounded-full text-teal-600 mb-4">
                <Users className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Selecione um Grupo</h2>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                Selecione um grupo de saúde da lista à direita para visualizar os pacientes vinculados, remover membros ou gerenciar as campanhas.
              </p>
            </div>
          )}
        </div>

        {/* Painel Direito (Estreito, 1/3): Criação e Seleção de Grupos da Unidade */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Formulário de Criação (Apenas para Gerentes/Admin) */}
          {isManagerOrAdmin ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-black text-slate-800 text-lg uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-teal-600" />
                Criar Novo Grupo
              </h2>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nome do Grupo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Campanha Vacina Gripe 2026"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-700 font-medium"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Descrição (Objetivo)</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Grupo voltado para acompanhamento de vacinação anual e envio de lembretes..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-700 font-medium"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Salvando...' : 'Criar Grupo'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-100/50 rounded-3xl p-6 border border-slate-200/50 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aviso de Permissão</p>
              <p className="text-sm text-slate-600 mt-2">A criação de novos grupos de saúde é restrita aos gerentes e administradores.</p>
            </div>
          )}

          {/* Listagem dos Grupos da Unidade */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-black text-slate-800 text-lg uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Grupos da Unidade
            </h2>
            
            {loading ? (
              <p className="text-slate-400 text-sm text-center py-6">Carregando grupos...</p>
            ) : grupos.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhum grupo cadastrado nesta unidade.</p>
            ) : (
              <div className="space-y-4">
                {grupos.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGroup(g)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectGroup(g);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Grupo ${g.name}, ${g.memberCount} membros. Clique para ver membros.`}
                    className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col relative group focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                      selectedGroup?.id === g.id
                        ? 'border-teal-500 bg-teal-50/20 shadow-md ring-2 ring-teal-500/20'
                        : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start pr-8">
                      <h3 className="font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate max-w-[180px]">{g.name}</h3>
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {g.memberCount}
                      </span>
                    </div>
                    {g.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{g.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Criado em {mounted ? new Date(g.created_at).toLocaleDateString('pt-BR') : ''}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectGroup(g);
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm ${
                          selectedGroup?.id === g.id
                            ? 'bg-teal-600 text-white hover:bg-teal-700'
                            : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                        }`}
                      >
                        {selectedGroup?.id === g.id ? 'Selecionado' : 'Ver Membros'}
                      </button>
                    </div>

                    {/* Botão de Excluir Grupo */}
                    {isManagerOrAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(g.id, g.name);
                        }}
                        className="absolute right-3 top-3.5 p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                        title="Excluir Grupo"
                        aria-label={`Excluir grupo ${g.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
