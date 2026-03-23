import { useState, useEffect, useRef, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Note = {
  id: string;
  title: string;
  reference: string;
  body: string;
  week: number; // 1–18
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "bible-notes-2026";
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

const WEEK_LABELS: Record<number, string> = {
  1: "24/01–30/01", 2: "31/01–06/02", 3: "07/02–13/02", 4: "14/02–20/02",
  5: "21/02–27/02", 6: "28/02–06/03", 7: "07/03–13/03", 8: "14/03–20/03",
  9: "21/03–27/03", 10: "28/03–03/04", 11: "04/04–10/04", 12: "11/04–17/04",
  13: "18/04–24/04", 14: "25/04–01/05", 15: "02/05–08/05", 16: "09/05–15/05",
  17: "16/05–22/05", 18: "23/05–29/05",
};

const ACCENT = ["#C8A55C","#6B8E6B","#4A7C8C","#a855f7","#C8553D","#6B5B8A","#E88D67","#c8b820"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function preview(text: string, len = 60) {
  if (!text) return "Sem conteúdo";
  return text.length > len ? text.slice(0, len) + "…" : text;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BibleNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<number, boolean>>({});
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Load
  useEffect(() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      if (d) {
        const parsed = JSON.parse(d);
        // migrate old format (summary → body, add week)
        const migrated = (Array.isArray(parsed) ? parsed : []).map((n: any) => ({
          ...n,
          body: n.body ?? n.summary ?? "",
          week: n.week ?? 1,
          updatedAt: n.updatedAt ?? n.createdAt,
        }));
        setNotes(migrated);
      }
    } catch {}
  }, []);

  const persist = (updated: Note[]) => {
    setNotes(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  // ── Editor actions ──────────────────────────────────────────────────────────
  const openNew = (week?: number) => {
    const now = new Date().toISOString();
    setEditing({
      id: `n-${Date.now()}`,
      title: "",
      reference: "",
      body: "",
      week: week ?? selectedWeek ?? 1,
      createdAt: now,
      updatedAt: now,
    });
    setTimeout(() => bodyRef.current?.focus(), 100);
  };

  const saveNote = () => {
    if (!editing) return;
    const now = new Date().toISOString();
    const note = { ...editing, updatedAt: now };
    // If title empty, derive from first line of body
    if (!note.title.trim() && note.body.trim()) {
      note.title = note.body.split("\n")[0].slice(0, 50);
    }
    if (!note.title.trim() && !note.body.trim()) {
      // discard empty note
      setEditing(null);
      return;
    }
    const exists = notes.find(n => n.id === note.id);
    const updated = exists
      ? notes.map(n => n.id === note.id ? note : n)
      : [note, ...notes];
    persist(updated);
    setEditing(null);
  };

  const removeNote = (id: string) => {
    persist(notes.filter(n => n.id !== id));
    setDeleteId(null);
    if (editing?.id === id) setEditing(null);
  };

  // ── Filtered & grouped ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notes
      .filter(n => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.reference.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, search]);

  const grouped = useMemo(() => {
    const map: Record<number, Note[]> = {};
    const list = selectedWeek ? filtered.filter(n => n.week === selectedWeek) : filtered;
    list.forEach(n => {
      if (!map[n.week]) map[n.week] = [];
      map[n.week].push(n);
    });
    return map;
  }, [filtered, selectedWeek]);

  const weekKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const totalCount = filtered.length;

  const toggleCollapse = (w: number) =>
    setCollapsedWeeks(p => ({ ...p, [w]: !p[w] }));

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(200,180,140,.15)",
    background: "rgba(255,255,255,.04)", color: "#e8d8b8",
    fontSize: 14, fontFamily: "inherit", outline: "none",
  };

  // ── Full-screen editor (iPhone-style) ─────────────────────────────────────
  if (editing) {
    return (
      <div style={{ padding: "0 0 40px", minHeight: "70vh" }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 16px 12px",
          borderBottom: "1px solid rgba(200,180,140,.08)",
        }}>
          <button onClick={saveNote} style={{
            padding: "7px 16px", borderRadius: 10,
            border: "1px solid rgba(200,170,100,.3)",
            background: "rgba(200,170,100,.08)", color: "#C8A55C",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            ‹ Voltar
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {notes.find(n => n.id === editing.id) && (
              <button onClick={() => setDeleteId(editing.id)} style={{
                padding: "7px 12px", borderRadius: 10,
                border: "1px solid rgba(200,80,60,.2)", background: "rgba(200,80,60,.06)",
                color: "#C8553D", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>🗑️</button>
            )}
            <button onClick={saveNote} style={{
              padding: "7px 16px", borderRadius: 10,
              border: "1px solid rgba(107,142,107,.4)",
              background: "rgba(107,142,107,.12)", color: "#6B8E6B",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              Salvar ✓
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ padding: "16px 20px 0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Week selector */}
          <select
            value={editing.week}
            onChange={e => setEditing({ ...editing, week: Number(e.target.value) })}
            style={{
              padding: "6px 10px", borderRadius: 8,
              border: "1px solid rgba(200,180,140,.2)",
              background: "rgba(200,180,140,.06)", color: "#C8A55C",
              fontSize: 12, fontFamily: "inherit", outline: "none",
              cursor: "pointer",
            }}>
            {WEEKS.map(w => (
              <option key={w} value={w} style={{ background: "#1e1a14", color: "#e8d8b8" }}>
                Sem. {w} — {WEEK_LABELS[w]}
              </option>
            ))}
          </select>

          {/* Reference */}
          <input
            value={editing.reference}
            onChange={e => setEditing({ ...editing, reference: e.target.value })}
            placeholder="📖 Referência (ex: Gn 1–3)"
            style={{
              ...inputStyle, width: "auto", flex: 1, minWidth: 140,
              padding: "6px 10px", fontSize: 12,
            }}
          />
        </div>

        {/* Title — large like iPhone Notes */}
        <div style={{ padding: "16px 20px 0" }}>
          <input
            value={editing.title}
            onChange={e => setEditing({ ...editing, title: e.target.value })}
            placeholder="Título da anotação"
            style={{
              width: "100%", border: "none", outline: "none",
              background: "transparent", color: "#e8d8b8",
              fontSize: 22, fontWeight: 700, fontFamily: "inherit",
              padding: 0,
            }}
          />
        </div>

        {/* Date info */}
        <div style={{ padding: "6px 20px 0", fontSize: 11, color: "#5a4a38" }}>
          {fmtDate(editing.updatedAt)} às {fmtTime(editing.updatedAt)}
        </div>

        {/* Body — free-form textarea */}
        <div style={{ padding: "12px 20px 0" }}>
          <textarea
            ref={bodyRef}
            value={editing.body}
            onChange={e => setEditing({ ...editing, body: e.target.value })}
            placeholder="Comece a escrever suas anotações, reflexões, resumos de aula…"
            style={{
              width: "100%", border: "none", outline: "none",
              background: "transparent", color: "#d4c4a8",
              fontSize: 15, fontFamily: "inherit", lineHeight: 1.75,
              resize: "none", minHeight: "40vh", padding: 0,
            }}
          />
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 16px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7a60", fontWeight: 600, marginBottom: 4 }}>
            Caderno de Estudo
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#e8d8b8" }}>
            Anotações
          </div>
          {totalCount > 0 && (
            <div style={{ fontSize: 12, color: "#6a5a48", marginTop: 3 }}>
              {totalCount} {totalCount === 1 ? "nota" : "notas"}
            </div>
          )}
        </div>
        <button onClick={() => openNew()} style={{
          padding: "10px 18px", borderRadius: 12,
          border: "1px solid rgba(200,170,100,.4)",
          background: "linear-gradient(135deg,rgba(200,170,100,.18),rgba(180,140,80,.08))",
          color: "#C8A55C", fontSize: 14, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
        }}>
          ✏️ Nova
        </button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 16, position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6a5a48" }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar anotações…"
          style={{
            ...inputStyle,
            paddingLeft: 36,
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(200,180,140,.1)",
          }}
        />
      </div>

      {/* Week filter pills */}
      <div style={{ overflowX: "auto", display: "flex", gap: 6, marginBottom: 20, paddingBottom: 4 }}>
        <button onClick={() => setSelectedWeek(null)} style={{
          padding: "5px 14px", borderRadius: 16, whiteSpace: "nowrap", cursor: "pointer",
          fontSize: 12, fontWeight: selectedWeek === null ? 600 : 500, fontFamily: "inherit",
          border: `1px solid ${selectedWeek === null ? "rgba(200,170,100,.5)" : "rgba(200,180,140,.12)"}`,
          background: selectedWeek === null ? "rgba(200,170,100,.15)" : "rgba(255,255,255,.025)",
          color: selectedWeek === null ? "#e8d8b8" : "#7a6a58",
        }}>
          Todas
        </button>
        {WEEKS.map(w => {
          const count = notes.filter(n => n.week === w).length;
          const isActive = selectedWeek === w;
          return (
            <button key={w} onClick={() => setSelectedWeek(isActive ? null : w)} style={{
              padding: "5px 12px", borderRadius: 16, whiteSpace: "nowrap", cursor: "pointer",
              fontSize: 12, fontWeight: isActive ? 600 : 500, fontFamily: "inherit",
              border: `1px solid ${isActive ? "rgba(200,170,100,.5)" : "rgba(200,180,140,.12)"}`,
              background: isActive ? "rgba(200,170,100,.15)" : "rgba(255,255,255,.025)",
              color: isActive ? "#e8d8b8" : "#7a6a58",
              opacity: count === 0 && !isActive ? 0.4 : 1,
            }}>
              {w}{count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Empty */}
      {weekKeys.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px",
          border: "1px dashed rgba(200,180,140,.1)", borderRadius: 16, color: "#5a4a38",
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#8a7a60", marginBottom: 6 }}>
            {search ? "Nenhuma nota encontrada" : "Nenhuma anotação ainda"}
          </div>
          <div style={{ fontSize: 13, color: "#5a4a38", marginBottom: 18, lineHeight: 1.5 }}>
            {search
              ? "Tente buscar com outros termos."
              : "Crie sua primeira nota para registrar aprendizados e reflexões das aulas."}
          </div>
          {!search && (
            <button onClick={() => openNew()} style={{
              padding: "10px 24px", borderRadius: 12,
              border: "1px solid rgba(200,170,100,.3)",
              background: "rgba(200,170,100,.08)", color: "#C8A55C",
              fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
            }}>
              ✏️ Criar primeira nota
            </button>
          )}
        </div>
      ) : (
        /* Week groups */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {weekKeys.map(w => {
            const weekNotes = grouped[w];
            const collapsed = !!collapsedWeeks[w];
            const accent = ACCENT[(w - 1) % ACCENT.length];
            return (
              <div key={w}>
                {/* Week header — folder style */}
                <div
                  onClick={() => toggleCollapse(w)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    padding: "8px 0", marginBottom: collapsed ? 0 : 8,
                  }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: accent + "20", border: `1px solid ${accent}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: accent,
                  }}>
                    {w}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#d4c4a8" }}>
                      Semana {w}
                    </div>
                    <div style={{ fontSize: 11, color: "#5a4a38" }}>{WEEK_LABELS[w]}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "#6a5a48", marginRight: 4 }}>
                    {weekNotes.length} {weekNotes.length === 1 ? "nota" : "notas"}
                  </span>
                  <span style={{ fontSize: 14, color: "#6a5a48", transition: "transform .2s", transform: collapsed ? "rotate(-90deg)" : "rotate(0)" }}>
                    ▾
                  </span>
                </div>

                {!collapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {weekNotes.map((note, ni) => (
                      <div key={note.id}
                        onClick={() => setEditing(note)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 14px", cursor: "pointer",
                          background: "rgba(255,255,255,.02)",
                          borderRadius: 12,
                          borderLeft: `3px solid ${accent}50`,
                          transition: "background .15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600, color: "#e8d8b8",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {note.title || "Sem título"}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: "#5a4a38" }}>
                              {fmtDate(note.updatedAt)}
                            </span>
                            <span style={{
                              fontSize: 12, color: "#6a5a48",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              maxWidth: 180,
                            }}>
                              {preview(note.body)}
                            </span>
                          </div>
                          {note.reference && (
                            <span style={{
                              display: "inline-block", marginTop: 4,
                              fontSize: 11, fontWeight: 600, color: accent,
                              background: accent + "15", padding: "1px 8px", borderRadius: 5,
                              border: `1px solid ${accent}25`,
                            }}>
                              📖 {note.reference}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 14, color: "#4a4038", flexShrink: 0 }}>›</span>
                      </div>
                    ))}

                    {/* Add note to this week */}
                    <button onClick={() => openNew(w)} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 14px", cursor: "pointer",
                      background: "transparent", border: "1px dashed rgba(200,180,140,.1)",
                      borderRadius: 12, color: "#6a5a48", fontSize: 12,
                      fontFamily: "inherit", marginTop: 2,
                    }}>
                      <span style={{ fontSize: 14 }}>+</span> Adicionar nota na Semana {w}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteId && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: "#232018", border: "1px solid rgba(200,80,60,.2)",
            borderRadius: 16, padding: "24px 20px", maxWidth: 320, width: "100%", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#e8d8b8", marginBottom: 8 }}>Remover anotação?</div>
            <div style={{ fontSize: 13, color: "#7a6a58", marginBottom: 20 }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{
                flex: 1, padding: "10px", borderRadius: 10,
                border: "1px solid rgba(200,180,140,.15)",
                background: "rgba(200,180,140,.06)", color: "#a09078",
                cursor: "pointer", fontFamily: "inherit", fontSize: 14,
              }}>Cancelar</button>
              <button onClick={() => removeNote(deleteId)} style={{
                flex: 1, padding: "10px", borderRadius: 10,
                border: "1px solid rgba(200,80,60,.3)",
                background: "rgba(200,80,60,.12)", color: "#e07060",
                cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
              }}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
