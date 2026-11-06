/**
 * Lore storage sanitization for Saga state persistence.
 */

import { applyLoreLifecycleEvaluation, normalizeLoreEntry } from '../lorecards/lore-matrix.js';
import { computeSpecificityScore, normalizeLoreCanon, normalizeLorePurpose, normalizeLoreRelevance } from '../lorecards/lore-relevance.js';
import { normalizeLoreElevationRecords } from '../lorecards/lore-selection.js';
import { normalizeLoreTimeline } from '../lorecards/lore-timeline.js';
import { stripRetiredStateHistoryFields } from './storage-safety.js';

// ── Storage safety / recovery helpers ─────────────────────────────────────────

export const MAX_PENDING_LORE_ENTRIES = 300;
const MAX_ACCEPTED_LORE_ENTRIES_FOR_AUTOSANITIZE = 0; // 0 = uncapped; never drop accepted lore during storage sanitization

function prePruneStringArray(values, limit = 32, textLimit = 160) {
    const rawValues = Array.isArray(values) ? values : [];
    const seen = new Set();
    const out = [];

    for (const raw of rawValues) {
        const text = truncateText(raw, textLimit).trim();
        if (!text) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(text);
        if (out.length >= limit) break;
    }

    return out;
}

function prePruneLoreEntryForNormalization(entry) {
    if (!entry || typeof entry !== 'object') return entry;

    const pruned = { ...entry };

    if (entry.scope && typeof entry.scope === 'object' && !Array.isArray(entry.scope)) {
        pruned.scope = {
            ...entry.scope,
            characters: prePruneStringArray(entry.scope.characters, 16, 100),
            locations: prePruneStringArray(entry.scope.locations, 12, 100),
            factions: prePruneStringArray(entry.scope.factions, 12, 100),
            topics: prePruneStringArray(entry.scope.topics, 18, 100),
            objects: prePruneStringArray(entry.scope.objects, 12, 100),
            spells: prePruneStringArray(entry.scope.spells, 12, 100),
            schoolYears: prePruneStringArray(entry.scope.schoolYears, 8, 32),
            books: prePruneStringArray(entry.scope.books, 8, 100),
            eras: prePruneStringArray(entry.scope.eras, 8, 100),
        };
    }

    // ActiveWhen is derived/legacy compatibility only. Never preserve massive
    // activeWhen arrays in storage; they can be reconstructed for activation from
    // scope at runtime.
    if (entry.activeWhen && typeof entry.activeWhen === 'object' && !Array.isArray(entry.activeWhen)) {
        pruned.activeWhen = {
            erasAny: prePruneStringArray(entry.activeWhen.erasAny, 8, 100),
            locationsAny: prePruneStringArray(entry.activeWhen.locationsAny, 8, 100),
            charactersPresentAny: prePruneStringArray(entry.activeWhen.charactersPresentAny, 12, 100),
            tagsAny: prePruneStringArray(entry.activeWhen.tagsAny, 12, 100),
        };
    }

    if (entry.content && typeof entry.content === 'object' && !Array.isArray(entry.content)) {
        pruned.content = {
            ...entry.content,
            fact: truncateText(entry.content.fact, 1200),
            injection: truncateText(entry.content.injection, 1200),
            constraints: prePruneStringArray(entry.content.constraints, 8, 260),
            antiLore: prePruneStringArray(entry.content.antiLore, 8, 260),
            notes: truncateText(entry.content.notes, 400),
        };
    }

    pruned.tags = prePruneStringArray(entry.tags, 10, 40);
    const generation = entry.extensions?.sagaGeneration;
    const sagaLoredeck = entry.extensions?.sagaLoredeck;
    const sagaContextGate = entry.extensions?.sagaContextGate;
    const relevanceMigration = entry.extensions?.relevanceMigration;
    const autoRelevance = entry.extensions?.autoRelevance;
    const loreAutomation = entry.extensions?.loreAutomation;
    const pendingReview = entry.extensions?.sagaPendingReview;
    const extensions = {};
    if (generation && typeof generation === 'object') {
        extensions.sagaGeneration = {
            mode: truncateText(generation.mode, 40),
            batchId: truncateText(generation.batchId, 120),
            chunkId: truncateText(generation.chunkId, 180),
            startIndex: Number.isFinite(Number(generation.startIndex)) ? Number(generation.startIndex) : 0,
            endIndex: Number.isFinite(Number(generation.endIndex)) ? Number(generation.endIndex) : 0,
            messageHash: truncateText(generation.messageHash, 32),
            evidenceMessageRefs: prePruneStringArray(generation.evidenceMessageRefs, 20, 32),
            operation: truncateText(generation.operation, 24),
            targetEntryId: truncateText(generation.targetEntryId, 140),
            qualityRoute: truncateText(generation.qualityRoute, 40),
            qualityReason: truncateText(generation.qualityReason, 240),
            similarityRoute: truncateText(generation.similarityRoute, 40),
            similarityReason: truncateText(generation.similarityReason, 240),
            durabilityReason: truncateText(generation.durabilityReason, 240),
            recommendedPin: !!generation.recommendedPin,
            recommendedMute: !!generation.recommendedMute,
            acceptedAsOperation: truncateText(generation.acceptedAsOperation, 24),
            acceptedTargetEntryId: truncateText(generation.acceptedTargetEntryId, 140),
            acceptedAt: Number.isFinite(Number(generation.acceptedAt)) ? Number(generation.acceptedAt) : 0,
            candidateCategory: truncateText(generation.candidateCategory, 60),
            generatedAt: Number.isFinite(Number(generation.generatedAt)) ? Number(generation.generatedAt) : 0,
            targetTotal: Number.isFinite(Number(generation.targetTotal)) ? Number(generation.targetTotal) : 0,
        };
    }
    if (sagaLoredeck && typeof sagaLoredeck === 'object') {
        const compact = compactSagaLoredeckExtension(sagaLoredeck);
        if (compact) extensions.sagaLoredeck = compact;
    }
    if (sagaContextGate && typeof sagaContextGate === 'object') {
        const compact = compactSagaContextGateExtension(sagaContextGate);
        if (compact) extensions.sagaContextGate = compact;
    }
    if (relevanceMigration && typeof relevanceMigration === 'object') extensions.relevanceMigration = {
        migratedAt: Number.isFinite(Number(relevanceMigration.migratedAt)) ? Number(relevanceMigration.migratedAt) : 0,
        previousLifecycleStatus: truncateText(relevanceMigration.previousLifecycleStatus, 40),
        localRelevanceScore: Number.isFinite(Number(relevanceMigration.localRelevanceScore)) ? Number(relevanceMigration.localRelevanceScore) : 0,
        temporalRole: truncateText(relevanceMigration.temporalRole, 40),
    };
    if (autoRelevance && typeof autoRelevance === 'object') extensions.autoRelevance = {
        mode: truncateText(autoRelevance.mode, 20),
        confidence: Number.isFinite(Number(autoRelevance.confidence)) ? Number(autoRelevance.confidence) : 0,
        reason: truncateText(autoRelevance.reason, 240),
        updatedAt: Number.isFinite(Number(autoRelevance.updatedAt)) ? Number(autoRelevance.updatedAt) : 0,
    };
    if (loreAutomation && typeof loreAutomation === 'object') extensions.loreAutomation = compactLoreAutomationExtension(loreAutomation);
    if (pendingReview && typeof pendingReview === 'object') extensions.sagaPendingReview = pendingReview;
    pruned.extensions = extensions;
    return pruned;
}

