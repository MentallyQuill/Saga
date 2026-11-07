import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as report from './lib/saga-performance-report.mjs';

// This deliberately tiny suite cannot reach resampling or allocate a browser.
assert.equal(typeof report.evaluateRenderingPerformance, 'function', 'Missing matrix acceptance API');
assert.equal(report.evaluateRenderingPerformance({}, {}).status, 'fail', 'A capture pair or missing matrix cannot pass');
assert.equal(report.classifyRenderingInterval('gain', [.18, .22]), 'inconclusive');
assert.equal(report.classifyRenderingInterval('gain', [.20, .20]), 'pass');
assert.equal(report.classifyRenderingInterval('excess', [0, 0]), 'pass');
assert.equal(report.classifyRenderingInterval('cover', [0, 0]), 'fail');
assert.equal(report.classifyRenderingInterval('excess', [-1, 1]), 'inconclusive');

// Exercise the actual collector setup without importing its CLI entrypoint.
const collector = await readFile(new URL('./capture-rendering-performance.mjs', import.meta.url), 'utf8');
const installStart = collector.indexOf('async function install(h, c)');
const installEnd = collector.indexOf('async function resetMeasurement', installStart);
assert.ok(installStart >= 0 && installEnd > installStart);
const coverPool = [{ packId: 'example', path: 'content/loredecks/example/cover.png' }];
const install = new Function('assert', 'coverPool', `${collector.slice(installStart, installEnd)}\nreturn install;`)(assert, coverPool);
const fixture = { revision: 'test-fixture', count: 1 };
const calls = [];
const pages = [0, 1].map(pageNumber => ({
    async evaluate(_callback, options) {
        calls.push([pageNumber, 'fixture', options]);
        return fixture;
    },
    locator(selector) {
        assert.equal(selector, 'body');
        return { async count() {
            await new Promise(resolve => setImmediate(resolve));
            calls.push([pageNumber, 'selector initialized']);
            return 1;
        } };
    },
}));
for (const [pageNumber, page] of pages.entries()) {
    assert.equal(await install({ page }, { id: 'workbench-100' }), fixture);
    calls.push([pageNumber, 'ready to measure']);
}
assert.deepEqual(calls, pages.flatMap((_, pageNumber) => [
    [pageNumber, 'fixture', { id: 'workbench-100', coverPool }],
    [pageNumber, 'selector initialized'],
    [pageNumber, 'ready to measure'],
]), 'Initialize the selector helper on each fresh page before the collector can start timing');

const browserStart = collector.indexOf('async function verifyCaptureBrowser(h)');
const browserEnd = collector.indexOf('const nextPaint =', browserStart);
assert.ok(browserStart >= 0 && browserEnd > browserStart, 'Pin one verified browser identity for the entire capture');
const index = {};
const verifyCaptureBrowser = new Function('assert', 'index', `${collector.slice(browserStart, browserEnd)}\nreturn verifyCaptureBrowser;`)(assert, index);
const pinned = {
    browserName: 'chromium', browserVersion: '156.0.4314.58', executablePath: '/engine/chromium',
    verifyBrowserBinary: async () => 'a'.repeat(64),
};
const identity = await verifyCaptureBrowser(pinned);
assert.deepEqual(identity, { name: 'chromium', version: '156.0.4314.58', executablePath: '/engine/chromium', binarySha256: 'a'.repeat(64) });
assert.deepEqual(await verifyCaptureBrowser({ ...pinned }), identity);
await assert.rejects(verifyCaptureBrowser({ ...pinned, browserVersion: '157.0.4341.42' }), /capture browser identity changed/i);
await assert.rejects(verifyCaptureBrowser({ ...pinned, verifyBrowserBinary: async () => 'b'.repeat(64) }), /capture browser identity changed/i);
await assert.rejects(verifyCaptureBrowser({ ...pinned, executablePath: '/other/chromium' }), /capture browser identity changed/i);
await assert.rejects(verifyCaptureBrowser({ ...pinned, verifyBrowserBinary: async () => { throw new Error('Executable changed'); } }), /Executable changed/);
assert.deepEqual(index.browser, identity, 'A mismatched launch must never replace the pinned identity');
console.log('Acceptance API/structure/classifier checks passed; no bootstrap executed.');
