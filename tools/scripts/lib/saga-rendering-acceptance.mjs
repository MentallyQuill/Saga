import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { assertCachePolicy, summarizeSamples } from './saga-performance-report.mjs';
import { bootstrapComparison } from './saga-rendering-statistics.mjs';
import { validateBundleEvidence, verifiedCoverBytes } from './saga-rendering-evidence.mjs';
import { SAGA_IMAGE_READINESS_POLICY } from './saga-performance-image-readiness.mjs';

export const ACCEPTANCE_METHOD = Object.freeze({ id: 'task9-v1-20261106', cold: 100, warm: 200,
    protocolHash: '9a3dd0668f9be5b9403977ee2b2e65cf2a614ecf12d2737f15812e61bc94a6a3',
    fixtureHash: 'acc70381c0758438d0f1f3b59153fc3be876d82b8b764a11e15c78de6e4e6216' });
export const FIXTURES = Object.freeze([
    ['library-77', true, 77, 100, 'bundled'], ['library-1000', true, 1000, 100, 'custom'],
    ['workbench-100', false, 1, 100, 'custom'], ['workbench-500', false, 1, 500, 'custom'], ['workbench-600', false, 1, 600, 'custom'],
]);
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const measuredFields = ['readinessMs', 'interactionMs', 'selectionCpuMs', 'firstUsefulContentMs', 'longTaskMs', 'transferBytes', 'imageBytes', 'resourceBytes', 'mutationsAdded', 'mutationsRemoved'];
export function classifyRenderingInterval(kind, bounds) {
    if (!bounds || bounds.some(value => !Number.isFinite(value)) || bounds[0] > bounds[1]) return 'inconclusive';
    const [lower, upper] = bounds;
    if (kind === 'gain') return lower >= .20 ? 'pass' : upper < .20 ? 'fail' : 'inconclusive';
    if (kind === 'excess') return upper <= 0 ? 'pass' : lower > 0 ? 'fail' : 'inconclusive';
    if (kind === 'cover') return upper < 0 ? 'pass' : lower >= 0 ? 'fail' : 'inconclusive';
    throw new Error(`Unknown interval classification: ${kind}`);
}
export const combineWarmClassifications = (primary, sensitivity) => primary === sensitivity ? primary : 'inconclusive';
export function expectedMatrix() {
    const records = [];
    for (const [id, library, deckCount, entryCount, type] of FIXTURES) {
        const fixture = { id, library, deckCount, entryCount, type };
        for (const [profile, width, height, dpr] of [['desktop', 1440, 900, 1], ['phone', 430, 820, 3]]) for (const cpuRate of [1, 4]) for (const cacheMode of ['cold', 'warm']) records.push({ id: `${id}-${profile}-${cpuRate}x-${cacheMode}`, fixture, viewport: { width, height }, deviceScaleFactor: dpr, cpuRate, cacheMode, timed: true });
        records.push({ id: `${id}-tablet-visual`, fixture, viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, cpuRate: 1, cacheMode: 'warm', timed: false });
    }
    return records;
}
export function validateRenderingMatrix(bundle, role = 'candidate') {
    const index = bundle?.index;
    assert.ok(index && Array.isArray(bundle.captures), 'Two complete matrix bundles are required');
    assert.equal(index.protocolHash, ACCEPTANCE_METHOD.protocolHash, 'Frozen protocol mismatch');
    assert.equal(index.fixtureHash, ACCEPTANCE_METHOD.fixtureHash, 'Frozen fixture mismatch');
    same(index.imageReadinessPolicy, SAGA_IMAGE_READINESS_POLICY, 'Frozen image readiness policy mismatch');
    same(index.requestedRuns, { warm: 200, cold: 100 }, 'Acceptance requires exact 100 cold / 200 warm counts');
    assert.equal(index.completeRunCounts, true, 'Incomplete matrix');
    assert.equal(bundle.captures.length, 45, 'Expected exactly 40 timed tuples and five tablet references');
    assert.equal(index.captures.length, 45, 'Index inventory must contain exactly 45 records');
    assert.equal(new Set(index.captures.map(record => record.id)).size, 45, 'Duplicate index tuple');
    const expected = new Map(expectedMatrix().map(record => [record.id, record]));
    const resolved = new Map();
    for (const capture of bundle.captures) {
        const spec = expected.get(capture.id), m = capture.metadata;
        assert.ok(spec && !resolved.has(capture.id), `Unexpected or duplicate tuple: ${capture.id}`);
        const record = index.captures.find(item => item.id === capture.id);
        assert.ok(record, `Capture absent from index: ${capture.id}`);
        assert.equal(record.screenshot.file, `${capture.id}.png`, 'Screenshot must match tuple');
        assert.equal(Boolean(record.file), spec.timed, 'Timed/tablet inventory mismatch');
        if (spec.timed) assert.equal(record.file, `${capture.id}.json`, 'Capture file must match tuple');
        assert.ok(m?.fixture && m.browser?.name && m.browser?.version, 'Missing fixture/browser metadata');
        assert.equal(m.browser.name, 'chromium', 'Timed acceptance requires the frozen Chromium/CDP browser');
        assert.equal(m.browser.version, '156.0.4314.58', 'Frozen Edge browser version mismatch');
        for (const key of ['id', 'library', 'deckCount', 'entryCount', 'type']) same(m.fixture[key], spec.fixture[key], `Fixture definition mismatch: ${key}`);
        for (const key of ['viewport', 'deviceScaleFactor', 'cpuRate', 'cacheMode']) same(m[key], spec[key], `Tuple metadata mismatch: ${key}`);
        for (const [key, value] of [['sourceHash', index.sourceHash], ['sourceRevision', index.sourceRevision], ['protocolHash', index.protocolHash], ['environment', index.environment], ['imageReadinessPolicy', index.imageReadinessPolicy]]) same(m[key], value, `Index provenance mismatch: ${key}`);
        assert.equal(m.fixture.revision, index.fixtureHash, 'Fixture provenance mismatch');
        same(m.fixture.coverHashes, index.coverHashes, 'Original cover hashes mismatch');
        same(m.fixture.absentCoverPackIds, index.absentCoverPackIds, 'Absent covers mismatch');
        assert.ok(Array.isArray(m.fixture.coverPool) && m.fixture.coverPool.length, 'Missing canonical cover pool');
        assert.ok(m.theme && m.environment && m.imageReadinessPolicy, 'Missing theme/environment/readiness policy');
        assertCachePolicy(m.cacheMode, m.cacheControl);
        if (spec.timed) {
            assert.ok(m.byteMeasurementMethod && m.capabilities, 'Missing request method/capabilities');
            assert.equal(capture.samples?.length, ACCEPTANCE_METHOD[m.cacheMode], 'Missing/extra chronological samples');
            same(capture.pageErrors, [], 'Captured page errors');
            assert.ok(capture.initialOpen?.kind === 'open', 'Missing descriptive initial open');
            for (const field of measuredFields) assert.ok(capture.initialOpen[field] === null || Number.isFinite(capture.initialOpen[field]) && capture.initialOpen[field] >= 0, `Invalid/missing initial-open numerical ${field}`);
            assert.ok(Array.isArray(capture.startupRequests) && Array.isArray(capture.throughOpenRequests) && Number.isFinite(capture.firstOpenStartedAt), 'Missing startup/first-use request journal');
            assert.ok(capture.startupRequests.every(request => request.startedAt <= capture.firstOpenStartedAt), 'Startup request boundary mismatch');
            for (const [position, sample] of capture.samples.entries()) {
                assert.equal(sample.run, position, 'Raw chronology altered');
                assert.equal(sample.kind, m.cacheMode === 'cold' ? 'open' : 'interaction', 'Wrong observation kind');
                for (const field of measuredFields) assert.ok(sample[field] === null || Number.isFinite(sample[field]) && sample[field] >= 0, `Invalid/missing numerical ${field}`);
                if (m.cacheMode === 'warm') {
                    assert.equal(sample.readinessMs, null, 'Warm readiness must remain n=1');
                    assert.equal(sample.firstUsefulContentMs, null, 'Warm initial content cannot be replicated');
                    assert.ok(sample.beforeId && sample.afterId && sample.beforeId !== sample.afterId, 'No-op interaction');
                    assert.ok(sample.interactionKind, 'Missing interaction kind');
                    if (position) assert.equal(sample.beforeId, capture.samples[position - 1].afterId, 'Interaction sequence is not chronological');
                    if (position > 1) assert.equal(sample.afterId, capture.samples[position - 2].afterId, 'Interaction sequence must alternate');
                } else assert.equal(sample.interactionMs, null, 'Cold opens cannot invent interaction measurements');
            }
        }
        resolved.set(capture.id, capture);
    }
    validateBundleEvidence(bundle, role);
    return resolved;
}
export function evaluateRenderingPerformance(baseline, candidate) {
    const findings = [];
    let before, after;
    try {
        before = validateRenderingMatrix(baseline, 'baseline'); after = validateRenderingMatrix(candidate, 'candidate');
        assert.equal(baseline.evidence.browserBinaryHash, candidate.evidence.browserBinaryHash, 'Browser binary identity mismatch');
        for (const key of ['fixtureHash', 'protocolHash', 'environment', 'coverHashes', 'absentCoverPackIds', 'imageReadinessPolicy']) same(baseline.index[key], candidate.index[key], `Bundle identity mismatch: ${key}`);
        same(baseline.evidence.canonical, candidate.evidence.canonical, 'Canonical index/original/export identity mismatch');
        for (const [id, a] of before) {
            const b = after.get(id);
            for (const key of ['fixture', 'browser', 'viewport', 'deviceScaleFactor', 'cpuRate', 'cacheMode', 'cacheControl', 'theme', 'protocolHash', 'environment', 'capabilities', 'byteMeasurementMethod', 'imageReadinessPolicy']) same(a.metadata[key], b.metadata[key], `${id}: environment mismatch: ${key}`);
            if (a.samples) same(a.samples.map(sample => [sample.interactionKind ?? null, sample.beforeId ?? null, sample.afterId ?? null]), b.samples.map(sample => [sample.interactionKind ?? null, sample.beforeId ?? null, sample.afterId ?? null]), `${id}: interaction target sequence mismatch`);
        }
    } catch (error) { return { status: 'fail', findings: [{ status: 'fail', metric: 'structural/provenance/evidence', reason: error.message }] }; }
    const lazy = JSON.parse(candidate.artifacts.get(candidate.evidence.proofs['lazy-import'].artifact.file).toString('utf8'));
    for (const metric of ['firstUseTransferBytes', 'firstUseEvaluationMs', 'lateImageBytes']) findings.push({ metric, status: lazy[metric] === null ? 'inconclusive' : 'pass', value: lazy[metric], reason: 'Required descriptive numerical observation; no invented regression threshold' });
    for (const [id, a] of before) {
        if (!a.samples) continue;
        const b = after.get(id), warm = a.metadata.cacheMode === 'warm';
        const descriptiveRequired = ['longTaskMs', 'transferBytes', 'imageBytes', 'resourceBytes', 'mutationsAdded', 'mutationsRemoved', ...(warm ? ['selectionCpuMs'] : ['firstUsefulContentMs'])];
        for (const field of descriptiveRequired) if (a.samples.some(sample => sample[field] === null) || b.samples.some(sample => sample[field] === null)) findings.push({ tuple: id, metric: field, status: 'inconclusive', value: null, reason: 'Required descriptive numerical observations unavailable' });
        if (warm && (a.initialOpen.readinessMs === null || b.initialOpen.readinessMs === null)) findings.push({ tuple: id, metric: 'initial-open-readiness', status: 'inconclusive', value: null, countPerBuild: 1, reason: 'Descriptive warm initial-open readiness unavailable' });
        const compare = (metric, field, statisticKind, kind, values) => {
            const [av, bv] = values || [a.samples.map(sample => sample[field]), b.samples.map(sample => sample[field])];
            const options = { tuple: id, metric, statisticKind, kind };
            const primary = bootstrapComparison(av, bv, { ...options, blockPairs: warm ? 5 : null });
            const status = classifyRenderingInterval(kind, primary.interval);
            const sensitivity = warm ? bootstrapComparison(av, bv, { ...options, blockPairs: 10 }) : null;
            const sensitivityStatus = sensitivity ? classifyRenderingInterval(kind, sensitivity.interval) : status;
            findings.push({ tuple: id, metric, statistic: statisticKind, status: combineWarmClassifications(status, sensitivityStatus), ...primary, sensitivity,
                evidence: { baseline: baseline.evidencePath ?? null, candidate: candidate.evidencePath ?? null },
                budget: kind === 'gain' ? 'gain >= 0.20' : kind === 'cover' ? 'strict reduction' : 'max(5% baseline, 2 ms)',
                reason: status !== sensitivityStatus ? 'Five-pair/ten-pair sensitivity classifications disagree' : primary.reason ?? `Fixed ${kind} interval classification` });
        };
        if (warm) {
            compare('interaction-p95', 'interactionMs', 'p95', 'excess');
            if (a.metadata.fixture.id === 'workbench-500') compare('selection-cpu-median', 'selectionCpuMs', 'median', 'gain');
        } else {
            compare('readiness-median', 'readinessMs', 'median', 'excess');
            compare('readiness-p95', 'readinessMs', 'p95', 'excess');
            if (a.metadata.fixture.library) compare('cover-transfer-median', null, 'median', 'cover', [a.samples.map(sample => verifiedCoverBytes(baseline, id, sample)), b.samples.map(sample => verifiedCoverBytes(candidate, id, sample))]);
        }
        findings.push({ tuple: id, metric: 'descriptive', status: 'pass', baseline: describe(a), candidate: describe(b), evidence: [baseline.evidencePath ?? null, candidate.evidencePath ?? null] });
    }
    return { status: findings.some(finding => finding.status === 'fail') ? 'fail' : findings.some(finding => finding.status === 'inconclusive') ? 'inconclusive' : 'pass', findings,
        limitations: ['Approximate per-comparison percentile intervals; no simultaneous or distribution-free 95% guarantee.', 'Cold sampling uses isolated contexts within one browser process; temporal independence is limited.', 'Warm five/ten-pair blocks require suitable stationarity/dependence assumptions.', ...(candidate.evidence.platforms ?? []).filter(platform => platform.available === false).map(platform => `${platform.name}: unavailable (${platform.reason})`)] };
}
function describe(capture) {
    return { initialOpen: capture.initialOpen, samples: Object.fromEntries(measuredFields.map(field => [field, capture.samples.some(sample => sample[field] === null) ? null : summarizeSamples(capture.samples, field)])), startupRequests: capture.startupRequests, throughOpenRequests: capture.throughOpenRequests };
}
