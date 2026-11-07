import assert from 'node:assert/strict';
import { validateCapture, assertComparableCaptures, assertCachePolicy } from './lib/saga-performance-report.mjs';
import { SAGA_IMAGE_READINESS_POLICY } from './lib/saga-performance-image-readiness.mjs';
const metadata = { fixture: { type: 'custom', deckCount: 1, entryCount: 500, coverPool: ['assets/cover.png'], revision: 'fixture-v1' }, browser: { name: 'chromium', version: '123' }, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, cpuRate: 1, cacheMode: 'warm', cacheControl: 'public, max-age=3600', theme: 'default' };
const capture = () => ({ metadata: structuredClone(metadata), samples: [{ readinessMs: 5, interactionMs: 2, selectionCpuMs: 1, transferBytes: 12, imageBytes: 8, resourceBytes: 12, mutationsAdded: 1, mutationsRemoved: 1, longTaskMs: 0, beforeId: 'a', afterId: 'b' }] });
assert.doesNotThrow(() => validateCapture(capture()));
for (const key of ['readinessMs', 'interactionMs', 'selectionCpuMs', 'transferBytes', 'imageBytes', 'resourceBytes']) {
  for (const value of [-1, NaN, Infinity]) {
    const bad = capture(); bad.samples[0][key] = value;
    assert.throws(() => validateCapture(bad), /finite|nonnegative/);
  }
}
const noop = capture(); noop.samples[0].afterId = 'a'; assert.throws(() => validateCapture(noop), /no-op/);
for (const key of ['fixture', 'browser', 'viewport', 'deviceScaleFactor', 'cpuRate', 'cacheMode', 'theme']) {
  const changed = capture(); changed.metadata[key] = key === 'fixture' ? { ...metadata.fixture, coverPool: ['other'] } : 'mismatch';
  assert.throws(() => assertComparableCaptures(capture(), changed), /metadata|mismatch/);
}
assert.throws(() => assertCachePolicy('warm', 'no-store'), /warm/);
assert.throws(() => assertCachePolicy('unknown', 'public'), /cache/);
assert.doesNotThrow(() => assertCachePolicy('cold', 'no-store'));
console.log('Rendering performance report tests passed.');

// Real HTTP boundary checks prevent baseline/candidate source mixing and false warm-cache labels.
const { startVisualSmokeServer } = await import('./serve-visual-smoke.mjs');
const { startSagaPerformanceHarness } = await import('./lib/saga-performance-harness.mjs');
assert.equal(typeof startSagaPerformanceHarness, 'function');
const { mkdtemp, writeFile, mkdir, rm } = await import('node:fs/promises');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const testRoot = await mkdtemp(join(tmpdir(), 'saga-performance-server-'));
let server;
try {
  await mkdir(join(testRoot, 'source')); await mkdir(join(testRoot, 'fixture'));
  await writeFile(join(testRoot, 'source', 'identity.txt'), 'source');
  await writeFile(join(testRoot, 'fixture', 'identity.txt'), 'fixture');
  await writeFile(join(testRoot, 'source', 'image.webp'), 'image');
  server = await startVisualSmokeServer({ sourceRoot: join(testRoot, 'source'), fixtureRoot: join(testRoot, 'fixture'), port: 0 });
  assert.equal(await (await fetch(`${server.origin}/identity.txt`)).text(), 'source');
  const fixtureResponse = await fetch(`${server.origin}/__performance/identity.txt`);
  assert.equal(await fixtureResponse.text(), 'fixture');
  assert.throws(() => assertCachePolicy('warm', fixtureResponse.headers.get('cache-control')), /warm/);
  assert.equal((await fetch(`${server.origin}/image.webp`)).headers.get('content-type'), 'image/webp');
  assert.equal((await fetch(`${server.origin}/__performance/%2e%2e%2fsource/identity.txt`)).status, 403);
  await server.stop(); server = null;
  server = await startVisualSmokeServer({ sourceRoot: join(testRoot, 'source'), fixtureRoot: join(testRoot, 'fixture'), port: 0, browserCache: true });
  assert.doesNotThrow(() => assertCachePolicy('warm', server.cacheControl));
} finally { if (server) await server.stop(); await rm(testRoot, { recursive: true, force: true }); }
console.log('Rendering performance server and harness contracts passed.');
const { summarizeSamples } = await import('./lib/saga-performance-report.mjs');
assert.equal(summarizeSamples([{ x: 1 }, { x: 5 }], 'x').median, 3, 'Even-run medians average the middle pair');

