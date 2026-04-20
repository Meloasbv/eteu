/**
 * Intent router for Focus Mode.
 * 1) Fast client-side regex for unambiguous commands (zero latency).
 * 2) Falls back to focus-intent edge function for fuzzy/long input.
 */

export type FocusIntent =
  | "leitura"
  | "devocional"
  | "mapa_mental"
  | "nota"
  | "cerebro"
  | "exegese"
  | "versiculo"
  | "pergunta"
  | "timer"
  | "saudacao";

export interface IntentResult {
  intent: FocusIntent;
  params: Record<string, any>;
  response_text: string;
}

const VERSE_RE =
  /\b(?:gn|ex|lv|nm|dt|js|jz|rt|sm|rs|cr|ed|ne|et|jó|sl|pv|ec|ct|is|jr|lm|ez|dn|os|jl|am|ob|jn|mq|na|hc|sf|ag|zc|ml|mt|mc|lc|jo|at|rm|co|gl|ef|fp|cl|ts|tm|tt|fm|hb|tg|pe|jd|ap|gênesis|êxodo|levítico|números|deuteronômio|josué|juízes|rute|samuel|reis|crônicas|esdras|neemias|ester|jó|salmos?|provérbios|eclesiastes|cantares|isaías|jeremias|lamentações|ezequiel|daniel|oséias|joel|amós|obadias|jonas|miquéias|naum|habacuque|sofonias|ageu|zacarias|malaquias|mateus|marcos|lucas|joão|atos|romanos|coríntios|gálatas|efésios|filipenses|colossenses|tessalonicenses|timóteo|tito|filemom|hebreus|tiago|pedro|judas|apocalipse)\.?\s*\d+(?:\s*[:,.]\s*\d+(?:\s*-\s*\d+)?)?/i;

export function detectIntentLocal(raw: string): IntentResult | null {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  // Greeting
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hello)[!.?\s]*$/i.test(text)) {
    return {
      intent: "saudacao",
      params: {},
      response_text: "Olá. O que vamos estudar agora?",
    };
  }

  // Timer commands
  if (/^(pausar|pausa|parar)\s*(o\s*)?(timer|pomodoro|foco)?$/i.test(text)) {
    return { intent: "timer", params: { action: "pause" }, response_text: "Timer pausado." };
  }
  if (/^(continuar|retomar|play)\s*(o\s*)?(timer|pomodoro|foco)?$/i.test(text)) {
    return { intent: "timer", params: { action: "resume" }, response_text: "Timer rodando." };
  }
  if (/^(reiniciar|resetar|reset)\s*(o\s*)?(timer|pomodoro|foco)?$/i.test(text)) {
    return { intent: "timer", params: { action: "reset" }, response_text: "Timer reiniciado." };
  }

  // Capture prefix → cerebro
  const captureMatch = text.match(/^(?:capturar|capture|registrar|anota[r]?\s*pensamento)\s*[:\-—]\s*(.+)/i);
  if (captureMatch) {
    return {
      intent: "cerebro",
      params: { action: "capture", content: captureMatch[1].trim() },
      response_text: "Registrado.",
    };
  }

  // Note prefix → nota
  const noteMatch = text.match(/^(?:anotar|nota)\s*[:\-—]\s*(.+)/i);
  if (noteMatch) {
    return {
      intent: "nota",
      params: { action: "create", content: noteMatch[1].trim() },
      response_text: "Salvei sua nota.",
    };
  }

  // Reading shortcuts
  if (wordCount <= 4 && /\b(leitura|ler hoje|plano|plano biblico|plano bíblico)\b/i.test(lower)) {
    return {
      intent: "leitura",
      params: { action: "show_today" },
      response_text: "Sua leitura de hoje:",
    };
  }

  // Devotional shortcuts
  if (wordCount <= 4 && /\b(devocional|meditação|meditacao|reflexão|reflexao)\b/i.test(lower)) {
    return {
      intent: "devocional",
      params: { action: "show_today" },
      response_text: "Sua reflexão de hoje:",
    };
  }

  // Mind map shortcuts
  if (wordCount <= 5 && /\b(mapa(?:s)? mental|mapa(?:s)? mentais|meus mapas)\b/i.test(lower)) {
    return {
      intent: "mapa_mental",
      params: { action: "list" },
      response_text: "Seus mapas mentais:",
    };
  }

  // Exegese explicit
  const exegeseMatch = text.match(/exeges[ei]\s+(?:de\s+|do\s+)?(.+)/i);
  if (exegeseMatch && VERSE_RE.test(exegeseMatch[1])) {
    return {
      intent: "exegese",
      params: { reference: exegeseMatch[1].trim() },
      response_text: "Análise exegética:",
    };
  }

  return null;
}

export async function routeIntent(text: string): Promise<IntentResult> {
  const local = detectIntentLocal(text);
  if (local) return local;

  // Fallback to AI classifier
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focus-intent`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return {
      intent: data.intent ?? "pergunta",
      params: data.params ?? { question: text },
      response_text: data.response_text ?? "",
    };
  } catch (e) {
    console.error("routeIntent fallback failed:", e);
    return {
      intent: "pergunta",
      params: { question: text },
      response_text: "",
    };
  }
}

export const LOADING_MESSAGES: Record<FocusIntent, string> = {
  leitura: "Buscando sua leitura...",
  devocional: "Preparando sua meditação...",
  mapa_mental: "Carregando mapas...",
  nota: "Salvando sua nota...",
  cerebro: "Analisando seu pensamento...",
  exegese: "Consultando o texto original...",
  versiculo: "Buscando o versículo...",
  pergunta: "Refletindo sobre isso...",
  timer: "Ajustando timer...",
  saudacao: "",
};
