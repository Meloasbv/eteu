import { useState } from "react";
import { Brain, Check, Plus, X } from "lucide-react";
import { useParaItems, useParaLinks, type ParaEntityType, type ParaKind } from "@/hooks/useParaLinks";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "@/hooks/use-toast";

const KIND_LABELS: Record<ParaKind, string> = {
  project: "Projetos",
  area: "Áreas",
  resource: "Recursos",
  archive: "Arquivo",
};

const KIND_EMOJIS: Record<ParaKind, string> = {
  project: "🎯",
  area: "🌱",
  resource: "📚",
  archive: "🗄️",
};

interface Props {
  userCodeId: string;
  entityType: ParaEntityType;
  entityId: string;
  entityLabel: string;
  variant?: "ghost" | "pill";
  className?: string;
}

export default function LinkToBrainButton({
  userCodeId, entityType, entityId, entityLabel, variant = "ghost", className,
}: Props) {
  const [open, setOpen] = useState(false);
  const { items, create } = useParaItems(userCodeId);
  const { links, link, unlinkByEntity } = useParaLinks(userCodeId);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<ParaKind>("project");

  const linkedParaIds = new Set(
    links.filter(l => l.entity_type === entityType && l.entity_id === entityId).map(l => l.para_id),
  );

  const toggleLink = async (paraId: string) => {
    haptic("light");
    if (linkedParaIds.has(paraId)) {
      await unlinkByEntity(paraId, entityType, entityId);
      toast({ title: "Desvinculado do Cérebro" });
    } else {
      await link(paraId, entityType, entityId, entityLabel);
      toast({ title: "Vinculado ao Cérebro 🧠" });
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const { data } = await create({ title: newTitle.trim(), kind: newKind });
    if (data) {
      await link(data.id, entityType, entityId, entityLabel);
      toast({ title: "Criado e vinculado 🧠" });
      setNewTitle(""); setCreating(false);
    }
  };

  const linkedCount = linkedParaIds.size;

  const grouped = (["project", "area", "resource", "archive"] as ParaKind[]).map(k => ({
    kind: k,
    items: items.filter(i => i.kind === k),
  }));

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={
          variant === "pill"
            ? `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${className || ""}`
            : `inline-flex items-center gap-1 text-[11px] font-ui transition-colors hover:text-primary ${className || ""}`
        }
        style={
          variant === "pill"
            ? {
                background: linkedCount > 0 ? "hsl(var(--primary) / 0.15)" : "transparent",
                color: linkedCount > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                border: `1px solid ${linkedCount > 0 ? "hsl(var(--primary) / 0.35)" : "hsl(var(--border))"}`,
              }
            : { color: linkedCount > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }
        }
        aria-label="Vincular ao Segundo Cérebro"
      >
        <Brain size={variant === "pill" ? 11 : 13} />
        {linkedCount > 0 ? `${linkedCount} no Cérebro` : "Cérebro"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md max-h-[85vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl animate-scale-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-primary" />
                <h3 className="text-sm font-bold font-display tracking-wide">Vincular ao Cérebro</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground/50 font-ui">Item</p>
              <p className="text-xs text-foreground/80 font-body line-clamp-2 mt-0.5">{entityLabel}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2">
              {grouped.map(group => (
                <div key={group.kind} className="mb-3">
                  <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground/50 font-ui px-2 mb-1.5">
                    {KIND_EMOJIS[group.kind]} {KIND_LABELS[group.kind]}
                  </p>
                  {group.items.length === 0 && (
                    <p className="text-[11px] italic text-muted-foreground/40 px-2">Nenhum {group.kind} ainda</p>
                  )}
                  {group.items.map(item => {
                    const linked = linkedParaIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleLink(item.id)}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors hover:bg-muted/30"
                      >
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                          style={{ background: `${item.color || "#d4af7a"}22`, color: item.color || "#d4af7a" }}
                        >
                          {item.icon || "📁"}
                        </span>
                        <span className="flex-1 text-xs font-body text-foreground/85 truncate">{item.title}</span>
                        {linked ? (
                          <Check size={14} className="text-primary" />
                        ) : (
                          <Plus size={14} className="text-muted-foreground/40" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="border-t border-border p-3">
              {creating ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Título do PARA"
                    className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary/40"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(["project", "area", "resource", "archive"] as ParaKind[]).map(k => (
                      <button
                        key={k}
                        onClick={() => setNewKind(k)}
                        className="px-2 py-1 rounded-full text-[10px] font-bold uppercase font-ui"
                        style={{
                          background: newKind === k ? "hsl(var(--primary) / 0.15)" : "transparent",
                          color: newKind === k ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                          border: `1px solid ${newKind === k ? "hsl(var(--primary) / 0.35)" : "hsl(var(--border))"}`,
                        }}
                      >
                        {KIND_EMOJIS[k]} {KIND_LABELS[k]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setCreating(false)} className="text-[11px] font-ui text-muted-foreground px-2 py-1">
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!newTitle.trim()}
                      className="text-[11px] font-bold font-ui px-3 py-1 rounded-md disabled:opacity-40"
                      style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.35)" }}
                    >
                      Criar e vincular
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider font-ui py-2 rounded-md border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <Plus size={12} /> Novo PARA
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
