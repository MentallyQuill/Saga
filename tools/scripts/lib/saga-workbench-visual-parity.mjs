import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { startSagaPerformanceHarness } from './saga-performance-harness.mjs';
import { workbenchVisualStates, creatorVisualStates, task1VisualStates } from '../../../tests/browser/workbench-visual-scenarios.mjs';

const baselineRoot = process.env.SAGA_PARITY_BASELINE_ROOT;
const output = process.env.SAGA_PARITY_VISUAL_OUTPUT;
assert.ok(baselineRoot && output, 'Declare SAGA_PARITY_BASELINE_ROOT and SAGA_PARITY_VISUAL_OUTPUT');
await mkdir(output, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function sourceHash(root) {
    const files = (await Promise.all(['src', 'styles'].map(async dir => (await readdir(path.join(root, dir), { recursive: true, withFileTypes: true })).filter(item => item.isFile()).map(item => path.relative(root, path.join(item.parentPath, item.name)).replaceAll('\\', '/'))))).flat().sort();
    return hash(Buffer.concat(await Promise.all(files.map(async file => Buffer.concat([Buffer.from(file), await readFile(path.join(root, file))])))));
}
const report = { created: new Date().toISOString(), sourceHashes: { baseline: await sourceHash(baselineRoot), candidate: await sourceHash(process.cwd()) },
    fixtureHash: hash(await readFile('tests/browser/performance-fixtures.mjs')), scenarioHash: hash(await readFile('tests/browser/workbench-visual-scenarios.mjs')), captures: [] };
const profiles = [{ id: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    { id: 'tablet', viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 },
    { id: 'phone', viewport: { width: 430, height: 820 }, deviceScaleFactor: 3 }];
const states = process.env.SAGA_PARITY_VISUAL_STATES?.split(',') || [...workbenchVisualStates, ...creatorVisualStates, ...task1VisualStates];
const selectedProfiles = profiles.filter(profile => !process.env.SAGA_PARITY_VISUAL_PROFILES || process.env.SAGA_PARITY_VISUAL_PROFILES.split(',').includes(profile.id));
for (const profile of selectedProfiles) for (const theme of ['default', 'custom']) for (const state of states) {
    const capture = { id: `${profile.id}-${theme}-${state}`, profile, theme, state, sides: {} };
    try {
        for (const side of ['baseline', 'candidate']) {
            const h = await startSagaPerformanceHarness({ ...profile, sourceRoot: side === 'baseline' ? baselineRoot : undefined });
            let unblock;
            try {
                const gate = new Promise(resolve => { unblock = resolve; });
                await h.page.route('**/__visual-gate/entries.json', async route => { await gate; await route.fulfill({ contentType: 'application/json', body: '[]' }); });
                const prepared = await h.page.evaluate(async options => {
                    const module = await import('/__performance/workbench-visual-scenarios.mjs');
                    return module.prepareVisualScenario(options);
                }, { state, theme });
                await h.page.evaluate(async () => (await import('/__performance/workbench-visual-scenarios.mjs')).stabilizeVisual());
                const geometry = await h.page.evaluate(async root => (await import('/__performance/workbench-visual-scenarios.mjs')).captureVisualGeometry(root), prepared.root);
                const prefix = path.join(output, `${capture.id}-${side}`);
                const png = await h.page.screenshot({ path: `${prefix}.png`, fullPage: true, caret: 'hide' });
                await writeFile(`${prefix}.json`, JSON.stringify(geometry, null, 2));
                capture.sides[side] = { prepared, browser: h.browserVersion, executablePath: h.executablePath, screenshot: `${prefix}.png`, screenshotHash: hash(png), geometryHash: hash(JSON.stringify(geometry)), errors: h.errors };
                assert.deepEqual(h.errors, [], `${capture.id} ${side} page errors`);
            } finally { unblock?.(); await h.stop(); }
        }
        const baseline = await sharp(capture.sides.baseline.screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const candidate = await sharp(capture.sides.candidate.screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.deepEqual(candidate.info, baseline.info);
        let changedPixels = 0, maxChannelDelta = 0;
        const diff = Buffer.alloc(baseline.data.length);
        for (let i = 0; i < baseline.data.length; i += 4) {
            let changed = false;
            for (let c = 0; c < 3; c++) { const delta = Math.abs(candidate.data[i + c] - baseline.data[i + c]); maxChannelDelta = Math.max(maxChannelDelta, delta); changed ||= delta > 0; diff[i + c] = delta; }
            if (changed) changedPixels++; diff[i + 3] = 255;
        }
        capture.comparison = { changedPixels, maxChannelDelta, geometryEqual: capture.sides.baseline.geometryHash === capture.sides.candidate.geometryHash };
        if (changedPixels) await sharp(diff, { raw: baseline.info }).png().toFile(path.join(output, `${capture.id}-difference.png`));
        console.log(`${capture.id}: ${changedPixels} changed pixels, geometry ${capture.comparison.geometryEqual ? 'equal' : 'DIFF'}`);
    } catch (error) { capture.error = error.stack; console.error(`${capture.id}: ${error.message}`); }
    report.captures.push(capture); await writeFile(path.join(output, 'index.json'), JSON.stringify(report, null, 2));
}
assert.ok(report.captures.every(capture => !capture.error && capture.comparison.changedPixels === 0 && capture.comparison.geometryEqual), 'Paired parity requires exact geometry and zero unexplained pixels; inspect differences, never blanket-threshold them');
