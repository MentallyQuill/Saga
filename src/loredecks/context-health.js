/**
 * Timeline and Context Pack Health helpers for Saga Loredecks.
 */

import { normalizeLoreEntry } from '../lorecards/lore-matrix.js';
import {
    addHealthIssue,
    cleanHealthNumber,
    cleanHealthString,
    clonePlainObject,
    isPlainObject,
    normalizeHealthIdList,
} from './loredeck-health-core.js';

function parseIsoDateSortKey(value = '') {
    const match = cleanHealthString(value, 80).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const epoch = Date.UTC(year, month - 1, day);
    const check = new Date(epoch);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null;
    return Math.floor(epoch / 86400000);
}

function normalizeTimelineHealthDateRange(value = {}) {
    const input = isPlainObject(value) ? value : {};
    return {
        from: cleanHealthString(input.from || input.start || input.validFrom, 80),
        to: cleanHealthString(input.to || input.end || input.validTo, 80),
    };
}

function getTimelineRegistryRef(manifest = {}) {
    if (!isPlainObject(manifest)) return '';
    const registries = isPlainObject(manifest.registries) ? manifest.registries : {};
    const refs = [
        registries.timeline,
        registries.context,
        manifest.timeline,
        isPlainObject(manifest.context) ? manifest.context.timeline : '',
        manifest.contextIndex,
    ];
    for (const ref of refs) {
        const cleaned = cleanHealthString(ref, 400);
        if (cleaned) return cleaned;
    }
    return '';
}

function getTimelineRegistryWindowList(registry = {}) {
    if (!isPlainObject(registry)) return [];
    return [
        ...(Array.isArray(registry.windows) ? registry.windows : []),
        ...(Array.isArray(registry.arcs) ? registry.arcs : []),
        ...(Array.isArray(registry.phases) ? registry.phases : []),
    ];
}

function mergeTimelineArrayById(sourceItems = [], customItems = [], disabledIds = []) {
    const disabled = new Set(normalizeHealthIdList(disabledIds));
    const map = new Map();
    for (const raw of Array.isArray(sourceItems) ? sourceItems : []) {
        if (!isPlainObject(raw)) continue;
        const id = cleanHealthString(raw.id, 180);
        if (!id || disabled.has(id)) continue;
        map.set(id, clonePlainObject(raw) || { ...raw, id });
    }
    for (const raw of Array.isArray(customItems) ? customItems : []) {
        if (!isPlainObject(raw)) continue;
        const id = cleanHealthString(raw.id, 180);
        if (!id || disabled.has(id)) continue;
        map.set(id, clonePlainObject({ ...raw, id }) || { ...raw, id });
    }
    return Array.from(map.values());
}

export function mergeLoredeckTimelineRegistries(sourceRegistry = null, customRegistry = null) {
    const source = isPlainObject(sourceRegistry) ? sourceRegistry : {};
    const custom = isPlainObject(customRegistry) ? customRegistry : {};
    const hasSource = Object.keys(source).length > 0;
    const hasCustom = Object.keys(custom).length > 0;
    if (!hasSource && !hasCustom) return null;

    const sourceBase = clonePlainObject(source) || {};
    delete sourceBase.anchors;
    delete sourceBase.windows;
    delete sourceBase.arcs;
    delete sourceBase.phases;

    const disabledAnchorIds = normalizeHealthIdList(custom.disabledAnchorIds || custom.disabledAnchors || []);
    const disabledWindowIds = normalizeHealthIdList(custom.disabledWindowIds || custom.disabledWindows || []);
    const merged = {
        ...sourceBase,
        schemaVersion: cleanHealthNumber(custom.schemaVersion) || cleanHealthNumber(source.schemaVersion) || 1,
        timelineMode: cleanHealthString(custom.timelineMode || source.timelineMode || 'hybrid', 80),
        defaultContextType: cleanHealthString(custom.defaultContextType || source.defaultContextType || '', 80),
        sortKeyScale: cleanHealthString(custom.sortKeyScale || source.sortKeyScale || 'pack_local', 160),
        summary: cleanHealthString(custom.summary || source.summary || source.description || '', 1000),
        axes: Array.isArray(custom.axes) && custom.axes.length
            ? (clonePlainObject(custom.axes) || [])
            : (Array.isArray(source.axes) ? (clonePlainObject(source.axes) || []) : []),
        anchors: mergeTimelineArrayById(source.anchors, custom.anchors, disabledAnchorIds),
        windows: mergeTimelineArrayById(getTimelineRegistryWindowList(source), getTimelineRegistryWindowList(custom), disabledWindowIds),
    };
    if (disabledAnchorIds.length) merged.disabledAnchorIds = disabledAnchorIds;
    if (disabledWindowIds.length) merged.disabledWindowIds = disabledWindowIds;
    return merged;
}

