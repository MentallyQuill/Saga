// Browser-only fixtures. All rendered DOM belongs to the real Saga controllers.
export const PERFORMANCE_FIXTURE_REVISION = 'rendering-performance-v1';
export async function installSagaPerformanceFixture({ deckCount = 77, entryCount = 100, type = 'custom', coverPool = null, library = false } = {}) {
    const [libraryPanel, workbenchPanel, loader, constants] = await Promise.all([
        import('/src/loredecks/loredeck-library-panel.js'), import('/src/loredecks/loredeck-workbench-panel.js'),
        import('/src/loredecks/loredeck-loader.js'), import('/src/state/constants.js'),
    ]);
    const { DEFAULT_BUNDLED_LOREDECK_LIBRARY_RECORDS } = await import('/src/loredecks/loredeck-defaults.js');
    const bundled = DEFAULT_BUNDLED_LOREDECK_LIBRARY_RECORDS;
    const actualCoverPool = coverPool || bundled.filter(pack => pack.assets?.cover?.path).map(pack => ({ packId: pack.packId, path: `content/loredecks/${pack.packId}/${pack.assets?.cover?.path || 'assets/cover.png'}` }));
    const state = constants.getDefaultState();
    const persistenceCalls = [];
    const entryOverrides = Object.fromEntries(Array.from({ length: entryCount }, (_, i) => {
        const id = `fixture.entry.${String(i + 1).padStart(4, '0')}`;
        return [id, { id, schemaVersion: 3, title: `Deck Lorecard ${String(i + 1).padStart(4, '0')}`, category: i % 2 ? 'location' : 'character', relevance: 'normal', canonStatus: 'canon', priority: 50, tags: [`fixture:entry-${i % 10}`], content: { fact: `Deterministic lore fact ${i + 1}.`, injection: `Deterministic lore guidance ${i + 1}.` } }];
    }));
    const virtual = (packId, kind = type) => ({ packId, type: kind, title: `Performance ${kind} ${packId}`, entrySchemaVersion: 3, stats: { entryCount }, manifestData: { id: packId, type: kind, title: `Performance ${packId}`, entrySchemaVersion: 3, files: [] }, entryOverrides: structuredClone(entryOverrides), disabledEntryIds: [] });
    let packs;
    if (library && deckCount === 77) {
        if (bundled.length !== 77) throw new Error(`Expected actual 77-deck library, found ${bundled.length}`);
        packs = structuredClone(bundled);
    } else if (library) {
        packs = Array.from({ length: deckCount }, (_, i) => {
            const cover = actualCoverPool[i % actualCoverPool.length];
            return { packId: `performance-deck-${i}`, type: 'custom', title: `Performance Deck ${String(i + 1).padStart(4, '0')}`, stats: { entryCount }, assets: { cover: { path: typeof cover === 'string' ? cover : cover.path, alt: `Cover ${i % actualCoverPool.length}` } } };
        });
    } else {
        packs = [type === 'bundled' ? structuredClone(bundled[0]) : type === 'error' ? { packId: 'performance-missing-deck', type: 'bundled', title: 'Missing source fixture', manifest: '/__performance/nonexistent-loredeck.json' } : virtual('performance-custom-a')];
        packs.push(virtual('performance-custom-b', 'custom'), virtual('performance-generated', 'generated'));
    }
    const registry = { packs: Object.fromEntries(packs.map(pack => [pack.packId, pack])), folders: [], deckPlacements: [] };
    state.loredeckStack = [];
    const find = id => registry.packs[id];
    const deps = {
        getState: () => state, getLoredeckLibrary: () => packs, getLoredeckLibraryRegistry: () => registry,
        getLoredeckDefinition: find, getFreshLoredeckLibraryPack: (id, fallback) => find(id) || fallback,
        getLoredeckStack: () => state.loredeckStack, getCanonLoreDatabaseSync: () => ({ loredecks: [] }),
        getSettings: () => ({ experienceMode: 'advanced' }), isBasicExperience: () => false,
        isRuntimeMobileShell: () => innerWidth < 600, selectLoredeckForDetails: id => { state.lorePanel.selectedLoredeckId = id; },
        isGeneratedLoredeckPack: pack => pack?.type === 'generated', isBundledLoredeckLibraryPack: pack => pack?.type === 'bundled',
        getLoredeckTypeLabel: id => find(id)?.type || 'Custom',
        persistLoredeckLibraryRecordMutation(pack, mutator, message, options) {
            const before = structuredClone(find(pack.packId));
            const next = structuredClone(before); mutator(next);
            const index = packs.findIndex(p => p.packId === pack.packId); packs[index] = next; registry.packs[pack.packId] = next;
            persistenceCalls.push({ packId: pack.packId, before, after: structuredClone(next), message, options });
            return true;
        },
    };
    libraryPanel.configureLoredeckLibraryPanel(deps);
    workbenchPanel.configureLoredeckWorkbenchPanel(deps);
    const fixture = {
        packs, state, registry, persistenceCalls, coverPool: actualCoverPool, revision: PERFORMANCE_FIXTURE_REVISION,
        openLibrary() { libraryPanel.openLoredeckLibraryWindow(); },
        openWorkbench(packId = packs[0].packId) { workbenchPanel.openLoredeckWorkbench(packId); },
        async openCreator() { const creator = await import('/src/loredecks/loredeck-creator-panel.js'); creator.openLoredeckCreatorWorkbench(); },
        loadSource(packId = packs[0].packId) { return loader.loadLoredeckSourceById(packId, { registry, registryRecord: find(packId) }); },
        close() { workbenchPanel.closeLoredeckWorkbench(); document.querySelector('.saga-loredeck-library-overlay')?.remove(); },
    };
    window.sagaPerformanceFixture = fixture;
    return fixture;
}
