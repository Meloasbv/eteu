import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

// ── Types ─────────────────────────────────────────────────────────────────────
type Section = "proclamadores" | "aulas" | "pensamentos" | "devocionais";

type Note = {
  id: number;
  categoria: Section;
  semana: string;
  texto: string;
  criadoEm: string;
  atualizadoEm: string;
};

const STORAGE_KEY = "bible-notes-2026";
const WEEKS_LIST = [
  "Sem. 1 — 24/01–30/01", "Sem. 2 — 31/01–06/02", "Sem. 3 — 07/02–13/02",
  "Sem. 4 — 14/02–20/02", "Sem. 5 — 21/02–27/02", "Sem. 6 — 28/02–06/03",
  "Sem. 7 — 07/03–13/03", "Sem. 8 — 14/03–20/03", "Sem. 9 — 21/03–27/03",
  "Sem. 10 — 28/03–03/04", "Sem. 11 — 04/04–10/04", "Sem. 12 — 11/04–17/04",
  "Sem. 13 — 18/04–24/04", "Sem. 14 — 25/04–01/05", "Sem. 15 — 02/05–08/05",
  "Sem. 16 — 09/05–15/05", "Sem. 17 — 16/05–22/05", "Sem. 18 — 23/05–29/05",
];

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: "proclamadores", label: "Track Proclamadores", icon: "📢" },
  { key: "aulas", label: "Aulas", icon: "📚" },
  { key: "pensamentos", label: "Pensamentos", icon: "💭" },
  { key: "devocionais", label: "Devocionais", icon: "🔥" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function noteTitle(texto: string) {
  const first = texto.split("\n")[0]?.trim().replace(/^#{1,3}\s*/, "");
  return first || "Sem título";
}
function notePreview(texto: string, len = 60) {
  const lines = texto.split("\n").filter(l => l.trim());
  const second = lines[1]?.trim().replace(/^#{1,3}\s*/, "") || "";
  if (!second) return "Sem conteúdo";
  return second.length > len ? second.slice(0, len) + "…" : second;
}

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]}. de ${d.getFullYear()}`;
}

function formatDateFull(iso: string) {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} de ${MONTHS_FULL[d.getMonth()]} de ${d.getFullYear()} às ${h}:${m}`;
}

// Simple markdown to HTML
function renderMarkdown(text: string): string {
  return text
    .split("\n")
    .map(line => {
      if (line.startsWith("### ")) return `<h4 style="font-family:'Cinzel',serif;font-size:14px;color:var(--notes-accent);margin:14px 0 4px;font-weight:500;">${line.slice(4)}</h4>`;
      if (line.startsWith("## ")) return `<h3 style="font-family:'Cinzel',serif;font-size:16px;color:var(--notes-accent);margin:18px 0 6px;font-weight:500;">${line.slice(3)}</h3>`;
      if (line.startsWith("# ")) return `<h2 style="font-family:'Cinzel',serif;font-size:18px;color:var(--notes-accent);margin:20px 0 8px;font-weight:500;">${line.slice(2)}</h2>`;
      if (/^-{3,}$/.test(line.trim())) return `<hr style="border:none;border-top:1px solid var(--notes-border);margin:12px 0;" />`;
      if (line.startsWith("- ")) {
        const content = applyInline(line.slice(2));
        return `<div style="display:flex;gap:8px;margin:3px 0;"><span style="color:var(--notes-accent);flex-shrink:0;">•</span><span>${content}</span></div>`;
      }
      if (!line.trim()) return `<br/>`;
      return `<p style="margin:2px 0;">${applyInline(line)}</p>`;
    })
    .join("");
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--notes-text);font-weight:700;">$1</strong>')
    .replace(/_(.+?)_/g, '<em style="font-style:italic;">$1</em>')
    .replace(/\[([^\]]+)\]/g, '<span style="color:var(--notes-accent);font-style:italic;">[$1]</span>');
}

// ── Bible API fetch ──────────────────────────────────────────────────────────
const ABBREV_MAP: Record<string, string> = {
  gn: "Gênesis", ex: "Êxodo", lv: "Levítico", nm: "Números", dt: "Deuteronômio",
  js: "Josué", jz: "Juízes", rt: "Rute", "1sm": "1 Samuel", "2sm": "2 Samuel",
  "1rs": "1 Reis", "2rs": "2 Reis", "1cr": "1 Crônicas", "2cr": "2 Crônicas",
  ed: "Esdras", ne: "Neemias", et: "Ester", jó: "Jó", sl: "Salmos",
  pv: "Provérbios", ec: "Eclesiastes", ct: "Cânticos", is: "Isaías",
  jr: "Jeremias", lm: "Lamentações", ez: "Ezequiel", dn: "Daniel",
  os: "Oséias", jl: "Joel", am: "Amós", ob: "Obadias", jn: "Jonas",
  mq: "Miquéias", na: "Naum", hc: "Habacuque", sf: "Sofonias", ag: "Ageu",
  zc: "Zacarias", ml: "Malaquias",
  mt: "Mateus", mc: "Marcos", lc: "Lucas", jo: "João",
  at: "Atos", rm: "Romanos", "1co": "1 Coríntios", "2co": "2 Coríntios",
  gl: "Gálatas", ef: "Efésios", fp: "Filipenses", cl: "Colossenses",
  "1ts": "1 Tessalonicenses", "2ts": "2 Tessalonicenses",
  "1tm": "1 Timóteo", "2tm": "2 Timóteo", tt: "Tito", fm: "Filemom",
  hb: "Hebreus", tg: "Tiago", "1pe": "1 Pedro", "2pe": "2 Pedro",
  "1jo": "1 João", "2jo": "2 João", "3jo": "3 João", jd: "Judas", ap: "Apocalipse",
};

