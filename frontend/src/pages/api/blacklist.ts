export const prerender = false;

import type { APIRoute } from 'astro';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN || '';

export const GET: APIRoute = async () => {
  const res = await fetch(`${DIRECTUS_URL}/items/blacklist?sort=-date_created`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  const { data } = await res.json();
  return new Response(JSON.stringify(data ?? []), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const res = await fetch(`${DIRECTUS_URL}/items/blacklist`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return new Response(JSON.stringify({ ok: res.ok }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request }) => {
  const { id } = await request.json();
  await fetch(`${DIRECTUS_URL}/items/blacklist/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN}` } });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
