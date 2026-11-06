/** One-time recovery of the empty Context block fabricated by the old compactor. */
const EMPTY_CONTEXT_FIELDS = [
    'scope', 'anchorId', 'validFromAnchor', 'validToAnchor', 'arc', 'arcId', 'phase', 'phaseId',
    'season', 'episode', 'chapter', 'issue', 'quest', 'gameStage', 'stardateFrom', 'stardateTo',
    'precision', 'windowKind', 'label',
];
const CONTEXT_FIELDS = new Set([...EMPTY_CONTEXT_FIELDS, 'sortKeyFrom', 'sortKeyTo', 'approximate']);
const TOP_LEVEL_CONTEXT_FIELDS = [
    'validFromAnchor', 'validToAnchor', 'arc', 'arcId', 'phase', 'phaseId', 'season', 'episode',
    'chapter', 'issue', 'quest', 'gameStage', 'stardateFrom', 'stardateTo', 'contextPrecision', 'contextLabel',
];

function hasValue(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.values(value).some(hasValue);
    return Boolean(value);
}

function hasDeckProvenance(entry) {
    // Include preserved import metadata as well as the first-party deck extensions.
    return [entry, entry.sourceInfo, entry.extensions, entry.extensions?.unrecognized,
        entry.extensions?.sagaGeneration, entry.extensions?.sagaContextGate]
        .some(block => block && typeof block === 'object' && Object.entries(block)
            .some(([key, value]) => /pack|deck/i.test(key) && hasValue(value)))
        || /(?:pack|deck)/i.test(String(entry.sourceInfo?.id || ''));
}

function isKnownUngatedOrigin(entry) {
    if (entry.source === 'manual' && entry.sourceInfo?.work === 'Manual Lore') return true;
    // Normalization historically discarded sourceInfo for string sources. The
    // manual editor and Story Scan leave these independent persisted markers.
    if (entry.source === 'manual' && !entry.sourceInfo?.work && entry.userEdited === true) return true;
    return typeof entry.source === 'string' && entry.source.startsWith('model-generated:bulk:')
        && ['bulk-bootstrap', 'bulk-incremental'].includes(entry.extensions?.sagaGeneration?.mode)
        && (!entry.sourceInfo?.work || entry.sourceInfo.work === 'Current chat')
        && ((typeof entry.sourceInfo?.id === 'string' && entry.sourceInfo.id.startsWith('bulk-lore:'))
            || (typeof entry.id === 'string' && entry.id.startsWith('story_bulk_')));
}

/**
 * Inspect raw storage before normalization can manufacture this complete shape.
 * The old UI never exposed numeric gates for these origins. An imported gate
 * identical to this entire legacy representation is inherently indistinguishable;
 * partial/raw explicit-zero gates and every schema-28 gate are left intact.
 * Returns whether a live card was repaired; callers can ensure it is persisted.
 */
export function recoverLegacyLoreContextStorage(state) {
    if (!state || typeof state !== 'object' || Number(state._version) >= 28) return false;
    let changed = false;
    for (const field of ['loreMatrix', 'pendingLoreEntries']) {
        for (const entry of Array.isArray(state[field]) ? state[field] : []) {
            const context = entry?.context;
            if (!context || typeof context !== 'object' || Array.isArray(context)) continue;
            if (context.sortKeyFrom !== 0 || context.sortKeyTo !== 0 || context.approximate !== false) continue;
            if (!EMPTY_CONTEXT_FIELDS.every(key => context[key] === '')) continue;
            // Even false/zero aliases can express a real or malformed constraint.
            if (Object.keys(context).some(key => !CONTEXT_FIELDS.has(key))) continue;
            if (TOP_LEVEL_CONTEXT_FIELDS.some(key => entry[key] !== undefined && entry[key] !== null && entry[key] !== '')) continue;
            if (hasValue(entry.coordinates) || hasDeckProvenance(entry) || !isKnownUngatedOrigin(entry)) continue;
            delete entry.context;
            changed = true;
        }
    }
    return changed;
}
