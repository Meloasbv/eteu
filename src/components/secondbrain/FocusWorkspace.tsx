import { useEffect, useRef, useState, ReactNode } from "react";
import {
  X, SkipForward, Pause, Play, Volume2, Youtube,
  BookOpen, Flame, PenLine, Brain, Timer, Maximize2, Minimize2,
  ChevronLeft, Sparkles, Zap,
} from "lucide-react";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";
import { useFocusMusic, FOCUS_TRACKS, type FocusTrackKey } from "@/hooks/useFocusMusic";

// Palettes cycle through the session (dopaminergic color shifts)
const PALETTES = [
  { key: "deep", label: "Profundo", from: "#1a0f2e", via: "#3a1c5c", to: "#0f0a1f", accent: "#a78bfa" },
  { key: "ocean", label: "Oceano", from: "#0a1d2e", via: "#0f4a6e", to: "#06132a", accent: "#5cbdb9" },
  { key: "forest", label: "Floresta", from: "#0f1f15", via: "#1b4332", to: "#070f0a", accent: "#73ffb8" },
  { key: "sunset", label: "Crepúsculo", from: "#2a0f1a", via: "#7a2a35", to: "#1a0508", accent: "#ff8a5c" },
];

export type FocusTab = "leitura" | "devocional" | "anotacoes" | "cerebro";

const POMODORO_MIN: Record<"focus" | "break", number> = { focus: 25, break: 5 };
const FOCUS_MIN_KEY = "fascinacao-focus-minutes-today";
const FOCUS_DATE_KEY = "fascinacao-focus-date";

interface Props {
  open: boolean;
  onClose: () => void;
  tab: FocusTab;
  setTab: (t: FocusTab) => void;
  children: ReactNode; // the actual tab content from Index.tsx
}

const MODES: { key: FocusTab; label: string; icon: any; description: string }[] = [
  { key: "leitura", label: "Leitura", icon: BookOpen, description: "Plano bíblico do dia" },
  { key: "devocional", label: "Devocional", icon: Flame, description: "Meditação diária" },
  { key: "anotacoes", label: "Estudo", icon: PenLine, description: "Caderno & Mapa mental" },
  { key: "cerebro", label: "Cérebro", icon: Brain, description: "Captura & conexões" },
];

