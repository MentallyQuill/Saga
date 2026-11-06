import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../../src/ui/runtime-ui-kit.js', import.meta.url), 'utf8');
const kit = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('managed tooltip registration updates text, reuses listeners, and releases active anchors and pending frames', () => {
  assert.equal(typeof kit.createManagedTooltip, 'function', 'managed tooltip API must exist');
  assert.equal(typeof kit.disposeRuntimeTooltips, 'function');
  class Element extends EventTarget {
    constructor(tagName = 'BUTTON') { super(); this.tagName = tagName; this.dataset = {}; this.style = {}; this.attributes = new Map(); this.isConnected = true; this.adds = 0; this.removes = 0; this.rectReads = 0; }
    addEventListener(...args) { this.adds++; super.addEventListener(...args); }
    removeEventListener(...args) { this.removes++; super.removeEventListener(...args); }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
    closest() { return this.mobile ? this : null; }
    getBoundingClientRect() { this.rectReads++; return { left: 20, top: 40, bottom: 60, width: 50, height: 20 }; }
    querySelectorAll() { return this.children || []; }
  }
  const frames = new Map(); let sequence = 0; let tip;
  const names = ['document', 'window', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  globalThis.document = { createElement: () => (tip = new Element('DIV')), body: { appendChild() {} } };
  globalThis.window = { innerWidth: 1000, innerHeight: 800 };
  globalThis.requestAnimationFrame = fn => { frames.set(++sequence, fn); return sequence; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  try {
    const anchor = new Element();
    const handle = kit.createManagedTooltip(anchor, 'First');
    assert.equal(anchor.adds, 4);
    assert.equal(kit.addTooltip(anchor, 'Second'), anchor);
    assert.equal(kit.createManagedTooltip(anchor, 'Third'), handle);
    assert.equal(anchor.adds, 4, 'repeated APIs must not accumulate listeners');
    anchor.dispatchEvent(new Event('mouseenter'));
    assert.equal(tip.textContent, 'Third');
    handle.update('Updated');
    assert.equal(tip.textContent, 'Updated');
    assert.equal(anchor.attributes.get('aria-label'), 'Updated');
    const pending = [...frames.values()];
    handle.dispose(); handle.dispose();
    assert.equal(anchor.removes, 4);
    assert.equal(tip.style.display, 'none');
    assert.equal(frames.size, 0);
    for (const frame of pending) frame();
    assert.equal(anchor.rectReads, 0, 'a queued callback must not use a disposed anchor');
    assert.equal(anchor.dataset.sagaTooltip, undefined);
    const restored = kit.createManagedTooltip(anchor, 'Again');
    anchor.dispatchEvent(new Event('focus'));
    anchor.isConnected = false;
    for (const frame of frames.values()) frame(); frames.clear();
    assert.equal(anchor.rectReads, 0);
    assert.equal(tip.style.display, 'none', 'a disconnected active anchor must be released');
    restored.dispose();
    const root = new Element(); const child = new Element(); root.children = [child];
    kit.addTooltip(root, 'Root'); kit.addTooltip(child, 'Child'); child.dispatchEvent(new Event('focus'));
    kit.disposeRuntimeTooltips(root);
    assert.equal(root.removes, 4); assert.equal(child.removes, 4); assert.equal(tip.style.display, 'none');
    for (const element of [new Element('SELECT'), Object.assign(new Element(), { mobile: true })]) {
      assert.equal(kit.addTooltip(element, 'Native surface'), element);
      assert.equal(element.adds, 0); assert.equal(element.dataset.sagaTooltip, 'Native surface');
      kit.disposeRuntimeTooltips(element);
    }
  } finally {
    kit.hideFloatingTooltip();
    for (const [name, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
});
