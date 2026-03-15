import { Router } from "express";
import { ProofClient } from "../proof-client.ts";
import { ThreadStore } from "../thread-store.ts";
import { AgentRegistry } from "../agents/registry.ts";
import { getEventPoller } from "../agents/event-poller.ts";

const router = Router({ mergeParams: true });
const proofClient = new ProofClient();

// POST /api/threads/:id/invite
router.post("/", async (req, res) => {
  const threadId = (req.params as Record<string, string>).id;
  const thread = ThreadStore.findById(threadId!);
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const { identity, reason, invitedBy } = req.body as {
    identity?: string;
    reason?: string;
    invitedBy?: string;
  };

  if (!identity || !reason) {
    res.status(400).json({ error: "identity and reason are required" });
    return;
  }

  // Parse identity: "human:alice" or "ai:sre-agent"
  const [type, name] = identity.split(":", 2);
  if (!type || !name || (type !== "human" && type !== "ai")) {
    res.status(400).json({
      error: "identity must be 'human:<name>' or 'ai:<agent-name>'",
    });
    return;
  }

  // Add participant to DB
  const role = type === "ai" ? "agent" : "member";
  ThreadStore.addParticipant(thread.id, name, role);

  // Post invite comment in Proof doc
  const caller = invitedBy ?? "system";
  try {
    await proofClient.addComment(thread.slug, {
      by: caller,
      quote: "",
      text: `**@${name}** was invited by @${caller}: _${reason}_`,
    });
  } catch {
    // Non-fatal: comment is best-effort
  }

  // If the invitee is an agent, ensure event polling is active for this thread
  if (type === "ai" && AgentRegistry.has(name)) {
    getEventPoller().startThread(thread);
  }

  res.status(201).json({
    threadId: thread.id,
    identity,
    role,
    reason,
  });
});

export default router;
