import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createLoredeckSelectControl } from '../../src/loredecks/loredeck-filter-controls.js';

const args = process.argv.slice(2);

function readNumberArg(name, fallback) {
  const prefix = `--${name}=`;
  const inline = args.find(arg => arg.startsWith(prefix));
  const raw = inline ? inline.slice(prefix.length) : '';
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const iterations = Math.trunc(readNumberArg('iterations', 90));
const warmup = Math.trunc(readNumberArg('warmup', 12));
const optionCount = Math.trunc(readNumberArg('options', 180));
const libraryRows = Math.trunc(readNumberArg('rows', 1800));
const p95BudgetMs = readNumberArg('p95-budget-ms', 12);
const maxBudgetMs = readNumberArg('max-budget-ms', 40);

class FakeClassList {
  constructor(el) {
    this.el = el;
    this.values = new Set();
  }

  load(value) {
    this.values = new Set(String(value || '').split(/\s+/).filter(Boolean));
    this.sync();
  }

  sync() {
    this.el._className = [...this.values].join(' ');
  }

  add(...names) {
    for (const name of names) if (name) this.values.add(String(name));
    this.sync();
  }

  remove(...names) {
    for (const name of names) this.values.delete(String(name));
    this.sync();
  }

  contains(name) {
    return this.values.has(String(name || ''));
  }
}

class FakeEvent {
  constructor(type, target) {
    this.type = type;
    this.target = target;
    this.currentTarget = null;
    this.defaultPrevented = false;
    this.cancelBubble = false;
    this.button = 0;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  stopPropagation() {
    this.cancelBubble = true;
  }
}

class FakeElement {
  constructor(tagName = 'div', ownerDocument = null) {
    this.tagName = String(tagName || 'div').toUpperCase();
    this.nodeName = this.tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this.listeners = {};
    this.style = {};
    this.disabled = false;
    this.hidden = false;
    this.type = '';
    this.tabIndex = 0;
    this._className = '';
    this._textContent = '';
    this.classList = new FakeClassList(this);
  }

  set className(value) {
    this.classList.load(value);
  }

  get className() {
    return this._className;
  }

  set textContent(value) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this._textContent = String(value ?? '');
  }

  get textContent() {
    return this._textContent + this.children.map(child => child.textContent || '').join('');
  }

  appendChild(child) {
    if (!child) return child;
    if (child.parentNode) child.remove();
    child.parentNode = this;
    if (!child.ownerDocument) child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    const siblings = this.parentNode.children;
    const index = siblings.indexOf(this);
    if (index >= 0) siblings.splice(index, 1);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes[String(name)] = String(value);
  }

  getAttribute(name) {
    return this.attributes[String(name)] ?? null;
  }

  removeAttribute(name) {
    delete this.attributes[String(name)];
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    event.currentTarget = this;
    for (const handler of [...(this.listeners[event.type] || [])]) {
      handler(event);
      if (event.cancelBubble) return !event.defaultPrevented;
    }
    if (event.cancelBubble || !this.parentNode) return !event.defaultPrevented;
    return this.parentNode.dispatchEvent(event);
  }

  click() {
    if (this.disabled) return;
    this.focus?.();
    this.dispatchEvent(new FakeEvent('click', this));
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  contains(node) {
    if (!node) return false;
    if (node === this) return true;
    return this.children.some(child => child.contains?.(node));
  }

  matches(selector) {
    const raw = String(selector || '').trim();
    if (!raw) return false;
    if (raw.startsWith('.')) return this.classList.contains(raw.slice(1));
    if (raw.startsWith('#')) return this.getAttribute('id') === raw.slice(1);
    const attr = raw.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attr) {
      const value = this.getAttribute(attr[1]);
      return attr[2] == null ? value != null : value === attr[2];
    }
    return this.tagName.toLowerCase() === raw.toLowerCase();
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches?.(selector)) return current;
      current = current.parentNode;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = String(selector || '').split(',').map(item => item.trim()).filter(Boolean);
    const matches = [];
    const visit = node => {
      for (const child of node.children || []) {
        if (selectors.some(selectorPart => child.matches?.(selectorPart))) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
}

class FakeDocument extends FakeElement {
  constructor() {
    super('#document', null);
    this.ownerDocument = this;
    this.createdTags = new Map();
    this.activeElement = null;
    this.body = new FakeElement('body', this);
    this.appendChild(this.body);
  }

  createElement(tagName) {
    const key = String(tagName || '').toLowerCase();
    this.createdTags.set(key, (this.createdTags.get(key) || 0) + 1);
    return new FakeElement(tagName, this);
  }

  createDocumentFragment() {
    return new FakeElement('#fragment', this);
  }
}

globalThis.document = new FakeDocument();
globalThis.window = { innerWidth: 1440, innerHeight: 900, document: globalThis.document };
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);

function buildSyntheticLibrarySurface(rowCount) {
  const overlay = document.createElement('div');
  overlay.className = 'saga-loredeck-library-overlay';
  const shell = document.createElement('div');
  shell.className = 'saga-lore-workbench-shell saga-loredeck-library-shell';
  const pane = document.createElement('div');
  pane.className = 'saga-loredeck-library-pane';
  const list = document.createElement('div');
  list.className = 'saga-loredeck-library-hierarchy-list';

  for (let index = 0; index < rowCount; index += 1) {
    const row = document.createElement('div');
    row.className = index % 5 === 0 ? 'saga-loredeck-library-inline-folder-row' : 'saga-loredeck-library-deck-card';
    row.dataset.packId = `pack-${index}`;
    const title = document.createElement('div');
    title.className = 'saga-loredeck-row-title';
    title.textContent = `Synthetic Loredeck ${index}`;
    row.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'saga-loredeck-row-meta';
    for (let chipIndex = 0; chipIndex < 3; chipIndex += 1) {
      const chip = document.createElement('span');
      chip.className = 'saga-status-pill';
      chip.textContent = `Chip ${chipIndex}`;
      meta.appendChild(chip);
    }
    row.appendChild(meta);
    list.appendChild(row);
  }

  pane.appendChild(list);
  shell.appendChild(pane);
  overlay.appendChild(shell);
  document.body.appendChild(overlay);
  return { overlay, pane };
}

function createOptions(count) {
  return Array.from({ length: count }, (_, index) => [
    `option-${index}`,
    `Folder Menu Option ${index}`,
    `Synthetic dropdown item ${index}`,
  ]);
}

function measure(label, fn) {
  const start = performance.now();
  fn();
  const elapsed = performance.now() - start;
  assert(Number.isFinite(elapsed), `${label} latency must be finite.`);
  return elapsed;
}

function percentile(values, percent) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percent / 100) * sorted.length) - 1));
  return sorted[index] || 0;
}

