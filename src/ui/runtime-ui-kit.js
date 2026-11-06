/**
 * runtime-ui-kit.js -- Saga
 * Shared runtime DOM helpers for the Saga shelf and fullscreen workbenches.
 *
 * This module is intentionally UI-only. Feature panels should use these
 * primitives without importing feature-specific runtime state here.
 */

const LORE_SCOPE_DISPLAY_ORDER = [
    { key: 'characters', label: 'Characters', weight: 80 },
    { key: 'locations', label: 'Locations', weight: 64 },
    { key: 'factions', label: 'Factions', weight: 56 },
    { key: 'objects', label: 'Objects', weight: 48 },
    { key: 'spells', label: 'Spells', weight: 48 },
    { key: 'topics', label: 'Topics', weight: 32 },
    { key: 'eras', label: 'Eras', weight: 24 },
    { key: 'schoolYears', label: 'School years', weight: 24 },
    { key: 'books', label: 'Books', weight: 16 },
];

let floatingTooltip = null;
let tooltipAnchor = null;
let tooltipFrame = null;
const managedTooltips = new WeakMap();

export function isPlainObjectValue(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

export function uniqueDisplayStrings(value) {
    const rawValues = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',') : []);
    const seen = new Set();
    const out = [];
    for (const raw of rawValues) {
        if (raw && typeof raw === 'object') continue;
        const text = String(raw ?? '').trim();
        if (!text) continue;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(text);
    }
    return out.sort(compareScopeDisplayValues);
}

