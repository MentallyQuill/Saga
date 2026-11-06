import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLoredeckWorkbenchViewModel } from '../../src/loredecks/loredeck-workbench-view-model.js';

function fixture(overrides = {}) {
  const rows = Array.from({ length: 600 }, (_, index) => Object.freeze({
    id: `entry-${index + 1}`, entry: Object.freeze({ title: `Title ${index + 1}` }),
  }));
  const draft = Object.freeze({ id: 'draft-new', draft: true, entry: Object.freeze({ title: 'Draft' }) });
  return {
    pack: Object.freeze({ packId: 'deck-a', title: 'Deck A' }), packId: 'deck-a',
    filteredRows: Object.freeze([draft, ...rows]), selectedEntryId: 'entry-1',
    selectedIds: Object.freeze(['entry-600']), editable: true, cacheStatus: 'ready', error: null,
    query: 'Title', filters: Object.freeze({ relevance: 'all', category: 'all', status: 'active' }),
    sourceRevision: 1,
    getCells: row => Object.freeze([
      { text: row.entry.title, subText: row.id }, { text: 'character', subText: '' },
      { text: 'normal', subText: '' }, { text: 'active', subText: '' },
    ]),
    ...overrides,
  };
}

test('projection keeps the full logical selection domain and caps only displayed rows', () => {
  const input = Object.freeze(fixture());
  const model = createLoredeckWorkbenchViewModel(input);
  assert.equal(model.logicalRows.length, 601);
  assert.strictEqual(model.logicalRows, input.filteredRows);
  assert.equal(model.logicalIds.length, 600);
  assert.equal(model.logicalIds[0], 'entry-1');
  assert.equal(model.logicalIds[499], 'entry-500');
  assert.equal(model.logicalIds[599], 'entry-600');
  assert.equal(model.logicalIds.includes('draft-new'), false);
  assert.equal(model.displayRows.length, 500);
  assert.strictEqual(model.displayRows[0].row, input.filteredRows[0]);
  assert.equal(model.displayRows[499].row.id, 'entry-499');
  assert.strictEqual(model.selectedRow, input.filteredRows[1]);
  assert.equal(model.displayRows[1].active, true);
  assert.equal(model.displayRows[0].checked, false);
  assert.equal(model.headerChecked, false);
  for (const field of Object.keys(input)) assert.strictEqual(model[field], input[field], field);
});

test('header selection includes hidden rows and excludes drafts and empty IDs', () => {
  const input = fixture();
  const allIds = Array.from({ length: 600 }, (_, index) => `entry-${index + 1}`);
  const partial = createLoredeckWorkbenchViewModel({ ...input, selectedIds: allIds.slice(0, 599) });
  assert.equal(partial.headerChecked, false, 'Unchecked entry-600 is outside the rendered slice.');
  const complete = createLoredeckWorkbenchViewModel({ ...input, selectedIds: allIds });
  assert.equal(complete.headerChecked, true);
  assert.equal(complete.displayRows[0].checked, false);
  assert.equal(complete.displayRows[1].checked, true);
  const emptyId = Object.freeze({ id: '', entry: {} });
  const noSelectableRows = createLoredeckWorkbenchViewModel({
    ...input, filteredRows: [input.filteredRows[0], emptyId], selectedIds: [],
  });
  assert.deepEqual(noSelectableRows.logicalIds, []);
  assert.equal(noSelectableRows.headerChecked, false);
});

test('status updates preserve descriptors and presentation cells without recalculating them', () => {
  let cellCalls = 0;
  const input = fixture();
  const originalCells = input.getCells;
  input.getCells = row => { cellCalls++; return originalCells(row); };
  const first = createLoredeckWorkbenchViewModel(input);
  assert.equal(cellCalls, 500);
  const next = createLoredeckWorkbenchViewModel({ ...input, cacheStatus: 'loading', error: 'Retrying' }, first);
  assert.equal(cellCalls, 500);
  for (let index = 0; index < 500; index++) {
    assert.strictEqual(next.displayRows[index], first.displayRows[index]);
    assert.strictEqual(next.displayRows[index].cells, first.displayRows[index].cells);
  }
  assert.equal(next.cacheStatus, 'loading');
  assert.equal(next.error, 'Retrying');
});

