/**
 * state-manager.js — Saga
 * State CRUD, settings I/O, migration, delta merging, export/import, and storage safety.
 * Reads reacquire from SillyTavern's context, with one-session migration caching so UI clicks do not repeatedly normalize the full lore matrix.
 *
 * Imports: constants.js
 * Imported by: src/extension/index.js, memo-builder.js, extractor.js, ui.js
 */

import {
    MODULE_KEY,
    DEFAULT_SETTINGS,
    getDefaultState,
    SCHEMA_VERSION,
    LOG_PREFIX,
} from './constants.js';
import { normalizeLoreContext, normalizeLoreMatrix, normalizeLoreEntry } from '../lorecards/lore-matrix.js';
import { normalizeLoreElevationRecords } from '../lorecards/lore-selection.js';
import { normalizeLoreRelevance, normalizeLoreCanon, normalizeLoreCategory, computeLocalLoreRelevance, normalizeLorePurpose, computeSpecificityScore } from '../lorecards/lore-relevance.js';
import { normalizeLoreTimeline } from '../lorecards/lore-timeline.js';
import { normalizeLoredeckCreatorRegistry } from './lore-creator-state.js';
import {
    clearDefaultHpLoredeckStackOnce,
    clearDefaultHpLoredeckFolderStack,
    cleanContextString,
    cloneLoredeckPlainObject,
    migrateLegacyHpLoredeckRegistry,
    migrateLegacyHpLoredeckState,
    normalizeContextBrief,
    normalizeLoredeckContext,
    normalizeLoredeckContexts,
    normalizeLoredeckHealthIssueStates,
    normalizeLoredeckPendingChanges,
    normalizeLoredeckRegistry,
    normalizeLoredeckStack,
    normalizeLoredeckTagRegistry,
    normalizeLoredeckTimelineRegistry,
} from './lore-state-normalizers.js';
export {
    normalizeContextBrief,
    normalizeLoredeckContext,
    normalizeLoredeckContexts,
    normalizeLoredeckHealthIssueStates,
    normalizeLoredeckPendingChanges,
    normalizeLoredeckRegistry,
    normalizeLoredeckStack,
    normalizeLoredeckTagRegistry,
    normalizeLoredeckTimelineRegistry,
} from './lore-state-normalizers.js';
import {
    appendStateBackupRecord,
    appendStateSafetyLog,
    cloneJsonForStateSafety,
    normalizeStateSafety,
} from './state-backup.js';
import { safeJsonSize, stripRetiredStateHistoryFields } from './storage-safety.js';
import { sanitizeLoreArraysForStorage } from './lore-storage-sanitizer.js';
import { recoverLegacyLoreContextStorage } from './lore-context-storage-recovery.js';
export { MAX_PENDING_LORE_ENTRIES } from './lore-storage-sanitizer.js';
import {
    getImportedStateSchemaError,
    serializeSagaStateExport,
    serializeStateExport,
    unwrapImportedSagaState,
} from './import-export.js';
import { queuePromptInjectionSync } from './prompt-sync.js';
import { captureChatOperation, getChatOperationIdentity } from './chat-operation.js';
import { getSettings, saveSettings } from './settings-store.js';
export { getSettings, saveSettings } from './settings-store.js';
import { createThemeLibraryStore } from './theme-library-store.js';
import {
    mergeExternalThemeIconSetLibraryRegistry,
    mergeExternalThemePackLibraryRegistry,
} from '../storage/saga-theme-icon-storage.js';
import {
    cleanMissingSagaStorageRecords,
    flushSagaStorageWrites,
    getSagaStorageDiagnostics as getStorageDiagnostics,
    verifySagaStorageDiagnostics as verifyStorageDiagnostics,
} from '../storage/saga-storage-diagnostics.js';
import {
    configureLoredeckCreatorStore,
    promoteChatLoredeckCreatorToSettings,
} from './lore-creator-store.js';
export {
    activateLoredeckCreatorJob,
    activateLoredeckCreatorJobAsync,
    clearLoredeckCreatorJob,
    getActiveLoredeckCreatorJob,
    getLoredeckCreatorProjectRegistry,
    getLoredeckCreatorRegistry,
    setLoredeckCreatorActiveGeneration,
    updateLoredeckCreatorGenerationRun,
    updateLoredeckCreatorGenerationUnit,
    updateLoredeckCreatorProject,
    upsertLoredeckCreatorJob,
} from './lore-creator-store.js';
import {
    configureLoredeckLibraryStore,
    promoteChatLoredeckRegistryToSettings,
} from './loredeck-library-store.js';
export {
    getLoredeckLibraryRegistry,
    importLoredeckLibraryRegistry,
    persistLoredeckLibraryLayout,
    removeLoredeckLibraryPack,
    upsertLoredeckLibraryPack,
} from './loredeck-library-store.js';
import { configureLoreGenerationStateStore } from './lore-generation-state.js';
export {
    acceptPendingLoreEntries,
    acceptPendingLoreEntry,
    appendPendingLoreEntries,
    checkpointLoreBulkChunk,
    flushLoreBulkFullCheckpoint,
    getLoredeckContext,
    markInterruptedLoreBulkChunks,
    markPendingLoreReplaced,
    markPendingLoreStale,
    patchPendingLoreMeta,
    recordLoreAttempt,
    rejectPendingLoreEntries,
    rejectPendingLoreEntry,
    resetLoredeckContext,
    restoreLoreTimelineEntriesToPending,
    setContextBrief,
    setLoreContext,
    setLoredeckContext,
    startLoreBulkBatch,
    storeLoreBulkCandidates,
    updateLoreBulkBatch,
    updateLoreBulkChunk,
} from './lore-generation-state.js';
import {
    disableRetiredContinuitySections,
    normalizeCompressionStatusNumbers,
    normalizeContinuityStructure,
    normalizeStateEntries,
} from './continuity-state.js';
export {
    applyDelta,
    validateDelta,
} from './continuity-state.js';

const MAX_CHAT_STATE_BYTES_BEFORE_AUTO_PERSIST = 200000;
const migratedStateRefs = new WeakSet();
const recoveredLoreContextStateRefs = new WeakSet();
const MOBILE_PRIMARY_PANEL_ROUTES = new Set(['loredecks', 'session', 'continuity', 'context', 'lore', 'injection', 'settings']);
const MOBILE_BOTTOM_PANEL_ROUTES = new Set(MOBILE_PRIMARY_PANEL_ROUTES);

function normalizeMobilePanelRouteForStorage(route, fallback = 'session') {
    const value = String(route || '').trim();
    return MOBILE_BOTTOM_PANEL_ROUTES.has(value) ? value : fallback;
}

function normalizeMobileSubviewStackForStorage(stack) {
    if (!Array.isArray(stack)) return [];
    return stack
        .filter(item => item && typeof item === 'object')
        .slice(-12)
        .map((item, index) => {
            const id = String(item.id || item.route || `subview-${index + 1}`).trim() || `subview-${index + 1}`;
            const title = String(item.title || item.label || id).trim() || id;
            const params = item.params && typeof item.params === 'object' && !Array.isArray(item.params)
                ? { ...item.params }
                : {};
            return { id, title, params };
        });
}

function normalizeLorePanelMobileState(panelState, defaultsPanel = getDefaultState().lorePanel) {
    if (!panelState || typeof panelState !== 'object') return;
    const mobile = panelState.mobile && typeof panelState.mobile === 'object' && !Array.isArray(panelState.mobile)
        ? panelState.mobile
        : {};
    const activeTabRoute = MOBILE_PRIMARY_PANEL_ROUTES.has(panelState.activeTab)
        ? panelState.activeTab
        : defaultsPanel.mobile.activeRoute;
    const activeRoute = normalizeMobilePanelRouteForStorage(mobile.activeRoute, activeTabRoute);
    const lastPrimaryRoute = MOBILE_PRIMARY_PANEL_ROUTES.has(mobile.lastPrimaryRoute)
        ? mobile.lastPrimaryRoute
        : (MOBILE_PRIMARY_PANEL_ROUTES.has(activeRoute) ? activeRoute : defaultsPanel.mobile.lastPrimaryRoute);
    const stacks = mobile.subviewStacks && typeof mobile.subviewStacks === 'object' && !Array.isArray(mobile.subviewStacks)
        ? mobile.subviewStacks
        : {};
    panelState.mobile = {
        activeRoute,
        lastPrimaryRoute,
        subviewStacks: {
            loredecks: normalizeMobileSubviewStackForStorage(stacks.loredecks),
            session: normalizeMobileSubviewStackForStorage(stacks.session),
            continuity: normalizeMobileSubviewStackForStorage(stacks.continuity),
            context: normalizeMobileSubviewStackForStorage(stacks.context),
            lore: normalizeMobileSubviewStackForStorage(stacks.lore),
            injection: normalizeMobileSubviewStackForStorage(stacks.injection),
            settings: normalizeMobileSubviewStackForStorage(stacks.settings),
        },
    };
}

