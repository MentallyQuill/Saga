# Saga Storage And State Safety

Saga stores large Saga-owned content outside `settings.json` wherever the SillyTavern files API is available. This keeps generated Loredecks, imported packages, Deck Maker drafts, Theme Packs, Icon Sets, and passive assets from bloating the main settings file.

## Storage Model

Saga uses a flat JSON file model under SillyTavern's `/user/files` area. It does not require a server plugin or a private filesystem workspace.

`settings.json` should keep compact preferences and pointers:

- current Saga settings and provider preferences
- the selected Theme Pack and Icon Set IDs
- compact storage metadata under `sagaStorage`
- diagnostics timestamps

`/user/files` should hold Saga-owned payload files:

- `saga-storage-index.v1.json`: master list of Saga-managed files
- `saga-library-index.v1.json`: Library folders, placements, installed Lorepack summaries, and payload references
- `saga-creator-index.v1.json`: Deck Maker project summaries and active project pointers
- `saga-pack-*.v1.json`: Generated and Custom Lorepack payloads
- `saga-creator-project-*.v1.json`: in-progress Deck Maker project stage artifacts
- `saga-theme-index.v1.json`: installed Theme Pack records and payload references
- `saga-theme-pack-*.v1.json`: Custom Theme Pack payloads
- `saga-iconset-index.v1.json`: installed Icon Set records and payload references
- `saga-iconset-*.v1.json`: Custom Icon Set manifests
- passive assets referenced by imported packages, such as cover images and raster icons

Bundled Lorepacks, bundled Theme Packs, bundled Icon Sets, and bundled passive assets remain in the extension repository. Saga records references to them but does not copy every bundled payload into `/user/files`.

## Imports

Loredeck package imports write the parsed package payload to Saga storage and register it in the Library index. When an imported `.saga-loredeck.zip` includes a cover image or other passive assets, Saga stores those assets as files and keeps JSON references to them.

Theme Pack imports store JSON Theme Pack payloads as data. Theme Packs cannot run code.

Icon Set imports store JSON manifests and approved raster icon assets. SVG icon import remains intentionally restricted in the first pass because SVG can carry active content in some environments.

## Deck Maker Projects

The Deck Maker stores heavy in-progress project data in Deck Maker project payload files. This includes scope, outline, title batches, Context and tag planning, Lorecard draft batches, review queues, generation unit metadata, and generated-pack links.

Deck Maker index keeps the shelf summary and active project pointer compact. The current chat state can still point to the active Deck Maker project, but it should not carry the full staged project payload.

## Settings Migration And Recovery

On startup, Saga checks for supported Library, Deck Maker, Theme Pack, and Icon Set registries still stored inline in `settings.json`. For supported unversioned and schema-1 data, Saga first writes and verifies an exact-source recovery copy at `/user/files/saga-inline-settings-backup.v1.json`. It then writes and verifies the external payloads and their indexes before compacting the inline registries.

If the backup or an external write cannot be verified, the source data stays available and migration stops with a reportable error. Saga also refuses to overwrite an existing payload or external layout that conflicts with the inline source. Leave the recovery file in place until you have verified the migrated content. Unsupported settings schemas are preserved for recovery rather than guessed at or migrated partially.

The backup and external files can be verified with **Settings > Advanced > State Safety > Verify Storage**. A host that reports only that it scheduled a settings save cannot confirm whether the compacted settings reached disk; Saga records that result as unverified and keeps the verified backup.

Saga commits related payload and index changes through a recoverable journal. A refused write keeps the previous verified data and leaves the failed operation visible for retry; an unrelated successful write does not clear that failure. If Saga restarts mid-transaction, startup recovery restores the prior data or finishes a committed cleanup before normal use.

Separate browsers, devices, or other clients can still update the same files at the same time when the SillyTavern storage service provides neither cross-tab locking nor server-side conditional writes. Saga detects many stale revisions, but cannot promise conflict-free writes against an uncoordinated external client.

## State Safety

Open **Settings**, switch to **Advanced**, then open **State Safety**.

**Backup Now** takes an in-chat snapshot. **Restore Latest Backup** and **Restore From File** both back up the current Saga state before replacing it. On standard SillyTavern, Saga can request the save but cannot confirm it reached disk. If you confirm a restore, Saga applies it to the open chat and warns you when persistence is unverified. Use **Export State** before restoring if you need a separate recovery copy.

State Safety has storage maintenance controls:

- **Verify Storage** reads Saga's master storage index and checks whether tracked files still exist and parse as expected.
- **Settle Storage Writes** waits for queued Saga storage writes or runtime storage errors to settle, then verifies storage again. It is only enabled when queued writes or storage errors are known.
- **Clean Missing Records** verifies the index and removes records for missing non-index files. It does not delete Library rows and does not scan for unknown orphan files.

The State Safety status pills and key-value rows summarize latest storage integrity, backups, and recent storage or cleanup log entries.

## Danger Zone Cleanup

Open **Settings**, then use **Danger Zone** at the bottom of the Settings tab. Danger Zone is split by scope:

- **Active Chat** actions affect only the current chat's Saga runtime state.
- **Global** actions affect Saga settings, installed custom content, stored Saga API keys, or Saga-owned `/user/files` storage.

