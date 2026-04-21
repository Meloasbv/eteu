---
name: Áreas Temáticas do Segundo Cérebro
description: Hub com 3 áreas (Reflexão, Oração, Brainstorm) com paleta, ambiência, áudio YT singleton, kanban/muro/exercício específicos, IA com tom por área
type: feature
---

# Áreas Temáticas

## Conceito
O Segundo Cérebro principal e o "Modo Cérebro" do Foco abrem o mesmo Hub de 3 áreas:
- **Reflexão** (azul lunar #7ba3c9) — emocional/decisão/reflexão/problema; exercício TCC
- **Oração** (lavanda #b08db5) — oração; muro de oração + oração sugerida pela IA
- **Brainstorm** (verde elétrico #10b981) — ideia/pergunta/estudo/insight; mini Kanban (idea/doing/done)

## Tokens & Estrutura
- `src/lib/brainAreas.ts` — fonte única de tokens, tipos por área e sons.
- `areaCSSVars(area)` — aplica `--area-bg/-surface/-accent/-glow/-text/-muted/-border` no host.
- `AreaShell` — fullscreen container com header, view-switcher (Feed/Grafo/Extensão), dock e ambiência.
- `BrainAreasHub` — chooser que abre uma `AreaShell` ao clicar.
- `AreaAmbience` — partículas/glow puramente CSS por área.

## Áudio
- `useAreaSound(area, active)` — singleton YouTube iframe com crossfade entre áreas (sem duplicar players).
- Sons curados por área + opção custom (URL YT) + silêncio. Preferências em localStorage.

## Grafo
- `ThoughtGraph` aceita `theme="area"` + `themeColor`, `filterIds`, `ghostIds`.
- Dentro de uma área: nodes da área 100%, demais como fantasmas (0.15 opacidade) — preserva contexto sem poluir.

## Banco
- Coluna `thoughts.area` (default 'brainstorm'), backfill por type.
- `prayer_status` ('pending' | 'answered'), `prayer_answered_at`, `kanban_status` ('idea' | 'doing' | 'done'), `reflection_exercise` (jsonb).

## Captura
- `AreaCommandDock` — captura sempre marca `area`, define `prayer_status='pending'` para Oração e `kanban_status='idea'` para Brainstorm.
- Drag-and-drop full-shell solta texto como pensamento da área atual.
- Evento global `brain-thought-added` notifica feed/grafo.

## IA por área
- Edge `analyze-thought` recebe `area` opcional. Ajusta system prompt:
  - Oração: tom acolhedor + `suggested_prayer` (3-5 frases, primeira pessoa).
  - Reflexão: padrões TCC + `reflection_exercise` (3 perguntas guiadas).
  - Brainstorm: ideias práticas + `expansion` (próximos passos).

## Integração
- Substitui o conteúdo da aba "Segundo Cérebro" (Index → render `BrainAreasHub`).
- Substitui o "Modo Cérebro" do Foco (`FocusWorkspace` → renderiza Hub no lugar de `BrainFocusMode`).
- Atalho "Cérebro" e seed do `capturar:` continuam funcionando: abrem o hub ou já entram numa área pré-selecionada com o conteúdo no dock.
