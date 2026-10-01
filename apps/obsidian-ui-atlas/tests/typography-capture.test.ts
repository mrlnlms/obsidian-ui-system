import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withoutObsidianSentinel } from '../src/typography-capture';

test('removes only the exact Obsidian no-override sentinel', () => {
  assert.equal(withoutObsidianSentinel("'??', '??', ui-sans-serif, -apple-system, 'Example Family'"),
    "ui-sans-serif, -apple-system, 'Example Family'");
  assert.equal(withoutObsidianSentinel("'??'"), '');
  assert.equal(withoutObsidianSentinel("'A??', 'Example Family'"), "'A??', 'Example Family'");
});
