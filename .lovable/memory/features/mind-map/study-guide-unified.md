---
name: Study Guide — Unified Mode
description: Mind Map removed in favor of Estudo Guiado + Apresentar. Grouped same-title sections, dedup people, optional analogy, clickable bible refs (ARA), shared mode with notes/search/present.
type: feature
---
## Architecture
- `MindMapTab.tsx` no longer renders `MindMapCanvas`. Both `ai-guide` and legacy `ai-canvas` modes route to `StudyGuide`. `MindMapCanvas` is no longer lazy-imported by the tab — saves bundle and AI image credits.
- `StudyGuide.tsx` is the single AI study view. It hosts an embedded `PresentationMode` (lazy) opened via the "Apresentar" button.
- `analyze-content` and image-generation calls remain unchanged on backend, but the canvas with `generate-card-image` is no longer reachable from the UI flow.

## Section grouping
- Adjacent concepts with identical (case/whitespace-normalized) titles are collapsed into one `GroupedConcept` block.
- The first member renders the full header (number, title, category, slides). Continuation members render only a thin divider with "continuação · Sl. X-Y".
- One toggle controls expand/collapse for the whole group; continuation members are force-expanded inside.

## Dedup people
- `buildPersonSeen` walks groups in order, recording lowercased names already shown. Each `StudySection` only renders `key_people` whose name is in its allowed set, so a recurring character (e.g. "Adão") shows once.

## Optional analogy
- The "Pense assim" block renders only when `showAnalogy` prop is true (first member of a group). Subsequent grouped members skip it to avoid repetition.

## Bible refs
- `StudyVerseChips.onSelect(ref, el)` now passes the clicked element so `VersePopover` can anchor to it.
- `VersePopover` already fetches ARA via bible-api.com (`?translation=almeida`).
- The popover external-link button dispatches `focus-open-tool` with `{ tool: "verse-reader", reference }` so the user can open the verse in Modo Foco.

## Shared mode (SharedMindMap → StudyGuide sharedMode)
- `sharedMode` prop hides Share/PDF buttons, shows "Apresentar" + "Notas".
- Sticky search bars: free-text search across the study (auto-expands matching sections, dims non-matching) and verse search ("João 3:16") which opens the popover.
- Floating notes panel (320px, bottom-right) backed by `localStorage` key `shared-study-notes:{slug}`. Collapsed → FAB; expanded → textarea with autosave (400ms debounce).
- "Apresentar" works in both shared and app modes — opens cinematic `PresentationMode` over the existing analysis without any new AI calls.
