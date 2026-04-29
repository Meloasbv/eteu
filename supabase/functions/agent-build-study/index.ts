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

const SYSTEM = `Você é um teólogo reformado experiente que transforma transcrições de aulas/pregações em MATERIAL DE ESTUDO ESTRUTURADO em português.

Receba: a transcrição completa + tópicos já detectados ao vivo.

GERE um JSON com este formato EXATO (compatível com AnalysisResult do app):

{
  "main_theme": "Título da aula (5-10 palavras)",
  "summary": "1 frase resumindo a tese central da aula (máx 140 chars)",
  "keywords": ["6-10 palavras-chave"],
  "key_concepts": [
    {
      "id": "topic-1",
      "title": "Título do tópico",
      "description": "1-2 frases resumindo",
      "category": "teologia" | "cristologia" | "pneumatologia" | "exegese" | "contexto" | "aplicacao" | "escatologia" | "soteriologia",
      "type": "topic",
      "bible_refs": ["Rm 8:28"],
      "expanded_note": {
        "core_idea": "1 frase com a ideia central",
        "explanation": "Parágrafo de 3-5 frases",
        "key_points": ["ponto 1", "ponto 2", "ponto 3", "ponto 4"],
        "verses": ["Rm 8:28", "Jo 1:14"],
        "application": "1-2 frases aplicação prática",
        "impact_phrase": "frase impactante extraída ou destilada do conteúdo",
        "author_quotes": [{"text": "citação", "author": "autor"}],
        "key_people": [{"name": "Nome", "role": "papel breve", "points": ["fato 1"]}],
        "key_dates": [{"date": "1738", "event": "Conversão de Wesley em Aldersgate"}]
      }
    }
  ],
  "structured_notes": [
    { "section_title": "Tópico 1", "points": ["ponto", "ponto"] }
  ],
  "hierarchy": { "root": { "label": "Tema central", "children": [{"label": "Tópico 1"}] } },
  "quiz_questions": [
    { "question": "Pergunta?", "options": ["A", "B", "C", "D"], "answer_index": 0 }
  ]
}

REGRAS:
- 4 a 10 tópicos (use os tópicos já detectados como base, refine títulos se preciso)
- Quiz com 8-12 perguntas de múltipla escolha
- Versículos no formato curto padrão (Rm 8:28, 2 Pe 1:4)
- key_points objetivos, não vagos
- Fidelidade ao conteúdo da transcrição — NÃO invente
- Identifique pessoas e datas só se aparecem na transcrição

Retorne APENAS JSON válido, sem markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ausente");
    const { transcript, topics } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "transcript obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Truncate to ~30k chars to keep within token limits
    const t = transcript.length > 30000 ? transcript.slice(0, 30000) + "\n[...truncado]" : transcript;
    const topicsTxt = (topics || []).map((tp: any, i: number) => `${i + 1}. ${tp.title || tp}`).join("\n");

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 16000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `TÓPICOS DETECTADOS AO VIVO:\n${topicsTxt || "(nenhum)"}\n\nTRANSCRIÇÃO COMPLETA:\n${t}` },
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
      return new Response(JSON.stringify({ error: "Resposta da IA não pôde ser parseada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[agent-build-study]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
