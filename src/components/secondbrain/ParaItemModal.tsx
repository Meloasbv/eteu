import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ParaItem, ParaKind } from "@/hooks/useParaLinks";

const KIND_OPTIONS: { key: ParaKind; emoji: string; label: string; hint: string }[] = [
  { key: "project", emoji: "🎯", label: "Projeto", hint: "Algo com prazo definido" },
  { key: "area", emoji: "🌱", label: "Área", hint: "Responsabilidade contínua" },
  { key: "resource", emoji: "📚", label: "Recurso", hint: "Tema de interesse" },
  { key: "archive", emoji: "🗄️", label: "Arquivo", hint: "Inativo, mas guardado" },
];

const COLORS = ["#d4af7a", "#a855f7", "#7ecfe0", "#C8553D", "#6B8E6B", "#f9a8c9", "#4A7C8C", "#e8a0b4"];
const ICONS = ["🎯", "🌱", "📚", "🗄️", "📖", "🙏", "✍️", "💡", "💼", "🧘", "❤️", "⛪", "🔬", "🎵"];

interface Props {
  open: boolean;
  initial?: ParaItem | null;
  defaultKind?: ParaKind;
  onClose: () => void;
  onSubmit: (patch: { title: string; description: string; color: string; icon: string; kind: ParaKind; deadline: string | null; status: "active" | "paused" | "done" }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

export default function ParaItemModal({ open, initial, defaultKind = "project", onClose, onSubmit, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<ParaKind>(defaultKind);
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "done">("active");

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || "");
      setDescription(initial?.description || "");
      setKind((initial?.kind as ParaKind) || defaultKind);
      setColor(initial?.color || COLORS[0]);
      setIcon(initial?.icon || ICONS[0]);
      setDeadline(initial?.deadline ? initial.deadline.slice(0, 10) : "");
      setStatus((initial?.status as any) || "active");
    }
  }, [open, initial, defaultKind]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-bold font-display tracking-wide">{initial ? "Editar PARA" : "Novo PARA"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Kind */}
          <div className="grid grid-cols-2 gap-2">
            {KIND_OPTIONS.map(k => (
              <button
                key={k.key}
                onClick={() => setKind(k.key)}
                className="text-left p-2.5 rounded-lg border transition-all"
                style={{
                  background: kind === k.key ? "hsl(var(--primary) / 0.08)" : "transparent",
                  borderColor: kind === k.key ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))",
                }}
              >
                <div className="text-lg leading-none">{k.emoji}</div>
                <div className="text-xs font-bold mt-1" style={{ color: kind === k.key ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>{k.label}</div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">{k.hint}</div>
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] uppercase tracking-[2px] text-muted-foreground/50 font-ui">Título</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Estudo de Oseias, Saúde, Compromissos..."
              className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-[2px] text-muted-foreground/50 font-ui">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para que serve este item?"
              rows={2}
              className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 resize-none"
            />
          </div>

          {/* Icon + color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[2px] text-muted-foreground/50 font-ui">Ícone</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {ICONS.map(i => (
                  <button key={i} onClick={() => setIcon(i)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all"
                    style={{ background: icon === i ? `${color}33` : "hsl(var(--muted) / 0.3)", border: icon === i ? `1px solid ${color}` : "1px solid transparent" }}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[2px] text-muted-foreground/50 font-ui">Cor</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{ background: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Deadline (project only) */}
          {kind === "project" && (
            <div>
              <label className="text-[10px] uppercase tracking-[2px] text-muted-foreground/50 font-ui">Prazo</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
              />
            </div>
          )}

          {/* Status (edit only) */}
          {initial && (
            <div className="flex gap-1.5">
              {(["active", "paused", "done"] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-ui"
                  style={{
                    background: status === s ? "hsl(var(--primary) / 0.15)" : "transparent",
                    color: status === s ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    border: `1px solid ${status === s ? "hsl(var(--primary) / 0.35)" : "hsl(var(--border))"}`,
                  }}>
                  {s === "active" ? "Ativo" : s === "paused" ? "Pausado" : "Concluído"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border p-3">
          {initial && onDelete ? (
            <button onClick={onDelete} className="text-[11px] font-ui text-destructive hover:underline">Excluir</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-[11px] font-ui text-muted-foreground px-3 py-1.5">Cancelar</button>
            <button
              onClick={() => onSubmit({ title: title.trim(), description, color, icon, kind, deadline: deadline || null, status })}
              disabled={!title.trim()}
              className="text-[11px] font-bold font-ui px-3 py-1.5 rounded-md disabled:opacity-40"
              style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.35)" }}
            >
              {initial ? "Salvar" : "Criar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
