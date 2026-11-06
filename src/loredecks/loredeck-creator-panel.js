import {
    addTooltip,
    createButton,
    createEmptyMessage,
    createKeyValue,
    createStatusPill,
    humanizeScopeKey,
    hideFloatingTooltip,
    isPlainObjectValue,
    setChipTone,
    toast,
    wireOverlayBackdropClose,
} from '../ui/runtime-ui-kit.js';
import {
    createLoredeckJobStatusRow,
    formatLoredeckJobMeta,
    formatLoredeckJobElapsed,
} from './loredeck-job-view.js';
import {
    getLoredeckCreatorEntryDraftBatchModels,
} from './loredeck-creator-entry-draft-pool.js';
import {
    getLoredeckCreatorResetAvailability,
} from './loredeck-creator-reset.js';

let creatorPanelDeps = {};
let loredeckCreatorWorkbenchRefreshQueued = false;
const loredeckCreatorDisclosureState = new Map();
let loredeckCreatorDisclosureStateVersion = 0;
const loredeckCreatorDisclosureChildren = new WeakMap();
const loredeckCreatorViewCallbacks = new Map();

function scheduleLoredeckCreatorViewCallback(callback) {
    const run = () => {
        loredeckCreatorViewCallbacks.delete(id);
        callback();
    };
    const frame = typeof requestAnimationFrame === 'function';
    const id = frame ? requestAnimationFrame(run) : setTimeout(run, 0);
    loredeckCreatorViewCallbacks.set(id, frame);
}

function cancelLoredeckCreatorViewCallbacks() {
    for (const [id, frame] of loredeckCreatorViewCallbacks) {
        if (frame) cancelAnimationFrame(id);
        else clearTimeout(id);
    }
    loredeckCreatorViewCallbacks.clear();
    loredeckCreatorWorkbenchRefreshQueued = false;
}

export function configureLoredeckCreatorPanel(deps = {}) {
    creatorPanelDeps = { ...creatorPanelDeps, ...(deps || {}) };
}

function dep(name, fallback = null) {
    const value = creatorPanelDeps?.[name];
    if (typeof value === 'function') return value;
    if (typeof fallback === 'function') return fallback;
    throw new Error(`Saga Deck Maker dependency is not configured: ${name}`);
}

function getState() { return dep('getState', () => ({}))(); }
function getLoredeckCreatorBriefCache() { return dep('getLoredeckCreatorBriefCache', () => ({}))(); }
function getLoredeckCreatorPipelineModel(cached) { return dep('getLoredeckCreatorPipelineModel', () => ({}))(cached); }
function createLoredeckCreatorCard(state, options) { return dep('createLoredeckCreatorCard', () => document.createDocumentFragment())(state, options); }
function recoverLoredeckCreatorCurrentActiveGenerationOnOpen(options) { return dep('recoverLoredeckCreatorCurrentActiveGenerationOnOpen', () => null)(options); }
function cancelLoredeckCreatorGeneration(generationId) { return dep('cancelLoredeckCreatorGeneration', () => false)(generationId); }
function getLoredeckCreatorDraftInputs() { return dep('getLoredeckCreatorDraftInputs', () => ({}))(); }
function formatLoredeckCreatorGranularity(value) { return dep('formatLoredeckCreatorGranularity', value => String(value || 'Focused'))(value); }
function createLoredeckCreatorCurrentTaskActions(cached, pipeline, context) { return dep('createLoredeckCreatorCurrentTaskActions', () => document.createDocumentFragment())(cached, pipeline, context); }
function getLoredeckCreatorLatestRecoverableUnit(cached) { return dep('getLoredeckCreatorLatestRecoverableUnit', () => null)(cached); }
function formatLoredeckCreatorRecoveryStageLabel(unit) { return dep('formatLoredeckCreatorRecoveryStageLabel', () => 'Deck Maker generation unit')(unit); }
function formatRelativeHealthTime(value) { return dep('formatRelativeHealthTime', value => value ? new Date(value).toLocaleString() : '-')(value); }
function createLoredeckCreatorBriefRevisionForm(brief, cached) { return dep('createLoredeckCreatorBriefRevisionForm', () => document.createDocumentFragment())(brief, cached); }
function createLoredeckCreatorOutlineActionForm(brief, cached, outline) { return dep('createLoredeckCreatorOutlineActionForm', () => document.createDocumentFragment())(brief, cached, outline); }
function getLoredeckCreatorSelectedTitleIds(cached) { return dep('getLoredeckCreatorSelectedTitleIds', () => new Set())(cached); }
function getLoredeckCreatorApprovedTitleIds(cached) { return dep('getLoredeckCreatorApprovedTitleIds', () => new Set())(cached); }
function getLoredeckCreatorGenerationSettings(cached) { return dep('getLoredeckCreatorGenerationSettings', () => ({}))(cached); }
function lockLoredeckCreatorGenerationButton(button, cached, label) { return dep('applyLoredeckCreatorGenerationButtonLock', button => button)(button, cached, label); }
function handleLoredeckCreatorTitleDraft(options, button) { return dep('handleLoredeckCreatorTitleDraft', async () => null)(options, button); }
function handleLoredeckCreatorRemainingTitleBatches(button) { return dep('handleLoredeckCreatorRemainingTitleBatches', async () => null)(button); }
function approveLoredeckCreatorTitleSelection(selectedIds) { return dep('approveLoredeckCreatorTitleSelection', () => false)(selectedIds); }
function unapproveLoredeckCreatorTitleSelection(selectedIds) { return dep('unapproveLoredeckCreatorTitleSelection', () => false)(selectedIds); }
function dropLoredeckCreatorTitleSelection(selectedIds) { return dep('dropLoredeckCreatorTitleSelection', () => false)(selectedIds); }
function setLoredeckCreatorTitleSelectionBulk(mode, options) { return dep('setLoredeckCreatorTitleSelectionBulk', () => false)(mode, options); }
function setLoredeckCreatorTitleSelection(titleId, selected, options) { return dep('setLoredeckCreatorTitleSelection', () => false)(titleId, selected, options); }
function getLoredeckCreatorSelectedTitleDrafts(cached) { return dep('getLoredeckCreatorSelectedTitleDrafts', () => [])(cached); }
function getLoredeckCreatorTitleRevisionInstruction() { return dep('getLoredeckCreatorTitleRevisionInstruction', () => '')(); }
function setLoredeckCreatorTitleRevisionInstruction(value) { return dep('setLoredeckCreatorTitleRevisionInstruction', value => value)(value); }
function appendLoredeckPendingQualityPills(meta, change) { return dep('appendLoredeckPendingQualityPills', () => null)(meta, change); }
function createLoredeckPendingQualityList(change) { return dep('createLoredeckPendingQualityList', () => null)(change); }
function openLoredeckCreatorTitleJsonEditor(draft) { return dep('openLoredeckCreatorTitleJsonEditor', () => null)(draft); }
function acknowledgeLoredeckCreatorCoverageForFinalize() { return dep('acknowledgeLoredeckCreatorCoverageForFinalize', async () => false)(); }
function handleLoredeckCreatorResetToStep(stepId) { return dep('handleLoredeckCreatorResetToStep', async () => false)(stepId); }
function getLoredeckCreatorPlanningBatchRows(cached) { return dep('getLoredeckCreatorPlanningBatchRows', () => [])(cached); }
function getLoredeckCreatorPlanningQueuedBatchIds(cached) { return dep('getLoredeckCreatorPlanningQueuedBatchIds', () => new Set())(cached); }
function getLoredeckCreatorPlanningPendingBatchIds(pack) { return dep('getLoredeckCreatorPlanningPendingBatchIds', () => new Set())(pack); }
function getLoredeckCreatorNextPlanningBatch(cached) { return dep('getLoredeckCreatorNextPlanningBatch', () => null)(cached); }
function countLoredeckCreatorPlanningPendingChanges(pack) { return dep('countLoredeckCreatorPlanningPendingChanges', () => 0)(pack); }
function getLoredeckDefinition(packId) { return dep('getLoredeckDefinition', () => null)(packId); }
function handleLoredeckCreatorPlanningDraft(options, button) { return dep('handleLoredeckCreatorPlanningDraft', async () => null)(options, button); }
function getLoredeckStack(state) { return dep('getLoredeckStack', () => [])(state); }
function addLoredeckToStack(packId) { return dep('addLoredeckToStack', () => false)(packId); }
function getLoredeckCreatorAcceptedPlanningStatus(pack) { return dep('getLoredeckCreatorAcceptedPlanningStatus', () => ({ anchorCount: 0, windowCount: 0, tagCount: 0, ready: false }))(pack); }
function getLoredeckCreatorPlanningAcceptedBatchIds(cached) { return dep('getLoredeckCreatorPlanningAcceptedBatchIds', () => new Set())(cached); }
function getLoredeckCreatorEntryDraftProgress(cached, pack) { return dep('getLoredeckCreatorEntryDraftProgress', () => null)(cached, pack); }
function getLoredeckCreatorEntryTargetTitles(cached, pack) { return dep('getLoredeckCreatorEntryTargetTitles', () => [])(cached, pack); }
function getLoredeckCreatorDraftChanges(packId) { return dep('getLoredeckCreatorDraftChanges', () => [])(packId); }
function getLoredeckCreatorPendingEntryCount(pack) { return dep('getLoredeckCreatorPendingEntryCount', () => 0)(pack); }
function getLoredeckCreatorAcceptedEntryCount(pack) { return dep('getLoredeckCreatorAcceptedEntryCount', () => 0)(pack); }
function getFreshLoredeckLibraryPack(packId, fallback) { return dep('getFreshLoredeckLibraryPack', (packId, fallback) => fallback || null)(packId, fallback); }
function handleLoredeckCreatorEntryDraft(button, options) { return dep('handleLoredeckCreatorEntryDraft', async () => null)(button, options); }
function confirmAction(title, message, options) { return dep('confirmAction', async () => false)(title, message, options); }
function createLoredeckCreatorDraftReviewSection(pack) { return dep('createLoredeckCreatorDraftReviewSection', () => null)(pack); }
function createLoredeckPendingReviewCard(pack) { return dep('createLoredeckPendingReviewCard', () => null)(pack); }
function getLoredeckCreatorPipelineReadinessView(pack, cached, renderModel) { return dep('getLoredeckCreatorPipelineReadinessView', () => null)(pack, cached, renderModel); }
function validateLoredeckForEditor(pack, button, options) { return dep('validateLoredeckForEditor', async () => ({ health: null }))(pack, button, options); }
function openLoredeckHealthCenter(packId, options) { return dep('openLoredeckHealthCenter', () => null)(packId, options); }
function attemptLoredeckHealthFixes(pack, button) {
    return dep('attemptLoredeckHealthFixes', async () => null)(pack, button);
}
function refreshRuntimePanelBody(options) { return dep('refreshPanelBody', () => null)(options); }
function refreshRuntimeHeader() { return dep('refreshHeader', () => null)(); }
function isRuntimeMobileShell() { return dep('isRuntimeMobileShell', () => false)() === true; }
function markTourTarget(element, target) { return dep('markTourTarget', value => value)(element, target); }

export function openLoredeckCreatorWorkbench(options = {}) {
    closeLoredeckCreatorWorkbench();
    loredeckCreatorDisclosureState.clear();
    loredeckCreatorDisclosureStateVersion = 0;
    recoverLoredeckCreatorCurrentActiveGenerationOnOpen({ toast: true });
    const overlay = document.createElement('div');
    overlay.className = 'saga-lore-workbench-overlay saga-loredeck-creator-workbench-overlay';
    wireOverlayBackdropClose(overlay, closeLoredeckCreatorWorkbench);
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-lore-workbench-shell saga-loredeck-creator-workbench-shell';
    if (isRuntimeMobileShell()) shell.classList.add('saga-loredeck-creator-workbench-shell-mobile');
    markTourTarget(shell, 'loredecks.creator.workbench');
    overlay.appendChild(shell);

    const cached = getLoredeckCreatorBriefCache();
    const pipeline = getLoredeckCreatorPipelineModel(cached);
    shell.appendChild(createLoredeckCreatorPipelineHeader(cached, pipeline, { showClose: true, workbench: true }));

    const body = document.createElement('div');
    body.className = 'saga-loredeck-creator-workbench-body';
    markTourTarget(body, 'loredecks.creator.body');
    body.appendChild(createLoredeckCreatorCard(getState(), { embedded: true, showHeader: false, cached, pipeline }));
    shell.appendChild(body);
    if (isRuntimeMobileShell()) shell.appendChild(createLoredeckCreatorWorkbenchActions(cached, { mobile: true, showClose: true }));
    const anchor = String(options.anchor || '').trim();
    if (anchor) {
        const scroll = () => scrollLoredeckCreatorWorkbenchToAnchor(anchor);
        scroll();
        scheduleLoredeckCreatorViewCallback(scroll);
    }
}

export function refreshLoredeckCreatorWorkbenchBody(options = {}) {
    const body = document.querySelector('.saga-loredeck-creator-workbench-body');
    if (!body) return false;
    cancelLoredeckCreatorViewCallbacks();
    const scrollState = options.preserveScroll === false ? null : captureLoredeckCreatorWorkbenchScrollState(body);
    const shell = body.closest('.saga-loredeck-creator-workbench-shell');
    const cached = getLoredeckCreatorBriefCache();
    const pipeline = getLoredeckCreatorPipelineModel(cached);
    const header = [...(shell?.children || [])].find(child => child.classList?.contains('saga-loredeck-creator-pipeline-header'));
    const nextHeader = createLoredeckCreatorPipelineHeader(cached, pipeline, { showClose: true, workbench: true });
    if (header) header.replaceWith(nextHeader);
    else if (shell) shell.insertBefore(nextHeader, body);
    const mobileActions = shell?.querySelector?.('.saga-loredeck-creator-workbench-bottom-actions');
    if (isRuntimeMobileShell()) {
        const nextActions = createLoredeckCreatorWorkbenchActions(cached, { mobile: true, showClose: true });
        if (mobileActions) mobileActions.replaceWith(nextActions);
        else shell?.appendChild(nextActions);
    } else {
        mobileActions?.remove();
    }
    disposeLoredeckCreatorDisclosureChildren(body);
    hideFloatingTooltip();
    body.replaceChildren(createLoredeckCreatorCard(getState(), { embedded: true, showHeader: false, cached, pipeline }));
    if (options.preserveScroll !== false) {
        const restore = () => {
            restoreLoredeckCreatorWorkbenchScrollState(body, scrollState);
        };
        restore();
        scheduleLoredeckCreatorViewCallback(restore);
    }
    return true;
}

function captureLoredeckCreatorWorkbenchScrollState(body) {
    if (!body) return null;
    return {
        capturedVersion: loredeckCreatorDisclosureStateVersion,
        scrollTop: body.scrollTop || 0,
        scrollLeft: body.scrollLeft || 0,
        anchor: getLoredeckCreatorWorkbenchScrollAnchor(body),
        details: captureLoredeckCreatorDetailsState(body),
        nested: captureLoredeckCreatorNestedScrollState(body),
    };
}

function captureLoredeckCreatorDetailsState(body) {
    return [...body.querySelectorAll('details.saga-loredeck-creator-artifact[data-saga-creator-anchor]')]
        .map(details => ({
            anchor: String(details.dataset.sagaCreatorAnchor || ''),
            open: details.open === true,
        }))
        .filter(item => item.anchor);
}

function getLoredeckCreatorElementPath(root, element) {
    if (!root || !element || root === element) return '';
    const path = [];
    let current = element;
    while (current && current !== root) {
        const parent = current.parentElement;
        if (!parent) return '';
        const index = Array.prototype.indexOf.call(parent.children, current);
        if (index < 0) return '';
        path.unshift(index);
        current = parent;
    }
    return current === root ? path.join('.') : '';
}

function getLoredeckCreatorElementByPath(root, path = '') {
    if (!root || !path) return null;
    let current = root;
    for (const part of String(path).split('.')) {
        const index = Number(part);
        if (!Number.isInteger(index) || index < 0 || !current?.children?.[index]) return null;
        current = current.children[index];
    }
    return current || null;
}

function isLoredeckCreatorScrollableElement(element) {
    if (!element || element.classList?.contains('saga-loredeck-creator-workbench-body')) return false;
    const hasBox = Number(element.clientHeight || 0) > 0 || Number(element.clientWidth || 0) > 0;
    if (!hasBox && !element.scrollTop && !element.scrollLeft) return false;
    return Boolean(
        element.scrollTop
        || element.scrollLeft
        || Number(element.scrollHeight || 0) > Number(element.clientHeight || 0) + 1
        || Number(element.scrollWidth || 0) > Number(element.clientWidth || 0) + 1
    );
}

function captureLoredeckCreatorNestedScrollState(body) {
    return [...body.querySelectorAll('*')]
        .filter(isLoredeckCreatorScrollableElement)
        .map(element => ({
            path: getLoredeckCreatorElementPath(body, element),
            scrollTop: element.scrollTop || 0,
            scrollLeft: element.scrollLeft || 0,
        }))
        .filter(item => item.path);
}

