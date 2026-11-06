/**
 * loredeck-library-view.js -- Saga
 * Pure view-model helpers for Loredeck Library list ordering.
 */

const libraryTitleCollator = new Intl.Collator(undefined, {
  numeric: true, sensitivity: 'base',
});

function getPackId(pack = {}) {
  return String(pack.packId || pack.id || '').trim();
}

function getPackTitle(pack = {}) {
  return String(pack.title || pack.name || getPackId(pack) || '').trim();
}

export function compareLoredeckLibraryTitles(a = '', b = '') {
  return libraryTitleCollator.compare(String(a || ''), String(b || ''));
}

export function compareLoredeckLibraryPackTitles(a = {}, b = {}) {
  return compareLoredeckLibraryTitles(getPackTitle(a), getPackTitle(b))
    || compareLoredeckLibraryTitles(getPackId(a), getPackId(b));
}

export function compareLoredeckLibraryFolderTitles(a = {}, b = {}) {
  return compareLoredeckLibraryTitles(a.title || a.name || a.id, b.title || b.name || b.id)
    || compareLoredeckLibraryTitles(a.id, b.id);
}

export function isCoreLoredeckLibraryPack(pack = {}) {
  const id = getPackId(pack).toLowerCase();
  const title = getPackTitle(pack).toLowerCase();
  return id === 'core'
    || id.endsWith('-core')
    || id.includes('-core-')
    || title === 'core'
    || title.endsWith(': core')
    || title.includes(': core ');
}

export function compareLoredeckLibraryFolderPacks(a = {}, b = {}, options = {}) {
  const coreDiff = Number(isCoreLoredeckLibraryPack(b)) - Number(isCoreLoredeckLibraryPack(a));
  if (coreDiff) return coreDiff;
  const manualDiff = getLoredeckLibraryManualSortOrder(a, options.registry, options.placementByPackId) - getLoredeckLibraryManualSortOrder(b, options.registry, options.placementByPackId);
  if (manualDiff) return manualDiff;
  return compareLoredeckLibraryPackTitles(a, b);
}

export function sortLoredeckLibraryFolderPacks(packs = [], options = {}) {
  const indexedOptions = indexLoredeckLibrarySortPlacements(options);
  return [...(packs || [])].sort((a, b) => compareLoredeckLibraryFolderPacks(a, b, indexedOptions));
}

export function sortLoredeckLibraryFolderTreeByTitle(folders = []) {
  return [...(folders || [])]
    .sort(compareLoredeckLibraryFolderTitles)
    .map(folder => ({
      ...folder,
      children: sortLoredeckLibraryFolderTreeByTitle(folder.children || []),
    }));
}

function indexLoredeckLibrarySortPlacements(options = {}) {
  if (options.placementByPackId) return options;
  const placementByPackId = new Map();
  const placements = options.registry?.deckPlacements;
  for (const placement of Array.isArray(placements) ? placements : []) {
    for (const id of [placement?.deckId, placement?.packId]) {
      if (id && !placementByPackId.has(id)) placementByPackId.set(id, placement);
    }
  }
  return { ...options, placementByPackId };
}

function getPlacementForPack(pack = {}, registry = {}, placementByPackId = null) {
  const packId = getPackId(pack);
  if (!packId) return null;
  if (placementByPackId) return placementByPackId.get(packId) || null;
  return (Array.isArray(registry.deckPlacements) ? registry.deckPlacements : [])
    .find(item => item?.deckId === packId || item?.packId === packId) || null;
}

function getFallbackTypeSortOrder(pack = {}) {
  const typeOrder = { bundled: 10000, custom: 20000, generated: 20000 };
  const title = getPackTitle(pack).toLowerCase();
  const titleCode = title ? title.charCodeAt(0) : 0;
  return (typeOrder[pack.type] || 90000) + titleCode;
}

export function getLoredeckLibraryManualSortOrder(pack = {}, registry = {}, placementByPackId = null) {
  const placement = getPlacementForPack(pack, registry, placementByPackId);
  if (Number.isFinite(Number(placement?.sortOrder))) return Number(placement.sortOrder);
  if (Number.isFinite(Number(pack.library?.familyOrder))) return Number(pack.library.familyOrder);
  return getFallbackTypeSortOrder(pack);
}

export function compareLoredeckLibraryPacks(a = {}, b = {}, options = {}) {
  const sortMode = String(options.sortMode || 'manual').trim() || 'manual';
  if (sortMode === 'manual') {
    const diff = getLoredeckLibraryManualSortOrder(a, options.registry, options.placementByPackId) - getLoredeckLibraryManualSortOrder(b, options.registry, options.placementByPackId);
    if (diff) return diff;
  } else if (sortMode === 'type') {
    const typeOrder = { bundled: 0, custom: 1, generated: 1 };
    const diff = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    if (diff) return diff;
  } else if (sortMode === 'health') {
    const healthOrder = { error: 0, warning: 1, unknown: 2, suggestion: 3, ok: 4 };
    const getHealthTone = typeof options.getHealthTone === 'function' ? options.getHealthTone : (() => 'unknown');
    const diff = (healthOrder[getHealthTone(a)] ?? 5) - (healthOrder[getHealthTone(b)] ?? 5);
    if (diff) return diff;
  } else if (sortMode === 'entries') {
    const getEntryCount = typeof options.getEntryCount === 'function' ? options.getEntryCount : (() => 0);
    const diff = (Number(getEntryCount(b)) || 0) - (Number(getEntryCount(a)) || 0);
    if (diff) return diff;
  } else if (sortMode === 'updated') {
    const diff = (Number(b.updatedAt) || Number(b.installedAt) || 0) - (Number(a.updatedAt) || Number(a.installedAt) || 0);
    if (diff) return diff;
  }
  return compareLoredeckLibraryPackTitles(a, b);
}

export function sortLoredeckLibraryPacks(packs = [], options = {}) {
  const indexedOptions = (!options.sortMode || options.sortMode === 'manual') ? indexLoredeckLibrarySortPlacements(options) : options;
  return [...(packs || [])].sort((a, b) => compareLoredeckLibraryPacks(a, b, indexedOptions));
}
