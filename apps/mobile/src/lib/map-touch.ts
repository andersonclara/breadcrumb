import { panCamera, screenToWorld, zoomCamera, type MapCamera, type MapSize, type Point } from './map-gesture';

export type PanTouch = { translationX: number; translationY: number; numberOfPointers: number };
export type PanAnchor = { x: number; y: number; pointers: number };
export function panTouchAnchor(event: PanTouch): PanAnchor {
  'worklet';
  return { x: event.translationX, y: event.translationY, pointers: event.numberOfPointers };
}
export function movePan(camera: MapCamera, previous: PanAnchor, event: PanTouch, size: MapSize, pinching: boolean) {
  'worklet';
  // A new finger changes the touch centroid. Rebase instead of treating that jump as a drag.
  if (pinching || event.numberOfPointers < 1 || event.numberOfPointers > 2 || previous.pointers !== event.numberOfPointers) return camera;
  return panCamera(camera, { x: event.translationX - previous.x, y: event.translationY - previous.y }, size);
}

export type PinchTouch = { focalX: number; focalY: number; scale: number; numberOfPointers: number };
export type PinchAnchor = { zoom: number; scale: number; point: Point; pointers: number };
export function pinchTouchAnchor(camera: MapCamera, event: PinchTouch, size: MapSize): PinchAnchor {
  'worklet';
  return { zoom: camera.zoom, scale: event.scale, pointers: event.numberOfPointers,
    point: screenToWorld(camera, { x: event.focalX, y: event.focalY }, size) };
}
export function movePinch(camera: MapCamera, anchor: PinchAnchor | null, event: PinchTouch, size: MapSize) {
  'worklet';
  // Native pinch teardown can report a one-finger focal point (or 0,0).
  if (event.numberOfPointers < 2 || !Number.isFinite(event.scale) || event.scale <= 0 ||
    !Number.isFinite(event.focalX) || !Number.isFinite(event.focalY)) return { camera, anchor: null };
  if (!anchor || anchor.pointers !== event.numberOfPointers)
    return { camera, anchor: pinchTouchAnchor(camera, event, size) };
  return { camera: zoomCamera(anchor.zoom, event.scale / anchor.scale, anchor.point,
    { x: event.focalX, y: event.focalY }, size), anchor };
}