function expandAbbrev(ref: string): string {
  const match = ref.match(/^(\d?\s*[a-záàâãéêíóôõúç]+)\s*(\d.*)$/i);
  if (!match) return ref;
  const bookPart = match[1].trim().toLowerCase().replace(/\s+/g, "");
  const rest = match[2];
  const full = ABBREV_MAP[bookPart];
  return full ? `${full} ${rest}` : ref;
}

async function fetchVerse(ref: string, version = "almeida"): Promise<{ text: string; reference: string } | null> {
  const expanded = expandAbbrev(ref);
  try {
    const url = `https://bible-api.com/${encodeURIComponent(expanded)}?translation=${version}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.text) return { text: data.text.trim(), reference: data.reference || expanded };
  } catch {}
  return null;
}

// ── CSS variable helper ──────────────────────────────────────────────────────
const v = (name: string) => `var(--notes-${name})`;
const transition = "0.3s cubic-bezier(.4,0,.2,1)";

// ── Component ─────────────────────────────────────────────────────────────────
export default function BibleNotes({ onTitleChange }: { onTitleChange?: (title: string) => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [toast, setToast] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "typing" | "saved">("idle");
  const [previewMode, setPreviewMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Verse sheet
  const [verseOpen, setVerseOpen] = useState(false);
  const [verseQuery, setVerseQuery] = useState("");
  const [verseTranslation, setVerseTranslation] = useState("almeida");
  const [verseResult, setVerseResult] = useState<{ text: string; reference: string } | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [verseError, setVerseError] = useState(false);

  // AI
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ title: string; content: string } | null>(null);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const editingNoteRef = useRef<Note | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes
  useEffect(() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      if (d) {
        const parsed = JSON.parse(d);
        if (Array.isArray(parsed)) {
          const migrated: Note[] = parsed.map((n: any) => ({
            id: n.id ? (typeof n.id === "number" ? n.id : Date.now() + Math.random()) : Date.now() + Math.random(),
            categoria: n.categoria || n.section || "aulas",
            semana: n.semana || `Sem. ${n.week || 1} — ${n.week ? "" : ""}`,
            texto: n.texto || n.body?.replace(/<[^>]*>/g, "") || `${n.title || ""}\n${n.summary || n.body?.replace(/<[^>]*>/g, "") || ""}`.trim(),
            criadoEm: n.criadoEm || n.createdAt || new Date().toISOString(),
            atualizadoEm: n.atualizadoEm || n.updatedAt || new Date().toISOString(),
          }));
          setNotes(migrated);
        }
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

  // Report title to parent
  useEffect(() => {
    if (!onTitleChange) return;
    if (editingNote) {
      const title = noteTitle(editingNote.texto);
      const shortTitle = title.length > 25 ? title.slice(0, 25) + "…" : title;
      onTitleChange(shortTitle || "Nova anotação");
    } else if (activeSection) {
      const sec = SECTIONS.find(s => s.key === activeSection);
      onTitleChange(`${sec?.icon ?? "📝"} ${sec?.label ?? "Anotações"}`);
    } else {
      onTitleChange("📝 Anotações");
    }
  }, [activeSection, editingNote, onTitleChange]);

  // Filtered notes
  const sectionNotes = useMemo(() => {
    if (!activeSection) return [];
    return notes.filter(n => n.categoria === activeSection)
      .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime());
  }, [notes, activeSection]);

  // ── Note operations ────────────────────────────────────────────────────────
  const createNote = useCallback(() => {
    const now = new Date().toISOString();
    const note: Note = {
      id: Date.now(),
      categoria: activeSection || "aulas",
      semana: WEEKS_LIST[0],
      texto: "",
      criadoEm: now,
      atualizadoEm: now,
    };
    const updated = [note, ...notes];
    persist(updated);
    setEditingNote(note);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [notes, activeSection, persist]);

  const saveNote = useCallback((note: Note) => {
    const updated = notes.map(n => n.id === note.id ? { ...note, atualizadoEm: new Date().toISOString() } : n);
    persist(updated);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  }, [notes, persist]);

  const deleteNote = useCallback((id: number) => {
    persist(notes.filter(n => n.id !== id));
    if (editingNote?.id === id) setEditingNote(null);
    showToast("Nota removida");
    setMenuOpen(false);
  }, [notes, editingNote, persist, showToast]);

  const handleTextChange = useCallback((text: string) => {
    if (!editingNote) return;
    const updated = { ...editingNote, texto: text };
    setEditingNote(updated);
    setSaveStatus("typing");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(updated), 800);
  }, [editingNote, saveNote]);

  const closeEditor = useCallback(() => {
    if (editingNote) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveNote(editingNote);
    }
    setEditingNote(null);
    setVerseOpen(false);
    setMenuOpen(false);
  }, [editingNote, saveNote]);

  // ── Markdown formatting ────────────────────────────────────────────────────
  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    const ta = textareaRef.current;
    if (!ta || !editingNote) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = editingNote.texto;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    ta.value = newText;
    const newCursorStart = start + prefix.length;
    const newCursorEnd = end + prefix.length;
    ta.setSelectionRange(newCursorStart, newCursorEnd);
    ta.focus();
    handleTextChange(newText);
  }, [editingNote, handleTextChange]);

  // ── Verse lookup ───────────────────────────────────────────────────────────
  const doFetchVerse = useCallback(async () => {
    if (!verseQuery.trim()) return;
    setVerseLoading(true);
    setVerseError(false);
    setVerseResult(null);
    const result = await fetchVerse(verseQuery.trim(), verseTranslation);
    setVerseLoading(false);
    if (result) setVerseResult(result);
    else setVerseError(true);
  }, [verseQuery, verseTranslation]);

  const insertVerse = useCallback(() => {
    if (!verseResult || !editingNote) return;
    const ta = textareaRef.current;
    const pos = ta ? ta.selectionStart : editingNote.texto.length;
    const insert = `\n[${verseResult.reference}] "${verseResult.text}"\n`;
    const text = editingNote.texto;
    const newText = text.substring(0, pos) + insert + text.substring(pos);
    handleTextChange(newText);
    setVerseOpen(false);
    showToast("Versículo inserido");
  }, [verseResult, editingNote, handleTextChange, showToast]);

  const copyVerse = useCallback(() => {
    if (!verseResult) return;
    navigator.clipboard.writeText(`${verseResult.reference}\n${verseResult.text}`);
    showToast("Copiado!");
  }, [verseResult, showToast]);

  // ── AI actions ─────────────────────────────────────────────────────────────
  const callAI = useCallback(async (action: "organize" | "resumir") => {
    if (!editingNote || !editingNote.texto.trim()) {
      showToast(action === "organize" ? "Escreva algo antes de organizar" : "Escreva algo antes de resumir");
      return;
    }
    setAiLoading(action);
    setAiResult(null);
    setMenuOpen(false);
    try {
      if (action === "organize") {
        const body = {
          action: "organize",
          noteTitle: noteTitle(editingNote.texto),
          noteBody: editingNote.texto,
        };
        const { data, error } = await supabase.functions.invoke("notes-ai", { body });
        if (error || data?.error) {
          showToast(data?.error || "Erro ao chamar IA");
          setAiLoading(null);
          return;
        }
        setAiResult({ title: "✨ Nota Organizada", content: data.result });
      } else {
        const plainText = editingNote.texto.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        const { data, error } = await supabase.functions.invoke("summarize-transcript", {
          body: { transcript: plainText },
        });
        if (error || data?.error) {
          showToast(data?.error || "Erro ao resumir");
          setAiLoading(null);
          return;
        }
        setAiResult({ title: "📋 Resumo em Tópicos", content: data.result });
      }
    } catch {
      showToast("Erro de conexão");
    }
    setAiLoading(null);
  }, [editingNote, showToast]);

  // Keep ref in sync with editingNote
  useEffect(() => {
    editingNoteRef.current = editingNote;
  }, [editingNote]);

  // ── Audio transcription ─────────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
      setIsRecording(false);
      showToast("Gravação parada");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Navegador não suporta gravação de voz");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          const current = editingNoteRef.current;
          if (current) {
            const newText = current.texto + (current.texto ? " " : "") + transcript;
            handleTextChange(newText);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      recognitionRef.current = null;
      setIsRecording(false);
      if (event.error === "not-allowed") {
        showToast("Permissão de microfone negada");
      } else if (event.error === "no-speech") {
        showToast("Nenhuma fala detectada");
      } else {
        showToast("Erro na gravação: " + event.error);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {
          setIsRecording(false);
          recognitionRef.current = null;
        }
      }
    };

    try {
      recognition.start();
      setIsRecording(true);
      showToast("🎙️ Gravando... fale agora");
    } catch (e) {
      showToast("Não foi possível iniciar gravação");
      setIsRecording(false);
    }
  }, [isRecording, handleTextChange, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // ── PDF Generation ──────────────────────────────────────────────────────────
  const handleGeneratePDF = useCallback(() => {
    if (!editingNote) return;
    setMenuOpen(false);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 20;
    const marginR = 20;
    const marginTop = 25;
    const marginBottom = 20;
    const usableW = pageW - marginL - marginR;
    let y = marginTop;

    const addPage = () => { doc.addPage(); y = marginTop; };
    const checkPage = (needed: number) => { if (y + needed > pageH - marginBottom) addPage(); };

    // Title
    const title = noteTitle(editingNote.texto);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const titleLines = doc.splitTextToSize(title, usableW);
    checkPage(titleLines.length * 8);
    doc.text(titleLines, marginL, y);
    y += titleLines.length * 8 + 2;

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(formatDateFull(editingNote.atualizadoEm), marginL, y);
    y += 8;
    doc.setTextColor(0, 0, 0);

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(marginL, y, pageW - marginR, y);
    y += 8;

    // Body
    const plainText = editingNote.texto
      .split("\n")
      .map(line => line.replace(/^#{1,3}\s*/, "").replace(/\*\*/g, "").replace(/_/g, ""))
      .join("\n");

    const lines = plainText.split("\n");
    for (const line of lines) {
      if (!line.trim()) { y += 4; continue; }
      if (/^-{3,}$/.test(line.trim())) {
        checkPage(6);
        doc.setDrawColor(200, 200, 200);
        doc.line(marginL, y, pageW - marginR, y);
        y += 6;
        continue;
      }

      const isHeading = line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ");
      if (isHeading) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        y += 3;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
      }

      const wrapped = doc.splitTextToSize(line, usableW);
      const lineH = isHeading ? 6 : 5.5;
      checkPage(wrapped.length * lineH);
      doc.text(wrapped, marginL, y);
      y += wrapped.length * lineH + 1.5;
    }

    // Footer on each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 10, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }

    const fileName = title.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").trim().replace(/\s+/g, "_").slice(0, 40) || "nota";
    doc.save(`${fileName}.pdf`);
    showToast("PDF gerado!");
  }, [editingNote, showToast]);

  // ── RENDER ──────────────────────────────────────────────────────────────────

  // TELA 1 — Category list
  if (!activeSection && !editingNote) {
    return (
      <div style={{ padding: "20px 16px 100px", animation: "notesFadeIn .3s ease" }}>
        <style>{notesCSS}</style>
        <div className="notes-list-head">
          <div className="notes-eyebrow">Caderno de estudo</div>
          <div className="notes-list-title">Anotações</div>
          <div className="notes-list-count">{SECTIONS.length} categorias</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {SECTIONS.map(s => {
            const count = notes.filter(n => n.categoria === s.key).length;
            return (
              <div
                key={s.key}
                className="notes-cat-card"
                onClick={() => { setActiveSection(s.key); setEditingNote(null); }}
              >
                <div className="notes-cat-icon">{s.icon}</div>
                <div className="notes-cat-info">
                  <div className="notes-cat-name">{s.label}</div>
                  <div className="notes-cat-count">{count} {count === 1 ? "nota" : "notas"}</div>
                </div>
                <span className="notes-cat-chevron">›</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // TELA 2 — Notes sub-list (iPhone Notes style)
  if (activeSection && !editingNote) {
    const sec = SECTIONS.find(s => s.key === activeSection)!;
    return (
      <div className="notes-sublist" style={{ animation: "notesSlideIn .25s ease" }}>
        <style>{notesCSS}</style>
        <div className="notes-sub-header">
          <button className="notes-back-btn" onClick={() => setActiveSection(null)}>
            ‹ voltar
          </button>
          <div className="notes-sub-title">{sec.icon} {sec.label}</div>
        </div>
        <div className="notes-rows">
          {sectionNotes.length === 0 ? (
            <div className="notes-empty">
              Nenhuma nota ainda. Toque no + para criar.
            </div>
          ) : (
            sectionNotes.map(note => (
              <div
                key={note.id}
                className="notes-row"
                onClick={() => {
                  setEditingNote(note);
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
              >
                <div className="notes-row-body">
                  <div className="notes-row-name">{noteTitle(note.texto)}</div>
                  <div className="notes-row-date">{formatDateShort(note.atualizadoEm)}</div>
                  <div className="notes-row-preview">{notePreview(note.texto)}</div>
                </div>
                <span className="notes-row-chevron">›</span>
              </div>
            ))
          )}
        </div>

        {/* FAB */}
        <button className="notes-fab" onClick={createNote}>＋</button>
      </div>
    );
  }

  // TELA 3 — Editor (iPhone Notes style)
  if (editingNote) {
    const sec = SECTIONS.find(s => s.key === editingNote.categoria);
    return (
      <div className="notes-editor-view" style={{ animation: "notesSlideIn .22s ease" }}>
        <style>{notesCSS}</style>

        {/* Editor header */}
        <div className="notes-editor-bar">
          <button className="notes-ed-back" onClick={closeEditor}>‹ voltar</button>
          <div style={{ flex: 1 }} />
          <div className="notes-save-indicator">
            {saveStatus === "typing" ? "..." : saveStatus === "saved" ? "Salvo ✓" : ""}
          </div>
          <button className="notes-menu-btn" onClick={() => setMenuOpen(o => !o)}>⋯</button>
        </div>

        {/* Date + category pill */}
        <div className="notes-editor-meta" id="notes-print-meta">
          <div className="notes-editor-date">{formatDateFull(editingNote.atualizadoEm)}</div>
          <div className="notes-editor-pill">
            <select
              value={editingNote.categoria}
              onChange={e => {
                const updated = { ...editingNote, categoria: e.target.value as Section };
                setEditingNote(updated);
                saveNote(updated);
              }}
              className="notes-pill-select"
            >
              {SECTIONS.map(s => (
                <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Overflow menu */}
        {menuOpen && (
          <div className="notes-overflow-menu">
            <button className="notes-overflow-item" onClick={() => callAI("organize")} disabled={!!aiLoading}>
              {aiLoading === "organize" ? "⏳ Organizando..." : "✨ Organizar"}
            </button>
            <button className="notes-overflow-item" onClick={() => callAI("resumir")} disabled={!!aiLoading}>
              {aiLoading === "resumir" ? "⏳ Resumindo..." : "📋 Resumir em Tópicos"}
            </button>
            <div className="notes-overflow-sep" />
            <button className="notes-overflow-item" onClick={handleGeneratePDF}>
              📄 Gerar PDF
            </button>
            <div className="notes-overflow-sep" />
            <button className="notes-overflow-item danger" onClick={() => deleteNote(editingNote.id)}>
              🗑️ Remover nota
            </button>
          </div>
        )}

        {/* Click outside to close menu */}
        {menuOpen && <div className="notes-menu-backdrop" onClick={() => setMenuOpen(false)} />}

        {/* Textarea or Preview */}
        <div className="notes-editor-canvas" id="notes-print-content">
          {previewMode ? (
            <div
              className="notes-editor-field"
              style={{ cursor: "text", minHeight: "calc(100dvh - 260px)" }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(editingNote.texto) || '<em style="color:var(--notes-placeholder)">Nada para visualizar</em>' }}
              onClick={() => setPreviewMode(false)}
            />
          ) : (
            <textarea
              ref={textareaRef}
              className="notes-editor-field"
              value={editingNote.texto}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="Comece a escrever..."
            />
          )}
        </div>

        {/* Bottom bar */}
        <div className="notes-bottom-bar no-print">
          <button
            className={`notes-bb-btn ${isRecording ? "recording" : ""}`}
            onClick={toggleRecording}
            title={isRecording ? "Parar gravação" : "Gravar áudio"}
            style={isRecording ? { color: "#c26b5a", background: "rgba(194,107,90,.15)" } : {}}
          >
            {isRecording ? "⏹" : "🎙️"}
          </button>
          <div className="notes-bb-sep" />
          <button className="notes-bb-btn" onClick={() => wrapSelection("**", "**")} title="Negrito" disabled={previewMode}>
            <strong>N</strong>
          </button>
          <button className="notes-bb-btn" onClick={() => wrapSelection("_", "_")} title="Itálico" disabled={previewMode}>
            <em>I</em>
          </button>
          <div className="notes-bb-sep" />
          <button
            className="notes-bb-btn"
            onClick={() => setPreviewMode(p => !p)}
            title={previewMode ? "Editar" : "Visualizar"}
            style={{ fontSize: 13, fontWeight: previewMode ? 700 : 400 }}
          >
            {previewMode ? "✏️" : "👁"}
          </button>
          <div style={{ flex: 1 }} />
          <button className="notes-bb-verse-btn" onClick={() => setVerseOpen(true)}>
            🔖 Versículo
          </button>
        </div>

        {/* ── VERSE BOTTOM SHEET ── */}
        <div className={`notes-sheet-overlay ${verseOpen ? "open" : ""}`}>
          <div className="notes-sheet-scrim" onClick={() => setVerseOpen(false)} />
          <div className="notes-sheet-panel">
            <div className="notes-sheet-pip" />
            <div className="notes-sheet-heading">Buscar versículo</div>
            <div className="notes-sheet-body">
              <div className="notes-trans-row">
                {[
                  { key: "almeida", label: "ARC" },
                  { key: "nvi", label: "NVI" },
                  { key: "kjv", label: "KJV" },
                ].map(t => (
                  <button
                    key={t.key}
                    className={`notes-trans-btn ${verseTranslation === t.key ? "on" : ""}`}
                    onClick={() => setVerseTranslation(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="notes-search-row">
                <input
                  className="notes-verse-input"
                  value={verseQuery}
                  onChange={e => setVerseQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") doFetchVerse(); }}
                  placeholder="João 3:16"
                />
                <button
                  className="notes-verse-go"
                  onClick={doFetchVerse}
                  disabled={!verseQuery.trim() || verseLoading}
                >
                  Buscar
                </button>
              </div>
              <div className="notes-verse-status">
                {verseLoading
                  ? "Buscando versículo..."
                  : verseError
                    ? "Não encontrado. Verifique a referência."
                    : !verseResult
                      ? "Ex: Rm 8:28 · Sl 23:1 · Ef 2:8"
                      : ""}
              </div>
              {verseResult && (
                <div className="notes-verse-result show">
                  <div className="notes-vr-ref">{verseResult.reference}</div>
                  <div className="notes-vr-text">{verseResult.text}</div>
                  <div className="notes-vr-actions">
                    <button className="notes-vr-btn primary" onClick={insertVerse}>Inserir</button>
                    <button className="notes-vr-btn" onClick={copyVerse}>Copiar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── AI RESULT MODAL ── */}
        {aiResult && (
          <div className="notes-sheet-overlay open">
            <div className="notes-sheet-scrim" onClick={() => setAiResult(null)} />
            <div className="notes-sheet-panel" style={{ maxHeight: "85dvh" }}>
              <div className="notes-sheet-pip" />
              <div className="notes-sheet-heading">{aiResult.title}</div>
              <div className="notes-sheet-body">
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 16, lineHeight: 1.8, color: `var(--notes-text)`,
                  marginBottom: 16,
                  transition: `color ${transition}`,
                }} dangerouslySetInnerHTML={{ __html: renderMarkdown(aiResult.content) }} />
                <div className="notes-vr-actions" style={{ flexDirection: "column", gap: 8 }}>
                  <button className="notes-vr-btn primary" onClick={() => {
                    if (editingNote) {
                      handleTextChange(aiResult.content);
                      setPreviewMode(true);
                    }
                    setAiResult(null);
                    showToast("Nota reorganizada!");
                  }}>✨ Substituir nota</button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="notes-vr-btn" onClick={() => {
                      navigator.clipboard.writeText(aiResult.content);
                      showToast("Copiado!");
                    }}>Copiar</button>
                    <button className="notes-vr-btn" onClick={() => setAiResult(null)}>Fechar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        <div className={`notes-toast ${toast ? "show" : ""}`}>{toast}</div>
      </div>
    );
  }

  return null;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const notesCSS = `
@keyframes notesFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes notesSlideIn {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes notesPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
}

/* ── Print (removed — using PDF now) ── */

/* ── List head ── */
.notes-list-head { padding: 2px 8px 0; }
.notes-eyebrow {
  font-family: 'Cinzel', serif;
  font-size: 9px; letter-spacing: 4px;
  color: var(--notes-text3); text-transform: uppercase;
  margin-bottom: 4px; transition: color .3s;
}
.notes-list-title {
  font-family: 'Cinzel', serif;
  font-size: 22px; color: var(--notes-text); font-weight: 400;
  transition: color .3s;
}
.notes-list-count {
  font-family: 'Cormorant Garamond', serif;
  font-size: 13px; color: var(--notes-text3); font-style: italic;
  margin-top: 2px; transition: color .3s;
}

/* ── Category cards ── */
.notes-cat-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 18px; border-radius: 14px; cursor: pointer;
  background: var(--notes-card); border: 1px solid var(--notes-border);
  box-shadow: var(--notes-shadow);
  transition: background .3s, box-shadow .2s, transform .15s;
  -webkit-tap-highlight-color: transparent;
}
.notes-cat-card:active { transform: scale(.98); box-shadow: none; }
.notes-cat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: var(--notes-accent-faint); border: 1px solid var(--notes-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.notes-cat-info { flex: 1; min-width: 0; }
.notes-cat-name {
  font-family: 'Cinzel', serif; font-size: 14px;
  color: var(--notes-text); font-weight: 400; transition: color .3s;
}
.notes-cat-count {
  font-family: 'Cormorant Garamond', serif;
  font-size: 12px; color: var(--notes-accent); font-style: italic;
  margin-top: 2px; transition: color .3s;
}
.notes-cat-chevron { color: var(--notes-text3); font-size: 16px; transition: color .3s; }

/* ── Sub-list ── */
.notes-sublist {
  display: flex; flex-direction: column; flex: 1;
  min-height: 50vh; position: relative;
}
.notes-sub-header {
  display: flex; align-items: center;
  padding: 16px 20px 12px; gap: 14px;
  border-bottom: 1px solid var(--notes-border2);
}
.notes-back-btn {
  background: none; border: none;
  color: var(--notes-accent);
  font-family: 'Cormorant Garamond', serif;
  font-size: 16px; cursor: pointer;
  padding: 4px 0; display: flex; align-items: center; gap: 6px;
  transition: opacity .15s;
}
.notes-back-btn:active { opacity: .6; }
.notes-sub-title {
  font-family: 'Cinzel', serif; font-size: 14px;
  color: var(--notes-text); flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  transition: color .3s;
}
.notes-rows { flex: 1; overflow-y: auto; padding: 8px 0 90px; }

/* ── Note row (iPhone style) ── */
.notes-row {
  display: flex; align-items: flex-start;
  padding: 14px 24px; gap: 12px;
  border-bottom: 1px solid var(--notes-border2);
  cursor: pointer; transition: background .15s;
  -webkit-tap-highlight-color: transparent;
}
.notes-row:active { background: var(--notes-hover); }
.notes-row-body { flex: 1; min-width: 0; }
.notes-row-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 17px; font-weight: 700; color: var(--notes-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color .3s;
}
.notes-row-date {
  font-family: 'Cormorant Garamond', serif;
  font-size: 13px; color: var(--notes-text3);
  margin-top: 2px; transition: color .3s;
}
.notes-row-preview {
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px; color: var(--notes-text3); font-style: italic;
  margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color .3s;
}
.notes-row-chevron { color: var(--notes-text3); font-size: 16px; margin-top: 4px; }
.notes-empty {
  padding: 40px 24px; text-align: center;
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px; color: var(--notes-text3); font-style: italic;
}

/* ── FAB ── */
.notes-fab {
  position: fixed; bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  right: 20px; width: 50px; height: 50px;
  border-radius: 50%; border: none;
  background: var(--notes-accent); color: var(--notes-bg);
  font-size: 22px; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(0,0,0,.2);
  transition: transform .15s, box-shadow .15s, background .3s;
  z-index: 40;
}
.notes-fab:active { transform: scale(.92); box-shadow: 0 2px 8px rgba(0,0,0,.15); }

/* ── Editor ── */
.notes-editor-view {
  display: flex; flex-direction: column; flex: 1; min-height: 0;
  position: relative;
}
.notes-editor-bar {
  display: flex; align-items: center;
  padding: 14px 20px 6px; gap: 10px;
}
.notes-ed-back {
  background: none; border: none;
  color: var(--notes-accent);
  font-family: 'Cormorant Garamond', serif;
  font-size: 16px; cursor: pointer;
  display: flex; align-items: center; gap: 5px;
  transition: opacity .15s; padding: 4px 0;
}
.notes-ed-back:active { opacity: .6; }
.notes-save-indicator {
  font-family: 'Cormorant Garamond', serif;
  font-size: 12px; color: var(--notes-text3);
  transition: color .3s;
}
.notes-menu-btn {
  background: none; border: none;
  color: var(--notes-text2);
  font-size: 22px; cursor: pointer;
  padding: 4px 8px; border-radius: 8px;
  letter-spacing: 2px;
  transition: background .15s;
}
.notes-menu-btn:active { background: var(--notes-hover); }

/* ── Editor meta (date + pill) ── */
.notes-editor-meta {
  padding: 2px 24px 12px;
}
.notes-editor-date {
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px; color: var(--notes-text3);
  margin-bottom: 6px; transition: color .3s;
}
.notes-editor-pill { display: inline-block; }
.notes-pill-select {
  font-family: 'Cormorant Garamond', serif;
  font-size: 12px; padding: 4px 10px;
  background: var(--notes-accent-faint);
  border: 1px solid var(--notes-border);
  border-radius: 99px; color: var(--notes-accent);
  outline: none; cursor: pointer;
  transition: background .3s, border-color .3s, color .3s;
  appearance: none;
  -webkit-appearance: none;
}

/* ── Overflow menu ── */
.notes-menu-backdrop {
  position: fixed; inset: 0; z-index: 90;
}
.notes-overflow-menu {
  position: absolute; top: 52px; right: 16px;
  background: var(--notes-card);
  border: 1px solid var(--notes-border);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,.15);
  z-index: 100; min-width: 200px;
  padding: 6px 0;
  animation: notesFadeIn .15s ease;
}
.notes-overflow-item {
  display: block; width: 100%;
  padding: 12px 18px;
  background: none; border: none;
  font-family: 'Cormorant Garamond', serif;
  font-size: 15px; color: var(--notes-text);
  text-align: left; cursor: pointer;
  transition: background .1s;
}
.notes-overflow-item:active { background: var(--notes-hover); }
.notes-overflow-item:disabled { opacity: .5; cursor: default; }
.notes-overflow-item.danger { color: #c26b5a; }
.notes-overflow-sep {
  height: 1px; background: var(--notes-border2);
  margin: 4px 0;
}

.notes-editor-canvas {
  flex: 1; overflow-y: auto;
  padding: 0 20px 140px;
  -webkit-overflow-scrolling: touch;
}
.notes-editor-field {
  width: 100%; min-height: calc(100dvh - 300px);
  outline: none; border: none; resize: none;
  font-family: 'Cormorant Garamond', serif;
  font-size: 19px; line-height: 1.9;
  color: var(--notes-text); background: transparent;
  caret-color: var(--notes-accent);
  transition: color .3s;
}
.notes-editor-field::placeholder {
  color: var(--notes-placeholder); font-style: italic;
  transition: color .3s;
}

/* ── Bottom bar ── */
.notes-bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--notes-bg);
  border-top: 1px solid var(--notes-border2);
  padding: 10px 20px calc(10px + env(safe-area-inset-bottom, 0px));
  display: flex; align-items: center; gap: 6px; z-index: 50;
  transition: background .3s, border-color .3s;
}
.notes-bb-btn {
  width: 36px; height: 36px; border-radius: 8px;
  border: none; background: transparent;
  color: var(--notes-text2);
  font-family: 'Cormorant Garamond', serif;
  font-size: 17px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s;
}
.notes-bb-btn:active { background: var(--notes-accent-faint); color: var(--notes-accent); }
.notes-bb-btn.recording { animation: notesPulse 1s infinite; }
.notes-bb-sep {
  width: 1px; height: 18px; background: var(--notes-border);
  margin: 0 2px; transition: background .3s;
}
.notes-bb-verse-btn {
  padding: 8px 16px; border-radius: 99px;
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text2);
  font-family: 'Cinzel', serif;
  font-size: 9px; letter-spacing: 2px;
  text-transform: uppercase; cursor: pointer;
  transition: all .2s;
}
.notes-bb-verse-btn:active {
  border-color: var(--notes-accent);
  color: var(--notes-accent);
  background: var(--notes-accent-faint);
}

