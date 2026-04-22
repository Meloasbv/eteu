import { useEffect, useState } from "react";
import { BookOpen, Microscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeBibleRef } from "@/lib/bibleRefDetection";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import ListenButton from "./ListenButton";

interface Data {
  reference: string;
  verseText?: string;
  exegesis?: string;
  loading?: boolean;
  error?: string;
}

interface Props {
  data: Data;
  sendAsUser: (text: string) => void;
}

async function fetchVerseText(ref: string): Promise<string> {
  // Try bible-api.com (Portuguese ARA)
  try {
    const r = await fetch(`https://bible-api.com/${encodeURIComponent(sanitizeBibleRef(ref))}?translation=almeida`);
    if (r.ok) {
      const d = await r.json();
      if (d.text) return d.text.trim();
    }
  } catch {}
  return "";
}

export default function ExegeseArtifact({ data, sendAsUser }: Props) {
  const [verseText, setVerseText] = useState<string>(data.verseText ?? "");
  const [exegesis, setExegesis] = useState<string>(data.exegesis ?? "");
  const [loading, setLoading] = useState<boolean>(!data.exegesis);
  const [error, setError] = useState<string | undefined>(data.error);

  useEffect(() => {
    if (exegesis) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let txt = verseText;
        if (!txt) {
          txt = await fetchVerseText(data.reference);
          if (!cancelled) setVerseText(txt);
        }
        if (!txt) {
          // Last resort: ask the AI to fetch + analyze
          txt = data.reference;
        }
        const { data: aiData, error: aiErr } = await supabase.functions.invoke("verse-exegesis", {
          body: { verse: data.reference, verseText: txt || data.reference },
        });
        if (aiErr) throw aiErr;
        if (cancelled) return;
        const text =
          typeof aiData === "string"
            ? aiData
            : aiData?.exegesis ?? aiData?.content ?? aiData?.text ?? JSON.stringify(aiData);
        setExegesis(text);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erro na exegese");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ArtifactShell
      icon={<Microscope size={12} strokeWidth={2.4} />}
      label="Exegese"
      badge={data.reference}
      glow
    >
      {verseText && (
        <div
          className="text-[14.5px] leading-[1.75] mb-4 pl-4"
          style={{
            color: P.text,
            fontFamily: "'Crimson Text', Georgia, serif",
            fontStyle: "italic",
            borderLeft: `2px solid ${P.primary}55`,
          }}
        >
          "{verseText}"
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          <div
            className="h-3 rounded animate-pulse"
            style={{ background: `${P.primary}11`, width: "90%" }}
          />
          <div
            className="h-3 rounded animate-pulse"
            style={{ background: `${P.primary}11`, width: "75%" }}
          />
          <div
            className="h-3 rounded animate-pulse"
            style={{ background: `${P.primary}11`, width: "85%" }}
          />
          <p className="text-[11px] mt-3 italic" style={{ color: P.textFaint }}>
            Consultando o texto original...
          </p>
        </div>
      )}

      {error && (
        <p className="text-[12.5px]" style={{ color: "#ff7a7a" }}>
          {error}
        </p>
      )}

      {exegesis && !loading && (
        <>
          <div
            className="text-[13.5px] leading-[1.75] whitespace-pre-wrap mb-4"
            style={{ color: P.text, fontFamily: "'Crimson Text', Georgia, serif" }}
          >
            {exegesis}
          </div>
          <div className="flex flex-wrap gap-2">
            <ListenButton
              id={`exegese-${data.reference}`}
              text={`${verseText ? `"${verseText}" — ${data.reference}. ` : ""}${exegesis}`}
              label={data.reference}
            />
            <ArtifactAction
              onClick={() => sendAsUser(`anotar: Exegese de ${data.reference} — ${exegesis.slice(0, 200)}…`)}
              variant="primary"
            >
              📝 Salvar como nota
            </ArtifactAction>
            <ArtifactAction onClick={() => sendAsUser(`mapa mental sobre ${data.reference}`)}>
              🧠 Criar mapa
            </ArtifactAction>
            <ArtifactAction onClick={() => sendAsUser(`mostrar ${data.reference}`)}>
              <BookOpen size={11} /> Ver versículo
            </ArtifactAction>
          </div>
        </>
      )}
    </ArtifactShell>
  );
}
