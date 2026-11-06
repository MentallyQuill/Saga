<p align="center">
  <img src="assets/branding/saga-banner-full.png" alt="Saga: Fandom Loresystem">
</p>

# Saga

**Saga: Fandom Loresystem.**

Saga is a SillyTavern extension for long-form fanfiction and fandom roleplay, where canon timing, secrets, alternate branches, and durable story memory matter--addressing the 'lore-rich', but 'timeline-dumb' problem with LLMs, where they reveal secrets out of step, and create caricatures of beloved characters, poorly expressing them as they should act and exist in that moment in the story.

It turns canon, alternate-universe, crossover, and user-created lore into modular **Loredecks**, reviewable **Lorecards**, context-aware retrieval, and prompt-ready injection.

Saga is a lore system for deciding what belongs in the story **now**: what is true, what is hidden, who knows what, and what has changed in this chat.

The current state of development is **alpha-release**: `0.4.0-alpha.4` (**Scribe**), with minimum SillyTavern version `1.12.0`. Automatic updates are disabled for alpha builds, so update manually from the repository. Bundled Loredecks include Harry Potter, Jujutsu Kaisen, Middle-earth, My Hero Academia, One Piece, Star Trek, and Star Wars. The desktop/tablet shell, phone-width mobile shell, Story Maker, Deck Maker, Loredeck imports, Pack Health, and Basic/Advanced workflows are functional, but set your expectations for 'alpha'. Stability is being improved with testing, and user feedback is highly valued.

## Contents

