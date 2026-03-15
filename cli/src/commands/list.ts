import { Command } from "commander";
import { api } from "../api-client.ts";

export const listCmd = new Command("list")
  .description("Show ranked queue as table")
  .option("-p, --profile <profile>", "Rank by profile (sre, quant, developer, pm, user)")
  .action(async (opts) => {
    const threads = await api.listThreads(opts.profile);

    if (threads.length === 0) {
      console.log("No threads found.");
      return;
    }

    // Print table
    const header = ["ID", "Title", "Status", "Tags", "Score", "Reason"].map(
      (h) => h.padEnd(h === "Title" ? 30 : h === "Reason" ? 30 : h === "ID" ? 36 : 12)
    );
    console.log(header.join(" "));
    console.log("-".repeat(header.join(" ").length));

    for (const t of threads) {
      const score = t.priority?.score ?? "-";
      const reason = t.priority?.reason ?? "";
      const row = [
        (t.id as string).padEnd(36),
        (t.title as string).slice(0, 28).padEnd(30),
        (t.status as string).padEnd(12),
        ((t.tags as string[]).join(",") || "-").slice(0, 10).padEnd(12),
        String(score).padEnd(12),
        (reason as string).slice(0, 28).padEnd(30),
      ];
      console.log(row.join(" "));
    }
  });
