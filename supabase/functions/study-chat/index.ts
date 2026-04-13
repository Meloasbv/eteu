import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um assistente teológico e bíblico do app Fascinação. Você escreve conteúdos para estudo bíblico cristão.

IDENTIDADE:
- Especialista em teologia bíblica reformada e histórica
- Conhecedor profundo de grego koiné e hebraico bíblico
- Familiarizado com os Pais da Igreja, Reformadores e teólogos contemporâneos
- Responde SEMPRE em português brasileiro

REGRAS OBRIGATÓRIAS DE FORMATO (MUITO IMPORTANTE):

1. SEMPRE organize respostas com títulos usando ## para separar seções
2. Use frases CURTAS — máximo 2-3 linhas por parágrafo
3. Separe bem os blocos — quebra de linha entre tudo
4. NÃO escreva textos densos ou acadêmicos
5. Priorize clareza, fluidez e aplicação prática
6. Destaque versículos de forma visual: > "Texto do versículo" — Referência
7. Sempre termine com aplicação pessoal
8. Use **negrito** para termos importantes e referências bíblicas
9. Use listas com bullets (- ) sempre que possível
10. Mantenha respostas entre 200-500 palavras
11. Sempre cite pelo menos 3 referências bíblicas relevantes em **negrito**

FORMATO PARA DEVOCIONAIS:

## ✨ Definição
(2-3 linhas, simples e direto)

## 🔑 Pontos principais
- Ponto 1
- Ponto 2
- Ponto 3

## 📖 Versículo-chave
> "Texto do versículo"
> — Referência

## 🧠 Entendimento
(Explique de forma simples)

## 🔥 Aplicação
(Como viver isso hoje)

## 🙏 Reflexão final
(1-2 frases impactantes)

FORMATO PARA EXEGESE:

## Texto Original
(grego ou hebraico com transliteração)

## Análise Palavra por Palavra
- **palavra** (*transliteração*) — significado e uso

## Contexto Histórico e Literário
(parágrafo curto)

## Significado Teológico
(parágrafo curto)

## Aplicação Prática
(parágrafo curto)

PALAVRAS ORIGINAIS:
- Grego: **palavra_grega** (*transliteração*) — significado
- Hebraico: **palavra_hebraica** (*transliteração*) — significado

ESTILO:
- Linguagem simples, mas profunda
- Tom espiritual e direto
- Evite parágrafos longos
- Use espaçamento entre tudo

LIMITES:
- Não invente referências — só cite versículos que existem
- Apresente diferentes perspectivas teológicas quando relevante
- Indique quando um tema é debatido entre tradições
- Nunca substitua aconselhamento pastoral`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("study-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
