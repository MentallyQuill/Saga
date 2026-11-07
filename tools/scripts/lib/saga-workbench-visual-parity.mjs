import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { startSagaPerformanceHarness } from './saga-performance-harness.mjs';
import { workbenchVisualStates, creatorVisualStates, task1VisualStates, unavailableVisualMessages } from '../../../tests/browser/workbench-visual-scenarios.mjs';
import { paintedGeometry, verifyImagePairs, compareVisualPixels } from './saga-cover-visual-evidence.mjs';
import { parityRuntimeHash, paritySourceRoot, sha256 as hash } from './saga-parity-provenance.mjs';

const baselineRoot = process.env.SAGA_PARITY_BASELINE_ROOT;
const output = process.env.SAGA_PARITY_VISUAL_OUTPUT;
assert.ok(baselineRoot && output, 'Declare SAGA_PARITY_BASELINE_ROOT and SAGA_PARITY_VISUAL_OUTPUT');
await mkdir(output, { recursive: true });
const protocolFiles = ['tools/scripts/lib/saga-workbench-visual-parity.mjs', 'tools/scripts/lib/saga-cover-visual-evidence.mjs',
    'tools/scripts/lib/saga-performance-harness.mjs', 'tools/scripts/lib/saga-parity-provenance.mjs', 'tools/scripts/serve-visual-smoke.mjs'];
const protocolHashes = async () => Object.fromEntries(await Promise.all(protocolFiles.map(async file => [file, hash(await readFile(file))])));
const sourceRoots = { baseline: path.resolve(baselineRoot), candidate: paritySourceRoot };
const sourceHashes = async () => ({ baseline: await parityRuntimeHash(sourceRoots.baseline), candidate: await parityRuntimeHash(sourceRoots.candidate) });
// Chromium's default compositor produced two byte-exact variants on both
// sources. Use the same software raster for every pair.
const chromiumArgs = ['--disable-gpu'];
const report = { created: new Date().toISOString(), sourceRoots, sourceHashes: await sourceHashes(),
    protocolHashes: await protocolHashes(), fixtureHash: hash(await readFile('tests/browser/performance-fixtures.mjs')), scenarioHash: hash(await readFile('tests/browser/workbench-visual-scenarios.mjs')), chromiumArgs, captures: [] };
