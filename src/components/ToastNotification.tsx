import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

export function ToastNotification({
  toast,
  onClose,
}: {
  toast: ToastMessage | null;
  onClose: () => void;
}) {
  if (!toast) return null;
  const isError = toast.type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-xl max-w-sm no-print"
    >
      {isError ? (
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
      )}
      <p className="text-sm font-medium text-[#0F2547] leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer shrink-0"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
