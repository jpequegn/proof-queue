import { Command } from "commander";
import { api } from "../api-client.ts";

export const showCmd = new Command("show")
  .description("Show thread detail")
  .argument("<id>", "Thread ID")
  .action(async (id) => {
    const thread = await api.getThread(id);
    console.log(`Title:       ${thread.title}`);
    console.log(`ID:          ${thread.id}`);
    console.log(`Slug:        ${thread.slug}`);
    console.log(`Status:      ${thread.status}`);
    console.log(`Tags:        ${(thread.tags as string[]).join(", ") || "none"}`);
    console.log(`Created by:  ${thread.createdBy}`);
    console.log(`Created at:  ${thread.createdAt}`);
    console.log(`Updated at:  ${thread.updatedAt}`);

    if (thread.participants?.length) {
      console.log(`\nParticipants:`);
      for (const p of thread.participants) {
        console.log(`  ${p.agentId} (${p.role})`);
      }
    }
  });
