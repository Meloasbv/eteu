import { useEffect, useMemo, useRef, useState } from "react";
import { X, Mic, MicOff, SkipForward, Pause, Play, Sparkles, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";
import { useFocusMusic, FOCUS_TRACKS, type FocusTrackKey } from "@/hooks/useFocusMusic";

// 4 palettes that cycle. Pure dark + accent that morph.
const PALETTES = [
  { key: "deep", label: "Profundo", from: "#1a0f2e", via: "#3a1c5c", to: "#0f0a1f", accent: "#a78bfa" },
  { key: "ocean", label: "Oceano", from: "#0a1d2e", via: "#0f4a6e", to: "#06132a", accent: "#5cbdb9" },
  { key: "forest", label: "Floresta", from: "#0f1f15", via: "#1b4332", to: "#070f0a", accent: "#73ffb8" },
  { key: "sunset", label: "Crepúsculo", from: "#2a0f1a", via: "#7a2a35", to: "#1a0508", accent: "#ff8a5c" },
];

const POMODORO_FOCUS_MIN = 25;
const POMODORO_BREAK_MIN = 5;
const FOCUS_MIN_KEY = "fascinacao-focus-minutes-today";
const FOCUS_DATE_KEY = "fascinacao-focus-date";

interface Props {
  userCodeId: string;
  open: boolean;
  onClose: () => void;
}

export default function FocusMode({ userCodeId, open, onClose }: Props) {
  const [paletteIdx, setPaletteIdx] = useState(0);
  const palette = PALETTES[paletteIdx];
  const [content, setContent] = useState("");
  const [streak, setStreak] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [todayMin, setTodayMin] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Pomodoro
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_FOCUS_MIN * 60);
  const [running, setRunning] = useState(true);

  const { iframeRef, trackKey, playing, toggle, setTrack, skip, volume, changeVolume } = useFocusMusic(open);
  const recognitionRef = useRef<any>(null);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Restore today minutes
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

  // Cycle palettes every 25s
  useEffect(() => {
    if (!open || reduceMotion) return;
    const t = setInterval(() => setPaletteIdx(i => (i + 1) % PALETTES.length), 25000);
    return () => clearInterval(t);
  }, [open, reduceMotion]);

  // Pomodoro timer + accumulate today minutes
  useEffect(() => {
    if (!open || !running) return;
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          // phase complete
          if (phase === "focus") {
            try {
              const cur = parseInt(localStorage.getItem(FOCUS_MIN_KEY) || "0", 10) + POMODORO_FOCUS_MIN;
              localStorage.setItem(FOCUS_MIN_KEY, String(cur));
              setTodayMin(cur);
            } catch {}
            setShowCelebration(true);
            haptic("heavy");
            setTimeout(() => setShowCelebration(false), 4500);
            setPhase("break");
            return POMODORO_BREAK_MIN * 60;
          } else {
            setPhase("focus");
            haptic("medium");
            return POMODORO_FOCUS_MIN * 60;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, running, phase]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const totalSeconds = phase === "focus" ? POMODORO_FOCUS_MIN * 60 : POMODORO_BREAK_MIN * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  const captureThought = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    haptic("medium");
    const { data: inserted, error } = await supabase
      .from("thoughts")
      .insert({ user_code_id: userCodeId, content: content.trim(), type: "reflexão", keywords: [] as string[] })
      .select()
      .single();
    if (error || !inserted) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      setSubmitting(false); return;
    }
    setContent("");
    setStreak(s => s + 1);
    setSubmitting(false);
    haptic("light");
    // Background analysis (fire and forget)
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

  if (!open) return null;

  const ringRadius = 28;
  const ringCirc = 2 * Math.PI * ringRadius;

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden text-white" style={{ fontFamily: "var(--font-body)" }}>
      {/* Background gradient that morphs */}
      <div
        className="absolute inset-0 transition-all duration-[6000ms] ease-in-out"
        style={{
          background: `radial-gradient(120% 100% at 50% 20%, ${palette.via}, ${palette.from} 55%, ${palette.to} 100%)`,
        }}
      />
      {/* Soft particles via animated radial dots */}
      {!reduceMotion && (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute block rounded-full"
              style={{
                width: 4 + (i % 4) * 2,
                height: 4 + (i % 4) * 2,
                background: palette.accent,
                left: `${(i * 53) % 100}%`,
                top: `${(i * 37) % 100}%`,
                opacity: 0.3,
                filter: "blur(1px)",
                animation: `focus-float ${10 + (i % 6) * 2}s ease-in-out ${i * 0.4}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      {/* YouTube hidden iframe (lazy mounted only when open) */}
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${FOCUS_TRACKS[trackKey].id}?enablejsapi=1&autoplay=1&loop=1&playlist=${FOCUS_TRACKS[trackKey].id}&controls=0`}
        allow="autoplay; encrypted-media"
        className="absolute w-0 h-0 border-none opacity-0 pointer-events-none"
        title="Focus music"
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Pomodoro ring */}
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
              <circle
                cx="32" cy="32" r={ringRadius} fill="none"
                stroke={palette.accent} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={ringCirc}
                strokeDashoffset={ringCirc * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 6s" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold tabular-nums" style={{ color: palette.accent }}>{mm}:{ss}</span>
              <span className="text-[8px] uppercase tracking-widest opacity-60">{phase === "focus" ? "Foco" : "Pausa"}</span>
            </div>
          </div>
          <button onClick={() => setRunning(r => !r)} className="text-white/70 hover:text-white transition-colors">
            {running ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[3px] opacity-60">Modo Foco</p>
            <p className="text-xs font-bold transition-all duration-1000" style={{ color: palette.accent }}>{palette.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Sair do Modo Foco"
        >
          <X size={16} />
        </button>
      </div>

      {/* Center capture */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          className="w-full max-w-2xl rounded-3xl p-6 backdrop-blur-md border"
          style={{
            background: "rgba(0,0,0,0.35)",
            borderColor: `${palette.accent}33`,
            boxShadow: `0 0 80px -20px ${palette.accent}66`,
            animation: reduceMotion ? undefined : "focus-breathe 10s ease-in-out infinite",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} style={{ color: palette.accent }} />
            <span className="text-[10px] uppercase tracking-[3px] opacity-60">O que está na sua mente?</span>
            {streak > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold animate-scale-in"
                style={{ background: `${palette.accent}22`, color: palette.accent, border: `1px solid ${palette.accent}55` }}>
                ⚡ +{streak}
              </span>
            )}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") captureThought(); }}
            placeholder="Capture aqui um pensamento, oração, insight…"
            className="w-full bg-transparent border-none outline-none resize-none text-white/95 placeholder:text-white/30 text-base leading-relaxed font-body"
            style={{ minHeight: 140 }}
          />
          <div className="flex items-center gap-2 mt-3">
            <button onClick={toggleVoice}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ background: isListening ? "rgba(255,80,80,0.2)" : "rgba(255,255,255,0.08)", color: isListening ? "#ff8a8a" : "white" }}>
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <div className="flex-1" />
            <button
              onClick={captureThought}
              disabled={!content.trim() || submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 active:scale-95"
              style={{
                background: `${palette.accent}22`,
                color: palette.accent,
                border: `1px solid ${palette.accent}66`,
              }}
            >
              <Sparkles size={14} />
              {submitting ? "Salvando..." : "Capturar"}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar: music + stats */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between gap-3 z-10 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md" style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${palette.accent}33` }}>
          <button onClick={toggle} className="text-white/80 hover:text-white">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={skip} className="text-white/80 hover:text-white">
            <SkipForward size={14} />
          </button>
          <span className="text-[11px] font-ui opacity-80">{FOCUS_TRACKS[trackKey].emoji} {FOCUS_TRACKS[trackKey].label}</span>
          <div className="flex items-center gap-1.5 ml-2">
            <Volume2 size={12} className="opacity-60" />
            <input
              type="range" min={0} max={100} value={volume}
              onChange={(e) => changeVolume(parseInt(e.target.value, 10))}
              className="w-16 accent-white/70"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(Object.keys(FOCUS_TRACKS) as FocusTrackKey[]).map(k => (
            <button key={k} onClick={() => setTrack(k)}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-ui transition-colors"
              style={{
                background: trackKey === k ? `${palette.accent}22` : "transparent",
                color: trackKey === k ? palette.accent : "rgba(255,255,255,0.6)",
                border: `1px solid ${trackKey === k ? palette.accent + "55" : "rgba(255,255,255,0.15)"}`,
              }}>
              {FOCUS_TRACKS[k].emoji}
            </button>
          ))}
        </div>

        <div className="text-[11px] opacity-70 font-ui">
          ⏱️ Foco hoje: <span className="font-bold" style={{ color: palette.accent }}>{todayMin}min</span>
        </div>
      </div>

      {/* Celebration */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-fade-in">
          <div className="text-center">
            <div className="text-6xl mb-2">🧠✨</div>
            <p className="text-lg font-bold" style={{ color: palette.accent }}>Você está construindo seu segundo cérebro</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes focus-float {
          0% { transform: translateY(0) translateX(0); }
          100% { transform: translateY(-30px) translateX(20px); }
        }
        @keyframes focus-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.012); }
        }
      `}</style>
    </div>
  );
}
