---
name: Focus Workspace (hub imersivo)
description: Modo Foco transformado em workspace full-screen com painel lateral de 5 modos (Captura, Leitura, Devocional, Caderno, Mapa Mental), Pomodoro gigante, música YouTube custom via URL e cores que mudam
type: feature
---

## Arquivo
`src/components/secondbrain/FocusWorkspace.tsx` (substituiu o antigo `FocusMode.tsx`).

## Layout
- **Fullscreen overlay z-200** com `requestFullscreen()` nativo (botão Maximize2/Minimize2 no topo).
- **Sidebar lateral esquerda** colapsável (240px ↔ 72px) listando 5 modos com ícone, label e descrição.
- **Área principal** com top-bar (Pomodoro gigante 96px + controles + mini-player) e conteúdo dinâmico por modo.

## Pomodoro
- Anel SVG de 96px com stroke do accent da paleta atual + drop-shadow glow.
- Timer tabular 20px + fase (Foco/Pausa) em caps locked.
- Botões grandes: Pausar/Continuar + Reiniciar.
- 25min foco → 5min pausa. Ao terminar foco: celebração 🧠✨ 4.5s, incrementa `localStorage[fascinacao-focus-minutes-today]`, haptic heavy.

## Modos (sidebar)
1. **Captura** (padrão) — textarea grande com pulse de respiração 10s, voz (SpeechRecognition pt-BR), streak ⚡ +N por pensamento, Ctrl+Enter envia. Fire-and-forget `analyze-thought`.
2. **Leitura** — calls `onRequestReading?.()` que fecha o overlay e abre `setTab("leitura")` no Index.
3. **Devocional** — idem para tab devocional.
4. **Caderno** — idem para tab anotacoes (estudo).
5. **Mapa Mental** — idem para tab anotacoes.

Os modos 2-5 mostram um card com ícone gigante + botão "Abrir {label}". Timer e música continuam ativos enquanto o usuário estuda na tab correspondente.

## Música
Hook `useFocusMusic(active)` agora suporta 4 trilhas:
- `lofi` (🌙 jfKfPfyJRdk)
- `piano` (🎹 y7e-GC6oGhg)
- `ambient` (🌌 DWcJFNfaw9c)
- `custom` — URL/ID do YouTube escolhido pelo usuário, salvo em `localStorage[focus-custom-yt]`.

Função `extractYoutubeId()` aceita formato longo (`youtube.com/watch?v=`), curto (`youtu.be/`), embed, shorts ou ID cru de 11 chars.

Mini-player no top-bar: play/pause, skip, 4 botões de trilha + botão Youtube para abrir input inline. Slider de volume 0-100.

## Paletas
4 paletas cíclicas a cada 30s (transição 6s): Profundo, Oceano, Floresta, Crepúsculo. 18 partículas flutuantes (suprimidas em `prefers-reduced-motion`).

## Callbacks (Index.tsx → SecondBrainTab → FocusWorkspace)
```tsx
<SecondBrainTab
  userCodeId={userCodeId}
  onRequestReading={() => setTab("leitura")}
  onRequestDevotional={() => setTab("devocional")}
  onRequestNotes={() => setTab("anotacoes")}
  onRequestMindMap={() => setTab("anotacoes")}
/>
```

O FocusWorkspace chama esses callbacks ao clicar no modo, fechando o overlay e trocando a aba subjacente.
