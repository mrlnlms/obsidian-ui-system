import { readFolderRowModels } from './folder-row-data';
import { type FilesRow } from './file-explorer-view-data';
import { fontFailure, requiredFont } from './font-resolution';
import { readTreeRowEvidence } from './tree-navigation-row-data';
import { bindObservedGlyphPaint, boundColorPaint, observedGlyphPaint,
  type PrimitiveVariables } from './primitive-theme';

export interface TreeRowLibrary {
  set: ComponentSetNode;
  labelProperty: string;
  metadataProperty: string;
  metadataVisibleProperty: string;
  create(row: FilesRow): InstanceNode;
}

/** One native anatomy for the observed Folder/File rows; metadata is content. */
export async function createTreeRowLibrary(folderProbe: unknown, activeProbe: unknown,
  taggedProbe: unknown, filesProbe: unknown, theme: PrimitiveVariables): Promise<TreeRowLibrary> {
  const { folders, active, tagged, files } = readTreeRowEvidence(folderProbe, activeProbe,
    taggedProbe, filesProbe);
  const available = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
  const font = requiredFont({ cssStack: files.body.fontFamily, platform: 'macos', weight: 400,
    style: 'normal' }, available);
  const tagFont = requiredFont({ cssStack: tagged[0]!.tagTypography.fontFamily, platform: 'macos',
    weight: tagged[0]!.tagTypography.fontWeight, style: tagged[0]!.tagTypography.fontStyle }, available);
  for (const face of [font, tagFont]) {
    try { await figma.loadFontAsync(face); }
    catch { throw fontFailure(face, `Required font could not be loaded: ${face.family} / ${face.style}.`); }
  }
  const specs = [
    ...folders.map((row) => ({ kind: 'Folder' as const, depth: row.depth, state: row.state,
      label: row.label, disclosure: row })),
    { kind: 'File' as const, depth: 0, state: 'Selected', label: active.label },
    { kind: 'File' as const, depth: 0, state: 'Default', label: 'File' },
    { kind: 'File' as const, depth: 2, state: 'Default', label: tagged[0]!.label },
    { kind: 'File' as const, depth: 3, state: 'Default', label: 'File' },
  ];
  const labels: TextNode[] = [];
  let metadataText: TextNode | undefined;
  let metadataFrame: FrameNode | undefined;
  const variants = specs.map((spec) => {
    const row = figma.createComponent();
    row.name = `Kind=${spec.kind}, Depth=${spec.depth}, State=${spec.state}`;
    row.description = 'Dark/Light por Variables. Label editável, ellipsis, indentação e metadata opcional.';
    const sampleWidth = 'disclosure' in spec && spec.disclosure ? spec.disclosure.sample.width :
      spec.state === 'Selected' ? active.sizePx.width :
      spec.depth === 2 ? tagged[0]!.sample.width : files.width - files.body.paddingX * 2;
    row.resize(sampleWidth, files.body.rowHeight);
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'FIXED';
    row.counterAxisAlignItems = 'CENTER';
    row.paddingLeft = 24 + 17 * spec.depth;
    row.paddingRight = 8;
    row.itemSpacing = 0;
    row.cornerRadius = theme.dark.radii.mediumRadius;
    row.setBoundVariable('cornerRadius', theme.radii.mediumRadius);
    row.fills = [];
    row.strokes = [];
    row.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
    if (spec.state === 'Selected') {
      const selection = figma.createRectangle();
      selection.name = 'Selection background';
      row.appendChild(selection);
      selection.layoutPositioning = 'ABSOLUTE';
      selection.resize(row.width, row.height);
      selection.x = 0;
      selection.y = 0;
      selection.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
      selection.cornerRadius = theme.dark.radii.mediumRadius;
      selection.setBoundVariable('cornerRadius', theme.radii.mediumRadius);
      selection.fills = [boundColorPaint(theme.dark.colors.rowSelectedBackground,
        theme.colors.rowSelectedBackground)];
      selection.strokes = [];
      selection.opacity = theme.dark.selectedOpacity;
    }
    const label = figma.createText();
    label.name = 'Label';
    row.appendChild(label);
    label.fontName = font;
    label.fontSize = files.body.fontSize;
    label.lineHeight = { unit: 'PIXELS', value: files.body.lineHeight };
    const textKey = spec.state === 'Selected' ? 'rowSelectedText' : 'rowDefaultText';
    label.fills = [boundColorPaint(theme.dark.colors[textKey], theme.colors[textKey])];
    label.characters = spec.label;
    label.textAutoResize = 'NONE';
    label.resize(Math.max(1, row.width - row.paddingLeft - row.paddingRight), files.body.lineHeight);
    label.textTruncation = 'ENDING';
    label.layoutGrow = 1;
    label.minWidth = 1;
    if (label.hasMissingFont || label.width <= 0 || label.height <= 0) {
      throw fontFailure(font, 'Tree Row: Label não renderizou.');
    }
    labels.push(label);
    if ('disclosure' in spec && spec.disclosure) {
      const observed = spec.disclosure;
      const icon = figma.createNodeFromSvg(disclosureSvg(observed));
      icon.name = 'Disclosure';
      row.appendChild(icon);
      icon.layoutPositioning = 'ABSOLUTE';
      icon.resize(observed.sample.svgSize.width, observed.sample.svgSize.height);
      icon.x = observed.sample.svgOffset.x;
      icon.y = observed.sample.svgOffset.y;
      let disclosureBindings = 0;
      for (const node of [icon, ...icon.findAll(() => true)]) {
        if ('fills' in node && node.fills !== figma.mixed) {
          const paints = node.fills as readonly Paint[];
          disclosureBindings += paints.filter((paint) =>
            observedGlyphPaint(paint, theme.dark.colors.disclosure)).length;
          node.fills = paints.map((paint) => observedGlyphPaint(paint, theme.dark.colors.disclosure)
            ? bindObservedGlyphPaint(paint, theme.colors.disclosure)
            : paint);
        }
        if ('strokes' in node) {
          const paints = node.strokes as readonly Paint[];
          disclosureBindings += paints.filter((paint) =>
            observedGlyphPaint(paint, theme.dark.colors.disclosure)).length;
          node.strokes = paints.map((paint) => observedGlyphPaint(paint, theme.dark.colors.disclosure)
            ? bindObservedGlyphPaint(paint, theme.colors.disclosure)
            : paint);
        }
      }
      if (!disclosureBindings) throw new Error('Tree Row: disclosure sem paint vinculável.');
    }
    if (spec.kind === 'File' && spec.depth === 2) {
      const tag = figma.createFrame();
      tag.name = 'Metadata';
      row.appendChild(tag);
      tag.layoutMode = 'HORIZONTAL';
      tag.primaryAxisSizingMode = 'AUTO';
      tag.counterAxisSizingMode = 'AUTO';
      tag.counterAxisAlignItems = 'CENTER';
      tag.paddingLeft = tagged[0]!.appearance.tagPaddingX;
      tag.paddingRight = tagged[0]!.appearance.tagPaddingX;
      tag.cornerRadius = theme.dark.radii.metadataRadius;
      tag.setBoundVariable('cornerRadius', theme.radii.metadataRadius);
      tag.fills = [];
      tag.strokes = [];
      const text = figma.createText();
      text.name = 'Metadata text';
      tag.appendChild(text);
      text.fontName = tagFont;
      text.fontSize = tagged[0]!.tagTypography.fontSize;
      text.lineHeight = { unit: 'PIXELS', value: tagged[0]!.tagTypography.lineHeight };
      text.letterSpacing = { unit: 'PIXELS', value: tagged[0]!.tagTypography.letterSpacing };
      text.fills = [boundColorPaint(theme.dark.colors.metadata, theme.colors.metadata)];
      text.characters = 'JSON';
      text.textAutoResize = 'WIDTH_AND_HEIGHT';
      metadataFrame = tag;
      metadataText = text;
    }
    return row;
  });
  const set = figma.combineAsVariants(variants, figma.currentPage);
  set.name = 'Obsidian / Tree Navigation Row';
  set.description = 'Folder/File compartilham altura, seleção, radius, tipografia, ellipsis e indentação. Dark/Light por Variables; extensão é metadata opcional.';
  const labelProperty = set.addComponentProperty('Label', 'TEXT', specs[0]!.label);
  labels.forEach((label) => { label.componentPropertyReferences = { characters: labelProperty }; });
  const metadataProperty = set.addComponentProperty('Metadata', 'TEXT', 'JSON');
  const metadataVisibleProperty = set.addComponentProperty('Show metadata', 'BOOLEAN', true);
  if (!metadataText || !metadataFrame) throw new Error('Tree Row: metadata observada ausente.');
  metadataText.componentPropertyReferences = { characters: metadataProperty };
  metadataFrame.componentPropertyReferences = { visible: metadataVisibleProperty };
  variants.forEach((variant, index) => { variant.x = 20; variant.y = 20 + index * 45; });
  set.resizeWithoutConstraints(Math.max(...variants.map((node) => node.width)) + 40,
    20 + variants.length * 45);
  set.x = figma.currentPage.children.filter((node) => node !== set)
    .map((node) => node.absoluteBoundingBox).filter((box): box is Rect => box !== null)
    .reduce((right, box) => Math.max(right, box.x + box.width), 0) + 64;
  set.y = 0;
  if (set.componentPropertyDefinitions.Kind?.type !== 'VARIANT' ||
      set.componentPropertyDefinitions.Depth?.type !== 'VARIANT' ||
      set.componentPropertyDefinitions.State?.type !== 'VARIANT' ||
      set.componentPropertyDefinitions[labelProperty]?.type !== 'TEXT' ||
      set.componentPropertyDefinitions[metadataVisibleProperty]?.type !== 'BOOLEAN') {
    throw new Error('Tree Row: propriedades do Component Set ausentes.');
  }
  return { set, labelProperty, metadataProperty, metadataVisibleProperty,
    create(item) {
      const kind = item.kind === 'folder' ? 'Folder' : 'File';
      const state = item.kind === 'folder' ? item.state : 'Default';
      const variant = set.children.find((node): node is ComponentNode => node.type === 'COMPONENT' &&
        node.variantProperties?.Kind === kind && node.variantProperties?.Depth === String(item.depth) &&
        node.variantProperties?.State === state);
      if (!variant) throw new Error(`Tree Row: ${kind}/${item.depth}/${state} ausente.`);
      const instance = variant.createInstance();
      instance.setProperties({ [labelProperty]: item.label });
      if (item.kind === 'tagged') {
        instance.setProperties({ [metadataProperty]: item.tag!.toUpperCase(),
          [metadataVisibleProperty]: true });
      } else if (item.kind === 'file' && item.depth === 2) {
        instance.setProperties({ [metadataVisibleProperty]: false });
      }
      instance.name = `${kind} / ${item.label}`;
      return instance;
    } };
}

function disclosureSvg(row: ReturnType<typeof readFolderRowModels>[number]): string {
  const d = row.disclosure;
  const color = row.appearance.disclosureColorCss;
  const transform = d.rotationDeg === -90 ? ' transform="rotate(-90 12 12)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="${d.viewBox}" ` +
    `fill="none" stroke="${color}" stroke-width="${d.strokeWidth}" ` +
    `stroke-linecap="${d.strokeLinecap}" stroke-linejoin="${d.strokeLinejoin}">` +
    `<g${transform}><path d="${d.path}"/></g></svg>`;
}
