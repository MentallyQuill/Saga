# Saga Rendering Performance and Svelte Design

Status: Implementation in progress; final UI parity and performance acceptance remain pending.
Date: November 5, 2026.
Repository baseline: `1a92c708`.
Builder review: completed; no unresolved planning questions.

The November 6 table ownership experiment moved row reconciliation to a native keyed leaf within the Svelte view. It missed the diagnostic first-open budget and was rejected. The testing build uses the initial Svelte row components. All UI, functionality, browser, build and performance criteria below still apply. [Table ownership amendment and result](2026-11-06-rendering-performance-svelte-ownership-amendment.md)

## Intent and requirements

Improve loading and interaction performance in the Loredeck Library, Loredeck Workbench, and Deck Maker while preserving the current functionality and UI. Incorporate Svelte into this work as a bounded production rendering upgrade.

The user's requirements are explicit: include Svelte, keep functionality and UI the same, and treat this as performance work. The migration boundary, build arrangement, and measurement budgets below are design proposals, not additional product decisions attributed to the user.

Successful completion means the same Saga screens, actions, data, and editing behavior with less image transfer, unnecessary DOM construction, sorting overhead, and payload allocation. A framework migration alone does not establish a performance improvement.

## Scope and approaches

| Approach | Tradeoff | Decision |
| --- | --- | --- |
| Optimize the existing imperative rendering only | Smallest change and no build tooling, but retains manual view-update complexity | Insufficient for this request because Svelte is now included |
| Add Svelte to the Loredeck Workbench's Lorecards view; optimize the Library and Deck Maker in place | Addresses a demonstrated high-churn surface while retaining existing controllers, services, and styling | Proposed architecture, extending the incremental adoption discussed in the audit |
| Migrate the Library, all workbenches, and runtime shell together | Broad rendering consistency, but much larger parity and integration risk | Deferred beyond this performance change |

The initial Svelte surface is the **Lorecards view inside the Loredeck Workbench** opened for a deck from the Library. It includes search/filter controls, bulk-selection controls, rows, and the selected Lorecard detail/editor. This is distinct from the Accepted/Pending Lorecard Workbench in `src/lorecards/lorecards-panel.js`.

The Library retains its existing renderer and receives image-loading and sorting improvements. Deck Maker retains its existing renderer and receives lazy disclosure construction, removal of redundant cloning, and render-scoped model reuse where supported by measurements. The Loredeck Workbench's Registries view remains imperative JavaScript.

Excluded: redesigns, new controls or preferences, new features, changes to available tabs, pagination or virtualization, storage/schema migrations, changes to lore retrieval or prompt injection, generation/provider changes, a general runtime rewrite, and migrating Context, Pack Health, Story Maker, or Accepted/Pending workbenches to Svelte.

## Current evidence and constraints

| Observation | Evidence | Consequence |
| --- | --- | --- |
| Library rendering already batches work and preserves unaffected panes | `loredeck-library-render-scheduler.js`; Library browser performance tests | Preserve its roughly 8 ms / 40-row batching, cancellation, logical range selection, and deep-scroll restoration |
| Library rows already use offscreen containment and fixed cover containers | `styles/runtime.css` | Do not claim a demonstrated layout-shift problem or remove the existing protections |
| Shared deck-cover creation lacks lazy-loading and asynchronous-decoding hints | `createLoredeckDeckVisual` in `loredeck-library-panel.js` | Distinguish list and selected-detail image policies |
| Bundled index references 70 unique cover files totaling about 26.1 MiB | Audit of `content/loredecks/index.json` and referenced files | This is total stored cover size, not a measured first-open transfer |
| Title comparisons repeatedly use options-bearing `localeCompare` | `loredeck-library-view.js` | Reuse one collator with the same locale/options and tie breakers |
| Workbench selections rebuild the shell and up to 500 rows | `renderLoredeckWorkbench`, row and checkbox handlers | Keep the view mounted and update stable keyed rows and details |
| Closed Deck Maker disclosures receive already constructed children | `createLoredeckCreatorCard` and `createLoredeckCreatorArtifactDisclosure` | Defer child factories until the disclosure is opened |
| Generated-pack cache evaluates both the injected clone and a fallback clone | `createLoredeckCreatorGeneratedPackCacheController` | Invoke only the applicable clone |
| Extension entrypoint is served directly and no root frontend build exists | `manifest.json`, `src/extension/index.js` | Ship precompiled, browser-ready artifacts; users must not need Node or a dev server |

