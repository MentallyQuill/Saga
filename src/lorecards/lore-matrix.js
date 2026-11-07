/**
 * lore-matrix.js — Saga
 * Pure helpers for lore normalization, activation, and merging.
 * No SillyTavern calls. All functions are pure or use only their arguments.
 *
 * Imported by: state-manager.js, memo-builder.js, lore-generator.js, src/extension/index.js
 */

import {
    LORE_RELEVANCE_TIERS,
    normalizeLoreRelevance,
    normalizeLoreCanon,
    normalizeLoreCategory,
    sortLoreEntriesForInjection,
    computeLocalLoreRelevance,
    normalizeLorePurpose,
    computeSpecificityScore,
} from './lore-relevance.js';
import { getLoreEntryEffectiveRelevance, getLoreSelectionSets } from './lore-selection.js';

const DEFAULT_CATEGORIES = [
    'character', 'event', 'location', 'item', 'spell', 'faction', 'relationship', 'rule', 'timeline',
    'knowledge', 'secret', 'other',
];

const DEFAULT_CANON_STATUS = ['canon', 'au'];

export const LORE_RELEVANCE_STATUSES = LORE_RELEVANCE_TIERS;
// Compatibility export for older UI/import paths. Lifecycle is deprecated; Relevance is the user-facing control.
export const LORE_LIFECYCLE_STATUSES = ['high', 'normal', 'low'];

export const INJECTABLE_LIFECYCLE_STATUSES = new Set(['active', 'canon_overdue']);

const VALID_STATUS = new Set([
    'active', 'disabled', 'pinned', 'archived',
]);

const VALID_TIME_TRAVEL_MODES = new Set([
    'none', 'visitor_from_future', 'past_changed', 'alternate_branch',
]);

const KNOWN_TOP_LEVEL_FIELDS = new Set([
    'schemaVersion', 'id', 'title', 'name', 'kind', 'gateType', 'category', 'canonStatus', 'canon', 'relevance', 'lorePurpose', 'specificityScore', 'injectableByDefault', 'truthStatus',
    'revealPolicy', 'tags', 'priority', 'status', 'protected', 'locked', 'userEditable', 'userEdited',
    'date', 'canonTiming', 'context', 'coordinates', 'activation', 'expiration', 'lifecycle', 'scope', 'visibility', 'retrieval', 'content', 'effects', 'source', 'sourceInfo', 'ui', 'extensions',
    // legacy aliases
    'fact', 'description', 'detail', 'text', 'summary', 'notes', 'validFrom', 'validTo', 'branchId',
    'whoKnowsTruth', 'whoSuspects', 'whoBelievesPublicVersion', 'publicVersion', 'activeWhen',
    'appliesTo', 'confidence',
]);

function asString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function asStringArray(value) {
    if (Array.isArray(value)) {
        return value
            .flatMap(v => Array.isArray(v) ? v : [v])
            .map(v => typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '')
            .filter(Boolean);
    }
    if (typeof value === 'string') {
        return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
}

function uniqueLimitedStringArray(values, limit = 32) {
    if (values === undefined || values === null) return [];
    const seen = new Set();
    const out = [];

    for (const raw of asStringArray(values)) {
        const text = String(raw || '').trim();
        if (!text) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(text);
        if (out.length >= limit) break;
    }

    return out;
}

function asFirstString(...values) {
    for (const value of values) {
        if (value && typeof value === 'object' && !Array.isArray(value)) continue;
        const text = asString(value);
        if (text) return text;
    }
    return '';
}

function asLooseString(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    return '';
}

function asFirstLooseString(...values) {
    for (const value of values) {
        if (value && typeof value === 'object' && !Array.isArray(value)) continue;
        const text = asLooseString(value);
        if (text) return text;
    }
    return '';
}

function asOptionalNumber(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function asPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asBoolean(value, fallback = false) {
    return typeof value === 'boolean' ? value : fallback;
}

function asPriority(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 50;
    if (n >= 95) return 100;
    if (n >= 85) return 90;
    if (n >= 70) return 75;
    if (n >= 50) return 50;
    if (n >= 25) return 25;
    return 10;
}

function stableIdFromTitle(title, fallback = 'lore_entry') {
    const base = String(title || fallback)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 72);

    return base || fallback;
}

const SIMPLE_LORE_TAG = /^[A-Za-z0-9_-]+$/;

export function normalizeLoreTag(value) {
    const text = String(value || '').trim();
    if (SIMPLE_LORE_TAG.test(text)) return text.slice(0, 32);

    const cleaned = text
        .replace(/[\r\n]+/g, ' ')
        .replace(/[^\p{L}\p{N} _-]+/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned.includes(' ')) return cleaned.slice(0, 32);

    const words = cleaned.split(' ');
    const compact = words.length > 3 ? words.slice(0, 3).join(' ') : cleaned;
    return compact.slice(0, 32).trim();
}

function normalizeLoreTags(value, limit = 10) {
    const seen = new Set();
    const output = [];

    for (const raw of asStringArray(value)) {
        const tag = normalizeLoreTag(raw);
        const key = tag.toLowerCase();
        if (!tag || seen.has(key)) continue;
        seen.add(key);
        output.push(tag);
        if (output.length >= limit) break;
    }

    return output;
}

function normalizeStringMap(value) {
    if (Array.isArray(value)) {
        return Object.fromEntries(asStringArray(value).map(v => [v, 'unknown']));
    }
    const input = asPlainObject(value);
    const out = {};
    for (const [key, val] of Object.entries(input)) {
        const cleanKey = asString(key);
        if (!cleanKey) continue;
        if (Array.isArray(val)) out[cleanKey] = asStringArray(val).join(', ');
        else if (val && typeof val === 'object') out[cleanKey] = JSON.stringify(val);
        else out[cleanKey] = asString(val) || String(val ?? '').trim() || 'unknown';
    }
    return out;
}

function stringMapKeys(value) {
    return Object.keys(normalizeStringMap(value));
}

function normalizePlainObjectMap(value) {
    const input = asPlainObject(value);
    const out = {};
    for (const [key, raw] of Object.entries(input)) {
        const cleanKey = asString(key);
        if (!cleanKey) continue;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) out[cleanKey] = { ...raw };
        else if (Array.isArray(raw)) out[cleanKey] = [...raw];
        else out[cleanKey] = raw;
    }
    return out;
}

function preserveUnknownFields(input) {
    const unknown = {};
    for (const [key, value] of Object.entries(asPlainObject(input))) {
        if (!KNOWN_TOP_LEVEL_FIELDS.has(key)) {
            unknown[key] = value;
        }
    }
    return unknown;
}

function mergeExtensions(input) {
    const extensions = { ...asPlainObject(input.extensions) };
    const unknown = preserveUnknownFields(input);
    if (Object.keys(unknown).length) {
        extensions.unrecognized = {
            ...(asPlainObject(extensions.unrecognized)),
            ...unknown,
        };
    }
    return extensions;
}

