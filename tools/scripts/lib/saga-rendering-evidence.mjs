import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validateImageReadinessObservation, validateMeasurementKinds } from './saga-performance-report.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const PROTOCOL_FILES = Object.freeze(['tools/scripts/capture-rendering-performance.mjs', 'tools/scripts/lib/saga-performance-harness.mjs', 'tools/scripts/lib/saga-performance-report.mjs', 'tools/scripts/lib/saga-performance-request-journal.mjs', 'tools/scripts/serve-visual-smoke.mjs', 'tools/scripts/lib/saga-performance-image-readiness.mjs']);
export const ORIGINAL_BASELINE_REVISION = '1a92c7082241af393146215a39ce2073ce646db2';
const CLOSED_FACTORIES = ['context-plan', 'coverage-plan', 'deck-health', 'lorecards', 'review-queue', 'scope-brief', 'story-outline', 'title-sets'];
const GENERATED_DIRECTORIES = ['src/ui/generated/workbench/', 'src/loredecks/generated/', 'assets/generated/loredeck-covers/'];
const VISUAL_PROFILES = [
    { id: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    { id: 'tablet', viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 },
    { id: 'phone', viewport: { width: 430, height: 820 }, deviceScaleFactor: 3 },
];
const hashPattern = /^[a-f0-9]{64}$/;
const equal = (a, b, reason) => assert.ok(isDeepStrictEqual(a, b), reason);
export function artifactBytes(bundle, reference) {
    assert.ok(reference && typeof reference.file === 'string' && hashPattern.test(reference.sha256), 'Missing artifact path/hash');
    const bytes = bundle.artifacts?.get(reference.file);
    assert.ok(Buffer.isBuffer(bytes), `Artifact bytes not loaded: ${reference.file}`);
    assert.equal(sha256(bytes), reference.sha256, `Corrupt artifact: ${reference.file}`);
    return bytes;
}
export const artifactJSON = (bundle, reference) => JSON.parse(artifactBytes(bundle, reference).toString('utf8'));
const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');
function inspectPng(bundle, reference) { assert.ok(artifactBytes(bundle, reference).subarray(0, 8).equals(pngSignature), 'Invalid PNG artifact'); }
function requireNumber(value, message) { assert.ok(value === null || Number.isFinite(value) && value >= 0, message); }
function sourceBindings(bundle) {
    const e = bundle.evidence, manifest = artifactJSON(bundle, e.sourceManifest);
    assert.ok(Array.isArray(manifest.files) && manifest.files.length, 'Missing immutable source file inventory');
    const files = new Map();
    for (const entry of manifest.files) {
        assert.ok(typeof entry.path === 'string' && !files.has(entry.path), 'Duplicate/invalid source path');
        assert.equal(entry.collectorPath ?? entry.path, entry.path.startsWith('assets/generated/') && bundle.index.environment.platform === 'win32' ? entry.path.replaceAll('/', '\\') : entry.path, 'Collector hash-prefix spelling mismatch');
        artifactBytes(bundle, entry);
        files.set(entry.path, entry);
    }
    // Collector and parity use intentionally different algorithms. Both are
    // reconstructed from the SAME immutable archive inventory, never compared
    // to one another or to the live checkout.
    const srcStyles = [...files.values()].filter(entry => /^(src|styles)\//.test(entry.path));
    const collector = [...srcStyles, ...files.values()].filter((entry, index, entries) => entries.findIndex(item => item.path === entry.path) === index)
        .filter(entry => /^(src|styles)\//.test(entry.path) || entry.path === 'manifest.json' || entry.path.startsWith('assets/generated/'));
    const digest = (entries, key) => sha256(Buffer.concat([...entries].sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0).map(entry => Buffer.concat([Buffer.from(key(entry)), artifactBytes(bundle, entry)]))));
    assert.ok(files.has('manifest.json') && srcStyles.length, 'Incomplete collector source inventory');
    assert.equal(manifest.sourceHash, bundle.index.sourceHash, 'Source manifest fingerprint mismatch');
    assert.equal(digest(collector, entry => entry.collectorPath ?? entry.path), bundle.index.sourceHash, 'Collector source archive hash mismatch');
    const paritySourceHash = digest(srcStyles, entry => entry.path);
    assert.equal(manifest.paritySourceHash, paritySourceHash, 'Parity archive hash mismatch');
    assert.equal(manifest.sourceRevision, bundle.index.sourceRevision, 'Source revision mismatch');
    return { files, paritySourceHash };
}
function proofJSON(bundle, kind, bindings) {
    const proof = bundle.evidence.proofs?.[kind];
    assert.ok(proof, `Missing required evidence: ${kind}`);
    const body = artifactJSON(bundle, proof.artifact);
    artifactBytes(bundle, proof.probe);
    assert.equal(body.sourceHash, bundle.index.sourceHash, `${kind}: wrong collector source binding`);
    assert.equal(body.paritySourceHash, bindings.paritySourceHash, `${kind}: wrong parity source binding`);
    assert.equal(body.protocolHash, bundle.index.protocolHash, `${kind}: wrong frozen protocol binding`);
    assert.equal(body.probeHash, proof.probe.sha256, `${kind}: wrong probe binding`);
    return body;
}
function validateGeneratedInventory(bundle, build, bindings) {
    const expected = new Map([...bindings.files].filter(([pathname]) => GENERATED_DIRECTORIES.some(directory => pathname.startsWith(directory))));
    for (const directory of GENERATED_DIRECTORIES) assert.ok([...expected.keys()].some(pathname => pathname.startsWith(directory)), `Missing generated inventory in immutable source: ${directory}`);
    for (const kind of ['tracked', 'rebuilt']) {
        const entries = build[kind];
        assert.ok(Array.isArray(entries) && entries.length === expected.size, `Incomplete ${kind} generated inventory`);
        assert.equal(new Set(entries.map(entry => entry.path)).size, expected.size, `Duplicate ${kind} generated inventory path`);
        for (const entry of entries) {
            assert.ok(expected.has(entry.path) && entry.sha256 === expected.get(entry.path).sha256, `${kind} generated inventory does not match immutable source: ${entry.path}`);
            artifactBytes(bundle, entry);
        }
    }
}
function validateVisibleCover(bundle, pair, image) {
    const originalHash = bundle.index.coverHashes[image.original];
    if (!originalHash) return false;
    const clip = image.before?.clip;
    assert.ok(clip && ['left', 'top', 'right', 'bottom'].every(key => Number.isFinite(clip[key])), 'Missing observed cover crop');
    equal(image.after?.clip, clip, 'Cover crop mismatch');
    const visible = clip.right > clip.left && clip.bottom > clip.top;
    assert.equal(image.visible, visible, 'Cover visibility must agree with its crop');
    if (!visible) return false;
    assert.ok(Array.isArray(image.rect) && image.rect.length === 4 && image.rect.every(Number.isFinite) && image.rect[2] > 0 && image.rect[3] > 0, 'Missing observed cover geometry');
    assert.ok(typeof image.fit === 'string' && image.fit && typeof image.focal === 'string' && image.focal, 'Missing observed cover fit/focal');
    for (const [side, expectedPath] of [[image.before, image.original], [image.after, image.selected]]) {
        assert.ok(side.complete === true && side.naturalWidth > 0 && side.naturalHeight > 0, 'Visible Library cover must decode');
        const url = side.currentSrc || side.src;
        assert.ok(typeof url === 'string' && url && decodeURIComponent(new URL(url).pathname).replace(/^\//, '') === expectedPath, 'Observed cover source must match its asset mapping');
    }
    const asset = bundle.evidence.assets.find(item => item.path === image.selected && item.originalPath === image.original);
    assert.ok(asset, 'Unknown quality-tested cover mapping');
    if (image.original !== image.selected) {
        assert.ok(image.verifiedDerivative === true && image.originalHash === originalHash && image.derivativeHash === asset.sha256, 'Unverified derivative quality evidence');
        const dpr = pair.profile.deviceScaleFactor, [,, width, height] = image.rect;
        equal(image.physicalBox, [width * dpr, height * dpr], 'Physical cover box must reflect observed DPR');
        equal(image.derivativeSize, [asset.width, asset.height], 'Derivative dimensions do not match verified asset');
        equal([image.after.naturalWidth, image.after.naturalHeight], image.derivativeSize, 'Decoded derivative dimensions differ');
        const scale = image.fit === 'contain' ? Math.min(width / asset.width, height / asset.height) : Math.max(width / asset.width, height / asset.height);
        assert.ok(scale * dpr <= 1, `Insufficient cover physical pixels at DPR${dpr}`);
        const quality = pair.comparison.perImage?.find(item => item.index === image.index);
        assert.ok(quality && quality.original === image.original && quality.selected === image.selected && quality.originalHash === originalHash && quality.derivativeHash === asset.sha256 && Number.isInteger(quality.pixels) && quality.pixels > 0 && Number.isFinite(quality.rgbRmse) && quality.rgbRmse >= 0, 'Missing observed derivative pixel quality');
    }
    return true;
}
function validateVisualPairs(bundle, visual) {
    assert.ok(Array.isArray(visual.pairs) && visual.pairs.length >= 162, 'Missing complete paired visual inventory');
    assert.ok(new Set(visual.pairs.map(pair => pair.id)).size === visual.pairs.length, 'Duplicate visual pair');
    const expectedLibrary = new Set(VISUAL_PROFILES.flatMap(({ id }) => ['default', 'custom'].flatMap(theme => ['library-77', 'library-1000'].map(state => `${id}-${theme}-${state}`))));
    for (const pair of visual.pairs) {
        const profile = VISUAL_PROFILES.find(item => item.id === pair.profile?.id);
        assert.ok(profile && isDeepStrictEqual(pair.profile, profile), 'Visual viewport/DPR mismatch');
        assert.ok(typeof pair.state === 'string' && pair.state && ['default', 'custom'].includes(pair.theme), 'Missing visual state/theme');
        assert.equal(pair.id, `${profile.id}-${pair.theme}-${pair.state}`, 'Visual pair ID does not match state/profile/theme');
        for (const ref of [pair.baseline, pair.candidate]) inspectPng(bundle, ref);
        assert.equal(pair.comparison?.geometryEqual, true, 'Visual geometry mismatch');
        assert.equal(pair.comparison.unexplainedPixels, 0, 'Unexplained visual pixel differences');
        assert.ok(Number.isInteger(pair.comparison.changedPixels) && pair.comparison.changedPixels >= 0, 'Missing visual pixel comparison');
        if (pair.comparison.changedPixels || pair.diff) inspectPng(bundle, pair.diff);
        assert.ok(Array.isArray(pair.images), 'Missing image quality/crop/DPR observations');
        const visibleCovers = pair.images.filter(image => validateVisibleCover(bundle, pair, image));
        if (expectedLibrary.has(pair.id)) {
            assert.ok(visibleCovers.length, `Missing observed Library cover: ${pair.id}`);
            expectedLibrary.delete(pair.id);
        }
    }
    assert.equal(expectedLibrary.size, 0, `Missing Library cover pairs: ${[...expectedLibrary].join(', ')}`);
}
export function validateBundleEvidence(bundle, role = 'candidate') {
    const e = bundle.evidence;
    assert.equal(e?.schemaVersion, 1, 'Missing supplemental evidence manifest v1');
    assert.ok(hashPattern.test(bundle.index.sourceHash) && bundle.index.sourceRevision, 'Missing source identity');
    if (role === 'baseline') assert.equal(bundle.index.sourceRevision, ORIGINAL_BASELINE_REVISION, 'Frozen original baseline revision mismatch');
    const protocol = artifactJSON(bundle, e.protocolManifest);
    equal(protocol.files.map(entry => entry.path), PROTOCOL_FILES, 'Frozen protocol must contain the six canonical files in order');
    const protocolBytes = protocol.files.map(entry => Buffer.concat([Buffer.from(entry.path), artifactBytes(bundle, entry)]));
    assert.equal(sha256(Buffer.concat(protocolBytes)), bundle.index.protocolHash, 'Archived protocol bytes mismatch');
    assert.equal(protocol.protocolHash, bundle.index.protocolHash, 'Protocol manifest mismatch');
    assert.equal(sha256(artifactBytes(bundle, e.fixture)), bundle.index.fixtureHash, 'Archived fixture bytes mismatch');
    const bindings = sourceBindings(bundle);
    assert.ok(e.canonical?.index && Array.isArray(e.canonical.exports) && e.canonical.exports.length, 'Missing canonical index/export references');
    const canonicalIndex = artifactJSON(bundle, e.canonical.index);
    assert.ok(Array.isArray(canonicalIndex.bundled), 'Missing canonical bundled index');
    const canonicalPool = canonicalIndex.bundled.filter(pack => pack.assets?.cover?.path).map(pack => ({ packId: pack.packId, path: `content/loredecks/${pack.packId}/${pack.assets.cover.path}` }));
    const absent = canonicalIndex.bundled.filter(pack => !pack.assets?.cover?.path).map(pack => pack.packId);
    equal(Object.keys(bundle.index.coverHashes).sort(), canonicalPool.map(item => item.path).sort(), 'Canonical index/cover-hash inventory mismatch');
    equal(bundle.index.absentCoverPackIds, absent, 'Canonical absent-cover inventory mismatch');
    for (const capture of bundle.captures) equal(capture.metadata.fixture.coverPool, canonicalPool, 'Canonical cover pool mismatch');
    for (const reference of e.canonical.exports) artifactBytes(bundle, reference);
    for (const [pathname, hash] of Object.entries(bundle.index.coverHashes)) {
        const original = e.assets?.find(asset => asset.path === pathname);
        assert.ok(original && original.originalPath === pathname, `Missing original asset identity: ${pathname}`);
        assert.equal(original.sha256, hash, 'Canonical original cover changed');
        artifactBytes(bundle, original);
    }
    assert.ok(Array.isArray(e.assets) && new Set(e.assets.map(asset => asset.path)).size === e.assets.length, 'Duplicate/missing asset manifest');
    const serving = proofJSON(bundle, 'asset-serving', bindings);
    assert.equal(serving.serverHash, protocol.files.find(entry => entry.path === 'tools/scripts/serve-visual-smoke.mjs').sha256, 'Asset proof must use frozen static server');
    assert.ok(Array.isArray(serving.responses), 'Missing observed HTTP/body hash manifest');
    for (const asset of e.assets) {
        artifactBytes(bundle, asset);
        assert.ok(bundle.index.coverHashes[asset.originalPath], `Unknown original/derivative mapping: ${asset.path}`);
        const response = serving.responses.find(item => item.path === asset.path);
        assert.ok(response?.status >= 200 && response.status < 300 && response.sha256 === asset.sha256 && response.sourceHash === bundle.index.sourceHash, `No successful observed HTTP body identity: ${asset.path}`);
        assert.equal(decodeURIComponent(new URL(response.url).pathname).replace(/^\//, ''), asset.path, 'HTTP path mapping mismatch');
        if (asset.path !== asset.originalPath) assert.ok(Number.isInteger(asset.width) && asset.width > 0 && Number.isInteger(asset.height) && asset.height > 0, 'Missing derivative dimensions');
    }
    const sampling = proofJSON(bundle, 'sampling', bindings);
    const { events } = sampling;
    assert.ok(Array.isArray(events) && events.length >= 2, 'Missing sampling/interference observation log');
    const times = events.map(event => {
        assert.ok(typeof event?.at === 'string' && typeof event.type === 'string' && event.type.length && event.type === event.type.trim(), 'Invalid sampling event');
        const time = Date.parse(event.at);
        assert.ok(Number.isFinite(time), 'Invalid sampling event timestamp');
        assert.ok(!['interference', 'suspend', 'crash', 'drop'].includes(event.type), 'Recorded infrastructure invalidation');
        return time;
    });
    assert.ok(events[0].type === 'start' && events.at(-1).type === 'complete' &&
        events.slice(1, -1).every(event => event.type !== 'start' && event.type !== 'complete'), 'Sampling log must have unique start and complete endpoints');
    assert.ok(times.every((time, index) => index === 0 || time >= times[index - 1]), 'Sampling events must be chronological');
    assert.ok(times.at(-1) > times[0], 'Sampling must have positive elapsed time');
    assert.equal(sampling.browserBinaryHash, e.browserBinaryHash, 'Browser binary proof mismatch');
    assert.ok(hashPattern.test(e.browserBinaryHash), 'Missing browser binary identity');
    for (const capture of bundle.captures) {
        const record = bundle.index.captures.find(item => item.id === capture.id);
        inspectPng(bundle, record.screenshot);
        if (record.file) {
            assert.ok(capture.rawReference, 'Missing raw artifact reference');
            equal(artifactJSON(bundle, capture.rawReference), Object.fromEntries(Object.entries(capture).filter(([key]) => !['id', 'rawReference'].includes(key))), 'Resolved capture differs from saved raw bytes');
            for (const sample of [...capture.samples, capture.initialOpen]) validateObservation(bundle, capture.id, sample, capture.metadata);
        }
    }
    if (role === 'baseline') return bindings;
    const functional = proofJSON(bundle, 'functional', bindings);
    for (const engine of ['chromium', 'firefox', 'webkit']) {
        const run = functional.runs?.find(item => item.engine === engine);
        assert.ok(run && run.caseCount >= 36 && Array.isArray(run.cases) && run.cases.length === run.caseCount && new Set(run.cases).size === run.caseCount, `Missing final browser case inventory: ${engine}`);
        const tap = artifactBytes(bundle, run.tap).toString('utf8');
        assert.match(tap, new RegExp(`# pass ${run.caseCount}\\b`), 'Missing TAP passing count');
        assert.match(tap, /# fail 0\b/, 'Functional failures');
        assert.ok(!/^not ok /m.test(tap) && !/# (?:SKIP|TODO)\b/i.test(tap), 'Incomplete functional cases');
        assert.equal(run.sourceHash, bundle.index.sourceHash, 'Functional source mismatch');
    }
    validateVisualPairs(bundle, proofJSON(bundle, 'visual', bindings));
    const lifetime = proofJSON(bundle, 'lifecycle', bindings);
    assert.ok(lifetime.cycles >= 3 && lifetime.settledMs >= 0 && typeof lifetime.collectionMethod === 'string' && lifetime.collectionMethod, 'Missing settling/collection lifecycle protocol');
    for (const key of ['views', 'listeners', 'timers', 'detachedEditors', 'pendingJobs']) assert.equal(lifetime.after[key] - lifetime.before[key], 0, `Residual lifecycle resource: ${key}`);
    const structure = proofJSON(bundle, 'structure', bindings);
    assert.ok(structure.unaffectedRowsCompared > 0, 'Missing actual row identity comparisons');
    assert.equal(structure.replacedUnaffectedRows, 0, 'Unaffected row replacement');
    assert.ok(Array.isArray(structure.cloneCallsPerRequest) && structure.cloneCallsPerRequest.length > 0, 'Missing clone observations');
    assert.ok(structure.cloneCallsPerRequest.every(count => count === 1), 'Multiple clones per request');
    assert.ok(structure.selectionFullPayloadModelCalls?.length > 0 && structure.selectionFullPayloadModelCalls.every(count => count === 0), 'Selection hydrates model/full payload');
    equal(Object.keys(structure.closedFactories ?? {}).sort(), CLOSED_FACTORIES, 'Closed creator factory identities mismatch');
    assert.ok(Object.values(structure.closedFactories).every(count => count === 0), 'Closed creator factory mounted eagerly');
    const lazy = proofJSON(bundle, 'lazy-import', bindings);
    for (const key of ['firstUseTransferBytes', 'firstUseEvaluationMs', 'lateImageBytes']) requireNumber(lazy[key], `Missing numerical ${key}; unavailable must be null`);
    assert.ok(lazy.firstUseRequests?.length > 0, 'Missing observed first-use compiled requests');
    for (const capture of bundle.captures.filter(item => item.samples)) assert.ok(capture.startupRequests.every(request => !/\/src\/ui\/generated\/workbench\//.test(request.url)), 'Compiled UI requested before first workbench use');
    validateGeneratedInventory(bundle, proofJSON(bundle, 'build', bindings), bindings);
    const host = proofJSON(bundle, 'host', bindings);
    assert.ok(host.hostVersion && host.hostRevision && host.installCommand && host.nodeModulesCount === 0 && host.localBuildCount === 0 && host.libraryDecks === 77 && host.libraryCovers === 70 && host.readonlyRows > 0 && host.persistedEditAfterReopen === host.requestedEdit && typeof host.requestedEdit === 'string' && host.requestedEdit, 'Missing clean-installed host observations');
    equal(host.pageErrors, [], 'Host page errors');
    const review = proofJSON(bundle, 'source-review', bindings);
    equal(review.unresolvedFindings, [], 'Unresolved source review findings');
    for (const requirement of ['single-controller-store', 'no-state-manager-copy', 'bundle-self-contained', 'pending-source-save-ownership', 'registries-pending-unmigrated', 'canonical-export-unchanged']) {
        const claim = review.claims?.find(item => item.requirement === requirement);
        assert.ok(claim?.citations?.length && claim.conclusion === 'satisfied', `Missing scoped source review: ${requirement}`);
        for (const citation of claim.citations) assert.ok(bindings.files.get(citation.path)?.sha256 === citation.sha256 && Number.isInteger(citation.line) && citation.line > 0, 'Review source citation mismatch');
    }
    assert.ok(Array.isArray(e.platforms) && e.platforms.length, 'Missing native platform availability inventory');
    for (const name of ['Safari', 'Android', 'iOS', 'Safari 14']) {
        const platform = e.platforms.find(item => item.name === name);
        assert.ok(platform && (platform.available === false && typeof platform.reason === 'string' && platform.reason || platform.available === true && platform.artifact), `Missing explicit native availability: ${name}`);
        if (platform.artifact) artifactBytes(bundle, platform.artifact);
    }
    return bindings;
}
export function validateObservation(bundle, tuple, sample, metadata = bundle.captures?.find(capture => capture.id === tuple)?.metadata) {
    assert.ok(metadata?.fixture && metadata.imageReadinessPolicy, 'Missing observation metadata');
    equal(metadata.imageReadinessPolicy, bundle.index.imageReadinessPolicy, 'Observation image policy mismatch');
    validateMeasurementKinds(sample, metadata);
    validateImageReadinessObservation(sample, metadata);
    assert.ok(sample && Array.isArray(sample.network) && sample.requestWindow, 'Missing actual request-start window');
    const { start, end, ids } = sample.requestWindow;
    assert.ok(Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end >= start, 'Invalid request window');
    equal(ids, sample.network.map(request => request.id), 'Request-window IDs mismatch');
    assert.equal(new Set(ids).size, ids.length, 'Repeated request ID counted twice');
    assert.equal(sample.network.length, end - start, 'Incomplete request window');
    sample.network.forEach((request, position) => {
        assert.equal(request.sequence, start + position, 'Request chronology/window mismatch');
        assert.equal(request.state, 'complete', 'Failed/unsettled request');
        assert.ok(Number.isFinite(request.startedAt), 'Missing request initiation time');
        requireNumber(request.encodedDataLength, 'Missing numerical request bytes');
    });
    const transfer = sample.network.some(request => request.encodedDataLength === null) ? null : sample.network.reduce((sum, request) => sum + request.encodedDataLength, 0);
    if (metadata.capabilities?.networkBytes !== false) assert.equal(sample.transferBytes, transfer, 'Transfer total must count each actual request ID once');
    const images = sample.network.filter(request => request.type === 'Image');
    if (metadata.capabilities?.networkBytes !== false) assert.equal(sample.imageBytes, images.some(request => request.encodedDataLength === null) ? null : images.reduce((sum, request) => sum + request.encodedDataLength, 0), 'Image total must count each actual image request ID once');
    verifiedCoverBytes(bundle, tuple, sample);
}
export function verifiedCoverBytes(bundle, tuple, sample) {
    let unavailable = bundle.captures?.find(capture => capture.id === tuple)?.metadata.capabilities?.networkBytes === false;
    let total = 0;
    for (const request of sample.network) {
        if (request.type !== 'Image') continue;
        const pathname = decodeURIComponent(new URL(request.url).pathname).replace(/^\//, '');
        const asset = bundle.evidence.assets.find(item => item.path === pathname);
        if (!asset) {
            assert.ok(!/^(content\/loredecks|assets\/generated\/loredeck-covers)\//.test(pathname), `${tuple}: unknown cover URL`);
            continue;
        }
        assert.ok(request.status >= 200 && request.status < 300, 'Cover request was unsuccessful');
        if (request.encodedDataLength === null) unavailable = true;
        else {
            assert.ok(Number.isFinite(request.encodedDataLength) && request.encodedDataLength >= 0, 'Invalid actual cover transfer');
            total += request.encodedDataLength;
        }
    }
    return unavailable ? null : total;
}
