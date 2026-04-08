import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, MoreVertical, Check } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import type { StudyNote } from "./NotebookList";

const CATEGORIES = ["Exegese", "Teologia", "Sermões", "Devocionais", "Aulas", "Pessoal"];

interface Props {
  note: StudyNote;
  onUpdate: (note: StudyNote) => void;
  onBack: () => void;
  onDelete: () => void;
}

export default function NoteEditor({ note, onUpdate, onBack, onDelete }: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState(note.category);
  const [showMenu, setShowMenu] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;

  const save = useCallback(() => {
    onUpdate({
      ...note,
      title,
      content,
      category,
      wordCount,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [note, title, content, category, wordCount, onUpdate]);

  // Autosave with debounce
  useEffect(() => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(save, 2000);
    return () => clearTimeout(saveTimeout.current);
  }, [title, content, category]);

  const handleShare = async () => {
    const text = content.replace(/<[^>]*>/g, '');
    if (navigator.share) {
      try { await navigator.share({ title, text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
    }
    setShowMenu(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <button onClick={() => { save(); onBack(); }} className="w-10 h-10 flex items-center justify-center text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[11px] text-success font-ui animate-fade-in">
              <Check size={12} /> Salvo
            </span>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 flex items-center justify-center text-muted-foreground">
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg z-30 py-1 animate-fade-in"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                <button onClick={handleShare} className="w-full text-left px-4 py-2.5 text-sm font-ui text-foreground hover:bg-accent/10">📤 Compartilhar</button>
                <button onClick={() => { navigator.clipboard.writeText(content.replace(/<[^>]*>/g, '')); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-ui text-foreground hover:bg-accent/10">📋 Copiar tudo</button>
                <button onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-ui text-destructive hover:bg-destructive/10">🗑️ Excluir</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title input */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título do Estudo"
        className="mx-4 mt-3 text-xl font-body font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
      />

      {/* Category selector */}
      <div className="flex gap-2 px-4 mt-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-3 py-1 rounded-xl text-[10px] font-ui font-semibold uppercase tracking-wider shrink-0 transition-all"
            style={{
              background: category === cat ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.08)',
              color: category === cat ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 mt-2 overflow-hidden">
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Comece a escrever seu estudo…"
          minHeight="calc(100dvh - 280px)"
        />
      </div>

      {/* Word count */}
      <div className="px-4 py-1 text-[10px] text-muted-foreground font-ui text-right">
        {wordCount} palavras
      </div>
    </div>
  );
}
