import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import WeekSchedule from "@/components/WeekSchedule";
import BibleNotes from "@/components/BibleNotes";
import CodeLogin from "@/components/CodeLogin";
import RichTextEditor from "@/components/RichTextEditor";
import Library from "@/components/Library";
import Flashcards from "@/components/Flashcards";
import Quiz from "@/components/Quiz";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { haptic } from "@/hooks/useHaptic";
import { BookOpen, Flame, Calendar, PenLine, Trophy, Check, Sun, Moon } from "lucide-react";

// ── DATA ──────────────────────────────────────────────────────────────────────

const WEEKS = [
  {week:1,dates:"24/01 a 30/01",days:[{day:"Sábado",r:["Gn. 1–7","Jó 1–5"]},{day:"Domingo",r:["Gn. 8–13","Jó 6–11"]},{day:"Segunda",r:["Gn. 14–16","Jó 12–18"]},{day:"Terça",r:["Gn. 17–20","Jó 19–24"]},{day:"Quarta",r:["Gn. 21–25","Jó 25–30"]},{day:"Quinta",r:["Gn. 26–31","Jó 31–35"]},{day:"Sexta",r:["Gn. 32–37","Jó 36–42"]}]},
  {week:2,dates:"31/01 a 06/02",days:[{day:"Sábado",r:["Gn. 38–47"]},{day:"Domingo",r:["Gn. 48–50","Ex. 1–11"]},{day:"Segunda",r:["Ex. 12–21","Lv. 1–3"]},{day:"Terça",r:["Ex. 22–30","Lv. 4–6"]},{day:"Quarta",r:["Ex. 31–40","Lv. 7–10"]},{day:"Quinta",r:["Lv. 11–21","Nm. 1–5"]},{day:"Sexta",r:["Lv. 22–27","Nm. 6–10"]}]},
  {week:3,dates:"07/02 a 13/02",days:[{day:"Sábado",r:["Nm. 11–22","Sl. 90"]},{day:"Domingo",r:["Nm. 23–36"]},{day:"Segunda",r:["Dt. 1–14"]},{day:"Terça",r:["Dt. 15–24"]},{day:"Quarta",r:["Dt. 25–34","Sl. 91"]},{day:"Quinta",r:["Js. 1–11"]},{day:"Sexta",r:["Js. 12–21"]}]},
  {week:4,dates:"14/02 a 20/02",days:[{day:"Sábado",r:["Js. 22–24","Jz. 1–5"]},{day:"Domingo",r:["Jz. 6–12"]},{day:"Segunda",r:["Jz. 13–21"]},{day:"Terça",r:["Rt. 1–4","I Sm 1–7"]},{day:"Quarta",r:["I Sm 8–16","Sl. 7, 27, 31, 34, 52"]},{day:"Quinta",r:["I Sm 17–20","Sl. 11, 59"]},{day:"Sexta",r:["I Sm 21–24"]}]},
  {week:5,dates:"21/02 a 27/02",days:[{day:"Sábado",r:["I Sm. 25–27","Sl. 56, 120, 140–142","Sl. 17, 35, 54, 63"]},{day:"Domingo",r:["I Sm. 28–31","Sl. 121, 123–125"]},{day:"Segunda",r:["Sl. 128–130","II Sm. 1–4","Sl. 19, 21"]},{day:"Terça",r:["I Cr. 1–2","Sl. 6, 8–10, 14, 16"]},{day:"Quarta",r:["Sl. 43–45, 49","Sl. 84–85, 87"]},{day:"Quinta",r:["I Cr. 3–6","Sl. 73, 77–78","Sl. 102–104"]},{day:"Sexta",r:["Sl. 81, 88, 92–93","I Cr. 7–10"]}]},
  {week:6,dates:"28/02 a 06/03",days:[{day:"Sábado",r:["II Sm. 5","I Cr. 11–12","Sl. 106, 107, 133"]},{day:"Domingo",r:["I Cr. 13–16","Sl. 1, 2, 15, 22–24"]},{day:"Segunda",r:["Sl. 47, 68","Sl. 89, 96, 100–101","Sl. 105, 132"]},{day:"Terça",r:["II Sm. 6–9; I Cr. 17","Sl. 25, 29, 33, 36, 39"]},{day:"Quarta",r:["I Cr. 18–19","Sl. 20, 50, 53, 60, 75","II Sm. 10"]},{day:"Quinta",r:["I Cr. 20","Sl. 65–67, 69–70"]},{day:"Sexta",r:["II Sm. 11–18","Sl. 32, 51, 86, 122"]}]},
  {week:7,dates:"07/03 a 13/03",days:[{day:"Sábado",r:["Sl. 3–4, 12–13, 28, 55","Sl. 26, 40, 58, 61–62, 64"]},{day:"Domingo",r:["II Sm. 19–23","Sl. 5, 18, 38, 41, 42, 57"]},{day:"Segunda",r:["Sl. 30, 95, 97–99","II Sm. 24","I Cr. 21–22"]},{day:"Terça",r:["I Cr. 23–29","Sl. 108–110"]},{day:"Quarta",r:["Sl. 127, 131, 138–139","Sl. 143–145"]},{day:"Quinta",r:["Sl. 111–118","I Rs. 1–2","Sl. 119:1–80"]},{day:"Sexta",r:["I Rs. 3–4","Sl. 37, 71, 72, 94","Ct. 1–8"]}]},
  {week:8,dates:"14/03 a 20/03",days:[{day:"Sábado",r:["II Cr. 1–3","Sl. 119:81–176"]},{day:"Domingo",r:["Pv. 1–9"]},{day:"Segunda",r:["Pv. 10–18","II Cr. 4–7"]},{day:"Terça",r:["Pv. 19–24","I Rs. 5–6"]},{day:"Quarta",r:["Sl. 134, 136, 146–150","I Rs. 7–8","Pv. 25–31"]},{day:"Quinta",r:["I Rs. 9","II Cr. 8"]},{day:"Sexta",r:["Ec. 1–12"]}]},
  {week:9,dates:"21/03 a 27/03",days:[{day:"Sábado",r:["I Rs. 10–14","II Cr. 9–11","Sl. 82–83"]},{day:"Domingo",r:["I Rs. 15–16","II Cr. 12–19"]},{day:"Segunda",r:["I Rs. 17–22","II Cr. 20–23","Jonas 1–2"]},{day:"Terça",r:["Obadias","II Rs. 1–4","II Cr. 25–26"]},{day:"Quarta",r:["II Rs. 5–13","II Cr. 24"]},{day:"Quinta",r:["Jonas 3–4","II Rs. 14–15","II Cr. 25–26"]},{day:"Sexta",r:["Is. 1–8","Amós 1–3"]}]},
  {week:10,dates:"28/03 a 03/04",days:[{day:"Sábado",r:["Is. 9–12","Amós 4–9"]},{day:"Domingo",r:["Miqueias 1–7","II Cr. 27"]},{day:"Segunda",r:["II Cr. 28","Is. 13–22"]},{day:"Terça",r:["Is. 23–27","II Rs. 16–18"]},{day:"Quarta",r:["Os. 1–4","II Cr. 29–31"]},{day:"Quinta",r:["Os. 5–7","Sl. 48","Is. 28–34"]},{day:"Sexta",r:["Os. 8–14"]}]},
  {week:11,dates:"04/04 a 10/04",days:[{day:"Sábado",r:["Is. 35–41","Sl. 76"]},{day:"Domingo",r:["Is. 42–50","II Rs. 19"]},{day:"Segunda",r:["Sl. 46, 80, 135","Is. 51–56"]},{day:"Terça",r:["Is. 57–66"]},{day:"Quarta",r:["II Rs. 20–23","Naum 1–3","II Cr. 32–33"]},{day:"Quinta",r:["II Cr. 34–35","Sofonias 1–3","Jr. 1–5"]},{day:"Sexta",r:["Jr. 6–17"]}]},
  {week:12,dates:"11/04 a 17/04",days:[{day:"Sábado",r:["Jr. 18–28"]},{day:"Domingo",r:["Jr. 29–38"]},{day:"Segunda",r:["Jr. 39–45","Sl. 74, 79"]},{day:"Terça",r:["Habacuque 1–3","II Rs. 24–25","II Cr. 36"]},{day:"Quarta",r:["Jr. 46–52","Lm. 1–5"]},{day:"Quinta",r:["Ez. 1–12"]},{day:"Sexta",r:["Ez. 13–23"]}]},
  {week:13,dates:"18/04 a 24/04",days:[{day:"Sábado",r:["Ez. 24–33"]},{day:"Domingo",r:["Ez. 34–44"]},{day:"Segunda",r:["Ez. 45–48","Joel 1–3","Daniel 1–3"]},{day:"Terça",r:["Esdras 1–6","Sl. 137","Dn. 4–6"]},{day:"Quarta",r:["Dn. 7–12","Ageu 1–2","Zc. 1–2"]},{day:"Quinta",r:["Zc. 3–14"]},{day:"Sexta",r:["Ester 1–10"]}]},
  {week:14,dates:"25/04 a 01/05",days:[{day:"Sábado",r:["Esdras 7–10","Neemias 1–5"]},{day:"Domingo",r:["Neemias 6–13","Sl. 126"]},{day:"Segunda",r:["Mateus 1–3","Lucas 1–3","Malaquias 1–4"]},{day:"Terça",r:["Jo. 2–5","Lc. 4–5; Mc. 2","João 1; Marcos 1"]},{day:"Quarta",r:["Mt. 5–9","Lc. 6, 7, 11","Mt. 4; Mc. 3"]},{day:"Quinta",r:["Mt. 10–14","Lc. 8–9; Jo 6","Mc. 4–6"]},{day:"Sexta",r:["Mt. 15–18","Mc. 7–9","Jo. 7–8"]}]},
  {week:15,dates:"02/05 a 08/05",days:[{day:"Sábado",r:["Lc. 10, 12–17"]},{day:"Domingo",r:["João 9–12"]},{day:"Segunda",r:["Lc. 18–19","Mt. 19–21","Mc. 10–11"]},{day:"Terça",r:["Mt. 22–26","Mc. 12–14"]},{day:"Quarta",r:["Lc. 20","Jo. 13–16"]},{day:"Quinta",r:["Mt. 27","Jo. 17–19","Mc. 15"]},{day:"Sexta",r:["Mt. 28","Mc. 16","Lc. 21–24"]}]},
  {week:16,dates:"09/05 a 15/05",days:[{day:"Sábado",r:["Jo. 20–21","Atos 1–6"]},{day:"Domingo",r:["Atos 7–16"]},{day:"Segunda",r:["Tiago 1–5","I Ts. 1–5"]},{day:"Terça",r:["Gl. 1–6","I Co. 1–4"]},{day:"Quarta",r:["Atos 17–19"]},{day:"Quinta",r:["II Ts. 1–3"]},{day:"Sexta",r:["I Co. 5–14"]}]},
  {week:17,dates:"16/05 a 22/05",days:[{day:"Sábado",r:["I Co. 15–16","II Co. 1–6"]},{day:"Domingo",r:["II Co. 7–13","Rm. 1–3"]},{day:"Segunda",r:["Atos 20:1–3","Rm. 4–16"]},{day:"Terça",r:["Atos 20:4–38","Atos 21–23"]},{day:"Quarta",r:["Atos 24–28","Cl. 1–4","Filemom"]},{day:"Quinta",r:["Ef. 1–6","Tito 1–3"]},{day:"Sexta",r:["Fp. 1–4","I Tm. 1–6"]}]},
  {week:18,dates:"23/05 a 29/05",days:[{day:"Sábado",r:["I Pe. 1–5","Hb. 1–6"]},{day:"Domingo",r:["Hb. 7–13","II Pe 1–3"]},{day:"Segunda",r:["Judas","I João 1–5"]},{day:"Terça",r:["II Tm. 1–4","II e III João"]},{day:"Quarta",r:["Ap. 1–11"]},{day:"Quinta",r:["Ap. 12–22"]},{day:"Sexta",r:[]}]},
];

