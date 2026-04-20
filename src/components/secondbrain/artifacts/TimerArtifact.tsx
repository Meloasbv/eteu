import { Timer, Pause, Play, RotateCcw } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";

interface Props {
  data: {
    action?: "pause" | "resume" | "reset" | "set" | "show";
    minutes?: number;
    secondsLeft?: number;
    phase?: "focus" | "break";
    running?: boolean;
  };
  sendAsUser: (text: string) => void;
}

export default function TimerArtifact({ data, sendAsUser }: Props) {
  // Read current timer state from window event bus (set by FocusWorkspace)
  const fire = (event: string, detail?: any) => {
    window.dispatchEvent(new CustomEvent(event, { detail }));
  };

  const onPause = () => {
    fire("focus-timer-pause");
    sendAsUser("timer pausado");
  };
  const onResume = () => {
    fire("focus-timer-resume");
    sendAsUser("timer retomado");
  };
  const onReset = () => {
    fire("focus-timer-reset");
    sendAsUser("timer reiniciado");
  };

  return (
    <ArtifactShell icon={<Timer size={13} />} label="Pomodoro" badge="25 / 5">
      <p className="text-[13px] mb-4" style={{ color: P.textDim }}>
        Use os controles abaixo ou continue digitando: "pausar", "retomar", "reiniciar".
      </p>
      <div className="flex flex-wrap gap-2">
        <ArtifactAction onClick={onPause} variant="primary">
          <Pause size={11} /> Pausar
        </ArtifactAction>
        <ArtifactAction onClick={onResume}>
          <Play size={11} /> Retomar
        </ArtifactAction>
        <ArtifactAction onClick={onReset}>
          <RotateCcw size={11} /> Reiniciar
        </ArtifactAction>
      </div>
    </ArtifactShell>
  );
}