export default function FocusWorkspace({ open, onClose, tab, setTab, children }: Props) {
  const [paletteIdx, setPaletteIdx] = useState(0);
  const palette = PALETTES[paletteIdx];
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Palette cycle every 30s
  useEffect(() => {
    if (!open || reduceMotion) return;
    const t = setInterval(() => setPaletteIdx(i => (i + 1) % PALETTES.length), 30000);
    return () => clearInterval(t);
  }, [open, reduceMotion]);

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

  // ESC closes (only if not in fullscreen — ESC exits fullscreen first)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
      className="fixed inset-0 z-[200] overflow-hidden text-white"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Animated background */}
      <div
        className="absolute inset-0 transition-all duration-[6000ms] ease-in-out"
        style={{
          background: `radial-gradient(140% 110% at 30% 10%, ${palette.via}, ${palette.from} 50%, ${palette.to} 100%)`,
        }}
      />
      {/* Floating particles */}
      {!reduceMotion && (
        <div className="absolute inset-0 pointer-events-none opacity-30">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i} className="absolute block rounded-full"
              style={{
                width: 3 + (i % 5) * 2, height: 3 + (i % 5) * 2,
                background: palette.accent,
                left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`,
                opacity: 0.35, filter: "blur(1px)",
                animation: `focus-float ${12 + (i % 6) * 2}s ease-in-out ${i * 0.3}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      {/* Lazy YouTube iframe for music */}
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${currentVideoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${currentVideoId}&controls=0`}
        allow="autoplay; encrypted-media"
        className="absolute w-0 h-0 border-none opacity-0 pointer-events-none"
        title="Focus music"
      />

      {/* MAIN LAYOUT: sidebar + main */}
      <div className="relative z-10 flex h-full w-full">
        {/* ─── SIDEBAR: modes picker ─── */}
        <aside
          className="h-full flex flex-col border-r backdrop-blur-xl transition-all duration-300 shrink-0"
          style={{
            width: sidebarCollapsed ? 72 : 220,
            background: "rgba(8,6,14,0.55)",
            borderColor: `${palette.accent}22`,
          }}
        >
          {/* Sidebar header */}
          <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: `${palette.accent}1a` }}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${palette.accent}22`, border: `1px solid ${palette.accent}55` }}>
                  <Zap size={14} style={{ color: palette.accent }} strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[2.5px] opacity-60 leading-none">Foco</p>
                  <p className="text-[11px] font-bold transition-all duration-1000 leading-tight" style={{ color: palette.accent }}>
                    {palette.label}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(v => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
              aria-label="Recolher menu"
            >
              <ChevronLeft size={14} className={`transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Mode list */}
          <div className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
            {!sidebarCollapsed && (
              <p className="text-[9px] uppercase tracking-[2.5px] opacity-40 px-2 pt-2 pb-1">Seções imersivas</p>
            )}
            {MODES.map(m => {
              const active = tab === m.key;
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => { setTab(m.key); haptic("light"); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:scale-[1.02] active:scale-95"
                  style={{
                    background: active ? `${palette.accent}22` : "transparent",
                    border: active ? `1px solid ${palette.accent}55` : "1px solid transparent",
                    color: active ? palette.accent : "rgba(255,255,255,0.75)",
                    boxShadow: active ? `0 0 24px -8px ${palette.accent}88` : undefined,
                  }}
                >
                  <Icon size={17} className="shrink-0" strokeWidth={active ? 2.2 : 1.6} />
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold leading-tight">{m.label}</p>
                      <p className="text-[10px] opacity-70 truncate leading-tight mt-0.5">{m.description}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Today stats footer */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t" style={{ borderColor: `${palette.accent}1a` }}>
              <div className="flex items-center gap-2 text-xs">
                <Timer size={12} style={{ color: palette.accent }} />
                <span className="opacity-70">Foco hoje:</span>
                <span className="font-bold tabular-nums" style={{ color: palette.accent }}>
                  {todayMin}min
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                style={{ background: `${palette.accent}18`, color: palette.accent, border: `1px solid ${palette.accent}33` }}>
                <Sparkles size={9} /> Imersão ativa
              </div>
            </div>
          )}
        </aside>

        {/* ─── MAIN AREA: Pomodoro topbar + live tab content ─── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar: Pomodoro (BIG) + music + controls */}
          <div className="flex items-center gap-3 px-4 py-3 border-b backdrop-blur-xl shrink-0"
            style={{ background: "rgba(8,6,14,0.55)", borderColor: `${palette.accent}1a` }}>
            {/* HUGE Pomodoro ring */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                  <circle
                    cx="50" cy="50" r={ringRadius} fill="none"
                    stroke={palette.accent} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={ringCirc}
                    strokeDashoffset={ringCirc * (1 - progress)}
                    style={{ transition: "stroke-dashoffset 1s linear, stroke 6s", filter: `drop-shadow(0 0 8px ${palette.accent})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold tabular-nums leading-none" style={{ color: palette.accent }}>
                    {mm}:{ss}
                  </span>
                  <span className="text-[8px] uppercase tracking-[2px] opacity-60 mt-0.5">
                    {phase === "focus" ? "Foco" : "Pausa"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => { setRunning(r => !r); haptic("light"); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: running ? `${palette.accent}22` : "rgba(255,255,255,0.08)",
                    color: running ? palette.accent : "rgba(255,255,255,0.8)",
                    border: `1px solid ${running ? palette.accent + "55" : "rgba(255,255,255,0.15)"}`,
                  }}>
                  {running ? <><Pause size={10} /> Pausar</> : <><Play size={10} /> Continuar</>}
                </button>
                <button
                  onClick={() => {
                    setPhase("focus"); setSecondsLeft(POMODORO_MIN.focus * 60); setRunning(true); haptic("medium");
                  }}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity"
                  style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
                  Reiniciar
                </button>
              </div>
            </div>

            <div className="flex-1" />

            {/* Music mini-player */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md"
              style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${palette.accent}33` }}>
              <button onClick={toggle} className="text-white/80 hover:text-white transition-colors">
                {playing ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button onClick={skip} className="text-white/80 hover:text-white transition-colors">
                <SkipForward size={13} />
              </button>
              <div className="text-[10px] font-ui opacity-80 min-w-[90px]">
                {trackKey === "custom"
                  ? <>🎧 Custom</>
                  : <>{FOCUS_TRACKS[trackKey].emoji} {FOCUS_TRACKS[trackKey].label}</>}
              </div>
              <div className="flex items-center gap-1.5">
                <Volume2 size={10} className="opacity-60" />
                <input
                  type="range" min={0} max={100} value={volume}
                  onChange={(e) => changeVolume(parseInt(e.target.value, 10))}
                  className="w-12 accent-white/70"
                />
              </div>
              <div className="w-px h-4 bg-white/10" />
              {(["lofi", "piano", "ambient"] as FocusTrackKey[]).map(k => (
                <button key={k} onClick={() => setTrack(k)}
                  className="w-6 h-6 rounded-full text-xs transition-all hover:scale-110 flex items-center justify-center"
                  style={{
                    background: trackKey === k ? `${palette.accent}33` : "transparent",
                    border: `1px solid ${trackKey === k ? palette.accent + "66" : "rgba(255,255,255,0.15)"}`,
                  }}>
                  {FOCUS_TRACKS[k as Exclude<FocusTrackKey, "custom">].emoji}
                </button>
              ))}
              <button
                onClick={() => setShowYtInput(v => !v)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: trackKey === "custom" ? `${palette.accent}33` : "transparent",
                  border: `1px solid ${trackKey === "custom" ? palette.accent + "66" : "rgba(255,255,255,0.15)"}`,
                  color: trackKey === "custom" ? palette.accent : "white",
                }}
                title="Adicionar link do YouTube">
                <Youtube size={10} />
              </button>
            </div>

            {/* Fullscreen + close */}
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors shrink-0"
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors shrink-0"
              aria-label="Sair do Modo Foco"
              title="Sair do Modo Foco"
            >
              <X size={15} />
            </button>
          </div>

          {/* YouTube input row */}
          {showYtInput && (
            <div className="px-4 py-3 border-b animate-fade-in flex items-center gap-2 shrink-0"
              style={{ background: "rgba(0,0,0,0.4)", borderColor: `${palette.accent}1a` }}>
              <Youtube size={15} style={{ color: palette.accent }} />
              <input
                value={ytInput}
                onChange={e => setYtInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitCustomYt(); }}
                placeholder="Cole uma URL do YouTube ou ID (ex: https://youtu.be/...)"
                className="flex-1 bg-transparent border-none outline-none text-sm text-white/95 placeholder:text-white/30"
              />
              <button onClick={submitCustomYt}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: `${palette.accent}22`, color: palette.accent, border: `1px solid ${palette.accent}55` }}>
                Ativar
              </button>
              <button onClick={() => setShowYtInput(false)}
                className="text-white/50 hover:text-white">
                <X size={13} />
              </button>
            </div>
          )}

          {/* ─── LIVE PLATFORM CONTENT (the actual Bible reading / devotional / study / brain) ─── */}
          <div
            key={tab}
            className="flex-1 overflow-hidden animate-fade-in relative focus-content-surface"
            style={{
              background: "hsl(var(--background))",
              borderTop: `1px solid ${palette.accent}22`,
            }}
          >
            {/* subtle accent glow at top edge */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${palette.accent}, transparent)`,
                filter: `blur(0.5px)`,
                opacity: 0.6,
              }}
            />
            <div className="h-full w-full overflow-hidden">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Celebration */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[250] animate-fade-in">
          <div className="text-center">
            <div className="text-7xl mb-3">🧠✨</div>
            <p className="text-xl font-bold" style={{ color: palette.accent }}>
              +25min de foco profundo
            </p>
            <p className="text-sm opacity-70 mt-1">Você está construindo seu segundo cérebro</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes focus-float {
          0% { transform: translateY(0) translateX(0); }
          100% { transform: translateY(-40px) translateX(25px); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        /* Ensure inner platform content scrolls properly inside the focus container */
        .focus-content-surface > div { height: 100%; }
      `}</style>
    </div>
  );
}