const interactionOnly = capture(); interactionOnly.samples[0].kind = 'interaction'; assert.throws(() => validateCapture(interactionOnly), /replicate/); interactionOnly.samples[0].readinessMs = null; assert.doesNotThrow(() => validateCapture(interactionOnly));

if (process.argv.includes('--browser')) {
  const h = await startSagaPerformanceHarness({ sourceRoot: process.cwd(), fixtureRoot: join(process.cwd(), 'tests/browser'), cacheMode: 'warm' });
  try {
    console.log(`Fixture browser: ${h.browserName} ${h.browserVersion}`);
    // Real delayed HTTP responses prove CDP initiation/completion wiring, not only journal arithmetic.
    const { createServer } = await import('node:http');
    const { resourceBytesForWindow } = await import('./lib/saga-performance-request-journal.mjs');
    const pendingResponses = new Map();
    const byteServer = createServer((request, response) => pendingResponses.set(request.url, response));
    await new Promise(resolve => byteServer.listen(0, '127.0.0.1', resolve));
    const byteOrigin = `http://127.0.0.1:${byteServer.address().port}`;
    const waitUntil = async predicate => { const end = Date.now() + 5000; while (!predicate()) { assert.ok(Date.now() < end, 'Delayed HTTP test timed out'); await new Promise(resolve => setTimeout(resolve, 5)); } };
    const reply = (route, body) => { const response = pendingResponses.get(route); response.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*', 'timing-allow-origin': '*', 'content-length': Buffer.byteLength(body) }); response.end(body); };
    try {
      await h.page.evaluate(url => { window.oldByteResponse = fetch(url).then(r => r.text()); }, `${byteOrigin}/old-slow`);
      await waitUntil(() => pendingResponses.has('/old-slow') && h.requests.some(r => r.url.endsWith('/old-slow')));
      const start = h.journal.mark();
      const startMs = await h.page.evaluate(() => performance.now());
      await h.page.evaluate(url => { window.currentByteResponse = fetch(url).then(r => r.text()); }, `${byteOrigin}/current-late`);
      await waitUntil(() => pendingResponses.has('/current-late') && h.requests.some(r => r.url.endsWith('/current-late')));
      const end = h.journal.mark();
      const endMs = await h.page.evaluate(() => performance.now());
      let settled = false;
      const measured = h.journal.settle(start, end).then(records => { settled = true; return records; });
      reply('/old-slow', 'unrelated old response'.repeat(10));
      await h.page.evaluate(() => window.oldByteResponse);
      assert.equal(settled, false, 'An earlier response finishing now must not settle the current late request');
      reply('/current-late', 'measured late response'.repeat(20));
      await h.page.evaluate(() => window.currentByteResponse);
      const measuredRecords = await measured;
      assert.equal(measuredRecords.length, 1);
      assert.ok(measuredRecords[0].url.endsWith('/current-late'));
      assert.ok(measuredRecords[0].encodedDataLength >= Buffer.byteLength('measured late response'.repeat(20)));
      const entries = await h.page.evaluate(origin => performance.getEntriesByType('resource').filter(r => r.name.startsWith(origin)).map(r => ({ name: r.name, startTime: r.startTime, transferSize: r.transferSize })), byteOrigin);
      const currentEntry = entries.find(r => r.name.endsWith('/current-late'));
      assert.ok(currentEntry.transferSize > 0);
      assert.equal(resourceBytesForWindow(entries, { startMs, endMs }), currentEntry.transferSize);
      console.log('Real delayed HTTP boundary passed: old completion excluded, current late transfer settled with positive CDP/resource bytes.');
    } finally { byteServer.closeAllConnections(); await new Promise(resolve => byteServer.close(resolve)); }

    const install = options => h.page.evaluate(async options => { const module = await import('/__performance/performance-fixtures.mjs'); await module.installSagaPerformanceFixture(options); }, options);
    await install({ deckCount: 1, entryCount: 600, type: 'custom' });
    const source = await h.page.evaluate(async () => { const s = await sagaPerformanceFixture.loadSource(); return { kind: s.sourceKind, count: s.entryFiles.flatMap(f => f.entries).length }; });
    assert.deepEqual(source, { kind: 'custom_virtual', count: 600 });
    await h.page.evaluate(() => sagaPerformanceFixture.openWorkbench());
    await h.page.waitForFunction(() => document.querySelectorAll('.saga-loredeck-workbench-entry-row').length === 500);
    await h.page.locator('#saga-loredeck-workbench button').filter({ hasText: /^Select Visible$/ }).click();
    assert.match(await h.page.locator('.saga-loredeck-workbench-bulk-summary').innerText(), /600/);
    const semantics = { displayRows: 500, logicalSelected: await h.page.locator('.saga-loredeck-workbench-bulk-summary').innerText(), limit: await h.page.locator('.saga-lore-workbench-row-note').innerText() };
    console.log('Baseline selection semantics:', JSON.stringify(semantics));
    await h.page.evaluate(() => sagaPerformanceFixture.close());
    await install({ type: 'generated', entryCount: 100 });
    assert.equal(await h.page.evaluate(async () => (await sagaPerformanceFixture.loadSource()).sourceKind), 'generated_virtual');
    await install({ type: 'bundled' });
    assert.equal(await h.page.evaluate(async () => (await sagaPerformanceFixture.loadSource()).sourceKind), 'loredeck');
    await install({ type: 'error' });
    const gate = await h.gateSourceResponses('**/__performance/nonexistent-loredeck.json');
    const missingSource = h.page.evaluate(async () => (await sagaPerformanceFixture.loadSource()).sourceKind);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(gate.pending.length, 1, 'A real source response is gated for later race tests');
    await gate.dispose(); assert.equal(await missingSource, 'missing');
    for (const deckCount of [77, 1000]) {
      await install({ library: true, deckCount, entryCount: 100 });
      await h.page.evaluate(() => sagaPerformanceFixture.openLibrary());
      await h.page.waitForSelector('.saga-loredeck-library-hierarchy-list');
      for (let i = 0; i < 100; i++) {
        const button = h.page.locator('.saga-loredeck-library-folder-disclosure[aria-label^="Expand"]');
        if (!(await button.count())) break;
        await button.first().evaluate(n => n.click());
        await h.page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      }
      await h.page.waitForFunction(count => document.querySelectorAll('.saga-loredeck-library-deck-card').length === count, deckCount);
      await h.page.waitForFunction(() => [...document.querySelectorAll('.saga-loredeck-library-deck-card img')].every(img => img.complete && img.naturalWidth > 0));
      const images = await h.page.locator('.saga-loredeck-library-deck-card img').count();
      assert.equal(images, deckCount === 77 ? 70 : 1000);
      console.log(`${deckCount} real controller cards, ${images} decoded cover images`);
      await h.page.evaluate(() => sagaPerformanceFixture.close());
    }
    await h.page.evaluate(() => sagaPerformanceFixture.openCreator());
    await h.page.waitForSelector('.saga-loredeck-creator-workbench-body');
    assert.ok(await h.page.locator('.saga-loredeck-creator-workbench-body').textContent());
    assert.deepEqual(h.errors, []);
    console.log('Real fixture browser smoke passed: custom/generated/bundled/error, HTTP gate, 77/1000 covers, creator.');
  } finally { await h.stop(); }
}
const mislabeledStartup = capture(); mislabeledStartup.firstOpenStartedAt = 1000; mislabeledStartup.startupRequests = [{ url: '/src/ui/generated/workbench/view.js', startedAt: 2000 }]; assert.throws(() => validateCapture(mislabeledStartup), /Startup/);

const focus = process.argv.find(value => value.startsWith('--focus='))?.slice(8);
const covers = name => !focus || focus === name;
if (covers('journal')) {
  const { createSagaPerformanceRequestJournal, resourceBytesForWindow } = await import('./lib/saga-performance-request-journal.mjs');
  const journal = createSagaPerformanceRequestJournal();
  journal.start({ id: 'old-slow', url: '/old.png', type: 'Image', startedAt: 5 });
  const start = journal.mark();
  journal.start({ id: 'current-late', url: '/current.png', type: 'Image', startedAt: 12 });
  const end = journal.mark();
  let settled = false;
  const current = journal.settle(start, end).then(records => { settled = true; return records; });
  journal.finish('old-slow', 17);
  journal.start({ id: 'later-fast', url: '/later.png', type: 'Image', startedAt: 25 }); journal.finish('later-fast', 31);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(settled, false, 'Current late transfer must settle after readiness; old/later completions cannot satisfy it');
  journal.finish('current-late', 23);
  assert.deepEqual((await current).map(r => [r.id, r.encodedDataLength]), [['current-late', 23]]);
  assert.equal(resourceBytesForWindow([{ startTime: 5, transferSize: 17 }, { startTime: 12, transferSize: 23 }, { startTime: 25, transferSize: 31 }], { startMs: 10, endMs: 20 }), 23);
  journal.start({ id: 'failed', url: '/failed', type: 'Image', startedAt: 30 });
  const failedStart = journal.mark() - 1; const failedEnd = journal.mark();
  const failure = journal.settle(failedStart, failedEnd); journal.fail('failed', 'aborted'); await assert.rejects(failure, /failed.*aborted/i);
  journal.start({ id: 'hung', url: '/hung', type: 'Image', startedAt: 40 });
  await assert.rejects(journal.settle(journal.mark() - 1, journal.mark(), { timeoutMs: 10 }), /timed out/i);
  journal.finish('hung', 0);
  console.log('Request-start windows exclude old completions and include current late bytes; failures/timeouts are explicit.');
}
if (covers('longtasks')) {
  const unavailable = capture(); unavailable.metadata.capabilities = { longTasks: false }; unavailable.samples[0].longTaskMs = null;
  assert.doesNotThrow(() => validateCapture(unavailable));
  unavailable.samples[0].longTaskMs = 0; assert.throws(() => validateCapture(unavailable), /unavailable/);
  console.log('Unavailable long-task metrics remain null, never measured zero.');
}
if (covers('engine')) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, ['tools/scripts/capture-rendering-performance.mjs', '--browser', 'firefox', '--source-root', '__does_not_exist__'], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Timed collection requires Chromium/);
  console.log('Non-Chromium timed collection rejects before file/browser allocation.');
}
if (covers('cache')) {
  const { spawnSync } = await import('node:child_process');
  const child = `import {startSagaPerformanceHarness} from './tools/scripts/lib/saga-performance-harness.mjs'; try { await startSagaPerformanceHarness({cacheMode:'invalid'}); process.exit(2); } catch(error) { if(!/cache/i.test(error.message)) throw error; } setTimeout(()=>{ const leaked=process.getActiveResourcesInfo().some(name=>/TCPServerWrap/i.test(name)); console.log(JSON.stringify({leaked})); process.exit(leaked?1:0); },10);`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', child], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(result.status, 0, `Invalid cache mode leaked a server: ${result.stdout} ${result.stderr}`);
  assert.match(result.stdout, /"leaked":false/);
  console.log('Invalid cache mode rejects without leaking an HTTP server.');
}