function normalizeDateBlock(input) {
    const raw = asPlainObject(input.date);
    return {
        validFrom: asFirstString(raw.validFrom, input.validFrom),
        validTo: asFirstString(raw.validTo, input.validTo),
        precision: asFirstString(raw.precision, input.datePrecision) || 'unknown',
        schoolYear: raw.schoolYear ?? input.schoolYear ?? null,
        book: asFirstString(raw.book, input.book),
        era: asFirstString(raw.era, input.era),
        label: asFirstString(raw.label, input.dateLabel),
        approximate: asBoolean(raw.approximate, false),
    };
}

function normalizeCanonTiming(input) {
    const raw = asPlainObject(input.canonTiming);
    const date = asPlainObject(input.date);
    return {
        canonExpectedFrom: asFirstString(raw.canonExpectedFrom, input.canonExpectedFrom),
        canonExpectedUntil: asFirstString(raw.canonExpectedUntil, input.canonExpectedUntil),
        hardValidFrom: asFirstString(raw.hardValidFrom, input.hardValidFrom),
        hardValidTo: asFirstString(raw.hardValidTo, input.hardValidTo),
        precision: asFirstString(raw.precision, date.precision, input.datePrecision) || 'unknown',
        schoolYear: raw.schoolYear ?? date.schoolYear ?? input.schoolYear ?? null,
        book: asFirstString(raw.book, date.book, input.book),
        label: asFirstString(raw.label, date.label, input.dateLabel),
        notes: asFirstString(raw.notes, input.canonTimingNotes),
    };
}

export function normalizeLoreEntryContext(input = {}) {
    const raw = asPlainObject(input.context);
    const invalidNumericBounds = raw.invalidNumericBounds === true
        || ['sortKeyFrom', 'fromSortKey', 'sortKeyStart', 'sortKeyTo', 'toSortKey', 'sortKeyEnd']
            .some(field => raw[field] !== null && raw[field] !== undefined && raw[field] !== ''
                && asOptionalNumber(raw[field]) === null);
    const sortKeyFrom = asOptionalNumber(raw.sortKeyFrom ?? raw.fromSortKey ?? raw.sortKeyStart);
    const sortKeyTo = asOptionalNumber(raw.sortKeyTo ?? raw.toSortKey ?? raw.sortKeyEnd);
    return {
        ...(invalidNumericBounds ? { invalidNumericBounds: true } : {}),
        scope: asFirstLooseString(raw.scope),
        anchorId: asFirstLooseString(raw.anchorId, raw.anchor, raw.id),
        validFromAnchor: asFirstLooseString(raw.validFromAnchor, raw.anchorFrom, raw.fromAnchor, raw.from, input.validFromAnchor),
        validToAnchor: asFirstLooseString(raw.validToAnchor, raw.anchorTo, raw.toAnchor, raw.to, input.validToAnchor),
        arc: asFirstLooseString(raw.arc, raw.arcId, input.arc),
        arcId: asFirstLooseString(raw.arcId, raw.arc, input.arcId),
        phase: asFirstLooseString(raw.phase, raw.phaseId, input.phase),
        phaseId: asFirstLooseString(raw.phaseId, raw.phase, input.phaseId),
        season: asFirstLooseString(raw.season, input.season),
        episode: asFirstLooseString(raw.episode, input.episode),
        chapter: asFirstLooseString(raw.chapter, input.chapter),
        issue: asFirstLooseString(raw.issue, input.issue),
        quest: asFirstLooseString(raw.quest, input.quest),
        gameStage: asFirstLooseString(raw.gameStage, raw.stage, input.gameStage),
        stardateFrom: asFirstLooseString(raw.stardateFrom, raw.stardateStart, input.stardateFrom),
        stardateTo: asFirstLooseString(raw.stardateTo, raw.stardateEnd, input.stardateTo),
        sortKeyFrom,
        sortKeyTo,
        precision: asFirstLooseString(raw.precision, raw.contextType, raw.type, input.contextPrecision),
        windowKind: asFirstLooseString(raw.windowKind, raw.kind),
        label: asFirstLooseString(raw.label, raw.title, input.contextLabel),
        approximate: asBoolean(raw.approximate, false),
    };
}

function normalizeLoreCoordinates(input = {}) {
    const rawCoordinates = Array.isArray(input.coordinates)
        ? input.coordinates
        : Array.isArray(input.context?.coordinates)
            ? input.context.coordinates
            : [];
    return rawCoordinates
        .map(raw => {
            const item = asPlainObject(raw);
            const axis = asFirstLooseString(item.axis, item.type);
            const id = asFirstLooseString(item.id, item.value, item.label);
            if (!axis && !id) return null;
            return {
                axis,
                id,
                label: asFirstLooseString(item.label, item.title, id),
                from: asFirstLooseString(item.from, item.validFrom, item.start),
                to: asFirstLooseString(item.to, item.validTo, item.end),
                sortKeyFrom: asOptionalNumber(item.sortKeyFrom ?? item.fromSortKey ?? item.sortKey),
                sortKeyTo: asOptionalNumber(item.sortKeyTo ?? item.toSortKey),
                confidence: Math.max(0, Math.min(1, asNumber(item.confidence, 1))),
                required: item.required === undefined ? true : asBoolean(item.required, true),
            };
        })
        .filter(Boolean)
        .slice(0, 24);
}

function normalizeActivation(input) {
    const raw = asPlainObject(input.activation);
    return {
        requiresEvents: uniqueLimitedStringArray(raw.requiresEvents ?? input.requiresEvents, 32),
        requiresMissingEvents: uniqueLimitedStringArray(raw.requiresMissingEvents ?? input.requiresMissingEvents, 32),
        requiresCharacters: uniqueLimitedStringArray(raw.requiresCharacters, 24),
        requiresLocation: uniqueLimitedStringArray(raw.requiresLocation, 12),
        requiresTopics: uniqueLimitedStringArray(raw.requiresTopics, 24),
        requiresCanonStrictness: asFirstString(raw.requiresCanonStrictness, input.requiresCanonStrictness),
    };
}

function normalizeExpiration(input) {
    const raw = asPlainObject(input.expiration);
    return {
        expiresWhenEventsHappen: uniqueLimitedStringArray(raw.expiresWhenEventsHappen ?? input.expiresWhenEventsHappen, 32),
        expiresWhenEntriesActive: uniqueLimitedStringArray(raw.expiresWhenEntriesActive, 32),
        autoMuteOnExpire: raw.autoMuteOnExpire === undefined ? asBoolean(input.autoMuteOnExpire, true) : asBoolean(raw.autoMuteOnExpire, true),
    };
}

