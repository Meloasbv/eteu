import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AREA_META } from "@/lib/brainAreas";
import { haptic } from "@/hooks/useHaptic";

interface KanbanRow {
  id: string;
  content: string;
  kanban_status: string | null;
}

const COLUMNS: { key: "idea" | "doing" | "done"; label: string; emoji: string }[] = [
  { key: "idea",  label: "Ideia",   emoji: "💡" },
  { key: "doing", label: "Fazendo", emoji: "🔨" },
  { key: "done",  label: "Feito",   emoji: "✅" },
];

interface Props {
  userCodeId: string;
  refreshKey?: number;
}

export default function MiniKanban({ userCodeId, refreshKey = 0 }: Props) {
  const m = AREA_META.brainstorm;
  const [rows, setRows] = useState<KanbanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("thoughts")
        .select("id, content, kanban_status")
        .eq("user_code_id", userCodeId)
        .eq("area", "brainstorm")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(60);
      if (!cancelled) {
        setRows((data ?? []) as KanbanRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userCodeId, refreshKey]);

  const move = async (id: string, status: "idea" | "doing" | "done") => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, kanban_status: status } : r));
    await supabase.from("thoughts").update({ kanban_status: status } as any).eq("id", id);
    toast({ title: `Movido para ${COLUMNS.find(c => c.key === status)?.label}` });
    haptic("light");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6" style={{ color: m.muted }}>
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[2px] font-bold" style={{ color: m.accent }}>
        ⚡ Mini Kanban
      </p>
      <div className="grid grid-cols-3 gap-2">
        {COLUMNS.map(col => {
          const items = rows.filter(r => (r.kanban_status ?? "idea") === col.key);
          return (
            <div
              key={col.key}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragId) { move(dragId, col.key); setDragId(null); } }}
              className="rounded-lg p-2 min-h-[120px]"
              style={{ background: `${m.surface}99`, border: `1px solid ${m.border}` }}
            >
              <p className="text-[10px] mb-2 font-bold" style={{ color: m.muted }}>
                {col.emoji} {col.label} · {items.length}
              </p>
              <ul className="space-y-1.5">
                {items.map(r => (
                  <li
                    key={r.id}
                    draggable
                    onDragStart={() => setDragId(r.id)}
                    onDragEnd={() => setDragId(null)}
                    className="p-1.5 rounded text-[11.5px] cursor-grab active:cursor-grabbing line-clamp-3"
                    style={{
                      background: `${m.accent}14`,
                      border: `1px solid ${m.accent}33`,
                      color: m.text,
                    }}
                  >
                    {r.content}
                    <div className="flex gap-1 mt-1">
                      {COLUMNS.filter(c => c.key !== (r.kanban_status ?? "idea")).map(c => (
                        <button
                          key={c.key}
                          onClick={() => move(r.id, c.key)}
                          className="text-[9px] px-1 py-0.5 rounded"
                          style={{ color: m.muted, border: `1px solid ${m.border}` }}
                        >
                          → {c.emoji}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
