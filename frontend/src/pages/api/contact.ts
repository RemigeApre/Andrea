export const prerender = false;

import type { APIRoute } from 'astro';

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL || 'http://localhost:8056';
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 2 semaines

function normalizeEmail(email: string): string {
  const [local, domain] = email.toLowerCase().trim().split('@');
  if (!local || !domain) return email.toLowerCase().trim();
  const gmail = ['gmail.com', 'googlemail.com'];
  const clean = gmail.includes(domain) ? local.replace(/\./g, '').split('+')[0] : local.split('+')[0];
  return `${clean}@${domain}`;
}

function getIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || '';
}

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: import.meta.env.ADMIN_EMAIL || 'andrea@simonetdavin.fr',
      password: import.meta.env.ADMIN_PASSWORD || 'changeme123',
    }),
  });
  if (!res.ok) throw new Error('Auth failed');
  return (await res.json()).data.access_token;
}

async function isBlocked(value: string, type: string): Promise<boolean> {
  const res = await fetch(`${DIRECTUS_URL}/items/blacklist?filter[email_normalized][_eq]=${encodeURIComponent(value)}&filter[type][_eq]=${type}&limit=1`);
  if (!res.ok) return false;
  return ((await res.json()).data?.length ?? 0) > 0;
}

async function hasCooldown(field: string, value: string): Promise<boolean> {
  if (!value) return false;
  const since = new Date(Date.now() - COOLDOWN_MS).toISOString();
  const res = await fetch(`${DIRECTUS_URL}/items/messages?filter[${field}][_eq]=${encodeURIComponent(value)}&filter[date_created][_gte]=${since}&limit=1`);
  if (!res.ok) return false;
  return ((await res.json()).data?.length ?? 0) > 0;
}

const FAKE_OK = new Response(JSON.stringify({ ok: true }), { status: 200 });

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, phone, firstname, lastname, message, token, fingerprint } = body;

    if (!email || !message) return new Response(JSON.stringify({ error: 'Email et message requis.' }), { status: 400 });
    if (message.length < 10 || message.length > 5000) return new Response(JSON.stringify({ error: 'Message entre 10 et 5000 caractères.' }), { status: 400 });
    if (token) return FAKE_OK; // honeypot
    if (body._ts && Date.now() - body._ts < 3000) return new Response(JSON.stringify({ error: 'Trop rapide.' }), { status: 429 });

    const normalized = normalizeEmail(email);
    const ip = getIP(request);
    const ua = request.headers.get('user-agent') || '';

    // Vérifier blacklist par email
    if (await isBlocked(normalized, 'email')) return FAKE_OK;
    // Vérifier IP dans les messages récents (anti-spam, pas blacklist permanente)
    if (ip) {
      const spamCheck = await fetch(`${DIRECTUS_URL}/items/messages?filter[ip][_eq]=${encodeURIComponent(ip)}&filter[date_created][_gte]=${new Date(Date.now() - 60000).toISOString()}&limit=1`);
      if (spamCheck.ok && ((await spamCheck.json()).data?.length ?? 0) > 0) return FAKE_OK;
    }
    // Vérifier blacklist par fingerprint
    if (fingerprint && await isBlocked(fingerprint, 'fingerprint')) return FAKE_OK;

    // Cooldown par email
    if (await hasCooldown('email_normalized', normalized)) {
      return new Response(JSON.stringify({ error: 'Un message a déjà été envoyé récemment depuis cette adresse.' }), { status: 429 });
    }
    // Cooldown par fingerprint
    if (fingerprint && await hasCooldown('fingerprint', fingerprint)) {
      return new Response(JSON.stringify({ error: 'Un message a déjà été envoyé récemment.' }), { status: 429 });
    }

    const adminToken = await getAdminToken();

    await fetch(`${DIRECTUS_URL}/items/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, phone: phone || null, firstname: firstname || null, lastname: lastname || null,
        message, email_normalized: normalized, ip: ip || null, user_agent: ua || null, fingerprint: fingerprint || null,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Erreur.' }), { status: 500 });
  }
};
