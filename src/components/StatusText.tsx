import { AlertCircle, CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react';

export function StatusText({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  if (['verified', 'approved', 'resolved', 'closed', 'verified_by_college', 'gateway_confirmed', 'authorised_ready'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  if (['rejected'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  if (['escalated', 'urgent for human review'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  if (['additional evidence required', 'additional information required', 'elevated'].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
