# Saga Documentation

Saga documentation is being organized into release-facing topic folders. Older implementation notes still live in `development/` until they are promoted, rewritten, or archived.

## Release Notes

- [Saga Lorecard Context Storage Patch - November 5, 2026](release/2026-11-05-lorecard-context-storage.md): fixes fabricated Context gates, adds conservative recovery for manual and Story Scan cards, and corrects Injection preview explanations.
- [Saga Reliability Patches - October 6, 2026](release/2026-10-06-reliability-patches.md): post-alpha reliability and data-preservation fixes; the `0.4.0-alpha.4` release identifier remains unchanged.
- [Saga 0.4.0-alpha.4 - Scribe](release/0.4.0-alpha.4.md): current alpha with the external Loredeck Builder toolkit, multi-deck authoring support, evidence-grounded workflow documentation, and release-gate coverage for the authoring path.
- [Saga 0.3.0-alpha.3 - Voyages](release/0.3.0-alpha.3.md): previous alpha with bundled One Piece and Star Trek Lorepack expansion, Story Maker reliability hardening, Deck Maker generation cleanup, and expanded alpha-gate coverage.
- [Saga 0.2.0-alpha.2 - The Big Mobile Update](release/0.2.0-alpha.2.md): previous alpha with phone-width mobile UI, Story Maker, Deck Maker polish, mobile docs, and release-gate notes.
- [Saga 0.1.0-alpha.1 - Fox One](release/0.1.0-alpha.1.md): first controlled alpha release notes.

## Release-Facing Docs