test('active and bulk selection updates replace only affected descriptors and retain cells', () => {
  const input = fixture();
  const first = createLoredeckWorkbenchViewModel(input);
  const next = createLoredeckWorkbenchViewModel({ ...input, selectedEntryId: 'entry-2' }, first);
  for (let index = 0; index < 500; index++) {
    if (index === 1 || index === 2) assert.notStrictEqual(next.displayRows[index], first.displayRows[index]);
    else assert.strictEqual(next.displayRows[index], first.displayRows[index]);
    assert.strictEqual(next.displayRows[index].cells, first.displayRows[index].cells);
  }
  assert.equal(next.displayRows[1].active, false);
  assert.equal(next.displayRows[2].active, true);
  assert.strictEqual(next.selectedRow, input.filteredRows[2]);
  const bulk = createLoredeckWorkbenchViewModel({ ...input, selectedEntryId: 'entry-2', selectedIds: ['entry-3'] }, next);
  for (let index = 0; index < 500; index++) {
    if (index === 3) assert.notStrictEqual(bulk.displayRows[index], next.displayRows[index]);
    else assert.strictEqual(bulk.displayRows[index], next.displayRows[index]);
    assert.strictEqual(bulk.displayRows[index].cells, next.displayRows[index].cells);
  }
  assert.equal(bulk.displayRows[3].checked, true);
});

test('replacement source rows refresh their cells without cloning unrelated rows', () => {
  const input = fixture();
  const first = createLoredeckWorkbenchViewModel(input);
  const replacement = Object.freeze({ ...input.filteredRows[1], entry: { title: 'Updated title' } });
  const filteredRows = [...input.filteredRows];
  filteredRows[1] = replacement;
  const next = createLoredeckWorkbenchViewModel({ ...input, filteredRows, sourceRevision: 2 }, first);
  assert.strictEqual(next.displayRows[1].row, replacement);
  assert.equal(next.displayRows[1].cells[0].text, 'Updated title');
  assert.notStrictEqual(next.displayRows[1].cells, first.displayRows[1].cells);
  assert.strictEqual(next.displayRows[2], first.displayRows[2]);
});

test('same-ID draft and source rows have unique keys scoped to their deck and kind', () => {
  const source = Object.freeze({ id: 'same-id', entry: { title: 'Source' } });
  const draft = Object.freeze({ id: 'same-id', draft: true, entry: { title: 'Draft' } });
  const input = fixture({ filteredRows: [source, draft], selectedIds: ['same-id'] });
  const first = createLoredeckWorkbenchViewModel(input);
  assert.deepEqual(first.logicalIds, ['same-id']);
  assert.notEqual(first.displayRows[0].key, first.displayRows[1].key);
  assert.deepEqual(JSON.parse(first.displayRows[0].key), ['deck-a', 'entry', 'same-id']);
  assert.deepEqual(JSON.parse(first.displayRows[1].key), ['deck-a', 'draft', 'same-id']);
  assert.equal(first.displayRows[0].checked, true);
  assert.equal(first.displayRows[1].checked, false);
  const next = createLoredeckWorkbenchViewModel({ ...input, packId: 'deck-b' }, first);
  assert.notEqual(next.displayRows[0].key, first.displayRows[0].key);
  assert.notStrictEqual(next.displayRows[0], first.displayRows[0]);
});

test('detail selection uses the complete collection and falls back to its first row', () => {
  const input = fixture({ selectedEntryId: 'entry-600' });
  assert.strictEqual(createLoredeckWorkbenchViewModel(input).selectedRow, input.filteredRows[600]);
  assert.strictEqual(createLoredeckWorkbenchViewModel({ ...input, selectedEntryId: 'missing' }).selectedRow, input.filteredRows[0]);
  const empty = createLoredeckWorkbenchViewModel({ ...input, filteredRows: [] });
  assert.equal(empty.selectedRow, null);
  assert.deepEqual(empty.displayRows, []);
  assert.deepEqual(empty.logicalIds, []);
  assert.equal(empty.headerChecked, false);
});
