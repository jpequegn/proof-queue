import { v4 as uuidv4 } from "uuid";
import db from "./db/index.ts";

export interface Thread {
  id: string;
  slug: string;
  accessToken: string;
  ownerSecret: string;
  title: string;
  status: "open" | "in_progress" | "resolved" | "escalated";
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastEventId: number;
  priorityCache: string | null;
  priorityCachedAt: string | null;
}

export interface Participant {
  id: string;
  threadId: string;
  agentId: string;
  role: string;
  joinedAt: string;
}

interface CreateThreadInput {
  slug: string;
  accessToken: string;
  ownerSecret: string;
  title: string;
  createdBy: string;
  tags?: string[];
}

function rowToThread(row: Record<string, unknown>): Thread {
  return {
    id: row.id as string,
    slug: row.slug as string,
    accessToken: row.access_token as string,
    ownerSecret: row.owner_secret as string,
    title: row.title as string,
    status: row.status as Thread["status"],
    tags: JSON.parse(row.tags as string) as string[],
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    lastEventId: row.last_event_id as number,
    priorityCache: row.priority_cache as string | null,
    priorityCachedAt: row.priority_cached_at as string | null,
  };
}

export const ThreadStore = {
  create(input: CreateThreadInput): Thread {
    const id = uuidv4();
    const tags = JSON.stringify(input.tags ?? []);

    db.run(
      `INSERT INTO threads (id, slug, access_token, owner_secret, title, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.accessToken, input.ownerSecret, input.title, tags, input.createdBy]
    );

    return this.findById(id)!;
  },

  findById(id: string): Thread | undefined {
    const row = db.query("SELECT * FROM threads WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? rowToThread(row) : undefined;
  },

  findAll(status?: string): Thread[] {
    if (status) {
      const rows = db
        .query("SELECT * FROM threads WHERE status = ? ORDER BY updated_at DESC")
        .all(status) as Record<string, unknown>[];
      return rows.map(rowToThread);
    }
    const rows = db
      .query("SELECT * FROM threads ORDER BY updated_at DESC")
      .all() as Record<string, unknown>[];
    return rows.map(rowToThread);
  },

  updateStatus(id: string, status: Thread["status"]): Thread | undefined {
    db.run(
      "UPDATE threads SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id]
    );
    return this.findById(id);
  },

  updateTags(id: string, tags: string[]): Thread | undefined {
    db.run(
      "UPDATE threads SET tags = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(tags), id]
    );
    return this.findById(id);
  },

  close(id: string): Thread | undefined {
    return this.updateStatus(id, "resolved");
  },

  addParticipant(threadId: string, agentId: string, role = "member"): Participant {
    const id = uuidv4();
    db.run(
      `INSERT INTO participants (id, thread_id, agent_id, role)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(thread_id, agent_id) DO UPDATE SET role = excluded.role`,
      [id, threadId, agentId, role]
    );

    return db
      .query("SELECT * FROM participants WHERE thread_id = ? AND agent_id = ?")
      .get(threadId, agentId) as Participant;
  },

  getParticipants(threadId: string): Participant[] {
    return db
      .query("SELECT * FROM participants WHERE thread_id = ?")
      .all(threadId) as Participant[];
  },
};
