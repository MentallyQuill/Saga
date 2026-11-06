import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  captureTextInputFocus,
  preserveInputFocusAfterRender,
  restoreTextInputFocus,
} from '../../src/ui/input-focus-preservation.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

class FakeInput {
  constructor(doc, value = '') {
    this.ownerDocument = doc;
    this.value = value;
    this.selectionStart = value.length;
    this.selectionEnd = value.length;
    this.selectionDirection = 'none';
    this.focusCalls = 0;
  }

  focus(options = {}) {
    this.focusCalls += 1;
    this.lastFocusOptions = options;
    this.ownerDocument.activeElement = this;
  }

  setSelectionRange(start, end, direction = 'none') {
    this.selectionStart = start;
    this.selectionEnd = end;
    this.selectionDirection = direction;
  }
}

class FakeDocument {
  constructor() {
    this.activeElement = null;
    this.targets = new Map();
    this.defaultView = {
      requestAnimationFrame: callback => {
        callback();
        return 1;
      },
    };
  }

  querySelector(selector) {
    return this.targets.get(selector) || null;
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function count(source, token) {
  return source.split(token).length - 1;
}

{
  const doc = new FakeDocument();
  const original = new FakeInput(doc, 'Hermione Granger');
  original.selectionStart = 4;
  original.selectionEnd = 8;
  original.selectionDirection = 'forward';
  doc.activeElement = original;

  const replacement = new FakeInput(doc, 'Hermione Granger');
  doc.targets.set('.search', replacement);

  let rendered = false;
  preserveInputFocusAfterRender(original, '.search', () => {
    rendered = true;
  });

  assert.equal(rendered, true, 'preserveInputFocusAfterRender must run the render callback.');
  assert.equal(doc.activeElement, replacement, 'Replacement search input must receive focus after render.');
  assert.equal(replacement.selectionStart, 4, 'Replacement search input must preserve selectionStart.');
  assert.equal(replacement.selectionEnd, 8, 'Replacement search input must preserve selectionEnd.');
  assert.equal(replacement.selectionDirection, 'forward', 'Replacement search input must preserve selection direction.');
  assert.deepEqual(replacement.lastFocusOptions, { preventScroll: true }, 'Replacement focus should avoid scroll jumps.');
}

{
  const doc = new FakeDocument();
  const original = new FakeInput(doc, 'Nami');
  const replacement = new FakeInput(doc, 'Nami');
  doc.targets.set('.search', replacement);
  const snapshot = captureTextInputFocus(original);

  assert.equal(snapshot.focused, false, 'Unfocused input snapshots must not claim focus.');
  assert.equal(restoreTextInputFocus('.search', snapshot, { root: doc }), false, 'Unfocused snapshots should not steal focus by default.');
  assert.equal(doc.activeElement, null, 'Unfocused snapshots must leave focus unchanged.');
}

const helper = read('src/ui/input-focus-preservation.js');
const loredeckWorkbench = read('src/loredecks/loredeck-workbench-panel.js');
const contextWorkbench = read('src/context/context-workbench-panel.js');
const loredecksTab = read('src/loredecks/loredecks-tab-panel.js');
const lorecardsPanel = read('src/lorecards/lorecards-panel.js');
const alphaGate = read('tools/scripts/run-alpha-gate.mjs');

assert(helper.includes('export function preserveInputFocusAfterRender'), 'Input focus helper must expose the render-preservation API.');
assert.equal(count(loredeckWorkbench, 'preserveInputFocusAfterRender('), 1, 'Loredeck Workbench Registry search must preserve focus across its existing re-render. Lorecards retained search identity/focus/composition and editor caret are covered by test-loredeck-workbench-browser-parity.mjs.');
assert.equal(count(contextWorkbench, 'preserveInputFocusAfterRender('), 2, 'Context Workbench search inputs must preserve focus across re-render.');
assert.equal(count(loredecksTab, 'preserveInputFocusAfterRender('), 1, 'Deck Maker project search must preserve focus across shelf re-render.');
assert(lorecardsPanel.includes('captureTextInputFocus(search)'), 'Lorecards workbench searches must capture selection before delayed re-render.');
assert(lorecardsPanel.includes("preserveInputFocusAfterRender(search, '.saga-lorecard-workspace-search'"), 'Lorecards workspace search must preserve focus across panel refresh.');
assert(!loredeckWorkbench.includes('next.setSelectionRange?.(next.value.length'), 'Loredeck Workbench must not force replacement searches to the end of the input.');
assert(!loredecksTab.includes('const end = next.value.length'), 'Deck Maker project search must not force replacement searches to the end of the input.');
assert(alphaGate.includes('src/ui/input-focus-preservation.js'), 'Alpha gate must syntax-check the input focus helper.');
assert(alphaGate.includes('tools/scripts/test-search-focus-preservation.mjs'), 'Alpha gate must run the search focus regression test.');

console.log('Search focus preservation tests passed.');