function normalizeTimelineHealthAnchor(raw = {}, packId = '', index = 0) {
    if (!isPlainObject(raw)) return null;
    const id = cleanHealthString(raw.id || `${packId || 'pack'}.anchor_${index + 1}`, 180);
    if (!id) return null;
    return {
        id,
        label: cleanHealthString(raw.label || raw.title || id, 240),
        sortKey: cleanHealthNumber(raw.sortKey) ?? index + 1,
        dateRange: normalizeTimelineHealthDateRange(raw.dateRange || raw.date || raw.canonTiming),
        arc: cleanHealthString(raw.arc, 180),
        phase: cleanHealthString(raw.phase, 180),
        season: cleanHealthString(raw.season, 80),
        episode: cleanHealthString(raw.episode, 80),
        chapter: cleanHealthString(raw.chapter, 80),
        issue: cleanHealthString(raw.issue, 80),
        quest: cleanHealthString(raw.quest, 180),
        gameStage: cleanHealthString(raw.gameStage, 180),
    };
}

function normalizeTimelineHealthWindow(raw = {}, packId = '', index = 0) {
    if (!isPlainObject(raw)) return null;
    const id = cleanHealthString(raw.id || `${packId || 'pack'}.window_${index + 1}`, 180);
    if (!id) return null;
    return {
        id,
        label: cleanHealthString(raw.label || raw.title || id, 240),
        anchorFrom: cleanHealthString(raw.anchorFrom || raw.from || raw.validFromAnchor, 180),
        anchorTo: cleanHealthString(raw.anchorTo || raw.to || raw.validToAnchor, 180),
        sortKeyFrom: cleanHealthNumber(raw.sortKeyFrom),
        sortKeyTo: cleanHealthNumber(raw.sortKeyTo),
        dateRange: normalizeTimelineHealthDateRange(raw.dateRange || raw.date),
    };
}

export function normalizeTimelineRegistryForHealth(raw = {}, packId = '') {
    const input = isPlainObject(raw) ? raw : {};
    const anchors = Array.isArray(input.anchors)
        ? input.anchors.map((anchor, index) => normalizeTimelineHealthAnchor(anchor, packId, index)).filter(Boolean)
        : [];
    const windows = [
        ...(Array.isArray(input.windows) ? input.windows : []),
        ...(Array.isArray(input.arcs) ? input.arcs : []),
        ...(Array.isArray(input.phases) ? input.phases : []),
    ].map((window, index) => normalizeTimelineHealthWindow(window, packId, index)).filter(Boolean);
    return {
        sortKeyScale: cleanHealthString(input.sortKeyScale, 160),
        anchors,
        windows,
    };
}

export function createTimelineHealthIndex(timeline = {}) {
    const anchorById = new Map();
    const duplicateAnchorIds = new Set();
    for (const anchor of timeline.anchors || []) {
        if (!anchor?.id) continue;
        if (anchorById.has(anchor.id)) duplicateAnchorIds.add(anchor.id);
        else anchorById.set(anchor.id, anchor);
    }
    return {
        ...timeline,
        anchorById,
        duplicateAnchorIds,
    };
}

