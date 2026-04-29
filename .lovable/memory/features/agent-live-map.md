---
name: agent-live-map
description: Canvas leve de tópicos arrastáveis no RecordingView (tab Mapa ao vivo) com conexões manuais; ao parar, vira mind_map persistido editável na aba Mapa do StudyHub
type: feature
---
# Mapa ao vivo do Agente

- `RecordingView` tem sub-tabs **Lista** e **Mapa ao vivo** na coluna lateral.
- `LiveTopicCanvas.tsx`: React Flow leve. Cada tópico detectado vira nó arrastável. O usuário liga pontos arrastando entre handles. Posições e edges ficam no estado do RecordingView e são enviadas ao `onFinish` em `payload.layout`.
- Ao finalizar a sessão, `AgentTab.finalizeSession` cria um registro em `mind_maps` (source_type='agent') com:
  - root central com o título da sessão
  - 1 nó `simpleNode` por tópico, preservando a posição do canvas ao vivo se existir
  - edges manuais do usuário + edges automáticas root→tópico para os que ele não conectou manualmente
  - grava `mind_map_id` em `study_sessions`
- Aba **Mapa** do `StudyHub` usa `AgentMapTab.tsx`, que carrega o `ManualMindMapCanvas` via lazy. Para sessões antigas sem `mind_map_id`, cria o mapa on-demand a partir dos tópicos.
