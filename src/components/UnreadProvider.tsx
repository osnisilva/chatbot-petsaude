"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface UnreadContextType {
  unreadCounts: Record<string, number>;
  totalUnread: number;
  markSessionAsRead: (sessionId: string) => void;
  setActiveSessionId: (sessionId: string | null) => void;
}

const UnreadContext = createContext<UnreadContextType>({
  unreadCounts: {},
  totalUnread: 0,
  markSessionAsRead: () => {},
  setActiveSessionId: () => {},
});

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const supabase = createClient();

  // Load initial counts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('acs_unread_counts');
    if (stored) {
      try {
        setUnreadCounts(JSON.parse(stored));
      } catch (e) {
        console.error("Erro ao carregar contagens não lidas", e);
      }
    }
  }, []);

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('acs_unread_counts', JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  // Realtime listener for new messages
  useEffect(() => {
    const channel = supabase.channel('global_unread_listener')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: "sender_type=eq.patient"
      }, (payload) => {
        const msg = payload.new;
        if (msg.session_id) {
          // Se a mensagem for da sessão atualmente aberta, não marca como não lida
          if (activeSessionId === msg.session_id) {
            return;
          }

          setUnreadCounts(prev => ({
            ...prev,
            [msg.session_id]: (prev[msg.session_id] || 0) + 1
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSessionId, supabase]);

  const totalUnread = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);

  // Tab Flashing Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (totalUnread > 0) {
      const originalTitle = 'ACS-Online';
      let toggle = false;
      
      interval = setInterval(() => {
        document.title = toggle ? `(${totalUnread}) Nova Mensagem 💬` : originalTitle;
        toggle = !toggle;
      }, 1500);
    } else {
      document.title = 'ACS-Online';
    }

    return () => {
      if (interval) clearInterval(interval);
      document.title = 'ACS-Online';
    };
  }, [totalUnread]);

  const markSessionAsRead = (sessionId: string) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[sessionId];
      return newCounts;
    });
  };

  return (
    <UnreadContext.Provider value={{ unreadCounts, totalUnread, markSessionAsRead, setActiveSessionId }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
