/**
 * Project controller-owned rows without cloning entries or restricting the
 * logical selection domain to the rendered slice. Mutated source rows must be
 * replaced by the controller so cached cells cannot hide a real edit.
 */
export function createLoredeckWorkbenchViewModel(input, previous = null) {
    const { filteredRows: logicalRows, packId, selectedEntryId } = input;
    let prior;
    if (logicalRows.length && previous?.displayRows?.length) {
        prior = new Map();
        for (const item of previous.displayRows) prior.set(item.key, item);
    }
    const selected = new Set(input.selectedIds);
    const logicalIds = [];
    const displayRows = [];
    let selectedRow = null;
    let headerChecked = true;

    for (const row of logicalRows) {
        const { id, draft } = row;
        const active = id === selectedEntryId;
        if (active && !selectedRow) selectedRow = row;
        const displayed = displayRows.length < 500;
        // Hidden rows only need a membership check while the header can stay checked.
        const checked = !draft && (displayed || headerChecked) && selected.has(id);
        if (id && !draft) {
            logicalIds.push(id);
            if (!checked) headerChecked = false;
        }
        if (!displayed) continue;

        const key = JSON.stringify([packId, draft ? 'draft' : 'entry', id]);
        const old = prior?.get(key);
        const cells = old?.row === row ? old.cells : input.getCells(row);
        displayRows.push(old?.row === row && old.active === active && old.checked === checked
            ? old : { key, row, active, checked, cells });
    }

    return {
        ...input,
        logicalRows,
        logicalIds,
        displayRows,
        headerChecked: logicalIds.length > 0 && headerChecked,
        selectedRow: selectedRow || displayRows[0]?.row || null,
    };
}
