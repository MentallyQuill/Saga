import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { startVisualSmokeServer } from './serve-visual-smoke.mjs';

test('generated freshness rejects missing, changed, and stale extra files across all generated surfaces', async () => {
  let compareGeneratedFiles;
  try { ({ compareGeneratedFiles } = await import('./check-saga-ui-generated.mjs')); }
  catch (error) { assert.fail(`Generated freshness comparison is not implemented: ${error.code}`); }
  const temporary = await mkdtemp(path.join(tmpdir(), 'saga-generated-test-'));
  const tracked = path.join(temporary, 'tracked');
  const rebuilt = path.join(temporary, 'rebuilt');
  const files = ['src/ui/generated/workbench/view.js', 'src/ui/generated/workbench/LICENSE.txt',
    'src/loredecks/generated/loredeck-cover-thumbnails.js', 'assets/generated/loredeck-covers/one.webp'];
  const put = async (root, name, value) => { const file = path.join(root, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, value); };
  try {
    for (const root of [tracked, rebuilt]) for (const file of files) await put(root, file, `bytes:${file}\n`);
    assert.equal((await compareGeneratedFiles(tracked, rebuilt)).length, 4);
    await put(tracked, 'src/ui/generated/workbench/stale.js', 'stale');
    await assert.rejects(compareGeneratedFiles(tracked, rebuilt), /stale\.js/);
    await rm(path.join(tracked, 'src/ui/generated/workbench/stale.js'));
    await rm(path.join(tracked, files[3]));
    await assert.rejects(compareGeneratedFiles(tracked, rebuilt), /one\.webp/);
    await put(tracked, files[3], `bytes:${files[3]}\n`);
    await put(tracked, files[2], `bytes:${files[2]}\r\n`);
    await assert.rejects(compareGeneratedFiles(tracked, rebuilt), /loredeck-cover-thumbnails\.js/);
  } finally {
    assert.ok(path.resolve(temporary).startsWith(`${path.resolve(tmpdir())}${path.sep}saga-generated-test-`));
    await rm(temporary, { recursive: true, force: true });
  }
});

