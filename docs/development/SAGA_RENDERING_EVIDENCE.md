# Rendering acceptance bundle contract

This is an input-format guide, not a measured acceptance report. The frozen
`task9-v1-20261106` method requires two complete bundles: exactly 40 timed tuples,
100 cold opens / 200 chronological warm interactions per applicable tuple, and
five tablet references. Warm `initialOpen` is one descriptive open. Missing
structural/parity proof fails; unavailable required numbers are JSON `null` and
remain inconclusive. Never replace them with zero. Neither CI nor a toy fixture
establishes measured acceptance.

Run only after both immutable matrices and supplemental evidence are sealed:

```text
node tools/scripts/evaluate-rendering-performance.mjs BASELINE_BUNDLE CANDIDATE_BUNDLE OUTPUT.json
```

Exit codes are 0 pass, 1 fail, 2 inconclusive (also CLI usage errors). The pure
`evaluateRenderingPerformance(baseline, candidate)` export returns
`{status, findings}` for complete matrix bundles. The separate loader reads only
explicit paths inside each bundle, verifies SHA-256 bytes, rejects traversal and
symlink escapes, and never hashes the changed live evaluator as the frozen
measurement protocol.

Each bundle contains original `index.json`, every raw capture JSON/PNG, archived
`fixture-source.mjs`, the exact six archived protocol files, and a supplemental
`acceptance-evidence.json`. Every reference has `{file, sha256}` with a canonical
relative forward-slash file path. A source or asset entry also has `path`, its
canonical path inside the immutable source export. References can point into
JSON manifests, which themselves explicitly reference further artifacts. Keep
original raw samples unchanged; seal their SHA-256 values in `rawCaptures`.

The evidence manifest has this shape (ellipses are explanatory, not valid JSON):

```text
{
  schemaVersion: 1,
  protocolManifest: {file, sha256}, fixture: {file, sha256},
  sourceManifest: {file, sha256},
  canonical: {index: {file, sha256}, exports: [{file, sha256}, ...]},
  browserBinaryHash: "SHA-256 of actual browser executable",
  assets: [{path, originalPath, file, sha256, width?, height?}, ...],
  rawCaptures: [{file, sha256}, ...40 raw JSON files],
  proofs: {
    "asset-serving": {artifact: {file, sha256}, probe: {file, sha256}},
    sampling: {...}, functional: {...}, visual: {...}, lifecycle: {...},
    structure: {...}, "lazy-import": {...}, build: {...}, host: {...},
    "source-review": {...}
  },
  platforms: [{name, available: false, reason},
              {name, available: true, artifact: {file, sha256}}, ...]
}
```

Every proof artifact is inspected as JSON. Its common envelope is
`{sourceHash, paritySourceHash, protocolHash, probeHash, ...observations}`.
`sourceHash` uses the frozen collector algorithm; `paritySourceHash` uses the
existing parity algorithm. These hashes intentionally differ. `probeHash`
identifies the actual probe/script bytes. Wrap existing observed reports with
their source/probe bindings and explicit references to original output; do not
invent observations or turn an uninspected report into a `pass: true` field.

The source manifest is `{sourceRevision, paritySourceHash, files:[...]}`. Each
file entry contains `{path, collectorPath?, file, sha256}`. Both fingerprints are
recomputed from those same archived bytes. The collector includes all `src`,
`styles`, `manifest.json`, and `assets/generated` files; parity includes only
`src` and `styles`. On the frozen Windows collector, generated asset hash
prefixes have backslashes while `src`/`styles` use forward slashes. Preserve that
fact in `collectorPath`; the loader path itself always uses forward slashes.

```text
node tools/scripts/prepare-rendering-source-evidence.mjs IMMUTABLE_SOURCE_ROOT BUNDLE_ROOT BUNDLE_ROOT/index.json
```

This supplemental preparation reads/copies the explicit source inventory only
after timing. Its output `source-manifest.json` must reproduce the recorded
collector hash before it can bridge the parity fingerprint. Do not run it
against a live mutable checkout or while a matrix is timing.

The six protocol file paths, order, individual hashes and aggregate must match
the archived `protocolManifest`. Its aggregate is the frozen
`9a3dd0668f9be5b9403977ee2b2e65cf2a614ecf12d2737f15812e61bc94a6a3`;
the fixture hash is
`acc70381c0758438d0f1f3b59153fc3be876d82b8b764a11e15c78de6e4e6216`.
Source revisions/hashes and generated derivative manifests intentionally differ
between builds. Original index, original covers, absent-cover identities and
canonical exports must agree.

This accepted analysis remains sealed to the six-file9a3 protocol. The live
collector now also snapshots/hashes the acceptance, statistics and evidence
helpers imported by the live report. Its future nine-file protocol digest is
distinct; it cannot relabel these archived six-file inputs or either existing
matrix. Do not change source-hash normalization or old archived bytes when
preparing a future live protocol.

Required proof observations:

