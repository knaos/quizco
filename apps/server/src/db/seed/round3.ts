import { Prisma, QuestionType } from "@prisma/client";
import prisma from "../prisma";

/**
 * Seeds Round 3: True or False, Multiple Choice, and Correct the Error
 * 36 questions total: 12 TRUE_FALSE + 12 MULTIPLE_CHOICE (2 options) + 12 CORRECT_THE_ERROR (3 words with 3 alternatives)
 */
export async function seedRound3(competitionId: string): Promise<void> {
  const round = await prisma.round.create({
    data: {
      competitionId,
      orderIndex: 3,
      type: "STANDARD",
      title: "Round 3: True or False",
    },
  });

  await prisma.question.createMany({
    data: [
      // ==========================================
      // TRUE_FALSE Questions (1-12)
      // ==========================================
      {
        roundId: round.id,
        index: 1,
        questionText: "Исус ходеше по водата според Библията.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: true },
      },
      {
        roundId: round.id,
        index: 2,
        questionText: "Ной взе в ковчега си динозаври.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: false },
      },
      {
        roundId: round.id,
        index: 3,
        questionText: "Мойсей раздели Червено море с помощта на Бога.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: true },
      },
      {
        roundId: round.id,
        index: 4,
        questionText: "Давид уби Голиат с меч.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: false },
      },
      {
        roundId: round.id,
        index: 5,
        questionText: "Исус е роден във Витания.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: false },
      },
      {
        roundId: round.id,
        index: 6,
        questionText: "Тримата мъже ходеха в горящата пещ без да горят.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: true },
      },
      {
        roundId: round.id,
        index: 7,
        questionText: "Йона прекара три дни в корема на голяма риба.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: true },
      },
      {
        roundId: round.id,
        index: 8,
        questionText: "Соломон построи втория храм в Йерусалим.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: false },
      },
      {
        roundId: round.id,
        index: 9,
        questionText: "Апостол Павел написал книгата Римляни.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: true },
      },
      {
        roundId: round.id,
        index: 10,
        questionText: "Данаил изяде тринадесет седмици само зеленчуци.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: false },
      },
      {
        roundId: round.id,
        index: 11,
        questionText: "Илия се възнесе на небето във вихрушка.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: true },
      },
      {
        roundId: round.id,
        index: 12,
        questionText: "Исус преобрази на планината Ермон.",
        type: "TRUE_FALSE" as QuestionType,
        points: 1,
        timeLimitSeconds: 10,
        content: { isTrue: false },
      },

      // ==========================================
      // MULTIPLE_CHOICE Questions (13-24) - 2 options
      // ==========================================
      {
        roundId: round.id,
        index: 13,
        questionText: "Кой уби Голиат?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Давид", "Саул"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 14,
        questionText: "Колко дни Бог създаде света?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Шест дни", "Седем дни"],
          correctIndices: [1],
        },
      },
      {
        roundId: round.id,
        index: 15,
        questionText: "Коя планина Мойсей получи десетте заповеди?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Синай", "Хорив"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 16,
        questionText: "Кой беше първият човек, създаден от Бог?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Адам", "Ной"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 17,
        questionText: "Коя река кръсти Христос?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Йордан", "Нил"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 18,
        questionText: "Кой пророк чу глас от горящия храст?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Мойсей", "Илия"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 19,
        questionText: "Колко ученика имаше Исус?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Дванадесет", "Седемдесет"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 20,
        questionText: "Коя жена стана царица на Персия?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Естер", "Рут"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 21,
        questionText: "Кой построи първия ковчег?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Ной", "Авраам"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 22,
        questionText: "Коя книга разказва за Йов и неговото страдание?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Книга Йов", "Книга Псалми"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 23,
        questionText: "Кой е син на Бог според Новия завет?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Исус", "Мойсей"],
          correctIndices: [0],
        },
      },
      {
        roundId: round.id,
        index: 24,
        questionText: "Колко хляба използва Исус за нахранването на 5000?",
        type: "MULTIPLE_CHOICE",
        timeLimitSeconds: 15,
        points: 1,
        content: {
          options: ["Пет", "Две"],
          correctIndices: [0],
        },
      },

      // ==========================================
      // CORRECT_THE_ERROR Questions (25-36) - 3 words with 3 alternatives
      // ==========================================
      {
        roundId: round.id,
        index: 25,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Ной построи ковчег за да спаси животните от потопа",
          words: [
            { wordIndex: 1, text: "Ной", alternatives: ["Авраам", "Мойсей"] },
            { wordIndex: 3, text: "ковчег", alternatives: ["храм", "кула"] },
            { wordIndex: 6, text: "потопа", alternatives: ["пустинята", "морето"] },
          ],
          errorWordIndex: 1,
          correctReplacement: "Авраам",
        },
      },
      {
        roundId: round.id,
        index: 26,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Мойсей раздели Червеното море с помощта на Илия",
          words: [
            { wordIndex: 1, text: "Мойсей", alternatives: ["Исус", "Илия"] },
            { wordIndex: 4, text: "Червеното", alternatives: ["Йордан", "Галилейското"] },
            { wordIndex: 9, text: "Илия", alternatives: ["Бог", "Ангел"] },
          ],
          errorWordIndex: 9,
          correctReplacement: "Бог",
        },
      },
      {
        roundId: round.id,
        index: 27,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Давид уби Голиат с помощта на своя меч",
          words: [
            { wordIndex: 2, text: "Голиат", alternatives: ["Саул", "Филистимец"] },
            { wordIndex: 5, text: "меч", alternatives: ["прашка", "копье"] },
            { wordIndex: 7, text: "своя", alternatives: ["Божия", "царски"] },
          ],
          errorWordIndex: 7,
          correctReplacement: "Божия",
        },
      },
      {
        roundId: round.id,
        index: 28,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Исус се роди в храма на Йерусалим",
          words: [
            { wordIndex: 1, text: "се", alternatives: ["не", "се"] },
            { wordIndex: 4, text: "храма", alternatives: ["обор", "колиба"] },
            { wordIndex: 6, text: "Йерусалим", alternatives: ["Витания", "Витлеем"] },
          ],
          errorWordIndex: 6,
          correctReplacement: "Витлеем",
        },
      },
      {
        roundId: round.id,
        index: 29,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Пророк Илия се възнесе на небето в голяма буря",
          words: [
            { wordIndex: 1, text: "Илия", alternatives: ["Исус", "Мойсей"] },
            { wordIndex: 5, text: "небето", alternatives: ["планината", "облаците"] },
            { wordIndex: 8, text: "буря", alternatives: ["вихрушка", "огнен"] },
          ],
          errorWordIndex: 1,
          correctReplacement: "Исус",
        },
      },
      {
        roundId: round.id,
        index: 30,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Тримата мъже в пещта бяха Серах Авиуд и Мисаил",
          words: [
            { wordIndex: 7, text: "Серах", alternatives: ["Садрак", "Месак"] },
            { wordIndex: 8, text: "Авиуд", alternatives: ["Авинад", "Азария"] },
            { wordIndex: 10, text: "Мисаил", alternatives: ["Анания", "Азария"] },
          ],
          errorWordIndex: 7,
          correctReplacement: "Садрак",
        },
      },
      {
        roundId: round.id,
        index: 31,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Данаил прекара седем нощи в рова на лъвовете",
          words: [
            { wordIndex: 2, text: "седем", alternatives: ["една", "три"] },
            { wordIndex: 6, text: "рова", alternatives: ["пещерата", "тъмницата"] },
            { wordIndex: 8, text: "лъвовете", alternatives: ["мечките", "змиите"] },
          ],
          errorWordIndex: 2,
          correctReplacement: "една",
        },
      },
      {
        roundId: round.id,
        index: 32,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Йона проповядваше в Ниневия три дни преди да го погълне рибата",
          words: [
            { wordIndex: 3, text: "Ниневия", alternatives: ["Тире", "Дамаск"] },
            { wordIndex: 5, text: "три", alternatives: ["четиридесет", "седем"] },
            { wordIndex: 13, text: "рибата", alternatives: ["кон", "койот"] },
          ],
          errorWordIndex: 5,
          correctReplacement: "четиридесет",
        },
      },
      {
        roundId: round.id,
        index: 33,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Соломон построи Скинията в Йерусалим за да я замени",
          words: [
            { wordIndex: 1, text: "Соломон", alternatives: ["Мойсей", "Давид"] },
            { wordIndex: 3, text: "Скинията", alternatives: ["Храма", "Олтара"] },
            { wordIndex: 8, text: "я", alternatives: ["го", "се"] },
          ],
          errorWordIndex: 1,
          correctReplacement: "Мойсей",
        },
      },
      {
        roundId: round.id,
        index: 34,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Гавриил обяви на Захария раждането на Исус",
          words: [
            { wordIndex: 1, text: "Гавриил", alternatives: ["Рафаил", "Михаил"] },
            { wordIndex: 4, text: "Захария", alternatives: ["Йоаким", "Йосиф"] },
            { wordIndex: 7, text: "Исус", alternatives: ["Йоан", "Соломон"] },
          ],
          errorWordIndex: 7,
          correctReplacement: "Йоан",
        },
      },
      {
        roundId: round.id,
        index: 35,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Рут стана майка на Саул цар на Юда",
          words: [
            { wordIndex: 2, text: "майка", alternatives: ["прабаба", "леля"] },
            { wordIndex: 5, text: "Саул", alternatives: ["Давид", "Обед"] },
            { wordIndex: 7, text: "Юда", alternatives: ["Израел", "Витан"] },
          ],
          errorWordIndex: 5,
          correctReplacement: "Давид",
        },
      },
      {
        roundId: round.id,
        index: 36,
        questionText: "Поправи грешката в изречението",
        type: "CORRECT_THE_ERROR" as QuestionType,
        points: 2,
        content: {
          text: "Апостол Павел написал посланието си до Римляни от Ерусалим",
          words: [
            { wordIndex: 4, text: "си", alternatives: ["на", "му"] },
            { wordIndex: 7, text: "Римляни", alternatives: ["Коринт", "Ефесяни"] },
            { wordIndex: 9, text: "Ерусалим", alternatives: ["Коринт", "Рим"] },
          ],
          errorWordIndex: 9,
          correctReplacement: "Коринт",
        },
      },
    ],
  });
}
