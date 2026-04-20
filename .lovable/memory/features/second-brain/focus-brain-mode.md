---
name: Focus Brain Mode (Segundo Cérebro dentro do Modo Foco)
description: Sala dedicada "Modo Cérebro" no Modo Foco com grafo neon central sempre vivo, dock flutuante de captura (estilo Homem de Ferro), drag-and-drop de texto sobre o grafo, painel lateral 340px com análise+conexões. Captura SÓ acontece aqui — chat normal não salva mais como pensamento.
type: feature
---

## Arquitetura

- `src/components/secondbrain/BrainFocusMode.tsx` — container fullscreen do modo. Layout: grafo central + dock flutuante na base (`max-w-720px`) + painel lateral 340px (desktop) ou bottom sheet (mobile).
- `src/components/secondbrain/BrainCommandDock.tsx` — barra de captura neon com chips de tipo (✨auto/💭ideia/🪞reflexão/⚖️decisão/🙏oração/💡insight), textarea autosize, voz Web Speech API pt-BR, Enter=capturar.
- `src/components/secondbrain/BrainSidePanel.tsx` — painel do nó focado: análise psicológica + bíblica + diagnóstico + conexões clicáveis + ações (arquivar / remover conexões / excluir).
- `src/components/secondbrain/ThoughtGraph.tsx` — props novas: `theme: "gold" | "neon"`, `embedded`, `onSelectNode`. Tema neon: borda/halo `#00FF94`, fill `rgba(0,255,148,0.08)`, edges com saturação reduzida + glow neon em recentes.

## Ativação

- Atalho "Cérebro" na sidebar do `FocusWorkspace.tsx` abre o modo.
- Chip "Capturar" do dashboard inicial em `FocusCommandChat.tsx` agora também abre o modo cérebro com o conteúdo pré-preenchido (em vez de gravar inline).
- Intent `cerebro` em `focusIntent.ts` dispara `CustomEvent("focus-open-brain", { detail: { content } })` que `FocusWorkspace` ouve e ativa `brainMode=true` com `seedContent`.

## Captura — apenas dentro do Modo Cérebro

| Local | Captura? |
|---|---|
| Chat normal do Foco | Não — `capturar:` agora apenas abre o Modo Cérebro |
| Modo Cérebro (dock) | Sim, sempre |
| Drag-and-drop sobre o grafo | Sim (texto solto vira pensamento `ideia`) |
| Aba Segundo Cérebro fora do Foco | Sim (como antes) |

## Eventos globais

- `focus-open-brain` (`detail.content?`) — abre o Modo Cérebro pré-preenchendo o dock.
- `brain-thought-added` (`detail.id?`) — emitido após captura ou análise; força refetch do grafo (via `setGraphKey`) e seleciona o novo nó.
- `brain-node-select` (`detail.id`) — externo pode selecionar um nó.

## Pipeline de captura no dock

1. Insere `thoughts` (tipo escolhido ou "reflexão" se auto).
2. Toast neon "⚡ Capturado · Analisando…", limpa input, dispara `brain-thought-added`.
3. **Em background** (não bloqueia): busca últimos 25 pensamentos não-arquivados → `analyze-thought` edge → atualiza `analysis/keywords/emotion_*` no thought → upsert em `thought_connections` (par ordenado least/greatest, `onConflict: thought_a,thought_b`).
4. Reemite `brain-thought-added` com `analyzed: true` para refresh final.

## Tema neon do grafo (`theme="neon"`)

- Background: transparente.
- Nó: `fill rgba(0,255,148,0.10)`, borda `#00FF94`, halo pulsante mais forte para `<7d`.
- Edge: cor por `connection_type` mas dessaturada; glow neon sobre edges fortes.
- Label hover/focus: pill bg `#11161D`, borda `#00FF9433`, texto `#E6EDF3`.

## Schema reutilizado

Sem novas tabelas. `thoughts`, `thought_connections` cobrem tudo. Edge function `analyze-thought` reaproveitada sem mudanças.
