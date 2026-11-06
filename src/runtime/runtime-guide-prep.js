/**
 * runtime-guide-prep.js - Saga
 * Prepare runtime surfaces before guided walkthrough steps are located.
 */

import { normalizeLoreMatrix } from '../lorecards/lore-matrix.js';
import {
    activateLoredeckCreatorJob,
    getActiveLoredeckCreatorJob,
    getLoredeckCreatorRegistry,
    getState,
} from '../state/state-manager.js';
import {
    getLoredeckLibrary,
    getLoredeckStack,
} from './active-stack-panel.js';

let deps = {};

function dep(name, fallback = () => undefined) {
    return typeof deps[name] === 'function' ? deps[name] : fallback;
}

export function configureRuntimeGuidePrep(nextDeps = {}) {
    deps = { ...deps, ...nextDeps };
}

function openPendingLoreReviewSections() {
    dep('setSectionCollapsed')('lore.pendingReview', false);
}

function createGuidePrepareResult(ok = true, message = '') {
    const result = { ok: ok !== false };
    if (message) result.message = message;
    return result;
}

function getRuntimeGuideRequestedPackId(step = {}) {
    for (const candidate of [
        step.packId,
        step.loredeckId,
        step.deckId,
        step.targetPackId,
        step.pack?.packId,
    ]) {
        const id = String(candidate || '').trim();
        if (id) return id;
    }
    return '';
}

function getFirstRuntimeGuidePackId(step = {}) {
    const requested = getRuntimeGuideRequestedPackId(step);
    if (requested) return requested;
    const state = getState();
    const stackPack = getLoredeckStack(state).find(item => item.enabled !== false && item.type !== 'folder' && item.packId);
    if (stackPack?.packId) return stackPack.packId;
    return getLoredeckLibrary(state)[0]?.packId || '';
}

function getRuntimeGuideCreatorProjectJob(step = {}) {
    const requested = String(step.jobId || step.creatorJobId || '').trim();
    const state = getState();
    const active = getActiveLoredeckCreatorJob(state);
    if (requested && active?.jobId === requested) return active;
    const registry = getLoredeckCreatorRegistry(state);
    const jobs = Object.values(registry?.jobs || {});
    if (requested) return jobs.find(job => job?.jobId === requested) || null;
    return active || jobs[0] || null;
}

function getRuntimeGuideContextStack(state = getState()) {
    const readContextStack = deps.getContextWorkbenchStack;
    if (typeof readContextStack === 'function') return readContextStack(state) || [];
    return getLoredeckStack(state).filter(item => item.enabled !== false);
}

function isLoredeckLibraryOverlayOpen() {
    return typeof document !== 'undefined' && !!document.querySelector('.saga-loredeck-library-overlay');
}

function prepareOpenLoredeckLibrary() {
    dep('navigateRuntimeTab')('loredecks');
    if (!isLoredeckLibraryOverlayOpen()) dep('openLoredeckLibraryWindow')();
    return createGuidePrepareResult(true);
}

function prepareOpenLoredeckDetails(step = {}) {
    dep('navigateRuntimeTab')('loredecks');
    const packId = getFirstRuntimeGuidePackId(step);
    if (!packId) {
        if (!isLoredeckLibraryOverlayOpen()) dep('openLoredeckLibraryWindow')();
        return createGuidePrepareResult(false, 'Loredeck Library is open, but no Loredeck is available to select yet.');
    }
    dep('openLoredeckLibraryDetails')(packId);
    return createGuidePrepareResult(true);
}

function prepareOpenContextBrowser() {
    dep('navigateRuntimeTab')('context');
    const stack = getRuntimeGuideContextStack(getState());
    if (!stack.length) {
        return createGuidePrepareResult(false, 'Load a Loredeck into the active stack before opening Context Browser.');
    }
    dep('openContextWorkbenchForPack')(stack[0]?.packId || '', 'context');
    return createGuidePrepareResult(true);
}

function prepareOpenPendingLoreReview() {
    openPendingLoreReviewSections();
    dep('navigateRuntimeTab')('lore');
    const pendingCount = (getState()?.pendingLoreEntries || []).length;
    return createGuidePrepareResult(
        true,
        pendingCount ? '' : 'Pending Review is open, but there are no Pending Review entries yet.'
    );
}

