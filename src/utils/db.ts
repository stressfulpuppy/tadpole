import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";

mkdirSync("data", { recursive: true });

const db = new Database("data/files.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL,
    username TEXT,
    avatar TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_discord_id ON sessions (discord_id);
`);

const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
if (!sessionColumns.some((c) => c.name === "ip")) {
  db.exec("ALTER TABLE sessions ADD COLUMN ip TEXT");
}
if (sessionColumns.some((c) => c.name === "ip_hash")) {
  db.exec("ALTER TABLE sessions DROP COLUMN ip_hash");
}

export default db;
