import { useEffect, useState } from "react";
import { Brain, Sparkles, Heart, BookMarked, Lightbulb, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ArtifactShell, ArtifactAction } from "./ArtifactShell";
import { FOCUS_PALETTE as P } from "./types";

interface Analysis {
  detected_type?: string;
  psychological_analysis?: { pattern: string; explanation: string; reframe: string };
  biblical_analysis?: { principle: string; verses: string[]; application: string };
  diagnosis?: { summary: string; action: string; question: string };
  keywords?: string[];
}

interface Data {
  content: string;
  thoughtId?: string;
  analysis?: Analysis;
  loading?: boolean;
  error?: string;
}

interface Props {
  data: Data;
  userCodeId: string;
  sendAsUser: (text: string) => void;
}

export default function BrainCaptureArtifact({ data, userCodeId, sendAsUser }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | undefined>(data.analysis);
  const [loading, setLoading] = useState<boolean>(!!data.loading);
  const [error, setError] = useState<string | undefined>(data.error);
  const [thoughtId, setThoughtId] = useState<string | undefined>(data.thoughtId);

  useEffect(() => {
    if (analysis || error) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // 1) Insert thought immediately so it lands in Second Brain timeline
        const { data: inserted, error: insertErr } = await supabase
          .from("thoughts")
          .insert({
            user_code_id: userCodeId,
            content: data.content,
            type: "reflexão",
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        if (cancelled) return;
        setThoughtId(inserted.id);

        // 2) Fetch past thoughts for context
        const { data: past } = await supabase
          .from("thoughts")
          .select("content")
          .eq("user_code_id", userCodeId)
          .neq("id", inserted.id)
          .order("created_at", { ascending: false })
          .limit(20);

        // 3) Analyze
        const { data: aiData, error: aiErr } = await supabase.functions.invoke("analyze-thought", {
          body: {
            content: data.content,
            pastThoughts: (past ?? []).map((p) => p.content),
          },
        });
        if (aiErr) throw aiErr;
        if (cancelled) return;

        setAnalysis(aiData);

        // 4) Persist analysis on thought
        await supabase
          .from("thoughts")
          .update({
            analysis: aiData,
            type: aiData?.detected_type ?? "reflexão",
            keywords: aiData?.keywords ?? [],
            emotion_valence: aiData?.emotion_score?.valence ?? 0,
            emotion_intensity: aiData?.emotion_score?.intensity ?? 0,
          })
          .eq("id", inserted.id);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Erro ao analisar pensamento");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeIcon = (() => {
    const t = analysis?.detected_type ?? "reflexão";
    if (t === "emocional") return <Heart size={11} />;
    if (t === "ideia" || t === "insight") return <Lightbulb size={11} />;
    if (t === "decisão") return <Brain size={11} />;
    return <Sparkles size={11} />;
  })();

  return (
    <ArtifactShell
      icon={typeIcon}
      label="Pensamento registrado"
      badge={analysis?.detected_type ?? (loading ? "analisando" : "reflexão")}
      glow
    >
      {/* The user's thought */}
      <div
        className="text-[14.5px] leading-[1.7] mb-4 pl-4"
        style={{
          color: P.text,
          fontFamily: "'Crimson Text', Georgia, serif",
          fontStyle: "italic",
          borderLeft: `2px solid ${P.primary}55`,
        }}
      >
        {data.content}
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="h-3 rounded animate-pulse" style={{ background: `${P.primary}11`, width: "85%" }} />
          <div className="h-3 rounded animate-pulse" style={{ background: `${P.primary}11`, width: "65%" }} />
          <div className="h-3 rounded animate-pulse" style={{ background: `${P.primary}11`, width: "75%" }} />
        </div>
      )}

      {error && (
        <p className="text-[12.5px]" style={{ color: "#ff7a7a" }}>
          {error}
        </p>
      )}

      {analysis && !loading && (
        <div className="space-y-4">
          {analysis.psychological_analysis && (
            <Section icon={<Brain size={10} />} title="Análise psicológica">
              <p className="text-[12.5px] font-bold mb-1" style={{ color: P.text }}>
                {analysis.psychological_analysis.pattern}
              </p>
              <p className="text-[13px] leading-[1.65] mb-2" style={{ color: P.textDim }}>
                {analysis.psychological_analysis.explanation}
              </p>
              <p
                className="text-[12.5px] leading-[1.6] pl-3"
                style={{ color: P.primary, borderLeft: `2px solid ${P.primary}44` }}
              >
                ↻ {analysis.psychological_analysis.reframe}
              </p>
            </Section>
          )}

          {analysis.biblical_analysis && (
            <Section icon={<BookMarked size={10} />} title="Perspectiva bíblica">
              <p className="text-[12.5px] font-bold mb-1" style={{ color: P.text }}>
                {analysis.biblical_analysis.principle}
              </p>
              <p className="text-[13px] leading-[1.65] mb-2" style={{ color: P.textDim }}>
                {analysis.biblical_analysis.application}
              </p>
              {analysis.biblical_analysis.verses?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.biblical_analysis.verses.map((v, i) => (
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
            </Section>
          )}

          {analysis.diagnosis && (
            <Section icon={<Lightbulb size={10} />} title="Diagnóstico">
              <p className="text-[13px] font-semibold mb-2" style={{ color: P.text }}>
                "{analysis.diagnosis.summary}"
              </p>
              <p className="text-[12.5px] mb-1.5" style={{ color: P.textDim }}>
                ⚡ <span style={{ color: P.text }}>{analysis.diagnosis.action}</span>
              </p>
              <p className="text-[12.5px] italic" style={{ color: P.textDim }}>
                ❓ {analysis.diagnosis.question}
              </p>
            </Section>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <ArtifactAction onClick={() => sendAsUser("ver meu grafo de pensamentos")}>
              <Network size={11} /> Ver no grafo
            </ArtifactAction>
            {thoughtId && analysis?.diagnosis?.question && (
              <ArtifactAction onClick={() => sendAsUser(analysis.diagnosis!.question)}>
                Responder à pergunta
              </ArtifactAction>
            )}
          </div>
        </div>
      )}
    </ArtifactShell>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: P.primary }}>{icon}</span>
        <p
          className="text-[9.5px] font-bold uppercase tracking-[1.8px]"
          style={{ color: P.textDim }}
        >
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}
