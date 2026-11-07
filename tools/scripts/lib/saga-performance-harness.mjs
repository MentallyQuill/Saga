import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { startVisualSmokeServer } from '../serve-visual-smoke.mjs';
import { assertCachePolicy } from './saga-performance-report.mjs';
import { createSagaPerformanceRequestJournal } from './saga-performance-request-journal.mjs';

export async function startSagaPerformanceHarness({ sourceRoot, fixtureRoot, browserName = 'chromium', viewport = { width: 1440, height: 900 }, deviceScaleFactor = 1, cpuRate = 1, cacheMode = 'cold', chromiumArgs } = {}) {
    assert.ok(['chromium', 'firefox', 'webkit'].includes(browserName), 'Unknown browser');
    assert.ok(cpuRate >= 1 && Number.isFinite(cpuRate), 'Invalid CPU rate');
    if (browserName !== 'chromium' && cpuRate !== 1) throw new Error('CDP CPU throttling is only available in Chromium');
    // Validate before importing/allocating a browser or listening server.
    assertCachePolicy(cacheMode, 'public, max-age=3600');
    const playwright = await import(process.env.SAGA_PLAYWRIGHT_PATH ? pathToFileURL(process.env.SAGA_PLAYWRIGHT_PATH).href : 'playwright');
    const server = await startVisualSmokeServer({ sourceRoot, fixtureRoot, port: 0, browserCache: true });
    let browser, context, page, cdp;
    let sessionSerial = 0;
    let capabilities;
    const errors = [];
    const journal = createSagaPerformanceRequestJournal();
    const sessions = new Set();
    try {
        let executablePath = browserName === 'chromium' ? process.env.SAGA_CHROME_PATH : undefined;
        if (!executablePath && browserName === 'chromium' && process.platform === 'win32') {
            for (const candidate of ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']) {
                try { await access(candidate); executablePath = candidate; break; } catch { /* Try next. */ }
            }
        }
        browser = await playwright[browserName].launch({ headless: true, executablePath, args: browserName === 'chromium' ? chromiumArgs : undefined });
        async function resetPage() {
            if (context) await context.close();
            context = await browser.newContext({ viewport, deviceScaleFactor, isMobile: browserName !== 'firefox' && viewport.width < 600, hasTouch: viewport.width < 600 });
            page = await context.newPage();
            page.setDefaultTimeout(30000);
            page.on('pageerror', error => errors.push(error.message));
            cdp = null;
            if (browserName === 'chromium') {
                cdp = await context.newCDPSession(page);
                await cdp.send('Performance.enable');
                await cdp.send('Network.enable');
                const serial = ++sessionSerial;
                const activeIds = new Map();
                cdp.on('Network.requestWillBeSent', event => {
                    const previous = activeIds.get(event.requestId);
                    if (previous && event.redirectResponse) {
                        journal.respond(previous, event.redirectResponse);
                        journal.finish(previous, event.redirectResponse.encodedDataLength);
                    }
                    const id = `${serial}:${event.requestId}:${journal.mark()}`;
                    activeIds.set(event.requestId, id);
                    journal.start({ id, url: event.request.url, type: event.type, startedAt: event.wallTime * 1000 });
                });
                cdp.on('Network.responseReceived', event => { const id = activeIds.get(event.requestId); if (id) journal.respond(id, event.response); });
                cdp.on('Network.loadingFinished', event => { const id = activeIds.get(event.requestId); if (id) journal.finish(id, event.encodedDataLength); });
                cdp.on('Network.loadingFailed', event => { const id = activeIds.get(event.requestId); if (id) journal.fail(id, event.errorText); });
                await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
                await cdp.send('Network.setCacheDisabled', { cacheDisabled: cacheMode === 'cold' });
            }
            await page.addInitScript(() => {
                performance.setResourceTimingBufferSize(20000);
                const measurement = { added: 0, removed: 0, longTasks: [], supportsLongTasks: false };
                new MutationObserver(records => { for (const r of records) { measurement.added += r.addedNodes.length; measurement.removed += r.removedNodes.length; } }).observe(document, { subtree: true, childList: true });
                try {
                    if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
                        new PerformanceObserver(list => measurement.longTasks.push(...list.getEntries().map(e => ({ startTime: e.startTime, duration: e.duration })))).observe({ type: 'longtask', buffered: true });
                        measurement.supportsLongTasks = true;
                    }
                } catch { /* Explicitly unavailable, never reported as measured zero. */ }
                window.__sagaPerformanceMeasurement = measurement;
            });
            await page.goto(`${server.origin}/tests/browser/visual-smoke.html`, { waitUntil: 'load' });
            await page.waitForFunction(() => window.__sagaSmokeReady === true);
            await page.waitForLoadState('networkidle');
            capabilities = { taskCpu: Boolean(cdp), networkBytes: Boolean(cdp), longTasks: await page.evaluate(() => window.__sagaPerformanceMeasurement.supportsLongTasks) };
            return page;
        }
        await resetPage();
        return {
            get page() { return page; }, get cdp() { return cdp; }, get capabilities() { return { ...capabilities }; }, browserVersion: browser.version(), browserName, executablePath: executablePath || playwright[browserName].executablePath(),
            origin: server.origin, cacheControl: server.cacheControl, errors, journal, resetPage,
            get requests() { return journal.snapshot(); },
            get network() { return journal.snapshot().filter(record => record.state === 'complete'); },
            async readTaskMetrics() { return cdp ? Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value])) : null; },
            async gateSourceResponses(pattern) {
                // Opt-in only: Playwright routing disables HTTP caching. Never use during timed cache captures.
                const pending = [];
                await page.route(pattern, route => new Promise(resolve => pending.push({ route, resolve })));
                const gate = { pending, async releaseAll() { for (const item of pending.splice(0)) { await item.route.continue(); item.resolve(); } }, async dispose() { await this.releaseAll(); await page.unroute(pattern); sessions.delete(gate); } };
                sessions.add(gate); return gate;
            },
            async stop() { try { for (const gate of sessions) await gate.dispose(); await browser.close(); } finally { await server.stop(); } },
        };
    } catch (error) { try { if (browser) await browser.close(); } finally { await server.stop(); } throw error; }
}
