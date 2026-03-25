import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Note = {
  id: string;
  categoria: string;
  semana: string;
  texto: string;
  created_at: string;
  updated_at: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  proclamadores: "🏴",
  aulas: "📖",
  pensamentos: "💭",
  devocionais: "🔥",
};

const CATEGORY_LABELS: Record<string, string> = {
  proclamadores: "Track Proclamadores",
  aulas: "Aulas",
  pensamentos: "Pensamentos",
  devocionais: "Devocionais",
};

// Bible reference regex - matches patterns like "João 3:16", "Gn 1:1", "2 Co 5:17"
const BIBLE_REF_REGEX = /\b(\d?\s*[A-ZÀ-Ú][a-záàâãéêíóôõúç]+)\s+(\d{1,3})[:\.](\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\b/gi;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), `<mark class="bg-primary/30 text-foreground rounded px-0.5">$1</mark>`);
}

function wordCount(text: string): number {
  const stripped = stripHtml(text);
  return stripped ? stripped.split(/\s+/).length : 0;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Library({
  userCodeId,
  onOpenNote,
}: {
  userCodeId: string;
  onOpenNote?: (noteId: string) => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bibleRefQuery, setBibleRefQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "alpha">("recent");

  // Load all notes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("notes")
        .select("*")
        .eq("user_code_id", userCodeId)
        .order("updated_at", { ascending: false });

      if (!error && data) setNotes(data);
      setLoading(false);
    };
    load();
  }, [userCodeId]);

  // Filter and sort
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Category filter
    if (filterCategory) {
      result = result.filter(n => n.categoria === filterCategory);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => stripHtml(n.texto).toLowerCase().includes(q));
    }

    // Bible reference search
    if (bibleRefQuery.trim()) {
      const q = bibleRefQuery.toLowerCase().replace(/\s+/g, "");
      result = result.filter(n => {
        const text = stripHtml(n.texto).toLowerCase().replace(/\s+/g, "");
        return text.includes(q);
      });
    }

    // Sort
    switch (sortBy) {
      case "recent":
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        break;
      case "alpha":
        result.sort((a, b) => {
          const ta = stripHtml(a.texto).slice(0, 50).toLowerCase();
          const tb = stripHtml(b.texto).slice(0, 50).toLowerCase();
          return ta.localeCompare(tb);
        });
        break;
    }

    return result;
  }, [notes, searchQuery, bibleRefQuery, filterCategory, sortBy]);

  // Extract all Bible references from a note
  const extractRefs = useCallback((text: string): string[] => {
    const stripped = stripHtml(text);
    const matches = stripped.match(BIBLE_REF_REGEX);
    return matches ? [...new Set(matches)] : [];
  }, []);

  const notePreview = useCallback((texto: string) => {
    const stripped = stripHtml(texto);
    const lines = stripped.split(/\n/).filter(l => l.trim());
    return lines.slice(0, 3).join(" ").slice(0, 150) || "Sem conteúdo";
  }, []);

  const noteTitle = useCallback((texto: string) => {
    const stripped = stripHtml(texto);
    const first = stripped.split("\n")[0]?.trim().replace(/^#{1,3}\s*/, "");
    return first?.slice(0, 60) || "Sem título";
  }, []);

  return (
    <div className="px-4 pt-5 pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <p className="font-display text-[10px] tracking-[3px] uppercase text-muted-foreground font-semibold mb-1">
          📚 Biblioteca
        </p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Pesquise em todas as suas anotações
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Pesquisar em todas as notas..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-input text-foreground text-[14px]
            placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      {/* Bible reference search */}
      <div className="relative mb-4">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">✝️</span>
        <input
          type="text"
          value={bibleRefQuery}
          onChange={e => setBibleRefQuery(e.target.value)}
          placeholder="Buscar por referência bíblica (ex: João 3:16)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input text-foreground text-[13px]
            placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      {/* Filters row */}
      <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilterCategory(null)}
          className={`px-3 py-1.5 rounded-full text-[12px] border cursor-pointer whitespace-nowrap transition-all
            ${!filterCategory ? "border-primary/40 bg-primary/10 text-primary font-semibold" : "border-border bg-card/50 text-muted-foreground"}`}
        >
          Todas
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(filterCategory === key ? null : key)}
            className={`px-3 py-1.5 rounded-full text-[12px] border cursor-pointer whitespace-nowrap transition-all
              ${filterCategory === key ? "border-primary/40 bg-primary/10 text-primary font-semibold" : "border-border bg-card/50 text-muted-foreground"}`}
          >
            {CATEGORY_ICONS[key]} {label}
          </button>
        ))}
      </div>

      {/* Sort row */}
      <div className="flex gap-2 mb-5">
        {([
          { key: "recent" as const, label: "Recentes" },
          { key: "oldest" as const, label: "Antigas" },
          { key: "alpha" as const, label: "A-Z" },
        ]).map(s => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            className={`px-3 py-1 rounded-lg text-[11px] border cursor-pointer transition-all
              ${sortBy === s.key ? "border-primary/30 bg-primary/5 text-primary" : "border-border bg-transparent text-muted-foreground"}`}
          >
            {s.label}
          </button>
        ))}
        <span className="flex-1" />
        <span className="text-[12px] text-muted-foreground self-center">
          {filteredNotes.length} {filteredNotes.length === 1 ? "nota" : "notas"}
        </span>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-card/50 border border-border animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-muted-foreground text-[14px]">
            {searchQuery || bibleRefQuery ? "Nenhuma nota encontrada" : "Nenhuma nota criada ainda"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotes.map(note => {
            const title = noteTitle(note.texto);
            const preview = notePreview(note.texto);
            const words = wordCount(note.texto);
            const refs = extractRefs(note.texto);

            return (
              <div
                key={note.id}
                onClick={() => onOpenNote?.(note.id)}
                className="rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/20
                  p-4 cursor-pointer transition-all duration-200 relative overflow-hidden group"
              >
                {/* Top color accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px] opacity-40 bg-gradient-to-r from-primary to-transparent" />

                <div className="flex items-start gap-3">
                  {/* Category icon */}
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-lg shrink-0 mt-0.5">
                    {CATEGORY_ICONS[note.categoria] || "📝"}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3
                      className="text-[15px] font-semibold text-foreground mb-1 truncate"
                      dangerouslySetInnerHTML={{
                        __html: searchQuery ? highlightText(title, searchQuery) : title,
                      }}
                    />

                    {/* Preview */}
                    <p
                      className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 mb-2"
                      dangerouslySetInnerHTML={{
                        __html: searchQuery ? highlightText(preview, searchQuery) : preview,
                      }}
                    />

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(note.updated_at)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">
                        {words} {words === 1 ? "palavra" : "palavras"}
                      </span>

                      {/* Category badge */}
                      <span className="px-2 py-0.5 rounded-full bg-primary/8 border border-primary/15 text-[10px] text-primary font-medium">
                        {CATEGORY_LABELS[note.categoria] || note.categoria}
                      </span>

                      {/* Bible refs */}
                      {refs.slice(0, 3).map((ref, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-accent/8 border border-accent/15 text-[10px] text-accent font-medium">
                          {ref}
                        </span>
                      ))}
                      {refs.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{refs.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