The audit's deterministic 1,000-title Node microbenchmark took about 35.5 ms with the current comparator and 2.1 ms with a cached collator, with identical sorted output. This is supporting CPU evidence, not a browser latency promise. Browser performance baselines still need to be captured before implementation.

## UI and behavior parity contract

The baseline is the current implementation at the recorded revision, including responsive variants and existing limitations. Older planning documents must not be used to add controls or complete unfinished features during this work.

### Appearance and interaction

- Preserve labels, tooltips, icons, ordering, row heights, spacing, typography, colors, borders, image crops, overflow, breakpoints, animations, and disabled/busy states.
- Reuse the current global styles and theme variables. Preserve element types, classes, IDs, relevant data attributes, and parent/child relationships that CSS, tours, and automation depend on. Compiler comment markers may differ; visible layout may not. Do not introduce layout wrappers or new Svelte transitions.
- Preserve desktop, tablet, and phone layouts, custom themes/icon sets, keyboard operation, focus, caret and selection ranges, IME composition, and independent body/table/detail scroll positions. Status updates must not steal focus or overwrite in-progress typing.
- Preserve the current overlay, backdrop/Escape close behavior, header actions and status chips, tab order, and Basic-mode access guard. Health and Files tabs remain disabled as they are today.
- Preserve loading, empty, error, monogram fallback, confirmation, and toast presentations. Do not add a new normal-path loading screen or a framework-specific error panel.

### Lorecards and editing

- Preserve query matching, filter semantics, title ordering, counts, draft/disabled/source styling, and selection reconciliation after filtering or reloading.
- Preserve the 500-row display cap and current limit message. **Select Visible, the header selection checkbox, and Shift ranges currently operate over all filtered non-draft rows, including rows beyond that display cap.** Keep those semantics exactly.
- Keep active-detail selection separate from bulk selection. Preserve Ctrl/Meta additive selection, Shift ranges, checkbox event propagation, checked ARIA state, bulk actions, confirmations, and busy handling.
- Bundled decks remain read-only with Duplicate to Edit. Custom/Generated editing retains the same fields, hints, machine-ID rules, normalization, validation, and persistence effects.
- Text edits save on blur; Enter blurs single-line inputs; Ctrl+Enter saves textareas; selects save immediately. Dirty typing updates the save status without submitting an edit. Draft creation, cancellation, validation, and keyboard shortcuts retain their current behavior.
- Preserve writing of `entryOverrides`, removal of a saved ID from `disabledEntryIds`, stale-health marking, post-save source reload, and existing success/failure feedback. Replacing reloads with optimistic local edits is outside this change.
- Preserve open/reset semantics: each open clears bulk selection/range anchor, selected entry, and registry search, resets Status to active, and activates Lorecards. Existing query/relevance/category filters persist. A draft survives reopening the same deck and clears when switching decks.

## Rendering architecture

### Ownership and integration

`src/loredecks/loredeck-workbench-panel.js` remains the controller and keeps its public functions: `configureLoredeckWorkbenchPanel`, `openLoredeckWorkbench`, `closeLoredeckWorkbench`, and `refreshLoredeckWorkbench`. Existing dependency injection in `src/runtime/loredeck-workflow-composition.js` remains authoritative.

The controller owns the overlay, shell, header, tab navigation, state transitions, loading, persistence, confirmations, and business rules. A stable existing container beneath the tab navigation becomes the Svelte mount target for the Lorecards view. Opening Registries disposes that component and uses the current registry renderer; returning mounts a new Lorecards view from controller state.

The rendering boundary exposes `mount(target, snapshot, actions)`, `update(snapshot)`, and idempotent `dispose()` through a small adapter. These are Saga adapter operations, not Svelte's component instance API. Ordinary selection/filter/save-status refreshes call `update`; they must not replace the shell or remount the component. Header and tab counters update in their separately owned DOM.

Svelte owns the mounted view's DOM. Imperative helpers may own explicitly isolated leaf containers, such as existing editor primitives or tooltips, through adapters with cleanup. Each subtree has one owner: controller refreshes must not replace Svelte descendants, and Svelte must not reconcile the children of an imperative leaf host.

The initial component split is a Lorecards view, controls/selection toolbar, keyed row list, and detail/editor adapter. Exact component filenames are left to the implementer. Existing UI-kit helpers should be reused through explicit adapters where that reduces parity risk; reproducing their behavior must be covered by interaction tests.