function normalizeLifecycle(input) {
    const raw = asPlainObject(input.lifecycle);
    const status = asFirstString(raw.status, input.lifecycleStatus);
    const computedStatus = asFirstString(raw.computedStatus);
    return {
        status: LORE_LIFECYCLE_STATUSES.includes(status) ? status : '',
        computedStatus: LORE_LIFECYCLE_STATUSES.includes(computedStatus) ? computedStatus : '',
        manualOverride: asBoolean(raw.manualOverride, false),
        expired: asBoolean(raw.expired, false),
        expiredAt: asString(raw.expiredAt),
        expiredReason: asString(raw.expiredReason),
        autoMutedOnExpire: asBoolean(raw.autoMutedOnExpire, false),
        lastEvaluatedAt: asNumber(raw.lastEvaluatedAt, 0),
        lastEvaluatedDate: asString(raw.lastEvaluatedDate),
        reason: asString(raw.reason),
    };
}

const KNOWN_SCOPE_FIELDS = new Set(['characters', 'locations', 'factions', 'topics', 'objects', 'spells', 'schoolYears', 'books', 'eras']);

function normalizeScopeAliases(value, alias, limit) {
    if ((value === undefined || value === null) && (alias === undefined || alias === null)) return [];
    return uniqueLimitedStringArray([value, alias], limit);
}

function normalizeScope(input) {
    const raw = asPlainObject(input.scope);
    const activeWhen = asPlainObject(input.activeWhen);
    const appliesTo = asStringArray(input.appliesTo);
    const extra = {};

    for (const [key, value] of Object.entries(raw)) {
        if (!KNOWN_SCOPE_FIELDS.has(key)) extra[key] = value;
    }

    return {
        characters: uniqueLimitedStringArray([raw.characters, activeWhen.charactersPresentAny, appliesTo], 32),
        locations: normalizeScopeAliases(raw.locations, activeWhen.locationsAny, 32),
        factions: uniqueLimitedStringArray(raw.factions, 24),
        topics: normalizeScopeAliases(raw.topics, activeWhen.tagsAny, 40),
        objects: uniqueLimitedStringArray(raw.objects, 24),
        spells: uniqueLimitedStringArray(raw.spells, 24),
        schoolYears: uniqueLimitedStringArray(raw.schoolYears, 12),
        books: uniqueLimitedStringArray(raw.books, 12),
        eras: normalizeScopeAliases(raw.eras, activeWhen.erasAny, 24),
        ...extra,
    };
}

function normalizeVisibility(input) {
    const raw = asPlainObject(input.visibility);
    return {
        publicFrom: asString(raw.publicFrom),
        secretUntil: asString(raw.secretUntil),
        knownBy: normalizeStringMap(raw.knownBy ?? input.knownBy ?? input.whoKnowsTruth),
        notKnownByBefore: normalizeStringMap(raw.notKnownByBefore ?? input.notKnownByBefore),
        knownByAtContext: normalizePlainObjectMap(raw.knownByAtContext),
        notKnownByBeforeContext: normalizePlainObjectMap(raw.notKnownByBeforeContext),
        neverKnownBy: uniqueLimitedStringArray(raw.neverKnownBy, 32),
        publicFromContext: asPlainObject(raw.publicFromContext),
        secretUntilContext: asPlainObject(raw.secretUntilContext),
        suspectedBy: normalizeStringMap(raw.suspectedBy ?? input.suspectedBy ?? input.whoSuspects),
        believedBy: normalizeStringMap(raw.believedBy ?? input.whoBelievesPublicVersion),
    };
}

function normalizeRetrieval(input) {
    const raw = asPlainObject(input.retrieval);
    const triggers = asPlainObject(raw.triggers);
    return {
        activation: asFirstString(raw.activation),
        frequency: asFirstString(raw.frequency),
        contextBoost: asFirstString(raw.contextBoost),
        triggers: {
            charactersAny: uniqueLimitedStringArray(triggers.charactersAny, 32),
            locationsAny: uniqueLimitedStringArray(triggers.locationsAny, 24),
            topicsAny: uniqueLimitedStringArray(triggers.topicsAny, 48),
            erasAny: uniqueLimitedStringArray(triggers.erasAny, 24),
        },
    };
}

function normalizeContentBlock(input, factFallback) {
    const raw = asPlainObject(input.content);
    const publicVersion = asFirstString(raw.publicVersion, input.publicVersion);
    return {
        fact: asFirstString(raw.fact, raw.text, input.fact, input.description, input.detail, input.text, input.summary, factFallback),
        injection: asFirstString(raw.injection, input.injection),
        constraints: asStringArray(raw.constraints ?? input.constraints),
        antiLore: asStringArray(raw.antiLore ?? input.antiLore),
        publicVersion,
        notes: asFirstString(raw.notes, input.notes),
    };
}

function normalizeEffectsBlock(input) {
    const raw = asPlainObject(input.effects);
    return {
        addsTags: asStringArray(raw.addsTags),
        blocksTermsBeforeDate: asStringArray(raw.blocksTermsBeforeDate),
        protectsEntries: asStringArray(raw.protectsEntries),
        stateHints: asPlainObject(raw.stateHints),
        injectionRules: asPlainObject(raw.injectionRules),
    };
}

function normalizeSourceBlock(input) {
    const raw = asPlainObject(input.source);
    if (typeof input.source === 'string') {
        return {
            id: input.source,
            work: '',
            book: '',
            chapter: '',
            confidence: asNumber(input.confidence, 0.5),
            notes: '',
        };
    }
    return {
        id: asFirstString(raw.id, input.sourceId),
        work: asFirstString(raw.work, input.work),
        book: asFirstString(raw.book, input.sourceBook),
        chapter: asFirstString(raw.chapter, input.chapter),
        confidence: Math.max(0, Math.min(1, asNumber(raw.confidence ?? input.confidence, 0.5))),
        notes: asFirstString(raw.notes, input.sourceNotes),
    };
}

function normalizeUiBlock(input) {
    const raw = asPlainObject(input.ui);
    return {
        color: asString(raw.color),
        textColor: asString(raw.textColor),
        icon: asString(raw.icon),
        defaultCollapsed: asBoolean(raw.defaultCollapsed, false),
        preview: asPlainObject(raw.preview),
    };
}

function deriveActiveWhen(scope, input) {
    // Important: activeWhen is a legacy compatibility block. Do NOT mirror scope
    // back into activeWhen here. Mirroring scope <-> activeWhen caused exponential
    // chatMetadata growth in older builds because each normalization pass copied
    // one block into the other. Activation now checks scope directly at runtime.
    const activeWhen = asPlainObject(input.activeWhen);
    return {
        erasAny: uniqueLimitedStringArray(activeWhen.erasAny, 16),
        locationsAny: uniqueLimitedStringArray(activeWhen.locationsAny, 16),
        charactersPresentAny: uniqueLimitedStringArray(activeWhen.charactersPresentAny, 16),
        tagsAny: uniqueLimitedStringArray(activeWhen.tagsAny, 24),
    };
}

