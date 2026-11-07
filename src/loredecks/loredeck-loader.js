/**
 * loredeck-loader.js -- Saga
 * Minimal Loredeck manifest, entry-file loading, and Pack Health helpers.
 *
 * This module is intentionally data-only: it does not own canon scoring,
 * preprocessing, prompt injection, or UI state.
 */

import { resolveLoredeckStackItems } from './loredeck-library-index.js';
import { DEFAULT_HP_LOREDECK_ID } from './loredeck-defaults.js';
import {
    analyzeEntryContextHealth,
    analyzeTimelineDateDerivedSortKeys,
    analyzeTimelineWindowHealth,
    createInMemoryTimelineHealthIndex,
    createTimelineHealthIndex,
    normalizeTimelineRegistryForHealth,
} from './context-health.js';
import {
    addHealthIssue,
    createHealth,
    finalizeHealth,
    isPlainObject,
} from './loredeck-health-core.js';
import {
    analyzeEntries,
    analyzeManifestFileListHealth,
    analyzeManifestStatsHealth,
    buildLoredeckHealthForData,
} from './loredeck-health-engine.js';
import {
    buildEmbeddedManifest,
    buildVirtualEntryFilesFromRegistry,
    isGeneratedRegistryRecord,
} from './loredeck-normalizer.js';
import { loadLoredeckEntryFilesForHealth } from './loredeck-source-health.js';
import {
    analyzeSchemaV3EntryHealth,
    normalizeLoredeckEntryForSchemaV3,
    repairLoredeckEntryForHealth,
} from './schema-v3-health.js';
import {
    analyzeEntryTagHealth,
    analyzeTagRegistryDefinitionHealth,
    createEmptyTagRegistryHealthIndex,
    createInMemoryTagRegistryHealthIndex,
    createTagRegistryHealthIndex,
    normalizeTagRegistryForHealth,
} from './tag-registry-health.js';
import { hydrateExternalLorepackPayloadRecord } from '../storage/saga-lorepack-payload-storage.js';

export const DEFAULT_LOREDECK_ID = DEFAULT_HP_LOREDECK_ID;
export { mergeLoredeckTimelineRegistries } from './context-health.js';
export { buildLoredeckHealthForData } from './loredeck-health-engine.js';
export { buildLoredeckHealthForSource, loadLoredeckEntryFilesForHealth } from './loredeck-source-health.js';
export { normalizeLoredeckEntryForSchemaV3, repairLoredeckEntryForHealth } from './schema-v3-health.js';
const BUNDLED_LOREDECKS_ROOT_URL = new URL('../../content/loredecks/', import.meta.url);

function resolveBundledLoredeckUrl(path) {
    const raw = String(path || '').trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return new URL(raw);
    const relative = raw
        .replace(/\\/g, '/')
        .replace(/^\.?\//, '')
        .replace(/^content\/loredecks\//i, '');
    return new URL(relative, BUNDLED_LOREDECKS_ROOT_URL);
}

export const DEFAULT_LOREDECK_MANIFEST_URL = resolveBundledLoredeckUrl(`${DEFAULT_LOREDECK_ID}/loredeck.json`);
export const LOREDECK_INDEX_URL = resolveBundledLoredeckUrl('index.json');

export async function fetchJson(url, fallback = null) {
    const result = await fetchJsonDetailed(url);
    return result.ok ? result.json : fallback;
}

async function fetchJsonDetailed(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                statusText: response.statusText || '',
                error: `HTTP ${response.status}`,
            };
        }
        try {
            return { ok: true, json: await response.json() };
        } catch (e) {
            return { ok: false, status: response.status, error: e?.message || 'Invalid JSON' };
        }
    } catch (e) {
        return { ok: false, status: 0, error: e?.message || 'Fetch failed' };
    }
}

function sanitizeStackSource(value = {}) {
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const type = input.type === 'folder' ? 'folder' : (input.type === 'deck' ? 'deck' : '');
    if (!type) return null;
    const output = { type };
    const stackItemId = String(input.stackItemId || '').trim();
    if (stackItemId) output.stackItemId = stackItemId;
    const folderId = String(input.folderId || '').trim();
    if (folderId) output.folderId = folderId;
    if (Array.isArray(input.folderPath)) {
        const folderPath = input.folderPath.map(item => String(item || '').trim()).filter(Boolean).slice(0, 12);
        if (folderPath.length) output.folderPath = folderPath;
    }
    return output;
}

