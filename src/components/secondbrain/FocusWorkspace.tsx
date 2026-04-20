import { useEffect, useRef, useState } from "react";
import {
  X, Mic, MicOff, SkipForward, Pause, Play, Sparkles, Volume2, Youtube,
  BookOpen, Flame, PenLine, Brain, Network, Timer, Maximize2, Minimize2,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

type FocusModeKey = "reading" | "devotional" | "notes" | "mindmap" | "capture";

const POMODORO_MIN: Record<"focus" | "break", number> = { focus: 25, break: 5 };
const FOCUS_MIN_KEY = "fascinacao-focus-minutes-today";
const FOCUS_DATE_KEY = "fascinacao-focus-date";

interface Props {
  userCodeId: string;
  open: boolean;
  onClose: () => void;
  onRequestReading?: () => void;
  onRequestDevotional?: () => void;
  onRequestNotes?: () => void;
  onRequestMindMap?: () => void;
}

interface Mode {
  key: FocusModeKey;
  label: string;
  icon: any;
  description: string;
}

const MODES: Mode[] = [
  { key: "capture", label: "Captura", icon: Brain, description: "Pensamentos, orações, insights" },
  { key: "reading", label: "Leitura", icon: BookOpen, description: "Plano bíblico do dia" },
  { key: "devotional", label: "Devocional", icon: Flame, description: "Meditação e reflexão" },
  { key: "notes", label: "Caderno", icon: PenLine, description: "Anotações de estudo" },
  { key: "mindmap", label: "Mapa Mental", icon: Network, description: "Conectar ideias" },
];

export default function FocusWorkspace({
  userCodeId, open, onClose,
  onRequestReading, onRequestDevotional, onRequestNotes, onRequestMindMap,
}: Props) {
  const [paletteIdx, setPaletteIdx] = useState(0);
  const palette = PALETTES[paletteIdx];
  const [mode, setMode] = useState<FocusModeKey>("capture");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Capture state
  const [content, setContent] = useState("");
  const [streak, setStreak] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const recognitionRef = useRef<any>(null);

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
    iframeRef, trackKey, customVideoId, currentVideoId,
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

  // ESC closes (only if not fullscreen — in fullscreen, ESC exits fullscreen)
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

  const totalSeconds = POMODORO_MIN[phase] * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  // Quick capture
  const captureThought = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true); haptic("medium");
    const { data: inserted, error } = await supabase
      .from("thoughts")
      .insert({ user_code_id: userCodeId, content: content.trim(), type: "reflexão", keywords: [] as string[] })
      .select().single();
    if (error || !inserted) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      setSubmitting(false); return;
    }
    setContent(""); setStreak(s => s + 1);
    setSubmitting(false); haptic("light");
    supabase.functions.invoke("analyze-thought", {
      body: { content: inserted.content, pastThoughts: [] },
    }).then(({ data }) => {
      if (data?.analysis) {
        supabase.from("thoughts").update({
          analysis: data.analysis,
          keywords: data.analysis.keywords || [],
          emotion_valence: data.analysis.emotion_score?.valence ?? 0,
          emotion_intensity: data.analysis.emotion_score?.intensity ?? 0,
        }).eq("id", inserted.id);
      }
    }).catch(() => {});
  };

  const toggleVoice = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: "Navegador não suporta voz" }); return; }
    const r = new SR();
    r.lang = "pt-BR"; r.continuous = true; r.interimResults = true;
    r.onresult = (e: any) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setContent(t); };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    r.start(); recognitionRef.current = r; setIsListening(true); haptic("light");
  };

  const handleModeSelect = (k: FocusModeKey) => {
    setMode(k); haptic("light");
    // Mode that need external components: trigger callbacks to open them within platform
    if (k === "reading") onRequestReading?.();
    else if (k === "devotional") onRequestDevotional?.();
    else if (k === "notes") onRequestNotes?.();
    else if (k === "mindmap") onRequestMindMap?.();
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
        <div className="absolute inset-0 pointer-events-none opacity-40">
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

      {/* Lazy YouTube iframe */}
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
          className="h-full flex flex-col border-r backdrop-blur-xl transition-all duration-300"
          style={{
            width: sidebarCollapsed ? 72 : 240,
            background: "rgba(0,0,0,0.35)",
            borderColor: `${palette.accent}22`,
          }}
        >
          {/* Sidebar header */}
          <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: `${palette.accent}1a` }}>
            {!sidebarCollapsed && (
              <div>
                <p className="text-[10px] uppercase tracking-[3px] opacity-60">Modo Foco</p>
                <p className="text-xs font-bold transition-all duration-1000" style={{ color: palette.accent }}>
                  {palette.label}
                </p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label="Recolher menu"
            >
              <ChevronLeft size={16} className={`transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Mode list */}
          <div className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
            {MODES.map(m => {
              const active = mode === m.key;
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => handleModeSelect(m.key)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:scale-[1.02] active:scale-95"
                  style={{
                    background: active ? `${palette.accent}22` : "transparent",
                    border: active ? `1px solid ${palette.accent}55` : "1px solid transparent",
                    color: active ? palette.accent : "rgba(255,255,255,0.75)",
                    boxShadow: active ? `0 0 24px -8px ${palette.accent}88` : undefined,
                  }}
                >
                  <Icon size={18} className="shrink-0" />
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{m.label}</p>
                      <p className="text-[10px] opacity-70 truncate">{m.description}</p>
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
              {streak > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: `${palette.accent}22`, color: palette.accent, border: `1px solid ${palette.accent}55` }}>
                  ⚡ +{streak} streak
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ─── MAIN AREA ─── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar: Pomodoro + controls */}
          <div className="flex items-center gap-4 p-4 border-b backdrop-blur-xl"
            style={{ background: "rgba(0,0,0,0.25)", borderColor: `${palette.accent}1a` }}>
            {/* HUGE Pomodoro ring */}
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 shrink-0">
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
                  <span className="text-xl font-bold tabular-nums" style={{ color: palette.accent }}>
                    {mm}:{ss}
                  </span>
                  <span className="text-[9px] uppercase tracking-[2px] opacity-60 mt-0.5">
                    {phase === "focus" ? "Foco" : "Pausa"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setRunning(r => !r); haptic("light"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: running ? `${palette.accent}22` : "rgba(255,255,255,0.08)",
                    color: running ? palette.accent : "rgba(255,255,255,0.8)",
                    border: `1px solid ${running ? palette.accent + "55" : "rgba(255,255,255,0.15)"}`,
                  }}>
                  {running ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Continuar</>}
                </button>
                <button
                  onClick={() => {
                    setPhase("focus"); setSecondsLeft(POMODORO_MIN.focus * 60); setRunning(true); haptic("medium");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity"
                  style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
                  Reiniciar
                </button>
              </div>
            </div>

            <div className="flex-1" />

            {/* Music mini-player */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md"
              style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${palette.accent}33` }}>
              <button onClick={toggle} className="text-white/80 hover:text-white transition-colors">
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button onClick={skip} className="text-white/80 hover:text-white transition-colors">
                <SkipForward size={14} />
              </button>
              <div className="text-[11px] font-ui opacity-80 min-w-[100px]">
                {trackKey === "custom"
                  ? <>🎧 Custom</>
                  : <>{FOCUS_TRACKS[trackKey].emoji} {FOCUS_TRACKS[trackKey].label}</>}
              </div>
              <div className="flex items-center gap-1.5">
                <Volume2 size={11} className="opacity-60" />
                <input
                  type="range" min={0} max={100} value={volume}
                  onChange={(e) => changeVolume(parseInt(e.target.value, 10))}
                  className="w-14 accent-white/70"
                />
              </div>
              <div className="w-px h-5 bg-white/10" />
              {(["lofi", "piano", "ambient"] as FocusTrackKey[]).map(k => (
                <button key={k} onClick={() => setTrack(k)}
                  className="w-7 h-7 rounded-full text-xs transition-all hover:scale-110"
                  style={{
                    background: trackKey === k ? `${palette.accent}33` : "transparent",
                    border: `1px solid ${trackKey === k ? palette.accent + "66" : "rgba(255,255,255,0.15)"}`,
                  }}>
                  {FOCUS_TRACKS[k as Exclude<FocusTrackKey, "custom">].emoji}
                </button>
              ))}
              <button
                onClick={() => setShowYtInput(v => !v)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: trackKey === "custom" ? `${palette.accent}33` : "transparent",
                  border: `1px solid ${trackKey === "custom" ? palette.accent + "66" : "rgba(255,255,255,0.15)"}`,
                  color: trackKey === "custom" ? palette.accent : "white",
                }}
                title="Adicionar link do YouTube">
                <Youtube size={12} />
              </button>
            </div>

            {/* Fullscreen + close */}
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Sair do Modo Foco"
            >
              <X size={16} />
            </button>
          </div>

          {/* YouTube input row */}
          {showYtInput && (
            <div className="px-4 py-3 border-b animate-fade-in flex items-center gap-2"
              style={{ background: "rgba(0,0,0,0.3)", borderColor: `${palette.accent}1a` }}>
              <Youtube size={16} style={{ color: palette.accent }} />
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
                <X size={14} />
              </button>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            {mode === "capture" && (
              <div
                className="w-full max-w-3xl rounded-3xl p-8 backdrop-blur-md border animate-fade-in"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  borderColor: `${palette.accent}33`,
                  boxShadow: `0 0 120px -30px ${palette.accent}88`,
                  animation: reduceMotion ? undefined : "focus-breathe 10s ease-in-out infinite",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} style={{ color: palette.accent }} />
                  <span className="text-[11px] uppercase tracking-[3px] opacity-60">O que está na sua mente?</span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") captureThought(); }}
                  placeholder="Capture aqui um pensamento, oração, insight…"
                  className="w-full bg-transparent border-none outline-none resize-none text-white/95 placeholder:text-white/30 text-lg leading-relaxed font-body"
                  style={{ minHeight: 200 }}
                />
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={toggleVoice}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: isListening ? "rgba(255,80,80,0.2)" : "rgba(255,255,255,0.08)", color: isListening ? "#ff8a8a" : "white" }}>
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={captureThought}
                    disabled={!content.trim() || submitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 active:scale-95 hover:scale-105"
                    style={{
                      background: `${palette.accent}22`,
                      color: palette.accent,
                      border: `1px solid ${palette.accent}66`,
                      boxShadow: `0 0 24px -8px ${palette.accent}aa`,
                    }}
                  >
                    <Sparkles size={14} />
                    {submitting ? "Salvando..." : "Capturar (Ctrl+Enter)"}
                  </button>
                </div>
              </div>
            )}

            {mode !== "capture" && (
              <div className="w-full max-w-2xl rounded-3xl p-10 backdrop-blur-md border animate-fade-in text-center"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  borderColor: `${palette.accent}33`,
                  boxShadow: `0 0 80px -20px ${palette.accent}66`,
                }}>
                {(() => {
                  const m = MODES.find(x => x.key === mode)!;
                  const Icon = m.icon;
                  return (
                    <>
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                        style={{ background: `${palette.accent}22`, border: `1px solid ${palette.accent}55` }}>
                        <Icon size={36} style={{ color: palette.accent }} />
                      </div>
                      <h2 className="text-2xl font-bold mb-2" style={{ color: palette.accent }}>{m.label}</h2>
                      <p className="text-sm opacity-70 mb-6">{m.description}</p>
                      <button
                        onClick={() => handleModeSelect(m.key)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                        style={{
                          background: `${palette.accent}22`,
                          color: palette.accent,
                          border: `1px solid ${palette.accent}66`,
                          boxShadow: `0 0 24px -8px ${palette.accent}aa`,
                        }}>
                        <Icon size={16} />
                        Abrir {m.label}
                      </button>
                      <p className="text-[10px] uppercase tracking-[2px] opacity-40 mt-6">
                        O timer e a música continuam ativos enquanto você estuda
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
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
        @keyframes focus-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.008); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
