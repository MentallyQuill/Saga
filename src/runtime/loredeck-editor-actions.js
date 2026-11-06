/**
 * loredeck-editor-actions.js - Saga
 * Runtime Loredeck editor command implementations.
 *
 * Keep panel rendering in the caller. This module owns shared command
 * lifecycles for metadata, repair, duplicate, export, and finalization.
 */

import { setLoredeckActionButtonBusy } from '../loredecks/loredeck-action-rows.js';
import { closeLoredeckCreatorWorkbench } from '../loredecks/loredeck-creator-panel.js';
import {
    buildEmbeddedCustomManifest,
    buildLoredeckStatsFromEntries,
    cloneLoredeckJson,
    getLoredeckTagRegistryCount,
    getLoredeckTimelineRegistryCount,
    normalizeLoredeckEntryId,
    normalizeLoredeckPackId,
    parseLoredeckTags,
} from './loredeck-package-helpers.js';
import {
    buildLoredeckZipPackageForExport,
} from './loredeck-package-export.js';
import {
    buildLoredeckRecordFromManifest,
    fetchLoredeckManifest,
    getDisplayManifestForPack,
} from './loredeck-manifest-runtime.js';
import {
    getAcceptedGeneratedLoredeckEntries,
    isGeneratedLoredeckPack,
    isVirtualLoredeckPack,
    refreshGeneratedLoredeckDerivedMetadata,
} from './loredeck-virtual-data.js';
import {
    getGeneratedLoredeckExportReadiness,
} from './loredeck-generated-readiness.js';
import {
    attemptLoredeckHealthFixes as attemptLoredeckHealthFixesStorage,
} from '../loredecks/loredeck-health-attempt-fixing.js';
import {
    reevaluateLoredeckHealthRepairChoice as reevaluateLoredeckHealthRepairChoiceStorage,
    runLoredeckHealthModelRepairBatches,
} from '../loredecks/loredeck-health-model-repair-runner.js';
import {
    applyLoredeckHealthRepairChoice as applyLoredeckHealthRepairChoiceStorage,
} from '../loredecks/loredeck-health-review-choices.js';
import {
    flushSagaLorepackPayloadStorageWrites,
    hydrateExternalLorepackPayloadRecord,
} from '../storage/saga-lorepack-payload-storage.js';
import {
    flushSagaLorepackLibraryStorageWrites,
} from '../storage/saga-lorepack-library-storage.js';
import {
    sendLoreRequest,
    validateLoreProviderConfiguration,
} from '../providers/lore-llm-client.js';
import {
    extractLoreResponseText,
} from '../providers/lore-response-normalizer.js';

let editorActionDeps = {};
const activeLoredeckHealthRepairRuns = new Map();

const LOREDECK_HEALTH_MODEL_REPAIR_SYSTEM_PROMPT = `You repair Saga Loredeck Pack Health findings.

Return JSON only. Do not include markdown, XML, analysis, or prose outside the JSON object.

Follow the supplied prompt payload exactly:
- Repair only the current repair unit.
- Use only allowedOperations.
- Change only allowedFields.
- Target only IDs listed in the current unit.
- Return direct repairs only when one clear safe fix exists.
- Return choices when multiple plausible fixes exist.
- Use the contract {"repairs":[],"choices":[],"warnings":[],"clarifyingQuestions":[]}.`;

const FINALIZATION_POST_SAVE_TIMEOUT_MS = 15000;
const FINALIZATION_RETIREMENT_TIMEOUT_MS = 20000;

export function configureLoredeckEditorActions(deps = {}) {
    editorActionDeps = { ...editorActionDeps, ...(deps || {}) };
}

function dep(name, fallback = () => undefined) {
    return typeof editorActionDeps[name] === 'function' ? editorActionDeps[name] : fallback;
}

function getState() { return dep('getState', () => ({}))(); }
function getLoredeckLibrary(state = getState()) { return dep('getLoredeckLibrary', () => [])(state); }
function getLoredeckDefinition(packId) { return dep('getLoredeckDefinition', () => null)(packId); }
function getFreshLoredeckLibraryPack(packId, fallback = null) { return dep('getFreshLoredeckLibraryPack', getLoredeckDefinition)(packId, fallback); }
function upsertLoredeckLibraryPack(pack) { return dep('upsertLoredeckLibraryPack', () => ({ ok: false, error: 'Loredeck save unavailable.' }))(pack); }
function validateLoredeckForEditor(pack, button = null, options = {}) { return dep('validateLoredeckForEditor', async () => ({}))(pack, button, options); }
function getExpectedLoredeckEntrySchemaVersion(pack, manifest) { return dep('getExpectedLoredeckEntrySchemaVersion', () => 0)(pack, manifest); }
function getLoredeckPendingChanges(pack) { return dep('getLoredeckPendingChanges', () => [])(pack); }
function normalizeLoredeckTagRegistry(value) { return dep('normalizeLoredeckTagRegistry', () => ({ schemaVersion: 1, tags: {} }))(value); }
function normalizeLoredeckTimelineRegistry(value) { return dep('normalizeLoredeckTimelineRegistry', () => ({ schemaVersion: 1, timelineMode: 'hybrid', sortKeyScale: 'pack_local', anchors: [], windows: [] }))(value); }
function clearCanonLoreDatabaseCache() { return dep('clearCanonLoreDatabaseCache')(); }
function clearContextIndexCache() { return dep('clearContextIndexCache')(); }
function refreshLoredeckSurfaces(options) { return dep('refreshLoredeckSurfaces')(options); }
function toast(message, type = 'info') { return dep('toast')(message, type); }
function downloadBytes(bytes, filename, mimeType) { return dep('downloadBytes')(bytes, filename, mimeType); }
function selectLoredeckForDetails(packId, options = {}) { return dep('selectLoredeckForDetails')(packId, options); }
function confirmAction(title, message) { return dep('confirmAction', async () => false)(title, message); }
function createStateBackup(type, details = {}) { return dep('createStateBackup')(type, details); }
function getLoredeckCreatorJobForPack(pack = {}) { return dep('getLoredeckCreatorJobForPack', () => null)(pack); }
function buildLoredeckCreatorCoverageFinalizationProvenance(coverage = {}) { return dep('buildLoredeckCreatorCoverageFinalizationProvenance', () => null)(coverage); }
function retireGeneratedLoredeckAfterFinalization(sourcePack, finalizedRecord, creatorJob) { return dep('retireGeneratedLoredeckAfterFinalization', async () => ({ ok: true }))(sourcePack, finalizedRecord, creatorJob); }
function openLoredeckMetadataEditor(packId) { return dep('openLoredeckMetadataEditor')(packId); }
function isLoredeckLibraryOpen() { return dep('isLoredeckLibraryOpen', () => false)(); }
function renderLoredeckLibraryOverlay() { return dep('renderLoredeckLibraryOverlay')(); }
function closeLoredeckCreatorWorkbenchOverlay() {
    return dep('closeLoredeckCreatorWorkbenchOverlay', () => {
        if (typeof document !== 'undefined') closeLoredeckCreatorWorkbench();
    })();
}
function getLoredeckFinalizationStepTimeoutMs(label, fallbackMs) {
    return dep('getLoredeckFinalizationStepTimeoutMs', (_label, fallback) => fallback)(label, fallbackMs);
}
function addLoredeckToStack(packId) { return dep('addLoredeckToStack')(packId); }
function setLoredeckManifestPreviewCacheRecord(packId, record = null) { return dep('setLoredeckManifestPreviewCacheRecord')(packId, record); }
function deleteLoredeckManifestPreviewCacheRecord(packId) { return dep('deleteLoredeckManifestPreviewCacheRecord')(packId); }
function deleteLoredeckEntryPreviewCacheRecord(packId) { return dep('deleteLoredeckEntryPreviewCacheRecord')(packId); }
function deleteLoredeckTimelineRegistryCacheRecord(packId) { return dep('deleteLoredeckTimelineRegistryCacheRecord')(packId); }
function deleteLoredeckTagRegistryCacheRecord(packId) { return dep('deleteLoredeckTagRegistryCacheRecord')(packId); }

