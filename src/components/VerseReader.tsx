import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Repeat, X,
  Maximize2, Minimize2, Volume2, ChevronDown,
} from "lucide-react";

interface Verse {
  number: number;
  text: string;
}

interface Props {
  book: string;
  chapter: number;
  version?: string;
  onClose: () => void;
}

// ABibliaDigital book abbreviation map
const BOOK_MAP: Record<string, string> = {
  "gênesis": "gn", "genesis": "gn", "gn": "gn",
  "êxodo": "ex", "exodo": "ex", "ex": "ex",
  "levítico": "lv", "levitico": "lv", "lv": "lv",
  "números": "nm", "numeros": "nm", "nm": "nm",
  "deuteronômio": "dt", "deuteronomio": "dt", "dt": "dt",
  "josué": "js", "josue": "js", "js": "js",
  "juízes": "jz", "juizes": "jz", "jz": "jz",
  "rute": "rt", "rt": "rt",
  "1 samuel": "1sm", "i samuel": "1sm", "1sm": "1sm", "i sm": "1sm",
  "2 samuel": "2sm", "ii samuel": "2sm", "2sm": "2sm", "ii sm": "2sm",
  "1 reis": "1rs", "i reis": "1rs", "1rs": "1rs", "i rs": "1rs",
  "2 reis": "2rs", "ii reis": "2rs", "2rs": "2rs", "ii rs": "2rs",
  "1 crônicas": "1cr", "i crônicas": "1cr", "1cr": "1cr", "i cr": "1cr",
  "2 crônicas": "2cr", "ii crônicas": "2cr", "2cr": "2cr", "ii cr": "2cr",
  "esdras": "ed", "ed": "ed",
  "neemias": "ne", "ne": "ne",
  "ester": "et", "et": "et",
  "jó": "job", "job": "job",
  "salmos": "sl", "salmo": "sl", "sl": "sl",
  "provérbios": "pv", "proverbios": "pv", "pv": "pv",
  "eclesiastes": "ec", "ec": "ec",
  "cantares": "ct", "ct": "ct",
  "isaías": "is", "isaias": "is", "is": "is",
  "jeremias": "jr", "jr": "jr",
  "lamentações": "lm", "lamentacoes": "lm", "lm": "lm",
  "ezequiel": "ez", "ez": "ez",
  "daniel": "dn", "dn": "dn",
  "oséias": "os", "oseias": "os", "os": "os",
  "joel": "jl", "jl": "jl",
  "amós": "am", "amos": "am", "am": "am",
  "obadias": "ob", "ob": "ob",
  "jonas": "jn", "jn": "jn",
  "miquéias": "mq", "miqueias": "mq", "mq": "mq",
  "naum": "na", "na": "na",
  "habacuque": "hc", "hc": "hc",
  "sofonias": "sf", "sf": "sf",
  "ageu": "ag", "ag": "ag",
  "zacarias": "zc", "zc": "zc",
  "malaquias": "ml", "ml": "ml",
  "mateus": "mt", "mt": "mt",
  "marcos": "mc", "mc": "mc",
  "lucas": "lc", "lc": "lc",
  "joão": "jo",
  "atos": "at", "at": "at",
  "romanos": "rm", "rm": "rm",
  "1 coríntios": "1co", "i coríntios": "1co", "1co": "1co",
  "2 coríntios": "2co", "ii coríntios": "2co", "2co": "2co",
  "gálatas": "gl", "galatas": "gl", "gl": "gl",
  "efésios": "ef", "efesios": "ef", "ef": "ef",
  "filipenses": "fp", "fp": "fp",
  "colossenses": "cl", "cl": "cl",
  "1 tessalonicenses": "1ts", "i tessalonicenses": "1ts", "1ts": "1ts",
  "2 tessalonicenses": "2ts", "ii tessalonicenses": "2ts", "2ts": "2ts",
  "1 timóteo": "1tm", "i timóteo": "1tm", "1tm": "1tm",
  "2 timóteo": "2tm", "ii timóteo": "2tm", "2tm": "2tm",
  "tito": "tt", "tt": "tt",
  "filemom": "fm", "fm": "fm",
  "hebreus": "hb", "hb": "hb",
  "tiago": "tg", "tg": "tg",
  "1 pedro": "1pe", "i pedro": "1pe", "1pe": "1pe",
  "2 pedro": "2pe", "ii pedro": "2pe", "2pe": "2pe",
  "1 joão": "1jo", "i joão": "1jo", "1jo": "1jo",
  "2 joão": "2jo", "ii joão": "2jo", "2jo": "2jo",
  "3 joão": "3jo", "iii joão": "3jo", "3jo": "3jo",
  "judas": "jd", "jd": "jd",
  "apocalipse": "ap", "ap": "ap",
};

const VERSION_MAP: Record<string, string> = {
  almeida: "ra", ara: "ra", nvi: "nvi", acf: "acf", kjv: "kjv", bbe: "bbe",
};

function resolveBookAbbr(book: string): string {
  const lower = book.toLowerCase().trim();
  return BOOK_MAP[lower] || lower;
}

