import { getInjectableLoreEntries, getLoreRelevanceCounts, normalizeLoreMatrix } from '../lorecards/lore-matrix.js';
import { getLoreEntryInjectionContextGate } from '../lorecards/lore-injection-filter.js';
import {
    buildContinuityPreview,
    buildLorePreview,
    getCompressionSourceSignature,
} from '../continuity/memo-builder.js';
import {
    getSettings,
    getState,
    saveSettings,
    saveState,
} from '../state/state-manager.js';
import { DEFAULT_SETTINGS } from '../state/constants.js';
import {
    sendLoreRequest,
    validateLoreProviderConfiguration,
} from '../providers/lore-llm-client.js';
import {
    extractLoreResponseText,
} from '../providers/lore-response-normalizer.js';
import {
    addTooltip,
    createButton,
    createKeyValue,
    createSectionHeader,
    createStatusPill,
    createToggleCard,
    setChipTone,
    toast,
} from '../ui/runtime-ui-kit.js';
import { isBasicExperience } from './runtime-navigation.js';
import { estimateTokens } from './runtime-formatters.js';
import { PROMPT_PLACEMENT_SETTING_KEYS } from './runtime-setting-groups.js';

let injectionPreviewPanelDeps = {};

export function configureInjectionPreviewPanel(deps = {}) {
    injectionPreviewPanelDeps = { ...injectionPreviewPanelDeps, ...(deps || {}) };
}

function dep(name, fallback = null) {
    const value = injectionPreviewPanelDeps?.[name];
    if (typeof value === 'function') return value;
    if (typeof fallback === 'function') return fallback;
    throw new Error(`Saga Injection Preview panel dependency is not configured: ${name}`);
}

function refreshPanelBody(options = {}) { return dep('refreshPanelBody', () => null)(options); }
function refreshHeader() { return dep('refreshHeader', () => null)(); }
function setPanelState(patch, options = {}) { return dep('setPanelState', () => null)(patch, options); }
function renderSessionTab(container, state) { return dep('renderSessionTab', () => null)(container, state); }
function createCollapsibleSection(...args) { return dep('createCollapsibleSection')(...args); }
function markTourTarget(element, target) { return dep('markTourTarget', value => value)(element, target); }
function appendSettingsResetButton(...args) { return dep('appendSettingsResetButton', () => null)(...args); }
function getPanelRoot() { return dep('getPanelRoot', () => null)(); }
function getEnabledLoredeckStackPackIds(state = getState()) { return dep('getEnabledLoredeckStackPackIds', () => [])(state); }

const RELEVANCE_META = Object.freeze({
    high: { label: 'High' },
    normal: { label: 'Normal' },
    low: { label: 'Low' },
});
const COMPRESSION_RETRY_SYSTEM_PROMPT = 'You are Saga Compression. Your previous visible output was outside the requested preferred range. Output only a corrected plain-text injection block closer to that range. No markdown, JSON, reasoning, or commentary.';
// Injection tab ---------------------------------------------------------------

export function renderInjectionTab(container, state) {
    const settings = getSettings();
    if (isBasicExperience(settings)) {
        setPanelState({ activeTab: 'session' });
        renderSessionTab(container, state);
        return;
    }

    const continuityPreview = buildContinuityPreview(state, settings.continuityInjectionMode || 'direct');
    const loreHighPreview = buildLorePreview(state, getLoreTierMode(settings, 'high'), 'high');
    const loreNormalPreview = buildLorePreview(state, getLoreTierMode(settings, 'normal'), 'normal');
    const loreLowPreview = buildLorePreview(state, getLoreTierMode(settings, 'low'), 'low');
    updateCompressionTurnStatus(state, 'lore-high');
    updateCompressionTurnStatus(state, 'lore-normal');
    updateCompressionTurnStatus(state, 'lore-low');
    updateCompressionTurnStatus(state, 'continuity');

    container.appendChild(createSectionHeader(
        'Injection',
        'Final workflow step. Decide whether to inject structured Continuity state, Lore entries, or both, and whether each is direct or model-compressed.'
    ));

    const toggles = document.createElement('div');
    toggles.className = 'saga-runtime-grid';
    markTourTarget(toggles, 'injection.toggles');
    toggles.appendChild(createToggleCard(
        'Inject Continuity',
        settings.injectContinuity !== false && settings.injectMemo !== false,
        'Injects the editable lightweight Continuity state: scene/timeline, active characters, key items, and active goals/threads. Durable memory is handled by Lore entries.',
        (checked) => {
            const next = getSettings();
            next.injectContinuity = checked;
            next.injectMemo = checked;
            saveSettings(next);
            syncPromptInjectionFromCurrentSettings();
            refreshPanelBody({ preserveScroll: false });
            refreshHeader();
        }
    ));
    toggles.appendChild(createToggleCard(
        'Inject Lore',
        settings.injectLore !== false,
        'Injects accepted, unmuted Lore entries through relevance-tiered prompt groups. Turn this off if you want Saga to track/edit lore without sending lore to the roleplay model.',
        (checked) => {
            const next = getSettings();
            next.injectLore = checked;
            saveSettings(next);
            syncPromptInjectionFromCurrentSettings();
            refreshPanelBody({ preserveScroll: false });
            refreshHeader();
        }
    ));
    container.appendChild(toggles);

    const placementStatus = `${settings.injectionTransport === 'interceptor' ? 'Legacy prepend' : 'Extension Prompt'} · C ${formatPlacementSummary(settings, 'continuity')} · H ${formatPlacementSummary(settings, 'loreHigh')} · N ${formatPlacementSummary(settings, 'loreNormal')} · L ${formatPlacementSummary(settings, 'loreLow')}`;
    const placementSection = createCollapsibleSection('injection.promptPlacement', 'Prompt Placement', placementStatus, false, createInjectionPlacementCard(settings), { tooltip: 'Role, position, and depth used for prompt injection.' });
    markTourTarget(placementSection, 'injection.promptPlacement');
    container.appendChild(placementSection);

    const continuityEnabled = settings.injectContinuity !== false && settings.injectMemo !== false;
    const continuityEmptyReason = getInjectionEmptyReason('continuity', state, settings, continuityEnabled);
    container.appendChild(createCollapsibleSection(
        'injection.preview.continuity',
        'Continuity Injection Preview',
        getInjectionPreviewSectionSummary(continuityPreview, continuityEnabled),
        true,
        createInjectionPreviewCard('Continuity Injection', 'saga-continuity-injection-preview', continuityPreview, continuityEnabled, 'This is the actual Continuity block currently configured for prompt injection. It can be placed at a different depth because it is separated from Lore.', createContinuityHandlingDropdown(state, settings), continuityEmptyReason),
        { tooltip: 'Read-only preview of the Continuity prompt block Saga will inject.' }
    ));
    const highEnabled = settings.injectLore !== false && settings.loreHighInjectionEnabled !== false;
    const highEmptyReason = getInjectionEmptyReason('high', state, settings, highEnabled);
    container.appendChild(createCollapsibleSection(
        'injection.preview.loreHigh',
        'High-Relevance Lore Preview',
        getInjectionPreviewSectionSummary(loreHighPreview, highEnabled),
        true,
        createInjectionPreviewCard('High-Relevance Lore Injection', 'saga-lore-high-injection-preview', loreHighPreview, highEnabled, 'Lore injected in the high-relevance prompt group.', createLoreTierHandlingDropdown('high', state, settings), highEmptyReason),
        { tooltip: 'Read-only preview of the high-relevance Lore prompt block.' }
    ));
    const normalEnabled = settings.injectLore !== false && settings.loreNormalInjectionEnabled !== false;
    const normalEmptyReason = getInjectionEmptyReason('normal', state, settings, normalEnabled);
    container.appendChild(createCollapsibleSection(
        'injection.preview.loreNormal',
        'Normal-Relevance Lore Preview',
        getInjectionPreviewSectionSummary(loreNormalPreview, normalEnabled),
        false,
        createInjectionPreviewCard('Normal-Relevance Lore Injection', 'saga-lore-normal-injection-preview', loreNormalPreview, normalEnabled, 'Lore injected in the normal-relevance prompt group.', createLoreTierHandlingDropdown('normal', state, settings), normalEmptyReason),
        { tooltip: 'Read-only preview of the normal-relevance Lore prompt block.' }
    ));
    const lowEnabled = settings.injectLore !== false && settings.loreLowInjectionEnabled !== false;
    const lowEmptyReason = getInjectionEmptyReason('low', state, settings, lowEnabled);
    container.appendChild(createCollapsibleSection(
        'injection.preview.loreLow',
        'Low-Relevance Lore Preview',
        getInjectionPreviewSectionSummary(loreLowPreview, lowEnabled),
        false,
        createInjectionPreviewCard('Low-Relevance Lore Injection', 'saga-lore-low-injection-preview', loreLowPreview, lowEnabled, 'Lore injected in the low-relevance prompt group.', createLoreTierHandlingDropdown('low', state, settings), lowEmptyReason),
        { tooltip: 'Read-only preview of the low-relevance Lore prompt block.' }
    ));
    const compressionSection = createCollapsibleSection(
        'injection.compressionPrompts',
        'Compression Prompts',
        'Editable templates for model compression',
        false,
        createCompressionPromptEditorCard(),
        { tooltip: 'Editable prompt templates used by Compress Continuity Now and tiered Compress Lore actions.' }
    );
    markTourTarget(compressionSection, 'injection.compression');
    container.appendChild(compressionSection);
}

