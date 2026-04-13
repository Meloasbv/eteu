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
    const body = await req.json();
    const reference = body.reference || body.verse;

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Referência não fornecida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `Você é um assistente bíblico. Quando receber uma referência bíblica, retorne APENAS o texto do versículo em português (tradução Almeida Revista e Corrigida). Sem explicação, sem comentário, apenas o texto bíblico. Se for um intervalo de versículos, retorne todos separados por espaço. Se não reconhecer a referência, retorne "Versículo não encontrado".`,
          },
          { role: "user", content: reference },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ text, result: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verse-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
