import { Command } from "commander";
import { api } from "../api-client.ts";

export const createCmd = new Command("create")
  .description("Create a new thread")
  .argument("<title>", "Thread title")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .option("-u, --user <user>", "Created by", "cli-user")
  .action(async (title, opts) => {
    const tags = opts.tags?.split(",").map((t: string) => t.trim()).filter(Boolean);
    const thread = await api.createThread(title, tags, opts.user);
    console.log(`Thread created: ${thread.id}`);
    console.log(`  Title: ${thread.title}`);
    console.log(`  Slug:  ${thread.slug}`);
    if (thread.proofUrl) {
      console.log(`  Proof: http://localhost:4000${thread.proofUrl}`);
    }
  });