export default function VerseReader({ book, chapter, version = "almeida", onClose }: Props) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch verses from ABibliaDigital
  useEffect(() => {
    setLoading(true);
    setError(null);
    setVerses([]);
    setCurrentIdx(0);

    const abbr = resolveBookAbbr(book);
    const ver = VERSION_MAP[version.toLowerCase()] || "ra";
    const url = `https://www.abibliadigital.com.br/api/verses/${ver}/${abbr}/${chapter}`;

    fetch(url, {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" }, // public token
    })
      .then(r => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data?.verses?.length) {
          setVerses(data.verses.map((v: any) => ({ number: v.number, text: v.text })));
        } else {
          setError("Capítulo não encontrado.");
        }
      })
      .catch(() => setError("Não foi possível carregar os versículos."))
      .finally(() => setLoading(false));
  }, [book, chapter, version]);

  // TTS
  const speakVerse = useCallback((idx: number) => {
    window.speechSynthesis.cancel();
    if (idx >= verses.length) { setIsPlaying(false); return; }
    const utt = new SpeechSynthesisUtterance(verses[idx].text);
    utt.lang = "pt-BR";
    utt.rate = speed;
    utt.onend = () => {
      // Auto-advance
      if (idx < verses.length - 1) {
        setCurrentIdx(idx + 1);
        speakVerse(idx + 1);
      } else {
        setIsPlaying(false);
      }
    };
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [verses, speed]);

  const play = useCallback(() => {
    setIsPlaying(true);
    speakVerse(currentIdx);
  }, [currentIdx, speakVerse]);

  const pause = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const next = useCallback(() => {
    if (currentIdx < verses.length - 1) {
      const newIdx = currentIdx + 1;
      setCurrentIdx(newIdx);
      if (isPlaying) { window.speechSynthesis.cancel(); speakVerse(newIdx); }
    }
  }, [currentIdx, verses.length, isPlaying, speakVerse]);

  const prev = useCallback(() => {
    if (currentIdx > 0) {
      const newIdx = currentIdx - 1;
      setCurrentIdx(newIdx);
      if (isPlaying) { window.speechSynthesis.cancel(); speakVerse(newIdx); }
    }
  }, [currentIdx, isPlaying, speakVerse]);

  const repeatVerse = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(true);
    const utt = new SpeechSynthesisUtterance(verses[currentIdx]?.text || "");
    utt.lang = "pt-BR";
    utt.rate = speed;
    utt.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utt);
  }, [currentIdx, verses, speed]);

  // Cleanup
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const speeds = [0.75, 0.85, 1, 1.25, 1.5];
  const currentVerse = verses[currentIdx];
  const progress = verses.length ? ((currentIdx + 1) / verses.length) * 100 : 0;

  return (
    <div ref={containerRef}
      className={`fixed inset-0 z-50 bg-background flex flex-col transition-all duration-500 ${isFullscreen ? "" : "animate-fade-in"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
        <div>
          <p className="text-[10px] text-muted-foreground tracking-[2px] uppercase">Modo Leitura</p>
          <p className="text-sm font-medium text-foreground">{book} {chapter}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleFullscreen} className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border/20">
        <div className="h-full bg-primary/50 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto">
        {loading ? (
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary/60 rounded-full animate-spin" />
        ) : error ? (
          <div className="text-center">
            <p className="text-muted-foreground text-sm">{error}</p>
            <button onClick={onClose} className="mt-4 text-primary text-sm underline">Voltar</button>
          </div>
        ) : currentVerse ? (
          <div className="max-w-lg w-full text-center animate-fade-in" key={currentIdx}>
            {/* Verse number */}
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold mb-6">
              Versículo {currentVerse.number}
            </span>

            {/* Verse text */}
            <blockquote className="font-serif text-[24px] leading-[2] text-foreground/85 italic tracking-wide">
              {currentVerse.text}
            </blockquote>

            {/* Counter */}
            <p className="text-[11px] text-muted-foreground mt-8">
              {currentIdx + 1} de {verses.length}
            </p>
          </div>
        ) : null}
      </div>

      {/* Controls */}
      {!loading && !error && verses.length > 0 && (
        <div className="px-6 py-5 border-t border-border/20">
          {/* Speed selector */}
          <div className="relative flex justify-center mb-4">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] text-muted-foreground border border-border/30 hover:border-primary/20 transition-all"
            >
              <Volume2 size={12} />
              {speed}x
              <ChevronDown size={10} />
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full mb-2 bg-card border border-border rounded-xl shadow-lg p-1 animate-fade-in">
                {speeds.map(s => (
                  <button key={s}
                    onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                    className={`block w-full px-4 py-1.5 rounded-lg text-[11px] text-left transition-colors
                      ${s === speed ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted"}`}>
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main controls */}
          <div className="flex items-center justify-center gap-6">
            <button onClick={prev} disabled={currentIdx === 0}
              className="p-3 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all active:scale-90">
              <SkipBack size={20} />
            </button>

            <button onClick={isPlaying ? pause : play}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:shadow-xl transition-all active:scale-95">
              {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>

            <button onClick={next} disabled={currentIdx >= verses.length - 1}
              className="p-3 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all active:scale-90">
              <SkipForward size={20} />
            </button>

            <button onClick={repeatVerse}
              className="p-3 rounded-full text-muted-foreground hover:text-primary transition-all active:scale-90">
              <Repeat size={18} />
            </button>
          </div>

          {/* Verse dots */}
          <div className="flex justify-center gap-1 mt-4 flex-wrap max-w-xs mx-auto">
            {verses.slice(0, 40).map((_, i) => (
              <button key={i}
                onClick={() => { setCurrentIdx(i); if (isPlaying) { window.speechSynthesis.cancel(); speakVerse(i); } }}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIdx ? "bg-primary scale-125" : i < currentIdx ? "bg-primary/30" : "bg-border"}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
