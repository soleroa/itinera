export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function centroid(points: LatLng[]): LatLng {
  return {
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  };
}

/**
 * Splits places into at most `days` groups of nearby places (k-means with a
 * deterministic farthest-point start and a per-day capacity so no day is overloaded).
 * Deterministic: the same input always gives the same days.
 */
export function clusterIntoDays<T extends LatLng>(
  items: T[],
  days: number,
): T[][] {
  const k = Math.min(Math.max(days, 1), items.length);
  if (k === 0) return [];
  if (k === 1) return [items];

  const capacity = Math.ceil(items.length / k);

  // Farthest-point initialization.
  const mean = centroid(items);
  const seeds: LatLng[] = [
    items.reduce((far, p) =>
      haversineKm(p, mean) > haversineKm(far, mean) ? p : far,
    ),
  ];
  while (seeds.length < k) {
    const next = items.reduce((best, p) => {
      const d = Math.min(...seeds.map((s) => haversineKm(p, s)));
      const bestD = Math.min(...seeds.map((s) => haversineKm(best, s)));
      return d > bestD ? p : best;
    });
    seeds.push(next);
  }

  let centers: LatLng[] = seeds.map((s) => ({ lat: s.lat, lng: s.lng }));
  let groups: T[][] = [];
  for (let iteration = 0; iteration < 10; iteration++) {
    groups = centers.map(() => []);
    // Assign the places closest to a center first; skip centers that are full.
    const order = items
      .map((item) => ({
        item,
        nearest: Math.min(...centers.map((c) => haversineKm(item, c))),
      }))
      .sort((a, b) => a.nearest - b.nearest);
    for (const { item } of order) {
      const target = centers
        .map((c, index) => ({ index, distance: haversineKm(item, c) }))
        .filter(({ index }) => groups[index].length < capacity)
        .sort((a, b) => a.distance - b.distance)[0];
      groups[target.index].push(item);
    }
    const next = groups.map((g, i) => (g.length > 0 ? centroid(g) : centers[i]));
    const moved = next.some((c, i) => haversineKm(c, centers[i]) > 0.001);
    centers = next;
    if (!moved) break;
  }
  return groups.filter((g) => g.length > 0);
}

/** Orders places by repeatedly visiting the nearest unvisited one, starting from `start`. */
export function nearestNeighborOrder<T extends LatLng>(
  start: LatLng,
  items: T[],
): T[] {
  const remaining = [...items];
  const ordered: T[] = [];
  let current = start;
  while (remaining.length > 0) {
    let bestIndex = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (
        haversineKm(current, remaining[i]) <
        haversineKm(current, remaining[bestIndex])
      ) {
        bestIndex = i;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
}
