// Intentionally isolate the compiled boundary from the host's startup graph.
export async function runAdapterContract() {
    const { mount } = await import('/src/ui/generated/workbench/view.js');
    const { createLoredeckWorkbenchViewModel: project } = await import('/src/loredecks/loredeck-workbench-view-model.js');
    const { bindLoredeckCoverImage, getLoredeckCoverSources } = await import('/src/loredecks/loredeck-cover-image.js');
    const { BUNDLED_COVER_ORIGINALS } = await import('/src/loredecks/generated/loredeck-cover-thumbnails.js');
    const errors = [], disposed = [], mounts = [];
    const host = document.createElement('div'); document.body.appendChild(host);
    let input = { packId: 'native-contract', pack: { packId: 'native-contract' },
        filteredRows: Array.from({ length: 601 }, (_, i) => ({ id: `entry-${i}`, entry: { title: `Title ${i}` } })),
        selectedEntryId: 'entry-0', selectedIds: [], editable: true, cacheStatus: 'ready',
        query: '', filters: { category: 'all', relevance: 'all', status: 'active' },
        getCells: row => [{ text: row.entry.title }, { text: 'character' }, { text: 'normal' }, { text: 'active' }],
    };
    let snapshot = project(input), handle;
    const update = patch => { input = { ...input, ...patch }; snapshot = project(input, snapshot); handle.update(snapshot); };
    const leaf = name => (node, model) => {
        mounts.push(name);
        const input = document.createElement(name === 'detail' ? 'textarea' : 'input'); input.value = model.query;
        node.appendChild(input);
        return { update() {}, dispose() { disposed.push({ name, connected: node.isConnected }); node.textContent = ''; } };
    };
    const actions = { onError: error => errors.push(String(error)), tooltip: () => ({ update() {}, destroy() {} }),
        inspectRow: id => update({ selectedEntryId: id }), toggleRow: id => update({ selectedIds: [id] }),
        toggleHeader: () => update({ selectedIds: snapshot.logicalIds }), setQuery: query => update({ query }), setFilter() {},
        mountControls: leaf('controls'), mountBulkToolbar: leaf('bulk'), mountTableHeader: leaf('header'), mountDetail: leaf('detail'),
    };
    handle = mount(host, snapshot, actions);
    const nodes = Array.from(host.querySelectorAll('.saga-loredeck-workbench-entry-row'));
    const area = host.querySelector('textarea'); area.value = 'Unsaved native buffer'; area.focus(); area.setSelectionRange(2, 7);
    update({ selectedIds: snapshot.logicalIds, saveStatus: 'dirty' });
    const retained = nodes.every((node, i) => host.querySelectorAll('.saga-loredeck-workbench-entry-row')[i] === node)
        && host.querySelector('textarea') === area && area.value === 'Unsaved native buffer' && area.selectionStart === 2;
    const selected = host.querySelectorAll('[role="checkbox"][aria-checked="true"]').length;
    const logical = snapshot.selectedIds.length;
    update({ cacheStatus: 'loading', retainLoadedView: true });
    const loading = host.querySelector('.saga-lore-empty').textContent;
    update({ cacheStatus: 'ready', retainLoadedView: false });
    nodes[1].click();
    const clicked = snapshot.selectedEntryId;
    handle.dispose(); handle.dispose();
    await new Promise(resolve => requestAnimationFrame(resolve));
    const result = { rows: nodes.length, retained, selected, logical, loading, clicked,
        disposed: disposed.length, mounted: mounts.length, connectedCleanup: disposed.every(item => item.connected), children: host.children.length, errors };
    host.remove();
    const visual = document.createElement('div'), image = document.createElement('img');
    visual.style.cssText = 'width:64px;height:80px;overflow:hidden;display:grid'; image.style.cssText = 'width:100%;height:100%;object-fit:cover';
    visual.appendChild(image); document.body.appendChild(visual);
    const pack = { assets: { cover: { path: Object.keys(BUNDLED_COVER_ORIGINALS)[0], fit: 'cover' } } };
    const before = image.style.cssText;
    const release = bindLoredeckCoverImage(visual, image, pack, { usage: 'list' });
    for (let i = 0; i < 200 && !(image.complete && image.naturalWidth > 0); i++) await new Promise(resolve => setTimeout(resolve, 10));
    result.cover = { unsupportedAspectRatio: !CSS.supports('aspect-ratio', '1 / 1'),
        originalSelected: image.src === getLoredeckCoverSources(pack).originalSrc,
        loaded: image.complete && image.naturalWidth > 0, width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height };
    release(); release(); result.cover.stylesRestored = image.style.cssText === before; visual.remove();
    return result;
}
