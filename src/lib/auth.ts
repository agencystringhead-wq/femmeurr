import { env } from 'cloudflare:workers';

export const COOKIE_NAME = 'fm_storeroom';
export const SESSION_DAYS = 30;
export const MAX_ATTEMPTS = 5;
export const BLOCK_MINUTES = 15;

const secrets = () => {
  const e = env as unknown as { SESSION_SECRET?: string; STOREROOM_PASSWORD?: string };
  return { session: e.SESSION_SECRET ?? '', password: e.STOREROOM_PASSWORD ?? '' };
};

const encoder = new TextEncoder();

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

const toHex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Fails closed: if either secret is missing, nobody can log in.
export async function passwordMatches(input: string): Promise<boolean> {
  const { session, password } = secrets();
  if (!session || !password) return false;
  const [a, b] = await Promise.all([hmac(session, `pw:${input}`), hmac(session, `pw:${password}`)]);
  return timingSafeEqual(a, b);
}

export async function createSessionToken(): Promise<string> {
  const { session } = secrets();
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const sig = toHex(await hmac(session, `session:${expires}`));
  return `${expires}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const { session } = secrets();
  if (!token || !session) return false;
  const [expires, sig] = token.split('.');
  if (!expires || !sig || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const expected = toHex(await hmac(session, `session:${expires}`));
  return timingSafeEqual(encoder.encode(sig), encoder.encode(expected));
}

export interface AttemptStatus {
  blocked: boolean;
  minutesLeft: number;
}

export async function getBlockStatus(ip: string): Promise<AttemptStatus> {
  const row = await env.DB.prepare('SELECT blocked_until FROM login_attempts WHERE ip = ?').bind(ip).first<{ blocked_until: number }>();
  const now = Date.now();
  if (row && row.blocked_until > now) {
    return { blocked: true, minutesLeft: Math.ceil((row.blocked_until - now) / 60000) };
  }
  return { blocked: false, minutesLeft: 0 };
}

export async function recordFailure(ip: string): Promise<AttemptStatus> {
  const now = Date.now();
  const windowMs = BLOCK_MINUTES * 60 * 1000;
  const row = await env.DB.prepare('SELECT attempts, window_start FROM login_attempts WHERE ip = ?')
    .bind(ip)
    .first<{ attempts: number; window_start: number }>();

  const fresh = !row || now - row.window_start > windowMs;
  const attempts = fresh ? 1 : row.attempts + 1;
  const windowStart = fresh ? now : row.window_start;
  const blockedUntil = attempts >= MAX_ATTEMPTS ? now + windowMs : 0;

  await env.DB.prepare(
    `INSERT INTO login_attempts (ip, attempts, window_start, blocked_until) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(ip) DO UPDATE SET attempts = ?2, window_start = ?3, blocked_until = ?4`,
  )
    .bind(ip, attempts, windowStart, blockedUntil)
    .run();

  return blockedUntil ? { blocked: true, minutesLeft: BLOCK_MINUTES } : { blocked: false, minutesLeft: 0 };
}

export async function clearFailures(ip: string) {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
}