function getAnchorSortKey(timeline = {}, anchorId = '') {
    const anchor = timeline.anchorById?.get(cleanHealthString(anchorId, 180));
    const number = cleanHealthNumber(anchor?.sortKey);
    return number === null ? null : number;
}

function getAnchorRangeEndSortKey(timeline = {}, anchorId = '') {
    const anchor = timeline.anchorById?.get(cleanHealthString(anchorId, 180));
    return parseIsoDateSortKey(anchor?.dateRange?.to || anchor?.dateRange?.from || '') ?? getAnchorSortKey(timeline, anchorId);
}

function addContextHealthIssue(health, severity, code, message, extra = {}) {
    if (code === 'broken_anchor_reference') health.summary.brokenAnchorReferenceCount += 1;
    if (code === 'invalid_context_window') health.summary.invalidContextWindowCount += 1;
    if (code === 'unmatchable_context_gate') health.summary.unmatchableContextGateCount += 1;
    addHealthIssue(health, severity, code, message, extra);
}

function addTimelineDensificationIssue(health, code, message, extra = {}) {
    health.summary.timelineDensificationSuggestionCount = (Number(health.summary.timelineDensificationSuggestionCount) || 0) + 1;
    addHealthIssue(health, 'suggestion', code, message, {
        policy: 'candidate_quality_not_alias_sprawl',
        ...extra,
    });
}

export function analyzeTimelineWindowHealth(health, timeline = {}) {
    for (const anchorId of timeline.duplicateAnchorIds || []) {
        addContextHealthIssue(health, 'warning', 'duplicate_timeline_anchor_id', `Timeline defines duplicate anchor id: ${anchorId}.`, {
            anchorId,
            timelineRef: timeline.timelineRef,
        });
    }

    for (const window of timeline.windows || []) {
        const missingAnchors = [
            window.anchorFrom && !timeline.anchorById.has(window.anchorFrom) ? window.anchorFrom : '',
            window.anchorTo && !timeline.anchorById.has(window.anchorTo) ? window.anchorTo : '',
        ].filter(Boolean);
        if (missingAnchors.length) {
            addContextHealthIssue(health, 'warning', 'broken_anchor_reference', `Timeline window ${window.id} references unknown anchor${missingAnchors.length === 1 ? '' : 's'}: ${missingAnchors.join(', ')}.`, {
                anchorIds: missingAnchors,
                contextField: 'timelineWindow',
                timelineWindowId: window.id,
                timelineRef: timeline.timelineRef,
            });
        }

        const fromSort = window.sortKeyFrom ?? getAnchorSortKey(timeline, window.anchorFrom);
        const toSort = window.sortKeyTo ?? getAnchorSortKey(timeline, window.anchorTo);
        if (fromSort !== null && toSort !== null && fromSort > toSort) {
            addContextHealthIssue(health, 'warning', 'invalid_context_window', `Timeline window ${window.id} starts after it ends.`, {
                timelineWindowId: window.id,
                anchorFrom: window.anchorFrom,
                anchorTo: window.anchorTo,
                sortKeyFrom: fromSort,
                sortKeyTo: toSort,
                timelineRef: timeline.timelineRef,
            });
        }
    }
}

