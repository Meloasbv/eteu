import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map abbreviations / variants to canonical Portuguese book names used in the DB.
const BOOK_ALIASES: Record<string, string> = {
  "gn": "Gênesis", "gen": "Gênesis", "gên": "Gênesis", "genesis": "Gênesis", "gênesis": "Gênesis",
  "ex": "Êxodo", "êx": "Êxodo", "exodo": "Êxodo", "êxodo": "Êxodo",
  "lv": "Levítico", "lev": "Levítico", "levitico": "Levítico", "levítico": "Levítico",
  "nm": "Números", "num": "Números", "numeros": "Números", "números": "Números",
  "dt": "Deuteronômio", "deut": "Deuteronômio", "deuteronomio": "Deuteronômio", "deuteronômio": "Deuteronômio",
  "js": "Josué", "jos": "Josué", "josue": "Josué", "josué": "Josué",
  "jz": "Juízes", "jui": "Juízes", "juízes": "Juízes", "juizes": "Juízes",
  "rt": "Rute", "rut": "Rute", "rute": "Rute",
  "1sm": "1 Samuel", "1 sm": "1 Samuel", "1 samuel": "1 Samuel", "i samuel": "1 Samuel",
  "2sm": "2 Samuel", "2 sm": "2 Samuel", "2 samuel": "2 Samuel", "ii samuel": "2 Samuel",
  "1rs": "1 Reis", "1 rs": "1 Reis", "1 reis": "1 Reis", "i reis": "1 Reis",
  "2rs": "2 Reis", "2 rs": "2 Reis", "2 reis": "2 Reis", "ii reis": "2 Reis",
  "1cr": "1 Crônicas", "1 cr": "1 Crônicas", "1 crônicas": "1 Crônicas", "1 cronicas": "1 Crônicas",
  "2cr": "2 Crônicas", "2 cr": "2 Crônicas", "2 crônicas": "2 Crônicas", "2 cronicas": "2 Crônicas",
  "ed": "Esdras", "esd": "Esdras", "esdras": "Esdras",
  "ne": "Neemias", "nee": "Neemias", "neemias": "Neemias",
  "et": "Ester", "est": "Ester", "ester": "Ester",
  "jó": "Jó", "job": "Jó",
  "sl": "Salmos", "sal": "Salmos", "salmo": "Salmos", "salmos": "Salmos",
  "pv": "Provérbios", "prov": "Provérbios", "provérbios": "Provérbios", "proverbios": "Provérbios",
  "ec": "Eclesiastes", "ecl": "Eclesiastes", "eclesiastes": "Eclesiastes",
  "ct": "Cantares", "cant": "Cantares", "cânticos": "Cantares", "canticos": "Cantares", "cantares": "Cantares",
  "is": "Isaías", "isa": "Isaías", "isaias": "Isaías", "isaías": "Isaías",
  "jr": "Jeremias", "jer": "Jeremias", "jeremias": "Jeremias",
  "lm": "Lamentações", "lam": "Lamentações", "lamentações": "Lamentações", "lamentacoes": "Lamentações",
  "ez": "Ezequiel", "eze": "Ezequiel", "ezequiel": "Ezequiel",
  "dn": "Daniel", "dan": "Daniel", "daniel": "Daniel",
  "os": "Oséias", "ose": "Oséias", "oseias": "Oséias", "oséias": "Oséias",
  "jl": "Joel", "joel": "Joel",
  "am": "Amós", "amos": "Amós", "amós": "Amós",
  "ob": "Obadias", "oba": "Obadias", "obadias": "Obadias",
  "jn": "Jonas", "jon": "Jonas", "jonas": "Jonas",
  "mq": "Miquéias", "miq": "Miquéias", "miquéias": "Miquéias", "miqueias": "Miquéias",
  "na": "Naum", "naum": "Naum",
  "hc": "Habacuque", "hab": "Habacuque", "habacuque": "Habacuque",
  "sf": "Sofonias", "sof": "Sofonias", "sofonias": "Sofonias",
  "ag": "Ageu", "age": "Ageu", "ageu": "Ageu",
  "zc": "Zacarias", "zac": "Zacarias", "zacarias": "Zacarias",
  "ml": "Malaquias", "mal": "Malaquias", "malaquias": "Malaquias",
  "mt": "Mateus", "mat": "Mateus", "mateus": "Mateus",
  "mc": "Marcos", "mar": "Marcos", "marcos": "Marcos",
  "lc": "Lucas", "luc": "Lucas", "lucas": "Lucas",
  "jo": "João", "joão": "João", "joao": "João",
  "at": "Atos", "ato": "Atos", "atos": "Atos",
  "rm": "Romanos", "rom": "Romanos", "romanos": "Romanos",
  "1co": "1 Coríntios", "1 co": "1 Coríntios", "1 coríntios": "1 Coríntios", "1 corintios": "1 Coríntios",
  "2co": "2 Coríntios", "2 co": "2 Coríntios", "2 coríntios": "2 Coríntios", "2 corintios": "2 Coríntios",
  "gl": "Gálatas", "gal": "Gálatas", "gálatas": "Gálatas", "galatas": "Gálatas",
  "ef": "Efésios", "efe": "Efésios", "efésios": "Efésios", "efesios": "Efésios",
  "fp": "Filipenses", "fil": "Filipenses", "filipenses": "Filipenses",
  "cl": "Colossenses", "col": "Colossenses", "colossenses": "Colossenses",
  "1ts": "1 Tessalonicenses", "1 ts": "1 Tessalonicenses", "1 tessalonicenses": "1 Tessalonicenses",
  "2ts": "2 Tessalonicenses", "2 ts": "2 Tessalonicenses", "2 tessalonicenses": "2 Tessalonicenses",
  "1tm": "1 Timóteo", "1 tm": "1 Timóteo", "1 timóteo": "1 Timóteo", "1 timoteo": "1 Timóteo",
  "2tm": "2 Timóteo", "2 tm": "2 Timóteo", "2 timóteo": "2 Timóteo", "2 timoteo": "2 Timóteo",
  "tt": "Tito", "tit": "Tito", "tito": "Tito",
  "fm": "Filemom", "flm": "Filemom", "filemom": "Filemom", "filemon": "Filemom",
  "hb": "Hebreus", "heb": "Hebreus", "hebreus": "Hebreus",
  "tg": "Tiago", "tia": "Tiago", "tiago": "Tiago",
  "1pe": "1 Pedro", "1 pe": "1 Pedro", "1 pedro": "1 Pedro",
  "2pe": "2 Pedro", "2 pe": "2 Pedro", "2 pedro": "2 Pedro",
  "1jo": "1 João", "1 jo": "1 João", "1 joão": "1 João", "1 joao": "1 João",
  "2jo": "2 João", "2 jo": "2 João", "2 joão": "2 João", "2 joao": "2 João",
  "3jo": "3 João", "3 jo": "3 João", "3 joão": "3 João", "3 joao": "3 João",
  "jd": "Judas", "jud": "Judas", "judas": "Judas",
  "ap": "Apocalipse", "apo": "Apocalipse", "apocalipse": "Apocalipse",
};

