import { Flame, Search, PenLine, BookOpen } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";
import { todayDayName } from "@/lib/readingPlan";

interface Props {
  data: {
    ref?: string;
    verseText?: string;
    summary?: string;
    day?: string;
    period?: string;
  };
  sendAsUser: (text: string) => void;
}

export default function DevotionalTodayArtifact({ data, sendAsUser }: Props) {
  const day = data.day ?? todayDayName();
  const ref = data.ref ?? "Sem devocional para hoje";
  return (
    <ArtifactShell
      icon={<Flame size={13} />}
      label="Devocional de hoje"
      badge={data.period ? `${day} · ${data.period}` : day}
    >
      {!data.ref ? (
        <p className="text-[13.5px]" style={{ color: P.textDim }}>
          Não há devocional cadastrado para hoje. Aproveite para refletir sobre sua leitura ou
          capturar um pensamento.
        </p>
      ) : (
        <>
          <p className="text-[10.5px] font-bold uppercase tracking-[1.6px] mb-2" style={{ color: P.primary }}>
            {ref}
          </p>
          {data.verseText && (
            <p
              className="text-[15.5px] leading-[1.85] mb-3 italic"
              style={{ color: P.text, fontFamily: "'Crimson Text', Georgia, serif" }}
            >
              "{data.verseText}"
            </p>
          )}
          {data.summary && (
            <p className="text-[13.5px] leading-[1.7] mb-4" style={{ color: P.textDim }}>
              {data.summary}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <ArtifactAction onClick={() => sendAsUser(`exegese de ${ref}`)} variant="primary">
              <Search size={11} /> Exegese completa
            </ArtifactAction>
            <ArtifactAction onClick={() => sendAsUser(`ver versículo ${ref}`)}>
              <BookOpen size={11} /> Ler versículo
            </ArtifactAction>
            <ArtifactAction onClick={() => sendAsUser(`anotar reflexão sobre ${ref}`)}>
              <PenLine size={11} /> Refletir
            </ArtifactAction>
          </div>
        </>
      )}
    </ArtifactShell>
  );
}
