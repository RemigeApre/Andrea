export const prerender = false;

import type { APIRoute } from 'astro';

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL || 'http://localhost:8056';
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 3 mois

export const GET: APIRoute = async () => {
  try {
    const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();

    // Lire les messages à purger (publics en lecture)
    const res = await fetch(`${DIRECTUS_URL}/items/messages?filter[date_created][_lt]=${cutoff}&fields=id&limit=500`);
    if (!res.ok) return new Response(JSON.stringify({ purged: 0 }), { status: 200 });

    const { data } = await res.json();
    if (!data?.length) return new Response(JSON.stringify({ purged: 0 }), { status: 200 });

    // Token admin pour supprimer
    const authRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: import.meta.env.ADMIN_EMAIL || 'andrea@simonetdavin.fr',
        password: import.meta.env.ADMIN_PASSWORD || 'changeme123',
      }),
    });
    if (!authRes.ok) return new Response(JSON.stringify({ error: 'Auth failed' }), { status: 500 });
    const token = (await authRes.json()).data.access_token;

    const ids = data.map((m: any) => m.id);
    await fetch(`${DIRECTUS_URL}/items/messages`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(ids),
    });

    return new Response(JSON.stringify({ purged: ids.length }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Erreur.' }), { status: 500 });
  }
};
