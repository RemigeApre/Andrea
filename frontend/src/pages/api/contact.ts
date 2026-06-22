export const prerender = false;

import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';
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

function getAdminToken(): string {
  return process.env.DIRECTUS_STATIC_TOKEN || '';
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

    const adminToken = getAdminToken();

    await fetch(`${DIRECTUS_URL}/items/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, phone: phone || null, firstname: firstname || null, lastname: lastname || null,
        message, email_normalized: normalized, ip: ip || null, user_agent: ua || null, fingerprint: fingerprint || null,
      }),
    });

    // Notification par email
    try {
      const smtpHost = process.env.SMTP_HOST || 'smtp.ionos.fr';
      const smtpPort = Number(process.env.SMTP_PORT || '587');
      const smtpUser = process.env.SMTP_USER || '';
      const smtpPass = process.env.SMTP_PASS || '';
      const notifyTo = process.env.NOTIFY_EMAIL || '';

      if (smtpUser && smtpPass && notifyTo) {
        const transport = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: false,
          auth: { user: smtpUser, pass: smtpPass },
        });

        const name = [firstname, lastname].filter(Boolean).join(' ') || 'Anonyme';
        const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        await transport.sendMail({
          from: `"Andrea Simonet-Davin" <${smtpUser}>`,
          replyTo: email,
          to: notifyTo,
          subject: `Nouveau message de ${name}`,
          text: `De : ${name}\nEmail : ${email}\n${phone ? 'Tél : ' + phone + '\n' : ''}\n${message}\n\nReçu le ${date}`,
          html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f4f8;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f8;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden">
        <tr><td style="background:#1C3F6E;padding:24px 32px">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px">Andrea Simonet-Davin</span>
          <br><span style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:2px;text-transform:uppercase">Psychologue</span>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 20px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px">Nouveau message</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#999;width:80px">De</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:#1a1a2e;font-weight:700">${name}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#999">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px"><a href="mailto:${email}" style="color:#1C3F6E;text-decoration:none">${email}</a></td></tr>
            ${phone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#999">Tél</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:#1a1a2e">${phone}</td></tr>` : ''}
          </table>
          <div style="background:#faf8f2;border-left:3px solid #1C3F6E;padding:16px 20px;border-radius:0 4px 4px 0;margin-bottom:24px">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#333">${message.replace(/\n/g, '<br>')}</p>
          </div>
          <p style="margin:0;font-size:12px;color:#bbb">Reçu le ${date}</p>
        </td></tr>
        <tr><td style="background:#faf8f2;padding:16px 32px;text-align:center">
          <a href="https://simonet-davin.fr/admin/messages" style="color:#1C3F6E;font-size:12px;text-decoration:none;font-weight:700;letter-spacing:0.5px">Voir dans le tableau de bord</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        });
      }
    } catch {}

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Erreur.' }), { status: 500 });
  }
};
