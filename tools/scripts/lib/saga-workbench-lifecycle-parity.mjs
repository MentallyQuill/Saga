import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { startSagaPerformanceHarness } from './saga-performance-harness.mjs';
import { parityProvenance } from './saga-parity-provenance.mjs';

const h = await startSagaPerformanceHarness();
try {
    await h.page.evaluate(async () => {
        const { installSagaPerformanceFixture } = await import('/__performance/performance-fixtures.mjs');
        window.fixture = await installSagaPerformanceFixture({ entryCount: 100 });
        window.panel = await import('/src/loredecks/loredeck-workbench-panel.js');
        document.querySelector('#saga-lore-panel')?.remove();
        window.lifecycleWeakNodes = [];
    });
    const listeners = async () => {
        const result = await h.cdp.send('Runtime.evaluate', { expression: `JSON.stringify(Object.fromEntries(['document','window'].map(name => [name,Object.fromEntries(Object.entries(getEventListeners(name === 'document' ? document : window)).map(([type,items]) => [type,items.length]))])))`,
            includeCommandLineAPI: true, returnByValue: true, objectGroup: 'saga-lifecycle-counts' });
        await h.cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'saga-lifecycle-counts' });
        return JSON.parse(result.result.value);
    };
    const before = await listeners(); const cycles = [];
    const weakCapture = () => {
        for (const selector of ['#saga-loredeck-workbench', '.saga-lore-workbench-view', '.saga-loredeck-workbench-editor-form', '[name="fact"]', '.saga-loredeck-workbench-entry-row']) {
            const node = document.querySelector(selector);
            if (node) window.lifecycleWeakNodes.push({ selector, weak: new WeakRef(node) });
        }
    };
    for (let cycle = 0; cycle < 8; cycle++) {
        await h.page.evaluate(() => fixture.openWorkbench());
        // waitForSelector returns an ElementHandle retained by DevTools even if
        // ignored. A locator readiness wait does not root the editor under test.
        await h.page.locator('.saga-loredeck-workbench-editor-form').waitFor();
        await h.page.evaluate(() => {
        });
        await h.page.evaluate(weakCapture);
        await h.page.evaluate(() => {
            const row = document.querySelector('.saga-loredeck-workbench-entry-row'); row.dispatchEvent(new Event('mouseenter'));
            const input = document.querySelector('[name="notes"]'); input.value = 'Unsubmitted buffer'; input.dispatchEvent(new Event('input'));
            panel.refreshLoredeckWorkbench();
            panel.closeLoredeckWorkbench(); panel.closeLoredeckWorkbench(); panel.refreshLoredeckWorkbench();
        });
        await h.page.waitForTimeout(100);
        await h.cdp.send('HeapProfiler.collectGarbage'); await h.cdp.send('HeapProfiler.collectGarbage');
        cycles.push(await h.page.evaluate(() => ({
            live: lifecycleWeakNodes.filter(item => item.weak.deref()).map(item => item.selector),
            connectedEditors: document.querySelectorAll('.saga-loredeck-workbench-editor-form').length,
            tooltipVisible: document.querySelector('.saga-floating-tooltip')?.style.display === 'block',
            writes: fixture.persistenceCalls.length,
        })));
    }
    const pending = [];
    await h.page.route('**/__lifecycle/entries.json', route => new Promise(resolve => pending.push({ route, resolve })));
    const waitPending = async () => {
        for (let i = 0; i < 200 && !pending.length; i++) await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(pending.length, 1, 'One real pending source response');
    };
    const release = async () => { const { route, resolve } = pending.shift(); await route.fulfill({ contentType: 'application/json', body: '[]' }); resolve(); };
    const lateWork = [];
    for (const operation of ['load', 'save']) {
        await h.page.evaluate(() => fixture.openWorkbench());
        if (operation === 'save') { await waitPending(); await release(); }
        await h.page.locator('.saga-loredeck-workbench-editor-form').waitFor();
        await h.page.evaluate(weakCapture);
        await h.page.evaluate(operation => {
            const pack = fixture.registry.packs['performance-custom-a'];
            pack.manifest = `${location.origin}/__lifecycle/loredeck.json`; pack.manifestData.files = ['entries.json'];
            if (operation === 'load') [...document.querySelectorAll('#saga-loredeck-workbench button')].find(node => node.textContent === 'Reload Lorecards').click();
            else { const input = document.querySelector('[name="notes"]'); input.value = 'Pending save before close'; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur')); }
            panel.closeLoredeckWorkbench(); panel.refreshLoredeckWorkbench();
        }, operation);
        await waitPending(); await release(); await h.page.waitForTimeout(100);
        await h.cdp.send('HeapProfiler.collectGarbage'); await h.cdp.send('HeapProfiler.collectGarbage');
        lateWork.push({ operation, ...await h.page.evaluate(() => ({ live: lifecycleWeakNodes.filter(item => item.weak.deref()).map(item => item.selector),
            overlay: Boolean(document.querySelector('#saga-loredeck-workbench')), writes: fixture.persistenceCalls.length })) });
    }
    const after = await listeners();
    if (process.env.SAGA_LIFECYCLE_HEAP) {
        const chunks = [];
        h.cdp.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => chunks.push(chunk));
        await h.cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
        await writeFile(process.env.SAGA_LIFECYCLE_HEAP, chunks.join(''));
    }
    const report = { browser: h.browserVersion, provenance: await parityProvenance(['tools/scripts/lib/saga-workbench-lifecycle-parity.mjs']), before, after, cycles, lateWork, errors: h.errors };
    if (process.env.SAGA_LIFECYCLE_REPORT) await writeFile(process.env.SAGA_LIFECYCLE_REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    for (const result of cycles) assert.deepEqual(result, { live: [], connectedEditors: 0, tooltipVisible: false, writes: 0 });
    assert.deepEqual(lateWork, [{ operation: 'load', live: [], overlay: false, writes: 0 }, { operation: 'save', live: [], overlay: false, writes: 1 }]);
    assert.deepEqual(after, before, 'View-owned document/window listeners return to the pre-first-open counts');
    assert.deepEqual(h.errors, []);
} finally { await h.stop(); }
