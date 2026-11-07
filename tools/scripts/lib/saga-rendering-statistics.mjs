import { createHash } from 'node:crypto';

export const BOOTSTRAP_REPLICATES = 20_000;
export function statistic(values, kind = 'median') {
    const sorted = [...values].sort((a, b) => a - b);
    if (!sorted.length || sorted.some(value => !Number.isFinite(value))) return null;
    return kind === 'p95' ? sorted[Math.ceil(sorted.length * .95) - 1]
        : (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
}
export function seededRandom(tuple, metric, side) {
    let state = createHash('sha256').update(`task9-v1|20261106|${tuple}|${metric}|${side}`).digest().readUInt32LE(0) || 1;
    return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 2 ** 32; };
}
export function resample(values, random, blockPairs = null) {
    const result = [];
    if (blockPairs === null) {
        for (let i = 0; i < values.length; i++) result.push(values[Math.floor(random() * values.length)]);
    } else {
        // Circular blocks of consecutive, opposite-direction interaction pairs.
        const pairs = values.length / 2;
        while (result.length < values.length) {
            const start = Math.floor(random() * pairs);
            for (let offset = 0; offset < blockPairs && result.length < values.length; offset++) {
                const pair = ((start + offset) % pairs) * 2;
                result.push(values[pair], values[pair + 1]);
            }
        }
    }
    return result;
}
const interval = values => {
    const sorted = [...values].sort((a, b) => a - b);
    return [sorted[499], sorted[19_499]];
};
export function bootstrapComparison(baseline, candidate, { tuple, metric, kind, statisticKind, blockPairs = null }) {
    const summary = values => ({ count: values.length, statistic: statistic(values, statisticKind), min: Math.min(...values), max: Math.max(...values) });
    if ([...baseline, ...candidate].some(value => value === null || !Number.isFinite(value))) {
        const availableSummary = values => values.every(Number.isFinite) ? summary(values) : { count: values.length, statistic: null };
        return { available: false, reason: 'Required numerical observations unavailable', baseline: availableSummary(baseline), candidate: availableSummary(candidate), interval: null };
    }
    const before = summary(baseline), after = summary(candidate);
    // Algebraic form avoids 1 - .8 falling just below the exact 20% boundary.
    const effect = (b, c) => kind === 'gain' ? b > 0 ? (b - c) / b : null : kind === 'excess' ? c - b - Math.max(.05 * b, 2) : c - b;
    const point = effect(before.statistic, after.statistic);
    const randomBaseline = seededRandom(tuple, metric, 'baseline'), randomCandidate = seededRandom(tuple, metric, 'candidate');
    const effects = [], baselineStatistics = [];
    for (let run = 0; run < BOOTSTRAP_REPLICATES; run++) {
        const b = statistic(resample(baseline, randomBaseline, blockPairs), statisticKind);
        const c = statistic(resample(candidate, randomCandidate, blockPairs), statisticKind);
        const value = effect(b, c);
        if (value === null || !Number.isFinite(value)) return { available: false, reason: 'Nonpositive bootstrap baseline denominator', baseline: before, candidate: after, interval: null };
        baselineStatistics.push(b); effects.push(value);
    }
    return { available: true, baseline: { ...before, interval: interval(baselineStatistics) }, candidate: after, point, interval: interval(effects), blockPairs, replicates: BOOTSTRAP_REPLICATES };
}