configureLoreGenerationStateStore({
    getState: () => getState(),
    saveState: (state, options) => saveState(state, options),
    getSettings: () => getSettings(),
    getDefaultState: () => getDefaultState(),
});

configureLoredeckCreatorStore({
    getState: () => getState(),
    saveState: (state, options) => saveState(state, options),
    getSettings: () => getSettings(),
    saveSettings: settings => saveSettings(settings),
    getDefaultState: () => getDefaultState(),
});

configureLoredeckLibraryStore({
    getState: () => getState(),
    saveState: (state, options) => saveState(state, options),
    getSettings: () => getSettings(),
    saveSettings: settings => saveSettings(settings),
    getDefaultState: () => getDefaultState(),
});

function migrateLoreEntryToRelevance(entry = {}, state = {}) {
    const normalized = normalizeLoreEntry(entry);
    const local = computeLocalLoreRelevance(normalized, state, getSettings());
    const previousState = normalized.lifecycle?.status || normalized.lifecycle?.computedStatus || entry.status || '';
    let relevance = normalizeLoreRelevance(entry.relevance || previousState || local.relevance || 'normal');
    if (!entry.relevance) {
        if (['expired', 'archived', 'muted', 'blocked'].includes(String(previousState || '').toLowerCase())) relevance = 'low';
        else if (['active', 'canon_overdue'].includes(String(previousState || '').toLowerCase())) relevance = local.relevance === 'low' ? 'normal' : local.relevance;
        else relevance = local.relevance || relevance;
    }
    const canon = normalizeLoreCanon(entry.canon || entry.canonStatus || normalized.canon, normalized.source || normalized.sourceInfo?.work || '');
    return normalizeLoreEntry({
        ...normalized,
        relevance,
        canon,
        canonStatus: canon,
        category: normalizeLoreCategory(normalized.category),
        extensions: {
            ...(normalized.extensions || {}),
            relevanceMigration: {
                ...(normalized.extensions?.relevanceMigration || {}),
                migratedAt: Date.now(),
                previousLifecycleStatus: previousState || '',
                localRelevanceScore: local.score || 0,
                temporalRole: local.temporalRole || '',
            },
        },
    });
}

function migrateLoreCollectionsToRelevance(state = {}) {
    if (Array.isArray(state.loreMatrix)) state.loreMatrix = state.loreMatrix.map(entry => migrateLoreEntryToRelevance(entry, state));
    if (Array.isArray(state.pendingLoreEntries)) state.pendingLoreEntries = state.pendingLoreEntries.map(entry => migrateLoreEntryToRelevance(entry, state));
    return state;
}

function ensureTierCompressionStatus(state = {}) {
    const defaults = getDefaultState().loreCompressionStatusByRelevance;
    if (!state.loreCompressionStatusByRelevance || typeof state.loreCompressionStatusByRelevance !== 'object') {
        state.loreCompressionStatusByRelevance = JSON.parse(JSON.stringify(defaults));
    } else {
        state.loreCompressionStatusByRelevance = mergeDefaults(state.loreCompressionStatusByRelevance, defaults);
    }
    for (const tier of ['high', 'normal', 'low']) {
        if (!state.loreCompressionStatusByRelevance[tier] || typeof state.loreCompressionStatusByRelevance[tier] !== 'object') {
            state.loreCompressionStatusByRelevance[tier] = { ...defaults[tier] };
        } else {
            state.loreCompressionStatusByRelevance[tier] = mergeDefaults(state.loreCompressionStatusByRelevance[tier], defaults[tier]);
        }
        normalizeCompressionStatusNumbers(state.loreCompressionStatusByRelevance[tier]);
    }
}

const themeLibraryStore = createThemeLibraryStore({
    getSettings: () => getSettings(),
    saveSettings: settings => saveSettings(settings),
});

export function getThemePackLibraryRegistry() {
    return mergeExternalThemePackLibraryRegistry(themeLibraryStore.getThemePackLibraryRegistry());
}

export function getThemeIconSetLibraryRegistry() {
    return mergeExternalThemeIconSetLibraryRegistry(themeLibraryStore.getThemeIconSetLibraryRegistry());
}

export function upsertThemePackLibraryPack(packRecord = {}) {
    return themeLibraryStore.upsertThemePackLibraryPack(packRecord);
}

export function removeThemePackLibraryPack(themeId, options = {}) {
    return themeLibraryStore.removeThemePackLibraryPack(themeId, options);
}

export function importThemePackLibraryRegistry(registry = {}, options = {}) {
    return themeLibraryStore.importThemePackLibraryRegistry(registry, options);
}

export function upsertThemeIconSetLibraryPack(iconSetRecord = {}) {
    return themeLibraryStore.upsertThemeIconSetLibraryPack(iconSetRecord);
}

export function removeThemeIconSetLibraryPack(iconSetId, options = {}) {
    return themeLibraryStore.removeThemeIconSetLibraryPack(iconSetId, options);
}

export function importThemeIconSetLibraryRegistry(registry = {}, options = {}) {
    return themeLibraryStore.importThemeIconSetLibraryRegistry(registry, options);
}

function migrateBucket(container, bucketName = 'storage') {
    if (!container || typeof container !== 'object') return null;
    const current = container[MODULE_KEY];
    if (current && typeof current === 'object') return current;
    container[MODULE_KEY] = {};
    return container[MODULE_KEY];
}

// ── State I/O ───────────────────────────────────────────────────────────────────

const stateChatOwners = new WeakMap();
const boundPersistenceQueues = new WeakMap();

function invokeBoundPersistence(operation, invoke) {
    let queues = boundPersistenceQueues.get(operation.metadata);
    if (!queues) { queues = new Map(); boundPersistenceQueues.set(operation.metadata, queues); }
    const previous = queues.get(operation.identity);
    const guardedInvoke = () => { operation.assertCurrent(); return invoke(); };
    const pending = previous ? previous.then(guardedInvoke) : guardedInvoke();
    if (!pending || typeof pending.then !== 'function') return pending;
    // The sequencing tail consumes failures; each caller observes its own result.
    let tail;
    const release = () => { if (queues.get(operation.identity) === tail) queues.delete(operation.identity); };
    tail = Promise.resolve(pending).then(release, release);
    queues.set(operation.identity, tail);
    return pending;
}

/**
 * Reads chatMetadata.saga, migrates if needed, merges with
 * defaults, and returns the live state object. Always reacquires from
 * SillyTavern.getContext().
 * @returns {Object} SagaState
 */
