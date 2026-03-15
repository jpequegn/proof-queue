import express from "express";
import { ProofClient } from "./proof-client.ts";
import { initEventPoller, getEventPoller } from "./agents/event-poller.ts";

// Initialize DB (runs migrations on import)
import "./db/index.ts";

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const proofClient = new ProofClient();

initEventPoller(proofClient);

// Import routes after poller is initialized
const { default: threadRoutes } = await import("./routes/threads.ts");

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

app.listen(PORT, () => {
  console.log(`proof-queue listening on http://localhost:${PORT}`);
  getEventPoller().startAll();
});
