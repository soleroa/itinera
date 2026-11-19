import { useEffect, useState } from 'react';

interface WikiSummary {
  thumbnail?: { source: string };
  originalimage?: { source: string };
}

const cache = new Map<string, string | null>();

/** Wikipedia serves thumbnails at arbitrary widths; swap the default ~320px for a hero size. */
function toHeroSize(url: string): string {
  return url.replace(/\/(\d+)px-/, '/1280px-');
}

async function fetchPhoto(destination: string): Promise<string | null> {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(destination.trim())}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as WikiSummary;
  if (data.thumbnail?.source) return toHeroSize(data.thumbnail.source);
  return data.originalimage?.source ?? null;
}

/**
 * A photo of the destination from Wikipedia (free, no API key). Returns null while loading
 * or when there is none, so the UI always has a graceful fallback.
 */
export function useDestinationPhoto(destination: string): string | null {
  const key = destination.trim().toLowerCase();
  const [photo, setPhoto] = useState<string | null>(cache.get(key) ?? null);

  useEffect(() => {
    if (cache.has(key)) {
      setPhoto(cache.get(key) ?? null);
      return;
    }
    let cancelled = false;
    fetchPhoto(destination)
      .catch(() => null)
      .then((url) => {
        cache.set(key, url);
        if (!cancelled) setPhoto(url);
      });
    return () => {
      cancelled = true;
    };
  }, [key, destination]);

  return photo;
}
