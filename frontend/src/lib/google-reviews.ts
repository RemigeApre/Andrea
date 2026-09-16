const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_ID = process.env.GOOGLE_PLACE_ID;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — évite d'appeler l'API Google à chaque visite

export interface GoogleReview {
  authorName: string;
  profilePhotoUrl?: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface GoogleReviewsData {
  rating: number | null;
  userRatingCount: number | null;
  mapsUrl: string | null;
  reviews: GoogleReview[];
}

let cache: { data: GoogleReviewsData; expiresAt: number } | null = null;

export async function fetchGoogleReviews(): Promise<GoogleReviewsData | null> {
  if (!API_KEY || !PLACE_ID) return null;
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', PLACE_ID);
    url.searchParams.set('fields', 'rating,user_ratings_total,reviews,url');
    url.searchParams.set('language', 'fr');
    url.searchParams.set('key', API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== 'OK' || !json.result) return null;

    const reviews: GoogleReview[] = (json.result.reviews || [])
      .filter((r: any) => typeof r.text === 'string' && r.text.trim().length > 0)
      .map((r: any) => ({
        authorName: r.author_name,
        profilePhotoUrl: r.profile_photo_url,
        rating: r.rating,
        text: r.text,
        relativeTime: r.relative_time_description,
      }));

    if (reviews.length === 0) return null;

    const data: GoogleReviewsData = {
      rating: json.result.rating ?? null,
      userRatingCount: json.result.user_ratings_total ?? null,
      mapsUrl: json.result.url ?? null,
      reviews,
    };

    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  } catch {
    return null;
  }
}
