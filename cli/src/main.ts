#!/usr/bin/env bun
import { Command } from "commander";
import { listCmd } from "./commands/list.ts";
import { createCmd } from "./commands/create.ts";
import { showCmd } from "./commands/show.ts";
import { openCmd } from "./commands/open.ts";
import { statusCmd } from "./commands/status.ts";
import { inviteCmd } from "./commands/invite.ts";

const program = new Command()
  .name("pq")
  .description("proof-queue CLI — terminal access to the work queue")
  .version("0.1.0");

program.addCommand(listCmd);
program.addCommand(createCmd);
program.addCommand(showCmd);
program.addCommand(openCmd);
program.addCommand(statusCmd);
program.addCommand(inviteCmd);

program.parse();