function compareScopeDisplayValues(a, b) {
    const yearA = String(a).match(/\bYear\s+(\d+)\b/i);
    const yearB = String(b).match(/\bYear\s+(\d+)\b/i);
    if (yearA && yearB) return Number(yearA[1]) - Number(yearB[1]);
    const numA = String(a).match(/\b(19\d{2}|20\d{2})\b/);
    const numB = String(b).match(/\b(19\d{2}|20\d{2})\b/);
    if (numA && numB && numA[1] !== numB[1]) return Number(numA[1]) - Number(numB[1]);
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function getDisplayableScopeEntries(scope = {}) {
    if (!isPlainObjectValue(scope)) return [];
    const known = new Set(LORE_SCOPE_DISPLAY_ORDER.map(item => item.key));
    const ordered = LORE_SCOPE_DISPLAY_ORDER
        .map(item => ({ ...item, values: uniqueDisplayStrings(scope[item.key]) }))
        .filter(item => item.values.length > 0);

    const extras = Object.entries(scope)
        .filter(([key]) => !known.has(key))
        .map(([key, value]) => ({ key, label: humanizeScopeKey(key), weight: 1, values: uniqueDisplayStrings(value) }))
        .filter(item => item.values.length > 0)
        .sort((a, b) => a.label.localeCompare(b.label));

    return [...ordered, ...extras];
}

export function humanizeScopeKey(key) {
    return String(key || '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, c => c.toUpperCase());
}

export function hasDisplayableScope(scope) {
    return getDisplayableScopeEntries(scope).length > 0;
}

export function formatLoreScope(scope = {}) {
    const entries = getDisplayableScopeEntries(scope);
    if (!entries.length) return 'Global / broad context';
    return entries
        .map(item => `${item.label}: ${item.values.join(', ')}`)
        .join(' | ');
}

export function getLoreScopeSpecificity(entry = {}) {
    return getDisplayableScopeEntries(entry.scope || {}).reduce((total, item) => {
        const first = Math.max(0, Number(item.weight) || 1);
        const additional = Math.max(0, item.values.length - 1) * Math.max(1, Math.round(first / 8));
        return total + first + additional;
    }, 0);
}

export function formatStructuredValue(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return uniqueDisplayStrings(value).join(', ');
    if (!isPlainObjectValue(value)) return String(value);

    const parts = Object.entries(value)
        .map(([key, val]) => {
            if (Array.isArray(val) || typeof val === 'string') {
                const values = uniqueDisplayStrings(val);
                return values.length ? `${humanizeScopeKey(key)}: ${values.join(', ')}` : '';
            }
            if (isPlainObjectValue(val)) {
                const nested = Object.entries(val)
                    .map(([nestedKey, nestedValue]) => `${humanizeScopeKey(nestedKey)}=${formatStructuredValue(nestedValue)}`)
                    .filter(Boolean)
                    .join(', ');
                return nested ? `${humanizeScopeKey(key)}: ${nested}` : '';
            }
            const text = String(val ?? '').trim();
            return text ? `${humanizeScopeKey(key)}: ${text}` : '';
        })
        .filter(Boolean);

    return parts.join(' | ');
}

function formatKeyValueDisplay(label, value) {
    if (String(label || '').toLowerCase() === 'scope') return formatLoreScope(value);
    return formatStructuredValue(value);
}

export function createKeyValue(label, value, tooltip) {
    const row = document.createElement('div');
    row.className = 'saga-key-value';
    addTooltip(row, tooltip || label);

    const k = document.createElement('span');
    k.className = 'saga-key';
    k.textContent = label;
    row.appendChild(k);

    const v = document.createElement('span');
    v.className = 'saga-value';
    v.textContent = formatKeyValueDisplay(label, value);
    row.appendChild(v);

    return row;
}

export function createCompactPresetStat(label, value) {
    const row = document.createElement('div');
    row.className = 'saga-preset-status-stat';
    const key = document.createElement('span');
    key.textContent = label;
    const val = createStatusPill(formatKeyValueDisplay(label, value), `${label}: ${formatKeyValueDisplay(label, value)}`, {
        tone: String(value || '').toLowerCase().includes('not found') || String(value || '').toLowerCase().includes('unknown') ? 'muted' : 'source',
        kind: 'source',
        density: 'compact',
        className: 'saga-preset-status-stat-value',
        maxChars: 28,
    });
    row.appendChild(key);
    row.appendChild(val);
    return row;
}

export function createSectionHeader(title, description) {
    const wrap = document.createElement('div');
    wrap.className = 'saga-section-header';
    const h = document.createElement('h3');
    h.textContent = title;
    addTooltip(h, description);
    wrap.appendChild(h);
    const p = document.createElement('p');
    p.textContent = description;
    wrap.appendChild(p);
    return wrap;
}

export function createToggleCard(label, checked, tooltip, onChange, options = {}) {
    const variant = String(options.variant || '').trim();
    const isSwitch = variant === 'switch';
    const initialChecked = !!checked;
    const labelStates = options.labelStates || {};
    const getVisibleLabel = value => value ? (labelStates.checked || label) : (labelStates.unchecked || label);
    const showState = options.showState !== false;
    const card = document.createElement('label');
    card.className = `saga-toggle-card${isSwitch ? ' saga-toggle-card-switch' : ''}${options.className ? ` ${options.className}` : ''}`.trim();
    card.classList.add(initialChecked ? 'saga-toggle-card-checked' : 'saga-toggle-card-unchecked');
    if (!showState) card.classList.add('saga-toggle-card-no-state');
    addTooltip(card, tooltip);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = initialChecked;
    if (isSwitch) {
        input.className = 'saga-toggle-switch-input';
        input.setAttribute('role', 'switch');
        input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
        input.setAttribute('aria-label', getVisibleLabel(input.checked));
    }
    card.appendChild(input);

    if (isSwitch) {
        const switchVisual = document.createElement('span');
        switchVisual.className = 'saga-toggle-switch-slider';
        switchVisual.setAttribute('aria-hidden', 'true');
        card.appendChild(switchVisual);
    }

    const text = document.createElement('span');
    text.className = 'saga-toggle-label';
    text.textContent = getVisibleLabel(input.checked);
    card.appendChild(text);

    const stateLabels = options.stateLabels || {};
    const checkedLabel = stateLabels.checked || 'On';
    const uncheckedLabel = stateLabels.unchecked || 'Off';
    const state = showState ? document.createElement('span') : null;
    if (state) {
        state.className = 'saga-toggle-state';
        state.textContent = input.checked ? checkedLabel : uncheckedLabel;
        card.appendChild(state);
    }

    input.addEventListener('change', () => {
        if (isSwitch) input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
        if (isSwitch) input.setAttribute('aria-label', getVisibleLabel(input.checked));
        card.classList.toggle('saga-toggle-card-checked', input.checked);
        card.classList.toggle('saga-toggle-card-unchecked', !input.checked);
        text.textContent = getVisibleLabel(input.checked);
        if (state) state.textContent = input.checked ? checkedLabel : uncheckedLabel;
        onChange(input.checked);
    });

    return card;
}

export function createButton(label, tooltip, handler, className = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `saga-runtime-button ${className}`.trim();
    btn.textContent = label;
    addTooltip(btn, tooltip);
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideFloatingTooltip();
        handler?.(btn, e);
    });
    return btn;
}

