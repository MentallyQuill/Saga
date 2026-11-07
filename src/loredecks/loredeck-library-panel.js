import { DEFAULT_BUNDLED_LOREDECK_LIBRARY_RECORDS } from './loredeck-defaults.js';
import { fetchJson, LOREDECK_INDEX_URL } from './loredeck-loader.js';
import {
    addTooltip,
    chooseAction,
    confirmAction,
    createButton,
    createEmptyMessage,
    createKeyValue,
    createStatusPill,
    hideFloatingTooltip,
    humanizeScopeKey,
    promptTextAction,
    setChipTone,
    toast,
    wireOverlayBackdropClose,
} from '../ui/runtime-ui-kit.js';
import {
    appendLoredeckStatusPills,
    createLoredeckRenderErrorBody,
} from './loredeck-ui-kit.js';
import {
    createLoredeckSearchInput,
    createLoredeckSelectControl,
} from './loredeck-filter-controls.js';
import {
    createLoredeckSelectionSummary,
} from './loredeck-selection-toolbar.js';
import {
    createLoredeckActionRow,
    setLoredeckActionButtonBusy,
} from './loredeck-action-rows.js';
import { bindLoredeckCoverImage, discardDetachedLoredeckCoverImages, disposeLoredeckCoverImages, getLoredeckAssetRef } from './loredeck-cover-image.js';
export { getLoredeckAssetRef } from './loredeck-cover-image.js';
import {
    buildFolderTree,
    createFolderIdFromPath,
    getFolderPath,
    normalizeLoredeckLibraryIndex,
    normalizePackLibraryMetadata,
    resolveLoredeckStackItems,
} from './loredeck-library-index.js';
import { resolveLoredeckLibraryDragFeedback } from './loredeck-library-drag.js';
import { cancelLoredeckLibraryRowRender, LOREDECK_LIBRARY_ROW_BATCH_SIZE, renderLoredeckLibraryRows, restoreLoredeckLibraryRowScroll } from './loredeck-library-render-scheduler.js';
import { sortLoredeckLibraryFolderPacks, sortLoredeckLibraryFolderTreeByTitle, sortLoredeckLibraryPacks } from './loredeck-library-view.js';
import {
    applyLoredeckLibraryFolderRemovalPlan,
    createLoredeckLibraryFolderRecord,
    getLoredeckLibraryFolderRemovalPlan,
    getLoredeckLibraryFolderDeckIds,
    getLoredeckLibraryFolderSiblingRecords,
    isLoredeckLibraryFolderDescendant,
    moveLoredeckLibraryFolderRecord,
    moveLoredecksToLibraryFolderPlacement,
    renameLoredeckLibraryFolderRecord,
    reorderLoredeckLibraryPlacements,
} from './loredeck-library-service.js';
import {
    countLoredeckManifestFiles,
    formatRelativeHealthTime,
    getCachedLoredeckHealthRecord,
    getLoredeckHealthStatusDescriptor,
    groupLoredeckHealthIssues,
    openLoredeckHealthCenter,
} from './loredeck-health-panel.js';

let libraryPanelDeps = {};
let loredeckLibraryRenderSnapshot = null;
const LOREDECK_LIBRARY_LONG_PRESS_MS = 520;

// Cache only for one synchronous refresh. Edits, scans and storage hydration
// always enter a fresh snapshot; no revision tracking or stale global cache.
function withLoredeckLibraryRenderSnapshot(render) {
    if (loredeckLibraryRenderSnapshot) return render();
    loredeckLibraryRenderSnapshot = {
        state: getState(),
        settings: getSettings(),
        healthByPack: new Map(),
        statsByPack: new Map(),
        coverByPack: new Map(),
    };
    try {
        return render();
    } finally {
        loredeckLibraryRenderSnapshot = null;
    }
}

export function configureLoredeckLibraryPanel(deps = {}) {
    libraryPanelDeps = { ...libraryPanelDeps, ...(deps || {}) };
}

function dep(name, fallback = null) {
    const value = libraryPanelDeps?.[name];
    if (typeof value === 'function') return value;
    if (typeof fallback === 'function') return fallback;
    throw new Error(`Saga Loredeck Library dependency is not configured: ${name}`);
}

function getState() { return loredeckLibraryRenderSnapshot?.state || dep('getState', () => ({}))(); }
function saveState(...args) { return dep('saveState', () => {})(...args); }
function getSettings() { return loredeckLibraryRenderSnapshot?.settings || dep('getSettings', () => ({}))(); }
function isBasicExperienceMode() { return dep('isBasicExperience', settings => String(settings?.experienceMode || '').toLowerCase() === 'basic')(getSettings()) === true; }
function isRuntimeMobileShell() { return dep('isRuntimeMobileShell', () => false)() === true; }
function saveSettings(...args) { return dep('saveSettings', () => {})(...args); }
function getDefaultState() { return dep('getDefaultState', () => ({}))(); }
function getCanonLoreDatabaseSync() { return dep('getCanonLoreDatabaseSync', () => null)(); }
function clearCanonLoreDatabaseCache() { return dep('clearCanonLoreDatabaseCache', () => {})(); }
function clearCanonPreviewUiState() { return dep('clearCanonPreviewUiState', () => {})(); }
function loadCanonLoreDatabase() { return dep('loadCanonLoreDatabase', async () => null)(); }
function clearContextIndexCache() { return dep('clearContextIndexCache', () => {})(); }
function loadContextIndex() { return dep('loadContextIndex', async () => null)(); }
function refreshPanelBody(options) { return dep('refreshPanelBody', () => {})(options); }
function refreshHeader() { return dep('refreshHeader', () => {})(); }
function clampNumber(value, min, max, fallback) { return dep('clampNumber', (_value, _min, _max, _fallback) => { const number = Number(_value); return Number.isFinite(number) ? Math.min(_max, Math.max(_min, number)) : _fallback; })(value, min, max, fallback); }
function formatCategoryCounts(counts) { return dep('formatCategoryCounts', () => '')(counts); }
function readLoredeckLibrarySnapshot(name, state, fallback) {
    const snapshot = loredeckLibraryRenderSnapshot;
    if (!snapshot || state !== snapshot.state) return dep(name, fallback)(state);
    if (!Object.prototype.hasOwnProperty.call(snapshot, name)) snapshot[name] = dep(name, fallback)(state);
    return snapshot[name];
}
function getLoredeckStack(state) { return readLoredeckLibrarySnapshot('getLoredeckStack', state, () => []); }
function getLoredeckLibrary(state) { return readLoredeckLibrarySnapshot('getLoredeckLibrary', state, () => []); }
function getLoredeckLibraryRegistry(state) { return readLoredeckLibrarySnapshot('getLoredeckLibraryRegistry', state, () => ({ packs: {}, folders: [] })); }

function getLoredeckLibraryCover(pack) {
    const cache = loredeckLibraryRenderSnapshot?.coverByPack;
    const cached = cache?.get(pack);
    if (cached !== undefined) return cached;
    const cover = getLoredeckAssetRef(pack, 'cover');
    cache?.set(pack, cover);
    return cover;
}

function persistLoredeckLibraryLayout(registry, options) { return dep('persistLoredeckLibraryLayout', () => ({ ok: false, error: 'Loredeck Library storage is unavailable.' }))(registry, options); }
function normalizeLoredeckLibraryPack(raw) { return dep('normalizeLoredeckLibraryPack', raw => raw || {})(raw); }
function getLoredeckDefinition(packId) { return dep('getLoredeckDefinition', () => null)(packId); }
function getLoredeckTypeLabel(packId) { return dep('getLoredeckTypeLabel', () => 'Custom')(packId); }
function getLoredeckLibraryPackTypeLabel(pack = {}) {
    const type = String(pack?.type || pack?.manifestData?.type || '').trim();
    if (type === 'bundled') return 'Bundled';
    if (type === 'generated') return 'Generated';
    if (type === 'custom') return 'Custom';
    return pack?.packId ? getLoredeckTypeLabel(pack.packId) : 'Custom';
}
function getLoredeckSourceSummary(pack) { return dep('getLoredeckSourceSummary', () => '')(pack); }
function getLoredeckTagRegistryCount(pack) { return dep('getLoredeckTagRegistryCount', () => 0)(pack); }
function getLoredeckTimelineRegistryCount(pack) { return dep('getLoredeckTimelineRegistryCount', () => 0)(pack); }
function isVirtualLoredeckPack(pack) { return dep('isVirtualLoredeckPack', () => false)(pack); }
function isGeneratedLoredeckPack(pack) { return dep('isGeneratedLoredeckPack', () => false)(pack); }
function isBundledLoredeckLibraryPack(pack) { return dep('isBundledLoredeckLibraryPack', () => false)(pack); }
function isVisibleLoredeckLibraryPack(pack = {}) { return !!pack?.packId && !isGeneratedLoredeckPack(pack); }
function getVisibleLoredeckLibrary(state = getState()) { return getLoredeckLibrary(state).filter(isVisibleLoredeckLibraryPack); }
function getFreshLoredeckLibraryPack(packId, fallback) { return dep('getFreshLoredeckLibraryPack', (_packId, _fallback) => _fallback || null)(packId, fallback); }
function persistLoredeckLibraryRecordMutation(pack, mutator, message, options) { return dep('persistLoredeckLibraryRecordMutation', () => false)(pack, mutator, message, options); }

function switchLoredeckLibraryToAdvanced(message = 'Advanced Experience enabled for deck repair and editing tools.') {
    const settings = getSettings();
    saveSettings({ ...(settings || {}), experienceMode: 'advanced' });
    refreshHeader();
    refreshPanelBody({ preserveScroll: true });
    toast(message, 'info');
    if (loredeckLibraryOpen) renderLoredeckLibraryOverlay({ preserveScroll: true });
}

function createLibraryAdvancedHandoffButton(label = 'Switch to Advanced', tooltip = 'Switch to Advanced Experience for Pack Health Center, repair, metadata, and package editing tools.') {
    return createButton(label, tooltip, () => switchLoredeckLibraryToAdvanced());
}
function hydrateLoredeckPayloadRecord(pack) { return dep('hydrateLoredeckPayloadRecord', async value => value)(pack); }
function flushLoredeckPayloadWrites() { return dep('flushLoredeckPayloadWrites', async () => ({ ok: true, error: '', pendingWrites: 0 }))(); }
function validateLoredeckForEditor(pack, button, options) { return dep('validateLoredeckForEditor', async () => ({ health: null, error: 'Validation is unavailable.' }))(pack, button, options); }
function canValidateLoredeckInEditor(pack) { return dep('canValidateLoredeckInEditor', () => false)(pack); }
function attemptLoredeckHealthFixes(pack, button) {
    return dep('attemptLoredeckHealthFixes', async () => {})(pack, button);
}
function loadLoredeckManifestPreview(pack, button) { return dep('loadLoredeckManifestPreview', async () => {})(pack, button); }
function createLoredeckManifestPreview(pack) { return dep('createLoredeckManifestPreview', () => document.createDocumentFragment())(pack); }
function createLoredeckEntryOverrideCard(pack) { return dep('createLoredeckEntryOverrideCard', () => document.createDocumentFragment())(pack); }
function getGeneratedLoredeckExportReadiness(pack) { return dep('getGeneratedLoredeckExportReadiness', () => ({ ready: true, blockers: [], warnings: [] }))(pack); }
function createGeneratedLoredeckExportReadinessCard(pack) { return dep('createGeneratedLoredeckExportReadinessCard', () => document.createDocumentFragment())(pack); }
function createLoredeckEditorField(...args) { return dep('createLoredeckEditorField', () => document.createDocumentFragment())(...args); }
function saveLoredeckMetadataFromInputs(...args) { return dep('saveLoredeckMetadataFromInputs', () => false)(...args); }
function syncLoredeckMetadataFromManifest(pack, button) { return dep('syncLoredeckMetadataFromManifest', async () => {})(pack, button); }
function exportValidatedLoredeckDraft(pack, button) { return dep('exportValidatedLoredeckDraft', async () => {})(pack, button); }
function refreshGeneratedLoredeckDerivedMetadata(pack, button) { return dep('refreshGeneratedLoredeckDerivedMetadata', async () => {})(pack, button); }
function finalizeGeneratedLoredeckAsCustom(pack, button) { return dep('finalizeGeneratedLoredeckAsCustom', async () => {})(pack, button); }
function installLoredeckBundleFromFile() { return dep('installLoredeckBundleFromFile', () => {})(); }
function exportSelectedLoredeckBundles(packs, button) { return dep('exportSelectedLoredeckBundles', async () => {})(packs, button); }
function duplicateLoredeckLibraryPacksWithConfirm(packsOrIds) { return dep('duplicateLoredeckLibraryPacksWithConfirm', async () => {})(packsOrIds); }
function duplicateLoredeckLibraryFolderWithContents(folderId) { return dep('duplicateLoredeckLibraryFolderWithContents', async () => {})(folderId); }
function deleteLoredeckLibraryPacksWithConfirm(packsOrIds) { return dep('deleteLoredeckLibraryPacksWithConfirm', async () => {})(packsOrIds); }
function openDuplicateLoredeckDialog(pack) { return dep('openDuplicateLoredeckDialog', () => {})(pack); }
function openLoredeckWorkbench(packId) { return dep('openLoredeckWorkbench', () => {})(packId); }
function openLoredeckCreatorWorkbench(options) { return dep('openLoredeckCreatorWorkbench', () => {})(options); }
function selectLoredeckForDetails(packId, options) { return dep('selectLoredeckForDetails', () => {})(packId, options); }
function commitLoredeckStackMutation(mutator) { return dep('commitLoredeckStackMutation', () => false)(mutator); }
function addLoredeckToStack(packId) { return dep('addLoredeckToStack', () => false)(packId); }
function addLoredeckFolderToStack(folderId, libraryIndex) { return dep('addLoredeckFolderToStack', () => false)(folderId, libraryIndex); }
function removeLoredecksFromStack(packIds) { return dep('removeLoredecksFromStack', () => false)(packIds); }
function removeLoredeckStackItem(stackKey) { return dep('removeLoredeckStackItem', () => false)(stackKey); }
function moveLoredeckStackItem(stackKey, direction) { return dep('moveLoredeckStackItem', () => false)(stackKey, direction); }
function reorderLoredeckStackItem(stackKey, targetIndex) { return dep('reorderLoredeckStackItem', () => false)(stackKey, targetIndex); }
function setLoredeckEnabled(packId, enabled) { return dep('setLoredeckEnabled', () => false)(packId, enabled); }
function setLoredeckStackItemEnabled(stackKey, enabled) { return dep('setLoredeckStackItemEnabled', () => false)(stackKey, enabled); }
function setLoredeckStackItemCollapsed(stackKey, collapsed) { return dep('setLoredeckStackItemCollapsed', () => false)(stackKey, collapsed); }
function getLoredeckStackItemType(item) { return dep('getLoredeckStackItemType', () => 'deck')(item); }
function getLoredeckStackItemKey(item) { return dep('getLoredeckStackItemKey', () => '')(item); }
function createLoredeckStackDeckKey(packId) { return dep('createLoredeckStackDeckKey', id => String(id || ''))(packId); }
function createLoredeckStackFolderKey(folderId) { return dep('createLoredeckStackFolderKey', id => String(id || ''))(folderId); }
function renderContextWorkbench(options) { return dep('renderContextWorkbench', () => {})(options); }
function buildLoredeckHealthPackSummary(pack, cached, health) { return dep('buildLoredeckHealthPackSummary', () => ({ packId: pack?.packId || '', title: pack?.title || '' }))(pack, cached, health); }
function markTourTarget(element, target) { return dep('markTourTarget', value => value)(element, target); }


const LOREDECK_LIBRARY_DETAILS_MIN_HEIGHT = 190;
const LOREDECK_LIBRARY_DETAILS_DEFAULT_HEIGHT = LOREDECK_LIBRARY_DETAILS_MIN_HEIGHT;
const LOREDECK_LIBRARY_DETAILS_MAX_HEIGHT = 560;
const LOREDECK_LIBRARY_COLUMNS_MIN_HEIGHT = 250;
const LOREDECK_COVER_MAX_DIMENSION = 768;
const LOREDECK_COVER_OUTPUT_QUALITY = 0.86;
const LOREDECK_COVER_INPUT_MAX_BYTES = 12 * 1024 * 1024;
const LOREDECK_COVER_OUTPUT_MAX_CHARS = 1200000;
const LOREDECK_LIBRARY_FOLDER_COVER_MAX_VISIBLE = 15;
const BUNDLED_LOREDECK_LIBRARY = DEFAULT_BUNDLED_LOREDECK_LIBRARY_RECORDS;

const LOREDECK_LIBRARY_SPECIAL_VIEWS = Object.freeze([
    { id: 'all', title: 'All Loredecks', tooltip: 'Show every Loredeck in the Library.' },
    { id: 'bundled', title: 'Bundled', tooltip: 'Human-vetted Loredecks shipped with Saga.' },
    { id: 'custom', title: 'Custom', tooltip: 'User-created, duplicated, imported, AU, crossover, or original Loredecks.' },
    { id: 'unfiled', title: 'Unfiled', tooltip: 'Loredecks without a folder placement.' },
]);
let loredeckLibraryOpen = false;
let loredeckLibraryQuery = '';
let loredeckLibrarySort = 'name';
let loredeckLibraryDetailsTab = 'overview';
let loredeckLibraryBulkSelectedIds = new Set();
let loredeckLibraryLastSelectionAnchorId = '';
let loredeckLibraryDetailsHeight = LOREDECK_LIBRARY_DETAILS_DEFAULT_HEIGHT;
let loredeckLibraryCollapsedFolderIds = new Set();
let loredeckLibraryExpandedFolderIds = new Set();
let loredeckStackDragState = null;
let loredeckLibraryDeckDragState = null;
let loredeckLibraryFolderDragState = null;
let loredeckLibrarySelectedFolderId = 'all';
let loredeckLibrarySelectedFolderDetailsId = '';
let loredeckLibraryMobileDetailPackId = '';
let loredeckLibraryMobileDetailFolderId = '';
let loredeckLibraryMobileReorderOpen = false;
let loredeckLibrarySelectionRefreshFrame = 0;
let loredeckLibraryHierarchyRefreshFrame = 0;
let loredeckLibraryOverlayRefreshFrame = 0;
let loredeckLibraryHierarchyRenderCache = null;
let bundledLoredeckIndexCache = null;
let bundledLoredeckIndexLoading = false;
let bundledLoredeckIndexLoadAttempted = false;

function isLoredeckLibraryOverlayMounted() {
    return typeof document !== 'undefined' && !!document.querySelector('.saga-loredeck-library-overlay');
}

export function openLoredeckLibraryWindow() {
    loredeckLibraryOpen = true;
    const hasOverlay = isLoredeckLibraryOverlayMounted();
    renderLoredeckLibraryOverlay({ preserveScroll: hasOverlay, progressiveOpen: !hasOverlay });
}

export function openLoredeckLibraryDetails(packId = '') {
    const id = String(packId || '').trim();
    if (!id) return false;
    selectLoredeckForDetails(id, { refresh: false });
    if (isRuntimeMobileShell()) {
        loredeckLibraryMobileDetailPackId = id;
        loredeckLibraryMobileDetailFolderId = '';
    }
    loredeckLibraryOpen = true;
    const hasOverlay = isLoredeckLibraryOverlayMounted();
    renderLoredeckLibraryOverlay({ preserveScroll: hasOverlay, progressiveOpen: !hasOverlay });
    return true;
}

export function closeLoredeckLibraryWindow() {
    loredeckLibraryOpen = false;
    if (loredeckLibrarySelectionRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibrarySelectionRefreshFrame);
    }
    loredeckLibrarySelectionRefreshFrame = 0;
    if (loredeckLibraryHierarchyRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibraryHierarchyRefreshFrame);
    }
    loredeckLibraryHierarchyRefreshFrame = 0;
    if (loredeckLibraryOverlayRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibraryOverlayRefreshFrame);
    }
    loredeckLibraryOverlayRefreshFrame = 0;
    loredeckLibraryHierarchyRenderCache = null;
    loredeckLibraryMobileDetailPackId = '';
    loredeckLibraryMobileDetailFolderId = '';
    loredeckLibraryMobileReorderOpen = false;
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    cancelLoredeckLibraryRowRender(overlay?.querySelector('.saga-loredeck-library-hierarchy-list'));
    disposeLoredeckCoverImages(overlay);
    overlay?.remove();
}

function createLoredeckLibraryRenderErrorCard(error) {
    return createLoredeckRenderErrorBody({
        bodyClassName: 'saga-loredeck-library-body',
        title: 'Loredeck Library could not render.',
        error,
    });
}

function normalizeBundledLoredeckIndexRecord(record = {}) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
    const packId = String(record.packId || record.id || '').trim();
    if (!packId) return null;
    const manifest = String(record.manifest || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.?\//, '')
        .replace(/^content\/loredecks\//i, '');
    return normalizeLoredeckLibraryPack({
        ...record,
        packId,
        type: 'bundled',
        manifest: manifest ? `content/loredecks/${manifest}` : `content/loredecks/${packId}/loredeck.json`,
        source: {
            kind: 'bundled',
            ...(record.source && typeof record.source === 'object' && !Array.isArray(record.source) ? record.source : {}),
        },
        library: normalizePackLibraryMetadata(record.library || {}),
    });
}

export function getBundledLoredeckLibraryRecords() {
    return Array.isArray(bundledLoredeckIndexCache) && bundledLoredeckIndexCache.length
        ? bundledLoredeckIndexCache
        : BUNDLED_LOREDECK_LIBRARY;
}

function ensureBundledLoredeckIndexLoaded() {
    if (bundledLoredeckIndexCache || bundledLoredeckIndexLoading || bundledLoredeckIndexLoadAttempted) return;
    bundledLoredeckIndexLoading = true;
    bundledLoredeckIndexLoadAttempted = true;
    fetchJson(LOREDECK_INDEX_URL, null)
        .then(index => {
            const records = Array.isArray(index?.bundled)
                ? index.bundled.map(normalizeBundledLoredeckIndexRecord).filter(Boolean)
                : [];
            if (records.length) bundledLoredeckIndexCache = records;
        })
        .catch(e => console.warn('[Saga] Loredeck Library bundled index load failed:', e))
        .finally(() => {
            bundledLoredeckIndexLoading = false;
            if (loredeckLibraryOpen) renderLoredeckLibraryOverlay();
        });
}

const LOREDECK_LIBRARY_SCROLL_SELECTORS = Object.freeze({
    mobileBody: '.saga-loredeck-library-mobile-body',
    libraryList: '.saga-loredeck-library-deck-list',
    stackList: '.saga-loredeck-library-stack-list',
    details: '.saga-loredeck-library-details',
});

function captureLoredeckLibraryScrollState() {
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    if (!overlay) return null;
    const snapshot = {};
    for (const [key, selector] of Object.entries(LOREDECK_LIBRARY_SCROLL_SELECTORS)) {
        const element = overlay.querySelector(selector);
        if (!element) continue;
        snapshot[key] = {
            top: element.scrollTop || 0,
            left: element.scrollLeft || 0,
        };
    }
    return snapshot;
}

function restoreLoredeckLibraryScrollState(snapshot = null) {
    if (!snapshot || typeof snapshot !== 'object') return;
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    if (!overlay) return;
    for (const [key, value] of Object.entries(snapshot)) {
        const selector = LOREDECK_LIBRARY_SCROLL_SELECTORS[key];
        const element = selector ? overlay.querySelector(selector) : null;
        if (!element || !value) continue;
        restoreLoredeckLibraryRowScroll(element, Number(value.top) || 0, Number(value.left) || 0);
    }
}

function renderLoredeckLibraryOpeningShell() {
    const mobile = isRuntimeMobileShell();
    const overlay = document.createElement('div');
    overlay.className = 'saga-lore-workbench-overlay saga-loredeck-library-overlay saga-loredeck-library-overlay-opening';
    wireOverlayBackdropClose(overlay, closeLoredeckLibraryWindow);
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-lore-workbench-shell saga-loredeck-library-shell';
    if (mobile) shell.classList.add('saga-loredeck-library-shell-mobile');
    overlay.appendChild(shell);

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header saga-loredeck-library-header';
    markTourTarget(header, 'loredecks.library.header');
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const titleText = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = mobile ? 'Library' : 'Loredeck Library';
    titleText.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = 'Opening Library...';
    titleText.appendChild(subtitle);
    titleWrap.appendChild(titleText);
    header.appendChild(titleWrap);

    if (!mobile) {
        const actions = createLoredeckActionRow({ className: 'saga-primary-actions saga-loredeck-library-header-actions' });
        const doneButton = createButton('Done', 'Close the Loredeck Library.', closeLoredeckLibraryWindow, 'saga-primary-button');
        markTourTarget(doneButton, 'loredecks.library.done');
        actions.appendChild(doneButton);
        header.appendChild(actions);
    }
    shell.appendChild(header);

    const body = document.createElement('div');
    body.className = 'saga-loredeck-library-body saga-loredeck-library-body-opening';
    const openingStatus = document.createElement('div');
    openingStatus.className = 'saga-loredeck-library-opening-status';
    openingStatus.setAttribute('role', 'status');
    openingStatus.setAttribute('aria-live', 'polite');
    const spinner = document.createElement('span');
    spinner.className = 'saga-runtime-button-spinner saga-loredeck-library-opening-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    openingStatus.appendChild(spinner);
    const openingText = document.createElement('span');
    openingText.className = 'saga-loredeck-library-opening-text';
    openingText.textContent = 'Opening Library...';
    openingStatus.appendChild(openingText);
    body.appendChild(openingStatus);
    shell.appendChild(body);
    if (mobile) shell.appendChild(createLoredeckLibraryMobileBottomActions({ opening: true }));
}

function scheduleLoredeckLibraryProgressiveHydration(options = {}) {
    const render = () => {
        loredeckLibraryOverlayRefreshFrame = 0;
        if (loredeckLibraryOpen) {
            renderLoredeckLibraryOverlay({
                ...options,
                progressiveOpen: false,
                preserveScroll: false,
            });
        }
    };
    if (typeof requestAnimationFrame !== 'function') {
        render();
        return;
    }
    loredeckLibraryOverlayRefreshFrame = requestAnimationFrame(() => {
        loredeckLibraryOverlayRefreshFrame = requestAnimationFrame(render);
    });
}

export function renderLoredeckLibraryOverlay(options = {}) {
    return withLoredeckLibraryRenderSnapshot(() => renderLoredeckLibraryOverlayBody(options));
}

function renderLoredeckLibraryOverlayBody(options = {}) {
    if (loredeckLibraryOverlayRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibraryOverlayRefreshFrame);
    }
    loredeckLibraryOverlayRefreshFrame = 0;
    const scrollState = options.preserveScroll === false ? null : captureLoredeckLibraryScrollState();
    if (loredeckLibraryHierarchyRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibraryHierarchyRefreshFrame);
    }
    loredeckLibraryHierarchyRefreshFrame = 0;
    const previousOverlay = document.querySelector('.saga-loredeck-library-overlay');
    cancelLoredeckLibraryRowRender(previousOverlay?.querySelector('.saga-loredeck-library-hierarchy-list'));
    if (previousOverlay?.firstElementChild?.classList.contains('saga-loredeck-library-shell-mobile')) {
        previousOverlay.remove();
        discardDetachedLoredeckCoverImages(previousOverlay);
    } else {
        disposeLoredeckCoverImages(previousOverlay);
        previousOverlay?.remove();
    }
    if (!loredeckLibraryOpen) return;

    if (options.progressiveOpen === true) {
        renderLoredeckLibraryOpeningShell();
        scheduleLoredeckLibraryProgressiveHydration(options);
        return;
    }

    ensureBundledLoredeckIndexLoaded();
    const state = getState();
    const stack = getLoredeckStack(state);
    const library = getLoredeckLibrary(state);
    const registry = getLoredeckLibraryRegistry(state);
    const libraryIndex = getLoredeckLibraryIndexForPacks(state, library, registry);
    normalizeLoredeckLibrarySelectedFolder(libraryIndex);
    const canonDb = getCanonLoreDatabaseSync();
    const health = canonDb?.health || null;
    const basic = isBasicExperienceMode();
    const mobile = isRuntimeMobileShell();
    const selectedPack = getLoredeckLibrarySelectedPack(state, library);
    const activeViewId = getLoredeckLibraryActiveViewId();
    const scopedLibrary = getLoredeckLibraryFolderScopedPacks(library, libraryIndex, activeViewId, stack);
    const filteredPacks = getFilteredLoredeckLibraryPacks(scopedLibrary, stack, canonDb, health, libraryIndex, registry);
    const selectedFolderDetails = getLoredeckLibrarySelectedFolderDetails(libraryIndex);
    normalizeLoredeckLibraryBulkSelection(library, selectedFolderDetails ? '' : (selectedPack?.packId || ''));
    const selectedPackIds = getLoredeckLibraryBulkSelectedIds(library);
    const selectedPacks = selectedPackIds.map(id => library.find(pack => pack.packId === id)).filter(Boolean);
    const mobileActiveDeckItems = mobile ? getLoredeckLibraryMobileActiveDeckItems(stack) : [];
    if (mobile && loredeckLibraryMobileReorderOpen && mobileActiveDeckItems.length < 2) loredeckLibraryMobileReorderOpen = false;
    const mobileReorderOpen = mobile && loredeckLibraryMobileReorderOpen && mobileActiveDeckItems.length > 1;
    const mobileDetailPack = mobile && loredeckLibraryMobileDetailPackId
        ? library.find(pack => pack.packId === loredeckLibraryMobileDetailPackId) || null
        : null;
    if (mobile && loredeckLibraryMobileDetailPackId && !mobileDetailPack) loredeckLibraryMobileDetailPackId = '';
    const mobileDetailFolder = mobile && loredeckLibraryMobileDetailFolderId
        ? getLoredeckLibraryFolderDetailsById(loredeckLibraryMobileDetailFolderId, libraryIndex)
        : null;
    if (mobile && loredeckLibraryMobileDetailFolderId && !mobileDetailFolder) loredeckLibraryMobileDetailFolderId = '';

    if (!canonDb) {
        loadCanonLoreDatabase()
            .then(() => { if (loredeckLibraryOpen) renderLoredeckLibraryOverlay(); })
            .catch(e => console.warn('[Saga] Loredeck Library health load failed:', e));
    }

    const overlay = document.createElement('div');
    overlay.className = 'saga-lore-workbench-overlay saga-loredeck-library-overlay';
    wireOverlayBackdropClose(overlay, closeLoredeckLibraryWindow);
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-lore-workbench-shell saga-loredeck-library-shell';
    if (mobile) shell.classList.add('saga-loredeck-library-shell-mobile');
    overlay.appendChild(shell);

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header saga-loredeck-library-header';
    markTourTarget(header, 'loredecks.library.header');
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const titleText = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = mobile ? 'Library' : 'Loredeck Library';
    const titleLine = document.createElement('div');
    titleLine.className = 'saga-loredeck-library-title-line';
    titleLine.appendChild(title);
    if (!mobile) titleLine.appendChild(createLoredeckLibraryHeaderMeta(stack, library, canonDb, health));
    titleText.appendChild(titleLine);
    if (!mobile) {
        const subtitle = document.createElement('div');
        subtitle.className = 'saga-lore-workbench-subtitle';
        subtitle.textContent = 'Build the active lore stack for this session.';
        titleText.appendChild(subtitle);
    }
    titleWrap.appendChild(titleText);
    header.appendChild(titleWrap);

    if (!mobile) {
        const actions = createLoredeckActionRow({ className: 'saga-primary-actions saga-loredeck-library-header-actions' });
        const importButton = createButton('Import Deck', 'Import a Saga Loredeck zip package into the Library.', () => {
            installLoredeckBundleFromFile();
        });
        markTourTarget(importButton, 'loredecks.library.import');
        actions.appendChild(importButton);
        if (!basic) {
            const exportSelected = createButton(
                selectedPacks.length > 1 ? `Export Selected (${selectedPacks.length})` : 'Export Selected',
                selectedPacks.length
                    ? 'Export selected Loredecks as one .saga-loredeck.zip package.'
                    : 'Select one or more Loredecks before exporting.',
                async (btn) => {
                    const current = withLoredeckLibraryRenderSnapshot(() => getLoredeckLibraryOverlayContext().selectedPacks);
                    await exportSelectedLoredeckBundles(current, btn);
                }
            );
            exportSelected.disabled = !selectedPacks.length;
            exportSelected.classList.add('saga-loredeck-library-export-selected');
            markTourTarget(exportSelected, 'loredecks.library.export');
            actions.appendChild(exportSelected);
            actions.appendChild(createButton('Create Deck', 'Open the staged Deck Maker wizard.', () => {
                openLoredeckCreatorWorkbench();
            }));
        }
        actions.appendChild(createButton('Refresh Library', 'Reload active Loredecks and recompute Pack Health.', async (btn) => {
            await refreshLoredeckLibraryWindowData(btn);
        }));
        const doneButton = createButton('Done', 'Close the Loredeck Library.', closeLoredeckLibraryWindow, 'saga-primary-button');
        markTourTarget(doneButton, 'loredecks.library.done');
        actions.appendChild(doneButton);
        header.appendChild(actions);
    }
    shell.appendChild(header);

    try {
        const body = document.createElement('div');
        body.className = mobile
            ? 'saga-loredeck-library-body saga-loredeck-library-mobile-body'
            : 'saga-loredeck-library-body';
        loredeckLibraryDetailsHeight = getLoredeckLibraryDetailsHeight(state);
        const detailsCollapsed = getLoredeckLibraryDetailsCollapsed(state);
        body.classList.toggle('saga-loredeck-library-details-collapsed', detailsCollapsed);
        body.style.setProperty('--saga-loredeck-library-details-height', `${loredeckLibraryDetailsHeight}px`);

        if (mobile) {
            body.appendChild(createLoredeckLibraryMobileBrowsePane(filteredPacks, stack, canonDb, health, libraryIndex, library, scopedLibrary, activeViewId, registry));
        } else {
            const columns = document.createElement('div');
            columns.className = 'saga-loredeck-library-columns';
            columns.appendChild(createLoredeckLibraryPane(filteredPacks, stack, canonDb, health, libraryIndex, library, scopedLibrary, activeViewId, registry));
            columns.appendChild(createLoredeckLibraryTransferPane(selectedPack, filteredPacks, stack, selectedPacks, selectedFolderDetails, libraryIndex, library));
            columns.appendChild(createLoredeckActiveStackPane(stack, library, canonDb, health, libraryIndex));
            body.appendChild(columns);
            body.appendChild(createLoredeckLibraryResizeHandle(detailsCollapsed));
            body.appendChild(createLoredeckLibraryDetailsPanel(selectedPack, stack, canonDb, health, selectedFolderDetails, libraryIndex, library));
        }
        shell.appendChild(body);
        if (mobile) shell.appendChild(createLoredeckLibraryMobileBottomActions());
        if (mobileReorderOpen) {
            shell.appendChild(createLoredeckLibraryMobileReorderSheet(stack, library));
        } else if (mobileDetailPack) {
            shell.appendChild(createLoredeckLibraryMobileDetailSheet(mobileDetailPack, stack, canonDb, health, libraryIndex, library));
        } else if (mobileDetailFolder) {
            shell.appendChild(createLoredeckLibraryMobileFolderDetailSheet(mobileDetailFolder, stack, canonDb, health, libraryIndex, library));
        }
        restoreLoredeckLibraryScrollState(scrollState);
    } catch (error) {
        console.error('[Saga] Loredeck Library body render failed:', error);
        shell.appendChild(createLoredeckLibraryRenderErrorCard(error));
    }
}

export function scheduleLoredeckLibraryOverlayRefresh(options = {}) {
    if (!loredeckLibraryOpen) return;
    if (loredeckLibraryOverlayRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibraryOverlayRefreshFrame);
    }
    const render = () => {
        loredeckLibraryOverlayRefreshFrame = 0;
        renderLoredeckLibraryOverlay(options);
    };
    if (typeof requestAnimationFrame !== 'function') {
        render();
        return;
    }
    loredeckLibraryOverlayRefreshFrame = requestAnimationFrame(() => {
        loredeckLibraryOverlayRefreshFrame = requestAnimationFrame(render);
    });
}

export function refreshLoredeckLibraryAfterStackMutation() {
    if (!loredeckLibraryOpen) return;
    refreshLoredeckLibrarySelectionSurfaces({ stackChanged: true });
    if (!isRuntimeMobileShell()) scheduleLoredeckLibraryHierarchyRefresh();
}