/* ── Sheet overlay ── */
.notes-sheet-overlay {
  position: fixed; inset: 0; z-index: 200;
  opacity: 0; pointer-events: none;
  transition: opacity .25s;
}
.notes-sheet-overlay.open { opacity: 1; pointer-events: all; }
.notes-sheet-scrim {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(2px);
}
.notes-sheet-panel {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: var(--notes-card);
  border-top: 1px solid var(--notes-border);
  border-radius: 20px 20px 0 0;
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  transform: translateY(100%);
  transition: transform .35s cubic-bezier(.32,0,.15,1), background .3s;
  max-height: 80dvh; overflow-y: auto;
}
.notes-sheet-overlay.open .notes-sheet-panel { transform: translateY(0); }
.notes-sheet-pip {
  width: 36px; height: 4px;
  background: var(--notes-border);
  border-radius: 2px; margin: 14px auto 18px;
}
.notes-sheet-heading {
  font-family: 'Cinzel', serif;
  font-size: 10px; letter-spacing: 4px;
  color: var(--notes-text3); text-transform: uppercase;
  text-align: center; margin-bottom: 18px;
  transition: color .3s;
}
.notes-sheet-body { padding: 0 20px 12px; }

.notes-trans-row { display: flex; gap: 6px; margin-bottom: 14px; }
.notes-trans-btn {
  flex: 1; padding: 8px 4px;
  background: var(--notes-bg); border: 1px solid var(--notes-border);
  border-radius: 8px; color: var(--notes-text3);
  font-family: 'Cinzel', serif;
  font-size: 10px; letter-spacing: 1px;
  text-align: center; cursor: pointer;
  transition: all .15s;
}
.notes-trans-btn.on {
  border-color: var(--notes-accent);
  color: var(--notes-accent);
  background: var(--notes-accent-faint);
}
.notes-search-row { display: flex; gap: 8px; margin-bottom: 10px; }
.notes-verse-input {
  flex: 1; background: var(--notes-bg);
  border: 1px solid var(--notes-border);
  border-radius: 10px; color: var(--notes-text);
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px; padding: 11px 16px;
  outline: none; transition: border-color .2s, background .3s, color .3s;
}
.notes-verse-input:focus { border-color: var(--notes-accent); }
.notes-verse-input::placeholder { color: var(--notes-text3); font-style: italic; }
.notes-verse-go {
  padding: 11px 16px;
  background: var(--notes-accent-faint);
  border: 1px solid var(--notes-accent);
  border-radius: 10px; color: var(--notes-accent);
  font-family: 'Cinzel', serif;
  font-size: 10px; letter-spacing: 1px;
  cursor: pointer; transition: all .15s; flex-shrink: 0;
}
.notes-verse-go:active { opacity: .7; }
.notes-verse-go:disabled { opacity: .4; cursor: default; }
.notes-verse-status {
  font-family: 'Cormorant Garamond', serif;
  font-size: 13px; font-style: italic;
  color: var(--notes-text3); text-align: center;
  padding: 8px 0; min-height: 36px;
  transition: color .3s;
}
.notes-verse-result {
  background: var(--notes-bg); border: 1px solid var(--notes-border);
  border-left: 2px solid var(--notes-accent);
  border-radius: 10px; padding: 14px 16px;
  margin-top: 6px; transition: background .3s, border-color .3s;
}
.notes-vr-ref {
  font-family: 'Cinzel', serif; font-size: 9px;
  letter-spacing: 2px; color: var(--notes-accent);
  text-transform: uppercase; margin-bottom: 8px;
  transition: color .3s;
}
.notes-vr-text {
  font-family: 'Cormorant Garamond', serif;
  font-size: 17px; line-height: 1.8;
  color: var(--notes-text); font-style: italic;
  transition: color .3s;
}
.notes-vr-actions { display: flex; gap: 8px; margin-top: 14px; }
.notes-vr-btn {
  flex: 1; padding: 11px; border-radius: 10px;
  font-family: 'Cinzel', serif;
  font-size: 9px; letter-spacing: 1px;
  text-transform: uppercase; cursor: pointer;
  transition: all .15s; text-align: center;
  border: 1px solid var(--notes-border);
  color: var(--notes-text2); background: transparent;
}
.notes-vr-btn.primary {
  background: var(--notes-accent-faint);
  border-color: var(--notes-accent);
  color: var(--notes-accent);
}
.notes-vr-btn:active { opacity: .7; }

/* ── Toast ── */
.notes-toast {
  position: fixed; bottom: 80px; left: 50%;
  transform: translateX(-50%) translateY(16px);
  background: var(--notes-card); border: 1px solid var(--notes-border);
  border-radius: 99px; padding: 9px 22px;
  color: var(--notes-text2);
  font-family: 'Cinzel', serif;
  font-size: 9px; letter-spacing: 2px;
  text-transform: uppercase;
  opacity: 0; pointer-events: none;
  transition: opacity .25s, transform .25s;
  z-index: 999; white-space: nowrap;
  box-shadow: 0 8px 30px rgba(0,0,0,.1);
}
.notes-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* scrollbar hide */
.notes-rows::-webkit-scrollbar,
.notes-editor-canvas::-webkit-scrollbar { width: 0; }
`;
