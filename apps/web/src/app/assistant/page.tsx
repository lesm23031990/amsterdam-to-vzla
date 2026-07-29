'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

export default function AssistantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; createdAt: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    api.get<{ id: string; createdAt: string }[]>('/assistant/conversations').then((res) => {
      if (res.ok && res.data) setConversations(res.data);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (id: string) => {
    setLoading(true);
    const res = await api.get<Message[]>(`/assistant/conversations/${id}`);
    if (res.ok && res.data) {
      setMessages(res.data);
      setConversationId(id);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input;
    setInput('');
    setSending(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      content: msg,
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const res = await api.post<{ message: Message; conversationId: string }>('/assistant/chat', {
      conversationId,
      message: msg,
    });

    const data = res.data;
    if (res.ok && data) {
      setMessages((prev) => [...prev, data.message]);
      setConversationId(data.conversationId);
      if (!conversations.find((c) => c.id === data.conversationId)) {
        setConversations((prev) => [...prev, { id: data.conversationId, createdAt: new Date().toISOString() }]);
      }
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Asistente virtual</h1>
          <button onClick={() => setShowHistory(!showHistory)} className={styles.historyBtn}>
            {showHistory ? 'Cerrar historial' : 'Historial'}
          </button>
        </div>

        <div className={styles.main}>
          {showHistory && (
            <div className={styles.sidebar}>
              <h3>Conversaciones</h3>
              {conversations.length === 0 ? (
                <p className={styles.noConvs}>Sin conversaciones</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { loadConversation(c.id); setShowHistory(false); }}
                    className={`${styles.convItem} ${c.id === conversationId ? styles.convActive : ''}`}
                  >
                    {new Date(c.createdAt).toLocaleDateString('es-ES')}
                  </button>
                ))
              )}
            </div>
          )}

          <div className={styles.chatArea}>
            {loading ? (
              <p className={styles.loadingText}>Cargando...</p>
            ) : messages.length === 0 ? (
              <div className={styles.emptyChat}>
                <p>Pregúntame lo que necesites</p>
                <p className={styles.hints}>Ej: ¿Cómo comprar? ¿Cómo rastrear mi pedido?</p>
              </div>
            ) : (
              <div className={styles.messages}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg}`}>
                    <div className={styles.bubble}>
                      <p>{msg.content}</p>
                      <span className={styles.time}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            <div className={styles.inputArea}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                className={styles.textarea}
                rows={2}
              />
              <button onClick={handleSend} className={styles.sendBtn} disabled={sending || !input.trim()}>
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
