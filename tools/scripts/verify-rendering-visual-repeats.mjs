import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { paintedGeometry } from './lib/saga-cover-visual-evidence.mjs';
import { sha256 } from './lib/saga-rendering-evidence.mjs';

const sides = ['baseline', 'candidate'];
const hashPattern = /^[a-f0-9]{64}$/;

async function readCapture(directory, stem, screenshotHash, geometryHash) {
    const bytes = await readFile(path.join(directory, stem + '.png'));
    assert.equal(sha256(bytes), screenshotHash, 'Screenshot hash mismatch for ' + stem);
    const geometry = JSON.parse(await readFile(path.join(directory, stem + '.json'), 'utf8'));
    assert.equal(sha256(JSON.stringify(paintedGeometry(geometry))), geometryHash, 'Geometry hash mismatch for ' + stem);
    return sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/**
 * Document exact same-source capture variation for a sealed matrix.
 * This narrow proof requires one historical outlier and two agreeing repeats
 * per side. It is independent of the strict acceptance evaluator.
 */
export async function verifyRenderingVisualRepeats(matrixDirectory, repeatDirectory, expectedRepeatHash) {
    assert.match(expectedRepeatHash, hashPattern, 'Provide the sealed repeat index SHA-256');
    const [matrixBytes, repeatBytes] = await Promise.all([
        readFile(path.join(matrixDirectory, 'index.json')),
        readFile(path.join(repeatDirectory, 'index.json')),
    ]);
    assert.equal(sha256(repeatBytes), expectedRepeatHash, 'Repeat index hash mismatch');
    const matrix = JSON.parse(matrixBytes), repeats = JSON.parse(repeatBytes);
    assert.equal(sha256(matrixBytes), repeats.originalIndexSha256, 'Repeat evidence refers to a different matrix');
    assert.deepEqual(repeats.sourceHashes, matrix.sourceHashes, 'Repeat evidence refers to different builds');
    for (const side of sides) assert.match(matrix.sourceHashes[side], hashPattern);
    const failures = matrix.captures.filter(capture => capture.comparison.unexplainedPixels > 0);
    assert.ok(failures.length > 0, 'No differing pairs to attribute');
    assert.equal(new Set(failures.map(pair => pair.id)).size, failures.length, 'Duplicate historical visual pair');
    const byId = new Map(repeats.cases.map(capture => [capture.id, capture]));
    assert.equal(byId.size, repeats.cases.length, 'Duplicate repeat case');
    assert.equal(byId.size, failures.length, 'Repeat evidence must cover every differing pair');

    const cases = [];
    for (const pair of failures) {
        const { id, comparison } = pair;
        assert.match(id, /^[a-z0-9-]+$/, 'Invalid visual pair ID');
        assert.equal(comparison.geometryEqual, true, 'Historical geometry differs for ' + id);
        const geometryHash = pair.sides.baseline.geometryHash;
        assert.match(geometryHash, hashPattern);
        assert.equal(pair.sides.candidate.geometryHash, geometryHash, 'Historical geometry hashes differ for ' + id);
        const evidence = byId.get(id);
        assert.ok(Array.isArray(evidence?.captures) && evidence.captures.length === 4, 'Need two fresh captures per side for ' + id);
        const historical = [];
        const fresh = [];
        for (const side of sides) {
            const original = pair.sides[side];
            historical.push(await readCapture(matrixDirectory, id + '-' + side, original.screenshotHash, geometryHash));
            for (const repeat of [0, 1]) {
                const matches = evidence.captures.filter(capture => capture.side === side && capture.repeat === repeat);
                assert.equal(matches.length, 1, 'Missing or duplicate repeat for ' + id + ' ' + side);
                const [capture] = matches;
                const stem = id + '-' + side + '-' + repeat;
                assert.equal(capture.file, stem + '.png');
                assert.equal(capture.metadata, stem + '.json');
                assert.equal(capture.geometry, geometryHash, 'Repeat geometry differs for ' + stem);
                assert.deepEqual(capture.prepared, original.prepared, 'Repeat scenario differs for ' + stem);
                fresh.push(await readCapture(repeatDirectory, stem, capture.screenshotHash, geometryHash));
            }
        }
        const reference = fresh[0];
        for (const png of [...historical, ...fresh]) assert.deepEqual(png.info, reference.info, 'Image format differs for ' + id);
        assert.equal(reference.info.channels, 4);
        assert.ok(fresh.every(png => png.data.equals(reference.data)), 'Fresh cross-build pixels differ for ' + id);
        const outliers = sides.filter((side, i) => !historical[i].data.equals(reference.data));
        assert.equal(outliers.length, 1, 'Need exactly one archived outlier for ' + id);
        const outlier = historical[sides.indexOf(outliers[0])].data;
        // The other historical image equals all four repeats byte for byte.
        // Thus the same-source comparison repeats every signed RGB delta
        // at its original coordinate, without a mask or tolerance.
        let pixels = 0;
        for (let offset = 0; offset < outlier.length; offset += 4) {
            assert.equal(outlier[offset + 3], reference.data[offset + 3], 'Alpha differs for ' + id);
            if (outlier[offset] !== reference.data[offset] || outlier[offset + 1] !== reference.data[offset + 1]
                || outlier[offset + 2] !== reference.data[offset + 2]) pixels++;
        }
        assert.equal(pixels, comparison.unexplainedPixels, 'Repeat evidence does not explain the full exact difference for ' + id);
        cases.push({ id, outlier: outliers[0], exactSameSourcePixels: pixels });
    }
    return {
        matrixIndexSha256: sha256(matrixBytes),
        repeatIndexSha256: expectedRepeatHash,
        sourceHashes: matrix.sourceHashes,
        cases,
        exactSameSourcePixels: cases.reduce((total, item) => total + item.exactSameSourcePixels, 0),
    };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [matrix, repeats, seal, ...extra] = process.argv.slice(2);
    if (!matrix || !repeats || !seal || extra.length) {
        console.error('Usage: node tools/scripts/verify-rendering-visual-repeats.mjs MATRIX_DIR REPEAT_DIR REPEAT_INDEX_SHA256');
        process.exitCode = 2;
    } else {
        console.log(JSON.stringify(await verifyRenderingVisualRepeats(matrix, repeats, seal), null, 2));
    }
}
