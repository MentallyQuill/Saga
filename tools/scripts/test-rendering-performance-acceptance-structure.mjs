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
console.log('Acceptance API/structure/classifier checks passed; no bootstrap executed.');
