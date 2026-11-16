import React from 'react';

const STOP_WORDS = new Set(['of', 'and', 'the', 'for', 'in', 'at', 'to', 'by']);

function extractMonogram(name: string, code?: string | null): string {
  if (code && code.trim().length >= 2 && code.trim().length <= 5) {
    return code.trim().toUpperCase();
  }
  const cleanWords = name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));

  if (cleanWords.length === 0) return 'ASH';
  return cleanWords
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export interface CollegeLogoMarkProps {
  name: string;
  institutionCode?: string | null;
  approvedLogoId?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showPlaceholderLabel?: boolean;
}

export function CollegeLogoMark({
  name,
  institutionCode,
  approvedLogoId,
  size = 'md',
  showPlaceholderLabel = false,
}: CollegeLogoMarkProps) {
  const dims =
    size === 'lg'
      ? 'w-20 h-20 text-base'
      : size === 'sm'
        ? 'w-10 h-10 text-[11px]'
        : 'w-14 h-14 text-xs';

  if (approvedLogoId) {
    return (
      <div className="inline-flex flex-col items-start gap-1 shrink-0">
        <div
          className={`${dims} bg-white border border-slate-200 rounded-lg p-1.5 flex items-center justify-center overflow-hidden shadow-2xs`}
        >
          <img
            src={`/api/files/college-logo/${approvedLogoId}`}
            alt={`${name} official college logo`}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full object-contain"
          />
        </div>
        {showPlaceholderLabel && (
          <span className="text-[10px] font-medium text-emerald-700 tracking-tight">
            Verified Official Logo
          </span>
        )}
      </div>
    );
  }

  const monogram = extractMonogram(name, institutionCode);

  return (
    <div
      className="inline-flex flex-col items-start gap-1 shrink-0"
      title={`Unofficial Placeholder — ${name} official logo not yet uploaded`}
    >
      <div
        className={`${dims} bg-[#0F2547] border border-[#9A7B2C]/50 text-[#F5F0E1] rounded-lg flex flex-col items-center justify-center font-mono font-semibold tracking-wider select-none`}
        aria-label={`${name} unofficial monogram placeholder`}
      >
        <span>{monogram}</span>
      </div>
      {showPlaceholderLabel && (
        <span className="text-[10px] font-medium text-slate-500 tracking-tight">
          Unofficial Placeholder
        </span>
      )}
    </div>
  );
}
