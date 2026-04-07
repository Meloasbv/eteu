

## Plan: Redesign Mobile Completo — Correção Urgente

O app tem problemas estruturais no mobile: `#root` com `max-width: 1280px` e `padding: 2rem` no App.css, container principal sem fullscreen, bottom tab bar fraca, e layouts internos de Leitura/Devocional não otimizados para mobile.

---

### Arquivos a modificar

#### 1. `src/App.css` — Limpar completamente
- Remover `max-width`, `margin: 0 auto`, `padding: 2rem` do `#root`
- Substituir por reset fullscreen: `width: 100%; margin: 0; padding: 0; min-height: 100dvh; overflow-x: hidden`
- Remover classes `.logo`, `.card`, `.read-the-docs` (não usadas)

#### 2. `src/index.css` — Atualizar bottom tab bar e header
- **Bottom tab bar**: altura 72px, `background: rgba(26,22,16,0.95)`, blur 20px, borda `rgba(196,164,106,0.12)`, tabs com Lucide icons (não emojis), labels 10px uppercase bold, dot indicator via `::after`, tab ativa com `translateY(-2px)` e scale 1.15 no ícone
- **Header**: padding 12px 20px, background `rgba(26,22,16,0.92)`, blur 16px, borda sutil `rgba(196,164,106,0.08)`
- **main-content**: `padding-bottom: 88px`
- Adicionar classes `.fab` (56px circular accent com sombra dourada)

#### 3. `src/pages/Index.tsx` — Redesign das abas Leitura e Devocional

**Bottom Tab Bar:**
- Trocar emojis por Lucide icons: `BookOpen`, `Flame`, `Calendar`, `PenLine`, `Trophy`
- Aplicar classes CSS novas (tab-item, tab-icon, tab-label)

**Header:**
- Remover botão "SAIR" / logout do header
- Manter apenas: label "FASCINAÇÃO · 2026A" + título da aba + toggle de tema

**Aba Leitura — refazer layout:**
- **Hero card** "Leitura de Hoje": gradient background `#2a2519 → #1e1a14`, glow accent no canto, label accent 10px uppercase, título serif 20px, pills dos livros com fundo `rgba(196,164,106,0.12)`, botão check circular 48px absolute bottom-right
- **Seletor de semanas**: carrossel horizontal com scroll-snap, pills circulares 44x44px (active: filled accent, complete: borda verde + ✓, future: borda `#3d362a`)
- **Progresso da semana**: título serif + barra de progresso 6px com porcentagem
- **Cards de dias**: lista vertical limpa, cada card com `background: #2a2519`, `border: 1px solid #2f2920`, nome do dia bold + qt leituras + pills dos livros + check circle 40x40px
- **Remover**: botões "< >" de navegação, "DESMARCAR SEMANA", "Contexto da Leitura (IA)" de dentro dos cards, line-through nos livros lidos

**Aba Devocional — refazer:**
- Estado vazio: emoji 🕊️ centralizado 48px + mensagem
- **Ferramentas**: grid 2x1 de cards quadrados (aspect-square) com gradient background, emojis 32px, labels uppercase accent
- **Calendário e Arquivo**: manter mas ajustar espaçamentos
- Exegese e Gravar mantêm funcionalidade mas com visual atualizado

#### 4. Cores e tipografia
- Usar EXATAMENTE: background `#1a1610`, cards `#2a2519`, texto `#e8dcc8`, accent `#c4a46a`, muted `#7d6f5c`, success `#6a9c5a`
- Serif: Georgia para conteúdo; Sans: system-ui para UI/labels
- Sem tons esverdeados no background de cards
- Min 15px para corpo, 10-11px para labels com tracking 1.5-2px

---

### O que NÃO muda
- Lógica de dados, autenticação, edge functions, Supabase
- Abas Agenda (`WeekSchedule`), Notas (`BibleNotes`), Quiz (`Quiz`) — componentes separados, não afetados neste passo
- Design system base (variáveis CSS permanecem)

