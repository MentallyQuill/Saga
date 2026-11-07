import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const fixtureMap = {
  'content/loredecks/portrait/assets/cover.png': [
    { path: 'assets/generated/loredeck-covers/portrait-256.webp', width: 128, height: 256, bytes: 250 },
    { path: 'assets/generated/loredeck-covers/portrait-128.webp', width: 64, height: 128, bytes: 100 },
  ],
  'content/loredecks/landscape/assets/cover.png': [
    { path: 'assets/generated/loredeck-covers/landscape-128.webp', width: 128, height: 64, bytes: 90 },
    { path: 'assets/generated/loredeck-covers/landscape-256.webp', width: 256, height: 128, bytes: 220 },
  ],
  'content/loredecks/cheap/assets/cover.png': [
    { path: 'assets/generated/loredeck-covers/cheap-128.webp', width: 128, height: 128, bytes: 120 },
    { path: 'assets/generated/loredeck-covers/cheap-256.webp', width: 256, height: 256, bytes: 80 },
  ],
};
let moduleSequence = 0;
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(`${source}\n// fixture ${moduleSequence++}`).toString('base64')}`;
const assetUrl = (path, base = root.href) => new URL(path, base).href;
const original = (deck = 'portrait', base = root.href) => assetUrl(`content/loredecks/${deck}/assets/cover.png`, base);
const derivative = (deck = 'portrait', size = 128, base = root.href) => assetUrl(`assets/generated/loredeck-covers/${deck}-${size}.webp`, base);
const pack = (deck = 'portrait', cover = {}) => ({
  packId: deck,
  type: 'bundled',
  title: `${deck} cover`,
  manifest: `content/loredecks/${deck}/loredeck.json`,
  assets: { cover: { path: 'assets/cover.png', alt: 'Cover alt', title: 'Cover title', fit: 'cover', focalPoint: { x: 0.25, y: 0.75 }, ...cover } },
});
function assertHintsBeforeSource(img, loading) {
  const sourceIndex = img.history.findIndex(([name]) => name === 'src');
  assert.ok(sourceIndex >= 0, 'a source must be assigned');
  for (const [hint, value] of [['loading', loading], ['decoding', 'async']]) {
    const index = img.history.findIndex(([name, actual]) => name === hint && actual === value);
    assert.ok(index >= 0 && index < sourceIndex, `${hint}=${value} must precede the first source`);
  }
}

// Only the shipping derivative manifest is substituted. Resolver, source policy,
// binding, and observer service are production modules. Literal dimensions make
// fit/DPR expectations independent of the implementation and image toolchain.
async function loadCoverModule({ base = root.href } = {}) {
  const coverPath = new URL('src/loredecks/loredeck-cover-image.js', root);
  const passivePath = new URL('src/ui/passive-image-size.js', root);
  const themePath = new URL('src/theme/runtime-theme.js', root);
  let coverSource;
  try { coverSource = await readFile(coverPath, 'utf8'); } catch (error) {
    assert.fail(`Cover source policy is not implemented: ${error.code}`);
  }
  const imports = /^((?:import|export)\s+(?:[^;'"\n]*(?:\n[^;'"\n]*)*?\s+from\s*)?)(['"])([^'"\n]+)\2/gm;
  const absolutize = (source, owner, overrides = new Map()) => source.replace(imports, (all, prefix, quote, specifier) => {
    if (!specifier.startsWith('.')) return all;
    const target = new URL(specifier, owner).href;
    return `${prefix}${quote}${overrides.get(target) || target}${quote}`;
  });
  const themeSource = absolutize(await readFile(themePath, 'utf8'), themePath)
    .replaceAll('import.meta.url', JSON.stringify(new URL('src/theme/runtime-theme.js', base).href));
  const overrides = new Map([[themePath.href, moduleUrl(themeSource)]]);
  try {
    const passiveSource = absolutize(await readFile(passivePath, 'utf8'), passivePath);
    overrides.set(passivePath.href, moduleUrl(passiveSource));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const originals = {
    'content/loredecks/portrait/assets/cover.png': { width: 640, height: 1280 },
    'content/loredecks/landscape/assets/cover.png': { width: 1280, height: 640 },
    'content/loredecks/cheap/assets/cover.png': { width: 512, height: 512 },
  };
  const generated = moduleUrl(`export const BUNDLED_COVER_THUMBNAILS = ${JSON.stringify(fixtureMap)}; export const BUNDLED_COVER_ORIGINALS = ${JSON.stringify(originals)};`);
  coverSource = coverSource.replace(imports, (all, prefix, quote, specifier) => {
    if (/loredeck-cover-thumbnails\.js$/.test(specifier)) return `${prefix}${quote}${generated}${quote}`;
    return all;
  });
  const result = await import(moduleUrl(absolutize(coverSource, coverPath, overrides)));
  assert.equal(typeof result.getLoredeckCoverSources, 'function', 'source policy must be exported');
  assert.equal(typeof result.bindLoredeckCoverImage, 'function', 'image binding must be exported');
  assert.equal(typeof result.getLoredeckAssetRef, 'function', 'the existing asset resolver must move with the helper');
  return { ...result, passiveUrl: overrides.get(passivePath.href) };
}

class FakeImage extends EventTarget {
  constructor(ownerVisual = null) { super(); this.ownerVisual = ownerVisual; this.history = []; this.attributes = new Map(); this.style = {}; }
  get isConnected() { return this.ownerVisual?.isConnected ?? true; }
  getBoundingClientRect() { return this.renderedBox || this.ownerVisual?.getBoundingClientRect() || { width: 0, height: 0 }; }
  set loading(value) { this._loading = value; this.history.push(['loading', value]); }
  get loading() { return this._loading; }
  set decoding(value) { this._decoding = value; this.history.push(['decoding', value]); }
  get decoding() { return this._decoding; }
  set src(value) { this._src = value; this.attributes.set('src', value); this.history.push(['src', value]); }
  get src() { return this._src || ''; }
  setAttribute(key, value) { if (key === 'src') this.src = value; else this.attributes.set(key, value); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  removeAttribute(key) { this.attributes.delete(key); this.history.push(['remove', key]); }
  error() { this.dispatchEvent(new Event('error')); }
}

// Node lacks layout and observer APIs. These doubles deliver real browser
// notifications; all decisions about when/what to load remain in production.
function installPlatform({ cssSupport = 'supported' } = {}) {
  const names = ['window', 'document', 'ResizeObserver', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'CSS'];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const resizeObservers = new Set();
  const mutationObservers = new Set();
  const queries = new Set();
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = new Set(); resizeObservers.add(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.active = false; mutationObservers.add(this); }
    observe() { this.active = true; }
    disconnect() { this.active = false; }
  }
  const window = new EventTarget();
  window.devicePixelRatio = 1;
  window.matchMedia = query => {
    const media = new EventTarget();
    media.media = query;
    media.matches = true;
    media.addListener = callback => media.addEventListener('change', callback);
    media.removeListener = callback => media.removeEventListener('change', callback);
    queries.add(media);
    return media;
  };
  const document = new EventTarget();
  document.documentElement = { contains: element => element.isConnected };
  document.body = document.documentElement;
  document.contains = element => element.isConnected;
  Object.assign(globalThis, { window, document, ResizeObserver, MutationObserver,
    getComputedStyle: () => ({ objectFit: 'cover' }),
    requestAnimationFrame: callback => setTimeout(() => callback(performance.now()), 0),
    cancelAnimationFrame: clearTimeout,
  });
  if (cssSupport === 'missing-css') delete globalThis.CSS;
  else globalThis.CSS = cssSupport === 'missing-supports' ? {} : {
    supports: (property, value) => cssSupport === 'supported' && property === 'aspect-ratio' && value === '1 / 1',
  };
  const settle = async () => { await new Promise(resolve => setTimeout(resolve, 5)); };
  return {
    element(width = 0, height = 0) {
      return { isConnected: true, box: { width, height }, getBoundingClientRect() { return { ...this.box, x: 0, y: 0 }; } };
    },
    async resize(element, width, height) {
      element.box = { width, height };
      for (const observer of resizeObservers) for (const target of observer.targets) if (target === element || target.ownerVisual === element) {
        const box = target.getBoundingClientRect();
        observer.callback([{ target, contentRect: { width: box.width, height: box.height }, borderBoxSize: [{ inlineSize: box.width, blockSize: box.height }] }]);
      }
      await settle();
    },
    async dpr(value) {
      window.devicePixelRatio = value;
      for (const query of [...queries]) query.dispatchEvent(new Event('change'));
      window.dispatchEvent(new Event('resize'));
      await settle();
    },
    async disconnect(element) {
      element.isConnected = false;
      for (const observer of mutationObservers) if (observer.active) observer.callback([{ type: 'childList', removedNodes: [element] }]);
      await settle();
    },
    observedCount: () => [...resizeObservers].reduce((sum, observer) => sum + observer.targets.size, 0),
    activeResizeCount: () => [...resizeObservers].filter(observer => observer.targets.size).length,
    activeCleanupCount: () => [...mutationObservers].filter(observer => observer.active).length,
    restore() {
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
  };
}

test('canonical source identity permits Custom duplicates and separates identical relative paths', async () => {
  const { getLoredeckCoverSources } = await loadCoverModule();
  const bundled = pack();
  const custom = { ...structuredClone(bundled), packId: 'custom-copy', type: 'custom' };
  const policy = { usage: 'list', box: { width: 48, height: 48 }, dpr: 1 };
  assert.deepEqual(getLoredeckCoverSources(bundled, policy), { src: derivative(), originalSrc: original() });
  assert.deepEqual(getLoredeckCoverSources(custom, policy), { src: derivative(), originalSrc: original() });
  assert.deepEqual(getLoredeckCoverSources(pack('landscape'), policy), { src: derivative('landscape'), originalSrc: original('landscape') });
});

test('actual box, image aspect, fit, and DPR determine sufficient physical pixels', async () => {
  const { getLoredeckCoverSources } = await loadCoverModule();
  const cases = [
    ['portrait', 'cover', 48, 48, 1, 128],
    ['portrait', 'cover', 48, 48, 2, 256],
    ['portrait', 'cover', 48, 48, 3, null],
    ['portrait', 'contain', 80, 80, 1, 128],
    ['portrait', 'cover', 80, 80, 1, 256],
    ['landscape', 'contain', 80, 80, 1, 128],
    ['landscape', 'cover', 80, 80, 1, 256],
    ['portrait', 'cover', 64, 128, 1, 128],
    ['portrait', 'cover', 64.1, 128, 1, 256],
    ['landscape', 'cover', 128, 64, 1, 128],
    ['portrait', 'contain', 38, 38, 3, 128],
    ['portrait', 'cover', 38, 38, 3, 256],
  ];
  for (const [deck, fit, width, height, dpr, size] of cases) {
    const sources = getLoredeckCoverSources(pack(deck, { fit }), { usage: 'list', box: { width, height }, dpr });
    assert.equal(sources.src, size ? derivative(deck, size) : original(deck), `${deck} ${fit} ${width}x${height} @${dpr}`);
    assert.equal(sources.originalSrc, original(deck));
  }
});

test('among sufficient variants the smallest encoded transfer wins', async () => {
  const { getLoredeckCoverSources } = await loadCoverModule();
  assert.equal(getLoredeckCoverSources(pack('cheap'), { usage: 'list', box: { width: 40, height: 40 }, dpr: 1 }).src, derivative('cheap', 256));
});

test('detail, unknown Custom, data, user file, remote, and missing derivative retain original sources', async () => {
  const { getLoredeckCoverSources } = await loadCoverModule();
  assert.deepEqual(getLoredeckCoverSources(pack(), { usage: 'detail', box: { width: 20, height: 20 }, dpr: 1 }), { src: original(), originalSrc: original() });
  for (const path of ['data:image/png;base64,aGVsbG8=', 'https://example.test/cover.png', '/user/files/saga-cover-test.webp', 'content/loredecks/unknown/assets/cover.png']) {
    const custom = { ...pack(), type: 'custom', assets: { cover: { path } } };
    const expected = path.startsWith('content/') ? assetUrl(path) : path;
    assert.deepEqual(getLoredeckCoverSources(custom, { usage: 'list', box: { width: 20, height: 20 }, dpr: 3 }), { src: expected, originalSrc: expected });
  }
  assert.deepEqual(getLoredeckCoverSources({ packId: 'no-cover' }, { usage: 'list', box: { width: 30, height: 30 }, dpr: 1 }), { src: '', originalSrc: '' });
});

test('renamed and nested extension URLs resolve original and derivative under the same root', async () => {
  for (const base of ['https://host.test/scripts/extensions/third-party/Saga-renamed/', 'https://host.test/nested/install/extensions/third-party/Saga/']) {
    const { getLoredeckCoverSources } = await loadCoverModule({ base });
    assert.deepEqual(getLoredeckCoverSources(pack(), { usage: 'list', box: { width: 48, height: 48 }, dpr: 1 }), { src: derivative('portrait', 128, base), originalSrc: original('portrait', base) });
  }
});

test('resolution and selection leave canonical serialized and export fields unchanged', async () => {
  const { getLoredeckCoverSources, getLoredeckAssetRef } = await loadCoverModule();
  const value = { ...pack(), manifestData: { manifest: 'content/loredecks/portrait/loredeck.json', assets: { cover: { path: 'assets/cover.png' } } }, entryOverrides: [{ id: 'entry', content: 'Kept' }], coverPath: 'assets/cover.png' };
  const before = JSON.stringify(value);
  const freeze = object => { Object.values(object).forEach(child => { if (child && typeof child === 'object') freeze(child); }); return Object.freeze(object); };
  freeze(value);
  assert.equal(getLoredeckAssetRef(value).path, 'content/loredecks/portrait/assets/cover.png');
  getLoredeckCoverSources(value, { usage: 'list', box: { width: 38, height: 38 }, dpr: 3 });
  getLoredeckCoverSources(value, { usage: 'detail', dpr: 1 });
  assert.equal(JSON.stringify(value), before);
});

test('detail binds eager/async before an immediate original source and needs no size subscription', async () => {
  const platform = installPlatform();
  try {
    const { bindLoredeckCoverImage } = await loadCoverModule();
    const img = new FakeImage();
    const dispose = bindLoredeckCoverImage(platform.element(), img, pack(), { usage: 'detail' });
    assert.equal(img.src, original());
    assertHintsBeforeSource(img, 'eager');
    assert.equal(platform.observedCount(), 0);
    assert.equal(typeof dispose, 'function');
    dispose(); dispose();
  } finally { platform.restore(); }
});

test('list binds lazy/async before source, waits for nonzero layout, and upgrades on resize and DPR', async () => {
  const platform = installPlatform();
  try {
    const { bindLoredeckCoverImage } = await loadCoverModule();
    const visual = platform.element();
    const img = new FakeImage(visual);
    const dispose = bindLoredeckCoverImage(visual, img, pack(), { usage: 'list' });
    assert.equal(img.src, '', 'closed or unsized covers must not request an original');
    await platform.resize(visual, 0, 0);
    assert.equal(img.src, '');
    await platform.resize(visual, 48, 48);
    assert.equal(img.src, derivative());
    assertHintsBeforeSource(img, 'lazy');
    await platform.resize(visual, 90, 90);
    assert.equal(img.src, derivative('portrait', 256));
    await platform.dpr(3);
    assert.equal(img.src, original());
    dispose(); dispose();
    const before = img.history.length;
    await platform.resize(visual, 40, 40);
    await platform.dpr(1);
    assert.equal(img.history.length, before, 'disposed cards must receive no source writes');
    assert.equal(platform.observedCount(), 0);
  } finally { platform.restore(); }
});

test('derivative errors retry original then call monogram/action restoration once, including later resizes', async () => {
  const platform = installPlatform();
  try {
    const { bindLoredeckCoverImage } = await loadCoverModule();
    const visual = platform.element();
    const img = new FakeImage(visual);
    img.setAttribute('srcset', 'stale.webp 2x');
    let fallbackCount = 0;
    const dispose = bindLoredeckCoverImage(visual, img, pack(), { usage: 'list', onOriginalError() { fallbackCount++; } });
    await platform.resize(visual, 48, 48);
    assert.equal(img.src, derivative());
    img.error();
    assert.equal(img.src, original());
    assert.equal(img.getAttribute('srcset'), null);
    assert.equal(fallbackCount, 0, 'a missing derivative must not show a monogram');
    img.error(); img.error();
    assert.equal(fallbackCount, 1);
    const sources = img.history.filter(([name]) => name === 'src').map(([, value]) => value);
    assert.deepEqual(sources, [derivative(), original()]);
    await platform.resize(visual, 100, 100);
    await platform.dpr(3);
    img.error();
    assert.equal(fallbackCount, 1);
    assert.deepEqual(img.history.filter(([name]) => name === 'src').map(([, value]) => value), sources);
    dispose();
  } finally { platform.restore(); }
});

test('original-only image failure restores fallback once without retrying the same source', async () => {
  const platform = installPlatform();
  try {
    const { bindLoredeckCoverImage } = await loadCoverModule();
    const img = new FakeImage();
    let count = 0;
    const dispose = bindLoredeckCoverImage(platform.element(), img, pack(), { usage: 'detail', onOriginalError() { count++; } });
    img.error(); img.error();
    assert.equal(count, 1);
    assert.deepEqual(img.history.filter(([name]) => name === 'src').map(([, value]) => value), [original()]);
    dispose();
  } finally { platform.restore(); }
});

test('size observation is shared and removed cards release subscriptions without explicit disposal', async () => {
  const platform = installPlatform();
  try {
    const { passiveUrl } = await loadCoverModule();
    assert.ok(passiveUrl, 'passive size observer service must exist');
    const { observePassiveImageSize } = await import(passiveUrl);
    const first = platform.element();
    const second = platform.element();
    const deliveries = [];
    const disposeFirst = observePassiveImageSize(first, size => deliveries.push(['first', size.width, size.height]));
    const disposeSecond = observePassiveImageSize(second, size => deliveries.push(['second', size.width, size.height]));
    assert.equal(platform.activeResizeCount(), 1, 'covers share one ResizeObserver');
    assert.equal(platform.activeCleanupCount(), 1, 'covers share one disconnected-node observer');
    await platform.resize(first, 38, 44);
    assert.deepEqual(deliveries.at(-1), ['first', 38, 44]);
    await platform.disconnect(first);
    assert.equal(platform.observedCount(), 1);
    const before = deliveries.length;
    await platform.resize(first, 55, 55);
    assert.equal(deliveries.length, before);
    disposeFirst(); disposeFirst();
    await platform.disconnect(second);
    assert.equal(platform.observedCount(), 0);
    disposeSecond(); disposeSecond();
    assert.equal(platform.activeCleanupCount(), 0, 'last removal releases global cleanup work');
  } finally { platform.restore(); }
});

test('a detached binding releases its resize and error work; explicit tree disposal is idempotent', async () => {
  const platform = installPlatform();
  try {
    const { bindLoredeckCoverImage, disposeLoredeckCoverImages } = await loadCoverModule();
    const visual = platform.element();
    const img = new FakeImage(visual);
    let fallbacks = 0;
    bindLoredeckCoverImage(visual, img, pack(), { usage: 'list', onOriginalError() { fallbacks++; } });
    await platform.resize(visual, 48, 48);
    await platform.disconnect(visual);
    const before = img.history.length;
    img.error();
    await platform.dpr(3);
    assert.equal(img.history.length, before);
    assert.equal(fallbacks, 0);
    assert.equal(platform.observedCount(), 0);
    const other = new FakeImage();
    bindLoredeckCoverImage(platform.element(), other, pack(), { usage: 'detail', onOriginalError() { fallbacks++; } });
    const tree = { querySelectorAll: () => [other] };
    disposeLoredeckCoverImages(tree); disposeLoredeckCoverImages(tree);
    other.error();
    assert.equal(fallbacks, 0);
  } finally { platform.restore(); }
});

test('permanently discarded cover trees release an unmeasured binding without restoring styles', async () => {
  const platform = installPlatform();
  try {
    const { bindLoredeckCoverImage, discardDetachedLoredeckCoverImages } = await loadCoverModule();
    assert.equal(typeof discardDetachedLoredeckCoverImages, 'function', 'permanent discard must have a separate entry point');
    const visual = platform.element();
    const img = new FakeImage(visual);
    const styleWrites = [];
    img.style = new Proxy({ aspectRatio: '3 / 2', minWidth: '7px' }, {
      set(style, name, value) {
        styleWrites.push([name, value]);
        return Reflect.set(style, name, value);
      },
    });
    const tree = { get isConnected() { return visual.isConnected; }, querySelectorAll: () => [img] };
    let fallbacks = 0;
    const dispose = bindLoredeckCoverImage(visual, img, pack(), { usage: 'list', onOriginalError() { fallbacks++; } });
    assert.equal(img.src, '');
    assert.deepEqual([img.style.aspectRatio, img.style.minWidth], ['640 / 1280', '0']);
    styleWrites.length = 0;
    discardDetachedLoredeckCoverImages(tree);
    discardDetachedLoredeckCoverImages({ querySelectorAll: tree.querySelectorAll });
    assert.equal(platform.observedCount(), 1, 'connected or uncertain trees must stay bound');
    assert.deepEqual(styleWrites, []);

    visual.isConnected = false;
    discardDetachedLoredeckCoverImages(tree);
    discardDetachedLoredeckCoverImages(tree);
    dispose();
    assert.equal(platform.observedCount(), 0, 'discard must release size work synchronously');
    assert.equal(platform.activeCleanupCount(), 0, 'discard must release disconnect work synchronously');
    assert.deepEqual(styleWrites, []);
    img.error();
    await platform.resize(visual, 48, 48);
    await platform.dpr(3);
    assert.equal(img.src, '');
    assert.equal(fallbacks, 0);

    const regular = new FakeImage(platform.element());
    regular.style = { aspectRatio: '3 / 2', minWidth: '7px' };
    bindLoredeckCoverImage(regular.ownerVisual, regular, pack(), { usage: 'list' })();
    assert.deepEqual(regular.style, { aspectRatio: '3 / 2', minWidth: '7px' });
  } finally { platform.restore(); }
});

test('portrait density uses the actual overflowing image box while retaining the original intrinsic ratio', async () => {
  const platform = installPlatform();
  try {
    const { bindLoredeckCoverImage } = await loadCoverModule();
    const visual = platform.element();
    const img = new FakeImage(visual);
    img.renderedBox = { width: 42, height: 84 };
    const dispose = bindLoredeckCoverImage(visual, img, pack('portrait', { fit: 'contain' }), { usage: 'list' });
    await platform.dpr(3);
    await platform.resize(visual, 42, 42);
    assert.equal(img.src, derivative('portrait', 256), 'the overflowing image needs252 physical pixels in height');
    assert.equal(img.style.aspectRatio, '640 / 1280', 'rounded thumbnails retain original layout/crop ratio');
    dispose();
  } finally { platform.restore(); }
});

for (const cssSupport of ['unsupported', 'missing-css', 'missing-supports']) {
  test(`list uses original only and preserves baseline styles when aspect-ratio capability is ${cssSupport}`, async () => {
    const platform = installPlatform({ cssSupport });
    try {
      const { bindLoredeckCoverImage } = await loadCoverModule();
      const visual = platform.element();
      const img = new FakeImage(visual);
      Object.assign(img.style, { aspectRatio: 'auto', minWidth: '7px' });
      let fallbacks = 0;
      const value = pack('portrait', { fit: 'contain' });
      const serialized = JSON.stringify(value);
      const dispose = bindLoredeckCoverImage(visual, img, value, { usage: 'list', onOriginalError() { fallbacks++; } });
      assert.equal(img.src, '');
      await platform.resize(visual, 0, 0);
      assert.equal(img.src, '', 'capability fallback still waits for nonzero layout');
      await platform.resize(visual, 48, 48);
      assert.equal(img.src, original(), 'unsupported ratio preservation must never request a rounded derivative');
      assertHintsBeforeSource(img, 'lazy');
      assert.deepEqual(img.style, { aspectRatio: 'auto', minWidth: '7px' });
      await platform.resize(visual, 30, 30);
      await platform.dpr(3);
      assert.deepEqual(img.history.filter(([name]) => name === 'src'), [['src', original()]]);
      img.error(); img.error();
      assert.equal(fallbacks, 1);
      assert.equal(platform.observedCount(), 0);
      dispose(); dispose();
      assert.equal(JSON.stringify(value), serialized);
    } finally { platform.restore(); }
  });
}

test('rebinding the same image releases owned intrinsic styles before an original-only cover binding', async () => {
  const platform = installPlatform();
  try {
    const { bindLoredeckCoverImage } = await loadCoverModule();
    const visual = platform.element();
    const img = new FakeImage(visual);
    Object.assign(img.style, { aspectRatio: 'auto', minWidth: '7px' });
    let oldFallbacks = 0;
    let newFallbacks = 0;
    const first = bindLoredeckCoverImage(visual, img, pack(), { usage: 'list', onOriginalError() { oldFallbacks++; } });
    await platform.resize(visual, 48, 48);
    assert.equal(img.src, derivative());
    assert.equal(img.style.aspectRatio, '640 / 1280');
    globalThis.CSS = { supports: () => false };
    const second = bindLoredeckCoverImage(visual, img, pack('landscape'), { usage: 'list', onOriginalError() { newFallbacks++; } });
    assert.deepEqual(img.style, { aspectRatio: 'auto', minWidth: '7px' }, 'the prior binding cannot contaminate a fallback source');
    first();
    await platform.resize(visual, 48, 48);
    assert.equal(img.src, original('landscape'));
    img.error(); img.error();
    assert.equal(oldFallbacks, 0);
    assert.equal(newFallbacks, 1);
    assert.deepEqual(img.style, { aspectRatio: 'auto', minWidth: '7px' });
    second(); second();
    assert.equal(platform.observedCount(), 0);
  } finally { platform.restore(); }
});

if (process.argv.includes('--generated')) test('shipping derivatives reproduce byte-for-byte and decode losslessly at the recorded aspect and dimensions', async () => {
  const { createHash } = await import('node:crypto');
  const { mkdtemp, readdir, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { default: sharp } = await import('sharp');
  const { buildLoredeckThumbnails } = await import('./build-loredeck-thumbnails.mjs');
  const { BUNDLED_COVER_THUMBNAILS, BUNDLED_COVER_ORIGINALS } = await import('../../src/loredecks/generated/loredeck-cover-thumbnails.js');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const outputRoot = await mkdtemp(path.join(tmpdir(), 'saga-covers-'));
  try {
    const result = await buildLoredeckThumbnails({ outputRoot });
    assert.equal(result.originals, 70);
    assert.equal(result.derivatives, 140);
    const expectedFiles = Object.values(BUNDLED_COVER_THUMBNAILS).flat().map(variant => variant.path.split('/').at(-1)).sort();
    assert.deepEqual((await readdir(path.join(outputRoot, 'assets/generated/loredeck-covers'))).sort(), expectedFiles);
    assert.deepEqual((await readdir(new URL('assets/generated/loredeck-covers/', root))).sort(), expectedFiles);
    assert.deepEqual(await readFile(path.join(outputRoot, 'src/loredecks/generated/loredeck-cover-thumbnails.js')), await readFile(new URL('src/loredecks/generated/loredeck-cover-thumbnails.js', root)));
    let originalBytes = 0;
    let derivativeBytes = 0;
    for (const [originalPath, variants] of Object.entries(BUNDLED_COVER_THUMBNAILS)) {
      const input = await readFile(new URL(originalPath, root));
      const source = BUNDLED_COVER_ORIGINALS[originalPath];
      assert.equal(hash(input), source.sha256, 'original remains untouched');
      assert.equal(input.length, source.bytes);
      originalBytes += input.length;
      for (const [index, variant] of variants.entries()) {
        const shipped = await readFile(new URL(variant.path, root));
        assert.deepEqual(shipped, await readFile(path.join(outputRoot, variant.path)));
        assert.equal(hash(shipped), variant.sha256);
        assert.equal(shipped.length, variant.bytes);
        derivativeBytes += shipped.length;
        const metadata = await sharp(shipped).metadata();
        assert.equal(metadata.width, variant.width);
        assert.equal(metadata.height, variant.height);
        assert.equal(metadata.exif, undefined);
        assert.equal(metadata.icc, undefined);
        assert.equal(Math.max(variant.width, variant.height), Math.min([128, 256][index], Math.max(source.width, source.height)));
        assert.ok(Math.abs(variant.width / variant.height - source.width / source.height) <= 1 / variant.height, originalPath);
        const resized = await sharp(input).rotate().resize({ width: [128, 256][index], height: [128, 256][index], fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer();
        const decoded = await sharp(shipped).ensureAlpha().raw().toBuffer();
        assert.deepEqual(decoded, resized, `lossless resized pixels: ${variant.path}`);
      }
    }
    console.log(JSON.stringify({ originalBytes, derivativeBytes, originalCount: 70, derivativeCount: 140, pixelComparison: 'all140 exactly equal to resized originals', outputRoot: fileURLToPath(root) }));
  } finally {
    assert.ok(path.resolve(outputRoot).startsWith(`${path.resolve(tmpdir())}${path.sep}saga-covers-`));
    await rm(outputRoot, { recursive: true, force: true });
  }
});

if (process.argv.includes('--browser')) test('real image-backed covers preserve presentation, choose sharp phone variants, and retry derivative → original → monogram', async () => {
  const { access, mkdir, writeFile } = await import('node:fs/promises');
  const { chromium } = await import('playwright');
  const { startVisualSmokeServer } = await import('./serve-visual-smoke.mjs');
  const output = new URL('.tmp/sdd/rendering-performance/task3-browser/', root);
  await mkdir(output, { recursive: true });
  const server = await startVisualSmokeServer({ port: 0 });
  let browser;
  try {
    let executablePath = process.env.SAGA_CHROME_PATH;
    if (!executablePath && process.platform === 'win32') {
      for (const candidate of ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']) {
        try { await access(candidate); executablePath = candidate; break; } catch { /* Next installed browser. */ }
      }
    }
    browser = await chromium.launch({ headless: true, executablePath });
    const context = await browser.newContext({ viewport: { width: 430, height: 820 }, deviceScaleFactor: 3 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${server.origin}/tests/browser/visual-smoke.html`);
    await page.waitForFunction(() => window.__sagaSmokeReady === true);
    await page.evaluate(async () => {
      const { createLoredeckDeckVisual } = await import('/src/loredecks/loredeck-library-panel.js');
      const { BUNDLED_COVER_THUMBNAILS } = await import('/src/loredecks/generated/loredeck-cover-thumbnails.js');
      const gallery = document.createElement('section');
      gallery.id = 'task3-covers';
      Object.assign(gallery.style, { position: 'absolute', top: '0', left: '0', zIndex: '1000000', width: '430px', background: '#120c12', color: '#f1ead8', padding: '12px', boxSizing: 'border-box' });
      document.body.appendChild(gallery);
      window.task3Packs = Object.keys(BUNDLED_COVER_THUMBNAILS).map((path, index) => ({ packId: `cover-${index}`, type: 'custom', title: path.split('/')[2], assets: { cover: { path, alt: `Cover ${index}`, title: `Title ${index}`, fit: index % 2 ? 'contain' : 'cover', focalPoint: { x: 0.25, y: 0.75 } } } }));
      for (const [index, pack] of window.task3Packs.entries()) {
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '8px', height: '54px' });
        const label = document.createElement('span');
        label.textContent = `${index + 1}: original / list`;
        Object.assign(label.style, { font: '12px sans-serif', width: '140px' });
        row.appendChild(label);
        for (const usage of ['detail', 'list']) {
          const visual = createLoredeckDeckVisual(pack, 'saga-loredeck-library-monogram', { usage });
          visual.dataset.testUsage = usage;
          Object.assign(visual.style, { width: '42px', height: '42px', minWidth: '42px', flex: '0 0 42px' });
          row.appendChild(visual);
        }
        gallery.appendChild(row);
      }
    });
    // Native lazy-loading respects viewport distance. Scroll through all covers
    // to verify decoded images without relabeling an initial cold transfer.
    for (let top = 0; top < 4200; top += 600) {
      await page.evaluate(top => window.scrollTo(0, top), top);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    await page.waitForFunction(() => [...document.querySelectorAll('#task3-covers img')].every(img => img.complete && img.naturalWidth > 0));
    const images = await page.evaluate(async () => {
      const { BUNDLED_COVER_THUMBNAILS } = await import('/src/loredecks/generated/loredeck-cover-thumbnails.js');
      return [...document.querySelectorAll('#task3-covers [data-test-usage]')].map((visual, index) => {
        const img = visual.querySelector('img');
        const box = img.getBoundingClientRect();
        const visualBox = visual.getBoundingClientRect();
        const pack = window.task3Packs[Math.floor(index / 2)];
        const variants = BUNDLED_COVER_THUMBNAILS[pack.assets.cover.path];
        const original = new URL(pack.assets.cover.path, location.origin).href;
        const variant = variants.find(item => new URL(item.path, location.origin).href === img.src);
        const scale = pack.assets.cover.fit === 'contain' ? Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight) : Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
        return { usage: visual.dataset.testUsage, source: img.src, original, derivative: !!variant, bytes: variant?.bytes, sharp: scale * devicePixelRatio <= 1.000001, loading: img.loading, decoding: img.decoding, alt: img.alt, expectedAlt: pack.assets.cover.alt, objectFit: getComputedStyle(img).objectFit, expectedFit: pack.assets.cover.fit, objectPosition: img.style.objectPosition, childCount: visual.children.length, width: box.width, height: box.height, visualWidth: visualBox.width, visualHeight: visualBox.height };
      });
    });
    assert.equal(images.length, 140);
    await writeFile(new URL('image-diagnostics.json', output), JSON.stringify(images, null, 2));
    for (const image of images) {
      assert.equal(image.sharp, true, image.source);
      assert.equal(image.loading, image.usage === 'detail' ? 'eager' : 'lazy');
      assert.equal(image.decoding, 'async');
      assert.equal(image.alt, image.expectedAlt);
      assert.equal(image.objectFit, image.expectedFit);
      assert.equal(image.objectPosition, '25% 75%');
      assert.equal(image.childCount, 1, 'no additional layout wrapper');
      assert.equal(image.width, 42);
      assert.equal(image.visualWidth, 44);
      assert.equal(image.visualHeight, 44);
      if (image.usage === 'detail') assert.equal(image.source, image.original);
    }
    for (let index = 0; index < images.length; index += 2) {
      assert.equal(images[index + 1].width, images[index].width, 'list image keeps original intrinsic grid width');
      assert.equal(images[index + 1].height, images[index].height, 'list image keeps original intrinsic grid height/crop exactly');
    }
    assert.ok(images.filter(image => image.usage === 'list' && image.derivative).length > 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: fileURLToPath(new URL('phone-dpr3-paired-covers.png', output)), fullPage: true });
    const failed = [];
    await page.route('**/assets/generated/loredeck-covers/*.webp', route => { failed.push(route.request().url()); return route.abort(); });
    await page.evaluate(async () => {
      const { createLoredeckDeckVisual } = await import('/src/loredecks/loredeck-library-panel.js');
      const cover = createLoredeckDeckVisual(window.task3Packs[0], 'saga-loredeck-library-monogram', { usage: 'list' });
      cover.id = 'task3-missing-derivative';
      Object.assign(cover.style, { position: 'fixed', top: '0', left: '0', zIndex: '1000001', width: '42px', height: '42px' });
      document.body.appendChild(cover);
    });
    await page.waitForFunction(() => {
      const img = document.querySelector('#task3-missing-derivative img');
      return img?.complete && img.naturalWidth > 0 && img.src.includes('/content/loredecks/');
    });
    assert.ok(failed.length > 0, 'the browser attempted a derivative before its original');
    const errorContext = await browser.newContext({ viewport: { width: 430, height: 820 }, deviceScaleFactor: 3 });
    const errorPage = await errorContext.newPage();
    errorPage.on('pageerror', error => errors.push(error.message));
    await errorPage.route('**/assets/generated/loredeck-covers/*.webp', route => route.abort());
    await errorPage.route('**/content/loredecks/hp-core/assets/cover.png', route => route.abort());
    await errorPage.goto(`${server.origin}/tests/browser/visual-smoke.html`);
    await errorPage.waitForFunction(() => window.__sagaSmokeReady === true);
    const errorPack = await page.evaluate(() => window.task3Packs[0]);
    await errorPage.evaluate(async pack => {
      const { createLoredeckDeckVisual } = await import('/src/loredecks/loredeck-library-panel.js');
      const cover = createLoredeckDeckVisual(pack, 'saga-loredeck-library-monogram', { usage: 'list', editableCover: true });
      cover.id = 'task3-missing-original';
      Object.assign(cover.style, { position: 'fixed', top: '0', left: '50px', zIndex: '1000001', width: '42px', height: '42px' });
      document.body.appendChild(cover);
    }, errorPack);
    await errorPage.waitForSelector('#task3-missing-original.saga-loredeck-library-visual-fallback .saga-loredeck-library-visual-fallback-text');
    assert.equal(await errorPage.locator('#task3-missing-original .saga-loredeck-library-cover-actions').count(), 1, 'cover actions survive terminal fallback');
    await errorContext.close();
    const legacyContext = await browser.newContext({ viewport: { width: 430, height: 820 }, deviceScaleFactor: 3 });
    const legacyPage = await legacyContext.newPage();
    legacyPage.on('pageerror', error => errors.push(error.message));
    await legacyPage.addInitScript(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = (...args) => args[0] === 'aspect-ratio' ? false : supports(...args);
    });
    const legacyDerivativeRequests = [];
    await legacyPage.route('**/assets/generated/loredeck-covers/*.webp', route => {
      legacyDerivativeRequests.push(route.request().url());
      return route.abort();
    });
    await legacyPage.goto(`${server.origin}/tests/browser/visual-smoke.html`);
    await legacyPage.waitForFunction(() => window.__sagaSmokeReady === true);
    const legacyBeforeLayout = await legacyPage.evaluate(async () => {
      const { createLoredeckDeckVisual } = await import('/src/loredecks/loredeck-library-panel.js');
      const pack = { packId: 'legacy-portrait', type: 'custom', title: 'Legacy portrait', assets: { cover: { path: 'content/loredecks/one-piece-arlong-park/assets/cover.jpg', fit: 'contain' } } };
      let deferred = false;
      for (const [index, usage] of ['detail', 'list'].entries()) {
        const visual = createLoredeckDeckVisual(pack, 'saga-loredeck-library-monogram', { usage });
        visual.id = `task3-legacy-${usage}`;
        Object.assign(visual.style, { position: 'fixed', top: '0', left: `${index * 60}px`, zIndex: '1000001', width: '42px', height: '42px' });
        if (usage === 'list') deferred = visual.firstChild.getAttribute('src') === null;
        document.body.appendChild(visual);
      }
      return deferred;
    });
    assert.equal(legacyBeforeLayout, true);
    await legacyPage.waitForFunction(() => ['detail', 'list'].every(usage => {
      const img = document.querySelector(`#task3-legacy-${usage} img`);
      return img?.complete && img.naturalWidth > 0;
    }));
    const legacyImages = await legacyPage.evaluate(() => ['detail', 'list'].map(usage => {
      const img = document.querySelector(`#task3-legacy-${usage} img`);
      const box = img.getBoundingClientRect();
      return { usage, src: img.src, width: box.width, height: box.height, ratioStyle: img.style.aspectRatio, minWidthStyle: img.style.minWidth, loading: img.loading, decoding: img.decoding };
    }));
    assert.equal(legacyImages[1].src, `${server.origin}/content/loredecks/one-piece-arlong-park/assets/cover.jpg`);
    assert.equal(legacyImages[1].width, legacyImages[0].width);
    assert.equal(legacyImages[1].height, legacyImages[0].height);
    assert.equal(legacyImages[1].ratioStyle, '');
    assert.equal(legacyImages[1].minWidthStyle, '');
    assert.equal(legacyImages[1].loading, 'lazy');
    assert.equal(legacyImages[1].decoding, 'async');
    await legacyPage.route('**/content/loredecks/one-piece-drum-island/assets/cover.jpg', route => route.abort());
    await legacyPage.evaluate(async () => {
      const { createLoredeckDeckVisual } = await import('/src/loredecks/loredeck-library-panel.js');
      const visual = createLoredeckDeckVisual({ packId: 'legacy-error', type: 'custom', title: 'Legacy error', assets: { cover: { path: 'content/loredecks/one-piece-drum-island/assets/cover.jpg' } } }, 'saga-loredeck-library-monogram', { usage: 'list', editableCover: true });
      visual.id = 'task3-legacy-error';
      Object.assign(visual.style, { position: 'fixed', top: '60px', left: '0', zIndex: '1000001', width: '42px', height: '42px' });
      document.body.appendChild(visual);
    });
    await legacyPage.waitForSelector('#task3-legacy-error.saga-loredeck-library-visual-fallback .saga-loredeck-library-visual-fallback-text');
    assert.equal(await legacyPage.locator('#task3-legacy-error .saga-loredeck-library-cover-actions').count(), 1);
    assert.deepEqual(legacyDerivativeRequests, [], 'unsupported capability makes no derivative requests, including error fallback');
    await legacyContext.close();
    assert.deepEqual(errors, []);
    await writeFile(new URL('evidence.json', output), JSON.stringify({ browser: await browser.version(), viewport: { width: 430, height: 820 }, dpr: 3, decodedImages: 140, images, missingDerivativeRequests: failed, legacyCapabilitySimulation: { images: legacyImages, derivativeRequests: legacyDerivativeRequests, errorFallbackActions: true }, errors }, null, 2));
    console.log('Image-backed Edge check: all70 paired original/list covers decoded at phone DPR3; hints, sharpness, geometry, crop/focal/alt, and two-stage failure/action restoration verified.');
    console.log('Unsupported aspect-ratio simulation in Edge: original-only list matches baseline portrait geometry/styles, lazy/async/nonzero deferral retained, no derivative request, original error restores monogram/actions. This is not an actual old-engine run.');
  } finally { await browser?.close(); await server.stop(); }
});
