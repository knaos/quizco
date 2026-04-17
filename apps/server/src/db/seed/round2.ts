import { Prisma } from "@prisma/client";
import prisma from "../prisma";

/**
 * Seeds Round 2: Bible Chronology
 * Four questions requiring players to order events chronologically
 */
export async function seedRound2(competitionId: string): Promise<void> {
  const round = await prisma.round.create({
    data: {
      competitionId,
      orderIndex: 2,
      type: "STANDARD",
      title: "Рунд 2: Библейска хронология",
    },
  });

  await prisma.question.createMany({
    data: [
      // Question 0: Test question
      {
        roundId: round.id,
        index: 0,
        realIndex: 0,
        questionText: "Подредете тези събития от живота на Мойсей в правилния хронологичен ред",
        type: "CHRONOLOGY",
        points: 0,
        timeLimitSeconds: 360,
        content: {
          items: [
            { id: "m1", text: "Мойсей се ражда и е поставен в кошница по река Нил", order: 0 },
            { id: "m2", text: "Мойсей убива египетски надзирател и бяга в Мидиан", order: 1 },
            { id: "m3", text: "Бог се явява на Мойсей в горящия храст", order: 2 },
            { id: "m4", text: "Мойсей се завръща в Египет с Аарон", order: 3 },
            { id: "m5", text: "Мойсей разделя Червено море", order: 4 },
            { id: "m6", text: "Бог дава манна на народа в пустинята", order: 5 },
            { id: "m7", text: "Мойсей се изкачва на планината Синай", order: 6 },
            { id: "m8", text: "Аарон прави златно теле", order: 7 },
            { id: "m9", text: "Мойсей чупи плочите на завета", order: 8 },
            { id: "m10", text: "Мойсей чука скалата при Мерива и водата потича", order: 9 },
            { id: "m11", text: "Мойсей издига медна змия в пустинята", order: 10 },
            { id: "m12", text: "Мойсей умира на планината Нево", order: 11 },
          ],
        },
        grading: "AUTO",
      },
      // Question 1: Moses - 12 events
      {
        roundId: round.id,
        index: 1,
        realIndex: 1,
        questionText: "Подредете тези събития от живота на Мойсей в правилния хронологичен ред",
        type: "CHRONOLOGY",
        points: 12,
        timeLimitSeconds: 360,
        content: {
          items: [
            { id: "m1", text: "Мойсей се ражда и е поставен в кошница по река Нил", order: 0 },
            { id: "m2", text: "Мойсей убива египетски надзирател и бяга в Мидиан", order: 1 },
            { id: "m3", text: "Бог се явява на Мойсей в горящия храст", order: 2 },
            { id: "m4", text: "Мойсей се завръща в Египет с Аарон", order: 3 },
            { id: "m5", text: "Мойсей разделя Червено море", order: 4 },
            { id: "m6", text: "Бог дава манна на народа в пустинята", order: 5 },
            { id: "m7", text: "Мойсей се изкачва на планината Синай", order: 6 },
            { id: "m8", text: "Аарон прави златно теле", order: 7 },
            { id: "m9", text: "Мойсей чупи плочите на завета", order: 8 },
            { id: "m10", text: "Мойсей чука скалата при Мерива и водата потича", order: 9 },
            { id: "m11", text: "Мойсей издига медна змия в пустинята", order: 10 },
            { id: "m12", text: "Мойсей умира на планината Нево", order: 11 },
          ],
        },
        grading: "AUTO",
      },
      // Question 2: David - 12 events
      {
        roundId: round.id,
        index: 2,
        realIndex: 2,
        questionText: "Подредете тези събития от живота на Давид в правилния хронологичен ред",
        type: "CHRONOLOGY",
        points: 12,
        timeLimitSeconds: 360,
        content: {
          items: [
            { id: "d1", text: "Давид е помазан от Самуил за цар", order: 0 },
            { id: "d2", text: "Давид побеждава Голиат с прашка", order: 1 },
            { id: "d3", text: "Давид става слуга на цар Саул", order: 2 },
            { id: "d4", text: "Давид бяга от Саул в пустинята", order: 3 },
            { id: "d5", text: "Давид щади живота на Саул в пещерата", order: 4 },
            { id: "d6", text: "Саул умира и Давид става цар на Юда", order: 5 },
            { id: "d7", text: "Давид побеждава филистимците и става цар на це Израил", order: 6 },
            { id: "d8", text: "Давид взема Бат-Шева", order: 7 },
            { id: "d9", text: "Пророк Натан обвинява Давид за греха", order: 8 },
            { id: "d10", text: "Синът на Давид Авесалом въстава", order: 9 },
            { id: "d11", text: "Давид построява жертвеник на Господа", order: 10 },
            { id: "d12", text: "Соломон, синът на Давид, става цар", order: 11 },
          ],
        },
        grading: "AUTO",
      },
    ],
  });
}
