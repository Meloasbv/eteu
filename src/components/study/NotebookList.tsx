import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, NotebookPen } from "lucide-react";
import NoteEditor from "./NoteEditor";

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  category: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "fascinacao_study_notes";
const CATEGORIES = ["Todos", "Exegese", "Teologia", "Sermões", "Devocionais", "Aulas", "Pessoal"];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} dias atrás`;
  const weeks = Math.floor(days / 7);
  return `${weeks} sem atrás`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function NotebookList({ userCodeId }: { userCodeId: string }) {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setNotes(JSON.parse(saved));
    } catch {}
  }, []);

  const saveNotes = useCallback((updated: StudyNote[]) => {
    setNotes(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, []);

  const createNote = () => {
    const now = new Date().toISOString();
    const note: StudyNote = {
      id: Date.now().toString(),
      title: "",
      content: "",
      category: "Pessoal",
      wordCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    saveNotes([note, ...notes]);
    setEditingNote(note);
  };

  const updateNote = useCallback((updated: StudyNote) => {
    saveNotes(notes.map(n => n.id === updated.id ? updated : n));
    setEditingNote(updated);
  }, [notes, saveNotes]);

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
    if (editingNote?.id === id) setEditingNote(null);
  };

  if (editingNote) {
    return (
      <NoteEditor
        note={editingNote}
        onUpdate={updateNote}
        onBack={() => setEditingNote(null)}
        onDelete={() => deleteNote(editingNote.id)}
      />
    );
  }

  const filtered = notes.filter(n => {
    if (category !== "Todos" && n.category !== category) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto pb-24 lg:pb-8">
      {/* Wrapper centrado, dá ar de "página" */}
      <div className="mx-auto max-w-4xl px-4 lg:px-10 pt-6 lg:pt-10">

        {/* Breadcrumb editorial */}
        <p className="breadcrumb-soft mb-2">Caderno · Estudos</p>

        {/* Título editorial */}
        <header className="flex items-end justify-between gap-4 mb-1">
          <h1 className="editorial-title text-[28px] lg:text-[40px]">
            Caderno
          </h1>
          <span className="text-[11px] font-ui text-muted-foreground hidden sm:inline-block">
            {formatDate(new Date().toISOString())}
          </span>
        </header>
        <p className="font-body italic text-muted-foreground text-[14px] lg:text-[15px] mb-8">
          Um espaço silencioso para escrever, pensar e orar.
        </p>

        {/* Folha de papel */}
        <div className="paper-sheet px-5 py-6 lg:px-10 lg:py-8">

          {/* Busca + nova nota */}
          <div className="flex items-center gap-2 mb-5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar nos estudos…"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] font-ui bg-transparent transition-all focus:outline-none"
                style={{
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
              />
            </div>
            <button
              onClick={createNote}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-ui font-medium transition-all"
              style={{
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              <Plus size={14} /> Nova nota
            </button>
          </div>

          {/* Filtros de categoria — chips minimalistas */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto no-scrollbar">
            {CATEGORIES.map(cat => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="shrink-0 px-3 py-1 rounded-full text-[11px] font-ui transition-all"
                  style={{
                    background: active ? "hsl(var(--foreground))" : "transparent",
                    color: active ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                    border: active ? "1px solid hsl(var(--foreground))" : "1px solid hsl(var(--border))",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Lista — linhas de caderno */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <NotebookPen size={32} className="mx-auto mb-4 text-muted-foreground/40" strokeWidth={1.2} />
              <p className="font-body italic text-muted-foreground text-[14px]">
                {notes.length === 0
                  ? "Sua primeira página em branco te espera."
                  : "Nenhum estudo encontrado."}
              </p>
              {notes.length === 0 && (
                <button
                  onClick={createNote}
                  className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-ui transition-all"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  <Plus size={14} /> Começar a escrever
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: "hsl(var(--border))" }}>
              {filtered.map(note => (
                <li
                  key={note.id}
                  onClick={() => setEditingNote(note)}
                  className="group cursor-pointer py-4 lg:py-5 transition-colors hover:bg-foreground/[0.015] rounded-md px-2 -mx-2"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="editorial-title text-[18px] lg:text-[20px] truncate">
                      {note.title || <span className="italic text-muted-foreground/70">Sem título</span>}
                    </h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all p-1"
                      aria-label="Excluir nota"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="font-body text-[14px] lg:text-[15px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {note.content.replace(/<[^>]*>/g, "").slice(0, 200) || "Página em branco"}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-ui text-muted-foreground/80">
                    <span>{timeAgo(note.updatedAt)}</span>
                    <span className="opacity-40">·</span>
                    <span>{note.wordCount} palavras</span>
                    <span className="opacity-40">·</span>
                    <span className="uppercase tracking-[1.5px]">{note.category}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rodapé editorial */}
        <p className="text-center text-[10px] font-ui tracking-[2.5px] uppercase text-muted-foreground/50 mt-8 mb-4">
          {notes.length} {notes.length === 1 ? "nota" : "notas"} no caderno
        </p>
      </div>
    </div>
  );
}
