import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function safeParse(s: string): any {
  let t = s.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

const SYSTEM = `Você é um teólogo reformado revisando transcrições BRUTAS de áudio (aulas/pregações) em português, antes de virarem tópicos de estudo.

ETAPA 1 — REVISAR E CORRIGIR a transcrição usando o TEMA (tópicos anteriores) como contexto:
- Corrija nomes bíblicos mal grafados (ex.: "moises"→"Moisés", "jezus"→"Jesus", "habacuque"→"Habacuque", "tessalonicensses"→"tessalonicenses").
- Corrija termos teológicos quebrados ("sotério logia"→"soteriologia", "esca tologia"→"escatologia", "justi ficação"→"justificação").
- Corrija referências bíblicas mal transcritas ("romanos capítulo 8 versículo 28"→"Romanos 8:28").
- Conserte palavras sem sentido / fonéticas erradas inferindo pelo contexto teológico do tema.
- Pontue mínimo necessário, sem reescrever o estilo. NÃO invente conteúdo, NÃO acrescente ideias.
- Se uma palavra não fizer sentido E você não conseguir inferir com segurança, deixe-a como está.

ETAPA 2 — A partir do texto JÁ CORRIGIDO, gere:
- title: 3-5 palavras.
- summary: 1-2 frases curtas resumindo o que a pessoa disse.
- keywords: 3-6 substantivos/verbos centrais, minúsculos, sem stopwords.
- verses: versículos citados em formato curto ("Rm 8:28", "2 Pe 1:4").

Retorne APENAS JSON neste formato EXATO:
{
  "corrected_text": "Texto da transcrição revisado e corrigido, mantendo a fala original.",
  "title": "Título curto",
  "summary": "Resumo de 1-2 frases.",
  "keywords": ["palavra1","palavra2","palavra3"],
  "verses": ["Rm 8:28"]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ausente");
    const { text, previous_titles } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return new Response(JSON.stringify({ error: "texto muito curto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ctx = (previous_titles || []).slice(-5).map((t: string, i: number) => `${i + 1}. ${t}`).join("\n");

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `BLOCOS ANTERIORES (contexto):\n${ctx || "(nenhum)"}\n\nNOVO BLOCO (transcrição bruta):\n${text}` },
        ],
      }),
    });
    if (!res.ok) {
      const status = res.status;
      const errMsg = status === 429 ? "Limite atingido." : status === 402 ? "Créditos esgotados." : "Falha no gateway.";
      return new Response(JSON.stringify({ error: errMsg }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = safeParse(content);
    if (!parsed) {
      return new Response(JSON.stringify({ error: "parse falhou" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[agent-summarize-block]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
