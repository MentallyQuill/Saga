import { clearCanonLoreDatabaseCache } from '../context/canon-lore-db.js';
import { clearContextIndexCache } from '../context/context-index.js';
import { DEFAULT_SETTINGS } from '../state/constants.js';
import { getLoredeckLibraryRegistry, getState, saveState } from '../state/state-manager.js';
import {
    normalizeLoredeckHealthIssueStates,
    normalizeLoredeckPendingChanges,
    normalizeLoredeckTagRegistry,
    normalizeLoredeckTimelineRegistryIssue,
    normalizeLoredeckTimelineRegistryIssueRecord,
    normalizeLoredeckTimelineRegistry,
} from '../state/lore-state-normalizers.js';
import {
    getLoredeckTagRegistryCount,
    getLoredeckTimelineRegistryCount,
} from './loredeck-package-helpers.js';
import { DEFAULT_HP_LOREDECK_ID, HP_LEGACY_LOREDECK_ID } from '../loredecks/loredeck-defaults.js';
import { getFolderPath, normalizePackLibraryMetadata } from '../loredecks/loredeck-library-index.js';
import {
    getBundledLoredeckLibraryRecords,
    getLoredeckLibraryIndexForPacks,
    isLoredeckLibraryOpen,
    refreshLoredeckLibraryAfterStackMutation,
    refreshLoredeckSurfaces,
    renderLoredeckLibraryOverlay,
} from '../loredecks/loredeck-library-panel.js';
import { toast } from '../ui/runtime-ui-kit.js';

export function getLoredeckStackItemType(item = {}) {
    return item?.type === 'folder' || item?.folderId ? 'folder' : 'deck';
}

export function getLoredeckStackItemKey(item = {}) {
    const type = getLoredeckStackItemType(item);
    const id = type === 'folder'
        ? String(item?.folderId || '').trim()
        : String(item?.packId || item?.deckId || '').trim();
    return id ? `${type}:${id}` : '';
}

export function createLoredeckStackDeckKey(packId = '') {
    const id = String(packId || '').trim();
    return id ? `deck:${id}` : '';
}

export function createLoredeckStackFolderKey(folderId = '') {
    const id = String(folderId || '').trim();
    return id ? `folder:${id}` : '';
}

export function getLoredeckStackItemLabel(item = {}, libraryIndex = getLoredeckLibraryIndexForPacks()) {
    if (getLoredeckStackItemType(item) === 'folder') {
        const path = getFolderPath(item.folderId, libraryIndex);
        return path.length ? path.join(' > ') : (item.folderId || 'Folder');
    }
    return getLoredeckDisplayName(item.packId || item.deckId || '');
}

export function getLoredeckStackItemPackId(item = {}) {
    return getLoredeckStackItemType(item) === 'deck' ? String(item?.packId || item?.deckId || '').trim() : '';
}

export function getLoredeckStackItemFolderId(item = {}) {
    return getLoredeckStackItemType(item) === 'folder' ? String(item?.folderId || '').trim() : '';
}

export function getLoredeckStack(state = getState()) {
    const stack = Array.isArray(state?.loredeckStack) ? state.loredeckStack : [];
    return stack
        .filter(item => item && typeof item === 'object')
        .map((item, index) => {
            const type = getLoredeckStackItemType(item);
            const packId = String(item.packId || item.deckId || '').trim();
            const folderId = String(item.folderId || '').trim();
            const normalized = {
                type,
                enabled: item.enabled !== false,
                priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : Math.max(1, 100 - index),
                locked: item.locked === true,
                addedAt: Number.isFinite(Number(item.addedAt)) ? Number(item.addedAt) : 0,
            };
            if (type === 'folder') {
                normalized.folderId = folderId;
                normalized.includeNested = item.includeNested !== false;
                normalized.collapsed = item.collapsed === true;
            } else {
                normalized.packId = packId;
            }
            return normalized;
        })
        .filter(item => getLoredeckStackItemKey(item));
}

