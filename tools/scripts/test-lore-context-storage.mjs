import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLoreEntry } from '../../src/lorecards/lore-matrix.js';
import { getInjectableLoreEntriesForInjection, getLoreEntryInjectionContextGate } from '../../src/lorecards/lore-injection-filter.js';
import { sanitizeLoreArraysForStorage } from '../../src/state/lore-storage-sanitizer.js';

const entry = (overrides = {}) => normalizeLoreEntry({
    id: 'manual-note',
    title: 'A durable story fact',
    source: 'manual',
    content: { fact: 'The party keeps its supplies at the old mill.' },
    ...overrides,
});

function roundTrip(state) {
    return JSON.parse(JSON.stringify(sanitizeLoreArraysForStorage(state)));
}

await test('ungated manual and Story Scan lore stays eligible through repeated save/reload', () => {
    for (const source of ['manual', 'model-generated:bulk:batch:chunk']) {
        let state = {
            loreMatrix: [entry({ source })],
            pendingLoreEntries: [entry({ id: 'pending-note', source })],
            loreSelection: { elevated: { 'manual-note': { previousRelevance: 'normal', elevatedAt: 1 } } },
        };
        assert.equal(getInjectableLoreEntriesForInjection(state).length, 1);
        for (let round = 0; round < 3; round += 1) {
            state = roundTrip(state);
            for (const stored of [...state.loreMatrix, ...state.pendingLoreEntries]) {
                const gate = getLoreEntryInjectionContextGate(stored, state);
                assert.equal(gate.status, 'no_gate', `${source}: round ${round}, ${stored.id}`);
                assert.equal(gate.eligible, true);
            }
            const selected = getInjectableLoreEntriesForInjection(state);
            assert.equal(selected.length, 1);
            assert.equal(selected[0].isElevated, true);
        }
    }
});

await test('coordinate identifiers retain absent numeric bounds through storage', () => {
    let state = {
        loreMatrix: [entry({ coordinates: [{ axis: 'adaptation', id: 'book' }] })],
    };
    for (let round = 0; round < 3; round += 1) {
        state = roundTrip(state);
        const coordinate = state.loreMatrix[0].coordinates[0];
        assert.equal(coordinate.axis, 'adaptation');
        assert.equal(coordinate.id, 'book');
        assert.equal(coordinate.sortKeyFrom, null);
        assert.equal(coordinate.sortKeyTo, null);
    }
});

await test('malformed Context constraints remain blocked after saving', () => {
    let state = { loreMatrix: [entry({ context: { sortKeyFrom: 'invalid' } })] };
    assert.equal(getLoreEntryInjectionContextGate(state.loreMatrix[0], state).eligible, false);
    for (let round = 0; round < 3; round += 1) {
        state = roundTrip(state);
        assert.equal(state.loreMatrix[0].context?.invalidNumericBounds, true);
        const gate = getLoreEntryInjectionContextGate(state.loreMatrix[0], state);
        assert.equal(gate.eligible, false);
        assert.match(gate.reason, /malformed numeric Context boundary/);
    }
});

await test('storage preserves explicit zero and open-ended Context windows', () => {
    const cases = [
        { sortKeyFrom: null, sortKeyTo: null },
        { sortKeyFrom: undefined, sortKeyTo: '' },
        { sortKeyFrom: 0, sortKeyTo: 0 },
        { sortKeyFrom: '0', sortKeyTo: '0' },
        { sortKeyFrom: 10, sortKeyTo: null },
        { sortKeyFrom: null, sortKeyTo: 30 },
        { sortKeyFrom: '10', sortKeyTo: '30' },
    ];
    for (const context of cases) {
        const original = entry({ context, extensions: { sagaLoredeck: { packId: 'pack' } } });
        let state = {
            loreMatrix: [original],
            loredeckContexts: { pack: { contextSortKey: 20 } },
        };
        const beforeGate = getLoreEntryInjectionContextGate(original, state);
        for (let round = 0; round < 3; round += 1) {
            state = roundTrip(state);
            const stored = normalizeLoreEntry(state.loreMatrix[0]);
            assert.equal(stored.context.sortKeyFrom, original.context.sortKeyFrom);
            assert.equal(stored.context.sortKeyTo, original.context.sortKeyTo);
            assert.equal(getLoreEntryInjectionContextGate(stored, state).status, beforeGate.status);
            assert.equal(getLoreEntryInjectionContextGate(stored, state).eligible, beforeGate.eligible);
        }
    }
});

await test('storage preserves explicit zero and open-ended coordinate bounds', () => {
    for (const bounds of [
        { sortKeyFrom: 0, sortKeyTo: 0 },
        { sortKeyFrom: 10, sortKeyTo: null },
        { sortKeyFrom: null, sortKeyTo: 30 },
    ]) {
        let state = { loreMatrix: [entry({ coordinates: [{ axis: 'adaptation', id: 'book', ...bounds }] })] };
        for (let round = 0; round < 3; round += 1) {
            state = roundTrip(state);
            assert.equal(state.loreMatrix[0].coordinates[0].sortKeyFrom, bounds.sortKeyFrom);
            assert.equal(state.loreMatrix[0].coordinates[0].sortKeyTo, bounds.sortKeyTo);
        }
    }
});

await test('manual and Story Scan drafts inject after acceptance and chat reload', async () => {
    const previous = globalThis.SillyTavern;
    let persisted;
    const context = {
        chatMetadata: {},
        extensionSettings: {},
        saveMetadata() { persisted = JSON.parse(JSON.stringify(this.chatMetadata)); },
        saveSettingsDebounced() {},
    };
    globalThis.SillyTavern = { getContext: () => context };
    try {
        const { appendPendingLoreEntries, acceptPendingLoreEntry, getState, saveState } =
            await import('../../src/state/state-manager.js');
        for (const [id, source] of [
            ['manual-note', 'manual'],
            ['story-note', 'model-generated:bulk:batch:chunk'],
        ]) {
            appendPendingLoreEntries([entry({ id, source })], {}, { syncPrompt: false });
            assert.ok(acceptPendingLoreEntry(0).accepted);
        }
        await saveState(getState(), { syncPrompt: false }).persistence;
        assert.ok(persisted?.saga);
        context.chatMetadata = persisted;
        assert.deepEqual(getInjectableLoreEntriesForInjection(getState()).map(card => card.id).sort(),
            ['manual-note', 'story-note']);
    } finally {
        if (previous === undefined) delete globalThis.SillyTavern;
        else globalThis.SillyTavern = previous;
    }
});
