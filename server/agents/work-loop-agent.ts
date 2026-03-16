import Anthropic from "@anthropic-ai/sdk";
import {
  ProofClient,
  type DocumentState,
  type DocumentSnapshot,
} from "../proof-client.ts";
import type { Thread } from "../thread-store.ts";
import { BaseAgent } from "./base-agent.ts";
import type {
  AgentMentionEvent,
  AgentScanEvent,
  AgentThreadCreatedEvent,
} from "./types.ts";

const proofClient = new ProofClient();
const anthropic = new Anthropic();

export type ActionType =
  | "suggest_replace"
  | "suggest_insert"
  | "comment"
  | "done";

export interface AgentAction {
  type: ActionType;
  /** For suggest_replace: text in the doc to replace */
  quote?: string;
  /** The new/inserted content */
  content: string;
  /** Explanation of why this action is being taken */
  reasoning?: string;
}

export interface WorkLoopContext {
  thread: Thread;
  state: DocumentState;
  snapshot: DocumentSnapshot;
  iteration: number;
  previousActions: AgentAction[];
}

export interface WorkLoopConfig {
  maxIterations: number;
  cooldownMs: number;
  model: string;
}

const DEFAULT_CONFIG: WorkLoopConfig = {
  maxIterations: 3,
  cooldownMs: 2_000,
  model: "claude-sonnet-4-20250514",
};

export abstract class WorkLoopAgent extends BaseAgent {
  protected config: WorkLoopConfig;
  private running = new Set<string>();

  constructor(config: Partial<WorkLoopConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Core thinking method — given the document context, decide what actions to take.
   * Subclasses must implement this.
   */
  protected abstract think(context: WorkLoopContext): Promise<AgentAction[]>;

  /**
   * Build the system prompt for this agent's domain.
   * Subclasses must implement this.
   */
  protected abstract buildSystemPrompt(): string;

  /**
   * Determine if this agent should activate for a given thread.
   * Subclasses can override for filtering.
   */
  protected shouldActivate(_thread: Thread): boolean {
    return true;
  }

  /**
   * Run the full work loop: read → think → act → iterate.
   */
  async runLoop(thread: Thread): Promise<void> {
    if (this.running.has(thread.id)) return; // prevent concurrent loops
    this.running.add(thread.id);

    try {
      await this.updatePresence(thread, "working", "Running work loop");

      const previousActions: AgentAction[] = [];

      for (let i = 0; i < this.config.maxIterations; i++) {
        // 1. READ
        let state: DocumentState;
        let snapshot: DocumentSnapshot;
        try {
          state = await proofClient.getState(thread.slug, thread.accessToken);
          snapshot = await proofClient.getSnapshot(
            thread.slug,
            thread.accessToken
          );
        } catch (err) {
          console.error(`${this.name}: failed to read doc state:`, err);
          break;
        }

        // 2. THINK
        const context: WorkLoopContext = {
          thread,
          state,
          snapshot,
          iteration: i,
          previousActions,
        };

        let actions: AgentAction[];
        try {
          actions = await this.think(context);
        } catch (err) {
          console.error(`${this.name}: think failed:`, err);
          break;
        }

        if (actions.length === 0 || actions.every((a) => a.type === "done")) {
          break;
        }

        // 3. ACT
        for (const action of actions) {
          try {
            await this.executeAction(thread, action);
            previousActions.push(action);
          } catch (err) {
            console.error(
              `${this.name}: action ${action.type} failed:`,
              err
            );
          }
        }

        // 4. COOLDOWN
        if (i < this.config.maxIterations - 1) {
          await new Promise((r) => setTimeout(r, this.config.cooldownMs));
        }
      }

      await this.updatePresence(thread, "idle", "Work loop complete");
    } finally {
      this.running.delete(thread.id);
    }
  }

  private async executeAction(
    thread: Thread,
    action: AgentAction
  ): Promise<void> {
    switch (action.type) {
      case "suggest_replace":
        if (!action.quote) {
          console.warn(`${this.name}: suggest_replace without quote, using comment instead`);
          await this.addComment(thread, action.content);
          return;
        }
        await proofClient.suggestReplace(thread.slug, {
          by: `ai:${this.name}`,
          quote: action.quote,
          content: action.content,
        });
        break;

      case "suggest_insert":
        await proofClient.suggestInsert(thread.slug, {
          by: `ai:${this.name}`,
          content: action.content,
        });
        break;

      case "comment":
        await this.addComment(thread, action.content);
        break;

      case "done":
        break;
    }
  }

  /**
   * Helper: call Claude with structured output to generate actions.
   */
  protected async callLLM(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const response = await anthropic.messages.create({
      model: this.config.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    return response.content[0]?.type === "text" ? response.content[0].text : "";
  }

  /**
   * Parse a JSON array of actions from LLM output.
   */
  protected parseActions(text: string): AgentAction[] {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]) as AgentAction[];
      return parsed.filter(
        (a) =>
          a.type &&
          ["suggest_replace", "suggest_insert", "comment", "done"].includes(
            a.type
          )
      );
    } catch {
      return [];
    }
  }

  /** Check if a loop is already running for a thread. */
  isRunning(threadId: string): boolean {
    return this.running.has(threadId);
  }

  /** Get all thread IDs currently in a work loop. */
  get activeLoops(): string[] {
    return [...this.running];
  }
}
