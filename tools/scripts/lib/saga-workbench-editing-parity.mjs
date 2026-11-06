import assert from 'node:assert/strict';
import { test } from 'node:test';

const form = '.saga-loredeck-workbench-editor-form';
const rows = '.saga-loredeck-workbench-entry-row';
const summary = '.saga-loredeck-workbench-bulk-summary';
const ready = page => page.waitForSelector('.saga-lore-workbench-main', { state: 'visible' });
const confirm = page => page.locator('.saga-confirm-actions button').filter({ hasText: /^Confirm$/ }).click();

export function registerWorkbenchEditingParity({ setup, gateSource, clickText }) {
    for (const type of ['custom', 'generated']) test(`${type}: every editable field obeys input/blur/Enter/Ctrl+Enter/select timing and persistence`, async () => {
        const h = await setup({ type });
        try {
            const edits = [
                ['title', '  Edited title  ', 'enter'], ['category', 'person', 'blur'],
                ['tags', 'fixture:one, fixture:two, fixture:one', 'blur'],
                ['fact', 'Edited fact\nSecond line', 'ctrl'], ['injection', 'Edited injection', 'ctrl'], ['notes', 'Edited notes', 'blur'],
                ['relevance', 'high', 'select'], ['canonStatus', 'au', 'select'],
            ];
            for (let index = 0; index < edits.length; index++) {
                const [name, value, event] = edits[index];
                const input = h.page.locator(`${form} [name="${name}"]`);
                if (event !== 'select') {
                    await input.fill(value);
                    assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), index, `${name} cannot save on input`);
                    if (event === 'enter') await input.press('Enter');
                    else if (event === 'ctrl') {
                        await input.press('Enter');
                        assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), index, `${name}: plain Enter cannot save a textarea`);
                        await input.press('Control+Enter');
                    } else await input.blur();
                } else await input.selectOption(value);
                await h.page.waitForFunction(count => fixture.persistenceCalls.length === count, index + 1);
                await ready(h.page);
            }
            const result = await h.page.evaluate(() => {
                const call = fixture.persistenceCalls.at(-1), pack = call.after, entry = pack.entryOverrides['fixture.entry.0001'];
                return { count: fixture.persistenceCalls.length, packId: call.packId, title: entry.title, category: entry.category,
                    relevance: entry.relevance, canon: entry.canonStatus, tags: entry.tags, content: entry.content,
                    health: pack.healthStatus, kind: entry.extensions.sagaLoredeckOverride.kind, disabled: pack.disabledEntryIds };
            });
            assert.equal(result.count, 8); assert.equal(result.packId, 'performance-custom-a');
            assert.equal(result.title, 'Edited title'); assert.equal(result.category, 'person'); assert.equal(result.relevance, 'high');
            assert.equal(result.canon, 'au'); assert.deepEqual(result.tags, ['fixture:one', 'fixture:two']);
            assert.deepEqual(result.content, { fact: 'Edited fact\nSecond line', injection: 'Edited injection', notes: 'Edited notes' });
            assert.equal(result.health, 'stale'); assert.equal(result.kind, 'addition'); assert.deepEqual(result.disabled, []);
            assert.deepEqual(h.errors, []);
        } finally { await h.stop(); }
    });

    test('bundled source remains read-only through selection, refresh and modifier events', async () => {
        const h = await setup({ type: 'bundled' });
        try {
            assert.equal(await h.page.locator(`${form} input, ${form} textarea, ${form} select`).count(), 0);
            assert.equal(await h.page.locator(`${rows} [role="checkbox"]`).count(), 0);
            assert.equal(await h.page.locator('button').filter({ hasText: /^New Lorecard$/ }).count(), 0);
            await h.page.locator(rows).nth(1).click({ modifiers: ['Control'] });
            await h.page.evaluate(() => panel.refreshLoredeckWorkbench());
            assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), 0);
            assert.deepEqual(h.errors, []);
        } finally { await h.stop(); }
    });

    test('600 entries plus a draft retain full logical selection, collision exclusion, modifier ranges and unchanged row nodes', async () => {
        const h = await setup({ entryCount: 600 });
        try {
            await h.page.evaluate(() => { window.firstRow = document.querySelector('.saga-loredeck-workbench-entry-row'); });
            await h.page.locator(rows).nth(0).click({ modifiers: ['Control'] });
            await h.page.locator(rows).nth(2).click({ modifiers: ['Meta'] });
            assert.equal(await h.page.locator(summary).textContent(), '2 selected');
            await h.page.locator(rows).nth(4).click({ modifiers: ['Shift'] });
            assert.equal(await h.page.locator(summary).textContent(), '4 selected');
            assert.equal(await h.page.evaluate(() => document.querySelector('.saga-loredeck-workbench-entry-row') === firstRow), true);
            await clickText(h.page, 'New Lorecard');
            const draftId = await h.page.locator('[name="machineId"]').inputValue();
            await h.page.locator('[name="title"]').fill('Uncreated draft');
            await h.page.locator('[name="fact"]').fill('Uncreated lore');
            await h.page.evaluate(id => {
                const pack = fixture.registry.packs['performance-custom-a'];
                delete pack.entryOverrides['fixture.entry.0600'];
                pack.entryOverrides[id] = { ...structuredClone(pack.entryOverrides['fixture.entry.0001']), id, title: 'Source shares draft ID' };
                [...document.querySelectorAll('button')].find(node => node.textContent === 'Reload Lorecards').click();
            }, draftId);
            await ready(h.page);
            assert.equal(await h.page.locator(rows).count(), 500);
            assert.match(await h.page.locator('.saga-lore-workbench-table').textContent(), /Showing 500 of/);
            await h.page.locator('.saga-lore-workbench-row-header [role="checkbox"]').click();
            assert.equal(await h.page.locator(summary).textContent(), '600 selected', 'Header selects all 600 source IDs including the colliding source ID; the separate draft never adds a logical ID');
            await clickText(h.page, 'Set Relevance'); await confirm(h.page); await ready(h.page);
            const payload = await h.page.evaluate(id => {
                const call = fixture.persistenceCalls.at(-1);
                return { writes: fixture.persistenceCalls.length, changed: Object.values(call.after.entryOverrides).filter(entry => entry.extensions?.sagaLoredeckOverride).length,
                    collision: Boolean(call.after.entryOverrides[id].extensions?.sagaLoredeckOverride) };
            }, draftId);
            assert.deepEqual(payload, { writes: 1, changed: 600, collision: true });
            await clickText(h.page, 'Select Visible');
            // Select Visible anchors the final logical row, beyond the display
            // cap. Shift-click must still range across the full source domain.
            await h.page.locator(rows).nth(1).click({ modifiers: ['Shift'] });
            assert.equal(await h.page.locator(summary).textContent(), '600 selected');
            const search = h.page.locator('.saga-lore-workbench-search'); await search.fill('entry-1');
            assert.equal(await h.page.locator(summary).textContent(), '60 selected');
            await search.fill(''); await clickText(h.page, 'Select Visible');
            assert.equal(await h.page.locator(summary).textContent(), '600 selected');
            await h.page.evaluate(() => fixture.openWorkbench()); await ready(h.page);
            assert.equal(await h.page.locator(summary).textContent(), 'No bulk selection');
            await h.page.evaluate(() => fixture.openWorkbench('performance-custom-b')); await ready(h.page);
            assert.equal(await h.page.locator(summary).textContent(), 'No bulk selection');
            assert.deepEqual(h.errors, []);
        } finally { await h.stop(); }
    });

    test('draft validation and cancel never persist; disabled entries are restored by an actual field save', async () => {
        const h = await setup();
        try {
            await clickText(h.page, 'New Lorecard');
            await h.page.locator('[name="title"]').fill(''); await clickText(h.page, 'Create Lorecard');
            assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), 0);
            await h.page.locator('[name="title"]').fill('Required fact'); await clickText(h.page, 'Create Lorecard');
            assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), 0);
            await h.page.locator('[name="machineId"]').fill('fixture.entry.0001');
            await h.page.locator('[name="fact"]').fill('Draft content'); await clickText(h.page, 'Create Lorecard');
            assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), 0);
            await clickText(h.page, 'Cancel');
            assert.equal(await h.page.locator('[name="machineId"]').count(), 0);
            await h.page.evaluate(() => {
                fixture.registry.packs['performance-custom-a'].disabledEntryIds = ['fixture.entry.0001'];
                [...document.querySelectorAll('button')].find(node => node.textContent === 'Reload Lorecards').click();
            });
            await ready(h.page);
            await h.page.evaluate(() => {
                const select = document.querySelectorAll('.saga-lore-workbench-controls .saga-lore-workbench-select')[2];
                select.querySelector('button').click(); select.querySelector('[role="option"][data-value="all"]').click();
                document.querySelector('.saga-loredeck-workbench-disabled-row').click();
            });
            await h.page.locator('[name="notes"]').fill('Restore by saving'); await h.page.locator('[name="notes"]').blur(); await ready(h.page);
            const result = await h.page.evaluate(() => ({ writes: fixture.persistenceCalls.length, disabled: fixture.persistenceCalls[0].after.disabledEntryIds, health: fixture.persistenceCalls[0].after.healthStatus }));
            assert.deepEqual(result, { writes: 1, disabled: [], health: 'stale' }); assert.deepEqual(h.errors, []);
        } finally { await h.stop(); }
    });

    for (const action of ['Set Relevance', 'Delete Selected', 'Duplicate Selected']) for (const target of ['performance-custom-a', 'performance-custom-b']) {
        test(`${action} confirmation preserves dirty selected ${target} after an A session change`, async () => {
            const h = await setup();
            try {
                await h.page.locator(`${rows} [role="checkbox"]`).first().click(); await clickText(h.page, action);
                await h.page.waitForSelector('.saga-confirm-overlay');
                await h.page.evaluate(id => { panel.closeLoredeckWorkbench(); fixture.openWorkbench(id); }, target); await ready(h.page);
                await h.page.evaluate(() => {
                    document.querySelectorAll('.saga-loredeck-workbench-entry-row')[1].click();
                    document.querySelectorAll('.saga-loredeck-workbench-entry-row [role="checkbox"]')[1].click();
                    const input = document.querySelector('[name="notes"]'); input.value = 'Dirty new owner'; input.dispatchEvent(new Event('input'));
                    window.dirtyNewOwner = input;
                });
                await confirm(h.page);
                await h.page.waitForFunction(() => fixture.persistenceCalls.length === 1);
                await h.page.waitForTimeout(50);
                const result = await h.page.evaluate(() => ({ count: fixture.persistenceCalls.length, pack: fixture.persistenceCalls[0].packId,
                    selected: document.querySelector('.saga-loredeck-workbench-bulk-summary').textContent,
                    input: document.querySelector('[name="notes"]') === dirtyNewOwner, buffer: dirtyNewOwner.value,
                    id: document.querySelector('.saga-loredeck-workbench-editor-form').dataset.entryId,
                    status: document.querySelector('[data-loredeck-workbench-save-chip]').textContent }));
                assert.deepEqual(result, { count: 1, pack: 'performance-custom-a', selected: '1 selected', input: true, buffer: 'Dirty new owner', id: 'fixture.entry.0002', status: 'Unsaved changes' });
                assert.deepEqual(h.errors, []);
            } finally { await h.stop(); }
        });
    }

    test('retained bulk busy controls settle after an operation source reload is superseded', async () => {
        const h = await setup();
        try {
            const source = await gateSource(h, 'performance-custom-a');
            await h.page.locator(`${rows} [role="checkbox"]`).first().click();
            await clickText(h.page, 'Set Relevance'); await confirm(h.page); await source.wait();
            await h.page.evaluate(() => [...document.querySelectorAll('button')].find(node => node.textContent === 'Reload Lorecards').click());
            await source.wait(2); await source.release('Newer source', 1); await ready(h.page);
            // Bulk completion clears selection. A fresh selection must re-enable
            // this retained button after both shared busy-helper finalizers.
            await h.page.locator(`${rows} [role="checkbox"]`).first().click();
            await source.release('Older operation');
            await h.page.waitForTimeout(80);
            const result = await h.page.evaluate(() => {
                const buttons = [...document.querySelectorAll('.saga-loredeck-workbench-bulk-toolbar button')];
                return { applying: buttons.some(node => node.textContent === 'Applying...'),
                    setDisabled: buttons.find(node => node.textContent === 'Set Relevance')?.disabled,
                    writes: fixture.persistenceCalls.length };
            });
            assert.deepEqual(result, { applying: false, setDisabled: false, writes: 1 }); assert.deepEqual(h.errors, []);
        } finally { await h.stop(); }
    });

    test('table and editor scroll independently while composing text survives a header selection update', async () => {
        const h = await setup({ entryCount: 600 });
        try {
            const result = await h.page.evaluate(() => {
                const table = document.querySelector('.saga-lore-workbench-table');
                const detail = document.querySelector('.saga-lore-workbench-detail');
                const area = document.querySelector('[name="fact"]');
                area.value = Array.from({ length: 100 }, (_, i) => `Composition ${i}`).join('\n');
                area.dispatchEvent(new CompositionEvent('compositionstart', { data: 'Composition' }));
                area.dispatchEvent(new InputEvent('input', { isComposing: true, data: 'Composition' }));
                area.focus(); area.setSelectionRange(3, 18, 'forward'); area.scrollTop = 120; table.scrollTop = 250;
                if (detail) detail.scrollTop = 90;
                const before = [table.scrollTop, detail?.scrollTop, area.scrollTop];
                document.querySelector('.saga-lore-workbench-row-header [role="checkbox"]').click();
                const after = [table.scrollTop, detail?.scrollTop, area.scrollTop];
                return { before, after, identity: document.querySelector('[name="fact"]') === area, value: area.value.startsWith('Composition 0'),
                    caret: [area.selectionStart, area.selectionEnd], writes: fixture.persistenceCalls.length };
            });
            assert.ok(result.before[0] > 0); assert.ok(result.before[2] > 0); assert.deepEqual(result.after, result.before);
            assert.equal(result.identity, true); assert.equal(result.value, true); assert.deepEqual(result.caret, [3, 18]); assert.equal(result.writes, 0);
            assert.deepEqual(h.errors, []);
        } finally { await h.stop(); }
    });

    test('a late field-save response cannot acknowledge the dirty editor of a reopened same-pack session', async () => {
        const h = await setup();
        try {
            const source = await gateSource(h, 'performance-custom-a');
            await h.page.evaluate(() => {
                const input = document.querySelector('[name="notes"]'); input.value = 'Old owner submitted';
                input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur'));
            });
            await source.wait();
            await h.page.evaluate(() => { panel.closeLoredeckWorkbench(); fixture.openWorkbench(); });
            await source.wait(2); await source.release('New owner source', 1); await ready(h.page);
            await h.page.evaluate(() => {
                window.newSessionInput = document.querySelector('[name="notes"]');
                newSessionInput.value = 'New session unsubmitted'; newSessionInput.dispatchEvent(new Event('input'));
            });
            await source.release('Old save response'); await h.page.waitForTimeout(60);
            assert.deepEqual(await h.page.evaluate(() => ({
                node: document.querySelector('[name="notes"]') === newSessionInput, value: newSessionInput.value,
                writes: fixture.persistenceCalls.length, persisted: fixture.persistenceCalls[0].after.entryOverrides['fixture.entry.0001'].content.notes,
                status: document.querySelector('[data-loredeck-workbench-save-chip]').textContent,
                oldSourcePublished: document.querySelector('.saga-lore-workbench-table').textContent.includes('Old save response'),
            })), { node: true, value: 'New session unsubmitted', writes: 1, persisted: 'Old owner submitted', status: 'Unsaved changes', oldSourcePublished: false });
            assert.deepEqual(h.errors, []);
        } finally { await h.stop(); }
    });

    test('real file-backed source edits persist an override and delete/restore changes disabled IDs without deleting the source', async () => {
        const h = await setup();
        try {
            const source = await gateSource(h, 'performance-custom-a');
            await clickText(h.page, 'Reload Lorecards'); await source.wait(); await source.release(); await ready(h.page);
            await h.page.locator(rows).filter({ hasText: 'Loaded source marker' }).click();
            await h.page.locator('[name="title"]').fill('Edited source title'); await h.page.locator('[name="title"]').blur();
            await source.wait(); await source.release(); await ready(h.page);
            const saved = await h.page.evaluate(() => fixture.persistenceCalls[0].after.entryOverrides['source.performance-custom-a']);
            assert.equal(saved.title, 'Edited source title'); assert.equal(saved.extensions.sagaLoredeckOverride.kind, 'override');
            await h.page.locator(rows).filter({ hasText: 'Edited source title' }).locator('[role="checkbox"]').click();
            await clickText(h.page, 'Delete Selected'); await confirm(h.page); await source.wait(); await source.release(); await ready(h.page);
            assert.equal(await h.page.locator(rows).filter({ hasText: 'Edited source title' }).count(), 0);
            const deleted = await h.page.evaluate(() => fixture.persistenceCalls[1].after);
            assert.deepEqual(deleted.disabledEntryIds, ['source.performance-custom-a']); assert.equal(deleted.healthStatus, 'stale');
            assert.equal(deleted.entryOverrides['source.performance-custom-a'], undefined, 'Deleting a source override restores the underlying source and suppresses its ID');
            await h.page.evaluate(() => {
                const control = document.querySelectorAll('.saga-lore-workbench-controls .saga-lore-workbench-select')[2];
                control.querySelector('button').click(); control.querySelector('[role="option"][data-value="all"]').click();
            });
            await h.page.locator(rows).filter({ hasText: 'Loaded source marker' }).locator('[role="checkbox"]').click();
            await clickText(h.page, 'Restore Selected'); await confirm(h.page); await source.wait(); await source.release(); await ready(h.page);
            const restored = await h.page.evaluate(() => ({ count: fixture.persistenceCalls.length, after: fixture.persistenceCalls[2].after }));
            assert.equal(restored.count, 3); assert.deepEqual(restored.after.disabledEntryIds, []); assert.equal(restored.after.healthStatus, 'stale');
            assert.equal(await h.page.locator('.saga-loredeck-workbench-disabled-row').count(), 0); assert.deepEqual(h.errors, []);
        } finally { await h.stop(); }
    });
}
