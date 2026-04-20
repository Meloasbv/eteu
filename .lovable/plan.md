

# Tudo em Um — Segundo Cérebro como Hub Central (PARA + Modo Foco)

Transforma o Segundo Cérebro no centro de gravidade da plataforma. Remove a aba Agenda como item separado, organiza tudo via método PARA, adiciona um Modo Foco imersivo com música, animações e mudança de cores para ativar dopamina, e conecta leitura/devocional/estudo/lembretes ao mesmo grafo.

## 1. Reorganização da navegação

- **Remover** a aba "Agenda" da sidebar desktop (`DesktopSidebar.tsx`) e do bottom bar mobile (`Index.tsx`).
- A aba **Cérebro** vira o hub principal e ganha sub-navegação interna em pílulas:
  - **Hoje** (dashboard) · **PARA** · **Captura** · **Grafo** · **Padrões**
- Compromissos, lembretes e o calendário existente migram para dentro do Segundo Cérebro como "Áreas → Compromissos" + bloco "Hoje".

```text
Sidebar (antes)              Sidebar (depois)
─ Leitura                    ─ Leitura
─ Devocional                 ─ Devocional
─ Agenda          ❌         ─ Estudo
─ Estudo                     ─ Cérebro  ◄ hub Tudo em Um
─ Cérebro
```

## 2. Método PARA (nova tabela + UI)

Cria uma estrutura PARA leve por cima do que já existe, sem quebrar a captura atual de pensamentos.

**Tabela nova `para_items`** (migração SQL):
- `id`, `user_code_id`, `kind` (`project`|`area`|`resource`|`archive`), `title`, `description`, `color`, `icon`, `deadline` (nullable, só projects), `status` (`active`|`paused`|`done`), `created_at`, `updated_at`
- RLS: leitura/escrita pública (consistente com o resto do app).

**Tabela nova `para_links`** (vincular qualquer item da plataforma a um PARA):
- `id`, `user_code_id`, `para_id`, `entity_type` (`thought`|`note`|`mind_map`|`reminder`|`reading_day`|`devotional`|`favorite_verse`), `entity_id`, `entity_label`, `created_at`
- Índice único em (`para_id`, `entity_type`, `entity_id`).

**Nova view "PARA"** (`src/components/secondbrain/ParaBoard.tsx`):
- 4 colunas (Projetos · Áreas · Recursos · Arquivo) com cards arrastáveis.
- Cada card mostra título, ícone, contador de itens linkados ("12 pensamentos · 3 notas · 1 mapa") e barra de progresso para projetos com prazo.
- Modal para criar/editar item PARA com cor, ícone e prazo.
- Botão "+" abre seletor para vincular qualquer entidade existente (busca cross-tabela: thoughts, notes, mind_maps, reminders, favorite_verses).

## 3. Vista "Hoje" (entrada padrão do Cérebro)

`src/components/secondbrain/TodayDashboard.tsx` — abre por padrão ao entrar na aba Cérebro:

- **Linha 1:** Leitura de hoje (do plano) + Devocional do dia (já existem em `Index.tsx`, reaproveita os memos).
- **Linha 2:** Próximos lembretes/compromissos (lê `reminders` + eventos do localStorage da agenda existente).
- **Linha 3:** Últimos 3 pensamentos capturados + atalho "Capturar agora".
- **Linha 4:** Projetos PARA ativos com prazo nos próximos 7 dias.
- **Linha 5:** Sugestão de revisão (1 nota antiga + 1 mapa mental para "Destilar").

## 4. Modo Foco imersivo (dopamina + vício)

Botão flutuante no header da aba Cérebro: **"Entrar em Modo Foco"** (ícone Focus + ⚡).

Ao ativar, abre overlay em fullscreen (`src/components/secondbrain/FocusMode.tsx`):

**Visual / animações:**
- Background com gradiente animado lento que cicla por 4 paletas (deep purple → ocean → forest → sunset), trocando a cada ~25s com transição CSS de 6s.
- Partículas flutuantes leves em canvas (10-15 partículas, low-cost).
- Pulse sutil no card central sincronizado com a respiração (4s in / 6s out) para induzir calma.
- Texto da palette atual mudando em fade ("Profundo" · "Oceano" · "Floresta" · "Crepúsculo").
- Microinterações com haptic feedback em cada ação completada.

**Música:**
- Player oculto com 3 trilhas YouTube embed selecionáveis (Lo-fi reflexão · Piano sacro · Ambient deep focus). IDs em constante. Auto-play ao entrar, controles play/pause/skip discretos no canto.
- Fade-in da música em 3s ao entrar; fade-out ao sair.

