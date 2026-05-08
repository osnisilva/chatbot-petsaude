"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUnread } from '@/components/UnreadProvider';

export default function ChatPage() {
  const supabase = createClient();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { unreadCounts, markSessionAsRead, setActiveSessionId } = useUnread();

  // Carrega as sessões ativas e escaladas
  useEffect(() => {
    async function fetchSessions() {
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, status, updated_at, patient_id, patients(id, name, phone_number)')
        .in('status', ['active', 'escalated'])
        .order('updated_at', { ascending: false });
      
      if (data) {
        setSessions(data);

        // Verifica se veio de um redirecionamento com patientId
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const patientIdFromUrl = urlParams.get('patientId');

          if (patientIdFromUrl) {
            const existingSession = data.find(s => s.patient_id === patientIdFromUrl);
            
            if (existingSession) {
              setSelectedSession(existingSession);
              window.history.replaceState({}, '', '/dashboard/chat');
            } else {
              // Cria uma nova sessão escalada para o ACS iniciar a conversa
              const { data: newSession, error } = await supabase
                .from('chat_sessions')
                .insert({
                  patient_id: patientIdFromUrl,
                  status: 'escalated'
                })
                .select('id, status, updated_at, patient_id, patients(id, name, phone_number)')
                .single();

              if (newSession && !error) {
                setSessions(prev => [newSession, ...prev]);
                setSelectedSession(newSession);
                window.history.replaceState({}, '', '/dashboard/chat');
              }
            }
          }
        }
      }
    }
    fetchSessions();

    // Atualização em tempo real das sessões
    const channel = supabase.channel('sessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Carrega as mensagens da sessão selecionada
  useEffect(() => {
    if (!selectedSession) return;

    async function fetchMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', selectedSession.id)
        .order('created_at', { ascending: true });
      
      if (data) {
        setMessages(data);
        scrollToBottom();
      }
    }
    fetchMessages();

    // Atualização em tempo real das mensagens (Escuta tudo: INSERT, UPDATE, DELETE)
    const msgChannel = supabase.channel(`msgs_${selectedSession.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `session_id=eq.${selectedSession.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        } else if (payload.eventType === 'UPDATE') {
          console.log('🔔 Update recebido via Realtime:', payload.new);
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
          ));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(msg => msg.id === payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
  }, [selectedSession]);

  useEffect(() => {
    if (selectedSession) {
      setActiveSessionId(selectedSession.id);
      markSessionAsRead(selectedSession.id);
    } else {
      setActiveSessionId(null);
    }
  }, [selectedSession]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const assumirAtendimento = async () => {
    if (!selectedSession) return;
    await supabase.from('chat_sessions').update({ status: 'escalated' }).eq('id', selectedSession.id);
    setSelectedSession({ ...selectedSession, status: 'escalated' });
    setSessions(prev => prev.map(s => s.id === selectedSession.id ? { ...s, status: 'escalated' } : s));
  };

  const resolverAtendimento = async () => {
    if (!selectedSession) return;
    await supabase.from('chat_sessions').update({ status: 'resolved' }).eq('id', selectedSession.id);
    setSessions(prev => prev.filter(s => s.id !== selectedSession.id));
    setSelectedSession(null);
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || !selectedSession || uploading) return;

    setUploading(true);
    try {
      let mediaData = { url: null as string | null, type: null as string | null, name: null as string | null };

      // 1. Se houver arquivo pendente, faz o upload primeiro
      if (pendingFile) {
        const fileExt = pendingFile.name.split('.').pop();
        const fileName = `${selectedSession.id}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filePath, pendingFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(filePath);
        
        mediaData = { url: publicUrl, type: pendingFile.type, name: pendingFile.name };
      }

      // 2. Salva a mensagem no banco (com ou sem mídia)
      const texto = newMessage.trim() || (pendingFile ? `Arquivo: ${pendingFile.name}` : '');
      
      const { error: insertError } = await supabase.from('messages').insert({
        session_id: selectedSession.id,
        sender_type: 'acs',
        content: texto,
        media_url: mediaData.url,
        media_type: mediaData.type,
        media_name: mediaData.name
      });

      if (insertError) throw insertError;

      setNewMessage('');
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      alert('Erro ao enviar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deletarMensagem = async (msgId: string) => {
    if (!confirm('Tem certeza que deseja apagar esta mensagem para todos?')) return;

    // Atualização Otimista
    const oldMessages = [...messages];
    setMessages(prev => prev.map(msg => 
      msg.id === msgId ? { ...msg, is_deleted: true, content: '🚫 Esta mensagem foi apagada.' } : msg
    ));

    const { error } = await supabase.from('messages')
      .update({ is_deleted: true, content: '🚫 Esta mensagem foi apagada.' })
      .eq('id', msgId);

    if (error) {
      alert('Erro ao apagar mensagem: ' + error.message);
      setMessages(oldMessages);
    }
  };

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const iniciarEdicao = (msg: any) => {
    setEditingMsgId(msg.id);
    setEditValue(msg.content);
  };

  const salvarEdicao = async () => {
    if (!editingMsgId || !editValue.trim()) return;
    
    // Atualização Otimista: Muda na tela antes mesmo de ir pro banco
    const oldMessages = [...messages];
    setMessages(prev => prev.map(msg => 
      msg.id === editingMsgId ? { ...msg, content: editValue, updated_at: new Date().toISOString() } : msg
    ));
    setEditingMsgId(null);

    const { error } = await supabase.from('messages')
      .update({ 
        content: editValue, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', editingMsgId);

    if (error) {
      alert('Erro ao salvar no banco: ' + error.message);
      setMessages(oldMessages); // Volta ao que era se der erro
    }
  };

  const prepararUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
    }
  };

  return (
    <div className="flex h-full bg-[#F4F7F9] p-4 md:p-6 gap-4 md:gap-6 relative overflow-hidden">
      {/* Lista de Contatos */}
      <div className={`
        ${selectedSession ? 'hidden md:flex' : 'flex'} 
        w-full md:w-96 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col overflow-hidden transition-all duration-300
      `}>
        <div className="p-6 border-b border-slate-50 bg-white">
          <h2 className="font-extrabold text-xl text-slate-800 tracking-tight">Atendimentos</h2>
          <p className="text-sm text-slate-500 mt-1">Sessões ativas no momento</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => {
                setSelectedSession(session);
                markSessionAsRead(session.id);
              }}
              className={`p-4 mx-2 mb-2 rounded-2xl cursor-pointer transition-all duration-200 ${selectedSession?.id === session.id ? 'bg-teal-50 shadow-sm border border-teal-100/50' : 'hover:bg-slate-50 border border-transparent'}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-800 flex items-center gap-2">
                  {(session.patients as any)?.name || 'Desconhecido'}
                  {unreadCounts[session.id] > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                      {unreadCounts[session.id]}
                    </span>
                  )}
                </span>
                {session.status === 'escalated' && <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold shadow-sm">Em Atendimento</span>}
                {session.status === 'active' && <span className="bg-sky-100 text-sky-700 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold shadow-sm">Com a IA</span>}
              </div>
              <p className="text-sm text-slate-500 mt-1 font-medium">{session.patients?.phone_number}</p>
            </div>
          ))}
          {sessions.length === 0 && <p className="p-6 text-slate-400 text-center font-medium">Nenhum chat ativo no momento.</p>}
        </div>
      </div>

      {/* Área do Chat */}
      <div className={`
        ${!selectedSession ? 'hidden md:flex' : 'flex'} 
        flex-1 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col overflow-hidden relative transition-all duration-300
      `}>
        {selectedSession ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 md:p-6 bg-white border-b border-slate-50 flex justify-between items-center z-10 relative">
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </button>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-base md:text-lg">
                  {(selectedSession.patients as any)?.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="font-extrabold text-base md:text-lg text-slate-800 truncate max-w-[150px] sm:max-w-xs">{(selectedSession.patients as any)?.name}</h2>
                  <p className="text-xs md:sm text-slate-500 font-medium">{selectedSession.patients?.phone_number}</p>
                </div>
              </div>
              <div className="space-x-3">
                {selectedSession.status === 'active' && (
                  <button onClick={assumirAtendimento} className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_4px_14px_rgba(244,63,94,0.39)] transition-all flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    Assumir (Desligar IA)
                  </button>
                )}
                {selectedSession.status === 'escalated' && (
                  <button onClick={resolverAtendimento} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all">
                    ✓ Encerrar Atendimento
                  </button>
                )}
              </div>
            </div>

            {/* Balões de Mensagem */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 bg-slate-50/50 relative">
              {messages.map(msg => {
                const isPatient = msg.sender_type === 'patient';
                const isBot = msg.sender_type === 'bot';
                const isAcs = msg.sender_type === 'acs';
                const isEditing = editingMsgId === msg.id;
                
                return (
                  <div key={msg.id} className={`flex ${isPatient ? 'justify-start' : 'justify-end'} group`}>
                    <div className={`max-w-[85%] md:max-w-[65%] rounded-3xl p-4 md:p-5 shadow-sm relative ${isPatient ? 'bg-white text-slate-700 rounded-tl-sm border border-slate-100' : isBot ? 'bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-900 rounded-tr-sm border border-teal-100/50' : 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-tr-sm shadow-[0_4px_14px_rgba(14,165,233,0.3)]'}`}>
                      
                      {/* Botões de Ação (Apenas para ACS e mensagens não apagadas) */}
                      {isAcs && !msg.is_deleted && (
                        <div className="absolute -left-12 top-2 hidden group-hover:flex flex-col gap-1">
                          <button onClick={() => iniciarEdicao(msg)} className="p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-sky-500 transition-colors" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button onClick={() => deletarMensagem(msg.id)} className="p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-rose-500 transition-colors" title="Apagar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      )}

                      {!isPatient && <div className={`text-[10px] uppercase tracking-widest mb-1.5 md:mb-2 font-bold ${isBot ? 'text-teal-600' : 'text-sky-100'}`}>{isBot ? '🤖 IA Assistente' : '👨‍⚕️ Agente (ACS)'}</div>}
                      
                      {msg.media_url && !msg.is_deleted ? (
                        <div className="mb-2">
                          {msg.media_type?.startsWith('image/') ? (
                            <img src={msg.media_url} alt={msg.media_name} className="rounded-xl max-w-full h-auto border border-white/20 shadow-sm" />
                          ) : (
                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors border border-white/10">
                              <span className="text-2xl">📄</span>
                              <div className="overflow-hidden">
                                <p className="text-sm font-bold truncate">{msg.media_name || 'Ver arquivo'}</p>
                                <p className="text-[10px] opacity-70 uppercase">Documento</p>
                              </div>
                            </a>
                          )}
                        </div>
                      ) : null}

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea 
                            value={editValue} 
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-1 focus:ring-white/50 text-sm md:text-base min-h-[80px]"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingMsgId(null)} className="text-[10px] uppercase font-bold text-sky-100 hover:text-white">Cancelar</button>
                            <button onClick={salvarEdicao} className="text-[10px] uppercase font-bold bg-white text-sky-600 px-3 py-1 rounded-full shadow-sm">Salvar</button>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-sm md:text-base whitespace-pre-wrap leading-relaxed ${msg.is_deleted ? 'italic opacity-70 font-medium' : ''}`}>
                          {msg.content}
                          {new Date(msg.updated_at).getTime() !== new Date(msg.created_at).getTime() && !msg.is_deleted && (
                            <span className="text-[9px] ml-2 opacity-60 font-normal">(editada)</span>
                          )}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1.5 mt-2 md:mt-3">
                        <span className={`text-[10px] font-bold block ${isPatient ? 'text-slate-400' : isBot ? 'text-teal-600/60' : 'text-blue-100'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        
                        {/* Indicadores de Status (Checks) */}
                        {isAcs && !msg.is_deleted && (
                          <div className="flex items-center">
                            {msg.status === 'failed' ? (
                              <span className="text-rose-200" title="Falha ao enviar">⚠️</span>
                            ) : msg.status === 'read' ? (
                              <span className="text-sky-200 flex -space-x-1" title="Lida">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </span>
                            ) : msg.status === 'delivered' ? (
                              <span className="text-blue-100/50 flex -space-x-1" title="Entregue">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </span>
                            ) : (
                              <span className="text-blue-100/50" title="Enviada">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            {selectedSession.status === 'escalated' ? (
              <div className="p-4 md:p-6 bg-white border-t border-slate-50">
                {pendingFile && (
                  <div className="mb-4 flex items-center justify-between bg-teal-50 p-3 rounded-2xl border border-teal-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📎</span>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-teal-800 truncate max-w-[200px]">{pendingFile.name}</p>
                        <p className="text-[10px] text-teal-600 uppercase font-bold">Aguardando envio...</p>
                      </div>
                    </div>
                    <button onClick={() => setPendingFile(null)} className="text-teal-400 hover:text-rose-500 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                )}
                <form onSubmit={enviarMensagem} className="flex gap-2 md:gap-3 items-center">
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={prepararUpload}
                  />
                  <button 
                    type="button" 
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-3 md:p-4 rounded-2xl transition-all border ${pendingFile ? 'bg-teal-500 text-white border-teal-500 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-sky-500 hover:bg-sky-50'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                  </button>
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..." 
                    className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-slate-400 text-sm md:text-base font-medium"
                  />
                  <button 
                    type="submit" 
                    disabled={(!newMessage.trim() && !pendingFile) || uploading} 
                    className={`px-5 md:px-8 py-3 md:py-4 rounded-2xl font-bold transition-all text-sm md:text-base shadow-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none ${(!newMessage.trim() && !pendingFile) ? 'bg-slate-200' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'}`}
                  >
                    {uploading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Enviando...
                      </div>
                    ) : 'Enviar'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-6 bg-slate-50/80 border-t border-slate-100 text-center text-slate-500 font-medium flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                A Inteligência Artificial está conduzindo este atendimento.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <p className="text-xl font-bold text-slate-600">Nenhum atendimento selecionado</p>
            <p className="text-sm mt-2">Escolha um paciente na lista lateral para visualizar a conversa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
