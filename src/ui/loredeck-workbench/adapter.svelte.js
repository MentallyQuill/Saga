import { flushSync, mount as mountComponent, unmount } from 'svelte';
import LorecardsView from './LorecardsView.svelte';

export function mount(target, snapshot, actions) {
    let current = $state.raw(snapshot);
    let component = null;
    let disposed = false;
    const leaves = new Set();
    const bridge = { get snapshot() { return current; } };
    // Event handlers and rejected promises are separate from synchronous render
    // work so each failure is delivered exactly once.
    const invoke = callback => {
        try {
            const result = callback();
            if (result && typeof result.then === 'function') return Promise.resolve(result).catch(actions.onError);
            return result;
        } catch (error) { actions.onError(error); }
    };
    const guarded = { ...actions };
    const disposeLeaves = predicate => {
        for (const leaf of [...leaves]) if (predicate(leaf)) leaf.dispose();
    };
    for (const name of ['inspectRow', 'toggleRow', 'toggleHeader', 'setQuery', 'setFilter']) {
        guarded[name] = (...args) => invoke(() => actions[name](...args));
    }
    for (const name of ['mountControls', 'mountBulkToolbar', 'mountTableHeader', 'mountDetail']) {
        guarded[name] = (node, model) => {
            let leaf;
            try { leaf = actions[name](node, model); }
            catch (error) {
                // Roll back already-mounted siblings before unmount removes DOM.
                disposeLeaves(() => true);
                throw error;
            }
            let active = true;
            const owned = {
                name,
                update: next => { if (active) invoke(() => leaf.update(next)); },
                dispose() {
                    if (!active) return;
                    active = false;
                    leaves.delete(owned);
                    invoke(() => leaf.dispose());
                },
            };
            leaves.add(owned);
            return owned;
        };
    }
    guarded.tooltip = (node, text) => {
        let tooltip;
        try { tooltip = actions.tooltip(node, text); }
        catch (error) {
            disposeLeaves(() => true);
            throw error;
        }
        return {
            update: next => invoke(() => tooltip?.update?.(next)),
            destroy: () => invoke(() => tooltip?.destroy?.()),
        };
    };
    function dispose() {
        if (disposed) return;
        disposed = true;
        // Svelte action destroy runs after DOM removal in the pinned runtime.
        disposeLeaves(() => true);
        if (component) void unmount(component, { outro: false }).catch(actions.onError);
        component = null;
        current = null;
    }
    try {
        component = mountComponent(LorecardsView, {
            target, props: { bridge, actions: guarded }, intro: false,
        });
        flushSync();
    } catch (error) {
        dispose();
        actions.onError(error);
        throw error;
    }
    return {
        update(next) {
            if (disposed) return;
            try {
                const hideMain = next.cacheStatus === 'loading' || !!next.error;
                disposeLeaves(leaf => leaf.name !== 'mountControls' && (
                    hideMain || (leaf.name === 'mountBulkToolbar' && !next.editable)
                ));
                // An inner Svelte boundary removes DOM before its onerror callback.
                // Catch at the synchronous adapter boundary to clean attached leaves.
                flushSync(() => { current = next; });
            } catch (error) {
                dispose();
                actions.onError(error);
            }
        },
        dispose,
    };
}
