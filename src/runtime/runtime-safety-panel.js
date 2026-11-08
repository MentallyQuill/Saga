import { normalizeLoreMatrix } from '../lorecards/lore-matrix.js';
import { captureLoreTimelineState, recordLoreTimelineEvent } from '../lorecards/lore-timeline.js';
import { clearCanonLoreDatabaseCache } from '../context/canon-lore-db.js';
import { clearContextIndexCache } from '../context/context-index.js';
import { DEFAULT_SETTINGS, getDefaultState } from '../state/constants.js';
import { captureChatOperation } from '../state/chat-operation.js';
import { appendStateSafetyLog } from '../state/state-backup.js';
import { clearStoredSecret } from '../state/secure-keyring.js';
import { pruneUnavailableLoredeckStackItems } from './active-stack-panel.js';
import {
    cleanMissingSagaStorageIndexRecords,
    createStateBackup,
    createStateBackupDurable,
    exportSagaState,
    getSettings,
    getSagaStorageDiagnostics,
    getState,
    getStateSafety,
    isUnverifiedLegacyStateSave,
    restoreStateWithBackup,
    saveSettings,
    saveState,
    settleSagaStorageWrites,
    verifySagaStorageIntegrity,
} from '../state/state-manager.js';
import {
    buildSagaGlobalCleanupPreview,
    getSagaGlobalCleanupSnapshot,
    removeSagaCustomLoredeckStorage,
    removeSagaCustomThemeIconStorage,
    runSagaTotalStorageCleanup,
} from '../storage/saga-global-cleanup.js';
import {
    addTooltip,
    confirmAction,
    createButton,
    createKeyValue,
    createStatusPill,
    promptTextAction,
    runBusyAction,
    toast,
} from '../ui/runtime-ui-kit.js';
import { downloadJson } from './runtime-downloads.js';
import { sanitizeFileStem, truncateCleanText } from './runtime-formatters.js';

const STORED_API_KEY_SETTING_PREFIXES = Object.freeze(['loreOpenAI', 'continuityOpenAI']);

let runtimeSafetyPanelDeps = {};

export function configureRuntimeSafetyPanel(deps = {}) {
    runtimeSafetyPanelDeps = { ...runtimeSafetyPanelDeps, ...(deps || {}) };
}

function dep(name, fallback = null) {
    const value = runtimeSafetyPanelDeps?.[name];
    if (typeof value === 'function') return value;
    if (typeof fallback === 'function') return fallback;
    throw new Error(`Saga Runtime Safety panel dependency is not configured: ${name}`);
}

function refreshPanelBody(options = {}) { return dep('refreshPanelBody', () => null)(options); }
function refreshHeader() { return dep('refreshHeader', () => null)(); }
function refreshRuntimeThemeSurfaces(settings = getSettings()) { return dep('refreshRuntimeThemeSurfaces', () => null)(settings); }
function resetCanonPreviewUiState(options = {}) { return dep('resetCanonPreviewUiState', () => null)(options); }
function cloneJson(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
}

function cloneDefaultSettings() {
    return cloneJson(DEFAULT_SETTINGS);
}

function preserveStorageBootstrapSettings(source, target) {
    if (!source || !target) return target;
    target.sagaStorage = cloneJson(source.sagaStorage || DEFAULT_SETTINGS.sagaStorage);
    target.sagaStorageFallback = cloneJson(source.sagaStorageFallback || DEFAULT_SETTINGS.sagaStorageFallback);
    return target;
}

function clearSagaStoredProviderKeys() {
    for (const prefix of STORED_API_KEY_SETTING_PREFIXES) {
        try {
            clearStoredSecret(prefix);
        } catch (e) {
            console.warn(`[Saga] Failed to clear ${prefix} provider key material during settings reset:`, e);
        }
    }
}

function resetAllSettingsToDefaults() {
    const current = getSettings();
    const defaults = cloneDefaultSettings();
    preserveStorageBootstrapSettings(current, defaults);
    saveSettings(defaults);
    clearSagaStoredProviderKeys();
    return defaults;
}

function resetAllSettingsToFreshDefaults() {
    const defaults = cloneDefaultSettings();
    saveSettings(defaults);
    clearSagaStoredProviderKeys();
    return defaults;
}

function resetThemeIconSettingsToDefaults() {
    const settings = getSettings();
    settings.themePackId = cloneJson(DEFAULT_SETTINGS.themePackId);
    settings.themeIconSetId = cloneJson(DEFAULT_SETTINGS.themeIconSetId);
    saveSettings(settings);
    return settings;
}

