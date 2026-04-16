import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, BarChart3, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Thought {
  id: string;
  content: string;
  type: string;
  keywords: string[];
  emotion_valence: number;
  emotion_intensity: number;
  created_at: string;
}

interface Pattern {
  id: string;
  pattern_name: string;
  description: string | null;
  bible_refs: string[] | null;
  thought_ids: string[] | null;
  detected_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  problema: "#c97a7a", insight: "#c4a46a", estudo: "#7ba3c9", reflexão: "#b08db5",
  oração: "#d4b87a", decisão: "#d4854a", emocional: "#e8a0b4", ideia: "#8b9e7a", pergunta: "#6a9c8a",
};

const TYPE_LABELS: Record<string, string> = {
  problema: "Problema", insight: "Insight", estudo: "Estudo", reflexão: "Reflexão",
  oração: "Oração", decisão: "Decisão", emocional: "Emocional", ideia: "Ideia", pergunta: "Pergunta",
};

export default function PatternsView({ userCodeId }: { userCodeId: string }) {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [userCodeId]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("thoughts").select("id, content, type, keywords, emotion_valence, emotion_intensity, created_at")
        .eq("user_code_id", userCodeId).order("created_at", { ascending: true }).limit(200),
      supabase.from("thought_patterns").select("*").eq("user_code_id", userCodeId).order("detected_at", { ascending: false }).limit(20),
    ]);
    if (t) setThoughts(t.map(x => ({ ...x, keywords: (x.keywords as string[]) || [], emotion_valence: Number(x.emotion_valence) || 0, emotion_intensity: Number(x.emotion_intensity) || 0 })));
    if (p) setPatterns(p.map(x => ({ ...x, bible_refs: (x.bible_refs as string[]) || [], thought_ids: (x.thought_ids as string[]) || [] })));
    setLoading(false);
  };

  // Type frequency
  const typeFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    thoughts.forEach(t => { counts[t.type] = (counts[t.type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [thoughts]);

  const maxCount = typeFrequency.length > 0 ? typeFrequency[0][1] : 1;

  // Mood over time (last 30 days grouped by day)
  const moodData = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const recent = thoughts.filter(t => new Date(t.created_at).getTime() > thirtyDaysAgo);
    const byDay: Record<string, { sum: number; count: number }> = {};
    recent.forEach(t => {
      const day = new Date(t.created_at).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { sum: 0, count: 0 };
      byDay[day].sum += t.emotion_valence;
      byDay[day].count += 1;
    });
    return Object.entries(byDay).sort().map(([day, { sum, count }]) => ({
      day: day.slice(5), // MM-DD
      avg: sum / count,
    }));
  }, [thoughts]);

  // Top keywords
  const topKeywords = useMemo(() => {
    const counts: Record<string, number> = {};
    thoughts.forEach(t => t.keywords.forEach(k => { counts[k] = (counts[k] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [thoughts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={20} className="animate-spin text-primary/50" />
      </div>
    );
  }

  if (thoughts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <BarChart3 size={32} className="text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground/50 italic font-body text-center">
          Registre pensamentos para ver padrões e insights
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 pb-28 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={18} className="text-primary" />
        <h2 className="text-sm font-bold font-display text-foreground">Padrões do seu Segundo Cérebro</h2>
      </div>

      {/* Mood chart */}
      {moodData.length > 1 && (
        <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-[9px] font-bold uppercase tracking-[2px] text-muted-foreground/40 font-ui mb-3">
            📈 Humor nos últimos 30 dias
          </p>
          <div className="relative h-24">
            <svg viewBox={`0 0 ${moodData.length * 30} 100`} className="w-full h-full" preserveAspectRatio="none">
              {/* Zero line */}
              <line x1="0" y1="50" x2={moodData.length * 30} y2="50" stroke="hsl(var(--border))" strokeWidth="0.5" />
              {/* Area */}
              <path
                d={`M0,50 ${moodData.map((d, i) => `L${i * 30 + 15},${50 - d.avg * 40}`).join(" ")} L${(moodData.length - 1) * 30 + 15},50 Z`}
                fill="hsl(var(--primary) / 0.08)"
              />
              {/* Line */}
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                points={moodData.map((d, i) => `${i * 30 + 15},${50 - d.avg * 40}`).join(" ")}
              />
              {/* Dots */}
              {moodData.map((d, i) => (
                <circle key={i} cx={i * 30 + 15} cy={50 - d.avg * 40} r="3" fill="hsl(var(--primary))" />
              ))}
            </svg>
            <div className="flex justify-between mt-1">
              {moodData.map((d, i) => (
                <span key={i} className="text-[8px] text-muted-foreground/40" style={{ width: 30, textAlign: "center" }}>
                  {d.day}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Type frequency */}
      <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <p className="text-[9px] font-bold uppercase tracking-[2px] text-muted-foreground/40 font-ui mb-3">
          🏷️ Tipos mais frequentes
        </p>
        <div className="space-y-2">
          {typeFrequency.map(([type, count]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="text-[10px] w-16 text-right font-ui" style={{ color: TYPE_COLORS[type] }}>
                {TYPE_LABELS[type] || type}
              </span>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.2)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(count / maxCount) * 100}%`, background: TYPE_COLORS[type] || "hsl(var(--primary))", opacity: 0.7 }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/50 font-ui w-8">
                {Math.round((count / thoughts.length) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Patterns from AI */}
      {patterns.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[2px] text-muted-foreground/40 font-ui">
            🔄 Padrões recorrentes
          </p>
          {patterns.map(p => (
            <div key={p.id} className="rounded-xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <p className="text-xs font-bold text-foreground/80 font-body">⚠️ "{p.pattern_name}"</p>
              {p.description && <p className="text-[11px] text-muted-foreground/70 font-body mt-1">{p.description}</p>}
              {p.bible_refs && p.bible_refs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.bible_refs.map((ref, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-body"
                      style={{ background: "hsl(var(--primary) / 0.06)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.15)" }}>
                      📌 {ref}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Top keywords */}
      {topKeywords.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <p className="text-[9px] font-bold uppercase tracking-[2px] text-muted-foreground/40 font-ui mb-3">
            🧠 Temas centrais no seu grafo
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topKeywords.map(([kw, count]) => (
              <span key={kw} className="px-2.5 py-1 rounded-full text-[10px] font-ui"
                style={{
                  background: "hsl(var(--primary) / 0.08)",
                  color: "hsl(var(--primary))",
                  border: "1px solid hsl(var(--primary) / 0.15)",
                }}>
                {kw} <span className="text-muted-foreground/40">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: thoughts.length },
          { label: "Tipos", value: typeFrequency.length },
          { label: "Keywords", value: topKeywords.length },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <p className="text-lg font-bold text-primary font-display">{s.value}</p>
            <p className="text-[9px] text-muted-foreground/50 font-ui uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
