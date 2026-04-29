import { useEffect, useRef, useState } from "react";
import { Play, Pause, BookOpen, Quote, Volume2 } from "lucide-react";
import type { DetectedTopic } from "./types";

interface Props {
  title: string;
  audioUrl: string | null;
  topics: DetectedTopic[];
  durationSeconds?: number;
}

const fmt = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};

/**
 * Timeline editorial:
 *   • Topo: player de áudio (sticky)
 *   • Faixa horizontal: tópicos interligados em linha do tempo (clicáveis → seek)
 *   • Abaixo: cards verticais com versículos + pontos falados de cada tópico
 */
export default function AgentTimelineView({ title, audioUrl, topics, durationSeconds = 0 }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [audioDuration, setAudioDuration] = useState(durationSeconds * 1000);
  const cardsRef = useRef<Record<string, HTMLDivElement | null>>({});

  // Sincroniza estado do áudio
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentMs(a.currentTime * 1000);
    const onMeta = () => setAudioDuration(a.duration * 1000 || durationSeconds * 1000);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onPause);
    };
  }, [durationSeconds]);

  const totalMs = audioDuration || (topics.length ? Math.max(...topics.map((t) => t.startTimestamp + 30000)) : 1);

  const seekToTopic = (t: DetectedTopic) => {
    const a = audioRef.current;
    if (a && audioUrl) {
      a.currentTime = t.startTimestamp / 1000;
      a.play().catch(() => {});
    }
    // Scroll suave até o card
    cardsRef.current[t.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  // Tópico ativo = último cujo startTimestamp <= currentMs
  const activeIdx = topics.reduce((acc, t, i) => (t.startTimestamp <= currentMs ? i : acc), -1);

  if (!topics.length) {
    return (
      <div className="flex items-center justify-center h-full text-sm italic text-muted-foreground/70">
        Nenhum tópico detectado nesta sessão.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* ──── PLAYER STICKY + TIMELINE ──── */}
      <div
        className="sticky top-0 z-20 backdrop-blur-md border-b border-border/40"
        style={{ background: "hsl(var(--background) / 0.85)" }}
      >
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-4 lg:py-5">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={togglePlay}
              disabled={!audioUrl}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                color: "hsl(var(--primary-foreground))",
                boxShadow: "0 4px 20px -4px hsl(var(--primary) / 0.5)",
              }}
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-base lg:text-lg text-foreground truncate leading-tight">{title}</h2>
              <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                {fmt(currentMs / 1000)} <span className="opacity-50">/</span> {fmt(totalMs / 1000)} · {topics.length} blocos
              </p>
            </div>
            {!audioUrl && (
              <span className="text-[10px] text-muted-foreground/60 italic shrink-0 hidden sm:inline">
                sem áudio
              </span>
            )}
          </div>

          {/* Timeline horizontal — barra com marcadores */}
          <div className="relative pt-4 pb-2">
            {/* Trilha base */}
            <div className="absolute left-0 right-0 top-[26px] h-px bg-border/50" />
            {/* Progresso */}
            <div
              className="absolute left-0 top-[26px] h-px transition-all"
              style={{
                width: `${Math.min(100, (currentMs / totalMs) * 100)}%`,
                background: "hsl(var(--primary))",
                boxShadow: "0 0 8px hsl(var(--primary) / 0.6)",
              }}
            />

            {/* Marcadores de tópicos */}
            <div className="relative flex items-start" style={{ minHeight: 52 }}>
              {topics.map((t, i) => {
                const pct = Math.min(100, Math.max(0, (t.startTimestamp / totalMs) * 100));
                const isActive = i === activeIdx;
                const isPast = t.startTimestamp <= currentMs;
                return (
                  <button
                    key={t.id}
                    onClick={() => seekToTopic(t)}
                    className="absolute -translate-x-1/2 group flex flex-col items-center gap-1 transition-all"
                    style={{ left: `${pct}%`, top: 0 }}
                    title={t.title}
                  >
                    {/* Ponto */}
                    <div
                      className="rounded-full transition-all"
                      style={{
                        width: isActive ? 14 : 10,
                        height: isActive ? 14 : 10,
                        background: isPast ? "hsl(var(--primary))" : "hsl(var(--muted))",
                        border: `2px solid hsl(var(--background))`,
                        boxShadow: isActive ? "0 0 0 3px hsl(var(--primary) / 0.25)" : "none",
                        marginTop: isActive ? 19 : 21,
                      }}
                    />
                    {/* Label do tópico */}
                    <span
                      className={`text-[9px] font-ui whitespace-nowrap mt-1 transition-colors px-1 ${
                        isActive ? "text-primary font-bold" : "text-muted-foreground/70 group-hover:text-foreground"
                      }`}
                      style={{
                        maxWidth: 90,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ──── CARDS VERTICAIS ──── */}
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 lg:py-10 space-y-10 lg:space-y-14">
        {topics.map((t, i) => {
          const isActive = i === activeIdx;
          return (
            <article
              key={t.id}
              ref={(el: HTMLDivElement | null) => { cardsRef.current[t.id] = el; }}
              className="relative group"
            >
              {/* Linha vertical conectora */}
              {i < topics.length - 1 && (
                <div
                  className="absolute left-[18px] lg:left-[22px] top-12 w-px h-[calc(100%+2.5rem)] lg:h-[calc(100%+3.5rem)]"
                  style={{
                    background: `linear-gradient(180deg, hsl(var(--primary) / 0.4), hsl(var(--primary) / 0.05))`,
                  }}
                />
              )}

              <div className="flex gap-3 lg:gap-5">
                {/* Índice / timestamp */}
                <div className="flex flex-col items-center shrink-0">
                  <button
                    onClick={() => seekToTopic(t)}
                    className="rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      width: 38,
                      height: 38,
                      background: isActive ? "hsl(var(--primary))" : "hsl(var(--card))",
                      border: `2px solid hsl(var(--primary) / ${isActive ? 1 : 0.4})`,
                      color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))",
                      boxShadow: isActive ? "0 0 0 4px hsl(var(--primary) / 0.15)" : "none",
                    }}
                    title="Tocar a partir daqui"
                  >
                    <span className="font-display text-sm font-bold" style={{ fontFeatureSettings: "'tnum'" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                  <span className="text-[9px] font-mono text-muted-foreground/60 mt-1.5">
                    {fmt(t.startTimestamp / 1000)}
                  </span>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 pt-1.5 pb-2">
                  {/* Título */}
                  <button
                    onClick={() => seekToTopic(t)}
                    className="text-left group/title"
                  >
                    <h3
                      className="font-display text-lg lg:text-xl text-foreground leading-tight group-hover/title:text-primary transition-colors"
                    >
                      {t.title}
                    </h3>
                  </button>

                  {/* Resumo (quote elegante) */}
                  {t.summary && (
                    <p
                      className="mt-3 text-[15px] lg:text-base text-foreground/85 leading-relaxed pl-4 border-l-2"
                      style={{
                        fontFamily: "'Crimson Text', Georgia, serif",
                        borderColor: "hsl(var(--primary) / 0.4)",
                      }}
                    >
                      {t.summary}
                    </p>
                  )}

                  {/* Pontos falados */}
                  {t.keyPoints.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {t.keyPoints.map((kp, k) => (
                        <li
                          key={k}
                          className="text-sm lg:text-[15px] text-foreground/80 flex gap-2.5 leading-relaxed"
                          style={{ fontFamily: "'Crimson Text', Georgia, serif" }}
                        >
                          <span className="text-primary/70 mt-1.5 shrink-0">▸</span>
                          <span>{kp}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Frases de impacto */}
                  {t.impactPhrases.map((p, k) => (
                    <blockquote
                      key={k}
                      className="mt-4 pl-4 py-1 italic text-sm flex gap-2"
                      style={{
                        borderLeft: "3px solid hsl(var(--primary) / 0.7)",
                        color: "hsl(var(--primary))",
                        fontFamily: "'Crimson Text', Georgia, serif",
                      }}
                    >
                      <Quote size={12} className="mt-1 shrink-0 opacity-60" />
                      <span>"{p}"</span>
                    </blockquote>
                  ))}

                  {/* Versículos como chips */}
                  {t.verses.length > 0 && (
                    <div className="mt-4 flex items-center flex-wrap gap-1.5">
                      <BookOpen size={12} className="text-primary/70" />
                      {t.verses.map((v) => (
                        <span
                          key={v}
                          className="text-[11px] px-2.5 py-1 rounded-full font-mono text-primary"
                          style={{
                            background: "hsl(var(--primary) / 0.08)",
                            border: "1px solid hsl(var(--primary) / 0.25)",
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Indicador "tocando agora" */}
                  {isActive && audioUrl && playing && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-ui text-primary">
                      <Volume2 size={10} className="animate-pulse" />
                      <span className="tracking-wider uppercase">Tocando agora</span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {/* Fim */}
        <div className="text-center pt-6 pb-4">
          <span className="text-[10px] tracking-[3px] uppercase text-muted-foreground/40 font-ui">
            ◆ Fim da sessão ◆
          </span>
        </div>
      </div>
    </div>
  );
}
