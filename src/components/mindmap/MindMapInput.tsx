import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Upload, FileText, Sparkles, Loader2, Square, Pause, Play, X } from "lucide-react";

interface Props {
  onGenerate: (text: string) => void;
  loading: boolean;
}

export default function MindMapInput({ onGenerate, loading }: Props) {
  const [mode, setMode] = useState<"idle" | "text" | "recording" | "recorded" | "transcribing">("idle");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [waveData, setWaveData] = useState<number[]>(new Array(30).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

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
        const bars = Array.from(data.slice(0, 30)).map(v => Math.max(4, (v / 255) * 40));
        setWaveData(bars);
        animFrameRef.current = requestAnimationFrame(updateWave);
      };
      updateWave();

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;

      // Web Speech API for real-time transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "pt-BR";
        recognition.continuous = true;
        recognition.interimResults = true;
        let finalTranscript = "";
        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setTranscript(finalTranscript + interim);
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      setRecording(true);
      setPaused(false);
      setMode("recording");
      setDuration(0);
      setTranscript("");

      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= 600) { stopRecording(); return d; }
          return d + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    recognitionRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setRecording(false);
    setPaused(false);
    setMode("recorded");
  }, []);

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (paused) {
      mediaRecorderRef.current.resume();
      recognitionRef.current?.start();
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      setPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setPaused(true);
    }
  }, [paused]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { alert("Arquivo muito grande. Máximo 25MB."); return; }
    setAudioUrl(URL.createObjectURL(file));
    setMode("recorded");
  }, []);

  const handleUseTranscript = useCallback(() => {
    if (transcript.trim()) {
      setText(transcript.trim());
      setMode("text");
    }
  }, [transcript]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      recognitionRef.current?.stop();
    };
  }, []);

  const canGenerate = text.trim().length >= 10;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 animate-fade-in">
      <p className="text-[9px] tracking-[3px] uppercase text-primary/60 font-ui mb-2">
        Fascinação · 2026A
      </p>
      <h2 className="text-2xl font-bold text-foreground font-display tracking-wide mb-2">
        Mapa Mental
      </h2>
      <p className="text-sm text-muted-foreground font-body mb-8 text-center max-w-md">
        Transforme ideias em estudo visual
      </p>

      {/* Recording UI */}
      {mode === "recording" && (
        <div className="w-full max-w-sm space-y-6 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-muted-foreground font-ui">
              {paused ? "Pausado" : "Gravando..."}
            </span>
            <span className="text-xl font-display text-foreground">{formatTime(duration)}</span>
          </div>

          {/* Waveform */}
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

          {/* Live transcript preview */}
          {transcript && (
            <p className="text-xs text-muted-foreground font-body italic line-clamp-3 px-4">
              "{transcript.slice(-200)}"
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

          <p className="text-[10px] text-muted-foreground/50 font-ui">Máximo: 10 minutos</p>
        </div>
      )}

      {/* Recorded — use transcript or type */}
      {mode === "recorded" && (
        <div className="w-full max-w-sm space-y-4 animate-fade-in">
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full rounded-xl" />
          )}
          {transcript.trim() ? (
            <>
              <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui mb-2">Transcrição</p>
                <p className="text-sm text-foreground/80 font-body leading-relaxed line-clamp-6">{transcript}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUseTranscript}
                  className="flex-1 py-3 rounded-xl text-sm font-ui font-medium transition-all active:scale-95"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  Usar transcrição
                </button>
                <button
                  onClick={() => { setMode("text"); setText(transcript); }}
                  className="px-4 py-3 rounded-xl text-sm font-ui text-muted-foreground transition-all active:scale-95"
                  style={{ border: "1px solid hsl(var(--border))" }}
                >
                  Editar
                </button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground font-ui">
                Transcrição automática não disponível neste navegador.
              </p>
              <button
                onClick={() => setMode("text")}
                className="px-6 py-3 rounded-xl text-sm font-ui font-medium transition-all active:scale-95"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                Digitar texto manualmente
              </button>
            </div>
          )}
          <button onClick={() => { setMode("idle"); setTranscript(""); setAudioUrl(null); }}
            className="w-full text-xs text-muted-foreground font-ui hover:text-foreground transition-colors">
            ← Voltar
          </button>
        </div>
      )}

      {/* Input mode selector */}
      {mode === "idle" && (
        <>
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
            {[
              { icon: Mic, label: "Gravar\nÁudio", action: () => startRecording() },
              { icon: Upload, label: "Upload\nÁudio", action: () => document.getElementById("audio-upload")?.click() },
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
            accept=".mp3,.wav,.webm,.m4a,.ogg"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="w-full max-w-sm">
            <p className="text-[10px] text-center text-muted-foreground/50 font-ui mb-3">
              ── ou cole texto diretamente abaixo ──
            </p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
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
              {loading ? "Gerando..." : "Gerar Mapa Mental"}
            </button>
          </div>
        </>
      )}

      {/* Text editing mode */}
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
            onChange={e => setText(e.target.value)}
            placeholder="Cole aqui sua anotação, pregação, reflexão..."
            autoFocus
            className="w-full min-h-[240px] rounded-xl p-4 text-sm font-body leading-relaxed resize-y transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            {loading ? "Gerando..." : "Gerar Mapa Mental"}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-8 text-center animate-fade-in">
          <div className="space-y-3">
            <LoadingStep text="Analisando conteúdo..." done={false} active />
            <LoadingStep text="Identificando conceitos..." done={false} active={false} />
            <LoadingStep text="Organizando hierarquia..." done={false} active={false} />
            <LoadingStep text="Gerando visualização..." done={false} active={false} />
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingStep({ text, done, active }: { text: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-ui transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
      {done ? (
        <span className="text-primary">✓</span>
      ) : active ? (
        <Loader2 size={14} className="animate-spin text-primary" />
      ) : (
        <span className="w-3.5" />
      )}
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{text}</span>
    </div>
  );
}
