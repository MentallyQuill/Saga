import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startVisualSmokeServer } from '../serve-visual-smoke.mjs';
import { startNativeFirefox } from './saga-native-webdriver.mjs';
import { parityProvenance, paritySourceRoot } from './saga-parity-provenance.mjs';

const server = await startVisualSmokeServer({ port: 0, sourceRoot: paritySourceRoot });
let native, browser;
const report = { platform: process.platform, provenance: await parityProvenance([
    'tests/browser/workbench-adapter-contract.html', 'tests/browser/workbench-adapter-contract.mjs', 'tools/scripts/lib/saga-native-webdriver.mjs', 'tools/scripts/lib/saga-workbench-native-parity.mjs',
    process.env.SAGA_OLD_CHROMIUM_PATH, process.env.SAGA_FIREFOX_BINARY, process.env.SAGA_GECKODRIVER_PATH,
]), checks: [] };
function checkContract(result) {
    const { cover, ...adapter } = result;
    assert.deepEqual(adapter, { rows: 500, retained: true, selected: 500, logical: 601, loading: 'Loading Lorecards...', clicked: 'entry-1',
        disposed: 5, mounted: 5, connectedCleanup: true, children: 0, errors: [] });
    assert.equal(cover.loaded, true); assert.equal(cover.stylesRestored, true);
    assert.equal(cover.width, 64); assert.equal(cover.height, 80);
    if (cover.unsupportedAspectRatio) assert.equal(cover.originalSelected, true, 'Actual legacy engine keeps original cover source and baseline styles');
}
try {
    if (process.env.SAGA_OLD_CHROMIUM_PATH) {
        browser = await chromium.launch({ headless: true, executablePath: process.env.SAGA_OLD_CHROMIUM_PATH });
        assert.match(browser.version(), /^87\./);
        const page = await browser.newPage(); const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`${server.origin}/__performance/workbench-adapter-contract.html`);
        const result = await page.evaluate(async () => await window.contractPromise);
        checkContract(result); assert.deepEqual(errors, []);
        report.checks.push({ browser: 'Actual Chromium 87', version: browser.version(), contract: result,
            capabilities: await page.evaluate(() => ({ aspectRatio: CSS.supports('aspect-ratio', '1 / 1') })) });
        await browser.close(); browser = null;
    }
    if (process.env.SAGA_FIREFOX_BINARY || process.env.SAGA_GECKODRIVER_PATH) {
        native = await startNativeFirefox({ binary: process.env.SAGA_FIREFOX_BINARY, driverPath: process.env.SAGA_GECKODRIVER_PATH,
            expectedVersion: process.env.SAGA_FIREFOX_EXPECTED_VERSION || '^153\\.6\\.0' });
        await native.goto(`${server.origin}/__performance/workbench-adapter-contract.html`);
        const contract = await native.evaluate(async () => await window.contractPromise); checkContract(contract);
        report.checks.push({ browser: 'Actual native Firefox', capabilities: native.capabilities, contract });
        if (process.env.SAGA_NATIVE_FULL_PARITY === '1') {
            await native.goto(`${server.origin}/tests/browser/visual-smoke.html`);
            const result = await native.evaluate(async () => {
                const wait = async predicate => { for (let i = 0; i < 300; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw new Error('Native parity condition timed out'); };
                await wait(() => window.__sagaSmokeReady);
                const { installSagaPerformanceFixture } = await import('/__performance/performance-fixtures.mjs');
                const panel = await import('/src/loredecks/loredeck-workbench-panel.js');
                const fixture = await installSagaPerformanceFixture({ entryCount: 600 }); fixture.openWorkbench();
                await wait(() => document.querySelector('.saga-loredeck-workbench-editor-form'));
                const one = selector => document.querySelector(selector);
                const title = one('[name="title"]'), row = one('.saga-loredeck-workbench-entry-row');
                title.value = 'Native ESR buffer'; title.focus(); title.setSelectionRange(2, 8);
                title.dispatchEvent(new CompositionEvent('compositionstart', { data: 'Native' })); title.dispatchEvent(new Event('input'));
                panel.refreshLoredeckWorkbench();
                const retained = one('[name="title"]') === title && title.value === 'Native ESR buffer' && title.selectionStart === 2
                    && one('.saga-loredeck-workbench-entry-row') === row && fixture.persistenceCalls.length === 0;
                title.dispatchEvent(new CompositionEvent('compositionend')); title.dispatchEvent(new Event('blur'));
                await wait(() => one('.saga-lore-workbench-main') && !one('.saga-lore-workbench-main').hidden);
                const saved = fixture.persistenceCalls.length === 1 && fixture.persistenceCalls[0].after.entryOverrides['fixture.entry.0001'].title === 'Native ESR buffer';
                one('.saga-lore-workbench-row-header [role="checkbox"]').click();
                const selected = one('.saga-loredeck-workbench-bulk-summary').textContent;
                const buttons = text => Array.from(document.querySelectorAll('#saga-loredeck-workbench button')).find(node => node.textContent === text);
                buttons('New Lorecard').click(); const draftId = one('[name="machineId"]').value;
                one('[name="title"]').value = 'Native created title'; one('[name="title"]').dispatchEvent(new Event('input'));
                one('[name="fact"]').value = 'Native created fact'; one('[name="fact"]').dispatchEvent(new Event('input'));
                buttons('Create Lorecard').click();
                await wait(() => one('.saga-loredeck-workbench-editor-form')?.dataset.entryId === draftId && !one('[name="machineId"]'));
                const created = fixture.persistenceCalls.length === 2 && fixture.persistenceCalls[1].after.entryOverrides[draftId].content.fact === 'Native created fact';
                panel.closeLoredeckWorkbench(); panel.refreshLoredeckWorkbench(); await new Promise(resolve => setTimeout(resolve, 50));
                return { retained, saved, selected, created, closed: !one('#saga-loredeck-workbench'), writes: fixture.persistenceCalls.length,
                    userAgent: navigator.userAgent };
            });
            assert.equal(result.retained, true); assert.equal(result.saved, true); assert.equal(result.selected, '600 selected');
            assert.equal(result.created, true); assert.equal(result.closed, true); assert.equal(result.writes, 2);
            report.checks.push({ browser: 'Actual Firefox ESR public controller/loader parity', result });
        }
    }
    assert.ok(report.checks.length, 'Configure at least one actual native target; no silent skip');
    console.log(JSON.stringify(report, null, 2));
} finally {
    await native?.stop(); await browser?.close(); await server.stop();
    if (process.env.SAGA_NATIVE_REPORT) await writeFile(process.env.SAGA_NATIVE_REPORT, JSON.stringify(report, null, 2));
}
