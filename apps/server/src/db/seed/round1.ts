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
      questionText: "Попълни празните места",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 0,
      content: {
        text: "Конете са {0} животни, които хората яздят {1}, и живеят в {2}.",
        blanks: [
          {
            options: [
              { value: "домашни", isCorrect: true },
              { value: "диви", isCorrect: false },
              { value: "морски", isCorrect: false },
              { value: "летящи", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "за спорт", isCorrect: true },
              { value: "по вода", isCorrect: false },
              { value: "в океана", isCorrect: false },
              { value: "в цирка", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "конюшня", isCorrect: true },
              { value: "аквариум", isCorrect: false },
              { value: "пещера", isCorrect: false },
              { value: "гора", isCorrect: false },
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
      questionText: "Свържи животните с мястото, където живеят",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 0,
      content: {
        heroes: [
          { id: "h1", text: "Акула", type: "hero" },
          { id: "h2", text: "Маймуна", type: "hero" },
          { id: "h3", text: "Куче", type: "hero" },
        ],
        stories: [
          { id: "s1", text: "В морето", type: "story", correspondsTo: "h1" },
          { id: "s2", text: "В джунглата", type: "story", correspondsTo: "h2" },
          { id: "s3", text: "В къща/апартамент", type: "story", correspondsTo: "h3" },
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
        heroes: [
          { id: "h1", text: "Моисей", type: "hero" },
          { id: "h2", text: "Илия", type: "hero" },
          { id: "h3", text: "Елисей", type: "hero" },
        ],
        stories: [
          { id: "s1", text: "разделя водите на Червено море с жезъла си.", type: "story", correspondsTo: "h1" },
          { id: "s2", text: "затваря небето за три години и шест месеца.", type: "story", correspondsTo: "h2" },
          { id: "s3", text: "лекува прокаженията Нааман в река Йордан.", type: "story", correspondsTo: "h3" },
        ],
      },
    },
    {
      roundId: round.id,
      section: "1",
      index: 0,
      realIndex: 4,
      questionText: "Кое животно има черни и бели ивици?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 0,
      content: {
        options: [
          "лешояд",
          "тигър",
          "зебра",
          "заек",
        ],
        correctIndices: [2],
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
      questionText: "Попълни празните места",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 0,
      content: {
        text: "Боулингът е {0}, в която плъзгаш {1} по коридор и трябва да събориш възможно най-много {2}.",
        blanks: [
          {
            options: [
              { value: "игра", isCorrect: true },
              { value: "птица", isCorrect: false },
              { value: "книга", isCorrect: false },
              { value: "планина", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "топка", isCorrect: true },
              { value: "чиния", isCorrect: false },
              { value: "ракета", isCorrect: false },
              { value: "книжка", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "кегли", isCorrect: true },
              { value: "цветя", isCorrect: false },
              { value: "знамена", isCorrect: false },
              { value: "буркани", isCorrect: false },
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
      questionText: "Свържи спорта със сезона, в който се спортува",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 0,
      content: {
        heroes: [
          { id: "h1", text: "Плажен волейбол", type: "hero" },
          { id: "h2", text: "Ски", type: "hero" },
          { id: "h3", text: "Шах", type: "hero" },
        ],
        stories: [
          { id: "s1", text: "Лято", type: "story", correspondsTo: "h1" },
          { id: "s2", text: "Зима", type: "story", correspondsTo: "h2" },
          { id: "s3", text: "Когато е дъждовно", type: "story", correspondsTo: "h3" },
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
        heroes: [
          { id: "h1", text: "Денят на Петдесетница", type: "hero" },
          { id: "h2", text: "Разрушението на Вавилон", type: "hero" },
          { id: "h3", text: "Съдът над Анан и Сапфира", type: "hero" },
        ],
        stories: [
          { id: "s1", text: "се излива Светият Дух върху учениците.", type: "story", correspondsTo: "h1" },
          { id: "s2", text: "е пророкувано от Данаил чрез написанието.", type: "story", correspondsTo: "h2" },
          { id: "s3", text: "е заради лъжата срещу Светия Дух.", type: "story", correspondsTo: "h3" },
        ],
      },
    },
    {
      roundId: round.id,
      section: "2",
      index: 0,
      realIndex: 4,
      questionText: "Какво се появява в небето след обилен дъжд, което ни напомня за Божия завет с хората?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 0,
      content: {
        options: [
          "дъга",
          "кюфтета",
          "самолет",
          "НЛО",
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
      questionText: "Попълни празните места",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 0,
      content: {
        text: "Когато стана {0}, винаги си мия {1} и отивам на {2}.",
        blanks: [
          {
            options: [
              { value: "сутрин", isCorrect: true },
              { value: "нощ", isCorrect: false },
              { value: "пролет", isCorrect: false },
              { value: "празник", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "зъбите", isCorrect: true },
              { value: "книгите", isCorrect: false },
              { value: "обувките", isCorrect: false },
              { value: "очилата", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "училище", isCorrect: true },
              { value: "пазара", isCorrect: false },
              { value: "театър", isCorrect: false },
              { value: "гаража", isCorrect: false },
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
      questionText: "Свържи храната с времето, когато най-често се яде",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 0,
      content: {
        heroes: [
          { id: "h1", text: "Закуска", type: "hero" },
          { id: "h2", text: "Обяд", type: "hero" },
          { id: "h3", text: "Вечеря", type: "hero" },
        ],
        stories: [
          { id: "s1", text: "7-8 ч (сутринта)", type: "story", correspondsTo: "h1" },
          { id: "s2", text: "12 ч", type: "story", correspondsTo: "h2" },
          { id: "s3", text: "6-7 ч (вечерта)", type: "story", correspondsTo: "h3" },
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
        heroes: [
          { id: "h1", text: "Авраам", type: "hero" },
          { id: "h2", text: "Давид", type: "hero" },
          { id: "h3", text: "Йеремия", type: "hero" },
        ],
        stories: [
          { id: "s1", text: "ще стане баща на много народи.", type: "story", correspondsTo: "h1" },
          { id: "s2", text: "ще има дом, от който ще излезе вечен Цар.", type: "story", correspondsTo: "h2" },
          { id: "s3", text: "ще напише нов завет в техните сърца.", type: "story", correspondsTo: "h3" },
        ],
      },
    },
    {
      roundId: round.id,
      section: "3",
      index: 0,
      realIndex: 4,
      questionText: "Кое от изброените НЕ съдържа домати?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 0,
      content: {
        options: [
          "кетчуп",
          "лютеница",
          "айвар",
          "течен шоколад",
        ],
        correctIndices: [3],
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
      questionText: "Попълни празните места",
      type: "FILL_IN_THE_BLANKS",
      timeLimitSeconds: 20,
      points: 0,
      content: {
        text: "В началото на учебната година, което е {0}, всички ученици подаряват на своите {1} букет от {2}.",
        blanks: [
          {
            options: [
              { value: "15 септември", isCorrect: true },
              { value: "24 май", isCorrect: false },
              { value: "Коледа", isCorrect: false },
              { value: "Нова година", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "учители", isCorrect: true },
              { value: "съседи", isCorrect: false },
              { value: "треньори", isCorrect: false },
              { value: "готвачи", isCorrect: false },
            ],
          },
          {
            options: [
              { value: "цветя", isCorrect: true },
              { value: "бонбони", isCorrect: false },
              { value: "тетрадки", isCorrect: false },
              { value: "играчки", isCorrect: false },
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
      questionText: "Свържи плода с цвета му",
      type: "MATCHING",
      timeLimitSeconds: 25,
      points: 0,
      content: {
        heroes: [
          { id: "h1", text: "Мандарина", type: "hero" },
          { id: "h2", text: "Домат", type: "hero" },
          { id: "h3", text: "Лимон", type: "hero" },
        ],
        stories: [
          { id: "s1", text: "Оранжев", type: "story", correspondsTo: "h1" },
          { id: "s2", text: "Червен", type: "story", correspondsTo: "h2" },
          { id: "s3", text: "Жълт", type: "story", correspondsTo: "h3" },
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
        heroes: [
          { id: "h1", text: "Исая", type: "hero" },
          { id: "h2", text: "Йеремия", type: "hero" },
          { id: "h3", text: "Йезекиил", type: "hero" },
        ],
        stories: [
          { id: "s1", text: "пророкува за Месията, Който ще се роди от девица.", type: "story", correspondsTo: "h1" },
          { id: "s2", text: "пророкува за Новия завет.", type: "story", correspondsTo: "h2" },
          { id: "s3", text: "пророкува за новото сърце и Божия Дух.", type: "story", correspondsTo: "h3" },
        ],
      },
    },
    {
      roundId: round.id,
      section: "4",
      index: 0,
      realIndex: 4,
      questionText: "Какво се получава, когато смесиш син и жълт цвят?",
      type: "MULTIPLE_CHOICE",
      timeLimitSeconds: 15,
      points: 0,
      content: {
        options: [
          "бъркотия",
          "зелен цвят",
          "картина на папагал",
          "розово сърце",
        ],
        correctIndices: [1],
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
