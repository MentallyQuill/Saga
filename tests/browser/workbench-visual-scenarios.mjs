// Shared, deterministic operations run unchanged against original and candidate.
export const workbenchVisualStates = ['custom', 'generated', 'bundled', 'empty', 'filtered-empty', 'loading', 'error', 'selection', 'bulk', 'draft', 'editor', 'registries'];
export const creatorVisualStates = ['creator-closed', 'creator-scope-brief', 'creator-story-outline', 'creator-title-sets', 'creator-context-plan', 'creator-review-queue', 'creator-lorecards', 'creator-deck-health', 'creator-coverage-plan'];
export const task1VisualStates = ['workbench-100', 'workbench-500', 'workbench-600', 'library-77', 'library-1000', 'runtime-icons'];
export const unavailableVisualMessages = { loading: 'Loading Lorecards...', error: 'Controlled reload failure' };

export async function prepareVisualScenario({ state, theme }) {
    const { installSagaPerformanceFixture } = await import('/__performance/performance-fixtures.mjs');
    const { getSettings, saveSettings, upsertThemeIconSetLibraryPack, getLoredeckLibraryRegistry, upsertLoredeckLibraryPack } = await import('/src/state/state-manager.js');
    const { applyRuntimeTheme, writeThemeColorsToSettings, getActiveThemeColors } = await import('/src/theme/runtime-theme.js');
    const settings = getSettings();
    if (theme === 'custom') {
        settings.themeCustomEnabled = true;
        writeThemeColorsToSettings(settings, { ...getActiveThemeColors(settings), background: '#111c30', surface: '#19354d', border: '#56bcb1', accent: '#ef83ad', text: '#e3eef8' });
        const iconSeed = upsertThemeIconSetLibraryPack({ id: 'parity-custom-icons', type: 'custom', title: 'Parity Custom Icons',
            icons: { 'tab.loredecks': 'assets/iconsets/saga-mystic/mystic-tab-loredecks-256.png', 'tab.settings': 'assets/iconsets/saga-relay/relay-tab-settings-256.png' } });
        if (iconSeed?.ok !== true) throw new Error(`Public custom icon seed failed: ${JSON.stringify(iconSeed)}`);
        // Public store writes replace the settings object. Publish both the
        // colors and selected imported icon set through that same public owner.
        saveSettings({ ...getSettings(), ...settings, themeIconSetLibrary: iconSeed.library, themeIconSetId: 'parity-custom-icons' });
    }
    applyRuntimeTheme(document.documentElement, getSettings());
    const library = state.startsWith('library-');
    const fixture = await installSagaPerformanceFixture({ entryCount: state.startsWith('workbench-') ? Number(state.split('-')[1]) : state === 'empty' ? 0 : library ? 100 : 12,
        library, deckCount: library ? Number(state.split('-')[1]) : 77,
        type: ['bundled', 'generated'].includes(state) ? state : 'custom' });
    if (state !== 'runtime-icons') document.querySelector('#saga-lore-panel, .saga-lore-panel')?.remove();
    window.visualFixture = fixture;
    const wait = async predicate => { for (let i = 0; i < 300; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 10)); } throw new Error(`Visual preparation timed out: ${state}`); };
    if (state === 'runtime-icons') {
        const runtime = await import('/src/runtime/lore-panel.js'); runtime.showLorePanel();
        const root = document.querySelector('#saga-lore-panel');
        const iconSources = Array.from(root.querySelectorAll('img')).map(image => image.src);
        const mobile = root.querySelector('.saga-mobile-bottom-bar');
        if (mobile && !mobile.querySelector('[data-mobile-route="loredecks"][aria-current="page"] .saga-mobile-bottom-exit-icon')) {
            throw new Error('The active mobile Loredecks route must show the Exit icon');
        }
        const requiredCustomIcons = theme === 'custom' ? ['relay-tab-settings-256.png'] : [];
        if (theme === 'custom' && !mobile) requiredCustomIcons.push('mystic-tab-loredecks-256.png');
        for (const file of requiredCustomIcons) {
            if (!iconSources.some(src => src.endsWith(`/${file}`))) throw new Error(`Public custom icon did not reach runtime navigation: ${file}`);
        }
        return { root: '#saga-lore-panel', state, theme, iconSources, requiredCustomIcons };
    }
    if (library) {
        fixture.openLibrary(); await wait(() => document.querySelector('.saga-loredeck-library-deck-card, .saga-loredeck-library-inline-folder-row'));
        for (let i = 0; i < 100; i++) {
            const disclosure = document.querySelector('.saga-loredeck-library-folder-disclosure[aria-label^="Expand"]');
            if (!disclosure) break; disclosure.click(); await new Promise(resolve => requestAnimationFrame(resolve));
        }
        await wait(() => document.querySelectorAll('.saga-loredeck-library-deck-card').length === Number(state.split('-')[1]));
        return { root: '.saga-loredeck-library-overlay', state, theme };
    }
    if (state.startsWith('creator-')) {
        const registry = getLoredeckLibraryRegistry();
        const pack = registry.packs['smoke-generated-creator-project'];
        const pending = registry.packs['smoke-arlong-park'].pendingChanges[0];
        const seeded = upsertLoredeckLibraryPack({ ...pack, revision: (pack.revision || 0) + 1,
            pendingChanges: [{ ...structuredClone(pending), changeId: 'parity-review-change', title: 'Paired pending Lorecard review', createdAt: Date.UTC(2026, 10, 6, 12) }] });
        if (seeded?.ok !== true) throw new Error(`Public review queue seed failed: ${JSON.stringify(seeded)}`);
        const creator = await import('/src/loredecks/loredeck-creator-panel.js');
        await fixture.openCreator();
        await wait(() => document.querySelector('.saga-loredeck-creator-workbench-body'));
        // Each paired state begins from truly closed owners. The candidate must
        // materialize the real requested artifact before tour lookup/geometry.
        for (const details of document.querySelectorAll('details.saga-loredeck-creator-artifact')) { details.open = false; details.dispatchEvent(new Event('toggle')); }
        creator.refreshLoredeckCreatorWorkbenchBody({ preserveScroll: true });
        // Public refresh restores its saved scroll in a queued frame. A later
        // user anchor action starts only after that restoration has finished.
        await new Promise(resolve => requestAnimationFrame(resolve));
        const lazy = typeof creator.materializeLoredeckCreatorDisclosure === 'function';
        const closedOwners = Array.from(document.querySelectorAll('details.saga-loredeck-creator-artifact')).map(details => ({
            anchor: details.dataset.sagaCreatorAnchor, open: details.open, children: details.children.length,
        }));
        const lazyAnchors = creatorVisualStates.slice(1).map(stage => stage.slice('creator-'.length));
        const actualAnchors = closedOwners.map(owner => owner.anchor).sort();
        const expectedAnchors = [...lazyAnchors, 'advanced-generation'].sort();
        if (JSON.stringify(actualAnchors) !== JSON.stringify(expectedAnchors) || closedOwners.some(owner => {
            const shouldBeUnmounted = lazy && lazyAnchors.includes(owner.anchor);
            return owner.open || (shouldBeUnmounted ? owner.children !== 1 : owner.children < 2);
        })) {
            throw new Error(`Creator owners must start genuinely closed${lazy ? ' and unmounted' : ''}: ${JSON.stringify(closedOwners)}`);
        }
        const anchor = state.slice('creator-'.length);
        if (anchor !== 'closed') {
            const tour = ({ 'scope-brief': 'brief', 'story-outline': 'outline', 'title-sets': 'titlePass', 'context-plan': 'planning',
                'review-queue': 'review', lorecards: 'entries', 'deck-health': 'readiness' })[anchor];
            if (lazy && tour) {
                if (!creator.prepareLoredeckCreatorTourTarget(`loredecks.creator.${tour}`)
                    || !document.querySelector(`[data-saga-tour="loredecks.creator.${tour}"]`)) throw new Error(`Real closed Creator tour target missing: ${tour}`);
            }
            const body = document.querySelector('.saga-loredeck-creator-workbench-body');
            let scrolled = false;
            body.addEventListener('scrollend', () => { scrolled = true; }, { once: true });
            if (!creator.scrollLoredeckCreatorWorkbenchToAnchor(anchor)) throw new Error(`Missing creator anchor ${anchor}`);
            const owner = document.querySelector(`details[data-saga-creator-anchor="${anchor}"]`);
            if (!owner?.open || owner.children.length < 2) throw new Error(`Creator target not materialized: ${anchor}`);
            await wait(() => scrolled);
        }
        return { root: '.saga-loredeck-creator-workbench-overlay', state, theme, lazy, closedOwners, creatorAnchor: anchor === 'closed' ? null : anchor };
    }
    fixture.openWorkbench();
    await wait(() => document.querySelector('.saga-lore-workbench-controls'));
    const one = selector => document.querySelector(selector);
    const button = text => Array.from(document.querySelectorAll('#saga-loredeck-workbench button')).find(node => node.textContent === text);
    await wait(() => one('.saga-lore-workbench-main'));
    if (state === 'filtered-empty') { const search = one('.saga-lore-workbench-search'); search.value = 'No fixture matches'; search.dispatchEvent(new Event('input')); }
    if (['selection', 'bulk'].includes(state)) {
        one('.saga-loredeck-workbench-entry-row [role="checkbox"]').click();
        if (state === 'bulk') { const input = one('input[placeholder="Category"]'); input.value = 'person'; input.dispatchEvent(new Event('input')); button('Set Category').click(); }
    }
    if (state === 'draft') { button('New Lorecard').click(); const title = one('[name="title"]'); title.value = 'Unsaved draft title'; title.dispatchEvent(new Event('input')); }
    if (state === 'editor') {
        for (const [name, value] of [['title', 'Unsaved title'], ['fact', 'Composing lore\nSecond line'], ['injection', 'Unsaved injection'], ['notes', 'Unsaved notes']]) {
            const input = one(`[name="${name}"]`); input.value = value; input.dispatchEvent(new Event('input'));
        }
    }
    if (state === 'registries') document.querySelectorAll('.saga-lore-workbench-mode-tab')[1].click();
    if (state in unavailableVisualMessages) {
        if (state === 'error') {
            const panel = await import('/src/loredecks/loredeck-workbench-panel.js');
            panel.configureLoredeckWorkbenchPanel({ getFreshLoredeckLibraryPack(id, fallback) {
                if (window.failVisualPublication) {
                    window.failVisualPublication = false;
                    throw new Error(unavailableVisualMessages.error);
                }
                return fixture.registry.packs[id] || fallback;
            } });
        }
        const pack = fixture.registry.packs['performance-custom-a'];
        pack.manifest = `${location.origin}/__visual-gate/loredeck.json`; pack.manifestData.files = ['entries.json'];
        button('Reload Lorecards').click();
        await wait(() => one('.saga-lore-workbench-view > .saga-lore-empty')?.textContent === unavailableVisualMessages[state]);
    }
    return { root: '#saga-loredeck-workbench', state, theme };
}