### State, identity, and updates

Pass a presentation snapshot and action callbacks from the controller. Do not introduce a second canonical lore store, persist Svelte state, wrap stored payloads in reactive proxies, or JSON-clone the full deck on selection changes. A shallow/raw reactive snapshot bridge may be used; replacing that snapshot must preserve references for unchanged rows.

Key rows by stable entry identity, including deck identity when decks change. Selection-only updates change the previous/new active row, relevant checkbox/toolbar state, and selected detail. The table, controls, and unaffected row nodes stay mounted. Do not replace a detail editor merely because a save chip or unrelated row changes.

Keep query/filter/sort derivation outside per-row component work. Compute a filtered collection and counts once per update, retain the complete logical selection domain, and give the view the current 500-row display slice. Reuse model data within an update rather than adding long-lived caches without explicit invalidation.

Controller state remains the source of truth. Editable buffers have an explicit per-deck/per-entry owner and must survive unrelated updates. Blur handlers capture the original deck, entry, and submitted value so selecting another entry cannot redirect a save. The existing save handler decides whether persistence succeeds; reactive effects must never trigger writes or model/provider requests.

### Lifecycle, asynchronous work, and errors

Lazy-load the compiled view on the first Lorecards workbench open, alongside existing source loading. Keep public open/close functions callable as they are now. Existing shell/loading presentation remains available while the module loads; no Svelte runtime is imported by the extension's initial static dependency graph.

Assign a view-session token and source-request identity. Close, deck switch, tab switch, and experience-mode cleanup invalidate relevant render work. Late module imports, source loads, animation frames, and status callbacks may not remount a closed view, overwrite a newer deck, or render into detached nodes. These are view-ownership checks, not cancellation of durable saves or generation jobs.

Unmount before removing or replacing the host. Release component subscriptions, tooltip instances, DOM listeners, scheduled work, and adapter-owned temporary references exactly once. Repeated open/close cycles must not accumulate active views or listeners. Explicitly wire every existing cleanup/removal path to disposal; DOM removal alone is insufficient.

Handle import/mount/update failures at the adapter boundary using existing Saga error/status helpers and keep Close usable. If rendering/effect boundaries are used inside Svelte, retain separate handling for event-handler and asynchronous failures, which are outside those boundaries. Do not silently replay a save or other action while recovering a view.

## Other performance changes

### Library covers

Add an explicit image policy to the shared visual helper. List and folder-collage images request lazy loading and asynchronous decoding; the selected detail cover remains eager. Set hints before assigning the source. Preserve fixed CSS dimensions, `fit`, focal point, alt/title text, monogram error fallback, cover editing, and existing responsive sizing.

Generate smaller passive thumbnail variants for bundled covers and a derived lookup keyed by the original bundled asset identity. Proposed starting sizes are 128 and 256 pixels, with original covers retained for details and displays needing more resolution. Select variants according to actual rendered size and device pixel ratio; use the original when necessary to preserve sharpness. The implementer chooses encoding and final sizes from byte measurements and visual comparisons, not from a quality reduction target.

Treat thumbnails as derived shipping assets. Do not change canonical cover references, package schemas, or original images. Imported/custom covers without a derivative continue through the original asset resolver and existing scaling/storage behavior. A missing derivative falls back to the original before using the existing monogram fallback. Original cover fit and focal point apply equally to derivatives.

### Sorting and cloning

Create one `Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })` for library title comparisons. Preserve normalization, manual order, core-deck ordering, stable ties, and ID tie breakers. Check mixed case, accented text, numbered titles, and equal titles against the current comparator.

Change the generated-pack clone fallback to be lazy so each requested clone invokes exactly one implementation. Preserve defensive-copy behavior and cache invalidation semantics. Skipping repeated cache writes by revision is deferred unless existing mutation ownership proves that safe.

### Deck Maker disclosures and derived models

Allow `createLoredeckCreatorArtifactDisclosure` to receive a child factory. Construct open disclosures immediately and closed disclosures on their first opening, using current controller state. Preserve remembered disclosure state, keyboard behavior, summaries/status badges, mobile actions, tours, and anchor navigation. Anchor navigation must open/materialize the target before measuring or scrolling it.

