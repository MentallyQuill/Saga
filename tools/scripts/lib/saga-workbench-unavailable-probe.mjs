import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startSagaPerformanceHarness } from './saga-performance-harness.mjs';
import { sha256 } from './saga-parity-provenance.mjs';

export function readUnavailablePresentation() {
    const category = document.querySelectorAll('.saga-lore-workbench-controls .saga-lore-workbench-select')[1];
    if (category.getAttribute('aria-expanded') !== 'true') category.querySelector('button').click();
    return {
        value: category.value, label: category.querySelector('.saga-loredeck-select-button').textContent,
        options: Array.from(category.querySelectorAll('[role="option"]')).map(node => node.dataset.value),
        count: document.querySelector('.saga-lore-workbench-count').textContent,
        headerCount: document.querySelector('.saga-loredeck-workbench-header-chips').children[1].textContent,
        tab: document.querySelector('.saga-lore-workbench-mode-tab').textContent,
        files: document.querySelectorAll('.saga-lore-workbench-mode-tab')[3].textContent,
    };
}

// Preparation only until an explicit browser window is released. This observes
// the archived original public controller; it contains no assumed UI outcomes.
export async function observeOriginalDraftPresentation({ sourceRoot, output }) {
    assert.ok(sourceRoot && output, 'Declare original source root and observation output');
    const revision = (await readFile(path.join(sourceRoot, '.saga-baseline-revision'), 'utf8')).trim();
    assert.match(revision, /^1a92c708/, 'The probe must use the immutable original, never the candidate');
    const h = await startSagaPerformanceHarness({ sourceRoot });
    const pending = [];
    try {
        await h.page.evaluate(async () => {
            const { installSagaPerformanceFixture } = await import('/__performance/performance-fixtures.mjs');
            window.fixture = await installSagaPerformanceFixture({ entryCount: 12 });
            window.panel = await import('/src/loredecks/loredeck-workbench-panel.js'); fixture.openWorkbench();
        });
        await h.page.locator('.saga-loredeck-workbench-editor-form').waitFor();
        await h.page.route('**/__task8-original-draft/entries.json', route => new Promise(resolve => pending.push({ route, resolve })));
        const waitRequest = async () => {
            for (let i = 0; i < 200 && !pending.length; i++) await new Promise(resolve => setTimeout(resolve, 10));
            assert.equal(pending.length, 1, 'An actual original-controller source request must be pending');
        };
        const release = async () => {
            const { route, resolve } = pending.shift();
            await route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 'source.performance-custom-a', schemaVersion: 3, title: 'Loaded source marker', category: 'character', relevance: 'normal', content: { fact: 'Real loader source.' } }]) });
            resolve();
        };
        await h.page.evaluate(() => {
            window.originalDraftFailPublication = false;
            panel.configureLoredeckWorkbenchPanel({ getFreshLoredeckLibraryPack(id, fallback) {
                if (originalDraftFailPublication) { originalDraftFailPublication = false; throw new Error('Controlled reload failure'); }
                return fixture.registry.packs[id] || fallback;
            } });
            const category = document.querySelectorAll('.saga-lore-workbench-controls .saga-lore-workbench-select')[1];
            category.querySelector('button').click(); category.querySelector('[role="option"][data-value="character"]').click();
            const button = text => Array.from(document.querySelectorAll('#saga-loredeck-workbench button')).find(node => node.textContent === text);
            button('New Lorecard').click();
            const title = document.querySelector('[name="title"]'); title.value = 'Draft during reload'; title.dispatchEvent(new Event('input'));
            const pack = fixture.registry.packs['performance-custom-a'];
            pack.manifest = `${location.origin}/__task8-original-draft/loredeck.json`; pack.manifestData.files = ['entries.json'];
            button('Reload Lorecards').click();
        });
        await waitRequest(); const loading = await h.page.evaluate(readUnavailablePresentation);
        await h.page.evaluate(() => { window.originalDraftFailPublication = true; }); await release();
        await h.page.waitForFunction(() => document.querySelector('.saga-lore-workbench-view > .saga-lore-empty')?.textContent === 'Controlled reload failure');
        const error = await h.page.evaluate(readUnavailablePresentation);
        await h.page.evaluate(() => Array.from(document.querySelectorAll('#saga-loredeck-workbench button')).find(node => node.textContent === 'Reload Lorecards').click());
        await waitRequest(); await release(); await h.page.locator('.saga-lore-workbench-main').waitFor({ state: 'visible' });
        const loaded = await h.page.evaluate(readUnavailablePresentation);
        const writes = await h.page.evaluate(() => fixture.persistenceCalls.length);
        assert.equal(writes, 0); assert.deepEqual(h.errors, []);
        const observation = { status: 'observed', revision, browser: h.browserVersion, executablePath: h.executablePath,
            browserHash: sha256(await readFile(h.executablePath)), sourceHash: sha256(await readFile(path.join(sourceRoot, 'src/loredecks/loredeck-workbench-panel.js'))),
            fixtureHash: sha256(await readFile('tests/browser/performance-fixtures.mjs')),
            probeHash: sha256(await readFile(new URL('./saga-workbench-unavailable-probe.mjs', import.meta.url))), outcomes: { loading, error, loaded }, writes, errors: h.errors };
        await writeFile(output, JSON.stringify(observation, null, 2)); return observation;
    } finally { await h.stop(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const result = await observeOriginalDraftPresentation({ sourceRoot: process.env.SAGA_PARITY_BASELINE_ROOT, output: process.env.SAGA_PARITY_DRAFT_REFERENCE });
    console.log(JSON.stringify(result, null, 2));
}
