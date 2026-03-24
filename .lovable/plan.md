

## Plan: Redesign Notes to iPhone-Style with Print Support

### What changes

Redesign the BibleNotes component to closely mimic the Apple Notes app aesthetic, making it cleaner, more intuitive on mobile, and printable.

### Key Design Changes

1. **Note list (Screen 2)**: Each note card shows the **title in bold**, a **date line** (e.g., "24 mar 2026, 14:30") formatted like iPhone Notes, and a subtle preview line below. Clean white/cream cards with minimal borders.

2. **Editor (Screen 3)**: 
   - Show the **date prominently** at the top below the back button (formatted: "24 de março de 2026 às 14:30"), just like iPhone Notes
   - Remove the cluttered meta selectors row (category/week dropdowns) from the top area -- move category to a subtle pill, remove week selector from editor view
   - Move AI buttons (Resumir/Organizar) into a collapsible "..." menu to reduce visual noise
   - Move delete button into that same overflow menu
   - Keep bottom toolbar clean: mic, bold, italic, preview, verse

3. **Print support**: Add a "🖨️ Imprimir" button (in the overflow menu) that opens `window.print()` with a `@media print` stylesheet that:
   - Hides navigation, bottom bar, buttons
   - Shows note content with clean typography
   - Includes the date and title at the top

### Technical Details

**File**: `src/components/BibleNotes.tsx`

- Reformat `noteDate()` helper to display dates in Brazilian Portuguese format (e.g., "24 de mar. de 2026 às 14:30")
- Add date display in both the note list rows and editor header
- Add an overflow/actions menu (simple toggle state, no new dependencies) for AI, delete, and print actions
- Add `@media print` CSS block to `notesCSS` string hiding UI chrome and styling content for print
- Simplify editor header: `‹ voltar` | date | `···` menu button
- In list view, show date under title like: **Title** / `24 mar 2026` / preview text

