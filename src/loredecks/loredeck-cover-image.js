import { getAssetSrc, normalizeAssetRef, normalizePassiveAssetPath } from '../theme/runtime-theme.js';
import { observePassiveImageDisconnect, observePassiveImageSize } from '../ui/passive-image-size.js';
import { BUNDLED_COVER_ORIGINALS, BUNDLED_COVER_THUMBNAILS } from './generated/loredeck-cover-thumbnails.js';

const imageBindings = new WeakMap();
const DISCARD_DETACHED_STYLES = Symbol('discard detached cover styles');

export function disposeLoredeckCoverImages(root, mode) {
    if (!root) return;
    imageBindings.get(root)?.(mode);
    for (const img of root.querySelectorAll?.('img') || []) imageBindings.get(img)?.(mode);
}

// Only for permanently replaced subtrees. Regular disposal keeps nodes safe to reuse.
export function discardDetachedLoredeckCoverImages(root) {
    if (root?.isConnected !== false) return;
    disposeLoredeckCoverImages(root, DISCARD_DETACHED_STYLES);
}

function resolveLoredeckAssetPath(pack = {}, assetPath = '') {
    const path = normalizePassiveAssetPath(assetPath);
    if (!path) return '';
    if (/^(?:data:image\/|https?:\/\/|\.\/|content\/|\/user\/files\/)/i.test(path)) return path;
    const manifest = String(pack.manifest || pack.manifestData?.manifest || '').replace(/\\/g, '/').trim();
    const base = manifest.includes('/') ? manifest.replace(/[^/]*$/, '') : '';
    return base ? normalizePassiveAssetPath(`${base}${path}`) : path;
}

export function getLoredeckAssetRef(pack = {}, key = 'cover') {
    const assets = pack.assets && typeof pack.assets === 'object' && !Array.isArray(pack.assets) ? pack.assets : {};
    const manifestAssets = pack.manifestData?.assets && typeof pack.manifestData.assets === 'object' && !Array.isArray(pack.manifestData.assets)
        ? pack.manifestData.assets
        : {};
    const raw = assets[key]
        || manifestAssets[key]
        || (key === 'cover'
            ? assets.deckCover
                || manifestAssets.deckCover
                || pack.assetRefs?.cover
                || pack.coverFile
                || pack.coverPath
                || pack.cover
                || pack.coverImage
            : null);
    const asset = normalizeAssetRef(raw);
    if (!asset) return null;
    const resolvedPath = resolveLoredeckAssetPath(pack, asset.path);
    return resolvedPath ? { ...asset, path: resolvedPath } : null;
}

const variantsByOriginalSrc = new Map(Object.entries(BUNDLED_COVER_THUMBNAILS).map(([path, variants]) => [
    getAssetSrc({ path }),
    variants.filter(variant => variant.width > 0 && variant.height > 0 && variant.bytes > 0)
        .map(variant => ({ ...variant, src: getAssetSrc({ path: variant.path }) }))
        .filter(variant => variant.src)
        .sort((a, b) => a.bytes - b.bytes || a.width - b.width || a.height - b.height),
]));
const intrinsicSizeByOriginalSrc = new Map(Object.entries(BUNDLED_COVER_ORIGINALS).map(([path, size]) => [getAssetSrc({ path }), size]));

function coversBox(variant, box, dpr, fit) {
    if (!(box?.width > 0 && box?.height > 0)) return false;
    const scale = fit === 'contain'
        ? Math.min(box.width / variant.width, box.height / variant.height)
        : Math.max(box.width / variant.width, box.height / variant.height);
    return scale * dpr <= 1;
}

export function getLoredeckCoverSources(pack, { usage = 'detail', box, dpr = 1 } = {}) {
    const cover = getLoredeckAssetRef(pack);
    const originalSrc = getAssetSrc(cover);
    if (usage !== 'list' || !originalSrc) return { src: originalSrc, originalSrc };
    const ratio = Number.isFinite(Number(dpr)) && Number(dpr) > 0 ? Number(dpr) : 1;
    const variant = variantsByOriginalSrc.get(originalSrc)?.find(candidate => coversBox(candidate, box, ratio, cover.fit));
    return { src: variant?.src || originalSrc, originalSrc };
}

export function bindLoredeckCoverImage(visual, img, pack, options = {}) {
    imageBindings.get(img)?.();
    const usage = options.usage === 'list' ? 'list' : 'detail';
    img.loading = usage === 'detail' ? 'eager' : 'lazy';
    img.decoding = 'async';
    const cover = getLoredeckAssetRef(pack);
    const originalSrc = getAssetSrc(cover);
    const intrinsic = intrinsicSizeByOriginalSrc.get(originalSrc);
    const canPreserveIntrinsicRatio = usage === 'list' && intrinsic?.width > 0 && intrinsic?.height > 0
        && globalThis.CSS?.supports?.('aspect-ratio', '1 / 1') === true;
    let restoreIntrinsicStyles = () => {};
    if (canPreserveIntrinsicRatio) {
        const previousRatio = img.style.aspectRatio;
        const previousMinWidth = img.style.minWidth;
        restoreIntrinsicStyles = () => {
            img.style.aspectRatio = previousRatio;
            img.style.minWidth = previousMinWidth;
        };
        // Grid images can overflow their clipped container along the intrinsic
        // axis. Retain the original ratio even when thumbnail rounding differs,
        // preserving that existing crop rather than changing the shared CSS.
        img.style.aspectRatio = `${intrinsic.width} / ${intrinsic.height}`;
        // Until src is chosen, alt text otherwise supplies an unrelated grid
        // min-content width and can inflate the first ResizeObserver delivery.
        img.style.minWidth = '0';
    }
    let active = true;
    let source = '';
    let usingDerivative = false;
    let originalLocked = false;
    let stopSize = () => {};
    let stopDisconnect = () => {};

    function dispose(mode) {
        if (!active) return;
        active = false;
        imageBindings.delete(img);
        img.removeEventListener('error', onError);
        stopSize();
        stopDisconnect();
        if (mode !== DISCARD_DETACHED_STYLES || img.isConnected !== false) restoreIntrinsicStyles();
    }

    function onError() {
        if (!active) return;
        if (usingDerivative) {
            usingDerivative = false;
            originalLocked = true;
            source = originalSrc;
            img.removeAttribute('srcset');
            img.src = originalSrc;
            return;
        }
        dispose();
        options.onOriginalError?.();
    }

    function selectSource({ width, height, dpr }) {
        if (!active || originalLocked || !(width > 0 && height > 0)) return;
        if (source === originalSrc) return;
        const candidates = variantsByOriginalSrc.get(originalSrc);
        const current = candidates?.find(variant => variant.src === source);
        if (current && coversBox(current, { width, height }, dpr, cover?.fit)) return;
        // Older engines cannot retain the original intrinsic grid crop while
        // using rounded thumbnail dimensions. Keep their original image/styles.
        const next = canPreserveIntrinsicRatio
            ? getLoredeckCoverSources(pack, { usage, box: { width, height }, dpr }).src
            : originalSrc;
        if (!next || source === next) return;
        source = next;
        usingDerivative = next !== originalSrc;
        img.src = next;
    }

    imageBindings.set(img, dispose);
    img.addEventListener('error', onError);
    stopDisconnect = observePassiveImageDisconnect(visual, dispose);
    if (usage === 'detail') {
        source = originalSrc;
        if (source) img.src = source;
    } else {
        stopSize = observePassiveImageSize(img, selectSource);
    }
    return dispose;
}
