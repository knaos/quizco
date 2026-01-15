import { beforeEach, afterAll } from "vitest";
import pool from "../db";

// Force test database
process.env.DB_NAME = "quizco_test";

beforeEach(async () => {
  // Clear all data before each test
  // We use CASCADE to handle foreign key constraints
  await pool.query(
    "TRUNCATE teams, competitions, rounds, questions, answers CASCADE"
  );
});

afterAll(async () => {
  // Close the pool after all tests in a file
  await pool.end();
});
