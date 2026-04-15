import { useState } from "react";
import { ArrowLeft, Copy, MapPin } from "lucide-react";
import type { AnalysisResult } from "./types";

const categoryColors: Record<string, { border: string; text: string }> = {
  teologia:    { border: "#c9a067", text: "#c9a067" },
  contexto:    { border: "#8b9e7a", text: "#8b9e7a" },
  "aplicação": { border: "#7ba3c9", text: "#7ba3c9" },
  personagem:  { border: "#d4854a", text: "#d4854a" },
  lugar:       { border: "#6a9c8a", text: "#6a9c8a" },
  evento:      { border: "#b08db5", text: "#b08db5" },
};

interface Props {
  analysis: AnalysisResult;
  onBack: () => void;
  onGoToFlashcard?: (noteId: string) => void;
}

export default function StudyNotesListView({ analysis, onBack, onGoToFlashcard }: Props) {
  const concepts = analysis.key_concepts || [];
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyNote = async (concept: typeof concepts[0]) => {
    const parts = [
      `📖 ${concept.title}`,
      concept.coreIdea ? `\n💡 ${concept.coreIdea}` : "",
      concept.keyPoints?.length ? `\n${concept.keyPoints.map(p => `• ${p}`).join("\n")}` : "",
      concept.practicalApplication ? `\n⚡ ${concept.practicalApplication}` : "",
      concept.bible_refs?.length ? `\n📌 ${concept.bible_refs.join(" · ")}` : "",
      concept.impactPhrase ? `\n🔥 "${concept.impactPhrase}"` : "",
    ].filter(Boolean).join("");

    await navigator.clipboard.writeText(parts);
    setCopiedId(concept.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground font-ui hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Voltar
        </button>
        <p className="text-sm font-display font-semibold text-foreground">
          📋 {concepts.length} notas
        </p>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-[640px] mx-auto space-y-4">
          {/* Theme header */}
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">{analysis.main_theme}</h2>
            <p className="text-[13px] text-muted-foreground font-body leading-relaxed">{analysis.summary}</p>
          </div>

          {concepts.map((concept, i) => {
            const cat = categoryColors[concept.category] || categoryColors.teologia;
            return (
              <div key={i} className="rounded-xl p-5"
                style={{
                  background: "hsl(var(--card))",
                  border: `1px solid hsl(var(--border))`,
                  borderLeft: `4px solid ${cat.border}`,
                }}>
                <div className="flex items-start justify-between mb-3">
                  <p className="font-display text-[16px] font-semibold" style={{ color: cat.text }}>
                    📖 {concept.title}
                  </p>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => copyNote(concept)}
                      className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-primary transition-all"
                      title="Copiar nota">
                      {copiedId === concept.id ? <span className="text-[10px] text-primary font-ui">✓</span> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                {concept.coreIdea && (
                  <div className="mb-3 py-2 px-3 rounded-r-lg"
                    style={{ background: `${cat.border}08`, borderLeft: `2px solid ${cat.border}40` }}>
                    <p className="font-body text-[13.5px] italic leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.9)" }}>
                      💡 {concept.coreIdea}
                    </p>
                  </div>
                )}

                {concept.keyPoints && concept.keyPoints.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] font-ui font-bold tracking-[2px] uppercase mb-1.5"
                      style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                      Pontos Principais
                    </p>
                    <div className="space-y-1">
                      {concept.keyPoints.map((pt, j) => (
                        <p key={j} className="font-ui text-[12.5px] leading-relaxed pl-3 relative"
                          style={{ color: "hsl(var(--foreground) / 0.75)" }}>
                          <span className="absolute left-0" style={{ color: cat.border }}>•</span>
                          {pt}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {concept.practicalApplication && (
                  <div className="mb-3">
                    <p className="text-[9px] font-ui font-bold tracking-[2px] uppercase mb-1"
                      style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                      ⚡ Aplicação
                    </p>
                    <p className="font-ui text-[12.5px] leading-relaxed" style={{ color: "#8b9e7a" }}>
                      {concept.practicalApplication}
                    </p>
                  </div>
                )}

                {concept.bible_refs && concept.bible_refs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {concept.bible_refs.map((ref, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-md text-[10.5px] italic font-body cursor-pointer transition-all hover:scale-105"
                        style={{ background: `${cat.border}0a`, color: cat.text, border: `1px solid ${cat.border}25` }}>
                        📌 {ref}
                      </span>
                    ))}
                  </div>
                )}

                {concept.impactPhrase && (
                  <div className="pt-3 mt-2" style={{ borderTop: `1px solid ${cat.border}15` }}>
                    <p className="font-body text-[14px] font-semibold text-center leading-snug"
                      style={{ color: cat.border }}>
                      🔥 "{concept.impactPhrase}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
