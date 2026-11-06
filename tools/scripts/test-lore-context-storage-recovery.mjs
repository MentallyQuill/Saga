import assert from 'node:assert/strict';
import test from 'node:test';
import { getDefaultState, MODULE_KEY } from '../../src/state/constants.js';
import { getState, importState, migrateState } from '../../src/state/state-manager.js';
import { getLoreEntryInjectionContextGate } from '../../src/lorecards/lore-injection-filter.js';
import { sanitizeLoreArraysForStorage } from '../../src/state/lore-storage-sanitizer.js';

const clone = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
const emptyStrings = ['scope', 'anchorId', 'validFromAnchor', 'validToAnchor', 'arc', 'arcId', 'phase', 'phaseId',
    'season', 'episode', 'chapter', 'issue', 'quest', 'gameStage', 'stardateFrom', 'stardateTo', 'precision', 'windowKind', 'label'];
const oldContext = () => ({ ...Object.fromEntries(emptyStrings.map(key => [key, ''])), sortKeyFrom: 0, sortKeyTo: 0, approximate: false });
const manual = (overrides = {}) => ({ id: 'manual', title: 'Manual note', source: 'manual', sourceInfo: { work: 'Manual Lore' },
    userEdited: true, content: { fact: 'The party stores supplies in the mill.' }, context: oldContext(), ...overrides });
const story = (overrides = {}) => manual({ id: 'story_bulk_note', source: 'model-generated:bulk:batch:chunk',
    sourceInfo: { id: 'bulk-lore:batch:chunk', work: 'Current chat', chapter: 'Messages 1-10' },
    extensions: { sagaGeneration: { mode: 'bulk-bootstrap', batchId: 'batch', chunkId: 'chunk' } }, ...overrides });
const legacyState = entries => ({ ...getDefaultState(), _version: 27, loreMatrix: clone(entries), pendingLoreEntries: clone(entries) });
let current = { extensionSettings: {}, saveSettingsDebounced() {} };
globalThis.SillyTavern = { getContext: () => current };

await test('schema 27 fabricated Context is removed from accepted and pending manual/Story Scan lore', () => {
    const state = migrateState(legacyState([manual(), story(), story({ id: 'story_bulk_incremental', extensions: { sagaGeneration: { mode: 'bulk-incremental' } } })]));
    for (const card of [...state.loreMatrix, ...state.pendingLoreEntries]) {
        assert.equal(card.context, undefined, card.source);
        assert.equal(getLoreEntryInjectionContextGate(card, state).status, 'no_gate');
    }
    assert.equal(state._version, 28);
});

await test('schema 28 keeps an explicit zero Context and migration is idempotent', () => {
    const state = migrateState({ ...legacyState([manual()]), _version: 28 });
    assert.equal(state.loreMatrix[0].context.sortKeyFrom, 0);
    const repeated = migrateState(clone(state));
    assert.deepEqual(repeated.loreMatrix.map(card => card.context), state.loreMatrix.map(card => card.context));
});

await test('actual compacted legacy provenance is recognized after the source normalizer discarded sourceInfo', () => {
    const state = sanitizeLoreArraysForStorage(legacyState([manual(), story()]));
    for (const card of [...state.loreMatrix, ...state.pendingLoreEntries]) {
        assert.equal(card.sourceInfo.work, '');
        card.context = oldContext();
    }
    migrateState(state);
    for (const card of [...state.loreMatrix, ...state.pendingLoreEntries]) assert.equal(card.context, undefined, card.source);
});

await test('imports preserve raw explicit zero gates and recover only complete old compacted shapes', () => {
    for (const version of [20, 27, 28]) {
        const result = importState(JSON.stringify({ _version: version, loreMatrix: [manual({ context: { sortKeyFrom: 0, sortKeyTo: 0 } })],
            pendingLoreEntries: [manual({ context: { sortKeyFrom: 0, sortKeyTo: 0 } })] }));
        assert.equal(result.error, null);
        for (const card of [...result.state.loreMatrix, ...result.state.pendingLoreEntries]) assert.equal(card.context.sortKeyFrom, 0, `schema ${version}`);
    }
    const imported = importState(JSON.stringify(legacyState([manual(), story()])));
    assert.equal(imported.error, null);
    for (const card of [...imported.state.loreMatrix, ...imported.state.pendingLoreEntries]) assert.equal(card.context, undefined);
});

