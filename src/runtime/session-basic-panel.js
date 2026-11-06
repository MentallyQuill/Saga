/**
 * Basic workflow readiness card and guided mini-tours.
 */

import { getPanelLoreState, getInjectableLoreEntries, normalizeLoreMatrix } from '../lorecards/lore-matrix.js';
import { getSettings, getState, saveSettings, getLoredeckContext } from '../state/state-manager.js';
import { validateLoreProviderConfiguration } from '../providers/lore-llm-client.js';
import { createButton, createStatusPill } from '../ui/runtime-ui-kit.js';
import { markTourTarget, startSagaTourSteps } from './runtime-tour.js';
import { buildBasicReadinessModel, hasSelectedLoredeckContext } from './runtime-basic-readiness.js';

let sessionBasicPanelDeps = {};

export function configureSessionBasicPanel(deps = {}) {
    sessionBasicPanelDeps = { ...sessionBasicPanelDeps, ...(deps || {}) };
}

function dep(name, fallback = null) {
    const value = sessionBasicPanelDeps?.[name];
    if (typeof value === 'function') return value;
    if (typeof fallback === 'function') return fallback;
    throw new Error(`Saga Basic session panel dependency is not configured: ${name}`);
}

function getEnabledLoredeckStackPackIds(state) { return dep('getEnabledLoredeckStackPackIds', () => [])(state); }
function getSelectedLoreInjectionCount(state, settings = getSettings()) { return dep('getSelectedLoreInjectionCount', () => getInjectableLoreEntries(state, 0).length)(state, settings); }
function createCollapsibleSection(...args) { return dep('createCollapsibleSection')(...args); }
function setPanelState(patch, options = {}) { return dep('setPanelState', () => null)(patch, options); }
function refreshPanelBody(options = {}) { return dep('refreshPanelBody', () => null)(options); }
function refreshHeader() { return dep('refreshHeader', () => null)(); }
function setSectionCollapsed(sectionId, collapsed) { return dep('setSectionCollapsed', () => null)(sectionId, collapsed); }
function closeLoredeckLibraryWindow() { return dep('closeLoredeckLibraryWindow', () => null)(); }
function closeContextWorkbench() { return dep('closeContextWorkbench', () => null)(); }

function enableSagaRuntime() {
    const next = getSettings();
    next.enabled = true;
    saveSettings(next);
    refreshPanelBody({ preserveScroll: false });
    refreshHeader();
}

function getUsableLoredeckContextCount(state = getState()) {
    return getEnabledLoredeckStackPackIds(state).filter(packId => {
        const row = state?.loredeckContexts?.[packId] || getLoredeckContext(state, packId);
        return hasSelectedLoredeckContext(row);
    }).length;
}

export function getBasicReadinessModel(state = getState(), settings = getSettings()) {
    const loreState = getPanelLoreState(state);
    const acceptedCount = Math.max(0, (loreState.counts?.all || 0) - (loreState.counts?.pending || 0));
    const pendingCount = (state?.pendingLoreEntries || []).length;
    const enabledLoredecks = getEnabledLoredeckStackPackIds(state).length;
    const contextCount = getUsableLoredeckContextCount(state);
    const selectedLore = getSelectedLoreInjectionCount(state, settings);
    const providerValidation = validateLoreProviderConfiguration('lore');
    const loreInjectionOn = settings.injectLore !== false && settings.injectMemo !== false;

    return buildBasicReadinessModel({
        acceptedCount,
        enabledLoredecks,
        contextCount,
        pendingCount,
        providerReady: providerValidation.ok,
        sagaEnabled: settings.enabled !== false,
        selectedLore,
        loreInjectionOn,
    });
}

function basicChecklistTourStep(id, title, body, tab, target, options = {}) {
    return Object.freeze({
        id,
        title,
        body,
        tab,
        target,
        section: options.section || id,
        ...options,
    });
}

