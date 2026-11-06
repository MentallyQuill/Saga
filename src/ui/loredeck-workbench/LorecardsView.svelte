<script>
    import LorecardRow from './LorecardRow.svelte';
    import DetailLeaf from './DetailLeaf.svelte';
    import { imperativeLeaf } from './imperative-leaf.js';
    let { bridge, actions } = $props();
</script>

    <div
        class="saga-lore-workbench-controls saga-loredeck-workbench-controls"
        use:imperativeLeaf={{ key: bridge.snapshot.packId, model: bridge.snapshot, mount: actions.mountControls }}
    ></div>
    {#if bridge.snapshot.cacheStatus === 'loading'}
        <div class="saga-lore-empty">Loading Lorecards...</div>
    {:else if bridge.snapshot.error}
        <div class="saga-lore-empty">{bridge.snapshot.error}</div>
    {/if}
    {#if bridge.snapshot.retainLoadedView || (bridge.snapshot.cacheStatus !== 'loading' && !bridge.snapshot.error)}
        {#if bridge.snapshot.editable}
            <div
                class="saga-loredeck-workbench-bulk-toolbar"
                hidden={bridge.snapshot.cacheStatus === 'loading' || !!bridge.snapshot.error}
                style:display={bridge.snapshot.cacheStatus === 'loading' || bridge.snapshot.error ? 'none' : undefined}
                use:imperativeLeaf={{ key: bridge.snapshot.packId, model: bridge.snapshot, mount: actions.mountBulkToolbar }}
            ></div>
        {/if}
        <div class="saga-lore-workbench-main saga-loredeck-workbench-main"
            hidden={bridge.snapshot.cacheStatus === 'loading' || !!bridge.snapshot.error}
            style:display={bridge.snapshot.cacheStatus === 'loading' || bridge.snapshot.error ? 'none' : undefined}>
            <div
                class="saga-lore-workbench-table saga-loredeck-workbench-table"
                class:saga-loredeck-workbench-selectable-table={bridge.snapshot.editable}
            >
                <div
                    class="saga-lore-workbench-row saga-lore-workbench-row-header"
                    use:imperativeLeaf={{ key: JSON.stringify([bridge.snapshot.packId, bridge.snapshot.editable]), model: bridge.snapshot, mount: actions.mountTableHeader }}
                ></div>
                {#each bridge.snapshot.displayRows as descriptor (descriptor.key)}
                    <LorecardRow {descriptor} {actions} editable={bridge.snapshot.editable} />
                {/each}
                {#if !bridge.snapshot.logicalRows.length}
                    <div class="saga-lore-empty">No Lorecards match the current filters.</div>
                {:else if bridge.snapshot.displayRows.length < bridge.snapshot.logicalRows.length}
                    <div class="saga-lore-workbench-row-note">Showing {bridge.snapshot.displayRows.length} of {bridge.snapshot.logicalRows.length}. Narrow search or filters to inspect more.</div>
                {/if}
            </div>
            <DetailLeaf snapshot={bridge.snapshot} {actions} />
        </div>
    {/if}