function restoreLoredeckCreatorDetailsState(body, detailsState = []) {
    for (const item of detailsState || []) {
        const selectorId = String(item.anchor || '').replace(/"/g, '\\"');
        const details = body.querySelector(`details.saga-loredeck-creator-artifact[data-saga-creator-anchor="${selectorId}"]`);
        const remembered = loredeckCreatorDisclosureState.get(String(item.anchor || ''));
        const open = remembered && Number(remembered.version || 0) > Number(item.capturedVersion || 0)
            ? remembered.open === true
            : item.open === true;
        if (details) {
            details.open = open;
            if (open) materializeLoredeckCreatorDisclosure(details);
        }
    }
}

function restoreLoredeckCreatorNestedScrollState(body, nestedState = []) {
    for (const item of nestedState || []) {
        const element = getLoredeckCreatorElementByPath(body, item.path);
        if (!element) continue;
        element.scrollTop = Number(item.scrollTop || 0);
        element.scrollLeft = Number(item.scrollLeft || 0);
    }
}

function restoreLoredeckCreatorWorkbenchScrollState(body, state = null) {
    if (!body || !state) return;
    restoreLoredeckCreatorDetailsState(body, (state.details || []).map(item => ({
        ...item,
        capturedVersion: state.capturedVersion,
    })));
    body.scrollTop = Number(state.scrollTop || 0);
    body.scrollLeft = Number(state.scrollLeft || 0);
    restoreLoredeckCreatorNestedScrollState(body, state.nested);
    restoreLoredeckCreatorWorkbenchScrollAnchor(body, state.anchor);
}

function getLoredeckCreatorWorkbenchScrollAnchor(body) {
    if (!body) return null;
    const bodyRect = body.getBoundingClientRect();
    const active = document.activeElement && body.contains(document.activeElement)
        ? document.activeElement.closest('[data-saga-creator-anchor]')
        : null;
    let target = active;
    if (!target) {
        const focusLine = bodyRect.top + Math.min(96, Math.max(28, body.clientHeight * 0.18));
        const anchors = [...body.querySelectorAll('[data-saga-creator-anchor]')];
        target = anchors
            .filter(anchor => {
                const rect = anchor.getBoundingClientRect();
                return rect.bottom >= bodyRect.top && rect.top <= bodyRect.bottom;
            })
            .sort((a, b) => Math.abs(a.getBoundingClientRect().top - focusLine) - Math.abs(b.getBoundingClientRect().top - focusLine))[0] || null;
    }
    if (!target?.dataset?.sagaCreatorAnchor) return null;
    const rect = target.getBoundingClientRect();
    return {
        id: target.dataset.sagaCreatorAnchor,
        offset: rect.top - bodyRect.top,
    };
}

function restoreLoredeckCreatorWorkbenchScrollAnchor(body, anchor = null) {
    if (!body || !anchor?.id) return;
    const selectorId = String(anchor.id).replace(/"/g, '\\"');
    let next = body.querySelector(`[data-saga-creator-anchor="${selectorId}"]`);
    if (!next) {
        prepareLoredeckCreatorAnchor(body, anchor.id);
        next = body.querySelector(`[data-saga-creator-anchor="${selectorId}"]`);
    }
    if (!next) return;
    const bodyRect = body.getBoundingClientRect();
    const rect = next.getBoundingClientRect();
    body.scrollTop += rect.top - bodyRect.top - Number(anchor.offset || 0);
}

export function queueLoredeckCreatorWorkbenchRefresh(options = {}) {
    if (!document.querySelector('.saga-loredeck-creator-workbench-body')) return false;
    if (loredeckCreatorWorkbenchRefreshQueued) return true;
    loredeckCreatorWorkbenchRefreshQueued = true;
    const refresh = () => {
        loredeckCreatorWorkbenchRefreshQueued = false;
        refreshLoredeckCreatorWorkbenchBody(options);
    };
    scheduleLoredeckCreatorViewCallback(refresh);
    return true;
}

export function refreshLoredeckCreatorTitleSelectionUi() {
    if (typeof document === 'undefined') return false;
    const card = document.querySelector('.saga-loredeck-creator-title-pass');
    if (!card) return false;

    const cached = getLoredeckCreatorBriefCache();
    const drafts = getLoredeckCreatorTitleDrafts(cached);
    if (!drafts.length) return false;

    const selectedIds = getLoredeckCreatorSelectedTitleIds(cached);
    const approvedIds = getLoredeckCreatorApprovedTitleIds(cached);
    const selectedCount = drafts.filter(draft => selectedIds.has(draft.titleId)).length;
    const selectedApprovedCount = drafts.filter(draft => selectedIds.has(draft.titleId) && approvedIds.has(draft.titleId)).length;
    const allSelected = selectedCount >= drafts.length;
    const noneSelected = selectedCount <= 0;

    card.querySelectorAll('.saga-loredeck-creator-title-selected-count').forEach(element => {
        element.textContent = `${selectedCount} selected`;
    });
    card.querySelectorAll('[data-saga-creator-title-action="approve-selected"], [data-saga-creator-title-action="drop-selected"]').forEach(button => {
        button.disabled = noneSelected;
    });
    card.querySelectorAll('[data-saga-creator-title-action="unapprove-selected"]').forEach(button => {
        button.disabled = selectedApprovedCount <= 0;
    });
    card.querySelectorAll('[data-saga-creator-title-action="revise-selected"]').forEach(button => {
        button.disabled = noneSelected || button.dataset.sagaCreatorGenerationLocked === 'true';
    });
    card.querySelectorAll('[data-saga-creator-title-action="select-all"]').forEach(button => {
        button.disabled = allSelected;
    });
    card.querySelectorAll('[data-saga-creator-title-action="clear-selection"]').forEach(button => {
        button.disabled = noneSelected;
    });

    card.querySelectorAll('.saga-loredeck-creator-title-row[data-saga-creator-title-id]').forEach(row => {
        const id = String(row.dataset.sagaCreatorTitleId || '');
        const selected = selectedIds.has(id);
        row.classList.toggle('saga-loredeck-creator-title-row-selected', selected);
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = selected;
    });
    return true;
}

export function createLoredeckCreatorPipelineHeader(cached = {}, pipeline = getLoredeckCreatorPipelineModel(cached), options = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'saga-lore-workbench-header saga-loredeck-creator-pipeline-header';
    markTourTarget(wrap, 'loredecks.creator.pipeline');
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const titleRow = document.createElement('div');
    titleRow.className = 'saga-loredeck-library-title-row saga-loredeck-creator-title-row';
    if (!(options.workbench && isRuntimeMobileShell())) {
        const emblem = document.createElement('div');
        emblem.className = 'saga-loredeck-library-emblem saga-loredeck-creator-emblem';
        emblem.textContent = 'S';
        titleRow.appendChild(emblem);
    }
    const titleText = document.createElement('div');
    titleText.className = 'saga-loredeck-creator-title-text';
    const titleLine = document.createElement('div');
    titleLine.className = 'saga-loredeck-library-title-line';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = 'Deck Maker';
    titleLine.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = 'Generated Loredeck draft';
    const meta = document.createElement('div');
    meta.className = 'saga-loredeck-library-title-meta saga-loredeck-creator-pipeline-meta';
    const brief = cached.brief || {};
    const draft = getLoredeckCreatorDraftInputs();
    const fandom = draft.fandom || cached.fandom || brief.fandom || 'No fandom';
    const scope = draft.scope || cached.scope || brief.scope || 'No scope';
    const granularity = cached.granularity || brief.granularity || draft.granularity || 'focused';
    meta.appendChild(createStatusPill(`Fandom: ${fandom}`, 'Fandom or universe for this Generated Loredeck draft.', { tone: fandom === 'No fandom' ? 'muted' : 'source', kind: 'metadata', maxChars: 42 }));
    meta.appendChild(createStatusPill(`Scope: ${scope}`, 'Story scope for this Deck Maker project.', { tone: scope === 'No scope' ? 'muted' : 'info', kind: 'metadata', maxChars: 46 }));
    meta.appendChild(createStatusPill(`Granularity: ${formatLoredeckCreatorGranularity(granularity)}`, 'Deck Maker generation granularity.', { tone: 'info', kind: 'metadata' }));
    if (cached.jobId) meta.appendChild(createStatusPill('Resumable job', 'This Deck Maker project is saved and can be resumed from the Loredecks tab.', { tone: 'success', kind: 'status' }));
    titleLine.appendChild(meta);
    titleText.appendChild(titleLine);
    titleText.appendChild(subtitle);
    titleRow.appendChild(titleText);
    titleWrap.appendChild(titleRow);
    wrap.appendChild(titleWrap);

    if (!(options.workbench && isRuntimeMobileShell())) {
        wrap.appendChild(createLoredeckCreatorWorkbenchActions(cached, { showClose: options.showClose }));
    }
    return wrap;
}

export function closeLoredeckCreatorWorkbench() {
    cancelLoredeckCreatorViewCallbacks();
    const overlay = document.querySelector('.saga-loredeck-creator-workbench-overlay');
    if (!overlay) return;
    disposeLoredeckCreatorDisclosureChildren(overlay);
    hideFloatingTooltip();
    overlay.remove();
}

function createLoredeckCreatorWorkbenchActions(cached = {}, options = {}) {
    const actions = document.createElement('div');
    actions.className = `saga-primary-actions saga-loredeck-library-header-actions saga-loredeck-creator-header-actions${options.mobile ? ' saga-loredeck-creator-workbench-bottom-actions' : ''}`;
    const settingsButton = createButton('Project Settings', 'Jump to the editable project inputs or approved Scope Brief.', () => {
        scrollLoredeckCreatorWorkbenchToAnchor(cached.approved ? 'scope-brief' : 'intake');
    });
    markTourTarget(settingsButton, 'loredecks.creator.settings');
    actions.appendChild(settingsButton);
    if (options.showClose) {
        actions.appendChild(createButton('Close', 'Close the Deck Maker wizard.', closeLoredeckCreatorWorkbench));
    }
    return actions;
}

export function createLoredeckCreatorStageGuide(cached = {}, pipeline = getLoredeckCreatorPipelineModel(cached)) {
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-creator-stage-guide';
    markTourTarget(wrap, 'loredecks.creator.stages');
    wrap.dataset.sagaCreatorAnchor = 'roadmap';

    const list = document.createElement('div');
    list.className = 'saga-loredeck-creator-stage-list';
    const generatedPack = pipeline.generatedPack || (cached.generatedPackId ? getLoredeckDefinition(cached.generatedPackId) : null);
    for (const [index, stage] of (pipeline.stages || []).entries()) {
        const item = document.createElement('div');
        item.className = `saga-loredeck-creator-stage-item saga-loredeck-creator-stage-${stage.status}`;
        if (pipeline.currentStep?.id === stage.id) item.classList.add('saga-loredeck-creator-stage-active');
        const main = document.createElement('button');
        main.type = 'button';
        main.className = 'saga-loredeck-creator-stage-main';
        const number = document.createElement('div');
        number.className = 'saga-loredeck-creator-stage-number';
        number.textContent = String(index + 1);
        main.appendChild(number);
        const body = document.createElement('div');
        body.className = 'saga-loredeck-creator-stage-body';
        const label = document.createElement('div');
        label.className = 'saga-loredeck-creator-stage-label';
        label.textContent = stage.label;
        body.appendChild(label);
        const detail = document.createElement('div');
        detail.className = 'saga-loredeck-creator-stage-detail';
        detail.textContent = stage.detail;
        body.appendChild(detail);
        main.appendChild(body);
        addTooltip(main, stage.status === 'locked' ? stage.dependency : `${stage.label}: ${stage.detail}`);
        main.addEventListener('click', () => {
            if (stage.status === 'locked' && stage.dependency) {
                toast(stage.dependency, 'info');
                return;
            }
            scrollLoredeckCreatorWorkbenchToAnchor(stage.anchor || 'current-task');
        });
        item.appendChild(main);
        const resetAvailability = getLoredeckCreatorResetAvailability(cached, generatedPack, stage.id, {
            activeGeneration: pipeline.activeGeneration,
        });
        if (resetAvailability.show && stage.status !== 'locked' && stage.status !== 'not-ready') {
            item.classList.add('saga-loredeck-creator-stage-resettable');
            const reset = document.createElement('button');
            reset.type = 'button';
            reset.className = 'saga-loredeck-creator-stage-reset';
            reset.textContent = '↶';
            reset.disabled = resetAvailability.disabled;
            addTooltip(reset, resetAvailability.disabled ? resetAvailability.reason : 'Reset to this step');
            reset.setAttribute('aria-label', `Reset to ${stage.label}`);
            reset.addEventListener('click', async event => {
                event.preventDefault();
                event.stopPropagation();
                if (reset.disabled) {
                    if (resetAvailability.reason) toast(resetAvailability.reason, 'warning');
                    return;
                }
                await handleLoredeckCreatorResetToStep(stage.id);
            });
            item.appendChild(reset);
        }
        list.appendChild(item);
    }
    wrap.appendChild(list);
    return wrap;
}

export function scrollLoredeckCreatorWorkbenchToAnchor(anchorId = '') {
    const id = String(anchorId || '').trim();
    if (!id) return false;
    const body = document.querySelector('.saga-loredeck-creator-workbench-body');
    prepareLoredeckCreatorAnchor(body, id);
    const selectorId = id.replace(/"/g, '\\"');
    const target = body?.querySelector(`[data-saga-creator-anchor="${selectorId}"]`)
        || (id === 'review-queue' ? body?.querySelector('.saga-loredeck-creator-pending-review') : null);
    if (!target) {
        toast(id === 'review-queue' ? 'No pending review queue is available yet.' : 'That Deck Maker section is not available yet.', 'info');
        return false;
    }
    const details = target.matches?.('details') ? target : target.closest('details');
    if (details) {
        details.open = true;
        rememberLoredeckCreatorDisclosureState(details.dataset?.sagaCreatorAnchor || '', true);
        materializeLoredeckCreatorDisclosure(details);
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
}

function rememberLoredeckCreatorDisclosureState(anchor = '', open = false) {
    const id = String(anchor || '').trim();
    if (!id) return;
    loredeckCreatorDisclosureState.set(id, {
        open: open === true,
        version: ++loredeckCreatorDisclosureStateVersion,
    });
}

function prepareLoredeckCreatorAnchor(body, id) {
    const owner = ({ finalize: 'deck-health', 'brief-review': 'scope-brief', 'context-tags': 'context-plan' })[id] || id;
    const selectorId = String(owner).replace(/"/g, '\\"');
    const details = body?.querySelector(`details.saga-loredeck-creator-artifact[data-saga-creator-anchor="${selectorId}"]`);
    if (!details) return false;
    details.open = true;
    rememberLoredeckCreatorDisclosureState(owner, true);
    materializeLoredeckCreatorDisclosure(details);
    return true;
}

export function prepareLoredeckCreatorTourTarget(targetName = '') {
    const name = String(targetName).replace(/^loredecks\.creator\./, '');
    const groups = {
        'scope-brief': ['brief'],
        'story-outline': ['outline'],
        'title-sets': ['titlePass', 'titleActions', 'generateNextTitleBatch', 'generateRemainingTitleBatches', 'approveSelectedTitles', 'titleRevision', 'reviseSelectedTitles'],
        'context-plan': ['planning', 'planningActions', 'planContextTags'],
        'review-queue': ['review'],
        lorecards: ['entries', 'entryActions', 'draftLorecards', 'autoDraftAll'],
        'deck-health': ['readiness', 'readinessHealthActions', 'runPackHealth', 'openPackHealthCenter', 'attemptHealthFixing', 'finalizeActions', 'openCoveragePlan', 'finalizeAnyway'],
    };
    const owner = Object.keys(groups).find(anchor => groups[anchor].includes(name));
    return owner ? prepareLoredeckCreatorAnchor(document.querySelector('.saga-loredeck-creator-workbench-body'), owner) : false;
}

export function materializeLoredeckCreatorDisclosure(details) {
    return loredeckCreatorDisclosureChildren.get(details)?.materialize() || null;
}

export function disposeLoredeckCreatorDisclosureChildren(root) {
    if (!root) return;
    // Take the descendant list before disposing a parent handle that may remove DOM.
    const disclosures = [root, ...root.querySelectorAll('details.saga-loredeck-creator-artifact')];
    for (const details of disclosures.reverse()) loredeckCreatorDisclosureChildren.get(details)?.dispose();
}

export function createLoredeckCreatorArtifactDisclosure(title, childOrFactory, options = {}) {
    const details = document.createElement('details');
    details.className = 'saga-loredeck-creator-artifact';
    const anchor = String(options.anchor || '').trim();
    const remembered = anchor ? loredeckCreatorDisclosureState.get(anchor) : null;
    details.open = remembered ? remembered.open === true : options.open === true;
    if (anchor) details.dataset.sagaCreatorAnchor = anchor;
    const summary = document.createElement('summary');
    const label = document.createElement('span');
    label.textContent = title;
    summary.appendChild(label);
    const state = document.createElement('span');
    state.className = 'saga-loredeck-creator-artifact-state';
    state.textContent = options.state || (details.open ? 'Open' : 'Collapsed');
    summary.appendChild(state);
    details.appendChild(summary);
    let handle = null;
    let disposed = false;
    const materialize = () => {
        if (disposed) return null;
        if (handle) return handle.element;
        const result = typeof childOrFactory === 'function' ? childOrFactory() : childOrFactory;
        const next = result && 'element' in result ? result : { element: result };
        if (next.element) details.appendChild(next.element);
        handle = next;
        return handle.element;
    };
    loredeckCreatorDisclosureChildren.set(details, {
        materialize,
        dispose() {
            if (disposed) return;
            disposed = true;
            handle?.dispose?.();
            handle = null;
        },
    });
    details.addEventListener('toggle', () => {
        if (!details.open || disposed) return;
        try {
            materialize();
        } catch (error) {
            toast(error?.message || String(error), 'error');
        }
    });
    if (details.open || typeof childOrFactory !== 'function') materialize();
    if (anchor) {
        summary.addEventListener('click', () => {
            rememberLoredeckCreatorDisclosureState(anchor, !details.open);
        });
        summary.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                rememberLoredeckCreatorDisclosureState(anchor, !details.open);
            }
        });
        details.addEventListener('toggle', () => {
            if (!disposed) rememberLoredeckCreatorDisclosureState(anchor, details.open);
        });
    }
    return details;
}

export function createLoredeckCreatorCurrentTaskCard(cached = {}, pipeline = getLoredeckCreatorPipelineModel(cached), context = {}) {
    const card = document.createElement('div');
    card.className = 'saga-loredeck-creator-current-task';
    markTourTarget(card, 'loredecks.creator.currentTask');
    card.dataset.sagaCreatorAnchor = 'current-task';
    const main = document.createElement('div');
    main.className = 'saga-loredeck-creator-current-main';
    const kicker = document.createElement('div');
    kicker.className = 'saga-loredeck-creator-current-kicker';
    kicker.textContent = 'Current Task';
    main.appendChild(kicker);
    const title = document.createElement('div');
    title.className = 'saga-loredeck-creator-current-title';
    title.textContent = getLoredeckCreatorCurrentTaskTitle(cached, pipeline);
    main.appendChild(title);
    const description = document.createElement('div');
    description.className = 'saga-loredeck-creator-current-description';
    description.textContent = getLoredeckCreatorCurrentTaskDescription(cached, pipeline);
    main.appendChild(description);
    main.appendChild(createLoredeckCreatorCurrentTaskOutputs(pipeline));
    main.appendChild(createLoredeckCreatorCurrentTaskActions(cached, pipeline, context));
    appendLoredeckCreatorGenerationStatus(main, cached, [
        'brief_draft',
        'brief_revision',
        'outline_draft',
        'outline_revision',
        'title_batch_draft',
        'title_batch_redraft',
        'title_revision',
        'planning_batch_draft',
        'entry_batch_draft',
        'entry_multi_batch_draft',
    ]);
    card.appendChild(main);
    card.appendChild(createLoredeckCreatorCurrentSidebar(cached, pipeline));
    return card;
}

export function createLoredeckCreatorBriefReview(brief = {}, cached = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-creator-brief';
    markTourTarget(wrap, 'loredecks.creator.brief');
    wrap.dataset.sagaCreatorAnchor = 'brief-review';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Scope Brief';
    wrap.appendChild(title);

    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-entry-summary';
    chips.appendChild(createStatusPill(cached.approved ? 'Approved' : 'Needs approval', 'Brief approval status.', { tone: cached.approved ? 'success' : 'review', kind: 'status' }));
    if (brief.granularity) chips.appendChild(createStatusPill(formatLoredeckCreatorGranularity(brief.granularity), 'Model-confirmed granularity.', { tone: 'info', kind: 'metadata' }));
    wrap.appendChild(chips);

    const grid = document.createElement('div');
    grid.className = 'saga-loredeck-detail-grid';
    grid.appendChild(createKeyValue('Title', brief.title || 'unset', 'Deck Maker brief title.'));
    grid.appendChild(createKeyValue('Deck ID', brief.packId || 'unset', 'Stable generated Loredeck ID.'));
    grid.appendChild(createKeyValue('Fandom', brief.fandom || 'unset', 'Fandom or universe.'));
    grid.appendChild(createKeyValue('Scope', brief.scope || 'unset', 'Coverage range for this deck.'));
    grid.appendChild(createKeyValue('Coverage', brief.coverageSummary || brief.coverage || 'unset', 'What the deck should cover.'));
    wrap.appendChild(grid);

    appendLoredeckCreatorBriefList(wrap, 'Assumptions', brief.assumptions);
    wrap.appendChild(createLoredeckCreatorBriefRevisionForm(brief, cached));
    return wrap;
}

export function appendLoredeckCreatorBriefList(container, label, items = []) {
    const values = Array.isArray(items) ? items.map(item => String(item || '').trim()).filter(Boolean) : [];
    if (!values.length) return;
    const section = document.createElement('div');
    section.className = 'saga-loredeck-creator-brief-list';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-row-title';
    title.textContent = label;
    section.appendChild(title);
    for (const item of values.slice(0, 10)) {
        const row = document.createElement('div');
        row.className = 'saga-runtime-help';
        row.textContent = item;
        section.appendChild(row);
    }
    container.appendChild(section);
}

function getLoredeckCreatorOutline(cached = {}) {
    const outline = cached?.outline;
    return outline && typeof outline === 'object' && !Array.isArray(outline) ? outline : null;
}

export function getLoredeckCreatorOutlineRows(outline = {}, key = '') {
    const rows = Array.isArray(outline?.[key]) ? outline[key] : [];
    return rows
        .filter(row => row && typeof row === 'object' && !Array.isArray(row))
        .map((row, index) => ({
            id: String(row.id || `${key}-${index + 1}`).trim(),
            label: String(row.label || row.title || row.name || `${humanizeScopeKey(key)} ${index + 1}`).trim(),
            type: String(row.type || row.kind || row.category || '').trim(),
            order: Number.isFinite(Number(row.order ?? row.sortKey)) ? Math.round(Number(row.order ?? row.sortKey)) : index + 1,
            summary: String(row.summary || row.description || '').trim(),
            contextRole: String(row.contextRole || row.context || row.role || '').trim(),
            titleTargets: Array.isArray(row.titleTargets) ? row.titleTargets.map(item => String(item || '').trim()).filter(Boolean).slice(0, 8) : [],
            coverageDimensionIds: Array.isArray(row.coverageDimensionIds || row.coverageDimensions || row.coverageIds)
                ? (row.coverageDimensionIds || row.coverageDimensions || row.coverageIds).map(item => String(item || '').trim()).filter(Boolean).slice(0, 12)
                : [],
        }));
}

function createLoredeckCreatorOutlineRows(container, label, rows = []) {
    const cleanRows = Array.isArray(rows) ? rows : [];
    if (!cleanRows.length) return;
    const section = document.createElement('div');
    section.className = 'saga-loredeck-creator-brief-list';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-row-title';
    title.textContent = label;
    section.appendChild(title);
    for (const row of cleanRows.slice(0, 16)) {
        const item = document.createElement('div');
        item.className = 'saga-runtime-help';
        const parts = [];
        const prefix = row.type ? `${humanizeScopeKey(row.type)}: ` : '';
        parts.push(`${prefix}${row.label}`);
        if (row.summary) parts.push(row.summary);
        if (row.contextRole) parts.push(`Context: ${row.contextRole}`);
        if (row.titleTargets?.length) parts.push(`Targets: ${row.titleTargets.join(', ')}`);
        if (row.coverageDimensionIds?.length) parts.push(`Coverage: ${row.coverageDimensionIds.join(', ')}`);
        item.textContent = parts.join(' | ');
        section.appendChild(item);
    }
    container.appendChild(section);
}

export function createLoredeckCreatorOutlineCard(brief = {}, cached = {}) {
    const outline = getLoredeckCreatorOutline(cached);
    const beats = getLoredeckCreatorOutlineRows(outline, 'beats');
    const contextMilestones = getLoredeckCreatorOutlineRows(outline, 'contextMilestones');
    const titleBatches = getLoredeckCreatorOutlineRows(outline, 'titleBatches');
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-creator-brief saga-loredeck-creator-outline';
    markTourTarget(wrap, 'loredecks.creator.outline');
    wrap.dataset.sagaCreatorAnchor = 'story-outline';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Deck Maker Story Outline';
    wrap.appendChild(title);

    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-entry-summary';
    summary.appendChild(createStatusPill(outline ? (cached.outlineApproved ? 'Approved' : 'Needs approval') : 'Ready', 'Story Outline approval status.', { tone: outline ? (cached.outlineApproved ? 'success' : 'review') : 'success', kind: 'status' }));
    summary.appendChild(createStatusPill(`${beats.length} beat${beats.length === 1 ? '' : 's'}`, 'Major story beats in this outline.', { kind: 'count' }));
    summary.appendChild(createStatusPill(`${contextMilestones.length} Context`, 'Major Context browser points suggested by this outline.', { tone: 'source', kind: 'count' }));
    summary.appendChild(createStatusPill(`${titleBatches.length} title set${titleBatches.length === 1 ? '' : 's'}`, 'Future title-pass slices suggested by this outline.', { kind: 'count' }));
    if (cached.outlineQuestions?.length) summary.appendChild(createStatusPill(`${cached.outlineQuestions.length} question${cached.outlineQuestions.length === 1 ? '' : 's'}`, 'Deck Maker needs clarification before the outline is ready.', { tone: 'review', kind: 'count' }));
    wrap.appendChild(summary);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'This stage confirms the story shape and major Context points before Saga drafts Lorecard titles.';
    wrap.appendChild(help);

    if (outline) {
        const grid = document.createElement('div');
        grid.className = 'saga-loredeck-detail-grid';
        grid.appendChild(createKeyValue('Outline', outline.label || brief.title || 'Story outline', 'Reviewable outline label.'));
        grid.appendChild(createKeyValue('Coverage', outline.coverageSummary || brief.coverageSummary || brief.coverage || 'unset', 'What this outline covers.'));
        wrap.appendChild(grid);
        createLoredeckCreatorOutlineRows(wrap, 'Story Beats', beats);
        createLoredeckCreatorOutlineRows(wrap, 'Context Milestones', contextMilestones);
        createLoredeckCreatorOutlineRows(wrap, 'Title Batch Plan', titleBatches);
        appendLoredeckCreatorBriefList(wrap, 'Assumptions', outline.assumptions);
    }

    if (cached.outlineSummary || cached.outlineQuestions?.length) {
        const result = document.createElement('div');
        result.className = 'saga-runtime-help';
        const parts = [];
        if (cached.outlineSummary) parts.push(cached.outlineSummary);
        if (cached.outlineQuestions?.length) parts.push(`Questions: ${cached.outlineQuestions.join(' | ')}`);
        result.textContent = parts.join(' ');
        wrap.appendChild(result);
    }

    wrap.appendChild(createLoredeckCreatorOutlineActionForm(brief, cached, outline));
    return wrap;
}

export function normalizeLoredeckCreatorTitleId(value = '', fallback = '') {
    const text = String(value || fallback || '')
        .trim()
        .slice(0, 160);
    return text || String(fallback || '').trim();
}

function normalizeLoredeckCreatorStringList(value = [], limit = 500) {
    if (!Array.isArray(value)) return [];
    const out = [];
    const seen = new Set();
    for (const raw of value) {
        const id = String(raw || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
        if (out.length >= limit) break;
    }
    return out;
}

export function normalizeLoredeckCreatorTitleDrafts(value = []) {
    if (!Array.isArray(value)) return [];
    const drafts = [];
    const seen = new Set();
    for (const [index, raw] of value.entries()) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const title = String(raw.title || raw.name || raw.label || '').trim().slice(0, 220);
        if (!title) continue;
        const fallback = `title-${index + 1}`;
        let titleId = normalizeLoredeckCreatorTitleId(raw.titleId || raw.id || raw.entryId, fallback);
        if (seen.has(titleId)) titleId = `${titleId}-${index + 1}`;
        seen.add(titleId);
        drafts.push({
            titleId,
            title,
            category: String(raw.category || raw.type || raw.kind || '').trim().slice(0, 120),
            priority: Number.isFinite(Number(raw.priority)) ? Math.max(0, Math.min(100, Math.round(Number(raw.priority)))) : 50,
            relevance: String(raw.relevance || '').trim().slice(0, 80),
            contextHint: String(raw.contextHint || raw.timelineHint || '').trim().slice(0, 500),
            tags: normalizeLoredeckCreatorStringList(raw.tags || raw.tagHints || raw.suggestedTags || [], 24),
            reason: String(raw.reason || raw.rationale || raw.description || '').trim().slice(0, 1000),
            creatorTitleBatchId: normalizeLoredeckCreatorTitleId(raw.creatorTitleBatchId || raw.batchId || raw.sourceBatchId || '', ''),
            creatorTitleBatchLabel: String(raw.creatorTitleBatchLabel || raw.batchLabel || raw.sourceBatchLabel || '').trim().slice(0, 180),
            coverageDimensionIds: normalizeLoredeckCreatorStringList(raw.coverageDimensionIds || raw.coverageDimensions || raw.coverageIds || [], 12),
            rubric: isPlainObjectValue(raw.rubric) ? raw.rubric : null,
        });
    }
    return drafts;
}

export function normalizeLoredeckCreatorTitleIdList(value = [], limit = 500) {
    const out = [];
    const seen = new Set();
    const values = Array.isArray(value) ? value : [];
    for (const raw of values) {
        const id = normalizeLoredeckCreatorTitleId(raw);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
        if (out.length >= limit) break;
    }
    return out;
}

export function getLoredeckCreatorTitleDrafts(cached = {}) {
    return normalizeLoredeckCreatorTitleDrafts(cached?.titleDrafts);
}

export function getLoredeckCreatorTitleDraftedBatchIds(cached = {}) {
    return new Set(normalizeLoredeckCreatorTitleIdList(cached?.titleBatchDraftedIds || [], 1200));
}

export function getLoredeckCreatorTitleBatchRows(cached = {}) {
    const outline = getLoredeckCreatorOutline(cached);
    const rows = getLoredeckCreatorOutlineRows(outline, 'titleBatches')
        .map((row, index) => ({
            ...row,
            id: normalizeLoredeckCreatorTitleId(row.id || row.label, `title-batch-${index + 1}`),
            label: row.label || `Title Batch ${index + 1}`,
            order: Number.isFinite(Number(row.order)) ? Number(row.order) : index + 1,
        }))
        .filter(row => row.id);
    if (rows.length) return rows;
    const brief = cached.brief || {};
    return [{
        id: 'whole-scope',
        label: 'Whole Scope',
        type: 'title_batch',
        order: 10,
        summary: outline?.coverageSummary || brief.coverageSummary || brief.coverage || brief.scope || 'Approved Deck Maker scope.',
        contextRole: 'Fallback title set when the outline did not define smaller title slices.',
        titleTargets: [],
        coverageDimensionIds: [],
    }];
}

export function getLoredeckCreatorNextTitleBatch(cached = {}) {
    const drafted = getLoredeckCreatorTitleDraftedBatchIds(cached);
    return getLoredeckCreatorTitleBatchRows(cached).find(batch => !drafted.has(batch.id)) || null;
}

export function getLoredeckCreatorRemainingTitleBatches(cached = {}) {
    const drafted = getLoredeckCreatorTitleDraftedBatchIds(cached);
    return getLoredeckCreatorTitleBatchRows(cached).filter(batch => batch?.id && !drafted.has(batch.id));
}

export function getLoredeckCreatorTitleBatchIdentity(batch = {}) {
    const id = normalizeLoredeckCreatorTitleId(batch?.id || batch?.label || '', '');
    return {
        id,
        label: String(batch?.label || id || 'Title Batch').trim(),
    };
}

export function countLoredeckCreatorTitleQualityWarnings(drafts = []) {
    return 0;
}

function truncateLoredeckCreatorText(text = '', maxLength = 700) {
    const value = String(text || '');
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
}

function compactLoredeckCreatorIdList(values = [], limit = 24, maxLength = 180) {
    const source = Array.isArray(values) ? values : [values];
    const out = [];
    const seen = new Set();
    for (const raw of source.flatMap(item => Array.isArray(item) ? item : [item])) {
        const value = String(raw || '').trim().slice(0, maxLength);
        if (!value || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
        if (out.length >= limit) break;
    }
    return out;
}

export function compactLoredeckCreatorTitleDraftForRevision(draft = {}) {
    const compact = {
        titleId: draft.titleId || '',
        title: draft.title || '',
        category: draft.category || '',
        priority: Number.isFinite(Number(draft.priority)) ? Math.round(Number(draft.priority)) : 50,
        relevance: draft.relevance || '',
        contextHint: draft.contextHint || '',
        tags: Array.isArray(draft.tags) ? draft.tags.slice(0, 24) : [],
        reason: truncateLoredeckCreatorText(draft.reason || '', 700),
        creatorTitleBatchId: draft.creatorTitleBatchId || '',
        creatorTitleBatchLabel: draft.creatorTitleBatchLabel || '',
        coverageDimensionIds: Array.isArray(draft.coverageDimensionIds) ? draft.coverageDimensionIds.slice(0, 12) : [],
        rubric: isPlainObjectValue(draft.rubric) ? draft.rubric : null,
    };
    const timelineAnchorIds = compactLoredeckCreatorIdList([
        draft.timelineAnchorIds,
        draft.anchorIds,
        draft.contextAnchorIds,
        draft.anchorId,
        draft.validFromAnchor,
        draft.validToAnchor,
    ]);
    const timelineWindowIds = compactLoredeckCreatorIdList([
        draft.timelineWindowIds,
        draft.windowIds,
        draft.contextWindowIds,
        draft.windowId,
        draft.validWindowId,
    ]);
    if (timelineAnchorIds.length) compact.timelineAnchorIds = timelineAnchorIds;
    if (timelineWindowIds.length) compact.timelineWindowIds = timelineWindowIds;
    return compact;
}

export function createLoredeckCreatorTitleBatchPlanner(brief = {}, cached = {}) {
    const batches = getLoredeckCreatorTitleBatchRows(cached);
    const draftedIds = getLoredeckCreatorTitleDraftedBatchIds(cached);
    const drafts = getLoredeckCreatorTitleDrafts(cached);
    const nextBatch = getLoredeckCreatorNextTitleBatch(cached);
    const section = document.createElement('div');
    section.className = 'saga-loredeck-creator-title-batches';

    const heading = document.createElement('div');
    heading.className = 'saga-loredeck-row-title';
    heading.textContent = 'Title Set Plan';
    section.appendChild(heading);

    for (const batch of batches.slice(0, 16)) {
        const drafted = draftedIds.has(batch.id);
        const isNext = !drafted && nextBatch?.id === batch.id;
        const row = document.createElement('div');
        row.className = 'saga-loredeck-entry-row saga-loredeck-creator-title-batch-row';
        const main = document.createElement('div');
        main.className = 'saga-loredeck-row-main';
        const label = document.createElement('div');
        label.className = 'saga-loredeck-row-title';
        label.textContent = batch.label || batch.id;
        main.appendChild(label);
        const desc = document.createElement('div');
        desc.className = 'saga-loredeck-row-description';
        desc.textContent = batch.summary || batch.contextRole || 'Planned title-batch slice from the approved Story Outline.';
        main.appendChild(desc);
        const meta = document.createElement('div');
        meta.className = 'saga-loredeck-row-meta';
        const batchDrafts = drafts.filter(draft => draft.creatorTitleBatchId === batch.id);
        meta.appendChild(createStatusPill(drafted ? 'Drafted' : (isNext ? 'Next' : 'Waiting'), drafted ? 'This title set already has generated drafts.' : (isNext ? 'This is the next title set Saga will draft.' : 'Draft earlier title sets before this one.'), { tone: drafted ? 'review' : (isNext ? 'info' : 'muted'), kind: 'status' }));
        meta.appendChild(createStatusPill(`${batchDrafts.length} title${batchDrafts.length === 1 ? '' : 's'}`, 'Title drafts currently tied to this batch.', { tone: batchDrafts.length ? 'review' : 'muted', kind: 'count' }));
        if (batch.type) meta.appendChild(createStatusPill(humanizeScopeKey(batch.type), 'Outline title-batch type.', { tone: 'category', kind: 'metadata' }));
        if (batch.titleTargets?.length) meta.appendChild(createStatusPill(`${batch.titleTargets.length} target${batch.titleTargets.length === 1 ? '' : 's'}`, batch.titleTargets.join(', '), { kind: 'count' }));
        if (batch.coverageDimensionIds?.length) meta.appendChild(createStatusPill(`${batch.coverageDimensionIds.length} coverage`, batch.coverageDimensionIds.join(', '), { tone: 'source', kind: 'count' }));
        main.appendChild(meta);
        row.appendChild(main);

        const actions = document.createElement('div');
        actions.className = 'saga-loredeck-row-actions';
        actions.appendChild(createStatusPill(drafted ? 'Generated' : (isNext ? 'Next in queue' : 'Waiting'), drafted ? 'This title set has generated drafts.' : (isNext ? 'Use Generate Next to draft this title set.' : 'Earlier title sets generate first.'), { tone: drafted ? 'success' : (isNext ? 'info' : 'muted'), kind: 'status' }));
        row.appendChild(actions);
        appendLoredeckCreatorGenerationStatus(main, cached, ['title_batch_draft', 'title_batch_redraft'], {
            batchId: batch.id,
            coverageDimensionIds: batch.coverageDimensionIds,
            compact: true,
        });
        section.appendChild(row);
    }

    if (batches.length > 16) {
        const more = document.createElement('div');
        more.className = 'saga-runtime-help';
        more.textContent = `Showing 16 of ${batches.length} planned title sets.`;
        section.appendChild(more);
    }
    return section;
}

export function createLoredeckCreatorTitlePassCard(brief = {}, cached = {}) {
    const drafts = getLoredeckCreatorTitleDrafts(cached);
    const titleBatches = getLoredeckCreatorTitleBatchRows(cached);
    const draftedBatchIds = getLoredeckCreatorTitleDraftedBatchIds(cached);
    const nextTitleBatch = getLoredeckCreatorNextTitleBatch(cached);
    const remainingTitleBatches = getLoredeckCreatorRemainingTitleBatches(cached);
    const selectedIds = getLoredeckCreatorSelectedTitleIds(cached);
    const approvedIds = getLoredeckCreatorApprovedTitleIds(cached);
    const selectedCount = drafts.filter(draft => selectedIds.has(draft.titleId)).length;
    const selectedApprovedCount = drafts.filter(draft => selectedIds.has(draft.titleId) && approvedIds.has(draft.titleId)).length;
    const context = {
        drafts,
        titleBatches,
        draftedBatchIds,
        nextTitleBatch,
        remainingTitleBatches,
        selectedIds,
        approvedIds,
        selectedCount,
        selectedApprovedCount,
    };

    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-creator-brief saga-loredeck-creator-title-pass';
    markTourTarget(wrap, 'loredecks.creator.titlePass');
    wrap.dataset.sagaCreatorAnchor = 'title-sets';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Deck Maker Title Pass';
    wrap.appendChild(title);

    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-entry-summary';
    summary.appendChild(createStatusPill(drafts.length ? 'Drafted' : 'Ready', 'Title-pass generation status.', { tone: drafts.length ? 'review' : 'success', kind: 'status' }));
    summary.appendChild(createStatusPill(`${drafts.length} title${drafts.length === 1 ? '' : 's'}`, 'Reviewable title drafts in this batch.', { kind: 'count' }));
    summary.appendChild(createStatusPill(`${draftedBatchIds.size}/${titleBatches.length} batches`, 'Title batches drafted from the approved Story Outline.', { kind: 'count' }));
    const selectedPill = createStatusPill(`${selectedCount} selected`, 'Selected titles are affected by approve, drop, and revise actions.', { tone: selectedCount ? 'selected' : 'muted', kind: 'count' });
    selectedPill.classList.add('saga-loredeck-creator-title-selected-count');
    summary.appendChild(selectedPill);
    if (approvedIds.size) summary.appendChild(createStatusPill(`${approvedIds.size} approved`, 'Approved titles are ready for the next Deck Maker stage.', { tone: 'success', kind: 'count' }));
    if (cached.titleBatch?.label) summary.appendChild(createStatusPill(cached.titleBatch.label, 'Current title set label.', { tone: 'info', kind: 'metadata', maxChars: 34 }));
    wrap.appendChild(summary);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Titles are review-only. Draft one planned title set per model call, then approve the useful titles for the next Deck Maker stage.';
    wrap.appendChild(help);

    wrap.appendChild(createLoredeckCreatorTitleBatchPlanner(brief, cached));

    if (cached.titlePassSummary || cached.titlePassQuestions?.length || cached.titleBatch?.coverage || cached.titleBatch?.nextBatchHint) {
        const result = document.createElement('div');
        result.className = 'saga-runtime-help';
        const parts = [];
        if (cached.titlePassSummary) parts.push(cached.titlePassSummary);
        if (cached.titleBatch?.coverage) parts.push(`Coverage: ${cached.titleBatch.coverage}`);
        if (cached.titleBatch?.nextBatchHint) parts.push(`Next batch: ${cached.titleBatch.nextBatchHint}`);
        if (cached.titlePassQuestions?.length) parts.push(`Questions: ${cached.titlePassQuestions.join(' | ')}`);
        result.textContent = parts.join(' ');
        wrap.appendChild(result);
    }

    wrap.appendChild(createLoredeckCreatorTitlePassActions(brief, cached, context));
    appendLoredeckCreatorGenerationStatus(wrap, cached, ['title_batch_draft', 'title_batch_redraft']);
    wrap.appendChild(createLoredeckCreatorTitleRevisionForm(brief, cached, context));

    if (!drafts.length) {
        wrap.appendChild(createEmptyMessage('Draft title sets after approving the Deck Maker Story Outline.'));
        return wrap;
    }

    const list = document.createElement('div');
    list.className = 'saga-loredeck-entry-list saga-loredeck-creator-title-list';
    for (const draft of drafts.slice(0, 80)) {
        list.appendChild(createLoredeckCreatorTitleRow(draft, selectedIds.has(draft.titleId), approvedIds.has(draft.titleId)));
    }
    if (drafts.length > 80) {
        const more = document.createElement('div');
        more.className = 'saga-runtime-help';
        more.textContent = `Showing 80 of ${drafts.length} title drafts. Approve, drop, or revise this batch before generating more.`;
        list.appendChild(more);
    }
    wrap.appendChild(list);
    return wrap;
}

function createLoredeckCreatorTitlePassActions(brief = {}, cached = {}, context = {}) {
    const generationSettings = getLoredeckCreatorGenerationSettings(cached);
    const nextTitleBatch = context.nextTitleBatch || getLoredeckCreatorNextTitleBatch(cached);
    const remainingTitleBatches = Array.isArray(context.remainingTitleBatches)
        ? context.remainingTitleBatches
        : getLoredeckCreatorRemainingTitleBatches(cached);
    const selectedCount = Number.isFinite(Number(context.selectedCount)) ? Number(context.selectedCount) : getLoredeckCreatorSelectedTitleDrafts(cached).length;
    const approvedIds = context.approvedIds || getLoredeckCreatorApprovedTitleIds(cached);
    const selectedApprovedCount = Number.isFinite(Number(context.selectedApprovedCount))
        ? Number(context.selectedApprovedCount)
        : getLoredeckCreatorSelectedTitleDrafts(cached).filter(draft => approvedIds.has(draft.titleId)).length;
    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    markTourTarget(actions, 'loredecks.creator.titleActions');
    const draftNext = createButton(nextTitleBatch ? 'Generate Next Title Batch' : 'Title Batches Complete', nextTitleBatch ? 'Generate the next undrafted title batch from the approved Story Outline.' : 'Every planned title batch has already been drafted.', async (btn) => {
        const fresh = getLoredeckCreatorBriefCache();
        const draftInputs = getLoredeckCreatorDraftInputs();
        await handleLoredeckCreatorTitleDraft({
            brief: fresh.brief || brief,
            notes: fresh.notes || draftInputs.notes || '',
            targetTitleBatch: getLoredeckCreatorNextTitleBatch(fresh),
            previousTitleDrafts: getLoredeckCreatorTitleDrafts(fresh).map(compactLoredeckCreatorTitleDraftForRevision),
        }, btn);
    }, 'saga-primary-button');
    draftNext.disabled = !nextTitleBatch;
    actions.appendChild(markTourTarget(lockLoredeckCreatorGenerationButton(draftNext, cached, 'title set draft'), 'loredecks.creator.generateNextTitleBatch'));

    const titleRunLimit = Number.isFinite(Number(generationSettings.titleRunRemainingLimit))
        ? Number(generationSettings.titleRunRemainingLimit)
        : 1;
    const remainingLabel = remainingTitleBatches.length
        ? `Generate Remaining (${Math.min(titleRunLimit, remainingTitleBatches.length)})`
        : 'Remaining Complete';
    const generateRemaining = createButton(remainingLabel, remainingTitleBatches.length ? `Run up to ${titleRunLimit} title-batch calls in sequence, one title set per provider call.` : 'Every planned title batch has already been drafted.', async (btn) => {
        await handleLoredeckCreatorRemainingTitleBatches(btn);
    });
    generateRemaining.disabled = !remainingTitleBatches.length;
    actions.appendChild(markTourTarget(lockLoredeckCreatorGenerationButton(generateRemaining, cached, 'remaining title batches'), 'loredecks.creator.generateRemainingTitleBatches'));

    const approveSelected = createButton('Approve Selected Titles', 'Approve selected title drafts for the next Deck Maker stage.', () => {
        approveLoredeckCreatorTitleSelection(getLoredeckCreatorSelectedTitleIds(getLoredeckCreatorBriefCache()));
    });
    approveSelected.dataset.sagaCreatorTitleAction = 'approve-selected';
    approveSelected.disabled = !selectedCount;
    actions.appendChild(markTourTarget(approveSelected, 'loredecks.creator.approveSelectedTitles'));

    const unapproveSelected = createButton('Unapprove Selected', 'Remove selected title drafts from the approved set.', () => {
        unapproveLoredeckCreatorTitleSelection(getLoredeckCreatorSelectedTitleIds(getLoredeckCreatorBriefCache()));
    });
    unapproveSelected.dataset.sagaCreatorTitleAction = 'unapprove-selected';
    unapproveSelected.disabled = !selectedApprovedCount;
    actions.appendChild(unapproveSelected);

    const dropSelected = createButton('Drop Selected', 'Remove selected title drafts from this Deck Maker batch.', () => {
        dropLoredeckCreatorTitleSelection(getLoredeckCreatorSelectedTitleIds(getLoredeckCreatorBriefCache()));
    }, 'saga-danger-button');
    dropSelected.dataset.sagaCreatorTitleAction = 'drop-selected';
    dropSelected.disabled = !selectedCount;
    actions.appendChild(dropSelected);

    const selectAll = createButton('Select All', 'Select every title draft in this batch.', () => {
        setLoredeckCreatorTitleSelectionBulk('all', { refresh: true });
    });
    selectAll.dataset.sagaCreatorTitleAction = 'select-all';
    selectAll.disabled = selectedCount >= getLoredeckCreatorTitleDrafts(cached).length;
    actions.appendChild(selectAll);
    const clearSelection = createButton('Clear Selection', 'Clear the current title draft selection.', () => {
        setLoredeckCreatorTitleSelectionBulk('none', { refresh: true });
    });
    clearSelection.dataset.sagaCreatorTitleAction = 'clear-selection';
    clearSelection.disabled = !selectedCount;
    actions.appendChild(clearSelection);
    return actions;
}

function createLoredeckCreatorTitleRevisionInput(container, value = '') {
    const label = document.createElement('label');
    label.className = 'saga-new-lore-field';
    const span = document.createElement('span');
    span.textContent = 'Title Revision';
    addTooltip(span, 'Instruction for revising selected title drafts before full entry generation.');
    label.appendChild(span);
    const input = document.createElement('textarea');
    input.className = 'saga-lore-editor-textarea';
    input.value = value || '';
    input.placeholder = 'Make Arlong Pirates titles harsher and more coercive without adding generic biography.';
    label.appendChild(input);
    container.appendChild(label);
    return input;
}

function createLoredeckCreatorTitleRevisionForm(brief = {}, cached = {}, context = {}) {
    const selectedCount = Number.isFinite(Number(context.selectedCount)) ? Number(context.selectedCount) : getLoredeckCreatorSelectedTitleDrafts(cached).length;
    const reviseForm = document.createElement('div');
    reviseForm.className = 'saga-new-lore-form saga-loredeck-creator-revise-form';
    markTourTarget(reviseForm, 'loredecks.creator.titleRevision');
    const reviseInput = createLoredeckCreatorTitleRevisionInput(reviseForm, getLoredeckCreatorTitleRevisionInstruction());
    const reviseActions = document.createElement('div');
    reviseActions.className = 'saga-primary-actions';
    const reviseButton = createButton('Revise Selected Titles', 'Ask the Reasoning Provider to revise only the selected title drafts.', async (btn) => {
        const revisionInstruction = setLoredeckCreatorTitleRevisionInstruction(reviseInput.value.trim());
        const fresh = getLoredeckCreatorBriefCache();
        const draftInputs = getLoredeckCreatorDraftInputs();
        await handleLoredeckCreatorTitleDraft({
            brief: fresh.brief || brief,
            notes: fresh.notes || draftInputs.notes || '',
            revisionInstruction,
            previousTitleDrafts: getLoredeckCreatorTitleDrafts(fresh).map(compactLoredeckCreatorTitleDraftForRevision),
            selectedTitleDrafts: getLoredeckCreatorSelectedTitleDrafts(fresh).map(compactLoredeckCreatorTitleDraftForRevision),
        }, btn);
    });
    reviseButton.dataset.sagaCreatorTitleAction = 'revise-selected';
    reviseButton.disabled = !selectedCount;
    reviseActions.appendChild(markTourTarget(lockLoredeckCreatorGenerationButton(reviseButton, cached, 'title revision'), 'loredecks.creator.reviseSelectedTitles'));
    reviseForm.appendChild(reviseActions);
    appendLoredeckCreatorGenerationStatus(reviseForm, cached, ['title_revision']);
    return reviseForm;
}

function createLoredeckCreatorTitleRow(draft = {}, selected = false, approved = false) {
    const row = document.createElement('div');
    row.className = 'saga-loredeck-entry-row saga-loredeck-creator-title-row';
    row.classList.toggle('saga-loredeck-creator-title-row-selected', selected);
    row.dataset.sagaCreatorTitleId = draft.titleId || '';

    const main = document.createElement('div');
    main.className = 'saga-loredeck-row-main';
    const titleLine = document.createElement('label');
    titleLine.className = 'saga-loredeck-assistant-draft-title saga-loredeck-creator-title-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selected;
    addTooltip(checkbox, selected ? 'Remove this title draft from the current selection.' : 'Add this title draft to the current selection.');
    checkbox.addEventListener('click', event => event.stopPropagation());
    checkbox.addEventListener('change', () => {
        setLoredeckCreatorTitleSelection(draft.titleId, checkbox.checked, { refresh: true });
    });
    titleLine.appendChild(checkbox);
    const title = document.createElement('span');
    title.className = 'saga-loredeck-row-title';
    title.textContent = draft.title || draft.titleId || 'Deck Maker Title Draft';
    titleLine.appendChild(title);
    main.appendChild(titleLine);

    const desc = document.createElement('div');
    desc.className = 'saga-loredeck-row-description';
    desc.textContent = draft.reason || draft.contextHint || 'Future lore-entry title draft.';
    main.appendChild(desc);

    const meta = document.createElement('div');
    meta.className = 'saga-loredeck-row-meta';
    meta.appendChild(createStatusPill(approved ? 'Approved' : 'Draft', approved ? 'Approved for the next Deck Maker stage.' : 'Not approved for the next Deck Maker stage yet.', { tone: approved ? 'success' : 'review', kind: 'status' }));
    if (draft.category) meta.appendChild(createStatusPill(humanizeScopeKey(draft.category), 'Title category.', { tone: 'category', kind: 'metadata' }));
    if (draft.relevance) meta.appendChild(createStatusPill(`Relevance: ${humanizeScopeKey(draft.relevance)}`, 'Expected lore relevance.', { tone: 'relevance', kind: 'metadata' }));
    meta.appendChild(createStatusPill(`Priority ${Number.isFinite(Number(draft.priority)) ? Math.round(Number(draft.priority)) : 50}`, 'Draft priority from 0-100.', { kind: 'metadata' }));
    if (draft.creatorTitleBatchLabel || draft.creatorTitleBatchId) meta.appendChild(createStatusPill(draft.creatorTitleBatchLabel || draft.creatorTitleBatchId, 'Deck Maker title set that produced this draft.', { tone: 'source', kind: 'source', maxChars: 34 }));
    if (draft.contextHint) meta.appendChild(createStatusPill('Context hint', draft.contextHint, { tone: 'info', kind: 'metadata' }));
    if (draft.coverageDimensionIds?.length) meta.appendChild(createStatusPill(`${draft.coverageDimensionIds.length} coverage`, draft.coverageDimensionIds.join(', '), { tone: 'source', kind: 'count' }));
    for (const tag of (draft.tags || []).slice(0, 6)) {
        meta.appendChild(createStatusPill(tag, 'Suggested tag hint.', { tone: 'tag', kind: 'tag', maxChars: 32 }));
    }
    if ((draft.tags || []).length > 6) meta.appendChild(createStatusPill(`+${draft.tags.length - 6} tags`, draft.tags.slice(6).join(', '), { tone: 'muted', kind: 'count' }));
    const qualityChange = {
        preview: {
            rubric: draft.rubric || {},
        },
    };
    appendLoredeckPendingQualityPills(meta, qualityChange);
    main.appendChild(meta);

    const quality = createLoredeckPendingQualityList(qualityChange);
    if (quality) main.appendChild(quality);
    row.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'saga-loredeck-row-actions';
    const approve = createButton(approved ? 'Approved' : 'Approve', 'Approve this title draft for the next Deck Maker stage.', () => {
        approveLoredeckCreatorTitleSelection(new Set([draft.titleId]));
    }, approved ? '' : 'saga-primary-button');
    approve.disabled = approved;
    actions.appendChild(approve);
    actions.appendChild(createButton('Edit JSON', 'Edit this title draft JSON before full entry generation.', () => {
        openLoredeckCreatorTitleJsonEditor(draft);
    }));
    actions.appendChild(createButton('Drop', 'Remove this title draft from the Deck Maker batch.', () => {
        dropLoredeckCreatorTitleSelection(new Set([draft.titleId]));
    }, 'saga-danger-button'));
    row.appendChild(actions);
    return row;
}

function getLoredeckCreatorPlanningRecoverableBatchIds(cached = {}) {
    const pack = cached.generatedPackId ? getLoredeckDefinition(cached.generatedPackId) : null;
    if (!pack?.manifestData) return new Set();
    const queued = getLoredeckCreatorPlanningQueuedBatchIds(cached);
    const accepted = getLoredeckCreatorPlanningAcceptedBatchIds(cached);
    const pending = getLoredeckCreatorPlanningPendingBatchIds(pack);
    return new Set([...queued].filter(id => !accepted.has(id) && !pending.has(id)));
}

function createLoredeckCreatorPlanningBatchPlanner(brief = {}, cached = {}) {
    const rows = getLoredeckCreatorPlanningBatchRows(cached);
    const queuedIds = getLoredeckCreatorPlanningQueuedBatchIds(cached);
    const acceptedIds = getLoredeckCreatorPlanningAcceptedBatchIds(cached);
    const recoverableIds = getLoredeckCreatorPlanningRecoverableBatchIds(cached);
    const nextBatch = getLoredeckCreatorNextPlanningBatch(cached);
    const section = document.createElement('div');
    section.className = 'saga-loredeck-creator-title-batches saga-loredeck-creator-planning-batches';

    const heading = document.createElement('div');
    heading.className = 'saga-loredeck-row-title';
    heading.textContent = 'Context & Tag Plan';
    section.appendChild(heading);

    for (const batch of rows.slice(0, 16)) {
        const queued = queuedIds.has(batch.id);
        const accepted = acceptedIds.has(batch.id);
        const recoverable = batch.approvedTitleCount > 0 && recoverableIds.has(batch.id);
        const isNext = !queued && batch.approvedTitleCount > 0 && nextBatch?.id === batch.id;
        const row = document.createElement('div');
        row.className = 'saga-loredeck-entry-row saga-loredeck-creator-title-batch-row';
        const main = document.createElement('div');
        main.className = 'saga-loredeck-row-main';
        const label = document.createElement('div');
        label.className = 'saga-loredeck-row-title';
        label.textContent = batch.label || batch.id;
        main.appendChild(label);
        const desc = document.createElement('div');
        desc.className = 'saga-loredeck-row-description';
        desc.textContent = batch.summary || batch.contextRole || 'Approved-title set used for Context and Tag planning.';
        main.appendChild(desc);
        const meta = document.createElement('div');
        meta.className = 'saga-loredeck-row-meta';
        const status = accepted ? 'Accepted' : (recoverable ? 'Needs Re-plan' : (queued ? 'Awaiting Review' : (isNext ? 'Next' : 'Waiting')));
        const statusHelp = accepted ? 'Context and Tag proposals for this set were accepted.' : (recoverable ? 'This set has no proposals left to review. Re-plan it to continue.' : (queued ? 'Accept this set\'s proposals in Pending Review to unlock Lorecard drafting.' : (isNext ? 'This is the next Context and Tag set Saga will plan.' : 'Approve and plan earlier title sets before this one.')));
        meta.appendChild(createStatusPill(status, statusHelp, { tone: accepted ? 'success' : (recoverable ? 'warning' : (queued ? 'review' : (isNext ? 'info' : 'muted'))), kind: 'status' }));
        meta.appendChild(createStatusPill(`${batch.approvedTitleCount} approved title${batch.approvedTitleCount === 1 ? '' : 's'}`, 'Approved titles available to this planning batch.', { tone: batch.approvedTitleCount ? 'success' : 'muted', kind: 'count' }));
        if (batch.type) meta.appendChild(createStatusPill(humanizeScopeKey(batch.type), 'Planning batch type.', { tone: 'category', kind: 'metadata' }));
        main.appendChild(meta);
        appendLoredeckCreatorGenerationStatus(main, cached, ['planning_batch_draft'], {
            batchId: batch.id,
            coverageDimensionIds: batch.coverageDimensionIds,
            compact: true,
        });
        row.appendChild(main);

        const actions = document.createElement('div');
        actions.className = 'saga-loredeck-row-actions';
        if (isNext || recoverable) {
            const planButton = createButton(recoverable ? 'Re-plan This Set' : 'Plan This Set', 'Draft Context anchors/windows and tag proposals for this title set.', async (btn) => {
                await handleLoredeckCreatorPlanningDraft({
                    targetPlanningBatch: batch,
                    replan: recoverable,
                }, btn);
            }, 'saga-primary-button');
            actions.appendChild(lockLoredeckCreatorGenerationButton(planButton, cached, 'context/tag plan'));
        } else if (queued || accepted) {
            const doneButton = createButton(accepted ? 'Accepted' : 'Review Pending', statusHelp, null, 'saga-loredeck-creator-done-button');
            doneButton.disabled = true;
            actions.appendChild(doneButton);
        } else {
            actions.appendChild(createStatusPill('Waiting', 'This set unlocks after earlier eligible sets are planned.', { tone: 'muted', kind: 'status' }));
        }
        row.appendChild(actions);
        section.appendChild(row);
    }

    if (rows.length > 16) {
        const more = document.createElement('div');
        more.className = 'saga-runtime-help';
        more.textContent = `Showing 16 of ${rows.length} Context and Tag sets.`;
        section.appendChild(more);
    }
    return section;
}

export function createLoredeckCreatorPlanningCard(brief = {}, cached = {}) {
    const approvedIds = getLoredeckCreatorApprovedTitleIds(cached);
    const approvedTitles = getLoredeckCreatorTitleDrafts(cached)
        .filter(draft => approvedIds.has(draft.titleId));
    const planningBatches = getLoredeckCreatorPlanningBatchRows(cached);
    const queuedBatchIds = getLoredeckCreatorPlanningQueuedBatchIds(cached);
    const eligiblePlanningBatchCount = planningBatches.filter(batch => batch.approvedTitleCount > 0).length;
    const nextPlanningBatch = getLoredeckCreatorNextPlanningBatch(cached);
    const recoverableIds = getLoredeckCreatorPlanningRecoverableBatchIds(cached);
    const recoveryBatch = planningBatches.find(batch => batch.approvedTitleCount > 0 && recoverableIds.has(batch.id));
    const generatedPack = cached.generatedPackId ? getLoredeckDefinition(cached.generatedPackId) : null;
    const pendingPlanningCount = generatedPack ? countLoredeckCreatorPlanningPendingChanges(generatedPack) : 0;
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-creator-brief saga-loredeck-creator-planning';
    markTourTarget(wrap, 'loredecks.creator.planning');
    wrap.dataset.sagaCreatorAnchor = 'context-tags';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Deck Maker Context & Tags';
    wrap.appendChild(title);

    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-entry-summary';
    summary.appendChild(createStatusPill(`${approvedTitles.length} approved title${approvedTitles.length === 1 ? '' : 's'}`, 'Approved title drafts used to infer the Context and Tag planning shape.', { tone: approvedTitles.length ? 'success' : 'muted', kind: 'count' }));
    summary.appendChild(createStatusPill(`${queuedBatchIds.size}/${eligiblePlanningBatchCount} planned`, 'Context and Tag sets drafted from approved title sets.', { tone: queuedBatchIds.size ? 'source' : 'muted', kind: 'count' }));
    summary.appendChild(createStatusPill(generatedPack ? 'Generated shell ready' : 'No shell yet', 'Generated Loredeck shell status.', { tone: generatedPack ? 'success' : 'muted', kind: 'status' }));
    if (generatedPack) summary.appendChild(createStatusPill(generatedPack.packId, 'Generated Loredeck target for Pending Review proposals.', { tone: 'source', kind: 'source', maxChars: 36 }));
    if (pendingPlanningCount) summary.appendChild(createStatusPill(`${pendingPlanningCount} awaiting review`, 'Context and Tag proposals waiting in Pending Review.', { tone: 'review', kind: 'count' }));
    if (cached.planningQueuedCount) summary.appendChild(createStatusPill(`${cached.planningQueuedCount} drafted`, 'Last Deck Maker planning proposal count sent to Pending Review.', { tone: 'review', kind: 'count' }));
    if (cached.planningQuestions?.length) summary.appendChild(createStatusPill(`${cached.planningQuestions.length} question${cached.planningQuestions.length === 1 ? '' : 's'}`, 'Deck Maker needs clarification before Context and Tag planning can proceed.', { tone: 'review', kind: 'count' }));
    wrap.appendChild(summary);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Context anchors/windows and tag definitions are drafted one title set at a time into the Generated Loredeck Pending Review. They do not become accepted registry data until reviewed.';
    wrap.appendChild(help);

    wrap.appendChild(createLoredeckCreatorPlanningBatchPlanner(brief, cached));

    if (cached.planningSummary || cached.planningQuestions?.length) {
        const result = document.createElement('div');
        result.className = 'saga-runtime-help';
        const parts = [];
        if (cached.planningSummary) parts.push(cached.planningSummary);
        if (cached.planningQuestions?.length) parts.push(`Questions: ${cached.planningQuestions.join(' | ')}`);
        result.textContent = parts.join(' ');
        wrap.appendChild(result);
    }

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    markTourTarget(actions, 'loredecks.creator.planningActions');
    const draftButton = createButton(
        nextPlanningBatch ? 'Plan Context and Tags' : (recoveryBatch ? 'Re-plan Context and Tags' : (pendingPlanningCount ? 'Review Context and Tags' : 'Context Plans Complete')),
        nextPlanningBatch
            ? 'Create or reuse the Generated Loredeck shell, then draft Context and Tag proposals for the next approved title set.'
            : (recoveryBatch ? 'Regenerate missing Context and Tag proposals for a previously planned set.' : (pendingPlanningCount ? 'Open the Pending Review section to accept Context and Tag proposals.' : 'Every eligible Context and Tag set has already been planned.')),
        async (btn) => {
            const fresh = getLoredeckCreatorBriefCache();
            const next = getLoredeckCreatorNextPlanningBatch(fresh);
            const recoverable = getLoredeckCreatorPlanningRecoverableBatchIds(fresh);
            const batch = next || getLoredeckCreatorPlanningBatchRows(fresh).find(row => row.approvedTitleCount > 0 && recoverable.has(row.id));
            if (batch) {
                await handleLoredeckCreatorPlanningDraft({
                    targetPlanningBatch: batch,
                    replan: !next,
                }, btn);
                return;
            }
            scrollLoredeckCreatorWorkbenchToAnchor('review-queue');
        },
        'saga-primary-button'
    );
    draftButton.disabled = !nextPlanningBatch && !recoveryBatch && !pendingPlanningCount;
    actions.appendChild(markTourTarget(lockLoredeckCreatorGenerationButton(draftButton, cached, 'context/tag plan'), 'loredecks.creator.planContextTags'));
    if (generatedPack) {
        const inStack = getLoredeckStack(getState()).some(item => item.packId === generatedPack.packId && item.enabled);
        const stackButton = createButton(inStack ? 'In Stack' : 'Add to Stack', 'Add the Generated Loredeck to the current stack when you are ready to test it.', () => {
            if (!inStack) addLoredeckToStack(generatedPack.packId);
        });
        stackButton.disabled = inStack;
        actions.appendChild(stackButton);
    }
    wrap.appendChild(actions);

    if (!approvedTitles.length) {
        wrap.appendChild(createEmptyMessage('Approve title drafts before generating timeline and tag planning proposals.'));
    }
    return wrap;
}

function createLoredeckCreatorEntryDraftBatchRows(cached = {}, progress = null, options = {}) {
    if (!progress || !progress.eligibleBatchCount) return null;
    const canDraftEntries = options.canDraftEntries === true;
    const activeBatchId = String(progress.activeBatchId || '').trim();
    const eligibleBatchIds = progress.eligibleBatchIds instanceof Set ? progress.eligibleBatchIds : new Set();
    const batchModels = getLoredeckCreatorEntryDraftBatchModels({
        batches: getLoredeckCreatorPlanningBatchRows(cached).filter(batch => !eligibleBatchIds.size || eligibleBatchIds.has(batch.id)),
        drafts: Array.isArray(progress.preferred) ? progress.preferred : [],
        remainingDrafts: Array.isArray(progress.totalRemaining) ? progress.totalRemaining : [],
        acceptedTitleIds: progress.acceptedEntryIds,
        pendingTitleIds: progress.pendingEntryIds,
        draftReviewTitleIds: progress.draftReviewEntryIds,
    });
    if (!batchModels.length) return null;

    const section = document.createElement('div');
    section.className = 'saga-loredeck-entry-list saga-loredeck-creator-entry-batch-list';

    const heading = document.createElement('div');
    heading.className = 'saga-loredeck-row-title';
    heading.textContent = 'Draft by Category';
    section.appendChild(heading);

    for (const model of batchModels.slice(0, 12)) {
        const row = document.createElement('div');
        row.className = 'saga-loredeck-entry-row saga-loredeck-creator-entry-batch-row';
        if (activeBatchId && model.id === activeBatchId) row.classList.add('saga-loredeck-creator-entry-batch-row-active');

        const main = document.createElement('div');
        main.className = 'saga-loredeck-row-main';
        const label = document.createElement('div');
        label.className = 'saga-loredeck-row-title';
        label.textContent = model.label || model.id;
        main.appendChild(label);

        const desc = document.createElement('div');
        desc.className = 'saga-loredeck-row-description';
        const nextTitles = model.remainingTitles.slice(0, 3).map(draft => draft.title || draft.titleId).filter(Boolean);
        desc.textContent = nextTitles.length
            ? nextTitles.join(' | ')
            : (model.summary || 'All approved titles in this category are already accepted, pending, or in Draft Review.');
        main.appendChild(desc);

        const meta = document.createElement('div');
        meta.className = 'saga-loredeck-row-meta';
        if (canDraftEntries && activeBatchId && model.id === activeBatchId && model.remainingCount) {
            meta.appendChild(createStatusPill('Next', 'This category is the next default Lorecard drafting set.', { tone: 'info', kind: 'status' }));
        }
        meta.appendChild(createStatusPill(`${model.remainingCount} remaining`, 'Approved titles in this category not yet accepted, pending, or sitting in Draft Review.', { tone: model.remainingCount ? 'warning' : 'success', kind: 'count' }));
        if (model.acceptedCount) meta.appendChild(createStatusPill(`${model.acceptedCount} accepted`, 'Approved titles in this category already accepted as generated Lorecards.', { tone: 'success', kind: 'count' }));
        if (model.pendingCount) meta.appendChild(createStatusPill(`${model.pendingCount} pending`, 'Approved titles in this category already waiting in Pending Review.', { tone: 'review', kind: 'count' }));
        if (model.draftReviewCount) meta.appendChild(createStatusPill(`${model.draftReviewCount} draft review`, 'Approved titles in this category already sitting in Deck Maker Draft Review.', { tone: 'review', kind: 'count' }));
        if (model.handledOtherCount) meta.appendChild(createStatusPill(`${model.handledOtherCount} covered`, 'Approved titles in this category already accounted for by Deck Maker progress.', { tone: 'review', kind: 'count' }));
        meta.appendChild(createStatusPill(`${model.approvedCount} approved`, 'Approved Deck Maker titles in this category.', { tone: 'success', kind: 'count' }));
        if (!model.remainingCount) meta.appendChild(createStatusPill('Covered', 'Every approved title in this category is accepted, pending, or sitting in Draft Review.', { tone: 'success', kind: 'status' }));
        main.appendChild(meta);
        appendLoredeckCreatorGenerationStatus(main, cached, ['entry_batch_draft', 'entry_multi_batch_draft'], {
            batchId: model.id,
            compact: true,
        });
        row.appendChild(main);

        const actions = document.createElement('div');
        actions.className = 'saga-loredeck-row-actions';
        const batchSize = Math.max(1, Number(progress?.batchSize) || 1);
        const batchCount = Math.max(1, Math.ceil((Number(model.remainingCount) || 0) / batchSize));
        const draftSet = createButton('Draft Set', `Draft all remaining Lorecards for ${model.label || model.id} in ${batchCount} model call${batchCount === 1 ? '' : 's'}.`, async (btn) => {
            if (batchCount > 1) {
                const confirmed = await confirmAction('Draft Category Set', `Saga will make up to ${batchCount} separate Reasoning Provider call${batchCount === 1 ? '' : 's'} for ${model.label || model.id}, with at most ${batchSize} Lorecards per call. Continue?`);
                if (!confirmed) return;
            }
            await handleLoredeckCreatorEntryDraft(btn, { targetPlanningBatchId: model.id, maxBatches: batchCount, bypassRunLimit: true });
        }, model.remainingCount ? 'saga-primary-button' : '');
        draftSet.disabled = !canDraftEntries || !model.remainingCount;
        actions.appendChild(lockLoredeckCreatorGenerationButton(draftSet, cached, `Lorecard batch draft: ${model.label || model.id}`));
        row.appendChild(actions);
        section.appendChild(row);
    }

    if (batchModels.length > 12) {
        const more = document.createElement('div');
        more.className = 'saga-runtime-help';
        more.textContent = `Showing 12 of ${batchModels.length} Lorecard categories.`;
        section.appendChild(more);
    }
    return section;
}

function formatLoredeckCreatorRejectionReason(value = '') {
    const text = String(value || '').trim();
    return text ? humanizeScopeKey(text) : 'Schema guard rejected';
}

function createLoredeckCreatorEntryRejectionDiagnosticsPanel(cached = {}) {
    const summary = cached.entryDraftLastRejectionSummary && typeof cached.entryDraftLastRejectionSummary === 'object' && !Array.isArray(cached.entryDraftLastRejectionSummary)
        ? cached.entryDraftLastRejectionSummary
        : {};
    const diagnostics = Array.isArray(cached.entryDraftLastRejectionDiagnostics)
        ? cached.entryDraftLastRejectionDiagnostics.filter(item => item && typeof item === 'object' && !Array.isArray(item))
        : [];
    const rejectedCount = Math.max(0, Number(cached.entryDraftLastRejectedCount || summary.count || diagnostics.length) || 0);
    if (!rejectedCount && !diagnostics.length) return null;

    const details = document.createElement('details');
    details.className = 'saga-loredeck-creator-rejection-diagnostics saga-loredeck-creator-review-note';
    const header = document.createElement('summary');
    header.textContent = 'Last Lorecard rejection details';
    details.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'saga-loredeck-entry-summary';
    meta.appendChild(createStatusPill(`${rejectedCount} rejected`, 'Generated Lorecard drafts Saga rejected before Draft Review.', { tone: 'warning', kind: 'count' }));
    const targetCount = Math.max(0, Number(summary.targetCount || cached.entryDraftLastRejectedTargetIds?.length) || 0);
    if (targetCount) meta.appendChild(createStatusPill(`${targetCount} title${targetCount === 1 ? '' : 's'}`, 'Affected Deck Maker title targets.', { tone: 'warning', kind: 'count' }));
    const unknownTags = Array.isArray(summary.unknownTags) ? summary.unknownTags.filter(Boolean) : [];
    const unknownAnchors = Array.isArray(summary.unknownAnchors) ? summary.unknownAnchors.filter(Boolean) : [];
    if (unknownTags.length) meta.appendChild(createStatusPill(`${unknownTags.length} unknown tag${unknownTags.length === 1 ? '' : 's'}`, 'Tag IDs the generated draft referenced but the accepted registry does not contain.', { tone: 'warning', kind: 'count' }));
    if (unknownAnchors.length) meta.appendChild(createStatusPill(`${unknownAnchors.length} unknown anchor${unknownAnchors.length === 1 ? '' : 's'}`, 'Timeline IDs the generated draft referenced but the accepted registry does not contain.', { tone: 'warning', kind: 'count' }));
    details.appendChild(meta);

    const byReason = summary.byReason && typeof summary.byReason === 'object' && !Array.isArray(summary.byReason) ? summary.byReason : {};
    const reasonRows = Object.entries(byReason)
        .filter(([, count]) => Number(count) > 0)
        .slice(0, 8);
    if (reasonRows.length) {
        const reason = document.createElement('div');
        reason.className = 'saga-runtime-help';
        reason.textContent = `Reasons: ${reasonRows.map(([code, count]) => `${formatLoredeckCreatorRejectionReason(code)} (${count})`).join(', ')}.`;
        details.appendChild(reason);
    }

    const targetIds = Array.isArray(summary.targetEntryIds) && summary.targetEntryIds.length
        ? summary.targetEntryIds
        : (Array.isArray(cached.entryDraftLastRejectedTargetIds) ? cached.entryDraftLastRejectedTargetIds : []);
    if (targetIds.length) {
        const target = document.createElement('div');
        target.className = 'saga-runtime-help';
        target.textContent = `Affected: ${targetIds.slice(0, 12).join(', ')}${targetIds.length > 12 ? ` and ${targetIds.length - 12} more` : ''}.`;
        details.appendChild(target);
    }
    if (unknownTags.length || unknownAnchors.length) {
        const refs = document.createElement('div');
        refs.className = 'saga-runtime-help';
        const parts = [];
        if (unknownTags.length) parts.push(`Unknown tags: ${unknownTags.slice(0, 12).join(', ')}`);
        if (unknownAnchors.length) parts.push(`Unknown anchors: ${unknownAnchors.slice(0, 12).join(', ')}`);
        refs.textContent = parts.join('. ');
        details.appendChild(refs);
    }
    for (const diagnostic of diagnostics.slice(0, 8)) {
        const item = document.createElement('div');
        item.className = 'saga-runtime-help';
        const label = diagnostic.title || diagnostic.targetEntryId || diagnostic.targetTitleId || 'Lorecard draft';
        const reason = formatLoredeckCreatorRejectionReason(diagnostic.reasonCode);
        item.textContent = `${label}: ${reason}${diagnostic.message ? ` - ${diagnostic.message}` : ''}`;
        details.appendChild(item);
    }
    return details;
}

function createLoredeckCreatorEntryPreflightPanel(cached = {}) {
    const summary = cached.entryDraftLastPreflightSummary && typeof cached.entryDraftLastPreflightSummary === 'object' && !Array.isArray(cached.entryDraftLastPreflightSummary)
        ? cached.entryDraftLastPreflightSummary
        : {};
    const diagnostics = Array.isArray(cached.entryDraftLastPreflightDiagnostics)
        ? cached.entryDraftLastPreflightDiagnostics.filter(item => item && typeof item === 'object' && !Array.isArray(item))
        : [];
    const gapCount = Math.max(0, Number(summary.planningGapCount || diagnostics.length) || 0);
    if (!gapCount && !diagnostics.length) return null;

    const details = document.createElement('details');
    details.className = 'saga-loredeck-creator-preflight-diagnostics saga-loredeck-creator-review-note';
    const header = document.createElement('summary');
    header.textContent = 'Last Lorecard preflight gaps';
    details.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'saga-loredeck-entry-summary';
    meta.appendChild(createStatusPill(`${gapCount} gap${gapCount === 1 ? '' : 's'}`, 'Title references Saga omitted before asking for Lorecard drafts.', { tone: 'warning', kind: 'count' }));
    const targetCount = Math.max(0, Number(summary.targetCount) || 0);
    if (targetCount) meta.appendChild(createStatusPill(`${targetCount} target${targetCount === 1 ? '' : 's'}`, 'Deck Maker title targets checked before this Lorecard call.', { tone: 'info', kind: 'count' }));
    const omittedTags = Math.max(0, Number(summary.omittedTagCount) || 0);
    const ambiguousTags = Math.max(0, Number(summary.ambiguousTagCount) || 0);
    const omittedAnchors = Math.max(0, Number(summary.omittedAnchorCount) || 0);
    const omittedWindows = Math.max(0, Number(summary.omittedWindowCount) || 0);
    if (omittedTags) meta.appendChild(createStatusPill(`${omittedTags} omitted tag${omittedTags === 1 ? '' : 's'}`, 'Title-stage tag IDs missing from the accepted tag registry.', { tone: 'warning', kind: 'count' }));
    if (ambiguousTags) meta.appendChild(createStatusPill(`${ambiguousTags} ambiguous tag${ambiguousTags === 1 ? '' : 's'}`, 'Title-stage tags with multiple accepted compact matches.', { tone: 'warning', kind: 'count' }));
    if (omittedAnchors) meta.appendChild(createStatusPill(`${omittedAnchors} omitted anchor${omittedAnchors === 1 ? '' : 's'}`, 'Title-stage anchor IDs missing from the accepted timeline registry.', { tone: 'warning', kind: 'count' }));
    if (omittedWindows) meta.appendChild(createStatusPill(`${omittedWindows} omitted window${omittedWindows === 1 ? '' : 's'}`, 'Title-stage window IDs missing from the accepted timeline registry.', { tone: 'warning', kind: 'count' }));
    details.appendChild(meta);

    const targetIds = [...new Set(diagnostics.map(item => item.targetEntryId || item.targetTitleId).filter(Boolean))];
    if (targetIds.length) {
        const affected = document.createElement('div');
        affected.className = 'saga-runtime-help';
        affected.textContent = `Affected: ${targetIds.slice(0, 12).join(', ')}${targetIds.length > 12 ? ` and ${targetIds.length - 12} more` : ''}.`;
        details.appendChild(affected);
    }
    const unknownTags = [...new Set(diagnostics.flatMap(item => Array.isArray(item.unknownTags) ? item.unknownTags : []).filter(Boolean))];
    const unknownAnchors = [...new Set(diagnostics.flatMap(item => Array.isArray(item.unknownAnchors) ? item.unknownAnchors : []).filter(Boolean))];
    if (unknownTags.length || unknownAnchors.length) {
        const refs = document.createElement('div');
        refs.className = 'saga-runtime-help';
        const parts = [];
        if (unknownTags.length) parts.push(`Omitted tags: ${unknownTags.slice(0, 12).join(', ')}`);
        if (unknownAnchors.length) parts.push(`Omitted timeline IDs: ${unknownAnchors.slice(0, 12).join(', ')}`);
        refs.textContent = parts.join('. ');
        details.appendChild(refs);
    }
    for (const diagnostic of diagnostics.slice(0, 8)) {
        const item = document.createElement('div');
        item.className = 'saga-runtime-help';
        const label = diagnostic.title || diagnostic.targetEntryId || diagnostic.targetTitleId || 'Lorecard target';
        const reason = formatLoredeckCreatorRejectionReason(diagnostic.reasonCode);
        item.textContent = `${label}: ${reason}${diagnostic.message ? ` - ${diagnostic.message}` : ''}`;
        details.appendChild(item);
    }
    return details;
}

export function createLoredeckCreatorEntryDraftCard(brief = {}, cached = {}) {
    const generationSettings = getLoredeckCreatorGenerationSettings(cached);
    const generatedPack = cached.generatedPackId ? getLoredeckDefinition(cached.generatedPackId) : null;
    const planning = getLoredeckCreatorAcceptedPlanningStatus(generatedPack);
    const acceptedPlanningBatchIds = getLoredeckCreatorPlanningAcceptedBatchIds(cached);
    const queuedPlanningBatchIds = getLoredeckCreatorPlanningQueuedBatchIds(cached);
    const approvedIds = getLoredeckCreatorApprovedTitleIds(cached);
    const approvedTitles = getLoredeckCreatorTitleDrafts(cached)
        .filter(draft => approvedIds.has(draft.titleId));
    const draftChanges = generatedPack ? getLoredeckCreatorDraftChanges(generatedPack.packId) : [];
    const hasDraftsAwaitingReview = draftChanges.length > 0;
    const pendingCount = generatedPack ? getLoredeckCreatorPendingEntryCount(generatedPack) : 0;
    const entryCount = generatedPack ? getLoredeckCreatorAcceptedEntryCount(generatedPack) : 0;
    const progress = generatedPack ? getLoredeckCreatorEntryDraftProgress(cached, generatedPack) : null;
    const targetTitles = generatedPack ? getLoredeckCreatorEntryTargetTitles(cached, generatedPack) : [];
    const canDraftEntries = !!generatedPack && planning.ready && !!targetTitles.length;
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-creator-brief saga-loredeck-creator-entry-drafts';
    markTourTarget(wrap, 'loredecks.creator.entries');
    wrap.dataset.sagaCreatorAnchor = 'lorecards';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Deck Maker Lorecard Drafts';
    wrap.appendChild(title);

    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-entry-summary';
    summary.appendChild(createStatusPill(`${approvedTitles.length} approved title${approvedTitles.length === 1 ? '' : 's'}`, 'Approved title drafts available for schema v3 entry generation.', { tone: approvedTitles.length ? 'success' : 'muted', kind: 'count' }));
    summary.appendChild(createStatusPill(`${acceptedPlanningBatchIds.size}/${queuedPlanningBatchIds.size || acceptedPlanningBatchIds.size} Context sets accepted`, 'Deck Maker Context and Tag sets accepted into the Generated Loredeck registry.', { tone: acceptedPlanningBatchIds.size ? 'source' : 'muted', kind: 'count' }));
    summary.appendChild(createStatusPill(`${planning.anchorCount + planning.windowCount} timeline`, 'Accepted timeline anchors/windows on the Generated Loredeck.', { tone: 'source', kind: 'count' }));
    summary.appendChild(createStatusPill(`${planning.tagCount} tags`, 'Accepted tag definitions on the Generated Loredeck.', { tone: 'tag', kind: 'count' }));
    if (progress) {
        summary.appendChild(createStatusPill(`${progress.remainingCount} remaining`, 'Approved titles not yet accepted, pending, or sitting in the Deck Maker draft batch.', { tone: progress.remainingCount ? 'warning' : 'muted', kind: 'count' }));
        if (progress.activeBatchLabel) summary.appendChild(createStatusPill(`Set: ${progress.activeBatchLabel}`, 'Accepted Context and Tag set used for the next Lorecard micro-batch.', { tone: 'source', kind: 'source', maxChars: 36 }));
        summary.appendChild(createStatusPill(`${progress.batchSize}/call`, 'Maximum Lorecards Saga asks the model to draft in one Deck Maker call.', { kind: 'metadata' }));
    }
    if (draftChanges.length) summary.appendChild(createStatusPill(`${draftChanges.length} awaiting review`, 'Generated Lorecard drafts waiting for edit-before-review.', { tone: 'review', kind: 'count' }));
    const lastRejectedCount = Math.max(0, Number(cached.entryDraftLastRejectedCount) || 0);
    const lastQueuedCount = Math.max(0, Number(cached.entryDraftLastBatchCount) || 0);
    if (lastRejectedCount) {
        summary.appendChild(createStatusPill(`${lastRejectedCount} rejected last run`, 'Saga rejected these generated Lorecard drafts before Draft Review, usually because schema references were invalid.', { tone: 'warning', kind: 'count' }));
    }
    const lastPreflightGapCount = Math.max(0, Number(cached.entryDraftLastPreflightSummary?.planningGapCount) || 0);
    if (lastPreflightGapCount) {
        summary.appendChild(createStatusPill(`${lastPreflightGapCount} preflight gap${lastPreflightGapCount === 1 ? '' : 's'}`, 'Saga omitted missing or ambiguous title-stage references before drafting Lorecards.', { tone: 'warning', kind: 'count' }));
    }
    if (pendingCount) summary.appendChild(createStatusPill(`${pendingCount} pending`, 'Entry proposals already queued into Pending Review.', { tone: 'review', kind: 'count' }));
    if (entryCount) summary.appendChild(createStatusPill(`${entryCount} accepted`, 'Accepted generated Lorecards in this Generated Loredeck.', { tone: 'success', kind: 'count' }));
    wrap.appendChild(summary);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Lorecard drafts run in small resumable batches. Each model call receives only titles from one accepted Context and Tag set, then drafts enter review before Pending Review and acceptance.';
    wrap.appendChild(help);

    const lastWarnings = Array.isArray(cached.entryDraftWarnings)
        ? cached.entryDraftWarnings.map(item => String(item || '').trim()).filter(Boolean).slice(0, 3)
        : [];
    if (lastQueuedCount || lastRejectedCount || lastWarnings.length) {
        const lastPass = document.createElement('div');
        lastPass.className = 'saga-runtime-help saga-loredeck-creator-review-note';
        const parts = [];
        if (lastQueuedCount) parts.push(`Queued ${lastQueuedCount} draft${lastQueuedCount === 1 ? '' : 's'} to Draft Review.`);
        if (lastRejectedCount) {
            const rejectedIds = Array.isArray(cached.entryDraftLastRejectedTargetIds)
                ? cached.entryDraftLastRejectedTargetIds.map(id => String(id || '').trim()).filter(Boolean).slice(0, 4)
                : [];
            parts.push(`Rejected ${lastRejectedCount} draft${lastRejectedCount === 1 ? '' : 's'} before Draft Review${rejectedIds.length ? `: ${rejectedIds.join(', ')}` : ''}.`);
        }
        if (lastWarnings.length) parts.push(lastWarnings.join(' '));
        lastPass.textContent = `Last Lorecard pass: ${parts.join(' ')}`;
        wrap.appendChild(lastPass);
    }
    const preflightDiagnostics = createLoredeckCreatorEntryPreflightPanel(cached);
    if (preflightDiagnostics) wrap.appendChild(preflightDiagnostics);
    const rejectionDiagnostics = createLoredeckCreatorEntryRejectionDiagnosticsPanel(cached);
    if (rejectionDiagnostics) wrap.appendChild(rejectionDiagnostics);

    if (hasDraftsAwaitingReview) {
        const reviewHelp = document.createElement('div');
        reviewHelp.className = 'saga-runtime-help saga-loredeck-creator-review-note';
        reviewHelp.textContent = 'Current Lorecard drafts can stay here while you draft more batches. Send useful drafts to Pending Review, edit or revise them, or drop the ones that do not fit.';
        wrap.appendChild(reviewHelp);
    }

    if (cached.entryDraftSummary || cached.entryDraftQuestions?.length) {
        const result = document.createElement('div');
        result.className = 'saga-runtime-help';
        const parts = [];
        if (cached.entryDraftSummary) parts.push(cached.entryDraftSummary);
        if (cached.entryDraftQuestions?.length) parts.push(`Questions: ${cached.entryDraftQuestions.join(' | ')}`);
        result.textContent = parts.join(' ');
        wrap.appendChild(result);
    }

    const batchRows = createLoredeckCreatorEntryDraftBatchRows(cached, progress, { canDraftEntries });
    if (batchRows) wrap.appendChild(batchRows);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    markTourTarget(actions, 'loredecks.creator.entryActions');
    const draftButton = createButton('Draft Lorecards', 'Generate the next small schema v3 Lorecard set for approved titles that are not accepted, pending, or already drafted.', async (btn) => {
        await handleLoredeckCreatorEntryDraft(btn);
    }, 'saga-primary-button');
    draftButton.disabled = !canDraftEntries;
    actions.appendChild(markTourTarget(lockLoredeckCreatorGenerationButton(draftButton, cached, 'Lorecard batch draft'), 'loredecks.creator.draftLorecards'));

    const entryBatchSize = Number.isFinite(Number(generationSettings.entryBatchSize))
        ? Number(generationSettings.entryBatchSize)
        : 1;
    const multiBatchButton = createButton('Auto-Draft All', 'Draft every remaining approved title that is not accepted, pending, or in Draft Review.', async (btn) => {
        const freshPack = cached.generatedPackId ? getFreshLoredeckLibraryPack(cached.generatedPackId, generatedPack) : null;
        const freshCache = getLoredeckCreatorBriefCache();
        const freshSettings = getLoredeckCreatorGenerationSettings(freshCache);
        const freshProgress = freshPack ? getLoredeckCreatorEntryDraftProgress(freshCache, freshPack) : null;
        const freshBatchSize = Number.isFinite(Number(freshSettings.entryBatchSize)) ? Number(freshSettings.entryBatchSize) : entryBatchSize;
        const remainingCount = Math.max(0, Number(freshProgress?.remainingCount) || 0);
        const callCount = Math.max(0, Number(freshProgress?.batchCount) || 0);
        if (!remainingCount || !callCount) return;
        const confirmed = await confirmAction(
            'Auto-Draft All Lorecards?',
            `Are you sure you want to auto-generate ${remainingCount} Lorecard${remainingCount === 1 ? '' : 's'}? Saga will make up to ${callCount} separate Reasoning Provider call${callCount === 1 ? '' : 's'}, with at most ${freshBatchSize} Lorecards per call. Existing Deck Maker Lorecard Draft Review items will stay available while Saga drafts every remaining pending title.`,
            {
                confirmLabel: `Auto-Draft ${remainingCount} Lorecard${remainingCount === 1 ? '' : 's'}`,
                confirmTooltip: `Auto-generate ${remainingCount} remaining Deck Maker Lorecard${remainingCount === 1 ? '' : 's'}.`,
            }
        );
        if (!confirmed) return;
        await handleLoredeckCreatorEntryDraft(btn, { maxBatches: callCount, bypassRunLimit: true });
    });
    multiBatchButton.disabled = !canDraftEntries || (progress?.remainingCount || 0) <= 0;
    actions.appendChild(markTourTarget(lockLoredeckCreatorGenerationButton(multiBatchButton, cached, 'Lorecard batch draft'), 'loredecks.creator.autoDraftAll'));
    wrap.appendChild(actions);
    appendLoredeckCreatorGenerationStatus(wrap, cached, ['entry_batch_draft', 'entry_multi_batch_draft']);

    if (!generatedPack) {
        wrap.appendChild(createEmptyMessage('Plan and accept Context and Tag proposals to create the Generated Loredeck shell before drafting Lorecards.'));
        return wrap;
    }

    if (draftChanges.length) {
        const draftBatch = createLoredeckCreatorDraftReviewSection(generatedPack);
        if (draftBatch) wrap.appendChild(draftBatch);
    }

    if (!planning.ready) {
        wrap.appendChild(createEmptyMessage('Accept Context and Tag planning proposals before drafting full Lorecards.'));
        return wrap;
    }
    if (!progress?.eligibleBatchCount) {
        wrap.appendChild(createEmptyMessage('Accept at least one planned Context and Tag set before drafting full Lorecards.'));
        return wrap;
    }
    if (!targetTitles.length && !draftChanges.length) {
        wrap.appendChild(createEmptyMessage('No undrafted approved titles remain. Approve more titles or review existing Lorecard drafts.'));
    }
    if (targetTitles.length) {
        const next = document.createElement('div');
        next.className = 'saga-runtime-help';
        next.textContent = `Next batch: ${targetTitles.map(draft => draft.title || draft.titleId).join(' | ')}`;
        wrap.appendChild(next);
    }
    return wrap;
}

export function createLoredeckCreatorPendingReviewCard(cached = {}, pipeline = {}) {
    const pack = pipeline.generatedPack || (cached.generatedPackId ? getLoredeckDefinition(cached.generatedPackId) : null);
    if (!pack) return null;
    const card = createLoredeckPendingReviewCard(pack);
    if (!card) return null;
    card.classList.add('saga-loredeck-creator-pending-review');
    markTourTarget(card, 'loredecks.creator.review');
    card.dataset.sagaCreatorAnchor = 'review-queue';
    if (pipeline.pendingPlanningCount) {
        const note = document.createElement('div');
        note.className = 'saga-runtime-help';
        note.textContent = 'Next step: review and accept these Context and Tag proposals. Accepted planning metadata unlocks Lorecard drafting.';
        const insertBefore = card.children[2] || null;
        card.insertBefore(note, insertBefore);
    }
    return card;
}

function appendLoredeckCreatorReadinessItems(container, blockers = [], warnings = []) {
    if (!blockers.length && !warnings.length) return;
    const list = document.createElement('div');
    list.className = 'saga-loredeck-generated-readiness-list';
    for (const blocker of blockers) {
        const item = document.createElement('div');
        item.className = 'saga-loredeck-generated-readiness-item saga-loredeck-generated-readiness-blocker';
        item.textContent = blocker;
        list.appendChild(item);
    }
    for (const warning of warnings) {
        const item = document.createElement('div');
        item.className = 'saga-loredeck-generated-readiness-item saga-loredeck-generated-readiness-warning';
        item.textContent = warning;
        list.appendChild(item);
    }
    container.appendChild(list);
}

function getLoredeckCreatorReadinessHealthTone(readiness = {}) {
    if (readiness.healthHasErrors || Number(readiness.healthErrorCount) > 0) return 'danger';
    if (!readiness.healthScanned || readiness.healthIsStale) return 'warning';
    if (readiness.healthNeedsReview || Number(readiness.healthWarningCount) > 0) return 'warning';
    return 'success';
}

function getLoredeckCreatorReadinessHealthSummary(readiness = {}) {
    if (readiness.healthSummary) return readiness.healthSummary;
    if (!readiness.healthScanned) return 'Pack Health: Not scanned';
    const errors = Number(readiness.healthErrorCount) || 0;
    const warnings = Number(readiness.healthWarningCount) || 0;
    return `Pack Health: ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`;
}

function getLoredeckCreatorReadinessHealthTab(readiness = {}) {
    const hasIssueState = readiness.healthHasErrors
        || readiness.healthNeedsReview
        || Number(readiness.healthErrorCount) > 0
        || Number(readiness.healthWarningCount) > 0;
    return hasIssueState ? 'issues' : 'overview';
}

function getLoredeckCreatorReadinessIssueCount(readiness = {}) {
    const explicit = (Number(readiness.healthErrorCount) || 0) + (Number(readiness.healthWarningCount) || 0);
    if (explicit > 0) return explicit;
    return (readiness.healthHasErrors || readiness.healthNeedsReview) ? 1 : 0;
}

function createLoredeckCreatorReadinessHealthActions(pack = {}, readiness = {}) {
    if (!pack?.packId) return null;
    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    markTourTarget(actions, 'loredecks.creator.readinessHealthActions');
    const runButton = createButton('Run Pack Health', 'Refresh Pack Health for this Generated Loredeck.', async (btn) => {
        await validateLoredeckForEditor(pack, btn);
        refreshRuntimePanelBody({ preserveScroll: true, preserveWindowScroll: true });
        queueLoredeckCreatorWorkbenchRefresh();
        refreshRuntimeHeader();
    }, 'saga-primary-button');
    actions.appendChild(markTourTarget(runButton, 'loredecks.creator.runPackHealth'));
    actions.appendChild(markTourTarget(createButton('Open Pack Health Center', 'Open Pack Health issues for this Generated Loredeck.', () => {
        openLoredeckHealthCenter(pack.packId, { tab: getLoredeckCreatorReadinessHealthTab(readiness) });
    }), 'loredecks.creator.openPackHealthCenter'));
    const issueCount = getLoredeckCreatorReadinessIssueCount(readiness);
    if (issueCount > 0 && pack.type !== 'bundled') {
        actions.appendChild(markTourTarget(createButton('Attempt Fixing', 'Apply deterministic fixes and save remaining model or review work for this Generated Loredeck.', async (btn) => {
            await attemptLoredeckHealthFixes(pack, btn);
            refreshRuntimePanelBody({ preserveScroll: true, preserveWindowScroll: true });
            queueLoredeckCreatorWorkbenchRefresh();
            refreshRuntimeHeader();
        }), 'loredecks.creator.attemptHealthFixing'));
    }
    return actions;
}

export function createLoredeckCreatorPipelineReadinessCard(pack = {}, cached = null, renderModel = null) {
    const view = getLoredeckCreatorPipelineReadinessView(pack, cached, renderModel);
    if (!view) return null;
    const readiness = view.readiness || {};
    const pipeline = view.pipeline || readiness.pipeline || {};
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-creator-brief saga-loredeck-generated-readiness saga-loredeck-creator-pipeline-readiness';
    markTourTarget(wrap, 'loredecks.creator.readiness');
    wrap.dataset.sagaCreatorAnchor = 'finalize';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Deck Maker Readiness Gate';
    wrap.appendChild(title);

    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-entry-summary';
    summary.appendChild(createStatusPill(readiness.ready ? 'Finalize ready' : 'Needs review', 'Generated Loredeck finalization gate after staged Deck Maker review.', { tone: readiness.ready ? 'success' : 'review', kind: 'status' }));
    summary.appendChild(createStatusPill(pipeline.statusLabel || 'Pipeline check', 'Deck Maker pipeline completeness based on the persisted staged job.', { tone: readiness.ready ? 'success' : 'warning', kind: 'status' }));
    summary.appendChild(createStatusPill(`${pipeline.titleBatchDraftedCount || 0}/${pipeline.titleBatchCount || 0} title sets`, 'Title sets drafted from the approved Story Outline.', { kind: 'count' }));
    summary.appendChild(createStatusPill(`${pipeline.acceptedPlanningBatchCount || 0}/${pipeline.eligiblePlanningBatchCount || 0} Context sets accepted`, 'Context and Tag sets accepted from Pending Review into the Generated Loredeck.', { tone: 'source', kind: 'count' }));
    summary.appendChild(createStatusPill(`${pipeline.approvedTitleAcceptedCount || 0}/${pipeline.approvedTitleCount || 0} titles accepted`, 'Approved title plan covered by accepted generated Lorecards.', { tone: 'success', kind: 'count' }));
    summary.appendChild(createStatusPill(getLoredeckCreatorReadinessHealthSummary(readiness), 'Latest Pack Health status for this Generated Loredeck.', { tone: getLoredeckCreatorReadinessHealthTone(readiness), kind: Number(readiness.healthErrorCount) > 0 ? 'severity' : 'status' }));
    if (pipeline.coverage?.available) {
        summary.appendChild(createStatusPill(`Coverage: ${pipeline.coverage.statusLabel || 'Review'}`, 'Adaptive coverage status from the Deck Maker plan. This is advisory and does not enforce a fixed Lorecard count.', { tone: pipeline.coverage.ready ? 'success' : 'warning', kind: 'severity' }));
        if (pipeline.coverage.finalizeAcknowledged) {
            summary.appendChild(createStatusPill('Coverage acknowledged', 'The current missing/thin coverage state was explicitly accepted for finalization.', { tone: 'success', kind: 'status' }));
        }
    }
    if (pipeline.remainingEntryCount) summary.appendChild(createStatusPill(`${pipeline.remainingEntryCount} remaining`, 'Approved titles still available for Deck Maker entry drafting.', { tone: 'warning', kind: 'count' }));
    wrap.appendChild(summary);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = readiness.ready
        ? 'This Generated Loredeck has no unresolved draft or Pending Review state. Warnings may still describe intentionally partial Deck Maker coverage.'
        : 'Resolve the blockers below before finalizing this Generated Loredeck as Custom.';
    wrap.appendChild(help);

    appendLoredeckCreatorReadinessItems(wrap, readiness.blockers, readiness.warnings);
    const healthActions = createLoredeckCreatorReadinessHealthActions(pack, readiness);
    if (healthActions) wrap.appendChild(healthActions);
    if (pipeline.coverage?.finalizeAcknowledgementRequired) {
        const actions = document.createElement('div');
        actions.className = 'saga-primary-actions';
        markTourTarget(actions, 'loredecks.creator.finalizeActions');
        actions.appendChild(markTourTarget(createButton('Open Coverage Plan', 'Review and expand missing or thin Deck Maker Coverage rows before finalization.', () => {
            scrollLoredeckCreatorWorkbenchToAnchor('coverage-plan');
        }, 'saga-primary-button'), 'loredecks.creator.openCoveragePlan'));
        actions.appendChild(markTourTarget(createButton('Finalize Anyway', 'Record that this scope is intentionally light despite unresolved Deck Maker Coverage rows.', async (btn) => {
            btn.disabled = true;
            try {
                await acknowledgeLoredeckCreatorCoverageForFinalize();
            } finally {
                btn.disabled = false;
            }
        }, 'saga-primary-button'), 'loredecks.creator.finalizeAnyway'));
        wrap.appendChild(actions);
    }
    return wrap;
}

function getLoredeckCreatorCurrentTaskTitle(cached = {}, pipeline = {}) {
    if (pipeline.activeGeneration) return pipeline.activeGeneration.label || 'Generation running';
    const step = pipeline.currentStep || {};
    if (step.id === 'scope') return cached.brief && !cached.approved ? 'Review the Scope Brief' : 'Draft the Scope Brief';
    if (step.id === 'outline') return pipeline.outline && !cached.outlineApproved ? 'Review the Story Outline' : 'Draft the Story Outline';
    if (step.id === 'titles') return pipeline.approvedTitles?.length ? 'Approve More Titles or Continue' : 'Generate the Title Pass';
    if (step.id === 'context') return pipeline.plannedSetCount > pipeline.acceptedPlanningSetCount ? 'Review Context and Tag Proposals' : 'Plan Context and Tags';
    if (step.id === 'lorecards') {
        const remainingEntryCount = Math.max(0, Number(pipeline.remainingEntryCount) || 0);
        if (remainingEntryCount > 0) return pipeline.draftChanges?.length ? 'Draft More Lorecards' : 'Draft Lorecards';
        return pipeline.draftChanges?.length ? 'Review Lorecard Drafts' : 'Draft Lorecards';
    }
    if (step.id === 'review') return 'Clear the Review Queue';
    if (step.id === 'health') return 'Run Pack Health';
    if (step.id === 'finalize') return pipeline.readiness?.coverageAcknowledgementRequired ? 'Acknowledge Deck Maker Coverage' : 'Finalize as Custom Loredeck';
    return 'Continue the Deck Maker Pipeline';
}

function getLoredeckCreatorCurrentTaskDescription(cached = {}, pipeline = {}) {
    if (pipeline.activeGeneration) return 'Saga is waiting on the Reasoning Provider. Cached batches already completed by earlier calls remain preserved.';
    const step = pipeline.currentStep || {};
    if (step.id === 'scope') return cached.brief && !cached.approved
        ? 'Confirm the deck ID, coverage, and assumptions before Saga uses them as the source of truth.'
        : 'Define the fandom, scope, granularity, and assumptions before any large generation call.';
    if (step.id === 'outline') return pipeline.outline && !cached.outlineApproved
        ? 'Approve the story beats, Context milestones, and title-batch slices before title generation.'
        : 'Saga will generate major story beats, high-value Context milestones, and title-batch slices.';
    if (step.id === 'titles') return 'Review generated title rows for scene pressure, entities, and Context gates before approving selected titles.';
    if (step.id === 'context') return 'Accept selected timeline anchors, windows, and tags into the Generated Loredeck before drafting Lorecards.';
    if (step.id === 'lorecards') return 'Draft small Lorecard batches, then edit, repair, drop, or send them to Pending Review.';
    if (step.id === 'review') return 'Pending changes are not runtime-active. Accept or reject them before Pack Health and finalization.';
    if (step.id === 'health') return 'Validate accepted data and fix blockers before this Generated Loredeck can become a Custom Loredeck.';
    if (step.id === 'finalize') return pipeline.readiness?.coverageAcknowledgementRequired
        ? 'Expand missing/thin Deck Maker Coverage or explicitly accept the current scope as intentionally light before finalization.'
        : 'Create a normal editable Custom Loredeck from the reviewed Generated draft.';
    return 'Complete the current stage before moving forward.';
}

function createLoredeckCreatorCurrentTaskOutputs(pipeline = {}) {
    const grid = document.createElement('div');
    grid.className = 'saga-loredeck-creator-output-grid';
    const outputsByStep = {
        scope: [
            ['Scope boundary', 'Fandom, story slice, granularity, assumptions, and exclusions.'],
            ['Deck identity', 'Stable generated deck ID and metadata.'],
            ['Context boundary', 'Spoiler, hidden-knowledge, and timing limits.'],
        ],
        outline: [
            ['Major story beats', 'Key events and turning points in the arc.'],
            ['Context milestones', 'High-value anchors and windows for gating.'],
            ['Title-batch slices', 'Suggested chunks for Title Pass generation.'],
            ['Context limits', 'Timing and hidden-knowledge boundaries.'],
        ],
        titles: [
            ['Review table', 'Keep, edit, drop, merge, split, or regenerate title drafts.'],
            ['Scene pressure', 'Titles should imply playable tension, not wiki biography.'],
            ['Context hints', 'Each title should point toward when it can safely activate.'],
        ],
        context: [
            ['Timeline anchors', 'Selectable Context points for this Loredeck.'],
            ['Tags', 'Character, faction, location, pressure, and secret tags.'],
            ['Usage links', 'Which approved titles depend on each proposed item.'],
        ],
        lorecards: [
            ['Small batches', 'Independent cached Lorecard draft batches.'],
            ['Review boundary', 'Drafts stay inactive until sent to Pending Review and accepted.'],
            ['Repair loop', 'Weak cards can be edited or repaired before queueing.'],
        ],
        review: [
            ['Draft only', 'Generated but not queued.'],
            ['Pending Review', 'Queued but not active.'],
            ['Accepted', 'Active in the Generated Loredeck.'],
        ],
        health: [
            ['Errors', 'Blockers that must be fixed before finalization.'],
            ['Warnings', 'Quality or metadata issues worth reviewing.'],
            ['Suggestions', 'Optional cleanup that should not block fun decks.'],
        ],
        finalize: [
            ['Custom Loredeck', 'A normal editable deck copied from the reviewed Generated draft.'],
            ['Health snapshot', 'Latest validation travels with the finalized deck.'],
        ],
    };
    const rows = outputsByStep[pipeline.currentStep?.id] || outputsByStep.scope;
    for (const [label, text] of rows) {
        const item = document.createElement('div');
        item.className = 'saga-loredeck-creator-output-item';
        const strong = document.createElement('strong');
        strong.textContent = label;
        item.appendChild(strong);
        const desc = document.createElement('span');
        desc.textContent = text;
        item.appendChild(desc);
        grid.appendChild(item);
    }
    return grid;
}

function createLoredeckCreatorCurrentSidebar(cached = {}, pipeline = {}) {
    const side = document.createElement('div');
    side.className = 'saga-loredeck-creator-current-sidebar';
    side.appendChild(createLoredeckCreatorInputsPanel(cached, pipeline));
    side.appendChild(createLoredeckCreatorGuidancePanel(pipeline));
    side.appendChild(createLoredeckCreatorQueuePanel(pipeline));
    side.appendChild(createLoredeckCreatorJobPanel(cached, pipeline));
    return side;
}

function getLoredeckCreatorSideValueTone(label = '', value = '') {
    const key = String(label || '').trim().toLowerCase();
    const text = String(value ?? '').trim().toLowerCase();
    const count = Number(text);
    if (!text || text === '-' || text === 'missing' || text === 'unknown' || text === 'not reported') return 'muted';
    if (/error|failed|failure|blocked/.test(text)) return 'danger';
    if (/interrupted|recoverable|warning|retry/.test(text)) return 'warning';
    if (/draft|drafted|pending|review|question/.test(text)) return 'review';
    if (/approved|accepted|ready|complete|running|on/.test(text)) return 'success';
    if (/idle|off|waiting/.test(text)) return 'muted';
    if (Number.isFinite(count)) {
        if (count <= 0) return 'muted';
        if (/pending|review|repair|draft|proposal/.test(key)) return 'review';
        if (/approved|accepted/.test(key)) return 'success';
        return 'source';
    }
    if (/granularity|fandom|scope|last activity|cache|outline/.test(key)) return 'source';
    return 'neutral';
}

function getLoredeckCreatorSideValueKind(label = '', value = '') {
    const key = String(label || '').trim().toLowerCase();
    const text = String(value ?? '').trim();
    if (Number.isFinite(Number(text))) return 'count';
    if (/status|recoverable|brief|outline/.test(key)) return 'status';
    if (/fandom|scope|granularity|last activity|cache/.test(key)) return 'source';
    return 'metadata';
}

function createLoredeckCreatorSideValueChip(label = '', value = '', options = {}) {
    const text = String(value ?? '').trim() || '-';
    return createStatusPill(text, options.tooltip || `${label}: ${text}`, {
        tone: options.tone || getLoredeckCreatorSideValueTone(label, text),
        kind: options.kind || getLoredeckCreatorSideValueKind(label, text),
        density: 'compact',
        className: options.className || 'saga-loredeck-creator-side-value',
        maxChars: options.maxChars || 34,
    });
}

function createLoredeckCreatorInputsPanel(cached = {}, pipeline = {}) {
    const panel = document.createElement('div');
    panel.className = 'saga-loredeck-creator-side-panel';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-creator-side-title';
    title.textContent = 'Inputs';
    panel.appendChild(title);
    const list = document.createElement('div');
    list.className = 'saga-loredeck-creator-side-list';
    const brief = cached.brief || {};
    const draft = getLoredeckCreatorDraftInputs();
    const rows = [
        ['Scope Brief', cached.approved ? 'Approved' : (cached.brief ? 'Drafted' : 'Missing')],
        ['Fandom', brief.fandom || cached.fandom || draft.fandom || '-'],
        ['Scope', brief.scope || cached.scope || draft.scope || '-'],
        ['Granularity', formatLoredeckCreatorGranularity(brief.granularity || cached.granularity || draft.granularity || 'focused')],
    ];
    if (pipeline.outline) rows.push(['Outline', cached.outlineApproved ? 'Approved' : 'Drafted']);
    if (pipeline.approvedTitles?.length) rows.push(['Approved titles', String(pipeline.approvedTitles.length)]);
    for (const [label, value] of rows) {
        const row = document.createElement('div');
        row.className = 'saga-loredeck-creator-side-row';
        const key = document.createElement('span');
        key.textContent = label;
        row.appendChild(key);
        row.appendChild(createLoredeckCreatorSideValueChip(label, value));
        list.appendChild(row);
    }
    panel.appendChild(list);
    return panel;
}

function createLoredeckCreatorGuidancePanel(pipeline = {}) {
    const panel = document.createElement('div');
    panel.className = 'saga-loredeck-creator-side-panel';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-creator-side-title';
    title.textContent = 'Guidance';
    panel.appendChild(title);
    const list = document.createElement('ul');
    list.className = 'saga-loredeck-creator-check-list';
    const items = pipeline.currentStep?.id === 'outline'
        ? ['Story beats', 'Context milestones', 'Title-batch slices', 'Assumptions']
        : pipeline.currentStep?.id === 'titles'
            ? ['Status', 'Title', 'Beat', 'Primary entities', 'Context gate']
            : ['Generate', 'Review', 'Approve', 'Unlock next stage'];
    for (const item of items) {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
    }
    panel.appendChild(list);
    return panel;
}

function createLoredeckCreatorQueuePanel(pipeline = {}) {
    const panel = document.createElement('div');
    panel.className = 'saga-loredeck-creator-side-panel';
    panel.dataset.sagaCreatorAnchor = 'review-status';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-creator-side-title';
    title.textContent = 'Pending Review';
    panel.appendChild(title);
    const rows = [
        ['Planning proposals', pipeline.pendingPlanningCount || 0],
        ['Lorecard drafts', pipeline.draftChanges?.length || 0],
        ['Pending Lorecards', pipeline.pendingLorecardCount || 0],
        ['Repairs / fixes', pipeline.repairCount || 0],
    ];
    for (const [label, count] of rows) {
        const row = document.createElement('div');
        row.className = 'saga-loredeck-creator-queue-row';
        const name = document.createElement('span');
        name.textContent = label;
        row.appendChild(name);
        row.appendChild(createLoredeckCreatorSideValueChip(label, String(count), {
            className: 'saga-loredeck-creator-queue-value',
            maxChars: 18,
        }));
        panel.appendChild(row);
    }
    return panel;
}

function getLoredeckCreatorDiagnostic(unit = {}) {
    const diagnostic = unit?.diagnostic;
    return diagnostic && typeof diagnostic === 'object' && !Array.isArray(diagnostic) ? diagnostic : null;
}

function formatLoredeckCreatorDiagnosticValue(value = '', fallback = '-') {
    const text = String(value ?? '').trim();
    return text || fallback;
}

function getLoredeckCreatorDiagnosticTone(label = '', value = '') {
    const key = String(label || '').trim().toLowerCase();
    const text = String(value ?? '').trim().toLowerCase();
    if (!text || text === 'unknown' || text === 'not reported') return 'muted';
    if (/message|code|phase|finish/.test(key)) return 'warning';
    if (/chars|attempt/.test(key)) return Number(text) ? 'source' : 'muted';
    return getLoredeckCreatorSideValueTone(label, value);
}

function getLoredeckCreatorDiagnosticKind(label = '') {
    const key = String(label || '').trim().toLowerCase();
    if (/chars|attempt/.test(key)) return 'count';
    if (/message|code|phase|finish/.test(key)) return 'severity';
    return 'metadata';
}

function buildLoredeckCreatorDiagnosticCopyPayload(unit = {}) {
    const diagnostic = getLoredeckCreatorDiagnostic(unit);
    if (!diagnostic) return null;
    return {
        kind: 'loredeck_creator_generation_failure',
        unitId: formatLoredeckCreatorDiagnosticValue(unit.unitId || diagnostic.unitId, ''),
        unitLabel: formatLoredeckCreatorDiagnosticValue(unit.label || diagnostic.unitLabel, ''),
        stage: formatLoredeckCreatorDiagnosticValue(unit.stage || diagnostic.stage, ''),
        status: formatLoredeckCreatorDiagnosticValue(unit.status, ''),
        error: formatLoredeckCreatorDiagnosticValue(unit.error || diagnostic.errorMessage, ''),
        diagnostic: {
            errorCode: formatLoredeckCreatorDiagnosticValue(diagnostic.errorCode, ''),
            errorName: formatLoredeckCreatorDiagnosticValue(diagnostic.errorName, ''),
            errorMessage: formatLoredeckCreatorDiagnosticValue(diagnostic.errorMessage, ''),
            parsePhase: formatLoredeckCreatorDiagnosticValue(diagnostic.parsePhase, ''),
            finishReason: formatLoredeckCreatorDiagnosticValue(diagnostic.finishReason, ''),
            resultType: formatLoredeckCreatorDiagnosticValue(diagnostic.resultType, ''),
            providerKind: formatLoredeckCreatorDiagnosticValue(diagnostic.providerKind, ''),
            visibleContentLength: Number(diagnostic.visibleContentLength) || 0,
            reasoningLength: Number(diagnostic.reasoningLength) || 0,
            attempt: Number(diagnostic.attempt) || 0,
            repairAttempted: diagnostic.repairAttempted === true,
            sample: formatLoredeckCreatorDiagnosticValue(diagnostic.sample, ''),
            recordedAt: Number(diagnostic.recordedAt) || 0,
        },
    };
}

async function copyLoredeckCreatorDiagnostic(unit = {}) {
    const payload = buildLoredeckCreatorDiagnosticCopyPayload(unit);
    if (!payload) {
        toast('No Deck Maker diagnostic is available to copy.', 'info');
        return false;
    }
    try {
        if (typeof globalThis.navigator?.clipboard?.writeText !== 'function') {
            throw new Error('Clipboard API is unavailable.');
        }
        await globalThis.navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        toast('Deck Maker failure diagnostic copied.', 'success');
        return true;
    } catch (error) {
        console.warn('[Saga] Could not copy Deck Maker failure diagnostic:', error);
        toast('Deck Maker failure diagnostic could not be copied.', 'error');
        return false;
    }
}

function appendLoredeckCreatorDiagnosticRow(container, label = '', value = '') {
    if (!container || value === undefined || value === null || value === '') return;
    const row = document.createElement('div');
    row.className = 'saga-loredeck-creator-diagnostic-row';
    const key = document.createElement('span');
    key.textContent = label;
    row.appendChild(key);
    row.appendChild(createLoredeckCreatorSideValueChip(label, String(value), {
        className: 'saga-loredeck-creator-diagnostic-value',
        tone: getLoredeckCreatorDiagnosticTone(label, value),
        kind: getLoredeckCreatorDiagnosticKind(label),
        maxChars: label === 'Message' ? 64 : 36,
    }));
    container.appendChild(row);
}

function createLoredeckCreatorDiagnosticBlock(unit = {}) {
    const diagnostic = getLoredeckCreatorDiagnostic(unit);
    if (!diagnostic) return null;
    const block = document.createElement('div');
    block.className = 'saga-loredeck-creator-diagnostic';
    const header = document.createElement('div');
    header.className = 'saga-loredeck-creator-diagnostic-header';
    const title = document.createElement('strong');
    title.textContent = 'Failure Diagnostic';
    header.appendChild(title);
    const copy = createButton('Copy', 'Copy the compact sanitized Deck Maker failure diagnostic.', async () => {
        await copyLoredeckCreatorDiagnostic(unit);
    });
    copy.classList.add('saga-loredeck-creator-diagnostic-copy');
    header.appendChild(copy);
    block.appendChild(header);

    appendLoredeckCreatorDiagnosticRow(block, 'Code', diagnostic.errorCode || 'unknown');
    appendLoredeckCreatorDiagnosticRow(block, 'Phase', diagnostic.parsePhase || 'unknown');
    appendLoredeckCreatorDiagnosticRow(block, 'Finish', diagnostic.finishReason || 'not reported');
    appendLoredeckCreatorDiagnosticRow(block, 'Visible chars', Number(diagnostic.visibleContentLength) || 0);
    appendLoredeckCreatorDiagnosticRow(block, 'Reasoning chars', Number(diagnostic.reasoningLength) || 0);
    appendLoredeckCreatorDiagnosticRow(block, 'Attempt', Number(diagnostic.attempt) || 0);
    if (diagnostic.errorMessage) appendLoredeckCreatorDiagnosticRow(block, 'Message', diagnostic.errorMessage);
    if (diagnostic.sample) {
        const sample = document.createElement('div');
        sample.className = 'saga-loredeck-creator-diagnostic-sample';
        sample.textContent = diagnostic.sample;
        addTooltip(sample, 'Short visible-output sample saved with the failed unit. Full raw provider responses are not stored.');
        block.appendChild(sample);
    }
    return block;
}

function countLoredeckCreatorCompletedEntryUnits(cached = {}) {
    const units = cached?.generationUnits && typeof cached.generationUnits === 'object' && !Array.isArray(cached.generationUnits)
        ? Object.values(cached.generationUnits)
        : [];
    return units.filter(unit => {
        const actionId = String(unit?.meta?.actionId || unit?.actionId || '').trim();
        return actionId === 'entry_batch_draft' && String(unit?.status || '').trim().toLowerCase() === 'complete';
    }).length;
}

function createLoredeckCreatorJobPanel(cached = {}, pipeline = {}) {
    const panel = document.createElement('div');
    panel.className = 'saga-loredeck-creator-side-panel';
    const title = document.createElement('div');
    title.className = 'saga-loredeck-creator-side-title';
    title.textContent = 'Job & Cache';
    panel.appendChild(title);
    const active = pipeline.activeGeneration;
    const interrupted = String(cached.lastGenerationResult?.status || '').toLowerCase() === 'interrupted';
    const failedUnit = getLoredeckCreatorLatestRecoverableUnit(cached);
    const titleBatchCount = Array.isArray(cached.titleBatchDraftedIds) ? cached.titleBatchDraftedIds.length : 0;
    const contextBatchCount = Array.isArray(cached.planningBatchQueuedIds) ? cached.planningBatchQueuedIds.length : 0;
    const entryBatchCount = countLoredeckCreatorCompletedEntryUnits(cached);
    const liveDraftCount = Array.isArray(pipeline.draftChanges) ? pipeline.draftChanges.length : 0;
    const cachedDraftCount = Number(cached.entryDraftCount) || 0;
    const pendingLorecardCount = Number(pipeline.pendingLorecardCount) || 0;
    const rows = [
        ['Status', active ? 'Running' : (interrupted ? 'Interrupted' : 'Idle')],
        ['Cached batches', String(titleBatchCount + contextBatchCount + entryBatchCount)],
        ['Lorecard batches', String(entryBatchCount)],
        ['Draft Review', String(liveDraftCount)],
        ...(!liveDraftCount && cachedDraftCount ? [['Last drafted', String(cachedDraftCount)]] : []),
        ['Pending Review', String(pendingLorecardCount)],
        ...(failedUnit ? [['Recoverable', formatLoredeckCreatorRecoveryStageLabel(failedUnit)]] : []),
        ['Last activity', cached.updatedAt ? formatRelativeHealthTime(cached.updatedAt) : '-'],
    ];
    for (const [label, value] of rows) {
        const row = document.createElement('div');
        row.className = 'saga-loredeck-creator-side-row';
        const key = document.createElement('span');
        key.textContent = label;
        row.appendChild(key);
        row.appendChild(createLoredeckCreatorSideValueChip(label, value));
        panel.appendChild(row);
    }
    const diagnosticBlock = failedUnit ? createLoredeckCreatorDiagnosticBlock(failedUnit) : null;
    if (diagnosticBlock) panel.appendChild(diagnosticBlock);
    return panel;
}

export function formatLoredeckCreatorGenerationElapsed(ms = 0) {
    return formatLoredeckJobElapsed(ms);
}

export function formatLoredeckCreatorLiveSnippet(text = '', limit = 760) {
    const clean = String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .trim();
    if (!clean) return '';
    if (clean.length <= limit) return clean;
    return `...${clean.slice(-limit)}`;
}

export function getLoredeckCreatorGenerationWaitMessage(generation = {}) {
    const elapsed = Math.max(0, Date.now() - Number(generation.startedAt || Date.now()));
    if (Number(generation.receivedChars || 0) > 0) return generation.message || 'Receiving visible response...';
    if (generation.phase === 'reasoning') return generation.message || 'Model is reasoning; visible response has not started yet.';
    if (elapsed >= 240000) return 'Still running. Large stages or self-hosted models can take several minutes.';
    if (elapsed >= 30000) return 'The model is still thinking. Large generations can take a while.';
    if (elapsed >= 10000) return 'Still waiting for the model...';
    return generation.message || 'Waiting for model response...';
}

function getLoredeckCreatorGenerationBatchIds(model = {}) {
    return new Set([
        model.batchId,
        model.targetTitleBatchId,
        model.targetPlanningBatchId,
        model.activeBatchId,
    ].map(value => normalizeLoredeckCreatorTitleId(value || '', '')).filter(Boolean));
}

function getLoredeckCreatorGenerationCoverageIds(source = {}) {
    return new Set(normalizeLoredeckCreatorTitleIdList(source?.coverageDimensionIds || source?.coverageIds || [], 40));
}

function loredeckCreatorGenerationCoverageMatches(model = {}, options = {}) {
    const optionIds = getLoredeckCreatorGenerationCoverageIds(options);
    if (!optionIds.size) return false;
    const modelIds = getLoredeckCreatorGenerationCoverageIds(model);
    if (!modelIds.size) return false;
    for (const id of optionIds) {
        if (modelIds.has(id)) return true;
    }
    return false;
}

function loredeckCreatorGenerationMatches(model = null, actionIds = [], options = {}) {
    if (!model?.actionId) return false;
    const ids = Array.isArray(actionIds) ? actionIds : [actionIds];
    if (ids.length && !ids.includes(model.actionId)) return false;
    const optionBatchId = normalizeLoredeckCreatorTitleId(options.batchId || '', '');
    const modelBatchIds = getLoredeckCreatorGenerationBatchIds(model);
    const hasCoverageFilter = getLoredeckCreatorGenerationCoverageIds(options).size > 0;
    const coverageMatches = loredeckCreatorGenerationCoverageMatches(model, options);
    if (optionBatchId && !modelBatchIds.has(optionBatchId) && !coverageMatches) return false;
    if (!optionBatchId && hasCoverageFilter && !coverageMatches) return false;
    return true;
}

function formatLoredeckCreatorGenerationMeta(model = {}) {
    const parts = [];
    const batchIndex = Math.max(0, Number(model.batchIndex) || 0);
    const batchTotal = Math.max(0, Number(model.batchTotal) || 0);
    if (batchIndex && batchTotal > 1) parts.push(`call ${batchIndex}/${batchTotal}`);
    if (model.batchLabel) parts.push(String(model.batchLabel));
    return parts.join(' | ');
}

function buildLoredeckCreatorGenerationStatusJob(model = {}, activeJob = false) {
    const status = String(model.status || '').toLowerCase();
    return {
        active: activeJob,
        status: status || (activeJob ? 'running' : 'complete'),
        label: model.label || 'Generation',
        message: activeJob
            ? getLoredeckCreatorGenerationWaitMessage(model)
            : (model.message || (status === 'interrupted' ? 'Previous generation was interrupted. Review saved batches, then rerun this stage.' : 'Generation complete.')),
        elapsedMs: activeJob ? Date.now() - Number(model.startedAt || Date.now()) : model.elapsedMs,
        streamSupported: model.streamSupported,
        receivedChars: model.receivedChars,
        batchLabel: model.batchLabel,
        metaText: formatLoredeckCreatorGenerationMeta(model),
    };
}

export function createLoredeckCreatorGenerationStatus(cached = {}, actionIds = [], options = {}) {
    const active = loredeckCreatorGenerationMatches(cached.activeGeneration, actionIds, options) ? cached.activeGeneration : null;
    const result = !active && loredeckCreatorGenerationMatches(cached.lastGenerationResult, actionIds, options) ? cached.lastGenerationResult : null;
    const model = active || result;
    if (!model) return null;
    const activeJob = Boolean(active);
    const row = createLoredeckJobStatusRow(buildLoredeckCreatorGenerationStatusJob(model, activeJob), {
        compact: options.compact,
        onCancel: activeJob ? () => cancelLoredeckCreatorGeneration(model.id) : null,
        cancelTooltip: 'Cancel this generation. Any late provider response will be ignored.',
    });
    row.dataset.sagaCreatorGenerationId = String(model.id || '');
    row.dataset.sagaCreatorGenerationActionId = String(model.actionId || '');
    row.dataset.sagaCreatorGenerationBatchId = String(model.batchId || '');
    row.dataset.sagaCreatorGenerationActive = activeJob ? 'true' : 'false';
    return row;
}

export function refreshLoredeckCreatorGenerationStatusUi(generationId = '') {
    if (typeof document === 'undefined') return false;
    const cached = getLoredeckCreatorBriefCache();
    const active = cached?.activeGeneration?.status === 'running' ? cached.activeGeneration : null;
    const id = String(generationId || active?.id || '').trim();
    if (!active?.id || (id && active.id !== id)) return false;
    const rows = [...document.querySelectorAll('.saga-generation-live-status[data-saga-creator-generation-id]')]
        .filter(row => row?.dataset?.sagaCreatorGenerationId === active.id);
    if (!rows.length) return false;
    const job = buildLoredeckCreatorGenerationStatusJob(active, true);
    for (const row of rows) {
        row.classList.add('saga-generation-live-status-running');
        row.dataset.sagaCreatorGenerationActive = 'true';
        row.dataset.sagaCreatorGenerationActionId = String(active.actionId || '');
        row.dataset.sagaCreatorGenerationBatchId = String(active.batchId || '');
        const label = row.querySelector('.saga-generation-live-label');
        if (label) label.textContent = job.label;
        const text = row.querySelector('.saga-generation-live-text');
        if (text) text.textContent = job.message;
        const elapsed = row.querySelector('.saga-generation-live-elapsed');
        if (elapsed) elapsed.textContent = formatLoredeckJobElapsed(job.elapsedMs);
        const meta = row.querySelector('.saga-generation-live-meta');
        if (meta) meta.textContent = formatLoredeckJobMeta(job);
    }
    return true;
}

export function appendLoredeckCreatorGenerationStatus(container, cached = {}, actionIds = [], options = {}) {
    const row = createLoredeckCreatorGenerationStatus(cached, actionIds, options);
    if (row) container.appendChild(row);
    return row;
}