function truncateText(value, limit = 1000) {
    return String(value || '').slice(0, limit);
}

function compactStringArray(values, limit = 12, textLimit = 160) {
    const rawValues = Array.isArray(values) ? values : [];
    const seen = new Set();
    const out = [];

    for (const raw of rawValues) {
        const text = truncateText(raw, textLimit).trim();
        if (!text) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(text);
        if (out.length >= limit) break;
    }

    return out;
}

function compactStringMapForStorage(value, limit = 16, textLimit = 120) {
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const out = {};
    for (const [key, raw] of Object.entries(input).slice(0, limit)) {
        const cleanKey = truncateText(key, textLimit).trim();
        if (!cleanKey) continue;
        out[cleanKey] = truncateText(raw, textLimit).trim() || 'unknown';
    }
    return out;
}

function compactPlainObjectMapForStorage(value, limit = 16, textLimit = 120) {
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const out = {};
    for (const [key, raw] of Object.entries(input).slice(0, limit)) {
        const cleanKey = truncateText(key, textLimit).trim();
        if (!cleanKey || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        out[cleanKey] = {
            scope: truncateText(raw.scope, 60),
            sortKey: Number.isFinite(Number(raw.sortKey)) ? Number(raw.sortKey) : null,
            precision: truncateText(raw.precision, 80),
            label: truncateText(raw.label, 180),
        };
    }
    return out;
}


function compactSagaLoredeckExtension(sagaLoredeck = {}) {
    if (!sagaLoredeck || typeof sagaLoredeck !== 'object' || Array.isArray(sagaLoredeck)) return null;
    const compact = {
        packId: truncateText(sagaLoredeck.packId, 120),
        packType: truncateText(sagaLoredeck.packType, 40),
        packTitle: truncateText(sagaLoredeck.packTitle, 160),
        file: truncateText(sagaLoredeck.file, 240),
        stackPriority: Number.isFinite(Number(sagaLoredeck.stackPriority)) ? Number(sagaLoredeck.stackPriority) : 0,
        stackIndex: Number.isFinite(Number(sagaLoredeck.stackIndex)) ? Number(sagaLoredeck.stackIndex) : 0,
    };
    return Object.values(compact).some(value => value !== '' && value !== 0) ? compact : null;
}

function compactSagaContextGateExtension(gate = {}) {
    if (!gate || typeof gate !== 'object' || Array.isArray(gate)) return null;
    const compact = {
        status: truncateText(gate.status, 40),
        hasGate: gate.hasGate === true,
        eligible: gate.eligible === true,
        matchedBy: truncateText(gate.matchedBy, 60),
        reason: truncateText(gate.reason, 240),
        packId: truncateText(gate.packId, 120),
    };
    return Object.values(compact).some(value => value !== '' && value !== false) ? compact : null;
}

function hasCompactContextValue(contextGate = {}) {
    if (!contextGate || typeof contextGate !== 'object' || Array.isArray(contextGate)) return false;
    return Object.entries(contextGate).some(([key, value]) => {
        if (key === 'approximate') return value === true;
        if (value === null || value === undefined || value === '') return false;
        return Number.isFinite(Number(value)) || String(value || '').trim() !== '';
    });
}

function compactLoreContextForStorage(contextGate = {}) {
    if (!contextGate || typeof contextGate !== 'object' || Array.isArray(contextGate)) return null;
    const compact = {
        ...(contextGate.invalidNumericBounds === true ? { invalidNumericBounds: true } : {}),
        scope: truncateText(contextGate.scope, 60),
        anchorId: truncateText(contextGate.anchorId, 180),
        validFromAnchor: truncateText(contextGate.validFromAnchor, 180),
        validToAnchor: truncateText(contextGate.validToAnchor, 180),
        arc: truncateText(contextGate.arc, 180),
        arcId: truncateText(contextGate.arcId, 180),
        phase: truncateText(contextGate.phase, 180),
        phaseId: truncateText(contextGate.phaseId, 180),
        season: truncateText(contextGate.season, 80),
        episode: truncateText(contextGate.episode, 80),
        chapter: truncateText(contextGate.chapter, 80),
        issue: truncateText(contextGate.issue, 80),
        quest: truncateText(contextGate.quest, 180),
        gameStage: truncateText(contextGate.gameStage, 180),
        stardateFrom: truncateText(contextGate.stardateFrom, 80),
        stardateTo: truncateText(contextGate.stardateTo, 80),
        // Context has already been normalized; coercing null here invents a zero bound.
        sortKeyFrom: Number.isFinite(contextGate.sortKeyFrom) ? contextGate.sortKeyFrom : null,
        sortKeyTo: Number.isFinite(contextGate.sortKeyTo) ? contextGate.sortKeyTo : null,
        precision: truncateText(contextGate.precision, 80),
        windowKind: truncateText(contextGate.windowKind, 80),
        label: truncateText(contextGate.label, 180),
        approximate: contextGate.approximate === true,
    };
    return hasCompactContextValue(compact) ? compact : null;
}

function compactLoreCoordinatesForStorage(coordinates = []) {
    return (Array.isArray(coordinates) ? coordinates : [])
        .map(coordinate => {
            if (!coordinate || typeof coordinate !== 'object' || Array.isArray(coordinate)) return null;
            const compact = {
                axis: truncateText(coordinate.axis, 120),
                id: truncateText(coordinate.id, 160),
                label: truncateText(coordinate.label, 180),
                from: truncateText(coordinate.from, 180),
                to: truncateText(coordinate.to, 180),
                sortKeyFrom: Number.isFinite(coordinate.sortKeyFrom) ? coordinate.sortKeyFrom : null,
                sortKeyTo: Number.isFinite(coordinate.sortKeyTo) ? coordinate.sortKeyTo : null,
                confidence: Number.isFinite(Number(coordinate.confidence)) ? Math.max(0, Math.min(1, Number(coordinate.confidence))) : 1,
                required: coordinate.required !== false,
            };
            return hasCompactContextValue(compact) ? compact : null;
        })
        .filter(Boolean)
        .slice(0, 24);
}

function compactLoreExtensionsForStorage(normalized) {
    const out = {};
    const generation = normalized?.extensions?.sagaGeneration;
    if (generation && typeof generation === 'object') {
        out.sagaGeneration = {
            mode: truncateText(generation.mode, 40),
            batchId: truncateText(generation.batchId, 120),
            chunkId: truncateText(generation.chunkId, 180),
            startIndex: Number.isFinite(Number(generation.startIndex)) ? Number(generation.startIndex) : 0,
            endIndex: Number.isFinite(Number(generation.endIndex)) ? Number(generation.endIndex) : 0,
            messageHash: truncateText(generation.messageHash, 32),
            evidenceMessageRefs: compactStringArray(generation.evidenceMessageRefs, 20, 32),
            operation: truncateText(generation.operation, 24),
            targetEntryId: truncateText(generation.targetEntryId, 140),
            qualityRoute: truncateText(generation.qualityRoute, 40),
            qualityReason: truncateText(generation.qualityReason, 240),
            similarityRoute: truncateText(generation.similarityRoute, 40),
            similarityReason: truncateText(generation.similarityReason, 240),
            durabilityReason: truncateText(generation.durabilityReason, 240),
            recommendedPin: !!generation.recommendedPin,
            recommendedMute: !!generation.recommendedMute,
            acceptedAsOperation: truncateText(generation.acceptedAsOperation, 24),
            acceptedTargetEntryId: truncateText(generation.acceptedTargetEntryId, 140),
            acceptedAt: Number.isFinite(Number(generation.acceptedAt)) ? Number(generation.acceptedAt) : 0,
            candidateCategory: truncateText(generation.candidateCategory, 60),
            generatedAt: Number.isFinite(Number(generation.generatedAt)) ? Number(generation.generatedAt) : 0,
            targetTotal: Number.isFinite(Number(generation.targetTotal)) ? Number(generation.targetTotal) : 0,
        };
    }
    const sagaLoredeck = normalized?.extensions?.sagaLoredeck;
    const compactLoredeck = compactSagaLoredeckExtension(sagaLoredeck);
    if (compactLoredeck) out.sagaLoredeck = compactLoredeck;
    const sagaContextGate = normalized?.extensions?.sagaContextGate;
    const compactContextGate = compactSagaContextGateExtension(sagaContextGate);
    if (compactContextGate) out.sagaContextGate = compactContextGate;
    const relevanceMigration = normalized?.extensions?.relevanceMigration;
    if (relevanceMigration && typeof relevanceMigration === 'object') out.relevanceMigration = {
        migratedAt: Number.isFinite(Number(relevanceMigration.migratedAt)) ? Number(relevanceMigration.migratedAt) : 0,
        previousLifecycleStatus: truncateText(relevanceMigration.previousLifecycleStatus, 40),
        localRelevanceScore: Number.isFinite(Number(relevanceMigration.localRelevanceScore)) ? Number(relevanceMigration.localRelevanceScore) : 0,
        temporalRole: truncateText(relevanceMigration.temporalRole, 40),
    };
    const autoRelevance = normalized?.extensions?.autoRelevance;
    if (autoRelevance && typeof autoRelevance === 'object') out.autoRelevance = {
        mode: truncateText(autoRelevance.mode, 20),
        confidence: Number.isFinite(Number(autoRelevance.confidence)) ? Number(autoRelevance.confidence) : 0,
        reason: truncateText(autoRelevance.reason, 240),
        updatedAt: Number.isFinite(Number(autoRelevance.updatedAt)) ? Number(autoRelevance.updatedAt) : 0,
    };
    const loreAutomation = normalized?.extensions?.loreAutomation;
    if (loreAutomation && typeof loreAutomation === 'object') out.loreAutomation = compactLoreAutomationExtension(loreAutomation);
    const pendingReview = normalized?.extensions?.sagaPendingReview;
    if (pendingReview && typeof pendingReview === 'object') out.sagaPendingReview = pendingReview;
    return Object.keys(out).length ? out : undefined;
}

function compactLoreAutomationExtension(value = {}) {
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
        enabled: raw.enabled !== false,
        enabledAt: Number.isFinite(Number(raw.enabledAt)) ? Number(raw.enabledAt) : 0,
        enabledBy: truncateText(raw.enabledBy, 32),
        disabledReason: truncateText(raw.disabledReason, 80),
        disabledAt: Number.isFinite(Number(raw.disabledAt)) ? Number(raw.disabledAt) : 0,
        disabledBy: truncateText(raw.disabledBy, 32),
        lastAction: truncateText(raw.lastAction, 48),
        lastReason: truncateText(raw.lastReason, 240),
        lastRunId: truncateText(raw.lastRunId, 120),
        lastTouchedAt: Number.isFinite(Number(raw.lastTouchedAt)) ? Number(raw.lastTouchedAt) : 0,
        lastProvider: truncateText(raw.lastProvider, 24),
        owner: truncateText(raw.owner, 24) || 'imported',
    };
}

