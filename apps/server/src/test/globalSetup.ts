import { Pool } from "pg";
import path from "path";
import dotenv from "dotenv";
import { execFileSync } from "child_process";

dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

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
    [testDbName],
  );

  await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
  await adminPool.query(`CREATE DATABASE ${testDbName}`);
  await adminPool.end();

  // Apply Prisma migrations to keep test schema aligned with schema.prisma.
  const dbUser = process.env.DB_USER || "quizuser";
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPassword = process.env.DB_PASSWORD || "quizpassword";
  const dbPort = process.env.DB_PORT || "5433";
  const testDatabaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${testDbName}`;
  const serverRoot = path.resolve(__dirname, "../..");

  console.log("Applying Prisma migrations to test database...");
  execFileSync(
    "npx",
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      cwd: serverRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    },
  );

  console.log("Test database setup complete.");
}
