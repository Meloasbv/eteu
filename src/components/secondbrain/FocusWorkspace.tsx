import { useEffect, useRef, useState, ReactNode, lazy, Suspense } from "react";
import {
  X, SkipForward, Pause, Play, Volume2, Youtube,
  BookOpen, Flame, PenLine, Brain, Timer, Maximize2, Minimize2,
  Menu, ChevronUp, ChevronDown, Eye,
} from "lucide-react";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";
import { useFocusMusic, FOCUS_TRACKS, type FocusTrackKey } from "@/hooks/useFocusMusic";
import FocusCommandChat, { type FocusPanelKey } from "./FocusCommandChat";
import FocusTTSPlayer from "./FocusTTSPlayer";
import BrainAreasHub from "./areas/BrainAreasHub";
import type { BrainArea } from "@/lib/brainAreas";
import type { FocusOpenToolDetail, FocusToolKey } from "@/lib/focusTools";

const MindMapTab = lazy(() => import("@/components/mindmap/MindMapTab"));
const NotebookList = lazy(() => import("@/components/study/NotebookList"));

// WEEKS data needed by FocusCommandChat to compute today's reading
const WEEKS_FALLBACK: any[] = [];

// Devotional black/gold palette
const PALETTE = {
  bg: "#0a0805",
  surface: "#13100b",
  surfaceLight: "#1a1610",
  border: "#2a2218",
  primary: "#d4a94a",
  primarySoft: "#b8902f",
  text: "#ede4d0",
  textDim: "#8a7e66",
};

export type FocusTab = "leitura" | "devocional" | "anotacoes" | "cerebro";

const POMODORO_MIN: Record<"focus" | "break", number> = { focus: 25, break: 5 };
const FOCUS_MIN_KEY = "fascinacao-focus-minutes-today";
const FOCUS_DATE_KEY = "fascinacao-focus-date";

interface Props {
  open: boolean;
  onClose: () => void;
  tab: FocusTab;
  setTab: (t: FocusTab) => void;
  userCodeId: string;
  weeks: any[];
  devotionals?: any[];
  /** Legacy, unused */
  renderTab?: (key: FocusPanelKey) => ReactNode;
}

type SidebarShortcut = {
  key: string;
  label: string;
  icon: any;
  action: { kind: "tool"; detail: FocusOpenToolDetail } | { kind: "chat"; cmd: string };
};

const SHORTCUTS: (SidebarShortcut | { key: string; label: string; icon: any; action: { kind: "brain" } })[] = [
  { key: "leitura", label: "Leitura", icon: BookOpen, action: { kind: "chat", cmd: "leitura de hoje" } },
  { key: "devocional", label: "Devocional", icon: Flame, action: { kind: "chat", cmd: "devocional do dia" } },
  { key: "mapa", label: "Estudo Guiado", icon: Brain, action: { kind: "tool", detail: { tool: "mindmap" } } },
  { key: "caderno", label: "Caderno", icon: PenLine, action: { kind: "tool", detail: { tool: "notebook" } } },
  { key: "cerebro", label: "Cérebro", icon: Brain, action: { kind: "brain" } },
];