export function inspectVisibleCreatorContent(anchor) {
    const body = document.querySelector('.saga-loredeck-creator-workbench-body');
    const owner = body.querySelector(`details[data-saga-creator-anchor="${anchor}"]`);
    const content = owner.children[1];
    const bounds = content.getBoundingClientRect();
    const clip = body.getBoundingClientRect();
    const width = Math.min(bounds.right, clip.right, innerWidth) - Math.max(bounds.left, clip.left, 0);
    const height = Math.min(bounds.bottom, clip.bottom, innerHeight) - Math.max(bounds.top, clip.top, 0);
    return { anchor, visible: owner.open && body.scrollTop > 0 && width > 0 && height > 0,
        scrollTop: body.scrollTop, contentRect: bounds.toJSON(), bodyRect: clip.toJSON() };
}

export async function stabilizeVisual() {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).filter(image => {
        const rect = image.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0;
    }).map(image => image.decode?.().catch(() => {}) || Promise.resolve()));
    let previous = '', equal = 0;
    for (let i = 0; i < 60 && equal < 4; i++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const next = JSON.stringify(Array.from(document.querySelectorAll('.saga-lore-workbench-shell, .saga-lore-workbench-main, .saga-lore-workbench-table, .saga-lore-workbench-detail, details')).map(node => [node.getBoundingClientRect().toJSON(), node.scrollTop]));
        equal = next === previous ? equal + 1 : 0; previous = next;
    }
    if (equal < 4) throw new Error('Visual layout did not stabilize');
    // Original controllers queue initial overlay focus. Apply the same neutral
    // focus action after those frames have settled on both source revisions.
    document.activeElement?.blur();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export function captureVisualGeometry(rootSelector) {
    const root = document.querySelector(rootSelector);
    const properties = ['display', 'position', 'overflowX', 'overflowY', 'gridTemplateColumns', 'gap', 'padding', 'margin',
        'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'border', 'borderRadius', 'objectFit', 'objectPosition', 'opacity'];
    return [root, ...root.querySelectorAll('*')].filter(node => {
        const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
        const closed = node.closest('details:not([open])');
        if (closed && closed !== node && !closed.querySelector('summary')?.contains(node)) return false;
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }).map(node => {
        const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
        let image;
        if (node.tagName === 'IMG') {
            const clip = { left: Math.max(0, rect.left), top: Math.max(0, rect.top), right: Math.min(innerWidth, rect.right), bottom: Math.min(innerHeight, rect.bottom) };
            for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                const bounds = parent.getBoundingClientRect(), css = getComputedStyle(parent);
                if (css.overflowX !== 'visible') { clip.left = Math.max(clip.left, bounds.left); clip.right = Math.min(clip.right, bounds.right); }
                if (css.overflowY !== 'visible') { clip.top = Math.max(clip.top, bounds.top); clip.bottom = Math.min(clip.bottom, bounds.bottom); }
            }
            image = { src: node.src, currentSrc: node.currentSrc, complete: node.complete, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight,
                clip, alt: node.alt, inlineAspectRatio: node.style.aspectRatio, inlineMinWidth: node.style.minWidth };
        }
        return { tag: node.tagName, classes: Array.from(node.classList).sort(), name: node.name || '',
            text: node.children.length ? '' : node.textContent.replace(/\s+/g, ' ').trim(), value: node.value,
            disabled: node.disabled, checked: node.getAttribute('aria-checked'), open: node.open,
            rect: [rect.x, rect.y, rect.width, rect.height], scroll: [node.scrollTop, node.scrollLeft, node.scrollWidth, node.scrollHeight],
            styles: Object.fromEntries(properties.map(key => [key, style[key]])), image };
    });
}