export function getState() {
    const ctx = SillyTavern.getContext();
    if (!ctx || !ctx.chatMetadata) {
        console.warn(`${LOG_PREFIX} chatMetadata not available, returning default state`);
        return getDefaultState();
    }
    const { chatMetadata } = ctx;
    let state = migrateBucket(chatMetadata, 'chatMetadata');
    const previousOwner = stateChatOwners.get(state);
    if (previousOwner && (previousOwner.metadata !== chatMetadata || previousOwner.identity !== getChatOperationIdentity(ctx))) {
        // Some hosts reuse metadata objects across chats. Keep references already
        // handed to A separate from the live state subsequently read for B.
        state = cloneJsonForStateSafety(state, getDefaultState());
        chatMetadata[MODULE_KEY] = state;
    }
    if (!state || typeof state !== 'object' || Object.keys(state).length === 0) {
        state = getDefaultState();
        chatMetadata[MODULE_KEY] = state;
        migratedStateRefs.add(state);
        stateChatOwners.set(state, { metadata: chatMetadata, identity: getChatOperationIdentity(ctx) });
        return state;
    }

    // Fast path: once a state object has been migrated/sanitized in this browser
    // session, do not repeat full migration/normalization on every UI click.
    // saveState() still sanitizes before persistence, and a new chat/state object
    // naturally misses this WeakSet and gets migrated once.
    if (migratedStateRefs.has(state)) {
        stateChatOwners.set(state, { metadata: chatMetadata, identity: getChatOperationIdentity(ctx) });
        return state;
    }

    // Always run migration on first read. If migration/compaction shrinks an oversized
    // Saga block, persist immediately so a poisoned chat does not keep
    // rehydrating the same megabyte-scale pending lore payload.
    const beforeSize = safeJsonSize(state);
    const beforeVersion = Number.isFinite(Number(state._version)) ? Number(state._version) : 0;
    if (beforeVersion < SCHEMA_VERSION) {
        appendStateBackupRecord(state, 'before_schema_migration', {
            label: `Schema ${beforeVersion || 'unknown'} -> ${SCHEMA_VERSION}`,
            snapshotState: state,
        });
    }
    state = migrateState(state);
    if (beforeVersion < SCHEMA_VERSION) {
        appendStateSafetyLog(state, {
            type: 'schema_migration',
            message: `Saga state normalized from schema ${beforeVersion || 'unknown'} to ${SCHEMA_VERSION}.`,
            fromVersion: beforeVersion,
            toVersion: SCHEMA_VERSION,
        });
    }
    state = sanitizeLoreArraysForStorage(state);
    if (state.lastDelta === undefined) state.lastDelta = null;
    stripRetiredStateHistoryFields(state);
    chatMetadata[MODULE_KEY] = state;
    migratedStateRefs.add(state);
    stateChatOwners.set(state, { metadata: chatMetadata, identity: getChatOperationIdentity(ctx) });

    const afterSize = safeJsonSize(state);
    if (beforeSize > 0 && (recoveredLoreContextStateRefs.has(state) || afterSize < beforeSize || beforeSize > MAX_CHAT_STATE_BYTES_BEFORE_AUTO_PERSIST)) {
        const requested = saveState(state, { sanitize: false, syncPrompt: false });
        Promise.resolve(requested.persistence || requested).then(result => {
            if (result.status === 'failed') console.warn(`${LOG_PREFIX} Failed to persist compacted Saga state on read`, result.error);
        }).catch(error => console.warn(`${LOG_PREFIX} Failed to persist compacted Saga state on read`, error));
    }
    return state;
}

/**
 * Writes state to chatMetadata.saga and persists via saveMetadata().
 * @param {Object} state - SagaState to save
 */
export function saveState(state, options = {}) {
    const { syncPrompt = true, sanitize = true } = options || {};
    const operation = options.operation || captureChatOperation({ requireEnabled: false });
    const ctx = operation.context;
    const owner = stateChatOwners.get(state);
    if (!operation.isCurrent() || (owner && (owner.metadata !== operation.metadata || owner.identity !== operation.identity))) {
        if (!options.operation) operation.release();
        return { ok: false, persisted: false, status: 'cancelled', operationId: operation.id, error: 'The originating chat is no longer current.' };
    }
    if (!ctx || !ctx.chatMetadata) {
        console.warn(`${LOG_PREFIX} chatMetadata not available, cannot save state`);
        if (!options.operation) operation.release();
        return { ok: false, persisted: false, status: 'unavailable', operationId: operation.id, error: 'Chat metadata is unavailable.' };
    }
    const { chatMetadata, saveMetadata } = ctx;
    if (!state._version) {
        state._version = SCHEMA_VERSION;
    }
    if (sanitize !== false) {
        state = sanitizeLoreArraysForStorage(state);
    }
    state.stateSafety = normalizeStateSafety(state.stateSafety);
    stripRetiredStateHistoryFields(state);
    chatMetadata[MODULE_KEY] = state;
    migratedStateRefs.add(state);
    stateChatOwners.set(state, { metadata: chatMetadata, identity: operation.identity });
    const adapter = options.persistenceAdapter || ctx.sagaPersistence;
    const originBound = adapter?.originBound === true && typeof adapter.saveState === 'function';
    const result = { ok: false, persisted: false, status: 'pending', operationId: operation.id, state,
        originBinding: originBound ? 'capability' : 'legacy_host_request' };
    const settle = (error, acknowledged = false) => {
        const current = operation.isCurrent();
        result.ok = !error && current;
        result.persisted = !error && acknowledged;
        result.status = error ? 'failed' : !current ? 'cancelled' : acknowledged ? 'persisted' : 'unverified';
        if (error) result.error = error?.message || String(error);
        else if (!current) result.error = 'The originating chat changed before persistence completed.';
        else if (!acknowledged) result.error = 'The host cannot verify that this chat state was persisted. Export State keeps a recoverable copy.';
        operation.persistenceStatus = result.status;
        if (result.ok && syncPrompt !== false) queuePromptInjectionSync({ isCurrent: () => operation.isCurrent() });
        if (!options.operation) operation.release();
        return { ...result, persistence: undefined };
    };
    const acknowledge = acknowledgement => {
        if (acknowledgement === false || acknowledgement?.ok === false) {
            return settle(new Error(acknowledgement?.error || 'The host refused metadata persistence.'));
        }
        return settle(null, originBound && acknowledgement?.ok === true && acknowledgement?.persisted === true);
    };
    try {
        if (!originBound && typeof saveMetadata !== 'function') {
            settle(new Error('The host metadata persistence API is unavailable.'));
        } else {
            const snapshot = originBound ? cloneJsonForStateSafety(chatMetadata, null) : null;
            if (originBound && !snapshot) throw new Error('Chat metadata cannot be serialized for bound persistence.');
            const pending = originBound ? invokeBoundPersistence(operation, () => adapter.saveState({
                snapshot,
                origin: { chatId: operation.identity, characterId: ctx.characterId ?? null, groupId: ctx.groupId ?? null,
                    operationId: operation.id, generation: operation.generation },
                signal: operation.signal,
            })) : saveMetadata.call(ctx);
            if (pending && typeof pending.then === 'function') result.persistence = Promise.resolve(pending).then(acknowledge, settle);
            else acknowledge(pending);
        }
    } catch (error) { settle(error); }
    // The compatibility API never leaves a rejected host Promise unobserved.
    return result;
}

/** Explicit durable acknowledgement; synchronous saveState remains an optimistic API. */
export async function saveStateDurable(state, options = {}) {
    const result = saveState(state, options);
    return awaitStatePersistence(result);
}

async function awaitStatePersistence(result) {
    const settled = result.persistence ? await result.persistence : result;
    return { ...settled, ok: settled.ok === true && settled.persisted === true };
}

// ── State migration ─────────────────────────────────────────────────────────────

/**
 * Checks _version and applies migration steps to bring old state objects
 * forward to the current schema version.
 * @param {Object} state - Raw state from storage (may be any schema version)
 * @returns {Object} Migrated SagaState
 */
