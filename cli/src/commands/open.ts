import { Command } from "commander";
import open from "open";
import { api } from "../api-client.ts";

export const openCmd = new Command("open")
  .description("Open Proof doc in browser")
  .argument("<id>", "Thread ID")
  .action(async (id) => {
    const thread = await api.getThread(id);
    const url = `http://localhost:4000/d/${thread.slug}?token=${thread.accessToken}`;
    console.log(`Opening: ${url}`);
    await open(url);
  });
