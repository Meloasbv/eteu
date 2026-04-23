import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Aliases pt-br → nome canônico no banco
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

interface ParsedRange {
  book: string;
  chapterStart: number;
  chapterEnd: number;
  verseStart?: number;
  verseEnd?: number;
}

function parseReading(input: string): ParsedRange | null {
  if (!input) return null;
  const cleaned = input.replace(/;/g, " ").replace(/[.,;:\s]+$/g, "").replace(/\s+/g, " ").trim();
  // Padrões aceitos:
  //   "Esdras 1-6"            → cap range
  //   "Esdras 1"              → único cap
  //   "Esdras 1:1-10"         → versículos
  //   "Esdras 1:5"            → único versículo
  const m = cleaned.match(
    /^([1-3]?\s?[A-Za-zÀ-ÿ\.]+(?:\s+[A-Za-zÀ-ÿ\.]+)?)\s+(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?:[:\.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/,
  );
  if (!m) return null;

  const rawBook = m[1].toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ").trim();
  const canonical = BOOK_ALIASES[rawBook];
  if (!canonical) return null;

  const first = parseInt(m[2], 10);
  const second = m[3] ? parseInt(m[3], 10) : undefined;
  const verseStart = m[4] ? parseInt(m[4], 10) : undefined;
  const verseEnd = m[5] ? parseInt(m[5], 10) : undefined;

  // Se houver `:`, então m[2] é o capítulo único e m[3] (se houver) também é capítulo seria inválido
  if (verseStart !== undefined) {
    return {
      book: canonical,
      chapterStart: first,
      chapterEnd: first,
      verseStart,
      verseEnd: verseEnd ?? verseStart,
    };
  }

  return {
    book: canonical,
    chapterStart: first,
    chapterEnd: second ?? first,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { readings } = await req.json();
    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return new Response(
        JSON.stringify({ error: "Envie a lista de leituras." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const blocks: string[] = [];
    const missing: string[] = [];

    for (const reading of readings) {
      const parsed = parseReading(String(reading));
      if (!parsed) {
        missing.push(String(reading));
        continue;
      }

      for (let ch = parsed.chapterStart; ch <= parsed.chapterEnd; ch++) {
        let q = supabase
          .from("bible_verses")
          .select("verse, text")
          .eq("translation", "arc")
          .eq("book", parsed.book)
          .eq("chapter", ch)
          .order("verse", { ascending: true });

        if (ch === parsed.chapterStart && parsed.verseStart !== undefined) {
          q = q.gte("verse", parsed.verseStart);
        }
        if (ch === parsed.chapterEnd && parsed.verseEnd !== undefined) {
          q = q.lte("verse", parsed.verseEnd);
        }

        const { data: rows, error } = await q;
        if (error) {
          console.error("DB error:", error);
          continue;
        }
        if (!rows || rows.length === 0) {
          missing.push(`${parsed.book} ${ch}`);
          continue;
        }

        const header = `**${parsed.book} ${ch}**`;
        const lines = rows.map((r: { verse: number; text: string }) => `${r.verse} ${r.text.trim()}`);
        blocks.push([header, ...lines].join("\n"));
      }
    }

    // Fallback IA apenas para leituras não encontradas no banco local
    let aiFallback = "";
    if (missing.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const sysPrompt = `Você é um assistente bíblico. Forneça o TEXTO COMPLETO dos capítulos solicitados da Almeida Revista e Corrigida (ARC). Numere cada versículo no formato "N texto". Separe capítulos com "---". Título de cada capítulo: "**Livro N**". Não parafraseie.`;
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: sysPrompt },
                { role: "user", content: `Texto bíblico ARC: ${missing.join(", ")}` },
              ],
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            aiFallback = aiData.choices?.[0]?.message?.content || "";
          }
        } catch (e) {
          console.error("AI fallback error:", e);
        }
      }
    }

    const result = [blocks.join("\n---\n"), aiFallback].filter(Boolean).join("\n---\n");

    return new Response(
      JSON.stringify({ result, source: "local-db", missing }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("fetch-reading-text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