export function migrateState(state) {
    const defaults = getDefaultState();
    if (!state || typeof state !== 'object') {
        return defaults;
    }
    // Recover only raw old storage evidence, before any migration normalizes lore.
    // Keep a marker because the required migration backup can outweigh the repair.
    if (recoverLegacyLoreContextStorage(state)) recoveredLoreContextStateRefs.add(state);

    // Version 0 (no _version) → Version 1
    if (!state._version || state._version < 1) {
        // Ensure canon block exists
        if (!state.canon) state.canon = { ...defaults.canon };
        else {
            state.canon.era = state.canon.era || '';
            state.canon.inUniverseDate = state.canon.inUniverseDate || '';
            state.canon.canonBoundary = state.canon.canonBoundary || '';
            if (!Array.isArray(state.canon.divergences)) state.canon.divergences = [];
        }

        // Ensure scene block exists
        if (!state.scene) state.scene = { ...defaults.scene };
        else {
            state.scene.location = state.scene.location || '';
            state.scene.timeOfDay = state.scene.timeOfDay || '';
            state.scene.weather = state.scene.weather || '';
            if (!Array.isArray(state.scene.presentCharacters)) state.scene.presentCharacters = [];
            if (!Array.isArray(state.scene.nearbyCharacters)) state.scene.nearbyCharacters = [];
            state.scene.currentActivity = state.scene.currentActivity || '';
        }

        // Ensure knowledge exists
        if (!state.knowledge || typeof state.knowledge !== 'object' || Array.isArray(state.knowledge)) {
            state.knowledge = {};
        }

        // Ensure arrays exist
        if (!Array.isArray(state.secrets)) state.secrets = [];
        if (!Array.isArray(state.relationships)) state.relationships = [];
        if (!Array.isArray(state.threads)) state.threads = [];
        if (!Array.isArray(state.continuityFlags)) state.continuityFlags = [];
        if (state.lastDelta === undefined) state.lastDelta = null;

        state._version = 1;
    }

    stripRetiredStateHistoryFields(state);

    // ── Schema v1 → v2: Lore Matrix migration ───────────────────────────────
    if (state._version < 2) {
        const defaults = getDefaultState();

        // Add loreContext if missing
        state.loreContext = normalizeLoreContext(state.loreContext || {});
        if (!state.loreContext.sceneDate && state.canon?.inUniverseDate) {
            state.loreContext.sceneDate = state.canon.inUniverseDate;
        }
        if (!state.loreContext.canonBoundary && state.canon?.canonBoundary) {
            state.loreContext.canonBoundary = state.canon.canonBoundary;
        }

        // Add loreMatrix if missing
        if (!Array.isArray(state.loreMatrix)) {
            state.loreMatrix = [];
        } else {
            state.loreMatrix = normalizeLoreMatrix(state.loreMatrix);
        }

        // Add pendingLoreEntries if missing
        if (!Array.isArray(state.pendingLoreEntries)) {
            state.pendingLoreEntries = [];
        } else {
            state.pendingLoreEntries = normalizeLoreMatrix(state.pendingLoreEntries);
        }

        state._version = 2;
    }

    // ── Schema v2 → v3: Lore generation lifecycle ledger ───────────────────
    if (state._version < 3) {
        const defaults = getDefaultState();

        // Add loreGeneration ledger if missing
        if (!state.loreGeneration || typeof state.loreGeneration !== 'object') {
            state.loreGeneration = { ...defaults.loreGeneration };
        } else {
            state.loreGeneration.lastAttemptedFor = state.loreGeneration.lastAttemptedFor || '';
            state.loreGeneration.lastProposedFor = state.loreGeneration.lastProposedFor || '';
            state.loreGeneration.lastAcceptedFor = state.loreGeneration.lastAcceptedFor || '';
            state.loreGeneration.lastRejectedFor = state.loreGeneration.lastRejectedFor || '';
            state.loreGeneration.lastFailedFor = state.loreGeneration.lastFailedFor || '';
            if (!state.loreGeneration.attempts || typeof state.loreGeneration.attempts !== 'object') {
                state.loreGeneration.attempts = {};
            }
        }

        // Add pendingLoreMeta if missing (preserve existing null)
        if (state.pendingLoreMeta === undefined) {
            state.pendingLoreMeta = null;
        } else if (state.pendingLoreMeta && typeof state.pendingLoreMeta !== 'object') {
            state.pendingLoreMeta = null;
        } else if (state.pendingLoreMeta && state.pendingLoreEntries?.length === 0) {
            // Stale metadata with no actual pending entries — clean up
            state.pendingLoreMeta = null;
        }

        state._version = 3;
    }

    // ── Schema v4: lore panel UI state and lore selection ────────────────────
    if (state._version < 4) {
        const defaults = getDefaultState();
        state.lorePanel = mergeDefaults(state.lorePanel, defaults.lorePanel);
        state.loreSelection = mergeDefaults(state.loreSelection, defaults.loreSelection);
        state._version = 4;
    }

    // ── Schema v5: expanded editable continuity state and split injection preview ─────────
    if (state._version < 5) {
        const defaults = getDefaultState();
        state.continuityConfig = { ...defaults.continuityConfig, ...(state.continuityConfig || {}) };
        state.characters = Array.isArray(state.characters) ? state.characters : [];
        state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
        state.objectives = Array.isArray(state.objectives) ? state.objectives : [];
        state.continuityCompressionStatus = state.continuityCompressionStatus || defaults.continuityCompressionStatus;
        state._version = 5;
    }

    // ── Schema v7: local canon lore database status ─────────────────────────
    if (state._version < 7) {
        const defaults = getDefaultState();
        state.canonLoreDatabase = mergeDefaults(state.canonLoreDatabase, defaults.canonLoreDatabase);
        state._version = 7;
    }

    // ── Schema v8: resumable bulk lore scan ledger ─────────────────────────
    if (state._version < 8) {
        const defaults = getDefaultState();
        state.loreBulkGeneration = mergeDefaults(state.loreBulkGeneration, defaults.loreBulkGeneration);
        state._version = 8;
    }

    // ── Schema v9: resumable checkpointed continuity scan ledger ───────────
    if (state._version < 9) {
        const defaults = getDefaultState();
        state.continuityScan = mergeDefaults(state.continuityScan, defaults.continuityScan);
        state._version = 9;
    }

    // ── Schema v10: streamlined live continuity sections ─────────────────────
    if (state._version < 10) {
        disableRetiredContinuitySections(state);
        state._version = 10;
    }

    // ── Schema v12: relevance-tiered lore injection and simplified Canon/AU metadata ──
    if (state._version < 12) {
        migrateLoreCollectionsToRelevance(state);
        ensureTierCompressionStatus(state);
        state._version = 12;
    }

    // ── Schema v13: Auto-Relevance suggestions and no lifecycle-driven auto-mute ──
    if (state._version < 13) {
        state.autoRelevanceSuggestions = Array.isArray(state.autoRelevanceSuggestions) ? state.autoRelevanceSuggestions : [];
        state.autoRelevanceLastRun = state.autoRelevanceLastRun || null;
        if (Array.isArray(state.loreMatrix)) {
            state.loreMatrix = state.loreMatrix.map(entry => ({
                ...entry,
                lifecycle: {
                    ...(entry.lifecycle || {}),
                    autoMutedOnExpire: false,
                },
            }));
        }
        state._version = 13;
    }

    // ── Schema v14: Auto-Relevance model adjudication and per-suggestion review ──
    if (state._version < 14) {
        state.autoRelevanceSuggestions = Array.isArray(state.autoRelevanceSuggestions) ? state.autoRelevanceSuggestions.map(s => ({
            ...s,
            source: s.source || 'local',
        })) : [];
        state.autoRelevanceLastRun = state.autoRelevanceLastRun || null;
        state._version = 14;
    }

    // ── Schema v15: strict specific-lore purpose metadata ───────────────────
    if (state._version < 15) {
        if (Array.isArray(state.loreMatrix)) {
            state.loreMatrix = state.loreMatrix.map(entry => ({
                ...entry,
                lorePurpose: normalizeLorePurpose(entry?.lorePurpose || entry?.purpose, entry),
                specificityScore: Number.isFinite(Number(entry?.specificityScore)) ? Math.max(0, Math.min(100, Number(entry.specificityScore))) : computeSpecificityScore(entry),
                injectableByDefault: entry?.injectableByDefault !== false,
            }));
        }
        if (Array.isArray(state.pendingLoreEntries)) {
            state.pendingLoreEntries = state.pendingLoreEntries.map(entry => ({
                ...entry,
                lorePurpose: normalizeLorePurpose(entry?.lorePurpose || entry?.purpose, entry),
                specificityScore: Number.isFinite(Number(entry?.specificityScore)) ? Math.max(0, Math.min(100, Number(entry.specificityScore))) : computeSpecificityScore(entry),
                injectableByDefault: entry?.injectableByDefault !== false,
            }));
        }
        state._version = 15;
    }

    // ── Schema v16: runtime rail + anchored drawer layout ────────────────
    if (state._version < 16) {
        const defaults = getDefaultState();
        const previousPanel = state.lorePanel && typeof state.lorePanel === 'object' ? { ...state.lorePanel } : {};
        const hadDrawerOpen = Object.prototype.hasOwnProperty.call(previousPanel, 'drawerOpen');
        state.lorePanel = mergeDefaults(previousPanel, defaults.lorePanel);
        state.lorePanel.railMode = previousPanel.railMode === 'expanded' ? 'expanded' : defaults.lorePanel.railMode;
        state.lorePanel.drawerOpen = hadDrawerOpen ? previousPanel.drawerOpen === true : previousPanel.collapsed !== true;
        state.lorePanel.collapsed = state.lorePanel.drawerOpen !== true;
        state.lorePanel.railX = Number.isFinite(Number(previousPanel.railX)) ? Number(previousPanel.railX) : (Number.isFinite(Number(previousPanel.x)) ? Number(previousPanel.x) : defaults.lorePanel.railX);
        state.lorePanel.railY = Number.isFinite(Number(previousPanel.railY)) ? Number(previousPanel.railY) : (Number.isFinite(Number(previousPanel.y)) ? Number(previousPanel.y) : defaults.lorePanel.railY);
        state.lorePanel.drawerWidth = Number.isFinite(Number(previousPanel.drawerWidth)) ? Number(previousPanel.drawerWidth) : (Number.isFinite(Number(previousPanel.width)) ? Number(previousPanel.width) : defaults.lorePanel.drawerWidth);
        state.lorePanel.drawerHeight = Number.isFinite(Number(previousPanel.drawerHeight)) ? Number(previousPanel.drawerHeight) : (Number.isFinite(Number(previousPanel.height)) ? Number(previousPanel.height) : defaults.lorePanel.drawerHeight);
        state.lorePanel.drawerDirection = ['auto', 'right', 'left'].includes(previousPanel.drawerDirection) ? previousPanel.drawerDirection : defaults.lorePanel.drawerDirection;
        state.lorePanel.x = state.lorePanel.railX;
        state.lorePanel.y = state.lorePanel.railY;
        state.lorePanel.width = state.lorePanel.drawerWidth;
        state.lorePanel.height = state.lorePanel.drawerHeight;
        state._version = 16;
    }

    // Schema v18: lore event timeline owns lore recovery metadata.
    if (state._version < 18) {
        state.loreTimeline = normalizeLoreTimeline(state.loreTimeline || getDefaultState().loreTimeline);
        state._version = 18;
    }

    // Schema v19: Saga Loredeck stack/context scaffolding
    if (state._version < 19) {
        state.loredeckStack = normalizeLoredeckStack(state.loredeckStack);
        state.loredeckContexts = normalizeLoredeckContexts(state.loredeckContexts, state);
        state._version = 19;
    }

    // Schema v20: Saga Loredeck registry for bundled/custom/generated library metadata
    if (state._version < 20) {
        state.loredeckRegistry = normalizeLoredeckRegistry(state.loredeckRegistry);
        state._version = 20;
    }

    // Schema v21: normalized per-Loredeck Context state
    if (state._version < 21) {
        state.loredeckContexts = normalizeLoredeckContexts(state.loredeckContexts, state);
        state._version = 21;
    }

    // Schema v22: replace the monolithic bundled HP Loredeck with the split HP family
    if (state._version < 22) {
        migrateLegacyHpLoredeckState(state);
        state._version = 22;
    }

    // Schema v23: persistent, resumable Deck Maker jobs
    if (state._version < 23) {
        state.loredeckCreator = normalizeLoredeckCreatorRegistry(state.loredeckCreator || getDefaultState().loredeckCreator);
        state._version = 23;
    }

    // Schema v24: generalized Context Brief plus richer Loredeck Context fields
    if (state._version < 24) {
        state.contextBrief = normalizeContextBrief(state.contextBrief || {}, state.loreContext || {});
        state.loredeckContexts = normalizeLoredeckContexts(state.loredeckContexts, state);
        state._version = 24;
    }

    // Schema v25: Lore Automation run journal and per-card automation eligibility
    if (state._version < 25) {
        state.loreAutomationSuggestions = Array.isArray(state.loreAutomationSuggestions) ? state.loreAutomationSuggestions : [];
        state.loreAutomationRuns = Array.isArray(state.loreAutomationRuns) ? state.loreAutomationRuns : [];
        state.loreAutomationLastRun = state.loreAutomationLastRun || null;
        if (Array.isArray(state.loreMatrix)) {
            state.loreMatrix = state.loreMatrix.map(entry => ({
                ...entry,
                extensions: (() => {
                    const legacyManualLock = entry.extensions?.autoRelevance?.mode === 'manual'
                        || entry.extensions?.autoRelevance?.locked === true;
                    const existingAutomation = entry.extensions?.loreAutomation || {};
                    const enabled = existingAutomation.enabled === undefined
                        ? !legacyManualLock
                        : existingAutomation.enabled !== false;
                    return {
                        ...(entry.extensions || {}),
                        loreAutomation: {
                            enabled,
                            enabledAt: Number(existingAutomation.enabledAt || 0) || 0,
                            enabledBy: existingAutomation.enabledBy || (enabled ? 'migration' : ''),
                            disabledReason: existingAutomation.disabledReason || (enabled ? '' : 'legacy_manual_relevance'),
                            disabledAt: Number(existingAutomation.disabledAt || 0) || 0,
                            disabledBy: existingAutomation.disabledBy || (enabled ? '' : 'migration'),
                            lastAction: existingAutomation.lastAction || '',
                            lastReason: existingAutomation.lastReason || entry.extensions?.autoRelevance?.reason || '',
                            lastRunId: existingAutomation.lastRunId || '',
                            lastTouchedAt: Number(existingAutomation.lastTouchedAt || entry.extensions?.autoRelevance?.updatedAt || 0) || 0,
                            lastProvider: existingAutomation.lastProvider || entry.extensions?.autoRelevance?.mode || '',
                            owner: existingAutomation.owner || (entry.extensions?.sagaGeneration ? 'generated' : 'imported'),
                        },
                    };
                })(),
            }));
        }
        state._version = 25;
    }

    // Schema v26: narrative-movement cadence for Lore Automation
    if (state._version < 26) {
        state.loreAutomationCadence = {
            ...getDefaultState().loreAutomationCadence,
            ...(state.loreAutomationCadence && typeof state.loreAutomationCadence === 'object' && !Array.isArray(state.loreAutomationCadence)
                ? state.loreAutomationCadence
                : {}),
        };
        state._version = 26;
    }

    // Schema v27: Lorecards workspace defaults to A/P/R with Alphabetical active.
    if (state._version < 27) {
        state.lorePanel = mergeDefaults(state.lorePanel, getDefaultState().lorePanel);
        state.lorePanel.lorecardWorkspaceSort = 'alphabetical';
        state._version = 27;
    }

    // Schema v28: empty legacy Context artifacts were recovered before normalization.
    if (state._version < 28) state._version = 28;

    // ── Always normalize lore fields post-migration ────────────────────────
    // First compact known-heavy canon DB payloads and oversized pending batches so
    // a poisoned chat can recover instead of freezing during panel render/save.
    sanitizeLoreArraysForStorage(state);
    // Even v4 states can become malformed through manual editing or old imports.
    state.loreContext = normalizeLoreContext(state.loreContext || {});
    state.contextBrief = normalizeContextBrief(state.contextBrief || {}, state.loreContext || {});
    state.loreMatrix = normalizeLoreMatrix(state.loreMatrix || []);
    state.pendingLoreEntries = normalizeLoreMatrix(state.pendingLoreEntries || []);
    state.loreTimeline = normalizeLoreTimeline(state.loreTimeline || {});
    state.loreAutomationSuggestions = Array.isArray(state.loreAutomationSuggestions) ? state.loreAutomationSuggestions : [];
    state.loreAutomationRuns = Array.isArray(state.loreAutomationRuns) ? state.loreAutomationRuns : [];
    state.loreAutomationLastRun = state.loreAutomationLastRun || null;
    state.loreAutomationCadence = {
        ...getDefaultState().loreAutomationCadence,
        ...(state.loreAutomationCadence && typeof state.loreAutomationCadence === 'object' && !Array.isArray(state.loreAutomationCadence)
            ? state.loreAutomationCadence
            : {}),
    };
    sanitizeLoreArraysForStorage(state);

    normalizeContinuityStructure(state);
    state.stateSafety = normalizeStateSafety(state.stateSafety || {});
    migrateLegacyHpLoredeckState(state);
    clearDefaultHpLoredeckStackOnce(state);
    state.loredeckStack = normalizeLoredeckStack(state.loredeckStack);
    state.loredeckRegistry = normalizeLoredeckRegistry(state.loredeckRegistry);
    state.loredeckCreator = normalizeLoredeckCreatorRegistry(state.loredeckCreator || getDefaultState().loredeckCreator);
    promoteChatLoredeckRegistryToSettings(state);
    promoteChatLoredeckCreatorToSettings(state);
    state.loredeckContexts = normalizeLoredeckContexts(state.loredeckContexts, state);

    if (!state.loreCompressionStatus || typeof state.loreCompressionStatus !== 'object') {
        state.loreCompressionStatus = getDefaultState().loreCompressionStatus;
    } else {
        const defaults = getDefaultState().loreCompressionStatus;
        state.loreCompressionStatus = mergeDefaults(state.loreCompressionStatus, defaults);
        normalizeCompressionStatusNumbers(state.loreCompressionStatus);
    }
    ensureTierCompressionStatus(state);

    // Normalize lorePanel
    if (!state.lorePanel || typeof state.lorePanel !== 'object') {
        state.lorePanel = getDefaultState().lorePanel;
    } else {
        const defaultsPanel = getDefaultState().lorePanel;
        state.lorePanel.isOpen = state.lorePanel.isOpen === true;
        state.lorePanel.hasOpenedRuntime = state.lorePanel.hasOpenedRuntime === true || state.lorePanel.isOpen === true;
        state.lorePanel.launcherDismissed = state.lorePanel.launcherDismissed === true;
        state.lorePanel.firstOpenedAt = Number.isFinite(Number(state.lorePanel.firstOpenedAt)) ? Number(state.lorePanel.firstOpenedAt) : defaultsPanel.firstOpenedAt;
        state.lorePanel.lastOpenedAt = Number.isFinite(Number(state.lorePanel.lastOpenedAt)) ? Number(state.lorePanel.lastOpenedAt) : defaultsPanel.lastOpenedAt;
        state.lorePanel.railMode = state.lorePanel.railMode === 'expanded' ? 'expanded' : 'compact';
        state.lorePanel.drawerOpen = state.lorePanel.drawerOpen === true;
        state.lorePanel.collapsed = state.lorePanel.drawerOpen !== true;
        state.lorePanel.drawerDirection = ['auto', 'right', 'left'].includes(state.lorePanel.drawerDirection) ? state.lorePanel.drawerDirection : 'auto';
        state.lorePanel.railX = Number.isFinite(Number(state.lorePanel.railX)) ? Number(state.lorePanel.railX) : (Number.isFinite(Number(state.lorePanel.x)) ? Number(state.lorePanel.x) : defaultsPanel.railX);
        state.lorePanel.railY = Number.isFinite(Number(state.lorePanel.railY)) ? Number(state.lorePanel.railY) : (Number.isFinite(Number(state.lorePanel.y)) ? Number(state.lorePanel.y) : defaultsPanel.railY);
        state.lorePanel.drawerWidth = Number.isFinite(Number(state.lorePanel.drawerWidth)) && Number(state.lorePanel.drawerWidth) >= 320 ? Number(state.lorePanel.drawerWidth) : (Number.isFinite(Number(state.lorePanel.width)) ? Number(state.lorePanel.width) : defaultsPanel.drawerWidth);
        state.lorePanel.drawerHeight = Number.isFinite(Number(state.lorePanel.drawerHeight)) && Number(state.lorePanel.drawerHeight) >= 260 ? Number(state.lorePanel.drawerHeight) : (Number.isFinite(Number(state.lorePanel.height)) ? Number(state.lorePanel.height) : defaultsPanel.drawerHeight);
        state.lorePanel.selectedCategory = state.lorePanel.selectedCategory || 'all';
        state.lorePanel.search = state.lorePanel.search || '';
        state.lorePanel.sourceFilter = state.lorePanel.sourceFilter || defaultsPanel.sourceFilter || 'all';
        state.lorePanel.loreTypeFilter = state.lorePanel.loreTypeFilter || defaultsPanel.loreTypeFilter || 'all';
        state.lorePanel.acceptedDeckFilter = state.lorePanel.acceptedDeckFilter || defaultsPanel.acceptedDeckFilter || 'all';
        state.lorePanel.acceptedContextFilter = state.lorePanel.acceptedContextFilter || defaultsPanel.acceptedContextFilter || 'all';
        state.lorePanel.lorecardWorkspaceSort = ['priority', 'alphabetical', 'relevance'].includes(state.lorePanel.lorecardWorkspaceSort)
            ? state.lorePanel.lorecardWorkspaceSort
            : (defaultsPanel.lorecardWorkspaceSort || 'alphabetical');
        state.lorePanel.selectedEntryId = state.lorePanel.selectedEntryId || '';
        state.lorePanel.selectedLoredeckId = String(state.lorePanel.selectedLoredeckId || defaultsPanel.selectedLoredeckId || '').trim();
        state.lorePanel.loredeckLibraryDetailsHeight = Number.isFinite(Number(state.lorePanel.loredeckLibraryDetailsHeight))
            ? Math.max(190, Math.min(560, Number(state.lorePanel.loredeckLibraryDetailsHeight)))
            : defaultsPanel.loredeckLibraryDetailsHeight;
        state.lorePanel.loredeckLibraryDetailsCollapsed = state.lorePanel.loredeckLibraryDetailsCollapsed === true;
        state.lorePanel.activeTab = ['loredecks', 'session', 'continuity', 'context', 'lore', 'injection', 'settings'].includes(state.lorePanel.activeTab)
            ? state.lorePanel.activeTab
            : (state.lorePanel.activeTab === 'generate' ? 'context' : (state.lorePanel.activeTab === 'review' ? 'lore' : 'session'));
        normalizeLorePanelMobileState(state.lorePanel, defaultsPanel);
        state.lorePanel.reviewSelectedIds = Array.isArray(state.lorePanel.reviewSelectedIds) ? state.lorePanel.reviewSelectedIds : [];
        state.lorePanel.generationStatus = typeof state.lorePanel.generationStatus === 'string' ? state.lorePanel.generationStatus : 'Idle.';
        state.lorePanel.generationProgress = Number.isFinite(Number(state.lorePanel.generationProgress)) ? Number(state.lorePanel.generationProgress) : 0;
        for (const key of ['context', 'continuity', 'lore']) {
            const statusKey = `${key}Status`;
            const progressKey = `${key}Progress`;
            state.lorePanel[statusKey] = typeof state.lorePanel[statusKey] === 'string'
                ? state.lorePanel[statusKey]
                : (key === 'lore' ? state.lorePanel.generationStatus : 'Idle.');
            state.lorePanel[progressKey] = Number.isFinite(Number(state.lorePanel[progressKey]))
                ? Number(state.lorePanel[progressKey])
                : (key === 'lore' ? Number(state.lorePanel.generationProgress || 0) : 0);
        }
        state.lorePanel.showOnlyActive = false;
        state.lorePanel.pendingReviewVisibleLimit = Number.isFinite(Number(state.lorePanel.pendingReviewVisibleLimit))
            ? Math.max(5, Math.min(1000, Number(state.lorePanel.pendingReviewVisibleLimit)))
            : getDefaultState().lorePanel.pendingReviewVisibleLimit;
        state.lorePanel.width = Number.isFinite(Number(state.lorePanel.width)) && Number(state.lorePanel.width) >= 320 ? Number(state.lorePanel.width) : state.lorePanel.drawerWidth;
        state.lorePanel.height = Number.isFinite(Number(state.lorePanel.height)) && Number(state.lorePanel.height) >= 260 ? Number(state.lorePanel.height) : state.lorePanel.drawerHeight;
        state.lorePanel.x = Number.isFinite(Number(state.lorePanel.x)) ? Number(state.lorePanel.x) : state.lorePanel.railX;
        state.lorePanel.y = Number.isFinite(Number(state.lorePanel.y)) ? Number(state.lorePanel.y) : state.lorePanel.railY;
    }

    // Normalize loreSelection
    if (!state.loreSelection || typeof state.loreSelection !== 'object') {
        state.loreSelection = getDefaultState().loreSelection;
    } else {
        state.loreSelection.pinnedIds = Array.isArray(state.loreSelection.pinnedIds) ? state.loreSelection.pinnedIds : [];
        state.loreSelection.suppressedIds = Array.isArray(state.loreSelection.suppressedIds) ? state.loreSelection.suppressedIds : [];
        state.loreSelection.elevated = normalizeLoreElevationRecords(state.loreSelection.elevated || {});
    }

    if (!state.canonLoreDatabase || typeof state.canonLoreDatabase !== 'object' || Array.isArray(state.canonLoreDatabase)) {
        state.canonLoreDatabase = getDefaultState().canonLoreDatabase;
    } else {
        state.canonLoreDatabase = mergeDefaults(state.canonLoreDatabase, getDefaultState().canonLoreDatabase);
        state.canonLoreDatabase.lastQueriedAt = Number.isFinite(Number(state.canonLoreDatabase.lastQueriedAt)) ? Number(state.canonLoreDatabase.lastQueriedAt) : 0;
        state.canonLoreDatabase.lastMatchedCount = Number.isFinite(Number(state.canonLoreDatabase.lastMatchedCount)) ? Number(state.canonLoreDatabase.lastMatchedCount) : 0;
        state.canonLoreDatabase.lastProposedCount = Number.isFinite(Number(state.canonLoreDatabase.lastProposedCount)) ? Number(state.canonLoreDatabase.lastProposedCount) : 0;
    }

    // Ensure ledger always has a valid structure
    if (!state.loreGeneration || typeof state.loreGeneration !== 'object') {
        state.loreGeneration = getDefaultState().loreGeneration;
    }
    if (typeof state.loreGeneration.attempts !== 'object' || Array.isArray(state.loreGeneration.attempts)) {
        state.loreGeneration.attempts = {};
    }

    if (!state.loreBulkGeneration || typeof state.loreBulkGeneration !== 'object' || Array.isArray(state.loreBulkGeneration)) {
        state.loreBulkGeneration = getDefaultState().loreBulkGeneration;
    } else {
        const defaults = getDefaultState().loreBulkGeneration;
        state.loreBulkGeneration = mergeDefaults(state.loreBulkGeneration, defaults);
        for (const key of ['batches', 'chunks', 'candidates']) {
            if (!state.loreBulkGeneration[key] || typeof state.loreBulkGeneration[key] !== 'object' || Array.isArray(state.loreBulkGeneration[key])) {
                state.loreBulkGeneration[key] = {};
            }
        }
        state.loreBulkGeneration.activeBatchId = String(state.loreBulkGeneration.activeBatchId || '');
        state.loreBulkGeneration.lastBatchId = String(state.loreBulkGeneration.lastBatchId || '');
    }


    if (!state.continuityScan || typeof state.continuityScan !== 'object' || Array.isArray(state.continuityScan)) {
        state.continuityScan = getDefaultState().continuityScan;
    } else {
        const defaults = getDefaultState().continuityScan;
        state.continuityScan = mergeDefaults(state.continuityScan, defaults);
        for (const key of ['batches', 'chunks', 'observations']) {
            if (!state.continuityScan[key] || typeof state.continuityScan[key] !== 'object' || Array.isArray(state.continuityScan[key])) {
                state.continuityScan[key] = {};
            }
        }
        state.continuityScan.activeBatchId = String(state.continuityScan.activeBatchId || '');
        state.continuityScan.lastBatchId = String(state.continuityScan.lastBatchId || '');
    }
    // Clean up orphaned metadata
    if (state.pendingLoreMeta && state.pendingLoreEntries?.length === 0) {
        state.pendingLoreMeta = null;
    }

    return state;
}




