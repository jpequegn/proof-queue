import { ProofClient } from "../proof-client.ts";
import { ThreadStore, type Thread } from "../thread-store.ts";
import { AgentRegistry } from "./registry.ts";
import { getEventPoller } from "./event-poller.ts";
import type {
  AgentHandler,
  AgentMentionEvent,
  AgentScanEvent,
  AgentThreadCreatedEvent,
} from "./types.ts";

const proofClient = new ProofClient();

export abstract class BaseAgent implements AgentHandler {
  abstract readonly name: string;

  /** Helper: add a comment to a thread's Proof doc with agent provenance. */
  protected async addComment(thread: Thread, text: string): Promise<void> {
    await proofClient.addComment(thread.slug, {
      by: `ai:${this.name}`,
      quote: "",
      text,
    });
  }

  /** Helper: update agent presence on a thread's Proof doc. */
  protected async updatePresence(
    thread: Thread,
    status: string,
    details?: string
  ): Promise<void> {
    await proofClient.setPresence(thread.slug, {
      agentId: this.name,
      name: this.name,
      status,
      details,
    });
  }

  /** Helper: invite a human or agent into a thread. */
  protected async invite(
    thread: Thread,
    identity: string,
    reason: string
  ): Promise<void> {
    const [type, name] = identity.split(":", 2);
    if (!type || !name) return;

    const role = type === "ai" ? "agent" : "member";
    ThreadStore.addParticipant(thread.id, name, role);

    try {
      await proofClient.addComment(thread.slug, {
        by: `ai:${this.name}`,
        quote: "",
        text: `**@${name}** was invited by @${this.name}: _${reason}_`,
      });
    } catch {
      // Non-fatal
    }

    if (type === "ai" && AgentRegistry.has(name)) {
      getEventPoller().startThread(thread);
    }
  }

  // Default no-op implementations — subclasses override as needed
  onMention?(event: AgentMentionEvent): void | Promise<void>;
  onScan?(event: AgentScanEvent): void | Promise<void>;
  onThreadCreated?(event: AgentThreadCreatedEvent): void | Promise<void>;
}