| Kind | Inspected observations |
| --- | --- |
| asset-serving | `serverHash` of frozen `serve-visual-smoke.mjs`; `responses:[{path,url,status,sha256,sourceHash,...}]` from a separate actual HTTP/body-hash probe against the immutable source export. Include every original and selected derivative, with canonical original mapping and derivative dimensions in `assets`. |
| sampling | `browserBinaryHash`; chronological `events:[{at,type,...}]` with start/completion and an external interference log. Suspension, interference, crash or dropped data invalidates inference. Preserve the one-browser-process cold independence limitation. |
| functional | `runs` for Chromium, Firefox and WebKit, each with actual `caseCount`, unique `cases`, bound `sourceHash`, and a hash reference `tap` to complete output. Current final suite has 36 cases per engine. TAP must have zero failed/skipped/todo cases. Source ownership/race behavior is also reviewed below. |
| visual | Complete `pairs` inventory (current reviewed plan: at least 162). Each pair retains the Task8 `id`, `state`, `profile`, `theme`, `comparison`, and actual `images` records, with hash refs for `baseline`, `candidate`, and `diff` when pixels changed. All 12 Library 77/1000 profile/theme pairs need visible decoded canonical cover evidence. The gate checks observed source URLs, clip, box, DPR, verified original/derivative hashes and pixel quality. Non-cover views can have empty image lists. |
| lifecycle | `cycles`, `settledMs`, `collectionMethod`, and measured `before`/`after` counts for `views`, `listeners`, `timers`, `detachedEditors`, `pendingJobs`. No retained increase after documented settling/collection. |
| structure | Actual `unaffectedRowsCompared`, `replacedUnaffectedRows`, per-request `cloneCallsPerRequest` and per-selection `selectionFullPayloadModelCalls`. Record `closedFactories` counts for `context-plan`, `coverage-plan`, `deck-health`, `lorecards`, `review-queue`, `scope-brief`, `story-outline` and `title-sets`. Count full-payload hydration/model work separately from the cheap view projection. DOM mutation totals alone are insufficient. |
| lazy-import | Actual first-use request inventory `firstUseRequests`; `firstUseTransferBytes`, `firstUseEvaluationMs`, `lateImageBytes` as numbers or explicit null. Raw startup journals independently reject early compiled requests. Deferred first-use work stays in the report. |
| build | `tracked` and independently `rebuilt` complete arrays of `{path,file,sha256}`. Both must match every logical `path` and its SHA-256 in the immutable source manifest under `src/ui/generated/workbench/`, `src/loredecks/generated/` and `assets/generated/loredeck-covers/`. Preserve actual artifact bytes. Existing adapter tests separately exercise stale, missing and changed files. |
| host | `hostVersion`, `hostRevision`, `installCommand`, observed `nodeModulesCount:0`, `localBuildCount:0`, `libraryDecks:77`, `libraryCovers:70`, `readonlyRows`, `requestedEdit`, `persistedEditAfterReopen`, and `pageErrors:[]` from the clean installed host. |
| source-review | `unresolvedFindings:[]`, and claims for `single-controller-store`, `no-state-manager-copy`, `bundle-self-contained`, `pending-source-save-ownership`, `registries-pending-unmigrated`, `canonical-export-unchanged`. Each satisfied claim cites actual immutable `{path,sha256,line}` source evidence. This permits scoped semantic review rather than inventing a numeric proxy. |

For asset identity, the frozen collector deliberately does not retain response
bodies. Preserve its real per-request ID/status/encoded transfer observations.
Establish served-byte identity separately through the frozen static server and
immutable source mapping; do not fabricate a body hash for every timed request.

```text
node tools/scripts/record-rendering-asset-identity.mjs IMMUTABLE_SOURCE_ROOT FROZEN_PROTOCOL_ROOT ASSET_SPECIFICATION.json BUNDLE_ROOT
```

`ASSET_SPECIFICATION.json` supplies `{sourceHash,paritySourceHash,protocolHash,sourceManifestFile,
assets:[{path,originalPath,width?,height?},...]}`. Output `asset-identity.json`
contains the exported asset references and the observed proof envelope; archive
the exact probe bytes as its `probe` reference. This probe is supplemental and
must not overlap either timed matrix. Do not use encoded file sizes or unique
URL counts instead of real transfers. Repeated requests for the same URL still
count once per distinct request ID.

Native availability entries explicitly include Safari, Android, iOS and
Safari 14. Unavailable hardware on Windows is an honest coverage limit. Linux
Playwright WebKit and phone emulation do not establish native device coverage.
Other available native browser evidence belongs in the same inventory with
actual version, executable, probe and output references.

The exact method uses deterministic 20,000-replicate percentile bootstrap,
nearest-rank p95, cold complete-record resampling, and circular warm blocks of
five opposite-direction pairs plus ten-pair sensitivity. Differing sensitivity
classifications are inconclusive. It reports approximate per-comparison bounds
and baseline variability with no second noise allowance, pooling, trimming or
optional resampling. Gain equality at 20% and readiness budget equality pass;
equal cold cover bytes fail strict reduction.

Run synthetic full inference separately:

```text
node tools/scripts/test-rendering-performance-acceptance-structure.mjs
node tools/scripts/test-rendering-performance-observation-validation.mjs
node tools/scripts/test-rendering-performance-protocol-fixtures.mjs
node tools/scripts/test-rendering-performance-acceptance.mjs
```

The last uses the checked-in immutable protocol fixtures at
`tests/fixtures/rendering-performance-9a3` (or an explicit
`SAGA_ACCEPTANCE_PROTOCOL_ROOT` exact-copy override) and deliberately exercises the full
20,000-replicate method. It is not in the fast alpha gate and cannot substitute
for either real matrix. Its execution remains held while timing is live.

The fixture's historical acc70381 bytes have CRLF line endings; preserve the
specific `-text` attribute exception. The six protocol files use narrow LF
attributes. Normalizing the fixture would change the sealed method input.
The fast protocol fixture test checks all individual hashes, both sealed hashes
and Git's actual clean filter with `core.autocrlf=true`, without writing Git
objects or checking out files.