function preserveRuntimePanelGeometry(nextState, currentPanel = {}, activeTab = 'settings') {
    if (!nextState || !nextState.lorePanel) return nextState;
    const defaultsPanel = getDefaultState().lorePanel;
    const nextPanel = nextState.lorePanel || defaultsPanel;
    const panel = currentPanel && typeof currentPanel === 'object' ? currentPanel : {};
    const railX = Number.isFinite(Number(panel.railX)) ? Number(panel.railX) : (Number.isFinite(Number(panel.x)) ? Number(panel.x) : defaultsPanel.railX);
    const railY = Number.isFinite(Number(panel.railY)) ? Number(panel.railY) : (Number.isFinite(Number(panel.y)) ? Number(panel.y) : defaultsPanel.railY);
    const drawerWidth = Number.isFinite(Number(panel.drawerWidth)) ? Number(panel.drawerWidth) : (Number.isFinite(Number(panel.width)) ? Number(panel.width) : defaultsPanel.drawerWidth);
    const drawerHeight = Number.isFinite(Number(panel.drawerHeight)) ? Number(panel.drawerHeight) : (Number.isFinite(Number(panel.height)) ? Number(panel.height) : defaultsPanel.drawerHeight);
    nextState.lorePanel = {
        ...nextPanel,
        isOpen: true,
        hasOpenedRuntime: true,
        launcherDismissed: panel.launcherDismissed === true,
        railMode: panel.railMode === 'expanded' ? 'expanded' : defaultsPanel.railMode,
        railX,
        railY,
        drawerOpen: true,
        collapsed: false,
        drawerWidth,
        drawerHeight,
        drawerDirection: ['auto', 'right', 'left'].includes(panel.drawerDirection) ? panel.drawerDirection : defaultsPanel.drawerDirection,
        x: railX,
        y: railY,
        width: drawerWidth,
        height: drawerHeight,
        activeTab,
    };
    return nextState;
}

function createFreshActiveChatStateForTotalCleanup() {
    const current = getState();
    const defaults = getDefaultState();
    const currentPanel = current?.lorePanel && typeof current.lorePanel === 'object' ? current.lorePanel : {};
    return preserveRuntimePanelGeometry(defaults, currentPanel, 'settings');
}

function formatTotalCleanupPartialMessage(result = {}) {
    const failed = Number(result.failedFileCount) || 0;
    const errors = (result.diagnostics || []).filter(item => item?.severity === 'error');
    const extraErrorCount = Math.max(0, errors.length - failed);
    const parts = [
        `Total Saga Cleanup partially completed: ${result.deletedFileCount || 0} file${result.deletedFileCount === 1 ? '' : 's'} deleted`,
        failed ? `${failed} failed` : '',
        extraErrorCount ? `${extraErrorCount} cleanup error${extraErrorCount === 1 ? '' : 's'}` : '',
        result.masterIndexRetained ? 'Storage index retained for retry' : 'Switch to Advanced and check State Safety before retry',
    ].filter(Boolean);
    const first = errors[0]?.message ? ` First: ${truncateCleanText(errors[0].message, 90)}` : '';
    return `${parts.join(', ')}.${first}`;
}

function attachTotalCleanupPartialStateSafety(nextState = {}, result = {}) {
    appendStateSafetyLog(nextState, {
        type: 'total_cleanup_warning',
        message: formatTotalCleanupPartialMessage(result),
    });
    return nextState;
}

export function resetSettingKeysToDefaults(settingKeys, label = 'Settings') {
    const keys = Array.isArray(settingKeys) ? settingKeys : [];
    if (!keys.length) return;

    const next = getSettings();
    let changed = 0;
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) continue;
        next[key] = cloneJson(DEFAULT_SETTINGS[key]);
        changed += 1;
    }

    if (!changed) return;
    saveSettings(next);
    refreshRuntimeThemeSurfaces(next);
    refreshPanelBody({ preserveScroll: true });
    refreshHeader();
    toast(`${label} reset to defaults.`, 'info');
}

export function appendSettingsResetButton(container, settingKeys, label = 'Settings') {
    if (!container || !Array.isArray(settingKeys) || !settingKeys.length) return;
    const row = document.createElement('div');
    row.className = 'saga-settings-reset-row';
    row.appendChild(createButton(
        'Reset Defaults',
        `Reset only the ${label.toLowerCase()} controls in this section to bundled defaults.`,
        () => resetSettingKeysToDefaults(settingKeys, label),
        'saga-small-button saga-settings-reset-button'
    ));
    container.appendChild(row);
}

function formatStateSafetyTimestamp(value) {
    const time = Number(value) || 0;
    return time ? new Date(time).toLocaleString() : 'never';
}

function downloadSagaStateExport() {
    const state = getState();
    const exported = JSON.parse(exportSagaState(state));
    const stem = sanitizeFileStem(`saga-state-${new Date().toISOString().slice(0, 10)}`);
    downloadJson(exported, `${stem}.json`);
    toast('Saga state exported.', 'success');
}

function toastStateSafetySave(message, persisted) {
    if (persisted) toast(message, 'success');
    else toast(`${message} SillyTavern could not verify the save. Use Export State to keep a separate copy.`, 'warning');
}

