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

const SYSTEM = `Você revisa e RESUME blocos de fala (transcrição bruta de aula/pregação) em português.

REGRAS DE OURO:
- NÃO adicione conteúdo novo, NÃO interprete além do que foi dito.
- Corrija erros óbvios de transcrição (nomes bíblicos, termos teológicos).
- Resuma em 1-2 frases CURTAS o que a pessoa quis dizer.
- Extraia 3-6 keywords (substantivos/verbos centrais, em minúsculas, sem stopwords).
- Crie um título de 3-5 palavras para o bloco.
- Detecte versículos citados (formato curto: "Rm 8:28").

Retorne APENAS JSON neste formato:
{
  "title": "Título curto",
  "summary": "Resumo de 1-2 frases do que foi dito.",
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
        max_tokens: 600,
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
