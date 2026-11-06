import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { writeFile } from 'node:fs/promises';
import { startSagaPerformanceHarness } from './lib/saga-performance-harness.mjs';
import { registerWorkbenchEditingParity } from './lib/saga-workbench-editing-parity.mjs';
import { parityProvenance } from './lib/saga-parity-provenance.mjs';

const provenance = await parityProvenance(['tools/scripts/test-loredeck-workbench-browser-parity.mjs', 'tools/scripts/lib/saga-workbench-editing-parity.mjs']);
const browsers = new Map();
const startHarness = async options => {
    const harness = await startSagaPerformanceHarness({ browserName: process.env.SAGA_PARITY_BROWSER || 'chromium', ...options });
    browsers.set(harness.executablePath, { name: harness.browserName, version: harness.browserVersion, executablePath: harness.executablePath });
    return harness;
};
after(async () => {
    if (process.env.SAGA_PARITY_REPORT) await writeFile(process.env.SAGA_PARITY_REPORT, JSON.stringify({ provenance, browsers: [...browsers.values()] }, null, 2));
});
const setup = async (options = {}) => {
    const harness = await startHarness();
    try {
        await harness.page.evaluate(async options => {
            const { installSagaPerformanceFixture } = await import('/tests/browser/performance-fixtures.mjs');
            window.fixture = await installSagaPerformanceFixture({ entryCount: 12, ...options });
            window.panel = await import('/src/loredecks/loredeck-workbench-panel.js');
            fixture.openWorkbench();
        }, options);
        await harness.page.waitForSelector(options.type === 'bundled' ? '.saga-lore-workbench-detail' : '.saga-loredeck-workbench-editor-form');
        return harness;
    } catch (error) { await harness.stop(); throw error; }
};