async function restoreSagaState({ file, backup }, operation) {
    try {
        operation.assertCurrent();
        const title = file ? 'Restore Saga state from file?' : 'Restore latest Saga backup?';
        const message = file
            ? 'Replace the current Saga chat state with the selected exported state JSON?'
            : `Restore backup ${backup.label || backup.reason || backup.id} from ${formatStateSafetyTimestamp(backup.createdAt)}?`;
        const proceed = await confirmAction(title,
            `${message} Saga will back up the current state first. If SillyTavern can't verify the save, Saga will still apply the restore to this chat. Use Export State first if you need a separate recovery copy.`);
        if (!proceed) return;
        operation.assertCurrent();

        const source = file ? { json: await file.text() } : { backupId: backup.id };
        const result = await restoreStateWithBackup(source, { operation, allowUnverified: true });
        if (!result.ok) throw new Error(result.error || 'State restore failed.');
        operation.assertCurrent();
        refreshPanelBody({ preserveScroll: false });
        refreshHeader();
        toastStateSafetySave(file ? 'Saga state restored from file.' : 'Latest Saga state backup restored.', result.persisted);
    } catch (error) {
        toast(error?.message || 'Saga state restore failed.', 'error');
    } finally {
        operation.release();
    }
}

function restoreSagaStateFromFile() {
    const operation = captureChatOperation({ lane: 'state-safety-restore', requireEnabled: false });
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('cancel', () => operation.release(), { once: true });
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) void restoreSagaState({ file }, operation);
        else operation.release();
    }, { once: true });
    input.click();
}

function getStorageDiagnosticsLabel(diagnostics = {}) {
    if (diagnostics.status === 'ok') return 'Storage verified';
    if (diagnostics.status === 'missing_files') return `${diagnostics.missingFileCount || 0} missing file${diagnostics.missingFileCount === 1 ? '' : 's'}`;
    if (diagnostics.status === 'missing_index') return 'Storage index missing';
    if (diagnostics.status === 'storage_errors' || diagnostics.status === 'write_errors') return 'Storage errors';
    return diagnostics.checkedAt ? 'Storage check stale' : 'Storage not checked';
}

function getStorageDiagnosticsTone(diagnostics = {}) {
    if (diagnostics.status === 'ok') return 'success';
    if (['missing_files', 'missing_index', 'storage_errors', 'write_errors', 'errors'].includes(diagnostics.status)) return 'warning';
    return 'muted';
}

function getStorageRuntimeErrorCount(diagnostics = {}) {
    return (diagnostics.storageErrors || diagnostics.writeErrors || []).length;
}

function formatStorageDiagnosticsSummary(diagnostics = {}) {
    if (diagnostics.status === 'ok') return `${diagnostics.fileCount || 0} tracked`;
    if (diagnostics.status === 'missing_files') return `${diagnostics.fileCount || 0} tracked, ${diagnostics.missingFileCount || 0} missing`;
    if (diagnostics.status === 'storage_errors' || diagnostics.status === 'write_errors') {
        const count = getStorageRuntimeErrorCount(diagnostics);
        return `${count} storage error${count === 1 ? '' : 's'}`;
    }
    if (diagnostics.status === 'missing_index') return 'index missing';
    if (diagnostics.pendingWrites) return `${diagnostics.pendingWrites} pending write${diagnostics.pendingWrites === 1 ? '' : 's'}`;
    return diagnostics.checkedAt ? `last checked ${formatStateSafetyTimestamp(diagnostics.checkedAt)}` : 'not checked';
}

async function verifyStorageFromButton(button) {
    await runBusyAction(button, 'Verifying...', async () => {
        const result = await verifySagaStorageIntegrity({ write: true });
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        const summary = formatStorageDiagnosticsSummary(result);
        toast(result.ok ? `Saga storage verified: ${summary}.` : `Saga storage needs attention: ${summary}.`, result.ok ? 'success' : 'warning');
    });
}

async function settleStorageWritesFromButton(button) {
    await runBusyAction(button, 'Settling...', async () => {
        const result = await settleSagaStorageWrites({ write: true });
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        const summary = formatStorageDiagnosticsSummary(result);
        toast(result.ok ? `Saga storage settled: ${summary}.` : `Saga storage needs attention: ${summary}.`, result.ok ? 'success' : 'warning');
    });
}

async function cleanMissingStorageRecordsFromButton(button) {
    const proceed = await confirmAction(
        'Clean missing Saga storage records?',
        'Saga will verify the master storage index and remove records for missing non-index files. It will not scan for unknown orphan files or delete Library rows. Continue?'
    );
    if (!proceed) return;
    await runBusyAction(button, 'Cleaning...', async () => {
        const result = await cleanMissingSagaStorageIndexRecords({ write: true });
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        const cleaned = result.cleanedFileCount || 0;
        const protectedCount = result.protectedMissingFileCount || 0;
        if (cleaned) {
            toast(`Cleaned ${cleaned} missing storage record${cleaned === 1 ? '' : 's'}${protectedCount ? `; ${protectedCount} protected missing index record${protectedCount === 1 ? '' : 's'} still need review` : ''}.`, protectedCount ? 'warning' : 'success');
            return;
        }
        toast(protectedCount
            ? `${protectedCount} missing protected storage record${protectedCount === 1 ? '' : 's'} still need review.`
            : 'No missing non-index storage records were found.',
        protectedCount ? 'warning' : 'info');
    });
}

