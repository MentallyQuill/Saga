import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateObservation } from './lib/saga-rendering-evidence.mjs';
import { SAGA_IMAGE_READINESS_POLICY } from './lib/saga-performance-image-readiness.mjs';

// Deliberately no complete bundle, artifact IO, browser, bootstrap, or sampler.
const tuple = 'library-77-desktop-1x-cold';
const metadata = { fixture: { library: true }, imageReadinessPolicy: SAGA_IMAGE_READINESS_POLICY, capabilities: { taskCpu: true, networkBytes: true, longTasks: true } };
const bundle = () => ({ index: { imageReadinessPolicy: SAGA_IMAGE_READINESS_POLICY }, evidence: { assets: [] }, captures: [{ id: tuple, metadata: structuredClone(metadata) }] });
const open = () => ({ kind: 'open', readinessMs: 5, interactionMs: null, selectionCpuMs: null, firstUsefulContentMs: 2, longTaskMs: 0, transferBytes: 0, imageBytes: 0, resourceBytes: 0, mutationsAdded: 0, mutationsRemoved: 0,
    requestWindow: { start: 0, end: 0, ids: [] }, network: [],
    imageReadiness: { ready: true, supported: true, policy: SAGA_IMAGE_READINESS_POLICY.id, unknownRoots: 0, unknownImages: 0, eligibleCount: 1, decodedCount: 1, visibleCoverCount: 1, visibleDeckCoverCount: 1, initialReadyEpoch: 1, sealedEpoch: 2, images: [{ decoded: true, source: 'http://toy/cover.png', cover: true, deckCover: true }] } });
test('direct open validator reconciles cover flags and every integer counter', () => {
    assert.doesNotThrow(() => validateObservation(bundle(), tuple, open()));
    for (const mutate of [
        sample => { sample.imageReadiness.visibleCoverCount = 2; },
        sample => { sample.imageReadiness.images[0].deckCover = false; },
        sample => { sample.imageReadiness.visibleDeckCoverCount = .5; },
        sample => { sample.imageReadiness.initialReadyEpoch = .5; },
        sample => { sample.imageReadiness.sealedEpoch = 1; },
        sample => { sample.imageReadiness.images[0].source = 123; },
        sample => { sample.imageReadiness.images[0].source = ''; },
        sample => { delete sample.imageReadiness.visibleCoverCount; },
    ]) { const sample = open(); mutate(sample); assert.throws(() => validateObservation(bundle(), tuple, sample)); }
});
test('unmeasured open interaction/selection CPU are null, never zero', () => {
    for (const field of ['interactionMs', 'selectionCpuMs']) { const sample = open(); sample[field] = 0; assert.throws(() => validateObservation(bundle(), tuple, sample), /unmeasured|Open/i); }
});
test('interactions keep readiness/content/image readiness unmeasured', () => {
    const interaction = () => ({ ...open(), kind: 'interaction', readinessMs: null, firstUsefulContentMs: null, interactionMs: 5, selectionCpuMs: 1, imageReadiness: null });
    assert.doesNotThrow(() => validateObservation(bundle(), tuple, interaction()));
    for (const field of ['readinessMs', 'firstUsefulContentMs', 'imageReadiness']) { const sample = interaction(); sample[field] = 0; assert.throws(() => validateObservation(bundle(), tuple, sample), /unmeasured|Interaction/i); }
});
test('unavailable capability values must be null; available measured null remains valid', () => {
    for (const [capability, field] of [['longTasks', 'longTaskMs'], ['taskCpu', 'selectionCpuMs'], ['networkBytes', 'transferBytes'], ['networkBytes', 'imageBytes']]) {
        const value = bundle(), sample = open();
        value.captures[0].metadata.capabilities[capability] = false;
        if (capability === 'taskCpu') Object.assign(sample, { kind: 'interaction', readinessMs: null, firstUsefulContentMs: null, interactionMs: 2, imageReadiness: null });
        if (capability === 'networkBytes') Object.assign(sample, { transferBytes: null, imageBytes: null });
        sample[field] = 0;
        assert.throws(() => validateObservation(value, tuple, sample), /unavailable/i);
        sample[field] = null;
        assert.doesNotThrow(() => validateObservation(value, tuple, sample));
    }
    const sample = open(); sample.readinessMs = null;
    assert.doesNotThrow(() => validateObservation(bundle(), tuple, sample), 'Required measured null must remain available to inconclusive inference');
});
