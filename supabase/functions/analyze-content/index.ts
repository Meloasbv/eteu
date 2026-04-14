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

    const systemPrompt = `Você é um assistente especializado em análise de conteúdo bíblico e teológico. Analise o texto fornecido e retorne APENAS um JSON válido (sem markdown, sem backticks, sem explicação) com esta estrutura exata:

{
  "main_theme": "Tema principal em uma frase",
  "summary": "Resumo de 2-3 parágrafos",
  "key_concepts": [
    {
      "id": "concept_1",
      "title": "Nome do conceito",
      "description": "Explicação em 1-2 frases",
      "category": "teologia|contexto|aplicação|personagem|lugar|evento",
      "icon_suggestion": "nome de ícone Lucide sugerido (ex: book-open, heart, flame, crown, shield, cross, users, scroll, star, sword, mountain, waves, sun, anchor, scale, lightbulb)",
      "bible_refs": ["Jo 3:16", "Rm 5:8"]
    }
  ],
  "hierarchy": {
    "root": {
      "label": "Tema central",
      "children": [
        {
          "label": "Tópico 1",
          "children": [
            { "label": "Subtópico 1.1", "children": [] },
            { "label": "Subtópico 1.2", "children": [] }
          ]
        }
      ]
    }
  },
  "keywords": ["palavra1", "palavra2"],
  "structured_notes": [
    {
      "section_title": "Título da seção",
      "points": ["Ponto 1", "Ponto 2"]
    }
  ]
}

REGRAS:
- Identifique 4-8 conceitos-chave
- Crie uma hierarquia com 2-4 tópicos principais, cada um com 1-3 subtópicos
- Notas estruturadas devem ter 2-4 seções
- Inclua referências bíblicas quando relevantes
- Retorne SOMENTE o JSON, nada mais`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise este texto:\n\n${text.slice(0, 15000)}` },
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
                      },
                      required: ["id", "title", "description", "category"],
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
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    
    if (toolCall?.function?.arguments) {
      result = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      // Fallback: try parsing content as JSON
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
