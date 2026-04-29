import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen } from "lucide-react";
import type { AnalysisResult } from "@/components/mindmap/types";
import StudyGuide from "@/components/study-guide/StudyGuide";

export default function SharedStudySession() {
  const { slug } = useParams<{ slug: string }>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("study_sessions")
        .select("title, generated_study, is_public")
        .eq("public_slug", slug)
        .maybeSingle();
      if (!data || !data.is_public || !data.generated_study) {
        setNotFound(true); setLoading(false); return;
      }
      setTitle(data.title);
      setAnalysis(data.generated_study as unknown as AnalysisResult);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#0f0d0a" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "#c4a46a" }} />
      </div>
    );
  }

  if (notFound || !analysis) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#0f0d0a" }}>
        <BookOpen size={48} style={{ color: "#5c5347" }} />
        <h1 className="font-display text-xl font-bold" style={{ color: "#ede4d3" }}>Estudo não encontrado</h1>
        <p className="text-sm font-body" style={{ color: "#8a7d6a" }}>Este link pode ter expirado ou o estudo foi tornado privado.</p>
        <Link to="/" className="text-sm font-sans mt-4 px-4 py-2 rounded-lg transition-colors" style={{ color: "#c4a46a", border: "1px solid rgba(196,164,106,0.3)" }}>
          Criar meu estudo →
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen" style={{ background: "hsl(var(--background))" }}>
      <StudyGuide
        analysis={analysis}
        onBack={() => window.history.back()}
        sharedMode
        sharedSlug={slug}
      />
    </div>
  );
}