function getLoredeckLibraryPackId(raw) {
    return String(raw.packId || raw.id || '').trim();
}

export function normalizeLoredeckLibraryPack(raw = {}) {
    const packId = getLoredeckLibraryPackId(raw);
    if (!packId) return null;
    const stats = raw.stats && typeof raw.stats === 'object' && !Array.isArray(raw.stats) ? raw.stats : {};
    const derivedFrom = raw.derivedFrom && typeof raw.derivedFrom === 'object' && !Array.isArray(raw.derivedFrom) ? raw.derivedFrom : null;
    const manifestData = raw.manifestData && typeof raw.manifestData === 'object' && !Array.isArray(raw.manifestData) ? raw.manifestData : null;
    const library = normalizePackLibraryMetadata(raw.library || manifestData?.library || {});
    const entryOverrides = raw.entryOverrides && typeof raw.entryOverrides === 'object' && !Array.isArray(raw.entryOverrides) ? raw.entryOverrides : {};
    const disabledEntryIds = Array.isArray(raw.disabledEntryIds) ? raw.disabledEntryIds.map(id => String(id || '').trim()).filter(Boolean) : [];
    const assets = raw.assets && typeof raw.assets === 'object' && !Array.isArray(raw.assets) ? raw.assets : null;
    const payloadFile = String(raw.payloadFile || raw.payloadPath || '').trim();
    const coverFile = String(raw.coverFile || '').trim();
    const timelineRegistry = normalizeLoredeckTimelineRegistry(raw.timelineRegistry);
    const timelineRegistryIssue = normalizeLoredeckTimelineRegistryIssueRecord(raw.timelineRegistryIssue)
        || (Object.prototype.hasOwnProperty.call(raw, 'timelineRegistry') ? normalizeLoredeckTimelineRegistryIssue(raw.timelineRegistry, timelineRegistry) : null);
    const tagRegistry = normalizeLoredeckTagRegistry(raw.tagRegistry);
    const pendingChanges = normalizeLoredeckPendingChanges(raw.pendingChanges);
    const healthIssueStates = normalizeLoredeckHealthIssueStates(raw.healthIssueStates);
    return {
        packId,
        type: ['bundled', 'custom', 'generated'].includes(raw.type) ? raw.type : 'custom',
        title: String(raw.title || packId).trim(),
        description: String(raw.description || '').trim(),
        fandom: String(raw.fandom || '').trim(),
        era: String(raw.era || '').trim(),
        author: String(raw.author || '').trim(),
        version: String(raw.version || '').trim(),
        entrySchemaVersion: Number.isFinite(Number(raw.entrySchemaVersion)) ? Number(raw.entrySchemaVersion) : 0,
        manifest: String(raw.manifest || '').trim(),
        source: raw.source && typeof raw.source === 'object' && !Array.isArray(raw.source) ? raw.source : {},
        tags: Array.isArray(raw.tags) ? raw.tags.map(tag => String(tag || '').trim()).filter(Boolean) : [],
        stats,
        entryCount: Number.isFinite(Number(raw.entryCount)) ? Number(raw.entryCount) : (Number.isFinite(Number(stats.entryCount)) ? Number(stats.entryCount) : 0),
        healthStatus: String(raw.healthStatus || '').trim(),
        localModified: raw.localModified === true,
        derivedFrom,
        ...(payloadFile ? { payloadFile } : {}),
        ...(coverFile ? { coverFile } : {}),
        ...(assets ? { assets } : {}),
        manifestData,
        ...(Object.keys(library).length ? { library } : {}),
        entryOverrides,
        disabledEntryIds,
        ...(getLoredeckTimelineRegistryCount(timelineRegistry) ? { timelineRegistry } : {}),
        ...(timelineRegistryIssue ? { timelineRegistryIssue } : {}),
        ...(getLoredeckTagRegistryCount(tagRegistry) ? { tagRegistry } : {}),
        ...(pendingChanges.length ? { pendingChanges } : {}),
        ...(Object.keys(healthIssueStates).length ? { healthIssueStates } : {}),
        installedAt: Number.isFinite(Number(raw.installedAt)) ? Number(raw.installedAt) : 0,
        updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : 0,
    };
}