function compactLoreAutomationAction(value = {}) {
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
        id: truncateText(raw.id, 160),
        suggestionId: truncateText(raw.suggestionId, 180),
        cardId: truncateText(raw.cardId || raw.targetId || raw.id, 140),
        targetId: truncateText(raw.targetId || raw.cardId || raw.id, 140),
        candidateId: truncateText(raw.candidateId, 180),
        title: truncateText(raw.title, 180),
        operation: truncateText(raw.operation, 48),
        sourceRef: truncateText(raw.sourceRef, 220),
        source: truncateText(raw.source, 24),
        confidence: Number.isFinite(Number(raw.confidence)) ? Number(raw.confidence) : 0,
        localConfidence: Number.isFinite(Number(raw.localConfidence)) ? Number(raw.localConfidence) : 0,
        semanticConfidence: Number.isFinite(Number(raw.semanticConfidence)) ? Number(raw.semanticConfidence) : 0,
        policyConfidence: Number.isFinite(Number(raw.policyConfidence)) ? Number(raw.policyConfidence) : 0,
        provider: truncateText(raw.provider, 24),
        reason: truncateText(raw.reason, 240),
        skipped: raw.skipped === true,
        skipReason: truncateText(raw.skipReason, 120),
        before: raw.before && typeof raw.before === 'object' && !Array.isArray(raw.before) ? raw.before : {},
        after: raw.after && typeof raw.after === 'object' && !Array.isArray(raw.after) ? raw.after : {},
    };
}

