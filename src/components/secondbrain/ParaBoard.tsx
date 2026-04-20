import { useMemo, useState } from "react";
import { Plus, Pencil, Calendar as CalIcon, Bell } from "lucide-react";
import { useParaItems, useParaLinks, type ParaItem, type ParaKind } from "@/hooks/useParaLinks";
import ParaItemModal from "./ParaItemModal";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";
import WeekSchedule from "@/components/WeekSchedule";
import Reminders from "@/components/Reminders";

const KIND_META: Record<ParaKind, { emoji: string; label: string; hint: string }> = {
  project: { emoji: "🎯", label: "Projetos", hint: "Com prazo definido" },
  area: { emoji: "🌱", label: "Áreas", hint: "Responsabilidades contínuas" },
  resource: { emoji: "📚", label: "Recursos", hint: "Temas para o futuro" },
  archive: { emoji: "🗄️", label: "Arquivo", hint: "Inativos, guardados" },
};

interface Props {
  userCodeId: string;
}

export default function ParaBoard({ userCodeId }: Props) {
  const { items, create, update, remove } = useParaItems(userCodeId);
  const { links } = useParaLinks(userCodeId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ParaItem | null>(null);
  const [defaultKind, setDefaultKind] = useState<ParaKind>("project");
  const [openInner, setOpenInner] = useState<{ kind: "schedule" | "reminders" } | null>(null);

  const linksByPara = useMemo(() => {
    const map = new Map<string, { thoughts: number; notes: number; mind_maps: number; reminders: number; favorite_verses: number; reading_days: number; devotionals: number; total: number }>();
    for (const l of links) {
      const m = map.get(l.para_id) || { thoughts: 0, notes: 0, mind_maps: 0, reminders: 0, favorite_verses: 0, reading_days: 0, devotionals: 0, total: 0 };
      (m as any)[l.entity_type + "s"] = ((m as any)[l.entity_type + "s"] || 0) + 1;
      m.total += 1;
      map.set(l.para_id, m);
    }
    return map;
  }, [links]);

  const grouped = (Object.keys(KIND_META) as ParaKind[]).map(k => ({
    kind: k,
    items: items.filter(i => i.kind === k),
  }));

  const openNew = (kind: ParaKind) => { setDefaultKind(kind); setEditing(null); setModalOpen(true); haptic("light"); };
  const openEdit = (it: ParaItem) => { setEditing(it); setDefaultKind(it.kind); setModalOpen(true); haptic("light"); };

  const submit = async (patch: any) => {
    if (editing) {
      await update(editing.id, patch);
      toast({ title: "Atualizado" });
    } else {
      await create(patch);
      toast({ title: "Criado 🧠" });
    }
    setModalOpen(false); setEditing(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    await remove(editing.id);
    toast({ title: "Excluído" });
    setModalOpen(false); setEditing(null);
  };

  // Inner views (Compromissos / Lembretes)
  if (openInner) {
    return (
      <div className="w-full">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-border/40">
          <button onClick={() => setOpenInner(null)} className="text-xs text-muted-foreground hover:text-foreground font-ui">← Voltar ao PARA</button>
          <span className="text-xs text-muted-foreground/50">·</span>
          <h3 className="text-sm font-bold font-display tracking-wide">
            {openInner.kind === "schedule" ? "📌 Compromissos" : "🔔 Lembretes"}
          </h3>
        </div>
        {openInner.kind === "schedule" ? <WeekSchedule userCodeId={userCodeId} /> : <Reminders userCodeId={userCodeId} />}
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-3">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {grouped.map(group => (
          <div key={group.kind} className="rounded-xl border border-border/50 bg-card/40 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold font-display tracking-wide">{KIND_META[group.kind].emoji} {KIND_META[group.kind].label}</p>
                <p className="text-[10px] text-muted-foreground/60 font-ui">{KIND_META[group.kind].hint}</p>
              </div>
              <button onClick={() => openNew(group.kind)} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Plus size={14} />
              </button>
            </div>

            {/* Built-in Areas shortcuts */}
            {group.kind === "area" && (
              <>
                <button onClick={() => setOpenInner({ kind: "schedule" })}
                  className="w-full text-left p-2.5 rounded-lg mb-1.5 transition-colors hover:bg-muted/30 border border-dashed border-border">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-md flex items-center justify-center text-xs" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                      <CalIcon size={13} className="text-primary" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground/85 truncate">Compromissos</p>
                      <p className="text-[10px] text-muted-foreground/60">Sua agenda mensal</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => setOpenInner({ kind: "reminders" })}
                  className="w-full text-left p-2.5 rounded-lg mb-1.5 transition-colors hover:bg-muted/30 border border-dashed border-border">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-md flex items-center justify-center text-xs" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                      <Bell size={13} className="text-primary" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground/85 truncate">Lembretes</p>
                      <p className="text-[10px] text-muted-foreground/60">Notificações push</p>
                    </div>
                  </div>
                </button>
              </>
            )}

            <div className="space-y-1.5 flex-1">
              {group.items.length === 0 && group.kind !== "area" && (
                <p className="text-[11px] italic text-muted-foreground/40 px-2 py-3 text-center">
                  Nenhum {KIND_META[group.kind].label.toLowerCase().slice(0, -1)} ainda
                </p>
              )}
              {group.items.map(it => {
                const counts = linksByPara.get(it.id);
                const deadlineStr = it.deadline ? new Date(it.deadline) : null;
                const daysLeft = deadlineStr ? Math.ceil((deadlineStr.getTime() - Date.now()) / 86400000) : null;
                const overdue = daysLeft !== null && daysLeft < 0;
                return (
                  <button key={it.id} onClick={() => openEdit(it)}
                    className="w-full text-left p-2.5 rounded-lg transition-colors hover:bg-muted/30 group"
                    style={{ background: `${it.color || "#d4af7a"}10`, borderLeft: `3px solid ${it.color || "#d4af7a"}` }}>
                    <div className="flex items-start gap-2">
                      <span className="w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0" style={{ background: `${it.color || "#d4af7a"}22` }}>
                        {it.icon || "📁"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-foreground/85 truncate">{it.title}</p>
                          <Pencil size={10} className="text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {it.description && <p className="text-[10px] text-muted-foreground/60 line-clamp-1 mt-0.5">{it.description}</p>}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {counts && counts.total > 0 && (
                            <span className="text-[9px] text-primary/70 font-ui">🔗 {counts.total}</span>
                          )}
                          {daysLeft !== null && (
                            <span className="text-[9px] font-ui font-bold uppercase" style={{ color: overdue ? "hsl(var(--destructive))" : daysLeft <= 7 ? "#d4854a" : "hsl(var(--muted-foreground))" }}>
                              {overdue ? `${Math.abs(daysLeft)}d atraso` : daysLeft === 0 ? "hoje" : `${daysLeft}d`}
                            </span>
                          )}
                          {it.status !== "active" && (
                            <span className="text-[9px] font-ui px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground/70 uppercase">
                              {it.status === "paused" ? "Pausado" : "Concluído"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ParaItemModal
        open={modalOpen}
        initial={editing}
        defaultKind={defaultKind}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={submit}
        onDelete={editing ? handleDelete : undefined}
      />
    </div>
  );
}