// ── State import (validated) ────────────────────────────────────────────────────

/**
 * Imports state from a JSON string with validation and migration.
 * Always merges with defaults to fill missing fields.
 * @param {string} json - JSON string representing a SagaState
 * @returns {{ state: Object|null, error: string|null }}
 */
export function importState(json) {
    try {
        const parsed = unwrapImportedSagaState(JSON.parse(json));
        if (!parsed || typeof parsed !== 'object') {
            return { state: null, error: 'Imported JSON must be an object' };
        }
        if (Array.isArray(parsed)) {
            return { state: null, error: 'Imported JSON must be an object, not an array' };
        }
        const schemaError = getImportedStateSchemaError(parsed);
        if (schemaError) {
            return { state: null, error: schemaError };
        }

        // Merge with defaults to fill missing fields safely
        const defaults = getDefaultState();
        const merged = {
            ...defaults,
            ...parsed,
            canon: { ...defaults.canon, ...(parsed.canon || {}) },
            scene: { ...defaults.scene, ...(parsed.scene || {}) },
            continuityConfig: { ...defaults.continuityConfig, ...(parsed.continuityConfig || {}) },
            characters: Array.isArray(parsed.characters) ? parsed.characters : [],
            inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
            objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
            knowledge: parsed.knowledge && typeof parsed.knowledge === 'object' && !Array.isArray(parsed.knowledge)
                ? parsed.knowledge : {},
            secrets: Array.isArray(parsed.secrets) ? parsed.secrets : [],
            relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
            threads: Array.isArray(parsed.threads) ? parsed.threads : [],
            continuityFlags: Array.isArray(parsed.continuityFlags) ? parsed.continuityFlags : [],
            lastDelta: parsed.lastDelta || null,
            // Keep the source version until migrateState has applied every
            // supported version transition (including legacy manual opt-outs).
            _version: Number(parsed._version),

            // Lore fields (schema v2)
            loreContext: normalizeLoreContext(parsed.loreContext || {}),
            contextBrief: normalizeContextBrief(parsed.contextBrief || {}, parsed.loreContext || {}),
            // migrateState must see raw Context evidence before lore normalization.
            loreMatrix: Array.isArray(parsed.loreMatrix) ? parsed.loreMatrix.map(entry => entry && typeof entry === 'object' ? entry : {}) : [],
            pendingLoreEntries: Array.isArray(parsed.pendingLoreEntries) ? parsed.pendingLoreEntries.map(entry => entry && typeof entry === 'object' ? entry : {}) : [],

            // Lore generation lifecycle ledger (schema v3)
            loreGeneration: parsed.loreGeneration && typeof parsed.loreGeneration === 'object' && !Array.isArray(parsed.loreGeneration)
                ? {
                    lastAttemptedFor: parsed.loreGeneration.lastAttemptedFor || '',
                    lastProposedFor: parsed.loreGeneration.lastProposedFor || '',
                    lastAcceptedFor: parsed.loreGeneration.lastAcceptedFor || '',
                    lastRejectedFor: parsed.loreGeneration.lastRejectedFor || '',
                    lastFailedFor: parsed.loreGeneration.lastFailedFor || '',
                    attempts: parsed.loreGeneration.attempts && typeof parsed.loreGeneration.attempts === 'object' && !Array.isArray(parsed.loreGeneration.attempts)
                        ? parsed.loreGeneration.attempts : {},
                }
                : { ...getDefaultState().loreGeneration },

            loreBulkGeneration: parsed.loreBulkGeneration && typeof parsed.loreBulkGeneration === 'object' && !Array.isArray(parsed.loreBulkGeneration)
                ? {
                    activeBatchId: parsed.loreBulkGeneration.activeBatchId || '',
                    lastBatchId: parsed.loreBulkGeneration.lastBatchId || '',
                    batches: parsed.loreBulkGeneration.batches && typeof parsed.loreBulkGeneration.batches === 'object' && !Array.isArray(parsed.loreBulkGeneration.batches)
                        ? parsed.loreBulkGeneration.batches : {},
                    chunks: parsed.loreBulkGeneration.chunks && typeof parsed.loreBulkGeneration.chunks === 'object' && !Array.isArray(parsed.loreBulkGeneration.chunks)
                        ? parsed.loreBulkGeneration.chunks : {},
                    candidates: parsed.loreBulkGeneration.candidates && typeof parsed.loreBulkGeneration.candidates === 'object' && !Array.isArray(parsed.loreBulkGeneration.candidates)
                        ? parsed.loreBulkGeneration.candidates : {},
                }
                : { ...getDefaultState().loreBulkGeneration },

            stateSafety: normalizeStateSafety(parsed.stateSafety || {}),

            loredeckCreator: normalizeLoredeckCreatorRegistry(parsed.loredeckCreator || getDefaultState().loredeckCreator),

            continuityScan: parsed.continuityScan && typeof parsed.continuityScan === 'object' && !Array.isArray(parsed.continuityScan)
                ? {
                    activeBatchId: parsed.continuityScan.activeBatchId || '',
                    lastBatchId: parsed.continuityScan.lastBatchId || '',
                    batches: parsed.continuityScan.batches && typeof parsed.continuityScan.batches === 'object' && !Array.isArray(parsed.continuityScan.batches)
                        ? parsed.continuityScan.batches : {},
                    chunks: parsed.continuityScan.chunks && typeof parsed.continuityScan.chunks === 'object' && !Array.isArray(parsed.continuityScan.chunks)
                        ? parsed.continuityScan.chunks : {},
                    observations: parsed.continuityScan.observations && typeof parsed.continuityScan.observations === 'object' && !Array.isArray(parsed.continuityScan.observations)
                        ? parsed.continuityScan.observations : {},
                }
                : { ...getDefaultState().continuityScan },

            pendingLoreMeta: parsed.pendingLoreMeta && typeof parsed.pendingLoreMeta === 'object' && !Array.isArray(parsed.pendingLoreMeta)
                ? parsed.pendingLoreMeta : null,
        };

        // Normalize all array entries to prevent malformed imports from crashing memo builder
        normalizeStateEntries(merged);

        // Re-migrate to ensure current schema
        const migrated = migrateState(merged);
        return { state: migrated, error: null };
    } catch (e) {
        console.error(`${LOG_PREFIX} Failed to import state:`, e);
        return { state: null, error: `JSON parse failed: ${e.message}` };
    }
}