function getInjectionEmptyReason(kind, state, settings, enabled = true) {
    const normalizedKind = String(kind || '').toLowerCase();
    if (!enabled) {
        if (normalizedKind === 'continuity') return '(Continuity injection is disabled.)';
        if (settings.injectLore === false) return '(Lore injection is disabled.)';
        return '(This Lore relevance tier is disabled.)';
    }

    if (normalizedKind === 'continuity') {
        return '(Continuity injection has no scene, timeline, character, item, or goal data yet.)';
    }

    const loadedCount = getEnabledLoredeckStackPackIds(state).length;
    if (!loadedCount) return '(No Loredecks are loaded for Lore injection.)';

    const acceptedCount = normalizeLoreMatrix(state?.loreMatrix || []).length;
    if (!acceptedCount) return '(No Accepted Lorecards are available to inject.)';

    const candidates = getInjectableLoreEntries(state, 0, normalizedKind);
    if (candidates.length && candidates.every(entry => !getLoreEntryInjectionContextGate(entry, state).eligible)) {
        return '(All Accepted Lorecards in this relevance tier are blocked by current Context.)';
    }

    return '(No Accepted Lorecards match this relevance tier and current Context.)';
}

function getInjectionPreviewSectionSummary(text, enabled = true) {
    if (!enabled) return 'disabled';
    const clean = String(text || '').trim();
    if (!clean) return 'empty';
    return `${clean.length} chars`;
}


function createContinuityHandlingDropdown(state, settings) {
    return createCollapsibleSection(
        'injection.continuityHandling',
        'Continuity Handling',
        `${settings.continuityInjectionMode || 'direct'} · ${getCompressionStatusTextForSummary(state, 'continuity')}`,
        (settings.continuityInjectionMode || 'direct') === 'compressed',
        createContinuityHandlingCard(state, settings),
        { tooltip: 'Direct or model-compressed handling for Continuity injection.' }
    );
}

function createContinuityHandlingCard(state, settings) {
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-compression-handling-card';
    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Continuity Handling Mode';
    addTooltip(title, 'Direct sends structured continuity state. Compressed uses a cached model compression generated from the direct continuity preview.');
    card.appendChild(title);

    const buttons = document.createElement('div');
    buttons.className = 'saga-mode-buttons';
    buttons.appendChild(createContinuityModeButton('direct', 'Direct', 'Insert editable continuity state with full section detail.', settings));
    buttons.appendChild(createContinuityModeButton('compressed', 'Compressed', 'Use a saved model-compressed continuity block. If the cache is stale or missing, direct text is used until you click Compress Continuity Now.', settings));
    card.appendChild(buttons);

    card.appendChild(createCompressionLevelControl('continuity', settings));
    card.appendChild(createKeyValue('Target budget', getCompressionBudgetSummary('continuity', state), 'Compression levels set an explicit target token budget for the model request.'));
    card.appendChild(createKeyValue('Continuity status', getContinuityCompressionStatusText(getState()), 'Shows whether cached model-compressed continuity is current, stale, missing, or failed.'));

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    actions.appendChild(createButton('Compress Continuity Now', 'Uses the Utility provider to compress the direct Continuity Injection block and cache it for compressed injection.', async (btn) => {
        await runModelCompression('continuity', btn);
    }, 'saga-primary-button'));
    card.appendChild(actions);
    return card;
}

function createLoreTierHandlingDropdown(tier, state, settings) {
    const label = RELEVANCE_META[tier]?.label || tier;
    const entries = getInjectableLoreEntries(getState(), 0, tier).length;
    return createCollapsibleSection(
        `injection.lore${capTier(tier)}Handling`,
        `${label}-Relevance Lore Handling`,
        `${entries} entries · ${getLoreTierMode(settings, tier)} · ${getCompressionStatusTextForSummary(state, `lore-${tier}`)}`,
        false,
        createLoreTierHandlingCard(tier, state, settings),
        { tooltip: `Direct/compressed handling, compression level, and cache status for ${label}-Relevance Lore.` }
    );
}

function createLoreTierHandlingCard(tier, state, settings) {
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-compression-handling-card saga-lore-tier-injection-card';
    const label = RELEVANCE_META[tier]?.label || tier;
    const counts = getLoreRelevanceCounts(state);
    card.appendChild(createKeyValue('Lore available', `${counts[tier] || 0} ${label} · ${counts.muted || 0} muted total`, 'Accepted Lorecards grouped by relevance. Muted entries are excluded before injection/compression.'));

    const enabledLabel = document.createElement('label');
    enabledLabel.className = 'saga-inline-toggle';
    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = settings[tierSettingKey(tier, 'InjectionEnabled')] !== false;
    enabled.addEventListener('change', () => {
        const next = getSettings();
        next[tierSettingKey(tier, 'InjectionEnabled')] = enabled.checked;
        saveSettings(next);
        syncPromptInjectionFromCurrentSettings();
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();
    });
    enabledLabel.appendChild(enabled);
    enabledLabel.appendChild(document.createTextNode(' Enable this lore injection'));
    card.appendChild(enabledLabel);

    const buttons = document.createElement('div');
    buttons.className = 'saga-mode-buttons';
    buttons.appendChild(createLoreTierModeButton(tier, 'direct', 'Direct', 'Inject this tier as resolved lore text.'));
    buttons.appendChild(createLoreTierModeButton(tier, 'compressed', 'Compressed', 'Inject this tier from its own cached model compression.'));
    card.appendChild(buttons);

    card.appendChild(createKeyValue('Entries', String(getInjectableLoreEntries(getState(), 0, tier).length), 'Accepted, unmuted entries in this relevance tier.'));
    card.appendChild(createCompressionLevelControl(`lore-${tier}`, settings));
    card.appendChild(createKeyValue('Target budget', getCompressionBudgetSummary(`lore-${tier}`, state), 'Compression budget for this relevance tier.'));
    card.appendChild(createKeyValue('Compression status', getCompressionStatusTextForKind(getState(), `lore-${tier}`), 'Tier-specific compression cache status.'));

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    actions.appendChild(createButton(`Compress ${label} Now`, `Compresses only ${tier} relevance lore.`, async (btn) => {
        await runModelCompression(`lore-${tier}`, btn);
    }, tier === 'high' ? 'saga-primary-button' : ''));
    card.appendChild(actions);
    return card;
}

function createLoreTierModeButton(tier, mode, label, tooltip) {
    const settings = getSettings();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'saga-mode-button';
    if (getLoreTierMode(settings, tier) === mode) btn.classList.add('saga-mode-button-active');
    btn.textContent = label;
    addTooltip(btn, tooltip);
    btn.addEventListener('click', () => {
        const next = getSettings();
        next[tierSettingKey(tier, 'InjectionMode')] = mode;
        saveSettings(next);
        syncPromptInjectionFromCurrentSettings();
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();
    });
    return btn;
}


