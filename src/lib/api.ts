export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter = async () => null;

export function setApiTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const token = await tokenGetter().catch(() => null);

  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const msg =
      typeof data.error === 'string'
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(msg, response.status, data);
  }

  return data as T;
}

export async function openAuthenticatedFile(url: string, filename?: string): Promise<void> {
  const token = await tokenGetter().catch(() => null);
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const text = await response.text();
    let message = `Unable to open file (HTTP ${response.status})`;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      // ignore non-JSON body
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.target = '_blank';
  if (filename) anchor.download = filename;
  anchor.rel = 'noreferrer';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export async function fetchAuthenticatedBlobUrl(url: string): Promise<string> {
  const token = await tokenGetter().catch(() => null);
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Unable to fetch protected resource (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function formatINR(amount: number | null | undefined): string {
  const val = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Not specified';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not specified';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