function buildLoredeckMeta(manifest = {}, stackPriority = 100, stackIndex = 0, stackSource = null) {
    const id = manifest.id || DEFAULT_LOREDECK_ID;
    const sourceInfo = sanitizeStackSource(stackSource);
    return {
        id,
        type: manifest.type || 'bundled',
        title: manifest.title || 'Harry Potter: Core',
        derivedFrom: manifest.derivedFrom || null,
        disabledEntryIds: Array.isArray(manifest.disabledEntryIds) ? manifest.disabledEntryIds.map(id => String(id || '').trim()).filter(Boolean) : [],
        stackPriority,
        stackIndex,
        ...(sourceInfo ? { stackSource: sourceInfo } : {}),
    };
}

function getLoredeckManifestUrl(packId, registryRecord = null) {
    const manifest = String(registryRecord?.manifest || '').trim();
    if (manifest) {
        try {
            return resolveBundledLoredeckUrl(manifest);
        } catch (_) {
            return null;
        }
    }
    if (registryRecord && isPlainObject(registryRecord.manifestData)) return null;
    const id = String(packId || '').trim();
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) return null;
    return resolveBundledLoredeckUrl(`${id}/loredeck.json`);
}

function getRegistryRecord(registry, packId) {
    const packs = registry?.packs && typeof registry.packs === 'object' && !Array.isArray(registry.packs)
        ? registry.packs
        : {};
    return packs[String(packId || '').trim()] || null;
}

function buildMissingPackMeta(packId, registryRecord, stackPriority, stackIndex, stackSource = null) {
    const id = String(packId || registryRecord?.packId || '').trim();
    const sourceInfo = sanitizeStackSource(stackSource);
    return {
        id,
        type: registryRecord?.type || 'custom',
        title: registryRecord?.title || id,
        stackPriority,
        stackIndex,
        source: registryRecord?.source || {},
        ...(sourceInfo ? { stackSource: sourceInfo } : {}),
    };
}

async function loadEntryFiles(manifest = {}, baseUrl, health, registryRecord = null) {
    return loadLoredeckEntryFilesForHealth(manifest, baseUrl, health, registryRecord, fetchJsonDetailed, [], {
        parallelEntryFiles: true,
    });
}