function createCompressionLevelControl(kind, settings) {
    const parsed = parseLoreCompressionKind(kind);
    const levelKey = parsed.base === 'continuity' ? 'continuityCompressionLevel' : parsed.tier ? tierSettingKey(parsed.tier, 'CompressionLevel') : 'loreCompressionLevel';
    const fallback = 3;
    const levelValue = Math.max(1, Math.min(5, Number(settings[levelKey]) || fallback));
    const label = document.createElement('label');
    label.className = 'saga-slider-row';
    const text = document.createElement('span');
    text.textContent = `Compression level: ${levelValue} (${getCompressionProfile(levelValue).label})`;
    addTooltip(text, 'Compression level changes both the wording and the target token budget for the model compression request.');
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '1';
    range.max = '5';
    range.value = String(levelValue);
    range.addEventListener('input', () => {
        const next = getSettings();
        next[levelKey] = Number(range.value) || 3;
        saveSettings(next);
        text.textContent = `Compression level: ${next[levelKey]} (${getCompressionProfile(next[levelKey]).label})`;
        refreshInjectionPreviewOnly();
    });
    label.appendChild(text);
    label.appendChild(range);
    return label;
}

function createCompressionPromptEditorCard() {
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-compression-prompt-card';
    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Compression Prompts';
    card.appendChild(title);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Variables: {{kind}}, {{compressionLevel}}, {{compressionLabel}}, {{compressionPolicy}}, {{directTokens}}, {{minimumTokens}}, {{targetTokens}}, {{maximumTokens}}, {{hardTokenLimit}}, {{directCharacters}}, {{minimumCharacters}}, {{targetCharacters}}, {{maximumCharacters}}, {{hardCharacterLimit}}, {{storyContext}}, {{directText}}.';
    card.appendChild(help);

    card.appendChild(createCompressionPromptTextarea('Continuity Compression Prompt', 'continuityCompressionPromptTemplate', DEFAULT_SETTINGS.continuityCompressionPromptTemplate));
    card.appendChild(createCompressionPromptTextarea('Lore Compression Prompt', 'loreCompressionPromptTemplate', DEFAULT_SETTINGS.loreCompressionPromptTemplate));
    return card;
}

