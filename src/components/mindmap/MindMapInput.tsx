import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Upload, FileText, Sparkles, Loader2, Square, Pause, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { transcribeAudioBlob, uploadAudio } from "@/lib/audioStudio";
import type { SourceAudio } from "./types";

interface Props {
  onGenerate: (text: string, audios?: SourceAudio[]) => void;
  loading: boolean;
  userCodeId: string;
}

type Mode = "idle" | "text" | "recording" | "processing" | "ready";

interface Segment {
  id: string;
  label: string;
  blob: Blob;
  durationSeconds: number;
  publicUrl?: string;
  transcript?: string;
  status: "uploading" | "transcribing" | "done" | "error";
  error?: string;
}

const SEGMENT_LIMIT_SECONDS = 600; // 10 minutes per chunk; recording auto-rolls over

export default function MindMapInput({ onGenerate, loading, userCodeId }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  const [paused, setPaused] = useState(false);
  const [segmentDuration, setSegmentDuration] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [waveData, setWaveData] = useState<number[]>(new Array(30).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>();
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const segmentIndexRef = useRef(0);
  const recorderMimeRef = useRef<string>("audio/webm");
  const stoppingForRolloverRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const segmentStartDurationRef = useRef(0);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const pickMime = () => {
    const candidates = [
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
    }
    return "audio/webm";
  };

  const processSegment = useCallback(
    async (blob: Blob, durationSeconds: number) => {
      const idx = segmentIndexRef.current;
      const id = `seg-${Date.now()}-${idx}`;
      const label = `Parte ${idx + 1}`;
      const seg: Segment = { id, label, blob, durationSeconds, status: "uploading" };
      setSegments((prev) => [...prev, seg]);

      // Upload + transcribe in parallel-friendly order: upload first so the URL is available fast
      try {
        const url = await uploadAudio(userCodeId, blob, `${label.toLowerCase().replace(/\s/g, "-")}.mp3`);
        setSegments((prev) =>
          prev.map((s) => (s.id === id ? { ...s, publicUrl: url, status: "transcribing" } : s)),
        );
        const transcript = await transcribeAudioBlob(blob, "pt");
        setSegments((prev) =>
          prev.map((s) => (s.id === id ? { ...s, transcript, status: "done" } : s)),
        );
      } catch (err: any) {
        console.error("[segment]", err);
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: "error", error: err?.message || "Falha" } : s,
          ),
        );
      }
    },
    [userCodeId],
  );

  // Start a new MediaRecorder using the existing stream — used both initially and on auto-rollover
  const startRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mime = pickMime();
    recorderMimeRef.current = mime;
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      const segDuration = Math.max(1, totalDurationSnapshotRef.current - segmentStartDurationRef.current);
      // Process the just-finished segment
      processSegment(blob, segDuration);
      segmentIndexRef.current += 1;

      if (stoppingForRolloverRef.current && !stopRequestedRef.current) {
        // Restart immediately for the next 10-min chunk
        stoppingForRolloverRef.current = false;
        segmentStartDurationRef.current = totalDurationSnapshotRef.current;
        setSegmentDuration(0);
        startRecorder();
      }
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
  }, [processSegment]);

  // Keep a ref-mirror of total duration so the onstop closure reads fresh values
  const totalDurationSnapshotRef = useRef(0);
  useEffect(() => {
    totalDurationSnapshotRef.current = totalDuration;
  }, [totalDuration]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateWave = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const bars = Array.from(data.slice(0, 30)).map((v) => Math.max(4, (v / 255) * 40));
        setWaveData(bars);
        animFrameRef.current = requestAnimationFrame(updateWave);
      };
      updateWave();

      segmentIndexRef.current = 0;
      segmentStartDurationRef.current = 0;
      stoppingForRolloverRef.current = false;
      stopRequestedRef.current = false;
      setSegments([]);
      setSegmentDuration(0);
      setTotalDuration(0);
      setPaused(false);
      setMode("recording");

      startRecorder();

      timerRef.current = setInterval(() => {
        setTotalDuration((d) => d + 1);
        setSegmentDuration((d) => {
          const next = d + 1;
          if (next >= SEGMENT_LIMIT_SECONDS) {
            // Auto-rollover: stop the current recorder; onstop will start a fresh one
            stoppingForRolloverRef.current = true;
            try {
              mediaRecorderRef.current?.stop();
            } catch {
              /* ignore */
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Não foi possível acessar o microfone.");
    }
  }, [startRecorder]);

  const stopRecording = useCallback(() => {
    stopRequestedRef.current = true;
    stoppingForRolloverRef.current = false;
    try {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setPaused(false);
    setMode("processing");
  }, []);

  const togglePause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (paused) {
      try {
        recorder.resume();
      } catch {
        /* ignore */
      }
      timerRef.current = setInterval(() => {
        setTotalDuration((d) => d + 1);
        setSegmentDuration((d) => d + 1);
      }, 1000);
      setPaused(false);
    } else {
      try {
        recorder.pause();
      } catch {
        /* ignore */
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setPaused(true);
    }
  }, [paused]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        alert("Arquivo muito grande. Máximo 25MB.");
        return;
      }
      setMode("processing");
      segmentIndexRef.current = 0;
      setSegments([]);
      await processSegment(file, 0);
    },
    [processSegment],
  );

  // When all segments finish, move to "ready" so user can review + generate
  useEffect(() => {
    if (mode !== "processing" || segments.length === 0) return;
    const allFinal = segments.every((s) => s.status === "done" || s.status === "error");
    if (allFinal) {
      const merged = segments
        .filter((s) => s.transcript)
        .map((s) => `[${s.label}]\n${s.transcript}`)
        .join("\n\n");
      setText(merged.trim());
      setMode("ready");
    }
  }, [segments, mode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const buildAudios = (): SourceAudio[] =>
    segments
      .filter((s) => s.publicUrl)
      .map((s) => ({
        url: s.publicUrl!,
        label: s.label,
        duration_seconds: s.durationSeconds,
        mime_type: "audio/mpeg",
      }));

  const canGenerate = text.trim().length >= 10;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 animate-fade-in">
      <p className="text-[9px] tracking-[3px] uppercase text-primary/60 font-ui mb-2">
        Fascinação · 2026A
      </p>
      <h2 className="text-2xl font-bold text-foreground font-display tracking-wide mb-2">
        Estudo Guiado
      </h2>
      <p className="text-sm text-muted-foreground font-body mb-8 text-center max-w-md">
        Grave, envie um MP3 ou cole um texto — a IA monta um estudo guiado com versículos, pontos e aplicação.
      </p>

      {/* Recording */}
      {mode === "recording" && (
        <div className="w-full max-w-sm space-y-6 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-muted-foreground font-ui">
              {paused ? "Pausado" : "Gravando..."}
            </span>
            <span className="text-xl font-display text-foreground">{formatTime(totalDuration)}</span>
          </div>

          <div className="flex items-center justify-center gap-[2px] h-12">
            {waveData.map((h, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full transition-all duration-75"
                style={{
                  height: `${paused ? 4 : h}px`,
                  background: "hsl(var(--primary))",
                  opacity: paused ? 0.3 : 0.6 + (h / 40) * 0.4,
                }}
              />
            ))}
          </div>

          <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui">
            Parte {segmentIndexRef.current + 1} · {formatTime(segmentDuration)} / 10:00
          </p>

          {segments.length > 0 && (
            <p className="text-[11px] text-muted-foreground/80 font-ui">
              {segments.length} parte{segments.length > 1 ? "s" : ""} já capturada{segments.length > 1 ? "s" : ""}
            </p>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={togglePause}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              {paused ? <Play size={18} className="text-foreground ml-0.5" /> : <Pause size={18} className="text-foreground" />}
            </button>
            <button
              onClick={stopRecording}
              className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center text-white transition-all active:scale-95"
            >
              <Square size={16} />
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground/50 font-ui">
            A cada 10 min, uma nova parte é iniciada automaticamente. Pare quando quiser.
          </p>
        </div>
      )}

      {/* Processing segments */}
      {mode === "processing" && (
        <div className="w-full max-w-md space-y-3 animate-fade-in">
          <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui text-center">
            Processando áudio
          </p>
          <p className="text-sm text-foreground/80 font-body text-center mb-4">
            Salvando MP3 e transcrevendo com IA…
          </p>
          {segments.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--primary) / 0.1)" }}>
                {s.status === "done" ? (
                  <CheckCircle2 size={16} className="text-primary" />
                ) : s.status === "error" ? (
                  <AlertCircle size={16} className="text-destructive" />
                ) : (
                  <Loader2 size={14} className="animate-spin text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display text-foreground">{s.label}</p>
                <p className="text-[11px] text-muted-foreground font-ui truncate">
                  {s.status === "uploading" && "Salvando MP3…"}
                  {s.status === "transcribing" && "Transcrevendo com Whisper…"}
                  {s.status === "done" && (s.transcript ? `${s.transcript.slice(0, 60)}…` : "Pronto")}
                  {s.status === "error" && (s.error || "Erro ao processar")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ready — review transcript & audios, then generate */}
      {mode === "ready" && (
        <div className="w-full max-w-lg space-y-4 animate-fade-in">
          {segments.some((s) => s.publicUrl) && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui">
                Áudios salvos
              </p>
              {segments
                .filter((s) => s.publicUrl)
                .map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl p-3"
                    style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  >
                    <p className="text-[11px] font-ui text-muted-foreground mb-2">{s.label}</p>
                    <audio controls src={s.publicUrl} className="w-full" />
                  </div>
                ))}
            </div>
          )}

          <div className="rounded-xl p-4 max-h-72 overflow-auto"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui mb-2">
              Transcrição
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[140px] bg-transparent text-sm text-foreground/90 font-body leading-relaxed resize-none focus:outline-none"
            />
          </div>

          <button
            onClick={() => onGenerate(text, buildAudios())}
            disabled={!canGenerate || loading}
            className="w-full py-3.5 rounded-xl text-sm font-ui font-medium flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: canGenerate ? "hsl(var(--primary))" : "hsl(var(--muted))",
              color: canGenerate ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Gerando..." : "Gerar Estudo Guiado"}
          </button>
          <button
            onClick={() => {
              setMode("idle");
              setSegments([]);
              setText("");
              setTotalDuration(0);
            }}
            className="w-full text-xs text-muted-foreground font-ui hover:text-foreground transition-colors"
          >
            ← Voltar
          </button>
        </div>
      )}

      {/* Idle: choose input */}
      {mode === "idle" && (
        <>
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
            {[
              { icon: Mic, label: "Gravar\nÁudio", action: () => startRecording() },
              { icon: Upload, label: "Upload\nMP3", action: () => document.getElementById("audio-upload")?.click() },
              { icon: FileText, label: "Escrever\nTexto", action: () => setMode("text") },
            ].map((opt, i) => (
              <button
                key={i}
                onClick={opt.action}
                className="flex flex-col items-center gap-2 p-5 rounded-2xl transition-all active:scale-95 hover:scale-[1.02]"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <opt.icon size={24} className="text-primary" />
                <span className="text-[11px] font-ui text-muted-foreground text-center whitespace-pre-line leading-tight">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          <input
            id="audio-upload"
            type="file"
            accept=".mp3,.wav,.webm,.m4a,.ogg,audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="w-full max-w-sm">
            <p className="text-[10px] text-center text-muted-foreground/50 font-ui mb-3">
              ── ou cole texto diretamente abaixo ──
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui sua anotação, pregação, reflexão..."
              className="w-full min-h-[160px] rounded-xl p-4 text-sm font-body leading-relaxed resize-none transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{
                background: "hsl(var(--input))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
            />
            {text.length > 10000 && (
              <p className="text-[10px] text-fire font-ui mt-1">
                Texto longo — processamento pode demorar mais.
              </p>
            )}
            <button
              onClick={() => onGenerate(text)}
              disabled={!canGenerate || loading}
              className="w-full mt-3 py-3.5 rounded-xl text-sm font-ui font-medium flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: canGenerate ? "hsl(var(--primary))" : "hsl(var(--muted))",
                color: canGenerate ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Gerando..." : "Gerar Estudo Guiado"}
            </button>
          </div>
        </>
      )}

      {/* Text-only mode */}
      {mode === "text" && (
        <div className="w-full max-w-lg animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setMode("idle")} className="text-xs text-muted-foreground font-ui hover:text-foreground transition-colors">
              ← Voltar
            </button>
            <span className="text-[10px] text-muted-foreground font-ui">{text.length} caracteres</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui sua anotação, pregação, reflexão..."
            autoFocus
            className="w-full min-h-[240px] rounded-xl p-4 text-sm font-body leading-relaxed resize-y transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{
              background: "hsl(var(--input))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
            }}
          />
          <button
            onClick={() => onGenerate(text)}
            disabled={!canGenerate || loading}
            className="w-full mt-3 py-3.5 rounded-xl text-sm font-ui font-medium flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: canGenerate ? "hsl(var(--primary))" : "hsl(var(--muted))",
              color: canGenerate ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Gerando..." : "Gerar Estudo Guiado"}
          </button>
        </div>
      )}

      {loading && mode !== "text" && mode !== "ready" && (
        <div className="mt-8 text-center animate-fade-in">
          <div className="space-y-3">
            <LoadingStep text="Analisando conteúdo..." active />
            <LoadingStep text="Identificando conceitos..." active={false} />
            <LoadingStep text="Organizando estudo..." active={false} />
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingStep({ text, active }: { text: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-ui transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
      {active ? (
        <Loader2 size={14} className="animate-spin text-primary" />
      ) : (
        <span className="w-3.5" />
      )}
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{text}</span>
    </div>
  );
}
