import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM = `Você é um agente de detecção de tópicos para AULAS BÍBLICAS / PREGAÇÕES em português.
Recebe um trecho NOVO de transcrição ao vivo + lista de tópicos já existentes.

TAREFA:
1. O trecho continua um tópico existente OU inicia um tópico novo? (mude de tópico apenas se houver clara virada de assunto)
2. Se NOVO: dê um título curto (3-6 palavras), descritivo e fiel ao conteúdo
3. Detecte versículos mencionados (ex: "Romanos 8:28", "segundo Pedro capítulo 1 versículo 4" → "2 Pe 1:4"). Normalize para forma curta padrão.
4. Frases de impacto: frases enfáticas, repetidas, ou que soam como citações/aforismos
5. Pontos-chave: 1-3 afirmações principais do trecho

Retorne APENAS JSON válido, sem markdown:
{
  "topic_action": "existing" | "new",
  "existing_topic_title": "título exato do tópico existente, se 'existing'",
  "new_topic_title": "título se 'new' (3-6 palavras)",
  "detected_verses": ["2 Pe 1:4", "Mc 12:34"],
  "impact_phrases": ["frase de impacto"],
  "key_points": ["ponto 1", "ponto 2"]
}`;

function safeParse(s: string): any {
  let t = s.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ausente");
    const { new_text, existing_topics } = await req.json();
    if (!new_text || typeof new_text !== "string") {
      return new Response(JSON.stringify({ error: "new_text obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userMsg = `TÓPICOS EXISTENTES:\n${(existing_topics || []).map((t: string, i: number) => `${i + 1}. ${t}`).join("\n") || "(nenhum)"}\n\nTRECHO NOVO:\n${new_text}`;

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (!res.ok) {
      const status = res.status;
      const errMsg = status === 429 ? "Limite de requisições atingido."
        : status === 402 ? "Créditos esgotados."
        : "Falha no gateway de IA.";
      return new Response(JSON.stringify({ error: errMsg }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = safeParse(content) || {
      topic_action: "existing",
      detected_verses: [],
      impact_phrases: [],
      key_points: [],
    };
    return new Response(JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[agent-classify]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
