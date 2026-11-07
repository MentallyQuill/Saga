# Saga Rendering Performance and Svelte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Library, Loredeck Workbench, and Deck Maker performance, including a production Svelte Lorecards view, with unchanged UI and functionality.

**Architecture:** Keep Saga's controllers, persistence, business rules, shell, themes, and public entrypoints. Mount a lazily loaded, precompiled Svelte view into the existing Loredeck Workbench Lorecards root and update it without rebuilding unrelated DOM. Apply the independent image, sorting, cloning, and disclosure changes through their existing owners.

**Tech Stack:** JavaScript ES modules, Svelte 5, Vite library mode, Sharp, Node assertion scripts, and Playwright. Proposed exact development versions were checked against official npm metadata on November 5, 2026: Node 24.16.x, Svelte 5.57.3, Vite 8.3.6, `@sveltejs/vite-plugin-svelte` 7.3.1, Sharp 0.35.5, Playwright 1.65.0. The plugin declares compatibility with the selected Svelte/Vite versions; actual installation/build validation remains an execution step.

**Spec:** [Saga Rendering Performance and Svelte Design](../specs/2026-11-05-rendering-performance-svelte-design.md).

**State:** Execution in progress. Initial implementations are committed, while final UI parity, first-use performance and integrated acceptance remain unfinished. Snippets below describe the original planned edits and tests; they do not certify final acceptance. Existing baseline: `1a92c708`; spec commit: `ed5123b0`.

**Review:** Independent review completed with no unresolved material findings. JavaScript/JSON snippets passed syntax validation; compiling Svelte and executing the proposed build/runtime tests remain implementation tasks.

The November 6 ownership experiment tested a native keyed table leaf inside the Svelte view. The bounded diagnostic exceeded the first-open budget in five of eight cases across the median and p95 checks. The alternative was rejected, and the testing build uses the initial Svelte row components. Both full matrices passed capture validation. The testing build exceeded the first-open budget and failed the exact visual comparison. [Table ownership amendment and result](../specs/2026-11-06-rendering-performance-svelte-ownership-amendment.md) · [Measured test results](../../development/SAGA_RENDERING_PERFORMANCE.md)

## Global Constraints

- “The initial Svelte surface is the **Lorecards view inside the Loredeck Workbench** opened for a deck from the Library.” Accepted/Pending Lorecard Workbench and Registries remain under their current renderers.
- “Preserve labels, tooltips, icons, ordering, row heights, spacing, typography, colors, borders, image crops, overflow, breakpoints, animations, and disabled/busy states.”
- “Do not introduce layout wrappers or new Svelte transitions.” Keep the actual existing host classes: `saga-lore-workbench-view saga-loredeck-workbench-view`.
- “Preserve the 500-row display cap and current limit message.” Selection still operates over all filtered non-draft rows, including those beyond the display cap.
- “Text edits save on blur; Enter blurs single-line inputs; Ctrl+Enter saves textareas; selects save immediately.” Keep validation, confirmations, overrides, disabled-ID removal, stale-health marking, and forced source reloads.
- “No Svelte runtime is imported by the extension's initial static dependency graph.” No CDN, browser compiler, dev server, duplicate Saga state module, or new product setting.
- “Compile the new boundary for Chrome/Edge 87, Firefox 83, and Safari 14.” Keep minimum SillyTavern `1.12.0`; this does not declare whole-app support for old browsers.
- “At least 20% lower median workbench selection update CPU time in the 500-row fixture.” Readiness and interaction p95 must satisfy the spec's greater-of-5%-and-2-ms regression rule outside baseline variability.
- “Commit the generated UI output and thumbnail assets so direct Git-based SillyTavern installation works without building.” Preserve current package scopes and direct `node tools/scripts/...mjs` invocation.
- Do not change storage/package schemas, canonical cover references, source originals, generation jobs, provider behavior, lore retrieval, or prompt injection. Do not replace save reloads with optimistic editing.
- GitHub operations, if execution later needs them, use `gh` with network permission enabled; expired authentication requires user reauthentication. This plan requires no remote publication.

## Review Focus

1. A save for deck A finishes while deck B is opening: persist A, but do not replace B's cache, status, editor, or pending source token. Pin this in Tasks 5 and 8.
2. More than 500 matches, a draft, and a range anchor outside the displayed slice: retain current logical selection and draft-exclusion semantics. Pin this in Tasks 5 and 8.
3. A dirty/composing editor receives unrelated status/filter/model updates: preserve input identity, text, caret, composition, and textarea scroll; submit the original deck/entry. Pin this in Tasks 6–8.
4. A tour or restored scroll targets a nested child of a closed Deck Maker section: materialize the correct section before lookup/measurement, without starting a generation job. Pin this in Task 4.
5. A portrait cover, custom duplicate, missing derivative, or renamed extension directory: select a sharp derivative only for the same canonical source and fall back original → existing monogram. Pin this in Task 3.

## File Structure and Ownership

All paths are relative to the repository root. Keep new modules focused; do not move unrelated controller/business code out of the large panel modules.

