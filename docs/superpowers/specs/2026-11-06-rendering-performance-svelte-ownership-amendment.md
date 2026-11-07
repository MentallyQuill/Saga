# Lorecards table ownership amendment

Date: November 6, 2026.
Status: experiment completed and alternative rejected.
Parent: [Rendering performance and Svelte design](2026-11-05-rendering-performance-svelte-design.md).

## Reason for the amendment

The user's requirements remain performance improvement, inclusion of Svelte, and unchanged UI and functionality. The first implementation keeps the view mounted and improves selection CPU, but diagnostic measurements show a first-open regression. A children-only native row adapter reduces that regression without resolving it. A further fragment-only adjustment has a small result and is rejected.

The measured cost is distributed across per-row Svelte construction/actions, native DOM creation, row helpers and tooltip setup. It is not explained by synchronous layout inside the row initialization. Another sequence of row-level tweaks has no demonstrated path to the unchanged first-use budget.

The experiment gave Svelte ownership of the Lorecards view and its leaf lifetimes. An isolated native helper reconciled the keyed table children.

## Alternatives

| Alternative | Assessment |
| --- | --- |
| Continue tuning the Svelte row components or children-only adapter | Partial improvement already measured; remaining distributed work makes further small changes an uncertain route to the budget. Stop this direction. |
| Mount the entire view detached, then attach it | Retains the per-row framework work and changes ancestor/lifecycle conditions seen by native helpers. Do not pursue. |
| One native keyed table-children leaf within the Svelte view | Removes the per-row framework/action layer and permits complete initial row construction before insertion. More native reconciliation code and lifecycle risk; test one isolated alternative. |

The final alternative has a coherent opportunity, not a promised timing gain. A small or null result ends this alternative. Adoption requires functional, visual, lifecycle, compatibility, build and full performance acceptance on the final source.

## Ownership contract

Svelte owns the existing table host and selectable class, controls/bulk/detail hosts, loading/error conditions, retained-view visibility, raw snapshot bridge and adapter lifecycle. It renders no header, row, note or reconciliation markers inside the table host. Existing controls and editors retain their adapters.

One local presentation helper owns every child of that table host: the existing header container, row buttons and descendants, empty message and display-limit note. It reuses the existing table-header factory and tooltip service. Its map stores DOM handles and latest presentation references, with the existing descriptor key including deck and entry/draft identity. It does not own canonical lore, filtering, sorting, logical selection, persistence, source loading or controller state.

Same-key rows, cells and checkboxes stay mounted on selection/status updates. Updates use the latest IDs and preserve event propagation and modifier behavior. Reordering moves only nodes whose order changes. Missing rows release tooltips and listeners while connected before removal. The 500-row display cap and full filtered selection domain remain exactly as before.

Initial row presentation may be assembled detached and committed together. Invoke the existing header factory after its real header host is connected, preserving that factory's internal construction behavior. Initialize the new row/checkbox tooltips after their nodes are connected, synchronously before readiness. No synthetic ancestry wrapper or detached-view mount is introduced. Ordinary cell coercion and render errors propagate into the existing adapter boundary. Roll back precommit local resources and dispose successful connected resources before unmount on postcommit failure. One owner disposes each header/row resource exactly once. Retained loading/error presentation preserves the table and its resources.

No controller, service, model, CSS, storage, browser target, original asset, interaction, copy, wrapper, virtualization, preload or deferred required work is added or changed by this amendment. Registries, Library and Deck Maker keep their existing migration boundaries. The Svelte module remains lazy and its entire first-use cost is measured.

## Validation and promotion

First prepare an isolated alternative, preserving production source and prior experiments. Prove exact markup, painted geometry/styles and unmasked screenshots; arbitrary cell cardinality/String semantics; stable keyed identity; all selection/header/mode/filter transitions; latest callbacks; connected disposal; and mount/update error recovery. Then perform the separately authorized bounded comparison under the frozen collector.

Only a material complete-readiness improvement with retained warm-selection gains warrants promotion. A prototype does not pass the release criteria. The parent design's UI/functionality, browser and build contracts and performance budgets remain binding. Final acceptance uses both complete frozen-protocol matrices and the predeclared statistical method; failures or inconclusive results are never passes.

## Result

The isolated build reproduced the testing build's DOM and unmasked desktop screenshot in the focused parity check. The Edge diagnostic compared the original renderer and the alternative for 100 and 500 Lorecards on desktop and phone viewports, with 1× and 4× CPU settings. It sampled five cold opens and 20 warm interactions per case. Warm selection CPU improved in all eight cases. Only three cases met both descriptive cold-readiness limits. For 100 Lorecards on desktop at 4×, median readiness rose from 272.3 ms to 317.0 ms and p95 from 282.7 ms to 347.4 ms.

A separate instrumented pair showed that browser frame timing after the visible-row observation accounted for most of that pair's readiness gap. It did not identify a bounded application change that would recover the loss. The original Svelte row implementation remains in the testing build. The diagnostic and trace are separate from the full acceptance matrix.
