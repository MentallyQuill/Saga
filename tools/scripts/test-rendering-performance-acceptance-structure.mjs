import assert from 'node:assert/strict';
import * as report from './lib/saga-performance-report.mjs';

// This deliberately tiny suite cannot reach resampling or allocate a browser.
assert.equal(typeof report.evaluateRenderingPerformance, 'function', 'Missing matrix acceptance API');
assert.equal(report.evaluateRenderingPerformance({}, {}).status, 'fail', 'A capture pair or missing matrix cannot pass');
assert.equal(report.classifyRenderingInterval('gain', [.18, .22]), 'inconclusive');
assert.equal(report.classifyRenderingInterval('gain', [.20, .20]), 'pass');
assert.equal(report.classifyRenderingInterval('excess', [0, 0]), 'pass');
assert.equal(report.classifyRenderingInterval('cover', [0, 0]), 'fail');
assert.equal(report.classifyRenderingInterval('excess', [-1, 1]), 'inconclusive');
console.log('Acceptance API/structure/classifier checks passed; no bootstrap executed.');
