// Deterministic, COMPLETE matrix fixtures. No measured acceptance data is read.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedMatrix, ACCEPTANCE_METHOD } from './saga-rendering-acceptance.mjs';
import { expectedVisualPairs, sha256, PROTOCOL_FILES, ORIGINAL_BASELINE_REVISION } from './saga-rendering-evidence.mjs';
import { SAGA_IMAGE_READINESS_POLICY } from './saga-performance-image-readiness.mjs';
export async function syntheticBundle(role = 'candidate', { sourceRevision = role === 'baseline' ? ORIGINAL_BASELINE_REVISION : 'cccccccccccccccccccccccccccccccccccccccc' } = {}) {
    const artifacts = new Map();
    const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+k6S8AAAAASUVORK5CYII=', 'base64');
    const put = (file, value) => { const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)); artifacts.set(file, bytes); return { file, sha256: sha256(bytes) }; };
    // Only the immutable METHOD fixtures are reused, never capture values. Full
    // tests need this exact historical protocol, supplied as a separate input.
    const protocolRoot = process.env.SAGA_ACCEPTANCE_PROTOCOL_ROOT || fileURLToPath(new URL('../../../tests/fixtures/rendering-performance-9a3/', import.meta.url));
    const protocolFiles = [];
    for (const file of PROTOCOL_FILES) protocolFiles.push({ path: file, ...put(`protocol/${file}`, await readFile(path.join(protocolRoot, file))) });
    const fixture = put('fixture-source.mjs', await readFile(path.join(protocolRoot, 'tests/browser/performance-fixtures.mjs')));
    const protocolManifest = put('protocol-manifest.json', { protocolHash: ACCEPTANCE_METHOD.protocolHash, files: protocolFiles });
    const derivativePath = 'assets/generated/loredeck-covers/synthetic-128.webp';
    const shipped = role === 'baseline' ? [] : [
        ['src/ui/generated/workbench/view.js', 'compiled view'],
        ['src/ui/generated/workbench/LICENSE.txt', 'compiled license'],
        ['src/loredecks/generated/loredeck-cover-thumbnails.js', 'compiled image map'],
        [derivativePath, 'synthetic derivative'],
    ];
    const source = [['src/synthetic.js', `synthetic ${role}`], ['styles/synthetic.css', 'style'], ['manifest.json', '{}'], ...shipped]
        .map(([pathname, text]) => ({ path: pathname, ...put(`evidence/source/${pathname}`, text) }));
    const digest = files => sha256(Buffer.concat([...files].sort((a, b) => a.path < b.path ? -1 : 1).map(entry => Buffer.concat([Buffer.from(entry.path), artifacts.get(entry.file)]))));
    const sourceHash = digest(source), paritySourceHash = digest(source.filter(entry => /^(src|styles)\//.test(entry.path)));
    const sourceManifest = put('source-manifest.json', { sourceRevision, sourceHash, paritySourceHash, files: source });
    const coverPath = 'content/loredecks/synthetic/assets/cover.png';
    const asset = { path: coverPath, originalPath: coverPath, width: 1000, height: 1000, ...put('evidence/cover.png', 'synthetic cover') };
    const derivative = role === 'baseline' ? null : { ...source.find(entry => entry.path === derivativePath), originalPath: coverPath, width: 128, height: 128 };
    const assets = derivative ? [asset, derivative] : [asset];
    const canonical = { index: put('canonical/index.json', { bundled: [{ packId: 'synthetic', assets: { cover: { path: 'assets/cover.png' } } }, { packId: 'absent' }] }), exports: [put('canonical/export.json', { canonical: 'unchanged' })] };
    const environment = { platform: 'synthetic', release: 'toy', arch: 'toy', cpu: 'toy', node: 'v24.16.0' };
    const policy = SAGA_IMAGE_READINESS_POLICY;
    const index = { sourceHash, sourceRevision, fixtureHash: ACCEPTANCE_METHOD.fixtureHash, protocolHash: ACCEPTANCE_METHOD.protocolHash, imageReadinessPolicy: policy, environment, requestedRuns: { warm: 200, cold: 100 }, completeRunCounts: true, coverHashes: { [coverPath]: asset.sha256 }, absentCoverPackIds: ['absent'], captures: [] };
    const rawCaptures = [], captures = [];
    const bytes = role === 'baseline' ? 1000 : 900;
    const sample = (run, warm) => ({ run, kind: warm ? 'interaction' : 'open', readinessMs: warm ? null : 100, interactionMs: warm ? 100 : null, selectionCpuMs: warm ? role === 'baseline' ? 100 : 79 : null, firstUsefulContentMs: warm ? null : 50, longTaskMs: 0, transferBytes: bytes, imageBytes: bytes, resourceBytes: bytes, mutationsAdded: 0, mutationsRemoved: 0,
        ...(warm ? { beforeId: run % 2 ? 'b' : 'a', afterId: run % 2 ? 'a' : 'b', interactionKind: 'click-selection' } : {}),
        imageReadiness: warm ? null : { ready: true, supported: true, policy: policy.id, unknownRoots: 0, unknownImages: 0, initialReadyEpoch: 1, sealedEpoch: 2, eligibleCount: 1, decodedCount: 1, visibleCoverCount: 1, visibleDeckCoverCount: 1, images: [{ decoded: true, source: `http://synthetic/${coverPath}`, cover: true, deckCover: true }] },
        requestWindow: { start: 0, end: 1, ids: [`${run}:request`] }, network: [{ id: `${run}:request`, sequence: 0, url: `http://synthetic/${coverPath}`, type: 'Image', startedAt: 1, status: 200, state: 'complete', encodedDataLength: bytes }] });
    for (const spec of expectedMatrix()) {
        const { timed, ...m } = spec;
        const metadata = { ...m, fixture: { ...spec.fixture, revision: index.fixtureHash, coverPool: [{ packId: 'synthetic', path: coverPath }], coverHashes: index.coverHashes, absentCoverPackIds: index.absentCoverPackIds }, browser: { name: 'chromium', version: '156.0.4314.58' }, environment, sourceHash, sourceRevision, protocolHash: index.protocolHash, imageReadinessPolicy: policy, theme: 'default', cacheControl: 'public, max-age=3600', ...(timed ? { capabilities: { taskCpu: true, networkBytes: true, longTasks: true }, byteMeasurementMethod: 'synthetic initiation windows' } : {}) };
        const screenshot = put(`${spec.id}.png`, pngBytes);
        if (timed) {
            const raw = { metadata, samples: Array.from({ length: spec.cacheMode === 'warm' ? 200 : 100 }, (_, run) => sample(run, spec.cacheMode === 'warm')), initialOpen: sample(0, false), startupRequests: [], throughOpenRequests: [{ url: 'http://synthetic/src/ui/generated/workbench/view.js', encodedDataLength: 25 }], firstOpenStartedAt: 5, pageErrors: [] };
            const rawReference = put(`${spec.id}.json`, raw); rawCaptures.push(rawReference);
            captures.push({ ...raw, id: spec.id, rawReference }); index.captures.push({ id: spec.id, file: rawReference.file, screenshot });
        } else { captures.push({ id: spec.id, metadata }); index.captures.push({ id: spec.id, metadata, screenshot }); }
    }
    const proofs = {};
    const proof = (kind, observations) => {
        const probe = put(`evidence/${kind}-probe.mjs`, `synthetic ${kind} probe`);
        proofs[kind] = { probe, artifact: put(`evidence/${kind}.json`, { sourceHash, paritySourceHash, protocolHash: index.protocolHash, probeHash: probe.sha256, ...observations }) };
    };
    proof('asset-serving', { serverHash: protocolFiles.find(file => file.path.endsWith('serve-visual-smoke.mjs')).sha256, responses: assets.map(item => ({ path: item.path, url: `http://synthetic/${item.path}`, status: 200, sha256: item.sha256, sourceHash })) });
    const browserBinaryHash = sha256(Buffer.from('synthetic browser'));
    proof('sampling', { browserBinaryHash, events: [{ at: '2026-11-06T00:00:00Z', type: 'start' }, { at: '2026-11-06T00:01:00Z', type: 'complete' }] });
    const cases = Array.from({ length: 36 }, (_, i) => `case ${i}`), tap = put('evidence/functional.tap', '# pass 36\n# fail 0\n');
    proof('functional', { runs: ['chromium', 'firefox', 'webkit'].map(engine => ({ engine, caseCount: 36, cases, sourceHash, tap })) });
    const png = put('evidence/visual.png', pngBytes);
    const pairs = expectedVisualPairs().map(scenario => {
        const { profile, state } = scenario;
        const comparison = { geometryEqual: true, changedPixels: 0, unexplainedPixels: 0, perImage: [] };
        const pair = { ...scenario, baseline: png, candidate: png, comparison, images: [] };
        if (state === 'library-77' || state === 'library-1000') {
            const clip = { left: 0, top: 0, right: 32, bottom: 32 };
            const selected = derivative ?? asset;
            const image = { index: 0, visible: true, original: coverPath, selected: selected.path, rect: [0, 0, 32, 32], fit: 'cover', focal: '50% 50%', verifiedDerivative: Boolean(derivative),
                before: { clip, complete: true, currentSrc: `http://synthetic/${coverPath}`, naturalWidth: asset.width, naturalHeight: asset.height },
                after: { clip, complete: true, currentSrc: `http://synthetic/${selected.path}`, naturalWidth: selected.width, naturalHeight: selected.height } };
            if (derivative) {
                const side = 32 * profile.deviceScaleFactor;
                Object.assign(image, { originalHash: asset.sha256, derivativeHash: derivative.sha256, derivativeSize: [128, 128], physicalBox: [side, side] });
                comparison.perImage.push({ index: image.index, original: coverPath, selected: derivative.path, originalHash: asset.sha256, derivativeHash: derivative.sha256, pixels: side * side, rgbRmse: 0 });
            }
            pair.images.push(image);
        }
        return pair;
    });
    proof('visual', { pairs });
    const counts = { views: 0, listeners: 0, timers: 0, detachedEditors: 0, pendingJobs: 0 };
    proof('lifecycle', { cycles: 5, settledMs: 100, collectionMethod: 'synthetic', before: counts, after: counts });
    proof('structure', { unaffectedRowsCompared: 499, replacedUnaffectedRows: 0, cloneCallsPerRequest: [1], selectionFullPayloadModelCalls: [0], closedFactories: Object.fromEntries(['scope-brief', 'context-plan', 'coverage-plan', 'story-outline', 'title-sets', 'review-queue', 'lorecards', 'deck-health'].map(name => [name, 0])) });
    proof('lazy-import', { firstUseTransferBytes: 25, firstUseEvaluationMs: 1, lateImageBytes: 0, firstUseRequests: ['view.js'] });
    const generated = source.filter(entry => shipped.some(([pathname]) => pathname === entry.path));
    proof('build', { tracked: generated, rebuilt: generated.map(entry => ({ path: entry.path, ...put(`evidence/rebuilt/${entry.path}`, artifacts.get(entry.file)) })) });
    proof('host', { hostVersion: 'toy', hostRevision: 'toy', installCommand: 'toy', nodeModulesCount: 0, localBuildCount: 0, libraryDecks: 77, libraryCovers: 70, readonlyRows: 80, requestedEdit: 'toy', persistedEditAfterReopen: 'toy', pageErrors: [] });
    proof('source-review', { unresolvedFindings: [], claims: ['single-controller-store', 'no-state-manager-copy', 'bundle-self-contained', 'pending-source-save-ownership', 'registries-pending-unmigrated', 'canonical-export-unchanged'].map(requirement => ({ requirement, conclusion: 'satisfied', citations: [{ path: source[0].path, sha256: source[0].sha256, line: 1 }] })) });
    return { index, captures, artifacts, evidence: { schemaVersion: 1, protocolManifest, fixture, sourceManifest, canonical, assets, browserBinaryHash, rawCaptures, proofs, platforms: ['Safari', 'Android', 'iOS', 'Safari 14'].map(name => ({ name, available: false, reason: 'Synthetic fixture; no native device' })) } };
}
export function changeSyntheticCapture(bundle, id, mutate) {
    const capture = bundle.captures.find(item => item.id === id);
    mutate(capture);
    if (capture.rawReference) {
        const raw = Object.fromEntries(Object.entries(capture).filter(([key]) => !['id', 'rawReference'].includes(key)));
        const bytes = Buffer.from(JSON.stringify(raw)); bundle.artifacts.set(capture.rawReference.file, bytes); capture.rawReference.sha256 = sha256(bytes);
    }
}
export function changeSyntheticProof(bundle, kind, mutate) {
    const reference = bundle.evidence.proofs[kind].artifact;
    const body = JSON.parse(bundle.artifacts.get(reference.file).toString()); mutate(body);
    const bytes = Buffer.from(JSON.stringify(body)); bundle.artifacts.set(reference.file, bytes); reference.sha256 = sha256(bytes);
}
