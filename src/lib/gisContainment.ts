/**
 * NAFAS | نَفَس — GIS Containment & Point-in-Polygon (Ray-Casting Algorithm)
 * Used to verify whether geographic coordinates fall strictly within administrative polygon boundaries.
 */

export function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findGovernorateForPoint(lat: number, lng: number, governoratesGisData: Array<{ id: string; polygon: [number, number][] }>): string {
  for (const g of governoratesGisData) {
    if (isPointInPolygon(lat, lng, g.polygon)) {
      return g.id;
    }
  }
  return 'pending_review';
}