function createCompressionPromptTextarea(labelText, settingKey, defaultValue) {
    const wrap = document.createElement('div');
    wrap.className = 'saga-compression-template-wrap';
    const label = document.createElement('div');
    label.className = 'saga-runtime-card-title saga-compression-template-title';
    label.textContent = labelText;
    addTooltip(label, `Editable template used for ${labelText}.`);
    wrap.appendChild(label);

    const textarea = document.createElement('textarea');
    textarea.className = 'saga-compression-template-editor';
    textarea.spellcheck = false;
    textarea.value = String(getSettings()[settingKey] || defaultValue || '');
    wrap.appendChild(textarea);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    actions.appendChild(createButton('Save Template', `Save ${labelText}.`, () => {
        const next = getSettings();
        next[settingKey] = textarea.value;
        saveSettings(next);
        toast(`${labelText} saved.`);
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Reset Default', `Restore Saga's default ${labelText}.`, () => {
        const next = getSettings();
        next[settingKey] = defaultValue;
        saveSettings(next);
        textarea.value = defaultValue;
        toast(`${labelText} reset to default.`, 'info');
    }));
    actions.appendChild(createButton('Copy Prompt', `Copy ${labelText} to clipboard.`, async () => {
        try {
            await navigator.clipboard?.writeText(textarea.value);
            toast(`${labelText} copied.`, 'info');
        } catch (_) {
            toast('Clipboard copy unavailable in this browser context.', 'warning');
        }
    }));
    wrap.appendChild(actions);
    return wrap;
}



function formatPlacementSummary(settings, kind) {
    const prefix = kind === 'continuity' ? 'continuity' : kind === 'loreHigh' ? 'loreHigh' : kind === 'loreNormal' ? 'loreNormal' : kind === 'loreLow' ? 'loreLow' : 'lore';
    const position = Number(settings[`${prefix}InjectionPosition`] ?? 1);
    const role = Number(settings[`${prefix}InjectionRole`] ?? 0);
    const depth = Number(settings[`${prefix}InjectionDepth`] ?? 4);
    const positionLabel = position === 1 ? 'in-chat' : (position === 2 ? 'before' : 'after');
    const roleLabel = role === 1 ? 'user' : (role === 2 ? 'assistant' : 'system');
    return `${positionLabel}@${depth}/${roleLabel}`;
}

function getCompressionProfile(level) {
    const profiles = {
        1: { label: 'Light', targetRatio: 0.8, minimumRatio: 0.55, maximumRatio: 0.98, hardMaximumRatio: 1, description: 'preserve most details; remove redundancy only' },
        2: { label: 'Moderate', targetRatio: 0.6, minimumRatio: 0.38, maximumRatio: 0.82, hardMaximumRatio: 1, description: 'preserve important entries while shortening descriptions' },
        3: { label: 'Balanced', targetRatio: 0.4, minimumRatio: 0.22, maximumRatio: 0.65, hardMaximumRatio: 1, description: 'keep roleplay-relevant facts and current-scene implications' },
        4: { label: 'Heavy', targetRatio: 0.2, minimumRatio: 0.08, maximumRatio: 0.45, hardMaximumRatio: 1, description: 'short bullets; preserve critical secrets, constraints, and protected details' },
        5: { label: 'Maximum', targetRatio: 0.1, minimumRatio: 0.03, maximumRatio: 0.3, hardMaximumRatio: 1, description: 'maximum compression; only essential facts, constraints, secrets, and hazards' },
    };
    return profiles[Math.max(1, Math.min(5, Number(level) || 2))] || profiles[2];
}

function estimateTokenBudgetForCompression(text, level) {
    const source = String(text || '');
    const directTokens = estimateTokens(source);
    const directCharacters = source.length;
    const profile = getCompressionProfile(level);
    const minimumTokens = Math.max(1, Math.ceil(directTokens * profile.minimumRatio));
    const targetTokens = Math.max(1, Math.ceil(directTokens * profile.targetRatio));
    const maximumTokens = Math.max(targetTokens, Math.ceil(directTokens * profile.maximumRatio));
    const hardTokenLimit = Math.max(maximumTokens, Math.ceil(directTokens * (profile.hardMaximumRatio || 1)));
    const minimumCharacters = Math.max(1, Math.ceil(directCharacters * profile.minimumRatio));
    const targetCharacters = Math.max(1, Math.ceil(directCharacters * profile.targetRatio));
    const maximumCharacters = Math.max(targetCharacters, Math.ceil(directCharacters * profile.maximumRatio));
    const hardCharacterLimit = Math.max(maximumCharacters, Math.ceil(directCharacters * (profile.hardMaximumRatio || 1)));
    return {
        directTokens,
        directCharacters,
        minimumTokens,
        targetTokens,
        maximumTokens,
        hardTokenLimit,
        minimumCharacters,
        targetCharacters,
        maximumCharacters,
        hardCharacterLimit,
        profile,
    };
}

function getCompressionBudgetSummary(kind, state) {
    const settings = getSettings();
    const parsed = parseLoreCompressionKind(kind);
    const level = parsed.base === 'continuity'
        ? Math.max(1, Math.min(5, Number(settings.continuityCompressionLevel) || 3))
        : parsed.tier ? getLoreTierLevel(settings, parsed.tier) : Math.max(1, Math.min(5, Number(settings.loreCompressionLevel) || 3));
    const directText = parsed.base === 'continuity'
        ? buildContinuityPreview(state, 'direct')
        : parsed.tier ? buildLorePreview(state, 'direct', parsed.tier) : buildLorePreview(state, 'direct');
    if (!directText || !directText.trim()) return 'No source text';
    const budget = estimateTokenBudgetForCompression(directText, level);
    return `~${budget.targetTokens} tokens / ${budget.targetCharacters} chars target; preferred range ${budget.minimumTokens}-${budget.maximumTokens} tokens / ${budget.minimumCharacters}-${budget.maximumCharacters} chars from ~${budget.directTokens} tokens / ${budget.directCharacters} chars`;
}

function getCompressionStatusTextForSummary(state, kind) {
    const parsed = parseLoreCompressionKind(kind);
    const status = parsed.base === 'continuity' ? getContinuityCompressionStatusText(state) : getCompressionStatusTextForKind(state, kind);
    if (/Direct mode active/i.test(status)) return 'direct';
    if (/current/i.test(status) || /model-compressed/i.test(status)) return 'current cache';
    if (/stale/i.test(status)) return 'stale cache';
    if (/missing|No cached/i.test(status)) return 'no cache';
    return status.slice(0, 40);
}

function getPromptInjectionApi() {
    const promptInjection = globalThis.Saga?.promptInjection;
    return {
        getStatus: typeof promptInjection?.getStatus === 'function'
            ? promptInjection.getStatus
            : null,
        sync: typeof promptInjection?.sync === 'function'
            ? promptInjection.sync
            : null,
    };
}

function createInjectionPlacementCard(settings) {
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-prompt-placement-card';
    markTourTarget(card, 'injection.placement.card');

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Prompt Placement';
    addTooltip(title, 'Controls how Saga injects Continuity and Lore into SillyTavern prompts. Extension Prompt mode uses SillyTavern role/depth injection; Interceptor mode prepends a combined block to the last user message.');
    card.appendChild(title);

    appendSettingsResetButton(card, PROMPT_PLACEMENT_SETTING_KEYS, 'Prompt placement settings');

    const placement = document.createElement('div');
    placement.className = 'saga-prompt-placement-lines';

    const methodRow = document.createElement('div');
    methodRow.className = 'saga-prompt-placement-line saga-prompt-placement-method-line';
    markTourTarget(methodRow, 'injection.placement.method');
    methodRow.appendChild(createPlacementSelect('Injection method', 'injectionTransport', settings.injectionTransport || 'extension_prompt', [
        ['extension_prompt', 'Extension Prompt'],
        ['interceptor', 'Legacy prepend'],
    ], 'Extension Prompt uses SillyTavern setExtensionPrompt and supports role/depth. Interceptor mode appears as part of the last user message.', 'saga-placement-method'));
    placement.appendChild(methodRow);

    placement.appendChild(createPromptPlacementLine('Continuity', [
        createPlacementSelect('Position', 'continuityInjectionPosition', String(settings.continuityInjectionPosition ?? 1), [
            ['1', 'In-chat'],
            ['0', 'After prompt'],
            ['2', 'Before prompt'],
        ], 'Where the Continuity Injection block is inserted. Depth only applies to In-chat.', 'saga-placement-position'),
        createPlacementNumber('Depth', 'continuityInjectionDepth', settings.continuityInjectionDepth ?? 3, 0, 1000, 'Depth 0 is closest to the latest message. Higher depth moves the block earlier in chat history.', 'saga-placement-depth'),
        createPlacementSelect('Role', 'continuityInjectionRole', String(settings.continuityInjectionRole ?? 0), [
            ['0', 'System'],
            ['1', 'User'],
            ['2', 'Assistant'],
        ], 'Role used for the injected Continuity block when using In-chat extension prompt placement.', 'saga-placement-role'),
    ]));

    for (const [tier, label, depth] of [['high', 'High-Relevance Lore', 2], ['normal', 'Normal-Relevance Lore', 5], ['low', 'Low-Relevance Lore', 9]]) {
        placement.appendChild(createPromptPlacementLine(label, [
            createPlacementSelect('Position', tierSettingKey(tier, 'InjectionPosition'), String(settings[tierSettingKey(tier, 'InjectionPosition')] ?? 1), [
                ['1', 'In-chat'],
                ['0', 'After prompt'],
                ['2', 'Before prompt'],
            ], `Where the ${label} block is inserted. Depth only applies to In-chat.`, 'saga-placement-position'),
            createPlacementNumber('Depth', tierSettingKey(tier, 'InjectionDepth'), settings[tierSettingKey(tier, 'InjectionDepth')] ?? depth, 0, 1000, 'Depth 0 is closest to the latest message. Higher depth moves the block earlier in chat history.', 'saga-placement-depth'),
            createPlacementSelect('Role', tierSettingKey(tier, 'InjectionRole'), String(settings[tierSettingKey(tier, 'InjectionRole')] ?? 0), [
                ['0', 'System'],
                ['1', 'User'],
                ['2', 'Assistant'],
            ], `Role used for ${label}.`, 'saga-placement-role'),
        ]));
    }

    card.appendChild(placement);

    const promptInjection = getPromptInjectionApi();
    const status = promptInjection.getStatus ? promptInjection.getStatus() : null;
    card.appendChild(createPromptInjectionStatusRow(status));

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    actions.appendChild(createButton('Sync Injection Now', 'Immediately updates SillyTavern extension prompts from the current Continuity and Lore previews.', () => {
        const syncPromptInjection = getPromptInjectionApi().sync;
        if (typeof syncPromptInjection === 'function') {
            const info = syncPromptInjection();
            refreshPromptInjectionStatusUi(info);
            toast(`Synced injection: ${info.transport}, continuity ${info.continuityChars || 0} chars, lore ${info.loreChars || 0} chars.`, 'info');
        } else {
            toast('Saga prompt sync function is not available.', 'error');
        }
    }));
    card.appendChild(actions);

    return card;
}

function getPromptInjectionStatusText(status = null) {
    return status
        ? `${status.transport || 'unknown'} | continuity ${status.continuityChars || 0} chars | high ${status.loreHighChars || 0} chars | normal ${status.loreNormalChars || 0} chars | low ${status.loreLowChars || 0} chars`
        : 'Prompt sync status unavailable until extension initialization completes.';
}

function getPromptInjectionStatusTone(status = null) {
    return status ? 'source' : 'muted';
}

function createPromptInjectionStatusRow(status = null) {
    const row = createKeyValue('Current sync', '', 'Shows the last Saga prompt sync result.');
    row.classList.add('saga-prompt-sync-status');
    const value = row.querySelector('.saga-value');
    const chip = createStatusPill(getPromptInjectionStatusText(status), 'Shows the last Saga prompt sync result.', {
        tone: getPromptInjectionStatusTone(status),
        kind: status ? 'source' : 'status',
        density: 'compact',
        className: 'saga-prompt-sync-status-value',
        maxChars: 84,
    });
    value?.replaceWith(chip);
    return row;
}

function refreshPromptInjectionStatusUi(status = null) {
    const row = getPanelRoot()?.querySelector('.saga-prompt-sync-status');
    const value = row?.querySelector('.saga-prompt-sync-status-value');
    if (!value) return false;
    const nextStatus = status || getPromptInjectionApi().getStatus?.() || null;
    value.textContent = getPromptInjectionStatusText(nextStatus);
    value.dataset.sagaTooltip = 'Shows the last Saga prompt sync result.';
    value.setAttribute('aria-label', 'Shows the last Saga prompt sync result.');
    setChipTone(value, getPromptInjectionStatusTone(nextStatus));
    return true;
}

function syncPromptInjectionFromCurrentSettings() {
    const syncPromptInjection = getPromptInjectionApi().sync;
    if (typeof syncPromptInjection !== 'function') return null;
    const info = syncPromptInjection();
    refreshPromptInjectionStatusUi(info);
    return info;
}

function createPromptPlacementLine(labelText, controls) {
    const row = document.createElement('div');
    row.className = 'saga-prompt-placement-line';

    const label = document.createElement('div');
    label.className = 'saga-prompt-placement-line-label';
    label.textContent = labelText;
    addTooltip(label, `${labelText} prompt placement settings.`);
    row.appendChild(label);

    const controlWrap = document.createElement('div');
    controlWrap.className = 'saga-prompt-placement-control-wrap';
    for (const control of controls) {
        controlWrap.appendChild(control);
    }
    row.appendChild(controlWrap);

    return row;
}

function createPlacementSelect(labelText, settingKey, value, options, tooltip, extraClass = '') {
    const label = document.createElement('label');
    label.className = `saga-inline-field ${extraClass}`.trim();
    const span = document.createElement('span');
    span.textContent = labelText;
    addTooltip(span, tooltip);
    const select = document.createElement('select');
    select.value = String(value);
    for (const [optionValue, optionLabel] of options) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionLabel;
        select.appendChild(option);
    }
    select.value = String(value);
    select.addEventListener('change', () => {
        const next = getSettings();
        if (settingKey.endsWith('Position') || settingKey.endsWith('Role')) {
            next[settingKey] = Number(select.value);
        } else {
            next[settingKey] = select.value;
        }
        saveSettings(next);
        syncPromptInjectionFromCurrentSettings();
        refreshPanelBody({ preserveScroll: false });
    });
    label.appendChild(span);
    label.appendChild(select);
    return label;
}

function createPlacementNumber(labelText, settingKey, value, min, max, tooltip, extraClass = '') {
    const label = document.createElement('label');
    label.className = `saga-inline-field ${extraClass}`.trim();
    const span = document.createElement('span');
    span.textContent = labelText;
    addTooltip(span, tooltip);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.addEventListener('change', () => {
        const next = getSettings();
        next[settingKey] = Math.max(min, Math.min(max, parseInt(input.value, 10) || Number(value) || 0));
        saveSettings(next);
        syncPromptInjectionFromCurrentSettings();
        refreshPanelBody({ preserveScroll: false });
    });
    label.appendChild(span);
    label.appendChild(input);
    return label;
}

function createInjectionPreviewCard(titleText, className, text, enabled, helpText, extraContent = null, emptyReason = '') {
    const previewCard = document.createElement('div');
    previewCard.className = 'saga-runtime-card saga-injection-preview-card';
    if (String(className || '').includes('continuity')) markTourTarget(previewCard, 'injection.preview.continuity');
    else if (String(className || '').includes('lore-high')) markTourTarget(previewCard, 'injection.preview.high');
    else if (String(className || '').includes('lore-normal')) markTourTarget(previewCard, 'injection.preview.normal');
    else if (String(className || '').includes('lore-low')) markTourTarget(previewCard, 'injection.preview.low');
    const previewTitle = document.createElement('div');
    previewTitle.className = 'saga-runtime-card-title';
    previewTitle.textContent = titleText;
    addTooltip(previewTitle, helpText);
    previewCard.appendChild(previewTitle);

    const previewHelp = document.createElement('div');
    previewHelp.className = 'saga-runtime-help';
    previewHelp.textContent = enabled
        ? helpText
        : `${titleText} is currently disabled. This panel shows what would be injected if enabled.`;
    previewCard.appendChild(previewHelp);

    const pre = document.createElement('pre');
    pre.className = `saga-injection-preview ${className}`;
    pre.textContent = getInjectionDisplayText(titleText, text, enabled, emptyReason);
    addTooltip(pre, 'Scrollable prompt context block. This text is ephemeral and is not written into chat history.');
    previewCard.appendChild(pre);

    if (extraContent) previewCard.appendChild(extraContent);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    actions.appendChild(createButton('Refresh Injection Text', 'Rebuilds both split injection blocks from current state and settings.', () => {
        refreshInjectionPreviewOnly();
        toast('Injection text refreshed.', 'info');
    }));
    previewCard.appendChild(actions);
    return previewCard;
}

function getInjectionDisplayText(titleText, text, enabled = true, emptyReason = '') {
    const clean = String(text || '').trim();
    if (clean) return clean;
    if (emptyReason) return emptyReason;
    const lower = String(titleText || '').toLowerCase();
    if (lower.includes('lore')) return enabled ? '(No lore data to inject.)' : '(Lore injection is disabled.)';
    if (lower.includes('continuity')) return enabled ? '(No continuity data to inject.)' : '(Continuity injection is disabled.)';
    return '(No data to inject.)';
}

function refreshInjectionPreviewOnly() {
    const state = getState();
    const settings = getSettings();
    const continuity = buildContinuityPreview(state, settings.continuityInjectionMode || 'direct');
    const loreHigh = buildLorePreview(state, getLoreTierMode(settings, 'high'), 'high');
    const loreNormal = buildLorePreview(state, getLoreTierMode(settings, 'normal'), 'normal');
    const loreLow = buildLorePreview(state, getLoreTierMode(settings, 'low'), 'low');
    updateCompressionTurnStatus(state, 'continuity');
    updateCompressionTurnStatus(state, 'lore-high');
    updateCompressionTurnStatus(state, 'lore-normal');
    updateCompressionTurnStatus(state, 'lore-low');

    const continuityPre = getPanelRoot()?.querySelector('.saga-continuity-injection-preview');
    if (continuityPre) {
        const enabled = settings.injectContinuity !== false && settings.injectMemo !== false;
        continuityPre.textContent = getInjectionDisplayText('Continuity Injection', continuity, enabled, getInjectionEmptyReason('continuity', state, settings, enabled));
    }

    const loreHighPre = getPanelRoot()?.querySelector('.saga-lore-high-injection-preview');
    if (loreHighPre) {
        const enabled = settings.injectLore !== false && settings.loreHighInjectionEnabled !== false;
        loreHighPre.textContent = getInjectionDisplayText('High-Relevance Lore Injection', loreHigh, enabled, getInjectionEmptyReason('high', state, settings, enabled));
    }
    const loreNormalPre = getPanelRoot()?.querySelector('.saga-lore-normal-injection-preview');
    if (loreNormalPre) {
        const enabled = settings.injectLore !== false && settings.loreNormalInjectionEnabled !== false;
        loreNormalPre.textContent = getInjectionDisplayText('Normal-Relevance Lore Injection', loreNormal, enabled, getInjectionEmptyReason('normal', state, settings, enabled));
    }
    const loreLowPre = getPanelRoot()?.querySelector('.saga-lore-low-injection-preview');
    if (loreLowPre) {
        const enabled = settings.injectLore !== false && settings.loreLowInjectionEnabled !== false;
        loreLowPre.textContent = getInjectionDisplayText('Low-Relevance Lore Injection', loreLow, enabled, getInjectionEmptyReason('low', state, settings, enabled));
    }

    const syncPromptInjection = getPromptInjectionApi().sync;
    if (typeof syncPromptInjection === 'function') {
        const info = syncPromptInjection();
        refreshPromptInjectionStatusUi(info);
    }
}

function updateCompressionTurnStatus(state, kind = 'lore') {
    if (!state) return;
    const parsed = parseLoreCompressionKind(kind);
    let status = null;
    if (parsed.base === 'continuity') status = state.continuityCompressionStatus;
    else if (parsed.tier) status = state.loreCompressionStatusByRelevance?.[parsed.tier];
    else status = state.loreCompressionStatus;
    if (!status?.lastCompressedAt) return;
    const chatLength = getChatLength();
    status.turnsSinceCompression = Math.max(0, chatLength - Number(status.lastChatLength || chatLength));
    saveState(state);
}

async function runModelCompression(kind = 'lore', btn = null) {
    const settings = getSettings();
    // Compression is a frequent transformation task, so it is routed through the
    // Utility provider. Internal key remains `continuity` for backward-compatible
    // settings storage; the UI presents this provider role as Utility.
    const providerKind = 'continuity';
    const validation = validateLoreProviderConfiguration(providerKind);
    if (!validation.ok) {
        toast(`${kind === 'continuity' ? 'Continuity' : 'Lore'} compression blocked: Utility provider unavailable: ${validation.message}`, 'error');
        return null;
    }

    const originalText = btn?.textContent || '';
    if (btn) {
        btn.disabled = true;
        const parsedKindForLabel = parseLoreCompressionKind(kind);
        btn.textContent = parsedKindForLabel.base === 'continuity' ? 'Compressing continuity...' : `Compressing ${parsedKindForLabel.tier || ''} lore...`;
    }

    try {
        const state = getState();
        const parsedKind = parseLoreCompressionKind(kind);
        const directText = parsedKind.base === 'continuity'
            ? buildContinuityPreview(state, 'direct')
            : parsedKind.tier
                ? buildLorePreview(state, 'direct', parsedKind.tier)
                : buildLorePreview(state, 'direct');

        if (!directText || !directText.trim()) {
            toast(`${parsedKind.base === 'continuity' ? 'Continuity' : 'Lore'} preview is empty; nothing to compress.`, 'warning');
            return null;
        }

        const level = parsedKind.base === 'continuity'
            ? Math.max(1, Math.min(5, Number(settings.continuityCompressionLevel) || 3))
            : parsedKind.tier
                ? getLoreTierLevel(settings, parsedKind.tier)
                : Math.max(1, Math.min(5, Number(settings.loreCompressionLevel) || 3));

        const context = JSON.stringify({
            sceneDate: state?.loreContext?.sceneDate || state?.canon?.inUniverseDate || '',
            canonBoundary: state?.loreContext?.canonBoundary || state?.canon?.canonBoundary || '',
            branchId: state?.loreContext?.branchId || 'main',
            scene: state?.scene || {},
        }, null, 2);

        const budget = estimateTokenBudgetForCompression(directText, level);
        const compressionPrompt = buildCompressionPrompt(kind, level, context, directText, budget);
        const compressed = await sendLoreRequest(
            'You are Saga Compression. Compress the source into a shorter visible plain-text injection block. Output only that block. Do not use markdown fences, JSON, reasoning, or commentary.',
            compressionPrompt,
            {
                providerKind,
                maxTokens: Math.max(512, Math.min(8192, Math.ceil(budget.hardTokenLimit * 3))),
                prefill: '',
                expectedOutput: 'text',
                task: 'compression',
            }
        );

        const candidates = [];
        const firstCleaned = cleanCompressedText(compressed);
        const firstEvaluation = validateCompressedText(firstCleaned, directText, budget, level);
        candidates.push({ attempt: 1, label: 'first', text: firstCleaned, evaluation: firstEvaluation });

        if (shouldRetryCompression(firstEvaluation, directText, level)) {
            const retryPrompt = buildCompressionRetryPrompt(kind, level, context, directText, firstCleaned, budget, firstEvaluation.message);
            const retry = await sendLoreRequest(
                COMPRESSION_RETRY_SYSTEM_PROMPT,
                retryPrompt,
                {
                    providerKind,
                    maxTokens: Math.max(512, Math.min(8192, Math.ceil(budget.hardTokenLimit * 3))),
                    prefill: '',
                    expectedOutput: 'text',
                    task: 'compression',
                }
            );
            const retryCleaned = cleanCompressedText(retry);
            const retryEvaluation = validateCompressedText(retryCleaned, directText, budget, level);
            candidates.push({ attempt: 2, label: 'retry', text: retryCleaned, evaluation: retryEvaluation });
        }

        const selectedCandidate = selectBestCompressionCandidate(candidates);
        if (!selectedCandidate) {
            throw new Error(candidates.find(candidate => candidate?.evaluation?.message)?.evaluation?.message || 'Compression returned no usable visible text.');
        }
        const cleaned = selectedCandidate.text;
        const selectedEvaluation = selectedCandidate.evaluation;

        const freshState = getState();
        let statusKey = parsedKind.base === 'continuity' ? 'continuityCompressionStatus' : 'loreCompressionStatus';
        let statusTarget = null;
        if (parsedKind.base === 'continuity') {
            if (!freshState.continuityCompressionStatus) freshState.continuityCompressionStatus = {};
            statusTarget = freshState.continuityCompressionStatus;
        } else if (parsedKind.tier) {
            if (!freshState.loreCompressionStatusByRelevance) freshState.loreCompressionStatusByRelevance = {};
            if (!freshState.loreCompressionStatusByRelevance[parsedKind.tier]) freshState.loreCompressionStatusByRelevance[parsedKind.tier] = {};
            statusTarget = freshState.loreCompressionStatusByRelevance[parsedKind.tier];
            statusKey = `loreCompressionStatusByRelevance.${parsedKind.tier}`;
        } else {
            if (!freshState.loreCompressionStatus) freshState.loreCompressionStatus = {};
            statusTarget = freshState.loreCompressionStatus;
        }
        const compressedTokens = estimateTokens(cleaned);
        const nextStatus = {
            ...statusTarget,
            lastCompressedAt: Date.now(),
            lastSignature: getCompressionSourceSignature(freshState, kind, directText, settings),
            lastMode: 'compressed',
            lastTokenEstimate: compressedTokens,
            lastCharacterCount: cleaned.length,
            lastDirectTokenEstimate: budget.directTokens,
            lastDirectCharacterCount: budget.directCharacters,
            lastMinimumTokenEstimate: budget.minimumTokens,
            lastMinimumCharacterCount: budget.minimumCharacters,
            lastTargetTokenEstimate: budget.targetTokens,
            lastTargetCharacterCount: budget.targetCharacters,
            lastMaximumTokenEstimate: budget.maximumTokens,
            lastMaximumCharacterCount: budget.maximumCharacters,
            lastHardTokenLimit: budget.hardTokenLimit,
            lastHardCharacterLimit: budget.hardCharacterLimit,
            lastCompressionRatio: budget.directCharacters ? Number((cleaned.length / budget.directCharacters).toFixed(3)) : 0,
            lastCompressionBandStatus: selectedEvaluation.bandStatus,
            lastCompressionBandMessage: selectedEvaluation.message,
            lastCompressionAttemptCount: candidates.length,
            lastCompressionSelectedAttempt: selectedCandidate.attempt,
            lastCompressionScore: Number(selectedEvaluation.score.toFixed(4)),
            turnsSinceCompression: 0,
            lastChatLength: getChatLength(),
            cachedText: cleaned,
            lastError: '',
        };
        if (parsedKind.base === 'continuity') freshState.continuityCompressionStatus = nextStatus;
        else if (parsedKind.tier) freshState.loreCompressionStatusByRelevance[parsedKind.tier] = nextStatus;
        else freshState.loreCompressionStatus = nextStatus;
        saveState(freshState);
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        const bandNote = selectedEvaluation.inPreferredBand ? '' : ' Closest result is outside the preferred range.';
        toast(`${parsedKind.base === 'continuity' ? 'Continuity' : parsedKind.tier ? `${RELEVANCE_META[parsedKind.tier]?.label || parsedKind.tier} lore` : 'Lore'} compression updated: ${compressedTokens} tokens / ${cleaned.length} chars from ${budget.directTokens} tokens / ${budget.directCharacters} chars.${bandNote}`);
        return cleaned;
    } catch (e) {
        const freshState = getState();
        const parsedKind = parseLoreCompressionKind(kind);
        let status = parsedKind.base === 'continuity' ? freshState.continuityCompressionStatus : parsedKind.tier ? freshState.loreCompressionStatusByRelevance?.[parsedKind.tier] : freshState.loreCompressionStatus;
        if (status) {
            status.lastError = e?.message || String(e);
            saveState(freshState);
        }
        toast(`${kind === 'continuity' ? 'Continuity' : 'Lore'} compression failed: ${e?.message || e}`, 'error');
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        return null;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}


function validateCompressedText(cleaned, directText, budget, level) {
    const text = String(cleaned || '').trim();
    const source = String(directText || '');
    const sourceChars = source.length;
    const outputChars = text.length;
    const outputTokens = estimateTokens(text);
    const outputRatio = sourceChars ? outputChars / sourceChars : outputChars ? 1 : 0;
    const tokenRatio = budget.directTokens ? outputTokens / budget.directTokens : outputTokens ? 1 : 0;
    const targetRatio = Number(budget?.profile?.targetRatio) || 0;
    const score = Math.abs(outputRatio - targetRatio);
    const base = {
        ok: true,
        hardFailure: false,
        inPreferredBand: true,
        bandStatus: 'in_preferred_range',
        message: 'Compression is inside the preferred range.',
        outputChars,
        outputTokens,
        outputRatio,
        tokenRatio,
        score,
    };
    if (!text) {
        return {
            ...base,
            ok: false,
            hardFailure: true,
            inPreferredBand: false,
            bandStatus: 'empty',
            message: 'Compression returned empty visible text.',
            score: Number.POSITIVE_INFINITY,
        };
    }
    if (sourceChars >= 900 && outputChars > budget.hardCharacterLimit) {
        return {
            ...base,
            ok: false,
            hardFailure: true,
            inPreferredBand: false,
            bandStatus: 'hard_too_long',
            message: `Compressed output is too long: ${outputChars} chars; hard limit is ${budget.hardCharacterLimit} chars.`,
            score: Number.POSITIVE_INFINITY,
        };
    }
    if (budget.directTokens >= 220 && outputTokens > Math.ceil(budget.hardTokenLimit * 1.1)) {
        return {
            ...base,
            ok: false,
            hardFailure: true,
            inPreferredBand: false,
            bandStatus: 'hard_too_long',
            message: `Compressed output is too long: ~${outputTokens} tokens; hard limit is ~${budget.hardTokenLimit} tokens.`,
            score: Number.POSITIVE_INFINITY,
        };
    }
    if (sourceChars > 0 && outputChars < budget.minimumCharacters) {
        return {
            ...base,
            inPreferredBand: false,
            bandStatus: 'below_preferred_range',
            message: `Compression level ${level} is below the preferred ${budget.profile.label} range: ${outputChars} chars from ${sourceChars} chars; preferred minimum is ${budget.minimumCharacters} chars.`,
        };
    }
    if (sourceChars > 0 && outputChars > budget.maximumCharacters) {
        return {
            ...base,
            inPreferredBand: false,
            bandStatus: 'above_preferred_range',
            message: `Compression level ${level} is above the preferred ${budget.profile.label} range: ${outputChars} chars from ${sourceChars} chars; preferred maximum is ${budget.maximumCharacters} chars.`,
        };
    }
    return base;
}

function shouldRetryCompression(result, directText, level) {
    if (result?.ok && result?.inPreferredBand) return false;
    return Boolean(String(directText || '').trim()) || level >= 3;
}

function selectBestCompressionCandidate(candidates = []) {
    return [...candidates]
        .filter(candidate => candidate?.evaluation?.ok && String(candidate.text || '').trim())
        .sort((a, b) => {
            const bandA = a.evaluation.inPreferredBand ? 0 : 1;
            const bandB = b.evaluation.inPreferredBand ? 0 : 1;
            if (bandA !== bandB) return bandA - bandB;
            const scoreA = Number.isFinite(a.evaluation.score) ? a.evaluation.score : Number.POSITIVE_INFINITY;
            const scoreB = Number.isFinite(b.evaluation.score) ? b.evaluation.score : Number.POSITIVE_INFINITY;
            if (scoreA !== scoreB) return scoreA - scoreB;
            return Number(a.attempt || 0) - Number(b.attempt || 0);
        })[0] || null;
}

function buildCompressionRetryPrompt(kind, level, context, directText, previousOutput, budget, reason) {
    const parsedKind = parseLoreCompressionKind(kind);
    const kindLabel = parsedKind.base === 'continuity' ? 'Continuity State' : parsedKind.tier ? `${RELEVANCE_META[parsedKind.tier]?.label || parsedKind.tier} Relevance Lorecards` : 'Lorecards';
    return `Compress the Saga ${kindLabel} injection again. The previous output missed the preferred range: ${reason}

Preferred visible-output range:
- Source: about ${budget.directTokens} tokens / ${budget.directCharacters} characters.
- Target: about ${budget.targetTokens} tokens / ${budget.targetCharacters} characters.
- Minimum preferred: ${budget.minimumTokens} tokens / ${budget.minimumCharacters} characters.
- Maximum preferred: ${budget.maximumTokens} tokens / ${budget.maximumCharacters} characters.
- Compression level ${level} (${budget.profile.label}): ${budget.profile.description}.
- If the previous output was too short, restore supporting facts until it approaches the preferred range without adding new facts.
- If the previous output was too long, remove lower-value wording while preserving protected lore.

Context:
${context}

Previous output outside the preferred range:
${previousOutput || '(empty)'}

Direct injection block to compress:
${directText}

Output only the corrected compressed injection text. No markdown fences, JSON, reasoning, or commentary.`;
}

function buildCompressionPrompt(kind, level, context, directText, budget = null) {
    const settings = getSettings();
    const parsedKind = parseLoreCompressionKind(kind);
    const kindLabel = parsedKind.base === 'continuity' ? 'Continuity State' : parsedKind.tier ? `${RELEVANCE_META[parsedKind.tier]?.label || parsedKind.tier} Relevance Lorecards` : 'Lorecards';
    const computedBudget = budget || estimateTokenBudgetForCompression(directText, level);
    const templateKey = parsedKind.base === 'continuity' ? 'continuityCompressionPromptTemplate' : 'loreCompressionPromptTemplate';
    const fallbackTemplate = parsedKind.base === 'continuity'
        ? DEFAULT_SETTINGS.continuityCompressionPromptTemplate
        : DEFAULT_SETTINGS.loreCompressionPromptTemplate;
    const template = String(settings[templateKey] || fallbackTemplate || '');
    const vars = {
        kind: kindLabel,
        compressionLevel: String(level),
        compressionLabel: computedBudget.profile.label,
        compressionPolicy: computedBudget.profile.description,
        directTokens: String(computedBudget.directTokens),
        minimumTokens: String(computedBudget.minimumTokens),
        targetTokens: String(computedBudget.targetTokens),
        maximumTokens: String(computedBudget.maximumTokens),
        hardTokenLimit: String(computedBudget.hardTokenLimit),
        directCharacters: String(computedBudget.directCharacters),
        minimumCharacters: String(computedBudget.minimumCharacters),
        targetCharacters: String(computedBudget.targetCharacters),
        maximumCharacters: String(computedBudget.maximumCharacters),
        hardCharacterLimit: String(computedBudget.hardCharacterLimit),
        storyContext: context,
        directText,
    };
    const rendered = template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : '');
    if (/{{\s*(minimumCharacters|maximumCharacters|minimumTokens|maximumTokens|compressionPolicy)\s*}}/i.test(template)) return rendered;
    // Preserve older/custom advanced templates, but append dynamic length
    // guidance that keeps the slider tiers from collapsing into one size.
    return `${rendered}

Compression target guidance:
- Source length: about ${vars.directTokens} tokens / ${vars.directCharacters} characters.
- Compression level ${vars.compressionLevel} (${vars.compressionLabel}): ${vars.compressionPolicy}.
- Target length: about ${vars.targetTokens} tokens / ${vars.targetCharacters} characters.
- Preferred range: ${vars.minimumTokens}-${vars.maximumTokens} tokens / ${vars.minimumCharacters}-${vars.maximumCharacters} characters.
- Try not to compress below the preferred range; restore useful details if the output is too short.
- Try not to exceed the preferred range; remove lower-value wording if the output is too long.
- If information must be sacrificed, preserve active continuity constraints, secrets, knowledge boundaries, Elevated/protected details, and current-scene hazards first.
- Output only the compressed injection text.`;
}


function cleanCompressedText(text) {
    let cleaned = extractLoreResponseText(text)
        .replace(/```(?:text|markdown)?\s*([\s\S]*?)```/i, '$1')
        .trim();
    if (/^\{[\s\S]*\}$/.test(cleaned)) {
        try {
            const parsed = JSON.parse(cleaned);
            cleaned = String(parsed.compressedText || parsed.compressed || parsed.text || parsed.content || parsed.message || cleaned).trim();
        } catch (_) {}
    }
    return cleaned;
}

export const __injectionPreviewTestHooks = Object.freeze({
    cleanCompressedText,
    getCompressionProfile,
    estimateTokenBudgetForCompression,
    validateCompressedText,
    selectBestCompressionCandidate,
    buildCompressionPrompt,
    COMPRESSION_RETRY_SYSTEM_PROMPT,
});

function parseLoreCompressionKind(kind = 'lore') {
    const raw = String(kind || 'lore').toLowerCase().replace(/_/g, '-');
    if (raw === 'continuity') return { base: 'continuity', tier: '' };
    if (raw.includes('high')) return { base: 'lore', tier: 'high' };
    if (raw.includes('normal')) return { base: 'lore', tier: 'normal' };
    if (raw.includes('low')) return { base: 'lore', tier: 'low' };
    return { base: 'lore', tier: '' };
}
function capTier(tier) { return tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : ''; }
function tierSettingKey(tier, suffix) { return tier ? `lore${capTier(tier)}${suffix}` : `lore${suffix}`; }
function getCompressionStatusObjectForKind(state, kind = 'lore') {
    const parsed = parseLoreCompressionKind(kind);
    if (parsed.base === 'continuity') return state?.continuityCompressionStatus || {};
    if (parsed.tier) return state?.loreCompressionStatusByRelevance?.[parsed.tier] || {};
    return state?.loreCompressionStatus || {};
}
function getCompressionStatusKeyForKind(kind = 'lore') {
    const parsed = parseLoreCompressionKind(kind);
    if (parsed.base === 'continuity') return 'continuityCompressionStatus';
    if (parsed.tier) return `loreCompressionStatusByRelevance.${parsed.tier}`;
    return 'loreCompressionStatus';
}
function getLoreTierMode(settings, tier) { return settings[tierSettingKey(tier, 'InjectionMode')] || (tier === 'high' ? 'direct' : 'compressed'); }
function getLoreTierLevel(settings, tier) { return Math.max(1, Math.min(5, Number(settings[tierSettingKey(tier, 'CompressionLevel')]) || 3)); }

function getCompressionStatusTextForKind(state, kind = 'lore') {
    const settings = getSettings();
    const parsed = parseLoreCompressionKind(kind);
    if (parsed.base === 'continuity') return getContinuityCompressionStatusText(state);
    if (parsed.tier && getLoreTierMode(settings, parsed.tier) !== 'compressed') return 'Direct mode active; compression not used.';
    if (!parsed.tier && (settings.loreInjectionMode || 'direct') !== 'compressed') return 'Direct mode active; compression not used.';
    const status = getCompressionStatusObjectForKind(state, kind);
    const direct = parsed.tier ? buildLorePreview(state, 'direct', parsed.tier) : buildLorePreview(state, 'direct');
    const currentSignature = getCompressionSourceSignature(state, kind, direct);
    if (status.lastSignature !== currentSignature) {
        return status.lastError ? `cached compression is stale; last error: ${status.lastError}` : 'Cached compression is missing or stale. Click Compress Now.';
    }
    if (status.lastError) return `last compression failed: ${status.lastError}`;
    if (!status.lastCompressedAt) return 'No cached model compression yet. Click Compress Now.';
    const when = new Date(status.lastCompressedAt).toLocaleTimeString();
    return `model-compressed ${when}; ${status.turnsSinceCompression || 0} turns since; ~${status.lastTokenEstimate || 0} tokens / ${status.lastCharacterCount || 0} chars${status.lastCompressionRatio ? `; ratio ${Math.round(status.lastCompressionRatio * 100)}%` : ''}${formatCompressionBandStatus(status)}`;
}

function getCompressionStatusText(state) {
    const settings = getSettings();
    const status = state?.loreCompressionStatus || {};
    if ((settings.loreInjectionMode || 'direct') !== 'compressed') {
        return 'Direct mode active; compression not used.';
    }
    const currentSignature = getCompressionSourceSignature(state, 'lore', buildLorePreview(state, 'direct'));
    if (status.lastSignature !== currentSignature) {
        return status.lastError ? `cached compression is stale; last error: ${status.lastError}` : 'Cached compression is missing or stale. Click Compress Lore Now.';
    }
    if (status.lastError) {
        return `last compression failed: ${status.lastError}`;
    }
    if (!status.lastCompressedAt) {
        return 'No cached model compression yet. Click Compress Lore Now.';
    }
    const when = new Date(status.lastCompressedAt).toLocaleTimeString();
    return `model-compressed ${when}; ${status.turnsSinceCompression || 0} turns since; ~${status.lastTokenEstimate || 0} tokens / ${status.lastCharacterCount || 0} chars${status.lastTargetTokenEstimate ? ` (target ${status.lastTargetTokenEstimate} tokens / ${status.lastTargetCharacterCount || '?'} chars)` : ''}${status.lastCompressionRatio ? `; ratio ${Math.round(status.lastCompressionRatio * 100)}%` : ''}${formatCompressionBandStatus(status)}`;
}

function getContinuityCompressionStatusText(state) {
    const settings = getSettings();
    const status = state?.continuityCompressionStatus || {};
    if ((settings.continuityInjectionMode || 'direct') !== 'compressed') {
        return 'Direct mode active; continuity compression not used.';
    }
    const currentSignature = getCompressionSourceSignature(state, 'continuity', buildContinuityPreview(state, 'direct'));
    if (status.lastSignature !== currentSignature) {
        return status.lastError ? `cached compression is stale; last error: ${status.lastError}` : 'Cached compression is missing or stale. Click Compress Continuity Now.';
    }
    if (status.lastError) {
        return `last compression failed: ${status.lastError}`;
    }
    if (!status.lastCompressedAt) {
        return 'No cached model compression yet. Click Compress Continuity Now.';
    }
    const when = new Date(status.lastCompressedAt).toLocaleTimeString();
    return `model-compressed ${when}; ${status.turnsSinceCompression || 0} turns since; ~${status.lastTokenEstimate || 0} tokens / ${status.lastCharacterCount || 0} chars${status.lastTargetTokenEstimate ? ` (target ${status.lastTargetTokenEstimate} tokens / ${status.lastTargetCharacterCount || '?'} chars)` : ''}${status.lastCompressionRatio ? `; ratio ${Math.round(status.lastCompressionRatio * 100)}%` : ''}${formatCompressionBandStatus(status)}`;
}

function formatCompressionBandStatus(status) {
    if (!status?.lastCompressionBandStatus || status.lastCompressionBandStatus === 'in_preferred_range') return '';
    return '; closest result outside preferred range';
}

function getChatLength() {
    try {
        const ctx = SillyTavern.getContext();
        return Array.isArray(ctx?.chat) ? ctx.chat.length : 0;
    } catch (_) {
        return 0;
    }
}

function hasValidModelCompression(kind = 'lore') {
    const state = getState();
    const statusKey = kind === 'continuity' ? 'continuityCompressionStatus' : 'loreCompressionStatus';
    const status = state?.[statusKey] || {};
    const signature = getCompressionSourceSignature(state, kind, kind === 'continuity' ? buildContinuityPreview(state, 'direct') : buildLorePreview(state, 'direct'));
    return status.lastSignature === signature && typeof status.cachedText === 'string' && status.cachedText.trim();
}

function hasAnyModelCompression(kind = 'lore') {
    const state = getState();
    const statusKey = kind === 'continuity' ? 'continuityCompressionStatus' : 'loreCompressionStatus';
    const status = state?.[statusKey] || {};
    return typeof status.cachedText === 'string' && status.cachedText.trim() && status.lastCompressedAt;
}

function hasCompressibleText(text) {
    const clean = String(text || '')
        .replace(/Direct mode active;[^\n]*/gi, '')
        .replace(/No accepted active lore entries[^\n]*/gi, '')
        .replace(/No continuity state[^\n]*/gi, '')
        .trim();
    return clean.length > 80;
}

function createInjectionModeButton(mode, label, tooltip, settings) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'saga-mode-button';
    if ((settings.loreInjectionMode || 'direct') === mode) btn.classList.add('saga-mode-button-active');
    btn.textContent = label;
    addTooltip(btn, tooltip);
    btn.addEventListener('click', async () => {
        const next = getSettings();
        next.loreInjectionMode = mode;
        saveSettings(next);
        syncPromptInjectionFromCurrentSettings();
        if (mode === 'compressed' && !hasValidModelCompression('lore')) {
            const directText = buildLorePreview(getState(), 'direct');
            if (!hasCompressibleText(directText)) {
                toast('Lore compressed mode selected, but there are no Accepted Lorecards to compress yet. Accept Pending Review entries first, then use Compress Lore Now.', 'warning');
            } else if (hasAnyModelCompression('lore')) {
                toast('Lore compressed mode selected. Existing compressed cache is stale for the current source/settings; using direct preview until you click Compress Lore Now.', 'warning');
            } else {
                toast('Lore compressed mode selected. No cached compression exists yet; using direct preview until you click Compress Lore Now.', 'warning');
            }
        }
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();
    });
    return btn;
}

function createContinuityModeButton(mode, label, tooltip, settings) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'saga-mode-button';
    if ((settings.continuityInjectionMode || 'direct') === mode) btn.classList.add('saga-mode-button-active');
    btn.textContent = label;
    addTooltip(btn, tooltip);
    btn.addEventListener('click', async () => {
        const next = getSettings();
        next.continuityInjectionMode = mode;
        saveSettings(next);
        syncPromptInjectionFromCurrentSettings();
        if (mode === 'compressed' && !hasValidModelCompression('continuity')) {
            const directText = buildContinuityPreview(getState(), 'direct');
            if (!hasCompressibleText(directText)) {
                toast('Continuity compressed mode selected, but there is no continuity state to compress yet. Run Scan Continuity State first, then use Compress Continuity Now.', 'warning');
            } else if (hasAnyModelCompression('continuity')) {
                toast('Continuity compressed mode selected. Existing compressed cache is stale for the current source/settings; using direct preview until you click Compress Continuity Now.', 'warning');
            } else {
                toast('Continuity compressed mode selected. No cached compression exists yet; using direct preview until you click Compress Continuity Now.', 'warning');
            }
        }
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();
    });
    return btn;
}
