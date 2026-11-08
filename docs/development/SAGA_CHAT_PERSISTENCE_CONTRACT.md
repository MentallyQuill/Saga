# Chat persistence capability

`saveState()` changes current-chat metadata optimistically. Its result distinguishes `pending`, `unverified`, `persisted`, `failed`, and `cancelled`; `persisted` is never inferred from a legacy `saveMetadata()` returning void. Rejected Promises and explicit `false` / `{ok:false}` refusals are consumed and exposed. Current-chat prompt synchronization remains available after an optimistic request, with ownership checked again inside the queued microtask.

The primary host's [saveMetadata and saveChatConditional implementation](https://github.com/SillyTavern/SillyTavern/blob/release/public/script.js#L9408) waits on global chat-saving state, then reads the selected group/current chat, and catches save errors without rethrowing. Calling that function with a captured `this` does not bind its destination; a fulfilled `Promise<void>` proves neither the destination nor durability. Saga therefore returns `status:'unverified', persisted:false` for this capability. The explicit durable APIs return `ok:false` in that case. This is an observable host limitation, rather than a successful durable backup or restore.

Hosts or integrations can provide `ctx.sagaPersistence` (or an explicit `options.persistenceAdapter`) with this contract:

```js
{
    originBound: true,
    async saveState({ snapshot, origin, signal }) {
        // Persist snapshot to origin, without reacquiring the active chat.
        // Reject/return {ok:false,error} on failure; respect signal where supported.
        return { ok: true, persisted: true };
    },
}
```

`snapshot` is a detached copy of all chat metadata, including `snapshot.saga`; nonserializable metadata is refused before transport. `origin` includes the captured chat ID, character/group IDs, operation ID, and job generation. The adapter must bind the destination before any await and positively acknowledge persistence after its write completes. Wrapping legacy `saveMetadata()` and then returning success does not satisfy this contract. Bound writes are serialized per metadata object and chat identity; queued writes check origin again immediately before invoking the adapter. Saga checks origin identity after completion; a switch/disable revokes follow-up state commits and prompt synchronization. Legacy requests are invoked only while their origin is current, but the host may still choose a different destination after its own await; automatic results cannot claim durable acknowledgement for that request.

`saveStateDurable`, `createStateBackupDurable`, `restoreStateFromBackupDurable`, and `restoreStateFromExportDurable` require that acknowledgement before reporting success. Durable restores first persist a protective backup; a refused or unverified backup stops replacement. Continuity and Lore Automation retain their optimistic compatibility behavior and include `persisted:false, persistenceStatus:'unverified'` in their results on legacy hosts.

The synchronous save/backup/restore APIs remain compatibility entry points for live metadata changes. Their structured results expose persistence state; callers needing durability must use the explicit durable variants. Saga's write queue is local to this browser and metadata identity. An adapter used by multiple tabs/processes must coordinate those writers and preserve the previous durable version on refusal; `originBound:true` alone does not establish a cross-tab transaction.

State Safety reports an unverified legacy **Backup Now** request as an in-chat backup with a warning. The restore buttons explain the same limitation in their confirmation dialog. After confirmation, `restoreStateWithBackup` waits for the protective save and accepts an `unverified` legacy request when `allowUnverified` is explicitly enabled. A rejected or cancelled protective save still stops the restore. A completed legacy restore reports `ok:true, persisted:false, status:'unverified'` and the UI shows a warning. The selected chat must remain current from the start of the UI action through the restore.

When verification is unavailable or refused, the live metadata and backup snapshots remain recoverable in memory. Use **State Safety → Export State** to download the current state JSON before closing, reloading, or trying a destructive cleanup. Cleanup stops after an unverified or refused protective backup. A reload can recover only whatever the host actually saved. The current host has no independently verifiable destination/write API for an origin-bound adapter.
