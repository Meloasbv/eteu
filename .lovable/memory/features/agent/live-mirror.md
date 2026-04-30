---
name: Agent Live Mirror (cross-device)
description: Sincronização ao vivo do Agente entre celular (gravando) e PC (espelhando) via Supabase Realtime
type: feature
---

Quando o usuário grava no Agente em um dispositivo, qualquer outro dispositivo logado com o mesmo código de acesso vê em tempo real:

- Transcrição completa (debounced 800ms via tabela `live_sessions`)
- Tópicos detectados pela IA
- Notas pessoais
- Tempo decorrido / status (recording/paused/stopped)

**Tabela**: `public.live_sessions` — UNIQUE em `user_code_id` (1 sessão ao vivo por código). REPLICA IDENTITY FULL + adicionada à publication `supabase_realtime`.

**Lib**: `src/lib/liveSync.ts` — `pushLiveSession`, `subscribeLiveSession`, `sendLiveCommand`, `clearLiveSession`, `getDeviceId` (deviceId persistido em localStorage `etheu.deviceId`).

**Gravador** (`RecordingView.tsx`): empurra snapshot debounced; assina comandos remotos (`pause`/`resume`/`stop`/`add_note`); limpa a row no stop/unmount.

**Espelho** (`LiveMirrorView.tsx`): exibido quando `AgentTab` detecta `live_sessions.device_id !== meu deviceId`. Banner verde no idle abre o espelho. Permite controle total compartilhado (botões enviam comandos via `sendLiveCommand`).