async function resetAllSettingsFromButton(button) {
    const proceed = await confirmAction(
        'Are you sure? Reset all Saga settings?',
        'You are about to reset Saga preferences, workflow settings, provider selections, generation settings, injection settings, UI defaults, and stored Saga API keys. Custom Loredecks, Theme Packs, Icon Sets, active chat state, Accepted Lorecards, Pending Review entries, and Lore Timeline are not deleted. Continue?'
    );
    if (!proceed) return;
    await runBusyAction(button, 'Resetting...', async ({ setText }) => {
        setText('Clearing settings...');
        const settings = resetAllSettingsToDefaults();
        refreshRuntimeThemeSurfaces(settings);
        refreshPanelBody({ preserveScroll: false });
        refreshHeader();
        toast('Saga settings reset to defaults. Stored Saga API keys were removed.', 'info');
    });
}

function formatCleanupDiagnostics(result = {}) {
    const errors = (result.diagnostics || []).filter(item => item.severity === 'error');
    if (!errors.length) return '';
    const message = truncateCleanText(errors[0]?.message || errors[0]?.error || errors[0]?.code || 'Cleanup failed.', 100);
    return ` ${errors.length} cleanup error${errors.length === 1 ? '' : 's'} ${errors.length === 1 ? 'needs' : 'need'} review${message ? `; first: ${message}` : ''}. Switch to Advanced and check State Safety before retry.`;
}

async function removeCustomThemesFromButton(button) {
    await runBusyAction(button, 'Checking...', async ({ setText }) => {
        setText('Checking storage...');
        const preview = await buildSagaGlobalCleanupPreview();
        const count = preview.totalCustomThemeIconCount || 0;
        if (!count) {
            toast('No custom Theme Packs or Icon Sets were found.', 'info');
            return;
        }
        setText('Awaiting confirmation...');
        const proceed = await confirmAction(
            'Remove custom Theme Packs and Icon Sets?',
            `Saga will delete ${preview.themePackCount || 0} custom Theme Pack${preview.themePackCount === 1 ? '' : 's'}, ${preview.iconSetCount || 0} custom Icon Set${preview.iconSetCount === 1 ? '' : 's'}, and their uploaded icon assets. Bundled appearance packs will remain. Continue?`
        );
        if (!proceed) return;
        setText('Deleting files...');
        const result = await removeSagaCustomThemeIconStorage();
        const settings = resetThemeIconSettingsToDefaults();
        refreshRuntimeThemeSurfaces(settings);
        await verifySagaStorageIntegrity({ write: true });
        refreshPanelBody({ preserveScroll: false });
        refreshHeader();
        const removed = (result.removedThemePackCount || 0) + (result.removedIconSetCount || 0);
        toast(
            `Removed ${removed} custom appearance pack${removed === 1 ? '' : 's'} and ${result.deletedFileCount || 0} file${result.deletedFileCount === 1 ? '' : 's'}.${formatCleanupDiagnostics(result)}`,
            result.ok ? 'success' : 'warning',
        );
    });
}

async function removeCustomLoredecksFromButton(button) {
    await runBusyAction(button, 'Checking...', async ({ setText }) => {
        setText('Checking storage...');
        const preview = await buildSagaGlobalCleanupPreview();
        if (!preview.loredeckCount) {
            toast('No custom Loredecks were found.', 'info');
            return;
        }
        setText('Awaiting confirmation...');
        const proceed = await confirmAction(
            'Remove custom Loredecks?',
            `Saga will delete ${preview.loredeckCount} custom, imported, or generated Loredeck${preview.loredeckCount === 1 ? '' : 's'} plus owned payload files, cover assets, and Health repair sessions. Bundled Loredecks and Deck Maker drafts will remain. Continue?`
        );
        if (!proceed) return;
        setText('Deleting Loredeck files...');
        const result = await removeSagaCustomLoredeckStorage();
        const stackPrune = pruneUnavailableLoredeckStackItems();
        await verifySagaStorageIntegrity({ write: true });
        refreshPanelBody({ preserveScroll: false });
        refreshHeader();
        toast(
            `Removed ${result.removedLoredeckCount || 0} custom Loredeck${result.removedLoredeckCount === 1 ? '' : 's'}, ${result.deletedFileCount || 0} payload/asset file${result.deletedFileCount === 1 ? '' : 's'}, and ${result.repairSessionDeletedCount || 0} repair session${result.repairSessionDeletedCount === 1 ? '' : 's'}.${stackPrune.removedCount ? ` Pruned ${stackPrune.removedCount} unavailable active-stack reference${stackPrune.removedCount === 1 ? '' : 's'}.` : ''}${formatCleanupDiagnostics(result)}`,
            result.ok ? 'success' : 'warning',
        );
    });
}

