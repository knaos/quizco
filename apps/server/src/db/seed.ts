import { query } from "./index";

async function seed() {
  console.log("Seeding database...");

  try {
    // 1. Create a competition
    const compRes = await query(
      "INSERT INTO competitions (title, host_pin, status) VALUES ('Bible Hero Challenge', '1234', 'ACTIVE') RETURNING id"
    );
    const competitionId = compRes.rows[0].id;

    // 2. Create a round
    const roundRes = await query(
      "INSERT INTO rounds (competition_id, order_index, type, title) VALUES ($1, 1, 'STANDARD', 'General Knowledge') RETURNING id",
      [competitionId]
    );
    const roundId = roundRes.rows[0].id;

    // 3. Add some questions
    const questions = [
      {
        text: "Who built the ark?",
        type: "MULTIPLE_CHOICE",
        points: 10,
        content: {
          options: ["Moses", "Noah", "Abraham", "David"],
          correct_index: 1,
        },
      },
      {
        text: "What is the first book of the Bible?",
        type: "OPEN_WORD",
        points: 15,
        content: {
          answer: "Genesis",
        },
      },
      {
        text: "Jesus was born in which town?",
        type: "MULTIPLE_CHOICE",
        points: 10,
        content: {
          options: ["Nazareth", "Jerusalem", "Bethlehem", "Jericho"],
          correct_index: 2,
        },
      },
    ];

    for (const q of questions) {
      await query(
        "INSERT INTO questions (round_id, question_text, type, points, content) VALUES ($1, $2, $3, $4, $5)",
        [roundId, q.text, q.type, q.points, JSON.stringify(q.content)]
      );
    }

    // 4. Add a crossword question
    const crosswordRoundRes = await query(
      "INSERT INTO rounds (competition_id, order_index, type, title) VALUES ($1, 2, 'CROSSWORD', 'Bible Crossword') RETURNING id",
      [competitionId]
    );
    const crosswordRoundId = crosswordRoundRes.rows[0].id;

    const crosswordContent = {
      grid: [
        ["J", "E", "S", "U", "S"],
        ["O", "", "", "", ""],
        ["H", "", "", "", ""],
        ["N", "", "", "", ""],
      ],
      clues: {
        across: [
          { number: 1, clue: "Son of God", answer: "JESUS", row: 0, col: 0 },
        ],
        down: [
          {
            number: 1,
            clue: "Wrote the 4th Gospel",
            answer: "JOHN",
            row: 0,
            col: 0,
          },
        ],
      },
    };

    await query(
      "INSERT INTO questions (round_id, question_text, type, points, content) VALUES ($1, 'Complete the Bible crossword', 'CROSSWORD', 50, $2)",
      [crosswordRoundId, JSON.stringify(crosswordContent)]
    );

    console.log("Seeding completed successfully.");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    process.exit();
  }
}

seed();