const captureDirectory = process.argv.find(value => value.startsWith('--capture-dir='))?.slice(14);
if (captureDirectory) {
  const { readFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const index = JSON.parse(await readFile(join(captureDirectory, 'index.json'), 'utf8'));
  let timed = 0; let visuals = 0;
  const resolvedCaptures = [];
  for (const record of index.captures) {
    let m;
    if (record.file) {
      const raw = JSON.parse(await readFile(join(captureDirectory, record.file), 'utf8'));
      validateCapture(raw); validateCapture({ ...raw, samples: [raw.initialOpen] });
      m = raw.metadata;
      assert.equal(raw.samples.length, index.requestedRuns[m.cacheMode]);
      assert.deepEqual(raw.pageErrors, []);
      for (const sample of [...raw.samples, raw.initialOpen]) {
        assert.equal(sample.transferBytes, sample.network.reduce((sum, r) => sum + r.encodedDataLength, 0));
        assert.deepEqual(sample.requestWindow.ids, sample.network.map(r => r.id));
        assert.ok(sample.network.every(r => r.state === 'complete' && r.sequence >= sample.requestWindow.start && r.sequence < sample.requestWindow.end));
        assert.ok(sample.imageBytes <= sample.transferBytes);
      }
      if (m.cacheMode === 'warm') for (let i = 1; i < raw.samples.length; i++) assert.equal(raw.samples[i].beforeId, raw.samples[i - 1].afterId);
      timed++;
    } else {
      m = record.metadata;
      assert.ok(m, 'Tablet visual references require explicit environment/fixture metadata');
      assert.deepEqual(m.viewport, { width: 768, height: 1024 });
      assert.equal(m.deviceScaleFactor, 1); assert.equal(m.cpuRate, 1); assert.equal(m.cacheMode, 'warm');
      visuals++;
    }
    resolvedCaptures.push({ ...record, metadata: m });
    assert.ok(m.browser.name && m.browser.version);
    assertArtifactProvenance(index, m);
    const png = await readFile(join(captureDirectory, record.screenshot.file));
    assert.equal(createHash('sha256').update(png).digest('hex'), record.screenshot.sha256);
  }
  if (process.argv.includes('--require-full')) {
    assertFullCaptureMatrix({ ...index, captures: resolvedCaptures });
  }
  console.log(`Verified capture artifacts: ${timed} timed cases, ${visuals} visual references, all sample/PNG hashes and provenance intact.`);
}


// This is the actual --require-full gate, shared with adversarial in-memory cases.
function assertFullCaptureMatrix(index) {
  assert.equal(index.completeRunCounts, true, 'Full matrix requires complete run counts');
  assert.ok(index.requestedRuns.warm >= 30 && index.requestedRuns.cold >= 20, 'Full matrix requires30 warm/20 cold runs');
  const fixtureSpecs = [
    ['library-77', true, 77, 100, 'bundled'],
    ['library-1000', true, 1000, 100, 'custom'],
    ['workbench-100', false, 1, 100, 'custom'],
    ['workbench-500', false, 1, 500, 'custom'],
    ['workbench-600', false, 1, 600, 'custom'],
  ];
  const key = m => JSON.stringify([m?.fixture?.id, m?.fixture?.library, m?.fixture?.deckCount, m?.fixture?.entryCount, m?.fixture?.type, m?.viewport?.width, m?.viewport?.height, m?.deviceScaleFactor, m?.cpuRate, m?.cacheMode]);
  const expectedTimed = new Map(); const expectedVisual = new Map();
  for (const [id, library, deckCount, entryCount, type] of fixtureSpecs) {
    const fixture = { id, library, deckCount, entryCount, type };
    for (const [profile, width, height, deviceScaleFactor] of [['desktop', 1440, 900, 1], ['phone', 430, 820, 3]]) for (const cpuRate of [1, 4]) for (const cacheMode of ['cold', 'warm']) {
      expectedTimed.set(key({ fixture, viewport: { width, height }, deviceScaleFactor, cpuRate, cacheMode }), `${id}-${profile}-${cpuRate}x-${cacheMode}`);
    }
    expectedVisual.set(key({ fixture, viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, cpuRate: 1, cacheMode: 'warm' }), `${id}-tablet-visual`);
  }
  const ids = new Set(); const files = new Set(); const screenshots = new Set();
  const timed = new Set(); const visuals = new Set();
  for (const record of index.captures) {
    assert.ok(typeof record.id === 'string' && record.id, 'Missing capture ID');
    assert.ok(!ids.has(record.id), `Duplicate capture ID: ${record.id}`); ids.add(record.id);
    assert.ok(!screenshots.has(record.screenshot?.file), `Duplicate screenshot file: ${record.screenshot?.file}`); screenshots.add(record.screenshot?.file);
    const tuple = key(record.metadata);
    const expected = record.file ? expectedTimed : expectedVisual;
    const seen = record.file ? timed : visuals;
    if (record.file) { assert.ok(!files.has(record.file), `Duplicate capture file: ${record.file}`); files.add(record.file); }
    assert.ok(expected.has(tuple), `Unexpected ${record.file ? 'timed' : 'tablet'} matrix tuple: ${tuple}`);
    assert.ok(!seen.has(tuple), `Duplicate ${record.file ? 'timed' : 'tablet'} matrix tuple: ${tuple}`); seen.add(tuple);
    assert.equal(record.id, expected.get(tuple), 'Capture ID does not match matrix tuple');
    if (record.file) assert.equal(record.file, `${record.id}.json`, 'Capture file does not match matrix ID');
    assert.equal(record.screenshot?.file, `${record.id}.png`, 'Screenshot file does not match matrix ID');
  }
  assert.deepEqual(timed, new Set(expectedTimed.keys()), 'Missing timed matrix combination');
  assert.deepEqual(visuals, new Set(expectedVisual.keys()), 'Missing tablet matrix combination');
}

function makeFullCaptureIndex() {
  const fixtures = [
    { id: 'library-77', library: true, deckCount: 77, entryCount: 100, type: 'bundled' },
    { id: 'library-1000', library: true, deckCount: 1000, entryCount: 100, type: 'custom' },
    ...[100, 500, 600].map(entryCount => ({ id: `workbench-${entryCount}`, library: false, deckCount: 1, entryCount, type: 'custom' })),
  ];
  const captures = [];
  for (const fixture of fixtures) for (const profile of [{ id: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, { id: 'phone', viewport: { width: 430, height: 820 }, deviceScaleFactor: 3 }]) for (const cpuRate of [1, 4]) for (const cacheMode of ['cold', 'warm']) {
    const id = `${fixture.id}-${profile.id}-${cpuRate}x-${cacheMode}`;
    captures.push({ id, file: `${id}.json`, screenshot: { file: `${id}.png` }, metadata: { fixture, viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, cpuRate, cacheMode } });
  }
  for (const fixture of fixtures) {
    const id = `${fixture.id}-tablet-visual`;
    captures.push({ id, screenshot: { file: `${id}.png` }, metadata: { fixture, viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, cpuRate: 1, cacheMode: 'warm' } });
  }
  return { completeRunCounts: true, requestedRuns: { warm: 30, cold: 20 }, captures };
}
if (covers('matrix')) {
  assert.doesNotThrow(() => assertFullCaptureMatrix(makeFullCaptureIndex()));
  const duplicated = makeFullCaptureIndex();
  const oneCpu = duplicated.captures.filter(record => record.file && record.metadata.cpuRate === 1);
  duplicated.captures = [...oneCpu, ...structuredClone(oneCpu), ...duplicated.captures.filter(record => !record.file)];
  assert.throws(() => assertFullCaptureMatrix(duplicated), /duplicate|matrix/i, '40 rows referencing only20 unique1x files cannot establish the full matrix');
  const rejectsMatrix = (mutate, pattern) => { const index = makeFullCaptureIndex(); mutate(index); assert.throws(() => assertFullCaptureMatrix(index), pattern); };
  rejectsMatrix(index => { index.completeRunCounts = false; }, /complete run counts/);
  rejectsMatrix(index => { index.requestedRuns.warm = 29; }, /30 warm\/20 cold/);
  rejectsMatrix(index => { index.requestedRuns.cold = 19; }, /30 warm\/20 cold/);
  rejectsMatrix(index => { index.captures[0].id = ''; }, /Missing capture ID/);
  rejectsMatrix(index => { index.captures[1].id = index.captures[0].id; }, /Duplicate capture ID/);
  rejectsMatrix(index => { index.captures[1].file = index.captures[0].file; }, /Duplicate capture file/);
  rejectsMatrix(index => { index.captures[1].screenshot.file = index.captures[0].screenshot.file; }, /Duplicate screenshot file/);
  rejectsMatrix(index => { index.captures[1].metadata = structuredClone(index.captures[0].metadata); }, /Duplicate timed matrix tuple/);
  rejectsMatrix(index => { index.captures[0].id = 'renamed'; }, /ID does not match matrix tuple/);
  rejectsMatrix(index => { index.captures[0].file = './alias.json'; }, /Capture file does not match matrix ID/);
  rejectsMatrix(index => { index.captures[0].screenshot.file = './alias.png'; }, /Screenshot file does not match matrix ID/);
  for (const mutate of [
    m => { m.fixture.id = 'workbench-999'; }, m => { m.fixture.library = false; }, m => { m.fixture.deckCount = 99; }, m => { m.fixture.entryCount = 99; }, m => { m.fixture.type = 'error'; },
    m => { m.viewport.width = 1439; }, m => { m.viewport.height = 899; }, m => { m.deviceScaleFactor = 2; }, m => { m.cpuRate = 2; }, m => { m.cacheMode = 'unknown'; },
  ]) rejectsMatrix(index => { index.captures[0].metadata = structuredClone(index.captures[0].metadata); mutate(index.captures[0].metadata); }, /Unexpected timed matrix tuple/);
  rejectsMatrix(index => { index.captures.splice(0, 1); }, /Missing timed matrix combination/);
  rejectsMatrix(index => { index.captures.pop(); }, /Missing tablet matrix combination/);
  rejectsMatrix(index => { index.captures[44].metadata = structuredClone(index.captures[43].metadata); }, /Duplicate tablet matrix tuple/);
  rejectsMatrix(index => { index.captures[44].id = 'renamed-tablet'; }, /ID does not match matrix tuple/);
  for (const mutate of [m => { m.fixture.id = 'unknown'; }, m => { m.viewport.width = 767; }, m => { m.deviceScaleFactor = 3; }, m => { m.cpuRate = 4; }, m => { m.cacheMode = 'cold'; }]) rejectsMatrix(index => { index.captures[44].metadata = structuredClone(index.captures[44].metadata); mutate(index.captures[44].metadata); }, /Unexpected tablet matrix tuple/);
  const reversed = makeFullCaptureIndex(); reversed.captures.reverse(); assert.doesNotThrow(() => assertFullCaptureMatrix(reversed));
  console.log('Exact full matrix gate passed adversarial duplicate/missing/incorrect tuple, ID, file and tablet cases.');

}
if (covers('cpu-args')) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, ['tools/scripts/capture-rendering-performance.mjs', '--cpu-rates=1,1', '--source-root=__does_not_exist__'], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Duplicate CPU rates/);
  for (const rates of ['0', '-1', 'NaN', 'Infinity']) {
    const invalid = spawnSync(process.execPath, ['tools/scripts/capture-rendering-performance.mjs', `--cpu-rates=${rates}`, '--source-root=__does_not_exist__'], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 10000 });
    assert.notEqual(invalid.status, 0); assert.match(invalid.stderr, /CPU rates must be finite and at least1/);
  }
  console.log('Duplicate/invalid CPU rates reject before filesystem or browser allocation.');
}
const gatedCapture = () => {
  const value = capture(); value.metadata.imageReadinessPolicy = structuredClone(SAGA_IMAGE_READINESS_POLICY); value.metadata.fixture.library = true;
  Object.assign(value.samples[0], { kind: 'open', interactionMs: null, imageReadiness: { ready: true, supported: true, policy: SAGA_IMAGE_READINESS_POLICY.id, unknownRoots: 0, unknownImages: 0, eligibleCount: 1, decodedCount: 1, visibleCoverCount: 1, visibleDeckCoverCount: 1, initialReadyEpoch: 1, sealedEpoch: 2, images: [{ id: 1, source: 'https://fixture/cover.png', decoded: true, cover: true, deckCover: true }] } });
  return value;
};
assert.doesNotThrow(() => validateCapture(gatedCapture()));
for (const mutate of [
  c => { c.metadata.imageReadinessPolicy.rootMargin = '1000px'; },
  c => { c.samples[0].imageReadiness = null; },
  c => { c.samples[0].imageReadiness.supported = false; },
  c => { c.samples[0].imageReadiness.unknownImages = 1; },
  c => { c.samples[0].imageReadiness.decodedCount = 0; },
  c => { c.samples[0].imageReadiness.visibleDeckCoverCount = 0; },
  c => { c.samples[0].imageReadiness.sealedEpoch = 1; },
]) { const bad = gatedCapture(); mutate(bad); assert.throws(() => validateCapture(bad), /image|Image|cover|Cover|epoch/i); }
assert.throws(() => assertComparableCaptures(capture(), gatedCapture()), /metadata mismatch/);
console.log('Image policy metadata and stable decoded snapshots validated; old/new methods cannot be compared.');

