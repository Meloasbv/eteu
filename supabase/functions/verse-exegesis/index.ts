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
    const { verse, verseText } = await req.json();

    if (!verse || !verseText) {
      return new Response(
        JSON.stringify({ error: "Envie o versículo e sua referência." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try OpenAI key first, fallback to Lovable AI Gateway
    const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
    const LOVABLE_API_KEY = (Deno.env.get("LOVABLE_API_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();

    let apiUrl: string;
    let authHeader: string;
    let model: string;

    if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith("sk-")) {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      authHeader = `Bearer ${OPENAI_API_KEY}`;
      model = "gpt-4o-mini";
    } else if (LOVABLE_API_KEY) {
      apiUrl = "https://agentic.lovable.dev/v1/chat/completions";
      authHeader = `Bearer ${LOVABLE_API_KEY}`;
      model = "google/gemini-2.5-flash";
    } else {
      throw new Error("No AI API key configured");
    }

    const systemPrompt = `Você é um teólogo reformado fazendo uma exegese ENXUTA e DIRETA de um versículo bíblico.

REGRAS RÍGIDAS:
- Resposta TOTAL: 4 a 7 frases. Nunca mais que 120 palavras.
- NÃO use títulos, cabeçalhos, listas, "##" ou "**".
- Texto corrido, em parágrafos curtos (2-3 linhas cada).
- Foco: 1) sentido das 1-2 palavras-chave no original (grego/hebraico), entre parênteses; 2) ideia teológica central; 3) implicação prática em 1 frase.
- Português brasileiro claro. Sem floreio. Direto ao ponto.
- O leitor quer ler RÁPIDO — não cansar.`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Faça uma exegese palavra por palavra deste versículo:\n\nReferência: ${verse}\nTexto: "${verseText}"` },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verse-exegesis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
