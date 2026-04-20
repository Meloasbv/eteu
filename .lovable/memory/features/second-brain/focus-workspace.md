---
name: Focus Workspace (chat-first hub)
description: Modo Foco com chat central GPT-style "O que quer fazer?", painéis surgindo como balões inline (não overlay), paleta sólida fixa #0B0F14/#00FF94, Pomodoro gigante, música YouTube, totalmente responsivo mobile/desktop
type: feature
---

## Arquivos
- `src/components/secondbrain/FocusWorkspace.tsx` — shell fullscreen, sidebar fixa (desktop) ou drawer (mobile), top-bar com Pomodoro + música, paleta sólida.
- `src/components/secondbrain/FocusCommandChat.tsx` — chat thread com hero "O que quer fazer agora?", quick chips, e mensagens do tipo `panel` que renderizam o conteúdo da plataforma como **balão inline** (não overlay).
- `src/hooks/useFocusMusic.ts` — hook YouTube IFrame API com `loadVideoById` para troca sem reload, novo ID embeddable para piano (`4xDzrJKXOOY`), iframe 1×1 visível para postMessage funcionar em todos os browsers.

## Paleta sólida (fixa, não muda)
- `bg: #0B0F14` (escuro profundo)
- `surface: #11161D`, `surfaceLight: #1A2129`
- `border: #1F2730`
- `primary: #00FF94` (neon suave — usado em accents, glow, hover)
- `primarySoft: #1DB954`
- `text: #E6EDF3`, `textDim: #7A8A99`

Gradientes só em: glow leve do anel/botão Pomodoro, borda dos painéis-balão, sombra do botão enviar. **Sem ciclo de paletas.**

## Comportamento dos painéis (balão no chat)
1. Estado vazio: hero "O que quer fazer agora?" + 4 quick chips.
2. Clicar num chip OU digitar "leitura/devocional/caderno/capturar" (≤4 palavras) injeta uma mensagem `{ role: "panel", panelKey }` no thread.
3. O balão tem header com ícone+título+X (fechar = remover do thread), e altura `min(70vh, 560px)` com scroll interno.
4. `renderTab(key)` no Index.tsx é `(key) => { if (tab !== key) setTab(key); return renderContent(); }` — quando o usuário foca um painel, troca a tab subjacente e renderiza o conteúdo real.
5. Não há overlay, não há drag — apenas balão que aparece com animação `focus-panel-in` (slide+scale, cubic-bezier 0.22, 1, 0.36, 1).

## Mobile
- Sidebar vira drawer com overlay escuro (botão Menu no top-bar).
- Music mini-player oculto no mobile, substituído por botão único play/pause.
- Composer com `pb-[max(env(safe-area-inset-bottom),12px)]` para safe area.
- Painel-balão usa `min(70vh, 560px)` para nunca extrapolar a viewport.

## Pomodoro
25/5min, anel SVG 60-70px, glow neon do primary. Botões Pausar/Continuar + Reiniciar. Persiste em `localStorage[fascinacao-focus-minutes-today]`.

## Música — fix
- Iframe 1×1px com opacity 0.01 (não display:none) — necessário para `postMessage` funcionar em Safari/Firefox.
- Track switching usa `loadVideoById` ao invés de mudar `src`, evitando perder o player.
- Piano agora usa ID `4xDzrJKXOOY` (embeddable peaceful piano) — o anterior `y7e-GC6oGhg` tinha embed bloqueado.
- Listener de `onReady` via postMessage para autoplay confiável.

## Detecção de intenção
Regex em pt-BR para frases curtas:
- `/(ler|leitura|plano|bíbli|capítulo)/` → leitura
- `/(devocion|medita|orac|oração)/` → devocional
- `/(anota|caderno|nota|mapa mental|escrev)/` → anotacoes
- `/(captur|pensament|cérebro|registr|ideia)/` → cerebro

Mensagens longas vão para `study-chat` edge function (streaming SSE) com persona teólogo reformado.
