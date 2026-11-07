export const SAGA_IMAGE_READINESS_POLICY = Object.freeze({
    id: 'boundary-io-clipped-decoded-v1', root: 'viewport', rootMargin: '0px', threshold: 0,
    boundarySelector: '.saga-loredeck-library-hierarchy-list > .saga-loredeck-library-deck-card, .saga-loredeck-library-hierarchy-list > .saga-loredeck-library-inline-folder-row',
    coverSelector: '.saga-loredeck-library-deck-card img, .saga-loredeck-library-folder-cover-strip img',
    deckCoverSelector: '.saga-loredeck-library-deck-card img',
});

// Self-contained: Playwright serializes this function into the browser realm.
// It never queries geometry/styles or observes a skipped boundary's descendants.
export function installSagaPerformanceImageReadiness(options = {}) {
    const host = globalThis.window;
    const slot = '__sagaPerformanceImageReadiness';
    const factory = options.observerFactory || ((callback, settings) => new IntersectionObserver(callback, settings));
    const unsupported = [];
    if (!options.observerFactory && typeof globalThis.IntersectionObserver !== 'function') unsupported.push('IntersectionObserver');
    if (typeof globalThis.MutationObserver !== 'function') unsupported.push('MutationObserver');
    if (typeof globalThis.HTMLImageElement?.prototype?.decode !== 'function') unsupported.push('HTMLImageElement.decode');
    if (unsupported.length) { const error = new Error(`Nonforcing image readiness unsupported: ${unsupported.join(', ')}`); error.code = 'SAGA_IMAGE_READINESS_UNSUPPORTED'; throw error; }
    host[slot]?.dispose('replaced');
    const boundarySelector = options.boundarySelector || '.saga-loredeck-library-hierarchy-list > .saga-loredeck-library-deck-card, .saga-loredeck-library-hierarchy-list > .saga-loredeck-library-inline-folder-row';
    const coverSelector = options.coverSelector || '.saga-loredeck-library-deck-card img, .saga-loredeck-library-folder-cover-strip img';
    const deckCoverSelector = options.deckCoverSelector || '.saga-loredeck-library-deck-card img';
    const timeoutMs = options.timeoutMs ?? 30000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Image readiness timeout must be finite and positive');
    const images = new Map(); const roots = new Map(); const innerTargets = new Set(); const frames = new Map();
    let active = true; let failure = null; let dirty = true; let generation = 0; let epoch = 0; let nextId = 0;
    let outer = null; let inner = null; let onRootEntries = null; let onImageEntries = null; let mutationObserver = null; let timeout = null; let waiting = null;
    let pagehideListening = false;
    const positive = entry => Boolean(entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0);
    const sourceKey = image => `${image.currentSrc || ''}\u0000${image.getAttribute('src') || ''}\u0000${image.getAttribute('srcset') || ''}\u0000${image.getAttribute('sizes') || ''}`;
    function invalidate(record) { record.token++; record.key = null; record.decodedKey = null; record.decoding = false; record.error = null; }
    function onMutations(records) {
        if (!active || !records.length) return;
        generation++; dirty = true;
        for (const item of records) if (item.type === 'attributes' && ['src', 'srcset', 'sizes'].includes(item.attributeName)) {
            const record = images.get(item.target); if (record) invalidate(record);
        }
    }
    function syncImages() {
        const connected = new Set([...document.querySelectorAll('img')].filter(image => image.isConnected));
        for (const [image, record] of images) if (!connected.has(image)) { invalidate(record); inner?.unobserve(image); innerTargets.delete(image); images.delete(image); }
        roots.clear();
        for (const image of connected) {
            let record = images.get(image);
            if (!record) { record = { image, id: ++nextId, token: 0, key: null, decodedKey: null, decoding: false, error: null }; images.set(image, record); }
            record.owner = image.closest(boundarySelector); record.intersecting = null;
            if (record.owner) {
                let root = roots.get(record.owner);
                if (!root) { root = { target: record.owner, intersecting: null, images: new Set() }; roots.set(record.owner, root); }
                root.images.add(image);
            }
        }
    }
    function refreshObservationEpoch() {
        if (!active) return;
        outer?.disconnect(); inner?.disconnect(); innerTargets.clear();
        syncImages(); dirty = false;
        const ownerEpoch = ++epoch;
        onImageEntries = entries => {
            if (!active || ownerEpoch !== epoch) return;
            for (const entry of entries) {
                const record = images.get(entry.target);
                if (record && innerTargets.has(entry.target) && (!record.owner || roots.get(record.owner)?.intersecting === true)) record.intersecting = positive(entry);
            }
        };
        inner = factory(onImageEntries, { root: null, rootMargin: '0px', threshold: 0 });
        onRootEntries = entries => {
            if (!active || ownerEpoch !== epoch) return;
            for (const entry of entries) {
                const root = roots.get(entry.target); if (!root) continue;
                root.intersecting = positive(entry);
                for (const image of root.images) {
                    const record = images.get(image); if (!record) continue;
                    if (root.intersecting && !innerTargets.has(image)) { record.intersecting = null; innerTargets.add(image); inner.observe(image); }
                    else if (!root.intersecting) { inner.unobserve(image); innerTargets.delete(image); record.intersecting = false; }
                }
            }
        };
        outer = factory(onRootEntries, { root: null, rootMargin: '0px', threshold: 0 });
        for (const root of roots.keys()) outer.observe(root);
        for (const record of images.values()) if (!record.owner) { innerTargets.add(record.image); inner.observe(record.image); }
    }
    function drainPending() {
        if (!active) return;
        onMutations(mutationObserver?.takeRecords() || []);
        // Deliver pending entries through the same epoch-guarded handlers.
        // Roots must run first because they can register child-image targets.
        const rootEntries = outer?.takeRecords() || [];
        if (rootEntries.length) onRootEntries(rootEntries);
        const imageEntries = inner?.takeRecords() || [];
        if (imageEntries.length) onImageEntries(imageEntries);
    }
    function state(startDecodes = false) {
        if (!active) return { ready: false, disposed: true, eligibleCount: 0, decodedCount: 0, visibleCoverCount: 0, visibleDeckCoverCount: 0, unknownRoots: 0, unknownImages: 0, images: [] };
        if (dirty) refreshObservationEpoch();
        const unknownRoots = [...roots.values()].filter(root => root.intersecting === null).length;
        let unknownImages = 0; let decodedCount = 0; let visibleCoverCount = 0; let visibleDeckCoverCount = 0;
        const eligible = [];
        for (const record of images.values()) {
            const image = record.image;
            if (!image.isConnected || (record.owner && roots.get(record.owner)?.intersecting !== true)) continue;
            if (record.intersecting === null) { unknownImages++; continue; }
            if (!record.intersecting) continue;
            const key = sourceKey(image);
            if (record.key !== key) { invalidate(record); record.key = key; }
            if (record.error) throw record.error;
            const loaded = Boolean(image.currentSrc && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
            if (startDecodes && loaded && record.decodedKey !== key && !record.decoding) {
                record.decoding = true;
                const token = ++record.token;
                let invoked = false;
                Promise.resolve().then(() => {
                    if (!active || !image.isConnected || images.get(image) !== record || record.token !== token || sourceKey(image) !== key || record.intersecting !== true || (record.owner && roots.get(record.owner)?.intersecting !== true)) return;
                    invoked = true;
                    return image.decode();
                }).then(() => {
                    if (active && images.get(image) === record && record.token === token && sourceKey(image) === key) { if (invoked) record.decodedKey = key; record.decoding = false; }
                }, error => {
                    if (active && images.get(image) === record && record.token === token && sourceKey(image) === key) { record.error = new Error(`Visible image decode failed: ${image.currentSrc}: ${error?.message || error}`); record.decoding = false; }
                });
            }
            const decoded = loaded && record.decodedKey === key;
            if (decoded) decodedCount++;
            const cover = image.matches(coverSelector); const deckCover = image.matches(deckCoverSelector);
            if (cover) visibleCoverCount++; if (deckCover) visibleDeckCoverCount++;
            eligible.push({ id: record.id, source: image.currentSrc || '', key, decoded, cover, deckCover });
        }
        const ready = unknownRoots === 0 && unknownImages === 0 && decodedCount === eligible.length && (!options.requireVisibleCover || visibleDeckCoverCount > 0);
        return { ready, supported: true, policy: 'boundary-io-clipped-decoded-v1', ownerId: options.ownerId || '', generation, epoch, unknownRoots, unknownImages, eligibleCount: eligible.length, decodedCount, visibleCoverCount, visibleDeckCoverCount, images: eligible };
    }
    function nextFrame() {
        return new Promise((resolve, reject) => {
            if (!active) return reject(failure || new Error('Image readiness disposed'));
            const id = requestAnimationFrame(() => { frames.delete(id); resolve(); }); frames.set(id, reject);
        });
    }
    function dispose(reason = 'disposed') {
        if (!active) return;
        active = false; failure ||= reason instanceof Error ? reason : new Error(`Image readiness ${reason}`);
        outer?.disconnect(); inner?.disconnect(); mutationObserver?.disconnect(); outer = inner = mutationObserver = onRootEntries = onImageEntries = null;
        if (timeout !== null) { clearTimeout(timeout); timeout = null; }
        for (const [id, reject] of frames) { cancelAnimationFrame(id); reject(failure); } frames.clear();
        for (const record of images.values()) invalidate(record);
        images.clear(); roots.clear(); innerTargets.clear();
        if (pagehideListening) { host.removeEventListener('pagehide', onPagehide); pagehideListening = false; }
        if (host[slot] === handle) delete host[slot];
    }
    const onPagehide = () => dispose('page closed');
    const handle = {
        ownerId: options.ownerId || '',
        readySnapshot: () => state(false), refreshObservationEpoch, drainPending, dispose,
        diagnostics: () => ({ activeObservers: Number(Boolean(outer)) + Number(Boolean(inner)) + Number(Boolean(mutationObserver)), retainedNodes: images.size + roots.size, pendingFrames: frames.size, pendingTimers: Number(timeout !== null), pagehideListening }),
        waitForReady() {
            if (waiting) return waiting;
            waiting = (async () => {
                let candidate = null;
                timeout = setTimeout(() => dispose(new Error('Image readiness timed out')), timeoutMs);
                try {
                    while (active) {
                        drainPending(); const snapshot = state(true);
                        if (snapshot.ready) {
                            const signature = JSON.stringify(snapshot.images.map(image => [image.id, image.key]));
                            if (candidate && candidate.signature === signature && candidate.generation === generation && epoch > candidate.epoch) return { ...snapshot, initialReadyEpoch: candidate.epoch, sealedEpoch: epoch };
                            candidate = { signature, generation, epoch };
                            await nextFrame(); await nextFrame();
                            drainPending(); refreshObservationEpoch();
                        } else await nextFrame();
                    }
                    throw failure || new Error('Image readiness disposed');
                } catch (error) { dispose(error); throw error; }
                finally { if (timeout !== null) { clearTimeout(timeout); timeout = null; } }
            })();
            return waiting;
        },
    };
    try {
        mutationObserver = new MutationObserver(onMutations);
        mutationObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'sizes', 'loading', 'style', 'class', 'hidden'] });
        host.addEventListener('pagehide', onPagehide); pagehideListening = true;
        host[slot] = handle; refreshObservationEpoch();
    } catch (error) { dispose(error); throw error; }
    return { ownerId: options.ownerId || '', policy: 'boundary-io-clipped-decoded-v1', supported: true };
}
