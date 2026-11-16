import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

function readCliFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length).trim() || undefined;
    }
    if (arg === `--${name}` && i + 1 < process.argv.length) {
      const next = process.argv[i + 1];
      if (!next.startsWith('--')) {
        return next.trim() || undefined;
      }
    }
  }
  return undefined;
}

const isProd = process.env.NODE_ENV === 'production';
const parsedPort = Number(readCliFlag('port') || process.env.PORT || 3000);

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  host: readCliFlag('host') || process.env.HOST || '0.0.0.0',
  port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000,
  appUrl: process.env.APP_BASE_URL || process.env.APP_URL || 'http://localhost:3000',
  proposedDomain: process.env.ASH_PROPOSED_DOMAIN || 'www.ashstudenthub.com',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './storage/uploads'),
  maxUploadBytes: 5 * 1024 * 1024, // 5 MB
  ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
  sms: {
    providerId: process.env.SMS_PROVIDER_ID?.trim() || '',
    apiKey: process.env.SMS_PROVIDER_API_KEY?.trim() || '',
    senderId: process.env.SMS_SENDER_ID?.trim() || 'ASHEDU',
    get isConfigured() {
      return Boolean(this.providerId && this.apiKey);
    },
  },
  smtp: {
    host: process.env.SMTP_HOST?.trim() || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER?.trim() || '',
    pass: process.env.SMTP_PASS?.trim() || '',
    from: process.env.SMTP_FROM?.trim() || 'no-reply@ashstudenthub.com',
    get isConfigured() {
      return Boolean(this.host && this.user && this.pass);
    },
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER?.trim() || '',
    keyId: process.env.PAYMENT_PROVIDER_KEY_ID?.trim() || process.env.PAYMENT_KEY_ID?.trim() || '',
    keySecret: process.env.PAYMENT_PROVIDER_KEY_SECRET?.trim() || process.env.PAYMENT_KEY_SECRET?.trim() || '',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET?.trim() || '',
    get isConfigured() {
      return Boolean(this.provider && this.keyId && this.keySecret);
    },
  },
  counsellorWhatsappNumber: (process.env.COUNSELLOR_WHATSAPP_NUMBER || '').replace(/\D/g, ''),
};

fs.mkdirSync(path.join(config.uploadDir, 'verification'), { recursive: true });
fs.mkdirSync(path.join(config.uploadDir, 'grievances'), { recursive: true });
fs.mkdirSync(path.join(config.uploadDir, 'college-photos'), { recursive: true });
fs.mkdirSync(path.join(config.uploadDir, 'college-logos'), { recursive: true });
fs.mkdirSync(path.join(config.uploadDir, 'posters'), { recursive: true });
fs.mkdirSync(path.join(config.uploadDir, 'student-photos'), { recursive: true });
