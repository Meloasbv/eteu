import { useState, useEffect, useCallback, useRef } from "react";

interface NoteSearchOverlayProps {
  open: boolean;
  onClose: () => void;
  /** The container element that holds the TipTap editor content */
  editorContainerRef: React.RefObject<HTMLDivElement>;
}

const HIGHLIGHT_CLASS = "note-search-match";
const ACTIVE_CLASS = "note-search-match-active";

function normalize(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function NoteSearchOverlay({ open, onClose, editorContainerRef }: NoteSearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear highlights from the editor DOM
  const clearHighlights = useCallback(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const marks = container.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`);
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      }
    });
  }, [editorContainerRef]);

  // Highlight all occurrences in text nodes
  const highlightMatches = useCallback((searchStr: string) => {
    const container = editorContainerRef.current;
    if (!container || !searchStr) { setMatchCount(0); return; }

    const normalizedSearch = normalize(searchStr);
    if (!normalizedSearch) { setMatchCount(0); return; }

    // Walk all text nodes
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }

    let count = 0;
    for (const node of textNodes) {
      const text = node.textContent || "";
      const normalizedText = normalize(text);
      const indices: number[] = [];

      let startPos = 0;
      while (true) {
        const idx = normalizedText.indexOf(normalizedSearch, startPos);
        if (idx === -1) break;
        indices.push(idx);
        startPos = idx + 1;
      }

      if (indices.length === 0) continue;

      // Split and wrap matches
      const parent = node.parentNode;
      if (!parent) continue;

      const frag = document.createDocumentFragment();
      let lastEnd = 0;

      for (const idx of indices) {
        // Text before match
        if (idx > lastEnd) {
          frag.appendChild(document.createTextNode(text.slice(lastEnd, idx)));
        }
        // The matched text (use original casing)
        const matchLen = searchStr.length;
        const matchedText = text.slice(idx, idx + matchLen);
        const mark = document.createElement("mark");
        mark.className = HIGHLIGHT_CLASS;
        mark.textContent = matchedText;
        mark.dataset.matchIndex = String(count);
        frag.appendChild(mark);
        count++;
        lastEnd = idx + matchLen;
      }

      if (lastEnd < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastEnd)));
      }

      parent.replaceChild(frag, node);
    }

    setMatchCount(count);
  }, [editorContainerRef]);

  // Set active match
  const setActiveMatch = useCallback((index: number) => {
    const container = editorContainerRef.current;
    if (!container) return;

    container.querySelectorAll(`mark.${ACTIVE_CLASS}`).forEach(m => m.classList.remove(ACTIVE_CLASS));

    const target = container.querySelector(`mark[data-match-index="${index}"]`);
    if (target) {
      target.classList.add(ACTIVE_CLASS);
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editorContainerRef]);

  // Run search when query changes
  useEffect(() => {
    if (!open) return;
    clearHighlights();
    if (query.trim()) {
      highlightMatches(query);
      setActiveIndex(0);
    } else {
      setMatchCount(0);
      setActiveIndex(0);
    }
  }, [query, open, clearHighlights, highlightMatches]);

  // Update active highlight
  useEffect(() => {
    if (open && matchCount > 0) {
      setActiveMatch(activeIndex);
    }
  }, [activeIndex, matchCount, open, setActiveMatch]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      clearHighlights();
      setQuery("");
      setMatchCount(0);
      setActiveIndex(0);
    }
  }, [open, clearHighlights]);

  // Keyboard: Ctrl+F to open, Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const goNext = () => {
    if (matchCount === 0) return;
    setActiveIndex(prev => (prev + 1) % matchCount);
  };

  const goPrev = () => {
    if (matchCount === 0) return;
    setActiveIndex(prev => (prev - 1 + matchCount) % matchCount);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) goPrev();
      else goNext();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-[80] px-3 pt-2 pb-2 bg-card/95 backdrop-blur-sm border-b border-border-subtle animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm shrink-0">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar na nota..."
          className="flex-1 bg-background border border-border rounded-lg text-foreground
            font-body text-sm px-3 py-2 outline-none
            focus:border-primary/50 placeholder:text-muted-foreground placeholder:italic
            transition-colors duration-200"
        />
        {query && (
          <span className="font-mono text-[11px] text-muted-foreground shrink-0 min-w-[52px] text-center">
            {matchCount > 0 ? `${activeIndex + 1} de ${matchCount}` : "0"}
          </span>
        )}
        <button
          onClick={goPrev}
          disabled={matchCount === 0}
          className="w-7 h-7 rounded-md bg-transparent border border-border text-muted-foreground
            flex items-center justify-center text-xs cursor-pointer
            hover:border-primary/40 hover:text-foreground disabled:opacity-30 disabled:cursor-default
            transition-all duration-150"
          title="Anterior (Shift+Enter)"
        >
          ↑
        </button>
        <button
          onClick={goNext}
          disabled={matchCount === 0}
          className="w-7 h-7 rounded-md bg-transparent border border-border text-muted-foreground
            flex items-center justify-center text-xs cursor-pointer
            hover:border-primary/40 hover:text-foreground disabled:opacity-30 disabled:cursor-default
            transition-all duration-150"
          title="Próximo (Enter)"
        >
          ↓
        </button>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md bg-transparent border-none text-muted-foreground
            flex items-center justify-center text-sm cursor-pointer
            hover:text-foreground transition-colors duration-150"
          title="Fechar (Esc)"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
