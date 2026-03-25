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
    const { noteTitle, noteBody, action } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const plainBody = (noteBody || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!plainBody) {
      return new Response(
        JSON.stringify({ error: "Nota vazia. Escreva algo antes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (action === "gramatica") {
      systemPrompt = `Você é um corretor gramatical de português brasileiro. Sua ÚNICA tarefa é corrigir erros de gramática, ortografia, acentuação e pontuação.

Regras RÍGIDAS:
- Corrija APENAS erros gramaticais, ortográficos e de pontuação
- NÃO mude o estilo, tom ou estrutura do texto
- NÃO adicione, remova ou reorganize frases ou parágrafos
- NÃO reescreva ou parafraseie — mantenha as mesmas palavras, apenas corrija os erros
- Mantenha versículos bíblicos exatamente como escritos
- Mantenha a formatação original (títulos, parágrafos, listas)
- Comece direto com o conteúdo corrigido, sem explicações
- Se não houver erros, retorne o texto exatamente como está`;
      userPrompt = `Corrija os erros de gramática desta anotação:\n\nTítulo: ${noteTitle}\n\nConteúdo:\n${plainBody}`;
    } else {
      systemPrompt = `Você é um assistente que organiza a estrutura de anotações de estudo bíblico usando Markdown.

Sua tarefa:
1. Adicionar títulos (## e ###) para separar seções logicamente
2. Separar parágrafos corretamente (duas quebras de linha entre blocos)
3. Converter itens que parecem listas em bullet points (- item)
4. Usar > para citações bíblicas
5. Usar --- para separar grandes seções
6. Manter **negrito** e *itálico* para ênfases existentes

Regras RÍGIDAS:
- NÃO adicione nenhuma palavra, frase ou explicação que não exista no original
- NÃO reescreva ou parafraseie — copie o texto EXATAMENTE como está
- NÃO adicione introduções, conclusões ou comentários
- NÃO junte parágrafos — cada ideia deve ficar em seu próprio parágrafo
- Cada bullet point (•) do original deve virar um item de lista separado (- item)
- Se houver versículos bíblicos, mantenha-os exatamente como escritos
- Comece direto com o conteúdo, sem frases como "Aqui está..."
- Escreva em português brasileiro
- O resultado DEVE ser Markdown bem formatado com quebras de linha entre seções`;
      userPrompt = `Organize esta anotação de estudo bíblico:\n\nTítulo original: ${noteTitle}\n\nConteúdo:\n${plainBody}`;
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
    console.error("notes-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