export function wireOverlayBackdropClose(overlay, closeHandler) {
    if (!overlay || typeof closeHandler !== 'function') return overlay;
    let sawPointerDown = false;
    let startedOnBackdrop = false;
    overlay.addEventListener('pointerdown', event => {
        sawPointerDown = true;
        startedOnBackdrop = event.target === overlay;
    });
    overlay.addEventListener('click', event => {
        if (event.target !== overlay) return;
        if (sawPointerDown && !startedOnBackdrop) {
            sawPointerDown = false;
            startedOnBackdrop = false;
            return;
        }
        sawPointerDown = false;
        startedOnBackdrop = false;
        closeHandler();
    });
    return overlay;
}

export function createIconButton(label, tooltip, className, handler) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.textContent = label;
    addTooltip(btn, tooltip);
    btn.addEventListener('click', event => {
        hideFloatingTooltip();
        handler?.(event);
    });
    return btn;
}

function normalizeChipClassToken(value = '', fallback = 'neutral') {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized || fallback;
}

function normalizeChipDensity(value = '') {
    const density = normalizeChipClassToken(value, 'compact');
    return ['compact', 'standard', 'touch'].includes(density) ? density : 'compact';
}

function normalizeChipKind(value = '') {
    const kind = normalizeChipClassToken(value, 'metadata');
    return ['metadata', 'status', 'severity', 'count', 'source', 'tag', 'action'].includes(kind)
        ? kind
        : 'metadata';
}

const CHIP_TONES = Object.freeze([
    'neutral',
    'source',
    'category',
    'relevance',
    'relevance-high',
    'relevance-normal',
    'relevance-low',
    'info',
    'review',
    'success',
    'warning',
    'danger',
    'muted',
    'selected',
    'tag',
]);

function normalizeChipTone(value = '') {
    const tone = normalizeChipClassToken(value, 'neutral');
    const aliases = {
        active: 'success',
        approved: 'success',
        complete: 'success',
        completed: 'success',
        current: 'success',
        editable: 'success',
        ok: 'success',
        ready: 'success',
        resolved: 'success',
        running: 'info',
        generated: 'source',
        cached: 'info',
        local: 'info',
        selected: 'selected',
        draft: 'review',
        drafted: 'review',
        pending: 'review',
        'needs-approval': 'review',
        'needs-review': 'review',
        review: 'review',
        blocked: 'danger',
        danger: 'danger',
        error: 'danger',
        failed: 'danger',
        failure: 'danger',
        high: 'danger',
        issue: 'warning',
        stale: 'warning',
        medium: 'warning',
        warning: 'warning',
        disabled: 'muted',
        empty: 'muted',
        locked: 'muted',
        missing: 'muted',
        none: 'muted',
        unavailable: 'muted',
        waiting: 'muted',
        'not-applicable': 'muted',
        'not-ready': 'muted',
        low: 'success',
        neutral: 'neutral',
        source: 'source',
        tag: 'tag',
    };
    return aliases[tone] || (CHIP_TONES.includes(tone) ? tone : 'neutral');
}

