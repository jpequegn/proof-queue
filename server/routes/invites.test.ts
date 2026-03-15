import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import { migrate } from "../db/migrate.ts";
import { v4 as uuidv4 } from "uuid";

let db: Database;

beforeAll(() => {
  db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
});

describe("invite logic", () => {
  test("parses human identity", () => {
    const identity = "human:alice";
    const [type, name] = identity.split(":", 2);
    expect(type).toBe("human");
    expect(name).toBe("alice");
  });

  test("parses ai identity", () => {
    const identity = "ai:sre-agent";
    const [type, name] = identity.split(":", 2);
    expect(type).toBe("ai");
    expect(name).toBe("sre-agent");
  });

  test("rejects invalid identity format", () => {
    const identity = "invalid";
    const parts = identity.split(":", 2);
    expect(parts).toHaveLength(1);
  });

  test("adds participant to DB", () => {
    const threadId = uuidv4();
    db.run(
      `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [threadId, `slug-${threadId.slice(0, 8)}`, "tok", "secret", "Test", "[]", "user-1"]
    );

    const pId = uuidv4();
    db.run(
      `INSERT INTO participants (id, thread_id, agent_id, role)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(thread_id, agent_id) DO UPDATE SET role = excluded.role`,
      [pId, threadId, "alice", "member"]
    );

    const participants = db
      .query("SELECT * FROM participants WHERE thread_id = ?")
      .all(threadId) as Array<{ agent_id: string; role: string }>;
    expect(participants).toHaveLength(1);
    expect(participants[0]!.agent_id).toBe("alice");
    expect(participants[0]!.role).toBe("member");
  });

  test("adds agent participant with agent role", () => {
    const threadId = uuidv4();
    db.run(
      `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [threadId, `slug-${threadId.slice(0, 8)}`, "tok", "secret", "Test", "[]", "user-1"]
    );

    const pId = uuidv4();
    db.run(
      `INSERT INTO participants (id, thread_id, agent_id, role)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(thread_id, agent_id) DO UPDATE SET role = excluded.role`,
      [pId, threadId, "sre-agent", "agent"]
    );

    const participants = db
      .query("SELECT * FROM participants WHERE thread_id = ?")
      .all(threadId) as Array<{ agent_id: string; role: string }>;
    expect(participants).toHaveLength(1);
    expect(participants[0]!.role).toBe("agent");
  });

  test("upserts on duplicate invite", () => {
    const threadId = uuidv4();
    db.run(
      `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [threadId, `slug-${threadId.slice(0, 8)}`, "tok", "secret", "Test", "[]", "user-1"]
    );

    db.run(
      `INSERT INTO participants (id, thread_id, agent_id, role)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(thread_id, agent_id) DO UPDATE SET role = excluded.role`,
      [uuidv4(), threadId, "bob", "member"]
    );

    // Re-invite with different role
    db.run(
      `INSERT INTO participants (id, thread_id, agent_id, role)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(thread_id, agent_id) DO UPDATE SET role = excluded.role`,
      [uuidv4(), threadId, "bob", "agent"]
    );

    const participants = db
      .query("SELECT * FROM participants WHERE thread_id = ? AND agent_id = ?")
      .all(threadId, "bob") as Array<{ role: string }>;
    expect(participants).toHaveLength(1);
    expect(participants[0]!.role).toBe("agent");
  });
});
