

## Modo "Segundo Cérebro" dentro do Modo Foco

Hoje, qualquer mensagem digitada no chat pode virar pensamento (via comando `capturar:` ou chip "Capturar"). Você quer o oposto: **uma sala dedicada** dentro do Modo Foco onde **tudo que você digita/arrasta vira pensamento** e o **grafo está sempre vivo na frente**, com a paleta neon do Foco (#00FF94 / #0B0F14). Fora dessa sala, nada é salvo como pensamento.

---

### 1. Novo "Modo Cérebro" no Modo Foco

**`FocusWorkspace.tsx`**
- Adicionar atalho `"Cérebro"` à `SHORTCUTS` (ícone `Brain`, cor primary neon).
- Novo estado `brainMode: boolean`. Quando ativo:
  - Esconde o chat de comando padrão.
  - Renderiza um **layout split**: grafo ocupando 100% da área central; **dock inferior** flutuante para captura/comando; **painel lateral direito (340px)** com o pensamento focado + conexões.
- Botão de saída (X) no topo do modo cérebro retorna ao chat normal.

```text
┌──────────────────────────────────────────────┐
│ Sidebar │ ◀ Voltar  Segundo Cérebro  ⚡ N nós│
│         ├──────────────────────────────────┬─┤
│ Atalhos │                                  │ │
│         │       GRAFO (canvas neon)        │P│
│         │     nós ◯─────◯  pulse halo      │A│
│         │         ╲   ╱                    │I│
│         │          ◯ (focus)               │N│
│         │                                  │E│
│         ├──────────────────────────────────┤L│
│         │ [⚡ Captura] digite e Enter… 🎤  │ │
└──────────────────────────────────────────────┘
```

---

### 2. Captura "estilo Homem de Ferro"

**`BrainCommandDock.tsx`** (novo, em `src/components/secondbrain/`)
- Barra flutuante neon na base do modo cérebro com:
  - Textarea que cresce, placeholder "Lance um pensamento, ideia ou plano…".
  - Seletor compacto de tipo (chips: 💭 ideia / 🪞 reflexão / ⚖️ decisão / 🙏 oração / 💡 insight / auto).
  - Botão mic (Web Speech API pt-BR já usado no SecondBrain).
  - Enter = capturar. Shift+Enter = nova linha.
- **Drag-and-drop**: drop zone full-screen quando o usuário arrasta texto/seleção sobre o grafo → cria pensamento com aquele conteúdo. Listener `dragover`/`drop` no container.
- Toda captura aqui:
  1. Insere em `thoughts` (mesma lógica de `BrainCaptureArtifact`).
  2. Chama `analyze-thought` com os últimos pensamentos para gerar conexões.
  3. Persiste `thought_connections` resolvidas.
  4. Mostra mini-toast neon "Capturado · analisando…" e o nó **aparece animado** no grafo (halo pulsante recente).

Nada de captura é gravado fora do modo cérebro — o chat normal **deixa de aceitar `capturar:`** quando `brainMode=false` (vira intent comum). O chip "Capturar" do dashboard inicial passa a **abrir o modo cérebro** já com foco no dock, em vez de gravar direto.

---

### 3. Grafo sempre vivo (paleta Modo Foco)

**`ThoughtGraph.tsx`** (re-skin sem quebrar lógica)
- Adicionar prop opcional `theme: "gold" | "neon"`. Default mantém o gold atual (usado fora do Foco). No modo cérebro do Foco, passar `theme="neon"`:
  - Background: `#0B0F14` (transparente sobre o bg do Foco).
  - Nós: borda/halo `#00FF94`, fill `rgba(0,255,148,0.08)`. Recentes (<7d) com pulse neon mais intenso.
  - Edges: cor por `connection_type` mantida, mas saturação reduzida + glow neon ao redor de edges fortes.
  - Labels (hover pill): bg `#11161D`, borda `#00FF94`33, texto `#E6EDF3`.
- Canvas se redesenha a cada novo pensamento (já existe via realtime/refresh — garantir refetch após captura local emitindo evento `brain-thought-added`).
- Auto-zoom suave para o nó recém-criado.

---

### 4. Painel lateral de foco (desktop)

Reaproveita o "Modo Foco do nó" já existente em `ThoughtGraph` (snippet, conexões, força, tipo, explicação da IA). No modo cérebro do Workspace, esse painel é **sempre visível à direita** (sticky 340px) ao invés de bottom sheet, mostrando:
- Pensamento selecionado no topo (texto + tipo + tempo).
- Análise psicológica + bíblica + diagnóstico (resumido, layout neon).
- Lista de conexões clicáveis (clicar → muda foco).
- Ações: editar / arquivar / remover conexões / excluir (já existem no `SecondBrainTab`, extrair para hook `useThoughtActions`).

Em mobile (<768px), o painel vira bottom sheet arrastável (igual ao `SecondBrainTab` atual).

---

### 5. Separação clara de responsabilidades

| Onde | Captura vira pensamento? | Grafo visível? |
|---|---|---|
| Chat normal do Foco | **Não.** `capturar:` agora apenas sugere "Abrir modo Cérebro". Ainda funciona pra compat se forçado, mas chip removido daqui. | Não |
| Modo Cérebro (novo) | **Sim, sempre.** Tudo digitado/dropado é capturado. | Sim, central |
| Aba Segundo Cérebro fora do Foco | Sim (como hoje) | Sim |

---

### 6. Memória e detalhes técnicos

- Salvar `mem://features/second-brain/focus-brain-mode` descrevendo: modo dedicado dentro do Foco, paleta neon, captura exclusiva via dock, drag-and-drop, painel lateral sticky.
- Reaproveitar a função `analyze-thought` existente — sem mudanças no edge.
- Sem novas tabelas. Schema atual (`thoughts`, `thought_connections`) já cobre.
- `BrainCaptureArtifact` continua existindo para mostrar a análise inline no chat normal **caso** o usuário ainda use `capturar:` por hábito, mas o caminho principal passa pelo modo cérebro.
- Evento global `brain-thought-added` para sincronizar grafo e dock após cada captura.

### Arquivos a editar/criar

- `src/components/secondbrain/FocusWorkspace.tsx` — atalho Cérebro + estado `brainMode` + render do layout.
- `src/components/secondbrain/BrainFocusMode.tsx` *(novo)* — container do modo (grafo + dock + painel).
- `src/components/secondbrain/BrainCommandDock.tsx` *(novo)* — captura + drag/drop + voz.
- `src/components/secondbrain/BrainSidePanel.tsx` *(novo)* — painel lateral do nó focado.
- `src/components/secondbrain/ThoughtGraph.tsx` — prop `theme="neon"`.
- `src/components/secondbrain/FocusCommandChat.tsx` — remover chip "Capturar" do dashboard inicial; substituir por chip "Cérebro" que abre o modo.
- `src/lib/focusIntent.ts` — `capturar:` agora retorna intent que **abre o modo cérebro** com o conteúdo pré-preenchido, em vez de salvar direto.
- `mem://features/second-brain/focus-brain-mode.md` *(novo)*.

