import { Prisma, QuestionType, RoundType } from "@prisma/client";
import "dotenv/config";
import prisma from "./prisma";

async function seed() {
  console.log("Seeding database...");

  try {
    // 0. Cleanup
    console.log("Cleaning up old data...");
    await prisma.answer.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.competition.deleteMany({});

    const competitions = [
      {
        title: "The Bible Competition",
        host_pin: "1111",
      },
      {
        title: "Test Competition",
        host_pin: "0000",
      },
    ];

    for (const competitionInfo of competitions) {
      console.log(`Creating competition: ${competitionInfo.title}`);
      const competition = await prisma.competition.create({
        data: {
          title: competitionInfo.title,
          host_pin: competitionInfo.host_pin,
          status: "ACTIVE",
        },
      });

      const round1_1_fill_in_the_blanks = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 1,
          type: "STANDARD",
          title: "Round 1.1: Fill in the blanks"
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: round1_1_fill_in_the_blanks.id,
            questionText: "Попълнете празните места",
            type: "FILL_IN_THE_BLANKS",
            points: 15,
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
            section: "Player 1",
          },
        ],
      });

      const round1_2_match_hero_to_story = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 2,
          type: "STANDARD",
          title: "Round 1.2: Match the hero to the story"
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: round1_2_match_hero_to_story.id,
            questionText: "Свържи героя към историята му",
            type: "MATCHING",
            points: 20,
            content: {
              pairs: [
                { id: "p1", left: "Исус", right: "възкресява синът на вдовицата в Сарепта Сидонска." },
                { id: "p2", left: "Апостол Павел", right: "възкресява дъщерята на Яир, началника на синагогата." },
                { id: "p3", left: "Пророк Илия", right: "възкресява момче на име Евтих, което пада от прозореца." },
              ],
            },
            section: "Player 1",
          },
        ]
      });

      const round1_3_continue_the_story = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 3,
          type: "STANDARD",
          title: "Round 1.3: Continue the story"
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: round1_3_continue_the_story.id,
            questionText: "Какво прави пророк Йона, след като рибата го изплюва?",
            type: "MULTIPLE_CHOICE",
            points: 10,
            content: {
              options: [
                "Отива да пророкува в град Ниневия",
                "Отива да пророкува в град Тир",
                "Бяга от Бога в пустинята",
                "Бяга от Бога, като се качва на лодка"
              ],
              correctIndices: [0],
            },
          }
        ],
      });

      const round2_chronology = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 4,
          type: "STANDARD",
          title: "Round 2: Bible chronology"
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: round2_chronology.id,
            questionText:
              "Order these events in the life of Joseph chronologically:",
            type: "CHRONOLOGY",
            points: 10,
            timeLimitSeconds: 45,
            content: {
              items: [
                { id: "j1", text: "Мойсей издига медна змия в пустинята", order: 9 },
                { id: "j2", text: "Мойсей разделя Червено море", order: 0 },
                { id: "j3", text: "Мойсей праща съгледвачи в Ханаанската земя", order: 8 },
                { id: "j4", text: "Мойсей чупи плочите на завета", order: 5 },
                { id: "j5", text: "Мойсей удря два пъти скалата Мерива при Кадис", order: 6 },
                { id: "j6", text: "Мириам води народа в песен и танц", order: 1 },
                { id: "j7", text: "Аарон прави златно теле", order: 4 },
                { id: "j8", text: "Мойсей се изкачва на планината", order: 3 },
                { id: "j9", text: "Мириам е прокажена", order: 7 },
                { id: "j10", text: "Бог дава манна на народа", order: 2 },
              ],
            },
            grading: "AUTO",
          },
        ]
      });

      const round3_1_true_false_story = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 5,
          type: "STANDARD",
          title: "Round 3.1: True or false: Story"
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: round3_1_true_false_story.id,
            questionText: "Въпреки че Есей не му представи най-малкия си син, Самуил веднага помисли, че Давид е помазаникът, когото Господ е избрал.",
            type: "TRUE_FALSE" as QuestionType,
            points: 10,
            timeLimitSeconds: 15,
            content: { isTrue: false },
          },
        ]
      })

      const round3_2_true_false_hero = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 6,
          type: "STANDARD",
          title: "Round 3.2: True or false: Hero"
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: round3_2_true_false_hero.id,
            questionText: "Кое твърдение за Рут е вярно?",
            type: "MULTIPLE_CHOICE",
            points: 10,
            content: {
              options: [
                "Тя беше от народа Моав",
                "Тя беше единствената снаха на Ноемин"
              ],
              correctIndices: [0],
            },
          }
        ],
      });

      const round3_3_find_the_mistake_in_the_sentence = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 7,
          type: "STANDARD",
          title: "Round 3.3: Find the mistake in the sentence"
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: round3_3_find_the_mistake_in_the_sentence.id,
            questionText: "Попълнете празните места",
            type: "FILL_IN_THE_BLANKS",
            points: 15,
            content: {
              prefill: true,
              text: "{0} {1} {2} {3} {4} {5}",
              blanks: [
                {
                  options: [
                    { value: "Пророк", isCorrect: true },
                    { value: "Цар", isCorrect: true },
                    { value: "Свещеник", isCorrect: false },
                    { value: "Левит", isCorrect: false },
                    { value: "Съдия", isCorrect: false },
                  ],
                },
                {
                  options: [
                    { value: "Елисей", isCorrect: true },
                    { value: "Илия", isCorrect: false },
                    { value: "Данаил", isCorrect: false },
                    { value: "Исая", isCorrect: true },
                    { value: "Йона", isCorrect: false },
                  ],
                },
                {
                  options: [
                    { value: "избива", isCorrect: true },
                    { value: "помазва", isCorrect: false },
                    { value: "уморява", isCorrect: false },
                    { value: "обучава", isCorrect: true },
                    { value: "изцелява", isCorrect: false },
                  ],
                },
                {
                  options: [
                    { value: "450", isCorrect: true },
                    { value: "400", isCorrect: false },
                    { value: "4000", isCorrect: false },
                    { value: "250", isCorrect: false },
                    { value: "1500", isCorrect: true },
                  ],
                },
                {
                  options: [
                    { value: "от пророците на Ваал", isCorrect: true },
                    { value: "от царете на Моав", isCorrect: false },
                    { value: "от пророците на Зевс", isCorrect: false },
                    { value: "от жреците на ашера", isCorrect: false },
                    { value: "от синовете на Каин", isCorrect: true },
                  ],
                },
                {
                  options: [
                    { value: "при потока Кисон.", isCorrect: true },
                    { value: "на планината Кармил.", isCorrect: true },
                    { value: "на планината Хорив.", isCorrect: false },
                    { value: "при потока Кисон.", isCorrect: false },
                    { value: "при стената Хорив.", isCorrect: false },
                  ],
                },
              ],
            },
            section: "Player 1",
          },
        ],
      });

      const round4_crossword = await prisma.round.create({
        data: {
          competitionId: competition.id,
          orderIndex: 8,
          type: "CROSSWORD",
          title: "Round 4: Bible Crossword"
        },
      });

      await prisma.question.createMany({
        data: [
          {
            roundId: round4_crossword.id,
            questionText: "Попълнете кръстословицата",
            type: "CROSSWORD",
            points: 30,
            timeLimitSeconds: 120,
            content: {
              grid: [
                ["х", "р", "а", "м", " ", " ", " "],
                ["а", " ", "м", " ", " ", " ", " "],
                ["м", "о", "а", "в", " ", " ", " "],
                [" ", " ", "н", "о", "й", " ", " "],
                [" ", " ", " ", "о", " ", " ", " "],
                [" ", " ", "е", "з", "д", "р", "а"],
              ],
              clues: {
                across: [
                  { number: 1, x: 0, y: 0, direction: "across", clue: "Това, което Давид искаше да направи за Господа, но синът му го създаде вместо него.", answer: "храм" },
                  { number: 1, x: 2, y: 0, direction: "across", clue: "Родната земя на Рут.", answer: "моав" },
                  { number: 1, x: 3, y: 2, direction: "across", clue: "Ковчегът на ...", answer: "ной" },
                  { number: 1, x: 5, y: 2, direction: "across", clue: "Книжник, който поучава първите евреи, които се завръщат в Йерусалим след Вавилонския плен", answer: "ездра" },
                ],
                down: [
                  { number: 1, x: 0, y: 0, direction: "down", clue: "Един от синовете на 5 (хоризонтално).", answer: "хам" },
                  { number: 1, x: 2, y: 0, direction: "down", clue: "Сродникът-изкупител на Рут.", answer: "аман" },
                  { number: 1, x: 2, y: 2, direction: "down", clue: "Герой от книгата Естир, чието име говори за това колко е неприятен", answer: "вооз" },
                ],
              },
            },
          },
        ],
      });

    }

    console.log("Seeding completed successfully.");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    await prisma.$disconnect();
    process.exit();
  }
}

seed();
