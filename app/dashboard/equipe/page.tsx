"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function EquipePage() {
  const supabase = createClient();
  const [equipe, setEquipe] = useState<any[]>([]);
  const [ubsList, setUbsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    cns: '',
    ubs_id: '',
    microarea: '',
    role: 'acs'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchEquipe() {
    const { data: equipeData } = await supabase
      .from('acs')
      .select('*, ubs:ubs_id(name)')
      .order('name');
    
    if (equipeData) setEquipe(equipeData);
  }

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('acs')
          .select('role, ubs_id')
          .eq('auth_user_id', user.id)
          .single();
        setUserRole(profile?.role || 'acs');
      }
      await fetchEquipe();
      const { data: ubsData } = await supabase.from('ubs').select('id, name').order('name');
      if (ubsData) setUbsList(ubsData);
      setLoading(false);
    }
    fetchData();
  }, []);

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '', 
      password: '', // Senha sempre vazia ao abrir (apenas se quiser trocar)
      phone_number: user.phone_number || '',
      cns: user.cns || '',
      ubs_id: user.ubs_id || '',
      microarea: user.microarea || '',
      role: user.role || 'acs'
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      name: '', email: '', password: '', phone_number: '',
      cns: '', ubs_id: '', microarea: '', role: 'acs'
    });
    setError(null);
  };

  const handleDelete = async (id: string, auth_user_id: string | null) => {
    if (!window.confirm('Tem certeza que deseja excluir este profissional? Esta ação é irreversível.')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, auth_user_id }),
      });

      if (!response.ok) throw new Error('Erro ao excluir');
      await fetchEquipe();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingUser) {
        // ATUALIZAÇÃO (DB + Auth)
        const response = await fetch('/api/admin/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            id: editingUser.id,
            auth_user_id: editingUser.auth_user_id
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao atualizar');

      } else {
        // CRIAÇÃO
        const response = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao criar usuário');
      }

      handleCloseModal();
      await fetchEquipe();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-10 h-full overflow-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Gestão de Equipe</h1>
          <p className="text-slate-500 mt-2 text-base md:text-lg">Gerencie profissionais, gerentes e administradores.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-[0_4px_14px_rgba(20,184,166,0.39)] transition-all flex items-center justify-center gap-2"
        >
          <span className="text-xl leading-none">+</span> Novo Profissional
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100">
                <th className="p-6 font-bold">Nome</th>
                <th className="p-6 font-bold">Cargo / E-mail</th>
                <th className="p-6 font-bold">Unidade (UBS)</th>
                <th className="p-6 font-bold">Microárea</th>
                <th className="p-6 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Carregando equipe...</td>
                </tr>
              ) : equipe.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Nenhum profissional encontrado.</td>
                </tr>
              ) : (
                equipe.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-teal-50/30 transition-colors">
                    <td className="p-6">
                        <div className="font-bold text-slate-700">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.cns || 'Sem CNS'}</div>
                    </td>
                    <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            p.role === 'admin_ti' ? 'bg-indigo-100 text-indigo-700' :
                            p.role === 'gerente' ? 'bg-amber-100 text-amber-700' :
                            'bg-teal-100 text-teal-700'
                        }`}>
                            {p.role === 'admin_ti' ? 'TI / Admin' : p.role === 'gerente' ? 'Gerente' : 'ACS'}
                        </span>
                        <div className="text-xs text-slate-400 mt-1 font-medium italic">{p.email || 'Sem e-mail'}</div>
                    </td>
                    <td className="p-6 text-slate-500 font-medium">{(p.ubs as any)?.name || '-'}</td>
                    <td className="p-6 text-slate-400 font-bold">{p.microarea || 'N/A'}</td>
                    <td className="p-6">
                        <div className="flex items-center justify-center gap-2">
                            <button 
                                onClick={() => openEditModal(p)}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-teal-600 transition-all shadow-none hover:shadow-sm"
                                title="Editar"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button 
                                onClick={() => handleDelete(p.id, p.auth_user_id)}
                                disabled={deletingId === p.id}
                                className={`p-2 hover:bg-white rounded-xl transition-all shadow-none hover:shadow-sm ${deletingId === p.id ? 'text-slate-300' : 'text-slate-400 hover:text-rose-600'}`}
                                title="Excluir"
                            >
                                {deletingId === p.id ? (
                                    <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                )}
                            </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-800">
                    {editingUser ? 'Editar Profissional' : 'Cadastrar Profissional'}
                </h2>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {error && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold border border-rose-100">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome Completo</label>
                        <input 
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">E-mail (Login)</label>
                        <input 
                            required type="email"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha Inicial'}
                        </label>
                        <input 
                            required={!editingUser}
                            type="password"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargo / Papel</label>
                        <select 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="acs">Agente de Saúde (ACS)</option>
                            <option value="gerente">Gerente de Unidade</option>
                            <option value="admin_ti">Administrador de TI</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Unidade (UBS)</label>
                        <select 
                            required
                            disabled={userRole === 'gerente'}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all disabled:opacity-60"
                            value={formData.ubs_id}
                            onChange={e => setFormData({...formData, ubs_id: e.target.value})}
                        >
                            <option value="">Selecione uma UBS</option>
                            {ubsList.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Microárea (Apenas ACS)</label>
                        <input 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                            placeholder="Ex: 01"
                            value={formData.microarea}
                            onChange={e => setFormData({...formData, microarea: e.target.value})}
                            disabled={formData.role !== 'acs'}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">WhatsApp / Telefone</label>
                        <input 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                            value={formData.phone_number}
                            onChange={e => setFormData({...formData, phone_number: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CNS (Cartão SUS)</label>
                        <input 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                            value={formData.cns}
                            onChange={e => setFormData({...formData, cns: e.target.value})}
                        />
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button 
                        type="button"
                        onClick={handleCloseModal}
                        className="flex-1 px-6 py-3.5 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        disabled={saving}
                        className="flex-1 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all"
                    >
                        {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Cadastrar Profissional'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
