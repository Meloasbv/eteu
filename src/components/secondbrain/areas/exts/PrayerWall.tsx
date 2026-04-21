import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AREA_META } from "@/lib/brainAreas";

interface PrayerRow {
  id: string;
  content: string;
  created_at: string;
  prayer_status: string | null;
  prayer_answered_at: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "hoje";
  if (days === 1) return "1 dia";
  if (days < 30) return `${days} dias`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 mês";
  return `${months} meses`;
}

interface Props {
  userCodeId: string;
  refreshKey?: number;
}

export default function PrayerWall({ userCodeId, refreshKey = 0 }: Props) {
  const m = AREA_META.oracao;
  const [rows, setRows] = useState<PrayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("thoughts")
        .select("id, content, created_at, prayer_status, prayer_answered_at")
        .eq("user_code_id", userCodeId)
        .eq("area", "oracao")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(60);
      if (!cancelled) {
        setRows((data ?? []) as PrayerRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userCodeId, refreshKey]);

  const markAnswered = async (id: string) => {
    await supabase.from("thoughts")
      .update({ prayer_status: "answered", prayer_answered_at: new Date().toISOString() } as any)
      .eq("id", id);
    toast({ title: "🙏 Marcada como respondida" });
    setRows(rs => rs.map(r => r.id === id ? { ...r, prayer_status: "answered", prayer_answered_at: new Date().toISOString() } : r));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6" style={{ color: m.muted }}>
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-[12px] italic text-center py-4" style={{ color: m.muted }}>Nenhuma oração ainda.</p>;
  }

  const pending = rows.filter(r => r.prayer_status !== "answered");
  const answered = rows.filter(r => r.prayer_status === "answered");

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[2px] font-bold" style={{ color: m.accent }}>
        🙏 Muro de Oração
      </p>
      <ul className="space-y-1.5">
        {pending.map(r => (
          <li key={r.id} className="flex items-start gap-2 p-2 rounded-md"
              style={{ background: `${m.surface}cc`, border: `1px solid ${m.border}` }}>
            <Clock size={12} className="mt-0.5 shrink-0" style={{ color: m.muted }} />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] line-clamp-2" style={{ color: m.text }}>{r.content}</p>
              <p className="text-[10px] mt-0.5" style={{ color: m.muted }}>há {timeAgo(r.created_at)}</p>
            </div>
            <button
              onClick={() => markAnswered(r.id)}
              className="text-[10px] px-2 py-0.5 rounded shrink-0"
              style={{ color: m.accent, border: `1px solid ${m.accent}55` }}
            >
              ✓ Resp.
            </button>
          </li>
        ))}
        {answered.length > 0 && (
          <li className="pt-2 mt-1 border-t" style={{ borderColor: m.border }}>
            <p className="text-[10px] mb-1.5" style={{ color: m.muted }}>Respondidas</p>
            <ul className="space-y-1">
              {answered.map(r => (
                <li key={r.id} className="flex items-start gap-2 p-1.5 rounded-md text-[11.5px]"
                    style={{ color: m.muted }}>
                  <CheckCircle2 size={11} className="mt-0.5 shrink-0" style={{ color: m.accent }} />
                  <span className="line-clamp-1 flex-1">{r.content}</span>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </div>
  );
}
