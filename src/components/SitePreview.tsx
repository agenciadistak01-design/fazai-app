'use client';

import { useState } from 'react';

interface SitePreviewProps {
  siteUrl: string | null;
}

export default function SitePreview({ siteUrl }: SitePreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  if (!siteUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-[#4A7CF7]/10 flex items-center justify-center mb-6">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4A7CF7"
            strokeWidth="1.5"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </div>
        <h3 className="font-display text-lg font-bold mb-2">
          Preview do seu site
        </h3>
        <p className="text-sm text-[#A0A0B0] max-w-xs leading-relaxed">
          Converse com o FAZAÍ no chat ao lado. Quando seu site estiver pronto,
          ele aparecerá aqui em tempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#08080D]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-[#606075] ml-2 font-mono truncate max-w-[200px]">
            {siteUrl}
          </span>
        </div>

        {/* Device toggle */}
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1">
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'desktop'
                ? 'bg-[#4A7CF7]/20 text-[#4A7CF7]'
                : 'text-[#606075] hover:text-white'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'mobile'
                ? 'bg-[#4A7CF7]/20 text-[#4A7CF7]'
                : 'text-[#606075] hover:text-white'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <path d="M12 18h.01" />
            </svg>
          </button>
        </div>

        {/* Open in new tab */}
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#4A7CF7] hover:text-[#00D4FF] transition-colors flex items-center gap-1"
        >
          Abrir
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14L21 3" />
          </svg>
        </a>
      </div>

      {/* iframe */}
      <div className="flex-1 flex items-start justify-center bg-[#0A0A0F] p-4 overflow-auto">
        <div
          className={`preview-glow rounded-lg overflow-hidden border border-white/[0.06] transition-all duration-500 ${
            viewMode === 'desktop' ? 'w-full h-full' : 'w-[375px] h-[667px]'
          }`}
        >
          <iframe
            src={siteUrl}
            className="w-full h-full bg-white"
            title="Preview do site"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
