import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fontFamilies, requiredFont, selectTypography } from '../src/font-resolution';

const macButton = {
  cssStack: '"??", "??", ui-sans-serif, -apple-system, "system-ui", system-ui, "Google Sans Flex", Inter',
  platform: 'macos', weight: 400, style: 'normal',
};

test('ignores Obsidian sentinel and preserves the exact Figma FontName', () => {
  assert.deepEqual(fontFamilies(macButton.cssStack).slice(0, 2), ['ui-sans-serif', '-apple-system']);
  assert.deepEqual(requiredFont(macButton, [
    { family: 'Google Sans Flex', style: 'Regular' },
    { family: 'SF Pro', style: 'Regular', variationSettings: { opsz: 14, wght: 400 } },
  ]), { family: 'SF Pro', style: 'Regular', variationSettings: { opsz: 14, wght: 400 } });
});

test('fails before generation when required family or style is unavailable', () => {
  assert.throws(() => requiredFont(macButton, [{ family: 'Google Sans Flex', style: 'Regular' }]),
    /Required font not available: SF Pro \/ Regular/);
  assert.throws(() => requiredFont(macButton, [{ family: 'SF Pro', style: 'Bold' }]),
    /Required font not available: SF Pro \/ Regular/);
});

test('requires the first explicit family and the corresponding weight', () => {
  const request = { ...macButton, cssStack: '"Example Family", ui-sans-serif, Inter', weight: 600 };
  assert.deepEqual(requiredFont(request, [
    { family: 'Example Family', style: 'Semibold' },
    { family: 'SF Pro', style: 'Semibold' },
  ]), { family: 'Example Family', style: 'Semibold' });
  assert.throws(() => requiredFont(request, [{ family: 'SF Pro', style: 'Semibold' }]),
    /Required font not available: Example Family \/ Semibold/);
});

test('does not infer unsupported generic stacks or uncaptured font style', () => {
  assert.throws(() => requiredFont({ ...macButton, platform: 'windows' }, []), /não possui mapeamento validado/);
  assert.throws(() => requiredFont({ ...macButton, style: null }, []), /fontStyle ausente/);
});

test('Lab mode declares a fixed placeholder and never resolves the Obsidian stack', () => {
  const fonts = [{ family: 'SF Pro', style: 'Regular' }, { family: 'Inter', style: 'Regular' }];
  assert.deepEqual(selectTypography(macButton, fonts, 'lab'), {
    status: 'lab-placeholder', resolved: null, rendered: { family: 'Inter', style: 'Regular' },
  });
  assert.deepEqual(selectTypography(macButton, fonts, 'strict'), {
    status: 'resolved', resolved: fonts[0], rendered: fonts[0],
  });
  assert.throws(() => selectTypography(macButton, fonts.slice(0, 1), 'lab'), /Lab placeholder font not available/);
});
