import { ProofClient } from "../proof-client.ts";
import type { Thread } from "../thread-store.ts";
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

  // Default no-op implementations — subclasses override as needed
  onMention?(event: AgentMentionEvent): void | Promise<void>;
  onScan?(event: AgentScanEvent): void | Promise<void>;
  onThreadCreated?(event: AgentThreadCreatedEvent): void | Promise<void>;
}
