# Saga rendering performance test results

The Svelte 5 testing build failed the release criteria. The Library transferred fewer cover bytes, and the Workbench responded faster after its first open. First-open readiness was slower in every Workbench case. The exact visual gate also failed four tablet comparisons.

## Builds and method

| Build | Runtime revision | Collector source SHA-256 |
| --- | --- | --- |
| Original | `1a92c7082241af393146215a39ce2073ce646db2` | `bd017ce26e6169bfcd8572122359d16082ef705495b30e4f27aab7438cf7966d` |
| Svelte testing build | `391de0bbf04b34a2a9fadc98bf38327d717f756e` | `bec6561fa1e8efc046447ce8a89b0915d0a8244c808c19228ed357c66850aae0` |

Each build ran 40 timed cases and five tablet references. Each cold case had 100 fresh-context opens. Each warm case had 200 chronological interactions after its initial open. Edge 156.0.4314.58 ran on Windows x64 build 19045 with an AMD Ryzen 7 5800X, Node 24.16.0, and Playwright 1.65.0. The timing matrix paired desktop at 1440 × 900 and DPR 1 with a phone viewport at 430 × 820 and DPR 3. Each ran at 1× and 4× CPU settings. The phone Workbench uses keyboard selection because the original layout occludes pointer access at that size.

The six-file capture protocol SHA-256 is `9a3dd0668f9be5b9403977ee2b2e65cf2a614ecf12d2737f15812e61bc94a6a3`. The fixture SHA-256 is `acc70381c0758438d0f1f3b59153fc3be876d82b8b764a11e15c78de6e4e6216`. The Edge executable SHA-256 is `d35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b`. Both complete matrices passed the frozen artifact validator.

The release evaluator stopped at the exact visual failure. A separate analysis applied the same predeclared 20,000-replicate bootstrap to the complete timing matrices.

| Numerical gate | Pass | Fail | Inconclusive |
| --- | ---: | ---: | ---: |
| Cold readiness median | 8 | 12 | 0 |
| Cold readiness p95 | 8 | 12 | 0 |
| Cold Library cover transfer | 8 | 0 | 0 |
| Warm interaction p95 | 18 | 1 | 1 |
| Warm 500-row selection CPU | 4 | 0 | 0 |

Intervals are approximate per-comparison 95% percentile intervals. Cold contexts shared a browser process, which limits independence. Warm classifications use chronological five-pair blocks and a ten-pair sensitivity check.

## First-open readiness

| Workbench rows | Viewport and CPU | Original median | Testing median | Original p95 | Testing p95 |
| --- | --- | ---: | ---: | ---: | ---: |
| 100 | Desktop 1× | 63.9 ms | 76.2 ms | 73.2 ms | 89.5 ms |
| 500 | Desktop 1× | 125.8 ms | 140.1 ms | 145.1 ms | 178.2 ms |
| 600 | Desktop 1× | 117.5 ms | 142.1 ms | 150.0 ms | 173.9 ms |
| 100 | Desktop 4× | 281.5 ms | 337.9 ms | 301.1 ms | 358.4 ms |
| 500 | Desktop 4× | 574.8 ms | 701.1 ms | 640.5 ms | 717.1 ms |
| 600 | Desktop 4× | 559.0 ms | 713.2 ms | 582.2 ms | 732.5 ms |
| 100 | Phone 1× | 58.8 ms | 66.6 ms | 67.1 ms | 78.6 ms |
| 500 | Phone 1× | 110.7 ms | 143.6 ms | 135.0 ms | 158.7 ms |
| 600 | Phone 1× | 113.3 ms | 139.4 ms | 137.3 ms | 163.8 ms |
| 100 | Phone 4× | 245.4 ms | 310.5 ms | 258.3 ms | 321.2 ms |
| 500 | Phone 4× | 549.2 ms | 690.8 ms | 607.3 ms | 707.3 ms |
| 600 | Phone 4× | 563.8 ms | 697.9 ms | 606.9 ms | 714.8 ms |

The candidate's Workbench medians increased by 11% to 30%. All exceeded the budget of the greater of 5% or 2 ms. The desktop 500-row median at 4× was 97.6 ms over budget, with an approximate interval of 92.3 to 105.2 ms over budget. The module was absent from startup requests and transferred 69,598 encoded bytes on the sampled first Workbench open. A separate marked trace attributed 2.068 ms to module evaluation as an instrumented estimate. That trace and its companion Library late-image observation are separate from the timed matrix.

At 4× CPU slowdown, median time to the first visible Workbench row increased by 48 to 134 ms across six cases. The median time from that observation to the readiness seal increased by 10 to 20 ms. These phase medians are descriptive and are calculated separately for each case.

A CSS-only experiment kept all 500 desktop rows mounted and let Edge skip rendering later rows offscreen. At identical scroll offsets, screenshots and row boxes matched exactly. Native wheel scrolling initially reached each target, then adjusted the contained table by 58 px after `scrollend`. A second pair reproduced the adjustment after verified settlement. The experiment ended before timing because it changed scrolling behavior.

A follow-up trace identified the checkbox span as the anchor for that adjustment. Disabling anchoring on the whole table removed it, while excluding only the contained rows' descendants did not. A separate rule applied containment only to passive text cells. Native wheel offsets, Tab focus, and measured geometry matched in that check. Exact screenshots at matching offsets still differed by 4,161 pixels at the middle and 4,192 at the end, all inside text rectangles. That rule also stopped before timing. [Scroll anchoring specification](https://www.w3.org/TR/css-scroll-anchoring-1/#scroll-adjustment)

An isolated Edge 4× test compared the native keyed-table prototype's detached row construction with a clone of a complete static row template. DOM, coercion, callback, and cleanup checks passed. Across 16 pairs at each size, the median went from 4.10 ms to 4.40 ms for 100 rows and from 18.90 ms to 19.45 ms for 500. The test measured row construction only. It ruled out the template clone as a way to recover the native prototype's roughly 31 ms median shortfall at 100 rows.

A separate first-use trial started the module import immediately after resolving the deck. The module request started 6.6 to 6.8 ms earlier, and both sizes still had a median of two layouts. Across seven fresh opens per arm, median readiness went from 337.0 to 342.0 ms at 100 rows and from 687.6 to 697.8 ms at 500. The final screenshots matched. The change stayed experimental.

A separate Workbench experiment removed 19 DOM writes that repeated initial values. Screenshots, element state, and reload behavior matched. Across five cold desktop 4× opens per build at each size, median readiness went from 341.70 to 338.50 ms for 100 rows and from 712.20 to 716.20 ms for 500. The 100-row p95 increased and the 500-row p95 decreased.

## Warm interaction and Library transfer

| 500-row Workbench | Original median selection CPU | Testing median selection CPU | Reduction |
| --- | ---: | ---: | ---: |
| Desktop 1× | 51.70 ms | 19.47 ms | 62% |
| Desktop 4× | 268.65 ms | 79.64 ms | 70% |
| Phone 1× | 50.14 ms | 13.80 ms | 72% |
| Phone 4× | 277.91 ms | 64.57 ms | 77% |

