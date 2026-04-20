import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function safeJson(raw: string): any {
  let s = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(s); } catch {}
  s = s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
  try { return JSON.parse(s); } catch { return null; }
}

async function ai(messages: any[], maxTokens = 4000) {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      max_tokens: maxTokens,
      messages,
    }),
  });
  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw new Error("rate_limited");
    if (status === 402) throw new Error("credits_exhausted");
    throw new Error("gateway_error");
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

const DEEP_PROMPT = (title: string, summary: string, peers: string[]) => `
Você é um teólogo reformado. Vou te dar um conceito de um mapa mental e você vai gerar a CAMADA DE ESTUDO PROFUNDO.

CONCEITO: "${title}"
${summary ? `Resumo atual: ${summary}\n` : ""}
${peers.length ? `Outros conceitos no mesmo mapa: ${peers.join(", ")}\n` : ""}

TAREFA: Gere TRÊS blocos densos para estudo aprofundado.

1. theological_analysis: 5 a 8 frases de análise teológica/doutrinária. Cite escolas (calvinismo, arminianismo, dispensacionalismo etc.), autores (Calvino, Edwards, Bavinck, Lutero etc.) ou correntes quando relevante. Aborde tensões, controvérsias e implicações doutrinárias. NÃO seja superficial.

2. connections: 3 a 5 conexões com OUTROS conceitos do mapa (use apenas títulos da lista de peers acima). Para cada conexão, indique a relação ("complementa", "fundamenta", "contrasta com", "antecede", "ilumina"). Se não houver peers úteis, gere conexões com conceitos teológicos clássicos.

3. reflection_questions: 4 a 6 perguntas reflexivas profundas, que provoquem meditação pessoal e exegética. Evite perguntas "sim/não".

RETORNE APENAS JSON válido:
{
  "theological_analysis": "string longa",
  "connections": [
    { "concept_title": "Título do peer", "relation": "complementa" }
  ],
  "reflection_questions": ["pergunta?", "..."]
}
`;

const TRANSFORM_PROMPTS: Record<string, (t: string, s: string, body: string) => string> = {
  study_card: (title, _s, body) => `Você é um teólogo. Transforme o conceito abaixo num CARTÃO DE ESTUDO em Markdown, denso e escaneável.

Estrutura obrigatória:
# ${title}
**Definição:** 1-2 frases.
**Pontos-chave:** 4-6 bullets curtos.
**Versículo central:** ref + frase explicativa.
**Compreensão:** parágrafo de 3-5 frases.
**Aplicação:** 2-3 frases práticas.

Conteúdo-base:
${body}`,

  devotional: (title, _s, body) => `Você é um teólogo reformado escrevendo um DEVOCIONAL caloroso e bíblico em Markdown sobre "${title}".

Estrutura:
# ${title}
*Versículo:* ref + texto curto
**Reflexão** (3-4 parágrafos meditativos)
**Oração** (3-5 frases em primeira pessoa)
**Compromisso do dia** (1 frase prática)

Use o conteúdo abaixo como base teológica:
${body}`,

  sermon_outline: (title, _s, body) => `Você é um pregador reformado preparando um ESBOÇO DE SERMÃO em Markdown sobre "${title}".

Estrutura:
# ${title}
**Texto-base:** referência principal
**Tese:** 1 frase
**Introdução** (gancho curto)
## I. Primeiro ponto
- explicação
- ilustração
- aplicação
## II. Segundo ponto
- explicação
- ilustração
- aplicação
## III. Terceiro ponto
- explicação
- ilustração
- aplicação
**Conclusão** (apelo / chamada à ação)

Conteúdo-base:
${body}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, title, summary, body, peers } = await req.json();
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!title || typeof title !== "string") {
      return new Response(JSON.stringify({ error: "title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Mode: deep (level 3 expansion) ──
    if (!mode || mode === "deep") {
      const peerList = Array.isArray(peers) ? peers.slice(0, 12) : [];
      const content = await ai([
        { role: "system", content: DEEP_PROMPT(title, summary || "", peerList) },
        { role: "user", content: "Gere o estudo profundo." },
      ], 4500);
      const parsed = safeJson(content) || {};
      return new Response(JSON.stringify({
        theological_analysis: parsed.theological_analysis || "",
        connections: Array.isArray(parsed.connections) ? parsed.connections : [],
        reflection_questions: Array.isArray(parsed.reflection_questions) ? parsed.reflection_questions : [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Mode: transform ──
    const builder = TRANSFORM_PROMPTS[mode];
    if (!builder) {
      return new Response(JSON.stringify({ error: `unknown mode '${mode}'` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const content = await ai([
      { role: "system", content: "Você responde APENAS em Markdown limpo, sem explicações extras." },
      { role: "user", content: builder(title, summary || "", body || "") },
    ], 3500);

    return new Response(JSON.stringify({ markdown: content.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    const status = msg === "rate_limited" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    const userMsg = msg === "rate_limited" ? "Limite de IA atingido. Tente em alguns minutos."
      : msg === "credits_exhausted" ? "Créditos de IA esgotados."
      : msg;
    return new Response(JSON.stringify({ error: userMsg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