function deriveSourceString(sourceInfo, input) {
    if (typeof input.source === 'string' && input.source.trim()) return input.source.trim();
    return sourceInfo.id || [sourceInfo.work, sourceInfo.book, sourceInfo.chapter].filter(Boolean).join(':') || 'model-generated';
}

// ── Lore Context normalization ──────────────────────────────────────────────────

/**
 * Normalizes a lore context object to its canonical shape.
 * @param {*} input - Raw lore context (may be partial or malformed)
 * @returns {Object} Normalized lore context
 */
export function normalizeLoreContext(input = {}) {
    if (!input || typeof input !== 'object') input = {};
    const mode = asString(input.timeTravelMode);
    return {
        sceneDate: asString(input.sceneDate),
        subjectiveDate: asString(input.subjectiveDate),
        canonBoundary: asString(input.canonBoundary),
        branchId: asString(input.branchId) || 'main',
        timeTravelMode: VALID_TIME_TRAVEL_MODES.has(mode) ? mode : 'none',
        lastDetectedAt: Number.isFinite(input.lastDetectedAt) ? input.lastDetectedAt : 0,
        lastGeneratedFor: asString(input.lastGeneratedFor),
        lastGenerationSummary: asString(input.lastGenerationSummary),
    };
}

// ── Lore Entry normalization ────────────────────────────────────────────────────

/**
 * Normalizes a single lore entry to its canonical v2 shape while preserving legacy aliases.
 * New user-defined fields are kept under extensions.unrecognized instead of being discarded.
 * @param {*} input - Raw lore entry (may be partial or malformed)
 * @returns {Object} Normalized lore entry
 */
export function normalizeLoreEntry(input = {}) {
    if (!input || typeof input !== 'object') input = {};

    const legacyContentString = typeof input.content === 'string' ? input.content : '';
    const title = asFirstString(input.title, input.name, input.fact, legacyContentString, input.description, input.detail, input.text, input.summary) || 'Lore Entry';
    const kind = asFirstString(input.kind, input.gateType) || 'fact';
    const category = normalizeLoreCategory(asFirstString(input.category) || 'other');
    const date = normalizeDateBlock(input);
    const canonTiming = normalizeCanonTiming(input);
    const context = normalizeLoreEntryContext(input);
    const coordinates = normalizeLoreCoordinates(input);
    const activation = normalizeActivation(input);
    const expiration = normalizeExpiration(input);
    const lifecycle = normalizeLifecycle(input);
    const scope = normalizeScope(input);
    const visibility = normalizeVisibility(input);
    const retrieval = normalizeRetrieval(input);
    const content = normalizeContentBlock(input, legacyContentString || title);
    const effects = normalizeEffectsBlock(input);
    const sourceInfo = normalizeSourceBlock(input);
    const ui = normalizeUiBlock(input);
    const extensions = mergeExtensions(input);
    const tags = normalizeLoreTags([
        ...asStringArray(input.tags),
        ...asStringArray(effects.addsTags),
        kind,
        category,
    ]);
    const status = asString(input.status);
    const canon = normalizeLoreCanon(input.canon || input.canonStatus, deriveSourceString(sourceInfo, input));
    const canonStatus = canon;
    const truthStatus = asString(input.truthStatus) || 'true';
    const revealPolicy = asString(input.revealPolicy) || 'private';
    const priority = asPriority(input.priority);
    const source = deriveSourceString(sourceInfo, input);
    const relevance = normalizeLoreRelevance(input.relevance || input.lifecycle?.status || input.lifecycle?.computedStatus || input.status || 'normal');
    const lorePurpose = normalizeLorePurpose(input.lorePurpose || input.purpose, { ...input, kind, gateType: input.gateType || kind, category }) || (canon === 'au' ? 'branch_fact' : 'rule_constraint');
    const specificityScore = Number.isFinite(Number(input.specificityScore)) ? Math.max(0, Math.min(100, Number(input.specificityScore))) : computeSpecificityScore({ ...input, kind, gateType: input.gateType || kind, category, lorePurpose, content, scope, date });
    const injectableByDefault = input.injectableByDefault === undefined ? true : asBoolean(input.injectableByDefault, true);
    const activeWhen = deriveActiveWhen(scope, input);
    const publicVersion = content.publicVersion;
    const whoKnowsTruth = Array.from(new Set([...asStringArray(input.whoKnowsTruth), ...stringMapKeys(visibility.knownBy)]));
    const whoSuspects = Array.from(new Set([...asStringArray(input.whoSuspects), ...stringMapKeys(visibility.suspectedBy)]));
    const whoBelievesPublicVersion = Array.from(new Set([...asStringArray(input.whoBelievesPublicVersion), ...stringMapKeys(visibility.believedBy)]));

    return {
        schemaVersion: Number.isFinite(Number(input.schemaVersion)) ? Number(input.schemaVersion) : 2,
        id: asString(input.id) || stableIdFromTitle(title),
        title,
        kind,
        gateType: asFirstString(input.gateType, kind),
        tags,
        category,
        relevance,
        lorePurpose,
        specificityScore,
        injectableByDefault,
        canon,
        canonStatus,
        truthStatus,
        revealPolicy,
        priority,
        status: VALID_STATUS.has(status) ? status : 'active',
        protected: asBoolean(input.protected, false),
        userEditable: input.userEditable === undefined ? true : asBoolean(input.userEditable, true),
        userEdited: asBoolean(input.userEdited),
        locked: asBoolean(input.locked),
        branchId: asString(input.branchId) || 'main',

        date,
        canonTiming,
        context,
        coordinates,
        activation,
        expiration,
        lifecycle,
        scope,
        visibility,
        retrieval,
        content,
        effects,
        sourceInfo,
        ui,
        extensions,

        // Legacy aliases retained for current UI, duplicate detection, injection, and old states.
        fact: content.fact,
        validFrom: date.validFrom,
        validTo: date.validTo,
        whoKnowsTruth,
        whoSuspects,
        whoBelievesPublicVersion,
        publicVersion,
        activeWhen,
        source,
        notes: content.notes,
    };
}

/**
 * Normalizes a full lore matrix array.
 * @param {*} value - Raw lore matrix (may be anything)
 * @returns {Object[]} Normalized lore entries
 */
export function normalizeLoreMatrix(value) {
    if (!Array.isArray(value)) return [];
    return value
        .map(normalizeLoreEntry)
        .filter(entry => entry.id && entry.title && entry.fact);
}

// ── Activation helpers ──────────────────────────────────────────────────────────

function lowerSet(values) {
    return new Set(asStringArray(values).map(v => v.toLowerCase()));
}

function anyOverlap(a, b) {
    const aa = lowerSet(a);
    const bb = lowerSet(b);
    for (const x of aa) {
        if (bb.has(x)) return true;
        for (const y of bb) {
            if (x.includes(y) || y.includes(x)) return true;
        }
    }
    return false;
}

