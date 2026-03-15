import type { Thread } from "../thread-store.ts";
import type { ProofEvent } from "./event-poller.ts";
import { AgentRegistry } from "./registry.ts";
import type { AgentMentionEvent } from "./types.ts";

const MENTION_REGEX = /@([\w-]+)/g;

/** Extract all @mentions from a string. */
export function parseMentions(text: string): string[] {
  const matches = [...text.matchAll(MENTION_REGEX)];
  return [...new Set(matches.map((m) => m[1]!))];
}

/**
 * Process a comment.add event: parse mentions and dispatch to agents.
 * Designed to be registered as an EventPoller handler.
 */
export async function handleMentions(
  thread: Thread,
  event: ProofEvent
): Promise<void> {
  if (event.type !== "comment.added" && event.type !== "comment.add") return;

  const text = (event.data?.text as string) ?? "";
  if (!text) return;

  const mentions = parseMentions(text);
  if (mentions.length === 0) return;

  const mentionEvent: AgentMentionEvent = {
    thread,
    comment: {
      text,
      quote: event.data?.quote as string | undefined,
      actor: event.actor,
      createdAt: event.createdAt,
    },
    mentionedAgent: "", // set per agent below
  };

  for (const name of mentions) {
    const agent = AgentRegistry.get(name);
    if (!agent?.onMention) continue;

    try {
      await agent.onMention({ ...mentionEvent, mentionedAgent: name });
    } catch (err) {
      console.error(`Mention handler error for @${name}:`, err);
    }
  }
}