| Files | Responsibility / owner task |
| --- | --- |
| `package.json`, `package-lock.json`, `.gitignore` | Development-only dependencies and repeatable commands; Task 1 establishes these before parallel work |
| `tools/scripts/lib/saga-performance-harness.mjs`, `tools/scripts/capture-rendering-performance.mjs`, `tools/scripts/test-rendering-performance-report.mjs` | Browser runner, paired measurements, statistical comparison; Tasks 1 and 9 |
| `tests/browser/performance-fixtures.mjs` | Deterministic fixtures using real controllers/loaders; Task 1 |
| `tools/scripts/serve-visual-smoke.mjs` | Optional source/fixture roots, correct image MIME types, opt-in browser caching; Task 1 |
| `src/loredecks/loredeck-library-view.js`, `src/loredecks/loredeck-creator-generated-pack-cache.js` | Collator and lazy clone fallback; Task 2 |
| `tools/scripts/build-loredeck-thumbnails.mjs`, `src/loredecks/generated/loredeck-cover-thumbnails.js`, `assets/generated/loredeck-covers/` | Deterministic derivatives/lookup, keeping originals intact; Task 3 |
| `src/loredecks/loredeck-cover-image.js`, `src/ui/passive-image-size.js` | Cover source/policy, fit-aware sizing and observer disposal; Task 3 |
| `src/loredecks/loredeck-library-panel.js`, `src/loredecks/loredecks-tab-panel.js` | Existing cover visual callsites; Task 3 only |
| `src/loredecks/loredeck-creator-panel.js`, `src/runtime/lore-panel.js`, `src/runtime/runtime-guide-prep.js`, `src/runtime/runtime-composition.js`, `src/runtime/loredeck-editor-actions.js` | Lazy disclosures, anchor/tour preparation, render reuse, creator disposal; Task 4 |
| `src/loredecks/loredeck-workbench-view-model.js`, `src/loredecks/loredeck-workbench-view-lifetime.js` | Pure row projection and asynchronous ownership; Task 5 |
| `src/ui/loredeck-workbench/adapter.svelte.js`, `LorecardsView.svelte`, `LorecardRow.svelte`, `DetailLeaf.svelte`, `imperative-leaf.js` in that same directory | Compiled view, adapter, and isolated existing-editor leaves; Task 6 |
| `src/ui/runtime-ui-kit.js`, `tools/scripts/test-runtime-tooltip-lifecycle.mjs` | Managed tooltip API retaining existing API behavior; Task 6 |
| `vite.saga-ui.config.mjs`, `tools/scripts/check-saga-ui-generated.mjs`, `src/ui/generated/workbench/` | Dedicated self-contained UI bundle and artifact verification; Task 6 |
| `src/loredecks/loredeck-workbench-panel.js` | Stable shell, action binding, editor ownership, guarded loads and mount/dispose integration; Task 7 |
| `tools/scripts/test-loredeck-workbench-browser-parity.mjs`, `tools/scripts/test-loredeck-workbench-view-model.mjs`, `tools/scripts/test-loredeck-workbench-view-lifetime.mjs`, `tools/scripts/test-loredeck-workbench-svelte-adapter.mjs`, `tools/scripts/test-loredeck-cover-image.mjs`, `tools/scripts/test-loredeck-creator-lazy-disclosures.mjs` | Focused ownership, image, disclosure, adapter and behavioral tests; respective Tasks 3–8 |
| `.github/workflows/saga-ui-check.yml`, `tools/scripts/run-alpha-gate.mjs`, `docs/development/SAGA_RENDERING_PERFORMANCE.md`, `docs/development/SCRIPTS_GUIDE.md` | Build/regression integration and measured release evidence; Task 9 |

Task dependency order: **1 → {2, 3, 4, 5}; 5 → 6 → 7 → 8; {2, 3, 4, 8} → 9**. Tasks 2–5 may run independently after baseline capture. Task 2 owns only the cache module and its tests, so it does not conflict with Task 4's `lore-panel.js` edits. Serialize shared gate/document/package updates in Task 9; use explicit ownership if delegating.

## Task 1: Capture a Reproducible Browser Baseline

**Files:** Create the development package/lockfile, performance runner/fixtures/report test above. Modify `.gitignore` and `serve-visual-smoke.mjs`. No production rendering changes.

**Interfaces:** `startSagaPerformanceHarness({ sourceRoot, fixtureRoot, browserName, viewport, deviceScaleFactor, cpuRate, cacheMode })` returns `{ page, browserVersion, stop() }`. `installSagaPerformanceFixture(options)` in the browser fixture module seeds real library/workbench records and returns `{ openLibrary(), openWorkbench(packId), openCreator(), packs, persistenceCalls }`. Options include `deckCount`, `entryCount`, `type`, and a recorded `coverPool`. Fixtures must use real loader/controller APIs; do not bypass rendering by injecting finished DOM.

- [ ] **Step 1:** Add pinned development tooling and generate the lockfile. Leave the root package without a `type` field, preserving existing scopes. Start from this manifest and add the later task commands when their files exist:

```json
{
  "name": "saga-development",
  "private": true,
  "engines": { "node": ">=24.16.0 <25" },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "7.3.1",
    "playwright": "1.65.0",
    "sharp": "0.35.5",
    "svelte": "5.57.3",
    "vite": "8.3.6"
  }
}
```

Run `npm install --package-lock-only`, then `npm ci`. Ignore `node_modules/` and temporary capture directories; keep shipping output tracked. This tooling is for development only, not an extension startup dependency.

- [ ] **Step 2:** Write runner/report tests before the collector. Require finite nonnegative durations/bytes, exact fixture/browser/cache metadata, and rejection of mismatched fixture/viewport/DPR/browser records. Expected initial result: the new modules/exports are missing. Add a test that a no-store fixture server cannot be labeled a warm-cache run.
- [ ] **Step 3:** Implement optional `--source-root` and `/__performance/` fixture routing in the server, preserving its default root/no-store behavior. Add WebP/JPEG MIME types and an opt-in browser-cache mode used identically for baseline/candidate. Resolve and validate paths under their designated roots. Route only the performance fixture prefix to `fixtureRoot`; serve app modules/assets from `sourceRoot`.
- [ ] **Step 4:** Implement captures for actual 77-deck covers, 1,000 decks with a recorded cover pool, and 100/500/600-entry workbenches. Seed custom virtual decks through `manifestData`/`entryOverrides` and real `loadLoredeckSourceById`; include generated/bundled and error fixtures for parity. Gate source HTTP responses with Playwright routes for later race tests. Capture the current >500 selection semantics before migration.
- [ ] **Step 5:** Record main-thread task CPU separately from end-to-end latency. For Chromium, use CDP cumulative task metrics around the same interaction in each build:

```js
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
const readMetrics = async () => Object.fromEntries(
  (await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]),
);
const rows = page.locator('.saga-loredeck-workbench-entry-row');
const targetIndex = await rows.evaluateAll(nodes =>
  nodes[0].classList.contains('saga-lore-workbench-row-active') ? 1 : 0);
const target = rows.nth(targetIndex);
assert.equal(await target.evaluate(node =>
  node.classList.contains('saga-lore-workbench-row-active')), false);
const before = await readMetrics();
await target.click();
await page.evaluate(() => new Promise(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))));
const after = await readMetrics();
const selectionCpuMs = (after.TaskDuration - before.TaskDuration) * 1000;
assert.equal(await target.evaluate(node =>
  node.classList.contains('saga-lore-workbench-row-active')), true);
```

