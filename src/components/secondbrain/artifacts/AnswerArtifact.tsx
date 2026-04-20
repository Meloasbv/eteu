import { useEffect, useState, useId } from "react";
import { MessageCircle, BookOpen } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import ListenButton from "./ListenButton";

interface Data {
  question: string;
  answer?: string;
  loading?: boolean;
  error?: string;
}

interface Props {
  data: Data;
  sendAsUser: (text: string) => void;
}

const VERSE_RE_INLINE =
  /\b((?:gn|ex|lv|nm|dt|js|jz|rt|sm|rs|cr|sl|pv|ec|is|jr|lm|ez|dn|os|jl|am|ob|jn|mq|na|hc|sf|ag|zc|ml|mt|mc|lc|jo|at|rm|co|gl|ef|fp|cl|ts|tm|tt|fm|hb|tg|pe|jd|ap)\.?\s*\d+(?:\s*[:,.]\s*\d+(?:\s*-\s*\d+)?)?)/gi;

export default function AnswerArtifact({ data, sendAsUser }: Props) {
  const reactId = useId();
  const [answer, setAnswer] = useState<string>(data.answer ?? "");
  const [loading, setLoading] = useState<boolean>(!data.answer);
  const [error, setError] = useState<string | undefined>(data.error);

  useEffect(() => {
    if (answer) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-chat`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: data.question }],
          }),
        });
        if (!resp.ok || !resp.body) throw new Error("Falha ao consultar IA");

        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const j = line.slice(6).trim();
            if (j === "[DONE]") break;
            try {
              const p = JSON.parse(j);
              const c = p.choices?.[0]?.delta?.content;
              if (c) {
                acc += c;
                if (!cancelled) setAnswer(acc);
              }
            } catch {
              buf = line + "\n" + buf;
              break;
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erro");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extract verse refs from the answer
  const verses = Array.from(answer.matchAll(VERSE_RE_INLINE)).map((m) => m[1]);
  const uniqueVerses = Array.from(new Set(verses)).slice(0, 6);

  return (
    <ArtifactShell
      icon={<MessageCircle size={12} strokeWidth={2.4} />}
      label="Resposta"
    >
      {loading && !answer && (
        <div className="space-y-2">
          <div className="h-3 rounded animate-pulse" style={{ background: `${P.primary}11`, width: "85%" }} />
          <div className="h-3 rounded animate-pulse" style={{ background: `${P.primary}11`, width: "70%" }} />
          <div className="h-3 rounded animate-pulse" style={{ background: `${P.primary}11`, width: "60%" }} />
        </div>
      )}

      {error && (
        <p className="text-[12.5px]" style={{ color: "#ff7a7a" }}>
          {error}
        </p>
      )}

      {answer && (
        <div
          className="text-[14px] leading-[1.8] whitespace-pre-wrap"
          style={{ color: P.text, fontFamily: "'Crimson Text', Georgia, serif" }}
        >
          {answer}
          {loading && <span className="inline-block w-1.5 h-4 ml-1 animate-pulse" style={{ background: P.primary }} />}
        </div>
      )}

      {!loading && uniqueVerses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t" style={{ borderColor: `${P.primary}11` }}>
          {uniqueVerses.map((v, i) => (
            <button
              key={i}
              onClick={() => sendAsUser(`exegese de ${v}`)}
              className="text-[11px] px-2 py-1 rounded-md font-semibold transition-all hover:scale-105"
              style={{
                background: `${P.primary}10`,
                color: P.primary,
                border: `1px solid ${P.primary}33`,
              }}
            >
              📖 {v}
            </button>
          ))}
        </div>
      )}

      {!loading && answer && (
        <div className="flex flex-wrap gap-2 mt-4">
          <ListenButton id={`answer-${reactId}`} text={answer} label="Resposta" />
          <ArtifactAction onClick={() => sendAsUser(`anotar: ${data.question} — ${answer.slice(0, 150)}…`)}>
            📝 Salvar
          </ArtifactAction>
          <ArtifactAction onClick={() => sendAsUser(`aprofundar: ${data.question}`)}>
            <BookOpen size={11} /> Aprofundar
          </ArtifactAction>
        </div>
      )}
    </ArtifactShell>
  );
}
