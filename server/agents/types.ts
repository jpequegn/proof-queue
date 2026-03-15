import type { Thread } from "../thread-store.ts";

export interface AgentMentionEvent {
  thread: Thread;
  comment: {
    text: string;
    quote?: string;
    actor: string;
    createdAt: string;
  };
  mentionedAgent: string;
}

export interface AgentScanEvent {
  thread: Thread;
  reason: string;
}

export interface AgentHandler {
  name: string;
  onMention?(event: AgentMentionEvent): void | Promise<void>;
  onScan?(event: AgentScanEvent): void | Promise<void>;
}
