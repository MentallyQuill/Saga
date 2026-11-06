# Lorecard Context Storage Implementation Plan

> **For agentic workers:** Use TDD for each behavior and review the final diff.

**Goal:** Fix issue #4 so saving ungated lore does not invent Context bounds, and recover recognizable legacy manual/Story Scan cards.

**Architecture:** Keep the existing normalization and fail-closed injection boundary. Correct numeric compaction, perform a versioned conservative recovery before normalization, and use authoritative accepted lore for preview explanations.

**Tech Stack:** JavaScript ES modules, Node assertions and `node:test`.

**Spec:** https://github.com/MentallyQuill/Saga/issues/4 and the confirmed issue review in this chat.

## Global Constraints

- Preserve explicit numeric zero, real Context constraints, and deck-backed data.
- Leave existing Library and Session UI edits untouched.
- Keep recovery limited to old state and recognizable artifacts; ambiguous records retain their gates.
- Work on local branch `codex/fix-lorecard-context-bounds`; no publication or issue comments.

## Review Focus

- Missing and one-sided bounds must survive repeated storage round trips.
- Explicit zero and malformed bounds must retain their gating behavior.
- Accepted, pending, Story Scan, and Elevated manual cards share the fixed storage path.
- Legacy recovery must be one-time and preserve other gates and pack provenance.
- Preview explanations must use the requested effective relevance tier and current eligibility.

### Task 1: Correct Context numeric storage

**Files:** `src/state/lore-storage-sanitizer.js`, `tools/scripts/test-lore-context-storage.mjs`.

- [x] Establish a failing storage/injection round-trip regression.
- [x] Preserve normalized numeric/null bounds in Context and coordinates.
- [x] Cover one-sided windows, explicit zero, malformed constraints, and pending entries.

### Task 2: Recover recognizable old artifacts

**Files:** state schema/migration and focused regression tests.

- [x] Establish a failing legacy-state recovery test.
- [x] Add a schema-versioned recovery for packless manual/Story Scan entries with only invented zero bounds.
- [x] Verify other gates, deck-backed records, unknown origins, and new explicit-zero records remain intact.

### Task 3: Correct preview explanations

**Files:** `src/runtime/injection-preview-panel.js`, `tools/scripts/test-injection-empty-reason.mjs`.

- [x] Establish a failing authoritative-lore diagnostic test.
- [x] Correct accepted counts and Context-blocked explanations.
- [x] Verify disabled states, relevance, mute, and elevation behavior.

### Task 4: Integrate and verify

- [x] Register focused tests in the alpha gate; the existing CI workflow only covers the separate Loredeck Builder.
- [x] Run focused storage, migration, Context, injection, and preview checks.
- [x] Run the alpha gate; report any failures by name.
- [x] Obtain independent diff review and resolve actionable findings.

## Execution Notes

The user authorized implementation after the issue review. Persistence is handled by the primary agent; recovery and preview diagnostics are delegated with separate file ownership.

The storage regressions failed first on invented zero bounds for Context and coordinates, then on the dropped malformed-bound marker. All six storage tests now pass, including the public draft/accept/save/reload path. Preview behavior and the existing Context reliability, Context gating, pending storage, retrieval audit, prompt lifecycle, and supported import checks pass.

Recovery is restricted to the complete old compacted Context representation and known manual/Story Scan provenance. An intentional old record with the exact same representation cannot be distinguished from an artifact; usable deck-backed zero gates and explicit zero bounds in new state remain protected. Ordinary timeline snapshots cannot prove ungated history because their compactor omits Context.

All eight recovery regressions pass, including actual stored provenance after source metadata loss, malformed old imports, preserved zero/false aliases, and one-time migration backups. Independent review is clear after resolving alias deletion and null-import regressions. The full alpha gate initially stopped at a sandbox-denied scratch-directory write; rerunning with the required filesystem access passed, including the secret scan. No live SillyTavern UI or provider run was performed.
