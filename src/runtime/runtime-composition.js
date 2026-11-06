import { configureContinuityPanel } from '../continuity/continuity-panel.js';
import { configureLoreTimelinePanel } from '../lorecards/lore-timeline-panel.js';
import { configureSettingsPanel } from '../settings/settings-panel.js';
import { configureRuntimeSettingsTab } from '../settings/runtime-settings-tab.js';
import { configureAdvancedRuntimePanel } from './advanced-runtime-panel.js';
import { configureInjectionPreviewPanel } from './injection-preview-panel.js';
import { configureRuntimeCollapsible } from './runtime-collapsible.js';
import { configureRuntimeFeatureProgress } from './runtime-feature-progress.js';
import { configureRuntimeGuidePrep } from './runtime-guide-prep.js';
import { configureRuntimeSafetyPanel } from './runtime-safety-panel.js';
import { configureRuntimeSettingControls } from './runtime-setting-controls.js';
import { configureRuntimeShell } from './runtime-shell.js';
import { configureRuntimeShellView } from './runtime-shell-view.js';
import { configureRuntimeTour } from './runtime-tour.js';
import { configureSessionBasicPanel } from './session-basic-panel.js';
import { configureRuntimeTabRegistry } from './tab-registry.js';
import { validateRuntimeDependencies } from './runtime-render-owner.js';

