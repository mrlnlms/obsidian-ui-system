import { readPackageVersion, readButtonV2Package, type ButtonV2Package } from './button-v2-package';
import { prepareButtonNormalBinding } from './button-normal-binding';
import { generateBoundButtonNormal } from './button-normal-generation';
import type { DiagnosticInput } from './button-binding-evidence';
import { generateFullUiKit } from './full-ui-kit-generation';
import { readFigmaPackage, type ImportedPackage } from './package-data';

figma.showUI(__html__, { width: 400, height: 420 });

let importedPackage: ImportedPackage | undefined;
let importedButtonV2: ButtonV2Package | undefined;
let currentRequest = 0;

figma.ui.onmessage = async (message: unknown) => {
  if (isClearPackageMessage(message)) {
    if (message.requestId >= currentRequest) {
      currentRequest = message.requestId;
      importedPackage = undefined;
      importedButtonV2 = undefined;
    }
    return;
  }
  if (isLoadPackageMessage(message)) {
    if (message.requestId < currentRequest) return;
    currentRequest = message.requestId;
    importedPackage = undefined;
    importedButtonV2 = undefined;
    try {
      const bytes = message.bytes instanceof Uint8Array ? message.bytes :
        message.bytes instanceof ArrayBuffer ? new Uint8Array(message.bytes) : null;
      if (!bytes) throw new Error('Figma Package inválido: dados do ZIP ausentes.');
      const version = readPackageVersion(bytes);
      if (version === 1) importedPackage = readFigmaPackage(bytes);
      else importedButtonV2 = readButtonV2Package(bytes);
      figma.ui.postMessage({ type: 'package-ready', requestId: currentRequest,
        version, summary: (importedPackage ?? importedButtonV2)!.summary });
    } catch (error) {
      figma.ui.postMessage({ type: 'package-error', requestId: currentRequest,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (isGenerateBoundButtonMessage(message)) {
    if (!importedButtonV2) {
      figma.ui.postMessage({ type: 'result', ok: false, text: 'Selecione um Figma Package v2 válido.' });
      return;
    }
    try {
      const prepared = prepareButtonNormalBinding(importedButtonV2, message.diagnostics);
      const report = await generateBoundButtonNormal(prepared);
      figma.ui.postMessage({ type: 'result', ok: true,
        text: `Button normal criado com Variables vinculadas. Component ${report.componentId}; collection ${report.collectionId}.`,
        report });
    } catch (error) {
      figma.ui.postMessage({ type: 'result', ok: false,
        text: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (!isGenerateUiKitMessage(message)) return;
  if (!importedPackage) {
    figma.ui.postMessage({ type: 'result', ok: false,
      text: 'Selecione um Figma Package v1 válido antes de gerar o UI Kit.' });
    return;
  }
  try {
    const result = await generateFullUiKit(importedPackage);
    figma.ui.postMessage({ type: 'result', ok: true,
      text: `UI Kit Dark criado: Button, Search, File Explorer rows, Folder rows, ` +
        `View Header, Workspace Tab, Side Panel, ${result.searchView.name} e ` +
        `${result.filesView.name}. Search e Files estão em previews separados do Side Panel.` });
  } catch (error) {
    figma.ui.postMessage({ type: 'result', ok: false,
      text: error instanceof Error ? error.message : String(error) });
  }
};

function isGenerateUiKitMessage(value: unknown): value is { type: 'generate-ui-kit' } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'generate-ui-kit';
}

function isGenerateBoundButtonMessage(value: unknown): value is {
  type: 'generate-bound-button'; diagnostics: DiagnosticInput[];
} {
  return typeof value === 'object' && value !== null && 'type' in value &&
    value.type === 'generate-bound-button' && 'diagnostics' in value && Array.isArray(value.diagnostics);
}

function isClearPackageMessage(value: unknown): value is { type: 'clear-package'; requestId: number } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'clear-package' &&
    'requestId' in value && typeof value.requestId === 'number' &&
    Number.isSafeInteger(value.requestId) && value.requestId >= 0;
}

function isLoadPackageMessage(value: unknown): value is { type: 'load-package'; requestId: number; bytes: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'load-package' &&
    'requestId' in value && typeof value.requestId === 'number' &&
    Number.isSafeInteger(value.requestId) && value.requestId >= 0 && 'bytes' in value;
}
