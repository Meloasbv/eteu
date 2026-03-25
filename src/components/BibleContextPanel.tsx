import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedVerse, setCachedVerse } from "@/lib/bibleRefDetection";

type Tab = "verse" | "context" | "exegesis" | "connections";

interface BibleContextPanelProps {
  open: boolean;
  reference: string; // e.g. "João 3:16"
  onClose: () => void;
  onInsertVerse?: (ref: string, text: string) => void;
}

// Cache for AI results (localStorage)
const AI_CACHE_KEY = "bible-context-ai-cache";
const AI_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

function getAICache(key: string) {
  try {
    const cache = JSON.parse(localStorage.getItem(AI_CACHE_KEY) || "{}");
    const entry = cache[key];
    if (entry && Date.now() - entry.ts < AI_CACHE_TTL) return entry.data;
  } catch {}
  return null;
}

function setAICache(key: string, data: any) {
  try {
    const cache = JSON.parse(localStorage.getItem(AI_CACHE_KEY) || "{}");
    cache[key] = { data, ts: Date.now() };
    const keys = Object.keys(cache);
    if (keys.length > 200) {
      const sorted = keys.sort((a, b) => cache[a].ts - cache[b].ts);
      for (let i = 0; i < 50; i++) delete cache[sorted[i]];
    }
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// Map PT book names to EN for bible-api.com
const BOOK_MAP: Record<string, string> = {
  "gênesis": "Genesis", "êxodo": "Exodus", "levítico": "Leviticus", "números": "Numbers",
  "deuteronômio": "Deuteronomy", "josué": "Joshua", "juízes": "Judges", "rute": "Ruth",
  "1 samuel": "1 Samuel", "2 samuel": "2 Samuel", "1 reis": "1 Kings", "2 reis": "2 Kings",
  "1 crônicas": "1 Chronicles", "2 crônicas": "2 Chronicles", "esdras": "Ezra", "neemias": "Nehemiah",
  "ester": "Esther", "jó": "Job", "salmos": "Psalms", "provérbios": "Proverbs",
  "eclesiastes": "Ecclesiastes", "cânticos": "Song of Solomon", "isaías": "Isaiah",
  "jeremias": "Jeremiah", "lamentações": "Lamentations", "ezequiel": "Ezekiel", "daniel": "Daniel",
  "oséias": "Hosea", "joel": "Joel", "amós": "Amos", "obadias": "Obadiah", "jonas": "Jonah",
  "miquéias": "Micah", "naum": "Nahum", "habacuque": "Habakkuk", "sofonias": "Zephaniah",
  "ageu": "Haggai", "zacarias": "Zechariah", "malaquias": "Malachi", "mateus": "Matthew",
  "marcos": "Mark", "lucas": "Luke", "joão": "John", "atos": "Acts", "romanos": "Romans",
  "1 coríntios": "1 Corinthians", "2 coríntios": "2 Corinthians", "gálatas": "Galatians",
  "efésios": "Ephesians", "filipenses": "Philippians", "colossenses": "Colossians",
  "1 tessalonicenses": "1 Thessalonians", "2 tessalonicenses": "2 Thessalonians",
  "1 timóteo": "1 Timothy", "2 timóteo": "2 Timothy", "tito": "Titus", "filemom": "Philemon",
  "hebreus": "Hebrews", "tiago": "James", "1 pedro": "1 Peter", "2 pedro": "2 Peter",
  "1 joão": "1 John", "2 joão": "2 John", "3 joão": "3 John", "judas": "Jude",
  "apocalipse": "Revelation",
};

function toApiRef(ref: string): string {
  const match = ref.match(/^(.+?)\s+(\d.*)$/);
  if (!match) return ref;
  const bookEn = BOOK_MAP[match[1].toLowerCase()];
  return bookEn ? `${bookEn} ${match[2]}` : ref;
}

export default function BibleContextPanel({ open, reference, onClose, onInsertVerse }: BibleContextPanelProps) {
  const [tab, setTab] = useState<Tab>("verse");
  const [verseText, setVerseText] = useState<string | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [contextData, setContextData] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [exegesisData, setExegesisData] = useState<any>(null);
  const [exegesisLoading, setExegesisLoading] = useState(false);
  const [connectionsData, setConnectionsData] = useState<any>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch verse text
  const fetchVerse = useCallback(async () => {
    if (!reference) return;
    const cached = getCachedVerse(reference);
    if (cached) { setVerseText(cached); return; }

    setVerseLoading(true);
    try {
      const apiRef = toApiRef(reference);
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(apiRef)}?translation=almeida`);
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          const text = data.text.trim();
          setVerseText(text);
          setCachedVerse(reference, text);
        } else {
          setVerseText(null);
        }
      }
    } catch {
      setVerseText(null);
    }
    setVerseLoading(false);
  }, [reference]);

  // Fetch AI data for a tab
  const fetchAIData = useCallback(async (aiTab: "context" | "exegesis" | "connections") => {
    const cacheKey = `${aiTab}:${reference}`;
    const cached = getAICache(cacheKey);
    if (cached) {
      if (aiTab === "context") setContextData(cached);
      else if (aiTab === "exegesis") setExegesisData(cached);
      else setConnectionsData(cached);
      return;
    }

    if (aiTab === "context") setContextLoading(true);
    else if (aiTab === "exegesis") setExegesisLoading(true);
    else setConnectionsLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("bible-context", {
        body: { reference, verseText: verseText || "", tab: aiTab },
      });
      if (fnError || data?.error) {
        setError(data?.error || "Erro ao buscar dados");
      } else if (data?.result) {
        setAICache(cacheKey, data.result);
        if (aiTab === "context") setContextData(data.result);
        else if (aiTab === "exegesis") setExegesisData(data.result);
        else setConnectionsData(data.result);
      }
    } catch {
      setError("Erro de conexão");
    }

    if (aiTab === "context") setContextLoading(false);
    else if (aiTab === "exegesis") setExegesisLoading(false);
    else setConnectionsLoading(false);
  }, [reference, verseText]);

  // Auto-fetch verse on open
  useEffect(() => {
    if (open && reference) {
      setVerseText(null);
      setContextData(null);
      setExegesisData(null);
      setConnectionsData(null);
      setError("");
      setTab("verse");
      fetchVerse();
    }
  }, [open, reference, fetchVerse]);

  // Fetch AI data when tab changes
  useEffect(() => {
    if (!open || !reference) return;
    if (tab === "context" && !contextData && !contextLoading) fetchAIData("context");
    if (tab === "exegesis" && !exegesisData && !exegesisLoading) fetchAIData("exegesis");
    if (tab === "connections" && !connectionsData && !connectionsLoading) fetchAIData("connections");
  }, [tab, open, reference, contextData, exegesisData, connectionsData, contextLoading, exegesisLoading, connectionsLoading, fetchAIData]);

  if (!open) return null;

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "verse", label: "Versículo", icon: "📖" },
    { key: "context", label: "Contexto", icon: "🏛️" },
    { key: "exegesis", label: "Exegese", icon: "🔤" },
    { key: "connections", label: "Conexões", icon: "🔗" },
  ];

  const SkeletonBlock = () => (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-primary/10 rounded w-3/4" />
      <div className="h-3 bg-primary/10 rounded w-full" />
      <div className="h-3 bg-primary/10 rounded w-5/6" />
      <div className="h-3 bg-primary/10 rounded w-2/3" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] transition-opacity duration-250 opacity-100 pointer-events-auto">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 bg-card border-t border-border
          rounded-t-[20px] pb-[calc(24px+env(safe-area-inset-bottom,0px))]
          max-h-[85dvh] overflow-hidden flex flex-col translate-y-0"
        style={{ transition: "transform .35s cubic-bezier(.32,0,.15,1)" }}
      >
        {/* Handle */}
        <div className="w-9 h-1 bg-border rounded-full mx-auto mt-3.5 mb-2 shrink-0" />

        {/* Reference title */}
        <div className="px-5 pb-2 shrink-0">
          <p className="font-display text-[10px] tracking-[4px] uppercase text-primary text-center">
            {reference}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pb-3 shrink-0 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 min-w-0 py-2 px-2 rounded-lg border font-display text-[9px] tracking-wide text-center cursor-pointer transition-all duration-200
                ${tab === t.key
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground bg-background hover:border-primary/30"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {error && (
            <div className="text-center text-destructive font-body text-sm py-4">{error}</div>
          )}

          {/* ── Verse tab ── */}
          {tab === "verse" && (
            <div>
              {verseLoading ? (
                <SkeletonBlock />
              ) : verseText ? (
                <div className="bg-background border border-border border-l-2 border-l-primary rounded-xl p-4">
                  <p className="font-body text-base leading-relaxed text-foreground italic">
                    {verseText}
                  </p>
                  {onInsertVerse && (
                    <button
                      onClick={() => { onInsertVerse(reference, verseText); onClose(); }}
                      className="mt-3 w-full py-2.5 rounded-lg bg-primary/10 border border-primary
                        text-primary font-display text-[9px] tracking-wide uppercase text-center cursor-pointer
                        hover:bg-primary/15 active:opacity-70 transition-all duration-150"
                    >
                      📝 Inserir na nota
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground font-body text-sm py-4 italic">
                  Versículo não encontrado
                </p>
              )}
            </div>
          )}

          {/* ── Context tab ── */}
          {tab === "context" && (
            <div>
              {contextLoading ? (
                <SkeletonBlock />
              ) : contextData ? (
                <div className="space-y-3">
                  <InfoRow label="Autor" value={contextData.autor} />
                  <InfoRow label="Data" value={contextData.data} />
                  <InfoRow label="Destinatários" value={contextData.destinatarios} />
                  <InfoRow label="Posição no Cânon" value={contextData.posicao_canon} />
                  <InfoRow label="Tema Central" value={contextData.tema_central} />
                  <div className="pt-2">
                    <p className="font-display text-[9px] tracking-[2px] uppercase text-primary mb-1.5">
                      Contexto Histórico
                    </p>
                    <p className="font-body text-sm text-foreground leading-relaxed">
                      {contextData.contexto_historico}
                    </p>
                  </div>
                  <div className="pt-1">
                    <p className="font-display text-[9px] tracking-[2px] uppercase text-primary mb-1.5">
                      Propósito
                    </p>
                    <p className="font-body text-sm text-foreground leading-relaxed">
                      {contextData.proposito}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── Exegesis tab ── */}
          {tab === "exegesis" && (
            <div>
              {exegesisLoading ? (
                <SkeletonBlock />
              ) : exegesisData ? (
                <div className="space-y-4">
                  {/* Keywords */}
                  {exegesisData.palavras_chave?.length > 0 && (
                    <div>
                      <p className="font-display text-[9px] tracking-[2px] uppercase text-primary mb-2">
                        Palavras-chave originais
                      </p>
                      <div className="space-y-2.5">
                        {exegesisData.palavras_chave.map((w: any, i: number) => (
                          <div key={i} className="bg-background border border-border rounded-lg p-3">
                            <div className="flex items-baseline gap-2 flex-wrap mb-1">
                              <span className="font-body text-sm font-bold text-foreground">{w.portugues}</span>
                              <span className="text-primary text-xs">→</span>
                              <span className="font-body text-xs text-muted-foreground italic">{w.transliteracao}</span>
                              <span className="text-primary text-xs">→</span>
                              <span className="font-serif text-sm text-primary">{w.original}</span>
                            </div>
                            <p className="font-body text-xs text-muted-foreground leading-relaxed">{w.significado}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matthew Henry */}
                  {exegesisData.comentario_matthew_henry && (
                    <div>
                      <p className="font-display text-[9px] tracking-[2px] uppercase text-primary mb-1.5">
                        Comentário de Matthew Henry
                      </p>
                      <p className="font-body text-sm text-foreground leading-relaxed italic">
                        {exegesisData.comentario_matthew_henry}
                      </p>
                    </div>
                  )}

                  {/* Church Fathers */}
                  {exegesisData.visao_pais_igreja && (
                    <div>
                      <p className="font-display text-[9px] tracking-[2px] uppercase text-primary mb-1.5">
                        Pais da Igreja
                      </p>
                      <p className="font-body text-sm text-foreground leading-relaxed italic">
                        {exegesisData.visao_pais_igreja}
                      </p>
                    </div>
                  )}

                  {/* Practical application */}
                  {exegesisData.aplicacao_pratica && (
                    <div>
                      <p className="font-display text-[9px] tracking-[2px] uppercase text-primary mb-1.5">
                        Aplicação Prática
                      </p>
                      <p className="font-body text-sm text-foreground leading-relaxed">
                        {exegesisData.aplicacao_pratica}
                      </p>
                    </div>
                  )}

                  {/* Cross references */}
                  {exegesisData.referencias_cruzadas?.length > 0 && (
                    <div>
                      <p className="font-display text-[9px] tracking-[2px] uppercase text-primary mb-1.5">
                        Referências Cruzadas
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {exegesisData.referencias_cruzadas.map((r: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 border border-border
                            text-primary font-body text-xs">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* ── Connections tab ── */}
          {tab === "connections" && (
            <div>
              {connectionsLoading ? (
                <SkeletonBlock />
              ) : connectionsData ? (
                <div className="space-y-4">
                  {/* Themes */}
                  {connectionsData.temas?.length > 0 && (
                    <div>
                      <p className="font-display text-[9px] tracking-[2px] uppercase text-primary mb-2">
                        Temas identificados
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {connectionsData.temas.map((t: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30
                            text-primary font-display text-[10px] tracking-wide">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related passages */}
                  {connectionsData.passagens_relacionadas?.length > 0 && (
                    <div>
                      <p className="font-display text-[9px] tracking-[2px] uppercase text-primary mb-2">
                        Passagens Relacionadas
                      </p>
                      <div className="space-y-2.5">
                        {connectionsData.passagens_relacionadas.map((p: any, i: number) => (
                          <div key={i} className="bg-background border border-border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-display text-[10px] tracking-wide text-primary font-bold">
                                {p.referencia}
                              </span>
                            </div>
                            {p.texto_resumido && (
                              <p className="font-body text-sm text-foreground italic mb-1.5">
                                "{p.texto_resumido}"
                              </p>
                            )}
                            <p className="font-body text-xs text-muted-foreground leading-relaxed">
                              {p.conexao}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="px-5 pt-2 pb-1 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-transparent border border-border
              text-muted-foreground font-display text-[9px] tracking-wide uppercase text-center cursor-pointer
              hover:border-primary/30 active:opacity-70 transition-all duration-150"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="font-display text-[9px] tracking-[1px] uppercase text-primary shrink-0 mt-0.5 w-24">
        {label}
      </span>
      <span className="font-body text-sm text-foreground leading-relaxed">{value}</span>
    </div>
  );
}