- [Fast Start](#fast-start)
- [Key Features](#key-features)
- [Documentation](#documentation)
- [Security](#security)
- [Project Layout](#project-layout)
- [Storage](#storage)
- [Authoring Loredecks](#authoring-loredecks)
- [Authoring Openers](#authoring-openers)
- [License](#license)

## Fast Start

<p align="center">
  <img src="assets/documentation/renders/docs-shell-basic-start.png" alt="Saga Basic start checklist and runtime shelf" width="800">
</p>

1. Copy the Saga GitHub URL:

   ```text
   https://github.com/MentallyQuill/Saga
   ```

2. In SillyTavern, open **Extensions** and use **Install Extension** with the copied URL. Reload the page.
3. Saga does not auto-open on first load. Open it from the **Saga** extension dropdown: **Open Saga Window**.
4. Start in **Basic Workflow**. On desktop, go to the **Session** tab, follow **Session Readiness**, and consider viewing the **Basic Walkthrough** below it. On phone width, use the bottom navigation, start from **Session**, and tap the Session summary to open Session Details when you need the readiness checklist or walkthrough.

For guided walkthroughs, see [Basic Workflow](docs/user/BASIC_WORKFLOW.md) and [Advanced Workflow](docs/user/ADVANCED_WORKFLOW.md). For full surface-by-surface guides with screenshots, see the [Saga for Desktop Operator's Manual](docs/user/DESKTOP_OPERATOR_MANUAL.md) and [Saga for Mobile Operator's Manual](docs/user/MOBILE_OPERATOR_MANUAL.md). For detailed authoring workflows, use the dedicated [Story Maker Desktop](docs/user/STORY_MAKER_DESKTOP_GUIDE.md), [Story Maker Mobile](docs/user/STORY_MAKER_MOBILE_GUIDE.md), [Deck Maker Desktop](docs/user/DECK_MAKER_DESKTOP_GUIDE.md), and [Deck Maker Mobile](docs/user/DECK_MAKER_MOBILE_GUIDE.md) guides.

## Key Features

| Surface | What it does |
| --- | --- |
| **Loredeck Library** | Browse Bundled, Generated, and Custom Loredecks; import/export `.saga-loredeck.zip` packages; organize folders; manage the Active Stack; and run Pack Health checks. |
| **Story Maker** | A Session-tab opener workflow for creating, revising, and copying lore-aware opening prose from the active Loredecks, Context, accepted Lorecards, and Reasoning Provider. |
| **Deck Maker** | A staged, review-first workflow for drafting Loredecks with scope planning, Context planning, title batches, timeline/tag planning, Lorecard drafts, retry recovery, review queues, and finalization gates. |
| **Lorecard System** | Suggested lore, Scan Story Lore, Lore Automation levels, Pending Review, accepted Lorecards, relevance tiers, Elevate/Mute controls, and reviewable edits before lore affects the prompt. |
| **Lore Timeline** | An audit and recovery ledger for manual lore, accepted Lorecard changes, restored entries, deleted versions, and continuity-related lore events. |
| **Mobile Shell** | Phone-width operation replaces the desktop rail/drawer with bottom navigation, route pages, subviews, detail sheets, touch-sized controls, and long-press mobile editing where dense desktop controls would not fit. |
| **Injection System** | The final prompt layer that sends only eligible, relevant, Context-aware lore to the model, with Advanced controls for previewing and tuning prompt composition. |
| **Basic/Advanced Workflow Modes** | Basic gives new users the shortest guided path to a working chat. Advanced exposes diagnostics, Deck Maker authoring, Pack Health repair, Continuity, provider settings, and full Injection controls. |
| **Custom Theme Packs** | User-imported Theme Packs and Icon Sets for changing Saga's runtime appearance without changing bundled content. |

## Documentation

Release Notes:

- [Saga Lorecard Context Storage Patch - November 5, 2026](docs/release/2026-11-05-lorecard-context-storage.md): fixes false `0–0` Context gates, recovers recognizable manual and Story Scan cards, and corrects Injection preview explanations.
- [Saga Reliability Patches - October 6, 2026](docs/release/2026-10-06-reliability-patches.md): post-alpha patches for chat ownership, recoverable storage, checkpoint retries, Context safety, Story Maker resume, and bounded resources.
- [Saga 0.4.0-alpha.4 - Scribe](docs/release/0.4.0-alpha.4.md)
- [Saga 0.3.0-alpha.3 - Voyages](docs/release/0.3.0-alpha.3.md)
- [Saga 0.2.0-alpha.2 - The Big Mobile Update](docs/release/0.2.0-alpha.2.md)
- [Saga 0.1.0-alpha.1 - Fox One](docs/release/0.1.0-alpha.1.md)

Release-facing docs:

- [Documentation Index](docs/DOCUMENTATION_INDEX.md)
- [Saga for Desktop Operator's Manual](docs/user/DESKTOP_OPERATOR_MANUAL.md)
- [Saga for Mobile Operator's Manual](docs/user/MOBILE_OPERATOR_MANUAL.md)
- [Story Maker Guide for Desktop](docs/user/STORY_MAKER_DESKTOP_GUIDE.md)
- [Story Maker Guide for Mobile](docs/user/STORY_MAKER_MOBILE_GUIDE.md)
- [Deck Maker Guide for Desktop](docs/user/DECK_MAKER_DESKTOP_GUIDE.md)
- [Deck Maker Guide for Mobile](docs/user/DECK_MAKER_MOBILE_GUIDE.md)
- [Basic Workflow](docs/user/BASIC_WORKFLOW.md)
- [Advanced Workflow](docs/user/ADVANCED_WORKFLOW.md)
- [Loredeck And Lorecard Creation](docs/loredecks/LOREDECK_AND_LORECARD_CREATION_GUIDE.md)
- [Loredeck Zip Package Structure](docs/loredecks/LOREDECK_ZIP_PACKAGE_STRUCTURE.md)
- [LLM Loredeck Generation Guide](docs/loredecks/LLM_LOREDECK_GENERATION_GUIDE.md)
- [Loredeck Schema Reference](docs/loredecks/SAGA_LOREDECK_SCHEMA.md)
- [Loredeck Builder Toolkit](docs/loredecks/LOREDECK_BUILDER_TOOLKIT.md)
- [Scripts Development Guide](docs/development/SCRIPTS_GUIDE.md): creating and maintaining the repository's generation, testing, and maintenance scripts.
- [Saga Terminology](docs/development/SAGA_TERMINOLOGY.md)

Development notes live in [docs/development](docs/development/) until promoted, rewritten, or archived as release-facing docs.

## Roadmap

- Alpha stabilization and live SillyTavern hardening.
- UI/UX polish across desktop, tablet, and phone-width surfaces.
- Bundled Loredeck expansion targets: Marvel MCU and Pokemon.
- Broader live-provider smoke coverage for Story Maker, Deck Maker, Context, and Lore Automation.

## Security

Saga is a browser-side SillyTavern extension. It does not require a server plugin for its own storage model, and Loredeck packages are data-only zip archives. Package import rejects unsafe paths and active file types such as scripts, HTML, SVG, executables, shell scripts, and WebAssembly.

Imported Loredecks can affect prompt content after you load and use them, so treat packages from unknown sources as untrusted prompt material even when the archive itself is data-only.

Model-backed actions use two provider roles: **Utility Provider** for frequent scan and summary work, and **Reasoning Provider** for deeper Context and Loredeck generation work. You can load Loredecks, set Context, review existing Lorecards, and inject accepted lore without configuring a provider.

Provider access is explicit:

- **Current SillyTavern Model** uses SillyTavern's active generation route.
- **Connection Profile** routes through SillyTavern's Connection Manager and keeps provider routing and keys in SillyTavern. This is the preferred option for stronger key isolation.
- **OpenAI-Compatible Endpoint** sends browser `fetch` requests to the configured base URL with `credentials: 'omit'` and a bearer API key header. Direct keys are stored in Saga settings with browser WebCrypto AES-GCM when available; if WebCrypto is unavailable, Saga warns and uses fallback obfuscation instead of encryption. Decrypted keys live in browser memory while provider calls run, so direct key storage does not protect against malicious scripts in the same browser session.

Use a SillyTavern Connection Profile or backend proxy when possible. Use Saga's direct endpoint mode mainly for alpha testing or local endpoints you already trust.

## Project Layout

```text
content/loredecks/      Bundled Lorepack data and index.
assets/                 Branding, icons, screenshots, and passive assets.
content/presets/        Optional provider/preset data.
docs/loredecks/         Release-facing Loredeck authoring docs.
docs/development/       Planning, audits, runbooks, and implementation notes.
tools/scripts/          Local tests, smoke helpers, and deck maintenance scripts (see docs/development/SCRIPTS_GUIDE.md).
tests/                  Visual smoke harness fixtures.
```

Important runtime modules:

- `src/extension/index.js`: extension entrypoint and SillyTavern integration.
  `manifest.json` points here directly.
- `src/runtime/lore-panel.js`: current runtime shell/controller while decomposition continues.
- `src/loredecks/loredeck-loader.js`: Loredeck loading, validation, Context, tags, and Pack Health behavior.
- `src/loredecks/loredeck-library-panel.js`: Library UI.
- `src/loredecks/loredeck-health-panel.js`: Pack Health Center UI.
- `src/story-openers/story-opener-state.js`: Story Maker state model.
- `src/runtime/story-opener-panel.js`: Story Maker Session-tab UI.
- `src/loredecks/loredeck-assistant.js`: model-assisted Story Maker, Deck Maker, and Lore Assistant prompt builders.
- `src/loredecks/loredeck-creator-projects.js`: Deck Maker project state and review-stage helpers.
- `src/context/context-resolver.js`: Context resolution logic.
- `src/context/context-index.js`: searchable Context index over loaded decks.
- `src/continuity/prompt-injector.js`: prompt injection bridge.
- `src/state/state-manager.js`: persisted Saga state.

## Storage

Saga keeps large custom content out of `settings.json` wherever SillyTavern's files API is available. `settings.json` should stay compact: preferences, provider selections, storage pointers, encrypted or obfuscated direct-key material when used, and lightweight diagnostics.

On startup, supported legacy inline registries are copied to a verified recovery file before their payloads and indexes are externalized. If migration detects a conflict or cannot verify a write, Saga retains the source data and stops; see [Storage And State Safety](docs/user/STORAGE_AND_STATE_SAFETY.md) for recovery steps.

Saga-owned payloads live under SillyTavern `/user/files` as flat, tracked files:

- Library index and installed Custom/Generated Loredeck payloads.
- Story Maker session indexes and opener payloads.
- Deck Maker project stage data and generated-pack links.
- Imported Theme Packs, Icon Set manifests, and passive raster assets.
- Imported Loredeck package payloads and cover images.
- State Safety indexes, diagnostics, backups, and cleanup records.

Bundled Loredecks, bundled Theme Packs, bundled Icon Sets, and bundled passive assets stay in the extension repository. Use **Advanced Settings > State Safety** to verify storage, settle queued writes, and clean stale missing-file records. Use **Danger Zone** only when you intentionally want to reset Saga settings, remove custom content, clear stored Saga API keys, or run a total Saga cleanup.

See [Storage And State Safety](docs/user/STORAGE_AND_STATE_SAFETY.md) for the full storage contract.

## Authoring Loredecks

Saga supports three Loredeck authoring paths:

1. **Use the Deck Maker.** In Advanced mode, Deck Maker walks through scope, story outline, Context planning, title batches, timeline/tag planning, Lorecard drafting, review, Pack Health, and finalization. This is the in-app path for staged model-assisted authoring.
2. **Use the docs and a bundled Loredeck as a reference.** Hand the authoring docs, schema, package structure guide, and a relevant bundled Loredeck folder to another LLM. The output target is a compatible `.saga-loredeck.zip` package that can be imported through **Import Deck** and then checked in Pack Health.
3. **Use the `loredeck-builder` skill and CLI toolkit.** A repo-local Claude Code skill plus `tools/loredeck/` CLI drives the same staged, user-gated workflow outside the app -- from scope brief through evidence, planning, Lorecards, and strict Pack Health -- and produces an importable `.saga-loredeck.zip` package. See [Loredeck Builder Toolkit](docs/loredecks/LOREDECK_BUILDER_TOOLKIT.md).

Start with these docs:

- [Loredeck And Lorecard Creation](docs/loredecks/LOREDECK_AND_LORECARD_CREATION_GUIDE.md)
- [Loredeck Zip Package Structure](docs/loredecks/LOREDECK_ZIP_PACKAGE_STRUCTURE.md)
- [LLM Loredeck Generation Guide](docs/loredecks/LLM_LOREDECK_GENERATION_GUIDE.md)
- [Loredeck Schema Reference](docs/loredecks/SAGA_LOREDECK_SCHEMA.md)
- [Loredeck Builder Toolkit](docs/loredecks/LOREDECK_BUILDER_TOOLKIT.md)

Reference-quality decks should be data-only, Context-aware, reviewable, and clean in the Pack Health Center. Do not treat parsed JSON as finished content. A deck is ready to model future work only when it loads cleanly, retrieves at the right Context, keeps future lore gated, and has no outstanding health issues.

## Authoring Openers

Use **Story Maker** from the Session tab when the goal is not a Loredeck, but a first post for the current scene. Story Maker builds a Context Packet, Opener Brief, Draft Variants, and Review & Copy stage from the active Saga setup. See [Story Maker Guide for Desktop](docs/user/STORY_MAKER_DESKTOP_GUIDE.md) or [Story Maker Guide for Mobile](docs/user/STORY_MAKER_MOBILE_GUIDE.md).

## License

See [LICENSE](LICENSE).
