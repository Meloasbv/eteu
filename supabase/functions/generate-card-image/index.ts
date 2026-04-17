// Edge function: generate a small, on-brand illustration for a key mind-map card.
// Uses Gemini image model and returns a base64 data URL the client can inline directly.
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
    const { title, summary, category, role } = await req.json();

    if (!title || typeof title !== "string") {
      return new Response(
        JSON.stringify({ error: "title obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const styleGuide = `Estilo visual obrigatório: ilustração editorial minimalista, paleta dark premium gold sobre preto profundo (#0f0d0a, dourado #c4a46a). Sem texto, sem palavras, sem letras na imagem. Composição centralizada, símbolo único memorável, traços limpos, leve textura de papel envelhecido. Aparência de gravura sacra contemporânea. Fundo escuro sólido. Sem moldura, sem borda branca.`;

    const subject = role === "root"
      ? `Tema central de um mapa mental teológico: "${title}". Símbolo arquetípico que represente a IDEIA CENTRAL (não literal). ${summary ? `Contexto: ${summary}.` : ""}`
      : `Conceito teológico chave: "${title}" (categoria: ${category || "teologia"}). ${summary ? `Ideia: ${summary}.` : ""} Crie um símbolo visual concentrado, NÃO uma cena.`;

    const prompt = `${subject}\n\n${styleGuide}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        modalities: ["image", "text"],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite atingido", retryable: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("image gateway error:", response.status, t);
      throw new Error("image gateway error");
    }

    const data = await response.json();
    const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("no image in response", JSON.stringify(data).slice(0, 400));
      throw new Error("Sem imagem na resposta");
    }

    return new Response(
      JSON.stringify({ image: imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-card-image error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