export function configureRuntimeComposition(deps = {}) {
    deps = validateRuntimeDependencies('Runtime composition', deps,
        ['getPanelRoot', 'getState', 'getSettings', 'saveState', 'saveSettings', 'showLorePanel', 'hideLorePanel',
            'refreshPanelBody', 'refreshHeader', 'renderPanelBody', 'createRuntimeRenderErrorCard'],
        ['refreshRuntimeRailIcons', 'applyRuntimeTheme', 'toast']);
    const getPanelRoot = deps.getPanelRoot;

    configureSettingsPanel({
        refreshSettingsPanel: options => {
            deps.refreshPanelBody?.({ preserveScroll: true, preserveWindowScroll: true, ...(options || {}) });
        },
        refreshRuntimeHeader: deps.refreshHeader,
        markTourTarget: deps.markTourTarget,
        openAdvancedSettings: deps.openAdvancedSettingsTab,
        downloadJson: deps.downloadJson,
    });

    configureRuntimeSettingsTab({
        createCollapsibleSection: deps.createCollapsibleSection,
        createDangerZoneCard: deps.createDangerZoneCard,
        createStateSafetyCard: deps.createStateSafetyCard,
        markTourTarget: deps.markTourTarget,
        refreshPanelBody: deps.refreshPanelBody,
    });

    configureLoreTimelinePanel({
        getState: deps.getState,
        refreshPanelBody: deps.refreshPanelBody,
        refreshHeader: deps.refreshHeader,
        getRecoverableTimelineEntries: deps.getRecoverableTimelineEntries,
        restoreLoreTimelineEntriesToPending: deps.restoreLoreTimelineEntriesToPending,
        toast: deps.toast,
        isBasicExperience: deps.isBasicExperience,
        markTourTarget: deps.markTourTarget,
        openNewLoreDialog: deps.openNewLoreDialog,
    });

    configureContinuityPanel({
        createAutomationModeCard: deps.createAutomationModeCard,
        createCollapsibleSection: deps.createCollapsibleSection,
        createNumberSettingRow: deps.createNumberSettingRow,
        createRangeSettingRow: deps.createRangeSettingRow,
        createSelectSettingRow: deps.createSelectSettingRow,
        createTextSettingField: deps.createTextSettingField,
        appendGenerationStatus: deps.appendGenerationStatus,
        appendSettingsResetButton: deps.appendSettingsResetButton,
        ensureContinuityProviderReadyForAction: deps.ensureContinuityProviderReadyForAction,
        getCountLabel: deps.getCountLabel,
        markTourTarget: deps.markTourTarget,
        refreshPanelBody: deps.refreshPanelBody,
        refreshHeader: deps.refreshHeader,
        resetFeatureProgress: deps.resetFeatureProgress,
        setFeatureProgress: deps.setFeatureProgress,
    });

    configureInjectionPreviewPanel({
        appendSettingsResetButton: deps.appendSettingsResetButton,
        createCollapsibleSection: deps.createCollapsibleSection,
        getEnabledLoredeckStackPackIds: deps.getEnabledLoredeckStackPackIds,
        getPanelRoot,
        markTourTarget: deps.markTourTarget,
        refreshPanelBody: deps.refreshPanelBody,
        refreshHeader: deps.refreshHeader,
        renderSessionTab: deps.renderSessionTab,
        setPanelState: deps.setPanelState,
    });

    configureRuntimeCollapsible({
        onSectionToggle: sectionId => {
            if (String(sectionId || '').startsWith('lore.')) deps.scheduleAcceptedLoreLayoutUpdate?.();
        },
    });

    configureRuntimeTabRegistry({
        resetLorePanelLayout: deps.resetLorePanelLayout,
        scheduleAcceptedLoreLayoutUpdate: deps.scheduleAcceptedLoreLayoutUpdate,
    });

    configureRuntimeSafetyPanel({
        refreshPanelBody: deps.refreshPanelBody,
        refreshHeader: deps.refreshHeader,
        refreshRuntimeThemeSurfaces: (settings = deps.getSettings?.()) => {
            deps.applyRuntimeTheme?.(getPanelRoot(), settings);
            deps.refreshRuntimeRailIcons?.(settings);
        },
        resetCanonPreviewUiState: deps.resetCanonPreviewUiState,
    });

    configureRuntimeFeatureProgress({
        getPanelRoot,
    });

    configureRuntimeSettingControls({
        refreshPanelBody: deps.refreshPanelBody,
    });

    configureRuntimeShellView({
        createRuntimeRenderErrorCard: deps.createRuntimeRenderErrorCard,
        getRailMetrics: deps.getRailMetrics,
        getRailMetricTooltips: deps.getRailMetricTooltips,
        getSelectedLoreInjectionCount: deps.getSelectedLoreInjectionCount,
        hideRuntimePanel: deps.hideLorePanel,
        renderPanelBody: deps.renderPanelBody,
        renderRailMetric: deps.renderRailMetric,
        setExperienceMode: deps.setExperienceMode,
        showRuntimePanel: deps.showLorePanel,
        toggleRuntimeDrawerForTab: deps.toggleRuntimeDrawerForTab,
        toggleRuntimeRailMode: deps.toggleRuntimeRailMode,
    });

    configureAdvancedRuntimePanel({
        createCollapsibleSection: deps.createCollapsibleSection,
        getInjectionCharacterStats: deps.getInjectionCharacterStats,
        getSelectedLoreInjectionCount: deps.getSelectedLoreInjectionCount,
        markTourTarget: deps.markTourTarget,
        navigateRuntimeTab: deps.navigateRuntimeTab,
        refreshPanelBody: deps.refreshPanelBody,
        refreshHeader: deps.refreshHeader,
    });

    configureSessionBasicPanel({
        getEnabledLoredeckStackPackIds: deps.getEnabledLoredeckStackPackIds,
        getSelectedLoreInjectionCount: deps.getSelectedLoreInjectionCount,
        createCollapsibleSection: deps.createCollapsibleSection,
        setPanelState: deps.setPanelState,
        refreshPanelBody: deps.refreshPanelBody,
        refreshHeader: deps.refreshHeader,
        setSectionCollapsed: deps.setSectionCollapsed,
        closeLoredeckLibraryWindow: deps.closeLoredeckLibraryWindow,
        closeContextWorkbench: deps.closeContextWorkbench,
    });

    configureRuntimeGuidePrep({
        navigateRuntimeTab: deps.navigateRuntimeTab,
        setExperienceMode: deps.setExperienceMode,
        setSectionCollapsed: deps.setSectionCollapsed,
        openLoredeckLibraryWindow: deps.openLoredeckLibraryWindow,
        openLoredeckLibraryDetails: deps.openLoredeckLibraryDetails,
        openContextWorkbenchForPack: deps.openContextWorkbenchForPack,
        getContextWorkbenchStack: deps.getContextWorkbenchStack,
        openLoredeckCreatorWorkbench: deps.openLoredeckCreatorWorkbench,
        prepareLoredeckCreatorTourTarget: deps.prepareLoredeckCreatorTourTarget,
        openLoredeckHealthCenter: deps.openLoredeckHealthCenter,
        setLoredeckCreatorBriefCacheEntry: deps.setLoredeckCreatorBriefCacheEntry,
    });

    configureRuntimeTour({
        getGuideSteps: mode => deps.getRuntimeGuideSteps?.(deps.normalizeExperienceMode?.(mode)),
        normalizeExperienceMode: deps.normalizeExperienceMode,
        setSectionCollapsed: deps.setSectionCollapsed,
        normalizePanelLayoutState: deps.normalizePanelLayoutState,
        normalizeTabForExperience: deps.normalizeTabForExperience,
        navigateRuntimeTab: deps.navigateRuntimeTab,
        showRuntimePanel: deps.showLorePanel,
        prepareGuideStep: deps.prepareRuntimeGuideStep,
        getPanelRoot,
        panelId: deps.panelId,
    });

    configureRuntimeShell({
        getPanelRoot,
        getState: deps.getState,
        getSettings: deps.getSettings,
        saveState: deps.saveState,
        saveSettings: deps.saveSettings,
        showRuntimePanel: deps.showLorePanel,
        notify: deps.toast,
        updateAcceptedLoreScrollRegionHeight: deps.updateAcceptedLoreScrollRegionHeight,
    });
}