function inferRelevanceTierFromLabel(label = '') {
    const text = String(label || '').trim().toLowerCase();
    if (text === 'high' || text === 'normal' || text === 'low') return text;
    const prefixed = text.match(/\brelevance\s*:\s*(high|normal|low)\b/);
    if (prefixed) return prefixed[1];
    const suffixed = text.match(/\b(high|normal|low)[-\s]+relevance\b/);
    return suffixed ? suffixed[1] : '';
}

function resolveChipTone(inputTone, label = '') {
    const tone = normalizeChipTone(inputTone || inferChipToneFromLabel(label));
    if (tone !== 'relevance') return tone;
    const relevanceTier = inferRelevanceTierFromLabel(label);
    return relevanceTier ? `relevance-${relevanceTier}` : tone;
}

function inferChipToneFromLabel(label = '') {
    const text = String(label || '').trim().toLowerCase();
    if (!text) return 'neutral';
    if (/\b(error|errors|failed|failure|blocked|blocker|blockers)\b/.test(text)) return 'danger';
    if (/\b(warning|warnings|stale|quality flag|quality flags|issue|issues|risk: high|low confidence|unresolved)\b/.test(text)) return 'warning';
    if (/\b(needs review|needs approval|pending|drafted|draft|review|question|questions)\b/.test(text)) return 'review';
    if (/\b(approved|ready|accepted|active|health clear|current|editable|success)\b/.test(text)) return 'success';
    if (/\b(disabled|locked|waiting|not ready|not scanned|none|no |unavailable|read-only|unfiled|unloaded|missing)\b/.test(text)) return 'muted';
    if (/\b(generated|running|in flight|cached|local|manual|auto allowed|selected|resumable)\b/.test(text)) return 'info';
    if (/\b(bundled|custom|imported|json-only|source|overlay|tags\.json|timeline\.json)\b/.test(text)) return 'source';
    return 'neutral';
}

function inferChipKindFromLabel(label = '') {
    const text = String(label || '').trim().toLowerCase();
    if (!text) return 'status';
    if (/^\d/.test(text) || /\b\d+([/.]\d+)?\b/.test(text) || /%\b/.test(text)) return 'count';
    if (/\b(error|errors|warning|warnings|issue|issues|risk|health impact|quality flag|blocked|failed)\b/.test(text)) return 'severity';
    if (/^(source|op|operation|route|ref|gate):/.test(text) || /\b(bundled|generated|custom|imported|json-only|registry|overlay|tags\.json|timeline\.json)\b/.test(text)) return 'source';
    if (/\b(tag|tags|anchor|anchors|window|windows|timeline|category|type|relevance)\b/.test(text)) return 'metadata';
    return 'status';
}

export function createChip(options = {}) {
    const input = options && typeof options === 'object' && !Array.isArray(options) ? options : { label: options };
    const label = String(input.label ?? input.text ?? '').trim();
    const chip = document.createElement(input.interactive ? 'button' : 'span');
    const kind = normalizeChipKind(input.kind);
    const tone = resolveChipTone(input.tone, label);
    const density = normalizeChipDensity(input.density);
    const classes = [
        'saga-chip',
        `saga-chip-kind-${kind}`,
        `saga-chip-tone-${tone}`,
        `saga-chip-density-${density}`,
        input.className,
    ].filter(Boolean);
    chip.className = classes.join(' ');
    chip.textContent = label;
    if (input.interactive) {
        chip.type = 'button';
        chip.classList.add('saga-chip-interactive');
    }
    chip.dataset.sagaChipKind = kind;
    chip.dataset.sagaChipTone = tone;
    chip.dataset.sagaChipDensity = density;
    if (input.testId) chip.dataset.testid = String(input.testId);
    if (input.maxChars && label.length > Number(input.maxChars)) {
        chip.textContent = `${label.slice(0, Math.max(1, Number(input.maxChars) - 3))}...`;
        chip.title = label;
    }
    addTooltip(chip, input.tooltip || input.title || '');
    return chip;
}

