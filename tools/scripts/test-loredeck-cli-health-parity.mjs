/**
 * test-loredeck-cli-health-parity.mjs -- Saga
 * Proves the CLI filesystem health path (tools/loredeck) produces the same
 * Pack Health report as the browser loader path for both clean reference
 * decks and a deliberately broken fixture deck.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DEFAULT_HP_LOREDECK_IDS } from '../../src/loredecks/loredeck-defaults.js';
import { loadLoredeckSourceById } from '../../src/loredecks/loredeck-loader.js';
import { loadLoredeckSourceFromDir } from '../loredeck/lib/node-loredeck-io.mjs';

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const bundledRoot = path.join(repoRoot, 'content', 'loredecks');
const fixtureRoot = path.join(repoRoot, '.tmp', 'loredeck-cli-health-parity');

globalThis.fetch = async (url) => {
    let filePath = '';
    try {
        filePath = fileURLToPath(url);
    } catch (e) {
        return { ok: false, status: 0, statusText: e?.message || 'Invalid URL' };
    }
    let raw = '';
    try {
        raw = await readFile(filePath, 'utf8');
    } catch (e) {
        return { ok: false, status: 404, statusText: e?.message || 'Not found' };
    }
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        async json() {
            return JSON.parse(raw);
        },
    };
};

function normalizeIssue(issue) {
    // status/detail carry transport-specific values (HTTP status text vs fs
    // error strings); parity is about which issues fire, where, and why.
    const { status, detail, ...rest } = issue;
    return rest;
}

function normalizeHealth(health) {
    return {
        packId: health.packId,
        status: health.status,
        summary: health.summary,
        errors: (health.errors || []).map(normalizeIssue),
        warnings: (health.warnings || []).map(normalizeIssue),
        suggestions: (health.suggestions || []).map(normalizeIssue),
    };
}

// 1. Clean reference decks: browser loader path vs CLI directory path.
for (const deckId of DEFAULT_HP_LOREDECK_IDS) {
    const browserSource = await loadLoredeckSourceById(deckId);
    const cliSource = await loadLoredeckSourceFromDir(path.join(bundledRoot, deckId));
    assert.deepEqual(
        normalizeHealth(cliSource.health),
        normalizeHealth(browserSource.health),
        `${deckId}: CLI health must match browser loader health.`,
    );
    assert.equal(cliSource.health.status, 'good', `${deckId} should report good Pack Health via the CLI path.`);
    assert.equal(
        cliSource.entryFiles.filter(file => file.ok).length,
        browserSource.entryFiles.filter(file => file.ok).length,
        `${deckId}: CLI path should load the same number of entry files.`,
    );
}

// 2. Broken fixture deck: identical issue lists on the failure side.
const brokenDir = path.join(fixtureRoot, 'parity-broken-fixture');
await rm(fixtureRoot, { recursive: true, force: true });
await mkdir(path.join(brokenDir, 'entries'), { recursive: true });

const brokenManifest = {
    schemaVersion: 1,
    entrySchemaVersion: 3,
    id: 'parity-broken-fixture',
    type: 'custom',
    title: 'Parity Broken Fixture',
    description: 'Deliberately broken deck for CLI/browser health parity checks.',
    version: '0.0.1',
    files: ['entries/core.json', 'entries/missing.json'],
    registries: { tags: 'tags.json', timeline: 'timeline.json' },
    stats: { entryCount: 99, categoryCounts: { character: 42 } },
};

await writeFile(path.join(brokenDir, 'loredeck.json'), JSON.stringify(brokenManifest, null, 2));
await writeFile(path.join(brokenDir, 'tags.json'), JSON.stringify({
    schemaVersion: 1,
    tags: {
        'fandom:parity-fixture': { label: 'Parity Fixture' },
        'quality:orphaned-tag': { label: 'Orphaned Tag' },
    },
}, null, 2));
await writeFile(path.join(brokenDir, 'timeline.json'), JSON.stringify({
    schemaVersion: 1,
    timelineMode: 'story_anchor',
    anchors: [
        { id: 'fixture.start', label: 'Fixture Start', contextType: 'story_anchor', sortKey: 100 },
        { id: 'fixture.end', label: 'Fixture End', contextType: 'story_anchor', sortKey: 200 },
    ],
}, null, 2));
await writeFile(path.join(brokenDir, 'entries', 'core.json'), JSON.stringify({
    schemaVersion: 3,
    entries: [
        {
            schemaVersion: 3,
            id: 'fixture.duplicate',
            title: 'Duplicate Entry A',
            category: 'character',
            priority: 100,
            tags: ['fandom:parity-fixture', 'missing:undefined-tag'],
            context: { scope: 'window', validFromAnchor: 'fixture.start', validToAnchor: 'fixture.end', sortKeyFrom: 100, sortKeyTo: 200 },
            content: { fact: 'A fixture fact.', injection: 'A fixture injection.' },
        },
        {
            schemaVersion: 3,
            id: 'fixture.duplicate',
            title: 'Duplicate Entry B',
            category: 'character',
            priority: 100,
            tags: ['fandom:parity-fixture'],
            context: { scope: 'window', validFromAnchor: 'fixture.start', validToAnchor: 'fixture.end', sortKeyFrom: 100, sortKeyTo: 200 },
            content: { fact: 'A duplicated fixture fact.', injection: 'A duplicated fixture injection.' },
        },
        {
            schemaVersion: 3,
            id: 'fixture.broken-anchor',
            title: 'Broken Anchor Reference',
            category: 'event',
            priority: 90,
            tags: ['fandom:parity-fixture'],
            context: { scope: 'window', validFromAnchor: 'fixture.nonexistent', validToAnchor: 'fixture.end' },
            content: { fact: 'References a missing anchor.', injection: 'References a missing anchor.' },
        },
    ],
}, null, 2));

const fixtureFetch = globalThis.fetch;
const firstEntryStarted = Promise.withResolvers();
const releaseFirstEntry = Promise.withResolvers();
const startedEntryFiles = [];
globalThis.fetch = async (url) => {
    const file = path.relative(brokenDir, fileURLToPath(url)).split(path.sep).join('/');
    if (brokenManifest.files.includes(file)) startedEntryFiles.push(file);
    if (file === brokenManifest.files[0]) {
        firstEntryStarted.resolve();
        await releaseFirstEntry.promise;
    }
    return fixtureFetch(url);
};
const pendingBrowserBroken = loadLoredeckSourceById('parity-broken-fixture', {
    registryRecord: { manifest: pathToFileURL(path.join(brokenDir, 'loredeck.json')).href },
});
await Promise.race([firstEntryStarted.promise, pendingBrowserBroken]);
const filesStartedWhileFirstWasPending = [...startedEntryFiles];
releaseFirstEntry.resolve();
const browserBroken = await pendingBrowserBroken;
globalThis.fetch = fixtureFetch;
const cliBroken = await loadLoredeckSourceFromDir(brokenDir);

assert.ok(cliBroken.health.errors.length > 0, 'Broken fixture should produce Pack Health errors.');
assert.ok(
    cliBroken.health.errors.some(issue => issue.code === 'missing_entry_file'),
    'Broken fixture should report the missing entry file.',
);
assert.deepEqual(
    browserBroken.entryFiles.map(file => file.file),
    brokenManifest.files,
    'Browser entry files must retain manifest order.',
);
assert.deepEqual(
    normalizeHealth(cliBroken.health),
    normalizeHealth(browserBroken.health),
    'Broken fixture: CLI and browser paths must report identical ordered Pack Health results.',
);

await rm(fixtureRoot, { recursive: true, force: true });

assert.deepEqual(
    filesStartedWhileFirstWasPending,
    brokenManifest.files,
    'The browser must start the next entry request while the first is pending.',
);

console.log('Loredeck CLI health parity tests passed.');