Alternate distinct selected entries on every measured warm interaction and record their before/after IDs; reject no-op samples rather than averaging repeated clicks on an already selected row. Also collect click/input-to-next-paint elapsed time, mutations, long tasks, resource/network bytes, unique image URLs, and first-open readiness. CDP is a Chromium metric path; use cross-engine interaction/visual checks elsewhere and label unavailable CPU metrics honestly.

- [ ] **Step 6:** Capture baseline from `1a92c708` using a separate read-only checkout/archive and candidate-owned harness. Example runner contract: `node tools/scripts/capture-rendering-performance.mjs --source-root F:/git/Saga-baseline --fixture-root F:/git/Saga/tests/browser --output .tmp/saga-performance/baseline --warm-runs 30 --cold-runs 20`. The executor chooses an available checkout path and creates isolation through the worktree workflow. Record normal/4x CPU and desktop/phone runs, plus tablet visual references; do not claim real iOS testing from a desktop viewport.
- [ ] **Step 7:** Run the report tests, fixture smoke, and existing `test-loredeck-library-browser-performance.mjs`. Save baseline screenshots/JSON with hashes and environment metadata before Task 2 onward changes production code. Commit as `test: capture rendering performance baseline`.

## Task 2: Remove Repeated Sorting Setup and Duplicate Clones

**Files:** Modify `loredeck-library-view.js`, `loredeck-creator-generated-pack-cache.js`, and their existing performance/cache tests.

**Interfaces:** Existing public comparator and cache-controller APIs remain unchanged. Later tasks consume the same API.

- [ ] **Step 1:** Add the meaningful failing clone regression below to `test-loredeck-creator-generated-pack-cache.mjs`. It distinguishes an injected clone from an accidentally evaluated fallback without changing defensive-copy behavior:

```js
let injectedCalls = 0;
let fallbackSerializations = 0;
const pack = {
  packId: 'generated-clone',
  payloadFile: 'generated-clone.v1.json',
  entryOverrides: { nami: { title: 'Nami' } },
  toJSON() { fallbackSerializations++; return { packId: this.packId }; },
};
const controller = createLoredeckCreatorGeneratedPackCacheController({
  getLoredeckDefinition: () => ({ packId: pack.packId }),
  hydrateCachedPayload: () => pack,
  cloneJson: value => { injectedCalls++; return { ...value }; },
});
controller.getGeneratedPackDefinition(pack.packId);
assert.equal(injectedCalls, 1);
assert.equal(fallbackSerializations, 0);
```

Run `node tools/scripts/test-loredeck-creator-generated-pack-cache.mjs`; expect failure at the fallback count. Preserve the existing independent deep-copy/isolation tests; the shallow test clone above is intentional only for counting the unused fallback.

- [ ] **Step 2:** Add comparator oracle cases for empty values, numbered/case/accented titles, equal-title ID ties, core/manual/folder ordering. These parity cases may already pass; record the Task 1 baseline sorting cost rather than inventing an unstable timing assertion.
- [ ] **Step 3:** Apply these exact small replacements, leaving all caller/tie-breaker behavior intact:

```js
// loredeck-library-view.js, module scope
const libraryTitleCollator = new Intl.Collator(undefined, {
  numeric: true, sensitivity: 'base',
});
export function compareLoredeckLibraryTitles(a = '', b = '') {
  return libraryTitleCollator.compare(String(a || ''), String(b || ''));
}

// Inside createLoredeckCreatorGeneratedPackCacheController
const cloneJson = value => typeof deps.cloneJson === 'function'
  ? deps.cloneJson(value)
  : cloneJsonFallback(value);
```

- [ ] **Step 4:** Run the two modified suites plus `test-loredeck-library-folders.mjs` and `test-loredeck-creator-workbench-cache.mjs`. Require existing fallback cloning, revision invalidation, and hydration deduplication tests to pass. Commit as `perf: reuse sorting and avoid duplicate clones`.

## Task 3: Reduce Cover Transfer Without Changing Images or Layout

**Files:** Create thumbnail builder/generated output, `loredeck-cover-image.js`, `passive-image-size.js`, and `test-loredeck-cover-image.mjs`. Modify the Library visual helper/folder strips, the project shelf callsite in `loredecks-tab-panel.js`, and the development server MIME support from Task 1 if needed.

**Interfaces:** `getLoredeckCoverSources(pack, { usage, box, dpr }) → { src, originalSrc }`, where `usage` is `list` or `detail` and `box` is `{ width, height }` in CSS pixels. `observePassiveImageSize(element, onSize) → dispose()` reports actual box dimensions and releases its subscription on explicit disposal or disconnected-node cleanup. `bindLoredeckCoverImage(visual, img, pack, options) → dispose()` owns size observation, source changes, and error fallback; `options.onOriginalError()` calls the existing monogram/action restoration. Move the existing passive `resolveLoredeckAssetPath`/`getLoredeckAssetRef` implementation into this helper and re-export `getLoredeckAssetRef` from the Library panel for existing callers; the helper must not import its panel owner and create a dependency cycle.

- [ ] **Step 1:** Add failing source-policy tests: same canonical bundled image shared by a Custom duplicate; distinct `assets/cover.png` paths from different decks; data/custom/remote sources; DPR 1/2/3; portrait/landscape `contain` and `cover`; renamed/nested extension directories; unknown or missing derivatives; explicit detail usage. Require no mutations to serialized pack/export fields.
- [ ] **Step 2:** Build aspect-preserving 128/256-long-edge derivatives from the 70 unique referenced originals, sorted by original path. Start with lossless WebP, no pre-crop, no metadata/timestamps; record actual width/height and hashes. Keep originals untouched. The builder emits `BUNDLED_COVER_THUMBNAILS` keyed by repository-relative original path and accepts `--output-root` for verification builds. Compare visual quality/bytes before accepting an encoding.
- [ ] **Step 3:** Resolve lookup keys with Saga's existing asset resolver, not pack ID or raw `assets/cover.png`. A fit-aware choice can use this calculation after resolving the original cover through `getLoredeckAssetRef`:

