import { useState, useEffect } from "react";

type Note = {
  id: string;
  title: string;
  reference: string;
  summary: string;
  createdAt: string;
};

const STORAGE_KEY = "bible-notes-2026";

const emptyForm = () => ({ title: "", reference: "", summary: "" });

export default function BibleNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      if (d) setNotes(JSON.parse(d));
    } catch {}
  }, []);

  const save = (updated: Note[]) => {
    setNotes(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const addNote = () => {
    if (!form.title.trim()) return;
    const note: Note = {
      id: `n-${Date.now()}`,
      title: form.title.trim(),
      reference: form.reference.trim(),
      summary: form.summary.trim(),
      createdAt: new Date().toISOString(),
    };
    save([note, ...notes]);
    setShowModal(false);
    setForm(emptyForm());
  };

  const removeNote = (id: string) => {
    save(notes.filter(n => n.id !== id));
    setDeleteId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(200,180,140,.15)",
    background: "rgba(255,255,255,.04)", color: "#e8d8b8",
    fontSize: 14, fontFamily: "inherit", outline: "none",
  };

  const ACCENT_COLORS = ["#C8A55C", "#6B8E6B", "#4A7C8C", "#a855f7", "#C8553D", "#6B5B8A", "#E88D67"];

  return (
    <div style={{ padding: "24px 16px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7a60", fontWeight: 600, marginBottom: 4 }}>
            Caderno de estudo
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#e8d8b8" }}>
            Minhas Anotações
          </div>
          {notes.length > 0 && (
            <div style={{ fontSize: 12, color: "#6a5a48", marginTop: 3 }}>
              {notes.length} {notes.length === 1 ? "anotação" : "anotações"} salvas
            </div>
          )}
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: "9px 16px", borderRadius: 12,
          border: "1px solid rgba(200,170,100,.4)",
          background: "linear-gradient(135deg,rgba(200,170,100,.15),rgba(180,140,80,.06))",
          color: "#C8A55C", fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
        }}>
          + Nova
        </button>
      </div>

      {/* Empty state */}
      {notes.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px",
          border: "1px dashed rgba(200,180,140,.12)", borderRadius: 16,
          color: "#5a4a38",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#8a7a60", marginBottom: 6 }}>
            Nenhuma anotação ainda
          </div>
          <div style={{ fontSize: 13, color: "#5a4a38", marginBottom: 16, lineHeight: 1.5 }}>
            Registre seus aprendizados, resumos de aulas e reflexões sobre as escrituras.
          </div>
          <button onClick={() => setShowModal(true)} style={{
            padding: "10px 22px", borderRadius: 12,
            border: "1px solid rgba(200,170,100,.3)",
            background: "rgba(200,170,100,.08)", color: "#C8A55C",
            fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
          }}>
            Criar primeira anotação
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notes.map((note, i) => {
            const isOpen = expandedId === note.id;
            const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
            return (
              <div key={note.id}
                onClick={() => setExpandedId(isOpen ? null : note.id)}
                style={{
                  background: "rgba(255,255,255,.025)",
                  border: `1px solid ${isOpen ? accent + "40" : "rgba(200,180,140,.08)"}`,
                  borderRadius: 14, padding: "18px 18px", cursor: "pointer",
                  position: "relative", overflow: "hidden", transition: "all .3s ease",
                }}>
                {/* Accent line */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg,${accent},transparent)`, opacity: 0.5,
                  borderRadius: "14px 14px 0 0",
                }} />

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d8b8", marginBottom: 4 }}>
                      {note.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {note.reference && (
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: accent,
                          background: accent + "18", padding: "2px 10px", borderRadius: 6,
                          border: `1px solid ${accent}30`,
                        }}>
                          📖 {note.reference}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "#5a4a38" }}>
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteId(note.id); }}
                      style={{
                        width: 26, height: 26, borderRadius: "50%",
                        border: "1px solid rgba(200,80,60,.2)", background: "rgba(200,80,60,.06)",
                        color: "#C8553D", cursor: "pointer", fontSize: 13,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>×</button>
                    <span style={{ fontSize: 16, color: "#6a5a48" }}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </div>
                </div>

                {isOpen && note.summary && (
                  <div style={{
                    marginTop: 12, paddingTop: 12,
                    borderTop: `1px solid ${accent}20`,
                    fontSize: 13.5, color: "#b0a090", lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}>
                    {note.summary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD MODAL ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.7)", display: "flex", alignItems: "flex-end",
          justifyContent: "center",
        }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setForm(emptyForm()); } }}>
          <div style={{
            width: "100%", maxWidth: 480,
            background: "linear-gradient(160deg,#232018,#1e1a14)",
            border: "1px solid rgba(200,180,140,.12)", borderRadius: "20px 20px 0 0",
            padding: "24px 20px 36px", maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: "#8a7a60", letterSpacing: 3, textTransform: "uppercase", fontWeight: 600 }}>
                  Nova anotação
                </div>
                <div style={{ fontSize: 15, color: "#c4b498", marginTop: 3 }}>
                  Registre seu estudo
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setForm(emptyForm()); }} style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "1px solid rgba(200,180,140,.15)",
                background: "rgba(200,180,140,.06)", color: "#a09078",
                cursor: "pointer", fontSize: 18,
              }}>×</button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Nome da aula / tema *
              </label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: A soberania de Deus em Jó" style={inputStyle} />
            </div>

            {/* Reference */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Referência bíblica (opcional)
              </label>
              <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                placeholder="Ex: Jó 1–5, Gn. 1:1" style={inputStyle} />
            </div>

            {/* Summary */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: "#8a7a60", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Resumo / anotações
              </label>
              <textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                placeholder="Escreva seus aprendizados, reflexões, pontos-chave da aula…"
                rows={5}
                style={{ ...inputStyle, resize: "vertical", minHeight: 100, lineHeight: 1.6 }} />
            </div>

            {/* Preview */}
            {form.title && (
              <div style={{
                marginBottom: 20, padding: "14px 16px", borderRadius: 12,
                background: "rgba(255,255,255,.025)", border: "1px solid rgba(200,180,140,.08)",
              }}>
                <div style={{ fontSize: 11, color: "#6a5a48", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Pré-visualização
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d8b8", marginBottom: 4 }}>
                  {form.title}
                </div>
                {form.reference && (
                  <span style={{
                    display: "inline-block", fontSize: 12, fontWeight: 600, color: "#C8A55C",
                    background: "rgba(200,165,92,.1)", padding: "2px 10px", borderRadius: 6,
                    border: "1px solid rgba(200,165,92,.2)", marginBottom: 6,
                  }}>
                    📖 {form.reference}
                  </span>
                )}
                {form.summary && (
                  <div style={{ fontSize: 13, color: "#b0a090", lineHeight: 1.5, marginTop: 4 }}>
                    {form.summary.length > 120 ? form.summary.slice(0, 120) + "…" : form.summary}
                  </div>
                )}
              </div>
            )}

            <button onClick={addNote} disabled={!form.title.trim()} style={{
              width: "100%", padding: "13px", borderRadius: 12,
              border: `1px solid ${form.title.trim() ? "rgba(200,170,100,.4)" : "rgba(200,180,140,.08)"}`,
              cursor: form.title.trim() ? "pointer" : "not-allowed",
              background: form.title.trim()
                ? "linear-gradient(135deg,rgba(200,170,100,.3),rgba(180,140,80,.15))"
                : "rgba(200,180,140,.05)",
              color: form.title.trim() ? "#e8d8b8" : "#5a4a38",
              fontSize: 15, fontWeight: 600, fontFamily: "inherit",
            }}>
              Salvar anotação
            </button>
          </div>
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
