import { Pause, Play, Square, Headphones, X } from "lucide-react";
import { useFocusTTS, type FocusTTSRate } from "@/hooks/useFocusTTS";
import { FOCUS_PALETTE as P } from "./artifacts/types";
import { haptic } from "@/hooks/useHaptic";

const RATES: FocusTTSRate[] = [0.85, 1, 1.15, 1.3];

/**
 * Floating sticky TTS mini-player.
 * Renders only when something is playing/paused.
 */
export default function FocusTTSPlayer() {
  const tts = useFocusTTS();
  if (!tts.playingId) return null;

  const cycleRate = () => {
    const idx = RATES.indexOf(tts.rate);
    const next = RATES[(idx + 1) % RATES.length];
    tts.setRate(next);
    haptic("light");
  };

  const onTogglePlay = () => {
    haptic("light");
    if (tts.isPaused) tts.resume();
    else tts.pause();
  };

  const onStop = () => {
    haptic("medium");
    tts.stop();
  };

  const progressPct = Math.max(0, Math.min(100, tts.progress * 100));

  return (
    <div
      className="sticky top-0 z-[150] px-3 sm:px-6 pt-2 pb-1 pointer-events-none"
      aria-live="polite"
    >
      <div className="mx-auto w-full max-w-[760px] pointer-events-auto">
        <div
          className="rounded-2xl px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 focus-tts-enter"
          style={{
            background: "rgba(17, 22, 29, 0.92)",
            border: `1px solid ${P.primary}33`,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: `0 8px 28px -10px ${P.primary}55, inset 0 1px 0 rgba(255,255,255,0.04)`,
          }}
        >
          {/* Pulsing icon + wave */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative"
            style={{
              background: `${P.primary}1a`,
              border: `1px solid ${P.primary}55`,
              color: P.primary,
            }}
          >
            <Headphones size={13} strokeWidth={2.4} />
            {!tts.isPaused && (
              <span
                className="absolute inset-0 rounded-lg"
                style={{
                  border: `1px solid ${P.primary}66`,
                  animation: "ttsPulse 1.6s ease-out infinite",
                }}
              />
            )}
          </div>

          {/* Label + progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p
                className="text-[11px] font-bold uppercase tracking-[1.6px] truncate"
                style={{ color: P.primary }}
              >
                {tts.isPaused ? "Pausado" : "Lendo"}
                {tts.label ? ` · ${tts.label}` : ""}
              </p>
              <span
                className="text-[10px] tabular-nums shrink-0"
                style={{ color: P.textDim }}
              >
                {tts.sentenceIdx}/{tts.totalSentences}
              </span>
            </div>
            <div
              className="h-[3px] rounded-full overflow-hidden"
              style={{ background: `${P.primary}1a` }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${progressPct}%`,
                  background: P.primary,
                  boxShadow: `0 0 8px ${P.primary}88`,
                }}
              />
            </div>
          </div>

          {/* Controls */}
          <button
            onClick={cycleRate}
            className="px-2 py-1 rounded-md text-[10.5px] font-bold tabular-nums shrink-0 transition-all hover:scale-105"
            style={{
              background: "transparent",
              color: P.textDim,
              border: `1px solid ${P.border}`,
              minHeight: 28,
              minWidth: 38,
            }}
            aria-label={`Velocidade ${tts.rate}x`}
            title="Velocidade"
          >
            {tts.rate}x
          </button>
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
            style={{
              background: `${P.primary}22`,
              color: P.primary,
              border: `1px solid ${P.primary}55`,
            }}
            aria-label={tts.isPaused ? "Continuar" : "Pausar"}
          >
            {tts.isPaused ? <Play size={13} strokeWidth={2.6} /> : <Pause size={13} strokeWidth={2.6} />}
          </button>
          <button
            onClick={onStop}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
            style={{
              background: P.surfaceLight,
              color: P.textDim,
              border: `1px solid ${P.border}`,
            }}
            aria-label="Parar leitura"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ttsPulse {
          0% { transform: scale(1); opacity: .8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes focusTtsIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .focus-tts-enter { animation: focusTtsIn 0.32s cubic-bezier(0.22,1,0.36,1); }
        @media (prefers-reduced-motion: reduce) {
          .focus-tts-enter { animation: none; }
        }
      `}</style>
    </div>
  );
}
