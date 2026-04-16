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

Seja CONCISO em cada campo. Nada de parágrafos longos. Cada ponto escaneável em 2 segundos.`;

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
          { role: "user", content: `Analise COMPLETAMENTE este texto, extraindo o máximo de informação:\n\n${text.slice(0, 20000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return the structured analysis for the mind map",
              parameters: {
                type: "object",
                properties: {
                  main_theme: { type: "string" },
                  summary: { type: "string" },
                  key_concepts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string", enum: ["topic", "highlight", "verse"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        summary: { type: "string", description: "Gancho de 1 linha (max 80 chars) para exibir no card do mapa" },
                        category: { type: "string", enum: ["teologia", "cristologia", "pneumatologia", "exegese", "contexto", "aplicacao", "escatologia", "soteriologia"] },
                        icon_suggestion: { type: "string" },
                        bible_refs: { type: "array", items: { type: "string" } },
                        expanded_note: {
                          type: "object",
                          properties: {
                            core_idea: { type: "string", description: "1 frase essencial, max 20 palavras" },
                            explanation: { type: "string", description: "2-4 parágrafos separados por \\n\\n, com versículos inline" },
                            affirmations: { type: "array", items: { type: "string" }, description: "3-5 frases citáveis, max 15 palavras cada" },
                            verses: { type: "array", items: { type: "string" }, description: "3-6 referências bíblicas formato Livro C:V" },
                            application: { type: "string", description: "1-2 parágrafos de aplicação" },
                            impact_phrase: { type: "string", description: "1 frase memorizável max 15 palavras" },
                          },
                          required: ["core_idea", "explanation", "affirmations", "verses", "application", "impact_phrase"],
                        },
                        child_highlights: { type: "array", items: { type: "string" }, description: "2-4 frases citáveis para HighlightCards filhos" },
                        child_verses: { type: "array", items: { type: "string" }, description: "1-3 referências bíblicas para VerseCards filhos" },
                      },
                      required: ["id", "type", "title", "description", "category"],
                    },
                  },
                  hierarchy: {
                    type: "object",
                    properties: {
                      root: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          children: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                label: { type: "string" },
                                children: { type: "array", items: { type: "object", properties: { label: { type: "string" } }, required: ["label"] } },
                              },
                              required: ["label"],
                            },
                          },
                        },
                        required: ["label", "children"],
                      },
                    },
                    required: ["root"],
                  },
                  keywords: { type: "array", items: { type: "string" } },
                  structured_notes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        section_title: { type: "string" },
                        points: { type: "array", items: { type: "string" } },
                      },
                      required: ["section_title", "points"],
                    },
                  },
                },
                required: ["main_theme", "summary", "key_concepts", "hierarchy", "keywords", "structured_notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
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

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    
    if (toolCall?.function?.arguments) {
      result = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
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