function summarize(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    count: values.length,
    min: Math.min(...values),
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    max: Math.max(...values),
    mean: total / values.length,
  };
}

function formatStats(stats) {
  return `p50=${stats.p50.toFixed(3)}ms p95=${stats.p95.toFixed(3)}ms max=${stats.max.toFixed(3)}ms mean=${stats.mean.toFixed(3)}ms`;
}

function assertBudget(name, stats) {
  assert(
    stats.p95 <= p95BudgetMs,
    `${name} p95 ${stats.p95.toFixed(3)}ms exceeded budget ${p95BudgetMs.toFixed(3)}ms.`
  );
  assert(
    stats.max <= maxBudgetMs,
    `${name} max ${stats.max.toFixed(3)}ms exceeded budget ${maxBudgetMs.toFixed(3)}ms.`
  );
}

const { pane } = buildSyntheticLibrarySurface(libraryRows);
let parentClickCount = 0;
pane.addEventListener('click', () => {
  parentClickCount += 1;
});

let changeCount = 0;
const control = createLoredeckSelectControl({
  className: 'text_pole saga-loredeck-library-sort',
  value: 'option-0',
  fallbackValue: 'option-0',
  options: createOptions(optionCount),
  tooltip: 'Synthetic latency benchmark dropdown.',
  onChange: () => {
    changeCount += 1;
  },
});
pane.appendChild(control);

