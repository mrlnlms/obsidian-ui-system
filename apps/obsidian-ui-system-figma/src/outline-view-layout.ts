import type { OutlineRow } from './outline-view-data';

export interface OutlineBranch { row: OutlineRow; children: OutlineBranch[] }

/** Preserve the observed heading nesting instead of positioning guide segments by row index. */
export function outlineHierarchy(rows: readonly OutlineRow[]): OutlineBranch[] {
  const roots: OutlineBranch[] = [];
  const stack: OutlineBranch[] = [];
  for (const row of rows) {
    while (stack.length > row.depth) stack.pop();
    if (stack.length !== row.depth ||
        (row.depth > 0 && !stack[row.depth - 1]!.row.hasChildren)) {
      throw new Error(`Outline View: hierarquia inválida em profundidade ${row.depth}.`);
    }
    const branch = { row, children: [] } as OutlineBranch;
    (stack.length ? stack[stack.length - 1]!.children : roots).push(branch);
    stack.push(branch);
  }
  return roots;
}

export interface OutlineLayoutRow {
  y: number;
  height: number;
  labelHeight: number;
  labelLength: number;
}

/** Reject a layout that looks plausible in node bounds but paints text over the next row. */
export function assertOutlineLayout(rows: readonly OutlineLayoutRow[],
  gap: number, lineHeight: number, width: number): void {
  const invalid = rows.findIndex((row, index) =>
    row.height + 0.5 < row.labelHeight + 8 ||
    (row.labelLength > 70 && row.labelHeight < lineHeight * 2 - 0.5) ||
    (index > 0 && row.y + 0.5 < rows[index - 1]!.y + rows[index - 1]!.height + gap));
  if (rows.length !== 4 || invalid >= 0) {
    throw new Error(`Outline View: linhas não acompanham o texto em ${width} px: ` +
      JSON.stringify({ invalid, rows }));
  }
}