export default function FocusWorkspace({ open, onClose, tab, setTab, userCodeId, weeks, devotionals }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  // Tool overlay (mind map / notebook etc.)
  const [activeTool, setActiveTool] = useState<FocusOpenToolDetail | null>(null);

  // Brain mode
  const [brainMode, setBrainMode] = useState(false);
  const [brainSeed, setBrainSeed] = useState<string>("");

  // Pomodoro
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_MIN.focus * 60);
  const [running, setRunning] = useState(true);
  const [todayMin, setTodayMin] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Fullscreen
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Music
  const {
    iframeRef, trackKey, currentVideoId,
    playing, toggle, setTrack, setCustom, skip, volume, changeVolume,
  } = useFocusMusic(open);
  const [showYtInput, setShowYtInput] = useState(false);
  const [ytInput, setYtInput] = useState("");

  // UX: collapse top chrome (Pomodoro/music shrink to chip) + Zen (full immersive)
  const [chromeCollapsed, setChromeCollapsed] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Restore today's focus minutes
  useEffect(() => {
    if (!open) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const savedDate = localStorage.getItem(FOCUS_DATE_KEY);
      if (savedDate !== today) {
        localStorage.setItem(FOCUS_DATE_KEY, today);
        localStorage.setItem(FOCUS_MIN_KEY, "0");
        setTodayMin(0);
      } else {
        setTodayMin(parseInt(localStorage.getItem(FOCUS_MIN_KEY) || "0", 10));
      }
    } catch {}
  }, [open]);

  // Pomodoro timer
  useEffect(() => {
    if (!open || !running) return;
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          if (phase === "focus") {
            try {
              const cur = parseInt(localStorage.getItem(FOCUS_MIN_KEY) || "0", 10) + POMODORO_MIN.focus;
              localStorage.setItem(FOCUS_MIN_KEY, String(cur));
              setTodayMin(cur);
            } catch {}
            setShowCelebration(true);
            haptic("heavy");
            setTimeout(() => setShowCelebration(false), 4500);
            setPhase("break");
            return POMODORO_MIN.break * 60;
          } else {
            setPhase("focus");
            haptic("medium");
            return POMODORO_MIN.focus * 60;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, running, phase]);

  // Fullscreen listener
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Timer control events from artifacts
  useEffect(() => {
    const onPause = () => setRunning(false);
    const onResume = () => setRunning(true);
    const onReset = () => {
      setPhase("focus");
      setSecondsLeft(POMODORO_MIN.focus * 60);
      setRunning(true);
    };
    window.addEventListener("focus-timer-pause", onPause);
    window.addEventListener("focus-timer-resume", onResume);
    window.addEventListener("focus-timer-reset", onReset);
    return () => {
      window.removeEventListener("focus-timer-pause", onPause);
      window.removeEventListener("focus-timer-resume", onResume);
      window.removeEventListener("focus-timer-reset", onReset);
    };
  }, []);

  // TTS audio ducking: lower YouTube music volume while reading
  const preDuckVolumeRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDuck = (e: Event) => {
      const active = (e as CustomEvent<{ active: boolean }>).detail?.active;
      if (active) {
        if (preDuckVolumeRef.current == null) preDuckVolumeRef.current = volume;
        changeVolume(Math.min(volume, 30));
      } else if (preDuckVolumeRef.current != null) {
        changeVolume(preDuckVolumeRef.current);
        preDuckVolumeRef.current = null;
      }
    };
    window.addEventListener("focus-tts-ducking", onDuck as EventListener);
    return () => window.removeEventListener("focus-tts-ducking", onDuck as EventListener);
  }, [open, volume, changeVolume]);

  // Stop TTS when leaving Focus Mode
  useEffect(() => {
    if (open) return;
    window.dispatchEvent(new CustomEvent("focus-tts-stop"));
  }, [open]);

  // Listen for "focus-open-tool" events dispatched from artifacts/sidebar
  useEffect(() => {
    if (!open) return;
    const onOpenTool = (e: Event) => {
      const detail = (e as CustomEvent<FocusOpenToolDetail>).detail;
      if (!detail) return;
      setActiveTool(detail);
      haptic("medium");
    };
    const onOpenBrain = (e: Event) => {
      const content = (e as CustomEvent<{ content?: string }>).detail?.content ?? "";
      setBrainSeed(content);
      setBrainMode(true);
      haptic("medium");
    };
    window.addEventListener("focus-open-tool", onOpenTool as EventListener);
    window.addEventListener("focus-open-brain", onOpenBrain as EventListener);
    return () => {
      window.removeEventListener("focus-open-tool", onOpenTool as EventListener);
      window.removeEventListener("focus-open-brain", onOpenBrain as EventListener);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zenMode) { setZenMode(false); return; }
        if (activeTool) { setActiveTool(null); return; }
        if (!document.fullscreenElement) onClose();
      }
      // Z key toggles Zen mode (immersive)
      if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setZenMode((z) => !z);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, activeTool, zenMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const submitCustomYt = () => {
    const ok = setCustom(ytInput);
    if (ok) {
      toast({ title: "Trilha personalizada ativa ♪" });
      setYtInput(""); setShowYtInput(false); haptic("medium");
    } else {
      toast({ title: "URL do YouTube inválida", variant: "destructive" });
    }
  };

  if (!open) return null;

  const totalSeconds = POMODORO_MIN[phase] * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const ringRadius = 42;
  const ringCirc = 2 * Math.PI * ringRadius;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] overflow-hidden focus-workspace-root"
      style={{
        background: PALETTE.bg,
        color: PALETTE.text,
        fontFamily: "var(--font-body)",
      }}
    >
      {/* YouTube iframe — must be visible (1x1) so postMessage API works on all browsers */}
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${currentVideoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${currentVideoId}&controls=0&origin=${typeof window !== "undefined" ? window.location.origin : ""}`}
        allow="autoplay; encrypted-media"
        className="absolute pointer-events-none"
        style={{ width: 1, height: 1, opacity: 0.01, bottom: 0, right: 0, border: "none" }}
        title="Focus music"
      />

      {/* MAIN LAYOUT */}
      <div className="relative z-10 flex h-full w-full">
        {/* ─── SIDEBAR (desktop fixed, mobile drawer) ─── */}
        <aside
          className={`focus-sidebar h-full flex flex-col border-r shrink-0 transition-transform ${zenMode ? "hidden" : ""}`}
          style={{
            width: 220,
            background: PALETTE.surface,
            borderColor: PALETTE.border,
          }}
        >
          <div className="p-4 flex items-center gap-2 border-b" style={{ borderColor: PALETTE.border }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${PALETTE.primary}14`, border: `1px solid ${PALETTE.primary}55` }}>
              <Sparkle />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[2.5px] leading-none" style={{ color: PALETTE.textDim }}>Modo</p>
              <p className="text-[12px] font-bold leading-tight" style={{ color: PALETTE.primary }}>FOCO</p>
            </div>
          </div>

          <div className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
            <p className="text-[9px] uppercase tracking-[2.5px] px-2 pt-2 pb-1" style={{ color: PALETTE.textDim }}>Atalhos</p>
            {SHORTCUTS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    setSidebarOpen(false);
                    haptic("light");
                    if (s.action.kind === "tool") {
                      setActiveTool(s.action.detail);
                    } else if (s.action.kind === "brain") {
                      setBrainSeed("");
                      setBrainMode(true);
                    } else {
                      window.dispatchEvent(new CustomEvent("focus-chat-send", { detail: { text: s.action.cmd } }));
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: s.key === "cerebro" ? `${PALETTE.primary}10` : "transparent",
                    border: `1px solid ${s.key === "cerebro" ? PALETTE.primary + "44" : "transparent"}`,
                    color: s.key === "cerebro" ? PALETTE.primary : PALETTE.text,
                  }}
                >
                  <Icon size={16} className="shrink-0" strokeWidth={1.8} />
                  <span className="text-[13px] font-bold leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t" style={{ borderColor: PALETTE.border }}>
            <div className="flex items-center gap-2 text-xs">
              <Timer size={12} style={{ color: PALETTE.primary }} />
              <span style={{ color: PALETTE.textDim }}>Foco hoje:</span>
              <span className="font-bold tabular-nums" style={{ color: PALETTE.primary }}>{todayMin}min</span>
            </div>
          </div>
        </aside>

        {/* Mobile drawer overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[210] focus-mobile-overlay"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ─── MAIN AREA ─── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar — minimal by default; hidden in zen */}
          {!zenMode && (
            <div
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b shrink-0 flex-wrap sm:flex-nowrap"
              style={{ background: PALETTE.surface, borderColor: PALETTE.border }}
            >
              {/* Mobile menu */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="focus-mobile-menu w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
                style={{ background: PALETTE.surfaceLight, color: PALETTE.text }}
                aria-label="Abrir menu"
              >
                <Menu size={16} />
              </button>

              {chromeCollapsed ? (
                /* Compact chip: timer + music play in a single pill */
                <button
                  onClick={() => { setChromeCollapsed(false); haptic("light"); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-[1.02]"
                  style={{
                    background: PALETTE.surfaceLight,
                    border: `1px solid ${PALETTE.border}`,
                  }}
                  title="Expandir controles"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: running ? PALETTE.primary : PALETTE.textDim,
                      boxShadow: running ? `0 0 6px ${PALETTE.primary}` : "none",
                    }}
                  />
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: PALETTE.text }}>
                    {mm}:{ss}
                  </span>
                  <span className="text-[9px] uppercase tracking-[1.5px]" style={{ color: PALETTE.textDim }}>
                    {phase === "focus" ? "foco" : "pausa"}
                  </span>
                  <span className="w-px h-3 mx-0.5" style={{ background: PALETTE.border }} />
                  <span
                    onClick={(e) => { e.stopPropagation(); toggle(); haptic("light"); }}
                    className="flex items-center justify-center cursor-pointer"
                    style={{ color: playing ? PALETTE.primary : PALETTE.textDim }}
                  >
                    {playing ? <Pause size={11} /> : <Play size={11} />}
                  </span>
                  <ChevronDown size={11} style={{ color: PALETTE.textDim }} />
                </button>
              ) : (
                <>
                  {/* Pomodoro */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="relative w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r={ringRadius} fill="none" stroke={PALETTE.border} strokeWidth="4" />
                        <circle
                          cx="50" cy="50" r={ringRadius} fill="none"
                          stroke={PALETTE.primary} strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={ringCirc}
                          strokeDashoffset={ringCirc * (1 - progress)}
                          style={{ transition: "stroke-dashoffset 1s linear" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[12px] sm:text-[13px] font-bold tabular-nums leading-none" style={{ color: PALETTE.primary }}>
                          {mm}:{ss}
                        </span>
                        <span className="text-[7px] uppercase tracking-[1.8px] mt-0.5" style={{ color: PALETTE.textDim }}>
                          {phase === "focus" ? "Foco" : "Pausa"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setRunning(r => !r); haptic("light"); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: running ? `${PALETTE.primary}14` : PALETTE.surfaceLight,
                        color: running ? PALETTE.primary : PALETTE.text,
                        border: `1px solid ${running ? PALETTE.primary + "55" : PALETTE.border}`,
                      }}>
                      {running ? <><Pause size={10} /> Pausar</> : <><Play size={10} /> Continuar</>}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0" />

                  {/* Music mini-player */}
                  <div
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shrink-0"
                    style={{ background: PALETTE.surfaceLight, border: `1px solid ${PALETTE.border}` }}
                  >
                    <button onClick={toggle} style={{ color: PALETTE.text }}>
                      {playing ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <button onClick={skip} style={{ color: PALETTE.text }}>
                      <SkipForward size={13} />
                    </button>
                    <div className="text-[10px] min-w-[60px]" style={{ color: PALETTE.textDim }}>
                      {trackKey === "custom" ? "🎧 Custom" : `${FOCUS_TRACKS[trackKey].emoji} ${FOCUS_TRACKS[trackKey].label}`}
                    </div>
                    <Volume2 size={10} style={{ color: PALETTE.textDim }} />
                    <input
                      type="range" min={0} max={100} value={volume}
                      onChange={(e) => changeVolume(parseInt(e.target.value, 10))}
                      className="w-12"
                      style={{ accentColor: PALETTE.primary }}
                    />
                    <div className="w-px h-4" style={{ background: PALETTE.border }} />
                    {(["lofi", "piano", "ambient"] as FocusTrackKey[]).map(k => (
                      <button key={k} onClick={() => setTrack(k)}
                        className="w-6 h-6 rounded-full text-xs transition-all hover:scale-110 flex items-center justify-center"
                        style={{
                          background: trackKey === k ? `${PALETTE.primary}22` : "transparent",
                          border: `1px solid ${trackKey === k ? PALETTE.primary + "66" : PALETTE.border}`,
                        }}>
                        {FOCUS_TRACKS[k as Exclude<FocusTrackKey, "custom">].emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowYtInput(v => !v)}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        background: trackKey === "custom" ? `${PALETTE.primary}22` : "transparent",
                        border: `1px solid ${trackKey === "custom" ? PALETTE.primary + "66" : PALETTE.border}`,
                        color: trackKey === "custom" ? PALETTE.primary : PALETTE.text,
                      }}
                      title="Link YouTube"
                    >
                      <Youtube size={10} />
                    </button>
                  </div>

                  {/* Mobile compact music toggle */}
                  <button
                    onClick={toggle}
                    className="sm:hidden w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: PALETTE.surfaceLight, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }}
                    aria-label={playing ? "Pausar música" : "Tocar música"}
                  >
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                </>
              )}

              <div className={chromeCollapsed ? "flex-1 min-w-0" : ""} />

              {/* Minimize chrome toggle */}
              {!chromeCollapsed && (
                <button
                  onClick={() => { setChromeCollapsed(true); haptic("light"); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
                  style={{ background: PALETTE.surfaceLight, color: PALETTE.textDim, border: `1px solid ${PALETTE.border}` }}
                  aria-label="Minimizar barra"
                  title="Minimizar"
                >
                  <ChevronUp size={13} />
                </button>
              )}

              {/* Zen mode (hide everything except chat) */}
              <button
                onClick={() => { setZenMode(true); haptic("medium"); }}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
                style={{ background: PALETTE.surfaceLight, color: PALETTE.textDim, border: `1px solid ${PALETTE.border}` }}
                aria-label="Modo zen"
                title="Modo zen (Cmd+Shift+Z)"
              >
                <Eye size={13} />
              </button>

              <button
                onClick={toggleFullscreen}
                className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center transition-colors shrink-0"
                style={{ background: PALETTE.surfaceLight, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }}
                aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
                style={{ background: PALETTE.surfaceLight, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }}
                aria-label="Sair do Modo Foco"
                title="Sair do Modo Foco"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Zen exit pill (top-right floating) */}
          {zenMode && (
            <button
              onClick={() => { setZenMode(false); haptic("light"); }}
              className="absolute top-3 right-3 z-[260] flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105"
              style={{
                background: `${PALETTE.bg}cc`,
                border: `1px solid ${PALETTE.border}`,
                color: PALETTE.textDim,
                backdropFilter: "blur(8px)",
              }}
              title="Sair do Zen (Esc)"
            >
              <Minimize2 size={11} />
              <span className="text-[10px] uppercase tracking-[1.5px] font-bold">Sair zen</span>
            </button>
          )}

          {/* YouTube input row */}
          {showYtInput && (
            <div
              className="px-4 py-2.5 border-b animate-fade-in flex items-center gap-2 shrink-0"
              style={{ background: PALETTE.surface, borderColor: PALETTE.border }}
            >
              <Youtube size={15} style={{ color: PALETTE.primary }} />
              <input
                value={ytInput}
                onChange={e => setYtInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitCustomYt(); }}
                placeholder="Cole uma URL do YouTube ou ID"
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:opacity-40"
                style={{ color: PALETTE.text }}
              />
              <button
                onClick={submitCustomYt}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: `${PALETTE.primary}22`, color: PALETTE.primary, border: `1px solid ${PALETTE.primary}55` }}
              >
                Ativar
              </button>
              <button onClick={() => setShowYtInput(false)} style={{ color: PALETTE.textDim }}>
                <X size={13} />
              </button>
            </div>
          )}

          {/* COMMAND CHAT — the hub */}
          <div className="flex-1 overflow-hidden relative min-h-0 flex flex-col">
            <FocusTTSPlayer />
            <div className="flex-1 overflow-hidden min-h-0">
              <FocusCommandChat userCodeId={userCodeId} weeks={weeks} devotionals={devotionals} />
            </div>
          </div>
        </main>
      </div>

      {/* Tool overlay (mind map / notebook) — opens above the chat without leaving Focus */}
      {activeTool && (
        <div
          className="absolute inset-0 z-[300] flex flex-col animate-fade-in"
          style={{ background: PALETTE.bg }}
        >
          <div
            className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
            style={{ background: PALETTE.surface, borderColor: PALETTE.border }}
          >
            <button
              onClick={() => { setActiveTool(null); haptic("light"); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: PALETTE.surfaceLight, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }}
              aria-label="Voltar para o chat"
            >
              <X size={15} />
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: PALETTE.primary }}>
              {activeTool.tool === "notebook" || activeTool.tool === "notebook-open" ? "Caderno" : "Estudo Guiado"}
            </p>
            <span className="text-[10px]" style={{ color: PALETTE.textDim }}>· ESC para fechar</span>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-sm" style={{ color: PALETTE.textDim }}>Carregando…</div>}>
              {(activeTool.tool === "mindmap" || activeTool.tool === "mindmap-open") && (
                <MindMapTab userCodeId={userCodeId} />
              )}
              {(activeTool.tool === "notebook" || activeTool.tool === "notebook-open") && (
                <NotebookList userCodeId={userCodeId} />
              )}
            </Suspense>
          </div>
        </div>
      )}

      {/* Brain Areas Hub (overlays the chat when active) */}
      {brainMode && (
        <div className="absolute inset-0 z-[250]" style={{ background: PALETTE.bg }}>
          <div
            className="absolute top-0 left-0 right-0 z-[260] flex items-center gap-3 px-4 py-2.5 border-b shrink-0"
            style={{ background: PALETTE.surface, borderColor: PALETTE.border }}
          >
            <button
              onClick={() => { setBrainMode(false); setBrainSeed(""); haptic("light"); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: PALETTE.surfaceLight, color: PALETTE.text, border: `1px solid ${PALETTE.border}` }}
              aria-label="Voltar ao chat do Foco"
            >
              <X size={15} />
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: PALETTE.primary }}>
              Segundo Cérebro · Áreas
            </p>
          </div>
          <div className="absolute inset-0 pt-[57px]">
            <BrainAreasHub
              userCodeId={userCodeId}
              initialContent={brainSeed}
              onAreaClose={() => { /* stays open in hub */ }}
            />
          </div>
        </div>
      )}
      {/* Celebration */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[400] animate-fade-in">
          <div className="text-center">
            <div className="text-7xl mb-3">🧠✨</div>
            <p className="text-xl font-bold" style={{ color: PALETTE.primary }}>
              +25min de foco profundo
            </p>
            <p className="text-sm mt-1" style={{ color: PALETTE.textDim }}>Você está construindo seu segundo cérebro</p>
          </div>
        </div>
      )}

      <style>{`
        .focus-workspace-root { color-scheme: dark; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Mobile responsive: sidebar becomes drawer */
        @media (max-width: 767px) {
          .focus-sidebar {
            position: fixed;
            top: 0; bottom: 0; left: 0;
            z-index: 220;
            transform: translateX(${sidebarOpen ? "0" : "-100%"});
            transition: transform 0.3s ease;
          }
          .focus-mobile-menu { display: flex; }
        }
        @media (min-width: 768px) {
          .focus-mobile-menu { display: none; }
          .focus-mobile-overlay { display: none; }
        }
      `}</style>
    </div>
  );
}

function Sparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PALETTE.primary} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6" opacity="0.6" />
    </svg>
  );
}
