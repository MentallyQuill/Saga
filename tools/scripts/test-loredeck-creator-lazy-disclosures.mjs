import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as creator from '../../src/loredecks/loredeck-creator-panel.js';
import { configureRuntimeGuidePrep, prepareRuntimeGuideStep } from '../../src/runtime/runtime-guide-prep.js';
import { configureRuntimeComposition } from '../../src/runtime/runtime-composition.js';
import { configureLoredeckEditorActions, finalizeGeneratedLoredeckAsCustom } from '../../src/runtime/loredeck-editor-actions.js';
import { configureGeneratedLoredeckReadiness } from '../../src/runtime/loredeck-generated-readiness.js';
import { createLoredeckCreatorGenerationProgressController } from '../../src/loredecks/loredeck-creator-generation-progress.js';
import {
  setLoredeckCreatorGenerationController, hasLoredeckCreatorGenerationController,
  deleteLoredeckCreatorGenerationController, forgetLoredeckCreatorLiveGeneration,
} from '../../src/loredecks/loredeck-creator-generation-state.js';

// A deliberately small DOM double: opening details does NOT emit toggle. Real browsers
// enqueue that event, so anchor/tour/scroll code must materialize synchronously.
class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase(); this.nodeType = 1;
    this.children = []; this.parentNode = null; this.dataset = {}; this.attributes = {};
    this.listeners = new Map(); this.style = {}; this.className = ''; this._text = '';
    this.open = false; this.scrollTop = 0; this.scrollLeft = 0;
    this.clientHeight = 300; this.clientWidth = 500; this.scrollHeight = 300;
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/), ...names])].filter(Boolean).join(' '); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
    };
  }
  get parentElement() { return this.parentNode; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value ?? ''); this.replaceChildren(); }
  appendChild(child) {
    if (!(child instanceof Element)) throw new TypeError('appendChild requires a Node');
    child.remove(); this.children.push(child); child.parentNode = this; return child;
  }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  replaceChildren(...children) { this.children.forEach(child => { child.parentNode = null; }); this.children = []; this.append(...children); }
  remove() { if (this.parentNode) { const siblings = this.parentNode.children; siblings.splice(siblings.indexOf(this), 1); this.parentNode = null; } }
  replaceWith(next) { const parent = this.parentNode; const index = parent.children.indexOf(this); this.remove(); next.remove(); parent.children.splice(index, 0, next); next.parentNode = parent; }
  insertBefore(next, sibling) { const index = this.children.indexOf(sibling); next.remove(); this.children.splice(index, 0, next); next.parentNode = this; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) {
    if (name.startsWith('data-')) return this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] ?? null;
    return this.attributes[name] ?? null;
  }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(type, handler) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(handler); }
  removeEventListener(type, handler) { this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== handler)); }
  dispatch(type, extra = {}) { const event = { type, target: this, preventDefault() {}, stopPropagation() {}, ...extra }; for (const handler of this.listeners.get(type) || []) handler(event); }
  matches(selector) {
    return selector.split(',').some(part => {
      const raw = part.trim();
      const tag = raw.match(/^[\w-]+/); if (tag && tag[0].toUpperCase() !== this.tagName) return false;
      for (const [, name] of raw.replace(/\[[^\]]*\]/g, '').matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(name)) return false;
      for (const [, name, value] of raw.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
        const actual = this.getAttribute(name); if (actual === null || (value !== undefined && actual !== value)) return false;
      }
      return raw === '*' || Boolean(tag || raw.startsWith('.') || raw.startsWith('['));
    });
  }
  querySelectorAll(selector) { const found = []; const visit = node => { for (const child of node.children) { if (child.matches(selector)) found.push(child); visit(child); } }; visit(this); return found; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let node = this; node; node = node.parentNode) if (node.matches(selector)) return node; return null; }
  contains(target) { return this === target || this.children.some(child => child.contains(target)); }
  getBoundingClientRect() { return { top: 0, bottom: 300, left: 0, right: 500, width: 500, height: 300 }; }
  scrollIntoView(options) { this.scrolled = options; }
}

