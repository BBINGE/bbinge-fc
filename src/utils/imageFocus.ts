import focalData from '../data/image-focal-points.json';

type FocusPoint = { x: number; y: number; faceWidth?: number };
const points = focalData.points as Record<string, FocusPoint>;

export function imageFocusStyle(src?: string) {
  if (!src) return undefined;
  const point = points[src];
  return point ? `object-position:${point.x}% ${point.y}%` : undefined;
}