/**
 * Serializes state to a pretty-printed JSON string.
 * @param {Object} state - SagaState
 * @returns {string} JSON string
 */
export function exportState(state) {
    try {
        return serializeStateExport(state);
    } catch (e) {
        console.error(`${LOG_PREFIX} Failed to export state:`, e);
        return '{}';
    }
}

export function exportSagaState(state = getState()) {
    return serializeSagaStateExport(state);
}

export function createStateBackup(reason = 'manual', options = {}) {
    const state = getState();
    const backup = appendStateBackupRecord(state, reason, options);
    const persistence = saveState(state, { ...options, syncPrompt: options.syncPrompt === true, sanitize: options.sanitize !== false });
    return { ...backup, persisted: persistence.persisted, persistence };
}

export async function createStateBackupDurable(reason = 'manual', options = {}) {
    const backup = createStateBackup(reason, options);
    const result = await awaitStatePersistence(backup.persistence);
    return { ...result, backup: { ...backup, persisted: result.persisted } };
}

export function getStateSafety(state = getState()) {
    return normalizeStateSafety(state?.stateSafety || {});
}

export function recordStateSafetyEvent(type = 'event', message = '', options = {}) {
    const state = getState();
    const record = appendStateSafetyLog(state, {
        type,
        message,
        fromVersion: Number(options.fromVersion) || 0,
        toVersion: Number(options.toVersion) || SCHEMA_VERSION,
    });
    saveState(state, { syncPrompt: options.syncPrompt === true, sanitize: options.sanitize !== false });
    return record;
}