let revision = 1;
let cached;
let pipeline;
let modelCalls;
let cardOptions;
let durable;
let cardFactory;
let frames;
function setup() {
  const hostContext = { chatMetadata: {}, extensionSettings: {}, saveMetadata() {}, saveSettingsDebounced() {} };
  globalThis.SillyTavern = { getContext: () => hostContext };
  const body = new Element('body');
  globalThis.document = {
    body, activeElement: null, createElement: tag => new Element(tag), createDocumentFragment: () => new Element('fragment'),
    querySelector: selector => body.querySelector(selector), querySelectorAll: selector => body.querySelectorAll(selector),
  };
  globalThis.window = { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) };
  frames = new Map(); let nextFrame = 0;
  globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  cached = { revision: revision++, approved: true, brief: { fandom: 'Fixture', scope: 'Scope' } };
  pipeline = { currentStep: { id: 'done' }, stages: [], pendingChanges: [], creatorCoverage: {} };
  modelCalls = 0; cardOptions = []; durable = { provider: 0, jobs: 0, storage: 0, stopGeneration: 0 };
  cardFactory = () => new Element();
  creator.configureLoredeckCreatorPanel({
    getState: () => ({}), getLoredeckCreatorBriefCache: () => cached,
    getLoredeckCreatorPipelineModel: () => { modelCalls++; return pipeline; },
    getLoredeckCreatorDraftInputs: () => ({}), formatLoredeckCreatorGranularity: value => value,
    createLoredeckCreatorCard: (state, options) => { cardOptions.push(options); return cardFactory(state, options); },
    recoverLoredeckCreatorCurrentActiveGenerationOnOpen: () => null,
    markTourTarget: (node, name) => { node.dataset.sagaTourTarget = name; return node; },
    sendLoreRequest: () => { durable.provider++; }, saveState: () => { durable.storage++; },
    handleLoredeckCreatorEntryDraft: () => { durable.jobs++; },
    stopLoredeckCreatorGenerationProgress: () => { durable.stopGeneration++; },
  });
}
function factoryDisclosure(anchor, factory, options = {}) {
  let details;
  assert.doesNotThrow(() => { details = creator.createLoredeckCreatorArtifactDisclosure(anchor, factory, { anchor, ...options }); },
    'Artifact disclosures must accept factories without appending the function as a DOM node');
  return details;
}
function requireApi(name) { assert.equal(typeof creator[name], 'function', `${name} must be a public creator lifecycle operation`); return creator[name]; }
function bodyWith(...children) { const body = new Element(); body.className = 'saga-loredeck-creator-workbench-body'; body.append(...children); document.body.append(body); return body; }
function assertNoDurableWork() { assert.deepEqual(durable, { provider: 0, jobs: 0, storage: 0, stopGeneration: 0 }); }

test('Node arguments retain their existing summary, classes, anchor, and child identity', () => {
  setup(); const node = new Element('input');
  const details = creator.createLoredeckCreatorArtifactDisclosure('Scope Brief', node, { open: true, state: 'Approved', anchor: 'compat' });
  assert.equal(details.children[0].tagName, 'SUMMARY'); assert.equal(details.children[0].textContent, 'Scope BriefApproved');
  assert.equal(details.className, 'saga-loredeck-creator-artifact'); assert.equal(details.children[1], node);
});

test('closed = zero factories; first opening = one; later toggles preserve editor node and text', () => {
  setup(); let calls = 0; const editor = new Element('textarea'); editor.value = 'unsaved';
  const details = factoryDisclosure('lazy-toggle', () => { calls++; return editor; });
  assert.equal(calls, 0); assert.equal(details.children.length, 1);
  details.open = true; details.dispatch('toggle'); assert.equal(calls, 1); assert.equal(details.children[1], editor);
  details.open = false; details.dispatch('toggle'); details.open = true; details.dispatch('toggle');
  assert.equal(calls, 1); assert.equal(details.children[1], editor); assert.equal(editor.value, 'unsaved'); assertNoDurableWork();
});

