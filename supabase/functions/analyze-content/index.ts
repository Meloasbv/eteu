import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, pagesText } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Texto muito curto. Envie pelo menos 10 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a per-page tagged corpus when available (helps the model attribute page numbers)
    const isPdf = Array.isArray(pagesText) && pagesText.length > 0;
    let corpus: string;
    if (isPdf) {
      corpus = (pagesText as { page: number; text: string }[])
        .map(p => `[[PÁGINA ${p.page}]]\n${p.text}`)
        .join("\n\n")
        .slice(0, 45000);
    } else {
      corpus = text.slice(0, 30000);
    }

    const pdfRules = isPdf ? `

REGRAS ESPECÍFICAS PARA PDF DE AULA (slides marcados por [[PÁGINA N]]):

1. AGRUPAMENTO POR TÍTULO (CRÍTICO):
   - Slides consecutivos com o MESMO título de seção pertencem ao MESMO topic.
   - Exemplo: se slides 16, 17, 18, 19, 20 têm "Convicção de pecado" como título, gere UM ÚNICO topic chamado "Convicção de pecado" com source_slides=[16,17,18,19,20] que agrega TODO o conteúdo desses slides.
   - JAMAIS crie um topic para cada slide.

2. POUCOS TOPICS DENSOS:
   - Para 30-60 slides, gere ENTRE 5 E 8 topics. Nunca mais que 8.
   - Ignore slide de capa (vira main_theme) e slides puramente decorativos.
   - Cada topic deve cobrir um bloco contíguo de slides (use source_slides para indicar o range).

3. VERSÍCULOS NUNCA SÃO TOPICS:
   - Versículos vão DENTRO do expanded_note.verses do topic correspondente, com contexto curto e source_slide.
   - NUNCA gere objetos com type="verse" no key_concepts. Zero VerseCards.
   - child_verses deve ficar VAZIO ([]) — versículos só vivem no expanded_note.

4. CITAÇÕES DE AUTORES:
   - Citações (Jonathan Edwards, Sheperd, etc) vão em expanded_note.author_quotes (com text, author, source_slide).
   - Pode também escolher 1-2 das mais marcantes para virar child_highlights.

5. CONTEÚDO ESCANEÁVEL (CRÍTICO):
   - expanded_note.key_points: array de 4-8 bullets de NO MÁXIMO 15 PALAVRAS cada. Quebre parágrafos longos em pontos curtos. NUNCA escreva blocos de texto.
   - expanded_note.subsections: use quando um topic tem sub-temas internos claros (ex: "Os filhos de Gômer" → subsections para Jezreel, Lo-Ruama, Lo-Ami). Cada subsection tem subtitle, points (bullets ≤15 palavras) e source_slides.
   - explanation deve ser CURTO (1-2 parágrafos no máximo) ou omitido — preferir key_points.

6. HIGHLIGHTS LIMITADOS:
   - child_highlights: APENAS 1-2 frases REALMENTE citáveis e memoráveis por topic. Não toda frase em negrito.
   - NÃO gere objetos type="highlight" standalone para PDF (mantenha key_concepts apenas com type="topic").

7. is_key: marque true APENAS para 3-4 topics centrais (recebem imagem).
` : `

REGRAS PARA TEXTO LIVRE:
- Gere 5-8 topics densos cobrindo os subtemas principais.
- Cada topic com expanded_note.key_points (4-8 bullets de ≤15 palavras).
- Versículos sempre dentro de expanded_note.verses, NUNCA como type="verse".
- child_highlights: 1-2 frases citáveis por topic.
- Marque is_key=true para 3-4 topics centrais.
`;

    const systemPrompt = `Você é um especialista em análise de conteúdo bíblico e teológico. Organize o texto em formato de mapa mental otimizado para estudo: poucos topics densos, conteúdo em bullets curtos escaneáveis, versículos agrupados dentro das notas.

CATEGORIAS válidas: teologia, cristologia, pneumatologia, exegese, contexto, aplicacao, escatologia, soteriologia
${pdfRules}
SUMMARY DO TOPIC: gancho curto provocativo (máx 80 chars), NÃO resumo acadêmico.

EXPANDED_NOTE — formato detalhado:
- core_idea: 1 frase essencial (máx 20 palavras)
- key_points: array de 4-8 bullets, CADA UM com NO MÁXIMO 15 palavras. OBRIGATÓRIO.
- subsections (opcional): array de { subtitle, points[], source_slides[] } quando o topic tem sub-temas internos
- verses: array de { ref: "Livro C:V", context: "contexto curto", source_slide: N }
- author_quotes (opcional): array de { text, author, source_slide }
- application: 1-2 frases curtas de aplicação prática
- impact_phrase: 1 frase memorizável (máx 12 palavras)

RETORNE APENAS JSON válido (sem markdown, sem \`\`\`):
{
  "main_theme": "Título da aula/texto",
  "summary": "string curta",
  "key_concepts": [
    {
      "id": "concept_1",
      "type": "topic",
      "title": "Título curto (2-5 palavras)",
      "summary": "gancho curto max 80 chars",
      "category": "teologia",
      "icon_suggestion": "📖",
      "is_key": true,
      "page_ref": 16,
      "source_slides": [16, 17, 18, 19, 20],
      "expanded_note": {
        "core_idea": "string",
        "key_points": ["bullet ≤15 palavras", "bullet ≤15 palavras"],
        "subsections": [
          { "subtitle": "Sub-tema", "points": ["bullet"], "source_slides": [42, 43] }
        ],
        "verses": [
          { "ref": "Os 1:2-3", "context": "Deus ordena casamento com Gômer", "source_slide": 10 }
        ],
        "author_quotes": [
          { "text": "citação literal curta", "author": "Jonathan Edwards", "source_slide": 18 }
        ],
        "application": "string curta",
        "impact_phrase": "string ≤12 palavras"
      },
      "child_highlights": ["1-2 frases marcantes apenas"],
      "child_verses": []
    }
  ],
  "hierarchy": { "root": { "label": "string", "children": [] } },
  "keywords": ["string"],
  "structured_notes": []
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 24000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise COMPLETAMENTE o conteúdo abaixo, extraindo o máximo de informação. Retorne APENAS JSON válido:\n\n${corpus}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error("Resposta da IA foi truncada. Tente com um texto menor.");
    }

    const finishReason = data.choices?.[0]?.finish_reason;
    console.log("AI response. finish_reason:", finishReason);
    let result;
    const content = data.choices?.[0]?.message?.content || "";
    let rawArgs = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    if (!rawArgs || rawArgs.length < 10) {
      throw new Error("A IA não retornou dados. Tente novamente.");
    }

    try {
      result = JSON.parse(rawArgs);
    } catch {
      let repaired = rawArgs
        .replace(/,\s*$/g, "")
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;
      repaired = repaired.replace(/,\s*"[^"]*$/, "");
      repaired = repaired.replace(/:\s*"[^"]*$/, ': ""');
      repaired = repaired.replace(/:\s*$/, ': null');
      for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";
      try {
        result = JSON.parse(repaired);
      } catch (e2) {
        console.error("JSON repair failed:", (e2 as Error).message);
        throw new Error("Resposta da IA foi truncada. Tente com um texto menor.");
      }
    }

    if (!result.main_theme) result.main_theme = "Análise";
    if (!result.summary) result.summary = "";
    if (!result.key_concepts) result.key_concepts = [];
    if (!result.hierarchy) result.hierarchy = { root: { label: result.main_theme, children: [] } };
    if (!result.keywords) result.keywords = [];
    if (!result.structured_notes) result.structured_notes = [];

    // Safety: ensure at least 1 topic is_key (root) when none flagged
    const topics = (result.key_concepts || []).filter((c: any) => !c.type || c.type === "topic");
    const hasKey = topics.some((t: any) => t.is_key === true);
    if (!hasKey && topics.length > 0) {
      // Mark first 2 topics as key
      let count = 0;
      for (const t of topics) {
        if (count >= 2) break;
        t.is_key = true;
        count++;
      }
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
