import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
type Section = "proclamadores" | "aulas";

type Note = {
  id: string;
  title: string;
  reference: string;
  references: string[];
  body: string;
  week: number;
  section: Section;
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

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: "proclamadores", label: "Track Proclamadores", icon: "📢" },
  { key: "aulas", label: "Aulas", icon: "📚" },
];

const BIBLE_BOOKS = [
  "Gênesis","Êxodo","Levítico","Números","Deuteronômio","Josué","Juízes","Rute",
  "1 Samuel","2 Samuel","1 Reis","2 Reis","1 Crônicas","2 Crônicas","Esdras","Neemias",
  "Ester","Jó","Salmos","Provérbios","Eclesiastes","Cantares","Isaías","Jeremias",
  "Lamentações","Ezequiel","Daniel","Oséias","Joel","Amós","Obadias","Jonas",
  "Miquéias","Naum","Habacuque","Sofonias","Ageu","Zacarias","Malaquias",
  "Mateus","Marcos","Lucas","João","Atos","Romanos","1 Coríntios","2 Coríntios",
  "Gálatas","Efésios","Filipenses","Colossenses","1 Tessalonicenses","2 Tessalonicenses",
  "1 Timóteo","2 Timóteo","Tito","Filemom","Hebreus","Tiago","1 Pedro","2 Pedro",
  "1 João","2 João","3 João","Judas","Apocalipse",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function preview(text: string, len = 50) {
  const stripped = text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  if (!stripped.trim()) return "Sem conteúdo";
  return stripped.length > len ? stripped.slice(0, len) + "…" : stripped;
}

// ── Bible API fetch ──────────────────────────────────────────────────────────
async function fetchVerse(ref: string, version = "arc"): Promise<{ text: string; reference: string } | null> {
  try {
    // Use bible-api.com which supports pt
    const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${version}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.text) return { text: data.text.trim(), reference: data.reference || ref };
  } catch {}
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BibleNotes({ onTitleChange }: { onTitleChange?: (title: string) => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [verseOpen, setVerseOpen] = useState(false);
  const [verseQuery, setVerseQuery] = useState("");
  const [verseResult, setVerseResult] = useState<{ text: string; reference: string } | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [verseError, setVerseError] = useState(false);
  const [toast, setToast] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ title: string; content: string } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      if (d) {
        const parsed = JSON.parse(d);
        const migrated = (Array.isArray(parsed) ? parsed : []).map((n: any) => ({
          ...n,
          body: n.body ?? n.summary ?? "",
          week: n.week ?? 1,
          section: n.section ?? "aulas",
          references: n.references ?? (n.reference ? [n.reference] : []),
          updatedAt: n.updatedAt ?? n.createdAt,
        }));
        setNotes(migrated);
      }
    } catch {}
  }, []);

  const persist = useCallback((updated: Note[]) => {
    setNotes(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const currentNote = useMemo(() => notes.find(n => n.id === selectedNote) ?? null, [notes, selectedNote]);

  // Filter notes for sidebar
  const sidebarNotes = useMemo(() => {
    if (!activeSection) return notes;
    return notes.filter(n => n.section === activeSection);
  }, [notes, activeSection]);

  // Group sidebar notes by week
  const groupedSidebar = useMemo(() => {
    const map: Record<number, Note[]> = {};
    sidebarNotes.forEach(n => {
      if (!map[n.week]) map[n.week] = [];
      map[n.week].push(n);
    });
    // Sort within each week
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    return map;
  }, [sidebarNotes]);

  const weekKeys = Object.keys(groupedSidebar).map(Number).sort((a, b) => a - b);

  // ── Note operations ────────────────────────────────────────────────────────
  const createNote = useCallback((week?: number) => {
    const now = new Date().toISOString();
    const note: Note = {
      id: `n-${Date.now()}`,
      title: "",
      reference: "",
      references: [],
      body: "",
      week: week ?? 1,
      section: activeSection ?? "aulas",
      createdAt: now,
      updatedAt: now,
    };
    const updated = [note, ...notes];
    persist(updated);
    setSelectedNote(note.id);
    setTimeout(() => titleRef.current?.focus(), 100);
  }, [notes, activeSection, persist]);

  const updateNote = useCallback((id: string, changes: Partial<Note>) => {
    const updated = notes.map(n => n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n);
    persist(updated);
  }, [notes, persist]);

  const removeNote = useCallback((id: string) => {
    persist(notes.filter(n => n.id !== id));
    setDeleteId(null);
    if (selectedNote === id) setSelectedNote(null);
    showToast("Nota removida");
  }, [notes, selectedNote, persist, showToast]);

  // ── Editor commands ────────────────────────────────────────────────────────
  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  const setBlock = useCallback((tag: string) => {
    if (tag === "blockquote") {
      exec("formatBlock", "blockquote");
    } else {
      exec("formatBlock", tag);
    }
  }, [exec]);

  const setFontSize = useCallback((size: string) => {
    exec("fontSize", size);
  }, [exec]);

  // ── Verse lookup ───────────────────────────────────────────────────────────
  const doFetchVerse = useCallback(async () => {
    if (!verseQuery.trim()) return;
    setVerseLoading(true);
    setVerseError(false);
    setVerseResult(null);
    const result = await fetchVerse(verseQuery.trim());
    setVerseLoading(false);
    if (result) {
      setVerseResult(result);
    } else {
      setVerseError(true);
    }
  }, [verseQuery]);

  const insertVerseInEditor = useCallback(() => {
    if (!verseResult || !editorRef.current) return;
    const html = `<div class="verse-card-inline" contenteditable="false" style="background:linear-gradient(135deg,#221c10,#2a2215);border:1px solid #7a6230;border-left:3px solid #c9a84c;border-radius:8px;padding:14px 18px;margin:10px 0"><span style="font-size:11px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;display:block;margin-bottom:6px">${verseResult.reference}</span><span style="font-style:italic;color:#e8dfc4;line-height:1.7">${verseResult.text}</span></div><p><br></p>`;
    editorRef.current.focus();
    exec("insertHTML", html);
    // Also add to references
    if (currentNote && !currentNote.references.includes(verseResult.reference)) {
      updateNote(currentNote.id, { references: [...currentNote.references, verseResult.reference] });
    }
    showToast("Versículo inserido");
  }, [verseResult, exec, currentNote, updateNote, showToast]);

  const copyVerse = useCallback(() => {
    if (!verseResult) return;
    navigator.clipboard.writeText(`${verseResult.reference}\n${verseResult.text}`);
    showToast("Copiado!");
  }, [verseResult, showToast]);

  // ── Save editor content on blur ────────────────────────────────────────────
  const handleEditorBlur = useCallback(() => {
    if (currentNote && editorRef.current) {
      updateNote(currentNote.id, { body: editorRef.current.innerHTML });
    }
  }, [currentNote, updateNote]);

  // ── AI actions ─────────────────────────────────────────────────────────────
  const callAI = useCallback(async (action: "summarize" | "questions" | "organize") => {
    setAiLoading(action);
    setAiResult(null);
    try {
      const body: Record<string, any> = { action };
      if (action === "organize") {
        body.allNotes = notes.map(n => ({ title: n.title, body: n.body, week: n.week, section: n.section }));
      } else if (currentNote) {
        body.noteTitle = currentNote.title || "Sem título";
        body.noteBody = currentNote.body;
      } else {
        showToast("Selecione uma nota primeiro");
        setAiLoading(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke("notes-ai", { body });

      if (error) {
        showToast("Erro ao chamar IA");
        setAiLoading(null);
        return;
      }

      if (data?.error) {
        showToast(data.error);
        setAiLoading(null);
        return;
      }

      const titles: Record<string, string> = {
        summarize: "📋 Resumo da Nota",
        questions: "❓ Perguntas de Estudo",
        organize: "🗂️ Organização Sugerida",
      };

      setAiResult({ title: titles[action], content: data.result });
    } catch (e) {
      showToast("Erro de conexão com a IA");
    }
    setAiLoading(null);
  }, [notes, currentNote, showToast]);


  if (!activeSection) {
    return (
      <div style={{ padding: "24px 16px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7a60", fontWeight: 600, marginBottom: 4 }}>
            Caderno de Estudo
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#e8d8b8" }}>Anotações</div>
          {notes.length > 0 && (
            <div style={{ fontSize: 12, color: "#6a5a48", marginTop: 3 }}>
              {notes.length} {notes.length === 1 ? "nota" : "notas"} no total
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SECTIONS.map(s => {
            const count = notes.filter(n => n.section === s.key).length;
            return (
              <div key={s.key}
                onClick={() => { setActiveSection(s.key); setSelectedNote(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "20px 18px", borderRadius: 16, cursor: "pointer",
                  background: "rgba(255,255,255,.025)",
                  border: "1px solid rgba(200,180,140,.08)",
                  transition: "all .2s", position: "relative", overflow: "hidden",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.025)")}
              >
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: "linear-gradient(90deg,#c9a84c,transparent)", opacity: 0.4,
                }} />
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: "rgba(200,170,100,.1)", border: "1px solid rgba(200,170,100,.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                }}>
                  {s.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: "#e8d8b8" }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: "#c9a84c", marginTop: 4, fontWeight: 600 }}>
                    {count} {count === 1 ? "nota" : "notas"}
                  </div>
                </div>
                <span style={{ fontSize: 20, color: "#5a4a38" }}>›</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Main notes UI with sidebar + editor ───────────────────────────────────
  const sectionMeta = SECTIONS.find(s => s.key === activeSection)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "70vh" }}>
      {/* Back + Section tabs */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        borderBottom: "1px solid rgba(200,180,140,.1)",
      }}>
        <button onClick={() => { setActiveSection(null); setSelectedNote(null); }} style={{
          padding: "6px 12px", borderRadius: 8,
          border: "1px solid rgba(200,170,100,.3)",
          background: "rgba(200,170,100,.06)", color: "#c9a84c",
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          ‹ Seções
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => { setActiveSection(s.key); setSelectedNote(null); }} style={{
              padding: "6px 14px", borderRadius: 16,
              border: `1px solid ${activeSection === s.key ? "rgba(200,170,100,.5)" : "transparent"}`,
              background: activeSection === s.key ? "rgba(200,170,100,.15)" : "transparent",
              color: activeSection === s.key ? "#e8c97a" : "#8a7d5e",
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        {/* Mobile sidebar toggle */}
        <button onClick={() => setShowSidebar(!showSidebar)} style={{
          marginLeft: "auto", padding: "6px 10px", borderRadius: 8,
          border: "1px solid rgba(200,180,140,.15)", background: "rgba(200,180,140,.04)",
          color: "#8a7d5e", fontSize: 14, cursor: "pointer", display: "none",
        }}
          className="sidebar-toggle"
        >
          ☰
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, gap: 0 }}>
        {/* ── SIDEBAR ── */}
        {showSidebar && (
          <div style={{
            width: 260, flexShrink: 0,
            borderRight: "1px solid rgba(200,180,140,.12)",
            padding: "16px 0",
            display: "flex", flexDirection: "column",
            overflowY: "auto", maxHeight: "65vh",
          }}>
            <div style={{
              padding: "0 16px 12px",
              fontSize: 10, letterSpacing: 3, color: "#7a6230",
              textTransform: "uppercase", fontWeight: 600,
              borderBottom: "1px solid rgba(200,180,140,.1)",
              marginBottom: 6,
            }}>
              Minhas notas
            </div>

            {/* Notes list by week */}
            {weekKeys.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", color: "#5a4a38", fontSize: 13 }}>
                Nenhuma nota ainda
              </div>
            ) : (
              weekKeys.map(w => (
                <div key={w}>
                  <div style={{
                    padding: "8px 16px 4px", fontSize: 10, letterSpacing: 2,
                    color: "#7a6230", textTransform: "uppercase", fontWeight: 600,
                  }}>
                    Sem. {w} — {WEEK_LABELS[w]}
                  </div>
                  {groupedSidebar[w].map(note => (
                    <div key={note.id}
                      onClick={() => {
                        setSelectedNote(note.id);
                        // Load content into editor after render
                        setTimeout(() => {
                          if (editorRef.current) editorRef.current.innerHTML = note.body || "";
                        }, 50);
                      }}
                      style={{
                        margin: "0 10px", padding: "10px 12px",
                        borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${selectedNote === note.id ? "#7a6230" : "transparent"}`,
                        background: selectedNote === note.id ? "rgba(42,34,21,.8)" : "transparent",
                        transition: "all .15s",
                      }}
                      onMouseEnter={e => { if (selectedNote !== note.id) e.currentTarget.style.background = "rgba(34,28,16,.6)"; }}
                      onMouseLeave={e => { if (selectedNote !== note.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        fontSize: 13, color: "#e8c97a", fontWeight: 500,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {note.title || "Sem título"}
                      </div>
                      <div style={{ fontSize: 11, color: "#8a7d5e", marginTop: 2 }}>
                        {preview(note.body, 35)}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}

            <button onClick={() => createNote()} style={{
              margin: "12px 10px 0", padding: "9px 14px",
              background: "rgba(201,168,76,.1)", border: "1px dashed #7a6230",
              borderRadius: 8, color: "#c9a84c", fontSize: 13,
              cursor: "pointer", fontFamily: "inherit", textAlign: "center",
            }}>
              ＋ Nova anotação
            </button>
          </div>
        )}

        {/* ── EDITOR AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px", minWidth: 0 }}>
          {!currentNote ? (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", color: "#5a4a38",
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#8a7d5e", marginBottom: 8 }}>
                Selecione ou crie uma nota
              </div>
              <button onClick={() => createNote()} style={{
                padding: "10px 24px", borderRadius: 12,
                border: "1px solid rgba(200,170,100,.3)",
                background: "rgba(200,170,100,.08)", color: "#c9a84c",
                fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
              }}>
                ✏️ Criar nota
              </button>
            </div>
          ) : (
            <>
              {/* Title input */}
              <input
                ref={titleRef}
                value={currentNote.title}
                onChange={e => updateNote(currentNote.id, { title: e.target.value })}
                placeholder="Título da anotação"
                style={{
                  background: "transparent", border: "none",
                  borderBottom: "1px solid rgba(200,180,140,.15)",
                  color: "#e8c97a", fontSize: 22, fontWeight: 400,
                  padding: "0 0 10px", width: "100%", outline: "none",
                  fontFamily: "inherit", letterSpacing: 0.5,
                }}
              />

              {/* Meta row */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                marginTop: 8, marginBottom: 14, flexWrap: "wrap",
              }}>
                <select
                  value={currentNote.section}
                  onChange={e => updateNote(currentNote.id, { section: e.target.value as Section })}
                  style={{
                    background: "rgba(34,28,16,.8)", border: "1px solid rgba(200,180,140,.15)",
                    borderRadius: 6, color: "#8a7d5e", fontSize: 12,
                    padding: "5px 10px", fontFamily: "inherit", outline: "none",
                  }}
                >
                  {SECTIONS.map(s => (
                    <option key={s.key} value={s.key} style={{ background: "#1a160d" }}>
                      {s.icon} {s.label}
                    </option>
                  ))}
                </select>

                <select
                  value={currentNote.week}
                  onChange={e => updateNote(currentNote.id, { week: Number(e.target.value) })}
                  style={{
                    background: "rgba(34,28,16,.8)", border: "1px solid rgba(200,180,140,.15)",
                    borderRadius: 6, color: "#8a7d5e", fontSize: 12,
                    padding: "5px 10px", fontFamily: "inherit", outline: "none",
                  }}
                >
                  {WEEKS.map(w => (
                    <option key={w} value={w} style={{ background: "#1a160d" }}>
                      Sem. {w} — {WEEK_LABELS[w]}
                    </option>
                  ))}
                </select>

                <span style={{ fontSize: 12, color: "#8a7d5e", marginLeft: "auto" }}>
                  {fmtDate(currentNote.updatedAt)}
                </span>
              </div>

              {/* References tags */}
              {currentNote.references.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {currentNote.references.map((ref, i) => (
                    <span key={i} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 6,
                      background: "rgba(200,170,100,.1)", border: "1px solid rgba(200,170,100,.2)",
                      color: "#c9a84c", fontSize: 11, fontWeight: 600,
                    }}>
                      📖 {ref}
                      <button onClick={() => {
                        updateNote(currentNote.id, { references: currentNote.references.filter((_, idx) => idx !== i) });
                      }} style={{
                        background: "none", border: "none", color: "#7a6230",
                        cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1,
                      }}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* ── TOOLBAR ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
                padding: "8px 10px",
                background: "rgba(26,22,13,.8)",
                border: "1px solid rgba(200,180,140,.15)",
                borderRadius: "10px 10px 0 0",
              }}>
                {/* Block type */}
                <select onChange={e => setBlock(e.target.value)} defaultValue="p" style={{
                  height: 30, padding: "0 8px",
                  background: "rgba(34,28,16,.8)", border: "1px solid rgba(200,180,140,.15)",
                  borderRadius: 5, color: "#8a7d5e", fontSize: 12,
                  fontFamily: "inherit", cursor: "pointer", outline: "none",
                }}>
                  <option value="p">Parágrafo</option>
                  <option value="h1">Título</option>
                  <option value="h2">Subtítulo</option>
                  <option value="h3">Seção</option>
                  <option value="blockquote">Citação</option>
                </select>

                {/* Font size */}
                <select onChange={e => setFontSize(e.target.value)} defaultValue="3" style={{
                  height: 30, padding: "0 8px",
                  background: "rgba(34,28,16,.8)", border: "1px solid rgba(200,180,140,.15)",
                  borderRadius: 5, color: "#8a7d5e", fontSize: 12,
                  fontFamily: "inherit", cursor: "pointer", outline: "none",
                }}>
                  <option value="1">Pequeno</option>
                  <option value="3">Normal</option>
                  <option value="4">Médio</option>
                  <option value="5">Grande</option>
                  <option value="7">Enorme</option>
                </select>

                <div style={{ width: 1, height: 20, background: "rgba(200,180,140,.15)", margin: "0 4px" }} />

                {/* Format buttons */}
                {[
                  { cmd: "bold", label: "N", title: "Negrito" },
                  { cmd: "italic", label: "I", title: "Itálico" },
                  { cmd: "strikeThrough", label: "S", title: "Tachado" },
                  { cmd: "underline", label: "T", title: "Sublinhado" },
                ].map(b => (
                  <button key={b.cmd} onClick={() => exec(b.cmd)} title={b.title} style={{
                    width: 30, height: 30, border: "none", borderRadius: 5,
                    background: "transparent", color: "#8a7d5e", cursor: "pointer",
                    fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(42,34,21,.8)"; e.currentTarget.style.color = "#e8c97a"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8a7d5e"; }}
                  >
                    {b.label === "I" ? <em>{b.label}</em> : b.label === "S" ? <s>{b.label}</s> : b.label === "T" ? <u>{b.label}</u> : b.label}
                  </button>
                ))}

                <div style={{ width: 1, height: 20, background: "rgba(200,180,140,.15)", margin: "0 4px" }} />

                {/* List buttons */}
                {[
                  { cmd: "insertUnorderedList", label: "≡" },
                  { cmd: "insertOrderedList", label: "①" },
                  { cmd: "indent", label: "→" },
                  { cmd: "outdent", label: "←" },
                ].map(b => (
                  <button key={b.cmd} onClick={() => exec(b.cmd)} style={{
                    width: 30, height: 30, border: "none", borderRadius: 5,
                    background: "transparent", color: "#8a7d5e", cursor: "pointer",
                    fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(42,34,21,.8)"; e.currentTarget.style.color = "#e8c97a"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8a7d5e"; }}
                  >
                    {b.label}
                  </button>
                ))}

                <div style={{ width: 1, height: 20, background: "rgba(200,180,140,.15)", margin: "0 4px" }} />

                {/* Alignment */}
                {[
                  { cmd: "justifyLeft", label: "⬅" },
                  { cmd: "justifyCenter", label: "↔" },
                  { cmd: "justifyRight", label: "➡" },
                ].map(b => (
                  <button key={b.cmd} onClick={() => exec(b.cmd)} style={{
                    width: 30, height: 30, border: "none", borderRadius: 5,
                    background: "transparent", color: "#8a7d5e", cursor: "pointer",
                    fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(42,34,21,.8)"; e.currentTarget.style.color = "#e8c97a"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8a7d5e"; }}
                  >
                    {b.label}
                  </button>
                ))}

                <div style={{ width: 1, height: 20, background: "rgba(200,180,140,.15)", margin: "0 4px" }} />

                {/* Undo/Redo */}
                <button onClick={() => exec("undo")} style={{
                  width: 30, height: 30, border: "none", borderRadius: 5,
                  background: "transparent", color: "#8a7d5e", cursor: "pointer",
                  fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(42,34,21,.8)"; e.currentTarget.style.color = "#e8c97a"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8a7d5e"; }}
                >↩</button>
                <button onClick={() => exec("redo")} style={{
                  width: 30, height: 30, border: "none", borderRadius: 5,
                  background: "transparent", color: "#8a7d5e", cursor: "pointer",
                  fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(42,34,21,.8)"; e.currentTarget.style.color = "#e8c97a"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8a7d5e"; }}
                >↪</button>

                {/* Delete note */}
                <button onClick={() => setDeleteId(currentNote.id)} style={{
                  marginLeft: "auto", width: 30, height: 30, border: "none", borderRadius: 5,
                  background: "transparent", color: "#8a5a4a", cursor: "pointer",
                  fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,80,60,.1)"; e.currentTarget.style.color = "#C8553D"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8a5a4a"; }}
                  title="Remover nota"
                >🗑️</button>
              </div>

              {/* ── AI ACTIONS BAR ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                padding: "8px 10px",
                background: "rgba(26,22,13,.6)",
                borderLeft: "1px solid rgba(200,180,140,.15)",
                borderRight: "1px solid rgba(200,180,140,.15)",
              }}>
                <span style={{ fontSize: 10, letterSpacing: 2, color: "#7a6230", textTransform: "uppercase", fontWeight: 600, marginRight: 4 }}>
                  🤖 IA
                </span>
                {[
                  { action: "summarize" as const, label: "📋 Resumir", tip: "Gera um resumo da nota" },
                  { action: "questions" as const, label: "❓ Perguntas", tip: "Gera perguntas de estudo" },
                  { action: "organize" as const, label: "🗂️ Organizar", tip: "Sugere organização de todas as notas" },
                ].map(ai => (
                  <button
                    key={ai.action}
                    onClick={() => callAI(ai.action)}
                    disabled={!!aiLoading}
                    title={ai.tip}
                    style={{
                      padding: "5px 12px", borderRadius: 6,
                      border: "1px solid rgba(200,170,100,.25)",
                      background: aiLoading === ai.action ? "rgba(200,170,100,.2)" : "rgba(200,170,100,.06)",
                      color: aiLoading === ai.action ? "#e8c97a" : "#c9a84c",
                      fontSize: 12, fontWeight: 600, cursor: aiLoading ? "wait" : "pointer",
                      fontFamily: "inherit", opacity: aiLoading && aiLoading !== ai.action ? 0.5 : 1,
                      transition: "all .2s",
                    }}
                  >
                    {aiLoading === ai.action ? "⏳ Processando..." : ai.label}
                  </button>
                ))}
              </div>

              {/* ── EDITOR (contentEditable) ── */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Comece a escrever suas anotações, reflexões, resumos de aula…"
                onBlur={handleEditorBlur}
                dangerouslySetInnerHTML={{ __html: currentNote.body }}
                style={{
                  flex: 1,
                  background: "rgba(26,22,13,.6)",
                  border: "1px solid rgba(200,180,140,.15)",
                  borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                  padding: 24,
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: 17,
                  lineHeight: 1.8,
                  color: "#e8dfc4",
                  minHeight: 280,
                  overflowY: "auto",
                }}
              />

              {/* ── VERSE LOOKUP PANEL ── */}
              <div style={{
                marginTop: 20,
                background: "rgba(26,22,13,.6)",
                border: "1px solid rgba(200,180,140,.15)",
                borderRadius: 10,
                overflow: "hidden",
              }}>
                <div onClick={() => setVerseOpen(!verseOpen)} style={{
                  padding: "12px 18px",
                  background: "rgba(34,28,16,.8)",
                  borderBottom: verseOpen ? "1px solid rgba(200,180,140,.15)" : "none",
                  display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer", userSelect: "none",
                }}>
                  <span style={{
                    fontSize: 11, letterSpacing: 2, color: "#c9a84c",
                    textTransform: "uppercase", fontWeight: 600, flex: 1,
                  }}>
                    🔖 Buscar versículo da Bíblia
                  </span>
                  <span style={{
                    color: "#7a6230", fontSize: 12,
                    transform: verseOpen ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform .2s",
                  }}>
                    ▼
                  </span>
                </div>

                {verseOpen && (
                  <div style={{ padding: "16px 18px" }}>
                    {/* Search */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      <input
                        value={verseQuery}
                        onChange={e => setVerseQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") doFetchVerse(); }}
                        placeholder='Ex: "Rm 8:28", "Ef 2:8-9", "João 3:16"'
                        style={{
                          flex: 1,
                          background: "rgba(34,28,16,.8)",
                          border: "1px solid rgba(200,180,140,.15)",
                          borderRadius: 6, color: "#e8dfc4",
                          fontSize: 15, padding: "8px 14px",
                          fontFamily: "inherit", outline: "none",
                        }}
                      />
                      <button
                        onClick={doFetchVerse}
                        disabled={!verseQuery.trim() || verseLoading}
                        style={{
                          padding: "8px 18px",
                          background: "rgba(201,168,76,.1)",
                          border: "1px solid #7a6230",
                          borderRadius: 6, color: "#c9a84c",
                          fontSize: 11, letterSpacing: 1,
                          cursor: verseQuery.trim() && !verseLoading ? "pointer" : "default",
                          fontFamily: "inherit", whiteSpace: "nowrap",
                          opacity: verseQuery.trim() && !verseLoading ? 1 : 0.5,
                        }}
                      >
                        Buscar
                      </button>
                    </div>

                    <div style={{ fontSize: 12, color: "#8a7d5e", fontStyle: "italic", marginBottom: 10 }}>
                      Escreva o livro, capítulo e versículo. Ex: "Rm 8:28", "Ef 2:8-9"
                    </div>

                    {/* Loading */}
                    {verseLoading && (
                      <div style={{ color: "#7a6230", fontSize: 13, fontStyle: "italic" }}>
                        Buscando versículo...
                      </div>
                    )}

                    {/* Error */}
                    {verseError && (
                      <div style={{ color: "#c26b5a", fontSize: 13 }}>
                        Não foi possível encontrar o versículo. Verifique a referência.
                      </div>
                    )}

                    {/* Result */}
                    {verseResult && (
                      <div style={{
                        background: "rgba(34,28,16,.8)",
                        border: "1px solid rgba(200,180,140,.15)",
                        borderLeft: "3px solid #c9a84c",
                        borderRadius: 8, padding: "14px 16px",
                      }}>
                        <div style={{
                          fontSize: 11, letterSpacing: 2, color: "#c9a84c",
                          marginBottom: 8, textTransform: "uppercase", fontWeight: 600,
                        }}>
                          {verseResult.reference}
                        </div>
                        <div style={{
                          fontSize: 16, lineHeight: 1.7,
                          color: "#e8dfc4", fontStyle: "italic",
                        }}>
                          {verseResult.text}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button onClick={insertVerseInEditor} style={{
                            padding: "6px 14px",
                            background: "rgba(201,168,76,.1)",
                            border: "1px solid #7a6230",
                            borderRadius: 5, color: "#c9a84c",
                            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                          }}>
                            ＋ Inserir na nota
                          </button>
                          <button onClick={copyVerse} style={{
                            padding: "6px 14px",
                            background: "transparent",
                            border: "1px solid rgba(200,180,140,.15)",
                            borderRadius: 5, color: "#8a7d5e",
                            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                          }}>
                            📋 Copiar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── AI RESULT MODAL ── */}
      {aiResult && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}
          onClick={e => { if (e.target === e.currentTarget) setAiResult(null); }}
        >
          <div style={{
            background: "linear-gradient(160deg,#232018,#1e1a14)",
            border: "1px solid rgba(200,170,100,.25)",
            borderRadius: 16, padding: "24px 20px", maxWidth: 520, width: "100%",
            maxHeight: "80vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#e8c97a" }}>{aiResult.title}</div>
              <button onClick={() => setAiResult(null)} style={{
                width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(200,180,140,.15)",
                background: "rgba(200,180,140,.06)", color: "#a09078", cursor: "pointer", fontSize: 18,
              }}>×</button>
            </div>
            <div style={{
              fontSize: 15, lineHeight: 1.8, color: "#e8dfc4",
              whiteSpace: "pre-wrap", fontFamily: "inherit",
            }}>
              {aiResult.content}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => {
                navigator.clipboard.writeText(aiResult.content);
                showToast("Copiado!");
              }} style={{
                padding: "8px 18px", borderRadius: 8,
                border: "1px solid rgba(200,180,140,.2)",
                background: "rgba(200,180,140,.06)", color: "#c9a84c",
                fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>
                📋 Copiar texto
              </button>
              {currentNote && aiResult.title.includes("Resumo") && (
                <button onClick={() => {
                  if (editorRef.current) {
                    const html = `<div style="background:rgba(200,170,100,.08);border:1px solid rgba(200,170,100,.2);border-left:3px solid #c9a84c;border-radius:8px;padding:14px 18px;margin:10px 0"><span style="font-size:11px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;display:block;margin-bottom:6px">📋 Resumo gerado por IA</span><span style="color:#e8dfc4;line-height:1.7;white-space:pre-wrap">${aiResult.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span></div><p><br></p>`;
                    editorRef.current.focus();
                    document.execCommand("insertHTML", false, html);
                    handleEditorBlur();
                    showToast("Resumo inserido na nota");
                  }
                  setAiResult(null);
                }} style={{
                  padding: "8px 18px", borderRadius: 8,
                  border: "1px solid rgba(200,170,100,.3)",
                  background: "rgba(200,170,100,.12)", color: "#e8c97a",
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                }}>
                  ✏️ Inserir na nota
                </button>
              )}
            </div>
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
            background: "#1e1a14", border: "1px solid rgba(200,80,60,.2)",
            borderRadius: 16, padding: "24px 20px", maxWidth: 320, width: "100%", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#e8dfc4", marginBottom: 8 }}>Remover anotação?</div>
            <div style={{ fontSize: 13, color: "#8a7d5e", marginBottom: 20 }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{
                flex: 1, padding: "10px", borderRadius: 10,
                border: "1px solid rgba(200,180,140,.15)",
                background: "rgba(200,180,140,.06)", color: "#8a7d5e",
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

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(42,34,21,.95)", border: "1px solid #7a6230",
          borderRadius: 8, padding: "10px 20px",
          color: "#e8c97a", fontSize: 14, fontFamily: "inherit",
          zIndex: 999,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