function formatTotalCleanupPreview(preview = {}) {
    const parts = [
        `${preview.totalSagaFileCount || 0} tracked/known/referenced Saga file${preview.totalSagaFileCount === 1 ? '' : 's'}`,
        `${preview.loredeckCount || 0} custom Loredeck${preview.loredeckCount === 1 ? '' : 's'}`,
        `${preview.creatorProjectCount || 0} Deck Maker project${preview.creatorProjectCount === 1 ? '' : 's'}`,
        `${preview.themePackCount || 0} Theme Pack${preview.themePackCount === 1 ? '' : 's'}`,
        `${preview.iconSetCount || 0} Icon Set${preview.iconSetCount === 1 ? '' : 's'}`,
    ];
    if (Number(preview.untrackedReferencedFileCount) > 0) {
        parts.push(`${preview.untrackedReferencedFileCount} additional referenced file${preview.untrackedReferencedFileCount === 1 ? '' : 's'}`);
    }
    if (Number(preview.repairSessionCount) > 0) {
        parts.push(`${preview.repairSessionCount} repair session${preview.repairSessionCount === 1 ? '' : 's'}`);
    }
    return parts.join(', ');
}

async function runTotalSagaCleanupFromButton(button) {
    const phrase = 'DELETE Saga';
    await runBusyAction(button, 'Checking...', async ({ setText }) => {
        setText('Checking storage...');
        const preview = await buildSagaGlobalCleanupPreview();
        setText('Awaiting confirmation...');
        const entered = await promptTextAction(
            'Total Saga Cleanup',
            `Type ${phrase} to delete tracked Saga-owned custom content and reset Saga settings, stored Saga API keys, active-chat Saga state, State Safety backups, Deck Maker projects, and all user-created/imported/generated Loredecks. Bundled extension content remains. Unknown unindexed orphan files that Saga cannot see through its indexes may remain. Preview: ${formatTotalCleanupPreview(preview)}.`,
            '',
            {
                placeholder: phrase,
                confirmLabel: 'Delete Saga Data',
                required: true,
                maxLength: phrase.length + 8,
            }
        );
        if (entered === null) return;
        if (String(entered || '').trim().toUpperCase() !== phrase.toUpperCase()) {
            toast('Total Saga Cleanup cancelled. Confirmation text did not match.', 'warning');
            return;
        }
        setText('Deleting Saga files...');
        const result = await runSagaTotalStorageCleanup();
        const failed = result.failedFileCount || 0;
        const errorCount = (result.diagnostics || []).filter(item => item.severity === 'error').length;
        const partial = failed > 0 || errorCount > 0 || result.ok === false;
        setText('Resetting Saga...');
        const settings = partial ? resetAllSettingsToDefaults() : resetAllSettingsToFreshDefaults();
        const nextState = createFreshActiveChatStateForTotalCleanup();
        if (partial) attachTotalCleanupPartialStateSafety(nextState, result);
        resetCanonPreviewUiState({ preserveDetailLevel: false });
        clearCanonLoreDatabaseCache();
        clearContextIndexCache();
        saveState(nextState);
        refreshRuntimeThemeSurfaces(settings);
        refreshPanelBody({ preserveScroll: false });
        refreshHeader();
        toast(
            partial
                ? formatTotalCleanupPartialMessage(result)
                : `Total Saga Cleanup completed: ${result.deletedFileCount || 0} file${result.deletedFileCount === 1 ? '' : 's'} deleted, ${result.missingFileCount || 0} already gone.`,
            partial ? 'warning' : 'success',
        );
    });
}