export function setChipTone(chip, tone = 'neutral') {
    if (!chip?.classList) return chip;
    const normalized = normalizeChipTone(tone);
    for (const knownTone of CHIP_TONES) chip.classList.remove(`saga-chip-tone-${knownTone}`);
    chip.classList.add(`saga-chip-tone-${normalized}`);
    chip.dataset.sagaChipTone = normalized;
    return chip;
}

export function createBadge(text, tooltip, options = {}) {
    const badge = createChip({
        label: text,
        tooltip,
        kind: options.kind || 'metadata',
        tone: options.tone || 'category',
        density: options.density || 'compact',
        className: `saga-lore-badge ${options.className || ''}`.trim(),
        maxChars: options.maxChars,
        testId: options.testId,
    });
    return badge;
}

export function createStatusPill(text, tooltip, options = {}) {
    return createChip({
        label: text,
        tooltip,
        kind: options.kind || inferChipKindFromLabel(text),
        tone: options.tone,
        density: options.density || 'compact',
        className: `saga-status-pill ${options.className || ''}`.trim(),
        maxChars: options.maxChars,
        testId: options.testId,
    });
}

export function createEmptyMessage(text) {
    const empty = document.createElement('div');
    empty.className = 'saga-lore-empty';
    empty.textContent = text;
    return empty;
}

function shouldUseFloatingTooltip(el, options = {}) {
    if (options.floating === false) return false;
    if (isMobileRuntimeTooltipSurface(el)) return false;
    return String(el?.tagName || '').toUpperCase() !== 'SELECT';
}

function isMobileRuntimeTooltipSurface(el) {
    if (!el?.closest) return false;
    return !!el.closest('.saga-runtime-mobile, .saga-mobile-touch, .saga-mobile-touch-surface, .saga-loredeck-library-shell-mobile, .saga-context-workbench-shell-mobile, .saga-loredeck-creator-workbench-shell-mobile');
}

export function addTooltip(el, text, options = {}) {
    if (!el || !text) return el;
    createManagedTooltip(el, text, options);
    return el;
}

/** One registration per anchor, with explicit ownership for retained views. */
export function createManagedTooltip(el, text, options = {}) {
    if (managedTooltips.has(el)) {
        const existing = managedTooltips.get(el);
        existing.update(text);
        return existing;
    }
    let disposed = false;
    const listeners = [];
    const listen = (type, handler) => {
        el.addEventListener(type, handler);
        listeners.push([type, handler]);
    };
    const show = () => { if (!disposed) showFloatingTooltip(el); };
    const hide = () => { if (tooltipAnchor === el) hideFloatingTooltip(); };
    const handle = {
        update(next) {
            if (disposed) return;
            const value = String(next || '');
            if (value) {
                el.dataset.sagaTooltip = value;
                el.setAttribute('aria-label', value);
            } else {
                delete el.dataset.sagaTooltip;
                el.removeAttribute('aria-label');
            }
            // Native title tooltips can fight the runtime overlay tooltip.
            el.removeAttribute('title');
            if (tooltipAnchor === el) {
                if (value && floatingTooltip) floatingTooltip.textContent = value;
                else hideFloatingTooltip();
            }
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            hide();
            for (const [type, handler] of listeners) el.removeEventListener(type, handler);
            delete el.dataset.sagaTooltip;
            el.removeAttribute('aria-label');
            managedTooltips.delete(el);
        },
    };
    managedTooltips.set(el, handle);
    handle.update(text);
    if (shouldUseFloatingTooltip(el, options)) {
        if (options.showOnHover !== false) {
            listen('mouseenter', show);
            listen('mouseleave', hide);
        }
        if (options.showOnFocus !== false) {
            listen('focus', show);
            listen('blur', hide);
        }
    }
    return handle;
}

export function disposeRuntimeTooltips(root) {
    if (!root) return;
    managedTooltips.get(root)?.dispose();
    for (const element of root.querySelectorAll('[data-saga-tooltip]')) managedTooltips.get(element)?.dispose();
}

