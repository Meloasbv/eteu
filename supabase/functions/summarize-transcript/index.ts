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
    const { transcript } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const plain = (transcript || "").trim();
    if (!plain) {
      return new Response(
        JSON.stringify({ error: "Transcrição vazia." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um assistente especialista em teologia e estudos bíblicos que resume transcrições de áudio em tópicos claros e organizados.

Regras:
- PRIMEIRO, corrija erros de transcrição usando seu conhecimento bíblico:
  • Nomes bíblicos grafados errado (ex: "moises" → "Moisés", "jezus" → "Jesus", "paulo" → "Paulo")
  • Referências bíblicas incorretas (ex: "gênesis capítulo 50 versículo 3" → "Gênesis 50:3")
  • Termos teológicos mal transcritos (ex: "sotério logia" → "soteriologia", "esca tologia" → "escatologia")
  • Palavras quebradas ou mal reconhecidas pela transcrição de voz
- Extraia os principais pontos e organize em tópicos usando bullet points (•)
- Cada tópico deve ser uma frase curta e objetiva
- Agrupe tópicos relacionados sob subtítulos quando fizer sentido
- Mantenha a essência do que foi dito sem adicionar interpretações próprias
- Se houver referências bíblicas, destaque-as com a grafia correta
- Escreva em português brasileiro
- Comece direto com os tópicos, sem introdução`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Resuma esta transcrição em tópicos:\n\n${plain}` },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao processar com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-transcript error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