function compactLoreAutomationRun(value = {}) {
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const summary = raw.summary && typeof raw.summary === 'object' && !Array.isArray(raw.summary) ? raw.summary : {};
    const actions = Array.isArray(raw.actions) ? raw.actions : (Array.isArray(raw.operations) ? raw.operations : []);
    return {
        id: truncateText(raw.id, 120),
        mode: truncateText(raw.mode, 16),
        style: truncateText(raw.style, 16),
        startedAt: Number.isFinite(Number(raw.startedAt)) ? Number(raw.startedAt) : 0,
        finishedAt: Number.isFinite(Number(raw.finishedAt)) ? Number(raw.finishedAt) : 0,
        status: truncateText(raw.status, 40),
        providerStatus: truncateText(raw.providerStatus, 60),
        modelStatus: truncateText(raw.modelStatus, 40),
        modelError: truncateText(raw.modelError, 180),
        considered: Number.isFinite(Number(raw.considered)) ? Number(raw.considered) : (Number.isFinite(Number(summary.considered)) ? Number(summary.considered) : 0),
        changed: Number.isFinite(Number(raw.changed)) ? Number(raw.changed) : 0,
        suggested: Number.isFinite(Number(raw.suggested)) ? Number(raw.suggested) : 0,
        promotions: Number.isFinite(Number(raw.promotions)) ? Number(raw.promotions) : (Number.isFinite(Number(summary.promoted)) ? Number(summary.promoted) : 0),
        demotions: Number.isFinite(Number(raw.demotions)) ? Number(raw.demotions) : (Number.isFinite(Number(summary.demoted)) ? Number(summary.demoted) : 0),
        pinned: Number.isFinite(Number(raw.pinned)) ? Number(raw.pinned) : (Number.isFinite(Number(summary.pinned)) ? Number(summary.pinned) : 0),
        unpinned: Number.isFinite(Number(raw.unpinned)) ? Number(raw.unpinned) : (Number.isFinite(Number(summary.unpinned)) ? Number(summary.unpinned) : 0),
        muted: Number.isFinite(Number(raw.muted)) ? Number(raw.muted) : (Number.isFinite(Number(summary.muted)) ? Number(summary.muted) : 0),
        unmuted: Number.isFinite(Number(raw.unmuted)) ? Number(raw.unmuted) : (Number.isFinite(Number(summary.unmuted)) ? Number(summary.unmuted) : 0),
        curated: Number.isFinite(Number(raw.curated)) ? Number(raw.curated) : (Number.isFinite(Number(summary.accepted)) ? Number(summary.accepted) : 0),
        pendingCurated: Number.isFinite(Number(raw.pendingCurated)) ? Number(raw.pendingCurated) : 0,
        retired: Number.isFinite(Number(raw.retired)) ? Number(raw.retired) : (Number.isFinite(Number(summary.retired)) ? Number(summary.retired) : 0),
        recentMessageChars: Number.isFinite(Number(raw.recentMessageChars)) ? Number(raw.recentMessageChars) : 0,
        ranAt: Number.isFinite(Number(raw.ranAt)) ? Number(raw.ranAt) : 0,
        summary: {
            promoted: Number.isFinite(Number(summary.promoted)) ? Number(summary.promoted) : 0,
            demoted: Number.isFinite(Number(summary.demoted)) ? Number(summary.demoted) : 0,
            pinned: Number.isFinite(Number(summary.pinned)) ? Number(summary.pinned) : 0,
            unpinned: Number.isFinite(Number(summary.unpinned)) ? Number(summary.unpinned) : 0,
            muted: Number.isFinite(Number(summary.muted)) ? Number(summary.muted) : 0,
            unmuted: Number.isFinite(Number(summary.unmuted)) ? Number(summary.unmuted) : 0,
            accepted: Number.isFinite(Number(summary.accepted)) ? Number(summary.accepted) : 0,
            retired: Number.isFinite(Number(summary.retired)) ? Number(summary.retired) : 0,
            skipped: Number.isFinite(Number(summary.skipped)) ? Number(summary.skipped) : 0,
            considered: Number.isFinite(Number(summary.considered)) ? Number(summary.considered) : 0,
        },
        actions: actions.slice(0, 120).map(compactLoreAutomationAction),
        operations: actions.slice(0, 120).map(compactLoreAutomationAction),
    };
}

