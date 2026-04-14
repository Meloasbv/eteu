

## Plan: Move Mind Map into Study Tab + Split Screen

### What changes

1. **StudyTab.tsx** — Replace "Assistente" toggle with "Mapa Mental". The two sections become: **🧠 Mapa Mental** and **📓 Caderno**. Add a split-screen toggle button (desktop only) that renders both side-by-side using `react-resizable-panels`.

2. **Remove standalone Mind Map tab** — In `Index.tsx`:
   - Remove `"mapamental"` from the tab type, TABS array, and renderContent switch
   - Remove the `MindMapTab` lazy import (it moves into StudyTab)
   - Remove mind map fullscreen logic (`tab !== "mapamental"` checks)

3. **DesktopSidebar.tsx** — Remove the "Mapa Mental" nav item from `NAV_ITEMS`.

4. **StudyTab.tsx rewrite** — New layout:
   - Toggle bar: "🧠 Mapa Mental" | "📓 Caderno" | split-screen icon button
   - Single mode: shows one at a time (default)
   - Split mode (desktop): uses `ResizablePanelGroup` with `ResizablePanel` + `ResizableHandle` to show both side-by-side with a draggable divider
   - On mobile: split button hidden, toggle only

### Technical details

- Import `MindMapTab` (lazy) and `NotebookList` into `StudyTab`
- Remove `AssistantChat` import from `StudyTab`
- Use existing `ResizablePanelGroup`/`ResizablePanel`/`ResizableHandle` from `src/components/ui/resizable.tsx`
- Use `useIsMobile` hook to conditionally show split button
- When in split mode on the "anotacoes" tab, the center column should expand (remove right panel hide logic that was for mapamental, apply it to anotacoes when in split mode)
- Pass `userCodeId` through to `MindMapTab` as already done

### Files to modify
- `src/components/study/StudyTab.tsx` — Rewrite with MindMap + Notebook + split screen
- `src/pages/Index.tsx` — Remove mapamental tab, clean up references
- `src/components/desktop/DesktopSidebar.tsx` — Remove mapamental nav item