function prepareOpenAcceptedLoreDetails() {
    dep('setSectionCollapsed')('lore.acceptedEntries', false);
    dep('navigateRuntimeTab')('lore');
    const acceptedCount = normalizeLoreMatrix(getState()?.loreMatrix || []).length;
    return createGuidePrepareResult(
        true,
        acceptedCount ? '' : 'Accepted Lorecards is open, but no Accepted Lorecards exist yet.'
    );
}

function prepareOpenInjectionPreview() {
    dep('setExperienceMode')('advanced');
    dep('navigateRuntimeTab')('injection');
    return createGuidePrepareResult(true);
}

function prepareOpenContinuityEditor(step = {}) {
    dep('setExperienceMode')('advanced');
    const target = String(step.target || '').trim();
    if (target.includes('characters')) dep('setSectionCollapsed')('continuity.characters', false);
    else if (target.includes('items')) dep('setSectionCollapsed')('continuity.inventory', false);
    else if (target.includes('threads')) dep('setSectionCollapsed')('continuity.activeGoalsThreads', false);
    else if (target.includes('scene')) dep('setSectionCollapsed')('continuity.canonScene', false);
    else dep('setSectionCollapsed')('continuity.trackedSections', false);
    dep('navigateRuntimeTab')('continuity');
    return createGuidePrepareResult(true);
}

function prepareOpenLoredeckCreator(step = {}) {
    dep('setExperienceMode')('advanced');
    dep('navigateRuntimeTab')('loredecks');
    dep('openLoredeckCreatorWorkbench')();
    dep('prepareLoredeckCreatorTourTarget')(step.target);
    return createGuidePrepareResult(true);
}

function prepareOpenCreatorProject(step = {}) {
    dep('setExperienceMode')('advanced');
    dep('navigateRuntimeTab')('loredecks');
    const job = getRuntimeGuideCreatorProjectJob(step);
    if (!job?.jobId) {
        dep('openLoredeckCreatorWorkbench')();
        dep('prepareLoredeckCreatorTourTarget')(step.target);
        return createGuidePrepareResult(false, 'Deck Maker is open, but there is no in-progress Deck Maker project to resume yet.');
    }
    const activated = activateLoredeckCreatorJob(job.jobId, { syncPrompt: false });
    dep('setLoredeckCreatorBriefCacheEntry')('current', activated?.job || job);
    dep('openLoredeckCreatorWorkbench')();
    dep('prepareLoredeckCreatorTourTarget')(step.target);
    return createGuidePrepareResult(true);
}

function prepareOpenDeckHealthCenter(step = {}) {
    dep('setExperienceMode')('advanced');
    dep('navigateRuntimeTab')('loredecks');
    const packId = getFirstRuntimeGuidePackId(step);
    if (!packId) {
        dep('openLoredeckHealthCenter')('');
        return createGuidePrepareResult(false, 'Pack Health is open, but no Loredeck is available to inspect yet.');
    }
    dep('openLoredeckHealthCenter')(packId);
    return createGuidePrepareResult(true);
}

function prepareOpenAdvancedSettingsSection(step = {}) {
    dep('setExperienceMode')('advanced');
    const target = String(step.target || '').trim();
    if (target.includes('theme')) dep('setSectionCollapsed')('settings.themePack', false);
    else dep('setSectionCollapsed')('settings.providers', false);
    dep('navigateRuntimeTab')('settings');
    return createGuidePrepareResult(true);
}

export function prepareRuntimeGuideStep(step = {}) {
    switch (String(step?.prepare || step?.prepareAction || '').trim()) {
        case 'openLoredeckLibrary':
            return prepareOpenLoredeckLibrary(step);
        case 'openLoredeckDetails':
            return prepareOpenLoredeckDetails(step);
        case 'openContextBrowser':
            return prepareOpenContextBrowser(step);
        case 'openPendingLoreReview':
            return prepareOpenPendingLoreReview(step);
        case 'openAcceptedLoreDetails':
            return prepareOpenAcceptedLoreDetails(step);
        case 'openInjectionPreview':
            return prepareOpenInjectionPreview(step);
        case 'openContinuityEditor':
            return prepareOpenContinuityEditor(step);
        case 'openLoredeckCreator':
            return prepareOpenLoredeckCreator(step);
        case 'openCreatorProject':
            return prepareOpenCreatorProject(step);
        case 'openDeckHealthCenter':
            return prepareOpenDeckHealthCenter(step);
        case 'openAdvancedSettingsSection':
            return prepareOpenAdvancedSettingsSection(step);
        default:
            return null;
    }
}