function getLoredeckLibraryOverlayContext() {
    const state = getState();
    const stack = getLoredeckStack(state);
    const library = getVisibleLoredeckLibrary(state);
    const registry = getLoredeckLibraryRegistry(state);
    const libraryIndex = getLoredeckLibraryIndexForPacks(state, library, registry);
    const canonDb = getCanonLoreDatabaseSync();
    const health = canonDb?.health || null;
    const selectedPack = getLoredeckLibrarySelectedPack(state, library);
    const activeViewId = getLoredeckLibraryActiveViewId();
    const scopedLibrary = getLoredeckLibraryFolderScopedPacks(library, libraryIndex, activeViewId, stack);
    const filteredPacks = getFilteredLoredeckLibraryPacks(scopedLibrary, stack, canonDb, health, libraryIndex, registry);
    const selectedFolderDetails = getLoredeckLibrarySelectedFolderDetails(libraryIndex);
    const selectedPackIds = getLoredeckLibraryBulkSelectedIds(library);
    const selectedPacks = selectedPackIds.map(id => library.find(pack => pack.packId === id)).filter(Boolean);
    return {
        state,
        stack,
        library,
        registry,
        libraryIndex,
        canonDb,
        health,
        selectedPack,
        activeViewId,
        scopedLibrary,
        filteredPacks,
        selectedFolderDetails,
        selectedPackIds,
        selectedPacks,
    };
}

export function refreshLoredeckLibrarySelectionSurfaces(options = {}) {
    return withLoredeckLibraryRenderSnapshot(() => refreshLoredeckLibrarySelectionSurfacesBody(options));
}

function refreshLoredeckLibrarySelectionSurfacesBody(options = {}) {
    if (!loredeckLibraryOpen) return;
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    if (!overlay) return;
    loredeckLibrarySelectionRefreshFrame = 0;
    const context = getLoredeckLibraryOverlayContext();
    const selectedId = String(context.state?.lorePanel?.selectedLoredeckId || '').trim();
    const selectedIds = new Set(context.selectedPackIds || []);
    const stackByPack = new Map((context.stack || []).map(item => [String(item.packId || '').trim(), item]));
    const mobileOrderMap = getLoredeckLibraryMobileOrderMap(context.stack);

    for (const card of overlay.querySelectorAll('.saga-loredeck-library-deck-card[data-pack-id]')) {
        const packId = String(card.dataset.packId || '').trim();
        const mobileTouch = card.classList.contains('saga-loredeck-library-deck-mobile-touch');
        const bulkSelected = selectedIds.has(packId);
        const activeItem = stackByPack.get(packId);
        const order = mobileOrderMap.get(packId) || 0;
        card.classList.toggle('saga-loredeck-library-deck-selected', !mobileTouch && selectedId === packId);
        card.classList.toggle('saga-loredeck-library-deck-bulk-selected', !mobileTouch && bulkSelected);
        card.classList.toggle('saga-loredeck-library-deck-active', mobileTouch ? order > 0 : activeItem?.enabled === true);
        card.setAttribute('aria-pressed', mobileTouch ? (order > 0 ? 'true' : 'false') : (bulkSelected ? 'true' : 'false'));
        card.toggleAttribute('aria-current', !mobileTouch && selectedId === packId);
        card.dataset.mobileOrder = order ? String(order) : '';
        const badge = card.querySelector('.saga-loredeck-library-mobile-order-badge');
        if (badge) {
            badge.hidden = order <= 0;
            badge.textContent = order ? String(order) : '';
            badge.setAttribute('aria-label', order ? `Selected order ${order}` : 'Not selected');
        }
    }

    const mobileStrip = overlay.querySelector('.saga-loredeck-library-mobile-selected-strip');
    if (options.stackChanged) mobileStrip?.replaceWith(createLoredeckLibraryMobileSelectedStrip(context.stack, context.library));

    for (const card of overlay.querySelectorAll('.saga-loredeck-library-stack-card[data-pack-id]')) {
        const packId = String(card.dataset.packId || '').trim();
        card.classList.toggle('saga-loredeck-library-stack-card-selected', selectedId === packId);
        card.classList.toggle('saga-loredeck-library-stack-card-bulk-selected', selectedIds.has(packId));
        card.toggleAttribute('aria-current', selectedId === packId);
    }

    for (const folderCard of overlay.querySelectorAll('.saga-loredeck-library-stack-folder-card[data-folder-id]')) {
        const folderId = String(folderCard.dataset.folderId || '').trim();
        folderCard.classList.toggle('saga-loredeck-library-stack-card-selected', !!folderId && loredeckLibrarySelectedFolderDetailsId === folderId);
        folderCard.toggleAttribute('aria-current', !!folderId && loredeckLibrarySelectedFolderDetailsId === folderId);
    }

    for (const folderRow of overlay.querySelectorAll('.saga-loredeck-library-inline-folder-row[data-folder-id]')) {
        const folderId = String(folderRow.dataset.folderId || '').trim();
        folderRow.classList.toggle('saga-loredeck-library-folder-row-active', !!folderId && loredeckLibrarySelectedFolderDetailsId === folderId);
        folderRow.toggleAttribute('aria-current', !!folderId && loredeckLibrarySelectedFolderDetailsId === folderId);
    }

    const titleMeta = overlay.querySelector('.saga-loredeck-library-title-meta');
    titleMeta?.replaceWith(createLoredeckLibraryHeaderMeta(context.stack, context.library, context.canonDb, context.health));
    refreshLoredeckLibraryExportSelection(overlay, context.selectedPacks);

    const selectionToolbar = overlay.querySelector('.saga-loredeck-library-selection-toolbar');
    selectionToolbar?.replaceWith(createLoredeckLibrarySelectionToolbar(context.filteredPacks, context.libraryIndex));

    const transferPane = overlay.querySelector('.saga-loredeck-library-transfer-pane');
    transferPane?.replaceWith(createLoredeckLibraryTransferPane(
        context.selectedPack,
        context.filteredPacks,
        context.stack,
        context.selectedPacks,
        context.selectedFolderDetails,
        context.libraryIndex,
        context.library,
    ));

    const stackPane = overlay.querySelector('.saga-loredeck-library-pane-stack');
    if (options.stackChanged) disposeLoredeckCoverImages(stackPane);
    if (options.stackChanged) stackPane?.replaceWith(createLoredeckActiveStackPane(
        context.stack,
        context.library,
        context.canonDb,
        context.health,
        context.libraryIndex,
    ));

    refreshLoredeckLibrarySelectedDetails(overlay, context, options);
}

function refreshLoredeckLibraryExportSelection(overlay, selectedPacks) {
    const button = overlay.querySelector('.saga-loredeck-library-export-selected');
    if (!button) return;
    const count = selectedPacks.length;
    button.textContent = count > 1 ? `Export Selected (${count})` : 'Export Selected';
    button.disabled = count === 0;
    addTooltip(button, count ? 'Export selected Loredecks as one .saga-loredeck.zip package.' : 'Select one or more Loredecks before exporting.');
}

function refreshLoredeckLibrarySelectedDetails(overlay, context, options = {}) {
    const details = overlay.querySelector('.saga-loredeck-library-details');
    const detailsKey = `${context.selectedPack?.packId || ''}|${context.selectedFolderDetails?.id || ''}|${loredeckLibraryDetailsTab}`;
    if (options.stackChanged || details?.dataset.selectionKey !== detailsKey) disposeLoredeckCoverImages(details);
    if (options.stackChanged || details?.dataset.selectionKey !== detailsKey) details?.replaceWith(createLoredeckLibraryDetailsPanel(
        context.selectedPack,
        context.stack,
        context.canonDb,
        context.health,
        context.selectedFolderDetails,
        context.libraryIndex,
        context.library,
    ));
}

function refreshLoredeckLibraryVisibleSurfaces() {
    return withLoredeckLibraryRenderSnapshot(() => refreshLoredeckLibraryVisibleSurfacesBody());
}

function refreshLoredeckLibraryVisibleSurfacesBody() {
    if (!loredeckLibraryOpen) return false;
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    if (!overlay) return false;
    loredeckLibraryHierarchyRefreshFrame = 0;
    loredeckLibrarySelectionRefreshFrame = 0;
    const context = getLoredeckLibraryOverlayContext();

    const titleMeta = overlay.querySelector('.saga-loredeck-library-title-meta');
    titleMeta?.replaceWith(createLoredeckLibraryHeaderMeta(context.stack, context.library, context.canonDb, context.health));
    refreshLoredeckLibraryExportSelection(overlay, context.selectedPacks);

    const selectionToolbar = overlay.querySelector('.saga-loredeck-library-selection-toolbar');
    selectionToolbar?.replaceWith(createLoredeckLibrarySelectionToolbar(context.filteredPacks, context.libraryIndex));

    const currentList = overlay.querySelector('.saga-loredeck-library-hierarchy-list');
    if (currentList) {
        const top = currentList.scrollTop || 0;
        const left = currentList.scrollLeft || 0;
        const mobileTouch = currentList.classList.contains('saga-loredeck-library-mobile-list');
        const nextList = createLoredeckLibraryHierarchyList(
            context.filteredPacks,
            context.stack,
            context.canonDb,
            context.health,
            context.libraryIndex,
            context.library,
            context.scopedLibrary,
            context.registry,
            { mobileTouch },
        );
        cancelLoredeckLibraryRowRender(currentList);
        disposeLoredeckCoverImages(currentList);
        currentList.replaceWith(nextList);
        restoreLoredeckLibraryRowScroll(nextList, top, left);
    }

    const transferPane = overlay.querySelector('.saga-loredeck-library-transfer-pane');
    transferPane?.replaceWith(createLoredeckLibraryTransferPane(
        context.selectedPack,
        context.filteredPacks,
        context.stack,
        context.selectedPacks,
        context.selectedFolderDetails,
        context.libraryIndex,
        context.library,
    ));

    // Search, view and sort changes affect the list and transfer actions only.
    // Keep stack controls and the selected editor mounted.
    refreshLoredeckLibrarySelectionHighlights();
    refreshLoredeckLibrarySelectedDetails(overlay, context);

    return true;
}

function refreshLoredeckLibrarySelectionHighlights() {
    if (!loredeckLibraryOpen) return;
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    if (!overlay) return;
    const selectedId = String(getState()?.lorePanel?.selectedLoredeckId || '').trim();
    const selectedIds = new Set(loredeckLibraryBulkSelectedIds || []);
    const mobileOrderMap = getLoredeckLibraryMobileOrderMap(getLoredeckStack(getState()));

    for (const card of overlay.querySelectorAll('.saga-loredeck-library-deck-card[data-pack-id]')) {
        const packId = String(card.dataset.packId || '').trim();
        const mobileTouch = card.classList.contains('saga-loredeck-library-deck-mobile-touch');
        const bulkSelected = selectedIds.has(packId);
        const order = mobileOrderMap.get(packId) || 0;
        card.classList.toggle('saga-loredeck-library-deck-selected', !mobileTouch && selectedId === packId);
        card.classList.toggle('saga-loredeck-library-deck-bulk-selected', !mobileTouch && bulkSelected);
        card.setAttribute('aria-pressed', mobileTouch ? (order > 0 ? 'true' : 'false') : (bulkSelected ? 'true' : 'false'));
        card.toggleAttribute('aria-current', !mobileTouch && selectedId === packId);
        if (mobileTouch) {
            card.classList.toggle('saga-loredeck-library-deck-active', order > 0);
            card.dataset.mobileOrder = order ? String(order) : '';
            const badge = card.querySelector('.saga-loredeck-library-mobile-order-badge');
            if (badge) {
                badge.hidden = order <= 0;
                badge.textContent = order ? String(order) : '';
                badge.setAttribute('aria-label', order ? `Selected order ${order}` : 'Not selected');
            }
        }
    }

    for (const card of overlay.querySelectorAll('.saga-loredeck-library-stack-card[data-pack-id]')) {
        const packId = String(card.dataset.packId || '').trim();
        card.classList.toggle('saga-loredeck-library-stack-card-selected', selectedId === packId);
        card.classList.toggle('saga-loredeck-library-stack-card-bulk-selected', selectedIds.has(packId));
        card.toggleAttribute('aria-current', selectedId === packId);
    }

    for (const folderCard of overlay.querySelectorAll('.saga-loredeck-library-stack-folder-card[data-folder-id]')) {
        const folderId = String(folderCard.dataset.folderId || '').trim();
        folderCard.classList.toggle('saga-loredeck-library-stack-card-selected', !!folderId && loredeckLibrarySelectedFolderDetailsId === folderId);
        folderCard.toggleAttribute('aria-current', !!folderId && loredeckLibrarySelectedFolderDetailsId === folderId);
    }

    for (const folderRow of overlay.querySelectorAll('.saga-loredeck-library-inline-folder-row[data-folder-id]')) {
        const folderId = String(folderRow.dataset.folderId || '').trim();
        folderRow.classList.toggle('saga-loredeck-library-folder-row-active', !!folderId && loredeckLibrarySelectedFolderDetailsId === folderId);
        folderRow.toggleAttribute('aria-current', !!folderId && loredeckLibrarySelectedFolderDetailsId === folderId);
    }
}

function scheduleLoredeckLibrarySelectionSurfaceRefresh() {
    refreshLoredeckLibrarySelectionHighlights();
    if (!loredeckLibraryOpen) return;
    if (loredeckLibrarySelectionRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibrarySelectionRefreshFrame);
    }
    if (typeof requestAnimationFrame !== 'function') {
        refreshLoredeckLibrarySelectionSurfaces();
        return;
    }
    loredeckLibrarySelectionRefreshFrame = requestAnimationFrame(() => {
        loredeckLibrarySelectionRefreshFrame = 0;
        refreshLoredeckLibrarySelectionSurfaces();
    });
}

function scheduleLoredeckLibraryVisibleSurfaceRefresh(options = {}) {
    if (options.refreshHighlights !== false) refreshLoredeckLibrarySelectionHighlights();
    if (!loredeckLibraryOpen) return;
    if (loredeckLibraryHierarchyRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibraryHierarchyRefreshFrame);
    }
    if (loredeckLibrarySelectionRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibrarySelectionRefreshFrame);
    }
    const refresh = () => {
        if (!refreshLoredeckLibraryVisibleSurfaces()) renderLoredeckLibraryOverlay();
    };
    if (typeof requestAnimationFrame !== 'function') {
        refresh();
        return;
    }
    loredeckLibraryHierarchyRefreshFrame = requestAnimationFrame(refresh);
}

function updateLoredeckLibraryFolderDisclosureDom(folderId = '', collapsed = false) {
    const id = String(folderId || '').trim();
    if (!id) return;
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    const row = [...(overlay?.querySelectorAll('.saga-loredeck-library-inline-folder-row[data-folder-id]') || [])]
        .find(item => String(item.dataset.folderId || '').trim() === id);
    if (!row) return;
    row.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    const disclosure = row.querySelector('.saga-loredeck-library-folder-disclosure');
    if (disclosure) {
        disclosure.textContent = collapsed ? '>' : 'v';
        disclosure.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} folder`);
        disclosure.dataset.sagaTooltip = collapsed ? 'Expand folder.' : 'Collapse folder.';
    }
}

function getLoredeckLibraryHierarchyElementDepth(element) {
    const raw = element?.dataset?.folderDepth
        || element?.style?.getPropertyValue?.('--saga-folder-depth')
        || '0';
    const depth = Number(raw);
    return Number.isFinite(depth) ? Math.max(0, depth) : 0;
}

function removeLoredeckLibraryFolderDescendantElements(row) {
    const depth = getLoredeckLibraryHierarchyElementDepth(row);
    let removed = 0;
    let next = row?.nextElementSibling || null;
    while (next && getLoredeckLibraryHierarchyElementDepth(next) > depth) {
        const current = next;
        next = next.nextElementSibling;
        disposeLoredeckCoverImages(current);
        current.remove();
        removed += 1;
    }
    return removed;
}

function findLoredeckLibraryFolderInTree(folderId = '', folders = []) {
    const id = String(folderId || '').trim();
    if (!id) return null;
    const stack = [...(folders || [])];
    while (stack.length) {
        const folder = stack.shift();
        if (String(folder?.id || '').trim() === id) return folder;
        if (folder?.children?.length) stack.unshift(...folder.children);
    }
    return null;
}

function refreshLoredeckLibraryHierarchyCardIndexes(list) {
    if (!list) return;
    const cards = [...list.querySelectorAll('.saga-loredeck-library-deck-card[data-pack-id]')];
    const packs = getLoredeckLibraryPackMap(list.__sagaLoredeckLibraryRenderContext?.library || []);
    list.__sagaLoredeckLibraryVisibleOrder = cards.map(card => packs[card.dataset.packId]).filter(Boolean);
    cards
        .forEach((card, index) => {
            card.dataset.libraryIndex = String(index);
        });
}

function refreshLoredeckLibraryFolderSubtree(folderId = '', wasCollapsed = false) {
    const id = String(folderId || '').trim();
    if (!id || String(loredeckLibraryQuery || '').trim()) return false;
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    const list = overlay?.querySelector('.saga-loredeck-library-hierarchy-list');
    const row = [...(list?.querySelectorAll('.saga-loredeck-library-inline-folder-row[data-folder-id]') || [])]
        .find(item => String(item.dataset.folderId || '').trim() === id);
    if (!list || !row || list.hasAttribute('aria-busy')) return false;

    removeLoredeckLibraryFolderDescendantElements(row);
    if (!wasCollapsed) {
        refreshLoredeckLibraryHierarchyCardIndexes(list);
        return true;
    }

    let renderContext = list.__sagaLoredeckLibraryRenderContext || loredeckLibraryHierarchyRenderCache;
    if (!renderContext) {
        const context = getLoredeckLibraryOverlayContext();
        renderContext = createLoredeckLibraryHierarchyRenderContext(
            context.filteredPacks,
            context.stack,
            context.canonDb,
            context.health,
            context.libraryIndex,
            context.library,
            context.scopedLibrary,
            context.registry,
        );
        loredeckLibraryHierarchyRenderCache = renderContext;
        list.__sagaLoredeckLibraryRenderContext = renderContext;
    }
    const folders = sortLoredeckLibraryFolderTreeByTitle(buildFolderTree(renderContext.libraryIndex));
    const folder = findLoredeckLibraryFolderInTree(id, folders);
    if (!folder) return false;
    const fragment = document.createDocumentFragment();
    const subtreeContext = { ...renderContext, rowTarget: fragment, rowFactories: [] };
    appendLoredeckLibraryFolderContents(
        fragment,
        folder,
        getLoredeckLibraryHierarchyElementDepth(row) + 1,
        subtreeContext,
        [],
    );
    // Count both folders and decks before constructing any DOM. Large branches
    // use the same bounded renderer as opening and filtering.
    if (subtreeContext.rowFactories.length > LOREDECK_LIBRARY_ROW_BATCH_SIZE) return false;
    withLoredeckLibraryRenderSnapshot(() => {
        for (const createRow of subtreeContext.rowFactories) fragment.appendChild(createRow());
    });
    if (fragment.childNodes.length) list.insertBefore(fragment, row.nextElementSibling);
    refreshLoredeckLibraryHierarchyCardIndexes(list);
    return true;
}

function refreshLoredeckLibraryHierarchyList() {
    return withLoredeckLibraryRenderSnapshot(() => refreshLoredeckLibraryHierarchyListBody());
}

function refreshLoredeckLibraryHierarchyListBody() {
    loredeckLibraryHierarchyRefreshFrame = 0;
    if (!loredeckLibraryOpen) return false;
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    const currentList = overlay?.querySelector('.saga-loredeck-library-hierarchy-list');
    if (!overlay || !currentList) return false;

    const context = getLoredeckLibraryOverlayContext();
    const top = currentList.scrollTop || 0;
    const left = currentList.scrollLeft || 0;
    const nextList = createLoredeckLibraryHierarchyList(
        context.filteredPacks,
        context.stack,
        context.canonDb,
        context.health,
        context.libraryIndex,
        context.library,
        context.scopedLibrary,
        context.registry,
        { mobileTouch: currentList.classList.contains('saga-loredeck-library-mobile-list') },
    );
    cancelLoredeckLibraryRowRender(currentList);
    disposeLoredeckCoverImages(currentList);
    currentList.replaceWith(nextList);
    restoreLoredeckLibraryRowScroll(nextList, top, left);
    return true;
}

function scheduleLoredeckLibraryHierarchyRefresh() {
    if (!loredeckLibraryOpen) return;
    if (loredeckLibraryHierarchyRefreshFrame && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(loredeckLibraryHierarchyRefreshFrame);
    }
    if (typeof requestAnimationFrame !== 'function') {
        if (!refreshLoredeckLibraryHierarchyList()) renderLoredeckLibraryOverlay();
        return;
    }
    loredeckLibraryHierarchyRefreshFrame = requestAnimationFrame(() => {
        if (!refreshLoredeckLibraryHierarchyList()) renderLoredeckLibraryOverlay();
    });
}

function getLoredeckLibraryDetailsHeight(state = getState()) {
    return clampNumber(
        Number(state?.lorePanel?.loredeckLibraryDetailsHeight),
        LOREDECK_LIBRARY_DETAILS_MIN_HEIGHT,
        LOREDECK_LIBRARY_DETAILS_MAX_HEIGHT,
        LOREDECK_LIBRARY_DETAILS_DEFAULT_HEIGHT,
    );
}

function getLoredeckLibraryDetailsCollapsed(state = getState()) {
    return state?.lorePanel?.loredeckLibraryDetailsCollapsed === true;
}

function setLoredeckLibraryDetailsHeight(height, options = {}) {
    const next = clampNumber(
        Number(height),
        LOREDECK_LIBRARY_DETAILS_MIN_HEIGHT,
        LOREDECK_LIBRARY_DETAILS_MAX_HEIGHT,
        LOREDECK_LIBRARY_DETAILS_DEFAULT_HEIGHT,
    );
    loredeckLibraryDetailsHeight = next;
    document
        .querySelector('.saga-loredeck-library-body')
        ?.style
        ?.setProperty('--saga-loredeck-library-details-height', `${next}px`);
    if (options.persist) {
        const state = getState();
        state.lorePanel = state.lorePanel && typeof state.lorePanel === 'object' ? state.lorePanel : {};
        state.lorePanel.loredeckLibraryDetailsHeight = next;
        saveState(state);
    }
    return next;
}

function updateLoredeckLibraryDetailsCollapsedDom(collapsed) {
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    const body = overlay?.querySelector('.saga-loredeck-library-body');
    const handle = overlay?.querySelector('.saga-loredeck-library-resize-handle');
    if (!body || !handle) return false;
    const isCollapsed = collapsed === true;
    body.classList.toggle('saga-loredeck-library-details-collapsed', isCollapsed);
    handle.classList.toggle('saga-loredeck-library-resize-handle-collapsed', isCollapsed);
    handle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    handle.dataset.sagaTooltip = isCollapsed
        ? 'Expand the selected Loredeck details panel.'
        : 'Collapse, resize, or reset the selected Loredeck details panel.';
    const labelText = handle.querySelector('.saga-loredeck-library-resize-label-text');
    if (labelText) labelText.textContent = isCollapsed ? 'Expand Details' : 'Collapse Details';
    for (const arrow of handle.querySelectorAll('.saga-loredeck-library-resize-label-arrow')) {
        arrow.textContent = isCollapsed ? '\u2191' : '\u2193';
    }
    return true;
}

function setLoredeckLibraryDetailsCollapsed(collapsed, options = {}) {
    const next = collapsed === true;
    const state = getState();
    if (!state.lorePanel || typeof state.lorePanel !== 'object') state.lorePanel = getDefaultState().lorePanel;
    state.lorePanel.loredeckLibraryDetailsCollapsed = next;
    if (!next) {
        state.lorePanel.loredeckLibraryDetailsHeight = Math.max(
            LOREDECK_LIBRARY_DETAILS_MIN_HEIGHT,
            Number(state.lorePanel.loredeckLibraryDetailsHeight) || LOREDECK_LIBRARY_DETAILS_DEFAULT_HEIGHT,
        );
    }
    if (options.persist !== false) saveState(state, { syncPrompt: false });
    if (!updateLoredeckLibraryDetailsCollapsedDom(next)) renderLoredeckLibraryOverlay();
}

function createLoredeckLibraryResizeHandle(collapsed = false) {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = `saga-loredeck-library-resize-handle${collapsed ? ' saga-loredeck-library-resize-handle-collapsed' : ''}`;
    handle.setAttribute('aria-label', 'Resize Loredeck details panel');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    const createGrip = (side) => {
        const grip = document.createElement('span');
        grip.className = `saga-loredeck-library-resize-track saga-loredeck-library-resize-track-${side}`;
        grip.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 4; i += 1) grip.appendChild(document.createElement('span'));
        return grip;
    };
    handle.appendChild(createGrip('left'));
    const label = document.createElement('span');
    label.className = 'saga-loredeck-library-resize-label';
    const arrow = collapsed ? '&uarr;' : '&darr;';
    label.innerHTML = `<span class="saga-loredeck-library-resize-label-arrow">${arrow}</span><span class="saga-loredeck-library-resize-label-text">${collapsed ? 'Expand Details' : 'Collapse Details'}</span><span class="saga-loredeck-library-resize-label-arrow">${arrow}</span>`;
    handle.appendChild(label);
    handle.appendChild(createGrip('right'));
    addTooltip(handle, collapsed ? 'Expand the selected Loredeck details panel.' : 'Collapse, resize, or reset the selected Loredeck details panel.');

    handle.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (handle.dataset.suppressClick === 'true') return;
        setLoredeckLibraryDetailsCollapsed(!getLoredeckLibraryDetailsCollapsed(), { persist: true });
    });

    handle.addEventListener('pointerdown', e => {
        if (collapsed) return;
        if (e.button != null && e.button !== 0) return;
        const body = handle.closest('.saga-loredeck-library-body');
        if (!body) return;
        e.preventDefault();
        e.stopPropagation();
        handle.setPointerCapture?.(e.pointerId);
        document.body.classList.add('saga-loredeck-library-resizing');
        let dragged = false;
        const startY = e.clientY;

        const onMove = event => {
            if (!dragged && Math.abs(event.clientY - startY) <= 3) return;
            dragged = true;
            const rect = body.getBoundingClientRect();
            const style = getComputedStyle(body);
            const bottomPadding = parseFloat(style.paddingBottom) || 0;
            const reservedTop = 86;
            const max = Math.max(
                LOREDECK_LIBRARY_DETAILS_MIN_HEIGHT,
                Math.min(
                    LOREDECK_LIBRARY_DETAILS_MAX_HEIGHT,
                    rect.height - LOREDECK_LIBRARY_COLUMNS_MIN_HEIGHT - reservedTop,
                ),
            );
            const next = clampNumber(
                rect.bottom - event.clientY - bottomPadding,
                LOREDECK_LIBRARY_DETAILS_MIN_HEIGHT,
                max,
                loredeckLibraryDetailsHeight,
            );
            setLoredeckLibraryDetailsHeight(next);
        };

        const onUp = event => {
            handle.releasePointerCapture?.(event.pointerId);
            document.body.classList.remove('saga-loredeck-library-resizing');
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            if (event.type === 'pointercancel') return;
            if (dragged) {
                setLoredeckLibraryDetailsHeight(loredeckLibraryDetailsHeight, { persist: true });
                handle.dataset.suppressClick = 'true';
                window.setTimeout(() => { delete handle.dataset.suppressClick; }, 0);
                return;
            }
            handle.dataset.suppressClick = 'true';
            window.setTimeout(() => { delete handle.dataset.suppressClick; }, 0);
            setLoredeckLibraryDetailsCollapsed(!getLoredeckLibraryDetailsCollapsed(), { persist: true });
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp, { once: true });
        window.addEventListener('pointercancel', onUp, { once: true });
    });

    return handle;
}

export async function refreshLoredeckLibraryWindowData(button = null) {
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Refreshing...', { fallbackLabel: 'Refresh Library' });
    try {
        bundledLoredeckIndexCache = null;
        bundledLoredeckIndexLoadAttempted = false;
        clearCanonLoreDatabaseCache();
        clearCanonPreviewUiState();
        clearContextIndexCache();
        await loadCanonLoreDatabase();
        await loadContextIndex().catch(() => null);
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();
        renderLoredeckLibraryOverlay();
    } catch (e) {
        toast(e?.message || 'Loredeck Library refresh failed.', 'error');
    } finally {
        restoreBusy();
    }
}

export function refreshLoredeckSurfaces(options = {}) {
    const {
        preserveScroll = true,
        preserveWindowScroll = true,
        clearCanon = false,
        clearContext = false,
        renderLibrary = true,
    } = options;
    if (clearCanon) {
        clearCanonLoreDatabaseCache();
        clearCanonPreviewUiState();
    }
    if (clearContext) clearContextIndexCache();
    refreshPanelBody({ preserveScroll, preserveWindowScroll });
    refreshHeader();
    if (renderLibrary && loredeckLibraryOpen) renderLoredeckLibraryOverlay();
    renderContextWorkbench();
}

export function getLoredeckLibraryPackMap(library = []) {
    const packs = {};
    for (const pack of library || []) {
        if (pack?.packId) packs[pack.packId] = pack;
    }
    return packs;
}

export function getLoredeckLibraryIndexForPacks(state = getState(), library = getLoredeckLibrary(state), registry = getLoredeckLibraryRegistry(state)) {
    const snapshot = loredeckLibraryRenderSnapshot;
    if (snapshot?.index?.library === library && snapshot.index.registry === registry) return snapshot.index.value;
    const value = normalizeLoredeckLibraryIndex(registry, { packs: getLoredeckLibraryPackMap(library) });
    if (snapshot) snapshot.index = { library, registry, value };
    return value;
}

function isLoredeckLibrarySpecialFolderId(folderId = '') {
    const id = String(folderId || '').trim();
    return LOREDECK_LIBRARY_SPECIAL_VIEWS.some(view => view.id === id);
}

function getLoredeckLibraryActiveViewId() {
    const id = String(loredeckLibrarySelectedFolderId || '').trim();
    return isLoredeckLibrarySpecialFolderId(id) ? id : 'all';
}

function normalizeLoredeckLibrarySelectedFolder(libraryIndex = {}) {
    const id = String(loredeckLibrarySelectedFolderId || '').trim() || 'all';
    const detailId = String(loredeckLibrarySelectedFolderDetailsId || '').trim();
    if (detailId && detailId !== 'unfiled' && !(libraryIndex.folders || []).some(folder => folder.id === detailId)) {
        loredeckLibrarySelectedFolderDetailsId = '';
    }
    if (isLoredeckLibrarySpecialFolderId(id)) return id;
    const exists = (libraryIndex.folders || []).some(folder => folder.id === id);
    if (!exists) loredeckLibrarySelectedFolderId = 'all';
    return loredeckLibrarySelectedFolderId;
}

export function getLoredeckLibraryPackFolderId(pack = {}, libraryIndex = {}) {
    const packId = String(pack.packId || '').trim();
    if (!packId) return '';
    const placement = (libraryIndex.deckPlacements || []).find(item => item.deckId === packId || item.packId === packId);
    if (placement?.folderId) return placement.folderId;
    if (pack.library?.folderId) return String(pack.library.folderId || '').trim();
    return createFolderIdFromPath(pack.library?.suggestedPath || []);
}

function getLoredeckLibraryFolderScopedPacks(library = [], libraryIndex = {}, folderId = 'all', stack = []) {
    let id = String(folderId || 'all').trim() || 'all';
    if (id === loredeckLibrarySelectedFolderId) {
        id = normalizeLoredeckLibrarySelectedFolder(libraryIndex) || 'all';
    } else if (!isLoredeckLibrarySpecialFolderId(id) && !(libraryIndex.folders || []).some(folder => folder.id === id)) {
        id = 'all';
    }
    const activeIds = new Set(resolveLoredeckStackItems((stack || []).filter(item => item.enabled !== false), libraryIndex, {
        packs: getLoredeckLibraryPackMap(library),
    }).stack.map(item => item.packId).filter(Boolean));
    if (id === 'all') return library;
    if (id === 'bundled') return library.filter(pack => pack.type === 'bundled');
    if (id === 'custom') return library.filter(pack => pack.type !== 'bundled');
    if (id === 'unfiled') return library.filter(pack => !getLoredeckLibraryPackFolderId(pack, libraryIndex));
    if (id === 'active') return library.filter(pack => activeIds.has(pack.packId));
    const deckIds = new Set(getLoredeckLibraryFolderDeckIds(id, libraryIndex, { includeNested: true }));
    return library.filter(pack => deckIds.has(pack.packId));
}

function isLoredeckLibraryBundledFolder(folderId = '', library = [], libraryIndex = {}) {
    const id = String(folderId || '').trim();
    if (!id || id === 'unfiled' || isLoredeckLibrarySpecialFolderId(id)) return false;
    return getLoredeckLibraryFolderPacks(id, library, libraryIndex, { includeNested: true })
        .some(pack => pack?.type === 'bundled' || isBundledLoredeckLibraryPack(pack));
}

function isLoredeckLibraryFolderCollapsedByDefault(folder = {}, library = [], libraryIndex = {}) {
    const id = String(folder?.id || folder || '').trim();
    if (!id) return false;
    return folder?.collapsed === true || isLoredeckLibraryBundledFolder(id, library, libraryIndex);
}

function getLoredeckLibraryFolderCollapsedState(folder = {}, library = [], libraryIndex = {}, options = {}) {
    const id = String(folder?.id || folder || '').trim();
    if (!id || options.query) return false;
    if (loredeckLibraryExpandedFolderIds.has(id)) return false;
    if (loredeckLibraryCollapsedFolderIds.has(id)) return true;
    return isLoredeckLibraryFolderCollapsedByDefault(folder, library, libraryIndex);
}

function getLoredeckLibraryViewTitle(folderId = 'all', libraryIndex = {}) {
    const id = String(folderId || 'all').trim();
    const special = LOREDECK_LIBRARY_SPECIAL_VIEWS.find(view => view.id === id);
    if (special) return special.title;
    return getFolderPath(id, libraryIndex).join(' > ') || 'Folder';
}

function getLoredeckLibraryFolderStats(folderId = 'all', library = [], libraryIndex = {}, stack = [], canonDb = null, health = null) {
    const scoped = getLoredeckLibraryFolderScopedPacks(library, libraryIndex, folderId, stack);
    const activeIds = new Set(resolveLoredeckStackItems((stack || []).filter(item => item.enabled !== false), libraryIndex, {
        packs: getLoredeckLibraryPackMap(library),
    }).stack.map(item => item.packId).filter(Boolean));
    let warningCount = 0;
    let errorCount = 0;
    for (const pack of scoped) {
        const info = getLoredeckLibraryPackHealthInfo(pack, canonDb, health);
        const tone = getLoredeckLibraryDisplayHealthTone(pack, info);
        if (tone === 'error') errorCount += 1;
        else if (['warning', 'unknown'].includes(tone)) warningCount += 1;
    }
    return {
        deckCount: scoped.length,
        activeCount: scoped.filter(pack => activeIds.has(pack.packId)).length,
        warningCount,
        errorCount,
        childFolderCount: (libraryIndex.folders || []).filter(folder => folder.parentId === folderId).length,
    };
}

function normalizeLoredeckLibraryBulkSelection(library = [], fallbackPackId = '') {
    const validIds = new Set((library || []).map(pack => pack.packId).filter(Boolean));
    loredeckLibraryBulkSelectedIds = new Set(
        [...loredeckLibraryBulkSelectedIds]
            .map(id => String(id || '').trim())
            .filter(id => validIds.has(id))
    );
    const fallback = String(fallbackPackId || '').trim();
    if (!loredeckLibraryBulkSelectedIds.size && fallback && validIds.has(fallback)) {
        loredeckLibraryBulkSelectedIds.add(fallback);
        loredeckLibraryLastSelectionAnchorId = fallback;
    } else if (loredeckLibraryLastSelectionAnchorId && !validIds.has(loredeckLibraryLastSelectionAnchorId)) {
        loredeckLibraryLastSelectionAnchorId = [...loredeckLibraryBulkSelectedIds][0] || '';
    }
}

function getLoredeckLibraryBulkSelectedIds(library = getLoredeckLibrary(getState())) {
    const validIds = new Set((library || []).map(pack => pack.packId).filter(Boolean));
    return [...loredeckLibraryBulkSelectedIds].filter(id => validIds.has(id));
}

function getLoredeckLibrarySelectionElement(node) {
    if (!node) return null;
    if (node.nodeType === 1) return node;
    return node.parentElement || null;
}

function clearLoredeckLibraryNativeSelection() {
    const getSelection = typeof window !== 'undefined' && typeof window.getSelection === 'function'
        ? () => window.getSelection()
        : (typeof document !== 'undefined' && typeof document.getSelection === 'function' ? () => document.getSelection() : null);
    const selection = getSelection?.();
    if (!selection?.rangeCount) return;
    const overlay = document.querySelector('.saga-loredeck-library-overlay');
    if (!overlay) return;
    const anchor = getLoredeckLibrarySelectionElement(selection.anchorNode);
    const focus = getLoredeckLibrarySelectionElement(selection.focusNode);
    const selectionInsideOverlay = (anchor && overlay.contains(anchor)) || (focus && overlay.contains(focus));
    if (selectionInsideOverlay) selection.removeAllRanges();
}

function isLoredeckLibraryNativeSelectionTarget(target) {
    return !!target?.closest?.('input, textarea, select, button, a[href], [contenteditable="true"], [contenteditable="plaintext-only"]');
}

function suppressLoredeckLibraryRangeTextSelection(event) {
    if (!event?.shiftKey || event.defaultPrevented) return;
    if (event.button != null && event.button !== 0) return;
    if (isLoredeckLibraryNativeSelectionTarget(event.target)) return;
    event.preventDefault();
    try {
        event.currentTarget?.focus?.({ preventScroll: true });
    } catch (_error) {
        event.currentTarget?.focus?.();
    }
    clearLoredeckLibraryNativeSelection();
}

export function setLoredeckLibraryBulkSelection(packIds = [], anchorId = '') {
    const ids = (packIds || []).map(id => String(id || '').trim()).filter(Boolean);
    loredeckLibraryBulkSelectedIds = new Set(ids);
    loredeckLibraryLastSelectionAnchorId = String(anchorId || ids[ids.length - 1] || '').trim();
}

function handleLoredeckLibraryDeckSelection(packId, event = null, visiblePacks = []) {
    const id = String(packId || '').trim();
    if (!id) return;
    loredeckLibrarySelectedFolderDetailsId = '';
    const visibleIds = (visiblePacks || []).map(pack => pack.packId).filter(Boolean);
    const hasRange = event?.shiftKey && visibleIds.length;
    if (hasRange) {
        clearLoredeckLibraryNativeSelection();
        const anchor = visibleIds.includes(loredeckLibraryLastSelectionAnchorId)
            ? loredeckLibraryLastSelectionAnchorId
            : (getLoredeckLibraryBulkSelectedIds().find(selectedId => visibleIds.includes(selectedId)) || id);
        const start = visibleIds.indexOf(anchor);
        const end = visibleIds.indexOf(id);
        if (start >= 0 && end >= 0) {
            const [from, to] = start <= end ? [start, end] : [end, start];
            setLoredeckLibraryBulkSelection(visibleIds.slice(from, to + 1), anchor);
        } else {
            setLoredeckLibraryBulkSelection([id], id);
        }
    } else if (event?.ctrlKey || event?.metaKey) {
        const next = new Set(getLoredeckLibraryBulkSelectedIds());
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setLoredeckLibraryBulkSelection([...next], id);
    } else {
        setLoredeckLibraryBulkSelection([id], id);
    }
    selectLoredeckForDetails(id, { refresh: false });
}

function clearLoredeckLibrarySelection(options = {}) {
    const state = getState();
    const selectedId = String(state?.lorePanel?.selectedLoredeckId || '').trim();
    if (options.clearFolderDetails !== false) loredeckLibrarySelectedFolderDetailsId = '';
    setLoredeckLibraryBulkSelection([], '');
    if (!selectedId) return false;
    if (!state.lorePanel) state.lorePanel = getDefaultState().lorePanel;
    state.lorePanel.selectedLoredeckId = '';
    saveState(state, { syncPrompt: false });
    return true;
}

function isLoredeckLibraryBlankColumnClick(event) {
    if (!event || event.defaultPrevented) return false;
    if (event.button != null && event.button !== 0) return false;
    const target = event.target;
    if (!target?.closest) return false;
    return !target.closest([
        'button',
        'input',
        'select',
        'textarea',
        'a',
        '[contenteditable="true"]',
        '.saga-loredeck-library-controls',
        '.saga-loredeck-library-selection-toolbar',
        '.saga-loredeck-library-deck-card',
        '.saga-loredeck-library-inline-folder-row',
        '.saga-loredeck-library-stack-card',
        '.saga-loredeck-library-stack-folder-card',
        '.saga-loredeck-library-stack-grip',
    ].join(','));
}

function wireLoredeckLibraryBlankSelectionClear(pane) {
    pane?.addEventListener?.('click', event => {
        if (!isLoredeckLibraryBlankColumnClick(event)) return;
        clearLoredeckLibrarySelection();
        refreshLoredeckLibrarySelectionSurfaces();
    });
    return pane;
}

function createLoredeckLibraryHeaderMeta(stack = [], library = [], canonDb = null, health = null) {
    const stats = getLoredeckLibraryStackStats(stack, library, canonDb, health);
    const selectedCount = getLoredeckLibraryBulkSelectedIds(library).length;
    const meta = document.createElement('div');
    meta.className = 'saga-loredeck-library-title-meta';
    return appendLoredeckStatusPills(meta, [
        [`${library.length} decks available`, 'Total registered Loredecks available to this session.', { kind: 'count' }],
        [`${stats.activeCount} active`, 'Enabled Loredecks in the current session stack.', { tone: stats.activeCount ? 'success' : 'muted', kind: 'count' }],
        [`${stats.entryCount} active Lorecards`, 'Approximate active Lorecards available from enabled Loredecks.', { kind: 'count' }],
        [`${selectedCount} selected`, 'Loredecks selected for bulk Library actions such as export and stack changes.', { tone: selectedCount ? 'selected' : 'muted', kind: 'count' }],
        [`${stats.errorCount} errors`, 'Current stack Pack Health error count.', { tone: stats.errorCount ? 'danger' : 'muted', kind: 'severity' }],
        [`${stats.warningCount} warnings`, 'Current stack Pack Health warning count.', { tone: stats.warningCount ? 'warning' : 'muted', kind: 'severity' }],
    ]);
}

function createLoredeckLibraryPane(packs = [], stack = [], canonDb = null, health = null, libraryIndex = {}, library = getLoredeckLibrary(getState()), scopedLibrary = packs, activeViewId = 'all', registry = getLoredeckLibraryRegistry(getState())) {
    const pane = document.createElement('div');
    pane.className = 'saga-loredeck-library-pane saga-loredeck-library-pane-library';
    wireLoredeckLibraryBlankSelectionClear(pane);

    const controls = document.createElement('div');
    controls.className = 'saga-loredeck-library-controls';
    markTourTarget(controls, 'loredecks.library.filters');
    controls.appendChild(createLoredeckSearchInput({
        className: 'text_pole saga-loredeck-library-search',
        placeholder: 'Search decks...',
        value: loredeckLibraryQuery || '',
        tooltip: 'Search deck title, description, fandom, era, tags, manifest path, and deck ID. Press Enter or leave the field to apply.',
        onEnter: value => {
            loredeckLibraryQuery = value;
            scheduleLoredeckLibraryVisibleSurfaceRefresh({ refreshHighlights: false });
        },
        onChange: value => {
            loredeckLibraryQuery = value;
            scheduleLoredeckLibraryVisibleSurfaceRefresh({ refreshHighlights: false });
        },
    }));

    controls.appendChild(createLoredeckSelectControl({
        className: 'text_pole saga-loredeck-library-view',
        value: activeViewId,
        fallbackValue: 'all',
        tooltip: 'Filter the Library without changing folder organization.',
        options: LOREDECK_LIBRARY_SPECIAL_VIEWS.map(item => [item.id, item.title, item.tooltip]),
        onChange: value => {
            loredeckLibrarySelectedFolderId = value || 'all';
            loredeckLibrarySelectedFolderDetailsId = '';
            setLoredeckLibraryBulkSelection([], '');
            scheduleLoredeckLibraryVisibleSurfaceRefresh({ refreshHighlights: false });
        },
    }));

    controls.appendChild(createLoredeckSelectControl({
        className: 'text_pole saga-loredeck-library-sort',
        value: loredeckLibrarySort,
        fallbackValue: 'manual',
        tooltip: 'Sort the visible Loredeck Library list.',
        options: [
            ['manual', 'Manual'],
            ['name', 'Name'],
            ['type', 'Type'],
            ['health', 'Health'],
            ['entries', 'Lorecards'],
            ['updated', 'Updated'],
        ],
        onChange: value => {
            loredeckLibrarySort = value;
            scheduleLoredeckLibraryVisibleSurfaceRefresh({ refreshHighlights: false });
        },
    }));
    const newFolderButton = createButton('New Folder', 'Create a new top-level Library folder.', () => {
        void promptCreateLoredeckLibraryFolder('');
    }, 'saga-loredeck-library-small-button saga-loredeck-library-new-folder-button');
    markTourTarget(newFolderButton, 'loredecks.library.folderActions');
    controls.appendChild(newFolderButton);
    pane.appendChild(controls);

    pane.appendChild(createLoredeckLibrarySelectionToolbar(packs, libraryIndex));
    pane.appendChild(createLoredeckLibraryHierarchyList(packs, stack, canonDb, health, libraryIndex, library, scopedLibrary, registry));
    return pane;
}

function getLoredeckLibraryMobileActiveDeckItems(stack = []) {
    return (Array.isArray(stack) ? stack : [])
        .filter(item => getLoredeckStackItemType(item) !== 'folder' && item.enabled !== false && String(item.packId || item.deckId || '').trim())
        .map(item => ({ ...item, packId: String(item.packId || item.deckId || '').trim() }));
}

function getLoredeckLibraryMobileOrderMap(stack = []) {
    const snapshot = loredeckLibraryRenderSnapshot;
    if (snapshot?.mobileOrder?.stack === stack) return snapshot.mobileOrder.map;

    const map = new Map();
    getLoredeckLibraryMobileActiveDeckItems(stack).forEach((item, index) => {
        if (!map.has(item.packId)) map.set(item.packId, index + 1);
    });
    if (snapshot) snapshot.mobileOrder = { stack, map };
    return map;
}

function createLoredeckLibraryMobileBrowsePane(packs = [], stack = [], canonDb = null, health = null, libraryIndex = {}, library = getLoredeckLibrary(getState()), scopedLibrary = packs, activeViewId = 'all', registry = getLoredeckLibraryRegistry(getState())) {
    const pane = document.createElement('div');
    pane.className = 'saga-loredeck-library-mobile-browse';
    markTourTarget(pane, 'loredecks.library.mobileBrowse');

    const controls = document.createElement('div');
    controls.className = 'saga-loredeck-library-controls saga-loredeck-library-mobile-controls';
    markTourTarget(controls, 'loredecks.library.filters');
    controls.appendChild(createLoredeckSearchInput({
        className: 'text_pole saga-loredeck-library-search',
        placeholder: 'Search decks...',
        value: loredeckLibraryQuery || '',
        tooltip: 'Search deck title, description, fandom, era, tags, manifest path, and deck ID. Press Enter or leave the field to apply.',
        onEnter: value => {
            loredeckLibraryQuery = value;
            scheduleLoredeckLibraryVisibleSurfaceRefresh({ refreshHighlights: false });
        },
        onChange: value => {
            loredeckLibraryQuery = value;
            scheduleLoredeckLibraryVisibleSurfaceRefresh({ refreshHighlights: false });
        },
    }));
    controls.appendChild(createLoredeckSelectControl({
        className: 'text_pole saga-loredeck-library-view',
        value: activeViewId,
        fallbackValue: 'all',
        tooltip: 'Filter the Library without changing active Loredeck order.',
        options: LOREDECK_LIBRARY_SPECIAL_VIEWS.map(item => [item.id, item.title, item.tooltip]),
        onChange: value => {
            loredeckLibrarySelectedFolderId = value || 'all';
            loredeckLibrarySelectedFolderDetailsId = '';
            setLoredeckLibraryBulkSelection([], '');
            scheduleLoredeckLibraryVisibleSurfaceRefresh({ refreshHighlights: false });
        },
    }));
    pane.appendChild(controls);

    pane.appendChild(createLoredeckLibraryMobileSelectedStrip(stack, library));
    pane.appendChild(createLoredeckLibraryHierarchyList(packs, stack, canonDb, health, libraryIndex, library, scopedLibrary, registry, { mobileTouch: true }));
    return pane;
}

const LOREDECK_LIBRARY_MOBILE_ACTION_TOOLTIP_OPTIONS = Object.freeze({ showOnHover: false, showOnFocus: false });

function createLoredeckLibraryMobileBottomButton(label, tooltip, handler, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `saga-runtime-button ${className}`.trim();
    button.textContent = label;
    addTooltip(button, tooltip || label, LOREDECK_LIBRARY_MOBILE_ACTION_TOOLTIP_OPTIONS);
    button.addEventListener('click', async (event) => {
        event.stopPropagation();
        hideFloatingTooltip();
        await handler?.(button, event);
    });
    return button;
}

function createLoredeckLibraryMobileBottomActions(options = {}) {
    const bar = createLoredeckActionRow({ className: 'saga-primary-actions saga-loredeck-library-mobile-bottom-actions' });
    bar.setAttribute('aria-label', 'Loredeck Library actions');

    if (!options.opening) {
        const importButton = createLoredeckLibraryMobileBottomButton('Import', 'Import a Saga Loredeck zip package into the Library.', () => {
            installLoredeckBundleFromFile();
        }, 'saga-loredeck-library-mobile-bottom-action');
        markTourTarget(importButton, 'loredecks.library.import');
        bar.appendChild(importButton);

        const refresh = createLoredeckLibraryMobileBottomButton('Refresh', 'Reload active Loredecks and recompute Pack Health.', async (btn) => {
            await refreshLoredeckLibraryWindowData(btn);
        }, 'saga-loredeck-library-mobile-bottom-action');
        bar.appendChild(refresh);
    }

    const doneButton = createLoredeckLibraryMobileBottomButton('Done', 'Close the Loredeck Library.', closeLoredeckLibraryWindow, 'saga-primary-button saga-loredeck-library-mobile-bottom-action');
    markTourTarget(doneButton, 'loredecks.library.done');
    bar.appendChild(doneButton);
    return bar;
}

function createLoredeckLibraryMobileSelectedStrip(stack = [], library = []) {
    const activeItems = getLoredeckLibraryMobileActiveDeckItems(stack);
    const activeIds = activeItems.map(item => item.packId);
    const packById = new Map((library || []).map(pack => [String(pack?.packId || '').trim(), pack]).filter(([id]) => !!id));
    const strip = document.createElement('div');
    strip.className = 'saga-loredeck-library-mobile-selected-strip';
    strip.dataset.mobileSelectedStrip = 'true';
    markTourTarget(strip, 'loredecks.library.mobileSelectedStrip');

    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-library-mobile-selected-summary';
    summary.textContent = activeIds.length ? `${activeIds.length} active` : 'Tap Loredecks to activate them';
    strip.appendChild(summary);

    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-library-mobile-selected-chips';
    activeItems.slice(0, 6).forEach((item, index) => {
        const pack = packById.get(item.packId) || item;
        const chip = document.createElement('span');
        chip.className = 'saga-loredeck-library-mobile-selected-chip';
        chip.textContent = `${index + 1} ${pack.title || item.packId}`;
        chip.setAttribute('aria-label', `Selected order ${index + 1}: ${pack.title || item.packId}`);
        chips.appendChild(chip);
    });
    if (activeItems.length > 6) {
        const more = document.createElement('span');
        more.className = 'saga-loredeck-library-mobile-selected-chip saga-loredeck-library-mobile-selected-chip-more';
        more.textContent = `+${activeItems.length - 6}`;
        chips.appendChild(more);
    }
    strip.appendChild(chips);

    const actions = document.createElement('div');
    actions.className = 'saga-loredeck-library-mobile-selected-actions';
    const reorder = createButton('Reorder', 'Open selected Loredecks in explicit reorder mode.', () => {
        openLoredeckLibraryMobileReorderSheet();
    }, 'saga-loredeck-library-small-button saga-loredeck-library-mobile-reorder');
    reorder.disabled = activeItems.length < 2;
    actions.appendChild(reorder);
    const clear = createButton('Clear', 'Remove every directly selected Loredeck from the active stack.', () => {
        if (!activeIds.length) return;
        loredeckLibraryMobileReorderOpen = false;
        removeLoredecksFromStack(activeIds);
    }, 'saga-loredeck-library-small-button saga-loredeck-library-mobile-clear');
    clear.disabled = !activeIds.length;
    actions.appendChild(clear);
    strip.appendChild(actions);
    return strip;
}

function getLoredeckLibraryMobileActiveStackRecords(stack = []) {
    return (Array.isArray(stack) ? stack : [])
        .map((item, index) => ({
            item,
            index,
            packId: String(item?.packId || item?.deckId || '').trim(),
            key: getLoredeckStackItemKey(item),
        }))
        .filter(record => record.packId && record.item?.enabled !== false && getLoredeckStackItemType(record.item) !== 'folder');
}

function openLoredeckLibraryMobileReorderSheet() {
    if (getLoredeckLibraryMobileActiveStackRecords(getLoredeckStack(getState())).length < 2) return false;
    loredeckLibraryMobileDetailPackId = '';
    loredeckLibraryMobileDetailFolderId = '';
    loredeckLibraryMobileReorderOpen = true;
    renderLoredeckLibraryOverlay();
    return true;
}

function closeLoredeckLibraryMobileReorderSheet() {
    if (!loredeckLibraryMobileReorderOpen) return false;
    loredeckLibraryMobileReorderOpen = false;
    renderLoredeckLibraryOverlay();
    return true;
}

function moveLoredeckLibraryMobileReorderItem(packId = '', direction = 0) {
    const id = String(packId || '').trim();
    const delta = Math.sign(Number(direction) || 0);
    if (!id || !delta) return false;
    const records = getLoredeckLibraryMobileActiveStackRecords(getLoredeckStack(getState()));
    const current = records.findIndex(record => record.packId === id);
    const target = current + delta;
    if (current < 0 || target < 0 || target >= records.length) return false;
    loredeckLibraryMobileReorderOpen = true;
    return reorderLoredeckStackItem(records[current].key || createLoredeckStackDeckKey(id), records[target].index);
}

function createLoredeckLibraryMobileReorderSheet(stack = [], library = []) {
    const activeRecords = getLoredeckLibraryMobileActiveStackRecords(stack);
    const packById = new Map((library || []).map(pack => [String(pack?.packId || '').trim(), pack]).filter(([id]) => !!id));
    const backdrop = document.createElement('div');
    backdrop.className = 'saga-loredeck-library-mobile-reorder-backdrop';
    backdrop.setAttribute('role', 'presentation');
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop) closeLoredeckLibraryMobileReorderSheet();
    });

    const sheet = document.createElement('div');
    sheet.className = 'saga-loredeck-library-mobile-reorder-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Reorder active Loredecks');
    sheet.addEventListener('click', event => event.stopPropagation());
    markTourTarget(sheet, 'loredecks.library.mobileReorder');

    const header = document.createElement('div');
    header.className = 'saga-loredeck-library-mobile-reorder-header';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-library-mobile-reorder-title';
    title.textContent = 'Reorder Active Loredecks';
    header.appendChild(title);
    const done = createButton('Done', 'Close reorder mode and keep this active Loredeck order.', closeLoredeckLibraryMobileReorderSheet, 'saga-primary-button saga-loredeck-library-mobile-reorder-done');
    header.appendChild(done);
    sheet.appendChild(header);

    const list = document.createElement('div');
    list.className = 'saga-loredeck-library-mobile-reorder-list';
    activeRecords.forEach((record, index) => {
        const pack = packById.get(record.packId) || record.item;
        const row = document.createElement('div');
        row.className = 'saga-loredeck-library-mobile-reorder-row';
        row.dataset.packId = record.packId;
        row.dataset.stackIndex = String(record.index);

        const order = document.createElement('span');
        order.className = 'saga-loredeck-library-mobile-reorder-order';
        order.textContent = String(index + 1);
        order.setAttribute('aria-label', `Order ${index + 1}`);
        row.appendChild(order);

        const grip = document.createElement('span');
        grip.className = 'saga-loredeck-library-stack-grip saga-loredeck-library-mobile-reorder-grip';
        grip.style.setProperty('--saga-grip-dot-rows', '2');
        grip.setAttribute('aria-hidden', 'true');
        grip.innerHTML = '<span></span>';
        row.appendChild(grip);

        row.appendChild(createLoredeckDeckVisual(pack, 'saga-loredeck-library-mobile-reorder-visual', { usage: 'list' }));

        const main = document.createElement('div');
        main.className = 'saga-loredeck-library-mobile-reorder-main';
        const label = document.createElement('div');
        label.className = 'saga-loredeck-library-mobile-reorder-label';
        label.textContent = pack.title || record.packId;
        main.appendChild(label);
        const meta = document.createElement('div');
        meta.className = 'saga-loredeck-library-mobile-reorder-meta';
        meta.textContent = `${getLoredeckLibraryPackTypeLabel(pack)} | ${record.packId}`;
        main.appendChild(meta);
        row.appendChild(main);

        const controls = document.createElement('div');
        controls.className = 'saga-loredeck-library-mobile-reorder-controls';
        const up = createButton('Up', `Move ${pack.title || record.packId} earlier in the active Loredeck order.`, () => {
            moveLoredeckLibraryMobileReorderItem(record.packId, -1);
        }, 'saga-loredeck-library-small-button');
        up.disabled = index === 0;
        controls.appendChild(up);
        const down = createButton('Down', `Move ${pack.title || record.packId} later in the active Loredeck order.`, () => {
            moveLoredeckLibraryMobileReorderItem(record.packId, 1);
        }, 'saga-loredeck-library-small-button');
        down.disabled = index === activeRecords.length - 1;
        controls.appendChild(down);
        row.appendChild(controls);
        list.appendChild(row);
    });
    sheet.appendChild(list);
    backdrop.appendChild(sheet);
    return backdrop;
}

function openLoredeckLibraryMobileDetailSheet(packId = '') {
    const id = String(packId || '').trim();
    if (!id) return false;
    loredeckLibraryMobileDetailPackId = id;
    loredeckLibraryMobileDetailFolderId = '';
    loredeckLibrarySelectedFolderDetailsId = '';
    selectLoredeckForDetails(id, { refresh: false });
    renderLoredeckLibraryOverlay();
    return true;
}

function openLoredeckLibraryMobileFolderDetailSheet(folderId = '') {
    const id = String(folderId || '').trim();
    if (!id) return false;
    loredeckLibraryMobileDetailPackId = '';
    loredeckLibraryMobileDetailFolderId = id;
    loredeckLibrarySelectedFolderDetailsId = id;
    setLoredeckLibraryBulkSelection([], '');
    clearLoredeckLibrarySelection({ clearFolderDetails: false });
    renderLoredeckLibraryOverlay();
    return true;
}

function closeLoredeckLibraryMobileDetailSheet() {
    if (!loredeckLibraryMobileDetailPackId && !loredeckLibraryMobileDetailFolderId) return false;
    loredeckLibraryMobileDetailPackId = '';
    loredeckLibraryMobileDetailFolderId = '';
    renderLoredeckLibraryOverlay();
    return true;
}

function createLoredeckLibraryMobileDetailSheet(pack = null, stack = [], canonDb = null, health = null, libraryIndex = {}, library = []) {
    const backdrop = document.createElement('div');
    backdrop.className = 'saga-loredeck-library-mobile-detail-backdrop';
    backdrop.setAttribute('role', 'presentation');
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop) closeLoredeckLibraryMobileDetailSheet();
    });

    const sheet = document.createElement('div');
    sheet.className = 'saga-loredeck-library-mobile-detail-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', `${pack?.title || pack?.packId || 'Loredeck'} details`);
    sheet.addEventListener('click', event => event.stopPropagation());

    const header = document.createElement('div');
    header.className = 'saga-loredeck-library-mobile-detail-sheet-header';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-library-mobile-detail-sheet-title';
    title.textContent = pack?.title || pack?.packId || 'Loredeck Details';
    header.appendChild(title);
    const close = createButton('Close', 'Close Loredeck details.', closeLoredeckLibraryMobileDetailSheet, 'saga-loredeck-library-small-button');
    close.classList.add('saga-loredeck-library-mobile-detail-close');
    header.appendChild(close);
    sheet.appendChild(header);

    const details = createLoredeckLibraryDetailsPanel(pack, stack, canonDb, health, null, libraryIndex, library);
    details.classList.add('saga-loredeck-library-mobile-detail-panel');
    sheet.appendChild(details);
    backdrop.appendChild(sheet);
    return backdrop;
}

function createLoredeckLibraryMobileFolderDetailSheet(folder = null, stack = [], canonDb = null, health = null, libraryIndex = {}, library = []) {
    const backdrop = document.createElement('div');
    backdrop.className = 'saga-loredeck-library-mobile-detail-backdrop';
    backdrop.setAttribute('role', 'presentation');
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop) closeLoredeckLibraryMobileDetailSheet();
    });

    const sheet = document.createElement('div');
    sheet.className = 'saga-loredeck-library-mobile-detail-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', `${folder?.title || folder?.id || 'Folder'} details`);
    sheet.addEventListener('click', event => event.stopPropagation());

    const header = document.createElement('div');
    header.className = 'saga-loredeck-library-mobile-detail-sheet-header';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-library-mobile-detail-sheet-title';
    title.textContent = folder?.title || folder?.id || 'Folder Details';
    header.appendChild(title);
    const close = createButton('Close', 'Close folder details.', closeLoredeckLibraryMobileDetailSheet, 'saga-loredeck-library-small-button');
    close.classList.add('saga-loredeck-library-mobile-detail-close');
    header.appendChild(close);
    sheet.appendChild(header);

    const details = createLoredeckLibraryFolderDetailsPanel(folder, stack, canonDb, health, libraryIndex, library);
    details.classList.add('saga-loredeck-library-mobile-detail-panel');
    sheet.appendChild(details);
    backdrop.appendChild(sheet);
    return backdrop;
}

function toggleLoredeckLibraryMobileDeckActive(packId = '') {
    const id = String(packId || '').trim();
    if (!id) return false;
    setLoredeckLibraryBulkSelection([], '');
    const stack = getLoredeckStack(getState());
    const key = createLoredeckStackDeckKey(id);
    const existing = (stack || []).find(item => getLoredeckStackItemKey(item) === key);
    if (existing && existing.enabled !== false) return removeLoredecksFromStack([id]);
    return addLoredeckToStack(id);
}

function normalizeLoredeckLibrarySearchQuery() {
    return String(loredeckLibraryQuery || '').trim().toLowerCase();
}

function getLoredeckLibraryFolderSearchText(folder = {}, libraryIndex = {}) {
    const folderId = String(folder?.id || '').trim();
    const path = getFolderPath(folderId, libraryIndex);
    return [
        folderId,
        folder?.title,
        folder?.icon,
        folder?.color,
        path.join(' '),
        path.join(' > '),
    ].filter(Boolean).join(' ').toLowerCase();
}

function getLoredeckLibraryPackSearchText(pack = {}, libraryIndex = {}) {
    const folderId = getLoredeckLibraryPackFolderId(pack, libraryIndex);
    const folderPath = getFolderPath(folderId, libraryIndex);
    return [
        pack.packId,
        pack.title,
        pack.description,
        pack.fandom,
        pack.era,
        pack.author,
        pack.version,
        pack.manifest,
        getLoredeckLibraryPackTypeLabel(pack),
        folderId,
        folderPath.join(' '),
        folderPath.join(' > '),
        ...(Array.isArray(pack.tags) ? pack.tags : []),
        ...(Array.isArray(pack.library?.suggestedPath) ? pack.library.suggestedPath : []),
    ].filter(Boolean).join(' ').toLowerCase();
}

function getLoredeckLibraryFolderScopedDeckCount(folderId = '', scopedLibrary = [], libraryIndex = {}) {
    const id = String(folderId || '').trim();
    if (!id) return 0;
    let count = 0;
    for (const pack of scopedLibrary || []) {
        const packFolderId = getLoredeckLibraryPackFolderId(pack, libraryIndex);
        if (packFolderId && isLoredeckLibraryFolderDescendant(packFolderId, id, libraryIndex)) count += 1;
    }
    return count;
}

function getLoredeckLibraryPackFolderResolver(libraryIndex = {}) {
    const folderIds = new Set((libraryIndex.folders || []).map(folder => String(folder.id || '').trim()).filter(Boolean));
    const placementByDeckId = new Map();
    for (const placement of libraryIndex.deckPlacements || []) {
        const deckId = String(placement.deckId || placement.packId || '').trim();
        if (deckId && !placementByDeckId.has(deckId)) placementByDeckId.set(deckId, placement);
    }
    return pack => {
        const packId = String(pack?.packId || '').trim();
        if (!packId) return '';
        const placement = placementByDeckId.get(packId);
        const placedFolderId = String(placement?.folderId || '').trim();
        if (placedFolderId && folderIds.has(placedFolderId)) return placedFolderId;
        const explicitFolderId = String(pack?.library?.folderId || '').trim();
        if (explicitFolderId && folderIds.has(explicitFolderId)) return explicitFolderId;
        const suggestedFolderId = createFolderIdFromPath(pack?.library?.suggestedPath || []);
        return suggestedFolderId && folderIds.has(suggestedFolderId) ? suggestedFolderId : '';
    };
}

function buildLoredeckLibraryFolderRenderModel(library = [], libraryIndex = {}, stack = [], canonDb = null, health = null) {
    const folders = Array.isArray(libraryIndex.folders) ? libraryIndex.folders : [];
    const folderIds = new Set(folders.map(folder => String(folder.id || '').trim()).filter(Boolean));
    const parentByFolderId = new Map(folders.map(folder => [String(folder.id || '').trim(), String(folder.parentId || '').trim()]));
    const childFolderCountByFolderId = new Map();
    for (const folder of folders) {
        const parentId = String(folder.parentId || '').trim();
        childFolderCountByFolderId.set(parentId, (childFolderCountByFolderId.get(parentId) || 0) + 1);
    }

    const directPacksByFolderId = new Map();
    const nestedPacksByFolderId = new Map();
    const unfiledPacks = [];
    const folderIdForPack = getLoredeckLibraryPackFolderResolver(libraryIndex);

    const addPack = (map, folderId, pack) => {
        if (!map.has(folderId)) map.set(folderId, []);
        map.get(folderId).push(pack);
    };
    const addPackToAncestors = (folderId, pack) => {
        let currentId = folderId;
        const seen = new Set();
        while (currentId && folderIds.has(currentId) && !seen.has(currentId)) {
            seen.add(currentId);
            addPack(nestedPacksByFolderId, currentId, pack);
            currentId = parentByFolderId.get(currentId) || '';
        }
    };

    for (const pack of library || []) {
        const folderId = folderIdForPack(pack);
        if (folderId) {
            addPack(directPacksByFolderId, folderId, pack);
            addPackToAncestors(folderId, pack);
        } else {
            unfiledPacks.push(pack);
        }
    }

    const activeIds = new Set(resolveLoredeckStackItems((stack || []).filter(item => item.enabled !== false), libraryIndex, {
        packs: getLoredeckLibraryPackMap(library),
    }).stack.map(item => item.packId).filter(Boolean));
    const summarizePacks = (packs = [], childFolderCount = 0) => {
        let warningCount = 0;
        let errorCount = 0;
        let hasBundled = false;
        for (const pack of packs) {
            const info = getLoredeckLibraryPackHealthInfo(pack, canonDb, health);
            const tone = getLoredeckLibraryDisplayHealthTone(pack, info);
            if (tone === 'error') errorCount += 1;
            else if (['warning', 'unknown'].includes(tone)) warningCount += 1;
            if (pack?.type === 'bundled' || isBundledLoredeckLibraryPack(pack)) hasBundled = true;
        }
        return {
            deckCount: packs.length,
            activeCount: packs.filter(pack => activeIds.has(pack.packId)).length,
            warningCount,
            errorCount,
            childFolderCount,
            hasBundled,
        };
    };
    const summaryByFolderId = new Map();
    const coverPacksByFolderId = new Map();
    for (const folder of folders) {
        const folderId = String(folder.id || '').trim();
        const directPacks = directPacksByFolderId.get(folderId) || [];
        const nestedPacks = nestedPacksByFolderId.get(folderId) || [];
        summaryByFolderId.set(folderId, summarizePacks(nestedPacks, childFolderCountByFolderId.get(folderId) || 0));

        const directCoverIds = new Set();
        const directCovers = [];
        for (const pack of directPacks) {
            if (!getLoredeckLibraryCover(pack)) continue;
            directCoverIds.add(pack.packId);
            directCovers.push(pack);
        }
        const nestedCovers = nestedPacks
            .filter(pack => !directCoverIds.has(pack.packId) && getLoredeckLibraryCover(pack));
        coverPacksByFolderId.set(folderId, [...directCovers, ...nestedCovers].slice(0, LOREDECK_LIBRARY_FOLDER_COVER_MAX_VISIBLE));
    }

    return {
        activeIds,
        folderIds,
        folderIdForPack,
        directPacksByFolderId,
        nestedPacksByFolderId,
        unfiledPacks,
        getStats(folderId = '') {
            const id = String(folderId || '').trim();
            if (id === 'unfiled') {
                return summarizePacks(unfiledPacks, 0);
            }
            return summaryByFolderId.get(id) || {
                deckCount: 0,
                activeCount: 0,
                warningCount: 0,
                errorCount: 0,
                childFolderCount: childFolderCountByFolderId.get(id) || 0,
                hasBundled: false,
            };
        },
        getFolderPacks(folderId = '') {
            return nestedPacksByFolderId.get(String(folderId || '').trim()) || [];
        },
        getDirectPacks(folderId = '') {
            return directPacksByFolderId.get(String(folderId || '').trim()) || [];
        },
        getCoverPacks(folderId = '') {
            return coverPacksByFolderId.get(String(folderId || '').trim()) || [];
        },
    };
}

function getLoredeckLibraryFolderCollapsedStateFromRenderModel(folder = {}, renderModel = null, options = {}) {
    const id = String(folder?.id || folder || '').trim();
    if (!id || options.query) return false;
    if (loredeckLibraryExpandedFolderIds.has(id)) return false;
    if (loredeckLibraryCollapsedFolderIds.has(id)) return true;
    if (id === 'unfiled' || isLoredeckLibrarySpecialFolderId(id)) return false;
    const stats = renderModel?.getStats?.(id);
    return folder?.collapsed === true || stats?.hasBundled === true;
}

function getLoredeckLibraryHierarchySearchModel(scopedLibrary = [], visiblePacks = [], libraryIndex = {}, activeViewId = 'all') {
    const query = normalizeLoredeckLibrarySearchQuery();
    const visiblePackIds = new Set((visiblePacks || []).map(pack => pack.packId).filter(Boolean));
    const visibleFolderIds = new Set();
    const matchingFolderIds = new Set();
    const contextFolderIds = new Set();
    const folders = Array.isArray(libraryIndex?.folders) ? libraryIndex.folders : [];
    const byId = new Map(folders.map(folder => [folder.id, folder]));

    const includeFolderAndAncestors = (folderId = '', match = false) => {
        const id = String(folderId || '').trim();
        if (!id || !byId.has(id)) return;
        let current = byId.get(id);
        const seen = new Set();
        while (current && !seen.has(current.id)) {
            seen.add(current.id);
            visibleFolderIds.add(current.id);
            if (match && current.id === id) matchingFolderIds.add(current.id);
            else contextFolderIds.add(current.id);
            current = byId.get(current.parentId);
        }
    };

    for (const pack of visiblePacks || []) {
        includeFolderAndAncestors(getLoredeckLibraryPackFolderId(pack, libraryIndex), false);
    }

    if (query) {
        for (const folder of folders) {
            const folderMatches = getLoredeckLibraryFolderSearchText(folder, libraryIndex).includes(query);
            if (!folderMatches) continue;
            const scopedDeckCount = getLoredeckLibraryFolderScopedDeckCount(folder.id, scopedLibrary, libraryIndex);
            if (activeViewId !== 'all' && scopedDeckCount <= 0) continue;
            includeFolderAndAncestors(folder.id, true);
        }
    }

    return {
        query,
        visiblePackIds,
        visibleFolderIds,
        matchingFolderIds,
        contextFolderIds,
    };
}

function getLoredeckLibraryFolderSearchState(folderId = '', searchModel = {}) {
    const id = String(folderId || '').trim();
    if (!id || !searchModel?.query) return '';
    if (searchModel.matchingFolderIds?.has(id)) return 'match';
    if (searchModel.contextFolderIds?.has(id) || searchModel.visibleFolderIds?.has(id)) return 'context';
    return '';
}

function createLoredeckLibraryHierarchyRenderContext(visiblePacks = [], stack = [], canonDb = null, health = null, libraryIndex = {}, library = [], scopedLibrary = library, registry = getLoredeckLibraryRegistry(getState()), options = {}) {
    const query = String(loredeckLibraryQuery || '').trim();
    const activeViewId = getLoredeckLibraryActiveViewId();
    const folderIds = new Set((libraryIndex.folders || []).map(folder => folder.id));
    const renderModel = buildLoredeckLibraryFolderRenderModel(library, libraryIndex, stack, canonDb, health);
    const searchModel = getLoredeckLibraryHierarchySearchModel(scopedLibrary, visiblePacks, libraryIndex, activeViewId);
    const visibleByFolder = new Map();
    const unfiledPacks = [];

    const addPackToFolderMap = (map, pack, fallbackUnfiled) => {
        const folderId = renderModel.folderIdForPack(pack);
        if (folderId && folderIds.has(folderId)) {
            if (!map.has(folderId)) map.set(folderId, []);
            map.get(folderId).push(pack);
        } else if (fallbackUnfiled) {
            fallbackUnfiled.push(pack);
        }
    };

    for (const pack of visiblePacks || []) addPackToFolderMap(visibleByFolder, pack, unfiledPacks);

    return {
        visiblePacks,
        stack,
        canonDb,
        health,
        libraryIndex,
        library,
        scopedLibrary,
        registry,
        mobileTouch: options.mobileTouch === true,
        query,
        activeViewId,
        renderModel,
        searchModel,
        visibleByFolder,
        unfiledPacks,
        showEmptyFolders: !query && activeViewId === 'all',
    };
}

function createLoredeckLibraryHierarchyDeckCard(pack, depth = 0, renderContext = {}, visibleOrder = [], visibleIndex = null) {
    const index = visibleIndex === null ? visibleOrder.length : visibleIndex;
    if (visibleIndex === null) visibleOrder.push(pack);
    const stack = getLoredeckStack(getState());
    const card = createLoredeckLibraryDeckCard(pack, stack, renderContext.canonDb, renderContext.health, visibleOrder, index, {
        mobileTouch: renderContext.mobileTouch === true,
        mobileOrder: renderContext.mobileTouch ? (getLoredeckLibraryMobileOrderMap(stack).get(pack.packId) || 0) : 0,
    });
    const normalizedDepth = Math.max(0, Number(depth) || 0);
    card.classList.add('saga-loredeck-library-deck-card-nested');
    card.style.setProperty('--saga-folder-depth', String(normalizedDepth));
    card.dataset.folderDepth = String(normalizedDepth);
    return card;
}

function appendLoredeckLibraryHierarchyRow(target, createRow, renderContext) {
    if (target === renderContext.rowTarget) renderContext.rowFactories.push(createRow);
    else target.appendChild(createRow());
}

function appendLoredeckLibraryHierarchyDeckCard(target, pack, depth, renderContext, visibleOrder) {
    const index = visibleOrder.length;
    visibleOrder.push(pack);
    appendLoredeckLibraryHierarchyRow(target,
        () => createLoredeckLibraryHierarchyDeckCard(pack, depth, renderContext, visibleOrder, index), renderContext);
}

function appendLoredeckLibraryFolderBranch(target, folder = {}, depth = 0, renderContext = {}, visibleOrder = []) {
    const folderId = String(folder?.id || '').trim();
    if (!folderId) return;
    const visibleDirect = sortLoredeckLibraryFolderPacks(renderContext.visibleByFolder?.get(folderId) || [], { registry: renderContext.registry });
    const searchState = getLoredeckLibraryFolderSearchState(folderId, renderContext.searchModel);
    const shouldRender = renderContext.showEmptyFolders || renderContext.searchModel?.visibleFolderIds?.has(folderId);
    if (!shouldRender) return;

    const normalizedDepth = Math.max(0, Number(depth) || 0);
    const folderAllPacks = renderContext.renderModel?.getFolderPacks?.(folderId) || [];
    const stats = renderContext.renderModel?.getStats?.(folderId) || {};
    const collapsed = getLoredeckLibraryFolderCollapsedStateFromRenderModel(folder, renderContext.renderModel, { query: renderContext.query });
    const rowOptions = {
        depth: normalizedDepth,
        collapsed,
        stats,
        searchState,
        libraryIndex: renderContext.libraryIndex,
        mobileTouch: renderContext.mobileTouch === true,
        coverPacks: renderContext.renderModel?.getCoverPacks?.(folderId) || [],
        totalCoverableCount: folderAllPacks.filter(getLoredeckLibraryCover).length,
    };
    appendLoredeckLibraryHierarchyRow(target, () => createLoredeckLibraryInlineFolderRow(folder, rowOptions), renderContext);

    if (collapsed) return;
    appendLoredeckLibraryFolderContents(target, folder, normalizedDepth + 1, renderContext, visibleOrder, visibleDirect);
}

function appendLoredeckLibraryFolderContents(target, folder = {}, depth = 0, renderContext = {}, visibleOrder = [], visibleDirectOverride = null) {
    const folderId = String(folder?.id || '').trim();
    if (!folderId) return;
    for (const child of folder.children || []) appendLoredeckLibraryFolderBranch(target, child, depth, renderContext, visibleOrder);
    const visibleDirect = Array.isArray(visibleDirectOverride)
        ? visibleDirectOverride
        : sortLoredeckLibraryFolderPacks(renderContext.visibleByFolder?.get(folderId) || [], { registry: renderContext.registry });
    for (const pack of visibleDirect) appendLoredeckLibraryHierarchyDeckCard(target, pack, depth, renderContext, visibleOrder);
}

function createLoredeckLibraryHierarchyList(visiblePacks = [], stack = [], canonDb = null, health = null, libraryIndex = {}, library = [], scopedLibrary = library, registry = getLoredeckLibraryRegistry(getState()), options = {}) {
    const list = document.createElement('div');
    list.className = `saga-loredeck-library-deck-list saga-loredeck-library-hierarchy-list${options.mobileTouch === true ? ' saga-loredeck-library-mobile-list' : ''}`;
    markTourTarget(list, 'loredecks.library.list');
    const renderContext = createLoredeckLibraryHierarchyRenderContext(visiblePacks, stack, canonDb, health, libraryIndex, library, scopedLibrary, registry, options);
    loredeckLibraryHierarchyRenderCache = renderContext;
    list.__sagaLoredeckLibraryRenderContext = renderContext;
    const visibleOrder = [];
    renderContext.rowTarget = list;
    renderContext.rowFactories = [];
    list.__sagaLoredeckLibraryVisibleOrder = visibleOrder;

    const folders = sortLoredeckLibraryFolderTreeByTitle(buildFolderTree(libraryIndex));
    for (const folder of folders) appendLoredeckLibraryFolderBranch(list, folder, 0, renderContext, visibleOrder);

    const unfiledVisible = sortLoredeckLibraryPacks(
        renderContext.unfiledPacks.length ? renderContext.unfiledPacks : (renderContext.showEmptyFolders ? renderContext.renderModel.unfiledPacks : []),
        { sortMode: 'name', registry: renderContext.registry }
    );
    for (const pack of unfiledVisible) appendLoredeckLibraryHierarchyDeckCard(list, pack, 0, renderContext, visibleOrder);

    const rows = renderContext.rowFactories;
    delete renderContext.rowTarget;
    delete renderContext.rowFactories;
    renderLoredeckLibraryRows(list, rows, withLoredeckLibraryRenderSnapshot);
    if (!rows.length) {
        list.appendChild(createEmptyMessage('No Loredecks match the current Library view or search.'));
    }
    return list;
}

export function getLoredeckLibraryFolderPacks(folderId = '', library = [], libraryIndex = {}, options = {}) {
    const ids = new Set(getLoredeckLibraryFolderDeckIds(folderId, libraryIndex, { includeNested: options.includeNested !== false }));
    return (library || []).filter(pack => ids.has(pack.packId));
}

function getLoredeckLibraryFolderCoverPacks(folderId = '', library = [], libraryIndex = {}) {
    const folderIds = new Set((libraryIndex.folders || []).map(folder => folder.id));
    const direct = [];
    const nested = [];
    for (const pack of library || []) {
        const packFolderId = getLoredeckLibraryPackFolderId(pack, libraryIndex);
        if (!packFolderId || !folderIds.has(packFolderId) || !getLoredeckLibraryCover(pack)) continue;
        if (packFolderId === folderId) direct.push(pack);
        else if (isLoredeckLibraryFolderDescendant(packFolderId, folderId, libraryIndex)) nested.push(pack);
    }
    return [...direct, ...nested].slice(0, LOREDECK_LIBRARY_FOLDER_COVER_MAX_VISIBLE);
}

export function normalizeLoredeckLibraryInlineTitle(value = '', maxLength = 160) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength).trim();
}

function isEditableLoredeckLibraryPack(pack = {}) {
    return !!pack?.packId && !isBundledLoredeckLibraryPack(pack);
}

function renameLoredeckLibraryDeckTitle(packId = '', title = '') {
    const id = String(packId || '').trim();
    const cleanTitle = normalizeLoredeckLibraryInlineTitle(title, 160);
    if (!id || !cleanTitle) {
        toast('Loredeck title is required.', 'warning');
        return false;
    }
    const pack = getFreshLoredeckLibraryPack(id);
    if (!pack) {
        toast('That Loredeck is no longer available.', 'warning');
        return false;
    }
    if (!isEditableLoredeckLibraryPack(pack)) {
        toast('Bundled Loredecks are read-only. Duplicate as Custom first.', 'warning');
        return false;
    }
    if (normalizeLoredeckLibraryInlineTitle(pack.title || pack.packId, 160) === cleanTitle) return true;
    return persistLoredeckLibraryRecordMutation(pack, next => {
        next.title = cleanTitle;
        if (next.manifestData && typeof next.manifestData === 'object' && !Array.isArray(next.manifestData)) {
            next.manifestData = {
                ...next.manifestData,
                title: cleanTitle,
                name: cleanTitle,
            };
        }
        if (isGeneratedLoredeckPack(next)) refreshGeneratedLoredeckDerivedMetadata(next);
    }, '');
}

export function createLoredeckLibraryEditableTitle(options = {}) {
    const value = normalizeLoredeckLibraryInlineTitle(options.value || options.fallback || '', 180) || 'Untitled';
    const kind = String(options.kind || 'title').trim() || 'title';
    const editable = options.editable === true && typeof options.onCommit === 'function';
    const longPressOnly = editable && options.longPressOnly === true;
    const wrap = document.createElement('span');
    wrap.className = `${options.className || ''} saga-loredeck-library-inline-title${editable ? ' saga-loredeck-library-inline-title-editable' : ''}${longPressOnly ? ' saga-loredeck-library-inline-title-longpress' : ''}`.trim();

    let label = document.createElement('span');
    label.className = 'saga-loredeck-library-inline-title-label';
    label.textContent = value;
    wrap.appendChild(label);
    if (!editable) return wrap;

    const action = longPressOnly ? null : document.createElement('button');
    if (action) {
        action.type = 'button';
        action.className = 'saga-loredeck-library-title-edit-action saga-loredeck-library-title-edit-mark';
        addTooltip(action, `Rename ${kind}.`);
        wrap.appendChild(action);
    } else {
        wrap.tabIndex = 0;
        wrap.setAttribute('role', 'button');
        wrap.setAttribute('aria-label', `Long-press to rename ${kind}.`);
        addTooltip(wrap, `Long-press to rename ${kind}.`);
    }

    let editing = false;
    let input = null;
    const stop = e => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
    };
    const endEditing = nextTitle => {
        editing = false;
        wrap.classList.remove('saga-loredeck-library-inline-title-editing');
        if (action) {
            action.classList.remove('saga-loredeck-library-title-edit-accept');
            action.classList.add('saga-loredeck-library-title-edit-mark');
            action.dataset.sagaTooltip = `Rename ${kind}.`;
            action.setAttribute('aria-label', `Rename ${kind}.`);
        }
        const nextLabel = document.createElement('span');
        nextLabel.className = 'saga-loredeck-library-inline-title-label';
        nextLabel.textContent = normalizeLoredeckLibraryInlineTitle(nextTitle || value, 180) || value;
        if (input?.parentNode) input.replaceWith(nextLabel);
        else if (label?.parentNode) label.replaceWith(nextLabel);
        label = nextLabel;
        input = null;
    };
    const commitEditing = e => {
        if (e) stop(e);
        if (!editing || !input) return;
        const nextTitle = normalizeLoredeckLibraryInlineTitle(input.value, 160);
        if (!nextTitle) {
            toast(`${kind.charAt(0).toUpperCase()}${kind.slice(1)} title is required.`, 'warning');
            input.focus();
            return;
        }
        if (nextTitle === normalizeLoredeckLibraryInlineTitle(label.textContent || value, 160)) {
            endEditing(nextTitle);
            return;
        }
        const saved = options.onCommit(nextTitle);
        if (saved !== false) endEditing(nextTitle);
        else input.focus();
    };
    const startEditing = e => {
        stop(e);
        if (editing) return;
        editing = true;
        hideFloatingTooltip();
        wrap.classList.add('saga-loredeck-library-inline-title-editing');
        if (action) {
            action.classList.remove('saga-loredeck-library-title-edit-mark');
            action.classList.add('saga-loredeck-library-title-edit-accept');
            action.dataset.sagaTooltip = `Save ${kind} title.`;
            action.setAttribute('aria-label', `Save ${kind} title.`);
        }
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'text_pole saga-loredeck-library-title-input';
        input.value = label.textContent || value;
        input.setAttribute('aria-label', `${kind} title`);
        input.addEventListener('click', e => e.stopPropagation());
        input.addEventListener('dblclick', e => e.stopPropagation());
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                commitEditing();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                endEditing(label.textContent || value);
            } else {
                e.stopPropagation();
            }
        });
        if (longPressOnly) {
            input.addEventListener('blur', () => {
                if (editing) commitEditing();
            });
        }
        label.replaceWith(input);
        requestAnimationFrame(() => {
            input?.focus();
            input?.select();
        });
    };
    if (action) {
        action.addEventListener('click', e => {
            if (editing) commitEditing(e);
            else startEditing(e);
        });
        action.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (editing) commitEditing(e);
                else startEditing(e);
            }
        });
    } else {
        attachLoredeckLibraryLongPressAction(wrap, startEditing);
        wrap.addEventListener('keydown', e => {
            if (editing || (e.key !== 'Enter' && e.key !== ' ')) return;
            startEditing(e);
        });
    }
    return wrap;
}

function attachLoredeckLibraryLongPressAction(target, handler, options = {}) {
    if (!target || typeof handler !== 'function') return target;
    const delay = Math.max(240, Number(options.delayMs) || LOREDECK_LIBRARY_LONG_PRESS_MS);
    const triggerOnRelease = options.triggerOnRelease === true;
    const ignoreSelector = options.ignoreSelector || 'button, input, select, textarea, label, a, [contenteditable="true"], [contenteditable="plaintext-only"]';
    let timer = null;
    let fired = false;
    let releasePending = false;
    const clear = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        releasePending = false;
        target.classList?.remove?.('saga-longpress-armed');
    };
    target.addEventListener('pointerdown', event => {
        if (event.target?.closest?.(ignoreSelector)) return;
        fired = false;
        releasePending = false;
        clear();
        target.classList?.add?.('saga-longpress-armed');
        timer = setTimeout(() => {
            fired = true;
            if (triggerOnRelease) {
                timer = null;
                releasePending = true;
                return;
            }
            clear();
            event.preventDefault?.();
            event.stopPropagation?.();
            hideFloatingTooltip();
            handler(event);
        }, delay);
    });
    target.addEventListener('pointerup', event => {
        const shouldTrigger = releasePending;
        clear();
        if (!shouldTrigger) return;
        event.preventDefault?.();
        event.stopPropagation?.();
        hideFloatingTooltip();
        handler(event);
    });
    target.addEventListener('pointerleave', clear);
    target.addEventListener('pointercancel', clear);
    target.addEventListener('click', event => {
        if (!fired) return;
        fired = false;
        event.preventDefault();
        event.stopPropagation();
    });
    target.addEventListener('contextmenu', event => {
        if (event.target?.closest?.(ignoreSelector)) return;
        event.preventDefault();
        event.stopPropagation();
        clear();
        hideFloatingTooltip();
        handler(event);
    });
    return target;
}

function createLoredeckLibraryInlineFolderRow(folder = {}, options = {}) {
    const folderId = String(folder.id || '').trim();
    const collapsed = options.collapsed === true;
    const stats = options.stats || {};
    const depth = Math.max(0, Number(options.depth) || 0);
    const searchState = String(options.searchState || '').trim();
    const mobileTouch = options.mobileTouch === true;
    const row = document.createElement('div');
    row.className = `saga-loredeck-library-inline-folder-row${loredeckLibrarySelectedFolderDetailsId === folderId ? ' saga-loredeck-library-folder-row-active' : ''}${options.special ? ' saga-loredeck-library-folder-row-special' : ''}`.trim();
    row.classList.add('saga-loredeck-library-folder-row-drop-enabled');
    if (mobileTouch) row.classList.add('saga-loredeck-library-folder-mobile-touch');
    if (searchState === 'match') row.classList.add('saga-loredeck-library-search-match');
    else if (searchState === 'context') row.classList.add('saga-loredeck-library-search-context');
    row.style.setProperty('--saga-folder-depth', String(depth));
    row.dataset.folderId = folderId;
    row.dataset.folderParentId = String(folder.parentId || '').trim();
    row.dataset.folderDropTarget = 'true';
    row.dataset.folderSpecial = options.special ? 'true' : 'false';
    row.dataset.folderDepth = String(depth);
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    if (loredeckLibrarySelectedFolderDetailsId === folderId) row.setAttribute('aria-current', 'true');
    addTooltip(row, options.special ? 'System Library section.' : (getFolderPath(folderId, options.libraryIndex || {}).join(' > ') || folder.title || 'Folder'));
    const selectFolder = () => {
        loredeckLibrarySelectedFolderDetailsId = folderId || '';
        setLoredeckLibraryBulkSelection([], '');
        clearLoredeckLibrarySelection({ clearFolderDetails: false });
        scheduleLoredeckLibrarySelectionSurfaceRefresh();
    };
    const getCurrentCollapsed = () => row.getAttribute('aria-expanded') !== 'true';
    let mobileLongPressTimer = null;
    let mobileLongPressFired = false;
    const mobileInteractiveSelector = 'button, input, select, textarea, label, a';
    if (mobileTouch) {
        const clearLongPressTimer = () => {
            if (mobileLongPressTimer) {
                clearTimeout(mobileLongPressTimer);
                mobileLongPressTimer = null;
            }
        };
        row.addEventListener('pointerdown', e => {
            if (e.target?.closest?.(mobileInteractiveSelector)) return;
            mobileLongPressFired = false;
            clearLongPressTimer();
            mobileLongPressTimer = setTimeout(() => {
                mobileLongPressFired = true;
                openLoredeckLibraryMobileFolderDetailSheet(folderId);
            }, 520);
        });
        row.addEventListener('pointerup', clearLongPressTimer);
        row.addEventListener('pointerleave', clearLongPressTimer);
        row.addEventListener('pointercancel', clearLongPressTimer);
        row.addEventListener('contextmenu', e => {
            if (e.target?.closest?.(mobileInteractiveSelector)) return;
            e.preventDefault();
            e.stopPropagation();
            clearLongPressTimer();
            openLoredeckLibraryMobileFolderDetailSheet(folderId);
        });
    }
    row.addEventListener('click', e => {
        e.stopPropagation();
        if (mobileTouch) {
            if (mobileLongPressFired) {
                mobileLongPressFired = false;
                return;
            }
            if (e.target?.closest?.(mobileInteractiveSelector)) return;
            selectFolder();
            toggleLoredeckLibraryFolderCollapsed(folderId, getCurrentCollapsed());
            return;
        }
        selectFolder();
    });
    row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (mobileTouch) {
                if (e.key === 'Enter') {
                    openLoredeckLibraryMobileFolderDetailSheet(folderId);
                    return;
                }
                selectFolder();
                toggleLoredeckLibraryFolderCollapsed(folderId, getCurrentCollapsed());
                return;
            }
            selectFolder();
        } else if (e.key === 'ArrowRight' && getCurrentCollapsed()) {
            e.preventDefault();
            toggleLoredeckLibraryFolderCollapsed(folderId, null);
        } else if (e.key === 'ArrowLeft' && !getCurrentCollapsed()) {
            e.preventDefault();
            toggleLoredeckLibraryFolderCollapsed(folderId, null);
        }
    });

    if (!mobileTouch) {
        const grip = document.createElement('span');
        grip.className = 'saga-loredeck-library-stack-grip saga-loredeck-library-folder-grip';
        grip.style.setProperty('--saga-grip-dot-rows', String(Math.max(3, 6 - depth)));
        grip.setAttribute('aria-hidden', 'true');
        grip.innerHTML = '<span></span>';
        grip.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
        });
        grip.addEventListener('pointerdown', e => {
            startLoredeckLibraryFolderDrag(e, folderId);
        });
        row.appendChild(grip);
    }

    const disclosure = document.createElement('button');
    disclosure.type = 'button';
    disclosure.className = 'saga-loredeck-library-folder-disclosure';
    disclosure.textContent = collapsed ? '>' : 'v';
    disclosure.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${folder.title || 'folder'}`);
    addTooltip(disclosure, collapsed ? 'Expand folder.' : 'Collapse folder.');
    markTourTarget(disclosure, 'loredecks.library.folderDisclosure');
    disclosure.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        toggleLoredeckLibraryFolderCollapsed(folderId, null);
    });
    row.appendChild(disclosure);

    const main = document.createElement('div');
    main.className = 'saga-loredeck-library-folder-main';
    const top = document.createElement('div');
    top.className = 'saga-loredeck-library-folder-topline';
    top.appendChild(createLoredeckLibraryEditableTitle({
        value: folder.title || folderId || 'Folder',
        fallback: folderId || 'Folder',
        className: 'saga-loredeck-library-folder-label',
        editable: !mobileTouch && !options.special && !!folderId && folderId !== 'unfiled',
        kind: 'folder',
        onCommit: title => {
            const renamed = renameLoredeckLibraryFolder(folderId, title);
            if (renamed) renderLoredeckLibraryOverlay();
            return renamed;
        },
    }));
    const meta = document.createElement('div');
    meta.className = 'saga-loredeck-row-meta saga-loredeck-library-folder-meta';
    meta.appendChild(createStatusPill(`${stats.deckCount || 0} deck${(stats.deckCount || 0) === 1 ? '' : 's'}`, 'Nested Loredecks in this folder.', { kind: 'count' }));
    if (stats.childFolderCount) meta.appendChild(createStatusPill(`${stats.childFolderCount} folder${stats.childFolderCount === 1 ? '' : 's'}`, 'Direct child folders.', { kind: 'count' }));
    if (searchState === 'match') meta.appendChild(createStatusPill('Folder match', 'This folder title or path matches the Library search.', { tone: 'selected', kind: 'status' }));
    else if (searchState === 'context') meta.appendChild(createStatusPill('Context', 'Shown to preserve the matching Loredeck hierarchy.', { tone: 'info', kind: 'status' }));
    if (stats.errorCount) meta.appendChild(createStatusPill(`${stats.errorCount} error${stats.errorCount === 1 ? '' : 's'}`, 'Nested Pack Health errors.', { tone: 'danger', kind: 'severity' }));
    else if (stats.warningCount) meta.appendChild(createStatusPill(`${stats.warningCount} warning${stats.warningCount === 1 ? '' : 's'}`, 'Nested Pack Health warnings.', { tone: 'warning', kind: 'severity' }));
    top.appendChild(meta);
    main.appendChild(top);
    main.appendChild(createLoredeckLibraryFolderCoverStrip(options.coverPacks || [], Number(options.totalCoverableCount) || 0));
    row.appendChild(main);
    return row;
}

function toggleLoredeckLibraryFolderCollapsed(folderId = '', currentCollapsed = null) {
    const id = String(folderId || '').trim();
    if (!id) return;
    const collapsed = currentCollapsed === null
        ? getLoredeckLibraryFolderCollapsedState(id, getLoredeckLibrary(getState()), getLoredeckLibraryIndexForPacks())
        : currentCollapsed === true;
    const collapsedIds = new Set(loredeckLibraryCollapsedFolderIds);
    const expandedIds = new Set(loredeckLibraryExpandedFolderIds);
    if (collapsed) {
        collapsedIds.delete(id);
        expandedIds.add(id);
    } else {
        expandedIds.delete(id);
        collapsedIds.add(id);
    }
    loredeckLibraryCollapsedFolderIds = collapsedIds;
    loredeckLibraryExpandedFolderIds = expandedIds;
    updateLoredeckLibraryFolderDisclosureDom(id, !collapsed);
    if (!refreshLoredeckLibraryFolderSubtree(id, collapsed)) scheduleLoredeckLibraryHierarchyRefresh();
}

function createLoredeckLibraryFolderCoverStrip(coverPacks = [], totalCoverableCount = 0) {
    const strip = document.createElement('div');
    strip.className = 'saga-loredeck-library-folder-cover-strip';
    const covers = [];
    for (const pack of coverPacks || []) {
        const cover = getLoredeckLibraryCover(pack);
        if (!cover) continue;
        covers.push({ pack, cover });
        if (covers.length === LOREDECK_LIBRARY_FOLDER_COVER_MAX_VISIBLE) break;
    }
    strip.dataset.totalCovers = String(Math.max(Number(totalCoverableCount) || 0, covers.length));
    if (!covers.length) {
        const fallback = document.createElement('span');
        fallback.className = 'saga-loredeck-library-folder-cover-empty';
        fallback.textContent = 'No covers';
        strip.appendChild(fallback);
        return strip;
    }
    covers.forEach(({ pack, cover }, index) => {
        const tile = document.createElement('span');
        tile.className = 'saga-loredeck-library-folder-cover-tile';
        if (cover.fit === 'contain') tile.classList.add('saga-loredeck-library-folder-cover-tile-contain');
        tile.style.setProperty('--saga-cover-index', String(index));
        tile.dataset.coverTile = 'true';
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        if (cover.focalPoint) {
            img.style.objectPosition = `${Math.round(cover.focalPoint.x * 100)}% ${Math.round(cover.focalPoint.y * 100)}%`;
        }
        tile.appendChild(img);
        bindLoredeckCoverImage(tile, img, pack, {
            usage: 'list',
            resolvedCover: cover,
            onOriginalError() {
                tile.classList.remove('saga-loredeck-library-folder-cover-tile-contain');
                tile.replaceChildren();
                tile.textContent = getLoredeckMonogram(pack);
            },
        });
        addTooltip(tile, pack.title || pack.packId || 'Loredeck cover');
        strip.appendChild(tile);
    });
    const more = document.createElement('span');
    more.className = 'saga-loredeck-library-folder-cover-tile saga-loredeck-library-folder-cover-more';
    more.dataset.coverMore = 'true';
    const hiddenCount = Math.max(0, Number(strip.dataset.totalCovers) - covers.length);
    more.hidden = hiddenCount <= 0;
    if (hiddenCount > 0) more.textContent = `+${hiddenCount}`;
    strip.appendChild(more);
    return strip;
}

function createLoredeckLibrarySelectionToolbar(visiblePacks = [], libraryIndex = getLoredeckLibraryIndexForPacks()) {
    const toolbar = document.createElement('div');
    toolbar.className = 'saga-loredeck-library-selection-toolbar';
    const selectedIds = getLoredeckLibraryBulkSelectedIds();
    const selectedVisibleCount = visiblePacks.filter(pack => selectedIds.includes(pack.packId)).length;
    toolbar.appendChild(createLoredeckSelectionSummary({
        className: 'saga-loredeck-library-selection-summary',
        selectedCount: selectedIds.length,
        visibleSelectedCount: selectedVisibleCount,
        tooltip: 'Use click for single selection, Ctrl/Cmd-click to toggle a deck, and Shift-click to select a visible range.',
    }));

    const selectVisible = createButton('Select Visible', 'Select every Loredeck currently shown by the active search and filters.', () => {
        setLoredeckLibraryBulkSelection(visiblePacks.map(pack => pack.packId), visiblePacks[0]?.packId || '');
        renderLoredeckLibraryOverlay();
    }, 'saga-loredeck-library-small-button');
    selectVisible.disabled = !visiblePacks.length;
    toolbar.appendChild(selectVisible);

    const clear = createButton('Clear', 'Clear the current bulk Loredeck selection.', () => {
        setLoredeckLibraryBulkSelection([], '');
        renderLoredeckLibraryOverlay();
    }, 'saga-loredeck-library-small-button');
    clear.disabled = !selectedIds.length;
    toolbar.appendChild(clear);

    if (!isBasicExperienceMode()) {
        const exportButton = createButton('Export Selected', 'Export selected Loredecks as one .saga-loredeck.zip package.', async (btn) => {
            const library = getLoredeckLibrary(getState());
            const packs = getLoredeckLibraryBulkSelectedIds(library).map(id => library.find(pack => pack.packId === id)).filter(Boolean);
            await exportSelectedLoredeckBundles(packs, btn);
        }, 'saga-loredeck-library-small-button');
        exportButton.disabled = !selectedIds.length;
        toolbar.appendChild(exportButton);
    }

    const moveOptions = getLoredeckLibraryFolderMoveOptions(libraryIndex);
    const preferredFolderId = !isLoredeckLibrarySpecialFolderId(loredeckLibrarySelectedFolderDetailsId)
        ? loredeckLibrarySelectedFolderDetailsId
        : (!isLoredeckLibrarySpecialFolderId(loredeckLibrarySelectedFolderId) ? loredeckLibrarySelectedFolderId : 'unfiled');
    const moveSelectValue = preferredFolderId && moveOptions.some(([value]) => String(value || '') === preferredFolderId)
        ? preferredFolderId
        : 'unfiled';
    const moveSelect = createLoredeckSelectControl({
        className: 'text_pole saga-loredeck-library-folder-move-select',
        disabled: !selectedIds.length,
        tooltip: 'Choose a folder target for selected Loredecks.',
        options: moveOptions,
        value: moveSelectValue,
        fallbackValue: 'unfiled',
    });
    toolbar.appendChild(moveSelect);

    const moveButton = createButton('Move', selectedIds.length ? 'Move selected Loredecks to the chosen folder.' : 'Select Loredecks before moving them to a folder.', () => {
        if (!selectedIds.length) return;
        if (moveLoredecksToLibraryFolder(selectedIds, moveSelect.value || 'unfiled')) scheduleLoredeckLibraryOverlayRefresh();
    }, 'saga-loredeck-library-small-button');
    moveButton.disabled = !selectedIds.length;
    toolbar.appendChild(moveButton);
    return toolbar;
}

function getLoredeckLibraryFolderMoveOptions(libraryIndex = getLoredeckLibraryIndexForPacks()) {
    const options = [['unfiled', 'Move to: Unfiled']];

    const appendFolder = (folder, depth = 0) => {
        options.push([folder.id, `${'\u00a0\u00a0'.repeat(Math.max(0, depth))}${folder.title || folder.id}`]);
        for (const child of folder.children || []) appendFolder(child, depth + 1);
    };
    for (const folder of buildFolderTree(libraryIndex)) appendFolder(folder, 0);
    return options;
}

function getLoredeckLibraryFolderParentOptions(movingFolderId = '', libraryIndex = getLoredeckLibraryIndexForPacks()) {
    const movingId = String(movingFolderId || '').trim();
    const options = [['', 'Move folder to: Library root']];

    const appendFolder = (folder, depth = 0) => {
        if (!folder?.id) return;
        if (isLoredeckLibraryFolderDescendant(folder.id, movingId, libraryIndex)) return;
        options.push([folder.id, `${'\u00a0\u00a0'.repeat(Math.max(0, depth))}${folder.title || folder.id}`]);
        for (const child of folder.children || []) appendFolder(child, depth + 1);
    };
    for (const folder of buildFolderTree(libraryIndex)) appendFolder(folder, 0);
    return options;
}

function getLoredeckLibraryTransferActionModel(options = {}) {
    const selectedPack = options.selectedPack || null;
    const filteredPacks = Array.isArray(options.filteredPacks) ? options.filteredPacks : [];
    const stack = Array.isArray(options.stack) ? options.stack : [];
    const selectedPacks = Array.isArray(options.selectedPacks) ? options.selectedPacks : [];
    const selectedFolder = options.selectedFolder || null;
    const libraryIndex = options.libraryIndex || getLoredeckLibraryIndexForPacks();
    const library = Array.isArray(options.library) ? options.library : getLoredeckLibrary(getState());
    const selectedId = selectedPack?.packId || '';
    const actionFolderId = String(selectedFolder?.id || '').trim();
    const hasSelectedFolderDetails = !!actionFolderId;
    const actionFolder = actionFolderId && !isLoredeckLibrarySpecialFolderId(actionFolderId)
        ? (libraryIndex.folders || []).find(folder => folder.id === actionFolderId)
        : null;
    const selectedActionFolder = actionFolder && !isLoredeckLibrarySpecialFolderId(actionFolder.id) ? actionFolder : null;
    const selectedFolderStackKey = selectedActionFolder ? createLoredeckStackFolderKey(selectedActionFolder.id) : '';
    const selectedFolderStackItem = selectedFolderStackKey
        ? stack.find(item => getLoredeckStackItemKey(item) === selectedFolderStackKey)
        : null;
    const resolvedStackIds = new Set(resolveLoredeckStackItems(stack, libraryIndex, {
        packs: getLoredeckLibraryPackMap(library),
    }).stack.map(item => item.packId).filter(Boolean));
    const selectedIds = hasSelectedFolderDetails ? [] : selectedPacks.map(pack => pack.packId).filter(Boolean);
    const actionIds = selectedIds.length ? selectedIds : (!hasSelectedFolderDetails && selectedId ? [selectedId] : []);
    const selectedStackItems = actionIds.filter(packId => resolvedStackIds.has(packId));
    const inactiveMatches = filteredPacks.filter(pack => !resolvedStackIds.has(pack.packId));
    const canAddFolder = !!selectedActionFolder && (!selectedFolderStackItem || selectedFolderStackItem.enabled === false);
    const canRemoveFolder = !!selectedActionFolder && !!selectedFolderStackItem;
    const addLabel = selectedActionFolder
        ? (selectedFolderStackItem
            ? (selectedFolderStackItem.enabled === false ? 'Enable Folder >' : 'Folder in Stack')
            : 'Add Folder to Stack >')
        : (actionIds.length > 1 ? `Add Selected (${actionIds.length}) >` : 'Add to Stack >');
    const addTooltip = selectedActionFolder
        ? (canAddFolder
            ? 'Add or enable this folder group in the active stack.'
            : 'This folder group is already active in the stack.')
        : (actionIds.length
            ? 'Add or enable the selected Loredeck selection in the active stack.'
            : 'Select one or more Loredecks before adding them to the stack.');
    const removeLabel = selectedActionFolder
        ? '< Remove from Stack'
        : (actionIds.length > 1 ? `< Remove Selected (${selectedStackItems.length})` : '< Remove from Stack');
    const removeTooltip = selectedActionFolder
        ? (canRemoveFolder
            ? 'Remove this folder group from the active stack.'
            : 'This folder group is not in the active stack.')
        : (actionIds.length
            ? 'Remove selected Loredecks from the active stack.'
            : 'Select an active Loredeck before removing it.');

    return {
        selectedActionFolder,
        hasSelectedFolderDetails,
        selectedIds,
        actionIds,
        selectedStackItems,
        inactiveMatches,
        selectedFolderStackKey: canRemoveFolder ? selectedFolderStackKey : '',
        canAddFolder,
        canRemoveFolder,
        addLabel,
        addTooltip,
        addDisabled: selectedActionFolder
            ? !canAddFolder
            : (!actionIds.length || actionIds.every(packId => resolvedStackIds.has(packId))),
        removeLabel,
        removeTooltip,
        removeDisabled: selectedActionFolder ? !canRemoveFolder : !selectedStackItems.length,
    };
}

function createLoredeckLibraryTransferPane(selectedPack = null, filteredPacks = [], stack = [], selectedPacks = [], selectedFolder = null, libraryIndex = getLoredeckLibraryIndexForPacks(), library = getLoredeckLibrary(getState())) {
    const pane = document.createElement('div');
    pane.className = 'saga-loredeck-library-transfer-pane';
    markTourTarget(pane, 'loredecks.library.transfer');
    const actionModel = getLoredeckLibraryTransferActionModel({
        selectedPack,
        filteredPacks,
        stack,
        selectedPacks,
        selectedFolder,
        libraryIndex,
        library,
    });

    const flow = document.createElement('div');
    flow.className = 'saga-loredeck-library-transfer-flow';

    const add = createButton(actionModel.addLabel, actionModel.addTooltip, () => {
        if (actionModel.selectedActionFolder) {
            if (!actionModel.canAddFolder) return;
            addLoredeckFolderToStack(actionModel.selectedActionFolder.id, libraryIndex);
            return;
        }
        if (!actionModel.actionIds.length) return;
        addLoredecksToStack(actionModel.actionIds);
    }, 'saga-primary-button saga-loredeck-library-transfer-button');
    add.disabled = actionModel.addDisabled;
    flow.appendChild(add);

    const remove = createButton(actionModel.removeLabel, actionModel.removeTooltip, () => {
        if (actionModel.selectedFolderStackKey) {
            removeLoredeckStackItem(actionModel.selectedFolderStackKey);
            return;
        }
        if (!actionModel.actionIds.length) return;
        removeLoredecksFromStack(actionModel.actionIds);
    }, 'saga-loredeck-library-transfer-button');
    remove.disabled = actionModel.removeDisabled;
    flow.appendChild(remove);

    const addAll = createButton('Add All Matching', 'Add every currently filtered Loredeck that is not already enabled.', () => {
        addLoredecksToStack(actionModel.inactiveMatches.map(pack => pack.packId));
    }, 'saga-loredeck-library-transfer-button');
    addAll.disabled = !actionModel.inactiveMatches.length;
    flow.appendChild(addAll);
    pane.appendChild(flow);

    const footer = document.createElement('div');
    footer.className = 'saga-loredeck-library-transfer-footer';
    const clear = createButton('Clear Stack', 'Remove every Loredeck from the active session stack.', () => {
        clearLoredeckStack();
    }, 'saga-danger-button saga-loredeck-library-transfer-button');
    clear.disabled = !stack.length;
    footer.appendChild(clear);

    const libraryActions = document.createElement('div');
    libraryActions.className = 'saga-loredeck-library-center-actions';
    const selectedActionFolder = actionModel.selectedActionFolder;
    const selectedIds = actionModel.selectedIds;
    const duplicateTargets = selectedIds.length ? selectedPacks.filter(pack => selectedIds.includes(pack.packId)) : (selectedActionFolder || actionModel.hasSelectedFolderDetails ? [] : (selectedPack ? [selectedPack] : []));
    const duplicateTooltip = selectedActionFolder
        ? `Duplicate the ${selectedActionFolder.title || selectedActionFolder.id} folder, nested folders, and contained Loredecks as Custom copies.`
        : duplicateTargets.length > 1
            ? `Duplicate ${duplicateTargets.length} selected Loredecks as editable Custom copies.`
            : duplicateTargets.length === 1
                ? `Duplicate ${duplicateTargets[0].title || duplicateTargets[0].packId} as an editable Custom Loredeck.`
                : 'Select a folder or one or more Loredecks before duplicating.';
    const duplicate = createLoredeckLibrarySquareIconAction('duplicate', duplicateTooltip, () => {
        if (selectedActionFolder) {
            void duplicateLoredeckLibraryFolderWithContents(selectedActionFolder.id);
            return;
        }
        if (duplicateTargets.length > 1) {
            void duplicateLoredeckLibraryPacksWithConfirm(duplicateTargets);
            return;
        }
        if (duplicateTargets.length === 1) openDuplicateLoredeckDialog(duplicateTargets[0]);
    });
    duplicate.disabled = !selectedActionFolder && !duplicateTargets.length;
    libraryActions.appendChild(createLoredeckLibrarySquareActionGroup(duplicate, 'Duplicate'));
    const deleteTargets = selectedIds.length ? selectedPacks.filter(pack => selectedIds.includes(pack.packId)) : (selectedActionFolder || actionModel.hasSelectedFolderDetails ? [] : (selectedPack ? [selectedPack] : []));
    const deletableTargets = deleteTargets.filter(pack => !isBundledLoredeckLibraryPack(pack));
    const deleteTooltip = selectedActionFolder
        ? `Delete the ${selectedActionFolder.title || selectedActionFolder.id} folder container after choosing where its contents go. Contained Loredecks are preserved.`
        : deletableTargets.length
            ? `Delete ${deletableTargets.length} selected Custom Loredeck${deletableTargets.length === 1 ? '' : 's'} after confirmation.`
            : deleteTargets.length
                ? 'Bundled Loredecks are read-only and cannot be deleted.'
                : 'Select a folder or one or more Custom Loredecks before deleting.';
    const deleteButton = createLoredeckLibrarySquareIconAction('delete', deleteTooltip, () => {
        if (selectedActionFolder) {
            void deleteLoredeckLibraryFolderWithConfirm(selectedActionFolder.id);
            return;
        }
        if (!deletableTargets.length) return;
        void deleteLoredeckLibraryPacksWithConfirm(deleteTargets);
    }, 'saga-loredeck-library-square-action-danger');
    deleteButton.disabled = !selectedActionFolder && !deletableTargets.length;
    libraryActions.appendChild(createLoredeckLibrarySquareActionGroup(deleteButton, 'Delete'));
    footer.appendChild(libraryActions);
    pane.appendChild(footer);
    return pane;
}

function createLoredeckLibrarySquareActionGroup(button, labelText = '') {
    const group = document.createElement('div');
    group.className = 'saga-loredeck-library-square-action-group';
    group.appendChild(button);
    const label = document.createElement('div');
    label.className = 'saga-loredeck-library-square-action-label';
    label.textContent = labelText;
    group.appendChild(label);
    return group;
}

function createLoredeckLibrarySquareIconAction(kind = 'duplicate', tooltip = '', handler = null, className = '') {
    const normalized = kind === 'delete' ? 'delete' : 'duplicate';
    const label = normalized === 'delete' ? 'Delete' : 'Duplicate';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `saga-runtime-button saga-loredeck-library-square-action saga-loredeck-library-icon-action ${className}`.trim();
    btn.setAttribute('aria-label', label);
    const icon = document.createElement('img');
    icon.className = 'saga-loredeck-library-action-icon-img';
    icon.src = getLoredeckLibraryActionIconSrc(normalized);
    icon.alt = '';
    icon.draggable = false;
    icon.setAttribute('aria-hidden', 'true');
    btn.appendChild(icon);
    addTooltip(btn, tooltip || label);
    btn.addEventListener('click', e => {
        e.stopPropagation();
        handler?.(btn, e);
    });
    return btn;
}

function getLoredeckLibraryActionIconSrc(kind = 'duplicate') {
    const fileName = kind === 'delete'
        ? 'delete-loredeck-256.png'
        : 'duplicate-loredeck-256.png';
    return new URL(`../../assets/loredeck-library/${fileName}`, import.meta.url).href;
}

function createLoredeckActiveStackPane(stack = [], library = [], canonDb = null, health = null, libraryIndex = getLoredeckLibraryIndexForPacks(getState(), library)) {
    const pane = document.createElement('div');
    pane.className = 'saga-loredeck-library-pane saga-loredeck-library-pane-stack';
    markTourTarget(pane, 'loredecks.library.stack');
    wireLoredeckLibraryBlankSelectionClear(pane);

    const stats = getLoredeckLibraryStackStats(stack, library, canonDb, health, libraryIndex);
    const stackPackMap = Object.fromEntries(library.map(pack => [pack.packId, pack]));
    const resolvedEnabledStack = resolveLoredeckStackItems(stack, libraryIndex, { packs: stackPackMap });
    const suppressedDirectDecks = new Map();
    for (const duplicate of resolvedEnabledStack.duplicates || []) {
        if (String(duplicate?.source?.type || '').trim() !== 'deck') continue;
        suppressedDirectDecks.set(duplicate.packId, {
            ...duplicate,
            keptEntry: resolvedEnabledStack.stack?.[duplicate.keptAt] || null,
        });
    }
    const head = document.createElement('div');
    head.className = 'saga-loredeck-library-pane-header saga-loredeck-library-stack-header';
    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'saga-loredeck-library-pane-title';
    title.textContent = 'Active Chat Stack';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-loredeck-library-pane-subtitle';
    subtitle.textContent = 'Top to bottom priority';
    titleWrap.appendChild(subtitle);
    head.appendChild(titleWrap);
    const stackMeta = document.createElement('div');
    stackMeta.className = 'saga-loredeck-row-meta';
    stackMeta.appendChild(createStatusPill(`${stats.entryCount} Lorecards`, 'Approximate active Lorecards in the enabled stack.', { kind: 'count' }));
    if (stats.duplicateCount) stackMeta.appendChild(createStatusPill(`${stats.duplicateCount} suppressed`, 'Duplicate Loredeck load attempts suppressed by higher-priority stack items.', { tone: 'muted', kind: 'count' }));
    stackMeta.appendChild(createStatusPill(`${stats.warningCount} warnings`, 'Current stack warning count.', { tone: stats.warningCount ? 'warning' : 'muted', kind: 'severity' }));
    stackMeta.appendChild(createStatusPill(`${stats.errorCount} errors`, 'Current stack error count.', { tone: stats.errorCount ? 'danger' : 'muted', kind: 'severity' }));
    head.appendChild(stackMeta);
    pane.appendChild(head);

    const chatScope = document.createElement('div');
    chatScope.className = 'saga-loredeck-library-pane-subtitle';
    chatScope.textContent = 'Saved to the active chat. Switching chats loads that chat\'s Loredecks. Open a chat before adding Loredecks.';
    pane.appendChild(chatScope);

    if (stats.duplicateCount) {
        const duplicateSummary = document.createElement('div');
        duplicateSummary.className = 'saga-loredeck-library-stack-duplicate-summary';
        duplicateSummary.textContent = `${stats.duplicateCount} duplicate Loredeck load attempt${stats.duplicateCount === 1 ? '' : 's'} suppressed. Higher stack priority wins; suppressed cards stay visible for ordering and editing.`;
        pane.appendChild(duplicateSummary);
    }

    const list = document.createElement('div');
    list.className = 'saga-loredeck-library-stack-list';
    if (!stack.length) {
        list.appendChild(createEmptyMessage('No Loredecks in this chat\'s stack. Open a chat, then add Loredecks from the Library.'));
    } else {
        const visibleStackPacks = resolveLoredeckStackItems(stack, libraryIndex, {
            packs: stackPackMap,
            includeDisabled: true,
        }).stack.map(item => library.find(pack => pack.packId === item.packId) || { packId: item.packId, title: item.packId });
        for (let index = 0; index < stack.length; index += 1) {
            const stackItem = stack[index];
            if (getLoredeckStackItemType(stackItem) === 'folder') {
                list.appendChild(createLoredeckActiveStackFolderCard(stackItem, index, stack.length, library, libraryIndex, canonDb, health));
            } else {
                const pack = stackPackMap[stackItem.packId] || { packId: stackItem.packId, title: stackItem.packId };
                list.appendChild(createLoredeckActiveStackCard(pack, stackItem, index, stack.length, canonDb, health, visibleStackPacks, suppressedDirectDecks.get(stackItem.packId) || null, libraryIndex, stackPackMap));
            }
        }
    }
    pane.appendChild(list);
    return pane;
}

function getLoredeckLibraryVisiblePacksFromHierarchyDom(anchor = null, fallbackPacks = []) {
    const list = anchor?.closest?.('.saga-loredeck-library-hierarchy-list')
        || document.querySelector('.saga-loredeck-library-hierarchy-list');
    if (!list) return fallbackPacks || [];
    if (Array.isArray(list.__sagaLoredeckLibraryVisibleOrder)) return list.__sagaLoredeckLibraryVisibleOrder;
    const fallbackById = new Map((fallbackPacks || []).map(pack => [String(pack?.packId || '').trim(), pack]).filter(([id]) => !!id));
    const packMap = getLoredeckLibraryPackMap(getLoredeckLibrary(getState()));
    return [...list.querySelectorAll('.saga-loredeck-library-deck-card[data-pack-id]')]
        .map(card => {
            const id = String(card.dataset.packId || '').trim();
            return packMap[id] || fallbackById.get(id) || (id ? { packId: id, title: id } : null);
        })
        .filter(Boolean);
}

function createLoredeckLibraryDeckCard(pack, stack = [], canonDb = null, health = null, visiblePacks = [], visibleIndex = 0, options = {}) {
    const mobileTouch = options.mobileTouch === true;
    const mobileOrder = Math.max(0, Number(options.mobileOrder) || 0);
    const selectedId = String(getState()?.lorePanel?.selectedLoredeckId || '').trim();
    const bulkSelected = loredeckLibraryBulkSelectedIds.has(pack.packId);
    const activeItem = stack.find(item => item.packId === pack.packId);
    const healthInfo = getLoredeckLibraryPackHealthInfo(pack, canonDb, health);
    const healthTone = getLoredeckLibraryDisplayHealthTone(pack, healthInfo);
    const stats = mobileTouch ? null : getLoredeckLibraryDeckStats(pack, canonDb, healthInfo);
    const card = document.createElement('div');
    card.className = 'saga-loredeck-library-deck-card';
    if (mobileTouch) card.classList.add('saga-loredeck-library-deck-mobile-touch');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.dataset.packId = pack.packId;
    card.dataset.libraryIndex = String(visibleIndex);
    if (!mobileTouch && selectedId === pack.packId) card.classList.add('saga-loredeck-library-deck-selected');
    if (!mobileTouch && bulkSelected) card.classList.add('saga-loredeck-library-deck-bulk-selected');
    if (mobileTouch ? mobileOrder > 0 : activeItem?.enabled) card.classList.add('saga-loredeck-library-deck-active');
    if (healthTone === 'error') card.classList.add('saga-loredeck-library-deck-error');
    else if (healthTone === 'warning') card.classList.add('saga-loredeck-library-deck-warning');
    card.dataset.mobileOrder = mobileTouch && mobileOrder ? String(mobileOrder) : '';
    card.setAttribute('aria-pressed', mobileTouch ? (mobileOrder ? 'true' : 'false') : (bulkSelected ? 'true' : 'false'));
    if (!mobileTouch && selectedId === pack.packId) card.setAttribute('aria-current', 'true');
    addTooltip(card, mobileTouch
        ? `${pack.title || pack.packId}. Tap to ${mobileOrder ? 'remove from' : 'add to'} the active Loredeck order.`
        : `${pack.title || pack.packId}. Click to select, Ctrl/Cmd-click to toggle, Shift-click to select a visible range, double-click to add to the active stack.`);
    markTourTarget(card, 'loredecks.library.deckCard');
    card.addEventListener('mousedown', suppressLoredeckLibraryRangeTextSelection);
    let mobileLongPressTimer = null;
    let mobileLongPressFired = false;
    const mobileInteractiveSelector = 'button, input, select, textarea, label, a';
    if (mobileTouch) {
        const clearLongPressTimer = () => {
            if (mobileLongPressTimer) {
                clearTimeout(mobileLongPressTimer);
                mobileLongPressTimer = null;
            }
        };
        card.addEventListener('pointerdown', e => {
            if (e.target?.closest?.(mobileInteractiveSelector)) return;
            mobileLongPressFired = false;
            clearLongPressTimer();
            mobileLongPressTimer = setTimeout(() => {
                mobileLongPressFired = true;
                openLoredeckLibraryMobileDetailSheet(pack.packId);
            }, 520);
        });
        card.addEventListener('pointerup', clearLongPressTimer);
        card.addEventListener('pointerleave', clearLongPressTimer);
        card.addEventListener('pointercancel', clearLongPressTimer);
        card.addEventListener('contextmenu', e => {
            if (e.target?.closest?.(mobileInteractiveSelector)) return;
            e.preventDefault();
            e.stopPropagation();
            clearLongPressTimer();
            openLoredeckLibraryMobileDetailSheet(pack.packId);
        });
    }
    card.addEventListener('click', e => {
        e.stopPropagation();
        if (mobileTouch) {
            if (mobileLongPressFired) {
                mobileLongPressFired = false;
                return;
            }
            toggleLoredeckLibraryMobileDeckActive(pack.packId);
            return;
        }
        handleLoredeckLibraryDeckSelection(pack.packId, e, getLoredeckLibraryVisiblePacksFromHierarchyDom(card, visiblePacks));
        refreshLoredeckLibrarySelectionSurfaces();
    });
    card.addEventListener('keydown', e => {
        if (e.target?.closest?.('button, input, select, textarea')) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (mobileTouch) {
                if (e.key === 'Enter') {
                    openLoredeckLibraryMobileDetailSheet(pack.packId);
                    return;
                }
                toggleLoredeckLibraryMobileDeckActive(pack.packId);
                return;
            }
            handleLoredeckLibraryDeckSelection(pack.packId, e, getLoredeckLibraryVisiblePacksFromHierarchyDom(card, visiblePacks));
            refreshLoredeckLibrarySelectionSurfaces();
        }
    });
    card.addEventListener('dblclick', e => {
        e.stopPropagation();
        if (!mobileTouch) addLoredeckToStack(pack.packId);
    });

    if (!mobileTouch) {
        const grip = document.createElement('span');
        grip.className = 'saga-loredeck-library-stack-grip saga-loredeck-library-deck-grip';
        grip.style.setProperty('--saga-grip-dot-rows', '2');
        grip.setAttribute('aria-hidden', 'true');
        grip.innerHTML = '<span></span>';
        grip.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
        });
        grip.addEventListener('pointerdown', e => {
            startLoredeckLibraryDeckDrag(e, pack.packId, getLoredeckLibraryVisiblePacksFromHierarchyDom(card, visiblePacks));
        });
        card.appendChild(grip);
    }

    card.appendChild(createLoredeckDeckVisual(pack, 'saga-loredeck-library-monogram', { usage: 'list' }));
    if (mobileTouch) {
        const orderBadge = document.createElement('span');
        orderBadge.className = 'saga-loredeck-library-mobile-order-badge';
        orderBadge.hidden = mobileOrder <= 0;
        orderBadge.textContent = mobileOrder ? String(mobileOrder) : '';
        orderBadge.setAttribute('aria-label', mobileOrder ? `Selected order ${mobileOrder}` : 'Not selected');
        card.appendChild(orderBadge);
    }

    const main = document.createElement('div');
    main.className = 'saga-loredeck-library-deck-main';
    main.appendChild(createLoredeckLibraryEditableTitle({
        value: pack.title || pack.packId,
        fallback: pack.packId,
        className: 'saga-loredeck-library-deck-title',
        editable: !mobileTouch && isEditableLoredeckLibraryPack(pack),
        kind: 'Loredeck',
        onCommit: title => {
            const renamed = renameLoredeckLibraryDeckTitle(pack.packId, title);
            if (renamed) renderLoredeckLibraryOverlay();
            return renamed;
        },
    }));
    const desc = document.createElement('div');
    desc.className = 'saga-loredeck-library-deck-description';
    desc.textContent = pack.description || `${getLoredeckLibraryPackTypeLabel(pack)} Loredeck.`;
    main.appendChild(desc);
    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-row-meta';
    chips.appendChild(createStatusPill(getLoredeckLibraryPackTypeLabel(pack), 'Loredeck source type.', { tone: 'source', kind: 'source' }));
    if (pack.fandom) chips.appendChild(createStatusPill(pack.fandom, 'Fandom or setting.', { tone: 'source', kind: 'metadata' }));
    if (pack.era) chips.appendChild(createStatusPill(pack.era, 'Era, arc, continuity slice, or scope.', { tone: 'info', kind: 'metadata' }));
    if (healthTone !== 'ok') chips.appendChild(createStatusPill(healthInfo.status.label, healthInfo.status.summary, { tone: healthTone === 'error' ? 'danger' : 'warning', kind: 'severity' }));
    if (mobileTouch && mobileOrder) {
        chips.appendChild(createStatusPill(`Order ${mobileOrder}`, `Selected order ${mobileOrder} in the active mobile Loredeck list.`, { tone: 'selected', kind: 'status' }));
    } else if (activeItem) {
        chips.appendChild(createStatusPill(activeItem.enabled ? 'In Stack' : 'Disabled', 'Current session stack state.', { tone: activeItem.enabled ? 'success' : 'muted', kind: 'status' }));
    }
    main.appendChild(chips);
    if (!mobileTouch) {
        const statsLine = document.createElement('div');
        statsLine.className = 'saga-loredeck-library-card-stats';
        statsLine.textContent = `${stats.entryCount} Lorecards | ${stats.fileCount || 0} files | ${stats.updatedLabel}`;
        main.appendChild(statsLine);
    }
    card.appendChild(main);

    return card;
}

function createLoredeckActiveStackCard(pack, item, index, stackLength, canonDb = null, health = null, visibleStackPacks = [], suppression = null, libraryIndex = {}, stackPackMap = {}) {
    const selectedId = String(getState()?.lorePanel?.selectedLoredeckId || '').trim();
    const healthInfo = getLoredeckLibraryPackHealthInfo(pack, canonDb, health);
    const stats = getLoredeckLibraryDeckStats(pack, canonDb, healthInfo);
    const stackKey = createLoredeckStackDeckKey(item.packId);
    const isSuppressed = item.enabled !== false && !!suppression;
    const keptEntry = suppression?.keptEntry || null;
    const keptSource = keptEntry ? { ...(keptEntry.source || {}), packId: keptEntry.packId } : {};
    const keptSourceLabel = isSuppressed ? formatLoredeckStackSourceLabel(keptSource, libraryIndex, stackPackMap) : '';
    const card = document.createElement('div');
    card.className = 'saga-loredeck-library-stack-card';
    card.dataset.packId = item.packId;
    card.dataset.stackKey = stackKey;
    card.dataset.stackIndex = String(index);
    if (selectedId === item.packId) card.classList.add('saga-loredeck-library-stack-card-selected');
    if (loredeckLibraryBulkSelectedIds.has(item.packId)) card.classList.add('saga-loredeck-library-stack-card-bulk-selected');
    if (!item.enabled) card.classList.add('saga-loredeck-library-stack-card-disabled');
    if (isSuppressed) card.classList.add('saga-loredeck-library-stack-card-suppressed');
    if (selectedId === item.packId) card.setAttribute('aria-current', 'true');
    card.addEventListener('click', e => {
        e.stopPropagation();
        handleLoredeckLibraryDeckSelection(item.packId, e, visibleStackPacks);
        refreshLoredeckLibrarySelectionSurfaces();
    });
    addTooltip(card, `${pack.title || item.packId}. Stack priority ${index + 1}.${keptSourceLabel ? ` Suppressed by ${keptSourceLabel}.` : ''}`);

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'saga-loredeck-library-stack-grip';
    grip.style.setProperty('--saga-grip-dot-rows', '2');
    grip.setAttribute('aria-label', `Drag to reorder ${pack.title || item.packId}. Current priority ${index + 1}.`);
    grip.innerHTML = '<span></span>';
    grip.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
    });
    grip.addEventListener('pointerdown', e => {
        startLoredeckStackDrag(e, stackKey);
    });
    grip.addEventListener('keydown', e => {
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            e.stopPropagation();
            moveLoredeckStackItem(stackKey, e.key === 'ArrowUp' ? -1 : 1);
        }
    });
    card.appendChild(grip);

    card.appendChild(createLoredeckDeckVisual(pack, 'saga-loredeck-library-monogram', { usage: 'list' }));

    const main = document.createElement('div');
    main.className = 'saga-loredeck-library-stack-main';
    main.appendChild(createLoredeckLibraryEditableTitle({
        value: pack.title || item.packId,
        fallback: item.packId,
        className: 'saga-loredeck-library-deck-title',
        editable: isEditableLoredeckLibraryPack(pack),
        kind: 'Loredeck',
        onCommit: title => {
            const renamed = renameLoredeckLibraryDeckTitle(pack.packId || item.packId, title);
            if (renamed) renderLoredeckLibraryOverlay();
            return renamed;
        },
    }));
    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-row-meta';
    chips.appendChild(createStatusPill(
        isSuppressed ? 'Suppressed' : (item.enabled ? 'Active' : 'Disabled'),
        isSuppressed
            ? 'This Loredeck is already loaded by a higher-priority stack item.'
            : (item.enabled ? 'This Loredeck participates in retrieval.' : 'Disabled Loredecks remain in the stack but do not participate in retrieval.'),
        { tone: isSuppressed || !item.enabled ? 'muted' : 'success', kind: 'status' }
    ));
    chips.appendChild(createStatusPill(`Priority ${index + 1}`, 'Top decks have higher priority.', { kind: 'count' }));
    if (keptSourceLabel) chips.appendChild(createStatusPill(`Kept: ${keptSourceLabel}`, 'Higher-priority stack source that currently loads this Loredeck.', { tone: 'warning', kind: 'source', maxChars: 38 }));
    main.appendChild(chips);
    const statsLine = document.createElement('div');
    statsLine.className = 'saga-loredeck-library-card-stats';
    statsLine.textContent = isSuppressed
        ? `${stats.entryCount} Lorecards | duplicate suppressed`
        : `${stats.entryCount} Lorecards`;
    main.appendChild(statsLine);
    card.appendChild(main);

    const controls = document.createElement('div');
    controls.className = 'saga-loredeck-library-stack-controls';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = `saga-loredeck-library-stack-toggle-button ${item.enabled !== false ? 'saga-loredeck-library-stack-toggle-active' : 'saga-loredeck-library-stack-toggle-inactive'}`;
    toggle.setAttribute('aria-pressed', item.enabled !== false ? 'true' : 'false');
    toggle.setAttribute('aria-label', item.enabled !== false ? 'Disable Loredeck retrieval' : 'Enable Loredeck retrieval');
    addTooltip(toggle, item.enabled !== false ? 'Active. Click to disable this Loredeck without removing it.' : 'Disabled. Click to enable this Loredeck for retrieval.');
    toggle.addEventListener('click', e => {
        e.stopPropagation();
        setLoredeckStackItemEnabled(stackKey, item.enabled === false);
    });
    controls.appendChild(toggle);
    void stackLength;
    card.appendChild(controls);
    return card;
}

function createLoredeckActiveStackFolderCard(item, index, stackLength, library = [], libraryIndex = {}, canonDb = null, health = null) {
    const folderId = String(item.folderId || '').trim();
    const stackKey = createLoredeckStackFolderKey(folderId);
    const folder = (libraryIndex.folders || []).find(candidate => candidate.id === folderId) || { id: folderId, title: folderId || 'Folder' };
    const path = getFolderPath(folderId, libraryIndex);
    const preview = getLoredeckStackFolderPreviewModel(item, getLoredeckStack(getState()), library, libraryIndex, canonDb, health);
    const stats = preview.summary;
    const collapsed = item.collapsed === true;

    const card = document.createElement('div');
    card.className = 'saga-loredeck-library-stack-card saga-loredeck-library-stack-folder-card';
    card.dataset.folderId = folderId;
    card.dataset.stackKey = stackKey;
    card.dataset.stackIndex = String(index);
    card.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    card.classList.toggle('saga-loredeck-library-stack-folder-card-expanded', !collapsed);
    card.classList.toggle('saga-loredeck-library-stack-folder-card-has-suppressed', !!stats.suppressedCount);
    if (!item.enabled) card.classList.add('saga-loredeck-library-stack-card-disabled');
    if (loredeckLibrarySelectedFolderDetailsId === folderId) card.classList.add('saga-loredeck-library-stack-card-selected');
    if (loredeckLibrarySelectedFolderDetailsId === folderId) card.setAttribute('aria-current', 'true');
    addTooltip(card, `${path.join(' > ') || folder.title}. Folder group priority ${index + 1}.`);
    card.addEventListener('click', e => {
        e.stopPropagation();
        if (e.target?.closest?.('button')) return;
        loredeckLibrarySelectedFolderDetailsId = folderId;
        setLoredeckLibraryBulkSelection([], '');
        scheduleLoredeckLibrarySelectionSurfaceRefresh();
    });

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'saga-loredeck-library-stack-grip';
    grip.style.setProperty('--saga-grip-dot-rows', String(Math.max(3, 7 - Math.max(1, path.length || 1))));
    grip.setAttribute('aria-label', `Drag to reorder ${folder.title || folderId}. Current priority ${index + 1}.`);
    grip.innerHTML = '<span></span>';
    grip.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
    });
    grip.addEventListener('pointerdown', e => {
        startLoredeckStackDrag(e, stackKey);
    });
    grip.addEventListener('keydown', e => {
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            e.stopPropagation();
            moveLoredeckStackItem(stackKey, e.key === 'ArrowUp' ? -1 : 1);
        }
    });
    card.appendChild(grip);

    const visual = document.createElement('div');
    visual.className = 'saga-loredeck-library-monogram saga-loredeck-library-stack-folder-visual';
    visual.appendChild(createLoredeckLibraryFolderCoverStrip(
        getLoredeckLibraryFolderCoverPacks(folderId, library, libraryIndex),
        preview.allPacks.filter(getLoredeckLibraryCover).length
    ));
    card.appendChild(visual);

    const main = document.createElement('div');
    main.className = 'saga-loredeck-library-stack-main';
    main.appendChild(createLoredeckLibraryEditableTitle({
        value: folder.title || folderId || 'Folder',
        fallback: folderId || 'Folder',
        className: 'saga-loredeck-library-deck-title',
        editable: !!folderId && folderId !== 'unfiled',
        kind: 'folder',
        onCommit: title => {
            const renamed = renameLoredeckLibraryFolder(folderId, title);
            if (renamed) renderLoredeckLibraryOverlay();
            return renamed;
        },
    }));
    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-row-meta';
    chips.appendChild(createStatusPill(item.enabled ? 'Active Folder' : 'Disabled Folder', 'Folder groups load the Loredecks nested inside this Library folder.', { tone: item.enabled ? 'success' : 'muted', kind: 'status' }));
    chips.appendChild(createStatusPill(`Priority ${index + 1}`, 'Top stack items have higher priority.', { kind: 'count' }));
    chips.appendChild(createStatusPill(`${stats.activeCount}/${stats.deckCount} active`, 'Active Loredecks from this folder after stack duplicate suppression.', { tone: stats.activeCount ? 'success' : 'muted', kind: 'count' }));
    if (stats.suppressedCount) chips.appendChild(createStatusPill(`${stats.suppressedCount} suppressed`, 'Loredecks already loaded by a higher-priority stack item.', { tone: 'muted', kind: 'count' }));
    if (stats.errorCount) chips.appendChild(createStatusPill(`${stats.errorCount} errors`, 'Contained Loredecks with Pack Health errors.', { tone: 'danger', kind: 'severity' }));
    else if (stats.warningCount) chips.appendChild(createStatusPill(`${stats.warningCount} warnings`, 'Contained Loredecks with Pack Health warnings.', { tone: 'warning', kind: 'severity' }));
    main.appendChild(chips);
    const statsLine = document.createElement('div');
    statsLine.className = 'saga-loredeck-library-card-stats';
    statsLine.textContent = `${stats.deckCount} Loredecks | ${stats.entryCount} active Lorecards${stats.suppressedCount ? ` | ${stats.suppressedCount} suppressed` : ''}`;
    main.appendChild(statsLine);
    card.appendChild(main);

    const controls = document.createElement('div');
    controls.className = 'saga-loredeck-library-stack-controls';
    const disclosure = document.createElement('button');
    disclosure.type = 'button';
    disclosure.className = 'saga-loredeck-library-stack-disclosure-button';
    disclosure.textContent = collapsed ? '>' : 'v';
    disclosure.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${folder.title || folderId} stack preview`);
    addTooltip(disclosure, collapsed ? 'Expand folder stack preview.' : 'Collapse folder stack preview.');
    disclosure.addEventListener('click', e => {
        e.stopPropagation();
        setLoredeckStackItemCollapsed(stackKey, !collapsed);
    });
    controls.appendChild(disclosure);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = `saga-loredeck-library-stack-toggle-button ${item.enabled !== false ? 'saga-loredeck-library-stack-toggle-active' : 'saga-loredeck-library-stack-toggle-inactive'}`;
    toggle.setAttribute('aria-pressed', item.enabled !== false ? 'true' : 'false');
    toggle.setAttribute('aria-label', item.enabled !== false ? 'Disable folder group retrieval' : 'Enable folder group retrieval');
    addTooltip(toggle, item.enabled !== false ? 'Active. Click to disable this folder group without removing it.' : 'Disabled. Click to enable this folder group for retrieval.');
    toggle.addEventListener('click', e => {
        e.stopPropagation();
        setLoredeckStackItemEnabled(stackKey, item.enabled === false);
    });
    controls.appendChild(toggle);
    void stackLength;
    card.appendChild(controls);
    if (!collapsed) {
        card.appendChild(createLoredeckStackFolderPreview(preview, item, libraryIndex));
    }
    return card;
}

function getLoredeckStackFolderPreviewModel(item = {}, stack = [], library = [], libraryIndex = {}, canonDb = null, health = null) {
    const folderId = String(item.folderId || '').trim();
    const includeNested = item.includeNested !== false;
    const packMap = getLoredeckLibraryPackMap(library);
    const resolved = resolveLoredeckStackItems(stack, libraryIndex, { packs: packMap });
    const activeByPack = new Map((resolved.stack || []).map(entry => [entry.packId, entry]));
    const suppressedByPack = new Map();
    for (const duplicate of resolved.duplicates || []) {
        if (String(duplicate?.source?.folderId || '').trim() !== folderId) continue;
        if (!suppressedByPack.has(duplicate.packId)) {
            suppressedByPack.set(duplicate.packId, {
                ...duplicate,
                keptEntry: resolved.stack?.[duplicate.keptAt] || null,
            });
        }
    }
    const groupDeckIds = getLoredeckLibraryFolderDeckIds(folderId, libraryIndex, { includeNested });
    const allPacks = groupDeckIds.map(packId => packMap[packId]).filter(Boolean);
    const summaryByPack = new Map();
    const summary = {
        deckCount: allPacks.length,
        activeCount: 0,
        suppressedCount: 0,
        disabledCount: item.enabled === false ? allPacks.length : 0,
        entryCount: 0,
        warningCount: 0,
        errorCount: 0,
    };

    for (const pack of allPacks) {
        const healthInfo = getLoredeckLibraryPackHealthInfo(pack, canonDb, health);
        const deckStats = getLoredeckLibraryDeckStats(pack, canonDb, healthInfo);
        const healthTone = getLoredeckLibraryDisplayHealthTone(pack, healthInfo);
        const active = activeByPack.get(pack.packId) || null;
        const suppressed = suppressedByPack.get(pack.packId) || null;
        let stackStatus = 'inactive';
        if (item.enabled === false) stackStatus = 'disabled';
        else if (suppressed) stackStatus = 'suppressed';
        else if (active?.source?.type === 'folder' && String(active.source.folderId || '').trim() === folderId) stackStatus = 'active';
        else if (active) stackStatus = 'suppressed';

        if (stackStatus === 'active') {
            summary.activeCount += 1;
            summary.entryCount += Number(deckStats.entryCount) || 0;
        } else if (stackStatus === 'suppressed') {
            summary.suppressedCount += 1;
        }
        if (healthTone === 'error') summary.errorCount += 1;
        else if (healthTone === 'warning') summary.warningCount += 1;
        summaryByPack.set(pack.packId, {
            pack,
            healthInfo,
            deckStats,
            healthTone,
            stackStatus,
            suppressed,
            active,
        });
    }

    return {
        folderId,
        includeNested,
        allPacks,
        summary,
        summaryByPack,
        activeByPack,
        suppressedByPack,
    };
}

function formatLoredeckStackSourceLabel(source = {}, libraryIndex = {}, packMap = {}) {
    const type = String(source?.type || '').trim();
    if (type === 'folder') {
        const folderId = String(source.folderId || '').trim();
        const folder = (libraryIndex.folders || []).find(item => item.id === folderId) || null;
        const path = getFolderPath(folderId, libraryIndex);
        return path.join(' > ') || folder?.title || folderId || 'folder group';
    }
    if (type === 'deck') {
        const packId = String(source.packId || source.deckId || '').trim();
        const pack = packId ? packMap[packId] : null;
        return pack?.title || packId || 'direct deck';
    }
    return 'higher-priority stack item';
}

function getLoredeckLibraryDirectFolderPacks(folderId = '', library = getLoredeckLibrary(getState()), libraryIndex = getLoredeckLibraryIndexForPacks()) {
    const id = String(folderId || '').trim();
    const byId = new Map((library || []).map(pack => [pack.packId, pack]));
    return (libraryIndex.deckPlacements || [])
        .filter(placement => String(placement.folderId || '').trim() === id)
        .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || String(a.deckId || a.packId).localeCompare(String(b.deckId || b.packId)))
        .map(placement => byId.get(String(placement.deckId || placement.packId || '').trim()))
        .filter(Boolean);
}

function createLoredeckStackFolderPreview(preview = {}, item = {}, libraryIndex = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-library-stack-folder-preview';
    wrap.addEventListener('click', e => e.stopPropagation());
    const list = document.createElement('div');
    list.className = 'saga-loredeck-library-stack-folder-preview-list';
    appendLoredeckStackFolderPreviewContents(list, preview.folderId, preview, item, libraryIndex, 0, true);
    if (!list.children.length) {
        list.appendChild(createEmptyMessage('This folder group does not contain any Loredecks.'));
    }
    wrap.appendChild(list);
    return wrap;
}

function appendLoredeckStackFolderPreviewContents(list, folderId = '', preview = {}, item = {}, libraryIndex = {}, depth = 0, isRoot = false) {
    const folder = (libraryIndex.folders || []).find(entry => entry.id === folderId) || null;
    if (!isRoot && folder) {
        list.appendChild(createLoredeckStackFolderPreviewFolderRow(folder, depth, libraryIndex));
    }
    const library = getLoredeckLibrary(getState());
    const packMap = getLoredeckLibraryPackMap(library);
    for (const pack of getLoredeckLibraryDirectFolderPacks(folderId, library, libraryIndex)) {
        list.appendChild(createLoredeckStackFolderPreviewDeckRow(preview.summaryByPack.get(pack.packId) || { pack, stackStatus: 'inactive' }, depth + (isRoot ? 0 : 1), libraryIndex, packMap));
    }
    if (preview.includeNested === false) return;
    for (const child of getLoredeckLibraryFolderSiblingRecords(folderId, libraryIndex.folders || [])) {
        appendLoredeckStackFolderPreviewContents(list, child.id, preview, item, libraryIndex, depth + (isRoot ? 0 : 1), false);
    }
}

function createLoredeckStackFolderPreviewFolderRow(folder = {}, depth = 0, libraryIndex = {}) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'saga-loredeck-library-stack-folder-preview-row saga-loredeck-library-stack-folder-preview-row-folder';
    row.style.setProperty('--saga-stack-preview-depth', String(Math.max(0, Number(depth) || 0)));
    addTooltip(row, `Open folder details: ${getFolderPath(folder.id, libraryIndex).join(' > ') || folder.title || folder.id}.`);
    row.addEventListener('click', e => {
        e.stopPropagation();
        loredeckLibrarySelectedFolderId = folder.id;
        loredeckLibrarySelectedFolderDetailsId = folder.id;
        setLoredeckLibraryBulkSelection([], '');
        renderLoredeckLibraryOverlay();
    });
    const label = document.createElement('span');
    label.className = 'saga-loredeck-library-stack-folder-preview-title';
    label.textContent = folder.title || folder.id || 'Folder';
    row.appendChild(label);
    const count = getLoredeckLibraryFolderDeckIds(folder.id, libraryIndex, { includeNested: true }).length;
    const chip = createStatusPill(`${count} deck${count === 1 ? '' : 's'}`, 'Folder Loredeck count.', {
        kind: 'count',
        className: 'saga-loredeck-library-stack-folder-preview-chip',
    });
    row.appendChild(chip);
    return row;
}

function createLoredeckStackFolderPreviewDeckRow(summary = {}, depth = 0, libraryIndex = {}, packMap = {}) {
    const pack = summary.pack || {};
    const stackStatus = summary.stackStatus || 'inactive';
    const healthTone = summary.healthTone || 'unknown';
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `saga-loredeck-library-stack-folder-preview-row saga-loredeck-library-stack-folder-preview-row-deck saga-loredeck-library-stack-folder-preview-row-${stackStatus} saga-loredeck-library-stack-folder-preview-health-${healthTone}`;
    row.style.setProperty('--saga-stack-preview-depth', String(Math.max(0, Number(depth) || 0)));
    const keptEntry = summary.suppressed?.keptEntry || summary.active || null;
    const keptSource = keptEntry ? { ...(keptEntry.source || {}), packId: keptEntry.packId } : {};
    const keptSourceLabel = stackStatus === 'suppressed'
        ? formatLoredeckStackSourceLabel(keptSource, libraryIndex, packMap)
        : '';
    addTooltip(row, `Open ${pack.title || pack.packId}. Status: ${humanizeScopeKey(stackStatus)}.${keptSourceLabel ? ` Kept by ${keptSourceLabel}.` : ''}`);
    row.addEventListener('click', e => {
        e.stopPropagation();
        loredeckLibrarySelectedFolderDetailsId = '';
        handleLoredeckLibraryDeckSelection(pack.packId, null, [pack]);
        refreshLoredeckLibrarySelectionSurfaces();
    });
    const title = document.createElement('span');
    title.className = 'saga-loredeck-library-stack-folder-preview-title';
    title.textContent = pack.title || pack.packId || 'Loredeck';
    row.appendChild(title);

    const statusLabel = stackStatus === 'suppressed'
        ? 'Suppressed'
        : stackStatus === 'disabled'
            ? 'Disabled'
            : stackStatus === 'active'
                ? 'Active'
                : 'Inactive';
    const statusTone = stackStatus === 'active'
        ? 'success'
        : (stackStatus === 'suppressed' || stackStatus === 'disabled' ? 'muted' : 'neutral');
    const status = createStatusPill(statusLabel, 'Active stack status for this Loredeck.', {
        tone: statusTone,
        kind: 'status',
        className: 'saga-loredeck-library-stack-folder-preview-chip',
    });
    row.appendChild(status);

    if (keptSourceLabel) {
        const kept = createStatusPill(`Kept: ${keptSourceLabel}`, `This duplicate is suppressed because ${keptSourceLabel} appears earlier in the active stack.`, {
            tone: 'warning',
            kind: 'source',
            className: 'saga-loredeck-library-stack-folder-preview-chip',
            maxChars: 34,
        });
        row.appendChild(kept);
    }

    const health = createStatusPill(healthTone === 'error' ? 'Error' : healthTone === 'warning' ? 'Warn' : 'OK', 'Pack Health status for this Loredeck.', {
        tone: healthTone === 'error' ? 'danger' : (healthTone === 'warning' ? 'warning' : 'success'),
        kind: 'severity',
        className: 'saga-loredeck-library-stack-folder-preview-chip',
    });
    row.appendChild(health);
    return row;
}

function getLoredeckLibraryDropList(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY);
    const folder = element?.closest?.('.saga-loredeck-library-inline-folder-row[data-folder-drop-target="true"]');
    if (folder) return folder;
    const direct = element?.closest?.('.saga-loredeck-library-deck-list, .saga-loredeck-library-stack-list');
    if (direct) return direct;
    const lists = [...document.querySelectorAll('.saga-loredeck-library-deck-list, .saga-loredeck-library-stack-list')];
    return lists.find(list => {
        const rect = list.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top - 42 && clientY <= rect.bottom + 42;
    }) || null;
}

function getLoredeckLibraryDropKind(list) {
    if (!list) return '';
    if (list.classList.contains('saga-loredeck-library-inline-folder-row')) return 'folder';
    if (list.classList.contains('saga-loredeck-library-stack-list')) return 'stack';
    if (list.classList.contains('saga-loredeck-library-deck-list')) return 'library';
    return '';
}

function getLoredeckLibraryDropScrollElement(target = null) {
    if (!target) return null;
    if (target.classList?.contains('saga-loredeck-library-inline-folder-row')) {
        return target.closest('.saga-loredeck-library-deck-list')
            || null;
    }
    return target;
}

function setLoredeckLibraryDragDropTarget(state, list = null) {
    clearLoredeckLibraryDragDropClasses();
    state.dropList = list || null;
    state.dropKind = getLoredeckLibraryDropKind(list);
    state.dropFolderId = state.dropKind === 'folder' ? String(list?.dataset?.folderId || '').trim() : '';
    if (list) list.classList.add('saga-loredeck-library-drag-drop-target');
}

function clearLoredeckLibraryDragDropClasses() {
    for (const target of document.querySelectorAll('.saga-loredeck-library-drag-drop-target, .saga-loredeck-library-drag-drop-valid, .saga-loredeck-library-drag-drop-invalid')) {
        target.classList.remove('saga-loredeck-library-drag-drop-target', 'saga-loredeck-library-drag-drop-valid', 'saga-loredeck-library-drag-drop-invalid');
    }
    for (const target of document.querySelectorAll('.saga-loredeck-library-root-drop-active, .saga-loredeck-library-stack-remove-active')) {
        target.classList.remove('saga-loredeck-library-root-drop-active', 'saga-loredeck-library-stack-remove-active');
        delete target.dataset.dragDropLabel;
    }
}

function updateLoredeckLibraryDragFeedback(state = {}) {
    const feedback = resolveLoredeckLibraryDragFeedback({
        ...state,
        libraryIndex: state.libraryIndex || getLoredeckLibraryIndexForPacks(),
    });
    state.dropValid = feedback.valid !== false;
    state.dropActionText = feedback.text || '';
    if (state.dropList) {
        state.dropList.classList.toggle('saga-loredeck-library-drag-drop-valid', state.dropValid);
        state.dropList.classList.toggle('saga-loredeck-library-drag-drop-invalid', !state.dropValid);
        state.dropList.classList.toggle('saga-loredeck-library-root-drop-active', !!feedback.root);
        state.dropList.classList.toggle('saga-loredeck-library-stack-remove-active', !!feedback.remove);
        if (feedback.root || feedback.remove) state.dropList.dataset.dragDropLabel = feedback.badge || feedback.text || '';
        else delete state.dropList.dataset.dragDropLabel;
    }
    const label = ensureLoredeckLibraryDragCopyLabel(state.ghost);
    if (label) {
        label.textContent = state.dropActionText || (state.dropValid ? 'Drop to apply' : 'Not a valid drop target');
        setChipTone(label, (!state.dropValid || feedback.remove) ? 'danger' : (feedback.root ? 'warning' : 'success'));
    }
}

function ensureLoredeckLibraryDragCopyLabel(ghost = null) {
    if (!ghost) return null;
    let label = ghost.querySelector?.('.saga-loredeck-library-drag-copy');
    if (!label) {
        label = createStatusPill('', 'Current Loredeck drag action.', {
            tone: 'success',
            kind: 'status',
            density: 'standard',
            className: 'saga-loredeck-library-drag-copy',
        });
        ghost.appendChild(label);
    }
    return label;
}

function updateLoredeckLibraryDragAutoScroll(state, clientX, clientY) {
    const list = getLoredeckLibraryDropList(clientX, clientY);
    const scrollElement = getLoredeckLibraryDropScrollElement(list);
    let speed = 0;
    if (scrollElement) {
        const rect = scrollElement.getBoundingClientRect();
        const edge = Math.min(72, Math.max(36, rect.height * 0.18));
        if (clientY < rect.top + edge) {
            const ratio = Math.min(1.7, (rect.top + edge - clientY) / edge);
            speed = -Math.max(1, Math.round(2 + (ratio * ratio * 12)));
        } else if (clientY > rect.bottom - edge) {
            const ratio = Math.min(1.7, (clientY - (rect.bottom - edge)) / edge);
            speed = Math.max(1, Math.round(2 + (ratio * ratio * 12)));
        }
    }

    state.autoScrollList = speed ? scrollElement : null;
    state.autoScrollSpeed = speed;
    if (!speed || state.autoScrollFrame) return;
    const tick = () => {
        if (!state.autoScrollList || !state.autoScrollSpeed) {
            state.autoScrollFrame = null;
            return;
        }
        state.autoScrollList.scrollTop += state.autoScrollSpeed;
        if (typeof state.updatePosition === 'function') {
            state.updatePosition(state.lastX, state.lastY, { fromAutoScroll: true });
        }
        state.autoScrollFrame = requestAnimationFrame(tick);
    };
    state.autoScrollFrame = requestAnimationFrame(tick);
}

function stopLoredeckLibraryDragAutoScroll(state) {
    if (!state) return;
    state.autoScrollList = null;
    state.autoScrollSpeed = 0;
    if (state.autoScrollFrame) cancelAnimationFrame(state.autoScrollFrame);
    state.autoScrollFrame = null;
}

function clearLoredeckLibraryDragDropTargets() {
    clearLoredeckLibraryDragDropClasses();
}

function startLoredeckLibraryDeckDrag(event, packId, visiblePacks = []) {
    if (event.button != null && event.button !== 0) return;
    const handle = event.currentTarget;
    const card = handle?.closest?.('.saga-loredeck-library-deck-card');
    const list = card?.closest?.('.saga-loredeck-library-deck-list');
    if (!card || !list) return;

    event.preventDefault();
    event.stopPropagation();

    const cards = [...list.querySelectorAll('.saga-loredeck-library-deck-card')];
    const originalIndex = Number(card.dataset.libraryIndex);
    if (!Number.isFinite(originalIndex)) return;
    const rect = card.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(list).rowGap || getComputedStyle(list).gap) || 7;
    const ghost = card.cloneNode(true);
    ghost.classList.add('saga-loredeck-library-stack-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.top)}px, 0)`;
    document.body.appendChild(ghost);

    const selectedIds = getLoredeckLibraryBulkSelectedIds().filter(id => visiblePacks.some(pack => pack.packId === id));
    const packIds = selectedIds.includes(packId) ? selectedIds : [String(packId || '').trim()];
    loredeckLibraryDeckDragState = {
        dragType: 'library-deck',
        packId: String(packId || '').trim(),
        packIds,
        visiblePacks,
        pointerId: event.pointerId,
        handle,
        list,
        card,
        cards,
        ghost,
        originalIndex,
        targetIndex: originalIndex,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        shift: rect.height + gap,
        lastX: event.clientX,
        lastY: event.clientY,
        dropList: list,
        dropKind: 'library',
        dropFolderId: '',
        reparentToRoot: false,
        dropValid: true,
        dropActionText: '',
        onMove: null,
        onUp: null,
        onKeyDown: null,
        updatePosition: (x, y) => updateLoredeckLibraryDeckDrag(x, y),
    };

    document.body.classList.add('saga-loredeck-library-stack-dragging');
    list.classList.add('saga-loredeck-library-stack-list-dragging');
    card.classList.add('saga-loredeck-library-stack-card-dragging-source');
    try {
        handle.setPointerCapture?.(event.pointerId);
    } catch (_) {
        // Pointer capture is a progressive enhancement for the drag handle.
    }

    loredeckLibraryDeckDragState.onMove = e => updateLoredeckLibraryDeckDrag(e.clientX, e.clientY);
    loredeckLibraryDeckDragState.onUp = e => finishLoredeckLibraryDeckDrag(e.type !== 'pointercancel');
    loredeckLibraryDeckDragState.onKeyDown = e => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        finishLoredeckLibraryDeckDrag(false);
    };
    window.addEventListener('pointermove', loredeckLibraryDeckDragState.onMove);
    window.addEventListener('pointerup', loredeckLibraryDeckDragState.onUp, { once: true });
    window.addEventListener('pointercancel', loredeckLibraryDeckDragState.onUp, { once: true });
    window.addEventListener('keydown', loredeckLibraryDeckDragState.onKeyDown);
    updateLoredeckLibraryDeckDrag(event.clientX, event.clientY);
}

function getLoredeckLibraryDragTargetIndex(clientY) {
    const state = loredeckLibraryDeckDragState;
    if (!state) return -1;
    const originalIndex = state.originalIndex;
    for (const card of state.cards) {
        const index = Number(card.dataset.libraryIndex);
        if (!Number.isFinite(index) || index === originalIndex) continue;
        const rect = card.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
            return index > originalIndex ? Math.max(0, index - 1) : index;
        }
    }
    return state.cards.length - 1;
}

function updateLoredeckLibraryDeckDrag(clientX, clientY) {
    const state = loredeckLibraryDeckDragState;
    if (!state) return;
    state.lastX = clientX;
    state.lastY = clientY;
    state.ghost.style.transform = `translate3d(${Math.round(clientX - state.offsetX)}px, ${Math.round(clientY - state.offsetY)}px, 0)`;
    const dropList = getLoredeckLibraryDropList(clientX, clientY);
    setLoredeckLibraryDragDropTarget(state, dropList || state.list);
    updateLoredeckLibraryDragAutoScroll(state, clientX, clientY);

    const canReorder = state.dropKind === 'library' && state.dropList === state.list;
    const targetIndex = canReorder ? getLoredeckLibraryDragTargetIndex(clientY) : state.originalIndex;
    state.targetIndex = Number.isFinite(targetIndex) ? targetIndex : state.originalIndex;
    updateLoredeckLibraryDragFeedback(state);
    for (const card of state.cards) {
        if (card === state.card) continue;
        const index = Number(card.dataset.libraryIndex);
        let offset = 0;
        if (canReorder && state.targetIndex > state.originalIndex && index > state.originalIndex && index <= state.targetIndex) {
            offset = -state.shift;
        } else if (canReorder && state.targetIndex < state.originalIndex && index >= state.targetIndex && index < state.originalIndex) {
            offset = state.shift;
        }
        card.style.transform = offset ? `translateY(${offset}px)` : '';
        card.classList.toggle('saga-loredeck-library-stack-card-displaced', !!offset);
    }
}

function finishLoredeckLibraryDeckDrag(commit = true) {
    const state = loredeckLibraryDeckDragState;
    if (!state) return;
    window.removeEventListener('pointermove', state.onMove);
    window.removeEventListener('pointerup', state.onUp);
    window.removeEventListener('pointercancel', state.onUp);
    window.removeEventListener('keydown', state.onKeyDown);
    stopLoredeckLibraryDragAutoScroll(state);
    clearLoredeckLibraryDragDropTargets();
    try {
        state.handle?.releasePointerCapture?.(state.pointerId);
    } catch (_) {
        // Pointer capture may already be released by the browser.
    }
    document.body.classList.remove('saga-loredeck-library-stack-dragging');
    state.list.classList.remove('saga-loredeck-library-stack-list-dragging');
    state.card.classList.remove('saga-loredeck-library-stack-card-dragging-source');
    for (const card of state.cards) {
        card.style.transform = '';
        card.classList.remove('saga-loredeck-library-stack-card-displaced');
    }
    state.ghost.remove();
    const { packId, packIds, targetIndex, originalIndex, dropKind, dropFolderId, visiblePacks } = state;
    const canCommit = commit && state.dropValid !== false;
    loredeckLibraryDeckDragState = null;
    if (!canCommit) return;
    if (dropKind === 'stack') {
        addLoredecksToStack(packIds);
    } else if (dropKind === 'folder') {
        if (moveLoredecksToLibraryFolder(packIds, dropFolderId)) scheduleLoredeckLibraryOverlayRefresh();
    } else if (dropKind === 'library' && targetIndex !== originalIndex) {
        if (reorderLoredeckInLibrary(packId, targetIndex, visiblePacks)) scheduleLoredeckLibraryOverlayRefresh();
    }
}

function startLoredeckLibraryFolderDrag(event, folderId) {
    if (event.button != null && event.button !== 0) return;
    const id = String(folderId || '').trim();
    const handle = event.currentTarget;
    const row = handle?.closest?.('.saga-loredeck-library-inline-folder-row');
    const list = row?.closest?.('.saga-loredeck-library-deck-list');
    if (!id || id === 'unfiled' || row?.dataset?.folderSpecial === 'true' || !row || !list) return;

    event.preventDefault();
    event.stopPropagation();

    const library = getLoredeckLibrary(getState());
    const libraryIndex = getLoredeckLibraryIndexForPacks(getState(), library);
    const folder = (libraryIndex.folders || []).find(item => item.id === id);
    if (!folder) return;
    const parentId = String(folder.parentId || '').trim();
    const folderRows = [...list.querySelectorAll('.saga-loredeck-library-inline-folder-row[data-folder-special="false"]')];
    const siblingRows = folderRows.filter(item => String(item.dataset.folderParentId || '').trim() === parentId);
    const originalIndex = siblingRows.indexOf(row);
    if (originalIndex < 0) return;

    const rect = row.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(list).rowGap || getComputedStyle(list).gap) || 7;
    const ghost = row.cloneNode(true);
    ghost.classList.add('saga-loredeck-library-stack-ghost', 'saga-loredeck-library-folder-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.top)}px, 0)`;
    document.body.appendChild(ghost);

    loredeckLibraryFolderDragState = {
        dragType: 'library-folder',
        folderId: id,
        folderTitle: folder.title || id,
        parentId,
        libraryIndex,
        pointerId: event.pointerId,
        handle,
        row,
        list,
        cards: folderRows,
        siblingRows,
        ghost,
        originalIndex,
        targetIndex: originalIndex,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        shift: rect.height + gap,
        lastX: event.clientX,
        lastY: event.clientY,
        dropList: list,
        dropKind: 'library',
        dropFolderId: '',
        dropValid: true,
        dropActionText: '',
        onMove: null,
        onUp: null,
        onKeyDown: null,
        updatePosition: (x, y) => updateLoredeckLibraryFolderDrag(x, y),
    };

    document.body.classList.add('saga-loredeck-library-stack-dragging');
    list.classList.add('saga-loredeck-library-stack-list-dragging');
    row.classList.add('saga-loredeck-library-stack-card-dragging-source');
    try {
        handle.setPointerCapture?.(event.pointerId);
    } catch (_) {
        // Pointer capture may fail for synthetic or cancelled pointer streams.
    }

    loredeckLibraryFolderDragState.onMove = e => updateLoredeckLibraryFolderDrag(e.clientX, e.clientY);
    loredeckLibraryFolderDragState.onUp = e => finishLoredeckLibraryFolderDrag(e.type !== 'pointercancel');
    loredeckLibraryFolderDragState.onKeyDown = e => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        finishLoredeckLibraryFolderDrag(false);
    };
    window.addEventListener('pointermove', loredeckLibraryFolderDragState.onMove);
    window.addEventListener('pointerup', loredeckLibraryFolderDragState.onUp, { once: true });
    window.addEventListener('pointercancel', loredeckLibraryFolderDragState.onUp, { once: true });
    window.addEventListener('keydown', loredeckLibraryFolderDragState.onKeyDown);
    updateLoredeckLibraryFolderDrag(event.clientX, event.clientY);
}

function getLoredeckLibraryFolderDragTargetIndex(clientY) {
    const state = loredeckLibraryFolderDragState;
    if (!state) return -1;
    const originalIndex = state.originalIndex;
    for (let index = 0; index < state.siblingRows.length; index += 1) {
        const row = state.siblingRows[index];
        if (index === originalIndex || row === state.row) continue;
        const rect = row.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
            return index > originalIndex ? Math.max(0, index - 1) : index;
        }
    }
    return state.siblingRows.length - 1;
}

function updateLoredeckLibraryFolderDrag(clientX, clientY) {
    const state = loredeckLibraryFolderDragState;
    if (!state) return;
    state.lastX = clientX;
    state.lastY = clientY;
    state.ghost.style.transform = `translate3d(${Math.round(clientX - state.offsetX)}px, ${Math.round(clientY - state.offsetY)}px, 0)`;
    const dropList = getLoredeckLibraryDropList(clientX, clientY);
    setLoredeckLibraryDragDropTarget(state, dropList || state.list);
    updateLoredeckLibraryDragAutoScroll(state, clientX, clientY);

    const listRect = state.list.getBoundingClientRect();
    state.reparentToRoot = !!state.parentId && state.dropKind === 'library' && clientX < listRect.left + 48;
    const canReorder = state.dropKind === 'library' && state.dropList === state.list;
    const targetIndex = canReorder ? getLoredeckLibraryFolderDragTargetIndex(clientY) : state.originalIndex;
    state.targetIndex = Number.isFinite(targetIndex) ? targetIndex : state.originalIndex;
    updateLoredeckLibraryDragFeedback(state);
    for (let index = 0; index < state.siblingRows.length; index += 1) {
        const row = state.siblingRows[index];
        if (row === state.row) continue;
        let offset = 0;
        if (canReorder && state.targetIndex > state.originalIndex && index > state.originalIndex && index <= state.targetIndex) {
            offset = -state.shift;
        } else if (canReorder && state.targetIndex < state.originalIndex && index >= state.targetIndex && index < state.originalIndex) {
            offset = state.shift;
        }
        row.style.transform = offset ? `translateY(${offset}px)` : '';
        row.classList.toggle('saga-loredeck-library-stack-card-displaced', !!offset);
    }
}

function finishLoredeckLibraryFolderDrag(commit = true) {
    const state = loredeckLibraryFolderDragState;
    if (!state) return;
    window.removeEventListener('pointermove', state.onMove);
    window.removeEventListener('pointerup', state.onUp);
    window.removeEventListener('pointercancel', state.onUp);
    window.removeEventListener('keydown', state.onKeyDown);
    stopLoredeckLibraryDragAutoScroll(state);
    clearLoredeckLibraryDragDropTargets();
    try {
        state.handle?.releasePointerCapture?.(state.pointerId);
    } catch (_) {
        // Pointer capture may already be released.
    }
    document.body.classList.remove('saga-loredeck-library-stack-dragging');
    state.list.classList.remove('saga-loredeck-library-stack-list-dragging');
    state.row.classList.remove('saga-loredeck-library-stack-card-dragging-source');
    for (const row of state.siblingRows) {
        row.style.transform = '';
        row.classList.remove('saga-loredeck-library-stack-card-displaced');
    }
    state.ghost.remove();
    const { folderId, parentId, originalIndex, targetIndex, dropKind, dropFolderId, libraryIndex, reparentToRoot } = state;
    const canCommit = commit && state.dropValid !== false;
    loredeckLibraryFolderDragState = null;
    if (!canCommit) return;
    if (dropKind === 'stack') {
        addLoredeckFolderToStack(folderId, libraryIndex);
    } else if (dropKind === 'folder' && dropFolderId && dropFolderId !== folderId && dropFolderId !== 'unfiled') {
        if (moveLoredeckLibraryFolder(folderId, dropFolderId, null, libraryIndex)) scheduleLoredeckLibraryOverlayRefresh();
    } else if (dropKind === 'library' && (reparentToRoot || targetIndex !== originalIndex)) {
        if (moveLoredeckLibraryFolder(folderId, reparentToRoot ? '' : parentId, reparentToRoot ? null : targetIndex, libraryIndex)) scheduleLoredeckLibraryOverlayRefresh();
    }
}

function startLoredeckStackDrag(event, stackKey) {
    if (event.button != null && event.button !== 0) return;
    const handle = event.currentTarget;
    const card = handle?.closest?.('.saga-loredeck-library-stack-card');
    const list = card?.closest?.('.saga-loredeck-library-stack-list');
    if (!card || !list) return;
    const cards = [...list.querySelectorAll('.saga-loredeck-library-stack-card')];
    if (!cards.length) return;

    event.preventDefault();
    event.stopPropagation();

    const originalIndex = Number(card.dataset.stackIndex);
    if (!Number.isFinite(originalIndex)) return;
    const key = String(stackKey || card.dataset.stackKey || '').trim();
    if (!key) return;
    const packId = key.startsWith('deck:') ? key.slice(5) : '';

    const rect = card.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(list).rowGap || getComputedStyle(list).gap) || 7;
    const ghost = card.cloneNode(true);
    ghost.classList.add('saga-loredeck-library-stack-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.top)}px, 0)`;
    document.body.appendChild(ghost);

    loredeckStackDragState = {
        dragType: 'stack-item',
        stackKey: key,
        packId,
        packIds: packId && getLoredeckLibraryBulkSelectedIds().includes(packId) ? getLoredeckLibraryBulkSelectedIds() : (packId ? [packId] : []),
        pointerId: event.pointerId,
        handle,
        list,
        card,
        cards,
        ghost,
        originalIndex,
        targetIndex: originalIndex,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        shift: rect.height + gap,
        lastX: event.clientX,
        lastY: event.clientY,
        dropList: list,
        dropKind: 'stack',
        dropFolderId: '',
        dropValid: true,
        dropActionText: '',
        onMove: null,
        onUp: null,
        onKeyDown: null,
        updatePosition: (x, y) => updateLoredeckStackDrag(x, y),
    };

    document.body.classList.add('saga-loredeck-library-stack-dragging');
    list.classList.add('saga-loredeck-library-stack-list-dragging');
    card.classList.add('saga-loredeck-library-stack-card-dragging-source');
    try {
        handle.setPointerCapture?.(event.pointerId);
    } catch (_) {
        // Pointer capture is a progressive enhancement for the drag handle.
    }

    loredeckStackDragState.onMove = e => updateLoredeckStackDrag(e.clientX, e.clientY);
    loredeckStackDragState.onUp = e => finishLoredeckStackDrag(e.type !== 'pointercancel');
    loredeckStackDragState.onKeyDown = e => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        finishLoredeckStackDrag(false);
    };
    window.addEventListener('pointermove', loredeckStackDragState.onMove);
    window.addEventListener('pointerup', loredeckStackDragState.onUp, { once: true });
    window.addEventListener('pointercancel', loredeckStackDragState.onUp, { once: true });
    window.addEventListener('keydown', loredeckStackDragState.onKeyDown);
    updateLoredeckStackDrag(event.clientX, event.clientY);
}

function getLoredeckStackDragTargetIndex(clientY) {
    const state = loredeckStackDragState;
    if (!state) return -1;
    const originalIndex = state.originalIndex;
    for (const card of state.cards) {
        const index = Number(card.dataset.stackIndex);
        if (!Number.isFinite(index) || index === originalIndex) continue;
        const rect = card.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
            return index > originalIndex ? Math.max(0, index - 1) : index;
        }
    }
    return state.cards.length - 1;
}

function updateLoredeckStackDrag(clientX, clientY) {
    const state = loredeckStackDragState;
    if (!state) return;
    state.lastX = clientX;
    state.lastY = clientY;
    const dropList = getLoredeckLibraryDropList(clientX, clientY);
    setLoredeckLibraryDragDropTarget(state, dropList || state.list);
    updateLoredeckLibraryDragAutoScroll(state, clientX, clientY);
    const canReorder = state.dropKind === 'stack' && state.dropList === state.list;
    const targetIndex = canReorder ? getLoredeckStackDragTargetIndex(clientY) : state.originalIndex;
    state.targetIndex = Number.isFinite(targetIndex) ? targetIndex : state.originalIndex;
    state.ghost.style.transform = `translate3d(${Math.round(clientX - state.offsetX)}px, ${Math.round(clientY - state.offsetY)}px, 0)`;
    updateLoredeckLibraryDragFeedback(state);

    for (const card of state.cards) {
        if (card === state.card) continue;
        const index = Number(card.dataset.stackIndex);
        let offset = 0;
        if (canReorder && state.targetIndex > state.originalIndex && index > state.originalIndex && index <= state.targetIndex) {
            offset = -state.shift;
        } else if (canReorder && state.targetIndex < state.originalIndex && index >= state.targetIndex && index < state.originalIndex) {
            offset = state.shift;
        }
        card.style.transform = offset ? `translateY(${offset}px)` : '';
        card.classList.toggle('saga-loredeck-library-stack-card-displaced', !!offset);
    }
}

function finishLoredeckStackDrag(commit = true) {
    const state = loredeckStackDragState;
    if (!state) return;
    window.removeEventListener('pointermove', state.onMove);
    window.removeEventListener('pointerup', state.onUp);
    window.removeEventListener('pointercancel', state.onUp);
    window.removeEventListener('keydown', state.onKeyDown);
    stopLoredeckLibraryDragAutoScroll(state);
    clearLoredeckLibraryDragDropTargets();
    try {
        state.handle?.releasePointerCapture?.(state.pointerId);
    } catch (_) {
        // Pointer capture may already be released by the browser.
    }
    document.body.classList.remove('saga-loredeck-library-stack-dragging');
    state.list.classList.remove('saga-loredeck-library-stack-list-dragging');
    state.card.classList.remove('saga-loredeck-library-stack-card-dragging-source');
    for (const card of state.cards) {
        card.style.transform = '';
        card.classList.remove('saga-loredeck-library-stack-card-displaced');
    }
    state.ghost.remove();
    const { stackKey, packId, packIds, originalIndex, targetIndex, dropKind, dropFolderId } = state;
    const canCommit = commit && state.dropValid !== false;
    loredeckStackDragState = null;
    if (canCommit && dropKind === 'library') {
        if (packIds.length) removeLoredecksFromStack(packIds);
        else removeLoredeckStackItem(stackKey);
    } else if (canCommit && dropKind === 'folder') {
        if (packIds.length) {
            if (moveLoredecksToLibraryFolder(packIds, dropFolderId)) scheduleLoredeckLibraryOverlayRefresh();
        } else if (removeLoredeckStackItem(stackKey)) {
            scheduleLoredeckLibraryOverlayRefresh();
        }
    } else if (canCommit && targetIndex !== originalIndex) {
        reorderLoredeckStackItem(stackKey || createLoredeckStackDeckKey(packId), targetIndex);
    }
}

function getLoredeckLibraryFolderDetailsById(folderId = '', libraryIndex = {}) {
    const id = String(folderId || '').trim();
    if (!id) return null;
    if (id === 'unfiled') {
        return {
            id,
            title: 'Unfiled',
            parentId: '',
            special: true,
            path: ['Unfiled'],
        };
    }
    const folder = (libraryIndex.folders || []).find(item => item.id === id);
    if (!folder) return null;
    return {
        ...folder,
        path: getFolderPath(id, libraryIndex),
    };
}

function getLoredeckLibrarySelectedFolderDetails(libraryIndex = {}) {
    return getLoredeckLibraryFolderDetailsById(loredeckLibrarySelectedFolderDetailsId, libraryIndex);
}

function createLoredeckLibraryDetailsPanel(pack = null, stack = [], canonDb = null, health = null, selectedFolder = null, libraryIndex = getLoredeckLibraryIndexForPacks(), library = getLoredeckLibrary(getState())) {
    const panel = createLoredeckLibraryDetailsPanelBody(pack, stack, canonDb, health, selectedFolder, libraryIndex, library);
    panel.dataset.selectionKey = `${pack?.packId || ''}|${selectedFolder?.id || ''}|${loredeckLibraryDetailsTab}`;
    return panel;
}

function createLoredeckLibraryDetailsPanelBody(pack = null, stack = [], canonDb = null, health = null, selectedFolder = null, libraryIndex = {}, library = []) {
    if (selectedFolder) {
        return createLoredeckLibraryFolderDetailsPanel(selectedFolder, stack, canonDb, health, libraryIndex, library);
    }
    const mobile = isRuntimeMobileShell();
    if (!['overview', 'health'].includes(loredeckLibraryDetailsTab)) {
        loredeckLibraryDetailsTab = 'overview';
    }
    const panel = document.createElement('div');
    panel.className = 'saga-loredeck-library-details';
    markTourTarget(panel, 'loredecks.library.details');
    if (!pack) {
        panel.classList.add('saga-loredeck-library-details-empty');
        panel.appendChild(createEmptyMessage('No Loredecks or Folders Selected'));
        return panel;
    }

    const healthInfo = getLoredeckLibraryPackHealthInfo(pack, canonDb, health);
    const stats = getLoredeckLibraryDeckStats(pack, canonDb, healthInfo);
    const stackItem = stack.find(item => item.packId === pack.packId);

    const identity = document.createElement('div');
    identity.className = 'saga-loredeck-library-detail-identity';
    identity.appendChild(createLoredeckDeckVisual(pack, 'saga-loredeck-library-detail-monogram', {
        usage: 'detail',
        editableCover: true,
        coverLongPressOnly: mobile,
    }));
    const main = document.createElement('div');
    main.className = 'saga-loredeck-library-detail-main';
    main.appendChild(createLoredeckLibraryDetailKicker('Selected Loredeck', 'This Loredeck is selected for Library details and bulk actions.'));
    main.appendChild(createLoredeckLibraryEditableTitle({
        value: pack.title || pack.packId,
        fallback: pack.packId,
        className: 'saga-loredeck-library-detail-title',
        editable: isEditableLoredeckLibraryPack(pack),
        longPressOnly: mobile,
        kind: 'Loredeck',
        onCommit: title => {
            const renamed = renameLoredeckLibraryDeckTitle(pack.packId, title);
            if (renamed) renderLoredeckLibraryOverlay();
            return renamed;
        },
    }));
    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-row-meta';
    chips.appendChild(createStatusPill(getLoredeckLibraryPackTypeLabel(pack), 'Loredeck source type.', { tone: 'source', kind: 'source' }));
    chips.appendChild(createStatusPill(`${stats.entryCount} Lorecards`, 'Approximate Lorecard count.', { kind: 'count' }));
    chips.appendChild(createStatusPill(healthInfo.status.label, healthInfo.status.summary, { tone: healthInfo.tone === 'error' ? 'danger' : (healthInfo.tone === 'warning' ? 'warning' : 'success'), kind: 'severity' }));
    if (stackItem) chips.appendChild(createStatusPill(stackItem.enabled ? `Priority ${stack.findIndex(item => item.packId === pack.packId) + 1}` : 'Stacked disabled', 'Current active stack state.', { tone: stackItem.enabled ? 'selected' : 'muted', kind: stackItem.enabled ? 'count' : 'status' }));
    main.appendChild(chips);
    const desc = document.createElement('div');
    desc.className = 'saga-loredeck-library-detail-description';
    desc.textContent = pack.description || 'No description saved for this Loredeck.';
    main.appendChild(desc);
    identity.appendChild(main);
    panel.appendChild(identity);

    const content = document.createElement('div');
    content.className = 'saga-loredeck-library-detail-content';
    content.appendChild(createLoredeckLibraryDetailTabs());
    const tab = document.createElement('div');
    tab.className = `saga-loredeck-library-detail-tab saga-loredeck-library-detail-tab-${loredeckLibraryDetailsTab}`;
    if (loredeckLibraryDetailsTab === 'health') tab.appendChild(createLoredeckLibraryHealthDetail(pack, healthInfo));
    else tab.appendChild(createLoredeckLibraryOverviewDetail(pack, stackItem, stats, healthInfo));
    content.appendChild(tab);
    panel.appendChild(content);
    return panel;
}

function createLoredeckLibraryFolderDetailsPanel(folder = {}, stack = [], canonDb = null, health = null, libraryIndex = {}, library = []) {
    const mobile = isRuntimeMobileShell();
    const folderId = String(folder.id || '').trim();
    const panel = document.createElement('div');
    panel.className = 'saga-loredeck-library-details saga-loredeck-library-folder-details';
    markTourTarget(panel, 'loredecks.library.details');

    const packs = folderId === 'unfiled'
        ? getLoredeckLibraryFolderScopedPacks(library, libraryIndex, 'unfiled', stack)
        : getLoredeckLibraryFolderPacks(folderId, library, libraryIndex, { includeNested: true });
    const childFolders = folderId === 'unfiled'
        ? []
        : (libraryIndex.folders || []).filter(item => String(item.parentId || '').trim() === folderId);
    const packSummaries = packs.map(pack => {
        const healthInfo = getLoredeckLibraryPackHealthInfo(pack, canonDb, health);
        const stats = getLoredeckLibraryDeckStats(pack, canonDb, healthInfo);
        return {
            pack,
            healthInfo,
            stats,
            tone: getLoredeckLibraryDisplayHealthTone(pack, healthInfo),
        };
    }).sort((a, b) => (Number(b.stats.entryCount) || 0) - (Number(a.stats.entryCount) || 0)
        || String(a.pack.title || a.pack.packId).localeCompare(String(b.pack.title || b.pack.packId)));
    const maxEntries = Math.max(1, ...packSummaries.map(item => Number(item.stats.entryCount) || 0));
    const totalEntries = packSummaries.reduce((sum, item) => sum + (Number(item.stats.entryCount) || 0), 0);
    const warningCount = packSummaries.filter(item => item.tone === 'warning').length;
    const errorCount = packSummaries.filter(item => item.tone === 'error').length;
    const path = Array.isArray(folder.path) && folder.path.length
        ? folder.path
        : getFolderPath(folderId, libraryIndex);

    const identity = document.createElement('div');
    identity.className = 'saga-loredeck-library-detail-identity saga-loredeck-library-folder-detail-identity';
    const visual = document.createElement('div');
    visual.className = 'saga-loredeck-library-detail-monogram saga-loredeck-library-folder-detail-visual';
    visual.appendChild(createLoredeckLibraryFolderCoverStrip(
        folderId === 'unfiled'
            ? packs.filter(getLoredeckLibraryCover).slice(0, LOREDECK_LIBRARY_FOLDER_COVER_MAX_VISIBLE)
            : getLoredeckLibraryFolderCoverPacks(folderId, library, libraryIndex),
        packs.filter(getLoredeckLibraryCover).length
    ));
    identity.appendChild(visual);

    const main = document.createElement('div');
    main.className = 'saga-loredeck-library-detail-main';
    main.appendChild(createLoredeckLibraryDetailKicker(folderId === 'unfiled' ? 'Selected Section' : 'Selected Folder', 'This folder is selected for Library details, movement, and folder actions.'));
    main.appendChild(createLoredeckLibraryEditableTitle({
        value: folder.title || folderId || 'Folder',
        fallback: folderId || 'Folder',
        className: 'saga-loredeck-library-detail-title',
        editable: !!folderId && folderId !== 'unfiled',
        longPressOnly: mobile,
        kind: 'folder',
        onCommit: title => {
            const renamed = renameLoredeckLibraryFolder(folderId, title);
            if (renamed) renderLoredeckLibraryOverlay();
            return renamed;
        },
    }));
    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-row-meta';
    chips.appendChild(createStatusPill(`${childFolders.length} sub-folder${childFolders.length === 1 ? '' : 's'}`, 'Direct child folders in this folder.', { kind: 'count' }));
    chips.appendChild(createStatusPill(`${packs.length} Loredeck${packs.length === 1 ? '' : 's'}`, 'Loredecks contained in this folder, including nested folders.', { kind: 'count' }));
    chips.appendChild(createStatusPill(`${totalEntries} Lorecards`, 'Total Lorecards across contained Loredecks.', { kind: 'count' }));
    if (errorCount) chips.appendChild(createStatusPill(`${errorCount} health error${errorCount === 1 ? '' : 's'}`, 'Contained Loredecks with Pack Health errors.', { tone: 'danger', kind: 'severity' }));
    else if (warningCount) chips.appendChild(createStatusPill(`${warningCount} warning${warningCount === 1 ? '' : 's'}`, 'Contained Loredecks with Pack Health warnings.', { tone: 'warning', kind: 'severity' }));
    else chips.appendChild(createStatusPill('Health clear', 'No visible Pack Health warnings or errors in this folder.', { tone: 'success', kind: 'severity' }));
    main.appendChild(chips);
    const desc = document.createElement('div');
    desc.className = 'saga-loredeck-library-detail-description';
    desc.textContent = path.length ? path.join(' > ') : 'Root Library folder.';
    main.appendChild(desc);

    const selectedIds = getLoredeckLibraryBulkSelectedIds(library);
    main.appendChild(createLoredeckLibraryFolderActionBar(folder, libraryIndex, selectedIds));
    identity.appendChild(main);
    panel.appendChild(identity);

    const content = document.createElement('div');
    content.className = 'saga-loredeck-library-detail-content saga-loredeck-library-folder-detail-content';
    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-detail-grid saga-loredeck-library-folder-summary-grid';
    summary.appendChild(createKeyValue('Path', path.join(' > ') || 'Unfiled', 'Folder path in the Library hierarchy.'));
    summary.appendChild(createKeyValue('Sub-folders', String(childFolders.length), 'Direct nested folders.'));
    summary.appendChild(createKeyValue('Loredecks', String(packs.length), 'Contained Loredecks, including nested folders.'));
    summary.appendChild(createKeyValue('Entries', String(totalEntries), 'Total Lorecards across contained Loredecks.'));
    content.appendChild(summary);

    const listWrap = document.createElement('div');
    listWrap.className = 'saga-loredeck-library-folder-loredeck-list-wrap';
    const listTitle = document.createElement('div');
    listTitle.className = 'saga-runtime-card-title';
    listTitle.textContent = 'Contained Loredecks';
    listWrap.appendChild(listTitle);
    const list = document.createElement('div');
    list.className = 'saga-loredeck-library-folder-loredeck-list';
    if (!packSummaries.length) {
        list.appendChild(createEmptyMessage('This folder does not contain any Loredecks yet.'));
    } else {
        for (const item of packSummaries) {
            list.appendChild(createLoredeckLibraryFolderLoredeckRow(item, maxEntries));
        }
    }
    listWrap.appendChild(list);
    content.appendChild(listWrap);
    panel.appendChild(content);
    return panel;
}

function createLoredeckLibraryFolderActionBar(folder = {}, libraryIndex = {}, selectedIds = []) {
    const folderId = String(folder.id || '').trim();
    const isUnfiled = folderId === 'unfiled';
    const actions = createLoredeckActionRow({ className: 'saga-primary-actions saga-loredeck-library-folder-actions' });

    actions.appendChild(createButton(isUnfiled ? 'New Root Folder' : 'New Subfolder', isUnfiled ? 'Create a new top-level Library folder.' : 'Create a nested folder inside this folder.', () => {
        void promptCreateLoredeckLibraryFolder(isUnfiled ? '' : folderId);
    }, 'saga-loredeck-library-small-button'));

    const move = createButton(selectedIds.length ? `Move Selected Here (${selectedIds.length})` : 'Move Selected Here', selectedIds.length ? 'Move the selected Loredecks into this folder.' : 'Select one or more Loredecks before moving them into this folder.', () => {
        if (!selectedIds.length) return;
        if (moveLoredecksToLibraryFolder(selectedIds, isUnfiled ? 'unfiled' : folderId)) scheduleLoredeckLibraryOverlayRefresh();
    }, 'saga-loredeck-library-small-button');
    move.disabled = !selectedIds.length;
    actions.appendChild(move);

    if (!isUnfiled) {
        actions.appendChild(createButton('Add Folder to Stack', 'Add this folder as a collapsible Stack Group in the active session stack.', () => {
            addLoredeckFolderToStack(folderId, libraryIndex);
        }, 'saga-loredeck-library-small-button'));

        const currentParentId = String(folder.parentId || '').trim();
        const moveWrap = document.createElement('span');
        moveWrap.className = 'saga-loredeck-library-folder-parent-control';
        const parentOptions = getLoredeckLibraryFolderParentOptions(folderId, libraryIndex);
        let syncMoveState = () => {};
        const parentValue = parentOptions.some(([value]) => String(value || '') === currentParentId)
            ? currentParentId
            : '';
        const parentSelect = createLoredeckSelectControl({
            className: 'text_pole saga-loredeck-library-folder-move-select saga-loredeck-library-folder-parent-select',
            tooltip: 'Choose where this folder should live in the Library hierarchy.',
            options: parentOptions,
            value: parentValue,
            fallbackValue: '',
            onChange: () => syncMoveState(),
        });
        moveWrap.appendChild(parentSelect);

        const moveFolder = createButton('Move Folder', 'Move this folder to the selected parent folder without changing its contents.', () => {
            if (parentSelect.value === currentParentId) return;
            if (moveLoredeckLibraryFolder(folderId, parentSelect.value || '', null, libraryIndex)) scheduleLoredeckLibraryOverlayRefresh();
        }, 'saga-loredeck-library-small-button');
        syncMoveState = () => {
            moveFolder.disabled = parentSelect.value === currentParentId;
        };
        syncMoveState();
        moveWrap.appendChild(moveFolder);
        actions.appendChild(moveWrap);

    }
    return actions;
}

function createLoredeckLibraryDetailKicker(label = '', tooltip = '') {
    return createStatusPill(label, tooltip, {
        tone: 'selected',
        kind: 'status',
        density: 'compact',
        className: 'saga-loredeck-library-detail-kicker',
    });
}

function createLoredeckLibraryFolderLoredeckRow(summary = {}, maxEntries = 1) {
    const { pack, stats, healthInfo, tone } = summary;
    const entryCount = Number(stats?.entryCount) || 0;
    const ratio = Math.max(0, Math.min(1, entryCount / Math.max(1, Number(maxEntries) || 1)));
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `saga-loredeck-library-folder-loredeck-row saga-loredeck-library-folder-loredeck-row-${tone || 'unknown'}`;
    addTooltip(row, `Open ${pack.title || pack.packId} details.`);
    row.addEventListener('click', e => {
        e.stopPropagation();
        loredeckLibrarySelectedFolderDetailsId = '';
        handleLoredeckLibraryDeckSelection(pack.packId, null, [pack]);
        refreshLoredeckLibrarySelectionSurfaces();
    });

    const title = document.createElement('span');
    title.className = 'saga-loredeck-library-folder-loredeck-title';
    title.textContent = pack.title || pack.packId;
    row.appendChild(title);

    const meter = document.createElement('span');
    meter.className = 'saga-loredeck-library-folder-loredeck-meter';
    meter.style.setProperty('--saga-folder-loredeck-meter', `${Math.round(ratio * 100)}%`);
    const fill = document.createElement('span');
    fill.className = 'saga-loredeck-library-folder-loredeck-meter-fill';
    meter.appendChild(fill);
    row.appendChild(meter);

    const entries = createStatusPill(String(entryCount), `${entryCount} Lorecards.`, {
        kind: 'count',
        className: 'saga-loredeck-library-folder-loredeck-entry-count',
    });
    row.appendChild(entries);

    const healthLabel = tone === 'error'
        ? `${healthInfo?.errorCount || 0}E`
        : tone === 'warning'
            ? `${healthInfo?.warningCount || 0}W`
            : tone === 'suggestion'
                ? `${healthInfo?.suggestionCount || 0}S`
                : 'OK';
    const health = createStatusPill(healthLabel, healthInfo?.status?.summary || healthInfo?.status?.label || 'Pack Health status.', {
        tone: tone === 'error' ? 'danger' : (tone === 'warning' || tone === 'suggestion' ? 'warning' : 'success'),
        kind: 'severity',
        className: 'saga-loredeck-library-folder-loredeck-health',
    });
    row.appendChild(health);
    return row;
}

function createLoredeckLibraryDetailTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'saga-lore-workbench-mode-tabs saga-loredeck-library-detail-tabs';
    for (const [id, label, tooltip] of [
        ['overview', 'Overview', 'Description, stats, and common Loredeck actions.'],
        ['health', 'Health', 'Pack Health summary and top issue.'],
    ]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `saga-lore-workbench-mode-tab${loredeckLibraryDetailsTab === id ? ' saga-lore-workbench-mode-tab-active' : ''}`;
        btn.textContent = label;
        addTooltip(btn, tooltip);
        btn.addEventListener('click', e => {
            e.stopPropagation();
            loredeckLibraryDetailsTab = id;
            renderLoredeckLibraryOverlay();
        });
        tabs.appendChild(btn);
    }
    return tabs;
}

function createLoredeckLibraryOverviewDetail(pack, stackItem, stats, healthInfo) {
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-library-detail-grid-wrap';
    const grid = document.createElement('div');
    grid.className = 'saga-loredeck-detail-grid';
    grid.appendChild(createKeyValue('Deck ID', pack.packId, 'Stable Loredeck identifier used by the stack and registry.'));
    grid.appendChild(createKeyValue('Fandom', pack.fandom || 'unset', 'Fandom, canon, universe, or setting.'));
    grid.appendChild(createKeyValue('Era', pack.era || 'unset', 'Era, arc, continuity slice, or scope.'));
    grid.appendChild(createKeyValue('Author', pack.author || 'unset', 'Deck author or publisher.'));
    grid.appendChild(createKeyValue('Version', pack.version || 'unset', 'Deck version.'));
    grid.appendChild(createKeyValue('Entries', String(stats.entryCount), 'Approximate Lorecard count.'));
    grid.appendChild(createKeyValue('Files', String(stats.fileCount || 0), 'Manifest file count when known.'));
    grid.appendChild(createKeyValue('Source', getLoredeckSourceSummary(pack), 'Source and update metadata.'));
    wrap.appendChild(grid);
    wrap.appendChild(createLoredeckLibraryDetailActions(pack, stackItem, healthInfo));
    return wrap;
}

function createLoredeckLibraryHealthDetail(pack, healthInfo) {
    const basic = isBasicExperienceMode();
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-library-health-detail';
    const summary = healthInfo.report?.summary || {};
    const grid = document.createElement('div');
    grid.className = 'saga-loredeck-detail-grid';
    grid.appendChild(createKeyValue('Status', healthInfo.status.label, healthInfo.status.summary));
    grid.appendChild(createKeyValue('Errors', String(healthInfo.errorCount), 'Blocking Pack Health findings.'));
    grid.appendChild(createKeyValue('Warnings', String(healthInfo.warningCount), 'Pack Health findings that should be reviewed.'));
    grid.appendChild(createKeyValue('Suggestions', String(healthInfo.suggestionCount), 'Optional Pack Health suggestions.'));
    grid.appendChild(createKeyValue('Checked', String(summary.entryCount || healthInfo.cached.entryCount || 0), 'Lorecards covered by the latest available report.'));
    grid.appendChild(createKeyValue('Last Scan', healthInfo.cached.loadedAt ? formatRelativeHealthTime(healthInfo.cached.loadedAt) : 'not scanned', 'Most recent Pack Health validation cached for this Loredeck.'));
    wrap.appendChild(grid);

    const groups = groupLoredeckHealthIssues(healthInfo.report);
    if (groups.length) {
        const top = document.createElement('div');
        top.className = 'saga-loredeck-health-compact-issues';
        const label = document.createElement('div');
        label.className = 'saga-runtime-card-title';
        label.textContent = 'Top Issue';
        top.appendChild(label);
        const issue = document.createElement('div');
        issue.className = 'saga-loredeck-library-health-top-issue';
        const title = document.createElement('div');
        title.className = 'saga-loredeck-library-health-top-title';
        title.textContent = groups[0].title || 'Pack Health issue';
        issue.appendChild(title);
        const detail = document.createElement('div');
        detail.className = 'saga-runtime-help';
        detail.textContent = groups[0].summary || groups[0].fixShort || (basic
            ? 'Switch to Advanced for grouped findings and repair actions.'
            : 'Open Pack Health Center for grouped findings and repair actions.');
        issue.appendChild(detail);
        issue.appendChild(createStatusPill(groups[0].affectedLabel || `${groups[0].rawCount || 1} finding${(groups[0].rawCount || 1) === 1 ? '' : 's'}`, 'Grouped Pack Health finding count.', { tone: groups[0].severity === 'error' ? 'danger' : (groups[0].severity === 'warning' ? 'warning' : 'info'), kind: 'severity' }));
        top.appendChild(issue);
        wrap.appendChild(top);
    } else {
        wrap.appendChild(createEmptyMessage(healthInfo.health ? 'No Pack Health issues found.' : 'No scan has been run for this Loredeck yet.'));
    }
    const actions = createLoredeckActionRow();
    const validate = createButton('Run Pack Health', 'Load this Loredeck data and run Pack Health validation.', async (btn) => {
        await validateLoredeckForEditor(pack, btn);
        renderLoredeckLibraryOverlay();
    }, basic ? 'saga-primary-button' : '');
    validate.disabled = !canValidateLoredeckInEditor(pack);
    actions.appendChild(validate);
    if (basic) {
        actions.appendChild(createLibraryAdvancedHandoffButton('Advanced Repair Tools'));
    } else {
        actions.appendChild(createButton('Open Pack Health Center', 'Open the fullscreen Pack Health Center for this Loredeck.', () => {
            openLoredeckHealthCenter(pack.packId);
        }, 'saga-primary-button'));
    }
    wrap.appendChild(actions);
    return wrap;
}

function createLoredeckLibraryDependenciesDetail(pack) {
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-library-dependencies-detail';
    const manifest = getCachedLoredeckHealthRecord(pack.packId).manifest || pack.manifestData || {};
    const dependencies = Array.isArray(manifest.dependencies) ? manifest.dependencies : (Array.isArray(pack.dependencies) ? pack.dependencies : []);
    const conflicts = Array.isArray(manifest.conflicts) ? manifest.conflicts : (Array.isArray(pack.conflicts) ? pack.conflicts : []);
    const companions = Array.isArray(manifest.recommendedCompanions) ? manifest.recommendedCompanions : [];
    const addList = (title, items, empty) => {
        const section = document.createElement('div');
        section.className = 'saga-loredeck-library-mini-section';
        const label = document.createElement('div');
        label.className = 'saga-runtime-card-title';
        label.textContent = title;
        section.appendChild(label);
        if (!items.length) section.appendChild(createEmptyMessage(empty));
        else {
            const list = document.createElement('div');
            list.className = 'saga-loredeck-library-simple-list';
            for (const item of items.slice(0, 12)) {
                const row = document.createElement('div');
                row.className = 'saga-loredeck-file-item';
                row.textContent = typeof item === 'string' ? item : (item.title || item.packId || item.id || JSON.stringify(item));
                list.appendChild(row);
            }
            section.appendChild(list);
        }
        wrap.appendChild(section);
    };
    addList('Dependencies', dependencies, 'No dependencies declared.');
    addList('Conflicts', conflicts, 'No conflicts declared.');
    addList('Recommended Companions', companions, 'No companion decks declared.');
    return wrap;
}

function createLoredeckLibraryFilesDetail(pack, healthInfo) {
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-library-files-detail';
    const manifest = healthInfo.cached.manifest || pack.manifestData || {};
    const files = Array.isArray(manifest.files) ? manifest.files.map(file => String(file || '').trim()).filter(Boolean) : [];
    const grid = document.createElement('div');
    grid.className = 'saga-loredeck-detail-grid';
    grid.appendChild(createKeyValue('Manifest', pack.manifest || 'unset', 'Fetchable loredeck.json path or URL.'));
    grid.appendChild(createKeyValue('Files', String(files.length || healthInfo.cached.fileCount || 0), 'Manifest file count when known.'));
    grid.appendChild(createKeyValue('Loaded Files', String(healthInfo.cached.loadedFileCount || 0), 'Files loaded during the latest validation run.'));
    wrap.appendChild(grid);
    const actions = createLoredeckActionRow();
    const inspect = createButton('Inspect Manifest', 'Fetch and preview this Loredeck manifest.', async (btn) => {
        await loadLoredeckManifestPreview(pack, btn);
        renderLoredeckLibraryOverlay();
    }, 'saga-primary-button');
    inspect.disabled = !canValidateLoredeckInEditor(pack);
    actions.appendChild(inspect);
    wrap.appendChild(actions);
    const list = document.createElement('div');
    list.className = 'saga-loredeck-file-list';
    if (!files.length) {
        list.appendChild(createEmptyMessage('No files loaded yet. Inspect the manifest to populate this list.'));
    } else {
        for (const file of files.slice(0, 40)) {
            const item = document.createElement('div');
            item.className = 'saga-loredeck-file-item';
            item.textContent = file;
            list.appendChild(item);
        }
        if (files.length > 40) {
            const more = document.createElement('div');
            more.className = 'saga-loredeck-file-item saga-loredeck-file-item-muted';
            more.textContent = `+${files.length - 40} more files`;
            list.appendChild(more);
        }
    }
    wrap.appendChild(list);
    return wrap;
}

function createLoredeckLibraryDetailActions(pack, stackItem = null, healthInfo = null) {
    const basic = isBasicExperienceMode();
    const actions = createLoredeckActionRow({ className: 'saga-primary-actions saga-loredeck-library-detail-actions' });
    const inStack = !!stackItem;
    const add = createButton(inStack ? (stackItem.enabled ? 'In Stack' : 'Enable Deck') : 'Add to Stack', inStack ? 'This Loredeck is already in the current stack.' : 'Add this Loredeck to the active stack.', () => {
        if (inStack && stackItem.enabled) return;
        if (inStack) setLoredeckEnabled(pack.packId, true);
        else addLoredeckToStack(pack.packId);
    }, inStack && stackItem.enabled ? '' : 'saga-primary-button');
    add.disabled = inStack && stackItem.enabled;
    actions.appendChild(add);
    if (basic) {
        actions.appendChild(createLibraryAdvancedHandoffButton('Advanced Deck Tools'));
    } else {
        actions.appendChild(createButton('Open Loredeck', 'Open this Loredeck in the fullscreen Lorecard viewer and editor.', () => {
            closeLoredeckLibraryWindow();
            openLoredeckWorkbench(pack.packId);
        }, 'saga-primary-button'));
        actions.appendChild(createButton('Open Pack Health Center', 'Open the fullscreen Pack Health Center for this Loredeck.', () => {
            void healthInfo;
            openLoredeckHealthCenter(pack.packId);
        }));
        actions.appendChild(createButton(
            pack.type === 'bundled' ? 'View Metadata' : 'Edit Metadata',
            pack.type === 'bundled'
                ? 'Open the Library metadata window for this read-only Bundled Loredeck.'
                : 'Open the Library metadata editor for this Loredeck.',
            () => openLoredeckMetadataEditor(pack.packId)
        ));
        const exportButton = createButton('Export', 'Export this Loredeck as a .saga-loredeck.zip package.', async (btn) => {
            await exportValidatedLoredeckDraft(pack, btn);
            renderLoredeckLibraryOverlay();
        });
        actions.appendChild(exportButton);
    }
    return actions;
}

export function openLoredeckMetadataEditor(packId = '') {
    if (isBasicExperienceMode()) {
        toast('Switch to Advanced Experience to edit Loredeck metadata.', 'info');
        return;
    }
    const state = getState();
    const library = getLoredeckLibrary(state);
    const id = String(packId || state?.lorePanel?.selectedLoredeckId || '').trim();
    const pack = library.find(item => item.packId === id) || library[0] || null;
    if (!pack) {
        toast('No Loredeck is selected.', 'error');
        return;
    }
    selectLoredeckForDetails(pack.packId, { refresh: false });
    const previousMetadata = document.querySelector('.saga-loredeck-metadata-overlay');
    disposeLoredeckCoverImages(previousMetadata);
    previousMetadata?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'saga-lore-workbench-overlay saga-loredeck-metadata-overlay';
    const close = () => {
        disposeLoredeckCoverImages(overlay);
        overlay.remove();
    };
    wireOverlayBackdropClose(overlay, close);
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-lore-workbench-shell saga-loredeck-metadata-shell';
    overlay.appendChild(shell);

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = pack.type === 'bundled' ? 'Loredeck Metadata' : 'Edit Loredeck Metadata';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = pack.title || pack.packId;
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(createButton('Close', 'Close the Loredeck metadata window.', close));
    shell.appendChild(header);

    const body = document.createElement('div');
    body.className = 'saga-loredeck-metadata-body';
    body.appendChild(createLoredeckMetadataEditorCard(pack));
    shell.appendChild(body);
}

function createLoredeckMetadataEditorCard(pack) {
    const canonDb = getCanonLoreDatabaseSync();
    const health = canonDb?.health || null;
    const healthInfo = getLoredeckLibraryPackHealthInfo(pack, canonDb, health);
    const loadedMeta = (canonDb?.loredecks || []).find(item => item.id === pack.packId);
    const entryCount = loadedMeta?.entryCount ?? pack.entryCount ?? 0;
    const categoryText = formatCategoryCounts(loadedMeta?.categoryCounts || pack.stats?.categoryCounts || {});
    const readOnly = pack.type === 'bundled';
    const virtualDuplicate = isVirtualLoredeckPack(pack);
    const editorCanValidate = canValidateLoredeckInEditor(pack);
    const basic = isBasicExperienceMode();

    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-loredeck-metadata-card';

    const heading = document.createElement('div');
    heading.className = 'saga-loredeck-metadata-heading';
    heading.appendChild(createLoredeckDeckVisual(pack, 'saga-loredeck-library-detail-monogram', { usage: 'detail' }));
    const main = document.createElement('div');
    main.className = 'saga-loredeck-row-main';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-row-title';
    title.textContent = pack.title || pack.packId;
    main.appendChild(title);
    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-row-meta';
    chips.appendChild(createStatusPill(getLoredeckLibraryPackTypeLabel(pack), 'Loredeck source type.', { tone: 'source', kind: 'source' }));
    if (virtualDuplicate) {
        chips.appendChild(createStatusPill(
            pack.type === 'generated' ? 'Generated Draft' : 'Virtual Copy',
            pack.type === 'generated'
                ? 'Generated Loredeck draft with embedded manifest metadata and no source entry files yet.'
                : 'Custom duplicate that uses embedded manifest metadata and resolves files from its source manifest.',
            { tone: pack.type === 'generated' ? 'source' : 'info', kind: 'source' }
        ));
    }
    chips.appendChild(createStatusPill(`${entryCount} Lorecards`, 'Lorecard count from loaded Pack Health or registered metadata.', { kind: 'count' }));
    chips.appendChild(createStatusPill(healthInfo.status?.label || 'Not scanned', 'Pack Health is advisory and does not block use.', { tone: healthInfo.tone === 'error' ? 'danger' : (healthInfo.tone === 'warning' ? 'warning' : (healthInfo.tone === 'ok' ? 'success' : 'muted')), kind: 'severity' }));
    for (const tag of (pack.tags || []).slice(0, 6)) chips.appendChild(createStatusPill(tag, 'Loredeck tag.', { tone: 'tag', kind: 'tag', maxChars: 28 }));
    main.appendChild(chips);
    heading.appendChild(main);
    card.appendChild(heading);

    const overview = document.createElement('div');
    overview.className = 'saga-loredeck-detail-grid';
    overview.appendChild(createKeyValue('Deck ID', pack.packId, 'Stable Loredeck identifier used by the stack and registry.'));
    overview.appendChild(createKeyValue('Fandom', pack.fandom || 'unset', 'Fandom, canon, universe, or setting.'));
    overview.appendChild(createKeyValue('Era', pack.era || 'unset', 'Era, arc, continuity slice, or scope.'));
    overview.appendChild(createKeyValue('Author', pack.author || 'unset', 'Deck author or publisher.'));
    overview.appendChild(createKeyValue('Version', pack.version || 'unset', 'Deck version from metadata or manifest.'));
    overview.appendChild(createKeyValue('Categories', categoryText || 'Not checked', 'Lorecard counts by category when available.'));
    overview.appendChild(createKeyValue(virtualDuplicate ? 'Base Manifest' : 'Manifest', pack.manifest || 'unset', virtualDuplicate ? 'Source manifest used to resolve entry files for this Custom duplicate.' : 'Fetchable loredeck.json path or URL.'));
    overview.appendChild(createKeyValue('Source', getLoredeckSourceSummary(pack), 'Source and update metadata for this Loredeck record.'));
    if (pack.derivedFrom?.packId || pack.derivedFrom?.title) {
        overview.appendChild(createKeyValue('Derived From', pack.derivedFrom.title || pack.derivedFrom.packId, 'Source pack metadata recorded when this Custom Loredeck was duplicated or generated.'));
    }
    card.appendChild(overview);

    const edit = document.createElement('div');
    edit.className = 'saga-loredeck-edit-grid';
    const titleInput = createLoredeckEditorField(edit, 'Title', pack.title, {
        disabled: readOnly,
        tooltip: 'Display title shown in the Loredeck Library and stack.',
    });
    const fandomInput = createLoredeckEditorField(edit, 'Fandom', pack.fandom, {
        disabled: readOnly,
        tooltip: 'Primary fandom or setting label.',
    });
    const eraInput = createLoredeckEditorField(edit, 'Era', pack.era, {
        disabled: readOnly,
        tooltip: 'Era, arc, continuity slice, or scope.',
    });
    const authorInput = createLoredeckEditorField(edit, 'Author', pack.author, {
        disabled: readOnly,
        tooltip: 'Deck creator or publisher.',
    });
    const versionInput = createLoredeckEditorField(edit, 'Version', pack.version, {
        disabled: readOnly,
        tooltip: 'Deck metadata version.',
    });
    const manifestInput = createLoredeckEditorField(edit, virtualDuplicate ? 'Base Manifest' : 'Manifest', pack.manifest, {
        disabled: readOnly || virtualDuplicate,
        tooltip: virtualDuplicate
            ? 'Virtual Custom duplicates keep their source manifest as the file-resolution base.'
            : 'Fetchable loredeck.json path or URL. Entry paths resolve relative to this manifest.',
    });
    const tagsInput = createLoredeckEditorField(edit, 'Tags', (pack.tags || []).join(', '), {
        disabled: readOnly,
        tooltip: 'Comma-separated metadata tags. Tags are first-class Saga metadata.',
    });
    const descriptionInput = createLoredeckEditorField(edit, 'Description', pack.description, {
        disabled: readOnly,
        multiline: true,
        full: true,
        tooltip: 'Short library description shown on the Loredeck card.',
    });
    card.appendChild(edit);

    const actions = createLoredeckActionRow();
    const inspectButton = createButton('Inspect Manifest', 'Fetch and preview this Loredeck manifest.', async (btn) => {
        await loadLoredeckManifestPreview(pack, btn);
        openLoredeckMetadataEditor(pack.packId);
    }, 'saga-primary-button');
    inspectButton.disabled = !editorCanValidate;
    actions.appendChild(inspectButton);

    const validateButton = createButton('Run Pack Health', 'Load this Loredeck data and run Pack Health validation with the same rules used at runtime.', async (btn) => {
        await validateLoredeckForEditor(pack, btn);
        openLoredeckMetadataEditor(pack.packId);
        renderLoredeckLibraryOverlay();
    });
    validateButton.disabled = !editorCanValidate;
    actions.appendChild(validateButton);

    if (!basic) {
        actions.appendChild(createButton('Open Pack Health Center', 'Open the fullscreen Pack Health Center for this Loredeck.', () => {
            openLoredeckHealthCenter(pack.packId);
        }));
    }
    actions.appendChild(createButton('Duplicate', 'Create an editable Custom Loredeck copy.', () => {
        openDuplicateLoredeckDialog(pack);
    }));
    if (isGeneratedLoredeckPack(pack)) {
        const generatedReadiness = getGeneratedLoredeckExportReadiness(pack);
        const readinessBlocker = generatedReadiness?.ready === false
            ? String(generatedReadiness.blockers?.[0] || 'Resolve Generated Loredeck readiness before finalizing as Custom.')
            : '';
        const finalizeButton = createButton('Finalize as Custom', readinessBlocker || 'Validate this reviewed Generated Loredeck and create a normal editable Custom copy.', async (btn) => {
            await finalizeGeneratedLoredeckAsCustom(pack, btn);
        }, 'saga-primary-button');
        finalizeButton.disabled = !editorCanValidate || generatedReadiness?.ready === false;
        actions.appendChild(finalizeButton);
        if (readinessBlocker) {
            if (generatedReadiness.coverageAcknowledgementRequired) {
                actions.appendChild(createButton('Open Coverage Plan', 'Open the linked Deck Maker project at its adaptive coverage review.', () => {
                    openLoredeckCreatorWorkbench({ generatedPackId: pack.packId, anchor: 'coverage-plan' });
                }, 'saga-primary-button'));
            }
            const note = document.createElement('div');
            note.className = 'saga-runtime-help';
            note.textContent = `Finalization waits: ${readinessBlocker}`;
            actions.appendChild(note);
        }
    }

    if (!readOnly && !basic) {
        actions.appendChild(createButton('Save Metadata', 'Save edited Custom Loredeck library metadata.', async (btn) => {
            await saveLoredeckMetadataFromInputs(pack, {
                titleInput,
                descriptionInput,
                fandomInput,
                eraInput,
                authorInput,
                versionInput,
                manifestInput,
                tagsInput,
            }, btn);
            openLoredeckMetadataEditor(pack.packId);
            renderLoredeckLibraryOverlay();
        }, 'saga-primary-button'));

        const syncButton = createButton('Sync From Manifest', 'Fetch the manifest and refresh this library record from its metadata.', async (btn) => {
            await syncLoredeckMetadataFromManifest(pack, btn);
            openLoredeckMetadataEditor(pack.packId);
            renderLoredeckLibraryOverlay();
        });
        syncButton.disabled = !pack.manifest;
        actions.appendChild(syncButton);

        const repairButton = createButton('Attempt Fixing', 'Apply deterministic Pack Health fixes and save remaining model or review work.', async (btn) => {
            await attemptLoredeckHealthFixes(pack, btn);
            openLoredeckMetadataEditor(pack.packId);
            renderLoredeckLibraryOverlay();
        });
        repairButton.disabled = !editorCanValidate;
        actions.appendChild(repairButton);

        const exportButton = createButton('Export Package', 'Export this Loredeck record as a .saga-loredeck.zip package.', async (btn) => {
            await exportValidatedLoredeckDraft(pack, btn);
        });
        actions.appendChild(exportButton);
    } else if (!basic && readOnly) {
        actions.appendChild(createButton('Export Package', 'Export this Bundled Loredeck as a .saga-loredeck.zip package.', async (btn) => {
            await exportValidatedLoredeckDraft(pack, btn);
        }));
        const note = document.createElement('div');
        note.className = 'saga-runtime-help';
        note.textContent = 'Bundled Loredeck metadata is read-only. You can still export the deck package.';
        actions.appendChild(note);
    } else {
        actions.appendChild(createLibraryAdvancedHandoffButton('Switch to Advanced'));
        const note = document.createElement('div');
        note.className = 'saga-runtime-help';
        note.textContent = 'Switch to Advanced Experience to edit metadata, export packages, or run repair actions.';
        actions.appendChild(note);
    }
    card.appendChild(actions);

    const readiness = createGeneratedLoredeckExportReadinessCard(pack);
    if (readiness) card.appendChild(readiness);
    card.appendChild(createLoredeckManifestPreview(pack));
    if (!readOnly) card.appendChild(createLoredeckEntryOverrideCard(pack));
    return card;
}

function getLoredeckLibrarySelectedPack(state = getState(), library = getLoredeckLibrary(state)) {
    const selectedId = String(state?.lorePanel?.selectedLoredeckId || '').trim();
    return selectedId ? (library.find(pack => pack.packId === selectedId) || null) : null;
}

export function getLoredeckLibraryStackStats(stack = [], library = [], canonDb = null, health = null, libraryIndex = getLoredeckLibraryIndexForPacks(getState(), library)) {
    const enabledItems = stack.filter(item => item.enabled);
    const packMap = new Map(library.map(pack => [pack.packId, pack]));
    const resolved = resolveLoredeckStackItems(stack, libraryIndex, {
        packs: Object.fromEntries(packMap.entries()),
    });
    const enabled = resolved.stack || [];
    let entryCount = 0;
    for (const item of enabled) {
        const pack = packMap.get(item.packId) || { packId: item.packId };
        entryCount += getLoredeckLibraryDeckStats(pack, canonDb, getLoredeckLibraryPackHealthInfo(pack, canonDb, health)).entryCount || 0;
    }
    const summary = health?.summary || {};
    return {
        activeCount: enabled.length,
        stackItemCount: enabledItems.length,
        folderGroupCount: enabledItems.filter(item => getLoredeckStackItemType(item) === 'folder').length,
        duplicateCount: Number(resolved.summary?.duplicateCount) || 0,
        missingCount: Number(resolved.summary?.missingCount) || 0,
        entryCount,
        errorCount: Number(summary.errorCount) || 0,
        warningCount: Number(summary.warningCount) || 0,
        suggestionCount: Number(summary.suggestionCount) || 0,
    };
}

function getFilteredLoredeckLibraryPacks(library = [], stack = [], canonDb = null, health = null, libraryIndex = getLoredeckLibraryIndexForPacks(getState(), library), registry = getLoredeckLibraryRegistry(getState())) {
    const query = normalizeLoredeckLibrarySearchQuery();
    const filtered = library.filter(pack => {
        if (!query) return true;
        return getLoredeckLibraryPackSearchText(pack, libraryIndex).includes(query);
    });
    return sortLoredeckLibraryPacks(filtered, {
        sortMode: loredeckLibrarySort,
        registry,
        getHealthTone: pack => getLoredeckLibraryDisplayHealthTone(pack, getLoredeckLibraryPackHealthInfo(pack, canonDb, health)),
        getEntryCount: pack => getLoredeckLibraryDeckStats(pack, canonDb, getLoredeckLibraryPackHealthInfo(pack, canonDb, health)).entryCount,
    });
}

function isHealthForLoredeckPack(packId = '', health = null) {
    const id = String(packId || '').trim();
    return !!id && !!health && String(health.packId || '').trim() === id;
}

function getLoredeckPackScopedIssues(issues = [], packId = '') {
    const id = String(packId || '').trim();
    if (!id || !Array.isArray(issues)) return [];
    return issues.filter(issue => String(issue?.packId || '').trim() === id);
}

export function buildLoredeckPackScopedHealth(pack = {}, loadedMeta = null, stackHealth = null) {
    const packId = String(pack?.packId || loadedMeta?.id || '').trim();
    if (!packId || !stackHealth || isHealthForLoredeckPack(packId, stackHealth)) {
        return isHealthForLoredeckPack(packId, stackHealth) ? stackHealth : null;
    }
    const errors = getLoredeckPackScopedIssues(stackHealth.errors, packId);
    const warnings = getLoredeckPackScopedIssues(stackHealth.warnings, packId);
    const suggestions = getLoredeckPackScopedIssues(stackHealth.suggestions, packId);
    const entryCount = Number(loadedMeta?.entryCount) || Number(pack.stats?.entryCount) || Number(pack.entryCount) || 0;
    const categoryCounts = loadedMeta?.categoryCounts && typeof loadedMeta.categoryCounts === 'object' && !Array.isArray(loadedMeta.categoryCounts)
        ? { ...loadedMeta.categoryCounts }
        : (pack.stats?.categoryCounts && typeof pack.stats.categoryCounts === 'object' && !Array.isArray(pack.stats.categoryCounts) ? { ...pack.stats.categoryCounts } : {});
    return {
        schemaVersion: 1,
        packId,
        generatedAt: stackHealth.generatedAt || Date.now(),
        status: errors.length ? 'has_errors' : (warnings.length ? 'needs_review' : 'good'),
        errors,
        warnings,
        suggestions,
        summary: {
            entryCount,
            fileCount: Number(loadedMeta?.fileCount) || 0,
            loadedFileCount: Number(loadedMeta?.loadedFileCount) || 0,
            categoryCounts,
            errorCount: errors.length,
            warningCount: warnings.length,
            suggestionCount: suggestions.length,
        },
    };
}

export function getLoredeckPackSummaryCounts(pack = {}, cached = {}, loadedMeta = null, health = null, report = null) {
    const packId = String(pack?.packId || loadedMeta?.id || '').trim();
    const healthSummary = isHealthForLoredeckPack(packId, health) ? (health.summary || {}) : {};
    const reportSummary = report?.databaseId === packId ? (report.summary || {}) : {};
    const manifest = cached?.manifest || pack.manifestData || {};
    return {
        entryCount: Number(healthSummary.entryCount)
            || Number(loadedMeta?.entryCount)
            || Number(cached?.entryCount)
            || Number(reportSummary.entryCount)
            || Number(pack.stats?.entryCount)
            || Number(pack.entryCount)
            || 0,
        fileCount: Number(healthSummary.fileCount)
            || Number(loadedMeta?.fileCount)
            || Number(cached?.fileCount)
            || Number(reportSummary.fileCount)
            || countLoredeckManifestFiles(manifest)
            || Number(pack.stats?.fileCount)
            || 0,
        loadedFileCount: Number(healthSummary.loadedFileCount)
            || Number(loadedMeta?.loadedFileCount)
            || Number(cached?.loadedFileCount)
            || Number(reportSummary.loadedFileCount)
            || 0,
        categoryCounts: healthSummary.categoryCounts
            || loadedMeta?.categoryCounts
            || pack.stats?.categoryCounts
            || reportSummary.categoryCounts
            || {},
    };
}

function getLoredeckLibraryPackHealthInfo(pack = {}, canonDb = null, stackHealth = null) {
    const memo = loredeckLibraryRenderSnapshot?.healthByPack;
    const previous = memo?.get(pack);
    if (previous?.canonDb === canonDb && previous.stackHealth === stackHealth) return previous.value;
    const cached = getCachedLoredeckHealthRecord(pack.packId);
    const loadedMeta = (canonDb?.loredecks || []).find(item => item.id === pack.packId) || null;
    const health = cached.health || buildLoredeckPackScopedHealth(pack, loadedMeta, loadedMeta ? stackHealth : null);
    // Row badges need only this deck's cached report, never a stack-wide scan.
    const report = {
        schemaVersion: 1,
        generatedAt: health?.generatedAt || cached.loadedAt || 0,
        scanned: !!health,
        status: health?.status || 'unknown',
        summary: health?.summary || {},
        errors: Array.isArray(health?.errors) ? health.errors : [],
        warnings: Array.isArray(health?.warnings) ? health.warnings : [],
        suggestions: Array.isArray(health?.suggestions) ? health.suggestions : [],
    };
    const counts = getLoredeckPackSummaryCounts(pack, cached, loadedMeta, health, report);
    report.packs = [buildLoredeckHealthPackSummary(pack, cached, health)];
    report.enabledPackIds = loadedMeta ? [pack.packId] : [];
    report.databaseId = pack.packId;
    report.summary = {
        ...(report.summary || {}),
        entryCount: counts.entryCount,
        fileCount: counts.fileCount,
        loadedFileCount: counts.loadedFileCount,
        categoryCounts: counts.categoryCounts,
    };
    const status = getLoredeckHealthStatusDescriptor(report, health);
    const summary = report.summary || {};
    const value = {
        cached,
        loadedMeta,
        health,
        report,
        status,
        errorCount: Number(summary.errorCount) || 0,
        warningCount: Number(summary.warningCount) || 0,
        suggestionCount: Number(summary.suggestionCount) || 0,
        issueCount: (Number(summary.errorCount) || 0) + (Number(summary.warningCount) || 0) + (Number(summary.suggestionCount) || 0),
    };
    memo?.set(pack, { canonDb, stackHealth, value });
    return value;
}

function isUnscannedBundledLoredeckDisplay(pack = {}, healthInfo = null) {
    return (pack.type === 'bundled' || isBundledLoredeckLibraryPack(pack))
        && healthInfo?.status?.tone === 'unknown'
        && !healthInfo.health
        && !healthInfo.cached?.health;
}

function getLoredeckLibraryDisplayHealthTone(pack = {}, healthInfo = null) {
    if (isUnscannedBundledLoredeckDisplay(pack, healthInfo)) return 'ok';
    return healthInfo?.status?.tone || 'unknown';
}

function getLoredeckLibraryDisplayIssueCount(pack = {}, healthInfo = null) {
    if (isUnscannedBundledLoredeckDisplay(pack, healthInfo)) return 0;
    return Number(healthInfo?.issueCount) || 0;
}

function getLoredeckLibraryDeckStats(pack = {}, canonDb = null, healthInfo = null) {
    const info = healthInfo || getLoredeckLibraryPackHealthInfo(pack, canonDb, canonDb?.health || null);
    const memo = loredeckLibraryRenderSnapshot?.statsByPack;
    const previous = memo?.get(pack);
    if (previous?.canonDb === canonDb && previous.info === info) return previous.value;
    const loadedMeta = info.loadedMeta || (canonDb?.loredecks || []).find(item => item.id === pack.packId) || null;
    const counts = getLoredeckPackSummaryCounts(pack, info.cached || {}, loadedMeta, info.health, info.report);
    const categoryCounts = counts.categoryCounts || {};
    const tagCount = getLoredeckTagRegistryCount(pack.tagRegistry) || (Array.isArray(pack.tags) ? pack.tags.length : 0);
    const timelineCount = getLoredeckTimelineRegistryCount(pack.timelineRegistry);
    const updatedAt = Number(pack.updatedAt) || Number(pack.installedAt) || 0;
    const value = {
        entryCount: counts.entryCount,
        fileCount: counts.fileCount,
        tagCount,
        timelineCount,
        categoryCounts,
        updatedAt,
        updatedLabel: updatedAt ? `Updated ${formatRelativeHealthTime(updatedAt)}` : 'Not updated',
    };
    memo?.set(pack, { canonDb, info, value });
    return value;
}

function getLoredeckMonogram(pack = {}) {
    const title = String(pack.title || pack.packId || '').trim();
    const words = title.split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (!words.length) return 'LD';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function setLoredeckDeckVisualFallback(visual, pack = {}) {
    visual.classList.remove('saga-loredeck-library-visual-cover', 'saga-loredeck-library-visual-contain');
    visual.classList.add('saga-loredeck-library-visual-fallback');
    visual.replaceChildren();
    const text = document.createElement('span');
    text.className = 'saga-loredeck-library-visual-fallback-text';
    text.textContent = getLoredeckMonogram(pack);
    visual.appendChild(text);
}

function createLoredeckCoverActionButton(kind = 'import', tooltip = '', handler = null) {
    const normalized = kind === 'remove' ? 'remove' : 'import';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `saga-loredeck-library-cover-action saga-loredeck-library-cover-action-${normalized}`;
    btn.setAttribute('aria-label', tooltip || (normalized === 'remove' ? 'Remove cover image.' : 'Import cover image.'));
    if (normalized === 'import') {
        btn.classList.add('saga-loredeck-library-title-edit-mark');
    } else {
        btn.textContent = 'x';
    }
    addTooltip(btn, tooltip);
    btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        hideFloatingTooltip();
        handler?.(btn, e);
    });
    return btn;
}

function createLoredeckCoverActionOverlay(pack = {}, cover = null) {
    if (!isEditableLoredeckLibraryPack(pack)) return null;
    const actions = document.createElement('div');
    actions.className = 'saga-loredeck-library-cover-actions';
    actions.appendChild(createLoredeckCoverActionButton('import', 'Import a cover image for this Custom Loredeck.', btn => {
        importLoredeckCoverImageFromFile(pack.packId, btn);
    }));
    if (cover) {
        actions.appendChild(createLoredeckCoverActionButton('remove', 'Remove this cover image and return to the text fallback.', btn => {
            removeLoredeckCoverImage(pack.packId, btn);
        }));
    }
    return actions;
}

export function createLoredeckDeckVisual(pack = {}, className = 'saga-loredeck-library-monogram', options = {}) {
    const visual = document.createElement('div');
    visual.className = `${className} saga-loredeck-library-visual`;
    const cover = getLoredeckLibraryCover(pack);
    const coverLongPressOnly = options.editableCover === true && options.coverLongPressOnly === true && isEditableLoredeckLibraryPack(pack);
    const coverActions = options.editableCover && !coverLongPressOnly ? createLoredeckCoverActionOverlay(pack, cover) : null;
    if (coverLongPressOnly) {
        visual.classList.add('saga-loredeck-library-visual-longpress-editable');
        visual.tabIndex = 0;
        visual.setAttribute('role', 'button');
        visual.setAttribute('aria-label', `Long-press to edit ${pack.title || pack.packId || 'this Loredeck'} cover image.`);
        attachLoredeckLibraryLongPressAction(visual, event => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            importLoredeckCoverImageFromFile(pack.packId);
        }, { triggerOnRelease: true });
        visual.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            importLoredeckCoverImageFromFile(pack.packId);
        });
    }
    if (cover) {
        const img = document.createElement('img');
        img.alt = cover.alt || `${pack.title || pack.packId || 'Loredeck'} cover`;
        img.draggable = false;
        if (cover.focalPoint) {
            img.style.objectPosition = `${Math.round(cover.focalPoint.x * 100)}% ${Math.round(cover.focalPoint.y * 100)}%`;
        }
        visual.classList.add('saga-loredeck-library-visual-cover');
        if (cover.fit === 'contain') visual.classList.add('saga-loredeck-library-visual-contain');
        visual.appendChild(img);
        if (coverActions) visual.appendChild(coverActions);
        bindLoredeckCoverImage(visual, img, pack, {
            usage: options.usage === 'list' ? 'list' : 'detail',
            resolvedCover: cover,
            onOriginalError() {
                setLoredeckDeckVisualFallback(visual, pack);
                if (coverActions) visual.appendChild(coverActions);
            },
        });
        addTooltip(visual, coverLongPressOnly ? 'Long-press to replace this cover image.' : (cover.title || cover.alt || `${pack.title || pack.packId} Deck Cover.`));
        return visual;
    }
    setLoredeckDeckVisualFallback(visual, pack);
    if (coverActions) visual.appendChild(coverActions);
    addTooltip(visual, coverLongPressOnly
        ? 'Long-press to add a cover image.'
        : `${pack.title || pack.packId || 'Loredeck'} monogram fallback.${isEditableLoredeckLibraryPack(pack) ? ' Import a cover image from this details panel.' : ' Duplicate as Custom to add a cover image.'}`);
    return visual;
}

function readLoredeckCoverFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Choose an image file.'));
            return;
        }
        const type = String(file.type || '').toLowerCase();
        const name = String(file.name || '').toLowerCase();
        if (!type.startsWith('image/') && !/\.(png|jpe?g|webp|gif)$/i.test(name)) {
            reject(new Error('Loredeck covers must be image files.'));
            return;
        }
        if (Number(file.size) > LOREDECK_COVER_INPUT_MAX_BYTES) {
            reject(new Error('Cover image is too large. Choose an image under 12 MB.'));
            return;
        }
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(String(reader.result || '')));
        reader.addEventListener('error', () => reject(reader.error || new Error('Could not read cover image.')));
        reader.readAsDataURL(file);
    });
}

function loadLoredeckCoverImage(dataUrl = '') {
    return new Promise((resolve, reject) => {
        const src = String(dataUrl || '').trim();
        if (!src) {
            reject(new Error('Cover image data could not be normalized.'));
            return;
        }
        if (!/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(src)) {
            reject(new Error('Cover image type could not be decoded.'));
            return;
        }
        const img = new Image();
        img.decoding = 'async';
        img.addEventListener('load', () => resolve(img), { once: true });
        img.addEventListener('error', () => reject(new Error('Cover image could not be decoded.')), { once: true });
        img.src = src;
    });
}

function encodeLoredeckCoverCanvas(canvas) {
    let dataUrl = canvas.toDataURL('image/webp', LOREDECK_COVER_OUTPUT_QUALITY);
    if (/^data:image\/webp;base64,/i.test(dataUrl)) {
        return { dataUrl, mimeType: 'image/webp' };
    }
    dataUrl = canvas.toDataURL('image/jpeg', LOREDECK_COVER_OUTPUT_QUALITY);
    if (/^data:image\/jpe?g;base64,/i.test(dataUrl)) {
        return { dataUrl, mimeType: 'image/jpeg' };
    }
    dataUrl = canvas.toDataURL('image/png');
    return { dataUrl, mimeType: 'image/png' };
}

async function buildLoredeckCoverAssetFromFile(file, pack = {}) {
    const source = await readLoredeckCoverFileAsDataUrl(file);
    const img = await loadLoredeckCoverImage(source);
    const naturalWidth = Number(img.naturalWidth || img.width) || 0;
    const naturalHeight = Number(img.naturalHeight || img.height) || 0;
    if (!naturalWidth || !naturalHeight) throw new Error('Cover image has no readable dimensions.');
    const scale = Math.min(1, LOREDECK_COVER_MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
    let width = Math.max(1, Math.round(naturalWidth * scale));
    let height = Math.max(1, Math.round(naturalHeight * scale));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser could not prepare the cover image.');
    let encoded = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        encoded = encodeLoredeckCoverCanvas(canvas);
        if (encoded.dataUrl.length <= LOREDECK_COVER_OUTPUT_MAX_CHARS || Math.max(width, height) <= 320) break;
        const shrink = Math.max(0.55, Math.min(0.86, Math.sqrt(LOREDECK_COVER_OUTPUT_MAX_CHARS / encoded.dataUrl.length) * 0.92));
        width = Math.max(1, Math.round(width * shrink));
        height = Math.max(1, Math.round(height * shrink));
    }
    if (!encoded?.dataUrl || encoded.dataUrl.length > LOREDECK_COVER_OUTPUT_MAX_CHARS * 1.2) {
        throw new Error('Cover image could not be compacted enough for Library storage.');
    }
    const title = String(file?.name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    return {
        path: encoded.dataUrl,
        mimeType: encoded.mimeType,
        fit: 'contain',
        aspect: `${width}:${height}`,
        width,
        height,
        title: title.slice(0, 160),
        alt: `${pack.title || pack.packId || 'Loredeck'} cover`,
        updatedAt: Date.now(),
    };
}

async function getHydratedEditableLoredeckLibraryPack(packId = '', fallback = null) {
    const pack = getFreshLoredeckLibraryPack(packId, fallback);
    if (!pack) {
        toast('That Loredeck is no longer available.', 'warning');
        return null;
    }
    if (!isEditableLoredeckLibraryPack(pack)) {
        toast('Bundled Loredecks are read-only. Duplicate as Custom first.', 'warning');
        return null;
    }
    try {
        const hydrated = await hydrateLoredeckPayloadRecord(pack);
        return getFreshLoredeckLibraryPack(packId, hydrated) || hydrated || pack;
    } catch (error) {
        console.warn('[Saga] Loredeck cover payload load failed:', error);
        toast(error?.message || 'Loredeck payload could not be loaded before saving the cover image.', 'error');
        return null;
    }
}

async function saveLoredeckCoverImageAsset(packId = '', asset = null, message = '') {
    const pack = await getHydratedEditableLoredeckLibraryPack(packId);
    if (!pack) return false;
    const saved = persistLoredeckLibraryRecordMutation(pack, next => {
        const assets = next.assets && typeof next.assets === 'object' && !Array.isArray(next.assets)
            ? { ...next.assets }
            : {};
        const clearDirectCoverPointers = () => {
            delete next.cover;
            delete next.coverImage;
            delete next.coverFile;
            delete next.coverPath;
            if (next.assetRefs && typeof next.assetRefs === 'object' && !Array.isArray(next.assetRefs)) {
                const assetRefs = { ...next.assetRefs };
                delete assetRefs.cover;
                if (Object.keys(assetRefs).length) next.assetRefs = assetRefs;
                else delete next.assetRefs;
            }
            if (!next.assetRefs) next.assetRefs = {};
        };
        const setManifestCoverAsset = nextAsset => {
            if (!next.manifestData || typeof next.manifestData !== 'object' || Array.isArray(next.manifestData)) return;
            const manifestAssets = next.manifestData.assets && typeof next.manifestData.assets === 'object' && !Array.isArray(next.manifestData.assets)
                ? { ...next.manifestData.assets }
                : {};
            if (nextAsset) {
                manifestAssets.cover = nextAsset;
                delete manifestAssets.deckCover;
                next.manifestData = {
                    ...next.manifestData,
                    assets: manifestAssets,
                };
                return;
            }
            delete manifestAssets.cover;
            delete manifestAssets.deckCover;
            if (Object.keys(manifestAssets).length) {
                next.manifestData = {
                    ...next.manifestData,
                    assets: manifestAssets,
                };
            } else {
                next.manifestData = { ...next.manifestData };
                delete next.manifestData.assets;
            }
        };
        clearDirectCoverPointers();
        if (asset) {
            assets.cover = asset;
            delete assets.deckCover;
            setManifestCoverAsset(asset);
        } else {
            delete assets.cover;
            delete assets.deckCover;
            setManifestCoverAsset(null);
        }
        if (Object.keys(assets).length) next.assets = assets;
        else next.assets = {};
    }, message, {
        errorMessage: 'Loredeck cover save failed.',
        refreshSurfaces: false,
    });
    if (!saved) return false;
    try {
        const flushed = await flushLoredeckPayloadWrites();
        if (!flushed?.ok) {
            const error = String(flushed?.error || '').trim();
            toast(error || 'Loredeck cover image could not be written to storage.', 'error');
            return false;
        }
    } catch (error) {
        console.warn('[Saga] Loredeck cover storage flush failed:', error);
        toast(error?.message || 'Loredeck cover image could not be written to storage.', 'error');
        return false;
    }
    refreshLoredeckSurfaces({ clearCanon: true, clearContext: true, preserveScroll: true, preserveWindowScroll: true });
    return true;
}

function importLoredeckCoverImageFromFile(packId = '', button = null) {
    const pack = getFreshLoredeckLibraryPack(packId);
    if (!pack) {
        toast('That Loredeck is no longer available.', 'warning');
        return;
    }
    if (!isEditableLoredeckLibraryPack(pack)) {
        toast('Bundled Loredecks are read-only. Duplicate as Custom first.', 'warning');
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (button) button.disabled = true;
        try {
            const fresh = getFreshLoredeckLibraryPack(packId, pack) || pack;
            const asset = await buildLoredeckCoverAssetFromFile(file, fresh);
            await saveLoredeckCoverImageAsset(packId, asset, '');
        } catch (e) {
            toast(e?.message || 'Cover image import failed.', 'error');
        } finally {
            if (button) button.disabled = false;
        }
    }, { once: true });
    input.click();
}

async function removeLoredeckCoverImage(packId = '', button = null) {
    if (button) button.disabled = true;
    try {
        await saveLoredeckCoverImageAsset(packId, null, '');
    } finally {
        if (button) button.disabled = false;
    }
}

export const __loredeckLibraryPanelTestHooks = Object.freeze({
    getLoredeckLibraryTransferActionModel,
    getHydratedEditableLoredeckLibraryPack,
    saveLoredeckCoverImageAsset,
});

function addLoredecksToStack(packIds = []) {
    const ids = Array.from(new Set((packIds || []).map(id => String(id || '').trim()).filter(Boolean)));
    if (!ids.length) return false;
    const changed = commitLoredeckStackMutation(stack => {
        for (const packId of ids) {
            const existing = stack.find(item => getLoredeckStackItemKey(item) === createLoredeckStackDeckKey(packId));
            if (existing) {
                existing.enabled = true;
                continue;
            }
            stack.push({
                type: 'deck',
                packId,
                enabled: true,
                priority: 1,
                locked: false,
                addedAt: Date.now(),
            });
        }
    });
    return changed;
}

function clearLoredeckStack() {
    const changed = commitLoredeckStackMutation(stack => {
        stack.splice(0, stack.length);
    });
    return changed;
}

export function getMutableLoredeckLibraryRegistry() {
    const registry = getLoredeckLibraryRegistry(getState());
    return { settings: getSettings(), registry };
}

function persistLoredeckLibraryRegistryLayout(registry = {}) {
    const result = persistLoredeckLibraryLayout(registry);
    if (!result?.ok) {
        if (result?.error) toast(result.error, 'warning');
        return false;
    }
    return true;
}

function reorderLoredeckInLibrary(packId, targetIndex, visiblePacks = []) {
    const { registry } = getMutableLoredeckLibraryRegistry();
    const result = reorderLoredeckLibraryPlacements({ packId, targetIndex, visiblePacks, registry });
    if (!result.ok) return false;
    if (!persistLoredeckLibraryRegistryLayout(result.registry)) return false;
    loredeckLibrarySort = 'manual';
    return true;
}

function moveLoredecksToLibraryFolder(packIds = [], folderId = '') {
    const state = getState();
    const library = getLoredeckLibrary(state);
    const libraryIndex = getLoredeckLibraryIndexForPacks(state, library);
    const { registry } = getMutableLoredeckLibraryRegistry();
    const result = moveLoredecksToLibraryFolderPlacement({ packIds, folderId, library, libraryIndex, registry });
    if (!result.ok) {
        if (result.error) toast(result.error, 'warning');
        return false;
    }
    if (!persistLoredeckLibraryRegistryLayout(result.registry)) return false;
    loredeckLibrarySelectedFolderId = result.targetFolderId || 'unfiled';
    loredeckLibrarySort = 'name';
    selectLoredeckForDetails(result.validIds[0], { refresh: false });
    setLoredeckLibraryBulkSelection(result.validIds, result.validIds[0]);
    return true;
}

export function saveLoredeckLibraryFolderRecords(folders = []) {
    const { registry } = getMutableLoredeckLibraryRegistry();
    persistLoredeckLibraryRegistryLayout({
        ...registry,
        folders: folders.map(folder => ({ ...folder })),
    });
}

export function getLoredeckLibraryWorkingIndex() {
    const state = getState();
    const library = getLoredeckLibrary(state);
    return getLoredeckLibraryIndexForPacks(state, library);
}

async function promptCreateLoredeckLibraryFolder(parentId = '') {
    const libraryIndex = getLoredeckLibraryWorkingIndex();
    const targetParentId = String(parentId || '').trim();
    if (targetParentId && !(libraryIndex.folders || []).some(folder => folder.id === targetParentId)) {
        toast('Parent folder is no longer available.', 'warning');
        return false;
    }
    const parentPath = targetParentId ? getFolderPath(targetParentId, libraryIndex).join(' > ') : 'Library root';
    const title = await promptTextAction(
        targetParentId ? 'Create Subfolder' : 'Create Folder',
        `Name the new folder under ${parentPath}.`,
        '',
        { placeholder: 'Folder name', required: true, confirmLabel: 'Create' },
    );
    if (title === null) return false;
    const created = createLoredeckLibraryFolder(targetParentId, title, libraryIndex);
    if (created) renderLoredeckLibraryOverlay();
    return !!created;
}

function createLoredeckLibraryFolder(parentId = '', title = '', libraryIndex = getLoredeckLibraryWorkingIndex()) {
    const targetParentId = String(parentId || '').trim();
    const result = createLoredeckLibraryFolderRecord(targetParentId, title, libraryIndex);
    if (!result.ok) {
        if (result.error) toast(result.error, 'warning');
        return null;
    }
    const folder = result.folder;
    saveLoredeckLibraryFolderRecords(result.folders);
    if (targetParentId) {
        loredeckLibraryCollapsedFolderIds.delete(targetParentId);
        loredeckLibraryExpandedFolderIds.add(targetParentId);
    }
    loredeckLibrarySelectedFolderId = folder.id;
    loredeckLibrarySelectedFolderDetailsId = folder.id;
    loredeckLibrarySort = 'name';
    return folder;
}

async function promptRenameLoredeckLibraryFolder(folderId = '') {
    const id = String(folderId || '').trim();
    if (!id || id === 'unfiled') return false;
    const libraryIndex = getLoredeckLibraryWorkingIndex();
    const folder = (libraryIndex.folders || []).find(item => item.id === id);
    if (!folder) {
        toast('That Library folder is no longer available.', 'warning');
        return false;
    }
    const title = await promptTextAction(
        'Rename Folder',
        'Rename this Library folder. The internal folder ID and stack references stay unchanged.',
        folder.title || '',
        { placeholder: 'Folder name', required: true, confirmLabel: 'Rename' },
    );
    if (title === null) return false;
    const renamed = renameLoredeckLibraryFolder(id, title, libraryIndex);
    if (renamed) renderLoredeckLibraryOverlay();
    return renamed;
}

function renameLoredeckLibraryFolder(folderId = '', title = '', libraryIndex = getLoredeckLibraryWorkingIndex()) {
    const id = String(folderId || '').trim();
    const result = renameLoredeckLibraryFolderRecord(id, title, libraryIndex);
    if (!result.ok) {
        if (result.error) toast(result.error, 'warning');
        return false;
    }
    saveLoredeckLibraryFolderRecords(result.folders);
    loredeckLibrarySelectedFolderId = id;
    loredeckLibrarySelectedFolderDetailsId = id;
    return true;
}

async function deleteLoredeckLibraryFolderWithConfirm(folderId = '') {
    const id = String(folderId || '').trim();
    if (!id || id === 'unfiled') return false;
    const libraryIndex = getLoredeckLibraryWorkingIndex();
    const plan = getLoredeckLibraryFolderRemovalPlan(id, libraryIndex);
    if (!plan.folder) {
        toast('That Library folder is no longer available.', 'warning');
        return false;
    }
    const folder = plan.folder;
    const stackKey = createLoredeckStackFolderKey(id);
    const inStack = getLoredeckStack(getState()).some(item => getLoredeckStackItemKey(item) === stackKey);
    const hasContents = plan.directChildFolders.length || plan.containedDeckIds.length;

    let strategy = 'empty';
    if (hasContents) {
        strategy = await promptLoredeckLibraryFolderRemovalStrategy(plan, inStack);
        if (!strategy) return false;
    } else {
        const proceed = await confirmAction(
            'Delete Empty Folder?',
            `Delete "${folder.title || id}" from the Library?${inStack ? ' It will also be removed from the active stack.' : ''} This does not delete any Loredecks.`
        );
        if (!proceed) return false;
    }

    return applyLoredeckLibraryFolderRemoval(plan, strategy);
}

function formatLoredeckLibraryFolderRemovalMessage(plan = {}, inStack = false) {
    const folder = plan.folder || {};
    const path = getFolderPath(plan.folderId, getLoredeckLibraryWorkingIndex()).join(' > ') || folder.title || plan.folderId || 'Folder';
    const lines = [
        `Delete "${folder.title || plan.folderId}" from the Library.`,
        '',
        `Path: ${path}`,
        `Direct subfolders: ${plan.directChildFolders?.length || 0}`,
        `Nested subfolders: ${Math.max(0, (plan.descendantFolders?.length || 0) - (plan.directChildFolders?.length || 0))}`,
        `Contained Loredecks: ${plan.containedDeckIds?.length || 0}`,
    ];
    if (inStack) lines.push('', 'This folder group is in the active stack and will be removed from the stack.');
    lines.push('', 'Choose how Saga should preserve the contents.');
    return lines.join('\n');
}

async function promptLoredeckLibraryFolderRemovalStrategy(plan = {}, inStack = false) {
    return await chooseAction(
        'Delete Folder With Contents?',
        formatLoredeckLibraryFolderRemovalMessage(plan, inStack),
        [
            {
                value: 'move_to_parent',
                label: 'Move Contents to Parent',
                tooltip: 'Delete this folder, move direct Loredecks and subfolders up one level, and keep nested folders intact.',
                className: 'saga-primary-button',
            },
            {
                value: 'move_decks_to_unfiled',
                label: 'Move Loredecks to Unfiled',
                tooltip: 'Delete this folder and nested subfolders, then move all contained Loredecks to Unfiled.',
                className: 'saga-danger-button',
            },
        ],
    );
}

function applyLoredeckLibraryFolderRemoval(plan = {}, strategy = 'empty') {
    const folderId = String(plan.folderId || '').trim();
    if (!folderId || !plan.folder) return false;
    const libraryIndex = getLoredeckLibraryWorkingIndex();
    const { registry } = getMutableLoredeckLibraryRegistry();
    const result = applyLoredeckLibraryFolderRemovalPlan({ folderId, strategy, libraryIndex, registry });
    if (!result.ok) {
        if (result.error) toast(result.error, 'warning');
        return false;
    }
    if (!persistLoredeckLibraryRegistryLayout(result.registry)) return false;
    const removedKeys = new Set(result.removedFolderIds.map(createLoredeckStackFolderKey));
    if (removedKeys.size) {
        commitLoredeckStackMutation(stack => {
            for (let index = stack.length - 1; index >= 0; index -= 1) {
                if (removedKeys.has(getLoredeckStackItemKey(stack[index]))) stack.splice(index, 1);
            }
        });
    }
    for (const id of result.removedFolderIds) {
        loredeckLibraryCollapsedFolderIds.delete(id);
        loredeckLibraryExpandedFolderIds.delete(id);
    }
    loredeckLibrarySelectedFolderId = result.selectedFolderId;
    loredeckLibrarySelectedFolderDetailsId = '';
    if (result.selectedDeckIds.length) setLoredeckLibraryBulkSelection(result.selectedDeckIds, result.selectedDeckIds[0]);
    else setLoredeckLibraryBulkSelection([], '');
    loredeckLibrarySort = 'name';
    renderLoredeckLibraryOverlay();
    return true;
}

function moveLoredeckLibraryFolder(folderId = '', targetParentId = '', targetIndex = null, libraryIndex = getLoredeckLibraryIndexForPacks()) {
    const id = String(folderId || '').trim();
    const result = moveLoredeckLibraryFolderRecord(id, targetParentId, targetIndex, libraryIndex);
    if (!result.ok) {
        if (result.error) toast(result.error, 'warning');
        return false;
    }
    saveLoredeckLibraryFolderRecords(result.folders);
    loredeckLibrarySelectedFolderId = id;
    loredeckLibrarySelectedFolderDetailsId = id;
    if (targetParentId) {
        loredeckLibraryCollapsedFolderIds.delete(targetParentId);
        loredeckLibraryExpandedFolderIds.add(targetParentId);
    }
    loredeckLibrarySort = 'name';
    return true;
}

export function isLoredeckLibraryOpen() {
    return loredeckLibraryOpen;
}

export function setLoredeckLibrarySelectedFolder(folderId = 'all', detailsId = folderId) {
    loredeckLibrarySelectedFolderId = String(folderId || 'all').trim() || 'all';
    loredeckLibrarySelectedFolderDetailsId = String(detailsId || '').trim();
}

export function clearLoredeckLibrarySelectedFolderDetails() {
    loredeckLibrarySelectedFolderDetailsId = '';
}
