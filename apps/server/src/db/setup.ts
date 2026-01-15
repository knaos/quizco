import fs from "fs";
import path from "path";
import { query } from "./index";

async function setup() {
  console.log("Setting up database schema...");
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  try {
    // Drop existing tables and types to ensure a clean state
    await query(`
      DROP TABLE IF EXISTS answers CASCADE;
      DROP TABLE IF EXISTS questions CASCADE;
      DROP TABLE IF EXISTS rounds CASCADE;
      DROP TABLE IF EXISTS competitions CASCADE;
      DROP TABLE IF EXISTS teams CASCADE;
      DROP TYPE IF EXISTS question_type CASCADE;
      DROP TYPE IF EXISTS grading_mode CASCADE;
      DROP TYPE IF EXISTS competition_status CASCADE;
      DROP TYPE IF EXISTS round_type CASCADE;
    `);

    await query(schema);
    console.log("Schema applied successfully.");
  } catch (err) {
    console.error("Error applying schema:", err);
  }
}

if (require.main === module) {
  setup().then(() => process.exit());
}

export { setup };
