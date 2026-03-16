import { App, ExpressReceiver } from "@slack/bolt";
import type { Express } from "express";
import { ProofClient } from "../proof-client.ts";
import { ThreadStore } from "../thread-store.ts";
import { threadCard } from "./formatters.ts";
import { registerCommands } from "./commands.ts";

const proofClient = new ProofClient();

let slackApp: App | null = null;

export function isSlackEnabled(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET);
}

export function initSlack(expressApp: Express): App | null {
  if (!isSlackEnabled()) {
    console.log("Slack: disabled (SLACK_BOT_TOKEN not set)");
    return null;
  }

  const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    app: expressApp,
    endpoints: "/slack/events",
  });

  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver,
  });

  registerCommands(slackApp);

  // Listen for replies to bot messages → post as Proof comments
  slackApp.event("message", async ({ event, client }) => {
    // Only handle threaded replies (messages with thread_ts different from ts)
    if (!("thread_ts" in event) || !event.thread_ts || event.thread_ts === event.ts) return;
    if (!("text" in event) || !event.text) return;

    // Find the parent message to get the thread ID
    try {
      const result = await client.conversations.history({
        channel: event.channel,
        latest: event.thread_ts,
        inclusive: true,
        limit: 1,
      });

      const parentMsg = result.messages?.[0];
      if (!parentMsg?.blocks) return;

      // Look for a thread slug in the parent message's action URL
      const actionBlock = parentMsg.blocks.find(
        (b) => b.type === "actions"
      ) as { elements?: Array<{ url?: string }> } | undefined;
      const url = actionBlock?.elements?.[0]?.url;
      if (!url) return;

      const slugMatch = url.match(/\/d\/([^?]+)/);
      if (!slugMatch) return;

      const slug = slugMatch[1];
      const thread = ThreadStore.findBySlug(slug!);
      if (!thread) return;

      // Post the Slack reply as a comment in the Proof doc
      const username = ("user" in event && event.user) ? event.user : "slack-user";
      await proofClient.addComment(thread.slug, {
        by: `slack:${username}`,
        quote: "",
        text: event.text,
      });
    } catch (err) {
      console.error("Slack reply → Proof comment error:", err);
    }
  });

  // Acknowledge button clicks
  slackApp.action("open_proof", async ({ ack }) => {
    await ack();
  });

  console.log("Slack: enabled");
  return slackApp;
}

/** Notify Slack channel about a new high-priority thread. */
export async function notifyThreadCreated(
  thread: NonNullable<ReturnType<typeof ThreadStore.findById>>
): Promise<void> {
  if (!slackApp || !thread) return;

  const shouldNotify =
    thread.tags.includes("incident") || thread.status === "escalated";
  if (!shouldNotify) return;

  const channel = process.env.SLACK_CHANNEL ?? "#incidents";

  try {
    await slackApp.client.chat.postMessage({
      channel,
      text: `New thread: ${thread.title}`,
      blocks: threadCard(thread),
    });
  } catch (err) {
    console.error("Slack notification error:", err);
  }
}