function showFloatingTooltip(anchor) {
    if (!anchor.isConnected || !managedTooltips.has(anchor) || isMobileRuntimeTooltipSurface(anchor)) {
        hideFloatingTooltip();
        return;
    }
    const text = anchor?.dataset?.sagaTooltip;
    if (!text) return;
    tooltipAnchor = anchor;
    if (!floatingTooltip) {
        floatingTooltip = document.createElement('div');
        floatingTooltip.className = 'saga-floating-tooltip';
        document.body.appendChild(floatingTooltip);
    }
    floatingTooltip.textContent = text;
    floatingTooltip.style.display = 'block';
    if (tooltipFrame !== null) cancelAnimationFrame(tooltipFrame);
    tooltipFrame = requestAnimationFrame(() => {
        tooltipFrame = null;
        positionFloatingTooltip(anchor);
    });
}

function positionFloatingTooltip(anchor) {
    if (!floatingTooltip || tooltipAnchor !== anchor) return;
    if (!anchor.isConnected || !managedTooltips.has(anchor)) {
        hideFloatingTooltip();
        return;
    }
    const rect = anchor.getBoundingClientRect();
    const tipRect = floatingTooltip.getBoundingClientRect();
    const margin = 8;

    let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
    left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));

    let top = rect.top - tipRect.height - margin;
    if (top < margin) {
        top = rect.bottom + margin;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - tipRect.height - margin));

    floatingTooltip.style.left = `${left}px`;
    floatingTooltip.style.top = `${top}px`;
}

export function hideFloatingTooltip() {
    if (tooltipFrame !== null) cancelAnimationFrame(tooltipFrame);
    tooltipFrame = null;
    tooltipAnchor = null;
    if (floatingTooltip) floatingTooltip.style.display = 'none';
}

function setRuntimeButtonBusyContent(btn, label) {
    if (!btn) return;
    const cleanLabel = String(label || 'Working...').trim() || 'Working...';
    btn.textContent = '';

    const spinner = document.createElement('span');
    spinner.className = 'saga-runtime-button-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    btn.appendChild(spinner);

    const text = document.createElement('span');
    text.className = 'saga-runtime-button-busy-text';
    text.textContent = cleanLabel;
    btn.appendChild(text);

    btn.setAttribute('aria-label', cleanLabel);
}

export async function runBusyAction(btn, busyText, action) {
    if (!btn || typeof action !== 'function') return;
    const original = btn.textContent;
    const originalDisabled = btn.disabled === true;
    const originalAriaLabel = btn.getAttribute?.('aria-label');
    const originalMinWidth = btn.style?.minWidth || '';
    const rect = typeof btn.getBoundingClientRect === 'function' ? btn.getBoundingClientRect() : null;
    if (btn.style && !btn.style.minWidth && Number(rect?.width) > 0) {
        btn.style.minWidth = `${Math.ceil(Number(rect.width))}px`;
    }
    btn.disabled = true;
    btn.dataset.sagaActionBusy = 'true';
    btn.setAttribute('aria-busy', 'true');
    const setText = nextText => setRuntimeButtonBusyContent(btn, nextText || busyText);
    setText(busyText);
    try {
        await action({ setText });
    } catch (e) {
        console.error('[Saga] Runtime action failed:', e);
        toast(e?.message ? `Action failed: ${e.message}` : 'Action failed.', 'error');
    } finally {
        btn.disabled = originalDisabled;
        btn.textContent = original;
        if (originalAriaLabel) {
            btn.setAttribute('aria-label', originalAriaLabel);
        } else {
            btn.removeAttribute?.('aria-label');
        }
        btn.removeAttribute?.('aria-busy');
        delete btn.dataset.sagaActionBusy;
        if (btn.style) btn.style.minWidth = originalMinWidth;
    }
}

