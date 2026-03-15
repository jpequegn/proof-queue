import express from "express";
import { ProofClient } from "./proof-client.ts";

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const proofClient = new ProofClient();

app.use(express.json());

app.get("/health", async (_req, res) => {
  const proofSdkReachable = await proofClient.isReachable();
  res.json({ ok: true, proofSdkReachable });
});

app.listen(PORT, () => {
  console.log(`proof-queue listening on http://localhost:${PORT}`);
});
