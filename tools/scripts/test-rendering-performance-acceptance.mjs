import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateRenderingPerformance, classifyRenderingInterval, validateRenderingMatrix, combineWarmClassifications } from './lib/saga-rendering-acceptance.mjs';
import { bootstrapComparison, seededRandom, resample, statistic } from './lib/saga-rendering-statistics.mjs';
import { syntheticBundle, changeSyntheticCapture, changeSyntheticProof } from './lib/saga-rendering-synthetic-bundle.mjs';
import { verifiedCoverBytes } from './lib/saga-rendering-evidence.mjs';
import { loadRenderingBundle } from './lib/saga-rendering-bundle-loader.mjs';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Full suite is deliberately separate from alpha: fixed 20k inference must not
// run while either acceptance matrix is collecting.
test('fixed estimands, deterministic streams, complete circular pair blocks', () => {
    assert.equal(statistic([1, 5]), 3); assert.equal(statistic(Array.from({ length: 100 }, (_, i) => i + 1), 'p95'), 95);
    const a = seededRandom('tuple', 'metric', 'baseline'), b = seededRandom('tuple', 'metric', 'baseline');
    assert.deepEqual(Array.from({ length: 8 }, a), Array.from({ length: 8 }, b));
    assert.deepEqual(resample([0, 1, 2, 3, 4, 5], () => .99, 5), [4, 5, 0, 1, 2, 3]);
    assert.equal(combineWarmClassifications('pass', 'fail'), 'inconclusive');
    assert.equal(combineWarmClassifications('fail', 'pass'), 'inconclusive');
    assert.equal(combineWarmClassifications('pass', 'inconclusive'), 'inconclusive');
});
for (const [kind, baseline, candidate, expected] of [['gain', 100, 79, 'pass'], ['gain', 100, 81, 'fail'], ['gain', 100, 80, 'pass'], ['excess', 100, 104, 'pass'], ['excess', 100, 106, 'fail'], ['excess', 100, 105, 'pass'], ['excess', 10, 12, 'pass'], ['cover', 1000, 900, 'pass'], ['cover', 1000, 1000, 'fail']]) {
    test(`20k toy ${kind}: ${baseline} -> ${candidate}: ${expected}`, () => {
        const result = bootstrapComparison(Array(100).fill(baseline), Array(100).fill(candidate), { tuple: 'toy', metric: kind, kind, statisticKind: 'median' });
        assert.equal(result.replicates, 20_000); assert.equal(classifyRenderingInterval(kind, result.interval), expected);
    });
}
test('nulls and nonpositive denominators cannot pass inference', () => {
    for (const values of [[null], [0]]) assert.equal(bootstrapComparison(values, [1], { tuple: 'toy', metric: 'cpu', kind: 'gain', statisticKind: 'median' }).available, false);
    assert.equal(classifyRenderingInterval('gain', [.18, .22]), 'inconclusive');
    assert.equal(classifyRenderingInterval('excess', [-1, 1]), 'inconclusive');
});
test('two complete synthetic bundles pass the whole-project API', async () => {
    const baseline = await syntheticBundle('baseline'), candidate = await syntheticBundle();
    assert.equal(evaluateRenderingPerformance(baseline, candidate).status, 'pass');
});
test('complete provenance and structural adverse cases reject before statistics', async () => {
    const reject = async (mutate, pattern) => { const bundle = await syntheticBundle(); mutate(bundle); assert.throws(() => validateRenderingMatrix(bundle), pattern); };
    await reject(bundle => bundle.captures.pop(), /45|tablet/);
    await reject(bundle => bundle.captures[1] = bundle.captures[0], /duplicate/i);
    await reject(bundle => bundle.captures[0].metadata.deviceScaleFactor = 9, /Tuple/);
    await reject(bundle => bundle.index.requestedRuns.warm = 199, /exact/);
    await reject(bundle => delete bundle.evidence.proofs.functional, /functional/);
    await reject(bundle => bundle.artifacts.set(bundle.evidence.protocolManifest.file, Buffer.from('{}')), /Corrupt/);
    await reject(bundle => changeSyntheticCapture(bundle, 'workbench-500-desktop-1x-warm', capture => { capture.startupRequests.push({ url: 'http://toy/src/ui/generated/workbench/view.js', startedAt: 1 }); }), /before first/);
    await reject(bundle => changeSyntheticProof(bundle, 'lifecycle', proof => { proof.after = { ...proof.after, views: 1 }; }), /Residual/);
    await reject(bundle => changeSyntheticProof(bundle, 'structure', proof => { proof.replacedUnaffectedRows = 1; }), /replacement/);
    await reject(bundle => changeSyntheticProof(bundle, 'structure', proof => { proof.cloneCallsPerRequest = [2]; }), /clones/);
    await reject(bundle => changeSyntheticProof(bundle, 'structure', proof => { proof.closedFactories['scope-brief'] = 1; }), /factory/);
    await reject(bundle => changeSyntheticProof(bundle, 'build', proof => { proof.rebuilt = []; }), /generated/);
    await reject(bundle => changeSyntheticProof(bundle, 'functional', proof => { proof.sourceHash = 'wrong'; }), /source binding/);
});
test('actual requests with repeated URLs count once per ID; duplicate IDs reject', async () => {
    const bundle = await syntheticBundle();
    const capture = bundle.captures.find(item => item.id === 'library-77-desktop-1x-cold');
    const sample = structuredClone(capture.samples[0]);
    sample.network.push({ ...sample.network[0], id: 'second', sequence: 1 });
    assert.equal(verifiedCoverBytes(bundle, capture.id, sample), 1800);
    changeSyntheticCapture(bundle, capture.id, value => { const s = value.samples[0]; s.network.push({ ...s.network[0] }); s.requestWindow.end = 2; s.requestWindow.ids.push(s.network[0].id); s.transferBytes *= 2; });
    assert.throws(() => validateRenderingMatrix(bundle), /Repeated request ID/);
});
test('warm readiness stays one descriptive open with 200 null interactions', async () => {
    const bundle = await syntheticBundle();
    const capture = bundle.captures.find(item => item.id === 'workbench-500-desktop-1x-warm');
    assert.equal(capture.samples.filter(sample => sample.readinessMs !== null).length, 0);
    assert.equal([capture.initialOpen].filter(sample => sample.readinessMs !== null).length, 1);
});
test('real loader inspects sealed bytes, refuses missing proof and path traversal', async () => {
    const bundle = await syntheticBundle();
    const root = await mkdtemp(path.join(tmpdir(), 'saga-acceptance-loader-'));
    try {
        for (const [file, bytes] of bundle.artifacts) { const target = path.join(root, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes); }
        await writeFile(path.join(root, 'index.json'), JSON.stringify(bundle.index));
        await writeFile(path.join(root, 'acceptance-evidence.json'), JSON.stringify(bundle.evidence));
        assert.doesNotThrow(() => validateRenderingMatrix(bundle));
        const loaded = await loadRenderingBundle(root); assert.doesNotThrow(() => validateRenderingMatrix(loaded));
        await writeFile(path.join(root, bundle.evidence.proofs.host.artifact.file), '{}');
        await assert.rejects(loadRenderingBundle(root), /Corrupt/);
        bundle.evidence.protocolManifest.file = '../outside.json';
        await writeFile(path.join(root, 'acceptance-evidence.json'), JSON.stringify(bundle.evidence));
        await assert.rejects(loadRenderingBundle(root), /canonical relative/);
    } finally {
        assert.ok(path.resolve(root).startsWith(`${path.resolve(tmpdir())}${path.sep}saga-acceptance-loader-`));
        await rm(root, { recursive: true, force: true });
    }
});

