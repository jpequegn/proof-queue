import { Router } from "express";
import { ProofClient } from "../proof-client.ts";
import { ThreadStore } from "../thread-store.ts";

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

  res.status(201).json({
    ...thread,
    proofUrl: doc.url,
  });
});

// GET /api/threads — list all (optionally filter by status)
router.get("/", (_req, res) => {
  const status = _req.query.status as string | undefined;
  const threads = ThreadStore.findAll(status);
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
  res.json(closed);
});

export default router;
