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

const PAUSE_MS = 2500;
const MIN_BLOCK_CHARS = 60;

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
  // Buffer de segmentos finais ainda não consolidados em bloco (entre pausas).
  const pendingSegsRef = useRef<TranscriptSegment[]>([]);
  const processingRef = useRef(false);
  const topicsRef = useRef<DetectedTopic[]>([]);
  topicsRef.current = topics;

  const recorder = useMediaRecorderAudio();

  /**
   * Processa um bloco de fala (entre pausas):
   * - Manda à IA para revisar/resumir SEM adicionar conteúdo.
   * - Cria um novo tópico no canvas com o resumo.
   * - Auto-conecta ao bloco anterior mais relacionado (overlap de keywords).
   */
  const processBlock = useCallback(async () => {
    if (processingRef.current) return;
    const segs = pendingSegsRef.current;
    if (!segs.length) return;
    const rawText = segs.map((s) => s.text).join(" ").trim();
    if (rawText.length < MIN_BLOCK_CHARS) return;
    pendingSegsRef.current = [];
    processingRef.current = true;
    setClassifying(true);

    const startTs = segs[0]?.timestamp || 0;
    const segIds = segs.map((s) => s.id);

    try {
      const { data, error } = await supabase.functions.invoke("agent-summarize-block", {
        body: {
          text: rawText,
          previous_titles: topicsRef.current.map((t) => t.title),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const title: string = data.title || `Bloco ${topicsRef.current.length + 1}`;
      const summary: string = data.summary || "";
      const keywords: string[] = (data.keywords || []).map((k: string) => String(k).toLowerCase());
      const verses: string[] = data.verses || [];

      const newTopic: DetectedTopic = {
        id: `topic-${Date.now()}`,
        title,
        startTimestamp: startTs,
        segmentIds: segIds,
        verses,
        impactPhrases: [],
        keyPoints: summary ? [summary] : [],
        summary,
        keywords,
        rawText,
      };

      // Auto-conexão: encontra tópico anterior com mais overlap de keywords.
      const prev = topicsRef.current;
      let bestId: string | null = null;
      let bestScore = 0;
      for (const t of prev) {
        const tk = (t.keywords || []).map((k) => k.toLowerCase());
        if (!tk.length) continue;
        const overlap = keywords.filter((k) => tk.includes(k)).length;
        if (overlap > bestScore) {
          bestScore = overlap;
          bestId = t.id;
        }
      }
      // Sem overlap mas existe anterior → conecta sequencialmente ao último.
      if (!bestId && prev.length) bestId = prev[prev.length - 1].id;

      setTopics((cur) => {
        const updated = cur.map((t, i) =>
          i === cur.length - 1 && !t.endTimestamp ? { ...t, endTimestamp: startTs } : t,
        );
        return [...updated, newTopic];
      });

      if (bestId) {
        const edgeId = `e-${bestId}-${newTopic.id}`;
        setCanvasEdges((cur) => [
          ...cur,
          {
            id: edgeId,
            source: bestId!,
            target: newTopic.id,
            type: "smoothstep",
            animated: bestScore > 0,
          } as Edge,
        ]);
      }

      setPendingTopicHighlight(newTopic.id);
      haptic("light");
      setTimeout(() => setPendingTopicHighlight(null), 2500);
    } catch (e: any) {
      console.warn("[summarize-block]", e);
      // Re-empilha para tentar de novo no próximo bloco.
      pendingSegsRef.current = [...segs, ...pendingSegsRef.current];
    } finally {
      processingRef.current = false;
      setClassifying(false);
    }
  }, []);

  const transcription = useRealtimeTranscription({
    pauseMs: PAUSE_MS,
    onFinalSegment: (s) => {
      pendingSegsRef.current.push(s);
    },
    onPause: () => {
      processBlock();
    },
  });
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

  const togglePause = useCallback(() => {
    if (transcription.listening) {
      transcription.pause();
    } else {
      transcription.resume();
    }
  }, [transcription]);

  const stopAll = useCallback(async () => {
    transcription.stop();
    // Garante que o último bloco pendente seja resumido antes de fechar.
    if (pendingSegsRef.current.length) {
      await processBlock();
    }
    const blob = await recorder.stop();
    const transcript = transcription.segments.map((s) => s.text).join(" ").trim();
    const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
    await onFinish({
      title: "",
      duration,
      transcript,
      topics: topicsRef.current,
      personalNotes: notes,
      audioBlob: blob,
      sourceType: "live",
      layout: { positions, edges: canvasEdges },
    });
  }, [recorder, transcription, notes, onFinish, positions, canvasEdges, processBlock]);

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

  // ─── Edição inline ─────────────────────────────────────────────
  const updateTopic = useCallback((id: string, patch: Partial<DetectedTopic>) => {
    setTopics((cur) => cur.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const [editingSegId, setEditingSegId] = useState<string | null>(null);
  const [editingSegDraft, setEditingSegDraft] = useState("");

  const startEditSegment = useCallback((id: string, currentText: string) => {
    setEditingSegId(id);
    setEditingSegDraft(currentText);
  }, []);
  const commitEditSegment = useCallback(() => {
    if (editingSegId && editingSegDraft.trim()) {
      transcription.updateSegment(editingSegId, editingSegDraft.trim());
    }
    setEditingSegId(null);
    setEditingSegDraft("");
  }, [editingSegId, editingSegDraft, transcription]);


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
      <div className="flex-1 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[360px_1fr]">
        {/* Topics column */}
        <aside className="lg:border-r border-border/40 lg:overflow-hidden flex flex-col order-2 lg:order-1">
          {/* Sub-tabs Lista / Mapa */}
          <div className="px-4 pt-3 flex items-center gap-1 border-b border-border/30">
            <button
              onClick={() => setSideTab("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-ui transition-all ${
                sideTab === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List size={11} /> Lista
            </button>
            <button
              onClick={() => setSideTab("map")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-ui transition-all ${
                sideTab === "map" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network size={11} /> Mapa ao vivo
            </button>
            <span className="ml-auto text-[10px] text-muted-foreground/60">{topics.length} tópicos</span>
          </div>

          {sideTab === "map" ? (
            <div className="flex-1 min-h-[360px] lg:min-h-0">
              {topics.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs italic text-muted-foreground/70 px-6 text-center">
                  Os tópicos aparecerão aqui como nós arrastáveis.<br />
                  Conecte-os arrastando de uma borda à outra.
                </div>
              ) : (
                <LiveTopicCanvas
                  topics={topics}
                  liveTopicId={transcription.listening && topics.length ? topics[topics.length - 1].id : null}
                  positions={positions}
                  edges={canvasEdges}
                  onPositionsChange={setPositions}
                  onEdgesChange={setCanvasEdges}
                  onTopicEdit={updateTopic}
                />
              )}
            </div>
          ) : (
            <div className="lg:overflow-y-auto px-4 py-4 flex-1">
              <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground/70 font-ui mb-3">
                Tópicos detectados
              </p>
              {topics.length === 0 && !classifying && (
                <p className="text-xs italic text-muted-foreground/70">
                  A cada pausa na fala, a IA cria um bloco resumido e conecta ao tópico relacionado.
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
                      <InlineEditableText
                        value={t.title}
                        onCommit={(v) => updateTopic(t.id, { title: v })}
                        className="text-sm font-ui text-foreground leading-snug"
                      />
                      {t.summary !== undefined && (
                        <InlineEditableText
                          value={t.summary || ""}
                          onCommit={(v) => updateTopic(t.id, { summary: v, keyPoints: v ? [v] : [] })}
                          placeholder="+ resumo"
                          multiline
                          className="text-[12px] text-muted-foreground italic leading-snug mt-1 block"
                          style={{ fontFamily: "'Crimson Text', Georgia, serif" }}
                        />
                      )}
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
            </div>
          )}
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
              {/* Mostra só os últimos 6 segmentos pra performance/visual — clicáveis para correção. */}
              {lastSegments.map((s) => (
                editingSegId === s.id ? (
                  <input
                    key={s.id}
                    autoFocus
                    value={editingSegDraft}
                    onChange={(e) => setEditingSegDraft(e.target.value)}
                    onBlur={commitEditSegment}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEditSegment();
                      if (e.key === "Escape") { setEditingSegId(null); setEditingSegDraft(""); }
                    }}
                    className="inline-block bg-primary/10 border-b border-primary outline-none px-1 mx-0.5 rounded-sm"
                    style={{ font: "inherit", color: "inherit", minWidth: Math.max(60, editingSegDraft.length * 9) }}
                  />
                ) : (
                  <span
                    key={s.id}
                    onClick={() => startEditSegment(s.id, s.text)}
                    className="cursor-text hover:bg-primary/10 hover:text-foreground rounded-sm transition-colors"
                    title="Clique para corrigir"
                  > {s.text}</span>
                )
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

/** Texto que vira input/textarea no duplo clique. Commit no blur/Enter. */
function InlineEditableText({
  value, onCommit, placeholder, multiline, className, style,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onCommit(draft.trim());
  };
  if (editing) {
    const Tag: any = multiline ? "textarea" : "input";
    return (
      <Tag
        autoFocus
        value={draft}
        onChange={(e: any) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e: any) => {
          if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={`${className || ""} bg-card/60 border border-primary/40 rounded px-1 py-0.5 outline-none w-full resize-none`}
        style={style}
        rows={multiline ? 2 : undefined}
      />
    );
  }
  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className={`${className || ""} cursor-text hover:bg-primary/5 rounded`}
      style={style}
      title="Duplo clique para editar"
    >
      {value || <span className="opacity-50">{placeholder}</span>}
    </span>
  );
}
