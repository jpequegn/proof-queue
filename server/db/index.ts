import { Database } from "bun:sqlite";
import { migrate } from "./migrate.ts";

const DB_PATH = process.env.DB_PATH ?? "proof-queue.db";

const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

migrate(db);

export default db;
