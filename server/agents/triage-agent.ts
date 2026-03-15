import { BaseAgent } from "./base-agent.ts";
import type { AgentScanEvent, AgentThreadCreatedEvent } from "./types.ts";

export class TriageAgent extends BaseAgent {
  readonly name = "triage-agent";

  override async onThreadCreated(event: AgentThreadCreatedEvent): Promise<void> {
    const { thread } = event;

    await this.updatePresence(thread, "watching", "Monitoring new thread");

    const tags = thread.tags.length > 0 ? thread.tags.join(", ") : "none";
    await this.addComment(
      thread,
      `**Thread opened** by ${thread.createdBy}\n\n` +
        `**Title:** ${thread.title}\n` +
        `**Tags:** ${tags}\n\n` +
        `I'm monitoring this thread. Mention \`@triage-agent\` if you need help routing or prioritizing.`
    );
  }

  override async onScan(event: AgentScanEvent): Promise<void> {
    const { thread, reason } = event;

    await this.updatePresence(thread, "reviewing", reason);

    await this.addComment(
      thread,
      `**Proactive check-in** — This thread was flagged: _${reason}_\n\n` +
        `Suggested next steps:\n` +
        `- Review the latest state of this thread\n` +
        `- Escalate if needed by updating status to \`escalated\`\n` +
        `- Mention a specialist agent (e.g. \`@sre-agent\`) for domain expertise`
    );
  }
}
