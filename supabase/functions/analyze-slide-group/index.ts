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

const GROUP_PROMPT = (
  title: string,
  pageRange: [number, number],
  totalGroups: number,
  groupIndex: number,
) => {
  const isLong = totalGroups >= 8;
  return `Você é um EXTRATOR fiel + DIDATA. Extrai conteúdo SEM inventar e enriquece visualmente quando o tema for conceitual/teológico.

═══ CONTEXTO ═══
TÍTULO DESTE TRECHO: "${title}"
SLIDES: ${pageRange[0]}–${pageRange[1]}
ESTE É O TRECHO ${groupIndex + 1} DE ${totalGroups} DA AULA.
${isLong ? "⚠️ AULA LONGA — blocos SECUNDÁRIOS/TERCIÁRIOS devem ser resumidos (3-5 bullets enxutos)." : ""}

═══ FILTRO ANTI-METADADO ═══
Se aparecer "FlateDecode", "ColorSpace", "DeviceGray", "MacRomanEncoding", "BaseFont", "StructElem", "MediaBox", "TimesNewRomanPSMT", "/Subtype", "/Filter" — IGNORE. Nunca inclua no JSON.

═══ REGRA SUPREMA — FIDELIDADE ═══
✓ PERMITIDO: copiar/condensar frases, quebrar parágrafos em bullets fiéis, preservar termos técnicos.
✓ PERMITIDO PARA DIDÁTICA: criar UMA analogia clara e UM glossário curto explicando termos técnicos QUE APARECEM no material — desde que claramente didáticos, não inventando doutrina nova.
✗ PROIBIDO: inventar pontos, datas, pessoas, versículos, citações, exemplos, escolas teológicas, autores ou fatos históricos que NÃO estão no slide.

═══ CLASSIFICAÇÃO DE IMPORTÂNCIA (você decide) ═══
- "primary": tese central, doutrina-chave, núcleo do argumento, biografia principal. → extrai TUDO em detalhe.
- "secondary": desdobramento, contexto de apoio, ilustração relevante. → 4-7 bullets enxutos.
- "tertiary": detalhe periférico, transição, repetição, slide de capa/intro. → 2-4 bullets curtos.
${isLong ? "Em aulas longas, MARQUE como secondary/tertiary qualquer bloco que não seja claramente central." : "Em aulas curtas, prefira primary."}

═══ COMO EXTRAIR CADA CAMPO ═══
1. title: copie/condense (≤6 palavras)
2. summary: 1 frase EXTRAÍDA (≤80 chars), gancho
3. category: [teologia, cristologia, pneumatologia, exegese, contexto, aplicacao, escatologia, soteriologia, personagem, lugar, evento]
4. importance: "primary" | "secondary" | "tertiary"
5. core_idea: tese ou frase-resumo (≤22 palavras), idealmente CITANDO frase do material
6. key_points: bullets fiéis (≤25 palavras cada).
   - primary: 5-15 bullets
   - secondary: 4-7 bullets
   - tertiary: 2-4 bullets
7. subsections: só se houver sub-divisões visíveis. Senão []
8. verses: APENAS versículos LITERAIS dos slides
9. quotes: APENAS citações de terceiros LITERAIS dos slides
10. stories: TODAS as narrativas/episódios do material (title curto, narrative 2-6 frases fiéis, source_slide). Não invente.
11. key_dates: TODAS as datas + evento. Senão []
12. key_people: TODAS as pessoas com papel relevante (name, role 1 frase, points opcionais)
13. key_terms: GLOSSÁRIO didático — termos técnicos que aparecem no material e merecem definição curta. Cada item: { "term": "Justificação", "definition": "1-2 frases simples". } Use 0-5 termos. Inclua APENAS termos que aparecem no slide. Se for biografia/história sem jargão, []
14. analogy: UMA analogia/ilustração curta (1-3 frases) que torna o conceito tangível. SOMENTE se o conteúdo é doutrinal/abstrato e ajudaria entendimento. Se for histórico/biográfico/narrativo, "". Não invente fatos — só analogia.
15. application: SOMENTE se o material traz; senão ""
16. impact_phrase: ≤14 palavras, idealmente CITAÇÃO direta
17. highlights: 1-3 frases CITÁVEIS LITERALMENTE

═══ TESTE FINAL ═══
Em cada bullet/termo/analogia: "Isso está fiel ao slide?" Se inventou fato, REMOVA. Analogia pode ser sua, mas não pode contradizer/expandir doutrina além do material.

RETORNE APENAS JSON válido, sem markdown:
{
  "title": "string",
  "summary": "string ≤80",
  "category": "string",
  "importance": "primary",
  "core_idea": "string ≤22 palavras",
  "key_points": ["bullet fiel", "..."],
  "subsections": [{ "subtitle": "string", "points": ["bullet"], "source_slides": [N] }],
  "verses": [{ "ref": "Zc 3:2", "context": "curto", "source_slide": N }],
  "quotes": [{ "text": "literal", "author": "Nome", "source_slide": N }],
  "stories": [{ "title": "Nome curto", "narrative": "2-6 frases fiéis", "source_slide": N }],
  "key_dates": [{ "date": "1703", "event": "Nascimento em Epworth", "source_slide": N }],
  "key_people": [{ "name": "Susanna Wesley", "role": "Mãe, educadora", "points": ["..."], "source_slide": N }],
  "key_terms": [{ "term": "Justificação", "definition": "Ato pelo qual Deus declara o pecador justo por causa de Cristo." }],
  "analogy": "string ou \\"\\"",
  "application": "string ou \\"\\"",
  "impact_phrase": "string ≤14 palavras",
  "highlights": ["frase literal"]
}`;
};

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

    const importance = ["primary", "secondary", "tertiary"].includes(parsed.importance)
      ? parsed.importance
      : "primary";

    const result = {
      isQuiz: false,
      title: parsed.title || title || "Bloco",
      summary: parsed.summary || "",
      category: parsed.category || "contexto",
      importance,
      pageRange,
      core_idea: parsed.core_idea || "",
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      subsections: Array.isArray(parsed.subsections) ? parsed.subsections : [],
      verses: Array.isArray(parsed.verses) ? parsed.verses : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      stories: Array.isArray(parsed.stories) ? parsed.stories : [],
      key_dates: Array.isArray(parsed.key_dates) ? parsed.key_dates : [],
      key_people: Array.isArray(parsed.key_people) ? parsed.key_people : [],
      key_terms: Array.isArray(parsed.key_terms) ? parsed.key_terms : [],
      analogy: typeof parsed.analogy === "string" ? parsed.analogy : "",
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
