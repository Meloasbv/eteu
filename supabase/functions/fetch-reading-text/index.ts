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
    const { readings } = await req.json();

    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return new Response(
        JSON.stringify({ error: "Envie a lista de leituras." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const readingsList = readings.join(", ");

    const systemPrompt = `Você é um assistente bíblico especializado. Sua tarefa é fornecer o TEXTO COMPLETO dos capítulos e versículos solicitados.

REGRAS CRÍTICAS:
- Retorne o texto bíblico REAL da tradução Almeida Revista e Atualizada (ARA)
- Para cada referência, inclua o nome do livro e capítulo como título
- Numere cada versículo
- Separe livros/capítulos diferentes com uma linha "---"
- NÃO resuma. NÃO parafraseie. Dê o texto COMPLETO de cada capítulo mencionado
- Se a referência indicar capítulos (ex: "Gn. 1-7"), forneça TODOS os capítulos
- Para referências muito extensas (mais de 5 capítulos), forneça os 3 primeiros capítulos completos e um resumo dos demais com os versículos-chave
- Use formato limpo: "**Gênesis 1**" como título, depois "1 No princípio..." etc.
- Mantenha a linguagem original da tradução ARA`;

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
          { role: "user", content: `Forneça o texto bíblico completo para a seguinte leitura do dia: ${readingsList}` },
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
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione fundos em Configurações > Workspace > Uso." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-reading-text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
