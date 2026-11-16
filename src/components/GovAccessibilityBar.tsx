import { useEffect, useState } from 'react';
import { ArrowDownToLine, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';

export function GovAccessibilityBar() {
  const { t } = useLanguage();
  const [fontScale, setFontScale] = useState(100);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
  }, [fontScale]);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('contrast-125', 'saturate-150');
    } else {
      document.documentElement.classList.remove('contrast-125', 'saturate-150');
    }
  }, [highContrast]);

  return (
    <div className="border-b border-[#1E3A8A]/40 bg-[#0A192F] px-4 py-1.5 text-[11px] text-slate-200 no-print">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-2">
        <a
          href="#main-content"
          className="inline-flex items-center gap-1 font-medium text-slate-300 hover:text-[#E6C775] focus-visible:outline-2 focus-visible:outline-[#E6C775] rounded"
        >
          <ArrowDownToLine className="h-3 w-3" aria-hidden="true" />
          <span>{t.skipToContent}</span>
        </a>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border-r border-slate-700 pr-3" role="group" aria-label="Text size controls">
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.max(90, s - 5))}
              className="rounded px-1.5 py-0.5 font-bold hover:bg-white/10 cursor-pointer"
              title="Decrease text size"
              aria-label="Decrease text size"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontScale(100)}
              className="rounded px-1.5 py-0.5 font-bold text-[#E6C775] hover:bg-white/10 cursor-pointer"
              title="Default text size"
              aria-label="Reset text size"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.min(115, s + 5))}
              className="rounded px-1.5 py-0.5 font-bold hover:bg-white/10 cursor-pointer"
              title="Increase text size"
              aria-label="Increase text size"
            >
              A+
            </button>
          </div>

          <button
            type="button"
            onClick={() => setHighContrast((prev) => !prev)}
            aria-pressed={highContrast}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold hover:bg-white/10 cursor-pointer"
          >
            <Eye className="h-3 w-3 text-[#E6C775]" aria-hidden="true" />
            <span>{highContrast ? t.standardView : t.highContrast}</span>
          </button>

          <LanguageSelector compact />
        </div>
      </div>
    </div>
  );
}