function entryBranchMatches(entry, state) {
    const branch = state?.loreContext?.branchId || 'main';

    // No branchId means the entry applies everywhere (legacy behavior).
    if (!entry.branchId) return true;
    // Explicit "global" means the entry applies in all branches.
    if (entry.branchId === 'global') return true;
    // "main" entries only activate in the main branch.
    if (entry.branchId === 'main') return branch === 'main';
    // Otherwise match the exact branch.
    return entry.branchId === branch;
}

function activeWhenMatches(entry, state) {
    const activeWhen = entry.activeWhen || {};
    const scope = entry.scope || {};
    const era = state?.canon?.era ? [state.canon.era] : [];
    const canonBoundary = state?.canon?.canonBoundary ? [state.canon.canonBoundary] : [];
    const location = state?.scene?.location ? [state.scene.location] : [];
    const present = state?.scene?.presentCharacters || [];

    // Runtime activation reads both legacy activeWhen and schema-v2 scope, but
    // normalization/storage no longer mirrors them into each other.
    const erasAny = uniqueLimitedStringArray([activeWhen.erasAny, scope.eras, scope.books], 32);
    const locationsAny = uniqueLimitedStringArray([activeWhen.locationsAny, scope.locations], 32);
    const charactersPresentAny = uniqueLimitedStringArray([activeWhen.charactersPresentAny, scope.characters], 32);

    if (erasAny.length && !anyOverlap(erasAny, era.concat(canonBoundary))) return false;
    if (locationsAny.length && !anyOverlap(locationsAny, location)) return false;
    if (charactersPresentAny.length && !anyOverlap(charactersPresentAny, present)) return false;

    return true;
}

/**
 * Determines whether the current scene date falls within an entry's date window.
 * Supports ISO 8601 YYYY-MM-DD dates for precise comparison,
 * and falls back to permissive fuzzy matching for HP-era dates.
 */
function dateWindowMatches(entry, state) {
    const raw = state?.loreContext?.sceneDate || state?.canon?.inUniverseDate || '';
    if (!raw) return true;

    const scene = parseIsoDate(raw);
    const from = parseIsoDate(entry.validFrom);
    const to = parseIsoDate(entry.validTo);

    // If we have ISO dates on both sides, do a precise comparison.
    if (scene && (from || to)) {
        if (from && scene < from) return false;
        if (to && scene > to) return false;
        return true;
    }

    // Fallback: permissive substring matching for non-ISO dates
    // (e.g. "early September 1993", "Half-Blood Prince era")
    if (entry.validFrom && entry.validTo && entry.validFrom === entry.validTo) {
        return raw.includes(entry.validFrom) || entry.validFrom.includes(raw);
    }

    // If no ISO parse on either side and no exact window, treat as always eligible.
    return true;
}

/**
 * Parses a value as an ISO 8601 date (YYYY-MM-DD).
 * Returns a Date object at midnight UTC, or null if the value is not ISO.
 * @param {string} value
 * @returns {Date|null}
 */
function parseIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Determines whether a lore entry is currently active based on
 * status, branch, date window, and trigger conditions.
 * @param {Object} entry - A lore entry (normalized)
 * @param {Object} state - SagaState
 * @returns {boolean}
 */
export function isLoreEntryActive(entry, state) {
    const e = normalizeLoreEntry(entry);
    const { muted } = getLoreSelectionSets(state);
    return e.status !== 'archived' && e.status !== 'disabled' && !muted.has(e.id);
}

/**
 * Returns currently active lore entries, sorted by priority descending,
 * limited to `limit` entries.
 * @param {Object} state - SagaState
 * @param {number} [limit=6] - Max entries to return
 * @returns {Object[]} Active lore entries
 */
export function getActiveLoreEntries(state, limit = 6) {
    const entries = normalizeLoreMatrix(state?.loreMatrix || []);
    return entries
        .filter(entry => isLoreEntryActive(entry, state))
        .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
        .slice(0, limit);
}



// ── Lore lifecycle / story-milestone activation ───────────────────────────────

function normalizeMilestoneStatus(value) {
    const status = asString(value);
    return ['not_happened', 'suspected', 'happened', 'blocked', 'diverged', 'unknown'].includes(status)
        ? status
        : 'unknown';
}

function getStoryMilestoneStatus(state, id) {
    const key = asString(id);
    if (!key) return 'unknown';
    const raw = state?.storyMilestones?.[key];
    if (!raw) return 'not_happened';
    return normalizeMilestoneStatus(raw.status);
}

function hasStoryMilestoneHappened(state, id) {
    const status = getStoryMilestoneStatus(state, id);
    return status === 'happened' || status === 'diverged';
}

function allMilestonesHappened(state, ids = []) {
    return ids.every(id => hasStoryMilestoneHappened(state, id));
}

function allMilestonesMissing(state, ids = []) {
    return ids.every(id => !hasStoryMilestoneHappened(state, id));
}

function sceneDateForState(state) {
    return state?.loreContext?.sceneDate || state?.canon?.inUniverseDate || '';
}

function compareStateDate(state, value) {
    const scene = parseIsoDate(sceneDateForState(state));
    const target = parseIsoDate(value);
    if (!scene || !target) return 0;
    if (scene < target) return -1;
    if (scene > target) return 1;
    return 0;
}

