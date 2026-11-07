import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startSagaPerformanceHarness } from './lib/saga-performance-harness.mjs';
import { installSagaPerformanceImageReadiness } from './lib/saga-performance-image-readiness.mjs';

const scratch = path.resolve('.tmp/sdd/rendering-performance');
const sourceRoot = path.join(scratch, 'candidate-source-391de0bb');
const responses = new Map(); const requests = new Set();
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="gold"/></svg>';
function reply(response) { response.writeHead(200, { 'content-type': 'image/svg+xml', 'content-length': Buffer.byteLength(svg), 'access-control-allow-origin': '*', 'timing-allow-origin': '*' }); response.end(svg); }
const server = http.createServer((request, response) => { requests.add(request.url); if (request.url.startsWith('/auto')) reply(response); else responses.set(request.url, response); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const h = await startSagaPerformanceHarness({ sourceRoot, fixtureRoot: path.join(scratch, 'capture-protocol-final/tests/browser'), cacheMode: 'cold' });
const proof = { sourceRoot, cases: [] };
const paint = () => h.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const until = async check => { const end = Date.now() + 5000; while (!check()) { assert.ok(Date.now() < end, 'HTTP fixture response was not initiated'); await new Promise(resolve => setTimeout(resolve, 5)); } };
async function startGate(options = {}) {
    await h.page.evaluate(installSagaPerformanceImageReadiness, { requireVisibleCover: true, timeoutMs: 3000, ...options });
    await h.page.evaluate(() => { const handle = window.__sagaPerformanceImageReadiness; window.__lastGate = handle; window.__gateResult = undefined; window.__gateWait = handle.waitForReady().then(value => window.__gateResult = { ok: true, value }, error => window.__gateResult = { ok: false, message: error.message }); });
}
async function pending() { await paint(); assert.equal(await h.page.evaluate(() => window.__gateResult === undefined), true, 'Gate must not accept an unfinished visible image'); }
async function result() { const value = await h.page.evaluate(() => window.__gateWait); assert.equal(value.ok, true, value.message); return value.value; }
async function cleanup() {
    const state = await h.page.evaluate(() => { window.__lastGate.dispose(); window.__lastGate.dispose(); return window.__lastGate.diagnostics(); });
    assert.deepEqual(state, { activeObservers: 0, retainedNodes: 0, pendingFrames: 0, pendingTimers: 0, pagehideListening: false });
}
async function nativeFixture({ loading = 'lazy', source = '', partial = false, offscreen = false } = {}) {
    await h.page.evaluate(({ loading, source, partial, offscreen, origin }) => {
        window.__sagaPerformanceImageReadiness?.dispose(); document.body.replaceChildren();
        const clip = document.createElement('div'); Object.assign(clip.style, { position: 'fixed', left: '20px', top: '20px', width: '240px', height: '100px', overflow: 'hidden' });
        const list = document.createElement('div'); list.className = 'saga-loredeck-library-hierarchy-list'; Object.assign(list.style, { position: 'relative', width: '240px', height: '100px', overflow: 'hidden', display: 'block' }); clip.append(list); document.body.append(clip);
        const row = document.createElement('div'); row.className = 'saga-loredeck-library-deck-card'; Object.assign(row.style, { position: 'relative', display: 'block', height: '100px', minHeight: '100px', width: '240px' }); list.append(row);
        const image = (id, src, left = '0px', width = '40px') => { const img = document.createElement('img'); img.id = id; img.loading = loading; Object.assign(img.style, { position: 'absolute', top: '10px', left, width, height: '40px' }); if (src) img.src = src; return img; };
        const visible = image('actual-visible', source); row.append(visible);
        const zero = image('zero-area', `${origin}/auto-zero.svg`, '80px', '0px'); row.append(zero);
        if (partial) row.append(image('partial-visible', `${origin}/auto-partial.svg`, '225px'));
        if (offscreen) {
            const clippedRow = document.createElement('div'); clippedRow.className = row.className; Object.assign(clippedRow.style, { position: 'absolute', display: 'block', top: '120px', width: '240px', height: '100px', minHeight: '100px' });
            const clipped = image('clipped-in-old-2h-band', `${origin}/delay-offscreen-${loading}.svg`); clipped.loading = 'eager'; clippedRow.append(clipped); list.append(clippedRow);
            const horizontal = document.createElement('div'); horizontal.className = row.className; Object.assign(horizontal.style, { position: 'absolute', left: '350px', top: '0px', display: 'block', width: '100px', height: '100px', minHeight: '100px' }); horizontal.append(image('horizontally-clipped', `${origin}/auto-horizontal.svg`)); list.append(horizontal);
        }
        window.__nativeGateFixture = { clip, list, row, visible };
    }, { loading, source, partial, offscreen, origin });
}
try {
    for (const loading of ['eager', 'lazy']) {
        const start = h.journal.mark();
        await nativeFixture({ loading, source: `${origin}/delay-visible-${loading}.svg`, partial: true, offscreen: true });
        await until(() => responses.has(`/delay-visible-${loading}.svg`) && responses.has(`/delay-offscreen-${loading}.svg`));
        await startGate({ ownerId: `delayed-${loading}` });
        await h.page.waitForFunction(() => window.__lastGate.readySnapshot().eligibleCount === 2);
        await pending();
        reply(responses.get(`/delay-visible-${loading}.svg`));
        const ready = await result(); const readyAt = Date.now();
        assert.equal(ready.eligibleCount, 2); assert.equal(ready.decodedCount, 2);
        const ids = ready.images.map(image => image.source); assert.ok(ids.some(url => url.includes('auto-partial'))); assert.ok(!ids.some(url => url.includes('offscreen') || url.includes('horizontal') || url.includes('zero')));
        const end = h.journal.mark(); let settled = false;
        const bytes = h.journal.settle(start, end).then(records => { settled = true; return records; });
        await new Promise(resolve => setTimeout(resolve, 15)); assert.equal(settled, false, 'Already-initiated offscreen transfer must remain in post-readiness settlement');
        reply(responses.get(`/delay-offscreen-${loading}.svg`)); const records = await bytes;
        assert.equal(records.filter(record => record.url.endsWith(`/delay-offscreen-${loading}.svg`)).length, 1);
        assert.ok(records.find(record => record.url.endsWith(`/delay-offscreen-${loading}.svg`)).encodedDataLength > 0);
        assert.ok(Date.now() > readyAt); await cleanup();
        proof.cases.push({ kind: 'delayed-visible-and-clipped', loading, eligible: ready.eligibleCount, decoded: ready.decodedCount, offscreenLateBytes: true });
    }
    await nativeFixture();
    assert.equal(await h.page.evaluate(() => __nativeGateFixture.visible.complete), true);
    await startGate({ ownerId: 'source-less' }); await h.page.waitForFunction(() => __lastGate.readySnapshot().eligibleCount === 1); await pending();
    await h.page.evaluate(src => { __nativeGateFixture.visible.src = src; }, `${origin}/auto-restored.svg`);
    assert.equal((await result()).decodedCount, 1); await cleanup(); proof.cases.push({ kind: 'source-less-complete-is-not-decoded' });

    await nativeFixture({ source: `${origin}/auto-error-base.svg` });
    await h.page.waitForFunction(() => __nativeGateFixture.visible.complete && __nativeGateFixture.visible.naturalWidth > 0);
    await h.page.evaluate(() => { __nativeGateFixture.visible.decode = () => Promise.reject(new Error('real decode failure sentinel')); });
    await startGate({ ownerId: 'decode-failure' }); const failed = await h.page.evaluate(() => __gateWait);
    assert.equal(failed.ok, false); assert.match(failed.message, /real decode failure sentinel/); await cleanup(); proof.cases.push({ kind: 'decode-failure-rejects' });

    await nativeFixture({ source: `${origin}/auto-first-seal.svg` });
    await h.page.waitForFunction(() => __nativeGateFixture.visible.complete && __nativeGateFixture.visible.naturalWidth > 0);
    await startGate({ ownerId: 'late-visibility-seal' });
    await h.page.evaluate(src => {
        window.__addedDuringSeal = false;
        const watch = () => { if (__lastGate.readySnapshot().decodedCount === 1) requestAnimationFrame(() => { const image = document.createElement('img'); image.loading = 'lazy'; image.src = src; Object.assign(image.style, { position: 'absolute', left: '70px', top: '10px', width: '40px', height: '40px' }); __nativeGateFixture.row.append(image); window.__addedDuringSeal = true; }); else requestAnimationFrame(watch); };
        requestAnimationFrame(watch);
    }, `${origin}/delay-added-during-seal.svg`);
    await until(() => responses.has('/delay-added-during-seal.svg'));
    await pending(); reply(responses.get('/delay-added-during-seal.svg'));
    assert.equal((await result()).decodedCount, 2); assert.equal(await h.page.evaluate(() => __addedDuringSeal), true); await cleanup(); proof.cases.push({ kind: 'late-visible-addition-reopens-seal' });

    await nativeFixture({ source: `${origin}/auto-pending-remove.svg` });
    await h.page.waitForFunction(() => __nativeGateFixture.visible.complete && __nativeGateFixture.visible.naturalWidth > 0);
    await h.page.evaluate(() => { __nativeGateFixture.visible.decode = () => new Promise(resolve => { window.__finishRemovedDecode = resolve; }); });
    await startGate({ ownerId: 'remove-during-decode', requireVisibleCover: false }); await pending();
    await h.page.waitForFunction(() => typeof window.__finishRemovedDecode === 'function');
    await h.page.evaluate(() => __nativeGateFixture.visible.remove());
    assert.equal((await result()).eligibleCount, 0); await h.page.evaluate(() => __finishRemovedDecode()); await cleanup(); proof.cases.push({ kind: 'removed-pending-decode-does-not-retain' });

    await nativeFixture(); await startGate({ ownerId: 'pagehide' }); await pending();
    await h.page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    assert.equal((await h.page.evaluate(() => __gateWait)).ok, false); await cleanup(); proof.cases.push({ kind: 'pagehide-disposes-pending-gate' });

    // Real1000-record controller fixture: a unique far lazy cover must stay
    // unassigned/unrequested; there is no helper-defined preload margin.
    await h.resetPage();
    await h.page.evaluate(async url => {
        window.__uniqueFarSkip = new WeakMap(); document.addEventListener('contentvisibilityautostatechange', event => __uniqueFarSkip.set(event.target, event.skipped), true);
        const { installSagaPerformanceFixture } = await import('/__performance/performance-fixtures.mjs');
        const fixture = await installSagaPerformanceFixture({ library: true, deckCount: 1000 });
        fixture.packs.at(-1).assets.cover = { path: url }; document.querySelector('#saga-lore-panel, .saga-lore-panel')?.remove(); fixture.openLibrary();
    }, `${origin}/delay-far-unique-sentinel.svg`);
    await h.page.waitForFunction(() => document.querySelectorAll('.saga-loredeck-library-deck-card').length === 1000);
    await h.page.waitForFunction(() => __uniqueFarSkip.get(document.querySelector('[data-pack-id="performance-deck-999"]')) === true);
    await paint(); assert.equal(requests.has('/delay-far-unique-sentinel.svg'), false);
    await startGate({ ownerId: 'far-unique' }); const farReady = await result();
    assert.ok(farReady.visibleDeckCoverCount > 0); assert.equal(requests.has('/delay-far-unique-sentinel.svg'), false);
    assert.equal(await h.page.evaluate(() => __uniqueFarSkip.get(document.querySelector('[data-pack-id="performance-deck-999"]'))), true);
    await cleanup(); proof.cases.push({ kind: 'actual1000-far-unique-lazy-cover-remains-unrequested' });
    assert.deepEqual(h.errors, []);
    await fs.writeFile(path.join(scratch, 'round3-image-browser-controls-proof.json'), JSON.stringify(proof, null, 2));
    console.log('Native image gate controls passed:', JSON.stringify(proof.cases));
} finally { try { await h.stop(); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } }
