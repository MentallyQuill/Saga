import {
    loadLoredeckSourceById,
    normalizeLoredeckEntryForSchemaV3,
} from './loredeck-loader.js';
import {
    addTooltip,
    confirmAction,
    createButton,
    createEmptyMessage,
    createKeyValue,
    createStatusPill,
    createManagedTooltip,
    disposeRuntimeTooltips,
    hideFloatingTooltip,
    humanizeScopeKey,
    toast,
    wireOverlayBackdropClose,
} from '../ui/runtime-ui-kit.js';
import {
    preserveInputFocusAfterRender,
} from '../ui/input-focus-preservation.js';
import {
    appendLoredeckStatusPills,
    createLoredeckEmptyState,
} from './loredeck-ui-kit.js';
import {
    createLoredeckFilterCount,
    createLoredeckSearchInput,
    createLoredeckSelectControl,
} from './loredeck-filter-controls.js';
import {
    createLoredeckSelectionSummary,
} from './loredeck-selection-toolbar.js';
import {
    createLoredeckActionRow,
    setLoredeckActionButtonBusy,
    withLoredeckConfirmedActionButton,
} from './loredeck-action-rows.js';
import { createLoredeckWorkbenchViewModel } from './loredeck-workbench-view-model.js';
import { createLoredeckWorkbenchViewLifetime } from './loredeck-workbench-view-lifetime.js';

const LOREDECK_WORKBENCH_ID = 'saga-loredeck-workbench';

let loredeckWorkbenchDeps = {};
let loredeckWorkbenchPackId = '';
let loredeckWorkbenchPack = null;
let loredeckWorkbenchQuery = '';
let loredeckWorkbenchRelevanceFilter = 'all';
let loredeckWorkbenchCategoryFilter = 'all';
let loredeckWorkbenchStatusFilter = 'active';
let loredeckWorkbenchActiveTab = 'lorecards';
let loredeckWorkbenchRegistryQuery = '';
let loredeckWorkbenchSelectedEntryId = '';
let loredeckWorkbenchCache = {
    packId: '',
    status: 'idle',
    error: '',
    loadedAt: 0,
    rows: [],
    source: null,
};
let loredeckWorkbenchSaveState = {
    packId: '',
    status: 'idle',
    message: '',
    updatedAt: 0,
};
let loredeckWorkbenchDraftEntry = null;
let loredeckWorkbenchBulkSelection = new Set();
let loredeckWorkbenchLastSelectionId = '';
let loredeckWorkbenchScrollState = null;
const workbenchLifetime = createLoredeckWorkbenchViewLifetime();
const workbenchFrames = new Set();
const workbenchFormDisposers = new WeakMap();
const workbenchFormBuffers = new WeakMap();
let workbenchView = null;
let workbenchModel = null;
let viewModulePromise = null;

function loadWorkbenchViewModule() {
    if (!viewModulePromise) {
        viewModulePromise = import('../ui/generated/workbench/view.js').catch(error => {
            viewModulePromise = null;
            throw error;
        });
    }
    return viewModulePromise;
}

function scheduleWorkbenchFrame(callback) {
    const owner = workbenchLifetime.captureSession();
    const view = workbenchLifetime.captureView(workbenchView?.host);
    const frame = requestAnimationFrame(() => {
        workbenchFrames.delete(frame);
        if (workbenchLifetime.isSessionCurrent(owner) && (!view || workbenchLifetime.isViewCurrent(view))) callback();
    });
    workbenchFrames.add(frame);
}

function disposeWorkbenchView() {
    workbenchLifetime.invalidateView();
    for (const frame of workbenchFrames) cancelAnimationFrame(frame);
    workbenchFrames.clear();
    if (!workbenchView) return;
    workbenchView.handle?.dispose();
    disposeRuntimeTooltips(workbenchView.host);
    workbenchView = null;
}

function reportWorkbenchViewError(error) {
    console.error('[Saga] Loredeck Workbench view failed:', error);
    toast(error?.message ? `Action failed: ${error.message}` : 'Action failed.', 'error');
}

export function configureLoredeckWorkbenchPanel(deps = {}) {
    loredeckWorkbenchDeps = { ...loredeckWorkbenchDeps, ...(deps || {}) };
}

function dep(name, fallback = null) {
    const value = loredeckWorkbenchDeps?.[name];
    if (typeof value === 'function') return value;
    if (typeof fallback === 'function') return fallback;
    throw new Error(`Saga Loredeck Workbench dependency is not configured: ${name}`);
}

function getState() { return dep('getState', () => ({}))(); }
function getLoredeckLibrary(state) { return dep('getLoredeckLibrary', () => [])(state); }
function getLoredeckLibraryRegistry(state) { return dep('getLoredeckLibraryRegistry', () => ({ packs: {}, folders: [] }))(state); }
function getLoredeckDefinition(packId) { return dep('getLoredeckDefinition', () => null)(packId); }
function getFreshLoredeckLibraryPack(packId, fallback) { return dep('getFreshLoredeckLibraryPack', (_packId, _fallback) => _fallback || null)(packId, fallback); }
function getLoredeckTypeLabel(packId) { return dep('getLoredeckTypeLabel', () => 'Custom')(packId); }
function openDuplicateLoredeckDialog(pack) { return dep('openDuplicateLoredeckDialog', () => {})(pack); }
function openLoredeckHealthCenter(packId) { return dep('openLoredeckHealthCenter', () => {})(packId); }
function persistLoredeckLibraryRecordMutation(pack, mutator, message = '', options = {}) { return dep('persistLoredeckLibraryRecordMutation', () => false)(pack, mutator, message, options); }
function isBasicExperienceMode() { return dep('isBasicExperience', () => false)() === true; }

export function openLoredeckWorkbench(packId = '') {
    if (isBasicExperienceMode()) {
        toast('Switch to Advanced Experience to open the Loredeck editor.', 'info');
        return;
    }
    const id = String(packId || '').trim();
    if (!id) {
        toast('Select a Loredeck before opening the workbench.', 'warning');
        return;
    }
    closeLoredeckWorkbench();
    workbenchLifetime.open(id);
    if (loredeckWorkbenchPackId !== id) resetLoredeckWorkbenchSaveState(id);
    loredeckWorkbenchPackId = id;
    if (loredeckWorkbenchDraftEntry?.packId !== id) loredeckWorkbenchDraftEntry = null;
    loredeckWorkbenchBulkSelection = new Set();
    loredeckWorkbenchLastSelectionId = '';
    loredeckWorkbenchStatusFilter = 'active';
    loredeckWorkbenchActiveTab = 'lorecards';
    loredeckWorkbenchRegistryQuery = '';
    loredeckWorkbenchSelectedEntryId = '';
    loredeckWorkbenchPack = getWorkbenchPack(id);
    const overlay = document.createElement('div');
    overlay.id = LOREDECK_WORKBENCH_ID;
    overlay.className = 'saga-lore-workbench-overlay saga-loredeck-workbench-overlay';
    overlay.tabIndex = -1;
    wireOverlayBackdropClose(overlay, closeLoredeckWorkbench);
    overlay.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeLoredeckWorkbench();
    });
    overlay.appendChild(createLoredeckWorkbenchShell(loredeckWorkbenchPack));
    document.body.appendChild(overlay);
    renderLoredeckWorkbench();
    scheduleWorkbenchFrame(() => { overlay.focus?.({ preventScroll: true }); });
    void loadLoredeckWorkbenchRows(id, { force: loredeckWorkbenchCache.packId !== id || loredeckWorkbenchCache.status !== 'loaded' || !loredeckWorkbenchCache.rows.length });
}

export function closeLoredeckWorkbench() {
    workbenchLifetime.close();
    for (const frame of workbenchFrames) cancelAnimationFrame(frame);
    workbenchFrames.clear();
    disposeWorkbenchView();
    workbenchModel = null;
    loredeckWorkbenchPack = null;
    const overlay = document.getElementById(LOREDECK_WORKBENCH_ID);
    disposeRuntimeTooltips(overlay);
    overlay?.remove();
}

export function refreshLoredeckWorkbench() {
    if (!document.getElementById(LOREDECK_WORKBENCH_ID)) return;
    loredeckWorkbenchPack = getWorkbenchPack();
    renderLoredeckWorkbench();
}

function refreshWorkbenchPackAfterMutation(owner, packId) {
    if (workbenchLifetime.isSessionCurrent(owner) && packId === loredeckWorkbenchPackId) loredeckWorkbenchPack = getWorkbenchPack(packId);
}

function getWorkbenchPack(packId = loredeckWorkbenchPackId) {
    // Hydration may clone the full payload. View-only updates reuse the active
    // authoritative reference; fresh reads belong at source/business boundaries.
    const state = getState();
    const id = String(packId || '').trim();
    if (!id) return null;
    const libraryPack = getLoredeckLibrary(state).find(pack => pack?.packId === id) || null;
    return getFreshLoredeckLibraryPack(id, libraryPack || getLoredeckDefinition(id)) || libraryPack || getLoredeckDefinition(id);
}

function captureLoredeckWorkbenchScrollState(overlay = document.getElementById(LOREDECK_WORKBENCH_ID)) {
    if (!overlay) return null;
    return {
        body: overlay.querySelector('.saga-loredeck-workbench-body')?.scrollTop || 0,
        table: overlay.querySelector('.saga-loredeck-workbench-table')?.scrollTop || 0,
        detail: overlay.querySelector('.saga-loredeck-workbench-detail')?.scrollTop || 0,
    };
}

function restoreLoredeckWorkbenchScrollState(overlay = document.getElementById(LOREDECK_WORKBENCH_ID), snapshot = loredeckWorkbenchScrollState) {
    if (!overlay || !snapshot) return;
    for (const [selector, value] of [
        ['.saga-loredeck-workbench-body', snapshot.body],
        ['.saga-loredeck-workbench-table', snapshot.table],
        ['.saga-loredeck-workbench-detail', snapshot.detail],
    ]) {
        const element = overlay.querySelector(selector);
        if (element) element.scrollTop = Math.max(0, Number(value) || 0);
    }
}

function renderLoredeckWorkbench() {
    const overlay = document.getElementById(LOREDECK_WORKBENCH_ID);
    if (!overlay) return;
    const pack = loredeckWorkbenchPack;
    updateLoredeckWorkbenchHeader(overlay, pack);
    updateLoredeckWorkbenchTabs(overlay, pack);
    const body = overlay.querySelector('.saga-loredeck-workbench-body');
    if (!pack?.packId || !body) return;
    if (workbenchView?.tab !== loredeckWorkbenchActiveTab) {
        const previousHost = workbenchView?.host;
        disposeWorkbenchView();
        if (previousHost) previousHost.remove();
        const host = document.createElement('div');
        host.className = loredeckWorkbenchActiveTab === 'registries'
            ? 'saga-lore-workbench-view saga-loredeck-workbench-registries-view'
            : 'saga-lore-workbench-view saga-loredeck-workbench-view';
        body.appendChild(host);
        workbenchView = { host, tab: loredeckWorkbenchActiveTab, handle: null, pending: null };
        host.appendChild(createEmptyMessage('Loading Lorecards...'));
    }
    if (loredeckWorkbenchActiveTab === 'registries') {
        loredeckWorkbenchScrollState = captureLoredeckWorkbenchScrollState(overlay);
        disposeRuntimeTooltips(workbenchView.host);
        const next = createLoredeckWorkbenchRegistriesView(pack);
        workbenchView.host.replaceChildren(...next.childNodes);
        restoreLoredeckWorkbenchScrollState(overlay);
        return;
    }
    const rows = getFilteredLoredeckWorkbenchRows();
    if (!['loading', 'error'].includes(loredeckWorkbenchCache.status)) {
        ensureLoredeckWorkbenchSelection(rows);
        reconcileLoredeckWorkbenchBulkSelection(rows);
    }
    // A real reload retains the last authoritative rows. The view hides its
    // retained main subtree behind the original loading/error presentation.
    const hasLoadedRows = loredeckWorkbenchCache.packId === pack.packId && loredeckWorkbenchCache.rows.length > 0;
    const availableRows = getWorkbenchPresentationRows();
    workbenchModel = createLoredeckWorkbenchViewModel({
        packId: pack.packId, pack, filteredRows: rows,
        selectedEntryId: loredeckWorkbenchSelectedEntryId,
        selectedIds: getLoredeckWorkbenchSelectedIds(), editable: isLoredeckWorkbenchEditablePack(pack),
        query: loredeckWorkbenchQuery,
        filters: { relevance: loredeckWorkbenchRelevanceFilter, category: loredeckWorkbenchCategoryFilter, status: loredeckWorkbenchStatusFilter },
        cacheStatus: loredeckWorkbenchCache.status,
        error: loredeckWorkbenchCache.error,
        retainLoadedView: hasLoadedRows,
        totalCount: availableRows.length,
        matchCount: ['loading', 'error'].includes(loredeckWorkbenchCache.status) ? Number(rows.some(row => row.draft)) : rows.length,
        categoryOptions: getCategoryFilterOptions(availableRows),
        saveStatus: loredeckWorkbenchSaveState.status,
        getCells: row => [
            { text: row.entry?.title || row.id, subText: row.id },
            { text: getEntryCategory(row.entry) }, { text: getEntryRelevance(row.entry) },
            { text: row.disabled ? 'disabled' : 'active', subText: row.sourceFile || 'embedded' },
        ],
    }, workbenchModel);
    if (workbenchView.handle) {
        workbenchView.handle.update(workbenchModel);
        if (!workbenchView.host.firstElementChild) workbenchView.handle = null;
    } else if (!workbenchView.pending) {
        void mountLorecardsView(workbenchView);
    }
}

function createLoredeckWorkbenchShell(pack = null) {
    const shell = document.createElement('div');
    shell.className = 'saga-lore-workbench-shell saga-loredeck-workbench-shell';
    shell.addEventListener('click', event => event.stopPropagation());

    shell.appendChild(createLoredeckWorkbenchHeader(pack));

    const body = document.createElement('div');
    body.className = 'saga-lore-workbench-body saga-loredeck-workbench-body';
    if (!pack?.packId) {
        body.appendChild(createLoredeckEmptyState('Select a Loredeck from the Library before opening the workbench.'));
    } else {
        body.appendChild(createLoredeckWorkbenchTabs());
    }
    shell.appendChild(body);
    return shell;
}

function updateLoredeckWorkbenchHeader(overlay, pack) {
    overlay.querySelector('.saga-lore-workbench-title').textContent = pack?.title || pack?.packId || 'Loredeck Workbench';
    overlay.querySelector('.saga-lore-workbench-subtitle').textContent = pack?.description || getLoredeckWorkbenchSubtitle(pack);
    const chips = overlay.querySelector('.saga-loredeck-workbench-header-chips');
    if (chips.dataset.workbenchState === getWorkbenchHeaderStateKey(pack)) {
        const count = chips.children[1];
        if (count && pack?.packId) count.textContent = `${getWorkbenchPresentationRows().length} Lorecards`;
        refreshLoredeckWorkbenchSaveChip();
        return;
    }
    disposeRuntimeTooltips(chips);
    chips.replaceChildren();
    fillLoredeckWorkbenchHeaderChips(chips, pack);
}

function getWorkbenchPresentationRows() {
    return ['loading', 'error'].includes(loredeckWorkbenchCache.status) ? [] : loredeckWorkbenchCache.rows;
}

function getWorkbenchHeaderStateKey(pack) {
    return JSON.stringify([pack?.packId, pack?.packId ? getLoredeckTypeLabel(pack.packId) : '', pack?.type, loredeckWorkbenchCache.status === 'loading', loredeckWorkbenchCache.error]);
}

function updateLoredeckWorkbenchTabs(overlay, pack) {
    const counts = [getWorkbenchPresentationRows().length, getLoredeckWorkbenchRegistryCount(pack), 0, getSourceFileCount(['loading', 'error'].includes(loredeckWorkbenchCache.status) ? null : loredeckWorkbenchCache.source)];
    const labels = ['Lorecards', 'Registries', 'Health', 'Files'];
    overlay.querySelectorAll('.saga-lore-workbench-mode-tab').forEach((button, index) => {
        button.textContent = counts[index] ? `${labels[index]} (${counts[index]})` : labels[index];
        button.classList.toggle('saga-lore-workbench-mode-tab-active', button.dataset.workbenchTab === loredeckWorkbenchActiveTab);
    });
}

async function mountLorecardsView(view) {
    const token = workbenchLifetime.captureView(view.host);
    view.pending = token;
    let reportedError = null;
    try {
        const module = await loadWorkbenchViewModule();
        if (!workbenchLifetime.isViewCurrent(token) || workbenchView !== view || loredeckWorkbenchActiveTab !== 'lorecards') return;
        disposeRuntimeTooltips(view.host);
        view.host.replaceChildren();
        const actions = createWorkbenchViewActions();
        actions.onError = error => { reportedError = error; reportWorkbenchViewError(error); };
        view.handle = module.mount(view.host, workbenchModel, actions);
    } catch (error) {
        if (workbenchLifetime.isViewCurrent(token) && reportedError !== error) reportWorkbenchViewError(error);
    } finally {
        if (view.pending === token) view.pending = null;
    }
}

function mountWorkbenchLeaf(node, build, update = () => {}, initialSnapshot = null) {
    let disposed = false;
    try {
        const content = build(node);
        if (content !== node) node.append(...content.childNodes);
        if (initialSnapshot) update(initialSnapshot);
    } catch (error) {
        disposeWorkbenchLeaf(node);
        throw error;
    }
    return {
        update,
        dispose() {
            if (disposed) return;
            disposed = true;
            disposeWorkbenchLeaf(node);
        },
    };
}

function disposeWorkbenchLeaf(node) {
    for (const form of node.querySelectorAll('.saga-loredeck-workbench-editor-form')) workbenchFormDisposers.get(form)?.();
    disposeRuntimeTooltips(node);
    node.replaceChildren();
}

function createWorkbenchViewActions() {
    return {
        onError: reportWorkbenchViewError,
        tooltip(node, text) {
            const tooltip = createManagedTooltip(node, text);
            return { update: text => tooltip.update(text), destroy: () => tooltip.dispose() };
        },
        inspectRow(id, event) {
            loredeckWorkbenchSelectedEntryId = id;
            const row = workbenchModel.logicalRows.find(row => row.id === id);
            if (workbenchModel.editable && !row?.draft && (event.shiftKey || event.ctrlKey || event.metaKey)) {
                toggleLoredeckWorkbenchBulkSelection(id, workbenchModel.logicalRows, { range: event.shiftKey, additive: event.ctrlKey || event.metaKey });
            }
            renderLoredeckWorkbench();
        },
        toggleRow(id, event) {
            toggleLoredeckWorkbenchBulkSelection(id, workbenchModel.logicalRows, { range: event.shiftKey, additive: true });
            renderLoredeckWorkbench();
        },
        toggleHeader() {
            if (workbenchModel.headerChecked) clearLoredeckWorkbenchBulkSelection(workbenchModel.logicalIds);
            else selectLoredeckWorkbenchVisibleRows(workbenchModel.logicalRows);
        },
        setQuery(value) { loredeckWorkbenchQuery = value; renderLoredeckWorkbench(); },
        setFilter(name, value) {
            if (name === 'relevance') loredeckWorkbenchRelevanceFilter = value || 'all';
            if (name === 'category') loredeckWorkbenchCategoryFilter = value || 'all';
            if (name === 'status') loredeckWorkbenchStatusFilter = value || 'active';
            renderLoredeckWorkbench();
        },
        mountControls(node, model) {
            const handle = mountWorkbenchLeaf(node, () => createLoredeckWorkbenchControls(model.pack, model.logicalRows, node, model), next => {
                const search = node.querySelector('.saga-lore-workbench-search');
                if (search.value !== next.query) search.value = next.query;
                node.querySelector('.saga-lore-workbench-count').textContent = `${next.matchCount} of ${next.totalCount} Lorecards`;
                const controls = node.querySelectorAll('.saga-lore-workbench-select');
                controls[0].value = next.filters.relevance;
                controls[1].updateOptions(next.categoryOptions);
                controls[1].value = next.filters.category;
                controls[2].value = next.filters.status;
            }, model);
            return handle;
        },
        mountBulkToolbar(node, model) {
            const pack = { ...model.pack };
            const handle = mountWorkbenchLeaf(node, () => createLoredeckWorkbenchBulkToolbar(pack, model.logicalRows, node), next => {
                Object.assign(pack, next.pack);
                const count = next.selectedIds.length;
                node.querySelector('.saga-loredeck-workbench-bulk-summary').textContent = count ? `${count} selected` : 'No bulk selection';
                for (const button of [...node.querySelectorAll('button')].slice(2)) {
                    if (button.dataset.sagaLoredeckActionBusy || button.dataset.sagaActionBusy) continue;
                    button.disabled = !count;
                    button.classList.toggle('saga-disabled-like', !count);
                }
            }, model);
            return handle;
        },
        mountTableHeader(node, model) {
            const handle = mountWorkbenchLeaf(node, () => createLoredeckWorkbenchTableHeader(model.logicalRows, model.editable, node), next => {
                const box = node.querySelector('[role="checkbox"]');
                if (!box) return;
                box.textContent = next.headerChecked ? 'x' : '';
                box.setAttribute('aria-checked', String(next.headerChecked));
                box.classList.toggle('saga-loredeck-workbench-select-box-checked', next.headerChecked);
                addTooltip(box, next.headerChecked ? 'Clear visible Lorecard selection.' : 'Select all visible Lorecards.');
            }, model);
            return handle;
        },
        mountDetail(node, model) {
            const pack = { ...model.pack };
            const selected = model.selectedRow ? { ...model.selectedRow } : null;
            return mountWorkbenchLeaf(node, () => selected && model.editable
                ? createLoredeckWorkbenchEditableDetail(pack, selected, node)
                : createLoredeckWorkbenchDetail(pack, model.logicalRows, node), next => {
                const entryChanged = selected?.entry !== next.selectedRow?.entry;
                const disabledChanged = selected?.disabled !== next.selectedRow?.disabled;
                const sourceChanged = selected?.sourceFile !== next.selectedRow?.sourceFile;
                Object.assign(pack, next.pack);
                if (selected && next.selectedRow) Object.assign(selected, next.selectedRow);
                if (next.editable && selected && !selected.draft && entryChanged && next.cacheStatus === 'loaded' && !next.error) {
                    reconcileWorkbenchEditorBuffer(node.querySelector('.saga-loredeck-workbench-editor-form'), selected);
                }
                if (!next.editable && entryChanged) {
                    disposeWorkbenchLeaf(node);
                    createLoredeckWorkbenchDetail(pack, next.logicalRows, node);
                } else if (next.editable && selected && !selected.draft && disabledChanged) {
                    const chip = node.querySelector('.saga-loredeck-row-meta')?.firstElementChild;
                    disposeRuntimeTooltips(chip);
                    chip?.replaceWith(createStatusPill(selected.disabled ? 'Disabled' : 'Editable', selected.disabled ? 'Saving this Lorecard will restore it.' : 'Manual field edits save directly to this Loredeck.', { tone: selected.disabled ? 'muted' : 'success', kind: 'status' }));
                }
                if (next.editable && selected && sourceChanged) {
                    const chip = node.querySelector('.saga-loredeck-row-meta')?.children[1];
                    disposeRuntimeTooltips(chip);
                    chip?.replaceWith(createStatusPill(selected.sourceFile || 'embedded', 'Source file for this Lorecard.', { tone: 'source', kind: 'source', maxChars: 36 }));
                }
                // Dirty/composing/newer fields remain explicit DOM buffers.
                // Pristine and acknowledged values accept authoritative reloads.
            });
        },
    };
}

function createLoredeckWorkbenchHeader(pack = null) {
    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header saga-loredeck-workbench-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = pack?.title || pack?.packId || 'Loredeck Workbench';
    titleWrap.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = pack?.description || getLoredeckWorkbenchSubtitle(pack);
    titleWrap.appendChild(subtitle);

    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-workbench-header-chips saga-loredeck-row-meta';
    fillLoredeckWorkbenchHeaderChips(chips, pack);
    titleWrap.appendChild(chips);
    header.appendChild(titleWrap);

    const actions = createLoredeckActionRow({ className: 'saga-primary-actions saga-loredeck-workbench-header-actions' });
    if (pack?.packId) {
        const refresh = createButton('Reload Lorecards', 'Reload Lorecards from this Loredeck source.', async btn => {
            await loadLoredeckWorkbenchRows(pack.packId, { force: true, button: btn });
        });
        actions.appendChild(refresh);
        actions.appendChild(createButton('Open Pack Health', 'Open the Pack Health Center for this Loredeck.', () => {
            openLoredeckHealthCenter(pack.packId);
        }));
        if (pack.type === 'bundled') {
            actions.appendChild(createButton('Duplicate to Edit', 'Create an editable Custom copy of this Bundled Loredeck.', () => {
                openDuplicateLoredeckDialog(loredeckWorkbenchPack?.packId === pack.packId ? loredeckWorkbenchPack : pack);
            }, 'saga-primary-button'));
        } else {
            actions.appendChild(createButton('New Lorecard', 'Create a new Lorecard directly in this editable Loredeck.', () => {
                beginLoredeckWorkbenchNewEntry(pack);
            }, 'saga-primary-button'));
        }
    }
    actions.appendChild(createButton('Close', 'Close the Loredeck Workbench.', closeLoredeckWorkbench, 'saga-small-button saga-lore-workbench-close'));
    header.appendChild(actions);
    return header;
}

function fillLoredeckWorkbenchHeaderChips(chips, pack) {
    chips.dataset.workbenchState = getWorkbenchHeaderStateKey(pack);
    if (pack?.packId) {
        appendLoredeckStatusPills(chips, [
            [getLoredeckTypeLabel(pack.packId), 'Loredeck source type.', { tone: 'source', kind: 'source' }],
            [`${getWorkbenchPresentationRows().length} Lorecards`, 'Loaded Lorecards in this workbench cache.', { kind: 'count' }],
        ]);
        const savePill = createStatusPill(getLoredeckWorkbenchSaveStateLabel(pack), getLoredeckWorkbenchSaveTooltip(pack), { tone: pack?.type === 'bundled' ? 'muted' : 'success', kind: 'status' });
        savePill.dataset.loredeckWorkbenchSaveChip = 'true';
        chips.appendChild(savePill);
        appendLoredeckStatusPills(chips, [
            { text: 'Loading...', tooltip: 'Lorecards are loading from this Loredeck source.', show: loredeckWorkbenchCache.status === 'loading', tone: 'info' },
            { text: 'Load failed', tooltip: loredeckWorkbenchCache.error, show: !!loredeckWorkbenchCache.error, tone: 'danger', kind: 'severity' },
        ]);
    } else {
        appendLoredeckStatusPills(chips, [['No deck', 'No Loredeck is selected.', { tone: 'muted' }]]);
    }
}

function getLoredeckWorkbenchSaveStateLabel(pack = {}) {
    if (!pack?.packId) return 'No deck';
    if (pack.type === 'bundled') return 'Read-only';
    if (loredeckWorkbenchSaveState.packId === pack.packId) {
        if (loredeckWorkbenchSaveState.status === 'dirty') return 'Unsaved changes';
        if (loredeckWorkbenchSaveState.status === 'saving') return 'Saving...';
        if (loredeckWorkbenchSaveState.status === 'saved') return 'Saved';
        if (loredeckWorkbenchSaveState.status === 'failed') return 'Save failed';
    }
    return 'Editable';
}

function getLoredeckWorkbenchSaveTooltip(pack = {}) {
    if (pack?.type === 'bundled') return 'Bundled Loredecks are read-only. Duplicate to edit.';
    if (loredeckWorkbenchSaveState.packId === pack?.packId && loredeckWorkbenchSaveState.message) return loredeckWorkbenchSaveState.message;
    return 'Custom and Generated Loredeck field edits save directly to the Loredeck Library record.';
}

function getLoredeckWorkbenchSubtitle(pack = null) {
    if (!pack?.packId) return 'Select a Loredeck to inspect its Lorecards.';
    if (pack.type === 'bundled') return 'Inspect this read-only Bundled Loredeck, or duplicate it to edit a Custom copy.';
    return 'Inspect and directly edit Lorecards in this Loredeck.';
}

function createLoredeckWorkbenchTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'saga-lore-workbench-mode-tabs saga-loredeck-workbench-mode-tabs';
    for (const [id, label, count, tip] of [
        ['lorecards', 'Lorecards', getWorkbenchPresentationRows().length, 'Browse Lorecards inside this Loredeck.'],
        ['registries', 'Registries', getLoredeckWorkbenchRegistryCount(loredeckWorkbenchPack), 'Manage deck-owned tag and timeline registry metadata.'],
        ['health', 'Health', 0, 'Use Open Pack Health for the full Pack Health Center in this phase.'],
        ['files', 'Files', getSourceFileCount(['loading', 'error'].includes(loredeckWorkbenchCache.status) ? null : loredeckWorkbenchCache.source), 'Package file inspection will be expanded after the browser foundation.'],
    ]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'saga-lore-workbench-mode-tab';
        btn.dataset.workbenchTab = id;
        if (id === loredeckWorkbenchActiveTab) btn.classList.add('saga-lore-workbench-mode-tab-active');
        btn.textContent = count ? `${label} (${count})` : label;
        btn.disabled = !['lorecards', 'registries'].includes(id);
        if (!btn.disabled) {
            btn.addEventListener('click', () => {
                loredeckWorkbenchActiveTab = id;
                renderLoredeckWorkbench();
            });
        }
        addTooltip(btn, tip);
        tabs.appendChild(btn);
    }
    return tabs;
}

function createLoredeckWorkbenchRegistriesView(pack = {}) {
    const view = document.createElement('div');
    view.className = 'saga-lore-workbench-view saga-loredeck-workbench-registries-view';

    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-workbench-registry-summary';
    const tagRegistry = normalizeWorkbenchTagRegistry(pack.tagRegistry);
    const timelineRegistry = normalizeWorkbenchTimelineRegistry(pack.timelineRegistry);
    summary.appendChild(createStatusPill(`${Object.keys(tagRegistry.tags || {}).length} tags`, 'Deck-owned tag definitions saved on this Loredeck.', { tone: 'tag', kind: 'count' }));
    summary.appendChild(createStatusPill(`${timelineRegistry.anchors.length} anchors`, 'Deck-owned timeline anchors saved on this Loredeck.', { tone: 'source', kind: 'count' }));
    summary.appendChild(createStatusPill(`${timelineRegistry.windows.length} windows`, 'Deck-owned timeline windows saved on this Loredeck.', { tone: 'source', kind: 'count' }));
    if (timelineRegistry.disabledAnchorIds.length || timelineRegistry.disabledWindowIds.length) {
        summary.appendChild(createStatusPill(`${timelineRegistry.disabledAnchorIds.length + timelineRegistry.disabledWindowIds.length} disabled timeline`, 'Suppressed source timeline definitions.', { tone: 'muted', kind: 'count' }));
    }
    summary.appendChild(createStatusPill(pack.type === 'bundled' ? 'Read-only' : 'Editable', pack.type === 'bundled' ? 'Duplicate this Bundled Loredeck to edit registries.' : 'Registry changes save directly to this Loredeck record.', { tone: pack.type === 'bundled' ? 'muted' : 'success', kind: 'status' }));
    view.appendChild(summary);

    const layout = document.createElement('div');
    layout.className = 'saga-loredeck-workbench-registries-layout';
    layout.appendChild(createLoredeckWorkbenchTagRegistryPanel(pack, tagRegistry));
    layout.appendChild(createLoredeckWorkbenchTimelineRegistryPanel(pack, timelineRegistry));
    view.appendChild(layout);
    return view;
}

function getLoredeckWorkbenchRegistryCount(pack = {}) {
    const tagRegistry = normalizeWorkbenchTagRegistry(pack?.tagRegistry);
    const timelineRegistry = normalizeWorkbenchTimelineRegistry(pack?.timelineRegistry);
    return Object.keys(tagRegistry.tags || {}).length
        + timelineRegistry.anchors.length
        + timelineRegistry.windows.length
        + timelineRegistry.disabledAnchorIds.length
        + timelineRegistry.disabledWindowIds.length;
}

function createLoredeckWorkbenchTagRegistryPanel(pack = {}, tagRegistry = normalizeWorkbenchTagRegistry()) {
    const panel = document.createElement('div');
    panel.className = 'saga-loredeck-workbench-registry-panel';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Tag Registry';
    panel.appendChild(title);

    const help = document.createElement('div');
    help.className = 'saga-loredeck-workbench-editor-hint';
    help.textContent = 'Define machine-safe tags used by Lorecards. These are deck metadata, not Lorecard tag assignments.';
    panel.appendChild(help);

    const controls = document.createElement('div');
    controls.className = 'saga-loredeck-workbench-registry-controls';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search tags...';
    search.value = loredeckWorkbenchRegistryQuery;
    search.className = 'saga-loredeck-workbench-registry-search';
    addTooltip(search, 'Search tag IDs, labels, descriptions, aliases, and parents.');
    search.addEventListener('input', () => {
        const owner = workbenchLifetime.captureView(workbenchView?.host);
        preserveInputFocusAfterRender(search, () => workbenchLifetime.isViewCurrent(owner)
            ? document.querySelector(`#${LOREDECK_WORKBENCH_ID} .saga-loredeck-workbench-registry-search`) : null, () => {
            loredeckWorkbenchRegistryQuery = search.value;
            renderLoredeckWorkbench();
        }, { defer: false });
    });
    controls.appendChild(search);
    controls.appendChild(createButton('New Tag', 'Prepare a blank tag definition form.', () => {
        loredeckWorkbenchRegistryQuery = '';
        renderLoredeckWorkbench();
        scheduleWorkbenchFrame(() => document.querySelector(`#${LOREDECK_WORKBENCH_ID} [name="tagId"]`)?.focus?.());
    }, pack.type === 'bundled' ? '' : 'saga-primary-button'));
    panel.appendChild(controls);

    panel.appendChild(createLoredeckWorkbenchTagRegistryForm(pack, null));

    const entries = getFilteredWorkbenchTagRegistryEntries(tagRegistry);
    if (!entries.length) {
        panel.appendChild(createEmptyMessage(Object.keys(tagRegistry.tags || {}).length ? 'No matching tag definitions.' : 'No deck-owned tag definitions yet.'));
        return panel;
    }

    const list = document.createElement('div');
    list.className = 'saga-loredeck-workbench-registry-list';
    for (const [id, def] of entries.slice(0, 80)) {
        list.appendChild(createLoredeckWorkbenchTagRegistryRow(pack, id, def));
    }
    if (entries.length > 80) {
        const more = document.createElement('div');
        more.className = 'saga-loredeck-workbench-editor-hint';
        more.textContent = `Showing 80 of ${entries.length} matching tags. Search to narrow the list.`;
        list.appendChild(more);
    }
    panel.appendChild(list);
    return panel;
}

function createLoredeckWorkbenchTagRegistryForm(pack = {}, tag = null) {
    const form = document.createElement('div');
    form.className = 'saga-loredeck-workbench-registry-form';
    const tagId = tag?.id || '';
    form.appendChild(createLoredeckWorkbenchInputField('Tag ID', 'tagId', tagId, 'Machine-safe tag ID, e.g. faction:straw-hats.', { required: true }));
    form.appendChild(createLoredeckWorkbenchInputField('Label', 'tagLabel', tag?.label || '', 'Human-readable label.'));
    form.appendChild(createLoredeckWorkbenchInputField('Aliases', 'tagAliases', (tag?.aliases || []).join(', '), 'Comma-separated aliases.'));
    form.appendChild(createLoredeckWorkbenchInputField('Parents', 'tagParents', (tag?.parents || []).join(', '), 'Comma-separated parent tag IDs.'));
    form.appendChild(createLoredeckWorkbenchTextareaField('Description', 'tagDescription', tag?.description || '', 'What this tag means in this Loredeck.', { rows: 3 }));

    const actions = createLoredeckActionRow({ className: 'saga-primary-actions saga-loredeck-workbench-editor-actions' });
    const save = createButton(tagId ? 'Update Tag' : 'Add Tag', tagId ? 'Update this tag definition directly.' : 'Add this tag definition directly.', async btn => {
        await saveLoredeckWorkbenchTagDefinition(pack, form, btn);
    }, 'saga-primary-button');
    save.disabled = pack.type === 'bundled';
    actions.appendChild(save);
    if (tagId) {
        const remove = createButton('Delete Tag', 'Delete this tag definition directly after confirmation.', async btn => {
            await deleteLoredeckWorkbenchTagDefinition(pack, tagId, btn);
        }, 'saga-danger-button');
        remove.disabled = pack.type === 'bundled';
        actions.appendChild(remove);
    }
    form.appendChild(actions);
    return form;
}

function createLoredeckWorkbenchTagRegistryRow(pack = {}, id = '', def = {}) {
    const row = document.createElement('div');
    row.className = 'saga-loredeck-workbench-registry-row';
    const main = document.createElement('div');
    main.className = 'saga-loredeck-workbench-registry-row-main';
    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = def.label || id;
    main.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'saga-loredeck-row-meta';
    meta.appendChild(createStatusPill(id, 'Tag ID.', { tone: 'tag', kind: 'tag', maxChars: 36 }));
    if (def.parents?.length) meta.appendChild(createStatusPill(`${def.parents.length} parents`, 'Parent tag count.', { tone: 'tag', kind: 'count' }));
    if (def.aliases?.length) meta.appendChild(createStatusPill(`${def.aliases.length} aliases`, 'Alias count.', { kind: 'count' }));
    if (def.deprecated) meta.appendChild(createStatusPill('Deprecated', 'This tag is marked deprecated.', { tone: 'warning', kind: 'severity' }));
    main.appendChild(meta);
    if (def.description) {
        const description = document.createElement('div');
        description.className = 'saga-loredeck-workbench-registry-row-description';
        description.textContent = def.description;
        main.appendChild(description);
    }
    row.appendChild(main);

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Edit', 'Load this tag definition into the editor form.', () => {
        replaceLoredeckWorkbenchRegistryForm(row, pack, { id, ...def });
    }));
    row.appendChild(actions);
    return row;
}

function replaceLoredeckWorkbenchRegistryForm(row, pack, tag) {
    const panel = row.closest('.saga-loredeck-workbench-registry-panel');
    const oldForm = panel?.querySelector('.saga-loredeck-workbench-registry-form');
    if (!panel || !oldForm) return;
    const nextForm = createLoredeckWorkbenchTagRegistryForm(pack, tag);
    oldForm.replaceWith(nextForm);
    scheduleWorkbenchFrame(() => nextForm.querySelector('[name="tagLabel"]')?.focus?.());
}

async function saveLoredeckWorkbenchTagDefinition(pack = {}, form = null, button = null) {
    const owner = workbenchLifetime.captureSession();
    pack = { ...pack };
    const setSaveState = (status, message, options = {}) => setLoredeckWorkbenchSaveState(status, message, { ...options, packId: pack.packId, viewOwner: owner });
    if (!form || pack.type === 'bundled') return false;
    const id = normalizeWorkbenchTagId(form.querySelector('[name="tagId"]')?.value || '');
    if (!id) {
        toast('Tag ID is required.', 'warning');
        return false;
    }
    const def = normalizeWorkbenchTagDefinition({
        label: form.querySelector('[name="tagLabel"]')?.value || id,
        description: form.querySelector('[name="tagDescription"]')?.value || '',
        aliases: parseWorkbenchTextList(form.querySelector('[name="tagAliases"]')?.value || ''),
        parents: parseWorkbenchTextList(form.querySelector('[name="tagParents"]')?.value || '').map(normalizeWorkbenchTagId).filter(Boolean),
    }, id);
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Saving...', { fallbackLabel: 'Save Tag' });
    try {
        const freshPack = getWorkbenchPack(pack.packId) || pack;
        setSaveState('saving', `Saving tag ${id}...`);
        const saved = persistLoredeckLibraryRecordMutation(freshPack, next => {
            const registry = normalizeWorkbenchTagRegistry(next.tagRegistry);
            registry.tags[id] = def;
            next.tagRegistry = registry;
            next.healthStatus = 'stale';
        }, '', {
            errorMessage: 'Loredeck tag registry save failed.',
        });
        if (!saved) {
            setSaveState('failed', `Could not save tag ${id}.`);
            return false;
        }
        refreshWorkbenchPackAfterMutation(owner, pack.packId);
        setSaveState('saved', `Saved tag ${id}.`, { render: false, packId: freshPack.packId });
        if (workbenchLifetime.isSessionCurrent(owner)) renderLoredeckWorkbench();
        return true;
    } finally {
        restoreBusy();
    }
}

async function deleteLoredeckWorkbenchTagDefinition(pack = {}, tagId = '', button = null) {
    const owner = workbenchLifetime.captureSession();
    pack = { ...pack };
    const setSaveState = (status, message, options = {}) => setLoredeckWorkbenchSaveState(status, message, { ...options, packId: pack.packId, viewOwner: owner });
    const id = normalizeWorkbenchTagId(tagId);
    if (!id || pack.type === 'bundled') return false;
    return withLoredeckConfirmedActionButton(button, {
        confirm: () => confirmAction('Delete Tag Definition', `Delete tag definition ${id} from ${pack.title || pack.packId}? Lorecards using this tag keep the tag string, but the definition is removed. Continue?`),
        busyText: 'Deleting...',
        fallbackLabel: 'Delete Tag',
        cancelValue: false,
    }, async () => {
        const freshPack = getWorkbenchPack(pack.packId) || pack;
        setSaveState('saving', `Deleting tag ${id}...`);
        const saved = persistLoredeckLibraryRecordMutation(freshPack, next => {
            const registry = normalizeWorkbenchTagRegistry(next.tagRegistry);
            delete registry.tags[id];
            next.tagRegistry = registry;
            next.healthStatus = 'stale';
        }, '', {
            errorMessage: 'Loredeck tag registry delete failed.',
        });
        if (!saved) {
            setSaveState('failed', `Could not delete tag ${id}.`);
            return false;
        }
        refreshWorkbenchPackAfterMutation(owner, pack.packId);
        setSaveState('saved', `Deleted tag ${id}.`, { render: false, packId: freshPack.packId });
        if (workbenchLifetime.isSessionCurrent(owner)) renderLoredeckWorkbench();
        return true;
    });
}

function createLoredeckWorkbenchTimelineRegistryPanel(pack = {}, timelineRegistry = normalizeWorkbenchTimelineRegistry()) {
    const panel = document.createElement('div');
    panel.className = 'saga-loredeck-workbench-registry-panel';
    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Timeline / Context Registry';
    panel.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'saga-loredeck-row-meta';
    meta.appendChild(createStatusPill(timelineRegistry.timelineMode || 'hybrid', 'Timeline mode.', { tone: 'source', kind: 'source' }));
    meta.appendChild(createStatusPill(timelineRegistry.sortKeyScale || 'pack_local', 'Sort key scale.', { tone: 'source', kind: 'source' }));
    meta.appendChild(createStatusPill(`${timelineRegistry.anchors.length} anchors`, 'Deck-owned anchors.', { tone: 'source', kind: 'count' }));
    meta.appendChild(createStatusPill(`${timelineRegistry.windows.length} windows`, 'Deck-owned windows.', { tone: 'source', kind: 'count' }));
    panel.appendChild(meta);

    const help = document.createElement('div');
    help.className = 'saga-loredeck-workbench-editor-hint';
    help.textContent = 'Edit deck-owned Context anchors and windows used for story position gating. Source registry merge controls will come in a later slice.';
    panel.appendChild(help);

    const controls = document.createElement('div');
    controls.className = 'saga-loredeck-workbench-registry-controls';
    const newAnchor = createButton('New Anchor', 'Create a deck-owned Context anchor.', () => {
        replaceLoredeckWorkbenchTimelineForm(panel, pack, 'anchor', null);
    }, isLoredeckWorkbenchEditablePack(pack) ? 'saga-primary-button' : '');
    newAnchor.disabled = !isLoredeckWorkbenchEditablePack(pack);
    controls.appendChild(newAnchor);
    const newWindow = createButton('New Window', 'Create a deck-owned Context window between anchors or sort keys.', () => {
        replaceLoredeckWorkbenchTimelineForm(panel, pack, 'window', null);
    }, isLoredeckWorkbenchEditablePack(pack) ? 'saga-primary-button' : '');
    newWindow.disabled = !isLoredeckWorkbenchEditablePack(pack);
    controls.appendChild(newWindow);
    panel.appendChild(controls);

    const formSlot = document.createElement('div');
    formSlot.className = 'saga-loredeck-workbench-timeline-form-slot';
    formSlot.appendChild(createEmptyMessage(isLoredeckWorkbenchEditablePack(pack)
        ? 'Choose New Anchor, New Window, or Edit a row to update this deck-owned timeline registry.'
        : 'Bundled Loredeck registries are read-only. Duplicate the Loredeck before editing anchors or windows.'));
    panel.appendChild(formSlot);

    panel.appendChild(createLoredeckWorkbenchTimelinePreviewList('Anchors', timelineRegistry.anchors, pack, 'anchor'));
    panel.appendChild(createLoredeckWorkbenchTimelinePreviewList('Windows', timelineRegistry.windows, pack, 'window'));
    return panel;
}

function createLoredeckWorkbenchTimelinePreviewList(titleText, items = [], pack = {}, kind = 'anchor') {
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-workbench-timeline-preview';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-workbench-registry-subtitle';
    title.textContent = `${titleText} (${items.length})`;
    wrap.appendChild(title);
    if (!items.length) {
        wrap.appendChild(createEmptyMessage(`No deck-owned ${titleText.toLowerCase()} saved yet.`));
        return wrap;
    }
    const list = document.createElement('div');
    list.className = 'saga-loredeck-workbench-registry-list';
    for (const item of items.slice(0, 16)) {
        const row = document.createElement('div');
        row.className = 'saga-loredeck-workbench-registry-row';
        const main = document.createElement('div');
        main.className = 'saga-loredeck-workbench-registry-row-main';
        const label = document.createElement('div');
        label.className = 'saga-runtime-card-title';
        label.textContent = item.label || item.id;
        main.appendChild(label);
        const meta = document.createElement('div');
        meta.className = 'saga-loredeck-row-meta';
        meta.appendChild(createStatusPill(item.id, `${titleText} ID.`, { tone: 'source', kind: 'source', maxChars: 38 }));
        if (Number.isFinite(Number(item.sortKey))) meta.appendChild(createStatusPill(`sort ${item.sortKey}`, 'Anchor sort key.', { kind: 'metadata' }));
        if (Number.isFinite(Number(item.sortKeyFrom)) || Number.isFinite(Number(item.sortKeyTo))) meta.appendChild(createStatusPill(`${item.sortKeyFrom ?? '?'} -> ${item.sortKeyTo ?? '?'}`, 'Window sort range.', { kind: 'metadata' }));
        if (item.anchorFrom || item.anchorTo) meta.appendChild(createStatusPill(`${item.anchorFrom || '?'} -> ${item.anchorTo || '?'}`, 'Window anchor range.', { tone: 'source', kind: 'source', maxChars: 42 }));
        main.appendChild(meta);
        if (item.notes) {
            const notes = document.createElement('div');
            notes.className = 'saga-loredeck-workbench-registry-row-description';
            notes.textContent = item.notes;
            main.appendChild(notes);
        }
        row.appendChild(main);

        const actions = createLoredeckActionRow();
        actions.appendChild(createButton('Edit', `Load this ${kind} into the editor form.`, () => {
            replaceLoredeckWorkbenchTimelineForm(row, pack, kind, item);
        }));
        if (isLoredeckWorkbenchEditablePack(pack)) {
            const remove = createButton('Delete', `Delete this ${kind} after confirmation.`, async btn => {
                await deleteLoredeckWorkbenchTimelineItem(pack, kind, item.id, btn);
            }, 'saga-danger-button');
            actions.appendChild(remove);
        }
        row.appendChild(actions);
        list.appendChild(row);
    }
    if (items.length > 16) {
        const more = document.createElement('div');
        more.className = 'saga-loredeck-workbench-editor-hint';
        more.textContent = `Showing 16 of ${items.length}.`;
        list.appendChild(more);
    }
    wrap.appendChild(list);
    return wrap;
}

function createLoredeckWorkbenchTimelineRegistryForm(pack = {}, kind = 'anchor', item = null) {
    const normalizedKind = kind === 'window' ? 'window' : 'anchor';
    const existing = item && typeof item === 'object' ? item : null;
    const isWindow = normalizedKind === 'window';
    const form = document.createElement('div');
    form.className = 'saga-loredeck-workbench-registry-form saga-loredeck-workbench-timeline-form';
    form.dataset.kind = normalizedKind;
    form.dataset.originalId = existing?.id || '';

    const suggestedId = existing?.id || suggestLoredeckWorkbenchTimelineItemId(pack, normalizedKind);
    form.appendChild(createLoredeckWorkbenchInputField(isWindow ? 'Window ID' : 'Anchor ID', 'timelineId', suggestedId, 'Machine-safe Context registry ID.', { required: true }));
    form.appendChild(createLoredeckWorkbenchInputField('Label', 'timelineLabel', existing?.label || '', 'Human-readable name shown in editors.', { required: true }));
    form.appendChild(createLoredeckWorkbenchInputField('Context Type', 'timelineContextType', existing?.contextType || (isWindow ? 'anchor_window' : 'anchor'), 'Context type, such as anchor, episode, chapter, arc, or anchor_window.'));

    if (isWindow) {
        form.appendChild(createLoredeckWorkbenchInputField('From Anchor', 'timelineAnchorFrom', existing?.anchorFrom || '', 'Optional start anchor ID.'));
        form.appendChild(createLoredeckWorkbenchInputField('To Anchor', 'timelineAnchorTo', existing?.anchorTo || '', 'Optional end anchor ID.'));
        form.appendChild(createLoredeckWorkbenchInputField('Sort From', 'timelineSortKeyFrom', existing?.sortKeyFrom ?? '', 'Optional numeric start sort key.'));
        form.appendChild(createLoredeckWorkbenchInputField('Sort To', 'timelineSortKeyTo', existing?.sortKeyTo ?? '', 'Optional numeric end sort key.'));
    } else {
        form.appendChild(createLoredeckWorkbenchInputField('Sort Key', 'timelineSortKey', existing?.sortKey ?? suggestLoredeckWorkbenchTimelineSortKey(pack), 'Numeric position within this Loredeck timeline.'));
    }

    form.appendChild(createLoredeckWorkbenchInputField('Aliases', 'timelineAliases', (existing?.aliases || []).join(', '), 'Comma-separated labels users might search for.'));
    form.appendChild(createLoredeckWorkbenchInputField('Tags', 'timelineTags', (existing?.tags || []).join(', '), 'Comma-separated registry tags.'));
    form.appendChild(createLoredeckWorkbenchTextareaField('Notes', 'timelineNotes', existing?.notes || '', 'Editor notes for this Context point.', { rows: 3 }));

    const actions = createLoredeckActionRow({ className: 'saga-primary-actions saga-loredeck-workbench-editor-actions' });
    const save = createButton(existing ? `Update ${isWindow ? 'Window' : 'Anchor'}` : `Add ${isWindow ? 'Window' : 'Anchor'}`, `Save this ${normalizedKind} directly to the Loredeck.`, async btn => {
        await saveLoredeckWorkbenchTimelineItem(pack, normalizedKind, form, btn);
    }, 'saga-primary-button');
    save.disabled = !isLoredeckWorkbenchEditablePack(pack);
    actions.appendChild(save);
    if (existing?.id) {
        const remove = createButton(`Delete ${isWindow ? 'Window' : 'Anchor'}`, `Delete this ${normalizedKind} after confirmation.`, async btn => {
            await deleteLoredeckWorkbenchTimelineItem(pack, normalizedKind, existing.id, btn);
        }, 'saga-danger-button');
        remove.disabled = !isLoredeckWorkbenchEditablePack(pack);
        actions.appendChild(remove);
    }
    actions.appendChild(createButton('Cancel', 'Close the timeline editor form.', () => {
        const slot = form.closest('.saga-loredeck-workbench-timeline-form-slot');
        slot?.replaceChildren(createEmptyMessage(isLoredeckWorkbenchEditablePack(pack)
            ? 'Choose New Anchor, New Window, or Edit a row to update this deck-owned timeline registry.'
            : 'Bundled Loredeck registries are read-only. Duplicate the Loredeck before editing anchors or windows.'));
    }));
    form.appendChild(actions);
    return form;
}

function replaceLoredeckWorkbenchTimelineForm(source, pack = {}, kind = 'anchor', item = null) {
    const panel = source?.closest?.('.saga-loredeck-workbench-registry-panel') || source;
    const slot = panel?.querySelector?.('.saga-loredeck-workbench-timeline-form-slot');
    if (!slot) return;
    const form = createLoredeckWorkbenchTimelineRegistryForm(pack, kind, item);
    slot.replaceChildren(form);
    scheduleWorkbenchFrame(() => form.querySelector(item?.id ? '[name="timelineLabel"]' : '[name="timelineId"]')?.focus?.());
}

function collectLoredeckWorkbenchTimelineForm(kind = 'anchor', form = null) {
    const normalizedKind = kind === 'window' ? 'window' : 'anchor';
    const get = name => String(form?.querySelector(`[name="${name}"]`)?.value || '').trim();
    const id = normalizeWorkbenchTimelineId(get('timelineId'));
    const label = get('timelineLabel');
    if (!id) {
        toast(`${normalizedKind === 'window' ? 'Window' : 'Anchor'} ID is required.`, 'warning');
        return null;
    }
    if (!label) {
        toast(`${normalizedKind === 'window' ? 'Window' : 'Anchor'} label is required.`, 'warning');
        return null;
    }
    const base = {
        id,
        label,
        contextType: get('timelineContextType') || (normalizedKind === 'window' ? 'anchor_window' : 'anchor'),
        aliases: parseWorkbenchTextList(get('timelineAliases'), 64),
        tags: parseWorkbenchTextList(get('timelineTags'), 64),
        notes: get('timelineNotes'),
    };
    if (normalizedKind === 'window') {
        return normalizeWorkbenchTimelineWindow({
            ...base,
            anchorFrom: get('timelineAnchorFrom'),
            anchorTo: get('timelineAnchorTo'),
            sortKeyFrom: get('timelineSortKeyFrom'),
            sortKeyTo: get('timelineSortKeyTo'),
        });
    }
    return normalizeWorkbenchTimelineAnchor({
        ...base,
        sortKey: get('timelineSortKey'),
    });
}

async function saveLoredeckWorkbenchTimelineItem(pack = {}, kind = 'anchor', form = null, button = null) {
    const owner = workbenchLifetime.captureSession();
    pack = { ...pack };
    const setSaveState = (status, message, options = {}) => setLoredeckWorkbenchSaveState(status, message, { ...options, packId: pack.packId, viewOwner: owner });
    if (!form || !isLoredeckWorkbenchEditablePack(pack)) return false;
    const normalizedKind = kind === 'window' ? 'window' : 'anchor';
    const item = collectLoredeckWorkbenchTimelineForm(normalizedKind, form);
    if (!item) return false;
    const originalId = normalizeWorkbenchTimelineId(form.dataset.originalId || '');
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Saving...', { fallbackLabel: 'Save' });
    try {
        const freshPack = getWorkbenchPack(pack.packId) || pack;
        setSaveState('saving', `Saving ${normalizedKind} ${item.id}...`);
        const saved = persistLoredeckLibraryRecordMutation(freshPack, next => {
            const registry = normalizeWorkbenchTimelineRegistry(next.timelineRegistry);
            if (normalizedKind === 'window') {
                registry.windows = upsertWorkbenchTimelineItem(registry.windows, item, originalId, 'window');
                registry.disabledWindowIds = registry.disabledWindowIds.filter(id => ![item.id, originalId].includes(id));
            } else {
                registry.anchors = upsertWorkbenchTimelineItem(registry.anchors, item, originalId, 'anchor');
                registry.disabledAnchorIds = registry.disabledAnchorIds.filter(id => ![item.id, originalId].includes(id));
            }
            next.timelineRegistry = registry;
            next.healthStatus = 'stale';
        }, '', {
            errorMessage: 'Loredeck timeline registry save failed.',
        });
        if (!saved) {
            setSaveState('failed', `Could not save ${normalizedKind} ${item.id}.`);
            return false;
        }
        refreshWorkbenchPackAfterMutation(owner, pack.packId);
        setSaveState('saved', `Saved ${normalizedKind} ${item.id}.`, { render: false, packId: freshPack.packId });
        if (workbenchLifetime.isSessionCurrent(owner)) renderLoredeckWorkbench();
        return true;
    } finally {
        restoreBusy();
    }
}

async function deleteLoredeckWorkbenchTimelineItem(pack = {}, kind = 'anchor', itemId = '', button = null) {
    const owner = workbenchLifetime.captureSession();
    pack = { ...pack };
    const setSaveState = (status, message, options = {}) => setLoredeckWorkbenchSaveState(status, message, { ...options, packId: pack.packId, viewOwner: owner });
    const normalizedKind = kind === 'window' ? 'window' : 'anchor';
    const id = normalizeWorkbenchTimelineId(itemId);
    if (!id || !isLoredeckWorkbenchEditablePack(pack)) return false;
    return withLoredeckConfirmedActionButton(button, {
        confirm: () => confirmAction(`Delete ${normalizedKind === 'window' ? 'Window' : 'Anchor'}`, `Delete ${normalizedKind} ${id} from ${pack.title || pack.packId}? Lorecards keep their stored Context gates, but this deck-owned registry definition is removed. Continue?`),
        busyText: 'Deleting...',
        fallbackLabel: 'Delete',
        cancelValue: false,
    }, async () => {
        const freshPack = getWorkbenchPack(pack.packId) || pack;
        setSaveState('saving', `Deleting ${normalizedKind} ${id}...`);
        const saved = persistLoredeckLibraryRecordMutation(freshPack, next => {
            const registry = normalizeWorkbenchTimelineRegistry(next.timelineRegistry);
            if (normalizedKind === 'window') {
                registry.windows = removeWorkbenchTimelineItem(registry.windows, id);
                registry.disabledWindowIds = registry.disabledWindowIds.filter(disabledId => disabledId !== id);
            } else {
                registry.anchors = removeWorkbenchTimelineItem(registry.anchors, id);
                registry.disabledAnchorIds = registry.disabledAnchorIds.filter(disabledId => disabledId !== id);
            }
            next.timelineRegistry = registry;
            next.healthStatus = 'stale';
        }, '', {
            errorMessage: 'Loredeck timeline registry delete failed.',
        });
        if (!saved) {
            setSaveState('failed', `Could not delete ${normalizedKind} ${id}.`);
            return false;
        }
        refreshWorkbenchPackAfterMutation(owner, pack.packId);
        setSaveState('saved', `Deleted ${normalizedKind} ${id}.`, { render: false, packId: freshPack.packId });
        if (workbenchLifetime.isSessionCurrent(owner)) renderLoredeckWorkbench();
        return true;
    });
}

function suggestLoredeckWorkbenchTimelineItemId(pack = {}, kind = 'anchor') {
    const registry = normalizeWorkbenchTimelineRegistry(pack?.timelineRegistry);
    const list = kind === 'window' ? registry.windows : registry.anchors;
    const prefix = kind === 'window' ? 'window' : 'anchor';
    const existing = new Set((list || []).map(item => normalizeWorkbenchTimelineId(item?.id)).filter(Boolean));
    for (let index = list.length + 1; index <= list.length + 999; index += 1) {
        const id = `${prefix}:${index}`;
        if (!existing.has(id)) return id;
    }
    return `${prefix}:${Date.now()}`;
}

function suggestLoredeckWorkbenchTimelineSortKey(pack = {}) {
    const registry = normalizeWorkbenchTimelineRegistry(pack?.timelineRegistry);
    const max = registry.anchors.reduce((highest, item) => {
        const sortKey = normalizeWorkbenchTimelineNumber(item?.sortKey);
        return sortKey === null ? highest : Math.max(highest, sortKey);
    }, 0);
    return max + 1;
}

function upsertWorkbenchTimelineItem(list = [], item = null, originalId = '', kind = 'anchor') {
    if (!item?.id) return sortWorkbenchTimelineItems(list, kind);
    const removeIds = new Set([normalizeWorkbenchTimelineId(item.id), normalizeWorkbenchTimelineId(originalId)].filter(Boolean));
    return sortWorkbenchTimelineItems([
        ...(Array.isArray(list) ? list : []).filter(existing => !removeIds.has(normalizeWorkbenchTimelineId(existing?.id))),
        item,
    ], kind);
}

function removeWorkbenchTimelineItem(list = [], itemId = '') {
    const id = normalizeWorkbenchTimelineId(itemId);
    return (Array.isArray(list) ? list : []).filter(item => normalizeWorkbenchTimelineId(item?.id) !== id);
}

function sortWorkbenchTimelineItems(list = [], kind = 'anchor') {
    const normalizedKind = kind === 'window' ? 'window' : 'anchor';
    return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
        const aSort = normalizedKind === 'window'
            ? normalizeWorkbenchTimelineNumber(a?.sortKeyFrom) ?? normalizeWorkbenchTimelineNumber(a?.sortKeyTo) ?? Number.MAX_SAFE_INTEGER
            : normalizeWorkbenchTimelineNumber(a?.sortKey) ?? Number.MAX_SAFE_INTEGER;
        const bSort = normalizedKind === 'window'
            ? normalizeWorkbenchTimelineNumber(b?.sortKeyFrom) ?? normalizeWorkbenchTimelineNumber(b?.sortKeyTo) ?? Number.MAX_SAFE_INTEGER
            : normalizeWorkbenchTimelineNumber(b?.sortKey) ?? Number.MAX_SAFE_INTEGER;
        if (aSort !== bSort) return aSort - bSort;
        return String(a?.label || a?.id || '').localeCompare(String(b?.label || b?.id || ''));
    });
}

function createLoredeckWorkbenchControls(pack = {}, rows = workbenchModel?.logicalRows || [], target = null, presentation = workbenchModel) {
    const controls = target || document.createElement('div');
    if (!target) controls.className = 'saga-lore-workbench-controls saga-loredeck-workbench-controls';

    controls.appendChild(createLoredeckSearchInput({
        className: 'saga-lore-workbench-search',
        placeholder: 'Search Lorecards...',
        value: loredeckWorkbenchQuery,
        tooltip: 'Search by Lorecard title, ID, summary, tags, category, Context, or source file.',
        onInput: (value, input) => {
            loredeckWorkbenchQuery = value;
            renderLoredeckWorkbench();
        },
    }));

    controls.appendChild(createWorkbenchSelect('Relevance', loredeckWorkbenchRelevanceFilter, getRelevanceFilterOptions(), value => {
        loredeckWorkbenchRelevanceFilter = value || 'all';
        renderLoredeckWorkbench();
    }));
    controls.appendChild(createWorkbenchSelect('Category', loredeckWorkbenchCategoryFilter, presentation.categoryOptions, value => {
        loredeckWorkbenchCategoryFilter = value || 'all';
        renderLoredeckWorkbench();
    }));
    controls.appendChild(createWorkbenchSelect('Status', loredeckWorkbenchStatusFilter, getStatusFilterOptions(), value => {
        loredeckWorkbenchStatusFilter = value || 'active';
        renderLoredeckWorkbench();
    }));

    controls.appendChild(createLoredeckFilterCount({
        className: 'saga-lore-workbench-count',
        text: `${presentation.matchCount} of ${presentation.totalCount} Lorecards`,
        tooltip: `Current filters for ${pack.title || pack.packId}.`,
    }));
    return controls;
}

function createWorkbenchSelect(labelText, value, options, onChange) {
    return createLoredeckSelectControl({
        className: 'saga-lore-workbench-select',
        value,
        fallbackValue: 'all',
        options,
        tooltip: `Filter by ${labelText.toLowerCase()}.`,
        onChange,
    });
}

function createLoredeckWorkbenchTableHeader(rows = [], selectable = false, target = null) {
    const header = target || document.createElement('div');
    if (selectable) header.appendChild(createLoredeckWorkbenchSelectHeaderCell(rows));
    header.appendChild(createWorkbenchCell('Lorecard'));
    header.appendChild(createWorkbenchCell('Type'));
    header.appendChild(createWorkbenchCell('Relevance'));
    header.appendChild(createWorkbenchCell('State / Source'));
    return header;
}

function createWorkbenchCell(text, subText = '') {
    const cell = document.createElement('div');
    cell.className = 'saga-lore-workbench-cell';
    const main = document.createElement('span');
    main.className = 'saga-lore-workbench-cell-main';
    main.textContent = String(text || 'unset');
    cell.appendChild(main);
    if (subText) {
        const sub = document.createElement('span');
        sub.className = 'saga-lore-workbench-cell-sub';
        sub.textContent = String(subText || '');
        cell.appendChild(sub);
    }
    return cell;
}

function createLoredeckWorkbenchSelectHeaderCell(rows = []) {
    const cell = document.createElement('span');
    cell.className = 'saga-loredeck-workbench-select-cell saga-loredeck-workbench-select-header-cell';
    const visibleIds = getLoredeckWorkbenchSelectableRowIds(rows);
    const selectedVisibleCount = visibleIds.filter(id => loredeckWorkbenchBulkSelection.has(id)).length;
    const checked = !!visibleIds.length && selectedVisibleCount === visibleIds.length;
    const box = document.createElement('span');
    box.className = `saga-loredeck-workbench-select-box${checked ? ' saga-loredeck-workbench-select-box-checked' : ''}`;
    box.textContent = checked ? 'x' : '';
    box.setAttribute('role', 'checkbox');
    box.setAttribute('aria-checked', checked ? 'true' : 'false');
    addTooltip(box, checked ? 'Clear visible Lorecard selection.' : 'Select all visible Lorecards.');
    box.addEventListener('click', event => {
        event.stopPropagation();
        if (workbenchModel.headerChecked) clearLoredeckWorkbenchBulkSelection(workbenchModel.logicalIds);
        else selectLoredeckWorkbenchVisibleRows(workbenchModel.logicalRows);
    });
    cell.appendChild(box);
    return cell;
}

function createLoredeckWorkbenchBulkToolbar(pack = {}, rows = [], target = null) {
    const toolbar = target || document.createElement('div');
    if (!target) toolbar.className = 'saga-loredeck-workbench-bulk-toolbar';
    const owner = workbenchLifetime.captureSession();
    const viewOwner = workbenchLifetime.captureView(workbenchView?.host);
    const createActionButton = (label, tip, action, className) => createButton(label, tip, async button => {
        try { return await action(button); }
        finally {
            // Shared busy helpers restore the original disabled state after the
            // callback. Reconcile once after their finally blocks have run.
            if (workbenchLifetime.isSessionCurrent(owner) && workbenchLifetime.isViewCurrent(viewOwner)) scheduleWorkbenchFrame(renderLoredeckWorkbench);
        }
    }, className);
    const selectedIds = getLoredeckWorkbenchSelectedIds();
    const selectedCount = selectedIds.length;

    toolbar.appendChild(createLoredeckSelectionSummary({
        className: 'saga-loredeck-workbench-bulk-summary',
        selectedCount,
        emptyText: 'No bulk selection',
        tooltip: 'Bulk actions apply directly after confirmation.',
    }));

    toolbar.appendChild(createActionButton('Select Visible', 'Select every visible Lorecard matching the current filters.', () => {
        selectLoredeckWorkbenchVisibleRows(workbenchModel.logicalRows);
    }));
    toolbar.appendChild(createActionButton('Clear', 'Clear the current bulk selection.', () => {
        clearLoredeckWorkbenchBulkSelection();
    }));

    const relevance = createLoredeckWorkbenchBulkSelect(getEntryRelevanceOptions(), 'normal', 'Bulk relevance tier.');
    toolbar.appendChild(relevance);
    toolbar.appendChild(createActionButton('Set Relevance', 'Set the selected Lorecards to this relevance tier.', async btn => {
        const value = relevance.value;
        await applyLoredeckWorkbenchBulkEntryEdit(pack, 'Set Relevance', getLoredeckWorkbenchSelectedIds(), fields => ({ ...fields, relevance: value }), btn);
    }, selectedCount ? '' : 'saga-disabled-like'));

    const category = createLoredeckWorkbenchBulkInput('Category', 'character', 'Bulk category/type value.');
    toolbar.appendChild(category);
    toolbar.appendChild(createActionButton('Set Category', 'Set the selected Lorecards to this category/type.', async btn => {
        const value = String(category.value || '').trim();
        await applyLoredeckWorkbenchBulkEntryEdit(pack, 'Set Category', getLoredeckWorkbenchSelectedIds(), fields => ({ ...fields, category: value || fields.category }), btn, { requireValue: value, requireValueLabel: 'category' });
    }, selectedCount ? '' : 'saga-disabled-like'));

    const tag = createLoredeckWorkbenchBulkInput('Tag', 'faction:straw-hats', 'Tag to add or remove.');
    toolbar.appendChild(tag);
    toolbar.appendChild(createActionButton('Add Tag', 'Add this tag to every selected Lorecard.', async btn => {
        const value = String(tag.value || '').trim();
        await applyLoredeckWorkbenchBulkEntryEdit(pack, 'Add Tag', getLoredeckWorkbenchSelectedIds(), fields => ({ ...fields, tags: mergeLoredeckWorkbenchTags(fields.tags, [value]) }), btn, { requireTag: value });
    }, selectedCount ? '' : 'saga-disabled-like'));
    toolbar.appendChild(createActionButton('Remove Tag', 'Remove this tag from every selected Lorecard.', async btn => {
        const value = String(tag.value || '').trim();
        await applyLoredeckWorkbenchBulkEntryEdit(pack, 'Remove Tag', getLoredeckWorkbenchSelectedIds(), fields => ({ ...fields, tags: (fields.tags || []).filter(item => item !== value) }), btn, { requireTag: value });
    }, selectedCount ? '' : 'saga-disabled-like'));

    const contextLabel = createLoredeckWorkbenchBulkInput('Context Label', 'Arlong Park Arc', 'Human-readable Context gate label.');
    const contextScope = createLoredeckWorkbenchBulkSelect(getContextScopeOptions(), 'window', 'Context scope for selected Lorecards.');
    const contextFrom = createLoredeckWorkbenchBulkInput('From', '1200', 'Context sortKeyFrom value.');
    const contextTo = createLoredeckWorkbenchBulkInput('To', '1299', 'Context sortKeyTo value.');
    const contextFromAnchor = createLoredeckWorkbenchBulkInput('From Anchor', 'arc.arlong-park.start', 'Optional validFromAnchor ID.');
    const contextToAnchor = createLoredeckWorkbenchBulkInput('To Anchor', 'arc.arlong-park.end', 'Optional validToAnchor ID.');
    toolbar.appendChild(contextLabel);
    toolbar.appendChild(contextScope);
    toolbar.appendChild(contextFrom);
    toolbar.appendChild(contextTo);
    toolbar.appendChild(contextFromAnchor);
    toolbar.appendChild(contextToAnchor);
    toolbar.appendChild(createActionButton('Set Context', 'Set one Context gate on every selected Lorecard.', async btn => {
        const contextGate = buildLoredeckWorkbenchBulkContextGate({
            label: contextLabel.value,
            scope: contextScope.value,
            from: contextFrom.value,
            to: contextTo.value,
            fromAnchor: contextFromAnchor.value,
            toAnchor: contextToAnchor.value,
        });
        await applyLoredeckWorkbenchBulkEntryEdit(pack, 'Set Context', getLoredeckWorkbenchSelectedIds(), fields => ({ ...fields, context: contextGate }), btn, { requireContextGate: contextGate });
    }, selectedCount ? '' : 'saga-disabled-like'));

    toolbar.appendChild(createActionButton('Duplicate Selected', 'Duplicate selected Lorecards as new Custom additions in this Loredeck.', async btn => {
        await duplicateLoredeckWorkbenchSelectedEntries(pack, getLoredeckWorkbenchSelectedIds(), btn);
    }, selectedCount ? '' : 'saga-disabled-like'));
    toolbar.appendChild(createActionButton('Restore Selected', 'Restore selected disabled Lorecards by removing them from this deck disabled list.', async btn => {
        await restoreLoredeckWorkbenchSelectedEntries(pack, getLoredeckWorkbenchSelectedIds(), btn);
    }, selectedCount ? '' : 'saga-disabled-like'));
    toolbar.appendChild(createActionButton('Delete Selected', 'Delete selected Custom additions or suppress selected source Lorecards in this editable Loredeck.', async btn => {
        await deleteLoredeckWorkbenchSelectedEntries(pack, getLoredeckWorkbenchSelectedIds(), btn);
    }, selectedCount ? 'saga-danger-button' : 'saga-danger-button saga-disabled-like'));

    toolbar.querySelectorAll('.saga-disabled-like').forEach(btn => {
        btn.disabled = true;
    });
    return toolbar;
}

function createLoredeckWorkbenchBulkSelect(options = [], value = '', tip = '') {
    const select = document.createElement('select');
    select.className = 'saga-loredeck-workbench-bulk-control';
    for (const [optionValue, optionLabel] of options) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionLabel;
        select.appendChild(option);
    }
    select.value = options.some(([optionValue]) => optionValue === value) ? value : (options[0]?.[0] || '');
    if (tip) addTooltip(select, tip);
    return select;
}

function createLoredeckWorkbenchBulkInput(label, placeholder = '', tip = '') {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'saga-loredeck-workbench-bulk-control';
    input.placeholder = label;
    input.value = '';
    input.dataset.placeholderExample = placeholder;
    if (tip) addTooltip(input, `${tip}${placeholder ? ` Example: ${placeholder}` : ''}`);
    return input;
}

function getContextScopeOptions() {
    return [
        ['window', 'Window'],
        ['anchor', 'Anchor'],
        ['global', 'Global'],
    ];
}

function buildLoredeckWorkbenchBulkContextGate(raw = {}) {
    const label = String(raw.label || '').trim();
    const scope = ['anchor', 'window', 'global'].includes(String(raw.scope || '').trim()) ? String(raw.scope || '').trim() : 'window';
    const sortKeyFrom = Number(raw.from);
    const sortKeyTo = Number(raw.to);
    const validFromAnchor = String(raw.fromAnchor || '').trim();
    const validToAnchor = String(raw.toAnchor || '').trim();
    const gate = {
        scope,
        label,
        sortKeyFrom,
        sortKeyTo,
        precision: scope === 'global' ? 'series' : 'manual',
    };
    if (validFromAnchor) gate.validFromAnchor = validFromAnchor;
    if (validToAnchor) gate.validToAnchor = validToAnchor;
    if (scope === 'anchor' && validFromAnchor) gate.anchorId = validFromAnchor;
    return gate;
}

function isValidLoredeckWorkbenchContextGate(contextGate = {}) {
    if (!contextGate || typeof contextGate !== 'object' || Array.isArray(contextGate)) return false;
    if (!String(contextGate.label || '').trim()) return false;
    if (!['anchor', 'window', 'global'].includes(String(contextGate.scope || '').trim())) return false;
    return Number.isFinite(Number(contextGate.sortKeyFrom)) && Number.isFinite(Number(contextGate.sortKeyTo));
}

function getLoredeckWorkbenchSelectableRowIds(rows = getFilteredLoredeckWorkbenchRows()) {
    return (rows || [])
        .filter(row => row?.id && !row.draft)
        .map(row => String(row.id || '').trim())
        .filter(Boolean);
}

function getLoredeckWorkbenchSelectedIds() {
    return [...loredeckWorkbenchBulkSelection].filter(Boolean);
}

function getLoredeckWorkbenchRowMap() {
    const map = new Map();
    for (const row of loredeckWorkbenchCache.rows || []) {
        const id = String(row?.id || '').trim();
        if (id) map.set(id, row);
    }
    return map;
}

function reconcileLoredeckWorkbenchBulkSelection(rows = getFilteredLoredeckWorkbenchRows()) {
    const valid = new Set(getLoredeckWorkbenchSelectableRowIds(rows));
    loredeckWorkbenchBulkSelection = new Set([...loredeckWorkbenchBulkSelection].filter(id => valid.has(id)));
    if (loredeckWorkbenchLastSelectionId && !valid.has(loredeckWorkbenchLastSelectionId)) loredeckWorkbenchLastSelectionId = '';
}

function selectLoredeckWorkbenchVisibleRows(rows = getFilteredLoredeckWorkbenchRows()) {
    const ids = getLoredeckWorkbenchSelectableRowIds(rows);
    loredeckWorkbenchBulkSelection = new Set([...loredeckWorkbenchBulkSelection, ...ids]);
    if (ids.length) loredeckWorkbenchLastSelectionId = ids[ids.length - 1];
    renderLoredeckWorkbench();
}

function clearLoredeckWorkbenchBulkSelection(ids = null) {
    if (Array.isArray(ids) && ids.length) {
        for (const id of ids) loredeckWorkbenchBulkSelection.delete(id);
    } else {
        loredeckWorkbenchBulkSelection = new Set();
        loredeckWorkbenchLastSelectionId = '';
    }
    renderLoredeckWorkbench();
}

function toggleLoredeckWorkbenchBulkSelection(id = '', rows = getFilteredLoredeckWorkbenchRows(), options = {}) {
    const entryId = String(id || '').trim();
    if (!entryId) return;
    const visibleIds = getLoredeckWorkbenchSelectableRowIds(rows);
    if (options.range && loredeckWorkbenchLastSelectionId && visibleIds.includes(loredeckWorkbenchLastSelectionId) && visibleIds.includes(entryId)) {
        const from = visibleIds.indexOf(loredeckWorkbenchLastSelectionId);
        const to = visibleIds.indexOf(entryId);
        const [start, end] = from <= to ? [from, to] : [to, from];
        for (const rangeId of visibleIds.slice(start, end + 1)) loredeckWorkbenchBulkSelection.add(rangeId);
    } else if (loredeckWorkbenchBulkSelection.has(entryId)) {
        loredeckWorkbenchBulkSelection.delete(entryId);
    } else {
        if (!options.additive) loredeckWorkbenchBulkSelection = new Set();
        loredeckWorkbenchBulkSelection.add(entryId);
    }
    loredeckWorkbenchLastSelectionId = entryId;
}

function mergeLoredeckWorkbenchTags(current = [], additions = []) {
    const seen = new Set();
    const output = [];
    for (const value of [...(current || []), ...(additions || [])]) {
        const tag = String(value || '').trim();
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        output.push(tag);
    }
    return output;
}

async function applyLoredeckWorkbenchBulkEntryEdit(pack = {}, actionLabel = 'Bulk Edit', rawIds = [], updateFields, button = null, options = {}) {
    const owner = workbenchLifetime.captureSession();
    pack = { ...pack };
    const setSaveState = (status, message, options = {}) => setLoredeckWorkbenchSaveState(status, message, { ...options, packId: pack.packId, viewOwner: owner });
    const rowMap = getLoredeckWorkbenchRowMap();
    const selectedIds = [...new Set((rawIds || []).map(id => String(id || '').trim()).filter(Boolean))];
    if (!selectedIds.length) {
        toast('Select one or more Lorecards first.', 'warning');
        return false;
    }
    if (options.requireTag !== undefined && !String(options.requireTag || '').trim()) {
        toast('Enter a tag before applying the bulk tag action.', 'warning');
        return false;
    }
    if (options.requireValue !== undefined && !String(options.requireValue || '').trim()) {
        toast(`Enter a ${options.requireValueLabel || 'value'} before applying this bulk action.`, 'warning');
        return false;
    }
    if (options.requireContextGate !== undefined && !isValidLoredeckWorkbenchContextGate(options.requireContextGate)) {
        toast('Set Context needs a label and numeric From/To sort keys.', 'warning');
        return false;
    }
    if (typeof updateFields !== 'function') return false;
    return withLoredeckConfirmedActionButton(button, {
        confirm: () => confirmAction(actionLabel, `${actionLabel} will update ${selectedIds.length} Lorecard${selectedIds.length === 1 ? '' : 's'} in ${pack.title || pack.packId}. This saves directly and marks Pack Health stale. Continue?`),
        busyText: 'Applying...',
        fallbackLabel: actionLabel,
        cancelValue: false,
    }, async () => {
        const freshPack = getWorkbenchPack(pack.packId) || pack;
        const entryOverrides = {};
        for (const id of selectedIds) {
            const row = rowMap.get(id);
            if (!row || row.draft) continue;
            const fields = updateFields(getLoredeckWorkbenchEntryFields(row.entry), row) || getLoredeckWorkbenchEntryFields(row.entry);
            entryOverrides[id] = buildLoredeckWorkbenchEntryOverride(freshPack, row, fields);
        }
        const count = Object.keys(entryOverrides).length;
        if (!count) {
            toast('No selected Lorecards could be updated.', 'warning');
            return false;
        }
        setSaveState('saving', `${actionLabel}: updating ${count} Lorecard${count === 1 ? '' : 's'}...`);
        const saved = persistLoredeckLibraryRecordMutation(freshPack, next => {
            next.entryOverrides = {
                ...(next.entryOverrides || {}),
                ...entryOverrides,
            };
            const disabled = new Set(Array.isArray(next.disabledEntryIds) ? next.disabledEntryIds : []);
            for (const id of Object.keys(entryOverrides)) disabled.delete(id);
            next.disabledEntryIds = [...disabled];
            next.healthStatus = 'stale';
        }, '', {
            errorMessage: 'Loredeck bulk edit failed.',
        });
        if (!saved) {
            setSaveState('failed', `${actionLabel} failed.`);
            return false;
        }
        refreshWorkbenchPackAfterMutation(owner, pack.packId);
        if (workbenchLifetime.isSessionCurrent(owner)) {
            loredeckWorkbenchBulkSelection = new Set();
            loredeckWorkbenchLastSelectionId = '';
        }
        setSaveState('saved', `${actionLabel} updated ${count} Lorecard${count === 1 ? '' : 's'}.`, { render: false, packId: freshPack.packId });
        await loadLoredeckWorkbenchRows(freshPack.packId, { force: true, viewOwner: owner });
        return true;
    });
}

async function deleteLoredeckWorkbenchSelectedEntries(pack = {}, rawIds = [], button = null) {
    const owner = workbenchLifetime.captureSession();
    pack = { ...pack };
    const setSaveState = (status, message, options = {}) => setLoredeckWorkbenchSaveState(status, message, { ...options, packId: pack.packId, viewOwner: owner });
    const rowMap = getLoredeckWorkbenchRowMap();
    const selectedIds = [...new Set((rawIds || []).map(id => String(id || '').trim()).filter(Boolean))];
    if (!selectedIds.length) {
        toast('Select one or more Lorecards first.', 'warning');
        return false;
    }
    return withLoredeckConfirmedActionButton(button, {
        confirm: () => confirmAction(
            'Delete Selected Lorecards',
            `Delete ${selectedIds.length} selected Lorecard${selectedIds.length === 1 ? '' : 's'} from ${pack.title || pack.packId}? Custom additions will be removed. Source Lorecards will be suppressed in this editable deck. This saves directly and marks Pack Health stale.`
        ),
        busyText: 'Deleting...',
        fallbackLabel: 'Delete Selected',
        cancelValue: false,
    }, async () => {
        const freshPack = getWorkbenchPack(pack.packId) || pack;
        const affected = selectedIds.filter(id => rowMap.has(id));
        if (!affected.length) {
            toast('No selected Lorecards could be deleted.', 'warning');
            return false;
        }
        setSaveState('saving', `Deleting ${affected.length} Lorecard${affected.length === 1 ? '' : 's'}...`);
        const saved = persistLoredeckLibraryRecordMutation(freshPack, next => {
            next.entryOverrides = { ...(next.entryOverrides || {}) };
            const disabled = new Set(Array.isArray(next.disabledEntryIds) ? next.disabledEntryIds : []);
            for (const id of affected) {
                const row = rowMap.get(id);
                delete next.entryOverrides[id];
                if (isLoredeckWorkbenchAdditionRow(row)) disabled.delete(id);
                else disabled.add(id);
            }
            next.disabledEntryIds = [...disabled];
            next.healthStatus = 'stale';
        }, '', {
            errorMessage: 'Loredeck delete failed.',
        });
        if (!saved) {
            setSaveState('failed', 'Delete selected failed.');
            return false;
        }
        refreshWorkbenchPackAfterMutation(owner, pack.packId);
        if (workbenchLifetime.isSessionCurrent(owner)) {
            loredeckWorkbenchBulkSelection = new Set();
            loredeckWorkbenchLastSelectionId = '';
        }
        if (workbenchLifetime.isSessionCurrent(owner) && affected.includes(loredeckWorkbenchSelectedEntryId)) loredeckWorkbenchSelectedEntryId = '';
        setSaveState('saved', `Deleted ${affected.length} Lorecard${affected.length === 1 ? '' : 's'}.`, { render: false, packId: freshPack.packId });
        await loadLoredeckWorkbenchRows(freshPack.packId, { force: true, viewOwner: owner });
        return true;
    });
}

async function restoreLoredeckWorkbenchSelectedEntries(pack = {}, rawIds = [], button = null) {
    const owner = workbenchLifetime.captureSession();
    pack = { ...pack };
    const setSaveState = (status, message, options = {}) => setLoredeckWorkbenchSaveState(status, message, { ...options, packId: pack.packId, viewOwner: owner });
    const rowMap = getLoredeckWorkbenchRowMap();
    const selectedIds = [...new Set((rawIds || []).map(id => String(id || '').trim()).filter(Boolean))];
    if (!selectedIds.length) {
        toast('Select one or more Lorecards first.', 'warning');
        return false;
    }
    const disabledSelected = selectedIds.filter(id => {
        const row = rowMap.get(id);
        return row?.disabled === true;
    });
    if (!disabledSelected.length) {
        toast('No selected Lorecards are disabled.', 'warning');
        return false;
    }
    return withLoredeckConfirmedActionButton(button, {
        confirm: () => confirmAction(
            'Restore Selected Lorecards',
            `Restore ${disabledSelected.length} disabled Lorecard${disabledSelected.length === 1 ? '' : 's'} in ${pack.title || pack.packId}? This saves directly and marks Pack Health stale.`
        ),
        busyText: 'Restoring...',
        fallbackLabel: 'Restore Selected',
        cancelValue: false,
    }, async () => {
        const freshPack = getWorkbenchPack(pack.packId) || pack;
        setSaveState('saving', `Restoring ${disabledSelected.length} Lorecard${disabledSelected.length === 1 ? '' : 's'}...`);
        const saved = persistLoredeckLibraryRecordMutation(freshPack, next => {
            const restoreSet = new Set(disabledSelected);
            next.disabledEntryIds = (Array.isArray(next.disabledEntryIds) ? next.disabledEntryIds : [])
                .filter(id => !restoreSet.has(String(id || '').trim()));
            next.healthStatus = 'stale';
        }, '', {
            errorMessage: 'Loredeck restore failed.',
        });
        if (!saved) {
            setSaveState('failed', 'Restore selected failed.');
            return false;
        }
        refreshWorkbenchPackAfterMutation(owner, pack.packId);
        if (workbenchLifetime.isSessionCurrent(owner)) {
            loredeckWorkbenchBulkSelection = new Set();
            loredeckWorkbenchLastSelectionId = '';
        }
        setSaveState('saved', `Restored ${disabledSelected.length} Lorecard${disabledSelected.length === 1 ? '' : 's'}.`, { render: false, packId: freshPack.packId });
        await loadLoredeckWorkbenchRows(freshPack.packId, { force: true, viewOwner: owner });
        return true;
    });
}

async function duplicateLoredeckWorkbenchSelectedEntries(pack = {}, rawIds = [], button = null) {
    const owner = workbenchLifetime.captureSession();
    pack = { ...pack };
    const setSaveState = (status, message, options = {}) => setLoredeckWorkbenchSaveState(status, message, { ...options, packId: pack.packId, viewOwner: owner });
    const rowMap = getLoredeckWorkbenchRowMap();
    const selectedIds = [...new Set((rawIds || []).map(id => String(id || '').trim()).filter(Boolean))];
    if (!selectedIds.length) {
        toast('Select one or more Lorecards first.', 'warning');
        return false;
    }
    return withLoredeckConfirmedActionButton(button, {
        confirm: () => confirmAction(
            'Duplicate Selected Lorecards',
            `Duplicate ${selectedIds.length} selected Lorecard${selectedIds.length === 1 ? '' : 's'} as Custom additions in ${pack.title || pack.packId}? This saves directly and marks Pack Health stale.`
        ),
        busyText: 'Duplicating...',
        fallbackLabel: 'Duplicate Selected',
        cancelValue: false,
    }, async () => {
        const freshPack = getWorkbenchPack(pack.packId) || pack;
        const existing = getLoredeckWorkbenchExistingEntryIds(freshPack, [...rowMap.values()]);
        const entryOverrides = {};
        for (const id of selectedIds) {
            const row = rowMap.get(id);
            if (!row || row.draft || row.disabled) continue;
            const duplicateId = suggestLoredeckWorkbenchDuplicateEntryId(id, existing);
            existing.add(duplicateId);
            const fields = getLoredeckWorkbenchEntryFields(row.entry);
            const entry = buildLoredeckWorkbenchEntryOverride(freshPack, {
                ...row,
                id: duplicateId,
                draft: true,
                entry: {
                    ...(row.entry || {}),
                    id: duplicateId,
                    title: `Copy of ${row.entry?.title || id}`,
                },
                sourceFile: '__saga_entry_overrides__',
            }, {
                ...fields,
                machineId: duplicateId,
                title: `Copy of ${fields.title || id}`,
            });
            entryOverrides[duplicateId] = entry;
        }
        const count = Object.keys(entryOverrides).length;
        if (!count) {
            toast('No selected Lorecards could be duplicated.', 'warning');
            return false;
        }
        setSaveState('saving', `Duplicating ${count} Lorecard${count === 1 ? '' : 's'}...`);
        const saved = persistLoredeckLibraryRecordMutation(freshPack, next => {
            next.entryOverrides = {
                ...(next.entryOverrides || {}),
                ...entryOverrides,
            };
            next.healthStatus = 'stale';
        }, '', {
            errorMessage: 'Loredeck duplicate failed.',
        });
        if (!saved) {
            setSaveState('failed', 'Duplicate selected failed.');
            return false;
        }
        refreshWorkbenchPackAfterMutation(owner, pack.packId);
        if (workbenchLifetime.isSessionCurrent(owner)) {
            const duplicatedIds = Object.keys(entryOverrides);
            loredeckWorkbenchBulkSelection = new Set(duplicatedIds);
            loredeckWorkbenchLastSelectionId = duplicatedIds[duplicatedIds.length - 1] || '';
            loredeckWorkbenchSelectedEntryId = loredeckWorkbenchLastSelectionId || loredeckWorkbenchSelectedEntryId;
        }
        setSaveState('saved', `Duplicated ${count} Lorecard${count === 1 ? '' : 's'}.`, { render: false, packId: freshPack.packId });
        await loadLoredeckWorkbenchRows(freshPack.packId, { force: true, viewOwner: owner });
        return true;
    });
}

function isLoredeckWorkbenchAdditionRow(row = {}) {
    const overrideMeta = row?.entry?.extensions?.sagaLoredeckOverride && typeof row.entry.extensions.sagaLoredeckOverride === 'object'
        ? row.entry.extensions.sagaLoredeckOverride
        : {};
    const sourceFile = String(row?.sourceFile || '').trim();
    return String(overrideMeta.kind || '').trim() === 'addition'
        || ['__saga_entry_overrides__', '__saga_embedded_entries__', '__saga_generated_entries__'].includes(sourceFile);
}

function createLoredeckWorkbenchDetail(pack = {}, rows = [], target = null) {
    const detail = target || document.createElement('div');
    if (!target) detail.className = 'saga-lore-workbench-detail saga-loredeck-workbench-detail';
    const selected = rows.find(row => row.id === loredeckWorkbenchSelectedEntryId) || rows[0] || null;
    if (!selected) {
        detail.appendChild(createEmptyMessage('Select a Lorecard to inspect it.'));
        return detail;
    }
    if (isLoredeckWorkbenchEditablePack(pack)) return createLoredeckWorkbenchEditableDetail(pack, selected, target);

    const entry = selected.entry || {};
    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = entry.title || selected.id;
    detail.appendChild(title);

    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-row-meta';
    chips.appendChild(createStatusPill(getEntryRelevance(entry), 'Lorecard relevance tier.', { tone: 'relevance', kind: 'metadata' }));
    chips.appendChild(createStatusPill(getEntryCategory(entry), 'Lorecard category/type.', { tone: 'category', kind: 'metadata' }));
    if (selected.disabled) chips.appendChild(createStatusPill('Disabled', 'This Lorecard is suppressed by this editable Loredeck.', { tone: 'muted', kind: 'status' }));
    chips.appendChild(createStatusPill(selected.sourceFile || 'embedded', 'Source file for this Lorecard.', { tone: 'source', kind: 'source', maxChars: 36 }));
    chips.appendChild(createStatusPill('Read-only', 'Bundled Loredecks must be duplicated before editing.', { tone: 'muted', kind: 'status' }));
    detail.appendChild(chips);

    const grid = document.createElement('div');
    grid.className = 'saga-loredeck-workbench-detail-grid';
    grid.appendChild(createKeyValue('ID', selected.id, 'Stable Lorecard machine ID.'));
    grid.appendChild(createKeyValue('Canon', getEntryCanonStatus(entry), 'Canon/AU/custom status.'));
    grid.appendChild(createKeyValue('Truth', entry.truthStatus || entry.truth || 'unset', 'Truth or reliability status.'));
    grid.appendChild(createKeyValue('Reveal', entry.revealPolicy || entry.reveal || 'unset', 'Reveal/knowledge policy.'));
    detail.appendChild(grid);

    const fact = document.createElement('div');
    fact.className = 'saga-loredeck-workbench-entry-text';
    fact.textContent = getEntryMainText(entry) || 'No Lorecard content available.';
    detail.appendChild(fact);

    const tags = getEntryTags(entry);
    if (tags.length) {
        const tagWrap = document.createElement('div');
        tagWrap.className = 'saga-loredeck-row-meta saga-loredeck-workbench-tags';
        for (const tag of tags.slice(0, 32)) tagWrap.appendChild(createStatusPill(tag, 'Lorecard tag.', { tone: 'tag', kind: 'tag', maxChars: 32 }));
        if (tags.length > 32) tagWrap.appendChild(createStatusPill(`+${tags.length - 32}`, 'Additional tags hidden in this compact view.', { tone: 'muted', kind: 'count' }));
        detail.appendChild(tagWrap);
    }

    const contextText = getEntryContextSummary(entry);
    if (contextText) detail.appendChild(createKeyValue('Context Gate', contextText, 'Context activation gate for this Lorecard.'));

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Duplicate to Edit', 'Create an editable Custom copy of this Bundled Loredeck.', () => {
        openDuplicateLoredeckDialog(pack);
    }, 'saga-primary-button'));
    detail.appendChild(actions);
    return detail;
}

function createLoredeckWorkbenchEditableDetail(pack = {}, selected = {}, target = null) {
    const detail = target || document.createElement('div');
    if (!target) detail.className = 'saga-lore-workbench-detail saga-loredeck-workbench-detail saga-loredeck-workbench-editor-detail';
    const entry = selected.entry || {};
    const fields = getLoredeckWorkbenchEntryFields(entry);

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = selected.draft ? 'New Lorecard' : 'Lorecard Editor';
    detail.appendChild(title);

    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-row-meta';
    chips.appendChild(createStatusPill(selected.draft ? 'Draft' : (selected.disabled ? 'Disabled' : 'Editable'), selected.draft ? 'This Lorecard has not been created yet.' : (selected.disabled ? 'Saving this Lorecard will restore it.' : 'Manual field edits save directly to this Loredeck.'), { tone: selected.draft ? 'review' : (selected.disabled ? 'muted' : 'success'), kind: 'status' }));
    chips.appendChild(createStatusPill(selected.sourceFile || 'embedded', 'Source file for this Lorecard.', { tone: 'source', kind: 'source', maxChars: 36 }));
    chips.appendChild(createStatusPill(selected.id, 'Stable Lorecard machine ID.', { tone: 'source', kind: 'source', maxChars: 38 }));
    detail.appendChild(chips);

    const form = document.createElement('div');
    form.className = 'saga-loredeck-workbench-editor-form';
    form.dataset.entryId = selected.id || '';

    if (selected.draft) {
        form.appendChild(createLoredeckWorkbenchInputField('Machine ID', 'machineId', selected.id, 'Stable Lorecard machine ID. Use lowercase words separated by hyphens or dots.'));
    } else {
        form.appendChild(createLoredeckWorkbenchReadonlyField('Machine ID', selected.id, 'Stable Lorecard machine ID. ID editing will be handled by the bulk ID tools.'));
    }
    form.appendChild(createLoredeckWorkbenchInputField('Title', 'title', fields.title, 'Lorecard display title.', { full: true, required: true }));
    form.appendChild(createLoredeckWorkbenchInputField('Category', 'category', fields.category, 'Type/category used by filters and Pack Health.'));
    form.appendChild(createLoredeckWorkbenchSelectField('Relevance', 'relevance', fields.relevance, getEntryRelevanceOptions(), 'Lorecard relevance tier.'));
    form.appendChild(createLoredeckWorkbenchSelectField('Canon', 'canonStatus', fields.canonStatus, getEntryCanonStatusOptions(fields.canonStatus), 'Canon/AU/custom status.'));
    form.appendChild(createLoredeckWorkbenchInputField('Tags', 'tags', fields.tags.join(', '), 'Comma-separated Lorecard tags.', { full: true }));
    form.appendChild(createLoredeckWorkbenchTextareaField('Lore Text', 'fact', fields.fact, 'Primary high-value lore content.', { rows: 6 }));
    form.appendChild(createLoredeckWorkbenchTextareaField('Injection Text', 'injection', fields.injection, 'Optional prompt-facing injection text. Leave blank to let Lore Text carry the entry.', { rows: 5 }));
    form.appendChild(createLoredeckWorkbenchTextareaField('Notes', 'notes', fields.notes, 'Optional editor/source notes.', { rows: 3 }));

    const draft = selected.draft ? loredeckWorkbenchDraftEntry : null;
    if (draft?.buffer) {
        for (const input of form.querySelectorAll('[name]')) {
            if (Object.prototype.hasOwnProperty.call(draft.buffer, input.name)) input.value = draft.buffer[input.name];
        }
    }
    const dispose = selected.draft ? wireLoredeckWorkbenchDraftCreate(form, pack, selected) : wireLoredeckWorkbenchAutosave(form, pack, selected);
    workbenchFormDisposers.set(form, dispose);
    detail.appendChild(form);

    const hint = document.createElement('div');
    hint.className = 'saga-loredeck-workbench-editor-hint';
    hint.textContent = selected.draft
        ? 'Fill the machine ID, title, and lore text, then create the Lorecard.'
        : 'Text fields save on blur. Select fields save immediately. Ctrl+Enter saves the focused text area.';
    detail.appendChild(hint);
    return detail;
}

function isLoredeckWorkbenchEditablePack(pack = {}) {
    return !!pack?.packId && pack.type !== 'bundled';
}

function resetLoredeckWorkbenchSaveState(packId = loredeckWorkbenchPackId) {
    loredeckWorkbenchSaveState = {
        packId: String(packId || '').trim(),
        status: 'idle',
        message: '',
        updatedAt: 0,
    };
}

function setLoredeckWorkbenchSaveState(status = 'idle', message = '', options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'viewOwner') && !workbenchLifetime.isSessionCurrent(options.viewOwner)) return;
    loredeckWorkbenchSaveState = {
        packId: String(options.packId || loredeckWorkbenchPackId || '').trim(),
        status,
        message: String(message || '').trim(),
        updatedAt: Date.now(),
    };
    if (options.render === false) {
        refreshLoredeckWorkbenchSaveChip();
        return;
    }
    renderLoredeckWorkbench();
}

function refreshLoredeckWorkbenchSaveChip() {
    const pack = loredeckWorkbenchPack;
    const chip = document.querySelector(`#${LOREDECK_WORKBENCH_ID} [data-loredeck-workbench-save-chip="true"]`);
    if (!chip || !pack?.packId) return;
    chip.textContent = getLoredeckWorkbenchSaveStateLabel(pack);
    addTooltip(chip, getLoredeckWorkbenchSaveTooltip(pack));
}

function createLoredeckWorkbenchReadonlyField(labelText, value, tip = '') {
    const label = document.createElement('label');
    label.className = 'saga-loredeck-workbench-editor-field';
    const span = document.createElement('span');
    span.textContent = labelText;
    label.appendChild(span);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = String(value || '');
    input.readOnly = true;
    input.className = 'saga-loredeck-workbench-editor-input';
    label.appendChild(input);
    if (tip) addTooltip(input, tip);
    return label;
}

function createLoredeckWorkbenchInputField(labelText, name, value, tip = '', options = {}) {
    const label = document.createElement('label');
    label.className = `saga-loredeck-workbench-editor-field${options.full ? ' saga-loredeck-workbench-editor-field-full' : ''}`;
    const span = document.createElement('span');
    span.textContent = labelText;
    label.appendChild(span);
    const input = document.createElement('input');
    input.type = 'text';
    input.name = name;
    input.value = String(value || '');
    input.required = options.required === true;
    input.className = 'saga-loredeck-workbench-editor-input';
    label.appendChild(input);
    if (tip) addTooltip(input, tip);
    return label;
}

function createLoredeckWorkbenchTextareaField(labelText, name, value, tip = '', options = {}) {
    const label = document.createElement('label');
    label.className = 'saga-loredeck-workbench-editor-field saga-loredeck-workbench-editor-field-full';
    const span = document.createElement('span');
    span.textContent = labelText;
    label.appendChild(span);
    const textarea = document.createElement('textarea');
    textarea.name = name;
    textarea.rows = Math.max(2, Number(options.rows) || 4);
    textarea.value = String(value || '');
    textarea.className = 'saga-loredeck-workbench-editor-textarea';
    label.appendChild(textarea);
    if (tip) addTooltip(textarea, tip);
    return label;
}

function createLoredeckWorkbenchSelectField(labelText, name, value, options, tip = '') {
    const label = document.createElement('label');
    label.className = 'saga-loredeck-workbench-editor-field';
    const span = document.createElement('span');
    span.textContent = labelText;
    label.appendChild(span);
    const select = document.createElement('select');
    select.name = name;
    select.className = 'saga-loredeck-workbench-editor-input';
    const normalized = String(value || '').trim().toLowerCase();
    for (const [optionValue, optionLabel] of options) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionLabel;
        select.appendChild(option);
    }
    select.value = [...select.options].some(option => option.value === normalized) ? normalized : (options[0]?.[0] || '');
    label.appendChild(select);
    if (tip) addTooltip(select, tip);
    return label;
}

function createWorkbenchFormListeners(form) {
    const removers = [];
    let active = true;
    const inputs = [...form.querySelectorAll('[name]')];
    const buffer = {
        baseline: new Map(inputs.map(input => [input.name, input.value])),
        revisions: new Map(inputs.map(input => [input.name, 0])),
        composing: new Set(),
        acknowledged: null,
        persistedFields: null,
    };
    workbenchFormBuffers.set(form, buffer);
    const listeners = {
        get active() { return active; },
        listen(node, type, callback) {
            node.addEventListener(type, callback);
            removers.push(() => node.removeEventListener(type, callback));
        },
        dispose() {
            if (!active) return;
            active = false;
            for (const remove of removers) remove();
            workbenchFormDisposers.delete(form);
            workbenchFormBuffers.delete(form);
        },
    };
    for (const input of inputs) {
        const revise = () => buffer.revisions.set(input.name, (buffer.revisions.get(input.name) || 0) + 1);
        listeners.listen(input, 'input', revise);
        listeners.listen(input, 'change', revise);
        listeners.listen(input, 'compositionstart', () => { revise(); buffer.composing.add(input.name); });
        listeners.listen(input, 'compositionend', () => { buffer.composing.delete(input.name); });
    }
    return listeners;
}

function captureWorkbenchEditorSubmission(form) {
    const buffer = workbenchFormBuffers.get(form);
    if (!buffer) return null;
    return new Map([...form.querySelectorAll('[name]')].map(input => [input.name, {
        value: input.value, revision: buffer.revisions.get(input.name) || 0,
    }]));
}

function reconcileWorkbenchEditorBuffer(form, selected) {
    const buffer = workbenchFormBuffers.get(form);
    if (!buffer) return;
    const fields = getLoredeckWorkbenchEntryFields(selected.entry);
    const authoritative = { ...fields, tags: fields.tags.join(', ') };
    for (const input of form.querySelectorAll('[name]')) {
        const name = input.name;
        const value = String(authoritative[name] ?? '');
        const acknowledged = buffer.acknowledged?.get(name);
        const newerThanSubmission = acknowledged && (buffer.revisions.get(name) || 0) > acknowledged.revision;
        const pristine = input.value === buffer.baseline.get(name) && !newerThanSubmission;
        const submitted = acknowledged && input.value === acknowledged.value && (buffer.revisions.get(name) || 0) === acknowledged.revision;
        if (!buffer.composing.has(name) && (pristine || submitted) && input.value !== value) {
            const { selectionStart, selectionEnd, selectionDirection, scrollTop } = input;
            if (input.tagName === 'SELECT' && ![...input.options].some(option => option.value === value)) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = humanizeScopeKey(value);
                input.appendChild(option);
            }
            input.value = value;
            if (typeof selectionStart === 'number' && typeof input.setSelectionRange === 'function') {
                try { input.setSelectionRange(Math.min(selectionStart, value.length), Math.min(selectionEnd, value.length), selectionDirection || 'none'); } catch { /* Non-text input. */ }
            }
            input.scrollTop = scrollTop;
        }
        buffer.baseline.set(name, value);
    }
    buffer.acknowledged = null;
    buffer.persistedFields = fields;
}

function wireLoredeckWorkbenchAutosave(form, pack, selected) {
    const owner = workbenchLifetime.captureSession();
    const listeners = createWorkbenchFormListeners(form);
    const save = () => {
        if (!listeners.active || !workbenchLifetime.isSessionCurrent(owner)) return;
        void saveLoredeckWorkbenchEntryFields(pack, selected, form).catch(error => {
            if (workbenchLifetime.isSessionCurrent(owner)) reportWorkbenchViewError(error);
        });
    };
    form.querySelectorAll('input[name], textarea[name]').forEach(input => {
        listeners.listen(input, 'input', () => {
            const current = collectLoredeckWorkbenchEntryFields(form);
            if (!areLoredeckWorkbenchEntryFieldsEqual(current, getLoredeckWorkbenchEntryFields(selected.entry))) {
                setLoredeckWorkbenchSaveState('dirty', 'This Lorecard has unsaved field changes.', { render: false, packId: pack.packId, viewOwner: owner });
            }
        });
        listeners.listen(input, 'blur', save);
        listeners.listen(input, 'keydown', event => {
            if (event.key === 'Enter' && input.tagName !== 'TEXTAREA') {
                event.preventDefault();
                input.blur();
            }
            if (event.key === 'Enter' && event.ctrlKey && input.tagName === 'TEXTAREA') {
                event.preventDefault();
                save();
            }
        });
    });
    form.querySelectorAll('select[name]').forEach(select => listeners.listen(select, 'change', save));
    return () => listeners.dispose();
}

function wireLoredeckWorkbenchDraftCreate(form, pack, selected) {
    const owner = workbenchLifetime.captureSession();
    const draft = loredeckWorkbenchDraftEntry;
    const listeners = createWorkbenchFormListeners(form);
    let saving = false;
    const rememberBuffer = () => {
        if (draft) draft.buffer = Object.fromEntries([...form.querySelectorAll('[name]')].map(input => [input.name, input.value]));
    };
    const save = async () => {
        if (saving || !listeners.active || !workbenchLifetime.isSessionCurrent(owner)) return;
        saving = true;
        try { await saveLoredeckWorkbenchEntryFields(pack, selected, form, { create: true }); }
        finally { saving = false; }
    };
    const actions = createLoredeckActionRow({ className: 'saga-primary-actions saga-loredeck-workbench-editor-actions' });
    actions.appendChild(createButton('Create Lorecard', 'Create this Lorecard directly in the editable Loredeck.', async btn => {
        const restoreBusy = setLoredeckActionButtonBusy(btn, 'Creating...', { fallbackLabel: 'Create Lorecard' });
        try { await save(); } finally { restoreBusy(); }
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Cancel', 'Discard this unsaved Lorecard draft.', () => {
        if (listeners.active && workbenchLifetime.isSessionCurrent(owner)) cancelLoredeckWorkbenchNewEntry();
    }));
    form.appendChild(actions);
    form.querySelectorAll('input[name], textarea[name], select[name]').forEach(input => {
        listeners.listen(input, input.tagName === 'SELECT' ? 'change' : 'input', () => {
            rememberBuffer();
            setLoredeckWorkbenchSaveState('dirty', 'New Lorecard draft is not created yet.', { render: false, packId: pack.packId, viewOwner: owner });
        });
        listeners.listen(input, 'keydown', event => {
            if (event.key === 'Enter' && event.ctrlKey) {
                event.preventDefault();
                void save().catch(error => {
                    if (workbenchLifetime.isSessionCurrent(owner)) reportWorkbenchViewError(error);
                });
            }
        });
    });
    return () => { rememberBuffer(); listeners.dispose(); };
}

function beginLoredeckWorkbenchNewEntry(pack = {}) {
    const freshPack = getWorkbenchPack(pack.packId) || pack;
    if (!isLoredeckWorkbenchEditablePack(freshPack)) {
        toast('Bundled Loredecks are read-only. Duplicate as Custom first.', 'warning');
        return false;
    }
    const id = suggestLoredeckWorkbenchEntryId(freshPack);
    loredeckWorkbenchDraftEntry = {
        packId: freshPack.packId,
        id,
        createdAt: Date.now(),
    };
    loredeckWorkbenchSelectedEntryId = id;
    setLoredeckWorkbenchSaveState('dirty', 'New Lorecard draft is not created yet.', { render: false, packId: freshPack.packId });
    renderLoredeckWorkbench();
    scheduleWorkbenchFrame(() => {
        const titleInput = document.querySelector(`#${LOREDECK_WORKBENCH_ID} [name="title"]`);
        titleInput?.focus?.();
    });
    return true;
}

function cancelLoredeckWorkbenchNewEntry() {
    const packId = loredeckWorkbenchDraftEntry?.packId || loredeckWorkbenchPackId;
    loredeckWorkbenchDraftEntry = null;
    loredeckWorkbenchSelectedEntryId = '';
    resetLoredeckWorkbenchSaveState(packId);
    renderLoredeckWorkbench();
}

function getEntryRelevanceOptions() {
    return [
        ['high', 'High'],
        ['normal', 'Normal'],
        ['low', 'Low'],
    ];
}

function getEntryCanonStatusOptions(current = '') {
    const options = [
        ['unset', 'Unset'],
        ['canon', 'Canon'],
        ['au', 'AU'],
        ['custom', 'Custom'],
        ['generated', 'Generated'],
        ['unknown', 'Unknown'],
    ];
    const normalized = String(current || '').trim().toLowerCase();
    if (normalized && !options.some(([value]) => value === normalized)) {
        options.push([normalized, humanizeScopeKey(normalized)]);
    }
    return options;
}

function getLoredeckWorkbenchEntryFields(entry = {}) {
    return {
        title: String(entry.title || '').trim(),
        category: getEntryCategory(entry),
        relevance: getEntryRelevance(entry),
        canonStatus: normalizeWorkbenchCanonField(getEntryCanonStatus(entry)),
        tags: getEntryTags(entry),
        context: cloneLoredeckWorkbenchContextGate(entry.context),
        fact: getEntryFactText(entry),
        injection: getEntryInjectionText(entry),
        notes: getEntryNotesText(entry),
    };
}

function collectLoredeckWorkbenchEntryFields(form) {
    const get = name => String(form.querySelector(`[name="${name}"]`)?.value || '').trim();
    const fields = {
        title: get('title'),
        category: get('category') || 'other',
        relevance: ['high', 'normal', 'low'].includes(get('relevance')) ? get('relevance') : 'normal',
        canonStatus: normalizeWorkbenchCanonField(get('canonStatus')),
        tags: parseLoredeckWorkbenchTags(get('tags')),
        fact: get('fact'),
        injection: get('injection'),
        notes: get('notes'),
    };
    if (form.querySelector('[name="machineId"]')) fields.machineId = normalizeLoredeckWorkbenchEntryId(get('machineId'));
    return fields;
}

function normalizeWorkbenchCanonField(value = '') {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized && normalized !== 'unset' ? normalized : 'unset';
}

function cloneLoredeckWorkbenchContextGate(value = {}) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? { ...value }
        : {};
}

function parseLoredeckWorkbenchTags(value = '') {
    const raw = Array.isArray(value) ? value : String(value || '').split(',');
    const seen = new Set();
    const tags = [];
    for (const item of raw) {
        const tag = String(item || '').trim();
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        tags.push(tag);
    }
    return tags;
}

function normalizeLoredeckWorkbenchEntryId(value = '') {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/['"`]/g, '')
        .replace(/[^a-z0-9._:-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[._:-]+|[._:-]+$/g, '');
}

function getLoredeckWorkbenchExistingEntryIds(pack = getWorkbenchPack(), rows = loredeckWorkbenchCache.packId === pack?.packId ? loredeckWorkbenchCache.rows : []) {
    const ids = new Set();
    for (const row of rows || []) {
        const id = normalizeLoredeckWorkbenchEntryId(row?.id || row?.entry?.id || '');
        if (id) ids.add(id);
    }
    const overrides = pack?.entryOverrides && typeof pack.entryOverrides === 'object' && !Array.isArray(pack.entryOverrides)
        ? pack.entryOverrides
        : {};
    for (const id of Object.keys(overrides)) {
        const normalized = normalizeLoredeckWorkbenchEntryId(id);
        if (normalized) ids.add(normalized);
    }
    return ids;
}

function suggestLoredeckWorkbenchEntryId(pack = getWorkbenchPack()) {
    const packSegment = normalizeLoredeckWorkbenchEntryId(pack?.packId || pack?.title || 'custom-loredeck') || 'custom-loredeck';
    const base = `${packSegment}.new-lorecard`;
    const existing = getLoredeckWorkbenchExistingEntryIds(pack);
    for (let index = 1; index <= 9999; index += 1) {
        const id = `${base}-${index}`;
        if (!existing.has(id)) return id;
    }
    return `${base}-${Date.now()}`;
}

function suggestLoredeckWorkbenchDuplicateEntryId(sourceId = '', existing = getLoredeckWorkbenchExistingEntryIds()) {
    const base = `${normalizeLoredeckWorkbenchEntryId(sourceId) || 'lorecard'}.copy`;
    for (let index = 1; index <= 9999; index += 1) {
        const id = `${base}-${index}`;
        if (!existing.has(id)) return id;
    }
    return `${base}-${Date.now()}`;
}

function areLoredeckWorkbenchEntryFieldsEqual(a = {}, b = {}) {
    return JSON.stringify({
        ...a,
        tags: [...(a.tags || [])].sort(),
    }) === JSON.stringify({
        ...b,
        tags: [...(b.tags || [])].sort(),
    });
}

function getEntryFactText(entry = {}) {
    return String(
        entry.content?.fact
        ?? entry.fact
        ?? entry.summary
        ?? entry.description
        ?? ''
    ).trim();
}

function getEntryInjectionText(entry = {}) {
    return String(
        entry.content?.injection
        ?? entry.injection
        ?? ''
    ).trim();
}

function getEntryNotesText(entry = {}) {
    return String(
        entry.content?.notes
        ?? entry.notes
        ?? ''
    ).trim();
}

async function saveLoredeckWorkbenchEntryFields(pack = {}, selected = {}, form = null, options = {}) {
    const owner = workbenchLifetime.captureSession();
    pack = { ...pack };
    const setSaveState = (status, message, options = {}) => setLoredeckWorkbenchSaveState(status, message, { ...options, packId: pack.packId, viewOwner: owner });
    if (!form || !isLoredeckWorkbenchEditablePack(pack)) return false;
    const fields = collectLoredeckWorkbenchEntryFields(form);
    const submission = captureWorkbenchEditorSubmission(form);
    const buffer = workbenchFormBuffers.get(form);
    const previous = { ...(buffer?.persistedFields || getLoredeckWorkbenchEntryFields(selected.entry)) };
    // Context belongs to the source entry, not this editable form's payload.
    delete previous.context;
    const creating = options.create === true || selected.draft === true;
    if (!creating && areLoredeckWorkbenchEntryFieldsEqual(fields, previous)) {
        if (workbenchLifetime.isSessionCurrent(owner) && loredeckWorkbenchSaveState.status === 'dirty') {
            resetLoredeckWorkbenchSaveState(pack.packId);
            refreshLoredeckWorkbenchSaveChip();
        }
        return false;
    }
    const id = creating
        ? normalizeLoredeckWorkbenchEntryId(fields.machineId || selected.id || selected.entry?.id || '')
        : String(selected.id || selected.entry?.id || '').trim();
    if (!id) {
        setSaveState('failed', 'Lorecard save failed because the selected entry has no machine ID.');
        toast('Lorecard save failed: missing machine ID.', 'error');
        return false;
    }
    if (creating && getLoredeckWorkbenchExistingEntryIds(pack).has(id)) {
        setSaveState('failed', `Lorecard ID already exists: ${id}`);
        toast(`Lorecard ID already exists: ${id}`, 'warning');
        return false;
    }
    if (!fields.title) {
        setSaveState('failed', 'Lorecard title is required.');
        toast('Lorecard title is required.', 'warning');
        return false;
    }
    if (creating && !fields.fact) {
        setSaveState('failed', 'New Lorecards need Lore Text before they can be created.');
        toast('New Lorecards need Lore Text before they can be created.', 'warning');
        return false;
    }

    const freshPack = getWorkbenchPack(pack.packId) || pack;
    const entry = buildLoredeckWorkbenchEntryOverride(freshPack, { ...selected, id }, fields);
    setSaveState('saving', `${creating ? 'Creating' : 'Saving'} ${fields.title || id}...`);
    const saved = persistLoredeckLibraryRecordMutation(freshPack, next => {
        next.entryOverrides = {
            ...(next.entryOverrides || {}),
            [id]: entry,
        };
        const disabled = new Set(Array.isArray(next.disabledEntryIds) ? next.disabledEntryIds : []);
        disabled.delete(id);
        next.disabledEntryIds = [...disabled];
        next.healthStatus = 'stale';
    }, '', {
        errorMessage: 'Loredeck Lorecard save failed.',
    });
    if (!saved) {
        setSaveState('failed', `Could not save ${fields.title || id}.`);
        return false;
    }
    refreshWorkbenchPackAfterMutation(owner, pack.packId);
    if (buffer && workbenchLifetime.isSessionCurrent(owner)) {
        // Persistence is synchronous; source reloads can overlap or be superseded.
        // Deduplicate the committed values, never block a distinct new submission
        // on an older reload's completion.
        buffer.persistedFields = fields;
        buffer.acknowledged = submission;
    }
    if (creating && workbenchLifetime.isSessionCurrent(owner)) {
        loredeckWorkbenchDraftEntry = null;
        loredeckWorkbenchSelectedEntryId = id;
    }
    setSaveState('saved', `${creating ? 'Created' : 'Saved'} ${fields.title || id}.`, { render: false, packId: freshPack.packId });
    await loadLoredeckWorkbenchRows(freshPack.packId, { force: true, viewOwner: owner });
    return true;
}

function buildLoredeckWorkbenchEntryOverride(pack = {}, selected = {}, fields = {}) {
    const baseEntry = selected.entry || {};
    const id = normalizeLoredeckWorkbenchEntryId(fields.machineId || selected.id || baseEntry.id || '');
    const schemaVersion = Math.max(3, Number(baseEntry.schemaVersion || selected.schemaVersion || pack.entrySchemaVersion || pack.manifestData?.entrySchemaVersion) || 3);
    const overrideMeta = baseEntry.extensions?.sagaLoredeckOverride && typeof baseEntry.extensions.sagaLoredeckOverride === 'object'
        ? baseEntry.extensions.sagaLoredeckOverride
        : {};
    const sourceFile = String(selected.sourceFile || '').trim();
    const virtualSource = ['__saga_entry_overrides__', '__saga_embedded_entries__', '__saga_generated_entries__'].includes(sourceFile);
    const kind = selected.draft ? 'addition' : (String(overrideMeta.kind || '').trim() || (virtualSource ? 'addition' : 'override'));
    const canonStatus = normalizeWorkbenchCanonField(fields.canonStatus);
    const entry = {
        ...baseEntry,
        id,
        schemaVersion,
        title: fields.title || id,
        category: fields.category || getEntryCategory(baseEntry),
        relevance: fields.relevance || getEntryRelevance(baseEntry),
        ...(canonStatus !== 'unset' ? { canonStatus } : {}),
        tags: fields.tags || [],
        context: cloneLoredeckWorkbenchContextGate(fields.context || baseEntry.context),
        content: {
            ...(baseEntry.content || {}),
            fact: fields.fact || '',
            injection: fields.injection || fields.fact || '',
            notes: fields.notes || '',
        },
        retrieval: {
            ...(baseEntry.retrieval || {}),
            relevance: fields.relevance || getEntryRelevance(baseEntry),
        },
        userEditable: true,
        userEdited: true,
        extensions: {
            ...(baseEntry.extensions || {}),
            sagaLoredeckOverride: {
                ...overrideMeta,
                kind,
                packId: pack.packId,
                sourceEntryId: selected.draft ? '' : (overrideMeta.sourceEntryId || (kind === 'override' ? id : '')),
                updatedAt: Date.now(),
                source: 'loredeck_workbench',
            },
        },
    };
    if (canonStatus === 'unset') delete entry.canonStatus;
    const normalized = normalizeLoredeckEntryForSchemaV3(entry);
    normalized.tags = fields.tags || [];
    normalized.category = fields.category || getEntryCategory(baseEntry);
    normalized.relevance = fields.relevance || getEntryRelevance(baseEntry);
    if (canonStatus !== 'unset') normalized.canonStatus = canonStatus;
    return normalized;
}

async function loadLoredeckWorkbenchRows(packId = loredeckWorkbenchPackId, options = {}) {
    const id = String(packId || '').trim();
    if (!id) return [];
    if (!options.force && loredeckWorkbenchCache.packId === id && loredeckWorkbenchCache.status === 'loaded' && loredeckWorkbenchCache.rows.length) return loredeckWorkbenchCache.rows;
    const token = workbenchLifetime.beginSource(id, options.viewOwner);
    const button = options.button || null;
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Loading...', { fallbackLabel: 'Reload Lorecards' });
    if (workbenchLifetime.isSourceCurrent(token)) {
        hideFloatingTooltip();
        const previous = loredeckWorkbenchCache.packId === id ? loredeckWorkbenchCache : null;
        loredeckWorkbenchCache = { packId: id, status: 'loading', error: '', loadedAt: 0, rows: previous?.rows || [], source: previous?.source || null };
        renderLoredeckWorkbench();
    }
    try {
        const pack = getWorkbenchPack(id);
        const registry = getLoredeckLibraryRegistry(getState());
        const sourcePack = pack && pack.type !== 'bundled' ? { ...pack, disabledEntryIds: [] } : pack;
        const source = await loadLoredeckSourceById(id, { registry, registryRecord: sourcePack });
        const rows = buildLoredeckWorkbenchRows(source, pack);
        if (workbenchLifetime.isSourceCurrent(token)) {
            loredeckWorkbenchPack = getWorkbenchPack(id) || pack;
            loredeckWorkbenchCache = { packId: id, status: 'loaded', error: '', loadedAt: Date.now(), rows, source };
            renderLoredeckWorkbench();
            if (!rows.length) toast(`${pack?.title || id} has no loadable Lorecards.`, 'warning');
        }
        return rows;
    } catch (error) {
        if (workbenchLifetime.isSourceCurrent(token)) {
            loredeckWorkbenchCache = { ...loredeckWorkbenchCache, status: 'error', error: error?.message || 'Loredeck failed to load.', loadedAt: Date.now() };
            renderLoredeckWorkbench();
            toast(loredeckWorkbenchCache.error, 'error');
        }
        return [];
    } finally {
        restoreBusy();
    }
}

function buildLoredeckWorkbenchRows(source = {}, pack = getWorkbenchPack()) {
    const rows = [];
    const seen = new Set();
    const disabled = new Set(Array.isArray(pack?.disabledEntryIds) ? pack.disabledEntryIds.map(id => String(id || '').trim()).filter(Boolean) : []);
    for (const fileRecord of source.entryFiles || []) {
        const sourceFile = String(fileRecord?.file || '').trim() || 'embedded';
        const entries = getEntriesFromLoredeckFileRecord(fileRecord);
        for (const raw of entries) {
            const entry = normalizeLoredeckEntryForSchemaV3(raw);
            const id = String(entry?.id || '').trim();
            if (!id || seen.has(id)) continue;
            seen.add(id);
            rows.push({
                id,
                entry,
                disabled: disabled.has(id),
                sourceFile,
                schemaVersion: fileRecord?.schemaVersion || source.manifest?.entrySchemaVersion || entry.schemaVersion || 3,
            });
        }
    }
    return rows.sort((a, b) => String(a.entry.title || a.id).localeCompare(String(b.entry.title || b.id)));
}

function getLoredeckWorkbenchDraftRow() {
    if (!loredeckWorkbenchDraftEntry || loredeckWorkbenchDraftEntry.packId !== loredeckWorkbenchPackId) return null;
    const id = normalizeLoredeckWorkbenchEntryId(loredeckWorkbenchDraftEntry.id || suggestLoredeckWorkbenchEntryId(loredeckWorkbenchPack));
    if (loredeckWorkbenchDraftEntry.row) return loredeckWorkbenchDraftEntry.row;
    return loredeckWorkbenchDraftEntry.row = {
        id,
        draft: true,
        sourceFile: 'new',
        schemaVersion: 3,
        entry: normalizeLoredeckEntryForSchemaV3({
            id,
            schemaVersion: 3,
            title: 'Untitled Lorecard',
            category: 'other',
            relevance: 'normal',
            tags: [],
            content: {
                fact: '',
                injection: '',
                notes: '',
            },
            retrieval: {
                relevance: 'normal',
            },
        }),
    };
}

function getEntriesFromLoredeckFileRecord(fileRecord = {}) {
    if (Array.isArray(fileRecord.entries)) return fileRecord.entries;
    const json = fileRecord.json;
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.entries)) return json.entries;
    if (Array.isArray(json?.lorecards)) return json.lorecards;
    if (Array.isArray(json?.loreEntries)) return json.loreEntries;
    if (json && typeof json === 'object' && !Array.isArray(json) && (json.id || json.title || json.content || json.fact)) return [json];
    return [];
}

function ensureLoredeckWorkbenchSelection(rows = getFilteredLoredeckWorkbenchRows()) {
    if (!rows.length) {
        loredeckWorkbenchSelectedEntryId = '';
        return;
    }
    if (!rows.some(row => row.id === loredeckWorkbenchSelectedEntryId)) {
        loredeckWorkbenchSelectedEntryId = rows[0].id;
    }
}

function getFilteredLoredeckWorkbenchRows() {
    const query = String(loredeckWorkbenchQuery || '').trim().toLowerCase();
    const filtered = (loredeckWorkbenchCache.rows || []).filter(row => {
        const entry = row.entry || {};
        if (loredeckWorkbenchStatusFilter === 'active' && row.disabled) return false;
        if (loredeckWorkbenchStatusFilter === 'disabled' && !row.disabled) return false;
        if (loredeckWorkbenchRelevanceFilter !== 'all' && getEntryRelevance(entry).toLowerCase() !== loredeckWorkbenchRelevanceFilter) return false;
        if (loredeckWorkbenchCategoryFilter !== 'all' && getEntryCategory(entry).toLowerCase() !== loredeckWorkbenchCategoryFilter) return false;
        if (!query) return true;
        return getLoredeckWorkbenchSearchText(row).includes(query);
    });
    const draft = getLoredeckWorkbenchDraftRow();
    if (draft) filtered.unshift(draft);
    return filtered;
}

function getLoredeckWorkbenchSearchText(row = {}) {
    const entry = row.entry || {};
    return [
        row.id,
        row.sourceFile,
        entry.title,
        getEntryMainText(entry),
        getEntryCategory(entry),
        getEntryRelevance(entry),
        getEntryCanonStatus(entry),
        getEntryContextSummary(entry),
        ...getEntryTags(entry),
    ].filter(Boolean).join(' ').toLowerCase();
}

function getRelevanceFilterOptions() {
    return [
        ['all', 'All Relevance'],
        ['high', 'High'],
        ['normal', 'Normal'],
        ['low', 'Low'],
    ];
}

function getCategoryFilterOptions(rows = getWorkbenchPresentationRows()) {
    const categories = new Set();
    for (const row of rows || []) {
        const category = getEntryCategory(row.entry).toLowerCase();
        if (category) categories.add(category);
    }
    return [
        ['all', 'All Types'],
        ...[...categories].sort().map(category => [category, humanizeScopeKey(category)]),
    ];
}

function getStatusFilterOptions() {
    return [
        ['active', 'Active'],
        ['disabled', 'Disabled'],
        ['all', 'All States'],
    ];
}

function normalizeWorkbenchTagId(value = '') {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/['"`]/g, '')
        .replace(/[^a-z0-9._:-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[._:-]+|[._:-]+$/g, '')
        .slice(0, 180);
}

function parseWorkbenchTextList(value = '', limit = 64) {
    const rawItems = Array.isArray(value) ? value : String(value || '').split(/[,;\n\r]+/);
    const output = [];
    const seen = new Set();
    for (const raw of rawItems) {
        const text = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 160);
        const key = text.toLowerCase();
        if (!text || seen.has(key)) continue;
        seen.add(key);
        output.push(text);
        if (output.length >= limit) break;
    }
    return output;
}

function normalizeWorkbenchTagDefinition(raw = {}, id = '') {
    const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    return {
        label: String(input.label || input.name || id).trim().slice(0, 160),
        description: String(input.description || '').trim().slice(0, 1000),
        aliases: parseWorkbenchTextList(input.aliases || [], 64),
        parents: parseWorkbenchTextList(input.parents || [], 64).map(normalizeWorkbenchTagId).filter(Boolean),
        sensitive: input.sensitive === true,
        deprecated: input.deprecated === true,
        replacement: normalizeWorkbenchTagId(input.replacement || ''),
    };
}

function normalizeWorkbenchTagRegistry(value = null) {
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const source = input.tags && typeof input.tags === 'object' && !Array.isArray(input.tags) ? input.tags : input;
    const tags = {};
    for (const [rawId, rawDef] of Object.entries(source || {})) {
        if (!rawDef || typeof rawDef !== 'object' || Array.isArray(rawDef)) continue;
        const id = normalizeWorkbenchTagId(rawDef.id || rawId);
        if (!id) continue;
        tags[id] = normalizeWorkbenchTagDefinition(rawDef, id);
    }
    return { schemaVersion: 1, tags };
}

function getFilteredWorkbenchTagRegistryEntries(tagRegistry = normalizeWorkbenchTagRegistry()) {
    const query = String(loredeckWorkbenchRegistryQuery || '').trim().toLowerCase();
    return Object.entries(tagRegistry.tags || {})
        .filter(([id, def]) => {
            if (!query) return true;
            return [
                id,
                def.label,
                def.description,
                def.replacement,
                ...(def.aliases || []),
                ...(def.parents || []),
            ].filter(Boolean).join(' ').toLowerCase().includes(query);
        })
        .sort(([aId, a], [bId, b]) => String(a.label || aId).localeCompare(String(b.label || bId)));
}

function normalizeWorkbenchTimelineId(value = '') {
    return String(value || '')
        .trim()
        .replace(/[\r\n]+/g, ' ')
        .replace(/[^\p{L}\p{N} _:\-./]+/gu, '')
        .replace(/\s+/g, '_')
        .slice(0, 180)
        .trim();
}

function normalizeWorkbenchTimelineNumber(value) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
}

function normalizeWorkbenchTimelineTextList(value = '', limit = 64) {
    return parseWorkbenchTextList(value, limit);
}

function normalizeWorkbenchTimelineAnchor(raw = {}, index = 0) {
    const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const id = normalizeWorkbenchTimelineId(input.id);
    if (!id) return null;
    return {
        id,
        label: String(input.label || input.title || id).trim().slice(0, 240),
        contextType: String(input.contextType || input.type || 'anchor').trim().slice(0, 80),
        sortKey: normalizeWorkbenchTimelineNumber(input.sortKey) ?? index + 1,
        aliases: normalizeWorkbenchTimelineTextList(input.aliases || input.triggers, 64),
        tags: normalizeWorkbenchTimelineTextList(input.tags, 64),
        notes: String(input.notes || input.description || '').trim().slice(0, 1000),
    };
}

function normalizeWorkbenchTimelineWindow(raw = {}, index = 0) {
    const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const id = normalizeWorkbenchTimelineId(input.id);
    if (!id) return null;
    return {
        id,
        label: String(input.label || input.title || id).trim().slice(0, 240),
        contextType: String(input.contextType || input.type || 'anchor_window').trim().slice(0, 80),
        anchorFrom: normalizeWorkbenchTimelineId(input.anchorFrom || input.from || input.validFromAnchor),
        anchorTo: normalizeWorkbenchTimelineId(input.anchorTo || input.to || input.validToAnchor),
        sortKeyFrom: normalizeWorkbenchTimelineNumber(input.sortKeyFrom),
        sortKeyTo: normalizeWorkbenchTimelineNumber(input.sortKeyTo),
        aliases: normalizeWorkbenchTimelineTextList(input.aliases || input.triggers, 64),
        tags: normalizeWorkbenchTimelineTextList(input.tags, 64),
        notes: String(input.notes || input.description || '').trim().slice(0, 1000),
    };
}

function normalizeWorkbenchTimelineDisabledIds(value = []) {
    const output = [];
    const seen = new Set();
    for (const raw of Array.isArray(value) ? value : []) {
        const id = normalizeWorkbenchTimelineId(raw);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        output.push(id);
    }
    return output;
}

function normalizeWorkbenchTimelineRegistry(value = null) {
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const anchors = [];
    for (const [index, raw] of (Array.isArray(input.anchors) ? input.anchors : []).entries()) {
        const anchor = normalizeWorkbenchTimelineAnchor(raw, index);
        if (anchor) anchors.push(anchor);
    }
    const windows = [];
    const rawWindows = [
        ...(Array.isArray(input.windows) ? input.windows : []),
        ...(Array.isArray(input.arcs) ? input.arcs : []),
        ...(Array.isArray(input.phases) ? input.phases : []),
    ];
    for (const [index, raw] of rawWindows.entries()) {
        const window = normalizeWorkbenchTimelineWindow(raw, index);
        if (window) windows.push(window);
    }
    return {
        schemaVersion: Number.isFinite(Number(input.schemaVersion)) ? Number(input.schemaVersion) : 1,
        timelineMode: String(input.timelineMode || 'hybrid').trim().slice(0, 80),
        defaultContextType: String(input.defaultContextType || '').trim().slice(0, 80),
        sortKeyScale: String(input.sortKeyScale || 'pack_local').trim().slice(0, 160),
        summary: String(input.summary || input.description || '').trim().slice(0, 1000),
        anchors,
        windows,
        disabledAnchorIds: normalizeWorkbenchTimelineDisabledIds(input.disabledAnchorIds || input.disabledAnchors || []),
        disabledWindowIds: normalizeWorkbenchTimelineDisabledIds(input.disabledWindowIds || input.disabledWindows || []),
    };
}

function getEntryRelevance(entry = {}) {
    const value = String(entry.relevance || entry.retrieval?.relevance || entry.priority || '').trim().toLowerCase();
    if (['high', 'normal', 'low'].includes(value)) return value;
    if (value === 'critical' || value === 'p1') return 'high';
    if (value === 'background' || value === 'p3') return 'low';
    return 'normal';
}

function getEntryCategory(entry = {}) {
    return String(entry.category || entry.type || entry.kind || entry.content?.category || 'other').trim() || 'other';
}

function getEntryCanonStatus(entry = {}) {
    return String(entry.canonStatus || entry.canon || entry.truthStatus || 'unset').trim() || 'unset';
}

function getEntryTags(entry = {}) {
    return Array.isArray(entry.tags) ? entry.tags.map(tag => String(tag || '').trim()).filter(Boolean) : [];
}

function getEntryMainText(entry = {}) {
    return String(
        entry.fact
        || entry.summary
        || entry.description
        || entry.content?.fact
        || entry.content?.injection
        || entry.content?.summary
        || entry.text
        || ''
    ).trim();
}

function getEntryContextSummary(entry = {}) {
    const context = entry.context && typeof entry.context === 'object' && !Array.isArray(entry.context) ? entry.context : {};
    const values = [
        context.label,
        context.scope,
        context.anchorId,
        context.validFromAnchor ? `from ${context.validFromAnchor}` : '',
        context.validToAnchor ? `to ${context.validToAnchor}` : '',
        Number.isFinite(Number(context.sortKeyFrom)) || Number.isFinite(Number(context.sortKeyTo))
            ? `${context.sortKeyFrom ?? '?'} -> ${context.sortKeyTo ?? '?'}`
            : '',
    ].map(value => String(value || '').trim()).filter(Boolean);
    return values.join(' | ');
}

function getSourceFileCount(source = {}) {
    return Array.isArray(source?.entryFiles) ? source.entryFiles.length : 0;
}
