import type { App } from "@slack/bolt";
import { ThreadStore } from "../thread-store.ts";
import { ProofClient } from "../proof-client.ts";
import { rankThreads } from "../ranking/ranking-service.ts";
import { PROFILES, type ProfileName } from "../ranking/profiles.ts";
import { queueTable, threadCard } from "./formatters.ts";

const proofClient = new ProofClient();

export function registerCommands(app: App): void {
  app.command("/pq", async ({ command, ack, respond }) => {
    await ack();

    const args = command.text.trim().split(/\s+/);
    const subcommand = args[0] ?? "list";

    switch (subcommand) {
      case "list": {
        const profile = args[1];
        const threads = ThreadStore.findAll();

        if (profile && profile in PROFILES) {
          try {
            const ranked = await rankThreads(threads, profile as ProfileName);
            const rankMap = new Map(ranked.map((r) => [r.threadId, r]));
            const enriched = threads.map((t) => {
              const rank = rankMap.get(t.id);
              return {
                ...t,
                priority: rank
                  ? { score: rank.score, reason: rank.reason }
                  : undefined,
              };
            }).sort((a, b) => (b.priority?.score ?? 0) - (a.priority?.score ?? 0));
            await respond({ text: queueTable(enriched), response_type: "ephemeral" });
          } catch {
            await respond({ text: queueTable(threads), response_type: "ephemeral" });
          }
        } else {
          await respond({ text: queueTable(threads), response_type: "ephemeral" });
        }
        break;
      }

      case "open": {
        const id = args[1];
        if (!id) {
          await respond({ text: "Usage: `/pq open <id>`", response_type: "ephemeral" });
          return;
        }
        const thread = ThreadStore.findById(id);
        if (!thread) {
          await respond({ text: `Thread \`${id}\` not found.`, response_type: "ephemeral" });
          return;
        }
        const url = `http://localhost:4000/d/${thread.slug}?token=${thread.accessToken}`;
        await respond({ text: `<${url}|Open in Proof>`, response_type: "ephemeral" });
        break;
      }

      case "create": {
        const title = args.slice(1).join(" ");
        if (!title) {
          await respond({ text: "Usage: `/pq create <title>`", response_type: "ephemeral" });
          return;
        }

        try {
          const doc = await proofClient.createDocument({ title });
          const thread = ThreadStore.create({
            slug: doc.slug,
            accessToken: doc.accessToken,
            ownerSecret: doc.ownerSecret,
            title,
            createdBy: `slack:${command.user_name}`,
          });
          ThreadStore.addParticipant(thread.id, command.user_name, "owner");

          const channel = process.env.SLACK_CHANNEL ?? "#incidents";
          await respond({
            text: `Thread created: *${thread.title}*`,
            response_type: "in_channel",
            blocks: threadCard(thread),
          });
        } catch (err) {
          await respond({
            text: `Failed to create thread: ${err}`,
            response_type: "ephemeral",
          });
        }
        break;
      }

      default:
        await respond({
          text: "Commands: `/pq list [profile]`, `/pq open <id>`, `/pq create <title>`",
          response_type: "ephemeral",
        });
    }
  });
}
