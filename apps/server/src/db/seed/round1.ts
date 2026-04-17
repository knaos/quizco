import { Prisma } from "@prisma/client";
import prisma from "../prisma";

export async function seedRound1(competitionId: string): Promise<void> {
  const round = await prisma.round.create({
    data: {
      competitionId,
      orderIndex: 1,
      type: "STANDARD",
      title: "Рунд 1: Индивидуална игра",
    },
  });

  const questions: Prisma.QuestionCreateManyInput[] = [];

  questions.push(
    {
      roundId: round.id,
      section: "1",
      index: 0,
      realIndex: 0,
      questionText: "Разказ за Данаил и приятелите му",
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
    },
    {
      roundId: round.id,
      section: "1",
      index: 1,
      realIndex: 1,
      questionText: "Разказ за тримата мъдреци в пещта",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Тримата мъдреци - Ананий, Мисаил и Азарий - биват хвърлени в {0} пещ, но Ангел Господен ги спасява и те излизат без {1}. Царят ги пита за името на техния Бог, а те отговорят, че Той е {2}.",
        blanks: [
          {
            options: [
              { value: "горящата", isCorrect: true },
              { value: "студената", isCorrect: false },
              { value: "тъмната", isCorrect: false },
              { value: "древната", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "вреда", isCorrect: true },
              { value: "силата", isCorrect: false },
              { value: "храната", isCorrect: false },
              { value: "водата", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "Богът на небесата", isCorrect: true },
              { value: "Царят на царете", isCorrect: false },
              { value: "Съдията на света", isCorrect: false },
              { value: "Бащата на всички", isCorrect: false },
            ],
          },
        ],
      },
    },
    {
      roundId: round.id,
      section: "1",
      index: 0,
      realIndex: 2,
      questionText: "Свържи героя към историята му",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 0,
      content: {
        pairs: [
          { id: "m1_s1_q1", left: "Исус", right: "възкресява дъщерята на Яир, началника на синагогата." },
          { id: "m1_s1_q2", left: "Апостол Павел", right: "възкресява момче на име Евтих, което пада от прозореца." },
          { id: "m1_s1_q3", left: "Пророк Илия", right: "възкресява синът на вдовицата в Сарепта Сидонска." },
        ],
      },
    },
    {
      roundId: round.id,
      section: "1",
      index: 2,
      realIndex: 3,
      questionText: "Свържи чуда с неговото име",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m2_s1_q1", left: "Моисей", right: "разделя водите на Червено море с жезъла си." },
          { id: "m2_s1_q2", left: "Илия", right: "затваря небето за три години и шест месеца." },
          { id: "m2_s1_q3", left: "Елисей", right: "лекува прокаженията Нааман в река Йордан." },
        ],
      },
    },
    {
      roundId: round.id,
      section: "1",
      index: 0,
      realIndex: 4,
      questionText: "Какво прави пророк Йона, след като рибата го изплюва?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 0,
      content: {
        options: [
          "Отива да пророкува в град Ниневия",
          "Отива да пророкува в город Тир",
          "Бяга от Бога в пустинята",
          "Бяга от Бога, като се качва на лодка",
        ],
        correctIndices: [0],
      },
    },
    {
      roundId: round.id,
      section: "1",
      index: 3,
      realIndex: 5,
      questionText: "Кой отговаря на Исусовите ученици след Неговото възкресение?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: [
          "Светият Дух",
          "Ангел Господен",
          "Пророк Илия",
          "Малих",
        ],
        correctIndices: [0],
      },
    },
  );

  questions.push(
    {
      roundId: round.id,
      section: "2",
      index: 0,
      realIndex: 0,
      questionText: "Разказ за рождество Христово",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 0,
      content: {
        text: "Исус се ражда в {0} във Витлеем, защото нямало място в {1}. Той е увит в {2} и положен в ясли.",
        blanks: [
          {
            options: [
              { value: "тъканта", isCorrect: true },
              { value: "хъщебелницата", isCorrect: false },
              { value: "синагогата", isCorrect: false },
              { value: "църквата", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "страноприемницата", isCorrect: true },
              { value: "дома на Йосиф", isCorrect: false },
              { value: "дома на Херод", isCorrect: false },
              { value: "пещерата", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "пелени", isCorrect: true },
              { value: "кадифе", isCorrect: false },
              { value: "злато", isCorrect: false },
              { value: "вълна", isCorrect: false },
            ],
          },
        ],
      },
    },
    {
      roundId: round.id,
      section: "2",
      index: 1,
      realIndex: 1,
      questionText: "Разказ за кръста и възкресението",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Исус е разпнат на {0} кръст между двама разбойници. След три дни Той {1} от мъртвите и се явява на {2} ученици.",
        blanks: [
          {
            options: [
              { value: "римски", isCorrect: true },
              { value: "дървен", isCorrect: false },
              { value: "каменен", isCorrect: false },
              { value: "златен", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "възкръсва", isCorrect: true },
              { value: "се показва", isCorrect: false },
              { value: "се връща", isCorrect: false },
              { value: "излиза", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "единадесет", isCorrect: true },
              { value: "дванадесет", isCorrect: false },
              { value: "трима", isCorrect: false },
              { value: "седем", isCorrect: false },
            ],
          },
        ],
      },
    },
    {
      roundId: round.id,
      section: "2",
      index: 0,
      realIndex: 2,
      questionText: "Свържи апостола с неговото послание",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 0,
      content: {
        pairs: [
          { id: "m1_s2_q1", left: "Апостол Петър", right: "пише две послания до странствуващите в света." },
          { id: "m1_s2_q2", left: "Апостол Павел", right: "пише послание до римляни за оправданието чрез вяра." },
          { id: "m1_s2_q3", left: "Апостол Йоан", right: "пише евангелие и три послания за Божията любов." },
        ],
      },
    },
    {
      roundId: round.id,
      section: "2",
      index: 2,
      realIndex: 3,
      questionText: "Свържи събитието с неговото име",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m2_s2_q1", left: "Денят на Петдесетница", right: "се излива Светият Дух върху учениците." },
          { id: "m2_s2_q2", left: "Разрушението на Вавилон", right: "е пророкувано от Данаил чрез написанието." },
          { id: "m2_s2_q3", left: "Съдът над Анан и Сапфира", right: "е заради лъжата срещу Светия Дух." },
        ],
      },
    },
    {
      roundId: round.id,
      section: "2",
      index: 0,
      realIndex: 4,
      questionText: "Колко заповеди дава Христос на учениците Си?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 0,
      content: {
        options: [
          "Една",
          "Две",
          "Три",
          "Седем",
        ],
        correctIndices: [0],
      },
    },
    {
      roundId: round.id,
      section: "2",
      index: 3,
      realIndex: 5,
      questionText: "Кой е първият мъченик за вярата в Новия завет?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: [
          "Свети Стефан",
          "Свети Павел",
          "Свети Петър",
          "Свети Яков",
        ],
        correctIndices: [0],
      },
    },
  );

  questions.push(
    {
      roundId: round.id,
      section: "3",
      index: 0,
      realIndex: 0,
      questionText: "Разказ за притчата за блудния син",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 0,
      content: {
        text: "Блудният син поиска {0} от баща си и отиде в {1} страна. Там разпиля имането си и пасеше {2}.",
        blanks: [
          {
            options: [
              { value: "наследството", isCorrect: true },
              { value: "благословията", isCorrect: false },
              { value: "земите", isCorrect: false },
              { value: "дълга", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "далечна", isCorrect: true },
              { value: "близка", isCorrect: false },
              { value: "чужда", isCorrect: false },
              { value: "незнайна", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "свине", isCorrect: true },
              { value: "овце", isCorrect: false },
              { value: "крави", isCorrect: false },
              { value: "камили", isCorrect: false },
            ],
          },
        ],
      },
    },
    {
      roundId: round.id,
      section: "3",
      index: 1,
      realIndex: 1,
      questionText: "Разказ за притчата за добрия самарянин",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Самарянинът превърза раните на ударения с {0} и ги поли с {1}. Той го предаде на {2} и плати за него.",
        blanks: [
          {
            options: [
              { value: "масло", isCorrect: true },
              { value: "сол", isCorrect: false },
              { value: "вино", isCorrect: false },
              { value: "отрова", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "вино", isCorrect: true },
              { value: "вода", isCorrect: false },
              { value: "оцет", isCorrect: false },
              { value: "мляко", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "стопанина", isCorrect: true },
              { value: "лекаря", isCorrect: false },
              { value: "църквата", isCorrect: false },
              { value: "съдията", isCorrect: false },
            ],
          },
        ],
      },
    },
    {
      roundId: round.id,
      section: "3",
      index: 0,
      realIndex: 2,
      questionText: "Свържи спасението с мястото",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 0,
      content: {
        pairs: [
          { id: "m1_s3_q1", left: "Ноевият ковчег", right: "спасява семейството му от потопа." },
          { id: "m1_s3_q2", left: "Лот и семейството му", right: "са спасени от огъня на Содом." },
          { id: "m1_s3_q3", left: "Моисей и израилтяните", right: "са спасени от Червено море." },
        ],
      },
    },
    {
      roundId: round.id,
      section: "3",
      index: 2,
      realIndex: 3,
      questionText: "Свържи Божието обещание с неговото изпълнение",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m2_s3_q1", left: "Авраам", right: "ще стане баща на много народи." },
          { id: "m2_s3_q2", left: "Давид", right: "ще има дом, от който ще излезе вечен Цар." },
          { id: "m2_s3_q3", left: "Йеремия", right: "ще напише нов завет в техните сърца." },
        ],
      },
    },
    {
      roundId: round.id,
      section: "3",
      index: 0,
      realIndex: 4,
      questionText: "Защо Исус плаче на гроба на Лаазар?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 0,
      content: {
        options: [
          "Защото скърби за приятеля си",
          "Защото не можа да го спаси навреме",
          "Защото хората не вярваха",
          "Защото се страхуваше",
        ],
        correctIndices: [0],
      },
    },
    {
      roundId: round.id,
      section: "3",
      index: 3,
      realIndex: 5,
      questionText: "Кой влиза в Небесното царство според Притчите?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: [
          "Децата и кротките",
          "Богатите и силните",
          "Учените и мъдрите",
          "Старите и опитните",
        ],
        correctIndices: [0],
      },
    },
  );

  questions.push(
    {
      roundId: round.id,
      section: "4",
      index: 0,
      realIndex: 0,
      questionText: "Разказ за Божията слава в храма",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 0,
      content: {
        text: "Пророк Исая вижда Божията слава в {0} храм и чува гласът Господен да казва: {1} е с мене. Той разбира, че хората са {2} устни.",
        blanks: [
          {
            options: [
              { value: "светия", isCorrect: true },
              { value: "древния", isCorrect: false },
              { value: "новия", isCorrect: false },
              { value: "големия", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "Святият", isCorrect: true },
              { value: "Мъдрият", isCorrect: false },
              { value: "Страшният", isCorrect: false },
              { value: "Всемогъщият", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "нечестиви", isCorrect: true },
              { value: "уморени", isCorrect: false },
              { value: "слаби", isCorrect: false },
              { value: "невинни", isCorrect: false },
            ],
          },
        ],
      },
    },
    {
      roundId: round.id,
      section: "4",
      index: 1,
      realIndex: 1,
      questionText: "Разказ за Йов и неговите приятели",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 3,
      content: {
        text: "Йов губи всичко, но не {0} Бога. Тримата му приятели идват да го {1} и разбират, че {2} е по-силен от Сатана.",
        blanks: [
          {
            options: [
              { value: "прокуди", isCorrect: true },
              { value: "напусна", isCorrect: false },
              { value: "отрече", isCorrect: false },
              { value: "мразеше", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "утешат", isCorrect: true },
              { value: "съдят", isCorrect: false },
              { value: "нападнат", isCorrect: false },
              { value: "изоставят", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "вярата", isCorrect: true },
              { value: "силата", isCorrect: false },
              { value: "мъдростта", isCorrect: false },
              { value: "надеждата", isCorrect: false },
            ],
          },
        ],
      },
    },
    {
      roundId: round.id,
      section: "4",
      index: 0,
      realIndex: 2,
      questionText: "Свързи книгите с техните автори",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 0,
      content: {
        pairs: [
          { id: "m1_s4_q1", left: "Псалтир", right: "е написана от цар Давид." },
          { id: "m1_s4_q2", left: "Притчи", right: "е написана от Соломон." },
          { id: "m1_s4_q3", left: "Послания", right: "са написани от апостолите." },
        ],
      },
    },
    {
      roundId: round.id,
      section: "4",
      index: 2,
      realIndex: 3,
      questionText: "Свържи пророка с неговото пророчество",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 3,
      content: {
        pairs: [
          { id: "m2_s4_q1", left: "Исая", right: "пророкува за Месията, Който ще се роди от девица." },
          { id: "m2_s4_q2", left: "Йеремия", right: "пророкува за Новия завет." },
          { id: "m2_s4_q3", left: "Йезекиил", right: "пророкува за новото сърце и Божия Дух." },
        ],
      },
    },
    {
      roundId: round.id,
      section: "4",
      index: 0,
      realIndex: 4,
      questionText: "Колко пъти Петър се отрича от Исус?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 0,
      content: {
        options: [
          "Три пъти",
          "Един път",
          "Два пъти",
          "Четири пъти",
        ],
        correctIndices: [0],
      },
    },
    {
      roundId: round.id,
      section: "4",
      index: 3,
      realIndex: 5,
      questionText: "Какво прави ап. Павел, след като е ухапан от змията?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 1,
      content: {
        options: [
          "Явява се на огъня без последствия",
          "Моли се на Бога за помощ",
          "Бяга от острова",
          "Търси лекар",
        ],
        correctIndices: [0],
      },
    },
  );

  await prisma.question.createMany({ data: questions });
}
