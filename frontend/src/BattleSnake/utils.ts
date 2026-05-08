import type { Rectangle } from "./useGameEngine";

export function myFillRect(ctx: CanvasRenderingContext2D, rect: Rectangle, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function almostSameColor(c1: { r: number, g: number, b: number }, c2: { r: number, g: number, b: number }, tolerance: number = 40) {
  // Euclidean distance
  const distance = Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));

  return distance < tolerance;
}
