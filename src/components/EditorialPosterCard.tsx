import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';

export interface PosterRecord {
  id: number;
  slug?: string | null;
  title: string;
  subtitle: string;
  category: string;
  summary: string;
  ctaLabel: string;
  ctaUrl: string;
  hasImage: boolean;
  scope: string;
  district?: string | null;
  collegeId?: number | null;
  collegeName?: string | null;
  sourceAttribution: string;
  authorisationRef: string;
  publishDate?: string | null;
  expiryDate?: string | null;
}

export function EditorialPosterCard({
  poster,
  variant = 'light',
}: {
  poster: PosterRecord;
  variant?: 'light' | 'navy';
}) {
  const isExternal = /^https?:\/\//i.test(poster.ctaUrl);
  const scopeLabel =
    poster.scope === 'college' && poster.collegeName
      ? poster.collegeName
      : poster.scope === 'district' && poster.district
        ? `${poster.district} District`
        : 'Statewide Initiative';

  if (variant === 'navy') {
    return (
      <article className="bg-[#0F2547] text-white border border-[#1E3A8A] rounded-xl overflow-hidden flex flex-col justify-between">
        <div>
          <div className="px-6 pt-5 pb-3 border-b border-white/10 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6C775]">
              {poster.category}
            </span>
            <span className="text-[11px] font-mono text-slate-300">{scopeLabel}</span>
          </div>
          {poster.hasImage && (
            <div className="bg-slate-900/60 border-b border-white/10 aspect-[16/9] overflow-hidden">
              <img
                src={`/api/files/poster/${poster.id}`}
                alt={poster.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-6">
            <h3 className="font-serif text-xl font-semibold leading-snug text-white">
              {poster.title}
            </h3>
            <p className="mt-1.5 text-xs font-medium text-blue-200">{poster.subtitle}</p>
            <p className="mt-3 text-sm text-slate-200 leading-relaxed">{poster.summary}</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-950/35 border-t border-white/10 space-y-3">
          {isExternal ? (
            <a
              href={poster.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E6C775] hover:underline"
            >
              {poster.ctaLabel}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <Link
              to={poster.ctaUrl}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E6C775] hover:underline"
            >
              {poster.ctaLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <p className="text-[11px] text-slate-400 leading-normal">
            {poster.sourceAttribution} · Ref: <span className="font-mono">{poster.authorisationRef}</span>
            {poster.expiryDate ? ` · Valid until ${poster.expiryDate}` : ''}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
      <div>
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-[#FBF9F4]">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A7B2C]">
            {poster.category}
          </span>
          <span className="text-[11px] font-mono text-slate-500 truncate max-w-[180px]" title={scopeLabel}>
            {scopeLabel}
          </span>
        </div>

        {poster.hasImage && (
          <div className="bg-slate-100 border-b border-slate-200 aspect-[16/9] overflow-hidden">
            <img
              src={`/api/files/poster/${poster.id}`}
              alt={poster.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5">
          <h3 className="font-serif text-lg font-semibold leading-snug text-[#0F2547]">
            {poster.title}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-600">{poster.subtitle}</p>
          <p className="mt-3 text-sm text-slate-700 leading-relaxed">{poster.summary}</p>
        </div>
      </div>

      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 space-y-2">
        {isExternal ? (
          <a
            href={poster.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E3A8A] hover:underline"
          >
            {poster.ctaLabel}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <Link
            to={poster.ctaUrl}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E3A8A] hover:underline"
          >
            {poster.ctaLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
        <p className="text-[11px] text-slate-500 leading-normal">
          {poster.sourceAttribution} · <span className="font-mono">{poster.authorisationRef}</span>
          {poster.expiryDate ? ` · Expires ${poster.expiryDate}` : ''}
        </p>
      </div>
    </article>
  );
}
