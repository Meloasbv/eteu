import { Trophy, Flame, BookOpen, Star, TrendingUp, PanelRightClose, PanelRightOpen, Heart, MessageSquare, X, Check, Trash2, Filter } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FavoriteVerse {
  id: string;
  verse_reference: string;
  verse_text: string;
  reading_day: string;
  comment: string;
  created_at: string;
}

// Bible book order for sorting
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

// Extract book name from a verse reference (e.g. "Sl 23:1" → "Sl", "1 Coríntios 13:4" → "1 Coríntios")
function extractBook(ref: string): string {
  // Match longest known book prefix
  let best = "";
  for (const key of Object.keys(BOOK_ORDER)) {
    if (ref.startsWith(key) && key.length > best.length) best = key;
  }
  return best || ref.split(/\s+\d/)[0] || ref;
}

interface Props {
  totalProgress: number;
  weekProgress: number;
  activeWeek: number;
  totalWeeks: number;
  checked: Record<string, boolean>;
  todayVerse?: string;
  todayRef?: string;
  streakDays: number;
  userCodeId: string;
}

export default function DesktopRightPanel({
  totalProgress, weekProgress, activeWeek, totalWeeks, checked, todayVerse, todayRef, streakDays, userCodeId,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [bookFilter, setBookFilter] = useState<string>("all");
  const completedDays = Object.values(checked).filter(Boolean).length;

  // Unique books present in favorites (sorted by canonical order)
  const availableBooks = useMemo(() => {
    const set = new Set<string>();
    favorites.forEach(f => set.add(extractBook(f.verse_reference)));
    return Array.from(set).sort((a, b) => getBookOrder(a) - getBookOrder(b));
  }, [favorites]);

  const filteredFavorites = useMemo(() => {
    if (bookFilter === "all") return favorites;
    return favorites.filter(f => extractBook(f.verse_reference) === bookFilter);
  }, [favorites, bookFilter]);

  const deleteFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remover este versículo dos favoritos?")) return;
    await supabase.from("favorite_verses").delete().eq("id", id);
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const fetchFavorites = useCallback(async () => {
    const { data } = await supabase
      .from("favorite_verses")
      .select("*")
      .eq("user_code_id", userCodeId);
    if (data) {
      const sorted = (data as FavoriteVerse[]).sort((a, b) => getBookOrder(a.verse_reference) - getBookOrder(b.verse_reference));
      setFavorites(sorted);
    }
  }, [userCodeId]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const saveComment = async (id: string) => {
    await supabase.from("favorite_verses").update({ comment: commentText } as any).eq("id", id);
    setFavorites(prev => prev.map(f => f.id === id ? { ...f, comment: commentText } : f));
    setEditingComment(null);
    setCommentText("");
  };

  const startEditComment = (fav: FavoriteVerse) => {
    setEditingComment(fav.id);
    setCommentText(fav.comment || "");
  };

  if (collapsed) {
    return (
      <aside className="hidden xl:flex flex-col items-center h-screen sticky top-0 w-10 border-l border-border/40 bg-card/30 backdrop-blur-sm">
        <button
          onClick={() => setCollapsed(false)}
          className="mt-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          title="Expandir painel"
        >
          <PanelRightOpen size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden xl:flex flex-col h-screen sticky top-0 w-[280px] border-l border-border/40 bg-card/30 backdrop-blur-sm overflow-y-auto no-scrollbar">
      <div className="p-5 space-y-5">
        {/* Collapse button */}
        <div className="flex justify-end">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            title="Minimizar painel"
          >
            <PanelRightClose size={16} />
          </button>
        </div>

        {/* Weekly Progress */}
        <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border)/0.4)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-primary/60" />
            <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground font-ui font-medium">Progresso Semanal</p>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[32px] font-bold text-foreground font-display leading-none">
              {Math.round(weekProgress * 100)}%
            </span>
            <span className="text-[11px] text-muted-foreground font-ui pb-1">Semana {activeWeek + 1}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-border/40 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${weekProgress * 100}%`,
                background: weekProgress >= 1 ? 'hsl(var(--success))' : 'hsl(var(--primary))',
              }}
            />
          </div>
        </div>

        {/* Overall Progress */}
        <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border)/0.4)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-primary/60" />
            <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground font-ui font-medium">Progresso Total</p>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[28px] font-bold text-foreground font-display leading-none">
              {Math.round(totalProgress * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-border/40 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${totalProgress * 100}%`, background: 'hsl(var(--primary))' }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={<Flame size={16} />} label="Sequência" value={`${streakDays}d`} color="var(--fire)" />
          <StatCard icon={<BookOpen size={16} />} label="Dias lidos" value={`${completedDays}`} color="var(--primary)" />
        </div>

        {/* Verse of the day */}
        {todayVerse && (
          <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border)/0.4)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-primary/60" />
              <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground font-ui font-medium">Versículo do Dia</p>
            </div>
            <blockquote className="text-[13px] leading-relaxed text-foreground/70 italic font-serif">
              "{todayVerse}"
            </blockquote>
            {todayRef && (
              <p className="text-[11px] text-primary/70 mt-2 font-ui">— {todayRef}</p>
            )}
          </div>
        )}

        {/* Favorite Verses */}
        <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border)/0.4)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Heart size={14} className="text-destructive/60" />
            <p className="text-[10px] tracking-[2px] uppercase text-muted-foreground font-ui font-medium">Versículos Favoritos</p>
          </div>

          {favorites.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/50 font-body text-center py-3">
              Nenhum versículo favoritado ainda
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
              {favorites.map(fav => (
                <div key={fav.id} className="rounded-xl p-3 transition-all hover:bg-muted/20"
                  style={{ border: '1px solid hsl(var(--border)/0.3)' }}>
                  <p className="text-[11px] font-semibold text-primary font-ui mb-1">
                    {fav.verse_reference}
                  </p>
                  <p className="text-[12px] leading-relaxed text-foreground/70 italic font-serif line-clamp-3">
                    "{fav.verse_text}"
                  </p>

                  {/* Comment section */}
                  {editingComment === fav.id ? (
                    <div className="mt-2 space-y-1.5">
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Escreva seu comentário..."
                        className="w-full text-[11px] bg-background/50 border border-border/50 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 font-body text-foreground"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setEditingComment(null)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                          <X size={12} />
                        </button>
                        <button onClick={() => saveComment(fav.id)}
                          className="p-1 rounded text-primary hover:text-primary/80 transition-colors">
                          <Check size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditComment(fav)}
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary/70 font-ui transition-colors"
                    >
                      <MessageSquare size={10} />
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
      </div>
    </aside>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border)/0.4)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: `hsl(${color})` }}>
        {icon}
      </div>
      <p className="text-[18px] font-bold text-foreground font-display leading-none mt-1">{value}</p>
      <p className="text-[9px] tracking-[1.5px] uppercase text-muted-foreground font-ui mt-1">{label}</p>
    </div>
  );
}
