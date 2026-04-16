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
    const { text } = await req.json();

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

    const systemPrompt = `Você é um assistente especializado em análise de conteúdo bíblico e teológico. Analise o texto fornecido e retorne dados estruturados para um mapa mental visual.

REGRAS PARA OS KEY_CONCEPTS:
- Cada conceito principal é type="topic" e DEVE ter expanded_note completo
- Para cada topic, gere 2-4 child_highlights (frases citáveis, máx 12 palavras, estilo tweet teológico)
- Para cada topic, gere 1-3 child_verses (referências bíblicas relevantes no formato "Livro C:V")
- Gere também conceitos type="highlight" standalone para frases marcantes do texto
- Gere também conceitos type="verse" standalone para versículos centrais

REGRAS PARA CATEGORIAS:
Use estas categorias teológicas: teologia, cristologia, pneumatologia, exegese, contexto, aplicacao, escatologia, soteriologia

REGRAS PARA O SUMMARY DE CADA TOPIC:
- NÃO é resumo acadêmico. É um GANCHO de 1 linha (máx 80 chars)
- Exemplo BOM: "O Verbo se fez carne — adição, não subtração"
- Exemplo RUIM: "Na teologia cristã, a encarnação refere-se ao processo..."

REGRAS PARA EXPANDED_NOTE:
- core_idea: 1 frase essencial, máx 20 palavras
- explanation: 2-4 parágrafos (separados por \\n\\n), cada um máx 4 linhas. Mencione versículos inline (Jo 1:14, Rm 8:28)
- affirmations: 3-5 frases curtas (máx 15 palavras cada), citáveis
- verses: 3-6 referências bíblicas no formato "Livro C:V"
- application: 1-2 parágrafos de aplicação prática/espiritual
- impact_phrase: 1 frase memorizável (máx 15 palavras)

Seja CONCISO em cada campo. Nada de parágrafos longos. Cada ponto escaneável em 2 segundos.

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
      "bible_refs": ["Livro C:V"],
      "expanded_note": {
        "core_idea": "string",
        "explanation": "string com \\n\\n entre parágrafos",
        "affirmations": ["frase 1", "frase 2"],
        "verses": ["Livro C:V"],
        "application": "string",
        "impact_phrase": "string"
      },
      "child_highlights": ["frase citável 1"],
      "child_verses": ["Livro C:V"]
    }
  ],
  "hierarchy": {
    "root": {
      "label": "string",
      "children": [{"label": "string", "children": [{"label": "string"}]}]
    }
  },
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
          { role: "user", content: `Analise COMPLETAMENTE este texto, extraindo o máximo de informação. Retorne APENAS JSON válido:\n\n${text.slice(0, 15000)}` },
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
      console.error("Failed to parse AI gateway response, length:", rawText.length, "last 100 chars:", rawText.slice(-100));
      throw new Error("Resposta da IA foi truncada. Tente com um texto menor.");
    }
    
    const finishReason = data.choices?.[0]?.finish_reason;
    console.log("AI response received. finish_reason:", finishReason, "content length:", (data.choices?.[0]?.message?.content || "").length);
    let result;
    
    // Extract content from response (plain text JSON, no tool calls)
    const content = data.choices?.[0]?.message?.content || "";
    let rawArgs = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    if (!rawArgs || rawArgs.length < 10) {
      console.error("Empty AI response. finish_reason:", finishReason);
      throw new Error("A IA não retornou dados. Tente novamente.");
    }

    // Attempt parse with repair for truncated JSON
    try {
      result = JSON.parse(rawArgs);
    } catch {
      console.warn("JSON parse failed, attempting repair. Length:", rawArgs.length, "finish_reason:", finishReason);
      // Try to repair truncated JSON by closing open brackets/braces
      let repaired = rawArgs
        .replace(/,\s*$/g, "")  // trailing comma
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      
      // Count and close unclosed brackets
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;
      
      // Remove trailing incomplete string/value
      repaired = repaired.replace(/,\s*"[^"]*$/, "");
      repaired = repaired.replace(/:\s*"[^"]*$/, ': ""');
      repaired = repaired.replace(/:\s*$/, ': null');
      
      for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";
      
      try {
        result = JSON.parse(repaired);
        console.log("JSON repair succeeded");
      } catch (e2) {
        console.error("JSON repair also failed:", (e2 as Error).message);
        throw new Error("Resposta da IA foi truncada. Tente com um texto menor.");
      }
    }
    
    // Ensure minimum structure
    if (!result.main_theme) result.main_theme = "Análise";
    if (!result.summary) result.summary = "";
    if (!result.key_concepts) result.key_concepts = [];
    if (!result.hierarchy) result.hierarchy = { root: { label: result.main_theme, children: [] } };
    if (!result.keywords) result.keywords = [];
    if (!result.structured_notes) result.structured_notes = [];

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