**Loop de dopamina:**
- Timer Pomodoro 25/5 visível no topo (anel SVG progress).
- Cada pensamento capturado durante o foco ganha badge ⚡ "+1 streak" com animação scale-in + haptic.
- Contador "Foco hoje: Xmin" persistido em `localStorage`.
- Ao terminar 25min: confete sutil + frase ("Você está construindo seu segundo cérebro 🧠").

**Conteúdo do Modo Foco:**
- Card central de captura grande (mesmo `analyze-thought` existente).
- Abaixo: "Próximo a destilar" — pega 1 pensamento antigo sem análise refinada e propõe destilar/conectar a um PARA.
- Botão "Sair" minimalista no canto + ESC.

## 5. Integração transversal (ligar tudo ao Cérebro)

Cada entidade da plataforma ganha um botão discreto **"+ vincular ao Cérebro"** que abre seletor de PARA + tipo de relação:

| Tela | Onde aparece | O que vincula |
|---|---|---|
| Plano de Leitura | Card do dia, ao expandir | `reading_day` (semana-dia) |
| Devocional | Final do verso/devocional | `devotional` (ref bíblica) |
| Estudo › Notebook | Toolbar da nota | `note` (id) |
| Estudo › Mapa Mental | Header do mapa | `mind_map` (id) |
| Versículos favoritos | Menu do card | `favorite_verse` (id) |
| Lembretes | Card do lembrete | `reminder` (id) |

No grafo (`ThoughtGraph.tsx`), além dos pensamentos atuais, renderiza **nós satélite** menores (forma diferente: quadrado para nota, hexágono para mapa, estrela para versículo, círculo com borda para lembrete) representando entidades vinculadas ao mesmo PARA do pensamento. Linhas tracejadas conectam pensamento ↔ entidade vinculada (cor por tipo).

## 6. Migração da Agenda

- A view `WeekSchedule` continua existindo como componente, mas só é renderizada **dentro** do PARA Areas → "Compromissos" (acesso via card).
- Lembretes (`Reminders`) idem: viram bloco dentro de "Áreas → Lembretes" e aparecem na vista "Hoje".
- Nada de dados é perdido: o localStorage da agenda + tabela `reminders` continuam como fonte de verdade.

## 7. Detalhes técnicos

**Arquivos novos:**
- `supabase/migrations/<ts>_para_system.sql` — tabelas `para_items`, `para_links` + RLS.
- `src/components/secondbrain/TodayDashboard.tsx`
- `src/components/secondbrain/ParaBoard.tsx`
- `src/components/secondbrain/ParaItemModal.tsx`
- `src/components/secondbrain/FocusMode.tsx`
- `src/components/secondbrain/LinkToBrainButton.tsx` (botão reutilizável)
- `src/hooks/useFocusMusic.ts` (controle YouTube embed)
- `src/hooks/useParaLinks.ts` (CRUD de vínculos)

**Arquivos modificados:**
- `src/pages/Index.tsx` — remover tab "agenda", remover ícone Calendar dos TABS, redirecionar quem cair em "agenda" salva no localStorage para "cerebro".
- `src/components/desktop/DesktopSidebar.tsx` — remover item Agenda.
- `src/components/secondbrain/SecondBrainTab.tsx` — adicionar 2 abas internas (`hoje`, `para`) antes de `capture`, botão Modo Foco no header.
- `src/components/secondbrain/ThoughtGraph.tsx` — renderizar nós satélite por PARA ativo.

**Performance:**
- Modo Foco usa `requestAnimationFrame` com throttle e respeita `prefers-reduced-motion`.
- Música YouTube em iframe lazy-loaded só quando Modo Foco abre.

**Memória:**
- Atualizar `mem://index.md` para refletir a nova estrutura "Tudo em Um centrada no Cérebro".
- Criar `mem://features/second-brain/para-system.md` documentando PARA + Modo Foco.

## 8. Ordem de implementação

1. Migração SQL `para_items` + `para_links`.
2. Remover Agenda da navegação principal (mantém componentes vivos).
3. `LinkToBrainButton` + hook `useParaLinks`.
4. `ParaBoard` + `ParaItemModal` + integração com Agenda/Lembretes dentro de Áreas.
5. `TodayDashboard`.
6. Subnav interna na `SecondBrainTab` (Hoje · PARA · Captura · Grafo · Padrões).
7. `FocusMode` com música, paletas animadas e Pomodoro.
8. Nós satélite no `ThoughtGraph`.
9. Botões "vincular ao Cérebro" em Leitura, Devocional, Notebook, Mapa, Favoritos, Lembretes.
10. QA end-to-end + atualização de memória.

