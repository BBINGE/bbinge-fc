import focalData from '../data/image-focal-points.json';

type FocusPoint = { x: number; y: number; faceWidth?: number; scale?: number };
const points = focalData.points as Record<string, FocusPoint>;

export function imageFocusStyle(src?: string) {
  if (!src) return undefined;
  const point = points[src];
  if (!point) return undefined;
  const scale = point.scale ?? 1;
  return `object-position:${point.x}% ${point.y}%;transform-origin:${point.x}% ${point.y}%;scale:${scale}`;
}
