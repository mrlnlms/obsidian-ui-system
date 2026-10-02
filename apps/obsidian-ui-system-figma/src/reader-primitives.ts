export function record(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

export function parseCssPx(value: string): number | null {
  const match = /^([0-9]+(?:\.[0-9]+)?)px$/.exec(value);
  return match ? Number(match[1]) : null;
}