export function createStateSafetyCard(state = getState()) {
    const safety = getStateSafety(state);
    const storageDiagnostics = getSagaStorageDiagnostics();
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-state-safety-card';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'State Safety';
    addTooltip(title, 'Backup, export, restore, and schema-normalization records for the current chat Saga state.');
    card.appendChild(title);

    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-entry-summary';
    summary.appendChild(createStatusPill(`${safety.backups.length} backup${safety.backups.length === 1 ? '' : 's'}`, 'Automatic and manual Saga state backups stored in this chat.', { tone: safety.backups.length ? 'source' : 'muted', kind: 'count' }));
    summary.appendChild(createStatusPill(`${safety.migrationLog.length} log${safety.migrationLog.length === 1 ? '' : 's'}`, 'Schema migration and restore log entries.', { tone: safety.migrationLog.length ? 'info' : 'muted', kind: 'count' }));
    summary.appendChild(createStatusPill(getStorageDiagnosticsLabel(storageDiagnostics), formatStorageDiagnosticsSummary(storageDiagnostics), { tone: getStorageDiagnosticsTone(storageDiagnostics), kind: 'status', maxChars: 34 }));
    if (safety.lastBackupAt) summary.appendChild(createStatusPill(`Last backup ${formatStateSafetyTimestamp(safety.lastBackupAt)}`, `Reason: ${safety.lastBackupReason || 'unknown'}`, { tone: 'source', kind: 'source', maxChars: 36 }));
    if (safety.lastRestoreAt) summary.appendChild(createStatusPill(`Last restore ${formatStateSafetyTimestamp(safety.lastRestoreAt)}`, `Source: ${safety.lastRestoreSource || 'unknown'}`, { tone: 'source', kind: 'source', maxChars: 36 }));
    card.appendChild(summary);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    actions.appendChild(createButton('Backup Now', 'Create a Saga state backup in this chat before testing risky alpha workflows.', async () => {
        const result = await createStateBackupDurable('manual');
        if (!result.ok && !isUnverifiedLegacyStateSave(result)) {
            toast(result.error || 'Saga state backup failed.', 'error');
            return;
        }
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        toastStateSafetySave('Saga state backup created in this chat.', result.persisted);
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Export State', 'Download the current Saga chat state as restoreable JSON.', () => {
        downloadSagaStateExport();
    }));
    actions.appendChild(createButton('Restore From File', 'Restore Saga chat state from an exported Saga state JSON file.', () => {
        restoreSagaStateFromFile();
    }));
    actions.appendChild(createButton('Verify Storage', 'Verify Saga-owned /user/files records listed in the storage index.', button => {
        verifyStorageFromButton(button);
    }));
    const settleWrites = createButton('Settle Storage Writes', 'Wait for queued Saga storage writes or runtime storage errors to settle, then verify the storage index.', button => {
        settleStorageWritesFromButton(button);
    });
    settleWrites.disabled = !(storageDiagnostics.pendingWrites || getStorageRuntimeErrorCount(storageDiagnostics));
    actions.appendChild(settleWrites);
    actions.appendChild(createButton('Clean Missing Records', 'Verify the storage index and remove missing non-index file records. This does not scan for unknown orphan files.', button => {
        cleanMissingStorageRecordsFromButton(button);
    }));
    const latest = safety.backups[0] || null;
    const restoreLatest = createButton('Restore Latest Backup', 'Restore the newest in-chat Saga state backup. A new backup is created before restoring.', () => {
        if (!latest) return;
        const operation = captureChatOperation({ lane: 'state-safety-restore', requireEnabled: false });
        void restoreSagaState({ backup: latest }, operation);
    }, 'saga-danger-button');
    restoreLatest.disabled = !latest;
    actions.appendChild(restoreLatest);
    card.appendChild(actions);

    const latestRows = document.createElement('div');
    latestRows.className = 'saga-runtime-kv-list';
    latestRows.appendChild(createKeyValue('Latest backup', latest ? `${latest.reason} | ${formatStateSafetyTimestamp(latest.createdAt)}` : 'none', 'Most recent automatic or manual backup.'));
    latestRows.appendChild(createKeyValue('Latest migration log', safety.migrationLog[0]?.message || 'none', 'Most recent schema migration or restore event.'));
    latestRows.appendChild(createKeyValue('Storage integrity', formatStorageDiagnosticsSummary(storageDiagnostics), 'Latest Saga storage verification summary from the master index.'));
    card.appendChild(latestRows);

    return card;
}

function createDangerZoneGroup(titleText = '', tooltip = '') {
    const group = document.createElement('section');
    group.className = 'saga-danger-zone-group';
    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title saga-danger-zone-group-title';
    title.textContent = titleText;
    addTooltip(title, tooltip || titleText);
    group.appendChild(title);
    return group;
}