```js
function coversBox(variant, box, dpr, fit = 'cover') {
  const requiredScale = fit === 'contain'
    ? Math.min(box.width / variant.width, box.height / variant.height)
    : Math.max(box.width / variant.width, box.height / variant.height);
  return requiredScale * dpr <= 1;
}

const variantsByOriginalSrc = new Map(
  Object.entries(BUNDLED_COVER_THUMBNAILS).map(([path, variants]) => [
    getAssetSrc({ path }), variants,
  ]),
);
```

Sort candidates by encoded bytes, select one with enough physical pixels for the actual box/DPR, and use the original if none qualifies or usage is `detail`. Preserve aspect, crop, focal point, alt/title, and existing dimensions. An unknown source simply misses the derived lookup.

- [ ] **Step 4:** Set image hints before assigning any source and retain the two-stage failure path. Inside the existing visual helper, the policy must have this behavior:

```js
const { src, originalSrc } = getLoredeckCoverSources(pack, policy);
img.loading = policy.usage === 'detail' ? 'eager' : 'lazy';
img.decoding = 'async';
let usingDerivative = src !== originalSrc;
img.addEventListener('error', () => {
  if (usingDerivative) {
    usingDerivative = false;
    img.removeAttribute('srcset');
    img.src = originalSrc;
    return;
  }
  setLoredeckDeckVisualFallback(visual, pack);
  if (coverActions) visual.appendChild(coverActions);
});
img.src = src;
```

The production binding also prevents repeated terminal fallback. Do not use `{ once: true }` for both error stages, preflight `fetch`, or a hidden `Image()` that eagerly downloads all covers.

- [ ] **Step 5:** Use a shared ResizeObserver service for list/collage box sizes, with a shared disconnected-node cleanup observer and idempotent subscription disposal. Assign the first list source from its initial nonzero size delivery, avoiding an original download before choosing a derivative. Re-evaluate on responsive changes/DPR changes and upgrade resolution when needed. Keep detail loading immediate. Verify zero-size/closed folders do not force requests and removed cards do not remain subscribed. Observer scheduling must not add a new visible placeholder or layout delay.
- [ ] **Step 6:** Make every shared visual callsite explicit: mobile reorder, library deck card, stack card, and project shelf use list policy; selected detail and metadata-editor heading use detail/original. Folder collages use list policy even when contained in a detail panel. Preserve all cover-edit and long-press paths.
- [ ] **Step 7:** Run focused cover tests, image-backed browser cases, existing library performance/folder/transfer tests, and package roundtrips if resolution code changes. Require derivative → original → monogram tests, source-before-hints ordering checks, no new layout wrappers, sharp phone images at DPR 3, and lower cold transfer with no repeatable visible difference. Commit source, derived assets, and lookup as `perf: load appropriately sized loredeck covers`.

## Task 4: Materialize Deck Maker Disclosures Only When Needed

**Files:** Modify the creator/runtime/guide/editor-action owners in the file map. Create `test-loredeck-creator-lazy-disclosures.mjs`.

**Interfaces:** Extend `createLoredeckCreatorArtifactDisclosure(title, childOrFactory, options = {})`; factory returns a Node or `{ element, dispose() }`. Add `materializeLoredeckCreatorDisclosure(details)`, `disposeLoredeckCreatorDisclosureChildren(root)`, `prepareLoredeckCreatorTourTarget(targetName)`, and idempotent `closeLoredeckCreatorWorkbench()`. Keep the existing Node argument valid. Pass optional `{ cached, pipeline }` to `createLoredeckCreatorCard(state, options)` for render-scoped reuse.

- [ ] **Step 1:** Add failing tests with factory/disposal counters: closed = 0, first open = 1, later toggle = 1 and same editor node; remembered-open materializes immediately; delayed opening reads fresh cache. Test nested `finalize`/`brief-review`/`context-tags`, coverage navigation, tour preparation, nested scroll restoration, replacement, and runtime/finalization close. Durable job/provider invocation counts must remain unchanged.
- [ ] **Step 2:** Store per-disclosure handles in a WeakMap. A small body for the factory path is:

```js
let handle = null;
const materialize = () => {
  if (handle) return handle.element;
  const result = typeof childOrFactory === 'function'
    ? childOrFactory() : childOrFactory;
  handle = result?.element ? result : { element: result, dispose() {} };
  if (handle.element) details.appendChild(handle.element);
  return handle.element;
};
details.addEventListener('toggle', () => {
  if (details.open) materialize();
});
if (details.open) materialize();
```

Retain summary creation, classes, remembered-state click/keydown/toggle bookkeeping, and error presentation. A failed factory must not mark itself successfully mounted. Store disposal and materialization operations in the WeakMap; do not introduce wrapper elements or long-lived cached pipeline models.

- [ ] **Step 3:** Convert every artifact call in `createLoredeckCreatorCard`: coverage, brief, outline, titles, context, Pending Review, Lorecards, and health/finalize. Factories read `getLoredeckCreatorBriefCache()` when invoked and derive one current render context. Replace the eager Pending Review existence probe with its equivalent cheap model predicate; do not call a child factory just to decide whether to show its disclosure.
- [ ] **Step 4:** Before setting scroll positions, measuring, or finding nested targets, open/materialize the owning disclosure synchronously and then re-query the requested child. Add aliases `finalize → deck-health`, `brief-review → scope-brief`, `context-tags → context-plan`; direct disclosure anchors include `coverage-plan`, `story-outline`, `title-sets`, `review-queue`, and `lorecards`. Do not depend on the later asynchronous native `toggle` event.
- [ ] **Step 5:** Inject `prepareLoredeckCreatorTourTarget` through `runtime-composition.js` into guide preparation. Call it after both creator-open/project-open paths and before tour target lookup. Map existing `markTourTarget` suffix groups: brief → scope; outline → outline; titlePass/titleActions/title generation/approval/revision targets → titles; planning/planningActions/planContextTags → context; review → review queue; entries/entryActions/draft/review/send targets → Lorecards; readiness/health/finalize/openCoveragePlan → health. Enumerate the actual target names from current source in the test, so newly absent targets cannot silently pass.
- [ ] **Step 6:** Materialize restored open disclosures before restoring nested paths/anchors. Dispose children before creator body replacement and route raw creator-overlay removals through `closeLoredeckCreatorWorkbench`: previous open, backdrop/Close, `closeRuntimeFullscreenSurfaces`, and editor finalization fallback. Release view-owned frames/tooltips; do not stop the generation progress controller or storage work.
- [ ] **Step 7:** Pass the same `{ cached, pipeline }` from creator open/refresh into header and card; hoist `getLoredeckCreatorApprovedTitleIds(cached)` out of each draft filter predicate. A deferred opening obtains a new context. Reuse readiness/coverage only when sourced from the same render; keep standalone fallbacks. Test model call counts rather than adding a global cache.
- [ ] **Step 8:** Run the new disclosure test and existing creator coverage, current-task, auto-draft, stage-reset, planning-recovery, workflow-composition, cache, and visual-smoke suites. Exercise closed-stage tours and active generation on phone/desktop. Commit as `perf: defer collapsed Deck Maker rendering`.