function compactLoreAutomationCardNumberMap(value = {}, limit = 240) {
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return Object.fromEntries(
        Object.entries(raw)
            .slice(-limit)
            .map(([key, val]) => [truncateText(key, 140), Number.isFinite(Number(val)) ? Number(val) : 0])
            .filter(([key]) => key)
    );
}

function compactLoreAutomationCadence(value = {}) {
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const classifier = raw.lastEdgeClassifier && typeof raw.lastEdgeClassifier === 'object' && !Array.isArray(raw.lastEdgeClassifier)
        ? raw.lastEdgeClassifier
        : {};
    return {
        lastRemapAtMessageId: truncateText(raw.lastRemapAtMessageId, 120),
        lastRemapWordCount: Number.isFinite(Number(raw.lastRemapWordCount)) ? Number(raw.lastRemapWordCount) : 0,
        lastCurationAtMessageId: truncateText(raw.lastCurationAtMessageId, 120),
        lastCurationWordCount: Number.isFinite(Number(raw.lastCurationWordCount)) ? Number(raw.lastCurationWordCount) : 0,
        accumulatedRemapWords: Number.isFinite(Number(raw.accumulatedRemapWords)) ? Number(raw.accumulatedRemapWords) : 0,
        accumulatedCurationWords: Number.isFinite(Number(raw.accumulatedCurationWords)) ? Number(raw.accumulatedCurationWords) : 0,
        lastContextHash: truncateText(raw.lastContextHash, 160),
        lastDeckStackHash: truncateText(raw.lastDeckStackHash, 160),
        lastAcceptedAutomationHash: truncateText(raw.lastAcceptedAutomationHash, 160),
        pendingReason: truncateText(raw.pendingReason, 180),
        lastEdgeClassifier: {
            edge: truncateText(classifier.edge || 'none', 40),
            confidence: Number.isFinite(Number(classifier.confidence)) ? Math.max(0, Math.min(1, Number(classifier.confidence))) : 0,
            changed: compactStringArray(classifier.changed, 12, 60),
            reason: truncateText(classifier.reason, 180),
            wordCount: Number.isFinite(Number(classifier.wordCount)) ? Number(classifier.wordCount) : 0,
            checkedAt: Number.isFinite(Number(classifier.checkedAt)) ? Number(classifier.checkedAt) : 0,
        },
        staleEvidenceByCardId: compactLoreAutomationCardNumberMap(raw.staleEvidenceByCardId, 240),
        cooldownByCardId: compactLoreAutomationCardNumberMap(raw.cooldownByCardId, 240),
    };
}