The 500-row Workbench's desktop 4× selection CPU fell 70.4%, with an approximate five-pair interval of 69.7% to 70.8%. The 77-deck Library's phone 4× warm detail-open p95 increased from 55.0 ms to 72.6 ms and failed its budget. The 1,000-deck Library's warm p95 at the same profile was inconclusive. Library cold readiness medians decreased across all eight cases. The largest measured decrease was 3,503.9 ms to 2,984.4 ms for 1,000 decks on desktop at 4×.

The slower 77-deck warm interactions persisted among the 74 testing samples that issued no image request. A separate trace found that restoring cover styles before removing the focused Library overlay triggered a layout pass. Removing the overlay first preserved focus, cleanup, and both screenshots in a 30-open diagnostic. Median latency improved from 67.15 ms to 62.40 ms and p95 moved from 73.10 ms to 75.20 ms. The tested revision excludes that change.

The same trace recorded 24 to 37 resize observations as the browse list rebuilt during detail open. Edge confirmed that both opening and closing the sheet replace the browse list, controls, selected row, and cover node. A reuse experiment stopped before timing because no existing freshness signal covers the registry, health cache, and reentrant selection updates that the full render reads.

Matching existing trace records by derivative URL and painted dimensions found a previous cover for every image painted after the first resize delivery. A new card's actual image box is unavailable during detached construction. Reusing the old binding could keep a larger derivative after a resize, so this alternative remained a feasibility review.

In four traced opens, assigning the new cover sources invalidated image layout even in the open with zero network requests. The subsequent native layout took 1.85 to 2.40 ms. The trace did not capture the same image boxes before and after assignment, so it could not establish that another sizing hint would preserve geometry and derivative selection.

| Cold Library case | Original median cover transfer | Testing median cover transfer | Reduction |
| --- | ---: | ---: | ---: |
| 77 decks, desktop | 27,369,155 B | 1,738,340 B | 93.6% |
| 1,000 decks, desktop | 27,369,155 B | 437,973 B | 98.4% |
| 77 decks, phone | 27,369,155 B | 3,616,652 B | 86.8% |
| 1,000 decks, phone | 27,369,155 B | 1,613,642 B | 94.1% |

Each cover-transfer median was the same at both CPU settings for its viewport and fixture. It counts actual encoded bytes for successful verified original or mapped derivative requests in the frozen window. The asset identity probe verified all 70 original covers and 140 derivatives separately. The three-deck canonical export ZIP and all 28 entry hashes matched the original.

## Local follow-up

Library checkpoint `ecc16880` skips style restoration only on cover nodes from a permanently removed mobile overlay. It releases their observers and error handlers synchronously. Ordinary disposal and rebinding still restore the original styles. In a fresh 30-open comparison per build, the mobile detail-open median fell from 68.15 ms to 62.05 ms and p95 fell from 78.80 ms to 73.00 ms. Before, open, and close screenshots matched byte for byte. The scoped Edge suite passed all 19 cover checks, including the 70-image comparison. All 131 alpha checks passed and all 143 generated files reproduced byte for byte. The p95 result remains above the 57.75 ms budget.

Library checkpoint `1a69d9e1` removes repeated size-observer release calls and preserves replacement subscriptions during cleanup. In a separate 30-open comparison per build against `ecc16880`, phone detail-open median fell from 59.70 to 57.70 ms, p95 fell from 74.10 to 66.90 ms, and median CPU time fell from 138.56 to 135.38 ms. Five focused screenshot pairs matched exactly. All 21 cover tests, the Library browser suite, the alpha gate, and the 143-file generated check passed. The p95 remains 9.15 ms above the historical budget.

A scratch experiment removed a second viewport read during mobile deck and folder sheet construction. Five screenshots and the recorded cover, action, scroll and focus states matched. In a separate 30-open comparison against `1a69d9e1`, detail-open p95 went from 73.00 to 73.80 ms and median CPU time went from 134.58 to 138.20 ms. The change missed the follow-up thresholds and stayed experimental.

A separate variant skipped four immediate zero-offset writes on the fresh mobile overlay and kept later batch restoration. Seven screenshots matched, including real deep-scroll open and close. In 30 opens per build, interaction p95 went from 71.20 to 69.80 ms and median CPU time went from 136.73 to 136.48 ms. The gains missed the predeclared promotion rule, so the change stayed experimental.

A trace on `1a69d9e1` measured 4.19 ms median for native focused-overlay removal. Explicitly blurring the card first saved 0.30 ms in that phase, and median interaction rose by 0.10 ms. Focus events and the final screenshot matched. A separate trace placed the three later layout passes inside two viewport reads and the first restored mobile body scroll write. Those timings describe where the browser did the work.

Combining the viewport-read and zero-scroll changes preserved seven phone states, including deep-scroll restoration. It reduced synchronous layout passes from three to one, while layout-and-style time across the complete traced interaction rose from 17.66 to 18.29 ms. In a separate 30-open comparison per build, interaction p95 went from 72.10 to 71.50 ms and median CPU went from 134.72 to 134.55 ms. Both missed the screening targets, so the combined variant stayed experimental.

The Workbench's virtual deck load spends about 43 ms on Pack Health in retained 500-row, 4× CPU profiles. The Workbench does not display that report, but omitting the analysis would turn some existing malformed Custom and Generated deck errors into successful loads. That shortcut stopped before patching.

Further attribution put 31 to 32 ms of that health work in shared entry normalization. A scratch change deferred empty deduplication Sets and reused a constant scope-field Set. It preserved the compared output and malformed-entry exception. In paired Node tests, median normalization gains were 0.026 ms for 100 rows and 0.298 ms for 500. Both missed the prespecified bar for browser follow-up.

A separate virtual source variant reused the first successful JSON copy and kept the original fallback path. It halved serialization calls and matched complete loader output and malformed-data errors. In eight cold desktop Edge 4× opens per build and size, median readiness went from 346.20 to 338.80 ms at 100 rows and from 697.45 to 696.75 ms at 500. All 12 focused screenshot, accessibility and cell-geometry pairs matched. The 500-row median missed the 4 ms screen, so the variant stayed experimental.

A separate Edge 4× test reused direct tooltip callback functions. Hover and focus transitions, live labels, and cleanup matched, including after a partial registration failure. Median paired registration gains were 0.10 ms for 100 rows and 1.05 ms for 500. Both missed the follow-up threshold, so the change stayed experimental.

A scratch Svelte variant selected the controller's fixed four-column layout once per table and kept the generic adapter path. In eight cold Edge 4× opens per build and size, median readiness went from 341.00 to 338.65 ms at 100 rows and from 691.95 to 647.95 ms at 500 rows. All 12 screenshot, accessibility and cell-geometry pairs matched across open, selection and draft states. The 100-row median missed the preset 10 ms gain, so the variant stayed experimental.

Changing the Workbench table from flex to block flow grew 100 visible rows by 1 px each and increased the scroll range by 100 px. The unchanged Workbench uses both heights on the same retained row as search filters are applied and cleared. A separate text-cell-only variant preserved the table layout in the focused desktop check. In eight cold Edge 4× opens per build and size, 100-row median layout time rose from 92.51 to 93.71 ms and readiness fell from 345.20 to 341.10 ms. Both missed the follow-up thresholds, so the variants stayed experimental.