export async function inspectDeferredLibraryImages() {
    const pane = Array.from(document.querySelectorAll('.saga-loredeck-library-hierarchy-list, .saga-loredeck-library-mobile-body'))
        .find(node => node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY));
    if (!pane || pane.scrollHeight <= pane.clientHeight) return { available: false };
    const before = { top: pane.scrollTop, width: pane.scrollWidth, height: pane.scrollHeight, clientWidth: pane.clientWidth, clientHeight: pane.clientHeight,
        overflow: [getComputedStyle(pane).overflowX, getComputedStyle(pane).overflowY], rect: pane.getBoundingClientRect().toJSON() };
    pane.scrollTop = Math.min(pane.scrollHeight - pane.clientHeight, pane.clientHeight * 3);
    await stabilizeVisual();
    const bounds = pane.getBoundingClientRect();
    const images = Array.from(pane.querySelectorAll('img')).filter(image => {
        const rect = image.getBoundingClientRect(); return rect.bottom > bounds.top && rect.top < bounds.bottom;
    }).map(image => ({ src: image.src, currentSrc: image.currentSrc, complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
        rect: image.getBoundingClientRect().toJSON() }));
    const after = { top: pane.scrollTop, width: pane.scrollWidth, height: pane.scrollHeight, clientWidth: pane.clientWidth, clientHeight: pane.clientHeight,
        overflow: [getComputedStyle(pane).overflowX, getComputedStyle(pane).overflowY], rect: pane.getBoundingClientRect().toJSON() };
    pane.scrollTop = before.top;
    return { available: true, before, after, images };
}