test('remembered click and keyboard open state materializes immediately on the next render', () => {
  setup();
  for (const [suffix, event] of [['click', {}], ['keydown', { key: 'Enter' }], ['keydown-space', { key: ' ' }]]) {
    const anchor = `remembered-${suffix}`;
    const first = factoryDisclosure(anchor, () => new Element());
    first.children[0].dispatch(suffix.startsWith('keydown') ? 'keydown' : 'click', event);
    let calls = 0; const replacement = factoryDisclosure(anchor, () => { calls++; return new Element(); });
    assert.equal(replacement.open, true); assert.equal(calls, 1);
  }
});

test('delayed factory reads current cache and failed materialization can be retried', () => {
  setup(); let seen; let attempts = 0;
  const details = factoryDisclosure('fresh-cache', () => { attempts++; if (attempts === 1) throw new Error('temporary fixture error'); seen = cached; return new Element(); });
  const materialize = requireApi('materializeLoredeckCreatorDisclosure');
  cached = { ...cached, revision: revision++ };
  try { materialize(details); } catch (error) { assert.match(error.message, /temporary fixture error/); }
  const node = materialize(details); assert.ok(node instanceof Element); assert.equal(seen, cached); assert.equal(attempts, 2);
});

test('child disposal is once per mounted handle, skips never opened children, and supports a disclosure root', () => {
  setup(); let mountedDisposals = 0; let closedCalls = 0;
  const mounted = factoryDisclosure('dispose-mounted', () => ({ element: new Element(), dispose() { mountedDisposals++; } }), { open: true });
  const closed = factoryDisclosure('dispose-closed', () => { closedCalls++; return new Element(); });
  const root = bodyWith(mounted, closed); const dispose = requireApi('disposeLoredeckCreatorDisclosureChildren');
  dispose(mounted); dispose(root); dispose(root);
  assert.equal(mountedDisposals, 1); assert.equal(closedCalls, 0); assertNoDurableWork();
});

test('disposed native toggle callbacks cannot overwrite the next render remembered state', () => {
  setup(); const details = factoryDisclosure('late-toggle', () => new Element());
  requireApi('disposeLoredeckCreatorDisclosureChildren')(details);
  details.open = true; details.dispatch('toggle');
  assert.equal(factoryDisclosure('late-toggle', () => new Element()).open, false);
});

for (const [target, owner] of [['finalize', 'deck-health'], ['brief-review', 'scope-brief'], ['context-tags', 'context-plan'],
  ['coverage-plan', 'coverage-plan'], ['story-outline', 'story-outline'], ['title-sets', 'title-sets'], ['review-queue', 'review-queue'], ['lorecards', 'lorecards']]) {
  test(`anchor ${target} materializes owning ${owner} synchronously before scrolling`, () => {
    setup(); let calls = 0; let targetNode;
    const details = factoryDisclosure(owner, () => { calls++; targetNode = new Element(); targetNode.dataset.sagaCreatorAnchor = target; return targetNode; });
    bodyWith(details); assert.equal(creator.scrollLoredeckCreatorWorkbenchToAnchor(target), true);
    assert.equal(details.open, true); assert.equal(calls, 1); assert.ok((targetNode.scrolled || details.scrolled), 'Requested target must scroll during the same call'); assertNoDurableWork();
  });
}

