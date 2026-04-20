---
name: PARA System + Focus Mode
description: Segundo Cérebro como hub central com método PARA (Projetos/Áreas/Recursos/Arquivo), TodayDashboard, FocusMode imersivo (música YouTube + paletas animadas + Pomodoro), Agenda/Lembretes movidos para Áreas
type: feature
---

## Estrutura
- Aba "Agenda" foi removida da navegação principal (sidebar e bottom bar). Tab salva `agenda` redireciona para `cerebro`.
- `WeekSchedule` e `Reminders` continuam vivos como componentes, renderizados dentro de `ParaBoard` ao clicar nos cards "Compromissos" / "Lembretes" da coluna **Áreas**.

## Tabelas
- `para_items` (id, user_code_id, kind, title, description, color, icon, deadline, status, timestamps). RLS pública.
- `para_links` (id, user_code_id, para_id, entity_type, entity_id, entity_label). Índice único `(para_id, entity_type, entity_id)`. `entity_type ∈ thought|note|mind_map|reminder|reading_day|devotional|favorite_verse`.

## Hooks
- `useParaItems(userCodeId)` — CRUD dos itens PARA.
- `useParaLinks(userCodeId, paraId?)` — link/unlink/unlinkByEntity com upsert anti-duplicata.
- `useFocusMusic(active)` — controla iframe YouTube (postMessage API) com 3 trilhas: lofi/piano/ambient. Auto-play ao abrir, pause ao fechar.

## Componentes
- `SecondBrainTab` — sub-nav: **Hoje · PARA · Captura · Grafo · Padrões** + botão flutuante "Modo Foco" no header.
- `TodayDashboard` — leitura do dia + devocional + lembretes 7 dias + 3 últimos pensamentos + projetos com prazo ≤14d.
- `ParaBoard` — 4 colunas (Projetos/Áreas/Recursos/Arquivo) com cards mostrando contador de links e badge de prazo (overdue/em breve). Áreas tem 2 atalhos built-in: Compromissos e Lembretes.
- `ParaItemModal` — criar/editar com kind, ícone (14 emojis), 8 cores, prazo opcional (só projetos), status.
- `LinkToBrainButton` — botão reutilizável que abre seletor para vincular qualquer entidade a um PARA. Suporta variant `ghost` ou `pill`.
- `FocusMode` — overlay fullscreen z-200 com:
  - Background gradiente que cicla 4 paletas (Profundo/Oceano/Floresta/Crepúsculo) a cada 25s, transição 6s.
  - 14 partículas flutuantes em CSS keyframes (suprimidas em `prefers-reduced-motion`).
  - Pomodoro 25/5 com anel SVG e auto-fase. Ao completar 25min de foco: incrementa `localStorage[fascinacao-focus-minutes-today]`, mostra celebração 4.5s.
  - Card central com `breathe` animation 10s. Captura usa `analyze-thought` em background (fire-and-forget).
  - Streak ⚡ +N por pensamento capturado durante a sessão (haptic).
  - Player oculto YouTube (lazy iframe), troca trilhas + volume.
  - ESC fecha.

## Integração
- `LinkToBrainButton` deve ser plugado em: ReadingFocusView, DevotionalTab, NoteEditor toolbar, MindMapCanvas header, DesktopRightPanel favoritos, Reminders cards.
