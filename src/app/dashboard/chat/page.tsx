"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
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

  return (
    <div className="flex h-full bg-slate-50">
      {/* Lista de Contatos */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-100">
          <h2 className="font-bold text-slate-800">Atendimentos</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => setSelectedSession(session)}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${selectedSession?.id === session.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-800">{session.patients?.name || 'Desconhecido'}</span>
                {session.status === 'escalated' && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-bold">Aguardando ACS</span>}
                {session.status === 'active' && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">Com a IA</span>}
              </div>
              <p className="text-sm text-slate-500 mt-1 truncate">{session.patients?.phone_number}</p>
            </div>
          ))}
          {sessions.length === 0 && <p className="p-4 text-slate-500 text-center">Nenhum chat ativo.</p>}
        </div>
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {selectedSession ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
              <div>
                <h2 className="font-bold text-lg text-slate-800">{selectedSession.patients?.name}</h2>
                <p className="text-sm text-slate-500">{selectedSession.patients?.phone_number}</p>
              </div>
              <div className="space-x-2">
                {selectedSession.status === 'active' && (
                  <button onClick={assumirAtendimento} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
                    Assumir (Desligar IA)
                  </button>
                )}
                {selectedSession.status === 'escalated' && (
                  <button onClick={resolverAtendimento} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
                    Resolver Atendimento
                  </button>
                )}
              </div>
            </div>

            {/* Balões de Mensagem */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-100">
              {messages.map(msg => {
                const isPatient = msg.sender_type === 'patient';
                const isBot = msg.sender_type === 'bot';
                
                return (
                  <div key={msg.id} className={`flex ${isPatient ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${isPatient ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200' : isBot ? 'bg-teal-100 text-teal-900 rounded-tr-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                      {!isPatient && <div className="text-xs opacity-75 mb-1 font-bold">{isBot ? '🤖 IA (Robô)' : '👨‍⚕️ Agente (ACS)'}</div>}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-[10px] opacity-60 block mt-2 text-right">
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
              <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={enviarMensagem} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem para o paciente..." 
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold transition-colors">
                    Enviar
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 bg-slate-200 border-t border-slate-300 text-center text-slate-500 font-medium">
                A Inteligência Artificial está conversando com o paciente. Assuma o atendimento para enviar mensagens.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <p className="text-xl">Selecione um atendimento na lista ao lado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