## Task 5: Define Stable View Models and Request Ownership

**Files:** Create `loredeck-workbench-view-model.js`, `loredeck-workbench-view-lifetime.js`, and the two corresponding Node test scripts. No Svelte imports or controller changes yet.

**Interfaces:** `createLoredeckWorkbenchViewModel(input, previous = null)` consumes `{ pack, packId, filteredRows, selectedEntryId, selectedIds, editable, cacheStatus, error, query, filters, sourceRevision, getCells }` and returns those fields plus `logicalRows`, `logicalIds`, `displayRows`, `headerChecked`, and `selectedRow`. `filters` is `{ relevance, category, status }` using current filter values; `cacheStatus` retains the current controller's source-load status. `sourceRevision` increments only when an active source result is published. A display descriptor is `{ key, row, active, checked, cells }`; `row` is the existing normalized source row. `getCells(row)` is the controller's pure presentation callback returning the existing four `{ text, subText }` cells with its current category/relevance fallback rules. Lifetime API: `open(packId)`, `invalidateView()`, `close()`, `captureSession()`, `isSessionCurrent(token)`, `captureView(host)`, `isViewCurrent(token)`, `beginSource(packId, ownerSession?)`, `isSourceCurrent(token)`.

- [ ] **Step 1:** Add failing projection tests with 600 rows plus a draft, independently asserting 500 displayed rows, all filtered non-draft logical IDs, unchanged references, and deck/kind-scoped keys. Include a source row and draft sharing an ID: the current duplicate-ID validation state must render without duplicate Svelte keys. Add stale-import/load/close/tab and same-pack reopen tests. Crucially:

```js
const life = createLoredeckWorkbenchViewLifetime();
life.open('deck-a');
const oldOwner = life.captureSession();
const oldLoad = life.beginSource('deck-a');
life.open('deck-b');
const currentLoad = life.beginSource('deck-b');
assert.equal(life.beginSource('deck-a', oldOwner), null);
assert.equal(life.isSourceCurrent(oldLoad), false);
assert.equal(life.isSourceCurrent(currentLoad), true);
life.close();
assert.equal(life.isSourceCurrent(currentLoad), false);
life.open('deck-a');
const reopenedLoad = life.beginSource('deck-a');
assert.equal(life.isSessionCurrent(oldOwner), false);
assert.equal(life.beginSource('deck-a', oldOwner), null);
assert.equal(life.isSourceCurrent(reopenedLoad), true);
```

- [ ] **Step 2:** Run both new scripts; expect missing module/export failures. Implement separate session, view, and source-request identities: tab switches invalidate view work without invalidating an active-deck source load. `captureSession()` returns `{ packId, session }` or null; `isSessionCurrent` ignores tab/host and checks the open session. `beginSource` defaults its owner to the current session, but returns null without incrementing the request sequence for an inactive pack or explicitly stale owner, including the same pack reopened later.
- [ ] **Step 3:** Use this stable projection algorithm, supplementing it with the declared snapshot fields/header/selected-row outputs:

```js
const prior = new Map((previous?.displayRows || []).map(item => [item.key, item]));
const selected = new Set(input.selectedIds);
const logicalIds = input.filteredRows.filter(row => row.id && !row.draft)
  .map(row => row.id);
const displayRows = input.filteredRows.slice(0, 500).map(row => {
  const key = JSON.stringify([input.packId, row.draft ? 'draft' : 'entry', row.id]);
  const active = row.id === input.selectedEntryId;
  const checked = !row.draft && selected.has(row.id);
  const old = prior.get(key);
  const cells = old?.row === row ? old.cells : input.getCells(row);
  return old?.row === row && old.active === active && old.checked === checked
    ? old : { key, row, active, checked, cells };
});
```

Never infer the logical domain from rendered nodes. Do not normalize or deep-clone entries in projection. If input rows change in place during a real mutation, the controller must supply a replacement row/reference or explicit revision; shallow identity is not a mutation detector.
- [ ] **Step 4:** Require the two tests to pass, including that a status-only update preserves every display descriptor and a selection update changes only the previous/new active descriptors. Commit as `refactor: define workbench view ownership`.

## Task 6: Build the Svelte View and Reuse Existing Editor Primitives

Execution follow-up: if the controlled table alternative is promoted, replace the per-row compiled rendering in this task with the ownership amendment's isolated keyed-table helper. Keep `mount(target, snapshot, actions)`, `update(snapshot)` and idempotent `dispose()` unchanged. The helper uses the existing descriptor keys and header factory, reuses row/cell/checkbox nodes, initializes tooltips in the real connected ancestry, and disposes resources before removal. It owns no canonical state or business logic. Preserve the original error-once, raw-source, pending-work, generated-build and compatibility gates; update focused tests with equivalent or stronger behavior evidence. No partial timing result completes this task's final acceptance.

**Files:** Create the Svelte/leaf/build files in the map and the adapter test. Modify `runtime-ui-kit.js` for managed tooltips and add its lifecycle test. The production controller is connected in Task 7.

