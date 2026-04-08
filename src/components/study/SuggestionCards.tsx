const sugestoes = [
  {
    titulo: "📜 Exegese de João 1:1",
    descricao: "Análise palavra por palavra no grego original",
    prompt: "Faça uma exegese completa de João 1:1, analisando cada palavra no grego original com transliteração, significado e contexto teológico",
  },
  {
    titulo: "✝️ Justificação pela fé",
    descricao: "Conceito teológico central da Reforma",
    prompt: "Explique o conceito de justificação pela fé na teologia paulina, com referências bíblicas e contexto histórico",
  },
  {
    titulo: "🔥 Quem é o Espírito Santo?",
    descricao: "Pessoa, natureza e obra na Trindade",
    prompt: "Quem é o Espírito Santo segundo as Escrituras? Explique sua natureza como Pessoa divina, seus atributos e sua obra na vida do cristão",
  },
  {
    titulo: "📖 Contexto de Romanos 8:28",
    descricao: "Contexto histórico, literário e teológico",
    prompt: "Qual é o contexto histórico, literário e teológico de Romanos 8:28? Quem era o público de Paulo e qual o argumento do capítulo?",
  },
  {
    titulo: "🗺️ Aliança antiga vs nova",
    descricao: "Comparação teológica das alianças bíblicas",
    prompt: "Compare a antiga e a nova aliança na Bíblia, explicando as diferenças fundamentais, as referências em Hebreus e Jeremias",
  },
];

export default function SuggestionCards({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 pt-12">
      <div className="text-5xl mb-4 opacity-60">📖</div>
      <h2 className="font-body text-xl font-bold text-center text-foreground">
        Assistente de Estudo Bíblico
      </h2>
      <p className="text-sm text-center mt-2 max-w-[280px] text-muted-foreground font-body">
        Pergunte qualquer coisa sobre a Bíblia. Exegese, contexto histórico, grego, hebraico, teologia.
      </p>
      <div className="grid grid-cols-1 gap-2 mt-8 w-full max-w-sm">
        {sugestoes.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.prompt)}
            className="text-left p-4 rounded-xl transition-all active:scale-[0.98]"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <span className="text-sm font-bold text-foreground">{s.titulo}</span>
            <span className="text-xs block mt-1 text-muted-foreground">{s.descricao}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
