import { Prisma } from "@prisma/client";
import prisma from "../prisma";

/**
 * Seeds Round 1: Individual Game questions
 * 36 questions across 4 sections (3 question types × 3 questions × 4 sections)
 * Question types: FILL_IN_THE_BLANKS, MATCHING, MULTIPLE_CHOICE
 */
export async function seedRound1(competitionId: string): Promise<void> {
  const round = await prisma.round.create({
    data: {
      competitionId,
      orderIndex: 1,
      type: "STANDARD",
      title: "Round 1: Individual game",
    },
  });

  const questions: Prisma.QuestionCreateManyInput[] = [];

  // ==========================================
  // Section 1
  // ==========================================
  questions.push(
    // FILL_IN_THE_BLANKS Questions (3 per section)
    {
      roundId: round.id,
      index: 0,
      questionText: "Примерен въпрос",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 0,
      content: {
        text: "Докато Данаил и приятелите му се обучават в(ъв) {0} империя, те отказват да ядат от изрядните ястия на царя и ядат само {1} и пият {2}.",
        blanks: [
          {
            options: [
              { value: "Вавилонската", isCorrect: true },
              { value: "Персийската", isCorrect: false },
              { value: "Римската", isCorrect: false },
              { value: "Османската", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "зеленчуци", isCorrect: true },
              { value: "агнешко", isCorrect: false },
              { value: "жито", isCorrect: false },
              { value: "мед", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "вода", isCorrect: true },
              { value: "вино", isCorrect: false },
              { value: "оцет", isCorrect: false },
              { value: "миро", isCorrect: false },
            ],
          },
        ],
      },
      section: "1",
    },
    {
      roundId: round.id,
      index: 1,
      questionText: "Разказ за Данаил и приятелите му",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Докато Данаил и приятелите му се обучават в(ъв) {0} империя, те отказват да ядат от изрядните ястия на царя и ядат само {1} и пият {2}.",
        blanks: [
          {
            options: [
              { value: "Вавилонската", isCorrect: true },
              { value: "Персийската", isCorrect: false },
              { value: "Римската", isCorrect: false },
              { value: "Османската", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "зеленчуци", isCorrect: true },
              { value: "агнешко", isCorrect: false },
              { value: "жито", isCorrect: false },
              { value: "мед", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "вода", isCorrect: true },
              { value: "вино", isCorrect: false },
              { value: "оцет", isCorrect: false },
              { value: "миро", isCorrect: false },
            ],
          },
        ],
      },
      section: "1",
    },
    {
      roundId: round.id,
      index: 2,
      questionText: "Разказ за сътворението",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "В началото Бог създаде {0} и {1}. После създаде растенията, след това {2} и накрая човека по Свой образ.",
        blanks: [
          {
            options: [
              { value: "небето", isCorrect: true },
              { value: "земята", isCorrect: false },
              { value: "морето", isCorrect: false },
              { value: "светлината", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "земята", isCorrect: true },
              { value: "небето", isCorrect: false },
              { value: "дърветата", isCorrect: false },
              { value: "животните", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "животните", isCorrect: true },
              { value: "човека", isCorrect: false },
              { value: "ангелите", isCorrect: false },
              { value: "рибите", isCorrect: false },
            ],
          },
        ],
      },
      section: "1",
    },
    {
      roundId: round.id,
      index: 3,
      questionText: "Разказ за Давид и Саул",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Когато {0} пасеше овцете на баща си, Бог го изпрати при пророк {1}, който го помаза със {2}.",
        blanks: [
          {
            options: [
              { value: "Давид", isCorrect: true },
              { value: "Саул", isCorrect: false },
              { value: "Самуил", isCorrect: false },
              { value: "Голiat", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "Самуил", isCorrect: true },
              { value: "Натан", isCorrect: false },
              { value: "Илия", isCorrect: false },
              { value: "Елисей", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "зехтин", isCorrect: true },
              { value: "вино", isCorrect: false },
              { value: "вода", isCorrect: false },
              { value: "кръв", isCorrect: false },
            ],
          },
        ],
      },
      section: "1",
    },
    // MATCHING Questions
    {
      roundId: round.id,
      index: 4,
      questionText: "Свържи героя към историята му",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m1_s1_q1", left: "Исус", right: "възкресява дъщерята на Яир, началника на синагогата." },
          { id: "m1_s1_q2", left: "Апостол Павел", right: "възкресява момче на име Евтих, което пада от прозореца." },
          { id: "m1_s1_q3", left: "Пророк Илия", right: "възкресява синът на вдовицата в Сарепта Сидонска." },
        ],
      },
      section: "1",
    },
    {
      roundId: round.id,
      index: 5,
      questionText: "Свържи пророка към неговото пророчество",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m2_s1_q1", left: "Исая", right: "Пророкува за Месията, Който ще се роди от девица." },
          { id: "m2_s1_q2", left: "Йеремия", right: "Пророкува за Новия завет, който Бог ще сключи с народа Си." },
          { id: "m2_s1_q3", left: "Йезекиил", right: "Пророкува за сухите кости, които ще оживеят." },
        ],
      },
      section: "1",
    },
    {
      roundId: round.id,
      index: 6,
      questionText: "Свържи името към описанието",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m3_s1_q1", left: "Авраам", right: "Отец на вярващите, баща на Исак и Исмаил." },
          { id: "m3_s1_q2", left: "Мойсей", right: "Водач на израилтяните през Червено море." },
          { id: "m3_s1_q3", left: "Давид", right: "Пастир, който стана цар на Израел." },
        ],
      },
      section: "1",
    },
    // MULTIPLE_CHOICE Questions
    {
      roundId: round.id,
      index: 7,
      questionText: "Какво прави пророк Йона, след като рибата го изплюва?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: [
          "Отива да пророкува в град Ниневия",
          "Отива да пророкува в город Тир",
          "Бяга от Бога в пустинята",
          "Бяга от Бога, като се качва на лодка",
        ],
        correctIndices: [0],
      },
      section: "1",
    },
    {
      roundId: round.id,
      index: 8,
      questionText: "Кое от тези животни не споменава Ное, когато взема в ковчега?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: ["Слон", "Коне", "Крави", "Овце"],
        correctIndices: [0],
      },
      section: "1",
    },
    {
      roundId: round.id,
      index: 9,
      questionText: "Колко дни и нощи Исус прекара в пустинята преди да започне служението Си?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: [
          "Тридесет и девет дни",
          "Четиридесет дни и нощи",
          "Три дни и три нощи",
          "Седем дни и нощи",
        ],
        correctIndices: [1],
      },
      section: "1",
    }
  );

  // ==========================================
  // Section 2
  // ==========================================
  questions.push(
    {
      roundId: round.id,
      index: 1,
      questionText: "Разказ за Мойсей",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Мойсей пасеше овцете на тъста си {0} свещеника мадиамски. Един ден видя {1} горящ в {2}, но той не се consumeваше.",
        blanks: [
          {
            options: [
              { value: "Иофор", isCorrect: true },
              { value: "Аарон", isCorrect: false },
              { value: "Фараон", isCorrect: false },
              { value: "Илия", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "храст", isCorrect: true },
              { value: "дърво", isCorrect: false },
              { value: "камък", isCorrect: false },
              { value: "взрив", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "пустинята", isCorrect: true },
              { value: "планината", isCorrect: false },
              { value: "долината", isCorrect: false },
              { value: "гората", isCorrect: false },
            ],
          },
        ],
      },
      section: "2",
    },
    {
      roundId: round.id,
      index: 2,
      questionText: "Разказ за ковчега на завета",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Ковчегът на завета се пазеше в {0}, най-свещеното място в {1}. Само {2} можеше да влиза там веднъж годишно.",
        blanks: [
          {
            options: [
              { value: "Светилището", isCorrect: true },
              { value: "Двора", isCorrect: false },
              { value: "Скинията", isCorrect: false },
              { value: "Храма", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "Йерусалим", isCorrect: true },
              { value: "Вавилон", isCorrect: false },
              { value: "Галилея", isCorrect: false },
              { value: "Египет", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "първосвещеникът", isCorrect: true },
              { value: "царят", isCorrect: false },
              { value: "пророкът", isCorrect: false },
              { value: "левитът", isCorrect: false },
            ],
          },
        ],
      },
      section: "2",
    },
    {
      roundId: round.id,
      index: 3,
      questionText: "Разказ за Йонтан и Давид",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "{0} син на цар Саул обина Давид повече от {1}. Те направиха {2} един с друг и Йонатан даде на Давид оръжието си.",
        blanks: [
          {
            options: [
              { value: "Йонатан", isCorrect: true },
              { value: "Авенир", isCorrect: false },
              { value: "Ахинорам", isCorrect: false },
              { value: "Мелхола", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "живота си", isCorrect: true },
              { value: "богатствата си", isCorrect: false },
              { value: "славата си", isCorrect: false },
              { value: "трона си", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "завет", isCorrect: true },
              { value: "война", isCorrect: false },
              { value: "състезание", isCorrect: false },
              { value: "търговия", isCorrect: false },
            ],
          },
        ],
      },
      section: "2",
    },
    // MATCHING Questions
    {
      roundId: round.id,
      index: 4,
      questionText: "Свържи мястото към събитието",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m1_s2_q1", left: "Планината Синай", right: "Мойсей получи десетте заповеди от Бога." },
          { id: "m1_s2_q2", left: "Хanaan", right: "Земята, която Бог обеща на Авраам и неговите потомци." },
          { id: "m1_s2_q3", left: "Вавилон", right: "Градът, в който бяха отведени израилтяните в плен." },
        ],
      },
      section: "2",
    },
    {
      roundId: round.id,
      index: 5,
      questionText: "Свържи ученика към учителя му",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m2_s2_q1", left: "Петър", right: "Ученик на Исус, който вървеше по водата." },
          { id: "m2_s2_q2", left: "Тимотей", right: "Ученик на апостол Павел, син по вяра." },
          { id: "m2_s2_q3", left: "Елисей", right: "Ученик на пророк Илия, който получи двойна дял от духа му." },
        ],
      },
      section: "2",
    },
    {
      roundId: round.id,
      index: 6,
      questionText: "Свържи книгата към автора ѝ",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m3_s2_q1", left: "Псалтир", right: "Книга, написана основно от цар Давид." },
          { id: "m3_s2_q2", left: "Притчи", right: "Книга, написана от цар Соломон." },
          { id: "m3_s2_q3", left: "Евангелие от Матей", right: "Книга, написана от бившия данъчник Матей." },
        ],
      },
      section: "2",
    },
    // MULTIPLE_CHOICE Questions
    {
      roundId: round.id,
      index: 7,
      questionText: "Кое е името на майката на Исус?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: ["Мария", "Елисавета", "Анна", "Мария Магдалена"],
        correctIndices: [0],
      },
      section: "2",
    },
    {
      roundId: round.id,
      index: 8,
      questionText: "Кой построи първия ковчег според Библията?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: ["Авраам", "Мойсей", "Ной", "Давид"],
        correctIndices: [2],
      },
      section: "2",
    },
    {
      roundId: round.id,
      index: 9,
      questionText: "Кое от тези неща не е едно от Десетте Божи заповеди?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: ["Не убивай", "Не кради", "Не яж месо", "Не се прелюбодействай"],
        correctIndices: [2],
      },
      section: "2",
    }
  );

  // ==========================================
  // Section 3
  // ==========================================
  questions.push(
    {
      roundId: round.id,
      index: 1,
      questionText: "Разказ за Неемил",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Неемил беше {0} на цар Артаксеркс. Когато чу за разрушения {1}, той плака и пости {2} дни.",
        blanks: [
          {
            options: [
              { value: "чашник", isCorrect: true },
              { value: " войник", isCorrect: false },
              { value: "свещеник", isCorrect: false },
              { value: "търговец", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "Йерусалим", isCorrect: true },
              { value: "Вавилон", isCorrect: false },
              { value: "Дамаск", isCorrect: false },
              { value: "Ниневия", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "седем", isCorrect: true },
              { value: "три", isCorrect: false },
              { value: "четиридесет", isCorrect: false },
              { value: "дванадесет", isCorrect: false },
            ],
          },
        ],
      },
      section: "3",
    },
    {
      roundId: round.id,
      index: 2,
      questionText: "Разказ за Даниил в рова",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Цар Дарий хвърли Данаил в {0} с {1}, но Бог затвори устата на {2} и Данаил не пострада.",
        blanks: [
          {
            options: [
              { value: "ровът на лъвовете", isCorrect: true },
              { value: "оково", isCorrect: false },
              { value: "тъмница", isCorrect: false },
              { value: "кладенец", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "лъвове", isCorrect: true },
              { value: "змии", isCorrect: false },
              { value: "скорпиони", isCorrect: false },
              { value: "мечки", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "лъвовете", isCorrect: true },
              { value: "змиите", isCorrect: false },
              { value: "пазачите", isCorrect: false },
              { value: "огъня", isCorrect: false },
            ],
          },
        ],
      },
      section: "3",
    },
    {
      roundId: round.id,
      index: 3,
      questionText: "Разказ за тримата мъже в пещта",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Вавилонският цар хвърли Садpaк, Месак и Авинад в {0}на {1} огъня. Но {2} ходеше сред огъня с тях.",
        blanks: [
          {
            options: [
              { value: "горящата пещ", isCorrect: true },
              { value: "кладенец", isCorrect: false },
              { value: "тъмница", isCorrect: false },
              { value: "ров", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "седемкратно", isCorrect: true },
              { value: "троен", isCorrect: false },
              { value: "двоен", isCorrect: false },
              { value: "много", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "Син Божи", isCorrect: true },
              { value: "ангел", isCorrect: false },
              { value: "пророк", isCorrect: false },
              { value: "свещеник", isCorrect: false },
            ],
          },
        ],
      },
      section: "3",
    },
    // MATCHING Questions
    {
      roundId: round.id,
      index: 4,
      questionText: "Свържи чудесата на Исус",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m1_s3_q1", left: "Хлябовете и рибите", right: "Исус нахрани 5000 мъже с пет хляба и две риби." },
          { id: "m1_s3_q2", left: "Водата във вино", right: "Първото чудо на Исус на сватбата в Кана." },
          { id: "m1_s3_q3", left: "Разслабленият", right: "Исус прости греховете и изцели парализиран човек." },
        ],
      },
      section: "3",
    },
    {
      roundId: round.id,
      index: 5,
      questionText: "Свържи жената към нейната история",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m2_s3_q1", left: "Мария", right: "Майка на Исус, която роди Спасителя във Витлеем." },
          { id: "m2_s3_q2", left: "Мария Магдалена", right: "Жена, от която Исус изгони седем демона." },
          { id: "m2_s3_q3", left: "Рут", right: "Моавката, която стана прабаба на цар Давид." },
        ],
      },
      section: "3",
    },
    {
      roundId: round.id,
      index: 6,
      questionText: "Свържи събитието към значението му",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m3_s3_q1", left: "Преминаването през Червено море", right: "Бог спаси израилтяните от робията в Египет." },
          { id: "m3_s3_q2", left: "Росата на Мана", right: "Бог даде храна на израилтяните в пустинята." },
          { id: "m3_s3_q3", left: "Падането на стените на Ерихон", right: "Бог даде победа на израилтяните чрез тръби и викове." },
        ],
      },
      section: "3",
    },
    // MULTIPLE_CHOICE Questions
    {
      roundId: round.id,
      index: 7,
      questionText: "Кое е най-голямото Божие заповед според Исус?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: [
          "Да пазиш съботата",
          "Да почиташ родителите си",
          "Да обичаш Господа, Бога си, с цялото си сърце",
          "Да не даваш фалшиво свидетелство",
        ],
        correctIndices: [2],
      },
      section: "3",
    },
    {
      roundId: round.id,
      index: 8,
      questionText: "Колко ученика имаше Исус?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: ["Седем", "Дванадесет", "Седемдесет", "Тридесет"],
        correctIndices: [1],
      },
      section: "3",
    },
    {
      roundId: round.id,
      index: 9,
      questionText: "Коя жена помаза Исус с миро преди Неговото разпъване?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: [
          "Мария Магдалена",
          "Мария от Витания, сестра на Лазар",
          "Пилатовата жена",
          "Йоанан",
        ],
        correctIndices: [1],
      },
      section: "3",
    }
  );

  // ==========================================
  // Section 4
  // ==========================================
  questions.push(
    {
      roundId: round.id,
      index: 1,
      questionText: "Разказ за Естер",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Естер стана {0} на персийскил цар {1}. Когато Аман поиска да унищожи евреите, Естер отиде при царя без {2}.",
        blanks: [
          {
            options: [
              { value: "царица", isCorrect: true },
              { value: "принцеса", isCorrect: false },
              { value: "слугиня", isCorrect: false },
              { value: "съпруга", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "Артаксеркс", isCorrect: true },
              { value: "Кирус", isCorrect: false },
              { value: "Дарий", isCorrect: false },
              { value: "Нерон", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "да бъде повикана", isCorrect: true },
              { value: "да бъде наказана", isCorrect: false },
              { value: "да му се поклони", isCorrect: false },
              { value: "да носи корона", isCorrect: false },
            ],
          },
        ],
      },
      section: "4",
    },
    {
      roundId: round.id,
      index: 2,
      questionText: "Разказ за апостол Павел",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Павел, преди да е {0}, преследваше християните. На пътя за {1} Господ го {2} и го направи апостол.",
        blanks: [
          {
            options: [
              { value: "наречен Павел", isCorrect: true },
              { value: "роден", isCorrect: false },
              { value: "кръстен", isCorrect: false },
              { value: "осъден", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "Дамаск", isCorrect: true },
              { value: "Йерусалим", isCorrect: false },
              { value: "Антиохия", isCorrect: false },
              { value: "Тарс", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "спря", isCorrect: true },
              { value: "изпрати", isCorrect: false },
              { value: "прокле", isCorrect: false },
              { value: "призова", isCorrect: false },
            ],
          },
        ],
      },
      section: "4",
    },
    {
      roundId: round.id,
      index: 3,
      questionText: "Разказ за пророк Илия",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Пророк Илия се скри при {0} поток. Враните му носеха хляб и {1}. След това отиде при вдовицата в {2}.",
        blanks: [
          {
            options: [
              { value: "Херат", isCorrect: true },
              { value: "Йордан", isCorrect: false },
              { value: "Кисон", isCorrect: false },
              { value: "Ефрат", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "месо", isCorrect: true },
              { value: "плодове", isCorrect: false },
              { value: "зеленчуци", isCorrect: false },
              { value: "вода", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "Сарепта Сидонска", isCorrect: true },
              { value: "Ниневия", isCorrect: false },
              { value: "Витезда", isCorrect: false },
              { value: "Капернаум", isCorrect: false },
            ],
          },
        ],
      },
      section: "4",
    },
    // MATCHING Questions
    {
      roundId: round.id,
      index: 4,
      questionText: "Свържи царя към неговото управление",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m1_s4_q1", left: "Соломон", right: "Цар, известен със своята мъдрост и построения храм." },
          { id: "m1_s4_q2", left: "Саул", right: "Първият цар на Израел, когото Бог отхвърли." },
          { id: "m1_s4_q3", left: "Давид", right: "Цар след Божието сърце, автор на много псалми." },
        ],
      },
      section: "4",
    },
    {
      roundId: round.id,
      index: 5,
      questionText: "Свържи архангела към ролята му",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m2_s4_q1", left: "Гавриил", right: "Архангел, който обяви раждането на Йоан Кръстител и Исус." },
          { id: "m2_s4_q2", left: "Михаил", right: "Архангел, водач на небесните войски срещу дявола." },
          { id: "m2_s4_q3", left: "Рафаил", right: "Архангел, който изцери Товит и неговия син." },
        ],
      },
      section: "4",
    },
    {
      roundId: round.id,
      index: 6,
      questionText: "Свържи притчата към нейното значение",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m3_s4_q1", left: "Добрият самарянин", right: "Показва как трябва да обичаме ближните си." },
          { id: "m3_s4_q2", left: "Блудният син", right: "Показва Божията радост, когато грешник се покае." },
          { id: "m3_s4_q3", left: "Разсипническият богаташ", right: "Учи, че човек не може да служи на две господари." },
        ],
      },
      section: "4",
    },
    // MULTIPLE_CHOICE Questions
    {
      roundId: round.id,
      index: 7,
      questionText: "Как се казваше братят на Исус?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: [
          "Петър and Йоан",
          "Йосия and Симеон",
          "Яков, Йосия, Симеон and Юда",
          "Авраам, Исак and Яков",
        ],
        correctIndices: [2],
      },
      section: "4",
    },
    {
      roundId: round.id,
      index: 8,
      questionText: "Кое от тези имена не е на един от тримата мъже в пещта?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: ["Садрак", "Месак", "Авинад", "Авиуд"],
        correctIndices: [3],
      },
      section: "4",
    },
    {
      roundId: round.id,
      index: 9,
      questionText: "Колко книги има в Стария завет?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: ["27", "39", "46", "22"],
        correctIndices: [1],
      },
      section: "4",
    }
  );

  await prisma.question.createMany({ data: questions });
}
