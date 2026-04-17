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
        .slice(0, 28000);
    } else {
      corpus = text.slice(0, 18000);
    }

    const pdfRules = isPdf ? `

REGRAS ESPECÍFICAS PARA PDF (você recebeu o texto marcado por [[PÁGINA N]]):
- COBERTURA TOTAL: gere um topic para CADA seção/subtópico relevante do PDF. Não pule conteúdo. Se há 12 seções no PDF, devem haver ~12 topics. Mínimo 8 topics quando o PDF for denso.
- Para CADA topic, preencha "page_ref" com o número da página onde o conceito aparece principalmente.
- Para CADA topic, preencha "quotes" com 2-3 CITAÇÕES LITERAIS curtas (máx 25 palavras cada) extraídas do texto da página, com aspas duplas no JSON. Não invente — copie do corpus.
- Marque "is_key": true APENAS para os 3-5 topics MAIS centrais do documento (esses recebem imagem ilustrativa). Os demais ficam com is_key: false mas mantêm o mesmo nível de detalhe textual.
` : `

REGRAS:
- COBERTURA TOTAL: extraia TODOS os subtemas presentes. Não resuma de forma demais. Mínimo 6 topics, idealmente 8-12 quando o texto comportar.
- Marque "is_key": true para os 3-5 topics MAIS importantes (esses recebem imagem). Os demais ficam com is_key: false mas igualmente detalhados.
- "quotes" e "page_ref" podem ser omitidos quando não houver fonte estruturada.
`;

    const systemPrompt = `Você é um assistente especializado em análise de conteúdo bíblico e teológico. Sua tarefa é fazer uma análise PROFUNDA e COMPLETA do texto, não um resumo superficial. Cada subtema importante deve virar um topic — nada deve ser deixado de fora.

REGRAS PARA OS KEY_CONCEPTS:
- Cada conceito principal é type="topic" e DEVE ter expanded_note completo (mesmo os topics não-chave)
- Para cada topic, gere 3-5 child_highlights (frases citáveis, máx 14 palavras, estilo tweet teológico)
- Para cada topic, gere 2-4 child_verses (referências bíblicas relevantes no formato "Livro C:V")
- Gere também 3-6 conceitos type="highlight" standalone para frases marcantes globais do texto
- Gere também 2-5 conceitos type="verse" standalone para versículos centrais do documento
${pdfRules}
REGRAS PARA CATEGORIAS:
Use estas categorias teológicas: teologia, cristologia, pneumatologia, exegese, contexto, aplicacao, escatologia, soteriologia

REGRAS PARA O SUMMARY DE CADA TOPIC:
- NÃO é resumo acadêmico. É um GANCHO de 1 linha (máx 80 chars)
- Exemplo BOM: "O Verbo se fez carne — adição, não subtração"

REGRAS PARA EXPANDED_NOTE:
- core_idea: 1 frase essencial, máx 20 palavras
- explanation: 4-6 parágrafos densos (separados por \\n\\n), cada um máx 5 linhas. Mencione versículos inline (Jo 1:14, Rm 8:28). Vá fundo no conceito.
- affirmations: 3-5 frases curtas (máx 15 palavras cada), citáveis
- verses: 3-6 referências bíblicas no formato "Livro C:V"
- application: 1-2 parágrafos de aplicação prática/espiritual
- impact_phrase: 1 frase memorizável (máx 15 palavras)

RETORNE APENAS um JSON válido (sem markdown, sem \`\`\`), com esta estrutura exata:
{
  "main_theme": "string",
  "summary": "string",
  "key_concepts": [
    {
      "id": "concept_1",
      "type": "topic|highlight|verse",
      "title": "string",
      "description": "string",
      "summary": "gancho curto max 80 chars",
      "category": "teologia|cristologia|pneumatologia|exegese|contexto|aplicacao|escatologia|soteriologia",
      "icon_suggestion": "emoji",
      "is_key": true,
      "page_ref": 3,
      "quotes": ["citação literal 1", "citação literal 2"],
      "bible_refs": ["Livro C:V"],
      "expanded_note": {
        "core_idea": "string",
        "explanation": "string com \\n\\n entre parágrafos",
        "affirmations": ["frase 1"],
        "verses": ["Livro C:V"],
        "application": "string",
        "impact_phrase": "string"
      },
      "child_highlights": ["frase citável 1"],
      "child_verses": ["Livro C:V"]
    }
  ],
  "hierarchy": { "root": { "label": "string", "children": [] } },
  "keywords": ["string"],
  "structured_notes": [{"section_title": "string", "points": ["string"]}]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 16000,
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
