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
    const { noteTitle, noteBody } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const body = String(noteBody || "").replace(/\r\n/g, "\n").trim();
    if (!body || body.replace(/[#>*_`~\-\d\[\]().,!:;|\s]/g, "").length === 0) {
      return new Response(
        JSON.stringify({ error: "Nota vazia. Escreva algo antes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um teólogo e estudioso bíblico. Analise a anotação de estudo bíblico e adicione comentários teológicos relevantes.

Sua tarefa:
1. Identifique trechos importantes do texto (frases ou parágrafos curtos)
2. Para cada trecho, crie um comentário breve e perspicaz (1-2 frases)
3. Os comentários devem adicionar insight teológico, contexto histórico, conexão com outras passagens, ou aplicação prática

Responda em JSON válido com este formato:
{
  "comments": [
    {
      "trecho": "texto exato que aparece na nota (copie exatamente como está)",
      "comentario": "seu comentário teológico sobre este trecho"
    }
  ]
}

Regras:
- Inclua 3-6 comentários
- O campo "trecho" DEVE ser uma cópia EXATA de um trecho que existe na nota original
- Escolha trechos significativos, não palavras soltas
- NUNCA repita o mesmo conteúdo do trecho no comentário — o comentário deve ACRESCENTAR informação nova
- NUNCA faça comentários genéricos ou óbvios — seja específico e perspicaz
- Cada comentário deve trazer uma perspectiva DIFERENTE (contexto histórico, conexão bíblica, aplicação, etc.)
- Comentários devem ser concisos e relevantes
- Responda APENAS o JSON, sem markdown, sem explicação
- Em português brasileiro`;

    const userPrompt = `Analise esta anotação e adicione comentários teológicos:\n\nTítulo: ${noteTitle}\n\nConteúdo:\n${body}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao processar com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { comments: [] };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notes-comment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
