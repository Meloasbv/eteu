import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ---------- helpers ----------
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

async function callGateway(messages: any[], maxTokens = 12000) {
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
  const content = data.choices?.[0]?.message?.content || "";
  return content;
}

// ---------- prompts ----------
const STRUCTURE_PROMPT = `Você é um especialista em análise teológica. Recebe um PDF de aula bíblica com slides marcados [[PÁGINA N]].

TAREFA: Identifique a estrutura DE ALTO NÍVEL — quais são os blocos temáticos.

REGRAS CRÍTICAS:
1. Slides consecutivos com o MESMO título/tema = MESMO topic. Agrupe agressivamente.
2. Gere ENTRE 6 E 10 topics (um PDF de 60 slides deve ter ~8 topics). Nunca menos que 6, nunca mais que 10.
3. Cada topic cobre um RANGE contíguo de slides (use slide_range: [inicio, fim]).
4. Ignore slide de capa (vai virar main_theme).
5. Cada topic precisa ter título curto + categoria + range de slides.

CATEGORIAS válidas: teologia, cristologia, pneumatologia, exegese, contexto, aplicacao, escatologia, soteriologia

RETORNE APENAS JSON válido, sem markdown:
{
  "main_theme": "Título da aula extraído da capa",
  "summary": "1 frase sobre o tema (máx 100 chars)",
  "author": "Nome do autor se aparecer",
  "total_slides": 60,
  "topics": [
    {
      "id": "t1",
      "title": "Título curto (2-5 palavras)",
      "category": "contexto",
      "slide_range": [2, 5],
      "summary": "gancho provocativo curto (máx 80 chars)",
      "is_key": true
    }
  ],
  "keywords": ["palavra1", "palavra2"]
}

Marque is_key=true APENAS para os 3-4 topics MAIS centrais.`;

const EXPAND_PROMPT = (topicTitle: string, slideRange: [number, number], category: string) =>
  `Você é um especialista em análise teológica. Recebe os slides ${slideRange[0]} a ${slideRange[1]} de uma aula sobre "${topicTitle}" (categoria: ${category}).

TAREFA: Extraia TODO o conteúdo destes slides em formato escaneável e completo. Não omita nada relevante.

REGRAS:
1. key_points: 6 a 12 bullets curtos (≤18 palavras cada). Capture TODOS os pontos importantes dos slides.
2. subsections: SE houver sub-temas claros nos slides, divida em 2-5 subsections, cada uma com seu range próprio e 4-8 bullets.
3. verses: TODOS os versículos mencionados, com referência exata, contexto curto e source_slide.
4. author_quotes: TODAS as citações de autores (nome + texto literal + slide). Ex: Jonathan Edwards, Sheperd, Agostinho.
5. application: 2-3 frases curtas de aplicação prática.
6. impact_phrase: 1 frase memorizável (máx 14 palavras).
7. core_idea: 1 frase essencial (máx 22 palavras).

NUNCA escreva parágrafos longos. Sempre bullets escaneáveis.

RETORNE APENAS JSON válido:
{
  "core_idea": "string",
  "key_points": ["bullet ≤18 palavras", "..."],
  "subsections": [
    { "subtitle": "Sub-tema", "points": ["bullet", "..."], "source_slides": [N, M] }
  ],
  "verses": [
    { "ref": "Os 1:2-3", "context": "contexto curto", "source_slide": N }
  ],
  "author_quotes": [
    { "text": "citação literal", "author": "Nome", "source_slide": N }
  ],
  "application": "string curta",
  "impact_phrase": "string ≤14 palavras",
  "child_highlights": ["1 a 3 frases citáveis e memoráveis"]
}`;

const SLIDES_SUMMARY_PROMPT = `Você recebe os slides de um PDF de aula bíblica, marcados [[SLIDE N]].
TAREFA: Para CADA slide, gere um resumo curto e fiel ao conteúdo daquele slide.

REGRAS:
1. UM objeto por slide, sem exceção. Se o slide é só capa/transição, ainda assim gere algo (ex: "Capa da aula").
2. summary: máx 22 palavras, descrevendo o ponto principal do slide.
3. title: 2-5 palavras (rótulo do slide). Se não houver título visível, infira.
4. Mantenha a ORDEM dos slides.

RETORNE APENAS JSON válido:
{
  "slides": [
    { "slide": 1, "title": "Capa", "summary": "Apresentação da aula sobre Oséias por Alessandro Caetano." },
    { "slide": 2, "title": "Contexto histórico", "summary": "Israel no século VIII a.C., reinado de Jeroboão II, idolatria generalizada." }
  ]
}`;

