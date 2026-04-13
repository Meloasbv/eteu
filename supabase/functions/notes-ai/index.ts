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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const sourceBody = String(noteBody || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00a0/g, " ")
      .trim();

    const hasText = sourceBody
      .replace(/[#>*_`~\-\d\[\]().,!:;|]/g, "")
      .replace(/\s+/g, "")
      .length > 0;

    if (!hasText) {
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
      userPrompt = `Corrija os erros de gramática desta anotação:\n\nTítulo: ${noteTitle}\n\nConteúdo:\n${sourceBody}`;
    } else {
      systemPrompt = `Você é um assistente que organiza a ESTRUTURA VISUAL de anotações de estudo bíblico usando Markdown.

Sua tarefa é APENAS reorganizar visualmente o texto, SEM alterar nenhuma palavra:
1. Identifique frases que seriam bons títulos de seção e transforme-as em ## ou ###
2. Use **negrito** para destacar termos-chave e frases importantes
3. Use *itálico* para nomes próprios, termos teológicos ou ênfases naturais
4. Separe parágrafos corretamente (duas quebras de linha entre blocos)
5. Converta itens que parecem listas em bullet points (- item)
6. Use > para citações bíblicas já existentes no texto
7. Use --- para separar grandes seções temáticas

Regras ABSOLUTAS:
- NÃO adicione NENHUMA palavra, frase ou explicação nova
- NÃO remova NENHUMA palavra do texto original
- NÃO reescreva, parafraseie ou resuma — copie CADA palavra EXATAMENTE como está
- NÃO mude a ordem das frases ou parágrafos
- NÃO junte parágrafos — cada ideia deve ficar em seu próprio parágrafo
- Preserve TODOS os subtítulos (##/###), negrito (**texto**) e itálico (*texto*) já existentes
- Se houver versículos bíblicos, mantenha-os exatamente como escritos
- Comece direto com o conteúdo, sem frases como "Aqui está..."
- O resultado DEVE ser Markdown bem formatado com quebras de linha entre seções

O objetivo é que o texto fique VISUALMENTE organizado e fácil de ler, com hierarquia clara de títulos e destaques, mas com EXATAMENTE as mesmas palavras do original.`;
      userPrompt = `Organize visualmente esta anotação (NÃO mude nenhuma palavra, apenas adicione formatação Markdown):\n\nTítulo original: ${noteTitle}\n\nConteúdo:\n${sourceBody}`;
    }

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
