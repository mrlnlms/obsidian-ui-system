/** Only the near-neutral oklch(... none / alpha) recorded for the active Dark row. */
export function fileExplorerBackgroundPaint(css: string): SolidPaint {
  const match = /^oklch\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?) none \/ (\d+(?:\.\d+)?)\)$/.exec(css);
  if (!match) throw new Error('File Explorer row: background CSS não suportado.');
  const lightness = Number(match[1]);
  const chroma = Number(match[2]);
  const alpha = Number(match[3]);
  if (lightness > 1 || chroma > 0.0001 || alpha > 1) {
    throw new Error('File Explorer row: background CSS fora do caso observado.');
  }

  // A missing hue renders as 0deg in CSS. Convert this near-neutral Oklab value
  // to encoded sRGB; keep alpha on the paint so the canvas can show through.
  const l = (lightness + 0.3963377774 * chroma) ** 3;
  const m = (lightness - 0.1055613458 * chroma) ** 3;
  const s = (lightness - 0.0894841775 * chroma) ** 3;
  const encode = (linear: number): number => {
    const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, encoded));
  };
  return {
    type: 'SOLID',
    color: {
      r: encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      g: encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      b: encode(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
    },
    opacity: alpha,
  };
}