export function analyzeTimelineDateDerivedSortKeys(health, timeline = {}) {
    if (timeline.sortKeyScale !== 'date-derived-day') return;

    for (const anchor of timeline.anchors || []) {
        const expected = parseIsoDateSortKey(anchor.dateRange?.from || '');
        if (expected === null) continue;
        if (Number(anchor.sortKey) !== expected) {
            addContextHealthIssue(health, 'warning', 'timeline_anchor_sortkey_mismatch', `Timeline anchor ${anchor.id} sortKey should match dateRange.from for date-derived-day timelines.`, {
                anchorId: anchor.id,
                sortKey: anchor.sortKey,
                expectedSortKey: expected,
                timelineRef: timeline.timelineRef,
            });
        }
    }

    for (const window of timeline.windows || []) {
        const expectedFrom = getAnchorSortKey(timeline, window.anchorFrom);
        const expectedTo = getAnchorRangeEndSortKey(timeline, window.anchorTo);
        if (expectedFrom !== null && Number(window.sortKeyFrom) !== expectedFrom) {
            addContextHealthIssue(health, 'warning', 'timeline_window_sortkey_mismatch', `Timeline window ${window.id} sortKeyFrom should match its start anchor for date-derived-day timelines.`, {
                timelineWindowId: window.id,
                anchorFrom: window.anchorFrom,
                sortKeyFrom: window.sortKeyFrom,
                expectedSortKeyFrom: expectedFrom,
                timelineRef: timeline.timelineRef,
            });
        }
        if (expectedTo !== null && Number(window.sortKeyTo) !== expectedTo) {
            addContextHealthIssue(health, 'warning', 'timeline_window_sortkey_mismatch', `Timeline window ${window.id} sortKeyTo should match its end anchor range end for date-derived-day timelines.`, {
                timelineWindowId: window.id,
                anchorTo: window.anchorTo,
                sortKeyTo: window.sortKeyTo,
                expectedSortKeyTo: expectedTo,
                timelineRef: timeline.timelineRef,
            });
        }
    }
}

export async function loadTimelineRegistryForHealth(manifest = {}, baseUrl = null, health, registryRecord = null, fetchJsonDetailed = null) {
    const packId = cleanHealthString(manifest.id || health?.packId, 160);
    const timelineRef = getTimelineRegistryRef(manifest);
    addMalformedTimelineRegistryHealthIssue(health, registryRecord, timelineRef);
    const empty = createEmptyTimelineHealthIndex(packId, timelineRef);
    empty.hasTimelineRef = !!timelineRef;
    let sourceRegistry = isPlainObject(manifest.timelineRegistry) ? manifest.timelineRegistry : null;
    let hasTimelineRef = !!timelineRef;

    if (timelineRef && baseUrl && typeof fetchJsonDetailed === 'function') {
        let timelineUrl = null;
        try {
            timelineUrl = new URL(timelineRef, baseUrl);
        } catch (_) {
            addHealthIssue(health, 'warning', 'context_timeline_invalid_ref', `Timeline registry path is invalid: ${timelineRef}.`, {
                timelineRef,
            });
            hasTimelineRef = false;
        }

        if (timelineUrl) {
            const result = await fetchJsonDetailed(timelineUrl);
            if (!result.ok) {
                addHealthIssue(health, 'warning', 'context_timeline_load_failed', `Timeline registry failed to load: ${timelineRef}.`, {
                    timelineRef,
                    status: result.status,
                    detail: result.error || result.statusText || '',
                });
                hasTimelineRef = false;
            } else {
                sourceRegistry = result.json;
                hasTimelineRef = true;
            }
        }
    }

    const mergedRegistry = mergeLoredeckTimelineRegistries(sourceRegistry, registryRecord?.timelineRegistry);
    if (!mergedRegistry) return empty;

    const timeline = createTimelineHealthIndex({
        ...normalizeTimelineRegistryForHealth(mergedRegistry, packId),
        packId,
        timelineRef,
        hasTimelineRef: hasTimelineRef || !!registryRecord?.timelineRegistry,
    });
    health.summary.timelineAnchorCount = timeline.anchors.length;
    health.summary.timelineWindowCount = timeline.windows.length;
    if (!timeline.anchors.length && !timeline.windows.length) {
        addHealthIssue(health, 'suggestion', 'context_timeline_empty', `Timeline registry ${timelineRef} has no anchors or windows.`, {
            timelineRef,
        });
    }
    analyzeTimelineWindowHealth(health, timeline);
    analyzeTimelineDateDerivedSortKeys(health, timeline);
    return timeline;
}

