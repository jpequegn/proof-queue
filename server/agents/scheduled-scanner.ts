import Anthropic from "@anthropic-ai/sdk";
import { ThreadStore, type Thread } from "../thread-store.ts";
import { AgentRegistry } from "./registry.ts";

const SCAN_INTERVAL_MS = Number.parseInt(
  process.env.SCAN_INTERVAL_MS ?? "600000",
  10
);

const anthropic = new Anthropic();

interface ScanResult {
  threadId: string;
  reason: string;
}

function buildScanPrompt(threads: Thread[]): string {
  const threadList = threads
    .map(
      (t) =>
        `- ID: ${t.id} | Title: "${t.title}" | Status: ${t.status} | Tags: [${t.tags.join(", ")}] | Updated: ${t.updatedAt} | Created: ${t.createdAt}`
    )
    .join("\n");

  return `You are a thread triage assistant. Review these open threads and identify which ones need proactive attention.

Flag threads that are:
- Stale (no activity in >30 minutes)
- Escalating (status is 'escalated' or tags suggest urgency)
- Unresolved for too long

Current time: ${new Date().toISOString()}

Threads:
${threadList}

Respond with ONLY a JSON array of threads needing attention. Each element must have:
- "threadId": the thread ID
- "reason": brief explanation (max 15 words)

If no threads need attention, respond with an empty array: []`;
}

function parseScanResponse(text: string): ScanResult[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]) as ScanResult[];
  } catch {
    return [];
  }
}

async function runScan(): Promise<void> {
  const threads = ThreadStore.findAllOpen();
  if (threads.length === 0) return;

  const prompt = buildScanPrompt(threads);

  let results: ScanResult[];
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    results = parseScanResponse(text);
  } catch (err) {
    console.error("Scheduled scan LLM call failed:", err);
    return;
  }

  if (results.length === 0) return;

  const threadMap = new Map(threads.map((t) => [t.id, t]));
  const agents = AgentRegistry.all();

  for (const result of results) {
    const thread = threadMap.get(result.threadId);
    if (!thread) continue;

    for (const agent of agents) {
      if (!agent.onScan) continue;
      try {
        await agent.onScan({ thread, reason: result.reason });
      } catch (err) {
        console.error(
          `Scan handler error for agent ${agent.name} on thread ${thread.id}:`,
          err
        );
      }
    }
  }

  console.log(
    `Scheduled scan: flagged ${results.length} thread(s) for attention`
  );
}

let timer: ReturnType<typeof setInterval> | null = null;

export const ScheduledScanner = {
  start(): void {
    if (timer) return;
    console.log(
      `ScheduledScanner: starting with interval ${SCAN_INTERVAL_MS}ms`
    );
    // Run first scan after a short delay to let the system settle
    setTimeout(runScan, 5_000);
    timer = setInterval(runScan, SCAN_INTERVAL_MS);
  },

  stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  },

  /** Expose for testing. */
  runScan,
  parseScanResponse,

  get isRunning(): boolean {
    return timer !== null;
  },
};