const targetGroups = {
  'scope-brief': ['brief'], 'story-outline': ['outline'],
  'title-sets': ['titlePass', 'titleActions', 'generateNextTitleBatch', 'generateRemainingTitleBatches', 'approveSelectedTitles', 'titleRevision', 'reviseSelectedTitles'],
  'context-plan': ['planning', 'planningActions', 'planContextTags'], 'review-queue': ['review'],
  lorecards: ['entries', 'entryActions', 'draftLorecards', 'autoDraftAll'],
  'deck-health': ['readiness', 'readinessHealthActions', 'runPackHealth', 'openPackHealthCenter', 'attemptHealthFixing', 'finalizeActions', 'openCoveragePlan', 'finalizeAnyway'],
};
test('tour coverage enumerates every current child target; every target opens its owner without generation', () => {
  const source = readFileSync(new URL('../../src/loredecks/loredeck-creator-panel.js', import.meta.url), 'utf8');
  const actual = [...source.matchAll(/['"]loredecks\.creator\.([\w]+)['"]/g)].map(match => match[1]);
  const shellTargets = ['workbench', 'body', 'pipeline', 'settings', 'stages', 'currentTask'];
  assert.deepEqual([...new Set(actual)].filter(name => !shellTargets.includes(name)).sort(), Object.values(targetGroups).flat().sort(),
    'Update behavioral tour cases whenever a real creator child target is added or removed');
  const prepare = requireApi('prepareLoredeckCreatorTourTarget');
  for (const [owner, targets] of Object.entries(targetGroups)) for (const suffix of targets) {
    setup(); let target;
    const details = factoryDisclosure(owner, () => { target = new Element(); target.dataset.sagaTourTarget = `loredecks.creator.${suffix}`; return target; });
    bodyWith(details); prepare(`loredecks.creator.${suffix}`);
    assert.equal(details.open, true, suffix); assert.ok(target, `${suffix} must exist before tour lookup`); assertNoDurableWork();
  }
});

test('guide open and missing-project paths prepare the requested nested target after opening', () => {
  setup(); const calls = [];
  configureRuntimeGuidePrep({ setExperienceMode() {}, navigateRuntimeTab() {},
    openLoredeckCreatorWorkbench: () => calls.push('open'), prepareLoredeckCreatorTourTarget: name => calls.push(name) });
  for (const prepare of ['openLoredeckCreator', 'openCreatorProject']) {
    calls.length = 0; prepareRuntimeGuideStep({ prepare, target: 'loredecks.creator.titleRevision' });
    assert.deepEqual(calls, ['open', 'loredecks.creator.titleRevision'], prepare);
  }
});

test('runtime composition passes creator tour preparation through to the guide owner', () => {
  setup(); const calls = []; const noop = () => {};
  configureRuntimeComposition({ getPanelRoot: () => null, getState: () => ({}), getSettings: () => ({}),
    saveState: noop, saveSettings: noop, showLorePanel: noop, hideLorePanel: noop, refreshPanelBody: noop, refreshHeader: noop,
    renderPanelBody: noop, createRuntimeRenderErrorCard: noop, navigateRuntimeTab: noop, setExperienceMode: noop,
    openLoredeckCreatorWorkbench: () => calls.push('open'), prepareLoredeckCreatorTourTarget: target => calls.push(target),
  });
  prepareRuntimeGuideStep({ prepare: 'openLoredeckCreator', target: 'loredecks.creator.entries' });
  assert.deepEqual(calls, ['open', 'loredecks.creator.entries']);
});

test('creator open and refresh pass their render cache and pipeline into card creation exactly once', () => {
  setup(); creator.openLoredeckCreatorWorkbench();
  assert.equal(modelCalls, 1); assert.equal(cardOptions[0].cached, cached); assert.equal(cardOptions[0].pipeline, pipeline);
  creator.refreshLoredeckCreatorWorkbenchBody();
  assert.equal(modelCalls, 2); assert.equal(cardOptions[1].cached, cached); assert.equal(cardOptions[1].pipeline, pipeline);
});

test('refresh restores nested scroll after synchronous child materialization and disposes replaced handles', () => {
  setup(); let disposed = 0; const editors = [];
  cardFactory = () => factoryDisclosure('scroll-restore', () => {
    const editor = new Element('textarea'); editor.scrollHeight = 900; editors.push(editor);
    return { element: editor, dispose() { disposed++; } };
  });
  creator.openLoredeckCreatorWorkbench();
  const details = document.querySelector('details'); details.open = true; details.dispatch('toggle');
  editors[0].scrollTop = 137; editors[0].scrollLeft = 19;
  creator.refreshLoredeckCreatorWorkbenchBody();
  assert.equal(editors.length, 2); assert.equal(editors[1].scrollTop, 137); assert.equal(editors[1].scrollLeft, 19);
  assert.equal(disposed, 1); assertNoDurableWork();
});

test('refresh preserves a collapsed summary used as the viewport anchor without mounting its editor', () => {
  setup(); let calls = 0;
  cardFactory = () => factoryDisclosure('summary-restore', () => { calls++; return new Element('textarea'); });
  creator.openLoredeckCreatorWorkbench(); creator.refreshLoredeckCreatorWorkbenchBody();
  assert.equal(document.querySelector('details').open, false); assert.equal(calls, 0);
});

for (const closeVia of ['explicit', 'backdrop', 'Close', 'previous-open']) {
  test(`${closeVia} creator close disposes once and leaves generation/storage work alone`, () => {
    setup(); let disposed = 0;
    cardFactory = () => factoryDisclosure('close-resource', () => ({ element: new Element(), dispose() { disposed++; } }), { open: true });
    creator.openLoredeckCreatorWorkbench(); const overlay = document.querySelector('.saga-loredeck-creator-workbench-overlay');
    if (closeVia === 'explicit') { requireApi('closeLoredeckCreatorWorkbench')(); requireApi('closeLoredeckCreatorWorkbench')(); }
    if (closeVia === 'backdrop') { overlay.dispatch('pointerdown'); overlay.dispatch('click'); overlay.dispatch('click'); }
    if (closeVia === 'Close') { overlay.querySelectorAll('button').find(button => button.textContent === 'Close').dispatch('click'); }
    if (closeVia === 'previous-open') creator.openLoredeckCreatorWorkbench();
    assert.equal(disposed, 1); assertNoDurableWork();
  });
}

test('closing a view cancels its queued frames while the real generation progress controller keeps running', () => {
  setup(); let ticker; let stopped = 0; let persisted = 0;
  const generation = { id: 'lazy-live-generation', jobId: 'lazy-live-job', status: 'running', startedAt: Date.now(), receivedChars: 0 };
  cached = { ...cached, jobId: generation.jobId, activeGeneration: generation };
  setLoredeckCreatorGenerationController(generation, new AbortController());
  const progress = createLoredeckCreatorGenerationProgressController({ getCurrentJob: () => cached,
    setCurrentJobLocal: job => { cached = job; }, setCurrentJob: job => { cached = job; persisted++; },
    refreshGenerationStatusUi: creator.refreshLoredeckCreatorGenerationStatusUi,
    setInterval: callback => { ticker = callback; return 1; }, clearInterval: () => { stopped++; },
  });
  try {
    creator.openLoredeckCreatorWorkbench(); progress.startTicker(generation.id);
    creator.queueLoredeckCreatorWorkbenchRefresh(); assert.ok(frames.size > 0);
    creator.closeLoredeckCreatorWorkbench(); assert.equal(frames.size, 0);
    progress.updateGeneration(generation, { phase: 'receiving', receivedChars: 42 }, { persist: false }); ticker();
    assert.equal(cached.activeGeneration.receivedChars, 42); assert.equal(persisted, 0); assert.equal(stopped, 0);
    assert.equal(hasLoredeckCreatorGenerationController(generation), true);
  } finally {
    progress.stopTicker(); deleteLoredeckCreatorGenerationController(generation); forgetLoredeckCreatorLiveGeneration(generation);
  }
});

// These runtime owners intentionally keep their functions private. Compile the
// exact source body against explicit boundaries rather than adding test exports
// to production or duplicating the behavior under test.
function privateRuntimeFunction(name, boundaries) {
  const source = readFileSync(new URL('../../src/runtime/lore-panel.js', import.meta.url), 'utf8');
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Real runtime owner must define ${name}`);
  const end = source.indexOf('\n}', start) + 2;
  return new Function(...Object.keys(boundaries), `return (${source.slice(start, end)});`)(...Object.values(boundaries));
}

function runtimeCardFixture() {
  const calls = [];
  cached = { ...cached, outlineApproved: true, outline: { title: 'Outline' }, generatedPackId: 'lazy-generated' };
  const pack = { packId: cached.generatedPackId, type: 'generated', pendingChanges: [{ changeId: 'pending', kind: 'entry' }] };
  pipeline = { ...pipeline, generatedPack: pack, pendingChanges: pack.pendingChanges };
  const renderers = ['CoverageCard', 'BriefReview', 'OutlineCard', 'TitlePassCard', 'PlanningCard', 'PendingReviewCard', 'EntryDraftCard', 'PipelineReadinessCard'];
  const boundaries = {
    getState: () => ({}), getLoredeckCreatorBriefCache: () => cached,
    getLoredeckCreatorPipelineModel: () => { modelCalls++; return pipeline; }, getLoredeckCreatorOutline: value => value.outline,
    loredeckCreatorFandom: '', loredeckCreatorScope: '', loredeckCreatorGranularity: '', loredeckCreatorNotes: '',
    createLoredeckCreatorPipelineHeader: () => new Element(), createLoredeckCreatorStageGuide: () => new Element(),
    createLoredeckCreatorCurrentTaskCard: () => new Element(), createLoredeckCreatorAdvancedGenerationSettings: () => new Element(),
    formatLoredeckCreatorCoverageState: () => 'Ready', getLoredeckCreatorGeneratedPackDefinition: () => pack,
    getLoredeckPendingChanges: value => value.pendingChanges || [],
    createLoredeckCreatorArtifactDisclosure: creator.createLoredeckCreatorArtifactDisclosure,
  };
  for (const suffix of renderers) boundaries[`createLoredeckCreator${suffix}`] = (...args) => {
    calls.push({ suffix, cached: args.find(arg => arg?.revision !== undefined) }); return new Element('textarea');
  };
  return { render: privateRuntimeFunction('createLoredeckCreatorCard', boundaries), calls };
}

test('real runtime card callsites defer every collapsed artifact including the Pending Review existence probe', () => {
  setup(); const fixture = runtimeCardFixture();
  const card = fixture.render({}, { embedded: true, showHeader: false, cached, pipeline });
  assert.equal(card.querySelectorAll('details').length, 8);
  assert.deepEqual(fixture.calls, [], 'No collapsed child renderer may execute during the initial card render');
  cached = { ...cached, revision: revision++ };
  const brief = card.querySelector('[data-saga-creator-anchor="scope-brief"]'); brief.open = true; brief.dispatch('toggle');
  assert.equal(fixture.calls.length, 1); assert.equal(fixture.calls[0].cached, cached);
});

test('real runtime card reuses the provided render model rather than deriving a second pipeline', () => {
  setup(); const fixture = runtimeCardFixture();
  fixture.render({}, { embedded: true, showHeader: false, cached, pipeline });
  assert.equal(modelCalls, 0, 'Header and card must share the caller-provided render context');
});

test('pipeline presentation reuses readiness pipeline and coverage from the same render', () => {
  setup(); let readinessCalls = 0; let pipelineCalls = 0; let coverageCalls = 0;
  cached.generatedPackId = 'model-count-pack';
  const pack = { packId: cached.generatedPackId };
  const coverage = { available: false };
  const readinessPipeline = { coverage, warnings: [], approvedTitleCount: 0, approvedTitleAcceptedCount: 0 };
  const model = privateRuntimeFunction('getLoredeckCreatorPipelineModel', {
    getLoredeckCreatorOutline: () => null, getLoredeckCreatorTitleBatchRows: () => [],
    getLoredeckCreatorTitleDraftedBatchIds: () => new Set(), getLoredeckCreatorApprovedTitleDrafts: () => [],
    maybeHydrateLoredeckCreatorGeneratedPack() {}, getLoredeckCreatorGeneratedPackDefinition: () => pack,
    getLoredeckCreatorPlanningBatchRows: () => [], getLoredeckCreatorPlanningPlannedBatchIds: () => new Set(),
    getLoredeckCreatorPlanningAcceptedBatchIds: () => new Set(), getLoredeckAssistantDraftChanges: () => [],
    getLoredeckCreatorDraftCacheForPack: () => ({}), getLoredeckPendingChanges: () => [],
    getLoredeckCreatorCoverageModel: () => { coverageCalls++; return coverage; },
    getLoredeckCreatorPipelineReadiness: () => { pipelineCalls++; return readinessPipeline; },
    getCachedLoredeckCreatorPackHealth: () => null,
    getGeneratedLoredeckExportReadiness: () => { readinessCalls++; return { pipeline: readinessPipeline, blockers: [], warnings: [] }; },
    getActiveLoredeckCreatorGeneration: () => null, LOREDECK_CREATOR_COVERAGE_FINALIZE_BLOCKER: 'coverage-blocker',
    getLoredeckCreatorLorecardsStageState: () => ({ status: 'locked', detail: 'Locked' }), titleDraftCount: () => 0,
  })(cached);
  assert.equal(model.pipeline, readinessPipeline); assert.equal(model.creatorCoverage, coverage);
  assert.equal(readinessCalls, 1); assert.equal(pipelineCalls, 0); assert.equal(coverageCalls, 0);
});

test('planning and Lorecards derive approved IDs once per card instead of once per title', () => {
  setup(); let calls = 0;
  cached.titleDrafts = Array.from({ length: 10 }, (_, index) => ({ titleId: `title-${index}`, title: `Title ${index}` }));
  creator.configureLoredeckCreatorPanel({ getLoredeckCreatorApprovedTitleIds: () => { calls++; return new Set(cached.titleDrafts.map(draft => draft.titleId)); } });
  creator.createLoredeckCreatorPlanningCard(cached.brief, cached); assert.equal(calls, 1);
  calls = 0; creator.createLoredeckCreatorEntryDraftCard(cached.brief, cached); assert.equal(calls, 1);
});

test('runtime fullscreen close routes through creator lifecycle disposal', () => {
  setup(); let disposed = 0;
  cardFactory = () => factoryDisclosure('runtime-close-resource', () => ({ element: new Element(), dispose() { disposed++; } }), { open: true });
  creator.openLoredeckCreatorWorkbench();
  const closeAll = privateRuntimeFunction('closeRuntimeFullscreenSurfaces', {
    closeLoreWorkbench() {}, closeLoredeckWorkbench() {}, closeContextWorkbench() {},
    closeLoredeckCreatorWorkbench: requireApi('closeLoredeckCreatorWorkbench'),
  });
  closeAll(); closeAll(); assert.equal(disposed, 1); assertNoDurableWork();
});

test('actual editor finalization fallback closes through creator disposal while retaining normal save/retirement counts', async () => {
  setup(); let disposed = 0; let saves = 0; let retirements = 0;
  cardFactory = () => factoryDisclosure('finalization-resource', () => ({ element: new Element(), dispose() { disposed++; } }), { open: true });
  creator.openLoredeckCreatorWorkbench();
  const pack = { packId: 'lazy-finalize-generated', type: 'generated', title: 'Lazy finalization', manifestData: { id: 'lazy-finalize-generated', type: 'generated' },
    entryOverrides: { accepted: { id: 'accepted', title: 'Accepted', category: 'knowledge', content: { fact: 'An accepted fact.' } } } };
  const noop = () => {};
  configureGeneratedLoredeckReadiness({ getLoredeckPendingChanges: () => [], getLoredeckAssistantDraftChanges: () => [],
    getLoredeckAssistantDraftCacheRecord: () => ({}), getLoredeckCreatorPipelineReadiness: () => ({ warnings: [], coverage: {} }), isLoredeckHealthStatusStale: () => false });
  configureLoredeckEditorActions({ getState: () => ({}), getLoredeckLibrary: () => [pack], getLoredeckDefinition: id => id === pack.packId ? pack : null,
    getFreshLoredeckLibraryPack: (_id, fallback) => fallback,
    validateLoredeckForEditor: async () => ({ health: { status: 'good', summary: { errorCount: 0, warningCount: 0 } } }),
    getLoredeckCreatorJobForPack: () => null, confirmAction: async () => true, createStateBackup: noop,
    upsertLoredeckLibraryPack: () => { saves++; return { ok: true }; },
    retireGeneratedLoredeckAfterFinalization: async () => { retirements++; return { ok: true }; },
    setLoredeckManifestPreviewCacheRecord: noop, selectLoredeckForDetails: noop, clearCanonLoreDatabaseCache: noop,
    clearContextIndexCache: noop, refreshLoredeckSurfaces: noop, openLoredeckMetadataEditor: noop, isLoredeckLibraryOpen: () => false, toast: noop,
    closeLoredeckCreatorWorkbenchOverlay: undefined,
  });
  const result = await finalizeGeneratedLoredeckAsCustom(pack);
  assert.ok(result, 'Normal finalization must still produce a Custom deck');
  assert.equal(saves, 1); assert.equal(retirements, 1); assert.equal(disposed, 1); assertNoDurableWork();
});
