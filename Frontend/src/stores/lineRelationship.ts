type Point = {
  lat: number
  lon: number
}

type GlobalPoint = {
  lat: number
  lon: number
  globalId: number
}

function crossProduct(a: Point, b: Point): number {
  return a.lat * b.lon - a.lon * b.lat
}

/**
 * Determines if two line segments intersect.
 * 
 * @param a_start - The starting point of the first line segment.
 * @param a_end - The ending point of the first line segment.
 * @param b_start - The starting point of the second line segment.
 * @param b_end - The ending point of the second line segment.
 * @returns A boolean indicating whether the two line segments intersect.
 */
export function doSegmentsIntersect(
  a_start: GlobalPoint,
  a_end: GlobalPoint,
  b_start: GlobalPoint,
  b_end: GlobalPoint
): boolean {
  if (a_start.globalId == b_start.globalId || a_start.globalId == b_end.globalId || a_end.globalId == b_start.globalId || a_end.globalId == b_end.globalId) { 
    return false
  }
  if (
    crossProduct(
      { lat: a_end.lat - a_start.lat, lon: a_end.lon - a_start.lon },
      { lat: b_end.lat - b_start.lat, lon: b_end.lon - b_start.lon }
    ) === 0
  ) {
    return false
  }

  const b =
    crossProduct(
      { lat: a_end.lat - a_start.lat, lon: a_end.lon - a_start.lon },
      { lat: b_start.lat - a_start.lat, lon: b_start.lon - a_start.lon }
    ) /
    crossProduct(
      { lat: b_end.lat - b_start.lat, lon: b_end.lon - b_start.lon },
      { lat: a_end.lat - a_start.lat, lon: a_end.lon - a_start.lon }
    )
  const a = (b_start.lat - a_start.lat + b * (b_end.lat - b_start.lat)) / (a_end.lat - a_start.lat)
  

  if (b < 0 || b > 1 || a < 0 || a > 1) return false
  return true
}