The Global summary rows render from cached state first, then refresh from a read-only cleanup preview. After that refresh, **Cleanup file scope** shows the total tracked/known/referenced Saga files Total Saga Cleanup can target, with tooltip detail for tracked files, known index files, additional referenced files, and Health repair sessions. Unknown unindexed orphan files may still remain because Saga cannot list arbitrary `/user/files` folders.

Global actions are destructive:

- **Reset All Settings** resets Saga preferences, provider selections, generation settings, injection settings, theme choices, and UI defaults. It also removes stored Saga API keys. It does not delete custom Loredecks, Deck Maker projects, custom Theme Packs, or custom Icon Sets.
- **Remove Custom Themes + Icon Packs** deletes imported custom Theme Pack payloads, custom Icon Set manifests, and uploaded raster icon assets. Bundled Theme Packs and bundled Icon Sets remain available, and the active appearance falls back to bundled defaults.
- **Remove Custom Loredecks** deletes custom, imported, and generated Loredeck Library records, payload files, cover/passive assets, and Pack Health repair sessions for those Loredecks. Bundled Loredecks remain available. Deck Maker projects are kept because they are drafts, not installed Loredecks.
- **Total Saga Cleanup** requires typing `DELETE Saga`. Its confirmation preview includes tracked Saga files, known index files, referenced Saga files discovered from domain records and payloads, externalized custom content, and Health repair sessions. It deletes tracked Saga-owned custom storage files, known Saga index files, referenced Saga files, custom/imported/generated Loredecks, Deck Maker projects, custom Theme Packs, custom Icon Sets, stored Saga API keys, Saga settings, active-chat Saga state, and State Safety backups. Bundled extension content remains because it ships with Saga.

Supported legacy inline registries migrate on startup as described in [Settings Migration And Recovery](#settings-migration-and-recovery). Keep the verified recovery file until you have confirmed the external payloads and indexes. Do not use **Total Saga Cleanup** or reinstall solely because an older supported registry is still in `settings.json`.

After Total Saga Cleanup, Saga should still open without reinstalling. New imports, Deck Maker saves, Theme Pack imports, and Icon Set imports recreate the needed storage index files. If Total Saga Cleanup partially fails, Saga still clears prior State Safety backups, but writes one compact State Safety warning so the retry reason remains visible after the reset. If you are in Basic, switch to Advanced and open State Safety before retrying.

## Cleanup Boundaries

Because Saga is using SillyTavern's flat files API, it can confidently clean records it owns in its master index.

It can:

- remove stale master-index records for missing non-index files
- delete installed custom content through Danger Zone Global actions
- delete known Saga index files during Total Saga Cleanup
- preserve protected index records for manual review
- report storage runtime failures and pending writes
- record cleanup actions in State Safety logs

It cannot reliably scan an arbitrary Saga folder for orphan files because this storage model does not assume folder listing support. Unknown orphan-file cleanup remains a manual or future-host-feature task. Total Saga Cleanup deletes files that Saga tracks, knows by fixed index filename, or discovers through Saga domain records and payload references; it should not be read as a guarantee that unindexed unknown files are discoverable.

If Total Saga Cleanup cannot delete a tracked non-index file, Saga keeps the master storage index and storage bootstrap settings so the remaining file references are still available for a retry. If cleanup reports a storage error without a specific failed delete, switch to Advanced and check the fresh State Safety warning before retrying.

## Troubleshooting

| Problem | First check |
| --- | --- |
| `settings.json` is growing quickly | Let Saga migrate supported inline registries on startup, then run **Verify Storage**. Check the reported migration status and keep `saga-inline-settings-backup.v1.json` until the external records are verified. |
| Startup reports an inline storage conflict | Keep both the inline settings and recovery file. Saga stopped before replacing the conflicting external data; inspect the migration error and export or resolve the records before retrying. |
| Storage reports a failed write | Keep the previous files and retry the failed operation through the originating Saga workflow. A successful unrelated save does not acknowledge the failure. |
| A Loredeck appears in Library but fails Pack Health after reload | Run **Verify Storage**, then reopen the Loredeck and run Pack Health again. |
| A write seems stuck or a recent import does not appear after reload | Run **Settle Storage Writes**, then **Verify Storage**. |
| Storage reports missing files | Confirm whether the file was manually deleted. Use **Clean Missing Records** only when stale records should be removed from Saga's storage index. |
| State Safety cleanup does not remove a Library item | This is expected. **Clean Missing Records** only removes stale index records. Use **Remove Custom Loredecks** in Danger Zone when you intend to delete installed custom Loredecks. |
| You want to remove every Saga custom file and setting | Use **Total Saga Cleanup** only after exporting anything you want to keep. It resets active-chat Saga state and deletes custom/imported/generated Loredecks. |
| A bundled Lorepack appears in settings metadata | Bundled packs can have compact records or references. Full bundled payloads should stay in the extension repository. |

## Manual Inspection

For alpha testing, inspect the active SillyTavern user profile after imports or generation:

- `settings.json` should not contain full Loredeck entry arrays, full Deck Maker stage artifacts, large Theme Pack libraries, or base64 cover/icon blobs.
- `/user/files` should contain Saga-owned `saga-*.json` records for imported, generated, and custom content.
- imported cover images and icon rasters should appear as passive asset files referenced by JSON.
- `saga-library-index.v1.json` should reflect Library folders and placements.
- `saga-creator-index.v1.json` should reflect Deck Maker project summaries.
- full Deck Maker stage data should live in `saga-creator-project-*.v1.json`.
