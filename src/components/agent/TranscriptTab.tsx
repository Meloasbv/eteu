import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import type { StudySessionRow } from "./types";

interface Props { session: StudySessionRow }

function fmtTime(sec: number) {
  if (!isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TranscriptTab({ session }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(session.duration_seconds || 0);

  // Construir mapa de notas pessoais por timestamp para inserção inline
  const notesByMs = new Map<number, string>();
  (session.personal_notes || []).forEach((n) => notesByMs.set(n.timestamp, n.text));

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onLoaded = () => setDuration(a.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  const seekTo = (sec: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = sec;
    a.play().catch(() => {});
  };

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      {/* Player */}
      {session.audio_url && (
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md py-3 mb-4 border-b border-border/40">
          <audio ref={audioRef} src={session.audio_url} preload="metadata" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => audioRef.current?.[playing ? "pause" : "play"]()}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{fmtTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-mono text-muted-foreground">{fmtTime(duration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Topics + transcript */}
      {(session.topics || []).length === 0 && (
        <div className="prose prose-invert max-w-none">
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 16, lineHeight: 1.75 }}>
            {session.full_transcript || "Sem transcrição."}
          </p>
        </div>
      )}

      {(session.topics || []).map((t, i) => {
        const startSec = Math.floor(t.startTimestamp / 1000);
        return (
          <section key={t.id} className="mb-8">
            <button
              onClick={() => seekTo(startSec)}
              className="flex items-baseline gap-2 mb-3 group"
            >
              <span className="text-[10px] font-mono text-primary group-hover:underline">{fmtTime(startSec)}</span>
              <h3 className="font-display text-base text-foreground group-hover:text-primary transition-colors">
                #{i + 1} {t.title}
              </h3>
            </button>
            {t.keyPoints.length > 0 && (
              <ul className="text-sm text-foreground/85 space-y-1 mb-3 pl-1" style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 15, lineHeight: 1.7 }}>
                {t.keyPoints.map((p, k) => (
                  <li key={k}>· {p}</li>
                ))}
              </ul>
            )}
            {t.impactPhrases.length > 0 && t.impactPhrases.map((ph, k) => (
              <blockquote key={k} className="my-2 pl-3 italic text-sm" style={{ borderLeft: "3px solid hsl(var(--primary) / 0.6)", color: "hsl(var(--primary))" }}>
                ⚡ "{ph}"
              </blockquote>
            ))}
            {t.verses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {t.verses.map((v) => (
                  <span key={v} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">📖 {v}</span>
                ))}
              </div>
            )}
            {/* Notas pessoais que caem nesta janela */}
            {(session.personal_notes || [])
              .filter((n) => {
                const next = (session.topics || [])[i + 1];
                const endMs = next?.startTimestamp ?? Number.POSITIVE_INFINITY;
                return n.timestamp >= t.startTimestamp && n.timestamp < endMs;
              })
              .map((n) => (
                <div
                  key={n.id}
                  className="my-3 px-3 py-2 italic text-sm rounded-r-lg"
                  style={{
                    background: "hsl(var(--primary) / 0.06)",
                    borderLeft: "3px solid hsl(var(--primary) / 0.6)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  <span className="font-mono text-[10px] mr-1.5">✏️ {fmtTime(Math.floor(n.timestamp / 1000))}</span>
                  {n.text}
                </div>
              ))}
          </section>
        );
      })}

      {/* Full transcript fallback ao final */}
      {(session.topics || []).length > 0 && (
        <details className="mt-12 text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver transcrição bruta completa
          </summary>
          <p className="mt-3 text-foreground/70 whitespace-pre-wrap" style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 14, lineHeight: 1.7 }}>
            {session.full_transcript}
          </p>
        </details>
      )}
    </div>
  );
}