function collectLoredeckLibraryPacks(state, packId = null) {
    const packs = new Map();
    for (const pack of getBundledLoredeckLibraryRecords()) {
        if (packId !== null && getLoredeckLibraryPackId(pack) !== packId) continue;
        const normalized = normalizeLoredeckLibraryPack(pack);
        if (normalized) packs.set(normalized.packId, normalized);
    }
    const registry = getLoredeckLibraryRegistry(state);
    const registryPacks = registry?.packs && typeof registry.packs === 'object' && !Array.isArray(registry.packs)
        ? registry.packs
        : {};
    // The registry keys each record by its normalized pack ID.
    const records = packId === null
        ? Object.values(registryPacks)
        : (Object.prototype.hasOwnProperty.call(registryPacks, packId) ? [registryPacks[packId]] : []);
    for (const pack of records) {
        const normalized = normalizeLoredeckLibraryPack(pack);
        if (normalized) packs.set(normalized.packId, { ...(packs.get(normalized.packId) || {}), ...normalized });
    }
    return packs;
}

export function getLoredeckLibrary(state = getState()) {
    const packs = collectLoredeckLibraryPacks(state);
    return [...packs.values()].sort((a, b) => {
        const typeOrder = { bundled: 0, custom: 1, generated: 2 };
        return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9)
            || a.title.localeCompare(b.title);
    });
}

export function getLoredeckDisplayName(packId) {
    const definition = getLoredeckDefinition(packId);
    if (definition?.title) return definition.title;
    const known = {
        [HP_LEGACY_LOREDECK_ID]: 'Harry Potter: Golden Trio (Legacy)',
        [DEFAULT_HP_LOREDECK_ID]: 'Harry Potter: Core',
    };
    return known[packId] || packId;
}

export function getLoredeckTypeLabel(packId) {
    const definition = getLoredeckDefinition(packId);
    if (definition?.type) {
        if (definition.type === 'bundled') return 'Bundled';
        if (definition.type === 'generated') return 'Generated';
        return 'Custom';
    }
    const known = {
        [HP_LEGACY_LOREDECK_ID]: 'Legacy',
        [DEFAULT_HP_LOREDECK_ID]: 'Bundled',
    };
    return known[packId] || 'Custom';
}

export function getLoredeckDefinition(packId) {
    if (typeof packId !== 'string' || !packId) return null;
    return collectLoredeckLibraryPacks(getState(), packId).get(packId) || null;
}

export function getLoredeckStackMetric(state = getState()) {
    const stack = getLoredeckStack(state);
    const enabled = stack.filter(item => item.enabled).length;
    return enabled ? `${enabled} loaded` : 'None';
}

export function getLoredeckHealthText(health) {
    if (!health) return 'Not checked';
    const summary = health.summary || {};
    const status = String(health.status || 'unknown').replace(/_/g, ' ');
    const errors = Number(summary.errorCount) || 0;
    const warnings = Number(summary.warningCount) || 0;
    return `${status} | ${errors} errors | ${warnings} warnings`;
}

export function commitLoredeckStackMutation(mutator) {
    const state = getState();
    const current = getLoredeckStack(state);
    const next = current.map(item => ({ ...item }));
    mutator?.(next);
    const normalized = normalizeLoredeckStackPriority(next);
    if (JSON.stringify(current) === JSON.stringify(normalized)) return false;

    state.loredeckStack = normalized;
    clearCanonLoreDatabaseCache();
    clearContextIndexCache();
    saveState(state, { sanitize: false });
    refreshLoredeckSurfaces({ renderLibrary: false });
    if (isLoredeckLibraryOpen()) {
        refreshLoredeckLibraryAfterStackMutation();
    }
    return true;
}

