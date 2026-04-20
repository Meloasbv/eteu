import { Sparkles } from "lucide-react";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";

interface Props {
  data: { greeting: string };
  sendAsUser: (text: string) => void;
}

export default function SaudacaoArtifact({ data, sendAsUser }: Props) {
  const suggestions = [
    { label: "📖 Leitura de hoje", cmd: "leitura de hoje" },
    { label: "🔥 Devocional", cmd: "devocional do dia" },
    { label: "🧠 Capturar pensamento", cmd: "capturar: " },
    { label: "🗺️ Meus mapas", cmd: "meus mapas mentais" },
  ];

  return (
    <ArtifactShell icon={<Sparkles size={12} strokeWidth={2.4} />} label="Atalhos">
      <p className="text-[13.5px] mb-3" style={{ color: P.textDim }}>
        {data.greeting}
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <ArtifactAction key={s.cmd} onClick={() => sendAsUser(s.cmd)}>
            {s.label}
          </ArtifactAction>
        ))}
      </div>
    </ArtifactShell>
  );
}