const BASIC_CHECKLIST_REVIEW_GENERATION_STEPS = Object.freeze([
    basicChecklistTourStep('basic-checklist-review-generate-canon', 'Preview Canon Packs', 'Use Preview Canon Packs when loaded Loredecks can suggest current-scene canon guardrails. On mobile, open the Lorecards Generate sub-tab first.', 'lore', 'lore.canon.preview', {
        fallbackTarget: 'lore.generation.section',
        expandSections: Object.freeze(['lore.generation']),
        expected: 'Useful canon suggestions can be sent to Pending Review.',
        when: 'Use this before scenes where canon constraints matter.',
    }),
    basicChecklistTourStep('basic-checklist-review-scan-story', 'Scan Story Lore', 'Use Scan Story Lore when the recent chat has durable facts worth extracting. On mobile, run this from the Lorecards Generate sub-tab.', 'lore', 'lore.story.scan', {
        fallbackTarget: 'lore.generation.section',
        expandSections: Object.freeze(['lore.generation']),
        expected: 'Story facts become Pending Review entries, not Accepted Lorecards.',
        when: 'Run this after substantial new roleplay.',
    }),
    basicChecklistTourStep('basic-checklist-review-manual-add', 'Manual Lore Note', 'Use Draft Manual Note when you already know the exact fact Saga should remember. On mobile, keep the note short enough to review comfortably in the follow-up card.', 'lore', 'lore.manual.add', {
        fallbackTarget: 'lore.generation.section',
        expandSections: Object.freeze(['lore.generation']),
        expected: 'The draft enters Pending Review for one final decision.',
        when: 'Use this for trusted facts that do not need model discovery.',
    }),
    basicChecklistTourStep('basic-checklist-review-pending-after-create', 'Review Pending Review', 'Read each Pending Review entry and accept only facts that should affect future responses. On mobile, the pending card stays inside the Lore sub-tab.', 'lore', 'lore.pending.entry', {
        fallbackTarget: 'lore.pending',
        expandSections: Object.freeze(['lore.pendingReview']),
        prepare: 'openPendingLoreReview',
        expected: 'Accepted entries move into durable Lorecards.',
        when: 'Use this after canon preview, story scan, or Manual Lore Note drafting.',
    }),
    basicChecklistTourStep('basic-checklist-review-apply', 'Accept or Reject', 'Use the card actions to accept useful Lorecards and reject noise, recap, or wrong canon. On mobile, use the row actions at the bottom of the pending card.', 'lore', 'lore.pending.actions', {
        fallbackTarget: 'lore.pending.entry',
        expandSections: Object.freeze(['lore.pendingReview']),
        prepare: 'openPendingLoreReview',
        expected: 'Only reviewed facts become Accepted Lorecards.',
        when: 'Use this after reading a pending card.',
    }),
]);

const BASIC_CHECKLIST_REVIEW_PENDING_STEPS = Object.freeze([
    basicChecklistTourStep('basic-checklist-review-open-pending', 'Open Pending Review', 'Saga opens Pending Review so the next decision is visible. On mobile, this appears in the Lorecards Lore sub-tab.', 'lore', 'lore.pending.entry', {
        fallbackTarget: 'lore.pending',
        expandSections: Object.freeze(['lore.pendingReview']),
        prepare: 'openPendingLoreReview',
        expected: 'A Pending Review entry is visible for review.',
        when: 'Use this when the checklist reports pending review.',
    }),
    basicChecklistTourStep('basic-checklist-review-read-card', 'Read the Entry', 'Check the title, category, tags, and fact text before it becomes an Accepted Lorecard. Mobile users should read the card itself before using the compact action row.', 'lore', 'lore.pending.entry', {
        fallbackTarget: 'lore.pending.list',
        expandSections: Object.freeze(['lore.pendingReview']),
        prepare: 'openPendingLoreReview',
        expected: 'You can decide whether the fact should guide future responses.',
        when: 'Use this before accepting or rejecting the card.',
    }),
    basicChecklistTourStep('basic-checklist-review-apply-pending', 'Accept or Reject', 'Press Accept for useful durable facts, or reject entries that should stay out of memory. On mobile, use the visible card actions instead of looking for a separate desktop toolbar.', 'lore', 'lore.pending.actions', {
        fallbackTarget: 'lore.pending.entry',
        expandSections: Object.freeze(['lore.pendingReview']),
        prepare: 'openPendingLoreReview',
        expected: 'The accepted count increases or the pending queue clears.',
        when: 'Use this for each Pending Review entry.',
    }),
]);