export function hasFiniteContextNumber(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

const CONTEXT_GATE_FIELDS = [
    'scope', 'anchorId', 'validFromAnchor', 'validToAnchor',
    'arc', 'arcId', 'phase', 'phaseId', 'season', 'episode', 'chapter',
    'issue', 'quest', 'gameStage', 'stardateFrom', 'stardateTo',
];

function hasNormalizedContextGate(contextGate, coordinates) {
    for (const field of CONTEXT_GATE_FIELDS) {
        if (contextGate[field]) return true;
    }
    // Normalization trims strings and keeps coordinates only when axis or ID is set.
    return coordinates.length > 0 || Number.isFinite(contextGate.sortKeyFrom) || Number.isFinite(contextGate.sortKeyTo);
}

function getEntryAnchorReferences(contextGate = {}) {
    return [
        ['anchorId', cleanHealthString(contextGate.anchorId, 180)],
        ['validFromAnchor', cleanHealthString(contextGate.validFromAnchor, 180)],
        ['validToAnchor', cleanHealthString(contextGate.validToAnchor, 180)],
    ].filter(([, anchorId]) => anchorId);
}

function hasOnlyAnchorOrWindowContextGate(contextGate = {}, coordinates = []) {
    const nonAnchorFields = [
        'arc',
        'arcId',
        'phase',
        'phaseId',
        'season',
        'episode',
        'chapter',
        'issue',
        'quest',
        'gameStage',
        'stardateFrom',
        'stardateTo',
    ];
    return getEntryAnchorReferences(contextGate).length > 0
        && !nonAnchorFields.some(field => cleanHealthString(contextGate[field]))
        && (!Array.isArray(coordinates) || coordinates.length === 0);
}

function analyzeEntryContextWindowHealth(health, entry, file, timeline = {}) {
    const contextGate = entry.context || {};
    const entryId = cleanHealthString(entry.id, 180);
    const invalidReasons = [];

    const explicitFromSort = hasFiniteContextNumber(contextGate.sortKeyFrom) ? Number(contextGate.sortKeyFrom) : null;
    const explicitToSort = hasFiniteContextNumber(contextGate.sortKeyTo) ? Number(contextGate.sortKeyTo) : null;
    const anchorFromSort = getAnchorSortKey(timeline, contextGate.validFromAnchor);
    const anchorToSort = getAnchorSortKey(timeline, contextGate.validToAnchor);
    const fromSort = explicitFromSort ?? anchorFromSort;
    const toSort = explicitToSort ?? anchorToSort;

    if (explicitFromSort !== null && explicitToSort !== null && explicitFromSort > explicitToSort) {
        invalidReasons.push(`sortKeyFrom ${explicitFromSort} is after sortKeyTo ${explicitToSort}`);
    } else if (fromSort !== null && toSort !== null && fromSort > toSort) {
        invalidReasons.push(`from anchor/sort ${fromSort} is after to anchor/sort ${toSort}`);
    }

    if (!invalidReasons.length) return [];

    addContextHealthIssue(health, 'warning', 'invalid_context_window', `Entry ${entryId || entry.title} has an invalid Context window: ${invalidReasons.join('; ')}.`, {
        entryIds: entryId ? [entryId] : [],
        file,
        anchorFrom: contextGate.validFromAnchor || '',
        anchorTo: contextGate.validToAnchor || '',
        sortKeyFrom: fromSort,
        sortKeyTo: toSort,
    });
    return invalidReasons;
}

function analyzeEntryAnchorReferenceHealth(health, entry, file, timeline = {}) {
    const entryId = cleanHealthString(entry.id, 180);
    const missing = [];
    for (const [field, anchorId] of getEntryAnchorReferences(entry.context || {})) {
        if (timeline.anchorById?.has(anchorId)) continue;
        missing.push({ field, anchorId });
    }
    if (!missing.length) return [];

    const anchorIds = missing.map(item => item.anchorId);
    addContextHealthIssue(health, 'warning', 'broken_anchor_reference', `Entry ${entryId || entry.title} references unknown Context anchor${anchorIds.length === 1 ? '' : 's'}: ${anchorIds.join(', ')}.`, {
        entryIds: entryId ? [entryId] : [],
        file,
        anchorIds,
        contextFields: missing.map(item => item.field),
    });
    return missing.map(item => `unknown ${item.field} ${item.anchorId}`);
}

export function analyzeEntryContextHealth(health, entryFiles = [], timeline = {}) {
    let contextGateCount = 0;
    let anchorReferenceGateCount = 0;
    const noTimelineEntryIds = [];
    const referencedAnchorIds = new Set();

    for (const fileRecord of entryFiles) {
        for (const rawEntry of fileRecord.entries || []) {
            const entry = normalizeLoreEntry(rawEntry);
            const { context: contextGate, coordinates } = entry;
            if (!hasNormalizedContextGate(contextGate, coordinates)) continue;

            contextGateCount += 1;
            const entryId = cleanHealthString(entry.id, 180);
            const anchorRefs = getEntryAnchorReferences(contextGate);
            if (anchorRefs.length) {
                anchorReferenceGateCount += 1;
                for (const [, anchorId] of anchorRefs) referencedAnchorIds.add(anchorId);
            }
            if (anchorRefs.length && !timeline.hasTimelineRef) {
                if (entryId) noTimelineEntryIds.push(entryId);
                continue;
            }

            const impossibleReasons = [];
            if (timeline.hasTimelineRef) {
                impossibleReasons.push(...analyzeEntryAnchorReferenceHealth(health, entry, fileRecord.file, timeline));
            }
            impossibleReasons.push(...analyzeEntryContextWindowHealth(health, entry, fileRecord.file, timeline));

            if (impossibleReasons.length && hasOnlyAnchorOrWindowContextGate(contextGate, coordinates)) {
                addContextHealthIssue(health, 'warning', 'unmatchable_context_gate', `Entry ${entryId || entry.title} has a Context gate that cannot match known anchors: ${impossibleReasons.join('; ')}.`, {
                    entryIds: entryId ? [entryId] : [],
                    file: fileRecord.file,
                    reasons: impossibleReasons,
                });
            }
        }
    }

    health.summary.contextGateCount = contextGateCount;
    if (anchorReferenceGateCount && !timeline.hasTimelineRef) {
        addHealthIssue(health, 'suggestion', 'context_gates_without_timeline', `${anchorReferenceGateCount} Lorecard${anchorReferenceGateCount === 1 ? ' uses' : 's use'} anchor-based Context gates, but this Loredeck has no timeline registry.`, {
            entryIds: noTimelineEntryIds.slice(0, 50),
            affectedEntryCount: anchorReferenceGateCount,
        });
    }
    analyzeTimelineDensificationHealth(health, {
        timeline,
        contextGateCount,
        anchorReferenceGateCount,
        referencedAnchorIds,
    });
}

function analyzeTimelineDensificationHealth(health, metrics = {}) {
    const timeline = metrics.timeline || {};
    const contextGateCount = Number(metrics.contextGateCount) || 0;
    const anchorReferenceGateCount = Number(metrics.anchorReferenceGateCount) || 0;
    const referencedAnchorIds = metrics.referencedAnchorIds instanceof Set ? metrics.referencedAnchorIds : new Set();
    const anchorCount = Array.isArray(timeline.anchors) ? timeline.anchors.length : 0;
    const windowCount = Array.isArray(timeline.windows) ? timeline.windows.length : 0;
    const candidateCount = anchorCount + windowCount;

    health.summary.timelineCandidateCount = candidateCount;
    health.summary.timelineReferencedAnchorCount = referencedAnchorIds.size;
    health.summary.timelineGatesPerCandidate = candidateCount
        ? Number((contextGateCount / candidateCount).toFixed(2))
        : 0;

    if (!timeline.hasTimelineRef || contextGateCount < 24) return;

    const recommendedMinimum = Math.min(80, Math.max(8, Math.ceil(contextGateCount / 10)));
    const gatesPerCandidate = candidateCount ? contextGateCount / candidateCount : contextGateCount;
    if (candidateCount < 8 || gatesPerCandidate > 14) {
        addTimelineDensificationIssue(
            health,
            'timeline_candidate_sparse',
            `Timeline has ${candidateCount} durable candidate${candidateCount === 1 ? '' : 's'} for ${contextGateCount} Context-gated Lorecards. Add high-value recurring story anchors/windows rather than aliases for every phrase.`,
            {
                contextGateCount,
                timelineCandidateCount: candidateCount,
                timelineAnchorCount: anchorCount,
                timelineWindowCount: windowCount,
                gatesPerCandidate: Number(gatesPerCandidate.toFixed(2)),
                recommendedMinimum,
            }
        );
    }

    if (anchorReferenceGateCount >= 32 && referencedAnchorIds.size > 0 && referencedAnchorIds.size <= 3) {
        addTimelineDensificationIssue(
            health,
            'timeline_anchor_coverage_concentrated',
            `${anchorReferenceGateCount} anchor-based Context gate${anchorReferenceGateCount === 1 ? '' : 's'} reference only ${referencedAnchorIds.size} unique anchor${referencedAnchorIds.size === 1 ? '' : 's'}. Add durable waypoints for major story turns, not exhaustive keyword aliases.`,
            {
                anchorReferenceGateCount,
                referencedAnchorCount: referencedAnchorIds.size,
                anchorIds: [...referencedAnchorIds].slice(0, 20),
            }
        );
    }

    if (windowCount === 0 && anchorCount >= 2 && contextGateCount >= 24) {
        addTimelineDensificationIssue(
            health,
            'timeline_windows_missing',
            `Timeline has ${anchorCount} anchor${anchorCount === 1 ? '' : 's'} but no broad windows for ${contextGateCount} Context-gated Lorecards. Add arc/year/phase windows so users can choose story ranges cleanly.`,
            {
                contextGateCount,
                timelineAnchorCount: anchorCount,
                timelineWindowCount: windowCount,
            }
        );
    }
}

export function createEmptyTimelineHealthIndex(packId = '', timelineRef = '') {
    return {
        packId,
        timelineRef,
        hasTimelineRef: false,
        anchors: [],
        windows: [],
        anchorById: new Map(),
        duplicateAnchorIds: new Set(),
    };
}

function addMalformedTimelineRegistryHealthIssue(health, registryRecord = null, timelineRef = '') {
    const issue = isPlainObject(registryRecord?.timelineRegistryIssue) ? registryRecord.timelineRegistryIssue : null;
    if (!issue) return false;
    addHealthIssue(health, 'warning', 'context_timeline_registry_malformed', `Timeline registry overlay is malformed: ${cleanHealthString(issue.reason || 'invalid timeline registry', 500)}`, {
        timelineRef,
        sourceCode: cleanHealthString(issue.code || 'malformed_timeline_registry', 120),
    });
    return true;
}

export function createInMemoryTimelineHealthIndex(manifest = {}, timeline = null, health, registryRecord = null) {
    const packId = cleanHealthString(manifest.id || health?.packId, 160);
    const timelineRef = getTimelineRegistryRef(manifest);
    addMalformedTimelineRegistryHealthIssue(health, registryRecord, timelineRef);
    const mergedRegistry = mergeLoredeckTimelineRegistries(
        isPlainObject(timeline) ? timeline : (isPlainObject(manifest.timelineRegistry) ? manifest.timelineRegistry : null),
        registryRecord?.timelineRegistry
    );
    if (!mergedRegistry) return createEmptyTimelineHealthIndex(packId, timelineRef);

    const index = createTimelineHealthIndex({
        ...normalizeTimelineRegistryForHealth(mergedRegistry, packId),
        packId,
        timelineRef,
        hasTimelineRef: true,
    });
    health.summary.timelineAnchorCount = index.anchors.length;
    health.summary.timelineWindowCount = index.windows.length;
    if (!index.anchors.length && !index.windows.length) {
        addHealthIssue(health, 'suggestion', 'context_timeline_empty', `Timeline registry ${timelineRef || '(in-memory)'} has no anchors or windows.`, {
            timelineRef,
        });
    }
    analyzeTimelineWindowHealth(health, index);
    analyzeTimelineDateDerivedSortKeys(health, index);
    return index;
}