export async function loadLoredeckSourceById(packId = DEFAULT_LOREDECK_ID, options = {}) {
    let registryRecord = options.registryRecord || getRegistryRecord(options.registry, packId);
    let payloadLoadError = '';
    if (registryRecord?.payloadFile) {
        try {
            registryRecord = await hydrateExternalLorepackPayloadRecord(registryRecord);
        } catch (error) {
            payloadLoadError = error?.message || String(error || 'Lorepack payload failed to load.');
        }
    }
    const generatedWithoutManifest = isGeneratedRegistryRecord(registryRecord) && !String(registryRecord?.manifest || '').trim();
    const manifestUrl = generatedWithoutManifest ? null : getLoredeckManifestUrl(packId, registryRecord);
    const stackPriority = Number.isFinite(Number(options.stackPriority)) ? Number(options.stackPriority) : 100;
    const stackIndex = Number.isFinite(Number(options.stackIndex)) ? Number(options.stackIndex) : 0;
    const stackSource = sanitizeStackSource(options.stackSource);
    const embeddedManifest = buildEmbeddedManifest(registryRecord, packId);
    if (payloadLoadError && !embeddedManifest && !manifestUrl) {
        const health = createHealth(packId);
        addHealthIssue(health, 'error', 'missing_lorepack_payload', `Lorepack payload failed to load for ${packId}.`, {
            packId,
            file: registryRecord?.payloadFile || '',
            detail: payloadLoadError,
        });
        return {
            manifest: null,
            baseUrl: null,
            sourceKind: 'missing_payload',
            registryRecord,
            pack: buildMissingPackMeta(packId, registryRecord, stackPriority, stackIndex, stackSource),
            health: finalizeHealth(health),
            entryFiles: [],
        };
    }
    if (embeddedManifest) {
        if (!manifestUrl) {
            const entryFiles = buildVirtualEntryFilesFromRegistry(registryRecord, embeddedManifest);
            if (isGeneratedRegistryRecord(registryRecord) || entryFiles.length) {
                const health = buildLoredeckHealthForData({
                    packId: embeddedManifest.id || packId,
                    manifest: embeddedManifest,
                    entryFiles,
                    timeline: registryRecord?.timelineRegistry || null,
                    tagRegistry: registryRecord?.tagRegistry || null,
                    timelineRegistryRecord: registryRecord,
                    registryRecord: null,
                });
                return {
                    manifest: embeddedManifest,
                    baseUrl: null,
                    sourceKind: isGeneratedRegistryRecord(registryRecord) ? 'generated_virtual' : 'custom_virtual',
                    registryRecord,
                    pack: {
                        ...buildLoredeckMeta(embeddedManifest, stackPriority, stackIndex, stackSource),
                        source: embeddedManifest.source || registryRecord?.source || {},
                    },
                    health,
                    entryFiles,
                };
            }
            const health = createHealth(embeddedManifest.id || packId);
            addHealthIssue(health, 'error', 'missing_virtual_loredeck_base_manifest', `Custom Loredeck ${embeddedManifest.id || packId} has embedded manifest metadata but no base manifest path for file resolution.`, {
                packId: embeddedManifest.id || packId,
            });
            return {
                manifest: embeddedManifest,
                baseUrl: null,
                sourceKind: 'virtual',
                registryRecord,
                pack: buildLoredeckMeta(embeddedManifest, stackPriority, stackIndex, stackSource),
                health: finalizeHealth(health),
                entryFiles: [],
            };
        }
        const health = createHealth(embeddedManifest.id || packId);
        const entryFiles = await loadEntryFiles(embeddedManifest, manifestUrl, health, registryRecord);
        return {
            manifest: embeddedManifest,
            baseUrl: manifestUrl,
            sourceKind: 'virtual',
            registryRecord,
            pack: {
                ...buildLoredeckMeta(embeddedManifest, stackPriority, stackIndex, stackSource),
                source: embeddedManifest.source || registryRecord?.source || {},
            },
            health: finalizeHealth(health),
            entryFiles,
        };
    }
    if (!manifestUrl) {
        const health = createHealth(packId);
        addHealthIssue(health, 'error', 'invalid_pack_id', `Loredeck id is not a valid bundled deck id: ${packId}.`, { packId });
        return {
            manifest: null,
            baseUrl: null,
            sourceKind: 'missing',
            registryRecord,
            pack: buildMissingPackMeta(packId, registryRecord, stackPriority, stackIndex, stackSource),
            health: finalizeHealth(health),
            entryFiles: [],
        };
    }

    const loredeckResult = await fetchJsonDetailed(manifestUrl);
    if (loredeckResult.ok) {
        const manifest = {
            ...(registryRecord || {}),
            ...(loredeckResult.json || {}),
        };
        const pack = {
            ...buildLoredeckMeta(manifest, stackPriority, stackIndex, stackSource),
            source: manifest.source || registryRecord?.source || {},
        };
        const health = createHealth(pack.id);
        const entryFiles = await loadEntryFiles(manifest, manifestUrl, health, registryRecord);
        return {
            manifest,
            baseUrl: manifestUrl,
            sourceKind: 'loredeck',
            registryRecord,
            pack,
            health: finalizeHealth(health),
            entryFiles,
        };
    }

    const health = createHealth(packId);
    addHealthIssue(health, 'error', 'missing_loredeck_manifest', `Loredeck manifest failed to load for ${packId}.`, {
        packId,
        status: loredeckResult.status,
        detail: loredeckResult.error || loredeckResult.statusText || '',
    });
    return {
        manifest: null,
        baseUrl: manifestUrl,
        sourceKind: 'missing',
        registryRecord,
        pack: buildMissingPackMeta(packId, registryRecord, stackPriority, stackIndex, stackSource),
        health: finalizeHealth(health),
        entryFiles: [],
    };
}

