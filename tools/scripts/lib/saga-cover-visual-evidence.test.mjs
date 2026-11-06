import assert from 'node:assert/strict';
import { test } from 'node:test';
import { paintedGeometry, compareVisualPixels, verifyImagePairs } from './saga-cover-visual-evidence.mjs';

test('every non-image pixel is exact even when known cover content changes', () => {
    const before = Buffer.from([0, 0, 0, 255, 0, 0, 0, 255]);
    const after = Buffer.from([10, 0, 0, 255, 1, 0, 0, 255]);
    const image = { index: 0, visible: true, verifiedDerivative: true, before: { clip: { left: 0, top: 0, right: 1, bottom: 1 } } };
    const result = compareVisualPixels(before, after, { width: 2, height: 1 }, [image], 1);
    assert.equal(result.changedPixels, 2); assert.equal(result.unexplainedPixels, 1);
    assert.equal(result.perImage[0].changedPixels, 1);
    assert.deepEqual([...result.diff], [10, 0, 0, 255, 1, 0, 0, 255]);
});

test('unknown or unverified image content never exempts changed pixels', () => {
    const before = Buffer.from([0, 0, 0, 255]), after = Buffer.from([1, 0, 0, 255]);
    const result = compareVisualPixels(before, after, { width: 1, height: 1 }, [{ visible: true, verifiedDerivative: false }], 1);
    assert.equal(result.unexplainedPixels, 1);
});

test('only IMG intrinsic extents are diagnostic; actual image offsets and all parent scrolling remain exact', () => {
    const a = [{ tag: 'IMG', rect: [0, 0, 52, 52], scroll: [0, 0, 52, 52], image: {} }, { tag: 'DIV', scroll: [0, 0, 100, 200] }];
    const b = structuredClone(a); b[0].scroll = [0, 0, 80, 120];
    assert.deepEqual(paintedGeometry(a), paintedGeometry(b));
    b[0].scroll[0] = 1; assert.notDeepEqual(paintedGeometry(a), paintedGeometry(b));
    b[0].scroll[0] = 0; b[1].scroll[3] = 201; assert.notDeepEqual(paintedGeometry(a), paintedGeometry(b));
});

test('an unknown image transformation or a visible undecoded image fails before pixel attribution', async () => {
    const image = { src: 'http://localhost/content/unknown.png', currentSrc: '', complete: true, naturalWidth: 100, naturalHeight: 100,
        clip: { left: 0, top: 0, right: 10, bottom: 10 }, alt: 'Cover' };
    const a = { tag: 'IMG', image, rect: [0, 0, 10, 10], scroll: [0, 0, 10, 10], styles: { objectFit: 'cover', objectPosition: '50% 50%' } };
    const b = structuredClone(a); b.image.src = 'http://localhost/assets/unknown.webp';
    await assert.rejects(verifyImagePairs([a], [b], { dpr: 1 }), /Unknown image transformation/);
    b.image.naturalWidth = 0;
    await assert.rejects(verifyImagePairs([a], [b], { dpr: 1 }), /must decode/);
});
