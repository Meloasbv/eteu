---
name: Focus Workspace (devotional black/gold)
description: Modo Foco com paleta preto-dourado devocional, chrome minimizável (Pomodoro+música em chip), Modo Zen imersivo (só chat), transcrição ao vivo via Web Speech API com modo Apresentar
type: feature
---

## Paleta devocional (preto/dourado) — fixa
- `bg: #0a0805` (preto profundo levemente quente)
- `surface: #13100b`, `surfaceLight: #1a1610`
- `border: #2a2218`, `borderSoft: #1f1a13`
- `primary: #d4a94a` (dourado suave devocional, sem brilho neon)
- `primarySoft: #b8902f`
- `text: #ede4d0`, `textDim: #8a7e66`, `textFaint: #574d3d`

Definida em 3 lugares (mantenha sincronizado):
- `src/components/secondbrain/artifacts/types.ts → FOCUS_PALETTE`
- `src/components/secondbrain/FocusWorkspace.tsx → PALETTE`
- `src/components/secondbrain/FocusCommandChat.tsx → PALETTE`

## Chrome minimizável e Modo Zen
- `chromeCollapsed`: Pomodoro+música viram **chip único** (dot pulsante + mm:ss + label foco/pausa + play/pause música). Clique no chip expande.
- Botão `ChevronUp` minimiza, `Eye` ativa **Zen mode** (esconde sidebar+topbar; só chat e composer visíveis).
- Atalho **Cmd/Ctrl+Shift+Z** alterna Zen. **Esc** sai do Zen antes de fechar Foco.
- Pill flutuante "Sair zen" no canto superior direito quando Zen ativo.

## Modo Transcrição
- Componente: `src/components/secondbrain/artifacts/TranscriptionArtifact.tsx`
- Web Speech API (`SpeechRecognition` com fallback `webkitSpeechRecognition`) em pt-BR, contínuo, com `interimResults`.
- Auto-reinicia ao terminar (`onend` + `shouldRestartRef`).
- **Modo Apresentar**: aumenta fonte para 28px, fundo preto puro, ideal para projeção.
- Ações: Ouvir/Parar, Apresentar/Sair, Copiar, Salvar nota (insere em `notes` como categoria "Transcrição"), Limpar.
- Triggers no chat:
  - `transcrição`, `transcrever`, `legenda`, `ditado`, `ouvir e escrever` → modo normal.
  - `apresentação ao vivo`, `apresentar` → já abre em modo Apresentar.
- Quick action "Transcrever" no grid inicial (Radio icon).

## Intent Routing — focus-intent
Adicionado tipo `transcricao` em `FocusIntent` + regex local em `detectIntentLocal`.
Sem chamada de IA — 100% client-side (Web Speech API), zero custo.

## Composer
Placeholder atualizado: `"O que quer fazer? Ex: 'leitura', 'transcrever', 'exegese de João 1'"`.
