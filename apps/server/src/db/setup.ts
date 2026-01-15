import fs from "fs";
import path from "path";
import { query } from "./index";

async function setup() {
  console.log("Setting up database schema...");
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  try {
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
