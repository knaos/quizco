import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export async function setup() {
  const adminPool = new Pool({
    user: process.env.DB_USER || "quizuser",
    host: process.env.DB_HOST || "localhost",
    database: "postgres", // Connect to default postgres db to manage other dbs
    password: process.env.DB_PASSWORD || "quizpassword",
    port: parseInt(process.env.DB_PORT || "5433"),
  });

  const testDbName = "quizco_test";

  console.log(`Cleaning up and creating test database: ${testDbName}`);

  // Terminate existing connections to the test database
  await adminPool.query(
    `
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid();
  `,
    [testDbName]
  );

  await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
  await adminPool.query(`CREATE DATABASE ${testDbName}`);
  await adminPool.end();

  // Now connect to the new test db and run schema
  const testPool = new Pool({
    user: process.env.DB_USER || "quizuser",
    host: process.env.DB_HOST || "localhost",
    database: testDbName,
    password: process.env.DB_PASSWORD || "quizpassword",
    port: parseInt(process.env.DB_PORT || "5433"),
  });

  console.log("Applying schema to test database...");
  const schemaPath = path.join(__dirname, "../db/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await testPool.query(schema);
  await testPool.end();

  console.log("Test database setup complete.");
}