function compactLoreEntryForStorage(entry) {
    const normalized = normalizeLoreEntry(prePruneLoreEntryForNormalization(entry || {}));
    const contextBlock = compactLoreContextForStorage(normalized.context);
    const coordinates = compactLoreCoordinatesForStorage(normalized.coordinates);
    return {
        schemaVersion: normalized.schemaVersion || 2,
        id: truncateText(normalized.id, 140),
        title: truncateText(normalized.title, 180),
        kind: normalized.kind || 'fact',
        gateType: normalized.gateType || normalized.kind || 'fact',
        category: normalized.category || 'other',
        relevance: normalizeLoreRelevance(normalized.relevance || 'normal'),
        lorePurpose: normalizeLorePurpose(normalized.lorePurpose || normalized.purpose, normalized),
        specificityScore: Number.isFinite(Number(normalized.specificityScore)) ? Math.max(0, Math.min(100, Number(normalized.specificityScore))) : computeSpecificityScore(normalized),
        injectableByDefault: normalized.injectableByDefault !== false,
        canon: normalizeLoreCanon(normalized.canon || normalized.canonStatus, normalized.source || normalized.sourceInfo?.work || ''),
        canonStatus: normalizeLoreCanon(normalized.canon || normalized.canonStatus, normalized.source || normalized.sourceInfo?.work || ''),
        truthStatus: normalized.truthStatus || 'true',
        revealPolicy: normalized.revealPolicy || 'private',
        tags: compactStringArray(normalized.tags, 10, 40),
        priority: Number.isFinite(Number(normalized.priority)) ? Number(normalized.priority) : 50,
        status: normalized.status || 'active',
        protected: !!normalized.protected,
        locked: !!normalized.locked,
        userEditable: normalized.userEditable !== false,
        userEdited: !!normalized.userEdited,
        branchId: truncateText(normalized.branchId, 100) || 'main',
        date: {
            validFrom: truncateText(normalized.date?.validFrom || normalized.validFrom, 32),
            validTo: truncateText(normalized.date?.validTo || normalized.validTo, 32),
            precision: truncateText(normalized.date?.precision, 32),
            schoolYear: normalized.date?.schoolYear ?? null,
            book: truncateText(normalized.date?.book, 100),
            era: truncateText(normalized.date?.era, 100),
            label: truncateText(normalized.date?.label, 140),
        },
        canonTiming: {
            canonExpectedFrom: truncateText(normalized.canonTiming?.canonExpectedFrom, 32),
            canonExpectedUntil: truncateText(normalized.canonTiming?.canonExpectedUntil, 32),
            hardValidFrom: truncateText(normalized.canonTiming?.hardValidFrom, 32),
            hardValidTo: truncateText(normalized.canonTiming?.hardValidTo, 32),
            precision: truncateText(normalized.canonTiming?.precision, 32),
            schoolYear: normalized.canonTiming?.schoolYear ?? null,
            book: truncateText(normalized.canonTiming?.book, 100),
            label: truncateText(normalized.canonTiming?.label, 140),
        },
        ...(contextBlock ? { context: contextBlock } : {}),
        ...(coordinates.length ? { coordinates } : {}),
        activation: {
            requiresEvents: compactStringArray(normalized.activation?.requiresEvents, 10, 100),
            requiresMissingEvents: compactStringArray(normalized.activation?.requiresMissingEvents, 10, 100),
            requiresCharacters: compactStringArray(normalized.activation?.requiresCharacters, 10, 100),
            requiresLocation: compactStringArray(normalized.activation?.requiresLocation, 5, 100),
            requiresTopics: compactStringArray(normalized.activation?.requiresTopics, 10, 100),
            requiresCanonStrictness: truncateText(normalized.activation?.requiresCanonStrictness, 32),
        },
        expiration: {
            expiresWhenEventsHappen: compactStringArray(normalized.expiration?.expiresWhenEventsHappen, 10, 100),
            expiresWhenEntriesActive: compactStringArray(normalized.expiration?.expiresWhenEntriesActive, 10, 100),
            autoMuteOnExpire: normalized.expiration?.autoMuteOnExpire !== false,
        },
        lifecycle: {
            status: truncateText(normalized.lifecycle?.status, 32),
            computedStatus: truncateText(normalized.lifecycle?.computedStatus, 32),
            manualOverride: !!normalized.lifecycle?.manualOverride,
            expired: !!normalized.lifecycle?.expired,
            expiredAt: truncateText(normalized.lifecycle?.expiredAt, 32),
            expiredReason: truncateText(normalized.lifecycle?.expiredReason, 200),
            autoMutedOnExpire: !!normalized.lifecycle?.autoMutedOnExpire,
            lastEvaluatedAt: Number.isFinite(Number(normalized.lifecycle?.lastEvaluatedAt)) ? Number(normalized.lifecycle.lastEvaluatedAt) : 0,
            lastEvaluatedDate: truncateText(normalized.lifecycle?.lastEvaluatedDate, 32),
            reason: truncateText(normalized.lifecycle?.reason, 200),
        },
        scope: {
            characters: compactStringArray(normalized.scope?.characters, 12, 100),
            locations: compactStringArray(normalized.scope?.locations, 10, 100),
            factions: compactStringArray(normalized.scope?.factions, 10, 100),
            topics: compactStringArray(normalized.scope?.topics, 14, 100),
            objects: compactStringArray(normalized.scope?.objects, 10, 100),
            spells: compactStringArray(normalized.scope?.spells, 10, 100),
            schoolYears: compactStringArray(normalized.scope?.schoolYears, 8, 32),
            books: compactStringArray(normalized.scope?.books, 8, 100),
            eras: compactStringArray(normalized.scope?.eras, 8, 100),
        },
        visibility: {
            publicFrom: truncateText(normalized.visibility?.publicFrom, 32),
            secretUntil: truncateText(normalized.visibility?.secretUntil, 32),
            knownBy: compactStringMapForStorage(normalized.visibility?.knownBy, 16, 120),
            notKnownByBefore: compactStringMapForStorage(normalized.visibility?.notKnownByBefore, 16, 120),
            knownByAtContext: compactPlainObjectMapForStorage(normalized.visibility?.knownByAtContext, 16, 120),
            notKnownByBeforeContext: compactPlainObjectMapForStorage(normalized.visibility?.notKnownByBeforeContext, 16, 120),
            neverKnownBy: compactStringArray(normalized.visibility?.neverKnownBy, 16, 120),
            publicFromContext: normalized.visibility?.publicFromContext || {},
            secretUntilContext: normalized.visibility?.secretUntilContext || {},
            suspectedBy: compactStringMapForStorage(normalized.visibility?.suspectedBy, 12, 120),
        },
        retrieval: {
            activation: truncateText(normalized.retrieval?.activation, 40),
            frequency: truncateText(normalized.retrieval?.frequency, 40),
            contextBoost: truncateText(normalized.retrieval?.contextBoost, 40),
            triggers: {
                charactersAny: compactStringArray(normalized.retrieval?.triggers?.charactersAny, 12, 100),
                locationsAny: compactStringArray(normalized.retrieval?.triggers?.locationsAny, 10, 100),
                topicsAny: compactStringArray(normalized.retrieval?.triggers?.topicsAny, 20, 100),
                erasAny: compactStringArray(normalized.retrieval?.triggers?.erasAny, 8, 100),
            },
        },
        content: {
            fact: truncateText(normalized.content?.fact || normalized.fact, 1200),
            injection: truncateText(normalized.content?.injection, 1200),
            constraints: compactStringArray(normalized.content?.constraints, 8, 260),
            antiLore: compactStringArray(normalized.content?.antiLore, 8, 260),
            publicVersion: truncateText(normalized.content?.publicVersion, 500),
            notes: truncateText(normalized.content?.notes || normalized.notes, 600),
        },
        fact: truncateText(normalized.fact || normalized.content?.fact, 1200),
        source: typeof normalized.source === 'string' ? truncateText(normalized.source, 180) : 'saga',
        sourceInfo: {
            work: truncateText(normalized.sourceInfo?.work, 100),
            book: truncateText(normalized.sourceInfo?.book, 100),
            chapter: truncateText(normalized.sourceInfo?.chapter, 100),
            confidence: normalized.sourceInfo?.confidence,
        },
        extensions: compactLoreExtensionsForStorage(normalized),
    };
}