const BASIC_CHECKLIST_TOUR_TASKS_BY_ROW = Object.freeze({
    loredecks: {
        id: 'basic-checklist-loredecks',
        title: 'Add Loredecks to Stack',
        steps: Object.freeze([
            basicChecklistTourStep('basic-checklist-loredecks-open', 'Open Loredeck Library', 'Press Open Loredeck Library to open the stack manager. On mobile, this opens the Library browse surface.', 'loredecks', 'loredecks.library.open', {
                fallbackTarget: 'loredecks.library.launch',
                expandSections: Object.freeze(['loredecks.libraryLaunch']),
                expected: 'The Library window or mobile Library surface opens over the chat.',
                when: 'Start here when no Loredeck is loaded.',
            }),
            basicChecklistTourStep('basic-checklist-loredecks-open-folder', 'Open a Folder', 'Use a folder dropdown to reveal the Loredecks inside it. The folder is only a container; the Loredecks are the selectable rows or mobile cards under it.', 'loredecks', 'loredecks.library.folderDisclosure', {
                fallbackTarget: 'loredecks.library.list',
                prepare: 'openLoredeckLibrary',
                expected: 'A folder is expanded so its Loredecks are visible.',
                when: 'Use this when the Library shows folder rows instead of individual Loredecks.',
            }),
            basicChecklistTourStep('basic-checklist-loredecks-pick', 'Select 1-2 Loredecks', 'Choose one core Loredeck for the fandom, then add one story-position Loredeck for where this chat is in the story. On mobile, select from the card list and open details only when you need to inspect first.', 'loredecks', 'loredecks.library.deckCard', {
                fallbackTarget: 'loredecks.library.list',
                prepare: 'openLoredeckLibrary',
                expected: 'One or two Loredecks are selected before stack changes.',
                when: 'Use this before adding anything to the active stack.',
            }),
            basicChecklistTourStep('basic-checklist-loredecks-add', 'Add to Active Chat Stack', 'Open the chat you want to configure, then use the transfer controls to add the selected Loredecks to its Active Chat Stack. Each chat saves its own stack. On mobile, the same transfer action is grouped with the Library card controls.', 'loredecks', 'loredecks.library.transfer', {
                fallbackTarget: 'loredecks.library.list',
                prepare: 'openLoredeckLibrary',
                expected: 'The active stack contains the selected Core and story-position Loredecks.',
                when: 'Do this before setting Context.',
            }),
            basicChecklistTourStep('basic-checklist-loredecks-confirm', 'Confirm Stack', 'Check the active stack, then press Done or Close when the loaded Loredecks are correct.', 'loredecks', 'loredecks.library.done', {
                fallbackTarget: 'loredecks.library.stack',
                prepare: 'openLoredeckLibrary',
                expected: 'The Loredecks tab reflects the loaded stack.',
                when: 'Use this before returning to Session Readiness.',
            }),
        ]),
    },
    context: {
        id: 'basic-checklist-context',
        title: 'Browse Context',
        steps: Object.freeze([
            basicChecklistTourStep('basic-checklist-context-open', 'Open Context Workbench', 'Press Browse Context to open the Context Workbench before the story starts. On mobile, start from the Context route or Context Details, then open Browse Context.', 'context', 'context.browser', {
                fallbackTarget: 'context.commandCenter',
                expandSections: Object.freeze(['context.commandCenter']),
                expected: 'The Context Workbench opens for the loaded Loredecks.',
                when: 'Use this when you know the current story position.',
            }),
            basicChecklistTourStep('basic-checklist-context-loredeck', 'Choose Loaded Loredeck', 'Select the loaded Loredeck whose story position you want to set. Mobile users still choose the loaded row before applying any story position.', 'context', 'context.workbench.loadedLoredeck', {
                fallbackTarget: 'context.workbench.contextTable',
                prepare: 'openContextBrowser',
                expected: 'The Workbench focuses the Loredeck that needs Context.',
                when: 'Use this when the active stack has more than one Loredeck.',
            }),
            basicChecklistTourStep('basic-checklist-context-browse', 'Choose Story Position', 'Use Choose Story Position to search timeline anchors, windows, aliases, and loaded story events. On mobile, this is the main way to pick Context without learning desktop timeline panels.', 'context', 'context.workbench.storyPosition', {
                fallbackTarget: 'context.workbench.editor',
                prepare: 'openContextBrowser',
                expected: 'Anchors and Windows are visible before you choose the current story position.',
                when: 'Use this before the first roleplay message so Saga starts at the right point.',
            }),
            basicChecklistTourStep('basic-checklist-context-apply', 'Select Current Position', 'Press Start Here when the story begins at one Anchor. Press Use Window for a listed Window, or use After and Before to create your own range.', 'context', 'context.workbench.applyContext', {
                fallbackTarget: 'context.workbench.storyPosition',
                prepare: 'openContextBrowser',
                expected: 'A real Anchor, Window, date, or story position is selected for the loaded Loredeck.',
                when: 'Use this to set a trusted manual Context.',
            }),
            basicChecklistTourStep('basic-checklist-context-verify', 'Verify Loaded Rows', 'Confirm the loaded Loredeck Context rows show the story position you expect. On mobile, return to the Context route summary or details after the Workbench closes.', 'context', 'context.loadedLoredecks', {
                fallbackTarget: 'context.commandCenter',
                expandSections: Object.freeze(['context.loadedLoredecks']),
                expected: 'The checklist can mark Browse Context as complete.',
                when: 'Use this before reviewing Lorecards.',
            }),
        ]),
    },
    review: {
        id: 'basic-checklist-review',
        title: 'Review Lorecards',
    },
    'lore-ready': {
        id: 'basic-checklist-lore-ready',
        title: 'Confirm Lorecards',
        steps: Object.freeze([
            basicChecklistTourStep('basic-checklist-lore-ready-open', 'Open Accepted Lorecards', 'Saga opens Accepted Lorecards so you can inspect what may guide prompts. On mobile, this lands in the Lorecards Lore sub-tab.', 'lore', 'lore.accepted.list', {
                fallbackTarget: 'lore.accepted',
                expandSections: Object.freeze(['lore.acceptedEntries']),
                prepare: 'openAcceptedLoreDetails',
                expected: 'Accepted Lorecards are visible.',
                when: 'Use this after review has accepted at least one card.',
            }),
            basicChecklistTourStep('basic-checklist-lore-ready-search', 'Search Accepted Lorecards', 'Use the search field if you need to confirm a specific fact before continuing. On mobile, use filters from the Lore sub-tab rather than looking for a separate Active Set page.', 'lore', 'lore.accepted.filters', {
                fallbackTarget: 'lore.accepted.list',
                expandSections: Object.freeze(['lore.acceptedEntries']),
                prepare: 'openAcceptedLoreDetails',
                expected: 'You can verify what Saga remembers.',
                when: 'Use this when the accepted list is long.',
            }),
            basicChecklistTourStep('basic-checklist-lore-ready-entry', 'Open a Lorecard', 'Open or inspect an accepted Lorecard when the stored fact needs correction. On mobile, long-press the card when you need the editor.', 'lore', 'lore.accepted.entry', {
                fallbackTarget: 'lore.accepted.list',
                expandSections: Object.freeze(['lore.acceptedEntries']),
                prepare: 'openAcceptedLoreDetails',
                expected: 'Accepted Lorecards are ready for the next prompt.',
                when: 'Use this if something looks stale or wrong.',
            }),
        ]),
    },
    provider: {
        id: 'basic-checklist-provider',
        title: 'Configure Provider',
        steps: Object.freeze([
            basicChecklistTourStep('basic-checklist-provider-utility', 'Check Utility Provider', 'Read Utility Provider status for scans, summaries, and other model-backed support actions. On mobile, use the Settings route provider rows.', 'settings', 'settings.provider.utility', {
                fallbackTarget: 'settings.providers',
                expandSections: Object.freeze(['settings.providers']),
                expected: 'The status says Ready or explains what is missing.',
                when: 'Use this if model-backed helper actions fail.',
            }),
            basicChecklistTourStep('basic-checklist-provider-reasoning', 'Check Reasoning Provider', 'Read Reasoning Provider status for Lorecard generation and model-backed Context help. On mobile, the same status is in Settings.', 'settings', 'settings.provider.reasoning', {
                fallbackTarget: 'settings.providers',
                expandSections: Object.freeze(['settings.providers']),
                expected: 'The status says Ready or explains what is missing.',
                when: 'Use this before scans or generated lore.',
            }),
            basicChecklistTourStep('basic-checklist-provider-test', 'Test a Provider', 'Press a Test button to confirm the selected provider route can answer a small request. On mobile, use the touch-sized Test action in the provider row.', 'settings', 'settings.provider.test', {
                fallbackTarget: 'settings.provider.reasoning',
                expandSections: Object.freeze(['settings.providers']),
                expected: 'Saga reports whether the provider connected.',
                when: 'Use this before relying on model-backed actions.',
            }),
            basicChecklistTourStep('basic-checklist-provider-advanced', 'Advanced Provider Settings', 'Open Advanced Provider Settings only when Basic status rows do not give enough control.', 'settings', 'settings.provider.advanced', {
                fallbackTarget: 'settings.providers',
                expandSections: Object.freeze(['settings.providers']),
                expected: 'Advanced settings expose profiles, endpoints, model fields, and generation controls.',
                when: 'Use this for non-default routing or provider repair.',
            }),
        ]),
    },
});