**Interfaces:** Compiled entry exports `mount(target, snapshot, actions) → { update(snapshot), dispose() }`. `snapshot` is the complete Task 5 output. `actions` provides `inspectRow(id, event)`, `toggleRow(id, event)`, `toggleHeader(event)`, `setQuery(value)`, `setFilter(name, value)`, `onError(error)`, a managed `tooltip(node, text)` Svelte action, and `mountControls`, `mountBulkToolbar`, `mountTableHeader`, `mountDetail` leaf factories. Each factory takes `(node, snapshot)` and returns `{ update(snapshot), dispose() }`; it owns that host's children only. Bulk controls bind the existing controller operations inside their factory. All factories read the current passed snapshot or a maintained current-snapshot pointer, never a stale initial closure. Their implementations remain in the controller/UI helper layer and arrive in Task 7; adapter fixtures provide test implementations now.

- [ ] **Step 1:** Write browser adapter tests before the component: mount/refresh retains host/unaffected-row identity; no remount on status updates; dispose twice releases one instance; a rendering/action failure reaches `onError` once; leaf cleanup runs before host removal. Managed-tooltip tests require one listener set per element, text updates without listener growth, and no retained active anchor on dispose. Run new tests; expect missing exports/generated bundle.
- [ ] **Step 2:** Add `createManagedTooltip(element, text, options = {}) → { update(text), dispose() }` sharing current floating-tooltip internals. Keep `addTooltip`'s element-returning API and mobile/select behavior. Make repeated `addTooltip` calls reuse managed registration, and expose `disposeRuntimeTooltips(root)` for isolated leaf cleanup. Guard pending tooltip animation frames against a disposed/disconnected anchor.
- [ ] **Step 3:** Implement the compiled raw-state adapter. This is real Svelte 5 module syntax; it belongs in `.svelte.js` and goes through the compiler:

```js
import { flushSync, mount as mountComponent, unmount } from 'svelte';
import LorecardsView from './LorecardsView.svelte';

export function mount(target, snapshot, actions) {
  let current = $state.raw(snapshot);
  let component = null;
  let disposed = false;
  const bridge = { get snapshot() { return current; } };
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (component) void unmount(component, { outro: false }).catch(actions.onError);
    component = null;
    current = null;
  }
  try {
    component = mountComponent(LorecardsView, {
      target, props: { bridge, actions }, intro: false,
    });
    flushSync();
  } catch (error) { dispose(); throw error; }
  return {
    update(next) { if (!disposed) flushSync(() => { current = next; }); },
    dispose,
  };
}
```

Verify synchronous no-outro cleanup with the pinned runtime in the adapter test. Read `bridge.snapshot` reactively inside components; do not destructure it once into a permanently stale local. Catch asynchronous/action errors separately; rendering boundaries do not catch those.

- [ ] **Step 4:** Port exact existing controls/toolbar/header/row/detail layout into the view, keeping imperative leaf containers where that preserves custom dropdown/editor behavior. The rows use the model from Task 5:

```svelte
<script>
  import LorecardRow from './LorecardRow.svelte';
  let { bridge, actions } = $props();
</script>

{#each bridge.snapshot.displayRows as descriptor (descriptor.key)}
  <LorecardRow {descriptor} {actions} editable={bridge.snapshot.editable} />
{/each}
```

This fragment belongs inside the existing table structure, following its existing header and preceding the unchanged empty/limit message; it is not the entire screen. `LorecardRow` emits the existing button/cell/span hierarchy and class names, including draft/disabled/active/checked styling. Preserve current copy and exact custom dropdown markup; do not substitute a native select. No extra root/wrapper/style blocks/transitions.

- [ ] **Step 5:** Implement `imperativeLeaf(node, descriptor)` with descriptor `{ key, model, mount }`; on same-key updates call the existing handle's `update`, and only dispose/remount when owner key changes. Detail key includes deck ID, entry ID, and draft/editable mode, never save status. `DetailLeaf.svelte` emits the current detail root; the action owns only its children. Avoid rebuilding controls while typing or a menu is open.
- [ ] **Step 6:** Add this dedicated library build, with all application services passed through actions rather than imported into the bundle:

```js
// vite.saga-ui.config.mjs
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [svelte({ compilerOptions: { dev: false } })],
  build: {
    target: ['chrome87', 'edge87', 'firefox83', 'safari14'],
    outDir: 'src/ui/generated/workbench',
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: fileURLToPath(new URL('./src/ui/loredeck-workbench/adapter.svelte.js', import.meta.url)),
      formats: ['es'],
      fileName: () => 'view.js',
    },
  },
});
```

Use this dedicated output directory only; do not empty the parent `src/ui/generated` or any application/assets directory. Require one self-contained entry with no external imports, dynamic application chunks, emitted component CSS, or compiler/dev code. Retain bundled dependency license notices.

- [ ] **Step 7:** Add `build:ui`, `build:thumbnails`, and `check:generated` npm scripts invoking the declared config/builders/checker. Freshness checking rebuilds UI/thumbnails under a temporary root, compares exact generated file sets/bytes with tracked output, then removes only its validated temporary directory. Do not rebuild tracked files and call a now-clean diff “fresh.” Reject stale extra artifacts as well as missing/different files.
- [ ] **Step 8:** Run build, adapter/tooltip tests, and freshness check; inspect output for bare imports, absolute paths, duplicate state-manager code, and CSS. Commit source and generated UI as `build: add bounded Svelte workbench view`.

## Task 7: Connect Stable Rendering and Guard the Existing Controller

**Files:** Modify `src/loredecks/loredeck-workbench-panel.js`; preserve dependency injection/public hooks in `loredeck-workflow-composition.js`. Test through adapter/model/lifetime scripts and Task 8 browser assertions.

**Interfaces:** Consume Tasks 5/6 exactly. Keep public `configureLoredeckWorkbenchPanel`, `openLoredeckWorkbench`, `closeLoredeckWorkbench`, `refreshLoredeckWorkbench`. Implement controller-side leaf factories from Task 6, and add disposers to existing autosave/draft listener-wiring helpers. Keep business operations authoritative in this module.

