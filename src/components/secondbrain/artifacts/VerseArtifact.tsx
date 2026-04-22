import { useEffect, useState } from "react";
import { BookOpen, Loader2, PenLine, Search } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import { fetchBibleVerse } from "@/lib/bibleVerseFetcher";
import ListenButton from "./ListenButton";

interface Props {
  data: { reference: string; text?: string };
  sendAsUser: (text: string) => void;
}

export default function VerseArtifact({ data, sendAsUser }: Props) {
  const [text, setText] = useState<string | null>(data.text ?? null);
  const [loading, setLoading] = useState(!data.text);

  useEffect(() => {
    if (data.text) return;
    let alive = true;
    fetchBibleVerse(data.reference)
      .then((t) => {
        if (!alive) return;
        setText(t || "Versículo não encontrado.");
      })
      .catch(() => alive && setText("Não foi possível carregar o versículo."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [data.reference, data.text]);

  return (
    <ArtifactShell icon={<BookOpen size={13} />} label={data.reference} badge="Almeida">
      {loading ? (
        <div className="flex items-center gap-2 py-3 text-[13px]" style={{ color: P.textDim }}>
          <Loader2 size={13} className="animate-spin" /> Buscando texto…
        </div>
      ) : (
        <p
          className="text-[15px] leading-[1.8] mb-4"
          style={{ color: P.text, fontFamily: "'Crimson Text', Georgia, serif" }}
        >
          {text}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {text && !loading && (
          <ListenButton id={`verse-${data.reference}`} text={text} label={data.reference} />
        )}
        <ArtifactAction onClick={() => sendAsUser(`exegese de ${data.reference}`)} variant="primary">
          <Search size={11} /> Exegese
        </ArtifactAction>
        <ArtifactAction onClick={() => sendAsUser(`anotar: "${text}" — ${data.reference}`)}>
          <PenLine size={11} /> Anotar
        </ArtifactAction>
      </div>
    </ArtifactShell>
  );
}
