import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown, ChevronRight, Bookmark, PenLine, Volume2, VolumeX,
  X, Sparkles, BookOpen, Eye, EyeOff, Calendar, Clock, Star,
  Send, BookOpenCheck,
} from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import ReactMarkdown from "react-markdown";
import VerseReader from "@/components/VerseReader";

// ── Types ──

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

// ── April week metadata ──
const APRIL_WEEKS = [
  { range: [6, 10], theme: "Pneumatologia — O Espírito Santo", emoji: "🕊️" },
  { range: [13, 17], theme: "Cristologia — A Pessoa de Cristo", emoji: "✝️" },
  { range: [20, 24], theme: "Soteriologia — A Obra da Salvação", emoji: "⚓" },
  { range: [27, 30], theme: "O Coração Segundo Deus — Vida de Davi", emoji: "👑" },
];

const BIBLE_VERSIONS: { id: string; name: string; apiKey: string }[] = [
  { id: "almeida", name: "Almeida (ARA)", apiKey: "almeida" },
  { id: "kjv", name: "King James (KJV)", apiKey: "kjv" },
  { id: "bbe", name: "Bible in Basic English", apiKey: "bbe" },
];

const GUIDE_QUESTIONS = [
  "O que o texto diz? Qual o assunto central?",
  "O que essa passagem quer dizer pra mim? O que ela diz sobre Deus?",
  "Como isso se aplica à minha vida? Há algum mandamento, promessa, ou atitude a mudar?",
];

// ── Cache helpers ──
const CACHE_PREFIX = "dev-insight-";
function getCachedInsight(ref: string, type: string): string | null {
  try { return localStorage.getItem(`${CACHE_PREFIX}${type}-${ref}`); } catch { return null; }
}
function setCachedInsight(ref: string, type: string, value: string) {
  try { localStorage.setItem(`${CACHE_PREFIX}${type}-${ref}`, value); } catch {}
}

// ── Component ──

