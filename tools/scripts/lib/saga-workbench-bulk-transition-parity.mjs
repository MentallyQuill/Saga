import assert from 'node:assert/strict';
import { test } from 'node:test';

const rows = '.saga-loredeck-workbench-entry-row';
const ready = page => page.locator('.saga-lore-workbench-main').waitFor({ state: 'visible' });
const confirm = page => page.locator('.saga-confirm-actions button').filter({ hasText: /^Confirm$/ }).click();

export function registerWorkbenchBulkTransitionParity({ setup, gateSource, clickText }) {
    test('bulk selection buttons update the summary once per click', async t => {
        const h = await setup(t);
        try {
            const result = await h.page.evaluate(async () => {
                const toolbar = document.querySelector('.saga-loredeck-workbench-bulk-toolbar');
                const summary = toolbar.querySelector('.saga-loredeck-workbench-bulk-summary');
                const buttons = [...toolbar.querySelectorAll('button')];
                let updates = 0;
                const observer = new MutationObserver(records => { updates += records.length; });
                observer.observe(summary, { childList: true });
                const results = [];
                for (const label of ['Select Visible', 'Clear']) {
                    buttons.find(button => button.textContent === label).click();
                    // Include the following frame, when busy actions reconcile.
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    results.push({ summary: summary.textContent, updates });
                    updates = 0;
                }
                observer.disconnect();
                return results;
            });
            assert.deepEqual(result, [{ summary: '12 selected', updates: 1 }, { summary: 'No bulk selection', updates: 1 }]);
            assert.deepEqual(h.errors, []);
        } catch (error) {
            if (h.captureFailure) await h.captureFailure(error);
            throw error;
        } finally { await h.stop(); }
    });

    test('five bulk field actions persist exactly two selected entries and preserve independent detail and filters', async t => {
        const h = await setup(t);
        try {
            const toolbar = h.page.locator('.saga-loredeck-workbench-bulk-toolbar');
            const selectTwo = async () => {
                await h.page.locator(`${rows} [role="checkbox"]`).nth(0).click();
                await h.page.locator(`${rows} [role="checkbox"]`).nth(1).click();
                assert.equal(await h.page.locator('.saga-loredeck-workbench-editor-form').getAttribute('data-entry-id'), 'fixture.entry.0001', 'Bulk checkbox does not inspect its row');
                assert.equal(await h.page.locator('.saga-loredeck-workbench-bulk-summary').textContent(), '2 selected');
            };
            const actions = [
                { label: 'Set Category', prepare: () => toolbar.locator('input[placeholder="Category"]').fill('person') },
                { label: 'Set Relevance', prepare: () => toolbar.locator('select').nth(0).selectOption('high') },
                { label: 'Add Tag', prepare: () => toolbar.locator('input[placeholder="Tag"]').fill('fixture:bulk') },
                { label: 'Remove Tag', prepare: () => toolbar.locator('input[placeholder="Tag"]').fill('fixture:bulk') },
                { label: 'Set Context', async prepare() {
                    for (const [placeholder, value] of [['Context Label', 'Bulk test window'], ['From', '1200'], ['To', '1299'], ['From Anchor', 'arc.test.start'], ['To Anchor', 'arc.test.end']]) {
                        await toolbar.locator(`input[placeholder="${placeholder}"]`).fill(value);
                    }
                    await toolbar.locator('select').nth(1).selectOption('window');
                } },
            ];
            for (let index = 0; index < actions.length; index++) {
                const action = actions[index]; await selectTwo(); await action.prepare();
                assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), index, 'Editing bulk controls cannot persist before confirmation');
                await clickText(h.page, action.label);
                assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), index, 'Opening confirmation cannot persist');
                await confirm(h.page); await ready(h.page);
                const call = await h.page.evaluate(i => fixture.persistenceCalls[i], index);
                assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), index + 1);
                assert.equal(call.packId, 'performance-custom-a'); assert.equal(call.after.healthStatus, 'stale');
                assert.deepEqual(Object.keys(call.after.entryOverrides).filter(id => JSON.stringify(call.before.entryOverrides[id]) !== JSON.stringify(call.after.entryOverrides[id])), ['fixture.entry.0001', 'fixture.entry.0002']);
                for (const id of ['fixture.entry.0001', 'fixture.entry.0002']) {
                    const entry = call.after.entryOverrides[id];
                    assert.equal(entry.category, 'person');
                    if (index >= 1) assert.equal(entry.relevance, 'high');
                    if (index === 2) assert.ok(entry.tags.includes('fixture:bulk'));
                    if (index >= 3) assert.equal(entry.tags.includes('fixture:bulk'), false);
                    if (index === 4) assert.deepEqual(entry.context, { scope: 'window', label: 'Bulk test window', sortKeyFrom: 1200, sortKeyTo: 1299, precision: 'manual', validFromAnchor: 'arc.test.start', validToAnchor: 'arc.test.end' });
                    assert.equal(entry.extensions.sagaLoredeckOverride.kind, 'addition');
                }
                assert.equal(await h.page.locator('.saga-loredeck-workbench-bulk-summary').textContent(), 'No bulk selection');
            }
            const filtered = await h.page.evaluate(() => {
                const choose = (index, value) => {
                    const control = document.querySelectorAll('.saga-lore-workbench-controls .saga-lore-workbench-select')[index];
                    control.querySelector('button').click(); control.querySelector(`[role="option"][data-value="${value}"]`).click();
                };
                choose(0, 'high'); choose(1, 'person');
                return { count: document.querySelector('.saga-lore-workbench-count').textContent, rows: document.querySelectorAll('.saga-loredeck-workbench-entry-row').length, writes: fixture.persistenceCalls.length };
            });
            assert.deepEqual(filtered, { count: '2 of 12 Lorecards', rows: 2, writes: 5 });
            assert.deepEqual(h.errors, []);
        } catch (error) {
            if (h.captureFailure) await h.captureFailure(error);
            throw error;
        } finally { await h.stop(); }
    });

    test('deferred source and save responses respect Registry and real experience-close ownership', async t => {
        for (const operation of ['source', 'save']) for (const destination of ['registries', 'experience-close']) {
            const h = await setup(t);
            const label = `${operation}/${destination}`;
            try {
                const source = await gateSource(h, 'performance-custom-a');
                await h.page.evaluate(operation => {
                    if (operation === 'source') [...document.querySelectorAll('#saga-loredeck-workbench button')].find(node => node.textContent === 'Reload Lorecards').click();
                    else {
                        const input = document.querySelector('[name="notes"]'); input.value = 'Submitted before transition';
                        input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur'));
                    }
                }, operation);
                await source.wait();
                await h.page.evaluate(async destination => {
                    if (destination === 'registries') {
                        document.querySelectorAll('.saga-lore-workbench-mode-tab')[1].click();
                        const search = document.querySelector('.saga-loredeck-workbench-registry-search');
                        search.value = 'Registry buffer during source'; search.dispatchEvent(new Event('input'));
                        document.querySelector('.saga-loredeck-workbench-registry-search').focus();
                    } else {
                        const { getSettings } = await import('/src/state/state-manager.js');
                        panel.configureLoredeckWorkbenchPanel({ isBasicExperience: () => getSettings().experienceMode === 'basic' });
                        document.querySelector('.saga-runtime-rail-tab[data-tab-id="settings"]').click();
                        document.querySelector('.saga-experience-switch-label-basic').click();
                        (await import('/src/runtime/lore-panel.js')).hideLorePanel();
                    }
                }, destination);
                await source.release(`Completed ${label}`); await h.page.waitForTimeout(60);
                assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), operation === 'save' ? 1 : 0, label);
                if (operation === 'save') assert.equal(await h.page.evaluate(() => fixture.persistenceCalls[0].after.entryOverrides['fixture.entry.0001'].content.notes), 'Submitted before transition', label);
                assert.equal(await h.page.locator('.saga-loredeck-workbench-editor-form').count(), 0, label);
                if (destination === 'registries') {
                    assert.equal(await h.page.locator('.saga-loredeck-workbench-registry-search').inputValue(), 'Registry buffer during source', label);
                    // Registries retain their existing imperative renderer. Its
                    // replacement nodes are not given a new Lorecards identity
                    // contract; query/tab ownership must still survive.
                    assert.equal(await h.page.locator('.saga-lore-workbench-mode-tab-active').getAttribute('data-workbench-tab'), 'registries', label);
                    await h.page.evaluate(() => document.querySelectorAll('.saga-lore-workbench-mode-tab')[0].click()); await ready(h.page);
                    assert.match(await h.page.locator('.saga-lore-workbench-table').textContent(), new RegExp(`Completed ${label}`));
                    assert.equal(await h.page.locator('[name="notes"]').inputValue(), operation === 'save' ? 'Submitted before transition' : '', label);
                } else {
                    assert.equal(await h.page.locator('#saga-loredeck-workbench').count(), 0, label);
                    await h.page.evaluate(() => fixture.openWorkbench());
                    assert.equal(await h.page.locator('#saga-loredeck-workbench').count(), 0, 'Actual Basic settings guard rejects a later open');
                }
                assert.deepEqual(h.errors, [], label);
            } catch (error) {
                if (h.captureFailure) await h.captureFailure(error);
                throw error;
            } finally { await h.stop(); }
        }
    });
}
