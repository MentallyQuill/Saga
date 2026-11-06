/**
 * Project controller-owned rows without cloning entries or restricting the
 * logical selection domain to the rendered slice. Mutated source rows must be
 * replaced by the controller so cached cells cannot hide a real edit.
 */
export function createLoredeckWorkbenchViewModel(input, previous = null) {
    const prior = new Map((previous?.displayRows || []).map(item => [item.key, item]));
    const selected = new Set(input.selectedIds);
    const logicalRows = input.filteredRows;
    const logicalIds = logicalRows.filter(row => row.id && !row.draft).map(row => row.id);
    const displayRows = logicalRows.slice(0, 500).map(row => {
        const key = JSON.stringify([input.packId, row.draft ? 'draft' : 'entry', row.id]);
        const active = row.id === input.selectedEntryId;
        const checked = !row.draft && selected.has(row.id);
        const old = prior.get(key);
        const cells = old?.row === row ? old.cells : input.getCells(row);
        return old?.row === row && old.active === active && old.checked === checked
            ? old : { key, row, active, checked, cells };
    });

    return {
        ...input,
        logicalRows,
        logicalIds,
        displayRows,
        headerChecked: logicalIds.length > 0 && logicalIds.every(id => selected.has(id)),
        selectedRow: logicalRows.find(row => row.id === input.selectedEntryId) || logicalRows[0] || null,
    };
}