const SIMPLE_PROMPT = `Você é um especialista em análise bíblica. Organize o texto em mapa mental com poucos topics densos.

CATEGORIAS: teologia, cristologia, pneumatologia, exegese, contexto, aplicacao, escatologia, soteriologia

REGRAS:
- 5 a 8 topics densos.
- Cada topic com expanded_note completo: core_idea, 6-10 key_points (≤18 palavras), verses, application, impact_phrase.
- Versículos NUNCA como type="verse" — sempre dentro de expanded_note.verses.
- child_highlights: 1-2 frases citáveis por topic.
- is_key=true para 3-4 topics centrais.

RETORNE APENAS JSON:
{
  "main_theme": "string",
  "summary": "string",
  "key_concepts": [
    {
      "id": "concept_1",
      "type": "topic",
      "title": "Título curto",
      "summary": "gancho ≤80 chars",
      "category": "teologia",
      "is_key": true,
      "expanded_note": {
        "core_idea": "string",
        "key_points": ["bullet ≤18 palavras"],
        "verses": [{ "ref": "Liv C:V", "context": "curto" }],
        "application": "string",
        "impact_phrase": "string"
      },
      "child_highlights": ["frase citável"],
      "child_verses": []
    }
  ],
  "hierarchy": { "root": { "label": "string", "children": [] } },
  "keywords": [],
  "structured_notes": []
}`;