// April devotional calendar data
const APRIL_CALENDAR: { [day: number]: string } = {
  // Semana 1: 06/04 - 10/04 (Pneumatologia — O Espírito Santo)
  7: "2 Coríntios 3:17",
  8: "Atos 2:3-4",
  9: "João 14:16",
  10: "João 14:26",
  11: "João 15:26",
  // Semana 2: 13/04 - 17/04 (Cristologia — A Pessoa de Cristo)
  14: "Colossenses 2:9",
  15: "João 1:14",
  16: "Lucas 24:6",
  17: "Apocalipse 19:16",
  18: "Filipenses 2:10-11",
  // Semana 3: 20/04 - 24/04 (Soteriologia — A Obra da Salvação)
  21: "Efésios 1:9-10",
  22: "Hebreus 10:19-23",
  23: "João 17:3",
  24: "1 Pedro 2:9",
  25: "1 Coríntios 13:4",
  // Semana 4: 27/04 - 01/05 (O Coração Segundo Deus — Vida de Davi)
  28: "1 Samuel 16:7",
  29: "1 Samuel 17:45",
  30: "Salmos 51:10",
};

const APRIL_THEMES: { week: string; theme: string; color: string }[] = [
  { week: "06–10", theme: "O Espírito Santo", color: "hsl(var(--fire))" },
  { week: "13–17", theme: "A Pessoa de Cristo", color: "hsl(var(--primary))" },
  { week: "20–24", theme: "A Obra da Salvação", color: "#6B8A5E" },
  { week: "27–01", theme: "Vida de Davi", color: "#7A6B8A" },
];

