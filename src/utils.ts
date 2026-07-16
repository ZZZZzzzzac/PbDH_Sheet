export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampInt(value: number, min: number, max: number | null): number {
  if (value < min) {
    return min;
  }
  if (max !== null && value > max) {
    return max;
  }
  return value;
}

export function generateId(prefix: string): string {
  return `${prefix}${crypto.randomUUID()}`;
}

export function inferMimeType(path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }
  if (lowerPath.endsWith(".gif")) {
    return "image/gif";
  }
  if (lowerPath.endsWith(".avif")) {
    return "image/avif";
  }
  if (lowerPath.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (lowerPath.endsWith(".json")) {
    return "application/json";
  }
  if (lowerPath.endsWith(".txt")) {
    return "text/plain";
  }
  return "application/octet-stream";
}
