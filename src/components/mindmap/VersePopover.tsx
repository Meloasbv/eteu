import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface VersePopoverProps {
  reference: string;
  anchorEl: HTMLElement;
  siblings: string[];
  onClose: () => void;
  onNavigate: (ref: string) => void;
}

export default function VersePopover({
  reference,
  anchorEl,
  siblings,
  onClose,
  onNavigate,
}: VersePopoverProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const currentIdx = siblings.indexOf(reference);

  useEffect(() => {
    const fetchVerse = async () => {
      setLoading(true);
      setError(false);
      setText(null);
      try {
        // Normalize reference for bible-api.com
        // Strip semicolons (the API treats `;` as a chapter separator and pulls extra verses)
        const normalized = reference
          .replace(/[.]/g, ":")
          .replace(/;/g, " ")
          .replace(/[.,;:\s]+$/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const res = await fetch(
          `https://bible-api.com/${encodeURIComponent(normalized)}?translation=almeida`
        );
        if (res.ok) {
          const data = await res.json();
          setText(data.text?.trim() || null);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchVerse();
  }, [reference]);

  // Position near anchor
  useEffect(() => {
    if (!popoverRef.current || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const pop = popoverRef.current;
    const popRect = pop.getBoundingClientRect();

    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - popRect.width / 2;

    // Keep within viewport
    if (left < 12) left = 12;
    if (left + popRect.width > window.innerWidth - 12)
      left = window.innerWidth - 12 - popRect.width;
    if (top + popRect.height > window.innerHeight - 12)
      top = rect.top - popRect.height - 8;

    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
  }, [anchorEl, text, loading]);

  // Close on Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorEl]);

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] animate-scale-in"
      style={{
        maxWidth: 400,
        minWidth: 280,
      }}
    >
      <div
        className="rounded-[14px] overflow-hidden"
        style={{
          background: "#1e1a14",
          border: "1px solid rgba(196,164,106,0.3)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          padding: "18px 20px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px]">📖</span>
            <span
              className="font-body text-[13px] font-bold tracking-[1px] uppercase"
              style={{ color: "#c4a46a" }}
            >
              {reference}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("focus-open-tool", {
                  detail: { tool: "verse-reader", reference }
                }));
                onClose();
              }}
              className="p-1 rounded-md transition-colors hover:bg-white/5"
              title="Ler no Modo Foco"
            >
              <ExternalLink size={14} style={{ color: "#c4a46a" }} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md transition-colors hover:bg-white/5"
            >
              <X size={14} style={{ color: "#8a7d6a" }} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="py-4 text-center">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin mx-auto"
              style={{
                borderColor: "rgba(196,164,106,0.2)",
                borderTopColor: "#c4a46a",
              }}
            />
          </div>
        )}

        {!loading && text && (
          <p
            className="font-body text-[15px] italic"
            style={{ color: "#ede4d3", lineHeight: 1.7 }}
          >
            "{text}"
          </p>
        )}

        {!loading && error && (
          <p
            className="text-[13px] font-sans text-center py-3"
            style={{ color: "#8a7d6a" }}
          >
            Não foi possível carregar o versículo.
          </p>
        )}

        {/* Version */}
        {!loading && text && (
          <p
            className="mt-2 text-[10.5px] font-sans tracking-[1.5px] uppercase"
            style={{ color: "#8a7d6a" }}
          >
            — Bíblia ARA
          </p>
        )}

        {/* Navigation */}
        {siblings.length > 1 && (
          <div
            className="flex items-center justify-between mt-3 pt-3"
            style={{ borderTop: "1px solid rgba(196,164,106,0.1)" }}
          >
            <button
              onClick={() => currentIdx > 0 && onNavigate(siblings[currentIdx - 1])}
              disabled={currentIdx <= 0}
              className="flex items-center gap-1 text-[11px] font-sans transition-colors disabled:opacity-20"
              style={{ color: "#7ba3c9" }}
            >
              <ChevronLeft size={12} />
              {currentIdx > 0 ? siblings[currentIdx - 1] : ""}
            </button>
            <button
              onClick={() =>
                currentIdx < siblings.length - 1 &&
                onNavigate(siblings[currentIdx + 1])
              }
              disabled={currentIdx >= siblings.length - 1}
              className="flex items-center gap-1 text-[11px] font-sans transition-colors disabled:opacity-20"
              style={{ color: "#7ba3c9" }}
            >
              {currentIdx < siblings.length - 1
                ? siblings[currentIdx + 1]
                : ""}
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
