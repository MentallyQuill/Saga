function cloneJsonFallback(value) {
    if (!value || typeof value !== 'object') return null;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_) {
        return null;
    }
}

function callOrFallback(fn, fallback, ...args) {
    return typeof fn === 'function' ? fn(...args) : fallback;
}

function normalizePackId(value = '') {
    return String(value || '').trim();
}

function getRegistryCount(registry = {}, counter = null) {
    if (typeof counter === 'function') return counter(registry);
    if (!registry || typeof registry !== 'object') return 0;
    if (Array.isArray(registry)) return registry.length;
    if (registry.items && typeof registry.items === 'object') return Object.keys(registry.items).length;
    return Object.keys(registry).length;
}

export function getLoredeckCreatorJobGeneratedPackId(job = {}) {
    return normalizePackId(job?.generatedPackId || job?.brief?.packId || '');
}

export function hasLoredeckCreatorGeneratedPackProgressPayload(pack = {}, deps = {}) {
    if (!pack || typeof pack !== 'object') return false;
    if (pack.manifestData) return true;
    if (Object.keys(pack.entryOverrides || {}).length) return true;
    if (getRegistryCount(pack.tagRegistry, deps.getTagRegistryCount)) return true;
    if (getRegistryCount(pack.timelineRegistry, deps.getTimelineRegistryCount)) return true;
    return false;
}

export function createLoredeckCreatorGeneratedPackCacheController(deps = {}) {
    const payloadCache = deps.payloadCache instanceof Map ? deps.payloadCache : new Map();
    const hydrationRequests = deps.hydrationRequests instanceof Map ? deps.hydrationRequests : new Map();
    const cloneJson = value => typeof deps.cloneJson === 'function'
        ? deps.cloneJson(value)
        : cloneJsonFallback(value);
    const getLoredeckDefinition = packId => callOrFallback(deps.getLoredeckDefinition, null, packId);
    const hydrateCachedPayload = pack => callOrFallback(deps.hydrateCachedPayload, pack, pack);
    const hydratePayload = pack => callOrFallback(deps.hydratePayload, Promise.resolve(null), pack);
    const getTagRegistryCount = registry => getRegistryCount(registry, deps.getTagRegistryCount);
    const getTimelineRegistryCount = registry => getRegistryCount(registry, deps.getTimelineRegistryCount);
    const refreshCreatorWorkbench = options => {
        if (typeof deps.refreshCreatorWorkbench === 'function') deps.refreshCreatorWorkbench(options);
    };
    const refreshPanelBody = options => {
        if (typeof deps.refreshPanelBody === 'function') deps.refreshPanelBody(options);
    };
    const warn = (message, error) => {
        if (typeof deps.warn === 'function') deps.warn(message, error);
        else console.warn(message, error);
    };

    function hasProgressPayload(pack = {}) {
        return hasLoredeckCreatorGeneratedPackProgressPayload(pack, {
            getTagRegistryCount,
            getTimelineRegistryCount,
        });
    }

    function cachePack(pack = {}) {
        const id = normalizePackId(pack?.packId);
        if (!id) return false;
        payloadCache.set(id, cloneJson(pack));
        return true;
    }

    function clearPackCaches(packId = '', options = {}) {
        const id = normalizePackId(packId);
        if (!id) return false;
        payloadCache.delete(id);
        hydrationRequests.delete(id);
        if (typeof deps.clearRelatedPackCaches === 'function') {
            deps.clearRelatedPackCaches(id, options);
        }
        return true;
    }

    function getGeneratedPackDefinition(packId = '') {
        const id = normalizePackId(packId);
        if (!id) return null;
        const base = getLoredeckDefinition(id);
        if (!base) {
            payloadCache.delete(id);
            return null;
        }
        const hydrated = hydrateCachedPayload(base || { packId: id });
        if (hydrated?.payloadFile && hasProgressPayload(hydrated)) {
            cachePack(hydrated);
            return hydrated;
        }
        const cached = payloadCache.get(id) || null;
        if (cached) {
            const baseRevision = Math.floor(Number(base?.revision) || 0);
            const cachedRevision = Math.floor(Number(cached.revision) || 0);
            if (!baseRevision || cachedRevision >= baseRevision) {
                return cloneJson({
                    ...(base || {}),
                    ...cached,
                    packId: id,
                    id,
                    payloadFile: base?.payloadFile || cached.payloadFile,
                });
            }
            payloadCache.delete(id);
        }
        return base;
    }

    function maybeHydrateGeneratedPack(cached = {}, options = {}) {
        const packId = normalizePackId(cached?.generatedPackId);
        if (!packId || hydrationRequests.has(packId)) return false;
        if (payloadCache.has(packId)) return false;
        const base = getLoredeckDefinition(packId);
        if (!base?.payloadFile) return false;
        const current = getGeneratedPackDefinition(packId);
        if (hasProgressPayload(current)) return false;
        const request = Promise.resolve(hydratePayload(base))
            .then(pack => {
                if (pack?.packId) {
                    cachePack(pack);
                    if (options.refresh !== false) {
                        refreshCreatorWorkbench({ preserveScroll: true });
                        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
                    }
                }
                return pack;
            })
            .catch(error => {
                warn('[Saga] Deck Maker generated Loredeck payload hydration failed:', error);
                return null;
            })
            .finally(() => {
                hydrationRequests.delete(packId);
            });
        hydrationRequests.set(packId, request);
        return true;
    }

    return {
        clearPackCaches,
        getGeneratedPackDefinition,
        maybeHydrateGeneratedPack,
        getJobGeneratedPackId: getLoredeckCreatorJobGeneratedPackId,
        hasProgressPayload,
        getCachedPack: packId => payloadCache.get(normalizePackId(packId)) || null,
        getHydrationRequest: packId => hydrationRequests.get(normalizePackId(packId)) || null,
    };
}