test('review round 1: unavailable cover bytes cannot hide later structural failures', async () => {
    const bundle = await syntheticBundle();
    const capture = bundle.captures.find(item => item.id === 'library-77-desktop-1x-cold');
    const first = { ...capture.samples[0].network[0], encodedDataLength: null };
    for (const [next, error] of [
        [{ ...first, status: 404 }, /unsuccessful/],
        [{ ...first, url: 'http://synthetic/assets/generated/loredeck-covers/unrecognized.webp' }, /unknown cover URL/],
    ]) {
        assert.throws(() => verifiedCoverBytes(bundle, capture.id, { network: [first, { ...next, id: 'second' }] }), error);
    }
    assert.equal(verifiedCoverBytes(bundle, capture.id, { network: [first] }), null);
    capture.metadata.capabilities.networkBytes = false;
    assert.throws(() => verifiedCoverBytes(bundle, capture.id, { network: [{ ...first, status: 404 }] }), /unsuccessful/);
    assert.equal(verifiedCoverBytes(bundle, capture.id, { network: [] }), null);
});

test('review round 1: empty Library image lists cannot satisfy visual quality', async () => {
    const bundle = await syntheticBundle();
    assert.doesNotThrow(() => validateRenderingMatrix(bundle), 'Non-cover states may have empty image lists');
    changeSyntheticProof(bundle, 'visual', proof => { for (const pair of proof.pairs) pair.images = []; });
    assert.throws(() => validateRenderingMatrix(bundle), /Library.*cover/i);
});