export function getSagaStorageDiagnostics(options = {}) {
    return getStorageDiagnostics(getSettings(), options);
}

function formatStorageDiagnosticsMessage(result = {}) {
    if (result.cleanedFileCount) {
        return `Saga storage cleaned ${result.cleanedFileCount} missing indexed file record${result.cleanedFileCount === 1 ? '' : 's'}.`;
    }
    if (result.flushedAt) {
        return `Saga storage writes settled: ${result.pendingWritesBefore || 0} queued write${(result.pendingWritesBefore || 0) === 1 ? '' : 's'} before verification.`;
    }
    if (result.status === 'ok') {
        return `Saga storage verified: ${result.fileCount || 0} tracked file${result.fileCount === 1 ? '' : 's'}, no missing files.`;
    }
    if (result.status === 'missing_files') {
        return `Saga storage verification found ${result.missingFileCount || 0} missing file${result.missingFileCount === 1 ? '' : 's'}.`;
    }
    if (result.status === 'missing_index') {
        return 'Saga storage index is missing.';
    }
    if (result.status === 'storage_errors' || result.status === 'write_errors') {
        const count = (result.storageErrors || result.writeErrors || []).length;
        return `Saga storage has ${count} runtime storage error${count === 1 ? '' : 's'}.`;
    }
    return result.error || 'Saga storage verification failed.';
}