const oldImagePolicy = gatedCapture(); delete oldImagePolicy.metadata.imageReadinessPolicy; assert.throws(() => assertComparableCaptures(gatedCapture(), oldImagePolicy), /metadata mismatch: imageReadinessPolicy/);

function assertArtifactProvenance(index, metadata) {
  if (index.imageReadinessPolicy !== undefined) assert.deepEqual(index.imageReadinessPolicy, SAGA_IMAGE_READINESS_POLICY, 'Unknown artifact image policy');
  assert.deepEqual(metadata.imageReadinessPolicy, index.imageReadinessPolicy, 'Image policy provenance mismatch');
  assert.equal(metadata.sourceHash, index.sourceHash); assert.equal(metadata.protocolHash, index.protocolHash); assert.equal(metadata.fixture.revision, index.fixtureHash);
}
const policyIndex = { sourceHash: 'source', protocolHash: 'protocol', fixtureHash: 'fixture', imageReadinessPolicy: SAGA_IMAGE_READINESS_POLICY };
const policyRecord = { sourceHash: 'source', protocolHash: 'protocol', fixture: { revision: 'fixture' } };
assert.throws(() => assertArtifactProvenance(policyIndex, policyRecord), /image policy provenance/i);

assert.doesNotThrow(() => assertArtifactProvenance({ ...policyIndex, imageReadinessPolicy: undefined }, policyRecord)); assert.doesNotThrow(() => assertArtifactProvenance(policyIndex, { ...policyRecord, imageReadinessPolicy: SAGA_IMAGE_READINESS_POLICY }));