- [ ] **Step 1:** Add failing integration assertions for preserved shell/table/search/editor nodes; query/relevance/category persistence and exact per-open resets; late import/load after close; registry tab transitions; draft buffers; and old-deck save completion during a new load. Task 8 fills out the matrix, but these regressions must exist before changing the controller.
- [ ] **Step 2:** Split shell creation from refreshing. Only `openLoredeckWorkbench` creates an overlay and starts a lifetime session. `renderLoredeckWorkbench` returns when closed, updates the existing header/tab counters, derives filtered rows once, and updates/mounts the appropriate active view. Change `reconcileLoredeckWorkbenchBulkSelection(rows = getFilteredLoredeckWorkbenchRows())` to consume that same derived collection. Cache one normalized draft row on its owner until the draft changes.
- [ ] **Step 3:** Lazy-import the compiled entry and deduplicate the pending mount. The integration follows this guarded shape inside the controller:

```js
let viewModulePromise = null;
const loadViewModule = () => {
  if (!viewModulePromise) {
    viewModulePromise = import('../ui/generated/workbench/view.js')
      .catch(error => { viewModulePromise = null; throw error; });
  }
  return viewModulePromise;
};

async function mountLorecardsView(host, getSnapshot, actions, lifetime) {
  const token = lifetime.captureView(host);
  const module = await loadViewModule();
  if (!lifetime.isViewCurrent(token) || loredeckWorkbenchActiveTab !== 'lorecards') return null;
  return module.mount(host, getSnapshot(), actions);
}
```

Attach only one continuation per current host/token. While waiting, retain the existing shell/loading presentation; on completion mount the latest snapshot, not an earlier captured snapshot. Catch import/mount/update failures once using current error helpers, leaving Close usable. Do not replay actions during recovery.

- [ ] **Step 4:** Reuse current row/select/bulk handlers, passing `model.logicalRows` for all selection operations. Capture target pack, selected IDs, row map, and `lifetime.captureSession()` when an operation starts, before confirmation awaits. Persist/reload the original pack after confirmation, but gate every later write to global save status, bulk selection, range anchor, selected entry, or draft buffers with `isSessionCurrent(owner)`. Guard both A→B and same-pack close/reopen; captured payload data alone does not protect completion effects. Always pass the captured pack ID to operation statuses, and pass the captured owner as `options.viewOwner` to the post-operation source reload. This rule applies to field/draft saves as well as bulk edit/delete/duplicate. Preserve busy/confirmation behavior and exactly-once persistence.
- [ ] **Step 5:** Make editor/autosave leaves retain their form and explicit buffers during same-owner updates. Reuse `createLoredeckWorkbenchEditableDetail`/current field builders; move their contents into the same detail root rather than nesting another root. Listener wiring returns cleanup functions. Continue collecting form fields synchronously before the first `await` in `saveLoredeckWorkbenchEntryFields`; capture original pack/entry/value on submit. Dirty/save status updates target a JS-owned header chip or view props, never both systems writing the same node.
- [ ] **Step 6:** Guard `loadLoredeckWorkbenchRows` before every active-cache/error/status publication. Call `lifetime.beginSource(packId, options.viewOwner)` before changing visible loading state; null means an inactive/stale-owner reload may still execute and return source rows but cannot publish into the current view or invalidate its pending load. Build local rows using the captured source/pack ID, not the current global deck. A stale token cannot overwrite cache, toast a current-deck load error, or invoke an overlay-creating render. The old save must still persist and perform its real source reload.
- [ ] **Step 7:** On tab change invalidate view work/dispose the component before replacing its host; keep active-deck source loads separate. On close invalidate lifetime/pending-mount identity, cancel view-owned animation frames, dispose leaves/tooltips/component, then remove overlay. Existing `closeRuntimeFullscreenSurfaces` already calls the public close hook: preserve that route. Focus only on actual opening or an explicit draft-focus action, not every update.
- [ ] **Step 8:** Run focused ownership/adapter/composition tests and initial browser integration. Replace source-string assertions expecting exactly two `preserveInputFocusAfterRender` calls only when node/caret/composition behavior tests cover the retained-input path. Preserve shared-primitive, Basic guard, busy, scroll, and public-hook assertions. Commit as `perf: retain workbench views across updates`.

## Task 8: Prove UI and Editing Parity in the Browser

**Files:** Create `test-loredeck-workbench-browser-parity.mjs`; extend Task 1 fixtures. Modify relevant ownership-sensitive assertions in `test-search-focus-preservation.mjs` and `test-visual-smoke-harness.mjs` alongside replacement behavior tests.

**Interfaces:** Use existing public controller APIs and Task 1 fixtures; tests may record in-page node references, but must not require new user-facing controls or production test-only rendering branches.

- [ ] **Step 1:** Add behavior cases for every Review Focus item before relaxing any source-contract assertions. An essential retained-input check uses the existing selector:

```js
const search = page.locator('#saga-loredeck-workbench .saga-lore-workbench-search');
await search.fill('Deck');
await search.evaluate(input => {
  window.previousWorkbenchSearch = input;
  input.focus();
  input.setSelectionRange(1, 3, 'forward');
});
await page.evaluate(async () => {
  const panel = await import('/src/loredecks/loredeck-workbench-panel.js');
  panel.refreshLoredeckWorkbench();
});
assert.equal(await search.evaluate(input => input === window.previousWorkbenchSearch), true);
assert.deepEqual(await search.evaluate(input => [input.selectionStart, input.selectionEnd]), [1, 3]);
```

Use the text-compatible editor/search behavior actually supported by the browser; if the search input type does not support selection ranges in a tested engine, perform the caret assertion on a text editor and retain the search identity/focus assertion. Test IME via real composition events without a synthetic update overwriting the user's composition buffer.