export function createActiveChatDangerZoneGroup(state = getState()) {
    const group = createDangerZoneGroup(
        'Active Chat',
        'Destructive cleanup actions for the current SillyTavern chat only.'
    );

    const rows = document.createElement('div');
    rows.className = 'saga-runtime-kv-list';
    rows.appendChild(createKeyValue('Accepted Lorecards', String(normalizeLoreMatrix(state?.loreMatrix || []).length), 'Accepted Lorecards currently stored in the lore matrix.'));
    rows.appendChild(createKeyValue('Pending Review', String(normalizeLoreMatrix(state?.pendingLoreEntries || []).length), 'Generated Lorecards waiting in the Lorecards tab Pending Review section.'));
    rows.appendChild(createKeyValue('Pending continuity changes', state?.lastDelta ? '1' : '0', 'Legacy extracted continuity delta waiting in the Continuity tab.'));
    group.appendChild(rows);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';

    actions.appendChild(createButton('Delete All Lore', 'Deletes Accepted Lorecards, Pending Review entries, and elevation/mute selections. Lightweight continuity state is left intact.', async button => {
        const proceed = await confirmAction('Are you sure? Delete all Saga lore?', 'You are about to delete every Accepted Lorecard, every Pending Review entry, and all elevation/mute selections for this chat. Lightweight continuity state will remain. Accepted Lorecards can be restored to Pending Review through Lore Timeline when retained. Continue?');
        if (!proceed) return;
        await runBusyAction(button, 'Deleting...', async ({ setText }) => {
            setText('Clearing lore...');
            createStateBackup('before_delete_all_lore');
            const current = getState();
            const beforeTimeline = captureLoreTimelineState(current);
            const deleted = normalizeLoreMatrix(current.loreMatrix || []).length;
            current.loreMatrix = [];
            current.pendingLoreEntries = [];
            current.pendingLoreMeta = null;
            current.loreSelection = { pinnedIds: [], suppressedIds: [], elevated: {} };
            if (current.lorePanel) {
                current.lorePanel.selectedEntryId = '';
                current.lorePanel.reviewSelectedIds = [];
                current.lorePanel.acceptedSelectedIds = [];
            }
            if (deleted > 0) {
                recordLoreTimelineEvent(current, {
                    before: beforeTimeline,
                    after: captureLoreTimelineState(current),
                    type: 'delete_all',
                    source: 'danger_zone',
                    summary: `Deleted all Accepted Lorecards (${deleted} entr${deleted === 1 ? 'y' : 'ies'}).`,
                });
            }
            saveState(current);
            refreshPanelBody({ preserveScroll: false });
            refreshHeader();
            toast('All lore entries deleted.', 'info');
        });
    }, 'saga-danger-button'));

    actions.appendChild(createButton('Reset Generation State', 'Clears detected lore context, Pending Review entries, pending deltas, and generation ledger. Accepted Lorecards remain intact.', async button => {
        const proceed = await confirmAction('Are you sure? Reset generation state?', 'You are about to clear detected context, Pending Review entries, pending continuity changes, and the lore-generation ledger. Accepted Lorecards and Lore Timeline will remain. Continue?');
        if (!proceed) return;
        await runBusyAction(button, 'Resetting...', async ({ setText }) => {
            setText('Clearing generation state...');
            createStateBackup('before_generation_reset');
            const current = getState();
            const defaults = getDefaultState();
            current.loreContext = defaults.loreContext;
            current.pendingLoreEntries = [];
            current.pendingLoreMeta = null;
            current.loreGeneration = defaults.loreGeneration;
            current.loreBulkGeneration = defaults.loreBulkGeneration;
            current.continuityScan = defaults.continuityScan;
            current.lastDelta = null;
            if (current.lorePanel) {
                current.lorePanel.selectedEntryId = '';
                current.lorePanel.reviewSelectedIds = [];
            }
            resetCanonPreviewUiState();
            clearCanonLoreDatabaseCache();
            saveState(current);
            refreshPanelBody({ preserveScroll: false });
            refreshHeader();
            toast('Generation state reset.', 'info');
        });
    }, 'saga-danger-button'));

    actions.appendChild(createButton('Reset Active Chat', 'Resets Saga continuity state for this chat to defaults and clears Lore Timeline. Panel size and position are preserved.', async button => {
        const proceed = await confirmAction('Are you sure? Reset active chat?', 'You are about to reset all Saga runtime data for this chat: lightweight continuity state, Accepted Lorecards, Pending Review entries, generation state, and Lore Timeline. Window position, size, and the State Safety backup list are preserved. Continue?');
        if (!proceed) return;
        await runBusyAction(button, 'Resetting...', async ({ setText }) => {
            setText('Resetting active chat...');
            createStateBackup('before_total_reset');
            const current = getState();
            const defaults = getDefaultState();
            defaults.stateSafety = getStateSafety(current);
            preserveRuntimePanelGeometry(defaults, current?.lorePanel || {}, 'settings');
            resetCanonPreviewUiState({ preserveDetailLevel: false });
            clearCanonLoreDatabaseCache();
            clearContextIndexCache();
            saveState(defaults);
            refreshPanelBody({ preserveScroll: false });
            refreshHeader();
            toast('Active chat Saga state reset. Lore Timeline cleared.', 'info');
        });
    }, 'saga-danger-button'));

    group.appendChild(actions);
    return group;
}

function appendGlobalDangerZoneRows(rows, cleanupSnapshot = getSagaGlobalCleanupSnapshot(), storageDiagnostics = getSagaStorageDiagnostics()) {
    if (!rows) return;
    rows.textContent = '';
    rows.appendChild(createKeyValue('Custom Loredecks', String(cleanupSnapshot.loredeckCount || 0), 'Custom, imported, or generated Loredecks installed in external Saga Library storage.'));
    rows.appendChild(createKeyValue('Deck Maker Projects', String(cleanupSnapshot.creatorProjectCount || 0), 'Externalized Deck Maker projects that Total Saga Cleanup deletes.'));
    rows.appendChild(createKeyValue('Custom Theme Packs', String(cleanupSnapshot.themePackCount || 0), 'Imported custom Theme Packs stored in Saga-owned files.'));
    rows.appendChild(createKeyValue('Custom Icon Sets', String(cleanupSnapshot.iconSetCount || 0), 'Imported custom Icon Sets and their uploaded raster assets.'));
    rows.appendChild(createKeyValue('Storage integrity', formatStorageDiagnosticsSummary(storageDiagnostics), 'Latest Saga storage verification summary from the master index.'));
    appendGlobalDangerZoneFileScopeRows(rows, cleanupSnapshot, storageDiagnostics);
}