Delegating row tooltips on top of the fixed Svelte columns reduced 800 native listeners to four in the editable 100-row fixture. Seven desktop tooltip states matched, with exact listener cleanup. In eight cold Edge 4× opens per build and size, median readiness went from 324.80 to 327.10 ms at 100 rows and from 637.55 to 621.25 ms at 500 rows. Both sizes missed the screening rule, so delegation stayed experimental.

A three-build comparison combined fixed Svelte columns, delegated tooltips, and reuse of the first successful virtual entry copy. It cut median readiness against the current branch by 12.50 ms at desktop 100, 74.85 ms at desktop 500, and 37.45 ms at phone 100. In the same run the combined build remained 51.52, 55.69, and 15.25 ms above the original-based median limits. All 12 focused screenshot, accessibility and cell-geometry pairs matched. The combined build stayed experimental.

In a separate 100-row trace, the combined model completed about 60 ms before the import continuation, followed by 60–64 ms in Svelte mount. Route-free traces placed module transport completion near 14 ms, renderer completion near 56 ms and URL-bound evaluation near 86 ms. Evaluation took about 8 ms wall time and under 2 ms thread time. The trace establishes those boundaries, while the reason for the delay before evaluation remains open.

A subsequent scheduler trace identified two intervening tasks. One was a DevTools message and the other was a compositor frame with Workbench focus and layout. In a fixed eight-open 4× control, a neutral Playwright selector check moved the identical 330,592-byte selector initialization message before the timer. On the combined build, module evaluation moved from 89–91 ms to about 60 ms. The combined median was still 54.55 ms later than the original in the seeded diagnostic. The sealed acceptance results retain their original protocol.

Collector checkpoint `3c454860` initializes the selector helper during fixture setup on every fresh page. The real corrected CLI completed eight phone smoke cases across original and current Library and Workbench builds. Both archives emitted the same new protocol SHA-256 `79c5a2f500d8c443b3ea1c836e461a61703ca7afdfebaf42fb60059a9d8fc55e` with the original fixture hash. The full paired acceptance requires a separate run using the new protocol.

One scratch variant chose static editable, draft and read-only Svelte rows at table level. The pinned compiler removed two per-row branches and the standalone bundle grew by 2,382 bytes. A corrected-collector Edge 4× diagnostic measured 32 cold opens against the combined scratch build. Median readiness went from 273.35 to 273.95 ms at 100 rows and from 598.20 to 575.30 ms at 500. All 12 editable pairs matched screenshots, cell geometry and accessibility across open, selection and draft insertion. The selected 80-row bundled read-only pair matched pixels and accessibility. The variant stayed experimental because the 100-row result missed its 8 ms improvement target.

A controller-only variant removed the idle render before the first loading render. A held bundled request confirmed loading copy and overlay focus, then all 80 rows loaded and the cached reopen issued no new source or module request. In 32 uninstrumented Edge 4× opens, the median readiness gains were 0.05 ms at 100 rows and 0.55 ms at 500, while median task time increased at both sizes. All 12 focused parity pairs matched. The variant stayed experimental after missing the timing screen.

A matched corrected-collector diagnostic compared the original with the combined static-row prototype in all 12 Workbench cold tuples. The 96 retained opens used Edge 156 and the same fixture, protocol and readiness checks. A browser update interrupted the first phone case after all desktop cases had finished. The phone cases ran from the beginning using the versioned Edge 156 executable with the same SHA-256. The prototype exceeded the median point limit in 11 of 12 tuples and the descriptive maximum limit in 9. First useful content arrived later and task time increased in every tuple, while median layout time fell in 10. All 24 first-open pixel, cell geometry and accessibility pairs matched. The prototype stays experimental and the release performance gates remain open.

A Library cover variant removed repeated checks of already validated paths while preserving the existing checks for raw and newly joined paths. It matched 747 source selections and passed 17 focused cover tests. The isolated resolver ran 20.93% faster in paired Node tests. In 60 warm phone detail opens, median interaction time fell from 58.50 to 57.60 ms, while p95 rose from 68.30 to 71.80 ms. All six focused pairs matched. The variant stayed experimental.

In a separate 48-open phone probe on the same Saga runtime, keeping up to two already loaded detail images alive eliminated all 10 observed repeat disk-cache requests. The repeated-open p95 fell from 63.30 to 60.60 ms, above the 57.75 ms historical budget. Both final screenshots and all 26 image snapshot pairs matched. A replay of the prior control measured 64.80 ms p95 on observations with no selected-cover request. Three PNG decodes from the earlier instrumented trace all began after the timer. The image lease stayed diagnostic.

Tooling checkpoint `846c7b66` verifies browser version, executable path and SHA-256 at each case boundary. Original and current Workbench smoke captures recorded the same versioned Edge 156 binary and identical new protocol `b0667f5e`. Three injected version and file-byte changes stopped before recording the affected case. The archived six-file release replay retains its original identity.

Building the mobile browse body and detail sheet detached preserved all 14 focused screenshot pairs. The 60-open warm diagnostic measured interaction p95 at 70.70 ms for the control and 80.10 ms for the fragment variant. In a separate native trace, layout at the second viewport read fell from 2.03 to 0.49 ms, while the body scroll write rose from 2.11 to 4.25 ms. Median layout and style time through the final measured callback grew from 20.19 to 22.53 ms. The fragment stayed experimental.

Eight traces on the existing native keyed-table prototype measured the window between the authoritative loaded render and Svelte module evaluation. At 4×, the apparent 27.79–29.40 ms window contained only 0.49–0.94 ms outside recorded renderer tasks. The row-record loop used 6.81–7.22 ms at 100 rows and 22.81–23.80 ms at 500. The overlap evidence did not support moving preparation into the controller's import wait.

The full 36-case Workbench behavior suite passed on actual Edge `157.0.4341.42` against immutable runtime `1a69d9e1`. The browser update is covered by this separate parity run. The timed capture protocol keeps the pinned Edge 156 identity.

A scratch resize observer variant read DPR once per native delivery. The largest observed phone batch went from 37 reads to one. All eight focused screenshot pairs and 17 cover tests matched. Across 60 warm detail opens, p95 moved from 73.80 to 73.50 ms and median interaction time rose from 58.10 to 60.30 ms. The variant stayed experimental.

A desktop Workbench centering experiment checked the approximately 21 ms focus layout. Absolute positioning changed 2,718 edge pixels despite matching recorded geometry and stopped at parity. Normal block flow matched all 16 focused and timing pairs. Across 32 cold opens its median readiness rose from 309.40 to 324.55 ms at 100 rows and from 663.75 to 678.50 ms at 500. The focus traces retained the same document layout root and 43 dirty objects in both builds. Both variants stayed experimental.

A Workbench Pack Health experiment reduced normalization allocations and retained the visibility compatibility pass after reproducing a legacy-key mismatch. The corrected variant matched normalized output across 5,727 bundled Lorecards and preserved the two malformed-input errors. In 32 pinned desktop 4× cold opens, median readiness improved from 322.20 to 297.50 ms at 100 rows and from 666.60 to 664.25 ms at 500. All 12 focused visual pairs matched. The 500-row result missed the median and maximum limits for advancement, so the variant stayed experimental.