const button = control.querySelector('.saga-loredeck-select-button');
const menu = control.querySelector('.saga-loredeck-select-menu');
assert(button, 'Benchmark dropdown must render a clickable button.');
assert(menu, 'Benchmark dropdown must render a menu container.');
assert.equal(document.createdTags.get('select') || 0, 0, 'Benchmark dropdown must not create native select elements.');

assert.equal(typeof control.updateOptions, 'function', 'Retained dropdown must accept authoritative option updates.');
button.click();
const firstOption = menu.children[0];
control.updateOptions(createOptions(optionCount));
assert.equal(menu.children[0], firstOption, 'Equivalent options must preserve existing option nodes.');
assert.equal(menu.hidden, false, 'Equivalent options must retain the open menu.');
assert.equal(control.value, 'option-0', 'Equivalent options must retain selection.');
control.updateOptions([...createOptions(optionCount), ['added', 'Added category']]);
assert.equal(control.querySelector('.saga-loredeck-select-button'), button, 'Changed options must retain the trigger.');
assert.equal(control.querySelector('.saga-loredeck-select-menu'), menu, 'Changed options must retain the menu.');
assert.equal(menu.hidden, false, 'Changed options must retain open state.');
menu.children[menu.children.length - 1].click();
assert.equal(control.value, 'added', 'New authoritative options must be selectable.');
control.updateOptions(createOptions(optionCount));
assert.equal(control.value, 'option-0', 'Removed selection must use the configured fallback.');

for (let index = 0; index < warmup; index += 1) {
  button.click();
  button.click();
}

const openLatencies = [];
const closeLatencies = [];
const optionLatencies = [];

for (let index = 0; index < iterations; index += 1) {
  openLatencies.push(measure('open', () => button.click()));
  assert.equal(menu.hidden, false, 'Dropdown menu should be open after the open click.');
  assert.equal(menu.querySelectorAll('.saga-loredeck-select-option').length, optionCount, 'Open menu should render every synthetic option.');

  closeLatencies.push(measure('close', () => button.click()));
  assert.equal(menu.hidden, true, 'Dropdown menu should be closed after the close click.');

  button.click();
  const options = menu.querySelectorAll('.saga-loredeck-select-option');
  let nextIndex = (index + 1) % optionCount;
  if (control.value === `option-${nextIndex}`) nextIndex = (nextIndex + 1) % optionCount;
  optionLatencies.push(measure('option select', () => options[nextIndex].click()));
  assert.equal(menu.hidden, true, 'Dropdown menu should close after selecting a menu item.');
  assert.equal(control.value, `option-${nextIndex}`, 'Dropdown value should update after selecting a menu item.');
}

assert.equal(parentClickCount, 0, 'Dropdown interactions must not bubble to Library pane click handlers.');
assert(changeCount >= iterations, 'Dropdown option selection should invoke onChange for each measured selection.');

const openStats = summarize(openLatencies);
const closeStats = summarize(closeLatencies);
const optionStats = summarize(optionLatencies);

assertBudget('Dropdown open', openStats);
assertBudget('Dropdown close', closeStats);
assertBudget('Dropdown option select', optionStats);

console.log(`Loredeck dropdown latency benchmark (${iterations} iterations, ${optionCount} options, ${libraryRows} synthetic Library rows).`);
console.log(`  open:          ${formatStats(openStats)}`);
console.log(`  close:         ${formatStats(closeStats)}`);
console.log(`  option select: ${formatStats(optionStats)}`);
console.log(`  budgets:       p95<=${p95BudgetMs}ms max<=${maxBudgetMs}ms`);
console.log('Loredeck dropdown latency budget passed.');
