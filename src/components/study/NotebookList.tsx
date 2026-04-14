import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2 } from "lucide-react";
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
    <div className="flex flex-col flex-1 px-4 pb-24 overflow-y-auto">
      {/* Search */}
      <div className="relative mt-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar nos estudos..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-ui transition-all"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
            outline: 'none',
          }}
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-ui font-semibold tracking-wider uppercase shrink-0 transition-all"
            style={{
              background: category === cat ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.08)',
              color: category === cat ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notes list */}
      <div className="space-y-2 mt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 opacity-50">📓</div>
            <p className="text-muted-foreground text-sm">Nenhum estudo encontrado</p>
          </div>
        ) : (
          filtered.map(note => (
            <div
              key={note.id}
              onClick={() => setEditingNote(note)}
              className="p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-body text-[15px] font-bold text-foreground truncate">
                    {note.title || "Sem título"}
                  </h3>
                  <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                    {note.content.replace(/<[^>]*>/g, '').slice(0, 80) || "Vazio"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-muted-foreground font-ui">{timeAgo(note.updatedAt)}</span>
                    <span className="text-[11px] text-muted-foreground">•</span>
                    <span className="text-[11px] text-muted-foreground font-ui">{note.wordCount}w</span>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-ui font-semibold uppercase tracking-wider"
                      style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                      {note.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={createNote}
        className="fixed bottom-[calc(var(--tab-bar-height)+16px)] right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-20 transition-all active:scale-90"
        style={{ background: 'hsl(var(--primary))', boxShadow: '0 4px 20px hsl(var(--primary) / 0.3)' }}
      >
        <Plus size={24} className="text-primary-foreground" />
      </button>
    </div>
  );
}
