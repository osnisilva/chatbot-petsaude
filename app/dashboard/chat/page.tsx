"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function ChatPage() {
  const supabase = createClient();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega as sessões ativas e escaladas
  useEffect(() => {
    async function fetchSessions() {
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, status, updated_at, patients(id, name, phone_number)')
        .in('status', ['active', 'escalated'])
        .order('updated_at', { ascending: false });
      
      if (data) setSessions(data);
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

    // Atualização em tempo real das mensagens
    const msgChannel = supabase.channel(`msgs_${selectedSession.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `session_id=eq.${selectedSession.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
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
  };

  const resolverAtendimento = async () => {
    if (!selectedSession) return;
    await supabase.from('chat_sessions').update({ status: 'resolved' }).eq('id', selectedSession.id);
    setSelectedSession(null);
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSession) return;

    const texto = newMessage;
    setNewMessage(''); // Limpa o input

    // O bot fará o disparo quando ver essa inserção no banco
    await supabase.from('messages').insert({
      session_id: selectedSession.id,
      sender_type: 'acs',
      content: texto
    });
  };

  const fazerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSession) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedSession.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload para o Storage
      const { error: uploadError, data } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pegar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      // 3. Salvar mensagem no banco com a URL da mídia
      await supabase.from('messages').insert({
        session_id: selectedSession.id,
        sender_type: 'acs',
        content: `Arquivo enviado: ${file.name}`,
        media_url: publicUrl,
        media_type: file.type,
        media_name: file.name
      });

    } catch (error: any) {
      alert('Erro ao enviar arquivo: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
              onClick={() => setSelectedSession(session)}
              className={`p-4 mx-2 mb-2 rounded-2xl cursor-pointer transition-all duration-200 ${selectedSession?.id === session.id ? 'bg-teal-50 shadow-sm border border-teal-100/50' : 'hover:bg-slate-50 border border-transparent'}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-800">{(session.patients as any)?.name || 'Desconhecido'}</span>
                {session.status === 'escalated' && <span className="bg-rose-100 text-rose-700 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold shadow-sm">Aguardando ACS</span>}
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
                    ✓ Resolver Atendimento
                  </button>
                )}
              </div>
            </div>

            {/* Balões de Mensagem */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 bg-slate-50/50 relative">
              {messages.map(msg => {
                const isPatient = msg.sender_type === 'patient';
                const isBot = msg.sender_type === 'bot';
                
                return (
                  <div key={msg.id} className={`flex ${isPatient ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] md:max-w-[65%] rounded-3xl p-4 md:p-5 shadow-sm relative ${isPatient ? 'bg-white text-slate-700 rounded-tl-sm border border-slate-100' : isBot ? 'bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-900 rounded-tr-sm border border-teal-100/50' : 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-tr-sm shadow-[0_4px_14px_rgba(14,165,233,0.3)]'}`}>
                      {!isPatient && <div className={`text-[10px] uppercase tracking-widest mb-1.5 md:mb-2 font-bold ${isBot ? 'text-teal-600' : 'text-sky-100'}`}>{isBot ? '🤖 IA Assistente' : '👨‍⚕️ Agente (ACS)'}</div>}
                      
                      {msg.media_url ? (
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

                      <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <span className={`text-[10px] font-bold block mt-2 md:mt-3 text-right ${isPatient ? 'text-slate-400' : isBot ? 'text-teal-600/60' : 'text-blue-100'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            {selectedSession.status === 'escalated' ? (
              <div className="p-4 md:p-6 bg-white border-t border-slate-50">
                <form onSubmit={enviarMensagem} className="flex gap-2 md:gap-3 items-center">
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={fazerUpload}
                  />
                  <button 
                    type="button" 
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 md:p-4 bg-slate-50 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-2xl transition-all border border-slate-200"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    )}
                  </button>
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..." 
                    className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all placeholder:text-slate-400 text-sm md:text-base font-medium"
                  />
                  <button type="submit" disabled={!newMessage.trim() || uploading} className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:shadow-none text-white px-5 md:px-8 py-3 md:py-4 rounded-2xl font-bold shadow-[0_4px_14px_rgba(14,165,233,0.39)] transition-all text-sm md:text-base">
                    Enviar
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
