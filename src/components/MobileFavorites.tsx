import { useState, useEffect, useCallback, useMemo } from "react";
import { Heart, Trash2, Filter, ChevronDown, ChevronUp, MessageSquare, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FavoriteVerse {
  id: string;
  verse_reference: string;
  verse_text: string;
  reading_day: string;
  comment: string;
  created_at: string;
}

const BOOK_ORDER: Record<string, number> = {
  "Gn": 1, "Gênesis": 1, "Ex": 2, "Êxodo": 2, "Lv": 3, "Levítico": 3, "Nm": 4, "Números": 4, "Dt": 5, "Deuteronômio": 5,
  "Js": 6, "Josué": 6, "Jz": 7, "Juízes": 7, "Rt": 8, "Rute": 8, "I Sm": 9, "1 Samuel": 9, "II Sm": 10, "2 Samuel": 10,
  "I Rs": 11, "1 Reis": 11, "II Rs": 12, "2 Reis": 12, "I Cr": 13, "1 Crônicas": 13, "II Cr": 14, "2 Crônicas": 14,
  "Ed": 15, "Esdras": 15, "Ne": 16, "Neemias": 16, "Et": 17, "Ester": 17, "Jó": 18,
  "Sl": 19, "Salmos": 19, "Salmo": 19, "Pv": 20, "Provérbios": 20, "Ec": 21, "Eclesiastes": 21, "Ct": 22, "Cantares": 22,
  "Is": 23, "Isaías": 23, "Jr": 24, "Jeremias": 24, "Lm": 25, "Lamentações": 25, "Ez": 26, "Ezequiel": 26, "Dn": 27, "Daniel": 27,
  "Os": 28, "Oséias": 28, "Jl": 29, "Joel": 29, "Am": 30, "Amós": 30, "Ob": 31, "Obadias": 31, "Jn": 32, "Jonas": 32,
  "Mq": 33, "Miquéias": 33, "Na": 34, "Naum": 34, "Hc": 35, "Habacuque": 35, "Sf": 36, "Sofonias": 36, "Ag": 37, "Ageu": 37,
  "Zc": 38, "Zacarias": 38, "Ml": 39, "Malaquias": 39,
  "Mt": 40, "Mateus": 40, "Mc": 41, "Marcos": 41, "Lc": 42, "Lucas": 42, "Jo": 43, "João": 43,
  "At": 44, "Atos": 44, "Rm": 45, "Romanos": 45, "I Co": 46, "1 Coríntios": 46, "II Co": 47, "2 Coríntios": 47,
  "Gl": 48, "Gálatas": 48, "Ef": 49, "Efésios": 49, "Fp": 50, "Filipenses": 50, "Cl": 51, "Colossenses": 51,
  "I Ts": 52, "1 Tessalonicenses": 52, "II Ts": 53, "2 Tessalonicenses": 53, "I Tm": 54, "1 Timóteo": 54, "II Tm": 55, "2 Timóteo": 55,
  "Tt": 56, "Tito": 56, "Fm": 57, "Filemom": 57, "Hb": 58, "Hebreus": 58, "Tg": 59, "Tiago": 59,
  "I Pe": 60, "1 Pedro": 60, "II Pe": 61, "2 Pedro": 61, "I Jo": 62, "1 João": 62, "II Jo": 63, "2 João": 63, "III Jo": 64, "3 João": 64,
  "Jd": 65, "Judas": 65, "Ap": 66, "Apocalipse": 66,
};

function getBookOrder(ref: string): number {
  for (const [key, order] of Object.entries(BOOK_ORDER)) {
    if (ref.startsWith(key)) return order;
  }
  return 999;
}

function extractBook(ref: string): string {
  let best = "";
  for (const key of Object.keys(BOOK_ORDER)) {
    if (ref.startsWith(key) && key.length > best.length) best = key;
  }
  return best || ref.split(/\s+\d/)[0] || ref;
}

interface Props {
  userCodeId: string;
}

export default function MobileFavorites({ userCodeId }: Props) {
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [bookFilter, setBookFilter] = useState("all");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    const { data } = await supabase
      .from("favorite_verses")
      .select("*")
      .eq("user_code_id", userCodeId);
    if (data) {
      const sorted = (data as FavoriteVerse[]).sort(
        (a, b) => getBookOrder(a.verse_reference) - getBookOrder(b.verse_reference)
      );
      setFavorites(sorted);
    }
  }, [userCodeId]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const availableBooks = useMemo(() => {
    const set = new Set<string>();
    favorites.forEach(f => set.add(extractBook(f.verse_reference)));
    return Array.from(set).sort((a, b) => getBookOrder(a) - getBookOrder(b));
  }, [favorites]);

  const filtered = useMemo(() => {
    if (bookFilter === "all") return favorites;
    return favorites.filter(f => extractBook(f.verse_reference) === bookFilter);
  }, [favorites, bookFilter]);

  const deleteFavorite = async (id: string) => {
    await supabase.from("favorite_verses").delete().eq("id", id);
    setFavorites(prev => prev.filter(f => f.id !== id));
    setConfirmDelete(null);
  };

  const saveComment = async (id: string) => {
    await supabase.from("favorite_verses").update({ comment: commentText } as any).eq("id", id);
    setFavorites(prev => prev.map(f => f.id === id ? { ...f, comment: commentText } : f));
    setEditingComment(null);
    setCommentText("");
  };

  if (favorites.length === 0) return null;

  return (
    <div className="mx-4 mt-5 rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.4)' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 active:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Heart size={16} className="text-destructive/70" />
          <span className="text-[11px] tracking-[2px] uppercase text-muted-foreground font-ui font-medium">
            Versículos Favoritos
          </span>
          <span className="text-[10px] text-muted-foreground/50 font-ui">{favorites.length}</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {/* Book filter */}
          {availableBooks.length > 1 && (
            <div className="mb-3 flex items-center gap-2">
              <Filter size={12} className="text-muted-foreground/40 shrink-0" />
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setBookFilter("all")}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-ui transition-all"
                  style={{
                    background: bookFilter === "all" ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                    color: bookFilter === "all" ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    border: bookFilter === "all" ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid hsl(var(--border) / 0.4)',
                  }}
                >
                  Todos
                </button>
                {availableBooks.map(b => (
                  <button
                    key={b}
                    onClick={() => setBookFilter(b)}
                    className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-ui transition-all"
                    style={{
                      background: bookFilter === b ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                      color: bookFilter === b ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      border: bookFilter === b ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid hsl(var(--border) / 0.4)',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/50 font-body text-center py-3">
              Nenhum favorito neste livro
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto no-scrollbar">
              {filtered.map(fav => (
                <div
                  key={fav.id}
                  className="rounded-xl p-3.5 relative"
                  style={{ border: '1px solid hsl(var(--border) / 0.3)', background: 'hsl(var(--background) / 0.5)' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[12px] font-semibold text-primary font-ui">{fav.verse_reference}</p>
                    {confirmDelete === fav.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteFavorite(fav.id)}
                          className="p-1.5 rounded-md text-destructive bg-destructive/10 text-[10px] font-ui"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="p-1.5 rounded-md text-muted-foreground"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(fav.id)}
                        className="p-1.5 -m-1 rounded-md text-muted-foreground/40 active:text-destructive active:bg-destructive/10 transition-colors"
                        aria-label="Remover dos favoritos"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-[13px] leading-relaxed text-foreground/70 italic font-serif">
                    "{fav.verse_text}"
                  </p>

                  {/* Comment */}
                  {editingComment === fav.id ? (
                    <div className="mt-2 space-y-1.5">
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Escreva seu comentário..."
                        className="w-full text-[12px] bg-background border border-border/50 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 font-body text-foreground"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => setEditingComment(null)} className="p-1.5 rounded-md text-muted-foreground">
                          <X size={14} />
                        </button>
                        <button onClick={() => saveComment(fav.id)} className="p-1.5 rounded-md text-primary">
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingComment(fav.id); setCommentText(fav.comment || ""); }}
                      className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/50 active:text-primary/70 font-ui transition-colors min-h-[32px]"
                    >
                      <MessageSquare size={11} />
                      {fav.comment ? (
                        <span className="text-foreground/50 italic line-clamp-1">{fav.comment}</span>
                      ) : (
                        <span>Adicionar comentário</span>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