function getBasicChecklistTourConfig(row = {}) {
    if (row.id === 'context' && row.targetTab === 'loredecks') return BASIC_CHECKLIST_TOUR_TASKS_BY_ROW.loredecks;
    return BASIC_CHECKLIST_TOUR_TASKS_BY_ROW[row.id] || null;
}

function getBasicChecklistTourSteps(config = {}, row = {}, state = getState()) {
    if (row.id === 'review') {
        const pendingCount = normalizeLoreMatrix(state?.pendingLoreEntries || []).length;
        return pendingCount > 0 ? BASIC_CHECKLIST_REVIEW_PENDING_STEPS : BASIC_CHECKLIST_REVIEW_GENERATION_STEPS;
    }
    return Array.isArray(config.steps) ? config.steps : [];
}

function isOutstandingBasicChecklistRow(row = {}) {
    return !!row && row.ready !== true;
}

function getBasicChecklistTourConfigId(row = {}) {
    return getBasicChecklistTourConfig(row)?.id || '';
}

function isTourableOutstandingBasicChecklistRow(row = {}, state = getState()) {
    if (!isOutstandingBasicChecklistRow(row) || row.actionId) return false;
    const config = getBasicChecklistTourConfig(row);
    return !!config && getBasicChecklistTourSteps(config, row, state).length > 0;
}