const DEVOTIONALS = [
  {
    period: "02/03 a 06/03",
    days: [
      { day: "Segunda", ref: "Hebreus 7:24", verseText: "Mas este, porque permanece eternamente, tem um sacerdócio perpétuo.", summary: "Jesus possui um sacerdócio eterno e imutável — ele sempre vive para interceder por nós.", exegese: "**\"Permanece\"** (gr. *ménō*) — indica permanência contínua, duradoura. **\"Para sempre\"** (gr. *eis ton aiōna*) — literalmente \"para a eternidade\", sem fim. **\"Imutável\"** (gr. *aparábatos*) — intransferível, que não passa a outro; o sacerdócio de Cristo não tem sucessor. **\"Sacerdócio\"** (gr. *hierōsynē*) — ofício sacerdotal; diferente de *hiereús* (sacerdote como pessoa). O autor de Hebreus contrasta o sacerdócio levítico temporário com o sacerdócio eterno de Cristo segundo a ordem de Melquisedeque." },
      { day: "Terça",   ref: "Salmos 40:6",  verseText: "Sacrifício e oferta não quiseste; os meus ouvidos abriste; holocausto e expiação pelo pecado não reclamaste.", summary: "Deus não deseja apenas rituais, mas ouvidos atentos e corações dispostos a obedecer.", exegese: "**\"Sacrifício\"** (heb. *zébach*) — sacrifício de animal, oferenda ritual. **\"Oferta\"** (heb. *minchá*) — presente ou oblação, geralmente de cereais. **\"Não quiseste\"** (heb. *lo chafátsta*) — não te agradaste, não tiveste prazer. **\"Abriste os meus ouvidos\"** (heb. *oznáyim karíta li*) — literalmente \"cavaste ouvidos para mim\", metáfora de obediência receptiva. A LXX traduz como \"corpo preparaste para mim\", citado em Hb 10:5. O verso marca a transição de ritual externo para obediência interna." },
      { day: "Quarta",  ref: "Romanos 1:26", verseText: "Por isso Deus os entregou a paixões infames. Porque até as suas mulheres mudaram o uso natural, no contrário à natureza.", summary: "Reflexão sobre as consequências de abandonar a verdade de Deus e seguir desejos próprios.", exegese: "**\"Entregou\"** (gr. *parédōken*) — Deus permitiu, deixou seguir; não forçou, mas retirou a contenção. **\"Paixões infames\"** (gr. *páthē atimías*) — desejos desonrosos; *páthos* indica paixão passiva que domina a pessoa. **\"Natural\"** (gr. *physikḗn*) — conforme a natureza criada por Deus. **\"Contra a natureza\"** (gr. *pará phýsin*) — além ou contra o propósito original. Paulo descreve uma sequência: rejeição de Deus → idolatria → entrega às consequências morais. O contexto é a degradação progressiva quando se troca a verdade pela mentira." },
      { day: "Quinta",  ref: "Filipenses 3:8", verseText: "E, na verdade, tenho também por perda todas as coisas, pela excelência do conhecimento de Cristo Jesus, meu Senhor; pelo qual sofri a perda de todas estas coisas, e as considero como esterco, para que possa ganhar a Cristo.", summary: "Paulo considera tudo perda diante da grandeza de conhecer a Cristo — o maior tesouro.", exegese: "**\"Considero\"** (gr. *hēgéomai*) — avaliar, calcular racionalmente; decisão deliberada. **\"Perda\"** (gr. *zēmían*) — dano, prejuízo financeiro; termo comercial. **\"Excelência\"** (gr. *hyperéchon*) — superioridade que ultrapassa; algo incomparavelmente melhor. **\"Conhecimento\"** (gr. *gnṓseōs*) — conhecimento experiencial e relacional, não apenas intelectual. **\"Esterco\"** (gr. *skýbala*) — lixo, refugo, restos jogados fora; termo forte e até vulgar na época. Paulo usa linguagem contábil: lucros antigos reavaliados como perdas diante do ganho supremo de Cristo." },
      { day: "Sexta",   ref: "2 Samuel 24:24", verseText: "Porém o rei disse a Araúna: Não, mas por preço to comprarei, porque não oferecerei ao Senhor meu Deus holocaustos que não me custem nada. Assim Davi comprou a eira e os bois por cinquenta siclos de prata.", summary: "Davi se recusa a oferecer a Deus algo que não lhe custou nada. Verdadeira adoração tem preço.", exegese: "**\"Comprarei\"** (heb. *qanó eqné*) — adquirir por preço justo; repetição enfática do verbo. **\"Por preço\"** (heb. *bimchír*) — por valor, por pagamento; não de graça. **\"Holocaustos\"** (heb. *olót*) — sacrifícios totalmente queimados; representa entrega completa a Deus. **\"De graça\"** (heb. *chinám*) — sem custo, gratuitamente. Davi recusa o presente de Araúna porque entende que oferta sem sacrifício pessoal não honra a Deus. Princípio: adoração verdadeira exige investimento pessoal." },
    ],
  },
  {
    period: "09/03 a 13/03",
    days: [
      { day: "Segunda", ref: "2 Timóteo 2:1",  verseText: "Tu, pois, meu filho, fortifica-te na graça que há em Cristo Jesus.", summary: "Paulo exorta Timóteo a ser fortalecido pela graça que está em Cristo, não por forças próprias.", exegese: "**\"Fortifica-te\"** (gr. *endynamoú*) — imperativo passivo; \"sê fortalecido\" por uma fonte externa. **\"Na graça\"** (gr. *en tē cháriti*) — na esfera da graça; o poder vem da graça, não do esforço. **\"Filho meu\"** (gr. *téknon mou*) — \"minha criança\", tom paternal e afetuoso. Paulo usa o passivo para indicar que a força é recebida de Cristo, não gerada internamente. A graça aqui não é apenas favor, mas poder capacitador." },
      { day: "Terça",   ref: "Hebreus 7:25",   verseText: "Portanto, pode também salvar perfeitamente os que por ele se chegam a Deus, vivendo sempre para interceder por eles.", summary: "Cristo é capaz de salvar completamente todos que se aproximam de Deus por meio dele, pois intercede por nós.", exegese: "**\"Completamente\"** (gr. *eis to pantelés*) — até o fim, totalmente, para sempre; abrange extensão e duração. **\"Salvar\"** (gr. *sṓzein*) — livrar, resgatar, curar; salvação integral. **\"Aproximam-se\"** (gr. *proserchómenous*) — presente contínuo; os que continuamente vêm a Deus. **\"Interceder\"** (gr. *entynchánein*) — intervir a favor de alguém; comparecer perante outro em benefício de terceiro. Cristo não apenas salva no passado — continua intercedendo ativamente." },
      { day: "Quarta",  ref: "Romanos 8:26",   verseText: "E da mesma maneira também o Espírito ajuda as nossas fraquezas; porque não sabemos o que havemos de pedir como convém, mas o mesmo Espírito intercede por nós com gemidos inexprimíveis.", summary: "O Espírito Santo nos ajuda em nossa fraqueza, intercedendo por nós com gemidos inexprimíveis.", exegese: "**\"Ajuda\"** (gr. *synantilambánetai*) — tomar a carga junto; palavra composta: *syn* (junto) + *anti* (em lugar de) + *lambánō* (pegar). **\"Fraqueza\"** (gr. *astheneía*) — debilidade, limitação humana. **\"Gemidos\"** (gr. *stenagmoís*) — suspiros profundos, não articulados. **\"Inexprimíveis\"** (gr. *alalḗtois*) — que não podem ser expressas em palavras humanas. O Espírito não apenas ora por nós, mas carrega a carga conosco, traduzindo nossa dor em linguagem que Deus compreende." },
      { day: "Quinta",  ref: "Ezequiel 22:30", verseText: "E busquei dentre eles um homem que estivesse tapando o muro, e estivesse na brecha perante mim por esta terra, para que eu não a destruísse; mas a ninguém achei.", summary: "Deus busca alguém que se coloque na brecha — um intercessor que ore pelo povo e pela terra.", exegese: "**\"Busquei\"** (heb. *avaqésh*) — procurar ativamente, investigar. **\"Brecha\"** (heb. *pérets*) — abertura no muro; metáfora de vulnerabilidade espiritual/moral. **\"Tapasse\"** (heb. *godér*) — reparar, construir um muro; restaurar a proteção. **\"Diante de mim\"** (heb. *lefanái*) — na minha presença; posição de intercessão. **\"Não achei\"** (heb. *veló matsáti*) — resultado trágico; ninguém respondeu ao chamado. O texto revela o coração de Deus: antes de julgar, ele procura intercessores." },
      { day: "Sexta",   ref: "Tiago 5:16",     verseText: "Confessai as vossas culpas uns aos outros, e orai uns pelos outros, para que sareis. A oração feita por um justo pode muito em seus efeitos.", summary: "A oração fervorosa do justo tem grande poder — confessem uns aos outros e orem uns pelos outros.", exegese: "**\"Confessai\"** (gr. *exomologeísthe*) — declarar abertamente, reconhecer mutuamente. **\"Fervorosa\"** (gr. *energouménē*) — eficaz, operante; de *energéō* (operar com energia). **\"Justo\"** (gr. *dikaíou*) — aquele em relação correta com Deus. **\"Muito pode\"** (gr. *polỳ ischýei*) — tem muita força, é poderosa. Tiago conecta transparência relacional (confissão mútua) com eficácia na oração. A oração não é mágica — é poderosa quando vem de uma vida alinhada com Deus." },
    ],
  },
  {
    period: "16/03 a 20/03",
    days: [
      { day: "Segunda", ref: "Mateus 5:3",  verseText: "Bem-aventurados os pobres de espírito, porque deles é o reino dos céus.", summary: "\"Bem-aventurados os pobres de espírito.\" O Reino começa com o reconhecimento da nossa necessidade de Deus.", exegese: "**\"Bem-aventurados\"** (gr. *makárioi*) — felizes, abençoados; estado de plenitude divina, não apenas emoção. **\"Pobres\"** (gr. *ptōchoí*) — indigentes, mendigos; pobreza total, não parcial. **\"De espírito\"** (gr. *tō pneúmati*) — no espírito; reconhecimento interior de vazio diante de Deus. **\"Reino dos céus\"** (gr. *basileía tōn ouranōn*) — governo de Deus; expressão judaica para evitar usar o nome divino. Jesus inverte a lógica: o vazio espiritual reconhecido é pré-requisito para receber a plenitude do Reino." },
      { day: "Terça",   ref: "Mateus 5:14", verseText: "Vós sois a luz do mundo; não se pode esconder uma cidade edificada sobre um monte.", summary: "\"Vós sois a luz do mundo.\" Somos chamados a iluminar o ambiente ao nosso redor com a vida de Cristo.", exegese: "**\"Luz\"** (gr. *phōs*) — luminosidade, claridade; no AT, atributo de Deus (Sl 27:1). **\"Do mundo\"** (gr. *toú kósmou*) — do sistema humano organizado; abrange toda a sociedade. **\"Cidade\"** (gr. *pólis*) — cidade elevada, visível de longe; impossível de esconder. **\"Monte\"** (gr. *órous*) — elevação; posição de destaque. Jesus não diz \"sejam luz\" mas \"vós *sois* luz\" — é identidade, não apenas comportamento. A luz não pode ser escondida sem negar sua própria natureza." },
      { day: "Quarta",  ref: "Mateus 6:6",  verseText: "Mas tu, quando orares, entra no teu aposento e, fechando a tua porta, ora a teu Pai que está em secreto; e teu Pai, que vê em secreto, te recompensará publicamente.", summary: "Orar em segredo, no quarto fechado, para o Pai que vê o que está escondido — intimidade genuína.", exegese: "**\"Quarto\"** (gr. *tameíon*) — despensa, cômodo interior; lugar mais privado da casa. **\"Fechando a porta\"** (gr. *kleísas tēn thýran*) — ação deliberada de isolar-se; separar-se das distrações. **\"Em secreto\"** (gr. *en tō kryptō*) — no escondido, no íntimo. **\"Vê\"** (gr. *blépōn*) — observar com atenção; Deus contempla o que é invisível aos outros. **\"Recompensará\"** (gr. *apodṓsei*) — retribuirá, dará de volta. Jesus contrasta oração performática (para ser visto) com oração relacional (para estar com o Pai)." },
      { day: "Quinta",  ref: "Mateus 6:33", verseText: "Mas buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.", summary: "\"Buscai primeiro o Reino de Deus.\" Quando priorizamos a Deus, tudo mais se ordena.", exegese: "**\"Buscai\"** (gr. *zēteíte*) — procurai continuamente; imperativo presente indica busca habitual. **\"Primeiro\"** (gr. *prōton*) — antes de tudo, como prioridade máxima. **\"Reino\"** (gr. *basileían*) — reinado, governo; não território, mas autoridade de Deus sobre a vida. **\"Justiça\"** (gr. *dikaiosýnēn*) — retidão, vida alinhada com o caráter de Deus. **\"Acrescentadas\"** (gr. *prostethḗsetai*) — serão adicionadas por cima; Deus supre como consequência natural da prioridade correta." },
      { day: "Sexta",   ref: "Mateus 7:24", verseText: "Todo aquele, pois, que escuta estas minhas palavras, e as pratica, assemelhá-lo-ei ao homem prudente, que edificou a sua casa sobre a rocha.", summary: "O sábio constrói sobre a rocha — ouvir e praticar a Palavra nos dá fundamento inabalável.", exegese: "**\"Prudente\"** (gr. *phrónimos*) — sensato, sábio na prática; sabedoria aplicada, não teórica. **\"Rocha\"** (gr. *pétran*) — rocha firme, leito rochoso; fundamento inabalável. **\"Ouve e pratica\"** (gr. *akoúei kaì poieí*) — ouvir E fazer; os dois verbos são inseparáveis. **\"Edificou\"** (gr. *ōkodómēsen*) — construiu; verbo no aoristo indica decisão definitiva. **\"Chuva, rios, ventos\"** — tríade de provações: do alto, de baixo e de lado. Jesus conclui o Sermão do Monte: o critério não é ouvir, mas obedecer." },
    ],
  },
  {
    period: "23/03 a 27/03",
    days: [
      { day: "Segunda", ref: "Cantares 2:16", verseText: "O meu amado é meu, e eu sou dele; ele pastoreia entre os lírios.", summary: "\"O meu amado é meu e eu sou dele.\" A entrega mútua e o pertencimento no amor de Deus.", exegese: "**\"Amado\"** (heb. *dodí*) — amado íntimo, querido; de *dod*, amor profundo e apaixonado. **\"Meu\"** (heb. *li*) — pertence a mim; posse relacional, não material. **\"Eu sou dele\"** (heb. *va'aní ló*) — e eu para ele; reciprocidade total. **\"Pastoreia entre os lírios\"** (heb. *haroé bashoshaním*) — alimentar-se em beleza e pureza. A fórmula de pertencimento mútuo é o coração de Cantares: um amor que não domina, mas se entrega. Na tradição judaica, este verso expressa a aliança entre Deus e Israel." },
      { day: "Terça",   ref: "Cantares 4:7",  verseText: "Tu és toda formosa, amiga minha, e em ti não há defeito.", summary: "\"Toda bela és, amada minha, e nenhum defeito há em ti.\" O olhar de Deus sobre sua amada — puro e sem condenação.", exegese: "**\"Toda bela\"** (heb. *kulách yafá*) — inteiramente formosa; *kol* (totalidade) + *yafá* (bela). **\"Amiga minha\"** (heb. *ra'yatí*) — minha companheira, amiga íntima; de *ra'á* (pastorear junto). **\"Defeito\"** (heb. *mum*) — mancha, imperfeição; termo usado para animais sacrificiais sem mácula. **\"Em ti\"** (heb. *bách*) — dentro de ti; a beleza é interior e exterior. O amado vê perfeição onde o mundo veria falha. Teologicamente: como Deus vê seu povo lavado pela graça — sem condenação (Rm 8:1)." },
      { day: "Quarta",  ref: "Cantares 4:9",  verseText: "Já me roubaste o coração, minha irmã, minha noiva; já me roubaste o coração com um dos teus olhares, com um colar do teu pescoço.", summary: "\"Roubaste o meu coração.\" A intimidade com Deus como um amor que nos transforma profundamente.", exegese: "**\"Roubaste\"** (heb. *libavtíni*) — arrebataste, cativaste o coração; verbo raro, usado apenas aqui e no verso seguinte. **\"Coração\"** (heb. *lev*) — centro do ser, vontade e afeto; mais que emoção, é a essência da pessoa. **\"Irmã minha\"** (heb. *achotí*) — expressão de intimidade familiar, não apenas romântica. **\"Noiva\"** (heb. *kalá*) — prometida, noiva; relação de aliança. **\"Um só olhar\"** — bastou uma conexão para capturar todo o ser. A duplicidade irmã-noiva une amor fraterno (segurança) com amor esponsal (paixão)." },
      { day: "Quinta",  ref: "Cantares 8:6",  verseText: "Põe-me como selo sobre o teu coração, como selo sobre o teu braço, porque o amor é forte como a morte, e duro como a sepultura o ciúme; as suas brasas são brasas de fogo, labaredas do Senhor.", summary: "\"Forte como a morte é o amor.\" O amor de Deus é intenso, ardente e inabalável.", exegese: "**\"Selo\"** (heb. *chotám*) — sinete de identidade; marca de pertencimento e autoridade. **\"Coração\"** (heb. *lev*) — centro da vontade. **\"Braço\"** (heb. *zeró'a*) — força, ação; o amor marca tanto o interior (coração) quanto o exterior (braço). **\"Forte como a morte\"** (heb. *azá kamávet*) — irresistível, invencível; a morte não pode ser detida, assim é o amor. **\"Ciúme\"** (heb. *qin'á*) — zelo ardente, não inveja; paixão exclusiva. **\"Duro como o Sheol\"** — tão implacável quanto o mundo dos mortos. **\"Chamas de Deus\"** (heb. *shalhevetyáh*) — fogo divino; o sufixo *-yah* é abreviação de YHWH. O amor humano participa do fogo do próprio Deus." },
      { day: "Sexta",   ref: "Cantares 8:7",  verseText: "As muitas águas não podem apagar este amor, nem os rios afogá-lo; ainda que alguém desse todos os bens da sua casa pelo amor, de todo seria desprezado.", summary: "\"Nem muitas águas podem apagar o amor.\" Nada tem poder para separar-nos do amor de Deus.", exegese: "**\"Muitas águas\"** (heb. *máyim rabbím*) — símbolo de caos e destruição no AT (Sl 93:4); forças do mal. **\"Apagar\"** (heb. *lechabót*) — extinguir, sufocar; o amor é fogo que resiste à água. **\"Rios\"** (heb. *neharót*) — correntes poderosas; forças avassaladoras da vida. **\"Arrastá-lo\"** (heb. *tishtefénnu*) — levá-lo pela correnteza. **\"Toda a riqueza\"** (heb. *kol hón*) — toda a fortuna; o amor não pode ser comprado. **\"Seria desprezado\"** (heb. *boz yavúzu ló*) — seria completamente rejeitado; redução ao ridículo. Este verso é o clímax de Cantares: o amor verdadeiro transcende catástrofe, poder e dinheiro. Eco em Romanos 8:38-39." },
    ],
  },
  {
    period: "30/03 a 03/04",
    days: [
      { day: "Segunda", ref: "Êxodo 34:6-7",    verseText: "Passando, pois, o Senhor perante a sua face, clamou: O Senhor, o Senhor Deus, misericordioso e piedoso, tardio em iras e grande em beneficência e verdade; que guarda a beneficência em milhares; que perdoa a iniquidade, e a transgressão e o pecado; que ao culpado não tem por inocente.", summary: "Deus proclama seu próprio nome: compassivo, misericordioso, paciente, cheio de amor e fidelidade.", exegese: "**\"Compassivo\"** (heb. *rachúm*) — de *réchem* (útero); compaixão maternal, ternura visceral. **\"Misericordioso\"** (heb. *channún*) — gracioso, favorável; inclinar-se para abençoar. **\"Longânimo\"** (heb. *érekh appáyim*) — literalmente \"longo de narinas\"; demora em ficar irado. **\"Bondade\"** (heb. *chésed*) — amor leal de aliança; fidelidade que não depende do outro. **\"Fidelidade\"** (heb. *emét*) — verdade, firmeza; solidez inabalável. Esta é a auto-revelação mais completa de Deus no AT, repetida em pelo menos 10 outros textos. É o \"credo\" de Israel." },
      { day: "Terça",   ref: "Salmo 145:8-9",   verseText: "O Senhor é misericordioso e compassivo; longânimo e grande em benignidade. O Senhor é bom para todos, e as suas misericórdias são sobre todas as suas obras.", summary: "O Senhor é cheio de graça e compaixão, lento para a ira e grande em amor para com todos.", exegese: "**\"Compassivo\"** (heb. *rachúm*) — mesma raiz de Êx 34:6; ternura materna. **\"Longânimo\"** (heb. *érekh appáyim*) — paciente, vagaroso em se irar. **\"Grande em amor\"** (heb. *gedol chésed*) — abundante em amor leal. **\"Bom para todos\"** (heb. *tov YHWH lakól*) — bondade universal, não restrita a Israel. **\"Compaixões sobre todas as obras\"** (heb. *verachamáv al kol ma'asáv*) — misericórdia que abrange toda a criação. Este Salmo é acróstico (cada verso com uma letra do alfabeto hebraico), representando a totalidade do louvor." },
      { day: "Quarta",  ref: "Isaías 40:28",    verseText: "Não sabes, não ouviste que o eterno Deus, o Senhor, o Criador dos fins da terra, nem se cansa nem se fatiga? É inescrutável o seu entendimento.", summary: "O Eterno não se cansa nem se fatiga — sua sabedoria é insondável e sua força renova os cansados.", exegese: "**\"Eterno\"** (heb. *Elohé olám*) — Deus da eternidade; sem início nem fim. **\"Criador\"** (heb. *boré*) — aquele que cria do nada (*bara'*); verbo exclusivo de Deus. **\"Não se cansa\"** (heb. *lo yiáf*) — não desfalecer; incansável. **\"Não se fatiga\"** (heb. *lo yigá*) — não se esgotar. **\"Insondável\"** (heb. *en chéqer*) — sem investigação possível; imensurável. Isaías consola exilados: o Deus que criou o cosmos não está exausto — ele renova os que nele esperam." },
      { day: "Quinta",  ref: "1 João 4:8",      verseText: "Aquele que não ama não conhece a Deus; porque Deus é amor.", summary: "\"Deus é amor.\" Não apenas que Deus ama, mas que a própria essência dele é amor.", exegese: "**\"Deus\"** (gr. *ho Theós*) — com artigo definido; o Deus único e verdadeiro. **\"É\"** (gr. *estín*) — é por natureza; declaração ontológica, não apenas funcional. **\"Amor\"** (gr. *agápē*) — amor incondicional, sacrificial; escolha deliberada de buscar o bem do outro. João não diz \"Deus tem amor\" ou \"Deus demonstra amor\", mas \"Deus *é* amor\" — amor define sua essência. A mesma frase aparece em 4:16. Consequência: quem não ama não conhece a Deus, pois está desconectado de sua natureza." },
      { day: "Sexta",   ref: "Romanos 11:33",   verseText: "Ó profundidade das riquezas, tanto da sabedoria, como da ciência de Deus! Quão insondáveis são os seus juízos, e quão inescrutáveis os seus caminhos!", summary: "\"Ó profundidade das riquezas...\" Uma doxologia diante da grandeza incomensurável de Deus.", exegese: "**\"Profundidade\"** (gr. *báthos*) — abismo, dimensão insondável. **\"Riquezas\"** (gr. *ploútou*) — abundância, tesouro; riqueza espiritual de Deus. **\"Sabedoria\"** (gr. *sophías*) — plano eterno, desígnio perfeito. **\"Conhecimento\"** (gr. *gnṓseōs*) — discernimento dos mistérios divinos. **\"Insondáveis\"** (gr. *anexeraúnēta*) — impossível de rastrear, investigar até o fim. **\"Inescrutáveis\"** (gr. *anexichníastoi*) — impossível de seguir os rastros. Paulo encerra os capítulos 9-11 (eleição e misericórdia) com uma explosão de adoração — quando a teologia atinge seu limite, sobra apenas louvor." },
    ],
  },
];

