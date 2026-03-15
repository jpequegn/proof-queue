import { Router } from "express";
import { ProofClient } from "../proof-client.ts";
import { ThreadStore } from "../thread-store.ts";
import { rankThreads, invalidateCache } from "../ranking/ranking-service.ts";
import { PROFILES, type ProfileName } from "../ranking/profiles.ts";
import { getEventPoller } from "../agents/event-poller.ts";
import { AgentRegistry } from "../agents/registry.ts";

const router = Router();
const proofClient = new ProofClient();

// POST /api/threads — create thread + Proof doc
router.post("/", async (req, res) => {
  const { title, createdBy, tags, markdown } = req.body as {
    title?: string;
    createdBy?: string;
    tags?: string[];
    markdown?: string;
  };

  if (!title || !createdBy) {
    res.status(400).json({ error: "title and createdBy are required" });
    return;
  }

  let doc;
  try {
    doc = await proofClient.createDocument({ title, markdown });
  } catch (err) {
    res.status(502).json({ error: "Failed to create Proof document", details: String(err) });
    return;
  }

  const thread = ThreadStore.create({
    slug: doc.slug,
    accessToken: doc.accessToken,
    ownerSecret: doc.ownerSecret,
    title,
    createdBy,
    tags,
  });

  // Set initial presence (best-effort)
  try {
    await proofClient.setPresence(doc.slug, {
      agentId: createdBy,
      name: createdBy,
      status: "watching",
    });
  } catch {
    // Non-fatal
  }

  ThreadStore.addParticipant(thread.id, createdBy, "owner");
  invalidateCache();

  // Start polling for events on the new thread
  getEventPoller().startThread(thread);

  // Notify agents of new thread (best-effort, non-blocking)
  for (const agent of AgentRegistry.all()) {
    if (agent.onThreadCreated) {
      Promise.resolve(agent.onThreadCreated({ thread })).catch((err: unknown) => {
        console.error(`onThreadCreated error for ${agent.name}:`, err);
      });
    }
  }

  res.status(201).json({
    ...thread,
    proofUrl: doc.url,
  });
});

// GET /api/threads — list all, optionally ranked by profile
router.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  const profile = req.query.profile as string | undefined;
  const threads = ThreadStore.findAll(status);

  if (profile) {
    if (!(profile in PROFILES)) {
      res.status(400).json({
        error: `Invalid profile. Valid profiles: ${Object.keys(PROFILES).join(", ")}`,
      });
      return;
    }

    try {
      const ranked = await rankThreads(threads, profile as ProfileName);
      const rankMap = new Map(ranked.map((r) => [r.threadId, r]));
      const result = threads
        .map((t) => {
          const rank = rankMap.get(t.id);
          return {
            ...t,
            priority: rank
              ? { score: rank.score, reason: rank.reason }
              : { score: 0, reason: "unranked" },
          };
        })
        .sort((a, b) => b.priority.score - a.priority.score);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: "Ranking failed", details: String(err) });
    }
    return;
  }

  res.json(threads);
});

// GET /api/threads/:id — get with participants
router.get("/:id", (req, res) => {
  const thread = ThreadStore.findById(req.params.id);
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const participants = ThreadStore.getParticipants(thread.id);
  res.json({ ...thread, participants });
});

// PATCH /api/threads/:id — update status/tags
router.patch("/:id", (req, res) => {
  const thread = ThreadStore.findById(req.params.id);
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const { status, tags } = req.body as {
    status?: "open" | "in_progress" | "resolved" | "escalated";
    tags?: string[];
  };

  let updated = thread;
  if (status) updated = ThreadStore.updateStatus(thread.id, status) ?? thread;
  if (tags) updated = ThreadStore.updateTags(thread.id, tags) ?? updated;
  invalidateCache();

  res.json(updated);
});

// DELETE /api/threads/:id — resolve/close
router.delete("/:id", (req, res) => {
  const thread = ThreadStore.findById(req.params.id);
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const closed = ThreadStore.close(thread.id);
  invalidateCache();
  getEventPoller().stopThread(thread.id);
  res.json(closed);
});

export default router;
