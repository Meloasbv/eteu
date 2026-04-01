import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, (text: string) => { system: string; user: string }> = {
  comment: (text) => ({
    system: `Você é um teólogo reformado. Comente brevemente este trecho de estudo bíblico, trazendo insights teológicos, contexto histórico ou conexões com outras passagens. Responda em português, máximo 150 palavras. Seja direto e perspicaz.`,
    user: `Trecho: "${text}"`,
  }),
  context: (text) => ({
    system: `Você é um teólogo e historiador bíblico. Explique o contexto histórico, teológico e a aplicação prática da passagem ou referência contida neste trecho. Se houver referências bíblicas, explique-as em profundidade. Responda em português, máximo 200 palavras.`,
    user: `Explique o contexto deste trecho de estudo bíblico: "${text}"`,
  }),
  meaning: (text) => ({
    system: `Você é um estudioso de línguas bíblicas (grego koiné e hebraico). Identifique as 2-3 palavras teologicamente mais importantes neste trecho e forneça para cada uma: a palavra em português, a transliteração do grego ou hebraico, a palavra no alfabeto original, e uma definição teológica concisa. Responda em português, formato lista organizada.`,
    user: `Analise as palavras-chave deste trecho: "${text}"`,
  }),
  question: (text) => ({
    system: `Você é um professor de teologia bíblica. Gere 1-2 perguntas de reflexão profundas sobre o trecho a seguir, que ajudem o estudante a aprofundar sua compreensão. As perguntas devem estimular pensamento crítico e aplicação pessoal. Responda em português.`,
    user: `Gere perguntas de reflexão sobre: "${text}"`,
  }),
  summary: (text) => ({
    system: `Você é um estudioso bíblico. Resuma o trecho a seguir em 1-2 frases concisas, capturando a essência teológica principal. Responda em português.`,
    user: `Resuma: "${text}"`,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, selectedText } = await req.json();

    if (!action || !selectedText?.trim()) {
      return new Response(
        JSON.stringify({ error: "Selecione um trecho de texto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const promptFn = PROMPTS[action];
    if (!promptFn) {
      return new Response(
        JSON.stringify({ error: "Ação inválida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { system, user } = promptFn(selectedText.trim());

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao processar com IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("selection-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
