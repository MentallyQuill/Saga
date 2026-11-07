/**
 * lore-panel.js - Saga
 * Floating roleplay control window.
 *
 * The extension-menu settings panel is reserved for API setup and
 * runtime launch controls. This window is the runtime surface used during roleplay.
 */

import { normalizeLoreMatrix, normalizeLoreEntry, LORE_LIFECYCLE_STATUSES } from '../lorecards/lore-matrix.js';
import { LORE_RELEVANCE_TIERS, LORE_RELEVANCE_LABELS, normalizeLoreRelevance, LORE_CATEGORY_VALUES, LORE_PURPOSE_LABELS } from '../lorecards/lore-relevance.js';
import {
    LOREDECK_CREATOR_ENTRY_BATCH_MAX,
    LOREDECK_CREATOR_ENTRY_BATCH_SIZE,
    clampLoredeckCreatorInteger,
} from '../loredecks/loredeck-creator-generation-settings.js';
import {
    createLoredeckCreatorAdvancedGenerationSettings as createLoredeckCreatorAdvancedGenerationSettingsPanel,
} from '../loredecks/loredeck-creator-generation-settings-panel.js';
import {
    createLoredeckCreatorGenerationSettingsController,
} from '../loredecks/loredeck-creator-generation-settings-controller.js';
import {
    attachLoredeckCreatorLiveGeneration,
    deleteLoredeckCreatorGenerationController,
    forgetLoredeckCreatorLiveGeneration,
    getLoredeckCreatorActiveGenerationByJobIdMap,
    getLoredeckCreatorGenerationController,
    getLoredeckCreatorGenerationJobId,
    rememberLoredeckCreatorLiveGeneration,
} from '../loredecks/loredeck-creator-generation-state.js';
import {
    createLoredeckCreatorGenerationProgressController,
    isLoredeckCreatorAbortError,
} from '../loredecks/loredeck-creator-generation-progress.js';
import {
    buildLoredeckCreatorRetrySmallerConfig,
    buildLoredeckCreatorRetryUnitId,
    formatLoredeckCreatorRecoveryStageLabel,
    getLoredeckCreatorUnitMeta,
    isStaleLoredeckCreatorInterruptedResult,
    isLoredeckCreatorRecoverableUnit,
    recoverLoredeckCreatorInterruptedActiveGeneration as recoverLoredeckCreatorInterruptedActiveGenerationWithDeps,
    selectLoredeckCreatorLatestRecoverableUnit,
} from '../loredecks/loredeck-creator-generation-recovery.js';
import {
    createLoredeckCreatorGenerationController,
} from '../loredecks/loredeck-creator-generation-controller.js';
import { runGenerationUnits } from '../generation/generation-job-runner.js';
import {
    buildLoredeckCreatorGenerationCommitPatch,
    attachLoredeckCreatorGenerationCommitToChanges,
    reconcileLoredeckCreatorGenerationCommit,
    findLoredeckCreatorPendingGenerationCommit,
    fingerprintLoredeckCreatorGenerationInput,
    getLoredeckCreatorCommittedGenerationResult,
} from '../loredecks/loredeck-creator-generation-commit.js';
import {
    createLoredeckCreatorGenerationSessionController,
} from '../loredecks/loredeck-creator-generation-session.js';
import {
    buildLoredeckCreatorGenerationFailureDiagnostic,
    formatLoredeckCreatorGenerationFailureMessage,
    formatLoredeckCreatorStageLabel,
    getLoredeckCreatorFailureCode,
    prepareLoredeckCreatorStageFailure,
    warnLoredeckCreatorGenerationFailure,
} from '../loredecks/loredeck-creator-generation-diagnostics.js';
import {
    isLoredeckCreatorParsedArtifactUsable,
    isLoredeckCreatorParsedEntryDraftUsable,
    isLoredeckCreatorParsedPlanningUsable,
    isLoredeckCreatorParsedTitlePassUsable,
    isLoredeckCreatorPlanningProposal,
    validateLoredeckCreatorArtifactResult,
    validateLoredeckCreatorEntryDraftResult,
    validateLoredeckCreatorPlanningResult,
    validateLoredeckCreatorTitlePassResult,
} from '../loredecks/loredeck-creator-generation-validation.js';
import {
    buildLoredeckCreatorEntryGenerationUnitId,
    buildLoredeckCreatorPlanningGenerationUnitId,
    buildLoredeckCreatorTitleGenerationUnitId,
    createLoredeckCreatorEntryChangeId,
    getLoredeckCreatorEntryTargetIds,
    getLoredeckCreatorPlanningBatchIdentity,
} from '../loredecks/loredeck-creator-generation-units.js';
import {
    buildLoredeckCreatorGeneratedPackRecord,
    getLoredeckCreatorGeneratedPackId,
} from '../loredecks/loredeck-creator-generated-pack.js';
import {
    createLoredeckCreatorGeneratedPackCacheController,
} from '../loredecks/loredeck-creator-generated-pack-cache.js';
import {
    createLoredeckCreatorWorkbenchCacheController,
} from '../loredecks/loredeck-creator-workbench-cache.js';
import {
    repairLoredeckCreatorBriefResponse,
    repairLoredeckCreatorEntryResponse,
    repairLoredeckCreatorOutlineResponse,
    repairLoredeckCreatorPlanningResponse,
    repairLoredeckCreatorTitleResponse,
    requestLoredeckCreatorBriefResponse,
    requestLoredeckCreatorEntryResponse,
    requestLoredeckCreatorOutlineResponse,
    requestLoredeckCreatorPlanningResponse,
    requestLoredeckCreatorTitleResponse,
} from '../loredecks/loredeck-creator-generation-requests.js';
import {
    getDefaultState,
    DEFAULT_SETTINGS,
} from '../state/constants.js';
import { applyExperienceModeSettings } from './runtime-experience-mode.js';
import { hasSelectedLoredeckContext } from './runtime-basic-readiness.js';
import { configureRuntimeComposition } from './runtime-composition.js';
import { createRuntimeRenderOwner } from './runtime-render-owner.js';
import { configureContextComposition } from './context-composition.js';
import { configureLoredeckEditorComposition } from './loredeck-editor-composition.js';
import { configureLoredeckWorkflowComposition } from './loredeck-workflow-composition.js';
import {
    addLoredeckFolderToStack,
    addLoredeckToStack,
    commitLoredeckStackMutation,
    createLoredeckStackDeckKey,
    createLoredeckStackFolderKey,
    getLoredeckDefinition,
    getLoredeckDisplayName,
    getLoredeckHealthText,
    getLoredeckLibrary,
    getLoredeckStack,
    getLoredeckStackItemFolderId,
    getLoredeckStackItemKey,
    getLoredeckStackItemLabel,
    getLoredeckStackItemPackId,
    getLoredeckStackItemType,
    getLoredeckTypeLabel,
    moveLoredeckInStack,
    moveLoredeckStackItem,
    normalizeLoredeckLibraryPack,
    normalizeLoredeckStackPriority,
    removeLoredeckFromStack,
    removeLoredecksFromStack,
    removeLoredeckStackItem,
    reorderLoredeckInStack,
    reorderLoredeckStackItem,
    setLoredeckEnabled,
    setLoredeckStackItemCollapsed,
    setLoredeckStackItemEnabled,
} from './active-stack-panel.js';
import {
    renderSessionTab,
} from './advanced-runtime-panel.js';
import {
    appendSettingsResetButton,
    createDangerZoneCard,
    createStateSafetyCard,
    resetSettingKeysToDefaults,
} from './runtime-safety-panel.js';
import {
    prepareRuntimeGuideStep,
} from './runtime-guide-prep.js';
import {
    createRuntimeRenderErrorCard,
    renderPanelBody,
} from './tab-registry.js';
import {
    getInjectionCharacterStats,
    getRailMetricTooltips,
    getRailMetrics,
    getSelectedLoreInjectionCount,
    renderRailMetric,
} from './runtime-rail-metrics.js';
import {
    appendGenerationStatus,
    ensureContinuityProviderReadyForAction,
    ensureLoreProviderReadyForAction,
    resetFeatureProgress,
    setFeatureProgress,
} from './runtime-feature-progress.js';
import {
    getCountLabel,
    getLoreDisplayLabel,
    getLoreRegistryMeta,
    getLoreRegistryValues,
} from './runtime-lore-registry.js';
import {
    createAutomationModeCard,
    createNumberSettingRow,
    createRangeSettingRow,
    createSelectSettingRow,
    createTextSettingField,
} from './runtime-setting-controls.js';
import {
    appendLoredeckEntryEditorSection,
    buildLoredeckContextFromEditorFields,
    buildLoredeckRetrievalFromEditorFields,
    createLoredeckCheckbox,
    createLoredeckEditorField,
    getLoredeckEntryEditorNumber,
    getLoredeckEntryEditorNumberText,
    getLoredeckEntryEditorString,
    validateLoredeckV3EditorFields,
} from './loredeck-editor-fields.js';
import {
    loadLoredeckEntriesForEditor,
    loadLoredeckManifestPreview,
    loadLoredeckTagRegistryForEditor,
    loadLoredeckTimelineRegistryForEditor,
} from './loredeck-editor-loader.js';
import {
    getCachedLoredeckManifest,
    getExpectedLoredeckEntrySchemaVersion,
    validateLoredeckForEditor,
} from './loredeck-editor-validation.js';
import {
    buildCustomDuplicateLoredeckRecord,
    buildFinalizedCustomLoredeckRecordFromGenerated,
    createCustomDuplicateLoredeckRecord,
    cancelLoredeckHealthRepairRun,
    continueLoredeckHealthModelRepairSession,
    duplicateLoredeckAsCustom,
    exportValidatedLoredeckDraft,
    finalizeGeneratedLoredeckAsCustom,
    finalizeGeneratedLoredeckEntry,
    getLoredeckHealthRepairActiveRun,
    getDefaultDuplicateLoredeckTags,
    getFinalizedGeneratedLoredeckTags,
    getLoredeckDuplicateTitle,
    getUniqueLoredeckPackId,
    applyLoredeckHealthRepairChoice,
    reevaluateLoredeckHealthRepairChoice,
    attemptLoredeckHealthFixes,
    saveLoredeckMetadataFromInputs,
    syncLoredeckMetadataFromManifest,
} from './loredeck-editor-actions.js';
import {
    createLoredeckEntryOverrideCard,
} from './loredeck-entry-overrides-panel.js';
import {
    createLoredeckTimelineRegistryCard,
} from './loredeck-timeline-registry-panel.js';
import {
    createLoredeckTagManagerCard,
} from './loredeck-tag-manager-panel.js';
import {
    createLoredeckPendingReviewCard,
} from './loredeck-pending-review-panel.js';
import {
    createLoredeckAssistantCard,
    createLoredeckAssistantDraftBatchCard,
} from './loredeck-assistant-review-panel.js';
import {
    createLoredeckAssistantDraftHandoffController,
} from './loredeck-assistant-draft-handoff.js';
import {
    createLoredeckAssistantDraftCacheController,
} from './loredeck-assistant-draft-cache.js';
import {
    appendLoredeckPendingQualityPills,
    createLoredeckPendingDiffList,
    createLoredeckPendingHealthImpactPill,
    createLoredeckPendingHealthStalePill,
    createLoredeckPendingQualityList,
    createLoredeckPendingRepairCandidateList,
    createLoredeckPendingRiskPill,
    doesLoredeckPendingChangeAffectPackHealth,
    formatLoredeckPendingActionLabel,
    formatLoredeckPendingSourceLabel,
    formatLoredeckPendingTargetKindLabel,
    getLoredeckPendingConfidence,
    getLoredeckPendingRisk,
    getLoredeckPendingSourceTooltip,
    isLoredeckHealthStatusStale,
    normalizeLoredeckPendingRubricLevel,
} from './loredeck-review-helpers.js';
import {
    createLoredeckRecordPatchChange,
    getLoredeckPendingChanges,
    normalizeLoredeckPendingChanges,
    normalizeLoredeckPendingIdList,
    normalizeLoredeckPendingTimelineIdList,
} from './loredeck-pending-change-model.js';
import {
    acceptLoredeckPendingChanges,
    queueLoredeckPendingChange,
    queueLoredeckPendingChanges,
    rejectLoredeckPendingChanges,
} from './loredeck-pending-change-actions.js';
import {
    buildBulkLoredeckTagOverrideEntry,
    computeLoredeckBulkTagUpdates,
    queueLoredeckBulkContextUpdate,
    queueLoredeckBulkTagUpdate,
    queueLoredeckTagRenameProposal,
    removeLoredeckEntryOverride,
    removeLoredeckTagRegistryDefinition,
    removeLoredeckTimelineDefinition,
    saveLoredeckEntryOverride,
    saveLoredeckTagRegistryDefinition,
    saveLoredeckTimelineAnchorDefinition,
    saveLoredeckTimelineWindowDefinition,
    setLoredeckEntryDisabled,
    setLoredeckTimelineItemDisabled,
} from './loredeck-edit-proposals.js';
import {
    buildEmbeddedCustomManifest,
    cloneLoredeckJson,
    getLoredeckTagRegistryCount,
    getLoredeckTimelineRegistryCount,
    normalizeLoredeckEntryId,
} from './loredeck-package-helpers.js';
import {
    exportSelectedLoredeckBundles,
} from './loredeck-package-export.js';
import {
    installLoredeckBundleFromFile,
} from './loredeck-package-install-panel.js';
import {
    createLoredeckActionRow,
    setLoredeckActionButtonBusy,
} from '../loredecks/loredeck-action-rows.js';
import {
    buildLoredeckRecordFromManifest,
    fetchLoredeckManifest,
    resolveManifestUrlForFetch,
} from './loredeck-manifest-runtime.js';
import {
    canUseGeneratedVirtualLoredeckData,
    canUseVirtualLoredeckData,
    canValidateLoredeckInEditor,
    getAcceptedGeneratedLoredeckEntries,
    getAcceptedVirtualLoredeckEntries,
    isGeneratedLoredeckPack,
    isVirtualLoredeckPack,
    refreshGeneratedLoredeckDerivedMetadata,
} from './loredeck-virtual-data.js';
import {
    hydrateCachedExternalLorepackPayloadRecord,
    hydrateExternalLorepackPayloadRecord,
    flushSagaLorepackPayloadStorageWrites,
    isCompactExternalLorepackPayloadRecord,
} from '../storage/saga-lorepack-payload-storage.js';
import {
    flushSagaLorepackLibraryStorageWrites,
    getExternalLoredeckLibraryRegistry,
} from '../storage/saga-lorepack-library-storage.js';
import {
    flushSagaCreatorProjectStorageWrites,
} from '../storage/saga-creator-project-storage.js';
import {
    getLoredeckSourceSummary,
} from './loredeck-source-summary.js';
import {
    createLoredeckManifestPreview,
} from './loredeck-manifest-preview.js';
import {
    createLoredeckPreviewCacheController,
} from './loredeck-preview-cache.js';
import {
    createGeneratedLoredeckExportReadinessCard,
} from './loredeck-generated-export-card.js';
import {
    getGeneratedLoredeckExportReadiness,
} from './loredeck-generated-readiness.js';
import {
    getState,
    getSettings,
    saveSettings,
    saveState,
    createStateBackup,
    appendPendingLoreEntries,
    restoreLoreTimelineEntriesToPending,
    setLoreContext,
    getLoredeckContext,
    setLoredeckContext,
    resetLoredeckContext,
    getLoredeckLibraryRegistry,
    persistLoredeckLibraryLayout,
    upsertLoredeckLibraryPack,
    removeLoredeckLibraryPack,
    getLoredeckCreatorRegistry,
    getActiveLoredeckCreatorJob,
    activateLoredeckCreatorJob,
    updateLoredeckCreatorProject,
    upsertLoredeckCreatorJob,
    updateLoredeckCreatorGenerationRun,
    updateLoredeckCreatorGenerationUnit,
    clearLoredeckCreatorJob,
} from '../state/state-manager.js';
import { runLoreContextDetection, runBulkLoreGeneration } from '../lorecards/lore-generator.js';
import {
    sendLoreRequest,
    validateLoreProviderConfiguration,
} from '../providers/lore-llm-client.js';
import {
    LORE_RESPONSE_ERROR_CODES,
} from '../providers/lore-response-normalizer.js';
import { proposeCanonLoreForContext, previewCanonLoreForContext, addCanonLorePreviewEntriesToPending, loadCanonLoreDatabase, getCanonLoreDatabaseSync, clearCanonLoreDatabaseCache } from '../context/canon-lore-db.js';
import { mergeLoredeckTimelineRegistries, normalizeLoredeckEntryForSchemaV3 } from '../loredecks/loredeck-loader.js';
import {
    guardLoredeckCreatorEntryDraftChange,
    normalizeCreatorSchemaV3EntryOverride,
} from '../loredecks/loredeck-creator-entry-guard.js';
import {
    preflightLoredeckCreatorEntryTargets,
} from '../loredecks/loredeck-creator-entry-preflight.js';
import {
    buildLoredeckCreatorEntryRejectionDiagnostics,
    buildLoredeckCreatorEntryRetryContextByTarget,
    createLoredeckCreatorEntryGuardRejectedAllError,
    getLoredeckCreatorEntryRejectedTargetIds,
    isLoredeckCreatorEntryGuardRejectedAllError,
    summarizeLoredeckCreatorEntryRejections,
} from '../loredecks/loredeck-creator-entry-rejection-diagnostics.js';
import {
    getLoredeckCreatorLorecardsStageState,
} from '../loredecks/loredeck-creator-pipeline-status.js';
import {
    buildLoredeckAssistantSystemPrompt,
    buildLoredeckAssistantUserPrompt,
    parseLoredeckAssistantResponse,
    parseLoredeckCreatorBriefResponse,
    parseLoredeckCreatorOutlineResponse,
    parseLoredeckCreatorTitleResponse,
    extractLoredeckAssistantResponseText,
} from '../loredecks/loredeck-assistant.js';
import { analyzeContextQuery, clearContextIndexCache, findContextAnchors, getContextIndexSync, loadContextIndex, normalizeContextSearchText, rankContextAnchors, contextTextIncludesTerm } from '../context/context-index.js';
import { applyContextResolutionResults, buildContextResolutionAudit, buildResolverContextFromState, resolveAndApplyContextsFromContext, resolveContextsWithModel } from '../context/context-resolver.js';
import {
    runAutoRelevance,
    applyAutoRelevanceSuggestions,
    applyLoreAutomationSuggestions,
    clearAutoRelevanceSuggestions,
    clearLoreAutomationSuggestions,
    rejectAutoRelevanceSuggestions,
    rejectLoreAutomationSuggestions,
    undoLastLoreAutomationRun,
} from '../context/auto-relevance.js';
import {
    buildFolderTree,
    createFolderIdFromPath,
    getFolderPath,
    normalizeLoredeckLibraryIndex,
    normalizePackLibraryMetadata,
    resolveLoredeckStackItems,
} from '../loredecks/loredeck-library-index.js';
import {
    resolveLoredeckLibraryDragFeedback,
} from '../loredecks/loredeck-library-drag.js';
import {
    sortLoredeckLibraryPacks,
} from '../loredecks/loredeck-library-view.js';
import {
    GENERATION_ERROR_CODES,
} from '../generation/generation-job-runner.js';
import {
    redactDiagnosticValue,
} from './runtime-redaction.js';
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
} from '../loredecks/loredeck-library-service.js';
import {
    captureLoreTimelineState,
    recordLoreTimelineEvent,
    getRecoverableTimelineEntries,
} from '../lorecards/lore-timeline.js';
import {
    DEFAULT_HP_LOREDECK_ID,
    HP_LEGACY_LOREDECK_ID,
    getDefaultLoredeckContextType,
} from '../loredecks/loredeck-defaults.js';
import {
    addTooltip,
    chooseAction,
    confirmAction,
    createBadge,
    createButton,
    createEmptyMessage,
    createKeyValue,
    createSectionHeader,
    createStatusPill,
    createToggleCard,
    formatStructuredValue,
    hasDisplayableScope,
    humanizeScopeKey,
    isPlainObjectValue,
    promptTextAction,
    runBusyAction,
    setChipTone,
    showNoticePopup,
    toast,
    wireOverlayBackdropClose,
} from '../ui/runtime-ui-kit.js';
import {
    clampSettingConfidence,
    formatCategoryCounts,
    sanitizeFileStem,
    truncateText,
} from './runtime-formatters.js';
import {
    downloadBytes,
    downloadJson,
} from './runtime-downloads.js';
import {
    TAB_ICON_PATHS,
    applyRuntimeTheme,
    getAssetSrc,
    normalizeAssetRef,
} from '../theme/runtime-theme.js';
import {
    closeSagaTour,
    markTourTarget,
} from './runtime-tour.js';
import { getRuntimeGuideSteps } from './runtime-guide-content.js';
import {
    TAB_ICONS,
    TAB_LABELS,
    isBasicExperience,
    normalizeExperienceMode,
    normalizeTab,
    normalizeTabForExperience,
} from './runtime-navigation.js';
import {
    applyRuntimeShellGeometry,
    disposeRuntimeShellInteractions,
    clampRuntimeShellToViewport,
    clampNumber,
    getActiveNestedScrollElement,
    getActiveTabScrollElement,
    getConstrainedDrawerHeight,
    getConstrainedDrawerWidth,
    getRailWidth,
    isRuntimeMobileShell,
    normalizeRailMode,
    normalizePanelLayoutState,
    resetRuntimePanelLayout,
    resolveDrawerDirection,
    toggleRuntimeDrawerForTab,
    toggleRuntimeRailMode,
    updateDrawerScrollMetrics,
} from './runtime-shell.js';
import {
    refreshRuntimeHeader,
    refreshRuntimeRailIcons as refreshRuntimeRailIconImages,
    disposeRuntimeShellView,
    renderPanelFallbackShell,
    renderPanelShell,
} from './runtime-shell-view.js';
import {
    buildLoredeckHealthPackSummary,
    buildLoredeckHealthReport,
    collectLoredeckHealthIssueTags,
    formatRelativeHealthTime,
    getCachedLoredeckHealthRecord,
    getLoredeckHealthStatusDescriptor,
    groupLoredeckHealthIssues,
    normalizeLoredeckHealthSeverity,
    openLoredeckHealthCenter,
    suggestLoredeckMachineId,
} from '../loredecks/loredeck-health-panel.js';
import {
    buildLoredeckPackScopedHealth,
    clearLoredeckLibrarySelectedFolderDetails,
    closeLoredeckLibraryWindow,
    createLoredeckDeckVisual,
    createLoredeckLibraryEditableTitle,
    getBundledLoredeckLibraryRecords,
    getLoredeckLibraryFolderPacks,
    getLoredeckLibraryIndexForPacks,
    getLoredeckLibraryPackFolderId,
    getLoredeckLibraryPackMap,
    getLoredeckLibraryStackStats,
    getLoredeckPackSummaryCounts,
    getMutableLoredeckLibraryRegistry,
    isLoredeckLibraryOpen,
    normalizeLoredeckLibraryInlineTitle,
    openLoredeckLibraryDetails,
    openLoredeckLibraryWindow,
    openLoredeckMetadataEditor,
    refreshLoredeckLibrarySelectionSurfaces,
    refreshLoredeckSurfaces,
    renderLoredeckLibraryOverlay,
    saveLoredeckLibraryFolderRecords,
    scheduleLoredeckLibraryOverlayRefresh,
    setLoredeckLibraryBulkSelection,
    setLoredeckLibrarySelectedFolder,
} from '../loredecks/loredeck-library-panel.js';
import {
    closeLoredeckWorkbench,
    openLoredeckWorkbench,
} from '../loredecks/loredeck-workbench-panel.js';
import {
    appendLoredeckCreatorGenerationStatus,
    compactLoredeckCreatorTitleDraftForRevision,
    closeLoredeckCreatorWorkbench,
    configureLoredeckCreatorPanel,
    countLoredeckCreatorTitleQualityWarnings,
    createLoredeckCreatorArtifactDisclosure,
    createLoredeckCreatorBriefReview,
    createLoredeckCreatorCurrentTaskCard,
    createLoredeckCreatorEntryDraftCard,
    createLoredeckCreatorOutlineCard,
    createLoredeckCreatorPendingReviewCard,
    createLoredeckCreatorPipelineHeader,
    createLoredeckCreatorPipelineReadinessCard,
    createLoredeckCreatorPlanningCard,
    createLoredeckCreatorStageGuide,
    createLoredeckCreatorTitlePassCard,
    getLoredeckCreatorGenerationWaitMessage,
    getLoredeckCreatorNextTitleBatch,
    getLoredeckCreatorOutlineRows,
    getLoredeckCreatorRemainingTitleBatches,
    getLoredeckCreatorTitleBatchIdentity,
    getLoredeckCreatorTitleBatchRows,
    getLoredeckCreatorTitleDraftedBatchIds,
    getLoredeckCreatorTitleDrafts,
    normalizeLoredeckCreatorTitleDrafts,
    normalizeLoredeckCreatorTitleId,
    normalizeLoredeckCreatorTitleIdList,
    openLoredeckCreatorWorkbench as openLoredeckCreatorWorkbenchBase,
    prepareLoredeckCreatorTourTarget,
    queueLoredeckCreatorWorkbenchRefresh,
    refreshLoredeckCreatorGenerationStatusUi,
    refreshLoredeckCreatorTitleSelectionUi,
    refreshLoredeckCreatorWorkbenchBody,
    scrollLoredeckCreatorWorkbenchToAnchor,
} from '../loredecks/loredeck-creator-panel.js';
import {
    getLoredeckCreatorEntryDraftBatchId,
    getLoredeckCreatorUnhandledEntryDrafts,
    selectLoredeckCreatorEntryDraftBatchId,
} from '../loredecks/loredeck-creator-entry-draft-pool.js';
import {
    createLoredeckCreatorResetController,
} from '../loredecks/loredeck-creator-reset-controller.js';
import * as loredeckCreatorCoverage from '../loredecks/loredeck-creator-coverage.js';
import {
    createLoredeckCreatorCoverageFinalizationController,
} from '../loredecks/loredeck-creator-finalization.js';
import {
    createLoredeckCreatorCoverageActionsController,
} from '../loredecks/loredeck-creator-coverage-actions.js';
import {
    createContextAutomationAuditPanel,
    createContextResolutionAuditPanel,
    createContextResolutionProposalPanel,
    getContextPackSummary,
    renderContextProposalReview,
} from '../context/context-panel.js';

function openLoredeckCreatorWorkbench(options = {}) {
    const packId = String(options?.generatedPackId || options?.packId || '').trim();
    if (packId) {
        const job = getLoredeckCreatorJobForPack({ packId });
        if (job?.jobId) {
            const activated = activateLoredeckCreatorJob(job.jobId, { syncPrompt: false });
            loredeckCreatorWorkbenchCacheController.setCurrentJobLocal(activated?.job || job);
        }
    }
    openLoredeckCreatorWorkbenchBase(options);
}
import {
    formatContextBriefUpdatedAt,
} from '../context/context-formatters.js';
import {
    createContextWorkbenchPackSelector,
    createContextWorkbenchShell,
    getContextWorkbenchValidationIssues,
} from '../context/context-workbench-panel.js';
import {
    openLoreTimeline,
    refreshLoreTimeline,
} from '../lorecards/lore-timeline-panel.js';
import {
    configureLorecardsPanel,
    createAcceptedLoreBulkControls,
    createEntryCard,
    createNewLoreInput,
    createNewLoreSelect,
    createPendingLoreBulkControls,
    createPendingLoreReviewCard,
    appendEntrySourceAndContextBadges,
    getAcceptedSelectionSet,
    getFilteredLoreEntries,
    getLoreSourceBucket,
    openNewLoreDialog,
    closeLoreWorkbench,
    refreshLoreWorkbench,
    refreshAcceptedLoreCategoryTabs,
    refreshAcceptedLoreFilterResults,
    refreshAcceptedLoreList,
    renderAcceptedLoreEntryList,
    scheduleAcceptedLoreListRender,
    scoreSearchEntry,
    toggleAcceptedLoreSelection,
} from '../lorecards/lorecards-panel.js';
import {
    configureThemeActions,
} from '../settings/theme-actions.js';
import {
    createCollapsibleSection,
    setSectionCollapsed,
} from './runtime-collapsible.js';
import {
    CONTEXT_DETECTION_SETTING_KEYS,
    STORY_LORE_AUTOMATION_SETTING_KEYS,
    STORY_LORE_SCAN_PERFORMANCE_SETTING_KEYS,
    STORY_LORE_SCAN_QUALITY_SETTING_KEYS,
    STORY_LORE_SCAN_SCOPE_SETTING_KEYS,
} from './runtime-setting-groups.js';

const PANEL_ID = 'saga-lore-panel';
const LORE_TIMELINE_ID = 'saga-lore-timeline';
const CONTEXT_WORKBENCH_ID = 'saga-context-workbench';
const CONTEXT_TYPE_OPTIONS = Object.freeze([
    ['calendar', 'Calendar'],
    ['anchor', 'Anchor'],
    ['anchor_window', 'Anchor Window'],
    ['arc', 'Arc'],
    ['phase', 'Phase'],
    ['season_episode', 'Season / Episode'],
    ['stardate', 'Stardate'],
    ['relative', 'Relative'],
    ['hybrid', 'Hybrid'],
    ['custom', 'Custom'],
]);

const CONTEXT_SOURCE_OPTIONS = Object.freeze([
    ['manual', 'Manual'],
    ['header', 'Header'],
    ['local_alias', 'Local Alias'],
    ['model', 'Model'],
    ['imported', 'Imported'],
    ['unknown', 'Unknown'],
]);

const loredeckPreviewCacheController = createLoredeckPreviewCacheController({
    clearDraftCache: packId => loredeckAssistantDraftCacheController.deleteRecord(packId),
});
let loredeckEntryOverrideQuery = '';
let loredeckTagManagerQuery = '';
let loredeckTimelineRegistryQuery = '';
let loredeckAssistantInstruction = '';
let loredeckAssistantMode = 'revise_entries';
let loredeckAssistantTargetScope = 'current_filter';
let loredeckAssistantRevisionInstruction = '';
let loredeckCreatorFandom = '';
let loredeckCreatorScope = '';
let loredeckCreatorGranularity = 'focused';
let loredeckCreatorNotes = '';
let loredeckCreatorRevisionInstruction = '';
let loredeckCreatorOutlineRevisionInstruction = '';
let loredeckCreatorTitleRevisionInstruction = '';
const loredeckCreatorWorkbenchCacheController = createLoredeckCreatorWorkbenchCacheController({
    getActiveGeneration: job => getActiveLoredeckCreatorGeneration(job),
    getGenerationController: generationId => getLoredeckCreatorGenerationController(generationId),
    deleteGenerationController: generationId => deleteLoredeckCreatorGenerationController(generationId),
    forgetLiveGeneration: generation => forgetLoredeckCreatorLiveGeneration(generation),
    stopGenerationTicker: () => stopLoredeckCreatorGenerationTicker(),
    clearDraftInputs: () => clearLoredeckCreatorDraftInputs(),
    refreshWorkbenchBody: options => refreshLoredeckCreatorWorkbenchBody(options),
    getJobGeneratedPackId: job => getLoredeckCreatorJobGeneratedPackId(job),
});
const loredeckCreatorGenerationSettingsController = createLoredeckCreatorGenerationSettingsController({
    getCurrentJob: () => getLoredeckCreatorBriefCache(),
    setCurrentJob: (job, options) => setLoredeckCreatorBriefCache(job, options),
    setCurrentJobLocal: job => loredeckCreatorWorkbenchCacheController.setCurrentJobLocal(job),
    validateProvider: providerKind => validateLoreProviderConfiguration(providerKind),
});
const loredeckCreatorGenerationProgressController = createLoredeckCreatorGenerationProgressController({
    getCurrentJob: () => getLoredeckCreatorBriefCache(),
    setCurrentJob: (job, options) => setLoredeckCreatorBriefCache(job, options),
    setCurrentJobLocal: job => loredeckCreatorWorkbenchCacheController.setCurrentJobLocal(job),
    queueWorkbenchRefresh: () => queueLoredeckCreatorWorkbenchRefresh(),
    refreshGenerationStatusUi: generationId => refreshLoredeckCreatorGenerationStatusUi(generationId),
    getGenerationWaitMessage: active => getLoredeckCreatorGenerationWaitMessage(active),
    getGenerationSettings: () => getLoredeckCreatorGenerationSettings(),
});
const loredeckCreatorGenerationSessionController = createLoredeckCreatorGenerationSessionController({
    getCurrentJob: () => getLoredeckCreatorBriefCache(),
    setCurrentJob: (job, options) => setLoredeckCreatorBriefCache(job, options),
    setCurrentJobLocal: job => loredeckCreatorWorkbenchCacheController.setCurrentJobLocal(job),
    getGenerationSettings: job => getLoredeckCreatorGenerationSettings(job),
    getActiveGeneration: job => getActiveLoredeckCreatorGeneration(job),
    inferUiStage: job => inferLoredeckCreatorUiStage(job),
    startTicker: generationId => startLoredeckCreatorGenerationTicker(generationId),
    stopTicker: () => stopLoredeckCreatorGenerationTicker(),
    queueWorkbenchRefresh: () => queueLoredeckCreatorWorkbenchRefresh(),
    toast,
});
const loredeckCreatorGenerationController = createLoredeckCreatorGenerationController({
    getGenerationSettings: () => getLoredeckCreatorGenerationSettings(),
    getGenerationJobId: generation => getLoredeckCreatorGenerationJobId(generation),
    getGenerationController: generationId => getLoredeckCreatorGenerationController(generationId),
    makeProgressHandler: (generation, options) => makeLoredeckCreatorProgressHandler(generation, options),
    waitForUiPaint: () => waitForLoredeckCreatorUiPaint(),
    isGenerationCurrent: generation => isLoredeckCreatorGenerationCurrent(generation),
    updateGeneration: (generation, event, options) => updateLoredeckCreatorGeneration(generation, event, options),
    updateGenerationRun: async (jobId, run, options) => acknowledgeLoredeckCreatorGenerationWrite(await updateLoredeckCreatorGenerationRun(jobId, run, options)),
    updateGenerationUnit: async (jobId, unitId, unit, options) => acknowledgeLoredeckCreatorGenerationWrite(await updateLoredeckCreatorGenerationUnit(jobId, unitId, unit, options)),
    extractResponseText: raw => extractLoredeckAssistantResponseText(raw),
    buildFailureDiagnostic: (payload, unitConfig, requestOptions) => buildLoredeckCreatorGenerationFailureDiagnostic(payload, unitConfig, requestOptions, { redactDiagnostic: redactDiagnosticValue }),
    formatFailureMessage: (error, fallback, label) => formatLoredeckCreatorGenerationFailureMessage(error, fallback, label),
    warnFailure: (error, context) => warnLoredeckCreatorGenerationFailure(error, context),
});
const loredeckCreatorGeneratedPackCacheController = createLoredeckCreatorGeneratedPackCacheController({
    getLoredeckDefinition,
    hydrateCachedPayload: pack => hydrateCachedExternalLorepackPayloadRecord(pack),
    hydratePayload: pack => hydrateExternalLorepackPayloadRecord(pack),
    cloneJson: value => cloneLoredeckJson(value),
    getTagRegistryCount: registry => getLoredeckTagRegistryCount(registry),
    getTimelineRegistryCount: registry => getLoredeckTimelineRegistryCount(registry),
    clearRelatedPackCaches: (packId, options = {}) => loredeckPreviewCacheController.clearPackCaches(packId, options),
    refreshCreatorWorkbench: options => refreshLoredeckCreatorWorkbenchBody(options),
    refreshPanelBody: options => refreshPanelBody(options),
    warn: (message, error) => console.warn(message, error),
});
const loredeckAssistantDraftCacheController = createLoredeckAssistantDraftCacheController({
    getDraftChanges: record => getLoredeckAssistantDraftChanges(record),
    countQualityWarnings: changes => countLoredeckAssistantQualityWarningsForChanges(changes),
});
const loredeckAssistantDraftHandoffController = createLoredeckAssistantDraftHandoffController({
    getDraftCacheForPack: packId => getLoredeckCreatorDraftCacheForPack(packId),
    getDraftChanges: cache => getLoredeckAssistantDraftChanges(cache),
    normalizePendingIds: ids => normalizeLoredeckPendingIdList(ids),
    getFreshPack: (packId, fallback) => getFreshLoredeckLibraryPack(packId, fallback),
    hydratePayload: pack => hydrateExternalLorepackPayloadRecord(pack),
    queuePendingChanges: (pack, selected, message) => queueLoredeckPendingChanges(pack, selected, message),
    confirmStorage: (label, options) => confirmLoredeckAssistantDraftStorage(label, options),
    updateDraftAfterRemoval: (packId, removedIds, queuedCountDelta) => updateLoredeckAssistantDraftAfterRemoval(packId, removedIds, queuedCountDelta),
    refreshDraftSurfaces: () => refreshLoredeckAssistantDraftSurfaces(),
    toast,
    warn: (message, error) => console.warn(message, error),
});
const loredeckCreatorCoverageFinalizationController = createLoredeckCreatorCoverageFinalizationController({
    getCurrentJob: () => getLoredeckCreatorBriefCache(),
    getGeneratedPackDefinition: packId => getLoredeckCreatorGeneratedPackDefinition(packId),
    getCoverageModel: (cached, generatedPack) => getLoredeckCreatorCoverageModel(cached, generatedPack),
    setCurrentJob: (job, options) => setLoredeckCreatorBriefCache(job, options),
    setCurrentJobLocal: job => loredeckCreatorWorkbenchCacheController.setCurrentJobLocal(job),
    updateCreatorProject: (jobId, patch, options) => updateLoredeckCreatorProject(jobId, patch, options),
    inferUiStage: job => inferLoredeckCreatorUiStage(job),
    refreshPanelBody: options => refreshPanelBody(options),
    refreshWorkbenchBody: options => refreshLoredeckCreatorWorkbenchBody(options),
    confirmAction,
    toast,
});
const loredeckCreatorCoverageActionsController = createLoredeckCreatorCoverageActionsController({
    getCurrentJob: () => getLoredeckCreatorBriefCache(),
    getGeneratedPackDefinition: packId => getLoredeckCreatorGeneratedPackDefinition(packId),
    getCoverageModel: (cached, generatedPack) => getLoredeckCreatorCoverageModel(cached, generatedPack),
    setCurrentJob: (job, options) => setLoredeckCreatorBriefCache(job, options),
    refreshPanelBody: options => refreshPanelBody(options),
    toast,
});
const loredeckCreatorResetController = createLoredeckCreatorResetController({
    getCurrentJob: () => getLoredeckCreatorBriefCache(),
    getActiveGeneration: job => getActiveLoredeckCreatorGeneration(job),
    getLoredeckDefinition,
    getFreshPack: (packId, fallback) => getFreshLoredeckLibraryPack(packId, fallback),
    isGeneratedPack: pack => isGeneratedLoredeckPack(pack),
    isVirtualPack: pack => isVirtualLoredeckPack(pack),
    removeGeneratedPackFromStack: packId => removeLoredeckCreatorGeneratedPackFromStack(packId),
    removeLibraryPack: (packId, options) => removeLoredeckLibraryPack(packId, options),
    clearPackCaches: (packId, options) => clearLoredeckCreatorResetPackCaches(packId, options),
    clearSelectedPackIfMatches: packId => clearLoredeckCreatorSelectedPackIfMatches(packId),
    hydratePayload: pack => hydrateExternalLorepackPayloadRecord(pack),
    buildEmbeddedManifest: (manifest, pack) => buildEmbeddedCustomManifest(manifest, pack),
    upsertLibraryPack: pack => upsertLoredeckLibraryPack(pack),
    setCurrentJob: (job, options) => setLoredeckCreatorBriefCache(job, options),
    clearCanonCache: () => clearCanonLoreDatabaseCache(),
    clearContextCache: () => clearContextIndexCache(),
    refreshLoredeckSurfaces: options => refreshLoredeckSurfaces(options),
    refreshPanelBody: options => refreshPanelBody(options),
    refreshWorkbenchBody: options => refreshLoredeckCreatorWorkbenchBody(options),
    scrollWorkbenchToAnchor: anchor => scrollLoredeckCreatorWorkbenchToAnchor(anchor),
    confirmAction,
    toast,
});

function clearLoredeckCreatorDraftInputs() {
    loredeckCreatorFandom = '';
    loredeckCreatorScope = '';
    loredeckCreatorGranularity = 'focused';
    loredeckCreatorNotes = '';
}

configureLoredeckEditorComposition({
    getState,
    getLoredeckLibrary,
    getLoredeckDefinition,
    getFreshLoredeckLibraryPack,
    upsertLoredeckLibraryPack,
    validateLoredeckForEditor,
    getExpectedLoredeckEntrySchemaVersion,
    getLoredeckPendingChanges,
    normalizeLoredeckTagRegistry,
    normalizeLoredeckTimelineRegistry,
    clearCanonLoreDatabaseCache,
    clearContextIndexCache,
    refreshLoredeckSurfaces,
    toast,
    downloadBytes,
    selectLoredeckForDetails,
    confirmAction,
    createStateBackup,
    getLoredeckCreatorJobForPack,
    buildLoredeckCreatorCoverageFinalizationProvenance,
    retireGeneratedLoredeckAfterFinalization,
    openLoredeckMetadataEditor,
    isLoredeckLibraryOpen,
    renderLoredeckLibraryOverlay,
    addLoredeckToStack,
    loredeckPreviewCacheController,
    loredeckAssistantDraftCacheController,
    getLoredeckOverrideState,
    getLoredeckEditableEntryRows,
    filterLoredeckEditableEntryRows,
    getLoredeckEntryOverrideQuery: () => loredeckEntryOverrideQuery,
    setLoredeckEntryOverrideQuery: value => { loredeckEntryOverrideQuery = String(value || '').trim(); },
    refreshPanelBody,
    loadLoredeckEntriesForEditor,
    canValidateLoredeckInEditor,
    openLoredeckEntryOverrideDialog,
    openLoredeckBulkTagsDialog,
    openLoredeckBulkContextDialog,
    attemptLoredeckHealthFixes,
    createLoredeckPendingReviewCard,
    createLoredeckAssistantCard,
    createLoredeckTimelineRegistryCard,
    createLoredeckTagManagerCard,
    setLoredeckEntryDisabled,
    removeLoredeckEntryOverride,
    getLoredeckEmbeddedTimelineRegistry,
    buildLoredeckTimelineRegistryItems,
    buildMergedLoredeckTimelineRegistryForExport,
    getLoredeckTimelineRegistryCount,
    getLoredeckTimelineRegistryQuery: () => loredeckTimelineRegistryQuery,
    setLoredeckTimelineRegistryQuery: value => { loredeckTimelineRegistryQuery = String(value || '').trim(); },
    openLoredeckTimelineAnchorDialog,
    openLoredeckTimelineWindowDialog,
    setLoredeckTimelineItemDisabled,
    removeLoredeckTimelineDefinition,
    downloadJson,
    sanitizeFileStem,
    getLoredeckEmbeddedTagRegistry,
    buildLoredeckTagManagerItems,
    buildMergedLoredeckTagRegistryForExport,
    getLoredeckTagRegistryCount,
    getLoredeckTagManagerQuery: () => loredeckTagManagerQuery,
    setLoredeckTagManagerQuery: value => { loredeckTagManagerQuery = String(value || '').trim(); },
    getLoredeckEntryRowsForBulk,
    getLoredeckEntryTags,
    humanizeLoredeckTagId,
    openLoredeckTagRegistryDialog,
    openLoredeckTagRenameDialog,
    removeLoredeckTagRegistryDefinition,
    normalizeLoredeckTagId,
    normalizeLoredeckTimelineId,
    normalizeLoredeckTimelineDisabledIds,
    normalizeLoredeckTagDefinition,
    normalizeLoredeckTimelineAnchor,
    normalizeLoredeckTimelineWindow,
    normalizeLoredeckPatchEntryOverride: (record, rawEntry, id) => {
        const schemaVersion = Math.max(
            Number(rawEntry?.schemaVersion) || 0,
            getExpectedLoredeckEntrySchemaVersion(record)
        );
        return schemaVersion >= 3
            ? normalizeCreatorSchemaV3EntryOverride(record, rawEntry, id)
            : rawEntry;
    },
    parseLoredeckEntryTags,
    getLoredeckCachedSourceTagRegistry,
    getLoredeckCachedSourceTimelineRegistry,
    persistLoredeckLibraryRecordMutation,
    isGeneratedLoredeckPack,
    getAcceptedVirtualLoredeckEntries,
    flushLoredeckStorageWrites: flushLoredeckStorageWritesForAction,
    normalizeLoredeckCreatorTitleId,
    normalizeLoredeckCreatorTitleIdList,
    refreshGeneratedLoredeckDerivedMetadata,
    getLoredeckCreatorBriefCache,
    setLoredeckCreatorBriefCache,
    isLoredeckCreatorPlanningPendingChange,
    refreshLoredeckCreatorWorkbenchBody,
    refreshHeader,
    queueLoredeckPendingChange,
    createLoredeckRecordPatchChange,
    normalizeLoreEntry,
    normalizeLoredeckEntryForSchemaV3,
    doesLoredeckPendingChangeAffectPackHealth,
    isLoredeckHealthStatusStale,
    createLoredeckPendingHealthStalePill,
    createLoredeckPendingHealthImpactPill,
    formatLoredeckPendingActionLabel,
    formatLoredeckPendingTargetKindLabel,
    formatLoredeckPendingSourceLabel,
    getLoredeckPendingSourceTooltip,
    getLoredeckPendingConfidence,
    getLoredeckPendingRisk,
    createLoredeckPendingRiskPill,
    appendLoredeckPendingQualityPills,
    createLoredeckPendingDiffList,
    createLoredeckPendingRepairCandidateList,
    createLoredeckPendingQualityList,
    runBusyAction,
    acceptLoredeckPendingChanges,
    rejectLoredeckPendingChanges,
    openLoredeckHealthCenter,
    getLoredeckAssistantInstruction: () => loredeckAssistantInstruction,
    setLoredeckAssistantInstruction: value => { loredeckAssistantInstruction = String(value || '').trim(); },
    getLoredeckAssistantMode: () => loredeckAssistantMode,
    setLoredeckAssistantMode: value => { loredeckAssistantMode = String(value || 'revise_entries').trim() || 'revise_entries'; },
    getLoredeckAssistantTargetScope: () => loredeckAssistantTargetScope,
    setLoredeckAssistantTargetScope: value => { loredeckAssistantTargetScope = String(value || 'current_filter').trim() || 'current_filter'; },
    getLoredeckAssistantRevisionInstruction: () => loredeckAssistantRevisionInstruction,
    setLoredeckAssistantRevisionInstruction: value => { loredeckAssistantRevisionInstruction = String(value || '').trim(); },
    getLoredeckAssistantTargetRows,
    getLoredeckAssistantDraftChanges,
    getLoredeckAssistantSelectedDraftIds,
    countLoredeckAssistantQualityWarningsForChanges,
    humanizeScopeKey,
    createNewLoreInput,
    createNewLoreSelect,
    handleLoredeckAssistantDraft,
    handleLoredeckAssistantDraftRevision,
    queueLoredeckAssistantDraftSelection,
    dropLoredeckAssistantDraftSelection,
    setLoredeckAssistantDraftSelectionBulk,
    setLoredeckAssistantDraftSelection,
    openLoredeckAssistantDraftJsonEditor,
    markTourTarget,
    resolveManifestUrlForFetch,
    getGeneratedLoredeckExportReadiness,
    getLoredeckCreatorPipelineReadiness,
});

async function flushLoredeckStorageWritesForAction(options = {}) {
    const failures = [];
    if (options.payload !== false) {
        const payload = await flushSagaLorepackPayloadStorageWrites();
        if (payload?.ok === false) failures.push(payload.error || 'Loredeck payload write failed.');
    }
    if (options.library !== false) {
        const library = await flushSagaLorepackLibraryStorageWrites();
        if (library?.ok === false) failures.push(library.error || 'Loredeck library index write failed.');
    }
    if (options.creator === true) {
        const creator = await flushSagaCreatorProjectStorageWrites();
        if (creator?.ok === false) failures.push(creator.error || 'Deck Maker project write failed.');
    }
    return failures.length
        ? { ok: false, error: failures.join(' ') }
        : { ok: true, error: '' };
}

configureLoredeckWorkflowComposition({
    getState,
    saveState,
    getSettings,
    saveSettings,
    getDefaultState,
    isBasicExperience,
    isRuntimeMobileShell,
    getCanonLoreDatabaseSync,
    loadCanonLoreDatabase,
    clearCanonLoreDatabaseCache,
    resetCanonPreviewUiState,
    clearContextIndexCache,
    loadContextIndex,
    refreshPanelBody,
    refreshHeader,
    refreshLorePanel,
    sanitizeFileStem,
    downloadJson,
    clampNumber,
    formatCategoryCounts,
    getLoredeckStack,
    getLoredeckLibrary,
    getLoredeckLibraryRegistry,
    getLoredeckLibraryIndexForPacks,
    persistLoredeckLibraryLayout,
    normalizeLoredeckLibraryPack,
    getLoredeckDefinition,
    getFreshLoredeckLibraryPack,
    getLoredeckTypeLabel,
    getLoredeckSourceSummary,
    getLoredeckTagRegistryCount,
    getLoredeckTimelineRegistryCount,
    resolveLoredeckStackItems,
    buildLoredeckPackScopedHealth,
    buildLoredeckHealthPackSummary,
    getLoredeckPackSummaryCounts,
    isVirtualLoredeckPack,
    isGeneratedLoredeckPack,
    isBundledLoredeckLibraryPack,
    persistLoredeckLibraryRecordMutation,
    hydrateLoredeckPayloadRecord: hydrateExternalLorepackPayloadRecord,
    flushLoredeckPayloadWrites: flushSagaLorepackPayloadStorageWrites,
    validateLoredeckForEditor,
    canValidateLoredeckInEditor,
    attemptLoredeckHealthFixes,
    loadLoredeckManifestPreview,
    createLoredeckManifestPreview,
    createLoredeckEntryOverrideCard,
    getGeneratedLoredeckExportReadiness,
    createGeneratedLoredeckExportReadinessCard,
    createLoredeckEditorField,
    saveLoredeckMetadataFromInputs,
    syncLoredeckMetadataFromManifest,
    exportValidatedLoredeckDraft,
    refreshGeneratedLoredeckDerivedMetadata,
    finalizeGeneratedLoredeckAsCustom,
    installLoredeckBundleFromFile,
    exportSelectedLoredeckBundles,
    duplicateLoredeckLibraryPacksWithConfirm,
    duplicateLoredeckLibraryFolderWithContents,
    deleteLoredeckLibraryPacksWithConfirm,
    openDuplicateLoredeckDialog,
    openLoredeckWorkbench,
    openLoredeckHealthCenter,
    openLoredeckCreatorWorkbench,
    selectLoredeckForDetails,
    commitLoredeckStackMutation,
    addLoredeckToStack,
    addLoredeckFolderToStack,
    removeLoredecksFromStack,
    removeLoredeckStackItem,
    moveLoredeckStackItem,
    reorderLoredeckStackItem,
    setLoredeckEnabled,
    setLoredeckStackItemEnabled,
    setLoredeckStackItemCollapsed,
    getLoredeckStackItemType,
    getLoredeckStackItemKey,
    createLoredeckStackDeckKey,
    createLoredeckStackFolderKey,
    renderContextWorkbench,
    isLoredeckMalformedTagIssueGroup,
    queueLoredeckMalformedTagRepairFromHealthGroup,
    applyLoredeckHealthRepairChoice,
    reevaluateLoredeckHealthRepairChoice,
    cancelLoredeckHealthRepairRun,
    continueLoredeckHealthModelRepairSession,
    getLoredeckHealthRepairActiveRun,
    normalizeLoredeckHealthIssueStates,
    normalizeLoredeckPendingIdList,
    normalizeLoredeckPendingTimelineIdList,
    createCollapsibleSection,
    getLoredeckCreatorActiveGenerationByJobIdMap,
    getLoredeckCreatorBriefCache,
    getActiveLoredeckCreatorGeneration,
    refreshLoredeckCreatorWorkbenchBody,
    recoverLoredeckCreatorInterruptedActiveGeneration,
    attachLoredeckCreatorLiveGeneration,
    setLoredeckCreatorBriefCacheEntry: (key, value) => loredeckCreatorWorkbenchCacheController.setEntry(key, value),
    deleteLoredeckCreatorBriefCacheEntry: key => loredeckCreatorWorkbenchCacheController.deleteEntry(key),
    setLoredeckCreatorDraftInputs: values => {
        loredeckCreatorFandom = values?.fandom || '';
        loredeckCreatorScope = values?.scope || '';
        loredeckCreatorGranularity = values?.granularity || 'focused';
        loredeckCreatorNotes = values?.notes || '';
    },
    clearLoredeckCreatorDraftInputs,
    removeLoredeckCreatorGeneratedPackFromStack,
    loredeckPreviewCacheController,
    markTourTarget,
});

configureLoredeckCreatorPanel({
    getState,
    getLoredeckCreatorBriefCache,
    getLoredeckCreatorPipelineModel,
    createLoredeckCreatorCard,
    recoverLoredeckCreatorCurrentActiveGenerationOnOpen,
    cancelLoredeckCreatorGeneration,
    createLoredeckCreatorCurrentTaskActions,
    getLoredeckCreatorLatestRecoverableUnit,
    formatLoredeckCreatorRecoveryStageLabel,
    formatRelativeHealthTime,
    createLoredeckCreatorBriefRevisionForm,
    createLoredeckCreatorOutlineActionForm,
    getLoredeckCreatorSelectedTitleIds,
    getLoredeckCreatorApprovedTitleIds,
    getLoredeckCreatorGenerationSettings,
    applyLoredeckCreatorGenerationButtonLock,
    handleLoredeckCreatorTitleDraft,
    handleLoredeckCreatorRemainingTitleBatches,
    approveLoredeckCreatorTitleSelection,
    unapproveLoredeckCreatorTitleSelection,
    dropLoredeckCreatorTitleSelection,
    setLoredeckCreatorTitleSelectionBulk,
    setLoredeckCreatorTitleSelection,
    getLoredeckCreatorSelectedTitleDrafts,
    getLoredeckCreatorTitleRevisionInstruction: () => loredeckCreatorTitleRevisionInstruction,
    setLoredeckCreatorTitleRevisionInstruction: value => {
        loredeckCreatorTitleRevisionInstruction = String(value || '').trim();
        return loredeckCreatorTitleRevisionInstruction;
    },
    appendLoredeckPendingQualityPills,
    createLoredeckPendingQualityList,
    openLoredeckCreatorTitleJsonEditor,
    acknowledgeLoredeckCreatorCoverageForFinalize,
    handleLoredeckCreatorResetToStep,
    getLoredeckCreatorPlanningBatchRows,
    getLoredeckCreatorPlanningQueuedBatchIds,
    getLoredeckCreatorPlanningPendingBatchIds,
    getLoredeckCreatorNextPlanningBatch,
    countLoredeckCreatorPlanningPendingChanges,
    getLoredeckDefinition: getLoredeckCreatorGeneratedPackDefinition,
    handleLoredeckCreatorPlanningDraft,
    openLoredeckLibraryDetails,
    getLoredeckStack,
    addLoredeckToStack,
    getLoredeckCreatorAcceptedPlanningStatus,
    getLoredeckCreatorPlanningAcceptedBatchIds,
    getLoredeckCreatorEntryDraftProgress,
    getLoredeckCreatorEntryTargetTitles,
    getLoredeckCreatorDraftChanges: packId => getLoredeckAssistantDraftChanges(getLoredeckCreatorDraftCacheForPack(packId)),
    getLoredeckCreatorPendingEntryCount: pack => getLoredeckPendingChanges(pack).filter(change => (change.affectedEntryIds || []).length).length,
    getLoredeckCreatorAcceptedEntryCount: pack => Object.keys(pack?.entryOverrides || {}).length,
    getFreshLoredeckLibraryPack: (packId, fallback = null) => getLoredeckCreatorGeneratedPackDefinition(packId) || getFreshLoredeckLibraryPack(packId, fallback),
    handleLoredeckCreatorEntryDraft,
    confirmAction,
    createLoredeckPendingReviewCard,
    validateLoredeckForEditor,
    openLoredeckHealthCenter,
    attemptLoredeckHealthFixes,
    refreshPanelBody,
    refreshHeader,
    isRuntimeMobileShell,
    getLoredeckCreatorPipelineReadinessView: (pack, cached = null, renderModel = null) => {
        if (!isGeneratedLoredeckPack(pack)) return null;
        if (renderModel?.cached === cached && renderModel.generatedPack === pack && renderModel.readiness) {
            return { readiness: renderModel.readiness, pipeline: renderModel.readiness.pipeline || renderModel.pipeline };
        }
        const linkedJob = cached || getLoredeckCreatorJobForPack(pack);
        const cachedHealth = getCachedLoredeckCreatorPackHealth(pack);
        const readiness = getGeneratedLoredeckExportReadiness(pack, cachedHealth, linkedJob);
        const pipeline = readiness.pipeline || getLoredeckCreatorPipelineReadiness(pack, linkedJob);
        return { readiness, pipeline };
    },
    createLoredeckCreatorDraftReviewSection: pack => {
        if (!pack?.packId) return null;
        const draftCache = getLoredeckCreatorDraftCacheForPack(pack.packId);
        const rows = getLoredeckEditableEntryRows(pack, []);
        return createLoredeckAssistantDraftBatchCard(pack, draftCache, rows, rows);
    },
    getLoredeckCreatorDraftInputs: () => ({
        fandom: loredeckCreatorFandom,
        scope: loredeckCreatorScope,
        granularity: loredeckCreatorGranularity,
        notes: loredeckCreatorNotes,
    }),
    formatLoredeckCreatorGranularity,
    markTourTarget,
});

configureContextComposition({
    getContextWorkbenchStack,
    getLoredeckContext,
    getLoredeckDisplayName,
    getContextTypeLabel,
    formatContextSource,
    formatContextSummary,
    hasSelectedLoredeckContext,
    getContextAutomationModeLabel,
    getContextBriefStatusLabel,
    getContextBriefStatusTone,
    getContextResolutionProposals,
    openContextWorkbenchForPack,
    toggleLoredeckContextManualLock,
    seedLoredeckContextFromRuntimeContext,
    applyContextResolutionProposalSet,
    dismissContextResolutionProposalSet,
    markTourTarget,
    handleDetectStoryContext,
    handleResolveContextsFromContext,
    handleModelResolveContexts,
    appendGenerationStatus,
    createContextBriefStatusCard,
    createCollapsibleSection,
    createContextEditorCard,
    getState,
    getSettings,
    saveSettings,
    refreshPanelBody,
    refreshHeader,
    resetSettingKeysToDefaults,
    contextDetectionSettingKeys: CONTEXT_DETECTION_SETTING_KEYS,
    isBasicExperience,
    confirmAction,
    resetLoredeckContext,
    toast,
    getContextWorkbenchTab: () => contextWorkbenchTab,
    setContextWorkbenchTab: tabId => {
        contextWorkbenchTab = ['context', 'timeline', 'aliases', 'validation'].includes(tabId) ? tabId : 'context';
    },
    getContextWorkbenchPackId: () => contextWorkbenchPackId,
    setContextWorkbenchPackId: packId => {
        contextWorkbenchPackId = String(packId || '').trim();
    },
    clearContextWorkbenchSelectedKey: () => {
        contextWorkbenchSelectedKey = '';
    },
    setContextWorkbenchSelectedKey: itemKey => {
        contextWorkbenchSelectedKey = String(itemKey || '');
    },
    renderContextWorkbench,
    closeContextWorkbench,
    isRuntimeMobileShell,
    clearContextIndexCache,
    loadContextIndex,
    getContextWorkbenchPack,
    getContextWorkbenchTimelineItems,
    filterContextWorkbenchTimelineItems,
    getContextTimelineItemKey,
    getContextTimelineItemContextText,
    getContextTimelineItemCoordinateText,
    getContextWorkbenchQuery: () => contextWorkbenchQuery,
    setContextWorkbenchQuery: query => {
        contextWorkbenchQuery = String(query || '');
    },
    getContextWorkbenchSelectedKey: () => contextWorkbenchSelectedKey,
    getContextWorkbenchStoryPositionQuery: () => contextWorkbenchStoryPositionQuery,
    setContextWorkbenchStoryPositionQuery: query => {
        contextWorkbenchStoryPositionQuery = String(query || '').trim();
    },
    getContextWorkbenchTypeFilter: () => contextWorkbenchTypeFilter,
    setContextWorkbenchTypeFilter: typeFilter => {
        contextWorkbenchTypeFilter = ['all', 'anchor', 'window'].includes(typeFilter) ? typeFilter : 'all';
    },
    getContextWorkbenchStoryPositionFilter: () => contextWorkbenchStoryPositionFilter,
    setContextWorkbenchStoryPositionFilter: filter => {
        contextWorkbenchStoryPositionFilter = String(filter || 'major');
    },
    getContextWorkbenchResolverQuery: () => contextWorkbenchResolverQuery,
    setContextWorkbenchResolverQuery: query => {
        contextWorkbenchResolverQuery = String(query || '').trim();
    },
    commitLoredeckContextPatch,
    refreshLoredeckSurfaces,
    appendContextManualFields,
    normalizeLoredeckTimelineId,
    normalizeLoredeckTimelineNumber,
    applyContextTimelineItem,
    applyContextAnchor,
    applyContextEntryCandidate,
    applyContextAnchorBoundary,
    validateLoredeckForEditor,
    loadLoredeckEntriesForEditor,
    canValidateLoredeckInEditor,
    getLoredeckEntryPreview: packId => loredeckPreviewCacheController.getEntryPreview(packId),
    getContextWorkbenchEntryRows,
    buildContextEntryDerivedAnchor,
    getContextResolverMissReasons,
    getContextEntryResolverMatches,
    queueContextEntryCandidateTimelineAnchor,
    openDuplicateLoredeckDialog,
    openLoredeckTimelineAnchorDialog,
    openLoredeckTimelineWindowDialog,
    setLoredeckTimelineItemDisabled,
    removeLoredeckTimelineDefinition,
    openLoredeckEditorForQuery: (packId, query, message) => {
        loredeckEntryOverrideQuery = String(query || '');
        selectLoredeckForDetails(packId);
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        toast(message || 'Loredeck editor filtered.', 'info');
    },
    exportContextWorkbenchTimelineRegistry: pack => {
        downloadJson(buildMergedLoredeckTimelineRegistryForExport(pack), `${sanitizeFileStem(pack?.packId || 'saga-loredeck')}.timeline.json`);
        toast('Timeline registry exported.', 'info');
    },
});

configureRuntimeComposition({
    panelId: PANEL_ID,
    getPanelRoot: () => panelRoot,
    getState,
    getSettings,
    saveState,
    saveSettings,
    refreshPanelBody,
    refreshHeader,
    showLorePanel,
    hideLorePanel,
    toast,
    markTourTarget,
    downloadJson,
    openAdvancedSettingsTab,
    createCollapsibleSection,
    createDangerZoneCard,
    createStateSafetyCard,
    appendSettingsResetButton,
    createAutomationModeCard,
    createNumberSettingRow,
    createRangeSettingRow,
    createSelectSettingRow,
    createTextSettingField,
    appendGenerationStatus,
    ensureContinuityProviderReadyForAction,
    getCountLabel,
    resetFeatureProgress,
    setFeatureProgress,
    getEnabledLoredeckStackPackIds,
    renderSessionTab,
    setPanelState,
    scheduleAcceptedLoreLayoutUpdate,
    resetLorePanelLayout,
    applyRuntimeTheme,
    refreshRuntimeRailIcons,
    resetCanonPreviewUiState,
    createRuntimeRenderErrorCard,
    getRailMetrics,
    getRailMetricTooltips,
    getSelectedLoreInjectionCount,
    renderPanelBody,
    renderRailMetric,
    setExperienceMode,
    toggleRuntimeDrawerForTab,
    toggleRuntimeRailMode,
    getInjectionCharacterStats,
    navigateRuntimeTab,
    setSectionCollapsed,
    closeLoredeckLibraryWindow,
    closeContextWorkbench,
    openLoredeckLibraryWindow,
    openLoredeckLibraryDetails,
    openContextWorkbenchForPack,
    getContextWorkbenchStack,
    openLoredeckCreatorWorkbench,
    prepareLoredeckCreatorTourTarget,
    openLoredeckHealthCenter,
    setLoredeckCreatorBriefCacheEntry: (key, value) => loredeckCreatorWorkbenchCacheController.setEntry(key, value),
    getRuntimeGuideSteps,
    normalizeExperienceMode,
    normalizePanelLayoutState,
    normalizeTabForExperience,
    prepareRuntimeGuideStep,
    updateAcceptedLoreScrollRegionHeight,
    getRecoverableTimelineEntries,
    restoreLoreTimelineEntriesToPending,
    isBasicExperience,
    openNewLoreDialog,
});

configureLorecardsPanel({
    getSettings,
    saveSettings,
    getState,
    saveState,
    isBasicExperience,
    refreshPanelBody,
    createCollapsibleSection,
    markTourTarget,
    createLoreGenerationCard,
    appendSettingsResetButton,
    runAutoRelevance,
    applyAutoRelevanceSuggestions,
    applyLoreAutomationSuggestions,
    rejectAutoRelevanceSuggestions,
    rejectLoreAutomationSuggestions,
    clearAutoRelevanceSuggestions,
    clearLoreAutomationSuggestions,
    undoLastLoreAutomationRun,
    getSelectedLoreInjectionCount,
    getInjectionCharacterStats,
    appendPendingLoreEntries,
    recordLoreTimelineEvent,
    captureLoreTimelineState,
    refreshLoreWorkbench,
    refreshLoreTimeline,
    refreshHeader,
    toast,
    getLoreDisplayLabel,
    getLoredeckDisplayName,
    getLoreRegistryMeta,
    setPanelState,
    getPanelRoot: () => panelRoot,
    scheduleAcceptedLoreLayoutUpdate,
    getSearchRenderDebounceMs: () => SEARCH_RENDER_DEBOUNCE_MS,
    scheduleStateSave,
    flushScheduledStateSave,
    getLoreRegistryValues,
    getLorePriorityValues: () => LORE_PRIORITY_VALUES,
    getAcceptedLoreInitialVisibleLimit: () => ACCEPTED_LORE_INITIAL_VISIBLE_LIMIT,
    getAcceptedLorePageIncrement: () => ACCEPTED_LORE_PAGE_INCREMENT,
    refreshAcceptedLoreBulkToolbar,
    setExperienceMode,
});

configureThemeActions({
    getPanelRoot: () => panelRoot,
    refreshPanelBody,
    refreshHeader,
    refreshRuntimeRailIcons,
    downloadJson,
    getThemeShelfIconItems,
});

const LORE_PRIORITY_VALUES = [10, 25, 50, 75, 90, 100];

let activeLoreGenerationController = null;

const ACCEPTED_LORE_INITIAL_VISIBLE_LIMIT = 200;
const ACCEPTED_LORE_PAGE_INCREMENT = 200;
const SEARCH_RENDER_DEBOUNCE_MS = 160;
const MINOR_STATE_SAVE_DEBOUNCE_MS = 350;
let deferredStateSaveTimer = null;
let deferredStateSaveRef = null;
let loreGenerationUiRunning = false;
let contextWorkbenchOpen = false;
let contextWorkbenchTab = 'context';
let contextWorkbenchPackId = '';
let contextWorkbenchSelectedKey = '';
let contextWorkbenchQuery = '';
let contextWorkbenchResolverQuery = '';
let contextWorkbenchStoryPositionQuery = '';
let contextWorkbenchStoryPositionFilter = 'major';
let contextWorkbenchTypeFilter = 'all';
let canonPreviewUiState = {
    contextKey: '',
    preview: null,
    selectedPackId: '',
    selectedEntryIds: [],
    detailLevel: 'standard',
};

function resetCanonPreviewUiState(options = {}) {
    canonPreviewUiState = {
        contextKey: '',
        preview: null,
        selectedPackId: '',
        selectedEntryIds: [],
        detailLevel: options.preserveDetailLevel === false ? 'standard' : getCanonPreviewDetailLevel(),
    };
}

let panelRoot = null;

const runtimeRenderer = createRuntimeRenderOwner({
    createRoot: state => {
        const root = document.createElement('div');
        root.id = PANEL_ID;
        root.className = 'saga-lore-panel saga-runtime-shell';
        applyRuntimeShellGeometry(root, state?.lorePanel || getDefaultState().lorePanel);
        return root;
    },
    renderShell: renderPanelShell,
    renderFallback: renderPanelFallbackShell,
    commitRoot: (nextRoot, previousRoot) => {
        // Mount first: a failed append must leave the previous view attached.
        document.body.appendChild(nextRoot);
        disposeRuntimeShellInteractions();
        if (previousRoot && previousRoot !== nextRoot) previousRoot.remove();
        panelRoot = nextRoot;
    },
    reportError: (error, phase) => console.error(`[Saga] Runtime ${phase} failed:`, error),
    afterCommit: root => {
        if (typeof requestAnimationFrame !== 'function') return;
        requestAnimationFrame(() => {
            if (panelRoot !== root) return;
            clampRuntimeShellToViewport();
            updateAcceptedLoreScrollRegionHeight();
        });
    },
});

// Public runtime ------------------------------------------------------------

export function showLorePanel() {
    const settings = getSettings();
    settings.runtimeWindowOpen = true;
    saveSettings(settings);

    const state = getState();
    if (state?.lorePanel) {
        const openedAt = Date.now();
        state.lorePanel.isOpen = true;
        state.lorePanel.hasOpenedRuntime = true;
        state.lorePanel.firstOpenedAt = Number(state.lorePanel.firstOpenedAt) || openedAt;
        state.lorePanel.lastOpenedAt = openedAt;
        normalizePanelLayoutState(state, { persistLegacyOpenState: true });
        saveState(state);
    }

    const freshState = getState();
    normalizePanelLayoutState(freshState, { persistLegacyOpenState: true });
    const previousRoot = panelRoot || document.getElementById(PANEL_ID);
    return runtimeRenderer.replace(previousRoot, freshState);
}

export function hideLorePanel() {
    closeSagaTour();
    closeRuntimeFullscreenSurfaces();
    removeLorePanel();
    const settings = getSettings();
    settings.runtimeWindowOpen = false;
    saveSettings(settings);

    const state = getState();
    if (state?.lorePanel) {
        state.lorePanel.isOpen = false;
        saveState(state);
    }
}

function closeRuntimeFullscreenSurfaces() {
    closeLoreWorkbench();
    closeLoredeckWorkbench();
    closeContextWorkbench();
    closeLoredeckCreatorWorkbench();
    document.querySelectorAll([
        '.saga-loredeck-library-overlay',
        '.saga-loredeck-health-center-overlay',
        '.saga-context-proposal-review-overlay',
        '.saga-loredeck-metadata-overlay',
        '.saga-loredeck-creator-title-overlay',
    ].join(',')).forEach(overlay => overlay.remove());
}
export function refreshLorePanel() {
    const existing = document.getElementById(PANEL_ID);
    if (!existing) return;
    panelRoot = existing;

    const state = getState();
    const runtimeWindowOpen = getSettings().runtimeWindowOpen === true;
    if (state?.lorePanel && state.lorePanel.isOpen !== runtimeWindowOpen) {
        state.lorePanel.isOpen = runtimeWindowOpen;
        saveState(state);
    }
    if (!state?.lorePanel?.isOpen) {
        closeSagaTour();
        removeLorePanel();
        return;
    }

    return runtimeRenderer.refresh(existing, state, () => {
        normalizePanelLayoutState(state);
        applyRuntimeTheme(existing, getSettings());
        if (existing.classList.contains('saga-runtime-mobile') || isRuntimeMobileShell()) {
            return runtimeRenderer.replace(existing, state);
        }
        const hasDrawer = !!existing.querySelector('.saga-runtime-drawer');
        const drawerOpen = state.lorePanel.drawerOpen === true;
        const railMode = normalizeRailMode(state.lorePanel.railMode);
        const drawerDirection = drawerOpen ? resolveDrawerDirection(state.lorePanel) : 'right';
        const shellFrameChanged = existing.dataset.railMode !== railMode
            || existing.dataset.drawerDirection !== drawerDirection
            || drawerOpen !== hasDrawer;

        if (shellFrameChanged) {
            return runtimeRenderer.replace(existing, state);
        }
        syncRuntimeShellFrame(existing, state.lorePanel, drawerDirection);
        refreshPanelBody({ preserveScroll: true });
        refreshHeader();
    });
}

function syncRuntimeShellFrame(root, panelState, drawerDirection = resolveDrawerDirection(panelState)) {
    if (!root || !panelState) return;
    const railMode = normalizeRailMode(panelState.railMode);
    const railWidth = getRailWidth(panelState);
    const drawerWidth = getConstrainedDrawerWidth(panelState, drawerDirection);
    const drawerHeight = getConstrainedDrawerHeight(panelState);

    applyRuntimeShellGeometry(root, panelState);
    root.dataset.railMode = railMode;
    root.dataset.drawerDirection = drawerDirection;
    root.style.setProperty('--saga-rail-width', `${railWidth}px`);
    root.style.setProperty('--saga-drawer-width', `${drawerWidth}px`);
    root.style.setProperty('--saga-drawer-height', `${drawerHeight}px`);

    const drawer = root.querySelector('.saga-runtime-drawer');
    if (drawer) {
        drawer.style.width = `${drawerWidth}px`;
        drawer.style.height = `${drawerHeight}px`;
        updateDrawerScrollMetrics(drawer);
    }
}

function removeLorePanel() {
    disposeRuntimeShellView();
    disposeRuntimeShellInteractions();
    if (panelRoot) {
        panelRoot.remove();
        panelRoot = null;
    }
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();
}

function refreshHeader() {
    refreshRuntimeHeader(panelRoot);
}

function refreshRuntimeRailIcons(settings = getSettings()) {
    refreshRuntimeRailIconImages(panelRoot, settings);
}

function stopLoredeckCreatorGenerationTicker() {
    return loredeckCreatorGenerationProgressController.stopTicker();
}

function recoverLoredeckCreatorInterruptedActiveGeneration(job = {}, options = {}) {
    return recoverLoredeckCreatorInterruptedActiveGenerationWithDeps(job, options, {
        startGenerationTicker: startLoredeckCreatorGenerationTicker,
        stopGenerationTicker: stopLoredeckCreatorGenerationTicker,
        updateCreatorProject: async (jobId, patch, updateOptions) => acknowledgeLoredeckCreatorGenerationWrite(await updateLoredeckCreatorProject(jobId, patch, updateOptions)),
        setCurrentJobLocal: recoveredJob => {
            loredeckCreatorWorkbenchCacheController.setCurrentJobLocal(recoveredJob);
            queueLoredeckCreatorWorkbenchRefresh();
        },
        toast,
    });
}

function recoverLoredeckCreatorCurrentActiveGenerationOnOpen(options = {}) {
    const cached = getLoredeckCreatorBriefCache();
    return recoverLoredeckCreatorInterruptedActiveGeneration(cached, options);
}

function getActiveLoredeckCreatorGeneration(job = getLoredeckCreatorBriefCache()) {
    return loredeckCreatorGenerationProgressController.getActiveGeneration(job);
}

function isLoredeckCreatorGenerationCurrent(generation = null) {
    return loredeckCreatorGenerationProgressController.isGenerationCurrent(generation);
}

function ignoreStaleLoredeckCreatorGeneration(generation = null, context = 'Deck Maker generation') {
    return loredeckCreatorGenerationProgressController.ignoreStaleGeneration(generation, context);
}

function updateLoredeckCreatorActiveGenerationLocal(generationId = '', patch = {}, options = {}) {
    return loredeckCreatorGenerationProgressController.updateActiveGenerationLocal(generationId, patch, options);
}

function startLoredeckCreatorGenerationTicker(generationId = '') {
    return loredeckCreatorGenerationProgressController.startTicker(generationId);
}

function waitForLoredeckCreatorUiPaint() {
    return new Promise(resolve => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
            return;
        }
        setTimeout(resolve, 0);
    });
}

function startLoredeckCreatorGeneration(actionId = '', label = '', jobPatch = {}, details = {}) {
    return loredeckCreatorGenerationSessionController.startGeneration(actionId, label, jobPatch, details);
}

function updateLoredeckCreatorGeneration(generation = null, event = {}, options = {}) {
    return loredeckCreatorGenerationProgressController.updateGeneration(generation, event, options);
}

function makeLoredeckCreatorProgressHandler(generation = null, options = {}) {
    return loredeckCreatorGenerationProgressController.makeProgressHandler(generation, options);
}

function createLoredeckCreatorRequestOptions(generation = null, options = {}) {
    return loredeckCreatorGenerationController.createRequestOptions(generation, options);
}

async function runLoredeckCreatorSingleUnitGeneration(config = {}) {
    const commitParsedResult = config.commitParsedResult;
    const inputHash = config.inputHash || await fingerprintLoredeckCreatorGenerationInput(config.requestContext || {});
    const unitId = config.unitId || `${config.generation?.id}:${config.stage}`;
    const jobBeforeRun = getLoredeckCreatorBriefCache();
    const packBeforeRun = jobBeforeRun.generatedPackId ? await hydrateExternalLorepackPayloadRecord(getLoredeckDefinition(jobBeforeRun.generatedPackId) || {}) : {};
    const pending = findLoredeckCreatorPendingGenerationCommit(jobBeforeRun, unitId, inputHash, packBeforeRun);
    return await loredeckCreatorGenerationController.runSingleUnitGeneration({
        ...config,
        unitId,
        inputHash,
        ...(pending ? { runId: JSON.parse(pending.idempotencyKey)[1] } : {}),
        reconcileCommittedResult: async context => {
            const job = getLoredeckCreatorBriefCache();
            const pack = job.generatedPackId ? await hydrateExternalLorepackPayloadRecord(getLoredeckDefinition(job.generatedPackId) || {}) : {};
            const committed = reconcileLoredeckCreatorGenerationCommit(job, context, pack);
            if (committed) await acknowledgeLoredeckCreatorGenerationWrite({ ok: true });
            return committed;
        },
        commitParsedResult: async context => {
            const result = commitParsedResult ? await commitParsedResult(context) : null;
            await acknowledgeLoredeckCreatorGenerationWrite({ ok: true });
            return result;
        },
    });
}

function commitLoredeckCreatorArtifactResult(parsedResult = {}, stage = '', idempotencyKey = '') {
    const job = getLoredeckCreatorBriefCache();
    const committed = getLoredeckCreatorCommittedGenerationResult(job, { idempotencyKey, stage });
    if (committed) return committed.commitResult;
    const resultRef = { type: stage, summary: parsedResult.summary || '' };
    const artifactPatch = stage === 'scope_brief'
        ? { summary: parsedResult.summary, questions: parsedResult.clarifyingQuestions, brief: parsedResult.brief || null, approved: false }
        : { outlineSummary: parsedResult.summary, outlineQuestions: parsedResult.clarifyingQuestions, outline: parsedResult.outline || null, outlineApproved: false };
    setLoredeckCreatorBriefCache({
        ...job, ...artifactPatch,
        ...buildLoredeckCreatorGenerationCommitPatch(job, { idempotencyKey, stage }, resultRef),
    }, { throwOnFailure: true });
    return { resultRef };
}

async function acknowledgeLoredeckCreatorGenerationWrite(update = {}) {
    if (update?.completion) {
        const completed = await update.completion;
        update = { ...update, ...completed, queued: completed?.queued === true, completion: undefined };
    }
    if (update?.ok === false || update?.ignored === true) return update;
    for (const flush of [flushSagaCreatorProjectStorageWrites, flushSagaLorepackPayloadStorageWrites, flushSagaLorepackLibraryStorageWrites]) {
        const result = await flush();
        if (result?.ok !== true || result?.pendingWrites > 0) {
            const error = new Error(result?.error || 'Deck Maker generation write was not persisted.');
            error.code = 'checkpoint_failed';
            throw error;
        }
    }
    return { ...update, ok: true, queued: false, persisted: true };
}

function finishLoredeckCreatorGeneration(generation = null, status = 'success', message = '', details = {}) {
    return loredeckCreatorGenerationSessionController.finishGeneration(generation, status, message, details);
}

function cancelLoredeckCreatorGeneration(generationId = '') {
    return loredeckCreatorGenerationSessionController.cancelGeneration(generationId);
}

function applyLoredeckCreatorGenerationButtonLock(button, cached = getLoredeckCreatorBriefCache(), label = 'generation') {
    if (!button) return button;
    const active = getActiveLoredeckCreatorGeneration(cached);
    if (!active) return button;
    button.dataset.sagaCreatorGenerationLocked = 'true';
    button.disabled = true;
    addTooltip(button, `${active.label || 'Deck Maker generation'} is running. Cancel it or wait for it to finish before starting another ${label}.`);
    return button;
}

function getLoredeckCreatorLatestRecoverableUnit(cached = getLoredeckCreatorBriefCache()) {
    return selectLoredeckCreatorLatestRecoverableUnit(cached, getActiveLoredeckCreatorGeneration(cached));
}

function getLoredeckCreatorRetrySmallerConfig(unit = {}, cached = getLoredeckCreatorBriefCache()) {
    const settings = getLoredeckCreatorGenerationSettings(cached);
    return buildLoredeckCreatorRetrySmallerConfig(unit, settings, {
        getEntryBatchLimit: limit => getLoredeckCreatorEntryBatchLimit(limit, cached),
    });
}

function markLoredeckCreatorRecoveryUnitSuperseded(unit = {}, replacementUnitId = '') {
    if (!unit?.unitId) return false;
    const cached = getLoredeckCreatorBriefCache();
    const generationUnits = { ...(cached.generationUnits || {}) };
    const existing = generationUnits[unit.unitId] || unit;
    generationUnits[unit.unitId] = {
        ...existing,
        status: 'superseded',
        error: replacementUnitId ? `Superseded by retry unit ${replacementUnitId}.` : 'Superseded by retry.',
        updatedAt: Date.now(),
    };
    setLoredeckCreatorBriefCache({
        ...cached,
        generationUnits,
    }, { refreshWorkbench: true });
    return true;
}

function getLoredeckCreatorTitleBatchByRecoveryMeta(cached = {}, meta = {}) {
    const id = normalizeLoredeckCreatorTitleId(meta.targetTitleBatchId || meta.batchId || '', '');
    const coverageDimensionIds = normalizeLoredeckCreatorCoverageIdList(meta.coverageDimensionIds || [], 12);
    const reconstructed = id
        ? {
            id,
            label: String(meta.targetTitleBatchLabel || meta.batchLabel || id || '').trim(),
            type: coverageDimensionIds.length ? 'coverage_gap' : 'title_batch',
            order: 9000,
            summary: coverageDimensionIds.length ? 'Recovered targeted coverage title batch.' : 'Recovered title batch.',
            contextRole: coverageDimensionIds.length ? 'Retry targeted coverage expansion.' : '',
            titleTargets: [],
            coverageDimensionIds,
            coverageTarget: isPlainObjectValue(meta.coverageTarget) ? meta.coverageTarget : null,
        }
        : null;
    return (id ? getLoredeckCreatorTitleBatchById(cached, id) : null)
        || reconstructed
        || getLoredeckCreatorNextTitleBatch(cached)
        || null;
}

function getLoredeckCreatorPlanningBatchByRecoveryMeta(cached = {}, meta = {}) {
    const id = normalizeLoredeckCreatorTitleId(meta.targetPlanningBatchId || meta.targetTitleBatchId || meta.batchId || '', '');
    return getLoredeckCreatorPlanningBatchRows(cached).find(batch => batch.id === id)
        || getLoredeckCreatorNextPlanningBatch(cached)
        || null;
}

function getLoredeckCreatorSelectedDraftsByIds(cached = {}, ids = []) {
    const wanted = new Set(normalizeLoredeckCreatorTitleIdList(ids || [], 200, 180));
    if (!wanted.size) return [];
    return getLoredeckCreatorTitleDrafts(cached).filter(draft => wanted.has(normalizeLoredeckCreatorTitleId(draft.titleId || draft.id || '', '')));
}

async function retryLoredeckCreatorRecoverableUnit(unit = {}, options = {}, button = null) {
    const cached = getLoredeckCreatorBriefCache();
    if (!unit?.unitId) {
        toast('No failed Deck Maker generation unit is available to retry.', 'info');
        return { status: 'missing' };
    }
    if (getActiveLoredeckCreatorGeneration(cached)) {
        toast('A Deck Maker generation is already running.', 'warning');
        return { status: 'blocked' };
    }
    const committed = await reconcileLoredeckCreatorPendingCheckpoint(unit, cached);
    if (committed) return committed;
    if (!ensureLoreProviderReadyForAction('Deck Maker', 'lore')) return { status: 'not_ready' };

    const meta = getLoredeckCreatorUnitMeta(unit);
    const stage = String(unit.stage || '').trim();
    const smaller = options.smaller === true;
    const smallerConfig = smaller ? getLoredeckCreatorRetrySmallerConfig(unit, cached) : null;
    if (smaller && !smallerConfig) {
        toast('This failed Deck Maker unit cannot be retried smaller.', 'info');
        return { status: 'blocked', reason: 'no_smaller_unit' };
    }
    const unitIdOverride = smaller
        ? buildLoredeckCreatorRetryUnitId(unit, 'retry_smaller', smallerConfig?.value)
        : unit.unitId;
    let result = null;

    const runRetry = async () => {
        if (stage === 'scope_brief') {
            result = await handleLoredeckCreatorBriefDraft({
                fandom: meta.fandom || cached.fandom || cached.brief?.fandom || loredeckCreatorFandom,
                scope: meta.scope || cached.scope || cached.brief?.scope || loredeckCreatorScope,
                granularity: meta.granularity || cached.granularity || cached.brief?.granularity || loredeckCreatorGranularity || 'focused',
                notes: meta.notes || cached.notes || loredeckCreatorNotes,
                revisionInstruction: meta.revisionInstruction || '',
                previousBrief: cached.brief || null,
                unitIdOverride,
            }, button);
            return;
        }
        if (stage === 'story_outline') {
            result = await handleLoredeckCreatorOutlineDraft({
                previousOutline: cached.outline || null,
                revisionInstruction: meta.revisionInstruction || '',
                unitIdOverride,
            }, button);
            return;
        }
        if (stage === 'title_batch' || stage === 'title_revision') {
            const selectedTitleDrafts = getLoredeckCreatorSelectedDraftsByIds(cached, meta.selectedTitleDraftIds);
            result = await handleLoredeckCreatorTitleDraft({
                brief: cached.brief || {},
                notes: cached.notes || loredeckCreatorNotes,
                targetTitleBatch: getLoredeckCreatorTitleBatchByRecoveryMeta(cached, meta),
                previousTitleDrafts: getLoredeckCreatorTitleDrafts(cached).map(compactLoredeckCreatorTitleDraftForRevision),
                selectedTitleDrafts: selectedTitleDrafts.map(compactLoredeckCreatorTitleDraftForRevision),
                revisionInstruction: meta.revisionInstruction || '',
                titlePassLimitOverride: smallerConfig?.value,
                unitIdOverride,
            }, button);
            return;
        }
        if (stage === 'context_tag_planning') {
            result = await handleLoredeckCreatorPlanningDraft({
                targetPlanningBatch: getLoredeckCreatorPlanningBatchByRecoveryMeta(cached, meta),
                planningProposalLimitOverride: smallerConfig?.value,
                unitIdOverride,
            }, button);
            return;
        }
        if (stage === 'entry_micro_batch') {
            result = await handleLoredeckCreatorEntryDraft(button, {
                maxBatches: 1,
                batchSize: smallerConfig?.value || meta.batchSize,
                targetTitleIds: Array.isArray(meta.targetTitleIds) ? meta.targetTitleIds : [],
                targetPlanningBatchId: meta.targetPlanningBatchId || '',
                unitIdOverride,
            });
            return;
        }
        toast(`Saga does not know how to retry ${formatLoredeckCreatorRecoveryStageLabel(unit)} yet.`, 'warning');
        result = { status: 'unsupported' };
    };

    await runRetry();
    if (smaller && getLoredeckCreatorBriefCache().generationUnits?.[unitIdOverride]) {
        markLoredeckCreatorRecoveryUnitSuperseded(unit, unitIdOverride);
    }
    return result || { status: 'started' };
}

async function reconcileLoredeckCreatorPendingCheckpoint(unit = {}, job = {}) {
    const pack = job.generatedPackId ? await hydrateExternalLorepackPayloadRecord(getLoredeckDefinition(job.generatedPackId) || {}) : {};
    const runId = unit.runId || job.activeGeneration?.runId || job.activeGeneration?.id;
    const context = { run: { jobId: job.jobId, runId, stage: unit.stage }, unit,
        idempotencyKey: JSON.stringify([job.jobId || '', runId || '', unit.unitId || '', unit.inputHash || '']) };
    const committed = reconcileLoredeckCreatorGenerationCommit(job, context, pack);
    if (!committed) return null;
    const result = await runGenerationUnits({
        ...context.run, units: [unit],
        callUnit: async () => { throw new Error('A saved generation result must be reconciled without provider work.'); },
        reconcileCommittedResult: () => committed,
        checkpointRun: async ({ run }) => acknowledgeLoredeckCreatorGenerationWrite(await updateLoredeckCreatorGenerationRun(job.jobId, run, { syncPrompt: false, activate: false })),
        checkpointUnit: async ({ unit: completedUnit }) => acknowledgeLoredeckCreatorGenerationWrite(await updateLoredeckCreatorGenerationUnit(job.jobId, unit.unitId, completedUnit, { syncPrompt: false, activate: false })),
    });
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    toast(result.status === 'complete' ? 'Saved Deck Maker batch recovered.' : 'The batch is saved, but its generation status still needs to be saved.', result.status === 'complete' ? 'success' : 'warning');
    return result;
}

function appendLoredeckCreatorRecoveryActionButtons(actions, cached = getLoredeckCreatorBriefCache()) {
    const unit = getLoredeckCreatorLatestRecoverableUnit(cached);
    if (!unit) return false;
    const stageLabel = formatLoredeckCreatorRecoveryStageLabel(unit);
    const smallerConfig = getLoredeckCreatorRetrySmallerConfig(unit, cached);
    const retryButton = createButton('Retry Failed', `Retry the latest failed Deck Maker unit: ${stageLabel}.`, async (btn) => {
        await retryLoredeckCreatorRecoverableUnit(unit, { smaller: false }, btn);
    }, 'saga-primary-button');
    actions.appendChild(retryButton);

    const smallerButton = createButton(
        'Retry Smaller',
        smallerConfig
            ? `Retry ${stageLabel} with a smaller request: ${smallerConfig.label}.`
            : `${stageLabel} cannot be reduced into a smaller unit.`,
        async (btn) => {
            await retryLoredeckCreatorRecoverableUnit(unit, { smaller: true }, btn);
        }
    );
    smallerButton.disabled = !smallerConfig;
    actions.appendChild(smallerButton);
    return true;
}

const LOREDECK_CREATOR_COVERAGE_FINALIZE_BLOCKER = loredeckCreatorCoverage.LOREDECK_CREATOR_COVERAGE_FINALIZE_BLOCKER;

function normalizeLoredeckCreatorCoverageStatus(value = '', fallback = '') {
    return loredeckCreatorCoverage.normalizeLoredeckCreatorCoverageStatus(value, fallback);
}

function formatLoredeckCreatorCoverageStatus(value = '', fallback = 'missing') {
    return loredeckCreatorCoverage.formatLoredeckCreatorCoverageStatus(value, fallback);
}

function getLoredeckCreatorCoverageTone(status = '') {
    const normalized = normalizeLoredeckCreatorCoverageStatus(status, status);
    if (['covered', 'accepted', 'ready', 'complete'].includes(normalized)) return 'success';
    if (['missing', 'thin', 'needs_review'].includes(normalized)) return 'warning';
    if (['intentionally_light', 'light'].includes(normalized)) return 'info';
    if (normalized === 'not_applicable') return 'muted';
    return 'info';
}

function getLoredeckHealthSeverityTone(severity = '') {
    const normalized = String(severity || '').trim().toLowerCase();
    if (normalized === 'error') return 'danger';
    if (normalized === 'warning') return 'warning';
    return 'info';
}

function normalizeLoredeckCreatorCoverageId(value = '', fallback = '') {
    return loredeckCreatorCoverage.normalizeLoredeckCreatorCoverageId(value, fallback);
}

function normalizeLoredeckCreatorCoverageIdList(value = [], limit = 24) {
    return loredeckCreatorCoverage.normalizeLoredeckCreatorCoverageIdList(value, limit);
}

function mergeLoredeckCreatorCoveragePlans(base = null, incoming = null) {
    return loredeckCreatorCoverage.mergeLoredeckCreatorCoveragePlans(base, incoming);
}

function getLoredeckCreatorCoveragePlan(cached = {}) {
    return loredeckCreatorCoverage.getLoredeckCreatorCoveragePlan(cached);
}

function getLoredeckCreatorTitleCoverageIds(draft = {}) {
    return normalizeLoredeckCreatorCoverageIdList(draft.coverageDimensionIds || draft.coverageDimensions || draft.coverageIds || [], 12);
}

function collectLoredeckCreatorCoverageEvidence(cached = {}, pack = null) {
    const titleDrafts = getLoredeckCreatorTitleDrafts(cached);
    const selectedIds = getLoredeckCreatorSelectedTitleIds(cached);
    const approvedIds = getLoredeckCreatorApprovedTitleIds(cached);
    const acceptedEntries = pack ? getAcceptedGeneratedLoredeckEntries(pack) : [];
    const getEntryCoverageIds = (entry = {}) => normalizeLoredeckCreatorCoverageIdList(
        entry.extensions?.sagaLoredeckCreator?.coverageDimensionIds
        || entry.sagaLoredeckCreator?.coverageDimensionIds
        || entry.coverageDimensionIds
        || [],
        12
    );
    const acceptedEntryIds = new Set(
        acceptedEntries
            .filter(entry => !getEntryCoverageIds(entry).length)
            .map(entry => normalizeLoredeckEntryId(entry.id))
            .filter(Boolean)
    );
    const pendingChanges = pack ? getLoredeckPendingChanges(pack) : [];
    const draftChanges = pack ? getLoredeckAssistantDraftChanges(getLoredeckCreatorDraftCacheForPack(pack.packId)) : [];
    const getPreviewCoverageIds = (change = {}) => normalizeLoredeckCreatorCoverageIdList([
        ...(change.preview?.creatorEntryBatch?.coverageDimensionIds || []),
        ...Object.values(change.preview?.creatorEntryBatch?.titleCoverageMap || {}).flatMap(record => record?.coverageDimensionIds || []),
    ], 24);
    const pendingEntryIds = collectLoredeckCreatorChangeEntryIds(pendingChanges.filter(change => !getPreviewCoverageIds(change).length));
    const draftEntryIds = collectLoredeckCreatorChangeEntryIds(draftChanges.filter(change => !getPreviewCoverageIds(change).length));
    const byDimension = new Map();
    const ensure = (id) => {
        const clean = normalizeLoredeckCreatorCoverageId(id);
        if (!clean) return null;
        if (!byDimension.has(clean)) {
            byDimension.set(clean, {
                titleCount: 0,
                selectedTitleCount: 0,
                approvedTitleCount: 0,
                pendingEntryCount: 0,
                draftEntryCount: 0,
                acceptedEntryCount: 0,
            });
        }
        return byDimension.get(clean);
    };
    for (const draft of titleDrafts) {
        const ids = getLoredeckCreatorTitleCoverageIds(draft);
        for (const id of ids) {
            const record = ensure(id);
            if (!record) continue;
            record.titleCount += 1;
            if (selectedIds.has(draft.titleId)) record.selectedTitleCount += 1;
            if (approvedIds.has(draft.titleId)) record.approvedTitleCount += 1;
            const entryId = normalizeLoredeckEntryId(draft.titleId);
            if (pendingEntryIds.has(entryId)) record.pendingEntryCount += 1;
            if (draftEntryIds.has(entryId)) record.draftEntryCount += 1;
            if (acceptedEntryIds.has(entryId)) record.acceptedEntryCount += 1;
        }
    }
    const addChangePreviewEvidence = (changes = [], key = 'draftEntryCount') => {
        for (const change of Array.isArray(changes) ? changes : []) {
            const coverageIds = getPreviewCoverageIds(change);
            if (!coverageIds.length) continue;
            for (const id of coverageIds) {
                const record = ensure(id);
                if (record) record[key] += 1;
            }
        }
    };
    if (pack) {
        addChangePreviewEvidence(getLoredeckPendingChanges(pack), 'pendingEntryCount');
        addChangePreviewEvidence(draftChanges, 'draftEntryCount');
        for (const entry of acceptedEntries) {
            for (const id of getEntryCoverageIds(entry)) {
                const record = ensure(id);
                if (record) record.acceptedEntryCount += 1;
            }
        }
    }
    return byDimension;
}

function getLoredeckCreatorCoverageFinalizationSignature(dimensions = []) {
    return loredeckCreatorCoverage.getLoredeckCreatorCoverageFinalizationSignature(dimensions);
}

function getLoredeckCreatorCoverageFinalizeAcknowledgement(cached = {}, signature = '') {
    return loredeckCreatorCoverage.getLoredeckCreatorCoverageFinalizeAcknowledgement(cached, signature);
}

function buildLoredeckCreatorCoverageFinalizationProvenance(coverage = {}) {
    return loredeckCreatorCoverage.buildLoredeckCreatorCoverageFinalizationProvenance(coverage);
}

function getLoredeckCreatorCoverageModel(cached = {}, pack = null) {
    const evidence = collectLoredeckCreatorCoverageEvidence(cached, pack);
    return loredeckCreatorCoverage.buildLoredeckCreatorCoverageModel(cached, evidence);
}

function isLoredeckCreatorCoverageDimensionTargetable(dimension = {}) {
    return loredeckCreatorCoverage.isLoredeckCreatorCoverageDimensionTargetable(dimension);
}

function buildLoredeckCreatorCoverageTitleBatch(dimension = {}) {
    return loredeckCreatorCoverage.buildLoredeckCreatorCoverageTitleBatch(dimension);
}

function setLoredeckCreatorCoverageDimensionStatus(dimension = {}, status = '', options = {}) {
    return loredeckCreatorCoverageActionsController.setDimensionStatus(dimension, status, options);
}

function reopenLoredeckCreatorCoverageDimension(dimension = {}) {
    return loredeckCreatorCoverageActionsController.reopenDimension(dimension);
}

async function acknowledgeLoredeckCreatorCoverageForFinalize() {
    return await loredeckCreatorCoverageFinalizationController.acknowledgeCoverageForFinalize();
}

function clearLoredeckCreatorResetPackCaches(packId = '', options = {}) {
    return loredeckCreatorGeneratedPackCacheController.clearPackCaches(packId, options);
}

function getLoredeckCreatorJobGeneratedPackId(job = {}) {
    return loredeckCreatorGeneratedPackCacheController.getJobGeneratedPackId(job);
}

function isLoredeckCreatorJobRegistered(jobId = '') {
    const id = String(jobId || '').trim();
    if (!id) return false;
    const registry = getLoredeckCreatorRegistry(getState());
    return !!registry?.jobs?.[id];
}

function clearCurrentLoredeckCreatorWorkbenchCache(options = {}) {
    return loredeckCreatorWorkbenchCacheController.clearCurrentCache(options);
}

function clearLoredeckCreatorWorkbenchCacheForRemovedJobs(jobIds = [], packId = '', options = {}) {
    return loredeckCreatorWorkbenchCacheController.clearCurrentCacheForRemovedJobs(jobIds, packId, options);
}

function removeLoredeckCreatorGeneratedPackFromStack(packId = '') {
    const id = String(packId || '').trim();
    if (!id) return false;
    const stackKey = createLoredeckStackDeckKey(id);
    const inStack = getLoredeckStack(getState()).some(item => getLoredeckStackItemKey(item) === stackKey);
    if (!inStack) return false;
    commitLoredeckStackMutation(stack => {
        const index = stack.findIndex(item => getLoredeckStackItemKey(item) === stackKey);
        if (index >= 0) stack.splice(index, 1);
    });
    return true;
}

function clearLoredeckCreatorSelectedPackIfMatches(packId = '') {
    const id = String(packId || '').trim();
    if (!id) return;
    const state = getState();
    if (state?.lorePanel?.selectedLoredeckId !== id) return;
    state.lorePanel.selectedLoredeckId = '';
    saveState(state, { syncPrompt: false });
}

async function handleLoredeckCreatorResetToStep(targetStepId = '') {
    return await loredeckCreatorResetController.handleResetToStep(targetStepId);
}

function getCachedLoredeckCreatorPackHealth(pack = {}) {
    return loredeckPreviewCacheController.getManifestHealth(pack?.packId);
}

function getLoredeckCreatorGeneratedPackDefinition(packId = '') {
    return loredeckCreatorGeneratedPackCacheController.getGeneratedPackDefinition(packId);
}

function maybeHydrateLoredeckCreatorGeneratedPack(cached = {}, options = {}) {
    return loredeckCreatorGeneratedPackCacheController.maybeHydrateGeneratedPack(cached, options);
}

function getLoredeckCreatorPipelineModel(cached = {}) {
    const outline = getLoredeckCreatorOutline(cached);
    const titleSets = getLoredeckCreatorTitleBatchRows(cached);
    const draftedTitleSetIds = getLoredeckCreatorTitleDraftedBatchIds(cached);
    const draftedTitleSetCount = titleSets.filter(batch => draftedTitleSetIds.has(batch.id)).length;
    const approvedTitles = getLoredeckCreatorApprovedTitleDrafts(cached);
    maybeHydrateLoredeckCreatorGeneratedPack(cached);
    const generatedPack = cached.generatedPackId ? getLoredeckCreatorGeneratedPackDefinition(cached.generatedPackId) : null;
    const planningSets = getLoredeckCreatorPlanningBatchRows(cached);
    const eligiblePlanningSets = planningSets.filter(batch => batch.approvedTitleCount > 0);
    const plannedSetIds = getLoredeckCreatorPlanningPlannedBatchIds(cached, generatedPack);
    const plannedSetCount = eligiblePlanningSets.filter(batch => plannedSetIds.has(batch.id)).length;
    const acceptedPlanningSetIds = getLoredeckCreatorPlanningAcceptedBatchIds(cached);
    const acceptedPlanningSetCount = eligiblePlanningSets.filter(batch => acceptedPlanningSetIds.has(batch.id)).length;
    const draftChanges = generatedPack ? getLoredeckAssistantDraftChanges(getLoredeckCreatorDraftCacheForPack(generatedPack.packId)) : [];
    const pendingEntryCount = generatedPack ? getLoredeckPendingChanges(generatedPack).filter(change => (change.affectedEntryIds || []).length).length : 0;
    const cachedHealth = generatedPack ? getCachedLoredeckCreatorPackHealth(generatedPack) : null;
    const readiness = generatedPack ? getGeneratedLoredeckExportReadiness(generatedPack, cachedHealth, cached) : null;
    const pipeline = readiness?.pipeline || (generatedPack ? getLoredeckCreatorPipelineReadiness(generatedPack, cached) : null);
    const creatorCoverage = pipeline?.coverage || getLoredeckCreatorCoverageModel(cached, generatedPack);
    const titleSetTotal = titleSets.length || (outline ? 1 : 0);
    const eligiblePlanningTotal = eligiblePlanningSets.length || (approvedTitles.length ? 1 : 0);
    const pendingChanges = generatedPack ? getLoredeckPendingChanges(generatedPack) : [];
    const pendingPlanningCount = pendingChanges.filter(change => change.preview?.creatorPlanningBatch || change.preview?.timelineRegistry || change.preview?.tagRegistry).length;
    const pendingLorecardCount = pendingChanges.filter(change => (change.affectedEntryIds || []).length).length;
    const repairCount = pendingChanges.filter(change => change.source === 'attempt_fixing').length;
    const activeGeneration = getActiveLoredeckCreatorGeneration(cached);
    const briefComplete = !!cached.approved && !!cached.brief;
    const outlineComplete = !!cached.outlineApproved && !!outline;
    const titleSetsComplete = outlineComplete && titleSetTotal > 0 && draftedTitleSetCount >= titleSetTotal;
    const titleReviewComplete = titleSetsComplete && approvedTitles.length > 0;
    const planningComplete = titleReviewComplete && eligiblePlanningTotal > 0 && acceptedPlanningSetCount >= eligiblePlanningTotal;
    const lorecardsComplete = !!pipeline && pipeline.approvedTitleCount > 0 && pipeline.approvedTitleAcceptedCount >= pipeline.approvedTitleCount;
    const readinessBlockers = Array.isArray(readiness?.blockers) ? readiness.blockers : [];
    const hasCoverageAcknowledgementBlocker = readinessBlockers.includes(LOREDECK_CREATOR_COVERAGE_FINALIZE_BLOCKER);
    const hasNonCoverageBlockers = readinessBlockers.some(blocker => blocker !== LOREDECK_CREATOR_COVERAGE_FINALIZE_BLOCKER);
    const hasHealthBlockers = !!readiness && (hasNonCoverageBlockers || (readiness.errors || []).length > 0);
    const hasHealthWarnings = !!readiness && (readiness.warnings || []).length > 0;
    const remainingEntryCount = Math.max(0, Number(pipeline?.remainingEntryCount) || 0);
    const draftChangeCount = draftChanges.length;
    const isGenerating = (...actionIds) => activeGeneration?.actionId && actionIds.includes(activeGeneration.actionId);
    const lorecardsStage = getLoredeckCreatorLorecardsStageState({
        planningComplete,
        generating: isGenerating('entry_batch_draft', 'entry_multi_batch_draft'),
        lorecardsComplete,
        remainingEntryCount,
        draftChangeCount,
        pendingLorecardCount,
        approvedTitleCount: approvedTitles.length,
    });
    const deckHealthReady = !!readiness && !hasHealthBlockers && !draftChanges.length && !pendingChanges.length;
    const healthReady = !!readiness?.ready && !hasHealthBlockers && !hasCoverageAcknowledgementBlocker && !draftChanges.length && !pendingChanges.length;
    const errors = Array.isArray(cached.errors) ? cached.errors : [];
    const stages = [
        {
            id: 'scope',
            label: 'Scope Brief',
            status: errors.length && !cached.brief ? 'error' : (isGenerating('brief_draft', 'brief_revision') ? 'generating' : (briefComplete ? 'approved' : (cached.brief ? 'needs-review' : 'ready'))),
            detail: briefComplete ? 'Approved' : (cached.brief ? 'Needs approval' : 'Ready'),
            dependency: '',
            anchor: cached.brief ? 'scope-brief' : 'intake',
        },
        {
            id: 'outline',
            label: 'Story Outline',
            status: !briefComplete ? 'locked' : (isGenerating('outline_draft', 'outline_revision') ? 'generating' : (outlineComplete ? 'approved' : (outline ? 'needs-review' : 'ready'))),
            detail: !briefComplete ? 'Locked' : (outlineComplete ? 'Approved' : (outline ? 'Needs approval' : 'Ready')),
            dependency: 'Story Outline is locked until the Scope Brief is approved.',
            anchor: outline ? 'story-outline' : 'current-task',
        },
        {
            id: 'titles',
            label: 'Title Pass',
            status: !outlineComplete ? 'locked' : (isGenerating('title_batch_draft', 'title_batch_redraft', 'title_revision') ? 'generating' : (titleReviewComplete ? 'approved' : (titleDraftCount(cached) ? 'needs-review' : 'ready'))),
            detail: !outlineComplete
                ? 'Locked'
                : (titleReviewComplete ? `${approvedTitles.length} approved` : (titleSetTotal ? `${draftedTitleSetCount}/${titleSetTotal} drafted` : 'Ready')),
            dependency: 'Title Pass is locked until the Story Outline is approved.',
            anchor: 'title-sets',
        },
        {
            id: 'context',
            label: 'Context Plan',
            status: !titleReviewComplete ? 'locked' : (isGenerating('planning_batch_draft', 'planning_batch_redraft') ? 'generating' : (planningComplete ? 'approved' : (plannedSetCount > acceptedPlanningSetCount ? 'needs-review' : 'ready'))),
            detail: !titleReviewComplete
                ? 'Locked'
                : `${acceptedPlanningSetCount}/${eligiblePlanningTotal} accepted`,
            dependency: 'Context Plan is locked until selected titles are approved.',
            anchor: 'context-plan',
        },
        {
            id: 'lorecards',
            label: 'Lorecards',
            status: lorecardsStage.status,
            detail: lorecardsStage.detail,
            dependency: 'Lorecards are locked until Context and Tag proposals are accepted.',
            anchor: 'lorecards',
        },
        {
            id: 'review',
            label: 'Review Queue',
            status: draftChanges.length || pendingChanges.length ? 'needs-review' : 'empty',
            detail: pendingChanges.length ? `${pendingChanges.length} pending` : (draftChanges.length ? `${draftChanges.length} drafts` : 'Empty'),
            dependency: '',
            anchor: 'review-queue',
        },
        {
            id: 'health',
            label: 'Pack Health',
            status: !generatedPack ? 'not-ready' : (hasHealthBlockers ? 'blocked' : (deckHealthReady ? 'approved' : (hasHealthWarnings || readiness ? 'needs-review' : 'ready'))),
            detail: !generatedPack ? 'Not ready' : (deckHealthReady ? 'Ready' : (hasHealthBlockers ? 'Blocked' : (hasHealthWarnings ? 'Warnings' : 'Run scan'))),
            dependency: generatedPack ? '' : 'Pack Health is available after Saga creates the Generated Loredeck shell.',
            anchor: 'deck-health',
        },
        {
            id: 'finalize',
            label: 'Finalize',
            status: healthReady ? 'ready' : (hasCoverageAcknowledgementBlocker && deckHealthReady ? 'needs-review' : 'locked'),
            detail: healthReady ? 'Ready' : (hasCoverageAcknowledgementBlocker && deckHealthReady ? 'Acknowledge coverage' : 'Locked'),
            dependency: hasCoverageAcknowledgementBlocker
                ? 'Finalize is waiting for Deck Maker Coverage expansion or an explicit light-coverage acknowledgement.'
                : 'Finalize is locked until Lorecards are reviewed, Pending Review is clear, and Pack Health is ready.',
            anchor: 'finalize',
        },
    ];
    const currentStep = stages.find(stage => ['generating', 'error', 'blocked', 'needs-review', 'ready'].includes(stage.status)) || stages[stages.length - 1];
    const statusLine = currentStep.status === 'generating'
        ? `${activeGeneration.label || currentStep.label} running`
        : `${currentStep.label}: ${currentStep.detail}`;
    return {
        cached,
        outline,
        titleSets,
        draftedTitleSetCount,
        titleSetTotal,
        approvedTitles,
        generatedPack,
        planningSets,
        plannedSetCount,
        acceptedPlanningSetCount,
        eligiblePlanningTotal,
        draftChanges,
        pendingChanges,
        pendingPlanningCount,
        pendingLorecardCount,
        repairCount,
        pendingEntryCount,
        creatorCoverage,
        pipeline,
        readiness,
        cachedHealth,
        briefComplete,
        outlineComplete,
        titleReviewComplete,
        planningComplete,
        lorecardsComplete,
        deckHealthReady,
        healthReady,
        activeGeneration,
        stages,
        currentStep,
        statusLine,
    };
}

function titleDraftCount(cached = {}) {
    return getLoredeckCreatorTitleDrafts(cached).length;
}

function createLoredeckCreatorCurrentTaskActions(cached = {}, pipeline = {}, context = {}) {
    const actions = document.createElement('div');
    actions.className = 'saga-loredeck-creator-current-actions';
    const active = getActiveLoredeckCreatorGeneration(cached);
    if (active) {
        actions.appendChild(createButton('Cancel Generation', 'Cancel this generation. Any late provider response will be ignored.', () => {
            cancelLoredeckCreatorGeneration(active.id);
        }, 'saga-danger-button'));
        return actions;
    }
    appendLoredeckCreatorRecoveryActionButtons(actions, cached);
    const step = pipeline.currentStep || {};
    const addSecondary = (label, tooltip, anchor) => {
        actions.appendChild(createButton(label, tooltip, () => {
            scrollLoredeckCreatorWorkbenchToAnchor(anchor);
        }));
    };
    if (step.id === 'scope') {
        if (!cached.brief) {
            const draft = createButton('Draft Scope Brief', 'Generate the reviewable Scope Brief from the project inputs.', async (btn) => {
                const refs = context.intakeRefs || {};
                loredeckCreatorFandom = refs.fandomInput?.value?.trim() || loredeckCreatorFandom || cached.fandom || '';
                loredeckCreatorScope = refs.scopeInput?.value?.trim() || loredeckCreatorScope || cached.scope || '';
                loredeckCreatorGranularity = refs.granularitySelect?.value || cached.granularity || loredeckCreatorGranularity || 'focused';
                loredeckCreatorNotes = refs.notesInput?.value?.trim() || loredeckCreatorNotes || cached.notes || '';
                await handleLoredeckCreatorBriefDraft({
                    fandom: loredeckCreatorFandom,
                    scope: loredeckCreatorScope,
                    granularity: loredeckCreatorGranularity,
                    notes: loredeckCreatorNotes,
                }, btn);
            }, 'saga-primary-button');
            actions.appendChild(applyLoredeckCreatorGenerationButtonLock(draft, cached, 'scope brief draft'));
            addSecondary('Project Inputs', 'Jump to the project input fields.', 'intake');
        } else {
            actions.appendChild(createButton('Approve Scope Brief', 'Approve this Scope Brief and unlock Story Outline.', () => {
                approveLoredeckCreatorBrief();
            }, 'saga-primary-button'));
            addSecondary('Revise Scope Brief', 'Jump to the Scope Brief revision controls.', 'scope-brief');
        }
    } else if (step.id === 'outline') {
        if (!pipeline.outline) {
            const draftOutline = createButton('Draft Story Outline', 'Generate major story beats, Context milestones, and title-batch slices.', async (btn) => {
                await handleLoredeckCreatorOutlineDraft({}, btn);
            }, 'saga-primary-button');
            actions.appendChild(applyLoredeckCreatorGenerationButtonLock(draftOutline, cached, 'story outline draft'));
            addSecondary('View Scope Brief', 'Open the approved Scope Brief supporting artifact.', 'scope-brief');
        } else {
            actions.appendChild(createButton('Approve Outline and Unlock Title Pass', 'Approve this Story Outline for title-pass generation.', () => {
                approveLoredeckCreatorOutline();
            }, 'saga-primary-button'));
            addSecondary('Revise Outline', 'Jump to Story Outline revision controls.', 'story-outline');
        }
    } else if (step.id === 'titles') {
        const nextTitleBatch = getLoredeckCreatorNextTitleBatch(cached);
        const label = nextTitleBatch ? 'Generate Next Title Batch' : 'Approve Selected Titles';
        const titleButton = createButton(label, nextTitleBatch ? 'Generate the next planned title batch.' : 'Approve selected title drafts for Context planning.', async (btn) => {
            const fresh = getLoredeckCreatorBriefCache();
            const batch = getLoredeckCreatorNextTitleBatch(fresh);
            if (batch) {
                await handleLoredeckCreatorTitleDraft({
                    brief: fresh.brief || cached.brief || {},
                    notes: fresh.notes || loredeckCreatorNotes,
                    targetTitleBatch: batch,
                    previousTitleDrafts: getLoredeckCreatorTitleDrafts(fresh).map(compactLoredeckCreatorTitleDraftForRevision),
                }, btn);
            } else {
                approveLoredeckCreatorTitleSelection(getLoredeckCreatorSelectedTitleIds(fresh));
            }
        }, 'saga-primary-button');
        titleButton.disabled = !nextTitleBatch && !getLoredeckCreatorSelectedTitleIds(cached).size;
        actions.appendChild(applyLoredeckCreatorGenerationButtonLock(titleButton, cached, 'title pass'));
        addSecondary('Open Title Table', 'Jump to the Title Pass review table.', 'title-sets');
    } else if (step.id === 'context') {
        const nextPlanningBatch = getLoredeckCreatorNextPlanningBatch(cached);
        const pendingPlanningCount = Number(pipeline.pendingPlanningCount || 0);
        const planButton = createButton(
            nextPlanningBatch ? 'Plan Context and Tags' : (pendingPlanningCount ? 'Review Context and Tags' : 'Open Pending Review'),
            nextPlanningBatch
                ? 'Draft timeline and tag proposals for the next accepted title set.'
                : (pendingPlanningCount ? 'Review and accept pending Context and Tag proposals so Lorecard drafting can unlock.' : 'Open the pending proposal queue for acceptance.'),
            async (btn) => {
            const fresh = getLoredeckCreatorBriefCache();
            const batch = getLoredeckCreatorNextPlanningBatch(fresh);
            if (batch) {
                await handleLoredeckCreatorPlanningDraft({
                    targetPlanningBatch: batch,
                }, btn);
            } else {
                scrollLoredeckCreatorWorkbenchToAnchor('review-queue');
            }
        }, 'saga-primary-button');
        actions.appendChild(applyLoredeckCreatorGenerationButtonLock(planButton, cached, 'Context and Tag planning'));
        addSecondary('Open Context Plan', 'Jump to Context and Tag planning details.', 'context-plan');
    } else if (step.id === 'lorecards') {
        const remainingEntryCount = Math.max(0, Number(pipeline.remainingEntryCount) || 0);
        if (remainingEntryCount > 0) {
            const draftEntries = createButton('Draft Lorecards', 'Draft the next small Lorecard batch from accepted Context and Tag metadata.', async (btn) => {
                await handleLoredeckCreatorEntryDraft(btn);
            }, 'saga-primary-button');
            actions.appendChild(applyLoredeckCreatorGenerationButtonLock(draftEntries, cached, 'Lorecard drafting'));
            if (pipeline.draftChanges?.length) {
                addSecondary('Review Draft Batch', 'Jump to the Deck Maker Lorecard Draft Review section.', 'lorecards');
            }
        } else if (pipeline.draftChanges?.length) {
            actions.appendChild(createButton('Review Draft Batch', 'Jump to the Deck Maker Lorecard Draft Review section.', () => {
                scrollLoredeckCreatorWorkbenchToAnchor('lorecards');
            }, 'saga-primary-button'));
        }
        addSecondary('Open Review Queue', 'Jump to Pending Review status.', 'review-queue');
    } else if (step.id === 'review') {
        actions.appendChild(createButton('Open Review Queue', 'Jump to reviewable Deck Maker drafts and Pending Review items.', () => {
            scrollLoredeckCreatorWorkbenchToAnchor('review-queue');
        }, 'saga-primary-button'));
    } else if (step.id === 'health') {
        const pack = pipeline.generatedPack;
        const validateButton = createButton('Run Pack Health', 'Validate the Generated Loredeck with the same rules used at runtime.', async (btn) => {
            if (!pack) {
                toast('Create a Generated Loredeck shell before running Pack Health.', 'warning');
                return;
            }
            await validateLoredeckForEditor(pack, btn);
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            refreshLoredeckCreatorWorkbenchBody({ preserveScroll: true });
        }, 'saga-primary-button');
        validateButton.disabled = !pack;
        actions.appendChild(validateButton);
        if (pack) actions.appendChild(createButton('Open Pack Health Center', 'Open the fullscreen Pack Health Center for this Generated Loredeck.', () => {
            openLoredeckHealthCenter(pack.packId, { tab: Number(pipeline.readiness?.healthErrorCount) > 0 ? 'issues' : 'overview' });
        }));
    } else if (step.id === 'finalize') {
        const pack = pipeline.generatedPack;
        if (pipeline.readiness?.coverageAcknowledgementRequired) {
            actions.appendChild(createButton('Open Coverage Plan', 'Review and expand missing or thin Deck Maker Coverage rows before finalization.', () => {
                scrollLoredeckCreatorWorkbenchToAnchor('coverage-plan');
            }, 'saga-primary-button'));
            actions.appendChild(createButton('Finalize Anyway', 'Record that this scope is intentionally light despite unresolved Deck Maker Coverage rows.', async (btn) => {
                btn.disabled = true;
                try {
                    await acknowledgeLoredeckCreatorCoverageForFinalize();
                } finally {
                    btn.disabled = false;
                }
            }));
        }
        const finalizeButton = createButton('Finalize as Custom Loredeck', 'Validate and convert this reviewed Generated Loredeck into an editable Custom Loredeck.', async (btn) => {
            if (!pack) return;
            await finalizeGeneratedLoredeckAsCustom(pack, btn);
        }, 'saga-primary-button');
        finalizeButton.disabled = !pipeline.healthReady || !pack;
        actions.appendChild(finalizeButton);
    }
    return actions;
}

function createLoredeckCreatorAdvancedGenerationSettings(cached = {}) {
    return createLoredeckCreatorAdvancedGenerationSettingsPanel(cached, {
        getGenerationSettings: job => getLoredeckCreatorGenerationSettings(job),
        setGenerationSettings: patch => setLoredeckCreatorGenerationSettings(patch),
        resetGenerationSettings: () => resetLoredeckCreatorGenerationSettings(),
        toast,
    });
}

function formatLoredeckCreatorCoverageState(coverage = {}) {
    if (!coverage?.available) return 'No plan';
    const issueCount = Number(coverage.missingDimensionCount || 0) + Number(coverage.thinDimensionCount || 0);
    if (issueCount) return `${issueCount} gap${issueCount === 1 ? '' : 's'}`;
    if (coverage.applicableDimensionCount) return coverage.statusLabel || 'Covered';
    return 'Light scope';
}

function createLoredeckCreatorCoverageCard(cached = {}, pipeline = {}) {
    const coverage = pipeline.creatorCoverage || getLoredeckCreatorCoverageModel(cached, pipeline.generatedPack || null);
    const wrap = document.createElement('div');
    wrap.className = 'saga-loredeck-creator-brief saga-loredeck-creator-coverage';
    wrap.dataset.sagaCreatorAnchor = 'coverage-plan';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Adaptive Coverage Plan';
    wrap.appendChild(title);

    const summary = document.createElement('div');
    summary.className = 'saga-loredeck-entry-summary';
    const coverageIssueCount = Number(coverage.missingDimensionCount || 0) + Number(coverage.thinDimensionCount || 0);
    summary.appendChild(createStatusPill(formatLoredeckCreatorCoverageState(coverage), 'Adaptive coverage status based on Deck Maker coverage dimensions, title drafts, and Accepted Lorecards. This is not a hard entry-count quota.', { tone: !coverage?.available ? 'muted' : (coverageIssueCount ? 'warning' : 'success'), kind: coverageIssueCount ? 'severity' : 'status' }));
    if (coverage.storyShape) summary.appendChild(createStatusPill(coverage.storyShape, 'Detected story shape for this Deck Maker scope.', { tone: 'category', kind: 'metadata' }));
    if (coverage.storyDensity) summary.appendChild(createStatusPill(coverage.storyDensity, 'Detected lore density for this Deck Maker scope.', { tone: 'info', kind: 'metadata' }));
    if (coverage.dimensionCount) summary.appendChild(createStatusPill(`${coverage.dimensionCount} dimension${coverage.dimensionCount === 1 ? '' : 's'}`, 'Coverage dimensions Deck Maker should consider.', { kind: 'count' }));
    if (coverage.missingDimensionCount) summary.appendChild(createStatusPill(`${coverage.missingDimensionCount} missing`, 'Applicable dimensions without linked title drafts yet.', { tone: 'warning', kind: 'severity' }));
    if (coverage.thinDimensionCount) summary.appendChild(createStatusPill(`${coverage.thinDimensionCount} thin`, 'Applicable dimensions with title evidence but no Accepted Lorecards yet.', { tone: 'warning', kind: 'severity' }));
    if (coverage.intentionallyLightCount) summary.appendChild(createStatusPill(`${coverage.intentionallyLightCount} light`, 'Dimensions intentionally kept small for this source.', { tone: 'info', kind: 'count' }));
    if (coverage.notApplicableCount) summary.appendChild(createStatusPill(`${coverage.notApplicableCount} N/A`, 'Dimensions that should not be padded for this source.', { tone: 'muted', kind: 'count' }));
    if (coverage.finalizeAcknowledgementRequired) summary.appendChild(createStatusPill('Finalize waits', 'Finalization requires targeted expansion or an explicit light-coverage acknowledgement.', { tone: 'warning', kind: 'severity' }));
    if (coverage.finalizeAcknowledged) summary.appendChild(createStatusPill('Finalization acknowledged', 'The current missing/thin coverage state was explicitly accepted for finalization.', { tone: 'success', kind: 'status' }));
    wrap.appendChild(summary);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = coverage.available
        ? (coverage.expectedCoverage || coverage.rationale || 'Use this as a review map for story density. Sparse sources can be intentionally light; dense arcs should show meaningful dimensions and title coverage.')
        : 'Draft or redraft the Scope Brief to add an adaptive coverage plan before judging whether this Loredeck is dense enough.';
    wrap.appendChild(help);

    if (!coverage.available) return wrap;

    if (coverage.likelyNotApplicable?.length) {
        const note = document.createElement('div');
        note.className = 'saga-runtime-help';
        note.textContent = `Likely not applicable: ${coverage.likelyNotApplicable.join(', ')}`;
        wrap.appendChild(note);
    }

    const rows = document.createElement('div');
    rows.className = 'saga-loredeck-entry-list';
    for (const dimension of (coverage.dimensions || []).slice(0, 12)) {
        const row = document.createElement('div');
        row.className = 'saga-loredeck-entry-row saga-loredeck-creator-coverage-row';
        const main = document.createElement('div');
        main.className = 'saga-loredeck-row-main';
        const label = document.createElement('div');
        label.className = 'saga-loredeck-row-title';
        label.textContent = dimension.label || dimension.id;
        main.appendChild(label);
        const desc = document.createElement('div');
        desc.className = 'saga-loredeck-row-description';
        desc.textContent = dimension.rationale || dimension.notApplicableReason || (dimension.evidenceTargets?.length ? dimension.evidenceTargets.join(', ') : 'Coverage dimension from the Deck Maker plan.');
        main.appendChild(desc);
        const meta = document.createElement('div');
        meta.className = 'saga-loredeck-row-meta';
        meta.appendChild(createStatusPill(dimension.statusLabel || formatLoredeckCreatorCoverageStatus(dimension.derivedStatus || dimension.status), 'Coverage state for this dimension. Missing/thin are advisory review signals, not fixed quotas.', { tone: getLoredeckCreatorCoverageTone(dimension.derivedStatus || dimension.status), kind: getLoredeckCreatorCoverageTone(dimension.derivedStatus || dimension.status) === 'warning' ? 'severity' : 'status' }));
        if (dimension.kind) meta.appendChild(createStatusPill(humanizeScopeKey(dimension.kind), 'Coverage dimension kind.', { tone: 'category', kind: 'metadata' }));
        meta.appendChild(createStatusPill(`Priority ${dimension.priority}`, 'Deck Maker assigned coverage priority from 0-100.', { kind: 'metadata' }));
        if (dimension.titleCount) meta.appendChild(createStatusPill(`${dimension.titleCount} title${dimension.titleCount === 1 ? '' : 's'}`, 'Title drafts linked to this dimension.', { kind: 'count' }));
        if (dimension.approvedTitleCount) meta.appendChild(createStatusPill(`${dimension.approvedTitleCount} approved`, 'Approved title drafts linked to this dimension.', { tone: 'success', kind: 'count' }));
        if (dimension.draftEntryCount) meta.appendChild(createStatusPill(`${dimension.draftEntryCount} drafted`, 'Lorecard drafts in Draft Review linked to this dimension. This is provisional until queued and accepted.', { tone: 'review', kind: 'count' }));
        if (dimension.pendingEntryCount) meta.appendChild(createStatusPill(`${dimension.pendingEntryCount} pending`, 'Pending Review Lorecards linked to this dimension. This is provisional until accepted.', { tone: 'review', kind: 'count' }));
        if (dimension.acceptedEntryCount) meta.appendChild(createStatusPill(`${dimension.acceptedEntryCount} accepted`, 'Accepted Lorecards linked to this dimension through approved title IDs.', { tone: 'success', kind: 'count' }));
        if (dimension.titleBatchIds?.length) meta.appendChild(createStatusPill(`${dimension.titleBatchIds.length} batch${dimension.titleBatchIds.length === 1 ? '' : 'es'}`, dimension.titleBatchIds.join(', '), { tone: 'source', kind: 'count' }));
        main.appendChild(meta);
        if (isLoredeckCreatorCoverageDimensionTargetable(dimension)) {
            const targetBatch = buildLoredeckCreatorCoverageTitleBatch(dimension);
            appendLoredeckCreatorGenerationStatus(main, cached, ['title_batch_draft', 'title_batch_redraft'], {
                batchId: targetBatch.id,
                coverageDimensionIds: targetBatch.coverageDimensionIds,
                compact: true,
            });
        }
        row.appendChild(main);

        const actions = document.createElement('div');
        actions.className = 'saga-loredeck-row-actions';
        if (isLoredeckCreatorCoverageDimensionTargetable(dimension)) {
            const targetBatch = buildLoredeckCreatorCoverageTitleBatch(dimension);
            const targetedDraftCount = getLoredeckCreatorTitleDrafts(cached)
                .filter(draft => draft.creatorTitleBatchId === targetBatch.id).length;
            const label = targetedDraftCount ? 'Regenerate Titles' : 'Generate Titles';
            const titleButton = createButton(
                label,
                cached.outlineApproved
                    ? `Generate a focused title batch for ${dimension.label || dimension.id}.`
                    : 'Approve the Story Outline before generating targeted coverage titles.',
                async (btn) => {
                    const fresh = getLoredeckCreatorBriefCache();
                    await handleLoredeckCreatorTitleDraft({
                        brief: fresh.brief || cached.brief || {},
                        notes: fresh.notes || loredeckCreatorNotes,
                        targetTitleBatch: targetBatch,
                        previousTitleDrafts: getLoredeckCreatorTitleDrafts(fresh).map(compactLoredeckCreatorTitleDraftForRevision),
                        redraftTitleBatch: targetedDraftCount > 0,
                    }, btn);
                },
                targetedDraftCount ? '' : 'saga-primary-button'
            );
            titleButton.disabled = !cached.outlineApproved;
            actions.appendChild(applyLoredeckCreatorGenerationButtonLock(titleButton, cached, 'coverage title batch'));
            actions.appendChild(createButton('Mark Light', 'Accept this coverage surface as intentionally light for this source.', () => {
                setLoredeckCreatorCoverageDimensionStatus(dimension, 'intentionally_light');
            }));
            actions.appendChild(createButton('Mark N/A', 'Mark this coverage surface as not applicable to this source.', () => {
                setLoredeckCreatorCoverageDimensionStatus(dimension, 'not_applicable');
            }));
        } else if (dimension.status === 'not_applicable') {
            actions.appendChild(createStatusPill('N/A', dimension.notApplicableReason || 'This coverage surface does not apply to the source.', { tone: 'muted', kind: 'status' }));
            actions.appendChild(createButton('Reopen', 'Reopen this coverage surface for targeted expansion.', () => {
                reopenLoredeckCreatorCoverageDimension(dimension);
            }));
        } else if (dimension.status === 'intentionally_light') {
            actions.appendChild(createStatusPill('Light', dimension.notApplicableReason || 'This coverage surface is intentionally light for the source.', { tone: 'info', kind: 'status' }));
            actions.appendChild(createButton('Reopen', 'Reopen this intentionally light coverage surface for targeted expansion.', () => {
                reopenLoredeckCreatorCoverageDimension(dimension);
            }));
        }
        if (actions.childElementCount) row.appendChild(actions);
        rows.appendChild(row);
    }
    if ((coverage.dimensions || []).length > 12) {
        const more = document.createElement('div');
        more.className = 'saga-runtime-help';
        more.textContent = `Showing 12 of ${coverage.dimensions.length} coverage dimensions.`;
        rows.appendChild(more);
    }
    wrap.appendChild(rows);

    if (coverage.warnings?.length) {
        const warnings = document.createElement('div');
        warnings.className = 'saga-loredeck-generated-readiness-list';
        for (const warning of coverage.warnings.slice(0, 6)) {
            const item = document.createElement('div');
            item.className = 'saga-loredeck-generated-readiness-item saga-loredeck-generated-readiness-warning';
            item.textContent = warning;
            warnings.appendChild(item);
        }
        wrap.appendChild(warnings);
    }
    return wrap;
}

function createLoredeckCreatorCard(state = getState(), options = {}) {
    void state;
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-loredeck-creator-card';

    const cached = options.cached || getLoredeckCreatorBriefCache();
    const currentFandom = loredeckCreatorFandom || cached.fandom || '';
    const currentScope = loredeckCreatorScope || cached.scope || '';
    const currentGranularity = cached.granularity || loredeckCreatorGranularity || 'focused';
    const currentNotes = loredeckCreatorNotes || cached.notes || '';
    const pipeline = options.pipeline || getLoredeckCreatorPipelineModel(cached);
    const outline = getLoredeckCreatorOutline(cached);
    // Only immediately mounted children share this render's models. Deferred
    // children derive one fresh context when they are first opened.
    let renderContext = { cached, pipeline };
    const artifactFactory = render => () => {
        const context = renderContext || (() => {
            const cached = getLoredeckCreatorBriefCache();
            return { cached, pipeline: getLoredeckCreatorPipelineModel(cached) };
        })();
        return render(context.cached, context.pipeline);
    };

    if (options.showHeader !== false) {
        card.appendChild(createLoredeckCreatorPipelineHeader(cached, pipeline, { showClose: options.embedded === true }));
    }
    card.appendChild(createLoredeckCreatorStageGuide(cached, pipeline));

    if (options.embedded !== true) {
        const launcher = document.createElement('div');
        launcher.className = 'saga-loredeck-creator-launch-row';
        const launcherText = document.createElement('div');
        launcherText.className = 'saga-loredeck-creator-launch-text';
        launcherText.textContent = 'Open the Deck Maker as a staged fullscreen wizard.';
        addTooltip(launcherText, 'Deck Maker belongs in a larger review-first workspace, similar to the Lorecard Workbench.');
        launcher.appendChild(launcherText);
        launcher.appendChild(createButton('Open Deck Maker', 'Open the fullscreen Deck Maker wizard.', () => {
            openLoredeckCreatorWorkbench();
        }, 'saga-primary-button'));
        card.appendChild(launcher);
        return card;
    }

    let intakeForm = null;
    let intakeRefs = null;
    if (!cached.approved) {
        intakeForm = document.createElement('div');
        intakeForm.className = 'saga-new-lore-form saga-loredeck-creator-form';
        intakeForm.dataset.sagaCreatorAnchor = 'intake';
        const intakeHeader = document.createElement('div');
        intakeHeader.className = 'saga-loredeck-creator-form-header';
        const intakeTitle = document.createElement('div');
        intakeTitle.className = 'saga-loredeck-creator-form-title';
        intakeTitle.textContent = 'Project Inputs';
        intakeHeader.appendChild(intakeTitle);
        intakeForm.appendChild(intakeHeader);
        const fandomInput = createNewLoreInput(intakeForm, 'Fandom', 'Fandom, universe, or canon family.', currentFandom, false, 'One Piece');
        const scopeInput = createNewLoreInput(intakeForm, 'Scope', 'Story range, arc, season, issue run, game act, or scenario slice.', currentScope, true, 'Arlong Park Arc');
        const grid = document.createElement('div');
        grid.className = 'saga-new-lore-meta-grid';
        intakeForm.appendChild(grid);
        const granularitySelect = createNewLoreSelect(grid, 'Granularity', ['compact', 'focused', 'dense', 'scene_dense'], currentGranularity, formatLoredeckCreatorGranularity);
        const granularityBlurb = document.createElement('div');
        granularityBlurb.className = 'saga-loredeck-granularity-blurb';
        granularityBlurb.textContent = getLoredeckCreatorGranularityBlurb(currentGranularity);
        addTooltip(granularityBlurb, 'Granularity controls how far Saga zooms into the story when deriving Lorecard titles and metadata.');
        grid.appendChild(granularityBlurb);
        granularitySelect.addEventListener('change', () => {
            granularityBlurb.textContent = getLoredeckCreatorGranularityBlurb(granularitySelect.value);
        });
        const notesInput = createNewLoreInput(intakeForm, 'Notes', 'Optional desired focus, exclusions, AU premise, or creator guidance.', currentNotes, true, 'Focus on playable secrets, pressure, relationships, and timing. Avoid broad wiki biography.');
        intakeRefs = { fandomInput, scopeInput, granularitySelect, notesInput };
    }

    if (intakeForm) card.appendChild(intakeForm);
    card.appendChild(createLoredeckCreatorCurrentTaskCard(cached, pipeline, { intakeRefs }));
    if (cached.brief || pipeline.creatorCoverage?.available) {
        card.appendChild(createLoredeckCreatorArtifactDisclosure(
            'Adaptive Coverage',
            artifactFactory((cached, pipeline) => createLoredeckCreatorCoverageCard(cached, pipeline)),
            {
                open: !!pipeline.creatorCoverage?.warnings?.length && options.embedded === true,
                state: formatLoredeckCreatorCoverageState(pipeline.creatorCoverage || {}),
                anchor: 'coverage-plan',
            }
        ));
    }
    card.appendChild(createLoredeckCreatorAdvancedGenerationSettings(cached));

    if (cached.summary || cached.questions?.length) {
        const result = document.createElement('div');
        result.className = 'saga-loredeck-creator-inline-note';
        const parts = [];
        if (cached.summary) parts.push(cached.summary);
        if (cached.questions?.length) parts.push(`Questions: ${cached.questions.join(' | ')}`);
        result.textContent = parts.join(' ');
        card.appendChild(result);
    }

    if (cached.brief) {
        card.appendChild(createLoredeckCreatorArtifactDisclosure(
            cached.approved ? 'Approved: Scope Brief' : 'Scope Brief Review',
            artifactFactory(cached => createLoredeckCreatorBriefReview(cached.brief, cached)),
            { open: cached.approved !== true, state: cached.approved ? 'Approved' : 'Needs review', anchor: 'scope-brief' }
        ));
        if (cached.approved) {
            card.appendChild(createLoredeckCreatorArtifactDisclosure(
                outline ? (cached.outlineApproved ? 'Approved: Story Outline' : 'Story Outline Review') : 'Story Outline',
                artifactFactory(cached => createLoredeckCreatorOutlineCard(cached.brief, cached)),
                { open: !!outline && cached.outlineApproved !== true, state: outline ? (cached.outlineApproved ? 'Approved' : 'Needs review') : 'Ready', anchor: 'story-outline' }
            ));
            if (cached.outlineApproved && outline) {
                const generatedPack = cached.generatedPackId ? getLoredeckCreatorGeneratedPackDefinition(cached.generatedPackId) : null;
                card.appendChild(createLoredeckCreatorArtifactDisclosure(
                    'Title Pass',
                    artifactFactory(cached => createLoredeckCreatorTitlePassCard(cached.brief, cached)),
                    { open: pipeline.currentStep.id === 'titles', state: pipeline.stages.find(stage => stage.id === 'titles')?.detail || 'Ready', anchor: 'title-sets' }
                ));
                card.appendChild(createLoredeckCreatorArtifactDisclosure(
                    'Context Plan',
                    artifactFactory(cached => createLoredeckCreatorPlanningCard(cached.brief, cached)),
                    { open: pipeline.currentStep.id === 'context', state: pipeline.stages.find(stage => stage.id === 'context')?.detail || 'Locked', anchor: 'context-plan' }
                ));
                if (generatedPack && pipeline.pendingChanges.length) {
                    card.appendChild(createLoredeckCreatorArtifactDisclosure(
                        'Pending Review',
                        artifactFactory((cached, pipeline) => createLoredeckCreatorPendingReviewCard(cached, pipeline)),
                        { open: ['context', 'review'].includes(pipeline.currentStep.id), state: `${pipeline.pendingChanges.length} pending`, anchor: 'review-queue' }
                    ));
                }
                card.appendChild(createLoredeckCreatorArtifactDisclosure(
                    'Lorecards',
                    artifactFactory(cached => createLoredeckCreatorEntryDraftCard(cached.brief, cached)),
                    { open: pipeline.currentStep.id === 'lorecards', state: pipeline.stages.find(stage => stage.id === 'lorecards')?.detail || 'Locked', anchor: 'lorecards' }
                ));
                if (generatedPack) {
                    card.appendChild(createLoredeckCreatorArtifactDisclosure(
                        'Pack Health and Finalize',
                        artifactFactory((cached, pipeline) => createLoredeckCreatorPipelineReadinessCard(pipeline.generatedPack, cached, pipeline)),
                        { open: ['health', 'finalize'].includes(pipeline.currentStep.id), state: pipeline.stages.find(stage => stage.id === 'health')?.detail || 'Not ready', anchor: 'deck-health' }
                    ));
                }
            }
        }
    }
    renderContext = null;
    return card;
}

function clearStaleLoredeckCreatorInterruptedResult(job = {}) {
    if (!isStaleLoredeckCreatorInterruptedResult(job)) return job;
    const cleaned = { ...job, updatedAt: Date.now() };
    delete cleaned.lastGenerationResult;
    if (cleaned.jobId) {
        updateLoredeckCreatorProject(cleaned.jobId, {
            lastGenerationResult: null,
            updatedAt: cleaned.updatedAt,
        }, { syncPrompt: false, syncLocal: true });
    }
    return cleaned;
}

function getLoredeckCreatorBriefCache() {
    const stateJob = clearStaleLoredeckCreatorInterruptedResult(getActiveLoredeckCreatorJob(getState()) || {});
    const localJob = clearStaleLoredeckCreatorInterruptedResult(loredeckCreatorWorkbenchCacheController.getCurrentJobLocal());
    if (!stateJob?.jobId) {
        if (localJob?.jobId && !isLoredeckCreatorJobRegistered(localJob.jobId)) {
            clearCurrentLoredeckCreatorWorkbenchCache({ refresh: false });
            return {};
        }
        return attachLoredeckCreatorLiveGeneration(localJob || {});
    }
    if (localJob?.jobId && stateJob?.jobId && localJob.jobId !== stateJob.jobId) {
        return attachLoredeckCreatorLiveGeneration(stateJob);
    }
    const localUpdatedAt = Number(localJob?.updatedAt || 0);
    const stateUpdatedAt = Number(stateJob?.updatedAt || 0);
    const baseJob = localJob?.jobId && stateJob?.jobId && localJob.jobId === stateJob.jobId && localUpdatedAt >= stateUpdatedAt
        ? { ...stateJob, ...localJob }
        : stateJob;
    return attachLoredeckCreatorLiveGeneration(clearStaleLoredeckCreatorInterruptedResult({
        ...baseJob,
        ...(localJob?.activeGeneration ? { activeGeneration: localJob.activeGeneration } : {}),
        ...(localJob?.lastGenerationResult ? { lastGenerationResult: localJob.lastGenerationResult } : {}),
    }));
}

function setLoredeckCreatorBriefCache(next = {}, options = {}) {
    const current = getLoredeckCreatorBriefCache();
    const hasActiveGenerationPatch = Object.prototype.hasOwnProperty.call(next || {}, 'activeGeneration');
    const normalized = {
        ...(current || {}),
        ...(next || {}),
        updatedAt: Date.now(),
    };
    normalized.currentStage = inferLoredeckCreatorUiStage(normalized);
    const result = upsertLoredeckCreatorJob(normalized, {
        syncPrompt: false,
        ...(options.coalesceStorageWrite === true ? { coalesceWrites: true } : {}),
    });
    if (result.ok) {
        const active = normalized.activeGeneration?.status === 'running'
            ? rememberLoredeckCreatorLiveGeneration(result.job.jobId, {
                ...normalized.activeGeneration,
                currentStage: normalized.currentStage || normalized.activeGeneration.currentStage || result.job.currentStage || '',
            })
            : null;
        if (!active && hasActiveGenerationPatch && normalized.activeGeneration === null) {
            const previousActive = current?.activeGeneration;
            forgetLoredeckCreatorLiveGeneration(previousActive || { jobId: result.job.jobId });
        }
        const localJob = {
            ...result.job,
            ...(active ? { activeGeneration: active } : {}),
            ...(normalized.lastGenerationResult ? { lastGenerationResult: normalized.lastGenerationResult } : {}),
        };
        loredeckCreatorWorkbenchCacheController.setCurrentJobLocal(localJob);
        if (!options.suppressWorkbenchRefresh && (result.job.status !== 'running' || options.refreshWorkbench)) queueLoredeckCreatorWorkbenchRefresh();
        return localJob;
    }
    console.warn('[Saga] Deck Maker job persistence failed:', result.error);
    if (options.throwOnFailure === true) {
        const error = new Error(result.error || 'Deck Maker result could not be saved.');
        error.code = 'commit_failed';
        throw error;
    }
    const active = normalized.activeGeneration?.status === 'running'
        ? rememberLoredeckCreatorLiveGeneration(normalized.jobId || current?.jobId || '', normalized.activeGeneration)
        : null;
    loredeckCreatorWorkbenchCacheController.setCurrentJobLocal(normalized);
    if (!options.suppressWorkbenchRefresh && (normalized.status !== 'running' || options.refreshWorkbench)) queueLoredeckCreatorWorkbenchRefresh();
    return active ? { ...normalized, activeGeneration: active } : normalized;
}

function clearLoredeckCreatorBrief() {
    const cached = getLoredeckCreatorBriefCache();
    if (cached.jobId) clearLoredeckCreatorJob(cached.jobId, { syncPrompt: false });
    loredeckCreatorWorkbenchCacheController.clearCurrentCache({ refresh: false });
    loredeckCreatorRevisionInstruction = '';
    loredeckCreatorOutlineRevisionInstruction = '';
    loredeckCreatorTitleRevisionInstruction = '';
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    refreshLoredeckCreatorWorkbenchBody({ preserveScroll: false });
    toast('Deck Maker brief cleared.', 'info');
}

function inferLoredeckCreatorUiStage(job = {}) {
    if (job.status === 'running' && job.currentStage) return job.currentStage;
    if (job.entryDraftCount || job.entryDraftedAt) return 'entries_drafted';
    if (job.generatedPackId && (job.planningQueuedCount || job.planningQueuedAt)) return 'planning_queued';
    if (Array.isArray(job.approvedTitleDraftIds) && job.approvedTitleDraftIds.length) return 'titles_approved';
    if (Array.isArray(job.titleDrafts) && job.titleDrafts.length) return 'titles_drafted';
    if (job.outlineApproved && job.outline) return 'outline_approved';
    if (job.outline) return 'outline_drafted';
    if (job.approved) return 'brief_approved';
    if (job.brief) return 'brief_drafted';
    return 'intake';
}

function formatLoredeckCreatorGranularity(value = '') {
    const known = {
        compact: 'Constellation View (broad)',
        focused: 'Chapter Lens (balanced)',
        dense: 'Scene Loom (detailed)',
        scene_dense: 'Lantern Glass (short span)',
    };
    return known[String(value || '').trim()] || humanizeScopeKey(value || 'focused');
}

function getLoredeckCreatorGranularityBlurb(value = '') {
    const blurbs = {
        compact: 'Broadest setting. Best for a full series, era, or large arc; creates fewer Lorecards for major constraints and status changes.',
        focused: 'Balanced default. Best for one arc, season, book section, or scenario; covers major beats, secrets, relationships, and pressure points.',
        dense: 'High detail. Best for a short arc or dense storyline; adds recurring locations, motives, reveals, and scene-specific constraints.',
        scene_dense: 'Maximum detail. Best for a very short span; creates many moment-level Lorecards for objects, tells, micro-events, and tactical constraints.',
    };
    return blurbs[String(value || '').trim()] || blurbs.focused;
}

function getLoredeckCreatorGenerationSettings(cached = getLoredeckCreatorBriefCache()) {
    return loredeckCreatorGenerationSettingsController.getGenerationSettings(cached);
}

function getLoredeckCreatorSplitRetryProvider(settings = getLoredeckCreatorGenerationSettings()) {
    return loredeckCreatorGenerationSettingsController.getSplitRetryProvider(settings);
}

function setLocalLoredeckCreatorGenerationSettings(cached = {}, generationSettings = {}) {
    return loredeckCreatorGenerationSettingsController.setLocalGenerationSettings(cached, generationSettings);
}

function setLoredeckCreatorGenerationSettings(patch = {}) {
    return loredeckCreatorGenerationSettingsController.setGenerationSettings(patch);
}

function resetLoredeckCreatorGenerationSettings() {
    return loredeckCreatorGenerationSettingsController.resetGenerationSettings();
}

function createLoredeckCreatorBriefRevisionForm(brief = {}, cached = {}) {
    const reviseForm = document.createElement('div');
    reviseForm.className = 'saga-new-lore-form saga-loredeck-creator-revise-form';
    const reviseInput = createNewLoreInput(reviseForm, 'Revision', 'Instruction for revising this brief before approval.', loredeckCreatorRevisionInstruction || '', true, 'Narrow this to Cocoyasi Village and Nami/Arlong pressure. Keep it focused rather than dense.');
    const actions = createLoredeckActionRow();
    const reviseBriefButton = createButton('Revise Brief', 'Ask the Reasoning Provider to revise this Deck Maker brief.', async (btn) => {
        loredeckCreatorRevisionInstruction = reviseInput.value.trim();
        await handleLoredeckCreatorBriefDraft({
            fandom: loredeckCreatorFandom || brief.fandom,
            scope: loredeckCreatorScope || brief.scope,
            granularity: loredeckCreatorGranularity || brief.granularity,
            notes: loredeckCreatorNotes,
            previousBrief: brief,
            revisionInstruction: loredeckCreatorRevisionInstruction,
        }, btn);
    });
    actions.appendChild(applyLoredeckCreatorGenerationButtonLock(reviseBriefButton, cached, 'brief revision'));
    reviseForm.appendChild(actions);
    return reviseForm;
}

function markLoredeckCreatorOutlineFailed(error, fallbackMessage = 'Deck Maker outline response could not be parsed.') {
    const current = getLoredeckCreatorBriefCache();
    const message = String(error?.message || fallbackMessage || 'Deck Maker outline failed.').trim();
    setLoredeckCreatorBriefCache({
        ...(current || {}),
        outlineApproved: false,
        status: current?.approved ? 'approved' : 'draft',
        errors: [
            ...((current?.errors || []).slice(-20)),
            message || fallbackMessage,
        ],
        lastFailedAt: Date.now(),
    });
}

function markLoredeckCreatorActionFailed(error, fallbackMessage = 'Deck Maker action failed.') {
    const current = getLoredeckCreatorBriefCache();
    const message = String(error?.message || fallbackMessage || 'Deck Maker action failed.').trim();
    setLoredeckCreatorBriefCache({
        ...(current || {}),
        status: 'blocked',
        currentStage: 'blocked',
        errors: [
            ...((current?.errors || []).slice(-20)),
            message || fallbackMessage,
        ],
        lastFailedAt: Date.now(),
    });
}

async function handleLoredeckCreatorBriefDraft(options = {}, button = null) {
    await runBusyAction(button, 'Drafting...', async () => {
        if (!ensureLoreProviderReadyForAction('Deck Maker', 'lore')) return;
        const fandom = String(options.fandom || '').trim();
        const scope = String(options.scope || '').trim();
        if (!fandom || !scope) {
            toast('Deck Maker intake needs a fandom and scope.', 'warning');
            return;
        }
        const actionId = options.revisionInstruction ? 'brief_revision' : 'brief_draft';
        const { generation, job: startedJob } = startLoredeckCreatorGeneration(
            actionId,
            options.revisionInstruction ? 'Revising Scope Brief' : 'Drafting Scope Brief',
            {
                fandom,
                scope,
                granularity: options.granularity || 'focused',
                notes: options.notes || '',
                currentStage: 'intake',
            }
        );
        if (!generation) return;
        const requestContext = {
            fandom,
            scope,
            granularity: options.granularity || 'focused',
            notes: options.notes || '',
            previousBrief: options.previousBrief || null,
            revisionInstruction: options.revisionInstruction || '',
        };
        let responseText = '';
        let parsed = null;
        let generationOptions = null;
        try {
            const result = await runLoredeckCreatorSingleUnitGeneration({
                generation,
                stage: 'scope_brief',
                unitId: options.unitIdOverride || `creator_scope_brief:${actionId}`,
                unitLabel: options.revisionInstruction ? 'Scope Brief revision' : 'Scope Brief draft',
                currentStage: 'intake',
                unitMeta: {
                    actionId,
                    fandom,
                    scope,
                    granularity: options.granularity || 'focused',
                    notes: options.notes || '',
                    revisionInstruction: options.revisionInstruction || '',
                    retrySmallerSupported: false,
                },
                requestContext,
                requestResponse: requestLoredeckCreatorBriefResponse,
                parseResponse: parseLoredeckCreatorBriefResponse,
                repairResponse: repairLoredeckCreatorBriefResponse,
                validateParsedResult: parsed => validateLoredeckCreatorArtifactResult(parsed, 'brief', 'Scope Brief'),
                repairWarning: 'Deck Maker brief response was normalized into Saga scope-brief format.',
                isRepairUsable: repaired => isLoredeckCreatorParsedArtifactUsable(repaired, 'brief'),
                resultRefType: 'creator_scope_brief',
                commitParsedResult: ({ parsedResult, idempotencyKey }) => commitLoredeckCreatorArtifactResult(parsedResult, 'scope_brief', idempotencyKey),
            });
            if (result?.aborted || ignoreStaleLoredeckCreatorGeneration(generation, 'scope brief')) return;
            responseText = result.responseText;
            parsed = result.parsed;
            generationOptions = result.requestOptions;
        } catch (e) {
            if (isLoredeckCreatorAbortError(e) || ignoreStaleLoredeckCreatorGeneration(generation, 'scope brief')) return;
            const failure = prepareLoredeckCreatorStageFailure(e, 'Scope Brief generation failed.', 'Scope Brief');
            markLoredeckCreatorActionFailed(failure, failure.message);
            finishLoredeckCreatorGeneration(generation, 'error', failure.message);
            throw failure;
        }
        if (!parsed.brief && !parsed.clarifyingQuestions.length && String(responseText || '').trim()) {
            try {
                const repairedText = await repairLoredeckCreatorBriefResponse(responseText, requestContext, generationOptions);
                if (ignoreStaleLoredeckCreatorGeneration(generation, 'scope brief repair')) return;
                const repaired = parseLoredeckCreatorBriefResponse(repairedText);
                if (repaired.brief || repaired.clarifyingQuestions.length) {
                    parsed = repaired;
                }
            } catch (repairError) {
                console.warn('[Saga] Deck Maker brief repair failed:', repairError);
            }
        }
        if (ignoreStaleLoredeckCreatorGeneration(generation, 'scope brief commit')) return;
        setLoredeckCreatorBriefCache({
            summary: parsed.summary,
            questions: parsed.clarifyingQuestions,
            warnings: [],
            brief: parsed.brief,
            creatorCoverage: parsed.brief?.creatorCoverage || null,
            approved: false,
            outline: null,
            outlineApproved: false,
            outlineSummary: '',
            outlineQuestions: [],
            outlineWarnings: [],
            titleDrafts: [],
            selectedTitleDraftIds: [],
            approvedTitleDraftIds: [],
            titleBatchDraftedIds: [],
            titleBatch: null,
            titlePassSummary: '',
            titlePassQuestions: [],
            titlePassWarnings: [],
            planningSummary: '',
            planningQuestions: [],
            planningWarnings: [],
            planningQueuedCount: 0,
            planningBatchQueuedIds: [],
            planningBatchAcceptedIds: [],
            generatedPackId: '',
            generatedPackTitle: '',
            entryDraftSummary: '',
            entryDraftQuestions: [],
            entryDraftWarnings: [],
            entryDraftCount: 0,
            status: parsed.brief ? 'draft' : 'needs_input',
            fandom,
            scope,
            granularity: options.granularity || 'focused',
            notes: options.notes || '',
            createdAt: startedJob?.createdAt || Date.now(),
            lastCompletedAt: Date.now(),
        });
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        if (parsed.clarifyingQuestions.length && !parsed.brief) {
            finishLoredeckCreatorGeneration(generation, 'warning', `Needs clarification: ${parsed.clarifyingQuestions[0]}`);
            toast(`Deck Maker needs clarification: ${parsed.clarifyingQuestions[0]}`, 'warning');
            return;
        }
        if (!parsed.brief) {
            finishLoredeckCreatorGeneration(generation, 'warning', 'No scope brief returned.');
            toast('Deck Maker returned no brief.', 'warning');
            return;
        }
        finishLoredeckCreatorGeneration(generation, 'success', 'Scope brief drafted. Ready for review.');
        toast('Deck Maker brief drafted for review.', 'success');
    });
}

function approveLoredeckCreatorBrief() {
    const cached = getLoredeckCreatorBriefCache();
    if (!cached.brief) {
        toast('Draft a Deck Maker brief before approval.', 'warning');
        return false;
    }
    setLoredeckCreatorBriefCache({
        ...cached,
        approved: true,
        status: 'approved',
        approvedAt: Date.now(),
    });
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    toast('Scope brief approved for the next Deck Maker stage.', 'success');
    return true;
}

function getLoredeckCreatorOutline(cached = {}) {
    const outline = cached?.outline;
    return outline && typeof outline === 'object' && !Array.isArray(outline) ? outline : null;
}

function createLoredeckCreatorOutlineActionForm(brief = {}, cached = {}, outline = getLoredeckCreatorOutline(cached)) {
    const reviseForm = document.createElement('div');
    reviseForm.className = 'saga-new-lore-form saga-loredeck-creator-revise-form';
    const reviseInput = createNewLoreInput(reviseForm, 'Outline Revision', 'Instruction for revising the outline before approval.', loredeckCreatorOutlineRevisionInstruction || '', true, 'Add more high-value Context points around the betrayal reveal and final battle.');
    const actions = createLoredeckActionRow();
    const draftOutlineButton = createButton(outline ? 'Redraft Outline' : 'Draft Outline', 'Ask the Reasoning Provider to draft this reviewable story outline.', async (btn) => {
        loredeckCreatorOutlineRevisionInstruction = '';
        await handleLoredeckCreatorOutlineDraft({}, btn);
    }, outline ? '' : 'saga-primary-button');
    actions.appendChild(applyLoredeckCreatorGenerationButtonLock(draftOutlineButton, cached, 'story outline draft'));
    const approve = createButton(cached.outlineApproved ? 'Outline Approved' : 'Approve Outline', 'Approve this Story Outline for title-pass generation.', () => {
        approveLoredeckCreatorOutline();
    }, cached.outlineApproved ? '' : 'saga-primary-button');
    approve.disabled = !outline || cached.outlineApproved === true;
    actions.appendChild(approve);
    const reviseOutlineButton = createButton('Revise Outline', 'Ask the Reasoning Provider to revise this outline.', async (btn) => {
        loredeckCreatorOutlineRevisionInstruction = reviseInput.value.trim();
        await handleLoredeckCreatorOutlineDraft({
            previousOutline: outline,
            revisionInstruction: loredeckCreatorOutlineRevisionInstruction,
        }, btn);
    });
    actions.appendChild(applyLoredeckCreatorGenerationButtonLock(reviseOutlineButton, cached, 'story outline revision'));
    reviseForm.appendChild(actions);
    appendLoredeckCreatorGenerationStatus(reviseForm, cached, ['outline_draft', 'outline_revision']);
    return reviseForm;
}

async function handleLoredeckCreatorOutlineDraft(options = {}, button = null) {
    await runBusyAction(button, options.revisionInstruction ? 'Revising...' : 'Outlining...', async () => {
        if (!ensureLoreProviderReadyForAction('Deck Maker', 'lore')) return;
        const cached = getLoredeckCreatorBriefCache();
        const brief = cached.brief || {};
        if (!cached.approved || !brief) {
            toast('Approve a Scope Brief before drafting the Story Outline.', 'warning');
            return;
        }
        const revisionInstruction = String(options.revisionInstruction || '').trim();
        if (revisionInstruction && !getLoredeckCreatorOutline(cached)) {
            toast('Draft a Story Outline before revising it.', 'warning');
            return;
        }
        const actionId = revisionInstruction ? 'outline_revision' : 'outline_draft';
        const { generation } = startLoredeckCreatorGeneration(
            actionId,
            revisionInstruction ? 'Revising Story Outline' : 'Drafting Story Outline',
            {
                ...cached,
                currentStage: 'outline_drafting',
            }
        );
        if (!generation) return;
        const requestContext = {
            brief,
            notes: options.notes || cached.notes || loredeckCreatorNotes,
            previousOutline: options.previousOutline || cached.outline || null,
            revisionInstruction,
        };
        let responseText = '';
        let parsed = null;
        let generationOptions = null;
        try {
            const result = await runLoredeckCreatorSingleUnitGeneration({
                generation,
                stage: 'story_outline',
                unitId: options.unitIdOverride || `creator_story_outline:${actionId}`,
                unitLabel: revisionInstruction ? 'Story Outline revision' : 'Story Outline draft',
                currentStage: 'outline_drafting',
                unitMeta: {
                    actionId,
                    revisionInstruction,
                    retrySmallerSupported: false,
                },
                requestContext,
                requestResponse: requestLoredeckCreatorOutlineResponse,
                parseResponse: parseLoredeckCreatorOutlineResponse,
                repairResponse: repairLoredeckCreatorOutlineResponse,
                validateParsedResult: parsed => validateLoredeckCreatorArtifactResult(parsed, 'outline', 'Story Outline'),
                repairWarning: 'Deck Maker Story Outline response was normalized into Saga outline format.',
                isRepairUsable: repaired => isLoredeckCreatorParsedArtifactUsable(repaired, 'outline'),
                resultRefType: 'creator_story_outline',
                commitParsedResult: ({ parsedResult, idempotencyKey }) => commitLoredeckCreatorArtifactResult(parsedResult, 'story_outline', idempotencyKey),
            });
            if (result?.aborted || ignoreStaleLoredeckCreatorGeneration(generation, 'story outline')) return;
            responseText = result.responseText;
            parsed = result.parsed;
            generationOptions = result.requestOptions;
        } catch (e) {
            if (isLoredeckCreatorAbortError(e) || ignoreStaleLoredeckCreatorGeneration(generation, 'story outline')) return;
            const failure = prepareLoredeckCreatorStageFailure(e, 'Story Outline generation failed.', 'Story Outline');
            markLoredeckCreatorOutlineFailed(failure, failure.message);
            finishLoredeckCreatorGeneration(generation, 'error', failure.message);
            throw failure;
        }
        if (!parsed.outline && !parsed.clarifyingQuestions.length && String(responseText || '').trim()) {
            try {
                const repairedText = await repairLoredeckCreatorOutlineResponse(responseText, requestContext, generationOptions);
                if (ignoreStaleLoredeckCreatorGeneration(generation, 'story outline repair')) return;
                const repaired = parseLoredeckCreatorOutlineResponse(repairedText);
                if (repaired.outline || repaired.clarifyingQuestions.length) {
                    parsed = repaired;
                }
            } catch (repairError) {
                console.warn('[Saga] Deck Maker outline repair failed:', repairError);
            }
        }
        if (ignoreStaleLoredeckCreatorGeneration(generation, 'story outline commit')) return;
        if (parsed.clarifyingQuestions.length && !parsed.outline) {
            setLoredeckCreatorBriefCache({
                ...getLoredeckCreatorBriefCache(),
                outlineSummary: parsed.summary,
                outlineQuestions: parsed.clarifyingQuestions,
                outlineWarnings: [],
                outlineApproved: false,
                status: 'needs_input',
                lastCompletedAt: Date.now(),
            });
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            finishLoredeckCreatorGeneration(generation, 'warning', `Needs clarification: ${parsed.clarifyingQuestions[0]}`);
            toast(`Deck Maker needs clarification: ${parsed.clarifyingQuestions[0]}`, 'warning');
            return;
        }
        if (!parsed.outline) {
            setLoredeckCreatorBriefCache({
                ...getLoredeckCreatorBriefCache(),
                outlineSummary: parsed.summary,
                outlineQuestions: parsed.clarifyingQuestions,
                outlineWarnings: [],
                outlineApproved: false,
                status: 'needs_input',
                lastCompletedAt: Date.now(),
            });
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            finishLoredeckCreatorGeneration(generation, 'warning', 'No Story Outline returned.');
            toast('Deck Maker returned no Story Outline.', 'warning');
            return;
        }
        setLoredeckCreatorBriefCache({
            ...getLoredeckCreatorBriefCache(),
            outlineSummary: parsed.summary,
            outlineQuestions: parsed.clarifyingQuestions,
            outlineWarnings: [],
            outline: parsed.outline,
            creatorCoverage: mergeLoredeckCreatorCoveragePlans(
                getLoredeckCreatorCoveragePlan(getLoredeckCreatorBriefCache()),
                parsed.outline?.creatorCoverage || null
            ),
            outlineApproved: false,
            titleDrafts: [],
            selectedTitleDraftIds: [],
            approvedTitleDraftIds: [],
            titleBatchDraftedIds: [],
            titleBatch: null,
            titlePassSummary: '',
            titlePassQuestions: [],
            titlePassWarnings: [],
            planningSummary: '',
            planningQuestions: [],
            planningWarnings: [],
            planningQueuedCount: 0,
            planningBatchQueuedIds: [],
            planningBatchAcceptedIds: [],
            generatedPackId: '',
            generatedPackTitle: '',
            entryDraftSummary: '',
            entryDraftQuestions: [],
            entryDraftWarnings: [],
            entryDraftCount: 0,
            status: 'draft',
            outlineDraftedAt: Date.now(),
            outlineRevisedAt: revisionInstruction ? Date.now() : undefined,
            lastCompletedAt: Date.now(),
        });
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        finishLoredeckCreatorGeneration(generation, 'success', 'Story Outline drafted. Ready for review.');
        toast('Deck Maker Story Outline drafted for review.', 'success');
    });
}

function approveLoredeckCreatorOutline() {
    const cached = getLoredeckCreatorBriefCache();
    if (!getLoredeckCreatorOutline(cached)) {
        toast('Draft a Story Outline before approval.', 'warning');
        return false;
    }
    setLoredeckCreatorBriefCache({
        ...cached,
        outlineApproved: true,
        status: 'approved',
        outlineApprovedAt: Date.now(),
    });
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    toast('Story Outline approved for title-pass generation.', 'success');
    return true;
}

function getLoredeckCreatorSelectedTitleIds(cached = {}) {
    const drafts = getLoredeckCreatorTitleDrafts(cached);
    const validIds = new Set(drafts.map(draft => draft.titleId));
    if (!Object.prototype.hasOwnProperty.call(cached || {}, 'selectedTitleDraftIds')) {
        return new Set(validIds);
    }
    return new Set(normalizeLoredeckCreatorTitleIdList(cached.selectedTitleDraftIds).filter(id => validIds.has(id)));
}

function getLoredeckCreatorApprovedTitleIds(cached = {}) {
    const validIds = new Set(getLoredeckCreatorTitleDrafts(cached).map(draft => draft.titleId));
    return new Set(normalizeLoredeckCreatorTitleIdList(cached?.approvedTitleDraftIds || []).filter(id => validIds.has(id)));
}

function updateLoredeckCreatorTitleCache(mutator = null, options = {}) {
    if (typeof mutator !== 'function') return getLoredeckCreatorBriefCache();
    const current = getLoredeckCreatorBriefCache();
    const next = mutator({
        ...current,
        titleDrafts: getLoredeckCreatorTitleDrafts(current),
        selectedTitleDraftIds: [...getLoredeckCreatorSelectedTitleIds(current)],
        approvedTitleDraftIds: [...getLoredeckCreatorApprovedTitleIds(current)],
    }) || current;
    const titleDrafts = getLoredeckCreatorTitleDrafts(next);
    const validIds = new Set(titleDrafts.map(draft => draft.titleId));
    const selectedTitleDraftIds = normalizeLoredeckCreatorTitleIdList(next.selectedTitleDraftIds || [])
        .filter(id => validIds.has(id));
    const approvedTitleDraftIds = normalizeLoredeckCreatorTitleIdList(next.approvedTitleDraftIds || [])
        .filter(id => validIds.has(id));
    return setLoredeckCreatorBriefCache({
        ...next,
        titleDrafts,
        selectedTitleDraftIds,
        approvedTitleDraftIds,
    }, options);
}

function setLoredeckCreatorTitleSelection(titleId = '', selected = false, options = {}) {
    const id = normalizeLoredeckCreatorTitleId(titleId);
    if (!id) return;
    updateLoredeckCreatorTitleCache(cached => {
        const selectedIds = getLoredeckCreatorSelectedTitleIds(cached);
        if (selected) selectedIds.add(id);
        else selectedIds.delete(id);
        return { ...cached, selectedTitleDraftIds: [...selectedIds] };
    });
    if (options.refresh && !refreshLoredeckCreatorTitleSelectionUi()) {
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    }
}

function setLoredeckCreatorTitleSelectionBulk(mode = 'all', options = {}) {
    updateLoredeckCreatorTitleCache(cached => ({
        ...cached,
        selectedTitleDraftIds: mode === 'all' ? getLoredeckCreatorTitleDrafts(cached).map(draft => draft.titleId) : [],
    }));
    if (!refreshLoredeckCreatorTitleSelectionUi()) {
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    }
}

function getLoredeckCreatorSelectedTitleDrafts(cached = {}) {
    const selectedIds = getLoredeckCreatorSelectedTitleIds(cached);
    return getLoredeckCreatorTitleDrafts(cached).filter(draft => selectedIds.has(draft.titleId));
}

function getLoredeckCreatorApprovedTitleDrafts(cached = {}) {
    const approvedIds = getLoredeckCreatorApprovedTitleIds(cached);
    return getLoredeckCreatorTitleDrafts(cached).filter(draft => approvedIds.has(draft.titleId));
}

function getLoredeckCreatorTitleBatchLimit(brief = {}, cached = getLoredeckCreatorBriefCache()) {
    const settings = getLoredeckCreatorGenerationSettings(cached);
    if (Number.isFinite(Number(settings.titleBatchLimit))) return settings.titleBatchLimit;
    const granularity = String(brief?.granularity || '').trim().toLowerCase();
    const byGranularity = {
        compact: 6,
        focused: 8,
        dense: 10,
        scene_dense: 8,
    };
    return byGranularity[granularity] || 8;
}

function attachLoredeckCreatorTitleBatch(drafts = [], batch = {}) {
    const batchId = normalizeLoredeckCreatorTitleId(batch?.id || batch?.label || 'title-batch', 'title-batch');
    const batchLabel = String(batch?.label || batchId || 'Title Batch').trim();
    const batchCoverageDimensionIds = normalizeLoredeckCreatorCoverageIdList(batch?.coverageDimensionIds || batch?.coverageDimensions || batch?.coverageIds || [], 12);
    return normalizeLoredeckCreatorTitleDrafts(drafts).map(draft => ({
        ...draft,
        creatorTitleBatchId: draft.creatorTitleBatchId || batchId,
        creatorTitleBatchLabel: draft.creatorTitleBatchLabel || batchLabel,
        coverageDimensionIds: draft.coverageDimensionIds?.length ? draft.coverageDimensionIds : batchCoverageDimensionIds,
    }));
}

function commitLoredeckCreatorTitleDraftResult(parsed = {}, options = {}) {
    const committed = getLoredeckCreatorCommittedGenerationResult(getLoredeckCreatorBriefCache(), options.generationCommit);
    if (committed) return committed.commitResult.titleCommit || {
        draftCount: committed.resultRef?.titleIds?.length || 0, titleIds: committed.resultRef?.titleIds || [],
        batchId: committed.resultRef?.batchId || '', batchLabel: committed.resultRef?.batchLabel || '',
    };
    const titleDrafts = Array.isArray(parsed.titleDrafts) ? parsed.titleDrafts : [];
    if (!titleDrafts.length) {
        return {
            revisedMode: false,
            draftCount: 0,
            replacedCount: 0,
            titleIds: [],
            batchId: '',
            batchLabel: '',
        };
    }
    const revisionInstruction = String(options.revisionInstruction || '').trim();
    const selectedTitleDrafts = Array.isArray(options.selectedTitleDrafts) ? options.selectedTitleDrafts : [];
    const revisedMode = !!revisionInstruction && selectedTitleDrafts.length > 0;
    const selectedIds = new Set(selectedTitleDrafts.map(item => normalizeLoredeckCreatorTitleId(item?.titleId || item?.id || '', '')).filter(Boolean));
    const selectedBatch = selectedTitleDrafts.find(item => item?.creatorTitleBatchId || item?.creatorTitleBatchLabel);
    const batchForDrafts = revisedMode
        ? {
            id: selectedBatch?.creatorTitleBatchId || 'revised-selection',
            label: selectedBatch?.creatorTitleBatchLabel || 'Revised Selection',
        }
        : (options.targetTitleBatch || {});
    const batchIdentity = getLoredeckCreatorTitleBatchIdentity(batchForDrafts);
    const normalizedBatch = {
        ...(batchForDrafts || {}),
        id: batchIdentity.id || (revisedMode ? 'revised-selection' : 'title-batch'),
        label: batchIdentity.label,
    };
    const revisedDrafts = attachLoredeckCreatorTitleBatch(titleDrafts, normalizedBatch);
    const committedTitleIds = [];
    let replacedCount = 0;
    updateLoredeckCreatorTitleCache(current => {
        const existing = getLoredeckCreatorTitleDrafts(current);
        const approvedIds = getLoredeckCreatorApprovedTitleIds(current);
        const selectedIdsNext = getLoredeckCreatorSelectedTitleIds(current);
        let nextDrafts = [];
        if (!revisedMode) {
            const targetBatchId = normalizeLoredeckCreatorTitleId(normalizedBatch.id || normalizedBatch.label || '', '');
            const existingForNext = targetBatchId
                ? existing.filter(draft => {
                    const replace = draft.creatorTitleBatchId === targetBatchId;
                    if (replace) {
                        replacedCount += 1;
                        approvedIds.delete(draft.titleId);
                        selectedIdsNext.delete(draft.titleId);
                    }
                    return !replace;
                })
                : existing;
            nextDrafts = normalizeLoredeckCreatorTitleDrafts([...existingForNext, ...revisedDrafts]);
            const nextBatchDrafts = targetBatchId
                ? nextDrafts.filter(draft => draft.creatorTitleBatchId === targetBatchId)
                : revisedDrafts;
            for (const draft of nextBatchDrafts) {
                selectedIdsNext.add(draft.titleId);
                committedTitleIds.push(draft.titleId);
            }
            const draftedBatchIds = getLoredeckCreatorTitleDraftedBatchIds(current);
            if (targetBatchId) draftedBatchIds.add(targetBatchId);
            return {
                ...current,
                ...buildLoredeckCreatorGenerationCommitPatch(current, options.generationCommit, {
                    batchId: normalizedBatch.id, batchLabel: normalizedBatch.label, titleIds: committedTitleIds,
                }),
                titlePassSummary: parsed.summary,
                titlePassQuestions: parsed.clarifyingQuestions,
                titlePassWarnings: [],
                titleBatch: {
                    ...(parsed.batch || {}),
                    targetTitleBatchId: targetBatchId,
                    targetTitleBatchLabel: normalizedBatch.label || targetBatchId,
                },
                titleDrafts: nextDrafts,
                selectedTitleDraftIds: [...selectedIdsNext].filter(id => nextDrafts.some(draft => draft.titleId === id)),
                approvedTitleDraftIds: [...approvedIds].filter(id => nextDrafts.some(draft => draft.titleId === id)),
                titleBatchDraftedIds: [...draftedBatchIds],
                status: 'draft',
                titleDraftedAt: Date.now(),
                updatedAt: Date.now(),
            };
        }
        let inserted = false;
        for (const draft of existing) {
            if (selectedIds.has(draft.titleId)) {
                replacedCount += 1;
                approvedIds.delete(draft.titleId);
                selectedIdsNext.delete(draft.titleId);
                if (!inserted) {
                    nextDrafts.push(...revisedDrafts);
                    inserted = true;
                }
                continue;
            }
            nextDrafts.push(draft);
        }
        if (!inserted) nextDrafts.push(...revisedDrafts);
        nextDrafts = normalizeLoredeckCreatorTitleDrafts(nextDrafts);
        const nextRevisedIds = new Set(revisedDrafts.map(draft => draft.titleId));
        for (const draft of nextDrafts) {
            if (nextRevisedIds.has(draft.titleId)) {
                selectedIdsNext.add(draft.titleId);
                committedTitleIds.push(draft.titleId);
            }
        }
        return {
            ...current,
            ...buildLoredeckCreatorGenerationCommitPatch(current, options.generationCommit, {
                batchId: normalizedBatch.id, batchLabel: normalizedBatch.label, titleIds: committedTitleIds,
            }),
            titlePassSummary: parsed.summary || current.titlePassSummary || '',
            titlePassQuestions: parsed.clarifyingQuestions,
            titlePassWarnings: [],
            titleBatch: {
                ...(parsed.batch || {}),
                targetTitleBatchId: normalizedBatch.id,
                targetTitleBatchLabel: normalizedBatch.label,
            },
            titleDrafts: nextDrafts,
            selectedTitleDraftIds: [...selectedIdsNext].filter(id => nextDrafts.some(draft => draft.titleId === id)),
            approvedTitleDraftIds: [...approvedIds].filter(id => nextDrafts.some(draft => draft.titleId === id)),
            status: 'draft',
            titleRevisedAt: Date.now(),
            updatedAt: Date.now(),
        };
    }, { throwOnFailure: !!options.generationCommit });
    return {
        revisedMode,
        draftCount: titleDrafts.length,
        replacedCount,
        titleIds: committedTitleIds,
        batchId: normalizedBatch.id,
        batchLabel: normalizedBatch.label,
    };
}

function approveLoredeckCreatorTitleSelection(selectedIds = new Set()) {
    const idSet = selectedIds instanceof Set ? selectedIds : new Set(normalizeLoredeckCreatorTitleIdList(selectedIds || []));
    const cached = getLoredeckCreatorBriefCache();
    const drafts = getLoredeckCreatorTitleDrafts(cached).filter(draft => idSet.has(draft.titleId));
    if (!drafts.length) {
        toast('Select title drafts to approve.', 'warning');
        return false;
    }
    updateLoredeckCreatorTitleCache(current => {
        const approvedIds = getLoredeckCreatorApprovedTitleIds(current);
        for (const draft of drafts) approvedIds.add(draft.titleId);
        return {
            ...current,
            approvedTitleDraftIds: [...approvedIds],
            status: 'approved',
            approvedTitleDraftAt: Date.now(),
        };
    });
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    toast(`Approved ${drafts.length} title draft${drafts.length === 1 ? '' : 's'} for the next Deck Maker stage.`, 'success');
    return true;
}

function unapproveLoredeckCreatorTitleSelection(selectedIds = new Set()) {
    const idSet = selectedIds instanceof Set ? selectedIds : new Set(normalizeLoredeckCreatorTitleIdList(selectedIds || []));
    const cached = getLoredeckCreatorBriefCache();
    const approvedIds = getLoredeckCreatorApprovedTitleIds(cached);
    const removed = [...idSet].filter(id => approvedIds.has(id));
    if (!removed.length) {
        toast('Selected title drafts are not approved yet.', 'info');
        return false;
    }
    updateLoredeckCreatorTitleCache(current => {
        const nextApproved = getLoredeckCreatorApprovedTitleIds(current);
        for (const id of removed) nextApproved.delete(id);
        return {
            ...current,
            approvedTitleDraftIds: [...nextApproved],
            status: nextApproved.size ? 'approved' : 'draft',
            updatedAt: Date.now(),
        };
    });
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    toast(`Unapproved ${removed.length} title draft${removed.length === 1 ? '' : 's'}.`, 'info');
    return true;
}

function dropLoredeckCreatorTitleSelection(selectedIds = new Set()) {
    const idSet = selectedIds instanceof Set ? selectedIds : new Set(normalizeLoredeckCreatorTitleIdList(selectedIds || []));
    const cached = getLoredeckCreatorBriefCache();
    const selected = getLoredeckCreatorTitleDrafts(cached).filter(draft => idSet.has(draft.titleId));
    if (!selected.length) {
        toast('Select title drafts to drop.', 'warning');
        return false;
    }
    updateLoredeckCreatorTitleCache(current => {
        const remaining = getLoredeckCreatorTitleDrafts(current).filter(draft => !idSet.has(draft.titleId));
        const selectedIdsNext = getLoredeckCreatorSelectedTitleIds(current);
        const approvedIdsNext = getLoredeckCreatorApprovedTitleIds(current);
        for (const draft of selected) {
            selectedIdsNext.delete(draft.titleId);
            approvedIdsNext.delete(draft.titleId);
        }
        return {
            ...current,
            titleDrafts: remaining,
            selectedTitleDraftIds: [...selectedIdsNext],
            approvedTitleDraftIds: [...approvedIdsNext],
            status: approvedIdsNext.size ? 'approved' : 'draft',
            updatedAt: Date.now(),
        };
    });
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    toast(`Dropped ${selected.length} title draft${selected.length === 1 ? '' : 's'}.`, 'info');
    return true;
}

function openLoredeckCreatorTitleJsonEditor(draft = {}) {
    const existing = document.querySelector('.saga-loredeck-creator-title-overlay');
    existing?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-creator-title-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-entry-override-shell';
    overlay.appendChild(shell);
    const title = document.createElement('div');
    title.className = 'saga-new-lore-title';
    title.textContent = 'Edit Deck Maker Title Draft';
    shell.appendChild(title);
    const textarea = document.createElement('textarea');
    textarea.className = 'saga-continuity-json-editor saga-loredeck-creator-title-json';
    textarea.spellcheck = false;
    textarea.value = JSON.stringify(draft, null, 2);
    addTooltip(textarea, 'Editable title-draft JSON. Save validates the draft before replacing it in the Deck Maker title pass.');
    shell.appendChild(textarea);
    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Save Draft', 'Validate and save this edited title draft.', () => {
        try {
            const parsed = JSON.parse(textarea.value || '{}');
            const normalized = parseLoredeckCreatorTitleResponse(JSON.stringify({ titleDrafts: [parsed] })).titleDrafts[0];
            if (!normalized) {
                toast('Edited title draft is not valid.', 'warning');
                return;
            }
            updateLoredeckCreatorTitleCache(current => {
                const wasSelected = getLoredeckCreatorSelectedTitleIds(current).has(draft.titleId);
                const wasApproved = getLoredeckCreatorApprovedTitleIds(current).has(draft.titleId);
                const titleDrafts = getLoredeckCreatorTitleDrafts(current).map(item => item.titleId === draft.titleId ? normalized : item);
                const selectedIds = getLoredeckCreatorSelectedTitleIds({ ...current, titleDrafts });
                const approvedIds = getLoredeckCreatorApprovedTitleIds({ ...current, titleDrafts });
                selectedIds.delete(draft.titleId);
                approvedIds.delete(draft.titleId);
                if (wasSelected) selectedIds.add(normalized.titleId);
                if (wasApproved) approvedIds.add(normalized.titleId);
                return {
                    ...current,
                    titleDrafts,
                    selectedTitleDraftIds: [...selectedIds],
                    approvedTitleDraftIds: [...approvedIds],
                    updatedAt: Date.now(),
                };
            });
            overlay.remove();
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            toast('Deck Maker title draft updated.', 'success');
        } catch (e) {
            toast(e?.message || 'Title draft JSON is invalid.', 'error');
        }
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Cancel', 'Close without saving this title draft edit.', () => overlay.remove()));
    shell.appendChild(actions);
    document.body.appendChild(overlay);
}

async function performLoredeckCreatorTitleDraft(options = {}) {
    if (!ensureLoreProviderReadyForAction('Deck Maker', 'lore')) return { status: 'not_ready' };
        const cached = getLoredeckCreatorBriefCache();
        const brief = options.brief || cached.brief;
        if (!cached.approved || !brief) {
            toast('Approve a Deck Maker brief before drafting titles.', 'warning');
            return { status: 'blocked', reason: 'brief_not_approved' };
        }
        const outline = getLoredeckCreatorOutline(cached);
        if (!cached.outlineApproved || !outline) {
            toast('Approve the Story Outline before drafting titles.', 'warning');
            return { status: 'blocked', reason: 'outline_not_approved' };
        }
        const revisionInstruction = String(options.revisionInstruction || '').trim();
        const selectedTitleDrafts = Array.isArray(options.selectedTitleDrafts) ? options.selectedTitleDrafts : [];
        if (selectedTitleDrafts.length && !revisionInstruction) {
            toast('Enter a title revision instruction first.', 'warning');
            return { status: 'blocked', reason: 'missing_revision_instruction' };
        }
        if (revisionInstruction && !selectedTitleDrafts.length) {
            toast('Select title drafts to revise.', 'warning');
            return { status: 'blocked', reason: 'missing_selected_titles' };
        }
        const targetTitleBatch = revisionInstruction
            ? (options.targetTitleBatch || null)
            : (options.targetTitleBatch || getLoredeckCreatorNextTitleBatch(cached));
        if (!revisionInstruction && !targetTitleBatch) {
            toast('All planned title sets have already been drafted.', 'info');
            return { status: 'complete', reason: 'no_title_batches_remaining' };
        }
        const actionId = revisionInstruction ? 'title_revision' : (options.redraftTitleBatch ? 'title_batch_redraft' : 'title_batch_draft');
        const generationLabel = revisionInstruction
            ? 'Revising Selected Titles'
            : (options.redraftTitleBatch ? 'Redrafting Title Set' : 'Drafting Title Set');
        const targetBatchId = normalizeLoredeckCreatorTitleId(targetTitleBatch?.id || targetTitleBatch?.label || '', '');
        const targetBatchLabel = targetTitleBatch?.label || targetTitleBatch?.id || '';
        const targetCoverageDimensionIds = normalizeLoredeckCreatorCoverageIdList(targetTitleBatch?.coverageDimensionIds || [], 24);
        const { generation } = startLoredeckCreatorGeneration(
            actionId,
            generationLabel,
            {
                ...cached,
                currentStage: 'titles_drafting',
            },
            {
                batchId: targetBatchId,
                batchLabel: targetBatchLabel,
                batchIndex: options.batchIndex ?? null,
                batchTotal: options.batchTotal ?? null,
                targetTitleBatchId: targetBatchId,
                coverageDimensionIds: targetCoverageDimensionIds,
            }
        );
        if (!generation) return { status: 'blocked', reason: 'generation_already_running' };
        const generationSettings = getLoredeckCreatorGenerationSettings(cached);
        const batchId = targetBatchId;
        const batchLabel = targetBatchLabel;
        updateLoredeckCreatorGeneration(generation, {
            type: 'phase',
            phase: 'batch',
            message: revisionInstruction
                ? 'Revising selected title drafts...'
                : `Drafting title set ${batchLabel || batchId || 'current batch'}...`,
            streamSupported: null,
        }, {
            batchId,
            batchLabel,
            batchIndex: options.batchIndex ?? null,
            batchTotal: options.batchTotal ?? null,
            targetTitleBatchId: batchId,
            coverageDimensionIds: targetCoverageDimensionIds,
        });
        const effectiveTitlePassLimit = revisionInstruction
            ? Math.max(generationSettings.titleBatchLimit, selectedTitleDrafts.length)
            : clampLoredeckCreatorInteger(options.titlePassLimitOverride, 1, 24, getLoredeckCreatorTitleBatchLimit(brief, cached));
        const requestContext = {
            brief,
            outline,
            notes: options.notes || cached.notes || loredeckCreatorNotes,
            revisionInstruction,
            previousTitleDrafts: Array.isArray(options.previousTitleDrafts) ? options.previousTitleDrafts.slice(0, 120) : [],
            selectedTitleDrafts,
            targetTitleBatch,
            draftedTitleBatchIds: [...getLoredeckCreatorTitleDraftedBatchIds(cached)],
            titlePassLimit: effectiveTitlePassLimit,
        };
        let responseText = '';
        let parsed = null;
        let generationOptions = null;
        let titleCommit = null;
        try {
            const result = await runLoredeckCreatorSingleUnitGeneration({
                generation,
                stage: revisionInstruction ? 'title_revision' : 'title_batch',
                unitId: options.unitIdOverride || buildLoredeckCreatorTitleGenerationUnitId(actionId, targetTitleBatch, selectedTitleDrafts),
                unitLabel: revisionInstruction ? 'Title revision' : (batchLabel ? `Title batch: ${batchLabel}` : 'Title batch'),
                currentStage: 'titles_drafting',
                unitMeta: {
                    actionId,
                    targetTitleBatchId: batchId,
                    targetTitleBatchLabel: batchLabel,
                    coverageDimensionIds: normalizeLoredeckCreatorCoverageIdList(targetTitleBatch?.coverageDimensionIds || [], 12),
                    coverageTarget: isPlainObjectValue(targetTitleBatch?.coverageTarget) ? targetTitleBatch.coverageTarget : null,
                    selectedTitleDraftIds: selectedTitleDrafts.map(draft => normalizeLoredeckCreatorTitleId(draft.titleId || draft.id || '', '')).filter(Boolean),
                    revisionInstruction,
                    titlePassLimit: effectiveTitlePassLimit,
                    retrySmallerSupported: !revisionInstruction,
                },
                requestOptions: {
                    batchId,
                    batchLabel,
                    batchIndex: options.batchIndex ?? null,
                    batchTotal: options.batchTotal ?? null,
                    targetTitleBatchId: batchId,
                    coverageDimensionIds: targetCoverageDimensionIds,
                },
                requestContext,
                requestResponse: requestLoredeckCreatorTitleResponse,
                parseResponse: parseLoredeckCreatorTitleResponse,
                repairResponse: repairLoredeckCreatorTitleResponse,
                validateParsedResult: validateLoredeckCreatorTitlePassResult,
                repairWarning: 'Deck Maker Title Pass response was normalized into Saga title-draft format.',
                isRepairUsable: isLoredeckCreatorParsedTitlePassUsable,
                resultRefType: revisionInstruction ? 'creator_title_revision' : 'creator_title_batch',
                commitParsedResult: async ({ parsedResult, idempotencyKey }) => {
                    if (!parsedResult?.titleDrafts?.length) {
                        return {
                            resultRef: {
                                batchId,
                                batchLabel,
                                draftCount: 0,
                                status: parsedResult?.clarifyingQuestions?.length ? 'needs_input' : 'empty',
                            },
                        };
                    }
                    const commit = commitLoredeckCreatorTitleDraftResult(parsedResult, {
                        generationCommit: { idempotencyKey, stage: revisionInstruction ? 'title_revision' : 'title_batch' },
                        revisionInstruction,
                        selectedTitleDrafts,
                        targetTitleBatch,
                    });
                    return {
                        titleCommit: commit,
                        resultRef: {
                            batchId: commit.batchId || batchId,
                            batchLabel: commit.batchLabel || batchLabel,
                            draftCount: commit.draftCount,
                            replacedCount: commit.replacedCount,
                            revisedMode: commit.revisedMode,
                            titleIds: commit.titleIds,
                        },
                    };
                },
            });
            if (result?.aborted || ignoreStaleLoredeckCreatorGeneration(generation, 'title draft')) return { status: 'stale' };
            responseText = result.responseText;
            parsed = result.parsed;
            generationOptions = result.requestOptions;
            titleCommit = result.commitResult?.titleCommit || null;
        } catch (e) {
            if (isLoredeckCreatorAbortError(e) || ignoreStaleLoredeckCreatorGeneration(generation, 'title draft')) return { status: 'stale' };
            const failure = prepareLoredeckCreatorStageFailure(e, 'Title Pass generation failed.', 'Title Pass');
            markLoredeckCreatorActionFailed(failure, failure.message);
            finishLoredeckCreatorGeneration(generation, 'error', failure.message);
            throw failure;
        }
        if (!parsed.titleDrafts.length && !parsed.clarifyingQuestions.length && String(responseText || '').trim()) {
            try {
                const repairedText = await repairLoredeckCreatorTitleResponse(responseText, requestContext, generationOptions);
                if (ignoreStaleLoredeckCreatorGeneration(generation, 'title draft repair')) return { status: 'stale' };
                const repaired = parseLoredeckCreatorTitleResponse(repairedText);
                if (repaired.titleDrafts.length || repaired.clarifyingQuestions.length) {
                    parsed = repaired;
                    if (parsed.titleDrafts.length) {
                        titleCommit = commitLoredeckCreatorTitleDraftResult(parsed, {
                            revisionInstruction,
                            selectedTitleDrafts,
                            targetTitleBatch,
                        });
                    }
                }
            } catch (repairError) {
                console.warn('[Saga] Deck Maker title repair failed:', repairError);
            }
        }
        if (ignoreStaleLoredeckCreatorGeneration(generation, 'title draft commit')) return { status: 'stale' };
        if (parsed.clarifyingQuestions.length && !parsed.titleDrafts.length) {
            updateLoredeckCreatorTitleCache(current => ({
                ...current,
                titlePassSummary: parsed.summary || current.titlePassSummary || '',
                titlePassQuestions: parsed.clarifyingQuestions,
                titlePassWarnings: [],
                titleBatch: parsed.batch,
                status: 'needs_input',
                updatedAt: Date.now(),
            }));
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            finishLoredeckCreatorGeneration(generation, 'warning', `Needs clarification: ${parsed.clarifyingQuestions[0]}`);
            toast(`Deck Maker needs clarification: ${parsed.clarifyingQuestions[0]}`, 'warning');
            return { status: 'questions', questions: parsed.clarifyingQuestions, batchId, batchLabel };
        }
        if (!parsed.titleDrafts.length) {
            updateLoredeckCreatorTitleCache(current => ({
                ...current,
                titlePassSummary: parsed.summary || current.titlePassSummary || '',
                titlePassQuestions: parsed.clarifyingQuestions,
                titlePassWarnings: [],
                titleBatch: parsed.batch,
                status: 'needs_input',
                updatedAt: Date.now(),
            }));
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            finishLoredeckCreatorGeneration(generation, 'warning', 'No title drafts returned.');
            toast('Deck Maker returned no title drafts.', 'warning');
            return { status: 'empty', warnings: [], batchId, batchLabel };
        }
        const revisedMode = revisionInstruction && selectedTitleDrafts.length;
        if (!titleCommit) {
            titleCommit = commitLoredeckCreatorTitleDraftResult(parsed, {
                revisionInstruction,
                selectedTitleDrafts,
                targetTitleBatch,
            });
        }
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        if (revisedMode) {
            finishLoredeckCreatorGeneration(generation, 'success', `Revised ${selectedTitleDrafts.length} selected title draft${selectedTitleDrafts.length === 1 ? '' : 's'}.`);
            if (!options.suppressSuccessToast) toast(`Revised ${selectedTitleDrafts.length} selected title draft${selectedTitleDrafts.length === 1 ? '' : 's'} into ${parsed.titleDrafts.length} draft${parsed.titleDrafts.length === 1 ? '' : 's'}.`, 'success');
            return {
                status: 'revised',
                draftCount: parsed.titleDrafts.length,
                replacedCount: titleCommit?.replacedCount || selectedTitleDrafts.length,
                titleCommit,
            };
        }
        const successBatchLabel = batchLabel || targetTitleBatch?.label || targetTitleBatch?.id || 'title set';
        finishLoredeckCreatorGeneration(generation, 'success', `Drafted ${parsed.titleDrafts.length} ${successBatchLabel} title${parsed.titleDrafts.length === 1 ? '' : 's'}.`);
        if (!options.suppressSuccessToast) toast(`Deck Maker drafted ${parsed.titleDrafts.length} ${successBatchLabel} title${parsed.titleDrafts.length === 1 ? '' : 's'} for review.`, 'success');
        return {
            status: 'drafted',
            draftCount: parsed.titleDrafts.length,
            batchId: titleCommit?.batchId || batchId,
            batchLabel: titleCommit?.batchLabel || successBatchLabel,
            titleCommit,
        };
}

async function handleLoredeckCreatorTitleDraft(options = {}, button = null) {
    let result = null;
    await runBusyAction(button, options.revisionInstruction ? 'Revising...' : 'Drafting...', async () => {
        result = await performLoredeckCreatorTitleDraft(options);
    });
    return result;
}

function updateLoredeckCreatorTitleRunBusyProgress(busy, completedBatches = 0, totalBatches = 1, remainingBatches = 0) {
    if (!busy?.setText) return;
    const safeTotal = Math.max(1, Number(totalBatches) || 1);
    const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completedBatches) || 0));
    const remaining = Math.max(0, Number(remainingBatches) || 0);
    const prefix = safeTotal > 1
        ? `${safeCompleted} / ${safeTotal} calls`
        : 'Generating';
    busy.setText(`${prefix} | ${remaining} title set${remaining === 1 ? '' : 's'} remain`);
}

async function performLoredeckCreatorRemainingTitleBatches(options = {}) {
    const settings = getLoredeckCreatorGenerationSettings();
    const configuredLimit = settings.titleRunRemainingLimit;
    const maxBatches = Math.max(1, Math.min(configuredLimit, Number(options.maxBatches) || configuredLimit));
    let completedBatches = 0;
    let draftedTitles = 0;
    let lastResult = null;
    let stoppedReason = '';
    options.onProgress?.({
        type: 'run_started',
        completedBatches,
        totalBatches: maxBatches,
        remainingBatches: getLoredeckCreatorRemainingTitleBatches(getLoredeckCreatorBriefCache()).length,
    });
    for (let index = 0; index < maxBatches; index += 1) {
        const fresh = getLoredeckCreatorBriefCache();
        const batch = getLoredeckCreatorNextTitleBatch(fresh);
        if (!batch) {
            stoppedReason = 'complete';
            break;
        }
        options.onProgress?.({
            type: 'batch_started',
            batch,
            batchIndex: index + 1,
            completedBatches,
            totalBatches: maxBatches,
            remainingBatches: getLoredeckCreatorRemainingTitleBatches(fresh).length,
        });
        lastResult = await performLoredeckCreatorTitleDraft({
            brief: fresh.brief || options.brief || {},
            notes: fresh.notes || loredeckCreatorNotes,
            targetTitleBatch: batch,
            previousTitleDrafts: getLoredeckCreatorTitleDrafts(fresh).map(compactLoredeckCreatorTitleDraftForRevision),
            suppressSuccessToast: true,
            batchIndex: index + 1,
            batchTotal: maxBatches,
        });
        if (lastResult?.status !== 'drafted') {
            stoppedReason = lastResult?.status || 'stopped';
            break;
        }
        completedBatches += 1;
        draftedTitles += Number(lastResult.draftCount || 0);
        options.onProgress?.({
            type: 'batch_completed',
            batch,
            batchIndex: index + 1,
            completedBatches,
            totalBatches: maxBatches,
            remainingBatches: getLoredeckCreatorRemainingTitleBatches(getLoredeckCreatorBriefCache()).length,
        });
    }
    const remaining = getLoredeckCreatorRemainingTitleBatches(getLoredeckCreatorBriefCache()).length;
    return {
        status: remaining ? (stoppedReason || 'limit_reached') : 'complete',
        completedBatches,
        draftedTitles,
        remainingBatches: remaining,
        lastResult,
        maxBatches,
    };
}

async function handleLoredeckCreatorRemainingTitleBatches(button = null) {
    let result = null;
    await runBusyAction(button, 'Generating batches...', async (busy) => {
        const fresh = getLoredeckCreatorBriefCache();
        const remaining = getLoredeckCreatorRemainingTitleBatches(fresh);
        if (!remaining.length) {
            toast('All planned title batches are already drafted.', 'info');
            result = { status: 'complete', completedBatches: 0, draftedTitles: 0, remainingBatches: 0 };
            return;
        }
        const settings = getLoredeckCreatorGenerationSettings(fresh);
        const callCount = Math.min(settings.titleRunRemainingLimit, remaining.length);
        updateLoredeckCreatorTitleRunBusyProgress(busy, 0, callCount, remaining.length);
        const confirmed = await confirmAction(
            'Generate Remaining Title Batches',
            `Saga will make up to ${callCount} separate Reasoning Provider call${callCount === 1 ? '' : 's'}, one title set per call. It will stop on clarification, empty output, failure, cancellation, or the current run limit. Continue?`
        );
        if (!confirmed) {
            result = { status: 'cancelled', completedBatches: 0, draftedTitles: 0, remainingBatches: remaining.length };
            return;
        }
        result = await performLoredeckCreatorRemainingTitleBatches({
            maxBatches: settings.titleRunRemainingLimit,
            onProgress: progress => updateLoredeckCreatorTitleRunBusyProgress(
                busy,
                progress.completedBatches,
                callCount,
                progress.remainingBatches
            ),
        });
        if (result.completedBatches > 0) {
            const remainingText = result.remainingBatches
                ? ` ${result.remainingBatches} title batch${result.remainingBatches === 1 ? '' : 'es'} remain.`
                : ' Title batches are complete.';
            toast(`Generated ${result.draftedTitles} title draft${result.draftedTitles === 1 ? '' : 's'} across ${result.completedBatches} batch${result.completedBatches === 1 ? '' : 'es'}.${remainingText}`, 'success');
            return;
        }
        if (result.status !== 'cancelled') {
            toast('No title batches were generated. Check the latest Deck Maker status for details.', 'warning');
        }
    });
    return result;
}

async function ensureLoredeckCreatorGeneratedPack(cached = getLoredeckCreatorBriefCache()) {
    const brief = cached.brief || {};
    if (!brief) {
        toast('Approve a Deck Maker brief before creating a Generated Loredeck shell.', 'warning');
        return null;
    }
    let packId = getLoredeckCreatorGeneratedPackId(cached);
    let existing = packId ? getLoredeckDefinition(packId) : null;
    if (!packId || existing?.type === 'bundled') {
        packId = getUniqueLoredeckPackId(brief.packId || brief.title || 'generated-loredeck');
        existing = null;
    } else if (existing && existing.type !== 'generated') {
        packId = getUniqueLoredeckPackId(`${packId}-generated`);
        existing = null;
    }
    if (!existing && getLoredeckDefinition(packId)) {
        packId = getUniqueLoredeckPackId(`${packId}-generated`);
    }
    if (existing) existing = await hydrateExternalLorepackPayloadRecord(existing);
    const current = getLoredeckCreatorBriefCache();
    if (cached.jobId && current.jobId !== cached.jobId) return null;
    if (getLoredeckCreatorGeneratedPackId(current) !== getLoredeckCreatorGeneratedPackId(cached)) return null;
    cached = current;
    if (existing) existing = getFreshLoredeckLibraryPack(packId, existing);
    const record = buildLoredeckCreatorGeneratedPackRecord(cached, packId, existing, { createUniquePackId: getUniqueLoredeckPackId });
    const result = upsertLoredeckLibraryPack(record);
    if (!result.ok) {
        toast(result.error || 'Generated Loredeck shell could not be saved.', 'error');
        return null;
    }
    loredeckPreviewCacheController.setManifestPreview(packId, {
        manifest: record.manifestData,
        error: '',
        loadedAt: Date.now(),
    });
    clearCanonLoreDatabaseCache();
    clearContextIndexCache();
    setLoredeckCreatorBriefCache({
        ...getLoredeckCreatorBriefCache(),
        generatedPackId: packId,
        generatedPackTitle: record.title,
        generatedPackCreatedAt: cached.generatedPackCreatedAt || Date.now(),
    });
    refreshLoredeckSurfaces();
    return getFreshLoredeckLibraryPack(packId, result.pack || record);
}

function getLoredeckCreatorPlanningExistingTimelineIds(pack = {}) {
    const registry = normalizeLoredeckTimelineRegistry(pack.timelineRegistry);
    return [
        ...(registry.anchors || []).map(anchor => anchor.id),
        ...(registry.windows || []).map(windowDef => windowDef.id),
    ].filter(Boolean).slice(0, 160);
}

function getLoredeckCreatorPlanningExistingTagIds(pack = {}) {
    return Object.keys(normalizeLoredeckTagRegistry(pack.tagRegistry).tags || {}).slice(0, 240);
}

function markLoredeckCreatorPlanningChange(change = {}) {
    const actionMap = {
        assistant_upsert_tag_definition: 'creator_upsert_tag_definition',
        assistant_upsert_timeline_anchor: 'creator_upsert_timeline_anchor',
        assistant_upsert_timeline_window: 'creator_upsert_timeline_window',
    };
    const title = String(change.title || '')
        .replace(/Lore Assistant/gi, 'Deck Maker')
        .trim();
    return {
        ...change,
        source: 'loredeck_creator',
        action: actionMap[change.action] || change.action,
        title: title || change.title,
        description: change.description || 'Deck Maker proposed planning metadata for review.',
    };
}

function getLoredeckCreatorPackFromCache(cached = {}, fallback = null) {
    const packId = String(cached?.generatedPackId || fallback?.packId || '').trim();
    if (!packId) return fallback;
    return getFreshLoredeckLibraryPack(packId, fallback || getLoredeckDefinition(packId));
}

function getLoredeckCreatorPlanningPendingBatchIds(pack = {}) {
    const ids = new Set();
    for (const change of getLoredeckPendingChanges(pack)) {
        if (!isLoredeckCreatorPlanningPendingChange(change)) continue;
        const id = normalizeLoredeckCreatorTitleId(change.preview?.creatorPlanningBatch?.id || '', '');
        if (id) ids.add(id);
    }
    return ids;
}

function getLoredeckCreatorPlanningQueuedBatchIds(cached = {}, pack = null) {
    const ids = new Set(normalizeLoredeckCreatorTitleIdList(cached?.planningBatchQueuedIds || [], 1200));
    const generatedPack = pack || getLoredeckCreatorPackFromCache(cached);
    for (const id of getLoredeckCreatorPlanningPendingBatchIds(generatedPack)) ids.add(id);
    return ids;
}

function getLoredeckCreatorPlanningPlannedBatchIds(cached = {}, pack = null) {
    return new Set([
        ...getLoredeckCreatorPlanningQueuedBatchIds(cached, pack),
        ...getLoredeckCreatorPlanningAcceptedBatchIds(cached),
    ]);
}

function getLoredeckCreatorPlanningBatchRows(cached = {}) {
    const titleBatches = getLoredeckCreatorTitleBatchRows(cached);
    const approvedTitles = getLoredeckCreatorApprovedTitleDrafts(cached);
    const rowsById = new Map(titleBatches.map(batch => [batch.id, { ...batch, approvedTitles: [] }]));
    for (const draft of approvedTitles) {
        const id = normalizeLoredeckCreatorTitleId(draft.creatorTitleBatchId || 'unbatched', 'unbatched');
        if (!rowsById.has(id)) {
            rowsById.set(id, {
                id,
                label: draft.creatorTitleBatchLabel || humanizeScopeKey(id),
                type: 'title_batch',
                order: rowsById.size + 1,
                summary: 'Approved titles without a matching Story Outline title set.',
                contextRole: '',
                titleTargets: [],
                coverageDimensionIds: [],
                approvedTitles: [],
            });
        }
        rowsById.get(id).approvedTitles.push(draft);
    }
    return [...rowsById.values()]
        .map(row => ({
            ...row,
            approvedTitleCount: row.approvedTitles.length,
        }))
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function getLoredeckCreatorNextPlanningBatch(cached = {}) {
    const planned = getLoredeckCreatorPlanningPlannedBatchIds(cached);
    return getLoredeckCreatorPlanningBatchRows(cached)
        .find(batch => batch.approvedTitleCount > 0 && !planned.has(batch.id)) || null;
}

function compactLoredeckCreatorPlanningBatchForPrompt(batch = {}) {
    return {
        id: batch.id || '',
        label: batch.label || '',
        type: batch.type || '',
        order: Number.isFinite(Number(batch.order)) ? Math.round(Number(batch.order)) : null,
        summary: batch.summary || '',
        contextRole: batch.contextRole || '',
        titleTargets: Array.isArray(batch.titleTargets) ? batch.titleTargets.slice(0, 8) : [],
        coverageDimensionIds: Array.isArray(batch.coverageDimensionIds) ? batch.coverageDimensionIds.slice(0, 12) : [],
        approvedTitleCount: Number.isFinite(Number(batch.approvedTitleCount)) ? Math.round(Number(batch.approvedTitleCount)) : 0,
    };
}

function markLoredeckCreatorPlanningChangeForBatch(change = {}, batch = {}) {
    const marked = markLoredeckCreatorPlanningChange(change);
    const { id, label } = getLoredeckCreatorPlanningBatchIdentity(batch);
    const coverageDimensionIds = normalizeLoredeckCreatorCoverageIdList(batch.coverageDimensionIds || [], 12);
    if (id || label) {
        marked.description = `${marked.description || 'Deck Maker proposed planning metadata for review.'} Batch: ${label || id}.`;
        marked.preview = {
            ...(marked.preview || {}),
            creatorPlanningBatch: {
                id,
                label,
                coverageDimensionIds,
            },
        };
    }
    return marked;
}

function createLoredeckCreatorPlanningChangeId(change = {}, batch = {}, index = 0) {
    const { id: batchId } = getLoredeckCreatorPlanningBatchIdentity(batch);
    const target = [
        change.targetKind,
        change.action,
        ...(change.affectedTagIds || []),
        ...(change.affectedTimelineIds || []),
        change.title || '',
        String(index + 1),
    ].filter(Boolean).join('_');
    return `creator_plan_${batchId || 'batch'}_${target || index + 1}`
        .replace(/[^a-zA-Z0-9:._-]+/g, '_')
        .slice(0, 220);
}

function prepareLoredeckCreatorPlanningChange(change = {}, batch = {}, index = 0) {
    const marked = markLoredeckCreatorPlanningChangeForBatch(change, batch);
    return {
        ...marked,
        changeId: createLoredeckCreatorPlanningChangeId(marked, batch, index),
    };
}

function buildLoredeckCreatorPlanningChanges(pack = {}, parsed = {}, targetPlanningBatch = {}) {
    const proposals = Array.isArray(parsed?.proposals) ? parsed.proposals : [];
    const allowed = proposals.filter(isLoredeckCreatorPlanningProposal);
    const changes = buildLoredeckAssistantPendingChanges(pack, allowed, [])
        .filter(change => ['tag', 'timeline_anchor', 'timeline_window'].includes(change.targetKind))
        .map((change, index) => prepareLoredeckCreatorPlanningChange(change, targetPlanningBatch, index));
    return {
        allowed,
        ignoredCount: proposals.length - allowed.length,
        changes,
    };
}

function isLoredeckCreatorPlanningPendingChange(change = {}, batchId = '') {
    if (String(change?.source || '').trim() !== 'loredeck_creator') return false;
    if (!['tag', 'timeline_anchor', 'timeline_window'].includes(change.targetKind)) return false;
    if (!batchId) return true;
    return normalizeLoredeckCreatorTitleId(change.preview?.creatorPlanningBatch?.id || '', '') === batchId;
}

function countLoredeckCreatorPlanningPendingChanges(pack = {}) {
    return getLoredeckPendingChanges(pack).filter(change => isLoredeckCreatorPlanningPendingChange(change)).length;
}

function upsertLoredeckCreatorPlanningPendingChanges(pack = {}, changes = [], targetPlanningBatch = {}, message = '', options = {}) {
    const pendingChanges = normalizeLoredeckPendingChanges(changes);
    if (!pendingChanges.length) {
        if (options.throwOnFailure === true) {
            const error = new Error('Deck Maker planning proposals were normalized away before Pending Review queueing.');
            error.code = 'creator_planning_queue_empty';
            throw error;
        }
        return {
            queued: false,
            changeCount: 0,
            replacedCount: 0,
            pendingChangeIds: [],
        };
    }
    const { id: batchId } = getLoredeckCreatorPlanningBatchIdentity(targetPlanningBatch);
    const incomingIds = new Set(pendingChanges.map(change => change.changeId));
    let replacedCount = 0;
    const queued = persistLoredeckLibraryRecordMutation(pack, next => {
        const pending = normalizeLoredeckPendingChanges(next.pendingChanges);
        const retained = pending.filter(change => {
            const replace = incomingIds.has(change.changeId) || (batchId && isLoredeckCreatorPlanningPendingChange(change, batchId));
            if (replace) replacedCount += 1;
            return !replace;
        });
        next.pendingChanges = normalizeLoredeckPendingChanges([...retained, ...pendingChanges]);
    }, message, {
        errorMessage: 'Deck Maker planning proposal save failed.',
        throwOnFailure: options.throwOnFailure === true,
    });
    return {
        queued,
        changeCount: queued ? pendingChanges.length : 0,
        replacedCount: queued ? replacedCount : 0,
        pendingChangeIds: queued ? pendingChanges.map(change => change.changeId) : [],
    };
}

function commitLoredeckCreatorPlanningResult(parsed = {}, options = {}) {
    const pack = options.pack;
    const committed = getLoredeckCreatorCommittedGenerationResult(getLoredeckCreatorBriefCache(), options.generationCommit, getFreshLoredeckLibraryPack(pack?.packId, pack) || {});
    if (committed) return committed.commitResult.planningCommit;
    const targetPlanningBatch = options.targetPlanningBatch || {};
    const targetBatchId = normalizeLoredeckCreatorTitleId(options.targetBatchId || targetPlanningBatch.id || targetPlanningBatch.label || '', '');
    if (!pack?.packId) {
        if (options.throwOnFailure) throw new Error('Generated Loredeck shell is missing.');
        return { queued: false, changeCount: 0, replacedCount: 0, pendingChangeIds: [], warnings: [] };
    }
    const { ignoredCount, changes } = buildLoredeckCreatorPlanningChanges(pack, parsed, targetPlanningBatch);
    const warnings = [
        ...(ignoredCount ? [`Ignored ${ignoredCount} non-planning proposal${ignoredCount === 1 ? '' : 's'}.`] : []),
    ];
    if (!changes.length) {
        return {
            queued: false,
            changeCount: 0,
            replacedCount: 0,
            pendingChangeIds: [],
            ignoredCount,
            warnings,
        };
    }
    const committedChanges = attachLoredeckCreatorGenerationCommitToChanges(changes, options.generationCommit, parsed);
    const queueResult = upsertLoredeckCreatorPlanningPendingChanges(pack, committedChanges, targetPlanningBatch, '', {
        throwOnFailure: options.throwOnFailure === true,
    });
    if (!queueResult.queued) {
        if (options.throwOnFailure) {
            const error = new Error('Could not queue Deck Maker planning proposals for Pending Review.');
            error.code = 'loredeck_queue_failed';
            throw error;
        }
        return {
            ...queueResult,
            ignoredCount,
            warnings,
        };
    }
    const fresh = getFreshLoredeckLibraryPack(pack.packId, pack);
    const nextQueuedBatchIds = getLoredeckCreatorPlanningQueuedBatchIds(getLoredeckCreatorBriefCache(), fresh);
    if (targetBatchId) nextQueuedBatchIds.add(targetBatchId);
    try {
        setLoredeckCreatorBriefCache({
            ...getLoredeckCreatorBriefCache(),
            planningSummary: parsed.summary,
            planningQuestions: parsed.clarifyingQuestions,
            planningWarnings: warnings,
            planningQueuedCount: countLoredeckCreatorPlanningPendingChanges(fresh),
            planningBatchQueuedIds: [...nextQueuedBatchIds],
            planningCurrentBatchId: targetBatchId,
            planningCurrentBatchLabel: targetPlanningBatch.label || targetBatchId,
            planningQueuedAt: Date.now(),
            generatedPackId: pack.packId,
            generatedPackTitle: pack.title || pack.packId,
            status: 'draft',
        });
    } catch (error) {
        console.warn('[Saga] Deck Maker planning proposals were queued, but job cache refresh failed:', error);
    }
    return {
        ...queueResult,
        ignoredCount,
        warnings,
        batchId: targetBatchId,
        batchLabel: targetPlanningBatch.label || targetBatchId,
    };
}

async function handleLoredeckCreatorPlanningDraft(options = {}, button = null) {
    if (options?.nodeType === 1) {
        button = options;
        options = {};
    }
    await runBusyAction(button, 'Planning...', async () => {
        if (!ensureLoreProviderReadyForAction('Deck Maker', 'lore')) return;
        let cached = getLoredeckCreatorBriefCache();
        let brief = cached.brief || {};
        if (!cached.approved || !brief) {
            toast('Approve a Deck Maker brief before planning Context and Tags.', 'warning');
            return;
        }
        let outline = getLoredeckCreatorOutline(cached);
        if (!cached.outlineApproved || !outline) {
            toast('Approve the Story Outline before planning Context and Tags.', 'warning');
            return;
        }
        const approvedTitles = getLoredeckCreatorApprovedTitleDrafts(cached);
        if (!approvedTitles.length) {
            toast('Approve title drafts before planning Context and Tags.', 'warning');
            return;
        }
        const targetPlanningBatch = options.targetPlanningBatch || getLoredeckCreatorNextPlanningBatch(cached);
        if (!targetPlanningBatch) {
            toast('All eligible Context and Tag sets have already been planned.', 'info');
            return;
        }
        const targetBatchId = normalizeLoredeckCreatorTitleId(targetPlanningBatch.id || targetPlanningBatch.label || '', '');
        let queuedBatchIds = getLoredeckCreatorPlanningQueuedBatchIds(cached);
        if (targetBatchId && getLoredeckCreatorPlanningAcceptedBatchIds(cached).has(targetBatchId)) {
            toast('That Context and Tag set has already been accepted.', 'info');
            return;
        }
        if (targetBatchId && queuedBatchIds.has(targetBatchId) && options.replan !== true) {
            toast('That Context and Tag set has already been planned.', 'info');
            return;
        }
        let targetApprovedTitles = approvedTitles.filter(draft => normalizeLoredeckCreatorTitleId(draft.creatorTitleBatchId || 'unbatched', 'unbatched') === targetBatchId);
        if (!targetApprovedTitles.length) {
            toast('Approve at least one title in this set before planning Context and Tags.', 'warning');
            return;
        }
        const pack = await ensureLoredeckCreatorGeneratedPack(cached);
        if (!pack) return;
        cached = getLoredeckCreatorBriefCache();
        brief = cached.brief || {};
        outline = getLoredeckCreatorOutline(cached);
        targetApprovedTitles = getLoredeckCreatorApprovedTitleDrafts(cached).filter(draft => normalizeLoredeckCreatorTitleId(draft.creatorTitleBatchId || 'unbatched', 'unbatched') === targetBatchId);
        if (!cached.approved || !cached.outlineApproved || !outline || !targetApprovedTitles.length) {
            toast('Deck Maker approvals changed while loading. Approve the brief, outline, and titles before planning Context and Tags.', 'warning');
            return;
        }
        queuedBatchIds = getLoredeckCreatorPlanningQueuedBatchIds(cached, pack);
        if (targetBatchId && getLoredeckCreatorPlanningAcceptedBatchIds(cached).has(targetBatchId)) {
            toast('That Context and Tag set has already been accepted.', 'info');
            return;
        }
        if (targetBatchId && queuedBatchIds.has(targetBatchId) && options.replan !== true) {
            toast('That Context and Tag set has already been planned.', 'info');
            return;
        }
        if (options.replan === true && getLoredeckCreatorPlanningPendingBatchIds(pack).has(targetBatchId)) {
            toast('That Context and Tag set still has proposals in Pending Review.', 'info');
            return;
        }
        const targetCoverageDimensionIds = normalizeLoredeckCreatorCoverageIdList(targetPlanningBatch.coverageDimensionIds || [], 24);
        const { generation } = startLoredeckCreatorGeneration(
            'planning_batch_draft',
            'Planning Context & Tags',
            {
                ...cached,
                currentStage: 'planning_drafting',
                generatedPackId: pack.packId,
                generatedPackTitle: pack.title || pack.packId,
            },
            {
                batchId: targetBatchId,
                batchLabel: targetPlanningBatch.label || targetBatchId,
                targetPlanningBatchId: targetBatchId,
                coverageDimensionIds: targetCoverageDimensionIds,
            }
        );
        if (!generation) return;
        let responseText = '';
        const generationSettings = getLoredeckCreatorGenerationSettings(cached);
        const effectiveProposalLimit = clampLoredeckCreatorInteger(
            options.planningProposalLimitOverride,
            1,
            24,
            generationSettings.planningProposalLimit
        );
        const requestContext = {
            generatedPackId: pack.packId,
            brief,
            outline,
            notes: cached.notes || loredeckCreatorNotes,
            targetPlanningBatch: compactLoredeckCreatorPlanningBatchForPrompt({
                ...targetPlanningBatch,
                approvedTitleCount: targetApprovedTitles.length,
            }),
            approvedTitleDrafts: targetApprovedTitles.map(compactLoredeckCreatorTitleDraftForRevision).slice(0, 40),
            existingTimelineIds: getLoredeckCreatorPlanningExistingTimelineIds(pack),
            existingTagIds: getLoredeckCreatorPlanningExistingTagIds(pack),
            queuedPlanningBatchIds: [...queuedBatchIds],
            proposalLimit: effectiveProposalLimit,
        };
        let generationOptions = null;
        let parsed = null;
        let planningCommit = null;
        try {
            const result = await runLoredeckCreatorSingleUnitGeneration({
                generation,
                stage: 'context_tag_planning',
                unitId: options.unitIdOverride || buildLoredeckCreatorPlanningGenerationUnitId(targetPlanningBatch, targetApprovedTitles),
                unitLabel: targetPlanningBatch.label ? `Context plan: ${targetPlanningBatch.label}` : 'Context and Tag plan',
                currentStage: 'planning_drafting',
                unitMeta: {
                    actionId: 'planning_batch_draft',
                    targetPlanningBatchId: targetBatchId,
                    targetPlanningBatchLabel: targetPlanningBatch.label || targetBatchId,
                    approvedTitleDraftIds: targetApprovedTitles.map(draft => normalizeLoredeckCreatorTitleId(draft.titleId || draft.id || '', '')).filter(Boolean),
                    proposalLimit: effectiveProposalLimit,
                    retrySmallerSupported: true,
                },
                requestOptions: {
                    batchId: targetBatchId,
                    batchLabel: targetPlanningBatch.label || targetBatchId,
                    targetPlanningBatchId: targetBatchId,
                    coverageDimensionIds: targetCoverageDimensionIds,
                },
                requestContext,
                requestResponse: requestLoredeckCreatorPlanningResponse,
                parseResponse: parseLoredeckAssistantResponse,
                repairResponse: repairLoredeckCreatorPlanningResponse,
                validateParsedResult: validateLoredeckCreatorPlanningResult,
                repairWarning: 'Deck Maker Context and Tag plan was normalized into Saga proposal format.',
                isRepairUsable: isLoredeckCreatorParsedPlanningUsable,
                resultRefType: 'creator_context_tag_plan',
                commitParsedResult: async ({ parsedResult, idempotencyKey }) => {
                    const commit = commitLoredeckCreatorPlanningResult(parsedResult, {
                        generationCommit: { idempotencyKey, stage: 'context_tag_planning' },
                        pack,
                        targetPlanningBatch,
                        targetBatchId,
                        throwOnFailure: true,
                    });
                    return {
                        planningCommit: commit,
                        resultRef: {
                            batchId: commit.batchId || targetBatchId,
                            batchLabel: commit.batchLabel || targetPlanningBatch.label || targetBatchId,
                            proposalCount: Array.isArray(parsedResult?.proposals) ? parsedResult.proposals.length : 0,
                            changeCount: commit.changeCount || 0,
                            replacedCount: commit.replacedCount || 0,
                            pendingChangeIds: commit.pendingChangeIds || [],
                            status: commit.queued
                                ? 'queued'
                                : (parsedResult?.clarifyingQuestions?.length ? 'needs_input' : 'empty'),
                        },
                    };
                },
            });
            if (result?.aborted || ignoreStaleLoredeckCreatorGeneration(generation, 'context/tag plan')) return;
            responseText = result.responseText;
            parsed = result.parsed;
            generationOptions = result.requestOptions;
            planningCommit = result.commitResult?.planningCommit || null;
        } catch (e) {
            if (isLoredeckCreatorAbortError(e) || ignoreStaleLoredeckCreatorGeneration(generation, 'context/tag plan')) return;
            const failure = prepareLoredeckCreatorStageFailure(e, 'Context and Tag Planning generation failed.', 'Context and Tag Planning');
            markLoredeckCreatorActionFailed(failure, failure.message);
            finishLoredeckCreatorGeneration(generation, 'error', failure.message);
            throw failure;
        }
        if (!parsed) {
            parsed = { summary: '', clarifyingQuestions: [], warnings: [], proposals: [] };
        }
        const repairPlanningResult = async (warningMessage = 'Deck Maker Context and Tag plan was normalized into Saga proposal format.') => {
            try {
                const repairedText = await repairLoredeckCreatorPlanningResponse(responseText, requestContext, generationOptions);
                if (ignoreStaleLoredeckCreatorGeneration(generation, 'context/tag plan repair')) return;
                const repaired = parseLoredeckAssistantResponse(repairedText);
                if (repaired.proposals.length || repaired.clarifyingQuestions.length) {
                    return {
                        ...repaired,
                        warnings: [
                            warningMessage,
                        ],
                    };
                }
            } catch (repairError) {
                console.warn('[Saga] Deck Maker planning repair failed:', repairError);
            }
            return null;
        };
        if (!planningCommit?.queued && !parsed.proposals.length && !parsed.clarifyingQuestions.length && String(responseText || '').trim()) {
            const repaired = await repairPlanningResult();
            if (repaired) {
                parsed = repaired;
            }
        }
        if (ignoreStaleLoredeckCreatorGeneration(generation, 'context/tag plan commit')) return;
        if (!planningCommit?.queued
            && parsed.proposals.length
            && !parsed.clarifyingQuestions.length
            && !parsed.proposals.some(isLoredeckCreatorPlanningProposal)) {
            const repaired = await repairPlanningResult('Deck Maker Context and Tag plan was normalized into supported planning proposal actions.');
            if (repaired) {
                parsed = repaired;
            }
        }
        const preview = buildLoredeckCreatorPlanningChanges(pack, parsed, targetPlanningBatch);
        const warnings = planningCommit?.warnings || [
            ...(preview.ignoredCount ? [`Ignored ${preview.ignoredCount} non-planning proposal${preview.ignoredCount === 1 ? '' : 's'}.`] : []),
        ];
        if (!planningCommit?.queued && parsed.clarifyingQuestions.length && !preview.changes.length) {
            setLoredeckCreatorBriefCache({
                ...getLoredeckCreatorBriefCache(),
                planningSummary: parsed.summary,
                planningQuestions: parsed.clarifyingQuestions,
                planningWarnings: warnings,
                generatedPackId: pack.packId,
                generatedPackTitle: pack.title || pack.packId,
                planningCurrentBatchId: targetBatchId,
                planningCurrentBatchLabel: targetPlanningBatch.label || targetBatchId,
                status: 'needs_input',
            });
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            finishLoredeckCreatorGeneration(generation, 'warning', `Needs clarification: ${parsed.clarifyingQuestions[0]}`);
            toast(`Deck Maker needs clarification: ${parsed.clarifyingQuestions[0]}`, 'warning');
            return;
        }
        if (!planningCommit?.queued && !preview.changes.length) {
            setLoredeckCreatorBriefCache({
                ...getLoredeckCreatorBriefCache(),
                planningSummary: parsed.summary,
                planningQuestions: parsed.clarifyingQuestions,
                planningWarnings: warnings,
                generatedPackId: pack.packId,
                generatedPackTitle: pack.title || pack.packId,
                planningCurrentBatchId: targetBatchId,
                planningCurrentBatchLabel: targetPlanningBatch.label || targetBatchId,
                status: 'needs_input',
            });
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            finishLoredeckCreatorGeneration(generation, 'warning', warnings[0] || 'No planning proposals returned.');
            toast(warnings[0] || 'Deck Maker returned no Context or Tag planning proposals.', 'warning');
            return;
        }
        if (!planningCommit?.queued) {
            try {
                planningCommit = commitLoredeckCreatorPlanningResult(parsed, {
                    pack,
                    targetPlanningBatch,
                    targetBatchId,
                    throwOnFailure: true,
                });
            } catch (error) {
                if (ignoreStaleLoredeckCreatorGeneration(generation, 'context/tag plan commit')) return;
                const failure = prepareLoredeckCreatorStageFailure(error, 'Could not queue Deck Maker planning proposals for Pending Review.', 'Context and Tag Planning');
                markLoredeckCreatorActionFailed(failure, failure.message);
                finishLoredeckCreatorGeneration(generation, 'error', failure.message);
                throw failure;
            }
        }
        selectLoredeckForDetails(pack.packId, { refresh: false });
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();
        const changeCount = Number(planningCommit?.changeCount) || preview.changes.length;
        finishLoredeckCreatorGeneration(generation, 'success', `Drafted ${changeCount} planning proposal${changeCount === 1 ? '' : 's'} for review.`);
        toast(`Drafted ${changeCount} ${targetPlanningBatch.label || targetBatchId} planning proposal${changeCount === 1 ? '' : 's'} for Pending Review.`, 'success');
    });
}

function getLoredeckCreatorAcceptedPlanningStatus(pack = null) {
    const timeline = normalizeLoredeckTimelineRegistry(pack?.timelineRegistry);
    const tags = normalizeLoredeckTagRegistry(pack?.tagRegistry);
    const anchorCount = timeline.anchors?.length || 0;
    const windowCount = timeline.windows?.length || 0;
    const tagCount = Object.keys(tags.tags || {}).length;
    return {
        timeline,
        tags,
        anchorCount,
        windowCount,
        tagCount,
        ready: (anchorCount + windowCount) > 0 && tagCount > 0,
    };
}

function compactLoredeckCreatorTimelineAnchorForPrompt(anchor = {}) {
    return {
        id: anchor.id || '',
        label: anchor.label || '',
        contextType: anchor.contextType || '',
        sortKey: Number.isFinite(Number(anchor.sortKey)) ? Number(anchor.sortKey) : null,
        dateRange: isPlainObjectValue(anchor.dateRange) ? anchor.dateRange : null,
        book: anchor.book || '',
        work: anchor.work || '',
        arc: anchor.arc || '',
        phase: anchor.phase || '',
        season: anchor.season || '',
        episode: anchor.episode || '',
        chapter: anchor.chapter || '',
        issue: anchor.issue || '',
        quest: anchor.quest || '',
        gameStage: anchor.gameStage || '',
        aliases: Array.isArray(anchor.aliases) ? anchor.aliases.slice(0, 12) : [],
        tags: Array.isArray(anchor.tags) ? anchor.tags.slice(0, 16) : [],
        notes: truncateText(anchor.notes || '', 500),
    };
}

function compactLoredeckCreatorTimelineWindowForPrompt(windowDef = {}) {
    return {
        id: windowDef.id || '',
        label: windowDef.label || '',
        contextType: windowDef.contextType || '',
        anchorFrom: windowDef.anchorFrom || '',
        anchorTo: windowDef.anchorTo || '',
        sortKeyFrom: Number.isFinite(Number(windowDef.sortKeyFrom)) ? Number(windowDef.sortKeyFrom) : null,
        sortKeyTo: Number.isFinite(Number(windowDef.sortKeyTo)) ? Number(windowDef.sortKeyTo) : null,
        dateRange: isPlainObjectValue(windowDef.dateRange) ? windowDef.dateRange : null,
        aliases: Array.isArray(windowDef.aliases) ? windowDef.aliases.slice(0, 12) : [],
        tags: Array.isArray(windowDef.tags) ? windowDef.tags.slice(0, 16) : [],
        notes: truncateText(windowDef.notes || '', 500),
    };
}

function compactLoredeckCreatorTimelineRegistryForPrompt(timeline = {}, options = {}) {
    const registry = normalizeLoredeckTimelineRegistry(timeline);
    const includeAnchorIds = options.includeAnchorIds instanceof Set
        ? options.includeAnchorIds
        : new Set(Array.isArray(options.includeAnchorIds) ? options.includeAnchorIds : []);
    const includeWindowIds = options.includeWindowIds instanceof Set
        ? options.includeWindowIds
        : new Set(Array.isArray(options.includeWindowIds) ? options.includeWindowIds : []);
    const hasFilter = includeAnchorIds.size > 0 || includeWindowIds.size > 0;
    const selectedWindows = (registry.windows || []).filter(windowDef => {
        if (!hasFilter) return true;
        if (includeWindowIds.has(windowDef.id)) return true;
        return !!(
            includeAnchorIds.size >= 2
            && windowDef.anchorFrom
            && windowDef.anchorTo
            && includeAnchorIds.has(windowDef.anchorFrom)
            && includeAnchorIds.has(windowDef.anchorTo)
        );
    });
    const selectedAnchorIds = new Set(includeAnchorIds);
    for (const windowDef of selectedWindows) {
        if (windowDef.anchorFrom) selectedAnchorIds.add(windowDef.anchorFrom);
        if (windowDef.anchorTo) selectedAnchorIds.add(windowDef.anchorTo);
    }
    return {
        schemaVersion: registry.schemaVersion || 1,
        timelineMode: registry.timelineMode || 'hybrid',
        defaultContextType: registry.defaultContextType || '',
        sortKeyScale: registry.sortKeyScale || 'pack_local',
        summary: truncateText(registry.summary || '', 800),
        anchors: (registry.anchors || [])
            .filter(anchor => !hasFilter || selectedAnchorIds.has(anchor.id))
            .slice(0, 120)
            .map(compactLoredeckCreatorTimelineAnchorForPrompt),
        windows: selectedWindows.slice(0, 120).map(compactLoredeckCreatorTimelineWindowForPrompt),
    };
}

function compactLoredeckCreatorTagRegistryForPrompt(registry = {}, options = {}) {
    const normalized = normalizeLoredeckTagRegistry(registry);
    const includeTagIds = options.includeTagIds instanceof Set
        ? options.includeTagIds
        : new Set(Array.isArray(options.includeTagIds) ? options.includeTagIds : []);
    const tags = {};
    let count = 0;
    for (const [id, def] of Object.entries(normalized.tags || {})) {
        if (includeTagIds.size && !includeTagIds.has(id)) continue;
        tags[id] = {
            label: def.label || humanizeLoredeckTagId(id),
            description: truncateText(def.description || '', 500),
            aliases: Array.isArray(def.aliases) ? def.aliases.slice(0, 12) : [],
            parents: Array.isArray(def.parents) ? def.parents.slice(0, 12) : [],
            sensitive: def.sensitive === true,
            deprecated: def.deprecated === true,
            replacement: def.replacement || '',
        };
        count += 1;
        if (count >= 200) break;
    }
    return {
        schemaVersion: normalized.schemaVersion || 1,
        tags,
    };
}

function getLoredeckCreatorBlockedEntryIds(pack = {}, draftCache = null) {
    pack = pack || {};
    const blocked = new Set(Object.keys(pack.entryOverrides || {}).map(id => normalizeLoredeckEntryId(id)).filter(Boolean));
    for (const id of collectLoredeckCreatorChangeEntryIds(normalizeLoredeckPendingChanges(pack.pendingChanges))) {
        const clean = normalizeLoredeckEntryId(id);
        if (clean) blocked.add(clean);
    }
    const effectiveDraftCache = draftCache || getLoredeckCreatorDraftCacheForPack(pack.packId);
    for (const id of collectLoredeckCreatorChangeEntryIds(getLoredeckAssistantDraftChanges(effectiveDraftCache))) {
        const clean = normalizeLoredeckEntryId(id);
        if (clean) blocked.add(clean);
    }
    return blocked;
}

function getLoredeckCreatorEntryDraftBlockState(pack = {}, draftCache = null) {
    pack = pack || {};
    const acceptedEntryIds = new Set(Object.keys(pack.entryOverrides || {}).map(id => normalizeLoredeckEntryId(id)).filter(Boolean));
    const pendingEntryIds = new Set();
    for (const id of collectLoredeckCreatorChangeEntryIds(normalizeLoredeckPendingChanges(pack.pendingChanges))) {
        const clean = normalizeLoredeckEntryId(id);
        if (clean && !acceptedEntryIds.has(clean)) pendingEntryIds.add(clean);
    }
    const draftReviewEntryIds = new Set();
    const effectiveDraftCache = draftCache || getLoredeckCreatorDraftCacheForPack(pack.packId);
    for (const id of collectLoredeckCreatorChangeEntryIds(getLoredeckAssistantDraftChanges(effectiveDraftCache))) {
        const clean = normalizeLoredeckEntryId(id);
        if (clean && !acceptedEntryIds.has(clean) && !pendingEntryIds.has(clean)) draftReviewEntryIds.add(clean);
    }
    return {
        acceptedEntryIds,
        pendingEntryIds,
        draftReviewEntryIds,
        blocked: new Set([...acceptedEntryIds, ...pendingEntryIds, ...draftReviewEntryIds]),
    };
}

function getLoredeckCreatorEntryBatchLimit(limit = null, cached = getLoredeckCreatorBriefCache()) {
    const settings = getLoredeckCreatorGenerationSettings(cached);
    const fallback = settings.entryBatchSize || LOREDECK_CREATOR_ENTRY_BATCH_SIZE;
    return Math.max(1, Math.min(LOREDECK_CREATOR_ENTRY_BATCH_MAX, Number(limit ?? fallback) || fallback));
}

function getLoredeckCreatorPlanningAcceptedBatchIds(cached = {}) {
    return new Set(normalizeLoredeckCreatorTitleIdList(cached?.planningBatchAcceptedIds || [], 1200));
}

function getLoredeckCreatorEntryEligibleBatchIds(cached = {}, planning = null, pack = null) {
    const accepted = getLoredeckCreatorPlanningAcceptedBatchIds(cached);
    if (accepted.size) return accepted;
    const queued = getLoredeckCreatorPlanningQueuedBatchIds(cached, pack);
    if (queued.size) return new Set();
    if (planning?.ready) {
        return new Set(getLoredeckCreatorTitleBatchRows(cached).map(batch => batch.id).filter(Boolean));
    }
    return new Set();
}

function getLoredeckCreatorTitleBatchById(cached = {}, batchId = '') {
    const id = normalizeLoredeckCreatorTitleId(batchId || '', '');
    return getLoredeckCreatorTitleBatchRows(cached).find(batch => batch.id === id) || null;
}

function getLoredeckCreatorDraftBatchId(draft = {}) {
    return normalizeLoredeckCreatorTitleId(getLoredeckCreatorEntryDraftBatchId(draft), 'unbatched');
}

function getLoredeckCreatorEntryDraftPool(cached = {}, pack = {}) {
    const planning = getLoredeckCreatorAcceptedPlanningStatus(pack || {});
    const eligibleBatchIds = getLoredeckCreatorEntryEligibleBatchIds(cached, planning, pack);
    const approved = getLoredeckCreatorApprovedTitleDrafts(cached);
    const eligibleApproved = approved.filter(draft => eligibleBatchIds.has(getLoredeckCreatorDraftBatchId(draft)));
    const draftCache = Array.isArray(cached?.draftChanges) ? cached : null;
    const blockState = getLoredeckCreatorEntryDraftBlockState(pack || {}, draftCache);
    const blocked = blockState.blocked;
    const selectedIds = getLoredeckCreatorSelectedTitleIds(cached);
    const selectedApproved = eligibleApproved.filter(draft => selectedIds.has(draft.titleId));
    const preferred = selectedApproved.length ? selectedApproved : eligibleApproved;
    const batchOrder = getLoredeckCreatorTitleBatchRows(cached).map(batch => batch.id);
    const totalRemaining = getLoredeckCreatorUnhandledEntryDrafts(preferred, blocked);
    const activeBatchId = selectLoredeckCreatorEntryDraftBatchId(
        preferred,
        batchOrder.filter(batchId => eligibleBatchIds.has(batchId)),
        blocked
    );
    const source = activeBatchId
        ? preferred.filter(draft => getLoredeckCreatorDraftBatchId(draft) === activeBatchId)
        : preferred;
    const remaining = source.filter(draft => {
        const id = normalizeLoredeckEntryId(draft.titleId);
        return id && !blocked.has(id);
    });
    return {
        approved,
        eligibleApproved,
        eligibleBatchIds,
        activeBatchId,
        activeBatch: getLoredeckCreatorTitleBatchById(cached, activeBatchId),
        selectedApproved,
        preferred,
        source,
        blocked,
        acceptedEntryIds: blockState.acceptedEntryIds,
        pendingEntryIds: blockState.pendingEntryIds,
        draftReviewEntryIds: blockState.draftReviewEntryIds,
        totalRemaining,
        remaining,
    };
}

function getLoredeckCreatorEntryDraftProgress(cached = {}, pack = {}) {
    const pool = getLoredeckCreatorEntryDraftPool(cached, pack || {});
    const remainingCount = pool.totalRemaining.length;
    const activeBatchRemainingCount = pool.remaining.length;
    const sourceCount = pool.source.length;
    const preferredCount = pool.preferred.length;
    const batchSize = getLoredeckCreatorEntryBatchLimit(null, cached);
    return {
        ...pool,
        batchSize,
        remainingCount,
        activeBatchRemainingCount,
        handledCount: Math.max(0, preferredCount - remainingCount),
        activeBatchHandledCount: Math.max(0, sourceCount - activeBatchRemainingCount),
        batchCount: remainingCount ? Math.ceil(remainingCount / batchSize) : 0,
        activeBatchCount: activeBatchRemainingCount ? Math.ceil(activeBatchRemainingCount / batchSize) : 0,
        eligibleBatchCount: pool.eligibleBatchIds?.size || 0,
        activeBatchLabel: pool.activeBatch?.label || pool.activeBatchId || '',
    };
}

function getLoredeckCreatorEntryTargetTitles(cached = {}, pack = {}, limit = null) {
    const batchLimit = getLoredeckCreatorEntryBatchLimit(limit, cached);
    return getLoredeckCreatorEntryDraftPool(cached, pack || {}).remaining.slice(0, batchLimit);
}

function getLoredeckCreatorEntryRemainingTitlesForOptions(cached = {}, pack = {}, options = {}) {
    const targetTitleIds = new Set(normalizeLoredeckCreatorTitleIdList(options.targetTitleIds || [], 200, 180));
    const excludedTargetTitleIds = new Set(normalizeLoredeckCreatorTitleIdList(options.excludedTargetTitleIds || options.excludeTargetTitleIds || [], 1000, 180));
    const targetPlanningBatchId = normalizeLoredeckCreatorTitleId(options.targetPlanningBatchId || options.targetPlanningBatch?.id || '', '');
    const pool = getLoredeckCreatorEntryDraftPool(cached, pack || {});
    if (!targetTitleIds.size && !targetPlanningBatchId && !excludedTargetTitleIds.size) return pool.totalRemaining;
    return pool.totalRemaining
        .filter(draft => {
            const draftId = normalizeLoredeckCreatorTitleId(draft.titleId || draft.id || '', '');
            if (excludedTargetTitleIds.size && excludedTargetTitleIds.has(draftId)) return false;
            if (targetTitleIds.size && !targetTitleIds.has(draftId)) return false;
            if (targetPlanningBatchId && getLoredeckCreatorDraftBatchId(draft) !== targetPlanningBatchId) return false;
            return true;
        });
}

function getLoredeckCreatorEntryTargetTitlesForOptions(cached = {}, pack = {}, options = {}, limit = null) {
    const batchLimit = getLoredeckCreatorEntryBatchLimit(limit ?? options.batchSize, cached);
    const targetTitleIds = new Set(normalizeLoredeckCreatorTitleIdList(options.targetTitleIds || [], 200, 180));
    const targetPlanningBatchId = normalizeLoredeckCreatorTitleId(options.targetPlanningBatchId || options.targetPlanningBatch?.id || '', '');
    if (!targetTitleIds.size && !targetPlanningBatchId) return getLoredeckCreatorEntryTargetTitles(cached, pack, batchLimit);
    return getLoredeckCreatorEntryRemainingTitlesForOptions(cached, pack, options).slice(0, batchLimit);
}

function getLoredeckCreatorEntryDraftProgressForOptions(cached = {}, pack = {}, options = {}) {
    const batchSize = getLoredeckCreatorEntryBatchLimit(options.batchSize, cached);
    const remainingCount = getLoredeckCreatorEntryRemainingTitlesForOptions(cached, pack, options).length;
    return {
        batchSize,
        remainingCount,
        batchCount: remainingCount ? Math.ceil(remainingCount / batchSize) : 0,
    };
}

function updateLoredeckCreatorEntryDraftBusyProgress(busy, cached = {}, pack = {}, options = {}, completedBatches = 0, totalBatches = 1) {
    if (!busy?.setText || !pack) return;
    const progress = getLoredeckCreatorEntryDraftProgressForOptions(cached, pack, options);
    const remainingCount = Math.max(0, Number(progress.remainingCount) || 0);
    const safeTotal = Math.max(1, Number(totalBatches) || 1);
    const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completedBatches) || 0));
    const prefix = safeTotal > 1
        ? `${safeCompleted} / ${safeTotal} calls`
        : 'Drafting';
    busy.setText(`${prefix} | ${remainingCount} remain`);
}

function getLoredeckCreatorExistingEntryIdsForPrompt(pack = {}) {
    const ids = new Set();
    for (const id of Object.keys(pack.entryOverrides || {})) {
        const clean = normalizeLoredeckEntryId(id);
        if (clean) ids.add(clean);
    }
    for (const id of collectLoredeckCreatorChangeEntryIds(normalizeLoredeckPendingChanges(pack.pendingChanges))) {
        const clean = normalizeLoredeckEntryId(id);
        if (clean) ids.add(clean);
    }
    for (const id of collectLoredeckCreatorChangeEntryIds(getLoredeckAssistantDraftChanges(getLoredeckCreatorDraftCacheForPack(pack.packId)))) {
        const clean = normalizeLoredeckEntryId(id);
        if (clean) ids.add(clean);
    }
    return [...ids].slice(0, 240);
}

function compactLoredeckCreatorEntryTitleForPrompt(draft = {}) {
    return {
        ...compactLoredeckCreatorTitleDraftForRevision(draft),
        targetEntryId: normalizeLoredeckEntryId(draft.titleId),
    };
}

function getLoredeckCreatorTargetTitleCoverageMap(targetTitles = []) {
    const map = new Map();
    for (const draft of Array.isArray(targetTitles) ? targetTitles : []) {
        const entryId = normalizeLoredeckEntryId(draft?.targetEntryId || draft?.titleId || draft?.id || '');
        if (!entryId) continue;
        map.set(entryId, {
            titleId: normalizeLoredeckCreatorTitleId(draft.titleId || draft.id || entryId, entryId),
            title: String(draft.title || '').trim(),
            coverageDimensionIds: getLoredeckCreatorTitleCoverageIds(draft),
        });
    }
    return map;
}

function formatLoredeckCreatorEntryPreflightWarnings(targetTitle = {}) {
    const warnings = [];
    const titleLabel = String(targetTitle?.title || targetTitle?.targetEntryId || targetTitle?.titleId || '').trim();
    const prefix = titleLabel ? `${titleLabel}: ` : '';
    const pushList = (label, values = []) => {
        const list = [...new Set((Array.isArray(values) ? values : []).map(item => String(item || '').trim()).filter(Boolean))];
        if (!list.length) return;
        warnings.push(`${prefix}${label} ${list.slice(0, 8).join(', ')} before drafting.`);
    };
    pushList('Omitted title tag', targetTitle.omittedTitleTags);
    pushList('Omitted timeline anchor', targetTitle.omittedAnchorIds);
    pushList('Omitted timeline window', targetTitle.omittedWindowIds);
    const ambiguousTags = (Array.isArray(targetTitle.planningGaps) ? targetTitle.planningGaps : [])
        .filter(gap => gap?.reasonCode === 'ambiguous_tag_reference')
        .map(gap => gap.id);
    pushList('Skipped ambiguous title tag', ambiguousTags);
    return warnings.slice(0, 6);
}

function getLoredeckCreatorTargetTitlePreflightWarningMap(targetTitles = []) {
    const map = new Map();
    for (const draft of Array.isArray(targetTitles) ? targetTitles : []) {
        const entryId = normalizeLoredeckEntryId(draft?.targetEntryId || draft?.titleId || draft?.id || '');
        if (!entryId) continue;
        const warnings = formatLoredeckCreatorEntryPreflightWarnings(draft);
        if (warnings.length) map.set(entryId, warnings);
    }
    return map;
}

function buildLoredeckCreatorEntryPreflightCachePatch(preflight = {}) {
    const summary = preflight?.summary && typeof preflight.summary === 'object' && !Array.isArray(preflight.summary)
        ? preflight.summary
        : { targetCount: 0, acceptedTagCount: 0, omittedTagCount: 0, ambiguousTagCount: 0, omittedAnchorCount: 0, omittedWindowCount: 0, planningGapCount: 0 };
    return {
        entryDraftLastPreflightSummary: {
            targetCount: Number(summary.targetCount) || 0,
            acceptedTagCount: Number(summary.acceptedTagCount) || 0,
            omittedTagCount: Number(summary.omittedTagCount) || 0,
            ambiguousTagCount: Number(summary.ambiguousTagCount) || 0,
            omittedAnchorCount: Number(summary.omittedAnchorCount) || 0,
            omittedWindowCount: Number(summary.omittedWindowCount) || 0,
            planningGapCount: Number(summary.planningGapCount) || 0,
        },
        entryDraftLastPreflightDiagnostics: Array.isArray(preflight?.diagnostics) ? preflight.diagnostics.slice(0, 80) : [],
    };
}

function markLoredeckCreatorEntryChange(change = {}, pack = {}, batch = {}, targetTitles = []) {
    const title = String(change.title || '')
        .replace(/Lore Assistant/gi, 'Deck Maker')
        .trim();
    const payload = cloneLoredeckJson(change.payload) || {};
    const batchId = normalizeLoredeckCreatorTitleId(batch?.id || batch?.label || '', '');
    const batchLabel = String(batch?.label || batchId || '').trim();
    const batchCoverageDimensionIds = normalizeLoredeckCreatorCoverageIdList(batch?.coverageDimensionIds || [], 12);
    const targetCoverageMap = getLoredeckCreatorTargetTitleCoverageMap(targetTitles);
    const changedEntryIds = new Set([
        ...(change.affectedEntryIds || []).map(id => normalizeLoredeckEntryId(id)).filter(Boolean),
        ...Object.keys(isPlainObjectValue(payload.entryOverrides) ? payload.entryOverrides : {}).map(id => normalizeLoredeckEntryId(id)).filter(Boolean),
    ]);
    const coverageDimensionIds = normalizeLoredeckCreatorCoverageIdList([
        ...batchCoverageDimensionIds,
        ...[...changedEntryIds].flatMap(id => targetCoverageMap.get(id)?.coverageDimensionIds || []),
    ], 12);
    const entryOverrides = isPlainObjectValue(payload.entryOverrides) ? payload.entryOverrides : {};
    for (const [rawEntryId, entry] of Object.entries(entryOverrides)) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        const entryId = normalizeLoredeckEntryId(entry.id || rawEntryId);
        const target = targetCoverageMap.get(entryId) || null;
        const entryCoverageDimensionIds = normalizeLoredeckCreatorCoverageIdList([
            ...(target?.coverageDimensionIds || []),
            ...batchCoverageDimensionIds,
        ], 12);
        entry.source = `saga-loredeck:${pack.packId || ''}:creator`;
        entry.extensions = {
            ...(entry.extensions || {}),
            sagaLoredeckCreator: {
                packId: pack.packId || '',
                source: 'loredeck_creator',
                planningBatchId: batchId,
                planningBatchLabel: batchLabel,
                titleId: target?.titleId || entryId,
                coverageDimensionIds: entryCoverageDimensionIds,
                draftedAt: Date.now(),
            },
        };
        if (entry.extensions?.sagaLoredeckOverride) {
            entry.extensions.sagaLoredeckOverride.source = 'loredeck_creator';
        }
    }
    return {
        ...change,
        source: 'loredeck_creator',
        action: change.action === 'assistant_upsert_entry' ? 'creator_upsert_entry' : change.action,
        title: title || change.title,
        description: `${change.description || 'Deck Maker drafted a schema v3 Lorecard for review.'}${batchLabel ? ` Batch: ${batchLabel}.` : ''}`,
        payload,
        preview: {
            ...(change.preview || {}),
            creatorEntryBatch: {
                id: batchId,
                label: batchLabel,
                coverageDimensionIds,
            },
        },
    };
}

function prepareLoredeckCreatorEntryChange(change = {}, pack = {}, batch = {}, unitId = '', targetTitles = [], index = 0) {
    const marked = markLoredeckCreatorEntryChange(change, pack, batch, targetTitles);
    const targetEntryIds = [...getLoredeckCreatorEntryTargetIds(targetTitles)];
    const preflightWarningMap = getLoredeckCreatorTargetTitlePreflightWarningMap(targetTitles);
    const entryId = normalizeLoredeckEntryId((marked.affectedEntryIds || [])[0] || Object.keys(marked.payload?.entryOverrides || {})[0] || '');
    const preflightWarnings = entryId ? (preflightWarningMap.get(entryId) || []) : [];
    const titleCoverageMap = Object.fromEntries(
        [...getLoredeckCreatorTargetTitleCoverageMap(targetTitles).entries()]
            .map(([entryId, record]) => [entryId, {
                titleId: record.titleId,
                coverageDimensionIds: record.coverageDimensionIds,
            }])
    );
    return {
        ...marked,
        changeId: createLoredeckCreatorEntryChangeId(marked, batch, unitId, index),
        preview: {
            ...(marked.preview || {}),
            creatorEntryBatch: {
                ...(marked.preview?.creatorEntryBatch || {}),
                unitId,
                targetEntryIds,
                titleCoverageMap,
                ...(preflightWarnings.length ? { preflightWarnings } : {}),
            },
        },
    };
}

function buildLoredeckCreatorEntryDraftChanges(pack = {}, parsed = {}, rows = [], targetTitles = [], targetPlanningBatch = {}, unitId = '') {
    const proposals = Array.isArray(parsed?.proposals) ? parsed.proposals : [];
    const targetEntryIds = getLoredeckCreatorEntryTargetIds(targetTitles);
    const targetByEntryId = new Map((Array.isArray(targetTitles) ? targetTitles : [])
        .map(draft => {
            const entryId = normalizeLoredeckEntryId(draft?.targetEntryId || draft?.titleId || draft?.id || '');
            return entryId ? [entryId, draft] : null;
        })
        .filter(Boolean));
    const allowed = proposals.filter(proposal => {
        if (proposal.action !== 'upsert_entry') return false;
        const proposalId = normalizeLoredeckEntryId(proposal.entryId || proposal.entry?.id);
        return proposalId && targetEntryIds.has(proposalId);
    });
    const preparedChanges = buildLoredeckAssistantPendingChanges(pack, allowed, rows)
        .filter(change => change.targetKind === 'entry')
        .map((change, index) => prepareLoredeckCreatorEntryChange(change, pack, targetPlanningBatch, unitId, targetTitles, index));
    const changes = [];
    const guardWarnings = [];
    const rejectionDiagnostics = [];
    let invalidCount = 0;
    let repairedCount = 0;
    for (const change of preparedChanges) {
        const guarded = guardLoredeckCreatorEntryDraftChange(pack, change, { targetEntryIds, targetTitleByEntryId: targetByEntryId });
        if (guarded.errors.length || !guarded.change) {
            invalidCount += 1;
            const label = change.affectedEntryIds?.[0] || change.title || change.changeId || 'Lorecard draft';
            guardWarnings.push(`${label}: ${guarded.errors.join('; ')}`);
            const entryId = normalizeLoredeckEntryId(change.affectedEntryIds?.[0] || Object.keys(change.payload?.entryOverrides || {})[0] || '');
            rejectionDiagnostics.push(...buildLoredeckCreatorEntryRejectionDiagnostics({
                entryId,
                targetTitle: targetByEntryId.get(entryId) || null,
                errors: guarded.errors,
            }));
            continue;
        }
        if (guarded.repaired) repairedCount += 1;
        guardWarnings.push(...guarded.warnings);
        const repairedChange = guarded.warnings.length
            ? {
                ...guarded.change,
                preview: {
                    ...(guarded.change.preview || {}),
                    creatorEntryBatch: {
                        ...(guarded.change.preview?.creatorEntryBatch || {}),
                        repairWarnings: guarded.warnings.slice(0, 8),
                    },
                },
            }
            : guarded.change;
        changes.push(repairedChange);
    }
    return {
        allowed,
        ignoredCount: proposals.length - allowed.length,
        invalidCount,
        repairedCount,
        warnings: [...new Set(guardWarnings)].slice(0, 20),
        rejectionDiagnostics,
        rejectionSummary: summarizeLoredeckCreatorEntryRejections(rejectionDiagnostics),
        changes,
    };
}

function isLoredeckCreatorEntryDraftChange(change = {}, unitId = '') {
    if (String(change?.source || '').trim() !== 'loredeck_creator') return false;
    if (change.targetKind !== 'entry') return false;
    if (!unitId) return true;
    return String(change.preview?.creatorEntryBatch?.unitId || '').trim() === unitId;
}

function countLoredeckCreatorEntryDraftUnits(changes = []) {
    const units = new Set();
    for (const change of changes || []) {
        if (!isLoredeckCreatorEntryDraftChange(change)) continue;
        const unitId = String(change.preview?.creatorEntryBatch?.unitId || change.changeId || '').trim();
        if (unitId) units.add(unitId);
    }
    return units.size;
}

function upsertLoredeckCreatorEntryDraftChanges(pack = {}, changes = [], context = {}) {
    const draftChanges = normalizeLoredeckPendingChanges(changes);
    if (!pack?.packId || !draftChanges.length) {
        return {
            queued: false,
            changeCount: 0,
            replacedCount: 0,
            draftChangeIds: [],
        };
    }
    const unitId = String(context.unitId || '').trim();
    const incomingIds = new Set(draftChanges.map(change => change.changeId));
    let replacedCount = 0;
    const nextCache = updateLoredeckAssistantDraftCache(pack.packId, current => {
        const existing = getLoredeckAssistantDraftChanges(current);
        const selectedIds = getLoredeckAssistantSelectedDraftIds(current);
        const retained = existing.filter(change => {
            const replace = incomingIds.has(change.changeId) || (unitId && isLoredeckCreatorEntryDraftChange(change, unitId));
            if (replace) {
                replacedCount += 1;
                selectedIds.delete(change.changeId);
            }
            return !replace;
        });
        for (const change of draftChanges) selectedIds.add(change.changeId);
        const nextChanges = normalizeLoredeckPendingChanges([...retained, ...draftChanges]);
        const creatorDraftCount = nextChanges.filter(change => isLoredeckCreatorEntryDraftChange(change)).length;
        return {
            ...current,
            source: 'loredeck_creator',
            summary: context.summary || `Deck Maker drafted ${draftChanges.length} schema v3 Lorecard${draftChanges.length === 1 ? '' : 's'}.`,
            questions: Array.isArray(context.questions) ? context.questions : [],
            warnings: Array.isArray(context.warnings) ? context.warnings : [],
            proposalCount: Number.isFinite(Number(context.proposalCount)) ? Number(context.proposalCount) : (Number(current.proposalCount) || 0),
            queuedCount: Number(current.queuedCount) || 0,
            draftChanges: nextChanges,
            selectedDraftChangeIds: [...selectedIds].filter(id => nextChanges.some(change => change.changeId === id)),
            mode: 'creator_entry_generation',
            targetScope: 'approved_titles',
            creatorEntryDraftCount: creatorDraftCount,
            creatorEntryBatchCount: countLoredeckCreatorEntryDraftUnits(nextChanges),
            createdAt: current.createdAt || Date.now(),
            updatedAt: Date.now(),
        };
    });
    return {
        queued: true,
        changeCount: draftChanges.length,
        replacedCount,
        draftChangeIds: draftChanges.map(change => change.changeId),
        draftCount: getLoredeckAssistantDraftChanges(nextCache).length,
    };
}

function commitLoredeckCreatorEntryDraftResult(parsed = {}, options = {}) {
    const pack = options.pack;
    const committed = getLoredeckCreatorCommittedGenerationResult(getLoredeckCreatorBriefCache(), options.generationCommit);
    if (committed) return committed.commitResult.entryCommit;
    const rows = Array.isArray(options.rows) ? options.rows : [];
    const targetTitles = Array.isArray(options.targetTitles) ? options.targetTitles : [];
    const targetPlanningBatch = options.targetPlanningBatch || {};
    const unitId = String(options.unitId || buildLoredeckCreatorEntryGenerationUnitId(targetPlanningBatch, targetTitles)).trim();
    const preflightCachePatch = buildLoredeckCreatorEntryPreflightCachePatch(options.entryTargetPreflight || {});
    if (!pack?.packId) {
        if (options.throwOnFailure) throw new Error('Generated Loredeck shell is missing.');
        return { queued: false, changeCount: 0, replacedCount: 0, draftChangeIds: [], warnings: [] };
    }
    const {
        ignoredCount,
        invalidCount,
        repairedCount,
        warnings: guardWarnings,
        rejectionDiagnostics,
        rejectionSummary,
        changes,
    } = buildLoredeckCreatorEntryDraftChanges(pack, parsed, rows, targetTitles, targetPlanningBatch, unitId);
    const warnings = [
        ...(ignoredCount ? [`Ignored ${ignoredCount} proposal${ignoredCount === 1 ? '' : 's'} outside this micro-batch.`] : []),
        ...(invalidCount ? [`Rejected ${invalidCount} Deck Maker Lorecard draft${invalidCount === 1 ? '' : 's'} with invalid schema v3 references.`] : []),
        ...(repairedCount ? [`Repaired ${repairedCount} Deck Maker Lorecard draft${repairedCount === 1 ? '' : 's'} deterministically before Draft Review.`] : []),
        ...guardWarnings,
    ];
    if (!changes.length) {
        if (options.throwOnFailure === true && invalidCount > 0 && rejectionSummary?.targetEntryIds?.length) {
            const error = createLoredeckCreatorEntryGuardRejectedAllError({
                invalidCount,
                rejectionDiagnostics,
                rejectionSummary,
                rejectedTargetIds: rejectionSummary.targetEntryIds,
            });
            error.warnings = warnings;
            throw error;
        }
        return {
            queued: false,
            changeCount: 0,
            replacedCount: 0,
            draftChangeIds: [],
            ignoredCount,
            invalidCount,
            repairedCount,
            rejectionDiagnostics,
            rejectionSummary,
            warnings,
        };
    }
    const committedChanges = attachLoredeckCreatorGenerationCommitToChanges(changes, options.generationCommit, parsed);
    const draftResult = upsertLoredeckCreatorEntryDraftChanges(pack, committedChanges, {
        unitId,
        summary: parsed.summary,
        questions: parsed.clarifyingQuestions,
        warnings,
        proposalCount: Array.isArray(parsed?.proposals) ? parsed.proposals.length : 0,
    });
    if (!draftResult.queued) {
        if (options.throwOnFailure) throw new Error('Could not write Deck Maker Lorecard drafts to the draft-review queue.');
        return {
            ...draftResult,
            ignoredCount,
            invalidCount,
            repairedCount,
            rejectionDiagnostics,
            rejectionSummary,
            warnings,
        };
    }
    const freshCache = getLoredeckCreatorBriefCache();
    const freshProgress = getLoredeckCreatorEntryDraftProgress(freshCache, pack);
    const allDrafts = getLoredeckAssistantDraftChanges(getLoredeckCreatorDraftCacheForPack(pack.packId));
    setLoredeckCreatorBriefCache({
        ...freshCache,
        ...buildLoredeckCreatorGenerationCommitPatch(freshCache, options.generationCommit, {
            unitId, batchId: targetPlanningBatch?.id || '', draftChangeIds: draftResult.draftChangeIds,
        }),
        ...preflightCachePatch,
        draftChanges: allDrafts,
        entryDraftSummary: parsed.summary,
        entryDraftQuestions: parsed.clarifyingQuestions,
        entryDraftWarnings: warnings,
        entryDraftCount: allDrafts.filter(change => isLoredeckCreatorEntryDraftChange(change)).length,
        entryDraftLastBatchCount: draftResult.changeCount,
        entryDraftLastTargetCount: targetTitles.length,
        entryDraftLastRejectedCount: invalidCount,
        entryDraftLastRejectedTargetIds: rejectionSummary?.targetEntryIds || [],
        entryDraftLastRejectionSummary: rejectionSummary || { count: 0, targetCount: 0, targetEntryIds: [], unknownTags: [], unknownAnchors: [], byReason: {} },
        entryDraftLastRejectionDiagnostics: rejectionDiagnostics || [],
        entryDraftRemainingCount: freshProgress.remainingCount,
        entryDraftBatchSize: getLoredeckCreatorEntryBatchLimit(options.batchSize, freshCache),
        entryDraftCurrentBatchId: targetPlanningBatch?.id || '',
        entryDraftCurrentBatchLabel: targetPlanningBatch?.label || '',
        entryDraftedAt: Date.now(),
        generatedPackId: pack.packId,
        generatedPackTitle: pack.title || pack.packId,
        status: 'draft',
    }, { throwOnFailure: !!options.generationCommit });
    return {
        ...draftResult,
        ignoredCount,
        invalidCount,
        repairedCount,
        rejectionDiagnostics,
        rejectionSummary,
        warnings,
        unitId,
        batchId: targetPlanningBatch?.id || '',
        batchLabel: targetPlanningBatch?.label || '',
    };
}

async function draftLoredeckCreatorEntryBatch(cached = {}, pack = {}, planning = {}, options = {}) {
    const brief = cached.brief || {};
    const batchSize = getLoredeckCreatorEntryBatchLimit(options.batchSize, cached);
    const targetPlanningBatchId = normalizeLoredeckCreatorTitleId(options.targetPlanningBatchId || options.targetPlanningBatch?.id || '', '');
    const targetTitles = getLoredeckCreatorEntryTargetTitlesForOptions(cached, pack, options, batchSize);
    if (!targetTitles.length) return { status: 'empty_pool', changeCount: 0, targetCount: 0 };

    const rows = getLoredeckEditableEntryRows(pack, []);
    const progress = getLoredeckCreatorEntryDraftProgress(cached, pack);
    const targetPlanningBatch = options.targetPlanningBatch
        || (targetPlanningBatchId ? getLoredeckCreatorTitleBatchById(cached, targetPlanningBatchId) : null)
        || progress.activeBatch
        || getLoredeckCreatorTitleBatchById(cached, progress.activeBatchId);
    const targetCoverageDimensionIds = normalizeLoredeckCreatorCoverageIdList(targetPlanningBatch?.coverageDimensionIds || [], 24);
    if (options.generation) {
        updateLoredeckCreatorGeneration(options.generation, {
            type: 'phase',
            phase: 'batch',
            message: `Drafting Lorecards for ${targetPlanningBatch?.label || targetPlanningBatch?.id || 'current batch'}...`,
            streamSupported: null,
        }, {
            batchId: targetPlanningBatch?.id || '',
            batchLabel: targetPlanningBatch?.label || '',
            batchIndex: options.batchIndex ?? null,
            batchTotal: options.batchTotal ?? null,
            targetPlanningBatchId: targetPlanningBatch?.id || targetPlanningBatchId || '',
            coverageDimensionIds: targetCoverageDimensionIds,
        });
    }
    const unitId = options.unitIdOverride || buildLoredeckCreatorEntryGenerationUnitId(targetPlanningBatch, targetTitles);
    const compactTargetTitles = targetTitles.map(compactLoredeckCreatorEntryTitleForPrompt);
    const entryTargetPreflight = preflightLoredeckCreatorEntryTargets({
        targetTitles: compactTargetTitles,
        tagRegistry: planning.tags,
        timelineRegistry: planning.timeline,
        targetPlanningBatch,
        pack,
    });
    const preflightCachePatch = buildLoredeckCreatorEntryPreflightCachePatch(entryTargetPreflight);
    const retryContextByTarget = options.retryContextByTarget instanceof Map ? options.retryContextByTarget : new Map();
    const retryContexts = [];
    const entryDraftTargetTitles = entryTargetPreflight.targetTitleDrafts.map(draft => {
        const targetId = normalizeLoredeckEntryId(draft?.targetEntryId || draft?.titleId || draft?.id || '');
        const retryContext = targetId ? retryContextByTarget.get(targetId) : null;
        if (!retryContext) return draft;
        retryContexts.push(retryContext);
        return {
            ...draft,
            previousRejection: retryContext,
        };
    });
    const retryPromptTagIds = retryContexts.length && entryDraftTargetTitles.length === 1
        ? new Set(entryDraftTargetTitles.flatMap(draft => Array.isArray(draft.allowedEntryTags) ? draft.allowedEntryTags : []))
        : null;
    const retryPromptTimelineIds = retryContexts.length && entryDraftTargetTitles.length === 1 && entryDraftTargetTitles[0]?.timelineReferenceMode === 'explicit'
        ? {
            includeAnchorIds: new Set(Array.isArray(entryDraftTargetTitles[0].allowedAnchorIds) ? entryDraftTargetTitles[0].allowedAnchorIds : []),
            includeWindowIds: new Set(Array.isArray(entryDraftTargetTitles[0].allowedWindowIds) ? entryDraftTargetTitles[0].allowedWindowIds : []),
        }
        : null;
    const requestContext = {
        generatedPackId: pack.packId,
        brief,
        notes: cached.notes || loredeckCreatorNotes,
        targetPlanningBatch: targetPlanningBatch ? compactLoredeckCreatorPlanningBatchForPrompt({
            ...targetPlanningBatch,
            approvedTitleCount: progress.source.length,
        }) : null,
        acceptedPlanningBatchIds: [...getLoredeckCreatorPlanningAcceptedBatchIds(cached)],
        targetTitleDrafts: entryDraftTargetTitles,
        targetPreflight: entryTargetPreflight.summary,
        targetPreflightDiagnostics: entryTargetPreflight.diagnostics,
        retryContext: retryContexts.length ? {
            retryingRejectedTargets: true,
            previousRejections: retryContexts,
        } : null,
        timelineRegistry: compactLoredeckCreatorTimelineRegistryForPrompt(planning.timeline, retryPromptTimelineIds || {}),
        tagRegistry: compactLoredeckCreatorTagRegistryForPrompt(planning.tags, retryPromptTagIds ? { includeTagIds: retryPromptTagIds } : {}),
        existingEntryIds: getLoredeckCreatorExistingEntryIdsForPrompt(pack),
        entryBatchLimit: targetTitles.length,
        remainingTitleCount: progress.remainingCount,
        remainingAfterThisBatch: Math.max(0, progress.remainingCount - targetTitles.length),
    };
    let parsed = null;
    let responseText = '';
    let generationOptions = null;
    let entryCommit = null;
    try {
        const result = await runLoredeckCreatorSingleUnitGeneration({
            generation: options.generation,
            stage: 'entry_micro_batch',
            unitId,
            unitLabel: targetPlanningBatch?.label ? `Lorecard batch: ${targetPlanningBatch.label}` : 'Lorecard micro-batch',
            currentStage: 'entries_drafting',
            unitMeta: {
                actionId: 'entry_batch_draft',
                targetPlanningBatchId: targetPlanningBatch?.id || targetPlanningBatchId || '',
                targetPlanningBatchLabel: targetPlanningBatch?.label || '',
                targetTitleIds: targetTitles.map(draft => normalizeLoredeckCreatorTitleId(draft.titleId || draft.id || '', '')).filter(Boolean),
                batchSize,
                providerKind: options.providerKind || 'lore',
                retrySmallerSupported: true,
            },
            requestOptions: {
                providerKind: options.providerKind || 'lore',
                batchId: targetPlanningBatch?.id || '',
                batchLabel: targetPlanningBatch?.label || '',
                batchIndex: options.batchIndex ?? null,
                batchTotal: options.batchTotal ?? null,
                targetPlanningBatchId: targetPlanningBatch?.id || targetPlanningBatchId || '',
                coverageDimensionIds: targetCoverageDimensionIds,
            },
            requestContext,
            requestResponse: requestLoredeckCreatorEntryResponse,
            parseResponse: parseLoredeckAssistantResponse,
            repairResponse: repairLoredeckCreatorEntryResponse,
            validateParsedResult: validateLoredeckCreatorEntryDraftResult,
            repairWarning: 'Deck Maker Lorecard batch was normalized into Saga proposal format.',
            isRepairUsable: isLoredeckCreatorParsedEntryDraftUsable,
            resultRefType: 'creator_entry_micro_batch',
            commitParsedResult: async ({ parsedResult, idempotencyKey }) => {
                const commit = commitLoredeckCreatorEntryDraftResult(parsedResult, {
                    generationCommit: { idempotencyKey, stage: 'entry_micro_batch' },
                    pack,
                    rows,
                    targetTitles: entryDraftTargetTitles,
                    entryTargetPreflight,
                    targetPlanningBatch,
                    unitId,
                    batchSize,
                    throwOnFailure: true,
                });
                return {
                    entryCommit: commit,
                    resultRef: {
                        unitId,
                        batchId: commit.batchId || targetPlanningBatch?.id || '',
                        batchLabel: commit.batchLabel || targetPlanningBatch?.label || '',
                        proposalCount: Array.isArray(parsedResult?.proposals) ? parsedResult.proposals.length : 0,
                        draftCount: commit.changeCount || 0,
                        replacedCount: commit.replacedCount || 0,
                        draftChangeIds: commit.draftChangeIds || [],
                        rejectedCount: commit.invalidCount || 0,
                        rejectedTargetIds: commit.rejectionSummary?.targetEntryIds || [],
                        rejectionSummary: commit.rejectionSummary || null,
                        partial: !!(commit.queued && Number(commit.invalidCount) > 0),
                        status: commit.queued
                            ? 'draft_review'
                            : (parsedResult?.clarifyingQuestions?.length ? 'needs_input' : 'empty'),
                    },
                };
            },
        });
        if (result?.aborted || (options.generation && ignoreStaleLoredeckCreatorGeneration(options.generation, 'entry draft'))) {
            return { status: 'stale', changeCount: 0, targetCount: targetTitles.length };
        }
        responseText = result.responseText;
        parsed = result.parsed;
        generationOptions = result.requestOptions;
        entryCommit = result.commitResult?.entryCommit || null;
    } catch (error) {
        if (options.generation && (isLoredeckCreatorAbortError(error) || ignoreStaleLoredeckCreatorGeneration(options.generation, 'entry draft'))) {
            return { status: 'stale', changeCount: 0, targetCount: targetTitles.length };
        }
        if (isLoredeckCreatorEntryGuardRejectedAllError(error)) {
            setLoredeckCreatorBriefCache({
                ...getLoredeckCreatorBriefCache(),
                ...preflightCachePatch,
                entryDraftLastRejectedCount: Array.isArray(error.rejectionDiagnostics) ? error.rejectionDiagnostics.length : 0,
                entryDraftLastRejectedTargetIds: Array.isArray(error.rejectionSummary?.targetEntryIds) ? error.rejectionSummary.targetEntryIds : [],
                entryDraftLastRejectionSummary: error.rejectionSummary || { count: 0, targetCount: 0, targetEntryIds: [], unknownTags: [], unknownAnchors: [], byReason: {} },
                entryDraftLastRejectionDiagnostics: Array.isArray(error.rejectionDiagnostics) ? error.rejectionDiagnostics : [],
                generatedPackId: pack.packId,
                generatedPackTitle: pack.title || pack.packId,
            });
        }
        throw error;
    }
    if (!parsed) {
        parsed = { summary: '', clarifyingQuestions: [], warnings: [], proposals: [] };
    }
    const repairEntryResult = async (warningMessage = 'Deck Maker Lorecard batch was normalized into Saga proposal format.') => {
        try {
            const repairedText = await repairLoredeckCreatorEntryResponse(responseText, requestContext, generationOptions);
            if (options.generation && ignoreStaleLoredeckCreatorGeneration(options.generation, 'entry draft repair')) {
                return { stale: true, parsed: null };
            }
            const repaired = parseLoredeckAssistantResponse(repairedText);
            if (repaired.proposals.length || repaired.clarifyingQuestions.length) {
                return {
                    stale: false,
                    parsed: {
                        ...repaired,
                        warnings: [
                            warningMessage,
                        ],
                    },
                };
            }
        } catch (repairError) {
            console.warn('[Saga] Deck Maker entry repair failed:', repairError);
        }
        return { stale: false, parsed: null };
    };
    if (!entryCommit?.queued && !parsed.proposals.length && !parsed.clarifyingQuestions.length && String(responseText || '').trim()) {
        const repaired = await repairEntryResult();
        if (repaired.stale) return { status: 'stale', changeCount: 0, targetCount: targetTitles.length };
        if (repaired.parsed) parsed = repaired.parsed;
    }
    if (!entryCommit?.queued
        && parsed.proposals.length
        && !parsed.clarifyingQuestions.length
        && !parsed.proposals.some(proposal => proposal.action === 'upsert_entry')) {
        const repaired = await repairEntryResult('Deck Maker Lorecard batch was normalized into supported entry proposal actions.');
        if (repaired.stale) return { status: 'stale', changeCount: 0, targetCount: targetTitles.length };
        if (repaired.parsed) parsed = repaired.parsed;
    }
    const preview = buildLoredeckCreatorEntryDraftChanges(pack, parsed, rows, entryDraftTargetTitles, targetPlanningBatch, unitId);
    const warnings = entryCommit?.warnings || [
        ...(preview.ignoredCount ? [`Ignored ${preview.ignoredCount} proposal${preview.ignoredCount === 1 ? '' : 's'} outside this micro-batch.`] : []),
        ...(preview.invalidCount ? [`Rejected ${preview.invalidCount} Deck Maker Lorecard draft${preview.invalidCount === 1 ? '' : 's'} with invalid schema v3 references.`] : []),
        ...(preview.repairedCount ? [`Repaired ${preview.repairedCount} Deck Maker Lorecard draft${preview.repairedCount === 1 ? '' : 's'} deterministically before Draft Review.`] : []),
        ...(preview.warnings || []),
    ];

    if (!entryCommit?.queued && parsed.clarifyingQuestions.length && !preview.changes.length) {
        setLoredeckCreatorBriefCache({
            ...getLoredeckCreatorBriefCache(),
            ...preflightCachePatch,
            entryDraftSummary: parsed.summary,
            entryDraftQuestions: parsed.clarifyingQuestions,
            entryDraftWarnings: warnings,
            generatedPackId: pack.packId,
            generatedPackTitle: pack.title || pack.packId,
            status: 'needs_input',
        });
        return { status: 'questions', changeCount: 0, targetCount: targetTitles.length, parsed, warnings };
    }
    if (!entryCommit?.queued && !preview.changes.length) {
        setLoredeckCreatorBriefCache({
            ...getLoredeckCreatorBriefCache(),
            ...preflightCachePatch,
            entryDraftSummary: parsed.summary,
            entryDraftQuestions: parsed.clarifyingQuestions,
            entryDraftWarnings: warnings,
            entryDraftLastBatchCount: 0,
            entryDraftLastTargetCount: targetTitles.length,
            entryDraftLastRejectedCount: preview.invalidCount || 0,
            entryDraftLastRejectedTargetIds: preview.rejectionSummary?.targetEntryIds || [],
            entryDraftLastRejectionSummary: preview.rejectionSummary || { count: 0, targetCount: 0, targetEntryIds: [], unknownTags: [], unknownAnchors: [], byReason: {} },
            entryDraftLastRejectionDiagnostics: preview.rejectionDiagnostics || [],
            generatedPackId: pack.packId,
            generatedPackTitle: pack.title || pack.packId,
            status: 'needs_input',
        });
        return {
            status: 'empty',
            changeCount: 0,
            targetCount: targetTitles.length,
            parsed,
            warnings,
            rejectionDiagnostics: preview.rejectionDiagnostics || [],
            rejectionSummary: preview.rejectionSummary || null,
        };
    }
    if (!entryCommit?.queued) {
        entryCommit = commitLoredeckCreatorEntryDraftResult(parsed, {
            pack,
            rows,
            targetTitles: entryDraftTargetTitles,
            entryTargetPreflight,
            targetPlanningBatch,
            unitId,
            batchSize,
            throwOnFailure: true,
        });
    }
    return {
        status: 'drafted',
        changeCount: Number(entryCommit?.changeCount) || preview.changes.length,
        targetCount: targetTitles.length,
        proposalCount: parsed.proposals.length,
        parsed,
        warnings,
        entryCommit,
        rejectionDiagnostics: entryCommit?.rejectionDiagnostics || preview.rejectionDiagnostics || [],
        rejectionSummary: entryCommit?.rejectionSummary || preview.rejectionSummary || null,
    };
}

async function retryLoredeckCreatorRejectedEntryTargets(source = {}, context = {}) {
    const settings = getLoredeckCreatorGenerationSettings();
    if (settings.retrySmaller !== true) return { status: 'disabled', changeCount: 0, completedBatches: 0 };
    const rejectedTargetIds = getLoredeckCreatorEntryRejectedTargetIds(source);
    if (!rejectedTargetIds.length) return { status: 'empty', changeCount: 0, completedBatches: 0 };
    const retryAttemptedTargetIds = context.retryAttemptedTargetIds instanceof Set ? context.retryAttemptedTargetIds : new Set();
    const retryExhaustedTargetIds = context.retryExhaustedTargetIds instanceof Set ? context.retryExhaustedTargetIds : new Set();
    const retryableTargetIds = rejectedTargetIds.filter(id => !retryAttemptedTargetIds.has(id));
    const alreadyAttemptedIds = rejectedTargetIds.filter(id => retryAttemptedTargetIds.has(id));
    if (!retryableTargetIds.length) {
        for (const targetId of rejectedTargetIds) retryExhaustedTargetIds.add(targetId);
        return {
            status: 'retry_limit',
            changeCount: 0,
            completedBatches: 0,
            rejectedTargetIds,
            exhaustedTargetIds: rejectedTargetIds,
            skippedTargetIds: alreadyAttemptedIds,
            warnings: [`Stopped retrying ${rejectedTargetIds.length} rejected Lorecard target${rejectedTargetIds.length === 1 ? '' : 's'} already retried in this run.`],
        };
    }
    const cached = context.cached || getLoredeckCreatorBriefCache();
    const currentBatchSize = getLoredeckCreatorEntryBatchLimit(context.options?.batchSize, cached);
    if (currentBatchSize <= 1 && retryableTargetIds.length <= 1) {
        for (const targetId of retryableTargetIds) retryExhaustedTargetIds.add(targetId);
        return { status: 'not_smaller', changeCount: 0, completedBatches: 0, rejectedTargetIds, exhaustedTargetIds: retryableTargetIds };
    }
    const generation = context.generation || null;
    const targetPlanningBatch = context.targetPlanningBatch || context.options?.targetPlanningBatch || null;
    const targetPlanningBatchId = context.options?.targetPlanningBatchId || targetPlanningBatch?.id || '';
    const retryContextByTarget = buildLoredeckCreatorEntryRetryContextByTarget(source);
    const retryProvider = getLoredeckCreatorSplitRetryProvider(settings);
    if (generation) {
        updateLoredeckCreatorGeneration(generation, {
            type: 'phase',
            phase: 'retry',
            message: retryProvider.fallbackMessage
                ? `Retrying ${retryableTargetIds.length} rejected Lorecard${retryableTargetIds.length === 1 ? '' : 's'} as smaller batches with Reasoning Provider. Utility Provider unavailable: ${retryProvider.fallbackMessage}`
                : `Retrying ${retryableTargetIds.length} rejected Lorecard${retryableTargetIds.length === 1 ? '' : 's'} as smaller batches with ${retryProvider.label}...`,
        }, {
            rejectedTargetIds: retryableTargetIds,
            providerKind: retryProvider.providerKind,
        });
    }
    let totalChanges = 0;
    let completedBatches = 0;
    let lastResult = null;
    const exhaustedTargetIds = [];
    for (let index = 0; index < retryableTargetIds.length; index += 1) {
        let freshCache = getLoredeckCreatorBriefCache();
        let freshPack = freshCache.generatedPackId
            ? getFreshLoredeckLibraryPack(freshCache.generatedPackId, context.pack || null)
            : (context.pack || null);
        let freshPlanning = getLoredeckCreatorAcceptedPlanningStatus(freshPack);
        if (!freshPack || !freshPlanning.ready) break;
        const targetId = retryableTargetIds[index];
        const previousRejection = retryContextByTarget.get(targetId) || null;
        retryAttemptedTargetIds.add(targetId);
        if (context.busy && typeof context.busy.setText === 'function') {
            context.busy.setText(`Retrying ${index + 1}/${retryableTargetIds.length}...`);
        }
        if (generation) {
            updateLoredeckCreatorGeneration(generation, {
                type: 'phase',
                phase: 'retry',
                message: `Retrying ${previousRejection?.title || targetId} with stricter allowed references via ${retryProvider.label}...`,
            }, {
                rejectedTargetIds: [targetId],
                providerKind: retryProvider.providerKind,
            });
        }
        try {
            lastResult = await draftLoredeckCreatorEntryBatch(freshCache, freshPack, freshPlanning, {
                ...(context.options || {}),
                generation,
                batchIndex: context.batchIndex || null,
                batchTotal: context.batchTotal || null,
                batchSize: 1,
                targetTitleIds: [targetId],
                excludedTargetTitleIds: [...retryExhaustedTargetIds],
                targetPlanningBatchId,
                retryContextByTarget,
                providerKind: retryProvider.providerKind,
                unitIdOverride: null,
            });
        } catch (error) {
            if (!isLoredeckCreatorEntryGuardRejectedAllError(error)) throw error;
            retryExhaustedTargetIds.add(targetId);
            exhaustedTargetIds.push(targetId);
            lastResult = {
                status: 'rejected_after_retry',
                changeCount: 0,
                targetCount: 1,
                rejectedTargetIds: [targetId],
                rejectionDiagnostics: Array.isArray(error.rejectionDiagnostics) ? error.rejectionDiagnostics : [],
                rejectionSummary: error.rejectionSummary || null,
                warnings: error.warnings || [`Stopped retrying ${targetId}; Saga rejected the one-title retry before Draft Review.`],
            };
            continue;
        }
        if (lastResult.status === 'stale') {
            return { status: 'stale', changeCount: totalChanges, completedBatches, lastResult, rejectedTargetIds, exhaustedTargetIds };
        }
        if (lastResult.status === 'drafted') {
            totalChanges += Number(lastResult.changeCount) || 0;
            completedBatches += 1;
            continue;
        }
        retryExhaustedTargetIds.add(targetId);
        exhaustedTargetIds.push(targetId);
    }
    return {
        status: completedBatches > 0 ? 'retried' : (exhaustedTargetIds.length ? 'retry_exhausted' : 'empty'),
        changeCount: totalChanges,
        completedBatches,
        lastResult,
        rejectedTargetIds,
        exhaustedTargetIds,
        skippedTargetIds: alreadyAttemptedIds,
    };
}

async function handleLoredeckCreatorEntryDraft(button = null, options = {}) {
    const settings = getLoredeckCreatorGenerationSettings();
    const requestedMaxBatches = Math.max(1, Number(options.maxBatches) || 1);
    const maxBatches = options.bypassRunLimit === true
        ? requestedMaxBatches
        : Math.max(1, Math.min(settings.entryRunRemainingLimit, requestedMaxBatches));
    await runBusyAction(button, maxBatches > 1 ? 'Drafting batches...' : 'Drafting...', async (busy) => {
        if (!ensureLoreProviderReadyForAction('Deck Maker', 'lore')) return;
        let cached = getLoredeckCreatorBriefCache();
        const brief = cached.brief || {};
        if (!cached.approved || !brief) {
            toast('Approve a Deck Maker brief before drafting Lorecards.', 'warning');
            return;
        }
        let pack = cached.generatedPackId ? getFreshLoredeckLibraryPack(cached.generatedPackId, null) : null;
        if (!pack) {
            toast('Create and accept Deck Maker planning before drafting Lorecards.', 'warning');
            return;
        }
        let planning = getLoredeckCreatorAcceptedPlanningStatus(pack);
        if (!planning.ready) {
            toast('Accept Context and Tag planning proposals before drafting Lorecards.', 'warning');
            return;
        }
        const eligibleBatchIds = getLoredeckCreatorEntryEligibleBatchIds(cached, planning, pack);
        if (!eligibleBatchIds.size) {
            toast('Accept at least one planned Context and Tag set before drafting Lorecards.', 'warning');
            return;
        }
        if (!getLoredeckCreatorEntryTargetTitlesForOptions(cached, pack, options).length) {
            toast('No undrafted approved titles are available for Lorecard generation.', 'info');
            return;
        }
        updateLoredeckCreatorEntryDraftBusyProgress(busy, cached, pack, options, 0, maxBatches);
        const actionId = maxBatches > 1 ? 'entry_multi_batch_draft' : 'entry_batch_draft';
        const { generation } = startLoredeckCreatorGeneration(
            actionId,
            maxBatches > 1 ? 'Drafting Lorecard Batches' : 'Drafting Lorecard Batch',
            {
                ...cached,
                currentStage: 'entries_drafting',
                generatedPackId: pack.packId,
                generatedPackTitle: pack.title || pack.packId,
            },
            {
                batchTotal: maxBatches,
            }
        );
        if (!generation) return;

        let totalChanges = 0;
        let completedBatches = 0;
        let lastResult = null;
        let staleResult = false;
        const retryAttemptedTargetIds = new Set();
        const retryExhaustedTargetIds = new Set();
        try {
            for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
                cached = getLoredeckCreatorBriefCache();
                pack = cached.generatedPackId ? getFreshLoredeckLibraryPack(cached.generatedPackId, pack) : pack;
                planning = getLoredeckCreatorAcceptedPlanningStatus(pack);
                if (!pack || !planning.ready) break;
                if (!getLoredeckCreatorEntryTargetTitlesForOptions(cached, pack, { ...options, excludedTargetTitleIds: [...retryExhaustedTargetIds] }).length) break;
                const batchOptions = {
                    generation,
                    batchIndex: batchIndex + 1,
                    batchTotal: maxBatches,
                    batchSize: options.batchSize,
                    targetTitleIds: options.targetTitleIds,
                    excludedTargetTitleIds: [...retryExhaustedTargetIds],
                    targetPlanningBatchId: options.targetPlanningBatchId,
                    unitIdOverride: options.unitIdOverride,
                };
                try {
                    lastResult = await draftLoredeckCreatorEntryBatch(cached, pack, planning, batchOptions);
                } catch (error) {
                    if (!isLoredeckCreatorEntryGuardRejectedAllError(error)) throw error;
                    const recovery = await retryLoredeckCreatorRejectedEntryTargets(error, {
                        cached,
                        pack,
                        planning,
                        options: batchOptions,
                        generation,
                        busy,
                        batchIndex: batchIndex + 1,
                        batchTotal: maxBatches,
                        retryAttemptedTargetIds,
                        retryExhaustedTargetIds,
                    });
                    if (recovery.status === 'stale') {
                        staleResult = true;
                        break;
                    }
                    if (Array.isArray(recovery.exhaustedTargetIds)) {
                        for (const targetId of recovery.exhaustedTargetIds) retryExhaustedTargetIds.add(targetId);
                    }
                    if (!recovery.completedBatches && !recovery.exhaustedTargetIds?.length) throw error;
                    lastResult = recovery.lastResult || {
                        status: 'drafted',
                        changeCount: recovery.changeCount || 0,
                        targetCount: recovery.rejectedTargetIds?.length || 0,
                    };
                    totalChanges += recovery.changeCount || 0;
                    if (recovery.completedBatches) completedBatches += 1;
                    cached = getLoredeckCreatorBriefCache();
                    pack = cached.generatedPackId ? getFreshLoredeckLibraryPack(cached.generatedPackId, pack) : pack;
                    updateLoredeckCreatorEntryDraftBusyProgress(busy, cached, pack, options, completedBatches, maxBatches);
                    continue;
                }
                if (lastResult.status === 'stale') {
                    staleResult = true;
                    break;
                }
                if (lastResult.status === 'questions' || lastResult.status === 'empty' || lastResult.status === 'empty_pool') break;
                totalChanges += lastResult.changeCount || 0;
                completedBatches += 1;
                const rejectedTargetIds = getLoredeckCreatorEntryRejectedTargetIds(lastResult);
                if (rejectedTargetIds.length) {
                    const recovery = await retryLoredeckCreatorRejectedEntryTargets(lastResult, {
                        cached,
                        pack,
                        planning,
                        options: batchOptions,
                        generation,
                        busy,
                        batchIndex: batchIndex + 1,
                        batchTotal: maxBatches,
                        retryAttemptedTargetIds,
                        retryExhaustedTargetIds,
                    });
                    if (recovery.status === 'stale') {
                        staleResult = true;
                        break;
                    }
                    if (Array.isArray(recovery.exhaustedTargetIds)) {
                        for (const targetId of recovery.exhaustedTargetIds) retryExhaustedTargetIds.add(targetId);
                    }
                    if (recovery.completedBatches) {
                        totalChanges += recovery.changeCount || 0;
                        lastResult = recovery.lastResult || lastResult;
                    }
                }
                cached = getLoredeckCreatorBriefCache();
                pack = cached.generatedPackId ? getFreshLoredeckLibraryPack(cached.generatedPackId, pack) : pack;
                updateLoredeckCreatorEntryDraftBusyProgress(busy, cached, pack, options, completedBatches, maxBatches);
            }
            if (retryExhaustedTargetIds.size) {
                const exhaustedIds = [...retryExhaustedTargetIds];
                const fresh = getLoredeckCreatorBriefCache();
                setLoredeckCreatorBriefCache({
                    ...fresh,
                    entryDraftWarnings: [
                        ...((fresh.entryDraftWarnings || []).filter(Boolean).slice(-8)),
                        `Stopped retrying ${exhaustedIds.length} rejected Lorecard target${exhaustedIds.length === 1 ? '' : 's'} in this run: ${exhaustedIds.slice(0, 6).join(', ')}${exhaustedIds.length > 6 ? '...' : ''}.`,
                    ],
                    entryDraftLastRejectedCount: exhaustedIds.length,
                    entryDraftLastRejectedTargetIds: exhaustedIds,
                }, { refreshWorkbench: true });
            }
        } catch (e) {
            if (isLoredeckCreatorAbortError(e) || ignoreStaleLoredeckCreatorGeneration(generation, 'entry draft')) return;
            const failure = prepareLoredeckCreatorStageFailure(e, 'Lorecard entry drafting failed.', 'Lorecard Drafting');
            if (totalChanges > 0) {
                refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
                refreshHeader();
                finishLoredeckCreatorGeneration(generation, 'warning', `Drafted ${totalChanges} Lorecard${totalChanges === 1 ? '' : 's'} before a later batch stopped.`);
                toast(`Deck Maker drafted ${totalChanges} Lorecard${totalChanges === 1 ? '' : 's'} before a later batch stopped: ${failure.message}`, 'warning');
                return;
            }
            setLoredeckCreatorBriefCache({
                ...getLoredeckCreatorBriefCache(),
                status: 'blocked',
                currentStage: 'blocked',
                errors: [
                    ...((getLoredeckCreatorBriefCache().errors || []).slice(-20)),
                    failure.message,
                ],
                lastFailedAt: Date.now(),
            });
            finishLoredeckCreatorGeneration(generation, 'error', failure.message);
            throw failure;
        }
        if (staleResult || ignoreStaleLoredeckCreatorGeneration(generation, 'entry draft commit')) return;

        if (!pack) {
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            finishLoredeckCreatorGeneration(generation, 'warning', 'Generated Loredeck is no longer available for drafting.');
            toast('Generated Loredeck is no longer available for drafting.', 'warning');
            return;
        }
        selectLoredeckForDetails(pack.packId, { refresh: false });
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();
        if (lastResult?.status === 'questions') {
            finishLoredeckCreatorGeneration(generation, 'warning', `Needs clarification: ${lastResult.parsed?.clarifyingQuestions?.[0] || 'Deck Maker needs clarification.'}`);
            toast(`Deck Maker needs clarification: ${lastResult.parsed?.clarifyingQuestions?.[0]}`, 'warning');
            return;
        }
        if (lastResult?.status === 'empty') {
            finishLoredeckCreatorGeneration(generation, 'warning', lastResult.warnings?.[0] || 'No valid Lorecard drafts returned.');
            toast(lastResult.warnings?.[0] || 'Deck Maker returned no valid schema v3 Lorecard drafts for this micro-batch.', 'warning');
            return;
        }
        if (!totalChanges && retryExhaustedTargetIds.size) {
            const exhaustedIds = [...retryExhaustedTargetIds];
            const message = `Stopped retrying ${exhaustedIds.length} rejected Lorecard target${exhaustedIds.length === 1 ? '' : 's'} after one-title recovery failed. Check Last Lorecard rejection details.`;
            finishLoredeckCreatorGeneration(generation, 'warning', message);
            toast(message, 'warning');
            return;
        }
        if (!totalChanges) {
            finishLoredeckCreatorGeneration(generation, 'warning', 'No undrafted approved titles are available.');
            toast('No undrafted approved titles are available for Lorecard generation.', 'info');
            return;
        }
        const batchText = completedBatches > 1 ? ` across ${completedBatches} batches` : '';
        finishLoredeckCreatorGeneration(generation, 'success', `Drafted ${totalChanges} schema v3 Lorecard${totalChanges === 1 ? '' : 's'}${batchText}.`);
        toast(`Deck Maker drafted ${totalChanges} schema v3 Lorecard${totalChanges === 1 ? '' : 's'} into the draft batch${batchText}.`, 'success');
    });
}

function getContextResolutionProposals(state = getState()) {
    return Array.isArray(state?.lorePanel?.contextResolutionProposals)
        ? state.lorePanel.contextResolutionProposals.filter(proposal => proposal?.packId && proposal?.patch && typeof proposal.patch === 'object')
        : [];
}

function getContextResolutionProposalKey(proposal = {}) {
    return [
        String(proposal.packId || '').trim(),
        String(proposal.candidateId || '').trim(),
        String(proposal.candidateType || '').trim(),
        JSON.stringify(proposal.patch || {}),
    ].join('|');
}

function removeContextResolutionProposalsByKeys(keys = []) {
    const state = getState();
    if (!state?.lorePanel) return 0;
    const keySet = new Set((keys || []).map(key => String(key || '')).filter(Boolean));
    if (!keySet.size) return getContextResolutionProposals(state).length;
    state.lorePanel.contextResolutionProposals = getContextResolutionProposals(state)
        .filter(proposal => !keySet.has(getContextResolutionProposalKey(proposal)));
    if (!state.lorePanel.contextResolutionProposals.length) state.lorePanel.contextResolutionProposalMeta = null;
    saveState(state, { syncPrompt: false });
    return state.lorePanel.contextResolutionProposals.length;
}

function clearContextResolutionProposals() {
    const state = getState();
    if (!state?.lorePanel) return;
    state.lorePanel.contextResolutionProposals = [];
    state.lorePanel.contextResolutionProposalMeta = null;
    saveState(state, { syncPrompt: false });
}

function applyContextResolutionProposalSet(proposals = getContextResolutionProposals(), options = {}) {
    const selected = (Array.isArray(proposals) ? proposals : [])
        .filter(proposal => proposal?.packId && proposal?.patch && typeof proposal.patch === 'object');
    if (!selected.length) return 0;
    const applied = applyContextResolutionResults(selected.map(proposal => ({
        packId: proposal.packId,
        status: 'resolved',
        changed: true,
        patch: proposal.patch,
    })));
    if (options.clearAll === true) {
        clearContextResolutionProposals();
    } else {
        removeContextResolutionProposalsByKeys(selected.map(getContextResolutionProposalKey));
    }
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    refreshHeader();
    refreshContextWorkbench();
    renderContextProposalReview();
    return applied;
}

function dismissContextResolutionProposalSet(proposals = getContextResolutionProposals(), options = {}) {
    const selected = (Array.isArray(proposals) ? proposals : [])
        .filter(proposal => proposal?.packId);
    if (!selected.length) return 0;
    if (options.clearAll === true) {
        clearContextResolutionProposals();
    } else {
        removeContextResolutionProposalsByKeys(selected.map(getContextResolutionProposalKey));
    }
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    refreshHeader();
    renderContextProposalReview();
    return selected.length;
}

function storeContextResolutionAuditFromResult(result = null, context = {}, sourceText = '', source = 'manual_context') {
    const state = getState();
    if (!state?.lorePanel) return null;
    const audit = buildContextResolutionAudit(result || {}, context || {}, {
        source,
        sourceText,
    });
    state.lorePanel.contextResolutionAudit = audit;
    saveState(state, { syncPrompt: false });
    return audit;
}

function storeContextResolutionProposalsFromResult(result = null, context = {}) {
    if (result?.status === 'in_flight') return getContextResolutionProposals().length;
    const proposals = Array.isArray(result?.proposals) ? result.proposals : [];
    const state = getState();
    if (!state?.lorePanel) return 0;
    if (result?.cacheRecord) {
        state.lorePanel.contextResolutionCache = result.cacheRecord;
    }
    state.lorePanel.contextResolutionProposals = proposals.map(proposal => ({
        packId: String(proposal.packId || '').trim(),
        candidateId: String(proposal.candidateId || '').trim(),
        candidateType: String(proposal.candidateType || '').trim(),
        label: String(proposal.label || '').trim().slice(0, 240),
        summary: String(proposal.summary || '').trim().slice(0, 500),
        confidence: Number.isFinite(Number(proposal.confidence)) ? Math.max(0, Math.min(1, Number(proposal.confidence))) : 0,
        patch: proposal.patch && typeof proposal.patch === 'object' && !Array.isArray(proposal.patch) ? { ...proposal.patch } : {},
    })).filter(proposal => proposal.packId && Object.keys(proposal.patch || {}).length);
    state.lorePanel.contextResolutionProposalMeta = proposals.length
        ? {
            createdAt: Date.now(),
            source: result?.cached === true ? 'manual_reasoner_cached' : 'manual_reasoner',
            contextLabel: context.label || context.canonBoundary || context.sceneDate || '',
            cached: result?.cached === true,
        }
        : null;
    saveState(state, { syncPrompt: false });
    return state.lorePanel.contextResolutionProposals.length;
}

function formatAnchorDateRange(anchor = {}) {
    const from = String(anchor.dateRange?.from || '').trim();
    const to = String(anchor.dateRange?.to || '').trim();
    if (from && to && from !== to) return `${from} to ${to}`;
    return from || to || '';
}

function parseLoredeckAnchorDateSortKey(value = '') {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const epoch = Date.UTC(year, month - 1, day);
    const check = new Date(epoch);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null;
    return Math.floor(epoch / 86400000);
}

function getLoredeckAnchorStartSortKey(anchor = {}) {
    const explicit = Number(anchor.sortKey);
    if (Number.isFinite(explicit)) return explicit;
    return parseLoredeckAnchorDateSortKey(anchor.dateRange?.from || anchor.dateRange?.to || '');
}

function getLoredeckAnchorEndSortKey(anchor = {}) {
    return parseLoredeckAnchorDateSortKey(anchor.dateRange?.to || anchor.dateRange?.from || '') ?? getLoredeckAnchorStartSortKey(anchor);
}

function setLoredeckContextInputValue(input, value) {
    if (!input) return;
    input.value = value === null || value === undefined ? '' : String(value);
}

function applyAnchorToLoredeckContextFields(anchor = {}, fields = {}, mode = 'exact') {
    if (!fields || !anchor?.id) return;
    const id = String(anchor.id || '').trim();
    const label = String(anchor.label || id).trim();
    const startSort = getLoredeckAnchorStartSortKey(anchor);
    const endSort = getLoredeckAnchorEndSortKey(anchor);
    const precision = anchor.contextType === 'calendar' ? 'date_anchor' : 'anchor';

    if (mode === 'from') {
        if (fields.scopeSelect) fields.scopeSelect.value = 'window';
        setLoredeckContextInputValue(fields.validFromAnchorInput, id);
        setLoredeckContextInputValue(fields.sortKeyFromInput, startSort);
        if (!fields.precisionInput?.value) setLoredeckContextInputValue(fields.precisionInput, 'anchor_window');
        if (!fields.labelInput?.value) setLoredeckContextInputValue(fields.labelInput, `After ${label}`);
        return;
    }

    if (mode === 'to') {
        if (fields.scopeSelect) fields.scopeSelect.value = 'window';
        setLoredeckContextInputValue(fields.validToAnchorInput, id);
        setLoredeckContextInputValue(fields.sortKeyToInput, endSort);
        if (!fields.precisionInput?.value) setLoredeckContextInputValue(fields.precisionInput, 'anchor_window');
        if (!fields.labelInput?.value) setLoredeckContextInputValue(fields.labelInput, `Before ${label}`);
        return;
    }

    if (fields.scopeSelect) fields.scopeSelect.value = 'anchor';
    setLoredeckContextInputValue(fields.anchorIdInput, id);
    setLoredeckContextInputValue(fields.validFromAnchorInput, id);
    setLoredeckContextInputValue(fields.validToAnchorInput, id);
    setLoredeckContextInputValue(fields.sortKeyFromInput, startSort);
    setLoredeckContextInputValue(fields.sortKeyToInput, endSort);
    if (fields.windowKindSelect) fields.windowKindSelect.value = 'bounded';
    setLoredeckContextInputValue(fields.precisionInput, fields.precisionInput?.value || precision);
    setLoredeckContextInputValue(fields.labelInput, label);
}

function createLoredeckEntryAnchorPicker(pack, contextFields = {}, options = {}) {
    const box = document.createElement('div');
    box.className = 'saga-context-anchor-lookup';

    const top = document.createElement('div');
    top.className = 'saga-context-anchor-lookup-top';

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'saga-lore-editor-input';
    input.placeholder = 'Search timeline anchors';
    addTooltip(input, 'Search this Loredeck timeline by book, event, arc, alias, date, or tag.');
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('mousedown', e => e.stopPropagation());
    top.appendChild(input);

    const results = document.createElement('div');
    results.className = 'saga-context-anchor-results';

    const renderResults = () => {
        results.innerHTML = '';
        const contextIndex = getContextIndexSync();
        const packId = String(pack?.packId || '').trim();
        const query = input.value.trim();
        const packIndex = getContextPackSummary(contextIndex, packId);
        if (!contextIndex) {
            results.appendChild(createEmptyMessage('Context index is loading. Load this Loredeck in the active stack to search anchors.'));
            return;
        }
        if (!packIndex?.hasIndex) {
            results.appendChild(createEmptyMessage('No loaded timeline registry for this Loredeck. Add it to the active stack or inspect a pack with timeline data.'));
            return;
        }
        if (!query) {
            results.appendChild(createEmptyMessage('Search by event, book, arc, date, alias, or tag.'));
            return;
        }
        const matches = findContextAnchors(query, { packId, limit: options.limit || 8, index: contextIndex });
        if (!matches.length) {
            results.appendChild(createEmptyMessage('No matching anchors.'));
            return;
        }
        for (const anchor of matches) {
            results.appendChild(createLoredeckEntryAnchorPickerResult(anchor, contextFields));
        }
    };

    top.appendChild(createButton('Find', 'Search timeline anchors in this Loredeck.', renderResults));
    input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        renderResults();
    });
    box.appendChild(top);
    results.appendChild(createEmptyMessage('Search loaded timeline anchors to fill Context fields.'));
    box.appendChild(results);
    return box;
}

function createLoredeckEntryAnchorPickerResult(anchor = {}, contextFields = {}) {
    const row = document.createElement('div');
    row.className = 'saga-context-anchor-result';

    const main = document.createElement('div');
    main.className = 'saga-context-anchor-main';
    const title = document.createElement('div');
    title.className = 'saga-context-anchor-title';
    title.textContent = anchor.label || anchor.id || 'Anchor';
    main.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'saga-context-anchor-meta';
    meta.textContent = [
        anchor.id,
        formatAnchorDateRange(anchor),
        anchor.book,
        anchor.arc,
        anchor.aliases?.slice(0, 2).join(', '),
    ].filter(Boolean).join(' | ');
    main.appendChild(meta);
    row.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'saga-loredeck-row-actions';
    actions.appendChild(createButton('Exact', 'Use this anchor as the exact Context.', () => {
        applyAnchorToLoredeckContextFields(anchor, contextFields, 'exact');
    }, 'saga-primary-button'));
    actions.appendChild(createButton('From', 'Use this anchor as the start of a Context window.', () => {
        applyAnchorToLoredeckContextFields(anchor, contextFields, 'from');
    }));
    actions.appendChild(createButton('To', 'Use this anchor as the end of a Context window.', () => {
        applyAnchorToLoredeckContextFields(anchor, contextFields, 'to');
    }));
    row.appendChild(actions);
    return row;
}

function createContextAnchorLookup(packId, contextIndex = getContextIndexSync()) {
    const box = document.createElement('div');
    box.className = 'saga-context-anchor-lookup';

    const top = document.createElement('div');
    top.className = 'saga-context-anchor-lookup-top';

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'saga-lore-editor-input';
    input.placeholder = 'Search timeline anchors';
    addTooltip(input, 'Search this Loredeck timeline by book, event, arc, alias, date, or tag.');
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('mousedown', e => e.stopPropagation());
    top.appendChild(input);

    const results = document.createElement('div');
    results.className = 'saga-context-anchor-results';

    const renderResults = () => {
        results.innerHTML = '';
        const query = input.value.trim();
        const packIndex = getContextPackSummary(contextIndex, packId);
        if (!contextIndex) {
            results.appendChild(createEmptyMessage('Context index is loading.'));
            return;
        }
        if (!packIndex?.hasIndex) {
            results.appendChild(createEmptyMessage('This Loredeck has no timeline registry loaded.'));
            return;
        }
        if (!query) {
            results.appendChild(createEmptyMessage('Search by event, book, arc, date, alias, or tag.'));
            return;
        }
        const matches = findContextAnchors(query, { packId, limit: 6, index: contextIndex });
        if (!matches.length) {
            results.appendChild(createEmptyMessage('No matching anchors.'));
            return;
        }
        for (const anchor of matches) {
            results.appendChild(createContextAnchorResult(packId, anchor));
        }
    };

    top.appendChild(createButton('Find', 'Search timeline anchors in this Loredeck.', renderResults));
    input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        renderResults();
    });
    box.appendChild(top);
    renderResults();
    box.appendChild(results);
    return box;
}

function createContextAnchorResult(packId, anchor = {}) {
    const row = document.createElement('div');
    row.className = 'saga-context-anchor-result';

    const main = document.createElement('div');
    main.className = 'saga-context-anchor-main';

    const title = document.createElement('div');
    title.className = 'saga-context-anchor-title';
    title.textContent = anchor.label || anchor.id || 'Anchor';
    main.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'saga-context-anchor-meta';
    const details = [
        formatAnchorDateRange(anchor),
        anchor.book,
        anchor.arc,
        anchor.aliases?.slice(0, 2).join(', '),
    ].filter(Boolean);
    meta.textContent = details.join(' | ') || anchor.id || '';
    main.appendChild(meta);
    row.appendChild(main);

    row.appendChild(createButton('Use', 'Use this anchor as the Context for this Loredeck.', () => {
        applyContextAnchor(packId, anchor);
    }, 'saga-primary-button'));
    return row;
}

function applyContextAnchor(packId, anchor = {}) {
    const firstDate = String(anchor.dateRange?.from || anchor.dateRange?.to || '').trim();
    const sortKey = getLoredeckAnchorStartSortKey(anchor);
    commitLoredeckContextPatch(packId, {
        contextType: anchor.contextType || 'anchor',
        anchorId: anchor.id || '',
        anchorFrom: '',
        anchorTo: '',
        label: anchor.label || anchor.id || '',
        sceneDate: firstDate,
        contextSortKey: sortKey,
        contextSortKeyFrom: sortKey,
        contextSortKeyTo: sortKey,
        arc: anchor.arc || '',
        phase: anchor.phase || '',
        season: anchor.season || '',
        episode: anchor.episode || '',
        chapter: anchor.chapter || '',
        issue: anchor.issue || '',
        quest: anchor.quest || '',
        gameStage: anchor.gameStage || '',
        alias: anchor.aliases?.[0] || anchor.label || anchor.id || '',
        source: 'local_alias',
    });
}

function seedLoredeckContextFromRuntimeContext(packId, context = {}) {
    const current = getState();
    const runtimeContext = current?.loreContext || {};
    const resolverContext = buildResolverContextFromState(current);
    commitLoredeckContextPatch(packId, {
        contextType: getDefaultLoredeckContextType(packId, context.contextType || 'custom'),
        sceneDate: resolverContext.sceneDate || runtimeContext.sceneDate || '',
        subjectiveDate: resolverContext.subjectiveDate || runtimeContext.subjectiveDate || '',
        label: resolverContext.label || resolverContext.summary || resolverContext.canonBoundary || resolverContext.sceneDate || context.label || '',
        alias: resolverContext.alias || resolverContext.canonBoundary || context.alias || '',
        branchId: resolverContext.branchId || runtimeContext.branchId || 'main',
        timeTravelMode: resolverContext.timeTravelMode || runtimeContext.timeTravelMode || 'none',
        arc: resolverContext.arc || context.arc || '',
        phase: resolverContext.phase || context.phase || '',
        season: resolverContext.season || context.season || '',
        episode: resolverContext.episode || context.episode || '',
        chapter: resolverContext.chapter || context.chapter || '',
        issue: resolverContext.issue || context.issue || '',
        quest: resolverContext.quest || context.quest || '',
        gameStage: resolverContext.gameStage || context.gameStage || '',
        stardate: resolverContext.stardate || context.stardate || '',
        coordinates: resolverContext.coordinates && typeof resolverContext.coordinates === 'object' ? { ...resolverContext.coordinates } : (context.coordinates || {}),
    });
}

function buildContextResolutionSourceText(state = {}, resolverContext = {}) {
    const brief = state?.contextBrief || {};
    const signals = brief?.signals || {};
    const evidence = Array.isArray(brief?.evidence) ? brief.evidence : [];
    const uncertaintyNotes = Array.isArray(brief?.uncertainty?.notes) ? brief.uncertainty.notes : [];
    return [
        resolverContext.label,
        resolverContext.summary,
        resolverContext.sceneDate,
        resolverContext.subjectiveDate,
        resolverContext.canonBoundary,
        resolverContext.branchId,
        resolverContext.timeTravelMode,
        resolverContext.arc,
        resolverContext.phase,
        resolverContext.season,
        resolverContext.episode,
        resolverContext.chapter,
        resolverContext.issue,
        resolverContext.quest,
        resolverContext.gameStage,
        resolverContext.stardate,
        ...(Array.isArray(signals.positionPhrases) ? signals.positionPhrases : []),
        ...(Array.isArray(signals.eventLabels) ? signals.eventLabels : []),
        ...evidence.map(item => item?.quote || item?.text || item?.snippet),
        ...uncertaintyNotes,
    ].map(value => String(value || '').trim()).filter(Boolean).join(' | ').slice(0, 3000);
}

async function handleResolveContextsFromContext(btn = null) {
    await runBusyAction(btn, 'Resolving...', async () => {
        const state = getState();
        const settings = getSettings();
        const context = buildResolverContextFromState(state);
        const sourceText = buildContextResolutionSourceText(state, context);
        const result = await resolveAndApplyContextsFromContext(context, {
            contextSource: 'local_alias',
            sourceText,
            minLocalConfidence: clampSettingConfidence(settings.contextLocalApplyMinConfidence, 0.78),
        });
        storeContextResolutionAuditFromResult(result, context, sourceText, 'manual_local_resolve');
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();
        if (result.appliedCount > 0) {
            toast(`Context resolved for ${result.appliedCount} Loredeck${result.appliedCount === 1 ? '' : 's'}.`, 'success');
            return;
        }
        if (result.resolvedCount > 0) {
            toast('Context already matches the current context.', 'info');
            return;
        }
        if (result.skippedCount > 0 && !result.unresolvedCount) {
            toast('Context resolver skipped locked Loredecks.', 'warning');
            return;
        }
        toast('No local Context match found. Try a clearer date, arc, book, event, or anchor alias.', 'warning');
    });
}

async function handleModelResolveContexts(btn = null) {
    await runBusyAction(btn, 'Asking...', async () => {
        const validation = validateLoreProviderConfiguration('lore');
        if (!validation.ok) {
            toast(`Reasoning Provider is not ready: ${validation.message}`, 'error');
            return;
        }
        const state = getState();
        const settings = getSettings();
        const context = buildResolverContextFromState(state);
        const sourceText = buildContextResolutionSourceText(state, context);
        const result = await resolveContextsWithModel(context, {
            explicit: true,
            applyModel: false,
            sourceText,
            minLocalConfidence: clampSettingConfidence(settings.contextLocalApplyMinConfidence, 0.78),
            minConfidence: clampSettingConfidence(settings.contextReasonerProposalMinConfidence, 0.55),
            resolutionCache: state?.lorePanel?.contextResolutionCache || null,
        });
        if (result.status === 'in_flight') {
            storeContextResolutionAuditFromResult(result, context, sourceText, 'manual_reasoner');
            toast('A Context Reasoner request is already running.', 'warning');
            return;
        }
        storeContextResolutionAuditFromResult(result, context, sourceText, result.cached ? 'manual_reasoner_cached' : 'manual_reasoner');
        const proposalCount = storeContextResolutionProposalsFromResult(result, context);
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();
        if (proposalCount > 0) {
            const localText = result.localAppliedCount ? ` Local resolver also updated ${result.localAppliedCount} Loredeck${result.localAppliedCount === 1 ? '' : 's'}.` : '';
            const verb = result.cached ? 'Reopened cached' : 'Reasoner drafted';
            toast(`${verb} ${proposalCount} Context proposal${proposalCount === 1 ? '' : 's'} for review.${localText}`, 'success');
            return;
        }
        if (result.localAppliedCount > 0) {
            toast(`Local resolver updated ${result.localAppliedCount} Loredeck${result.localAppliedCount === 1 ? '' : 's'} before model fallback.`, 'success');
            return;
        }
        if (result.status === 'resolved_locally') {
            toast('Local resolver already matched the current context.', 'info');
            return;
        }
        if (!result.targetPackIds?.length) {
            toast('No unlocked unresolved Loredecks need model fallback.', 'info');
            return;
        }
        if (result.cached) {
            toast('Same Context was already checked; cached result had no confident bounded candidate.', 'info');
            return;
        }
        toast('Reasoner fallback did not find a confident bounded Context candidate.', 'warning');
    });
}

function createContextTextField(container, labelText, packId, key, value, tooltip, options = {}) {
    const label = document.createElement('label');
    label.className = `saga-loredeck-editor-field${options.full ? ' saga-loredeck-editor-field-full' : ''}`;
    const span = document.createElement('span');
    span.textContent = labelText;
    addTooltip(span, tooltip || labelText);
    label.appendChild(span);

    const input = options.multiline ? document.createElement('textarea') : document.createElement('input');
    input.className = options.multiline ? 'saga-lore-editor-textarea' : 'saga-lore-editor-input';
    if (!options.multiline) input.type = 'text';
    input.value = String(value || '');
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('mousedown', e => e.stopPropagation());
    input.addEventListener('change', () => {
        commitLoredeckContextPatch(packId, { [key]: input.value.trim() }, options);
    });
    label.appendChild(input);
    container.appendChild(label);
    return input;
}

function createContextSelectField(container, labelText, packId, key, value, optionsList, tooltip, options = {}) {
    const label = document.createElement('label');
    label.className = 'saga-loredeck-editor-field';
    const span = document.createElement('span');
    span.textContent = labelText;
    addTooltip(span, tooltip || labelText);
    label.appendChild(span);

    const select = document.createElement('select');
    select.className = 'saga-lore-editor-input';
    for (const [optionValue, optionLabel] of optionsList) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionLabel;
        select.appendChild(option);
    }
    select.value = String(value || optionsList[0]?.[0] || '');
    select.addEventListener('change', () => {
        commitLoredeckContextPatch(packId, { [key]: select.value }, options);
    });
    label.appendChild(select);
    container.appendChild(label);
    return select;
}

function createContextNumberField(container, labelText, packId, key, value, tooltip, options = {}) {
    const label = document.createElement('label');
    label.className = 'saga-loredeck-editor-field';
    const span = document.createElement('span');
    span.textContent = labelText;
    addTooltip(span, tooltip || labelText);
    label.appendChild(span);

    const input = document.createElement('input');
    input.className = 'saga-lore-editor-input';
    input.type = 'number';
    input.min = '0';
    input.max = '1';
    input.step = '0.05';
    input.value = String(Number.isFinite(Number(value)) ? Number(value) : 0);
    input.addEventListener('change', () => {
        commitLoredeckContextPatch(packId, { [key]: input.value }, options);
    });
    label.appendChild(input);
    container.appendChild(label);
    return input;
}

function createContextCheckboxField(container, labelText, packId, key, value, tooltip) {
    const label = document.createElement('label');
    label.className = 'saga-loredeck-context-check';
    addTooltip(label, tooltip || labelText);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value === true;
    input.addEventListener('change', () => {
        commitLoredeckContextPatch(packId, { [key]: input.checked }, { manual: false });
    });
    label.appendChild(input);
    const span = document.createElement('span');
    span.textContent = labelText;
    label.appendChild(span);
    container.appendChild(label);
    return input;
}

function appendContextManualFields(grid, packId, context = {}) {
    createContextSelectField(grid, 'Type', packId, 'contextType', context.contextType, CONTEXT_TYPE_OPTIONS, 'How this Loredeck represents story progress.');
    createContextTextField(grid, 'Label', packId, 'label', context.label, 'Human-readable Context label.');
    createContextTextField(grid, 'Scene Date', packId, 'sceneDate', context.sceneDate, 'Exact or approximate in-universe date when the pack supports dates.');
    createContextTextField(grid, 'Branch', packId, 'branchId', context.branchId || 'main', 'Use main for canon baseline, or a custom branch for AU/time travel.');
    createContextTextField(grid, 'Arc', packId, 'arc', context.arc, 'Named arc, saga, route, or campaign segment.');
    createContextTextField(grid, 'Phase', packId, 'phase', context.phase, 'Broad phase or era, such as MCU Phase 3.');
    createContextTextField(grid, 'Season', packId, 'season', context.season, 'Television/anime season when relevant.');
    createContextTextField(grid, 'Episode', packId, 'episode', context.episode, 'Episode number, title, or range when relevant.');
    createContextTextField(grid, 'Chapter', packId, 'chapter', context.chapter, 'Book/manga/webnovel chapter when relevant.');
    createContextTextField(grid, 'Issue', packId, 'issue', context.issue, 'Comic issue or run context when relevant.');
    createContextTextField(grid, 'Quest', packId, 'quest', context.quest, 'Game quest, mission, route, or scenario marker.');
    createContextTextField(grid, 'Game Stage', packId, 'gameStage', context.gameStage, 'Game progression marker when a calendar date is not useful.');
    createContextTextField(grid, 'Anchor', packId, 'anchorId', context.anchorId, 'Selected event/book/film/arc anchor ID or label.');
    createContextTextField(grid, 'After', packId, 'anchorFrom', context.anchorFrom, 'Lower bound anchor for before/after windows.');
    createContextTextField(grid, 'Before', packId, 'anchorTo', context.anchorTo, 'Upper bound anchor for before/after windows.');
    createContextTextField(grid, 'Alias / User Note', packId, 'alias', context.alias, 'Freeform user phrasing, such as after Shibuya Incident or pre-Endgame.');
    createContextSelectField(grid, 'Source', packId, 'source', context.source, CONTEXT_SOURCE_OPTIONS, 'Where this Context came from.', { manual: false });
    createContextNumberField(grid, 'Confidence', packId, 'confidence', context.confidence, 'Confidence from 0 to 1. Manual choices commonly use 1.0.', { manual: false });
    createContextCheckboxField(grid, 'Manual Lock', packId, 'manualLock', context.manualLock, 'Prevent future automatic Context resolvers from overwriting this pack context.');
    createContextTextField(grid, 'Notes', packId, 'notes', context.notes, 'Private notes for this pack-specific Context.', { multiline: true, full: true });
}

function commitLoredeckContextPatch(packId, patch = {}, options = {}) {
    const nextPatch = { ...(patch || {}) };
    if (options.manual !== false) {
        if (!Object.prototype.hasOwnProperty.call(nextPatch, 'source')) nextPatch.source = 'manual';
        if (!Object.prototype.hasOwnProperty.call(nextPatch, 'manualLock')) nextPatch.manualLock = true;
        if (!Object.prototype.hasOwnProperty.call(nextPatch, 'confidence')) nextPatch.confidence = 1;
    }
    setLoredeckContext(packId, nextPatch);
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    refreshHeader();
    refreshContextWorkbench();
    toast('Context updated.', 'success');
}

function getContextTypeLabel(value) {
    const option = CONTEXT_TYPE_OPTIONS.find(([key]) => key === value);
    return option?.[1] || 'Custom';
}

function formatContextSource(value) {
    const option = CONTEXT_SOURCE_OPTIONS.find(([key]) => key === value);
    return option?.[1] || 'Unknown';
}

function formatContextSummary(context = {}) {
    const parts = [];
    if (context.label) parts.push(context.label);
    if (context.sceneDate) parts.push(context.sceneDate);
    if (context.arc) parts.push(`Arc: ${context.arc}`);
    if (context.phase) parts.push(`Phase: ${context.phase}`);
    if (context.season || context.episode) parts.push(`S${context.season || '?'} E${context.episode || '?'}`);
    if (context.chapter) parts.push(`Chapter: ${context.chapter}`);
    if (context.issue) parts.push(`Issue: ${context.issue}`);
    if (context.quest) parts.push(`Quest: ${context.quest}`);
    if (context.gameStage) parts.push(`Game: ${context.gameStage}`);
    if (context.anchorId) parts.push(`Anchor: ${context.anchorId}`);
    if (context.anchorFrom || context.anchorTo) parts.push(`Window: ${context.anchorFrom || 'start'} -> ${context.anchorTo || 'open'}`);
    if (context.alias && !parts.includes(context.alias)) parts.push(context.alias);
    if (context.branchId && context.branchId !== 'main') parts.push(`Branch: ${context.branchId}`);
    return parts.length ? parts.join(' | ') : 'Unset. Add a date, arc, anchor, chapter, episode, quest, or freeform alias.';
}

function openContextWorkbench(packId = '') {
    contextWorkbenchOpen = true;
    const state = getState();
    const stack = getContextWorkbenchStack(state);
    const requested = String(packId || '').trim();
    contextWorkbenchPackId = stack.some(item => item.packId === requested)
        ? requested
        : (contextWorkbenchPackId || stack[0]?.packId || '');
    ensureContextWorkbenchSelection(state, getContextIndexSync());
    renderContextWorkbench();
    loadContextIndex()
        .then(() => {
            if (contextWorkbenchOpen) renderContextWorkbench();
        })
        .catch(e => console.warn('[Saga] Context Workbench index load failed:', e));
}

function openContextWorkbenchForPack(packId = '', tab = 'context') {
    const nextTab = ['context', 'timeline', 'aliases', 'validation'].includes(tab) ? tab : 'context';
    contextWorkbenchTab = nextTab;
    contextWorkbenchSelectedKey = '';
    openContextWorkbench(packId);
}

function closeContextWorkbench() {
    contextWorkbenchOpen = false;
    document.getElementById(CONTEXT_WORKBENCH_ID)?.remove();
}

function refreshContextWorkbench() {
    if (!contextWorkbenchOpen) return;
    renderContextWorkbench();
}

function getContextWorkbenchStack(state = getState()) {
    const stack = getLoredeckStack(state).filter(item => item.enabled !== false);
    const library = getLoredeckLibrary(state);
    const libraryIndex = getLoredeckLibraryIndexForPacks(state, library);
    return resolveLoredeckStackItems(stack, libraryIndex, {
        packs: getLoredeckLibraryPackMap(library),
    }).stack.map((item, index) => ({ ...item, stackIndex: index }));
}

function getContextWorkbenchPack(state = getState()) {
    const stack = getContextWorkbenchStack(state);
    if (!stack.length) return null;
    const selectedId = stack.some(item => item.packId === contextWorkbenchPackId)
        ? contextWorkbenchPackId
        : stack[0].packId;
    contextWorkbenchPackId = selectedId;
    return getFreshLoredeckLibraryPack(selectedId, getLoredeckDefinition(selectedId)) || { packId: selectedId, title: getLoredeckDisplayName(selectedId) };
}

function ensureContextWorkbenchSelection(state = getState(), contextIndex = getContextIndexSync()) {
    const stack = getContextWorkbenchStack(state);
    if (!stack.length) {
        contextWorkbenchPackId = '';
        contextWorkbenchSelectedKey = '';
        return;
    }
    if (!stack.some(item => item.packId === contextWorkbenchPackId)) {
        contextWorkbenchPackId = stack[0].packId;
        contextWorkbenchSelectedKey = '';
    }
    const pack = getContextWorkbenchPack(state);
    const items = getContextWorkbenchTimelineItems(pack, contextIndex);
    if (!items.some(item => getContextTimelineItemKey(item) === contextWorkbenchSelectedKey)) {
        contextWorkbenchSelectedKey = items[0] ? getContextTimelineItemKey(items[0]) : '';
    }
}

function captureContextWorkbenchScrollState(overlay = document.getElementById(CONTEXT_WORKBENCH_ID)) {
    if (!overlay) return null;
    return [
        ['.saga-context-workbench-table', overlay.querySelector('.saga-context-workbench-table')?.scrollTop || 0],
        ['.saga-context-workbench-inspector', overlay.querySelector('.saga-context-workbench-inspector')?.scrollTop || 0],
        ['.saga-context-workbench-context-table', overlay.querySelector('.saga-context-workbench-context-table')?.scrollTop || 0],
        ['.saga-context-workbench-alias-table', overlay.querySelector('.saga-context-workbench-alias-table')?.scrollTop || 0],
        ['.saga-context-workbench-validation-table', overlay.querySelector('.saga-context-workbench-validation-table')?.scrollTop || 0],
    ];
}

function restoreContextWorkbenchScrollState(overlay, snapshot = null) {
    if (!overlay || !Array.isArray(snapshot)) return;
    for (const [selector, scrollTop] of snapshot) {
        const element = overlay.querySelector(selector);
        if (element) element.scrollTop = Number(scrollTop) || 0;
    }
}

function renderContextWorkbench() {
    if (!contextWorkbenchOpen) return;
    const state = getState();
    const contextIndex = getContextIndexSync();
    ensureContextWorkbenchSelection(state, contextIndex);

    let overlay = document.getElementById(CONTEXT_WORKBENCH_ID);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = CONTEXT_WORKBENCH_ID;
        overlay.className = 'saga-lore-workbench-overlay saga-context-workbench-overlay';
        overlay.tabIndex = -1;
        wireOverlayBackdropClose(overlay, closeContextWorkbench);
        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeContextWorkbench();
        });
        document.body.appendChild(overlay);
    }

    const scrollState = captureContextWorkbenchScrollState(overlay);
    overlay.replaceChildren(createContextWorkbenchShell(state, contextIndex));
    const restore = () => {
        restoreContextWorkbenchScrollState(overlay, scrollState);
        overlay.focus?.({ preventScroll: true });
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(restore);
    else restore();
}

function getContextResolverMissReasons(pack, analysis = {}, packIndex = null) {
    const terms = Array.isArray(analysis.terms) ? analysis.terms : [];
    const lines = [
        `Searched ${packIndex?.anchorCount || 0} timeline anchor${Number(packIndex?.anchorCount) === 1 ? '' : 's'} using labels, IDs, aliases, tags, and coordinates.`,
    ];
    if (terms.length) {
        lines.push(`No anchor contained the cleaned term${terms.length === 1 ? '' : 's'}: ${terms.join(', ')}.`);
    }
    if (analysis.directionTerms?.length) {
        lines.push(`Direction word${analysis.directionTerms.length === 1 ? '' : 's'} ignored: ${analysis.directionTerms.join(', ')}.`);
    }
    const cachedEntries = loredeckPreviewCacheController.getEntryPreview(pack?.packId);
    if (!cachedEntries?.loadedAt) {
        lines.push('Lorecards are not loaded in this workbench yet, so entry-level Context gates were not searched.');
        return lines;
    }
    const entryHint = getContextResolverEntryCoverageHint(pack, terms);
    if (entryHint?.count) {
        lines.push(`${entryHint.count} loaded Lorecard${entryHint.count === 1 ? '' : 's'} mention those terms, but no timeline anchor does. This is probably a registry coverage gap.`);
        if (entryHint.examples?.length) lines.push(`Examples: ${entryHint.examples.join(', ')}.`);
    } else {
        lines.push('If this phrase should resolve, add an alias to an existing anchor or create a more precise timeline anchor.');
    }
    if (pack?.type === 'bundled') {
        lines.push('Bundled decks are protected; duplicate this Loredeck as Custom before editing its timeline registry.');
    }
    return lines;
}

function getContextResolverEntryCoverageHint(pack, terms = []) {
    if (!terms.length) return null;
    const rows = getContextWorkbenchEntryRows(pack);
    if (!rows.length) return null;
    const hits = [];
    for (const row of rows) {
        const entry = row.entry || {};
        const text = getContextResolverEntrySearchText(entry);
        if (!terms.every(term => contextTextIncludesTerm(text, term))) continue;
        hits.push(entry.title || entry.id || row.id || 'Untitled Lorecard');
        if (hits.length >= 4) break;
    }
    return hits.length ? { count: hits.length, examples: hits } : null;
}

function getContextResolverEntrySearchText(entry = {}) {
    const scope = entry.scope || {};
    const retrieval = entry.retrieval || {};
    const triggers = retrieval.triggers || {};
    const content = entry.content || {};
    const resolverAliases = entry.extensions?.contextResolver?.aliases || entry.contextAliases || entry.resolverAliases || triggers.resolverAliases;
    return [
        entry.id,
        entry.title,
        entry.kind,
        entry.gateType,
        entry.category,
        entry.lorePurpose,
        entry.priority,
        entry.context?.label,
        content.fact,
        content.injection,
        ...(Array.isArray(content.constraints) ? content.constraints : []),
        ...(Array.isArray(resolverAliases) ? resolverAliases : []),
        ...(Array.isArray(entry.aliases) ? entry.aliases : []),
        ...(Array.isArray(contextAliasesFromEntry(entry)) ? contextAliasesFromEntry(entry) : []),
        ...(Array.isArray(scope.characters) ? scope.characters : []),
        ...(Array.isArray(scope.locations) ? scope.locations : []),
        ...(Array.isArray(scope.topics) ? scope.topics : []),
        ...(Array.isArray(scope.books) ? scope.books : []),
        ...(Array.isArray(scope.phases) ? scope.phases : []),
        ...(Array.isArray(triggers.topicsAny) ? triggers.topicsAny : []),
        ...(Array.isArray(triggers.charactersAny) ? triggers.charactersAny : []),
        ...(Array.isArray(triggers.locationsAny) ? triggers.locationsAny : []),
        ...(Array.isArray(entry.effects?.addsTags) ? entry.effects.addsTags : []),
    ].filter(Boolean).join(' ');
}

function contextAliasesFromEntry(entry = {}) {
    const contextGate = entry.context && typeof entry.context === 'object' && !Array.isArray(entry.context) ? entry.context : {};
    return Array.isArray(contextGate.aliases) ? contextGate.aliases : [];
}

function getContextEntryResolverMatches(pack, analysis = {}, options = {}) {
    const cachedEntries = loredeckPreviewCacheController.getEntryPreview(pack?.packId);
    if (!cachedEntries?.loadedAt || !Array.isArray(cachedEntries.entries)) return [];
    const terms = Array.isArray(analysis.terms) ? analysis.terms : [];
    if (!terms.length) return [];
    const limit = Math.max(1, Math.min(20, Number(options.limit) || 6));
    return getContextWorkbenchEntryRows(pack)
        .filter(row => row?.id && !row.disabled)
        .map(row => buildContextEntryResolverMatch(pack, row, analysis))
        .filter(match => match && match.score > 0 && !match.missingTerms.length)
        .sort((a, b) => b.score - a.score || String(a.entry.title || a.row.id).localeCompare(String(b.entry.title || b.row.id)))
        .slice(0, limit);
}

function buildContextEntryResolverMatch(pack, row = {}, analysis = {}) {
    const entry = row.entry || {};
    const contextGate = entry.context && typeof entry.context === 'object' && !Array.isArray(entry.context) ? entry.context : {};
    const sortKeyFrom = normalizeLoredeckTimelineNumber(contextGate.sortKeyFrom);
    const sortKeyTo = normalizeLoredeckTimelineNumber(contextGate.sortKeyTo);
    if (sortKeyFrom === null && sortKeyTo === null) return null;

    const terms = Array.isArray(analysis.terms) ? analysis.terms : [];
    const termPhrase = String(analysis.termPhrase || terms.join(' ')).trim().toLowerCase();
    const reasons = [];
    const matched = new Set();
    let score = 0;

    const addGroup = (label, text, termScore, phraseScore = 0) => {
        const haystack = normalizeContextSearchText(text);
        if (!haystack) return;
        if (termPhrase && haystack.includes(termPhrase)) {
            score += phraseScore || termScore * Math.max(2, terms.length);
            reasons.push({ type: 'entry_phrase', label: `${label} contains phrase`, score: phraseScore || termScore * 2, detail: text });
            for (const term of terms) {
                if (contextTextIncludesTerm(haystack, term)) matched.add(term);
            }
        }
        for (const term of terms) {
            if (!term || !contextTextIncludesTerm(haystack, term)) continue;
            matched.add(term);
            score += termScore;
            reasons.push({ type: 'entry_term', label: `${label} term: ${term}`, score: termScore, detail: text });
        }
    };

    const scope = entry.scope || {};
    const retrieval = entry.retrieval || {};
    const triggers = retrieval.triggers || {};
    const content = entry.content || {};
    const resolverAliases = entry.extensions?.contextResolver?.aliases || entry.contextAliases || entry.resolverAliases || triggers.resolverAliases;
    addGroup('Title', entry.title, 18, 72);
    addGroup('ID', row.id || entry.id, 8, 24);
    addGroup('Context label', contextGate.label, 10, 32);
    addGroup('Aliases', [
        ...(Array.isArray(entry.aliases) ? entry.aliases : []),
        ...(Array.isArray(contextGate.aliases) ? contextGate.aliases : []),
        ...(Array.isArray(resolverAliases) ? resolverAliases : []),
    ].join(' '), 20, 80);
    addGroup('Topics', [
        ...(Array.isArray(scope.topics) ? scope.topics : []),
        ...(Array.isArray(triggers.topicsAny) ? triggers.topicsAny : []),
        ...(Array.isArray(entry.effects?.addsTags) ? entry.effects.addsTags : []),
    ].join(' '), 14, 56);
    addGroup('Entities', [
        ...(Array.isArray(scope.characters) ? scope.characters : []),
        ...(Array.isArray(scope.locations) ? scope.locations : []),
    ].join(' '), 8, 24);
    addGroup('Book/phase', [
        ...(Array.isArray(scope.books) ? scope.books : []),
        ...(Array.isArray(scope.phases) ? scope.phases : []),
        entry.sourceInfo?.book,
    ].join(' '), 8, 24);
    addGroup('Content', [
        content.fact,
        content.injection,
        ...(Array.isArray(content.constraints) ? content.constraints : []),
    ].join(' '), 4, 16);

    const matchedTerms = [...matched];
    const missingTerms = terms.filter(term => !matched.has(term));
    if (!matchedTerms.length) return null;
    const anchorDefinition = buildContextEntryDerivedAnchor(pack, row, analysis);
    if (!anchorDefinition) return null;
    return {
        source: 'entry',
        row,
        entry,
        context: contextGate,
        anchorDefinition,
        score,
        reasons: reasons.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8),
        matchedTerms,
        missingTerms,
        queryTerms: terms,
        ignoredTerms: analysis.ignoredTerms || [],
        directionTerms: analysis.directionTerms || [],
        query: analysis.query || '',
    };
}

function buildContextEntryDerivedAnchor(pack, row = {}, analysis = {}) {
    const entry = row.entry || {};
    const contextGate = entry.context && typeof entry.context === 'object' && !Array.isArray(entry.context) ? entry.context : {};
    const sortKeyFrom = normalizeLoredeckTimelineNumber(contextGate.sortKeyFrom);
    const sortKeyTo = normalizeLoredeckTimelineNumber(contextGate.sortKeyTo);
    const sortKey = sortKeyFrom ?? sortKeyTo;
    if (sortKey === null) return null;
    const scope = entry.scope || {};
    const retrieval = entry.retrieval || {};
    const triggers = retrieval.triggers || {};
    const content = entry.content || {};
    const resolverAliases = entry.extensions?.contextResolver?.aliases || entry.contextAliases || entry.resolverAliases || triggers.resolverAliases;
    const id = normalizeLoredeckTimelineId(`${pack?.packId || 'pack'}.${row.id || entry.id || entry.title || 'entry_anchor'}`);
    if (!id) return null;
    const aliases = uniqueStrings([
        entry.title,
        row.id,
        analysis.termPhrase,
        analysis.query,
        ...(Array.isArray(entry.aliases) ? entry.aliases : []),
        ...(Array.isArray(contextGate.aliases) ? contextGate.aliases : []),
        ...(Array.isArray(resolverAliases) ? resolverAliases : []),
        ...(Array.isArray(scope.topics) ? scope.topics : []),
        ...(Array.isArray(triggers.topicsAny) ? triggers.topicsAny : []),
        ...(Array.isArray(entry.effects?.addsTags) ? entry.effects.addsTags : []),
    ]).slice(0, 24);
    const tags = normalizeLoredeckTimelineTextList([
        'source:lorecard-derived',
        entry.category ? `category:${entry.category}` : '',
        entry.lorePurpose ? `purpose:${entry.lorePurpose}` : '',
        ...(Array.isArray(entry.effects?.addsTags) ? entry.effects.addsTags : []),
    ], 64);
    return normalizeLoredeckTimelineAnchor({
        id,
        label: entry.title || contextGate.label || row.id || id,
        contextType: contextGate.scope === 'anchor' ? 'anchor' : 'anchor_window',
        sortKey,
        book: entry.sourceInfo?.book || scope.books?.[0] || '',
        arc: contextGate.arc || '',
        phase: contextGate.phase || scope.phases?.[0] || '',
        season: contextGate.season || '',
        episode: contextGate.episode || '',
        chapter: contextGate.chapter || '',
        issue: contextGate.issue || '',
        quest: contextGate.quest || '',
        gameStage: contextGate.gameStage || '',
        aliases,
        tags,
        notes: [
            `Entry-derived candidate from Lorecard ${row.id || entry.id || 'unknown'}.`,
            contextGate.label ? `Entry Context label: ${contextGate.label}.` : '',
            content.notes ? `Entry notes: ${truncateText(content.notes, 240)}` : '',
        ].filter(Boolean).join(' '),
    }, id);
}

function uniqueStrings(values = []) {
    const output = [];
    const seen = new Set();
    for (const value of values) {
        const text = String(value || '').trim();
        const key = text.toLowerCase();
        if (!text || seen.has(key)) continue;
        seen.add(key);
        output.push(text);
    }
    return output;
}

function applyContextEntryCandidate(packId, match = {}) {
    const entry = match.entry || {};
    const contextGate = match.context || {};
    const anchorId = normalizeLoredeckTimelineId(contextGate.anchorId || '');
    const anchorFrom = normalizeLoredeckTimelineId(contextGate.validFromAnchor || contextGate.anchorFrom || '');
    const anchorTo = normalizeLoredeckTimelineId(contextGate.validToAnchor || contextGate.anchorTo || '');
    const sortKeyFrom = normalizeLoredeckTimelineNumber(contextGate.sortKeyFrom);
    const sortKeyTo = normalizeLoredeckTimelineNumber(contextGate.sortKeyTo);
    const title = entry.title || match.row?.id || contextGate.label || 'Lorecard-derived Context';
    commitLoredeckContextPatch(packId, {
        contextType: anchorId ? 'anchor' : 'anchor_window',
        anchorId,
        anchorFrom: anchorId ? '' : anchorFrom,
        anchorTo: anchorId ? '' : anchorTo,
        label: title,
        sceneDate: '',
        contextSortKey: sortKeyFrom ?? sortKeyTo,
        contextSortKeyFrom: sortKeyFrom ?? sortKeyTo,
        contextSortKeyTo: sortKeyTo ?? sortKeyFrom,
        arc: contextGate.arc || '',
        phase: contextGate.phase || '',
        season: contextGate.season || '',
        episode: contextGate.episode || '',
        chapter: contextGate.chapter || '',
        issue: contextGate.issue || '',
        quest: contextGate.quest || '',
        gameStage: contextGate.gameStage || '',
        alias: match.query || title,
        source: 'manual',
        confidence: Math.max(0.55, Math.min(0.95, (Number(match.score) || 0) / 180)),
        notes: `Applied from Lorecard-derived resolver candidate: ${match.row?.id || entry.id || title}.`,
    });
}

function queueContextEntryCandidateTimelineAnchor(pack, match = {}) {
    if (pack?.type === 'bundled') {
        toast('Bundled Loredeck timelines are read-only. Duplicate as Custom first.', 'warning');
        return false;
    }
    const anchor = match.anchorDefinition;
    if (!anchor?.id) {
        toast('Could not build a timeline anchor from this Lorecard candidate.', 'error');
        return false;
    }
    return saveLoredeckTimelineAnchorDefinition(pack, anchor, `Queued Lorecard-derived timeline anchor ${anchor.id}.`);
}

function getContextWorkbenchEntryRows(pack = {}) {
    const cached = loredeckPreviewCacheController.getEntryPreview(pack?.packId, {});
    return getLoredeckEditableEntryRows(pack, Array.isArray(cached.entries) ? cached.entries : []);
}

function getContextTimelineItemKey(item = {}) {
    return `${item.kind || 'anchor'}:${item.id || ''}`;
}

function getContextTimelineItemContextText(item = {}) {
    const def = item.definition || {};
    if (item.kind === 'window') {
        const bounds = [def.sortKeyFrom, def.sortKeyTo].filter(value => value !== null && value !== undefined && value !== '').join(' -> ');
        return bounds || `${def.anchorFrom || '?'} -> ${def.anchorTo || '?'}`;
    }
    return def.sortKey !== null && def.sortKey !== undefined ? String(def.sortKey) : '';
}

function formatTimelineDateRange(dateRange = {}) {
    const range = dateRange && typeof dateRange === 'object' && !Array.isArray(dateRange) ? dateRange : {};
    const from = String(range.from || '').trim();
    const to = String(range.to || '').trim();
    if (from && to && from !== to) return `${from} to ${to}`;
    return from || to || '';
}

function getContextTimelineItemCoordinateText(item = {}) {
    const def = item.definition || {};
    return [
        formatTimelineDateRange(def.dateRange),
        def.book || def.work,
        def.schoolYear,
        def.arc,
        def.phase,
        def.season || def.episode ? `S${def.season || '?'} E${def.episode || '?'}` : '',
        def.chapter ? `Ch ${def.chapter}` : '',
        def.issue ? `Issue ${def.issue}` : '',
        def.quest,
        def.gameStage,
    ].filter(Boolean).join(' | ');
}

function getContextWorkbenchTimelineItems(pack = null, contextIndex = getContextIndexSync()) {
    if (!pack?.packId) return [];
    const rows = getContextWorkbenchEntryRows(pack);
    const items = buildLoredeckTimelineRegistryItems(pack, rows);
    const itemMap = new Map(items.map(item => [getContextTimelineItemKey(item), item]));
    const stats = buildLoredeckTimelineAttachmentStats(rows);
    const addIndexedItem = (kind, sourceDef) => {
        const id = normalizeLoredeckTimelineId(sourceDef?.id);
        if (!id) return;
        const key = `${kind}:${id}`;
        const existing = itemMap.get(key);
        if (existing?.sourceDefined) return;
        const normalized = kind === 'window'
            ? normalizeLoredeckTimelineWindow(sourceDef, id)
            : normalizeLoredeckTimelineAnchor(sourceDef, id);
        if (!normalized) return;
        if (existing) {
            existing.sourceDefined = true;
            existing.sourceDefinition = normalized;
            existing.definition = existing.customDefinition || normalized;
            existing.registryState = existing.disabled
                ? 'disabled'
                : (existing.customDefined ? 'custom override' : 'source');
            return;
        }
        itemMap.set(key, {
            kind,
            id,
            sourceDefined: true,
            customDefined: false,
            disabled: false,
            sourceDefinition: normalized,
            customDefinition: null,
            definition: normalized,
            entryIds: kind === 'anchor' ? (stats.anchorRefs.get(id) || []) : getTimelineWindowEntryRefs(normalized, stats),
            registryState: 'source',
        });
    };

    for (const anchor of (contextIndex?.anchors || []).filter(anchor => anchor?.packId === pack.packId)) {
        addIndexedItem('anchor', anchor);
    }
    for (const windowDef of (contextIndex?.windows || []).filter(windowDef => windowDef?.packId === pack.packId)) {
        addIndexedItem('window', windowDef);
    }
    return Array.from(itemMap.values()).sort(compareContextTimelineItems);
}

function compareContextTimelineItems(a = {}, b = {}) {
    const aSort = normalizeLoredeckTimelineNumber(a.definition?.sortKey ?? a.definition?.sortKeyFrom) ?? Number.MAX_SAFE_INTEGER;
    const bSort = normalizeLoredeckTimelineNumber(b.definition?.sortKey ?? b.definition?.sortKeyFrom) ?? Number.MAX_SAFE_INTEGER;
    if (aSort !== bSort) return aSort - bSort;
    const kindCompare = String(a.kind || '').localeCompare(String(b.kind || ''));
    if (kindCompare) return kindCompare;
    return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true, sensitivity: 'base' });
}

function filterContextWorkbenchTimelineItems(items = [], query = contextWorkbenchQuery, typeFilter = contextWorkbenchTypeFilter) {
    const q = String(query || '').trim().toLowerCase();
    return items.filter(item => {
        if (typeFilter !== 'all' && item.kind !== typeFilter) return false;
        if (!q) return true;
        const def = item.definition || {};
        return [
            item.kind,
            item.id,
            item.registryState,
            def.label,
            def.anchorFrom,
            def.anchorTo,
            def.book,
            def.work,
            def.schoolYear,
            def.arc,
            def.phase,
            def.season,
            def.episode,
            def.chapter,
            def.issue,
            def.quest,
            def.gameStage,
            def.notes,
            ...(Array.isArray(def.aliases) ? def.aliases : []),
            ...(Array.isArray(def.tags) ? def.tags : []),
            ...(Array.isArray(item.entryIds) ? item.entryIds : []),
        ].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
}

function applyContextTimelineItem(packId, item = {}) {
    if (!item?.id) return;
    const def = item.definition || {};
    if (item.kind === 'window') {
        const firstDate = String(def.dateRange?.from || def.dateRange?.to || '').trim();
        commitLoredeckContextPatch(packId, {
            contextType: def.contextType || 'anchor_window',
            anchorId: '',
            anchorFrom: def.anchorFrom || '',
            anchorTo: def.anchorTo || '',
            label: def.label || item.id || '',
            sceneDate: firstDate,
            contextSortKey: normalizeLoredeckTimelineNumber(def.sortKeyFrom),
            contextSortKeyFrom: normalizeLoredeckTimelineNumber(def.sortKeyFrom),
            contextSortKeyTo: normalizeLoredeckTimelineNumber(def.sortKeyTo),
            alias: def.aliases?.[0] || def.label || item.id || '',
            source: 'manual',
        });
        return;
    }
    applyContextAnchor(packId, def);
}

function applyContextAnchorBoundary(packId, item = {}, mode = 'from') {
    if (!item?.id || item.kind === 'window') return;
    const def = item.definition || {};
    const id = normalizeLoredeckTimelineId(def.id || item.id);
    if (!id) return;
    const context = getLoredeckContext(getState(), packId);
    const label = String(def.label || id).trim();
    const firstDate = String(def.dateRange?.from || def.dateRange?.to || '').trim();
    const startSort = getLoredeckAnchorStartSortKey(def);
    const endSort = getLoredeckAnchorEndSortKey(def);
    const patch = {
        contextType: 'anchor_window',
        anchorId: '',
        sceneDate: firstDate || context.sceneDate || '',
        arc: def.arc || context.arc || '',
        phase: def.phase || context.phase || '',
        season: def.season || context.season || '',
        episode: def.episode || context.episode || '',
        chapter: def.chapter || context.chapter || '',
        issue: def.issue || context.issue || '',
        quest: def.quest || context.quest || '',
        gameStage: def.gameStage || context.gameStage || '',
        alias: def.aliases?.[0] || def.label || id,
        source: 'manual',
    };
    if (mode === 'to') {
        patch.anchorFrom = context.anchorFrom || '';
        patch.anchorTo = id;
        patch.contextSortKey = Number.isFinite(Number(context.contextSortKey)) ? Number(context.contextSortKey) : (context.contextSortKeyFrom ?? endSort);
        patch.contextSortKeyFrom = Number.isFinite(Number(context.contextSortKeyFrom)) ? Number(context.contextSortKeyFrom) : (Number.isFinite(Number(context.contextSortKey)) ? Number(context.contextSortKey) : null);
        patch.contextSortKeyTo = endSort;
        patch.label = context.anchorFrom ? `${context.anchorFrom} to ${label}` : `Before ${label}`;
    } else {
        patch.anchorFrom = id;
        patch.anchorTo = context.anchorTo || '';
        patch.contextSortKey = startSort;
        patch.contextSortKeyFrom = startSort;
        patch.contextSortKeyTo = Number.isFinite(Number(context.contextSortKeyTo)) ? Number(context.contextSortKeyTo) : null;
        patch.label = context.anchorTo ? `${label} to ${context.anchorTo}` : `After ${label}`;
    }
    commitLoredeckContextPatch(packId, patch);
}

async function registerLoredeckManifestFromInput(manifestRef, options = {}) {
    const button = options.button || null;
    const restoreBusy = setLoredeckActionButtonBusy(button, 'Registering...', { fallbackLabel: 'Register' });
    try {
        const ref = String(manifestRef || '').trim();
        if (!ref) throw new Error('Enter a loredeck.json path or URL.');
        const manifest = await fetchLoredeckManifest(ref);
        const record = buildLoredeckRecordFromManifest(manifest, ref);
        const result = upsertLoredeckLibraryPack(record);
        if (!result.ok) throw new Error(result.error || 'Loredeck registration failed.');
        refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
        toast(`${record.title} registered as a ${record.type} Loredeck.`, 'success');
        return result.pack;
    } catch (e) {
        toast(e?.message || 'Loredeck registration failed.', 'error');
        return null;
    } finally {
        restoreBusy();
    }
}

function getLoredeckCreatorJobForPackId(packId = '') {
    const id = String(packId || '').trim();
    if (!id) return null;
    const active = getActiveLoredeckCreatorJob(getState());
    if (active && String(active.generatedPackId || active.brief?.packId || '').trim() === id) return active;
    const registry = getLoredeckCreatorRegistry(getState());
    const jobs = registry?.jobs && typeof registry.jobs === 'object' && !Array.isArray(registry.jobs)
        ? Object.values(registry.jobs)
        : [];
    return jobs.find(job => String(job?.generatedPackId || job?.brief?.packId || '').trim() === id) || null;
}

function getLoredeckCreatorJobForPack(pack = {}) {
    const packId = String(pack?.packId || '').trim();
    if (!packId || !isGeneratedLoredeckPack(pack)) return null;
    return getLoredeckCreatorJobForPackId(packId);
}

async function retireGeneratedLoredeckAfterFinalization(sourcePack = {}, finalizedRecord = {}, creatorJob = null) {
    const sourcePackId = String(sourcePack?.packId || '').trim();
    const finalizedPackId = String(finalizedRecord?.packId || '').trim();
    const job = creatorJob || getLoredeckCreatorJobForPack(sourcePack) || (sourcePackId ? getLoredeckCreatorJobForPackId(sourcePackId) : null);
    const jobId = String(job?.jobId || '').trim();
    const failures = [];

    if (sourcePackId && sourcePackId !== finalizedPackId) {
        removeLoredeckCreatorGeneratedPackFromStack(sourcePackId);
        const removed = removeLoredeckLibraryPack(sourcePackId, { clearCreatorProjects: false, syncPrompt: false });
        if (!removed.ok && !/not registered/i.test(String(removed.error || ''))) {
            failures.push(removed.error || 'Generated Loredeck working pack could not be removed.');
        }
        clearLoredeckCreatorResetPackCaches(sourcePackId, { clearDraftCache: true });
    }

    if (jobId) {
        const cleared = clearLoredeckCreatorJob(jobId, { syncPrompt: false });
        if (!cleared.ok) failures.push(cleared.error || 'Deck Maker project could not be cleared.');
        clearLoredeckCreatorWorkbenchCacheForRemovedJobs([jobId], sourcePackId, { refresh: false });
    }

    const storageResults = await Promise.all([
        flushSagaCreatorProjectStorageWrites(),
        flushSagaLorepackLibraryStorageWrites(),
        flushSagaLorepackPayloadStorageWrites(),
    ]);
    for (const result of storageResults) {
        if (result?.ok === false) failures.push(result.error || 'Storage write failed.');
    }

    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    refreshLoredeckCreatorWorkbenchBody({ preserveScroll: false });
    return failures.length ? { ok: false, error: failures[0], failures } : { ok: true };
}

function isLoredeckCreatorDraftCache(cache = {}) {
    const changes = getLoredeckAssistantDraftChanges(cache);
    return String(cache?.source || '').trim() === 'loredeck_creator'
        || changes.some(change => String(change?.source || '').trim() === 'loredeck_creator');
}

function stableLoredeckCreatorReviewJson(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(item => stableLoredeckCreatorReviewJson(item)).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableLoredeckCreatorReviewJson(value[key])}`).join(',')}}`;
}

function getLoredeckCreatorReviewEntryOverrides(change = {}) {
    const payload = change?.payload && typeof change.payload === 'object' && !Array.isArray(change.payload)
        ? change.payload
        : {};
    const overrides = payload.entryOverrides && typeof payload.entryOverrides === 'object' && !Array.isArray(payload.entryOverrides)
        ? payload.entryOverrides
        : {};
    return Object.keys(overrides).length ? overrides : null;
}

function isLoredeckCreatorReviewSupplementalPayloadApplied(pack = {}, change = {}) {
    const payload = change?.payload && typeof change.payload === 'object' && !Array.isArray(change.payload)
        ? change.payload
        : {};
    const supportedKeys = new Set(['entryOverrides', 'disabledEntryIdsRemove']);
    const payloadKeys = Object.keys(payload).filter(key => payload[key] !== undefined);
    if (!payloadKeys.length || payloadKeys.some(key => !supportedKeys.has(key))) return false;
    const disabled = new Set(normalizeLoredeckPendingIdList(pack?.disabledEntryIds || []));
    return normalizeLoredeckPendingIdList(payload.disabledEntryIdsRemove || [])
        .every(id => !disabled.has(id));
}

function isLoredeckCreatorReviewChangeAlreadyAccepted(pack = {}, change = {}) {
    const overrides = getLoredeckCreatorReviewEntryOverrides(change);
    if (!overrides) return false;
    const accepted = pack?.entryOverrides && typeof pack.entryOverrides === 'object' && !Array.isArray(pack.entryOverrides)
        ? pack.entryOverrides
        : {};
    return isLoredeckCreatorReviewSupplementalPayloadApplied(pack, change)
        && Object.entries(overrides).every(([entryId, nextEntry]) => (
            Object.prototype.hasOwnProperty.call(accepted, entryId)
            && stableLoredeckCreatorReviewJson(accepted[entryId]) === stableLoredeckCreatorReviewJson(nextEntry)
        ));
}

function isLoredeckCreatorReviewChangeAlreadyPending(pack = {}, change = {}) {
    const changeId = String(change?.changeId || '').trim();
    const pending = normalizeLoredeckPendingChanges(pack?.pendingChanges);
    if (changeId && pending.some(item => item.changeId === changeId)) return true;
    const overrides = getLoredeckCreatorReviewEntryOverrides(change);
    if (!overrides) return false;
    const changeText = stableLoredeckCreatorReviewJson(overrides);
    return pending.some(item => {
        const pendingOverrides = getLoredeckCreatorReviewEntryOverrides(item);
        return pendingOverrides && stableLoredeckCreatorReviewJson(pendingOverrides) === changeText;
    });
}

function filterLoredeckCreatorActiveDraftChanges(draftChanges = [], pack = null) {
    if (!pack) return getLoredeckAssistantDraftChanges({ draftChanges });
    return getLoredeckAssistantDraftChanges({ draftChanges }).filter(change => {
        if (String(change?.source || '').trim() !== 'loredeck_creator') return true;
        return !isLoredeckCreatorReviewChangeAlreadyPending(pack, change)
            && !isLoredeckCreatorReviewChangeAlreadyAccepted(pack, change);
    });
}

function reconcileLoredeckCreatorDraftCacheWithPack(packId = '', cache = {}, pack = null, options = {}) {
    const id = String(packId || '').trim();
    const changes = getLoredeckAssistantDraftChanges(cache);
    if (!id || !changes.length) return cache || {};
    const freshPack = pack || getFreshLoredeckLibraryPack(id, getLoredeckDefinition(id));
    const retained = filterLoredeckCreatorActiveDraftChanges(changes, freshPack);
    if (retained.length === changes.length) return cache;
    const retainedIds = new Set(retained.map(change => change.changeId));
    const selectedIds = getLoredeckAssistantSelectedDraftIds(cache);
    const next = {
        ...(cache || {}),
        draftChanges: retained,
        selectedDraftChangeIds: [...selectedIds].filter(changeId => retainedIds.has(changeId)),
        updatedAt: Date.now(),
    };
    if (!retained.length) {
        delete next.draftChanges;
        delete next.selectedDraftChangeIds;
    }
    next.qualityWarningCount = countLoredeckAssistantQualityWarningsForChanges(retained);
    loredeckAssistantDraftCacheController.setRecord(id, next);
    if (options.syncJob !== false) syncLoredeckCreatorDraftCacheToJob(id, next);
    return next;
}

function getLoredeckCreatorDraftCacheForPack(packId = '') {
    const id = String(packId || '').trim();
    if (!id) return {};
    const current = loredeckAssistantDraftCacheController.getRecord(id);
    const currentDraftChanges = getLoredeckAssistantDraftChanges(current);
    if (currentDraftChanges.length) {
        return reconcileLoredeckCreatorDraftCacheWithPack(id, current);
    }
    const job = getLoredeckCreatorJobForPackId(id);
    const rawDraftChanges = getLoredeckAssistantDraftChanges(job || {});
    if (!rawDraftChanges.length) return current;
    const pack = getFreshLoredeckLibraryPack(id, getLoredeckDefinition(id));
    const draftChanges = filterLoredeckCreatorActiveDraftChanges(rawDraftChanges, pack);
    const hydrated = {
        ...current,
        source: 'loredeck_creator',
        summary: job.entryDraftSummary || current.summary || `Deck Maker drafted ${draftChanges.length} schema v3 Lorecard${draftChanges.length === 1 ? '' : 's'}.`,
        questions: Array.isArray(job.entryDraftQuestions) ? job.entryDraftQuestions : [],
        warnings: Array.isArray(job.entryDraftWarnings) ? job.entryDraftWarnings : [],
        draftChanges,
        selectedDraftChangeIds: draftChanges.map(change => change.changeId),
        mode: 'creator_entry_generation',
        targetScope: 'approved_titles',
        creatorEntryDraftCount: draftChanges.length,
        creatorEntryBatchCount: countLoredeckCreatorEntryDraftUnits(draftChanges),
        createdAt: job.entryDraftedAt || job.updatedAt || Date.now(),
        updatedAt: job.updatedAt || Date.now(),
    };
    hydrated.qualityWarningCount = countLoredeckAssistantQualityWarningsForChanges(draftChanges);
    loredeckAssistantDraftCacheController.setRecord(id, hydrated);
    if (draftChanges.length !== rawDraftChanges.length) syncLoredeckCreatorDraftCacheToJob(id, hydrated);
    return hydrated;
}

function syncLoredeckCreatorDraftCacheToJob(packId = '', draftCache = null) {
    const id = String(packId || '').trim();
    if (!id) return null;
    const job = getLoredeckCreatorJobForPackId(id);
    if (!job) return null;
    const cache = draftCache || loredeckAssistantDraftCacheController.getRecord(id);
    const draftChanges = getLoredeckAssistantDraftChanges(cache)
        .filter(change => String(change?.source || '').trim() === 'loredeck_creator');
    if (!isLoredeckCreatorDraftCache(cache) && !Array.isArray(job.draftChanges)) return null;
    const pack = getFreshLoredeckLibraryPack(id, getLoredeckDefinition(id));
    const progress = pack ? getLoredeckCreatorEntryDraftProgress({ ...job, draftChanges }, pack) : null;
    return setLoredeckCreatorBriefCache({
        ...job,
        draftChanges,
        entryDraftCount: draftChanges.length,
        ...(progress ? { entryDraftRemainingCount: progress.remainingCount } : {}),
    }, { suppressWorkbenchRefresh: true });
}

function collectLoredeckCreatorChangeEntryIds(changes = []) {
    const ids = new Set();
    for (const change of Array.isArray(changes) ? changes : []) {
        for (const rawId of change?.affectedEntryIds || []) {
            const id = normalizeLoredeckEntryId(rawId);
            if (id) ids.add(id);
        }
        const overrides = isPlainObjectValue(change?.payload?.entryOverrides) ? change.payload.entryOverrides : {};
        for (const rawId of Object.keys(overrides)) {
            const id = normalizeLoredeckEntryId(rawId);
            if (id) ids.add(id);
        }
    }
    return ids;
}

function countLoredeckCreatorCoveredApprovedTitles(approvedEntryIds = new Set(), candidateIds = new Set()) {
    let count = 0;
    for (const id of approvedEntryIds || []) {
        if (candidateIds.has(id)) count += 1;
    }
    return count;
}

function getLoredeckCreatorPipelineReadiness(pack = {}, creatorJob = null) {
    const job = creatorJob || getLoredeckCreatorJobForPack(pack);
    const acceptedEntries = getAcceptedGeneratedLoredeckEntries(pack);
    const acceptedEntryIds = new Set(acceptedEntries.map(entry => normalizeLoredeckEntryId(entry.id)).filter(Boolean));
    const pendingChanges = getLoredeckPendingChanges(pack);
    const draftChanges = getLoredeckAssistantDraftChanges(getLoredeckCreatorDraftCacheForPack(pack.packId));
    const pendingEntryIds = collectLoredeckCreatorChangeEntryIds(pendingChanges);
    const draftEntryIds = collectLoredeckCreatorChangeEntryIds(draftChanges);
    const warnings = [];
    const coverage = getLoredeckCreatorCoverageModel(job || {}, pack);

    if (!job) {
        warnings.push('No linked Deck Maker job was found for this Generated Loredeck, so batch completeness cannot be verified.');
        return {
            jobLinked: false,
            statusLabel: acceptedEntries.length ? 'Accepted data only' : 'No Deck Maker job',
            warnings,
            titleBatchCount: 0,
            titleBatchDraftedCount: 0,
            approvedTitleCount: 0,
            approvedTitleAcceptedCount: 0,
            approvedTitlePendingCount: 0,
            approvedTitleDraftCount: 0,
            approvedTitleUnhandledCount: 0,
            eligiblePlanningBatchCount: 0,
            queuedPlanningBatchCount: 0,
            acceptedPlanningBatchCount: 0,
            remainingEntryCount: 0,
            activeEntryBatchLabel: '',
            coverage,
        };
    }

    const titleBatches = getLoredeckCreatorTitleBatchRows(job);
    const titleBatchIds = new Set(titleBatches.map(batch => batch.id).filter(Boolean));
    const draftedTitleBatchIds = getLoredeckCreatorTitleDraftedBatchIds(job);
    const titleBatchDraftedCount = [...draftedTitleBatchIds].filter(id => titleBatchIds.has(id)).length;
    const approvedTitles = getLoredeckCreatorApprovedTitleDrafts(job);
    const approvedEntryIds = new Set(approvedTitles.map(draft => normalizeLoredeckEntryId(draft.titleId)).filter(Boolean));
    const planningBatches = getLoredeckCreatorPlanningBatchRows(job);
    const eligiblePlanningBatches = planningBatches.filter(batch => batch.approvedTitleCount > 0);
    const eligiblePlanningBatchIds = new Set(eligiblePlanningBatches.map(batch => batch.id).filter(Boolean));
    const queuedPlanningBatchIds = getLoredeckCreatorPlanningQueuedBatchIds(job, pack);
    const acceptedPlanningBatchIds = getLoredeckCreatorPlanningAcceptedBatchIds(job);
    const queuedPlanningBatchCount = [...queuedPlanningBatchIds].filter(id => eligiblePlanningBatchIds.has(id)).length;
    const acceptedPlanningBatchCount = [...acceptedPlanningBatchIds].filter(id => eligiblePlanningBatchIds.has(id)).length;
    const entryProgress = getLoredeckCreatorEntryDraftProgress(job, pack);
    const approvedTitleAcceptedCount = countLoredeckCreatorCoveredApprovedTitles(approvedEntryIds, acceptedEntryIds);
    const approvedTitlePendingCount = countLoredeckCreatorCoveredApprovedTitles(approvedEntryIds, pendingEntryIds);
    const approvedTitleDraftCount = countLoredeckCreatorCoveredApprovedTitles(approvedEntryIds, draftEntryIds);
    const approvedTitleHandledCount = Math.min(
        approvedEntryIds.size,
        approvedTitleAcceptedCount + approvedTitlePendingCount + approvedTitleDraftCount
    );
    const approvedTitleUnhandledCount = Math.max(0, approvedEntryIds.size - approvedTitleHandledCount);

    if (!job.approved) warnings.push('Scope Brief is not approved in the linked Deck Maker job.');
    if (!job.outlineApproved) warnings.push('Story Outline is not approved in the linked Deck Maker job.');
    if (titleBatches.length && titleBatchDraftedCount < titleBatches.length) {
        warnings.push(`${titleBatches.length - titleBatchDraftedCount} title set${titleBatches.length - titleBatchDraftedCount === 1 ? '' : 's'} still need a title pass.`);
    }
    if (!approvedEntryIds.size) {
        warnings.push('No approved title plan is linked to this Generated Loredeck.');
    }
    if (eligiblePlanningBatches.length && queuedPlanningBatchCount < eligiblePlanningBatches.length) {
        warnings.push(`${eligiblePlanningBatches.length - queuedPlanningBatchCount} approved-title set${eligiblePlanningBatches.length - queuedPlanningBatchCount === 1 ? '' : 's'} still need Context and Tag planning.`);
    }
    if (queuedPlanningBatchCount && acceptedPlanningBatchCount < queuedPlanningBatchCount) {
        warnings.push(`${queuedPlanningBatchCount - acceptedPlanningBatchCount} planned Context and Tag set${queuedPlanningBatchCount - acceptedPlanningBatchCount === 1 ? '' : 's'} still need Pending Review acceptance.`);
    }
    if (approvedEntryIds.size && approvedTitleAcceptedCount < approvedEntryIds.size) {
        warnings.push(`${approvedEntryIds.size - approvedTitleAcceptedCount} approved title${approvedEntryIds.size - approvedTitleAcceptedCount === 1 ? '' : 's'} do not have Accepted Lorecards yet.`);
    }
    for (const warning of coverage.warnings || []) {
        warnings.push(`Coverage: ${warning}`);
    }
    if (coverage.finalizeAcknowledgementRequired) {
        warnings.push(coverage.available
            ? 'Coverage: Missing or thin rows must be expanded or explicitly acknowledged before finalizing as Custom.'
            : 'Coverage: No adaptive coverage plan exists; redraft or explicitly acknowledge before finalizing as Custom.');
    } else if (coverage.finalizeAcknowledged) {
        warnings.push('Coverage: Missing or thin rows were explicitly acknowledged for finalization.');
    }

    const complete = !!approvedEntryIds.size
        && approvedTitleAcceptedCount >= approvedEntryIds.size
        && (!titleBatches.length || titleBatchDraftedCount >= titleBatches.length)
        && (!eligiblePlanningBatches.length || acceptedPlanningBatchCount >= eligiblePlanningBatches.length);
    const statusLabel = complete
        ? 'Deck Maker complete'
        : (approvedTitleAcceptedCount ? 'Partial deck' : (entryProgress?.remainingCount ? 'Entries in progress' : 'Planning in progress'));

    return {
        jobLinked: true,
        jobId: job.jobId || '',
        statusLabel,
        warnings,
        titleBatchCount: titleBatches.length,
        titleBatchDraftedCount,
        approvedTitleCount: approvedEntryIds.size,
        approvedTitleAcceptedCount,
        approvedTitlePendingCount,
        approvedTitleDraftCount,
        approvedTitleUnhandledCount,
        eligiblePlanningBatchCount: eligiblePlanningBatches.length,
        queuedPlanningBatchCount,
        acceptedPlanningBatchCount,
        remainingEntryCount: entryProgress?.remainingCount || 0,
        activeEntryBatchLabel: entryProgress?.activeBatchLabel || '',
        coverage,
    };
}

function getLoredeckOverrideState(pack = {}) {
    const overrides = {};
    const rawOverrides = pack.entryOverrides && typeof pack.entryOverrides === 'object' && !Array.isArray(pack.entryOverrides)
        ? pack.entryOverrides
        : {};
    for (const [key, raw] of Object.entries(rawOverrides)) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const id = String(raw.id || key || '').trim();
        if (!id) continue;
        overrides[id] = {
            ...raw,
            id,
        };
    }
    const disabledEntryIds = [];
    const seen = new Set();
    for (const raw of Array.isArray(pack.disabledEntryIds) ? pack.disabledEntryIds : []) {
        const id = String(raw || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        disabledEntryIds.push(id);
    }
    const pendingChanges = getLoredeckPendingChanges(pack);
    return {
        overrides,
        disabledEntryIds,
        disabledSet: new Set(disabledEntryIds),
        overrideCount: Object.keys(overrides).length,
        pendingChanges,
        pendingCount: pendingChanges.length,
    };
}

function normalizeLoredeckTagId(value) {
    return String(value || '')
        .trim()
        .replace(/[\r\n]+/g, ' ')
        .replace(/[^\p{L}\p{N} _:\-./]+/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/:+/g, ':')
        .replace(/^[\s:._/-]+|[\s:._/-]+$/g, '')
        .toLowerCase()
        .slice(0, 96)
        .trim();
}

function normalizeLoredeckTagColor(value) {
    const text = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(text)) {
        return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`.toLowerCase();
    }
    return '';
}

function humanizeLoredeckTagId(tagId) {
    const text = String(tagId || '').trim();
    const value = text.includes(':') ? text.split(':').slice(1).join(':') : text;
    return value
        .replace(/[._/-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, char => char.toUpperCase()) || text;
}

function normalizeLoredeckTagTextList(value, limit = 64, normalizeIds = false) {
    const rawItems = Array.isArray(value)
        ? value.flatMap(item => Array.isArray(item) ? item : [item])
        : String(value || '').split(/[,;\n\r]+/);
    const output = [];
    const seen = new Set();
    for (const raw of rawItems) {
        const text = normalizeIds
            ? normalizeLoredeckTagId(raw)
            : String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 120).trim();
        if (!text) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(text);
        if (output.length >= limit) break;
    }
    return output;
}

function normalizeLoredeckTagDefinition(raw = {}, tagId = '') {
    const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const id = normalizeLoredeckTagId(input.id || tagId);
    return {
        label: String(input.label || '').trim().slice(0, 160),
        color: normalizeLoredeckTagColor(input.color),
        textColor: normalizeLoredeckTagColor(input.textColor),
        description: String(input.description || input.notes || '').trim().slice(0, 1000),
        aliases: normalizeLoredeckTagTextList(input.aliases, 64, false),
        parents: normalizeLoredeckTagTextList(input.parents, 64, true),
        sensitive: input.sensitive === true,
        deprecated: input.deprecated === true,
        replacement: normalizeLoredeckTagId(input.replacement || ''),
        ...(id ? { id } : {}),
    };
}

function normalizeLoredeckTagRegistry(value = null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { schemaVersion: 1, tags: {} };
    }
    const source = value.tags && typeof value.tags === 'object' && !Array.isArray(value.tags)
        ? value.tags
        : value;
    const tags = {};
    let count = 0;
    for (const [rawId, rawDef] of Object.entries(source || {})) {
        if (!rawDef || typeof rawDef !== 'object' || Array.isArray(rawDef)) continue;
        const id = normalizeLoredeckTagId(rawDef.id || rawId);
        if (!id) continue;
        const def = normalizeLoredeckTagDefinition(rawDef, id);
        delete def.id;
        tags[id] = def;
        count += 1;
        if (count >= 2000) break;
    }
    return {
        schemaVersion: 1,
        tags,
    };
}

function normalizeLoredeckTimelineId(value) {
    return String(value || '')
        .trim()
        .replace(/[\r\n]+/g, ' ')
        .replace(/[^\p{L}\p{N} _:\-./]+/gu, '')
        .replace(/\s+/g, '_')
        .slice(0, 180)
        .trim();
}

function normalizeLoredeckTimelineTextList(value, limit = 64) {
    const rawItems = Array.isArray(value)
        ? value.flatMap(item => Array.isArray(item) ? item : [item])
        : String(value || '').split(/[,;\n\r]+/);
    const output = [];
    const seen = new Set();
    for (const raw of rawItems) {
        const text = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 160).trim();
        if (!text) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(text);
        if (output.length >= limit) break;
    }
    return output;
}

function normalizeLoredeckTimelineDateRange(value = {}) {
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
        from: String(input.from || input.start || input.validFrom || '').trim().slice(0, 80),
        to: String(input.to || input.end || input.validTo || '').trim().slice(0, 80),
        precision: String(input.precision || '').trim().slice(0, 40),
    };
}

function normalizeLoredeckTimelineNumber(value) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
}

function normalizeLoredeckTimelineAnchor(raw = {}, fallbackId = '', index = 0) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const id = normalizeLoredeckTimelineId(raw.id || fallbackId);
    if (!id) return null;
    return {
        id,
        label: String(raw.label || raw.title || id).trim().slice(0, 240),
        contextType: String(raw.contextType || raw.type || 'anchor').trim().slice(0, 80),
        sortKey: normalizeLoredeckTimelineNumber(raw.sortKey) ?? index + 1,
        dateRange: normalizeLoredeckTimelineDateRange(raw.dateRange || raw.date || raw.canonTiming),
        book: String(raw.book || raw.sourceInfo?.title || raw.source?.book || '').trim().slice(0, 160),
        work: String(raw.work || raw.sourceInfo?.work || raw.source?.work || '').trim().slice(0, 160),
        schoolYear: String(raw.schoolYear || raw.date?.schoolYear || raw.canonTiming?.schoolYear || '').trim().slice(0, 80),
        arc: String(raw.arc || '').trim().slice(0, 180),
        phase: String(raw.phase || '').trim().slice(0, 180),
        season: String(raw.season || '').trim().slice(0, 80),
        episode: String(raw.episode || '').trim().slice(0, 80),
        chapter: String(raw.chapter || '').trim().slice(0, 80),
        issue: String(raw.issue || '').trim().slice(0, 80),
        quest: String(raw.quest || '').trim().slice(0, 180),
        gameStage: String(raw.gameStage || '').trim().slice(0, 180),
        aliases: normalizeLoredeckTimelineTextList(raw.aliases || raw.triggers, 64),
        tags: normalizeLoredeckTimelineTextList(raw.tags, 64),
        notes: String(raw.notes || raw.description || '').trim().slice(0, 1000),
    };
}

function normalizeLoredeckTimelineWindow(raw = {}, fallbackId = '', index = 0) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const id = normalizeLoredeckTimelineId(raw.id || fallbackId);
    if (!id) return null;
    return {
        id,
        label: String(raw.label || raw.title || id).trim().slice(0, 240),
        contextType: String(raw.contextType || raw.type || 'anchor_window').trim().slice(0, 80),
        anchorFrom: normalizeLoredeckTimelineId(raw.anchorFrom || raw.from || raw.validFromAnchor),
        anchorTo: normalizeLoredeckTimelineId(raw.anchorTo || raw.to || raw.validToAnchor),
        sortKeyFrom: normalizeLoredeckTimelineNumber(raw.sortKeyFrom ?? raw.fromSortKey ?? raw.sortKeyStart),
        sortKeyTo: normalizeLoredeckTimelineNumber(raw.sortKeyTo ?? raw.toSortKey ?? raw.sortKeyEnd),
        dateRange: normalizeLoredeckTimelineDateRange(raw.dateRange || raw.date),
        aliases: normalizeLoredeckTimelineTextList(raw.aliases || raw.triggers, 64),
        tags: normalizeLoredeckTimelineTextList(raw.tags, 64),
        notes: String(raw.notes || raw.description || '').trim().slice(0, 1000),
    };
}

function normalizeLoredeckTimelineDisabledIds(value = []) {
    if (!Array.isArray(value)) return [];
    const output = [];
    const seen = new Set();
    for (const raw of value) {
        const id = normalizeLoredeckTimelineId(raw);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        output.push(id);
        if (output.length >= 2000) break;
    }
    return output;
}

function normalizeLoredeckTimelineRegistry(value = null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { schemaVersion: 1, timelineMode: 'hybrid', sortKeyScale: 'pack_local', anchors: [], windows: [] };
    }
    const input = value;
    const anchors = [];
    for (const [index, raw] of (Array.isArray(input.anchors) ? input.anchors : []).entries()) {
        const anchor = normalizeLoredeckTimelineAnchor(raw, '', index);
        if (anchor) anchors.push(anchor);
        if (anchors.length >= 5000) break;
    }
    const rawWindows = [
        ...(Array.isArray(input.windows) ? input.windows : []),
        ...(Array.isArray(input.arcs) ? input.arcs : []),
        ...(Array.isArray(input.phases) ? input.phases : []),
    ];
    const windows = [];
    for (const [index, raw] of rawWindows.entries()) {
        const window = normalizeLoredeckTimelineWindow(raw, '', index);
        if (window) windows.push(window);
        if (windows.length >= 5000) break;
    }
    return {
        schemaVersion: Number.isFinite(Number(input.schemaVersion)) ? Number(input.schemaVersion) : 1,
        timelineMode: String(input.timelineMode || 'hybrid').trim().slice(0, 80),
        defaultContextType: String(input.defaultContextType || '').trim().slice(0, 80),
        sortKeyScale: String(input.sortKeyScale || 'pack_local').trim().slice(0, 160),
        summary: String(input.summary || input.description || '').trim().slice(0, 1000),
        anchors,
        windows,
        disabledAnchorIds: normalizeLoredeckTimelineDisabledIds(input.disabledAnchorIds || input.disabledAnchors || []),
        disabledWindowIds: normalizeLoredeckTimelineDisabledIds(input.disabledWindowIds || input.disabledWindows || []),
    };
}

function getLoredeckEmbeddedTimelineRegistry(pack = {}) {
    return normalizeLoredeckTimelineRegistry(pack?.timelineRegistry);
}

function getLoredeckCachedSourceTimelineRegistry(packId) {
    const cached = loredeckPreviewCacheController.getTimelineRegistry(packId);
    return normalizeLoredeckTimelineRegistry(cached?.sourceRegistry);
}

function getLoredeckEmbeddedTagRegistry(pack = {}) {
    return normalizeLoredeckTagRegistry(pack?.tagRegistry);
}

function getLoredeckCachedSourceTagRegistry(packId) {
    const cached = loredeckPreviewCacheController.getTagRegistry(packId);
    return normalizeLoredeckTagRegistry(cached?.sourceRegistry);
}

function mergeLoredeckTagDefinition(sourceDef = {}, customDef = {}) {
    return normalizeLoredeckTagDefinition({
        ...(sourceDef || {}),
        ...(customDef || {}),
    });
}

function normalizeLoredeckHealthIssueStates(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const output = {};
    let count = 0;
    for (const [rawKey, rawState] of Object.entries(value)) {
        if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) continue;
        const issueKey = String(rawKey || rawState.issueKey || '').trim().replace(/[^a-z0-9_.:-]+/gi, '_').slice(0, 160);
        const status = String(rawState.status || '').trim().toLowerCase();
        if (!issueKey || !['ignored', 'resolved'].includes(status)) continue;
        output[issueKey] = {
            status,
            issueKey,
            code: String(rawState.code || '').trim().slice(0, 120),
            severity: normalizeLoredeckHealthSeverity(rawState.severity || ''),
            title: String(rawState.title || '').trim().slice(0, 240),
            note: String(rawState.note || '').trim().slice(0, 500),
            updatedAt: Number.isFinite(Number(rawState.updatedAt)) ? Number(rawState.updatedAt) : Date.now(),
        };
        count += 1;
        if (count >= 500) break;
    }
    return output;
}

function parseLoredeckEntryTags(value, limit = 64) {
    const rawItems = Array.isArray(value)
        ? value.flatMap(item => Array.isArray(item) ? item : [item])
        : String(value || '').split(/[,;\n\r]+/);
    const tags = [];
    const seen = new Set();
    for (const raw of rawItems) {
        const tag = normalizeLoredeckTagId(raw);
        if (!tag) continue;
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        tags.push(tag);
        if (tags.length >= limit) break;
    }
    return tags;
}

function getLoredeckEntryTags(entry = {}) {
    return parseLoredeckEntryTags(Array.isArray(entry.tags) ? entry.tags : []);
}

function getLoredeckEntryRowsForBulk(rows = []) {
    return (rows || []).filter(row => row?.id && !row.disabled);
}

function buildLoredeckTagStats(rows = []) {
    const map = new Map();
    for (const row of rows || []) {
        if (row?.disabled) continue;
        for (const tag of getLoredeckEntryTags(row.entry || {})) {
            const key = tag.toLowerCase();
            if (!map.has(key)) {
                map.set(key, {
                    tag,
                    count: 0,
                    overrideCount: 0,
                    sourceCount: 0,
                    entryIds: [],
                });
            }
            const item = map.get(key);
            item.count += 1;
            if (row.overrideEntry) item.overrideCount += 1;
            else item.sourceCount += 1;
            if (item.entryIds.length < 50) item.entryIds.push(row.id);
        }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function buildLoredeckTagManagerItems(pack, rows = []) {
    const stats = buildLoredeckTagStats(rows);
    const sourceRegistry = getLoredeckCachedSourceTagRegistry(pack?.packId);
    const customRegistry = getLoredeckEmbeddedTagRegistry(pack);
    const map = new Map();

    const ensure = (tag) => {
        const id = normalizeLoredeckTagId(tag);
        if (!id) return null;
        const key = id.toLowerCase();
        if (!map.has(key)) {
            map.set(key, {
                tag: id,
                count: 0,
                overrideCount: 0,
                sourceCount: 0,
                entryIds: [],
                sourceDefined: false,
                customDefined: false,
                sourceDefinition: null,
                customDefinition: null,
                definition: normalizeLoredeckTagDefinition({}, id),
            });
        }
        return map.get(key);
    };

    for (const [tag, def] of Object.entries(sourceRegistry.tags || {})) {
        const item = ensure(tag);
        if (!item) continue;
        item.sourceDefined = true;
        item.sourceDefinition = normalizeLoredeckTagDefinition(def, tag);
    }
    for (const [tag, def] of Object.entries(customRegistry.tags || {})) {
        const item = ensure(tag);
        if (!item) continue;
        item.customDefined = true;
        item.customDefinition = normalizeLoredeckTagDefinition(def, tag);
    }
    for (const stat of stats) {
        const item = ensure(stat.tag);
        if (!item) continue;
        item.count = stat.count || 0;
        item.overrideCount = stat.overrideCount || 0;
        item.sourceCount = stat.sourceCount || 0;
        item.entryIds = stat.entryIds || [];
    }
    for (const item of map.values()) {
        item.definition = mergeLoredeckTagDefinition(item.sourceDefinition || {}, item.customDefinition || {});
        item.registryState = item.customDefined
            ? (item.sourceDefined ? 'custom override' : 'custom')
            : (item.sourceDefined ? 'source' : 'undefined');
    }

    return Array.from(map.values()).sort((a, b) => {
        const aUndefined = !a.sourceDefined && !a.customDefined ? 0 : 1;
        const bUndefined = !b.sourceDefined && !b.customDefined ? 0 : 1;
        return aUndefined - bUndefined
            || (b.count || 0) - (a.count || 0)
            || a.tag.localeCompare(b.tag);
    });
}

function buildMergedLoredeckTagRegistryForExport(pack, rows = []) {
    const registry = { schemaVersion: 1, tags: {} };
    for (const item of buildLoredeckTagManagerItems(pack, rows)) {
        if (!item.sourceDefined && !item.customDefined) continue;
        registry.tags[item.tag] = normalizeLoredeckTagDefinition(item.definition || {}, item.tag);
        delete registry.tags[item.tag].id;
    }
    return registry;
}

function getLoredeckEntryAnchorRefs(entry = {}) {
    const contextGate = entry?.context && typeof entry.context === 'object' && !Array.isArray(entry.context)
        ? entry.context
        : {};
    return normalizeLoredeckPendingTimelineIdList([
        contextGate.anchorId,
        contextGate.validFromAnchor,
        contextGate.validToAnchor,
        contextGate.anchorFrom,
        contextGate.anchorTo,
    ], 12);
}

function buildLoredeckTimelineAttachmentStats(rows = []) {
    const anchorRefs = new Map();
    const entryContexts = [];
    for (const row of rows || []) {
        if (!row?.id || row.disabled) continue;
        const entry = row.entry || {};
        const refs = getLoredeckEntryAnchorRefs(entry);
        for (const ref of refs) {
            if (!anchorRefs.has(ref)) anchorRefs.set(ref, []);
            const list = anchorRefs.get(ref);
            if (list.length < 50) list.push(row.id);
        }
        const contextGate = entry.context && typeof entry.context === 'object' && !Array.isArray(entry.context)
            ? entry.context
            : {};
        entryContexts.push({
            id: row.id,
            from: normalizeLoredeckTimelineId(contextGate.validFromAnchor || contextGate.anchorFrom || ''),
            to: normalizeLoredeckTimelineId(contextGate.validToAnchor || contextGate.anchorTo || ''),
            sortKeyFrom: normalizeLoredeckTimelineNumber(contextGate.sortKeyFrom),
            sortKeyTo: normalizeLoredeckTimelineNumber(contextGate.sortKeyTo),
        });
    }
    return { anchorRefs, entryContexts };
}

function getTimelineWindowEntryRefs(window = {}, stats = {}) {
    const refs = [];
    const anchorFrom = normalizeLoredeckTimelineId(window.anchorFrom);
    const anchorTo = normalizeLoredeckTimelineId(window.anchorTo);
    const sortKeyFrom = normalizeLoredeckTimelineNumber(window.sortKeyFrom);
    const sortKeyTo = normalizeLoredeckTimelineNumber(window.sortKeyTo);
    for (const entry of stats.entryContexts || []) {
        const anchorsMatch = anchorFrom && anchorTo && entry.from === anchorFrom && entry.to === anchorTo;
        const sortsMatch = sortKeyFrom !== null && sortKeyTo !== null && entry.sortKeyFrom === sortKeyFrom && entry.sortKeyTo === sortKeyTo;
        if (anchorsMatch || sortsMatch) refs.push(entry.id);
        if (refs.length >= 50) break;
    }
    return refs;
}

function buildLoredeckTimelineRegistryItems(pack, rows = []) {
    const sourceRegistry = getLoredeckCachedSourceTimelineRegistry(pack?.packId);
    const customRegistry = getLoredeckEmbeddedTimelineRegistry(pack);
    const stats = buildLoredeckTimelineAttachmentStats(rows);
    const map = new Map();

    const ensure = (kind, id) => {
        const cleanId = normalizeLoredeckTimelineId(id);
        if (!cleanId) return null;
        const key = `${kind}:${cleanId}`;
        if (!map.has(key)) {
            map.set(key, {
                kind,
                id: cleanId,
                sourceDefined: false,
                customDefined: false,
                disabled: false,
                sourceDefinition: null,
                customDefinition: null,
                definition: null,
                entryIds: [],
            });
        }
        return map.get(key);
    };

    const disabledAnchors = new Set(customRegistry.disabledAnchorIds || []);
    const disabledWindows = new Set(customRegistry.disabledWindowIds || []);
    for (const anchor of sourceRegistry.anchors || []) {
        const item = ensure('anchor', anchor.id);
        if (!item) continue;
        item.sourceDefined = true;
        item.sourceDefinition = normalizeLoredeckTimelineAnchor(anchor, anchor.id);
        item.disabled = disabledAnchors.has(item.id);
    }
    for (const anchor of customRegistry.anchors || []) {
        const item = ensure('anchor', anchor.id);
        if (!item) continue;
        item.customDefined = true;
        item.customDefinition = normalizeLoredeckTimelineAnchor(anchor, anchor.id);
        item.disabled = disabledAnchors.has(item.id);
    }
    for (const window of sourceRegistry.windows || []) {
        const item = ensure('window', window.id);
        if (!item) continue;
        item.sourceDefined = true;
        item.sourceDefinition = normalizeLoredeckTimelineWindow(window, window.id);
        item.disabled = disabledWindows.has(item.id);
    }
    for (const window of customRegistry.windows || []) {
        const item = ensure('window', window.id);
        if (!item) continue;
        item.customDefined = true;
        item.customDefinition = normalizeLoredeckTimelineWindow(window, window.id);
        item.disabled = disabledWindows.has(item.id);
    }

    for (const item of map.values()) {
        item.definition = item.customDefinition || item.sourceDefinition || (item.kind === 'anchor'
            ? normalizeLoredeckTimelineAnchor({ id: item.id }, item.id)
            : normalizeLoredeckTimelineWindow({ id: item.id }, item.id));
        item.registryState = item.disabled
            ? 'disabled'
            : item.customDefined
                ? (item.sourceDefined ? 'custom override' : 'custom')
                : (item.sourceDefined ? 'source' : 'undefined');
        item.entryIds = item.kind === 'anchor'
            ? (stats.anchorRefs.get(item.id) || [])
            : getTimelineWindowEntryRefs(item.definition, stats);
    }

    const usedAnchorIds = Array.from(stats.anchorRefs.keys());
    for (const id of usedAnchorIds) {
        if (map.has(`anchor:${id}`)) continue;
        const item = ensure('anchor', id);
        if (!item) continue;
        item.definition = normalizeLoredeckTimelineAnchor({ id, label: id }, id);
        item.registryState = 'undefined';
        item.entryIds = stats.anchorRefs.get(id) || [];
    }

    return Array.from(map.values()).sort((a, b) => {
        const kindCompare = a.kind.localeCompare(b.kind);
        if (kindCompare) return kindCompare;
        const aSort = normalizeLoredeckTimelineNumber(a.definition?.sortKey ?? a.definition?.sortKeyFrom) ?? Number.MAX_SAFE_INTEGER;
        const bSort = normalizeLoredeckTimelineNumber(b.definition?.sortKey ?? b.definition?.sortKeyFrom) ?? Number.MAX_SAFE_INTEGER;
        return aSort - bSort || a.id.localeCompare(b.id);
    });
}

function buildMergedLoredeckTimelineRegistryForExport(pack) {
    const sourceRegistry = getLoredeckCachedSourceTimelineRegistry(pack?.packId);
    const customRegistry = getLoredeckEmbeddedTimelineRegistry(pack);
    const merged = normalizeLoredeckTimelineRegistry(mergeLoredeckTimelineRegistries(sourceRegistry, customRegistry));
    const exportRegistry = {
        schemaVersion: merged.schemaVersion,
        timelineMode: merged.timelineMode,
        defaultContextType: merged.defaultContextType,
        sortKeyScale: merged.sortKeyScale,
        summary: merged.summary,
        anchors: merged.anchors || [],
        windows: merged.windows || [],
    };
    if (!exportRegistry.defaultContextType) delete exportRegistry.defaultContextType;
    if (!exportRegistry.summary) delete exportRegistry.summary;
    return exportRegistry;
}

function getLoredeckAssistantTargetRows(rows = [], filteredRows = [], targetScope = 'current_filter') {
    if (targetScope === 'all_loaded') return rows || [];
    const scoped = loredeckEntryOverrideQuery ? filteredRows : rows;
    return scoped || [];
}

function compactLoredeckAssistantEntry(row = {}) {
    const entry = row.entry || {};
    const contextGate = entry.context && typeof entry.context === 'object' && !Array.isArray(entry.context) ? entry.context : {};
    const retrieval = entry.retrieval && typeof entry.retrieval === 'object' && !Array.isArray(entry.retrieval) ? entry.retrieval : {};
    const content = entry.content && typeof entry.content === 'object' && !Array.isArray(entry.content) ? entry.content : {};
    return {
        id: row.id || entry.id || '',
        status: row.status || '',
        title: entry.title || row.id || '',
        category: entry.category || '',
        canon: entry.canon || entry.canonStatus || '',
        relevance: entry.relevance || '',
        priority: Number.isFinite(Number(entry.priority)) ? Number(entry.priority) : null,
        tags: getLoredeckEntryTags(entry).slice(0, 24),
        context: {
            scope: contextGate.scope || '',
            anchorId: contextGate.anchorId || '',
            validFromAnchor: contextGate.validFromAnchor || contextGate.anchorFrom || '',
            validToAnchor: contextGate.validToAnchor || contextGate.anchorTo || '',
            sortKeyFrom: Number.isFinite(Number(contextGate.sortKeyFrom)) ? Number(contextGate.sortKeyFrom) : null,
            sortKeyTo: Number.isFinite(Number(contextGate.sortKeyTo)) ? Number(contextGate.sortKeyTo) : null,
            precision: contextGate.precision || '',
            windowKind: contextGate.windowKind || '',
            label: contextGate.label || '',
        },
        retrieval: {
            activation: retrieval.activation || '',
            frequency: retrieval.frequency || '',
            contextBoost: retrieval.contextBoost || '',
        },
        content: {
            fact: truncateText(content.fact || entry.fact || '', 900),
            injection: truncateText(content.injection || entry.injection || '', 900),
            notes: truncateText(content.notes || entry.notes || '', 500),
        },
    };
}

function buildLoredeckAssistantContext(pack, rows = [], filteredRows = [], options = {}) {
    const targetRows = getLoredeckAssistantTargetRows(rows, filteredRows, options.targetScope);
    const timelineItems = buildLoredeckTimelineRegistryItems(pack, rows);
    const tagItems = buildLoredeckTagManagerItems(pack, rows);
    const context = getLoredeckContext(getState(), pack.packId);
    return {
        instruction: options.instruction || '',
        mode: options.mode || 'mixed',
        targetScope: options.targetScope || 'current_filter',
        pack: {
            packId: pack.packId || '',
            title: pack.title || pack.packId || '',
            type: pack.type || '',
            fandom: pack.fandom || '',
            era: pack.era || '',
            entrySchemaVersion: getExpectedLoredeckEntrySchemaVersion(pack),
        },
        context: {
            label: context?.label || '',
            contextType: context?.contextType || '',
            sceneDate: context?.sceneDate || '',
            anchorId: context?.anchorId || '',
            anchorFrom: context?.anchorFrom || '',
            anchorTo: context?.anchorTo || '',
            arc: context?.arc || '',
            phase: context?.phase || '',
        },
        allowedTimelineAnchorIds: timelineItems
            .filter(item => item.kind === 'anchor' && !item.disabled)
            .map(item => item.id)
            .slice(0, 160),
        knownTags: tagItems
            .map(item => item.tag)
            .filter(Boolean)
            .slice(0, 160),
        targetEntries: targetRows
            .filter(row => row?.id && !row.disabled)
            .slice(0, 60)
            .map(compactLoredeckAssistantEntry),
    };
}

function getLoredeckAssistantDraftChanges(cached = {}) {
    return normalizeLoredeckPendingChanges(cached?.draftChanges);
}

function getLoredeckAssistantSelectedDraftIds(cached = {}) {
    return loredeckAssistantDraftCacheController.getSelectedDraftIds(cached);
}

function getLoredeckAssistantSelectedDraftChanges(cached = {}) {
    const selectedIds = getLoredeckAssistantSelectedDraftIds(cached);
    return getLoredeckAssistantDraftChanges(cached).filter(change => selectedIds.has(change.changeId));
}

function updateLoredeckAssistantDraftCache(packId = '', mutator = null) {
    return loredeckAssistantDraftCacheController.updateRecord(packId, mutator);
}

function setLoredeckAssistantDraftSelection(pack, changeId = '', selected = false, options = {}) {
    if (!String(changeId || '').trim()) return;
    loredeckAssistantDraftCacheController.setDraftSelection(pack.packId, changeId, selected);
    if (options.refresh && !refreshLoredeckAssistantDraftSelectionUi(pack)) {
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    }
}

function setLoredeckAssistantDraftSelectionBulk(pack, mode = 'all') {
    loredeckAssistantDraftCacheController.setDraftSelectionBulk(pack.packId, mode);
    if (!refreshLoredeckAssistantDraftSelectionUi(pack)) {
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    }
}

function refreshLoredeckAssistantDraftSelectionUi(pack) {
    if (typeof document === 'undefined' || !pack?.packId) return false;
    const scope = panelRoot || document;
    const packId = String(pack.packId || '').trim();
    const cached = getLoredeckCreatorDraftCacheForPack(packId);
    const changes = getLoredeckAssistantDraftChanges(cached);
    if (!changes.length) return false;

    let batch = Array.from(scope.querySelectorAll('.saga-loredeck-assistant-draft-batch'))
        .find(element => String(element.dataset.sagaAssistantPackId || '') === packId);
    if (!batch && scope !== document) {
        batch = Array.from(document.querySelectorAll('.saga-loredeck-assistant-draft-batch'))
            .find(element => String(element.dataset.sagaAssistantPackId || '') === packId);
    }
    if (!batch) return false;
    const uiScope = batch.closest('.saga-loredeck-assistant-card, .saga-loredeck-creator-entry-drafts') || batch;

    const selectedIds = getLoredeckAssistantSelectedDraftIds(cached);
    const selectedCount = changes.filter(change => selectedIds.has(change.changeId)).length;
    const allSelected = selectedCount >= changes.length;
    const noneSelected = selectedCount <= 0;

    uiScope.querySelectorAll('.saga-loredeck-assistant-selected-count, .saga-loredeck-assistant-draft-selected-count').forEach(element => {
        element.textContent = `${selectedCount} selected`;
    });

    uiScope.querySelectorAll('[data-saga-assistant-draft-action="queue-selected"], [data-saga-assistant-draft-action="drop-selected"], [data-saga-assistant-draft-action="revise-selected"]').forEach(button => {
        button.disabled = noneSelected;
    });
    uiScope.querySelectorAll('[data-saga-assistant-draft-action="select-all"]').forEach(button => {
        button.disabled = allSelected;
    });
    uiScope.querySelectorAll('[data-saga-assistant-draft-action="clear-selection"]').forEach(button => {
        button.disabled = noneSelected;
    });

    uiScope.querySelectorAll('.saga-loredeck-assistant-draft-row[data-saga-assistant-draft-change-id]').forEach(row => {
        const id = String(row.dataset.sagaAssistantDraftChangeId || '');
        const selected = selectedIds.has(id);
        row.classList.toggle('saga-loredeck-assistant-draft-row-selected', selected);
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = selected;
    });
    return true;
}

function refreshLoredeckAssistantDraftSurfaces() {
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    refreshLoredeckCreatorWorkbenchBody({ preserveScroll: true });
    refreshHeader();
}

async function confirmLoredeckAssistantDraftStorage(label = 'Deck Maker draft review update', options = {}) {
    const result = await flushLoredeckStorageWritesForAction(options);
    if (result.ok !== false) return true;
    toast(`${label} could not be saved to external storage: ${result.error || 'Storage write failed.'}`, 'error');
    return false;
}

function updateLoredeckAssistantDraftAfterRemoval(packId, removedIds = new Set(), queuedCountDelta = 0) {
    const nextCache = updateLoredeckAssistantDraftCache(packId, cached => {
        const changes = getLoredeckAssistantDraftChanges(cached);
        const selectedIds = getLoredeckAssistantSelectedDraftIds(cached);
        for (const id of removedIds) selectedIds.delete(id);
        const remaining = changes.filter(change => !removedIds.has(change.changeId));
        const remainingIds = new Set(remaining.map(change => change.changeId));
        return {
            ...cached,
            draftChanges: remaining,
            selectedDraftChangeIds: [...selectedIds].filter(id => remainingIds.has(id)),
            queuedCount: (Number(cached.queuedCount) || 0) + queuedCountDelta,
            updatedAt: Date.now(),
        };
    });
    syncLoredeckCreatorDraftCacheToJob(packId, nextCache);
    return nextCache;
}

async function queueLoredeckAssistantDraftSelection(pack, selectedIds = new Set()) {
    return await loredeckAssistantDraftHandoffController.queueDraftSelection(pack, selectedIds);
}

async function dropLoredeckAssistantDraftSelection(pack, selectedIds = new Set()) {
    return await loredeckAssistantDraftHandoffController.dropDraftSelection(pack, selectedIds);
}

function compactLoredeckAssistantDraftChangeForRevision(change = {}) {
    const payload = cloneLoredeckJson(change.payload) || {};
    return {
        changeId: change.changeId || '',
        action: change.action || '',
        targetKind: change.targetKind || '',
        title: change.title || '',
        description: truncateText(change.description || '', 900),
        affectedEntryIds: change.affectedEntryIds || [],
        affectedTagIds: change.affectedTagIds || [],
        affectedTimelineIds: change.affectedTimelineIds || [],
        preview: cloneLoredeckJson(change.preview) || {},
        payload,
    };
}

function formatLoredeckAssistantRequestFailureMessage(error = {}, fallbackMessage = 'Lore Assistant request failed.', stageLabel = 'Lore Assistant') {
    const label = formatLoredeckCreatorStageLabel(stageLabel, 'Lore Assistant');
    const code = getLoredeckCreatorFailureCode(error);
    if (code === LORE_RESPONSE_ERROR_CODES.TOKEN_LIMIT || code === 'provider_token_limit') {
        return `${label} hit the provider output limit before Saga received usable JSON. Narrow the instruction or lower the requested output size.`;
    }
    if (code === LORE_RESPONSE_ERROR_CODES.REASONING_ONLY || code === 'provider_reasoning_only') {
        return `${label} returned hidden reasoning but no visible JSON. Use a profile that emits a final answer or lower reasoning effort.`;
    }
    if (code === LORE_RESPONSE_ERROR_CODES.EMPTY_CONTENT || code === 'provider_empty_content') {
        return `${label} returned no visible content. Check the provider output settings and retry.`;
    }
    if (code === GENERATION_ERROR_CODES.JSON_INVALID || code === 'json_invalid') {
        return `${label} returned malformed JSON that Saga could not parse. Narrow the instruction and retry.`;
    }
    const rawMessage = String(error?.message || fallbackMessage || '').trim();
    if (/eval|syntaxerror|unexpected token|unexpected end|invalid json|json/i.test(rawMessage)) {
        return `${label} returned output Saga could not parse. Narrow the instruction and retry.`;
    }
    return rawMessage || `${label} failed.`;
}

function annotateLoredeckAssistantParseError(error = {}) {
    if (error && typeof error === 'object') {
        if (!error.code && !error.errorCode) {
            try { error.code = GENERATION_ERROR_CODES.JSON_INVALID; } catch (_) {}
        }
        return error;
    }
    const wrapped = new Error(String(error || 'Lore Assistant returned invalid JSON.'));
    wrapped.code = GENERATION_ERROR_CODES.JSON_INVALID;
    return wrapped;
}

function warnLoredeckAssistantRequestFailure(error = {}, context = {}) {
    console.warn('[Saga] Lore Assistant request failed:', {
        stage: context.stage || '',
        errorCode: getLoredeckCreatorFailureCode(error) || 'unknown',
        errorName: error?.name || '',
        message: error?.message || '',
        rawMessage: error?.sagaRawMessage || '',
    });
}

async function requestAndParseLoredeckAssistantResponse(context = {}, options = {}) {
    const stage = String(options.stage || 'assistant_draft').trim();
    const stageLabel = String(options.stageLabel || 'Lore Assistant').trim() || 'Lore Assistant';
    let rawResponse = '';
    try {
        rawResponse = await sendLoreRequest(
            buildLoredeckAssistantSystemPrompt(),
            buildLoredeckAssistantUserPrompt(context),
            {
                providerKind: 'lore',
                maxTokens: Number.isFinite(Number(options.maxTokens)) ? Number(options.maxTokens) : 4096,
                expectedOutput: 'json',
                ...(options.requestOptions || {}),
            }
        );
        const responseText = extractLoredeckAssistantResponseText(rawResponse);
        let parsed;
        try {
            parsed = parseLoredeckAssistantResponse(responseText);
        } catch (parseError) {
            throw annotateLoredeckAssistantParseError(parseError);
        }
        return { responseText, parsed };
    } catch (error) {
        const message = formatLoredeckAssistantRequestFailureMessage(error, `${stageLabel} failed.`, stageLabel);
        if (error && typeof error === 'object') {
            if (!error.sagaRawMessage && error.message && error.message !== message) {
                try { error.sagaRawMessage = String(error.message || ''); } catch (_) {}
            }
            try { error.message = message; } catch (_) {}
            warnLoredeckAssistantRequestFailure(error, { stage });
            throw error;
        }
        const wrapped = new Error(message);
        wrapped.sagaRawMessage = String(error || '');
        warnLoredeckAssistantRequestFailure(wrapped, { stage });
        throw wrapped;
    }
}

async function handleLoredeckAssistantDraftRevision(pack, rows = [], filteredRows = [], options = {}, button = null) {
    await runBusyAction(button, 'Revising...', async () => {
        if (!ensureLoreProviderReadyForAction('Lore Assistant', 'lore')) return;
        const instruction = String(options.instruction || '').trim();
        if (!instruction) {
            toast('Enter a revision instruction first.', 'warning');
            return;
        }
        const fresh = getFreshLoredeckLibraryPack(pack.packId, pack);
        if (!fresh || fresh.type === 'bundled') {
            toast('Bundled Loredecks cannot be edited directly. Duplicate as Custom first.', 'warning');
            return;
        }
        const cached = loredeckAssistantDraftCacheController.getRecord(fresh.packId);
        const selected = getLoredeckAssistantSelectedDraftChanges(cached);
        if (!selected.length) {
            toast('Select assistant draft proposals to revise.', 'warning');
            return;
        }
        const selectedIds = new Set(selected.map(change => change.changeId));
        const context = buildLoredeckAssistantContext(fresh, rows, filteredRows, {
            instruction,
            mode: 'revise_draft_batch',
            targetScope: cached.targetScope || loredeckAssistantTargetScope,
        });
        context.task = 'Revise only the selected assistant draft proposals. Return replacement proposals for the selected drafts, not already-applied changes.';
        context.selectedDraftProposals = selected.map(compactLoredeckAssistantDraftChangeForRevision);
        const { parsed } = await requestAndParseLoredeckAssistantResponse(context, {
            stage: 'assistant_draft_revision',
            stageLabel: 'Lore Assistant draft revision',
            maxTokens: 4096,
        });
        const revisedChanges = buildLoredeckAssistantPendingChanges(fresh, parsed.proposals, rows);
        if (parsed.clarifyingQuestions.length && !revisedChanges.length) {
            updateLoredeckAssistantDraftCache(fresh.packId, current => ({
                ...current,
                summary: parsed.summary || current.summary || '',
                questions: parsed.clarifyingQuestions,
                warnings: parsed.warnings,
                warningCodes: parsed.warningCodes || [],
                updatedAt: Date.now(),
            }));
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            toast(`Lore Assistant needs clarification: ${parsed.clarifyingQuestions[0]}`, 'warning');
            return;
        }
        if (!revisedChanges.length) {
            updateLoredeckAssistantDraftCache(fresh.packId, current => ({
                ...current,
                summary: parsed.summary || current.summary || '',
                questions: parsed.clarifyingQuestions,
                warnings: parsed.warnings,
                warningCodes: parsed.warningCodes || [],
                updatedAt: Date.now(),
            }));
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            toast(parsed.warnings[0] || 'Lore Assistant returned no revised proposals.', 'warning');
            return;
        }
        updateLoredeckAssistantDraftCache(fresh.packId, current => {
            const existing = getLoredeckAssistantDraftChanges(current);
            const nextChanges = [];
            let inserted = false;
            for (const change of existing) {
                if (selectedIds.has(change.changeId)) {
                    if (!inserted) {
                        nextChanges.push(...revisedChanges);
                        inserted = true;
                    }
                    continue;
                }
                nextChanges.push(change);
            }
            if (!inserted) nextChanges.push(...revisedChanges);
            return {
                ...current,
                summary: parsed.summary || current.summary || '',
                questions: parsed.clarifyingQuestions,
                warnings: parsed.warnings,
                warningCodes: parsed.warningCodes || [],
                proposalCount: parsed.proposals.length,
                draftChanges: nextChanges,
                selectedDraftChangeIds: revisedChanges.map(change => change.changeId),
                revisedAt: Date.now(),
                updatedAt: Date.now(),
            };
        });
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        toast(`Revised ${selected.length} selected draft proposal${selected.length === 1 ? '' : 's'} into ${revisedChanges.length} proposal${revisedChanges.length === 1 ? '' : 's'}.`, 'success');
    });
}

function openLoredeckAssistantDraftJsonEditor(pack, change = {}) {
    const existing = document.querySelector('.saga-loredeck-assistant-draft-overlay');
    existing?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-assistant-draft-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-entry-override-shell';
    overlay.appendChild(shell);
    const title = document.createElement('div');
    title.className = 'saga-new-lore-title';
    title.textContent = 'Edit Assistant Draft';
    shell.appendChild(title);
    const textarea = document.createElement('textarea');
    textarea.className = 'saga-continuity-json-editor saga-loredeck-assistant-draft-json';
    textarea.spellcheck = false;
    textarea.value = JSON.stringify(change, null, 2);
    addTooltip(textarea, 'Editable pending-change JSON. Save validates the draft record before replacing it in the assistant batch.');
    shell.appendChild(textarea);
    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Save Draft', 'Validate and save this edited assistant draft proposal.', () => {
        try {
            const parsed = JSON.parse(textarea.value || '{}');
            const normalized = normalizeLoredeckPendingChanges([parsed])[0];
            if (!normalized) {
                toast('Edited draft is not a valid pending-change record.', 'warning');
                return;
            }
            const nextCache = updateLoredeckAssistantDraftCache(pack.packId, cached => {
                const wasSelected = getLoredeckAssistantSelectedDraftIds(cached).has(change.changeId);
                const draftChanges = getLoredeckAssistantDraftChanges(cached).map(item => item.changeId === change.changeId ? normalized : item);
                const selectedIds = getLoredeckAssistantSelectedDraftIds({ ...cached, draftChanges });
                selectedIds.delete(change.changeId);
                if (wasSelected) selectedIds.add(normalized.changeId);
                return {
                    ...cached,
                    draftChanges,
                    selectedDraftChangeIds: [...selectedIds],
                    updatedAt: Date.now(),
                };
            });
            syncLoredeckCreatorDraftCacheToJob(pack.packId, nextCache);
            overlay.remove();
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            toast('Assistant draft updated.', 'success');
        } catch (e) {
            toast(e?.message || 'Draft JSON is invalid.', 'error');
        }
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Cancel', 'Close without saving this assistant draft edit.', () => overlay.remove()));
    shell.appendChild(actions);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => textarea.focus());
}

async function handleLoredeckAssistantDraft(pack, rows = [], filteredRows = [], options = {}, button = null) {
    await runBusyAction(button, 'Drafting...', async () => {
        if (!ensureLoreProviderReadyForAction('Lore Assistant', 'lore')) return;
        const instruction = String(options.instruction || '').trim();
        if (!instruction) {
            toast('Enter an assistant instruction first.', 'warning');
            return;
        }
        const fresh = getFreshLoredeckLibraryPack(pack.packId, pack);
        if (!fresh || fresh.type === 'bundled') {
            toast('Bundled Loredecks cannot be edited directly. Duplicate as Custom first.', 'warning');
            return;
        }
        const context = buildLoredeckAssistantContext(fresh, rows, filteredRows, options);
        const { parsed } = await requestAndParseLoredeckAssistantResponse(context, {
            stage: 'assistant_draft',
            stageLabel: 'Lore Assistant draft',
            maxTokens: 4096,
        });
        const changes = buildLoredeckAssistantPendingChanges(fresh, parsed.proposals, rows);
        const qualityWarningCount = countLoredeckAssistantQualityWarningsForChanges(changes);
        loredeckAssistantDraftCacheController.setRecord(fresh.packId, {
            summary: parsed.summary,
            questions: parsed.clarifyingQuestions,
            warnings: parsed.warnings,
            warningCodes: parsed.warningCodes || [],
            proposalCount: parsed.proposals.length,
            queuedCount: 0,
            draftChanges: changes,
            selectedDraftChangeIds: changes.map(change => change.changeId),
            qualityWarningCount,
            mode: options.mode || loredeckAssistantMode,
            targetScope: options.targetScope || loredeckAssistantTargetScope,
            createdAt: Date.now(),
        });
        if (parsed.clarifyingQuestions.length && !changes.length) {
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            toast(`Lore Assistant needs clarification: ${parsed.clarifyingQuestions[0]}`, 'warning');
            return;
        }
        if (!changes.length) {
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            toast(parsed.warnings[0] || 'Lore Assistant returned no supported proposals.', 'warning');
            return;
        }
        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        toast(`Lore Assistant drafted ${changes.length} proposal${changes.length === 1 ? '' : 's'} for batch review.`, 'success');
    });
}

function buildLoredeckAssistantPendingChanges(pack, proposals = [], rows = []) {
    const changes = [];
    const rowById = new Map((rows || []).map(row => [String(row?.id || '').trim(), row]).filter(([id]) => id));
    for (const proposal of proposals || []) {
        const change = buildLoredeckAssistantPendingChange(pack, proposal, rowById);
        if (change) changes.push(change);
        if (changes.length >= 40) break;
    }
    return changes;
}

function buildLoredeckAssistantPendingChange(pack, proposal = {}, rowById = new Map()) {
    if (!proposal?.action) return null;
    if (proposal.action === 'upsert_entry') return buildLoredeckAssistantEntryChange(pack, proposal, rowById);
    if (proposal.action === 'disable_entry' || proposal.action === 'restore_entry') return buildLoredeckAssistantEntryToggleChange(proposal);
    if (proposal.action === 'upsert_tag_definition') return buildLoredeckAssistantTagChange(proposal);
    if (proposal.action === 'upsert_timeline_anchor') return buildLoredeckAssistantTimelineAnchorChange(proposal);
    if (proposal.action === 'upsert_timeline_window') return buildLoredeckAssistantTimelineWindowChange(proposal);
    return null;
}

function countLoredeckAssistantQualityWarningsForChanges(changes = []) {
    return (changes || []).reduce((total, change) => {
        const preview = change?.preview && typeof change.preview === 'object' && !Array.isArray(change.preview) ? change.preview : {};
        return total + (Array.isArray(preview.qualityWarnings) ? preview.qualityWarnings.length : 0);
    }, 0);
}

function normalizeLoredeckAssistantRubricForPreview(rubric = null) {
    if (!rubric || typeof rubric !== 'object' || Array.isArray(rubric)) return null;
    const levelFields = [
        'sceneUtility',
        'activationClarity',
        'behavioralImpact',
        'relationshipImpact',
        'conflictStakes',
        'nonRedundancy',
        'injectionQuality',
        'contextFit',
        'wikiSummaryRisk',
    ];
    const out = {};
    for (const field of levelFields) {
        const level = normalizeLoredeckPendingRubricLevel(rubric[field]);
        if (level) out[field] = level;
    }
    const notes = Array.isArray(rubric.notes)
        ? rubric.notes.map(item => String(item || '').trim()).filter(Boolean).slice(0, 6)
        : [];
    if (notes.length) out.notes = notes;
    const warnings = Array.isArray(rubric.warnings)
        ? rubric.warnings.map(item => String(item || '').trim()).filter(Boolean).slice(0, 6)
        : [];
    if (warnings.length) out.warnings = warnings;
    return Object.keys(out).length ? out : null;
}

function collectLoredeckAssistantLocalQualityWarnings(proposal = {}, entry = null, pack = null) {
    if (proposal.action !== 'upsert_entry' || !entry) return [];
    const warnings = [];
    const content = entry.content && typeof entry.content === 'object' && !Array.isArray(entry.content) ? entry.content : {};
    const contextGate = entry.context && typeof entry.context === 'object' && !Array.isArray(entry.context) ? entry.context : {};
    const title = String(entry.title || proposal.title || '').trim();
    const fact = String(content.fact || entry.fact || '').trim();
    const injection = String(content.injection || entry.injection || '').trim();
    const searchable = `${title} ${fact} ${injection}`;
    if (/\b(biography|summary|overview|profile|facts?|wiki|encyclopedia)\b/i.test(`${title} ${fact}`)) {
        warnings.push('Likely wiki-summary framing; verify it creates playable scene pressure or behavior.');
    }
    if (injection.length > 700) {
        warnings.push('Injection is long; consider tightening it for prompt use.');
    }
    if (!/\b(knows?|hides?|wants?|fears?|expects?|avoids?|reacts?|refuses?|pressures?|threatens?|trusts?|suspects?|believes?|lies?|reveals?|protects?|risks?|obligation|consequence|danger|leverage|taboo|rivalry|pressure|secret|misunderstands?)\b/i.test(searchable)) {
        warnings.push('Behavioral impact is unclear; check that this changes how scenes play.');
    }
    if (getExpectedLoredeckEntrySchemaVersion(pack) >= 3 && !contextGate.scope) {
        warnings.push('Context fit is unclear; schema v3 entries should have a Context scope.');
    }
    if (!getLoredeckEntryTags(entry).length) {
        warnings.push('No tags detected; review retrieval and tag coverage.');
    }
    return [...new Set(warnings)].slice(0, 6);
}

function buildLoredeckAssistantPreviewMeta(proposal = {}, base = {}, entry = null, pack = null) {
    const preview = {
        ...base,
        confidence: proposal.confidence,
        risk: proposal.risk,
    };
    const rubric = normalizeLoredeckAssistantRubricForPreview(proposal.rubric);
    if (rubric) preview.rubric = rubric;
    const localWarnings = collectLoredeckAssistantLocalQualityWarnings(proposal, entry, pack);
    const rubricWarnings = Array.isArray(rubric?.warnings) ? rubric.warnings : [];
    const warnings = [...new Set([...rubricWarnings, ...localWarnings].map(item => String(item || '').trim()).filter(Boolean))].slice(0, 8);
    if (warnings.length) preview.qualityWarnings = warnings;
    return preview;
}

function formatLoredeckAssistantProposalDescription(proposal = {}, fallback = '') {
    const reason = String(proposal.reason || '').trim();
    const rubric = normalizeLoredeckAssistantRubricForPreview(proposal.rubric);
    const notes = Array.isArray(rubric?.notes) ? rubric.notes : [];
    const parts = [reason || fallback, ...notes.map(note => `Rubric: ${note}`)];
    return parts.filter(Boolean).join(' ');
}

function buildLoredeckAssistantEntryChange(pack, proposal = {}, rowById = new Map()) {
    const rawEntry = proposal.entry && typeof proposal.entry === 'object' && !Array.isArray(proposal.entry) ? proposal.entry : null;
    if (!rawEntry) return null;
    const id = normalizeLoredeckEntryId(rawEntry.id || proposal.entryId);
    if (!id) return null;
    const row = rowById.get(id) || null;
    const baseEntry = row?.entry || {};
    const entrySchemaVersion = Math.max(Number(rawEntry.schemaVersion) || 0, Number(baseEntry.schemaVersion) || 0, getExpectedLoredeckEntrySchemaVersion(pack));
    const content = rawEntry.content && typeof rawEntry.content === 'object' && !Array.isArray(rawEntry.content) ? rawEntry.content : {};
    const baseContent = baseEntry.content && typeof baseEntry.content === 'object' && !Array.isArray(baseEntry.content) ? baseEntry.content : {};
    const fact = String(content.fact || rawEntry.fact || baseContent.fact || baseEntry.fact || rawEntry.title || baseEntry.title || id).trim();
    const injection = String(content.injection || rawEntry.injection || baseContent.injection || fact).trim();
    let entry = normalizeLoreEntry({
        ...baseEntry,
        ...rawEntry,
        id,
        title: String(rawEntry.title || baseEntry.title || id).trim(),
        category: rawEntry.category || baseEntry.category || 'other',
        canon: rawEntry.canon || rawEntry.canonStatus || baseEntry.canon || baseEntry.canonStatus || 'au',
        canonStatus: rawEntry.canonStatus || rawEntry.canon || baseEntry.canonStatus || baseEntry.canon || 'au',
        relevance: normalizeLoreRelevance(rawEntry.relevance || baseEntry.relevance || 'normal'),
        priority: Number.isFinite(Number(rawEntry.priority)) ? Number(rawEntry.priority) : (Number(baseEntry.priority) || 50),
        tags: parseLoredeckEntryTags(rawEntry.tags || baseEntry.tags || []),
        source: rawEntry.source || baseEntry.source || `saga-loredeck:${pack.packId}:assistant`,
        content: {
            ...baseContent,
            ...content,
            fact,
            injection,
            notes: String(content.notes || rawEntry.notes || baseContent.notes || '').trim(),
        },
        userEditable: true,
        userEdited: true,
        extensions: {
            ...(baseEntry.extensions || {}),
            ...(rawEntry.extensions || {}),
            sagaLoredeckOverride: {
                kind: row?.sourceEntry ? 'override' : 'addition',
                packId: pack.packId,
                sourceEntryId: row?.sourceEntry?.id || '',
                updatedAt: Date.now(),
                source: 'lore_assistant',
            },
        },
    });
    entry.id = id;
    entry.tags = parseLoredeckEntryTags(rawEntry.tags || baseEntry.tags || []);
    if (entrySchemaVersion >= 3) {
        const contextGate = rawEntry.context || baseEntry.context || {};
        const retrieval = rawEntry.retrieval || baseEntry.retrieval || {};
        const errors = validateLoredeckV3EditorFields(contextGate, retrieval);
        if (errors.length) return null;
        entry = normalizeLoredeckEntryForSchemaV3({
            ...entry,
            id,
            schemaVersion: 3,
            context: contextGate,
            retrieval,
            tags: entry.tags,
        });
        entry.tags = parseLoredeckEntryTags(rawEntry.tags || baseEntry.tags || []);
    }
    return createLoredeckRecordPatchChange({
        source: 'lore_assistant',
        action: 'assistant_upsert_entry',
        targetKind: 'entry',
        title: proposal.title || `Lore Assistant entry: ${entry.title || id}`,
        description: formatLoredeckAssistantProposalDescription(proposal, 'Lore Assistant proposed an entry change.'),
        affectedEntryIds: [id],
        payload: {
            entryOverrides: { [id]: entry },
            disabledEntryIdsRemove: [id],
        },
        preview: buildLoredeckAssistantPreviewMeta(proposal, {
            before: row?.entry?.content?.fact || row?.entry?.fact || '',
            after: entry.content?.fact || entry.fact || entry.title || id,
        }, entry, pack),
    });
}

function buildLoredeckAssistantEntryToggleChange(proposal = {}) {
    const id = String(proposal.entryId || '').trim();
    if (!id) return null;
    const restore = proposal.action === 'restore_entry';
    return createLoredeckRecordPatchChange({
        source: 'lore_assistant',
        action: restore ? 'assistant_restore_entry' : 'assistant_disable_entry',
        targetKind: 'entry',
        title: proposal.title || `${restore ? 'Restore' : 'Disable'} entry: ${id}`,
        description: formatLoredeckAssistantProposalDescription(proposal, `Lore Assistant proposed to ${restore ? 'restore' : 'disable'} this entry.`),
        affectedEntryIds: [id],
        payload: restore ? { disabledEntryIdsRemove: [id] } : { disabledEntryIdsAdd: [id] },
        preview: buildLoredeckAssistantPreviewMeta(proposal, {
            after: restore ? 'Entry will be restored.' : 'Entry will be disabled.',
        }),
    });
}

function buildLoredeckAssistantTagChange(proposal = {}) {
    const rawDef = proposal.tagDefinition && typeof proposal.tagDefinition === 'object' && !Array.isArray(proposal.tagDefinition)
        ? proposal.tagDefinition
        : {};
    const id = normalizeLoredeckTagId(rawDef.id || proposal.tagId);
    if (!id) return null;
    const def = normalizeLoredeckTagDefinition(rawDef, id);
    delete def.id;
    return createLoredeckRecordPatchChange({
        source: 'lore_assistant',
        action: 'assistant_upsert_tag_definition',
        targetKind: 'tag',
        title: proposal.title || `Lore Assistant tag: ${id}`,
        description: formatLoredeckAssistantProposalDescription(proposal, 'Lore Assistant proposed a tag definition.'),
        affectedTagIds: [id],
        payload: {
            tagDefinitions: { [id]: def },
        },
        preview: buildLoredeckAssistantPreviewMeta(proposal, {
            after: def.description || def.label || id,
        }),
    });
}

function buildLoredeckAssistantTimelineAnchorChange(proposal = {}) {
    const rawAnchor = proposal.timelineAnchor && typeof proposal.timelineAnchor === 'object' && !Array.isArray(proposal.timelineAnchor)
        ? proposal.timelineAnchor
        : {};
    const id = normalizeLoredeckTimelineId(rawAnchor.id || proposal.timelineId);
    if (!id) return null;
    const anchor = normalizeLoredeckTimelineAnchor({ ...rawAnchor, id }, id);
    if (!anchor) return null;
    return createLoredeckRecordPatchChange({
        source: 'lore_assistant',
        action: 'assistant_upsert_timeline_anchor',
        targetKind: 'timeline_anchor',
        title: proposal.title || `Lore Assistant anchor: ${id}`,
        description: formatLoredeckAssistantProposalDescription(proposal, 'Lore Assistant proposed a timeline anchor.'),
        affectedTimelineIds: [id],
        payload: {
            timelineAnchors: { [id]: anchor },
            timelineAnchorIdsEnable: [id],
        },
        preview: buildLoredeckAssistantPreviewMeta(proposal, {
            after: anchor.label || id,
        }),
    });
}

function buildLoredeckAssistantTimelineWindowChange(proposal = {}) {
    const rawWindow = proposal.timelineWindow && typeof proposal.timelineWindow === 'object' && !Array.isArray(proposal.timelineWindow)
        ? proposal.timelineWindow
        : {};
    const id = normalizeLoredeckTimelineId(rawWindow.id || proposal.timelineId);
    if (!id) return null;
    const windowDef = normalizeLoredeckTimelineWindow({ ...rawWindow, id }, id);
    if (!windowDef) return null;
    return createLoredeckRecordPatchChange({
        source: 'lore_assistant',
        action: 'assistant_upsert_timeline_window',
        targetKind: 'timeline_window',
        title: proposal.title || `Lore Assistant window: ${id}`,
        description: formatLoredeckAssistantProposalDescription(proposal, 'Lore Assistant proposed a timeline window.'),
        affectedTimelineIds: [id, windowDef.anchorFrom, windowDef.anchorTo].filter(Boolean),
        payload: {
            timelineWindows: { [id]: windowDef },
            timelineWindowIdsEnable: [id],
        },
        preview: buildLoredeckAssistantPreviewMeta(proposal, {
            after: windowDef.label || `${windowDef.anchorFrom || '?'} -> ${windowDef.anchorTo || '?'}`,
        }),
    });
}

function openLoredeckTimelineAnchorDialog(pack, item = null) {
    if (pack.type === 'bundled') {
        toast('Bundled Loredeck timelines are read-only. Duplicate as Custom first.', 'warning');
        return;
    }
    const existing = document.querySelector('.saga-loredeck-timeline-overlay');
    existing?.remove();

    const definition = normalizeLoredeckTimelineAnchor(item?.definition || {}, item?.id || '') || {};
    const isExisting = !!definition?.id;
    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-timeline-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-entry-override-shell';
    overlay.appendChild(shell);

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = isExisting ? 'Edit Timeline Anchor' : 'New Timeline Anchor';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = `${pack.title || pack.packId} | Pending timeline proposal`;
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(createButton('Close', 'Close without saving this timeline anchor.', () => overlay.remove()));
    shell.appendChild(header);

    const form = document.createElement('div');
    form.className = 'saga-new-lore-form saga-loredeck-entry-override-form';
    shell.appendChild(form);

    const idInput = createNewLoreInput(form, 'Anchor ID', 'Stable Context anchor ID.', definition.id || '', false, 'one-piece.arlong_park.nami_breaks_down');
    idInput.disabled = isExisting;
    const labelInput = createNewLoreInput(form, 'Label', 'Human-readable anchor label.', definition.label || '', false, 'Nami asks Luffy for help');
    const sortKeyInput = createNewLoreInput(form, 'Sort Key', 'Numeric order inside this Loredeck timeline.', getLoredeckEntryEditorNumberText(definition.sortKey), false, '1200');
    sortKeyInput.inputMode = 'decimal';

    const grid = appendLoredeckEntryEditorSection(form, 'Coordinates');
    const dateFromInput = createNewLoreInput(grid, 'Date From', 'Optional date/year/stardate lower bound.', definition.dateRange?.from || '', false, '1995-09-01');
    const dateToInput = createNewLoreInput(grid, 'Date To', 'Optional date/year/stardate upper bound.', definition.dateRange?.to || '', false, '1996-06-30');
    const precisionInput = createNewLoreInput(grid, 'Date Precision', 'Optional precision label.', definition.dateRange?.precision || '', false, 'day');
    const arcInput = createNewLoreInput(grid, 'Arc', 'Optional arc label.', definition.arc || '', false, 'Arlong Park');
    const phaseInput = createNewLoreInput(grid, 'Phase', 'Optional phase/saga label.', definition.phase || '', false, 'East Blue Saga');
    const seasonInput = createNewLoreInput(grid, 'Season', 'Optional season number or label.', definition.season || '', false, '1');
    const episodeInput = createNewLoreInput(grid, 'Episode', 'Optional episode number or label.', definition.episode || '', false, '37');
    const chapterInput = createNewLoreInput(grid, 'Chapter', 'Optional chapter/issue number.', definition.chapter || definition.issue || '', false, '81');
    const aliasesInput = createNewLoreInput(form, 'Aliases', 'Comma-separated local resolver aliases.', (definition.aliases || []).join(', '), false, 'help me, Nami cries, Arlong Park climax');
    const tagsInput = createNewLoreInput(form, 'Tags', 'Comma-separated timeline tags.', (definition.tags || []).join(', '), false, 'arc:arlong-park, event:turning-point');
    const notesInput = createNewLoreInput(form, 'Notes', 'Private notes for this timeline anchor.', definition.notes || '', true, 'Why this anchor matters.');

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Queue Anchor', 'Queue this timeline anchor for Pending Review.', () => {
        const id = isExisting ? definition.id : normalizeLoredeckTimelineId(idInput.value);
        if (!id || !labelInput.value.trim()) {
            toast('Timeline anchor needs an ID and label.', 'warning');
            return;
        }
        const sortKey = normalizeLoredeckTimelineNumber(sortKeyInput.value);
        if (sortKey === null) {
            toast('Timeline anchor needs a numeric sort key.', 'warning');
            return;
        }
        const saved = saveLoredeckTimelineAnchorDefinition(pack, {
            id,
            label: labelInput.value.trim(),
            sortKey,
            dateRange: {
                from: dateFromInput.value.trim(),
                to: dateToInput.value.trim(),
                precision: precisionInput.value.trim(),
            },
            arc: arcInput.value.trim(),
            phase: phaseInput.value.trim(),
            season: seasonInput.value.trim(),
            episode: episodeInput.value.trim(),
            chapter: chapterInput.value.trim(),
            aliases: normalizeLoredeckTimelineTextList(aliasesInput.value, 64),
            tags: normalizeLoredeckTimelineTextList(tagsInput.value, 64),
            notes: notesInput.value.trim(),
        }, `Queued timeline anchor ${id}.`);
        if (saved) overlay.remove();
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Cancel', 'Close without saving this timeline anchor.', () => overlay.remove()));
    form.appendChild(actions);

    requestAnimationFrame(() => (isExisting ? labelInput : idInput).focus());
}

function openLoredeckTimelineWindowDialog(pack, item = null) {
    if (pack.type === 'bundled') {
        toast('Bundled Loredeck timelines are read-only. Duplicate as Custom first.', 'warning');
        return;
    }
    const existing = document.querySelector('.saga-loredeck-timeline-overlay');
    existing?.remove();

    const definition = normalizeLoredeckTimelineWindow(item?.definition || {}, item?.id || '') || {};
    const isExisting = !!definition?.id;
    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-timeline-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-entry-override-shell';
    overlay.appendChild(shell);

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = isExisting ? 'Edit Timeline Window' : 'New Timeline Window';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = `${pack.title || pack.packId} | Pending timeline proposal`;
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(createButton('Close', 'Close without saving this timeline window.', () => overlay.remove()));
    shell.appendChild(header);

    const form = document.createElement('div');
    form.className = 'saga-new-lore-form saga-loredeck-entry-override-form';
    shell.appendChild(form);

    const idInput = createNewLoreInput(form, 'Window ID', 'Stable Context window ID.', definition.id || '', false, 'one-piece.arlong_park.full_arc');
    idInput.disabled = isExisting;
    const labelInput = createNewLoreInput(form, 'Label', 'Human-readable timeline window label.', definition.label || '', false, 'Arlong Park Arc');

    const grid = appendLoredeckEntryEditorSection(form, 'Bounds');
    const fromInput = createNewLoreInput(grid, 'From Anchor', 'Starting anchor ID.', definition.anchorFrom || '', false, 'one-piece.arlong_park.arrival');
    const toInput = createNewLoreInput(grid, 'To Anchor', 'Ending anchor ID.', definition.anchorTo || '', false, 'one-piece.arlong_park.departure');
    const sortFromInput = createNewLoreInput(grid, 'Sort From', 'Numeric lower bound for this window.', getLoredeckEntryEditorNumberText(definition.sortKeyFrom), false, '1100');
    const sortToInput = createNewLoreInput(grid, 'Sort To', 'Numeric upper bound for this window.', getLoredeckEntryEditorNumberText(definition.sortKeyTo), false, '1299');
    sortFromInput.inputMode = 'decimal';
    sortToInput.inputMode = 'decimal';
    const dateFromInput = createNewLoreInput(grid, 'Date From', 'Optional date/year/stardate lower bound.', definition.dateRange?.from || '', false, '1995-09-01');
    const dateToInput = createNewLoreInput(grid, 'Date To', 'Optional date/year/stardate upper bound.', definition.dateRange?.to || '', false, '1996-06-30');
    const precisionInput = createNewLoreInput(grid, 'Date Precision', 'Optional precision label.', definition.dateRange?.precision || '', false, 'arc');
    const aliasesInput = createNewLoreInput(form, 'Aliases', 'Comma-separated local resolver aliases.', (definition.aliases || []).join(', '), false, 'Arlong Park, Nami arc');
    const tagsInput = createNewLoreInput(form, 'Tags', 'Comma-separated timeline tags.', (definition.tags || []).join(', '), false, 'arc:arlong-park, saga:east-blue');
    const notesInput = createNewLoreInput(form, 'Notes', 'Private notes for this timeline window.', definition.notes || '', true, 'Window authoring notes.');

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Queue Window', 'Queue this timeline window for Pending Review.', () => {
        const id = isExisting ? definition.id : normalizeLoredeckTimelineId(idInput.value);
        if (!id || !labelInput.value.trim()) {
            toast('Timeline window needs an ID and label.', 'warning');
            return;
        }
        const sortKeyFrom = normalizeLoredeckTimelineNumber(sortFromInput.value);
        const sortKeyTo = normalizeLoredeckTimelineNumber(sortToInput.value);
        if (sortKeyFrom === null || sortKeyTo === null) {
            toast('Timeline window needs numeric sort bounds.', 'warning');
            return;
        }
        if (sortKeyFrom > sortKeyTo) {
            toast('Timeline window sort start cannot be after sort end.', 'warning');
            return;
        }
        const anchorFrom = normalizeLoredeckTimelineId(fromInput.value);
        const anchorTo = normalizeLoredeckTimelineId(toInput.value);
        const saved = saveLoredeckTimelineWindowDefinition(pack, {
            id,
            label: labelInput.value.trim(),
            anchorFrom,
            anchorTo,
            sortKeyFrom,
            sortKeyTo,
            dateRange: {
                from: dateFromInput.value.trim(),
                to: dateToInput.value.trim(),
                precision: precisionInput.value.trim(),
            },
            aliases: normalizeLoredeckTimelineTextList(aliasesInput.value, 64),
            tags: normalizeLoredeckTimelineTextList(tagsInput.value, 64),
            notes: notesInput.value.trim(),
        }, `Queued timeline window ${id}.`);
        if (saved) overlay.remove();
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Cancel', 'Close without saving this timeline window.', () => overlay.remove()));
    form.appendChild(actions);

    requestAnimationFrame(() => (isExisting ? labelInput : idInput).focus());
}

function getLoredeckEditableEntryRows(pack, sourceEntries = []) {
    const state = getLoredeckOverrideState(pack);
    const sourceMap = new Map();
    for (const entry of sourceEntries || []) {
        const id = String(entry?.id || '').trim();
        if (!id || sourceMap.has(id)) continue;
        sourceMap.set(id, entry);
    }

    const ids = new Set([
        ...sourceMap.keys(),
        ...Object.keys(state.overrides),
        ...state.disabledEntryIds,
    ]);
    return Array.from(ids).map(id => {
        const sourceEntry = sourceMap.get(id) || null;
        const overrideEntry = state.overrides[id] || null;
        const disabled = state.disabledSet.has(id);
        const entry = overrideEntry || sourceEntry || { id, title: id };
        const status = disabled
            ? 'disabled'
            : overrideEntry && sourceEntry
                ? 'overridden'
                : overrideEntry
                    ? 'added'
                    : 'source';
        return { id, entry, sourceEntry, overrideEntry, disabled, status };
    }).sort((a, b) => {
        const order = { overridden: 0, added: 1, disabled: 2, source: 3 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9)
            || String(a.entry.title || a.id).localeCompare(String(b.entry.title || b.id));
    });
}

function filterLoredeckEditableEntryRows(rows, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => {
        const entry = row.entry || {};
        return [
            row.id,
            row.status,
            entry.title,
            entry.fact,
            entry.content?.fact,
            entry.content?.injection,
            entry.category,
            entry.canon || entry.canonStatus,
            ...(Array.isArray(entry.tags) ? entry.tags : []),
        ].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
}

function getUniqueLoredeckLibraryFolderTitle(parentId = '', title = '', folders = []) {
    const base = String(title || 'Folder').trim() || 'Folder';
    const siblings = new Set(getLoredeckLibraryFolderSiblingRecords(parentId, folders).map(folder => String(folder.title || '').trim().toLowerCase()));
    if (!siblings.has(base.toLowerCase())) return base;
    for (let index = 2; index < 1000; index += 1) {
        const candidate = `${base} ${index}`;
        if (!siblings.has(candidate.toLowerCase())) return candidate;
    }
    return `${base} ${Date.now()}`;
}

function saveLoredeckLibraryDeckPlacementAssignments(assignments = []) {
    const normalized = (assignments || [])
        .map(item => ({
            deckId: String(item.deckId || item.packId || '').trim(),
            folderId: String(item.folderId || '').trim(),
        }))
        .filter(item => item.deckId);
    if (!normalized.length) return false;
    const { settings, registry } = getMutableLoredeckLibraryRegistry();
    const byId = new Map((Array.isArray(registry.deckPlacements) ? registry.deckPlacements : [])
        .map(item => [String(item.deckId || item.packId || '').trim(), { ...item, deckId: String(item.deckId || item.packId || '').trim() }])
        .filter(([deckId]) => deckId));
    const maxByFolder = new Map();
    for (const placement of byId.values()) {
        const folderId = String(placement.folderId || '').trim();
        maxByFolder.set(folderId, Math.max(maxByFolder.get(folderId) || 0, Number(placement.sortOrder) || 0));
    }
    const now = Date.now();
    for (const assignment of normalized) {
        const maxOrder = maxByFolder.get(assignment.folderId) || 0;
        const sortOrder = Math.max(100, Math.ceil(maxOrder / 100) * 100 + 100);
        maxByFolder.set(assignment.folderId, sortOrder);
        byId.set(assignment.deckId, {
            ...(byId.get(assignment.deckId) || {}),
            deckId: assignment.deckId,
            folderId: assignment.folderId,
            sortOrder,
            updatedAt: now,
        });
    }
    settings.loredeckLibrary = {
        ...registry,
        deckPlacements: [...byId.values()],
    };
    saveSettings(settings);
    return true;
}

function openDuplicateLoredeckDialog(sourcePack) {
    const existing = document.querySelector('.saga-loredeck-duplicate-overlay');
    existing?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-duplicate-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-duplicate-shell';
    overlay.appendChild(shell);

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = 'Duplicate Loredeck';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = 'Creates a Custom Loredeck copy with its own pack ID and metadata.';
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(createButton('Close', 'Close without duplicating this Loredeck.', () => overlay.remove()));
    shell.appendChild(header);

    const form = document.createElement('div');
    form.className = 'saga-new-lore-form saga-loredeck-duplicate-form';
    shell.appendChild(form);

    const source = document.createElement('div');
    source.className = 'saga-loredeck-duplicate-source';
    source.appendChild(createKeyValue('Source', sourcePack.title || sourcePack.packId, 'Loredeck being duplicated.'));
    source.appendChild(createKeyValue('Source ID', sourcePack.packId, 'Original pack ID recorded in derivedFrom metadata.'));
    source.appendChild(createKeyValue('Base Manifest', sourcePack.manifest || 'unset', 'Source manifest used for entry-file resolution.'));
    form.appendChild(source);

    const library = getLoredeckLibrary(getState());
    const suggestedId = getUniqueLoredeckPackId(`${sourcePack.packId}-custom`, library);
    const suggestedTitle = `${sourcePack.title || sourcePack.packId} Custom`;
    const defaultTags = getDefaultDuplicateLoredeckTags(sourcePack);

    const idInput = createNewLoreInput(form, 'Deck ID', 'Stable lowercase ID for the Custom Loredeck. Internally this is stored as packId until the schema alias pass.', suggestedId, false, 'my-custom-loredeck');
    const titleInput = createNewLoreInput(form, 'Title', 'Display title shown in the Loredeck Library and stack.', suggestedTitle, false, 'My Custom Loredeck');
    const descriptionInput = createNewLoreInput(form, 'Description', 'Short description for the Custom Loredeck.', sourcePack.description || '', true, 'Custom AU/crossover copy for my story.');
    const authorInput = createNewLoreInput(form, 'Author', 'Creator shown in pack metadata.', 'User', false, 'User');
    const versionInput = createNewLoreInput(form, 'Version', 'Starting version for the Custom copy.', '1.0.0', false, '1.0.0');
    const tagsInput = createNewLoreInput(form, 'Tags', 'Comma-separated pack tags.', defaultTags.join(', '), false, 'origin:duplicate, quality:user-managed');

    const options = document.createElement('label');
    options.className = 'saga-loredeck-duplicate-option';
    const addToStackInput = document.createElement('input');
    addToStackInput.type = 'checkbox';
    options.appendChild(addToStackInput);
    const optionText = document.createElement('span');
    optionText.textContent = 'Add copy to current Loredeck stack';
    options.appendChild(optionText);
    addTooltip(options, 'Adds the new Custom Loredeck to the active stack after creating it. You can still reorder priority later.');
    form.appendChild(options);

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Create Custom Loredeck', 'Duplicate this pack into the Custom Loredeck Library.', async (btn) => {
        await duplicateLoredeckAsCustom(sourcePack, {
            overlay,
            idInput,
            titleInput,
            descriptionInput,
            authorInput,
            versionInput,
            tagsInput,
            addToStackInput,
        }, btn);
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Cancel', 'Close without duplicating this Loredeck.', () => overlay.remove()));
    form.appendChild(actions);

    requestAnimationFrame(() => idInput.focus());
}

function formatLoredeckBulkDuplicateList(packs = [], limit = 10) {
    const titles = packs
        .map(pack => pack?.title || pack?.packId || '')
        .filter(Boolean);
    const visible = titles.slice(0, limit).map((title, index) => `${index + 1}. ${title}`);
    if (titles.length > limit) visible.push(`...and ${titles.length - limit} more`);
    return visible.join('\n');
}

async function duplicateLoredeckLibraryPacks(packs = [], options = {}) {
    const libraryIndex = getLoredeckLibraryIndexForPacks();
    const created = [];
    const assignments = [];
    const failures = [];
    for (const sourcePack of packs || []) {
        if (!sourcePack?.packId) continue;
        try {
            const currentLibrary = getLoredeckLibrary(getState());
            const packId = getUniqueLoredeckPackId(`${sourcePack.packId}-copy`, currentLibrary);
            const record = await createCustomDuplicateLoredeckRecord(sourcePack, {
                packId,
                title: getLoredeckDuplicateTitle(sourcePack, options.titleSuffix || 'Copy'),
                description: sourcePack.description || '',
                author: 'User',
                version: '1.0.0',
                tags: getDefaultDuplicateLoredeckTags(sourcePack),
            });
            created.push(record);
            const folderId = typeof options.getTargetFolderId === 'function'
                ? String(options.getTargetFolderId(sourcePack, record) || '').trim()
                : getLoredeckLibraryPackFolderId(sourcePack, libraryIndex);
            assignments.push({ deckId: record.packId, folderId });
        } catch (e) {
            failures.push(`${sourcePack.title || sourcePack.packId}: ${e?.message || 'duplicate failed'}`);
        }
    }
    saveLoredeckLibraryDeckPlacementAssignments(assignments);
    return { created, failures };
}

async function duplicateLoredeckLibraryPacksWithConfirm(packsOrIds = []) {
    const library = getLoredeckLibrary(getState());
    const byId = new Map(library.map(pack => [pack.packId, pack]));
    const requested = [];
    const seen = new Set();
    for (const item of packsOrIds || []) {
        const packId = String(typeof item === 'string' ? item : item?.packId || '').trim();
        if (!packId || seen.has(packId)) continue;
        seen.add(packId);
        const pack = byId.get(packId) || (typeof item === 'object' ? item : null);
        if (pack) requested.push(pack);
    }
    if (!requested.length) {
        toast('Select one or more Loredecks before duplicating.', 'warning');
        return false;
    }
    const proceed = await confirmAction(
        'Duplicate selected Loredecks?',
        [
            `Create ${requested.length} editable Custom Loredeck cop${requested.length === 1 ? 'y' : 'ies'}:`,
            formatLoredeckBulkDuplicateList(requested),
            '',
            'Copies keep the same folder placement as their source Loredecks.',
        ].join('\n')
    );
    if (!proceed) return false;
    const result = await duplicateLoredeckLibraryPacks(requested);
    if (result.created.length) {
        setLoredeckLibraryBulkSelection(result.created.map(pack => pack.packId), result.created[0].packId);
        selectLoredeckForDetails(result.created[0].packId, { refresh: false });
        refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
        renderLoredeckLibraryOverlay();
    }
    if (result.failures.length) {
        toast(`Could not duplicate: ${result.failures.slice(0, 2).join('; ')}${result.failures.length > 2 ? '...' : ''}`, 'warning');
    }
    return result.created.length > 0;
}

async function duplicateLoredeckLibraryFolderWithContents(folderId = '') {
    const id = String(folderId || '').trim();
    if (!id || id === 'unfiled') {
        toast('Select a Library folder before duplicating.', 'warning');
        return false;
    }
    const state = getState();
    const library = getLoredeckLibrary(state);
    const libraryIndex = getLoredeckLibraryIndexForPacks(state, library);
    const sourceFolder = (libraryIndex.folders || []).find(folder => folder.id === id);
    if (!sourceFolder) {
        toast('That Library folder is no longer available.', 'warning');
        return false;
    }
    const sourceFolders = (libraryIndex.folders || [])
        .filter(folder => folder.id === id || isLoredeckLibraryFolderDescendant(folder.id, id, libraryIndex))
        .sort((a, b) => getFolderPath(a.id, libraryIndex).length - getFolderPath(b.id, libraryIndex).length || (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    const packs = getLoredeckLibraryFolderPacks(id, library, libraryIndex, { includeNested: true });
    const proceed = await confirmAction(
        'Duplicate folder and contents?',
        [
            `Duplicate "${sourceFolder.title || id}" as a new Library folder.`,
            '',
            `Folders: ${sourceFolders.length}`,
            `Loredecks copied as Custom: ${packs.length}`,
            '',
            packs.length ? formatLoredeckBulkDuplicateList(packs, 8) : 'This folder contains no Loredecks yet.',
        ].join('\n')
    );
    if (!proceed) return false;

    let folders = (libraryIndex.folders || []).map(folder => ({ ...folder }));
    const folderMap = new Map();
    for (const folder of sourceFolders) {
        const parentId = folder.id === id ? String(folder.parentId || '').trim() : String(folderMap.get(folder.parentId) || '').trim();
        const baseTitle = folder.id === id ? getLoredeckDuplicateTitle(folder, 'Copy') : (folder.title || 'Folder');
        const title = getUniqueLoredeckLibraryFolderTitle(parentId, baseTitle, folders);
        const result = createLoredeckLibraryFolderRecord(parentId, title, { ...libraryIndex, folders });
        if (!result.ok) {
            toast(result.error || 'Folder duplicate failed.', 'warning');
            return false;
        }
        folders = result.folders.map(item => item.id === result.folder.id
            ? {
                ...item,
                icon: folder.icon || item.icon,
                color: folder.color || item.color,
                collapsed: folder.collapsed === true,
            }
            : item);
        folderMap.set(folder.id, result.folder.id);
    }
    saveLoredeckLibraryFolderRecords(folders);

    const duplicateResult = await duplicateLoredeckLibraryPacks(packs, {
        titleSuffix: 'Copy',
        getTargetFolderId: sourcePack => {
            const sourceFolderId = getLoredeckLibraryPackFolderId(sourcePack, libraryIndex);
            return folderMap.get(sourceFolderId) || folderMap.get(id) || '';
        },
    });
    const newFolderId = folderMap.get(id) || '';
    setLoredeckLibrarySelectedFolder(newFolderId || 'all', newFolderId || '');
    setLoredeckLibraryBulkSelection(duplicateResult.created.map(pack => pack.packId), duplicateResult.created[0]?.packId || '');
    refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
    renderLoredeckLibraryOverlay();
    if (duplicateResult.failures.length) {
        toast(`Some Loredecks could not be duplicated: ${duplicateResult.failures.slice(0, 2).join('; ')}${duplicateResult.failures.length > 2 ? '...' : ''}`, 'warning');
    }
    return true;
}

function openLoredeckEntryOverrideDialog(pack, row = null) {
    const existing = document.querySelector('.saga-loredeck-entry-override-overlay');
    existing?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-entry-override-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-entry-override-shell';
    overlay.appendChild(shell);

    const sourceEntry = row?.entry || {};
    const isExisting = !!row?.id;
    const entrySchemaVersion = Math.max(
        Number(sourceEntry.schemaVersion) || 0,
        getExpectedLoredeckEntrySchemaVersion(pack)
    );

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = isExisting ? 'Edit Lorecard' : 'New Lorecard';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = `${pack.title || pack.packId} | Pending override proposal`;
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(createButton('Close', 'Close without saving this entry override.', () => overlay.remove()));
    shell.appendChild(header);

    const form = document.createElement('div');
    form.className = 'saga-new-lore-form saga-loredeck-entry-override-form';
    shell.appendChild(form);

    const idInput = createNewLoreInput(form, 'Lorecard ID', 'Stable Lorecard ID inside this Loredeck.', row?.id || '', false, 'my_custom_lorecard');
    idInput.disabled = isExisting;
    const titleInput = createNewLoreInput(form, 'Title', 'Short descriptive title.', sourceEntry.title || '', false, 'Custom Lorecard');
    const factInput = createNewLoreInput(form, 'Lore Text', 'The durable fact, rule, constraint, or state to remember.', sourceEntry.fact || sourceEntry.content?.fact || '', true, 'The durable lore fact to remember.');
    const injectionInput = createNewLoreInput(form, 'Injection Override', 'Optional model-facing phrasing; blank uses Lore Text.', sourceEntry.content?.injection || '', true, 'Optional model-facing wording.');
    const notesInput = createNewLoreInput(form, 'Notes', 'Optional private notes for this override.', sourceEntry.notes || sourceEntry.content?.notes || '', true, 'Why this entry was changed or added.');

    const metaGrid = document.createElement('div');
    metaGrid.className = 'saga-new-lore-meta-grid';
    form.appendChild(metaGrid);
    const categorySelect = createNewLoreSelect(metaGrid, 'Category', getLoreRegistryValues('categories', LORE_CATEGORY_VALUES), sourceEntry.category || 'other');
    const canonSelect = createNewLoreSelect(metaGrid, 'Canon', getLoreRegistryValues('canonStatuses', ['canon', 'au']), sourceEntry.canon || sourceEntry.canonStatus || 'au');
    const relevanceSelect = createNewLoreSelect(metaGrid, 'Relevance', LORE_RELEVANCE_TIERS, sourceEntry.relevance || 'normal', value => RELEVANCE_META[value]?.label || value);
    const prioritySelect = createNewLoreSelect(metaGrid, 'Priority', LORE_PRIORITY_VALUES.map(String), String(sourceEntry.priority || 50));
    const truthSelect = createNewLoreSelect(metaGrid, 'Truth', getLoreRegistryValues('truthStatuses', ['true', 'rumor', 'contested', 'hidden']), sourceEntry.truthStatus || 'true');
    const revealSelect = createNewLoreSelect(metaGrid, 'Reveal', getLoreRegistryValues('revealPolicies', ['private', 'public', 'do_not_reveal']), sourceEntry.revealPolicy || 'private');
    const tagsInput = createNewLoreInput(form, 'Tags', 'Comma-separated tags.', Array.isArray(sourceEntry.tags) ? sourceEntry.tags.join(', ') : '', false, 'au-change, custom-pack');

    let contextFields = null;
    let retrievalFields = null;
    if (entrySchemaVersion >= 3) {
        const sourceContext = sourceEntry.context && typeof sourceEntry.context === 'object' && !Array.isArray(sourceEntry.context) ? sourceEntry.context : {};
        const sourceRetrieval = sourceEntry.retrieval && typeof sourceEntry.retrieval === 'object' && !Array.isArray(sourceEntry.retrieval) ? sourceEntry.retrieval : {};
        const wideContext = sourceContext.scope === 'global' || ['wide', 'series'].includes(String(sourceContext.windowKind || '').trim());

        const contextGrid = appendLoredeckEntryEditorSection(form, 'Context');
        const scopeSelect = createNewLoreSelect(contextGrid, 'Scope', ['window', 'anchor', 'global'], sourceContext.scope || 'window', value => humanizeScopeKey(value));
        const anchorIdInput = createNewLoreInput(contextGrid, 'Anchor ID', 'Optional exact Context anchor ID for anchor-scoped entries.', sourceContext.anchorId || '', false, 'hp.ootp.year_5');
        const validFromAnchorInput = createNewLoreInput(contextGrid, 'From Anchor', 'Optional starting Context anchor ID.', sourceContext.validFromAnchor || sourceContext.anchorFrom || '', false, 'hp.ootp.year_5');
        const validToAnchorInput = createNewLoreInput(contextGrid, 'To Anchor', 'Optional ending Context anchor ID.', sourceContext.validToAnchor || sourceContext.anchorTo || '', false, 'hp.ootp.year_5');
        const sortKeyFromInput = createNewLoreInput(contextGrid, 'Sort From', 'Required numeric Context sort key where this entry starts being eligible.', getLoredeckEntryEditorNumberText(sourceContext.sortKeyFrom), false, '9374');
        const sortKeyToInput = createNewLoreInput(contextGrid, 'Sort To', 'Required numeric Context sort key where this entry stops being eligible.', getLoredeckEntryEditorNumberText(sourceContext.sortKeyTo), false, '9739');
        sortKeyFromInput.inputMode = 'decimal';
        sortKeyToInput.inputMode = 'decimal';
        const precisionInput = createNewLoreInput(contextGrid, 'Precision', 'Required precision label for this Context gate.', sourceContext.precision || '', false, 'anchor_window');
        const windowKindSelect = createNewLoreSelect(contextGrid, 'Window Kind', ['bounded', 'school_year', 'arc', 'phase', 'relative', 'wide', 'series'], sourceContext.windowKind || 'bounded', value => humanizeScopeKey(value));
        const labelInput = createNewLoreInput(contextGrid, 'Context Label', 'Required human-readable Context label.', sourceContext.label || '', false, 'After Year 5 begins');
        contextFields = {
            scopeSelect,
            anchorIdInput,
            validFromAnchorInput,
            validToAnchorInput,
            sortKeyFromInput,
            sortKeyToInput,
            precisionInput,
            windowKindSelect,
            labelInput,
        };
        form.appendChild(createLoredeckEntryAnchorPicker(pack, contextFields));

        const retrievalGrid = appendLoredeckEntryEditorSection(form, 'Retrieval');
        const activationSelect = createNewLoreSelect(retrievalGrid, 'Activation', ['topic_or_entity', 'context_or_topic', 'context_only', 'constant', 'manual'], sourceRetrieval.activation || 'topic_or_entity', value => humanizeScopeKey(value));
        const frequencySelect = createNewLoreSelect(retrievalGrid, 'Frequency', ['low', 'normal', 'high'], sourceRetrieval.frequency || (wideContext ? 'low' : 'normal'), value => humanizeScopeKey(value));
        const contextBoostSelect = createNewLoreSelect(retrievalGrid, 'Context Boost', ['low', 'medium', 'high'], sourceRetrieval.contextBoost || (wideContext ? 'low' : 'medium'), value => humanizeScopeKey(value));
        retrievalFields = {
            activationSelect,
            frequencySelect,
            contextBoostSelect,
        };
    }

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Queue Change', 'Queue this entry override for Pending Review.', () => {
        const id = isExisting ? row.id : normalizeLoredeckEntryId(idInput.value);
        const fact = factInput.value.trim();
        if (!id || !titleInput.value.trim() || !fact) {
            toast('Entry override needs an ID, title, and lore text.', 'warning');
            return;
        }
        const contextGate = buildLoredeckContextFromEditorFields(contextFields);
        const retrieval = buildLoredeckRetrievalFromEditorFields(retrievalFields);
        if (entrySchemaVersion >= 3) {
            const v3Errors = validateLoredeckV3EditorFields(contextGate, retrieval);
            if (v3Errors.length) {
                toast(`Schema v3 entry needs: ${v3Errors.join(', ')}.`, 'warning');
                return;
            }
        }
        let entry = normalizeLoreEntry({
            ...sourceEntry,
            id,
            title: titleInput.value.trim(),
            fact,
            category: categorySelect.value,
            canon: canonSelect.value,
            canonStatus: canonSelect.value,
            relevance: normalizeLoreRelevance(relevanceSelect.value),
            priority: Number(prioritySelect.value) || 50,
            truthStatus: truthSelect.value,
            revealPolicy: revealSelect.value,
            tags: parseLoredeckEntryTags(tagsInput.value),
            ...(entrySchemaVersion >= 3 ? {
                schemaVersion: 3,
                context: contextGate,
                retrieval,
            } : {}),
            source: sourceEntry.source || `saga-loredeck:${pack.packId}:override`,
            sourceInfo: {
                ...(sourceEntry.sourceInfo || {}),
                work: pack.title || pack.packId,
                notes: 'Saved as a Custom Loredeck entry override.',
                confidence: Number(sourceEntry.sourceInfo?.confidence || 1),
            },
            content: {
                ...(sourceEntry.content || {}),
                fact,
                injection: injectionInput.value.trim() || fact,
                notes: notesInput.value.trim(),
            },
            userEditable: true,
            userEdited: true,
            extensions: {
                ...(sourceEntry.extensions || {}),
                sagaLoredeckOverride: {
                    kind: row?.sourceEntry ? 'override' : 'addition',
                    packId: pack.packId,
                    sourceEntryId: row?.sourceEntry?.id || '',
                    updatedAt: Date.now(),
                },
            },
        });
        entry.id = id;
        entry.tags = parseLoredeckEntryTags(tagsInput.value);
        if (entrySchemaVersion >= 3) {
            entry = normalizeLoredeckEntryForSchemaV3({
                ...entry,
                id,
                schemaVersion: 3,
                context: contextGate,
                retrieval,
            });
            entry.tags = parseLoredeckEntryTags(tagsInput.value);
        }
        saveLoredeckEntryOverride(pack, entry);
        overlay.remove();
    }, 'saga-primary-button'));
    if (isExisting) {
        actions.appendChild(createButton(row?.disabled ? 'Restore Entry' : 'Disable Entry', row?.disabled ? 'Restore this entry in the Custom Loredeck.' : 'Suppress this entry in the Custom Loredeck.', () => {
            setLoredeckEntryDisabled(pack, row.id, !row.disabled);
            overlay.remove();
        }));
    }
    actions.appendChild(createButton('Cancel', 'Close without saving this entry override.', () => overlay.remove()));
    form.appendChild(actions);

    requestAnimationFrame(() => (isExisting ? titleInput : idInput).focus());
}

function isLoredeckMalformedTagIssueGroup(group = {}) {
    const codes = new Set(['malformed_tag_namespace', 'malformed_tag_id', 'malformed_tag_reference']);
    if (codes.has(String(group.code || '').trim())) return true;
    return (group.issues || []).some(issue => codes.has(String(issue?.code || '').trim()));
}

function getLoredeckMalformedTagRepairPairs(group = {}) {
    const tags = [];
    const push = (value) => {
        const raw = String(value || '').trim();
        if (raw) tags.push(raw);
    };
    for (const tag of group.tagIds || []) push(tag);
    for (const issue of group.issues || []) {
        for (const tag of collectLoredeckHealthIssueTags(issue)) push(tag);
    }

    const byRaw = new Map();
    for (const from of tags) {
        const to = suggestLoredeckMachineId(from);
        if (!to || to.toLowerCase() === from.toLowerCase()) continue;
        const key = from.toLowerCase();
        if (!byRaw.has(key)) {
            byRaw.set(key, {
                from,
                to,
            });
        }
    }
    return [...byRaw.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

function getLoredeckRawEntryTagsForRepair(entry = {}) {
    const source = Array.isArray(entry?.tags)
        ? entry.tags
        : (entry?.tags ? String(entry.tags).split(/[,;\n\r]+/) : []);
    const tags = [];
    const seen = new Set();
    for (const raw of source) {
        const text = String(raw || '').trim();
        if (!text) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        tags.push(text);
    }
    return tags;
}

function buildLoredeckMalformedTagRepairEntryTags(entry = {}, pairByRawKey = new Map()) {
    const rawTags = getLoredeckRawEntryTagsForRepair(entry);
    const tags = [];
    const seen = new Set();
    let changed = false;
    for (const raw of rawTags) {
        const pair = pairByRawKey.get(raw.toLowerCase());
        const next = pair?.to || normalizeLoredeckTagId(raw);
        if (!next) {
            changed = true;
            continue;
        }
        if (pair && next.toLowerCase() !== raw.toLowerCase()) changed = true;
        const key = next.toLowerCase();
        if (seen.has(key)) {
            changed = true;
            continue;
        }
        seen.add(key);
        tags.push(next);
    }
    return { tags, changed };
}

function getLoredeckResolvedTagDefinitionForRepair(pack = {}, fromTag = '', toTag = '') {
    const target = normalizeLoredeckTagId(toTag);
    const source = normalizeLoredeckTagId(fromTag);
    const custom = getLoredeckEmbeddedTagRegistry(pack);
    const cached = getLoredeckCachedSourceTagRegistry(pack?.packId);
    const def = custom.tags?.[target]
        || cached.tags?.[target]
        || custom.tags?.[source]
        || cached.tags?.[source]
        || null;
    return normalizeLoredeckTagDefinition(def || {
        label: humanizeLoredeckTagId(fromTag),
        description: '',
    }, target);
}

function buildLoredeckMalformedTagRepairPlan(pack = {}, group = {}, sourceEntries = []) {
    const pairs = getLoredeckMalformedTagRepairPairs(group);
    if (!pairs.length) return null;
    const pairByRawKey = new Map(pairs.map(pair => [pair.from.toLowerCase(), pair]));
    const affectedEntryIdSet = new Set(normalizeLoredeckPendingIdList(group.entryIds || []));
    const rows = getLoredeckEditableEntryRows(pack, sourceEntries);
    const entryOverrides = {};
    const entryIds = [];

    for (const row of rows) {
        if (!row?.id || row.disabled) continue;
        const rawTags = getLoredeckRawEntryTagsForRepair(row.entry || {});
        const hasAffectedTag = rawTags.some(tag => pairByRawKey.has(tag.toLowerCase()));
        if (!hasAffectedTag && affectedEntryIdSet.size && !affectedEntryIdSet.has(row.id)) continue;
        if (!hasAffectedTag) continue;
        const repaired = buildLoredeckMalformedTagRepairEntryTags(row.entry || {}, pairByRawKey);
        if (!repaired.changed) continue;
        const entry = buildBulkLoredeckTagOverrideEntry(pack, row, repaired.tags);
        if (!entry.id) continue;
        entryOverrides[entry.id] = entry;
        entryIds.push(entry.id);
    }

    const existingTargetIds = new Set();
    const tagDefinitions = {};
    for (const pair of pairs) {
        const target = normalizeLoredeckTagId(pair.to);
        if (!target || existingTargetIds.has(target.toLowerCase())) continue;
        existingTargetIds.add(target.toLowerCase());
        const existing = getLoredeckPendingCurrentTagDefinition(pack, target);
        if (existing) continue;
        const def = getLoredeckResolvedTagDefinitionForRepair(pack, pair.from, target);
        def.label = def.label || humanizeLoredeckTagId(pair.from);
        def.deprecated = false;
        def.replacement = '';
        delete def.id;
        tagDefinitions[target] = def;
    }

    return {
        pairs,
        entryOverrides,
        entryIds,
        tagDefinitions,
    };
}

async function queueLoredeckMalformedTagRepairFromHealthGroup(pack, group = {}, button = null) {
    await runBusyAction(button, 'Queueing...', async () => {
        const source = getFreshLoredeckLibraryPack(pack.packId, pack);
        if (!source || source.type === 'bundled') {
            toast('Bundled Loredecks cannot be repaired directly. Duplicate as Custom first.', 'warning');
            return;
        }
        const fresh = await hydrateExternalLorepackPayloadRecord(source);
        const validation = await validateLoredeckForEditor(fresh, null, { quiet: true, updateLibrary: false });
        if (!validation.health) throw new Error(validation.error || 'Pack Health validation failed before repair planning.');
        const plan = buildLoredeckMalformedTagRepairPlan(fresh, group, validation.entryCache?.entries || []);
        if (!plan || (!Object.keys(plan.entryOverrides).length && !Object.keys(plan.tagDefinitions).length)) {
            toast('No deterministic malformed tag repair could be queued from this health group.', 'info');
            return;
        }
        const mapping = plan.pairs.map(pair => `${pair.from} -> ${pair.to}`).join(', ');
        const queued = queueLoredeckPendingChange(fresh, createLoredeckRecordPatchChange({
            source: 'attempt_fixing',
            action: 'normalize_malformed_tag_ids',
            targetKind: 'tags',
            title: 'Normalize malformed tag IDs',
            description: `Replaces malformed tag IDs with machine-safe IDs after review. ${plan.entryIds.length} Lorecard${plan.entryIds.length === 1 ? '' : 's'} will receive Custom overrides.`,
            affectedEntryIds: plan.entryIds,
            affectedTagIds: plan.pairs.flatMap(pair => [pair.from, pair.to]),
            payload: {
                tagDefinitions: plan.tagDefinitions,
                entryOverrides: plan.entryOverrides,
                disabledEntryIdsRemove: plan.entryIds,
            },
            preview: {
                before: plan.pairs.map(pair => pair.from).join(', '),
                after: mapping,
                repairMap: plan.pairs,
                healthIssueCode: group.code || 'malformed_tag_namespace',
            },
        }), `Queued malformed tag ID repair for ${plan.pairs.length} tag${plan.pairs.length === 1 ? '' : 's'}. Accept it in Pending Review, then rerun Pack Health.`);
    });
}

function openLoredeckBulkTagsDialog(pack, rows = [], options = {}) {
    const editableRows = getLoredeckEntryRowsForBulk(rows);
    if (!editableRows.length) {
        toast('No editable entries are available for bulk tag editing.', 'warning');
        return;
    }

    const existing = document.querySelector('.saga-loredeck-bulk-tags-overlay');
    existing?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-bulk-tags-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-entry-override-shell';
    overlay.appendChild(shell);

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = 'Bulk Tags';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = `${pack.title || pack.packId} | ${editableRows.length} entr${editableRows.length === 1 ? 'y' : 'ies'}`;
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(createButton('Close', 'Close without applying bulk tag edits.', () => overlay.remove()));
    shell.appendChild(header);

    const form = document.createElement('div');
    form.className = 'saga-new-lore-form saga-loredeck-entry-override-form';
    shell.appendChild(form);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Bulk tag edits create pending Custom override proposals. They do not affect runtime injection until accepted.';
    form.appendChild(help);

    const grid = appendLoredeckEntryEditorSection(form, 'Tag Operation');
    const modeSelect = createNewLoreSelect(grid, 'Mode', ['add', 'remove', 'replace'], options.mode || 'add', value => humanizeScopeKey(value));
    const addInput = createNewLoreInput(grid, 'Tags To Add', 'Comma-separated tags to add in Add mode.', options.addTags || '', false, 'character:hermione-granger, meta:crossover');
    const removeInput = createNewLoreInput(grid, 'Tags To Remove', 'Comma-separated tags to remove in Remove mode.', options.removeTags || '', false, 'deprecated:old-tag');
    const fromInput = createNewLoreInput(grid, 'Rename From', 'Existing tag to rename or delete in Replace mode.', options.fromTag || '', false, 'character:old-name');
    const toInput = createNewLoreInput(grid, 'Rename To', 'Replacement tag in Replace mode. Leave blank to delete Rename From.', options.toTag || '', false, 'character:new-name');

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Queue Tags', 'Queue this tag operation for Pending Review.', () => {
        const mode = modeSelect.value;
        if (mode === 'add' && !parseLoredeckEntryTags(addInput.value).length) {
            toast('Enter at least one tag to add.', 'warning');
            return;
        }
        if (mode === 'remove' && !parseLoredeckEntryTags(removeInput.value).length) {
            toast('Enter at least one tag to remove.', 'warning');
            return;
        }
        if (mode === 'replace' && !parseLoredeckEntryTags([fromInput.value]).length) {
            toast('Enter the tag to rename or delete.', 'warning');
            return;
        }

        const updates = computeLoredeckBulkTagUpdates(pack, editableRows, mode, {
            addTags: addInput.value,
            removeTags: removeInput.value,
            fromTag: fromInput.value,
            toTag: toInput.value,
        });
        if (!updates.length) {
            toast('No tag changes were needed for the target entries.', 'info');
            return;
        }
        const applied = queueLoredeckBulkTagUpdate(pack, {
            mode,
            updates,
            addTags: addInput.value,
            removeTags: removeInput.value,
            fromTag: fromInput.value,
            toTag: toInput.value,
        });
        if (applied) overlay.remove();
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Cancel', 'Close without applying bulk tag edits.', () => overlay.remove()));
    form.appendChild(actions);

    requestAnimationFrame(() => {
        if (options.mode === 'replace') fromInput.focus();
        else if (options.mode === 'remove') removeInput.focus();
        else addInput.focus();
    });
}

function openLoredeckTagRegistryDialog(pack, item = null) {
    if (pack.type === 'bundled') {
        toast('Bundled Loredeck tag registries are read-only. Duplicate as Custom first.', 'warning');
        return;
    }
    const existing = document.querySelector('.saga-loredeck-tag-registry-overlay');
    existing?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-tag-registry-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-entry-override-shell';
    overlay.appendChild(shell);

    const tagId = normalizeLoredeckTagId(item?.tag || '');
    const definition = normalizeLoredeckTagDefinition(item?.definition || {}, tagId);
    const isExisting = !!tagId;

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = isExisting ? 'Edit Tag Definition' : 'New Tag Definition';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = `${pack.title || pack.packId} | Pending tag registry proposal`;
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(createButton('Close', 'Close without saving this tag definition.', () => overlay.remove()));
    shell.appendChild(header);

    const form = document.createElement('div');
    form.className = 'saga-new-lore-form saga-loredeck-entry-override-form';
    shell.appendChild(form);

    const idInput = createNewLoreInput(form, 'Tag ID', 'Stable tag ID used by entries and registries.', tagId, false, 'character:nami');
    idInput.disabled = isExisting;
    const labelInput = createNewLoreInput(form, 'Label', 'Short display label for this tag.', definition.label || humanizeLoredeckTagId(tagId), false, 'Nami');
    const descriptionInput = createNewLoreInput(form, 'Description', 'What this tag groups or signals.', definition.description || '', true, 'Entries about Nami during Arlong Park.');

    const grid = appendLoredeckEntryEditorSection(form, 'Registry Metadata');
    const colorInput = createNewLoreInput(grid, 'Color', 'Optional chip background color.', definition.color || '', false, '#4c1d95');
    const textColorInput = createNewLoreInput(grid, 'Text Color', 'Optional chip text color.', definition.textColor || '', false, '#f3e8ff');
    const aliasesInput = createNewLoreInput(grid, 'Aliases', 'Comma-separated search aliases.', Array.isArray(definition.aliases) ? definition.aliases.join(', ') : '', false, 'Cat Burglar, navigator');
    const parentsInput = createNewLoreInput(grid, 'Parents', 'Comma-separated parent tag IDs.', Array.isArray(definition.parents) ? definition.parents.join(', ') : '', false, 'character:straw-hats');
    const replacementInput = createNewLoreInput(grid, 'Replacement', 'Optional replacement tag ID for deprecated tags.', definition.replacement || '', false, 'character:nami');
    const sensitiveInput = createLoredeckCheckbox(grid, 'Sensitive', 'Mark this tag as sensitive, secret, or spoiler-prone.', definition.sensitive === true);
    const deprecatedInput = createLoredeckCheckbox(grid, 'Deprecated', 'Mark this tag as deprecated while keeping it visible for cleanup.', definition.deprecated === true);

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Queue Definition', 'Queue this tag definition for Pending Review.', () => {
        const id = isExisting ? tagId : normalizeLoredeckTagId(idInput.value);
        if (!id) {
            toast('Enter a valid tag ID.', 'warning');
            return;
        }
        const replacement = normalizeLoredeckTagId(replacementInput.value);
        if (deprecatedInput.checked && replacement && replacement.toLowerCase() === id.toLowerCase()) {
            toast('A deprecated tag replacement must be a different tag.', 'warning');
            return;
        }
        const saved = saveLoredeckTagRegistryDefinition(pack, id, {
            label: labelInput.value.trim() || humanizeLoredeckTagId(id),
            description: descriptionInput.value.trim(),
            color: colorInput.value.trim(),
            textColor: textColorInput.value.trim(),
            aliases: normalizeLoredeckTagTextList(aliasesInput.value, 64, false),
            parents: normalizeLoredeckTagTextList(parentsInput.value, 64, true),
            sensitive: sensitiveInput.checked,
            deprecated: deprecatedInput.checked,
            replacement,
        }, `Saved tag definition for ${id}.`);
        if (saved) overlay.remove();
    }, 'saga-primary-button'));
    if (isExisting && item?.customDefined) {
        actions.appendChild(createButton('Forget Definition', 'Remove this Custom registry definition without changing entry tags.', () => {
            const removed = removeLoredeckTagRegistryDefinition(pack, tagId);
            if (removed) overlay.remove();
        }, 'saga-danger-button'));
    }
    actions.appendChild(createButton('Cancel', 'Close without saving this tag definition.', () => overlay.remove()));
    form.appendChild(actions);

    requestAnimationFrame(() => (isExisting ? labelInput : idInput).focus());
}

function openLoredeckTagRenameDialog(pack, rows = [], item = {}) {
    if (pack.type === 'bundled') {
        toast('Bundled Loredecks cannot be edited directly. Duplicate as Custom first.', 'warning');
        return;
    }
    const fromTag = normalizeLoredeckTagId(item?.tag || '');
    if (!fromTag) {
        toast('Rename needs a source tag.', 'warning');
        return;
    }
    const existing = document.querySelector('.saga-loredeck-tag-rename-overlay');
    existing?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-tag-rename-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-entry-override-shell';
    overlay.appendChild(shell);

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = 'Rename / Merge Tag';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = `${pack.title || pack.packId} | ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} currently use ${fromTag}`;
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(createButton('Close', 'Close without renaming this tag.', () => overlay.remove()));
    shell.appendChild(header);

    const form = document.createElement('div');
    form.className = 'saga-new-lore-form saga-loredeck-entry-override-form';
    shell.appendChild(form);

    const fromInput = createNewLoreInput(form, 'From Tag', 'Existing tag to rename or merge.', fromTag, false, 'character:old-name');
    fromInput.disabled = true;
    const toInput = createNewLoreInput(form, 'To Tag', 'Replacement tag ID. If it already exists, this becomes a merge.', item?.definition?.replacement || '', false, 'character:new-name');
    const updateEntriesInput = createLoredeckCheckbox(form, 'Update entry tags', 'Create Custom overrides that replace this tag on affected entries.', true);
    const deprecatedInput = createLoredeckCheckbox(form, 'Deprecate old tag', 'Keep the old tag definition as deprecated with a replacement pointer.', true);

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Queue Rename', 'Queue this tag rename or merge for Pending Review.', () => {
        const toTag = normalizeLoredeckTagId(toInput.value);
        if (!toTag) {
            toast('Enter a replacement tag.', 'warning');
            return;
        }
        if (toTag.toLowerCase() === fromTag.toLowerCase()) {
            toast('Replacement tag must be different.', 'warning');
            return;
        }
        const updates = updateEntriesInput.checked
            ? computeLoredeckBulkTagUpdates(pack, rows, 'replace', { fromTag, toTag })
            : [];
        const applied = queueLoredeckTagRenameProposal(pack, {
            fromTag,
            toTag,
            item,
            updates,
            deprecateOld: deprecatedInput.checked,
        });
        if (applied) overlay.remove();
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Cancel', 'Close without renaming this tag.', () => overlay.remove()));
    form.appendChild(actions);

    requestAnimationFrame(() => toInput.focus());
}

function buildBulkLoredeckContextOverrideEntry(pack, row, contextGate, retrieval) {
    const baseEntry = row.overrideEntry || row.sourceEntry || row.entry || {};
    const id = String(row.id || baseEntry.id || '').trim();
    const title = String(baseEntry.title || id || 'Lorecard').trim();
    const fact = String(baseEntry.content?.fact || baseEntry.fact || baseEntry.description || baseEntry.detail || title).trim();
    const injection = String(baseEntry.content?.injection || baseEntry.injection || fact).trim();
    let entry = normalizeLoreEntry({
        ...baseEntry,
        id,
        title,
        schemaVersion: 3,
        context: contextGate,
        retrieval,
        tags: getLoredeckEntryTags(baseEntry),
        content: {
            ...(baseEntry.content || {}),
            fact,
            injection,
        },
        userEditable: true,
        userEdited: true,
        extensions: {
            ...(baseEntry.extensions || {}),
            sagaLoredeckOverride: {
                kind: row.sourceEntry ? 'override' : 'addition',
                packId: pack.packId,
                sourceEntryId: row.sourceEntry?.id || '',
                updatedAt: Date.now(),
            },
        },
    });
    entry.id = id;
    entry.tags = getLoredeckEntryTags(baseEntry);
    return normalizeLoredeckEntryForSchemaV3({
        ...entry,
        id,
        schemaVersion: 3,
        context: contextGate,
        retrieval,
        tags: getLoredeckEntryTags(baseEntry),
    });
}

function openLoredeckBulkContextDialog(pack, rows = []) {
    const entrySchemaVersion = getExpectedLoredeckEntrySchemaVersion(pack);
    if (entrySchemaVersion < 3) {
        toast('Bulk Context editing is available for schema v3 Loredecks.', 'warning');
        return;
    }

    const editableRows = (rows || []).filter(row => row?.id && !row.disabled);
    if (!editableRows.length) {
        toast('No editable entries are available for bulk Context editing.', 'warning');
        return;
    }

    const existing = document.querySelector('.saga-loredeck-bulk-context-overlay');
    existing?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'saga-new-lore-overlay saga-loredeck-bulk-context-overlay';
    wireOverlayBackdropClose(overlay, () => overlay.remove());
    document.body.appendChild(overlay);

    const shell = document.createElement('div');
    shell.className = 'saga-new-lore-shell saga-loredeck-entry-override-shell';
    overlay.appendChild(shell);

    const header = document.createElement('div');
    header.className = 'saga-lore-workbench-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'saga-lore-workbench-title-wrap';
    const title = document.createElement('div');
    title.className = 'saga-lore-workbench-title';
    title.textContent = 'Bulk Context';
    titleWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'saga-lore-workbench-subtitle';
    subtitle.textContent = `${pack.title || pack.packId} | ${editableRows.length} entr${editableRows.length === 1 ? 'y' : 'ies'}`;
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);
    header.appendChild(createButton('Close', 'Close without applying bulk Context edits.', () => overlay.remove()));
    shell.appendChild(header);

    const form = document.createElement('div');
    form.className = 'saga-new-lore-form saga-loredeck-entry-override-form';
    shell.appendChild(form);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'This queues Custom override proposals for the chosen entries. Runtime injection is unchanged until the proposals are accepted.';
    form.appendChild(help);

    const contextGrid = appendLoredeckEntryEditorSection(form, 'Context');
    const scopeSelect = createNewLoreSelect(contextGrid, 'Scope', ['window', 'anchor', 'global'], 'window', value => humanizeScopeKey(value));
    const anchorIdInput = createNewLoreInput(contextGrid, 'Anchor ID', 'Optional exact Context anchor ID for anchor-scoped entries.', '', false, 'hp.ootp.year_5');
    const validFromAnchorInput = createNewLoreInput(contextGrid, 'From Anchor', 'Optional starting Context anchor ID.', '', false, 'hp.ootp.year_5');
    const validToAnchorInput = createNewLoreInput(contextGrid, 'To Anchor', 'Optional ending Context anchor ID.', '', false, 'hp.ootp.year_5');
    const sortKeyFromInput = createNewLoreInput(contextGrid, 'Sort From', 'Required numeric Context sort key where these entries start being eligible.', '', false, '9374');
    const sortKeyToInput = createNewLoreInput(contextGrid, 'Sort To', 'Required numeric Context sort key where these entries stop being eligible.', '', false, '9739');
    sortKeyFromInput.inputMode = 'decimal';
    sortKeyToInput.inputMode = 'decimal';
    const precisionInput = createNewLoreInput(contextGrid, 'Precision', 'Required precision label for this Context gate.', 'anchor_window', false, 'anchor_window');
    const windowKindSelect = createNewLoreSelect(contextGrid, 'Window Kind', ['bounded', 'school_year', 'arc', 'phase', 'relative', 'wide', 'series'], 'bounded', value => humanizeScopeKey(value));
    const labelInput = createNewLoreInput(contextGrid, 'Context Label', 'Required human-readable Context label.', '', false, 'After Year 5 begins');
    const contextFields = {
        scopeSelect,
        anchorIdInput,
        validFromAnchorInput,
        validToAnchorInput,
        sortKeyFromInput,
        sortKeyToInput,
        precisionInput,
        windowKindSelect,
        labelInput,
    };
    form.appendChild(createLoredeckEntryAnchorPicker(pack, contextFields));

    const retrievalGrid = appendLoredeckEntryEditorSection(form, 'Retrieval');
    const activationSelect = createNewLoreSelect(retrievalGrid, 'Activation', ['topic_or_entity', 'context_or_topic', 'context_only', 'constant', 'manual'], 'topic_or_entity', value => humanizeScopeKey(value));
    const frequencySelect = createNewLoreSelect(retrievalGrid, 'Frequency', ['low', 'normal', 'high'], 'normal', value => humanizeScopeKey(value));
    const contextBoostSelect = createNewLoreSelect(retrievalGrid, 'Context Boost', ['low', 'medium', 'high'], 'medium', value => humanizeScopeKey(value));
    const retrievalFields = {
        activationSelect,
        frequencySelect,
        contextBoostSelect,
    };

    const actions = createLoredeckActionRow();
    actions.appendChild(createButton('Queue For Review', 'Queue Custom overrides with this Context and retrieval metadata.', () => {
        const contextGate = buildLoredeckContextFromEditorFields(contextFields);
        const retrieval = buildLoredeckRetrievalFromEditorFields(retrievalFields);
        const v3Errors = validateLoredeckV3EditorFields(contextGate, retrieval);
        if (v3Errors.length) {
            toast(`Schema v3 entries need: ${v3Errors.join(', ')}.`, 'warning');
            return;
        }
        const entries = [];
        for (const row of editableRows) {
            const entry = buildBulkLoredeckContextOverrideEntry(pack, row, contextGate, retrieval);
            if (!entry.id) continue;
            entries.push(entry);
        }
        const applied = queueLoredeckBulkContextUpdate(pack, { entries, contextGate });
        if (applied) overlay.remove();
    }, 'saga-primary-button'));
    actions.appendChild(createButton('Cancel', 'Close without applying bulk Context edits.', () => overlay.remove()));
    form.appendChild(actions);

    requestAnimationFrame(() => labelInput.focus());
}

function getFreshLoredeckLibraryPack(packId, fallback = null) {
    const id = String(packId || fallback?.packId || fallback?.id || '').trim();
    const fresh = getLoredeckDefinition(id)
        || (id ? getExternalLoredeckLibraryRegistry()?.packs?.[id] : null);
    const hydratedFresh = fresh ? hydrateCachedExternalLorepackPayloadRecord(fresh) : null;
    if (hydratedFresh && !isCompactExternalLorepackPayloadRecord(hydratedFresh)) return hydratedFresh;
    const hydratedFallback = fallback ? hydrateCachedExternalLorepackPayloadRecord(fallback) : null;
    if (hydratedFallback && !isCompactExternalLorepackPayloadRecord(hydratedFallback)) {
        return {
            ...(hydratedFresh || {}),
            ...hydratedFallback,
            packId: hydratedFallback.packId || hydratedFresh?.packId || id,
            payloadFile: hydratedFresh?.payloadFile || hydratedFallback.payloadFile,
            installedAt: hydratedFresh?.installedAt || hydratedFallback.installedAt,
            revision: hydratedFallback.revision || hydratedFresh?.revision || 1,
        };
    }
    return hydratedFresh || hydratedFallback || fresh || fallback;
}

function failLoredeckLibraryRecordMutation(message = 'Loredeck save failed.', options = {}, toastType = 'error') {
    const text = String(message || options.errorMessage || 'Loredeck save failed.').trim() || 'Loredeck save failed.';
    toast(text, toastType);
    if (options.throwOnFailure === true) {
        const error = new Error(text);
        error.code = options.errorCode || 'loredeck_save_failed';
        throw error;
    }
    return false;
}

function persistLoredeckLibraryRecordMutation(pack, mutator, message, options = {}) {
    const fresh = getFreshLoredeckLibraryPack(pack?.packId, pack);
    if (!fresh || fresh.type === 'bundled') {
        return failLoredeckLibraryRecordMutation('Bundled Loredecks cannot be edited directly. Duplicate as Custom first.', {
            ...options,
            errorCode: 'loredeck_readonly',
        }, 'warning');
    }
    const next = {
        ...fresh,
        entryOverrides: { ...(fresh.entryOverrides || {}) },
        disabledEntryIds: Array.isArray(fresh.disabledEntryIds) ? [...fresh.disabledEntryIds] : [],
        tagRegistry: normalizeLoredeckTagRegistry(fresh.tagRegistry),
        timelineRegistry: normalizeLoredeckTimelineRegistry(fresh.timelineRegistry),
        pendingChanges: normalizeLoredeckPendingChanges(fresh.pendingChanges),
        healthIssueStates: normalizeLoredeckHealthIssueStates(fresh.healthIssueStates),
        localModified: true,
        updatedAt: Date.now(),
    };
    mutator(next);
    const normalizedTagRegistry = normalizeLoredeckTagRegistry(next.tagRegistry);
    if (getLoredeckTagRegistryCount(normalizedTagRegistry)) next.tagRegistry = normalizedTagRegistry;
    else next.tagRegistry = { schemaVersion: 1, tags: {} };
    const normalizedTimelineRegistry = normalizeLoredeckTimelineRegistry(next.timelineRegistry);
    if (getLoredeckTimelineRegistryCount(normalizedTimelineRegistry)) next.timelineRegistry = normalizedTimelineRegistry;
    else next.timelineRegistry = { schemaVersion: 1, timelineMode: 'hybrid', sortKeyScale: 'pack_local', anchors: [], windows: [] };
    const normalizedPendingChanges = normalizeLoredeckPendingChanges(next.pendingChanges);
    if (normalizedPendingChanges.length) next.pendingChanges = normalizedPendingChanges;
    else next.pendingChanges = [];
    const normalizedHealthIssueStates = normalizeLoredeckHealthIssueStates(next.healthIssueStates);
    if (Object.keys(normalizedHealthIssueStates).length) next.healthIssueStates = normalizedHealthIssueStates;
    else next.healthIssueStates = {};
    if (isVirtualLoredeckPack(next)) {
        next.manifestData = buildEmbeddedCustomManifest(next.manifestData, next);
    }
    let result;
    try {
        result = upsertLoredeckLibraryPack(next);
    } catch (error) {
        console.warn('[Saga] Loredeck save failed:', error);
        return failLoredeckLibraryRecordMutation(error?.message || options.errorMessage || 'Loredeck save failed.', options, 'error');
    }
    if (!result.ok) {
        return failLoredeckLibraryRecordMutation(result.error || options.errorMessage || 'Loredeck save failed.', options, 'error');
    }
    if (options.refreshSurfaces !== false) {
        try {
            refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
            refreshOpenLoredeckMetadataEditor(next.packId);
        } catch (error) {
            console.warn('[Saga] Loredeck save succeeded, but surface refresh failed:', error);
        }
    }
    if (message) toast(message, 'success');
    return true;
}

function persistLoredeckEntryLayer(pack, mutator, message) {
    return persistLoredeckLibraryRecordMutation(pack, mutator, message, {
        errorMessage: 'Loredeck entry layer save failed.',
    });
}

function persistLoredeckTagRegistryLayer(pack, mutator, message) {
    return persistLoredeckLibraryRecordMutation(pack, mutator, message, {
        errorMessage: 'Loredeck tag registry save failed.',
    });
}

function refreshOpenLoredeckMetadataEditor(packId = '') {
    if (typeof document === 'undefined') return;
    if (!document.querySelector('.saga-loredeck-metadata-overlay')) return;
    openLoredeckMetadataEditor(packId);
}

function selectLoredeckForDetails(packId, options = {}) {
    const id = String(packId || '').trim();
    if (!id) return;
    if (options.clearFolder !== false) clearLoredeckLibrarySelectedFolderDetails();
    const state = getState();
    if (!state.lorePanel) state.lorePanel = getDefaultState().lorePanel;
    state.lorePanel.selectedLoredeckId = id;
    saveState(state, { syncPrompt: false });
    if (options.refresh !== false) {
        refreshLoredeckSurfaces();
    }
}

async function deleteLoredeckLibraryPackWithConfirm(packOrId) {
    const packId = String(typeof packOrId === 'string' ? packOrId : packOrId?.packId || '').trim();
    if (!packId) {
        toast('Missing Loredeck id.', 'warning');
        return false;
    }
    const pack = getLoredeckDefinition(packId) || (typeof packOrId === 'object' ? packOrId : null) || { packId };
    if (isBundledLoredeckLibraryPack(pack)) {
        toast('Bundled Loredecks are built into Saga and cannot be deleted.', 'warning');
        return false;
    }
    const title = pack.title || packId;
    const stackKey = createLoredeckStackDeckKey(packId);
    const inStack = getLoredeckStack(getState()).some(item => getLoredeckStackItemKey(item) === stackKey);
    const proceed = await confirmAction(
        'Delete Loredeck?',
        `Delete "${title}" from your Loredeck Library?${inStack ? ' It will also be removed from the active stack.' : ''} This cannot be undone unless you import or create it again.`
    );
    if (!proceed) return false;

    if (inStack) {
        commitLoredeckStackMutation(stack => {
            const index = stack.findIndex(item => getLoredeckStackItemKey(item) === stackKey);
            if (index >= 0) stack.splice(index, 1);
        });
    }
    const result = removeLoredeckLibraryPack(packId);
    if (!result.ok) {
        toast(result.error || 'Loredeck could not be deleted.', 'warning');
        return false;
    }
    clearLoredeckCreatorWorkbenchCacheForRemovedJobs(result.clearedCreatorJobIds, packId);

    const state = getState();
    if (state?.lorePanel?.selectedLoredeckId === packId) {
        const nextPack = getLoredeckLibrary().find(item => item.packId !== packId) || null;
        if (!state.lorePanel) state.lorePanel = getDefaultState().lorePanel;
        state.lorePanel.selectedLoredeckId = nextPack?.packId || '';
        saveState(state, { syncPrompt: false });
    }
    loredeckPreviewCacheController.clearPackCaches(packId, { clearDraftCache: true });
    refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
    return true;
}

function isBundledLoredeckLibraryPack(packOrId) {
    const packId = String(typeof packOrId === 'string' ? packOrId : packOrId?.packId || '').trim();
    const pack = typeof packOrId === 'object' ? packOrId : getLoredeckDefinition(packId);
    return pack?.type === 'bundled' || DEFAULT_SETTINGS.loredeckLibrary?.packs?.[packId]?.type === 'bundled';
}

function formatLoredeckBulkDeleteList(packs = [], limit = 10) {
    const titles = packs
        .map(pack => pack?.title || pack?.packId || '')
        .filter(Boolean);
    const visible = titles.slice(0, limit).map((title, index) => `${index + 1}. ${title}`);
    if (titles.length > limit) visible.push(`...and ${titles.length - limit} more`);
    return visible.join('\n');
}

async function deleteLoredeckLibraryPacksWithConfirm(packsOrIds = []) {
    const library = getLoredeckLibrary(getState());
    const byId = new Map(library.map(pack => [pack.packId, pack]));
    const requested = [];
    const seen = new Set();
    for (const item of packsOrIds || []) {
        const packId = String(typeof item === 'string' ? item : item?.packId || '').trim();
        if (!packId || seen.has(packId)) continue;
        seen.add(packId);
        requested.push(byId.get(packId) || (typeof item === 'object' ? item : { packId }));
    }
    const deletable = requested.filter(pack => !isBundledLoredeckLibraryPack(pack));
    const skipped = requested.filter(pack => isBundledLoredeckLibraryPack(pack));
    if (!deletable.length) {
        toast('No selected Custom Loredecks can be deleted.', 'warning');
        return false;
    }
    if (deletable.length === 1 && !skipped.length) {
        return deleteLoredeckLibraryPackWithConfirm(deletable[0]);
    }

    const stack = getLoredeckStack(getState());
    const stackIds = new Set(stack.map(item => getLoredeckStackItemPackId(item)).filter(Boolean));
    const inStack = deletable.filter(pack => stackIds.has(pack.packId));
    const actions = [
        `Delete ${deletable.length} Custom Loredeck${deletable.length === 1 ? '' : 's'} from your Library:`,
        formatLoredeckBulkDeleteList(deletable),
    ];
    if (inStack.length) {
        actions.push(
            '',
            `Remove ${inStack.length} deleted Loredeck${inStack.length === 1 ? '' : 's'} from the active stack:`,
            formatLoredeckBulkDeleteList(inStack),
        );
    }
    if (skipped.length) {
        actions.push(
            '',
            `Skip ${skipped.length} Bundled Loredeck${skipped.length === 1 ? '' : 's'} because Bundled decks are read-only:`,
            formatLoredeckBulkDeleteList(skipped),
        );
    }
    actions.push('', 'This cannot be undone unless you import or create those Loredecks again.');
    const proceed = await confirmAction('Delete selected Loredecks?', actions.join('\n'));
    if (!proceed) return false;

    const deletableIds = new Set(deletable.map(pack => pack.packId));
    if (inStack.length) {
        commitLoredeckStackMutation(stackItems => {
            for (let index = stackItems.length - 1; index >= 0; index -= 1) {
                if (deletableIds.has(getLoredeckStackItemPackId(stackItems[index]))) stackItems.splice(index, 1);
            }
        });
    }

    let deletedCount = 0;
    const failed = [];
    for (const pack of deletable) {
        const result = removeLoredeckLibraryPack(pack.packId);
        if (result.ok) {
            deletedCount += 1;
            clearLoredeckCreatorWorkbenchCacheForRemovedJobs(result.clearedCreatorJobIds, pack.packId);
            loredeckPreviewCacheController.clearPackCaches(pack.packId, { clearDraftCache: true });
        } else {
            failed.push(pack.title || pack.packId);
        }
    }

    const state = getState();
    if (deletableIds.has(state?.lorePanel?.selectedLoredeckId)) {
        const nextPack = getLoredeckLibrary().find(item => !deletableIds.has(item.packId)) || null;
        if (!state.lorePanel) state.lorePanel = getDefaultState().lorePanel;
        state.lorePanel.selectedLoredeckId = nextPack?.packId || '';
        saveState(state, { syncPrompt: false });
    }
    setLoredeckLibraryBulkSelection([], '');
    refreshLoredeckSurfaces({ clearCanon: true, clearContext: true });
    if (failed.length) toast(`Could not delete: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}`, 'warning');
    return deletedCount > 0;
}

function forgetLoredeckLibraryPack(packId) {
    void deleteLoredeckLibraryPackWithConfirm(packId);
}

function getThemeShelfIconItems() {
    return [
        ...Object.entries(TAB_LABELS).map(([tabId, label]) => ({
            key: `tab.${tabId}`,
            legacyKey: tabId,
            tabId,
            label,
            fallback: TAB_ICONS[tabId] || label.slice(0, 1),
            defaultPath: TAB_ICON_PATHS[tabId] || '',
        })),
        {
            key: 'control.collapse',
            legacyKey: 'collapse',
            tabId: '',
            label: 'Collapse',
            fallback: '<',
            defaultPath: '',
        },
    ];
}

function navigateRuntimeTab(tabId, options = {}) {
    const settings = getSettings();
    const activeTab = normalizeTabForExperience(tabId, settings);
    void options;
    if (isRuntimeMobileShell()) {
        toggleRuntimeDrawerForTab(activeTab);
        return true;
    }
    const patch = { activeTab, drawerOpen: true, collapsed: false };
    setPanelState(patch);
    refreshPanelBody({ preserveScroll: false });
    refreshHeader();
    return true;
}

function openAdvancedSettingsTab() {
    setExperienceMode('advanced');
    setPanelState({ activeTab: 'settings' });
    refreshPanelBody({ preserveScroll: false });
    refreshHeader();
}

function getContextAutomationModeLabel(mode = 'manual') {
    const normalized = String(mode || 'manual').toLowerCase();
    if (normalized === 'assisted') return 'Assisted';
    if (normalized === 'automatic') return 'Automatic';
    return 'Manual';
}

function getContextBriefSignalSummary(brief = {}) {
    const signals = brief?.signals || {};
    const values = [
        signals.arc ? `Arc: ${signals.arc}` : '',
        signals.phase ? `Phase: ${signals.phase}` : '',
        signals.season || signals.episode ? `S${signals.season || '?'} E${signals.episode || '?'}` : '',
        signals.chapter ? `Chapter: ${signals.chapter}` : '',
        signals.issue ? `Issue: ${signals.issue}` : '',
        signals.quest ? `Quest: ${signals.quest}` : '',
        signals.gameStage ? `Game: ${signals.gameStage}` : '',
        signals.stardate ? `Stardate: ${signals.stardate}` : '',
        ...(Array.isArray(signals.positionPhrases) ? signals.positionPhrases.slice(0, 2) : []),
        ...(Array.isArray(signals.eventLabels) ? signals.eventLabels.slice(0, 2) : []),
    ].map(value => String(value || '').trim()).filter(Boolean);
    const coordinates = signals.coordinates && typeof signals.coordinates === 'object'
        ? Object.entries(signals.coordinates).slice(0, 3).map(([key, value]) => `${key}: ${value}`)
        : [];
    return [...values, ...coordinates].slice(0, 8).join(' | ') || 'none';
}

function createContextDetectionCard(state) {
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-generation-progress-card';
    markTourTarget(card, 'context.detect.card');

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Context Detection';
    addTooltip(title, 'Detects Context from recent chat and updates the Context Brief plus loaded Loredeck Context rows. It does not create lore entries.');
    card.appendChild(title);

    const settings = getSettings();
    if (!isBasicExperience(settings)) {
        const automationCard = createAutomationModeCard(
            'Context Detection',
            'contextDetectionMode',
            'contextDetectionAutoInterval',
            'Only runs when you click Detect Context.',
            'Runs automatically after roleplay turns on this interval, using recent messages and loaded Loredeck Context candidates.',
            'Automatic Context detection interval in completed model turns.'
        );
        markTourTarget(automationCard, 'context.automation');
        card.appendChild(automationCard);

        const sourceRow = document.createElement('label');
        sourceRow.className = 'saga-slider-row saga-compact-slider-row';
        markTourTarget(sourceRow, 'context.sourceMessages');
        const sourceText = document.createElement('span');
        sourceText.textContent = `Context source messages: ${settings.contextSourceMessageCount || 20}`;
        addTooltip(sourceText, 'How many recent chat messages are sent to Context detection. This is separate from the Lore generation source window.');
        const sourceInput = document.createElement('input');
        sourceInput.type = 'range';
        sourceInput.min = '4';
        sourceInput.max = '200';
        sourceInput.step = '1';
        sourceInput.value = String(settings.contextSourceMessageCount || 20);
        sourceInput.addEventListener('input', () => {
            const next = getSettings();
            next.contextSourceMessageCount = Math.max(4, Math.min(200, parseInt(sourceInput.value, 10) || 20));
            saveSettings(next);
            sourceText.textContent = `Context source messages: ${next.contextSourceMessageCount}`;
        });
        sourceRow.appendChild(sourceText);
        sourceRow.appendChild(sourceInput);
        card.appendChild(sourceRow);
        card.appendChild(createRangeSettingRow(
            'Reasoner fallback',
            'Minimum recent-message character count before automatic Context detection stores Reasoner-backed loaded-deck Context proposals. Manual Ask Reasoner ignores this threshold.',
            'contextModelFallbackMinCharacters',
            { min: 0, max: 8000, fallback: 1200, suffix: ' chars' }
        ));

        appendSettingsResetButton(card, CONTEXT_DETECTION_SETTING_KEYS, 'Context detection settings');
    }

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions saga-generation-actions';
    actions.appendChild(markTourTarget(createButton('Detect Context', 'Analyzes recent messages and updates the Context Brief plus loaded Loredeck Context rows. It does not create lore entries.', async (btn) => {
        await handleDetectStoryContext(btn);
    }, 'saga-primary-button'), 'context.detect'));
    card.appendChild(actions);

    appendGenerationStatus(card, state, 'context');
    card.appendChild(createContextBriefStatusCard(state));
    return card;
}

function getContextBriefStatusLabel(status = {}) {
    const state = String(status?.state || 'idle').toLowerCase();
    switch (state) {
        case 'detected': return 'Detected';
        case 'repaired': return 'Repaired';
        case 'fallback': return 'Local fallback';
        case 'failed': return 'Failed';
        case 'empty': return 'No signal';
        case 'skipped': return 'Skipped';
        case 'idle':
        default:
            return 'Idle';
    }
}

function getContextBriefStatusTone(status = {}) {
    const state = String(status?.state || 'idle').toLowerCase();
    if (state === 'detected') return 'success';
    if (state === 'repaired' || state === 'fallback' || state === 'empty' || state === 'skipped') return 'warning';
    if (state === 'failed') return 'danger';
    return 'muted';
}

function createContextBriefStatusPill(text, tooltip, tone = '') {
    return createStatusPill(text, tooltip, { tone, kind: tone === 'danger' || tone === 'warning' ? 'severity' : 'status' });
}

function createContextBriefStatusCard(state) {
    const basic = isBasicExperience(getSettings());
    const brief = state?.contextBrief || {};
    const status = brief?.status || {};
    const labelText = getContextBriefStatusLabel(status);
    const tone = getContextBriefStatusTone(status);
    const row = document.createElement('div');
    row.className = `saga-lore-context-status saga-context-brief-status saga-context-brief-status-${tone}`;
    markTourTarget(row, 'context.briefStatus');

    const label = document.createElement('div');
    label.className = 'saga-lore-context-status-label';
    label.textContent = 'Detector';
    addTooltip(label, 'Latest top-level Context Brief extraction status. Loredeck Context rows below use this brief plus each loaded deck timeline registry.');
    row.appendChild(label);

    const value = document.createElement('div');
    value.className = 'saga-lore-context-status-value';
    const message = String(status.message || status.error || '').trim();
    value.textContent = message ? `${labelText}: ${message}` : labelText;
    if (tone === 'warning' || tone === 'danger') value.classList.add('saga-warning-text');
    addTooltip(value, status.rawResponsePreview ? `Raw response preview: ${status.rawResponsePreview}` : 'No raw response preview stored.');
    row.appendChild(value);

    const chips = document.createElement('div');
    chips.className = 'saga-loredeck-row-meta saga-context-brief-status-chips';
    chips.appendChild(createContextBriefStatusPill(labelText, 'Detector status from the last Context scan.', tone));
    if (!basic && status.repaired) chips.appendChild(createContextBriefStatusPill('JSON repaired', 'Saga repaired malformed detector JSON before saving the brief.', 'medium'));
    if (!basic && status.fallbackUsed) chips.appendChild(createContextBriefStatusPill('Local fallback', 'Saga inferred Context locally from recent message headings or obvious story-position cues.', 'medium'));
    if (!basic) chips.appendChild(createStatusPill(`Source: ${formatContextSource(brief.source || 'unknown')}`, 'Where the latest Context Brief came from.', { tone: 'source', kind: 'source' }));
    if (!basic) chips.appendChild(createStatusPill(`Evidence: ${(brief.evidence || []).length}`, 'Number of evidence snippets saved in the latest Context Brief.', { kind: 'count' }));
    if (!basic) chips.appendChild(createStatusPill(`Uncertainty: ${brief.uncertainty?.level || 'low'}`, 'Detector uncertainty level from the latest Context Brief.', { tone: String(brief.uncertainty?.level || 'low').toLowerCase() === 'high' ? 'danger' : (String(brief.uncertainty?.level || 'low').toLowerCase() === 'medium' ? 'warning' : 'success'), kind: 'severity' }));
    chips.appendChild(createStatusPill(`Updated: ${formatContextBriefUpdatedAt(brief)}`, 'When the latest Context Brief was saved.', { tone: 'source', kind: 'source' }));
    row.appendChild(chips);

    return row;
}

function toggleLoredeckContextManualLock(packId, locked) {
    setLoredeckContext(packId, {
        manualLock: !!locked,
        source: 'manual',
        updatedAt: Date.now(),
    });
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    refreshHeader();
    refreshContextWorkbench();
}

function createLoreGenerationCard(state) {
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-generation-progress-card saga-lore-generation-card';
    markTourTarget(card, 'lore.generation');

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Generate';
    addTooltip(title, 'Create reviewable Lorecards from manual notes, context-aware canon suggestions, story scans, or Deck Maker drafts before they enter Pending Review.');
    card.appendChild(title);

    card.appendChild(createLoreContextStatusCard(state));

    const actionsGrid = document.createElement('div');
    actionsGrid.className = 'saga-lore-generation-grid';
    actionsGrid.appendChild(createCanonSuggestionPanel(state));
    actionsGrid.appendChild(createStoryLoreGenerationPanel(state));
    actionsGrid.appendChild(createManualLorecardPanel());
    card.appendChild(actionsGrid);
    card.appendChild(createKeyValue(
        'Review flow',
        'Manual notes, story scans, context-aware suggestions, and Deck Maker drafts all wait in Pending Review before acceptance.',
        'Every capture source produces reviewable drafts. Accepted Lorecards become eligible for relevance-tiered injection only after review.'
    ));

    return card;
}

function createManualLorecardPanel() {
    const panel = document.createElement('div');
    panel.className = 'saga-lore-generation-panel saga-manual-lorecard-panel';

    const header = document.createElement('div');
    header.className = 'saga-lore-generation-panel-title';
    header.textContent = 'Manual Lore Note';
    addTooltip(header, 'Create a reviewable Lorecard draft by hand when you already know a fact should be available for future responses.');
    panel.appendChild(header);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Draft a fact yourself, then accept it through Pending Review before it affects prompts.';
    panel.appendChild(help);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions saga-generation-actions';
    actions.appendChild(markTourTarget(createButton('Draft Manual Note', 'Open the Manual Lore Note dialog for a draft that lands in Pending Review.', () => {
        openNewLoreDialog({ basicReview: isBasicExperience(getSettings()) });
    }, 'saga-primary-button'), 'lore.manual.add'));
    panel.appendChild(actions);

    panel.appendChild(createKeyValue('Destination', 'Pending Review', 'Manual notes are reviewed before they become Accepted Lorecards.'));

    return panel;
}

function createLoreContextStatusCard(state) {
    const context = state?.loreContext || {};
    const card = document.createElement('div');
    card.className = 'saga-lore-context-status';
    markTourTarget(card, 'lore.contextStatus');

    const label = document.createElement('div');
    label.className = 'saga-lore-context-status-label';
    label.textContent = 'Context';
    addTooltip(label, 'Legacy canon suggestions use the global Context projection for date-aware canon filtering. Loredeck gates use the loaded Loredeck Context rows in the Context tab.');
    card.appendChild(label);

    const value = document.createElement('div');
    value.className = 'saga-lore-context-status-value';
    if (hasUsableStoryContext(context)) {
        const parts = [context.sceneDate, context.canonBoundary, context.branchId ? `Branch: ${context.branchId}` : '']
            .map(part => String(part || '').trim())
            .filter(Boolean);
        value.textContent = parts.join(' · ') || 'Context detected';
    } else {
        value.textContent = 'No Context';
        value.classList.add('saga-warning-text');
    }
    card.appendChild(value);

    const action = createButton('Refresh Context', 'Runs Detect Context, then returns here. Useful before suggesting canon lore.', async (btn) => {
        await handleDetectStoryContext(btn, { stayOnTab: 'lore' });
    }, 'saga-secondary-button saga-compact-action-button');
    markTourTarget(action, 'lore.contextRefresh');
    card.appendChild(action);

    return card;
}

function createCanonSuggestionPanel(state) {
    const settings = getSettings();
    const db = state?.canonLoreDatabase || {};
    const panel = document.createElement('div');
    panel.className = 'saga-lore-generation-panel saga-canon-suggestion-panel';

    const header = document.createElement('div');
    header.className = 'saga-lore-generation-panel-title';
    header.textContent = 'Suggest Canon Lore';
    addTooltip(header, 'Uses the local Lore Database and current Context to propose date-aware canon constraints. No model call.');
    panel.appendChild(header);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Preview Context Suggestions from local canon packs, choose only the entries you want, then add them to Pending Review. No API/model cost.';
    panel.appendChild(help);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions saga-generation-actions';
    actions.appendChild(markTourTarget(createButton('Preview Canon Packs', 'Queries the local Lore Database and groups matching entries into selectable packs with counts.', async (btn) => {
        await handlePreviewCanonLorePacks(btn);
    }, 'saga-primary-button'), 'lore.canon.preview'));
    actions.appendChild(markTourTarget(createButton('Quick Add Top Matches', `Legacy one-click flow: proposes up to ${settings.canonLoreMaxEntries || 10} top matches into Pending Review.`, async (btn) => {
        await handleSuggestCanonLore(btn);
    }, 'saga-secondary-button'), 'lore.canon.quick'));
    panel.appendChild(actions);

    panel.appendChild(createKeyValue(
        'Source',
        'Context Suggestions',
        'Context-aware canon suggestions enter Pending Review before they become Accepted Lorecards.'
    ));

    panel.appendChild(createCanonPreviewSection(state));

    if (!isBasicExperience(settings)) {
        const advanced = createCollapsibleSection(
            'lore.canonSuggestionSettings',
            'Canon Suggestion Settings',
            settings.canonLoreDatabaseEnabled === false ? 'disabled' : (settings.canonLoreAutoPropose === false ? 'manual' : 'auto after context'),
            false,
            createCanonSuggestionSettingsContent(state),
            { tooltip: 'Low-frequency local canon database settings.' }
        );
        markTourTarget(advanced, 'lore.canon.settings');
        panel.appendChild(advanced);
    }

    appendGenerationStatus(panel, state, 'canon');
    panel.appendChild(createKeyValue('Last query', db.lastQueriedAt ? new Date(db.lastQueriedAt).toLocaleString() : 'never', 'When the local canon database was last queried.'));
    panel.appendChild(createKeyValue('Last result', db.lastStatus || 'Not queried.', 'Summary of the last local canon lore query.'));

    return panel;
}

function createCanonSuggestionSettingsContent(state) {
    const settings = getSettings();
    const content = document.createElement('div');
    content.className = 'saga-canon-suggestion-settings';

    const grid = document.createElement('div');
    grid.className = 'saga-runtime-grid';
    markTourTarget(grid, 'lore.canon.settingsToggles');
    grid.appendChild(createToggleCard(
        'Use Local Canon Database',
        settings.canonLoreDatabaseEnabled !== false,
        'Allows manual previews, quick add, and optional auto-suggest to query local pre-generated canon lore files.',
        (checked) => {
            const next = getSettings();
            next.canonLoreDatabaseEnabled = checked;
            saveSettings(next);
            refreshPanelBody({ preserveScroll: true });
        }
    ));
    grid.appendChild(createToggleCard(
        'Auto-suggest after Context detection',
        settings.canonLoreAutoPropose !== false,
        'When enabled, a Context detection run also performs the quick top-match canon proposal. It does not affect manual previews.',
        (checked) => {
            const next = getSettings();
            next.canonLoreAutoPropose = checked;
            saveSettings(next);
            refreshPanelBody({ preserveScroll: true });
        }
    ));
    content.appendChild(grid);

    const capRow = document.createElement('label');
    capRow.className = 'saga-slider-row saga-compact-slider-row';
    markTourTarget(capRow, 'lore.canon.cap');
    const capText = document.createElement('span');
    capText.textContent = `Quick/auto add cap: ${settings.canonLoreMaxEntries || 10}`;
    addTooltip(capText, 'Maximum entries used only by Quick Add Top Matches and auto-suggest after Context detection. Pack preview counts are not capped by this slider.');
    const capInput = document.createElement('input');
    capInput.type = 'range';
    capInput.min = '1';
    capInput.max = '200';
    capInput.step = '1';
    capInput.value = String(settings.canonLoreMaxEntries || 10);
    capInput.addEventListener('input', () => {
        const next = getSettings();
        next.canonLoreMaxEntries = Math.max(1, Math.min(200, parseInt(capInput.value, 10) || 10));
        saveSettings(next);
        capText.textContent = `Quick/auto add cap: ${next.canonLoreMaxEntries}`;
    });
    capRow.appendChild(capText);
    capRow.appendChild(capInput);
    content.appendChild(capRow);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Auto-suggest runs only when Context detection runs. With the default automatic context interval, that is interval-based, not every message. Manual pack preview can be run any time.';
    content.appendChild(help);
    return content;
}

function getCanonPreviewContextKey(context = {}, state = getState()) {
    const activeContextParts = getEnabledLoredeckStackPackIds(state).map(packId => {
        const row = state?.loredeckContexts?.[packId] || {};
        return [
            packId,
            row.sceneDate || '',
            row.subjectiveDate || '',
            row.stardate || '',
            row.anchorId || '',
            row.anchorFrom || '',
            row.anchorTo || '',
            row.arc || '',
            row.phase || '',
            row.season || '',
            row.episode || '',
            row.chapter || '',
            row.issue || '',
            row.quest || '',
            row.gameStage || '',
            row.contextSortKey ?? '',
            row.contextSortKeyFrom ?? '',
            row.contextSortKeyTo ?? '',
        ].map(value => String(value || '').trim()).join(':');
    });
    return [
        context.sceneDate || '',
        context.subjectiveDate || '',
        context.canonBoundary || '',
        context.branchId || '',
        context.timeTravelMode || '',
        context.stardate || '',
        context.anchorId || '',
        context.anchorFrom || '',
        context.anchorTo || '',
        context.arc || '',
        context.phase || '',
        context.season || '',
        context.episode || '',
        context.chapter || '',
        context.issue || '',
        context.quest || '',
        context.gameStage || '',
        ...activeContextParts,
    ].map(value => String(value || '').trim()).join('|');
}

function getCanonPreviewSelectedIds() {
    return new Set(Array.isArray(canonPreviewUiState.selectedEntryIds) ? canonPreviewUiState.selectedEntryIds : []);
}

function setCanonPreviewSelectedIds(ids = []) {
    canonPreviewUiState.selectedEntryIds = Array.from(new Set((ids || []).map(id => String(id || '')).filter(Boolean)));
}

function openPendingLoreReviewSections() {
    setSectionCollapsed('lore.pendingReview', false);
}

function getCanonPreviewEntrySummary(entry = {}) {
    const content = entry.content || {};
    return content.injection
        || content.fact
        || entry.fact
        || (Array.isArray(content.constraints) ? content.constraints[0] : '')
        || (Array.isArray(content.antiLore) ? content.antiLore[0] : '')
        || '';
}

function getCanonPreviewEntryMap(preview = null) {
    return new Map((preview?.entries || []).map(entry => [String(entry.id || ''), entry]));
}

function isCanonPreviewEntryAddable(entry = {}) {
    return (entry.extensions?.canonPreview?.duplicateStatus || 'new') === 'new';
}

const CANON_PREVIEW_DETAIL_LEVELS = [
    { id: 'core', label: 'Core', tooltip: 'Only highest-value active guardrails and reveal blockers.' },
    { id: 'standard', label: 'Standard', tooltip: 'Core plus normal character, access, and constraint entries.' },
    { id: 'detailed', label: 'Detailed', tooltip: 'Includes low-priority and micro constraints that are still active.' },
    { id: 'all', label: 'All Active', tooltip: 'Shows every active non-reference entry in each pack.' },
];

function getCanonPreviewDetailLevel() {
    return ['core', 'standard', 'detailed', 'all'].includes(canonPreviewUiState.detailLevel)
        ? canonPreviewUiState.detailLevel
        : 'standard';
}

function getCanonPreviewDetailRank(level) {
    const normalized = String(level || '').toLowerCase();
    if (normalized === 'core') return 1;
    if (normalized === 'standard') return 2;
    if (normalized === 'detailed') return 3;
    return 4;
}

function getCanonPreviewEntryDetailLevel(entry = {}) {
    const level = entry.extensions?.canonPreview?.detailLevel || 'standard';
    return ['core', 'standard', 'detailed'].includes(level) ? level : 'standard';
}

function canonPreviewDetailAllows(entry = {}, detailLevel = getCanonPreviewDetailLevel()) {
    if (detailLevel === 'all') return true;
    return getCanonPreviewDetailRank(getCanonPreviewEntryDetailLevel(entry)) <= getCanonPreviewDetailRank(detailLevel);
}

function getCanonPreviewActivePack(preview = canonPreviewUiState.preview) {
    const packs = Array.isArray(preview?.packs) ? preview.packs : [];
    return packs.find(pack => pack.id === canonPreviewUiState.selectedPackId)
        || packs.find(pack => pack.newCount > 0)
        || packs[0]
        || null;
}

function isCanonPreviewStale(state = getState()) {
    const preview = canonPreviewUiState.preview;
    if (!preview || !canonPreviewUiState.contextKey) return false;
    return canonPreviewUiState.contextKey !== getCanonPreviewContextKey(getCanonSuggestionContext(state), state);
}

function refreshCanonPreviewSelectionUi() {
    if (typeof document === 'undefined') return false;
    const section = panelRoot?.querySelector?.('.saga-canon-preview-section') || document.querySelector('.saga-canon-preview-section');
    const preview = canonPreviewUiState.preview;
    if (!section || !preview) return false;

    const state = getState();
    const stale = isCanonPreviewStale(state);
    const detailLevel = getCanonPreviewDetailLevel();
    const entryMap = getCanonPreviewEntryMap(preview);
    const activePack = getCanonPreviewActivePack(preview);
    const packEntries = (activePack?.entryIds || [])
        .map(id => entryMap.get(String(id)))
        .filter(Boolean)
        .filter(entry => canonPreviewDetailAllows(entry, detailLevel));
    const addablePackIds = packEntries.filter(isCanonPreviewEntryAddable).map(entry => String(entry.id || '')).filter(Boolean);
    const selectedIds = getCanonPreviewSelectedIds();
    const selectedAddableCount = Array.from(selectedIds)
        .filter(id => isCanonPreviewEntryAddable(entryMap.get(String(id)) || {}))
        .length;

    const count = section.querySelector('.saga-canon-preview-selected-count');
    if (count) {
        const text = `${selectedAddableCount} selected`;
        count.textContent = text;
        count.dataset.sagaTooltip = 'Canon preview entries selected for Pending Review.';
        count.setAttribute('aria-label', 'Canon preview entries selected for Pending Review.');
        setChipTone(count, selectedAddableCount ? 'selected' : 'muted');
    }

    const addSelected = section.querySelector('[data-saga-canon-preview-action="add-selected"]');
    if (addSelected) addSelected.disabled = stale || selectedAddableCount <= 0;
    const addPack = section.querySelector('[data-saga-canon-preview-action="add-pack"]');
    if (addPack) addPack.disabled = stale || addablePackIds.length <= 0;

    section.querySelectorAll('.saga-canon-preview-row[data-canon-preview-entry-id]').forEach(row => {
        const id = String(row.dataset.canonPreviewEntryId || '');
        const selected = selectedIds.has(id);
        row.classList.toggle('saga-canon-preview-row-selected', selected);
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = selected;
    });
    return true;
}

function createCanonPreviewDetailControls() {
    const active = getCanonPreviewDetailLevel();
    const wrap = document.createElement('div');
    wrap.className = 'saga-canon-detail-filter';
    CANON_PREVIEW_DETAIL_LEVELS.forEach(option => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `saga-canon-detail-button ${active === option.id ? 'saga-canon-detail-active' : ''}`.trim();
        btn.textContent = option.label;
        addTooltip(btn, option.tooltip);
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            canonPreviewUiState.detailLevel = option.id;
            refreshPanelBody({ preserveScroll: true });
        });
        wrap.appendChild(btn);
    });
    return wrap;
}

function createCanonPreviewSection(state) {
    const section = document.createElement('div');
    section.className = 'saga-canon-preview-section';
    markTourTarget(section, 'lore.canon.previewResults');
    const preview = canonPreviewUiState.preview;
    const activeStackIds = getEnabledLoredeckStackPackIds(state);
    const currentContext = getCanonSuggestionContext(state);
    const currentContextKey = getCanonPreviewContextKey(currentContext, state);
    const isStale = !!(preview && canonPreviewUiState.contextKey && canonPreviewUiState.contextKey !== currentContextKey);

    if (!activeStackIds.length) {
        section.appendChild(createEmptyMessage('No active Loredecks are loaded. Open the Loredeck Library and add one or more decks to the active stack before previewing canon Lorecards.'));
        return section;
    }

    if (!preview) {
        section.appendChild(createEmptyMessage('No canon pack preview yet. Preview packs to choose entries before adding them to Pending Review.'));
        return section;
    }

    if (preview.status === 'disabled') {
        section.appendChild(createEmptyMessage('The local canon database is disabled in Canon Suggestion Settings.'));
        return section;
    }
    if (preview.status === 'no_date') {
        section.appendChild(createEmptyMessage('No parseable Scene date. Detect or enter Context before previewing canon packs.'));
        return section;
    }
    if (preview.status === 'no_context') {
        section.appendChild(createEmptyMessage('No Context is available for the active Loredecks. Use the Context tab or Detect Context before previewing canon packs.'));
        return section;
    }
    if (!preview.entries?.length) {
        section.appendChild(createEmptyMessage('No canon database entries matched this Context.'));
        return section;
    }

    const summary = document.createElement('div');
    summary.className = 'saga-canon-preview-summary';
    const yearText = preview.schoolYear ? `Year ${preview.schoolYear} | ` : '';
    const contextLabel = preview.sceneIso || currentContext.canonBoundary || currentContext.label || currentContext.anchorId || currentContext.arc || currentContext.chapter || currentContext.stardate || 'active Context';
    summary.textContent = `${yearText}${contextLabel} | ${preview.matchedCount || preview.entries.length} matches | ${preview.newCount || 0} new | ${preview.duplicateCount || 0} already present`;
    section.appendChild(summary);
    section.appendChild(markTourTarget(createCanonPreviewDetailControls(), 'lore.canon.detailFilter'));

    if (isStale) {
        const stale = document.createElement('div');
        stale.className = 'saga-runtime-help saga-warning-text';
        stale.textContent = 'This preview was built for earlier Context. Refresh Canon Packs before adding entries.';
        section.appendChild(stale);
    }

    const packs = Array.isArray(preview.packs) ? preview.packs : [];
    const detailLevel = getCanonPreviewDetailLevel();
    const entryMap = getCanonPreviewEntryMap(preview);
    const activePack = packs.find(pack => pack.id === canonPreviewUiState.selectedPackId)
        || packs.find(pack => pack.newCount > 0)
        || packs[0]
        || null;
    if (activePack && canonPreviewUiState.selectedPackId !== activePack.id) {
        canonPreviewUiState.selectedPackId = activePack.id;
    }

    const packGrid = document.createElement('div');
    packGrid.className = 'saga-canon-pack-grid';
    markTourTarget(packGrid, 'lore.canon.packGrid');
    packs.forEach(pack => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `saga-canon-pack-button ${pack.id === activePack?.id ? 'saga-canon-pack-active' : ''}`.trim();
        addTooltip(btn, pack.description || 'Canon preview pack.');
        const packEntriesForDetail = (pack.entryIds || [])
            .map(id => entryMap.get(String(id)))
            .filter(Boolean)
            .filter(entry => canonPreviewDetailAllows(entry, detailLevel));
        const packNewForDetail = packEntriesForDetail.filter(isCanonPreviewEntryAddable).length;

        const label = document.createElement('span');
        label.className = 'saga-canon-pack-label';
        label.textContent = `${pack.label} (${packEntriesForDetail.length})`;
        btn.appendChild(label);

        const meta = document.createElement('span');
        meta.className = 'saga-canon-pack-meta';
        meta.textContent = `${packNewForDetail} new${packEntriesForDetail.length !== (pack.totalCount || 0) ? ` of ${pack.totalCount || 0}` : ''}${pack.duplicateCount ? `, ${pack.duplicateCount} present` : ''}`;
        btn.appendChild(meta);

        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            canonPreviewUiState.selectedPackId = pack.id;
            refreshPanelBody({ preserveScroll: true });
        });
        packGrid.appendChild(btn);
    });
    section.appendChild(packGrid);

    if (!activePack) {
        section.appendChild(createEmptyMessage('No canon packs are available for this preview.'));
        return section;
    }

    const packEntriesAll = (activePack.entryIds || []).map(id => entryMap.get(String(id))).filter(Boolean);
    const packEntries = packEntriesAll.filter(entry => canonPreviewDetailAllows(entry, detailLevel));
    const addablePackIds = packEntries.filter(isCanonPreviewEntryAddable).map(entry => entry.id);
    const selectedIds = getCanonPreviewSelectedIds();
    const selectedAddableCount = Array.from(selectedIds).filter(id => isCanonPreviewEntryAddable(entryMap.get(String(id)) || {})).length;

    const controls = document.createElement('div');
    controls.className = 'saga-canon-preview-actions';
    markTourTarget(controls, 'lore.canon.addPending');
    controls.appendChild(createStatusPill(`${selectedAddableCount} selected`, 'Canon preview entries selected for Pending Review.', {
        tone: selectedAddableCount ? 'selected' : 'muted',
        kind: 'count',
        density: 'compact',
        className: 'saga-canon-preview-selected-count',
    }));
    controls.appendChild(createButton('Select Pack', `Selects all visible new entries in ${activePack.label} at the current detail level.`, () => {
        setCanonPreviewSelectedIds([...selectedIds, ...addablePackIds]);
        if (!refreshCanonPreviewSelectionUi()) refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    }, 'saga-small-button'));
    controls.appendChild(createButton('Clear', 'Clears the current canon preview selection.', () => {
        setCanonPreviewSelectedIds([]);
        if (!refreshCanonPreviewSelectionUi()) refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    }, 'saga-small-button'));
    const addSelected = createButton('Add Selected to Pending Review', 'Adds selected canon preview entries to Pending Review for full inspection before accepting.', async (btn) => {
        await handleAddCanonPreviewEntries(btn, Array.from(getCanonPreviewSelectedIds()));
    }, 'saga-primary-button');
    addSelected.dataset.sagaCanonPreviewAction = 'add-selected';
    addSelected.disabled = isStale || selectedAddableCount <= 0;
    controls.appendChild(addSelected);
    const addPack = createButton('Add Pack to Pending Review', `Adds all new entries in ${activePack.label} to Pending Review.`, async (btn) => {
        await handleAddCanonPreviewEntries(btn, addablePackIds);
    }, 'saga-secondary-button');
    addPack.dataset.sagaCanonPreviewAction = 'add-pack';
    addPack.disabled = isStale || addablePackIds.length <= 0;
    controls.appendChild(addPack);
    section.appendChild(controls);

    const list = document.createElement('div');
    list.className = 'saga-canon-preview-list';
    markTourTarget(list, 'lore.canon.entryList');
    const visibleEntries = packEntries.slice(0, 80);
    visibleEntries.forEach(entry => {
        list.appendChild(createCanonPreviewEntryRow(entry, selectedIds, isStale));
    });
    if (!visibleEntries.length) {
        list.appendChild(createEmptyMessage(`No ${activePack.label} entries at the ${detailLevel === 'all' ? 'All Active' : detailLevel} detail level.`));
    }
    if (packEntriesAll.length > packEntries.length) {
        const hidden = document.createElement('div');
        hidden.className = 'saga-runtime-help saga-compact-help';
        hidden.textContent = `${packEntriesAll.length - packEntries.length} entries hidden by the current detail level. Switch to Detailed or All Active to inspect them.`;
        list.appendChild(hidden);
    }
    if (packEntries.length > visibleEntries.length) {
        const note = document.createElement('div');
        note.className = 'saga-runtime-help saga-compact-help';
        note.textContent = `Showing first ${visibleEntries.length} of ${packEntries.length}. Select Pack still selects every new entry in this pack.`;
        list.appendChild(note);
    }
    section.appendChild(list);
    return section;
}

function createCanonPreviewEntryRow(entry, selectedIds, isStale = false) {
    const id = String(entry?.id || '');
    const duplicateStatus = entry?.extensions?.canonPreview?.duplicateStatus || 'new';
    const duplicateReason = entry?.extensions?.canonPreview?.duplicateReason || '';
    const addable = !isStale && duplicateStatus === 'new';
    const row = document.createElement('label');
    row.className = `saga-canon-preview-row ${selectedIds.has(id) ? 'saga-canon-preview-row-selected' : ''} ${addable ? '' : 'saga-canon-preview-row-disabled'}`.trim();
    row.dataset.canonPreviewEntryId = id;
    markTourTarget(row, 'lore.canon.entry');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedIds.has(id);
    checkbox.disabled = !addable;
    checkbox.addEventListener('change', (event) => {
        event.stopPropagation();
        const next = getCanonPreviewSelectedIds();
        if (checkbox.checked) next.add(id);
        else next.delete(id);
        setCanonPreviewSelectedIds(Array.from(next));
        if (!refreshCanonPreviewSelectionUi()) refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
    });
    row.appendChild(checkbox);

    const main = document.createElement('div');
    main.className = 'saga-canon-preview-row-main';
    const title = document.createElement('div');
    title.className = 'saga-canon-preview-row-title';
    title.textContent = entry?.title || 'Canon lore';
    main.appendChild(title);

    const text = document.createElement('div');
    text.className = 'saga-canon-preview-row-text';
    text.textContent = getCanonPreviewEntrySummary(entry);
    main.appendChild(text);

    const meta = document.createElement('div');
    meta.className = 'saga-lore-entry-meta saga-canon-preview-row-meta';
    const previewMeta = entry?.extensions?.canonPreview || {};
    appendEntrySourceAndContextBadges(meta, entry);
    if (entry?.category) meta.appendChild(createBadge(entry.category, 'Canon entry category.', { tone: 'category', kind: 'metadata' }));
    if (entry?.lorePurpose) meta.appendChild(createBadge(LORE_PURPOSE_LABELS[entry.lorePurpose] || entry.lorePurpose, 'Why this canon entry would be useful.', { tone: 'info', kind: 'metadata', maxChars: 42 }));
    if (previewMeta.suggestionRole) meta.appendChild(createBadge(previewMeta.suggestionRole.replace(/_/g, ' '), 'Canon preview role used for pack sorting.', { tone: 'source', kind: 'source', maxChars: 34 }));
    if (previewMeta.detailLevel) meta.appendChild(createBadge(previewMeta.detailLevel, 'Canon preview detail tier.', { tone: 'info', kind: 'metadata' }));
    if (previewMeta.suggestByDefault === false) meta.appendChild(createBadge('non-default', 'Shown only in All Active or higher-detail review because this is not usually worth suggesting automatically.', { tone: 'muted', kind: 'status' }));
    if (entry?.relevance) meta.appendChild(createBadge(entry.relevance, 'Recommended relevance tier for Pending Review.', { tone: 'relevance', kind: 'metadata' }));
    meta.appendChild(createBadge(`P${Number(entry?.priority || 50)}`, 'Canon database priority.', { tone: 'relevance', kind: 'metadata' }));
    if (duplicateStatus !== 'new') {
        meta.appendChild(createBadge(duplicateStatus, duplicateReason || 'Already present by id/title.', {
            tone: duplicateStatus === 'accepted' ? 'success' : 'review',
            kind: 'status',
        }));
    }
    main.appendChild(meta);

    row.appendChild(main);
    return row;
}

function createStoryLoreGenerationPanel(state) {
    const panel = document.createElement('div');
    panel.className = 'saga-lore-generation-panel saga-story-lore-generation-panel';
    markTourTarget(panel, 'lore.story');

    const header = document.createElement('div');
    header.className = 'saga-lore-generation-panel-title';
    header.textContent = 'Scan Story Lore';
    addTooltip(header, 'Uses the Reasoning provider to scan chat messages and create story-specific lore entries for Pending Review. The scan can cover recent messages, a custom range, or the entire chat.');
    panel.appendChild(header);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help saga-lore-scan-help';
    help.textContent = 'Model-based story scan. Uses resumable chunks, partial saves, retries, and configurable scan ranges. Output stays pending until accepted.';
    panel.appendChild(help);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions saga-generation-actions';
    const scanBtn = markTourTarget(createButton('Scan Story Lore', 'Scans the configured message range, processes chunks in parallel, and appends generated story-specific lore into Pending Review as chunks complete.', async (btn) => {
        await handleBulkGeneratePendingLore(btn);
    }, 'saga-primary-button'), 'lore.story.scan');
    if (loreGenerationUiRunning || activeLoreGenerationController) {
        scanBtn.disabled = true;
        scanBtn.textContent = 'Scan Running...';
    }
    actions.appendChild(scanBtn);

    const cancelBtn = createButton('Cancel Scan', 'Cancels the current story-lore scan after active provider requests return or abort.', () => {
        if (activeLoreGenerationController) {
            activeLoreGenerationController.abort();
            setFeatureProgress('lore', 'Cancelling story lore scan...', Math.max(1, Number(getState()?.lorePanel?.loreProgress) || 1));
        }
    }, 'saga-danger-button');
    cancelBtn.disabled = !activeLoreGenerationController;
    actions.appendChild(cancelBtn);
    panel.appendChild(actions);

    appendGenerationStatus(panel, state, 'lore');
    const resultsCard = createBulkLoreLedgerStatusCard(state);
    if (resultsCard) panel.appendChild(resultsCard);

    if (!isBasicExperience()) {
        const settingsSection = createCollapsibleSection(
            'lore.storyGenerationSettings',
            'Story Lore Scan Settings',
            getLoreScanSettingsSummary(getSettings()),
            false,
            createStoryLoreSettingsContent(),
            { tooltip: 'Advanced model-based story-lore scan controls. Most users can leave these defaults unchanged.', className: 'saga-story-lore-settings-collapsible' }
        );
        markTourTarget(settingsSection, 'lore.story.settings');
        panel.appendChild(settingsSection);
    }

    return panel;
}

function getLoreScanSettingsSummary(settings = getSettings()) {
    const mode = settings.loreBulkScanMode || 'recent';
    const label = mode === 'entire' ? 'entire chat' : (mode === 'range' ? 'custom range' : `last ${settings.loreSourceMessageCount || 40}`);
    return `${label} · ${settings.loreBulkChunkSize || 10}/chunk · ${settings.loreBulkConcurrency || 3} parallel`;
}

function createStoryLoreSettingsContent() {
    const settings = getSettings();
    const wrap = document.createElement('div');
    wrap.className = 'saga-story-lore-settings-content';

    const scopeSection = createCollapsibleSection(
        'lore.story.scanScope',
        'Scan Scope',
        getLoreScanScopeSummary(settings),
        true,
        createLoreScanScopeSettingsContent(),
        { tooltip: 'Choose which chat messages are scanned for story lore.', className: 'saga-compact-subsection saga-lore-scan-scope-subsection' }
    );
    markTourTarget(scopeSection, 'lore.story.scope');
    wrap.appendChild(scopeSection);

    const performanceSection = createCollapsibleSection(
        'lore.story.performance',
        'Performance',
        getLoreScanPerformanceSummary(settings),
        false,
        createLoreScanPerformanceSettingsContent(),
        { tooltip: 'Controls throughput, chunk size, overlap, and retry behavior for story-lore scanning.', className: 'saga-compact-subsection' }
    );
    markTourTarget(performanceSection, 'lore.story.performance');
    wrap.appendChild(performanceSection);

    const qualitySection = createCollapsibleSection(
        'lore.story.quality',
        'Generation Quality',
        getLoreScanQualitySummary(settings),
        false,
        createLoreScanQualitySettingsContent(),
        { tooltip: 'Controls breadth, generated fact count, tags, and duplicate filtering.', className: 'saga-compact-subsection' }
    );
    markTourTarget(qualitySection, 'lore.story.quality');
    wrap.appendChild(qualitySection);

    const automationSection = createCollapsibleSection(
        'lore.story.automation',
        'Automation',
        getStoryLoreAutomationSummary(settings),
        false,
        createStoryLoreAutomationSettingsContent(),
        { tooltip: 'Optional automatic story-lore scanning after roleplay turns.', className: 'saga-compact-subsection' }
    );
    markTourTarget(automationSection, 'lore.story.automation');
    wrap.appendChild(automationSection);

    return wrap;
}

function getLoreScanScopeSummary(settings = getSettings()) {
    const mode = settings.loreBulkScanMode || 'recent';
    if (mode === 'entire') return 'entire chat';
    if (mode === 'range') return `${settings.loreBulkRangeStart || 1}-${settings.loreBulkRangeEnd || 'latest'}`;
    return `last ${settings.loreSourceMessageCount || 40}`;
}

function getLoreScanPerformanceSummary(settings = getSettings()) {
    return `${settings.loreBulkChunkSize || 10}/chunk · ${settings.loreBulkConcurrency || 3} simultaneous`;
}

function getLoreScanQualitySummary(settings = getSettings()) {
    return `${settings.loreBulkFactsPerChunk || 14} facts/chunk · ${(settings.loreGenerationBreadthMode || 'auto')}`;
}

function getStoryLoreAutomationSummary(settings = getSettings()) {
    if (settings.loreGenerationMode !== 'automatic') return 'manual';
    const words = Number(settings.loreGenerationAutoWordThreshold || 2500);
    const maxTurns = Number(settings.loreGenerationAutoInterval || 50);
    return `~${words} words or ${maxTurns} turns`;
}

function createStoryLoreAutomationSettingsContent() {
    const content = document.createElement('div');
    content.className = 'saga-story-lore-automation-content';
    appendSettingsResetButton(content, STORY_LORE_AUTOMATION_SETTING_KEYS, 'Story lore automation settings');
    content.appendChild(createAutomationModeCard(
        'Story Lore Scan',
        'loreGenerationMode',
        'loreGenerationAutoInterval',
        'Only scans when you click Scan Story Lore.',
        'Runs automatically after enough new story text accumulates or the maximum turn interval is reached. Generated lore still waits in Pending Review.',
        'Maximum completed model turns between automatic story-lore scans.'
    ));
    content.appendChild(createRangeSettingRow('Minimum turns', 'Automatic story lore waits at least this many completed model turns unless the maximum turn interval is reached.', 'loreGenerationAutoMinTurns', { min: 1, max: 100, fallback: 20 }));
    content.appendChild(createRangeSettingRow('Word threshold', 'Automatic story lore runs after roughly this many new chat words have accumulated, once the minimum turn count has passed. Set to 0 to use turn interval only.', 'loreGenerationAutoWordThreshold', { min: 0, max: 10000, fallback: 2500, suffix: ' words' }));
    const help = document.createElement('div');
    help.className = 'saga-runtime-help saga-compact-help';
    help.textContent = 'Automatic story-lore scans are intentionally conservative because they are expensive and produce review work.';
    content.appendChild(help);
    return content;
}

function createLoreScanScopeSettingsContent() {
    const settings = getSettings();
    const content = document.createElement('div');
    content.className = 'saga-lore-scan-settings-block';
    appendSettingsResetButton(content, STORY_LORE_SCAN_SCOPE_SETTING_KEYS, 'Story lore scan scope settings');

    const grid = document.createElement('div');
    grid.className = 'saga-runtime-grid saga-lore-scan-compact-grid';
    grid.appendChild(createSelectSettingRow(
        'Scan range',
        'Controls which messages Scan Story Lore processes. Recent uses Lore source messages; Custom uses explicit 1-based message indexes; Entire scans the whole chat.',
        'loreBulkScanMode',
        [
            ['recent', 'Recent messages'],
            ['range', 'Custom range'],
            ['entire', 'Entire chat'],
        ]
    ));
    grid.appendChild(createNumberSettingRow('Start', 'First 1-based message index used when Scan range is Custom range.', 'loreBulkRangeStart', { min: 1, max: 100000, fallback: 1 }));
    grid.appendChild(createNumberSettingRow('End', 'Last 1-based message index used when Scan range is Custom range. Use 0 to mean latest message.', 'loreBulkRangeEnd', { min: 0, max: 100000, fallback: 0 }));
    content.appendChild(grid);

    const sourceRow = document.createElement('label');
    sourceRow.className = 'saga-slider-row saga-compact-slider-row saga-lore-scan-setting-row';
    const sourceText = document.createElement('span');
    sourceText.textContent = `Recent window: ${settings.loreSourceMessageCount || 40}`;
    addTooltip(sourceText, 'How many recent chat messages are scanned when Scan range is Recent messages.');
    const sourceInput = document.createElement('input');
    sourceInput.type = 'range';
    sourceInput.min = '4';
    sourceInput.max = '200';
    sourceInput.step = '1';
    sourceInput.value = String(settings.loreSourceMessageCount || 40);
    sourceInput.addEventListener('input', () => {
        const next = getSettings();
        next.loreSourceMessageCount = Math.max(4, Math.min(200, parseInt(sourceInput.value, 10) || 40));
        saveSettings(next);
        sourceText.textContent = `Recent window: ${next.loreSourceMessageCount}`;
    });
    sourceRow.appendChild(sourceText);
    sourceRow.appendChild(sourceInput);
    content.appendChild(sourceRow);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help saga-compact-help';
    help.textContent = 'Use Custom range for backfilling old story sections. Use Entire chat for first-time setup on an existing story.';
    content.appendChild(help);
    return content;
}

function createLoreScanPerformanceSettingsContent() {
    const content = document.createElement('div');
    content.className = 'saga-lore-scan-settings-block';
    appendSettingsResetButton(content, STORY_LORE_SCAN_PERFORMANCE_SETTING_KEYS, 'Story lore scan performance settings');
    content.appendChild(createRangeSettingRow('Chunk size', 'Messages per scan chunk. Smaller chunks parse more reliably; larger chunks reduce provider calls.', 'loreBulkChunkSize', { min: 3, max: 50, fallback: 10 }));
    content.appendChild(createRangeSettingRow('Overlap', 'Messages repeated at chunk boundaries to preserve facts that span two intervals. Must be lower than chunk size.', 'loreBulkOverlap', { min: 0, max: 10, fallback: 1 }));
    content.appendChild(createRangeSettingRow('Simultaneous chunks', 'Maximum number of story-lore chunks submitted to the Reasoning provider at the same time.', 'loreBulkConcurrency', { min: 1, max: 8, fallback: 3 }));
    content.appendChild(createRangeSettingRow('Retry attempts', 'Chunk-level retry attempts after empty, malformed, or failed extraction responses.', 'loreBulkRetryAttempts', { min: 0, max: 4, fallback: 2 }));
    content.appendChild(createRangeSettingRow('Save checkpoint every chunks', 'How often the scan writes a full compact checkpoint after lightweight per-chunk saves. Lower is safer; higher reduces persistence overhead.', 'loreBulkFullCheckpointEveryChunks', { min: 1, max: 25, fallback: 5 }));
    content.appendChild(createRangeSettingRow('Consolidate every chunks', 'How many completed chunks to collect before converting extracted facts into Pending Review entries.', 'loreBulkConsolidationChunkWindow', { min: 1, max: 25, fallback: 5 }));

    const help = document.createElement('div');
    help.className = 'saga-runtime-help saga-compact-help';
    help.textContent = 'Each chunk still checkpoints immediately for recovery. Full saves and Pending Review consolidation happen in batches to reduce large-scan overhead.';
    content.appendChild(help);
    return content;
}

function createLoreScanQualitySettingsContent() {
    const settings = getSettings();
    const content = document.createElement('div');
    content.className = 'saga-lore-scan-settings-block';
    appendSettingsResetButton(content, STORY_LORE_SCAN_QUALITY_SETTING_KEYS, 'Story lore generation quality settings');

    const modeRow = document.createElement('label');
    modeRow.className = 'saga-setting-row saga-lore-scan-setting-row';
    const modeLabel = document.createElement('span');
    modeLabel.textContent = 'Scan breadth';
    addTooltip(modeLabel, 'Auto uses bootstrap mode for manual first-runs when accepted story-specific lore is sparse, then incremental mode for maintenance. Bootstrap targets broad story coverage; incremental targets only new or changed facts.');
    const modeSelect = document.createElement('select');
    modeSelect.className = 'text_pole';
    [
        ['auto', 'Auto'],
        ['bootstrap', 'Bootstrap'],
        ['incremental', 'Incremental'],
    ].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        if ((settings.loreGenerationBreadthMode || 'auto') === value) option.selected = true;
        modeSelect.appendChild(option);
    });
    modeSelect.addEventListener('change', () => {
        const next = getSettings();
        next.loreGenerationBreadthMode = modeSelect.value;
        saveSettings(next);
        refreshPanelBody({ preserveScroll: true });
    });
    modeRow.appendChild(modeLabel);
    modeRow.appendChild(modeSelect);
    content.appendChild(modeRow);

    content.appendChild(createRangeSettingRow('Facts per chunk', 'Upper target for compact facts extracted per chunk before conversion into Pending Review entries.', 'loreBulkFactsPerChunk', { min: 4, max: 30, fallback: 14 }));
    content.appendChild(createRangeSettingRow('Bootstrap target', 'Approximate total pending entries targeted during broad first-run story-lore scan.', 'loreBootstrapTargetEntries', { min: 12, max: 120, fallback: 40 }));
    content.appendChild(createRangeSettingRow('Incremental target', 'Approximate total pending entries targeted during incremental story-lore scan.', 'loreIncrementalTargetEntries', { min: 3, max: 30, fallback: 8 }));
    content.appendChild(createRangeSettingRow('Generated tags', 'Number of short searchable tags requested per generated lore entry. Set to 0 to disable generated tags.', 'loreTagCount', { min: 0, max: 10, fallback: 4 }));

    const grid = document.createElement('div');
    grid.className = 'saga-runtime-grid saga-lore-scan-compact-grid';
    grid.appendChild(createToggleCard(
        'Replacement Guard',
        settings.loreReplacementGuard !== false,
        'When enabled, Saga asks before replacing unresolved Pending Review entries.',
        (checked) => {
            const next = getSettings();
            next.loreReplacementGuard = checked;
            saveSettings(next);
            refreshPanelBody({ preserveScroll: true });
        }
    ));
    grid.appendChild(createToggleCard(
        'Duplicate Guard',
        settings.loreDuplicateGuard !== false,
        'When enabled, exact duplicate generated entries are filtered and similar entries are routed for update/merge review.',
        (checked) => {
            const next = getSettings();
            next.loreDuplicateGuard = checked;
            saveSettings(next);
            refreshPanelBody({ preserveScroll: true });
        }
    ));
    grid.appendChild(createToggleCard(
        'Similarity Routing',
        settings.loreSimilarityRouting !== false,
        'When enabled, similar generated lore is kept as a possible update or merge instead of being thrown away as a duplicate.',
        (checked) => {
            const next = getSettings();
            next.loreSimilarityRouting = checked;
            saveSettings(next);
            refreshPanelBody({ preserveScroll: true });
        }
    ));
    grid.appendChild(createToggleCard(
        'Strict Quality Gate',
        settings.loreStrictQualityGate !== false,
        'When enabled, low-value recap facts are filtered before Pending Review.',
        (checked) => {
            const next = getSettings();
            next.loreStrictQualityGate = checked;
            saveSettings(next);
            refreshPanelBody({ preserveScroll: true });
        }
    ));
    content.appendChild(grid);

    const rescanRow = createSelectSettingRow(
        'What to rescan',
        'Controls whether Scan Story Lore skips unchanged completed chunks, retries failed chunks, rescans stale edited chunks, or rescans all chunks.',
        'loreBulkRescanMode',
        [
            ['skip_unchanged', 'Skip unchanged'],
            ['retry_failed', 'Retry failed only'],
            ['stale_only', 'Rescan edited only'],
            ['rescan_all', 'Rescan all'],
        ]
    );
    content.appendChild(rescanRow);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help saga-compact-help';
    help.textContent = 'Priority and final review still happen in Pending Review. Generated entries are not accepted automatically.';
    content.appendChild(help);
    return content;
}

async function handleDetectStoryContext(btn, options = {}) {
    if (btn) {
        let result = false;
        await runBusyAction(btn, 'Detecting...', async () => { result = await performStoryContextDetection(options); });
        return result;
    }
    return await performStoryContextDetection(options);
}

async function performStoryContextDetection(options = {}) {
    setFeatureProgress('context', 'Reading chat and detecting context...', 8);
    const detected = await runLoreContextDetection({ progress: (message, percent) => setFeatureProgress('context', message, percent) });
    const after = getState();
    if (options.stayOnTab) setPanelState({ activeTab: options.stayOnTab }, { deferSave: true });
    refreshHeader();
    refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });

    const fields = after?.loreContext || {};
    const filled = ['sceneDate', 'subjectiveDate', 'canonBoundary', 'branchId', 'timeTravelMode']
        .filter(key => String(fields[key] || '').trim()).length;

    if (detected && filled > 0) {
        setFeatureProgress('context', 'Context detected and fields updated.', 100);
        resetFeatureProgress('context');
        toast('Context detected and fields updated.');
        return true;
    }
    if (detected) {
        toast('Context detection completed, but it did not find global date/reference fields to populate.', 'warning');
        return false;
    }
    const validation = validateLoreProviderConfiguration('lore');
    if (!validation.ok) {
        const message = `API/model settings incomplete for Detect Context: ${validation.message}`;
        setFeatureProgress('context', message, 100);
        toast(message, 'error');
        return false;
    }
    toast('Context detection returned no usable result.', 'warning');
    return false;
}

function hasUsableStoryContext(context = {}) {
    return !![
        context.sceneDate,
        context.subjectiveDate,
        context.canonBoundary,
        context.branchId && context.branchId !== 'main' ? context.branchId : '',
    ].map(value => String(value || '').trim()).find(Boolean);
}

function getEnabledLoredeckStackPackIds(state = getState()) {
    const stack = Array.isArray(state?.loredeckStack) ? state.loredeckStack : [];
    if (!stack.length) return [];
    const registry = getLoredeckLibraryRegistry(state);
    const resolved = registry && (Array.isArray(registry.folders) || Array.isArray(registry.deckPlacements))
        ? resolveLoredeckStackItems(stack, registry, { packs: registry.packs || {} })?.stack || []
        : stack;
    const seen = new Set();
    const ids = [];
    for (const item of Array.isArray(resolved) ? resolved : []) {
        const packId = String(item?.packId || item?.deckId || '').trim();
        if (!packId || seen.has(packId) || item?.enabled === false) continue;
        seen.add(packId);
        ids.push(packId);
    }
    return ids;
}

function hasUsableLoredeckContext(context = {}) {
    return hasSelectedLoredeckContext(context);
}

function getCanonSuggestionContext(state = getState()) {
    const globalContext = state?.loreContext || {};
    if (hasUsableStoryContext(globalContext)) return globalContext;
    const activePackIds = getEnabledLoredeckStackPackIds(state);
    for (const packId of activePackIds) {
        const row = state?.loredeckContexts?.[packId] || getLoredeckContext(state, packId);
        if (!hasUsableLoredeckContext(row)) continue;
        return {
            ...globalContext,
            sceneDate: row.sceneDate || globalContext.sceneDate || '',
            subjectiveDate: row.subjectiveDate || globalContext.subjectiveDate || '',
            canonBoundary: row.alias || row.label || globalContext.canonBoundary || '',
            branchId: row.branchId || globalContext.branchId || 'main',
            timeTravelMode: globalContext.timeTravelMode || 'none',
            stardate: row.stardate || '',
            anchorId: row.anchorId || '',
            anchorFrom: row.anchorFrom || '',
            anchorTo: row.anchorTo || '',
            arc: row.arc || '',
            phase: row.phase || '',
            season: row.season || '',
            episode: row.episode || '',
            chapter: row.chapter || '',
            issue: row.issue || '',
            quest: row.quest || '',
            gameStage: row.gameStage || '',
            coordinates: Array.isArray(row.coordinates) ? row.coordinates : [],
            label: row.label || row.alias || '',
        };
    }
    return globalContext;
}

function hasUsableCanonSuggestionContext(state = getState()) {
    if (hasUsableStoryContext(state?.loreContext || {})) return true;
    return getEnabledLoredeckStackPackIds(state).some(packId => hasUsableLoredeckContext(state?.loredeckContexts?.[packId] || getLoredeckContext(state, packId)));
}

async function ensureStoryContextForCanonAction(actionLabel = 'Canon lore') {
    let state = getState();
    if (!getEnabledLoredeckStackPackIds(state).length) {
        resetCanonPreviewUiState();
        setFeatureProgress('canon', `${actionLabel} cancelled: no active Loredecks.`, 0);
        toast('Load at least one Loredeck before previewing or suggesting canon Lorecards.', 'warning');
        return null;
    }
    if (hasUsableCanonSuggestionContext(state)) {
        return state;
    }

    const proceed = await confirmAction(
        'No Context detected',
        `${actionLabel} needs a usable Context projection, such as a date, arc, chapter, episode, stardate, or canon reference point. Run Detect Context now?`
    );
    if (!proceed) {
        setFeatureProgress('canon', `${actionLabel} cancelled: no Context.`, 0);
        return null;
    }

    setFeatureProgress('canon', 'Detecting Context before querying canon lore...', 5);
    const detected = await performStoryContextDetection({ stayOnTab: 'lore' });
    state = getState();
    if (!detected || !hasUsableCanonSuggestionContext(state)) {
        setFeatureProgress('canon', 'No Context available. Canon lore was not queried.', 100);
        toast('Canon lore needs Context before it can run.', 'warning');
        return null;
    }
    return state;
}

async function handlePreviewCanonLorePacks(btn) {
    await runBusyAction(btn, 'Previewing...', async () => {
        const state = await ensureStoryContextForCanonAction('Canon pack preview');
        if (!state) return;
        const context = getCanonSuggestionContext(state);

        setFeatureProgress('canon', 'Previewing canon packs from local database...', 20);
        const result = await previewCanonLoreForContext(context, { maxCandidates: 500 });
        canonPreviewUiState = {
            contextKey: getCanonPreviewContextKey(context, getState()),
            preview: result,
            selectedPackId: (result?.packs || []).find(pack => pack.newCount > 0)?.id || result?.packs?.[0]?.id || '',
            selectedEntryIds: [],
            detailLevel: getCanonPreviewDetailLevel(),
        };

        refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
        refreshHeader();

        if (result?.status === 'preview') {
            setFeatureProgress('canon', `Previewed ${result.packs?.length || 0} canon packs with ${result.newCount || 0} new entries.`, 100);
            resetFeatureProgress('canon');
            toast(`Previewed ${result.packs?.length || 0} canon packs. Select entries to add to Pending Review.`, 'info');
        } else if (result?.status === 'no_date') {
            setFeatureProgress('canon', 'No parseable Context date. Detect or enter a scene date first.', 100);
            toast('Canon pack preview needs a parseable Scene date first.', 'warning');
        } else if (result?.status === 'no_context') {
            setFeatureProgress('canon', 'No Context available. Canon packs were not previewed.', 100);
            toast('Canon pack preview needs Context from the Context tab or Detect Context first.', 'warning');
        } else if (result?.status === 'disabled') {
            setFeatureProgress('canon', 'Canon database is disabled.', 100);
            toast('Canon database is disabled.', 'warning');
        } else {
            setFeatureProgress('canon', 'No matching canon packs for this context.', 100);
            resetFeatureProgress('canon');
            toast('Canon database found no matching entries for this context.', 'info');
        }
    });
}

async function handleAddCanonPreviewEntries(btn, entryIds = []) {
    const ids = Array.from(new Set((entryIds || []).map(id => String(id || '')).filter(Boolean)));
    if (!ids.length) {
        toast('Select at least one new canon preview entry first.', 'warning');
        return;
    }

    await runBusyAction(btn, 'Adding...', async () => {
        const state = await ensureStoryContextForCanonAction('Adding canon preview entries');
        if (!state) return;
        const context = getCanonSuggestionContext(state);

        setFeatureProgress('canon', 'Adding selected canon entries to Pending Review...', 35);
        const result = await addCanonLorePreviewEntriesToPending(ids, context, { maxCandidates: 500 });
        if (result?.status === 'proposed') {
            canonPreviewUiState = {
                contextKey: '',
                preview: null,
                selectedPackId: '',
                selectedEntryIds: [],
                detailLevel: getCanonPreviewDetailLevel(),
            };
            openPendingLoreReviewSections();
            setPanelState({ activeTab: 'lore' }, { deferSave: true });
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            refreshHeader();
            setFeatureProgress('canon', `Added ${result.proposedCount || 0} canon entries to Pending Review.`, 100);
            resetFeatureProgress('canon');
            toast(`Added ${result.proposedCount || 0} canon entries to Pending Review.`);
        } else if (result?.status === 'duplicates_only') {
            setFeatureProgress('canon', 'Selected canon entries were already pending or accepted.', 100);
            resetFeatureProgress('canon');
            refreshHeader();
            toast('Selected canon entries were already pending or accepted.', 'info');
        } else if (result?.status === 'disabled') {
            setFeatureProgress('canon', 'Canon database is disabled.', 100);
            toast('Canon database is disabled.', 'warning');
        } else if (result?.status === 'no_date') {
            setFeatureProgress('canon', 'No parseable Context date. Canon entries were not added.', 100);
            toast('Canon entries need a parseable Scene date first.', 'warning');
        } else if (result?.status === 'no_context') {
            setFeatureProgress('canon', 'No Context available. Canon entries were not added.', 100);
            toast('Canon entries need Context from the Context tab or Detect Context first.', 'warning');
        } else {
            setFeatureProgress('canon', 'No selected canon entries were added.', 100);
            resetFeatureProgress('canon');
            toast('No selected canon entries were added.', 'info');
        }
    });
}

async function handleSuggestCanonLore(btn) {
    await runBusyAction(btn, 'Suggesting...', async () => {
        const state = await ensureStoryContextForCanonAction('Canon lore suggestions');
        if (!state) return;
        const context = getCanonSuggestionContext(state);

        setFeatureProgress('canon', 'Suggesting canon lore from local database...', 20);
        const result = await proposeCanonLoreForContext(context, {
            maxEntries: getSettings().canonLoreMaxEntries || 10,
            progress: (message, percent) => setFeatureProgress('canon', message, percent),
        });

        if (result?.status === 'proposed') {
            openPendingLoreReviewSections();
            setPanelState({ activeTab: 'lore' }, { deferSave: true });
            refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
            refreshHeader();
            setFeatureProgress('canon', `Suggested ${result.proposedCount || 0} canon lore entries.`, 100);
            resetFeatureProgress('canon');
            toast(`Suggested ${result.proposedCount || 0} canon entries. Review them in Pending Review.`);
        } else if (result?.status === 'duplicates_only') {
            setFeatureProgress('canon', `Matched ${result.matchedCount || 0}, but all selected suggestions already exist.`, 100);
            resetFeatureProgress('canon');
            refreshHeader();
            toast('Canon database matches were already present by id/title.', 'info');
        } else if (result?.status === 'no_date') {
            setFeatureProgress('canon', 'No parseable Context date. Detect or enter a scene date first.', 100);
            toast('Canon suggestions need a parseable Scene date first.', 'warning');
        } else if (result?.status === 'no_context') {
            setFeatureProgress('canon', 'No Context available. Canon suggestions were not run.', 100);
            toast('Canon suggestions need Context from the Context tab or Detect Context first.', 'warning');
        } else if (result?.status === 'disabled') {
            setFeatureProgress('canon', 'Canon database is disabled.', 100);
            toast('Canon database is disabled.', 'warning');
        } else {
            setFeatureProgress('canon', 'No matching canon suggestions for this context.', 100);
            resetFeatureProgress('canon');
            toast('Canon database found no matching entries for this context.', 'info');
        }
    });
}


function createBulkLoreLedgerStatusCard(state) {
    const ledger = state?.loreBulkGeneration || {};
    const batchId = ledger.activeBatchId || ledger.lastBatchId || '';
    const batch = batchId ? ledger.batches?.[batchId] : null;
    if (!batch) return null;

    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-bulk-lore-status-card';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Lore Scan Results';
    addTooltip(title, 'Shows the latest story-lore scan result, including completed chunks, failed chunks, extracted candidate facts, and Pending Review entries.');
    card.appendChild(title);

    const status = String(batch.status || 'unknown');
    const queued = batch.queuedChunks || batch.totalChunks || 0;
    const completed = batch.completedChunks || 0;
    const failed = batch.failedChunks || 0;
    const candidateCount = batch.candidateCount || 0;
    const pendingCount = batch.pendingEntryCount || (state?.pendingLoreEntries || []).length || 0;
    const qualityDropped = batch.droppedQualityCount || state?.pendingLoreMeta?.droppedQualityCount || 0;
    const routedSimilar = batch.routedSimilarCount || state?.pendingLoreMeta?.routedSimilarCount || 0;

    const summary = document.createElement('div');
    summary.className = 'saga-runtime-help saga-lore-scan-results-summary';
    summary.textContent = `${status} · ${completed}/${queued} chunks · ${candidateCount} facts · ${pendingCount} pending${failed ? ` · ${failed} failed` : ''}`;
    card.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'saga-runtime-grid saga-lore-scan-results-grid';
    grid.appendChild(createKeyValue('Range', `${batch.rangeStart || '?'}-${batch.rangeEnd || '?'}`, 'Message index range scanned.'));
    grid.appendChild(createKeyValue('Chunks', `${completed}/${queued}`, 'Completed queued chunks over total queued chunks.'));
    grid.appendChild(createKeyValue('Failed', String(failed), 'Chunks that failed after retry attempts and can be retried with What to rescan: Retry failed only.'));
    grid.appendChild(createKeyValue('Facts', String(candidateCount), 'Compact extracted candidate facts stored for this scan.'));
    grid.appendChild(createKeyValue('Pending', String(pendingCount), 'Pending Review entries after scan commits.'));
    if (qualityDropped) grid.appendChild(createKeyValue('Quality filtered', String(qualityDropped), 'Generated candidates discarded by the strict quality gate as low-value recap or insufficiently specific lore.'));
    if (routedSimilar) grid.appendChild(createKeyValue('Routed updates', String(routedSimilar), 'Similar generated candidates kept as possible updates or merges instead of discarded as duplicates.'));
    card.appendChild(grid);
    return card;
}

async function handleBulkGeneratePendingLore(btn) {
    if (loreGenerationUiRunning || activeLoreGenerationController) {
        toast('Lore generation is already running. Use Cancel Scan to stop it.', 'warning');
        return;
    }
    if (!ensureLoreProviderReadyForAction('Scan Story Lore', 'lore')) return;
    activeLoreGenerationController = new AbortController();
    loreGenerationUiRunning = true;
    refreshPanelBody({ preserveScroll: true });
    await runBusyAction(btn, 'Scanning...', async () => {
        setFeatureProgress('lore', 'Starting story lore scan...', 5);
        let result = await runBulkLoreGeneration({
            force: true,
            signal: activeLoreGenerationController?.signal,
            progress: (message, percent) => setFeatureProgress('lore', message, percent),
        });
        if (result?.status === 'pending_lore_exists') {
            const pendingCount = result.pendingCount || 0;
            const sameContext = result.sameContext !== false;
            const proceed = await confirmAction(
                'Pending Review already has entries',
                sameContext
                    ? `There are ${pendingCount} unresolved Pending Review entr${pendingCount === 1 ? 'y' : 'ies'} for this context. Continue and append/merge new scan results into Pending Review?`
                    : `There are ${pendingCount} unresolved Pending Review entr${pendingCount === 1 ? 'y' : 'ies'} from another context. Continue by marking the old batch replaced and starting a fresh scan?`
            );
            if (!proceed) {
                setFeatureProgress('lore', 'Story lore scan cancelled: Pending Review still needs attention.', 0);
                toast('Review or reject existing Pending Review entries before scanning again.', 'info');
                return;
            }
            setFeatureProgress('lore', sameContext ? 'Continuing scan and appending to Pending Review...' : 'Replacing stale Pending Review entries and starting scan...', 5);
            result = await runBulkLoreGeneration({
                force: true,
                signal: activeLoreGenerationController?.signal,
                progress: (message, percent) => setFeatureProgress('lore', message, percent),
                allowPendingAppend: sameContext,
                replacePending: !sameContext,
            });
        }
        refreshHeader();

        if (result?.status === 'cancelled') {
            refreshPanelBody({ preserveScroll: true });
            setFeatureProgress('lore', 'Story lore scan cancelled.', 0);
            toast('Story lore scan cancelled.', 'warning');
        } else if (['complete', 'partial'].includes(result?.status)) {
            openPendingLoreReviewSections();
            setPanelState({ activeTab: 'lore' });
            refreshPanelBody({ preserveScroll: false });
            const failedText = result.failedChunkCount ? ` ${result.failedChunkCount} chunk${result.failedChunkCount === 1 ? '' : 's'} failed and can be retried.` : '';
            const skippedText = result.skippedChunks ? ` ${result.skippedChunks} unchanged chunk${result.skippedChunks === 1 ? '' : 's'} skipped.` : '';
            const qualityText = result.droppedQualityCount ? ` ${result.droppedQualityCount} low-value candidate${result.droppedQualityCount === 1 ? '' : 's'} filtered.` : '';
            const routedText = result.routedSimilarCount ? ` ${result.routedSimilarCount} similar candidate${result.routedSimilarCount === 1 ? '' : 's'} routed for update review.` : '';
            setFeatureProgress('lore', `Story lore scan ${result.status}: ${result.completedChunkCount || 0} chunks, ${result.candidateCount || 0} candidate facts, ${result.pendingEntryCount || 0} pending entries.`, 100);
            resetFeatureProgress('lore');
            toast(`Story lore scan ${result.status}. ${result.candidateCount || 0} candidate facts extracted; ${result.pendingEntryCount || 0} Pending Review entries now available.${failedText}${skippedText}${qualityText}${routedText}`);
        } else if (result?.status === 'skipped_unchanged') {
            refreshPanelBody({ preserveScroll: true });
            setFeatureProgress('lore', `Story lore scan skipped ${result.skippedChunks || 0} unchanged chunks.`, 100);
            resetFeatureProgress('lore');
            toast('Story lore scan found no changed chunks to process.', 'info');
        } else {
            refreshPanelBody({ preserveScroll: true });
            const details = formatGenerationStatus(result);
            toast(details, 'warning');
        }
    });
    activeLoreGenerationController = null;
    loreGenerationUiRunning = false;
    refreshPanelBody({ preserveScroll: true });
}

function createCanonLoreDatabaseCard(state) {
    const settings = getSettings();
    const card = document.createElement('div');
    card.className = 'saga-runtime-card saga-canon-db-card';

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Local Canon Lore Database';
    addTooltip(title, 'After Context detection finds a parseable canon date, Saga locally queries active Loredecks and proposes relevant canon entries into Pending Review. This does not call the model.');
    card.appendChild(title);

    const db = state?.canonLoreDatabase || {};
    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Canon database entries are proposed for review, not automatically accepted. Saga queries the active Loredeck stack and its bundled or custom Lorecard files.';
    card.appendChild(help);

    const grid = document.createElement('div');
    grid.className = 'saga-runtime-grid';
    grid.appendChild(createToggleCard(
        'Use Local Canon Database',
        settings.canonLoreDatabaseEnabled !== false,
        'Allows manual previews, quick queries, and optional auto-suggest to query local pre-generated canon lore files.',
        (checked) => {
            const next = getSettings();
            next.canonLoreDatabaseEnabled = checked;
            saveSettings(next);
            refreshPanelBody({ preserveScroll: true });
        }
    ));
    grid.appendChild(createToggleCard(
        'Auto-suggest After Detection',
        settings.canonLoreAutoPropose !== false,
        'When enabled, a Context detection run also performs the quick top-match canon proposal. It does not affect manual pack previews.',
        (checked) => {
            const next = getSettings();
            next.canonLoreAutoPropose = checked;
            saveSettings(next);
            refreshPanelBody({ preserveScroll: true });
        }
    ));
    card.appendChild(grid);

    const maxRow = document.createElement('label');
    maxRow.className = 'saga-slider-row saga-compact-slider-row';
    const maxText = document.createElement('span');
    maxText.textContent = `Quick/auto add cap: ${settings.canonLoreMaxEntries || 12}`;
    addTooltip(maxText, 'Maximum entries used only by quick query and auto-suggest after Context detection. Pack preview counts are not capped by this slider.');
    const maxInput = document.createElement('input');
    maxInput.type = 'range';
    maxInput.min = '1';
    maxInput.max = '200';
    maxInput.step = '1';
    maxInput.value = String(settings.canonLoreMaxEntries || 12);
    maxInput.addEventListener('input', () => {
        const next = getSettings();
        next.canonLoreMaxEntries = Math.max(1, Math.min(200, parseInt(maxInput.value, 10) || 12));
        saveSettings(next);
        maxText.textContent = `Quick/auto add cap: ${next.canonLoreMaxEntries}`;
    });
    maxRow.appendChild(maxText);
    maxRow.appendChild(maxInput);
    card.appendChild(maxRow);

    const actions = document.createElement('div');
    actions.className = 'saga-primary-actions';
    actions.appendChild(createButton('Quick Add Top Matches', 'Uses the current Context fields to query local canon lore and propose the capped top matches into Pending Review.', async (btn) => {
        await runBusyAction(btn, 'Querying...', async () => {
            const state = await ensureStoryContextForCanonAction('Canon database quick add');
            if (!state) return;
            const context = getCanonSuggestionContext(state);
            setFeatureProgress('context', 'Querying local canon lore database...', 80);
            const result = await proposeCanonLoreForContext(context, {
                maxEntries: getSettings().canonLoreMaxEntries || 12,
                progress: (message, percent) => setFeatureProgress('context', message, percent),
            });
            if (result?.status === 'proposed') {
                refreshPanelBody({ preserveScroll: true, preserveWindowScroll: true });
                refreshHeader();
                setFeatureProgress('context', `Canon database proposed ${result.proposedCount || 0} Pending Review entries.`, 100);
                resetFeatureProgress('context');
                toast(`Canon database proposed ${result.proposedCount || 0} Pending Review entries.`);
            } else if (result?.status === 'duplicates_only') {
                // Do not refresh the whole panel for a no-op duplicate result. In chats that
                // already contain oversized pending canon entries, a full refresh can freeze.
                setFeatureProgress('context', `Canon database matched ${result.matchedCount || 0}, but selected proposals were already present by id/title.`, 100);
                resetFeatureProgress('context');
                refreshHeader();
                toast('Canon database matches were already present by id/title.', 'info');
            } else if (result?.status === 'no_date') {
                toast('Canon database needs a parseable Scene date first.', 'warning');
            } else if (result?.status === 'no_context') {
                toast('Canon database needs Context from the Context tab or Detect Context first.', 'warning');
            } else if (result?.status === 'disabled') {
                toast('Canon database is disabled.', 'warning');
            } else {
                toast('Canon database found no matching entries for this context.', 'info');
            }
        });
    }, 'saga-primary-button'));
    card.appendChild(actions);

    card.appendChild(createKeyValue('Last query', db.lastQueriedAt ? new Date(db.lastQueriedAt).toLocaleString() : 'never', 'When the local canon database was last queried.'));
    card.appendChild(createKeyValue('Last result', db.lastStatus || 'Not queried.', 'Summary of the last local canon lore query.'));
    return card;
}

function createContextEditorCard(state) {
    const card = document.createElement('div');
    card.className = 'saga-context-advanced-brief-content';
    markTourTarget(card, 'context.editor');

    const title = document.createElement('div');
    title.className = 'saga-runtime-card-title';
    title.textContent = 'Global Brief Projection';
    addTooltip(title, 'Legacy date/canon reference projection used by older local canon-preview flows. Per-Loredeck Context rows above remain authoritative for Loredeck gates.');
    card.appendChild(title);

    const brief = state?.contextBrief || {};
    const diagnostics = document.createElement('div');
    diagnostics.className = 'saga-context-brief-diagnostics';
    diagnostics.appendChild(createKeyValue('Brief summary', brief.summary || 'not detected', 'Latest detector Context Brief summary.'));
    diagnostics.appendChild(createKeyValue('Evidence', String((brief.evidence || []).length), 'Evidence snippets captured by the detector.'));
    diagnostics.appendChild(createKeyValue('Uncertainty', brief.uncertainty?.level || 'low', 'Detector uncertainty level.'));
    diagnostics.appendChild(createKeyValue('Signals', getContextBriefSignalSummary(brief), 'Structured story-position signals saved in the latest Context Brief.'));
    card.appendChild(diagnostics);

    const help = document.createElement('div');
    help.className = 'saga-runtime-help';
    help.textContent = 'Use these fields only when legacy canon preview or story-lore tools need a simple global date/reference point. For arcs, chapters, episodes, quests, stardates, and windows, use the loaded Loredeck Context rows and Browser above.';
    card.appendChild(help);

    const grid = document.createElement('div');
    grid.className = 'saga-runtime-grid saga-context-grid';
    markTourTarget(grid, 'context.fields');
    grid.appendChild(createTextSettingField('Scene date', state?.loreContext?.sceneDate || '', 'Example: September 1, 1996. Used for date-sensitive lore.', (value) => updateLoreContextField('sceneDate', value)));
    grid.appendChild(createTextSettingField('Canon reference point', state?.loreContext?.canonBoundary || '', 'Example: Through Chapter 14 of Half-Blood Prince. Used to avoid using future canon prematurely.', (value) => updateLoreContextField('canonBoundary', value)));
    grid.appendChild(createTextSettingField('Branch', state?.loreContext?.branchId || 'main', 'Use “main” for the primary timeline, or a custom branch name for story/time-travel branches.', (value) => updateLoreContextField('branchId', value || 'main')));
    card.appendChild(grid);

    card.appendChild(createKeyValue('Last detected', state?.loreContext?.lastDetectedAt ? new Date(state.loreContext.lastDetectedAt).toLocaleString() : 'never', 'When Context was last detected automatically. Manual edits also affect generation immediately.'));
    return card;
}

function updateLoreContextField(key, value) {
    setLoreContext({ [key]: value, lastDetectedAt: Date.now() });
    refreshHeader();
}

function formatGenerationStatus(result) {
    if (!result) return 'Story lore scan ended without a result.';
    const modeText = result.generationMode ? `${result.generationMode} mode` : 'story-lore scan';
    const targetText = result.targetEntryCount ? ` Target: ${result.targetEntryCount}.` : '';
    if (result.status === 'empty_valid_entries') {
        if (result.droppedDuplicateCount) {
            return `Scan in ${modeText} produced ${result.normalizedEntryCount || result.rawEntryCount || 0} normalized entries, but all were duplicate/similar (${result.droppedDuplicateCount} filtered). Try disabling Duplicate Guard or broadening Source Messages.`;
        }
        return `Scan in ${modeText} returned ${result.rawEntryCount || 0} raw entries, but none matched the Saga lore schema after normalization.${targetText}`;
    }
    if (result.status === 'failed_parse') return 'Story lore scan returned malformed JSON that could not be repaired.';
    if (result.status === 'failed_no_response') return result.chunkCount ? `Story lore scan in ${modeText} returned no usable responses across ${result.chunkCount} chunk(s). Check provider connection, model output format, max tokens, or reduce chunk size.${targetText}` : 'Story lore scan returned an empty response from the selected model/provider.';
    if (result.status === 'api_not_configured') return `API/model settings incomplete: ${result.error || 'missing provider settings'}`;
    if (result.status === 'no_context_detected') return 'No context could be detected. Set Context manually or increase the scan range.';
    return `Story lore scan ended with status: ${result.status || 'unknown'}`;
}

// Accepted lore bulk selection and editing --------------------------------------

function refreshAcceptedLoreBulkToolbar() {
    if (!panelRoot) return;
    const mount = panelRoot.querySelector('.saga-lore-bulk-toolbar');
    if (!mount) return;
    mount.replaceChildren(createAcceptedLoreBulkControls(getState()));
}

let acceptedLoreLayoutFrame = 0;

function scheduleAcceptedLoreLayoutUpdate() {
    if (acceptedLoreLayoutFrame) cancelAnimationFrame(acceptedLoreLayoutFrame);
    acceptedLoreLayoutFrame = requestAnimationFrame(() => {
        acceptedLoreLayoutFrame = requestAnimationFrame(() => {
            acceptedLoreLayoutFrame = 0;
            updateAcceptedLoreScrollRegionHeight();
        });
    });
}

function updateAcceptedLoreScrollRegionHeight() {
    if (!panelRoot) return;
    const drawer = panelRoot.querySelector('.saga-runtime-drawer');
    if (!drawer) return;

    updateDrawerScrollMetrics(drawer);

    const list = drawer.querySelector('.saga-accepted-lore-scroll-region');
    if (!list) return;

    const acceptedSection = list.closest('.saga-accepted-lore-section');
    const acceptedDetails = list.closest('.saga-lore-accepted-collapsible');
    const content = acceptedDetails?.querySelector(':scope > .saga-collapsible-content');

    // Earlier layout code made the accepted-lore section stretch to the bottom of
    // the drawer. That works for a fixed Lorecards tab, but it clips later sections
    // when every Lore section is expanded. The drawer tab is now the outer
    // scroller; accepted lore remains a bounded nested scroller. Clear any stale
    // inline sizing before applying the bounded-scroll CSS variables.
    for (const el of [acceptedDetails, content, acceptedSection, list]) {
        if (!el) continue;
        el.style.removeProperty('height');
        el.style.removeProperty('flex');
        el.style.removeProperty('max-height');
    }

    list.style.setProperty('overflow-y', 'auto');
    list.style.setProperty('overscroll-behavior', 'contain');
}

if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
        const existing = document.getElementById(PANEL_ID);
        const wasMobile = existing?.classList?.contains('saga-runtime-mobile') === true;
        const shouldBeMobile = isRuntimeMobileShell();
        if (existing && wasMobile !== shouldBeMobile) {
            refreshLorePanel();
            scheduleAcceptedLoreLayoutUpdate();
            return;
        }
        clampRuntimeShellToViewport();
        scheduleAcceptedLoreLayoutUpdate();
    });
}

const RELEVANCE_META = {
    high: { label: 'High', color: '#166534', textColor: '#dcfce7', tooltip: 'Current-scene or immediate story relevance. Injects in the High-Relevance lore group.' },
    normal: { label: 'Normal', color: '#1e3a8a', textColor: '#dbeafe', tooltip: 'Recent, branch-defining, or medium-range story relevance. Injects in the Normal-Relevance lore group.' },
    low: { label: 'Low', color: '#4b5563', textColor: '#f9fafb', tooltip: 'Long-term background or distant past/future lore. Injects in the Low-Relevance lore group if enabled.' },
};
const LIFECYCLE_META = RELEVANCE_META;

function getLifecycleStatus(entry) {
    return normalizeLoreRelevance(entry.relevance || entry.lifecycleStatus || entry.lifecycle?.status || entry.lifecycle?.computedStatus || 'normal');
}

function scheduleStateSave(state, delay = MINOR_STATE_SAVE_DEBOUNCE_MS) {
    deferredStateSaveRef = state || deferredStateSaveRef;
    if (deferredStateSaveTimer) clearTimeout(deferredStateSaveTimer);
    deferredStateSaveTimer = setTimeout(() => {
        if (deferredStateSaveRef) saveState(deferredStateSaveRef);
        deferredStateSaveRef = null;
        deferredStateSaveTimer = null;
    }, delay);
}

function flushScheduledStateSave() {
    if (deferredStateSaveTimer) clearTimeout(deferredStateSaveTimer);
    if (deferredStateSaveRef) saveState(deferredStateSaveRef);
    deferredStateSaveRef = null;
    deferredStateSaveTimer = null;
}

// Mutations -------------------------------------------------------------------

function setExperienceMode(mode) {
    const settings = getSettings();
    const result = applyExperienceModeSettings(settings, mode);
    if (!result.changed) return;

    saveSettings(settings);
    const state = getState();
    if (state?.lorePanel) {
        normalizePanelLayoutState(state);
        state.lorePanel.activeTab = normalizeTabForExperience(state.lorePanel.activeTab, settings);
        saveState(state);
    }
}

function setPanelState(patch, options = {}) {
    const state = getState();
    if (!state?.lorePanel) return;
    Object.assign(state.lorePanel, patch || {});
    if (options.deferSave) scheduleStateSave(state);
    else saveState(state);
}

export function resetLorePanelLayout(options = {}) {
    resetRuntimePanelLayout(options);
}

function refreshPanelBody(options = {}) {
    if (!panelRoot) return;
    return runtimeRenderer.refresh(panelRoot, getState(), () => refreshPanelBodyUnsafe(options));
}

function refreshPanelBodyUnsafe(options = {}) {
    if (!panelRoot) return;
    const stateForShell = getState();
    normalizePanelLayoutState(stateForShell);
    if (panelRoot.classList.contains('saga-runtime-mobile')) {
        const mobileTabScroll = getActiveTabScrollElement(panelRoot);
        const mobileTabScrollTop = options.preserveScroll && mobileTabScroll ? mobileTabScroll.scrollTop : 0;
        renderPanelShell(panelRoot, stateForShell);
        if (options.preserveScroll) {
            const restoreMobileScroll = () => {
                const nextMobileTabScroll = getActiveTabScrollElement(panelRoot);
                if (nextMobileTabScroll) nextMobileTabScroll.scrollTop = mobileTabScrollTop;
            };
            restoreMobileScroll();
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(restoreMobileScroll);
        }
        return;
    }
    const body = panelRoot.querySelector('.saga-lore-panel-body');
    if (!body) {
        if (stateForShell?.lorePanel?.drawerOpen === true) renderPanelShell(panelRoot, stateForShell);
        else refreshHeader();
        return;
    }

    const activeNestedScroll = getActiveNestedScrollElement();
    const nestedScrollTop = options.preserveScroll && activeNestedScroll ? activeNestedScroll.scrollTop : 0;
    const tabScroll = getActiveTabScrollElement();
    const tabScrollTop = options.preserveScroll && tabScroll ? tabScroll.scrollTop : 0;
    const drawer = panelRoot.querySelector('.saga-runtime-drawer');
    const drawerScrollTop = options.preserveScroll && drawer ? (drawer.scrollTop || 0) : 0;
    const pageScrollElement = typeof document !== 'undefined' ? document.scrollingElement || document.documentElement : null;
    const pageScrollTop = (options.preserveScroll || options.preserveWindowScroll) && pageScrollElement
        ? pageScrollElement.scrollTop
        : null;
    const pageScrollLeft = (options.preserveScroll || options.preserveWindowScroll) && pageScrollElement
        ? pageScrollElement.scrollLeft
        : null;

    const state = stateForShell;
    renderPanelBody(body, state);
    refreshHeader();

    if (options.preserveScroll) {
        const newTabScroll = getActiveTabScrollElement();
        if (newTabScroll) newTabScroll.scrollTop = tabScrollTop;
        const newNestedScroll = getActiveNestedScrollElement();
        if (newNestedScroll) newNestedScroll.scrollTop = nestedScrollTop;
        if (drawer) drawer.scrollTop = drawerScrollTop;
    }
    updateDrawerScrollMetrics(drawer);

    if ((options.preserveScroll || options.preserveWindowScroll) && pageScrollElement && pageScrollTop !== null) {
        const restorePageScroll = () => {
            pageScrollElement.scrollTop = pageScrollTop;
            pageScrollElement.scrollLeft = pageScrollLeft || 0;
        };
        restorePageScroll();
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(restorePageScroll);
    }
}