export function normalizeLoredeckStackPriority(stack = []) {
    const output = [];
    const seen = new Set();
    for (const item of stack) {
        const type = getLoredeckStackItemType(item);
        const packId = String(item?.packId || item?.deckId || '').trim();
        const folderId = String(item?.folderId || '').trim();
        const key = getLoredeckStackItemKey({ type, packId, folderId });
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const normalized = {
            type,
            enabled: item.enabled !== false,
            priority: Math.max(1, 100 - output.length),
            locked: item.locked === true,
            addedAt: Number.isFinite(Number(item.addedAt)) ? Number(item.addedAt) : Date.now(),
        };
        if (type === 'folder') {
            normalized.folderId = folderId;
            normalized.includeNested = item.includeNested !== false;
            normalized.collapsed = item.collapsed === true;
        } else {
            normalized.packId = packId;
        }
        output.push(normalized);
    }
    return output;
}

export function addLoredeckToStack(packId) {
    const changed = commitLoredeckStackMutation(stack => {
        const existing = stack.find(item => getLoredeckStackItemKey(item) === createLoredeckStackDeckKey(packId));
        if (existing) {
            existing.enabled = true;
            return;
        }
        stack.push({
            type: 'deck',
            packId,
            enabled: true,
            priority: 1,
            locked: false,
            addedAt: Date.now(),
        });
    });
    return changed;
}

export function addLoredeckFolderToStack(folderId, libraryIndex = getLoredeckLibraryIndexForPacks()) {
    const id = String(folderId || '').trim();
    if (!id || id === 'unfiled') {
        toast('Only named Library folders can be added to the active stack.', 'warning');
        return false;
    }
    const folder = (libraryIndex.folders || []).find(item => item.id === id);
    if (!folder) {
        toast('That Library folder is no longer available.', 'warning');
        return false;
    }
    const changed = commitLoredeckStackMutation(stack => {
        const key = createLoredeckStackFolderKey(id);
        const existing = stack.find(item => getLoredeckStackItemKey(item) === key);
        if (existing) {
            existing.enabled = true;
            existing.includeNested = true;
            return;
        }
        stack.push({
            type: 'folder',
            folderId: id,
            includeNested: true,
            enabled: true,
            priority: 1,
            locked: false,
            addedAt: Date.now(),
        });
    });
    return changed;
}

export function setLoredeckEnabled(packId, enabled) {
    const changed = setLoredeckStackItemEnabled(createLoredeckStackDeckKey(packId), enabled);
    return changed;
}

export function setLoredeckStackItemEnabled(stackKey, enabled) {
    const key = String(stackKey || '').trim();
    const changed = commitLoredeckStackMutation(stack => {
        const item = stack.find(entry => getLoredeckStackItemKey(entry) === key);
        if (item) item.enabled = enabled !== false;
    });
    return changed;
}

export function setLoredeckStackItemCollapsed(stackKey, collapsed) {
    const key = String(stackKey || '').trim();
    const next = collapsed === true;
    const changed = commitLoredeckStackMutation(stack => {
        const item = stack.find(entry => getLoredeckStackItemKey(entry) === key);
        if (item && getLoredeckStackItemType(item) === 'folder') item.collapsed = next;
    });
    if (!changed) renderLoredeckLibraryOverlay();
    return changed;
}

export function moveLoredeckInStack(packId, direction) {
    return moveLoredeckStackItem(createLoredeckStackDeckKey(packId), direction);
}

export function moveLoredeckStackItem(stackKey, direction) {
    const key = String(stackKey || '').trim();
    const step = Number(direction) < 0 ? -1 : 1;
    const changed = commitLoredeckStackMutation(stack => {
        const index = stack.findIndex(item => getLoredeckStackItemKey(item) === key);
        const nextIndex = index + step;
        if (index < 0 || nextIndex < 0 || nextIndex >= stack.length) return;
        const [item] = stack.splice(index, 1);
        stack.splice(nextIndex, 0, item);
    });
    return changed;
}

