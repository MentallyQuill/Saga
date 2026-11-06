# Saga Lorecard Context Storage Patch — November 5, 2026

This patch for `0.4.0-alpha.4` (**Scribe**) fixes [issue #4](https://github.com/MentallyQuill/Saga/issues/4): saving a Lorecard without numeric Context bounds could invent a `0–0` window and silently block it from prompt injection. The alpha release identifier is unchanged; per-chat state advances to schema `28`.

## Lorecard storage and injection

- Manual Lore Notes and Story Scan cards without Context gates stay ungated after saving, acceptance, and chat reload. Elevated cards receive the same correction; normal relevance, mute, and other injection controls still apply.
- Missing numeric bounds remain empty in both Context windows and coordinates. Explicit zero bounds and open-ended windows retain their meaning. This also prevents new corruption of Loredeck cards that lack one or both numeric bounds.
- Malformed numeric Context constraints remain blocked after saving and reloading.
- The Injection preview checks the accepted Lorecard matrix instead of legacy arrays. When all otherwise eligible cards in a relevance tier are blocked by Context, the preview explains that cause instead of claiming there are no Accepted Lorecards.

## Recovery of existing cards

On the first read of an older chat state, schema `28` removes recognizable fabricated Context blocks from accepted and pending manual or Story Scan cards. Normal chat loading records a migration backup before repair and requests persistence of the repaired state even when the backup makes the state larger.

Recovery is deliberately narrow: it requires the complete old empty Context representation with numeric `0/0` bounds, recognizable manual or Story Scan provenance, and no additional Context fields, coordinates, or Loredeck provenance. Deck-backed records, other constraints, and ambiguous records remain unchanged by recovery. Raw imported zero windows and gates in schema `28` state are preserved.

An intentionally imported gate identical to the entire legacy artifact is indistinguishable from that artifact and may be recovered. Existing Loredeck cards with ambiguous saved zero bounds are not automatically repaired. See [Storage And State Safety](../user/STORAGE_AND_STATE_SAFETY.md) for backup and recovery controls.

## Verification

The local validation passed all **102 syntax checks and 118 scripts** in the alpha gate, including the secret scan. Focused coverage includes six storage tests, eight recovery tests, and Injection preview behavior. Regression checks cover repeated saves, draft acceptance and reload, Elevated cards, legitimate zero and open-ended bounds, malformed constraints, older imports, migration backups, and persistence. Independent code review found no remaining actionable issues.

Run the release gate with:

```powershell
node tools/scripts/run-alpha-gate.mjs
```

No live SillyTavern UI, provider, or user-chat storage run was performed.
