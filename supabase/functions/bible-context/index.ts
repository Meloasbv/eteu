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
    const { reference, verseText, tab } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Referência bíblica não fornecida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (tab === "context") {
      // Book context: author, date, recipients, historical context, purpose, canon position
      const bookMatch = reference.match(/^(.+?)\s+\d/);
      const bookName = bookMatch ? bookMatch[1] : reference;

      systemPrompt = `Você é um teólogo e historiador bíblico. Forneça informações detalhadas sobre o livro bíblico solicitado.

Responda em JSON válido com estes campos:
{
  "autor": "nome do autor (ou autoria tradicionalmente atribuída)",
  "data": "data estimada de escrita",
  "destinatarios": "para quem foi escrito",
  "contexto_historico": "o que estava acontecendo naquela época (2-3 frases)",
  "proposito": "propósito do livro (2-3 frases)",
  "posicao_canon": "posição no cânon bíblico (ex: 4º livro do NT, categoria: Epístolas Paulinas)",
  "tema_central": "tema central do livro em uma frase"
}

Responda APENAS o JSON, sem markdown, sem explicação adicional. Em português brasileiro.`;

      userPrompt = `Forneça contexto sobre o livro bíblico: ${bookName}`;

    } else if (tab === "exegesis") {
      systemPrompt = `Você é um teólogo especializado em exegese bíblica. Analise o versículo fornecido de forma completa.

Responda em JSON válido com estes campos:
{
  "palavras_chave": [
    {
      "portugues": "palavra em português",
      "transliteracao": "transliteração",
      "original": "palavra em grego/hebraico",
      "significado": "significado detalhado"
    }
  ],
  "comentario_matthew_henry": "resumo do comentário de Matthew Henry (2-3 frases)",
  "visao_pais_igreja": "visão dos Pais da Igreja sobre esta passagem (2-3 frases)",
  "aplicacao_pratica": "aplicação prática para hoje (1-2 frases)",
  "referencias_cruzadas": ["referência 1", "referência 2", "referência 3"]
}

Responda APENAS o JSON, sem markdown. Em português brasileiro. Inclua 3-5 palavras-chave.`;

      userPrompt = `Faça uma análise exegética completa de: ${reference}${verseText ? `\nTexto: "${verseText}"` : ""}`;

    } else if (tab === "connections") {
      systemPrompt = `Você é um estudioso bíblico especializado em teologia bíblica e conexões temáticas.

Responda em JSON válido com estes campos:
{
  "temas": ["tema 1", "tema 2"],
  "passagens_relacionadas": [
    {
      "referencia": "referência bíblica",
      "texto_resumido": "breve citação ou resumo",
      "conexao": "como se conecta com a passagem original (1 frase)"
    }
  ]
}

Inclua 4-6 passagens relacionadas que o leitor talvez não conheça. Responda APENAS JSON, sem markdown. Em português brasileiro.`;

      userPrompt = `Identifique temas e passagens relacionadas a: ${reference}${verseText ? `\nTexto: "${verseText}"` : ""}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Tab inválida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          JSON.stringify({ error: "Créditos de IA esgotados." }),
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
    const raw = data.choices?.[0]?.message?.content || "";
    
    // Try to parse as JSON, stripping markdown code fences if present
    let parsed;
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bible-context error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
