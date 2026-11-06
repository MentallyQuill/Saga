import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const sourcePath = (...parts) => path.join(root, 'src', ...parts);
const harnessPath = path.join(root, 'tests', 'browser', 'visual-smoke.html');
const dropdownLatencyHarnessPath = path.join(root, 'tests', 'browser', 'dropdown-latency.html');
const loredeckIndexPath = path.join(root, 'content', 'loredecks', 'index.json');
const panelPath = sourcePath('runtime', 'lore-panel.js');
const libraryPanelPath = sourcePath('loredecks', 'loredeck-library-panel.js');
const loredecksTabPanelPath = sourcePath('loredecks', 'loredecks-tab-panel.js');
const loredeckWorkbenchPanelPath = sourcePath('loredecks', 'loredeck-workbench-panel.js');
const loredeckUiKitPath = sourcePath('loredecks', 'loredeck-ui-kit.js');
const loredeckFilterControlsPath = sourcePath('loredecks', 'loredeck-filter-controls.js');
const loredeckSelectionToolbarPath = sourcePath('loredecks', 'loredeck-selection-toolbar.js');
const loredeckValidationViewPath = sourcePath('loredecks', 'loredeck-validation-view.js');
const loredeckJobViewPath = sourcePath('loredecks', 'loredeck-job-view.js');
const loredeckActionRowsPath = sourcePath('loredecks', 'loredeck-action-rows.js');
const lorecardsPanelPath = sourcePath('lorecards', 'lorecards-panel.js');
const loreTimelinePanelPath = sourcePath('lorecards', 'lore-timeline-panel.js');
const creatorPanelPath = sourcePath('loredecks', 'loredeck-creator-panel.js');
const creatorCoveragePath = sourcePath('loredecks', 'loredeck-creator-coverage.js');
const creatorCoverageActionsPath = sourcePath('loredecks', 'loredeck-creator-coverage-actions.js');
const creatorFinalizationPath = sourcePath('loredecks', 'loredeck-creator-finalization.js');
const creatorGenerationSettingsPath = sourcePath('loredecks', 'loredeck-creator-generation-settings.js');
const creatorGenerationSettingsControllerPath = sourcePath('loredecks', 'loredeck-creator-generation-settings-controller.js');
const creatorGenerationSettingsPanelPath = sourcePath('loredecks', 'loredeck-creator-generation-settings-panel.js');
const creatorGenerationStatePath = sourcePath('loredecks', 'loredeck-creator-generation-state.js');
const creatorGenerationProgressPath = sourcePath('loredecks', 'loredeck-creator-generation-progress.js');
const creatorGenerationRecoveryPath = sourcePath('loredecks', 'loredeck-creator-generation-recovery.js');
const creatorGenerationSessionPath = sourcePath('loredecks', 'loredeck-creator-generation-session.js');
const creatorGenerationControllerPath = sourcePath('loredecks', 'loredeck-creator-generation-controller.js');
const creatorGenerationRunnerPath = sourcePath('loredecks', 'loredeck-creator-generation-runner.js');
const creatorGenerationLifecyclePath = sourcePath('loredecks', 'loredeck-creator-generation-lifecycle.js');
const creatorGenerationDiagnosticsPath = sourcePath('loredecks', 'loredeck-creator-generation-diagnostics.js');
const creatorGenerationValidationPath = sourcePath('loredecks', 'loredeck-creator-generation-validation.js');
const creatorGenerationRequestsPath = sourcePath('loredecks', 'loredeck-creator-generation-requests.js');
const creatorGenerationUnitsPath = sourcePath('loredecks', 'loredeck-creator-generation-units.js');
const creatorGeneratedPackPath = sourcePath('loredecks', 'loredeck-creator-generated-pack.js');
const creatorGeneratedPackCachePath = sourcePath('loredecks', 'loredeck-creator-generated-pack-cache.js');
const creatorWorkbenchCachePath = sourcePath('loredecks', 'loredeck-creator-workbench-cache.js');
const creatorResetControllerPath = sourcePath('loredecks', 'loredeck-creator-reset-controller.js');
const healthPanelPath = sourcePath('loredecks', 'loredeck-health-panel.js');
const continuityPanelPath = sourcePath('continuity', 'continuity-panel.js');
const injectionPanelPath = sourcePath('runtime', 'injection-preview-panel.js');
const contextPanelPath = sourcePath('context', 'context-panel.js');
const canonLoreDbPath = sourcePath('context', 'canon-lore-db.js');
const autoRelevancePath = sourcePath('context', 'auto-relevance.js');
const contextWorkbenchPanelPath = sourcePath('context', 'context-workbench-panel.js');
const settingsPanelPath = sourcePath('settings', 'settings-panel.js');
const runtimeSettingsTabPath = sourcePath('settings', 'runtime-settings-tab.js');
const themePanelPath = sourcePath('settings', 'theme-panel.js');
const themeActionsPath = sourcePath('settings', 'theme-actions.js');
const runtimeThemePath = sourcePath('theme', 'runtime-theme.js');
const runtimeUiKitPath = sourcePath('ui', 'runtime-ui-kit.js');
const runtimeActiveStackPanelPath = sourcePath('runtime', 'active-stack-panel.js');
const runtimeLoredeckGeneratedExportCardPath = sourcePath('runtime', 'loredeck-generated-export-card.js');
const runtimeLoredeckGeneratedReadinessPath = sourcePath('runtime', 'loredeck-generated-readiness.js');
const runtimeLoredeckEditorActionsPath = sourcePath('runtime', 'loredeck-editor-actions.js');
const runtimeLoredeckEntryOverridesPath = sourcePath('runtime', 'loredeck-entry-overrides-panel.js');
const runtimeLoredeckTimelineRegistryPath = sourcePath('runtime', 'loredeck-timeline-registry-panel.js');
const runtimeLoredeckTagManagerPath = sourcePath('runtime', 'loredeck-tag-manager-panel.js');
const runtimeLoredeckPendingReviewPath = sourcePath('runtime', 'loredeck-pending-review-panel.js');
const runtimeLoredeckAssistantReviewPath = sourcePath('runtime', 'loredeck-assistant-review-panel.js');
const runtimeLoredeckAssistantDraftCachePath = sourcePath('runtime', 'loredeck-assistant-draft-cache.js');
const runtimeLoredeckAssistantDraftHandoffPath = sourcePath('runtime', 'loredeck-assistant-draft-handoff.js');
const runtimeLoredeckReviewHelpersPath = sourcePath('runtime', 'loredeck-review-helpers.js');
const runtimeLoredeckPendingChangeModelPath = sourcePath('runtime', 'loredeck-pending-change-model.js');
const runtimeLoredeckPendingChangeActionsPath = sourcePath('runtime', 'loredeck-pending-change-actions.js');
const runtimeLoredeckEditProposalsPath = sourcePath('runtime', 'loredeck-edit-proposals.js');
const runtimeLoredeckEditorFieldsPath = sourcePath('runtime', 'loredeck-editor-fields.js');
const runtimeLoredeckEditorLoaderPath = sourcePath('runtime', 'loredeck-editor-loader.js');
const runtimeLoredeckEditorValidationPath = sourcePath('runtime', 'loredeck-editor-validation.js');
const runtimeLoredeckManifestFormattersPath = sourcePath('runtime', 'loredeck-manifest-formatters.js');
const runtimeLoredeckManifestPreviewPath = sourcePath('runtime', 'loredeck-manifest-preview.js');
const runtimeLoredeckPreviewCachePath = sourcePath('runtime', 'loredeck-preview-cache.js');
const runtimeLoredeckManifestPath = sourcePath('runtime', 'loredeck-manifest-runtime.js');
const runtimeLoredeckPackageExportPath = sourcePath('runtime', 'loredeck-package-export.js');
const runtimeLoredeckPackageHelpersPath = sourcePath('runtime', 'loredeck-package-helpers.js');
const runtimeLoredeckPackageInstallPath = sourcePath('runtime', 'loredeck-package-install.js');
const runtimeLoredeckPackageInstallPanelPath = sourcePath('runtime', 'loredeck-package-install-panel.js');
const runtimeLoredeckSourceSummaryPath = sourcePath('runtime', 'loredeck-source-summary.js');
const runtimeLoredeckVirtualDataPath = sourcePath('runtime', 'loredeck-virtual-data.js');
const runtimeCollapsiblePath = sourcePath('runtime', 'runtime-collapsible.js');
const runtimeSafetyPanelPath = sourcePath('runtime', 'runtime-safety-panel.js');
const runtimeFeatureProgressPath = sourcePath('runtime', 'runtime-feature-progress.js');
const runtimeLoreRegistryPath = sourcePath('runtime', 'runtime-lore-registry.js');
const runtimeRailMetricsPath = sourcePath('runtime', 'runtime-rail-metrics.js');
const runtimeShellPath = sourcePath('runtime', 'runtime-shell.js');
const runtimeShellViewPath = sourcePath('runtime', 'runtime-shell-view.js');
const runtimeCompositionPath = sourcePath('runtime', 'runtime-composition.js');
const contextCompositionPath = sourcePath('runtime', 'context-composition.js');
const loredeckEditorCompositionPath = sourcePath('runtime', 'loredeck-editor-composition.js');
const loredeckWorkflowCompositionPath = sourcePath('runtime', 'loredeck-workflow-composition.js');
const runtimeTabRegistryPath = sourcePath('runtime', 'tab-registry.js');
const runtimeNavigationPath = sourcePath('runtime', 'runtime-navigation.js');
const runtimeBasicReadinessPath = sourcePath('runtime', 'runtime-basic-readiness.js');
const runtimeAdvancedPanelPath = sourcePath('runtime', 'advanced-runtime-panel.js');
const runtimeStoryOpenerPanelPath = sourcePath('runtime', 'story-opener-panel.js');
const storyOpenerGenerationPath = sourcePath('story-openers', 'story-opener-generation.js');
const storyOpenerStatePath = sourcePath('story-openers', 'story-opener-state.js');
const runtimeGuidePrepPath = sourcePath('runtime', 'runtime-guide-prep.js');
const runtimeSettingControlsPath = sourcePath('runtime', 'runtime-setting-controls.js');
const runtimeSessionBasicPanelPath = sourcePath('runtime', 'session-basic-panel.js');
const runtimeGuideContentPath = sourcePath('runtime', 'runtime-guide-content.js');
const runtimeTourPath = sourcePath('runtime', 'runtime-tour.js');
const assistantPath = sourcePath('loredecks', 'loredeck-assistant.js');
const llmClientPath = sourcePath('providers', 'lore-llm-client.js');
const creatorProjectsPath = sourcePath('loredecks', 'loredeck-creator-projects.js');
const stateManagerPath = sourcePath('state', 'state-manager.js');
const loreCreatorStatePath = sourcePath('state', 'lore-creator-state.js');
const loredeckLibraryStorePath = sourcePath('state', 'loredeck-library-store.js');
const themeLibraryStorePath = sourcePath('state', 'theme-library-store.js');
const constantsPath = sourcePath('state', 'constants.js');
const defaultSettingsPath = sourcePath('state', 'default-settings.js');
const defaultStatePath = sourcePath('state', 'default-state.js');
const settingsStorePath = sourcePath('state', 'settings-store.js');
const settingsMountPath = sourcePath('extension', 'settings-mount.js');
const stylePath = path.join(root, 'styles', 'saga.css');
const settingsTemplatePath = sourcePath('extension', 'settings.html');
const liveSmokePath = path.join(root, 'tools', 'scripts', 'smoke-live-st-cdp.mjs');
const basicWorkflowDocPath = path.join(root, 'docs', 'user', 'BASIC_WORKFLOW.md');
const advancedWorkflowDocPath = path.join(root, 'docs', 'user', 'ADVANCED_WORKFLOW.md');
const documentationIndexPath = path.join(root, 'docs', 'DOCUMENTATION_INDEX.md');
const visualSmokeDocPath = path.join(root, 'docs', 'development', 'SAGA_VISUAL_SMOKE.md');
const mobileTouchRedesignDocPath = path.join(root, 'docs', 'development', 'SAGA_MOBILE_TOUCH_INTERACTION_REDESIGN.md');
const sagaHeroIconPath = path.join(root, 'assets', 'iconsets', 'saga-hero', 'hero-tab-loredecks-256.png');
const sagaHeroManifestPath = path.join(root, 'assets', 'iconsets', 'saga-hero', 'icons.json');
const sagaMysticIconPath = path.join(root, 'assets', 'iconsets', 'saga-mystic', 'mystic-tab-loredecks-256.png');
const sagaMysticManifestPath = path.join(root, 'assets', 'iconsets', 'saga-mystic', 'icons.json');
const sagaRelayIconPath = path.join(root, 'assets', 'iconsets', 'saga-relay', 'relay-tab-loredecks-256.png');
const sagaRelayManifestPath = path.join(root, 'assets', 'iconsets', 'saga-relay', 'icons.json');
const hpCoreCoverPath = path.join(root, 'content', 'loredecks', 'hp-core', 'assets', 'cover.png');
const hpYearOneCoverPath = path.join(root, 'content', 'loredecks', 'hp-year-1-philosophers-stone', 'assets', 'cover.png');

function read(file) {
    return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function readCssBundle(file, seen = new Set()) {
    const resolved = path.resolve(file);
    if (seen.has(resolved)) return '';
    seen.add(resolved);
    const source = read(resolved);
    const dir = path.dirname(resolved);
    const imports = [];
    source.replace(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g, (_match, importPath) => {
        imports.push(path.resolve(dir, importPath));
        return _match;
    });
    return [source, ...imports.map(importFile => readCssBundle(importFile, seen))].join('\n');
}

function listJsFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...listJsFiles(file));
        else if (/\.(js|mjs)$/.test(entry.name)) files.push(file);
    }
    return files;
}

function getLineNumber(source, index) {
    return source.slice(0, index).split(/\r?\n/).length;
}

function skipQuoted(source, index, quote) {
    for (let i = index + 1; i < source.length; i += 1) {
        if (source[i] === '\\') {
            i += 1;
            continue;
        }
        if (source[i] === quote) return i;
    }
    return source.length - 1;
}

function skipTemplate(source, index) {
    for (let i = index + 1; i < source.length; i += 1) {
        if (source[i] === '\\') {
            i += 1;
            continue;
        }
        if (source[i] === '`') return i;
        if (source[i] === '$' && source[i + 1] === '{') {
            i += 2;
            let depth = 1;
            for (; i < source.length; i += 1) {
                if (source[i] === '"' || source[i] === "'") {
                    i = skipQuoted(source, i, source[i]);
                    continue;
                }
                if (source[i] === '`') {
                    i = skipTemplate(source, i);
                    continue;
                }
                if (source[i] === '\\') {
                    i += 1;
                    continue;
                }
                if (source[i] === '{') depth += 1;
                else if (source[i] === '}') {
                    depth -= 1;
                    if (depth === 0) break;
                }
            }
        }
    }
    return source.length - 1;
}

function countTopLevelCommas(source) {
    let depth = 0;
    let commas = 0;
    for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        if (char === '"' || char === "'") {
            i = skipQuoted(source, i, char);
            continue;
        }
        if (char === '`') {
            i = skipTemplate(source, i);
            continue;
        }
        if (char === '(' || char === '{' || char === '[') depth += 1;
        else if (char === ')' || char === '}' || char === ']') depth = Math.max(0, depth - 1);
        else if (char === ',' && depth === 0) commas += 1;
    }
    return commas;
}

function findUntypedChipWrapperCalls(source, functionName) {
    const calls = [];
    const prefix = `${functionName}(`;
    let searchIndex = 0;
    while (true) {
        const start = source.indexOf(prefix, searchIndex);
        if (start < 0) break;
        let depth = 1;
        let end = start + prefix.length;
        for (; end < source.length; end += 1) {
            const char = source[end];
            if (char === '"' || char === "'") {
                end = skipQuoted(source, end, char);
                continue;
            }
            if (char === '`') {
                end = skipTemplate(source, end);
                continue;
            }
            if (char === '(' || char === '{' || char === '[') depth += 1;
            else if (char === ')' || char === '}' || char === ']') {
                depth -= 1;
                if (depth === 0) break;
            }
        }
        if (depth === 0) {
            const args = source.slice(start + prefix.length, end);
            if (countTopLevelCommas(args) < 2) calls.push(getLineNumber(source, start));
            searchIndex = end + 1;
        } else {
            searchIndex = start + prefix.length;
        }
    }
    return calls;
}

function findUntypedStatusPills(source) {
    return findUntypedChipWrapperCalls(source, 'createStatusPill');
}

function findUntypedBadges(source) {
    return findUntypedChipWrapperCalls(source, 'createBadge');
}

function getUntypedStatusPillCalls() {
    const calls = [];
    for (const file of listJsFiles(sourcePath())) {
        const lines = findUntypedStatusPills(read(file));
        for (const line of lines) calls.push(`${path.relative(root, file)}:${line}`);
    }
    return calls;
}

function getUntypedBadgeCalls() {
    const calls = [];
    for (const file of listJsFiles(sourcePath())) {
        const lines = findUntypedBadges(read(file));
        for (const line of lines) calls.push(`${path.relative(root, file)}:${line}`);
    }
    return calls;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cssRuleDeclares(source, selector, properties = []) {
    const prop = new RegExp(`(?:^|\\n)\\s*(?:${properties.map(escapeRegex).join('|')})\\s*:`, 'm');
    const rule = /([^{}]+)\{([^{}]*)\}/g;
    return [...String(source || '').matchAll(rule)].some(match => {
        const selectors = String(match[1] || '').split(',').map(part => part.trim());
        return selectors.includes(selector) && prop.test(match[2] || '');
    });
}

function getMobileFontSizeAudit(source = '') {
    const rootPx = 12;
    const hits = [];
    const rule = /([^{}]+)\{([^{}]*font-size\s*:\s*([^;!]+)(?:\s*!important)?;[^{}]*)\}/g;
    for (const match of String(source || '').matchAll(rule)) {
        const selector = String(match[1] || '').trim().replace(/\s+/g, ' ');
        if (!/saga-runtime-mobile|saga-mobile|mobile|lorecard-editor|lorecards-subtab|bottom-tab|bottom-label/i.test(selector)) continue;
        const raw = String(match[3] || '').trim();
        let px = null;
        if (raw.endsWith('rem')) px = Number.parseFloat(raw) * rootPx;
        else if (raw.endsWith('em')) px = Number.parseFloat(raw) * rootPx;
        else if (raw.endsWith('px')) px = Number.parseFloat(raw);
        if (Number.isFinite(px) && px > 0) hits.push({ selector, raw, px });
    }
    const values = hits.map(hit => hit.px);
    return {
        hits,
        min: values.length ? Math.min(...values) : 0,
        max: values.length ? Math.max(...values) : 0,
    };
}

function parseSingleQuotedValues(source) {
    return [...String(source || '').matchAll(/'([^']+)'/g)].map(match => match[1]);
}

const VALID_GUIDE_PREPARES = new Set([
    'openLoredeckLibrary',
    'openLoredeckDetails',
    'openContextBrowser',
    'openPendingLoreReview',
    'openAcceptedLoreDetails',
    'openInjectionPreview',
    'openContinuityEditor',
    'openLoredeckCreator',
    'openCreatorProject',
    'openDeckHealthCenter',
    'openAdvancedSettingsSection',
]);

const REQUIRED_BASIC_GUIDE_STEP_IDS = Object.freeze({
    session: Object.freeze([
        'basic-session-orientation',
        'basic-session-saga-active',
        'basic-session-start-checklist',
        'basic-session-next-action',
        'basic-session-metrics',
        'basic-session-ready',
        'basic-session-continue-roleplay',
        'basic-session-repeat-loop',
    ]),
    loredecks: Object.freeze([
        'basic-loredecks-overview',
        'basic-loredecks-open-library',
        'basic-library-layout',
        'basic-library-pack-types',
        'basic-library-search-filter',
        'basic-library-pack-details',
        'basic-library-pack-health',
        'basic-loredecks-import',
        'basic-library-import-preview',
        'basic-library-add-deck-stack',
        'basic-library-add-folder-stack',
        'basic-library-stack-order',
        'basic-library-stack-enable',
        'basic-library-close-confirm',
    ]),
    context: Object.freeze([
        'basic-context-overview',
        'basic-context-loaded-rows',
        'basic-context-browse',
        'basic-context-workbench-loredeck',
        'basic-context-anchors-windows',
        'basic-context-start-window',
        'basic-context-use-anchor',
        'basic-context-after-before',
        'basic-context-phrase-resolver',
        'basic-context-select-position',
        'basic-context-manual-protects',
        'basic-context-detect',
        'basic-context-proposals',
        'basic-context-update-loop',
    ]),
    lorecards: Object.freeze([
        'basic-lorecards-overview',
        'basic-lorecards-generation-section',
        'basic-lorecards-preview-canon',
        'basic-lorecards-send-canon-review',
        'basic-lorecards-story-scan',
        'basic-lorecards-manual-add',
        'basic-lorecards-pending-review',
        'basic-lorecards-edit-pending',
        'basic-lorecards-accept-dismiss',
        'basic-lorecards-review-question',
        'basic-lorecards-accepted-list',
        'basic-lorecards-open-accepted',
        'basic-lorecards-pin-mute',
        'basic-lorecards-search-cleanup',
    ]),
    settings: Object.freeze([
        'basic-settings-provider-status',
        'basic-settings-provider-test',
        'basic-settings-current-model',
        'basic-settings-theme-pack',
        'basic-settings-advanced-handoff',
    ]),
});

const REQUIRED_ADVANCED_GUIDE_STEP_IDS = Object.freeze({
    libraryMastery: Object.freeze([
        'advanced-loredecks-overview',
        'advanced-loredecks-open-library',
        'advanced-library-empty-selection',
        'advanced-library-special-views',
        'advanced-library-folder-tree',
        'advanced-library-search-sort',
        'advanced-library-pack-select',
        'advanced-library-pack-source',
        'advanced-library-cover-metadata',
        'advanced-library-health-summary',
        'advanced-library-manifest-preview',
        'advanced-library-entry-overrides',
        'advanced-library-stack-pane',
        'advanced-library-add-deck-stack',
        'advanced-library-add-folder-stack',
        'advanced-library-reorder-stack',
        'advanced-library-enable-stack',
        'advanced-library-bulk-select',
        'advanced-library-export-selected',
        'advanced-library-import-package',
        'advanced-library-import-preview',
        'advanced-library-duplicate-warnings',
        'advanced-library-duplicate-custom',
        'advanced-library-folder-actions',
        'advanced-library-open-workbench',
    ]),
    sessionControl: Object.freeze([
        'advanced-session-experience-mode',
        'advanced-session-saga-active',
        'advanced-session-automation-mode',
        'advanced-session-runtime-metrics',
        'advanced-session-guide-modules',
        'advanced-session-active-chat',
        'advanced-session-mode-recovery',
    ]),
    contextResolution: Object.freeze([
        'advanced-context-command-center',
        'advanced-context-loaded-rows',
        'advanced-context-browser-open',
        'advanced-context-workbench-layout',
        'advanced-context-workbench-pack',
        'advanced-context-anchors-windows',
        'advanced-context-start-here',
        'advanced-context-use-window',
        'advanced-context-use-anchor',
        'advanced-context-after-before',
        'advanced-context-timeline-action',
        'advanced-context-manual-select',
        'advanced-context-phrase-resolver',
        'advanced-context-phrase-debug',
        'advanced-context-locks',
        'advanced-context-detect',
        'advanced-context-source-window',
        'advanced-context-local-resolver',
        'advanced-context-reasoner',
        'advanced-context-proposal-review',
        'advanced-context-audit',
        'advanced-context-advanced-brief',
        'advanced-context-seed-from-brief',
        'advanced-context-reset',
        'advanced-context-index-summary',
        'advanced-context-workbench-routes',
        'advanced-context-eligibility-debug',
    ]),
    loreReview: Object.freeze([
        'advanced-lore-generation-overview',
        'advanced-lore-canon-preview',
        'advanced-lore-canon-selection',
        'advanced-lore-story-scan',
        'advanced-lore-scan-scope',
        'advanced-lore-manual-add',
        'advanced-lore-assistant-drafts',
        'advanced-lore-pending-review',
        'advanced-lore-pending-edit',
        'advanced-lore-pending-accept-reject',
        'advanced-lore-pending-bulk',
        'advanced-lore-accepted-list',
        'advanced-lore-accepted-search-filter',
        'advanced-lore-accepted-open-edit',
        'advanced-lore-pin-mute',
        'advanced-lore-relevance-tier',
        'advanced-lore-tags-context',
        'advanced-lore-similarity-duplicates',
        'advanced-lore-auto-relevance',
        'advanced-lore-timeline-audit',
        'advanced-lore-workbench',
        'advanced-lore-review-first-policy',
    ]),
    injectionDiagnostics: Object.freeze([
        'advanced-injection-overview',
        'advanced-injection-continuity-toggle',
        'advanced-injection-lore-toggle',
        'advanced-injection-high-tier',
        'advanced-injection-normal-tier',
        'advanced-injection-low-tier',
        'advanced-injection-direct-compressed',
        'advanced-injection-placement',
        'advanced-injection-compression-prompts',
        'advanced-injection-preview-lore',
        'advanced-injection-preview-continuity',
        'advanced-injection-combined-preview',
        'advanced-injection-token-estimate',
        'advanced-injection-omission-reasons',
        'advanced-injection-sync-diagnostics',
    ]),
    continuityTracking: Object.freeze([
        'advanced-continuity-overview',
        'advanced-continuity-scan',
        'advanced-continuity-automation',
        'advanced-continuity-scope',
        'advanced-continuity-custom-range',
        'advanced-continuity-performance',
        'advanced-continuity-tracked-sections',
        'advanced-continuity-scene-state',
        'advanced-continuity-active-characters',
        'advanced-continuity-items',
        'advanced-continuity-goals-threads',
        'advanced-continuity-emotional-freshness',
        'advanced-continuity-injection-link',
        'advanced-continuity-recovery',
    ]),
    creatorAuthoring: Object.freeze([
        'advanced-creator-create-deck',
        'advanced-creator-intake',
        'advanced-creator-brief',
        'advanced-creator-outline',
        'advanced-creator-title-pass',
        'advanced-creator-title-review',
        'advanced-creator-planning',
        'advanced-creator-planning-review',
        'advanced-creator-entry-draft',
        'advanced-creator-entry-auto-draft',
        'advanced-creator-draft-review',
        'advanced-creator-send-to-review',
        'advanced-creator-pending-review-link',
        'advanced-creator-current-task',
        'advanced-creator-generation-settings',
        'advanced-creator-project-shelf',
        'advanced-creator-project-manage',
        'advanced-creator-inspect-generated-pack',
        'advanced-creator-readiness-gate',
    ]),
    packHealth: Object.freeze([
        'advanced-health-center-open',
        'advanced-health-status',
        'advanced-health-issue-groups',
        'advanced-health-attempt-fixing',
        'advanced-health-manual-repair',
        'advanced-package-update',
        'advanced-package-local-mod-warning',
        'advanced-package-export-bundled',
        'advanced-package-export-custom',
        'advanced-generated-finalize-custom',
        'advanced-generated-export-readiness',
    ]),
    settingsDiagnostics: Object.freeze([
        'advanced-settings-danger-zone',
        'advanced-settings-provider-overview',
        'advanced-settings-provider-profile',
        'advanced-settings-endpoint-model',
        'advanced-settings-provider-test',
        'advanced-settings-current-model',
        'advanced-settings-generation',
        'advanced-settings-provider-presets',
        'advanced-settings-api-compat',
        'advanced-settings-theme-pack',
        'advanced-settings-icon-set',
        'advanced-settings-colors',
        'advanced-settings-diagnostics',
    ]),
    troubleshooting: Object.freeze([
        'advanced-troubleshoot-no-loredeck',
        'advanced-troubleshoot-wrong-context',
        'advanced-troubleshoot-no-suggestions',
        'advanced-troubleshoot-pending-stuck',
        'advanced-troubleshoot-no-injection',
        'advanced-troubleshoot-prompt-heavy',
        'advanced-troubleshoot-provider-failure',
        'advanced-troubleshoot-continuity-stale',
        'advanced-troubleshoot-package-duplicate',
        'advanced-troubleshoot-health-warnings',
        'advanced-troubleshoot-creator-failure',
        'advanced-troubleshoot-return-basic',
    ]),
});

function countRequiredGuideStepIds(requiredGroups = {}) {
    return Object.values(requiredGroups).reduce((sum, ids) => sum + ids.length, 0);
}

function assertRequiredGuideStepIds(mode, steps = [], requiredGroups = {}) {
    const stepIds = new Set(steps.map(step => step?.id).filter(Boolean));
    for (const [group, ids] of Object.entries(requiredGroups)) {
        for (const id of ids) {
            assert(stepIds.has(id), `${mode} walkthrough is missing required ${group} guide step: ${id}`);
        }
    }
}

function assertGuideStepMetadata(mode, steps = []) {
    for (const step of steps) {
        assert(typeof step?.id === 'string' && step.id.trim(), `${mode} walkthrough contains a step without an id.`);
        assert(typeof step?.target === 'string' && step.target.trim(), `${mode} walkthrough step ${step.id} is missing a target.`);
        assert(typeof step?.expected === 'string' && step.expected.trim(), `${mode} walkthrough step ${step.id} is missing expected-result copy.`);
        assert(typeof step?.when === 'string' && step.when.trim(), `${mode} walkthrough step ${step.id} is missing usage-timing copy.`);
        if (step.prepare) {
            assert(VALID_GUIDE_PREPARES.has(step.prepare), `${mode} walkthrough step ${step.id} declares unknown prepare action: ${step.prepare}`);
        }
    }
}

function assertGuideTargetsResolvable(steps = [], markedTargets = new Set()) {
    for (const step of steps) {
        const prepareIsValid = step?.prepare && VALID_GUIDE_PREPARES.has(step.prepare);
        for (const key of ['target', 'fallbackTarget']) {
            const target = step?.[key];
            if (!target) continue;
            assert(markedTargets.has(target) || prepareIsValid, `Walkthrough ${key} is not marked in the runtime UI and has no valid prepare action: ${target}`);
        }
    }
}

function assertDocSectionHeadings(docName, docSource = '', sections = []) {
    for (const section of sections) {
        assert(docSource.includes(`### ${section.label}`), `${docName} must document walkthrough module: ${section.label}`);
    }
}

function getCoverageLabel(mode, index) {
    const prefix = mode === 'advanced' ? 'A' : 'B';
    return `${prefix}${String(index + 1).padStart(2, '0')}`;
}

function collectMarkedTourTargets(source = '') {
    const targets = new Set();
    const pattern = /['"]([a-z][a-zA-Z0-9_-]*(?:\.[a-zA-Z0-9_-]+)+)['"]/g;
    const text = String(source || '');
    let index = text.indexOf('markTourTarget(');
    while (index >= 0) {
        const chunk = text.slice(index, index + 5000);
        for (const match of chunk.matchAll(pattern)) {
            targets.add(match[1]);
        }
        index = text.indexOf('markTourTarget(', index + 1);
    }
    return targets;
}

const harness = read(harnessPath);
const dropdownLatencyHarness = read(dropdownLatencyHarnessPath);
const loredeckIndex = JSON.parse(read(loredeckIndexPath));
const panel = read(panelPath);
const libraryPanel = read(libraryPanelPath);
const loredecksTabPanel = read(loredecksTabPanelPath);
const lorecardsPanel = read(lorecardsPanelPath);
const loreTimelinePanel = read(loreTimelinePanelPath);
const creatorPanel = read(creatorPanelPath);
const creatorCoverage = read(creatorCoveragePath);
const creatorCoverageActions = read(creatorCoverageActionsPath);
const creatorFinalization = read(creatorFinalizationPath);
const creatorGenerationSettings = read(creatorGenerationSettingsPath);
const creatorGenerationSettingsController = read(creatorGenerationSettingsControllerPath);
const creatorGenerationSettingsPanel = read(creatorGenerationSettingsPanelPath);
const creatorGenerationState = read(creatorGenerationStatePath);
const creatorGenerationProgress = read(creatorGenerationProgressPath);
const creatorGenerationRecovery = read(creatorGenerationRecoveryPath);
const creatorGenerationSession = read(creatorGenerationSessionPath);
const creatorGenerationController = read(creatorGenerationControllerPath);
const creatorGenerationRunner = read(creatorGenerationRunnerPath);
const creatorGenerationLifecycle = read(creatorGenerationLifecyclePath);
const creatorGenerationDiagnostics = read(creatorGenerationDiagnosticsPath);
const creatorGenerationValidation = read(creatorGenerationValidationPath);
const creatorGenerationRequests = read(creatorGenerationRequestsPath);
const creatorGenerationUnits = read(creatorGenerationUnitsPath);
const creatorGeneratedPack = read(creatorGeneratedPackPath);
const creatorGeneratedPackCache = read(creatorGeneratedPackCachePath);
const creatorWorkbenchCache = read(creatorWorkbenchCachePath);
const creatorResetController = read(creatorResetControllerPath);
const continuityPanel = read(continuityPanelPath);
const injectionPanel = read(injectionPanelPath);
const contextPanel = read(contextPanelPath);
const canonLoreDb = read(canonLoreDbPath);
const contextWorkbenchPanel = read(contextWorkbenchPanelPath);
const settingsPanel = read(settingsPanelPath);
const loredeckWorkbenchPanel = read(loredeckWorkbenchPanelPath);
const loredeckUiKit = read(loredeckUiKitPath);
const loredeckFilterControls = read(loredeckFilterControlsPath);
const loredeckSelectionToolbar = read(loredeckSelectionToolbarPath);
const loredeckValidationView = read(loredeckValidationViewPath);
const loredeckJobView = read(loredeckJobViewPath);
const loredeckActionRows = read(loredeckActionRowsPath);
const healthPanel = read(healthPanelPath);
const runtimeSettingsTab = read(runtimeSettingsTabPath);
const runtimeActiveStackPanel = read(runtimeActiveStackPanelPath);
const runtimeLoredeckGeneratedExportCard = read(runtimeLoredeckGeneratedExportCardPath);
const runtimeLoredeckGeneratedReadiness = read(runtimeLoredeckGeneratedReadinessPath);
const runtimeLoredeckEditorActions = read(runtimeLoredeckEditorActionsPath);
const runtimeLoredeckEntryOverrides = read(runtimeLoredeckEntryOverridesPath);
const runtimeLoredeckTimelineRegistry = read(runtimeLoredeckTimelineRegistryPath);
const runtimeLoredeckTagManager = read(runtimeLoredeckTagManagerPath);
const runtimeLoredeckPendingReview = read(runtimeLoredeckPendingReviewPath);
const runtimeLoredeckAssistantReview = read(runtimeLoredeckAssistantReviewPath);
const runtimeLoredeckAssistantDraftCache = read(runtimeLoredeckAssistantDraftCachePath);
const runtimeLoredeckAssistantDraftHandoff = read(runtimeLoredeckAssistantDraftHandoffPath);
const runtimeLoredeckReviewHelpers = read(runtimeLoredeckReviewHelpersPath);
const runtimeLoredeckPendingChangeModel = read(runtimeLoredeckPendingChangeModelPath);
const runtimeLoredeckPendingChangeActions = read(runtimeLoredeckPendingChangeActionsPath);
const runtimeLoredeckEditProposals = read(runtimeLoredeckEditProposalsPath);
const runtimeLoredeckEditorFields = read(runtimeLoredeckEditorFieldsPath);
const runtimeLoredeckEditorLoader = read(runtimeLoredeckEditorLoaderPath);
const runtimeLoredeckEditorValidation = read(runtimeLoredeckEditorValidationPath);
const runtimeLoredeckManifestFormatters = read(runtimeLoredeckManifestFormattersPath);
const runtimeLoredeckManifestPreview = read(runtimeLoredeckManifestPreviewPath);
const runtimeLoredeckPreviewCache = read(runtimeLoredeckPreviewCachePath);
const runtimeLoredeckManifest = read(runtimeLoredeckManifestPath);
const runtimeLoredeckPackageExport = read(runtimeLoredeckPackageExportPath);
const runtimeLoredeckPackageHelpers = read(runtimeLoredeckPackageHelpersPath);
const runtimeLoredeckPackageInstall = read(runtimeLoredeckPackageInstallPath);
const runtimeLoredeckPackageInstallPanel = read(runtimeLoredeckPackageInstallPanelPath);
const runtimeLoredeckSourceSummary = read(runtimeLoredeckSourceSummaryPath);
const runtimeLoredeckVirtualData = read(runtimeLoredeckVirtualDataPath);
const runtimeAdvancedPanel = read(runtimeAdvancedPanelPath);
const runtimeStoryOpenerPanel = read(runtimeStoryOpenerPanelPath);
const storyOpenerGeneration = read(storyOpenerGenerationPath);
const storyOpenerState = read(storyOpenerStatePath);
const themeActions = read(themeActionsPath);
const runtimeGuidePrep = read(runtimeGuidePrepPath);
const runtimeSessionBasicPanel = read(runtimeSessionBasicPanelPath);
const runtimeSafetyPanel = read(runtimeSafetyPanelPath);
const runtimeFeatureProgress = read(runtimeFeatureProgressPath);
const runtimeLoreRegistry = read(runtimeLoreRegistryPath);
const runtimeRailMetrics = read(runtimeRailMetricsPath);
const runtimeShell = read(runtimeShellPath);
const runtimeShellView = read(runtimeShellViewPath);
const runtimeComposition = read(runtimeCompositionPath);
const contextComposition = read(contextCompositionPath);
const loredeckEditorComposition = read(loredeckEditorCompositionPath);
const loredeckWorkflowComposition = read(loredeckWorkflowCompositionPath);
const runtimeTabRegistry = read(runtimeTabRegistryPath);
const runtimeSettingControls = read(runtimeSettingControlsPath);
const runtimeUiKit = read(runtimeUiKitPath);
const themePanel = read(themePanelPath);
const runtimeTheme = read(runtimeThemePath);
const runtimePanelSource = [
    panel,
    creatorGenerationSettings,
    creatorGenerationSettingsController,
    creatorGenerationSettingsPanel,
    creatorGenerationState,
    creatorGenerationProgress,
    creatorGenerationRecovery,
    creatorGenerationSession,
    creatorGenerationController,
    creatorGenerationRunner,
    creatorGenerationLifecycle,
    creatorGenerationDiagnostics,
    creatorGenerationValidation,
    creatorGenerationRequests,
    creatorGenerationUnits,
    creatorGeneratedPack,
    creatorGeneratedPackCache,
    creatorWorkbenchCache,
    creatorResetController,
    creatorCoverageActions,
    creatorFinalization,
    runtimeActiveStackPanel,
    runtimeLoredeckGeneratedExportCard,
    runtimeLoredeckGeneratedReadiness,
    loredeckEditorComposition,
    loredeckWorkflowComposition,
    runtimeLoredeckEditorActions,
    runtimeLoredeckEntryOverrides,
    runtimeLoredeckTimelineRegistry,
    runtimeLoredeckTagManager,
    runtimeLoredeckPendingReview,
    runtimeLoredeckAssistantReview,
    runtimeLoredeckAssistantDraftCache,
    runtimeLoredeckAssistantDraftHandoff,
    runtimeLoredeckReviewHelpers,
    runtimeLoredeckPendingChangeModel,
    runtimeLoredeckPendingChangeActions,
    runtimeLoredeckEditProposals,
    runtimeLoredeckEditorFields,
    runtimeLoredeckEditorLoader,
    runtimeLoredeckEditorValidation,
    runtimeLoredeckManifestFormatters,
    runtimeLoredeckManifestPreview,
    runtimeLoredeckPreviewCache,
    runtimeLoredeckManifest,
    runtimeLoredeckPackageExport,
    runtimeLoredeckPackageHelpers,
    runtimeLoredeckPackageInstall,
    runtimeLoredeckPackageInstallPanel,
    runtimeLoredeckSourceSummary,
    runtimeLoredeckVirtualData,
    runtimeAdvancedPanel,
    runtimeStoryOpenerPanel,
    runtimeGuidePrep,
    runtimeSessionBasicPanel,
    runtimeSafetyPanel,
    runtimeFeatureProgress,
    runtimeLoreRegistry,
    runtimeRailMetrics,
    runtimeShell,
    runtimeShellView,
    runtimeComposition,
    runtimeTabRegistry,
    runtimeSettingControls,
    lorecardsPanel,
    libraryPanel,
    loredecksTabPanel,
    loredeckWorkbenchPanel,
    loredeckUiKit,
    loredeckFilterControls,
    loredeckSelectionToolbar,
    loredeckValidationView,
    loredeckJobView,
    loredeckActionRows,
    read(creatorPanelPath),
    healthPanel,
    continuityPanel,
    injectionPanel,
    contextPanel,
    contextWorkbenchPanel,
    contextComposition,
    settingsPanel,
    runtimeSettingsTab,
    themePanel,
    read(themeActionsPath),
    runtimeTheme,
    runtimeUiKit,
    read(runtimeCollapsiblePath),
].join('\n');
const assistant = read(assistantPath);
const llm = read(llmClientPath);
const creatorProjects = read(creatorProjectsPath);
const loreGenerator = read(sourcePath('lorecards', 'lore-generator.js'));
const extractor = read(sourcePath('continuity', 'extractor.js'));
const stateManager = read(stateManagerPath);
const loreCreatorState = read(loreCreatorStatePath);
const loredeckLibraryStore = read(loredeckLibraryStorePath);
const themeLibraryStore = read(themeLibraryStorePath);
const stateSource = [stateManager, loreCreatorState, loredeckLibraryStore].join('\n');
const constants = read(constantsPath);
const defaultSettings = read(defaultSettingsPath);
const defaultState = read(defaultStatePath);
const settingsStore = read(settingsStorePath);
const settingsMount = read(settingsMountPath);
const defaultSource = [constants, defaultSettings, defaultState].join('\n');
const runtimeNavigation = read(runtimeNavigationPath);
const runtimeBasicReadiness = read(runtimeBasicReadinessPath);
const runtimeGuideContent = read(runtimeGuideContentPath);
const runtimeTour = read(runtimeTourPath);
const style = readCssBundle(stylePath);
const settingsTemplate = read(settingsTemplatePath);
const liveSmoke = read(liveSmokePath);
const autoRelevanceSource = read(autoRelevancePath);
const basicWorkflowDoc = read(basicWorkflowDocPath);
const advancedWorkflowDoc = read(advancedWorkflowDocPath);
const documentationIndex = read(documentationIndexPath);
const visualSmokeDoc = read(visualSmokeDocPath);
const mobileTouchRedesignDoc = read(mobileTouchRedesignDocPath);
const runtimeGuideModule = await import(pathToFileURL(runtimeGuideContentPath).href);
const basicGuideSteps = runtimeGuideModule.getRuntimeGuideSteps('basic');
const advancedGuideSteps = runtimeGuideModule.getRuntimeGuideSteps('advanced');
const basicGuideSections = runtimeGuideModule.getRuntimeGuideSections('basic');
const advancedGuideSections = runtimeGuideModule.getRuntimeGuideSections('advanced');

assert(/import\s*\{[^}]*\bshowLorePanel\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/src\/runtime\/lore-panel\.js['"];/.test(harness), 'Harness must import the real runtime panel.');
assert(fs.existsSync(sagaHeroIconPath), 'Bundled Saga Hero Loredecks icon must exist.');
assert(JSON.parse(read(sagaHeroManifestPath)).id === 'saga-hero', 'Bundled Saga Hero Icon Set manifest must exist.');
assert(defaultSettings.includes("themePackId: 'saga-default'") && defaultSettings.includes("themeIconSetId: 'saga-hero'"), 'Fresh Saga installs must start from the Saga Archive Theme Pack and Saga Hero Icon Set.');
assert(runtimeTheme.includes("export const DEFAULT_ICONSET_ID = 'saga-hero';") && runtimeTheme.includes("id: 'saga-default'") && runtimeTheme.includes("title: 'Saga Archive'") && runtimeTheme.includes("title: 'Saga Hero'"), 'Runtime theme defaults must preserve the Saga Archive and Saga Hero mobile visual identity.');
const mobileShellVisualSource = [
    runtimeShellView,
    ...Array.from(style.matchAll(/\.saga-(?:lore-panel\.saga-runtime-shell\.saga-runtime-mobile|runtime-mobile|mobile-(?:header|bottom|more|content|subview))[\s\S]{0,900}/g), match => match[0]),
].join('\n');
assert(!/\b(?:hogwarts|wand|castle|owl|potion|candlelit|gothic|parchment scroll|cyberpunk|generic blue SaaS|generic sci-fi)\b/i.test(mobileShellVisualSource), 'Mobile shell visual sources must avoid source-franchise, generic sci-fi, generic SaaS, and pure cyberpunk cues.');
assert(fs.existsSync(sagaMysticIconPath), 'Bundled Saga Mystic Loredecks icon must exist.');
assert(JSON.parse(read(sagaMysticManifestPath)).id === 'saga-mystic', 'Bundled Saga Mystic Icon Set manifest must exist.');
assert(fs.existsSync(sagaRelayIconPath), 'Bundled Saga Relay Loredecks icon must exist.');
assert(JSON.parse(read(sagaRelayManifestPath)).id === 'saga-relay', 'Bundled Saga Relay Icon Set manifest must exist.');
assert(fs.existsSync(hpCoreCoverPath), 'Bundled HP Core Loredeck cover must be deck-local.');
assert(fs.existsSync(hpYearOneCoverPath), 'Bundled HP Year 1 Loredeck cover must be deck-local.');
assert((loredeckIndex.bundled || []).some(record => record.packId === 'hp-core' && record.assets?.cover?.path === 'assets/cover.png'), 'Bundled HP index records must expose deck-local cover paths.');
assert(runtimePanelSource.includes("tab.classList.add('saga-runtime-rail-tab-global')"), 'Loredecks shelf tab must keep a subtle global accent class.');
assert(runtimePanelSource.includes("divider.className = 'saga-runtime-rail-tab-divider'"), 'Loredecks shelf tab must be visually grouped with a thin divider.');
assert(!runtimePanelSource.includes("scope.textContent = 'Global'"), 'Loredecks shelf grouping must not add a visible Global text chip.');
assert(style.includes('.saga-runtime-rail-tab-global') && style.includes('.saga-runtime-rail-tab-divider'), 'Loredecks shelf grouping must have dedicated accent and divider styling.');
assert(style.includes('border-color: var(--saga-border') && style.includes('var(--saga-border-soft'), 'Loredecks shelf accent must reuse existing theme border variables.');
assert(!style.includes('2px 0 0 rgba(215, 181, 109') && !style.includes('2px 0 0 rgba(212, 200, 168'), 'Loredecks shelf accent must not use a left inset that visually offsets the tab.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-lore-workbench-overlay\s*\{[\s\S]*?padding:\s*0;/.test(style), 'Mobile workbench overlays must use the full phone viewport instead of centered desktop padding.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-lore-workbench-shell\s*\{[\s\S]*?height:\s*100dvh;[\s\S]*?border-radius:\s*0;/.test(style), 'Mobile workbench shells must be full-height, square-edged surfaces.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-lore-workbench-overlay\s*\{[\s\S]*?background:\s*#07090d;[\s\S]*?\.saga-lore-workbench-shell\s*\{[\s\S]*?#07090d;/.test(style), 'Mobile workbench overlays must be fully opaque so SillyTavern cannot ghost through Saga.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-lore-workbench-header\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?env\(safe-area-inset-top/.test(style), 'Mobile workbench headers must stay reachable and respect safe-area top padding.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-lore-workbench-mode-tab\s*\{[\s\S]*?min-height:\s*40px;/.test(style), 'Mobile workbench tabs must have touch-sized targets.');
assert(
    contextWorkbenchPanel.includes('function isRuntimeMobileShell')
        && contextWorkbenchPanel.includes("if (mobile) shell.classList.add('saga-context-workbench-shell-mobile')")
        && contextWorkbenchPanel.includes('if (mobile) shell.appendChild(createContextWorkbenchActions({ mobile: true }))')
        && contextWorkbenchPanel.includes('if (!isRuntimeMobileShell()) header.appendChild(createContextWorkbenchActions())')
        && contextWorkbenchPanel.includes('showOnHover: false, showOnFocus: false'),
    'Mobile Context Workbench must move persistent actions to the bottom and suppress floating tab tooltips.'
);
assert(
    style.includes('.saga-context-workbench-bottom-actions')
        && /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-context-workbench-shell-mobile\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/.test(style)
        && /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-context-workbench-shell-mobile \.saga-context-workbench-body\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?min-height:\s*0;/.test(style),
    'Mobile Context Workbench CSS must provide a bottom action bar while the body owns the remaining scrollable area.'
);
assert(
    liveSmoke.includes('Mobile Context Workbench still rendered persistent header actions')
        && liveSmoke.includes('Mobile Context Workbench bottom action bar missing')
        && liveSmoke.includes("label: 'Context Workbench'")
        && liveSmoke.includes("allowedSelectors: ['.saga-context-workbench-body']"),
    'Context harness smoke must enforce mobile Context Workbench bottom actions and nested-scroll ownership.'
);
assert(/@media \(max-width:\s*980px\)\s*\{[\s\S]*?\.saga-context-workbench-row-header\s*\{[\s\S]*?display:\s*none;/.test(style), 'Tablet and mobile Context Workbench rows must not preserve desktop table headers after collapsing to one column.');
assert(/@media \(max-width:\s*980px\)\s*\{[\s\S]*?\.saga-context-workbench-context-row:not\(\.saga-context-workbench-row-header\)[\s\S]*?flex:\s*0 0 auto;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?\.saga-context-workbench-context-row:not\(\.saga-context-workbench-row-header\) \.saga-lore-workbench-cell-main,[\s\S]*?white-space:\s*normal;/.test(style), 'Tablet Context Workbench collapsed rows must render as non-shrinking wrapped cards instead of stacked desktop table cells.');
assert(/@media \(max-width:\s*980px\)\s*\{[\s\S]*?\.saga-loredeck-library-details\s*\{[\s\S]*?height:\s*auto;[\s\S]*?linear-gradient\(180deg,\s*rgba\(22,\s*13,\s*18,\s*0\.98\),\s*rgba\(7,\s*8,\s*12,\s*0\.98\)\)/.test(style), 'Tablet Loredeck Library details must become a readable stacked card without translucent list bleed.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-library-resize-handle\s*\{[\s\S]*?display:\s*none;/.test(style), 'Mobile Loredeck Library must hide the desktop details resize handle.');
assert(
    !libraryPanel.includes("emblem.textContent = 'S'")
        && libraryPanel.includes("title.textContent = mobile ? 'Library' : 'Loredeck Library'")
        && libraryPanel.includes("if (!mobile) titleLine.appendChild(createLoredeckLibraryHeaderMeta")
        && libraryPanel.includes("if (!mobile) {\n        const subtitle = document.createElement('div');"),
    'Mobile Loredeck Library header must remove the S emblem and compact title/meta/subtitle chrome.'
);
assert(
    libraryPanel.includes("mobileBody: '.saga-loredeck-library-mobile-body'")
        && libraryPanel.includes('export function refreshLoredeckLibraryAfterStackMutation()')
        && runtimeActiveStackPanel.includes('refreshLoredeckLibraryAfterStackMutation();')
        && !/refreshLoredeckLibrarySelectionSurfaces\(\);\s*scheduleLoredeckLibraryOverlayRefresh\(\);/.test(runtimeActiveStackPanel),
    'Mobile Loredeck Library active-stack taps must refresh in place instead of rebuilding the overlay and jumping to the top.'
);
assert(!libraryPanel.includes('saga-loredeck-library-mobile-detail-affordance') && libraryPanel.includes('mobileLongPressTimer') && libraryPanel.includes('mobileLongPressFired') && libraryPanel.includes('openLoredeckLibraryMobileDetailSheet(pack.packId);') && libraryPanel.includes('openLoredeckLibraryMobileFolderDetailSheet(folderId);') && libraryPanel.includes('editable: !mobileTouch && isEditableLoredeckLibraryPack(pack)') && libraryPanel.includes('editable: !mobileTouch && !options.special') && libraryPanel.includes('if (!mobileTouch) {\n        const grip = document.createElement(\'span\');'), 'Mobile Loredeck Library browse cards and folders must use tap-hold/keyboard details and must not render per-object details, drag handles, or inline rename affordances.');
assert(libraryPanel.includes('function attachLoredeckLibraryLongPressAction') && libraryPanel.includes('const triggerOnRelease = options.triggerOnRelease === true') && libraryPanel.includes('longPressOnly: mobile') && libraryPanel.includes('coverLongPressOnly: mobile') && libraryPanel.includes("attachLoredeckLibraryLongPressAction(visual, event =>") && libraryPanel.includes('importLoredeckCoverImageFromFile(pack.packId);') && libraryPanel.includes('}, { triggerOnRelease: true });') && style.includes('.saga-loredeck-library-inline-title-longpress') && style.includes('.saga-loredeck-library-visual-longpress-editable'), 'Mobile Loredeck Library inspect sheets must use long-press title and cover editing instead of persistent edit buttons.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-library-cover-action,[\s\S]*?\.saga-loredeck-library-stack-toggle-button\s*\{[\s\S]*?min-width:\s*40px;[\s\S]*?min-height:\s*40px;/.test(style), 'Mobile Loredeck Library object actions must have touch-sized targets.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-library-folder-parent-control\s*\{[\s\S]*?flex:\s*1 1 100%;[\s\S]*?min-width:\s*0;[\s\S]*?display:\s*grid;/.test(style), 'Mobile Loredeck Library folder move controls must wrap as full-width touch alternatives instead of forcing horizontal overflow.');
assert(libraryPanel.includes('function createLoredeckLibraryFolderActionBar') && libraryPanel.includes('Move Selected Here') && libraryPanel.includes('Add Folder to Stack') && libraryPanel.includes('Move Folder') && libraryPanel.includes("inStack ? (stackItem.enabled ? 'In Stack' : 'Enable Deck') : 'Add to Stack'"), 'Mobile Loredeck Library must keep button alternatives for folder moves and stack adds instead of relying on drag or hover.');
assert(
    libraryPanel.includes('const mobile = isRuntimeMobileShell();')
        && libraryPanel.includes("shell.classList.add('saga-loredeck-library-shell-mobile')")
        && libraryPanel.includes('createLoredeckLibraryMobileBrowsePane')
        && libraryPanel.includes('createLoredeckLibraryMobileSelectedStrip')
        && libraryPanel.includes('createLoredeckLibraryMobileDetailSheet')
        && libraryPanel.includes('openLoredeckLibraryMobileDetailSheet')
        && libraryPanel.includes('createLoredeckLibraryMobileReorderSheet')
        && libraryPanel.includes('openLoredeckLibraryMobileReorderSheet')
        && libraryPanel.includes('moveLoredeckLibraryMobileReorderItem')
        && libraryPanel.includes('toggleLoredeckLibraryMobileDeckActive(pack.packId);')
        && libraryPanel.includes('getLoredeckLibraryMobileOrderMap')
        && libraryPanel.includes('saga-loredeck-library-mobile-order-badge')
        && libraryPanel.includes('if (existing && existing.enabled !== false) return removeLoredecksFromStack([id]);'),
    'Mobile Loredeck Library must render the touch browse pane and direct tap-order selection path.'
);
assert(
    libraryPanel.includes("if (mobile) {\n            body.appendChild(createLoredeckLibraryMobileBrowsePane")
        && libraryPanel.includes("} else {\n            const columns = document.createElement('div');")
        && libraryPanel.includes("if (!mobileTouch) {\n        const grip = document.createElement('span');"),
    'Mobile Loredeck Library must skip desktop columns, details, and deck drag handles in the default touch browse path.'
);
assert(
    libraryPanel.includes("reorder.disabled = activeItems.length < 2")
        && libraryPanel.includes("loredeckLibraryMobileReorderOpen && mobileActiveDeckItems.length > 1")
        && libraryPanel.includes("reorderLoredeckStackItem(records[current].key || createLoredeckStackDeckKey(id), records[target].index)")
        && libraryPanel.includes("grip.className = 'saga-loredeck-library-stack-grip saga-loredeck-library-mobile-reorder-grip'"),
    'Mobile Loredeck Library reorder mode must be explicit, selected-only, and backed by the shared active stack order.'
);
assert(
    /\.saga-loredeck-library-mobile-body\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow:\s*hidden;/.test(style)
        && /\.saga-loredeck-library-mobile-selected-strip\s*\{[\s\S]*?position:\s*sticky;/.test(style)
        && /\.saga-loredeck-library-deck-card\.saga-loredeck-library-deck-mobile-touch\s*\{[\s\S]*?grid-template-columns:\s*64px minmax\(0,\s*1fr\);/.test(style)
        && /\.saga-loredeck-library-deck-mobile-touch \.saga-loredeck-library-deck-title\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/.test(style)
        && /\.saga-loredeck-library-mobile-order-badge\s*\{[\s\S]*?position:\s*absolute;/.test(style)
        && /\.saga-loredeck-library-mobile-detail-backdrop\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?align-items:\s*flex-end;/.test(style)
        && /\.saga-loredeck-library-mobile-detail-panel\s*\{[\s\S]*?overflow-y:\s*auto;/.test(style),
    'Mobile Loredeck Library CSS must provide a one-pane touch layout with stable covers, readable titles, and numbered order badges.'
);
assert(
    /\.saga-loredeck-library-mobile-reorder-backdrop\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?align-items:\s*flex-end;/.test(style)
        && /\.saga-loredeck-library-mobile-reorder-row\s*\{[\s\S]*?grid-template-columns:\s*28px 24px 46px minmax\(0,\s*1fr\) auto;/.test(style)
        && /\.saga-loredeck-library-mobile-reorder-grip\s*\{[\s\S]*?cursor:\s*default;/.test(style)
        && /\.saga-loredeck-library-mobile-reorder-controls \.saga-runtime-button\s*\{[\s\S]*?min-height:\s*34px;/.test(style),
    'Mobile Loredeck Library reorder mode must render as an explicit sheet with handles and touch-sized move controls only inside reorder mode.'
);
assert(/\.saga-loredeck-creator-card\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/.test(style), 'Deck Maker workbench card must be a flex column so mobile ordering can prioritize the working object.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-creator-workbench-body \.saga-loredeck-creator-current-task\s*\{[\s\S]*?order:\s*-20;[\s\S]*?\.saga-loredeck-creator-workbench-body \.saga-loredeck-creator-stage-guide\s*\{[\s\S]*?order:\s*-10;/.test(style), 'Mobile Deck Maker workbench must render the current task before the stage roadmap.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-creator-stage-list\s*\{[\s\S]*?grid-auto-flow:\s*column;[\s\S]*?grid-auto-columns:\s*minmax\(132px,\s*42vw\);[\s\S]*?overflow-x:\s*auto;/.test(style), 'Mobile Deck Maker stage roadmap must become a compact horizontal rail instead of eight full-width cards.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-creator-workbench-body \.saga-loredeck-entry-list\s*\{[\s\S]*?max-height:\s*none;[\s\S]*?overflow:\s*visible;/.test(style), 'Mobile Deck Maker entry lists must flow in the Deck Maker body scroll instead of creating nested vertical scroll panes.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-creator-current-task,[\s\S]*?\.saga-loredeck-creator-queue-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/.test(style), 'Mobile Deck Maker workbench task and side rows must stack to one column.');
assert(/\.saga-loredeck-creator-workbench-body\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/.test(style) && /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-creator-workbench-body\s*\{[\s\S]*?padding:\s*8px;/.test(style), 'Mobile Deck Maker workbench body must remain scrollable inside the fullscreen shell with compact phone padding.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-creator-stage-main,[\s\S]*?\.saga-loredeck-creator-current-actions \.saga-runtime-button,[\s\S]*?\.saga-loredeck-creator-current-actions \.saga-primary-button\s*\{[\s\S]*?min-height:\s*40px;/.test(style), 'Mobile Deck Maker current-task and stage actions must remain touch-sized.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-creator-stage-reset\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;[\s\S]*?opacity:\s*1;/.test(style), 'Mobile Deck Maker reset controls must be visible and touch-sized.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-health-center-shell\s*\{[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100dvh;[\s\S]*?max-height:\s*100dvh;/.test(style), 'Mobile Pack Health Center shell must occupy the full phone viewport.');
assert(/\.saga-loredeck-health-center-body\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?min-height:\s*0;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?overflow:\s*hidden;/.test(style) && /\.saga-loredeck-health-center-content\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/.test(style) && /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-health-center-content\s*\{[\s\S]*?padding:\s*8px;/.test(style), 'Mobile Pack Health Center must preserve one primary content scroll region inside the fullscreen shell.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-health-tabs\s*\{[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?overflow-x:\s*auto;/.test(style), 'Mobile Pack Health tabs must scroll horizontally instead of shrinking into clipped labels.');
assert(
    healthPanel.includes('function isRuntimeMobileShell')
    && healthPanel.includes('createLoredeckHealthCenterActions(context, { mobile: true })')
    && healthPanel.includes('if (!mobile) header.appendChild(createLoredeckHealthCenterActions(context))')
    && healthPanel.includes('saga-loredeck-health-center-bottom-actions')
    && healthPanel.includes("createButton('Close', 'Close the Pack Health Center.', closeLoredeckHealthCenter)")
    && healthPanel.includes('wireOverlayBackdropClose(overlay, closeLoredeckHealthCenter)')
    && /\.saga-loredeck-health-center-bottom-actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,[\s\S]*?var\(--saga-mobile-safe-area-bottom/.test(style),
    'Pack Health Center mobile must move persistent Refresh/Export/Close actions to a bottom action bar while keeping Close and backdrop close reachable.'
);
assert(/\.saga-runtime-mobile \.saga-injection-preview\s*\{[\s\S]*?max-height:\s*none;[\s\S]*?overflow:\s*visible;/.test(style), 'Mobile Injection previews must flow in the route scroll instead of creating bounded preview scroll panes.');
assert(
    creatorPanel.includes('function isRuntimeMobileShell')
    && creatorPanel.includes('saga-loredeck-creator-workbench-shell-mobile')
    && creatorPanel.includes('createLoredeckCreatorWorkbenchActions(cached, { mobile: true, showClose: true })')
    && creatorPanel.includes('if (!(options.workbench && isRuntimeMobileShell()))')
    && /if \(!\(options\.workbench && isRuntimeMobileShell\(\)\)\) \{[\s\S]*?emblem\.textContent = 'S';[\s\S]*?titleRow\.appendChild\(emblem\);/.test(creatorPanel)
    && creatorPanel.includes("createButton('Close', 'Close the Deck Maker wizard.', closeLoredeckCreatorWorkbench)")
    && creatorPanel.includes('wireOverlayBackdropClose(overlay, closeLoredeckCreatorWorkbench)')
    && /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-creator-workbench-overlay \.saga-loredeck-creator-workbench-shell-mobile\s*\{[\s\S]*?height:\s*100svh;[\s\S]*?max-height:\s*100svh;/.test(style)
    && !/\.saga-loredeck-creator-workbench-overlay \.saga-loredeck-creator-workbench-shell-mobile\s*\{[\s\S]{0,220}max-height:\s*none;/.test(style)
    && /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-loredeck-creator-workbench-shell-mobile \.saga-loredeck-creator-workbench-body\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?min-height:\s*0;/.test(style)
    && /\.saga-loredeck-creator-workbench-bottom-actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,[\s\S]*?var\(--saga-mobile-safe-area-bottom/.test(style),
    'Deck Maker workbench mobile must hide the header emblem, cap the shell to the small viewport, and move persistent Project Settings and Close actions to a reachable bottom action bar.'
);
assert(visualSmokeDoc.includes('## Mobile Workbench Matrix'), 'Visual smoke runbook must document the mobile workbench matrix.');
for (const viewport of ['360x740', '390x844', '430x820', '768x1024']) {
    assert(visualSmokeDoc.includes(`\`${viewport}\``), `Visual smoke runbook is missing mobile viewport ${viewport}.`);
}
assert(
    fs.existsSync(mobileTouchRedesignDocPath)
        && documentationIndex.includes('Saga Mobile Touch Interaction Redesign')
        && documentationIndex.includes('SAGA_MOBILE_TOUCH_INTERACTION_REDESIGN.md'),
    'Documentation index must link the mobile touch interaction redesign plan.'
);
assert(
    mobileTouchRedesignDoc.includes('Default screen = readable objects.')
        && mobileTouchRedesignDoc.includes('Selected state = contextual actions.')
        && mobileTouchRedesignDoc.includes('Advanced state = explicit sheet or mode.'),
    'Mobile touch redesign must preserve the object-first interaction thesis.'
);
assert(
    mobileTouchRedesignDoc.includes('Browse folders and Loredecks -> tap Loredecks to activate -> tap order becomes stack order')
        && mobileTouchRedesignDoc.includes('There is no separate active stack pane in the default mobile Library.')
        && mobileTouchRedesignDoc.includes('Selection should write to the same active stack data used by desktop runtime')
        && mobileTouchRedesignDoc.includes('Do not create a mobile-only stack that can drift from desktop.'),
    'Mobile Library redesign must use direct tap-order selection against the shared active stack state.'
);
assert(
    mobileTouchRedesignDoc.includes('Tap-hold object')
        && mobileTouchRedesignDoc.includes('Accessibility requirement: every tap-hold or gesture-only action must also be')
        && mobileTouchRedesignDoc.includes('visible selected-object sheet, overflow control, or keyboard'),
    'Mobile touch redesign must require visible accessible alternatives for tap-hold and gesture actions.'
);
assert(
    mobileTouchRedesignDoc.includes('Generate | Automate | Lore')
        && mobileTouchRedesignDoc.includes('Lorecards route is `Generate | Lore`')
        && mobileTouchRedesignDoc.includes('The mobile Lorecards route must use a secondary bottom sub-tab bar above the')
        && mobileTouchRedesignDoc.includes('Each sub-tab has one job.')
        && mobileTouchRedesignDoc.includes('Do not render a mobile')
        && mobileTouchRedesignDoc.includes('route-level pages or as a row of ordinary')
        && mobileTouchRedesignDoc.includes('buttons inside the page body')
        && mobileTouchRedesignDoc.includes('Title wraps to at least two lines')
        && mobileTouchRedesignDoc.includes('Pending and accepted cards appear together in the same list.'),
    'Mobile Lorecards redesign must keep secondary sub-tab workspaces, readable two-line titles, and one unified Lore list.'
);
assert(
    lorecardsPanel.includes('function createEditableRelevanceControl')
        && lorecardsPanel.includes('saga-lore-relevance-segmented')
        && /\.saga-runtime-mobile \.saga-pending-review-entry-card \.saga-lore-entry-title,[\s\S]*?\.saga-runtime-mobile \.saga-lore-entry-card \.saga-lore-entry-title\s*\{[\s\S]*?white-space:\s*normal !important;[\s\S]*?overflow-wrap:\s*anywhere;/.test(style)
        && /\.saga-runtime-mobile \.saga-pending-review-entry-card \.saga-lore-entry-actions,[\s\S]*?\.saga-runtime-mobile \.saga-lore-entry-card \.saga-lore-entry-actions\s*\{[\s\S]*?flex:\s*1 0 100% !important;[\s\S]*?flex-wrap:\s*wrap;/.test(style),
    'Mobile Lorecards must keep titles readable by moving controls into a wrapped action tray and replacing the old relevance select with a segmented control.'
);
assert(
    mobileTouchRedesignDoc.includes('mobile-library-touch-harness')
        && mobileTouchRedesignDoc.includes('mobile-lorecards-touch-harness')
        && mobileTouchRedesignDoc.includes('Real phone-width Library browse with folders and multiple selected Loredecks')
        && mobileTouchRedesignDoc.includes('Tablet/desktop sanity pass proving desktop Library stack/details behavior'),
    'Mobile touch redesign must define rendered verification targets for Library, Lorecards, and desktop preservation.'
);
assert(
    visualSmokeDoc.includes("SAGA_SMOKE_TARGET='mobile-redesign-harness'")
        && visualSmokeDoc.includes('mobile-redesign-360x740-01-library-browse.png')
        && visualSmokeDoc.includes('mobile-redesign-360x740-06-lorecards-generate.png')
        && visualSmokeDoc.includes('selected-only reorder sheets')
        && visualSmokeDoc.includes('mode-aware animated secondary sub-tab bar')
        && visualSmokeDoc.includes('does not use a `Lorecard Pipeline` card or lifecycle button row')
        && visualSmokeDoc.includes('Pending Review rows expose only Accept and Reject'),
    'Visual smoke runbook must document the focused mobile touch redesign CDP target and screenshots.'
);
assert(visualSmokeDoc.includes('shared mobile shell contracts') && visualSmokeDoc.includes('touch-redesign contracts'), 'Visual smoke runbook must name the shared shell and touch-redesign contracts for final mobile assertions.');
assert(visualSmokeDoc.includes('Mobile UX revision review') && visualSmokeDoc.includes('Lorecards secondary sub-tab bar') && visualSmokeDoc.includes('one dominant next action') && visualSmokeDoc.includes('runtime top header is absent') && visualSmokeDoc.includes('active bottom tab becomes `Exit`') && visualSmokeDoc.includes('bottom bar labels'), 'Visual smoke runbook must document the mobile UX revision visual-review targets.');
assert(visualSmokeDoc.includes('Basic bottom nav includes Settings') && visualSmokeDoc.includes('Basic mobile nav: Loredecks, Session, Context, Lorecards, Settings'), 'Visual smoke runbook must document Basic Settings reachability directly through the bottom nav.');
assert(visualSmokeDoc.includes('Advanced icon-only bottom nav') && visualSmokeDoc.includes('Loredecks, Session, Continuity, Context, Lorecards, Injection, Settings'), 'Visual smoke runbook must document the Advanced direct bottom-nav route set.');
assert(!runtimeShellView.includes('function renderMobileMoreSheet') && !runtimeShellView.includes("mobile.activeRoute === 'more'"), 'Mobile overflow-sheet routing must be removed from the runtime shell view.');
assert(visualSmokeDoc.includes('Basic/Advanced walkthrough target resolvability') && visualSmokeDoc.includes('walkthrough popover target reachability after mobile routing'), 'Visual smoke runbook must document rendered follow-up for walkthrough target reachability after mobile routing.');
assert(visualSmokeDoc.includes('Session, Loredecks, and Context next-actions') && visualSmokeDoc.includes('Basic Session next-action') && visualSmokeDoc.includes('Loredecks static Library launch card') && visualSmokeDoc.includes('Session next-action routing') && visualSmokeDoc.includes('Loredecks static Library launch routing') && visualSmokeDoc.includes('Context next-action routing'), 'Visual smoke runbook must document rendered follow-up for mobile next-action routing and static Loredecks Library launch routing.');
assert(visualSmokeDoc.includes('mode-aware Lorecards secondary sub-tab bar') && visualSmokeDoc.includes('`Generate | Lore` in Basic') && visualSmokeDoc.includes('`Generate | Automate | Lore` in Advanced') && visualSmokeDoc.includes('Lorecards secondary sub-tab animation and placement'), 'Visual smoke runbook must document rendered follow-up for mode-aware Lorecards secondary sub-tab navigation.');
assert(visualSmokeDoc.includes('unified Lore list ownership') && visualSmokeDoc.includes('Pending Review rows with only Accept/Reject'), 'Visual smoke runbook must document rendered follow-up for the mobile unified Lore list.');
assert(visualSmokeDoc.includes('Accepted long-press edit access'), 'Visual smoke runbook must document rendered follow-up for Accepted long-press edit access.');
assert(visualSmokeDoc.includes('Accepted') && visualSmokeDoc.includes('Accepted/Active object cards') && visualSmokeDoc.includes('Accepted long-press editing without tap-to-edit or permanent Edit/Inspect buttons'), 'Visual smoke runbook must document rendered follow-up for Accepted object-card management.');
assert(visualSmokeDoc.includes('Accepted long-title wrapping') && visualSmokeDoc.includes('Accepted long-title object cards'), 'Visual smoke runbook must document rendered follow-up for readable Accepted Lorecard titles.');
assert(visualSmokeDoc.includes('Rendered Pending wording review') && visualSmokeDoc.includes('Accept/Reject wording') && visualSmokeDoc.includes('pending rows exposing only Accept and Reject') && visualSmokeDoc.includes('selected context or detail affordance') && visualSmokeDoc.includes('without falling back to Apply/Dismiss copy'), 'Visual smoke runbook must document rendered follow-up for Pending Accept/Reject wording and selected/detail edit behavior.');
assert(visualSmokeDoc.includes('Rendered Accepted object-action review') && visualSmokeDoc.includes('object-state chips') && visualSmokeDoc.includes('desktop detail-pane controls') && visualSmokeDoc.includes('mobile long-press editing') && visualSmokeDoc.includes('without showing equal permanent row buttons'), 'Visual smoke runbook must document rendered follow-up for Accepted object-state interactions.');
assert(/\| `360x740` \| Basic \|[^\n]*Lorecards secondary `Generate \| Lore` sub-tab bar/.test(visualSmokeDoc), 'Visual smoke runbook must document the Basic Lorecards secondary sub-tab bar in the 360px Basic matrix.');
assert(/\| `430x820` \| Advanced \|[^\n]*Lorecards secondary sub-tabs/.test(visualSmokeDoc) && visualSmokeDoc.includes('unified Lore object list'), 'Visual smoke runbook must document unified Lore object cards and secondary sub-tabs in the 430px Advanced matrix.');
assert(visualSmokeDoc.includes('scrollable Deck Maker workbench body') && visualSmokeDoc.includes('Deck Maker current-task actions'), 'Visual smoke runbook must document rendered follow-up for Deck Maker body scrolling and current-task actions.');
assert(visualSmokeDoc.includes('Advanced bottom-owned Pack Health Center actions') && visualSmokeDoc.includes('Advanced Pack Health bottom actions'), 'Visual smoke runbook must document rendered follow-up for Advanced Pack Health bottom-owned actions.');
assert(visualSmokeDoc.includes('Advanced bottom-owned Deck Maker workbench actions') && visualSmokeDoc.includes('Advanced Health/Deck Maker bottom actions'), 'Visual smoke runbook must document rendered follow-up for Advanced Deck Maker bottom-owned actions.');
assert(visualSmokeDoc.includes('global nested-scroll audit results'), 'Visual smoke runbook must document rendered follow-up for the global mobile nested-scroll audit.');
assert(visualSmokeDoc.includes('compact content padding') && /browser pass[\s\S]*compact content padding/.test(visualSmokeDoc), 'Visual smoke runbook must document rendered follow-up for compact Revision 3 content padding.');
assert(visualSmokeDoc.includes('bottom-bar safe-area padding') && /browser pass[\s\S]*bottom-bar safe-area padding/.test(visualSmokeDoc), 'Visual smoke runbook must document rendered follow-up for bottom-bar safe-area padding.');
assert(visualSmokeDoc.includes('active tab state exposure') && /browser pass[\s\S]*active tab state exposure/.test(visualSmokeDoc), 'Visual smoke runbook must document rendered follow-up for active tab state exposure.');
assert(visualSmokeDoc.includes('removed runtime top header') && /browser pass[\s\S]*removed runtime top header/.test(visualSmokeDoc), 'Visual smoke runbook must document rendered follow-up for removing the mobile runtime top header.');
assert(visualSmokeDoc.includes('bottom shell back action') && visualSmokeDoc.includes('active bottom tab becomes `Exit`') && /browser pass[\s\S]*active bottom tab becomes `Exit`/.test(visualSmokeDoc), 'Visual smoke runbook must document rendered follow-up for bottom shell actions and the active-tab Exit close path.');
assert(visualSmokeDoc.includes('Advanced Health/Deck Maker close affordances') && visualSmokeDoc.includes('reachable Advanced Health/Deck Maker close affordances'), 'Visual smoke runbook must document rendered follow-up for Advanced Health and Deck Maker close controls.');
assert(visualSmokeDoc.includes('hybrid mythic-tech/source-franchise-free styling') && visualSmokeDoc.includes('not fandom-specific fantasy, generic sci-fi, generic SaaS, or pure cyberpunk treatment'), 'Visual smoke runbook must document rendered visual review for hybrid mythic-tech/source-franchise-free styling.');
assert(/\| `768x1024` \| Advanced \|[^\n]*desktop rail\/drawer preservation/.test(visualSmokeDoc) && visualSmokeDoc.includes('Rendered desktop preservation review') && visualSmokeDoc.includes('desktop rail/drawer preservation at desktop widths'), 'Visual smoke runbook must document rendered desktop rail/drawer preservation for the tablet/desktop shell pass.');
assert(visualSmokeDoc.includes('Deck Maker review-queue anchors/actions') && visualSmokeDoc.includes('Deck Maker review-queue routing') && visualSmokeDoc.includes('Context proposal review overlay/actions'), 'Visual smoke runbook must document rendered follow-up for Deck Maker review queue and Context proposal review coverage.');
assert(!visualSmokeDoc.includes('Deck Health Center') && !visualSmokeDoc.includes('Open Health Center') && !visualSmokeDoc.includes('Health Report'), 'Visual smoke runbook must use current Pack Health Center and Open Pack Health Center labels.');
for (const token of [
    '--saga-mobile-control-height',
    '--saga-mobile-icon-button-size',
    '--saga-mobile-row-action-size',
    '--saga-mobile-bottom-bar-height',
    '--saga-mobile-content-bottom-padding',
]) {
    assert(style.includes(token), `Mobile shell token ${token} must remain in the bundled CSS.`);
}
assert(/\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile\s*\{[\s\S]*?--saga-mobile-content-bottom-padding:\s*8px;/.test(style) && /\.saga-runtime-mobile\.saga-mobile-lorecards-subtabs-active\s*\{[\s\S]*?--saga-mobile-content-bottom-padding:\s*8px;/.test(style), 'Revision 3 mobile content must not reserve fake bottom-bar height because shell bars are flex siblings.');
assert(/\.saga-mobile-bottom-bar\s*\{[\s\S]*?min-height:\s*calc\(var\(--saga-mobile-bottom-bar-height,\s*72px\) \+ var\(--saga-mobile-safe-area-bottom,\s*0px\)\)[\s\S]*?padding:\s*6px 8px calc\(6px \+ var\(--saga-mobile-safe-area-bottom,\s*0px\)\)/.test(style), 'Mobile bottom bar must include safe-area bottom padding in its height and inset.');
assert(runtimeNavigation.includes("export const BASIC_MOBILE_BOTTOM_ROUTES = Object.freeze(['loredecks', 'session', 'context', 'lore', 'settings']);"), 'Basic mobile bottom bar order must remain Loredecks, Session, Context, Lorecards, Settings.');
assert(runtimeNavigation.includes("export const ADVANCED_MOBILE_BOTTOM_ROUTES = Object.freeze(['loredecks', 'session', 'continuity', 'context', 'lore', 'injection', 'settings']);"), 'Advanced mobile bottom bar order must remain Loredecks, Session, Continuity, Context, Lorecards, Injection, Settings.');
assert(runtimeNavigation.includes('getMobileBottomRoutes(settings = getSettings())') && runtimeNavigation.includes("normalizeExperienceMode(settings?.experienceMode) === 'advanced'"), 'Mobile bottom routes must be selected by Experience Mode.');
assert(runtimeShell.includes('export const MOBILE_SHELL_MAX_WIDTH = 640;') && runtimeShell.includes('export function isRuntimeMobileShell') && runtimeShell.includes('return Number(width) <= MOBILE_SHELL_MAX_WIDTH;'), 'Runtime shell must keep the shared 640px mobile breakpoint helper.');
const mobileShellMaxWidthMatch = runtimeShell.match(/export const MOBILE_SHELL_MAX_WIDTH = (\d+);/);
assert(mobileShellMaxWidthMatch && Number(mobileShellMaxWidthMatch[1]) < 768 && visualSmokeDoc.includes('768px tablet desktop-shell coexistence'), 'The 768px tablet smoke viewport must stay above the shared mobile-shell breakpoint and be documented as desktop-shell coexistence.');
assert(runtimeShellView.includes("if (isRuntimeMobileShell())") && runtimeShellView.includes('renderMobilePanelShell(root, state, settings);') && runtimeShellView.includes("root.className = 'saga-lore-panel saga-runtime-shell';") && runtimeShellView.includes('root.appendChild(renderRail(state));') && runtimeShellView.includes('if (desktopLorecardsFlyoutOpen) root.appendChild(renderDesktopLorecardsFlyout(root, state, settings));') && runtimeShellView.includes('if (drawerOpen) root.appendChild(renderDrawer(state, drawerDirection));'), 'Desktop runtime shell must preserve the rail/drawer render path above the mobile breakpoint while allowing the Lorecards flyout to sit between rail and drawer.');
assert(panel.includes('function syncRuntimeShellFrame') && panel.includes('panelRoot = existing;') && panel.includes('syncRuntimeShellFrame(existing, state.lorePanel, drawerDirection);') && panel.includes('applyRuntimeShellGeometry(root, panelState);') && panel.includes("root.style.setProperty('--saga-drawer-width'") && panel.includes('drawer.style.width = `${drawerWidth}px`;'), 'Runtime panel refresh must reapply chat-specific desktop shell geometry before reusing or rerendering the existing shelf DOM.');
assert(runtimeShellView.includes('function renderDesktopLorecardsFlyout') && runtimeShellView.includes("nav.className = 'saga-desktop-lorecards-flyout'") && runtimeShellView.includes('function updateDesktopLorecardsFlyoutPosition') && runtimeShellView.includes('schedule(() => updateDesktopLorecardsFlyoutPosition(root, nav));') && runtimeShellView.includes("tab.setAttribute('aria-haspopup', 'true')") && runtimeShellView.includes('selectRuntimeLorecardsStage(stage)') && runtimeShellView.includes('getRuntimeLorecardsStages(settings)') && style.includes('.saga-desktop-lorecards-flyout::before') && style.includes('var(--saga-lorecards-flyout-offset') && style.includes('animation: saga-desktop-lorecards-flyout-in'), 'Desktop Lorecards must expose a button-centered mode-aware Generate/Automate/Lore flyout that visually branches from the rail tab.');
assert(runtimeShellView.includes("option.setAttribute('aria-label', meta.label)") && runtimeShellView.includes("tab.setAttribute('aria-label', label)") && !runtimeShellView.includes('addTooltip(option, meta.tooltip)') && !runtimeShellView.includes('addTooltip(tab, getTabTooltipForExperience(tabId, settings))'), 'Desktop Lorecards flyout buttons and shelf tab buttons must keep accessible labels without wiring floating hover/focus tooltips.');
assert(style.includes('left: calc(var(--saga-rail-width, 52px) + 4px)') && style.includes('var(--saga-bg-gradient-start,') && style.includes('var(--saga-bg-gradient-end,') && style.includes('var(--saga-button,') && style.includes('var(--saga-button-hover,') && style.includes('var(--saga-surface-2,') && style.includes('var(--saga-border-soft,') && style.includes('var(--saga-border-strong,') && style.includes('var(--saga-gold-surface,'), 'Desktop Lorecards flyout must stay close to the rail and inherit the active Theme Pack through Saga shelf tokens.');
assert(runtimeShell.includes('subviewStacks: {') && runtimeShell.includes('loredecks: []') && runtimeShell.includes('continuity: []') && runtimeShell.includes('context: []') && runtimeShell.includes('lore: []') && runtimeShell.includes('injection: []') && runtimeShell.includes('settings: []'), 'Runtime mobile state must normalize per-route subview stacks.');
for (const helper of ['selectRuntimeMobileRoute', 'pushRuntimeMobileSubview', 'popRuntimeMobileSubview', 'clearRuntimeMobileSubviews', 'goBackRuntimeMobileShell']) {
    assert(runtimeShell.includes(`export function ${helper}`), `Runtime shell must export mobile helper ${helper}.`);
}
assert(runtimeShellView.includes("root.className = 'saga-lore-panel saga-runtime-shell saga-runtime-mobile saga-mobile-touch'") && runtimeShellView.includes("body.className = 'saga-lore-panel-body saga-mobile-content'"), 'Runtime shell view must render the mobile shell and content classes.');
assert(runtimeShellView.includes("bar.setAttribute('aria-label', 'Saga mobile navigation')") && runtimeShellView.includes("tab.setAttribute('aria-current', 'page')") && runtimeShellView.includes("tab.dataset.mobileRoute = route"), 'Mobile bottom bar must expose accessible current-route navigation.');
assert(runtimeShellView.includes('root.dataset.mobileRoute = mobile.activeRoute') && runtimeShellView.includes('root.dataset.mobileActiveTab = activeTab') && runtimeShellView.includes("tab.classList.add('saga-mobile-bottom-tab-active')") && runtimeShellView.includes("tab.setAttribute('aria-current', 'page')"), 'Mobile shell must expose the active route through root datasets, active bottom-tab styling, and aria-current.');
assert(runtimeShellView.includes('const MOBILE_NAV_TOOLTIP_OPTIONS = Object.freeze({ showOnHover: false, showOnFocus: false });') && runtimeShellView.includes('function addMobileNavigationLabel') && runtimeShellView.includes('hideFloatingTooltip();') && runtimeShellView.includes("addMobileNavigationLabel(tab, active ? 'Close the Saga runtime window.' : getMobileRouteTooltip(route, settings));") && runtimeShellView.includes('addMobileNavigationLabel(tab, meta.tooltip);'), 'Revision 3 mobile bottom tabs and Lorecards sub-tabs must keep accessible labels without wiring floating tooltip hover/focus listeners.');
assert(runtimeShellView.includes('bar.style.setProperty') && runtimeShellView.includes('--saga-mobile-bottom-tab-count') && !runtimeShellView.includes("divider.className = 'saga-mobile-bottom-divider'"), 'Mobile bottom bar must use dynamic route columns instead of a fixed divider spacer.');
assert(runtimeShellView.includes('function createMobileRouteIcon') && runtimeShellView.includes('const iconRoute = route;') && runtimeShellView.includes('getTabIconSrc(iconRoute, settings)') && runtimeShellView.includes("iconImg.alt = ''") && runtimeShellView.includes("iconImg.setAttribute('draggable', 'false')"), 'Mobile shell routes must use the configured Saga icon assets with decorative image alt text.');
assert(runtimeShellView.includes('active ? createMobileBottomExitIcon() : createMobileRouteIcon') && runtimeShellView.includes("text.textContent = active ? 'Exit' : label") && runtimeShellView.includes('hideRuntimeMobileShell();') && runtimeShellView.includes('function createMobileBottomExitIcon'), 'The active mobile bottom tab must morph into the primary Exit control.');
assert(runtimeShellView.includes("tab.addEventListener('contextmenu', event => event.preventDefault())") && /saga-mobile-bottom-tab[\s\S]*?-webkit-touch-callout:\s*none;/.test(style) && /saga-mobile-bottom-icon-img[\s\S]*?-webkit-user-drag:\s*none;/.test(style), 'Mobile nav icon surfaces must suppress Android image callouts and drag/download prompts.');
assert(!runtimeShellView.includes('function renderMobileHeader') && !runtimeShellView.includes('root.appendChild(renderMobileHeader') && runtimeShellView.includes('function renderMobileShellActionBar') && runtimeShellView.includes("bar.className = 'saga-mobile-shell-action-bar'") && runtimeShellView.includes("button.dataset.mobileShellAction = kind") && runtimeShell.includes("'.saga-mobile-shell-back, .saga-mobile-bottom-tab-active'"), 'Revision 3 mobile shell must remove the redundant top header and keep back navigation in the bottom-oriented shell action bar.');
assert(!style.includes('.saga-mobile-header') && !style.includes('.saga-mobile-more-sheet') && !style.includes('.saga-mobile-more-entry') && !style.includes('.saga-mobile-bottom-divider'), 'Removed mobile header, overflow sheet, and divider CSS must not remain as dead mobile shell styling.');
assert(runtimeShellView.includes("if (mobile.activeRoute === 'loredecks') return null;"), 'Loredecks mobile tab must not render the shell Back button.');
assert(!runtimeShellView.includes("activeSubview?.id === 'session-story-opener'"), 'Story Maker must not special-case mobile shell Back behavior because it renders as a closeable Session dropdown.');
assert(/\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile\s*\{[\s\S]*?height:\s*100dvh[\s\S]*?overflow:\s*hidden/.test(style), 'Mobile runtime shell must occupy the phone viewport without horizontal page overflow.');
assert(/\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile\s*\{[\s\S]*?rgba\(215,\s*181,\s*109,\s*0\.12\)[\s\S]*?rgba\(36,\s*141,\s*150,\s*0\.12\)[\s\S]*?linear-gradient\(145deg,\s*rgb\(18,\s*12,\s*18\),\s*rgb\(9,\s*12,\s*18\)\),[\s\S]*?#07090d !important;/.test(style), 'Mobile runtime shell must keep the Saga Archive treatment over a fully opaque background.');
assert(/\.saga-runtime-mobile \.saga-runtime-rail,[\s\S]*?\.saga-runtime-mobile \.saga-runtime-drawer,[\s\S]*?\.saga-runtime-mobile \.saga-lore-panel-resize-handle\s*\{[\s\S]*?display:\s*none !important;/.test(style), 'Mobile runtime shell must hide desktop rail, drawer, and resize handles.');
assert(/\.saga-mobile-shell-action-bar\s*\{[\s\S]*?border-top:[\s\S]*?linear-gradient\(180deg,\s*rgba\(9,\s*13,\s*18,\s*0\.9\)/.test(style) && /\.saga-mobile-shell-action-symbol-back::before[\s\S]*?\.saga-mobile-shell-action-symbol-close::before/.test(style), 'Revision 3 shell Back/Exit icon treatment must live in bottom-oriented shell action surfaces, not the removed mobile header.');
assert(/\.saga-mobile-bottom-bar\s*\{[\s\S]*?grid-template-columns:\s*repeat\(var\(--saga-mobile-bottom-tab-count,\s*5\),\s*minmax\(0,\s*1fr\)\)/.test(style), 'Mobile bottom bar CSS must use route-count driven columns.');
assert(/\.saga-mobile-bottom-label\s*\{[\s\S]*?font-size:\s*10\.5px;/.test(style) && !/\.saga-mobile-bottom-label\s*\{[\s\S]*?font-size:\s*9px;/.test(style), 'Mobile bottom labels must keep a readable fixed size instead of shrinking to 9px at phone widths.');
assert(style.includes('.saga-mobile-bottom-bar-icon-only') && /\.saga-mobile-bottom-bar-icon-only \.saga-mobile-bottom-label\s*\{[\s\S]*?clip:\s*rect\(0 0 0 0\)/.test(style), 'Advanced mobile bottom bar must support icon-only labels while keeping accessible text.');
assert(/\.saga-mobile-bottom-tab-active\s*\{[\s\S]*?var\(--saga-border-strong[\s\S]*?color-mix\(in srgb,\s*var\(--saga-button-hover[\s\S]*?var\(--saga-gold/.test(style), 'Mobile bottom active tabs must derive their active treatment from the current Theme Pack tokens.');
assert(/\.saga-mobile-lorecards-subtab-active,[\s\S]*?\.saga-mobile-lorecards-subtab\[aria-selected="true"\]\s*\{[\s\S]*?var\(--saga-border-strong[\s\S]*?color-mix\(in srgb,\s*var\(--saga-button-hover[\s\S]*?var\(--saga-gold/.test(style), 'Mobile Lorecards active sub-tabs must derive their active treatment from the current Theme Pack tokens.');
assert(/\.saga-mobile-bottom-tab-active \.saga-mobile-bottom-icon-img\s*\{[\s\S]*?saturate\(1\.05\)[\s\S]*?color-mix\(in srgb,\s*var\(--saga-gold/.test(style), 'Mobile active route icons must keep a theme-token glow instead of hardcoded Archive colors.');
assert(style.includes('.saga-mobile-bottom-exit-icon') && style.includes('.saga-settings-experience-card') && runtimeSettingsTab.includes('Experience Mode') && runtimeSettingsTab.includes('createExperienceModeSwitch') && !runtimeSettingsTab.includes('Choose how much of Saga is visible in the runtime window.'), 'Mobile bottom Exit icon and Settings-owned Experience Mode styles must be present without redundant helper copy.');
assert(/\.saga-runtime-mobile \.saga-lore-panel-body\.saga-mobile-content\s*\{[\s\S]*?overflow:\s*hidden !important;[\s\S]*?padding:\s*8px 8px var\(--saga-mobile-content-bottom-padding,\s*8px\)/.test(style), 'Mobile content must avoid horizontal overflow while using compact page padding under Revision 3.');
const mobileFontAudit = getMobileFontSizeAudit(style);
assert(mobileFontAudit.min > 0 && mobileFontAudit.max / mobileFontAudit.min <= 2, `Mobile font-size selectors must stay within a 2x scale; saw ${mobileFontAudit.min}px to ${mobileFontAudit.max}px.`);
assert(!cssRuleDeclares(style, '.saga-runtime-mobile.saga-mobile-touch .saga-runtime-button', ['font-size']), 'Mobile touch buttons must not inherit the larger form-control font size.');
assert(!/\.saga-mobile-lorecard-entry-editor \.saga-lore-editor-field,[\s\S]*?font-size:\s*1rem/.test(style), 'Mobile Lorecard editor labels must stay on the compact mobile text scale.');
assert(themeActions.includes('refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });'), 'Changing Icon Set must refresh mobile navigation surfaces.');
assert(lorecardsPanel.includes("const LORECARD_LIFECYCLE_STAGES = Object.freeze(['suggested', 'pending', 'accepted', 'active']);"), 'Lorecards lifecycle stages must remain suggested -> pending -> accepted -> active.');
assert(lorecardsPanel.includes("const MOBILE_LORECARD_LIFECYCLE_STAGES = Object.freeze(['generate', 'automation', 'lore']);"), 'Mobile Lorecards lifecycle navigation must expose Generate, Automate, and Lore in that order.');
for (const label of ['Lore', 'Generate', 'Automate', 'Needs Review', 'Active']) {
    assert(lorecardsPanel.includes(label), `Lorecards lifecycle label ${label} must remain visible.`);
}
assert(runtimeShell.includes("export const BASIC_LORECARDS_STAGES = Object.freeze(['generate', 'lore']);") && runtimeShell.includes("export const ADVANCED_LORECARDS_STAGES = Object.freeze(['generate', 'automation', 'lore']);") && runtimeShell.includes('export function getRuntimeLorecardsStages') && runtimeShell.includes('normalizeExperienceMode(settings?.experienceMode)') && runtimeShell.includes('export function normalizeRuntimeMobileLorecardsStage') && runtimeShell.includes('export const normalizeRuntimeLorecardsStage = normalizeRuntimeMobileLorecardsStage;') && runtimeShell.includes("if (stage === 'pending' || stage === 'accepted' || stage === 'approved' || stage === 'active' || stage === 'cards') return 'lore';") && runtimeShell.includes("if (stage === 'suggested' || stage === 'generation') return 'generate';") && runtimeShell.includes('lorecardsStage: normalizeRuntimeLorecardsStage') && runtimeShell.includes('export function getRuntimeLorecardsStage') && runtimeShell.includes('export function selectRuntimeLorecardsStage(stage)') && runtimeShell.includes('export function selectRuntimeMobileLorecardsStage(stage)'), 'Runtime shell must own mode-aware Lorecards Generate/Lore and Generate/Automate/Lore sub-tab state for desktop and mobile.');
assert(runtimeShell.includes('function normalizeMobileLoreSubviewStack(stack, settings = getSettingsForShell())') && runtimeShell.includes('.filter(item => !normalizeRuntimeMobileLorecardsStage(item?.params?.stage, settings))'), 'Runtime shell must drop stale Lorecards stage subviews instead of reopening the old mobile pipeline flow.');
assert(runtimeShellView.includes('function renderMobileLorecardsSubTabs') && runtimeShellView.includes("nav.className = 'saga-mobile-lorecards-subtabs'") && runtimeShellView.includes("nav.setAttribute('role', 'tablist')") && runtimeShellView.includes("tab.setAttribute('role', 'tab')") && runtimeShellView.includes("tab.setAttribute('aria-selected'") && runtimeShellView.includes('selectRuntimeMobileLorecardsStage(stage)'), 'Mobile Lorecards sub-tabs must render from the shell with tab semantics and route selection.');
assert(runtimeShellView.includes("if (mobile.activeRoute === 'lore' && !options.error)") && runtimeShellView.includes('root.appendChild(renderMobileLorecardsSubTabs(state, settings));') && runtimeShellView.includes('root.appendChild(renderMobileBottomBar(state, settings));'), 'Mobile Lorecards sub-tab bar must appear only on the Lorecards route and sit above the main bottom bar.');
assert(/\.saga-mobile-lorecards-subtabs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(var\(--saga-mobile-lorecards-subtab-count,\s*3\),\s*minmax\(0,\s*1fr\)\)/.test(style) && runtimeShellView.includes("nav.style.setProperty('--saga-mobile-lorecards-subtab-count'") && /\.saga-mobile-lorecards-subtabs-intro \.saga-mobile-lorecards-subtabs\s*\{[\s\S]*?animation:\s*saga-mobile-lorecards-subtabs-in/.test(style) && runtimeShellView.includes('mobileLorecardsSubtabsIntroSeen') && style.includes('.saga-runtime-mobile.saga-mobile-lorecards-subtabs-active') && style.includes('--saga-mobile-lorecards-subtab-height'), 'Mobile Lorecards sub-tabs must use the mode-aware stage count and run intro animation only on first Lorecards entry.');
assert(lorecardsPanel.includes("return 'generate';") && lorecardsPanel.includes("if (lifecycleStage === 'generate')") && lorecardsPanel.includes("createCollapsibleSection(\n        'lore.generation',\n        'Generate'") && lorecardsPanel.includes("card.appendChild(createLoreAutomationHeader(mobileShell ? 'Automate' : 'Lore Automation', settings));") && lorecardsPanel.includes('fragment.appendChild(createLorecardWorkspace(state, { basic, lifecycleStats }));') && lorecardsPanel.includes('scheduleMobileLorecardsStageRender(mount, state, { basic, lifecycleStats, lifecycleStage });') && lorecardsPanel.includes('function createLorecardsStageContent') && lorecardsPanel.includes('function createMobileLorecardsStageContent'), 'Lorecards Generate is the first/default page, headings match the sub-tabs, and Lore owns the full pending/accepted queue after an immediate loading shell on mobile.');
assert(lorecardsPanel.includes("if (lifecycleStage === 'automation')") && lorecardsPanel.includes('createLoreAutomationPage(state)') && lorecardsPanel.includes('createLoreAutomationCadenceSwitch') && lorecardsPanel.includes('refreshAutoRelevanceCardInPlace') && !lorecardsPanel.includes("settings.loreAutomationPaused === true ? 'Resume' : 'Pause'") && lorecardsPanel.includes("createButton('Run Now'") && lorecardsPanel.includes('forceProvider: true') && lorecardsPanel.includes("createButton('Undo Last Run'") && lorecardsPanel.includes('createLoreAutomationActivityList(state)') && lorecardsPanel.includes('createLoreAutomationStateBadge(entry)') && !lorecardsPanel.includes('Use Utility Provider adjudication'), 'Lorecards Automation tab must render the Lore Automation cockpit with Manual/Auto cadence, provider-backed Run Now, Undo, no Pause button, and no Utility adjudication checkbox.');
assert(lorecardsPanel.includes("const LORE_AUTOMATION_MODE_BUTTON_VALUES = Object.freeze(['ar', 'armp', 'armpc']);") && lorecardsPanel.includes("armp: 'Auto-Relevance Muting Prominence'") && lorecardsPanel.includes("armpc: 'Auto-Relevance Muting Prominence Curating'") && lorecardsPanel.includes('function createLoreAutomationChoiceGroup') && lorecardsPanel.includes('group.dataset.choiceGroup') && lorecardsPanel.includes("blankWhen: value => !value") && lorecardsPanel.includes("const mode = meta.active ? 'off' : normalizeLoreAutomationMode(value);"), 'Lore Automation must replace the mobile Mode dropdown with three touch buttons where no selected button means Off and ARMP/ARMPC describe Prominence.');
assert(lorecardsPanel.includes('LORE_AUTOMATION_STYLE_DESCRIPTIONS') && lorecardsPanel.includes('LORE_AUTOMATION_PACING_DESCRIPTIONS') && style.includes('.saga-lore-automation-choice-buttons') && style.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'Lore Automation Style and Pacing must use three-button segmented controls with compact summaries.');
assert(style.includes('.saga-lore-automation-header-actions') && style.includes('.saga-lore-automation-cadence-switch') && style.includes('.saga-lore-automation-choice-group-disabled') && style.includes('.saga-lore-automation-header .saga-runtime-button') && style.includes('.saga-lore-automation-cadence-option'), 'Lore Automation reset defaults and Manual/Auto cadence switch must be compact and right-aligned in the title row, with disabled auto configuration styling.');
assert(
    defaultSettings.includes('mobileLorecardListTagsVisible: false')
        && defaultSettings.includes("'settings.qualityOfLife': false")
        && settingsStore.includes('merged.mobileLorecardListTagsVisible = merged.mobileLorecardListTagsVisible === true;')
        && runtimeSettingsTab.includes("'settings.qualityOfLife'")
        && runtimeSettingsTab.includes("className: 'saga-settings-qol-section'")
        && runtimeSettingsTab.includes('createQualityOfLifeSettingsCard(settings, { embedded: true })')
        && !runtimeSettingsTab.includes('createSectionHeader')
        && runtimeSettingsTab.includes("toggle.className = 'saga-settings-qol-item saga-settings-switch-row saga-settings-mobile-tags-toggle'")
        && runtimeSettingsTab.includes("checkbox.className = 'saga-settings-switch-input'")
        && runtimeSettingsTab.includes("checkbox.setAttribute('role', 'switch')")
        && runtimeSettingsTab.includes("switchVisual.className = 'saga-settings-switch-slider'")
        && runtimeSettingsTab.includes("text.className = 'saga-settings-switch-text'")
        && runtimeSettingsTab.includes("label.textContent = 'Show Lorecard tags in the mobile Lore list'")
        && runtimeSettingsTab.includes("help.className = 'saga-settings-switch-description'")
        && !runtimeSettingsTab.includes('mobile list density')
        && !runtimeSettingsTab.includes("'Providers and Theme Pack.'")
        && !runtimeSettingsTab.includes("'Fandom Loresystem.'")
        && style.includes('.saga-settings-switch-row')
        && style.includes('.saga-settings-switch-slider')
        && style.includes('.saga-settings-qol-card .saga-settings-qol-item.saga-settings-switch-row')
        && style.includes('#saga-lore-panel .saga-runtime-drawer .saga-settings-qol-section .saga-settings-qol-item.saga-settings-switch-row')
        && style.includes('justify-self: stretch')
        && style.includes('.saga-settings-switch-text')
        && style.includes('.saga-settings-switch-description')
        && style.includes('.saga-settings-qol-item + .saga-settings-qol-item')
        && style.includes('.saga-settings-qol-card .saga-settings-qol-item.saga-settings-switch-row .saga-settings-switch-text')
        && style.includes('grid-column: 2 !important')
        && style.includes('.saga-runtime-mobile .saga-settings-qol-card .saga-settings-qol-item.saga-settings-switch-row')
        && /\.saga-settings-qol-section > \.saga-collapsible-content\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?width:\s*100% !important;/.test(style)
        && /\.saga-settings-qol-card\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?max-width:\s*none !important;/.test(style)
        && /\.saga-settings-qol-card \.saga-settings-qol-item\.saga-settings-switch-row\s*\{[\s\S]*?display:\s*grid !important;[\s\S]*?grid-template-columns:\s*48px minmax\(0,\s*1fr\) !important;/.test(style)
        && /#saga-lore-panel \.saga-runtime-drawer \.saga-settings-qol-section \.saga-settings-qol-item\.saga-settings-switch-row\s*\{[\s\S]*?display:\s*grid !important;[\s\S]*?grid-template-columns:\s*48px minmax\(0,\s*1fr\) !important;/.test(style)
        && /\.saga-settings-switch-text\s*\{[\s\S]*?display:\s*flex !important;[\s\S]*?max-width:\s*none !important;/.test(style)
        && /\.saga-runtime-mobile \.saga-settings-qol-section \.saga-collapsible-content\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?width:\s*100% !important;/.test(style)
        && /\.saga-runtime-mobile \.saga-settings-qol-card\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?width:\s*100% !important;/.test(style)
        && /\.saga-runtime-mobile \.saga-settings-qol-card \.saga-settings-qol-item\.saga-settings-switch-row\s*\{[\s\S]*?display:\s*grid !important;[\s\S]*?grid-template-columns:\s*48px minmax\(0,\s*1fr\) !important;/.test(style)
        && /\.saga-runtime-mobile \.saga-settings-qol-item \.saga-settings-switch-text\s*\{[\s\S]*?display:\s*flex !important;[\s\S]*?max-width:\s*none !important;/.test(style)
        && style.includes('.saga-settings-switch-input:checked + .saga-settings-switch-slider'),
    'Settings must expose Quality of Life as a dropdown with a full-width left-switch/right-text row and avoid redundant providers/theme separators.'
);
assert(lorecardsPanel.includes('function shouldShowLorecardListTags') && lorecardsPanel.includes("card.appendChild(createTagsRow(entry, { editable: !mobileShell }));") && lorecardsPanel.includes("tags.classList.add('saga-pending-readonly-tags')") && lorecardsPanel.includes('shouldShowLorecardListTags()'), 'Mobile Lore list tags must be hidden by default and read-only when enabled.');
assert(lorecardsPanel.includes("if (mobileEditor) editor.classList.add('saga-mobile-lorecard-entry-editor');") && lorecardsPanel.includes('const autosizeTextarea = (input) => {') && lorecardsPanel.includes("shell.addEventListener('pointerdown', event => event.stopPropagation())") && lorecardsPanel.includes('function armMobileLorecardEditorSelectionLock') && lorecardsPanel.includes("openAcceptedLorecardMobileEditor(entryId, { selectionLock: true })") && lorecardsPanel.includes("openAcceptedLorecardMobileEditor(id, { selectionLock: true })") && style.includes('.saga-mobile-lorecard-entry-editor .saga-lore-editor-textarea') && style.includes('.saga-mobile-lorecard-entry-editor .saga-new-lore-field select') && /\.saga-mobile-touch-surface\.saga-mobile-lorecard-editor-selection-locked input,[\s\S]*?pointer-events:\s*none;/.test(style), 'Mobile Lorecard editor must use readable auto-growing fields, prevent native select interactions from closing the overlay, and keep text fields non-selectable until the long-press finger is lifted.');
assert(lorecardsPanel.includes('function createMobileLorecardEditorTagsControl') && lorecardsPanel.includes('saga-mobile-lorecard-tags-chip-stack') && lorecardsPanel.includes('getTags: () => tags.slice()') && lorecardsPanel.includes('saga-mobile-lorecard-tags-remove saga-runtime-icon-button') && style.includes('.saga-mobile-lorecard-tags-chip-stack') && style.includes('.saga-mobile-lorecard-tags-add-row') && style.includes('var(--saga-chip-tag'), 'Mobile Lorecard editor must edit tags as a single stacked chip list with themed remove buttons and an add row.');
assert(lorecardsPanel.includes("footer.className = 'saga-mobile-lorecard-editor-footer'") && lorecardsPanel.includes("footerActions.className = 'saga-mobile-lorecard-editor-action-slot'") && lorecardsPanel.includes('actionsContainer: footerActions') && lorecardsPanel.includes("overlay.dataset.sagaEditorReady = 'true'") && style.includes('.saga-mobile-lorecard-editor-footer') && style.includes('.saga-mobile-lorecard-editor-loading') && /\.saga-mobile-lorecard-editor-action-slot\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*stretch;[\s\S]*?align-self:\s*stretch;/.test(style) && /\.saga-mobile-lorecard-editor-footer\s*\{[\s\S]*?align-items:\s*stretch;/.test(style) && /\.saga-mobile-lorecard-editor-footer \.saga-runtime-button\s*\{[\s\S]*?height:\s*100%;[\s\S]*?min-height:\s*42px;[\s\S]*?margin:\s*0 !important;/.test(style), 'Mobile Lorecard editor persistent actions must live in a bottom footer, hydrate after the shell first paints, and align Save Entry / Close button boxes vertically.');
assert(liveSmoke.includes('measureMobileLorecardEditorLatency') && liveSmoke.includes('postHoldReadyMs') && liveSmoke.includes('duplicateContextmenuReopened') && liveSmoke.includes('closeGoneMs') && liveSmoke.includes('footerButtonsVerticallyAligned') && liveSmoke.includes('editorFooterState') && liveSmoke.includes('editorSelectionLockState') && liveSmoke.includes('pointerEventsBeforeRelease'), 'Mobile Lorecard editor smoke must measure long-press open, selection lock until touch release, Save/Close footer alignment, and Close latency in the browser.');
assert(liveSmoke.includes("const LIVE_MOBILE_LORECARD_LATENCY_TARGET = 'live-mobile-lorecard-latency';") && liveSmoke.includes('runLiveMobileLorecardLatencySmoke') && liveSmoke.includes('saga_live_latency_probe_lorecard'), 'Live ST smoke must include a focused mobile Lorecard editor latency target with a temporary restored fixture.');
assert(/\.saga-mobile-lorecards-subtab\s*\{[\s\S]*?position:\s*relative;[\s\S]*?margin-left:\s*-1px;/.test(style) && /\.saga-mobile-lorecards-subtab-active,[\s\S]*?\.saga-mobile-lorecards-subtab\[aria-selected="true"\]\s*\{[\s\S]*?z-index:\s*1;/.test(style), 'Mobile Lorecards sub-tab active borders must render evenly on all edges.');
assert(/\.saga-runtime-mobile \.saga-lorecard-workspace-list\s*\{[\s\S]*?overflow:\s*visible !important;/.test(style), 'Mobile Lore workspace list must allow long unified lists to resize instead of clipping past the section box.');
assert(!lorecardsPanel.includes('function setLorecardLifecycleStage'), 'Lorecards lifecycle routing must not retain the stale non-subview stage setter.');
assert(lorecardsPanel.includes('function createLorecardWorkspace') && lorecardsPanel.includes("workspace.className = 'saga-runtime-card saga-lorecard-workspace'") && lorecardsPanel.includes('function createLorecardsStageContent') && lorecardsPanel.includes("container.appendChild(createLorecardsStageContent(state, { basic, lifecycleStats, lifecycleStage }));") && lorecardsPanel.includes("if (lifecycleStage === 'generate')") && lorecardsPanel.includes("if (lifecycleStage === 'automation')") && !lorecardsPanel.includes('function createLorecardPipelineSurface') && !lorecardsPanel.includes('container.appendChild(createLorecardPipelineSurface'), 'Lorecards desktop route must render Generate, Automate, and Lore stage pages without retaining the old lifecycle pipeline surface.');
assert(lorecardsPanel.includes('const isExpanded = !workspaceRow && !mobileShell && panelState.selectedEntryId === entry.id;') && lorecardsPanel.includes('if (!workspaceRow && (!mobileShell || shouldShowLorecardListTags()))') && lorecardsPanel.includes('if (!workspaceRow && Array.isArray(entry.tags) && entry.tags.length && shouldShowLorecardListTags())'), 'Lorecards workspace rows must stay scan-only: no inline editor expansion and no tag-wall rows in the primary list.');
assert(style.includes('container-type: inline-size') && /@container \(min-width:\s*920px\)[\s\S]*?\.saga-lorecard-workspace-body\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(300px,\s*0\.56fr\)/.test(style) && style.includes('.saga-lorecard-detail-card .saga-lore-editor-textarea') && style.includes('.saga-lore-relevance-segmented') && style.includes('.saga-lorecard-mute-toggle') && style.includes('.saga-lorecard-elevate-toggle') && lorecardsPanel.includes('function createLorecardElevateToggleButton'), 'Desktop Lorecards workspace must use container-aware layout, readable detail editor sizing, and the relevance/mute/elevate control set on rows.');
assert(
    style.includes('.saga-lore-panel:not(.saga-runtime-mobile) .saga-lorecard-workspace-row .saga-lore-entry-title')
        && style.includes('font-size: 0.96em !important;')
        && style.includes('.saga-lore-panel:not(.saga-runtime-mobile) .saga-lorecard-workspace-row .saga-lore-entry-fact')
        && style.includes('.saga-lore-panel:not(.saga-runtime-mobile) .saga-lorecard-detail-card .saga-runtime-card-title')
        && style.includes('font-size: 1em;')
        && style.includes('.saga-lore-panel:not(.saga-runtime-mobile) .saga-lorecard-detail-card .saga-lore-entry-full-fact')
        && style.includes('.saga-runtime-mobile .saga-lorecard-workspace-row .saga-lore-entry-title')
        && !/^\s*\.saga-lorecard-workspace-row \.saga-lore-entry-title\s*\{\s*font-size:\s*16px;/m.test(style)
        && !/^\s*\.saga-lorecard-detail-card \.saga-runtime-card-title\s*\{\s*font-size:\s*18px;/m.test(style),
    'Desktop Lorecards typography must stay on the shared compact desktop scale while mobile keeps the larger card scale.'
);
assert(!lorecardsPanel.includes('saga-lorecard-pipeline-compact') && !style.includes('.saga-lorecard-pipeline') && !/\.saga-runtime-mobile \.saga-lorecard-pipeline-rail/.test(style), 'Mobile Lorecards must not retain the compact lifecycle rail or retired pipeline CSS.');
assert(!lorecardsPanel.includes("if (!stats.acceptedCount) return 'suggested';") && lorecardsPanel.includes('function getLorecardWorkspaceRows') && lorecardsPanel.includes('function createLorecardWorkspaceDetailPane') && lorecardsPanel.includes('No Lorecards match the current filters.') && style.includes('.saga-lorecard-workspace-row.saga-lore-entry-elevated'), 'Blank and Elevated Lorecards must show object state through the unified workspace instead of redundant lifecycle sections.');
assert(lorecardsPanel.includes('const mobileShell = isRuntimeMobileShell();') && lorecardsPanel.includes('const recommendedLifecycleStage = getRecommendedLorecardLifecycleStage(state, lifecycleStats);') && lorecardsPanel.includes('getRuntimeMobileLorecardsStage(state?.lorePanel, recommendedLifecycleStage, getSettings())'), 'Mobile Lorecards root must use shell-owned sub-tab stage state with a recommended fallback.');
assert(lorecardsPanel.includes("'saga-lorecards-lifecycle-tab'") && lorecardsPanel.includes("'saga-lorecards-workspace-tab'") && lorecardsPanel.includes('saga-lore-stage-filter-${lifecycleStage}') && lorecardsPanel.includes("markTourTarget(workspace, 'lore.workspace')"), 'Lorecards workspace surface must expose mobile stage classes and the unified workspace tour target.');
assert(!/\.saga-runtime-mobile \.saga-lorecards-lifecycle-tab\.saga-lore-stage-filter-accepted \.saga-lore-active-set-collapsible/.test(style), 'Mobile Lorecards must not depend on a route-level Approved page or hidden Active Set section.');
assert(style.includes('.saga-lorecard-workspace-body') && style.includes('.saga-runtime-mobile .saga-lorecard-workspace-list'), 'Mobile Lorecards workspace must use the shell page as the primary scroll owner instead of nested lifecycle list scroll regions.');
assert(style.includes('Mobile UX Revision 3: Lorecards sub-tabs are pages, not nested list panes.') && /\.saga-runtime-mobile \.saga-lorecard-workspace-list\s*\{[\s\S]*?overflow:\s*visible !important;/.test(style), 'Revision 3 mobile Lorecards lists must stay in the primary page scroll with finger pan support.');
assert(/#saga-lore-panel\.saga-runtime-mobile > \.saga-lore-panel-body\.saga-mobile-content > \.saga-runtime-tab-body\.saga-runtime-tab-body-lore\s*\{[\s\S]*?overflow-y:\s*auto !important;[\s\S]*?touch-action:\s*pan-y !important;/.test(style), 'Mobile Lorecards tab body must be the exact single scroll owner for finger scrolling.');
assert(lorecardsPanel.includes('function createMobileLorecardsStageLoadingShell') && lorecardsPanel.includes("shell.setAttribute('aria-busy', 'true')") && lorecardsPanel.includes('saga-mobile-lorecards-loading-spinner') && style.includes('.saga-mobile-lorecards-loading-shell'), 'Mobile Lorecards must first paint a loading shell before rebuilding expensive stage sections.');
assert(lorecardsPanel.includes('function createMobileLorecardStatusControls') && lorecardsPanel.includes('function attachMobileLorecardGestures') && lorecardsPanel.includes('toggleLorecardElevationByGesture(entryId, element)') && lorecardsPanel.includes('cycleLorecardRelevanceByTap(entry.id, relevance)') && lorecardsPanel.includes("relevance.addEventListener('click'") && !lorecardsPanel.includes('adjustLorecardRelevanceByGesture') && !lorecardsPanel.includes('deltaX > 0 ? 1 : -1') && !lorecardsPanel.includes('sagaGestureLabel') && !/\.saga-runtime-mobile \.saga-mobile-lorecard-gesture-feedback::after/.test(style) && lorecardsPanel.includes('longPressTimer = setTimeout') && lorecardsPanel.includes('now - lastTapAt <= 320') && style.includes('.saga-mobile-lorecard-status-controls') && style.includes('.saga-mobile-lorecard-gesture-feedback') && /saga-runtime-tab-body[\s\S]*?-webkit-overflow-scrolling:\s*touch !important;[\s\S]*?touch-action:\s*pan-y !important;/.test(style), 'Mobile Lorecards must expose status controls plus tap-cycle relevance, double-tap Elevate, and long-press Edit while preserving page scrolling without tier-name popups.');
assert(contextPanel.includes("'context.operator.summary'") && contextPanel.includes("'context.operator.browse'") && contextPanel.includes("'context.operator.detect'"), 'Mobile Context operator summary must expose Browse and Detect walkthrough targets.');
assert(!contextPanel.includes('Next:') && contextPanel.includes('getContextOperatorActionLabel') && contextPanel.includes('return label;') && contextPanel.includes("'context.operator.browse'") && contextPanel.includes("'context.operator.detect'"), 'Mobile Context operator summary must use direct actions without checklist-style Next buttons.');
assert(!loredecksTabPanel.includes('createLoredecksOperatorSummary') && !loredecksTabPanel.includes("'loredecks.operator.summary'") && !loredecksTabPanel.includes('Open Stack Details') && loredecksTabPanel.includes("markTourTarget(libraryCard, 'loredecks.library.launch')") && !loredecksTabPanel.includes('if (isRuntimeMobileShell()) return;'), 'Loredecks tab must remove the redundant Active Stack operator summary and must not short-circuit the Advanced Deck Maker Projects shelf on mobile.');
assert(!loredecksTabPanel.includes('Next:') && loredecksTabPanel.includes("'Open Loredeck Library'") && loredecksTabPanel.includes("'loredecks.library.open'") && loredecksTabPanel.includes("'loredecks.import'"), 'Mobile Loredecks root must expose direct Library and Import actions through the static Library launch card.');
assert(runtimeAdvancedPanel.includes('getSessionMobileSubview') && runtimeAdvancedPanel.includes("pushRuntimeMobileSubview('session'") && runtimeAdvancedPanel.includes('Session Details') && runtimeAdvancedPanel.includes("header.setAttribute('aria-label', 'Open Session Details')") && runtimeAdvancedPanel.includes('openSessionMobileDetails();') && !runtimeAdvancedPanel.includes("createButton('Session Details'"), 'Mobile Session must open details through the tappable summary header instead of a standalone Details button.');
assert(!runtimeAdvancedPanel.includes('createBasicSessionNextActionButton') && !runtimeAdvancedPanel.includes('Next:') && runtimeAdvancedPanel.includes("basic ? 'Start Guided Tour' : 'Start Walkthrough'") && runtimeAdvancedPanel.includes("enabled ? 'saga-primary-button' : ''"), 'Basic mobile Session summary must keep walkthrough as the primary entry without checklist-style Next buttons.');
assert(runtimeAdvancedPanel.includes("if (mobileRoot) {") && runtimeAdvancedPanel.includes("createKeyValue('Pending Review'") && runtimeAdvancedPanel.includes("createKeyValue('High relevance'") && runtimeAdvancedPanel.includes("createKeyValue('Selected for injection'"), 'Mobile Session root summary must include the useful session metrics without requiring a details subview.');
assert(!loredecksTabPanel.includes('getLoredecksMobileSubview') && !loredecksTabPanel.includes("pushRuntimeMobileSubview('loredecks'") && !loredecksTabPanel.includes("title: 'Stack Details'") && !loredecksTabPanel.includes("header.setAttribute('aria-label', 'Open Stack Details')"), 'Mobile Loredecks must not keep the retired Stack Details subview from the old Active Stack summary.');
assert(!loredecksTabPanel.includes("actions.classList.add('saga-loredecks-mobile-action-stack')") && !loredecksTabPanel.includes("primaryActions.className = 'saga-loredecks-mobile-primary-actions'") && !loredecksTabPanel.includes("secondaryActions.className = 'saga-loredecks-mobile-secondary-actions'"), 'Mobile Loredecks root must not use the retired operator-summary action stack.');
assert(!loredecksTabPanel.includes('primaryMobileActionId') && !loredecksTabPanel.includes('getLoredecksOperatorActionLabel'), 'Mobile Loredecks root must not keep old operator-summary action indirection.');
assert(contextPanel.includes('getContextMobileSubview') && contextPanel.includes("pushRuntimeMobileSubview('context'") && contextPanel.includes('Context Details') && contextPanel.includes("header.setAttribute('aria-label', 'Open Context Details')") && contextPanel.includes('openContextMobileDetails();') && !contextPanel.includes("createButton('Context Details'"), 'Mobile Context must open loaded Context rows from the tappable summary object instead of a standalone Details button.');
assert(lorecardsPanel.includes('openLorecardLifecycleStage') && lorecardsPanel.includes('selectRuntimeMobileLorecardsStage(normalized);') && !lorecardsPanel.includes("pushRuntimeMobileSubview('lore'") && !lorecardsPanel.includes('function pushLorecardLifecycleSubview(stage)'), 'Mobile Lorecards lifecycle changes must select shell sub-tabs instead of pushing stage subviews.');
assert(!lorecardsPanel.includes("() => openLorecardLifecycleStage('accepted')") || lorecardsPanel.includes('if (!isRuntimeMobileShell())'), 'Active Set page-body stage navigation must stay off mobile because the shell sub-tab bar owns stage switching.');
assert(lorecardsPanel.includes('function getLorecardWorkspaceRows') && lorecardsPanel.includes('pendingLoreEntries || []') && lorecardsPanel.includes('getPanelLoreState(state).entries') && lorecardsPanel.includes("status: 'pending'") && lorecardsPanel.includes("status: 'accepted'"), 'Lorecards workspace rows must route the full pending and accepted queues into one row model.');
assert(lorecardsPanel.includes('function createLorecardWorkspaceFilterChip') && lorecardsPanel.includes('interactive: true') && lorecardsPanel.includes('chip.setAttribute(\'aria-pressed\'') && lorecardsPanel.includes('filterRow.appendChild(createLorecardWorkspaceFilterChip'), 'Lorecards workspace counters must be interactive filters.');
assert(
    lorecardsPanel.includes('const ACCEPTED_LORE_VISIBLE_BATCH_SIZE = 200;')
        && lorecardsPanel.includes('Math.max(initialVisibleLimit, Number(panelState.acceptedLoreVisibleLimit) || initialVisibleLimit)')
        && runtimePanelSource.includes('const ACCEPTED_LORE_INITIAL_VISIBLE_LIMIT = 200;')
        && runtimePanelSource.includes('const ACCEPTED_LORE_PAGE_INCREMENT = 200;')
        && runtimeShell.includes('panelState.acceptedLoreVisibleLimit = Math.max(200, Number(panelState.acceptedLoreVisibleLimit) || 200);'),
    'Lorecards Lore lists must show accepted Lorecards in 200-card batches so small and medium sets do not require repeated Show More clicks.'
);
const lorecardWorkspaceSortFunction = lorecardsPanel.match(/function sortLorecardWorkspaceRows\(a, b, sortMode = 'alphabetical'\)[\s\S]*?\n}\n\nfunction getFilteredLorecardWorkspaceRows/)?.[0] || '';
const lorecardWorkspaceSortStyle = style.match(/\.saga-lorecard-workspace-sort-toggle\s*\{[\s\S]*?\n\}/)?.[0] || '';
assert(
    lorecardsPanel.includes('const LORECARD_WORKSPACE_SORTS = Object.freeze')
        && lorecardsPanel.includes("['alphabetical', 'A', 'Alphabetical'],\n    ['priority', 'P', 'Priority'],\n    ['relevance', 'R', 'Relevance']")
        && lorecardsPanel.includes('function normalizeLorecardWorkspaceSort')
        && lorecardsPanel.includes('function getNextLorecardWorkspaceSort')
        && lorecardsPanel.includes('function getLorecardWorkspaceRelevanceSortRank')
        && lorecardsPanel.includes('function createLorecardWorkspaceSortToggle')
        && lorecardsPanel.includes('function refreshLorecardWorkspaceListOnly')
        && lorecardsPanel.includes("button.textContent = label")
        && lorecardsPanel.includes('setLorecardWorkspaceSort(nextSort)')
        && lorecardsPanel.includes('if (isRuntimeMobileShell() && refreshLorecardWorkspaceListOnly()) return;')
        && lorecardsPanel.includes('renderLorecardWorkspaceList(list, state, getFilteredLorecardWorkspaceRows(state)')
        && lorecardsPanel.includes("workspace.querySelector('.saga-lorecard-workspace-sort-toggle')")
        && lorecardsPanel.includes('if (preserveSortFocus) nextButton.focus?.();')
        && lorecardsPanel.includes('function refreshLorecardWorkspaceListForSortSensitiveChange')
        && lorecardsPanel.includes("if (sort !== 'relevance') return false;")
        && lorecardsPanel.includes("searchRow.appendChild(createLorecardWorkspaceSortToggle(activeSort));")
        && lorecardsPanel.includes("toolbar.appendChild(searchRow);")
        && defaultState.includes("lorecardWorkspaceSort: 'alphabetical'")
        && stateManager.includes('Schema v27: Lorecards workspace defaults to A/P/R with Alphabetical active.')
        && stateManager.includes("state.lorePanel.lorecardWorkspaceSort = 'alphabetical';")
        && stateManager.includes("state.lorePanel.lorecardWorkspaceSort = ['priority', 'alphabetical', 'relevance'].includes")
        && stateManager.includes("defaultsPanel.lorecardWorkspaceSort || 'alphabetical'")
        && /function sortLorecardWorkspaceRows\(a, b, sortMode = 'alphabetical'\)[\s\S]*?if \(normalizedSort === 'alphabetical'\)/.test(lorecardsPanel)
        && /function sortLorecardWorkspaceRows\(a, b, sortMode = 'alphabetical'\)[\s\S]*?if \(normalizedSort === 'relevance'\)[\s\S]*?getLorecardWorkspaceRelevanceSortRank\(a\) - getLorecardWorkspaceRelevanceSortRank\(b\)[\s\S]*?if \(titleScore\) return titleScore;/.test(lorecardsPanel)
        && /function getLorecardWorkspaceRelevanceSortRank\(row = \{\}\)[\s\S]*?if \(row\.isElevated\) return 0;[\s\S]*?if \(relevance === 'high'\) return 1;[\s\S]*?if \(relevance === 'normal'\) return 2;[\s\S]*?return 3;/.test(lorecardsPanel)
        && !lorecardWorkspaceSortFunction.includes('isActive')
        && style.includes('.saga-lorecard-workspace-search-row')
        && style.includes('.saga-lorecard-workspace-sort-toggle')
        && style.includes('aspect-ratio: 1 / 1')
        && style.includes('flex: 0 0 34px')
        && style.includes('border-radius: 3px')
        && style.includes('width: 34px')
        && lorecardWorkspaceSortStyle.includes('var(--saga-button-hover')
        && lorecardWorkspaceSortStyle.includes('var(--saga-button,')
        && lorecardWorkspaceSortStyle.includes('var(--saga-button-text')
        && !lorecardWorkspaceSortStyle.includes('linear-gradient(180deg, var(--saga-gold')
        && !lorecardWorkspaceSortStyle.includes('var(--saga-gold-surface')
        && !lorecardsPanel.includes('saga-lorecard-workspace-sort-option')
        && !style.includes('.saga-lorecard-workspace-sort-option-active'),
    'Lorecards workspace must place a square theme-token A/P/R sort cycle button beside Search, default to Alphabetical, support Relevance tier sorting, and must not auto-sort activated cards to the top.'
);
assert(lorecardsPanel.includes('const pendingReviewEntries = pendingEntries.filter(entry => !isSuggestedPendingLore(entry));') && lorecardsPanel.includes('pendingEntries: pendingReviewEntries') && lorecardsPanel.includes('allPendingEntries: pendingEntries') && lorecardsPanel.includes('pendingCount: pendingReviewEntries.length') && lorecardsPanel.includes('allPendingCount: pendingEntries.length'), 'Lorecards lifecycle stats must keep suggested and Pending Review counts distinct while retaining the full pending-entry set.');
assert(lorecardsPanel.includes("['needs-review', 'Needs Review']") && lorecardsPanel.includes("['high', 'High']") && lorecardsPanel.includes("['elevated', 'Elevated']") && lorecardsPanel.includes("['muted', 'Muted']") && lorecardsPanel.includes("['conflicts', 'Conflicts']"), 'Lorecards workspace filters must expose review, High, Elevated, Muted, and conflict views over one object list.');
assert(style.includes('.saga-lorecard-workspace-filter-chip[aria-pressed="true"]') && style.includes('.saga-lorecard-workspace-filter-active'), 'Lorecards workspace count filters must expose an active visual state.');
assert(lorecardsPanel.includes('function getActiveLorecardReason(entry = {})') && lorecardsPanel.includes("rows.push(['Why selected', getActiveLorecardReason(entry)])") && lorecardsPanel.includes("entry.extensions?.autoRelevance?.reason"), 'Selected Lorecards must show a concise reason in the workspace detail view.');
const acceptedLorecardWorkspaceDetailFunction = lorecardsPanel.match(/function createAcceptedLorecardWorkspaceDetail\(entry = \{\}, options = \{\}\) \{[\s\S]*?\n\}\n\nfunction getRecommendedLorecardLifecycleStage/)?.[0] || '';
assert(
    !acceptedLorecardWorkspaceDetailFunction.includes("saga-lorecard-detail-actions")
        && !acceptedLorecardWorkspaceDetailFunction.includes("createButton(editActive ? 'Close Edit' : 'Edit'")
        && acceptedLorecardWorkspaceDetailFunction.includes("const editActive = String(getState()?.lorePanel?.lorecardWorkspaceEditId || '') === String(entry.id || '');")
        && acceptedLorecardWorkspaceDetailFunction.includes('wrap.appendChild(createEditableLoreEntryEditor(entry')
        && !acceptedLorecardWorkspaceDetailFunction.includes('createEditableRelevanceControl(entry)')
        && !acceptedLorecardWorkspaceDetailFunction.includes('createLorecardMuteToggleButton(entry')
        && !acceptedLorecardWorkspaceDetailFunction.includes('createLorecardElevateToggleButton(entry'),
    'Accepted Lorecard sidebar/detail inspector must not render action buttons; row controls own edit, relevance, mute, and Elevate.'
);
assert(lorecardsPanel.includes('function makeActiveSetItemMobileEditable') && lorecardsPanel.includes('if (!isRuntimeMobileShell()) return item;') && !/function makeActiveSetItemMobileEditable[\s\S]*?inspectAcceptedLoreEntry\(id\)/.test(lorecardsPanel), 'Desktop Active Set cards must not open editing from body clicks; mobile keeps long-press editing on the card object.');
assert(
    lorecardsPanel.includes('isActive: isActiveLorecardEntry(entry)') &&
        !lorecardsPanel.includes("createBadge('active'") &&
        !style.includes('saga-lore-entry-active::before') &&
        lorecardsPanel.includes("if (elevatedNow) metaRow.appendChild(createBadge('elevated'") &&
        lorecardsPanel.includes("if (entry.isSuppressed) metaRow.appendChild(createBadge('muted'") &&
        lorecardsPanel.includes('function createLorecardElevateToggleButton') &&
        lorecardsPanel.includes('function createLorecardMuteToggleButton') &&
        lorecardsPanel.includes('function createEditableRelevanceControl') &&
        lorecardsPanel.includes("className: workspaceRow ? 'saga-lorecard-row-elevate-toggle'") &&
        lorecardsPanel.includes("actions.appendChild(createLorecardMuteToggleButton(entry") &&
        lorecardsPanel.includes("actions.appendChild(createLorecardElevateToggleButton(entry") &&
        style.includes('.saga-lorecard-workspace-row.saga-lore-entry-elevated') &&
        style.includes('.saga-lorecard-workspace-row.saga-lore-entry-suppressed') &&
        style.includes('.saga-lorecard-mic-icon') &&
        /\.saga-lorecard-mute-toggle,[\s\S]*?\.saga-lorecard-elevate-toggle\s*\{[\s\S]*?-webkit-appearance:\s*none;[\s\S]*?appearance:\s*none;/.test(style) &&
        style.includes('--saga-lorecard-mic-live: var(--saga-gold') &&
        style.includes('--saga-lorecard-mic-live-surface: color-mix(in srgb, var(--saga-surface-2') &&
        style.includes('--saga-lorecard-mic-muted: var(--saga-text-muted') &&
        style.includes('color: var(--saga-lorecard-mic-live) !important;') &&
        style.includes('color: var(--saga-lorecard-mic-muted) !important;') &&
        /\.saga-lorecard-mute-toggle-live\s*\{[\s\S]*?background:[\s\S]*?var\(--saga-lorecard-mic-live-surface/.test(style) &&
        /\.saga-lorecard-mute-toggle-muted\s*\{[\s\S]*?background:\s*rgba\(18,\s*18,\s*24,\s*0\.72\) !important;[\s\S]*?background:\s*var\(--saga-lorecard-mic-muted-surface/.test(style) &&
        style.includes('color: inherit !important;') &&
        /\.saga-lore-relevance-segment:hover,[\s\S]*?background:\s*var\(--saga-surface-2/.test(style) &&
        !/\.saga-lore-relevance-segment:hover,[\s\S]{0,220}var\(--saga-button-hover/.test(style) &&
        style.includes('color-mix(in srgb, var(--saga-surface-2') &&
        style.includes('var(--saga-border-soft'),
    'Lorecards must use row glow/filterable Elevated state without redundant active chips or left-rail bars; relevance hover, theme-colored mute, and Elevate remain visible row controls with neutral Theme Pack surfaces.'
);
assert(lorecardsPanel.includes('const LORE_CONTEXT_FILTER_OPTIONS = Object.freeze') && lorecardsPanel.includes('function getAcceptedLoreDeckFilterOptions(entries = [])') && lorecardsPanel.includes('function getAcceptedLoreContextFilterOptions(entries = [])') && lorecardsPanel.includes('function entryMatchesAcceptedDeckFilter(entry = {}, filter = \'all\')') && lorecardsPanel.includes('function entryMatchesAcceptedContextFilter(entry = {}, filter = \'all\')') && lorecardsPanel.includes('panelState.acceptedDeckFilter || \'all\'') && lorecardsPanel.includes('panelState.acceptedContextFilter || \'all\'') && style.includes('.saga-lore-deck-filter') && style.includes('.saga-lore-context-filter'), 'Accepted and Active Set Lorecards must keep explicit deck and Context filters alongside source/type/priority filtering.');
assert(lorecardsPanel.includes("'Generate'") && lorecardsPanel.includes('Use Generate to draft a Manual Lore Note.') && lorecardsPanel.includes('No Pending Review entries are waiting.') && lorecardsPanel.includes('Use Generate for canon suggestions, story scans, or Manual Lore Notes.') && lorecardsPanel.includes("title.textContent = 'Manual Lore Note'") && !lorecardsPanel.includes('No Lorecards are waiting for review.') && !lorecardsPanel.includes('add one manually') && !lorecardsPanel.includes('or manual notes.') && !lorecardsPanel.includes("title.textContent = 'New Lorecard'") && !lorecardsPanel.includes('Pending Lorecard Review') && !lorecardsPanel.includes('Pending Lore Review') && !lorecardsPanel.includes("'Capture / Suggest'") && runtimePanelSource.includes("title.textContent = 'Generate'") && runtimePanelSource.includes("header.textContent = 'Manual Lore Note'") && runtimePanelSource.includes("createButton('Draft Manual Note'") && runtimePanelSource.includes('Preview Context Suggestions from local canon packs') && runtimePanelSource.includes("createKeyValue(\n        'Source',\n        'Context Suggestions'") && runtimePanelSource.includes('Context-aware canon suggestions enter Pending Review before they become Accepted Lorecards.') && runtimePanelSource.includes('Manual notes, story scans, context-aware suggestions, and Deck Maker drafts all wait in Pending Review before acceptance.') && !runtimePanelSource.includes('Pending Lorecard Review') && !runtimePanelSource.includes('Pending Lore Review'), 'Lorecards Generate surface must use the Generate lifecycle label, Manual Lore Note dialog title, Context Suggestions source framing, and shared Pending Review destination.');
assert(lorecardsPanel.includes('Manual Lore Note draft added to Pending Review.') && lorecardsPanel.includes('Manual Lore Note draft: ${entry.title}') && lorecardsPanel.includes('Created Manual Lore Note draft: ${entry.title}') && lorecardsPanel.includes('No Pending Review entries match the current filters.') && lorecardsPanel.includes('Accept or reject Pending Review entries before relevance scanning.') && lorecardsPanel.includes('Review pending and accepted Lorecards in one workspace') && !lorecardsPanel.includes('Manual lore draft') && !lorecardsPanel.includes('Pending Review Lorecard') && !lorecardsPanel.includes('review Pending Review cards') && !lorecardsPanel.includes('Renders more Pending Review cards.') && canonLoreDb.includes("duplicateReason: 'Already in Pending Review'") && canonLoreDb.includes("duplicateReason: 'Already in Accepted Lorecards'") && !canonLoreDb.includes('Already in Pending Lore') && !canonLoreDb.includes('Already in Lore Matrix'), 'Visible Lorecards capture, duplicate, and pending-filter copy must use Manual Lore Note, Pending Review entries, Accepted Lorecards labels, and unified workspace copy.');
assert(!runtimeGuideContent.includes('Pending Lorecard Review') && !runtimeGuideContent.includes('Pending Lore Review') && !runtimeGuideContent.includes('manual Lorecard creation') && !runtimeGuideContent.includes('Pending Review Lorecards') && !runtimeGuideContent.includes('accepted memory') && !runtimeGuideContent.includes('Accepted memory') && !runtimeNavigation.includes('Pending Lorecard Review') && runtimeGuideContent.includes("guideStep('basic-lorecards-pending-review', 'Pending Review'") && runtimeGuideContent.includes('All new Lorecards still go to Pending Review before they can affect prompts.') && runtimeGuideContent.includes('Manual Lore Note drafting') && runtimeGuideContent.includes('Pending Review entries, Accepted Lorecards') && runtimeNavigation.includes('Generated Lorecards still go to Pending Review in the Lorecards tab.'), 'Runtime guide and navigation copy must use the Pending Review lifecycle label.');
assert(runtimeSessionBasicPanel.includes("'Manual Lore Note'") && runtimeSessionBasicPanel.includes('Use Draft Manual Note') && runtimeSessionBasicPanel.includes("'Review Pending Review'") && runtimeSessionBasicPanel.includes('Pending Review entry') && runtimeSessionBasicPanel.includes('Only reviewed facts become Accepted Lorecards.') && !runtimeSessionBasicPanel.includes('Add Lorecard Manually') && !runtimeSessionBasicPanel.includes('Review Pending Lorecards') && !runtimeSessionBasicPanel.includes('pending Lorecard') && !runtimeSessionBasicPanel.includes('accepted memory') && !runtimeSessionBasicPanel.includes('Accepted memory'), 'Basic Session checklist copy must use Manual Lore Note and Pending Review entry labels.');
assert(runtimeAdvancedPanel.includes("createKeyValue('Pending Review'") && runtimeAdvancedPanel.includes("createKeyValue('Accepted Lorecards'") && runtimeAdvancedPanel.includes('Pending Review entries waiting for review.') && runtimeGuidePrep.includes('no Pending Review entries yet') && runtimeSafetyPanel.includes("createKeyValue('Accepted Lorecards'") && runtimeSafetyPanel.includes("createKeyValue('Pending Review'") && loreTimelinePanel.includes('Draft a Manual Lore Note') && loreTimelinePanel.includes('Accepted Lorecards changes'), 'Runtime metrics, guide prep, safety, and timeline copy must use exact Pending Review and Accepted Lorecards labels.');
assert(loreTimelinePanel.includes('Draft a Manual Lore Note') && !loreTimelinePanel.includes('New Lore') && !loreTimelinePanel.includes('New Lorecard') && !loreTimelinePanel.includes('openNewLoreDialog'), 'Lore Timeline must not reintroduce redundant New Lore entry points; manual note creation belongs in Generate.');
assert(lorecardsPanel.includes("createButton('Accept Selected'") && lorecardsPanel.includes("createButton('Reject Selected'") && lorecardsPanel.includes("createButton('Accept All'") && lorecardsPanel.includes("createButton('Reject All'") && !lorecardsPanel.includes("createButton('Inspect', 'Inspect this Pending Review entry") && !lorecardsPanel.includes("createButton(editing ? 'Close Edit' : 'Edit'") && !lorecardsPanel.includes("const acceptLabel = targetId ? 'Accept Update' : 'Accept';") && !lorecardsPanel.includes("createButton('Accept as New'") && lorecardsPanel.includes("'Accepts this Pending Review entry and merges it into Accepted Lorecards.'") && lorecardsPanel.includes("createButton('Reject', 'Rejects this Pending Review entry") && !lorecardsPanel.includes('single lore entry'), 'Pending Review rows must keep only Accept/Reject while bulk controls remain available behind selection/workbench flows.');
assert(!lorecardsPanel.includes('Dismiss the rest') && !lorecardsPanel.includes('Accept or dismiss pending cards') && !lorecardsPanel.includes('if applied') && !lorecardsPanel.includes('unless applied as new') && lorecardsPanel.includes('Reject the rest.') && lorecardsPanel.includes('Accept or reject Pending Review entries before relevance scanning.') && lorecardsPanel.includes('if accepted.') && !lorecardsPanel.includes('unless accepted as new.'), 'Visible Lorecards Pending Review guidance must use Accept/Reject wording without accepted-as-new row copy.');
assert(lorecardsPanel.includes('const LORE_SOURCE_FILTER_OPTIONS = Object.freeze') && lorecardsPanel.includes("['creator', 'Deck Maker Drafts']") && lorecardsPanel.includes("['context-suggestion', 'Context Suggestions']") && lorecardsPanel.includes('function getLoreSourceOriginMeta(entry = {})') && lorecardsPanel.includes("label: 'Source: Deck Maker'") && lorecardsPanel.includes("label: 'Source: Context Suggestion'") && lorecardsPanel.includes('Deck Maker Lorecard draft waiting for review before it becomes an Accepted Lorecard.') && lorecardsPanel.includes('Context-aware suggestion waiting for review before it becomes an Accepted Lorecard.') && lorecardsPanel.includes('Unified Lorecards workspace. Pending, High, Elevated, and Muted are states in one list.') && lorecardsPanel.includes('before it becomes an Accepted Lorecard.') && !lorecardsPanel.includes('accepted memory') && !lorecardsPanel.includes('Accepted memory'), 'Pending Review source badges and filters must distinguish Deck Maker drafts and Context suggestions in the shared review flow with Accepted Lorecards language.');
assert(lorecardsPanel.includes('function getPendingReviewSourceFilter') && lorecardsPanel.includes('function setPendingReviewSourceFilter') && lorecardsPanel.includes('function createLoreSourceFilterSelect') && lorecardsPanel.includes('pendingSourceFilter') && lorecardsPanel.includes(".filter(row => sourceFilter === 'all' || getLoreSourceBucket(row.entry) === sourceFilter)") && lorecardsPanel.includes('Filter Pending Review entries by source: manual notes, story scans, Deck Maker drafts, or Context suggestions.') && lorecardsPanel.includes('Select every pending entry matching the current Workbench search, source, and type filters.') && /function createPendingWorkbenchTable\(rows, state\)[\s\S]*?for \(const label of \['', 'Title', 'Source', 'Operation', 'Route', 'Category', 'Canon', 'Priority'\]\)[\s\S]*?row\.appendChild\(createWorkbenchTextCell\(getLoreSourceBucketLabel\(getLoreSourceBucket\(entry\)\)\)\);/.test(lorecardsPanel) && style.includes('grid-template-columns: 28px minmax(220px, 2fr) minmax(76px, 0.6fr) minmax(84px, 0.7fr) minmax(92px, 0.8fr)'), 'Pending Review source filters must let manual notes, story scans, Deck Maker drafts, and Context suggestions stay filterable before acceptance with visible workbench source columns.');
assert(defaultSettings.includes('runtimeWindowOpen: false'), 'Fresh Saga installs must default the global runtime window setting to closed.');
assert(settingsMount.includes("if (getSettings().runtimeWindowOpen === true)"), 'Startup must restore visibility from the global runtime-window setting.');
assert(!settingsMount.includes('state?.lorePanel?.isOpen === true'), 'Startup must not restore runtime visibility from chat-scoped panel state.');
assert(runtimePanelSource.includes('settings.runtimeWindowOpen = true;') && runtimePanelSource.includes('settings.runtimeWindowOpen = false;'), 'Runtime open and close actions must persist the global visibility setting.');
assert(runtimePanelSource.includes('const runtimeWindowOpen = getSettings().runtimeWindowOpen === true;'), 'Runtime refresh must synchronize its chat-local renderer mirror from the global visibility setting.');
assert(/lorePanel:\s*\{[\s\S]*isOpen:\s*false,[\s\S]*collapsed:\s*true,[\s\S]*railMode:\s*'compact',[\s\S]*drawerOpen:\s*false,/.test(defaultState), 'New chats must default their runtime renderer mirror to closed.');
assert(defaultState.includes('hasOpenedRuntime: false') && defaultState.includes('launcherDismissed: false'), 'Fresh Saga installs must track first-open/onboarding separately from panel visibility.');
assert(runtimePanelSource.includes('state.lorePanel.hasOpenedRuntime = true') && runtimePanelSource.includes('state.lorePanel.firstOpenedAt') && runtimePanelSource.includes('state.lorePanel.lastOpenedAt'), 'Opening the runtime must stamp first-open state separately from isOpen.');
assert(runtimePanelSource.includes("focused: 'Chapter Lens (balanced)'"), 'Creator granularity labels must pair mystical names with plain descriptors.');
assert(runtimePanelSource.includes('Balanced default. Best for one arc, season, book section, or scenario;'), 'Creator granularity blurbs must explain practical scope plainly.');
assert(runtimeUiKit.includes('export function createChip') && runtimeUiKit.includes('export function setChipTone') && runtimeUiKit.includes('inferChipKindFromLabel') && runtimeUiKit.includes('saga-chip-kind-${kind}') && runtimeUiKit.includes('saga-chip-tone-${tone}') && runtimeUiKit.includes('chip.dataset.sagaChipTone = tone'), 'Runtime UI kit must expose shared semantic chip helpers with inferred kind/tone metadata.');
assert(style.includes('--saga-chip-font-size-compact: 10px') && style.includes('--saga-chip-line-height-compact: 14px') && style.includes('--saga-chip-padding-compact: 0 4px') && style.includes('.saga-chip-tone-review') && style.includes('.saga-chip-tone-danger') && style.includes('.saga-chip-tone-tag') && style.includes('font-size: var(--saga-chip-font-size-compact, 10px)') && style.includes('font-weight: 400;'), 'Runtime stylesheet must define smaller regular-weight semantic chip tokens and tones.');
assert(style.includes('.saga-status-pill') && !/\\.saga-status-pill,\\s*\\n\\.saga-runtime-card/.test(style), 'Theme token layer must not force status pills to share card surface styling.');
const untypedStatusPills = getUntypedStatusPillCalls();
assert(untypedStatusPills.length === 0, `Status pills must pass chip schema options. Untyped calls: ${untypedStatusPills.slice(0, 12).join(', ')}`);
const untypedBadges = getUntypedBadgeCalls();
assert(untypedBadges.length === 0, `Lore badges must pass chip schema options. Untyped calls: ${untypedBadges.slice(0, 12).join(', ')}`);
const legacyChipSource = [
    style,
    panel,
    libraryPanel,
    loredecksTabPanel,
    healthPanel,
    contextWorkbenchPanel,
    runtimeUiKit,
    lorecardsPanel,
    loreTimelinePanel,
    runtimeLoreRegistry,
    runtimeLoredeckReviewHelpers,
].join('\n');
assert(!/saga-status-pill-(?:risk|quality|health)|saga-provider-status-(?:ready|warning)|saga-loredeck-health-chip(?:-[a-z0-9-]+)?|saga-loredeck-creator-project-stage-(?:review|running|warning|success)|saga-loredeck-library-folder-loredeck-health-(?:error|warning|ok)|saga-loredeck-library-stack-folder-preview-(?:chip-(?:active|suppressed|disabled|kept)|health-chip(?:-[a-z0-9-]+)?)|saga-loredeck-library-drag-copy-(?:invalid|root|remove)|saga-loredeck-library-deck-side|saga-lore-badge-(?:character|event|item|knowledge|place|faction|spell|artifact|divergent|fanon|unknown|true|false|public-belief|contested|hidden|public|private|do-not-reveal|only-if-knower-present|only-if-user-reveals|muted|pinned|canon|au|secret|rumor|lie|relationship|location|rule|timeline|truth|pending|priority|source|source-detail|context|context-match|date-gate|context-unresolved|context-blocked|clickable)/.test(legacyChipSource), 'Migrated chips must not reintroduce legacy text-derived badge/status-palette classes.');
assert(!runtimeUiKit.includes('getLoreBadgeClass') && !runtimeLoreRegistry.includes('applyLoreRegistryStyle') && !lorecardsPanel.includes('applyLoreRegistryStyle'), 'Chip color semantics must route through shared tone/kind classes, not text-derived or registry inline style helpers.');
const migratedChipBridgeSelectors = [
    '.saga-lore-badge',
    '.saga-lore-badge-saga-meta',
    '.saga-lore-tag-chip',
    '.saga-lore-timeline-ref-chip',
    '.saga-lore-timeline-event-counts',
    '.saga-continuity-filter-chip',
    '.saga-continuity-status',
    '.saga-lore-registry-badge',
    '.saga-lore-workbench-count',
    '.saga-lore-meta-select-wrap',
    '.saga-instructions-section-header .saga-status-pill',
    '.saga-context-workbench-resolver-score',
    '.saga-canon-preview-selected-count',
    '.saga-loredeck-creator-project-stage',
    '.saga-loredeck-library-stack-folder-preview-chip',
    '.saga-loredeck-library-folder-loredeck-entry-count',
    '.saga-loredeck-library-folder-loredeck-health',
    '.saga-loredeck-library-drag-copy',
    '.saga-loredeck-library-detail-kicker',
    '.saga-loredeck-health-card .saga-status-pill',
    '.saga-loredeck-health-center-overlay .saga-status-pill',
    '.saga-theme-accessibility-score',
    '.saga-theme-icon-status',
    '.saga-provider-runtime-status',
    '.saga-prompt-sync-status-value',
    '.saga-preset-status-stat-value',
    '.saga-loredeck-creator-side-value',
    '.saga-loredeck-creator-queue-value',
    '.saga-loredeck-creator-diagnostic-value',
    '.saga-loredeck-creator-generation-toggle-value',
];
for (const selector of migratedChipBridgeSelectors) {
    assert(!cssRuleDeclares(style, selector, ['background', 'border', 'border-color', 'color']), `${selector} must stay layout-only; shared chip tone classes own color, fill, and border.`);
    assert(!cssRuleDeclares(style, selector, ['font-size', 'font-weight', 'line-height', 'padding', 'padding-inline', 'padding-left', 'padding-right', 'border-radius', 'min-height', 'height']), `${selector} must not restate chip density; shared chip density classes own size, padding, radius, and typography.`);
}
assert(!style.includes('.saga-lore-panel-badge'), 'Unused legacy lore panel badge class must not return.');
assert(!style.includes('.saga-continuity-filter-chip-active') && !legacyChipSource.includes('--wl-chip-color'), 'Lore Timeline filter chips must use selected/muted schema tones instead of local chip color variables.');
assert(!cssRuleDeclares(style, '.saga-lore-meta-select', ['height', 'min-height', 'border-radius', 'padding', 'font-size', 'font-weight', 'line-height']) && !/\.saga-lore-meta-select\s*\{[^}]*background:\s*rgba/.test(style), 'Editable metadata dropdowns must let the schema chip wrapper own density and visible fill.');
assert(lorecardsPanel.includes("className = 'saga-lore-relevance-segmented'") && lorecardsPanel.includes("role', 'radiogroup'") && lorecardsPanel.includes("aria-label', `${meta.label} Relevance`") && !lorecardsPanel.includes('saga-lore-lifecycle-select'), 'Accepted Lorecards relevance must use one-click dot segmented controls with per-tier accessible labels, not native dropdowns.');
assert(
    lorecardsPanel.includes("if (mobileShell && !entry.isPending) card.classList.add('saga-lore-entry-card-tappable');") &&
        lorecardsPanel.includes('const activeNow = isActiveLorecardEntry(entry);') &&
        lorecardsPanel.includes('const elevatedNow = isElevatedLorecardEntry(entry);') &&
        lorecardsPanel.includes("if (elevatedNow) card.classList.add('saga-lore-entry-elevated');") &&
        !lorecardsPanel.includes("createBadge('active'") &&
        !style.includes('saga-lore-entry-active::before') &&
        lorecardsPanel.includes('function createMobileLorecardStatusControls') &&
        lorecardsPanel.includes('function toggleLorecardElevationByGesture') &&
        lorecardsPanel.includes('function cycleLorecardRelevanceByTap') &&
        lorecardsPanel.includes('function getNextRelevanceTier') &&
        lorecardsPanel.includes("relevance.type = 'button'") &&
        lorecardsPanel.includes('cycleLorecardRelevanceByTap(entry.id, relevance)') &&
        !lorecardsPanel.includes('sagaGestureLabel') &&
        lorecardsPanel.includes('now - lastTapAt <= 320') &&
        !lorecardsPanel.includes('const threshold = Math.max(130, Math.min((rect?.width || 0) * 0.72 || 180, 280));') &&
        !lorecardsPanel.includes('adjustLorecardRelevanceByGesture') &&
        lorecardsPanel.includes('if (!mobileShell && !entry.isPending) {') &&
        lorecardsPanel.includes('actions.appendChild(createLorecardEditButton(entry') &&
        lorecardsPanel.includes("className: workspaceRow ? 'saga-lorecard-row-edit-toggle'") &&
        lorecardsPanel.includes('if (mobileShell && !entry.isPending) {') &&
        lorecardsPanel.includes('if (actions.children.length && (!mobileShell || workspaceRow))') &&
        !lorecardsPanel.includes('const detailsBtn = createIconButton(') &&
        !lorecardsPanel.includes('createIconButton') &&
        !lorecardsPanel.includes('saga-lore-entry-details-btn') &&
        lorecardsPanel.includes("card.addEventListener('pointerdown'") &&
        lorecardsPanel.includes("card.addEventListener('contextmenu'") &&
        !lorecardsPanel.includes('if (workspaceRow) {\n                return;\n            }') &&
        lorecardsPanel.includes("'Long-press Cards to Edit'") &&
        !lorecardsPanel.includes("summaryHint.textContent = 'Double-tap cards to Elevate';") &&
        lorecardsPanel.includes('refreshAcceptedLoreSurfaces(entry.id, { sortSensitive: true });') &&
        lorecardsPanel.includes('refreshAcceptedLoreSurfaces(id, { sortSensitive: true })') &&
        lorecardsPanel.includes('const listRefreshed = options.sortSensitive === true && refreshLorecardWorkspaceListForSortSensitiveChange();') &&
        style.includes('.saga-lorecard-edit-toggle') &&
        style.includes('.saga-lorecard-edit-icon-svg') &&
        lorecardsPanel.includes("existing.closest?.('.saga-lorecard-workspace-list')") &&
        lorecardsPanel.includes('existing.replaceWith(createLorecardWorkspaceRow(row, state, { basic: basicReview }));') &&
        lorecardsPanel.includes('openAcceptedLorecardMobileEditor(entryId, { selectionLock: true });') &&
        !lorecardsPanel.includes("if (workspaceRow) {\n                openAcceptedLorecardMobileEditor(entry.id);") &&
        style.includes('.saga-lorecard-workspace-row.saga-lore-entry-elevated') &&
        style.includes('.saga-mobile-lorecard-status-controls') &&
        style.includes('.saga-mobile-lorecard-relevance-status:hover') &&
        style.includes('touch-action: manipulation;') &&
        style.includes('.saga-mobile-lorecard-gesture-feedback') &&
        !/\.saga-runtime-mobile \.saga-mobile-lorecard-gesture-feedback::after/.test(style) &&
        /\.saga-runtime-mobile \.saga-lore-entry-card-tappable,[\s\S]*?\.saga-runtime-mobile \.saga-lore-active-set-item-tappable\s*\{[\s\S]*?-webkit-touch-callout:\s*none;[\s\S]*?user-select:\s*none;/.test(style) &&
        style.includes('.saga-runtime-mobile .saga-lorecard-workspace-row .saga-lore-entry-actions') &&
        style.includes('.saga-runtime-mobile .saga-lore-entry-card-tappable') &&
        style.includes('.saga-mobile-lorecard-longpress-armed') &&
        style.includes('@keyframes saga-mobile-lorecard-longpress-hold') &&
        !style.includes('.saga-runtime-mobile .saga-lore-entry-details-btn'),
    'Mobile Accepted Lorecards must use visible Elevated state, compact status controls, tap-cycle relevance, long-press edit status, double-tap Elevate, and animated long-press editing without permanent edit/detail buttons.'
);
assert(
    /\.saga-mobile-lorecard-relevance-status\[data-saga-relevance="low"\]\s*\{[\s\S]*?var\(--saga-chip-muted-fg[\s\S]*?var\(--saga-chip-neutral-bg/.test(style) &&
        /\.saga-mobile-lorecard-relevance-status\[data-saga-relevance="normal"\]\s*\{[\s\S]*?var\(--saga-chip-relevance-normal-fg[\s\S]*?52%,\s*var\(--saga-activate[\s\S]*?48%[\s\S]*?82%,\s*var\(--saga-activate[\s\S]*?18%/.test(style) &&
        /\.saga-mobile-lorecard-relevance-status\[data-saga-relevance="high"\]\s*\{[\s\S]*?var\(--saga-chip-relevance-high-fg[\s\S]*?58%,\s*var\(--saga-activate[\s\S]*?42%/.test(style),
    'Mobile Lorecard relevance status buttons must use neutral low, restrained Activate normal, and strong Activate high.'
);
assert(style.includes('.saga-lore-relevance-segmented') && style.includes('.saga-lore-relevance-dots-high .saga-lore-relevance-dot:nth-child(3)') && !style.includes('.saga-lore-lifecycle-select'), 'Relevance segmented controls must render compact dot icons, including the three-dot high-relevance triangle.');
assert(lorecardsPanel.includes("className: 'saga-lore-workbench-count'") && contextWorkbenchPanel.includes("className: 'saga-lore-workbench-count'") && !/(?:count|filterCount)\.className = 'saga-lore-workbench-count'/.test(`${lorecardsPanel}\n${contextWorkbenchPanel}`), 'Lorecard and Context workbench count indicators must render through schema-backed count chips.');
assert(loreTimelinePanel.includes("className: 'saga-continuity-status'") && loreTimelinePanel.includes("className: 'saga-lore-timeline-event-counts'") && !/status\.className = 'saga-continuity-status'|counts\.className = 'saga-lore-timeline-event-counts'/.test(loreTimelinePanel), 'Lore Timeline summary and event counts must render through schema-backed count chips.');
assert(contextWorkbenchPanel.includes('createContextWorkbenchResolverScorePill') && !/score\.className = 'saga-context-workbench-resolver-score'/.test(contextWorkbenchPanel), 'Context resolver score bubbles must render through schema-backed status pills.');
assert(panel.includes("className: 'saga-canon-preview-selected-count'") && panel.includes('setChipTone(count') && !/count\.className = 'saga-canon-preview-selected-count'/.test(panel), 'Canon Preview selected count must render through a schema chip and update semantic tone directly.');
assert(libraryPanel.includes("createStatusPill('', 'Current Loredeck drag action.'") && libraryPanel.includes('setChipTone(label') && !/saga-loredeck-library-drag-copy-(?:invalid|root|remove)/.test(libraryPanel), 'Loredeck Library drag-copy feedback must render through a schema chip and update semantic tone directly.');
assert(/saga-loredeck-library-root-drop-active::before[\s\S]{0,520}var\(--saga-chip-warning-border/.test(style) && /saga-loredeck-library-stack-remove-active::before[\s\S]{0,220}var\(--saga-chip-danger-border/.test(style), 'Loredeck Library pseudo drag/drop labels must use shared semantic chip token colors.');
assert(/function createLoredeckLibraryDetailKicker[\s\S]{0,220}createStatusPill/.test(libraryPanel), 'Loredeck Library detail kicker must render through a schema-backed status pill.');
assert(themePanel.includes('function createThemeAccessibilityRow') && themePanel.includes('const score = createStatusPill(') && themePanel.includes("className: 'saga-theme-accessibility-score'"), 'Theme accessibility score chips must render through schema-backed status pills.');
assert(themePanel.includes("className: 'saga-theme-icon-status'") && !/status\.className = 'saga-theme-icon-status'/.test(themePanel), 'Theme Icon Set coverage status must render through a schema-backed status pill.');
assert(!settingsPanel.includes('saga-provider-status-ready') && !settingsPanel.includes('saga-provider-status-warning'), 'Provider setup status pills must rely on shared success/warning schema tones without local palette suffix classes.');
assert(settingsPanel.includes('function createProviderRuntimeStatusPill') && settingsPanel.includes('updateProviderRuntimeStatusPill(modelStatus') && !/saga-provider-runtime-status';[\s\S]{0,140}(?:textContent|appendChild\(status\))/.test(settingsPanel), 'Provider runtime model/key statuses must render through schema-backed status pills.');
assert(/\.saga-provider-runtime-header > \.saga-status-pill,[\s\S]*?\.saga-provider-preset-header > \.saga-status-pill\s*\{[\s\S]*?flex:\s*0 0 auto;[\s\S]*?max-width:\s*none;[\s\S]*?white-space:\s*nowrap;/.test(style), 'Provider header status pills must keep their natural width so labels like Needs setup are not clipped.');
assert(
    /\.saga-settings-provider-card\s*\{[\s\S]*?--saga-provider-control-font-size:\s*0\.82rem;[\s\S]*?--saga-provider-control-touch-font-size:\s*0\.84rem;/.test(style)
        && /\.saga-provider-runtime-field input,[\s\S]*?\.saga-provider-runtime-field select\s*\{[\s\S]*?min-height:\s*var\(--saga-provider-control-min-height,\s*30px\);[\s\S]*?font-size:\s*var\(--saga-provider-control-font-size,\s*0\.82rem\);/.test(style)
        && /\.saga-provider-runtime-field select option\s*\{[\s\S]*?font-size:\s*var\(--saga-provider-control-font-size,\s*0\.82rem\);/.test(style)
        && /\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile \.saga-settings-provider-card \.saga-provider-runtime-field input,[\s\S]*?\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile \.saga-settings-provider-card \.saga-provider-runtime-field select\s*\{[\s\S]*?min-height:\s*var\(--saga-provider-control-touch-min-height,\s*34px\);[\s\S]*?font-size:\s*var\(--saga-provider-control-touch-font-size,\s*0\.84rem\);/.test(style),
    'Settings provider dropdowns and text fields must keep compact provider-specific font sizing, including on mobile where generic touch select sizing is larger.'
);
assert(injectionPanel.includes('function createPromptInjectionStatusRow') && injectionPanel.includes("className: 'saga-prompt-sync-status-value'") && injectionPanel.includes('setChipTone(value') && !/row\?\.querySelector\('\.saga-value'\)/.test(injectionPanel), 'Prompt injection sync status value must render through a schema-backed status pill and update tone in place.');
assert(
    /\.saga-compression-template-editor\s*\{[\s\S]*?font-family:\s*'Courier New', monospace;[\s\S]*?font-size:\s*12px;[\s\S]*?line-height:\s*1\.32;/.test(style)
        && /\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile \.saga-compression-template-editor\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?line-height:\s*1\.32;/.test(style)
        && liveSmoke.includes('compressionPromptFontState')
        && liveSmoke.includes('Mobile Compression Prompts editor text is oversized'),
    'Compression Prompt template editors must keep compact local typography, including on mobile where generic textarea sizing is larger.'
);
assert(
    /\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile \.saga-prompt-placement-line\s*\{[\s\S]*?grid-template-columns:\s*minmax\(92px,\s*0\.68fr\) minmax\(0,\s*1\.6fr\);/.test(style)
        && /\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile \.saga-prompt-placement-control-wrap\s*\{[\s\S]*?grid-template-columns:\s*minmax\(96px,\s*1fr\) minmax\(48px,\s*0\.52fr\) minmax\(68px,\s*0\.78fr\);[\s\S]*?align-items:\s*stretch;/.test(style)
        && /\.saga-prompt-placement-card \.saga-inline-field select,[\s\S]*?\.saga-prompt-placement-card \.saga-inline-field input\[type="number"\]\s*\{[\s\S]*?display:\s*block;[\s\S]*?margin:\s*0;/.test(style)
        && /\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile \.saga-prompt-placement-card \.saga-inline-field\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-rows:\s*0\.86rem 30px;/.test(style)
        && /\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile \.saga-prompt-placement-card \.saga-inline-field select,[\s\S]*?\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile \.saga-prompt-placement-card \.saga-inline-field input\[type="number"\]\s*\{[\s\S]*?min-height:\s*30px;[\s\S]*?font-size:\s*0\.8rem;/.test(style)
        && /@media \(max-width:\s*380px\)\s*\{[\s\S]*?\.saga-lore-panel\.saga-runtime-shell\.saga-runtime-mobile \.saga-prompt-placement-line\s*\{[\s\S]*?grid-template-columns:\s*1fr;/.test(style)
        && liveSmoke.includes('promptControlBoxAlignment')
        && liveSmoke.includes('allPromptControlBoxesAligned'),
    'Mobile Prompt Placement must keep prompt group controls in compact, visibly aligned rows with mobile-standard font sizes instead of stacking every control vertically.'
);
assert(/function createCompactPresetStat[\s\S]{0,520}createStatusPill/.test(runtimeUiKit) && !/function createCompactPresetStat[\s\S]{0,360}document\.createElement\('strong'\)/.test(runtimeUiKit), 'Provider preset compact stats must render value chips through schema-backed status pills.');
assert(creatorPanel.includes('function createLoredeckCreatorSideValueChip') && creatorPanel.includes("className: options.className || 'saga-loredeck-creator-side-value'") && !/saga-loredeck-creator-side-row[\s\S]{0,260}document\.createElement\('strong'\)/.test(creatorPanel), 'Deck Maker sidebar metadata values must render through schema-backed status pills.');
assert(creatorPanel.includes("className: 'saga-loredeck-creator-queue-value'") && creatorPanel.includes("className: 'saga-loredeck-creator-diagnostic-value'") && !/saga-loredeck-creator-(?:queue|diagnostic)-row[\s\S]{0,260}document\.createElement\('strong'\)/.test(creatorPanel), 'Deck Maker queue and diagnostic values must render through schema-backed status pills.');
assert(creatorGenerationSettingsPanel.includes("className: 'saga-loredeck-creator-generation-toggle-value'") && creatorGenerationSettingsPanel.includes('setChipTone(state') && !/createLoredeckCreatorGenerationToggleRow[\s\S]{0,520}document\.createElement\('strong'\)/.test(creatorGenerationSettingsPanel), 'Deck Maker generation toggle states must render through schema-backed status pills and update semantic tone directly.');
assert(loredecksTabPanel.includes("tone: chip.tone") && loredecksTabPanel.includes("kind: chip.label?.match"), 'Deck Maker project shelf must render model chip tone metadata.');
assert(creatorProjects.includes('createProjectChipDescriptor') && !creatorProjects.includes('function createChip('), 'Deck Maker project models must produce chip descriptors without shadowing the shared createChip DOM helper.');
assert(lorecardsPanel.includes("createChip({") && lorecardsPanel.includes("className: 'saga-lore-tag-chip'"), 'Lorecard tag rows must render through the shared chip helper.');
assert(!/saga-loredeck-creator-project-stage[\s\S]{0,260}border-radius:\s*999px/.test(style), 'Deck Maker project stage chips must not use legacy full-pill radius styling.');
assert(/\.saga-loredeck-creator-project-card\s*\{[\s\S]*var\(--saga-border-soft/.test(style) && /\.saga-loredeck-creator-project-card-selected\s*\{[\s\S]*var\(--saga-border-strong/.test(style) && /saga-loredeck-creator-project-progress span\s*\{[\s\S]*var\(--saga-gold-soft/.test(style), 'Deck Maker project cards and progress bars must adopt active Theme Pack surface, border, and accent tokens.');
assert(/\.saga-lore-entry-card\s*\{[\s\S]*background:\s*var\(--saga-surface-2[\s\S]*border:\s*1px solid var\(--saga-border-soft/.test(style) && /\.saga-lore-panel \.saga-accepted-lore-section \.saga-accepted-lore-scroll-region\s*\{[\s\S]*scrollbar-color:\s*var\(--saga-border-strong[\s\S]*var\(--saga-input/.test(style) && !/saga-accepted-lore-scroll-region[\s\S]{0,520}scrollbar-color:\s*rgba/.test(style), 'Accepted Lorecard list cards and scrollbars must follow active Theme Pack surface, border, accent, and input tokens.');
assert(/\.saga-loredeck-creator-stage-guide\s*\{[\s\S]*border:\s*1px solid var\(--saga-border-soft[\s\S]*linear-gradient\(135deg,\s*var\(--saga-bg-gradient-start/.test(style)
    && /\.saga-loredeck-creator-current-task\s*\{[\s\S]*var\(--saga-gold-surface[\s\S]*linear-gradient\(135deg,\s*var\(--saga-surface/.test(style)
    && /\.saga-generation-live-status-error\s*\{[\s\S]*border-color:\s*var\(--saga-red-soft[\s\S]*background:\s*linear-gradient\(135deg,\s*var\(--saga-red-surface/.test(style)
    && !/\.saga-generation-live-status-error\s*\{[\s\S]{0,260}background:\s*linear-gradient\(135deg,\s*rgba/.test(style), 'Deck Maker stage guide, current task, and generation status rows must use active Theme Pack surfaces and danger tokens.');
assert(/\.saga-generation-live-line\s*\{[\s\S]*flex-wrap:\s*nowrap;/.test(style)
    && /\.saga-generation-live-label\s*\{[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap;/.test(style)
    && /\.saga-generation-live-text\s*\{[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap;/.test(style)
    && /\.saga-generation-live-meta\s*\{[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap;/.test(style), 'Deck Maker live generation status rows must keep stable single-line geometry so heartbeat text cannot move mobile scroll.');
assert(!cssRuleDeclares(style, '.saga-loredeck-health-card .saga-status-pill', ['font-size']) && !cssRuleDeclares(style, '.saga-loredeck-health-center-overlay .saga-status-pill', ['font-size']), 'Pack Health status chips must not override the compact chip font with legacy tiny/large em sizing.');
assert(defaultState.includes('stateSafety:') && defaultSettings.includes("'settings.stateSafety'") && !defaultSettings.includes("'settings.dangerZone'"), 'Default state and settings collapse map must expose State Safety without keeping a removed Danger Zone dropdown state.');
assert(runtimePanelSource.includes('createStateSafetyCard') && runtimePanelSource.includes("'settings.stateSafety'"), 'Advanced settings must render the State Safety backup/export/restore card.');
assert(runtimeSettingsTab.includes('createDangerZoneCard') && runtimeSettingsTab.includes("'settings.dangerZone'"), 'Settings must render the relocated Danger Zone cleanup card.');
assert(runtimeSettingsTab.includes('appendDangerZoneCard(container, state)') && !runtimeSettingsTab.includes("'settings.dangerZone',\n            'Danger Zone'") && !runtimeSettingsTab.includes("'settings.dangerZone',\n        'Danger Zone'"), 'Settings Danger Zone must render as a direct card instead of a collapsible dropdown.');
assert(!runtimeAdvancedPanel.includes('createDangerZoneCard'), 'Session must not render or depend on the relocated Danger Zone cleanup card.');
assert(!runtimeSafetyPanel.includes(['Migrate', 'Legacy', 'Storage'].join(' ')) && !runtimeSafetyPanel.includes(['runSaga', 'StorageMigration'].join('')) && !runtimeSafetyPanel.includes(['getSaga', 'StorageMigrationPlan'].join('')), 'State Safety must not expose removed storage migration.');
assert(runtimeSafetyPanel.includes('Verify Storage') && runtimeSafetyPanel.includes('verifySagaStorageIntegrity') && runtimeSafetyPanel.includes('getSagaStorageDiagnostics'), 'State Safety must expose storage diagnostics and integrity verification.');
assert(runtimeSafetyPanel.includes('Settle Storage Writes') && runtimeSafetyPanel.includes('settleSagaStorageWrites') && runtimeSafetyPanel.includes('Clean Missing Records') && runtimeSafetyPanel.includes('cleanMissingSagaStorageIndexRecords'), 'State Safety must expose storage cleanup and queued-write settling actions.');
assert(runtimePanelSource.includes('before_loredeck_package_import') && runtimePanelSource.includes('before_total_reset'), 'Destructive import and reset actions must create State Safety backups.');
assert(harness.includes('window.SillyTavern'), 'Harness must stub SillyTavern before importing modules.');
const basicTabsSource = runtimeNavigation.match(/BASIC_EXPERIENCE_TABS\s*=\s*Object\.freeze\(\[([^\]]*)\]\)/)?.[1] || '';
const tabLabelsSource = runtimeNavigation.match(/TAB_LABELS\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1] || '';
const basicVisibleTabs = new Set(parseSingleQuotedValues(basicTabsSource));
const advancedVisibleTabs = new Set([...tabLabelsSource.matchAll(/^\s*([a-zA-Z0-9_]+):/gm)].map(match => match[1]));
assert(basicTabsSource.includes("'session'") && basicTabsSource.includes("'loredecks'") && basicTabsSource.includes("'context'") && basicTabsSource.includes("'lore'") && basicTabsSource.includes("'settings'"), 'Basic Experience must keep the guided Session/Loredecks/Context/Lorecards/Settings tabs.');
assert(!basicTabsSource.includes("'injection'") && !basicTabsSource.includes("'continuity'"), 'Basic Experience must hide Injection and Continuity tabs.');
assert(runtimeNavigation.includes('export const ADVANCED_EXPERIENCE_TABS = Object.freeze(Object.keys(TAB_LABELS));'), 'Advanced Experience must continue exposing the full tab set.');
assert(!runtimeNavigation.includes('BASIC_TAB_LABELS') && !runtimeNavigation.includes('BASIC_TAB_TOOLTIPS'), 'Basic Experience must not rename shared Advanced tab labels.');
assert(runtimeNavigation.includes("session: 'Session'") && runtimeNavigation.includes("lore: 'Lorecards'"), 'Basic Experience must reuse Advanced Session and Lorecards labels.');
assert(runtimeNavigation.includes('function getTabLabelForExperience') && runtimeNavigation.includes('function getTabTooltipForExperience'), 'Runtime navigation must provide experience-aware tab label and tooltip helpers.');
assert(runtimePanelSource.includes('getTabLabelForExperience(tabId, settings)') && runtimePanelSource.includes("tab.setAttribute('aria-label', label)") && runtimePanelSource.includes('getTabTooltipForExperience(activeTab, settings)'), 'Runtime rail must render experience-aware tab labels while keeping drawer title tooltips outside the shelf-button hover path.');
assert(llm.includes('export function getProviderModelStatus') && llm.includes('getConnectionProfileModelName'), 'Provider model display status must be resolved through the shared provider client.');
assert(settingsPanel.includes('confirmProviderDirectApiKeyStorage') && settingsPanel.includes('fallback obfuscation, not encryption') && !settingsPanel.includes('compatibility encryption'), 'Provider settings must warn before direct API key storage and must not describe fallback storage as encryption.');
assert(runtimePanelSource.includes('function getSettingsProviderRailMetricLines') && runtimePanelSource.includes("settings: getSettingsProviderRailMetricLines(settings)") && runtimePanelSource.includes('saga-runtime-rail-metric-line') && !runtimePanelSource.includes("settings: getThemePreset(settings.themePackId)?.title || 'Theme'"), 'Settings shelf metric must show stacked compact provider model status instead of the active theme.');
assert(runtimePanelSource.includes('function getRailMetricTooltips') && runtimePanelSource.includes('getSettingsProviderRailTooltip(settings)'), 'Clipped Settings shelf model metrics must keep a full provider-model tooltip.');
assert(!runtimePanelSource.includes('truncateRailMetricText'), 'Settings shelf model names must rely on CSS ellipsis instead of fixed character-count truncation.');
const stackedRailMetricRule = style.match(/\.saga-runtime-rail-metric-line \+ \.saga-runtime-rail-metric-line\s*\{[^}]*\}/)?.[0] || '';
assert(/\.saga-runtime-rail-metric\s*\{[\s\S]*flex: 0 1 auto;[\s\S]*max-width: 106px;[\s\S]*font-size: 0\.66em;/.test(style) && /\.saga-runtime-rail-expanded \.saga-runtime-rail-metric-stack\s*\{[\s\S]*align-items: flex-start;[\s\S]*text-align: left;[\s\S]*transform: translateX\(-5px\);/.test(style) && /\.saga-runtime-rail-metric-line\s*\{[\s\S]*display: inline-block;[\s\S]*box-sizing: border-box;/.test(style) && stackedRailMetricRule.includes('margin-top: 2px;') && !stackedRailMetricRule.includes('border-top'), 'Runtime rail metrics must stay shrinkable, left-aligned, and stacked without a visual divider between model/profile text.');
const basicGuideSource = runtimeGuideContent.split('basic: freezeGuideSteps([')[1]?.split('advanced: freezeGuideSteps(buildAdvancedGuideSteps())')[0] || '';
const advancedGuideSource = runtimeGuideContent.split('function buildAdvancedGuideSteps()')[1]?.split('export const GUIDE_SECTIONS')[0] || '';
const basicGuideStepCount = (basicGuideSource.match(/guideStep\(/g) || []).length;
const advancedGuideStepCount = (advancedGuideSource.match(/advancedStep\(/g) || []).length;
const markedTourTargets = collectMarkedTourTargets(runtimePanelSource);
assert(runtimeGuideContent.includes("title: 'Basic Walkthrough'") && runtimeGuideContent.includes("title: 'Advanced Walkthrough'"), 'Runtime guides must use Alpha walkthrough titles.');
assert(runtimeGuideContent.includes('GUIDE_SECTIONS') && runtimeGuideContent.includes("label: 'Loredecks'") && runtimeGuideContent.includes("label: 'Injection Diagnostics'"), 'Runtime guides must expose section walkthrough metadata.');
assert(runtimeTour.includes("dep('prepareGuideStep'") && runtimeTour.includes('prepareGuideStep(step)') && runtimeTour.includes('getTourStepPrepareAction(step)'), 'Runtime tour must run optional guide prepare actions before locating targets.');
assert(runtimeTour.includes('renderSagaTourPopover(step, target, prepareResult)') && runtimeTour.includes("appendSagaTourDetail(popover, 'Preparation'") && runtimeTour.includes('!target && !hasPrepare'), 'Prepared walkthrough steps must fall back to an explanatory centered popover instead of being skipped.');
assert(runtimeTour.includes('function getRectOverlapArea') && runtimeTour.includes('function getRectCenterDistance') && runtimeTour.includes('overlap: getRectOverlapArea(rect, nextRect)') && runtimeTour.includes('popover.dataset.placement = best.placement') && runtimeTour.includes('viewportWidth <= 640'), 'Runtime tour popovers must use collision-aware placement so mobile tour cards do not cover the highlighted target.');
assert(runtimePanelSource.includes('function prepareRuntimeGuideStep')
    && panel.includes('prepareRuntimeGuideStep,')
    && runtimeComposition.includes('prepareGuideStep: deps.prepareRuntimeGuideStep'),
    'Runtime tour must receive concrete prepare handlers from the runtime guide prep module through the runtime composition owner.');
assert(runtimeTour.includes('function navigateRuntimeTab') && runtimeTour.includes('const navigated = navigateRuntimeTab(targetTab') && panel.includes('navigateRuntimeTab,') && panel.includes('if (isRuntimeMobileShell())') && panel.includes('toggleRuntimeDrawerForTab(activeTab);') && panel.includes('return true;'), 'Runtime tour navigation must consume the shared navigation helper so mobile direct routes update shell state.');
for (const prepare of VALID_GUIDE_PREPARES) {
    assert(runtimePanelSource.includes(`case '${prepare}':`), `Runtime guide prepare action is missing a runtime handler: ${prepare}`);
}
assert(basicGuideSteps.length === basicGuideStepCount && advancedGuideSteps.length === advancedGuideStepCount, 'Runtime guide exports must include every source guideStep call.');
assert(basicGuideSteps.length >= countRequiredGuideStepIds(REQUIRED_BASIC_GUIDE_STEP_IDS), 'Basic guide must include all required workflow coverage steps.');
assert(advancedGuideSteps.length >= countRequiredGuideStepIds(REQUIRED_ADVANCED_GUIDE_STEP_IDS), 'Advanced guide must include all required workflow coverage steps.');
assert(advancedGuideSteps.length === 169, 'Advanced guide must implement the planned A01-A169 workflow coverage.');
assertRequiredGuideStepIds('Basic', basicGuideSteps, REQUIRED_BASIC_GUIDE_STEP_IDS);
assertRequiredGuideStepIds('Advanced', advancedGuideSteps, REQUIRED_ADVANCED_GUIDE_STEP_IDS);
assertGuideStepMetadata('Basic', basicGuideSteps);
assertGuideStepMetadata('Advanced', advancedGuideSteps);
assert(basicGuideSections.reduce((sum, section) => sum + section.stepCount, 0) === basicGuideSteps.length, 'Basic walkthrough sections must account for every exported step.');
assert(advancedGuideSections.reduce((sum, section) => sum + section.stepCount, 0) === advancedGuideSteps.length, 'Advanced walkthrough sections must account for every exported step.');
assert(basicGuideSections.map(section => section.id).join(',') === 'firstRun,loredecks,context,lore,continueRoleplay,settings', 'Basic guide cards must follow the planned First Run/Loredecks/Context/Lorecards/Continue Roleplay/Settings order.');
assert(advancedGuideSections.map(section => section.id).join(',') === 'libraryMastery,sessionControl,contextResolution,loreReview,injectionDiagnostics,continuityTracking,creatorAuthoring,packHealth,settingsDiagnostics,troubleshooting', 'Advanced guide cards must follow the planned workflow module order.');
assertDocSectionHeadings('Basic Workflow doc', basicWorkflowDoc, basicGuideSections);
assertDocSectionHeadings('Advanced Workflow doc', advancedWorkflowDoc, advancedGuideSections);
assert(String(assertGuideTargetsResolvable).includes('markedTargets.has(target) || prepareIsValid') && String(assertGuideTargetsResolvable).includes('fallbackTarget'), 'Visual smoke harness must keep checking walkthrough target and fallback target reachability.');
for (const [index, section] of advancedGuideSections.entries()) {
    const startLabel = getCoverageLabel('advanced', advancedGuideSteps.findIndex(step => step.id === section.steps[0]?.id));
    const endLabel = getCoverageLabel('advanced', advancedGuideSteps.findIndex(step => step.id === section.steps.at(-1)?.id));
    assert(advancedWorkflowDoc.includes(`Coverage: ${startLabel}-${endLabel}.`), `Advanced Workflow doc must document coverage range ${startLabel}-${endLabel} for ${section.label}.`);
    assert(index === 0 || advancedGuideSections[index - 1].steps.at(-1)?.id !== section.steps[0]?.id, `Advanced section ${section.label} must start at a unique walkthrough step.`);
}
assert(basicWorkflowDoc.includes('Basic does not show:') && basicWorkflowDoc.includes('Create Deck') && basicWorkflowDoc.includes('Injection tab controls') && basicWorkflowDoc.includes('Lore Automation') && basicWorkflowDoc.includes('Pack Health Center') && basicWorkflowDoc.includes('Basic mobile still offers selected-card Accept/Reject actions'), 'Basic Workflow doc must document Basic exclusions and the mobile selected-card review exception.');
assert(basicWorkflowDoc.includes('Basic keeps **Import Deck** and safe **Run Pack Health** checks available.'), 'Basic Workflow doc must explicitly keep Import Deck and safe Pack Health checks in Basic.');
assert(!basicWorkflowDoc.includes('tab walkthroughs') && !advancedWorkflowDoc.includes('organized by tab'), 'Workflow docs must not describe the old tab-only walkthrough organization.');
assert(documentationIndex.includes('[Basic Workflow](user/BASIC_WORKFLOW.md)') && documentationIndex.includes('[Advanced Workflow](user/ADVANCED_WORKFLOW.md)'), 'Documentation index must link the Basic and Advanced workflow docs.');
assert(documentationIndex.includes('SAGA_WALKTHROUGH_WORKFLOW_EXPANSION_PLAN.md') && documentationIndex.includes('B01-B57') && documentationIndex.includes('A01-A169'), 'Documentation index must link the walkthrough expansion plan with Basic and Advanced coverage ranges.');
for (const step of basicGuideSteps) {
    assert(basicVisibleTabs.has(step.tab), `Basic walkthrough step ${step.id} targets hidden tab: ${step.tab}`);
}
for (const step of advancedGuideSteps) {
    assert(advancedVisibleTabs.has(step.tab), `Advanced walkthrough step ${step.id} targets unknown tab: ${step.tab}`);
}
assertGuideTargetsResolvable([...basicGuideSteps, ...advancedGuideSteps], markedTourTargets);
assert(!basicGuideSource.includes("'injection'"), 'Basic guide steps must not target hidden Injection controls.');
assert(!basicGuideSource.includes("'continuity'"), 'Basic guide steps must not target hidden Continuity controls.');
assert(basicGuideSource.includes("'loredecks.library.open'") && basicGuideSource.includes("'context.commandCenter'") && basicGuideSource.includes("'lore.pending'") && basicGuideSource.includes("'settings.themePack'") && basicGuideSource.includes("'session.basicReadiness'"), 'Basic guide must route through Loredecks, Context, Lorecards, Settings, and Session Readiness.');
assert(basicGuideSource.includes("'context.workbench.storyPosition'") && basicGuideSource.includes("'context.workbench.startHere'") && basicGuideSource.includes("'context.workbench.useWindow'") && basicGuideSource.includes("'context.workbench.useAnchor'") && basicGuideSource.includes("'context.workbench.after'") && basicGuideSource.includes("'context.workbench.phraseResolver'"), 'Basic guide must teach Context Workbench anchors/windows, Start Here, Use Window, Use Anchor, After/Before, and Phrase Resolver.');
assert(basicGuideSource.includes("'context.proposals.review'") && contextPanel.includes("'context.proposals.review'"), 'Basic Context proposal review must target the Review Proposals button when it is present.');
assert(!basicGuideSource.includes('Advanced Context Brief') && !basicGuideSource.includes('Prompt Placement') && !basicGuideSource.includes('Auto-Relevance'), 'Basic guide must not expose advanced diagnostic, injection, or automation tour steps.');
assert(advancedGuideSource.includes("'injection'"), 'Advanced guide must retain Injection walkthrough targets.');
assert(advancedGuideSource.includes("'context.workbench.useAnchor'") && advancedGuideSource.includes("'context.workbench.timelineAction'") && advancedGuideSource.includes("'context.workbench.phraseResolverInput'") && advancedGuideSource.includes("'context.workbench.resolverLoadLorecards'") && advancedGuideSource.includes('ignored direction words'), 'Advanced guide must teach Context Workbench Use Anchor, Timeline actions, Phrase Resolver input, and resolver diagnostics.');
assert(advancedGuideSource.includes("'context.resolve.local'") && advancedGuideSource.includes("'context.resolve.reasoner'") && advancedGuideSource.includes("'context.proposals.review'") && advancedGuideSource.includes("'context.loadedLoredeck.lock'") && advancedGuideSource.includes("'context.loadedLoredeck.seedFromBrief'") && advancedGuideSource.includes("'context.loadedLoredeck.reset'"), 'Advanced guide must target concrete Context action buttons instead of broad cards for resolver, proposal, lock, seed, and reset prompts.');
assert(advancedGuideSource.includes("'loredecks.creator.draftLorecards'") && advancedGuideSource.includes("'loredecks.creator.autoDraftAll'") && advancedGuideSource.includes("'loredecks.creator.sendSelectedDrafts'") && advancedGuideSource.includes("'loredecks.creator.readiness'"), 'Advanced guide must target current Deck Maker draft, auto-draft, send-to-review, and readiness controls.');
assert(advancedGuideSource.includes("'loredecks.health.refreshScan'") && advancedGuideSource.includes("'loredecks.health.attemptFixing'") && advancedGuideSource.includes("'loredecks.health.issueActions'"), 'Advanced guide must target current Pack Health scan, Attempt Fixing, and issue action controls.');
assert(runtimePanelSource.includes('getRuntimeGuideSections') && runtimePanelSource.includes('startRuntimeWalkthrough(mode, { sectionId: section.id })'), 'Runtime guide card must render module-level walkthrough starts through the walkthrough handoff.');
assert(runtimeTour.includes('export function startSagaTourSteps') && runtimeTour.includes('progressLabel') && runtimeTour.includes('closeLabel') && runtimeTour.includes('getFinishLabel') && runtimeTour.includes('onFinish') && runtimeTour.includes('onClose'), 'Runtime tour must support custom checklist mini-tour sequences.');
assert(runtimePanelSource.includes('formatGuideStartLabel') && runtimePanelSource.includes('guided stop'), 'Runtime guide cards must show each module starting point and guided stop count.');
assert(!runtimePanelSource.includes('showGuideStep(item'), 'Runtime guide card must not render one Show button per walkthrough target.');
assert(panel.includes("from './runtime-composition.js'")
    && runtimeComposition.includes("from './session-basic-panel.js'")
    && runtimeComposition.includes('configureSessionBasicPanel({')
    && !panel.includes('configureSessionBasicPanel({')
    && runtimePanelSource.includes('createBasicStartReadinessCard(state, settings)'),
    'Runtime shell must compose the extracted Basic Session panel through the runtime composition owner.');
assert(runtimePanelSource.includes('function createBasicStartReadinessCard'), 'Basic Session must render the Session Readiness dropdown.');
assert(/createBasicStartReadinessCard[\s\S]*createCollapsibleSection\(\s*'session\.basicReadiness'[\s\S]*true[\s\S]*'saga-basic-readiness-card'/.test(runtimePanelSource), 'Basic Session Readiness must be an expanded-by-default dropdown.');
assert(runtimePanelSource.includes('function getBasicReadinessModel'), 'Basic Session readiness must derive from runtime state.');
const sessionSagaActivePosition = runtimeAdvancedPanel.indexOf('container.appendChild(createSagaActiveSection(settings));');
const sessionReadinessPosition = runtimeAdvancedPanel.indexOf('container.appendChild(createSessionOperatorSummary(state, settings');
const sessionAutomationPosition = runtimeAdvancedPanel.indexOf('container.appendChild(createAutomationModeSection(settings));');
const sessionMetricsPosition = runtimeAdvancedPanel.indexOf('container.appendChild(createSessionMetricsCard(state, settings));');
const sessionWalkthroughPosition = runtimeAdvancedPanel.indexOf('container.appendChild(createSessionWalkthroughSection(guideMode, guide, basic));');
const desktopStoryOpenerPosition = runtimeAdvancedPanel.indexOf('container.appendChild(createStoryOpenerSessionSection(state, storySectionOptions));');
assert(runtimeAdvancedPanel.includes("import { createStoryOpenerCreatorSection } from './story-opener-panel.js';") && runtimeAdvancedPanel.includes('Story Maker'), 'Advanced Session tab must compose the Story Maker section.');
assert([sessionSagaActivePosition, sessionReadinessPosition, sessionAutomationPosition, sessionMetricsPosition, sessionWalkthroughPosition, desktopStoryOpenerPosition].every(position => position >= 0), 'Session tab must render Saga Active, Session Readiness, Automation Mode, Session Metrics, Advanced Walkthrough, and Story Maker.');
assert(sessionSagaActivePosition < sessionReadinessPosition && sessionReadinessPosition < sessionAutomationPosition && sessionAutomationPosition < sessionMetricsPosition && sessionMetricsPosition < sessionWalkthroughPosition && sessionWalkthroughPosition < desktopStoryOpenerPosition, 'Session tab must render in the requested order: Saga Active, Session Readiness, Automation Mode, Session Metrics, Advanced Walkthrough, then Story Maker.');
assert(/createAutomationModeSection[\s\S]*createCollapsibleSection\(\s*'session\.automationMode\.section'[\s\S]*false[\s\S]*modeCard/.test(runtimeAdvancedPanel), 'Session Automation Mode must render as a default-collapsed dropdown.');
assert(/createSessionWalkthroughSection[\s\S]*createCollapsibleSection\(\s*`session\.instructions\.\$\{guideMode\}`[\s\S]*false[\s\S]*createInstructionsCard/.test(runtimeAdvancedPanel), 'Session Advanced Walkthrough must render as a default-collapsed dropdown.');
assert(runtimeAdvancedPanel.includes('function createStoryOpenerSessionSection') && runtimeAdvancedPanel.includes("const sectionId = options.sectionId || 'session.storyMaker'") && runtimeAdvancedPanel.includes('createCollapsibleSection(\n        sectionId'), 'Story Maker must render through a shared closeable dropdown section.');
assert(runtimeAdvancedPanel.includes("const storySectionOptions = isRuntimeMobileShell() ? { sectionId: 'session.storyMaker.mobile' } : {};") && !runtimeAdvancedPanel.includes('openSessionMobileStoryOpener'), 'Mobile Session must expose Story Maker as a closeable dropdown instead of a one-way subview button.');
assert(!runtimeAdvancedPanel.includes("mobileSubview?.id === 'session-story-opener'") && !runtimeAdvancedPanel.includes("defaultOpen: true"), 'Story Maker must default collapsed instead of reopening the legacy mobile subview path.');
assert(runtimeAdvancedPanel.includes('function navigateRuntimeTab') && runtimeAdvancedPanel.includes('createStoryOpenerCreatorSection(state, { refreshPanelBody, markTourTarget, navigateRuntimeTab })'), 'Story Maker must receive runtime tab navigation so missing-source actions can route to Loredecks.');
assert(defaultSettings.includes("'session.automationMode.section': true") && defaultSettings.includes("'session.storyMaker': true") && defaultSettings.includes("'session.storyMaker.mobile': true") && !defaultSettings.includes("'session.automationMode': false") && !defaultSettings.includes("'session.storyOpener': false"), 'Session collapsed-section defaults must keep Automation Mode and Story Maker collapsed in the new layout.');
assert(runtimeStoryOpenerPanel.includes('saga-loredeck-creator-stage-guide') && runtimeStoryOpenerPanel.includes('resetStoryOpenerToStage'), 'Story Maker must use a Deck Maker-style stage bar with revert support.');
assert(storyOpenerState.includes("action = 'add_loredecks'") && storyOpenerState.includes("actionLabel = 'Add Loredecks'") && storyOpenerState.includes('No active Loredecks. Add one to fully use Context.'), 'Story Maker Context Packet stage must become an Add Loredecks action when the opener source stack is missing.');
assert(runtimeStoryOpenerPanel.includes('handleStoryOpenerStageAction') && runtimeStoryOpenerPanel.includes("options.navigateRuntimeTab('loredecks')") && runtimeStoryOpenerPanel.includes('saga-story-opener-stage-action-label') && runtimeStoryOpenerPanel.includes('getStoryOpenerLiveSourceOptions'), 'Story Maker stage bar must render a distinct Add Loredecks CTA and restore the normal Context Packet tab when live Loredecks exist.');
assert(runtimeStoryOpenerPanel.includes('getVisibleStoryOpenerStage') && runtimeStoryOpenerPanel.includes('createStoryOpenerStageCard') && !runtimeStoryOpenerPanel.includes('container.appendChild(createInputsCard(session, state, options));\n    container.appendChild(createPacketCard(session, state, options));'), 'Story Maker must render only the active workflow stage body.');
assert(runtimeStoryOpenerPanel.includes('saga-story-opener-session-picker') && runtimeStoryOpenerPanel.includes('Saved openers') && runtimeStoryOpenerPanel.includes('saga-story-opener-session-row-active') && runtimeStoryOpenerPanel.includes('saga-story-opener-delete-button'), 'Story Maker saved sessions must live in a compact picker with scoped delete controls instead of an always-expanded shelf.');
assert(runtimeStoryOpenerPanel.includes('function captureStoryOpenerScrollState') && runtimeStoryOpenerPanel.includes('function refreshStoryOpenerStageSwitch') && runtimeStoryOpenerPanel.includes('requestAnimationFrame(() => restoreStoryOpenerScrollState(scrollState))'), 'Story Maker workflow stage switches must restore Session scroll after the refresh frame.');
assert(runtimeStoryOpenerPanel.includes('currentStage: stage.id') && runtimeStoryOpenerPanel.includes('const scrollState = captureStoryOpenerScrollState();') && runtimeStoryOpenerPanel.includes('refreshStoryOpenerStageSwitch(options, scrollState);') && !runtimeStoryOpenerPanel.includes('refresh({ ...options, preserveScroll: false });'), 'Story Maker workflow stage tabs must preserve the Session drawer scroll when switching steps.');
assert(!runtimeStoryOpenerPanel.includes('STORY_OPENER_BUSY_WORDS') && runtimeStoryOpenerPanel.includes('getStoryOpenerGenerationLabel') && runtimeStoryOpenerPanel.includes('Building Context Packet') && runtimeStoryOpenerPanel.includes('Drafting Opener Brief') && runtimeStoryOpenerPanel.includes("'Drafting'") && runtimeStoryOpenerPanel.includes('Variant A'), 'Story Maker active provider calls must name the actual generation step instead of rotating vague busy words.');
assert(runtimeStoryOpenerPanel.includes('createStoryOpenerGenerationStatus') && runtimeStoryOpenerPanel.includes('updateStoryOpenerGenerationStatusRows') && runtimeStoryOpenerPanel.includes('formatLoredeckJobElapsed') && runtimeStoryOpenerPanel.includes('setInterval(() =>') && runtimeStoryOpenerPanel.includes('saga-story-opener-generation-status'), 'Story Maker active provider calls must render a spinner-backed live generation status with a ticking timer.');
assert(runtimeStoryOpenerPanel.includes('container.appendChild(createStoryOpenerStageBar(session, state, options));\n    const generationStatus = createStoryOpenerGenerationStatus(session, options);') && runtimeStoryOpenerPanel.includes('if (generationStatus) container.appendChild(generationStatus);'), 'Story Maker live generation status must sit directly under the workflow stage rail.');
assert(runtimeStoryOpenerPanel.includes('clearStoryOpenerDraftVariantsForRun') && runtimeStoryOpenerPanel.includes('variants: []') && runtimeStoryOpenerPanel.includes('selectedVariantId:') && runtimeStoryOpenerPanel.includes('const generationSession = working;') && runtimeStoryOpenerPanel.includes('writeStoryOpenerVariants(generationSession'), 'Story Maker must clear old displayed draft variants immediately when starting a replacement draft run while preserving prior draft context for revisions.');
assert(runtimeStoryOpenerPanel.includes('renderStoryOpenerMarkdownToHtml') && runtimeStoryOpenerPanel.includes('createStoryOpenerOutputPreview') && runtimeStoryOpenerPanel.includes('saga-story-opener-dialogue-quote'), 'Story Maker opener previews must render sanitized rich Markdown with dialogue quote spans.');
assert(runtimeStoryOpenerPanel.includes('Copy Markdown to Clipboard') && runtimeStoryOpenerPanel.includes('Copy Rich-Text to Clipboard') && runtimeStoryOpenerPanel.includes('ClipboardItem') && runtimeStoryOpenerPanel.includes("'text/html'") && runtimeStoryOpenerPanel.includes("'text/plain'"), 'Story Maker must expose separate Markdown and rich-text clipboard outputs.');
assert(runtimeStoryOpenerPanel.includes('function createStoryOpenerVariantSelector') && runtimeStoryOpenerPanel.includes("nav.setAttribute('aria-label', 'Story Maker opener variants')") && /function createReviewCard[\s\S]*createStoryOpenerVariantSelector\(session, options\)[\s\S]*createStoryOpenerOutputPreview\(selected\.text\)/.test(runtimeStoryOpenerPanel), 'Story Maker Review & Copy must keep the Variant A/B/C selector visible after generation completes.');
assert(runtimeStoryOpenerPanel.includes('saga-story-opener-review-actions'), 'Story Maker Review & Copy actions must have a scoped action row for mobile layout.');
assert(runtimeStoryOpenerPanel.includes('Refresh From Saved Sources') && runtimeStoryOpenerPanel.includes('Use Current Active Stack'), 'Story Maker must expose source refresh and current-stack replacement actions.');
assert(runtimeStoryOpenerPanel.includes('STORY_OPENER_CUSTOM_OPENING_SHAPE') && runtimeStoryOpenerPanel.includes('Opening Shape') && runtimeStoryOpenerPanel.includes("label: 'Custom'") && runtimeStoryOpenerPanel.includes('saga-story-opener-custom-shape-field') && runtimeStoryOpenerPanel.includes('setStoryOpenerFieldHidden'), 'Story Maker must use one Opening Shape dropdown with Custom last and hide the custom field until selected.');
assert(runtimeStoryOpenerPanel.includes('createSegmentedChoiceControl') && runtimeStoryOpenerPanel.includes('STORY_OPENER_POV_OPTIONS') && runtimeStoryOpenerPanel.includes('STORY_OPENER_TENSE_OPTIONS') && runtimeStoryOpenerPanel.includes('saga-story-opener-pov-control') && runtimeStoryOpenerPanel.includes('saga-story-opener-tense-control'), 'Story Maker Inputs must render PoV and Tense as three-choice segmented controls.');
assert(runtimeStoryOpenerPanel.includes('setStoryOpenerProviderActionsDisabled') && runtimeStoryOpenerPanel.includes('data-story-opener-provider-action') && runtimeStoryOpenerPanel.includes('const providerBusy = !!session.activeGeneration') && runtimeStoryOpenerPanel.includes('buildContextButton.disabled = providerBusy') && runtimeStoryOpenerPanel.includes('fullPipelineButton.disabled = providerBusy'), 'Story Maker must lock Build Context Packet and Generate Full Pipeline against overlapping provider calls.');
assert(runtimeStoryOpenerPanel.includes('activeRunControllers: new Map()') && runtimeStoryOpenerPanel.includes('cancelStoryOpenerActiveGeneration') && runtimeStoryOpenerPanel.includes('appendStoryOpenerCancelAction') && runtimeStoryOpenerPanel.includes('onCancel: () => cancelStoryOpenerActiveGeneration(session, options)') && runtimeStoryOpenerPanel.includes('Cancel Generation'), 'Story Maker must expose cancellation for every active Story Maker generation step, including Generate Full Pipeline.');
assert(storyOpenerState.includes("'cancelled'") && storyOpenerGeneration.includes('user_cancelled') && runtimeStoryOpenerPanel.includes("status: 'cancelled'"), 'Story Maker cancellation must persist cancelled run results instead of treating user cancellation as a generic error.');
assert(runtimeStoryOpenerPanel.includes('saga-story-opener-length-heading') && runtimeStoryOpenerPanel.includes("lengthHeading.textContent = 'Length'") && runtimeStoryOpenerPanel.indexOf('lengthHeading.textContent') < runtimeStoryOpenerPanel.indexOf("lengthRow.className = 'saga-story-opener-length-row'"), 'Story Maker target-length buttons must have a Length heading above Hook, Scene, and Chapter.');
assert(runtimeStoryOpenerPanel.includes('createVariantCountControl') && runtimeStoryOpenerPanel.includes('Variant Count') && runtimeStoryOpenerPanel.includes("slider.type = 'range'") && runtimeStoryOpenerPanel.includes('updateVariantCountSliderPresentation') && runtimeStoryOpenerPanel.includes('STORY_OPENER_VARIANT_COUNT_MAX') && !runtimeStoryOpenerPanel.includes('refs.variantsEnabled') && !runtimeStoryOpenerPanel.includes('saga-story-opener-variant-count-scale'), 'Story Maker Inputs must use a 1-5 variant-count slider without the redundant numeric scale row.');
assert(storyOpenerState.includes("STORY_OPENER_DEFAULT_OPENING_SHAPE = STORY_OPENER_OPENING_SHAPES[0]") && storyOpenerState.includes("'Scene Setting'") && storyOpenerState.includes('STORY_OPENER_POV_OPTIONS') && storyOpenerState.includes('STORY_OPENER_TENSE_OPTIONS'), 'Story Maker state must default Opening Shape to Scene Setting and persist fixed PoV/Tense options.');
assert(storyOpenerState.includes('STORY_OPENER_VARIANT_COUNT_MIN = 1') && storyOpenerState.includes('STORY_OPENER_VARIANT_COUNT_MAX = 5') && storyOpenerState.includes('variantCount: normalizeStoryOpenerVariantCount'), 'Story Maker controls must persist a clamped 1-5 variant count.');
assert(storyOpenerGeneration.includes('const count = normalized.controls.variantCount') && storyOpenerGeneration.includes('getStoryOpenerVariantLabel') && storyOpenerGeneration.includes('label: actionLabel') && storyOpenerGeneration.includes('Drafting'), 'Story Maker draft generation must use the variant-count slider and emit per-variant progress labels.');
assert(style.includes('.saga-story-opener-panel') && style.includes('.saga-story-opener-output') && style.includes('var(--saga-input'), 'Story Maker must have themed panel and output styles.');
assert(style.includes('.saga-story-opener-dialogue-quote') && style.includes('--SmartThemeQuoteColor') && style.includes('.saga-story-opener-output strong') && style.includes('.saga-story-opener-output blockquote'), 'Story Maker rich opener previews must style Markdown emphasis and SillyTavern-colored dialogue quotes.');
assert(style.includes('.saga-story-opener-variant-count-control') && style.includes('.saga-story-opener-variant-count-slider') && style.includes('accent-color: var(--saga-gold') && style.includes('::-webkit-slider-runnable-track') && style.includes('::-webkit-slider-thumb') && style.includes('--saga-story-opener-variant-progress') && !style.includes('.saga-story-opener-variant-count-scale'), 'Story Maker variant-count slider must have compact Saga-themed track and thumb styling without the redundant scale row.');
assert(style.includes('.saga-runtime-mobile .saga-story-opener-review-actions') && style.includes('grid-template-columns: minmax(0, 1fr)') && style.includes('.saga-runtime-mobile .saga-story-opener-review-actions .saga-runtime-button'), 'Story Maker mobile Review & Copy actions must stack full-width instead of shrinking copy labels.');
assert(style.includes('.saga-story-opener-section') && style.includes('.saga-collapsible-card:has(.saga-story-opener-panel)') && style.includes('.saga-story-opener-stage-list .saga-loredeck-creator-stage-label') && style.includes('overflow-wrap: anywhere'), 'Story Maker must wrap headers, workflow buttons, and stage labels inside the narrow Saga drawer.');
assert(style.includes('.saga-story-opener-session-picker') && style.includes('.saga-story-opener-session-row-active') && style.includes('.saga-story-opener-session-row > .saga-story-opener-delete-button') && style.includes('grid-template-columns: minmax(0, 1fr) max-content'), 'Story Maker saved-opener picker must stay compact and mark the active session.');
assert(style.includes('.saga-story-opener-session-main strong') && style.includes('font-size: 0.82em') && style.includes('.saga-story-opener-session-main span') && style.includes('font-size: 0.76em') && style.includes('font-size: 0.83em'), 'Story Maker saved-opener rows must use compact Saga row typography instead of inherited headline-scale text.');
assert(style.includes('.saga-story-opener-stage-action-add_loredecks') && style.includes('.saga-story-opener-stage-action') && style.includes('.saga-story-opener-stage-action-label') && style.includes('opacity: 1'), 'Story Maker Add Loredecks stage action must not inherit the dead-looking locked-stage opacity and must show a distinct themed CTA.');
assert(style.includes('.saga-story-opener-generation-status') && style.includes('.saga-generation-live-label') && style.includes('max-width: 14rem') && style.includes('white-space: normal'), 'Story Maker live generation status must leave room for explicit provider-step labels.');
assert(style.includes('.saga-story-opener-stage-list') && style.includes('grid-auto-flow: column') && style.includes('grid-auto-columns: minmax(158px, 176px)') && style.includes('overflow-x: auto'), 'Story Maker workflow buttons must use an internal horizontal rail instead of clipping at the drawer edge.');
assert(style.includes('.saga-runtime-drawer .saga-story-opener-input-grid') && style.includes('.saga-runtime-mobile .saga-story-opener-input-grid') && style.includes('grid-template-columns: minmax(0, 1fr)') && style.includes('.saga-story-opener-field-hidden') && style.includes('.saga-story-opener-segmented-control') && !style.includes('.saga-runtime-mobile .saga-story-opener-quick-row'), 'Story Maker drawer and mobile inputs must be one column, hide unused custom shape input, and avoid the old quick-shape button cluster.');
assert(style.includes('.saga-runtime-mobile .saga-story-opener-panel .saga-story-opener-stage-list') && style.includes('grid-auto-flow: column') && style.includes('scroll-snap-type: x proximity'), 'Story Maker workflow buttons must scroll horizontally on mobile like Deck Maker.');
assert(!defaultSource.includes('guidedTask') && !stateManager.includes('guidedTask'), 'Runtime panel state must not keep retired in-panel checklist strip state.');
const basicChecklistTourBlock = (runtimePanelSource.split('const BASIC_CHECKLIST_REVIEW_GENERATION_STEPS')[1] || '').split('function getBasicChecklistTourConfig')[0] || '';
assert(runtimePanelSource.includes('BASIC_CHECKLIST_TOUR_TASKS_BY_ROW') && runtimePanelSource.includes('function launchBasicChecklistTour') && runtimePanelSource.includes('startSagaTourSteps(steps'), 'Basic Session Readiness actions must launch external guided mini-tours.');
assert(runtimeSessionBasicPanel.includes('export function getBasicReadinessAction(row)'), 'Basic readiness actions must remain reusable by the mobile Session operator summary.');
assert(!/\bLorepacks?\b/.test(basicChecklistTourBlock), 'Basic Session Readiness mini-tour copy must use Loredeck terminology.');
assert(runtimePanelSource.includes("progressLabel: 'Guided Tour'") && runtimePanelSource.includes("closeLabel: 'Close'") && runtimePanelSource.includes('onClose: returnToBasicStartChecklist'), 'Session Readiness mini-tours must use the external tour popover and a clear close affordance.');
assert(runtimePanelSource.includes('function getNextBasicChecklistTourRow') && runtimePanelSource.includes('function finishBasicChecklistTour') && runtimePanelSource.includes('getFinishLabel: () => getBasicChecklistTourFinishLabel(row)') && runtimePanelSource.includes('onFinish: () => finishBasicChecklistTour(row)'), 'Session Readiness mini-tours must continue to the next outstanding readiness item before showing Done.');
assert(runtimePanelSource.includes("'loredecks.library.open'") && runtimePanelSource.includes("'loredecks.library.folderDisclosure'") && runtimePanelSource.includes("'loredecks.library.deckCard'") && runtimePanelSource.includes("'loredecks.library.transfer'") && runtimePanelSource.includes("'loredecks.library.done'"), 'Loredeck checklist mini-tour must walk through Library open, folder expansion, Loredeck selection, stack transfer, and Done controls.');
assert(libraryPanel.includes("markTourTarget(disclosure, 'loredecks.library.folderDisclosure')") && libraryPanel.includes("markTourTarget(card, 'loredecks.library.deckCard')"), 'Loredeck Library must expose concrete checklist anchors for folder disclosure and Loredeck rows.');
assert(runtimePanelSource.includes("'context.browser'") && runtimePanelSource.includes("'context.workbench.loadedLoredeck'") && runtimePanelSource.includes("'context.workbench.storyPosition'") && runtimePanelSource.includes("'context.workbench.applyContext'") && runtimePanelSource.includes("'context.loadedLoredecks'"), 'Context checklist mini-tour must open the Context Workbench and target manual browsing/selection controls before Lorecards.');
assert(!basicChecklistTourBlock.includes("'context.detect'"), 'Basic Session Readiness Browse Context path must not substitute automatic detection for manual first-time context selection.');
assert(contextWorkbenchPanel.includes("markTourTarget(row, 'context.workbench.loadedLoredeck')") && contextWorkbenchPanel.includes("'context.workbench.applyContext'") && contextWorkbenchPanel.includes("'context.workbench.startHere'") && contextWorkbenchPanel.includes("'context.workbench.useWindow'") && contextWorkbenchPanel.includes("'context.workbench.useAnchor'") && contextWorkbenchPanel.includes("'context.workbench.phraseResolver'"), 'Context Workbench must expose concrete checklist anchors for loaded Loredeck rows, Context actions, Use Anchor, and Phrase Resolver.');
assert(contextPanel.includes("'context.resolve.local'") && contextPanel.includes("'context.resolve.reasoner'") && contextPanel.includes("'context.proposals.review'") && contextPanel.includes("'context.loadedLoredeck.lock'") && contextPanel.includes("'context.loadedLoredeck.seedFromBrief'") && contextPanel.includes("'context.loadedLoredeck.reset'"), 'Context panel must mark concrete buttons used by the Advanced walkthrough.');
assert(contextWorkbenchPanel.includes("'context.workbench.resolveFromContext'") && contextWorkbenchPanel.includes("'context.workbench.resolveWithReasoner'") && contextWorkbenchPanel.includes("'context.workbench.openSelectedTimeline'") && contextWorkbenchPanel.includes("'context.workbench.storyPositionFind'") && contextWorkbenchPanel.includes("'context.workbench.loadEvents'") && contextWorkbenchPanel.includes("'context.workbench.lockRange'") && contextWorkbenchPanel.includes("'context.workbench.clearSelection'") && contextWorkbenchPanel.includes("'context.workbench.phraseUseContext'") && contextWorkbenchPanel.includes("'context.workbench.phraseClear'") && contextWorkbenchPanel.includes("'context.workbench.resolverLoadLorecards'"), 'Context Workbench must mark redesigned action buttons mentioned by walkthrough copy and helper text.');
assert(contextWorkbenchPanel.includes('createContextWorkbenchStoryPositionPicker') && contextWorkbenchPanel.includes('getContextWorkbenchStoryPositionQuery') && contextWorkbenchPanel.includes('saga-context-workbench-story-position-row') && contextWorkbenchPanel.includes("'context.workbench.storyPosition'"), 'Context Workbench picker internals must use story-position naming.');
assert(contextWorkbenchPanel.includes("const applyLabel = selected.kind === 'window' ? 'Use Window' : 'Use Anchor';") && contextWorkbenchPanel.includes("markTourTarget(applyButton, selected.kind === 'window' ? 'context.workbench.useWindow' : 'context.workbench.useAnchor')"), 'Context Workbench timeline inspector must expose the exact Use Anchor target alongside Use Window.');
for (const [label, target] of [
    ['Use Window', 'context.workbench.useWindow'],
    ['Start Here', 'context.workbench.startHere'],
    ['After', 'context.workbench.after'],
    ['Before', 'context.workbench.before'],
]) {
    assert(contextWorkbenchPanel.includes(`createButton('${label}'`) && contextWorkbenchPanel.includes(`'${target}'`), `Context Workbench story-position action ${label} must keep its concrete target ${target}.`);
}
assert(/\.saga-context-workbench-row-actions,[\s\S]*?\.saga-context-workbench-inspector-actions\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;/.test(style), 'Context Workbench row actions must wrap instead of clipping story-position controls.');
assert(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.saga-context-workbench-story-position-list,[\s\S]*?\.saga-context-workbench-resolver-results\s*\{[\s\S]*?max-height:\s*none;[\s\S]*?\.saga-context-workbench-row-actions,[\s\S]*?\.saga-context-workbench-inspector-actions\s*\{[\s\S]*?justify-content:\s*flex-start;/.test(style), 'Mobile Context Workbench story-position rows must keep the action list fully visible and left-aligned.');
assert(!contextWorkbenchPanel.includes('createContextWorkbenchWaypointBrowser') && !contextWorkbenchPanel.includes('getContextWorkbenchWaypointQuery') && !contextWorkbenchPanel.includes('saga-context-workbench-waypoint') && !contextWorkbenchPanel.includes("'context.workbench.waypoints'"), 'Context Workbench must not keep retired waypoint picker internals.');
assert(style.includes('.saga-context-workbench-story-position-picker') && style.includes('.saga-context-workbench-story-position-row'), 'Context Workbench story-position picker styles must be present.');
assert(!style.includes('.saga-context-workbench-waypoint'), 'Retired Context Workbench waypoint selectors must not remain in CSS.');
assert(runtimePanelSource.includes("'lore.canon.preview'") && runtimePanelSource.includes("'lore.story.scan'") && runtimePanelSource.includes("'lore.manual.add'") && runtimePanelSource.includes("'lore.pending.actions'"), 'Lorecard checklist mini-tour must guide generation, manual add, Pending Review, and accept/reject actions.');
assert(advancedGuideSource.includes('Draft Review, Pending Review, and Accepted Lorecards') && advancedGuideSource.includes('many Pending Review entries') && advancedGuideSource.includes("'Accepted Lorecards Filters'") && advancedGuideSource.includes('Elevate or mute Accepted Lorecards') && basicGuideSource.includes('Pending Review entries, Accepted Lorecards') && lorecardsPanel.includes('Open a larger Pending Review workspace') && lorecardsPanel.includes('Open a larger Accepted Lorecards workspace') && lorecardsPanel.includes('This entry is in Pending Review.') && lorecardsPanel.includes('No Pending Review entries yet') && lorecardsPanel.includes('${acceptedCount} Accepted Lorecards') && lorecardsPanel.includes('Search Pending Review...') && lorecardsPanel.includes('Search Accepted Lorecards...') && lorecardsPanel.includes('Add to Pending Review') && lorecardsPanel.includes('No Pending Review entries selected.') && lorecardsPanel.includes('Accept all Pending Review entries?') && lorecardsPanel.includes('Renders more Pending Review entries.') && lorecardsPanel.includes('No Accepted Lorecards match the current filters.') && lorecardsPanel.includes('Select an Accepted Lorecard to review it.') && lorecardsPanel.includes('Showing ${lifecycleFiltered.length} Accepted Lorecard'), 'Lorecards guide and workbench launch copy must use exact Pending Review and Accepted Lorecards lifecycle labels.');
assert(!lorecardsPanel.includes('This Accepted Lorecard is active.') && lorecardsPanel.includes("rows.push(['Why selected', getActiveLorecardReason(entry)])") && lorecardsPanel.includes('open the Accepted Lorecards workbench.') && !lorecardsPanel.includes('accepted Lore that can affect') && !lorecardsPanel.includes('Accepted Lore workbench'), 'Selected-state details must use Why selected and visual state instead of redundant active chips while keeping Accepted Lorecards as the visible product label.');
assert(basicGuideSource.includes("'Accept or Reject'") && basicGuideSource.includes('Reject recap, noise, wrong canon') && advancedGuideSource.includes("'Accept or Reject Pending'") && !basicGuideSource.includes('Accept or Dismiss') && !advancedGuideSource.includes('dismiss entries based on future usefulness'), 'Lorecards walkthrough copy must use Reject wording for Pending Review actions.');
assert(runtimePanelSource.includes("'settings.provider.utility'") && runtimePanelSource.includes("'settings.provider.reasoning'") && runtimePanelSource.includes("'settings.provider.test'") && runtimePanelSource.includes("'settings.provider.advanced'"), 'Provider checklist mini-tour must target concrete Basic provider rows and handoff controls.');
assert(!runtimePanelSource.includes('createBasicGuidedTaskStrip') && !runtimePanelSource.includes('saga-guided-task-highlight') && !style.includes('.saga-basic-guided-task-strip'), 'Retired in-panel guided task strip implementation must not remain active.');
assert(style.includes('.saga-checklist-tour-popover') && style.includes('.saga-tour-highlight'), 'Checklist mini-tours must reuse the external tour highlight surface with checklist-specific styling.');
assert(/\.saga-floating-tooltip\s*\{[\s\S]*z-index:\s*2147483647;/.test(style) && /\.saga-tour-popover\s*\{[\s\S]*z-index:\s*2147483000;/.test(style), 'Floating tooltips must render above the external tour popover.');
assert(runtimeBasicReadiness.includes('export function buildBasicReadinessModel') && runtimePanelSource.includes('buildBasicReadinessModel({'), 'Basic Session readiness decision order must live in the shared model helper.');
assert(!runtimePanelSource.includes('function createBasicInjectionSummaryCard') && !runtimePanelSource.includes('What Saga Will Send'), 'Basic Session must not render the selected-lore prompt summary.');
assert(!lorecardsPanel.includes('function createBasicReviewInjectionSummary') && !lorecardsPanel.includes('What Accepted Lorecards Do'), 'Basic Lorecards must not render the selected-lore prompt summary.');
assert(runtimePanelSource.includes('function createManualLorecardPanel') && runtimePanelSource.includes("createButton('Draft Manual Note'") && runtimePanelSource.includes('openNewLoreDialog({ basicReview: isBasicExperience(getSettings()) })'), 'Manual Lore Note creation must live in the shared Generate card and use the compact dialog only in Basic.');
assert(!defaultSettings.includes("'lore.basic.acceptedEntries'") && !defaultSettings.includes("'injection.basic."), 'Collapsed-section defaults must not keep retired Basic-only Lorecards or Injection section ids.');
assert(loredecksTabPanel.includes('function isBasicExperienceMode') && !loredecksTabPanel.includes('createBasicLoredeck'), 'Basic Loredecks must use the shared Loredecks tab with mode-gated Deck Maker controls.');
assert(loredecksTabPanel.includes("'Loredeck Library'") && loredecksTabPanel.includes("'In-Progress Deck Maker Projects'") && !loredecksTabPanel.includes("'loredecks.libraryLaunch',"), 'Loredecks tab must keep the shared static Library launch card and Advanced Deck Maker Projects section without a Library dropdown.');
assert(loredecksTabPanel.includes("createButton('Import Deck'") && basicGuideSource.includes("'loredecks.import'"), 'Basic Loredecks must keep Import Deck in the shared Library launch workflow.');
assert(loredecksTabPanel.includes("runBusyAction(btn, 'Opening...'") && loredecksTabPanel.includes("setText('Building...'") && loredecksTabPanel.includes('waitForNextUiFrame'), 'Open Loredeck Library must show spinner-backed in-button progress and yield frames before rendering the fullscreen Library.');
assert(/\.saga-loredeck-library-launch-card\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;/.test(style) && /\.saga-loredeck-library-launch-main\s*\{[\s\S]*?flex:\s*1 1 280px;/.test(style) && /\.saga-loredeck-library-launch-actions\s*\{[\s\S]*?margin-left:\s*auto;/.test(style), 'Desktop Loredecks Library launch card must wrap by available drawer width instead of using a two-column grid that collapses copy at minimum drawer width.');
assert(liveSmoke.includes('narrowLoredecksState') && liveSmoke.includes('Desktop minimum Loredecks Library launch copy collapsed into a narrow text column') && liveSmoke.includes('tablet-advanced-harness-01b-loredecks-min-drawer'), 'Tablet Advanced smoke must cover the desktop minimum-width Loredecks Library launch card.');
assert(libraryPanel.includes('if (!mobileTouch) {\n        const statsLine = document.createElement') && liveSmoke.includes('mobileDeckStatsLineCount'), 'Mobile Loredeck Library deck cards must remove the file/update stats line while desktop cards keep it.');
assert(loredecksTabPanel.includes('const creatorProjects = !basic ? createLoredeckCreatorProjectsSection(state, { mobile }) : null;') && /function createLoredeckCreatorProjectsSection[\s\S]*createLoredeckCreatorProjectShelf\(state, projectModels\)/.test(loredecksTabPanel), 'Basic Loredecks must hide the In-Progress Deck Maker Projects shelf while Advanced mobile can render it.');
assert(loredecksTabPanel.includes("mobile ? 'loredecks.creatorProjects.mobile' : 'loredecks.creatorProjects'") && loredecksTabPanel.includes('mobile && projectModels.length > 0') && !loredecksTabPanel.includes('if (mobile && creatorProjects?.count) container.appendChild(creatorProjects.section);') && /markTourTarget\(libraryCard, 'loredecks\.library\.launch'\);[\s\S]*?container\.appendChild\(libraryCard\);[\s\S]*?const creatorProjects = !basic \? createLoredeckCreatorProjectsSection/.test(loredecksTabPanel), 'Mobile Advanced Loredecks must keep unfinished Deck Maker Projects under the Library card while defaulting them open without sharing desktop collapse state.');
assert(/\.saga-runtime-mobile \.saga-loredeck-creator-project-list\s*\{[\s\S]*?max-height:\s*none;[\s\S]*?overflow:\s*visible;/.test(style), 'Mobile In-Progress Deck Maker Projects must flow in the Loredecks page scroll instead of creating a nested project-list scroller.');
assert(/\.saga-loredeck-creator-project-search,[\s\S]*?\.saga-loredeck-creator-project-move-select\s*\{[\s\S]*?font-size:\s*12px !important;[\s\S]*?line-height:\s*1\.25 !important;/.test(style) && /\.saga-runtime-mobile \.saga-loredeck-creator-project-shelf\s*\{[\s\S]*?font-size:\s*0\.9em;/.test(style) && /\.saga-runtime-mobile \.saga-loredeck-creator-project-title\s*\{[\s\S]*?font-size:\s*0\.82em;/.test(style), 'In-Progress Deck Maker Projects controls and cards must pin compact local typography instead of inheriting oversized host form fonts.');
assert(/if \(!basic\)\s*\{[\s\S]*createButton\('Create Deck'/.test(loredecksTabPanel), 'Basic Loredecks must hide the Create Deck launch action.');
assert(libraryPanel.includes('function isBasicExperienceMode') && /if \(!mobile\)\s*\{[\s\S]*if \(!basic\)\s*\{[\s\S]*Export Selected[\s\S]*Create Deck/.test(libraryPanel), 'Basic and mobile Loredeck Library must hide the fullscreen Create Deck and package export header actions.');
assert(libraryPanel.includes('Advanced Repair Tools') && libraryPanel.includes('Advanced Deck Tools') && /if \(basic\)\s*\{[\s\S]*Advanced Repair Tools[\s\S]*\}\s*else\s*\{[\s\S]*Open Pack Health Center/.test(libraryPanel), 'Basic Loredeck Library health details must show summary/scan handoff instead of opening Pack Health Center repair routes.');
assert(/if \(basic\)\s*\{[\s\S]*Advanced Deck Tools[\s\S]*\}\s*else\s*\{[\s\S]*Open Loredeck[\s\S]*Open Pack Health Center[\s\S]*(View Metadata|Edit Metadata)[\s\S]*Export/.test(libraryPanel), 'Basic Loredeck Library detail actions must hide editor, Health Center, metadata, and package export routes behind an Advanced handoff.');
assert(healthPanel.includes('function isBasicExperienceMode') && /export function openLoredeckHealthCenter[\s\S]*if \(isBasicExperienceMode\(\)\)[\s\S]*Switch to Advanced Experience to open Pack Health Center repair tools/.test(healthPanel), 'Pack Health Center must block direct Basic-mode entry.');
assert(/function getLoredeckHealthCenterContext[\s\S]*requestedPackId[\s\S]*getFreshLoredeckLibraryPack\(requestedPackId, libraryPack\)/.test(healthPanel), 'Pack Health Center must resolve explicit external Loredeck pack ids through hydrated fresh Library records.');
assert(loredeckWorkbenchPanel.includes('function isBasicExperienceMode') && /export function openLoredeckWorkbench[\s\S]*if \(isBasicExperienceMode\(\)\)[\s\S]*Switch to Advanced Experience to open the Loredeck editor/.test(loredeckWorkbenchPanel), 'Loredeck Workbench editor must block direct Basic-mode entry.');
assert(!style.includes('saga-basic-loredeck-stack-card') && !style.includes('saga-basic-loredeck-stack-row'), 'Basic Loredecks must not keep dedicated layout styling.');
assert(settingsPanel.includes('export function createBasicProviderQuickSetupCard') && settingsPanel.includes('function createBasicProviderQuickSetupRow'), 'Basic Settings must render a simplified Providers surface.');
assert(settingsPanel.includes('getProviderModelStatus') && settingsPanel.includes("createBasicProviderSummaryRow('Model'"), 'Basic provider setup must summarize the resolved model or fallback profile label.');
assert(settingsPanel.includes('Open Advanced Provider Settings') && settingsPanel.includes('Use Current Model') && settingsPanel.includes('Test ${cfg.shortTitle}'), 'Basic Providers must test providers and hand off to Advanced provider controls.');
assert(/function saveProviderSetting[\s\S]*saveSettings\(next\);[\s\S]*refreshRuntimeHeader\(\);[\s\S]*if \(options\.refresh !== false\)/.test(settingsPanel), 'Provider setting saves must update runtime rail/header metrics even when field-level saves skip panel rerender.');
assert(runtimePanelSource.includes("'settings.experienceMode'") && runtimePanelSource.includes("'settings.providers'") && runtimePanelSource.includes("'settings.themePack'"), 'Basic Settings must expose Experience Mode, Providers, and Theme Pack.');
assert(!runtimePanelSource.includes('function createBasicAppearanceSettingsCard') && /if \(basic\)[\s\S]*'settings\.themePack'[\s\S]*createThemeSettingsCard\(settings\)/.test(runtimePanelSource), 'Basic Settings must render the same Theme Pack section as Advanced.');
assert(runtimeSettingsTab.includes('function createExperienceModeSettingsCard') && style.includes('saga-settings-experience-card') && !style.includes('saga-basic-experience-switch-wrap'), 'Settings must own the shared Experience Mode card without retired Basic-only switch styling.');
assert(panel.includes('function openAdvancedSettingsTab')
    && panel.includes('openAdvancedSettingsTab,')
    && runtimeComposition.includes('openAdvancedSettings: deps.openAdvancedSettingsTab'),
    'Basic Settings advanced handoffs must switch to the Advanced settings surface through the runtime composition owner.');
assert(style.includes('saga-settings-basic-provider-card') && style.includes('saga-settings-experience-card') && !style.includes('saga-basic-theme-swatches') && !style.includes('saga-basic-experience-switch-wrap'), 'Basic Settings must keep provider and shared Experience Mode styling without retired Basic-only theme or switch styling.');
assert(!panel.includes('function renderBasicInjectionTab') && !panel.includes('function createBasicLoreTierInjectionCard') && !panel.includes("'injection.basic'"), 'Basic Experience must not keep a dedicated Basic Injection tab implementation.');
assert(!style.includes('saga-basic-injection-controls') && !style.includes('saga-basic-injection-mode-buttons') && !style.includes('saga-basic-injection-status'), 'Retired Basic Injection tab styling must not remain.');
assert(!lorecardsPanel.includes('function createBasicReviewActionsCard') && !style.includes('saga-basic-review-actions-card'), 'Basic Lorecards must not add a separate Basic-only actions card.');
assert(lorecardsPanel.includes('createLorecardWorkspace(state, { basic, lifecycleStats })') && lorecardsPanel.includes('createPendingLoreReviewCard(row.entry, row.index, selected,') && lorecardsPanel.includes('createEntryCard(row.entry, state,'), 'Basic Lorecards must render pending and accepted cards through the unified workspace path.');
assert(/if \(!basicReview && !isRuntimeMobileShell\(\)\)\s*\{\s*section\.appendChild\(createLoreWorkbenchLaunchRow/.test(lorecardsPanel), 'Basic and mobile Lorecards must hide the default pending workbench launch row.');
assert(lorecardsPanel.includes('const workspaceRow = options.workspaceRow === true;') && lorecardsPanel.includes('if (!mobileShell || workspaceRow)') && lorecardsPanel.includes("actionsRow.appendChild(createButton('Accept'") && lorecardsPanel.includes("actionsRow.appendChild(createButton('Reject'") && style.includes('.saga-runtime-mobile .saga-lorecard-workspace-row .saga-pending-entry-actions'), 'Basic mobile Lorecards must expose clean pending Accept/Reject row actions in the unified workspace.');
assert(lorecardsPanel.includes('applySelectedPendingLore(pendingIds)') && lorecardsPanel.includes('dismissSelectedPendingLore(pendingIds)') && lorecardsPanel.includes('applyPendingLoreEntriesByReviewIds(pendingIds') && lorecardsPanel.includes('dismissPendingLoreEntriesByReviewIds(pendingIds'), 'Pending bulk actions must be scoped to the current filtered review batch.');
assert(lorecardsPanel.includes('const mobileShell = isRuntimeMobileShell();') && lorecardsPanel.includes('const inspectPendingEntry = () =>') && lorecardsPanel.includes('if (mobileShell)') && lorecardsPanel.includes('setPanelState({ selectedEntryId: editId }') && lorecardsPanel.includes('else if (basicReview) openAdvancedLoreReview(\'pending\')'), 'Mobile pending Inspect must stay in the mobile card while desktop Basic still opens Advanced.');
assert(
    lorecardsPanel.includes("card.classList.add('saga-pending-review-entry-card-tappable')") &&
        lorecardsPanel.includes("card.addEventListener('pointerdown'") &&
        lorecardsPanel.includes('longPressTimer = setTimeout') &&
        lorecardsPanel.includes("card.addEventListener('contextmenu'") &&
        lorecardsPanel.includes("card.addEventListener('click'") &&
        lorecardsPanel.includes('togglePendingReviewSelection(reviewId, !currentSelected);') &&
        lorecardsPanel.includes("card.classList.add('saga-pending-mobile-action-tray')") &&
        lorecardsPanel.includes("if (!mobileShell || workspaceRow) {\n        const actionsRow = document.createElement('div');") &&
        !lorecardsPanel.includes("createButton('Inspect', 'Inspect this Pending Review entry") &&
        !lorecardsPanel.includes("createButton('Accept as New'") &&
        style.includes('.saga-runtime-mobile .saga-pending-review-entry-card-tappable') &&
        style.includes('.saga-runtime-mobile .saga-lorecard-workspace-row .saga-pending-entry-actions'),
    'Mobile Pending Review entries must keep tap-hold/context-menu inspection while workspace rows expose only Accept/Reject commands.'
);
assert(lorecardsPanel.includes('} else if (mobileShell) {\n        appendEntrySourceAndContextBadges(meta, entry);') && lorecardsPanel.includes('if (!basicReview || mobileShell)') && lorecardsPanel.includes("createBadge(`Quality: ${generation.qualityRoute || reviewMeta.qualityRoute}`") && lorecardsPanel.includes("createBadge(`Route: ${generation.similarityRoute || reviewMeta.reviewRoute}`") && lorecardsPanel.includes("createBadge(`confidence ${entry.confidence}`"), 'Basic mobile pending cards must expose source, context, route/quality, and confidence hints while desktop Basic stays lighter.');
assert(lorecardsPanel.includes('function getPendingLoreReviewStateDescriptors(entry = {})') && lorecardsPanel.includes('function appendPendingLoreReviewStateChips(meta, entry = {}, onInspect = () => {})') && lorecardsPanel.includes("label: 'Conflict'") && lorecardsPanel.includes("label: targetId ? 'Duplicate route' : 'Duplicate'") && lorecardsPanel.includes("label: `Low confidence ${Math.round(confidence * 100)}%`") && lorecardsPanel.includes("className: 'saga-pending-review-state-chip'") && lorecardsPanel.includes('chip.dataset.pendingReviewState = descriptor.key') && lorecardsPanel.includes('appendPendingLoreReviewStateChips(meta, entry, inspectPendingEntry);'), 'Pending Review cards must expose duplicate, conflict, and low-confidence state chips that open the existing inspection detail path.');
assert(lorecardsPanel.includes('function createPendingLoreDetailSummary(entry = {})') && lorecardsPanel.includes("['Why suggested', getPendingLoreSuggestionReason(entry)") && lorecardsPanel.includes("['Affected Context', contextSummary") && lorecardsPanel.includes("['Similar existing cards', getPendingLoreSimilarSummary(entry)") && lorecardsPanel.includes("['Destination', getPendingLoreDestinationSummary(entry)") && style.includes('.saga-pending-lore-detail-summary'), 'Mobile pending detail inspection must expose reason, affected Context, similar-card routing, and destination details.');
assert(lorecardsPanel.includes("destinationBox.textContent = `Destination: ${basicReview && targetId") && lorecardsPanel.includes('getPendingLoreDestinationSummary(entry)') && lorecardsPanel.includes("Accepting this candidate creates a new Accepted Lorecard."), 'Pending Review cards must expose a destination preview even when they create a new Accepted Lorecard.');
assert(lorecardsPanel.includes('const filtered = basicReview ? getBasicAcceptedLoreEntries(state) : getFilteredLoreEntries(state);'), 'Basic Accepted Lorecards must not inherit hidden Advanced filters.');
assert(style.includes('saga-basic-advanced-handoff') && style.includes('saga-basic-review-entry-card'), 'Basic Lorecards simplification must keep compact entry and Advanced handoff styling.');
assert(style.includes('saga-basic-readiness-card') && !style.includes('saga-basic-injection-summary-card'), 'Basic readiness styling must remain without selected-lore summary styling.');
assert(harness.includes('window.__sagaSmokeReady = true'), 'Harness must expose a smoke-ready marker.');
assert(harness.includes('new URLSearchParams(window.location.search)'), 'Harness must support query-param visual smoke variants.');
assert(harness.includes("smokeParams.get('tab')"), 'Harness must allow direct tab selection for targeted smoke tests.');
assert(harness.includes("const smokeMode = smokeParams.get('mode') === 'basic' ? 'basic' : 'advanced';"), 'Harness must allow direct Basic and Advanced smoke modes.');
assert(harness.includes("experienceMode: smokeMode"), 'Harness settings must honor the requested smoke mode.');
assert(harness.includes('window.__sagaSmokeMode = smokeMode'), 'Harness must expose requested smoke mode metadata.');
assert(harness.includes("activeTab: smokeActiveTab"), 'Harness must open directly to the requested smoke tab.');
assert(harness.includes("import { getDefaultMobilePanelState } from '../../src/runtime/runtime-shell.js';") && harness.includes('mobile: getDefaultMobilePanelState(smokeActiveTab, settings)'), 'Harness must seed mobile route state from the requested smoke tab.');
assert(harness.includes("smokeParams.get('review') === 'context-proposals'"), 'Harness must support opening Context proposal review for visual smoke.');
assert(harness.includes('window.__sagaContextSmoke'), 'Harness must expose Context smoke metadata.');
assert(harness.includes("selectedLoredeckId: customPack.packId"), 'Harness must select the seeded Custom Loredeck.');
assert(harness.includes('pendingChanges'), 'Harness must seed Pending Review content.');
assert(harness.includes("kind: 'custom'"), 'Harness must seed a Custom Loredeck source.');
assert(harness.includes('contextResolutionProposals'), 'Harness must seed reviewable Context proposals for Context visual smoke.');
assert(harness.includes('contextResolutionAudit'), 'Harness must seed resolver audit state for Context visual smoke.');
assert(harness.includes('contextAutomationAudit'), 'Harness must seed automation audit state for Context visual smoke.');
assert(harness.includes('state.contextBrief = {'), 'Harness must seed a rich Context Brief for Context visual smoke.');
assert(harness.includes('state.loreContext = {'), 'Harness must seed the legacy global Context projection for compatibility smoke.');
assert(!settingsTemplate.includes('Provider Settings'), 'Extension menu settings must not expose the old Provider Settings dropdown.');
assert(!settingsTemplate.includes('API and model controls'), 'Extension menu settings must not expose legacy API/model controls.');
assert(!settingsTemplate.includes('Runtime Window'), 'Extension menu settings must not nest runtime actions inside a Runtime Window dropdown.');
assert(settingsTemplate.includes('Open Saga Window') && settingsTemplate.includes('Reset Window') && settingsTemplate.includes('fa-compass saga-extensions-menu-icon'), 'Extension menu settings must keep the runtime open and reset actions directly in the Saga dropdown with the compass icon.');
assert(runtimePanelSource.includes('writeRuntimeThemeVars(document.documentElement'), 'Runtime themes must publish CSS tokens globally for fullscreen windows.');
assert(runtimePanelSource.includes("'--saga-red-surface'"), 'Runtime themes must expose derived danger surface tokens.');
assert(runtimeTheme.includes("target.style.setProperty('--saga-danger', colors.danger)") && runtimeTheme.includes("target.style.setProperty('--saga-danger-surface', hexToRgba(colors.danger, 0.24))"), 'Runtime themes must expose explicit danger aliases from the active Theme Pack danger color.');
assert(runtimeTheme.includes("['Activate', 'themeActivateColor', 'activate']") && runtimeTheme.includes("target.style.setProperty('--saga-activate', colors.activate)") && runtimeTheme.includes("target.style.setProperty('--saga-activate-glow', hexToRgba(colors.activate, 0.48))"), 'Runtime themes must expose an Activate Theme Pack color and activation glow aliases.');
assert(runtimeTheme.includes("['Chip Metadata', 'themeChipNeutralColor', 'chipNeutral']") && runtimeTheme.includes("['Chip Warning', 'themeChipWarningColor', 'chipWarning']"), 'Runtime themes must expose Theme Pack color fields for metadata chip tones.');
assert(runtimeTheme.includes("target.style.setProperty('--saga-chip-neutral-bg', hexToRgba(colors.chipNeutral, 0.08))") && runtimeTheme.includes("target.style.setProperty('--saga-chip-warning-border', hexToRgba(colors.chipWarning, 0.32))"), 'Runtime themes must derive quiet chip fill/border CSS tokens from Theme Pack chip colors.');
assert(
    runtimeTheme.includes('function mixWithActivate')
        && runtimeTheme.includes("target.style.setProperty('--saga-chip-relevance-low-bg', hexToRgba(colors.chipNeutral, 0.08))")
        && runtimeTheme.includes("target.style.setProperty('--saga-chip-relevance-low-fg', colors.chipMuted)")
        && runtimeTheme.includes("target.style.setProperty('--saga-chip-relevance-normal-bg', mixWithActivate('var(--saga-surface-2)', colors.activate, 18))")
        && runtimeTheme.includes("target.style.setProperty('--saga-chip-relevance-normal-fg', mixWithActivate('var(--saga-muted)', colors.activate, 48))")
        && runtimeTheme.includes("target.style.setProperty('--saga-chip-relevance-high-bg', mixWithActivate('var(--saga-surface-2)', colors.activate, 42))")
        && runtimeTheme.includes("target.style.setProperty('--saga-chip-relevance-high-fg', colors.activate)")
        && !runtimeTheme.includes("hexToRgba('#166534'")
        && !runtimeTheme.includes("hexToRgba('#1e40af'")
        && !runtimeTheme.includes("hexToRgba('#475569'"),
    'Runtime themes must derive Lorecard relevance dots as neutral low, restrained Activate normal, and full Activate high instead of dedicated hard-coded relevance colors.'
);
assert(runtimeTheme.includes("merged.chipSuccess = merged.chipSuccess || '#b9d8b8'") && runtimeTheme.includes("merged.chipDanger = merged.chipDanger || '#e1a0a0'"), 'Incomplete Theme Packs must fall back to readable chip foreground colors instead of dark status surfaces.');
assert(defaultSettings.includes("themeActivateColor: '#ffcb5c'") && defaultSettings.includes("themeChipNeutralColor: '#c8cbd2'") && defaultSettings.includes("themeChipWarningColor: '#e0c184'"), 'Default settings must include the warm Saga Archive Activate baseline, quiet metadata chip baseline, and warm Saga Archive warning chip color.');
assert(themePanel.includes("['Activate', 'themeActivateColor', 'activate']") && themePanel.includes("createThemeColorGroup('Metadata Chips'") && themePanel.includes("['Source / Tag', 'themeChipSourceColor', 'chipSource']"), 'Theme settings must expose Activate in State Colors and a Metadata Chips color group.');
assert(themePanel.includes('getThemeColorParts') && themePanel.includes('saga-theme-color-rgb') && themePanel.includes('saga-theme-color-hex') && themePanel.includes('RGB ${parts.r}, ${parts.g}, ${parts.b}') && themePanel.includes('Hex ${parts.hex}'), 'Theme color fields must render compact RGB and Hex key values.');
assert(style.includes('.saga-theme-color-field') && style.includes('--theme-color-field') && style.includes('.saga-theme-color-rgb') && style.includes('font-size: 0.68rem') && style.includes('.saga-theme-color-hex') && style.includes('font-size: 0.66rem'), 'Theme color key styling must use beveled Theme Pack surfaces with compact RGB and Hex typography.');
assert(themeLibraryStore.includes("'activate'") && themeLibraryStore.includes("'chipNeutral'") && themeLibraryStore.includes("'chipDanger'"), 'Theme Pack import/export sanitization must preserve Activate and metadata chip color keys.');
assert((runtimeTheme.match(/activate:\s*'#[0-9a-f]{6}'/gi) || []).length >= 15, 'Every bundled Theme Pack must define a visually distinct Activate color.');
assert(style.includes('.saga-lorecard-workspace-row.saga-lore-entry-elevated') && style.includes('border-color: var(--saga-activate') && style.includes('var(--saga-activate-glow') && /\.saga-lorecard-active-toggle-button\.saga-lorecard-active-toggle-active\s*\{[\s\S]*?var\(--saga-activate/.test(style), 'Lorecard Elevated glows must consume the shared Activate Theme Pack token.');
assert(style.includes('.saga-lore-panel:not(.saga-runtime-mobile) .saga-lorecard-workspace-row.saga-lore-entry-elevated') && style.includes('0 0 6px var(--saga-activate-glow') && style.includes('0 0 10px var(--saga-activate-surface') && /\.saga-lorecard-active-toggle-button\s*\{[\s\S]*?width:\s*16px;[\s\S]*?height:\s*16px;[\s\S]*?min-width:\s*16px !important;/.test(style) && !/\.saga-runtime-mobile \.saga-lorecard-active-toggle-button/.test(style), 'Desktop Lorecard Elevated glow must stay contained and the desktop Elevate button must stay compact while mobile uses double-tap instead of an Elevate button.');
const workbenchThemeScope = style.match(/\.saga-lore-workbench-shell,\s*[\r\n]+\.saga-new-lore-shell\s*\{[\s\S]*?\}/)?.[0] || '';
assert(!workbenchThemeScope.includes('--saga-bg:'), 'Fullscreen workbench shells must not redeclare default theme tokens locally.');
assert(style.includes('var(--saga-danger-surface') && style.includes('.saga-danger-zone-card') && style.includes('var(--saga-red-surface'), 'Danger Zone and health danger surfaces must use active Theme Pack danger tokens.');
assert(!/\.saga-danger-zone-title\s*\{[\s\S]*?--saga-danger/.test(style), 'Danger Zone title must inherit the normal runtime card title color instead of using danger text on a danger surface.');
assert(!style.includes('border-color: rgba(190, 80, 80, 0.45) !important;'), 'Danger buttons must not use hardcoded late-cascade red borders.');
assert(!style.includes('background: rgba(120, 30, 38, 0.22) !important;'), 'Danger buttons must not use hardcoded late-cascade red backgrounds.');
assert(!style.includes('folder-cover-tile:nth-child(odd)'), 'Folder cover previews must not randomly tilt odd covers.');
assert(!style.includes('folder-cover-tile:nth-child(even)'), 'Folder cover previews must not randomly tilt even covers.');
assert(runtimePanelSource.includes('LOREDECK_LIBRARY_FOLDER_COVER_MAX_VISIBLE = 15'), 'Folder cover previews must cap visible deck covers at 15 before the overflow tile.');
assert(!read(libraryPanelPath).includes('slice(0, 20)'), 'Folder cover preview collection must not retain the old 20-cover cap.');
assert(!libraryPanel.includes('ResizeObserver') && !libraryPanel.includes('getPropertyValue(\'--saga-folder-cover-size\')'), 'Folder cover previews must not schedule per-row measured layout work after render.');
assert(libraryPanel.includes('await hydrateLoredeckPayloadRecord(pack)') && runtimePanelSource.includes('hydrateLoredeckPayloadRecord: hydrateExternalLorepackPayloadRecord'), 'Loredeck cover image saves must hydrate external payload-backed decks before persisting cover changes.');
assert(libraryPanel.includes('await flushLoredeckPayloadWrites()') && runtimePanelSource.includes('flushLoredeckPayloadWrites: flushSagaLorepackPayloadStorageWrites'), 'Loredeck cover image saves must wait for external payload asset writes before rerendering cover previews.');
assert(libraryPanel.includes('refreshSurfaces: false') && runtimePanelSource.includes('options.refreshSurfaces !== false'), 'Loredeck cover image saves must defer the normal mutation refresh until after the external cover asset is written.');
assert(!runtimePanelSource.includes('LEGACY_ICONSET_ID'), 'Theme icon resolution must not reference the removed legacy icon set.');
assert(!runtimePanelSource.includes('Images/runtime-icons'), 'Runtime icon resolution must not reference the discontinued runtime icon folder.');
assert(!runtimePanelSource.includes('Drop support is queued'), 'Loredeck Library must not expose queued drop-support placeholder copy.');
assert(!runtimePanelSource.includes("['contents', 'Contents'"), 'Loredeck Library details must not expose the low-value Contents tab.');
assert(!runtimePanelSource.includes("['activation', 'Activation'"), 'Loredeck Library details must not expose the low-value Activation tab.');
assert(!runtimePanelSource.includes("createButton('Delete Folder'"), 'Folder details must not expose a redundant Delete Folder button.');
assert(!runtimePanelSource.includes("createButton('Remove', 'Remove this Loredeck from the current stack.'"), 'Loredeck details must not expose a redundant Remove button.');
assert(!runtimePanelSource.includes('createLoredeckLibraryCurrentViewHeader'), 'Loredeck Library must not render the obsolete current-view side-tree summary strip.');
assert(!style.includes('saga-loredeck-library-current-view'), 'Loredeck Library CSS must not keep obsolete current-view side-tree styles.');
assert(runtimePanelSource.includes('buildLoredeckPackScopedHealth'), 'Loredeck Library deck stats must scope aggregate stack health back to a single pack.');
assert(runtimePanelSource.includes('report?.databaseId === packId'), 'Loredeck Library deck counts must guard against aggregate stack report summaries.');
assert(!runtimePanelSource.includes('entryCount: Number(report.summary?.entryCount) || Number(loadedMeta?.entryCount)'), 'Loredeck Library deck counts must not prefer aggregate report entry totals over per-pack metadata.');
assert(runtimePanelSource.includes('function refreshLoredeckLibrarySelectionSurfaces'), 'Loredeck Library card selection must support in-place surface refreshes.');
assert(runtimePanelSource.includes('function refreshLoredeckLibrarySelectionHighlights'), 'Loredeck Library folder selection must update highlights before rebuilding heavier surfaces.');
assert(runtimePanelSource.includes('function scheduleLoredeckLibrarySelectionSurfaceRefresh'), 'Loredeck Library folder selection must schedule in-place surface refreshes.');
assert(runtimePanelSource.includes('function refreshLoredeckLibraryVisibleSurfaces') && runtimePanelSource.includes('scheduleLoredeckLibraryVisibleSurfaceRefresh'), 'Loredeck Library search/view/sort changes must refresh visible surfaces in place instead of rebuilding the fullscreen overlay.');
assert(!/onChange: value => \{\s*loredeckLibrarySort = value;\s*renderLoredeckLibraryOverlay\(\);/m.test(runtimePanelSource), 'Loredeck Library sort dropdown must not synchronously rebuild the full overlay.');
assert(runtimeUiKit.includes('function shouldUseFloatingTooltip') && runtimeUiKit.includes("toUpperCase() !== 'SELECT'"), 'Native select controls must not show the custom floating tooltip on focus/open.');
assert(libraryPanel.includes('function scheduleLoredeckLibraryVisibleSurfaceRefresh(options = {})') && libraryPanel.includes('options.refreshHighlights !== false') && (libraryPanel.match(/scheduleLoredeckLibraryVisibleSurfaceRefresh\(\{ refreshHighlights: false \}\)/g) || []).length >= 4, 'Loredeck Library search/view/sort controls must avoid synchronous highlight scans before their deferred visible-surface refresh.');
assert(loredeckFilterControls.includes('saga-loredeck-select-control') && loredeckFilterControls.includes('saga-loredeck-select-menu') && !loredeckFilterControls.includes("document.createElement('select')"), 'Shared Loredeck filter dropdowns must use the lightweight in-DOM menu instead of native select popups.');
assert(!libraryPanel.includes("document.createElement('select')") && libraryPanel.includes('getLoredeckLibraryFolderMoveOptions') && libraryPanel.includes('getLoredeckLibraryFolderParentOptions'), 'Loredeck Library folder move controls must not use native select popups.');
assert(dropdownLatencyHarness.includes("import { createLoredeckSearchInput, createLoredeckSelectControl }") && dropdownLatencyHarness.includes('window.__sagaDropdownLatency') && dropdownLatencyHarness.includes('handlerP95BudgetMs') && dropdownLatencyHarness.includes('settledP95BudgetMs'), 'Browser dropdown latency harness must exercise real dropdown controls and publish machine-readable latency results.');
assert(read('src/storage/saga-lorepack-library-storage.js').includes('hydrateCachedPayloads === true'), 'Merged Library registry reads must keep cached external payload hydration opt-in.');
assert(defaultState.includes("selectedLoredeckId: ''"), 'New Saga installs must not preselect a Loredeck in the Library details panel.');
assert(runtimePanelSource.includes('No Loredecks or Folders Selected'), 'Loredeck Library details must show an explicit empty-selection state.');
assert(runtimePanelSource.includes('function clearLoredeckLibrarySelection'), 'Loredeck Library must provide a shared empty-space selection clear helper.');
assert(runtimePanelSource.includes('function wireLoredeckLibraryBlankSelectionClear'), 'Loredeck Library columns must clear selection when their blank space is clicked.');
assert(runtimePanelSource.includes('return selectedId ? (library.find(pack => pack.packId === selectedId) || null) : null;'), 'Loredeck Library details must not fall back to the first deck when nothing is selected.');
assert(style.includes('saga-loredeck-library-details-empty'), 'Loredeck Library empty-selection details panel must have centered styling.');
assert(style.includes('.saga-loredeck-library-details-empty .saga-lore-empty::before') && style.includes('.saga-loredeck-library-details-empty .saga-lore-empty::after'), 'Loredeck Library empty-selection label must use CSS divider lines instead of literal dashes.');
assert(runtimePanelSource.includes('source.originalType || pack.type || manifest.type') && runtimePanelSource.includes("kind: 'package_export'"), 'Loredeck package exporter must write original source type into package index metadata.');
assert(runtimeLoredeckPackageExport.includes('sourceInfo.originalType || fresh.type || source.manifest.type'), 'Loredeck package exporter manifest metadata must preserve original source type before current library type.');
assert(runtimePanelSource.includes('sourceInfo.originalType || indexRecord.originalType') && runtimePanelSource.includes("storageMode: 'bundled_manifest_reference'"), 'Loredeck package importer must use exported original type for lightweight bundled reimports.');
assert(loredeckLibraryStore.includes('importedPackIds.push(packId)') && loredeckLibraryStore.includes('skippedPackIds.push(packId)'), 'Loredeck library import must report exact imported and skipped pack IDs.');
assert(runtimeLoredeckPackageInstallPanel.includes('new Set(Array.isArray(result.importedPackIds) ? result.importedPackIds : [])'), 'Loredeck package install panel must use imported pack IDs instead of selected rows when caching installed decks.');
assert(runtimeLoredeckPackageInstallPanel.includes('No Custom Loredecks were installed from package.') && runtimeLoredeckPackageInstallPanel.includes('Installed ${installedCount} Custom Loredeck'), 'Loredeck package install toast must report the actual imported count, including zero-install skips.');
assert(runtimePanelSource.includes('requestAnimationFrame(() =>') && runtimePanelSource.includes('refreshLoredeckLibrarySelectionSurfaces();'), 'Loredeck Library folder selection refresh should defer heavier detail work to an animation frame.');
assert(runtimePanelSource.includes('scheduleLoredeckLibrarySelectionSurfaceRefresh();'), 'Loredeck Library folder clicks must use the in-place selection refresh path.');
assert(runtimePanelSource.includes('function scheduleLoredeckLibraryOverlayRefresh'), 'Loredeck Library stack/drop refreshes must support deferred overlay rebuilds.');
assert(runtimePanelSource.includes('refreshLoredeckSurfaces({ renderLibrary: false });') && runtimePanelSource.includes('scheduleLoredeckLibraryOverlayRefresh();'), 'Loredeck stack mutations must refresh drawer surfaces without immediately rebuilding the Library overlay.');
assert(runtimePanelSource.includes('refreshLoredeckLibrarySelectionSurfaces();') && runtimePanelSource.includes("overlay.querySelector('.saga-loredeck-library-pane-stack')"), 'Loredeck stack mutations must refresh the visible Active Stack pane before the deferred full overlay rebuild.');
assert(!runtimePanelSource.includes('addLoredecksToStack(actionIds);\n        renderLoredeckLibraryOverlay();'), 'Loredeck Library stack add button must not force an immediate duplicate overlay rebuild.');
assert(!runtimePanelSource.includes('addLoredecksToStack(packIds);\n        renderLoredeckLibraryOverlay();'), 'Loredeck Library stack drop handler must not rebuild before the drag release can paint.');
assert(!runtimePanelSource.includes("function commitLoredeckStackMutation(message, mutator)") && !runtimePanelSource.includes("commitLoredeckStackMutation(`Added"), 'Loredeck Library stack mutations must pass the mutator directly after snapshot-history removal.');
const retiredSnapshotApiName = 'pushState' + 'Snapshot';
const retiredTimelineHistoryKey = 'state' + 'History';
const retiredMemoHistoryKey = 'memo' + 'History';
assert(!stateManager.includes(retiredSnapshotApiName) && !runtimePanelSource.includes(retiredSnapshotApiName), 'Snapshot history helpers must stay removed from state and panel code.');
assert(!stateManager.includes(retiredTimelineHistoryKey) && !stateManager.includes(retiredMemoHistoryKey), 'Retired snapshot storage fields must not be persisted by state-manager.');
assert(runtimePanelSource.includes('function refreshLoredeckLibraryHierarchyList'), 'Loredeck Library folder disclosure toggles must refresh only the hierarchy list.');
assert(runtimePanelSource.includes('function scheduleLoredeckLibraryHierarchyRefresh'), 'Loredeck Library folder disclosure toggles must schedule a lightweight hierarchy refresh.');
assert(runtimePanelSource.includes('updateLoredeckLibraryFolderDisclosureDom(id, !collapsed);') && runtimePanelSource.includes('scheduleLoredeckLibraryHierarchyRefresh();'), 'Loredeck Library folder disclosure toggles must update arrow state before the list refresh.');
const folderToggleBody = (runtimePanelSource.split('function toggleLoredeckLibraryFolderCollapsed')[1] || '').split('function createLoredeckLibraryFolderCoverStrip')[0] || '';
assert(folderToggleBody && !folderToggleBody.includes('renderLoredeckLibraryOverlay();'), 'Loredeck Library folder disclosure toggles must not rebuild the full overlay.');
assert(runtimePanelSource.includes('function updateLoredeckLibraryDetailsCollapsedDom'), 'Loredeck Library details expand/collapse must update the existing DOM in place.');
assert(runtimePanelSource.includes('if (!updateLoredeckLibraryDetailsCollapsedDom(next)) renderLoredeckLibraryOverlay();'), 'Loredeck Library details collapse should only rerender when the overlay DOM is missing.');
assert(runtimePanelSource.includes('loredeckLibraryExpandedFolderIds'), 'Loredeck Library must track explicit expanded folder overrides for default-collapsed bundled folders.');
assert(runtimePanelSource.includes('isLoredeckLibraryBundledFolder'), 'Loredeck Library must detect bundled folders for default-collapsed folder state.');
assert(runtimePanelSource.includes('createContextCommandCenterCard'), 'Context tab must render the Phase 6 command center.');
assert(runtimePanelSource.includes('Runtime Context'), 'Context command center must use runtime Context language.');
assert(runtimePanelSource.includes('Browse Context'), 'Context command center must expose the Context Browser as a primary action.');
assert(runtimePanelSource.includes('Review Proposals'), 'Context command center must expose proposal review as a primary action.');
assert(runtimePanelSource.includes("['assisted', 'Assisted'"), 'Context automation must expose Assisted mode.');
assert(runtimePanelSource.includes('contextDetectionAutoMinTurns'), 'Context automation must expose minimum-turn cadence settings.');
assert(runtimePanelSource.includes('contextDetectionAutoCharacterThreshold'), 'Context automation must expose character-threshold cadence settings.');
assert(runtimePanelSource.includes('contextReasonerFallbackEnabled'), 'Context automation must expose a Reasoner fallback toggle.');
assert(runtimePanelSource.includes('contextLocalApplyMinConfidence'), 'Context automation must expose local auto-apply confidence.');
assert(runtimePanelSource.includes('contextReasonerProposalMinConfidence'), 'Context automation must expose bounded Reasoner proposal confidence.');
assert(runtimePanelSource.includes('CONTEXT_PROPOSAL_REVIEW_ID'), 'Context proposal review must use a stable fullscreen overlay id.');
assert(runtimePanelSource.includes('openContextProposalReview'), 'Context command center must open the proposal review overlay.');
assert(runtimePanelSource.includes('createContextProposalReviewShell'), 'Context proposal review must render a dedicated fullscreen shell.');
assert(runtimePanelSource.includes('Apply All'), 'Context proposal review must expose an apply-all action.');
assert(runtimePanelSource.includes('Dismiss All'), 'Context proposal review must expose a dismiss-all action.');
assert(
    contextPanel.includes('saga-context-proposal-review-shell-mobile')
    && contextPanel.includes('createContextProposalReviewActions(proposals, { mobile: true })')
    && contextPanel.includes('if (!mobile) header.appendChild(createContextProposalReviewActions(proposals))')
    && /\.saga-context-proposal-review-bottom-actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,[\s\S]*?var\(--saga-mobile-safe-area-bottom/.test(style)
    && /\.saga-context-proposal-review-shell-mobile \.saga-context-proposal-review-list\s*\{[\s\S]*?height:\s*auto;[\s\S]*?overflow:\s*visible;/.test(style),
    'Mobile Context Proposal Review must move persistent Apply All/Dismiss All/Close actions to a bottom bar and let the proposal list flow in the body scroll.'
);
assert(runtimePanelSource.includes('createContextProposalReviewRow'), 'Context proposal review must render per-proposal rows.');
assert(runtimePanelSource.includes('formatContextPatchSummary'), 'Context proposal review must summarize proposed Context patches.');
assert(runtimePanelSource.includes('createContextAdvancedBriefSection'), 'Context tab must move legacy global fields into an advanced brief section.');
assert(/function renderContextTab[\s\S]*const basic = isBasicExperienceMode\(\);[\s\S]*if \(!basic\) container\.appendChild\(createContextAdvancedBriefSection\(state\)\);/.test(runtimePanelSource), 'Basic Context must hide the Advanced Context Brief section.');
assert(runtimePanelSource.includes("'Set and audit where this chat sits inside each loaded Loredeck.'"), 'Basic Context header must use the shared Advanced Context header copy.');
assert(contextPanel.includes('function isBasicExperienceMode') && contextComposition.includes('isBasicExperience: () => deps.isBasicExperience?.(deps.getSettings?.())'), 'Context panel must receive the active experience mode through context composition.');
assert(contextPanel.includes("'Runtime Context'") && contextPanel.includes('Browse Context'), 'Basic Context command center must use shared Advanced Context labels.');
assert(contextPanel.includes('Reasoner Proposals') && contextPanel.includes('Context Proposal Review') && contextPanel.includes('Review Proposals'), 'Basic Context proposals must use shared Advanced proposal labels.');
assert(/if \(!basic\)\s*{\s*const resolverActions/.test(contextPanel), 'Basic Context must hide Resolve Local and Ask Reasoner controls.');
assert(/if \(!basic\)\s*{\s*card\.appendChild\(createContextResolutionAuditPanel\(state\)\);\s*card\.appendChild\(createContextAutomationAuditPanel\(state\)\);/.test(contextPanel), 'Basic Context must hide resolver and automation audit panels.');
assert(/if \(!basic\)\s*{\s*actions\.appendChild\((?:markTourTarget\()?createButton\(context\.manualLock \? 'Unlock' : 'Lock'/.test(contextPanel), 'Basic Loredeck Context rows must hide direct manual lock controls.');
assert(contextPanel.includes("createContextProposalReviewRow(proposal, { basic })") && contextPanel.includes("createButton('Apply', 'Apply this Context proposal.'"), 'Basic Context proposal review rows must use shared Apply wording.');
assert(panel.includes("label.textContent = 'Detector'"), 'Basic Context status row must use the shared Detector label.');
assert(runtimePanelSource.includes("'context.advancedBrief'"), 'Advanced Context Brief section must have a stable collapsible id.');
assert(!runtimePanelSource.includes('container.appendChild(createContextDetectionCard(state));'), 'Context tab must not render the old standalone detection card.');
assert(runtimePanelSource.includes('toggleLoredeckContextManualLock'), 'Loaded Loredeck Context rows must expose a direct lock/unlock control.');
assert(runtimePanelSource.includes('Seed From Brief'), 'Loaded Loredeck Context rows must seed from the rich Context Brief projection.');
assert(runtimePanelSource.includes('getContextBriefSignalSummary'), 'Advanced Context Brief must summarize non-date detector signals.');
assert(runtimePanelSource.includes('createContextBriefStatusCard'), 'Context tab must surface the latest Context Brief detector status.');
assert(runtimePanelSource.includes("markTourTarget(row, 'context.briefStatus')"), 'Context Brief status row must have a tour target.');
assert(runtimePanelSource.includes('No loaded Loredecks'), 'Context tab must show an empty-stack state instead of stale aggregate Context counts.');
assert(runtimePanelSource.includes('if (stack.length) {') && runtimePanelSource.includes('formatContextIndexSummary(contextIndex)'), 'Context index summaries must be gated behind a loaded Loredeck stack.');
assert(runtimePanelSource.includes('state?.contextBrief'), 'Context Brief status UI must read from chat state.');
assert(runtimePanelSource.includes('refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });'), 'Context detection completion must preserve runtime scroll position.');
assert(panel.includes('function openPendingLoreReviewSections()') && panel.includes("setSectionCollapsed('lore.pendingReview', false);"), 'Canon add actions must have a local Pending Review opener after guide prep extraction.');
assert(panel.includes('function refreshCanonPreviewSelectionUi()'), 'Canon preview selection must refresh row/count/button state without rebuilding the full Lorecards tab.');
assert(panel.includes("addSelected.dataset.sagaCanonPreviewAction = 'add-selected';"), 'Canon preview Add Selected button must be addressable by selection refresh.');
assert(panel.includes("row.dataset.canonPreviewEntryId = id;"), 'Canon preview rows must expose entry ids for in-place selection state refresh.');
assert(panel.includes('if (!refreshCanonPreviewSelectionUi()) refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });'), 'Canon preview selection fallback must preserve drawer and page scroll if a full refresh is needed.');
assert(runtimeShell.includes("'.saga-canon-preview-list'"), 'Canon preview list must participate in nested scroll preservation and wheel handoff.');
assert(panel.includes('function refreshLoredeckAssistantDraftSelectionUi(pack)'), 'Assistant draft selection must refresh row/count/button state without rebuilding the full Lorecards tab.');
assert(panel.includes('if (options.refresh && !refreshLoredeckAssistantDraftSelectionUi(pack))'), 'Assistant draft checkbox fallback must preserve drawer and page scroll if a full refresh is needed.');
assert(runtimeLoredeckAssistantDraftCache.includes("Object.prototype.hasOwnProperty.call(record || {}, 'selectedDraftChangeIds')")
    && runtimeLoredeckAssistantDraftCache.includes('return new Set(validIds)')
    && runtimeLoredeckAssistantDraftCache.includes('delete normalized.selectedDraftChangeIds'),
    'Assistant draft cache updates must preserve default-all selection when no explicit selection exists.');
assert(runtimeLoredeckAssistantReview.includes("queueSelected.dataset.sagaAssistantDraftAction = 'queue-selected';"), 'Assistant draft Queue Selected button must be addressable by selection refresh.');
assert(runtimeLoredeckAssistantReview.includes("row.dataset.sagaAssistantDraftChangeId = change.changeId || '';"), 'Assistant draft rows must expose change ids for in-place selection state refresh.');
assert(runtimeShell.includes("'.saga-loredeck-assistant-draft-list'"), 'Assistant draft list must participate in nested scroll preservation and wheel handoff.');
assert(style.includes('.saga-loredeck-assistant-draft-row-selected'), 'Assistant draft selected rows must have dedicated runtime styling.');
assert(loredeckUiKit.includes('export function createLoredeckRenderErrorCard') && loredeckUiKit.includes('export function appendLoredeckStatusPills'), 'Loredeck UI kit must own shared render-error and status-pill helpers.');
assert(libraryPanel.includes("from './loredeck-ui-kit.js'") && libraryPanel.includes('createLoredeckRenderErrorBody') && libraryPanel.includes('appendLoredeckStatusPills(meta'), 'Loredeck Library must use shared Loredeck UI kit primitives for render errors and header status.');
assert(loredeckWorkbenchPanel.includes("from './loredeck-ui-kit.js'") && loredeckWorkbenchPanel.includes('createLoredeckEmptyState') && loredeckWorkbenchPanel.includes('appendLoredeckStatusPills(chips'), 'Loredeck Workbench must use shared Loredeck UI kit primitives for shell empty/status surfaces.');
assert(healthPanel.includes("from './loredeck-ui-kit.js'") && healthPanel.includes('createLoredeckRenderErrorCard') && healthPanel.includes('appendLoredeckStatusPills(meta'), 'Pack Health Center must use shared Loredeck UI kit primitives for render errors and hero status.');
assert(loredeckFilterControls.includes('export function createLoredeckSearchInput') && loredeckFilterControls.includes('export function createLoredeckSelectControl') && loredeckFilterControls.includes('export function createLoredeckFilterCount'), 'Loredeck filter controls must own shared search, select, and count primitives.');
assert(loredeckSelectionToolbar.includes('export function createLoredeckSelectionSummary') && loredeckSelectionToolbar.includes('export function formatLoredeckSelectionSummary'), 'Loredeck selection toolbar must own shared selection summary rendering.');
assert(libraryPanel.includes("from './loredeck-filter-controls.js'") && libraryPanel.includes('createLoredeckSearchInput({') && libraryPanel.includes('createLoredeckSelectControl({'), 'Loredeck Library must use shared filter controls for search, view, and sort controls.');
assert(libraryPanel.includes("from './loredeck-selection-toolbar.js'") && libraryPanel.includes('createLoredeckSelectionSummary({') && libraryPanel.includes('visibleSelectedCount: selectedVisibleCount'), 'Loredeck Library must use shared selection summary rendering.');
assert(loredeckWorkbenchPanel.includes("from './loredeck-filter-controls.js'") && loredeckWorkbenchPanel.includes('createLoredeckSearchInput({') && loredeckWorkbenchPanel.includes('createLoredeckFilterCount({') && loredeckWorkbenchPanel.includes('return createLoredeckSelectControl({'), 'Loredeck Workbench must use shared filter controls for search, selects, and filtered counts.');
assert(loredeckWorkbenchPanel.includes("from './loredeck-selection-toolbar.js'") && loredeckWorkbenchPanel.includes("emptyText: 'No bulk selection'"), 'Loredeck Workbench bulk toolbar must use shared selection summary rendering.');
assert(loredeckValidationView.includes('export function createLoredeckValidationSeverityGrid') && loredeckValidationView.includes('export function createLoredeckValidationIssueList'), 'Loredeck validation view must own shared severity-grid and issue-list primitives.');
assert(loredeckValidationView.includes('export function createLoredeckValidationMetric') && loredeckValidationView.includes('export function createLoredeckValidationCategoryList'), 'Loredeck validation view must own shared metric and category-list primitives.');
assert(healthPanel.includes("from './loredeck-validation-view.js'") && healthPanel.includes('createLoredeckValidationSeverityGrid([') && healthPanel.includes('return createLoredeckValidationIssueList(titleText, issues'), 'Pack Health Center must use shared validation view primitives for severity and raw issue lists.');
assert(healthPanel.includes('return createLoredeckValidationCategoryList(getLoredeckHealthCategories(context.report)') && healthPanel.includes('return createLoredeckValidationMetric(label, value, tooltip);'), 'Pack Health Center must use shared validation view primitives for categories and metrics.');
assert(loredeckJobView.includes('export function createLoredeckJobStatusRow') && loredeckJobView.includes('export function formatLoredeckJobElapsed') && loredeckJobView.includes('export function createLoredeckJobProgressBar'), 'Loredeck job view must own shared async job status-row and progress-bar primitives.');
assert(creatorPanel.includes("from './loredeck-job-view.js'") && creatorPanel.includes('createLoredeckJobStatusRow(buildLoredeckCreatorGenerationStatusJob') && creatorPanel.includes('cancelLoredeckCreatorGeneration(model.id)'), 'Deck Maker generation status must render through the shared job view while retaining Creator-owned cancellation.');
assert(
    creatorPanel.includes('export function refreshLoredeckCreatorGenerationStatusUi')
    && creatorPanel.includes("querySelectorAll('.saga-generation-live-status[data-saga-creator-generation-id]')")
    && creatorPanel.includes('formatLoredeckJobMeta(job)')
    && creatorGenerationProgress.includes('refreshGenerationStatusUi(generation.id);')
    && creatorGenerationProgress.includes('}, { liveStatusOnly: true });'),
    'Deck Maker running-generation heartbeat must update live status rows in place instead of rebuilding the workbench body.'
);
assert(loredecksTabPanel.includes("from './loredeck-job-view.js'") && loredecksTabPanel.includes('createLoredeckJobProgressBar(model.progress'), 'Loredecks Deck Maker project shelf must render progress bars through the shared job view.');
assert(loredecksTabPanel.includes('activateLoredeckCreatorJobAsync') && /async function openLoredeckCreatorProject/.test(loredecksTabPanel), 'Loredecks Deck Maker project shelf must hydrate external project payloads asynchronously before opening after reload.');
assert(loredeckActionRows.includes('export function createLoredeckActionRow') && loredeckActionRows.includes('export function setLoredeckActionButtonBusy') && loredeckActionRows.includes('export async function withLoredeckActionButtonBusy') && loredeckActionRows.includes('export async function withLoredeckConfirmedActionButton'), 'Loredeck action rows must own shared action-row and busy-button primitives.');
assert(runtimeLoredeckPackageInstallPanel.includes("from '../loredecks/loredeck-action-rows.js'") && runtimeLoredeckPackageInstallPanel.includes('createLoredeckActionRow()') && runtimeLoredeckPackageInstallPanel.includes("withLoredeckActionButtonBusy(button, { busyText: 'Installing...'"), 'Loredeck package install panel must use shared action row and busy-button helpers.');
assert(runtimeLoredeckPackageExport.includes("from '../loredecks/loredeck-action-rows.js'") && runtimeLoredeckPackageExport.includes("withLoredeckActionButtonBusy(button, { busyText: 'Exporting...'"), 'Loredeck package export must use shared busy-button helper.');
assert(healthPanel.includes("from './loredeck-action-rows.js'") && healthPanel.includes("withLoredeckActionButtonBusy(button, { busyText: 'Scanning...'"), 'Pack Health refresh scan must use shared busy-button helper.');
assert(healthPanel.includes('function createLoredeckHealthIssueActionRow') && healthPanel.includes('panel.appendChild(createLoredeckHealthIssueActionRow(group, context, issueState, editable));') && healthPanel.includes("Attempt Fixing") && healthPanel.includes("Accept As-Is") && healthPanel.includes("Verify Fixed"), 'Pack Health grouped issue repair actions must be isolated behind the shared action-row helper with Stage 2 repair labels.');
assert(runtimeLoredeckEditorLoader.includes("from '../loredecks/loredeck-action-rows.js'") && runtimeLoredeckEditorLoader.includes('setLoredeckActionButtonBusy(button,') && runtimeLoredeckEditorValidation.includes("from '../loredecks/loredeck-action-rows.js'"), 'Loredeck editor loader and validation must use the shared busy-button helper.');
assert(runtimeLoredeckEditorFields.includes('export function createLoredeckCheckbox') && panel.includes('createLoredeckCheckbox,') && !panel.includes('function createLoredeckCheckbox(container'), 'Runtime Loredeck checkbox field creation must live in the shared editor field module.');
assert(runtimeLoredeckEditorActions.includes("from '../loredecks/loredeck-action-rows.js'") && runtimeLoredeckEditorActions.includes("setLoredeckActionButtonBusy(button, 'Finalizing...'") && runtimeLoredeckEditorActions.includes("setLoredeckActionButtonBusy(button, 'Creating...'") && runtimeLoredeckEditorActions.includes("setLoredeckActionButtonBusy(button, 'Attempting...'"), 'Runtime Loredeck editor actions must use the shared busy-button helper for finalize, duplicate, and repair flows.');
assert(runtimeLoredeckEditorActions.includes('export function configureLoredeckEditorActions') && runtimeLoredeckEditorActions.includes('export async function attemptLoredeckHealthFixes') && runtimeLoredeckEditorActions.includes('export async function finalizeGeneratedLoredeckAsCustom'), 'Runtime Loredeck editor actions must live in the extracted action module.');
assert(panel.includes("} from './loredeck-editor-actions.js';") && panel.includes('configureLoredeckEditorComposition({') && loredeckEditorComposition.includes('configureLoredeckEditorActions({') && panel.includes('attemptLoredeckHealthFixes,') && panel.includes('finalizeGeneratedLoredeckAsCustom,') && !panel.includes('repairLoredeckSafeHealthIssues'), 'Runtime panel must route shared Loredeck editor action wiring through loredeck-editor-composition.');
assert(!panel.includes('LOREDECK_ASSISTANT_HEALTH_REPAIR') && !panel.includes('handleLoredeckAssistantHealthRepairDraft') && !healthPanel.includes('Draft With Assistant'), 'Pack Health UI must not expose the removed assistant repair drafting path.');
assert(runtimeLoredeckEditorActions.includes('attemptLoredeckHealthFixesStorage(source.packId') && runtimeLoredeckEditorActions.includes('flushSagaLorepackPayloadStorageWrites()') && runtimeLoredeckEditorActions.includes('flushSagaLorepackLibraryStorageWrites()'), 'Attempt Fixing must route through storage-backed repair and wait for external payload/library writes.');
assert(runtimeLoredeckEditorActions.includes('retireGeneratedLoredeckAfterFinalization(validated, record, creatorJob)'), 'Generated Loredeck finalization must retire the hidden generated working pack and Deck Maker project after the Custom deck is created.');
assert(panel.includes('async function retireGeneratedLoredeckAfterFinalization') && panel.includes("removeLoredeckLibraryPack(sourcePackId, { clearCreatorProjects: false") && panel.includes('clearLoredeckCreatorWorkbenchCacheForRemovedJobs'), 'Runtime panel must retire generated working packs and clear stale Deck Maker workbench cache after finalization or deletion.');
assert(panel.includes("from '../storage/saga-lorepack-payload-storage.js'") && panel.includes('async function queueLoredeckMalformedTagRepairFromHealthGroup') && panel.includes('hydrateExternalLorepackPayloadRecord(source)'), 'Runtime Pack Health tag repair planning must hydrate external payload-backed Loredecks before queueing repairs.');
assert(runtimeLoredeckEntryOverrides.includes('export function configureLoredeckEntryOverridesPanel') && runtimeLoredeckEntryOverrides.includes('export function createLoredeckEntryOverrideCard') && runtimeLoredeckEntryOverrides.includes('export function createLoredeckEntryOverrideRow'), 'Runtime Loredeck entry override card and row renderers must live in the extracted entry overrides panel.');
assert(panel.includes("from './loredeck-entry-overrides-panel.js'") && loredeckEditorComposition.includes('configureLoredeckEntryOverridesPanel({') && !panel.includes('function createLoredeckEntryOverrideCard(pack)'), 'Runtime panel must delegate Loredeck entry override rendering to loredeck-entry-overrides-panel and route its wiring through loredeck-editor-composition.');
assert(runtimeLoredeckTimelineRegistry.includes('export function configureLoredeckTimelineRegistryPanel') && runtimeLoredeckTimelineRegistry.includes('export function createLoredeckTimelineRegistryCard') && runtimeLoredeckTimelineRegistry.includes('export function createLoredeckTimelineRegistryRow'), 'Runtime Loredeck timeline registry card and row renderers must live in the extracted timeline registry panel.');
assert(panel.includes("from './loredeck-timeline-registry-panel.js'") && loredeckEditorComposition.includes('configureLoredeckTimelineRegistryPanel({') && !panel.includes('function createLoredeckTimelineRegistryCard(pack'), 'Runtime panel must delegate Loredeck timeline registry rendering to loredeck-timeline-registry-panel and route its wiring through loredeck-editor-composition.');
assert(runtimeLoredeckTagManager.includes('export function configureLoredeckTagManagerPanel') && runtimeLoredeckTagManager.includes('export function createLoredeckTagManagerCard') && runtimeLoredeckTagManager.includes('export function createLoredeckTagManagerRow'), 'Runtime Loredeck tag manager card and row renderers must live in the extracted tag manager panel.');
assert(panel.includes("from './loredeck-tag-manager-panel.js'") && loredeckEditorComposition.includes('configureLoredeckTagManagerPanel({') && !panel.includes('function createLoredeckTagManagerCard(pack'), 'Runtime panel must delegate Loredeck tag manager rendering to loredeck-tag-manager-panel and route its wiring through loredeck-editor-composition.');
assert(runtimeLoredeckPendingReview.includes('export function configureLoredeckPendingReviewPanel') && runtimeLoredeckPendingReview.includes('export function createLoredeckPendingReviewCard') && runtimeLoredeckPendingReview.includes('export function createLoredeckPendingChangeRow') && runtimeLoredeckPendingReview.includes('const actions = createLoredeckActionRow();') && runtimeLoredeckPendingReview.includes('Accept All'), 'Runtime Loredeck Pending Review card and row renderers must live in the extracted pending review panel.');
assert(panel.includes("from './loredeck-pending-review-panel.js'") && loredeckEditorComposition.includes('configureLoredeckPendingReviewPanel({') && !panel.includes('function createLoredeckPendingReviewCard(pack'), 'Runtime panel must delegate Loredeck Pending Review rendering to loredeck-pending-review-panel and route its wiring through loredeck-editor-composition.');
assert(runtimeLoredeckAssistantReview.includes('export function configureLoredeckAssistantReviewPanel') && runtimeLoredeckAssistantReview.includes('export function createLoredeckAssistantCard') && runtimeLoredeckAssistantReview.includes('export function createLoredeckAssistantDraftBatchCard') && runtimeLoredeckAssistantReview.includes('export function createLoredeckAssistantDraftRow') && runtimeLoredeckAssistantReview.includes('queueSelected.dataset.sagaAssistantDraftAction'), 'Runtime Loredeck Assistant review card, batch, and row renderers must live in the extracted assistant review panel.');
assert(panel.includes("from './loredeck-assistant-review-panel.js'") && loredeckEditorComposition.includes('configureLoredeckAssistantReviewPanel({') && !panel.includes('function createLoredeckAssistantCard(pack') && !panel.includes('function createLoredeckAssistantDraftBatchCard(pack'), 'Runtime panel must delegate Loredeck Assistant review rendering to loredeck-assistant-review-panel and route its wiring through loredeck-editor-composition.');
assert(runtimePanelSource.includes('async function requestAndParseLoredeckAssistantResponse') && runtimePanelSource.includes('annotateLoredeckAssistantParseError') && runtimePanelSource.includes('warnLoredeckAssistantRequestFailure'), 'Direct Lore Assistant generation flows must share a code-aware request and parse helper.');
assert(runtimePanelSource.includes("stage: 'assistant_draft_revision'") && runtimePanelSource.includes("stage: 'assistant_draft'") && !runtimePanelSource.includes("stage: 'pack_health_repair'"), 'Lore Assistant revision and draft flows must identify their generation stage for diagnostics without the removed Pack Health assistant repair stage.');
assert(!/const responseText = await sendLoreRequest\(\s*buildLoredeckAssistantSystemPrompt\(\)/.test(runtimePanelSource) && (runtimePanelSource.match(/parseLoredeckAssistantResponse\(responseText\)/g) || []).length === 1, 'Lore Assistant generation flows must not bypass normalized request parsing.');
assert(runtimeLoredeckReviewHelpers.includes('export function configureLoredeckReviewHelpers') && runtimeLoredeckReviewHelpers.includes('export function createLoredeckPendingDiffList') && runtimeLoredeckReviewHelpers.includes('export function createLoredeckPendingRepairCandidateList') && runtimeLoredeckReviewHelpers.includes('export function appendLoredeckPendingQualityPills') && runtimeLoredeckReviewHelpers.includes('export function doesLoredeckPendingChangeAffectPackHealth') && runtimeLoredeckReviewHelpers.includes('export function normalizeLoredeckPendingRubricLevel'), 'Runtime Loredeck review diff, repair preview, quality, rubric, and health-impact helpers must live in the extracted review helper module.');
assert(panel.includes('normalizeLoredeckPendingRubricLevel,') && panel.includes('normalizeLoredeckAssistantRubricForPreview'), 'Runtime panel must import the shared rubric-level normalizer before building Assistant or Creator proposal previews.');
assert(panel.includes("from './loredeck-review-helpers.js'") && loredeckEditorComposition.includes('configureLoredeckReviewHelpers({') && !panel.includes('function createLoredeckPendingDiffList(pack') && !panel.includes('function appendLoredeckPendingQualityPills(meta') && !panel.includes('function doesLoredeckPendingChangeAffectPackHealth(change'), 'Runtime panel must delegate Loredeck review helpers to loredeck-review-helpers and route their wiring through loredeck-editor-composition.');
assert(runtimeLoredeckPendingChangeModel.includes('export function configureLoredeckPendingChangeModel') && runtimeLoredeckPendingChangeModel.includes('export function normalizeLoredeckPendingChanges') && runtimeLoredeckPendingChangeModel.includes('export function createLoredeckRecordPatchChange') && runtimeLoredeckPendingChangeModel.includes('export function applyLoredeckRecordPatch'), 'Runtime Loredeck pending-change normalization and patch application must live in the extracted pending-change model.');
assert(panel.includes("from './loredeck-pending-change-model.js'") && loredeckEditorComposition.includes('configureLoredeckPendingChangeModel({') && !panel.includes('function normalizeLoredeckPendingChanges(value') && !panel.includes('function createLoredeckRecordPatchChange(fields') && !panel.includes('function applyLoredeckRecordPatch(record'), 'Runtime panel must delegate pending-change model helpers to loredeck-pending-change-model and route their wiring through loredeck-editor-composition.');
assert(runtimeLoredeckPendingChangeActions.includes('export function configureLoredeckPendingChangeActions') && runtimeLoredeckPendingChangeActions.includes('export function queueLoredeckPendingChange') && runtimeLoredeckPendingChangeActions.includes('export async function acceptLoredeckPendingChanges') && runtimeLoredeckPendingChangeActions.includes('export async function rejectLoredeckPendingChanges') && runtimeLoredeckPendingChangeActions.includes('refreshLoredeckHealthAfterAcceptedPendingChanges'), 'Runtime Loredeck pending-change queue, accept, reject, and health refresh lifecycle must live in the extracted pending-change action module.');
assert(panel.includes("from './loredeck-pending-change-actions.js'") && loredeckEditorComposition.includes('configureLoredeckPendingChangeActions({') && !panel.includes('function queueLoredeckPendingChange(pack') && !panel.includes('async function acceptLoredeckPendingChanges(pack') && !panel.includes('function rejectLoredeckPendingChanges(pack'), 'Runtime panel must delegate pending-change actions to loredeck-pending-change-actions and route their wiring through loredeck-editor-composition.');
assert(runtimeLoredeckPendingChangeActions.includes('confirmLoredeckPendingMutationPersisted') && runtimeLoredeckPendingChangeActions.includes('flushLoredeckStorageWrites'), 'Pending Review accept/reject must wait for external Loredeck storage writes before reporting persistence.');
assert(libraryPanel.includes('function getVisibleLoredeckLibrary') && libraryPanel.includes('!isGeneratedLoredeckPack(pack)') && libraryPanel.includes('const library = getVisibleLoredeckLibrary(state);'), 'Visible Loredeck Library must hide generated Creator working packs until they are finalized as Custom decks.');
assert(loredecksTabPanel.includes('function getVisibleLoredeckLibrary') && loredecksTabPanel.includes('getLoredeckLibrary(state).filter(pack => !isGeneratedLoredeckPack(pack))') && loredecksTabPanel.includes('removeGeneratedWorkingPacksForCreatorProjects'), 'Loredecks tab launch counts must hide generated working packs and Creator deletion must remove linked hidden working packs.');
assert(!creatorPanel.includes("createButton('Inspect in Library'"), 'Deck Maker generated working packs must not expose Library inspection actions before finalization.');
assert(runtimeLoredeckEditProposals.includes('export function configureLoredeckEditProposals') && runtimeLoredeckEditProposals.includes('export function saveLoredeckEntryOverride') && runtimeLoredeckEditProposals.includes('export function queueLoredeckBulkTagUpdate') && runtimeLoredeckEditProposals.includes('export function queueLoredeckBulkContextUpdate') && runtimeLoredeckEditProposals.includes('export function queueLoredeckTagRenameProposal') && runtimeLoredeckEditProposals.includes('export function buildBulkLoredeckTagOverrideEntry') && runtimeLoredeckEditProposals.includes('export function computeLoredeckBulkTagUpdates'), 'Runtime Loredeck edit proposal queue builders must live in the extracted edit proposal module.');
assert(panel.includes("from './loredeck-edit-proposals.js'") && loredeckEditorComposition.includes('configureLoredeckEditProposals({') && !panel.includes('function saveLoredeckEntryOverride(pack') && !panel.includes('function saveLoredeckTimelineAnchorDefinition(pack') && !panel.includes('function saveLoredeckTagRegistryDefinition(pack') && !panel.includes('function buildBulkLoredeckTagOverrideEntry(pack') && !panel.includes('function computeLoredeckBulkTagUpdates(pack') && panel.includes('queueLoredeckBulkTagUpdate(pack, {') && panel.includes('queueLoredeckBulkContextUpdate(pack, { entries, contextGate })') && panel.includes('queueLoredeckTagRenameProposal(pack, {'), 'Runtime panel must delegate Loredeck edit proposal builders to loredeck-edit-proposals and route their wiring through loredeck-editor-composition.');
assert(libraryPanel.includes("from './loredeck-action-rows.js'") && libraryPanel.includes("setLoredeckActionButtonBusy(button, 'Refreshing...'"), 'Loredeck Library refresh must use the shared busy-button helper.');
assert(healthPanel.includes("setLoredeckActionButtonBusy(button, 'Refreshing...'"), 'Pack Health report refresh must use the shared busy-button helper.');
assert(loredeckWorkbenchPanel.includes("from './loredeck-action-rows.js'") && loredeckWorkbenchPanel.includes("setLoredeckActionButtonBusy(button, 'Saving...'") && loredeckWorkbenchPanel.includes("setLoredeckActionButtonBusy(button, 'Loading...'") && loredeckWorkbenchPanel.includes("setLoredeckActionButtonBusy(btn, 'Creating...'"), 'Loredeck Workbench save, create, and load flows must use the shared busy-button helper.');
assert(loredeckWorkbenchPanel.includes('withLoredeckConfirmedActionButton,') && loredeckWorkbenchPanel.includes("busyText: 'Deleting...'") && loredeckWorkbenchPanel.includes("busyText: 'Applying...'") && loredeckWorkbenchPanel.includes("busyText: 'Restoring...'") && loredeckWorkbenchPanel.includes("busyText: 'Duplicating...'"), 'Loredeck Workbench delete, bulk, restore, and duplicate confirmations must use the shared confirmed-busy helper.');
assert(libraryPanel.includes('createLoredeckActionRow({ className:') && /createLoredeckActionRow\(\{\s*className:/.test(healthPanel) && loredeckWorkbenchPanel.includes('createLoredeckActionRow({ className:'), 'Loredeck Library, Health, and Workbench primary action rows must use the shared action-row helper.');
assert(/export function createLoredeckAssistantDraftBatchCard[\s\S]*const actions = createLoredeckActionRow\(\);[\s\S]*queueSelected\.dataset\.sagaAssistantDraftAction[\s\S]*const reviseActions = createLoredeckActionRow\(\);/.test(runtimeLoredeckAssistantReview), 'Runtime Assistant draft review and revision actions must use the shared action-row helper.');
assert(/function openDuplicateLoredeckDialog[\s\S]*const actions = createLoredeckActionRow\(\);[\s\S]*Create Custom Loredeck/.test(panel), 'Runtime duplicate-as-Custom dialog must use the shared action-row helper.');
assert(/function openLoredeckEntryOverrideDialog[\s\S]*const actions = createLoredeckActionRow\(\);[\s\S]*Queue Change/.test(panel), 'Runtime entry override review handoff must use the shared action-row helper.');
assert(/function openLoredeckBulkTagsDialog[\s\S]*const actions = createLoredeckActionRow\(\);[\s\S]*Queue Tags/.test(panel) && /function openLoredeckBulkContextDialog[\s\S]*const actions = createLoredeckActionRow\(\);[\s\S]*Queue For Review/.test(panel), 'Runtime bulk tag and Context review handoffs must use the shared action-row helper.');
assert(creatorPanel.includes('export function refreshLoredeckCreatorTitleSelectionUi()'), 'Deck Maker title selection must refresh row/count/button state without rebuilding the Deck Maker workbench.');
assert(panel.includes('refreshLoredeckCreatorTitleSelectionUi') && panel.includes("button.dataset.sagaCreatorGenerationLocked = 'true';"), 'Deck Maker title selection refresh must preserve generation-locked button state.');
assert(creatorPanel.includes("approveSelected.dataset.sagaCreatorTitleAction = 'approve-selected';"), 'Deck Maker title Approve Selected button must be addressable by selection refresh.');
assert(creatorPanel.includes("row.dataset.sagaCreatorTitleId = draft.titleId || '';"), 'Deck Maker title rows must expose title ids for in-place selection state refresh.');
assert(runtimeShell.includes("'.saga-loredeck-creator-title-list'"), 'Deck Maker title list must participate in nested scroll preservation and wheel handoff.');
assert(style.includes('.saga-loredeck-creator-title-row-selected'), 'Deck Maker title selected rows must have dedicated runtime styling.');
assert(loredeckWorkbenchPanel.includes('captureLoredeckWorkbenchScrollState') && loredeckWorkbenchPanel.includes('restoreLoredeckWorkbenchScrollState'), 'Loredeck Workbench rerenders must preserve selectable table scroll.');
assert(loredeckWorkbenchPanel.includes("['.saga-loredeck-workbench-table', snapshot.table]"), 'Loredeck Workbench must restore the table scroll position after selection rerenders.');
assert(loredeckWorkbenchPanel.includes('overlay.focus?.({ preventScroll: true });'), 'Loredeck Workbench rerender focus must not scroll the overlay back to the top.');
assert(runtimePanelSource.includes('captureContextWorkbenchScrollState') && runtimePanelSource.includes('restoreContextWorkbenchScrollState'), 'Context Workbench rerenders must preserve selectable table scroll.');
assert(runtimePanelSource.includes("['.saga-context-workbench-table', overlay.querySelector('.saga-context-workbench-table')?.scrollTop || 0]"), 'Context Workbench must capture timeline table scroll before rerenders.');
assert(contextWorkbenchPanel.includes('row.dataset.sagaContextWorkbenchItemKey = key;'), 'Context Workbench timeline rows must expose stable item keys for selection refresh and diagnostics.');
assert(contextWorkbenchPanel.includes('row.dataset.sagaContextWorkbenchPackId = item.packId;'), 'Context Workbench context rows must expose stable pack ids for selection refresh and diagnostics.');
assert(runtimePanelSource.includes('overlay.focus?.({ preventScroll: true });'), 'Context Workbench rerender focus must not scroll the overlay back to the top.');
assert(style.includes('saga-context-brief-status'), 'Context Brief status row must have dedicated compact styling.');
assert(runtimePanelSource.includes("createKeyValue('Active chat', getActiveChatMetricName()"), 'Session Metrics must identify the active chat before showing counters.');
assert(harness.includes("chatName: 'Saga Smoke Harness Chat'"), 'Visual smoke harness must seed an active chat name for Session Metrics.');
assert(runtimePanelSource.includes('createContextResolutionAuditPanel'), 'Context tab must surface the latest resolver audit summary.');
assert(runtimePanelSource.includes('contextResolutionAudit'), 'Context resolver audit metadata must be persisted in runtime panel state.');
assert(runtimePanelSource.includes('createContextAutomationAuditPanel'), 'Context tab must surface the latest background automation audit summary.');
assert(runtimePanelSource.includes('contextAutomationAudit'), 'Context automation audit metadata must be persisted in runtime panel state.');
assert(runtimePanelSource.includes('Last Automation Check'), 'Context automation audit must use clear user-facing copy.');
assert(runtimePanelSource.includes('Reasoner choices remain review proposals through alpha'), 'Context automation UI must state the alpha Reasoner review-only policy.');
assert(runtimePanelSource.includes('storeContextResolutionProposalsFromResult'), 'Manual Context Reasoner results must persist reviewable proposals.');
assert(runtimePanelSource.includes("if (result?.status === 'in_flight') return getContextResolutionProposals().length;"), 'Manual duplicate in-flight Context checks must preserve existing proposals.');
assert(runtimePanelSource.includes('contextResolutionProposalMeta'), 'Manual Context proposal metadata must be stored for the review panel.');
assert(runtimePanelSource.includes("'manual_reasoner_cached'"), 'Manual Context proposal metadata must identify cached Reasoner results.');
assert(runtimePanelSource.includes('Apply Proposals'), 'Context tab must expose reviewable proposal application.');
assert(runtimePanelSource.includes('clearContextResolutionProposals();'), 'Context proposal application/dismissal must clear review state explicitly.');
assert(loreGenerator.includes('function storeContextResolutionProposals'), 'Automatic Context detection must persist resolver proposals.');
assert(loreGenerator.includes("source: 'automatic_context_detection'"), 'Automatic Context detection must record resolver audit source.');
assert(loreGenerator.includes('settings.contextReasonerFallbackEnabled === false'), 'Automatic Context detection must respect the Reasoner fallback toggle.');
assert(loreGenerator.includes('contextLocalApplyMinConfidence'), 'Automatic Context detection must pass the local confidence setting to the resolver.');
assert(loreGenerator.includes('contextReasonerProposalMinConfidence'), 'Automatic Context detection must pass the Reasoner confidence setting to the resolver.');
assert(loreGenerator.includes('context_reasoner_fallback_disabled'), 'Automatic Context detection must audit disabled Reasoner fallback skips.');
assert(loreGenerator.includes("if (result?.status === 'in_flight')"), 'Automatic duplicate in-flight Context checks must preserve proposal state.');
assert(loreGenerator.includes('state.lorePanel.contextResolutionCache = result.cacheRecord;'), 'Automatic Context detection must persist repeated-check cache records.');
assert(loreGenerator.includes("source: 'reasoner_context_resolution'"), 'Automatic Reasoner proposals must record review metadata source.');
assert(!loreGenerator.includes('applyModel: true'), 'Automatic Context detection must not auto-apply Reasoner output during alpha.');
assert(extractor.includes('recordContextAutomationAudit'), 'Context automation skips must persist a background audit record.');
assert(extractor.includes('context_manual_mode'), 'Context automation must audit Manual-mode skips.');
assert(extractor.includes('context_cadence_not_reached'), 'Context automation must audit cadence skips.');
assert(extractor.includes('context_provider_not_configured'), 'Context automation must audit missing-provider skips.');
assert(extractor.includes('context_all_loredecks_locked'), 'Context automation must audit all-locked-stack skips.');
assert(extractor.includes('context_no_loaded_loredecks'), 'Context automation must audit no-loaded-Loredeck skips.');
assert(stateManager.includes('contextBrief'), 'State manager must preserve Context Brief state.');
assert(defaultState.includes('contextAutomationAudit'), 'Default state must preserve Context automation audit state.');
assert(style.includes('saga-context-command-card'), 'Context command center must have dedicated layout styling.');
assert(style.includes('saga-context-automation-audit'), 'Context automation audit must have dedicated styling.');
assert(style.includes('saga-context-proposal-review-shell'), 'Context proposal review overlay must have dedicated shell styling.');
assert(style.includes('saga-context-proposal-review-row'), 'Context proposal review rows must have dedicated styling.');
assert(style.includes('saga-context-advanced-brief-content'), 'Advanced Context Brief content must have dedicated styling.');
assert(style.includes('saga-context-proposal-focus'), 'Context proposal review jump must have a visible focus animation.');
assert(style.includes('.saga-context-workbench-window-builder > .saga-primary-actions'), 'Context Workbench window-builder actions must use explicit grid placement.');
assert(liveSmoke.includes('SAGA_SMOKE_TARGET'), 'Live smoke helper must support targeted smoke modes.');
assert(liveSmoke.includes('REPO_LOCAL_HARNESS_TARGETS') && liveSmoke.includes("'guide-harness'"), 'Live smoke helper must support repo-local walkthrough guide smoke.');
assert(liveSmoke.includes("const MOBILE_ADVANCED_HARNESS_TARGET = 'mobile-advanced-harness'") && liveSmoke.includes('runMobileAdvancedHarnessSmoke') && liveSmoke.includes("mobile-advanced-harness-01-loredecks-root") && liveSmoke.includes("mobile-advanced-harness-08-context-proposals"), 'Live smoke helper must support a repo-local 430px Advanced mobile matrix smoke target.');
assert(
    liveSmoke.includes("const MOBILE_REDESIGN_HARNESS_TARGET = 'mobile-redesign-harness'")
        && liveSmoke.includes('runMobileRedesignHarnessSmoke')
        && liveSmoke.includes("mobile-redesign-${VIEWPORT.width}x${VIEWPORT.height}")
        && liveSmoke.includes('saga-loredeck-library-mobile-browse')
        && liveSmoke.includes('saga-loredeck-library-mobile-reorder-sheet')
        && liveSmoke.includes('saga-lorecard-workspace-list')
        && liveSmoke.includes('Pending row missing action')
        && liveSmoke.includes('wrapsAtLeastTwoLines')
        && liveSmoke.includes('Generate page did not stay focused on creation/suggestion only')
        && liveSmoke.includes('SMOKE_TARGET === MOBILE_REDESIGN_HARNESS_TARGET'),
    'Live smoke helper must support the focused mobile touch redesign harness for Library selection/reorder, unified Lore rows, Accepted title wrapping, and Generate-only coverage.'
);
assert(liveSmoke.includes("const TABLET_ADVANCED_HARNESS_TARGET = 'tablet-advanced-harness'") && liveSmoke.includes('runTabletAdvancedHarnessSmoke') && liveSmoke.includes("tablet-advanced-harness-01-loredecks-desktop-shell") && liveSmoke.includes("tablet-advanced-harness-05-context-workbench") && visualSmokeDoc.includes("SAGA_SMOKE_TARGET='tablet-advanced-harness'"), 'Live smoke helper and runbook must support a repo-local 768px Advanced tablet matrix smoke target.');
assert(liveSmoke.includes("const DESKTOP_LORECARDS_HARNESS_TARGET = 'desktop-lorecards-harness'") && liveSmoke.includes('runDesktopLorecardsHarnessSmoke') && liveSmoke.includes('.saga-desktop-lorecards-flyout-option[data-stage="lore"]'), 'Desktop Lorecards harness must select the Lore stage through the desktop Lorecards flyout before checking the workspace.');
assert(harness.includes("id: 'smoke_available_lore'") && harness.includes("title: 'Arlong tribute pattern'") && harness.includes("relevance: 'normal'"), 'Visual smoke fixture must include an accepted Normal Lorecard for rendered relevance coverage.');
assert(harness.includes("id: 'smoke_long_title_lore'") && harness.includes('Cocoyasi Village tribute truth remains hidden until the crew forces Arlong into the open'), 'Visual smoke fixture must include a long Accepted Lorecard title for rendered mobile wrapping coverage.');
assert(liveSmoke.includes('dataset?.mobileActiveTab === "context"') && liveSmoke.includes("document.querySelector('#saga-lore-panel')?.dataset?.mobileActiveTab"), 'Context harness smoke must accept mobile-shell active tab state when running phone-width rendered checks.');
assert(liveSmoke.includes("clickButtonText(client, 'Browse Context')") && !liveSmoke.includes('Next: Browse Context'), 'Context harness smoke must use direct Browse Context labels without mobile next-action fallbacks.');
assert(liveSmoke.includes('firstState.mobileShell') && liveSmoke.includes('Mobile Context harness did not render the operator Story Position summary.') && liveSmoke.includes('Context Workbench did not render a loaded Loredeck title.'), 'Context harness smoke must use mobile operator-root expectations and loaded-Loredeck workbench checks at phone widths.');
assert(liveSmoke.includes('function isExpectedRepoLocalHarnessStorageError') && liveSmoke.includes('/\\/api\\/files\\/upload/i') && liveSmoke.includes('story-opener-index') && liveSmoke.includes('isExpectedRepoLocalHarnessStorageError(error)'), 'Repo-local visual harness smokes must filter known fixture storage console noise from failure status.');
assert(liveSmoke.includes('function sagaActiveTabExpression') && liveSmoke.includes('function clickRuntimeRoute') && liveSmoke.includes("await waitFor(client, sagaActiveTabExpression('session'), 'Guide smoke Session tab active'") && liveSmoke.includes("await clickRuntimeRoute(client, 'session')"), 'Guide harness smoke must use mobile-aware active-tab checks and route clicks.');
assert(liveSmoke.includes('function openMobileSessionDetailsForGuide') && liveSmoke.includes("'Mobile Session Details guide surface'") && liveSmoke.includes('.saga-session-operator-summary .saga-operator-summary-header-tappable[aria-label="Open Session Details"]') && liveSmoke.includes('basicReturnDetailsState') && liveSmoke.includes('advancedReturnDetailsState'), 'Guide harness smoke must open the mobile Session Details subview from the tappable summary header before guide-card checks at phone widths.');
assert(liveSmoke.includes('advancedInitial.mobileShell') && liveSmoke.includes('Advanced mobile Session surface did not show the summary readiness path.') && liveSmoke.includes("document.querySelector('#saga-lore-panel.saga-runtime-mobile')"), 'Guide harness smoke must use mobile Session summary expectations at phone widths.');
assert(liveSmoke.includes("'creator-harness'") && liveSmoke.includes("SMOKE_TARGET === 'creator-harness'"), 'Live smoke helper must support the repo-local Deck Maker reset harness target.');
assert(liveSmoke.includes('openSummaryText(client, \'In-Progress Deck Maker Projects\')') && liveSmoke.includes("clickSelector(client, '.saga-loredeck-creator-project-card')"), 'Deck Maker reset smoke must open the project shelf disclosure and seeded project card instead of depending on action-button labels.');
assert(liveSmoke.includes('guide-harness-01-basic-card') && liveSmoke.includes('guide-harness-02-basic-module') && liveSmoke.includes('guide-harness-03-basic-prepared-library') && liveSmoke.includes('guide-harness-04-basic-tour'), 'Guide harness smoke must capture Basic guide card, focused module, prepared Library, and full tour screenshots.');
assert(liveSmoke.includes('guide-harness-05-advanced-card') && liveSmoke.includes('guide-harness-06-advanced-module') && liveSmoke.includes('guide-harness-07-advanced-creator-empty-project') && liveSmoke.includes('guide-harness-08-advanced-tour'), 'Guide harness smoke must capture Advanced guide card, focused module, no-object fallback, and full tour screenshots.');
assert(liveSmoke.includes('Start Basic Walkthrough') && liveSmoke.includes('Start Advanced Walkthrough'), 'Guide harness smoke must click both full walkthrough launch actions.');
assert(liveSmoke.includes('Loredecks as Source Packs') && liveSmoke.includes('Injection Overview'), 'Guide harness smoke must verify focused Basic and Advanced module start steps.');
assert(liveSmoke.includes('basicModuleLandedOnPreparedLibrary') && liveSmoke.includes("basicModuleTour.title === 'Library Layout'") && liveSmoke.includes("basicModuleTour.progress === '3 / 14'"), 'Guide harness smoke must accept the mobile-prepared Basic Library Layout landing after a module start.');
assert(liveSmoke.includes('Basic Workflow Orientation') && liveSmoke.includes('Library Layout') && liveSmoke.includes('Deck Maker Draft Review') && liveSmoke.includes('Library Overview'), 'Guide harness smoke must verify the expected Basic prepared Library, Deck Maker fallback, and full-tour steps.');
assert(liveSmoke.includes('advancedTourLandedOnPreparedLibrary') && liveSmoke.includes("advancedTour.title === 'Empty Selection State'") && liveSmoke.includes("advancedTour.progress === '3 / 169'"), 'Guide harness smoke must accept the mobile-prepared Advanced Library landing when early Library overview targets are skipped at phone width.');
assert(liveSmoke.includes('1 / 14') && liveSmoke.includes('3 / 14') && liveSmoke.includes('1 / 15') && liveSmoke.includes('11 / 19') && liveSmoke.includes('1 / 57') && liveSmoke.includes('1 / 169'), 'Guide harness smoke must verify Basic prepared, Deck Maker fallback, Basic full, Advanced module, and Advanced full walkthrough progress counts.');
assert(liveSmoke.includes('saga-loredeck-library-overlay') && liveSmoke.includes('loredecks.library.header'), 'Guide harness smoke must verify prepared fullscreen Library targeting.');
assert(runtimeGuidePrep.includes('function isLoredeckLibraryOverlayOpen') && runtimeGuidePrep.includes("document.querySelector('.saga-loredeck-library-overlay')") && runtimeGuidePrep.includes("if (!isLoredeckLibraryOverlayOpen()) dep('openLoredeckLibraryWindow')()"), 'Runtime guide prep must not reopen the Loredeck Library overlay on every Library walkthrough step.');
assert(libraryPanel.includes('function isLoredeckLibraryOverlayMounted') && libraryPanel.includes('const hasOverlay = isLoredeckLibraryOverlayMounted();') && libraryPanel.includes('renderLoredeckLibraryOverlay({ preserveScroll: hasOverlay, progressiveOpen: !hasOverlay })'), 'Loredeck Library open/detail APIs must skip the progressive Opening Library shell when the overlay is already mounted.');
assert(liveSmoke.includes('basicLibraryNextState') && liveSmoke.includes('immediateOpeningShell') && liveSmoke.includes('Basic prepared Library Next reopened the Opening Library shell'), 'Guide harness smoke must fail if Next inside the prepared mobile Library walkthrough reopens the Opening Library shell.');
assert(liveSmoke.includes('hasCreatorProjectState') && liveSmoke.includes('combinedText.includes') && liveSmoke.includes('there is no in-progress Deck Maker project to resume yet') && liveSmoke.includes('saga-loredeck-creator-workbench-overlay'), 'Guide harness smoke must verify missing-project Creator messaging or a resumable Deck Maker project state.');
assert(liveSmoke.includes('hiddenActionButtons'), 'Guide harness smoke must guard Basic against Advanced-only action buttons.');
assert(liveSmoke.includes("SMOKE_TARGET === 'context-harness'"), 'Live smoke helper must support the repo-local Context harness target.');
assert(liveSmoke.includes('context-harness-01-proposal-review'), 'Context harness smoke must capture the proposal-review screenshot.');
assert(liveSmoke.includes('context-harness-02-workbench'), 'Context harness smoke must capture the Context Workbench screenshot.');
assert(liveSmoke.includes('#saga-context-workbench'), 'Context harness smoke must verify the Context Workbench opens.');
assert(liveSmoke.includes('Applying the seeded Context proposal'), 'Context harness smoke must verify seeded proposal application.');
assert(liveSmoke.includes("SMOKE_TARGET === 'live-context'"), 'Live smoke helper must support the installed SillyTavern Context target.');
assert(liveSmoke.includes('live-context-01-context-tab'), 'Live Context smoke must capture the installed Context tab screenshot.');
assert(liveSmoke.includes('hasOldContextTooltip'), 'Live Context smoke must guard against the legacy Context tooltip returning.');
assert(liveSmoke.includes('Load a Loredeck before opening the Context Browser.'), 'Live Context smoke must accept the no-loaded-Loredeck Browser guard state.');
assert(liveSmoke.includes('No Context proposals are waiting for review.'), 'Live Context smoke must accept the empty proposal-review guard state.');
assert(liveSmoke.includes("'live-context-loaded'"), 'Live smoke helper must support the installed SillyTavern loaded-Loredeck Context target.');
assert(liveSmoke.includes('hasOldBrowseStoryWaypoints') && liveSmoke.includes('hasOldSelectFromTimeline'), 'Live loaded Context smoke must guard against retired picker labels.');
assert(liveSmoke.includes('oldWaypointRows') && liveSmoke.includes('oldWaypointTargets'), 'Live loaded Context smoke must guard against retired waypoint selectors and tour targets.');
assert(liveSmoke.includes('loadedContextScreenshotPrefix'), 'Loaded live Context smoke must use a reusable screenshot prefix.');
assert(liveSmoke.includes('-01-context-tab'), 'Loaded live Context smoke must capture the loaded Context tab screenshot.');
assert(liveSmoke.includes('-02-workbench'), 'Loaded live Context smoke must capture the Context Workbench screenshot.');
assert(liveSmoke.includes('-03-proposals'), 'Loaded live Context smoke must capture populated proposal review.');
assert(liveSmoke.includes("'live-context-loaded-narrow'"), 'Live smoke helper must support the narrow loaded-Loredeck Context target.');
assert(liveSmoke.includes('live-context-loaded-narrow'), 'Narrow loaded live Context smoke must use a separate screenshot prefix.');
assert(liveSmoke.includes("SMOKE_TARGET.endsWith('-narrow')") && liveSmoke.includes('USE_MOBILE_VIEWPORT ? 430 : 1280') && liveSmoke.includes('USE_MOBILE_VIEWPORT ? 820 : 720'), 'Narrow live Context smoke must use a compact viewport by default.');
assert(liveSmoke.includes('Ron dates the blonde girl'), 'Loaded live Context smoke must verify casual alias search through the Browser.');
assert(liveSmoke.includes('hp.y6.post_christmas_return'), 'Loaded live Context smoke must verify the lower after-bound anchor.');
assert(liveSmoke.includes('hp.y6.apparition_lessons_begin'), 'Loaded live Context smoke must verify the upper before-bound anchor.');
assert(liveSmoke.includes('restoreSagaMetadata'), 'Loaded live Context smoke must restore live SillyTavern metadata after testing.');
assert(liveSmoke.includes('live-context-reasoner'), 'Live smoke helper must support the opt-in installed Context Reasoner target.');
assert(liveSmoke.includes('SAGA_ALLOW_PROVIDER_CALLS=1'), 'Live Context Reasoner smoke must require explicit provider-call opt-in.');
assert(liveSmoke.includes('captureSagaSettings'), 'Live Context Reasoner smoke must snapshot extension settings before temporary tuning.');
assert(liveSmoke.includes('restoreSagaSettings'), 'Live Context Reasoner smoke must restore extension settings after testing.');
assert(liveSmoke.includes('live_reasoner_smoke'), 'Live Context Reasoner smoke must seed a temporary Context Brief.');
assert(liveSmoke.includes('Ask Reasoner'), 'Live Context Reasoner smoke must click the real Ask Reasoner control.');
assert(liveSmoke.includes('contextResolutionProposals'), 'Live Context Reasoner smoke must verify bounded proposals are persisted.');
assert(liveSmoke.includes('live-context-reasoner-02-proposals'), 'Live Context Reasoner smoke must capture the live provider proposal review overlay.');
assert(liveSmoke.includes("const LIVE_LORE_AUTOMATION_TARGET = 'live-lore-automation';") && liveSmoke.includes('runLiveLoreAutomationSmoke'), 'Live smoke helper must support the opt-in installed Lore Automation target.');
assert(liveSmoke.includes('SAGA_LIVE_LORE_AUTOMATION_MATRIX') && liveSmoke.includes('SAGA_LIVE_LORE_AUTOMATION_SCENARIOS') && liveSmoke.includes('Story2'), 'Live Lore Automation smoke must expose matrix/scenario controls and default to the Story2 chat fixture.');
assert(liveSmoke.includes('providerCalls') && liveSmoke.includes('expectsProviderCall') && liveSmoke.includes('Lore Automation matrix expected provider-backed rows but completed without recording any provider calls.'), 'Live Lore Automation smoke must instrument and require real provider-call evidence only for provider-backed rows.');
assert(liveSmoke.includes('ctx.saveMetadata = async () =>') && liveSmoke.includes('restoreChat();'), 'Live Lore Automation smoke must avoid persistent metadata writes by default and restore the live chat array after testing.');
assert(liveSmoke.includes('curation-gap') && liveSmoke.includes('retirement-overload') && liveSmoke.includes('applyScenarioProbe'), 'Live Lore Automation smoke must include Story2-derived probes for ARMPC add and retirement behavior.');
assert(liveSmoke.includes('computeLocalLoreRelevance') && liveSmoke.includes('forceStaleCount') && liveSmoke.includes('neutralizedForProbe'), 'Live Lore Automation retirement probe must score candidates and force in-memory stale shapes only when needed.');
assert(liveSmoke.includes('getRunTask') && liveSmoke.includes('curationOnly: true') && liveSmoke.includes('task: getRunTask(combo)'), 'Live Lore Automation matrix must support curation-only task runs.');
assert(liveSmoke.includes('curationCandidateCount') && liveSmoke.includes('curationCandidateCount > 0') && liveSmoke.includes('automationOperations'), 'Live Lore Automation reports must require provider calls only when curation candidates exist and expose filtered automation operations from full-pass runs.');
assert(liveSmoke.includes('remapPreview') && liveSmoke.includes('local remap candidates') && liveSmoke.includes('applied no prominence/mute changes'), 'Live Lore Automation reports must expose ARMP remap candidate diagnostics and quality notes.');
assert(liveSmoke.includes('did not accept any active-deck cards') && liveSmoke.includes('did not retire any stale automation-owned cards'), 'Live Lore Automation curation-only probes must hard-fail when add or retirement behavior does not happen.');
assert(liveSmoke.includes('buildLiveLoreAutomationConsoleReport') && liveSmoke.includes('reportPath') && liveSmoke.includes('compactLiveLoreAutomationDiagnostics') && liveSmoke.includes('compactLiveLoreAutomationProbe'), 'Live Lore Automation smoke must write the full report while printing a compact console summary.');
assert(autoRelevanceSource.includes('collectBalancedJsonFragments') && autoRelevanceSource.includes('seenAcceptIds') && autoRelevanceSource.includes('seenRetireIds'), 'Lore Automation model parsing must tolerate noisy JSON and dedupe curation accept/retire selections.');
assert(autoRelevanceSource.includes('getLoreAutomationStylePromptPolicy') && autoRelevanceSource.includes('Style policy:') && autoRelevanceSource.includes('stylePolicy') && autoRelevanceSource.includes('Add every clearly useful active-scene constraint'), 'ARMPC curation prompts must carry style-aware action policy to the provider.');
assert(liveSmoke.includes('collectStateSafetyStorageSmoke'), 'Live ST smoke must inspect rendered State Safety storage controls.');
assert(liveSmoke.includes('live-st-07-state-safety'), 'Live ST smoke must capture the rendered State Safety storage section.');
assert(liveSmoke.includes('Verify Storage') && liveSmoke.includes('Settle Storage Writes') && liveSmoke.includes('Clean Missing Records'), 'Live ST smoke must verify the storage integrity, write-settle, and cleanup controls.');
assert(liveSmoke.includes('advancedModeForStateSafety') && liveSmoke.includes("switchSagaExperienceMode(client, 'advanced')"), 'Live ST smoke must switch temporarily to Advanced mode before checking Advanced-only State Safety controls.');
assert(liveSmoke.includes('CDP startup handshake failed at') && liveSmoke.includes('SAGA_SMOKE_NATIVE_WS=1') && liveSmoke.includes('SAGA_SMOKE_DEBUG_FRAME=1'), 'Live smoke helper must explain startup CDP transport failures with actionable retry diagnostics.');
assert(liveSmoke.includes("const STORAGE_HARNESS_TARGET = 'storage-harness'") && liveSmoke.includes('createRepoLocalFilesApiMock'), 'Live smoke helper must provide a repo-local storage persistence target with a mocked files API.');
assert(liveSmoke.includes('/api/files/upload') && liveSmoke.includes('/api/files/verify') && liveSmoke.includes('/api/files/delete') && liveSmoke.includes('/__saga-storage-smoke'), 'Storage harness must emulate the SillyTavern files API endpoints and expose debug state.');
assert(liveSmoke.includes('runStorageHarnessSmoke') && liveSmoke.includes('upsertLoredeckLibraryPack(pack)') && liveSmoke.includes('openLoredeckLibraryDetails(packId)'), 'Storage harness must exercise the runtime Loredeck Library import path and visible Library delete path.');
assert(liveSmoke.includes('hydrateSagaLorepackLibraryStorage({ force: true })') && liveSmoke.includes('loadLoredeckSourceById(packId, { registry })'), 'Storage harness must verify reload hydration and loader access through external payload files.');
assert(liveSmoke.includes("openLoredeckHealthCenter(packId, { tab: 'overview' })") && liveSmoke.includes('Refresh Scan') && liveSmoke.includes('healthScanState'), 'Storage harness must open Pack Health Center and run Refresh Scan against the external Loredeck after reload.');
assert(liveSmoke.includes('Storage harness Pack Health scan wrote Lorecard payload content into settings') && liveSmoke.includes('payloadHealthStatus'), 'Storage harness Pack Health scan must verify health writes stay external and settings stay compact.');
assert(liveSmoke.includes('getVisibleDeleteButton') && liveSmoke.includes('.saga-loredeck-library-square-action-label') && liveSmoke.includes('saga-confirm-overlay') && liveSmoke.includes("=== 'Confirm'"), 'Storage harness must delete the imported external Loredeck through the visible Library delete UI and Saga confirmation dialog.');
assert(liveSmoke.includes('isExpectedStorageHarness404') && liveSmoke.includes('STORAGE_HARNESS_TARGET') && liveSmoke.includes('/\\/user\\/files\\/saga-'), 'Storage harness must ignore only expected Saga-managed missing-file 404 probes.');
assert(liveSmoke.includes('importExternalThemePack') && liveSmoke.includes('Forget Theme Pack') && liveSmoke.includes('themePayloadReadStatusAfterForget'), 'Storage harness must import Theme Pack payloads, activate them, and remove them through the visible Settings forget flow.');
assert(liveSmoke.includes('importExternalIconSet') && liveSmoke.includes('Forget Icon Set') && liveSmoke.includes('iconAssetReadStatusAfterForget'), 'Storage harness must import Icon Set payloads/assets, activate them, and remove them through the visible Settings forget flow.');
assert(liveSmoke.includes("themePackId = 'storage-smoke-theme'") && liveSmoke.includes("settings.themePackId === 'storage-smoke-theme'") && liveSmoke.includes("settings.themePackId !== 'storage-smoke-theme'"), 'Storage harness must save and verify the active custom Theme Pack choice before visible forget resets it.');
assert(liveSmoke.includes("themeIconSetId = 'storage-smoke-icons'") && liveSmoke.includes("settings.themeIconSetId === 'storage-smoke-icons'") && liveSmoke.includes("settings.themeIconSetId !== 'storage-smoke-icons'"), 'Storage harness must save and verify the active custom Icon Set choice before visible forget resets it.');
assert(liveSmoke.includes('settingsHasPayload') && liveSmoke.includes('Storage harness wrote full Saga payload content into extension settings'), 'Storage harness must fail if imported Loredeck, Theme Pack, or Icon Set payload content lands in settings.');
assert(harness.includes('__sagaSmokeStoragePersistence') && harness.includes('hydrateSagaThemeIconStorage({ force: true })') && harness.includes('hydrateSagaLorepackLibraryStorage({ force: true })') && harness.includes('__sagaSmokeSettings') && harness.includes('saveSettingsDebounced()') && harness.includes('persistedSettings.themePackId'), 'Repo-local visual smoke harness must persist compact settings only for storage smoke reload checks and hydrate external stores before rendering.');
assert(creatorGenerationSettings.includes('LOREDECK_CREATOR_ENTRY_BATCH_SIZE = 3')
    && panel.includes("from '../loredecks/loredeck-creator-generation-settings.js'")
    && panel.includes("from '../loredecks/loredeck-creator-generation-settings-controller.js'")
    && panel.includes("from '../loredecks/loredeck-creator-generation-settings-panel.js'")
    && creatorGenerationSettingsController.includes('createLoredeckCreatorGenerationSettingsController')
    && creatorGenerationSettingsController.includes('hasPersistableLoredeckCreatorProject')
    && creatorGenerationSettingsController.includes('setLocalGenerationSettings')
    && !panel.includes('const LOREDECK_CREATOR_GENERATION_SETTING_DEFAULTS'),
    'Deck Maker generation settings must be owned by the Creator settings module and keep the default micro-batch size small.');
assert(runtimePanelSource.includes('Draft Lorecards'), 'Deck Maker entry drafting must expose a guided one-batch action.');
assert(creatorPanel.includes('Draft More Lorecards'), 'Creator current task must keep Lorecard generation primary while review drafts exist and more Lorecards remain.');
assert(creatorPanel.includes("createButton('Auto-Draft All'"), 'Deck Maker entry drafting must expose a full remaining-count auto-draft action.');
assert(creatorPanel.includes("'Auto-Draft All Lorecards?'") && creatorPanel.includes('auto-generate ${remainingCount} Lorecard'), 'Creator Auto-Draft All must confirm the exact Lorecard count before repeated generation.');
assert(creatorPanel.includes('confirmLabel: `Auto-Draft ${remainingCount} Lorecard'), 'Creator Auto-Draft All confirmation must name the destructive bulk action on the confirm button.');
assert(runtimePanelSource.includes('Current Lorecard drafts can stay here while you draft more batches.'), 'Deck Maker entry drafting must allow additional generation while review drafts are open.');
assert(runtimePanelSource.includes('refreshLoredeckAssistantDraftSurfaces') && runtimePanelSource.includes('refreshLoredeckCreatorWorkbenchBody({ preserveScroll: true });'), 'Deck Maker draft review handoff must refresh the workbench overlay after queueing or dropping drafts.');
assert(creatorPanel.includes('model.acceptedCount') && creatorPanel.includes('model.draftReviewCount') && creatorPanel.includes('canDraftEntries && activeBatchId'), 'Deck Maker category rows must show specific covered counts and only mark Next when drafting is enabled.');
const creatorDraftReviewRenderIndex = creatorPanel.indexOf('const draftBatch = createLoredeckCreatorDraftReviewSection(generatedPack);');
const creatorPlanningReadyBlockIndex = creatorPanel.indexOf('if (!planning.ready)');
assert(creatorDraftReviewRenderIndex !== -1 && creatorPlanningReadyBlockIndex !== -1 && creatorDraftReviewRenderIndex < creatorPlanningReadyBlockIndex, 'Deck Maker draft review must render saved drafts before planning-ready drafting blockers.');
assert(panel.includes("from './loredeck-assistant-draft-handoff.js'")
    && runtimeLoredeckAssistantDraftHandoff.includes('createLoredeckAssistantDraftHandoffController')
    && runtimeLoredeckAssistantDraftHandoff.includes('fresh = typeof deps.hydratePayload')
    && runtimeLoredeckAssistantDraftHandoff.includes('queuePendingChanges')
    && panel.includes('loredeckAssistantDraftHandoffController.queueDraftSelection')
    && panel.includes('loredeckAssistantDraftHandoffController.dropDraftSelection'),
    'Deck Maker draft review handoff must be owned by the draft handoff controller and hydrate compact external Loredeck payloads before queueing Pending Review changes.');
assert(panel.includes("from './loredeck-assistant-draft-cache.js'")
    && runtimeLoredeckAssistantDraftCache.includes('createLoredeckAssistantDraftCacheController')
    && runtimeLoredeckAssistantDraftCache.includes('setDraftSelectionBulk')
    && !panel.includes('const loredeckAssistantDraftCache = new Map()')
    && panel.includes('loredeckAssistantDraftCacheController.updateRecord')
    && panel.includes('loredeckAssistantDraftCacheController.deleteRecord'),
    'Loredeck assistant draft-review cache records and selection mutation must be owned by the draft cache controller instead of a runtime-owned Map.');
assert(panel.includes("from './loredeck-preview-cache.js'")
    && runtimeLoredeckPreviewCache.includes('createLoredeckPreviewCacheController')
    && runtimeLoredeckPreviewCache.includes('clearPackCaches')
    && !panel.includes('const loredeckManifestPreviewCache = new Map()')
    && !panel.includes('const loredeckEntryPreviewCache = new Map()')
    && runtimePanelSource.includes('previewCache.getManifestPreview')
    && panel.includes('loredeckPreviewCacheController.clearPackCaches'),
    'Loredeck preview, entry, tag, and timeline cache records must be owned by the preview cache controller instead of runtime-owned Maps.');
assert(runtimePanelSource.includes('await queueLoredeckAssistantDraftSelection(pack, new Set(changes.map(change => change.changeId)))'), 'Deck Maker draft review queue-all action must await the async hydrated handoff.');
assert(runtimePanelSource.includes('confirmLoredeckAssistantDraftStorage') && runtimePanelSource.includes('flushSagaCreatorProjectStorageWrites'), 'Deck Maker draft review send/drop must wait for external project and pack writes before refreshing.');
assert(panel.includes("from '../loredecks/loredeck-creator-generated-pack-cache.js'")
    && creatorGeneratedPackCache.includes('createLoredeckCreatorGeneratedPackCacheController')
    && creatorGeneratedPackCache.includes('hydrateCachedPayload(base || { packId: id })')
    && creatorGeneratedPackCache.includes('maybeHydrateGeneratedPack')
    && runtimePanelSource.includes('loredeckCreatorGeneratedPackCacheController.getGeneratedPackDefinition(packId)')
    && runtimePanelSource.includes('loredeckCreatorGeneratedPackCacheController.maybeHydrateGeneratedPack(cached, options)'),
    'Deck Maker workbench must hydrate external Generated Loredeck payloads through the Creator generated-pack cache controller before computing Lorecard progress.');
assert(panel.includes("from '../loredecks/loredeck-creator-workbench-cache.js'")
    && creatorWorkbenchCache.includes('createLoredeckCreatorWorkbenchCacheController')
    && creatorWorkbenchCache.includes('clearCurrentCacheForRemovedJobs')
    && !panel.includes('const loredeckCreatorBriefCache = new Map()')
    && panel.includes('loredeckCreatorWorkbenchCacheController.clearCurrentCacheForRemovedJobs'),
    'Deck Maker current-job workbench cache must be owned by the Creator workbench cache controller instead of a runtime-owned Map.');
assert(runtimePanelSource.includes('getLoredeckDefinition: getLoredeckCreatorGeneratedPackDefinition') && runtimePanelSource.includes('getFreshLoredeckLibraryPack: (packId, fallback = null) => getLoredeckCreatorGeneratedPackDefinition(packId)'), 'Creator panel dependencies must use hydrated Generated Loredeck payloads for category remaining counts.');
assert(panel.includes('getExternalLoredeckLibraryRegistry()?.packs?.[id]') && /function getFreshLoredeckLibraryPack\(packId, fallback = null\) \{[\s\S]*hydrateCachedExternalLorepackPayloadRecord\(fresh\)[\s\S]*isCompactExternalLorepackPayloadRecord\(hydratedFresh\)[\s\S]*hydrateCachedExternalLorepackPayloadRecord\(fallback\)/.test(panel), 'Runtime fresh Loredeck reads must keep hydrated external fallback payloads instead of replacing them with compact library records before saving Pending Review rows.');
assert(runtimePanelSource.includes('Deck Maker Lorecard Draft Review'), 'Deck Maker draft review must use Creator-specific review language.');
assert(runtimePanelSource.includes('repairWarnings') && read(sourcePath('runtime', 'loredeck-assistant-review-panel.js')).includes('Deck Maker repair note'), 'Deck Maker draft review must surface deterministic repair warnings from Lorecard guard cleanup.');
assert(runtimePanelSource.includes('preflightWarnings') && read(sourcePath('runtime', 'loredeck-assistant-review-panel.js')).includes('Deck Maker preflight note'), 'Deck Maker draft review must surface title preflight omissions before Pending Review.');
assert(runtimePanelSource.includes('Send Selected to Review'), 'Deck Maker draft review must expose explicit Pending Review handoff language.');
assert(runtimePanelSource.includes('getLoredeckCreatorPipelineModel'), 'Deck Maker wizard must derive a checkpointed production pipeline model.');
assert(style.includes('saga-loredeck-creator-stage-guide'), 'Deck Maker roadmap must have dedicated styling.');
assert(creatorPanel.includes('getLoredeckCreatorResetAvailability') && creatorPanel.includes("className = 'saga-loredeck-creator-stage-reset'") && creatorPanel.includes('Reset to this step'), 'Deck Maker roadmap must expose the reset-to-step affordance with reset-specific tooltip copy.');
assert(creatorPanel.includes("const item = document.createElement('div')") && creatorPanel.includes("const main = document.createElement('button')"), 'Deck Maker roadmap reset controls must not be nested inside the main stage navigation button.');
assert(panel.includes("from '../loredecks/loredeck-creator-reset-controller.js'") && runtimePanelSource.includes('handleLoredeckCreatorResetToStep'), 'Deck Maker reset controls must be wired through the extracted reset controller.');
assert(creatorResetController.includes('resetLoredeckCreatorJobAfterStep') && creatorResetController.includes('resetGeneratedLoredeckPackAfterStep'), 'Deck Maker reset controller must use the shared reset rules.');
assert(creatorResetController.includes('removeLibraryPack(creatorPack.packId, { clearCreatorProjects: false })'), 'Deck Maker reset before Context Plan must remove the generated shell without deleting the active Deck Maker project.');
assert(creatorResetController.includes('} else if (packId) {') && creatorResetController.includes('clearPackCaches(packId'), 'Deck Maker reset must clear stale generated-pack caches even when the pack record is already missing.');
assert(creatorResetController.includes('await hydratePayload(creatorPack)'), 'Deck Maker reset must hydrate compact external Generated Loredeck payloads before saving pack rollback changes.');
assert(runtimeUiKit.includes('options.confirmLabel') && creatorResetController.includes('confirmLabel: `Reset to ${label}`'), 'Deck Maker reset confirmation must name the destructive reset action on the confirm button.');
assert(runtimeUiKit.includes('saga-runtime-button-spinner') && runtimeUiKit.includes('await action({ setText })') && runtimeUiKit.includes("btn.setAttribute('aria-busy', 'true')"), 'Runtime busy buttons must support spinner-backed live text updates.');
assert(runtimeUiKit.includes("overlay.addEventListener('pointerdown'") && runtimeUiKit.includes('startedOnBackdrop = event.target === overlay') && runtimeUiKit.includes('if (sawPointerDown && !startedOnBackdrop)') && runtimeUiKit.includes('wireOverlayBackdropClose(overlay, () => finish(null))'), 'Saga dialogs must not treat an input-selection drag that ends on the backdrop as a dismiss click.');
assert(/\.saga-confirm-shell \.saga-confirm-input\.text_pole\s*\{[\s\S]*?background:\s*var\(--saga-input[\s\S]*?color:\s*var\(--saga-text[\s\S]*?caret-color:\s*var\(--saga-text[\s\S]*?user-select:\s*text;/.test(style) && /\.saga-confirm-shell \.saga-confirm-input\.text_pole:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--saga-focus/.test(style), 'Saga input dialogs must style modal text fields outside the .saga-lore-panel scope.');
assert(style.includes('.saga-runtime-button-spinner') && style.includes('animation: saga-generation-spin 0.9s linear infinite'), 'Runtime busy buttons must render the shared generation spinner animation.');
assert(style.includes('saga-loredeck-creator-stage-reset') && style.includes('saga-loredeck-creator-stage-resettable'), 'Deck Maker reset buttons must have dedicated roadmap styling.');
assert(harness.includes("jobId: 'smoke-creator-project'") && harness.includes("brief: {") && harness.includes("outline: {") && harness.includes("currentStage: 'entries_drafted'"), 'Visual smoke harness must seed a normalized in-progress Deck Maker project for reset controls.');
assert(liveSmoke.includes('creator-harness-01-reset-controls') && liveSmoke.includes('creator-harness-02-reset-confirm') && liveSmoke.includes('Reset to Title Pass?'), 'Deck Maker reset smoke must capture reset controls and destructive confirmation copy.');
assert(liveSmoke.includes('heartbeatScrollState') && liveSmoke.includes('refreshLoredeckCreatorGenerationStatusUi') && liveSmoke.includes('sagaHeartbeatScrollProbe') && liveSmoke.includes('coverage-plan'), 'Creator harness smoke must verify active-generation heartbeat updates do not move the Adaptive Coverage scroll position.');
assert(runtimePanelSource.includes('getLoredeckCreatorWorkbenchScrollAnchor'), 'Deck Maker workbench must preserve section anchors during rerenders.');
assert(runtimePanelSource.includes('restoreLoredeckCreatorWorkbenchScrollAnchor'), 'Deck Maker workbench must restore section anchors after rerenders.');
assert(runtimePanelSource.includes("wrap.dataset.sagaCreatorAnchor = 'lorecards'"), 'Deck Maker Lorecard stage must expose a stable scroll anchor.');
assert(runtimePanelSource.includes("wrap.dataset.sagaCreatorAnchor = 'finalize'"), 'Creator readiness stage must expose a stable scroll anchor.');
assert(runtimePanelSource.includes("panel.dataset.sagaCreatorAnchor = 'review-status'"), 'Creator sidebar review status must not steal the actionable Pending Review anchor.');
assert(runtimePanelSource.includes('createLoredeckCreatorPendingReviewCard'), 'Deck Maker wizard must render an actionable Pending Review card after planning proposals are queued.');
assert(runtimePanelSource.includes('Review Context and Tags'), 'Creator Context stage must guide users to review queued Context and Tag proposals.');
assert(runtimePanelSource.includes('openLoredeckLibraryDetails'), 'Creator deck inspection buttons must open the visible Loredeck Library details window.');
assert(runtimePanelSource.includes("card.dataset.sagaCreatorAnchor = 'review-queue'"), 'Creator Pending Review card must expose a direct review-queue anchor.');
assert(runtimePanelSource.includes('No pending review queue is available yet.'), 'Deck Maker review-queue jump must report when no queue is rendered.');
assert(runtimePanelSource.includes('saga-loredeck-creator-done-button'), 'Creator Context rows must show planned sets as compact Done controls.');
assert(style.includes('saga-loredeck-creator-done-button'), 'Creator Context Done controls must have a dedicated success style.');
assert(!runtimePanelSource.includes("appendLoredeckCreatorGenerationStatus(main, cached, ['planning_batch_draft'], { batchId: batch.id, compact: true });"), 'Creator Context rows must not render duplicate compact success bars.');
assert(!runtimePanelSource.includes("appendLoredeckCreatorGenerationStatus(wrap, cached, ['planning_batch_draft']);"), 'Creator Context card must not render a duplicate bottom success bar.');
assert(assistant.includes('currentMicroBatchOnly'), 'Deck Maker entry prompt context must mark entry drafting as a micro-batch.');
assert(assistant.includes('coverageSummary'), 'Deck Maker brief prompt must use the compact scope-brief coverage summary field.');
assert(assistant.includes('timeline plans, tag plans, title-pass plans'), 'Deck Maker brief prompt must prohibit first-pass generation plans.');
assert(assistant.includes('compactCreatorBriefForPrompt'), 'Deck Maker brief revisions must compact older saved briefs before prompting.');
assert(assistant.includes('buildLoredeckCreatorOutlineSystemPrompt'), 'Creator must expose a dedicated outline-stage prompt.');
assert(assistant.includes('parseLoredeckCreatorOutlineResponse'), 'Creator must parse outline-stage responses.');
assert(assistant.includes('Context milestones'), 'Creator outline prompt must ask for major Context browser points.');
assert(assistant.includes('targetTitleBatch'), 'Deck Maker title prompt must target one outline title batch per call.');
assert(assistant.includes('currentTitleBatchOnly'), 'Deck Maker title prompt must prohibit drifting into other title batches.');
assert(assistant.includes('targetPlanningBatch'), 'Deck Maker planning prompt must target one approved title batch per call.');
assert(assistant.includes('currentPlanningBatchOnly'), 'Deck Maker planning prompt must prohibit drifting into other planning batches.');
assert(assistant.includes('acceptedPlanningBatchIds'), 'Deck Maker entry prompt must receive accepted planning batch IDs.');
assert(runtimePanelSource.includes('buildLoredeckCreatorPlanningGenerationUnitId'), 'Deck Maker planning must use stable unit IDs for one planning batch per provider call.');
assert(runtimePanelSource.includes('commitLoredeckCreatorPlanningResult'), 'Deck Maker planning must commit through an idempotent Pending Review helper.');
assert(runtimePanelSource.includes('upsertLoredeckCreatorPlanningPendingChanges'), 'Deck Maker planning must replace same-batch Pending Review proposals instead of appending duplicates.');
assert(runtimePanelSource.includes('creator_planning_batch:'), 'Deck Maker planning unit IDs must be namespaced for runner checkpoints.');
assert(runtimePanelSource.includes('buildLoredeckCreatorEntryGenerationUnitId'), 'Deck Maker Lorecard drafting must use stable micro-batch unit IDs.');
assert(runtimePanelSource.includes('commitLoredeckCreatorEntryDraftResult'), 'Deck Maker Lorecard drafting must commit through an idempotent draft-review helper.');
assert(runtimePanelSource.includes('upsertLoredeckCreatorEntryDraftChanges'), 'Deck Maker Lorecard drafting must replace same-unit draft-review records instead of appending duplicates.');
assert(runtimePanelSource.includes('creator_entry_micro_batch:'), 'Deck Maker Lorecard unit IDs must be namespaced for runner checkpoints.');
assert(runtimePanelSource.includes('entry_micro_batch'), 'Deck Maker Lorecard drafting must run through the generation runner as entry micro-batches.');
assert(!runtimePanelSource.includes('draft-review items exist'), 'Deck Maker Lorecard auto-draft must not stop solely because draft-review items exist.');
assert(creatorGenerationState.includes('loredeckCreatorGenerationControllers.has(id)')
    && creatorGenerationProgress.includes('hasLoredeckCreatorGenerationController(generation.id)')
    && panel.includes('createLoredeckCreatorGenerationProgressController'),
    'Deck Maker generation recovery must keep controller-backed runs current even when storage recovery clears activeGeneration.');
assert(creatorGenerationSession.includes('export function createLoredeckCreatorGenerationSessionController')
    && creatorGenerationSession.includes('startGeneration(actionId')
    && creatorGenerationSession.includes('finishGeneration(generation')
    && creatorGenerationSession.includes('cancelGeneration(generationId')
    && panel.includes('createLoredeckCreatorGenerationSessionController'),
    'Deck Maker generation start, finish, and cancel orchestration must be owned by the Creator session module.');
assert(creatorGenerationController.includes('export function createLoredeckCreatorGenerationController')
    && creatorGenerationController.includes('function createRequestOptions(generation')
    && creatorGenerationController.includes('async function runSingleUnitGeneration(config')
    && panel.includes('createLoredeckCreatorGenerationController'),
    'Deck Maker request options and single-unit runner composition must be owned by the Creator generation controller module.');
assert(runtimePanelSource.includes('createLoredeckCreatorAdvancedGenerationSettings'), 'Deck Maker wizard must expose a collapsed Advanced Generation Settings panel.');
assert(runtimePanelSource.includes('getLoredeckCreatorGenerationSettings'), 'Deck Maker generation must read normalized per-project generation settings.');
assert(runtimePanelSource.includes('setLoredeckCreatorGenerationSettings'), 'Deck Maker generation settings must persist per project.');
assert(runtimePanelSource.includes('showStreamingProgress'), 'Deck Maker generation settings must control streaming progress snippets.');
assert(creatorGenerationSettings.includes('resolveLoredeckCreatorSplitRetryProvider')
    && creatorGenerationSettings.includes('useUtilityProviderForSplitRetries')
    && creatorGenerationSettings.includes("providerKind: 'continuity'")
    && creatorGenerationSettings.includes("fallbackMessage: validation.message || 'Utility Provider is not configured for split retries.'")
    && creatorGenerationSettingsController.includes('resolveLoredeckCreatorSplitRetryProvider(settings, providerKind => validateProvider(providerKind))')
    && panel.includes('validateProvider: providerKind => validateLoreProviderConfiguration(providerKind)')
    && runtimePanelSource.includes("providerKind: retryProvider.providerKind"),
    'Creator split retries must support an opt-in Utility Provider path with Reasoning fallback.');
assert(runtimePanelSource.includes('options.bypassRunLimit === true') && creatorPanel.includes('bypassRunLimit: true'), 'Creator Auto-Draft All must bypass the old run cap after confirming the full remaining count.');
assert(runtimePanelSource.includes('updateLoredeckCreatorEntryDraftBusyProgress') && runtimePanelSource.includes('getLoredeckCreatorEntryDraftProgressForOptions') && runtimePanelSource.includes('busy.setText(`${prefix} | ${remainingCount} remain`)'), 'Deck Maker Lorecard drafting must update the active button with fresh remaining-count progress.');
assert(runtimePanelSource.includes('updateLoredeckCreatorTitleRunBusyProgress') && runtimePanelSource.includes('title set${remaining === 1 ?') && runtimePanelSource.includes('options.onProgress?.({'), 'Deck Maker Title Pass Generate Remaining must update the active button with live title-set progress.');
assert(creatorGenerationRunner.includes("if (config.waitForUiPaint !== false && typeof deps.waitForUiPaint === 'function')")
    && creatorGenerationController.includes('waitForUiPaint,')
    && panel.includes('waitForUiPaint: () => waitForLoredeckCreatorUiPaint()'),
    'Deck Maker generation requests must yield a UI paint before long provider calls.');
assert(creatorPanel.includes('loredeckCreatorGenerationCoverageMatches') && creatorPanel.includes('coverageDimensionIds: batch.coverageDimensionIds') && runtimePanelSource.includes('coverageDimensionIds: targetCoverageDimensionIds'), 'Deck Maker generation rows must match active title/planning work by batch id or coverage dimension.');
assert(creatorPanel.includes("['planning_batch_draft']") && creatorPanel.includes("['entry_batch_draft', 'entry_multi_batch_draft']"), 'Deck Maker planning and Lorecard category rows must render compact live generation status from top-level generation actions.');
assert(/\.saga-loredeck-creator-generation-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*300px\),\s*1fr\)\)/.test(style)
    && /\.saga-loredeck-creator-generation-row input\[type="range"\]\s*\{[\s\S]*width:\s*calc\(100% - 14px\);[\s\S]*max-width:\s*calc\(100% - 14px\);[\s\S]*margin-inline:\s*7px;[\s\S]*justify-self:\s*center;/.test(style),
    'Creator advanced generation sliders must reserve range thumb space inside their setting cards.');
assert(runtimePanelSource.includes('forceVisibleOutput'), 'Deck Maker generation requests must ask reasoning profiles for visible final output on the first call.');
assert(llm.includes('prepareLoreRequestPrompts'), 'Lore LLM client must prepare first-pass visible-output prompts when requested.');
assert(llm.includes('options.forceVisibleOutput === true'), 'Lore LLM client must expose an explicit visible-output opt-in.');
assert(llm.includes('createLoreResponseError') && llm.includes('LORE_RESPONSE_ERROR_CODES.TOKEN_LIMIT') && llm.includes('LORE_RESPONSE_ERROR_CODES.REASONING_ONLY') && llm.includes('LORE_RESPONSE_ERROR_CODES.EMPTY_CONTENT'), 'Lore LLM client must throw shared typed provider response errors for token-limit, reasoning-only, and empty-content failures.');
assert(runtimePanelSource.includes('titleRunRemainingLimit'), 'Deck Maker title Generate Remaining must use a configurable run limit.');
assert(creatorPanel.includes('const callCount = Math.max(0, Number(freshProgress?.batchCount) || 0);'), 'Creator Auto-Draft All must derive its run count from remaining Lorecard batches.');
assert(runtimePanelSource.includes('retryAttempts: Number.isFinite(Number(config.retryAttempts))'), 'Creator runner calls must support configured retry attempts.');
assert(stateSource.includes('generationSettings'), 'Deck Maker project persistence must preserve generation settings.');
assert(runtimePanelSource.includes('unitMeta'), 'Deck Maker generation units must persist compact retry metadata.');
assert(runtimePanelSource.includes('getLoredeckCreatorLatestRecoverableUnit'), 'Creator recovery must locate the latest failed or interrupted unit.');
assert(runtimePanelSource.includes('retryLoredeckCreatorRecoverableUnit'), 'Creator recovery must retry failed generation units.');
assert(runtimePanelSource.includes('markLoredeckCreatorRecoveryUnitSuperseded'), 'Creator Retry Smaller must supersede the previous failed unit after creating a replacement.');
assert(runtimePanelSource.includes('buildLoredeckCreatorRetryUnitId'), 'Creator Retry Smaller must create a distinct replacement unit ID.');
assert(runtimePanelSource.includes('Retry Failed'), 'Creator current task controls must expose Retry Failed.');
assert(runtimePanelSource.includes('Retry Smaller'), 'Creator current task controls must expose Retry Smaller.');
assert(runtimePanelSource.includes('Cancel Generation'), 'Creator current task controls must expose Cancel while a generation is active.');
assert(creatorPanel.includes('createLoredeckCreatorDiagnosticBlock') && creatorPanel.includes('Failure Diagnostic') && creatorPanel.includes('buildLoredeckCreatorDiagnosticCopyPayload') && creatorPanel.includes('globalThis.navigator.clipboard.writeText(JSON.stringify(payload, null, 2))'), 'Creator Job panel must expose a copyable compact sanitized failure diagnostic.');
assert(style.includes('saga-loredeck-creator-diagnostic') && style.includes('saga-loredeck-creator-diagnostic-sample'), 'Deck Maker failure diagnostics must have dedicated compact sidebar styling.');
assert(runtimePanelSource.includes('formatLoredeckCreatorGenerationFailureMessage') && runtimePanelSource.includes('provider_reasoning_only') && runtimePanelSource.includes('json_invalid') && runtimePanelSource.includes('commit_failed'), 'Deck Maker generation failures must map stable provider/parser/commit codes to user-facing messages.');
assert(creatorGenerationRunner.includes('warnFailure(error, { stage, unitId, unitLabel })')
    && creatorGenerationController.includes('warnFailure,')
    && panel.includes('warnFailure: (error, context) => warnLoredeckCreatorGenerationFailure(error, context)'),
    'Deck Maker generation failures must log stage, unit, and error code diagnostics without raw provider payloads.');
assert(runtimePanelSource.includes("prepareLoredeckCreatorStageFailure(e, 'Context and Tag Planning generation failed.', 'Context and Tag Planning')"), 'Deck Maker Context and Tag Planning failures must use code-aware stage messages.');
assert(runtimePanelSource.includes("prepareLoredeckCreatorStageFailure(e, 'Lorecard entry drafting failed.', 'Lorecard Drafting')"), 'Deck Maker Lorecard drafting failures must use code-aware stage messages.');
assert(runtimePanelSource.includes('titlePassLimitOverride'), 'Creator Retry Smaller must reduce Title Pass batch size.');
assert(runtimePanelSource.includes('planningProposalLimitOverride'), 'Creator Retry Smaller must reduce Context/Tag planning proposal size.');
assert(runtimePanelSource.includes('targetTitleIds'), 'Deck Maker Lorecard retries must preserve target title IDs.');
assert(runtimePanelSource.includes('retryAttemptedTargetIds') && runtimePanelSource.includes('retryExhaustedTargetIds') && runtimePanelSource.includes('excludedTargetTitleIds'), 'Deck Maker Lorecard rejected-target retries must track attempted/exhausted titles and exclude exhausted targets from later auto-draft batches.');
assert(runtimePanelSource.includes('one-title recovery failed') && runtimePanelSource.includes('Last Lorecard rejection details'), 'Deck Maker Lorecard retry exhaustion must surface a clear warning that points to rejection details.');
assert(runtimePanelSource.includes('getLoredeckCreatorPipelineReadiness'), 'Generated Loredeck export must inspect staged Deck Maker pipeline readiness.');
assert(runtimePanelSource.includes('Deck Maker Readiness Gate'), 'Deck Maker wizard must expose deterministic readiness feedback.');
assert(runtimePanelSource.includes('titles covered'), 'Generated export readiness must show approved-title coverage.');
assert(runtimePanelSource.includes('No linked Deck Maker job was found'), 'Generated export readiness must warn when Deck Maker job metadata is missing.');
assert(runtimePanelSource.includes('const pendingChangeIds = getLoredeckPendingChangeIds(pending)') && runtimePanelSource.includes('acceptLoredeckPendingChanges(pack, pendingChangeIds)') && runtimePanelSource.includes('rejectLoredeckPendingChanges(pack, pendingChangeIds)'), 'Loredeck Pending Review bulk actions must pass explicit pending change IDs.');
assert(runtimePanelSource.includes('getAcceptableLoredeckPendingChanges') && runtimePanelSource.includes('reportLoredeckPendingAcceptFailures'), 'Loredeck pending acceptance must isolate bad payloads so one invalid change cannot block a bulk accept.');
assert(runtimePanelSource.includes('const freshPack = getFreshLoredeckLibraryPack(pack?.packId, pack);'), 'Loredeck pending acceptance must re-read the freshest pack before applying changes.');
assert(runtimePanelSource.includes('else next.pendingChanges = [];'), 'Loredeck pending acceptance must pass an explicit empty pendingChanges field through persistence.');
assert(runtimePanelSource.includes('refreshOpenLoredeckMetadataEditor(next.packId)'), 'Loredeck pending mutations must refresh an already-open metadata editor instead of leaving stale Pending Review counts.');
assert(runtimePanelSource.includes("console.warn('[Saga] Loredeck save succeeded, but surface refresh failed:'") && runtimePanelSource.includes('throwOnFailure: options.throwOnFailure === true'), 'Loredeck pending mutation commits must distinguish actual save failures from post-save surface refresh failures.');
assert(runtimePanelSource.includes("console.warn('[Saga] Deck Maker planning proposals were queued, but job cache refresh failed:'") && runtimePanelSource.includes("error.code = 'creator_planning_queue_empty'") && runtimePanelSource.includes("error.code = 'loredeck_queue_failed'"), 'Deck Maker planning commits must not turn queued proposals into generic commit failures when post-queue cache refresh or normalization fails.');
assert(runtimePanelSource.includes('input.description || input.notes') && runtimePanelSource.includes('raw.sortKeyFrom ?? raw.fromSortKey ?? raw.sortKeyStart'), 'Deck Maker planning normalization must preserve model tag notes and timeline-window sortKeyStart/sortKeyEnd aliases.');
assert(runtimePanelSource.includes("generated_shell_without_entries"), 'Generated Loredeck planning accepts must skip health rerun while the shell has no Accepted Lorecards.');
assert(!runtimePanelSource.includes('no valid manifest or accepted embedded data yet'), 'Generated Loredeck planning accepts must not warn about missing embedded data after each proposal.');
assert(stateSource.includes('clearableOptionalFields'), 'Loredeck library upsert must track optional fields that were intentionally supplied.');
assert(stateSource.includes('delete nextPack[key]'), 'Loredeck library upsert must clear optional fields that normalize to empty.');
assert(runtimePanelSource.includes('Finalize as Custom'), 'Generated Loredecks must expose reviewed Generated-to-Custom finalization.');
assert(libraryPanel.includes('getGeneratedLoredeckExportReadiness'), 'Loredeck Library finalization controls must read Generated readiness.');
assert(libraryPanel.includes('finalizeButton.disabled = !editorCanValidate || generatedReadiness?.ready === false'), 'Loredeck Library finalize button must disable when Generated readiness blocks finalization.');
assert(libraryPanel.includes('Finalization waits:'), 'Loredeck Library finalize UI must explain readiness blockers beside the disabled button.');
assert(libraryPanel.includes('Open Coverage Plan'), 'Loredeck Library blocked finalization must offer a direct Deck Maker Coverage route.');
assert(libraryPanel.includes("openLoredeckCreatorWorkbench({ generatedPackId: pack.packId, anchor: 'coverage-plan' })"), 'Loredeck Library coverage route must target the linked Deck Maker coverage plan.');
assert(creatorPanel.includes('options.anchor'), 'Deck Maker workbench opener must support targeted anchor navigation.');
assert(creatorPanel.includes("scrollLoredeckCreatorWorkbenchToAnchor(anchor)"), 'Deck Maker workbench opener must scroll to requested anchors after opening.');
assert(runtimePanelSource.includes('buildFinalizedCustomLoredeckRecordFromGenerated'), 'Generated-to-Custom finalization must use an explicit conversion builder.');
assert(runtimePanelSource.includes('generated_finalized'), 'Finalized Custom Loredecks must retain generated-source provenance.');
assert(runtimePanelSource.includes('LOREDECK_CREATOR_COVERAGE_FINALIZE_BLOCKER'), 'Deck Maker Coverage must have a dedicated finalization blocker.');
assert(runtimePanelSource.includes("from '../loredecks/loredeck-creator-coverage.js'"), 'Runtime must use the extracted Deck Maker Coverage helper module.');
assert(panel.includes("from '../loredecks/loredeck-creator-finalization.js'"), 'Runtime must use the extracted Deck Maker finalization controller.');
assert(creatorCoverage.includes('buildLoredeckCreatorCoverageModel'), 'Deck Maker Coverage module must own the pure coverage model builder.');
assert(creatorCoverage.includes('buildLoredeckCreatorCoverageFinalizationProvenance'), 'Deck Maker Coverage module must own finalization provenance formatting.');
assert(creatorFinalization.includes('createLoredeckCreatorCoverageFinalizationController'), 'Deck Maker finalization module must own the acknowledgement controller.');
assert(creatorFinalization.includes('coverageFinalizeAcknowledgement'), 'Deck Maker Coverage finalization acknowledgement must persist on the Deck Maker job.');
assert(creatorFinalization.includes('Finalize Anyway with light coverage?'), 'Deck Maker Coverage finalization acknowledgement must require explicit user confirmation.');
assert(creatorFinalization.includes('Finalize Anyway without Deck Maker Coverage?'), 'Missing Deck Maker Coverage plans must require explicit finalization acknowledgement.');
assert(creatorCoverage.includes('no-coverage-plan:approved'), 'Deck Maker Coverage model must block approved jobs that have no coverage plan.');
assert(runtimePanelSource.includes('creatorCoverageProvenance'), 'Generated-to-Custom finalization must preserve Deck Maker Coverage provenance.');
assert(runtimePanelSource.includes('derivedFrom') && runtimePanelSource.includes('creatorCoverage'), 'Finalized Custom Loredecks must store Deck Maker Coverage provenance under derivedFrom.');
assert(panel.includes("from '../loredecks/loredeck-creator-coverage-actions.js'"), 'Runtime must use the extracted Deck Maker Coverage actions controller.');
assert(creatorCoverageActions.includes('createLoredeckCreatorCoverageActionsController'), 'Deck Maker Coverage row mutations must be owned by the coverage actions controller.');
assert(creatorCoverageActions.includes('Coverage row marked intentionally light.'), 'Deck Maker Coverage actions must report Light row acknowledgement.');
assert(creatorCoverageActions.includes('Coverage row marked not applicable.'), 'Deck Maker Coverage actions must report N/A row acknowledgement.');
assert(creatorCoverageActions.includes('Coverage row reopened for expansion.'), 'Deck Maker Coverage reopen action must report the restored expansion path.');
assert(runtimePanelSource.includes("createButton('Reopen'"), 'Deck Maker Coverage rows must expose visible Reopen controls.');
assert(runtimePanelSource.includes('Export is available now. Pending or drafted material is reported here'), 'Generated export readiness must inform without blocking export.');
assert(!runtimePanelSource.includes('Generated Loredeck is not export-ready'), 'Selected export must not enforce Generated Loredeck readiness.');
assert(runtimePanelSource.includes('Export this Bundled Loredeck as a .saga-loredeck.zip package.'), 'Bundled Loredecks must remain exportable.');
assert(runtimePanelSource.includes('refreshLoredeckHealthAfterAcceptedPendingChanges'), 'Pending Review acceptance must rerun Pack Health after health-impact changes.');
assert(runtimePanelSource.includes('and refreshed Pack Health'), 'Pending Review health rerun must report refreshed Pack Health to the user.');
assert(runtimePanelSource.includes('Open Pack Health Center') && runtimePanelSource.includes('openLoredeckHealthCenter(pack.packId, { tab: healthState.tab })'), 'Pending Review health errors must expose a direct Pack Health Center route.');
assert(runtimeLoredeckPendingChangeActions.includes('pruneAlreadyAppliedLoredeckPendingChanges') && runtimeLoredeckPendingChangeActions.includes('isLoredeckPendingEntryChangeAlreadyApplied'), 'Pending Review acceptance must prune stale rows whose entry payload is already accepted.');
assert(runtimePanelSource.includes('hashLoredeckBundleJson'), 'Loredeck package import must use a canonical content hash.');
assert(runtimePanelSource.includes('Import Loredeck Package'), 'Loredeck package import must use the zip package preview dialog.');
assert(runtimePanelSource.includes('installed Loredeck') && runtimePanelSource.includes('same content hash'), 'Loredeck package import must warn about exact duplicate package content.');
assert(runtimePanelSource.includes('possible duplicate Loredeck'), 'Loredeck package import must warn about possible duplicate Loredecks.');
assert(runtimePanelSource.includes('embeddedEntryCount'), 'Loredeck package import must track embedded Lorecard counts.');

for (const token of [
    'Pending Review',
    'Deck Maker',
    'getActiveLoredeckCreatorJob',
    'getLoredeckCreatorProjectRegistry',
    'activateLoredeckCreatorJob',
    'updateLoredeckCreatorProject',
    'upsertLoredeckCreatorJob',
    'clearLoredeckCreatorJob',
    'inferLoredeckCreatorUiStage',
    'refreshLoredeckCreatorWorkbenchBody',
    'queueLoredeckCreatorWorkbenchRefresh',
    'startLoredeckCreatorGeneration',
    'createLoredeckCreatorRequestOptions',
    'appendLoredeckCreatorGenerationStatus',
    'cancelLoredeckCreatorGeneration',
    'ignoreStaleLoredeckCreatorGeneration',
    'recoverLoredeckCreatorInterruptedActiveGeneration',
    'recoverLoredeckCreatorCurrentActiveGenerationOnOpen',
    'clearStaleLoredeckCreatorInterruptedResult',
    'isStaleLoredeckCreatorInterruptedResult',
    'reconcileLoredeckCreatorDraftCacheWithPack',
    'filterLoredeckCreatorActiveDraftChanges',
    'isLoredeckCreatorActiveGenerationStillLive',
    'buildLoredeckCreatorInterruptedResult',
    "status: 'interrupted'",
    'Saved batches are preserved',
    'applyLoredeckCreatorGenerationButtonLock',
    'loredeckCreatorGenerationControllers',
    'loredeckCreatorLiveGenerationsByJobId',
    'attachLoredeckCreatorLiveGeneration',
    'activeGenerationByJobId: getLoredeckCreatorActiveGenerationByJobIdMap()',
    'getLoredeckCreatorPipelineModel',
    'createLoredeckCreatorPipelineHeader',
    'createLoredeckCreatorStageGuide',
    'createLoredeckCreatorCurrentTaskCard',
    'createLoredeckCreatorCurrentTaskActions',
    'createLoredeckCreatorArtifactDisclosure',
    'renderLoredeckCreatorGenerationSettingsSummary',
    'onChange?.(nextSettings || getSettingsFromDeps({}, deps))',
    'refreshSummary(next)',
    'hasPersistableLoredeckCreatorProject',
    'setLocalLoredeckCreatorGenerationSettings',
    'Draft Story Outline',
    'Approve Outline and Unlock Title Pass',
    'Finalize as Custom Loredeck',
    'localJob?.activeGeneration',
    'normalized.activeGeneration',
    'requestLoredeckCreatorBriefResponse',
    'repairLoredeckCreatorBriefResponse',
    'requestLoredeckCreatorOutlineResponse',
    'repairLoredeckCreatorOutlineResponse',
    'markLoredeckCreatorOutlineFailed',
    'createLoredeckCreatorProjectShelf',
    'getLoredeckCreatorProjectShelfModels',
    'createLoredeckCreatorProjectControls',
    'createLoredeckCreatorProjectBulkToolbar',
    'appendLoredeckCreatorProjectFolderFilterOptions',
    'appendLoredeckCreatorProjectMoveOptions',
    'moveLoredeckCreatorProjectsToFolder',
    'getFilteredLoredeckCreatorProjectModels',
    'matchesLoredeckCreatorProjectFolderFilter',
    'setLoredeckCreatorProjectSelected',
    'openLoredeckCreatorProject',
    'activateLoredeckCreatorJobAsync',
    'renameLoredeckCreatorProjectTitle',
    'deleteLoredeckCreatorProjectWithConfirm',
    'deleteSelectedLoredeckCreatorProjectsWithConfirm',
    'buildLoredeckCreatorProjectCardModels',
    'Search projects...',
    'Delete Selected',
    'Move to: Unfiled',
    'Resume unfinished Generated Loredecks',
    'Scope Brief',
    'Deck Maker Story Outline',
    'handleLoredeckCreatorOutlineDraft',
    'approveLoredeckCreatorOutline',
    'Approve the Story Outline before drafting titles',
    'Generate Next Title Batch',
    'Generate Remaining',
    'handleLoredeckCreatorRemainingTitleBatches',
    'performLoredeckCreatorRemainingTitleBatches',
    'getLoredeckCreatorRemainingTitleBatches',
    'LOREDECK_CREATOR_TITLE_AUTORUN_BATCHES',
    'createLoredeckCreatorTitleBatchPlanner',
    'getLoredeckCreatorNextTitleBatch',
    'creatorTitleBatchId',
    'runGenerationUnits',
    'runLoredeckCreatorSingleUnitGeneration',
    'buildLoredeckCreatorTitleGenerationUnitId',
    'commitLoredeckCreatorTitleDraftResult',
    'creator_title_batch',
    'result.commitResult?.titleCommit',
    'Plan Context and Tags',
    'createLoredeckCreatorPlanningBatchPlanner',
    'getLoredeckCreatorNextPlanningBatch',
    'creatorPlanningBatch',
    'getLoredeckCreatorPlanningPendingBatchIds',
    'getLoredeckCreatorPlanningPlannedBatchIds',
    'getLoredeckCreatorEntryEligibleBatchIds',
    'Accept at least one planned Context and Tag set before drafting Lorecards',
    'creatorEntryBatch',
    'Open Loredeck Library',
    'Loredeck Library',
    'Import Deck',
    'Install Selected',
    'Add to Stack >',
    'Clear Stack',
    'Pack Health Center',
    'Open Pack Health Center',
    'Run Pack Health',
    'captureLoredeckHealthCenterScrollState',
    'restoreLoredeckHealthCenterScrollState',
    'Duplicate',
    'Delete',
    'Add Folder to Stack',
    'deleteLoredeckLibraryPackWithConfirm',
    'deleteLoredeckLibraryPacksWithConfirm',
    'moveLoredecksToLibraryFolder',
    'folderDropTarget',
    'createLoredeckLibraryHierarchyList',
    'createLoredeckLibraryInlineFolderRow',
    'createLoredeckLibraryFolderCoverStrip',
    'createLoredeckLibraryFolderDetailsPanel',
    'createLoredeckLibraryFolderLoredeckRow',
    'loredeckLibrarySelectedFolderDetailsId',
    'saga-grip-dot-rows',
    'promptCreateLoredeckLibraryFolder',
    'promptRenameLoredeckLibraryFolder',
    'deleteLoredeckLibraryFolderWithConfirm',
    'promptLoredeckLibraryFolderRemovalStrategy',
    'applyLoredeckLibraryFolderRemoval',
    'duplicateLoredeckLibraryPacksWithConfirm',
    'duplicateLoredeckLibraryFolderWithContents',
    'wireOverlayBackdropClose',
    'showSagaChoiceDialog',
    'saveLoredeckLibraryDeckPlacementAssignments',
    'getTargetFolderId',
    'getLoredeckLibraryFolderMoveOptions',
    'getLoredeckLibraryFolderParentOptions',
    'showSagaInputDialog',
    'getLoredeckStackFolderPreviewModel',
    'formatLoredeckStackSourceLabel',
    'createLoredeckStackFolderPreview',
    'addLoredeckFolderToStack',
    'createLoredeckStackFolderKey',
    'setLoredeckStackItemCollapsed',
    'createLoredeckLibraryDetailKicker',
    'createLoredeckLibraryEditableTitle',
    'renameLoredeckLibraryDeckTitle',
    'aria-current',
    'resolveLoredeckLibraryDragFeedback',
    'sortLoredeckLibraryPacks',
    'updateLoredeckLibraryDragFeedback',
    'ensureLoredeckLibraryDragCopyLabel',
    'getLoredeckLibraryPackSearchText',
    'getLoredeckLibraryHierarchySearchModel',
    'getLoredeckLibraryFolderSearchState',
    'Expand Details',
    'refreshLoredeckSurfaces',
    'LOREDECK_INDEX_URL',
    'createLoredeckLibraryHeaderMeta',
    'createLoredeckLibrarySquareIconAction',
    'renderSettingsTab',
    'ICONSET_SCHEMA_VERSION',
    'BUNDLED_ICONSET_PRESETS',
    'saga-hero',
    'assets/iconsets/saga-hero/hero-tab-loredecks-256.png',
    'saga-mystic',
    'assets/iconsets/saga-mystic/mystic-tab-loredecks-256.png',
    'saga-relay',
    'assets/iconsets/saga-relay/relay-tab-loredecks-256.png',
    'createThemeIconSetSelector',
    'applyThemeIconSet',
    'createLoredeckDeckVisual',
    'assets.cover',
    'Theme Pack',
    'Installed Theme Packs',
    'Royal Chronicle',
    'Void Reliquary',
    'Stellar Cartography',
    'Neon District',
    'Hero Campus',
    'Sea Map Odyssey',
    'Monster Index',
    'Holo Rail',
    'Midnight Evidence',
    'Shelf Icon Set',
    'Color Overrides',
]) {
    assert(runtimePanelSource.includes(token), `Runtime panel is missing expected smoke token: ${token}`);
}
assert(!runtimePanelSource.includes('main.appendChild(snippet)'), 'Deck Maker generation status must not render raw model output snippets.');
assert(!runtimePanelSource.includes('Draft This Set'), 'Deck Maker Title Pass must not expose per-row title-batch draft buttons.');
assert(!runtimePanelSource.includes('Redraft Set'), 'Deck Maker Title Pass must not expose per-row title-batch redraft buttons.');

for (const token of [
    'emitLoreRequestProgress',
    'readOpenAICompatibleStream',
    'wantsStreamingResponse',
    'stream: shouldStream',
    'streamSupported: false',
]) {
    assert(llm.includes(token), `LLM client is missing expected streaming token: ${token}`);
}

for (const token of [
    'LOREDECK_CREATOR_PROJECT_STAGE_ORDER',
    'normalizeLoredeckCreatorProjectStage',
    'inferLoredeckCreatorProjectStage',
    'getLoredeckCreatorProjectStageDescriptor',
    'getLoredeckCreatorProjectCounts',
    'getLoredeckCreatorProjectNextAction',
    'isLoredeckCreatorProjectUnfinished',
    'buildLoredeckCreatorProjectCardModel',
    'buildLoredeckCreatorProjectCardModels',
    'Review Draft Lorecards',
    'Review Pending Lorecards',
]) {
    assert(creatorProjects.includes(token), `Deck Maker project model is missing expected token: ${token}`);
}

for (const token of [
    'loredeckCreator',
    'loredeckCreatorProjects',
    'normalizeLoredeckCreatorRegistry',
    'normalizeLoredeckCreatorJob',
    'getLoredeckCreatorRegistry',
    'getLoredeckCreatorProjectRegistry',
    'getActiveLoredeckCreatorJob',
    'activateLoredeckCreatorJob',
    'updateLoredeckCreatorProject',
    'upsertLoredeckCreatorJob',
    'clearLoredeckCreatorJob',
    'outline_approved',
    'outlineApproved',
    'titleBatchDraftedIds',
    'planningBatchQueuedIds',
    'planningBatchAcceptedIds',
]) {
    assert(stateSource.includes(token), `State manager is missing expected Deck Maker job token: ${token}`);
}

for (const token of [
    'saga-loredeck-install-shell',
    'saga-runtime-rail',
    'saga-runtime-drawer',
    'saga-loredeck-creator-project-shelf',
    'saga-loredeck-creator-project-card',
    'saga-loredeck-creator-project-controls',
    'saga-loredeck-creator-project-search',
    'saga-loredeck-creator-project-filter',
    'saga-loredeck-creator-project-folder-filter',
    'saga-loredeck-creator-project-move-select',
    'saga-loredeck-creator-project-bulk',
    'saga-loredeck-creator-project-card-selected',
    'saga-loredeck-creator-project-progress',
    'saga-loredeck-creator-project-delete',
    'saga-loredeck-creator-project-select-active',
    'saga-loredeck-creator-pipeline-header',
    'saga-loredeck-creator-stage-guide',
    'saga-loredeck-creator-stage-active',
    'saga-loredeck-creator-stage-needs-review',
    'saga-loredeck-creator-current-task',
    'saga-loredeck-creator-current-sidebar',
    'saga-loredeck-creator-output-grid',
    'saga-loredeck-creator-artifact',
    'saga-loredeck-library-details',
    'saga-loredeck-library-resize-handle',
    'saga-loredeck-library-resize-track-left',
    'saga-loredeck-library-resize-label-arrow',
    'saga-loredeck-metadata-shell',
    'saga-loredeck-library-shell',
    'saga-loredeck-library-columns',
    'saga-loredeck-library-hierarchy-list',
    'saga-loredeck-library-title-meta',
    'saga-loredeck-library-details-collapsed',
    'saga-loredeck-library-inline-folder-row',
    'saga-loredeck-library-folder-cover-strip',
    'saga-loredeck-library-folder-cover-tile',
    'saga-loredeck-library-folder-row-drop-enabled',
    'saga-loredeck-library-folder-move-select',
    'saga-loredeck-library-folder-parent-control',
    'saga-loredeck-library-folder-actions',
    'saga-confirm-input',
    'saga-confirm-choice-list',
    'saga-loredeck-library-stack-folder-preview',
    'saga-loredeck-library-stack-disclosure-button',
    'saga-loredeck-library-stack-folder-card-has-suppressed',
    'saga-loredeck-library-stack-card-suppressed',
    'saga-loredeck-library-stack-duplicate-summary',
    'saga-loredeck-library-stack-folder-preview-chip',
    'saga-loredeck-library-drag-copy',
    'saga-loredeck-library-drag-drop-invalid',
    'saga-loredeck-library-root-drop-active',
    'saga-loredeck-library-stack-remove-active',
    'saga-loredeck-library-search-match',
    'saga-loredeck-library-search-context',
    'saga-loredeck-library-transfer-footer',
    'saga-loredeck-library-stack-card',
    'saga-loredeck-library-stack-grip',
    'saga-loredeck-library-inline-title',
    'saga-loredeck-library-title-edit-action',
    'saga-loredeck-library-title-input',
    'saga-loredeck-library-stack-ghost',
    'saga-loredeck-library-center-actions',
    'saga-loredeck-library-square-action',
    'saga-loredeck-library-icon-action',
    'saga-loredeck-library-stack-toggle-button',
    'saga-loredeck-library-detail-kicker',
    'saga-loredeck-library-deck-card.saga-loredeck-library-deck-selected',
    'saga-loredeck-library-inline-folder-row.saga-loredeck-library-folder-row-active',
    'saga-loredeck-library-stack-card.saga-loredeck-library-stack-card-selected',
    'saga-lore-workbench-shell .saga-runtime-button',
    'saga-loredeck-health-center-shell',
    'saga-loredeck-health-severity-card',
    'saga-theme-top-grid',
    'saga-theme-gallery',
    'saga-theme-iconset-selector',
    'saga-theme-iconset-strip',
    'saga-theme-icon-grid',
    'saga-loredeck-library-visual-cover',
    'saga-loredeck-library-visual-cover::after',
    'border-radius: inherit',
    'scrollbar-gutter: stable',
]) {
    assert(style.includes(token), `Stylesheet is missing expected smoke selector: ${token}`);
}

assert(!style.includes('max-height: 160px;'), 'Folder details contained Loredeck list must expand with the resized details panel.');
assert(/\.saga-loredeck-library-details\s*\{[\s\S]*?height:\s*100%;/.test(style), 'Loredeck Library details panel must fill the resized details region.');
assert(/\.saga-loredeck-library-folder-detail-visual\s*\{[\s\S]*?align-self:\s*start;[\s\S]*?justify-self:\s*start;/.test(style), 'Folder detail cover previews must stay pinned to the top-left while details resize.');
assert(/\.saga-loredeck-library-deck-card\s*\{[\s\S]*?user-select:\s*none;/.test(style), 'Loredeck Library deck cards must suppress native text selection during Shift-click range selection.');
assert(/\.saga-loredeck-library-title-input\s*\{[\s\S]*?user-select:\s*text;/.test(style), 'Loredeck Library title input must remain text-selectable while deck cards suppress selection.');
assert(style.includes('display: inline-grid !important;') && style.includes('grid-area: 1 / 1;'), 'Loredeck Library square icon actions must center their SVG artwork.');
assert(style.includes('var(--saga-chip-neutral-bg') && style.includes('var(--saga-chip-source-fg') && style.includes('var(--saga-chip-review-bg'), 'Loredeck Library metadata/status pills must use semantic theme chip tokens.');
assert(
    style.includes('--saga-chip-tag-bg: rgba(22, 23, 28, 0.9)')
        && style.includes('--saga-chip-category-fg: #c9cdd6')
        && style.includes('--saga-chip-relevance-high-fg: var(--saga-activate, #ffcb5c)')
        && style.includes('--saga-chip-relevance-normal-fg: color-mix(in oklab, var(--saga-muted, rgba(241, 234, 216, 0.68)) 52%, var(--saga-activate, #ffcb5c) 48%)')
        && style.includes('--saga-chip-relevance-low-fg: var(--saga-chip-muted-fg, #aeb3bd)')
        && style.includes('--saga-chip-relevance-high-bg: color-mix(in oklab, var(--saga-surface-2, rgba(18, 18, 24, 0.62)) 58%, var(--saga-activate, #ffcb5c) 42%)')
        && style.includes('--saga-chip-relevance-normal-bg: color-mix(in oklab, var(--saga-surface-2, rgba(18, 18, 24, 0.62)) 82%, var(--saga-activate, #ffcb5c) 18%)')
        && style.includes('--saga-chip-relevance-low-bg: var(--saga-chip-neutral-bg, rgba(24, 25, 31, 0.82))'),
    'Static chip fallbacks must keep relevance feedback mapped to neutral low, restrained Activate normal, and strong Activate high.'
);
assert(style.includes('calc(var(--saga-grip-dot-rows, 6) * 7px)'), 'Loredeck Library drag handles must size dot grids without clipping short 2x2 or 2x3 handles.');
assert(/\.saga-loredeck-library-folder-grip\s*\{[\s\S]*?transform:\s*translateY\(-1px\);/.test(style), 'Loredeck Library folder drag handles must keep their optical centering nudge.');
assert(/\.saga-loredeck-library-body-opening\s*\{[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\);[\s\S]*?place-items:\s*center;/.test(style), 'Loredeck Library progressive opening shell must center its loading state without reserving the full body grid.');
assert(style.includes('.saga-loredeck-library-opening-status') && style.includes('.saga-loredeck-library-opening-spinner'), 'Loredeck Library progressive opening shell must show a spinner-backed loading status.');
assert(libraryPanel.includes('suppressLoredeckLibraryRangeTextSelection') && libraryPanel.includes("card.addEventListener('mousedown', suppressLoredeckLibraryRangeTextSelection);"), 'Loredeck Library card range selection must suppress native Shift-click text selection before click handling.');
assert(
    libraryPanel.includes('refreshLoredeckLibraryFolderSubtree')
    && libraryPanel.includes('loredeckLibraryHierarchyRenderCache')
    && libraryPanel.includes('row.dataset.folderDepth')
    && libraryPanel.includes('if (!refreshLoredeckLibraryFolderSubtree(id, collapsed)) scheduleLoredeckLibraryHierarchyRefresh();'),
    'Loredeck Library folder disclosure must use the cached local subtree refresh path before falling back to a full hierarchy rebuild.'
);
assert(
    libraryPanel.includes('renderLoredeckLibraryOpeningShell')
    && libraryPanel.includes('scheduleLoredeckLibraryProgressiveHydration')
    && libraryPanel.includes('progressiveOpen: !hasOverlay')
    && libraryPanel.includes('saga-loredeck-library-body-opening')
    && libraryPanel.includes('saga-loredeck-library-opening-status')
    && libraryPanel.includes('saga-loredeck-library-opening-spinner'),
    'Loredeck Library first open must paint a spinner-backed lightweight shell before hydrating the full Library body.'
);
assert(
    libraryPanel.includes('function createLoredeckLibraryMobileBottomActions')
    && libraryPanel.includes("saga-loredeck-library-mobile-bottom-actions")
    && libraryPanel.includes("if (!mobile) {")
    && libraryPanel.includes("shell.appendChild(createLoredeckLibraryMobileBottomActions())")
    && libraryPanel.includes("shell.appendChild(createLoredeckLibraryMobileBottomActions({ opening: true }))")
    && libraryPanel.includes('const LOREDECK_LIBRARY_MOBILE_ACTION_TOOLTIP_OPTIONS = Object.freeze({ showOnHover: false, showOnFocus: false });')
    && libraryPanel.includes('function createLoredeckLibraryMobileBottomButton')
    && libraryPanel.includes('addTooltip(button, tooltip || label, LOREDECK_LIBRARY_MOBILE_ACTION_TOOLTIP_OPTIONS)')
    && libraryPanel.includes('hideFloatingTooltip();')
    && libraryPanel.includes("createLoredeckLibraryMobileBottomButton('Import'")
    && libraryPanel.includes("createLoredeckLibraryMobileBottomButton('Refresh'")
    && libraryPanel.includes("createLoredeckLibraryMobileBottomButton('Done'"),
    'Revision 3 Loredeck Library mobile must move persistent Import, Refresh, and Done actions to a bottom action bar without floating mobile tooltips.'
);
assert(
    /\.saga-loredeck-library-mobile-body\s*\{[\s\S]*?overflow-y:\s*auto;[\s\S]*?overflow-x:\s*hidden;/.test(style)
    && /\.saga-loredeck-library-mobile-list\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?scrollbar-gutter:\s*auto;/.test(style),
    'Revision 3 Loredeck Library mobile body must be the page scroll owner while the deck list flows normally.'
);

console.log('Visual smoke harness contract passed.');