function getNextBasicChecklistTourRow(model = {}, currentRow = {}, state = getState()) {
    const rows = Array.isArray(model.rows) ? model.rows : [];
    const currentId = String(currentRow?.id || '').trim();
    const currentConfigId = getBasicChecklistTourConfigId(currentRow);
    const candidates = rows.filter(row => {
        if (row.id === currentId) return false;
        if (!isTourableOutstandingBasicChecklistRow(row, state)) return false;
        return !currentConfigId || getBasicChecklistTourConfigId(row) !== currentConfigId;
    });
    if (!candidates.length) return null;
    return candidates.find(row => row.id === model.nextAction?.id) || candidates[0] || null;
}

function getBasicChecklistTourFinishState(currentRow = {}) {
    const state = getState();
    const settings = getSettings();
    const model = getBasicReadinessModel(state, settings);
    const rows = Array.isArray(model.rows) ? model.rows : [];
    return {
        nextRow: getNextBasicChecklistTourRow(model, currentRow, state),
        outstandingCount: rows.filter(isOutstandingBasicChecklistRow).length,
    };
}

function getBasicChecklistTourFinishLabel(currentRow = {}) {
    const finishState = getBasicChecklistTourFinishState(currentRow);
    if (finishState.nextRow) return `Continue: ${finishState.nextRow.actionLabel || finishState.nextRow.label || 'Guided Step'}`;
    return finishState.outstandingCount > 0 ? 'Return to Readiness' : 'Done';
}

function getBasicChecklistTourFinishTooltip(currentRow = {}) {
    const finishState = getBasicChecklistTourFinishState(currentRow);
    if (finishState.nextRow) {
        return `Continue Session Readiness with ${finishState.nextRow.label || finishState.nextRow.actionLabel || 'the next guided step'}.`;
    }
    if (finishState.outstandingCount > 0) {
        return 'Return to Session Readiness to finish the remaining item.';
    }
    return 'Close this guided tour. Story Maker is available from Session when you want Saga to draft an optional opener before continuing roleplay.';
}

function finishBasicChecklistTour(currentRow = {}) {
    const finishState = getBasicChecklistTourFinishState(currentRow);
    if (!finishState.nextRow) return false;
    launchBasicChecklistTour(finishState.nextRow);
    return true;
}

