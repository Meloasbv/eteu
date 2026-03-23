import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import WeekSchedule from "@/components/WeekSchedule";
import BibleNotes from "@/components/BibleNotes";

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
  const [tab, setTab] = useState<"home" | "leitura" | "devocional" | "agenda" | "anotacoes">("home");
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
  const [notesTitle, setNotesTitle] = useState("📝 Anotações");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try { return (localStorage.getItem(THEME_KEY) as "light" | "dark") || "dark"; } catch { return "dark"; }
  });
  const [titleFading, setTitleFading] = useState(false);
  const [displayTitle, setDisplayTitle] = useState("Leitura Bíblica Cronológica");
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
    const newTitle = tab === "home" ? "Leitura Bíblica Cronológica"
      : tab === "leitura" ? "📖 Plano de Leitura"
      : tab === "devocional" ? "🔥 Devocionais"
      : tab === "agenda" ? "📅 Agenda"
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

  // CSS variables for notes theming
  const themeVars = theme === "light" ? {
    "--notes-bg": "#faf9f7",
    "--notes-card": "#ffffff",
    "--notes-hover": "#f0ede8",
    "--notes-text": "#1a1714",
    "--notes-text2": "#6b6560",
    "--notes-text3": "#aba59e",
    "--notes-accent": "#8b6f4e",
    "--notes-accent-faint": "rgba(139,111,78,.07)",
    "--notes-border": "rgba(0,0,0,.08)",
    "--notes-border2": "rgba(0,0,0,.05)",
    "--notes-placeholder": "#c0b9b0",
    "--notes-shadow": "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
  } : {
    "--notes-bg": "#110e08",
    "--notes-card": "#1d1810",
    "--notes-hover": "#261f13",
    "--notes-text": "#e6dcc8",
    "--notes-text2": "#8a7d65",
    "--notes-text3": "#4e4535",
    "--notes-accent": "#c9a052",
    "--notes-accent-faint": "rgba(201,160,82,.08)",
    "--notes-border": "rgba(201,160,82,.1)",
    "--notes-border2": "rgba(201,160,82,.06)",
    "--notes-placeholder": "#3a3225",
    "--notes-shadow": "0 1px 4px rgba(0,0,0,.3)",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: theme === "light"
        ? "linear-gradient(160deg,#faf9f7 0%,#f5f3ef 40%,#faf9f7 100%)"
        : "linear-gradient(160deg,#1a1510 0%,#2a2218 40%,#1e1a14 100%)",
      fontFamily: "'Cormorant Garamond', 'Georgia', serif",
      color: theme === "light" ? "#1a1714" : "#e8dcc8",
      transition: "background .3s cubic-bezier(.4,0,.2,1), color .3s cubic-bezier(.4,0,.2,1)",
      ...themeVars as any,
    }}>
      {/* Hidden YouTube player */}
      <iframe
        ref={playerRef}
        src="https://www.youtube.com/embed/juWsw7-IuaE?enablejsapi=1&autoplay=0&loop=1&playlist=juWsw7-IuaE"
        allow="autoplay"
        style={{ position: "absolute", width: 0, height: 0, border: "none", opacity: 0, pointerEvents: "none" }}
        title="Background music"
      />
      {/* ── THEME TOGGLE ── */}
      <label style={{
        position: "fixed", top: 16, right: 16, width: 38, height: 22, zIndex: 100,
        display: "block", cursor: "pointer",
      }}>
        <input
          type="checkbox"
          checked={theme === "dark"}
          onChange={() => setTheme(t => t === "light" ? "dark" : "light")}
          style={{ display: "none" }}
        />
        <div style={{
          width: 38, height: 22, borderRadius: 99,
          background: theme === "light" ? "#f0ede8" : "#261f13",
          border: `1px solid ${theme === "light" ? "rgba(0,0,0,.08)" : "rgba(201,160,82,.1)"}`,
          position: "relative", transition: "background .3s, border-color .3s",
        }}>
          <div style={{
            position: "absolute", top: 2, left: theme === "dark" ? 18 : 2,
            width: 16, height: 16, borderRadius: "50%",
            background: theme === "light" ? "#8b6f4e" : "#c9a052",
            transition: "left .25s cubic-bezier(.34,1.56,.64,1), background .3s",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9,
          }}>
            {theme === "light" ? "☀" : "☾"}
          </div>
        </div>
      </label>

      {/* ── HEADER ── */}
      <div style={{
        padding: "44px 20px 0", textAlign: "center",
        transition: "border-color .3s",
      }}>
        <p style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 8, letterSpacing: 4, textTransform: "uppercase",
          color: theme === "light" ? "#aba59e" : "#8a7a60",
          marginBottom: 4, fontWeight: 400,
          transition: "color .3s",
        }}>
          Fascinação · 2026A
        </p>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 17, fontWeight: 400,
          color: theme === "light" ? "#8b6f4e" : "#e8c97a",
          letterSpacing: 0.5, lineHeight: 1.25, marginBottom: 8,
          transition: "color .3s, opacity .28s, transform .28s",
          opacity: titleFading ? 0 : 1,
          transform: titleFading ? "translateY(-6px)" : "translateY(0)",
        }}>
          {displayTitle}
        </h1>
        {/* Overall progress */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 26, height: 26, position: "relative", flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 26 26" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="13" cy="13" r="10" fill="none"
                stroke={theme === "light" ? "rgba(0,0,0,.06)" : "rgba(200,180,140,0.1)"}
                strokeWidth="2.5" style={{ transition: "stroke .3s" }} />
              <circle cx="13" cy="13" r="10" fill="none"
                stroke={theme === "light" ? "#8b6f4e" : "#c9a052"}
                strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${prog * 62.83} 62.83`}
                style={{ transition: "stroke-dasharray .6s ease, stroke .3s" }} />
            </svg>
          </div>
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 9, letterSpacing: 1,
            color: theme === "light" ? "#6b6560" : "#8a7a60",
            transition: "color .3s",
          }}>
            {Math.round(prog * 100)}% · Progresso total
          </span>
        </div>
      </div>
      {/* Tabs - bottom tab bar style */}
      <div style={{
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "6px 8px 8px",
        borderBottom: `1px solid ${theme === "light" ? "rgba(0,0,0,.06)" : "rgba(200,180,140,.08)"}`,
        transition: "border-color .3s",
      }}>
        {([
          { key: "leitura" as const, icon: "📖", label: "Leitura" },
          { key: "devocional" as const, icon: "🔥", label: "Devocional" },
          { key: "agenda" as const, icon: "📅", label: "Agenda" },
          { key: "anotacoes" as const, icon: "📝", label: "Notas" },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "6px 10px", borderRadius: 12, flex: 1,
            border: "none",
            background: tab === t.key
              ? (theme === "light" ? "rgba(139,111,78,.08)" : "rgba(200,170,100,.12)")
              : "transparent",
            cursor: "pointer",
            transition: "all .2s",
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 9, letterSpacing: 0.5,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key
                ? (theme === "light" ? "#8b6f4e" : "#e8c97a")
                : (theme === "light" ? "#aba59e" : "#6a5a48"),
              transition: "color .2s",
            }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── HOME DASHBOARD ── */}
      {tab === "home" && (
        <div style={{ padding: "24px 16px 40px", maxWidth: 700, margin: "0 auto" }}>

          {/* ── Plano de Leitura ── */}
          <DashSection title="Plano de leitura" subtitle="Cronologia Bíblica" description="Leia a Bíblia na ordem em que os eventos aconteceram ao longo da história">
            <DashCard icon="📖" title="Leitura Cronológica" subtitle={`${Math.round(prog * 100)}% concluído · Semana ${activeWeek + 1}`} onClick={() => setTab("leitura")} accent="#C8A55C" />
          </DashSection>

          {/* ── Vida Espiritual ── */}
          <DashSection title="Vida espiritual" subtitle="Devocionais da Semana" description="Reflexões diárias para aprofundar sua caminhada com Deus">
            {DEVOTIONALS.slice(0, 2).map((dv, i) => (
              <DashCard key={i} icon="🕯️" title={`Semana ${i + 1}`} subtitle={dv.period} onClick={() => setTab("devocional")} accent="#6B5B8A" />
            ))}
          </DashSection>

          {/* ── Organização ── */}
          <DashSection title="Organização" subtitle="Agenda de Leituras" description="Calendário das 18 semanas com os textos programados para cada dia">
            <DashCard icon="📅" title="Semana atual" subtitle={`Sem. ${activeWeek + 1} · ${WEEKS[activeWeek].dates}`} onClick={() => setTab("agenda")} accent="#4A7C8C" />
            {activeWeek + 1 < WEEKS.length && (
              <DashCard icon="⏳" title="Próxima semana" subtitle={`Sem. ${activeWeek + 2} · ${WEEKS[activeWeek + 1].dates}`} onClick={() => { setActiveWeek(activeWeek + 1); setTab("leitura"); }} accent="#8a7a60" />
            )}
          </DashSection>

          {/* ── Caderno de Estudo ── */}
          <DashSection title="Caderno de estudo" subtitle="Anotações" description="">
            <DashCard icon="📢" title="Track Proclamadores" subtitle="" onClick={() => setTab("anotacoes")} accent="#C8A55C" />
            <DashCard icon="📚" title="Aulas" subtitle="" onClick={() => setTab("anotacoes")} accent="#4A7C8C" />
          </DashSection>

        </div>
      )}

      {/* ── LEITURA TAB ── */}
      {tab === "leitura" && (
        <>
          {/* Today's reading card */}
          {todayReading && (
            <div style={{ padding: "20px 16px 8px" }}>
              <div
                onClick={() => {
                  setActiveWeek(todayReading.weekIdx);
                  if (!todayReading.isDone) toggle(todayReading.weekIdx, todayReading.dayIdx);
                }}
                style={{
                  background: todayReading.isDone
                    ? "linear-gradient(135deg,rgba(107,142,107,.12),rgba(90,122,90,.06))"
                    : "linear-gradient(135deg,rgba(200,170,100,.1),rgba(180,140,80,.04))",
                  border: `1px solid ${todayReading.isDone ? "rgba(107,142,107,.3)" : "rgba(200,170,100,.3)"}`,
                  borderRadius: 16, padding: "18px 20px", cursor: "pointer",
                  position: "relative", overflow: "hidden",
                }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: todayReading.isDone
                    ? "linear-gradient(90deg,#6B8E6B,transparent)"
                    : "linear-gradient(90deg,#C8A55C,transparent)",
                  opacity: 0.7, borderRadius: "16px 16px 0 0",
                }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{todayReading.isDone ? "✅" : "📖"}</span>
                    <div>
                      <div style={{
                        fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
                        color: todayReading.isDone ? "#6B8E6B" : "#C8A55C",
                        fontWeight: 700,
                      }}>
                        Leitura de Hoje
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#e8d8b8", marginTop: 2 }}>
                        {todayReading.day.day} — Semana {todayReading.week.week}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: todayReading.isDone ? "none" : "2px solid rgba(200,170,100,.35)",
                    background: todayReading.isDone ? "linear-gradient(135deg,#6B8E6B,#5a7a5a)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {todayReading.isDone && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {todayReading.day.r.map((r, ri) => (
                    <span key={ri} style={{
                      display: "inline-block", padding: "5px 12px", borderRadius: 8,
                      fontSize: 13, fontWeight: 500,
                      background: todayReading.isDone ? "rgba(107,142,107,.12)" : "rgba(200,170,100,.1)",
                      color: todayReading.isDone ? "#8aaa8a" : "#d4c4a8",
                      border: `1px solid ${todayReading.isDone ? "rgba(107,142,107,.2)" : "rgba(200,170,100,.2)"}`,
                      textDecoration: todayReading.isDone ? "line-through" : "none",
                      opacity: todayReading.isDone ? 0.7 : 1,
                    }}>{r}</span>
                  ))}
                </div>
                {!todayReading.isDone && (
                  <div style={{ fontSize: 11, color: "#8a7a60", marginTop: 10, textAlign: "right" }}>
                    Toque para marcar como lida
                  </div>
                )}
              </div>
            </div>
          )}
          <div style={{ padding: "16px 16px 12px", overflowX: "auto", display: "flex", gap: 8, borderBottom: "1px solid rgba(200,180,140,.06)" }}>
            {WEEKS.map((w, i) => (
              <button key={i} onClick={() => setActiveWeek(i)} style={{
                padding: "6px 14px", borderRadius: 20,
                border: `1px solid ${i === activeWeek ? "rgba(200,170,100,.5)" : weekProg(i) >= 1 ? "rgba(107,142,107,.4)" : "rgba(200,180,140,.15)"}`,
                background: i === activeWeek ? "linear-gradient(135deg,rgba(200,170,100,.15),rgba(180,140,80,.08))" : "rgba(200,180,140,.04)",
                color: i === activeWeek ? "#e8d8b8" : "#a09078",
                fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                fontWeight: i === activeWeek ? 600 : 500, fontFamily: "inherit",
              }}>
                {w.week}{weekProg(i) >= 1 ? " ✓" : ""}
              </button>
            ))}
          </div>

          {/* Week header */}
          <div style={{ padding: "20px 24px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#e8d8b8" }}>Semana {cw.week}</div>
              <div style={{ fontSize: 13, color: "#8a7a60", marginTop: 2 }}>{cw.dates}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 80, height: 4, background: "rgba(200,180,140,.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${wp * 100}%`, height: "100%", borderRadius: 2, transition: "width .4s ease",
                  background: wp >= 1 ? "linear-gradient(90deg,#6B8E6B,#5a7a5a)" : "linear-gradient(90deg,#C8A55C,#B8953C)" }}/>
              </div>
              <span style={{ fontSize: 13, color: "#a09078", fontWeight: 500 }}>{Math.round(wp * 100)}%</span>
            </div>
          </div>

          {/* Nav arrows */}
          <div style={{ padding: "4px 24px 12px", display: "flex", gap: 8 }}>
            {([-1, 1] as const).map(delta => (
              <button key={delta} onClick={() => setActiveWeek(w => Math.max(0, Math.min(WEEKS.length - 1, w + delta)))}
                disabled={(delta === -1 && activeWeek === 0) || (delta === 1 && activeWeek === WEEKS.length - 1)}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: "1px solid rgba(200,180,140,.15)", background: "rgba(200,180,140,.04)",
                  color: "#a09078", cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: ((delta === -1 && activeWeek === 0) || (delta === 1 && activeWeek === WEEKS.length - 1)) ? 0.3 : 1,
                }}>
                {delta === -1 ? "‹" : "›"}
              </button>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ padding: "4px 16px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {cw.days.map((day, di) => {
              if (!day.r.length) return null;
              const isDone = !!checked[`${activeWeek}-${di}`];
              const c = COLORS[di];
              return (
                <div key={di} onClick={() => toggle(activeWeek, di)} style={{
                  background: isDone ? "rgba(107,142,107,.06)" : "rgba(255,255,255,.025)",
                  border: `1px solid ${isDone ? "rgba(107,142,107,.2)" : "rgba(200,180,140,.08)"}`,
                  borderRadius: 14, padding: 20, cursor: "pointer", position: "relative", overflow: "hidden",
                  transition: "all .3s ease",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "14px 14px 0 0",
                    background: isDone ? "linear-gradient(90deg,#6B8E6B,transparent)" : `linear-gradient(90deg,${c},transparent)`,
                    opacity: isDone ? 0.7 : 0.5 }}/>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 17, fontWeight: 600, color: isDone ? "#6B8E6B" : c }}>{ABBREVS[di]}</span>
                      <span style={{ fontSize: 12, color: "#6a5a48" }}>{day.r.length} {day.r.length === 1 ? "leitura" : "leituras"}</span>
                    </div>
                    <div style={{ width: 24, height: 24, borderRadius: "50%",
                      border: isDone ? "none" : "2px solid rgba(200,180,140,.25)",
                      background: isDone ? "linear-gradient(135deg,#6B8E6B,#5a7a5a)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isDone && <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {day.r.map((r, ri) => (
                      <span key={ri} style={{
                        display: "inline-block", padding: "5px 12px", borderRadius: 8,
                        fontSize: 13.5, margin: "3px 4px 3px 0",
                        background: isDone ? "rgba(107,142,107,.1)" : `${c}18`,
                        color: isDone ? "#8aaa8a" : "#d4c4a8",
                        border: `1px solid ${isDone ? "rgba(107,142,107,.15)" : c + "25"}`,
                        textDecoration: isDone ? "line-through" : "none",
                        opacity: isDone ? 0.7 : 1,
                      }}>{r}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── DEVOCIONAL TAB ── */}
      {tab === "devocional" && (() => {
        // Find today's devotional
        const now = new Date();
        const dayNames = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
        const todayName = dayNames[now.getDay()];
        // Find matching devotional for today
        let todayDev: { ref: string; summary: string; day: string; period: string; exegese?: string; verseText?: string } | null = null;
        // Try to match by checking which period covers today (March 2026)
        const monthDay = now.getDate();
        const month = now.getMonth(); // 2 = March
        const year = now.getFullYear();
        
        // Parse period dates to find the right week
        for (const week of DEVOTIONALS) {
          const [startStr, endStr] = week.period.split(" a ");
          const [sd, sm] = startStr.split("/").map(Number);
          const [ed, em] = endStr.split("/").map(Number);
          const start = new Date(year, sm - 1, sd);
          const end = new Date(year, em - 1, ed, 23, 59, 59);
          if (now >= start && now <= end) {
            const match = week.days.find(d => d.day === todayName);
            if (match) {
              todayDev = { ...match, period: week.period };
            }
            break;
          }
        }

        const tc = theme === "light";

        return (
          <div style={{ padding: "20px 16px 40px" }}>
            {/* ── TODAY'S DEVOTIONAL ── */}
            {todayDev ? (
              <div style={{
                background: tc
                  ? "linear-gradient(135deg,rgba(139,111,78,.08),rgba(139,111,78,.03))"
                  : "linear-gradient(135deg,rgba(200,170,100,.1),rgba(180,140,80,.04))",
                border: `1px solid ${tc ? "rgba(139,111,78,.18)" : "rgba(200,170,100,.3)"}`,
                borderRadius: 16, padding: "22px 20px", marginBottom: 24,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: tc
                    ? "linear-gradient(90deg,#8b6f4e,transparent)"
                    : "linear-gradient(90deg,#C8A55C,transparent)",
                  opacity: 0.7,
                }} />
                <div style={{
                  fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
                  color: tc ? "#8b6f4e" : "#C8A55C",
                  fontWeight: 700, fontFamily: "'Cinzel', serif", marginBottom: 10,
                }}>
                  🔥 Devocional de Hoje — {todayDev.day}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 600, color: tc ? "#1a1714" : "#e8d8b8",
                  marginBottom: 8, fontFamily: "'Cinzel', serif",
                  transition: "color .3s",
                }}>
                  {todayDev.ref}
                </div>
                {todayDev.verseText && (
                  <div style={{
                    fontSize: 17, lineHeight: 1.8,
                    color: tc ? "#1a1714" : "#e8d8b8",
                    fontStyle: "italic", fontFamily: "'Cormorant Garamond', serif",
                    padding: "12px 16px", marginBottom: 12,
                    background: tc ? "rgba(139,111,78,.04)" : "rgba(200,170,100,.06)",
                    borderLeft: `3px solid ${tc ? "#8b6f4e" : "#C8A55C"}`,
                    borderRadius: "0 8px 8px 0",
                    transition: "color .3s, background .3s",
                  }}>
                    "{todayDev.verseText}"
                  </div>
                )}
                <div style={{
                  fontSize: 15, lineHeight: 1.7,
                  color: tc ? "#6b6560" : "#b0a090",
                  fontStyle: "italic",
                  transition: "color .3s",
                }}>
                  {todayDev.summary}
                </div>
                {todayDev.exegese && (
                  <div style={{
                    background: tc ? "rgba(139,111,78,.04)" : "rgba(200,170,100,.06)",
                    border: `1px solid ${tc ? "rgba(139,111,78,.1)" : "rgba(200,170,100,.12)"}`,
                    borderLeft: `3px solid ${tc ? "#8b6f4e" : "#C8A55C"}`,
                    borderRadius: "0 10px 10px 0",
                    padding: "14px 16px", marginTop: 14,
                  }}>
                    <div style={{
                      fontSize: 9, letterSpacing: 3, textTransform: "uppercase",
                      color: tc ? "#8b6f4e" : "#C8A55C",
                      fontWeight: 700, fontFamily: "'Cinzel', serif", marginBottom: 10,
                    }}>
                      📜 Exegese — Palavra por Palavra
                    </div>
                    <div
                      style={{
                        fontSize: 13, lineHeight: 1.85,
                        color: tc ? "#4a4540" : "#c4b498",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: todayDev.exegese
                          .replace(/\*\*\"(.+?)\"\*\*/g, '<strong style="color:' + (tc ? "#1a1714" : "#e8d8b8") + ';">"$1"</strong>')
                          .replace(/\*\*(.+?)\*\*/g, '<strong style="color:' + (tc ? "#1a1714" : "#e8d8b8") + ';">$1</strong>')
                          .replace(/\*(.+?)\*/g, '<em style="color:' + (tc ? "#8b6f4e" : "#C8A55C") + ';">$1</em>')
                          .replace(/\. /g, '.<br/>')
                      }}
                    />
                  </div>
                )}
                <div style={{
                  fontSize: 11, color: tc ? "#aba59e" : "#6a5a48",
                  marginTop: 10, transition: "color .3s",
                }}>
                  Período: {todayDev.period}
                </div>
              </div>
            ) : (
              <div style={{
                background: tc ? "rgba(139,111,78,.05)" : "rgba(200,170,100,.06)",
                border: `1px solid ${tc ? "rgba(139,111,78,.1)" : "rgba(200,170,100,.18)"}`,
                borderRadius: 16, padding: "22px 20px", marginBottom: 24,
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
                  color: tc ? "#8b6f4e" : "#C8A55C",
                  fontWeight: 700, fontFamily: "'Cinzel', serif", marginBottom: 8,
                }}>
                  Devocional de Hoje
                </div>
                <div style={{
                  fontSize: 14, color: tc ? "#aba59e" : "#7a6a58",
                  fontStyle: "italic",
                }}>
                  Sem devocional programado para hoje
                </div>
              </div>
            )}

            {/* ── Exegesis Study Field ── */}
            <div style={{
              background: tc ? "rgba(139,111,78,.04)" : "rgba(200,170,100,.06)",
              border: `1px solid ${tc ? "rgba(139,111,78,.12)" : "rgba(200,170,100,.18)"}`,
              borderRadius: 16, padding: "20px 20px", marginBottom: 28,
              transition: "background .3s, border-color .3s",
            }}>
              <div style={{
                fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
                color: tc ? "#8b6f4e" : "#C8A55C",
                marginBottom: 14, fontWeight: 600, fontFamily: "'Cinzel', serif",
              }}>
                📜 Estudo Exegético
              </div>
              <p style={{
                fontSize: 13, color: tc ? "#6b6560" : "#a09078",
                marginBottom: 14, lineHeight: 1.6,
              }}>
                Envie um versículo e receba uma análise palavra por palavra com o significado original em grego/hebraico.
              </p>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={exegeseVerse}
                  onChange={e => setExegeseVerse(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleExegese(); }}
                  placeholder="Ex: João 3:16, Rm 8:28"
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: 10,
                    border: `1px solid ${tc ? "rgba(0,0,0,.1)" : "rgba(200,170,100,.2)"}`,
                    background: tc ? "#fff" : "rgba(200,170,100,.06)",
                    color: tc ? "#1a1714" : "#e8d8b8",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 17, outline: "none",
                    transition: "border-color .2s, background .3s, color .3s",
                  }}
                />
                <button
                  onClick={handleExegese}
                  disabled={!exegeseVerse.trim() || exegeseLoading}
                  style={{
                    padding: "12px 20px", borderRadius: 10,
                    background: tc ? "rgba(139,111,78,.1)" : "rgba(200,170,100,.12)",
                    border: `1px solid ${tc ? "#8b6f4e" : "#C8A55C"}`,
                    color: tc ? "#8b6f4e" : "#C8A55C",
                    fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: 1,
                    cursor: "pointer", flexShrink: 0,
                    opacity: (!exegeseVerse.trim() || exegeseLoading) ? 0.5 : 1,
                    transition: "all .2s",
                  }}
                >
                  {exegeseLoading ? "⏳" : "Estudar"}
                </button>
              </div>

              {exegeseError && (
                <p style={{ fontSize: 13, color: "#c26b5a", fontStyle: "italic", marginBottom: 8 }}>
                  {exegeseError}
                </p>
              )}

              {exegeseResult && (
                <div style={{
                  background: tc ? "rgba(139,111,78,.03)" : "rgba(200,170,100,.04)",
                  border: `1px solid ${tc ? "rgba(139,111,78,.1)" : "rgba(200,170,100,.1)"}`,
                  borderLeft: `3px solid ${tc ? "#8b6f4e" : "#C8A55C"}`,
                  borderRadius: "0 12px 12px 0",
                  padding: "18px 18px", marginTop: 8,
                }}>
                  <div
                    style={{
                      fontSize: 14, lineHeight: 2,
                      color: tc ? "#4a4540" : "#c4b498",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: exegeseResult.content
                        .split("\n")
                        .map(line => {
                          if (line.startsWith("## ")) return `<h3 style="font-family:'Cinzel',serif;font-size:16px;color:${tc ? "#8b6f4e" : "#C8A55C"};margin:20px 0 8px;font-weight:500;">${line.slice(3)}</h3>`;
                          if (line.startsWith("- ")) {
                            const content = line.slice(2)
                              .replace(/\*\*\"(.+?)\"\*\*/g, `<strong style="color:${tc ? "#1a1714" : "#e8d8b8"};">"$1"</strong>`)
                              .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${tc ? "#1a1714" : "#e8d8b8"};">$1</strong>`)
                              .replace(/\*(.+?)\*/g, `<em style="color:${tc ? "#8b6f4e" : "#C8A55C"};">$1</em>`);
                            return `<div style="display:flex;gap:8px;margin:4px 0;"><span style="color:${tc ? "#8b6f4e" : "#C8A55C"};flex-shrink:0;">•</span><span>${content}</span></div>`;
                          }
                          if (!line.trim()) return "<br/>";
                          const content = line
                            .replace(/\*\*\"(.+?)\"\*\*/g, `<strong style="color:${tc ? "#1a1714" : "#e8d8b8"};">"$1"</strong>`)
                            .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${tc ? "#1a1714" : "#e8d8b8"};">$1</strong>`)
                            .replace(/\*(.+?)\*/g, `<em style="color:${tc ? "#8b6f4e" : "#C8A55C"};">$1</em>`);
                          return `<p style="margin:3px 0;">${content}</p>`;
                        })
                        .join("")
                    }}
                  />
                  {/* Save to notes button */}
                  <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        const noteText = `# Exegese: ${exegeseResult.verse}\n\n${exegeseResult.content}`;
                        const notes = JSON.parse(localStorage.getItem("bible-notes-2026") || "[]");
                        const now = new Date().toISOString();
                        notes.unshift({
                          id: Date.now(),
                          categoria: "devocionais",
                          semana: "",
                          texto: noteText,
                          criadoEm: now,
                          atualizadoEm: now,
                        });
                        localStorage.setItem("bible-notes-2026", JSON.stringify(notes));
                        setSaved(true);
                        setTimeout(() => setSaved(false), 2000);
                      }}
                      style={{
                        flex: 1, padding: "11px", borderRadius: 10,
                        background: tc ? "rgba(139,111,78,.1)" : "rgba(200,170,100,.12)",
                        border: `1px solid ${tc ? "#8b6f4e" : "#C8A55C"}`,
                        color: tc ? "#8b6f4e" : "#C8A55C",
                        fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: 1,
                        textTransform: "uppercase", cursor: "pointer",
                      }}
                    >
                      🔥 Salvar em Devocionais
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exegeseResult.content);
                        setSaved(true);
                        setTimeout(() => setSaved(false), 2000);
                      }}
                      style={{
                        padding: "11px 16px", borderRadius: 10,
                        border: `1px solid ${tc ? "rgba(0,0,0,.08)" : "rgba(200,170,100,.1)"}`,
                        background: "transparent",
                        color: tc ? "#6b6560" : "#8a7d65",
                        fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: 1,
                        textTransform: "uppercase", cursor: "pointer",
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Devotional weeks */}
            <div style={{
              fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
              color: tc ? "#aba59e" : "#8a7a60",
              marginBottom: 16, fontWeight: 600, fontFamily: "'Cinzel', serif",
              transition: "color .3s",
            }}>
              Todos os Devocionais
            </div>
            {DEVOTIONALS.map((week, wi) => (
              <div key={wi} style={{ marginBottom: 24 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", padding: "5px 14px",
                  borderRadius: 20, border: `1px solid ${tc ? "rgba(0,0,0,.08)" : "rgba(200,180,140,.2)"}`,
                  background: tc ? "rgba(0,0,0,.03)" : "rgba(200,180,140,.06)", marginBottom: 12,
                  fontSize: 13, color: tc ? "#6b6560" : "#c4b498",
                  fontWeight: 600, letterSpacing: 0.5,
                  transition: "all .3s",
                }}>
                  {week.period}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                  {week.days.map((d, di) => {
                    const key = `dev-${wi}-${di}`;
                    const isOpen = expandedDev === key;
                    const c = DEV_DAY_COLORS[d.day] ?? "#C8A55C";
                    return (
                      <div key={di} onClick={() => setExpandedDev(isOpen ? null : key)} style={{
                        background: tc ? "rgba(0,0,0,.02)" : "rgba(255,255,255,.025)",
                        border: `1px solid ${isOpen ? c + "40" : (tc ? "rgba(0,0,0,.06)" : "rgba(200,180,140,.08)")}`,
                        borderRadius: 12, padding: "16px", cursor: "pointer",
                        transition: "all .3s ease", position: "relative", overflow: "hidden",
                      }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
                          background: `linear-gradient(90deg,${c},transparent)`, opacity: 0.5 }}/>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, color: c, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                              {d.day}
                            </div>
                            <div style={{
                              fontSize: 15, fontWeight: 600,
                              color: tc ? "#1a1714" : "#e8d8b8",
                              marginBottom: isOpen ? 10 : 0,
                              transition: "color .3s",
                            }}>
                              {d.ref}
                            </div>
                          </div>
                          <span style={{ fontSize: 18, color: tc ? "#aba59e" : "#6a5a48", flexShrink: 0, marginTop: 2 }}>
                            {isOpen ? "−" : "+"}
                          </span>
                        </div>
                        {isOpen && (
                          <div style={{ paddingTop: 8, borderTop: `1px solid ${c}20` }}>
                            {d.verseText && (
                              <div style={{
                                fontSize: 15, lineHeight: 1.8,
                                color: tc ? "#1a1714" : "#e8d8b8",
                                fontStyle: "italic", fontFamily: "'Cormorant Garamond', serif",
                                padding: "10px 14px", marginBottom: 10,
                                background: tc ? "rgba(139,111,78,.04)" : "rgba(200,170,100,.06)",
                                borderLeft: `3px solid ${c}`,
                                borderRadius: "0 8px 8px 0",
                                transition: "color .3s",
                              }}>
                                "{d.verseText}"
                              </div>
                            )}
                            <div style={{
                              fontSize: 13.5, color: tc ? "#6b6560" : "#b0a090", lineHeight: 1.65,
                              marginBottom: 12, transition: "color .3s",
                            }}>
                              {d.summary}
                            </div>
                            {d.exegese && (
                              <div style={{
                                background: tc ? "rgba(139,111,78,.04)" : "rgba(200,170,100,.06)",
                                border: `1px solid ${tc ? "rgba(139,111,78,.1)" : "rgba(200,170,100,.12)"}`,
                                borderLeft: `3px solid ${c}`,
                                borderRadius: "0 10px 10px 0",
                                padding: "14px 16px",
                              }}>
                                <div style={{
                                  fontSize: 9, letterSpacing: 3, textTransform: "uppercase",
                                  color: c, fontWeight: 700, fontFamily: "'Cinzel', serif",
                                  marginBottom: 10,
                                }}>
                                  📜 Exegese — Palavra por Palavra
                                </div>
                                <div
                                  style={{
                                    fontSize: 13, lineHeight: 1.85,
                                    color: tc ? "#4a4540" : "#c4b498",
                                    transition: "color .3s",
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: d.exegese
                                      .replace(/\*\*\"(.+?)\"\*\*/g, '<strong style="color:' + (tc ? "#1a1714" : "#e8d8b8") + ';">"$1"</strong>')
                                      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:' + (tc ? "#1a1714" : "#e8d8b8") + ';">$1</strong>')
                                      .replace(/\*(.+?)\*/g, '<em style="color:' + c + ';">$1</em>')
                                      .replace(/\. /g, '.<br/>')
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── AGENDA TAB ── */}
      {tab === "agenda" && <WeekSchedule />}

      {/* ── ANOTAÇÕES TAB ── */}
      {tab === "anotacoes" && <BibleNotes onTitleChange={setNotesTitle} />}

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "8px 24px 28px", fontSize: 11, color: "#5a4a38", letterSpacing: 2, textTransform: "uppercase" }}>
        18 Semanas • Toda a Bíblia
      </div>

      {/* Save toast */}
      {saved && (
        <div style={{
          position: "fixed", bottom: 20, right: 20,
          background: "rgba(107,142,107,.9)", color: "#fff",
          padding: "10px 18px", borderRadius: 10, fontSize: 13, zIndex: 99,
        }}>✓ Progresso salvo</div>
      )}
    </div>
  );
}
