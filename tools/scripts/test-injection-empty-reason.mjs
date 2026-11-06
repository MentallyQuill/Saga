import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Exercise the existing private diagnostic without adding a test-only UI export.
const panelPath = fileURLToPath(new URL('../../src/runtime/injection-preview-panel.js', import.meta.url));
const source = (await readFile(panelPath, 'utf8')).replace(/from\s+(['"])(\.[^'"]+)\1/g,
  (_, quote, relative) => `from ${quote}${pathToFileURL(path.resolve(path.dirname(panelPath), relative)).href}${quote}`);
const panel = await import(`data:text/javascript;base64,${Buffer.from(`${source}\nexport { getInjectionEmptyReason };`).toString('base64')}`);
panel.configureInjectionPreviewPanel({ getEnabledLoredeckStackPackIds: state => state.loadedPackIds || [] });

const card = (id, extra = {}) => ({
  id, title: id, fact: 'Accepted fact.', relevance: 'normal',
  context: { sortKeyFrom: 10, sortKeyTo: 20 },
  extensions: { sagaLoredeck: { packId: 'test-deck' } },
  ...extra,
});
const state = {
  loadedPackIds: ['test-deck'],
  loreMatrix: [card('accepted')],
  loredeckContexts: { 'test-deck': { contextSortKey: 30 } },
};
const reason = (kind = 'normal', next = state, settings = {}, enabled = true) =>
  panel.getInjectionEmptyReason(kind, next, settings, enabled);
const blocked = '(All Accepted Lorecards in this relevance tier are blocked by current Context.)';
const noMatch = '(No Accepted Lorecards match this relevance tier and current Context.)';
const noAccepted = '(No Accepted Lorecards are available to inject.)';

assert.equal(reason(), blocked, 'Accepted loreMatrix cards blocked by Context must be diagnosed as such.');
assert.equal(reason('normal', { ...state, loredeckContexts: {} }), blocked,
  'Unresolved Context also prevents accepted cards from injecting.');
assert.equal(reason('normal', { ...state, loreMatrix: [], acceptedLoreEntries: [card('legacy')], loreEntries: [card('legacy-2')] }), noAccepted,
  'Legacy aliases must not manufacture Accepted cards when the authoritative matrix is empty.');
assert.equal(reason('high'), noMatch, 'Other tiers must not be mislabeled Context-blocked.');

const elevated = { ...state, loreSelection: { elevated: { accepted: { elevatedAt: 1 } } } };
assert.equal(reason('high', elevated), blocked, 'Elevation moves a blocked card into the high-tier diagnostic.');
assert.equal(reason('normal', elevated), noMatch, 'The base tier must exclude elevated cards.');
for (const extra of [{ status: 'archived' }, { status: 'disabled' }, { injectableByDefault: false }]) {
  assert.equal(reason('normal', { ...state, loreMatrix: [card('excluded', extra)] }), noMatch,
    'Noninjectable cards must not be attributed to Context.');
}
assert.equal(reason('normal', { ...state, loreSelection: { suppressedIds: ['accepted'] } }), noMatch,
  'Muted cards must not be attributed to Context.');
assert.equal(reason('normal', { ...state, loreMatrix: [...state.loreMatrix, card('ungated', { context: {} })] }), noMatch,
  'Context is not the cause when another candidate passes its gate.');
assert.equal(reason('normal', { ...state, loadedPackIds: [] }), '(No Loredecks are loaded for Lore injection.)');
assert.equal(reason('normal', state, { injectLore: false }, false), '(Lore injection is disabled.)');
assert.equal(reason('normal', state, {}, false), '(This Lore relevance tier is disabled.)');
assert.equal(reason('continuity', state, {}, false), '(Continuity injection is disabled.)');
assert.equal(reason('continuity'), '(Continuity injection has no scene, timeline, character, item, or goal data yet.)');

console.log('Injection empty-reason behavior passed.');
