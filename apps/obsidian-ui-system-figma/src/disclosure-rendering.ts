/** CSS -90° turns the observed down chevron right. Figma's angle sign is opposite. */
export function disclosureTransform(x: number, y: number, size: number,
  cssRotation: 0 | -90): Transform {
  if (cssRotation === 0) return [[1, 0, x], [0, 1, y]];
  // Rotate around the SVG's center so its visible 10 × 10 box does not shift.
  return [[0, 1, x], [-1, 0, y + size]];
}

export function placeDisclosure(glyph: InstanceNode, x: number, y: number,
  cssRotation: 0 | -90): void {
  glyph.relativeTransform = disclosureTransform(x, y, glyph.width, cssRotation);
}
