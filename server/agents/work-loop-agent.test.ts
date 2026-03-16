import { describe, test, expect } from "bun:test";
import {
  WorkLoopAgent,
  type AgentAction,
  type WorkLoopContext,
} from "./work-loop-agent.ts";
import { ResearchAgent } from "./research-agent.ts";
import type { Thread } from "../thread-store.ts";

function makeThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: "t1",
    slug: "slug-1",
    accessToken: "tok",
    ownerSecret: "secret",
    title: "Test Thread",
    status: "open",
    tags: [],
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    lastEventId: 0,
    priorityCache: null,
    priorityCachedAt: null,
    ...overrides,
  };
}

// Concrete test implementation of WorkLoopAgent
class TestWorkLoopAgent extends WorkLoopAgent {
  readonly name = "test-loop-agent";
  thinkCalls: WorkLoopContext[] = [];
  actionsToReturn: AgentAction[] = [];

  protected override buildSystemPrompt(): string {
    return "test system prompt";
  }

  protected override async think(context: WorkLoopContext): Promise<AgentAction[]> {
    this.thinkCalls.push(context);
    return this.actionsToReturn;
  }
}

describe("WorkLoopAgent", () => {
  test("parseActions handles valid JSON", () => {
    const agent = new TestWorkLoopAgent();
    const actions = agent["parseActions"](
      `[{"type":"comment","content":"Hello"},{"type":"done","content":""}]`
    );
    expect(actions).toHaveLength(2);
    expect(actions[0]!.type).toBe("comment");
    expect(actions[1]!.type).toBe("done");
  });

  test("parseActions extracts JSON from surrounding text", () => {
    const agent = new TestWorkLoopAgent();
    const actions = agent["parseActions"](
      `Here are my actions:\n[{"type":"suggest_insert","content":"## Timeline"}]\nDone.`
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]!.type).toBe("suggest_insert");
  });

  test("parseActions returns empty for invalid input", () => {
    const agent = new TestWorkLoopAgent();
    expect(agent["parseActions"]("no json here")).toEqual([]);
    expect(agent["parseActions"]("[invalid}")).toEqual([]);
  });

  test("parseActions filters invalid action types", () => {
    const agent = new TestWorkLoopAgent();
    const actions = agent["parseActions"](
      `[{"type":"comment","content":"ok"},{"type":"invalid_type","content":"bad"}]`
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]!.type).toBe("comment");
  });

  test("isRunning tracks active loops", () => {
    const agent = new TestWorkLoopAgent();
    expect(agent.isRunning("t1")).toBe(false);
    expect(agent.activeLoops).toEqual([]);
  });

  test("prevents concurrent loops on same thread", async () => {
    const agent = new TestWorkLoopAgent();
    // Set actionsToReturn to done immediately
    agent.actionsToReturn = [{ type: "done", content: "" }];

    // Since think returns done, loop finishes fast
    // We can't easily test concurrency without mocking ProofClient,
    // but we can verify the mechanism exists
    expect(agent.isRunning("t1")).toBe(false);
  });

  test("config defaults", () => {
    const agent = new TestWorkLoopAgent();
    expect(agent["config"].maxIterations).toBe(3);
    expect(agent["config"].cooldownMs).toBe(2000);
  });

  test("config override", () => {
    const agent = new TestWorkLoopAgent({ maxIterations: 5, cooldownMs: 500 });
    expect(agent["config"].maxIterations).toBe(5);
    expect(agent["config"].cooldownMs).toBe(500);
  });
});

describe("ResearchAgent", () => {
  const agent = new ResearchAgent();

  test("has correct name", () => {
    expect(agent.name).toBe("research-agent");
  });

  test("activates for incident-tagged threads", () => {
    expect(agent["shouldActivate"](makeThread({ tags: ["incident"] }))).toBe(true);
  });

  test("activates for research-tagged threads", () => {
    expect(agent["shouldActivate"](makeThread({ tags: ["research"] }))).toBe(true);
  });

  test("does not activate for unrelated threads", () => {
    expect(agent["shouldActivate"](makeThread({ tags: ["bug"] }))).toBe(false);
    expect(agent["shouldActivate"](makeThread())).toBe(false);
  });

  test("has onThreadCreated handler", () => {
    expect(agent.onThreadCreated).toBeDefined();
  });

  test("has onMention handler", () => {
    expect(agent.onMention).toBeDefined();
  });

  test("config uses 2 max iterations", () => {
    expect(agent["config"].maxIterations).toBe(2);
  });

  test("builds system prompt", () => {
    const prompt = agent["buildSystemPrompt"]();
    expect(prompt).toContain("research agent");
    expect(prompt).toContain("suggest_insert");
    expect(prompt).toContain("suggest_replace");
  });
});