export function evaluateLoreEntryLifecycle(entry, state = {}) {
    const e = normalizeLoreEntry(entry);
    const { muted, activePinned } = getLoreSelectionSets(state);
    const lifecycle = e.lifecycle || {};

    if (muted.has(e.id)) {
        return { status: 'muted', shouldInject: false, reason: 'Muted by user.', entry: e };
    }

    if (lifecycle.manualOverride && lifecycle.status) {
        const status = lifecycle.status;
        return {
            status,
            shouldInject: INJECTABLE_LIFECYCLE_STATUSES.has(status) || status === 'active' || activePinned.has(e.id),
            reason: lifecycle.reason || 'Manual lifecycle override.',
            entry: e,
        };
    }

    if (e.status === 'archived' || e.status === 'disabled') {
        return { status: 'archived', shouldInject: false, reason: 'Archived or disabled.', entry: e };
    }

    if (!entryBranchMatches(e, state)) {
        return { status: 'divergent', shouldInject: false, reason: 'Branch does not match current story branch.', entry: e };
    }

    // canonStatus is descriptive metadata, not an activation switch.
    // A user-approved story-established canon change may still be the correct active fact
    // for this chat. Branch-specific exclusion is handled by branchId checks above.

    const hardFromCmp = e.canonTiming?.hardValidFrom ? compareStateDate(state, e.canonTiming.hardValidFrom) : 0;
    if (hardFromCmp < 0) return { status: 'future', shouldInject: false, reason: 'Current story date is before hard valid-from date.', entry: e };

    const hardTo = e.canonTiming?.hardValidTo || '';
    if (hardTo && compareStateDate(state, hardTo) > 0) {
        return { status: 'expired', shouldInject: false, reason: 'Current story date is after hard valid-to date.', entry: e };
    }

    // Legacy date windows remain hard temporal eligibility checks, but they no
    // longer control injection directly. Evaluate them before milestone gates so
    // old canon entries cannot appear Future after their validTo date simply
    // because a chat lacks matching story milestone flags.
    const hasModernTiming = Boolean(e.canonTiming?.canonExpectedFrom || e.canonTiming?.canonExpectedUntil || e.canonTiming?.hardValidFrom || e.canonTiming?.hardValidTo);
    if (!hasModernTiming && !dateWindowMatches(e, state)) {
        const cmpTo = e.validTo ? compareStateDate(state, e.validTo) : 0;
        const cmpFrom = e.validFrom ? compareStateDate(state, e.validFrom) : 0;
        if (cmpTo > 0) return { status: 'expired', shouldInject: false, reason: 'Current story date is after legacy valid-to date.', entry: e };
        if (cmpFrom < 0) return { status: 'future', shouldInject: false, reason: 'Current story date is before legacy valid-from date.', entry: e };
        return { status: 'blocked', shouldInject: false, reason: 'Date window does not match.', entry: e };
    }

    if (e.expiration?.expiresWhenEventsHappen?.length && !allMilestonesMissing(state, e.expiration.expiresWhenEventsHappen)) {
        return { status: 'expired', shouldInject: false, reason: `Expired because story milestone happened: ${e.expiration.expiresWhenEventsHappen.join(', ')}`, entry: e };
    }

    if (e.activation?.requiresEvents?.length && !allMilestonesHappened(state, e.activation.requiresEvents)) {
        const expectedFrom = e.canonTiming?.canonExpectedFrom || '';
        if (expectedFrom && compareStateDate(state, expectedFrom) >= 0) {
            return { status: 'canon_overdue', shouldInject: false, reason: `Canon date suggests this may apply, but required story milestone has not happened: ${e.activation.requiresEvents.join(', ')}`, entry: e };
        }
        return { status: 'future', shouldInject: false, reason: `Waiting for story milestone: ${e.activation.requiresEvents.join(', ')}`, entry: e };
    }

    if (e.activation?.requiresMissingEvents?.length && !allMilestonesMissing(state, e.activation.requiresMissingEvents)) {
        return { status: 'expired', shouldInject: false, reason: `Superseded by story milestone: ${e.activation.requiresMissingEvents.join(', ')}`, entry: e };
    }

    if (!activeWhenMatches(e, state)) {
        return { status: 'blocked', shouldInject: false, reason: 'Current scene scope does not match entry scope.', entry: e };
    }

    const expectedUntil = e.canonTiming?.canonExpectedUntil || '';
    if (expectedUntil && compareStateDate(state, expectedUntil) > 0 && e.activation?.requiresMissingEvents?.length) {
        return { status: 'canon_overdue', shouldInject: true, reason: 'Canon expected this guard to be resolved by now, but the story milestone is still missing.', entry: e };
    }

    return { status: 'active', shouldInject: true, reason: 'Entry applies to current story state.', entry: e };
}

export function applyLoreLifecycleEvaluation(entry, state = {}) {
    const evaluation = evaluateLoreEntryLifecycle(entry, state);
    const lifecycle = {
        ...(entry.lifecycle || {}),
        computedStatus: evaluation.status,
        status: entry.lifecycle?.manualOverride ? entry.lifecycle.status : evaluation.status,
        reason: evaluation.reason,
        expired: evaluation.status === 'expired',
        lastEvaluatedAt: Date.now(),
        lastEvaluatedDate: sceneDateForState(state),
    };
    if (evaluation.status === 'expired' && !lifecycle.expiredAt) {
        lifecycle.expiredAt = sceneDateForState(state);
        lifecycle.expiredReason = evaluation.reason;
    }
    return normalizeLoreEntry({ ...entry, lifecycle });
}

export function getResolvedLoreInjection(entry, state = {}) {
    const evaluation = evaluateLoreEntryLifecycle(entry, state);
    if (!evaluation.shouldInject) return '';
    const e = evaluation.entry || normalizeLoreEntry(entry);
    const content = e.content || {};
    return stripTemporalBoilerplate(content.injection || content.fact || e.fact || '');
}

