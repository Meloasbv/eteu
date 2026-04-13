import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Bookmark, PenLine, Volume2, VolumeX, MoreHorizontal, X, Sparkles } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import ReactMarkdown from "react-markdown";

// ── Types & Data ──

interface DevDay {
  day: string;
  ref: string;
  verseText?: string;
  summary: string;
  exegese?: string;
}

interface DevWeek {
  period: string;
  days: DevDay[];
}

interface Props {
  devotionals: DevWeek[];
  aprilCalendar: Record<number, string>;
  aprilThemes: { week: string; theme: string; color: string }[];
  onSaveNote: (text: string) => void;
}

// ── Component ──

export default function DevotionalTab({ devotionals, aprilCalendar, aprilThemes, onSaveNote }: Props) {
  const now = new Date();
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const todayName = dayNames[now.getDay()];
  const year = now.getFullYear();

  // Find today's devotional
  let todayDev: DevDay & { period: string } | null = null;

  for (const week of devotionals) {
    const [startStr, endStr] = week.period.split(" a ");
    const [sd, sm] = startStr.split("/").map(Number);
    const [ed, em] = endStr.split("/").map(Number);
    const start = new Date(year, sm - 1, sd);
    const end = new Date(year, em - 1, ed, 23, 59, 59);
    if (now >= start && now <= end) {
      const match = week.days.find(d => d.day === todayName);
      if (match) todayDev = { ...match, period: week.period };
      break;
    }
  }

  // April fallback
  if (!todayDev && now.getMonth() === 3) {
    const todayDate = now.getDate();
    const ref = aprilCalendar[todayDate];
    if (ref) {
      const weekTheme = aprilThemes.find(t => {
        const [s, e] = t.week.split("–").map(Number);
        return todayDate >= s && todayDate <= (e < s ? e + 30 : e);
      });
      todayDev = {
        ref,
        summary: weekTheme?.theme || "Estudo bíblico",
        day: todayName,
        period: `Abril ${year}`,
        verseText: undefined,
      };
    }
  }

  // States
  const [reflection, setReflection] = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const [showExegesis, setShowExegesis] = useState(false);
  const [exegeseResult, setExegeseResult] = useState<string | null>(null);
  const [exegeseLoading, setExegeseLoading] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [expandedDev, setExpandedDev] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showMore, setShowMore] = useState(false);
  
  // Audio
  const [speaking, setSpeaking] = useState(false);

  // Verse fetching for non-almeida
  const [verseText, setVerseText] = useState<string | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);

  // Auto-fetch verse text if missing
  useEffect(() => {
    if (todayDev?.verseText) {
      setVerseText(todayDev.verseText);
      return;
    }
    if (!todayDev?.ref) return;
    setVerseLoading(true);
    fetch(`https://bible-api.com/${encodeURIComponent(todayDev.ref)}?translation=almeida`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.text) setVerseText(data.text.trim());
      })
      .catch(() => {})
      .finally(() => setVerseLoading(false));
  }, [todayDev?.ref, todayDev?.verseText]);

  // Auto-fetch exegesis
  useEffect(() => {
    if (!todayDev?.ref || !verseText || exegeseResult || exegeseLoading) return;
    setExegeseLoading(true);
    supabase.functions.invoke("verse-exegesis", {
      body: { verse: todayDev.ref, verseText },
    }).then(({ data, error }) => {
      if (!error && data?.result) setExegeseResult(data.result);
    }).finally(() => setExegeseLoading(false));
  }, [todayDev?.ref, verseText]);

  const toggleSpeak = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = verseText || "";
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "pt-BR";
    utt.rate = 0.85;
    utt.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
    setSpeaking(true);
  }, [speaking, verseText]);

  const saveReflection = () => {
    if (!reflection.trim()) return;
    onSaveNote(`# Reflexão: ${todayDev?.ref}\n\n${reflection}`);
    setReflection("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Format date nicely
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const renderExegeseMd = (text: string) => {
    return (
      <div className="devotional-exegesis">
        <ReactMarkdown
          components={{
            h2: ({ children }) => <h2 className="font-serif text-lg text-foreground mt-8 mb-3 font-semibold">{children}</h2>,
            h3: ({ children }) => <h3 className="font-serif text-base text-foreground mt-6 mb-2 font-medium">{children}</h3>,
            p: ({ children }) => <p className="text-[15px] leading-[2] text-foreground/80 mb-4">{children}</p>,
            strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
            em: ({ children }) => <em className="text-foreground/60 font-serif">{children}</em>,
            li: ({ children }) => <li className="text-[15px] leading-[1.9] text-foreground/80 ml-4 mb-2">• {children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary/30 pl-5 py-2 my-5 italic text-foreground/70 font-serif text-[16px] leading-[1.8]">
                {children}
              </blockquote>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  // ── EMPTY STATE ──
  if (!todayDev) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8">
        <div className="text-6xl mb-6 opacity-40">✝️</div>
        <p className="font-serif text-xl text-foreground/60 text-center leading-relaxed italic">
          "Aquietai-vos, e sabei que eu sou Deus"
        </p>
        <p className="text-sm text-foreground/30 mt-3 font-serif">— Salmos 46:10</p>
      </div>
    );
  }

  return (
    <div className="devotional-container">
      {/* ── SACRED HEADER ── */}
      <div className="px-6 pt-8 pb-2">
        <p className="text-[11px] text-foreground/30 font-serif italic tracking-wide capitalize">
          {dateStr}
        </p>
      </div>

      {/* ── VERSE SECTION ── */}
      <div className="px-6 pt-4 pb-6">
        {/* Reference */}
        <p className="text-[11px] text-primary/60 font-medium tracking-[3px] uppercase mb-5">
          {todayDev.ref}
        </p>

        {/* Verse text — the hero */}
        {verseLoading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary/60 rounded-full animate-spin" />
          </div>
        ) : verseText ? (
          <blockquote className="font-serif text-[22px] leading-[1.85] text-foreground/90 italic tracking-wide">
            "{verseText}"
          </blockquote>
        ) : null}

        {/* Subtle divider */}
        <div className="flex justify-center mt-8 mb-2">
          <div className="w-8 h-px bg-primary/20" />
        </div>
      </div>

      {/* ── REFLECTION / SUMMARY ── */}
      <div className="px-6 pb-6">
        <p className="text-[15px] leading-[2] text-foreground/60 font-serif">
          {todayDev.summary}
        </p>
      </div>

      {/* ── INLINE EXEGESIS (preloaded) ── */}
      {todayDev.exegese && (
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowExegesis(!showExegesis)}
            className="flex items-center gap-2 text-[11px] text-primary/50 font-medium tracking-[2px] uppercase hover:text-primary/80 transition-colors"
          >
            <span>Palavra por palavra</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${showExegesis ? "rotate-180" : ""}`} />
          </button>
          {showExegesis && (
            <div className="mt-6 animate-fade-in">
              {(() => {
                const entries = parseExegeseEntries(todayDev.exegese!);
                if (entries.length > 0) {
                  return (
                    <div className="space-y-5">
                      {entries.map((e, i) => (
                        <div key={i} className="border-l-2 border-primary/15 pl-5">
                          <p className="text-[15px] font-semibold text-foreground/90">
                            "{e.word}" <span className="text-[12px] font-normal text-foreground/40 italic font-serif">{e.origin}</span>
                          </p>
                          <p className="text-[14px] leading-[1.8] text-foreground/55 mt-1">{e.definition}</p>
                        </div>
                      ))}
                    </div>
                  );
                }
                return <div className="text-[14px] leading-[1.9] text-foreground/60 whitespace-pre-wrap font-serif">{todayDev.exegese}</div>;
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── AI EXEGESIS (auto-loaded) ── */}
      {!todayDev.exegese && exegeseResult && (
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowExegesis(!showExegesis)}
            className="flex items-center gap-2 text-[11px] text-primary/50 font-medium tracking-[2px] uppercase hover:text-primary/80 transition-colors"
          >
            <Sparkles size={12} />
            <span>Estudo exegético</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${showExegesis ? "rotate-180" : ""}`} />
          </button>
          {showExegesis && (
            <div className="mt-6 animate-fade-in">
              {renderExegeseMd(exegeseResult)}
            </div>
          )}
        </div>
      )}

      {exegeseLoading && !exegeseResult && (
        <div className="px-6 pb-6 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary/50 rounded-full animate-spin" />
          <span className="text-[12px] text-foreground/30 italic font-serif">Preparando estudo exegético...</span>
        </div>
      )}

      {/* ── APPLICATION (if we have exegesis data) ── */}
      {todayDev.exegese && (() => {
        const note = getTheologicalNote(todayDev.exegese!);
        if (!note) return null;
        return (
          <div className="px-6 pb-8">
            <div className="border-t border-foreground/5 pt-6">
              <p className="text-[11px] text-foreground/25 font-medium tracking-[2px] uppercase mb-3">Aplicação</p>
              <p className="text-[15px] leading-[2] text-foreground/55 font-serif italic">{note}</p>
            </div>
          </div>
        );
      })()}

      {/* ── MINIMAL ACTIONS ── */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setShowReflection(!showReflection)}
            className="flex flex-col items-center gap-1.5 text-foreground/30 hover:text-primary/60 transition-colors active:scale-95"
          >
            <PenLine size={20} strokeWidth={1.5} />
            <span className="text-[9px] tracking-[1.5px] uppercase">Refletir</span>
          </button>

          <button
            onClick={() => {
              onSaveNote(`# ${todayDev?.ref}\n\n> "${verseText || ""}"\n\n${todayDev?.summary || ""}`);
              setSaved(true);
              setTimeout(() => setSaved(false), 2500);
            }}
            className="flex flex-col items-center gap-1.5 text-foreground/30 hover:text-primary/60 transition-colors active:scale-95"
          >
            <Bookmark size={20} strokeWidth={1.5} />
            <span className="text-[9px] tracking-[1.5px] uppercase">Salvar</span>
          </button>

          <button
            onClick={toggleSpeak}
            className={`flex flex-col items-center gap-1.5 transition-colors active:scale-95 ${speaking ? "text-primary/60" : "text-foreground/30 hover:text-primary/60"}`}
          >
            {speaking ? <VolumeX size={20} strokeWidth={1.5} /> : <Volume2 size={20} strokeWidth={1.5} />}
            <span className="text-[9px] tracking-[1.5px] uppercase">{speaking ? "Parar" : "Ouvir"}</span>
          </button>

          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center gap-1.5 text-foreground/30 hover:text-primary/60 transition-colors active:scale-95"
          >
            <MoreHorizontal size={20} strokeWidth={1.5} />
            <span className="text-[9px] tracking-[1.5px] uppercase">Mais</span>
          </button>
        </div>
      </div>

      {/* ── MORE MENU (secondary features) ── */}
      {showMore && (
        <div className="px-6 pb-6 animate-fade-in">
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'hsl(var(--card) / 0.5)', border: '1px solid hsl(var(--border) / 0.3)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-foreground/30 tracking-[2px] uppercase">Ferramentas</span>
              <button onClick={() => setShowMore(false)} className="text-foreground/20 hover:text-foreground/40"><X size={14} /></button>
            </div>
            <button
              onClick={() => { setShowArchive(!showArchive); setShowMore(false); }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] text-foreground/50 hover:text-foreground/70 hover:bg-foreground/5 transition-all"
            >
              📖 Ver todos os devocionais
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(`${todayDev?.ref}\n\n"${verseText || ""}"\n\n${todayDev?.summary || ""}`); setSaved(true); setTimeout(() => setSaved(false), 2500); setShowMore(false); }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] text-foreground/50 hover:text-foreground/70 hover:bg-foreground/5 transition-all"
            >
              📋 Copiar devocional
            </button>
          </div>
        </div>
      )}

      {/* ── REFLECTION JOURNAL ── */}
      {showReflection && (
        <div className="px-6 pb-8 animate-fade-in">
          <div className="border-t border-foreground/5 pt-6">
            <p className="text-[11px] text-foreground/25 font-medium tracking-[2px] uppercase mb-4">Minha reflexão</p>

            <div className="space-y-3 mb-4">
              {["O que Deus está me dizendo?", "Como isso se aplica hoje?", "Pelo que sou grato?"].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setReflection(prev => prev + (prev ? "\n" : "") + `<p>${prompt}</p>`)}
                  className="block text-left text-[13px] text-foreground/30 hover:text-foreground/50 italic font-serif transition-colors"
                >
                  — {prompt}
                </button>
              ))}
            </div>

            <div className="devotional-editor">
              <RichTextEditor
                content={reflection}
                onChange={setReflection}
                placeholder="Escreva livremente..."
                minHeight="120px"
              />
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={saveReflection}
                disabled={!reflection.trim()}
                className="px-6 py-2.5 rounded-full text-[11px] tracking-[1.5px] uppercase font-medium transition-all disabled:opacity-20 active:scale-95"
                style={{
                  background: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                  border: '1px solid hsl(var(--primary) / 0.2)',
                }}
              >
                Salvar reflexão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRAYER SECTION ── */}
      <div className="px-6 pb-10">
        <div className="border-t border-foreground/5 pt-8 text-center">
          <p className="text-[11px] text-foreground/20 tracking-[2px] uppercase mb-4">Oração</p>
          <p className="font-serif text-[16px] leading-[2] text-foreground/40 italic max-w-sm mx-auto">
            "Senhor, abre meus olhos para ver as maravilhas da tua lei. Que esta palavra transforme meu coração hoje."
          </p>
          <p className="text-[11px] text-foreground/15 mt-3 font-serif">Amém</p>
        </div>
      </div>

      {/* ── ARCHIVE (hidden by default) ── */}
      {showArchive && (
        <div className="px-6 pb-10 animate-fade-in">
          <div className="border-t border-foreground/5 pt-6">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[11px] text-foreground/25 font-medium tracking-[2px] uppercase">Devocionais anteriores</p>
              <button onClick={() => setShowArchive(false)} className="text-foreground/20 hover:text-foreground/40"><X size={14} /></button>
            </div>

            {devotionals.map((week, wi) => (
              <div key={wi} className="mb-8">
                <p className="text-[11px] text-foreground/20 font-serif italic mb-3">{week.period}</p>
                <div className="space-y-2">
                  {week.days.map((d, di) => {
                    const key = `${wi}-${di}`;
                    const isOpen = expandedDev === key;
                    return (
                      <div key={di} className="border-b border-foreground/5 last:border-0">
                        <button
                          onClick={() => setExpandedDev(isOpen ? null : key)}
                          className="w-full flex items-center justify-between py-3 text-left transition-colors"
                        >
                          <div>
                            <span className="text-[11px] text-foreground/25 font-medium">{d.day}</span>
                            <span className="text-[15px] text-foreground/70 font-serif ml-3">{d.ref}</span>
                          </div>
                          <ChevronDown size={14} className={`text-foreground/15 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOpen && (
                          <div className="pb-4 animate-fade-in">
                            {d.verseText && (
                              <blockquote className="font-serif text-[16px] leading-[1.8] text-foreground/60 italic mb-4 pl-4 border-l-2 border-primary/15">
                                "{d.verseText}"
                              </blockquote>
                            )}
                            <p className="text-[14px] leading-[1.9] text-foreground/45">{d.summary}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SAVED TOAST ── */}
      {saved && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 py-2.5 px-5 rounded-full text-[12px] z-[110] animate-fade-in font-serif italic"
          style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.2)' }}>
          ✓ Salvo
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function parseExegeseEntries(text: string) {
  const entries: { word: string; origin: string; definition: string }[] = [];
  const regex = /\*\*\"(.+?)\"\*\*\s*\(([^)]+)\)\s*[—–-]\s*(.+?)(?=\s*\*\*\"|$)/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    entries.push({ word: match[1], origin: match[2].trim(), definition: match[3].trim().replace(/\.\s*$/, '') });
  }
  return entries;
}

function getTheologicalNote(text: string) {
  const patterns = [/(?:O\s+(?:autor|texto|verso|versículo|contexto)|Paulo|Jesus|Tiago|Davi|O\s+Espírito|A\s+(?:LXX|oração)|Teologicamente).+$/s];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0].replace(/\*\*/g, '').replace(/\*/g, '').trim();
  }
  return null;
}