Mount a disclosure child once for the current render/data revision; ordinary toggling must not duplicate handlers or reset an editor. Dispose child-owned resources when the parent is replaced. Reuse the pipeline/approved-ID/coverage model within a render where dependencies are identical, and retain live generation/status subscriptions even while visual children are absent. No durable job, persistence, or recovery work may depend on a collapsed child having been constructed.

## Build and distribution

Use Svelte 5 compiled through a small Vite library build with the official Svelte integration. Add a root development package manifest and lockfile without changing existing package scopes or direct Node test invocation. Pin a mutually compatible toolchain during implementation. SvelteKit, routing, SSR, and a production dev server are unnecessary for this boundary.

Keep `manifest.json` pointing to the existing extension entrypoint and stylesheet. Emit a browser-ready ES module at a stable path such as `src/ui/generated/loredeck-workbench-view.js`, with relative self-contained imports and one bundled Svelte runtime for the boundary. Bundle only presentation code and framework support; pass Saga services through callbacks to avoid duplicate application/state-manager instances. Preserve existing CSS loading rather than introducing a second theme/style pipeline.

Commit the generated UI output and thumbnail assets so direct Git-based SillyTavern installation works without building. Add repeatable build and freshness-check commands, document the supported Node/toolchain versions, and make CI rebuild/check generated artifacts. Exclude build timestamps and machine-specific paths. Rebuilding after a source/toolchain change must update tracked output reproducibly.

The generated module must contain no bare package imports, compiler/dev-server code, remote CDN dependencies, or absolute local paths. Extension-folder renaming and nested installation paths must continue to work. Do not silently narrow compatibility to a tool's defaults. Implementation must confirm the runtime/browser APIs required by the pinned Svelte version before integration is accepted.

### Browser compatibility decision

The repository declares minimum SillyTavern `1.12.0`, but does not declare minimum browser versions. This spec therefore does not assume an undocumented browser floor or introduce a new product support policy.

As a conservative author-selected build target, compile the new boundary for Chrome/Edge 87, Firefox 83, and Safari 14, matching Svelte's documented core minimums. Avoid optional framework features that require newer APIs unless a compatible implementation is provided. This is a target for the new output, not a claim that the whole existing extension supports those older versions. Verify these minimums against the pinned Svelte release rather than relying on Vite's newer default targets.

The parity test matrix includes current Chrome/Edge, Firefox ESR, desktop Safari, Android Chromium, and iOS Safari, with exact versions recorded when capturing the baseline. At the stated conservative targets, also exercise the adapter's load/mount/update/dispose contract where those browser builds are available; record unavailable builds and any baseline failures explicitly. A candidate-only compatibility failure blocks completion; a pre-existing baseline failure is not authority to introduce another one. If compatibility requires an adapter/polyfill, keep it local to this boundary and include its cost in the first-use measurements. Keep the manifest's minimum host version unchanged.

## Validation and acceptance

### Baseline and measurements

Before production changes, save reproducible visual and behavior baselines from the recorded revision, plus browser/version, viewport, DPR, theme, fixture revision, cache state, and CPU-throttling settings. Use separate baseline/candidate checkouts or builds so both can be measured without a user-facing renderer toggle.

Measure first useful content, complete usable view, click/input-to-next-paint latency, long tasks, DOM creation/removal, unique image requests and bytes, UI module bytes, clone/model invocation counts, and retained view/listener counts. Include the real 77-deck library with covers, a 1,000-deck fixture with an explicitly recorded cover pool, and workbenches with 100, 500, and more than 500 filtered Lorecards. Image-free metadata fixtures alone cannot establish cover performance.

Use desktop and phone viewports, normal and 4x CPU throttling, cold/warm caches, and enough repeated runs to report medians and p95 (at least 30 warm interactions per case and 20 independent cold opens). Complete image loading and layout before screenshots; record initial loading separately. Keep the current source-load and save effects identical in both builds.

Proposed acceptance budgets, to be recorded with baseline variability before implementation:

- At least 20% lower median workbench selection update CPU time in the 500-row fixture, with no unaffected-row replacement on selection-only updates.
- No material regression in first-use readiness or interaction p95: a candidate fails when it is slower by more than the greater of 5% and 2 ms, outside observed baseline variability. Investigate noisier results rather than declaring a pass.
- Lower unique cover-transfer bytes in a cold library browse at matching viewport/DPR and visual quality. Background images outside the native lazy-load margin must not be explicitly forced to download by Saga.
- Collapsed Deck Maker content factories do not execute before opening/anchor navigation; each clone request executes one clone implementation. These structural checks supplement timings.
- The compiled Svelte view is absent from startup requests before the workbench is used; its first-use bytes and evaluation cost are included in readiness measurements, with no credit for merely shifting work later.
- Repeated open/close cycles leave no additional live component instances, listeners, timers, or detached editor subtrees after pending work settles and collection is allowed.

