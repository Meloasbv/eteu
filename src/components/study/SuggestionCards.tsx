import { ArrowRight } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  exegese: "#7ba3c9",
  teologia: "#c9a067",
  espirito: "#d4854a",
  contexto: "#8b9e7a",
  alianca: "#b08db5",
};

const sugestoes = [
  {
    titulo: "Exegese de João 1:1",
    descricao: "Análise palavra por palavra no grego original",
    prompt: "Faça uma exegese completa de João 1:1, analisando cada palavra no grego original com transliteração, significado e contexto teológico",
    emoji: "📜",
    category: "exegese",
  },
  {
    titulo: "Justificação pela fé",
    descricao: "Conceito teológico central da Reforma",
    prompt: "Explique o conceito de justificação pela fé na teologia paulina, com referências bíblicas e contexto histórico",
    emoji: "✝️",
    category: "teologia",
  },
  {
    titulo: "Quem é o Espírito Santo?",
    descricao: "Pessoa, natureza e obra na Trindade",
    prompt: "Quem é o Espírito Santo segundo as Escrituras? Explique sua natureza como Pessoa divina, seus atributos e sua obra na vida do cristão",
    emoji: "🔥",
    category: "espirito",
  },
  {
    titulo: "Contexto de Romanos 8:28",
    descricao: "Contexto histórico, literário e teológico",
    prompt: "Qual é o contexto histórico, literário e teológico de Romanos 8:28? Quem era o público de Paulo e qual o argumento do capítulo?",
    emoji: "📖",
    category: "contexto",
  },
  {
    titulo: "Aliança antiga vs nova",
    descricao: "Comparação teológica das alianças bíblicas",
    prompt: "Compare a antiga e a nova aliança na Bíblia, explicando as diferenças fundamentais, as referências em Hebreus e Jeremias",
    emoji: "🗺️",
    category: "alianca",
  },
];

export default function SuggestionCards({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center px-2 pt-8 pb-4">
      {/* Icon with glow */}
      <div className="text-5xl mb-4 relative" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.3))' }}>
        <span className="animate-breathing inline-block">📖</span>
      </div>

      <h2 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 26, fontWeight: 600, letterSpacing: 0.3, lineHeight: 1.3 }}
        className="text-center text-foreground">
        Assistente de Estudo Bíblico
      </h2>

      <p style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, letterSpacing: 0.2 }}
        className="text-center mt-2 max-w-[300px] text-muted-foreground">
        Pergunte qualquer coisa sobre a Bíblia. Exegese, contexto histórico, grego, hebraico, teologia.
      </p>

      {/* Decorative divider */}
      <div className="w-10 h-px my-5 opacity-40"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }} />

      <div className="flex flex-col gap-3 mt-2 w-full max-w-md">
        {sugestoes.map((s, i) => {
          const color = CATEGORY_COLORS[s.category] || "hsl(var(--primary))";
          return (
            <button
              key={i}
              onClick={() => onSelect(s.prompt)}
              className="text-left p-4 rounded-xl transition-all active:scale-[0.97] hover:-translate-y-0.5 flex items-center gap-3.5 group"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderLeftWidth: 3,
                borderLeftColor: color,
                opacity: 0,
                animation: `cardEnter 0.4s ease-out ${0.05 + i * 0.05}s forwards`,
              }}
            >
              <span className="text-xl shrink-0">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <span style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 16, fontWeight: 600, letterSpacing: 0.2 }}
                  className="text-foreground block">{s.titulo}</span>
                <span className="text-[12px] block mt-0.5 text-muted-foreground font-ui leading-snug">{s.descricao}</span>
              </div>
              <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
