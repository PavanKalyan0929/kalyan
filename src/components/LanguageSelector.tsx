import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, useLanguage } from '../context/LanguageContext.tsx';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, currentOption } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select portal language"
        className={`inline-flex items-center gap-1.5 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          compact
            ? 'bg-[#E6C775]/15 px-2 py-0.5 text-[11px] text-[#E6C775] hover:bg-[#E6C775] hover:text-[#0F2547]'
            : 'border border-slate-200 bg-white px-3 py-1.5 text-sm text-[#0F2547] hover:border-[#0F2547]'
        }`}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{currentOption.native}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Available languages"
          className="absolute right-0 z-50 mt-1.5 w-48 origin-top-right overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl text-slate-800"
        >
          <div className="border-b border-slate-100 bg-[#FBF9F4] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Select Language
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {SUPPORTED_LANGUAGES.map((item) => {
              const isSelected = item.code === lang;
              return (
                <li key={item.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setLang(item.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#0F2547] font-semibold text-white'
                        : 'text-slate-800 hover:bg-slate-50 hover:text-[#0F2547]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.native !== item.label && (
                      <span className={isSelected ? 'text-[#E6C775]' : 'text-slate-400'}>
                        {item.native}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
