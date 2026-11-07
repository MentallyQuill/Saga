// Shared passive image layout/lifetime observation. There is no image preflight:
// source selection happens only after the browser delivers a nonzero layout box.
const subscriptions = new Map();
let sizeTargetCount = 0;
let resizeObserver = null;
let cleanupObserver = null;
let mediaQuery = null;
let listeningForSize = false;
let fallbackFrame = null;
let lastDpr = 1;
let pruneScheduled = false;

function currentDpr() {
    const value = Number(globalThis.window?.devicePixelRatio);
    return Number.isFinite(value) && value > 0 ? value : 1;
}

function reportSize(element, record, box) {
    const width = Number(box?.width) || 0;
    const height = Number(box?.height) || 0;
    record.box = { width, height };
    if (width <= 0 || height <= 0 || !element.isConnected) return;
    const size = { width, height, dpr: currentDpr() };
    for (const callback of [...record.sizes]) callback(size);
}

function removeMediaQuery() {
    if (!mediaQuery) return;
    if (mediaQuery.removeEventListener) mediaQuery.removeEventListener('change', onDprChange);
    else mediaQuery.removeListener?.(onDprChange);
    mediaQuery = null;
}

function watchDpr() {
    removeMediaQuery();
    mediaQuery = globalThis.window?.matchMedia?.(`(resolution: ${currentDpr()}dppx)`) || null;
    if (mediaQuery?.addEventListener) mediaQuery.addEventListener('change', onDprChange);
    else mediaQuery?.addListener?.(onDprChange);
}

function onDprChange() {
    const next = currentDpr();
    if (next === lastDpr) return;
    lastDpr = next;
    watchDpr();
    for (const [element, record] of subscriptions) {
        if (record.sizes.size && record.box) reportSize(element, record, record.box);
    }
}

function onWindowResize() {
    onDprChange();
    if (resizeObserver) return;
    for (const [element, record] of subscriptions) {
        if (record.sizes.size) reportSize(element, record, element.getBoundingClientRect());
    }
}

function stopUnusedObservers() {
    if (sizeTargetCount === 0) {
        resizeObserver?.disconnect();
        resizeObserver = null;
        if (listeningForSize) globalThis.window?.removeEventListener('resize', onWindowResize);
        listeningForSize = false;
        removeMediaQuery();
        if (fallbackFrame !== null) globalThis.cancelAnimationFrame?.(fallbackFrame);
        fallbackFrame = null;
    }
    if (!subscriptions.size) {
        cleanupObserver?.disconnect();
        cleanupObserver = null;
    }
}

function pruneDisconnected() {
    for (const [element, record] of subscriptions) {
        if (element.isConnected) continue;
        subscriptions.delete(element);
        if (record.sizes.size) {
            sizeTargetCount--;
            resizeObserver?.unobserve(element);
            record.sizes.clear();
        }
        const callbacks = [...record.disconnects];
        record.disconnects.clear();
        for (const callback of callbacks) callback();
    }
    stopUnusedObservers();
}

function getRecord(element) {
    let record = subscriptions.get(element);
    if (record) return record;
    record = { sizes: new Set(), disconnects: new Set(), box: null };
    subscriptions.set(element, record);
    const Observer = globalThis.MutationObserver;
    const target = globalThis.document?.documentElement;
    if (!cleanupObserver && Observer && target) {
        cleanupObserver = new Observer(records => {
            if (records.some(item => item.removedNodes?.length)) pruneDisconnected();
        });
        cleanupObserver.observe(target, { childList: true, subtree: true });
    }
    // Construction and synchronous attachment finish before this check. A card
    // abandoned by a canceled render must not remain strongly referenced.
    if (!pruneScheduled) {
        pruneScheduled = true;
        queueMicrotask(() => {
            pruneScheduled = false;
            pruneDisconnected();
        });
    }
    return record;
}

function release(element, record) {
    if (!record.sizes.size && !record.disconnects.size && subscriptions.get(element) === record) subscriptions.delete(element);
    stopUnusedObservers();
}

export function observePassiveImageDisconnect(element, onDisconnect) {
    const record = getRecord(element);
    record.disconnects.add(onDisconnect);
    let active = true;
    return () => {
        if (!active) return;
        active = false;
        if (!record.disconnects.delete(onDisconnect)) return;
        release(element, record);
    };
}

export function observePassiveImageSize(element, onSize) {
    const record = getRecord(element);
    const first = !record.sizes.size;
    record.sizes.add(onSize);
    if (first) sizeTargetCount++;
    if (!listeningForSize) {
        listeningForSize = true;
        lastDpr = currentDpr();
        globalThis.window?.addEventListener('resize', onWindowResize);
        watchDpr();
    }
    if (!resizeObserver && globalThis.ResizeObserver) {
        resizeObserver = new globalThis.ResizeObserver(entries => {
            for (const entry of entries) {
                const current = subscriptions.get(entry.target);
                if (current) reportSize(entry.target, current, entry.contentRect);
            }
        });
    }
    if (resizeObserver && first) resizeObserver.observe(element);
    else if (!resizeObserver && fallbackFrame === null) {
        fallbackFrame = globalThis.requestAnimationFrame?.(() => {
            fallbackFrame = null;
            onWindowResize();
        }) ?? null;
    }
    let active = true;
    return () => {
        if (!active) return;
        active = false;
        if (!record.sizes.delete(onSize)) return;
        if (!record.sizes.size) {
            sizeTargetCount--;
            resizeObserver?.unobserve(element);
        }
        release(element, record);
    };
}
