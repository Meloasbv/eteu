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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const plain = (transcript || "").trim();
    if (!plain) {
      return new Response(
        JSON.stringify({ error: "Transcrição vazia." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um assistente especialista em teologia e estudos bíblicos que formata transcrições de áudio em notas de estudo bem organizadas.

TAREFA:
Receba uma transcrição bruta de áudio (possivelmente com erros) e transforme em uma nota de estudo formatada em HTML pronto para inserção em um editor rich text.

ETAPAS OBRIGATÓRIAS:

1. CORREÇÃO DE TRANSCRIÇÃO:
   - Corrija nomes bíblicos (ex: "moises" → "Moisés", "jezus" → "Jesus")
   - Corrija referências bíblicas (ex: "joão capítulo 3 versículo 16" → "João 3:16")
   - Corrija termos teológicos (ex: "sotério logia" → "soteriologia", "esca tologia" → "escatologia")
   - Corrija palavras quebradas ou mal reconhecidas

2. FORMATAÇÃO EM HTML:
   - Use <h2> para títulos de seções
   - Use <h3> para subtítulos
   - Use <strong> para termos-chave e referências bíblicas
   - Use <em> para ênfases e termos em grego/hebraico
   - Use <ul><li> para listas de pontos
   - Use parágrafos <p> curtos (máximo 3 linhas)
   - Separe bem as seções

3. VERSÍCULOS BÍBLICOS:
   - Quando uma referência bíblica for mencionada (ex: "João 3:16"), insira o versículo completo como blockquote
   - Formato: <blockquote><p><strong>[Referência]</strong></p><p><em>Texto do versículo na tradução Almeida Revista e Atualizada</em></p></blockquote>
   - Use seu conhecimento para inserir o texto correto do versículo
   - Se não tiver certeza do texto exato, insira apenas a referência em negrito

4. ESTRUTURA:
   - Comece com um título <h2> baseado no tema principal
   - Organize em seções lógicas
   - Termine com uma aplicação prática ou reflexão quando apropriado

REGRAS:
- Retorne APENAS HTML válido, sem markdown, sem explicações
- NÃO adicione <html>, <body> ou <head>
- Mantenha a essência e as ideias do que foi dito
- Escreva em português brasileiro
- Seja fiel ao conteúdo original, apenas organizando e formatando`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Formate esta transcrição de áudio em uma nota de estudo HTML:\n\n${plain}` },
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
    let html = data.choices?.[0]?.message?.content || "";
    
    // Clean up any markdown code fences the model might have added
    html = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

    return new Response(JSON.stringify({ result: html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-format error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
