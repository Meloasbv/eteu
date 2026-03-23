

## Plano: Campo de Anotações para Estudo Bíblico

### O que será criado

Uma nova aba **"✍️ Anotações"** no app, onde o usuário pode criar, visualizar e remover anotações de estudo bíblico. Cada anotação terá:

- **Nome da aula** (obrigatório)
- **Referência bíblica** (opcional)
- **Resumo / conteúdo** (textarea)
- **Data** (automática)

As anotações serão persistidas em `localStorage` (chave `bible-notes-2026`), seguindo o padrão já usado no projeto.

### Estrutura

1. **Novo componente** `src/components/BibleNotes.tsx`
   - Estado `notes` (array de anotações) carregado/salvo via localStorage
   - Modal bottom-sheet para criar nova anotação (mesmo estilo do modal de eventos da Agenda)
   - Lista de cards com as anotações salvas, ordenadas por data (mais recente primeiro)
   - Botão de remover em cada card com confirmação
   - Estado vazio com call-to-action para adicionar primeira anotação

2. **Integração em `src/pages/Index.tsx`**
   - Adicionar `"anotacoes"` ao tipo do estado `tab`
   - Adicionar botão "✍️ Anotações" na barra de abas
   - Renderizar `<BibleNotes />` quando a aba estiver ativa

### Detalhes Técnicos

- Tipo `Note`: `{ id: string; title: string; reference: string; summary: string; createdAt: string }`
- localStorage key: `bible-notes-2026`
- Estilo visual: mesmo padrão dark/gold do app (cores `#e8d8b8`, `#8a7a60`, `#C8A55C`, bordas `rgba(200,180,140,..)`)
- Modal com campos: input para título, input para referência bíblica, textarea para resumo
- Cards com accent line colorida, título, referência em badge, resumo truncado que expande ao clicar

