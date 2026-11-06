import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BUNDLED_COVER_ORIGINALS, BUNDLED_COVER_THUMBNAILS } from '../../../src/loredecks/generated/loredeck-cover-thumbnails.js';
import { sha256 } from './saga-parity-provenance.mjs';

const localPath = url => url ? decodeURIComponent(new URL(url).pathname).replace(/^\//, '') : null;
export function paintedGeometry(rows) {
    return rows.map(({ image, ...row }) => row.tag === 'IMG'
        // IMG's own intrinsic content extents are diagnostic, not a scroll pane.
        // Preserve every other scroll owner and the IMG's actual scroll offsets.
        ? { ...row, scroll: row.scroll.slice(0, 2) } : row);
}

export async function verifyImagePairs(baseline, candidate, { baselineRoot, candidateRoot, dpr }) {
    assert.equal(baseline.length, candidate.length, 'Corresponding painted DOM node count');
    const evidence = [];
    for (let index = 0; index < baseline.length; index++) {
        const a = baseline[index], b = candidate[index];
        if (!a.image) continue;
        assert.ok(b.image, `IMG correspondence at ${index}`);
        const before = a.image, after = b.image;
        const visible = before.clip.right > before.clip.left && before.clip.bottom > before.clip.top;
        assert.deepEqual(after.clip, before.clip, `Painted image clipping at ${index}`);
        assert.equal(after.alt, before.alt, `Image alt at ${index}`);
        if (visible) for (const image of [before, after]) assert.ok(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0, `Visible image ${index} must decode: ${image.currentSrc || image.src}`);
        const original = localPath(before.currentSrc || before.src), selected = localPath(after.currentSrc || after.src);
        const item = { index, visible, original, selected, before, after, rect: a.rect, fit: a.styles.objectFit, focal: a.styles.objectPosition,
            intrinsicScroll: { before: a.scroll, after: b.scroll }, verifiedDerivative: false };
        if (!selected) {
            assert.equal(visible, false, 'Only genuinely offscreen images may remain deferred without a source');
            assert.ok(BUNDLED_COVER_ORIGINALS[original], `Known deferred cover ${original}`);
            item.deferred = true; evidence.push(item); continue;
        }
        if (original !== selected) {
            const metadata = BUNDLED_COVER_ORIGINALS[original];
            const variant = BUNDLED_COVER_THUMBNAILS[original]?.find(entry => entry.path === selected);
            assert.ok(metadata && variant, `Unknown image transformation ${original} -> ${selected}`);
            const [originalBytes, archivedBytes, derivativeBytes] = await Promise.all([
                readFile(path.join(candidateRoot, original)), readFile(path.join(baselineRoot, original)), readFile(path.join(candidateRoot, selected)),
            ]);
            assert.equal(sha256(originalBytes), metadata.sha256, 'Canonical original hash');
            assert.equal(sha256(archivedBytes), metadata.sha256, 'Archived original remains identical');
            assert.equal(sha256(derivativeBytes), variant.sha256, 'Known deterministic derivative hash');
            if (visible) {
                const scale = a.styles.objectFit === 'contain' ? Math.min(a.rect[2] / variant.width, a.rect[3] / variant.height)
                    : Math.max(a.rect[2] / variant.width, a.rect[3] / variant.height);
                assert.ok(scale * dpr <= 1, `Undersized derivative at DPR${dpr}: ${selected}`);
                assert.equal(after.naturalWidth, variant.width); assert.equal(after.naturalHeight, variant.height);
            }
            assert.equal(after.inlineAspectRatio, `${metadata.width} / ${metadata.height}`, 'Original intrinsic ratio retained for the existing crop');
            assert.equal(after.inlineMinWidth, '0px', 'Managed intrinsic sizing is the documented Task3 transform');
            Object.assign(item, { verifiedDerivative: true, originalHash: metadata.sha256, derivativeHash: variant.sha256,
                originalSize: [metadata.width, metadata.height], derivativeSize: [variant.width, variant.height], physicalBox: [a.rect[2] * dpr, a.rect[3] * dpr] });
        }
        evidence.push(item);
    }
    return evidence;
}

// Analyze every screenshot pixel, preserving full raw images/diff. Attribute
// only content pixels inside verified known derivative IMG support; all other
// pixels remain exact. Error metrics describe the reviewed resampling, never a
// blanket pass threshold or an exemption for unknown image changes.
export function compareVisualPixels(baseline, candidate, info, images, dpr) {
    const transformed = images.filter(image => image.visible && image.verifiedDerivative).map(image => ({ ...image,
        support: [Math.floor(image.before.clip.left * dpr), Math.floor(image.before.clip.top * dpr), Math.ceil(image.before.clip.right * dpr), Math.ceil(image.before.clip.bottom * dpr)],
        pixels: 0, changedPixels: 0, absoluteError: 0, squaredError: 0, maxChannelDelta: 0 }));
    const diff = Buffer.alloc(baseline.length);
    let changedPixels = 0, unexplainedPixels = 0, maxChannelDelta = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        const offset = (y * info.width + x) * 4;
        let max = 0, absolute = 0, squared = 0;
        for (let c = 0; c < 3; c++) { const delta = Math.abs(candidate[offset + c] - baseline[offset + c]); max = Math.max(max, delta); absolute += delta; squared += delta * delta; diff[offset + c] = delta; }
        diff[offset + 3] = 255; maxChannelDelta = Math.max(maxChannelDelta, max);
        const image = transformed.find(item => x >= item.support[0] && y >= item.support[1] && x < item.support[2] && y < item.support[3]);
        if (image) { image.pixels++; image.absoluteError += absolute; image.squaredError += squared; image.maxChannelDelta = Math.max(image.maxChannelDelta, max); if (max) image.changedPixels++; }
        if (max) { changedPixels++; if (!image) unexplainedPixels++; }
    }
    return { diff, changedPixels, unexplainedPixels, maxChannelDelta, perImage: transformed.map(image => ({
        index: image.index, original: image.original, selected: image.selected, originalHash: image.originalHash, derivativeHash: image.derivativeHash,
        rect: image.rect, support: image.support, fit: image.fit, focal: image.focal, physicalBox: image.physicalBox,
        originalSize: image.originalSize, derivativeSize: image.derivativeSize, changedPixels: image.changedPixels, pixels: image.pixels,
        maxChannelDelta: image.maxChannelDelta, meanAbsoluteRgbError: image.pixels ? image.absoluteError / (image.pixels * 3) : 0,
        rgbRmse: image.pixels ? Math.sqrt(image.squaredError / (image.pixels * 3)) : 0,
    })) };
}
