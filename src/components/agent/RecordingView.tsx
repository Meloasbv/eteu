import { useState, useEffect, useRef, useCallback } from "react";
import { Pause, Play, Square, X, Plus, BookOpen, Sparkles, Mic, List, Network } from "lucide-react";
import { useRealtimeTranscription } from "@/hooks/useRealtimeTranscription";
import { useMediaRecorderAudio } from "@/hooks/useMediaRecorderAudio";
import { useWaveform } from "@/hooks/useWaveform";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/hooks/useHaptic";
import LiveTopicCanvas from "./LiveTopicCanvas";
import type { Edge } from "@xyflow/react";
import type { TranscriptSegment, DetectedTopic, PersonalNote } from "./types";

interface Props {
  userCodeId: string;
  onCancel: () => void;
  onFinish: (payload: {
    title: string;
    duration: number;
    transcript: string;
    topics: DetectedTopic[];
    personalNotes: PersonalNote[];
    audioBlob: Blob | null;
    sourceType: "live" | "upload";
    layout?: { positions: Record<string, { x: number; y: number }>; edges: Edge[] };
  }) => Promise<void>;
}

const CLASSIFY_INTERVAL_MS = 60_000;

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RecordingView({ userCodeId, onCancel, onFinish }: Props) {
  const [topics, setTopics] = useState<DetectedTopic[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [classifying, setClassifying] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [pendingTopicHighlight, setPendingTopicHighlight] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<"list" | "map">("list");
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [canvasEdges, setCanvasEdges] = useState<Edge[]>([]);

  const startedAtRef = useRef<number>(0);
  const lastClassifyAtRef = useRef<number>(0);
  const lastClassifiedSegIdxRef = useRef<number>(0);

  const recorder = useMediaRecorderAudio();
  const transcription = useRealtimeTranscription();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useWaveform(canvasRef.current, recorder.stream, "#d4a94a");

  // Iniciar tudo on-mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await recorder.start();
        if (!mounted) return;
        startedAtRef.current = Date.now();
        transcription.start();
      } catch (e: any) {
        toast({ title: "Permissão negada para microfone", description: e?.message, variant: "destructive" });
        onCancel();
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line
  }, []);

  // Tick timer
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Detecção periódica de tópicos
  useEffect(() => {
    const interval = setInterval(async () => {
      if (classifying) return;
      const segs = transcription.segments;
      const startIdx = lastClassifiedSegIdxRef.current;
      const newSegs = segs.slice(startIdx);
      const newText = newSegs.map((s) => s.text).join(" ").trim();
      if (newText.length < 200) return; // só classifica trecho com substância
      if (Date.now() - lastClassifyAtRef.current < CLASSIFY_INTERVAL_MS) return;

      setClassifying(true);
      lastClassifyAtRef.current = Date.now();
      lastClassifiedSegIdxRef.current = segs.length;

      try {
        const { data, error } = await supabase.functions.invoke("agent-classify", {
          body: { new_text: newText, existing_topics: topics.map((t) => t.title) },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const action = data.topic_action || "existing";
        const verses: string[] = data.detected_verses || [];
        const phrases: string[] = data.impact_phrases || [];
        const points: string[] = data.key_points || [];
        const segIds = newSegs.map((s) => s.id);
        const startTs = newSegs[0]?.timestamp || elapsed * 1000;

        if (action === "new" || topics.length === 0) {
          const title = data.new_topic_title || `Tópico ${topics.length + 1}`;
          const newTopic: DetectedTopic = {
            id: `topic-${Date.now()}`,
            title,
            startTimestamp: startTs,
            segmentIds: segIds,
            verses, impactPhrases: phrases, keyPoints: points,
          };
          // Encerrar tópico anterior
          setTopics((cur) => {
            const updated = cur.map((t, i) => i === cur.length - 1 ? { ...t, endTimestamp: startTs } : t);
            return [...updated, newTopic];
          });
          setPendingTopicHighlight(newTopic.id);
          haptic("light");
          setTimeout(() => setPendingTopicHighlight(null), 2500);
        } else {
          // Append no último tópico
          setTopics((cur) => {
            if (!cur.length) return cur;
            const last = cur[cur.length - 1];
            const updated: DetectedTopic = {
              ...last,
              segmentIds: [...last.segmentIds, ...segIds],
              verses: Array.from(new Set([...last.verses, ...verses])),
              impactPhrases: [...last.impactPhrases, ...phrases],
              keyPoints: [...last.keyPoints, ...points],
            };
            return [...cur.slice(0, -1), updated];
          });
        }
      } catch (e: any) {
        console.warn("[classify]", e);
      } finally {
        setClassifying(false);
      }
    }, 8_000); // checa a cada 8s, mas só dispara após CLASSIFY_INTERVAL_MS desde último
    return () => clearInterval(interval);
  }, [transcription.segments, topics, classifying, elapsed]);

  const togglePause = useCallback(() => {
    if (transcription.listening) {
      transcription.pause();
    } else {
      transcription.resume();
    }
  }, [transcription]);

  const stopAll = useCallback(async () => {
    transcription.stop();
    const blob = await recorder.stop();
    const transcript = transcription.segments.map((s) => s.text).join(" ").trim();
    const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
    await onFinish({
      title: "",
      duration,
      transcript,
      topics,
      personalNotes: notes,
      audioBlob: blob,
      sourceType: "live",
      layout: { positions, edges: canvasEdges },
    });
  }, [recorder, transcription, topics, notes, onFinish, positions, canvasEdges]);

  const addNote = useCallback(() => {
    if (!newNote.trim()) return;
    setNotes((n) => [...n, {
      id: `n-${Date.now()}`,
      text: newNote.trim(),
      timestamp: elapsed * 1000,
      createdAt: new Date().toISOString(),
    }]);
    setNewNote("");
    haptic("light");
  }, [newNote, elapsed]);

  const totalVerses = topics.reduce((acc, t) => acc + t.verses.length, 0);
  const totalPhrases = topics.reduce((acc, t) => acc + t.impactPhrases.length, 0);
  const lastSegments = transcription.segments.slice(-6);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-background">
      {/* Top bar */}
      <header className="px-4 lg:px-6 py-3 border-b border-border/40 flex items-center gap-3 shrink-0">
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground" aria-label="Cancelar">
          <X size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-sm text-foreground">{fmtTime(elapsed)}</span>
        </div>
        {classifying && (
          <span className="flex items-center gap-1 text-[11px] text-primary">
            <Sparkles size={10} className="animate-pulse" /> analisando…
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={togglePause}
            className="px-3 py-1.5 rounded-full text-xs font-ui flex items-center gap-1.5 border border-border/50 hover:border-primary/40"
          >
            {transcription.listening ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Continuar</>}
          </button>
          <button
            onClick={stopAll}
            className="px-3 py-1.5 rounded-full text-xs font-ui font-bold flex items-center gap-1.5"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            <Square size={12} /> Parar
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        {/* Topics column */}
        <aside className="lg:border-r border-border/40 lg:overflow-y-auto px-4 py-4 order-2 lg:order-1">
          <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground/70 font-ui mb-3">
            Tópicos detectados
          </p>
          {topics.length === 0 && !classifying && (
            <p className="text-xs italic text-muted-foreground/70">
              A IA detectará tópicos a cada ~60s de fala.
            </p>
          )}
          <ul className="space-y-2">
            {topics.map((t, i) => {
              const isLive = i === topics.length - 1 && transcription.listening;
              const isHighlight = t.id === pendingTopicHighlight;
              return (
                <li
                  key={t.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isLive ? "border-primary/60 bg-primary/[0.04]" : "border-border/40 bg-card/30"
                  } ${isHighlight ? "animate-[pulse_1s_ease-in-out_2]" : ""}`}
                  style={isLive ? { boxShadow: "inset 3px 0 0 hsl(var(--primary))" } : undefined}
                >
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
                    <span>#{i + 1}</span>
                    <span>·</span>
                    <span>{fmtTime(Math.floor(t.startTimestamp / 1000))}</span>
                    {isLive && <span className="ml-auto text-primary flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> ao vivo
                    </span>}
                  </div>
                  <p className="text-sm font-ui text-foreground leading-snug">{t.title}</p>
                  {t.verses.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.verses.slice(0, 4).map((v) => (
                        <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                          📖 {v}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <Stat label="Versículos" value={totalVerses} />
            <Stat label="Frases-chave" value={totalPhrases} />
            <Stat label="Tópicos" value={topics.length} />
          </div>

          {/* Notas pessoais */}
          <div className="mt-6">
            <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground/70 font-ui mb-2">
              Minhas notas
            </p>
            <div className="flex gap-1 mb-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="Anotar agora…"
                className="flex-1 bg-card border border-border/50 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
              />
              <button
                onClick={addNote}
                className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40"
                aria-label="Adicionar nota"
              >
                <Plus size={14} />
              </button>
            </div>
            <ul className="space-y-1.5">
              {notes.slice().reverse().map((n) => (
                <li key={n.id} className="text-[11px] p-2 rounded-md italic"
                  style={{ background: "hsl(var(--primary) / 0.06)", borderLeft: "2px solid hsl(var(--primary) / 0.6)", color: "hsl(var(--primary))" }}>
                  <span className="font-mono text-[9px] mr-1.5">{fmtTime(Math.floor(n.timestamp / 1000))}</span>
                  {n.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Live transcript */}
        <main className="lg:overflow-hidden flex flex-col px-4 lg:px-8 py-4 order-1 lg:order-2">
          <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground/70 font-ui mb-3 flex items-center gap-2">
            <Mic size={10} /> Transcrição ao vivo
          </p>
          <canvas ref={canvasRef} className="w-full h-12 mb-4" />
          <div
            className="flex-1 lg:overflow-y-auto rounded-xl border border-border/40 bg-card/30 p-4 lg:p-6"
            style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 17, lineHeight: 1.7, color: "hsl(var(--foreground))" }}
          >
            {transcription.segments.length === 0 && !transcription.interim && (
              <p className="italic text-muted-foreground/60 text-sm">
                {transcription.supported
                  ? "Fale algo… o texto aparecerá aqui em tempo real."
                  : "Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari."}
              </p>
            )}
            <div>
              {/* Mostra só os últimos 6 segmentos pra performance/visual */}
              {lastSegments.map((s) => (
                <span key={s.id}> {s.text}</span>
              ))}
              {transcription.interim && (
                <span style={{ opacity: 0.55, fontStyle: "italic" }}> {transcription.interim}</span>
              )}
              {transcription.listening && (
                <span
                  className="inline-block w-[2px] h-[1em] ml-0.5 align-middle"
                  style={{ background: "hsl(var(--primary))", animation: "agentCaret 1s steps(2) infinite" }}
                />
              )}
            </div>
            {topics.length > 0 && topics[topics.length - 1].verses.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border/40">
                <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground/70 mb-2 flex items-center gap-1">
                  <BookOpen size={10} /> Detectado neste tópico
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {topics[topics.length - 1].verses.map((v) => (
                    <span key={v} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-mono">
                      📖 {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`@keyframes agentCaret { 0%,100% { opacity: 1 } 50% { opacity: 0 } }`}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 rounded-lg bg-card/30 border border-border/30">
      <p className="text-base font-display text-primary">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