interface ParsedRef {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

function normalizeRef(input: string): ParsedRef | null {
  if (!input) return null;
  const cleaned = input
    .replace(/;/g, " ")
    .replace(/[.,;:\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // <book> <chapter>[:<verse>[-<endVerse>]]
  const m = cleaned.match(
    /^([1-3]?\s?[A-Za-zÀ-ÿ\.]+(?:\s+[A-Za-zÀ-ÿ\.]+)?)\s+(\d{1,3})(?:[:\.]\s*(\d{1,3}))?(?:\s*[-–]\s*(\d{1,3}))?$/,
  );
  if (!m) return null;

  const rawBook = m[1].toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ").trim();
  const canonical = BOOK_ALIASES[rawBook];
  if (!canonical) return null;

  return {
    book: canonical,
    chapter: parseInt(m[2], 10),
    verseStart: m[3] ? parseInt(m[3], 10) : undefined,
    verseEnd: m[4] ? parseInt(m[4], 10) : undefined,
  };
}

function formatLabel(p: ParsedRef): string {
  let label = `${p.book} ${p.chapter}`;
  if (p.verseStart) {
    label += `:${p.verseStart}`;
    if (p.verseEnd && p.verseEnd !== p.verseStart) label += `-${p.verseEnd}`;
  }
  return label;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const reference: string = body.reference || body.ref || body.verse || "";

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Referência não fornecida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = normalizeRef(reference);
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Referência não reconhecida.", input: reference }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase
      .from("bible_verses")
      .select("book, chapter, verse, text")
      .eq("translation", "arc")
      .eq("book", parsed.book)
      .eq("chapter", parsed.chapter)
      .order("verse", { ascending: true });

    if (parsed.verseStart) {
      query = query.gte("verse", parsed.verseStart);
      query = query.lte("verse", parsed.verseEnd ?? parsed.verseStart);
    }

    const { data, error } = await query;
    if (error) {
      console.error("DB error:", error);
      return new Response(
        JSON.stringify({ error: "DB error", message: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const verses = data || [];
    if (verses.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Versículo não encontrado no banco local.",
          reference: formatLabel(parsed),
          found: false,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const text = verses.map((v) => v.text).join(" ");
    return new Response(
      JSON.stringify({
        reference: formatLabel(parsed),
        translation: "arc",
        translation_name: "Almeida Revista e Corrigida",
        text,
        verses,
        found: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("bible-verse error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