export async function verifySagaStorageIntegrity(options = {}) {
    const result = await verifyStorageDiagnostics(getSettings(), {
        ...options,
        write: options.write !== false,
    });
    const settings = getSettings();
    settings.sagaStorage = {
        ...(settings.sagaStorage || {}),
        lastVerifiedAt: result.checkedAt || Date.now(),
    };
    saveSettings(settings);
    const log = recordStateSafetyEvent(result.ok ? 'storage_integrity_check' : 'storage_integrity_warning', formatStorageDiagnosticsMessage(result), {
        syncPrompt: false,
    });
    return { ...result, log };
}

export async function settleSagaStorageWrites(options = {}) {
    const result = await flushSagaStorageWrites(getSettings(), {
        ...options,
        write: options.write !== false,
    });
    const settings = getSettings();
    settings.sagaStorage = {
        ...(settings.sagaStorage || {}),
        lastVerifiedAt: result.checkedAt || Date.now(),
    };
    saveSettings(settings);
    const log = recordStateSafetyEvent(result.ok ? 'storage_write_settle' : 'storage_write_warning', formatStorageDiagnosticsMessage(result), {
        syncPrompt: false,
    });
    return { ...result, log };
}

export async function cleanMissingSagaStorageIndexRecords(options = {}) {
    const result = await cleanMissingSagaStorageRecords(getSettings(), {
        ...options,
        write: options.write !== false,
    });
    const settings = getSettings();
    settings.sagaStorage = {
        ...(settings.sagaStorage || {}),
        lastVerifiedAt: result.checkedAt || Date.now(),
    };
    saveSettings(settings);
    const log = recordStateSafetyEvent(result.ok ? 'storage_cleanup' : 'storage_cleanup_warning', formatStorageDiagnosticsMessage(result), {
        syncPrompt: false,
    });
    return { ...result, log };
}

export function restoreStateFromBackup(backupId) {
    const current = getState();
    const safety = normalizeStateSafety(current.stateSafety);
    const backup = safety.backups.find(item => item.id === backupId);
    if (!backup) return { ok: false, error: 'Backup not found.' };

    appendStateBackupRecord(current, 'before_backup_restore', { label: 'Before restoring a saved Saga backup.' });
    const next = migrateState(cloneJsonForStateSafety(backup.state, getDefaultState()));
    next.stateSafety = normalizeStateSafety(current.stateSafety);
    next.stateSafety.lastRestoreAt = Date.now();
    next.stateSafety.lastRestoreSource = backup.id;
    appendStateSafetyLog(next, {
        type: 'state_restore',
        message: `Restored Saga state backup ${backup.id}.`,
        fromVersion: Number(next._version) || 0,
        toVersion: SCHEMA_VERSION,
    });
    const result = saveState(next);
    return { ...result, state: next, backup };
}

export async function restoreStateFromBackupDurable(backupId) {
    const operation = captureChatOperation({ requireEnabled: false });
    try {
        const current = getState();
        const backup = normalizeStateSafety(current.stateSafety).backups.find(item => item.id === backupId);
        if (!backup) return { ok: false, persisted: false, error: 'Backup not found.' };
        const protectedCurrent = await createStateBackupDurable('before_backup_restore', { label: 'Before restoring a saved Saga backup.', operation });
        if (!protectedCurrent.ok) return protectedCurrent;
        operation.assertCurrent();
        const next = migrateState(cloneJsonForStateSafety(backup.state, getDefaultState()));
        next.stateSafety = normalizeStateSafety(current.stateSafety);
        next.stateSafety.lastRestoreAt = Date.now();
        next.stateSafety.lastRestoreSource = backup.id;
        appendStateSafetyLog(next, { type: 'state_restore', message: `Restored Saga state backup ${backup.id}.`, toVersion: SCHEMA_VERSION });
        return { ...await saveStateDurable(next, { operation }), backup };
    } catch (error) { return { ok: false, persisted: false, error: error?.message || String(error) }; }
    finally { operation.release(); }
}

export function restoreStateFromExport(json) {
    const current = getState();
    appendStateBackupRecord(current, 'before_file_restore', { label: 'Before restoring Saga state from file.' });
    saveState(current, { syncPrompt: false });
    const preservedSafety = normalizeStateSafety(current.stateSafety);
    const imported = importState(json);
    if (!imported.state) {
        appendStateSafetyLog(current, {
            type: 'state_restore_failed',
            message: imported.error || 'State import failed.',
            fromVersion: Number(current._version) || 0,
            toVersion: SCHEMA_VERSION,
        });
        saveState(current, { syncPrompt: false });
        return { ok: false, error: imported.error || 'State import failed.' };
    }
    const next = imported.state;
    next.stateSafety = preservedSafety;
    next.stateSafety.lastRestoreAt = Date.now();
    next.stateSafety.lastRestoreSource = 'file';
    appendStateSafetyLog(next, {
        type: 'state_restore',
        message: 'Restored Saga state from an exported JSON file.',
        fromVersion: Number(next._version) || 0,
        toVersion: SCHEMA_VERSION,
    });
    const result = saveState(next);
    return { ...result, state: next };
}

export async function restoreStateFromExportDurable(json) {
    const operation = captureChatOperation({ requireEnabled: false });
    try {
        const backup = await createStateBackupDurable('before_file_restore', { label: 'Before restoring Saga state from file.', operation });
        if (!backup.ok) return backup;
        operation.assertCurrent();
        const imported = importState(json);
        if (!imported.state) return { ok: false, persisted: false, error: imported.error || 'State import failed.' };
        const next = imported.state;
        next.stateSafety = normalizeStateSafety(getState().stateSafety);
        next.stateSafety.lastRestoreAt = Date.now();
        next.stateSafety.lastRestoreSource = 'file';
        appendStateSafetyLog(next, { type: 'state_restore', message: 'Restored Saga state from an exported JSON file.', toVersion: SCHEMA_VERSION });
        return await saveStateDurable(next, { operation });
    } catch (error) { return { ok: false, persisted: false, error: error?.message || String(error) }; }
    finally { operation.release(); }
}

// ?? Utility: deep-merge defaults ????????????????????????????????????????????????

function mergeDefaults(target, defaults) {
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
        return { ...defaults };
    }
    const result = { ...target };
    for (const key of Object.keys(defaults)) {
        if (result[key] === undefined || result[key] === null) {
            result[key] = defaults[key];
        }
    }
    return result;
}

// ── Export the default state factory for convenience ────────────────────────────
export { getDefaultState };