- [ ] **Step 2:** Exercise 600 filtered entries plus a draft, a source row sharing the draft's ID, Ctrl/Meta/Shift, header selection, filters removing selected entries, source reload, same-pack reopen, different-pack reset, and row-reference preservation. Count selected logical IDs via existing UI outcomes/fixture state, not only 500 checked DOM nodes.
- [ ] **Step 3:** Cover bundled read-only, Custom/Generated editing, every existing field, blur/Enter/Ctrl+Enter/select timing, draft validation/cancel/create, save failure/retry, source reload, override/disabled/health effects, and confirmations during deck changes. Defer a bulk edit/delete/duplicate confirmation on A, open B with shared entry IDs and a dirty selected editor, then confirm: only A's persisted payload changes; B's selection/buffer/status and pending load remain intact. Repeat with the same pack closed/reopened to verify session identity. Assert persistence payloads and action counts. Include close/reopen/tab/experience changes during deferred imports/source responses/saves and repeated disposal.
- [ ] **Step 4:** Pair screenshots and geometry/style captures with Task 1 baselines at desktop `1440×900`, tablet `768×1024`, and phone `430×820`, plus phone DPR 3. Cover default/custom themes, custom icons, error/loading/empty states, bulk/draft/editor states, and creator disclosures/tours. Wait for fonts/images and stable layout; do not mask labels, fields, covers, or structural differences. Document rasterization noise without broadening thresholds to hide visible differences.
- [ ] **Step 5:** Run Chromium browser parity, Firefox/WebKit engine checks, and real Android/iOS/desktop Safari smoke where available. Playwright WebKit is useful engine coverage, not evidence of a real Safari/device run. Record unavailable checks explicitly; candidate-only compatibility failures remain blockers. Commit as `test: verify Svelte workbench UI parity`.

## Task 9: Integrate Build Checks and Record Measured Acceptance

**Files:** Create `.github/workflows/saga-ui-check.yml`, update alpha gate/development docs, and finalize performance report evaluator from Task 1. Keep the existing Loredeck Builder workflow focused on its current purpose.

**Interfaces:** `evaluateRenderingPerformance(baseline, candidate)` returns `{ status: 'pass' | 'fail' | 'inconclusive', findings }`. Inconclusive measurements are not a pass. It validates identical environments/fixtures before comparing gains/regressions and uses the recorded baseline variability.

- [ ] **Step 1:** Add failing report tests: <20% median selection CPU gain fails; readiness/p95 beyond `max(5% of baseline, 2 ms)` outside baseline variability fails; a confidence interval straddling the bound is inconclusive; mismatched viewport/browser/cover pool is rejected; startup UI requests, image-byte regression, leaked instances, and missing parity evidence fail. Include deliberately stale/missing/extra generated files in freshness-check tests.
- [ ] **Step 2:** Add CI using Node `24.16.0`, `npm ci`, generated checks, Node regression suites, and separate Playwright installation/browser parity steps. Example job core:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '24.16.0'
      cache: npm
  - run: npm ci
  - run: npm run check:generated
  - run: node tools/scripts/run-alpha-gate.mjs
  - run: npx playwright install --with-deps chromium firefox webkit
  - run: node tools/scripts/test-loredeck-workbench-browser-parity.mjs
```

Use PR/main path filters covering package/config/source/style/fixture/generated/tool changes, and upload failure screenshots, traces, and reports. Add new fast model/lifetime/clone/cover/disclosure/tooltip/build-contract tests to the appropriate gate. Keep browser/native-image build prerequisites explicit rather than making old direct Node tests unexpectedly install packages.
- [ ] **Step 3:** Run all 14 commands listed in the design spec, new suites, relevant creator UI tests, build freshness, package roundtrips where touched, and clean-install live SillyTavern smoke. Verify no Svelte bundle request before using the workbench and no application/state-manager copies inside it. Confirm original canonical data/export outputs are unchanged apart from normal user actions in the fixtures.
- [ ] **Step 4:** Rerun Task 1 captures against the candidate with the same fixture/browser/viewport/DPR/cache/throttling. Report median/p95, noise/confidence, raw samples, image bytes/unique URLs, first-use bundle bytes/evaluation, DOM churn, clones/model calls, and retained resources. Include first-use cost; do not count deferred work as eliminated. Require at least 20% lower 500-row median selection CPU, no material readiness/p95 regression, lower cold cover transfer at equivalent quality, and all structural/parity criteria.
- [ ] **Step 5:** Write `docs/development/SAGA_RENDERING_PERFORMANCE.md` with reproducible commands, environment and fixture hashes, baseline/candidate revisions, paired screenshots, report paths, compatibility coverage/limitations, and pass/fail findings. Update the scripts guide with build/freshness/browser commands and clean-checkout installation behavior. Investigate failures/inconclusive metrics without weakening the spec or expanding migration scope.
- [ ] **Step 6:** Obtain an independent whole-diff review focused on ownership, source/saving races, UI parity, lazy children, bundle contents, and distribution. Resolve findings, rerun affected checks, then commit as `ci: verify rendering performance and parity`. Integration/publication is a separate action; do not push, merge, or publish merely because this plan has been executed.

## Plan Self-Review and Execution Handoff

Coverage: baseline and measurements → Tasks 1/9; images/sorting/cloning → Tasks 2/3; Deck Maker lazy rendering/model reuse → Task 4; state/identity/async boundaries → Tasks 5/7; Svelte/build/editor ownership → Task 6/7; visual/functional parity → Task 8; clean distribution/compatibility/reporting → Tasks 6/9. Each Review Focus case has explicit owning test steps above.

Recommended execution is subagent-driven with fresh review at each independently testable boundary, then a whole-branch review. There are independent early optimizations, but the Svelte model/adapter/controller tasks depend on exact interfaces and need sequential integration. Keep doc/build/package/gate ownership explicit to avoid parallel edits conflicting. Do not start product implementation as part of writing this plan.

## Primary Sources for the Proposed Snippets

- [Official Svelte npm metadata](https://registry.npmjs.org/svelte/5.57.3), [Vite metadata](https://registry.npmjs.org/vite/8.3.6), and [Svelte Vite integration metadata](https://registry.npmjs.org/@sveltejs/vite-plugin-svelte/7.3.1).
- [Svelte mount/unmount and effect flushing](https://svelte.dev/docs/svelte/imperative-component-api), [raw state](https://svelte.dev/docs/svelte/$state), and [actions](https://svelte.dev/docs/svelte/use).
- [Vite library build](https://vite.dev/guide/build.html#library-mode) and [build configuration](https://vite.dev/config/build-options.html).
- [Sharp output options](https://sharp.pixelplumbing.com/api-output/).
