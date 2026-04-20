---
name: Focus Workspace (chat-first hub)
description: Modo Foco refatorado em chat central GPT-style "O que quer fazer?" + painéis flutuantes arrastáveis (Leitura, Devocional, Estudo, Cérebro) com Pomodoro gigante e música YouTube custom
type: feature
---

## Arquivos
- `src/components/secondbrain/FocusWorkspace.tsx` — shell fullscreen com sidebar launcher, top-bar Pomodoro/música e área central de chat.
- `src/components/secondbrain/FocusCommandChat.tsx` — chat estilo GPT com hero "O que quer fazer agora?", 4 quick action chips e composer com detecção de intenção (regex pt-BR) que abre painéis automaticamente para frases curtas tipo "abrir leitura".
- `src/components/secondbrain/FloatingPanel.tsx` — painel arrastável (pointer events) com glassmorphism, drag handle, minimize, maximize fullscreen-do-painel e close. Animação de entrada slide+scale (cubic-bezier 0.22, 1, 0.36, 1).

## Comportamento
1. Ao abrir Modo Foco, usuário vê **chat central** com 4 quick chips (Leitura, Devocional, Caderno, Capturar).
2. Clicar num chip OU digitar "abrir leitura" abre um **painel flutuante** sobre o chat com o conteúdo real da tab (vindo de `children` no Index.tsx).
3. Múltiplos painéis podem ficar abertos simultaneamente. Cada painel vira foco quando clicado (z-index empilha via `panelOrder`).
4. Apenas o painel da tab ativa renderiza o conteúdo real (`children`); os outros mostram um botão "Trazer para frente" para evitar dupla montagem dos componentes pesados.
5. ESC fecha primeiro o painel do topo, depois o workspace.
6. Pomodoro 25/5 com anel SVG 80px no topo + controles Pausar/Reiniciar.
7. Mini-player YouTube no top-bar com 4 trilhas (lofi/piano/ambient/custom URL).
8. Sidebar launcher esquerda mostra os 4 modos com indicador de "ativo" (ponto luminoso) quando o painel está aberto.
9. 4 paletas cíclicas (Profundo/Oceano/Floresta/Crepúsculo) trocam a cada 30s; accent color permeia toda a UI (anel, chips, painéis, partículas).

## Detecção de intenção (FocusCommandChat)
Regex curtos disparam abertura de painel quando a mensagem tem ≤4 palavras:
- `/\b(ler|leitura|plano|bíbli|capítulo)\b/` → leitura
- `/\b(devocion|medita|orac|oração)\b/` → devocional
- `/\b(anota|caderno|nota|mapa mental|estudo)\b/` → anotacoes
- `/\b(captur|pensament|cérebro|registr)\b/` → cerebro

Mensagens longas vão para o `study-chat` edge function (streaming SSE) com persona teólogo reformado.

## Integração com Index.tsx
Index continua passando `children = renderContent()` (o conteúdo real da tab atual). O FocusWorkspace gerencia internamente quais painéis estão abertos e troca a `tab` quando o usuário foca um painel — assim só monta um conteúdo pesado por vez.