Two Svelte row experiments combined the button and cell templates and then grouped six text conversions into one derived value. Both retained exact focused pixels, ARIA, and keyed row identities. The fused variant improved median cold readiness by 9.00 ms at 100 rows and 13.15 ms at 500 against the static-row prototype. The grouped variant improved it by 3.90 and 25.45 ms in a separate comparison against the same prototype. Each missed one of the two local advancement limits.

The grouped renderer and corrected Pack Health normalization were paired against the original across all 12 Workbench cold cases. Independent replay verified 96 opens and 24 exact screenshot, geometry and ARIA pairs. The scratch build met six median point limits and six descriptive maximum limits, with four cases meeting both. The largest median misses were 18.70 and 19.86 ms for 500 and 600 Lorecards on phone at 4×. Median task time was higher in every case, while median layout time was lower in 11. The composition stayed experimental.

A Library folder cover probe replayed 1,418 native size and source observations across Edge, Playwright Firefox, and Playwright WebKit. The image inside a nominal 38 px tile can exceed 64 px in height. At a targeted fractional WebKit DPR, an estimate based on the original aspect ratio and 38 px width selected a different derivative for 71 of 90 tiles. The flat 1,000-deck fixture had zero inline folder tiles. The current image-size policy remains in use.

A Workbench layout probe found that flex rows changed cell geometry at every tested width. A second version retained grid rows and set their minimum tracks explicitly at widths up to 620 px. It matched measured geometry in all 20 focused checks and all six timed screenshot pairs. In 48 pinned phone opens at 4×, median readiness improved by 7.60 ms at 500 Lorecards and 11.70 ms at 600, but regressed by 14.45 ms at 100. Both CSS changes stayed experimental.

A separate Workbench prototype skipped an extra JSON round trip when the virtual loader already owned detached values. Custom and Generated source and presentation output matched. Circular data and inherited serializers retained the original path. The isolated projection saved up to 0.93 ms at 600 rows in Node, but the 48-open phone diagnostic recorded higher median browser task time at all three sizes. The copy shortcut stayed experimental.

In 16 traced phone selections at 4×, the installed build cut synchronous Library replacement from 28.60 to 24.38 ms on 77 decks, while the median interval between animation callbacks rose from 20.09 to 31.99 ms. On 1,000 decks, median traced time fell from 88.29 to 62.22 ms. A cover dimension hint prototype matched five focused screenshot and source pairs, twelve timed screenshot pairs, and 21 cover checks. It reduced p95 to 65.80 and 66.00 ms in two trials. The reversed trial missed the median timing criteria, and the separate traces showed no consistent layout reduction. The prototype stayed experimental.

Eight new Workbench traces covered the original and grouped Svelte builds at 500 and 600 entries on phone at 4×. The grouped build took 112.05–117.21 ms from module evaluation to observed rows. Module evaluation itself took 1.40–1.61 ms. A scratch build combined the earlier native keyed table with delegated tooltips and corrected Pack Health normalization inside the Svelte shell. It passed the 48-open timing screen at both sizes. Median readiness fell from 531.65 to 509.50 ms at 500 and from 551.55 to 518.55 ms at 600 against the grouped build. Both results were within 5% of the original median. All eight screenshot, cell geometry, and ARIA pairs matched, and all 36 Workbench behavior checks passed on pinned Edge.

A 120-open expansion compared the same three builds across the other ten Workbench cold cases. All 40 screenshot, geometry, and ARIA pairs matched. The keyed table had lower medians than the grouped build in every case and met both original-based limits in three. Seven cases missed the median limit, and two of those also missed the descriptive maximum limit. The largest median misses were phone 1× at 500 entries and desktop 4× at 600 entries, by 12.95 and 10.77 ms. The keyed build stays experimental.

In a separate 77-deck mobile Library probe, passing the existing passive tooltip option to detached browse factories removed 2,344 hover and focus listener registrations while retaining 586 identical labels and five exact focused screenshot pairs. The 60-open warm timing screen measured interaction p95 of 70.10 ms for `1a69d9e1` and 77.00 ms for the prototype. Median interaction and task time also rose. The change stays experimental.

Eight native traces compared the keyed prototype with the original at desktop 4× with 600 entries and phone 1× with 500 entries. At desktop, the keyed prototype published rows about 3–7 ms earlier and spent 13–27 ms longer in layout after publication. A separate 64-open phone check alternated stock and marked collectors. At 500 entries the marked keyed build reached the readiness candidate 3.95 ms later and its second animation callback 18.00 ms later. The stock median gap was 3.80 ms in that comparison. The renderer timing and the observed frame boundary remain separate from release acceptance.

