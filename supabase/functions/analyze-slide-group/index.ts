import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function safeJsonParse(raw: string): any {
  let s = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(s); } catch { /* fallthrough */ }
  let repaired = s
    .replace(/,\s*$/g, "")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");
  const ob = (repaired.match(/{/g) || []).length;
  const cb = (repaired.match(/}/g) || []).length;
  const obk = (repaired.match(/\[/g) || []).length;
  const cbk = (repaired.match(/]/g) || []).length;
  repaired = repaired.replace(/,\s*"[^"]*$/, "");
  repaired = repaired.replace(/:\s*"[^"]*$/, ': ""');
  repaired = repaired.replace(/:\s*$/, ': null');
  for (let i = 0; i < obk - cbk; i++) repaired += "]";
  for (let i = 0; i < ob - cb; i++) repaired += "}";
  return JSON.parse(repaired);
}

async function callGateway(messages: any[], maxTokens = 8000) {
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
    const txt = await res.text();
    console.error("gateway error:", status, txt.slice(0, 500));
    throw new Error(status === 429 ? "rate_limited" : status === 402 ? "credits_exhausted" : "gateway_error");
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

const GROUP_PROMPT = (title: string, pageRange: [number, number], totalGroups: number, groupIndex: number) =>
`Você é um EXTRATOR fiel de conteúdo. Você está analisando UM trecho de uma aula/material maior.

═══ CONTEXTO ═══
TÍTULO DESTE TRECHO: "${title}"
SLIDES: ${pageRange[0]}–${pageRange[1]}
ESTE É O TRECHO ${groupIndex + 1} DE ${totalGroups} DA AULA.
Não tente resumir a aula inteira — só este trecho.

═══ FILTRO ANTI-METADADO ═══
Se o trecho contiver "FlateDecode", "ColorSpace", "DeviceGray", "MacRomanEncoding", "BaseFont", "StructElem", "MediaBox", "TimesNewRomanPSMT", "/Subtype", "/Filter" — IGNORE COMPLETAMENTE essas palavras. Nunca as inclua em qualquer campo do JSON.

═══ REGRA SUPREMA — FIDELIDADE ABSOLUTA ═══
VOCÊ NÃO É AUTOR. VOCÊ É EXTRATOR.

✓ PERMITIDO: copiar frases (encurtadas), quebrar parágrafos em bullets fiéis, preservar termos técnicos, reorganizar para clareza.

✗ PROIBIDO:
  • Inventar pontos, datas, pessoas, versículos, citações ou exemplos que não estão no slide
  • Substituir termos específicos por genéricos (ex: "êxodo rural" → "mudanças sociais" é ERRADO)
  • Adicionar análise teológica/histórica que não aparece no PDF
  • Reduzir agressivamente — perder pontos é PIOR que ter bullets demais
  • Resumir várias ideias num único bullet

═══ REGRA DE COMPLETUDE ═══
Se o texto tem 10 pontos, retorne 10 pontos. Se menciona 5 pessoas, liste as 5. Se cita 8 datas, liste as 8.
Prefira mais bullets fiéis a poucos resumidos. Não há limite máximo de itens — só fidelidade.

═══ COMO EXTRAIR CADA CAMPO ═══

1. title: copie/condense o título real do bloco (≤6 palavras)
2. summary: 1 frase EXTRAÍDA do material (≤80 chars), tipo gancho — não interpretação
3. category: uma de [teologia, cristologia, pneumatologia, exegese, contexto, aplicacao, escatologia, soteriologia, personagem, lugar, evento]
4. core_idea: tese ou frase-resumo do bloco (≤22 palavras), idealmente CITANDO/condensando frase do material
5. key_points: TODOS os pontos relevantes (≤25 palavras cada). 5-15 bullets é normal. Cada bullet = uma ideia distinta.
6. subsections: se o bloco tem sub-divisões visíveis no slide (sub-títulos), use-as. Senão []
7. verses: APENAS versículos que APARECEM literalmente nos slides
8. quotes: APENAS citações de terceiros que APARECEM nos slides (texto literal + autor)
9. stories: TODAS as histórias/narrativas/episódios contados no material. Para cada uma:
   - title: nome curto (3-7 palavras)
   - narrative: narrativa COMPLETA em 2-6 frases, FIEL ao texto (datas, nomes, lugares, falas literais preservados)
   - source_slide: número do slide
   Não invente histórias.
10. key_dates: TODAS as datas mencionadas + o evento associado (ex: {"date":"1703","event":"Nascimento de Wesley em Epworth"}). Se nenhuma, []
11. key_people: TODAS as pessoas com papel relevante no trecho. Para cada uma:
    - name: nome completo como aparece
    - role: função/relação em 1 frase (ex: "Mãe de Wesley, educadora rigorosa")
    - points: bullets sobre essa pessoa extraídos do material (opcional, 1-5)
    Se nenhuma, []
12. application: SOMENTE se o material traz; senão ""
13. impact_phrase: ≤14 palavras, idealmente CITAÇÃO direta
14. highlights: 1-3 frases CITÁVEIS LITERALMENTE do material (não paráfrases)

═══ TESTE FINAL ═══
Antes de retornar, em cada bullet pergunte: "Isso está no slide, ou eu inventei?" Se inventou, REMOVA.

RETORNE APENAS JSON válido, sem markdown:
{
  "title": "string",
  "summary": "string ≤80",
  "category": "string",
  "core_idea": "string ≤22 palavras",
  "key_points": ["bullet fiel", "..."],
  "subsections": [
    { "subtitle": "string", "points": ["bullet"], "source_slides": [N] }
  ],
  "verses": [{ "ref": "Zc 3:2", "context": "curto", "source_slide": N }],
  "quotes": [{ "text": "literal", "author": "Nome", "source_slide": N }],
  "stories": [{ "title": "Nome curto", "narrative": "2-6 frases fiéis", "source_slide": N }],
  "key_dates": [{ "date": "1703", "event": "Nascimento em Epworth", "source_slide": N }],
  "key_people": [{ "name": "Susanna Wesley", "role": "Mãe, educadora, maior influência", "points": ["..."], "source_slide": N }],
  "application": "string ou \"\"",
  "impact_phrase": "string ≤14 palavras",
  "highlights": ["frase literal"]
}`;

const QUIZ_PROMPT = `Você está extraindo perguntas de revisão de slides de quiz. Não invente perguntas — extraia apenas o que ESTÁ NO MATERIAL.

Para cada pergunta encontrada nos slides:
- question: enunciado literal
- options: array das alternativas (a, b, c, d) como aparecem
- answer_index: índice da resposta correta (0-3) se o slide indicar; senão null
- source_slide: número do slide

RETORNE APENAS JSON:
{
  "questions": [
    { "question": "string", "options": ["a","b","c","d"], "answer_index": 1, "source_slide": N }
  ]
}

Se o slide não tem quiz claramente formatado, retorne {"questions":[]}.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { title, corpus, pageRange, totalGroups, groupIndex, isQuiz } = await req.json();

    if (typeof corpus !== "string" || corpus.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Corpus vazio ou muito curto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (isQuiz) {
      const content = await callGateway([
        { role: "system", content: QUIZ_PROMPT },
        { role: "user", content: `Slides ${pageRange[0]}-${pageRange[1]} (quiz):\n\n${corpus.slice(0, 12000)}` },
      ], 4000);
      const parsed = safeJsonParse(content);
      return new Response(JSON.stringify({
        result: {
          isQuiz: true,
          title: title || "Fixando o conteúdo",
          pageRange,
          questions: Array.isArray(parsed?.questions) ? parsed.questions : [],
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const content = await callGateway([
      { role: "system", content: GROUP_PROMPT(title || "Bloco", pageRange, totalGroups || 1, groupIndex || 0) },
      { role: "user", content: `Slides ${pageRange[0]}-${pageRange[1]}:\n\n${corpus.slice(0, 14000)}` },
    ], 8000);

    const parsed = safeJsonParse(content);

    const result = {
      isQuiz: false,
      title: parsed.title || title || "Bloco",
      summary: parsed.summary || "",
      category: parsed.category || "contexto",
      pageRange,
      core_idea: parsed.core_idea || "",
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      subsections: Array.isArray(parsed.subsections) ? parsed.subsections : [],
      verses: Array.isArray(parsed.verses) ? parsed.verses : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      stories: Array.isArray(parsed.stories) ? parsed.stories : [],
      key_dates: Array.isArray(parsed.key_dates) ? parsed.key_dates : [],
      key_people: Array.isArray(parsed.key_people) ? parsed.key_people : [],
      application: parsed.application || "",
      impact_phrase: parsed.impact_phrase || "",
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    };

    return new Response(JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("analyze-slide-group error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    const status = msg === "rate_limited" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    const userMsg =
      msg === "rate_limited" ? "Limite de requisições atingido. Tente em alguns minutos."
      : msg === "credits_exhausted" ? "Créditos de IA esgotados."
      : msg;
    return new Response(JSON.stringify({ error: userMsg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
