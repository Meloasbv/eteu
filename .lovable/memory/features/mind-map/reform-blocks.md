---
name: Mind Map Reform — All Blocks
description: Complete reform of mind map cards with 3-layer architecture, presentation mode, sharing, and mobile polish
type: feature
---
## 3-Layer Architecture
- Layer 1: Canvas (RootNode, TopicCard, HighlightCard, VerseCard)
- Layer 2: NotePanel (side panel desktop 480px, bottom sheet mobile 88vh with drag-to-dismiss and swipe nav)
- Layer 3: VersePopover (floating popover with bible-api.com fetch and sibling navigation)

## Presentation Mode
- PresentationMode.tsx: fullscreen slides from TopicCards in topological order
- Keyboard: →/Space next, ← prev, Esc exit, M mini-map toggle
- Touch: swipe, click halves
- Mini-map overlay showing topic list

## Sharing
- ShareDialog.tsx: public/private toggle, slug generation, link copy
- Public state stored in mind_maps.study_notes JSON (is_public, public_slug)
- Route /m/:slug → SharedMindMap.tsx (read-only canvas)

## Mobile
- Bottom action bar (56px, 48px touch targets): Apresentar, Compartilhar, Fechar
- NotePanel as bottom sheet with drag handle and swipe navigation
- Mobile bar only shows in map mode when no note is open
