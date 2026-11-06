import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startSagaPerformanceHarness } from './lib/saga-performance-harness.mjs';
import { validateCapture, summarizeSamples } from './lib/saga-performance-report.mjs';
import { resourceBytesForWindow } from './lib/saga-performance-request-journal.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const args = process.argv.slice(2);
assert.ok(!args.includes('--resume'), 'Resume is unsupported: every invocation must capture the complete requested matrix with the current source, browser and protocol.');
const arg = (name, fallback) => { const inline = args.find(a => a.startsWith(`--${name}=`)); const i = args.indexOf(`--${name}`); return inline ? inline.slice(name.length + 3) : i >= 0 ? args[i + 1] : fallback; };
const sourceRoot = path.resolve(arg('source-root', root));
const fixtureRoot = path.resolve(arg('fixture-root', path.join(root, 'tests/browser')));
const output = path.resolve(arg('output', path.join(root, '.tmp/saga-performance/capture')));
const warmRuns = Number(arg('warm-runs', '30'));
const coldRuns = Number(arg('cold-runs', '20'));
const browserName = arg('browser', 'chromium');
assert.equal(browserName, 'chromium', 'Timed collection requires Chromium with CDP network/CPU metrics; use the harness directly for cross-engine UI parity.');
const cpuRates = arg('cpu-rates', '1,4').split(',').map(Number);
assert.ok(cpuRates.every(rate => Number.isFinite(rate) && rate >= 1), 'CPU rates must be finite and at least1');
assert.equal(new Set(cpuRates).size, cpuRates.length, 'Duplicate CPU rates are not allowed');
assert.ok(Number.isInteger(warmRuns) && warmRuns > 0 && Number.isInteger(coldRuns) && coldRuns > 0, 'Run counts must be positive integers');
await fs.mkdir(output, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureHash = hash(await fs.readFile(path.join(fixtureRoot, 'performance-fixtures.mjs')));
const protocolFiles = ['tools/scripts/capture-rendering-performance.mjs', 'tools/scripts/lib/saga-performance-harness.mjs', 'tools/scripts/lib/saga-performance-report.mjs', 'tools/scripts/lib/saga-performance-request-journal.mjs', 'tools/scripts/serve-visual-smoke.mjs'];
const protocolHash = hash(Buffer.concat(await Promise.all(protocolFiles.map(async file => Buffer.concat([Buffer.from(file), await fs.readFile(path.join(root, file))])))));
const sourceFiles = (await Promise.all(['src', 'styles'].map(async dir => (await fs.readdir(path.join(sourceRoot, dir), { recursive: true, withFileTypes: true })).filter(e => e.isFile()).map(e => path.relative(sourceRoot, path.join(e.parentPath, e.name)).replaceAll('\\', '/'))))).flat().sort();
sourceFiles.push('manifest.json');
try { for (const e of await fs.readdir(path.join(sourceRoot, 'assets/generated'), { recursive: true, withFileTypes: true })) if (e.isFile()) sourceFiles.push(path.relative(sourceRoot, path.join(e.parentPath, e.name))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
sourceFiles.sort();
const sourceHash = hash(Buffer.concat(await Promise.all(sourceFiles.map(async file => Buffer.concat([Buffer.from(file), await fs.readFile(path.join(sourceRoot, file))])))));
let sourceRevision = arg('source-revision', 'unrecorded');
try { if (sourceRevision === 'unrecorded') sourceRevision = (await fs.readFile(path.join(sourceRoot, '.saga-baseline-revision'), 'utf8')).trim(); } catch { if (sourceRevision === 'unrecorded') sourceRevision = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(); }
await fs.writeFile(path.join(output, 'fixture-source.mjs'), await fs.readFile(path.join(fixtureRoot, 'performance-fixtures.mjs')));
for (const file of protocolFiles) { const target = path.join(output, 'protocol', file); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.copyFile(path.join(root, file), target); }
const bundled = JSON.parse(await fs.readFile(path.join(sourceRoot, 'content/loredecks/index.json'), 'utf8')).bundled;
const coverPool = bundled.filter(p => p.assets?.cover?.path).map(p => ({ packId: p.packId, path: `content/loredecks/${p.packId}/${p.assets?.cover?.path || 'assets/cover.png'}` }));
const absentCoverPackIds = bundled.filter(p => !p.assets?.cover?.path).map(p => p.packId);
const coverHashes = Object.fromEntries(await Promise.all(coverPool.map(async c => [c.path, hash(await fs.readFile(path.join(sourceRoot, c.path)))])));
const cases = [
    { id: 'library-77', library: true, deckCount: 77, entryCount: 100, type: 'bundled' },
    { id: 'library-1000', library: true, deckCount: 1000, entryCount: 100, type: 'custom' },
    ...[100, 500, 600].map(entryCount => ({ id: `workbench-${entryCount}`, library: false, deckCount: 1, entryCount, type: 'custom' })),
].filter(c => !arg('cases', '') || arg('cases', '').split(',').includes(c.id));
const profiles = [
    { id: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    { id: 'phone', viewport: { width: 430, height: 820 }, deviceScaleFactor: 3 },
].filter(p => !arg('profiles', '') || arg('profiles', '').split(',').includes(p.id));

const index = { schemaVersion: 1, createdAt: new Date().toISOString(), sourceRoot, fixtureRoot, sourceRevision, sourceHash, protocolHash, fixtureHash, coverHashes, absentCoverPackIds, environment: { platform: process.platform, release: os.release(), arch: process.arch, cpu: os.cpus()[0]?.model, node: process.version }, requestedRuns: { warm: warmRuns, cold: coldRuns }, completeRunCounts: warmRuns >= 30 && coldRuns >= 20, captures: [], limitations: ['The actual 77-deck index declares 70 cover assets; seven DS9 decks retain their existing monogram fallback.', 'At the phone viewport the baseline workbench table is occluded by toolbar/detail layout; real keyboard activation measures row selections, and the pointer-access failure remains recorded.', 'Desktop viewport emulation is not real Android or iOS hardware coverage.', 'CDP task metrics available for Chromium only.', 'Clone/model invocation counts and retained component/listener counts require later structural instrumentation and parity evidence.'] };
const nextPaint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function install(h, c) {
    return h.page.evaluate(async options => {
        const { installSagaPerformanceFixture } = await import('/__performance/performance-fixtures.mjs');
        const fixture = await installSagaPerformanceFixture(options);
        document.querySelector('#saga-lore-panel, .saga-lore-panel')?.remove();
        return { revision: fixture.revision, count: fixture.packs.length };
    }, { ...c, coverPool });
}
async function resetMeasurement(page) {
    await page.evaluate(() => {
        const m = window.__sagaPerformanceMeasurement;
        m.added = 0; m.removed = 0; m.longTasks = [];
        performance.clearResourceTimings();
        window.__sagaPerformanceStart = performance.now();
    });
}
async function snapshotObservations(page) {
    return page.evaluate(() => {
        const m = window.__sagaPerformanceMeasurement;
        const startMs = window.__sagaPerformanceStart;
        const endMs = performance.now();
        return { mutationsAdded: m.added, mutationsRemoved: m.removed, longTaskMs: m.supportsLongTasks ? m.longTasks.filter(t => t.startTime >= startMs && t.startTime < endMs).reduce((sum, t) => sum + t.duration, 0) : null, resourceWindow: { startMs, endMs }, uniqueImageUrls: [...new Set([...document.images].map(i => i.currentSrc || i.src).filter(Boolean))] };
    });
}
async function settleObservationBytes(h, start, end, dom) {
    // Readiness/CPU/DOM snapshots are already closed. Wait only requests whose
    // initiation IDs belong to this window; never force an offscreen image.
    const network = await h.journal.settle(start, end);
    const resources = await h.page.evaluate(() => performance.getEntriesByType('resource').map(r => ({ startTime: r.startTime, transferSize: r.transferSize })));
    return { ...dom, requestWindow: { start, end, ids: network.map(r => r.id) }, resourceBytes: resourceBytesForWindow(resources, dom.resourceWindow), transferBytes: network.reduce((sum, r) => sum + r.encodedDataLength, 0), imageBytes: network.filter(r => r.type === 'Image').reduce((sum, r) => sum + r.encodedDataLength, 0), network };
}
async function open(h, c) {
    await resetMeasurement(h.page); const start = h.journal.mark();
    await h.page.evaluate(library => { const f = window.sagaPerformanceFixture; if (library) f.openLibrary(); else f.openWorkbench(); }, c.library);
    const rowSelector = c.library ? '.saga-loredeck-library-deck-card, .saga-loredeck-library-inline-folder-row' : '.saga-loredeck-workbench-entry-row';
    await h.page.waitForSelector(rowSelector);
    const firstUsefulContentMs = await h.page.evaluate(() => performance.now() - window.__sagaPerformanceStart);
    if (c.library) {
        // Exercise the real folder disclosure handlers, retaining the actual bundled hierarchy and covers.
        for (let i = 0; i < 100; i++) {
            const collapsed = h.page.locator('.saga-loredeck-library-folder-disclosure[aria-label^="Expand"]');
            if (!(await collapsed.count())) break;
            await collapsed.first().evaluate(button => button.click());
            await nextPaint(h.page);
        }
    }
    await h.page.waitForFunction(({ library, expected }) => document.querySelectorAll(library ? '.saga-loredeck-library-deck-card' : '.saga-loredeck-workbench-entry-row').length === expected, { library: c.library, expected: c.library ? c.deckCount : Math.min(500, c.entryCount) });
    await h.page.evaluate(() => document.fonts.ready);
    await h.page.waitForFunction(() => [...document.images].filter(img => img.loading !== 'lazy' || img.getBoundingClientRect().top < innerHeight * 2).every(img => img.complete), null, { polling: 'raf', timeout: 30000 });
    await nextPaint(h.page);
    if (c.library) {
        const visibleCovers = await h.page.locator('.saga-loredeck-library-deck-card img').evaluateAll(images => images.filter(img => { const r = img.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }).map(img => ({ src: img.currentSrc || img.src, decoded: img.complete && img.naturalWidth > 0 })));
        assert.ok(visibleCovers.length > 0 && visibleCovers.every(img => img.decoded), 'Visible cover images must actually decode');
        assert.ok(!h.journal.snapshot(start).some(r => r.type === 'Image' && /\/content\/loredecks\//.test(r.url) && r.status >= 400), 'Canonical cover responses must not be missing');
    }
    const dom = await snapshotObservations(h.page);
    const end = h.journal.mark();
    const readinessMs = dom.resourceWindow.endMs - dom.resourceWindow.startMs;
    return { kind: 'open', readinessMs, firstUsefulContentMs, interactionMs: null, selectionCpuMs: null, ...(await settleObservationBytes(h, start, end, dom)) };
}
async function selection(h, c) {
    const mobileLibrary = c.library && h.page.viewportSize().width < 600;
    const keyboardSelection = h.page.viewportSize().width < 600;
    if (mobileLibrary && await h.page.locator('.saga-loredeck-library-mobile-detail-close').count()) { await h.page.locator('.saga-loredeck-library-mobile-detail-close').click(); await nextPaint(h.page); }
    const rows = h.page.locator(c.library ? '.saga-loredeck-library-deck-card' : '.saga-loredeck-workbench-entry-row');
    const beforeId = await h.page.evaluate(library => library ? window.sagaPerformanceFixture.state.lorePanel.selectedLoredeckId : document.querySelector('.saga-loredeck-workbench-entry-row.saga-lore-workbench-row-active .saga-lore-workbench-cell-sub')?.textContent, c.library);
    const targetIndex = c.library ? (await rows.nth(0).getAttribute('data-pack-id')) === beforeId ? 1 : 0 : await rows.nth(0).evaluate(node => node.classList.contains('saga-lore-workbench-row-active')) ? 1 : 0;
    const target = rows.nth(targetIndex);
    if (!c.library) assert.equal(await target.evaluate(n => n.classList.contains('saga-lore-workbench-row-active')), false);
    await target.scrollIntoViewIfNeeded();
    await resetMeasurement(h.page);
    await h.page.evaluate(eventType => {
        window.__sagaClickStart = null; window.__sagaClickPaint = null;
        document.addEventListener(eventType, () => { window.__sagaClickStart = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => { window.__sagaClickPaint = performance.now(); })); }, { capture: true, once: true });
    }, mobileLibrary ? 'keydown' : 'click');
    const start = h.journal.mark();
    const before = await h.readTaskMetrics();
    if (keyboardSelection) await target.press('Enter'); else await target.click();
    await h.page.waitForFunction(() => window.__sagaClickPaint !== null);
    const after = await h.readTaskMetrics();
    const afterId = await h.page.evaluate(library => library ? window.sagaPerformanceFixture.state.lorePanel.selectedLoredeckId : document.querySelector('.saga-loredeck-workbench-entry-row.saga-lore-workbench-row-active .saga-lore-workbench-cell-sub')?.textContent, c.library);
    assert.ok(beforeId && afterId && beforeId !== afterId, `Rejected no-op selection: ${beforeId} -> ${afterId}`);
    const interactionMs = await h.page.evaluate(() => window.__sagaClickPaint - window.__sagaClickStart);
    const dom = await snapshotObservations(h.page);
    const end = h.journal.mark();
    return { kind: 'interaction', readinessMs: null, firstUsefulContentMs: null, interactionKind: mobileLibrary ? 'keyboard-open-mobile-detail' : keyboardSelection ? 'keyboard-selection' : 'click-selection', interactionMs, selectionCpuMs: before ? (after.TaskDuration - before.TaskDuration) * 1000 : null, beforeId, afterId, ...(await settleObservationBytes(h, start, end, dom)) };
}
async function screenshot(h, name) {
    const file = `${name}.png`; await h.page.screenshot({ path: path.join(output, file), fullPage: true });
    return { file, sha256: hash(await fs.readFile(path.join(output, file))) };
}
for (const profile of profiles) for (const cpuRate of cpuRates) for (const c of cases) for (const cacheMode of ['cold', 'warm']) {
    const id = `${c.id}-${profile.id}-${cpuRate}x-${cacheMode}`;
    console.log('Capturing', id);
    const h = await startSagaPerformanceHarness({ sourceRoot, fixtureRoot, browserName, ...profile, cpuRate, cacheMode });
    try {
        const capture = { metadata: { fixture: { ...c, revision: fixtureHash, coverPool, coverHashes, absentCoverPackIds }, browser: { name: browserName, version: h.browserVersion }, viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, cpuRate, cacheMode, cacheControl: h.cacheControl, theme: 'default', capabilities: h.capabilities, byteMeasurementMethod: 'CDP request-initiation window, settled after timed readiness', protocolHash, environment: index.environment, sourceRevision: index.sourceRevision, sourceHash, executablePath: h.executablePath }, samples: [], startupRequests: [], limitations: index.limitations };
        for (let run = 0; run < (cacheMode === 'cold' ? coldRuns : 1); run++) {
            console.log('Opening', id, run + 1);
            if (run) await h.resetPage();
            await install(h, c);
            if (!run) { capture.startupRequests = h.requests.slice(); capture.firstOpenStartedAt = await h.page.evaluate(() => performance.timeOrigin + performance.now()); }
            const initial = await open(h, c);
            if (!run) { capture.screenshot = await screenshot(h, id); capture.throughOpenRequests = h.requests.slice(); capture.initialOpen = initial; }
            if (cacheMode === 'cold') capture.samples.push({ run, ...initial });
        }
        if (cacheMode === 'warm') {
            // Start from a distinct real selection; library defaults may have no selected deck.
            if (c.library && !(await h.page.evaluate(() => window.sagaPerformanceFixture.state.lorePanel.selectedLoredeckId))) { const first = h.page.locator('.saga-loredeck-library-deck-card').first(); if (profile.id === 'phone') await first.press('Enter'); else await first.click(); }
            for (let run = 0; run < warmRuns; run++) capture.samples.push({ run, ...(await selection(h, c)) });
        }
        if (c.entryCount > 500 && !c.library) {
            await h.page.locator('#saga-loredeck-workbench button').filter({ hasText: /^Select Visible$/ }).click();
            capture.selectionSemantics = { displayRows: await h.page.locator('.saga-loredeck-workbench-entry-row').count(), selectedSummary: await h.page.locator('.saga-loredeck-workbench-bulk-summary').innerText(), limitMessage: await h.page.locator('.saga-lore-workbench-row-note').innerText() };
            assert.match(capture.selectionSemantics.selectedSummary, /600/);
        }
        capture.pageErrors = h.errors.slice(); assert.deepEqual(capture.pageErrors, []);
        capture.summary = Object.fromEntries(['readinessMs', 'firstUsefulContentMs', 'interactionMs', 'selectionCpuMs', 'transferBytes', 'imageBytes', 'longTaskMs'].map(field => [field, summarizeSamples(capture.samples, field)]));
        validateCapture(capture);
        await fs.writeFile(path.join(output, `${id}.json`), `${JSON.stringify(capture, null, 2)}\n`);
        index.captures.push({ id, file: `${id}.json`, screenshot: capture.screenshot });
        await fs.writeFile(path.join(output, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
        console.log('Captured', id, capture.samples.length, 'samples', JSON.stringify(capture.summary));
    } finally { await h.stop(); }
}
// Additional tablet visual references use the same real fixtures; timings remain desktop/phone only.
if (!args.includes('--skip-tablet')) for (const c of cases) {
    const h = await startSagaPerformanceHarness({ sourceRoot, fixtureRoot, browserName, viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, cpuRate: 1, cacheMode: 'warm' });
    try { await install(h, c); await open(h, c); index.captures.push({ id: `${c.id}-tablet-visual`, metadata: { fixture: { ...c, revision: fixtureHash, coverPool, coverHashes, absentCoverPackIds }, browser: { name: browserName, version: h.browserVersion }, viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, cpuRate: 1, cacheMode: 'warm', cacheControl: h.cacheControl, theme: 'default', sourceRevision, sourceHash, protocolHash, environment: index.environment }, screenshot: await screenshot(h, `${c.id}-tablet-visual`) }); }
    finally { await h.stop(); }
}
await fs.writeFile(path.join(output, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(`Capture complete: ${index.captures.length} cases; full run counts: ${index.completeRunCounts}; ${output}`);