function normalizeLoredeckStackInput(stack, options = {}) {
    const input = Array.isArray(stack) && stack.length
        ? stack
        : options.allowEmptyStack === true
            ? []
            : [{ packId: DEFAULT_LOREDECK_ID, enabled: true, priority: 100, addedAt: 0 }];
    const registry = options.registry && typeof options.registry === 'object' && !Array.isArray(options.registry)
        ? options.registry
        : null;
    if (registry && (Array.isArray(registry.folders) || Array.isArray(registry.deckPlacements))) {
        const resolved = resolveLoredeckStackItems(input, registry, {
            packs: registry.packs || {},
        });
        return (resolved.stack || [])
            .map((item, index) => ({
                packId: String(item?.packId || '').trim(),
                enabled: item?.enabled !== false,
                priority: Number.isFinite(Number(item?.priority)) ? Number(item.priority) : Math.max(1, 100 - index),
                locked: item?.locked === true,
                addedAt: Number.isFinite(Number(item?.addedAt)) ? Number(item.addedAt) : 0,
                stackIndex: index,
                source: sanitizeStackSource(item?.source),
            }))
            .filter(item => item.packId);
    }
    return input
        .map((item, index) => ({
            packId: String(item?.packId || '').trim(),
            enabled: item?.enabled !== false,
            priority: Number.isFinite(Number(item?.priority)) ? Number(item.priority) : Math.max(1, 100 - index),
            locked: item?.locked === true,
            addedAt: Number.isFinite(Number(item?.addedAt)) ? Number(item.addedAt) : 0,
            stackIndex: index,
            source: sanitizeStackSource(item?.source),
        }))
        .filter(item => item.packId);
}

export async function loadLoredeckStackSources(stack, options = {}) {
    const normalized = normalizeLoredeckStackInput(stack, options).filter(item => item.enabled);
    const sources = [];
    for (let index = 0; index < normalized.length; index += 1) {
        const item = normalized[index];
        const registryRecord = getRegistryRecord(options.registry, item.packId);
        sources.push(await loadLoredeckSourceById(item.packId, {
            registry: options.registry,
            registryRecord,
            stackPriority: item.priority,
            stackIndex: index,
            stackSource: item.source,
        }));
    }
    return sources;
}

export async function loadDefaultLoredeckSource(options = {}) {
    const getStackPriority = typeof options.getStackPriority === 'function'
        ? options.getStackPriority
        : () => 100;
    return loadLoredeckSourceById(DEFAULT_LOREDECK_ID, {
        stackPriority: getStackPriority(DEFAULT_LOREDECK_ID),
        stackIndex: 0,
    });
}

