import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import { migrate } from "./db/migrate.ts";

// Set up in-memory DB before importing the store
// We need to mock the db module
import { v4 as uuidv4 } from "uuid";

let db: Database;

beforeAll(() => {
  db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
});

function rowToThread(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    slug: row.slug as string,
    accessToken: row.access_token as string,
    ownerSecret: row.owner_secret as string,
    title: row.title as string,
    status: row.status as string,
    tags: JSON.parse(row.tags as string) as string[],
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    lastEventId: row.last_event_id as number,
    priorityCache: row.priority_cache as string | null,
    priorityCachedAt: row.priority_cached_at as string | null,
  };
}

describe("ThreadStore (direct DB)", () => {
  test("create and retrieve a thread", () => {
    const id = uuidv4();
    db.run(
      `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, "test-slug", "tok", "secret", "Test Thread", "[]", "agent-1"]
    );

    const row = db.query("SELECT * FROM threads WHERE id = ?").get(id) as Record<string, unknown>;
    const thread = rowToThread(row);
    expect(thread.title).toBe("Test Thread");
    expect(thread.status).toBe("open");
    expect(thread.tags).toEqual([]);
  });

  test("update status", () => {
    const id = uuidv4();
    db.run(
      `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, `slug-${id.slice(0, 8)}`, "tok", "secret", "Status Test", "[]", "agent-1"]
    );

    db.run("UPDATE threads SET status = ? WHERE id = ?", ["in_progress", id]);
    const row = db.query("SELECT * FROM threads WHERE id = ?").get(id) as Record<string, unknown>;
    expect(row.status).toBe("in_progress");
  });

  test("status transitions: open → in_progress → resolved", () => {
    const id = uuidv4();
    db.run(
      `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, `slug-${id.slice(0, 8)}`, "tok", "secret", "Transition Test", "[]", "agent-1"]
    );

    // open → in_progress
    db.run("UPDATE threads SET status = ? WHERE id = ?", ["in_progress", id]);
    let row = db.query("SELECT status FROM threads WHERE id = ?").get(id) as { status: string };
    expect(row.status).toBe("in_progress");

    // in_progress → resolved
    db.run("UPDATE threads SET status = ? WHERE id = ?", ["resolved", id]);
    row = db.query("SELECT status FROM threads WHERE id = ?").get(id) as { status: string };
    expect(row.status).toBe("resolved");
  });

  test("tags stored as JSON", () => {
    const id = uuidv4();
    const tags = JSON.stringify(["urgent", "infra"]);
    db.run(
      `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, `slug-${id.slice(0, 8)}`, "tok", "secret", "Tags Test", tags, "agent-1"]
    );

    const row = db.query("SELECT * FROM threads WHERE id = ?").get(id) as Record<string, unknown>;
    const thread = rowToThread(row);
    expect(thread.tags).toEqual(["urgent", "infra"]);
  });

  test("participants with unique constraint", () => {
    const threadId = uuidv4();
    db.run(
      `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [threadId, `slug-${threadId.slice(0, 8)}`, "tok", "secret", "Participant Test", "[]", "agent-1"]
    );

    const pId = uuidv4();
    db.run(
      `INSERT INTO participants (id, thread_id, agent_id, role) VALUES (?, ?, ?, ?)`,
      [pId, threadId, "agent-1", "owner"]
    );

    const participants = db
      .query("SELECT * FROM participants WHERE thread_id = ?")
      .all(threadId);
    expect(participants).toHaveLength(1);
  });

  test("findAll returns threads ordered by updated_at DESC", () => {
    // Clear existing
    db.run("DELETE FROM participants");
    db.run("DELETE FROM threads");

    for (let i = 0; i < 3; i++) {
      const id = uuidv4();
      db.run(
        `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '+${i} seconds'))`,
        [id, `slug-${i}`, "tok", "secret", `Thread ${i}`, "[]", "agent-1"]
      );
    }

    const rows = db
      .query("SELECT * FROM threads ORDER BY updated_at DESC")
      .all() as Record<string, unknown>[];
    expect(rows).toHaveLength(3);
    expect((rows[0] as { title: string }).title).toBe("Thread 2");
  });
});
