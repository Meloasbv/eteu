import { useEffect, useState, useCallback } from "react";
import { X, Pause, Play, Square, Plus, Mic, Wifi, BookOpen } from "lucide-react";
import {
  fetchLiveSession,
  subscribeLiveSession,
  sendLiveCommand,
  type LiveSessionRow,
} from "@/lib/liveSync";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";

interface Props {
  userCodeId: string;
  onClose: () => void;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Espelho da sessão ao vivo de outro dispositivo (ex.: PC vendo o celular).
 * Mostra transcript/tópicos/notas em tempo real e permite enviar comandos
 * (pausar, continuar, parar, anotar) ao gravador remoto.
 */
export default function LiveMirrorView({ userCodeId, onClose }: Props) {
  const [row, setRow] = useState<LiveSessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    fetchLiveSession(userCodeId).then((r) => {
      setRow(r);
      setLoading(false);
    });
    const unsub = subscribeLiveSession(userCodeId, (r) => setRow(r));
    return unsub;
  }, [userCodeId]);

  const sendCmd = useCallback(
    async (type: "pause" | "resume" | "stop" | "add_note", payload?: any) => {
      haptic("light");
      await sendLiveCommand(userCodeId, { type, payload });
    },
    [userCodeId],
  );

  const addRemoteNote = useCallback(async () => {
    if (!noteDraft.trim()) return;
    await sendCmd("add_note", { text: noteDraft.trim() });
    setNoteDraft("");
    toast({ title: "Nota enviada ao dispositivo" });
  }, [noteDraft, sendCmd]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
        Conectando à sessão ao vivo…
      </div>
    );
  }

  if (!row) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Wifi className="text-muted-foreground" size={32} />
        <p className="text-sm text-muted-foreground">Nenhuma sessão ao vivo no momento.</p>
        <button onClick={onClose} className="px-4 py-2 rounded-full text-xs border border-border/50">
          Voltar
        </button>
      </div>
    );
  }

  const isLive = row.status === "recording";
  const transcriptText = row.transcript || "";

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-background">
      {/* Header */}
      <header className="px-4 lg:px-6 py-3 border-b border-border/40 flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
          <X size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isLive ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`}
          />
          <span className="font-mono text-sm text-foreground">{fmtTime(row.elapsed_seconds)}</span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-emerald-500">
          <Wifi size={10} /> espelhando outro dispositivo
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => sendCmd(isLive ? "pause" : "resume")}
            className="px-3 py-1.5 rounded-full text-xs font-ui flex items-center gap-1.5 border border-border/50 hover:border-primary/40"
          >
            {isLive ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Continuar</>}
          </button>
          <button
            onClick={() => sendCmd("stop")}
            className="px-3 py-1.5 rounded-full text-xs font-ui font-bold flex items-center gap-1.5"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            <Square size={12} /> Parar
          </button>
        </div>
      </header>

      <div className="flex-1 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[360px_1fr]">
        {/* Topics + notes */}
        <aside className="lg:border-r border-border/40 lg:overflow-y-auto px-4 py-4 order-2 lg:order-1">
          <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground/70 font-ui mb-3">
            Tópicos detectados
          </p>
          {(!row.topics || row.topics.length === 0) && (
            <p className="text-xs italic text-muted-foreground/70">
              Aguardando o gravador detectar o primeiro bloco…
            </p>
          )}
          <ul className="space-y-2">
            {row.topics?.map((t, i) => (
              <li
                key={t.id}
                className="p-3 rounded-lg border border-border/40 bg-card/30"
              >
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
                  <span>#{i + 1}</span>
                  <span>·</span>
                  <span>{fmtTime(Math.floor((t.startTimestamp || 0) / 1000))}</span>
                </div>
                <p className="text-sm font-ui text-foreground leading-snug">{t.title}</p>
                {t.summary && (
                  <p
                    className="text-[12px] text-muted-foreground italic leading-snug mt-1"
                    style={{ fontFamily: "'Crimson Text', Georgia, serif" }}
                  >
                    {t.summary}
                  </p>
                )}
                {t.verses?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.verses.slice(0, 4).map((v) => (
                      <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                        📖 {v}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Notas pessoais */}
          <div className="mt-6">
            <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground/70 font-ui mb-2">
              Notas
            </p>
            <div className="flex gap-1 mb-2">
              <input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRemoteNote()}
                placeholder="Adicionar nota daqui…"
                className="flex-1 bg-card border border-border/50 rounded-lg px-2.5 py-1.5 text-xs"
              />
              <button
                onClick={addRemoteNote}
                className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40"
              >
                <Plus size={14} />
              </button>
            </div>
            <ul className="space-y-1.5">
              {row.personal_notes?.slice().reverse().map((n) => (
                <li
                  key={n.id}
                  className="text-[11px] p-2 rounded-md italic"
                  style={{
                    background: "hsl(var(--primary) / 0.06)",
                    borderLeft: "2px solid hsl(var(--primary) / 0.6)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  <span className="font-mono text-[9px] mr-1.5">
                    {fmtTime(Math.floor((n.timestamp || 0) / 1000))}
                  </span>
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
          <div
            className="flex-1 lg:overflow-y-auto rounded-xl border border-border/40 bg-card/30 p-4 lg:p-6 whitespace-pre-wrap"
            style={{
              fontFamily: "'Crimson Text', Georgia, serif",
              fontSize: 17,
              lineHeight: 1.7,
              color: "hsl(var(--foreground))",
            }}
          >
            {transcriptText.trim() ? (
              transcriptText
            ) : (
              <p className="italic text-muted-foreground/60 text-sm">
                Aguardando fala do dispositivo gravador…
              </p>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <BookOpen size={10} /> Atualiza em tempo real conforme o outro dispositivo grava.
          </p>
        </main>
      </div>
    </div>
  );
}
