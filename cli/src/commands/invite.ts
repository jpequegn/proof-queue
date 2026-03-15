import { Command } from "commander";
import { api } from "../api-client.ts";

export const inviteCmd = new Command("invite")
  .description("Invite human or agent to a thread")
  .argument("<id>", "Thread ID")
  .argument("<identity>", "Identity (e.g. human:alice, ai:sre-agent)")
  .option("-r, --reason <reason>", "Reason for invite", "Invited via CLI")
  .action(async (id, identity, opts) => {
    const result = await api.invite(id, identity, opts.reason);
    console.log(`Invited ${result.identity} to thread ${result.threadId} as ${result.role}`);
  });
