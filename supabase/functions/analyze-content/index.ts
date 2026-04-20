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
const STRUCTURE_PROMPT = `Você é um EXTRATOR de estrutura de documentos. Recebe um PDF com slides marcados [[PÁGINA N]].

TAREFA: Identifique os blocos temáticos REAIS do material — usando os títulos e seções que JÁ EXISTEM no PDF.

═══ REGRA SUPREMA: FIDELIDADE AO ORIGINAL ═══
- Use os TÍTULOS QUE APARECEM NO PDF. Se o slide diz "Contexto histórico", use "Contexto histórico" — NÃO invente "A época sombria de Israel".
- Se o material não é teológico (ex: história, ciência, negócios), NÃO force vocabulário teológico.
- NUNCA invente seções que não existem no original.

REGRAS:
1. Slides consecutivos com o MESMO tema/título = MESMO topic. Agrupe pela divisão real do PDF.
2. Gere o NÚMERO NATURAL de topics conforme o PDF (entre 4 e 12). Não force 6-10 se o PDF tem 4 seções claras.
3. Cada topic cobre um RANGE contíguo de slides (slide_range: [inicio, fim]).
4. Ignore slide de capa (vai virar main_theme).
5. title: copiado/condensado do título real do bloco. summary: frase curta EXTRAÍDA do conteúdo (não interpretada).

CATEGORIAS (escolha a mais próxima; use "contexto" se nada se aplica): teologia, cristologia, pneumatologia, exegese, contexto, aplicacao, escatologia, soteriologia

RETORNE APENAS JSON válido, sem markdown:
{
  "main_theme": "Título exato extraído da capa",
  "summary": "1 frase EXTRAÍDA do material (máx 100 chars)",
  "author": "Nome do autor se aparecer no PDF",
  "total_slides": 60,
  "topics": [
    {
      "id": "t1",
      "title": "Título real do bloco (do PDF)",
      "category": "contexto",
      "slide_range": [2, 5],
      "summary": "frase curta extraída (máx 80 chars)",
      "is_key": true
    }
  ],
  "keywords": ["termos que APARECEM no texto"]
}

Marque is_key=true APENAS para os 3-4 topics centrais (mais slides ou ênfase do autor).`;

const EXPAND_PROMPT = (topicTitle: string, slideRange: [number, number], category: string) =>
  `Você é um EXTRATOR de conteúdo. Sua tarefa é REORGANIZAR o que está nos slides ${slideRange[0]}-${slideRange[1]} sobre "${topicTitle}" — NÃO criar conteúdo novo.

═══ FILTRO ANTI-METADADO (CRÍTICO) ═══
Se o trecho contiver palavras como "FlateDecode", "ColorSpace", "DeviceGray", "DeviceRGB", "MacRomanEncoding", "BaseFont", "StructElem", "StructTreeRoot", "MediaBox", "TimesNewRomanPSMT", "Subtype", "XObject" — IGNORE COMPLETAMENTE. Isso é metadado técnico de PDF, NÃO conteúdo. Nunca inclua essas palavras nos bullets, títulos ou qualquer campo. Se o trecho TODO for só metadado, retorne campos vazios.

═══ REGRA SUPREMA — FIDELIDADE ABSOLUTA ═══
VOCÊ NÃO É AUTOR. VOCÊ É EXTRATOR.

PERMITIDO:
✓ Copiar frases do original (encurtadas/condensadas)
✓ Quebrar parágrafos em bullets fiéis
✓ Preservar termos técnicos e expressões originais
✓ Reorganizar a ordem para clareza

PROIBIDO:
✗ Inventar pontos que não estão no slide
✗ Substituir termos específicos por genéricos ("êxodo rural" → "mudanças sociais" é ERRADO)
✗ Adicionar análise teológica/histórica que não aparece no PDF
✗ Generalizar ou interpretar o que o autor quis dizer
✗ Adicionar versículos, autores ou citações que NÃO aparecem literalmente nos slides
✗ Inferir contexto histórico que o material não menciona
✗ Reduzir agressivamente (perder pontos é pior que ter bullets demais)

═══ COMO EXTRAIR ═══

1. core_idea: a tese OU frase-resumo do bloco (≤22 palavras), idealmente CITANDO/condensando uma frase do material. Se o autor não dá tese explícita, escreva neutramente o tema.

2. key_points: TODOS os pontos relevantes do bloco em bullets (≤25 palavras cada). Prefira 6-12 bullets fiéis a 4 bullets resumidos. Cada bullet = uma ideia distinta do material. Mantenha termos originais.

3. key_points_deep: para CADA key_point, traga um 'detail' com 1-2 frases EXTRAÍDAS do slide que sustentam o ponto (parafraseando minimamente). Se o material não dá mais detalhe, repita "Veja slide N" em vez de inventar.

4. detailed_explanation: parágrafo de 3-6 frases que RECONSTITUI o argumento do bloco usando as palavras do autor. Se o material é esparso, seja mais curto — não preencha com invenção.

5. historical_context: SOMENTE se o PDF mencionar contexto histórico/cultural. Se não mencionar, retorne string vazia "". NÃO INVENTE.

6. examples: SOMENTE exemplos/ilustrações que APARECEM no material. Se nenhum aparece, retorne []. NÃO crie exemplos hipotéticos.

7. subsections: se o bloco tem sub-divisões visíveis (sub-títulos no slide), use-as. Caso contrário, retorne [].

8. verses: APENAS versículos que APARECEM literalmente nos slides. Use a referência exata como aparece. Se nenhum aparece, retorne [].

9. author_quotes: APENAS citações de terceiros (autores, livros) que APARECEM nos slides. Texto LITERAL, nome do autor, slide. Se nenhuma, retorne [].

10. application: SOMENTE se o material traz aplicação. Caso contrário, "".

11. impact_phrase: uma frase memorizável (≤14 palavras) — preferencialmente CITAÇÃO direta do material. Se não houver, condense a tese.

12. child_highlights: 1-3 frases CITÁVEIS LITERALMENTE do material (não paráfrases).

═══ TESTE FINAL ═══
Antes de retornar, pergunte-se em cada bullet:
"Essa frase está no slide, ou eu inventei?" — se inventou, REMOVA.

RETORNE APENAS JSON válido:
{
  "core_idea": "string fiel ao material",
  "key_points": ["bullet preservando termos originais"],
  "key_points_deep": [
    { "point": "mesmo bullet", "detail": "1-2 frases extraídas do slide" }
  ],
  "detailed_explanation": "parágrafo reconstituindo o argumento original",
  "historical_context": "apenas se aparece no PDF, senão \"\"",
  "examples": ["apenas exemplos do material"],
  "subsections": [
    { "subtitle": "sub-título real do slide", "points": ["bullet fiel"], "source_slides": [N] }
  ],
  "verses": [{ "ref": "exatamente como no slide", "context": "curto", "source_slide": N }],
  "author_quotes": [{ "text": "literal", "author": "Nome", "source_slide": N }],
  "application": "apenas se aparece no material",
  "impact_phrase": "≤14 palavras, idealmente citação",
  "child_highlights": ["frase LITERAL do material"]
}`;

