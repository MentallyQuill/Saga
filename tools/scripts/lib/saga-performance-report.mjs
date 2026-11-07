import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { SAGA_IMAGE_READINESS_POLICY } from './saga-performance-image-readiness.mjs';
export { evaluateRenderingPerformance, classifyRenderingInterval } from './saga-rendering-acceptance.mjs';
export function assertCachePolicy(cacheMode, cacheControl) {
    assert.ok(['warm', 'cold'].includes(cacheMode), 'Unknown cache mode');
    assert.equal(typeof cacheControl, 'string', 'Missing cache policy');
    if (cacheMode === 'warm') assert.ok(!/no-store|no-cache/i.test(cacheControl) && /max-age=[1-9]/.test(cacheControl), 'A warm cache run requires cacheable server responses');
}
/** Shared reviewed gate invariants, including descriptive warm initial opens. */
export function validateImageReadinessObservation(sample, metadata) {
    if (sample.kind === 'interaction') {
        assert.equal(sample.imageReadiness, null, 'Interaction image readiness is unmeasured and must be null');
        return;
    }
    const gate = sample.imageReadiness;
    assert.ok(gate?.ready === true && gate.supported === true && gate.policy === SAGA_IMAGE_READINESS_POLICY.id, 'Missing/unsupported image readiness');
    for (const name of ['unknownRoots', 'unknownImages', 'eligibleCount', 'decodedCount', 'visibleCoverCount', 'visibleDeckCoverCount', 'initialReadyEpoch', 'sealedEpoch']) assert.ok(Number.isInteger(gate[name]) && gate[name] >= 0, `Invalid image ${name}`);
    assert.ok(gate.unknownRoots === 0 && gate.unknownImages === 0, 'Image eligibility is unknown');
    assert.ok(Array.isArray(gate.images) && gate.images.length === gate.eligibleCount && gate.decodedCount === gate.eligibleCount && gate.images.every(image => image.decoded === true && typeof image.source === 'string' && image.source), 'Eligible images must be decoded for their current source');
    assert.equal(gate.visibleCoverCount, gate.images.filter(image => image.cover).length, 'Invalid visible cover count');
    assert.equal(gate.visibleDeckCoverCount, gate.images.filter(image => image.deckCover).length, 'Invalid visible deck cover count');
    if (metadata.fixture.library) assert.ok(gate.visibleDeckCoverCount > 0, 'Library requires a decoded visible deck cover');
    assert.ok(gate.sealedEpoch > gate.initialReadyEpoch, 'Image readiness requires a fresh stable observation epoch');
}
/** Distinguish deliberately unmeasured fields from measured-but-unavailable null. */
export function validateMeasurementKinds(sample, metadata) {
    assert.ok(['open', 'interaction'].includes(sample.kind), 'Unknown observation kind');
    if (sample.kind === 'open') {
        assert.equal(sample.interactionMs, null, 'Open interaction is unmeasured and must be null');
        assert.equal(sample.selectionCpuMs, null, 'Open selection CPU is unmeasured and must be null');
    } else {
        assert.equal(sample.readinessMs, null, 'Interaction samples cannot replicate initial-open readiness; unmeasured and must be null');
        assert.equal(sample.firstUsefulContentMs, null, 'Interaction first useful content is unmeasured and must be null');
    }
    for (const [capability, fields] of [['longTasks', ['longTaskMs']], ['taskCpu', ['selectionCpuMs']], ['networkBytes', ['transferBytes', 'imageBytes']]]) {
        if (metadata.capabilities?.[capability] === false) for (const field of fields) assert.equal(sample[field], null, `${field} unavailable: must be null`);
    }
}
export function validateCapture(capture) {
    const m = capture?.metadata;
    assert.ok(m && m.fixture && m.browser && m.viewport, 'Missing exact fixture/browser/viewport metadata');
    assert.ok(m.fixture.revision && Array.isArray(m.fixture.coverPool), 'Missing fixture revision/cover pool');
    assert.ok(m.browser.name && m.browser.version, 'Missing browser identity');
    for (const value of [m.viewport.width, m.viewport.height, m.deviceScaleFactor, m.cpuRate]) assert.ok(Number.isFinite(value) && value > 0, 'Invalid viewport/DPR/CPU metadata');
    assertCachePolicy(m.cacheMode, m.cacheControl);
    if (m.imageReadinessPolicy !== undefined) assert.ok(isDeepStrictEqual(m.imageReadinessPolicy, SAGA_IMAGE_READINESS_POLICY), 'Invalid nonforcing image readiness policy');
    assert.ok(Array.isArray(capture.samples) && capture.samples.length, 'Missing raw samples');
    for (const sample of capture.samples) {
        if (m.imageReadinessPolicy !== undefined) validateImageReadinessObservation(sample, m);
        if (['open', 'interaction'].includes(sample.kind)) validateMeasurementKinds(sample, m);
        if (sample.kind === 'interaction') assert.equal(sample.readinessMs, null, 'Interaction samples cannot replicate initial-open readiness');
        else assert.ok(Number.isFinite(sample.readinessMs) && sample.readinessMs >= 0, 'readinessMs must be finite and nonnegative');
        if (sample.firstUsefulContentMs !== undefined && sample.firstUsefulContentMs !== null) assert.ok(Number.isFinite(sample.firstUsefulContentMs) && sample.firstUsefulContentMs >= 0, 'firstUsefulContentMs must be finite and nonnegative');
        if (sample.kind === 'open') assert.equal(sample.interactionMs, null, 'Open samples cannot report an unmeasured interaction as zero');
        else assert.ok(Number.isFinite(sample.interactionMs) && sample.interactionMs >= 0, 'interactionMs must be finite and nonnegative');
        if (m.capabilities?.longTasks === false) assert.equal(sample.longTaskMs, null, 'Long-task metric unavailable: must be null');
        else assert.ok(Number.isFinite(sample.longTaskMs) && sample.longTaskMs >= 0, 'longTaskMs must be finite and nonnegative');
        for (const name of ['transferBytes', 'imageBytes', 'resourceBytes', 'mutationsAdded', 'mutationsRemoved']) assert.ok(Number.isFinite(sample[name]) && sample[name] >= 0, `${name} must be finite and nonnegative`);
        if (sample.selectionCpuMs !== null) assert.ok(Number.isFinite(sample.selectionCpuMs) && sample.selectionCpuMs >= 0, 'selectionCpuMs must be finite and nonnegative');
        if (sample.beforeId !== undefined) assert.ok(sample.beforeId && sample.afterId && sample.beforeId !== sample.afterId, 'Selection sample is a no-op');
    }
    if (capture.startupRequests) {
        assert.ok(Number.isFinite(capture.firstOpenStartedAt), 'Missing Startup/open request boundary');
        assert.ok(capture.startupRequests.every(r => Number.isFinite(r.startedAt) && r.startedAt <= capture.firstOpenStartedAt), 'Startup requests must precede view opening');
    }
    return capture;
}
export function assertComparableCaptures(baseline, candidate) {
    validateCapture(baseline);
    for (const name of ['fixture', 'browser', 'viewport', 'deviceScaleFactor', 'cpuRate', 'cacheMode', 'cacheControl', 'theme', 'protocolHash', 'environment', 'capabilities', 'byteMeasurementMethod', 'imageReadinessPolicy']) assert.ok(isDeepStrictEqual(baseline.metadata[name], candidate.metadata[name]), `Capture metadata mismatch: ${name}`);
    validateCapture(candidate);
}
export function summarizeSamples(samples, field) {
    const values = samples.map(s => s[field]).filter(Number.isFinite).sort((a, b) => a - b);
    if (!values.length) return null;
    return { count: values.length, median: (values[Math.floor((values.length - 1) / 2)] + values[Math.floor(values.length / 2)]) / 2, p95: values[Math.ceil(values.length * .95) - 1], min: values[0], max: values.at(-1) };
}
