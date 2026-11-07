import assert from 'node:assert/strict';
import { installSagaPerformanceImageReadiness } from './lib/saga-performance-image-readiness.mjs';

const originalGlobals = new Map(['window', 'document', 'IntersectionObserver', 'MutationObserver', 'HTMLImageElement', 'requestAnimationFrame', 'cancelAnimationFrame'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function environment() {
    const env = { images: [], observations: [], io: [], mo: null, autoDeliver: true, onFrame: null, listeners: new Set() };
    class Image {
        constructor({ owner = null, visible = true, source = 'https://fixture/image.png', complete = true, naturalWidth = 20, loading = 'lazy', decode = () => Promise.resolve() } = {}) { Object.assign(this, { owner, visible, currentSrc: source, complete, naturalWidth, naturalHeight: naturalWidth, loading, isConnected: true, decodeImpl: decode, decodeCalls: 0 }); }
        closest() { return this.owner; }
        matches(selector) { return selector.includes('img'); }
        getAttribute(name) { return name === 'src' ? this.currentSrc : null; }
        decode() { this.decodeCalls++; return this.decodeImpl(); }
        getBoundingClientRect() { throw new Error('Forbidden descendant rectangle query'); }
    }
    class IO {
        constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); this.records = []; env.io.push(this); assert.equal(options.root, null); assert.equal(options.rootMargin, '0px'); assert.equal(options.threshold, 0); }
        observe(target) { this.targets.add(target); env.observations.push(target); if (env.recordOnly) this.records.push({ target, isIntersecting: target.visible, intersectionRect: { width: target.visible ? 10 : 0, height: target.visible ? 10 : 0 } }); else if (env.autoDeliver) queueMicrotask(() => { if (this.targets.has(target)) this.callback([{ target, isIntersecting: target.visible, intersectionRect: { width: target.visible ? 10 : 0, height: target.visible ? 10 : 0 } }]); }); }
        unobserve(target) { this.targets.delete(target); }
        disconnect() { this.targets.clear(); }
        takeRecords() { return this.records.splice(0); }
    }
    class MO { constructor(callback) { this.callback = callback; env.mo = this; this.active = false; } observe() { this.active = true; } disconnect() { this.active = false; } takeRecords() { return []; } }
    env.Image = Image;
    env.window = { addEventListener: (_name, fn) => env.listeners.add(fn), removeEventListener: (_name, fn) => env.listeners.delete(fn) };
    Object.assign(globalThis, { window: env.window, document: { documentElement: {}, querySelectorAll: () => env.images.filter(i => i.isConnected) }, IntersectionObserver: IO, MutationObserver: MO, HTMLImageElement: Image,
        requestAnimationFrame: callback => setTimeout(() => { env.onFrame?.(); callback(performance.now()); }, 1), cancelAnimationFrame: clearTimeout });
    env.mutate = (target = env.images[0], attributeName = 'src') => env.mo?.callback([{ type: 'attributes', target, attributeName }]);
    env.install = options => { installSagaPerformanceImageReadiness({ timeoutMs: 1000, ...options }); return env.window.__sagaPerformanceImageReadiness; };
    return env;
}
function assertDisposed(env, handle) { const state = handle.diagnostics(); assert.equal(state.activeObservers, 0); assert.equal(state.retainedNodes, 0); assert.equal(state.pendingFrames, 0); assert.equal(state.pendingTimers, 0); assert.equal(env.listeners.size, 0); }
try {
    {
        const env = environment(); env.autoDeliver = false;
        env.images.push(new env.Image({ owner: { visible: true, isConnected: true } }));
        const h = env.install({ timeoutMs: 15 }); assert.equal(h.readySnapshot().ready, false);
        await assert.rejects(h.waitForReady(), /timed out/); assertDisposed(env, h);
    }
    {
        const env = environment(); const root = { visible: false, isConnected: true };
        const image = new env.Image({ owner: root }); env.images.push(image);
        const h = env.install(); const result = await h.waitForReady();
        assert.equal(result.eligibleCount, 0); assert.equal(image.decodeCalls, 0); assert.equal(env.observations.includes(image), false);
        h.dispose(); h.dispose(); assertDisposed(env, h);
    }
    {
        const env = environment(); env.recordOnly = true; env.images.push(new env.Image({ owner: { visible: true, isConnected: true } }));
        const h = env.install({ timeoutMs: 50 }); assert.equal((await h.waitForReady()).decodedCount, 1); h.dispose(); assertDisposed(env, h);
    }
    for (const loading of ['eager', 'lazy']) {
        const env = environment(); const image = new env.Image({ loading }); env.images.push(image);
        const h = env.install({ requireVisibleCover: true }); const result = await h.waitForReady();
        assert.equal(result.eligibleCount, 1); assert.equal(result.decodedCount, 1); assert.equal(result.visibleCoverCount, 1); assert.ok(result.sealedEpoch > result.initialReadyEpoch); assert.equal(image.decodeCalls, 1);
        h.dispose(); assertDisposed(env, h);
    }
    {
        const env = environment(); env.images.push(new env.Image({ source: '', complete: true, naturalWidth: 0 }));
        const h = env.install({ timeoutMs: 15 }); await assert.rejects(h.waitForReady(), /timed out/); assertDisposed(env, h);
    }
    {
        const env = environment(); const old = deferred(); const fresh = deferred();
        const image = new env.Image({ decode: () => old.promise }); env.images.push(image);
        const h = env.install(); let settled = false; const waiting = h.waitForReady().then(value => { settled = true; return value; });
        await delay(10); assert.equal(settled, false);
        image.currentSrc = 'https://fixture/new.png'; image.decodeImpl = () => fresh.promise; env.mutate(image); old.resolve();
        await delay(10); assert.equal(settled, false); fresh.resolve(); const result = await waiting;
        assert.equal(result.images[0].source, 'https://fixture/new.png'); assert.equal(image.decodeCalls, 2); h.dispose(); assertDisposed(env, h);
    }
    {
        const env = environment(); const pending = deferred(); const image = new env.Image({ decode: () => pending.promise }); env.images.push(image);
        const h = env.install(); const waiting = h.waitForReady(); await delay(10); image.isConnected = false; env.mutate(image); await waiting; pending.resolve(); await delay(5);
        h.dispose(); assertDisposed(env, h);
    }
    {
        const env = environment(); const image = new env.Image(); env.images.push(image);
        const h = env.install(); await Promise.resolve();
        const waiting = h.waitForReady(); const rejected = assert.rejects(waiting, /disposed/); h.dispose(); await rejected; await Promise.resolve();
        assert.equal(image.decodeCalls, 0, 'A queued decode must not start after disposal'); assertDisposed(env, h);
    }
    {
        const env = environment(); const pending = deferred(); env.images.push(new env.Image({ decode: () => pending.promise }));
        const first = env.install({ ownerId: 'old' }); const waiting = first.waitForReady(); const rejected = assert.rejects(waiting, /replaced|disposed/);
        const second = env.install({ ownerId: 'new' }); await rejected; assert.equal(env.window.__sagaPerformanceImageReadiness, second); pending.resolve(); second.dispose(); assertDisposed(env, second);
    }
    {
        const env = environment(); env.images.push(new env.Image()); let added = null;
        const h = env.install(); let settled = false;
        env.onFrame = () => { if (!added && h.readySnapshot().decodedCount === 1) { added = new env.Image({ source: '', naturalWidth: 0 }); env.images.push(added); env.mutate(added); } };
        const waiting = h.waitForReady().then(result => { settled = true; return result; });
        await delay(20); assert.ok(added); assert.equal(settled, false);
        added.currentSrc = 'https://fixture/late.png'; added.naturalWidth = added.naturalHeight = 20; env.mutate(added);
        assert.equal((await waiting).decodedCount, 2); h.dispose(); assertDisposed(env, h);
    }
    {
        const env = environment(); env.images.push(new env.Image({ decode: () => Promise.reject(new Error('decode sentinel')) }));
        const h = env.install(); await assert.rejects(h.waitForReady(), /decode sentinel/); assertDisposed(env, h);
    }
    {
        const env = environment();
        assert.throws(() => env.install({ observerFactory() { throw new Error('observer construction sentinel'); } }), /construction sentinel/);
        assert.equal(env.listeners.size, 0); assert.equal(env.mo.active, false); assert.equal(env.window.__sagaPerformanceImageReadiness, undefined);
    }
    {
        const env = environment(); globalThis.IntersectionObserver = undefined;
        assert.throws(() => env.install(), error => error.code === 'SAGA_IMAGE_READINESS_UNSUPPORTED'); assert.equal(env.io.length, 0);
    }
    console.log('Image gate unit contracts passed: unknowns, boundary-first exclusion, eager/lazy decode, source epochs, final seal, replacement and cleanup.');
} finally {
    window?.__sagaPerformanceImageReadiness?.dispose();
    for (const [name, descriptor] of originalGlobals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
}
