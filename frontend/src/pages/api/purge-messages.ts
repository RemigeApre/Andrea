export const prerender = false;

import type { APIRoute } from 'astro';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 3 mois

export const GET: APIRoute = async () => {
  try {
    const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();

    // Lire les messages à purger (publics en lecture)
    const res = await fetch(`${DIRECTUS_URL}/items/messages?filter[date_created][_lt]=${cutoff}&fields=id&limit=500`);
    if (!res.ok) return new Response(JSON.stringify({ purged: 0 }), { status: 200 });

    const { data } = await res.json();
    if (!data?.length) return new Response(JSON.stringify({ purged: 0 }), { status: 200 });

    const token = process.env.DIRECTUS_STATIC_TOKEN || '';
    if (!token) return new Response(JSON.stringify({ error: 'No token' }), { status: 500 });

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
