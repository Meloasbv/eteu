import { Headphones, Pause, Play } from "lucide-react";
import { useFocusTTS } from "@/hooks/useFocusTTS";
import { FOCUS_PALETTE as P } from "./types";
import { haptic } from "@/hooks/useHaptic";

interface Props {
  id: string;
  text: string;
  label?: string;
  size?: "sm" | "md";
}

/**
 * Compact "Ouvir" button matching ArtifactAction style.
 * Switches between idle / playing / paused states based on global TTS state.
 */
export default function ListenButton({ id, text, label, size = "md" }: Props) {
  const tts = useFocusTTS();
  const isThis = tts.playingId === id;
  const isPlaying = isThis && !tts.isPaused;
  const isPaused = isThis && tts.isPaused;

  const onClick = () => {
    haptic("light");
    if (!isThis) {
      tts.speak(id, text, { label });
    } else if (isPaused) {
      tts.resume();
    } else {
      tts.pause();
    }
  };

  const isActive = isThis;
  const small = size === "sm";

  return (
    <button
      onClick={onClick}
      aria-label={isPlaying ? "Pausar leitura" : isPaused ? "Continuar leitura" : "Ouvir"}
      className={`inline-flex items-center gap-1.5 rounded-lg font-bold transition-all hover:scale-[1.03] active:scale-95 ${
        small ? "px-2 py-1 text-[10.5px]" : "px-3 py-1.5 text-[12px]"
      }`}
      style={{
        background: isActive ? `${P.primary}22` : "transparent",
        color: isActive ? P.primary : P.textDim,
        border: `1px solid ${isActive ? P.primary + "55" : P.border}`,
      }}
    >
      {isPlaying ? (
        <>
          <Pause size={small ? 9 : 11} strokeWidth={2.6} />
          <SoundWave />
          {!small && <span>Ouvindo</span>}
        </>
      ) : isPaused ? (
        <>
          <Play size={small ? 9 : 11} strokeWidth={2.6} /> {!small && "Continuar"}
        </>
      ) : (
        <>
          <Headphones size={small ? 9 : 11} strokeWidth={2.4} /> {!small && "Ouvir"}
        </>
      )}
    </button>
  );
}

function SoundWave() {
  return (
    <span className="inline-flex items-end gap-[2px] h-3" aria-hidden>
      <span className="tts-bar tts-bar-1" />
      <span className="tts-bar tts-bar-2" />
      <span className="tts-bar tts-bar-3" />
      <style>{`
        .tts-bar { display:inline-block; width:2px; background:${P.primary}; border-radius:1px; }
        .tts-bar-1 { animation: ttsWave 0.9s ease-in-out infinite; height:6px; }
        .tts-bar-2 { animation: ttsWave 0.9s ease-in-out infinite; animation-delay:.15s; height:10px; }
        .tts-bar-3 { animation: ttsWave 0.9s ease-in-out infinite; animation-delay:.3s; height:7px; }
        @keyframes ttsWave {
          0%, 100% { transform: scaleY(0.55); }
          50% { transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tts-bar { animation: none !important; }
        }
      `}</style>
    </span>
  );
}