function launchBasicChecklistTour(row = {}) {
    const config = getBasicChecklistTourConfig(row);
    if (!config) return;
    const steps = getBasicChecklistTourSteps(config, row, getState());
    if (!steps.length) return;
    startSagaTourSteps(steps, {
        mode: 'basic',
        sectionId: config.id,
        className: 'saga-checklist-tour-popover',
        progressLabel: 'Guided Tour',
        closeLabel: 'Close',
        closeTooltip: 'Close this guided tour and return to Session Readiness.',
        finishLabel: 'Done',
        getFinishLabel: () => getBasicChecklistTourFinishLabel(row),
        getFinishTooltip: () => getBasicChecklistTourFinishTooltip(row),
        onFinish: () => finishBasicChecklistTour(row),
        onClose: returnToBasicStartChecklist,
    });
}

export function getBasicReadinessAction(row) {
    if (!row || row.ready || !row.actionLabel) return null;
    if (row.actionId === 'enable-saga') return enableSagaRuntime;
    if (row.targetTab) return () => launchBasicChecklistTour(row);
    return null;
}

function createBasicReadinessRow(row) {
    const item = document.createElement('div');
    item.className = `saga-basic-readiness-row ${row.ready ? 'saga-basic-readiness-row-ready' : 'saga-basic-readiness-row-missing'} ${row.optional ? 'saga-basic-readiness-row-optional' : ''}`.trim();

    const main = document.createElement('div');
    main.className = 'saga-basic-readiness-main';

    const label = document.createElement('div');
    label.className = 'saga-basic-readiness-label';
    label.textContent = row.label;
    main.appendChild(label);

    const state = document.createElement('div');
    state.className = 'saga-basic-readiness-state';
    state.textContent = row.ready ? row.readyText : row.missingText;
    main.appendChild(state);

    item.appendChild(main);
    item.appendChild(createStatusPill(row.ready ? 'Ready' : (row.optional ? 'Optional' : 'Needs setup'), row.ready ? row.readyText : row.missingText, { tone: row.ready ? 'success' : (row.optional ? 'info' : 'warning'), kind: 'status' }));

    const action = getBasicReadinessAction(row);
    if (!row.ready && row.actionLabel && typeof action === 'function') {
        item.appendChild(createButton(row.actionLabel, row.missingText, action, 'saga-small-button'));
    }

    return item;
}

export function createBasicStartReadinessCard(state = getState(), settings = getSettings()) {
    const model = getBasicReadinessModel(state, settings);
    const content = document.createElement('div');
    content.className = 'saga-basic-readiness-content';

    const next = document.createElement('div');
    next.className = 'saga-basic-next-action';
    const nextLabel = model.nextAction?.label || 'Continue roleplay';
    next.appendChild(createStatusPill(model.nextAction?.ready ? 'Ready' : 'Next', model.nextAction?.missingText || model.nextAction?.readyText || nextLabel, { tone: model.nextAction?.ready ? 'success' : 'info', kind: 'status' }));
    const nextText = document.createElement('span');
    nextText.textContent = model.nextAction?.ready ? 'Continue roleplay' : (model.nextAction?.actionLabel || nextLabel);
    next.appendChild(nextText);
    const nextAction = getBasicReadinessAction(model.nextAction);
    if (model.nextAction?.actionLabel && typeof nextAction === 'function') {
        next.appendChild(createButton(model.nextAction.actionLabel, model.nextAction.missingText || 'Open the next Basic workflow step.', nextAction, 'saga-primary-button'));
    }
    content.appendChild(next);

    const list = document.createElement('div');
    list.className = 'saga-basic-readiness-list';
    for (const row of model.rows) list.appendChild(createBasicReadinessRow(row));
    content.appendChild(list);

    const subtitle = model.nextAction?.ready ? 'ready' : (model.nextAction?.actionLabel || 'next action');
    return markTourTarget(createCollapsibleSection(
        'session.basicReadiness',
        'Session Readiness',
        subtitle,
        true,
        content,
        {
            tooltip: 'Guided Basic workflow: load lore, set Context, review Lorecards, optionally draft an opener with Story Maker, then continue roleplay.',
            className: 'saga-basic-readiness-card',
        }
    ), 'session.basicReadiness');
}

function returnToBasicStartChecklist() {
    closeLoredeckLibraryWindow();
    closeContextWorkbench();
    setSectionCollapsed('session.basicReadiness', false);
    setPanelState({ activeTab: 'session' });
    refreshPanelBody({ preserveScroll: false });
    refreshHeader();
}
