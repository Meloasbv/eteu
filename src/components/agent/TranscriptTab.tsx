import { useEffect, useRef, useState } from "react";
import { Play, Pause, Pencil, Save, X, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { StudySessionRow } from "./types";
import type { AnalysisResult } from "@/components/mindmap/types";

interface Props {
  session: StudySessionRow;
  onUpdate?: (s: StudySessionRow) => void;
}

function fmtTime(sec: number) {
  if (!isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TranscriptTab({ session, onUpdate }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(session.duration_seconds || 0);

  // Edição inline
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.full_transcript || "");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    setDraft(session.full_transcript || "");
  }, [session.full_transcript]);

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

  const saveTranscript = async () => {
    if (draft.trim() === (session.full_transcript || "").trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("study_sessions")
      .update({ full_transcript: draft })
      .eq("id", session.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Falha ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    onUpdate?.(data as any);
    setEditing(false);
    toast({ title: "Transcrição atualizada" });
  };

  const regenerateStudy = async () => {
    if (!confirm("Regenerar o material de estudo a partir da transcrição corrigida? Isso substitui notas, mapa, flashcards e quiz gerados.")) return;
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-build-study", {
        body: { transcript: session.full_transcript, topics: session.topics },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const generated = data as AnalysisResult;
      // preserva áudios fonte se existirem
      if (session.generated_study?.source_audios) {
        generated.source_audios = session.generated_study.source_audios;
      }
      const { data: row, error: upErr } = await supabase
        .from("study_sessions")
        .update({ generated_study: generated as any })
        .eq("id", session.id)
        .select("*")
        .single();
      if (upErr) throw upErr;
      onUpdate?.(row as any);
      toast({ title: "Material regenerado", description: "Notas, flashcards e quiz atualizados." });
    } catch (e: any) {
      toast({ title: "Falha ao regenerar", description: e?.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
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

      {/* Toolbar de edição */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {!editing ? (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui border border-border/50 hover:border-primary/40 text-muted-foreground hover:text-foreground"
            >
              <Pencil size={12} /> Corrigir transcrição
            </button>
            <button
              onClick={regenerateStudy}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui font-bold disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))",
                border: "1px solid hsl(var(--primary) / 0.4)",
                color: "hsl(var(--primary))",
              }}
            >
              {regenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {regenerating ? "Regerando…" : "Regerar estudo"}
            </button>
            <p className="text-[11px] text-muted-foreground/70 ml-1">
              Corrija palavras erradas e regere o material para refletir o texto correto.
            </p>
          </>
        ) : (
          <>
            <button
              onClick={saveTranscript}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui font-bold disabled:opacity-50"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Salvar
            </button>
            <button
              onClick={() => { setDraft(session.full_transcript || ""); setEditing(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui border border-border/50 text-muted-foreground hover:text-foreground"
            >
              <X size={12} /> Cancelar
            </button>
            <p className="text-[11px] text-muted-foreground/70 ml-1">
              Edite o texto livremente. Após salvar, clique em "Regerar estudo" para atualizar notas e quiz.
            </p>
          </>
        )}
      </div>

      {/* Modo edição: textarea único */}
      {editing && (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[60vh] bg-card/40 border border-primary/30 rounded-xl p-4 text-foreground focus:outline-none focus:border-primary/60"
          style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 16, lineHeight: 1.75 }}
          placeholder="Transcrição…"
          autoFocus
        />
      )}

      {/* Modo leitura: tópicos + transcrição estruturada */}
      {!editing && (
        <>
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
        </>
      )}
    </div>
  );
}
