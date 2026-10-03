import type { FilesRow } from './file-explorer-view-data';

export interface TreeGuideSegment { x: number; y: number; height: number; depth: number }

/** A guide is the left border of an expanded folder's children container. */
export function treeGuideSegments(rows: readonly FilesRow[], rowHeight: number, rowGap: number,
  paddingTop: number, paddingX: number): TreeGuideSegment[] {
  const segments: TreeGuideSegment[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    if (row.kind !== 'folder' || row.state !== 'Expanded') continue;
    let end = index + 1;
    while (end < rows.length && rows[end]!.depth > row.depth) end++;
    const descendants = end - index - 1;
    if (!descendants) continue;
    segments.push({ depth: row.depth,
      x: paddingX + 12 + 17 * row.depth,
      y: paddingTop + (index + 1) * (rowHeight + rowGap),
      height: descendants * rowHeight + (descendants - 1) * rowGap });
  }
  return segments;
}