A desktop table size containment rule matched 20 focused and six timed screenshot, geometry, and accessibility pairs. It reduced median layout by 16.35 ms at 500 entries and 12.15 ms at 600. Median readiness improved by 11.15 and 3.55 ms. Both missed the 12 ms readiness target, and the 100-entry case also missed its screen. The rule stays experimental. [CSS Containment Module Level 2](https://www.w3.org/TR/css-contain-2/#size-containment)

The keyed build combined the desktop size rule with fixed narrow column tracks in a separate 96-open screen across all twelve cold cases. All 24 screenshot, geometry, and ARIA pairs matched. Eight median limits and seven descriptive maximum limits passed, with five cases passing both. The combined build cut median layout by 19.99 and 24.96 ms against the original in desktop 4× at 500 and 600 entries. The phone 500-entry case missed the median limit by 10.32 ms at 4× and 12.57 ms at 1×. The combined build stays experimental.

The Library observer reuse experiment held one resize and one cleanup observer through five mobile browse and detail states and released both on close. The installed build created six of each across the same sequence. All five focused pairs, six timed pairs, and 21 cover checks passed. In the 60-selection timing screen, p95 moved from 69.60 to 67.60 ms while median interaction and task time rose. The change stays experimental.

A keyed Workbench prototype retained 1,000 direct row and checkbox listeners using two callbacks in the 500-entry phone fixture. It preserved non-bubbling and bubbling clicks, modifiers, latest keyed IDs, and release of every listener. In 48 cold opens, the 4× readiness median fell from 508.90 to 502.80 ms against the prior layout composition and passed the focused screen. At 1× it fell from 113.05 to 112.85 ms and remained 5.49 ms over the original-based median limit. All eight timed screenshot, cell geometry, and ARIA pairs matched. The prototype stays experimental.

A separate Library rule applied size and layout containment to fixed mobile browse cover wrappers. Five focused screenshot and native image geometry pairs and six timed pairs matched. In the 60-selection diagnostic, p95 rose from 66.20 to 77.80 ms. Eight traces retained two document-root layout passes between the animation callbacks in both builds. The wrapper rule stays experimental. [CSS Containment Module Level 2](https://www.w3.org/TR/css-contain-2/#size-containment)

The keyed Workbench direct-label prototype removed all 1,000 delegated tooltip handles from the 500-entry fixture. It retained exact label, hover, focus, selection, disposal, and standalone adapter behavior. All twelve pairs matched in 72 cold opens. It missed the timing screen at desktop 1× with 100 entries and phone at both CPU rates with 500 entries. The prototype stays experimental.

An inline-size containment rule for the keyed Workbench at widths up to 980 px preserved all measured table and row geometry, scroll metrics, and accessibility output across 32 comparisons. A disabled-rule run reproduced the exact pixel deltas in all eight resize pairs with differences. The separate 72-open phone timing screen matched all twelve visual pairs. At 4× with 100 entries, readiness improved from 232.80 to 216.35 ms against the keyed parent, above the 212.83 ms original-derived limit. The rule increased median task time at 500 entries at both CPU rates. It missed all three screens and stays experimental.

The grouped Svelte Workbench prototype removed one wrapper from each Category and Relevance cell, eliminating 1,000 elements from a 500-row table. Twelve focused phone, tablet, and desktop comparisons matched exact screenshots, text styles, geometry, scroll metrics, and accessibility. Two pinned builds emitted the same 77,081-byte view. In 48 additional cold opens, all six visual pairs matched and median task time improved in all three cases. At 4× with 500 phone rows, median readiness improved from 536.85 to 520.40 ms and layout improved by 7.16 ms. All three cases missed the predefined layout gain, and the 1× phone median increased by 0.70 ms. The prototype stays experimental.

The keyed Workbench prototype used the same direct cells with generic and subtitle fallbacks. Twelve focused visual comparisons and sixteen timed pairs matched exactly. It passed two of four screens across 96 cold opens. The 500-entry phone median at 1× was 95.40 ms against the same-run original at 95.95 ms. At 4× that fixture met both readiness limits and missed the separate task gain by 0.32 ms. The 100-entry phone case at 4× still missed both readiness limits. Four separate traces showed rows published 11–15 ms later than the original, with about 50 ms sampled in the connected view mount after a 1.21–1.39 ms module evaluation. The prototype stays experimental.

A follow-up keyed prototype centered row checkboxes directly in the grid and removed 500 wrappers from the 500-entry deck. The initial tooltip selector still expected nested checkboxes. A native hover test reproduced the regression and verified the corrected selector. All fifteen focused pairs matched, including the draft and read-only states. The corrected build matched all twelve timed pairs and passed both 500-entry phone screens across 72 cold opens. The 4× median was 483.65 ms against the same-run original at 495.20 ms. The 100-entry 4× median remained 7.65 ms over its original-derived limit. In four routed 100-entry opens, the corrected view took 12.00–12.60 ms before its first Svelte flush and 9.70–9.80 ms to mount the table and header during that flush. The prototype stays experimental.

An inline Svelte shell put the detail host in the table's template and reduced the compiled view by 608 bytes. All fifteen focused pairs and all 36 Edge behavior checks passed. All twelve pairs matched in a separate 72-open comparison, but the shell missed all three timing screens. Four marked opens showed template construction at 8.30–8.40 ms compared with 7.90–8.00 ms for the direct-checkbox parent. The experimental source stays separate.

The Library cover reuse prototype carried a resolved cover from card or tile construction into its binding. Resolver calls fell from 935 to 585 on a 77-deck detail open and from 2,020 to 1,020 at 1,000 decks, with the later size-based lookup counts and visible source URLs matching. All five focused pairs, six timed pairs, and 21 cover tests passed. Warm 77-deck p95 moved from 84.20 to 76.00 ms while median task time rose from 134.17 to 144.00 ms. The prototype missed the timing screen and stays experimental.

Replaying eight prior current-runtime Library profiles attributed up to 0.53 ms at 77 decks and 2.11 ms at 1,000 to the folder search, scoped collection and mobile active-order call stacks combined. At 77 decks the cover resolver callers accounted for 1.59–4.26 ms of sampled time. The replay used the marked open-to-second-frame windows and verified the trace and CPU profile hashes.

A renderer interval replay removed overlap between nested Paint events. At 77 decks, median Paint between the two animation callbacks moved from 6.70 to 7.31 ms, while style and layout moved from 8.60 to 13.32 ms. All four current traces had a native image ResizeObserver callback followed by an extra document-root Layout. Their respective median durations were 4.70 and 2.31 ms.

The paired matrices refer to `391de0bb`. The earlier SillyTavern manual-testing installation used `1a69d9e1`, with all 143 generated file hashes verified against the isolated host smoke test. The later manual-testing snapshot used the integrated Svelte row renderer with the controller and loader changes described below. The Library checkpoints have separate focused evidence.

The next Workbench changes remove duplicate renders from Select Visible and Clear, reuse the source label between pack refreshes, and read fallback registries only when needed. The browser checks observed one summary update per bulk click and one label lookup per explicit refresh. Selection and filtering performed zero additional label lookups, and reloading a source with its pack record performed zero fallback registry reads. All 37 Workbench behavior cases passed in the local Chromium run. These changes have no new readiness measurement and are separate from the installed checkpoint.

A follow-up reuses the shell's pack snapshot for the initial Workbench source request. The focused browser check observed one pack hydration before the first await, down from two, and a fresh lookup after the source returned. Canonical single-deck lookups now skip the Library sort and normalize only matching records. Library covers release size observation as soon as they select or fall back to the original, which is final for the lifetime of that binding. The three focused Workbench browser cases, Library lookup checks, and all 21 cover checks passed, including 70 image-backed browser pairs. Workbench first-open readiness remains unmeasured for these follow-up changes.

Mobile Library cards share one active-order map per synchronous render batch and skip desktop-only statistics. A 20-row operation check reduced stack-item classification from 40 calls to two and verified that a subsequent batch reads the new order. The Library browser suite passed batching, deep scroll, mobile folder expansion, and selection coverage.

A focused pinned-Edge comparison of the accumulated changes and original `1a92c708` used 30 warm interactions per build at 430 × 820, DPR 3 and 4× CPU slowdown. Both arms used the same collector `b0667f5e` and fixture `acc70381`. Median interaction was 51.20 ms on the original and 57.60 ms on the candidate. The p95 was 57.00 ms versus 62.90 ms, leaving the candidate 3.05 ms above the same-run descriptive limit of 59.85 ms. The single cold observation transferred 3,616,652 cover bytes on the candidate versus 27,369,155 on the original. This diagnostic establishes the remaining gap in the targeted case. The full acceptance matrix and variance analysis still apply. Original raw samples `saga-library-77-controller-followup/original/library-77-phone-4x-warm.json` · Candidate raw samples `saga-library-77-controller-followup/candidate/library-77-phone-4x-warm.json`

After the focused Library capture, cover bindings began reusing the resolved original URL, fit, and thumbnail candidates across ResizeObserver deliveries. Three source choices went from 16 asset-property reads to four, all during binding. Cover edits refresh the visual and establish a fresh binding. All 21 cover checks passed, including 70 image-backed Edge comparisons.

The Library also shares resolved cover metadata within each synchronous render batch. Nested folder summaries reuse one resolution per deck, including missing covers, and a later batch sees a cover change. Deck and folder visuals pass the same metadata to their image bindings. The Workbench host wiring calls its canonical pack resolver directly, bypassing the full sorted Library. Compact, hydrated, external, missing, and alternate-provider lookups retained their existing behavior in the focused host check.

The updated Library recorded a 55.95 ms median and 60.30 ms p95 in one follow-up using the same pinned browser, fixture, collector and 30-interaction phone profile. The preceding candidate recorded 57.60 ms median and 62.90 ms p95. The latest p95 is 0.45 ms above the earlier original-derived limit of 59.85 ms. This diagnostic reused the archived original capture, so the change across candidate runs includes run-to-run variation. The cold cover transfer stayed at 3,616,652 bytes in the single observation. Follow-up raw samples `saga-library-77-cover-snapshot-followup/library-77-phone-4x-warm.json`

Replaying the archived direct-checkbox comparison puts the remaining 100-row phone gap before the first visible row. The median row observation was 198.45 ms versus 180.60 ms on the original. Total layout was 82.61 ms versus 90.64 ms. The 500-row phone prototype had an earlier first row and lower readiness in the same run. These observations point to the small-deck mount path. The row observation comes from the selector and does not timestamp the browser's first paint.

Workbench loading and error transitions keep the source, count, and save pills mounted while updating the availability pills. The held-source regression checks the original loading copy and geometry, retained editor and header nodes, and dismissal of an active header tooltip when the source publishes.

A separate routed probe focused the connected overlay before attaching its shell. Both arms preserved native Escape, prior-input blur, scroll, and stale-source ownership while a request was held. In four traced 100-row phone opens at 4×, early focus reduced the focus call from 21–24 ms to about 1.4 ms. Complete readiness averaged 311.30 ms for early focus and 297.95 ms for the control, with two observations per arm. A synchronous host refresh during focus could also reach the overlay before its header exists. The focus reorder stays experimental.

The Workbench source path now uses the previously validated normalizer allocation changes. Context Health still runs canonical normalization, then checks its trimmed strings, numeric bounds, and normalized coordinates directly. An offline comparison against the archived testing source matched all 5,727 normalized entries and complete Pack Health output across all 77 shipped decks and 564 files. Seven mixed legacy cases and two malformed-input exceptions matched. The Context normalization, Context reliability, Context Health, and Generated finalization checks passed. The sparse no-Context shortcut was set aside because it matches the timing fixture and none of the shipped entries. Browser readiness has yet to be measured for these source changes.

An isolated candidate combines the selector-corrected keyed table with the current controller, Library, and health changes. Two builds with the pinned Vite configuration produced the same 68,033-byte Svelte view and license. Three existing browser cases passed for the retained loading presentation, 600 rows plus a draft and full logical selection, and all five bulk field actions. These checks are scoped to the isolated candidate. It still needs focused readiness measurements before consideration for the full matrix. Source provenance `.tmp/sdd/rendering-performance/workbench-keyed-current-checkpoint/PROVENANCE.json` · Build fingerprints `.tmp/sdd/rendering-performance/workbench-keyed-current-checkpoint/BUILD.json`

The isolated combined Workbench completed 32 cold phone opens at 4× CPU slowdown using the pinned Edge binary, collector `b0667f5e`, and an original–candidate–candidate–original block order. The 500-row case passed the focused screen at 486.50 ms median and 496.80 ms observed maximum, versus 489.30 ms and 529.60 ms on the original. The 100-row case recorded 209.75 ms median and 243.30 ms observed maximum, versus 197.20 ms and 225.80 ms on the original. It missed its corresponding limits by 2.69 ms and 6.21 ms. All four terminal screenshots, cell geometry, and accessibility pairs matched exactly. Independent replay checked the eight screenshot hashes, all 32 lazy-request counts and the original-derived limits. The combined renderer remains isolated. Raw results and summary `.tmp/sdd/rendering-performance/workbench-keyed-current-checkpoint/paired-phone4x/summary.json`

The next controller update projects display rows, logical selection IDs, the header checkbox, and detail selection in one pass. The cache reuses the filtered source rows until the source or filters change, keeps drafts separate, and retains the file count in place of the raw source result. Cold opens with an empty bulk selection skip the validity scan. Eight model checks and three focused browser cases passed, including the 600-row selection domain, draft persistence through reload, and the original loading/error Files counts. The 32-open screen predates these changes.

The keyed candidate rebased onto the single-pass model and cache changes built the same 68,023-byte view twice. A 16-open follow-up covered only the unresolved 100-row phone case at 4× using the same pinned collector and ABBA block order. Median readiness was 210.90 ms versus 196.80 ms on the original, a 4.26 ms miss against the 206.64 ms limit. The observed maximum was 223.30 ms versus 222.90 ms and passed the 234.05 ms limit. Both terminal screenshots, cell geometry, and accessibility pairs matched exactly. The median first visible row arrived at 194.90 ms versus 177.05 ms, while the median within-run interval from that observation to readiness was 16.05 ms versus 20.35 ms. The replay verifies all 16 lazy-request counts, four screenshot hashes, and readiness limits. The candidate remains isolated. Raw results `.tmp/sdd/rendering-performance/workbench-keyed-model-checkpoint/paired-phone4x/summary.json`

The current Workbench controller initializes its controls, bulk toolbar, and table header directly from the first snapshot. This removes the duplicate initial update previously observed to make 19 redundant writes. Plain row clicks also skip the draft lookup used for modifier selection. Four focused Chromium cases passed for loading and errors, large-deck selection, bulk field actions, and busy controls. The current controller changes have no new readiness timing.

The browser loader now overlaps up to four file-backed entry requests per deck and processes the results in manifest order. The shipped manifests list a median of seven entry files each. The browser and CLI Pack Health parity check held the first request, observed the second start before release, and matched ordered entry files and diagnostics for a broken deck. The Workbench close and reopen check also passed. The virtual decks in the 100-row and 500-row timing cases bypass this file loader.

The next isolated keyed candidate used the updated controller and initialized new cell text directly, removing 600 redundant `textContent` reads in the 100-row fixture. Two builds emitted identical 68,079-byte views. A 16-open pinned Edge comparison at phone 4× recorded median readiness of 210.70 ms versus 201.75 ms on the original. It met the 211.84 ms median limit. The observed maximum was 241.00 ms versus 226.90 ms and missed the 238.25 ms limit. The median first row still appeared 15.00 ms later. Both final screenshot, geometry, and accessibility pairs matched exactly. This compares the combined candidate with the original, so it cannot isolate the text initialization's timing effect. The renderer stays isolated. Raw results `.tmp/sdd/rendering-performance/workbench-keyed-cold-cell-init/paired-phone4x/summary.json`

## UI, compatibility, and build

- All 36 functional cases passed on each of Edge, Chrome, Playwright Firefox, and Playwright WebKit against the immutable testing archive. The Firefox ESR check and the Chromium 87 and Firefox 83 adapter checks passed. Native desktop Safari, Safari 14, Android, and iOS were unavailable on the Windows test host.
- All 162 screenshot pairs had equal measured geometry. Of these, 158 had no unexplained pixel differences. Four tablet pairs failed the exact gate. Same-build captures reproduced the 13-pixel Confirm-button differences. Four one-level color differences around the Registries tab in the draft state persisted across builds in both themes. The raw comparison retains all 34 unexplained pixels and the failing result.
- A separate eight-launch tablet draft control held the archived builds, fixture, Edge binary, and comparator fixed. Two hardware-rendered pairs matched exactly, while two software-rendered pairs reproduced the same four pixels. All same-build repeat comparisons matched. The original full visual gate result is still a failure.
- A follow-up default-hardware diagnostic compared all four failed tablet cases and two desktop Runtime icon states. Both cross-build comparisons and both same-build comparisons matched exactly in each state.
- The complete default-hardware comparison of original `1a92c708` and checkpoint `1a69d9e1` also failed the exact gate. All 162 pairs had equal geometry. All desktop and tablet pairs matched outside verified thumbnail pixels, including the four tablet pairs that failed under software rendering. Four phone pairs differed by 363, 36, 455, and 10 unexplained pixels across three Deck Maker states and the custom-theme 600-row Workbench. Independent replay checked all 324 PNG hashes and recomputed all pairs.
- A separate repeat control captured each of the four phone states twice on each unchanged build. All eight new cross-build pairs matched exactly. Comparing each differing archived image with either fresh capture of the same build reproduced the full original RGB delta, accounting for all 864 pixels with equal geometry. The full hardware result remains a failure, with separate evidence for capture variability.
- The offline repeat verifier checks the sealed indexes, raw screenshots, captured geometry, and prepared scenario. It requires two byte-exact decoded repeats per side and one historical outlier for each differing pair. It documented all 864 pixels with no tolerance. Run it with the original hardware matrix directory, the repeat capture directory, and the sealed repeat index SHA-256.

```text
node tools/scripts/verify-rendering-visual-repeats.mjs MATRIX_DIR REPEAT_DIR 0d7ed165312b85df94244716d9bf7ed8d18cf36fa2b68bfb9819b061f72919f0
```

- Two browser selections retained all 497 unaffected row nodes and performed zero full-deck hydration calls. The clone probe observed one clone call per request, and all eight closed Deck Maker factories stayed uncalled. After eight lifecycle cycles, listener, view, timer, and tracked request counts returned to their settled baseline. Weak references to detached nodes cleared after collection.
- Both build commands reproduced all 143 generated artifacts byte for byte with pinned local dependencies. The clean SillyTavern 1.19.0 install opened the Library and the Workbench, persisted a Custom Lorecard edit across reopen, and opened Deck Maker with zero page errors. The install used the shipped bundle and assets.
- The same clean-host checks passed on current checkpoint `1a69d9e1` with a fresh isolated profile. At 430 × 820 and DPR 3, Edge loaded a Library thumbnail and the canonical detail cover, released the discarded old cover's handlers, and returned to browse on close. Desktop and phone reported zero page errors.

## Evidence

The original index SHA-256 is `c3d1a203ce69c90cc2172a4f11e2f1be75c1a861e0aa5a2cf9069bac230a59ca`. The testing index SHA-256 is `91a4b600dd290c2952044b78a591000ccd9d66137657eb6ea3ffcda157f4d08d`. The 162-pair visual index SHA-256 is `b4340f21d724aafb4cd9bf14eafca697f49481b0a0c829edda2707ccf26cdfb7`.

These paths are relative to the exported evidence directory. Paths beginning with `.tmp/` refer to the local capture workspace.

| Artifact | Exported path |
| --- | --- |
| Original timed cases and tablet screenshots | `saga-rendering-original-baseline/index.json` |
| Testing timed cases and tablet screenshots | `saga-rendering-candidate-failed/index.json` |
| All 162 paired screenshots and comparisons | `saga-rendering-candidate-failed/evidence/visual/visual-proof.json` |
| Numerical diagnostic results | `saga-rendering-candidate-failed/reports/candidate-391de0bb-timing-diagnostics.json` |
| Strict evaluation replay | `saga-rendering-replay-verification/strict-replay.json` |
| Library observer cleanup comparison | `saga-library-observer-release-checkpoint/library-observer-release-timing/RESULT.md` |
| Full default-hardware visual result for `1a69d9e1` | `saga-hardware-visual-1a69d9e1/hardware-visual-matrix-1a69d9e1/RESULT.md` |
| Same-build phone capture repeat controls | `saga-phone-hardware-repeat-controls/phone-hardware-repeats-1a69d9e1/RESULT.md` |
| Clean SillyTavern smoke on `1a69d9e1` | `saga-clean-host-1a69d9e1/clean-host-smoke-1a69d9e1/RESULT.md` |
| Workbench first-use import timing | `saga-workbench-first-import-diagnostic/workbench-first-import-comparison/RESULT.md` |
| Workbench fixed Svelte columns | `saga-workbench-fixed-cell-diagnostic/workbench-fixed-cell-comparison/RESULT.md` |
| Workbench table and text-cell layout | `saga-workbench-flow-diagnostics/workbench-table-flow-comparison/RESULT.md` |
| Workbench delegated row tooltips | `saga-workbench-delegated-tooltips/workbench-delegated-tooltip-comparison/RESULT.md` |
| Library focused removal and layout callers | `saga-library-focused-removal/library-focused-removal-diagnostic/RESULT.md` |
| Library combined viewport and scroll changes | `saga-library-combined-layout/library-combined-layout-comparison/RESULT.md` |
| Workbench virtual entry copy | `saga-workbench-owned-entry-clone/workbench-owned-entry-clone-comparison/RESULT.md` |
| Combined Workbench cold readiness | `saga-workbench-combined-cold/workbench-combined-cold-comparison/RESULT.md` |
| Workbench cold source, import, mount and paint traces | `saga-workbench-combined-phase-trace/workbench-combined-phase-trace/RESULT.md` |
| Workbench selector initialization and scheduling | `saga-workbench-selector-timing/workbench-selector-initialization-probe/RESULT.md` |
| Corrected collector and smoke captures | `saga-workbench-selector-collector/workbench-selector-collector/RESULT.md` |
| Static editable, draft and read-only row modes | `saga-workbench-static-row-modes/RESULT.md` |
| First-open controller render | `saga-workbench-first-render/RESULT.md` |
| Corrected-collector comparison against the original in all Workbench cold tuples | `saga-workbench-corrected-cold-matrix/RESULT.md` |
| Repeated Library cover path validation | `saga-library-cover-path-work/RESULT.md` |
| Repeat Library detail cover requests and decode timing | `saga-library-detail-image-lease/RESULT.md` |
| Browser identity guard and actual collector smoke | `saga-browser-capture-identity/RESULT.md` |
| Detached mobile Library sheet construction | `saga-library-mobile-fragment/RESULT.md` |
| Workbench import and row preparation overlap | `saga-workbench-import-overlap/RESULT.md` |
| Updated Edge Workbench behavior suite | `saga-workbench-edge157-parity/RESULT.md` |
| Library cover resize delivery DPR reads | `saga-library-resize-dpr/RESULT.md` |
| Workbench desktop shell centering and focus layout | `saga-workbench-shell-flow/RESULT.md` |
| Workbench Pack Health normalization | `saga-workbench-health-hot-path/workbench-health-hot-path-RESULT.md` |
| Workbench fused Svelte row template | `saga-workbench-fused-row/RESULT.md` |
| Workbench grouped Svelte row projection | `saga-workbench-projected-row/RESULT.md` |
| Workbench cold composition against the original build | `saga-workbench-cold-composition/RESULT.md` |
| Library inline tile sizing and derivative boundaries | `saga-library-inline-tile-boxes/library-inline-tile-boxes-RESULT.md` |
| Workbench row column layout and phone timing | `saga-workbench-row-columns/workbench-row-columns-RESULT.md` |
| Workbench reuse of detached entry data | `saga-workbench-projection-owned/workbench-projection-owned-RESULT.md` |
| Library warm detail traces and cover dimension hints | `saga-library-current-interaction/library-current-interaction-RESULT.md` |
| Workbench phone traces and keyed table with delegated tooltips | `saga-workbench-composition-phone/workbench-composition-phone-RESULT.md` |
| Keyed Workbench table across the remaining ten cold cases | `saga-workbench-native-delegated-expansion/workbench-native-delegated-expansion-RESULT.md` |
| Mobile Library passive tooltip registrations | `saga-library-passive-mobile-tooltips/library-passive-mobile-tooltips-RESULT.md` |
| Keyed Workbench readiness phases and desktop table sizing | `saga-workbench-keyed-gap/workbench-keyed-gap-RESULT.md` |
| Keyed Workbench with desktop and narrow layout rules | `saga-workbench-layout-composition/workbench-layout-composition-RESULT.md` |
| Library image observer reuse during overlay replacement | `saga-library-observer-batch/library-observer-batch-RESULT.md` |
| Workbench shared row and checkbox click callbacks | `saga-workbench-shared-clicks/workbench-shared-clicks-RESULT.md` |
| Mobile Library cover layout containment | `saga-library-cover-layout-containment/library-cover-layout-containment-RESULT.md` |
| Workbench direct labels for delegated tooltips | `saga-workbench-direct-tooltip-labels/workbench-direct-tooltip-labels-RESULT.md` |
| Library resolved cover metadata reuse | `saga-library-resolved-cover-reuse/library-resolved-cover-reuse-RESULT.md` |
| Workbench keyed Category and Relevance cells and phone mount traces | `saga-workbench-keyed-flat-cells/RESULT.md` |
| Workbench direct checkbox layout and mount phase spans | `saga-workbench-direct-checkbox/RESULT.md` |
| Inline Svelte shell and Library renderer interval replay | `saga-workbench-inline-shell/RESULT.md` |

The separate numerical report `candidate-391de0bb-timing-diagnostics.json` has SHA-256 `90d49ceadc6bc14131ce902158f4f6737912b068ac26bd98319ea342b896bf11`. The complete failed candidate bundle retains the strict evaluator result, including the original comparison error.

Local checkpoint `64f88125` records the browser parity, evidence validation, and CI checks. A local run of the Chromium CI command passed all 36 Workbench cases, and all 33 evidence-tooling tests passed. The validator checks for one start and one completion in chronological sampling evidence. Re-evaluating the sealed bundles with the committed tool produced the same visual-failure result byte for byte.

The run artifacts retain the raw samples, request journals, screenshots, fixture and collector bytes, and separate source and browser observations. The desktop 4× trace of the rejected native-table experiment is diagnostic evidence. The runtime measured here and installed for human testing uses the original Svelte row implementation.

## Reproduce the measured comparison

Run from the Saga checkout with the pinned development dependencies installed. Set `$evidenceRoot` to the directory containing the exported `saga-rendering-original-baseline` and `saga-rendering-candidate-failed` bundles. This first command replays the strict result from those bundles without opening a browser. The measured pair exits with status `1` and the saved result hash is `4eb3d4111ca6f01730cc3ec499742ed9287c6b6e2238b68f8be9ef7130e9c5a5`.

```powershell
$originalBundle = Join-Path $evidenceRoot 'saga-rendering-original-baseline'
$testingBundle = Join-Path $evidenceRoot 'saga-rendering-candidate-failed'
node tools/scripts/evaluate-rendering-performance.mjs $originalBundle $testingBundle
```

The numerical replay recomputes all 72 diagnostic classifications with the preserved methodology and compares the output to the archived report byte for byte. The strict failure remains the release result.

```powershell
$numericReplay = Join-Path $evidenceRoot 'saga-rendering-numerical-replay/replay-numerical-diagnostics.mjs'
node $numericReplay $originalBundle $testingBundle .tmp/saga-rendering-numerical-replay.json
```

To repeat the historical raw collection, use the archived six-file collector and fixture. Verify the actual Edge binary against the hash in this report. The live collector has a different protocol fingerprint. The following Windows commands prepare fresh exports and collect the two complete matrices sequentially. Each raw matrix needs the supplemental proofs described in the [acceptance bundle contract](SAGA_RENDERING_EVIDENCE.md) before evaluation.

```powershell
$replay = Join-Path (Get-Location).Path '.tmp/saga-rendering-replay'
if (Test-Path -LiteralPath $replay) { throw 'Choose a fresh replay directory.' }
New-Item -ItemType Directory -Path $replay | Out-Null
$protocol = Join-Path $replay 'protocol'
$fixture = Join-Path $replay 'fixture'
Copy-Item -LiteralPath (Join-Path $originalBundle 'protocol') -Destination $protocol -Recurse
New-Item -ItemType Directory -Path $fixture | Out-Null
Copy-Item -LiteralPath (Join-Path $originalBundle 'fixture-source.mjs') `
    -Destination (Join-Path $fixture 'performance-fixtures.mjs')
$env:SAGA_CHROME_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/156.0.4314.58/msedge.exe'
$expectedEdge = 'd35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b'
if ((Get-FileHash -LiteralPath $env:SAGA_CHROME_PATH).Hash -ne $expectedEdge) { throw 'Edge binary differs.' }
$builds = @(
    @{ Name = 'original'; Revision = '1a92c7082241af393146215a39ce2073ce646db2' }
    @{ Name = 'testing'; Revision = '391de0bbf04b34a2a9fadc98bf38327d717f756e' }
)
foreach ($build in $builds) {
    $archive = Join-Path $replay "$($build.Name).tar"
    $source = Join-Path $replay "$($build.Name)-source"
    $output = Join-Path $replay "$($build.Name)-capture"
    New-Item -ItemType Directory -Path $source | Out-Null
    git archive --format=tar "--output=$archive" $build.Revision
    if ($LASTEXITCODE -ne 0) { throw 'Git archive failed.' }
    tar -xf $archive -C $source
    if ($LASTEXITCODE -ne 0) { throw 'Archive extraction failed.' }
    node (Join-Path $protocol 'tools/scripts/capture-rendering-performance.mjs') `
        --source-root $source --source-revision $build.Revision --fixture-root $fixture `
        --output $output --browser chromium --cpu-rates '1,4' --cold-runs 100 --warm-runs 200
    if ($LASTEXITCODE -ne 0) { throw 'Capture failed.' }
}
```
