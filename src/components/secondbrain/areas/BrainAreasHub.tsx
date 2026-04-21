import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Sparkles, Brain } from "lucide-react";
import { haptic } from "@/hooks/useHaptic";
import { AREAS, AREA_META, areaCSSVars, type BrainArea } from "@/lib/brainAreas";
import AreaShell from "./AreaShell";

interface Props {
  userCodeId: string;
  /** Optional area to open immediately (deep link from chip / focus shortcut) */
  initialArea?: BrainArea | null;
  initialContent?: string;
  /** Called when user closes the inner area (returns to hub) */
  onAreaClose?: () => void;
  /** Optional close button (only used when hub itself is in an overlay) */
  onClose?: () => void;
}

export default function BrainAreasHub({ userCodeId, initialArea, initialContent, onAreaClose, onClose }: Props) {
  const [openArea, setOpenArea] = useState<BrainArea | null>(initialArea ?? null);
  const [seedContent, setSeedContent] = useState(initialContent ?? "");
  const [counts, setCounts] = useState<Record<BrainArea, number>>({ reflexao: 0, oracao: 0, brainstorm: 0 });
  const [recent, setRecent] = useState<Record<BrainArea, string | null>>({ reflexao: null, oracao: null, brainstorm: null });

  useEffect(() => {
    if (initialArea) setOpenArea(initialArea);
  }, [initialArea]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await Promise.all(AREAS.map(async a => {
        const [{ count }, { data: last }] = await Promise.all([
          supabase.from("thoughts").select("id", { count: "exact", head: true })
            .eq("user_code_id", userCodeId).eq("area", a).eq("archived", false),
          supabase.from("thoughts").select("content")
            .eq("user_code_id", userCodeId).eq("area", a).eq("archived", false)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        return { a, count: count ?? 0, last: last?.content ?? null };
      }));
      if (cancelled) return;
      const c: any = {}; const r: any = {};
      all.forEach(({ a, count, last }) => { c[a] = count; r[a] = last; });
      setCounts(c); setRecent(r);
    })();
    return () => { cancelled = true; };
  }, [userCodeId, openArea]);

  if (openArea) {
    return (
      <AreaShell
        area={openArea}
        userCodeId={userCodeId}
        initialContent={seedContent}
        onClose={() => {
          setOpenArea(null);
          setSeedContent("");
          onAreaClose?.();
        }}
      />
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <header className="mb-6 sm:mb-8 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Brain size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[3px] text-muted-foreground/70 font-bold">Segundo Cérebro</p>
            <h1 className="text-[22px] sm:text-[28px] font-bold leading-tight mt-0.5">Em que mindset você quer entrar?</h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">Escolha uma área para mergulhar. Cada uma tem seu ambiente, som e ferramentas próprias.</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
          )}
        </header>

        <div className="grid gap-3 sm:gap-4">
          {AREAS.map(area => {
            const m = AREA_META[area];
            return (
              <button
                key={area}
                onClick={() => { setOpenArea(area); haptic("medium"); }}
                className="group relative text-left rounded-2xl p-4 sm:p-5 transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
                style={{
                  ...areaCSSVars(area),
                  background: m.bg,
                  border: `1px solid ${m.border}`,
                  boxShadow: `0 6px 24px -10px ${m.accent}55`,
                }}
              >
                {/* glow accent */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none transition-opacity group-hover:opacity-80"
                  style={{ background: `radial-gradient(circle, ${m.accentGlow} 0%, transparent 70%)`, opacity: 0.5 }} />

                <div className="relative flex items-start gap-3 sm:gap-4">
                  <div className="text-[36px] sm:text-[42px] leading-none shrink-0">{m.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[18px] sm:text-[20px] font-bold" style={{ color: m.text }}>{m.label}</h2>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full tabular-nums font-bold"
                        style={{ background: `${m.accent}22`, color: m.accent, border: `1px solid ${m.accent}55` }}>
                        {counts[area]}
                      </span>
                    </div>
                    <p className="text-[12.5px] mt-1" style={{ color: m.muted }}>{m.tagline}</p>
                    {recent[area] && (
                      <p className="text-[11.5px] mt-2 italic line-clamp-1" style={{ color: m.text, opacity: 0.7 }}>
                        “{recent[area]}”
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-3 text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: m.accent }}>
                      <Sparkles size={11} />
                      <span>{m.ctaLabel}</span>
                      <ArrowRight size={12} className="ml-auto transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-center text-muted-foreground/60 mt-8">
          Pensamentos antigos foram organizados automaticamente. Você pode mover entre áreas a qualquer momento.
        </p>
      </div>
    </div>
  );
}