test('review round 1: identical unrelated files do not prove generated freshness', async () => {
    const bundle = await syntheticBundle();
    changeSyntheticProof(bundle, 'build', proof => { proof.tracked = proof.rebuilt = [bundle.evidence.canonical.index]; });
    assert.throws(() => validateRenderingMatrix(bundle), /generated inventory/i);
});

test('review round 1: creator factory identities cannot be substituted', async () => {
    const bundle = await syntheticBundle();
    changeSyntheticProof(bundle, 'structure', proof => { proof.closedFactories = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`unrelated-${index}`, 0])); });
    assert.throws(() => validateRenderingMatrix(bundle), /closed creator factory identities/i);
});

test('review round 1: baseline revision must be the frozen original', async () => {
    const bundle = await syntheticBundle('baseline', { sourceRevision: 'ffffffffffffffffffffffffffffffffffffffff' });
    assert.throws(() => validateRenderingMatrix(bundle, 'baseline'), /frozen original baseline revision/i);
});

test('review round 1: both workflow events cover portable fixture edits', async () => {
    const workflow = await readFile(new URL('../../.github/workflows/saga-ui-check.yml', import.meta.url), 'utf8');
    const filters = /^on:\s*\r?\n\s+pull_request:([^]*?)^  push:([^]*?)^permissions:/m.exec(workflow);
    assert.ok(filters, 'Workflow contains both event filters');
    for (const filter of filters.slice(1)) assert.match(filter, /^\s*-\s*['"]tests\/fixtures\/\*\*['"]\s*$/m);
});

test('sampling proof records one chronological start and completion', async t => {
    const bundle = await syntheticBundle('baseline');
    const start = { at: '2026-11-06T00:00:00Z', type: 'start' };
    const middle = { at: '2026-11-06T00:00:30Z', type: 'index-created' };
    const complete = { at: '2026-11-06T00:01:00Z', type: 'complete' };
    const setEvents = events => changeSyntheticProof(bundle, 'sampling', proof => { proof.events = events; });
    setEvents([start, middle, complete]);
    assert.doesNotThrow(() => validateRenderingMatrix(bundle, 'baseline'));

    for (const [name, events, error] of [
        ['missing start', [middle, complete], /sampling.*endpoints/i],
        ['missing completion', [start, middle], /sampling.*endpoints/i],
        ['reversed timestamps', [{ ...start, at: complete.at }, { ...complete, at: start.at }], /chronological/i],
        ['duplicate start', [start, { ...middle, type: 'start' }, complete], /sampling.*endpoints/i],
        ['duplicate completion', [start, { ...middle, type: 'complete' }, complete], /sampling.*endpoints/i],
        ['zero elapsed', [start, { ...complete, at: start.at }], /positive elapsed/i],
        ['out-of-order intermediate event', [start, { ...middle, at: '2026-11-06T00:02:00Z' }, complete], /chronological/i],
        ['invalid timestamp', [start, { ...middle, at: 'invalid' }, complete], /invalid sampling event/i],
        ['invalid event type', [start, { ...middle, type: 1 }, complete], /invalid sampling event/i],
        ['infrastructure invalidation', [start, { ...middle, type: 'suspend' }, complete], /infrastructure invalidation/i],
    ]) {
        await t.test(name, () => {
            setEvents(events);
            assert.throws(() => validateRenderingMatrix(bundle, 'baseline'), error);
        });
    }
});
