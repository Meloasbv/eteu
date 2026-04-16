import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Brain } from "lucide-react";
import type { AnalysisResult } from "@/components/mindmap/types";
import PresentationMode from "@/components/mindmap/PresentationMode";

export default function SharedMindMap() {
  const { slug } = useParams<{ slug: string }>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    const fetchMap = async () => {
      const { data, error } = await supabase
        .from("mind_maps")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      const map = data.find((m: any) => {
        const notes = m.study_notes as any;
        return notes?.is_public && notes?.public_slug === slug;
      });

      if (!map) { setNotFound(true); setLoading(false); return; }

      const studyNotes = map.study_notes as any;
      if (studyNotes?.analysis) {
        setAnalysis(studyNotes.analysis);
      } else {
        setAnalysis({
          main_theme: map.title,
          summary: "",
          key_concepts: [],
          hierarchy: { root: { label: map.title } },
          keywords: [],
          structured_notes: [],
        });
      }
      setLoading(false);
    };
    fetchMap();
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
        <Brain size={48} style={{ color: "#5c5347" }} />
        <h1 className="font-display text-xl font-bold" style={{ color: "#ede4d3" }}>Mapa não encontrado</h1>
        <p className="text-sm font-body" style={{ color: "#8a7d6a" }}>Este link pode ter expirado ou o mapa foi tornado privado.</p>
        <Link to="/" className="text-sm font-sans mt-4 px-4 py-2 rounded-lg transition-colors" style={{ color: "#c4a46a", border: "1px solid rgba(196,164,106,0.3)" }}>
          Criar meu mapa →
        </Link>
      </div>
    );
  }

  return <PresentationMode analysis={analysis} onExit={() => window.history.back()} />;
}