export function reorderLoredeckInStack(packId, targetIndex) {
    return reorderLoredeckStackItem(createLoredeckStackDeckKey(packId), targetIndex);
}

export function reorderLoredeckStackItem(stackKey, targetIndex) {
    const key = String(stackKey || '').trim();
    const changed = commitLoredeckStackMutation(stack => {
        const index = stack.findIndex(item => getLoredeckStackItemKey(item) === key);
        if (index < 0) return;
        const nextIndex = Math.max(0, Math.min(stack.length - 1, Number(targetIndex)));
        if (!Number.isFinite(nextIndex) || nextIndex === index) return;
        const [item] = stack.splice(index, 1);
        stack.splice(nextIndex, 0, item);
    });
    return changed;
}

export function removeLoredeckFromStack(packId) {
    const changed = commitLoredeckStackMutation(stack => {
        const index = stack.findIndex(item => getLoredeckStackItemKey(item) === createLoredeckStackDeckKey(packId));
        if (index >= 0) stack.splice(index, 1);
    });
    return changed;
}

export function removeLoredeckStackItem(stackKey) {
    const key = String(stackKey || '').trim();
    const changed = commitLoredeckStackMutation(stack => {
        const index = stack.findIndex(item => getLoredeckStackItemKey(item) === key);
        if (index >= 0) stack.splice(index, 1);
    });
    return changed;
}

export function removeLoredecksFromStack(packIds = []) {
    const ids = new Set((packIds || []).map(id => String(id || '').trim()).filter(Boolean));
    if (!ids.size) return false;
    const changed = commitLoredeckStackMutation(stack => {
        for (let index = stack.length - 1; index >= 0; index -= 1) {
            if (ids.has(getLoredeckStackItemPackId(stack[index]))) stack.splice(index, 1);
        }
    });
    return changed;
}

export function buildPrunedLoredeckStack(stack = [], library = [], libraryIndex = {}) {
    const availablePackIds = new Set((Array.isArray(library) ? library : [])
        .map(pack => String(pack?.packId || pack?.id || '').trim())
        .filter(Boolean));
    const availableFolderIds = new Set((Array.isArray(libraryIndex?.folders) ? libraryIndex.folders : [])
        .map(folder => String(folder?.id || '').trim())
        .filter(Boolean));
    const removed = {
        deckCount: 0,
        folderCount: 0,
    };
    const next = [];
    for (const item of getLoredeckStack({ loredeckStack: stack })) {
        if (getLoredeckStackItemType(item) === 'folder') {
            const folderId = getLoredeckStackItemFolderId(item);
            if (!folderId || !availableFolderIds.has(folderId)) {
                removed.folderCount += 1;
                continue;
            }
            next.push(item);
            continue;
        }
        const packId = getLoredeckStackItemPackId(item);
        if (!packId || !availablePackIds.has(packId)) {
            removed.deckCount += 1;
            continue;
        }
        next.push(item);
    }
    return {
        stack: normalizeLoredeckStackPriority(next),
        removedDeckCount: removed.deckCount,
        removedFolderCount: removed.folderCount,
        removedCount: removed.deckCount + removed.folderCount,
    };
}

export function pruneUnavailableLoredeckStackItems(library = getLoredeckLibrary(), libraryIndex = getLoredeckLibraryIndexForPacks()) {
    const pruned = buildPrunedLoredeckStack(getLoredeckStack(), library, libraryIndex);
    if (!pruned.removedCount) {
        return {
            ...pruned,
            changed: false,
        };
    }
    const changed = commitLoredeckStackMutation(stack => {
        stack.splice(0, stack.length, ...pruned.stack);
    });
    return {
        ...pruned,
        changed,
    };
}
