import {
  WorkLoopAgent,
  type AgentAction,
  type WorkLoopContext,
} from "./work-loop-agent.ts";
import type {
  AgentMentionEvent,
  AgentThreadCreatedEvent,
} from "./types.ts";
import type { Thread } from "../thread-store.ts";

export class ResearchAgent extends WorkLoopAgent {
  readonly name = "research-agent";

  constructor() {
    super({
      maxIterations: 2,
      cooldownMs: 3_000,
    });
  }

  protected override shouldActivate(thread: Thread): boolean {
    return thread.tags.includes("incident") || thread.tags.includes("research");
  }

  protected override buildSystemPrompt(): string {
    return `You are a research agent that helps teams handle incidents and investigations.
Your job is to read the current document state and propose structured improvements as suggestions.

You output a JSON array of actions. Each action has:
- "type": one of "suggest_insert", "suggest_replace", "comment", "done"
- "quote": (for suggest_replace only) the exact text in the document to replace
- "content": the new content to insert or the comment text
- "reasoning": brief explanation of why

Guidelines:
- For new documents with minimal content, use "suggest_insert" to add structured sections
- For documents that already have content, use "suggest_replace" to improve specific sections
- Use "comment" to explain what you're doing or ask questions
- Use "done" when the document is already well-structured
- Be concise and actionable
- Never fabricate specific details — use placeholders like "[TBD]" for unknown specifics`;
  }

  protected override async think(context: WorkLoopContext): Promise<AgentAction[]> {
    const { thread, state, snapshot, iteration, previousActions } = context;

    const docContent = state.markdown || "(empty document)";
    const blocks = snapshot.blocks
      .map((b) => `[${b.ref}] ${b.markdown}`)
      .join("\n");

    const previousSummary =
      previousActions.length > 0
        ? `\n\nPrevious actions taken:\n${previousActions.map((a) => `- ${a.type}: ${a.reasoning ?? a.content.slice(0, 80)}`).join("\n")}`
        : "";

    const userPrompt = `Thread: "${thread.title}"
Tags: ${thread.tags.join(", ") || "none"}
Status: ${thread.status}
Created by: ${thread.createdBy}
Iteration: ${iteration + 1}

Current document content:
---
${docContent}
---

Document blocks:
${blocks || "(no blocks)"}
${previousSummary}

Based on the current state, what actions should be taken to improve this document?
For incident threads, ensure there is: a timeline, impact assessment, root cause hypothesis, and action items.
For research threads, ensure there is: context, key findings, open questions, and next steps.

Respond with ONLY a JSON array of actions.`;

    const response = await this.callLLM(this.buildSystemPrompt(), userPrompt);
    return this.parseActions(response);
  }

  override async onThreadCreated(event: AgentThreadCreatedEvent): Promise<void> {
    const { thread } = event;
    if (!this.shouldActivate(thread)) return;

    await this.addComment(
      thread,
      `**Research agent activated** — I'll analyze this thread and propose structured content as suggestions. Accept or reject them inline in the editor.`
    );

    // Run work loop asynchronously
    this.runLoop(thread).catch((err) => {
      console.error(`${this.name}: work loop failed for ${thread.id}:`, err);
    });
  }

  override async onMention(event: AgentMentionEvent): Promise<void> {
    const { thread } = event;

    if (this.isRunning(thread.id)) {
      await this.addComment(
        thread,
        `I'm already working on this thread. Please wait for my current analysis to complete.`
      );
      return;
    }

    await this.addComment(
      thread,
      `**Research agent re-activated** — Running another analysis pass on this document.`
    );

    this.runLoop(thread).catch((err) => {
      console.error(`${this.name}: work loop failed for ${thread.id}:`, err);
    });
  }
}
