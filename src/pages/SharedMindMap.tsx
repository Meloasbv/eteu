import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Brain } from "lucide-react";
import type { AnalysisResult } from "@/components/mindmap/types";

const MindMapCanvas = lazy(() => import("@/components/mindmap/MindMapCanvas"));

export default function SharedMindMap() {
  const { slug } = useParams<{ slug: string }>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    const fetchMap = async () => {
      // Search mind_maps where study_notes contains the public_slug
      const { data, error } = await supabase
        .from("mind_maps")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      // Find map with matching slug in study_notes
      const map = data.find((m: any) => {
        const notes = m.study_notes as any;
        return notes?.is_public && notes?.public_slug === slug;
      });

      if (!map) { setNotFound(true); setLoading(false); return; }

      setTitle(map.title);

      // Reconstruct analysis from stored nodes
      const nodes = (map.nodes as any[]) || [];
      const studyNotes = map.study_notes as any;

      // If the map has an analysis stored, use it
      if (studyNotes?.analysis) {
        setAnalysis(studyNotes.analysis);
      } else {
        // Fallback: create a basic analysis from nodes
        const rootNode = nodes.find((n: any) => n.type === "root" || n.type === "rootNode");
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
        <h1 className="font-display text-xl font-bold" style={{ color: "#ede4d3" }}>
          Mapa não encontrado
        </h1>
        <p className="text-sm font-body" style={{ color: "#8a7d6a" }}>
          Este link pode ter expirado ou o mapa foi tornado privado.
        </p>
        <Link to="/" className="text-sm font-sans mt-4 px-4 py-2 rounded-lg transition-colors" style={{ color: "#c4a46a", border: "1px solid rgba(196,164,106,0.3)" }}>
          Criar meu mapa →
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "#0f0d0a" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(196,164,106,0.1)", background: "rgba(22,19,15,0.95)" }}
      >
        <div className="flex items-center gap-2">
          <Brain size={16} style={{ color: "#c4a46a" }} />
          <span className="font-display text-sm font-semibold" style={{ color: "#ede4d3" }}>{title}</span>
          <span className="text-[10px] font-sans px-2 py-0.5 rounded-full" style={{ background: "rgba(196,164,106,0.1)", color: "#c4a46a" }}>
            somente leitura
          </span>
        </div>
        <Link to="/" className="text-[11px] font-sans transition-colors" style={{ color: "#c4a46a" }}>
          Criar meu mapa →
        </Link>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin" size={24} style={{ color: "#c4a46a" }} />
          </div>
        }>
          <MindMapCanvas analysis={analysis} onClose={() => window.history.back()} />
        </Suspense>
      </div>
    </div>
  );
}