// ---------- main handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, pagesText } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Texto muito curto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const isPdf = Array.isArray(pagesText) && pagesText.length > 0;

    // ===== TEXT-ONLY PATH =====
    if (!isPdf) {
      const corpus = text.slice(0, 30000);
      const content = await callGateway([
        { role: "system", content: SIMPLE_PROMPT },
        { role: "user", content: `Analise:\n\n${corpus}` },
      ], 16000);
      const result = safeJsonParse(content);
      result.main_theme = result.main_theme || "Análise";
      result.summary = result.summary || "";
      result.key_concepts = result.key_concepts || [];
      result.hierarchy = result.hierarchy || { root: { label: result.main_theme, children: [] } };
      result.keywords = result.keywords || [];
      result.structured_notes = result.structured_notes || [];
      return new Response(JSON.stringify({ result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== PDF 2-PASS PATH =====
    const allPages = pagesText as { page: number; text: string }[];
    const fullCorpus = allPages.map(p => `[[PÁGINA ${p.page}]]\n${p.text}`).join("\n\n");

    // ---- PASS 1: structure ----
    console.log(`[analyze-content] PASS 1 — structure (${allPages.length} pages)`);
    const structureCorpus = fullCorpus.slice(0, 50000);
    const structureContent = await callGateway([
      { role: "system", content: STRUCTURE_PROMPT },
      { role: "user", content: `Analise a estrutura de alto nível deste PDF (${allPages.length} slides):\n\n${structureCorpus}` },
    ], 6000);
    const structure = safeJsonParse(structureContent);

    if (!Array.isArray(structure.topics) || structure.topics.length === 0) {
      throw new Error("Estrutura inválida na primeira passada.");
    }

    console.log(`[analyze-content] structure → ${structure.topics.length} topics`);

    // ---- PASS 2: expand each topic in parallel (with concurrency limit) ----
    const pageMap = new Map(allPages.map(p => [p.page, p.text]));
    const topicsToExpand: any[] = structure.topics;

    async function expandTopic(topic: any, idx: number) {
      const [start, end] = Array.isArray(topic.slide_range) && topic.slide_range.length === 2
        ? topic.slide_range
        : [1, allPages.length];
      const safeStart = Math.max(1, Math.min(start, allPages.length));
      const safeEnd = Math.max(safeStart, Math.min(end, allPages.length));

      const slidesText: string[] = [];
      for (let p = safeStart; p <= safeEnd; p++) {
        const t = pageMap.get(p);
        if (t) slidesText.push(`[[SLIDE ${p}]]\n${t}`);
      }
      const corpus = slidesText.join("\n\n").slice(0, 18000);

      try {
        const content = await callGateway([
          { role: "system", content: EXPAND_PROMPT(topic.title, [safeStart, safeEnd], topic.category || "teologia") },
          { role: "user", content: `Slides ${safeStart}-${safeEnd}:\n\n${corpus}` },
        ], 8000);
        const expanded = safeJsonParse(content);
        return {
          id: topic.id || `concept_${idx + 1}`,
          type: "topic" as const,
          title: topic.title,
          summary: topic.summary || expanded.core_idea?.slice(0, 80) || "",
          category: topic.category || "teologia",
          icon_suggestion: "📖",
          is_key: topic.is_key === true,
          page_ref: safeStart,
          source_slides: Array.from({ length: safeEnd - safeStart + 1 }, (_, i) => safeStart + i),
          expanded_note: {
            core_idea: expanded.core_idea || "",
            key_points: Array.isArray(expanded.key_points) ? expanded.key_points : [],
            subsections: Array.isArray(expanded.subsections) ? expanded.subsections : [],
            verses: Array.isArray(expanded.verses) ? expanded.verses : [],
            author_quotes: Array.isArray(expanded.author_quotes) ? expanded.author_quotes : [],
            application: expanded.application || "",
            impact_phrase: expanded.impact_phrase || "",
          },
          child_highlights: Array.isArray(expanded.child_highlights) ? expanded.child_highlights.slice(0, 3) : [],
          child_verses: [],
        };
      } catch (e) {
        console.warn(`[analyze-content] expand failed for topic ${idx}: ${(e as Error).message}`);
        // Fallback: use only structure info so the topic still appears
        return {
          id: topic.id || `concept_${idx + 1}`,
          type: "topic" as const,
          title: topic.title,
          summary: topic.summary || "",
          category: topic.category || "teologia",
          icon_suggestion: "📖",
          is_key: topic.is_key === true,
          page_ref: safeStart,
          source_slides: Array.from({ length: safeEnd - safeStart + 1 }, (_, i) => safeStart + i),
          expanded_note: {
            core_idea: "",
            key_points: [],
            subsections: [],
            verses: [],
            author_quotes: [],
            application: "",
            impact_phrase: "",
          },
          child_highlights: [],
          child_verses: [],
        };
      }
    }

    // Run with limited concurrency (3 at a time) to avoid 429
    const CONCURRENCY = 3;
    const expandedTopics: any[] = new Array(topicsToExpand.length);
    for (let i = 0; i < topicsToExpand.length; i += CONCURRENCY) {
      const batch = topicsToExpand.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((t, j) => expandTopic(t, i + j)));
      results.forEach((r, j) => { expandedTopics[i + j] = r; });
      // small breather
      if (i + CONCURRENCY < topicsToExpand.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Safety: ensure at least 2 is_key
    const hasKey = expandedTopics.some(t => t.is_key === true);
    if (!hasKey && expandedTopics.length > 0) {
      expandedTopics[0].is_key = true;
      if (expandedTopics[1]) expandedTopics[1].is_key = true;
    }

    const result = {
      main_theme: structure.main_theme || "Análise",
      summary: structure.summary || "",
      key_concepts: expandedTopics,
      hierarchy: {
        root: {
          label: structure.main_theme || "Análise",
          children: expandedTopics.map((t: any) => ({ label: t.title })),
        },
      },
      keywords: Array.isArray(structure.keywords) ? structure.keywords : [],
      structured_notes: [],
      // Extra metadata for the presentation mode
      pdf_meta: {
        total_slides: structure.total_slides || allPages.length,
        author: structure.author || null,
      },
    };

    console.log(`[analyze-content] PASS 2 done — ${expandedTopics.length} topics expanded`);

    return new Response(JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("analyze-content error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    const status = msg === "rate_limited" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    const userMsg = msg === "rate_limited" ? "Limite de requisições atingido. Tente em alguns minutos."
      : msg === "credits_exhausted" ? "Créditos de IA esgotados."
      : msg;
    return new Response(JSON.stringify({ error: userMsg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
