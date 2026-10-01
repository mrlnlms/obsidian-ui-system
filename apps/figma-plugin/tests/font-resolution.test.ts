import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fontFamilies, requiredFont } from '../src/font-resolution';

const macButton = {
  cssStack: '"??", "??", ui-sans-serif, -apple-system, "system-ui", system-ui, "Google Sans Flex", Inter',
  platform: 'macos', weight: 400, style: 'normal',
};

test('ignores Obsidian sentinel and resolves macOS system text to the exact Figma named instance', () => {
  assert.deepEqual(fontFamilies(macButton.cssStack).slice(0, 2), ['ui-sans-serif', '-apple-system']);
  assert.deepEqual(requiredFont(macButton, [
    { family: 'Google Sans Flex', style: 'Regular' },
    { family: 'SF Pro', style: 'Regular', variationSettings: { opsz: 14, wght: 400 } },
  ]), { family: 'SF Pro', style: 'Regular' });
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
