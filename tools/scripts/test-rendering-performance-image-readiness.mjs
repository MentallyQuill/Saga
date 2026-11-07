import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startSagaPerformanceHarness } from './lib/saga-performance-harness.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const scratch = path.resolve('.tmp/sdd/rendering-performance');
const sourceRoot = path.resolve(arg('source-root', path.join(scratch, 'candidate-source-391de0bb')));
const fixtureRoot = path.join(scratch, 'capture-protocol-final/tests/browser');
const h = await startSagaPerformanceHarness({ sourceRoot, fixtureRoot, browserName: 'chromium', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, cpuRate: 1, cacheMode: 'cold' });
const paint = () => h.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
try {
    await h.page.evaluate(async () => {
        window.__gateSkippedRows = new WeakMap();
        document.addEventListener('contentvisibilityautostatechange', event => window.__gateSkippedRows.set(event.target, event.skipped), true);
        const { installSagaPerformanceFixture } = await import('/__performance/performance-fixtures.mjs');
        await installSagaPerformanceFixture({ library: true, deckCount: 77 });
        document.querySelector('#saga-lore-panel, .saga-lore-panel')?.remove();
        sagaPerformanceFixture.openLibrary();
    });
    await h.page.waitForSelector('.saga-loredeck-library-inline-folder-row');
    for (let i = 0; i < 100; i++) {
        const collapsed = h.page.locator('.saga-loredeck-library-folder-disclosure[aria-label^="Expand"]');
        if (!(await collapsed.count())) break;
        await collapsed.first().evaluate(button => button.click()); await paint();
    }
    await h.page.waitForFunction(() => document.querySelectorAll('.saga-loredeck-library-deck-card').length === 77);
    await h.page.evaluate(() => document.fonts.ready); await paint();
    await h.page.waitForFunction(() => [...document.querySelectorAll('.saga-loredeck-library-deck-card')].some(row => window.__gateSkippedRows.get(row) === true && row.querySelector('img')));
    if (args.includes('--old-method')) {
        const before = await h.readTaskMetrics();
        const proof = await h.page.evaluate(() => {
            const row = [...document.querySelectorAll('.saga-loredeck-library-deck-card')].reverse().find(row => window.__gateSkippedRows.get(row) === true && row.querySelector('img'));
            const nativeRect = Element.prototype.getBoundingClientRect;
            let reads = 0;
            Element.prototype.getBoundingClientRect = function (...args) { if (this.tagName === 'IMG' && row.contains(this)) reads++; return nativeRect.apply(this, args); };
            try {
                // Exact old frozen predicates. The regression expects no skipped descendant read.
                const completed = [...document.images].filter(img => img.loading !== 'lazy' || img.getBoundingClientRect().top < innerHeight * 2).every(img => img.complete);
                const visible = [...document.querySelectorAll('.saga-loredeck-library-deck-card img')].filter(img => { const r = img.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
                return { source: location.origin, packId: row.dataset.packId, skippedBefore: true, skippedAfter: window.__gateSkippedRows.get(row), skippedDescendantReads: reads, completed, visibleCount: visible.length };
            } finally { Element.prototype.getBoundingClientRect = nativeRect; }
        });
        const after = await h.readTaskMetrics();
        proof.layoutCount = after.LayoutCount - before.LayoutCount;
        proof.layoutMs = (after.LayoutDuration - before.LayoutDuration) * 1000;
        await fs.writeFile(path.join(scratch, 'round3-old-method-proof.json'), JSON.stringify(proof, null, 2));
        console.log('Real old-method containment proof:', JSON.stringify(proof));
        assert.equal(proof.skippedDescendantReads, 0, 'Readiness must not query a genuinely skipped Library descendant');
    } else {
        const { installSagaPerformanceImageReadiness } = await import('./lib/saga-performance-image-readiness.mjs');
        const idleBefore = await h.readTaskMetrics(); await paint(); const idleAfter = await h.readTaskMetrics();
        assert.equal(idleAfter.LayoutCount - idleBefore.LayoutCount, 0, 'Native nonforcing proof requires a quiet existing fixture');
        const before = await h.readTaskMetrics();
        const proof = await h.page.evaluate(async text => {
            const far = [...document.querySelectorAll('.saga-loredeck-library-deck-card')].reverse().find(row => window.__gateSkippedRows.get(row) === true && row.querySelector('img'));
            const nativeRect = Element.prototype.getBoundingClientRect; const nativeDecode = HTMLImageElement.prototype.decode;
            const calls = { geometryReads: 0, skippedDescendantIO: 0, skippedDescendantDecode: 0 };
            Element.prototype.getBoundingClientRect = function (...args) { calls.geometryReads++; return nativeRect.apply(this, args); };
            HTMLImageElement.prototype.decode = function (...args) { if (far.contains(this)) calls.skippedDescendantDecode++; return nativeDecode.apply(this, args); };
            const install = (0, eval)(`(${text})`);
            try {
                install({ requireVisibleCover: true, ownerId: 'real-library-gate', observerFactory(callback, settings) {
                    const observer = new IntersectionObserver(callback, settings);
                    return { observe(target) { if (target !== far && far.contains(target)) calls.skippedDescendantIO++; observer.observe(target); }, unobserve: target => observer.unobserve(target), disconnect: () => observer.disconnect(), takeRecords: () => observer.takeRecords() };
                } });
                const snapshot = await window.__sagaPerformanceImageReadiness.waitForReady();
                const handle = window.__sagaPerformanceImageReadiness; handle.dispose();
                return { ...calls, packId: far.dataset.packId, skippedAfter: window.__gateSkippedRows.get(far), snapshot, cleanup: handle.diagnostics() };
            } finally { Element.prototype.getBoundingClientRect = nativeRect; HTMLImageElement.prototype.decode = nativeDecode; window.__sagaPerformanceImageReadiness?.dispose(); }
        }, installSagaPerformanceImageReadiness.toString());
        const after = await h.readTaskMetrics();
        proof.layoutCount = after.LayoutCount - before.LayoutCount; proof.layoutMs = (after.LayoutDuration - before.LayoutDuration) * 1000;
        await fs.writeFile(path.join(scratch, `round3-${path.basename(sourceRoot).startsWith('baseline') ? 'original' : 'candidate'}-real-library-nonforcing-proof.json`), JSON.stringify(proof, null, 2));
        assert.ok(proof.snapshot.visibleDeckCoverCount > 0); assert.equal(proof.snapshot.eligibleCount, proof.snapshot.decodedCount);
        assert.equal(proof.geometryReads, 0); assert.equal(proof.skippedDescendantIO, 0); assert.equal(proof.skippedDescendantDecode, 0); assert.equal(proof.skippedAfter, true);
        assert.equal(proof.layoutCount, 0, 'The quiet native gate phase must not lay out skipped contents');
        assert.deepEqual(proof.cleanup, { activeObservers: 0, retainedNodes: 0, pendingFrames: 0, pendingTimers: 0, pagehideListening: false });
        console.log('Real contained Library proof:', JSON.stringify({ sourceRoot, skippedPack: proof.packId, eligible: proof.snapshot.eligibleCount, decoded: proof.snapshot.decodedCount, visibleDeckCovers: proof.snapshot.visibleDeckCoverCount, geometryReads: proof.geometryReads, skippedDescendantIO: proof.skippedDescendantIO, layoutCount: proof.layoutCount, layoutMs: proof.layoutMs, cleanup: proof.cleanup }));
    }
} finally { await h.stop(); }
