import express from "express";
import { ProofClient } from "./proof-client.ts";
import { initEventPoller, getEventPoller } from "./agents/event-poller.ts";
import { handleMentions } from "./agents/mention-parser.ts";
import { ScheduledScanner } from "./agents/scheduled-scanner.ts";
import { AgentRegistry } from "./agents/registry.ts";
import { TriageAgent } from "./agents/triage-agent.ts";
import { SreAgent } from "./agents/sre-agent.ts";
import { ResearchAgent } from "./agents/research-agent.ts";
import { initSlack } from "./slack/slack-app.ts";

// Initialize DB (runs migrations on import)
import "./db/index.ts";

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const proofClient = new ProofClient();

// Register agents
AgentRegistry.register(new TriageAgent());
AgentRegistry.register(new SreAgent());
AgentRegistry.register(new ResearchAgent());

const poller = initEventPoller(proofClient);
poller.onEvent(handleMentions);

// Import routes after poller is initialized
const { default: threadRoutes } = await import("./routes/threads.ts");
const { default: inviteRoutes } = await import("./routes/invites.ts");

app.use(express.json());

app.get("/health", async (_req, res) => {
  const proofSdkReachable = await proofClient.isReachable();
  const poller = getEventPoller();
  res.json({
    ok: true,
    proofSdkReachable,
    activePollers: poller.activeThreadIds.length,
  });
});

app.use("/api/threads", threadRoutes);
app.use("/api/threads/:id/invite", inviteRoutes);

// Initialize Slack (no-op if SLACK_BOT_TOKEN not set)
initSlack(app);

app.listen(PORT, () => {
  console.log(`proof-queue listening on http://localhost:${PORT}`);
  getEventPoller().startAll();
  ScheduledScanner.start();
});