const profiles = [{ id: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    { id: 'tablet', viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 },
    { id: 'phone', viewport: { width: 430, height: 820 }, deviceScaleFactor: 3 }];
const states = process.env.SAGA_PARITY_VISUAL_STATES?.split(',') || [...workbenchVisualStates, ...creatorVisualStates, ...task1VisualStates];
const selectedProfiles = profiles.filter(profile => !process.env.SAGA_PARITY_VISUAL_PROFILES || process.env.SAGA_PARITY_VISUAL_PROFILES.split(',').includes(profile.id));
const binaryHashes = new Map();
for (const profile of selectedProfiles) for (const theme of ['default', 'custom']) for (const state of states) {
    const capture = { id: `${profile.id}-${theme}-${state}`, profile, theme, state, sides: {} };
    try {
        for (const side of ['baseline', 'candidate']) {
            const h = await startSagaPerformanceHarness({ ...profile, sourceRoot: sourceRoots[side], chromiumArgs });
            let unblock;
            const sourceResponses = [];
            try {
                const gate = new Promise(resolve => { unblock = resolve; });
                let sourceResponded = false;
                await h.page.route('**/__visual-gate/entries.json', route => {
                    const response = (async () => {
                        if (state === 'error') await h.page.evaluate(() => { window.failVisualPublication = true; });
                        else await gate;
                        await route.fulfill({ contentType: 'application/json', body: '[]' });
                        sourceResponded = true;
                    })();
                    sourceResponses.push(response);
                    return response;
                });
                const prepared = await h.page.evaluate(async options => {
                    const module = await import('/__performance/workbench-visual-scenarios.mjs');
                    return module.prepareVisualScenario(options);
                }, { state, theme });
                await h.page.evaluate(async () => (await import('/__performance/workbench-visual-scenarios.mjs')).stabilizeVisual());
                if (state.startsWith('library-')) {
                    // Opening the Library starts thumbnail requests after its
                    // card layout settles. Capture once that work has drained.
                    await h.page.waitForLoadState('networkidle');
                    await h.page.evaluate(async () => (await import('/__performance/workbench-visual-scenarios.mjs')).stabilizeVisual());
                }
                for (const file of prepared.requiredCustomIcons || []) {
                    assert.ok(await h.page.evaluate(file => Array.from(document.querySelectorAll('#saga-lore-panel img')).some(image => {
                        const rect = image.getBoundingClientRect();
                        return image.currentSrc.endsWith(`/${file}`) && image.complete && image.naturalWidth > 0 && rect.width > 0 && rect.height > 0;
                    }), file), `Rendered custom icon must actually decode and remain visible: ${file}`);
                }
                if (state in unavailableVisualMessages) {
                    const presentation = h.page.locator('.saga-lore-workbench-view > .saga-lore-empty');
                    assert.equal(await presentation.textContent(), unavailableVisualMessages[state]);
                    assert.ok(await presentation.isVisible(), `Real ${state} copy must be visible in the screenshot`);
                    assert.equal(sourceResponses.length, 1, `Exactly one real source request for ${state}`);
                    assert.equal(sourceResponded, state === 'error', 'Loading remains gated and the error follows a released source response');
                    prepared.sourcePresentation = { text: unavailableVisualMessages[state], sourceRequests: sourceResponses.length, sourceResponded };
                }
                if (prepared.creatorAnchor) {
                    prepared.creatorContent = await h.page.evaluate(async anchor => (await import('/__performance/workbench-visual-scenarios.mjs')).inspectVisibleCreatorContent(anchor), prepared.creatorAnchor);
                    assert.ok(prepared.creatorContent.visible, `Opened Creator content must be inside its visible scroll pane: ${prepared.creatorAnchor}`);
                }
                const geometry = await h.page.evaluate(async root => (await import('/__performance/workbench-visual-scenarios.mjs')).captureVisualGeometry(root), prepared.root);
                const prefix = path.join(output, `${capture.id}-${side}`);
                const png = await h.page.screenshot({ path: `${prefix}.png`, fullPage: true, caret: 'hide' });
                await writeFile(`${prefix}.json`, JSON.stringify(geometry, null, 2));
                if (!binaryHashes.has(h.executablePath)) binaryHashes.set(h.executablePath, hash(await readFile(h.executablePath)));
                const paneScroll = state.startsWith('library-') ? await h.page.evaluate(async () => (await import('/__performance/workbench-visual-scenarios.mjs')).inspectDeferredLibraryImages()) : null;
                capture.sides[side] = { prepared, browser: h.browserVersion, executablePath: h.executablePath, binaryHash: binaryHashes.get(h.executablePath), screenshot: `${prefix}.png`, screenshotHash: hash(png), geometryHash: hash(JSON.stringify(paintedGeometry(geometry))), paneScroll, errors: h.errors };
                assert.deepEqual(h.errors, [], `${capture.id} ${side} page errors`);
            } finally { unblock?.(); await Promise.allSettled(sourceResponses); await h.stop(); }
        }
        const baseline = await sharp(capture.sides.baseline.screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const candidate = await sharp(capture.sides.candidate.screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.deepEqual(candidate.info, baseline.info);
        const before = JSON.parse(await readFile(path.join(output, `${capture.id}-baseline.json`))), after = JSON.parse(await readFile(path.join(output, `${capture.id}-candidate.json`)));
        const images = await verifyImagePairs(before, after, { baselineRoot: sourceRoots.baseline, candidateRoot: sourceRoots.candidate, dpr: profile.deviceScaleFactor });
        const { diff, ...comparison } = compareVisualPixels(baseline.data, candidate.data, baseline.info, images, profile.deviceScaleFactor);
        await writeFile(path.join(output, `${capture.id}-image-evidence.json`), JSON.stringify(images, null, 2));
        capture.comparison = { ...comparison, geometryEqual: capture.sides.baseline.geometryHash === capture.sides.candidate.geometryHash };
        if (comparison.changedPixels) await sharp(diff, { raw: baseline.info }).png().toFile(path.join(output, `${capture.id}-difference.png`));
        if (state.startsWith('library-')) {
            const a = capture.sides.baseline.paneScroll, b = capture.sides.candidate.paneScroll;
            assert.equal(b.available, a.available);
            if (a.available) {
                assert.deepEqual(b.before, a.before, 'Original Library pane scroll geometry before deferred images');
                assert.deepEqual(b.after, a.after, 'Library scroll/overflow unchanged after actual pane scrolling');
                assert.ok(a.after.top > 0 && a.images.length > 0 && b.images.length === a.images.length, 'Real pane scroll reveals deferred covers');
                for (const side of [a, b]) assert.ok(side.images.every(image => image.complete && image.naturalWidth > 0), 'Deferred visible covers decode after actual pane scroll');
                assert.deepEqual(b.images.map(image => image.rect), a.images.map(image => image.rect), 'Revealed deferred cover geometry');
            }
        }
        console.log(`${capture.id}: ${comparison.changedPixels} changed pixels (${comparison.unexplainedPixels} unexplained), geometry ${capture.comparison.geometryEqual ? 'equal' : 'DIFF'}`);
    } catch (error) { capture.error = error.stack; console.error(`${capture.id}: ${error.message}`); }
    report.captures.push(capture); await writeFile(path.join(output, 'index.json'), JSON.stringify(report, null, 2));
}
report.finalSourceHashes = await sourceHashes();
report.finalFixtureHash = hash(await readFile('tests/browser/performance-fixtures.mjs'));
report.finalScenarioHash = hash(await readFile('tests/browser/workbench-visual-scenarios.mjs'));
report.finalProtocolHashes = await protocolHashes();
await writeFile(path.join(output, 'index.json'), JSON.stringify(report, null, 2));
assert.deepEqual(report.finalSourceHashes, report.sourceHashes, 'Source stayed unchanged through the complete matrix');
assert.equal(report.finalFixtureHash, report.fixtureHash); assert.equal(report.finalScenarioHash, report.scenarioHash);
assert.deepEqual(report.finalProtocolHashes, report.protocolHashes, 'Visual collector and helpers stayed unchanged through the complete matrix');
assert.equal(report.captures.length, states.length * selectedProfiles.length * 2);
assert.ok(report.captures.every(capture => !capture.error && capture.comparison.unexplainedPixels === 0 && capture.comparison.geometryEqual), 'Paired parity requires exact painted geometry/non-image pixels and only verified derivative content attribution');