- [Basic Workflow](user/BASIC_WORKFLOW.md): Basic Walkthrough module guide for First Run, Loredecks, Context, Lorecards, Continue Roleplay, and Settings without advanced prompt controls.
- [Advanced Workflow](user/ADVANCED_WORKFLOW.md): Advanced Walkthrough task-track guide for Library mastery, runtime control, Context, Lorecards, Injection, Continuity, Deck Maker, Pack Health, Settings, and troubleshooting.
- [Saga for Desktop Operator's Manual](user/DESKTOP_OPERATOR_MANUAL.md): screenshot-backed desktop/tablet operating guide for Session, Loredecks, Pack Health, Context, Lorecards, Continuity, Injection, Settings, and light Story Maker/Deck Maker routing.
- [Saga for Mobile Operator's Manual](user/MOBILE_OPERATOR_MANUAL.md): phone-width operating guide for the bottom navigation shell, mobile subviews, touch interactions, Loredeck Library detail sheets, mobile Lorecards, Advanced mobile routes, and light Story Maker/Deck Maker routing.
- [Story Maker Guide for Desktop](user/STORY_MAKER_DESKTOP_GUIDE.md): complete desktop guide to Story Maker saved openers, inputs, Context Packet, Opener Brief, Draft Variants, Review & Copy, revisions, and failures.
- [Story Maker Guide for Mobile](user/STORY_MAKER_MOBILE_GUIDE.md): complete phone-width guide to Story Maker from the Session route, with mobile-only navigation and review workflow.
- [Deck Maker Guide for Desktop](user/DECK_MAKER_DESKTOP_GUIDE.md): complete desktop guide to Deck Maker stages, project shelf, current task, review queues, Pack Health, readiness, reset, and finalization.
- [Deck Maker Guide for Mobile](user/DECK_MAKER_MOBILE_GUIDE.md): complete phone-width guide to Deck Maker from the Loredecks route, with mobile current-task, roadmap, review, and finalization workflow.
- [Storage And State Safety](user/STORAGE_AND_STATE_SAFETY.md): operator guide for Saga's `/user/files` storage model, `settings.json` boundaries, import storage, State Safety maintenance, and Danger Zone cleanup.
- [Loredecks](loredecks/LOREDECK_AND_LORECARD_CREATION_GUIDE.md): Loredeck and Lorecard creation guidance, reference-deck expectations, authoring workflow, and schema links.
- [Loredeck Zip Package Structure](loredecks/LOREDECK_ZIP_PACKAGE_STRUCTURE.md): importable `.saga-loredeck.zip` folder layout, package index requirements, deck-local cover image rules, and LLM handoff checklist.
- [LLM Loredeck Generation](loredecks/LLM_LOREDECK_GENERATION_GUIDE.md): compact handoff for another LLM that needs to generate or revise Saga Loredecks and Lorecards.
- [Loredeck Builder Toolkit](loredecks/LOREDECK_BUILDER_TOOLKIT.md): the `loredeck-builder` skill and `tools/loredeck/` CLI for external, LLM-driven authoring of validated `.saga-loredeck.zip` packages through a staged, user-gated workshop workflow.
- [Scripts Development Guide](development/SCRIPTS_GUIDE.md): creating and maintaining scripts in `tools/scripts/` for loredeck generation, testing, maintenance, and utilities. Includes architectural patterns, templates, and best practices for the current script inventory.

## Development Notes

- [development](development/): active planning, audits, implementation notes, and pre-release engineering records. These files are not yet organized as end-user documentation.
- [Saga Reliability Implementation Ledger](development/SAGA_RELIABILITY_IMPLEMENTATION_2026-10-06.md): implementation map, local verification evidence, supported storage migration policy, and remaining host-dependent limits.
- [Saga Storage Coordination Contract](development/SAGA_STORAGE_COORDINATION_CONTRACT.md): storage acknowledgments, recovery journal, concurrency boundary, and inline migration details.
- [Saga Chat Persistence Contract](development/SAGA_CHAT_PERSISTENCE_CONTRACT.md): chat-bound operations, save acknowledgments, legacy host limitations, and recovery guidance.
- [Saga Reliability Review](development/SAGA_RELIABILITY_REVIEW_2026-10-06.md): the original prioritized reliability findings addressed by the patch set.
- [Basic And Advanced Experience Modes Plan](development/SAGA_EXPERIENCE_MODES_PLAN.md): product and implementation plan for revising Saga's guided Basic workflow and full Advanced workflow.
- [Basic Experience Implementation Plan](development/SAGA_BASIC_EXPERIENCE_IMPLEMENTATION_PLAN.md): historical feature plan for hiding Injection in Basic mode and shaping the guided Basic workflow that now appears as Session Readiness and Basic Walkthrough cards.
- [Basic Checklist Mini-Tours](development/SAGA_BASIC_CHECKLIST_GUIDED_TASKS.md): historical implementation note for checklist-launched mini-tours before the current Session Readiness wording.
- [Walkthrough Workflow Expansion Plan](development/SAGA_WALKTHROUGH_WORKFLOW_EXPANSION_PLAN.md): coverage-driven implementation plan for the B01-B57 Basic modules and A01-A169 Advanced task tracks without fixed step-count limits.
- [Public Release Documentation Refresh Plan](development/SAGA_PUBLIC_RELEASE_DOCUMENTATION_REFRESH_PLAN.md): release-prep plan for auditing `main` to `mobile-support`, regenerating desktop/mobile renders, updating public docs, reworking walkthroughs, and validating the Basic checklist quickrun.
- [Public Release Change Inventory](development/SAGA_PUBLIC_RELEASE_CHANGE_INVENTORY.md): current release-delta ledger mapping `mobile-support` feature changes to source evidence, render targets, docs, walkthroughs, and verification.
- [Lorecards Control Revision Plan](development/SAGA_LORECARDS_CONTROL_REVISION_PLAN.md): replacement plan for Accepted Lorecard desktop controls, mobile relevance gestures, microphone mute toggle, green Elevate state, Lore Automation protection, and direct Elevated injection.
- [Lore Automation Levels Plan](development/SAGA_LORE_AUTOMATION_LEVELS_PLAN.md): design and implementation plan for the `Off`, `AR`, `ARMP`, and `ARMPC` Lore Automation modes, per-card automation ownership, provider routing, curation, run journals, and undo.
- [Saga Mobile Support Feature](development/SAGA_MOBILE_SUPPORT_FEATURE.md): phone-first feature plan for replacing the desktop rail/drawer with a fixed bottom bar, mobile header, staged subviews, touch-density rules, and mobile smoke coverage.
- [Saga Mobile UX Revision Feature](development/SAGA_MOBILE_UX_REVISION_FEATURE.md): follow-up feature for refining the mobile MVP into an object-first, less toolbar-heavy, visually verified Saga phone experience.
- [Saga Mobile Touch Interaction Redesign](development/SAGA_MOBILE_TOUCH_INTERACTION_REDESIGN.md): touch-first redesign plan for replacing mobile desktop-pane translations with object selection, tap order, tap-hold details, contextual trays, and segmented Lorecard pages.
- [Saga Mobile UX Revision 3](development/SAGA_MOBILE_UX_REVISION_3.md): shell/layout revision for removing mobile navigation tooltips, eliminating nested scroll regions, reducing top chrome, and moving persistent commands toward bottom action areas.
- [Saga Mobile Support Parallelization Addendum](development/SAGA_MOBILE_SUPPORT_PARALLELIZATION_ADDENDUM.md): historical three-agent handoff plan for the initial mobile build; the active revision work continues through the Mobile UX Revision Feature.
- [Loredeck Zip Package Import/Export Plan](development/LOREDECK_ZIP_PACKAGE_IMPORT_EXPORT_PLAN.md): development plan for replacing front-facing Loredeck JSON import/export with bundled-folder-shaped `.saga-loredeck.zip` packages.
- [Deck Maker Reset To Step Plan](development/LOREDECK_CREATOR_RESET_TO_STEP_PLAN.md): destructive top-bar reset feature for returning a Deck Maker project to an earlier stage and clearing downstream data without undo/history state.
- [Deck Maker Coverage Overhaul](development/LOREDECK_CREATOR_COVERAGE_OVERHAUL.md): alpha plan for semantic Deck Maker Coverage, adaptive density, targeted title expansion, and underbuilt Generated Lorepack warnings without hard entry thresholds.
- [Deck Maker Lorecard Rejection Recovery Plan](development/LOREDECK_CREATOR_LORECARD_REJECTION_RECOVERY_PLAN.md): focused implementation plan for distinguishing provider failures from Saga-side schema rejections, preflighting Lorecard targets, preserving partial batches, and automatically retrying rejected titles.
- [Loredeck Health Auto-Fix System Plan](development/LOREDECK_HEALTH_AUTO_FIX_SYSTEM_PLAN.md): umbrella plan for replacing fragmented Pack Health repair actions with one `Attempt Fixing` workflow split into storage-safe parallel work and post-storage integration.
- [Loredeck Health Auto-Fix Stage 1](development/LOREDECK_HEALTH_AUTO_FIX_STAGE_1_PARALLEL_PLAN.md): parallel-safe foundation plan for pure repair planning, patch building, validation, model prompt/parser contracts, and tests that do not touch storage or UI wiring.
- [Loredeck Health Auto-Fix Stage 2](development/LOREDECK_HEALTH_AUTO_FIX_STAGE_2_STORAGE_INTEGRATION_PLAN.md): post-storage integration plan for wiring Stage 1 into external payload writes, repair sessions, Health Center UX, Creator readiness, and provider-backed repair batches.
- [Saga Storage Rework Design](development/SAGA_STORAGE_REWORK_DESIGN.md): detailed design for moving Saga-owned Lorepacks, Deck Maker projects, Theme Packs, Icon Sets, and passive assets out of `settings.json` into flat `/user/files` JSON storage without server plugins.
- [Saga Storage Finalization Scope Plan](development/SAGA_STORAGE_FINALIZATION_SCOPE_PLAN.md): closeout plan and signoff evidence for collision-safe Theme/Icon imports, repair-session lifecycle, stale-write detection, storage-harness coverage, and real-profile audit.
- [Saga Danger Zone Global Cleanup Plan](development/SAGA_DANGER_ZONE_GLOBAL_CLEANUP_PLAN.md): implementation plan for relocating Danger Zone to Settings, splitting Active Chat and Global cleanup actions, and adding destructive custom-content and total cleanup workflows.
- [Saga Generation Hardening Plan](development/SAGA_GENERATION_HARDENING_PLAN.md): feature plan for normalizing provider response shapes, typed generation errors, Deck Maker stage validators, and sanitized diagnostics.
- [Saga Architecture Redesign](development/SAGA_ARCHITECTURE_REDESIGN.md): target redesign packet for host neutrality, generation authority, source ledgers, prompt projection, layered context, hybrid retrieval, knowledge-scoped continuity, Story Packages, and Loredeck/Lorecard schema evolution.
- [Story Maker Model Call Robustness Pass Plan](development/STORY_MAKER_MODEL_CALL_ROBUSTNESS_PLAN.md): focused pass plan for Story Maker retries, failure classification, partial variant recovery, attempt diagnostics, and user-facing failure guidance.
- [Saga Chip Design Schema](development/SAGA_CHIP_DESIGN_SCHEMA.md): design schema for compact chip, pill, badge, and metadata-bubble hierarchy across Creator, Library, Lorecards, Context, Pack Health, and Settings.
- [Jujutsu Kaisen Loredeck Series Plan](development/JJK_LOREDECK_SERIES_PLAN.md): source-boundary, deck-family split, Context model, tag plan, and Pack Health bar for a manga-primary JJK Bundled Lorepack family.
- [Alpha Repository Restructure Plan](development/SAGA_ALPHA_REPOSITORY_RESTRUCTURE_PLAN.md): production-alpha cleanup plan for moving root implementation code, bundled Loredecks, presets, passive assets, tests, and tools into durable repo domains.
- [Alpha Refactor Plan](development/SAGA_ALPHA_REFACTOR_PLAN.md): pre-alpha to alpha decomposition plan for runtime, state, CSS, loader, startup, prompt injection globals, and Loredeck workflow UI.
- [Alpha Stabilization And UI Extraction](development/SAGA_ALPHA_STABILIZATION_AND_UI_EXTRACTION.md): next-pass checkpoint for proving the broad refactor behavior, then extracting shared Loredeck UI primitives.
- [Deep Refactor Target Audit](development/SAGA_DEEP_REFACTOR_TARGET_AUDIT.md): current-code audit of the highest-value refactor targets after recent runtime, mobile, Lorecards, Creator, Library, and storage changes.

When a development document becomes part of the product contract, move it into the relevant topic folder and update links from the old location.
