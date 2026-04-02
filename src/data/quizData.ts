export interface QuizQuestion {
  id: string;
  stageId: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizStage {
  id: number;
  name: string;
  icon: string;
}

export const quizStages: QuizStage[] = [
  { id: 1, name: "Quem é o Espírito Santo", icon: "🕊️" },
  { id: 2, name: "O Espírito e a Trindade", icon: "✝️" },
  { id: 3, name: "O Espírito na Vida de Cristo", icon: "👑" },
  { id: 4, name: "Regeneração e Novo Nascimento", icon: "🔥" },
  { id: 5, name: "Santificação e Fruto do Espírito", icon: "🌿" },
  { id: 6, name: "Os Dons do Espírito", icon: "💎" },
];

export const motivationalPhrases = [
  "O Espírito que começou a boa obra vai completá-la!",
  "Cada resposta é um passo mais perto da verdade.",
  "O Espírito ilumina quem busca com fé.",
  "Pneuma — o sopro de Deus está sobre você!",
  "De glória em glória, o Espírito te transforma.",
  "O mesmo Espírito que pairava sobre as águas, habita em você.",
];

export const quizQuestions: QuizQuestion[] = [
// === ETAPA 1: Quem é o Espírito Santo ===
{
  id: "1-01",
  stageId: 1,
  question: "O que significa o termo 'Pneumatologia'?",
  options: [
    "Estudo dos anjos e suas funções",
    "Estudo da pessoa e obra do Espírito Santo",
    "Estudo das profecias bíblicas",
    "Estudo da oração e intercessão"
  ],
  correctIndex: 1,
  explanation: "Pneumatologia vem do grego 'pneuma' (espírito, sopro) e 'logos' (estudo). É a área da teologia dedicada a estudar a pessoa, os atributos e a obra do Espírito Santo."
},
{
  id: "1-02",
  stageId: 1,
  question: "Qual o significado da palavra hebraica 'ruach' usada para o Espírito?",
  options: [
    "Fogo e poder consumidor",
    "Água viva e purificação",
    "Vento, sopro, alento — movimento e vitalidade",
    "Luz celestial e glória"
  ],
  correctIndex: 2,
  explanation: "A palavra hebraica 'ruach' significa vento, sopro e alento. Ela comunica movimento e vitalidade. A ruach não é uma energia impessoal; é o fôlego divino que comunica existência e propósito."
},
{
  id: "1-03",
  stageId: 1,
  question: "O que o Espírito de Deus estava fazendo em Gênesis 1:2?",
  options: [
    "Descansando antes da criação",
    "Pairava sobre as águas — agente ativo da criação",
    "Conversando com os anjos",
    "Esperando o comando do Pai"
  ],
  correctIndex: 1,
  explanation: "Em Gênesis 1:2, 'o Espírito de Deus pairava sobre as águas'. Desde o primeiro versículo da Bíblia, o Espírito é apresentado como agente ativo da vida e da criação, presente na origem de tudo."
},
{
  id: "1-04",
  stageId: 1,
  question: "Segundo o Salmo 104:30, qual é a ação contínua do Espírito sobre a criação?",
  options: [
    "Ele julga as nações periodicamente",
    "Ele renova a face da terra — mantém tudo o que existe",
    "Ele destrói e recria a cada estação",
    "Ele se retira da criação após completá-la"
  ],
  correctIndex: 1,
  explanation: "'Envias o teu Espírito, e eles são criados; e assim renovas a face da terra.' O Espírito é o agente contínuo da criação e da providência — aquele que sustenta e mantém tudo o que existe."
},
{
  id: "1-05",
  stageId: 1,
  question: "O Espírito Santo é uma força impessoal ou uma Pessoa? O que a Bíblia ensina?",
  options: [
    "Uma energia divina sem personalidade",
    "Uma influência espiritual abstrata",
    "Uma Pessoa divina que fala, ensina, intercede e se entristece",
    "Apenas um modo de Deus agir no mundo"
  ],
  correctIndex: 2,
  explanation: "O Espírito é uma Pessoa divina e relacional. Ele fala (At 13:2), ensina (Jo 14:26), intercede (Rm 8:26), entristece-se (Ef 4:30) e distribui dons conforme quer (1Co 12:11). Essas são ações pessoais."
},
{
  id: "1-06",
  stageId: 1,
  question: "Em Atos 5:3-4, Pedro revela que mentir ao Espírito Santo equivale a:",
  options: [
    "Mentir aos apóstolos",
    "Mentir à igreja",
    "Mentir a Deus — confirmando a divindade do Espírito",
    "Mentir ao próprio coração"
  ],
  correctIndex: 2,
  explanation: "Pedro confronta Ananias: 'Por que mentiste ao Espírito Santo? Não mentiste aos homens, mas a Deus.' Este texto é decisivo para afirmar a divindade do Espírito — Ele é identificado como Deus."
},
{
  id: "1-07",
  stageId: 1,
  question: "Jesus chamou o Espírito Santo de 'Consolador' (parakletos). O que isso revela?",
  options: [
    "Que o Espírito apenas consola em momentos de tristeza",
    "Que Ele caminha ao nosso lado — intercede, instrui e fortalece",
    "Que Ele é inferior ao Pai e ao Filho",
    "Que Ele atua apenas quando pedimos"
  ],
  correctIndex: 1,
  explanation: "Ao chamá-lo de 'Consolador' (parakletos), Jesus revela que o Espírito não apenas age por nós, mas caminha ao nosso lado. Ele intercede, instrui e fortalece — é uma Pessoa relacional presente no íntimo do crente."
},
{
  id: "1-08",
  stageId: 1,
  question: "Qual é a relação entre o Espírito Santo e as Escrituras?",
  options: [
    "O Espírito apenas inspirou a Bíblia no passado, sem agir hoje sobre ela",
    "O Espírito inspirou as Escrituras E hoje ilumina o coração para compreendê-las",
    "O Espírito age independentemente da Bíblia",
    "A Bíblia substituiu o Espírito após o cânon ser fechado"
  ],
  correctIndex: 1,
  explanation: "O mesmo Espírito que inspirou as Escrituras (2Pe 1:21) é quem hoje ilumina o coração do cristão para compreendê-las. Ele é tanto o autor quanto o intérprete da revelação divina."
},
{
  id: "1-09",
  stageId: 1,
  question: "No Antigo Testamento, de quantas formas o Espírito é descrito?",
  options: [
    "Apenas como Espírito de poder",
    "Espírito de sabedoria, profecia, poder e santidade",
    "Apenas como vento e fogo",
    "Apenas como presença de Deus no templo"
  ],
  correctIndex: 1,
  explanation: "Na revelação progressiva do AT, o Espírito é descrito como: Espírito de sabedoria (Êx 31:3), de profecia (Nm 11:25-29), de poder (Jz 6:34) e de santidade (Is 63:10-11)."
},
{
  id: "1-10",
  stageId: 1,
  question: "O profeta Joel profetizou que Deus derramaria Seu Espírito de que forma?",
  options: [
    "Apenas sobre os profetas de Israel",
    "Apenas sobre os sacerdotes no templo",
    "Sobre toda carne — de forma universal",
    "Apenas sobre os reis de Judá"
  ],
  correctIndex: 2,
  explanation: "Em Joel 2:28-29, Deus anuncia que derramará o Seu Espírito sobre toda carne. Essa profecia é a garantia de que a presença de Deus se tornaria universal, atravessando fronteiras de templo, raça e nação."
},
{
  id: "1-11",
  stageId: 1,
  question: "A palavra grega 'pneuma' no Novo Testamento tem o mesmo sentido de 'ruach'. O que significa?",
  options: [
    "Poder e autoridade",
    "Sopro divino que dá vida",
    "Conhecimento secreto",
    "Manifestação visível"
  ],
  correctIndex: 1,
  explanation: "No NT, a palavra grega 'pneuma' carrega o mesmo sentido que 'ruach': o Espírito é o sopro divino que dá vida. Ambos os termos comunicam que o Espírito é a presença viva e ativa de Deus."
},
{
  id: "1-12",
  stageId: 1,
  question: "Segundo 2 Pedro 1:21, como os profetas falaram da parte de Deus?",
  options: [
    "Por sua própria inteligência e estudo",
    "Movidos pelo Espírito Santo",
    "Através de sonhos apenas",
    "Copiando textos de outras nações"
  ],
  correctIndex: 1,
  explanation: "'Homens santos falaram da parte de Deus, movidos pelo Espírito Santo.' A revelação das Escrituras é obra do Espírito — Ele conduz os profetas, ilumina os sábios e revela o coração de Deus ao Seu povo."
},
{
  id: "1-13",
  stageId: 1,
  question: "Qual é o resultado quando o Espírito Santo é honrado na vida da igreja?",
  options: [
    "Apenas manifestações sobrenaturais",
    "Vida, crescimento, arrependimento e santidade",
    "Apenas emocionalismo",
    "Apenas organização institucional"
  ],
  correctIndex: 1,
  explanation: "Onde o Espírito é honrado, há vida, crescimento, arrependimento e santidade. Onde Ele é ignorado, a fé se torna ritual e o cristianismo perde seu poder transformador."
},
{
  id: "1-14",
  stageId: 1,
  question: "Qual é a missão trinitária do Espírito Santo?",
  options: [
    "Ele age sozinho, independente do Pai e do Filho",
    "Ele procede do Pai, é enviado pelo Filho e age para glorificar o Filho",
    "Ele apenas obedece ordens do Pai",
    "Ele substitui Jesus na terra"
  ],
  correctIndex: 1,
  explanation: "A missão do Espírito é trinitária: Ele procede do Pai, é enviado pelo Filho, e age para glorificar o Filho e realizar o plano do Pai. Ele não opera isoladamente, mas em perfeita harmonia com a Trindade."
},
{
  id: "1-15",
  stageId: 1,
  question: "A presença do Espírito Santo é apenas emocional ou transformadora?",
  options: [
    "Apenas emocional e passageira",
    "Transformadora — onde Ele está, há pureza, arrependimento, amor e obediência",
    "Apenas intelectual e doutrinária",
    "Irrelevante para a vida prática"
  ],
  correctIndex: 1,
  explanation: "A presença do Espírito nunca é apenas emocional — é transformadora. Onde Ele está, há pureza, arrependimento, amor e obediência. Ele não veio para entreter, mas para santificar."
},

// === ETAPA 2: O Espírito e a Trindade ===
{
  id: "2-01",
  stageId: 2,
  question: "O que é a 'pericórese' na teologia da Trindade?",
  options: [
    "A ira de Deus contra o pecado",
    "O movimento eterno de amor entre Pai, Filho e Espírito onde habitam um no outro",
    "A descida do Espírito no Pentecostes",
    "A separação entre as três Pessoas"
  ],
  correctIndex: 1,
  explanation: "Pericórese vem de 'peri' (em volta) e 'choreo' (girar, dançar). É a 'dança divina' onde as três Pessoas habitam uma na outra sem confusão, cada uma glorificando e servindo as demais."
},
{
  id: "2-02",
  stageId: 2,
  question: "No batismo de Jesus em Mateus 3:16-17, como as três Pessoas da Trindade aparecem?",
  options: [
    "Apenas Jesus está presente",
    "O Filho é batizado, o Espírito desce como pomba, o Pai declara Seu amor",
    "Apenas o Pai e o Filho estão presentes",
    "As três Pessoas aparecem como fogo"
  ],
  correctIndex: 1,
  explanation: "O batismo de Jesus é uma epifania trinitária: o Filho é batizado, o Espírito desce visivelmente como pomba, e o Pai fala audivelmente do céu declarando Seu amor pelo Filho."
},
{
  id: "2-03",
  stageId: 2,
  question: "Quais atributos divinos a Escritura atribui ao Espírito Santo?",
  options: [
    "Apenas poder e sabedoria",
    "Eternidade, onipresença, onisciência, onipotência e santidade",
    "Apenas santidade",
    "Nenhum atributo exclusivamente divino"
  ],
  correctIndex: 1,
  explanation: "A Escritura atribui ao Espírito: eternidade (Hb 9:14), onipresença (Sl 139:7-8), onisciência (1Co 2:10-11), onipotência (Zc 4:6; Lc 1:35) e santidade (Ef 4:30). Ele possui todos os atributos divinos."
},
{
  id: "2-04",
  stageId: 2,
  question: "O Salmo 139:7-8 ensina qual atributo do Espírito Santo?",
  options: [
    "Sua eternidade",
    "Sua onipresença — não há lugar onde Ele não esteja",
    "Sua onipotência",
    "Sua misericórdia"
  ],
  correctIndex: 1,
  explanation: "'Para onde fugirei do teu Espírito? Para onde irei da tua presença? Se subo aos céus, lá estás; se faço minha cama no Sheol, lá estás também.' O Espírito é onipresente — está em todo lugar."
},
{
  id: "2-05",
  stageId: 2,
  question: "Segundo 1 Coríntios 2:10-11, o que o Espírito Santo conhece?",
  options: [
    "Apenas os pensamentos dos homens",
    "Até as profundezas de Deus — demonstrando Sua onisciência",
    "Apenas o futuro",
    "Apenas as Escrituras"
  ],
  correctIndex: 1,
  explanation: "O Espírito 'perscruta todas as coisas, até mesmo as profundezas de Deus'. Ninguém conhece os pensamentos de Deus senão o Espírito de Deus. Isso demonstra Sua onisciência plena."
},
{
  id: "2-06",
  stageId: 2,
  question: "No Antigo Testamento, a palavra 'ruach' é usada 388 vezes. Quantas vezes ela fala explicitamente 'Espírito Santo'?",
  options: [
    "100 vezes",
    "60 vezes",
    "Apenas 2 vezes (Sl 51:11 e Is 63:10-11)",
    "Nenhuma vez"
  ],
  correctIndex: 2,
  explanation: "Das 388 vezes que 'ruach' aparece no AT, aproximadamente 100 se referem ao Espírito de Deus, mas apenas 2 usam explicitamente o termo 'Espírito Santo': Salmos 51:11 e Isaías 63:10-11."
},
{
  id: "2-07",
  stageId: 2,
  question: "Como a obra do Espírito Santo funcionava sobre as pessoas no Antigo Testamento?",
  options: [
    "Era permanente e sobre todos",
    "Era seletiva, temporária e para propósitos específicos",
    "Era idêntica ao que vemos no Novo Testamento",
    "Não existia — o Espírito só veio no Pentecostes"
  ],
  correctIndex: 1,
  explanation: "No AT, o Espírito era: seletivo (só alguns recebiam), temporário (podia se retirar após a missão), e movido por propósitos específicos. O propósito definia o tempo pelo qual o indivíduo seria usado."
},
{
  id: "2-08",
  stageId: 2,
  question: "Sobre quais tipos de pessoas o Espírito agia no Antigo Testamento?",
  options: [
    "Todos os israelitas igualmente",
    "Juízes, profetas, governantes e artesãos",
    "Apenas os sacerdotes e levitas",
    "Apenas os reis"
  ],
  correctIndex: 1,
  explanation: "No AT, o Espírito agia sobre juízes (Jz 3:10; 6:34), profetas (Elias, Eliseu — 2Rs 2:15), governantes (Moisés, Davi — 1Sm 16) e artesãos (Bezalel — Êx 31:2-6), capacitando-os para missões específicas."
},
{
  id: "2-09",
  stageId: 2,
  question: "Davi pediu a Deus em Salmos 51:11 algo único. O que foi?",
  options: [
    "Que Deus destruísse seus inimigos",
    "Que Deus não retirasse dele o Seu Santo Espírito",
    "Que Deus lhe desse riquezas",
    "Que Deus o fizesse rei de todas as nações"
  ],
  correctIndex: 1,
  explanation: "'Não me expulses da tua presença, nem retires de mim o teu Santo Espírito.' Davi tinha consciência de que o Espírito estava sobre ele para sua missão de vida, e temia perder essa presença."
},
{
  id: "2-10",
  stageId: 2,
  question: "Qual é a grande diferença qualitativa do Espírito no NT comparado ao AT?",
  options: [
    "O Espírito ficou mais poderoso no NT",
    "O Espírito agora habita PERMANENTEMENTE em todos os que pertencem a Cristo",
    "O Espírito passou a agir apenas nos apóstolos",
    "O Espírito parou de dar dons"
  ],
  correctIndex: 1,
  explanation: "No NT, a diferença é qualitativa: o Espírito habita permanentemente nos cristãos (Jo 14:16-17), forma a Igreja (At 2:1-4) e concede dons. Ele não mais vem sobre alguns temporariamente, mas vive em todos os que são de Cristo."
},
{
  id: "2-11",
  stageId: 2,
  question: "No NT, a palavra 'pneuma' aparece 261 vezes referindo-se ao Espírito de Deus. O que isso mostra?",
  options: [
    "Que o NT é menos importante que o AT",
    "Um aumento massivo na ênfase e no trabalho do Espírito a partir da vinda de Jesus",
    "Que o AT ignorava o Espírito",
    "Que os autores repetiam informações"
  ],
  correctIndex: 1,
  explanation: "O NT é cerca de 1/4 do tamanho do AT, mas se refere ao Espírito aproximadamente 4x mais. Isso mostra um aumento não apenas quantitativo, mas qualitativo na obra do Espírito a partir de Jesus."
},
{
  id: "2-12",
  stageId: 2,
  question: "Na obra da salvação (Ef 1:3-14), qual é o papel específico de cada Pessoa da Trindade?",
  options: [
    "Todos fazem a mesma coisa",
    "O Pai planeja e escolhe, o Filho redime e intercede, o Espírito aplica e sela",
    "Apenas o Filho salva, o Pai e o Espírito observam",
    "O Espírito planeja, o Pai executa, o Filho sela"
  ],
  correctIndex: 1,
  explanation: "A salvação é obra do Deus triúno: o Pai planeja e escolhe (Ef 1:3-6), o Filho redime e intercede (Ef 1:7-12), e o Espírito aplica e sela (Ef 1:13-14). Sem o Espírito, não haveria experiência da salvação."
},
{
  id: "2-13",
  stageId: 2,
  question: "Segundo 1 Coríntios 12:13, o que o Espírito Santo faz em relação à Igreja?",
  options: [
    "Divide os crentes em denominações",
    "Batiza todos em um só corpo — unindo crentes diversos",
    "Escolhe apenas os mais santos",
    "Separa judeus de gentios"
  ],
  correctIndex: 1,
  explanation: "'Em um só Espírito todos nós fomos batizados em um corpo.' O Espírito une crentes diversos em um só corpo, formando a Igreja. A comunhão não é construída por afinidade, mas pelo mesmo Espírito habitando em todos."
},
{
  id: "2-14",
  stageId: 2,
  question: "Segundo Romanos 5:5, o que o Espírito Santo derrama em nossos corações?",
  options: [
    "Poder e autoridade",
    "O amor de Deus",
    "Conhecimento intelectual",
    "Medo e reverência apenas"
  ],
  correctIndex: 1,
  explanation: "'O amor de Deus é derramado em nossos corações pelo Espírito Santo.' Esse é o mesmo amor eterno que flui na Trindade (pericórese) agora fluindo dentro de nós. Ser cheio do Espírito é viver nessa corrente de amor."
},
{
  id: "2-15",
  stageId: 2,
  question: "Efésios 4:3 nos exorta a 'preservar a unidade do Espírito pelo vínculo da paz'. O que isso significa?",
  options: [
    "Que devemos concordar em tudo",
    "Que a unidade da Igreja é obra do Espírito e devemos nos esforçar para mantê-la",
    "Que paz significa ausência de conflitos",
    "Que apenas os líderes devem buscar unidade"
  ],
  correctIndex: 1,
  explanation: "A comunhão da Igreja não é construída por afinidade humana, mas pelo mesmo Espírito habitando em todos. Devemos fazer todo esforço para preservar essa unidade que o Espírito já criou."
},

// === ETAPA 3: O Espírito na Vida de Cristo ===
{
  id: "3-01",
  stageId: 3,
  question: "Qual foi o papel do Espírito Santo na concepção de Jesus?",
  options: [
    "Nenhum papel específico",
    "Agente da concepção virginal — criou a humanidade de Cristo sem pecado",
    "Apenas abençoou Maria",
    "Trouxe Jesus do céu fisicamente"
  ],
  correctIndex: 1,
  explanation: "Em Lucas 1:35, o Espírito é o agente da concepção virginal: Ele cria a humanidade de Cristo sem pecado e une a natureza divina à humana no ventre de Maria. É um ato trinitário: o Pai envia, o Espírito concebe, o Filho se faz carne."
},
{
  id: "3-02",
  stageId: 3,
  question: "Como Jesus viveu Sua vida terrena em relação ao Espírito Santo?",
  options: [
    "Usando Sua divindade de forma independente",
    "Em constante dependência do Espírito, como modelo para nós",
    "Sem nenhuma relação com o Espírito",
    "Apenas nos momentos de milagres"
  ],
  correctIndex: 1,
  explanation: "Jesus não recorre a prerrogativas divinas para cumprir sua missão, mas caminha como o Homem do Espírito. Atos 10:38 resume: 'Deus ungiu a Jesus com o Espírito Santo e com poder.' Ele é modelo perfeito de vida no Espírito."
},
{
  id: "3-03",
  stageId: 3,
  question: "O que aconteceu no batismo de Jesus em relação ao Espírito?",
  options: [
    "O Espírito o abandonou temporariamente",
    "O Espírito desceu sobre Ele como pomba, ungindo-o como Messias",
    "Jesus recebeu o Espírito pela primeira vez",
    "O Espírito se transformou em fogo"
  ],
  correctIndex: 1,
  explanation: "No batismo, o Espírito desce visivelmente como pomba, ungindo Jesus como Messias (Mashiach = Ungido). Não marca o início do relacionamento entre Cristo e o Espírito, mas o início de Seu ministério público no poder do Espírito."
},
{
  id: "3-04",
  stageId: 3,
  question: "Em Isaías 61:1, o que o Espírito do Senhor capacitou o Ungido (Messias) a fazer?",
  options: [
    "Conquistar reinos e governar com força",
    "Pregar boas-novas aos quebrantados",
    "Construir o templo de Jerusalém",
    "Escrever as Escrituras"
  ],
  correctIndex: 1,
  explanation: "'O Espírito do Senhor Deus está sobre mim, porque o Senhor me ungiu para pregar boas-novas aos quebrantados.' Jesus cumpriu essa profecia literalmente (Lc 4:18-21), servindo no poder do Espírito."
},
{
  id: "3-05",
  stageId: 3,
  question: "Após o batismo, para onde o Espírito conduziu Jesus e por quê?",
  options: [
    "Para Jerusalém, para iniciar o ministério no templo",
    "Para o deserto, para ser tentado — demonstrando a vitória do novo Adão",
    "Para o Egito, para se esconder",
    "Para a Galileia, para pregar"
  ],
  correctIndex: 1,
  explanation: "O mesmo Espírito que ungiu Jesus o conduz ao deserto (Mt 4:1). Ele é guia soberano, não apenas consolador. Leva Cristo ao lugar da prova para demonstrar a vitória do novo Adão onde o primeiro Adão falhou."
},
{
  id: "3-06",
  stageId: 3,
  question: "A tentação de Jesus no deserto é a antítese (oposto) de qual evento bíblico?",
  options: [
    "O dilúvio de Noé",
    "A queda de Adão no Éden",
    "A travessia do Mar Vermelho",
    "A torre de Babel"
  ],
  correctIndex: 1,
  explanation: "A tentação é a antítese da queda de Adão. O contraste Éden × deserto mostra que o Espírito não evita provações, mas forma caráter nelas. Onde Adão falhou em abundância, Cristo venceu na escassez."
},
{
  id: "3-07",
  stageId: 3,
  question: "Segundo Mateus 12:28, pelo poder de quem Jesus expulsava demônios?",
  options: [
    "Pelo poder angelical",
    "Pela Sua divindade isolada",
    "Pelo Espírito de Deus",
    "Pela oração dos discípulos"
  ],
  correctIndex: 2,
  explanation: "Jesus disse: 'Se eu expulso os demônios pelo Espírito de Deus, é que o Reino de Deus chegou a vós.' Toda obra de Jesus — pregação, cura, libertação — é feita no poder do Espírito Santo."
},
{
  id: "3-08",
  stageId: 3,
  question: "Como Lucas descreve a vida ministerial de Jesus em relação ao Espírito?",
  options: [
    "Jesus usava o Espírito apenas para milagres",
    "Jesus pregava, curava, exultava e orava tudo no poder do Espírito",
    "Jesus agia independente do Espírito",
    "O Espírito só estava presente nos milagres"
  ],
  correctIndex: 1,
  explanation: "Lucas mostra Jesus pregando 'no poder do Espírito' (Lc 4:14-18), curando 'pelo Espírito de Deus' (Mt 12:28), exultando 'no Espírito' (Lc 10:21) e orando 'cheio do Espírito' (Lc 3:21-22). Toda a Sua vida era no Espírito."
},
{
  id: "3-09",
  stageId: 3,
  question: "O Espírito Santo abandonou Jesus na cruz?",
  options: [
    "Sim, Jesus ficou completamente só",
    "Não — o Espírito sustentou o sacrifício de Cristo (Hb 9:14)",
    "O Espírito foi embora antes da crucificação",
    "A Bíblia não fala sobre isso"
  ],
  correctIndex: 1,
  explanation: "Hebreus 9:14 diz que Cristo se ofereceu 'pelo Espírito eterno'. O sacrifício é trinitário: o Filho se entrega, o Pai recebe, o Espírito sustenta. Mesmo na agonia da cruz, o Espírito não o abandona."
},
{
  id: "3-10",
  stageId: 3,
  question: "Segundo Romanos 8:11, qual é o papel do Espírito na ressurreição de Jesus?",
  options: [
    "Nenhum — Jesus ressuscitou por conta própria",
    "O Espírito que ressuscitou Jesus é o mesmo que habita nos crentes e vivificará nossos corpos",
    "O Espírito apenas testemunhou a ressurreição",
    "Anjos o ressuscitaram"
  ],
  correctIndex: 1,
  explanation: "'Se o Espírito daquele que ressuscitou Jesus habita em vós, vivificará também os vossos corpos mortais.' O Espírito é o poder da nova criação manifestado na ressurreição — e esse mesmo Espírito vive em nós."
},
{
  id: "3-11",
  stageId: 3,
  question: "Em João 20:22, Jesus sopra sobre os discípulos. Isso é um eco de qual evento do AT?",
  options: [
    "O sopro que dividiu o Mar Vermelho",
    "Gênesis 2:7 — quando Deus soprou vida em Adão",
    "O vento que secou o dilúvio",
    "O sopro que derrubou os muros de Jericó"
  ],
  correctIndex: 1,
  explanation: "Jesus sopra sobre os discípulos dizendo 'Recebei o Espírito Santo'. É eco de Gênesis 2:7 — o mesmo Deus que soprou vida natural em Adão agora sopra nova vida espiritual em Seus seguidores."
},
{
  id: "3-12",
  stageId: 3,
  question: "O que acontece com o Espírito após a exaltação de Cristo?",
  options: [
    "O Espírito volta para o céu com Jesus",
    "O Espírito que habitava em Cristo é compartilhado com toda a Igreja",
    "O Espírito deixa de atuar",
    "O Espírito fica apenas com os apóstolos"
  ],
  correctIndex: 1,
  explanation: "O Cristo exaltado é o Cristo que distribui o Espírito. No Pentecostes, o Espírito que repousava sobre Jesus é derramado sobre todos os crentes. A missão do Espírito continua agora através do corpo de Cristo, a Igreja."
},
{
  id: "3-13",
  stageId: 3,
  question: "O que significa 'Mashiach' (Messias/Cristo)?",
  options: [
    "Salvador",
    "Ungido — aquele sobre quem o Espírito foi derramado",
    "Profeta",
    "Rei dos reis"
  ],
  correctIndex: 1,
  explanation: "Mashiach (Messias em hebraico, Cristo em grego) significa 'Ungido'. Jesus é o Ungido por excelência — aquele sobre quem o Espírito foi derramado para capacitá-lo para Sua missão redentora."
},
{
  id: "3-14",
  stageId: 3,
  question: "Ser cheio do Espírito, à luz da vida de Jesus, significa:",
  options: [
    "Buscar experiências sobrenaturais constantes",
    "Refletir Jesus — Suas palavras, mansidão e dependência do Pai",
    "Ter poderes especiais visíveis",
    "Não precisar mais da Bíblia"
  ],
  correctIndex: 1,
  explanation: "Ser cheio do Espírito não é buscar experiências, mas refletir Jesus. Assim como o Espírito moldou a humanidade de Cristo, Ele molda em nós o caráter de Cristo (Gl 4:19). A vida cheia do Espírito é cristocêntrica."
},
{
  id: "3-15",
  stageId: 3,
  question: "A presença do Espírito na vida do cristão garante conforto ou fidelidade?",
  options: [
    "Garante conforto e prosperidade",
    "Garante fidelidade — Ele nos guia por caminhos de obediência, não necessariamente de conforto",
    "Garante que nunca teremos problemas",
    "Garante apenas saúde física"
  ],
  correctIndex: 1,
  explanation: "Assim como o Espírito conduziu Jesus ao deserto, Ele nos conduz para formar caráter. A presença do Espírito não garante conforto, mas fidelidade. Ele nos faz viver no poder da ressurreição (Rm 8:11)."
},

// === ETAPA 4: Regeneração e Novo Nascimento ===
{
  id: "4-01",
  stageId: 4,
  question: "Segundo João 3:5, o que é necessário para entrar no Reino de Deus?",
  options: [
    "Frequentar uma igreja e fazer boas obras",
    "Nascer da água e do Espírito",
    "Ser batizado por imersão apenas",
    "Estudar toda a Bíblia"
  ],
  correctIndex: 1,
  explanation: "Jesus disse a Nicodemos: 'Se alguém não nascer da água e do Espírito, não pode entrar no Reino de Deus.' A regeneração é a obra pela qual o Espírito cria vida espiritual onde antes havia morte."
},
{
  id: "4-02",
  stageId: 4,
  question: "O que significa a palavra 'mortos' em Efésios 2:1 — 'mortos em vossos delitos e pecados'?",
  options: [
    "Fisicamente doentes",
    "Espiritualmente mortos — totalmente incapazes de responder a Deus por si mesmos",
    "Socialmente excluídos",
    "Apenas tristes e desanimados"
  ],
  correctIndex: 1,
  explanation: "A morte espiritual é a incapacidade total de responder a Deus. Por isso a regeneração não é um convite para reagirmos — é um milagre sobrenatural que nos desperta para a vida espiritual."
},
{
  id: "4-03",
  stageId: 4,
  question: "Em Ezequiel 36:26-27, Deus promete dar ao Seu povo:",
  options: [
    "Um reino terreno e prosperidade",
    "Um coração novo e um espírito novo, substituindo o coração de pedra",
    "Apenas perdão dos pecados passados",
    "Um templo maior e mais bonito"
  ],
  correctIndex: 1,
  explanation: "Esse é o coração da nova aliança: o Espírito substitui o coração de pedra por um coração sensível, obediente e vivo. A regeneração já era promessa desde os profetas do AT."
},
{
  id: "4-04",
  stageId: 4,
  question: "Jesus compara a ação do Espírito na regeneração ao vento (Jo 3:8). Por quê?",
  options: [
    "Porque o Espírito é destrutivo como um furacão",
    "Porque a regeneração é obra soberana e invisível — como o vento que não se controla",
    "Porque o vento é fraco e imperceptível",
    "Porque o Espírito age apenas na natureza"
  ],
  correctIndex: 1,
  explanation: "Jesus disse: 'O vento sopra onde quer... assim é todo aquele que é nascido do Espírito.' A regeneração é obra soberana e invisível do Espírito — não controlamos quando ou como Ele age."
},
{
  id: "4-05",
  stageId: 4,
  question: "A regeneração é comparada ao 'faça-se a luz' de Gênesis. O que isso significa?",
  options: [
    "Que é uma ilusão óptica",
    "Que é o início da nova criação na alma — Deus fala no caos do nosso coração e surge vida",
    "Que acontece apenas de dia",
    "Que é visível fisicamente"
  ],
  correctIndex: 1,
  explanation: "Assim como Deus falou 'faça-se a luz' no caos de Gênesis, o Espírito fala no caos do nosso coração — e surge vida. A regeneração é o início da nova criação, mudando a essência do ser."
},
{
  id: "4-06",
  stageId: 4,
  question: "Nicodemos era um fariseu religioso. Por que Jesus disse que ele precisava nascer de novo?",
  options: [
    "Porque Nicodemos era um pecador declarado",
    "Porque religião e sinceridade não substituem a regeneração pelo Espírito",
    "Porque Nicodemos era de outra religião",
    "Porque Nicodemos não conhecia as Escrituras"
  ],
  correctIndex: 1,
  explanation: "Nicodemos representa todo religioso sincero que ainda não nasceu do Espírito. Jesus o confronta com verdade desconcertante: a religião, por mais devota, não substitui a regeneração sobrenatural."
},
{
  id: "4-07",
  stageId: 4,
  question: "O Espírito Santo convence o mundo de três coisas. Quais são?",
  options: [
    "Amor, esperança e fé",
    "Pecado, justiça e juízo",
    "Passado, presente e futuro",
    "Corpo, alma e espírito"
  ],
  correctIndex: 1,
  explanation: "Em João 16:7-11, Jesus ensina que o Espírito convence: do pecado (separação de Deus), da justiça (a retidão de Cristo), e do juízo (o governante deste mundo já está julgado e condenado)."
},
{
  id: "4-08",
  stageId: 4,
  question: "Quando o Espírito convence do 'pecado', o que exatamente Ele revela?",
  options: [
    "Uma lista de regras a seguir",
    "A consciência do abismo de separação entre o homem e Deus",
    "Apenas os pecados dos outros",
    "Que o pecado não é tão sério"
  ],
  correctIndex: 1,
  explanation: "O Espírito expõe a separação entre o homem e Deus, trazendo consciência desse abismo e dos atos que o causam. Ele age como uma lanterna, expondo a perversidade e chamando ao arrependimento."
},
{
  id: "4-09",
  stageId: 4,
  question: "Quando o Espírito convence da 'justiça', Ele revela que a verdadeira justiça é:",
  options: [
    "A bondade natural do homem",
    "As boas obras religiosas",
    "A retidão de Cristo, Sua identidade como Filho de Deus, digno de toda honra",
    "O sistema legal humano"
  ],
  correctIndex: 2,
  explanation: "O mundo quer determinar sua própria 'verdade' (Is 64:6), mas o Espírito revela a retidão de Cristo — Sua identidade como Filho de Deus, um com o Pai, digno de toda honra, glória e adoração."
},
{
  id: "4-10",
  stageId: 4,
  question: "Quando o Espírito convence do 'juízo', o que Ele testemunha?",
  options: [
    "Que não haverá julgamento final",
    "Que o governante deste mundo (Satanás) já está julgado e condenado",
    "Que todos serão salvos automaticamente",
    "Que apenas os ímpios serão julgados"
  ],
  correctIndex: 1,
  explanation: "O Espírito testemunha que o governante deste mundo já está julgado. Todos os que seguem esse governante maligno e não se voltam para o verdadeiro Rei serão julgados como ele."
},
{
  id: "4-11",
  stageId: 4,
  question: "Ao nascer de novo, o que acontece com o crente em relação a Cristo?",
  options: [
    "Torna-se igual a Cristo em natureza",
    "É enxertado/unido a Cristo — tudo que é d'Ele se torna herança do crente",
    "Perde sua identidade pessoal",
    "Apenas recebe uma segunda chance"
  ],
  correctIndex: 1,
  explanation: "A regeneração não é apenas um evento isolado; é uma união com Cristo. Ao nascer de novo, somos enxertados em Cristo e tudo o que é d'Ele se torna nossa herança eterna."
},
{
  id: "4-12",
  stageId: 4,
  question: "Qual é a relação entre a cruz e o Espírito na salvação?",
  options: [
    "São independentes um do outro",
    "A cruz e o Espírito são inseparáveis — a cruz redime, o Espírito aplica",
    "Apenas a cruz importa, o Espírito é opcional",
    "O Espírito substitui a cruz"
  ],
  correctIndex: 1,
  explanation: "A cruz e o Espírito são inseparáveis: o sangue de Cristo limpa e redime; o Espírito vivifica e aplica em nós o que Cristo conquistou por nós na cruz."
},
{
  id: "4-13",
  stageId: 4,
  question: "Quais são as evidências bíblicas de que alguém nasceu de novo?",
  options: [
    "Riqueza, saúde e sucesso",
    "Amor pela verdade, desejo de santidade, sensibilidade ao pecado, amor pelos irmãos",
    "Falar em línguas e fazer milagres apenas",
    "Frequência à igreja e dízimo"
  ],
  correctIndex: 1,
  explanation: "As evidências são: amor pela verdade (1Jo 2:20-29), desejo de santidade (1Jo 3:9), sensibilidade ao pecado, amor pelos irmãos (1Jo 4:7), e o testemunho interior do Espírito (Rm 8:16)."
},
{
  id: "4-14",
  stageId: 4,
  question: "O sinal do novo nascimento é perfeição ou algo diferente?",
  options: [
    "Perfeição absoluta e ausência de pecado",
    "Uma nova disposição — o coração agora se inclina para Deus, mesmo com lutas",
    "Nunca mais errar",
    "Poder sobrenatural visível"
  ],
  correctIndex: 1,
  explanation: "O sinal não é perfeição, mas uma nova disposição — o coração agora se inclina para Deus. Regeneração não é ausência de luta, mas presença de vida. Onde há vida, há crescimento e fome espiritual."
},
{
  id: "4-15",
  stageId: 4,
  question: "Segundo 2 Pedro 1:4, a regeneração nos torna participantes de quê?",
  options: [
    "Da glória dos anjos",
    "Da natureza divina — não como deuses, mas como filhos",
    "Do poder cósmico",
    "Da onisciência de Deus"
  ],
  correctIndex: 1,
  explanation: "A regeneração nos torna participantes da natureza divina (2Pe 1:4), não como deuses, mas como filhos de Deus. O novo nascimento não termina no perdão — culmina em transformação real e formação de caráter."
},

// === ETAPA 5: Santificação e Fruto do Espírito ===
{
  id: "5-01",
  stageId: 5,
  question: "O que é a santificação na vida do cristão?",
  options: [
    "Tornar-se perfeito instantaneamente no batismo",
    "O processo pelo qual o Espírito conforma o cristão à imagem de Cristo",
    "Uma experiência única que não se repete",
    "Apenas parar de cometer pecados externos"
  ],
  correctIndex: 1,
  explanation: "A santificação é o processo contínuo pelo qual o Espírito Santo conforma o cristão à imagem de Cristo. É o objetivo supremo da obra do Espírito — transformação moral profunda, não entretenimento espiritual."
},
{
  id: "5-02",
  stageId: 5,
  question: "O que o Espírito faz na obra da santificação?",
  options: [
    "Apenas nos dá regras para seguir",
    "Convence do pecado, purifica o coração, renova a mente, fortalece o homem interior e produz o caráter de Cristo",
    "Apenas perdoa nossos pecados",
    "Nos torna incapazes de pecar"
  ],
  correctIndex: 1,
  explanation: "O Espírito convence do pecado (Jo 16:8), purifica o coração (Tt 3:5), renova a mente (Rm 12:2), fortalece o homem interior (Ef 3:16) e produz o caráter de Cristo em nós (Gl 5:22-23)."
},
{
  id: "5-03",
  stageId: 5,
  question: "Gálatas 4:19 diz que o propósito da santificação é:",
  options: [
    "Que sejamos ricos e prósperos",
    "Que Cristo seja formado em nós",
    "Que sejamos famosos por nossa fé",
    "Que nunca mais soframos"
  ],
  correctIndex: 1,
  explanation: "Santificação é o processo de Cristo sendo formado em nós (Gl 4:19). O Espírito não cria algo novo em essência, mas restaura o que o pecado deformou. A santidade é vida com forma de Cristo."
},
{
  id: "5-04",
  stageId: 5,
  question: "A santificação é alcançada por força de vontade humana?",
  options: [
    "Sim, depende exclusivamente do esforço humano",
    "Não, é alcançada por dependência constante do Espírito Santo",
    "Sim, com disciplina rigorosa apenas",
    "Não importa a atitude, acontece automaticamente"
  ],
  correctIndex: 1,
  explanation: "A santificação não é alcançada por força de vontade, mas por dependência constante do Espírito. Isso torna a santificação orgânica e espiritual, não mecânica ou legalista."
},
{
  id: "5-05",
  stageId: 5,
  question: "Gálatas 5:17 descreve um conflito na vida cristã. Qual é?",
  options: [
    "Entre Deus e Satanás externamente",
    "Entre a carne e o Espírito dentro do crente",
    "Entre o AT e o NT",
    "Entre diferentes igrejas"
  ],
  correctIndex: 1,
  explanation: "Gálatas 5:17 descreve a tensão entre carne e Espírito. O Espírito não apaga a luta interior — Ele muda o lado que vence. A carne quer autonomia; o Espírito gera dependência de Deus."
},
{
  id: "5-06",
  stageId: 5,
  question: "Segundo 2 Coríntios 3:17, a liberdade no Espírito significa:",
  options: [
    "Fazer o que quisermos sem consequências",
    "Não ter mais nenhuma regra ou limite",
    "Capacidade de obedecer a Deus com alegria — querer o que Deus quer",
    "Liberdade de toda autoridade"
  ],
  correctIndex: 2,
  explanation: "Ser livre no Espírito não é fazer o que queremos, mas finalmente querer o que Deus quer. Essa liberdade não é ausência de limites, mas capacidade de obedecer com alegria."
},
{
  id: "5-07",
  stageId: 5,
  question: "Quantos são os frutos do Espírito listados em Gálatas 5:22-23?",
  options: [
    "7 frutos",
    "9 frutos",
    "12 frutos",
    "10 frutos"
  ],
  correctIndex: 1,
  explanation: "São 9: amor, alegria, paz, paciência, benignidade, bondade, fidelidade, mansidão e domínio próprio. O texto fala de 'fruto' no singular porque é o caráter unificado de Cristo, não qualidades isoladas."
},
{
  id: "5-08",
  stageId: 5,
  question: "Por que Paulo usa 'fruto' no singular e não 'frutos' no plural?",
  options: [
    "Foi um erro de tradução",
    "Porque o Espírito produz o caráter unificado de Jesus, não virtudes desconectadas",
    "Porque só importa um deles",
    "Porque o amor é o único que conta"
  ],
  correctIndex: 1,
  explanation: "O texto fala de fruto no singular porque o Espírito não produz qualidades desconectadas, mas o caráter unificado de Jesus. É uma única realidade multifacetada: a vida de Cristo se manifestando em nós."
},
{
  id: "5-09",
  stageId: 5,
  question: "Amor, alegria e paz — a primeira tríade do fruto — referem-se a:",
  options: [
    "Nosso relacionamento com o próximo",
    "Nosso relacionamento com Deus",
    "Nosso relacionamento consigo mesmo",
    "Nosso relacionamento com a natureza"
  ],
  correctIndex: 1,
  explanation: "As três tríades do fruto: amor, alegria e paz referem-se ao relacionamento com Deus; paciência, amabilidade e bondade ao relacionamento com o próximo; fidelidade, mansidão e domínio próprio a nós mesmos."
},
{
  id: "5-10",
  stageId: 5,
  question: "Paciência, amabilidade e bondade — a segunda tríade — referem-se a:",
  options: [
    "Nosso relacionamento com Deus",
    "Nosso relacionamento com o próximo",
    "Nosso relacionamento consigo mesmo",
    "Nosso relacionamento com o dinheiro"
  ],
  correctIndex: 1,
  explanation: "A segunda tríade — paciência, amabilidade e bondade — diz respeito ao nosso relacionamento com o próximo. São qualidades que se manifestam na convivência e no serviço aos outros."
},
{
  id: "5-11",
  stageId: 5,
  question: "Fidelidade, mansidão e domínio próprio — a terceira tríade — referem-se a:",
  options: [
    "Nosso relacionamento com Deus",
    "Nosso relacionamento com o próximo",
    "Nosso relacionamento consigo mesmo — governo interior",
    "Nosso relacionamento com os anjos"
  ],
  correctIndex: 2,
  explanation: "A terceira tríade — fidelidade, mansidão e domínio próprio — trata do relacionamento com nós mesmos: o governo interior, a disciplina pessoal e a integridade de caráter."
},
{
  id: "5-12",
  stageId: 5,
  question: "O fruto do Espírito pode ser imitado por esforço humano apenas?",
  options: [
    "Sim, com bastante disciplina qualquer pessoa consegue",
    "Não — são evidências do trabalho interior de Deus que não podem ser imitadas por meros esforços humanos",
    "Sim, são virtudes universais",
    "Não precisa do Espírito, basta querer"
  ],
  correctIndex: 1,
  explanation: "Os frutos do Espírito são evidências do trabalho interior de Deus e não podem ser imitados por meros esforços humanos. Têm origem sobrenatural, mas crescimento natural e gradual."
},
{
  id: "5-13",
  stageId: 5,
  question: "Segundo 2 Coríntios 3:18, como acontece a transformação do cristão?",
  options: [
    "De uma vez só, instantaneamente",
    "De glória em glória, progressivamente, pela ação do Espírito",
    "Apenas no momento da morte",
    "Somente por rituais religiosos"
  ],
  correctIndex: 1,
  explanation: "A santificação é o processo de sermos transformados 'de glória em glória' (2Co 3:18). É o milagre cotidiano do Espírito — invisível, paciente, constante e progressivo."
},
{
  id: "5-14",
  stageId: 5,
  question: "A santificação acontece de forma solitária ou em comunidade?",
  options: [
    "Exclusivamente solitária — cada um com Deus",
    "Em comunidade — o Espírito nos santifica dentro do corpo de Cristo",
    "Não faz diferença o contexto",
    "Apenas em retiros espirituais isolados"
  ],
  correctIndex: 1,
  explanation: "A santificação não é solitária (Ef 5:21). Ninguém amadurece fora da comunhão. A mesma presença que transforma o indivíduo molda também a comunidade. O Espírito nos santifica dentro do corpo de Cristo."
},
{
  id: "5-15",
  stageId: 5,
  question: "Na vida prática, onde o Espírito atua na santificação?",
  options: [
    "Apenas nos cultos e momentos de oração",
    "No trabalho (integridade), família (paciência), decisões (discernimento) e tentações (domínio próprio)",
    "Apenas nas missões e evangelismo",
    "Apenas na leitura bíblica"
  ],
  correctIndex: 1,
  explanation: "O Espírito é prático: no trabalho ensina integridade, na família produz paciência e perdão, nas decisões traz discernimento, nas tentações dá domínio próprio. A verdadeira espiritualidade é prática."
},

// === ETAPA 6: Os Dons do Espírito ===
{
  id: "6-01",
  stageId: 6,
  question: "O que significa 'charismata' em grego, o termo usado para dons espirituais?",
  options: [
    "Poderes sobrenaturais exclusivos",
    "Talentos naturais herdados",
    "Expressões da graça de Deus",
    "Capacidades humanas desenvolvidas"
  ],
  correctIndex: 2,
  explanation: "'Charismata' significa 'expressões da graça'. Os dons não são recompensas por santidade nem talentos naturais, mas capacitações sobrenaturais dadas pela graça de Deus para edificar o corpo de Cristo."
},
{
  id: "6-02",
  stageId: 6,
  question: "Qual a diferença entre o fruto do Espírito e os dons do Espírito?",
  options: [
    "São a mesma coisa com nomes diferentes",
    "O fruto trata do que SOMOS (caráter), os dons do que FAZEMOS (serviço) para o bem comum",
    "O fruto é para líderes, os dons para leigos",
    "Os dons são mais importantes que o fruto"
  ],
  correctIndex: 1,
  explanation: "Enquanto o fruto trata do que somos (caráter de Cristo em nós), os dons tratam do que fazemos em cooperação com o Espírito para o bem comum. Um é formação interior, outro é capacitação para serviço."
},
{
  id: "6-03",
  stageId: 6,
  question: "Segundo 1 Coríntios 12:7, a manifestação do Espírito é dada a cada um visando:",
  options: [
    "A glória pessoal de quem recebe",
    "O bem comum — a edificação de todos",
    "A competição entre crentes",
    "Apenas a salvação individual"
  ],
  correctIndex: 1,
  explanation: "'A manifestação do Espírito é concedida a cada um visando ao bem comum.' Os dons existem para servir, encorajar e fortalecer a Igreja, não para exibição pessoal."
},
{
  id: "6-04",
  stageId: 6,
  question: "Existem cristãos sem dons espirituais?",
  options: [
    "Sim, muitos cristãos não recebem nenhum dom",
    "Não — todo cristão recebe dons; há apenas dons ainda não descobertos ou desenvolvidos",
    "Apenas pastores e missionários recebem dons",
    "Dons cessaram após os apóstolos"
  ],
  correctIndex: 1,
  explanation: "'A cada um é dada a manifestação do Espírito' (1Co 12:7). Não há cristãos sem dons — há apenas dons ainda não descobertos ou não desenvolvidos. Cada crente é equipado para servir."
},
{
  id: "6-05",
  stageId: 6,
  question: "Quem decide qual dom cada pessoa recebe?",
  options: [
    "A própria pessoa escolhe",
    "O pastor da igreja designa",
    "O Espírito Santo distribui individualmente como quer",
    "É determinado pelo batismo"
  ],
  correctIndex: 2,
  explanation: "'O mesmo Espírito opera tudo, distribuindo a cada um individualmente como quer' (1Co 12:11). É o Espírito Santo quem decide soberanamente a distribuição dos dons."
},
{
  id: "6-06",
  stageId: 6,
  question: "O que é a Palavra de Sabedoria como dom espiritual?",
  options: [
    "Inteligência acadêmica superior",
    "Aplicação inspirada e prática da verdade divina a uma situação específica",
    "Capacidade de pregar longos sermões",
    "Conhecimento de todas as respostas"
  ],
  correctIndex: 1,
  explanation: "A Palavra de Sabedoria é a aplicação inspirada e prática da verdade divina a uma situação específica. Não é sabedoria humana, mas discernimento sobrenatural sobre como agir. Exemplo: Tiago no concílio de Atos 15."
},
{
  id: "6-07",
  stageId: 6,
  question: "O que é a Palavra de Conhecimento como dom espiritual?",
  options: [
    "Saber tudo sobre todos",
    "Uma revelação pontual de um fato oculto, dada para consolar, advertir ou confirmar a fé",
    "Decorar toda a Bíblia",
    "Ter diploma em teologia"
  ],
  correctIndex: 1,
  explanation: "É uma revelação pontual de algo oculto, dada pelo Espírito para consolar, advertir ou confirmar a fé. Exemplo: Jesus com a mulher samaritana (Jo 4:16-19). Deve ser testado e comunicado com humildade."
},
{
  id: "6-08",
  stageId: 6,
  question: "Qual é o propósito da profecia segundo 1 Coríntios 14:3?",
  options: [
    "Prever datas e eventos futuros",
    "Edificação, encorajamento e consolo",
    "Condenar e julgar pecadores",
    "Revelar segredos pessoais publicamente"
  ],
  correctIndex: 1,
  explanation: "A profecia é falar sob inspiração do Espírito para edificação, encorajamento e consolo (1Co 14:3). Não é infalível como a Escritura, mas direção viva do Espírito para formar, não para impressionar."
},
{
  id: "6-09",
  stageId: 6,
  question: "Quais são os critérios bíblicos para avaliar se uma profecia é de Deus?",
  options: [
    "Se a pessoa que profetiza é famosa",
    "Se alinha-se à Escritura, exalta Cristo, produz fruto do Espírito e promove paz",
    "Se causa arrepios e emoção forte",
    "Se a maioria concorda"
  ],
  correctIndex: 1,
  explanation: "Critérios: alinha-se à Escritura? Exalta Cristo? Produz fruto do Espírito? Promove paz e edificação? Toda profecia deve ser julgada pela comunidade: 'Retenham o que é bom' (1Ts 5:21)."
},
{
  id: "6-10",
  stageId: 6,
  question: "Qual a diferença entre o uso privado e público do dom de línguas?",
  options: [
    "Não existe diferença nenhuma",
    "Privadamente edifica quem ora; publicamente precisa de interpretação para edificar o corpo",
    "Privadamente é proibido; publicamente é obrigatório",
    "Línguas são apenas para uso público"
  ],
  correctIndex: 1,
  explanation: "Privadamente, edifica quem ora (1Co 14:4). Publicamente, edifica o corpo quando interpretada (1Co 14:5,27-28). O Espírito é de ordem: 'Tudo seja feito decentemente e com ordem' (1Co 14:40)."
},
{
  id: "6-11",
  stageId: 6,
  question: "O dom de fé é igual à fé salvadora que todo cristão possui?",
  options: [
    "Sim, é exatamente a mesma fé",
    "Não — é uma confiança extraordinária e sobrenatural para momentos específicos",
    "Não existe dom de fé separado",
    "É uma fé menor que a fé salvadora"
  ],
  correctIndex: 1,
  explanation: "O dom de fé não é a fé salvadora comum a todos, mas uma confiança extraordinária para momentos específicos — ativada quando o Espírito planta convicção interior de que Deus vai agir."
},
{
  id: "6-12",
  stageId: 6,
  question: "Por que Paulo usa o PLURAL 'dons de curar' (charismata iamaton)?",
  options: [
    "Erro de tradução dos manuscritos",
    "Porque sugere múltiplas formas de cura: física, emocional e espiritual",
    "Porque há muitos curadores diferentes",
    "Porque são dons diferentes para cada doença"
  ],
  correctIndex: 1,
  explanation: "O plural sugere múltiplas maneiras pelas quais Deus cura: física, emocional e espiritual. O dom não é propriedade do curador, mas ação soberana do Espírito por meio de quem se dispõe."
},
{
  id: "6-13",
  stageId: 6,
  question: "Os milagres são 'provas' para convencer céticos ou têm outro propósito?",
  options: [
    "São provas científicas da existência de Deus",
    "São sinais do Reino que apontam para Jesus — não provas, mas evidências de Sua soberania",
    "São para entretenimento da igreja",
    "São apenas fenômenos naturais explicados incorretamente"
  ],
  correctIndex: 1,
  explanation: "Milagres não são 'provas' para céticos, mas sinais do Reino que apontam para Jesus. São evidências do domínio de Cristo sobre a criação, enfermidades e forças do mal — amostras do Reino que virá."
},
{
  id: "6-14",
  stageId: 6,
  question: "Paulo coloca o capítulo do amor (1Co 13) no meio dos capítulos sobre dons (1Co 12 e 14). Por quê?",
  options: [
    "Para mostrar que os dons devem ser abolidos",
    "Para mostrar que o amor é o ambiente, a motivação e o critério de validade de todo dom",
    "Para dizer que o amor substitui os dons",
    "Foi apenas uma questão de organização do texto"
  ],
  correctIndex: 1,
  explanation: "O amor é o contexto, a motivação e o critério de validade de todo dom espiritual. Sem amor, os dons perdem propósito: 'Ainda que eu fale as línguas dos homens e dos anjos, se não tiver amor, serei como bronze que soa.'"
},
{
  id: "6-15",
  stageId: 6,
  question: "Segundo 1 Pedro 4:10, como devemos administrar os dons que recebemos?",
  options: [
    "Guardando para uso pessoal e crescimento próprio",
    "Como bons despenseiros da multiforme graça de Deus — servindo uns aos outros",
    "Escondendo para não causar inveja",
    "Usando apenas nos cultos dominicais"
  ],
  correctIndex: 1,
  explanation: "'Administrem os dons recebidos como bons despenseiros da multiforme graça de Deus.' Cada dom é uma janela por onde a graça entra e a glória de Deus se reflete no meio do Seu povo."
}
];
