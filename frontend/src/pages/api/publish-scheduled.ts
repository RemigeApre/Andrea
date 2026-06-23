export const prerender = false;

import type { APIRoute } from 'astro';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';

export const GET: APIRoute = async () => {
  const token = process.env.DIRECTUS_STATIC_TOKEN || '';
  if (!token) return new Response(JSON.stringify({ published: 0 }), { status: 200 });

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hour = String(now.getHours()).padStart(2, '0') + ':00';

    const res = await fetch(`${DIRECTUS_URL}/items/articles?filter[status][_eq]=scheduled&filter[schedule_date][_lte]=${today}&fields=id,schedule_date,schedule_hour`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return new Response(JSON.stringify({ published: 0 }), { status: 200 });

    const articles = (await res.json()).data ?? [];
    let count = 0;

    for (const a of articles) {
      // Publier si la date est passée, ou si c'est aujourd'hui et l'heure est passée
      const isPast = a.schedule_date < today || (a.schedule_date === today && (a.schedule_hour || '07:00') <= hour);
      if (isPast) {
        await fetch(`${DIRECTUS_URL}/items/articles/${a.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'published', date_published: new Date(`${a.schedule_date}T${a.schedule_hour || '07:00'}:00`).toISOString(), schedule_date: null, schedule_hour: null }),
        });
        count++;
      }
    }

    return new Response(JSON.stringify({ published: count }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Erreur.' }), { status: 500 });
  }
};
