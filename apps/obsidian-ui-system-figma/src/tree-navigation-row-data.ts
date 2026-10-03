import { readFileExplorerRowImport } from './file-explorer-row-data';
import { readFileExplorerTaggedRows } from './file-explorer-row-tag-data';
import { readFolderRowModels } from './folder-row-data';
import { readFileExplorerViewModel } from './file-explorer-view-data';

/** The shared projection is permitted only where the observed row contracts agree. */
export function readTreeRowEvidence(folderProbe: unknown, activeProbe: unknown,
  taggedProbe: unknown, filesProbe: unknown) {
  const folders = readFolderRowModels(folderProbe);
  const active = readFileExplorerRowImport(activeProbe);
  const tagged = readFileExplorerTaggedRows(taggedProbe);
  const files = readFileExplorerViewModel(filesProbe);
  if (folders.some((row) => row.sample.height !== files.body.rowHeight ||
      row.typography.fontSize !== files.body.fontSize || row.typography.lineHeight !== files.body.lineHeight ||
      row.typography.fontFamily !== files.body.fontFamily || row.typography.fontWeight !== 400 ||
      row.appearance.labelColorCss !== files.body.defaultColor || row.appearance.radius !== 8) ||
      tagged.some((row) => row.sample.height !== files.body.rowHeight ||
        row.labelTypography.fontSize !== files.body.fontSize ||
        row.labelTypography.lineHeight !== files.body.lineHeight ||
        row.labelTypography.fontFamily !== files.body.fontFamily ||
        row.labelTypography.fontWeight !== 400 ||
        row.appearance.labelColorCss !== files.body.defaultColor || row.appearance.radius !== 8) ||
      active.sizePx.height !== files.body.rowHeight || active.typography.fontSize !== files.body.fontSize ||
      active.typography.lineHeight !== files.body.lineHeight ||
      !active.typography.fontFamily.includes('ui-sans-serif') || active.typography.fontWeight !== 400 ||
      active.appearance.radius !== 8) {
    throw new Error('Tree Row: anatomia observada diverge entre Folder, File e Tagged File.');
  }
  return { folders, active, tagged, files };
}
