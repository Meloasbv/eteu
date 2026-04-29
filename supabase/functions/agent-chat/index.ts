import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Você é o ASSISTENTE DE ESTUDO de uma aula bíblica que está sendo gravada/transcrita.
Você tem acesso à transcrição (parcial ou completa) e aos tópicos detectados.
Responda com clareza, brevidade e profundidade teológica reformada.
Quando útil, cite versículos e personagens mencionados na aula.
Se o usuário pede para "resumir até agora", "comparar", "buscar contexto sobre X", faça com base na transcrição fornecida.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
    const { message, transcript, topics, history } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "message obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ctx = transcript ? (transcript.length > 12000 ? transcript.slice(-12000) : transcript) : "";
    const tps = (topics || []).map((t: any, i: number) => `${i + 1}. ${t.title || t}`).join("\n");

    const messages = [
      { role: "system", content: SYSTEM },
      { role: "system", content: `CONTEXTO DA AULA:\nTópicos: ${tps || "—"}\n\nTranscrição (últimos trechos):\n${ctx || "(sem transcrição ainda)"}` },
      ...(Array.isArray(history) ? history.slice(-8) : []),
      { role: "user", content: message },
    ];

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", max_tokens: 1200, messages }),
    });
    if (!res.ok) {
      const status = res.status;
      const errMsg = status === 429 ? "Limite atingido." : status === 402 ? "Créditos esgotados." : "Falha.";
      return new Response(JSON.stringify({ error: errMsg }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[agent-chat]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