await test('legacy imports still normalize malformed lore array members safely', () => {
    for (const version of [20, 24, 27]) {
        const cards = [null, false, 0, 'bad', manual({ id: 'valid' })];
        const imported = importState(JSON.stringify({ _version: version, loreMatrix: cards, pendingLoreEntries: cards }));
        assert.equal(imported.error, null, `schema ${version}`);
        assert.ok(imported.state.loreMatrix.some(card => card.id === 'valid'));
        assert.ok(imported.state.pendingLoreEntries.some(card => card.id === 'valid'));
    }
});

await test('recovery preserves constraints, aliases, malformed bounds, unknown fields, and incomplete shapes', () => {
    const contexts = [
        ...emptyStrings.map(field => ({ ...oldContext(), [field]: 'meaningful' })),
        { ...oldContext(), approximate: true }, { ...oldContext(), invalidNumericBounds: true },
        { ...oldContext(), sortKeyFrom: 1 }, { ...oldContext(), sortKeyTo: null },
        { ...oldContext(), sortKeyFrom: '0' }, { ...oldContext(), fromSortKey: 1 },
        { ...oldContext(), anchor: 'real' }, { ...oldContext(), coordinates: [{ axis: 'arc', id: 'one' }] },
        { ...oldContext(), futureConstraint: 'unknown' }, { sortKeyFrom: 0, sortKeyTo: 0 },
        { ...oldContext(), anchor: 0 }, { ...oldContext(), fromSortKey: false },
    ];
    const cards = contexts.map((context, index) => manual({ id: `context-${index}`, context }));
    for (const field of ['validFromAnchor', 'validToAnchor', 'arc', 'arcId', 'phase', 'phaseId', 'season', 'episode',
        'chapter', 'issue', 'quest', 'gameStage', 'stardateFrom', 'stardateTo', 'contextPrecision', 'contextLabel']) {
        cards.push(manual({ id: `top-level-${field}`, [field]: 'real' }));
    }
    const state = migrateState(legacyState(cards));
    assert.equal(state.loreMatrix.length, cards.length);
    for (const card of [...state.loreMatrix, ...state.pendingLoreEntries]) assert.ok(card.context, card.id);
});

await test('recovery requires exact known origins and excludes coordinates and deck provenance', () => {
    const cards = [manual({ source: 'model-generated' }), manual({ sourceInfo: { work: 'Other' } }),
        manual({ source: 'manual:import' }), story({ extensions: { sagaGeneration: { mode: 'other' } } }),
        story({ sourceInfo: { work: 'Unknown', id: 'unknown' } }),
        manual({ coordinates: [{ axis: 'arc', id: 'one' }] }), manual({ packId: 'deck' }), manual({ loredeckId: 'deck' }),
        manual({ extensions: { sagaLoredeck: { packId: 'deck' } } }),
        manual({ extensions: { sagaContextGate: { packId: 'deck' } } }),
    ];
    const state = migrateState(legacyState(cards.map((card, index) => ({ ...card, id: `excluded-${index}` }))));
    for (const card of [...state.loreMatrix, ...state.pendingLoreEntries]) assert.ok(card.context, card.source);
});

await test('first read persists recovery despite backup growth and repeats do not recover or back up again', async () => {
    const raw = { _version: 27, loreMatrix: [manual(), story()], pendingLoreEntries: [manual(), story()] };
    const beforeSize = JSON.stringify(raw).length;
    const writes = [];
    current = { chatId: 'recovery', chatMetadata: { [MODULE_KEY]: raw }, extensionSettings: {}, saveSettingsDebounced() {},
        sagaPersistence: { originBound: true, async saveState(request) { writes.push(request); return { ok: true, persisted: true }; } } };
    const state = getState();
    await tick();
    assert.ok(JSON.stringify(state).length > beforeSize, 'migration backup makes total state larger');
    assert.equal(writes.length, 1, 'a repaired state must persist even when its backup increases size');
    assert.equal(state.stateSafety.backups[0].state.loreMatrix[0].context.sortKeyFrom, 0);
    assert.equal(writes[0].snapshot[MODULE_KEY].loreMatrix[0].context, undefined);
    getState();
    await tick();
    assert.equal(writes.length, 1);
    current.chatMetadata = clone(writes[0].snapshot);
    const reloaded = getState();
    await tick();
    assert.equal(reloaded.loreMatrix[0].context, undefined);
    assert.equal(reloaded.stateSafety.backups.length, 1);
    assert.equal(reloaded.stateSafety.migrationLog.length, 1);
    const writesAfterReload = writes.length;
    getState();
    await tick();
    assert.equal(writes.length, writesAfterReload, 'cached reads must not duplicate persistence');
});