const SLIDES_SUMMARY_PROMPT = `Você é um EXTRATOR. Recebe slides marcados [[SLIDE N]].
TAREFA: Para CADA slide, descreva FIELMENTE o conteúdo daquele slide — sem interpretar.

REGRAS:
1. UM objeto por slide, sem exceção. Slide de capa/transição → descreva o que está nele literalmente.
2. summary: máx 22 palavras, EXTRAÍDAS do slide (não interprete o que o autor "quis dizer").
3. title: copie o título do slide. Se não houver, use 2-3 palavras tiradas do conteúdo.
4. Preserve termos técnicos e nomes próprios EXATAMENTE como aparecem.
5. Mantenha a ORDEM dos slides.

RETORNE APENAS JSON válido:
{
  "slides": [
    { "slide": 1, "title": "Capa", "summary": "Título da aula, autor, instituição." },
    { "slide": 2, "title": "Contexto histórico", "summary": "Texto extraído fielmente do slide." }
  ]
}`;

const SIMPLE_PROMPT = `Você é um EXTRATOR de conteúdo — não um intérprete. Reorganize o texto em mapa mental PRESERVANDO o que está escrito.

═══ REGRA SUPREMA ═══
NÃO invente conteúdo. NÃO substitua termos específicos por genéricos. NÃO adicione versículos/autores que não aparecem.

CATEGORIAS (escolha a mais próxima ou "contexto"): teologia, cristologia, pneumatologia, exegese, contexto, aplicacao, escatologia, soteriologia

REGRAS:
- 4 a 10 topics conforme a estrutura natural do texto (não force quantidade).
- Cada topic = um bloco/seção real do material. title = título real (ou condensado fielmente).
- expanded_note.key_points: 5-12 bullets EXTRAÍDOS do texto, preservando termos originais. Prefira mais bullets fiéis a poucos resumidos.
- core_idea: tese ou frase-resumo do bloco (≤22 palavras), idealmente citando o material.
- verses: APENAS os que APARECEM no texto.
- application: APENAS se o material traz; senão "".
- impact_phrase: idealmente CITAÇÃO direta do material (≤14 palavras).
- child_highlights: 1-2 frases LITERAIS do texto.
- is_key=true para 3-4 topics centrais.

RETORNE APENAS JSON:
{
  "main_theme": "título extraído",
  "summary": "frase do material",
  "key_concepts": [
    {
      "id": "concept_1",
      "type": "topic",
      "title": "Título real do bloco",
      "summary": "frase curta extraída ≤80 chars",
      "category": "contexto",
      "is_key": true,
      "expanded_note": {
        "core_idea": "string fiel",
        "key_points": ["bullet preservando termos originais"],
        "verses": [{ "ref": "como aparece", "context": "curto" }],
        "application": "apenas se aparece",
        "impact_phrase": "citação ou condensação fiel"
      },
      "child_highlights": ["frase LITERAL"],
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

    // ===== ANTI-METADATA GUARD =====
    // Detect when extract-pdf failed silently and passed PDF technical metadata as "text".
    const metadataRegex = /FlateDecode|ColorSpace|DeviceGray|DeviceRGB|MacRomanEncoding|StructTreeRoot|StructElem|BaseFont|MediaBox|TimesNewRomanPSMT|XObject|\/Subtype|\/Filter/gi;
    const sample = text.slice(0, 50000);
    const metaHits = (sample.match(metadataRegex) || []).length;
    const wordCount = Math.max(sample.split(/\s+/).length, 1);
    const ratio = metaHits / wordCount;
    if (metaHits > 8 && ratio > 0.02) {
      console.warn(`[analyze-content] metadata-only input rejected (hits=${metaHits}, ratio=${ratio.toFixed(3)})`);
      return new Response(
        JSON.stringify({
          error:
            "Não consegui ler este PDF (provavelmente escaneado ou protegido). Tente exportá-lo novamente como PDF de texto.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
            key_points_deep: Array.isArray(expanded.key_points_deep) ? expanded.key_points_deep : [],
            subsections: Array.isArray(expanded.subsections) ? expanded.subsections : [],
            verses: Array.isArray(expanded.verses) ? expanded.verses : [],
            author_quotes: Array.isArray(expanded.author_quotes) ? expanded.author_quotes : [],
            application: expanded.application || "",
            impact_phrase: expanded.impact_phrase || "",
            detailed_explanation: expanded.detailed_explanation || "",
            historical_context: expanded.historical_context || "",
            examples: Array.isArray(expanded.examples) ? expanded.examples : [],
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

    // ---- PASS 3: per-slide summaries (so EVERY slide is represented) ----
    console.log(`[analyze-content] PASS 3 — per-slide summaries`);
    const SLIDE_BATCH = 25; // process N slides per LLM call
    const slideSummaries: Array<{ slide: number; title?: string; summary: string }> = [];
    for (let i = 0; i < allPages.length; i += SLIDE_BATCH) {
      const batch = allPages.slice(i, i + SLIDE_BATCH);
      const corpus = batch.map(p => `[[SLIDE ${p.page}]]\n${(p.text || "").slice(0, 1200)}`).join("\n\n");
      try {
        const content = await callGateway([
          { role: "system", content: SLIDES_SUMMARY_PROMPT },
          { role: "user", content: `Resuma cada slide:\n\n${corpus}` },
        ], 4500);
        const parsed = safeJsonParse(content);
        if (Array.isArray(parsed?.slides)) {
          parsed.slides.forEach((s: any) => {
            if (typeof s?.slide === "number" && typeof s?.summary === "string") {
              slideSummaries.push({ slide: s.slide, title: s.title || undefined, summary: s.summary });
            }
          });
        }
      } catch (e) {
        console.warn(`[analyze-content] slide summary batch ${i} failed:`, (e as Error).message);
        // Fallback: minimal summary so the slide still appears
        batch.forEach(p => {
          slideSummaries.push({ slide: p.page, summary: (p.text || "").trim().slice(0, 140) || `Slide ${p.page}` });
        });
      }
      if (i + SLIDE_BATCH < allPages.length) await new Promise(r => setTimeout(r, 250));
    }

    // Cross-link each slide summary back to a topic (when its slide falls in a topic's range)
    const slideToTopic = new Map<number, { id: string; category: string }>();
    expandedTopics.forEach((t: any) => {
      (t.source_slides || []).forEach((sl: number) => {
        slideToTopic.set(sl, { id: t.id, category: t.category });
      });
    });
    const linkedSlides = slideSummaries
      .sort((a, b) => a.slide - b.slide)
      .map(s => ({
        ...s,
        topic_id: slideToTopic.get(s.slide)?.id,
        category: slideToTopic.get(s.slide)?.category,
      }));

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
      slide_summaries: linkedSlides,
      // Extra metadata for the presentation mode
      pdf_meta: {
        total_slides: structure.total_slides || allPages.length,
        author: structure.author || null,
      },
    };

    console.log(`[analyze-content] PASS 3 done — ${linkedSlides.length} slide summaries`);

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
