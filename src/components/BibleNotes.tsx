import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import RichTextEditor from "@/components/RichTextEditor";
import NoteSearchOverlay from "@/components/NoteSearchOverlay";
import BibleContextPanel from "@/components/BibleContextPanel";
import { forceHideTooltip } from "@/lib/bibleRefExtension";

// ── Types ─────────────────────────────────────────────────────────────────────
type Section = "proclamadores" | "aulas" | "pensamentos" | "devocionais";

type Note = {
  id: string;
  categoria: Section;
  semana: string;
  texto: string;
  criadoEm: string;
  atualizadoEm: string;
};

const WEEKS_LIST = [
  "Sem. 1 — 24/01–30/01", "Sem. 2 — 31/01–06/02", "Sem. 3 — 07/02–13/02",
  "Sem. 4 — 14/02–20/02", "Sem. 5 — 21/02–27/02", "Sem. 6 — 28/02–06/03",
  "Sem. 7 — 07/03–13/03", "Sem. 8 — 14/03–20/03", "Sem. 9 — 21/03–27/03",
  "Sem. 10 — 28/03–03/04", "Sem. 11 — 04/04–10/04", "Sem. 12 — 11/04–17/04",
  "Sem. 13 — 18/04–24/04", "Sem. 14 — 25/04–01/05", "Sem. 15 — 02/05–08/05",
  "Sem. 16 — 09/05–15/05", "Sem. 17 — 16/05–22/05", "Sem. 18 — 23/05–29/05",
];

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: "proclamadores", label: "Track Proclamadores", icon: "🏴" },
  { key: "aulas", label: "Aulas", icon: "📖" },
  { key: "pensamentos", label: "Pensamentos", icon: "💭" },
  { key: "devocionais", label: "Devocionais", icon: "🔥" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function noteTitle(texto: string) {
  // Strip HTML tags for title extraction
  const stripped = texto.replace(/<[^>]*>/g, "").trim();
  const first = stripped.split("\n")[0]?.trim().replace(/^#{1,3}\s*/, "");
  return first || "Sem título";
}

function notePreview(texto: string, len = 60) {
  const stripped = texto.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = stripped.split(" ").slice(0, 15).join(" ");
  if (!words) return "Sem conteúdo";
  return words.length > len ? words.slice(0, len) + "…" : words;
}

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Markdown → HTML converter preserving headings, lists, blockquotes and inline emphasis
function inlinemd(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}

function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraphLines: string[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];
  let quoteLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    html.push(`<p>${paragraphLines.map((line) => inlinemd(line)).join("<br/>")}</p>`);
    paragraphLines = [];
  };

  const flushUl = () => {
    if (!ulItems.length) return;
    html.push(`<ul>${ulItems.map((item) => `<li>${inlinemd(item)}</li>`).join("")}</ul>`);
    ulItems = [];
  };

  const flushOl = () => {
    if (!olItems.length) return;
    html.push(`<ol>${olItems.map((item) => `<li>${inlinemd(item)}</li>`).join("")}</ol>`);
    olItems = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    html.push(`<blockquote><p>${quoteLines.map((line) => inlinemd(line)).join("<br/>")}</p></blockquote>`);
    quoteLines = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushUl();
    flushOl();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushAll();
      continue;
    }

    if (/^---+$/.test(line)) {
      flushAll();
      html.push("<hr/>");
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length >= 3 ? "h3" : "h2";
      html.push(`<${level}>${inlinemd(heading[2])}</${level}>`);
      continue;
    }

    const ulItem = line.match(/^[\-*•]\s+(.+)$/);
    if (ulItem) {
      flushParagraph();
      flushOl();
      flushQuote();
      ulItems.push(ulItem[1]);
      continue;
    }

    const olItem = line.match(/^\d+[\.)]\s+(.+)$/);
    if (olItem) {
      flushParagraph();
      flushUl();
      flushQuote();
      olItems.push(olItem[1]);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushUl();
      flushOl();
      quoteLines.push(quote[1]);
      continue;
    }

    flushUl();
    flushOl();
    flushQuote();
    paragraphLines.push(line);
  }

  flushAll();
  return html.join("");
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, "**$2**")
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, "*$2*")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<hr[^>]*\/?\s*>/gi, "\n---\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      const cleaned = content
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => `> ${line}`)
        .join("\n");
      return cleaned ? `\n${cleaned}\n` : "\n";
    })
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<img[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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

// ── Bible API ────────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function BibleNotes({ onTitleChange, userCodeId }: { onTitleChange?: (title: string) => void; userCodeId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [toast, setToast] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "typing" | "saved">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
  const [aiComments, setAiComments] = useState<{ trecho: string; comentario: string }[]>([]);
  const [aiCommentsOpen, setAiCommentsOpen] = useState(false);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const editingNoteRef = useRef<Note | null>(null);

  // Note search (Ctrl+F)
  const [noteSearchOpen, setNoteSearchOpen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Bible context panel
  const [bibleContextOpen, setBibleContextOpen] = useState(false);
  const [bibleContextRef, setBibleContextRef] = useState("");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes from Supabase + migrate localStorage notes once
  useEffect(() => {
    const loadNotes = async () => {
      const LOCAL_KEY = "bible-notes-2026";
      const MIGRATED_KEY = "bible-notes-migrated-" + userCodeId;
      const alreadyMigrated = localStorage.getItem(MIGRATED_KEY);
      const localRaw = localStorage.getItem(LOCAL_KEY);

      if (!alreadyMigrated && localRaw) {
        try {
          const localNotes = JSON.parse(localRaw);
          if (Array.isArray(localNotes) && localNotes.length > 0) {
            const rows = localNotes
              .filter((n: any) => n.texto && n.texto.trim())
              .map((n: any) => ({
                user_code_id: userCodeId,
                categoria: n.categoria || "aulas",
                semana: n.semana || "",
                texto: n.texto || "",
              }));

            if (rows.length > 0) {
              const { error: migErr } = await (supabase as any).from("notes").insert(rows);
              if (!migErr) console.log(`Migrated ${rows.length} notes from localStorage`);
            }
            localStorage.setItem(MIGRATED_KEY, "true");
          }
        } catch (e) {
          console.error("Error parsing localStorage notes:", e);
        }
      }

      const { data, error } = await (supabase as any)
        .from("notes")
        .select("*")
        .eq("user_code_id", userCodeId)
        .order("updated_at", { ascending: false });

      if (error) { console.error("Error loading notes:", error); return; }

      if (data) {
        const mapped: Note[] = data.map((n: any) => ({
          id: n.id,
          categoria: n.categoria as Section,
          semana: n.semana || "",
          texto: n.texto || "",
          criadoEm: n.created_at,
          atualizadoEm: n.updated_at,
        }));
        setNotes(mapped);
      }
    };
    loadNotes();
  }, [userCodeId]);

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
    let filtered = notes.filter(n => n.categoria === activeSection);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n => {
        const stripped = n.texto.replace(/<[^>]*>/g, "").toLowerCase();
        return stripped.includes(q);
      });
    }
    return filtered.sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime());
  }, [notes, activeSection, searchQuery]);

  // Recent notes for home
  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())
      .slice(0, 5);
  }, [notes]);

  // ── Note operations ────────────────────────────────────────────────────────
  const createNote = useCallback(async () => {
    const categoria = activeSection || "aulas";

    const { data, error } = await (supabase as any)
      .from("notes")
      .insert({
        user_code_id: userCodeId,
        categoria,
        semana: WEEKS_LIST[0],
        texto: "",
      })
      .select()
      .maybeSingle();

    if (error || !data) { showToast("Erro ao criar nota"); return; }

    const note: Note = {
      id: data.id,
      categoria: data.categoria as Section,
      semana: data.semana || "",
      texto: data.texto || "",
      criadoEm: data.created_at,
      atualizadoEm: data.updated_at,
    };
    setNotes(prev => [note, ...prev]);
    setEditingNote(note);
  }, [activeSection, userCodeId, showToast]);

  const saveNote = useCallback(async (note: Note) => {
    const now = new Date().toISOString();
    const updatedNote = { ...note, atualizadoEm: now };
    setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);

    await (supabase as any)
      .from("notes")
      .update({
        texto: note.texto,
        categoria: note.categoria,
        semana: note.semana,
        updated_at: now,
      })
      .eq("id", note.id);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (editingNote?.id === id) setEditingNote(null);
    showToast("Nota removida");
    setMenuOpen(false);

    await (supabase as any).from("notes").delete().eq("id", id);
  }, [editingNote, showToast]);

  const handleTextChange = useCallback((html: string) => {
    if (!editingNote) return;
    const updated = { ...editingNote, texto: html };
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
    setNoteSearchOpen(false);
    forceHideTooltip();
  }, [editingNote, saveNote]);

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
    const verseHtml = `<blockquote><p><strong>[${verseResult.reference}]</strong></p><p><em>${verseResult.text}</em></p></blockquote>`;
    const newHtml = editingNote.texto + verseHtml;
    handleTextChange(newHtml);
    setVerseOpen(false);
    showToast("Versículo inserido");
  }, [verseResult, editingNote, handleTextChange, showToast]);

  const copyVerse = useCallback(() => {
    if (!verseResult) return;
    navigator.clipboard.writeText(`${verseResult.reference}\n${verseResult.text}`);
    showToast("Copiado!");
  }, [verseResult, showToast]);

  // ── AI actions ─────────────────────────────────────────────────────────────
  const callAI = useCallback(async (action: "organize" | "resumir" | "gramatica" | "comentar") => {
    if (!editingNote || !editingNote.texto.trim()) {
      showToast("Escreva algo antes");
      return;
    }
    setAiLoading(action);
    setAiResult(null);
    setMenuOpen(false);
    try {
      const markdownBody = htmlToMarkdown(editingNote.texto);

      if (action === "comentar") {
        const { data, error } = await supabase.functions.invoke("notes-comment", {
          body: { noteTitle: noteTitle(editingNote.texto), noteBody: markdownBody },
        });
        if (error || data?.error) { showToast(data?.error || "Erro ao gerar comentários"); setAiLoading(null); return; }
        const comments = data.result?.comments || [];
        if (comments.length === 0) { showToast("Nenhum comentário gerado"); setAiLoading(null); return; }
        setAiComments(comments);
        setAiCommentsOpen(true);
        showToast(`${comments.length} comentários gerados!`);
        setAiLoading(null);
        return;
      }

      if (action === "organize") {
        const { data, error } = await supabase.functions.invoke("notes-ai", {
          body: { action: "organize", noteTitle: noteTitle(editingNote.texto), noteBody: markdownBody },
        });
        if (error || data?.error) { showToast(data?.error || "Erro ao chamar IA"); setAiLoading(null); return; }
        setAiResult({ title: "✨ Nota Organizada", content: data.result });
      } else if (action === "gramatica") {
        const { data, error } = await supabase.functions.invoke("notes-ai", {
          body: { action: "gramatica", noteTitle: noteTitle(editingNote.texto), noteBody: markdownBody },
        });
        if (error || data?.error) { showToast(data?.error || "Erro ao corrigir gramática"); setAiLoading(null); return; }
        setAiResult({ title: "📝 Gramática Corrigida", content: data.result });
      } else {
        const plainText = editingNote.texto.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        const { data, error } = await supabase.functions.invoke("summarize-transcript", { body: { transcript: plainText } });
        if (error || data?.error) { showToast(data?.error || "Erro ao resumir"); setAiLoading(null); return; }
        setAiResult({ title: "📋 Resumo em Tópicos", content: data.result });
      }
    } catch {
      showToast("Erro de conexão");
    }
    setAiLoading(null);
  }, [editingNote, showToast, handleTextChange]);

  // Keep ref in sync with editingNote
  useEffect(() => { editingNoteRef.current = editingNote; }, [editingNote]);

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
    if (!SpeechRecognition) { showToast("Navegador não suporta gravação de voz"); return; }

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
      recognitionRef.current = null;
      setIsRecording(false);
      if (event.error === "not-allowed") showToast("Permissão de microfone negada");
      else if (event.error === "no-speech") showToast("Nenhuma fala detectada");
      else showToast("Erro na gravação: " + event.error);
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { setIsRecording(false); recognitionRef.current = null; }
      }
    };

    try {
      recognition.start();
      setIsRecording(true);
      showToast("🎙️ Gravando... fale agora");
    } catch {
      showToast("Não foi possível iniciar gravação");
      setIsRecording(false);
    }
  }, [isRecording, handleTextChange, showToast]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
    };
  }, []);

  // ── Ctrl+F handler ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editingNote) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setNoteSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editingNote]);

  // ── Share link ─────────────────────────────────────────────────────────────
  const handleShareNote = useCallback(async () => {
    if (!editingNote) return;
    setMenuOpen(false);

    // Check if already shared
    const { data: existing } = await (supabase as any)
      .from("note_shares")
      .select("slug")
      .eq("note_id", editingNote.id)
      .maybeSingle();

    let slug: string;
    if (existing?.slug) {
      slug = existing.slug;
    } else {
      // Generate a slug from title + random
      const titleSlug = noteTitle(editingNote.texto)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30);
      slug = `${titleSlug}-${Math.random().toString(36).slice(2, 8)}`;

      const { error } = await (supabase as any)
        .from("note_shares")
        .insert({ note_id: editingNote.id, slug });

      if (error) { showToast("Erro ao criar link"); return; }
    }

    const url = `${window.location.origin}/nota/${slug}`;
    await navigator.clipboard.writeText(url);
    showToast("Link copiado!");
  }, [editingNote, showToast]);


  const handleGeneratePDF = useCallback(async () => {
    if (!editingNote) return;
    setMenuOpen(false);
    showToast("Gerando PDF...");

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 30; // 30mm margins all sides
    const maxW = W - M - M;

    // ── Parse HTML content into structured data ──
    const htmlText = editingNote.texto;

    // Extract blockquote verse if present
    let verseRef = "";
    let verseText = "";
    const verseMatch = htmlText.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
    if (verseMatch) {
      const inner = verseMatch[1];
      const refMatch = inner.match(/\[(.+?)\]/);
      if (refMatch) verseRef = refMatch[1];
      verseText = inner.replace(/<[^>]*>/g, "").replace(/\[.+?\]\s*/, "").trim();
    }

    // Remove blockquotes from main text
    const textWithoutVerse = htmlText.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, "");

    // Split into paragraphs
    const rawParagraphs = textWithoutVerse
      .split(/<\/p>\s*<p>|<br\s*\/?>|<\/p>|<p>/gi)
      .map(p => {
        let t = p
          .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
          .replace(/<b>(.*?)<\/b>/g, "**$1**")
          .replace(/<em>(.*?)<\/em>/g, "*$1*")
          .replace(/<i>(.*?)<\/i>/g, "*$1*")
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\.([A-ZÀ-Ú])/g, ". $1")
          .replace(/,([A-Za-zÀ-ú])/g, ", $1")
          .trim();
        return t;
      })
      .filter(p => p.length > 0);

    const titulo = (rawParagraphs[0] || "Sem título")
      .replace(/^#{1,3}\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "");
    const bodyParagraphs = rawParagraphs.slice(1);

    // ── Helper: render a paragraph with inline bold/italic via segments ──
    const renderParagraph = (text: string, startY: number, opts?: { indent?: number; isBullet?: boolean }) => {
      const indent = opts?.indent || 0;
      const lineW = maxW - indent;
      
      // Strip markdown for measurement, but track formatting
      // For simplicity with jsPDF, render as plain text with font changes
      const isHeading = /^#{2,3}\s/.test(text);
      let cleanText = text
        .replace(/^#{1,3}\s*/, "")
        .replace(/^[-•]\s*/, "");
      
      // Determine if entire paragraph is bold or italic
      const isAllBold = /^\*\*[^*]+\*\*$/.test(cleanText.trim());
      const isAllItalic = /^\*[^*]+\*$/.test(cleanText.trim());
      
      // Remove markdown markers
      cleanText = cleanText.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      
      if (opts?.isBullet) {
        cleanText = "— " + cleanText;
      }

      let y = startY;
      const ensureSpace = (needed: number) => {
        if (y + needed > H - M) {
          doc.addPage();
          y = M;
        }
      };

      if (isHeading) {
        ensureSpace(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor("#111111");
        const lines = doc.splitTextToSize(cleanText, lineW);
        doc.text(lines, M + indent, y);
        y += lines.length * 6 + 4;
      } else {
        const fontSize = 11;
        const lineH = fontSize * 0.3528 * 1.6; // pt to mm * line-height
        doc.setFontSize(fontSize);
        doc.setTextColor("#333333");
        
        if (isAllBold) {
          doc.setFont("helvetica", "bold");
        } else if (isAllItalic) {
          doc.setFont("helvetica", "italic");
        } else {
          doc.setFont("helvetica", "normal");
        }
        
        const lines = doc.splitTextToSize(cleanText, lineW);
        ensureSpace(lines.length * lineH + 3);
        for (const line of lines) {
          ensureSpace(lineH);
          doc.text(line, M + indent, y);
          y += lineH;
        }
        y += 3; // paragraph spacing
      }

      return y;
    };

    // ════════════════════════════════════════════════════════════════
    // PAGE 1: COVER — white/off-white, minimal
    // ════════════════════════════════════════════════════════════════
    // White background (default)

    // "DEVOCIONAIS" — small, tracked, gray, upper area
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#888888");
    doc.text("D E V O C I O N A I S", W / 2, H * 0.4, { align: "center" });

    // Title — centered in middle, bold, black, 22pt
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor("#111111");
    const coverLines = doc.splitTextToSize(titulo, maxW);
    const coverY = H * 0.48;
    doc.text(coverLines, W / 2, coverY, { align: "center" });

    // Footer — "Material de Estudo Bíblico"
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#cccccc");
    doc.text("Material de Estudo Bíblico", W / 2, H - M, { align: "center" });

    // ════════════════════════════════════════════════════════════════
    // PAGE 2+: CONTENT
    // ════════════════════════════════════════════════════════════════
    doc.addPage();
    let y = M;

    // Content title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor("#111111");
    doc.text(titulo, M, y);
    y += 6;

    // Thin gray separator
    doc.setDrawColor("#dddddd");
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 10;

    // Body paragraphs
    for (const para of bodyParagraphs) {
      const isHeading = /^#{2,3}\s/.test(para);
      const isBullet = /^[-•]\s/.test(para);

      if (isHeading) {
        y += 4; // extra space before heading
      }

      y = renderParagraph(para, y, { isBullet });
    }

    // Verse box at end
    if (verseRef && verseText) {
      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      const fullVerse = `"${verseText}"`;
      const verseLines = doc.splitTextToSize(fullVerse, maxW - 16);
      const boxH = verseLines.length * 5.5 + 18;

      if (y + boxH > H - M) { doc.addPage(); y = M; }

      // Light background box
      doc.setFillColor("#f5f5f0");
      doc.setDrawColor("#dddddd");
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y, maxW, boxH, 2, 2, "FD");

      // Gold left accent
      doc.setFillColor("#c4a46a");
      doc.rect(M, y, 2.5, boxH, "F");

      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor("#333333");
      for (const vl of verseLines) { doc.text(vl, M + 10, y); y += 5.5; }

      y += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#888888");
      doc.text(`— ${verseRef}`, M + 10, y);
    }

    // Page numbers on content pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor("#cccccc");
      doc.text(`${i - 1}`, W / 2, H - 15, { align: "center" });
    }

    const fileName = titulo.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").trim().replace(/\s+/g, "_").slice(0, 40) || "nota";
    doc.save(`${fileName}.pdf`);
    showToast("PDF gerado!");
  }, [editingNote, showToast]);

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    setMenuOpen(false);
    window.print();
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ─────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // TELA 1 — Category list (home)
  if (!activeSection && !editingNote) {
    return (
      <div className="px-4 pt-5 pb-24 animate-fade-in">
        {/* Header */}
        <div className="px-2 mb-1">
          <p className="font-display text-[9px] tracking-[4px] uppercase text-muted-foreground mb-1">Caderno de estudo</p>
          <h2 className="font-display text-[22px] font-normal text-foreground leading-tight">Anotações</h2>
          <p className="font-body text-[13px] text-muted-foreground italic mt-0.5">{SECTIONS.length} categorias</p>
        </div>

        {/* Category cards */}
        <div className="flex flex-col gap-2 mt-4">
          {SECTIONS.map(s => {
            const count = notes.filter(n => n.categoria === s.key).length;
            return (
              <button
                key={s.key}
                onClick={() => { setActiveSection(s.key); setEditingNote(null); forceHideTooltip(); }}
                className="flex items-center gap-3.5 p-4 rounded-xl cursor-pointer
                  bg-card border border-border shadow-elegant
                  hover:border-primary/40 hover:bg-card-hover
                  active:scale-[0.98] active:shadow-none
                  transition-all duration-200 text-left"
              >
                <div className="w-10 h-10 rounded-[10px] bg-primary/10 border border-border
                  flex items-center justify-center text-xl shrink-0">
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-foreground">{s.label}</div>
                  <div className="font-body text-xs text-primary italic mt-0.5">
                    {count} {count === 1 ? "nota" : "notas"}
                  </div>
                </div>
                <span className="text-muted-foreground text-base">›</span>
              </button>
            );
          })}
        </div>

        {/* Recent notes */}
        {recentNotes.length > 0 && (
          <div className="mt-8">
            <p className="font-display text-[9px] tracking-[4px] uppercase text-muted-foreground mb-3 px-2">
              Notas recentes
            </p>
            <div className="flex flex-col">
              {recentNotes.map(note => {
                const sec = SECTIONS.find(s => s.key === note.categoria);
                return (
                  <button
                    key={note.id}
                    onClick={() => {
                      setActiveSection(note.categoria);
                      setEditingNote(note);
                    }}
                    className="flex items-start py-3 px-4 border-b border-border-subtle
                      hover:bg-card-hover active:bg-card-hover
                      transition-colors duration-150 text-left w-full"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-body text-sm font-bold text-foreground truncate">
                          {noteTitle(note.texto)}
                        </span>
                        <span className="font-body text-[11px] text-muted-foreground shrink-0">
                          {formatDateShort(note.atualizadoEm)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-primary">{sec?.icon} {sec?.label}</span>
                        <span className="text-[13px] text-muted-foreground italic truncate">
                          {notePreview(note.texto)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Toast */}
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full
          px-5 py-2 font-display text-[9px] tracking-[2px] uppercase text-muted-foreground
          shadow-elegant-lg z-[999] whitespace-nowrap transition-all duration-250
          ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
          {toast}
        </div>
      </div>
    );
  }

  // TELA 2 — Notes sub-list
  if (activeSection && !editingNote) {
    const sec = SECTIONS.find(s => s.key === activeSection)!;
    return (
      <div className="flex flex-col flex-1 min-h-[50vh] relative animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3.5 px-5 pt-4 pb-3 border-b border-border-subtle">
          <button
            onClick={() => { setActiveSection(null); setSearchQuery(""); }}
            className="bg-transparent border-none text-primary font-body text-base cursor-pointer
              hover:opacity-80 active:opacity-60 transition-opacity duration-150 px-0 py-1"
          >
            ‹ voltar
          </button>
          <div className="font-display text-sm text-foreground flex-1 min-w-0 truncate">
            {sec.icon} {sec.label}
          </div>
        </div>

        {/* Search bar */}
        <div className="px-5 py-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar nas anotações..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input border border-border
                text-foreground font-body text-sm placeholder:text-muted-foreground placeholder:italic
                focus:outline-none focus:border-primary/50 transition-colors duration-200"
            />
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
          {sectionNotes.length === 0 ? (
            <div className="py-10 text-center font-body text-sm text-muted-foreground italic">
              {searchQuery ? "Nenhuma nota encontrada." : "Nenhuma nota ainda. Toque no + para criar."}
            </div>
          ) : (
            sectionNotes.map(note => (
              <button
                key={note.id}
                onClick={() => setEditingNote(note)}
                className="flex items-start w-full py-3.5 px-6 gap-3 border-b border-border-subtle
                  hover:bg-card-hover active:bg-card-hover
                  transition-colors duration-150 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-body text-[17px] font-bold text-foreground truncate">
                    {noteTitle(note.texto)}
                  </div>
                  <div className="font-body text-[13px] text-muted-foreground mt-0.5">
                    {formatDateShort(note.atualizadoEm)}
                  </div>
                  <div className="font-body text-[14px] text-muted-foreground italic mt-0.5 truncate">
                    {notePreview(note.texto)}
                  </div>
                </div>
                <span className="text-muted-foreground text-base mt-1">›</span>
              </button>
            ))
          )}
        </div>

        {/* FAB */}
        <button
          onClick={createNote}
          className="fixed bottom-6 right-5 w-[50px] h-[50px] rounded-full border-none
            bg-primary text-primary-foreground text-xl leading-none cursor-pointer
            flex items-center justify-center shadow-elegant-lg
            hover:bg-primary-hover active:scale-95
            transition-all duration-150 z-40"
        >
          ＋
        </button>

        {/* Toast */}
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full
          px-5 py-2 font-display text-[9px] tracking-[2px] uppercase text-muted-foreground
          shadow-elegant-lg z-[999] whitespace-nowrap transition-all duration-250
          ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
          {toast}
        </div>
      </div>
    );
  }

  // TELA 3 — Editor
  if (editingNote) {
    const sec = SECTIONS.find(s => s.key === editingNote.categoria);
    return (
      <div className="flex flex-col flex-1 min-h-0 relative animate-fade-in">
        {/* Editor header */}
        <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-1.5 no-print">
          <button
            onClick={closeEditor}
            className="bg-transparent border-none text-primary font-body text-base cursor-pointer
              hover:opacity-80 active:opacity-60 transition-opacity duration-150 px-0 py-1"
          >
            ‹ voltar
          </button>
          <div className="flex-1" />
          <span className="font-body text-xs text-muted-foreground">
            {saveStatus === "typing" ? "..." : saveStatus === "saved" ? "Salvo ✓" : ""}
          </span>
          <button
            onClick={() => setNoteSearchOpen(o => !o)}
            className="bg-transparent border-none text-muted-foreground text-base cursor-pointer
              px-1.5 py-1 rounded-lg hover:bg-card-hover active:bg-card-hover transition-colors duration-150"
            title="Buscar na nota (Ctrl+F)"
          >
            🔍
          </button>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="bg-transparent border-none text-muted-foreground text-xl cursor-pointer
              px-2 py-1 rounded-lg tracking-[2px] hover:bg-card-hover active:bg-card-hover transition-colors duration-150"
          >
            ⋯
          </button>
        </div>

        {/* Date + category pill */}
        <div className="px-6 pb-2 no-print" id="notes-print-meta">
          <div className="font-body text-sm text-muted-foreground mb-1.5">
            {formatDateFull(editingNote.atualizadoEm)}
          </div>
          <div className="inline-block">
            <select
              value={editingNote.categoria}
              onChange={e => {
                const updated = { ...editingNote, categoria: e.target.value as Section };
                setEditingNote(updated);
                saveNote(updated);
              }}
              className="font-body text-xs px-2.5 py-1 bg-primary/10 border border-border
                rounded-full text-primary outline-none cursor-pointer appearance-none
                transition-colors duration-200"
            >
              {SECTIONS.map(s => (
                <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Overflow menu */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-[52px] right-4 bg-card border border-border rounded-xl
              shadow-elegant-lg z-[100] min-w-[200px] py-1.5 animate-fade-in">
              <button
                onClick={() => callAI("organize")}
                disabled={!!aiLoading}
                className="block w-full px-4 py-3 bg-transparent border-none font-body text-[15px]
                  text-foreground text-left cursor-pointer hover:bg-card-hover active:bg-card-hover
                  disabled:opacity-50 disabled:cursor-default transition-colors duration-100"
              >
                {aiLoading === "organize" ? "⏳ Organizando..." : "✨ Organizar"}
              </button>
              <button
                onClick={() => callAI("resumir")}
                disabled={!!aiLoading}
                className="block w-full px-4 py-3 bg-transparent border-none font-body text-[15px]
                  text-foreground text-left cursor-pointer hover:bg-card-hover active:bg-card-hover
                  disabled:opacity-50 disabled:cursor-default transition-colors duration-100"
              >
                {aiLoading === "resumir" ? "⏳ Resumindo..." : "📋 Resumir em Tópicos"}
              </button>
              <button
                onClick={() => callAI("gramatica")}
                disabled={!!aiLoading}
                className="block w-full px-4 py-3 bg-transparent border-none font-body text-[15px]
                  text-foreground text-left cursor-pointer hover:bg-card-hover active:bg-card-hover
                  disabled:opacity-50 disabled:cursor-default transition-colors duration-100"
              >
                {aiLoading === "gramatica" ? "⏳ Corrigindo..." : "📝 Corrigir Gramática"}
              </button>
              <button
                onClick={() => callAI("comentar")}
                disabled={!!aiLoading}
                className="block w-full px-4 py-3 bg-transparent border-none font-body text-[15px]
                  text-foreground text-left cursor-pointer hover:bg-card-hover active:bg-card-hover
                  disabled:opacity-50 disabled:cursor-default transition-colors duration-100"
              >
                {aiLoading === "comentar" ? "⏳ Comentando..." : "💬 Comentar com IA"}
              </button>
              <div className="h-px bg-border-subtle my-1" />
              <button
                onClick={handleShareNote}
                className="block w-full px-4 py-3 bg-transparent border-none font-body text-[15px]
                  text-foreground text-left cursor-pointer hover:bg-card-hover active:bg-card-hover transition-colors duration-100"
              >
                🔗 Compartilhar Link
              </button>
              <button
                onClick={handleGeneratePDF}
                className="block w-full px-4 py-3 bg-transparent border-none font-body text-[15px]
                  text-foreground text-left cursor-pointer hover:bg-card-hover active:bg-card-hover transition-colors duration-100"
              >
                📄 Gerar PDF
              </button>
              <button
                onClick={handlePrint}
                className="block w-full px-4 py-3 bg-transparent border-none font-body text-[15px]
                  text-foreground text-left cursor-pointer hover:bg-card-hover active:bg-card-hover transition-colors duration-100"
              >
                🖨️ Imprimir
              </button>
              <div className="h-px bg-border-subtle my-1" />
              <button
                onClick={() => deleteNote(editingNote.id)}
                className="block w-full px-4 py-3 bg-transparent border-none font-body text-[15px]
                  text-destructive text-left cursor-pointer hover:bg-card-hover active:bg-card-hover transition-colors duration-100"
              >
                🗑️ Remover nota
              </button>
            </div>
          </>
        )}

        {/* Note Search Overlay + TipTap Editor */}
        <div className="relative flex flex-col flex-1 min-h-0" ref={editorContainerRef}>
          <NoteSearchOverlay
            open={noteSearchOpen}
            onClose={() => setNoteSearchOpen(false)}
            editorContainerRef={editorContainerRef}
          />
          <RichTextEditor
            content={editingNote.texto}
            onChange={handleTextChange}
            placeholder="Comece a escrever..."
            onVerseClick={() => setVerseOpen(true)}
            onRecordClick={toggleRecording}
            isRecording={isRecording}
            onBibleRefClick={(ref) => {
              setBibleContextRef(ref);
              setBibleContextOpen(true);
            }}
          />
        </div>

        {/* ── BIBLE CONTEXT PANEL ── */}
        <BibleContextPanel
          open={bibleContextOpen}
          reference={bibleContextRef}
          onClose={() => setBibleContextOpen(false)}
          onInsertVerse={(ref, text) => {
            const verseHtml = `<blockquote><p><strong>[${ref}]</strong></p><p><em>${text}</em></p></blockquote>`;
            handleTextChange(editingNote.texto + verseHtml);
            showToast("Versículo inserido");
          }}
        />

        {/* ── VERSE BOTTOM SHEET ── */}
        <div className={`fixed inset-0 z-[200] transition-opacity duration-250
          ${verseOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={() => setVerseOpen(false)} />
          <div className={`absolute bottom-0 left-0 right-0 bg-card border-t border-border
            rounded-t-[20px] pb-[calc(24px+env(safe-area-inset-bottom,0px))]
            max-h-[80dvh] overflow-y-auto transition-transform duration-350
            ${verseOpen ? "translate-y-0" : "translate-y-full"}`}
            style={{ transitionTimingFunction: "cubic-bezier(.32,0,.15,1)" }}>
            <div className="w-9 h-1 bg-border rounded-full mx-auto mt-3.5 mb-4" />
            <p className="font-display text-[10px] tracking-[4px] uppercase text-muted-foreground text-center mb-4">
              Buscar versículo
            </p>
            <div className="px-5 pb-3">
              {/* Translation toggle */}
              <div className="flex gap-1.5 mb-3.5">
                {[{ key: "almeida", label: "ARC" }, { key: "kjv", label: "KJV" }].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setVerseTranslation(t.key)}
                    className={`flex-1 py-2 px-1 rounded-lg border font-display text-[10px] tracking-wide text-center cursor-pointer transition-all duration-150
                      ${verseTranslation === t.key
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground bg-background hover:border-primary/30"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="flex gap-2 mb-2.5">
                <input
                  value={verseQuery}
                  onChange={e => setVerseQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") doFetchVerse(); }}
                  placeholder="João 3:16"
                  className="flex-1 bg-background border border-border rounded-[10px] text-foreground
                    font-body text-lg px-4 py-2.5 outline-none
                    focus:border-primary placeholder:text-muted-foreground placeholder:italic
                    transition-colors duration-200"
                />
                <button
                  onClick={doFetchVerse}
                  disabled={!verseQuery.trim() || verseLoading}
                  className="px-4 py-2.5 bg-primary/10 border border-primary rounded-[10px]
                    text-primary font-display text-[10px] tracking-wide cursor-pointer shrink-0
                    hover:bg-primary/15 active:opacity-70 disabled:opacity-40 disabled:cursor-default
                    transition-all duration-150"
                >
                  Buscar
                </button>
              </div>

              {/* Status */}
              <p className="font-body text-[13px] italic text-muted-foreground text-center py-2 min-h-[36px]">
                {verseLoading ? "Buscando versículo..."
                  : verseError ? "Não encontrado. Verifique a referência."
                  : !verseResult ? "Ex: Rm 8:28 · Sl 23:1 · Ef 2:8" : ""}
              </p>

              {/* Result */}
              {verseResult && (
                <div className="bg-background border border-border border-l-2 border-l-primary rounded-[10px] p-3.5 mt-1.5">
                  <p className="font-display text-[9px] tracking-[2px] text-primary uppercase mb-2">
                    {verseResult.reference}
                  </p>
                  <p className="font-body text-[17px] leading-relaxed text-foreground italic">
                    {verseResult.text}
                  </p>
                  <div className="flex gap-2 mt-3.5">
                    <button
                      onClick={insertVerse}
                      className="flex-1 py-2.5 rounded-[10px] bg-primary/10 border border-primary
                        text-primary font-display text-[9px] tracking-wide uppercase text-center cursor-pointer
                        hover:bg-primary/15 active:opacity-70 transition-all duration-150"
                    >
                      Inserir
                    </button>
                    <button
                      onClick={copyVerse}
                      className="flex-1 py-2.5 rounded-[10px] bg-transparent border border-border
                        text-muted-foreground font-display text-[9px] tracking-wide uppercase text-center cursor-pointer
                        hover:border-primary/30 active:opacity-70 transition-all duration-150"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── AI RESULT MODAL ── */}
        {aiResult && (
          <div className="fixed inset-0 z-[200] opacity-100 pointer-events-auto transition-opacity duration-250">
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={() => setAiResult(null)} />
            <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border
              rounded-t-[20px] pb-[calc(24px+env(safe-area-inset-bottom,0px))]
              max-h-[85dvh] overflow-y-auto translate-y-0"
              style={{ transition: "transform .35s cubic-bezier(.32,0,.15,1)" }}>
              <div className="w-9 h-1 bg-border rounded-full mx-auto mt-3.5 mb-4" />
              <p className="font-display text-[10px] tracking-[4px] uppercase text-muted-foreground text-center mb-4">
                {aiResult.title}
              </p>
              <div className="px-5 pb-3">
                <div
                  className="font-body text-base leading-relaxed text-foreground mb-4 whitespace-pre-wrap"
                >
                  {aiResult.content}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (editingNote) {
                        handleTextChange(mdToHtml(aiResult.content));
                      }
                      setAiResult(null);
                      showToast(aiResult.title.includes("Gramática") ? "Gramática corrigida!" : "Nota reorganizada!");
                    }}
                    className="w-full py-2.5 rounded-[10px] bg-primary/10 border border-primary
                      text-primary font-display text-[9px] tracking-wide uppercase text-center cursor-pointer
                      hover:bg-primary/15 active:opacity-70 transition-all duration-150"
                  >
                    ✨ Substituir nota
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiResult.content);
                        showToast("Copiado!");
                      }}
                      className="flex-1 py-2.5 rounded-[10px] bg-transparent border border-border
                        text-muted-foreground font-display text-[9px] tracking-wide uppercase text-center cursor-pointer
                        hover:border-primary/30 active:opacity-70 transition-all duration-150"
                    >
                      Copiar
                    </button>
                    <button
                      onClick={() => setAiResult(null)}
                      className="flex-1 py-2.5 rounded-[10px] bg-transparent border border-border
                        text-muted-foreground font-display text-[9px] tracking-wide uppercase text-center cursor-pointer
                        hover:border-primary/30 active:opacity-70 transition-all duration-150"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full
          px-5 py-2 font-display text-[9px] tracking-[2px] uppercase text-muted-foreground
          shadow-elegant-lg z-[999] whitespace-nowrap transition-all duration-250
          ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
          {toast}
        </div>
      </div>
    );
  }

  return null;
}
