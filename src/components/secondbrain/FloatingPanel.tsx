import { ReactNode, useEffect, useRef, useState } from "react";
import { X, Minus, GripHorizontal, Maximize2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  accent: string;
  children: ReactNode;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  zIndex?: number;
  onFocus?: () => void;
}

/**
 * Floating draggable panel for Focus Workspace.
 * Glass surface, drag handle, minimize/maximize/close, soft entrance animation.
 */
export default function FloatingPanel({
  open, onClose, title, icon, accent, children,
  initialX = 120, initialY = 90,
  initialWidth = 880, initialHeight = 620,
  zIndex = 220,
  onFocus,
}: Props) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: initialWidth, h: initialHeight });
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
    } else {
      setMounted(false);
    }
  }, [open]);

  // Clamp inside viewport on resize
  useEffect(() => {
    const handler = () => {
      setPos(p => ({
        x: Math.min(p.x, window.innerWidth - 280),
        y: Math.min(p.y, window.innerHeight - 120),
      }));
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (maximized) return;
    onFocus?.();
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const nx = Math.max(8, Math.min(window.innerWidth - 200, dragState.current.origX + dx));
    const ny = Math.max(8, Math.min(window.innerHeight - 60, dragState.current.origY + dy));
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = () => { dragState.current = null; };

  if (!open) return null;

  const style: React.CSSProperties = maximized
    ? { left: 16, top: 16, right: 16, bottom: 16, width: "auto", height: "auto" }
    : { left: pos.x, top: pos.y, width: size.w, height: minimized ? 52 : size.h };

  return (
    <div
      className="fixed shadow-2xl rounded-2xl overflow-hidden flex flex-col"
      style={{
        ...style,
        zIndex,
        background: "hsl(var(--background))",
        border: `1px solid ${accent}55`,
        boxShadow: `0 30px 80px -20px ${accent}55, 0 0 0 1px rgba(255,255,255,0.04)`,
        transformOrigin: "center bottom",
        transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.96)",
        opacity: mounted ? 1 : 0,
        transition: "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease-out, height 0.28s ease-out, width 0.28s ease-out, left 0.28s ease-out, top 0.28s ease-out, right 0.28s ease-out, bottom 0.28s ease-out",
      }}
      onMouseDown={() => onFocus?.()}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing select-none shrink-0"
        style={{
          background: `linear-gradient(180deg, ${accent}1a, transparent)`,
          borderBottom: `1px solid ${accent}22`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <GripHorizontal size={14} style={{ color: accent }} className="opacity-60" />
        {icon && <span className="shrink-0">{icon}</span>}
        <h3 className="text-[12px] font-bold uppercase tracking-[1.5px] flex-1 truncate" style={{ color: accent }}>
          {title}
        </h3>
        <button
          onClick={() => setMinimized(m => !m)}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label={minimized ? "Expandir" : "Minimizar"}
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => { setMaximized(m => !m); setMinimized(false); }}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label={maximized ? "Restaurar" : "Maximizar"}
        >
          <Maximize2 size={11} />
        </button>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-destructive/40 text-white/70 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X size={12} />
        </button>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="flex-1 overflow-hidden bg-background min-h-0">
          {children}
        </div>
      )}
    </div>
  );
}