These are proposed release criteria, not claims of achieved gains. If Svelte misses the performance or parity criteria, optimize the bounded integration and reassess it. Do not ship a regression or expand migration scope to justify the framework choice.

### Functional and visual verification

Require paired desktop/tablet/phone screenshots across bundled/custom/generated decks, default and representative custom themes, empty/loading/error states, selected and bulk-selected rows, edited/draft forms, and open/collapsed Deck Maker stages. Require unchanged copy, control state, measured geometry, and computed visual styles. Any repeatable visible difference is a failure; renderer/font rasterization noise may be documented, but blanket screenshot-threshold increases are not acceptable.

Add browser interaction coverage for search/caret/IME continuity; every filter; Ctrl/Meta/Shift and header selection with more than 500 matches; draft validation; bundled read-only behavior; autosave timing and keyboard shortcuts; save failures; post-save effects; independent scroll preservation; status updates during typing; anchor/tour expansion; and close/reopen/deck-switch during pending loads and saves. Verify payload outcomes and action counts as well as appearance.

Retain existing behavioral coverage and run the relevant suites, including:

```text
node tools/scripts/test-loredeck-library-performance.mjs
node tools/scripts/test-loredeck-library-browser-performance.mjs
node tools/scripts/test-loredeck-library-folders.mjs
node tools/scripts/test-loredeck-library-transfer-actions.mjs
node tools/scripts/test-loredeck-creator-generated-pack-cache.mjs
node tools/scripts/test-loredeck-creator-workbench-cache.mjs
node tools/scripts/test-loredeck-preview-cache.mjs
node tools/scripts/test-loredeck-workflow-composition.mjs
node tools/scripts/test-search-focus-preservation.mjs
node tools/scripts/test-runtime-view-disposal.mjs
node tools/scripts/test-runtime-refresh-reliability.mjs
node tools/scripts/test-visual-smoke-harness.mjs
node tools/scripts/test-css-sanity.mjs
node tools/scripts/run-alpha-gate.mjs
```

Use the browser harness's supported Playwright/browser configuration. Update source-string assertions that encode the old imperative ownership, such as exact focus-helper call counts, only alongside equivalent or stronger behavior assertions. Do not weaken functional assertions to accommodate Svelte. Run the existing creator UI suites relevant to disclosure/anchor/reset changes, package/asset roundtrips if thumbnail resolution touches those paths, generated-build freshness checks, and a live SillyTavern smoke pass from a clean installed checkout.

### Completion conditions

The implementation must deliver the bounded Svelte production view, the listed independent optimizations, unchanged UI/functionality, a reproducible shipped build, parity results, and before/after performance results. All required checks must pass, no blocking parity differences may remain, and the measurements must meet the stated criteria. The current step delivers only this spec for review; it does not authorize claiming the implementation complete.

## Decisions left to implementation

- Exact component/file organization within the specified ownership boundary and the smallest UI-kit adapters needed for parity.
- Compatible pinned Svelte/Vite/integration versions and any local compatibility adapters, following the explicit browser target and parity matrix above.
- Thumbnail encoding and final size choices after visual-quality and transfer measurements.
- Fixture generation details, baseline storage locations, and measured variance, while keeping the cases and criteria above intact.

Any change to migration scope, functionality, visible UI, storage behavior, supported browsers, or acceptance budgets must be called out as a design revision instead of being treated as an incidental optimization.

## Primary technical references

- [Svelte imperative mount/unmount API](https://svelte.dev/docs/svelte/imperative-component-api).
- [Svelte keyed lists](https://svelte.dev/docs/svelte/each#Keyed-each-blocks).
- [Svelte raw state](https://svelte.dev/docs/svelte/$state#$state.raw).
- [Svelte compiler](https://svelte.dev/docs/svelte/svelte-compiler).
- [Svelte browser minimums and feature exceptions](https://svelte.dev/docs/svelte/browser-support).
- [Svelte rendering/error boundaries](https://svelte.dev/docs/svelte/svelte-boundary).
- [Vite production library build and relative asset bases](https://vite.dev/guide/build.html#library-mode).
