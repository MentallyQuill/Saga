<script>
    import { imperativeLeaf } from './imperative-leaf.js';
    let { snapshot, actions } = $props();
    const ownerKey = model => JSON.stringify([
        model.packId, model.selectedRow?.id ?? null,
        model.selectedRow?.draft ? 'draft' : 'entry', model.editable,
    ]);
</script>

<div
    class="saga-lore-workbench-detail saga-loredeck-workbench-detail"
    class:saga-loredeck-workbench-editor-detail={snapshot.editable && !!snapshot.selectedRow}
    use:imperativeLeaf={{ key: ownerKey(snapshot), model: snapshot, mount: actions.mountDetail }}
></div>
