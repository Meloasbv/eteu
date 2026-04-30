import { useState, useRef, useEffect } from "react";
import { BookOpen, Sparkles, Loader2, Send, X, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  transcript: string;
  topics: { title: string }[];
}

type Tab = "verse" | "chat";

interface VerseData {
  reference: string;
  text: string;
  verses?: { verse: number; text: string }[];
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export default function RecordingBottomTools({ transcript, topics }: Props) {
  const [tab, setTab] = useState<Tab | null>(null);

  // Verse search
  const [verseQuery, setVerseQuery] = useState("");
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loadingVerse, setLoadingVerse] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Chat
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMsgs, chatLoading]);

  const searchVerse = async () => {
    const q = verseQuery.trim();
    if (!q) return;
    setLoadingVerse(true);
    setVerse(null);
    try {
      const { data, error } = await supabase.functions.invoke("bible-verse", {
        body: { reference: q },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setVerse({
        reference: data.reference || q,
        text: data.text || "",
        verses: data.verses,
      });
    } catch (e: any) {
      toast({ title: "Versículo não encontrado", description: e?.message, variant: "destructive" });
    } finally {
      setLoadingVerse(false);
    }
  };

  const speakVerse = () => {
    if (!verse?.text) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(`${verse.reference}. ${verse.text}`);
    u.lang = "pt-BR";
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const next = [...chatMsgs, { role: "user" as const, content: msg }];
    setChatMsgs(next);
    setChatInput("");
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          message: msg,
          transcript,
          topics,
          history: chatMsgs.slice(-8),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setChatMsgs([...next, { role: "assistant", content: data.reply || data.message || "—" }]);
    } catch (e: any) {
      toast({ title: "Erro no chat", description: e?.message, variant: "destructive" });
      setChatMsgs(chatMsgs);
    } finally {
      setChatLoading(false);
    }
  };

  if (!tab) {
    return (
      <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-[2px] text-muted-foreground/60 font-ui mr-1">
          Ferramentas
        </span>
        <button
          onClick={() => setTab("verse")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui border border-border/50 hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
        >
          <BookOpen size={12} /> Pesquisar versículo
        </button>
        <button
          onClick={() => setTab("chat")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui border border-border/50 hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
        >
          <Sparkles size={12} /> Perguntar à IA
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setTab("verse")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-ui ${
            tab === "verse" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen size={11} /> Versículo
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-ui ${
            tab === "chat" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles size={11} /> IA
        </button>
        <button
          onClick={() => setTab(null)}
          className="ml-auto text-muted-foreground hover:text-foreground"
          aria-label="Fechar ferramentas"
        >
          <X size={14} />
        </button>
      </div>

      {tab === "verse" && (
        <div>
          <div className="flex gap-2 mb-3">
            <input
              value={verseQuery}
              onChange={(e) => setVerseQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchVerse()}
              placeholder="Ex: João 3:16, Salmos 23, Romanos 8:28"
              className="flex-1 bg-card border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
              autoFocus
            />
            <button
              onClick={searchVerse}
              disabled={loadingVerse || !verseQuery.trim()}
              className="px-3 py-2 rounded-lg text-xs font-ui font-bold disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {loadingVerse ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
              Buscar
            </button>
          </div>

          {verse && (
            <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-primary">{verse.reference}</span>
                <button
                  onClick={speakVerse}
                  className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-primary border border-border/40"
                >
                  {speaking ? <VolumeX size={10} /> : <Volume2 size={10} />}
                  {speaking ? "Parar" : "Ouvir"}
                </button>
              </div>
              {verse.verses && verse.verses.length > 0 ? (
                <div className="space-y-1" style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 16, lineHeight: 1.7, color: "hsl(var(--foreground))" }}>
                  {verse.verses.map((v) => (
                    <p key={v.verse}>
                      <sup className="text-primary mr-1 font-mono text-[10px]">{v.verse}</sup>
                      {v.text}
                    </p>
                  ))}
                </div>
              ) : (
                <p style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 16, lineHeight: 1.7, color: "hsl(var(--foreground))" }}>
                  {verse.text}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div>
          <div
            ref={chatScrollRef}
            className="max-h-[280px] overflow-y-auto rounded-lg border border-border/40 bg-card/30 p-3 mb-2 space-y-2"
          >
            {chatMsgs.length === 0 && !chatLoading && (
              <p className="text-xs italic text-muted-foreground/70">
                Pergunte qualquer coisa sobre a aula. A IA usa a transcrição como contexto.
              </p>
            )}
            {chatMsgs.map((m, i) => (
              <div
                key={i}
                className={`text-sm rounded-md px-3 py-2 ${
                  m.role === "user"
                    ? "bg-primary/10 text-foreground ml-6"
                    : "bg-card/60 border border-border/40 text-foreground/90 mr-6"
                }`}
                style={{ fontFamily: "'Crimson Text', Georgia, serif", lineHeight: 1.6 }}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && (
              <div className="text-xs text-primary flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" /> pensando…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendChat())}
              placeholder="Pergunte algo sobre o que está sendo dito…"
              disabled={chatLoading}
              className="flex-1 bg-card border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 disabled:opacity-50"
            />
            <button
              onClick={sendChat}
              disabled={chatLoading || !chatInput.trim()}
              className="px-3 py-2 rounded-lg text-xs font-ui font-bold disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
