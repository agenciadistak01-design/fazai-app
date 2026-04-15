'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  projectId: string;
  onSiteUpdate?: (url: string) => void;
}

export default function ChatInterface({ projectId, onSiteUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Sou o FAZAÍ — sua IA especialista em criação de sites. Em poucos minutos, seu site profissional vai estar no ar. \u{1F680}\n\nMe conta: qual é o seu negócio?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error('Erro na resposta da API');

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.siteUrl && onSiteUpdate) {
        onSiteUpdate(data.siteUrl);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Ops, algo deu errado. Tenta mandar de novo? Se persistir, recarregue a página.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-[#08080D]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4A7CF7] to-[#00D4FF] flex items-center justify-center font-bold text-sm">
          F
        </div>
        <div>
          <h2 className="text-sm font-semibold">FAZAÍ</h2>
          <span className="text-xs text-[#00E676]">● Online agora</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`msg-animate flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-white/[0.06] border border-white/[0.08] rounded-br-sm'
                  : 'bg-[#4A7CF7]/10 border border-[#4A7CF7]/15 rounded-bl-sm text-[#A0A0B0]'
              }`}
            >
              {msg.content.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < msg.content.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start msg-animate">
            <div className="bg-[#4A7CF7]/10 border border-[#4A7CF7]/15 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1.5">
                <span className="typing-dot w-2 h-2 rounded-full bg-[#4A7CF7]" />
                <span className="typing-dot w-2 h-2 rounded-full bg-[#4A7CF7]" />
                <span className="typing-dot w-2 h-2 rounded-full bg-[#4A7CF7]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-white/[0.06] bg-[#08080D]">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva seu negócio..."
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#606075] outline-none focus:border-[#4A7CF7]/30 resize-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-[#4A7CF7] flex items-center justify-center text-white transition-all hover:bg-[#3A6CE7] disabled:opacity-30 disabled:hover:bg-[#4A7CF7] shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-[#606075] mt-2 text-center">
          FAZAÍ pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  );
}