export default function DevotionalTab({ devotionals, aprilCalendar, aprilThemes, onSaveNote }: Props) {
  const now = new Date();
  const year = now.getFullYear();
  const todayDate = now.getDate();
  const todayMonth = now.getMonth(); // 0-indexed, April = 3
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const todayName = dayNames[now.getDay()];

  // ── Find today's devotional ──
  let todayRef: string | null = null;
  let todayPeriod = "";
  let todayTheme = "";
  let todayEmoji = "";
  let todaySummary = "";
  let todayVerseTextStatic: string | undefined;
  let todayExegeseStatic: string | undefined;

  // Check DEVOTIONALS first
  for (const week of devotionals) {
    const [startStr, endStr] = week.period.split(" a ");
    const [sd, sm] = startStr.split("/").map(Number);
    const [ed, em] = endStr.split("/").map(Number);
    const start = new Date(year, sm - 1, sd);
    const end = new Date(year, em - 1, ed, 23, 59, 59);
    if (now >= start && now <= end) {
      const match = week.days.find(d => d.day === todayName);
      if (match) {
        todayRef = match.ref;
        todayPeriod = week.period;
        todaySummary = match.summary;
        todayVerseTextStatic = match.verseText;
        todayExegeseStatic = match.exegese;
      }
      break;
    }
  }

  // April fallback
  if (!todayRef && todayMonth === 3) {
    const ref = aprilCalendar[todayDate];
    if (ref) {
      todayRef = ref;
      const weekMeta = APRIL_WEEKS.find(w => todayDate >= w.range[0] && todayDate <= w.range[1]);
      todayTheme = weekMeta?.theme || "";
      todayEmoji = weekMeta?.emoji || "📖";
      todayPeriod = `Abril ${year}`;
    }
  }

  // ── Compute upcoming days for April ──
  const upcomingDays: { date: number; ref: string; weekTheme: string }[] = [];
  if (todayMonth === 3) {
    const sortedDays = Object.keys(aprilCalendar).map(Number).sort((a, b) => a - b);
    for (const d of sortedDays) {
      if (d > todayDate) {
        const weekMeta = APRIL_WEEKS.find(w => d >= w.range[0] && d <= w.range[1]);
        upcomingDays.push({ date: d, ref: aprilCalendar[d], weekTheme: weekMeta?.theme || "" });
      }
    }
  }

  // ── State ──
  const [version, setVersion] = useState("almeida");
  const [verseText, setVerseText] = useState<string | null>(todayVerseTextStatic || null);
  const [verseLoading, setVerseLoading] = useState(false);

  const [exegeseResult, setExegeseResult] = useState<string | null>(todayExegeseStatic || null);
  const [exegeseLoading, setExegeseLoading] = useState(false);
  const [showExegesis, setShowExegesis] = useState(false);

  const [contextResult, setContextResult] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const [reflection, setReflection] = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const [saved, setSaved] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  // Discipler note
  const [disciplerNote, setDisciplerNote] = useState("");
  const [showDisciplerNote, setShowDisciplerNote] = useState(false);
  const [disciplerNoteSent, setDisciplerNoteSent] = useState(false);

  // Verse reader
  const [showVerseReader, setShowVerseReader] = useState(false);
  const [readerBook, setReaderBook] = useState("");
  const [readerChapter, setReaderChapter] = useState(1);

  // ── Selected "upcoming" day to view details ──
  const [selectedDay, setSelectedDay] = useState<{ date: number; ref: string } | null>(null);
  const [selectedVerseText, setSelectedVerseText] = useState<string | null>(null);
  const [selectedVerseLoading, setSelectedVerseLoading] = useState(false);
  const [selectedExegesis, setSelectedExegesis] = useState<string | null>(null);
  const [selectedExegesisLoading, setSelectedExegesisLoading] = useState(false);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [selectedContextLoading, setSelectedContextLoading] = useState(false);

  // ── Fetch verse text ──
  const fetchVerse = useCallback(async (ref: string, versionId: string): Promise<string | null> => {
    const apiKey = BIBLE_VERSIONS.find(v => v.id === versionId)?.apiKey || "almeida";
    try {
      const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=${apiKey}`);
      if (r.ok) {
        const data = await r.json();
        return data?.text?.trim() || null;
      }
    } catch {}
    // Fallback to AI
    try {
      const { data } = await supabase.functions.invoke("verse-ai", { body: { verse: ref } });
      return data?.result?.trim() || null;
    } catch {}
    return null;
  }, []);

  // Auto-fetch main verse
  useEffect(() => {
    if (!todayRef) return;
    if (todayVerseTextStatic && version === "almeida") {
      setVerseText(todayVerseTextStatic);
      return;
    }
    setVerseLoading(true);
    fetchVerse(todayRef, version).then(t => { if (t) setVerseText(t); }).finally(() => setVerseLoading(false));
  }, [todayRef, version, todayVerseTextStatic, fetchVerse]);

  // Auto-fetch exegesis
  useEffect(() => {
    if (!todayRef || !verseText) return;
    if (todayExegeseStatic) { setExegeseResult(todayExegeseStatic); return; }
    const cached = getCachedInsight(todayRef, "exegesis");
    if (cached) { setExegeseResult(cached); return; }
    setExegeseLoading(true);
    supabase.functions.invoke("verse-exegesis", { body: { verse: todayRef, verseText } })
      .then(({ data, error }) => {
        if (!error && data?.result) {
          setExegeseResult(data.result);
          setCachedInsight(todayRef!, "exegesis", data.result);
        }
      }).finally(() => setExegeseLoading(false));
  }, [todayRef, verseText, todayExegeseStatic]);

  // Fetch historical context on demand
  const fetchContext = useCallback((ref: string, text: string, setter: (v: string) => void, setLoading: (v: boolean) => void) => {
    const cached = getCachedInsight(ref, "context");
    if (cached) { setter(cached); return; }
    setLoading(true);
    supabase.functions.invoke("bible-context", { body: { verse: ref, verseText: text } })
      .then(({ data, error }) => {
        if (!error && data?.result) {
          setter(data.result);
          setCachedInsight(ref, "context", data.result);
        }
      }).finally(() => setLoading(false));
  }, []);

  // ── Selected day verse fetch ──
  useEffect(() => {
    if (!selectedDay) return;
    setSelectedVerseText(null);
    setSelectedExegesis(null);
    setSelectedContext(null);
    setSelectedVerseLoading(true);
    fetchVerse(selectedDay.ref, version).then(t => {
      setSelectedVerseText(t);
      setSelectedVerseLoading(false);
    });
  }, [selectedDay, version, fetchVerse]);

  const toggleSpeak = useCallback(() => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const text = verseText || "";
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "pt-BR"; utt.rate = 0.85;
    utt.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utt); setSpeaking(true);
  }, [speaking, verseText]);

  const saveReflection = () => {
    if (!reflection.trim()) return;
    onSaveNote(`# Reflexão: ${todayRef}\n\n${reflection}`);
    setReflection("");
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const saveDisciplerNote = () => {
    if (!disciplerNote.trim()) return;
    onSaveNote(`# 📩 Nota para Discipulador — ${todayRef}\n\n${disciplerNote}\n\n---\n_${dateStr}_`);
    setDisciplerNoteSent(true);
    setTimeout(() => setDisciplerNoteSent(false), 3000);
  };

  // Parse reference for verse reader
  const openVerseReader = useCallback(() => {
    if (!todayRef) return;
    // Parse "João 1:14" => book="João", chapter=1
    const match = todayRef.match(/^(.+?)\s+(\d+)/);
    if (match) {
      setReaderBook(match[1]);
      setReaderChapter(parseInt(match[2]));
      setShowVerseReader(true);
    }
  }, [todayRef]);

  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  // ── EMPTY STATE ──
  if (!todayRef) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 animate-fade-in">
        <div className="text-6xl mb-6 opacity-30">✝️</div>
        <p className="font-serif text-xl text-foreground/50 text-center leading-relaxed italic">
          "Aquietai-vos, e sabei que eu sou Deus"
        </p>
        <p className="text-sm text-foreground/25 mt-3 font-serif">— Salmos 46:10</p>
        <p className="text-xs text-muted-foreground mt-6">Nenhum devocional encontrado para hoje</p>
      </div>
    );
  }

  return (
    <div className={`devotional-container transition-all duration-500 ${focusMode ? "px-2" : ""}`}>
      {/* ── SACRED HEADER ── */}
      <div className="px-6 pt-8 pb-1 animate-fade-in" style={{ animationDelay: "0ms" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-serif italic tracking-wide capitalize">{dateStr}</p>
            {todayTheme && (
              <p className="text-[10px] text-primary/70 mt-1 tracking-[2px] uppercase font-medium">
                {todayEmoji} {todayTheme}
              </p>
            )}
          </div>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            title={focusMode ? "Sair do modo foco" : "Modo foco"}
          >
            {focusMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* ── VERSE REFERENCE ── */}
      <div className="px-6 pt-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <p className="text-[10px] text-primary/60 font-medium tracking-[3px] uppercase mb-2">{todayRef}</p>

        {/* Bible version selector */}
        {!focusMode && (
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {BIBLE_VERSIONS.map(v => (
              <button
                key={v.id}
                onClick={() => setVersion(v.id)}
                className={`px-3 py-1 rounded-full text-[10px] tracking-wider uppercase transition-all duration-300
                  ${version === v.id
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground border border-border hover:border-primary/20 hover:text-foreground"}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── VERSE TEXT (hero) ── */}
      <div className="px-6 pb-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
        {verseLoading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary/60 rounded-full animate-spin" />
          </div>
        ) : verseText ? (
          <blockquote className="font-serif text-[21px] leading-[2] text-foreground/85 italic tracking-wide transition-opacity duration-500">
            "{verseText}"
          </blockquote>
        ) : (
          <p className="text-muted-foreground text-sm italic">Versículo não encontrado para esta versão.</p>
        )}

        {/* Subtle divider */}
        <div className="flex justify-center mt-8 mb-2">
          <div className="w-8 h-px bg-primary/15" />
        </div>
      </div>

      {/* ── SUMMARY ── */}
      {todaySummary && (
        <div className="px-6 pb-5 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <p className="text-[15px] leading-[2] text-foreground/55 font-serif">{todaySummary}</p>
        </div>
      )}

      {/* ── EXEGESIS SECTION ── */}
      {!focusMode && (
        <div className="px-6 pb-4 animate-fade-in" style={{ animationDelay: "350ms" }}>
          <button
            onClick={() => setShowExegesis(!showExegesis)}
            className="flex items-center gap-2 text-[10px] text-primary/50 font-medium tracking-[2px] uppercase hover:text-primary/80 transition-colors w-full"
          >
            <Sparkles size={12} />
            <span>Estudo Exegético</span>
            {exegeseLoading && <div className="w-3 h-3 border border-primary/30 border-t-primary/60 rounded-full animate-spin ml-1" />}
            <ChevronDown size={14} className={`ml-auto transition-transform duration-300 ${showExegesis ? "rotate-180" : ""}`} />
          </button>
          {showExegesis && exegeseResult && (
            <div className="mt-5 animate-fade-in">
              <MarkdownContent text={exegeseResult} />
            </div>
          )}
          {showExegesis && !exegeseResult && !exegeseLoading && (
            <p className="mt-3 text-xs text-muted-foreground italic">Exegese ainda não disponível.</p>
          )}
        </div>
      )}

      {/* ── HISTORICAL CONTEXT SECTION ── */}
      {!focusMode && (
        <div className="px-6 pb-4 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <button
            onClick={() => {
              setShowContext(!showContext);
              if (!showContext && !contextResult && !contextLoading && verseText && todayRef) {
                fetchContext(todayRef, verseText, setContextResult, setContextLoading);
              }
            }}
            className="flex items-center gap-2 text-[10px] text-primary/50 font-medium tracking-[2px] uppercase hover:text-primary/80 transition-colors w-full"
          >
            <BookOpen size={12} />
            <span>Contexto Histórico</span>
            {contextLoading && <div className="w-3 h-3 border border-primary/30 border-t-primary/60 rounded-full animate-spin ml-1" />}
            <ChevronDown size={14} className={`ml-auto transition-transform duration-300 ${showContext ? "rotate-180" : ""}`} />
          </button>
          {showContext && contextResult && (
            <div className="mt-5 animate-fade-in">
              <MarkdownContent text={contextResult} />
            </div>
          )}
        </div>
      )}

      {/* ── MINIMAL ACTIONS ── */}
      <div className="px-6 py-4 animate-fade-in" style={{ animationDelay: "450ms" }}>
        <div className="flex items-center justify-center gap-6">
          <ActionBtn icon={<PenLine size={18} strokeWidth={1.5} />} label="Refletir" onClick={() => setShowReflection(!showReflection)} />
          <ActionBtn icon={<Send size={18} strokeWidth={1.5} />} label="Discipulador" onClick={() => setShowDisciplerNote(!showDisciplerNote)} />
          <ActionBtn icon={<Bookmark size={18} strokeWidth={1.5} />} label="Salvar" onClick={() => {
            onSaveNote(`# ${todayRef}\n\n> "${verseText || ""}"\n\n${todaySummary || ""}`);
            setSaved(true); setTimeout(() => setSaved(false), 2500);
          }} />
          <ActionBtn icon={speaking ? <VolumeX size={18} strokeWidth={1.5} /> : <Volume2 size={18} strokeWidth={1.5} />}
            label={speaking ? "Parar" : "Ouvir"} onClick={toggleSpeak} active={speaking} />
          <ActionBtn icon={<BookOpenCheck size={18} strokeWidth={1.5} />} label="Ler" onClick={openVerseReader} />
        </div>
      </div>

      {/* ── DISCIPLER NOTE ── */}
      {showDisciplerNote && (
        <div className="px-6 pb-6 animate-fade-in">
          <div className="border-t border-border/30 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Send size={14} className="text-primary/60" />
              <p className="text-[10px] text-muted-foreground font-medium tracking-[2px] uppercase">Nota para o Discipulador</p>
            </div>
            <p className="text-[11px] text-muted-foreground/60 mb-3 italic font-serif">
              Escreva uma breve nota sobre o que aprendeu hoje para compartilhar com seu discipulador.
            </p>
            <textarea
              value={disciplerNote}
              onChange={(e) => setDisciplerNote(e.target.value)}
              placeholder="O que Deus falou comigo hoje..."
              className="w-full min-h-[80px] p-4 rounded-xl bg-card border border-border/30 text-[14px] leading-relaxed text-foreground/80 font-serif placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/30 transition-colors"
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-muted-foreground/40">{disciplerNote.length}/500</span>
              <button
                onClick={saveDisciplerNote}
                disabled={!disciplerNote.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] tracking-[1.5px] uppercase font-medium transition-all disabled:opacity-20 active:scale-95 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
              >
                <Send size={12} />
                Salvar nota
              </button>
            </div>
            {disciplerNoteSent && (
              <p className="text-[11px] text-primary mt-2 animate-fade-in font-serif italic">✓ Nota salva com sucesso!</p>
            )}
          </div>
        </div>
      )}

      {/* ── REFLECTION JOURNAL ── */}
      {showReflection && (
        <div className="px-6 pb-8 animate-fade-in">
          <div className="border-t border-border/30 pt-6">
            <p className="text-[10px] text-muted-foreground font-medium tracking-[2px] uppercase mb-4">Minha reflexão</p>
            <div className="space-y-2.5 mb-4">
              {GUIDE_QUESTIONS.map((q, i) => (
                <button key={i}
                  onClick={() => setReflection(prev => prev + (prev ? "\n" : "") + `<p><em>${q}</em></p><p></p>`)}
                  className="block text-left text-[12px] text-muted-foreground/70 hover:text-foreground/60 italic font-serif transition-colors">
                  {i + 1}. {q}
                </button>
              ))}
            </div>
            <div className="devotional-editor rounded-xl overflow-hidden border border-border/30">
              <RichTextEditor content={reflection} onChange={setReflection} placeholder="Escreva livremente..." minHeight="120px" />
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={saveReflection} disabled={!reflection.trim()}
                className="px-5 py-2 rounded-full text-[10px] tracking-[1.5px] uppercase font-medium transition-all disabled:opacity-20 active:scale-95 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                Salvar reflexão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRAYER ── */}
      {!focusMode && (
        <div className="px-6 pb-8 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <div className="border-t border-border/30 pt-8 text-center">
            <p className="text-[10px] text-muted-foreground/50 tracking-[2px] uppercase mb-4">Oração</p>
            <p className="font-serif text-[15px] leading-[2] text-foreground/35 italic max-w-sm mx-auto">
              "Senhor, abre meus olhos para ver as maravilhas da tua lei. Que esta palavra transforme meu coração hoje."
            </p>
            <p className="text-[10px] text-foreground/15 mt-3 font-serif">Amém</p>
          </div>
        </div>
      )}

      {/* ── UPCOMING DAYS ── */}
      {!focusMode && upcomingDays.length > 0 && (
        <div className="px-6 pb-6 animate-fade-in" style={{ animationDelay: "550ms" }}>
          <button
            onClick={() => setShowUpcoming(!showUpcoming)}
            className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium tracking-[2px] uppercase hover:text-foreground transition-colors w-full"
          >
            <Calendar size={12} />
            <span>Próximos dias</span>
            <ChevronDown size={14} className={`ml-auto transition-transform duration-300 ${showUpcoming ? "rotate-180" : ""}`} />
          </button>
          {showUpcoming && (
            <div className="mt-4 space-y-2 animate-fade-in">
              {upcomingDays.slice(0, 8).map((d, i) => (
                <button key={d.date}
                  onClick={() => setSelectedDay(selectedDay?.date === d.date ? null : { date: d.date, ref: d.ref })}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border/30 hover:border-primary/20 transition-all text-left"
                  style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-primary/8 text-primary/70 border border-primary/15">
                      {d.date}
                    </span>
                    <div>
                      <p className="text-[13px] text-foreground/80 font-medium">{d.ref}</p>
                      <p className="text-[10px] text-muted-foreground">{d.weekTheme}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`text-muted-foreground transition-transform ${selectedDay?.date === d.date ? "rotate-90" : ""}`} />
                </button>
              ))}

              {/* Selected day detail */}
              {selectedDay && (
                <div className="mt-3 p-4 rounded-xl border border-primary/15 bg-primary/5 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-primary tracking-[2px] uppercase font-medium">
                      {selectedDay.date} de Abril — {selectedDay.ref}
                    </p>
                    <button onClick={() => setSelectedDay(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>
                  {selectedVerseLoading ? (
                    <div className="py-4 flex justify-center">
                      <div className="w-5 h-5 border-2 border-primary/20 border-t-primary/60 rounded-full animate-spin" />
                    </div>
                  ) : selectedVerseText ? (
                    <blockquote className="font-serif text-[16px] leading-[1.9] text-foreground/70 italic mb-3">
                      "{selectedVerseText}"
                    </blockquote>
                  ) : null}
                  {/* Exegesis for selected */}
                  {selectedVerseText && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          if (selectedExegesis) return;
                          const cached = getCachedInsight(selectedDay.ref, "exegesis");
                          if (cached) { setSelectedExegesis(cached); return; }
                          setSelectedExegesisLoading(true);
                          supabase.functions.invoke("verse-exegesis", { body: { verse: selectedDay.ref, verseText: selectedVerseText } })
                            .then(({ data, error }) => {
                              if (!error && data?.result) {
                                setSelectedExegesis(data.result);
                                setCachedInsight(selectedDay.ref, "exegesis", data.result);
                              }
                            }).finally(() => setSelectedExegesisLoading(false));
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider text-primary/60 border border-primary/20 hover:bg-primary/10 transition-all"
                      >
                        <Sparkles size={10} />
                        {selectedExegesisLoading ? "Carregando..." : "Exegese"}
                      </button>
                      <button
                        onClick={() => {
                          if (selectedContext) return;
                          fetchContext(selectedDay.ref, selectedVerseText!, setSelectedContext, setSelectedContextLoading);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider text-primary/60 border border-primary/20 hover:bg-primary/10 transition-all"
                      >
                        <BookOpen size={10} />
                        {selectedContextLoading ? "Carregando..." : "Contexto"}
                      </button>
                    </div>
                  )}
                  {selectedExegesis && (
                    <div className="mt-4 animate-fade-in"><MarkdownContent text={selectedExegesis} /></div>
                  )}
                  {selectedContext && (
                    <div className="mt-4 animate-fade-in"><MarkdownContent text={selectedContext} /></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── FULL APRIL CALENDAR ── */}
      {!focusMode && todayMonth === 3 && (
        <div className="px-6 pb-8 animate-fade-in" style={{ animationDelay: "600ms" }}>
          <button
            onClick={() => setShowFullCalendar(!showFullCalendar)}
            className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium tracking-[2px] uppercase hover:text-foreground transition-colors w-full"
          >
            <Star size={12} />
            <span>Abril completo</span>
            <ChevronDown size={14} className={`ml-auto transition-transform duration-300 ${showFullCalendar ? "rotate-180" : ""}`} />
          </button>
          {showFullCalendar && (
            <div className="mt-5 space-y-6 animate-fade-in">
              {APRIL_WEEKS.map((week, wi) => (
                <div key={wi}>
                  <p className="text-[10px] text-primary/60 tracking-[2px] uppercase font-medium mb-2">
                    {week.emoji} {week.theme}
                  </p>
                  <p className="text-[9px] text-muted-foreground mb-3">
                    {week.range[0]}–{week.range[1]} de Abril
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(aprilCalendar)
                      .filter(([d]) => Number(d) >= week.range[0] && Number(d) <= week.range[1])
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([d, ref]) => {
                        const dayNum = Number(d);
                        const isToday = dayNum === todayDate;
                        const isPast = dayNum < todayDate;
                        return (
                          <div key={d}
                            className={`flex items-center gap-3 p-2.5 rounded-lg transition-all
                              ${isToday ? "bg-primary/10 border border-primary/20" : "hover:bg-card/50"}`}>
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold
                              ${isToday ? "bg-primary text-primary-foreground" : isPast ? "bg-muted text-muted-foreground" : "bg-card text-foreground/60 border border-border/30"}`}>
                              {d}
                            </span>
                            <span className={`text-[13px] font-serif ${isToday ? "text-foreground font-medium" : isPast ? "text-muted-foreground line-through" : "text-foreground/70"}`}>
                              {ref}
                            </span>
                            {isToday && <span className="ml-auto text-[8px] uppercase tracking-wider text-primary font-bold">Hoje</span>}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PREVIOUS DEVOTIONALS ARCHIVE ── */}
      {!focusMode && devotionals.length > 0 && (
        <div className="px-6 pb-10">
          <DevotionalArchive devotionals={devotionals} />
        </div>
      )}

      {/* ── SAVED TOAST ── */}
      {saved && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 py-2.5 px-5 rounded-full text-[12px] z-[110] animate-fade-in font-serif italic bg-primary/15 text-primary border border-primary/20">
          ✓ Salvo
        </div>
      )}

      {/* ── VERSE READER ── */}
      {showVerseReader && (
        <VerseReader
          book={readerBook}
          chapter={readerChapter}
          version={version}
          onClose={() => setShowVerseReader(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──

function ActionBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${active ? "text-primary" : "text-muted-foreground/50 hover:text-primary/60"}`}>
      {icon}
      <span className="text-[8px] tracking-[1.5px] uppercase">{label}</span>
    </button>
  );
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="devotional-exegesis">
      <ReactMarkdown
        components={{
          h2: ({ children }) => <h2 className="font-serif text-lg text-foreground mt-7 mb-3 font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="font-serif text-base text-foreground mt-5 mb-2 font-medium">{children}</h3>,
          p: ({ children }) => <p className="text-[14px] leading-[2] text-foreground/70 mb-3">{children}</p>,
          strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-foreground/50 font-serif">{children}</em>,
          li: ({ children }) => <li className="text-[14px] leading-[1.9] text-foreground/70 ml-4 mb-2">• {children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/25 pl-5 py-2 my-4 italic text-foreground/60 font-serif text-[15px] leading-[1.8]">
              {children}
            </blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function DevotionalArchive({ devotionals }: { devotionals: DevWeek[] }) {
  const [open, setOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium tracking-[2px] uppercase hover:text-foreground transition-colors w-full"
      >
        <BookOpen size={12} />
        <span>Devocionais anteriores</span>
        <ChevronDown size={14} className={`ml-auto transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-5 space-y-6 animate-fade-in">
          {devotionals.map((week, wi) => (
            <div key={wi}>
              <p className="text-[10px] text-muted-foreground/50 font-serif italic mb-3">{week.period}</p>
              <div className="space-y-1">
                {week.days.map((d, di) => {
                  const key = `${wi}-${di}`;
                  const isOpen = expandedKey === key;
                  return (
                    <div key={di} className="border-b border-border/20 last:border-0">
                      <button onClick={() => setExpandedKey(isOpen ? null : key)}
                        className="w-full flex items-center justify-between py-3 text-left transition-colors">
                        <div>
                          <span className="text-[10px] text-muted-foreground">{d.day}</span>
                          <span className="text-[14px] text-foreground/70 font-serif ml-2">{d.ref}</span>
                        </div>
                        <ChevronDown size={14} className={`text-muted-foreground/30 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="pb-4 animate-fade-in">
                          {d.verseText && (
                            <blockquote className="font-serif text-[15px] leading-[1.8] text-foreground/55 italic mb-3 pl-4 border-l-2 border-primary/15">
                              "{d.verseText}"
                            </blockquote>
                          )}
                          <p className="text-[13px] leading-[1.9] text-foreground/40">{d.summary}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