export function combineLoredeckHealth(sources = []) {
    const health = createHealth('loredeck-stack');
    if (!Array.isArray(sources) || !sources.length) {
        addHealthIssue(health, 'suggestion', 'empty_loredeck_stack', 'No enabled Loredecks are loaded in the current stack.');
        return finalizeHealth(health);
    }

    for (const source of sources) {
        const sourceHealth = source?.health || {};
        const summary = sourceHealth.summary || {};
        health.summary.entryCount += Number(summary.entryCount) || 0;
        health.summary.fileCount += Number(summary.fileCount) || 0;
        health.summary.loadedFileCount += Number(summary.loadedFileCount) || 0;
        health.summary.missingFileCount += Number(summary.missingFileCount) || 0;
        health.summary.duplicateEntryIdCount += Number(summary.duplicateEntryIdCount) || 0;
        health.summary.missingEntryIdCount += Number(summary.missingEntryIdCount) || 0;
        health.summary.entryOverrideCount = (Number(health.summary.entryOverrideCount) || 0) + (Number(summary.entryOverrideCount) || 0);
        health.summary.entryAdditionCount = (Number(health.summary.entryAdditionCount) || 0) + (Number(summary.entryAdditionCount) || 0);
        health.summary.disabledEntryIdCount = (Number(health.summary.disabledEntryIdCount) || 0) + (Number(summary.disabledEntryIdCount) || 0);
        health.summary.suppressedEntryCount = (Number(health.summary.suppressedEntryCount) || 0) + (Number(summary.suppressedEntryCount) || 0);
        health.summary.timelineAnchorCount = (Number(health.summary.timelineAnchorCount) || 0) + (Number(summary.timelineAnchorCount) || 0);
        health.summary.timelineWindowCount = (Number(health.summary.timelineWindowCount) || 0) + (Number(summary.timelineWindowCount) || 0);
        health.summary.timelineCandidateCount = (Number(health.summary.timelineCandidateCount) || 0) + (Number(summary.timelineCandidateCount) || 0);
        health.summary.timelineReferencedAnchorCount = (Number(health.summary.timelineReferencedAnchorCount) || 0) + (Number(summary.timelineReferencedAnchorCount) || 0);
        health.summary.timelineDensificationSuggestionCount = (Number(health.summary.timelineDensificationSuggestionCount) || 0) + (Number(summary.timelineDensificationSuggestionCount) || 0);
        health.summary.contextGateCount = (Number(health.summary.contextGateCount) || 0) + (Number(summary.contextGateCount) || 0);
        health.summary.brokenAnchorReferenceCount = (Number(health.summary.brokenAnchorReferenceCount) || 0) + (Number(summary.brokenAnchorReferenceCount) || 0);
        health.summary.invalidContextWindowCount = (Number(health.summary.invalidContextWindowCount) || 0) + (Number(summary.invalidContextWindowCount) || 0);
        health.summary.unmatchableContextGateCount = (Number(health.summary.unmatchableContextGateCount) || 0) + (Number(summary.unmatchableContextGateCount) || 0);
        health.summary.schemaV3EntryCount = (Number(health.summary.schemaV3EntryCount) || 0) + (Number(summary.schemaV3EntryCount) || 0);
        health.summary.schemaV3IssueCount = (Number(health.summary.schemaV3IssueCount) || 0) + (Number(summary.schemaV3IssueCount) || 0);
        health.summary.manifestStatsMismatchCount = (Number(health.summary.manifestStatsMismatchCount) || 0) + (Number(summary.manifestStatsMismatchCount) || 0);
        health.summary.tagRegistryTagCount = (Number(health.summary.tagRegistryTagCount) || 0) + (Number(summary.tagRegistryTagCount) || 0);
        health.summary.undefinedTagCount = (Number(health.summary.undefinedTagCount) || 0) + (Number(summary.undefinedTagCount) || 0);
        health.summary.deprecatedTagUsageCount = (Number(health.summary.deprecatedTagUsageCount) || 0) + (Number(summary.deprecatedTagUsageCount) || 0);
        health.summary.duplicateTagAliasCount = (Number(health.summary.duplicateTagAliasCount) || 0) + (Number(summary.duplicateTagAliasCount) || 0);
        health.summary.orphanedTagCount = (Number(health.summary.orphanedTagCount) || 0) + (Number(summary.orphanedTagCount) || 0);
        health.summary.malformedTagCount = (Number(health.summary.malformedTagCount) || 0) + (Number(summary.malformedTagCount) || 0);
        for (const [category, count] of Object.entries(summary.categoryCounts || {})) {
            health.summary.categoryCounts[category] = (health.summary.categoryCounts[category] || 0) + (Number(count) || 0);
        }
        for (const issue of sourceHealth.errors || []) {
            health.errors.push({ ...issue, packId: source?.pack?.id || sourceHealth.packId || '' });
        }
        for (const issue of sourceHealth.warnings || []) {
            health.warnings.push({ ...issue, packId: source?.pack?.id || sourceHealth.packId || '' });
        }
        for (const issue of sourceHealth.suggestions || []) {
            health.suggestions.push({ ...issue, packId: source?.pack?.id || sourceHealth.packId || '' });
        }
    }
    health.summary.timelineGatesPerCandidate = health.summary.timelineCandidateCount
        ? Number(((Number(health.summary.contextGateCount) || 0) / health.summary.timelineCandidateCount).toFixed(2))
        : 0;

    return finalizeHealth(health);
}

export const __loredeckLoaderTestHooks = {
    createHealth,
    finalizeHealth,
    normalizeTimelineRegistryForHealth,
    createTimelineHealthIndex,
    normalizeTagRegistryForHealth,
    createTagRegistryHealthIndex,
    analyzeTagRegistryDefinitionHealth,
    analyzeEntryTagHealth,
    analyzeTimelineWindowHealth,
    analyzeTimelineDateDerivedSortKeys,
    analyzeManifestFileListHealth,
    buildLoredeckHealthForData,
    normalizeLoredeckEntryForSchemaV3,
    repairLoredeckEntryForHealth,
    analyzeEntries,
    analyzeSchemaV3EntryHealth,
    analyzeManifestStatsHealth,
    analyzeEntryContextHealth,
};