function appendGlobalDangerZonePreviewDiagnostics(rows, diagnostics = []) {
    if (!rows) return;
    const warnings = (diagnostics || []).filter(item => item?.severity === 'warning' || item?.severity === 'error');
    if (!warnings.length) return;
    const first = warnings[0]?.message || warnings[0]?.code || 'Cleanup count refresh needs attention.';
    rows.appendChild(createKeyValue(
        'Cleanup counts',
        `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`,
        truncateCleanText(first, 140),
    ));
}

function hasCleanupPreviewFileScope(cleanupSnapshot = {}) {
    return [
        cleanupSnapshot.totalSagaFileCount,
        cleanupSnapshot.trackedFileCount,
        cleanupSnapshot.knownIndexFileCount,
        cleanupSnapshot.untrackedReferencedFileCount,
        cleanupSnapshot.repairSessionCount,
    ].some(value => Number.isFinite(Number(value)));
}

function appendGlobalDangerZoneFileScopeRows(rows, cleanupSnapshot = {}, storageDiagnostics = {}) {
    if (!rows) return;
    if (!hasCleanupPreviewFileScope(cleanupSnapshot)) {
        rows.appendChild(createKeyValue('Tracked Saga files', String(storageDiagnostics.fileCount || 0), 'Saga-owned files known to the master storage index from the latest verification.'));
        return;
    }
    const total = Number(cleanupSnapshot.totalSagaFileCount) || 0;
    const tracked = Number(cleanupSnapshot.trackedFileCount) || 0;
    const knownIndexes = Number(cleanupSnapshot.knownIndexFileCount) || 0;
    const referenced = Number(cleanupSnapshot.untrackedReferencedFileCount) || 0;
    const repairSessions = Number(cleanupSnapshot.repairSessionCount) || 0;
    rows.appendChild(createKeyValue('Cleanup file scope', String(total), `${tracked} tracked file${tracked === 1 ? '' : 's'}, ${knownIndexes} known index file${knownIndexes === 1 ? '' : 's'}, ${referenced} additional referenced file${referenced === 1 ? '' : 's'}, ${repairSessions} repair session${repairSessions === 1 ? '' : 's'}. Unknown unindexed orphan files may remain.`));
}

async function refreshGlobalDangerZoneRows(rows) {
    try {
        const preview = await buildSagaGlobalCleanupPreview();
        if (!rows?.isConnected) return;
        appendGlobalDangerZoneRows(rows, preview, getSagaStorageDiagnostics());
        appendGlobalDangerZonePreviewDiagnostics(rows, preview.diagnostics || []);
    } catch (error) {
        if (rows?.isConnected) {
            appendGlobalDangerZoneRows(rows);
            rows.appendChild(createKeyValue(
                'Cleanup counts',
                'Refresh failed',
                truncateCleanText(error?.message || error || 'Saga could not refresh cleanup counts.', 140),
            ));
        }
        console.warn('[Saga] Global Danger Zone counts could not be refreshed:', error);
    }
}

export function createGlobalDangerZoneGroup() {
    const group = createDangerZoneGroup(
        'Global',
        'Destructive cleanup actions for Saga settings, installed custom content, and Saga-owned storage.'
    );

    const rows = document.createElement('div');
    rows.className = 'saga-runtime-kv-list';
    appendGlobalDangerZoneRows(rows);
    void refreshGlobalDangerZoneRows(rows);
    group.appendChild(rows);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';

    actions.appendChild(createButton('Reset All Settings', 'Reset Saga preferences and provider settings to bundled defaults, and remove stored Saga API keys. Custom content is not deleted.', button => {
        resetAllSettingsFromButton(button);
    }, 'saga-danger-button'));

    const removeThemes = createButton('Remove Custom Themes + Icon Packs', 'Delete imported custom Theme Packs, Icon Sets, and uploaded icon assets. Bundled appearance packs stay available.', button => {
        removeCustomThemesFromButton(button);
    }, 'saga-danger-button');
    actions.appendChild(removeThemes);

    const removeLoredecks = createButton('Remove Custom Loredecks', 'Delete imported, generated, and custom Loredecks plus owned payload/assets and Health repair sessions. Bundled Loredecks stay available.', button => {
        removeCustomLoredecksFromButton(button);
    }, 'saga-danger-button');
    actions.appendChild(removeLoredecks);

    const totalCleanup = createButton('Total Saga Cleanup', 'Delete tracked Saga-owned custom content, settings, stored Saga API keys, Deck Maker projects, and active chat Saga state. Unknown unindexed orphan files may remain.', button => {
        runTotalSagaCleanupFromButton(button);
    }, 'saga-danger-button');
    actions.appendChild(totalCleanup);

    group.appendChild(actions);
    return group;
}

export function createDangerZoneCard(state = getState()) {
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-danger-zone-card';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title saga-danger-zone-title';
    title.textContent = 'Danger Zone';
    addTooltip(title, 'Destructive Saga cleanup actions separated by Active Chat and Global scope.');
    card.appendChild(title);

    card.appendChild(createActiveChatDangerZoneGroup(state));
    card.appendChild(createGlobalDangerZoneGroup());
    return card;
}
