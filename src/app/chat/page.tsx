'use client';

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import SitePreview from '@/components/SitePreview';

/**
 * FAZAÍ — Página principal do Chat
 * Layout split-screen: Chat à esquerda, Preview à direita
 */
export default function ChatPage() {
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // No MVP, usamos um projectId fixo. Em produção, vem da URL ou auth.
  const projectId = 'demo-project-001';

  function handleSiteUpdate(url: string) {
    setSiteUrl(url);
    setShowPreview(true);
  }

  return (
    <div className="h-screen flex flex-col bg-[#000005]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#08080D]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold tracking-tight">
            FAZ
            <span className="text-[#4A7CF7]">AÍ</span>
          </span>
          <span className="text-[10px] text-[#606075] bg-white/[0.04] px-2 py-0.5 rounded-full">
            BETA
          </span>
        </div>

        <div className="flex items-center gap-3">
          {siteUrl && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-[#A0A0B0] hover:text-white transition-colors flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" /><path d="M12 17v4" />
              </svg>
              {showPreview ? 'Esconder Preview' : 'Ver Preview'}
            </button>
          )}

          {siteUrl && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-[#4A7CF7] text-white px-3 py-1.5 rounded-lg hover:bg-[#3A6CE7] transition-colors flex items-center gap-1.5"
            >
              🌐 Abrir site
            </a>
          )}
        </div>
      </header>

      {/* Main content — split screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div
          className={`${
            showPreview ? 'w-[420px] min-w-[420px]' : 'w-full max-w-2xl mx-auto'
          } flex flex-col border-r border-white/[0.06] transition-all duration-300`}
        >
          <ChatInterface projectId={projectId} onSiteUpdate={handleSiteUpdate} />
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="flex-1 flex flex-col">
            <SitePreview siteUrl={siteUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
