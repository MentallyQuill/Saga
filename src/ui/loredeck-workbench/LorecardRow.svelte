<script>
    let { descriptor, actions, editable } = $props();
</script>

<button
    type="button"
    class="saga-lore-workbench-row saga-lore-workbench-entry-row saga-loredeck-workbench-entry-row"
    class:saga-loredeck-workbench-draft-row={descriptor.row.draft}
    class:saga-loredeck-workbench-disabled-row={descriptor.row.disabled}
    class:saga-loredeck-workbench-row-selected={descriptor.checked}
    class:saga-lore-workbench-row-active={descriptor.active}
    use:actions.tooltip={`Inspect ${descriptor.row.entry?.title || descriptor.row.id}.`}
    onclick={event => actions.inspectRow(descriptor.row.id, event)}
>
    {#if editable}
        <span class="saga-loredeck-workbench-select-cell">
            {#if !descriptor.row.draft}
                <!-- Existing checkbox is a span inside the row button. -->
                <!-- svelte-ignore a11y_interactive_supports_focus, a11y_click_events_have_key_events -->
                <span
                    class="saga-loredeck-workbench-select-box"
                    class:saga-loredeck-workbench-select-box-checked={descriptor.checked}
                    role="checkbox"
                    aria-checked={descriptor.checked ? 'true' : 'false'}
                    use:actions.tooltip={descriptor.checked ? 'Remove this Lorecard from bulk selection.' : 'Add this Lorecard to bulk selection.'}
                    onclick={event => { event.stopPropagation(); actions.toggleRow(descriptor.row.id, event); }}
                >{descriptor.checked ? 'x' : ''}</span>
            {/if}
        </span>
    {/if}
    {#each descriptor.cells as cell}
        <div class="saga-lore-workbench-cell">
            <span class="saga-lore-workbench-cell-main">{String(cell.text || 'unset')}</span>
            {#if cell.subText}<span class="saga-lore-workbench-cell-sub">{String(cell.subText)}</span>{/if}
        </div>
    {/each}
</button>