function compactCompressionStatusForStorage(status) {
    if (!status || typeof status !== 'object' || Array.isArray(status)) return status;
    const out = { ...status };
    const signature = typeof out.lastSignature === 'string' ? out.lastSignature : '';
    if (signature.length > 1200 || signature.includes('"directText"')) {
        out.lastSignature = '';
    }
    return out;
}

export function sanitizeCompressionStatusesForStorage(state) {
    if (!state || typeof state !== 'object') return state;
    state.continuityCompressionStatus = compactCompressionStatusForStorage(state.continuityCompressionStatus || {});
    state.loreCompressionStatus = compactCompressionStatusForStorage(state.loreCompressionStatus || {});
    if (state.loreCompressionStatusByRelevance && typeof state.loreCompressionStatusByRelevance === 'object' && !Array.isArray(state.loreCompressionStatusByRelevance)) {
        state.loreCompressionStatusByRelevance = Object.fromEntries(
            Object.entries(state.loreCompressionStatusByRelevance)
                .map(([tier, status]) => [tier, compactCompressionStatusForStorage(status || {})])
        );
    }
    return state;
}

export function sanitizeLoreArraysForStorage(state) {
    if (!state || typeof state !== 'object') return state;
    sanitizeCompressionStatusesForStorage(state);

    if (Array.isArray(state.pendingLoreEntries)) {
        state.pendingLoreEntries = state.pendingLoreEntries
            .slice(0, MAX_PENDING_LORE_ENTRIES)
            .map(compactLoreEntryForStorage);
    } else {
        state.pendingLoreEntries = [];
    }

    if (Array.isArray(state.loreMatrix)) {
        if (!state.loreSelection || typeof state.loreSelection !== 'object') state.loreSelection = { pinnedIds: [], suppressedIds: [], elevated: {} };
        state.loreSelection.pinnedIds = Array.isArray(state.loreSelection.pinnedIds) ? state.loreSelection.pinnedIds : [];
        state.loreSelection.suppressedIds = Array.isArray(state.loreSelection.suppressedIds) ? state.loreSelection.suppressedIds : [];
        state.loreSelection.elevated = normalizeLoreElevationRecords(state.loreSelection.elevated || {});
        const suppressedSet = new Set(state.loreSelection.suppressedIds);
        const elevatedRecords = state.loreSelection.elevated;
        const cap = Number(MAX_ACCEPTED_LORE_ENTRIES_FOR_AUTOSANITIZE) || 0;
        const limited = cap > 0 && state.loreMatrix.length > cap
            ? state.loreMatrix.slice(-cap)
            : state.loreMatrix;
        const acceptedIds = new Set(limited.map(entry => String(entry?.id || '').trim()).filter(Boolean));
        for (const id of [...suppressedSet]) {
            if (!acceptedIds.has(id)) suppressedSet.delete(id);
        }
        for (const id of Object.keys(elevatedRecords)) {
            if (!acceptedIds.has(id)) delete elevatedRecords[id];
        }
        state.loreMatrix = limited.map(raw => {
            // Relevance-tier architecture: lifecycle/date evaluation may add review
            // metadata, but it must not secretly mutate mute/injection state. Mute is
            // the only hard injection exclusion control.
            let evaluated = raw;
            try { evaluated = applyLoreLifecycleEvaluation(raw, state); } catch (_) { evaluated = raw; }
            return compactLoreEntryForStorage(evaluated);
        });
        state.loreSelection.suppressedIds = Array.from(suppressedSet);
        state.loreSelection.elevated = elevatedRecords;
    } else {
        state.loreMatrix = [];
    }

    stripRetiredStateHistoryFields(state);

    state.loreTimeline = normalizeLoreTimeline(state.loreTimeline || {});

    if (state.pendingLoreEntries.length === 0) {
        state.pendingLoreMeta = null;
    }

    if (Array.isArray(state.autoRelevanceSuggestions)) {
        state.autoRelevanceSuggestions = state.autoRelevanceSuggestions.slice(0, 100).map(s => ({
            id: truncateText(s?.id, 140),
            title: truncateText(s?.title, 180),
            currentRelevance: truncateText(s?.currentRelevance, 20),
            suggestedRelevance: truncateText(s?.suggestedRelevance, 20),
            confidence: Number.isFinite(Number(s?.confidence)) ? Number(s.confidence) : 0,
            score: Number.isFinite(Number(s?.score)) ? Number(s.score) : 0,
            temporalRole: truncateText(s?.temporalRole, 40),
            source: truncateText(s?.source, 20),
            reason: truncateText(s?.reason, 240),
            suggestedAt: Number.isFinite(Number(s?.suggestedAt)) ? Number(s.suggestedAt) : 0,
        })).filter(s => s.id && s.suggestedRelevance);
    } else {
        state.autoRelevanceSuggestions = [];
    }

    if (Array.isArray(state.loreAutomationSuggestions)) {
        state.loreAutomationSuggestions = state.loreAutomationSuggestions.slice(0, 120).map(compactLoreAutomationAction)
            .filter(s => s.cardId || s.candidateId);
    } else {
        state.loreAutomationSuggestions = [];
    }

    const runLimit = Math.max(1, Math.min(100, Number(state.loreAutomationRunJournalLimit) || 20));
    if (Array.isArray(state.loreAutomationRuns)) {
        state.loreAutomationRuns = state.loreAutomationRuns.slice(-runLimit).map(compactLoreAutomationRun).filter(run => run.id);
    } else {
        state.loreAutomationRuns = [];
    }
    state.loreAutomationLastRun = state.loreAutomationLastRun && typeof state.loreAutomationLastRun === 'object' && !Array.isArray(state.loreAutomationLastRun)
        ? compactLoreAutomationRun(state.loreAutomationLastRun)
        : null;
    state.loreAutomationCadence = compactLoreAutomationCadence(state.loreAutomationCadence);

    return state;
}