test('controller retains shell, table, search, editor buffers and caret through refresh and real save reload', async () => {
    const h = await setup();
    try {
        const result = await h.page.evaluate(async () => {
            const one = selector => document.querySelector(selector);
            const shell = one('.saga-lore-workbench-shell');
            const table = one('.saga-lore-workbench-table');
            const search = one('.saga-lore-workbench-search');
            search.focus(); search.value = 'fixture';
            search.dispatchEvent(new CompositionEvent('compositionstart', { data: 'fixture' }));
            search.dispatchEvent(new InputEvent('input', { data: 'fixture', isComposing: true }));
            panel.refreshLoredeckWorkbench();
            const searchComposing = one('.saga-lore-workbench-search') === search && document.activeElement === search && search.value === 'fixture';
            search.dispatchEvent(new CompositionEvent('compositionend', { data: 'fixture' }));
            const title = one('[name="title"]');
            title.value = 'Edited original entry'; title.focus(); title.setSelectionRange(7, 7);
            title.dispatchEvent(new CompositionEvent('compositionstart', { data: 'Edited' }));
            title.dispatchEvent(new Event('input'));
            panel.refreshLoredeckWorkbench();
            const retained = {
                shell: one('.saga-lore-workbench-shell') === shell,
                table: one('.saga-lore-workbench-table') === table,
                search: one('.saga-lore-workbench-search') === search,
                editor: one('[name="title"]') === title,
                buffer: one('[name="title"]').value === 'Edited original entry',
                caret: document.activeElement === title && title.selectionStart === 7,
                searchComposing,
            };
            title.dispatchEvent(new CompositionEvent('compositionend', { data: 'Edited' }));
            title.dispatchEvent(new Event('blur'));
            await new Promise(resolve => setTimeout(resolve, 80));
            retained.reloadEditor = one('[name="title"]') === title;
            retained.persisted = fixture.persistenceCalls.length === 1 && fixture.persistenceCalls[0].after.entryOverrides['fixture.entry.0001'].title === 'Edited original entry';
            return retained;
        });
        assert.deepEqual(result, Object.fromEntries(Object.keys(result).map(key => [key, true])));
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

for (const target of ['performance-custom-b', 'performance-custom-a']) test(`confirmation captures original rows and session before reopening ${target}`, async () => {
    const h = await setup();
    try {
        await h.page.locator('.saga-loredeck-workbench-entry-row [role=checkbox]').first().click();
        await h.page.locator('button').filter({ hasText: /^Duplicate Selected$/ }).click();
        await h.page.waitForSelector('.saga-confirm-overlay');
        await h.page.evaluate(id => {
            const pack = fixture.registry.packs[id];
            pack.entryOverrides['fixture.entry.0001'].title = 'Reopened target title';
            if (id === 'performance-custom-b') pack.entryOverrides['fixture.entry.0001.copy-1'] = {
                ...pack.entryOverrides['fixture.entry.0001'], id: 'fixture.entry.0001.copy-1', title: 'B-only collision',
            };
            fixture.openWorkbench(id);
            if (id === 'performance-custom-a') [...document.querySelectorAll('button')].find(node => node.textContent === 'Reload Lorecards').click();
        }, target);
        await h.page.waitForSelector('.saga-loredeck-workbench-editor-form');
        await h.page.locator('.saga-confirm-actions button').filter({ hasText: /^Confirm$/ }).click();
        await h.page.waitForTimeout(80);
        const result = await h.page.evaluate(() => ({
            target: fixture.persistenceCalls[0]?.packId,
            count: fixture.persistenceCalls.length,
            copied: Object.keys(fixture.persistenceCalls[0]?.after.entryOverrides || {}).some(id => id.includes('copy')),
            copiedTitle: fixture.persistenceCalls[0]?.after.entryOverrides['fixture.entry.0001.copy-1']?.title,
            header: document.querySelector('.saga-lore-workbench-title').textContent,
            save: document.querySelector('[data-loredeck-workbench-save-chip]').textContent,
            selected: document.querySelector('.saga-loredeck-workbench-bulk-summary').textContent,
        }));
        assert.equal(result.target, 'performance-custom-a'); assert.equal(result.count, 1); assert.equal(result.copied, true);
        assert.equal(result.copiedTitle, 'Copy of Deck Lorecard 0001');
        assert.ok(result.header.includes(target)); assert.equal(result.save, 'Editable'); assert.equal(result.selected, 'No bulk selection');
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

const clickText = (page, text) => page.locator('#saga-loredeck-workbench button').filter({ hasText: new RegExp(`^${text}$`) }).click();

test('real duplicate and draft-create reloads retain their intended new selected entry', async () => {
    const h = await setup();
    try {
        await h.page.locator('.saga-loredeck-workbench-entry-row [role=checkbox]').first().click();
        await clickText(h.page, 'Duplicate Selected');
        await h.page.locator('.saga-confirm-actions button').filter({ hasText: /^Confirm$/ }).click();
        await h.page.waitForFunction(() => document.querySelector('.saga-loredeck-workbench-editor-form')?.dataset.entryId === 'fixture.entry.0001.copy-1');
        assert.equal(await h.page.locator('.saga-loredeck-workbench-bulk-summary').textContent(), '1 selected');
        await clickText(h.page, 'New Lorecard');
        const id = await h.page.locator('[name="machineId"]').inputValue();
        await h.page.locator('[name="title"]').fill('Created draft title');
        await h.page.locator('[name="fact"]').fill('Created draft lore text');
        await clickText(h.page, 'Create Lorecard');
        await h.page.waitForFunction(id => document.querySelector('.saga-loredeck-workbench-editor-form')?.dataset.entryId === id
            && !document.querySelector('[name="machineId"]'), id);
        assert.match(await h.page.locator('.saga-lore-workbench-row-active').textContent(), /Created draft title/);
        const calls = await h.page.evaluate(() => fixture.persistenceCalls.map(call => call.after));
        assert.equal(calls.length, 2);
        assert.equal(calls[1].entryOverrides[id].content.fact, 'Created draft lore text');
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

async function gateSource(h, packId) {
    const pending = [];
    const pattern = `**/__task7/${packId}/entries.json`;
    await h.page.route(pattern, route => new Promise(resolve => pending.push({ route, resolve })));
    await h.page.evaluate(id => {
        const pack = fixture.registry.packs[id];
        pack.manifest = `${location.origin}/__task7/${id}/loredeck.json`;
        pack.manifestData.files = ['entries.json'];
    }, packId);
    return {
        async wait(count = 1) {
            for (let attempt = 0; attempt < 200 && pending.length < count; attempt++) await new Promise(resolve => setTimeout(resolve, 10));
            assert.ok(pending.length >= count, `Expected ${count} pending ${packId} source request(s), got ${pending.length}`);
        },
        async release(marker = 'Loaded source marker', index = 0) {
            assert.ok(pending.length, 'A real source request must be pending');
            const [{ route, resolve }] = pending.splice(index, 1);
            await route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: `source.${packId}`, schemaVersion: 3, title: marker, category: 'character', relevance: 'normal', content: { fact: 'Real loader source.' } }]) });
            resolve();
        },
    };
}

for (const submit of ['select', 'blur']) test(`a new ${submit} save persists immediately after a newer reload overtakes an earlier save reload`, async () => {
    const h = await setup();
    try {
        const source = await gateSource(h, 'performance-custom-a');
        await h.page.evaluate(() => {
            const title = document.querySelector('[name="title"]');
            title.value = 'First submitted title'; title.dispatchEvent(new Event('input')); title.dispatchEvent(new Event('blur'));
            [...document.querySelectorAll('button')].find(node => node.textContent === 'Reload Lorecards').click();
        });
        await source.wait(2);
        await source.release('Newer explicit reload', 1);
        await h.page.waitForSelector('.saga-lore-workbench-main', { state: 'visible' });
        const immediateWrites = await h.page.evaluate(submit => {
            const input = document.querySelector(submit === 'select' ? '[name="relevance"]' : '[name="notes"]');
            window.latestSubmittedInput = input;
            input.value = submit === 'select' ? 'high' : 'Second submitted notes';
            if (submit === 'select') {
                input.dispatchEvent(new Event('change')); input.dispatchEvent(new Event('change'));
            } else {
                input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur'));
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
                input.dispatchEvent(new Event('blur'));
            }
            return fixture.persistenceCalls.length;
        }, submit);
        assert.equal(immediateWrites, 2, 'The distinct new submission must persist before the superseded old source finishes; duplicate events must not persist it again.');
        await source.wait(2);
        await source.release('Latest saved reload', 1);
        await h.page.waitForSelector('.saga-lore-workbench-main', { state: 'visible' });
        await source.release('Superseded old save reload');
        await h.page.waitForTimeout(40);
        const result = await h.page.evaluate(submit => {
            latestSubmittedInput.dispatchEvent(new Event(submit === 'select' ? 'change' : 'blur'));
            return {
                writes: fixture.persistenceCalls.length,
                sameInput: document.querySelector(submit === 'select' ? '[name="relevance"]' : '[name="notes"]') === latestSubmittedInput,
                value: latestSubmittedInput.value,
                persisted: submit === 'select'
                    ? fixture.persistenceCalls[1].after.entryOverrides['fixture.entry.0001'].relevance
                    : fixture.persistenceCalls[1].after.entryOverrides['fixture.entry.0001'].content.notes,
                save: document.querySelector('[data-loredeck-workbench-save-chip]').textContent,
            };
        }, submit);
        const expected = submit === 'select' ? 'high' : 'Second submitted notes';
        assert.deepEqual(result, { writes: 2, sameInput: true, value: expected, persisted: expected, save: 'Saved' });
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

test('a failed field persistence does not suppress retrying the same submitted values', async () => {
    const h = await setup();
    try {
        const immediate = await h.page.evaluate(() => {
            window.persistenceAttempts = 0;
            panel.configureLoredeckWorkbenchPanel({ persistLoredeckLibraryRecordMutation(pack, mutator, message, options) {
                persistenceAttempts++;
                if (persistenceAttempts === 1) return false;
                const before = structuredClone(fixture.registry.packs[pack.packId]);
                const next = structuredClone(before); mutator(next);
                fixture.packs[fixture.packs.findIndex(item => item.packId === pack.packId)] = next;
                fixture.registry.packs[pack.packId] = next;
                fixture.persistenceCalls.push({ packId: pack.packId, before, after: structuredClone(next), message, options });
                return true;
            } });
            const title = document.querySelector('[name="title"]');
            title.value = 'Retry submitted title'; title.dispatchEvent(new Event('input')); title.dispatchEvent(new Event('blur'));
            const failed = document.querySelector('[data-loredeck-workbench-save-chip]').textContent;
            title.dispatchEvent(new Event('blur')); title.dispatchEvent(new Event('blur'));
            return { failed, attempts: persistenceAttempts, writes: fixture.persistenceCalls.length };
        });
        assert.deepEqual(immediate, { failed: 'Save failed', attempts: 2, writes: 1 });
        await h.page.waitForSelector('.saga-lore-workbench-main', { state: 'visible' });
        const result = await h.page.evaluate(() => {
            document.querySelector('[name="title"]').dispatchEvent(new Event('blur'));
            return { attempts: persistenceAttempts, writes: fixture.persistenceCalls.length, persisted: fixture.persistenceCalls[0].after.entryOverrides['fixture.entry.0001'].title };
        });
        assert.deepEqual(result, { attempts: 2, writes: 1, persisted: 'Retry submitted title' });
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

test('old confirmed save reloads A while B is loading without superseding B source ownership', async () => {
    const h = await setup();
    try {
        const a = await gateSource(h, 'performance-custom-a');
        const b = await gateSource(h, 'performance-custom-b');
        await h.page.locator('.saga-loredeck-workbench-entry-row [role=checkbox]').first().click();
        await clickText(h.page, 'Duplicate Selected');
        await h.page.waitForSelector('.saga-confirm-overlay');
        await h.page.evaluate(() => fixture.openWorkbench('performance-custom-b'));
        await b.wait();
        await h.page.locator('.saga-confirm-actions button').filter({ hasText: /^Confirm$/ }).click();
        await a.wait();
        await a.release('Old A source');
        await h.page.waitForTimeout(40);
        assert.equal(await h.page.locator('.saga-lore-workbench-view > .saga-lore-empty').textContent(), 'Loading Lorecards...');
        await b.release('New B source');
        await h.page.waitForSelector('.saga-loredeck-workbench-editor-form');
        assert.match(await h.page.locator('.saga-lore-workbench-table').textContent(), /New B source/);
        assert.doesNotMatch(await h.page.locator('.saga-lore-workbench-table').textContent(), /Old A source/);
        assert.equal(await h.page.locator('.saga-loredeck-workbench-bulk-summary').textContent(), 'No bulk selection');
        assert.equal(await h.page.locator('[data-loredeck-workbench-save-chip]').textContent(), 'Editable');
        assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), 1);
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

test('same-pack reopen starts a fresh source request and late loads cannot recreate a closed overlay', async () => {
    const h = await setup();
    try {
        const source = await gateSource(h, 'performance-custom-a');
        await clickText(h.page, 'Reload Lorecards');
        await source.wait();
        await h.page.evaluate(() => { panel.closeLoredeckWorkbench(); fixture.openWorkbench(); });
        await source.wait(2);
        await source.release('Stale same-pack source');
        await h.page.waitForTimeout(40);
        assert.equal(await h.page.locator('.saga-lore-workbench-view > .saga-lore-empty').textContent(), 'Loading Lorecards...');
        await source.release('Current same-pack source');
        await h.page.waitForSelector('.saga-loredeck-workbench-editor-form');
        assert.match(await h.page.locator('.saga-lore-workbench-table').textContent(), /Current same-pack source/);
        await clickText(h.page, 'Reload Lorecards');
        await source.wait();
        await h.page.evaluate(() => { panel.closeLoredeckWorkbench(); panel.refreshLoredeckWorkbench(); });
        await source.release('Closed source');
        await h.page.waitForTimeout(40);
        assert.equal(await h.page.locator('#saga-loredeck-workbench').count(), 0);
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

test('real forced reload shows original loading copy, retains hidden editor buffers and hides its active tooltip', async () => {
    const h = await setup();
    try {
        const source = await gateSource(h, 'performance-custom-a');
        const before = await h.page.evaluate(() => {
            const area = document.querySelector('[name="fact"]');
            area.value = Array.from({ length: 80 }, (_, i) => `Buffered line ${i}`).join('\n');
            area.dispatchEvent(new Event('input'));
            area.scrollTop = 120;
            window.retainedArea = area;
            window.retainedTable = document.querySelector('.saga-lore-workbench-table');
            const scroll = area.scrollTop;
            document.querySelector('.saga-loredeck-workbench-entry-row').dispatchEvent(new Event('mouseenter'));
            const shown = document.querySelector('.saga-floating-tooltip')?.style.display === 'block';
            const reload = [...document.querySelectorAll('#saga-loredeck-workbench button')].find(node => node.textContent === 'Reload Lorecards');
            const reloadPresentation = { label: reload.textContent, disabled: reload.disabled, width: reload.getBoundingClientRect().width,
                columns: getComputedStyle(document.querySelector('.saga-lore-workbench-header')).gridTemplateColumns };
            reload.click();
            return { scroll, shown, reloadPresentation };
        });
        assert.equal(before.shown, true);
        await source.wait();
        const loadingReload = await h.page.evaluate(() => {
            const reload = document.querySelector('.saga-loredeck-workbench-header-actions button');
            return { label: reload.textContent, disabled: reload.disabled, width: reload.getBoundingClientRect().width,
                columns: getComputedStyle(document.querySelector('.saga-lore-workbench-header')).gridTemplateColumns };
        });
        assert.deepEqual(loadingReload, before.reloadPresentation, 'Original loading presentation keeps enabled Reload Lorecards and the unchanged header geometry');
        assert.equal(await h.page.locator('.saga-lore-workbench-view > .saga-lore-empty').textContent(), 'Loading Lorecards...');
        assert.equal(await h.page.locator('.saga-lore-workbench-main').isVisible(), false);
        assert.equal(await h.page.locator('.saga-floating-tooltip').isVisible(), false);
        await source.release();
        await h.page.waitForSelector('.saga-lore-workbench-main', { state: 'visible' });
        const retained = await h.page.evaluate(() => ({
            area: document.querySelector('[name="fact"]') === retainedArea,
            table: document.querySelector('.saga-lore-workbench-table') === retainedTable,
            buffer: retainedArea.value.startsWith('Buffered line 0'), scroll: retainedArea.scrollTop,
            writes: fixture.persistenceCalls.length,
        }));
        assert.deepEqual(retained, { area: true, table: true, buffer: true, scroll: before.scroll, writes: 0 });
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

test('selected-category loading and error controls keep the original unavailable-source presentation', async () => {
    const h = await setup();
    try {
        const source = await gateSource(h, 'performance-custom-a');
        await h.page.evaluate(() => {
            window.failPublicationOnce = false;
            panel.configureLoredeckWorkbenchPanel({ getFreshLoredeckLibraryPack(id, fallback) {
                if (failPublicationOnce) { failPublicationOnce = false; throw new Error('Controlled reload failure'); }
                return fixture.registry.packs[id] || fallback;
            } });
            const category = document.querySelectorAll('.saga-lore-workbench-controls .saga-lore-workbench-select')[1];
            category.querySelector('button').click();
            category.querySelector('[role="option"][data-value="character"]').click();
            window.retainedCategory = category;
            [...document.querySelectorAll('button')].find(node => node.textContent === 'Reload Lorecards').click();
        });
        await source.wait();
        const presentation = () => h.page.evaluate(() => {
            const category = document.querySelectorAll('.saga-lore-workbench-controls .saga-lore-workbench-select')[1];
            if (category.getAttribute('aria-expanded') !== 'true') category.querySelector('button').click();
            return {
                node: category === retainedCategory, value: category.value,
                label: category.querySelector('.saga-loredeck-select-button').textContent,
                options: [...category.querySelectorAll('[role="option"]')].map(node => node.dataset.value),
                count: document.querySelector('.saga-lore-workbench-count').textContent,
                headerCount: document.querySelector('.saga-loredeck-workbench-header-chips').children[1].textContent,
                tab: document.querySelector('.saga-lore-workbench-mode-tab').textContent,
                files: document.querySelectorAll('.saga-lore-workbench-mode-tab')[3].textContent,
            };
        });
        const unavailable = { node: true, value: 'all', label: 'All Types', options: ['all'], count: '0 of 0 Lorecards', headerCount: '0 Lorecards', tab: 'Lorecards', files: 'Files' };
        assert.deepEqual(await presentation(), unavailable);
        await h.page.evaluate(() => { window.failPublicationOnce = true; });
        await source.release();
        await h.page.waitForFunction(() => document.querySelector('.saga-lore-workbench-view > .saga-lore-empty')?.textContent === 'Controlled reload failure');
        assert.deepEqual(await presentation(), unavailable);
        await clickText(h.page, 'Reload Lorecards');
        await source.wait(); await source.release();
        await h.page.waitForSelector('.saga-lore-workbench-main', { state: 'visible' });
        const loaded = await presentation();
        assert.equal(loaded.node, true); assert.equal(loaded.value, 'character'); assert.equal(loaded.label, 'Character');
        assert.deepEqual(loaded.options, ['all', 'character', 'location']); assert.equal(loaded.count, '7 of 13 Lorecards');
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

test('authoritative same-entry reload updates pristine fields in place and preserves dirty composing buffers', async () => {
    const h = await setup();
    try {
        await h.page.evaluate(() => {
            window.pristineTitle = document.querySelector('[name="title"]');
            window.pristineFact = document.querySelector('[name="fact"]');
            window.composingNotes = document.querySelector('[name="notes"]');
            composingNotes.value = 'Unsubmitted composing notes';
            composingNotes.dispatchEvent(new CompositionEvent('compositionstart'));
            composingNotes.dispatchEvent(new Event('input'));
            const entry = fixture.registry.packs['performance-custom-a'].entryOverrides['fixture.entry.0001'];
            entry.title = 'Authoritative external title'; entry.content.fact = 'Authoritative external fact'; entry.content.notes = 'External notes';
            [...document.querySelectorAll('button')].find(node => node.textContent === 'Reload Lorecards').click();
        });
        await h.page.waitForFunction(() => document.querySelector('[name="title"]')?.value === 'Authoritative external title');
        const result = await h.page.evaluate(() => ({
            title: document.querySelector('[name="title"]') === pristineTitle,
            fact: document.querySelector('[name="fact"]') === pristineFact && pristineFact.value === 'Authoritative external fact',
            notes: document.querySelector('[name="notes"]') === composingNotes && composingNotes.value === 'Unsubmitted composing notes',
            writes: fixture.persistenceCalls.length,
        }));
        assert.deepEqual(result, { title: true, fact: true, notes: true, writes: 0 });
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

test('ordinary selection and filtering reuse the active pack without hydrating or cloning payloads', async () => {
    const h = await setup();
    try {
        const afterInteractions = await h.page.evaluate(() => {
            window.hydrationClones = 0;
            panel.configureLoredeckWorkbenchPanel({
                getFreshLoredeckLibraryPack(id, fallback) { hydrationClones++; return structuredClone(fixture.registry.packs[id] || fallback); },
            });
            panel.refreshLoredeckWorkbench();
            const initial = hydrationClones;
            const rows = [...document.querySelectorAll('.saga-loredeck-workbench-entry-row')];
            rows[1].click(); rows[2].click();
            const search = document.querySelector('.saga-lore-workbench-search'); search.value = 'fixture'; search.dispatchEvent(new Event('input'));
            return { initial, after: hydrationClones };
        });
        assert.deepEqual(afterInteractions, { initial: 1, after: 1 });
        const afterExplicit = await h.page.evaluate(() => {
            fixture.registry.packs['performance-custom-a'].title = 'Fresh explicit metadata';
            fixture.registry.packs['performance-custom-a'].entryOverrides['fixture.entry.0003'].content.fact = 'Fresh canonical fact';
            panel.refreshLoredeckWorkbench();
            return { calls: hydrationClones, header: document.querySelector('.saga-lore-workbench-title').textContent };
        });
        assert.deepEqual(afterExplicit, { calls: 2, header: 'Fresh explicit metadata' });
        await clickText(h.page, 'Reload Lorecards');
        await h.page.waitForFunction(() => document.querySelector('[name="fact"]')?.value === 'Fresh canonical fact');
        const sourceCalls = await h.page.evaluate(() => hydrationClones);
        assert.ok(sourceCalls > afterExplicit.calls);
        await h.page.evaluate(() => {
            const title = document.querySelector('[name="title"]'); title.value = '  Saved canonical title  ';
            title.dispatchEvent(new Event('input')); title.dispatchEvent(new Event('blur'));
        });
        await h.page.waitForFunction(() => document.querySelector('[name="title"]')?.value === 'Saved canonical title');
        const saved = await h.page.evaluate(() => ({ calls: hydrationClones, writes: fixture.persistenceCalls.length }));
        assert.ok(saved.calls > sourceCalls); assert.equal(saved.writes, 1);
        await h.page.evaluate(() => document.querySelector('.saga-loredeck-workbench-entry-row').click());
        assert.equal(await h.page.evaluate(() => hydrationClones), saved.calls);
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

test('saved normalization updates acknowledged fields while a newer edit during reload remains buffered', async () => {
    const h = await setup();
    try {
        const source = await gateSource(h, 'performance-custom-a');
        await h.page.evaluate(() => {
            window.normalizedTitle = document.querySelector('[name="title"]');
            normalizedTitle.value = '  Saved normalized title  ';
            normalizedTitle.dispatchEvent(new Event('input'));
            normalizedTitle.dispatchEvent(new Event('blur'));
        });
        await source.wait();
        await source.release();
        await h.page.waitForFunction(() => document.querySelector('[name="title"]')?.value === 'Saved normalized title');
        assert.equal(await h.page.evaluate(() => document.querySelector('[name="title"]') === normalizedTitle), true);
        await h.page.evaluate(() => {
            normalizedTitle.value = '  Second submitted title  ';
            normalizedTitle.dispatchEvent(new Event('input'));
            normalizedTitle.dispatchEvent(new Event('blur'));
        });
        await source.wait();
        await h.page.evaluate(() => {
            normalizedTitle.value = 'Newer unsubmitted title';
            normalizedTitle.dispatchEvent(new Event('input'));
        });
        await source.release();
        await h.page.waitForSelector('.saga-lore-workbench-main', { state: 'visible' });
        const result = await h.page.evaluate(() => ({
            node: document.querySelector('[name="title"]') === normalizedTitle,
            buffer: normalizedTitle.value,
            writes: fixture.persistenceCalls.length,
            persisted: fixture.persistenceCalls[1]?.after.entryOverrides['fixture.entry.0001'].title,
        }));
        assert.deepEqual(result, { node: true, buffer: 'Newer unsubmitted title', writes: 2, persisted: 'Second submitted title' });
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

test('per-open resets preserve query/relevance/category and draft buffers survive registry transitions', async () => {
    const h = await setup();
    try {
        const result = await h.page.evaluate(async () => {
            const one = selector => document.querySelector(selector);
            const button = text => [...document.querySelectorAll('button')].find(node => node.textContent === text);
            const choose = (index, value) => {
                const control = document.querySelectorAll('.saga-lore-workbench-controls .saga-lore-workbench-select')[index];
                control.querySelector('button').click();
                control.querySelector(`[data-value="${value}"][role="option"]`).click();
            };
            const search = one('.saga-lore-workbench-search'); search.value = 'fixture'; search.dispatchEvent(new Event('input'));
            choose(0, 'normal'); choose(1, 'character'); choose(2, 'all');
            one('.saga-loredeck-workbench-entry-row [role="checkbox"]').click();
            document.querySelectorAll('.saga-lore-workbench-mode-tab')[1].click();
            const registrySearch = one('.saga-loredeck-workbench-registry-search'); registrySearch.value = 'old registry query'; registrySearch.dispatchEvent(new Event('input'));
            fixture.openWorkbench();
            await new Promise(resolve => setTimeout(resolve, 40));
            const controls = [...document.querySelectorAll('.saga-lore-workbench-controls .saga-lore-workbench-select')];
            const reset = one('.saga-lore-workbench-mode-tab-active').dataset.workbenchTab === 'lorecards'
                && one('.saga-lore-workbench-search').value === 'fixture'
                && controls.map(node => node.value).join(',') === 'normal,character,active'
                && one('.saga-loredeck-workbench-bulk-summary').textContent === 'No bulk selection';
            document.querySelectorAll('.saga-lore-workbench-mode-tab')[1].click();
            const registryReset = one('.saga-loredeck-workbench-registry-search').value === '';
            document.querySelectorAll('.saga-lore-workbench-mode-tab')[0].click();
            await new Promise(resolve => setTimeout(resolve, 40));
            button('New Lorecard').click();
            const title = one('[name="title"]'); title.value = 'Buffered draft'; title.dispatchEvent(new Event('input'));
            const fact = one('[name="fact"]'); fact.value = 'Buffered lore'; fact.dispatchEvent(new Event('input'));
            panel.refreshLoredeckWorkbench();
            const sameOwner = one('[name="title"]') === title && one('[name="fact"]') === fact;
            document.querySelectorAll('.saga-lore-workbench-mode-tab')[1].click();
            document.querySelectorAll('.saga-lore-workbench-mode-tab')[0].click();
            await new Promise(resolve => setTimeout(resolve, 40));
            const draftBuffers = one('[name="title"]').value === 'Buffered draft' && one('[name="fact"]').value === 'Buffered lore';
            return { reset, registryReset, sameOwner, draftBuffers, noWrites: fixture.persistenceCalls.length === 0 };
        });
        assert.deepEqual(result, { reset: true, registryReset: true, sameOwner: true, draftBuffers: true, noWrites: true });
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

for (const destination of ['closed', 'registries', 'experience']) test(`late lazy import respects ${destination} ownership and mounts latest snapshot once on return`, async () => {
    const h = await startHarness();
    let release;
    try {
        const gate = new Promise(resolve => { release = resolve; });
        let requests = 0;
        const sawRequest = h.page.waitForRequest('**/src/ui/generated/workbench/view.js');
        await h.page.route('**/src/ui/generated/workbench/view.js', async route => { requests++; await gate; await route.continue(); });
        await h.page.evaluate(async () => {
            const { installSagaPerformanceFixture } = await import('/tests/browser/performance-fixtures.mjs');
            window.fixture = await installSagaPerformanceFixture({ entryCount: 12 });
            window.panel = await import('/src/loredecks/loredeck-workbench-panel.js');
            fixture.openWorkbench();
        });
        await sawRequest;
        await h.page.evaluate(async destination => {
            fixture.registry.packs['performance-custom-a'].entryOverrides['fixture.entry.0001'].title = 'Latest during import';
            [...document.querySelectorAll('button')].find(node => node.textContent === 'Reload Lorecards').click();
            panel.refreshLoredeckWorkbench(); panel.refreshLoredeckWorkbench();
            if (destination === 'experience') {
                // Exercise the real runtime experience control and its public
                // fullscreen cleanup route while the boundary import is gated.
                document.querySelector('.saga-runtime-rail-tab[data-tab-id="settings"]').click();
                document.querySelector('.saga-experience-switch-label-basic').click();
                const runtime = await import('/src/runtime/lore-panel.js'); runtime.hideLorePanel();
            }
            else if (destination === 'closed') { panel.closeLoredeckWorkbench(); panel.refreshLoredeckWorkbench(); }
            else document.querySelectorAll('.saga-lore-workbench-mode-tab')[1].click();
        }, destination);
        release();
        await h.page.waitForTimeout(60);
        assert.equal(await h.page.locator('.saga-loredeck-workbench-editor-form').count(), 0);
        if (destination !== 'registries') {
            assert.equal(await h.page.locator('#saga-loredeck-workbench').count(), 0);
            await h.page.evaluate(() => fixture.openWorkbench());
        } else {
            assert.equal(await h.page.locator('.saga-loredeck-workbench-registry-search').count(), 1);
            await h.page.evaluate(() => document.querySelectorAll('.saga-lore-workbench-mode-tab')[0].click());
        }
        await h.page.waitForSelector('.saga-loredeck-workbench-editor-form');
        assert.equal(await h.page.locator('.saga-lore-workbench-controls').count(), 1);
        assert.equal(await h.page.locator('.saga-lore-workbench-table').count(), 1);
        assert.equal(await h.page.locator('.saga-loredeck-workbench-entry-row').count(), 12);
        assert.match(await h.page.locator('.saga-lore-workbench-table').textContent(), /Latest during import/);
        assert.equal(requests, 1);
        assert.deepEqual(h.errors, []);
    } finally { release?.(); await h.stop(); }
});

test('failed lazy import reports once, keeps Close usable and never replays a business action', async () => {
    const h = await startHarness();
    try {
        const reports = [];
        h.page.on('console', message => { if (message.text().includes('[Saga] Loredeck Workbench view failed:')) reports.push(message.text()); });
        await h.page.route('**/src/ui/generated/workbench/view.js', route => route.fulfill({ contentType: 'application/javascript', body: "throw new Error('Controlled import failure');" }));
        await h.page.evaluate(async () => {
            const { installSagaPerformanceFixture } = await import('/tests/browser/performance-fixtures.mjs');
            window.fixture = await installSagaPerformanceFixture({ entryCount: 12 });
            fixture.openWorkbench();
        });
        for (let attempt = 0; attempt < 100 && !reports.length; attempt++) await h.page.waitForTimeout(10);
        assert.equal(reports.length, 1);
        await h.page.locator('.saga-lore-workbench-close').click();
        assert.equal(await h.page.locator('#saga-loredeck-workbench').count(), 0);
        assert.equal(await h.page.evaluate(() => fixture.persistenceCalls.length), 0);
        assert.deepEqual(h.errors, []);
    } finally { await h.stop(); }
});

registerWorkbenchEditingParity({ setup, gateSource, clickText });