// Guide questions removed — replaced by exegesis study field

const COLORS = ["#C8553D","#E88D67","#D4A574","#B8860B","#6B8E6B","#4A7C8C","#6B5B8A"];
const ABBREVS = ["Sáb","Dom","Seg","Ter","Qua","Qui","Sex"];
const DAY_NAMES = ["Sábado","Domingo","Segunda","Terça","Quarta","Quinta","Sexta"];
const STORAGE_KEY = "bible-plan-2026";
const DEV_DAY_COLORS: Record<string, string> = {
  "Segunda": "#4A7C8C",
  "Terça":   "#6B5B8A",
  "Quarta":  "#C8553D",
  "Quinta":  "#B8860B",
  "Sexta":   "#6B8E6B",
};

// Map JS getDay() (0=Sun) to our day index (0=Sat)
const JS_DAY_TO_INDEX: Record<number, number> = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };

function getTodayReading(checked: Record<string, boolean>) {
  const now = new Date();
  // Plan start: Saturday Jan 24, 2026
  const planStart = new Date(2026, 0, 24); // month is 0-indexed
  const diffMs = now.getTime() - planStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0 || diffDays >= 18 * 7) return null;
  const weekIdx = Math.floor(diffDays / 7);
  const dayIdx = diffDays % 7;
  const week = WEEKS[weekIdx];
  if (!week) return null;
  const day = week.days[dayIdx];
  if (!day || !day.r.length) return null;
  const isDone = !!checked[`${weekIdx}-${dayIdx}`];
  return { weekIdx, dayIdx, week, day, isDone };
}

// ── Dashboard helper components ───────────────────────────────────────────────

function DashSection({ title, subtitle, description, children }: {
  title: string; subtitle: string; description: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
        color: "#7a6230", fontWeight: 600, marginBottom: 4,
      }}>
        {title}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#e8d8b8", marginBottom: 2 }}>{subtitle}</div>
      {description && (
        <div style={{ fontSize: 12, color: "#6a5a48", marginBottom: 14, lineHeight: 1.5 }}>{description}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function DashCard({ icon, title, subtitle, onClick, accent }: {
  icon: string; title: string; subtitle: string; onClick: () => void; accent: string;
}) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "16px 16px", borderRadius: 14, cursor: "pointer",
      background: "rgba(255,255,255,.025)",
      border: "1px solid rgba(200,180,140,.08)",
      transition: "all .2s", position: "relative", overflow: "hidden",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = accent + "40"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.025)"; e.currentTarget.style.borderColor = "rgba(200,180,140,.08)"; }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,${accent},transparent)`, opacity: 0.4,
      }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: accent + "15", border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d8b8" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "#7a6a58", marginTop: 2 }}>{subtitle}</div>}
      </div>
      <span style={{ fontSize: 18, color: "#5a4a38", flexShrink: 0 }}>›</span>
    </div>
  );
}

