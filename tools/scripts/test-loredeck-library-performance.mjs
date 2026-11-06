import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { configureLoredeckHealthPanel } from '../../src/loredecks/loredeck-health-panel.js';
import { DEFAULT_SETTINGS } from '../../src/state/constants.js';
import { configureLoredeckLibraryStore, getLoredeckLibraryRegistry } from '../../src/state/loredeck-library-store.js';
import { getLoredeckLibrary, getLoredeckStack, getLoredeckTypeLabel } from '../../src/runtime/active-stack-panel.js';
import { buildLoredeckHealthPackSummary } from '../../src/loredecks/loredeck-health-panel.js';
import { resolveLoredeckStackItems } from '../../src/loredecks/loredeck-library-index.js';
import {
  compareLoredeckLibraryTitles,
  sortLoredeckLibraryFolderPacks,
  sortLoredeckLibraryFolderTreeByTitle,
  sortLoredeckLibraryPacks,
} from '../../src/loredecks/loredeck-library-view.js';

// Exercise private render helpers without adding test-only exports to the UI API.
const panelPath = fileURLToPath(new URL('../../src/loredecks/loredeck-library-panel.js', import.meta.url));
const source = (await readFile(panelPath, 'utf8')).replace(/from\s+(['"])(\.[^'"]+)\1/g,
  (_, quote, relative) => `from ${quote}${pathToFileURL(path.resolve(path.dirname(panelPath), relative)).href}${quote}`);
const panel = await import(`data:text/javascript;base64,${Buffer.from(`${source}\nexport { getLoredeckLibraryPackHealthInfo, buildLoredeckLibraryFolderRenderModel, getLoredeckLibraryOverlayContext };\nexport const renderSnapshot = typeof withLoredeckLibraryRenderSnapshot === 'function' ? withLoredeckLibraryRenderSnapshot : callback => callback();`).toString('base64')}`);

let libraryReads = 0;
const health = {
  packId: 'test-deck', status: 'needs_review',
  summary: { entryCount: 9, errorCount: 0, warningCount: 1, suggestionCount: 0 },
  errors: [], warnings: [{ code: 'test_warning', packId: 'test-deck', message: 'Review this deck.' }], suggestions: [],
};
configureLoredeckHealthPanel({
  getLoredeckLibrary: () => { libraryReads++; return []; },
  getLoredeckEntryPreviewCacheRecord: id => id === 'test-deck' ? { health } : null,
});
panel.configureLoredeckLibraryPanel({ getState: () => ({}) });
const info = panel.getLoredeckLibraryPackHealthInfo({ packId: 'test-deck', title: 'Test', type: 'custom' });
assert.equal(info.status.tone, 'warning');
assert.equal(info.warningCount, 1);
assert.equal(info.report.summary.entryCount, 9);
assert.equal(info.report.warnings[0].code, 'test_warning');
assert.equal(libraryReads, 0, 'Rendering one deck health badge must not reconstruct the entire Library.');
console.log('Per-deck health summaries avoid whole-Library reads.');

let registryReads = 0;
let healthReads = 0;
const state = {};
const deck = { packId: 'test-deck', title: 'Test', type: 'custom' };
configureLoredeckHealthPanel({
  getLoredeckEntryPreviewCacheRecord: () => { healthReads++; return { health }; },
});
panel.configureLoredeckLibraryPanel({
  getState: () => state,
  getLoredeckLibrary: () => { libraryReads++; return [deck]; },
  getLoredeckLibraryRegistry: () => { registryReads++; return { packs: { 'test-deck': deck } }; },
});
panel.renderSnapshot(() => {
  panel.getLoredeckLibraryOverlayContext();
  panel.getLoredeckLibraryOverlayContext();
  for (let i = 0; i < 20; i++) assert.equal(panel.getLoredeckLibraryPackHealthInfo(deck).warningCount, 1);
});
assert.equal(libraryReads, 1, 'A UI refresh must normalize the Library only once.');
assert.equal(registryReads, 1, 'All surfaces in a refresh must share the same registry snapshot.');
assert.equal(healthReads, 1, 'Sorting and folder summaries must reuse the same per-deck health result.');
console.log('One refresh shares Library, registry, and health summaries.');

health.summary.warningCount = 2;
panel.renderSnapshot(() => assert.equal(panel.getLoredeckLibraryPackHealthInfo(deck).warningCount, 2,
  'A later refresh must observe changes to the health cache.'));
assert.equal(healthReads, 2);
assert.throws(() => panel.renderSnapshot(() => { throw new Error('Render failed'); }), /Render failed/);
health.summary.warningCount = 3;
panel.renderSnapshot(() => assert.equal(panel.getLoredeckLibraryPackHealthInfo(deck).warningCount, 3,
  'A failed render must release its snapshot.'));

// The shipped Library fixture uses the real normalizers and stack resolver.
configureLoredeckLibraryStore({ getState: () => state, getSettings: () => DEFAULT_SETTINGS });
libraryReads = 0;
const libraryRead = () => { libraryReads++; return getLoredeckLibrary(state); };
const indexRead = (s, library) => panel.getLoredeckLibraryIndexForPacks(s, library || libraryRead(), getLoredeckLibraryRegistry(s));
configureLoredeckHealthPanel({
  getLoredeckLibrary: libraryRead, getLoredeckStack, getLoredeckLibraryIndexForPacks: indexRead,
  resolveLoredeckStackItems, getLoredeckTypeLabel, getLoredeckEntryPreviewCacheRecord: () => null,
});
panel.configureLoredeckLibraryPanel({
  getState: () => state, getLoredeckLibrary: libraryRead, getLoredeckLibraryRegistry,
  getLoredeckStack, buildLoredeckHealthPackSummary,
});
const library = libraryRead();
const index = indexRead(state, library);
libraryReads = 0;
let started = performance.now();
panel.renderSnapshot(() => {
  for (const pack of library) panel.getLoredeckLibraryPackHealthInfo(pack);
});
assert.equal(libraryReads, 0);
console.log(`Bundled deck health summaries (${library.length} decks): ${(performance.now() - started).toFixed(1)}ms, ${libraryReads} whole-Library reads.`);
started = performance.now();
panel.renderSnapshot(() => panel.buildLoredeckLibraryFolderRenderModel(library, index, []));
assert.equal(libraryReads, 0);
console.log(`Bundled folder summaries (${index.folders.length} folders): ${(performance.now() - started).toFixed(1)}ms, ${libraryReads} whole-Library reads.`);

let placementReads = 0;
const manualRegistry = {
  get deckPlacements() {
    placementReads++;
    return [{ deckId: 'delta', sortOrder: 0 }, { deckId: 'charlie', sortOrder: 1 }, { deckId: 'bravo', sortOrder: 2 }, { deckId: 'alpha', sortOrder: 3 }];
  },
};
const manualPacks = ['alpha', 'bravo', 'charlie', 'delta'].map(packId => ({ packId, title: packId }));
for (const [a, b, expected] of [
  ['', '', 0], ['', 'Alpha', -1], ['Deck 2', 'Deck 10', -1], ['alpha', 'ALPHA', 0],
  ['cafe', 'café', 0], ['Same', 'same', 0],
]) assert.equal(Math.sign(compareLoredeckLibraryTitles(a, b)), Math.sign(expected), `Comparator parity for ${JSON.stringify([a, b])}`);
const tied = sortLoredeckLibraryPacks([{ packId: 'b', title: 'Same' }, { packId: 'a', title: 'same' }]);
assert.deepEqual(tied.map(pack => pack.packId), ['a', 'b'], 'Equal-title ordering uses the existing ID tie breaker.');
assert.deepEqual(sortLoredeckLibraryPacks(manualPacks, { sortMode: 'manual', registry: manualRegistry }).map(pack => pack.packId),
  ['delta', 'charlie', 'bravo', 'alpha']);
assert.deepEqual(sortLoredeckLibraryFolderPacks([
  { packId: 'custom', title: 'Alpha', type: 'custom' }, { packId: 'base-core', title: 'Core', type: 'bundled' },
]).map(pack => pack.packId), ['base-core', 'custom'], 'Core packs remain first in folders.');
assert.deepEqual(sortLoredeckLibraryFolderTreeByTitle([{ id: 'b', title: 'Folder 10' }, { id: 'a', title: 'Folder 2' }]).map(folder => folder.id),
  ['a', 'b'], 'Folder titles keep numeric title ordering.');
assert(placementReads <= 2, 'Manual sorting must index placements once instead of scanning the registry for every comparison.');
