import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { startSagaPerformanceHarness } from './saga-performance-harness.mjs';
import { paritySourceRoot, sha256 } from './saga-parity-provenance.mjs';
import { paintedGeometry } from './saga-cover-visual-evidence.mjs';

export function rasterDifference(before, after, { width, height }) {
    assert.equal(before.length, width * height * 4); assert.equal(after.length, before.length);
    const diff = Buffer.alloc(before.length); const deltaCounts = {};
    let changedPixels = 0, maxChannelDelta = 0, bounds = null;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4; let max = 0;
        for (let channel = 0; channel < 3; channel++) { const delta = Math.abs(before[offset + channel] - after[offset + channel]); diff[offset + channel] = delta; max = Math.max(max, delta); }
        diff[offset + 3] = 255;
        if (!max) continue;
        changedPixels++; maxChannelDelta = Math.max(maxChannelDelta, max); deltaCounts[max] = (deltaCounts[max] || 0) + 1;
        bounds = bounds ? [Math.min(bounds[0], x), Math.min(bounds[1], y), Math.max(bounds[2], x), Math.max(bounds[3], y)] : [x, y, x, y];
    }
    return { diff, changedPixels, maxChannelDelta, deltaCounts, changedBoundsInclusive: bounds };
}

// Deliberately diagnostic. No pixel threshold or automatic noise exemption.
// Every repeat starts a fresh actual browser, matching the paired visual runner.
export async function runRasterDiscriminator({ baselineRoot, candidateRoot = paritySourceRoot, output }) {
    assert.ok(baselineRoot && output, 'Declare baseline source and raster diagnostic output');
    await mkdir(output, { recursive: true });
    const report = { status: 'diagnostic only; review required; no pixels exempted', captures: [], comparisons: [],
        probeHash: sha256(await readFile(new URL('./saga-workbench-raster-discriminator.mjs', import.meta.url))),
        scenarioHash: sha256(await readFile('tests/browser/workbench-visual-scenarios.mjs')),
        fixtureHash: sha256(await readFile('tests/browser/performance-fixtures.mjs')) };
    for (const side of ['baseline', 'candidate']) for (let repeat = 0; repeat < 3; repeat++) {
        const sourceRoot = side === 'baseline' ? baselineRoot : candidateRoot;
        const h = await startSagaPerformanceHarness({ sourceRoot, viewport: { width: 430, height: 820 }, deviceScaleFactor: 3 });
        let release;
        const responses = [];
        try {
            const gate = new Promise(resolve => { release = resolve; });
            await h.page.route('**/__visual-gate/entries.json', route => {
                const response = gate.then(() => route.fulfill({ contentType: 'application/json', body: '[]' }));
                responses.push(response); return response;
            });
            const prepared = await h.page.evaluate(async () => (await import('/__performance/workbench-visual-scenarios.mjs')).prepareVisualScenario({ state: 'loading', theme: 'custom' }));
            await h.page.evaluate(async () => (await import('/__performance/workbench-visual-scenarios.mjs')).stabilizeVisual());
            const geometry = await h.page.evaluate(async root => (await import('/__performance/workbench-visual-scenarios.mjs')).captureVisualGeometry(root), prepared.root);
            const animations = await h.page.evaluate(() => document.getAnimations().map(animation => ({
                name: animation.animationName || '', playState: animation.playState, currentTime: animation.currentTime,
                timing: animation.effect?.getComputedTiming?.(),
            })));
            const id = `${side}-${repeat}`, prefix = path.join(output, id);
            const png = await h.page.screenshot({ path: `${prefix}.png`, fullPage: true, caret: 'hide' });
            await writeFile(`${prefix}.json`, JSON.stringify({ geometry, animations }, null, 2));
            let viewHash = null;
            try { viewHash = sha256(await readFile(path.join(sourceRoot, 'src/ui/generated/workbench/view.js'))); }
            catch (error) { if (error.code !== 'ENOENT' || side !== 'baseline') throw error; }
            report.captures.push({ id, side, repeat, prepared, sourceRoot, viewHash, styleHash: sha256(await readFile(path.join(sourceRoot, 'styles/saga.css'))),
                workbenchHash: sha256(await readFile(path.join(sourceRoot, 'src/loredecks/loredeck-workbench-panel.js'))),
                browser: h.browserVersion, browserHash: sha256(await readFile(h.executablePath)), executablePath: h.executablePath,
                screenshot: `${prefix}.png`, screenshotHash: sha256(png), geometryHash: sha256(JSON.stringify(paintedGeometry(geometry))), animations, errors: [...h.errors] });
            assert.deepEqual(h.errors, []);
            await writeFile(path.join(output, 'index.json'), JSON.stringify(report, null, 2));
        } finally { release?.(); await Promise.allSettled(responses); await h.stop(); }
    }
    const pairs = [
        ['baseline-0', 'baseline-1'], ['baseline-0', 'baseline-2'], ['baseline-1', 'baseline-2'],
        ['candidate-0', 'candidate-1'], ['candidate-0', 'candidate-2'], ['candidate-1', 'candidate-2'],
        ['baseline-0', 'candidate-0'], ['baseline-1', 'candidate-1'], ['baseline-2', 'candidate-2'],
    ];
    for (const [beforeId, afterId] of pairs) {
        const a = report.captures.find(capture => capture.id === beforeId), b = report.captures.find(capture => capture.id === afterId);
        const before = await sharp(a.screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const after = await sharp(b.screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.deepEqual(after.info, before.info);
        const { diff, ...metrics } = rasterDifference(before.data, after.data, before.info);
        const file = path.join(output, `${beforeId}-vs-${afterId}-difference.png`);
        await sharp(diff, { raw: before.info }).png().toFile(file);
        report.comparisons.push({ beforeId, afterId, sameSource: a.side === b.side, geometryEqual: a.geometryHash === b.geometryHash, ...metrics, difference: file });
    }
    await writeFile(path.join(output, 'index.json'), JSON.stringify(report, null, 2));
    for (const side of ['baseline', 'candidate']) assert.equal(new Set(report.captures.filter(capture => capture.side === side).map(capture => JSON.stringify([capture.workbenchHash, capture.viewHash, capture.styleHash, capture.browserHash]))).size, 1, `${side} source/browser identity stays fixed across independent repeats`);
    assert.ok(report.comparisons.every(pair => pair.geometryEqual), 'Any geometric difference needs investigation before raster-noise attribution');
    return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const result = await runRasterDiscriminator({ baselineRoot: process.env.SAGA_PARITY_BASELINE_ROOT,
        candidateRoot: process.env.SAGA_PARITY_CANDIDATE_ROOT, output: process.env.SAGA_PARITY_RASTER_OUTPUT });
    console.log(JSON.stringify(result.comparisons, null, 2));
}