// ── Theme ─────────────────────────────────────────────────────────────────────
const THEME_KEY = "theme_preference";

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function BiblePlan() {
  // ── Auth state ──
  const [userCodeId, setUserCodeId] = useState<string | null>(() => {
    try { return localStorage.getItem("bible-user-code-id"); } catch { return null; }
  });
  const [accessCode, setAccessCode] = useState<string | null>(() => {
    try { return localStorage.getItem("bible-access-code"); } catch { return null; }
  });

  const handleLogin = useCallback((id: string, code: string) => {
    setUserCodeId(id);
    setAccessCode(code);
    try {
      localStorage.setItem("bible-user-code-id", id);
      localStorage.setItem("bible-access-code", code);
    } catch {}
  }, []);

  const handleLogout = useCallback(() => {
    setUserCodeId(null);
    setAccessCode(null);
    try {
      localStorage.removeItem("bible-user-code-id");
      localStorage.removeItem("bible-access-code");
    } catch {}
  }, []);

  // Show login if not authenticated
  if (!userCodeId) {
    return <CodeLogin onLogin={handleLogin} />;
  }

  return <BiblePlanApp userCodeId={userCodeId} accessCode={accessCode} onLogout={handleLogout} />;
}

function BiblePlanApp({ userCodeId, accessCode, onLogout }: { userCodeId: string; accessCode: string | null; onLogout: () => void }) {
  const [tab, setTab] = useState<"home" | "leitura" | "devocional" | "agenda" | "anotacoes" | "biblioteca" | "quiz">("leitura");
  const [activeWeek, setActiveWeek] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [expandedDev, setExpandedDev] = useState<string | null>(null);
  // Exegesis study
  const [exegeseVerse, setExegeseVerse] = useState("");
  const [exegeseLoading, setExegeseLoading] = useState(false);
  const [exegeseResult, setExegeseResult] = useState<{ verse: string; content: string } | null>(null);
  const [exegeseError, setExegeseError] = useState("");

  const [musicPlaying, setMusicPlaying] = useState(false);
  // Devocional audio recording
  const [devRecording, setDevRecording] = useState(false);
  const [devTranscript, setDevTranscript] = useState("");
  const devRecognitionRef = useRef<any>(null);
  const devTranscriptRef = useRef("");
  const [notesTitle, setNotesTitle] = useState("📝 Anotações");
  // Bible version for devotionals
  const [devBibleVersion, setDevBibleVersion] = useState("almeida");
  const [devVerseOverrides, setDevVerseOverrides] = useState<Record<string, string>>({});
  const [devVerseLoading, setDevVerseLoading] = useState<string | null>(null);
  // Reading context AI
  const [readingContext, setReadingContext] = useState<Record<string, string>>({});
  const [contextLoading, setContextLoading] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try { return (localStorage.getItem(THEME_KEY) as "light" | "dark") || "dark"; } catch { return "dark"; }
  });
  const [titleFading, setTitleFading] = useState(false);
  const [displayTitle, setDisplayTitle] = useState("Estudo Tudo Em Um");
  const playerRef = useRef<HTMLIFrameElement>(null);

  // Apply theme to html element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  // Animate title changes
  const prevTab = useRef(tab);
  const prevNotesTitle = useRef(notesTitle);
  useEffect(() => {
    const newTitle = tab === "home" ? "Estudo Tudo Em Um"
      : tab === "leitura" ? "📖 Plano de Leitura"
      : tab === "devocional" ? "🔥 Devocionais"
      : tab === "agenda" ? "📅 Agenda"
      : tab === "quiz" ? "🏆 Quiz"
      : notesTitle;
    if (newTitle !== displayTitle) {
      setTitleFading(true);
      setTimeout(() => {
        setDisplayTitle(newTitle);
        setTitleFading(false);
      }, 280);
    }
    prevTab.current = tab;
    prevNotesTitle.current = notesTitle;
  }, [tab, notesTitle]);

  useEffect(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); if (d) setChecked(JSON.parse(d)); } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  const toggle = useCallback((wi: number, di: number) => {
    setChecked(prev => ({ ...prev, [`${wi}-${di}`]: !prev[`${wi}-${di}`] }));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }, []);

  const fetchReadingContext = useCallback(async (wi: number, di: number, readings: string[]) => {
    const key = `${wi}-${di}`;
    if (readingContext[key] || contextLoading === key) return;
    setContextLoading(key);
    try {
      const { data, error } = await supabase.functions.invoke("reading-context", {
        body: { readings },
      });
      if (error || data?.error) {
        console.error("Context error:", data?.error || error);
      } else if (data?.result) {
        setReadingContext(prev => ({ ...prev, [key]: data.result }));
      }
    } catch (e) {
      console.error("Context fetch error:", e);
    }
    setContextLoading(null);
  }, [readingContext, contextLoading]);

  const weekProg = useCallback((wi: number) => {
    let t = 0, d = 0;
    WEEKS[wi].days.forEach((day, di) => { if (day.r.length) { t++; if (checked[`${wi}-${di}`]) d++; } });
    return t ? d / t : 0;
  }, [checked]);

  const totalProg = useCallback(() => {
    let t = 0, d = 0;
    WEEKS.forEach((w, wi) => w.days.forEach((day, di) => { if (day.r.length) { t++; if (checked[`${wi}-${di}`]) d++; } }));
    return t ? d / t : 0;
  }, [checked]);

  const prog = totalProg();
  const wp = weekProg(activeWeek);
  const cw = WEEKS[activeWeek];
  const circ = 2 * Math.PI * 22;
  const todayReading = getTodayReading(checked);

  const toggleMusic = useCallback(() => {
    const iframe = playerRef.current;
    if (!iframe) return;
    if (musicPlaying) {
      iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    } else {
      iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
    setMusicPlaying(!musicPlaying);
  }, [musicPlaying]);

  // ── Bible version fetch for devotionals ────────────────────────────────────
  const BIBLE_VERSIONS = [
    { key: "almeida", label: "Almeida (ARA)" },
    { key: "nvi", label: "NVI" },
    { key: "acf", label: "ACF" },
    { key: "kjv", label: "KJV (Inglês)" },
    { key: "bbe", label: "BBE (Inglês)" },
  ];

  const fetchDevVerse = useCallback(async (ref: string, version: string) => {
    const cacheKey = `${ref}__${version}`;
    if (devVerseOverrides[cacheKey]) return;
    if (version === "almeida") {
      // Remove override to show original
      setDevVerseOverrides(prev => {
        const next = { ...prev };
        delete next[cacheKey];
        return next;
      });
      return;
    }
    setDevVerseLoading(cacheKey);
    try {
      const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${version}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setDevVerseOverrides(prev => ({ ...prev, [cacheKey]: data.text.trim() }));
        }
      }
    } catch {}
    setDevVerseLoading(null);
  }, [devVerseOverrides]);

  // ── Exegesis AI call ──────────────────────────────────────────────────────
  const handleExegese = useCallback(async () => {
    if (!exegeseVerse.trim()) return;
    setExegeseLoading(true);
    setExegeseError("");
    setExegeseResult(null);

    // First fetch the verse text
    try {
      const verseRes = await fetch(`https://bible-api.com/${encodeURIComponent(exegeseVerse.trim())}?translation=almeida`);
      if (!verseRes.ok) {
        setExegeseError("Versículo não encontrado. Verifique a referência.");
        setExegeseLoading(false);
        return;
      }
      const verseData = await verseRes.json();
      const verseText = verseData.text?.trim();
      if (!verseText) {
        setExegeseError("Texto do versículo não encontrado.");
        setExegeseLoading(false);
        return;
      }

      // Call AI exegesis
      const { data, error } = await supabase.functions.invoke("verse-exegesis", {
        body: { verse: verseData.reference || exegeseVerse, verseText },
      });

      if (error || data?.error) {
        setExegeseError(data?.error || "Erro ao gerar exegese.");
        setExegeseLoading(false);
        return;
      }

      setExegeseResult({ verse: verseData.reference || exegeseVerse, content: data.result });
    } catch {
      setExegeseError("Erro de conexão.");
    }
    setExegeseLoading(false);
  }, [exegeseVerse]);

  // ── Devocional audio recording ──────────────────────────────────────────────
  const toggleDevRecording = useCallback(() => {
    if (devRecording) {
      try { devRecognitionRef.current?.stop(); } catch {}
      devRecognitionRef.current = null;
      setDevRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSaved(true); setTimeout(() => setSaved(false), 2000); return; }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = false;
    devRecognitionRef.current = rec;

    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const t = event.results[i][0].transcript;
          devTranscriptRef.current += (devTranscriptRef.current ? " " : "") + t;
          setDevTranscript(devTranscriptRef.current);
        }
      }
    };
    rec.onerror = () => { setDevRecording(false); devRecognitionRef.current = null; };
    rec.onend = () => {
      if (devRecognitionRef.current) {
        try { devRecognitionRef.current.start(); } catch { setDevRecording(false); devRecognitionRef.current = null; }
      }
    };
    try {
      devTranscriptRef.current = devTranscript; // keep existing text
      rec.start();
      setDevRecording(true);
    } catch { setDevRecording(false); }
  }, [devRecording, devTranscript]);

  const [devSummarizing, setDevSummarizing] = useState(false);
  const [devSummary, setDevSummary] = useState("");
  const [devReflection, setDevReflection] = useState("");

  const summarizeTranscript = useCallback(async () => {
    if (!devTranscript.trim()) return;
    setDevSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-transcript", {
        body: { transcript: devTranscript },
      });
      if (error) throw error;
      setDevSummary(data?.result || "");
    } catch (e) {
      console.error("Summarize error:", e);
      setDevSummary("");
    } finally {
      setDevSummarizing(false);
    }
  }, [devTranscript]);

  const saveDevTranscript = useCallback((includeSummary = false) => {
    if (!devTranscript.trim()) return;
    const notes = JSON.parse(localStorage.getItem("bible-notes-2026") || "[]");
    const now = new Date().toISOString();
    let texto = `# Devocional gravado\n\n${devTranscript}`;
    if (includeSummary && devSummary) {
      texto += `\n\n---\n\n## Resumo em tópicos\n\n${devSummary}`;
    }
    notes.unshift({
      id: Date.now(),
      categoria: "devocionais",
      semana: "",
      texto,
      criadoEm: now,
      atualizadoEm: now,
    });
    localStorage.setItem("bible-notes-2026", JSON.stringify(notes));
    setDevTranscript("");
    devTranscriptRef.current = "";
    setDevSummary("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [devTranscript, devSummary]);

  const { direction, isAtTop } = useScrollDirection();
  const hideBar = direction === "down" && !isAtTop;
  const compactHeader = direction === "down" && !isAtTop;

  const TABS: { key: typeof tab; icon: React.ReactNode; label: string }[] = [
    { key: "leitura", icon: <BookOpen size={22} />, label: "Leitura" },
    { key: "devocional", icon: <Flame size={22} />, label: "Devocional" },
    { key: "agenda", icon: <Calendar size={22} />, label: "Agenda" },
    { key: "anotacoes", icon: <PenLine size={22} />, label: "Notas" },
    { key: "quiz", icon: <Trophy size={22} />, label: "Quiz" },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground font-body transition-colors duration-300">
      {/* Hidden YouTube player */}
      <iframe
        ref={playerRef}
        src="https://www.youtube.com/embed/juWsw7-IuaE?enablejsapi=1&autoplay=0&loop=1&playlist=juWsw7-IuaE"
        allow="autoplay"
        className="absolute w-0 h-0 border-none opacity-0 pointer-events-none"
        title="Background music"
      />

      {/* ── COMPACT MOBILE HEADER ── */}
      <header className={`mobile-header ${compactHeader ? "header-compact" : ""}`}>
        <div className="flex items-center justify-between">
          {/* Center: Brand + Title */}
          <div className="flex-1 text-center">
            <p className="header-brand text-[9px] tracking-[3px] uppercase text-muted-foreground font-semibold font-ui h-3 leading-3 mb-0.5">
              Fascinação · 2026A
            </p>
            <h1 className="font-body text-[20px] font-bold text-foreground tracking-wide leading-tight transition-all duration-300"
              style={{ opacity: titleFading ? 0 : 1, transform: titleFading ? "translateY(-6px)" : "translateY(0)" }}>
              {displayTitle}
            </h1>
          </div>

          {/* Right: Theme toggle */}
          <button
            onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
            className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-all shrink-0"
            aria-label="Alternar tema"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="main-content">

      {/* ── LEITURA TAB ── */}
      {tab === "leitura" && (
        <>
          {/* Hero card — Leitura de Hoje */}
          {todayReading && (
            <div className="px-4 pt-4">
              <div
                onClick={() => {
                  setActiveWeek(todayReading.weekIdx);
                  if (!todayReading.isDone) toggle(todayReading.weekIdx, todayReading.dayIdx);
                  haptic("medium");
                }}
                className="rounded-2xl p-5 cursor-pointer relative overflow-hidden transition-all duration-300 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
                  border: todayReading.isDone
                    ? '1px solid hsl(var(--success) / 0.3)'
                    : '1px solid hsl(var(--primary) / 0.2)',
                  boxShadow: '0 8px 32px hsl(var(--background) / 0.3)',
                }}
              >
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full"
                  style={{ background: todayReading.isDone
                    ? 'radial-gradient(circle, hsl(var(--success) / 0.08) 0%, transparent 70%)'
                    : 'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)'
                  }} />

                <span className={`text-[10px] font-semibold tracking-[2px] uppercase font-ui
                  ${todayReading.isDone ? "text-success" : "text-primary"}`}>
                  Leitura de Hoje
                </span>

                <h2 className="font-body text-xl font-bold mt-1 text-foreground">
                  {todayReading.day.day} — Semana {todayReading.weekIdx + 1}
                </h2>

                <div className="flex gap-2 mt-3 flex-wrap">
                  {todayReading.day.r.map((r, ri) => (
                    <span key={ri} className="px-3 py-1.5 rounded-full text-sm font-body"
                      style={{
                        background: todayReading.isDone
                          ? 'hsl(var(--success) / 0.12)'
                          : 'hsl(var(--primary) / 0.12)',
                        border: todayReading.isDone
                          ? '1px solid hsl(var(--success) / 0.25)'
                          : '1px solid hsl(var(--primary) / 0.25)',
                        color: todayReading.isDone
                          ? 'hsl(var(--success))'
                          : 'hsl(var(--primary))',
                      }}>
                      {r}
                    </span>
                  ))}
                </div>

                {/* Check button */}
                <div className="absolute bottom-5 right-5 w-12 h-12 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: todayReading.isDone
                      ? 'hsl(var(--success))'
                      : 'hsl(var(--success) / 0.15)',
                    border: todayReading.isDone
                      ? 'none'
                      : '2px solid hsl(var(--success) / 0.4)',
                  }}>
                  <Check size={20} className={todayReading.isDone ? "text-white" : "text-success"} strokeWidth={3} />
                </div>
              </div>
            </div>
          )}

          {/* Week pills — horizontal scroll-snap carousel */}
          <div className="flex gap-2 px-4 mt-4 overflow-x-auto no-scrollbar"
            style={{ scrollSnapType: 'x mandatory' }}>
            {WEEKS.map((w, i) => {
              const isActive = i === activeWeek;
              const isComplete = weekProg(i) >= 1;
              return (
                <button key={i}
                  onClick={() => { haptic("light"); setActiveWeek(i); }}
                  className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all active:scale-95 font-ui"
                  style={{
                    scrollSnapAlign: 'center',
                    background: isActive ? 'hsl(var(--primary))' : 'transparent',
                    color: isActive ? 'hsl(var(--primary-foreground))' : isComplete ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))',
                    border: isComplete && !isActive ? '2px solid hsl(var(--success))' : isActive ? 'none' : '1px solid hsl(var(--border))',
                  }}>
                  {isComplete && !isActive ? '✓' : w.week}
                </button>
              );
            })}
          </div>

          {/* Week progress header */}
          <div className="mx-4 mt-5 flex items-center justify-between">
            <div>
              <h3 className="font-body text-lg font-bold text-foreground">
                Semana {cw.week}
              </h3>
              <span className="text-xs text-muted-foreground font-ui">{cw.dates}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 h-1.5 rounded-full overflow-hidden bg-border">
                <div className="h-full rounded-full transition-all duration-400"
                  style={{ width: `${wp * 100}%`, background: wp >= 1 ? 'hsl(var(--success))' : 'hsl(var(--primary))' }} />
              </div>
              <span className={`text-sm font-bold font-ui ${wp >= 1 ? "text-success" : "text-primary"}`}>
                {Math.round(wp * 100)}%
              </span>
            </div>
          </div>

          {/* Day cards — clean vertical list */}
          <div className="mx-4 mt-4 space-y-2 pb-4">
            {cw.days.map((day, di) => {
              if (!day.r.length) return null;
              const isDone = !!checked[`${activeWeek}-${di}`];
              return (
                <div key={di}
                  onClick={() => { toggle(activeWeek, di); haptic("light"); }}
                  className="p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: 'hsl(var(--card))',
                    border: isDone
                      ? '1px solid hsl(var(--success) / 0.3)'
                      : '1px solid hsl(var(--border))',
                  }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground font-ui">{ABBREVS[di]}</span>
                      <span className="text-xs text-muted-foreground font-ui">
                        {day.r.length} {day.r.length === 1 ? "leitura" : "leituras"}
                      </span>
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {day.r.map((r, ri) => (
                        <span key={ri} className="px-2.5 py-1 rounded-lg text-xs font-body"
                          style={{
                            background: isDone ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--primary) / 0.08)',
                            color: isDone ? 'hsl(var(--muted-foreground))' : 'hsl(var(--text-secondary))',
                          }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Check circle */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-3 transition-all"
                    style={{
                      background: isDone ? 'hsl(var(--success))' : 'transparent',
                      border: isDone ? 'none' : '2px solid hsl(var(--border))',
                    }}>
                    {isDone && <Check size={18} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── DEVOCIONAL TAB ── */}
      {tab === "devocional" && (() => {
        const now = new Date();
        const dayNames = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
        const todayName = dayNames[now.getDay()];
        let todayDev: { ref: string; summary: string; day: string; period: string; exegese?: string; verseText?: string } | null = null;
        const year = now.getFullYear();

        for (const week of DEVOTIONALS) {
          const [startStr, endStr] = week.period.split(" a ");
          const [sd, sm] = startStr.split("/").map(Number);
          const [ed, em] = endStr.split("/").map(Number);
          const start = new Date(year, sm - 1, sd);
          const end = new Date(year, em - 1, ed, 23, 59, 59);
          if (now >= start && now <= end) {
            const match = week.days.find(d => d.day === todayName);
            if (match) todayDev = { ...match, period: week.period };
            break;
          }
        }

        const parseExegeseEntries = (text: string) => {
          const entries: { word: string; origin: string; definition: string }[] = [];
          const regex = /\*\*\"(.+?)\"\*\*\s*\(([^)]+)\)\s*[—–-]\s*(.+?)(?=\s*\*\*\"|$)/gs;
          let match;
          while ((match = regex.exec(text)) !== null) {
            entries.push({ word: match[1], origin: match[2].trim(), definition: match[3].trim().replace(/\.\s*$/, '') });
          }
          if (entries.length === 0) {
            const lines = text.split(/\.\s+\*\*/);
            for (const line of lines) {
              const m = line.match(/\*?\*?\"?(.+?)\"?\*?\*?\s*\(([^)]+)\)\s*[—–-]\s*(.+)/);
              if (m) entries.push({ word: m[1], origin: m[2].trim(), definition: m[3].trim() });
            }
          }
          return entries;
        };

        const getTheologicalNote = (text: string) => {
          const patterns = [/(?:O\s+(?:autor|texto|verso|versículo|contexto)|Paulo|Jesus|Tiago|Davi|O\s+Espírito|A\s+(?:LXX|oração)|Teologicamente).+$/s];
          for (const p of patterns) {
            const m = text.match(p);
            if (m) return m[0].replace(/\*\*/g, '').replace(/\*/g, '').trim();
          }
          return null;
        };

        const renderExegeseBlock = (text: string) => {
          return text
            .split("\n")
            .map(line => {
              if (line.startsWith("## ")) return `<h3 class="font-display text-base font-medium text-primary my-4">${line.slice(3)}</h3>`;
              if (line.startsWith("- ")) {
                const content = line.slice(2)
                  .replace(/\*\*\"(.+?)\"\*\*/g, '<strong>"$1"</strong>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>');
                return `<div class="flex gap-2 my-1"><span class="text-primary shrink-0">•</span><span>${content}</span></div>`;
              }
              if (!line.trim()) return "<br/>";
              const content = line
                .replace(/\*\*\"(.+?)\"\*\*/g, '<strong>"$1"</strong>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>');
              return `<p class="my-1">${content}</p>`;
            })
            .join("");
        };

        const renderDevDetail = (d: { ref: string; summary: string; exegese?: string; verseText?: string }, accentColor: string) => {
          const entries = d.exegese ? parseExegeseEntries(d.exegese) : [];
          const theoNote = d.exegese ? getTheologicalNote(d.exegese) : null;
          const cacheKey = `${d.ref}__${devBibleVersion}`;
          const displayVerse = devBibleVersion === "almeida"
            ? d.verseText
            : devVerseOverrides[cacheKey] || d.verseText;
          const isLoadingVerse = devVerseLoading === cacheKey;

          return (
            <>
              {/* Bible version selector */}
              {d.verseText && (
                <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] text-muted-foreground shrink-0 font-ui">Versão:</span>
                  {BIBLE_VERSIONS.map(v => (
                    <button key={v.key}
                      onClick={() => { setDevBibleVersion(v.key); if (v.key !== "almeida") fetchDevVerse(d.ref, v.key); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] border cursor-pointer whitespace-nowrap transition-all duration-200 font-ui
                        ${devBibleVersion === v.key
                          ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                          : "border-border bg-card/50 text-muted-foreground hover:border-primary/20"}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              )}

              {d.verseText && (
                <blockquote className="text-[17px] leading-[1.7] text-foreground italic font-body
                  px-5 py-4 my-5 rounded-xl bg-primary/5 border-l-[3px] relative"
                  style={{ borderLeftColor: accentColor }}>
                  {isLoadingVerse && (
                    <div className="absolute inset-0 bg-card/60 rounded-xl flex items-center justify-center">
                      <span className="text-[13px] text-muted-foreground animate-pulse font-ui">Carregando versão...</span>
                    </div>
                  )}
                  "{displayVerse}"
                  {devBibleVersion !== "almeida" && devVerseOverrides[cacheKey] && (
                    <span className="block text-[11px] text-muted-foreground mt-2 not-italic font-normal font-ui">
                      — {BIBLE_VERSIONS.find(v => v.key === devBibleVersion)?.label}
                    </span>
                  )}
                </blockquote>
              )}

              <p className="text-[15px] leading-relaxed text-text-secondary mb-6">{d.summary}</p>

              {entries.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 mb-5">
                  <p className="font-display text-[10px] tracking-[3px] uppercase text-muted-foreground font-semibold mb-5 flex items-center gap-2">
                    📜 Exegese — Palavra por Palavra
                  </p>
                  <div className="divide-y divide-border-subtle">
                    {entries.map((entry, i) => (
                      <div key={i} className="py-4 first:pt-0 last:pb-0">
                        <p className="text-[16px] text-foreground mb-1">
                          <strong>"{entry.word}"</strong>
                          <span className="text-muted-foreground text-[13px] ml-2">
                            ({entry.origin.split(',')[0]}.{' '}
                            <em className="text-primary">{entry.origin.split(',').slice(1).join(',').trim() || entry.origin}</em>)
                          </span>
                        </p>
                        <p className="text-[14px] text-text-secondary leading-relaxed pl-0.5">— {entry.definition}</p>
                      </div>
                    ))}
                  </div>
                  {theoNote && (
                    <div className="mt-5 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3.5">
                      <p className="text-[14px] text-text-secondary italic leading-relaxed">{theoNote}</p>
                    </div>
                  )}
                </div>
              )}

              {d.exegese && entries.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 mb-5">
                  <p className="font-display text-[10px] tracking-[3px] uppercase text-muted-foreground font-semibold mb-4">
                    📜 Exegese — Palavra por Palavra
                  </p>
                  <div className="exegese-html text-[13px] leading-[1.85] text-text-secondary"
                    dangerouslySetInnerHTML={{ __html: d.exegese
                      .replace(/\*\*\"(.+?)\"\*\*/g, '<strong>"$1"</strong>')
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.+?)\*/g, '<em>$1</em>')
                      .replace(/\. /g, '.<br/>') }} />
                </div>
              )}
            </>
          );
        };

        return (
          <div className="px-4 pt-5 pb-4 space-y-6">

            {/* ── HERO: TODAY'S DEVOTIONAL ── */}
            {todayDev ? (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="font-ui text-[9px] tracking-[3px] uppercase text-fire font-bold">
                      Devocional de Hoje — {todayDev.day}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-ui">{todayDev.period}</p>
                  </div>
                </div>

                <h2 className="font-body text-[26px] font-bold text-foreground leading-tight mb-1">
                  {todayDev.ref}
                </h2>

                {renderDevDetail(todayDev, "hsl(var(--fire))")}

                {/* Reflection section */}
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-display text-[10px] tracking-[3px] uppercase text-muted-foreground font-semibold flex items-center gap-2">
                      ✍️ Minha Reflexão de Hoje
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {["O que Deus está me dizendo?", "Como isso se aplica hoje?", "Pelo que sou grato?"].map(prompt => (
                      <button key={prompt} onClick={() => setDevReflection(prev => prev + (prev ? '\n' : '') + `<p>${prompt}</p>`)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-background text-[12px] text-text-secondary
                          hover:border-primary/30 hover:text-foreground cursor-pointer transition-all duration-150 font-body">
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <RichTextEditor content={devReflection} onChange={setDevReflection} placeholder="Escreva sua reflexão sobre o devocional de hoje..." />

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => {
                        if (!devReflection.trim()) return;
                        const noteText = `# Reflexão: ${todayDev?.ref}\n\n${devReflection}`;
                        const notes = JSON.parse(localStorage.getItem("bible-notes-2026") || "[]");
                        const now2 = new Date().toISOString();
                        notes.unshift({ id: Date.now(), categoria: "devocionais", semana: "", texto: noteText, criadoEm: now2, atualizadoEm: now2 });
                        localStorage.setItem("bible-notes-2026", JSON.stringify(notes));
                        setDevReflection("");
                        setSaved(true); setTimeout(() => setSaved(false), 2000);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-ui text-[10px] tracking-wider uppercase
                        cursor-pointer hover:bg-primary-hover active:scale-[0.97] transition-all duration-200"
                    >
                      Salvar reflexão
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center px-8 py-16">
                <span className="text-5xl mb-4 animate-breathing">🕊️</span>
                <h2 className="font-body text-lg font-bold text-center text-foreground">
                  Nenhum devocional para hoje
                </h2>
                <p className="text-sm text-center mt-2 text-muted-foreground">
                  Explore os devocionais anteriores ou use as ferramentas abaixo
                </p>
              </div>
            )}

            {/* ── APRIL CALENDAR ── */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                <p className="font-display text-[10px] tracking-[3px] uppercase text-muted-foreground font-semibold mb-1 flex items-center gap-2">
                  📅 Calendário de Abril
                </p>
                <p className="text-[11px] text-muted-foreground mb-4 font-ui">Toque em um dia para ver a leitura devocional</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {APRIL_THEMES.map(t => (
                    <span key={t.week} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-[10px] font-ui tracking-wide">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                      <span className="text-muted-foreground">{t.week}:</span>
                      <span className="text-foreground font-medium">{t.theme}</span>
                    </span>
                  ))}
                </div>

                {(() => {
                  const daysOfWeek = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
                  const firstDayOffset = 2;
                  const daysInMonth = 30;
                  const today = new Date();
                  const isCurrentMonth = today.getMonth() === 3 && today.getFullYear() === 2026;
                  const todayDate = isCurrentMonth ? today.getDate() : -1;
                  const cells: (number | null)[] = [];
                  for (let i = 0; i < firstDayOffset; i++) cells.push(null);
                  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                  while (cells.length % 7 !== 0) cells.push(null);
                  const getWeekColor = (day: number) => {
                    if (day >= 6 && day <= 10) return "hsl(var(--fire))";
                    if (day >= 13 && day <= 17) return "hsl(var(--primary))";
                    if (day >= 20 && day <= 24) return "#6B8A5E";
                    if (day >= 27 && day <= 30) return "#7A6B8A";
                    return undefined;
                  };
                  return (
                    <div>
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {daysOfWeek.map(d => (
                          <div key={d} className="text-center text-[9px] font-ui tracking-wider uppercase text-muted-foreground py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((day, i) => {
                          if (day === null) return <div key={i} />;
                          const ref = APRIL_CALENDAR[day];
                          const wColor = getWeekColor(day);
                          const isToday = day === todayDate;
                          const isWeekend = (i % 7 === 5) || (i % 7 === 6);
                          return (
                            <button key={i}
                              onClick={() => {
                                if (ref) {
                                  setExegeseVerse(ref);
                                  setTimeout(() => {
                                    document.querySelector('[data-exegesis]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }, 100);
                                }
                              }}
                              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all duration-200 min-w-[44px] min-h-[44px]
                                ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                                ${ref ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"}
                                ${isWeekend ? "opacity-40" : ""}
                                ${ref ? "border border-border bg-card/80 hover:bg-card" : "bg-transparent"}`}
                              style={ref && wColor ? { borderColor: wColor + "40" } : undefined}
                              title={ref || undefined}>
                              <span className={`text-[13px] font-medium ${isToday ? "text-primary" : ref ? "text-foreground" : "text-muted-foreground/50"}`}>
                                {day}
                              </span>
                              {ref && <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: wColor || "hsl(var(--primary))" }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ── TOOLS DIVIDER ── */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-ui text-[10px] tracking-[2px] uppercase text-muted-foreground font-semibold">Ferramentas</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* ── TOOLS GRID 2x1 ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Estudo Exegético */}
              <button
                onClick={() => {
                  document.querySelector('[data-exegesis]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="aspect-square rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background-secondary)) 100%)',
                  border: '1px solid hsl(var(--primary) / 0.15)',
                }}>
                <span className="text-3xl">📖</span>
                <div className="text-center">
                  <div className="text-xs font-bold tracking-wider uppercase text-primary font-ui">Estudo</div>
                  <div className="text-[10px] mt-0.5 text-muted-foreground font-ui">Exegese palavra a palavra</div>
                </div>
              </button>

              {/* Gravar */}
              <button
                onClick={() => {
                  document.querySelector('[data-recording]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="aspect-square rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background-secondary)) 100%)',
                  border: '1px solid hsl(var(--primary) / 0.15)',
                }}>
                <span className="text-3xl">🎙️</span>
                <div className="text-center">
                  <div className="text-xs font-bold tracking-wider uppercase text-primary font-ui">Gravar</div>
                  <div className="text-[10px] mt-0.5 text-muted-foreground font-ui">Reflexão em áudio</div>
                </div>
              </button>
            </div>

            {/* ── EXEGESIS STUDY ── */}
            <div data-exegesis className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                <p className="font-display text-[10px] tracking-[3px] uppercase text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                  📜 Estudo Exegético
                </p>
                <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
                  Envie um versículo e receba uma análise palavra por palavra com o significado original em grego/hebraico.
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={exegeseVerse}
                    onChange={e => setExegeseVerse(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleExegese(); }}
                    placeholder="Ex: João 3:16, Rm 8:28"
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-background
                      text-foreground font-body text-[16px] outline-none
                      focus:border-primary focus:ring-1 focus:ring-primary/30
                      placeholder:text-muted-foreground placeholder:italic
                      transition-all duration-200"
                  />
                  <button onClick={handleExegese} disabled={!exegeseVerse.trim() || exegeseLoading}
                    className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-ui text-[10px] tracking-wider uppercase cursor-pointer shrink-0
                      disabled:opacity-40 hover:bg-primary-hover active:scale-95 transition-all duration-200">
                    {exegeseLoading ? "⏳" : "Estudar"}
                  </button>
                </div>
                {exegeseError && (
                  <p className="text-[13px] text-destructive italic mb-2 flex items-center gap-1.5"><span>⚠</span> {exegeseError}</p>
                )}
                {exegeseResult && (
                  <div className="mt-3 rounded-xl border border-border bg-background/50 p-4">
                    <p className="font-display text-[9px] tracking-[2px] uppercase text-primary font-bold mb-3">
                      Resultado: {exegeseResult.verse}
                    </p>
                    <div className="exegese-html text-sm leading-[2] text-text-secondary"
                      dangerouslySetInnerHTML={{ __html: renderExegeseBlock(exegeseResult.content) }} />
                    <div className="flex gap-2 mt-4 pt-3 border-t border-border-subtle">
                      <button onClick={() => {
                        const noteText = `# Exegese: ${exegeseResult.verse}\n\n${exegeseResult.content}`;
                        const notes = JSON.parse(localStorage.getItem("bible-notes-2026") || "[]");
                        const now2 = new Date().toISOString();
                        notes.unshift({ id: Date.now(), categoria: "devocionais", semana: "", texto: noteText, criadoEm: now2, atualizadoEm: now2 });
                        localStorage.setItem("bible-notes-2026", JSON.stringify(notes));
                        setSaved(true); setTimeout(() => setSaved(false), 2000);
                      }}
                        className="flex-1 py-2.5 rounded-xl bg-fire/10 border border-fire/30 text-fire font-ui text-[9px] tracking-wide uppercase text-center cursor-pointer hover:bg-fire/15 active:scale-[0.98] transition-all duration-150">
                        🔥 Salvar em Devocionais
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(exegeseResult.content); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                        className="px-4 py-2.5 rounded-xl border border-border bg-transparent text-muted-foreground font-ui text-[9px] tracking-wide uppercase cursor-pointer hover:border-primary/30 hover:text-foreground active:scale-[0.98] transition-all duration-150">
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── RECORD DEVOTIONAL ── */}
            <div data-recording className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                <p className="font-display text-[10px] tracking-[3px] uppercase text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                  🎙️ Gravar Devocional
                </p>
                <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
                  Grave sua reflexão em áudio e ela será transcrita automaticamente.
                </p>
                <button onClick={toggleDevRecording}
                  className={`w-full py-3.5 rounded-xl border font-ui text-[11px] tracking-[2px] uppercase cursor-pointer
                    flex items-center justify-center gap-2.5 transition-all duration-200 min-h-[48px]
                    ${devRecording
                      ? "bg-destructive/10 border-destructive text-destructive animate-pulse"
                      : "bg-background border-border text-primary hover:border-primary/40 active:scale-[0.98]"}`}>
                  {devRecording ? "⏹ Parar Gravação" : "🎙️ Iniciar Gravação"}
                </button>
                {devTranscript && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-primary/5 border border-primary/10 border-l-[3px] border-l-primary rounded-r-xl p-4 text-[15px] leading-relaxed text-text-secondary italic font-body">
                      {devTranscript}
                    </div>
                    <button onClick={summarizeTranscript} disabled={devSummarizing}
                      className="w-full py-2.5 rounded-xl bg-accent/10 border border-accent/25 text-accent font-ui text-[9px] tracking-wide uppercase cursor-pointer disabled:opacity-50 hover:bg-accent/15 active:scale-[0.98] transition-all duration-200 min-h-[44px]">
                      {devSummarizing ? "⏳ Resumindo..." : "✨ Resumir em Tópicos com IA"}
                    </button>
                    {devSummary && (
                      <div className="bg-accent/5 border border-accent/10 border-l-[3px] border-l-accent rounded-r-xl p-4 text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                        {devSummary}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => saveDevTranscript(!!devSummary)}
                        className="flex-1 py-2.5 rounded-xl bg-fire/10 border border-fire/30 text-fire font-ui text-[9px] tracking-wide uppercase cursor-pointer hover:bg-fire/15 active:scale-[0.98] transition-all duration-150 min-h-[44px]">
                        🔥 Salvar em Devocionais
                      </button>
                      <button onClick={() => { setDevTranscript(""); devTranscriptRef.current = ""; setDevSummary(""); }}
                        className="px-4 py-2.5 rounded-xl border border-border bg-transparent text-muted-foreground font-ui text-[9px] tracking-wide uppercase cursor-pointer hover:border-primary/30 active:scale-[0.98] transition-all duration-150 min-h-[44px]">
                        Limpar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── ARCHIVE DIVIDER ── */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-ui text-[10px] tracking-[2px] uppercase text-muted-foreground font-semibold">Arquivo</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* ── ALL DEVOTIONALS LIST ── */}
            <div>
              <p className="font-display text-[10px] tracking-[3px] uppercase text-muted-foreground font-semibold mb-4">
                📖 Todos os Devocionais
              </p>
              {DEVOTIONALS.map((week, wi) => (
                <div key={wi} className="mb-6">
                  <div className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-border
                    bg-card/80 mb-3 text-[12px] text-text-secondary font-ui font-semibold tracking-wider uppercase">
                    📅 {week.period}
                  </div>
                  <div className="space-y-2">
                    {week.days.map((d, di) => {
                      const key = `dev-${wi}-${di}`;
                      const isOpen = expandedDev === key;
                      const c = DEV_DAY_COLORS[d.day] ?? "#C8A55C";
                      return (
                        <div key={di}
                          className={`rounded-2xl relative overflow-hidden border transition-all duration-300
                            ${isOpen
                              ? "border-primary/30 bg-card"
                              : "border-border hover:border-primary/20 bg-card/50 hover:bg-card/80"}`}>
                          <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
                            style={{ background: `linear-gradient(90deg,${c},transparent)` }} />
                          <div className="p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setExpandedDev(isOpen ? null : key)}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-[10px] font-ui font-bold tracking-wider uppercase mb-1" style={{ color: c }}>{d.day}</div>
                                <div className="text-[15px] font-semibold text-foreground font-body">{d.ref}</div>
                              </div>
                              <span className={`text-lg text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>+</span>
                            </div>
                          </div>
                          {isOpen && (
                            <div className="px-4 pb-5 pt-0 border-t border-border-subtle animate-fade-in">
                              {renderDevDetail(d, c)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

          </div>
        );
      })()}

      {/* ── AGENDA TAB ── */}
      {tab === "agenda" && <WeekSchedule userCodeId={userCodeId} />}

      {/* ── ANOTAÇÕES TAB ── */}
      {tab === "anotacoes" && <BibleNotes onTitleChange={setNotesTitle} userCodeId={userCodeId} />}

      {/* ── QUIZ TAB ── */}
      {tab === "quiz" && <Quiz userCodeId={userCodeId} />}

      </div>{/* end main-content */}

      {/* ── BOTTOM TAB BAR ── */}
      <nav className={`bottom-tab-bar ${hideBar ? "hidden-bar" : ""}`}>
        {TABS.map(t => {
          const isActive = tab === t.key;
          return (
            <button key={t.key}
              onClick={() => { haptic("light"); setTab(t.key); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`tab-item ${isActive ? "tab-active" : ""}`}
              aria-label={t.label}>
              <span className={`tab-icon leading-none transition-colors duration-200
                ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {t.icon}
              </span>
              <span className="tab-label">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Save toast */}
      {saved && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-success text-white py-2.5 px-5 rounded-full text-[13px] z-[110] shadow-lg animate-fade-in font-ui">
          ✓ Progresso salvo
        </div>
      )}
    </div>
  );
}