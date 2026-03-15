import { Command } from "commander";
import { api } from "../api-client.ts";

export const statusCmd = new Command("status")
  .description("Update thread status")
  .argument("<id>", "Thread ID")
  .argument("<status>", "New status (open, in_progress, resolved, escalated)")
  .action(async (id, status) => {
    const thread = await api.updateStatus(id, status);
    console.log(`Thread ${thread.id} status updated to: ${thread.status}`);
  });