function showSagaConfirmDialog(title, message, options = {}) {
    if (typeof document === 'undefined' || !document.body) return Promise.resolve(false);
    return new Promise(resolve => {
        document.querySelector('.saga-confirm-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'saga-confirm-overlay';

        const shell = document.createElement('div');
        shell.className = 'saga-confirm-shell';
        shell.setAttribute('role', 'dialog');
        shell.setAttribute('aria-modal', 'true');
        shell.setAttribute('aria-labelledby', 'saga-confirm-title');
        shell.setAttribute('aria-describedby', 'saga-confirm-message');

        const heading = document.createElement('div');
        heading.id = 'saga-confirm-title';
        heading.className = 'saga-confirm-title';
        heading.textContent = String(title || 'Confirm Action');
        shell.appendChild(heading);

        const body = document.createElement('div');
        body.id = 'saga-confirm-message';
        body.className = 'saga-confirm-message';
        body.textContent = String(message || 'Continue?');
        shell.appendChild(body);

        const actions = document.createElement('div');
        actions.className = 'saga-primary-actions saga-confirm-actions';
        const cancelLabel = String(options.cancelLabel || 'Cancel').trim() || 'Cancel';
        const confirmLabel = String(options.confirmLabel || 'Confirm').trim() || 'Confirm';
        const cancel = createButton(cancelLabel, options.cancelTooltip || 'Cancel this action.', () => finish(false));
        const confirm = createButton(confirmLabel, options.confirmTooltip || 'Confirm and continue.', () => finish(true), options.confirmClassName || 'saga-danger-button');
        actions.appendChild(cancel);
        actions.appendChild(confirm);
        shell.appendChild(actions);

        function finish(value) {
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve(!!value);
        }

        function onKeyDown(event) {
            if (event.key === 'Escape') finish(false);
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) finish(true);
        }

        wireOverlayBackdropClose(overlay, () => finish(false));
        document.addEventListener('keydown', onKeyDown);
        overlay.appendChild(shell);
        document.body.appendChild(overlay);
        setTimeout(() => cancel.focus?.(), 0);
    });
}

function showSagaInputDialog(title, message, initialValue = '', options = {}) {
    if (typeof document === 'undefined' || !document.body) return Promise.resolve(null);
    return new Promise(resolve => {
        document.querySelector('.saga-confirm-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'saga-confirm-overlay';

        const shell = document.createElement('div');
        shell.className = 'saga-confirm-shell saga-input-shell';
        shell.setAttribute('role', 'dialog');
        shell.setAttribute('aria-modal', 'true');
        shell.setAttribute('aria-labelledby', 'saga-input-title');
        shell.setAttribute('aria-describedby', 'saga-input-message');

        const heading = document.createElement('div');
        heading.id = 'saga-input-title';
        heading.className = 'saga-confirm-title';
        heading.textContent = String(title || 'Enter Value');
        shell.appendChild(heading);

        const body = document.createElement('div');
        body.id = 'saga-input-message';
        body.className = 'saga-confirm-message';
        body.textContent = String(message || '');
        shell.appendChild(body);

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'text_pole saga-confirm-input';
        input.value = String(initialValue || '');
        input.placeholder = String(options.placeholder || '');
        input.maxLength = Number.isFinite(Number(options.maxLength)) ? Number(options.maxLength) : 120;
        shell.appendChild(input);

        const error = document.createElement('div');
        error.className = 'saga-confirm-error';
        error.hidden = true;
        shell.appendChild(error);

        const actions = document.createElement('div');
        actions.className = 'saga-primary-actions saga-confirm-actions';
        const cancel = createButton('Cancel', 'Cancel this action.', () => finish(null));
        const confirm = createButton(options.confirmLabel || 'Save', 'Save this value.', () => {
            const value = String(input.value || '').trim().replace(/\s+/g, ' ');
            if (options.required && !value) {
                error.textContent = options.requiredMessage || 'A value is required.';
                error.hidden = false;
                input.focus?.();
                return;
            }
            finish(value);
        }, 'saga-primary-button');
        actions.appendChild(cancel);
        actions.appendChild(confirm);
        shell.appendChild(actions);

        function finish(value) {
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve(value);
        }

        function onKeyDown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish(null);
            }
        }

        input.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            confirm.click();
        });
        wireOverlayBackdropClose(overlay, () => finish(null));
        document.addEventListener('keydown', onKeyDown);
        overlay.appendChild(shell);
        document.body.appendChild(overlay);
        setTimeout(() => {
            input.focus?.();
            input.select?.();
        }, 0);
    });
}