function normalizeLoredeckHealthRepairRunPackId(packId = '') {
    return normalizeLoredeckPackId(packId) || String(packId || '').trim();
}

function beginLoredeckHealthRepairRun(packId = '', label = 'Pack Health repair') {
    const id = normalizeLoredeckHealthRepairRunPackId(packId);
    if (!id) {
        return {
            ok: false,
            error: 'Pack Health repair needs a Loredeck.',
        };
    }
    const active = activeLoredeckHealthRepairRuns.get(id);
    if (active) {
        return {
            ok: false,
            blocked: true,
            active,
            error: `${active.label || 'Pack Health repair'} is already running for this Loredeck.`,
        };
    }
    const run = {
        runId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        packId: id,
        label,
        startedAt: Date.now(),
        controller: typeof AbortController === 'function' ? new AbortController() : null,
    };
    activeLoredeckHealthRepairRuns.set(id, run);
    return {
        ok: true,
        run,
        signal: run.controller?.signal,
        finish() {
            if (activeLoredeckHealthRepairRuns.get(id)?.runId === run.runId) {
                activeLoredeckHealthRepairRuns.delete(id);
            }
        },
    };
}

async function runFinalizationStepWithTimeout(label, fallbackMs, task) {
    const timeoutMs = Math.max(1, Math.floor(Number(getLoredeckFinalizationStepTimeoutMs(label, fallbackMs)) || fallbackMs));
    let timeoutId = 0;
    const work = Promise.resolve()
        .then(task)
        .then(value => ({ ok: true, value }))
        .catch(error => ({ ok: false, error: error?.message || String(error || `${label} failed.`), cause: error }));
    const timeout = new Promise(resolve => {
        timeoutId = setTimeout(() => {
            const seconds = Math.ceil(timeoutMs / 1000);
            resolve({
                ok: false,
                timedOut: true,
                error: `${label} did not finish within ${seconds} second${seconds === 1 ? '' : 's'}.`,
            });
        }, timeoutMs);
    });
    const result = await Promise.race([work, timeout]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
}

function warnFinalizationPostStep(message = '') {
    const text = String(message || '').trim();
    if (!text) return;
    console.warn(`[Saga] ${text}`);
    toast(text, 'warning');
}

function refreshFinalizedLoredeckUi(record = {}) {
    const failures = [];
    const capture = (label, task) => {
        try {
            task();
        } catch (error) {
            failures.push(`${label}: ${error?.message || error}`);
            console.warn(`[Saga] ${label} failed after Loredeck finalization:`, error);
        }
    };
    capture('Deck Maker workbench close', () => closeLoredeckCreatorWorkbenchOverlay());
    capture('Loredeck surface refresh', () => refreshLoredeckSurfaces({ clearCanon: true, clearContext: true, renderLibrary: false }));
    capture('Metadata editor open', () => openLoredeckMetadataEditor(record.packId));
    if (isLoredeckLibraryOpen()) {
        setTimeout(() => {
            try {
                renderLoredeckLibraryOverlay();
            } catch (error) {
                console.warn('[Saga] Library overlay refresh failed after Loredeck finalization:', error);
            }
        }, 0);
    }
    if (failures.length) {
        warnFinalizationPostStep(`${record.title || record.packId || 'Finalized Loredeck'} was created, but the editor view did not refresh cleanly. Reopen the Library if the new deck is not visible.`);
    }
}

function showLoredeckHealthRepairRunBlockedToast(block = {}) {
    toast(block.error || 'Pack Health repair is already running for this Loredeck.', 'info');
}

export function getLoredeckHealthRepairActiveRun(packId = '') {
    const id = normalizeLoredeckHealthRepairRunPackId(packId);
    const run = id ? activeLoredeckHealthRepairRuns.get(id) : null;
    if (!run) return null;
    return {
        runId: run.runId,
        packId: run.packId,
        label: run.label,
        startedAt: run.startedAt,
        cancellable: !!run.controller && !run.controller.signal?.aborted,
        cancelled: run.controller?.signal?.aborted === true,
    };
}

export function cancelLoredeckHealthRepairRun(packId = '') {
    const id = normalizeLoredeckHealthRepairRunPackId(packId);
    const run = id ? activeLoredeckHealthRepairRuns.get(id) : null;
    if (!run) {
        toast('No active Pack Health repair run is available to cancel.', 'info');
        return false;
    }
    if (!run.controller || run.controller.signal?.aborted) {
        toast(`${run.label || 'Pack Health repair'} is already stopping.`, 'info');
        return false;
    }
    run.controller.abort(`${run.label || 'Pack Health repair'} cancelled by user.`);
    toast(`${run.label || 'Pack Health repair'} cancellation requested.`, 'info');
    return true;
}

function getInjectedLoredeckHealthModelRepairRequest() {
    const request = dep('requestLoredeckHealthModelRepair', null);
    return typeof request === 'function' ? request : null;
}

function validateLoredeckHealthModelRepairProvider() {
    if (getInjectedLoredeckHealthModelRepairRequest()) {
        return { ok: true, provider: 'injected', kind: 'lore' };
    }
    return validateLoreProviderConfiguration('lore');
}

async function requestLoredeckHealthModelRepair(context = {}, requestOptions = {}) {
    const injected = getInjectedLoredeckHealthModelRepairRequest();
    if (injected) return await injected(context, requestOptions);
    const progress = requestOptions.onProgress || context.emitProgress;
    const raw = await sendLoreRequest(
        LOREDECK_HEALTH_MODEL_REPAIR_SYSTEM_PROMPT,
        context.promptText || JSON.stringify(context.promptPayload || {}),
        {
            providerKind: 'lore',
            maxTokens: Number.isFinite(Number(requestOptions.maxTokens)) ? Number(requestOptions.maxTokens) : 8192,
            expectedOutput: 'json',
            forceVisibleOutput: true,
            signal: requestOptions.signal || context.signal,
            onProgress: typeof progress === 'function' ? progress : undefined,
            ...requestOptions,
        }
    );
    return extractLoreResponseText(raw);
}

function formatAttemptFixingHealthDelta(summary = {}) {
    const before = summary.initialHealth || {};
    const after = summary.finalHealth || {};
    const beforeErrors = Number(before.errorCount) || 0;
    const afterErrors = Number(after.errorCount) || 0;
    const beforeWarnings = Number(before.warningCount) || 0;
    const afterWarnings = Number(after.warningCount) || 0;
    return `Pack Health ${beforeErrors}->${afterErrors} error${afterErrors === 1 ? '' : 's'}, ${beforeWarnings}->${afterWarnings} warning${afterWarnings === 1 ? '' : 's'}`;
}

function getAttemptFixingRemainingParts(result = {}) {
    const remaining = result.remaining || {};
    const parts = [];
    const choiceCount = Number(remaining.choiceSetCount || remaining.choiceSets?.length) || 0;
    const modelCount = Number(remaining.modelUnits?.length) || 0;
    const deferredCount = Number(remaining.deferredUnits?.length) || 0;
    const manualCount = Number(remaining.manualBuckets?.length) || 0;
    if (choiceCount) parts.push(`${choiceCount} review choice${choiceCount === 1 ? '' : 's'}`);
    if (modelCount) parts.push(`${modelCount} model batch${modelCount === 1 ? '' : 'es'}`);
    if (deferredCount) parts.push(`${deferredCount} deferred model batch${deferredCount === 1 ? '' : 'es'}`);
    if (manualCount) parts.push(`${manualCount} manual group${manualCount === 1 ? '' : 's'}`);
    return parts;
}

function appendSentence(message = '', sentence = '') {
    const cleanMessage = String(message || '').trim();
    const cleanSentence = String(sentence || '').trim();
    if (!cleanSentence) return cleanMessage;
    return `${cleanMessage}${cleanMessage.endsWith('.') ? '' : '.'} ${cleanSentence}`;
}

function getAttemptFixingSessionText(...results) {
    return results.some(result => result?.sessionPath) ? ' Repair session saved.' : '';
}

function formatRepairCountList(parts = []) {
    const clean = parts.filter(Boolean);
    if (!clean.length) return '';
    if (clean.length === 1) return clean[0];
    return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`;
}

function getAttemptFixingSummaryIssueCount(summary = {}) {
    const health = summary.finalHealth || {};
    return (Number(health.errorCount) || 0) + (Number(health.warningCount) || 0) + (Number(health.suggestionCount) || 0);
}

function formatAttemptFixingToast(result = {}, options = {}) {
    const summary = result.summary || {};
    const appliedCount = Array.isArray(result.appliedPatches) ? result.appliedPatches.length : 0;
    const remainingParts = getAttemptFixingRemainingParts(result);
    const delta = formatAttemptFixingHealthDelta(summary);
    const sessionText = getAttemptFixingSessionText(result);
    const extraText = options.extraText || '';
    const withExtra = message => appendSentence(message, extraText);
    if (appliedCount) {
        return {
            type: summary.outcome === 'clean' ? 'success' : 'warning',
            message: withExtra(`Attempt Fixing applied ${appliedCount} local repair${appliedCount === 1 ? '' : 's'}: ${delta}.${remainingParts.length ? ` Still needs ${remainingParts.join(', ')}.` : ''}${sessionText}`),
        };
    }
    if (remainingParts.length) {
        return {
            type: 'warning',
            message: withExtra(`Attempt Fixing found no deterministic local fixes. Still needs ${remainingParts.join(', ')}.${sessionText}`),
        };
    }
    if (summary.outcome === 'clean') {
        return {
            type: 'success',
            message: withExtra(`Attempt Fixing found no remaining Pack Health issues: ${delta}.`),
        };
    }
    return {
        type: 'info',
        message: withExtra(`Attempt Fixing found no deterministic local fixes: ${delta}.`),
    };
}

function formatAttemptFixingWithModelToast(localResult = {}, modelResult = {}) {
    const localPatches = Array.isArray(localResult.appliedPatches) ? localResult.appliedPatches.length : 0;
    const modelPatches = Array.isArray(modelResult.appliedPatches) ? modelResult.appliedPatches.length : 0;
    const repairText = formatRepairCountList([
        localPatches ? `${localPatches} local repair${localPatches === 1 ? '' : 's'}` : '',
        modelPatches ? `${modelPatches} model repair${modelPatches === 1 ? '' : 's'}` : '',
    ]);
    const combinedSummary = {
        initialHealth: localResult.summary?.initialHealth || modelResult.summary?.initialHealth,
        finalHealth: modelResult.summary?.finalHealth || localResult.summary?.finalHealth,
    };
    const delta = formatAttemptFixingHealthDelta(combinedSummary);
    const remainingParts = getAttemptFixingRemainingParts(modelResult);
    const sessionText = getAttemptFixingSessionText(modelResult, localResult);
    const modelError = modelResult.ok === false
        ? ` Some model batches did not finish${modelResult.error ? `: ${modelResult.error}` : '.'}`
        : '';
    if (repairText) {
        return {
            type: modelResult.ok === false || remainingParts.length ? 'warning' : 'success',
            message: `Attempt Fixing applied ${repairText}: ${delta}.${remainingParts.length ? ` Still needs ${remainingParts.join(', ')}.` : ''}${modelError}${sessionText}`,
        };
    }
    if (remainingParts.length) {
        return {
            type: 'warning',
            message: `Attempt Fixing ran model repair batches but still needs ${remainingParts.join(', ')}.${modelError}${sessionText}`,
        };
    }
    if (getAttemptFixingSummaryIssueCount(combinedSummary) === 0) {
        return {
            type: 'success',
            message: `Attempt Fixing found no remaining Pack Health issues: ${delta}.`,
        };
    }
    return {
        type: modelResult.ok === false ? 'warning' : 'info',
        message: `Attempt Fixing completed model repair pass: ${delta}.${modelError}${sessionText}`,
    };
}

function formatContinueModelRepairToast(result = {}) {
    const modelPatches = Array.isArray(result.appliedPatches) ? result.appliedPatches.length : 0;
    const delta = formatAttemptFixingHealthDelta(result.summary || {});
    const remainingParts = getAttemptFixingRemainingParts(result);
    const sessionText = getAttemptFixingSessionText(result);
    const modelError = result.ok === false
        ? ` Some model batches did not finish${result.error ? `: ${result.error}` : '.'}`
        : '';
    if (modelPatches) {
        return {
            type: result.ok === false || remainingParts.length ? 'warning' : 'success',
            message: `Continue Model Batches applied ${modelPatches} model repair${modelPatches === 1 ? '' : 's'}: ${delta}.${remainingParts.length ? ` Still needs ${remainingParts.join(', ')}.` : ''}${modelError}${sessionText}`,
        };
    }
    if (remainingParts.length) {
        return {
            type: 'warning',
            message: `Continue Model Batches ran but still needs ${remainingParts.join(', ')}.${modelError}${sessionText}`,
        };
    }
    if (getAttemptFixingSummaryIssueCount(result.summary || {}) === 0) {
        return {
            type: 'success',
            message: `Continue Model Batches found no remaining Pack Health issues: ${delta}.`,
        };
    }
    return {
        type: result.ok === false ? 'warning' : 'info',
        message: `Continue Model Batches completed: ${delta}.${modelError}${sessionText}`,
    };
}

function formatReevaluateRepairChoiceToast(result = {}) {
    const modelPatches = Array.isArray(result.appliedPatches) ? result.appliedPatches.length : 0;
    const newChoiceCount = Array.isArray(result.choiceSets) ? result.choiceSets.length : 0;
    const delta = formatAttemptFixingHealthDelta(result.summary || {});
    const remainingParts = getAttemptFixingRemainingParts(result);
    const sessionText = getAttemptFixingSessionText(result);
    const modelError = result.ok === false
        ? ` Some model batches did not finish${result.error ? `: ${result.error}` : '.'}`
        : '';
    if (modelPatches) {
        return {
            type: result.ok === false || remainingParts.length ? 'warning' : 'success',
            message: `Model re-evaluation applied ${modelPatches} repair${modelPatches === 1 ? '' : 's'}: ${delta}.${remainingParts.length ? ` Still needs ${remainingParts.join(', ')}.` : ''}${modelError}${sessionText}`,
        };
    }
    if (newChoiceCount) {
        return {
            type: 'warning',
            message: `Model re-evaluation returned ${newChoiceCount} review choice${newChoiceCount === 1 ? '' : 's'}. Choose an option to apply it.${remainingParts.length ? ` Still needs ${remainingParts.join(', ')}.` : ''}${modelError}${sessionText}`,
        };
    }
    if (remainingParts.length) {
        return {
            type: 'warning',
            message: `Model re-evaluation ran but still needs ${remainingParts.join(', ')}.${modelError}${sessionText}`,
        };
    }
    return {
        type: result.ok === false ? 'warning' : 'info',
        message: `Model re-evaluation completed: ${delta}.${modelError}${sessionText}`,
    };
}

function clearLoredeckHealthRepairCaches(packId = '') {
    deleteLoredeckManifestPreviewCacheRecord(packId);
    deleteLoredeckEntryPreviewCacheRecord(packId);
    deleteLoredeckTimelineRegistryCacheRecord(packId);
    deleteLoredeckTagRegistryCacheRecord(packId);
}

function setAttemptFixingButtonText(button = null, text = '') {
    if (!button || !text) return;
    button.textContent = text;
}

function shouldContinueAttemptFixingWithModel(result = {}) {
    const remaining = result.remaining || {};
    return (Number(remaining.modelUnits?.length) || 0) + (Number(remaining.deferredUnits?.length) || 0) > 0;
}

function handleAttemptFixingModelProgress(button = null, event = {}) {
    if (!button || !event?.type) return;
    if (event.type === 'unit_retry_smaller') {
        setAttemptFixingButtonText(button, 'Retrying smaller...');
        return;
    }
    if (event.type === 'run_progress') {
        const total = Math.max(1, Number(event.run?.totalUnits) || 1);
        const index = Math.max(0, Number(event.index) || 0) + 1;
        setAttemptFixingButtonText(button, `Model ${Math.min(index, total)}/${total}...`);
        return;
    }
    if (event.type === 'unit_started' || event.type === 'unit_retrying') {
        const label = event.type === 'unit_retrying' ? 'Retrying' : 'Model';
        const attempts = Number(event.attempt) > 1 ? ` ${event.attempt}` : '';
        setAttemptFixingButtonText(button, `${label} batch${attempts}...`);
        return;
    }
    if (event.type === 'unit_completed') setAttemptFixingButtonText(button, 'Saving repair...');
}

async function flushLoredeckHealthRepairWrites() {
    const payloadFlush = await flushSagaLorepackPayloadStorageWrites();
    const libraryFlush = await flushSagaLorepackLibraryStorageWrites();
    if (!payloadFlush.ok || !libraryFlush.ok) {
        throw new Error(payloadFlush.error || libraryFlush.error || 'Attempt Fixing writes did not finish cleanly.');
    }
    return { payloadFlush, libraryFlush };
}

export async function attemptLoredeckHealthFixes(pack, button = null) {
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Attempting...', { fallbackLabel: 'Attempt Fixing' });
    let runLock = null;
    try {
        const source = getFreshLoredeckLibraryPack(pack?.packId, pack);
        if (!source?.packId) {
            toast('Attempt Fixing needs a Loredeck to repair.', 'warning');
            return false;
        }
        if (source.type === 'bundled') {
            toast('Bundled Loredecks cannot be repaired directly. Duplicate as Custom first.', 'warning');
            return false;
        }
        runLock = beginLoredeckHealthRepairRun(source.packId, 'Attempt Fixing');
        if (!runLock.ok) {
            showLoredeckHealthRepairRunBlockedToast(runLock);
            return false;
        }
        let attemptResult = null;
        let attemptError = null;
        try {
            setAttemptFixingButtonText(button, 'Checking health...');
            attemptResult = await attemptLoredeckHealthFixesStorage(source.packId, {
                persistSession: true,
            });
        } catch (error) {
            attemptError = error;
        }
        if (!attemptResult?.ok) {
            throw new Error(attemptResult?.error || attemptError?.message || 'Attempt Fixing failed.');
        }
        setAttemptFixingButtonText(button, 'Saving repairs...');
        await flushLoredeckHealthRepairWrites();

        let modelResult = null;
        let providerSkipMessage = '';
        if (shouldContinueAttemptFixingWithModel(attemptResult)) {
            const providerValidation = validateLoredeckHealthModelRepairProvider();
            if (providerValidation.ok) {
                setAttemptFixingButtonText(button, 'Model batches...');
                modelResult = await runLoredeckHealthModelRepairBatches(source.packId, {
                    persistSession: true,
                    session: attemptResult.session || null,
                    requestModelRepair: requestLoredeckHealthModelRepair,
                    onProgress: event => handleAttemptFixingModelProgress(button, event),
                    retryAttempts: 1,
                    signal: runLock.signal,
                });
                setAttemptFixingButtonText(button, 'Saving repairs...');
                await flushLoredeckHealthRepairWrites();
            } else {
                providerSkipMessage = `Reasoning Provider not ready for model batches: ${providerValidation.message}`;
            }
        }
        clearCanonLoreDatabaseCache();
        clearContextIndexCache();
        clearLoredeckHealthRepairCaches(source.packId);
        refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
        const formatted = modelResult
            ? formatAttemptFixingWithModelToast(attemptResult, modelResult)
            : formatAttemptFixingToast(attemptResult, { extraText: providerSkipMessage });
        toast(formatted.message, formatted.type);
        return modelResult ? (modelResult.ok !== false || modelResult.changed === true) : true;
    } catch (e) {
        toast(e?.message || 'Attempt Fixing failed.', 'error');
        return false;
    } finally {
        runLock?.finish?.();
        restoreBusy();
    }
}

export async function applyLoredeckHealthRepairChoice(pack, choiceSet = {}, option = {}, session = {}, button = null) {
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Applying...', { fallbackLabel: 'Apply' });
    let runLock = null;
    try {
        const source = getFreshLoredeckLibraryPack(pack?.packId || session?.packId, pack) || pack;
        const packId = source?.packId || session?.packId || pack?.packId || '';
        if (!packId) {
            toast('Applying a repair choice needs a Loredeck.', 'warning');
            return null;
        }
        if (source?.type === 'bundled') {
            toast('Bundled Loredecks cannot be repaired directly. Duplicate as Custom first.', 'warning');
            return null;
        }
        runLock = beginLoredeckHealthRepairRun(packId, 'Apply Repair Choice');
        if (!runLock.ok) {
            showLoredeckHealthRepairRunBlockedToast(runLock);
            return null;
        }
        const result = await applyLoredeckHealthRepairChoiceStorage(packId, {
            session,
            sessionPath: session?.sessionFile || '',
            choiceSetId: choiceSet?.choiceSetId || '',
            optionId: option?.optionId || '',
        });
        if (!result?.ok) throw new Error(result?.error || 'Repair choice could not be applied.');
        await flushLoredeckHealthRepairWrites();
        clearCanonLoreDatabaseCache();
        clearContextIndexCache();
        clearLoredeckHealthRepairCaches(packId);
        refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
        const remainingParts = getAttemptFixingRemainingParts(result);
        const label = option?.label ? ` "${option.label}"` : '';
        const delta = formatAttemptFixingHealthDelta(result.summary || {});
        const sessionText = result.sessionPath ? ' Repair session updated.' : (result.deletedSession ? ' Repair session cleared.' : '');
        const sessionErrorText = result.sessionError ? ` Session update failed: ${result.sessionError}` : '';
        toast(`Applied repair choice${label}: ${delta}.${remainingParts.length ? ` Still needs ${remainingParts.join(', ')}.` : ''}${sessionText}${sessionErrorText}`, remainingParts.length || result.sessionError ? 'warning' : 'success');
        return result;
    } catch (e) {
        toast(e?.message || 'Repair choice could not be applied.', 'error');
        return null;
    } finally {
        runLock?.finish?.();
        restoreBusy();
    }
}

export async function continueLoredeckHealthModelRepairSession(pack, session = {}, button = null) {
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Continuing...', { fallbackLabel: 'Continue Model Batches' });
    let runLock = null;
    try {
        const source = getFreshLoredeckLibraryPack(pack?.packId || session?.packId, pack) || pack;
        const packId = source?.packId || session?.packId || pack?.packId || '';
        if (!packId) {
            toast('Continuing model repair needs a Loredeck.', 'warning');
            return null;
        }
        if (source?.type === 'bundled') {
            toast('Bundled Loredecks cannot be repaired directly. Duplicate as Custom first.', 'warning');
            return null;
        }
        const remaining = session?.remaining || {};
        const modelCount = (Number(remaining.modelUnits?.length) || 0) + (Number(remaining.deferredUnits?.length) || 0);
        if (!modelCount) {
            toast('This repair session has no model batches to continue.', 'info');
            return null;
        }
        const providerValidation = validateLoredeckHealthModelRepairProvider();
        if (!providerValidation.ok) {
            toast(`Reasoning Provider not ready for model batches: ${providerValidation.message}`, 'warning');
            return null;
        }
        runLock = beginLoredeckHealthRepairRun(packId, 'Continue Model Batches');
        if (!runLock.ok) {
            showLoredeckHealthRepairRunBlockedToast(runLock);
            return null;
        }
        setAttemptFixingButtonText(button, 'Model batches...');
        const result = await runLoredeckHealthModelRepairBatches(packId, {
            persistSession: true,
            session,
            requestModelRepair: requestLoredeckHealthModelRepair,
            onProgress: event => handleAttemptFixingModelProgress(button, event),
            retryAttempts: 1,
            signal: runLock.signal,
        });
        if (!result?.ok && !result?.changed) throw new Error(result?.error || 'Model repair batches did not finish.');
        setAttemptFixingButtonText(button, 'Saving repairs...');
        await flushLoredeckHealthRepairWrites();
        clearCanonLoreDatabaseCache();
        clearContextIndexCache();
        clearLoredeckHealthRepairCaches(packId);
        refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
        const formatted = formatContinueModelRepairToast(result);
        toast(formatted.message, formatted.type);
        return result;
    } catch (e) {
        toast(e?.message || 'Model repair batches could not continue.', 'error');
        return null;
    } finally {
        runLock?.finish?.();
        restoreBusy();
    }
}

export async function reevaluateLoredeckHealthRepairChoice(pack, choiceSet = {}, session = {}, button = null) {
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Re-evaluating...', { fallbackLabel: 'Ask Model To Re-evaluate' });
    let runLock = null;
    try {
        const source = getFreshLoredeckLibraryPack(pack?.packId || session?.packId, pack) || pack;
        const packId = source?.packId || session?.packId || pack?.packId || '';
        if (!packId) {
            toast('Re-evaluating a repair choice needs a Loredeck.', 'warning');
            return null;
        }
        if (source?.type === 'bundled') {
            toast('Bundled Loredecks cannot be repaired directly. Duplicate as Custom first.', 'warning');
            return null;
        }
        if (!choiceSet?.choiceSetId) {
            toast('Choose a saved repair choice before asking the model to re-evaluate it.', 'warning');
            return null;
        }
        const providerValidation = validateLoredeckHealthModelRepairProvider();
        if (!providerValidation.ok) {
            toast(`Reasoning Provider not ready for model re-evaluation: ${providerValidation.message}`, 'warning');
            return null;
        }
        runLock = beginLoredeckHealthRepairRun(packId, 'Re-evaluate Repair Choice');
        if (!runLock.ok) {
            showLoredeckHealthRepairRunBlockedToast(runLock);
            return null;
        }
        setAttemptFixingButtonText(button, 'Model re-check...');
        const result = await reevaluateLoredeckHealthRepairChoiceStorage(packId, {
            session,
            sessionPath: session?.sessionFile || '',
            choiceSetId: choiceSet.choiceSetId,
        }, {
            persistSession: true,
            requestModelRepair: requestLoredeckHealthModelRepair,
            onProgress: event => handleAttemptFixingModelProgress(button, event),
            retryAttempts: 1,
            signal: runLock.signal,
        });
        if (!result?.ok && !result?.changed) throw new Error(result?.error || 'Model re-evaluation did not finish.');
        setAttemptFixingButtonText(button, 'Saving repairs...');
        await flushLoredeckHealthRepairWrites();
        clearCanonLoreDatabaseCache();
        clearContextIndexCache();
        clearLoredeckHealthRepairCaches(packId);
        refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
        const formatted = formatReevaluateRepairChoiceToast(result);
        toast(formatted.message, formatted.type);
        return result;
    } catch (e) {
        toast(e?.message || 'Model re-evaluation could not finish.', 'error');
        return null;
    } finally {
        runLock?.finish?.();
        restoreBusy();
    }
}

export async function exportValidatedLoredeckDraft(pack, button = null) {
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Exporting...', { fallbackLabel: 'Export Package' });
    try {
        const fresh = getFreshLoredeckLibraryPack(pack.packId, pack) || pack;
        const packageResult = await buildLoredeckZipPackageForExport([fresh]);
        downloadBytes(packageResult.zipBytes, packageResult.filename, 'application/zip');
        toast(`Loredeck package exported with ${packageResult.fileCount} file${packageResult.fileCount === 1 ? '' : 's'}.`, 'success');
    } catch (e) {
        toast(e?.message || 'Loredeck export failed.', 'error');
    } finally {
        restoreBusy();
    }
}

export async function syncLoredeckMetadataFromManifest(pack, button = null) {
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Syncing...', { fallbackLabel: 'Sync From Manifest' });
    try {
        if (isVirtualLoredeckPack(pack)) {
            const baseManifest = await fetchLoredeckManifest(pack.manifest);
            const record = {
                ...pack,
                type: 'custom',
                entrySchemaVersion: Number.isFinite(Number(baseManifest.entrySchemaVersion)) ? Number(baseManifest.entrySchemaVersion) : (Number(pack.entrySchemaVersion) || 0),
                stats: {
                    entryCount: Number.isFinite(Number(baseManifest.stats?.entryCount)) && Number(baseManifest.stats.entryCount) > 0
                        ? Math.max(0, Number(baseManifest.stats.entryCount))
                        : Math.max(0, Number(pack.entryCount || pack.stats?.entryCount) || 0),
                    categoryCounts: baseManifest.stats?.categoryCounts && typeof baseManifest.stats.categoryCounts === 'object' && !Array.isArray(baseManifest.stats.categoryCounts)
                        ? { ...baseManifest.stats.categoryCounts }
                        : (pack.stats?.categoryCounts || {}),
                },
            };
            record.manifestData = buildEmbeddedCustomManifest(baseManifest, record);
            if (getLoredeckTimelineRegistryCount(pack.timelineRegistry)) record.timelineRegistry = normalizeLoredeckTimelineRegistry(pack.timelineRegistry);
            if (getLoredeckTagRegistryCount(pack.tagRegistry)) record.tagRegistry = normalizeLoredeckTagRegistry(pack.tagRegistry);
            const result = upsertLoredeckLibraryPack(record);
            if (!result.ok) throw new Error(result.error || 'Metadata sync failed.');
            setLoredeckManifestPreviewCacheRecord(record.packId, {
                manifest: record.manifestData,
                error: '',
                loadedAt: Date.now(),
            });
            refreshLoredeckSurfaces({ clearCanon: true });
            toast(`${record.title} refreshed from its base manifest.`, 'success');
            return;
        }
        const manifest = await fetchLoredeckManifest(pack.manifest);
        const record = buildLoredeckRecordFromManifest(manifest, pack.manifest);
        if (record.packId !== pack.packId) {
            throw new Error(`Manifest id ${record.packId} does not match selected Loredeck id ${pack.packId}. Register it as a separate Loredeck instead.`);
        }
        record.type = pack.type === 'generated' ? 'generated' : 'custom';
        record.installedAt = pack.installedAt || Date.now();
        record.entryOverrides = pack.entryOverrides || {};
        record.disabledEntryIds = Array.isArray(pack.disabledEntryIds) ? [...pack.disabledEntryIds] : [];
        record.localModified = pack.localModified === true;
        const pendingChanges = getLoredeckPendingChanges(pack);
        if (pendingChanges.length) record.pendingChanges = pendingChanges;
        if (getLoredeckTimelineRegistryCount(pack.timelineRegistry)) record.timelineRegistry = normalizeLoredeckTimelineRegistry(pack.timelineRegistry);
        if (getLoredeckTagRegistryCount(pack.tagRegistry)) record.tagRegistry = normalizeLoredeckTagRegistry(pack.tagRegistry);
        const result = upsertLoredeckLibraryPack(record);
        if (!result.ok) throw new Error(result.error || 'Metadata sync failed.');
        setLoredeckManifestPreviewCacheRecord(record.packId, {
            manifest,
            error: '',
            loadedAt: Date.now(),
        });
        selectLoredeckForDetails(record.packId, { refresh: false });
        clearCanonLoreDatabaseCache();
        refreshLoredeckSurfaces();
        toast(`${record.title} metadata synced from manifest.`, 'success');
    } catch (e) {
        toast(e?.message || 'Metadata sync failed.', 'error');
    } finally {
        restoreBusy();
    }
}

export async function saveLoredeckMetadataFromInputs(pack, fields, button = null) {
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Saving...', { fallbackLabel: 'Save Metadata' });
    try {
        const fresh = await hydrateExternalLorepackPayloadRecord(getFreshLoredeckLibraryPack(pack.packId, pack) || pack);
        const title = fields.titleInput.value.trim() || fresh.title || fresh.packId;
        const nextManifest = fields.manifestInput.value.trim();
        if (nextManifest && nextManifest !== fresh.manifest) {
            const manifest = await fetchLoredeckManifest(nextManifest);
            const manifestId = String(manifest?.id || '').trim();
            if (!manifestId) throw new Error('Manifest is missing required id.');
            if (manifestId !== fresh.packId) {
                throw new Error(`Manifest id ${manifestId} does not match selected Loredeck id ${fresh.packId}. Register it as a separate Loredeck instead.`);
            }
            setLoredeckManifestPreviewCacheRecord(fresh.packId, {
                manifest,
                error: '',
                loadedAt: Date.now(),
            });
        }
        const record = {
            ...fresh,
            type: fresh.type === 'generated' ? 'generated' : 'custom',
            title,
            description: fields.descriptionInput.value.trim(),
            fandom: fields.fandomInput.value.trim(),
            era: fields.eraInput.value.trim(),
            author: fields.authorInput.value.trim(),
            version: fields.versionInput.value.trim(),
            manifest: nextManifest,
            tags: parseLoredeckTags(fields.tagsInput.value),
            localModified: true,
            updatedAt: Date.now(),
        };
        if (isGeneratedLoredeckPack(record)) {
            refreshGeneratedLoredeckDerivedMetadata(record);
        } else if (isVirtualLoredeckPack(fresh)) {
            record.manifestData = buildEmbeddedCustomManifest(fresh.manifestData, record);
        }
        const result = upsertLoredeckLibraryPack(record);
        if (!result.ok) throw new Error(result.error || 'Loredeck metadata save failed.');
        if (record.manifest !== fresh.manifest) {
            deleteLoredeckManifestPreviewCacheRecord(fresh.packId);
            deleteLoredeckEntryPreviewCacheRecord(fresh.packId);
            deleteLoredeckTimelineRegistryCacheRecord(fresh.packId);
            deleteLoredeckTagRegistryCacheRecord(fresh.packId);
        }
        clearCanonLoreDatabaseCache();
        refreshLoredeckSurfaces();
        toast(`${title} metadata saved.`, 'success');
    } catch (e) {
        toast(e?.message || 'Loredeck metadata save failed.', 'error');
    } finally {
        restoreBusy();
    }
}

export function getUniqueLoredeckPackId(baseId, library = getLoredeckLibrary(getState())) {
    const existing = new Set(library.map(pack => pack.packId));
    const base = normalizeLoredeckPackId(baseId) || 'custom-loredeck';
    if (!existing.has(base)) return base;
    for (let index = 2; index < 1000; index += 1) {
        const candidate = `${base}-${index}`;
        if (!existing.has(candidate)) return candidate;
    }
    return `${base}-${Date.now()}`;
}

export function getDefaultDuplicateLoredeckTags(pack, manifest = {}) {
    const sourceTags = Array.isArray(pack?.tags) && pack.tags.length ? pack.tags : (Array.isArray(manifest.tags) ? manifest.tags : []);
    return parseLoredeckTags([
        ...sourceTags.filter(tag => !String(tag || '').toLowerCase().startsWith('quality:')),
        'origin:duplicate',
        'quality:user-managed',
    ].join(', '));
}

export function getLoredeckDuplicateTitle(sourcePack = {}, suffix = 'Copy') {
    const title = String(sourcePack.title || sourcePack.packId || 'Loredeck').trim();
    const cleanSuffix = String(suffix || 'Copy').trim() || 'Copy';
    return /\bcopy(?:\s+\d+)?$/i.test(title) ? title : `${title} ${cleanSuffix}`;
}

export async function buildCustomDuplicateLoredeckRecord(sourcePack, options = {}) {
    sourcePack = await hydrateExternalLorepackPayloadRecord(sourcePack);
    const packId = normalizeLoredeckPackId(options.packId);
    if (!packId) throw new Error('Custom Loredeck needs a valid pack ID.');
    if (getLoredeckDefinition(packId)) throw new Error(`A Loredeck with id ${packId} already exists.`);
    const title = String(options.title || sourcePack.title || packId).trim() || packId;
    const sourceManifest = await getDisplayManifestForPack(sourcePack);
    const baseManifest = sourcePack.manifest || sourcePack.source?.url || '';
    if (!baseManifest) throw new Error('Source Loredeck does not have a fetchable manifest path.');
    const stats = {
        entryCount: Number.isFinite(Number(sourcePack.entryCount)) ? Math.max(0, Number(sourcePack.entryCount)) : (Number(sourceManifest.stats?.entryCount) || 0),
        categoryCounts: sourceManifest.stats?.categoryCounts && typeof sourceManifest.stats.categoryCounts === 'object' && !Array.isArray(sourceManifest.stats.categoryCounts)
            ? { ...sourceManifest.stats.categoryCounts }
            : (sourcePack.stats?.categoryCounts || {}),
    };
    const derivedFrom = {
        packId: sourcePack.packId,
        title: sourcePack.title || sourcePack.packId,
        type: sourcePack.type || 'custom',
        version: sourcePack.version || sourceManifest.version || '',
        manifest: baseManifest,
        duplicatedAt: Date.now(),
    };
    const record = {
        packId,
        type: 'custom',
        title,
        description: String(options.description ?? sourcePack.description ?? '').trim(),
        fandom: sourcePack.fandom || sourceManifest.fandom || '',
        era: sourcePack.era || sourceManifest.era || '',
        author: String(options.author || 'User').trim(),
        version: String(options.version || '1.0.0').trim() || '1.0.0',
        entrySchemaVersion: Number.isFinite(Number(sourceManifest.entrySchemaVersion)) ? Number(sourceManifest.entrySchemaVersion) : (Number(sourcePack.entrySchemaVersion) || 0),
        manifest: baseManifest,
        source: {
            kind: 'derived',
            url: baseManifest,
            updateUrl: '',
        },
        tags: Array.isArray(options.tags) ? options.tags : parseLoredeckTags(options.tags || getDefaultDuplicateLoredeckTags(sourcePack, sourceManifest).join(', ')),
        stats,
        healthStatus: '',
        derivedFrom,
        entryOverrides: {},
        disabledEntryIds: [],
        installedAt: Date.now(),
        updatedAt: Date.now(),
    };
    if (getLoredeckTagRegistryCount(sourcePack.tagRegistry)) {
        record.tagRegistry = normalizeLoredeckTagRegistry(sourcePack.tagRegistry);
    }
    if (getLoredeckTimelineRegistryCount(sourcePack.timelineRegistry)) {
        record.timelineRegistry = normalizeLoredeckTimelineRegistry(sourcePack.timelineRegistry);
    }
    record.manifestData = buildEmbeddedCustomManifest(sourceManifest, record);
    return record;
}

export async function createCustomDuplicateLoredeckRecord(sourcePack, options = {}) {
    const record = await buildCustomDuplicateLoredeckRecord(sourcePack, options);
    const result = upsertLoredeckLibraryPack(record);
    if (!result.ok) throw new Error(result.error || 'Loredeck duplication failed.');
    setLoredeckManifestPreviewCacheRecord(record.packId, {
        manifest: record.manifestData,
        error: '',
        loadedAt: Date.now(),
    });
    return record;
}

export function getFinalizedGeneratedLoredeckTags(pack = {}) {
    const sourceTags = Array.isArray(pack.tags) ? pack.tags : [];
    const tags = sourceTags.filter(tag => {
        const key = String(tag || '').trim().toLowerCase();
        return key
            && key !== 'origin:generated'
            && key !== 'quality:model-drafted'
            && key !== 'saga:creator';
    });
    tags.push('origin:custom', 'source:generated', 'quality:user-managed', 'saga:creator-finalized');
    return parseLoredeckTags(tags.join(', '));
}

export function finalizeGeneratedLoredeckEntry(entry = {}, targetPackId = '', sourcePackId = '', finalizedAt = Date.now()) {
    const next = cloneLoredeckJson(entry) || { ...(entry || {}) };
    next.source = `saga-loredeck:${targetPackId}:custom`;
    const extensions = next.extensions && typeof next.extensions === 'object' && !Array.isArray(next.extensions)
        ? { ...next.extensions }
        : {};
    delete extensions.sagaLoredeckCreator;
    extensions.sagaLoredeckFinalizedFrom = {
        packId: sourcePackId,
        source: 'loredeck_creator',
        finalizedAt,
    };
    if (extensions.sagaLoredeckOverride && typeof extensions.sagaLoredeckOverride === 'object' && !Array.isArray(extensions.sagaLoredeckOverride)) {
        extensions.sagaLoredeckOverride = {
            ...extensions.sagaLoredeckOverride,
            packId: targetPackId,
            source: 'custom_finalized',
        };
    }
    next.extensions = extensions;
    return next;
}

export function buildFinalizedCustomLoredeckRecordFromGenerated(sourcePack = {}, options = {}) {
    if (!isGeneratedLoredeckPack(sourcePack)) throw new Error('Only Generated Loredecks can be finalized as Custom.');
    const packId = normalizeLoredeckPackId(options.packId || getUniqueLoredeckPackId(`${sourcePack.packId}-custom`));
    if (!packId) throw new Error('Finalized Custom Loredeck needs a valid pack ID.');
    if (getLoredeckDefinition(packId)) throw new Error(`A Loredeck with id ${packId} already exists.`);
    const finalizedAt = Date.now();
    const entries = getAcceptedGeneratedLoredeckEntries(sourcePack);
    if (!entries.length) throw new Error('Generated Loredeck needs accepted Lorecards before it can be finalized.');
    const entryOverrides = {};
    for (const entry of entries) {
        const id = normalizeLoredeckEntryId(entry.id);
        if (!id) continue;
        entryOverrides[id] = finalizeGeneratedLoredeckEntry(entry, packId, sourcePack.packId, finalizedAt);
    }
    const stats = buildLoredeckStatsFromEntries(Object.values(entryOverrides));
    const title = String(options.title || getLoredeckDuplicateTitle(sourcePack, 'Custom') || packId).trim() || packId;
    const manifestSeed = {
        ...(cloneLoredeckJson(sourcePack.manifestData) || {}),
        id: packId,
        type: 'custom',
        title,
        description: String(options.description ?? sourcePack.description ?? '').trim(),
        fandom: sourcePack.fandom || sourcePack.manifestData?.fandom || '',
        era: sourcePack.era || sourcePack.manifestData?.era || '',
        author: String(options.author || 'User').trim(),
        version: String(options.version || '1.0.0').trim() || '1.0.0',
        entrySchemaVersion: Math.max(3, Number(sourcePack.entrySchemaVersion || sourcePack.manifestData?.entrySchemaVersion) || 0),
        files: [],
        tags: getFinalizedGeneratedLoredeckTags(sourcePack),
        stats,
        update: {
            checkForUpdates: false,
            url: '',
        },
    };
    const record = {
        packId,
        type: 'custom',
        title,
        description: manifestSeed.description,
        fandom: manifestSeed.fandom,
        era: manifestSeed.era,
        author: manifestSeed.author,
        version: manifestSeed.version,
        entrySchemaVersion: manifestSeed.entrySchemaVersion,
        manifest: '',
        source: {
            kind: 'generated_finalized',
            url: '',
            updateUrl: '',
            originalPackId: sourcePack.packId,
        },
        tags: manifestSeed.tags,
        stats,
        healthStatus: options.healthStatus || sourcePack.healthStatus || '',
        derivedFrom: {
            packId: sourcePack.packId,
            title: sourcePack.title || sourcePack.packId,
            type: 'generated',
            version: sourcePack.version || '',
            creatorJobId: options.creatorJob?.jobId || getLoredeckCreatorJobForPack(sourcePack)?.jobId || '',
            finalizedAt,
            ...(options.creatorCoverageProvenance ? { creatorCoverage: options.creatorCoverageProvenance } : {}),
        },
        entryOverrides,
        disabledEntryIds: Array.isArray(sourcePack.disabledEntryIds) ? [...sourcePack.disabledEntryIds] : [],
        tagRegistry: normalizeLoredeckTagRegistry(sourcePack.tagRegistry),
        timelineRegistry: normalizeLoredeckTimelineRegistry(sourcePack.timelineRegistry),
        pendingChanges: [],
        localModified: true,
        installedAt: finalizedAt,
        updatedAt: finalizedAt,
    };
    record.manifestData = buildEmbeddedCustomManifest(manifestSeed, record);
    return record;
}

export async function finalizeGeneratedLoredeckAsCustom(pack, button = null) {
    let restoreBusy = setLoredeckActionButtonBusy(button, 'Finalizing...', { fallbackLabel: 'Finalize as Custom' });
    const finishBusy = () => {
        if (!restoreBusy) return;
        restoreBusy();
        restoreBusy = null;
    };
    try {
        const fresh = getFreshLoredeckLibraryPack(pack.packId, pack);
        if (!isGeneratedLoredeckPack(fresh)) throw new Error('Only Generated Loredecks can be finalized as Custom.');
        const validation = await validateLoredeckForEditor(fresh, null, { quiet: true, updateLibrary: true });
        if (!validation.health) throw new Error(validation.error || 'Validation failed before finalizing.');
        const validated = getFreshLoredeckLibraryPack(fresh.packId, fresh);
        const creatorJob = getLoredeckCreatorJobForPack(validated);
        const readiness = getGeneratedLoredeckExportReadiness(validated, validation.health, creatorJob);
        if (!readiness.ready) {
            throw new Error(`Generated Loredeck is not ready to finalize: ${readiness.blockers[0] || 'resolve pending generated draft state first.'}`);
        }
        if (readiness.warnings.length) {
            const proceed = await confirmAction(
                'Finalize Generated Loredeck with warnings?',
                [
                    `${validated.title || validated.packId} has readiness warnings:`,
                    ...readiness.warnings.slice(0, 6).map(item => `- ${item}`),
                    readiness.warnings.length > 6 ? `- ...and ${readiness.warnings.length - 6} more` : '',
                    '',
                    'Finalize anyway as a Custom Loredeck copy?',
                ].filter(Boolean).join('\n')
            );
            if (!proceed) return null;
        }
        const record = buildFinalizedCustomLoredeckRecordFromGenerated(validated, {
            healthStatus: validation.health.status,
            creatorJob,
            creatorCoverageProvenance: buildLoredeckCreatorCoverageFinalizationProvenance(readiness.pipeline?.coverage),
        });
        createStateBackup('before_creator_finalization', {
            label: `Before finalizing ${validated.title || validated.packId} as Custom.`,
        });
        const result = upsertLoredeckLibraryPack(record);
        if (!result.ok) throw new Error(result.error || 'Generated Loredeck finalization failed.');
        setLoredeckManifestPreviewCacheRecord(record.packId, {
            manifest: record.manifestData,
            health: null,
            error: '',
            loadedAt: Date.now(),
        });
        selectLoredeckForDetails(record.packId, { refresh: false });
        clearCanonLoreDatabaseCache();
        clearContextIndexCache();
        const postSaveValidation = await runFinalizationStepWithTimeout(
            'Finalized Custom Loredeck validation',
            FINALIZATION_POST_SAVE_TIMEOUT_MS,
            () => validateLoredeckForEditor(record, null, { quiet: true, updateLibrary: true })
        );
        if (!postSaveValidation.ok) {
            warnFinalizationPostStep(`Finalized Custom Loredeck was created, but the post-save Pack Health refresh did not finish: ${postSaveValidation.error}`);
        }
        const retirement = await runFinalizationStepWithTimeout(
            'Generated Loredeck retirement',
            FINALIZATION_RETIREMENT_TIMEOUT_MS,
            () => retireGeneratedLoredeckAfterFinalization(validated, record, creatorJob)
        );
        if (!retirement.ok) {
            warnFinalizationPostStep(`Finalized Custom Loredeck was created, but the Generated draft cleanup did not finish: ${retirement.error}`);
        } else if (retirement.value?.ok === false) {
            warnFinalizationPostStep(retirement.value.error || 'Finalized Custom Loredeck was created, but the Deck Maker draft could not be retired.');
        }
        finishBusy();
        refreshFinalizedLoredeckUi(record);
        toast(`${record.title || record.packId} finalized as a Custom Loredeck.`, 'success');
        return record;
    } catch (e) {
        toast(e?.message || 'Generated Loredeck finalization failed.', 'error');
        return null;
    } finally {
        finishBusy();
    }
}

export async function duplicateLoredeckAsCustom(sourcePack, fields, button = null) {
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Creating...', { fallbackLabel: 'Create Custom Loredeck' });
    try {
        const packId = normalizeLoredeckPackId(fields.idInput.value);
        const title = fields.titleInput.value.trim() || packId;
        const record = await createCustomDuplicateLoredeckRecord(sourcePack, {
            packId,
            title,
            description: fields.descriptionInput.value.trim(),
            author: fields.authorInput.value.trim(),
            version: fields.versionInput.value.trim() || '1.0.0',
            tags: parseLoredeckTags(fields.tagsInput.value),
        });
        fields.overlay?.remove?.();
        selectLoredeckForDetails(record.packId, { refresh: false });
        if (fields.addToStackInput.checked) {
            addLoredeckToStack(record.packId);
        }
        refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
    } catch (e) {
        toast(e?.message || 'Loredeck duplication failed.', 'error');
    } finally {
        restoreBusy();
    }
}
