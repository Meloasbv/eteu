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
    const { action, noteTitle, noteBody, allNotes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Strip HTML tags for cleaner AI input
    const plainBody = (noteBody || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "summarize":
        systemPrompt =
          "Você é um assistente de estudo bíblico. Resuma a anotação de forma clara e concisa em português brasileiro. Use bullet points quando útil. Mantenha o foco nos pontos espirituais e teológicos principais.";
        userPrompt = `Título: ${noteTitle}\n\nConteúdo:\n${plainBody}`;
        break;

      case "questions":
        systemPrompt =
          "Você é um professor de estudo bíblico. Gere 5 perguntas reflexivas e profundas para estudo pessoal a partir da anotação fornecida. As perguntas devem estimular reflexão espiritual, aplicação prática e aprofundamento teológico. Responda em português brasileiro.";
        userPrompt = `Título: ${noteTitle}\n\nConteúdo:\n${plainBody}`;
        break;

      case "organize":
        systemPrompt =
          "Você é um assistente de organização de estudos bíblicos. Analise as notas fornecidas e sugira uma organização por temas/tópicos. Agrupe as notas por assuntos em comum, sugira conexões entre elas e recomende uma ordem de estudo. Responda em português brasileiro de forma clara e estruturada.";
        const notesSummary = (allNotes || [])
          .map(
            (n: any, i: number) =>
              `${i + 1}. "${n.title || "Sem título"}" (Sem. ${n.week}, ${n.section}) — ${(n.body || "")
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 200)}`
          )
          .join("\n");
        userPrompt = `Aqui estão minhas ${(allNotes || []).length} anotações de estudo bíblico:\n\n${notesSummary}`;
        break;

      default:
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

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
            { role: "user", content: userPrompt },
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
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na sua conta Lovable." }),
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
    console.error("notes-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
