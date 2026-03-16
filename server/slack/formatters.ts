import type { Thread } from "../thread-store.ts";

const STATUS_EMOJI: Record<string, string> = {
  open: ":large_blue_circle:",
  in_progress: ":large_yellow_circle:",
  resolved: ":white_check_mark:",
  escalated: ":red_circle:",
};

export function threadCard(thread: Thread & { priority?: { score: number; reason: string } }) {
  const emoji = STATUS_EMOJI[thread.status] ?? ":grey_question:";
  const tags = thread.tags.length > 0 ? thread.tags.map((t) => `\`${t}\``).join(" ") : "none";
  const proofUrl = `http://localhost:4000/d/${thread.slug}?token=${thread.accessToken}`;
  const score = thread.priority?.score ?? "–";
  const reason = thread.priority?.reason ?? "";

  return [
    {
      type: "header" as const,
      text: { type: "plain_text" as const, text: thread.title, emoji: true },
    },
    {
      type: "section" as const,
      fields: [
        { type: "mrkdwn" as const, text: `*Status:* ${emoji} ${thread.status}` },
        { type: "mrkdwn" as const, text: `*Priority:* ${score}` },
        { type: "mrkdwn" as const, text: `*Tags:* ${tags}` },
        { type: "mrkdwn" as const, text: `*Created by:* ${thread.createdBy}` },
      ],
    },
    ...(reason
      ? [
          {
            type: "context" as const,
            elements: [{ type: "mrkdwn" as const, text: `_${reason}_` }],
          },
        ]
      : []),
    {
      type: "actions" as const,
      elements: [
        {
          type: "button" as const,
          text: { type: "plain_text" as const, text: "Open in Proof" },
          url: proofUrl,
          action_id: "open_proof",
        },
      ],
    },
  ];
}

export function queueTable(
  threads: Array<Thread & { priority?: { score: number; reason: string } }>
): string {
  if (threads.length === 0) return "No threads in the queue.";

  const lines = threads.map((t, i) => {
    const score = t.priority?.score ?? "–";
    const status = t.status.replace("_", " ");
    return `${i + 1}. *${t.title}* — ${status} (score: ${score})`;
  });

  return lines.join("\n");
}
