import { writeFile } from 'node:fs/promises';
import { evaluateRenderingPerformance } from './lib/saga-performance-report.mjs';
import { loadRenderingBundle } from './lib/saga-rendering-bundle-loader.mjs';

const [baselineDirectory, candidateDirectory, outputFile, ...extra] = process.argv.slice(2);
if (!baselineDirectory || !candidateDirectory || extra.length) {
    console.error('Usage: node tools/scripts/evaluate-rendering-performance.mjs BASELINE_BUNDLE CANDIDATE_BUNDLE [OUTPUT.json]');
    process.exitCode = 2;
} else {
    let result;
    try {
        const baseline = await loadRenderingBundle(baselineDirectory);
        const candidate = await loadRenderingBundle(candidateDirectory);
        result = evaluateRenderingPerformance(baseline, candidate);
    } catch (error) { result = { status: 'fail', findings: [{ metric: 'artifact-loader', status: 'fail', reason: error.message }] }; }
    const json = `${JSON.stringify(result, null, 2)}\n`;
    if (outputFile) await writeFile(outputFile, json);
    console.log(json);
    process.exitCode = result.status === 'pass' ? 0 : result.status === 'inconclusive' ? 2 : 1;
}
