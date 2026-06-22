const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';

export async function fetchItems<T>(collection: string, params?: Record<string, string>): Promise<T[]> {
  const url = new URL(`/items/${collection}`, DIRECTUS_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Directus error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function fetchSingleton<T>(collection: string): Promise<T> {
  const url = new URL(`/items/${collection}`, DIRECTUS_URL);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Directus error: ${res.status}`);
  const json = await res.json();
  return json.data;
}
