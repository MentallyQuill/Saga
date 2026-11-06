import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLoredeckWorkbenchViewLifetime } from '../../src/loredecks/loredeck-workbench-view-lifetime.js';

test('closed workbenches cannot own asynchronous session, view, or source work', () => {
  const life = createLoredeckWorkbenchViewLifetime();
  assert.equal(life.captureSession(), null);
  assert.equal(life.isSessionCurrent(null), false);
  assert.equal(life.isViewCurrent(null), false);
  assert.equal(life.isSourceCurrent(null), false);
  assert.equal(life.beginSource('deck-a'), null);
});

test('tab changes invalidate pending view imports but preserve active-deck source loads', () => {
  const life = createLoredeckWorkbenchViewLifetime();
  life.open('deck-a');
  const session = life.captureSession();
  const host = { isConnected: true };
  const pendingImport = life.captureView(host);
  const source = life.beginSource('deck-a', session);
  assert.equal(session.packId, 'deck-a');
  assert.equal(life.isViewCurrent(pendingImport), true);
  assert.equal(life.isSourceCurrent(source), true);
  life.invalidateView();
  assert.equal(life.isViewCurrent(pendingImport), false);
  assert.equal(life.isSessionCurrent(session), true);
  assert.equal(life.isSourceCurrent(source), true);
  const remount = life.captureView(host);
  assert.equal(life.isViewCurrent(remount), true);
  assert.equal(life.isViewCurrent(pendingImport), false);
  host.isConnected = false;
  assert.equal(life.isViewCurrent(remount), false, 'Detached hosts cannot accept a late import or scheduled render.');
  assert.equal(life.isSessionCurrent(session), true);
  assert.equal(life.isSourceCurrent(source), true);
});

test('a newer source request supersedes only earlier requests for the current session', () => {
  const life = createLoredeckWorkbenchViewLifetime();
  life.open('deck-a');
  const first = life.beginSource('deck-a');
  const second = life.beginSource('deck-a');
  assert.equal(life.isSourceCurrent(first), false);
  assert.equal(life.isSourceCurrent(second), true);
  assert.equal(life.beginSource('deck-b'), null);
  assert.equal(life.isSourceCurrent(second), true, 'An inactive pack cannot supersede an active request.');
});

test('stale deck save callbacks cannot start loads or advance the active source request', () => {
  const life = createLoredeckWorkbenchViewLifetime();
  life.open('deck-a');
  const oldOwner = life.captureSession();
  const oldView = life.captureView({ isConnected: true });
  const oldLoad = life.beginSource('deck-a');
  life.open('deck-b');
  const currentLoad = life.beginSource('deck-b');
  assert.equal(life.isSessionCurrent(oldOwner), false);
  assert.equal(life.isViewCurrent(oldView), false);
  assert.equal(life.beginSource('deck-a', oldOwner), null);
  assert.equal(life.beginSource('deck-b', oldOwner), null);
  assert.equal(life.isSourceCurrent(oldLoad), false);
  assert.equal(life.isSourceCurrent(currentLoad), true);
  life.close();
  assert.equal(life.isSourceCurrent(currentLoad), false);
  assert.equal(life.captureSession(), null);
  life.open('deck-a');
  const reopenedLoad = life.beginSource('deck-a');
  assert.equal(life.isSessionCurrent(oldOwner), false);
  assert.equal(life.beginSource('deck-a', oldOwner), null);
  assert.equal(life.isSourceCurrent(reopenedLoad), true);
});

test('reopening the same pack starts a distinct session even without an intervening close', () => {
  const life = createLoredeckWorkbenchViewLifetime();
  life.open('deck-a');
  const oldSession = life.captureSession();
  const oldSource = life.beginSource('deck-a');
  const oldView = life.captureView({ isConnected: true });
  life.open('deck-a');
  const session = life.captureSession();
  assert.notEqual(session.session, oldSession.session);
  assert.equal(life.isSessionCurrent(oldSession), false);
  assert.equal(life.isSessionCurrent(session), true);
  assert.equal(life.isSourceCurrent(oldSource), false);
  assert.equal(life.isViewCurrent(oldView), false);
  const currentSource = life.beginSource('deck-a', session);
  assert.equal(life.beginSource('deck-a', oldSession), null);
  assert.equal(life.isSourceCurrent(currentSource), true);
});

test('close invalidates imports, loads, and status owners; repeated close remains safe', () => {
  const life = createLoredeckWorkbenchViewLifetime();
  life.open('deck-a');
  const session = life.captureSession();
  const view = life.captureView({ isConnected: true });
  const source = life.beginSource('deck-a');
  life.close();
  life.close();
  assert.equal(life.isSessionCurrent(session), false);
  assert.equal(life.isViewCurrent(view), false);
  assert.equal(life.isSourceCurrent(source), false);
  assert.equal(life.beginSource('deck-a', session), null);
});