export function stripTemporalBoilerplate(text) {
    return String(text || '')
        .replace(/^\s*(before|after|until|prior to|from|as of|during)\s+[^,;:]{3,80}[,;:]\s*/i, '')
        .replace(/\b(as of|before|after|until|prior to|from)\s+\d{4}-\d{2}-\d{2}\b[,;:]?\s*/gi, '')
        .replace(/\b(as of|before|after|until|prior to|from)\s+(Year|Book)\s+\d\b[,;:]?\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function reevaluateLoreLifecycleEntries(entries = [], state = {}) {
    return normalizeLoreMatrix(entries).map(entry => applyLoreLifecycleEvaluation(entry, state));
}

// ── Duplicate detection ────────────────────────────────────────────────────────

function tokenizeForSimilarity(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 2);
}

function jaccardSimilarity(a, b) {
    const aa = new Set(tokenizeForSimilarity(a));
    const bb = new Set(tokenizeForSimilarity(b));
    if (!aa.size || !bb.size) return 0;
    let intersection = 0;
    for (const token of aa) {
        if (bb.has(token)) intersection++;
    }
    const union = aa.size + bb.size - intersection;
    return union > 0 ? intersection / union : 0;
}

function duplicateSourceText(entry = {}) {
    const source = entry?.source;
    const info = entry?.sourceInfo || {};
    if (typeof source === 'string') return source.toLowerCase();
    if (source && typeof source === 'object') {
        return [source.id, source.work, source.book, source.chapter, source.notes].filter(Boolean).join(' ').toLowerCase();
    }
    return [info.id, info.work, info.book, info.chapter, info.notes].filter(Boolean).join(' ').toLowerCase();
}

function isCanonicalReferenceLore(entry = {}) {
    const e = entry || {};
    const source = duplicateSourceText(e);
    const sourceInfo = e.sourceInfo || {};
    const sourceBook = sourceInfo.book || sourceInfo.work || e?.date?.book || '';
    const category = String(e.category || '').toLowerCase();
    const canonStatus = String(e.canonStatus || '').toLowerCase();
    const generated = /model-generated|story-generation|lore-generator|manual|user/.test(source);
    if (generated) return false;
    if (canonStatus === 'canon' && (category === 'canon' || sourceBook || /canon|lore\//.test(source))) return true;
    if (canonStatus === 'canon' && Array.isArray(e?.scope?.books) && e.scope.books.length) return true;
    return false;
}

function isStoryGeneratedLore(entry = {}) {
    const e = entry || {};
    const source = duplicateSourceText(e);
    const canonStatus = String(e.canonStatus || '').toLowerCase();
    if (/model-generated|story-generation|lore-generator|manual|user|au|divergent/.test(source)) return true;
    if (['au', 'divergent', 'fanon', 'contested', 'unknown'].includes(canonStatus)) return true;
    return false;
}

function shouldSkipCanonicalSimilarity(candidate, current, options = {}) {
    return Boolean(
        options.storyGeneration &&
        options.ignoreCanonicalSourceSimilarity &&
        isStoryGeneratedLore(candidate) &&
        isCanonicalReferenceLore(current)
    );
}

export function getLoreDuplicateReason(entry, existingEntries = [], options = {}) {
    const candidate = normalizeLoreEntry(entry);
    const existing = normalizeLoreMatrix(existingEntries);
    const candidateId = candidate.id.toLowerCase();
    const candidateTitle = candidate.title.toLowerCase();

    for (const current of existing) {
        if (current.id.toLowerCase() === candidateId) {
            return `duplicate id: ${current.id}`;
        }

        // For story-lore bootstrapping, accepted canon-database entries should not
        // suppress story-specific pending lore merely because the title/fact is
        // similar. A canon fact like "Harry owns a wand" and a story fact like
        // "Harry currently carries Draco's wand" must both survive review.
        if (shouldSkipCanonicalSimilarity(candidate, current, options)) {
            continue;
        }

        if (current.title.toLowerCase() === candidateTitle) {
            return `duplicate title: ${current.title}`;
        }
        const titleScore = jaccardSimilarity(candidate.title, current.title);
        const factScore = jaccardSimilarity(candidate.fact, current.fact);
        if (titleScore >= 0.82) {
            return `similar title: ${current.title}`;
        }
        if (factScore >= 0.72) {
            return `similar fact: ${current.title}`;
        }
    }

    return '';
}

export function filterDuplicateLoreEntries(entries = [], existingEntries = [], options = {}) {
    const accepted = [];
    const dropped = [];
    const comparison = normalizeLoreMatrix(existingEntries);

    for (const raw of entries) {
        const entry = normalizeLoreEntry(raw);
        const reason = getLoreDuplicateReason(entry, comparison.concat(accepted), options);
        if (reason) {
            dropped.push({ entry, reason });
        } else if (entry.id && entry.title && entry.fact) {
            accepted.push(entry);
        }
    }

    return { entries: accepted, dropped };
}

// ── Merging ─────────────────────────────────────────────────────────────────────

// Story-lore generation needs similarity routing rather than destructive
// duplicate dropping, because similar lore often means "update this entry."
function findSimilarLoreEntry(candidate, existingEntries = [], options = {}) {
    const existing = normalizeLoreMatrix(existingEntries);
    const candidateId = candidate.id.toLowerCase();
    const candidateTitle = candidate.title.toLowerCase();

    for (const current of existing) {
        if (current.id.toLowerCase() === candidateId) {
            return { current, reason: `duplicate id: ${current.id}`, exact: true, kind: 'duplicate' };
        }
        if (shouldSkipCanonicalSimilarity(candidate, current, options)) {
            continue;
        }
        if (current.title.toLowerCase() === candidateTitle) {
            const factScore = jaccardSimilarity(candidate.fact, current.fact);
            if (factScore >= 0.92) {
                return { current, reason: `duplicate title: ${current.title}`, exact: true, kind: 'duplicate' };
            }
            return { current, reason: `same title, changed fact: ${current.title}`, exact: false, kind: 'possible_update' };
        }
        const titleScore = jaccardSimilarity(candidate.title, current.title);
        const factScore = jaccardSimilarity(candidate.fact, current.fact);
        if (titleScore >= 0.82 || factScore >= 0.72) {
            const currentFact = String(current.fact || current.content?.fact || '');
            const candidateFact = String(candidate.fact || candidate.content?.fact || '');
            const richerCandidate = candidateFact.length > currentFact.length + 40
                || (candidate.content?.constraints || []).length
                || (candidate.content?.antiLore || []).length;
            return {
                current,
                reason: titleScore >= 0.82 ? `similar title: ${current.title}` : `similar fact: ${current.title}`,
                exact: false,
                kind: richerCandidate ? 'possible_merge' : 'possible_update',
            };
        }
    }

    return null;
}

export function routeSimilarLoreEntries(entries = [], existingEntries = [], options = {}) {
    const accepted = [];
    const dropped = [];
    const routed = [];
    const comparison = normalizeLoreMatrix(existingEntries);

    for (const raw of entries) {
        const entry = normalizeLoreEntry(raw);
        const match = findSimilarLoreEntry(entry, comparison.concat(accepted), options);
        if (match?.exact) {
            dropped.push({ entry, reason: match.reason, route: 'duplicate' });
            continue;
        }
        if (match?.current) {
            const generation = entry.extensions?.sagaGeneration || {};
            const route = match.kind;
            const next = normalizeLoreEntry({
                ...entry,
                extensions: {
                    ...(entry.extensions || {}),
                    sagaGeneration: {
                        ...generation,
                        operation: generation.operation && generation.operation !== 'create' ? generation.operation : route === 'possible_merge' ? 'merge' : 'update',
                        targetEntryId: generation.targetEntryId || match.current.id,
                        similarityRoute: route,
                        similarityReason: match.reason,
                        routedAt: Date.now(),
                    },
                    sagaPendingReview: {
                        ...(entry.extensions?.sagaPendingReview || {}),
                        reviewRoute: route,
                        targetEntryId: generation.targetEntryId || match.current.id,
                        similarityReason: match.reason,
                    },
                },
            });
            accepted.push(next);
            routed.push({ entry: next, target: match.current, reason: match.reason, route });
            continue;
        }
        if (entry.id && entry.title && entry.fact) {
            accepted.push(entry);
        }
    }

    return { entries: accepted, dropped, routed };
}

/**
 * Merges incoming lore entries into the existing matrix.
 * Locked or user-edited entries are never overwritten.
 * Entries are matched by id.
 * @param {Object[]} existing - Current lore matrix
 * @param {Object[]} incoming - New entries to merge
 * @returns {Object[]} Merged lore matrix
 */
export function mergeLoreEntries(existing, incoming) {
    const byId = new Map();

    for (const entry of normalizeLoreMatrix(existing)) {
        byId.set(entry.id, entry);
    }

    for (const entry of normalizeLoreMatrix(incoming)) {
        const current = byId.get(entry.id);

        if (current?.locked || current?.userEdited) {
            continue;
        }

        byId.set(entry.id, {
            ...(current || {}),
            ...entry,
        });
    }

    return Array.from(byId.values());
}

// ── Generation key (for tracking when lore was last generated) ─────────────────

/**
 * Normalizes a single key part to a trimmed lowercase string.
 * Used by buildLoreGenerationKey for deterministic comparisons.
 * @param {string|*} value
 * @returns {string}
 */
function normalizeKeyPart(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/**
 * Normalizes a list of values for deterministic key inclusion.
 * Strips blanks, sorts alphabetically, and joins with comma.
 * @param {string[]} values
 * @returns {string}
 */
function normalizeList(values) {
    return Array.isArray(values)
        ? values
            .map(v => normalizeKeyPart(v))
            .filter(Boolean)
            .sort()
            .join(',')
        : '';
}

/**
 * Returns all lore entries filtered/annotated for the floating lore panel.
 * Does NOT filter by activeWhen — the panel shows all entries, not just active ones.
 * Annotations include: isPinned, isSuppressed, isActive, and category matches.
 *
 * @param {Object} state - SagaState
 * @returns {{ entries: Object[], categories: string[], counts: Object }}
 */
export function getPanelLoreState(state) {
    const allEntries = normalizeLoreMatrix(state?.loreMatrix || []);
    const pendingEntries = normalizeLoreMatrix(state?.pendingLoreEntries || []);
    const { muted, elevated, activePinned } = getLoreSelectionSets(state);

    const categories = new Set();
    const counts = { all: 0, active: 0, high: 0, normal: 0, low: 0, elevated: 0, pinned: 0, suppressed: 0, pending: pendingEntries.length };

    const entries = allEntries.map(entry => {
        const baseRelevance = normalizeLoreRelevance(entry.relevance || 'normal');
        const relevance = getLoreEntryEffectiveRelevance(entry, state);
        const isElevated = elevated.has(entry.id);
        const isPinned = activePinned.has(entry.id);
        const isSuppressed = muted.has(entry.id);
        if (entry.category) categories.add(entry.category);
        counts.all++;
        counts[relevance]++;
        if (relevance === 'high' && !isSuppressed) counts.active++;
        if (isElevated) counts.elevated++;
        if (isPinned) counts.pinned++;
        if (isSuppressed) counts.suppressed++;
        return {
            ...entry,
            baseRelevance,
            relevance,
            isActive: relevance === 'high' && !isSuppressed,
            isElevated,
            isPinned,
            isSuppressed,
            isPending: false,
            lifecycleStatus: relevance,
        };
    });

    const pendingAnnotated = pendingEntries.map(entry => {
        const relevance = normalizeLoreRelevance(entry.relevance || 'normal');
        if (entry.category) categories.add(entry.category);
        return {
            ...entry,
            baseRelevance: relevance,
            relevance,
            isActive: relevance === 'high',
            isElevated: elevated.has(entry.id),
            isPinned: activePinned.has(entry.id),
            isSuppressed: muted.has(entry.id),
            isPending: true,
            lifecycleStatus: relevance,
        };
    });

    const entryIds = new Set(entries.map(e => e.id));
    const uniquePending = pendingAnnotated.filter(e => !entryIds.has(e.id));
    const allAnnotated = [...entries, ...uniquePending];
    counts.suppressed = allAnnotated.filter(e => e.isSuppressed).length;

    return {
        entries: allAnnotated,
        categories: ['all', 'high', 'normal', 'low', 'elevated', 'suppressed', 'pending', ...Array.from(categories).sort()],
        counts,
    };
}

/**
 * Returns the list of lore entries that should be injected into the memo/prompt.
 * Respects user selection: pinned entries are always included (even if suppressed by activeWhen),
 * suppressed entries are excluded regardless of activeWhen.
 * Falls back to getActiveLoreEntries if loreSelection is missing.
 *
 * @param {Object} state - SagaState
 * @param {number} limit - Max entries to return
 * @returns {Object[]} Injectable lore entries
 */
export function getInjectableLoreEntries(state, limit = 0, relevance = null) {
    const all = normalizeLoreMatrix(state?.loreMatrix || []);
    const { muted, elevated, activePinned } = getLoreSelectionSets(state);
    const tier = relevance ? normalizeLoreRelevance(relevance) : null;
    const injectable = all
        .filter(entry => entry.status !== 'archived' && entry.status !== 'disabled')
        .filter(entry => entry.injectableByDefault !== false)
        .filter(entry => !muted.has(entry.id))
        .filter(entry => !tier || getLoreEntryEffectiveRelevance(entry, state) === tier)
        .map(entry => ({
            ...entry,
            baseRelevance: normalizeLoreRelevance(entry.relevance),
            isElevated: elevated.has(entry.id),
            isPinned: activePinned.has(entry.id),
            isSuppressed: false,
            isActive: getLoreEntryEffectiveRelevance(entry, state) === 'high',
            relevance: getLoreEntryEffectiveRelevance(entry, state),
        }));
    const sorted = sortLoreEntriesForInjection(injectable, activePinned);
    const effectiveLimit = Number(limit) > 0 ? Number(limit) : Infinity;
    if (!Number.isFinite(effectiveLimit)) return sorted;
    const pinnedEntries = sorted.filter(entry => entry.isPinned);
    const regularEntries = sorted.filter(entry => !entry.isPinned).slice(0, effectiveLimit);
    return [...pinnedEntries, ...regularEntries];
}

export function getInjectableLoreEntriesByRelevance(state, relevance = 'normal', limit = 0) {
    return getInjectableLoreEntries(state, limit, relevance);
}

export function getLoreRelevanceCounts(state = {}) {
    const counts = { high: 0, normal: 0, low: 0, muted: 0 };
    const { muted } = getLoreSelectionSets(state);
    for (const entry of normalizeLoreMatrix(state?.loreMatrix || [])) {
        if (muted.has(entry.id)) { counts.muted += 1; continue; }
        counts[getLoreEntryEffectiveRelevance(entry, state)] += 1;
    }
    return counts;
}

export function scoreLoreEntryRelevance(entry, state = {}, options = {}) {
    return computeLocalLoreRelevance(normalizeLoreEntry(entry), state, options);
}

/**
 * Builds a fingerprint string representing the current context.
 * Used to detect when lore should be regenerated.
 *
 * Fields included are those that should trigger a meaningfully different
 * lore proposal. Transient fields like weather or current activity are
 * deliberately excluded to avoid unnecessary regeneration.
 *
 * @param {Object} state - SagaState
 * @returns {string} Context fingerprint
 */
export function buildLoreGenerationKey(state) {
    const ctx = normalizeLoreContext(state?.loreContext || {});
    const canon = state?.canon || {};
    const scene = state?.scene || {};

    return [
        normalizeKeyPart(ctx.sceneDate || canon.inUniverseDate),
        normalizeKeyPart(ctx.subjectiveDate),
        normalizeKeyPart(ctx.canonBoundary || canon.canonBoundary),
        normalizeKeyPart(canon.era),
        normalizeKeyPart(ctx.branchId),
        normalizeKeyPart(ctx.timeTravelMode),
        normalizeKeyPart(scene.location),
        normalizeList(scene.presentCharacters),
        normalizeList(scene.nearbyCharacters),
    ].join('|');
}
