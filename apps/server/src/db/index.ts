import { Pool } from "pg";

const pool = new Pool({
  user: process.env.DB_USER || "quizuser",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "quizco",
  password: process.env.DB_PASSWORD || "quizpassword",
  port: parseInt(process.env.DB_PORT || "5433"),
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