test('compiled adapter retains keyed rows and leaf inputs, updates current snapshots, and cleans synchronously', async () => {
  const server = await startVisualSmokeServer({ port: 0 });
  let browser;
  try {
    let executablePath = process.env.SAGA_CHROME_PATH;
    if (!executablePath && process.platform === 'win32') for (const candidate of [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ]) { try { await access(candidate); executablePath = candidate; break; } catch { /* Next browser. */ } }
    browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route(`${server.origin}/`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
    await page.goto(server.origin);
    const result = await page.evaluate(async () => {
      const { mount } = await import('/src/ui/generated/workbench/view.js');
      const { createLoredeckWorkbenchViewModel: project } = await import('/src/loredecks/loredeck-workbench-view-model.js');
      const { createManagedTooltip } = await import('/src/ui/runtime-ui-kit.js');
      const rows = Array.from({ length: 502 }, (_, i) => ({ id: `entry-${i}`, entry: { title: `Title ${i}` }, disabled: i === 2 }));
      rows.unshift({ id: 'draft', draft: true, entry: { title: 'Draft' } });
      let input = {
        packId: 'deck-a', pack: { packId: 'deck-a' }, filteredRows: rows,
        selectedEntryId: 'entry-0', selectedIds: [], editable: true,
        query: '', filters: { category: 'all', relevance: 'all', status: 'active' },
        cacheStatus: 'ready', error: null, saveStatus: 'idle',
        getCells: row => [
          { text: row.entry.title, subText: row.id }, { text: 'character' },
          { text: 'normal' }, { text: row.disabled ? 'disabled' : 'active', subText: 'embedded' },
        ],
      };
      let snapshot = project(input);
      const host = document.createElement('div');
      host.className = 'saga-lore-workbench-view saga-loredeck-workbench-view';
      document.body.append(host);
      const counts = { controls: 0, bulk: 0, header: 0, detail: 0, disposed: 0, disconnectedCleanup: 0 };
      const errors = [];
      let handle;
      const refresh = patch => { input = { ...input, ...patch }; snapshot = project(input, snapshot); handle.update(snapshot); };
      function leaf(name, build) {
        return (node, model) => {
          counts[name]++;
          const update = build(node, model);
          return { update, dispose() { counts.disposed++; if (!node.isConnected) counts.disconnectedCleanup++; node.replaceChildren(); } };
        };
      }
      const actions = {
        onError: error => errors.push(error.message),
        tooltip(node, text) { const tip = createManagedTooltip(node, text); return { update: text => tip.update(text), destroy: () => tip.dispose() }; },
        inspectRow(id) { refresh({ selectedEntryId: id }); },
        toggleRow(id) { refresh({ selectedIds: [id] }); },
        toggleHeader() { refresh({ selectedIds: snapshot.logicalIds }); },
        setQuery(query) { refresh({ query }); }, setFilter(name, value) { refresh({ filters: { ...input.filters, [name]: value } }); },
        mountControls: leaf('controls', (node, model) => {
          const search = document.createElement('input'); search.className = 'saga-lore-workbench-search'; search.value = model.query;
          search.oninput = () => actions.setQuery(search.value);
          const dropdown = document.createElement('button'); dropdown.textContent = 'Category'; dropdown.onclick = () => { dropdown.setAttribute('aria-expanded', 'true'); };
          node.append(search, dropdown);
          return next => { if (search.value !== next.query) search.value = next.query; };
        }),
        mountBulkToolbar: leaf('bulk', (node, model) => { const text = document.createElement('span'); node.append(text); const update = next => { text.textContent = `${next.selectedIds.length} selected`; }; update(model); return update; }),
        mountTableHeader: leaf('header', (node, model) => { const box = document.createElement('button'); box.textContent = 'Select all'; box.onclick = () => actions.toggleHeader(); node.append(box); return next => { box.setAttribute('aria-checked', String(next.headerChecked)); }; }),
        mountDetail: leaf('detail', (node, model) => { const textarea = document.createElement('textarea'); textarea.value = model.selectedRow?.entry.title || ''; const status = document.createElement('span'); node.append(textarea, status); return next => { status.textContent = next.saveStatus; }; }),
      };
      handle = mount(host, snapshot, actions);
      const search = host.querySelector('input');
      const detail = host.querySelector('textarea');
      const rowNodes = [...host.querySelectorAll('.saga-loredeck-workbench-entry-row')];
      const initial = { rowCount: rowNodes.length, childClasses: [...host.children].map(el => el.className), limit: host.querySelector('.saga-lore-workbench-row-note')?.textContent };
      const hierarchy = rowNodes[1].children.length === 5 && rowNodes[1].firstElementChild.tagName === 'SPAN'
        && rowNodes[1].children[1].className === 'saga-lore-workbench-cell'
        && rowNodes[1].children[1].firstElementChild.className === 'saga-lore-workbench-cell-main'
        && rowNodes[1].children[1].lastElementChild.className === 'saga-lore-workbench-cell-sub'
        && rowNodes[0].classList.contains('saga-loredeck-workbench-draft-row')
        && !rowNodes[0].querySelector('[role=checkbox]')
        && rowNodes[3].classList.contains('saga-loredeck-workbench-disabled-row');
      const menu = search.nextElementSibling; menu.click();
      search.focus(); search.value = 'typed'; search.setSelectionRange(2, 2); search.dispatchEvent(new Event('input'));
      const queryRetained = host.querySelector('input') === search && document.activeElement === search && search.selectionStart === 2 && snapshot.query === 'typed';
      refresh({ saveStatus: 'saving' });
      const statusRetained = host.querySelector('textarea') === detail && host.querySelector('textarea + span').textContent === 'saving';
      const menuRetained = search.nextElementSibling === menu && menu.getAttribute('aria-expanded') === 'true';
      const rowsRetained = rowNodes.every((node, index) => host.querySelectorAll('.saga-loredeck-workbench-entry-row')[index] === node);
      rowNodes[2].querySelector('[role=checkbox]').click();
      const checked = rowNodes[2].getAttribute('class').includes('saga-loredeck-workbench-row-selected');
      rowNodes[2].click();
      const selected = rowNodes[2].classList.contains('saga-lore-workbench-row-active');
      const detailRemounted = host.querySelector('textarea') !== detail;
      const mountsBeforeDispose = { ...counts };
      const activeRow = rowNodes[2];
      activeRow.dispatchEvent(new Event('mouseenter'));
      const tooltipShown = document.querySelector('.saga-floating-tooltip')?.style.display === 'block';
      handle.dispose(); handle.dispose();
      const disposed = { ...counts, children: host.children.length, hostConnected: host.isConnected };
      await new Promise(resolve => requestAnimationFrame(resolve));
      const tooltipHidden = document.querySelector('.saga-floating-tooltip')?.style.display === 'none';
      handle.update(snapshot);
      const failureHost = document.createElement('div'); document.body.append(failureHost);
      const bad = mount(failureHost, snapshot, { ...actions, inspectRow() { throw new Error('sync action'); }, toggleRow() { return Promise.reject(new Error('async action')); } });
      failureHost.querySelectorAll('.saga-loredeck-workbench-entry-row')[1].click();
      failureHost.querySelectorAll('[role=checkbox]')[0].click();
      await Promise.resolve(); await Promise.resolve();
      bad.dispose();
      const failedHost = document.createElement('div'); document.body.append(failedHost);
      const failed = mount(failedHost, snapshot, { ...actions, mountDetail() { throw new Error('render leaf'); } });
      failed.dispose();
      await Promise.resolve(); await Promise.resolve();
      const failureCleanup = counts.disconnectedCleanup;
      const tooltipFailureHost = document.createElement('div'); document.body.append(tooltipFailureHost);
      const tooltipFailure = mount(tooltipFailureHost, snapshot, { ...actions, tooltip() { throw new Error('tooltip action'); } });
      tooltipFailure.dispose();
      const tooltipFailureCleanup = counts.disconnectedCleanup;
      const loadingHost = document.createElement('div'); document.body.append(loadingHost);
      const loading = mount(loadingHost, { ...snapshot, cacheStatus: 'loading' }, actions);
      const loadingText = loadingHost.querySelector('.saga-lore-empty')?.textContent;
      loading.update({ ...snapshot, error: 'Could not load' });
      const errorText = loadingHost.querySelector('.saga-lore-empty')?.textContent;
      loading.update({ ...snapshot, logicalRows: [], displayRows: [], selectedRow: null });
      const emptyText = loadingHost.querySelector('.saga-lore-workbench-table .saga-lore-empty')?.textContent;
      loading.dispose();
      const ownerHost = document.createElement('div'); document.body.append(ownerHost);
      const owner = mount(ownerHost, snapshot, actions);
      const ownerDetail = ownerHost.querySelector('textarea');
      const draftSnapshot = { ...snapshot, selectedRow: { ...snapshot.selectedRow, draft: true } };
      owner.update(draftSnapshot);
      const draftReplaced = ownerHost.querySelector('textarea') !== ownerDetail;
      const draftDetail = ownerHost.querySelector('textarea');
      owner.update({ ...draftSnapshot, saveStatus: 'saved' });
      const draftStatusRetained = ownerHost.querySelector('textarea') === draftDetail;
      owner.update({ ...draftSnapshot, editable: false });
      const readonly = !ownerHost.querySelector('.saga-loredeck-workbench-bulk-toolbar')
        && !ownerHost.querySelector('.saga-loredeck-workbench-select-cell')
        && !ownerHost.querySelector('.saga-loredeck-workbench-editor-detail')
        && ownerHost.querySelector('textarea') !== draftDetail;
      const oldControls = ownerHost.querySelector('input');
      const oldDetail = ownerHost.querySelector('textarea');
      owner.update({ ...snapshot, packId: 'deck-b' });
      const deckReplaced = oldControls !== ownerHost.querySelector('input') && oldDetail !== ownerHost.querySelector('textarea');
      owner.update({ ...snapshot, cacheStatus: 'loading' });
      owner.dispose();
      return { initial, hierarchy, queryRetained, statusRetained, menuRetained, rowsRetained, checked, selected, detailRemounted, mountsBeforeDispose, disposed, errors, loadingText, errorText, emptyText, tooltipShown, tooltipHidden, failureCleanup, tooltipFailureCleanup, allCleanupConnected: counts.disconnectedCleanup === 0, draftReplaced, draftStatusRetained, readonly, deckReplaced, failedChildren: failedHost.children.length };
    });
    assert.equal(result.initial.rowCount, 500);
    assert.deepEqual(result.initial.childClasses, [
      'saga-lore-workbench-controls saga-loredeck-workbench-controls',
      'saga-loredeck-workbench-bulk-toolbar', 'saga-lore-workbench-main saga-loredeck-workbench-main',
    ]);
    assert.equal(result.initial.limit, 'Showing 500 of 503. Narrow search or filters to inspect more.');
    for (const name of ['hierarchy', 'queryRetained', 'statusRetained', 'menuRetained', 'rowsRetained', 'checked', 'selected', 'detailRemounted', 'allCleanupConnected', 'draftReplaced', 'draftStatusRetained', 'readonly', 'deckReplaced']) assert.equal(result[name], true, name);
    assert.deepEqual([result.mountsBeforeDispose.controls, result.mountsBeforeDispose.bulk, result.mountsBeforeDispose.header, result.mountsBeforeDispose.detail], [1, 1, 1, 2]);
    assert.equal(result.disposed.disposed, 5);
    assert.equal(result.disposed.disconnectedCleanup, 0, 'leaves dispose while their hosts are connected');
    assert.equal(result.disposed.children, 0, 'unmount without outros is synchronous');
    assert.equal(result.disposed.hostConnected, true);
    assert.equal(result.tooltipShown, true);
    assert.equal(result.tooltipHidden, true, 'row tooltip cleanup must hide the active tooltip before the next frame');
    assert.equal(result.failureCleanup, 0, 'failed factory mount rolls back connected sibling leaves');
    assert.equal(result.tooltipFailureCleanup, 0, 'failed tooltip mount rolls back connected sibling leaves');
    assert.deepEqual(result.errors.sort(), ['async action', 'render leaf', 'sync action', 'tooltip action']);
    assert.equal(result.failedChildren, 0);
    assert.equal(result.loadingText, 'Loading Lorecards...');
    assert.equal(result.errorText, 'Could not load');
    assert.equal(result.emptyText, 'No Lorecards match the current filters.');
    assert.deepEqual(pageErrors, []);
  } finally { await browser?.close(); await server.stop(); }
});
