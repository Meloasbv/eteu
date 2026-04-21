import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AREA_META, type BrainArea } from "@/lib/brainAreas";
import AreaCard, { type AreaThought } from "./AreaCard";

interface Props {
  area: BrainArea;
  userCodeId: string;
  refreshKey?: number;
  highlightId?: string | null;
}

export default function AreaFeed({ area, userCodeId, refreshKey = 0, highlightId }: Props) {
  const m = AREA_META[area];
  const [rows, setRows] = useState<AreaThought[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalKey, setInternalKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("thoughts")
        .select("id, content, type, created_at, analysis, keywords, emotion_valence, emotion_intensity, prayer_status, prayer_answered_at, kanban_status, reflection_exercise")
        .eq("user_code_id", userCodeId)
        .eq("area", area)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(60);
      if (!cancelled) {
        setRows((data ?? []).map((d: any) => ({
          ...d,
          keywords: (d.keywords as string[]) ?? [],
          emotion_valence: Number(d.emotion_valence) || 0,
          emotion_intensity: Number(d.emotion_intensity) || 0,
        })));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userCodeId, area, refreshKey, internalKey]);

  // Auto-scroll to highlighted card
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`area-card-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = `2px solid ${m.accent}`;
      el.style.outlineOffset = "4px";
      setTimeout(() => { el.style.outline = ""; }, 2000);
    }
  }, [highlightId, m.accent]);

  if (loading) {
    return <p className="text-[12px] py-6 text-center" style={{ color: m.muted }}>Carregando…</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[44px] mb-2 opacity-40">{m.emoji}</p>
        <p className="text-[13px]" style={{ color: m.muted }}>Nenhum pensamento ainda.</p>
        <p className="text-[11px] mt-1" style={{ color: m.muted }}>{m.placeholder}</p>
      </div>
    );
  }

  const refresh = () => setInternalKey(k => k + 1);

  return (
    <div className="space-y-2.5">
      {rows.map(t => (
        <div key={t.id} id={`area-card-${t.id}`}>
          <AreaCard area={area} thought={t} onChanged={refresh} />
        </div>
      ))}
    </div>
  );
}