function showSagaChoiceDialog(title, message, choices = []) {
    if (typeof document === 'undefined' || !document.body) return Promise.resolve(null);
    return new Promise(resolve => {
        document.querySelector('.saga-confirm-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'saga-confirm-overlay';

        const shell = document.createElement('div');
        shell.className = 'saga-confirm-shell saga-choice-shell';
        shell.setAttribute('role', 'dialog');
        shell.setAttribute('aria-modal', 'true');
        shell.setAttribute('aria-labelledby', 'saga-choice-title');
        shell.setAttribute('aria-describedby', 'saga-choice-message');

        const heading = document.createElement('div');
        heading.id = 'saga-choice-title';
        heading.className = 'saga-confirm-title';
        heading.textContent = String(title || 'Choose Action');
        shell.appendChild(heading);

        const body = document.createElement('div');
        body.id = 'saga-choice-message';
        body.className = 'saga-confirm-message';
        body.textContent = String(message || '');
        shell.appendChild(body);

        const choiceWrap = document.createElement('div');
        choiceWrap.className = 'saga-confirm-choice-list';
        for (const choice of choices || []) {
            const value = String(choice?.value || '').trim();
            if (!value) continue;
            const button = createButton(
                choice.label || value,
                choice.tooltip || choice.label || value,
                () => finish(value),
                `saga-confirm-choice-button ${choice.className || ''}`.trim(),
            );
            choiceWrap.appendChild(button);
        }
        shell.appendChild(choiceWrap);

        const actions = document.createElement('div');
        actions.className = 'saga-primary-actions saga-confirm-actions';
        const cancel = createButton('Cancel', 'Cancel this action.', () => finish(null));
        actions.appendChild(cancel);
        shell.appendChild(actions);

        function finish(value) {
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve(value);
        }

        function onKeyDown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish(null);
            }
        }

        wireOverlayBackdropClose(overlay, () => finish(null));
        document.addEventListener('keydown', onKeyDown);
        overlay.appendChild(shell);
        document.body.appendChild(overlay);
        setTimeout(() => cancel.focus?.(), 0);
    });
}

export async function confirmAction(title, message, options = {}) {
    if (typeof document !== 'undefined' && document.body) {
        return await showSagaConfirmDialog(title, message, options);
    }
    const hasPopupConfirm = typeof Popup !== 'undefined' && Popup.show && typeof Popup.show.confirm === 'function';
    if (hasPopupConfirm) return await Popup.show.confirm(title, message);
    return false;
}

export async function chooseAction(title, message, choices = []) {
    if (typeof document !== 'undefined' && document.body) {
        return await showSagaChoiceDialog(title, message, choices);
    }
    return null;
}

export async function promptTextAction(title, message, initialValue = '', options = {}) {
    if (typeof document !== 'undefined' && document.body) {
        return await showSagaInputDialog(title, message, initialValue, options);
    }
    if (typeof prompt === 'function') {
        const value = prompt(`${title}\n\n${message}`, String(initialValue || ''));
        if (value === null) return null;
        return String(value || '').trim().replace(/\s+/g, ' ');
    }
    return null;
}

export async function showNoticePopup(title, message) {
    const hasPopupAlert = typeof Popup !== 'undefined' && Popup.show && typeof Popup.show.alert === 'function';
    if (hasPopupAlert) {
        await Popup.show.alert(title, message);
        return;
    }
    if (typeof alert === 'function') {
        alert(`${title}\n\n${message}`);
        return;
    }
    toast(message, 'info');
}

export function toast(message, type = 'success') {
    if (typeof toastr === 'undefined') return;
    if (type === 'error' && toastr.error) toastr.error(message);
    else if (type === 'warning' && toastr.warning) toastr.warning(message);
    else if (type === 'info' && toastr.info) toastr.info(message);
    else if (toastr.success) toastr.success(message);
}
