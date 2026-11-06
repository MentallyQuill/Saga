/**
 * loredeck-filter-controls.js -- Saga
 * Shared Loredeck search, filter, sort, and count controls.
 *
 * These helpers are UI-only. Callers own state, persistence, and refresh logic.
 */

import { addTooltip } from '../ui/runtime-ui-kit.js';

function normalizeOption(option) {
    if (Array.isArray(option)) {
        const [value, label, tooltip = ''] = option;
        return { value, label, tooltip };
    }
    if (option && typeof option === 'object') return option;
    return { value: option, label: option };
}

function stopControlEvent(event) {
    event.stopPropagation();
}

export function createLoredeckSearchInput(options = {}) {
    const input = document.createElement('input');
    input.type = 'search';
    input.className = options.className || 'text_pole';
    input.placeholder = options.placeholder || 'Search...';
    input.value = String(options.value || '');
    if (options.ariaLabel) input.setAttribute('aria-label', options.ariaLabel);
    addTooltip(input, options.tooltip);

    if (options.stopPropagation !== false) {
        input.addEventListener('click', stopControlEvent);
        input.addEventListener('mousedown', stopControlEvent);
    }
    if (typeof options.onInput === 'function') {
        input.addEventListener('input', event => options.onInput(input.value, input, event));
    }
    if (typeof options.onChange === 'function') {
        input.addEventListener('change', event => options.onChange(input.value, input, event));
    }
    if (typeof options.onEnter === 'function') {
        input.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            options.onEnter(input.value, input, event);
        });
    }
    return input;
}

export function createLoredeckSelectControl(options = {}) {
    let normalizedOptions = (options.options || []).map(normalizeOption);
    let allowed = new Set(normalizedOptions.map(item => String(item.value ?? '')));
    const optionSignature = items => JSON.stringify(items.map(item => [String(item.value ?? ''), String(item.label ?? item.value ?? ''), String(item.tooltip || '')]));
    let signature = optionSignature(normalizedOptions);
    const fallbackValue = String(options.fallbackValue ?? normalizedOptions[0]?.value ?? '');
    let currentValue = allowed.has(String(options.value ?? '')) ? String(options.value ?? '') : fallbackValue;

    const select = document.createElement('div');
    select.className = `${options.className || 'text_pole'} saga-loredeck-select-control`.trim();
    select.setAttribute('role', 'combobox');
    select.setAttribute('aria-haspopup', 'listbox');
    select.setAttribute('aria-expanded', 'false');
    select.tabIndex = -1;
    addTooltip(select, options.tooltip, { floating: false });
    Object.defineProperty(select, 'value', {
        get: () => currentValue,
        set: value => {
            const next = String(value ?? '');
            currentValue = allowed.has(next) ? next : fallbackValue;
            syncButtonLabel();
        },
    });
    if (options.disabled) {
        select.dataset.disabled = 'true';
        select.setAttribute('aria-disabled', 'true');
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'saga-loredeck-select-button';
    button.disabled = !!options.disabled;
    button.setAttribute('aria-label', options.tooltip || 'Choose an option.');
    select.appendChild(button);

    const menu = document.createElement('div');
    menu.className = 'saga-loredeck-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    select.appendChild(menu);

    function getCurrentItem() {
        return normalizedOptions.find(item => String(item.value ?? '') === currentValue) || normalizedOptions[0] || null;
    }

    function syncButtonLabel() {
        const item = getCurrentItem();
        button.textContent = String(item?.label ?? item?.value ?? '');
        button.dataset.value = currentValue;
    }

    function closeMenu() {
        menu.hidden = true;
        select.classList.remove('saga-loredeck-select-open');
        select.setAttribute('aria-expanded', 'false');
    }

    function setValue(value, event = null) {
        const next = String(value ?? '');
        if (!allowed.has(next)) return;
        if (next === currentValue) {
            closeMenu();
            return;
        }
        currentValue = next;
        syncButtonLabel();
        closeMenu();
        options.onChange?.(currentValue, select, event);
    }

    function renderMenu() {
        menu.textContent = '';
        for (const item of normalizedOptions) {
            const value = String(item.value ?? '');
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'saga-loredeck-select-option';
            option.textContent = String(item.label ?? item.value ?? '');
            option.dataset.value = value;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', value === currentValue ? 'true' : 'false');
            if (item.tooltip) option.dataset.sagaTooltip = String(item.tooltip);
            option.addEventListener('click', event => {
                event.stopPropagation();
                setValue(value, event);
                button.focus?.();
            });
            menu.appendChild(option);
        }
    }

    select.updateOptions = nextOptions => {
        const next = (nextOptions || []).map(normalizeOption);
        const nextSignature = optionSignature(next);
        if (nextSignature === signature) return;
        signature = nextSignature;
        normalizedOptions = next;
        allowed = new Set(next.map(item => String(item.value ?? '')));
        if (!allowed.has(currentValue)) currentValue = allowed.has(fallbackValue) ? fallbackValue : String(next[0]?.value ?? '');
        syncButtonLabel();
        if (!menu.hidden) renderMenu();
    };

    function openMenu() {
        if (button.disabled) return;
        renderMenu();
        menu.hidden = false;
        select.classList.add('saga-loredeck-select-open');
        select.setAttribute('aria-expanded', 'true');
    }

    function toggleMenu(event) {
        event.stopPropagation();
        if (menu.hidden) openMenu();
        else closeMenu();
    }

    if (options.stopPropagation !== false) {
        select.addEventListener('click', stopControlEvent);
        select.addEventListener('mousedown', stopControlEvent);
        select.addEventListener('pointerdown', stopControlEvent);
    }
    button.addEventListener('click', toggleMenu);
    select.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeMenu();
            button.focus?.();
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (menu.hidden) openMenu();
            else closeMenu();
        }
    });
    select.addEventListener('focusout', () => {
        setTimeout(() => {
            if (!select.contains(document.activeElement)) closeMenu();
        }, 0);
    });
    syncButtonLabel();
    return select;
}

export function createLoredeckFilterCount(options = {}) {
    const count = document.createElement(options.tagName || 'div');
    count.className = options.className || 'saga-loredeck-filter-count';
    count.textContent = String(options.text || '');
    addTooltip(count, options.tooltip);
    return count;
}
