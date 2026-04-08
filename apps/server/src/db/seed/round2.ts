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
      title: "Round 2: Bible chronology",
    },
  });

  await prisma.question.createMany({
    data: [
      // Question 0: Test question
      {
        roundId: round.id,
        index: 0,
        questionText: "Примерен въпрос",
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
      // Question 1: Moses - 12 events
      {
        roundId: round.id,
        index: 1,
        questionText: "Подредете тези събития от живота на Мойсей в правилния хронологичен ред:",
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
        questionText: "Подредете тези събития от живота на Давид в правилния хронологичен ред:",
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
      // Question 3: Jesus - 12 events
      {
        roundId: round.id,
        index: 3,
        questionText: "Подредете тези събития от живота на Исус Христос в правилния хронологичен ред:",
        type: "CHRONOLOGY",
        points: 12,
        timeLimitSeconds: 360,
        content: {
          items: [
            { id: "j1", text: "Исус се ражда във Витлеем", order: 0 },
            { id: "j2", text: "Мъдреци от Изток Му носят дарове", order: 1 },
            { id: "j3", text: "Семейството бяга в Египет", order: 2 },
            { id: "j4", text: "Исус е кръстен от Йоан в Йордан", order: 3 },
            { id: "j5", text: "Исус е изкушен в пустинята 40 дни", order: 4 },
            { id: "j6", text: "Исус проповядва Царството Божие в Галилея", order: 5 },
            { id: "j7", text: "Исус храни 5000 души с пет хляба и две риби", order: 6 },
            { id: "j8", text: "Исус се преобразява на планината", order: 7 },
            { id: "j9", text: "Исус влиза тържествено в Йерусалим", order: 8 },
            { id: "j10", text: "Исус е разпънат на кръст", order: 9 },
            { id: "j11", text: "Исус възкръсва от мъртвите", order: 10 },
            { id: "j12", text: "Исус се въздига на небето", order: 11 },
          ],
        },
        grading: "AUTO",
      },
      // Question 4: Paul - 12 events
      {
        roundId: round.id,
        index: 4,
        questionText: "Подредете тези събития от живота на апостол Павел в правилния хронологичен ред:",
        type: "CHRONOLOGY",
        points: 12,
        timeLimitSeconds: 360,
        content: {
          items: [
            { id: "p1", text: "Павел (тогава Савл) се ражда в Тарсус", order: 0 },
            { id: "p2", text: "Павел учи при равина Гамалиил", order: 1 },
            { id: "p3", text: "Павел преследва ранната църква", order: 2 },
            { id: "p4", text: "Павел се преобразява по пътя за Дамаск", order: 3 },
            { id: "p5", text: "Павел бяга от Дамаск в кошница", order: 4 },
            { id: "p6", text: "Павел започва първото си мисионерско пътешествие", order: 5 },
            { id: "p7", text: "Първият събор в Йерусалим решава за езичниците", order: 6 },
            { id: "p8", text: "Павел е затворен във Филипи и бит с тояги", order: 7 },
            { id: "p9", text: "Павел говори на Ареопага в Атина", order: 8 },
            { id: "p10", text: "Павел е арестуван в Йерусалим", order: 9 },
            { id: "p11", text: "Павел се явява пред цар Агрипа", order: 10 },
            { id: "p12", text: "Павел е изпратен в Рим като затворник", order: 11 },
          ],
        },
        grading: "AUTO",
      },
    ],
  });
}
