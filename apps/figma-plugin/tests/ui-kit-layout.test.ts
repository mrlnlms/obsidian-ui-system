import assert from 'node:assert/strict';
import test from 'node:test';
import { planUiKitPlacement } from '../src/ui-kit-layout';

test('places Actions and Inputs beside each other and puts the next run in free space', () => {
  const existing = [{ x: -200, y: -100, width: 700, height: 600 }];
  const first = planUiKitPlacement(existing, { width: 180, height: 190 }, { width: 280, height: 140 });
  assert.ok(first.actions.x > existing[0].x + existing[0].width);
  assert.ok(first.inputs.x > first.actions.x + first.actions.width);
  assert.ok(first.actions.width >= 180 + first.inset * 2);
  assert.ok(first.actions.height >= 190 + first.inset * 2);
  assert.ok(first.inputs.width >= 280 + first.inset * 2);
  assert.ok(first.inputs.height >= 140 + first.inset * 2);

  const second = planUiKitPlacement([...existing, first.actions, first.inputs],
    { width: 180, height: 190 }, { width: 280, height: 140 });
  assert.ok(second.actions.x > first.inputs.x + first.inputs.width);
  assert.deepEqual(second, planUiKitPlacement([...existing, first.actions, first.inputs],
    { width: 180, height: 190 }, { width: 280, height: 140 }));
});
