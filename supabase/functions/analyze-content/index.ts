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

    const systemPrompt = `Você é um assistente especializado em análise de conteúdo bíblico e teológico. Analise o texto fornecido e retorne APENAS um JSON válido com a estrutura solicitada.

REGRAS GERAIS:
- Identifique 6-12 conceitos-chave, extraindo o máximo possível do conteúdo fornecido
- Crie uma hierarquia com 3-6 tópicos principais, cada um com 2-4 subtópicos — seja detalhista e abrangente
- Notas estruturadas devem ter 3-6 seções cobrindo todo o conteúdo
- Inclua TODAS as referências bíblicas mencionadas no texto
- NÃO ignore nenhuma parte do texto — cubra TODO o conteúdo fornecido
- O resumo deve ter 3-4 parágrafos completos

REGRAS PARA OS CAMPOS DE ESTUDO (dentro de cada key_concept):
- coreIdea: UMA frase que resume a essência (máximo 15 palavras). Deve ser escaneável em 2 segundos.
- keyPoints: array de 3-5 pontos principais (cada um máximo 12 palavras). Curtos e diretos.
- practicalApplication: como isso afeta a vida do cristão (1-2 frases de confronto espiritual)
- bibleVerses: array de referências bíblicas relacionadas (formato "Livro capítulo:versículo"). Os mais relevantes, não genéricos.
- impactPhrase: uma frase curta e poderosa para memorizar (máximo 10 palavras). Como um slogan espiritual.

Seja CONCISO. Nenhum parágrafo longo. Cada ponto deve ser escaneável em 2 segundos.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise COMPLETAMENTE este texto, cobrindo TODOS os pontos e detalhes mencionados. Não resuma demais — extraia o máximo de informação possível:\n\n${text.slice(0, 30000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return the structured analysis of the text",
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
                        title: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string", enum: ["teologia", "contexto", "aplicação", "personagem", "lugar", "evento"] },
                        icon_suggestion: { type: "string" },
                        bible_refs: { type: "array", items: { type: "string" } },
                        coreIdea: { type: "string", description: "Uma frase que resume a essência (max 15 palavras)" },
                        keyPoints: { type: "array", items: { type: "string" }, description: "3-5 pontos principais (max 12 palavras cada)" },
                        practicalApplication: { type: "string", description: "Aplicação prática ou confronto espiritual (1-2 frases)" },
                        impactPhrase: { type: "string", description: "Frase memorizável de impacto (max 10 palavras)" },
                      },
                      required: ["id", "title", "description", "category", "coreIdea", "keyPoints", "practicalApplication", "impactPhrase"],
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
                                children: {
                                  type: "array",
                                  items: {
                                    type: "object",
                                    properties: {
                                      label: { type: "string" },
                                      children: { type: "array", items: { type: "object" } },
                                    },
                                    required: ["label"],
                                  },
                                },
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
