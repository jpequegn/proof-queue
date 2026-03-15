import { describe, test, expect } from "bun:test";
import { AgentRegistry } from "./registry.ts";
import { TriageAgent } from "./triage-agent.ts";
import { SreAgent } from "./sre-agent.ts";
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

describe("AgentRegistry with real agents", () => {
  test("registers and retrieves triage-agent", () => {
    const triage = new TriageAgent();
    AgentRegistry.register(triage);
    expect(AgentRegistry.get("triage-agent")).toBe(triage);
    expect(AgentRegistry.has("triage-agent")).toBe(true);
  });

  test("registers and retrieves sre-agent", () => {
    const sre = new SreAgent();
    AgentRegistry.register(sre);
    expect(AgentRegistry.get("sre-agent")).toBe(sre);
    expect(AgentRegistry.has("sre-agent")).toBe(true);
  });

  test("all() returns registered agents", () => {
    const agents = AgentRegistry.all();
    const names = agents.map((a) => a.name);
    expect(names).toContain("triage-agent");
    expect(names).toContain("sre-agent");
  });
});

describe("TriageAgent", () => {
  const triage = new TriageAgent();

  test("has correct name", () => {
    expect(triage.name).toBe("triage-agent");
  });

  test("has onThreadCreated handler", () => {
    expect(triage.onThreadCreated).toBeDefined();
  });

  test("has onScan handler", () => {
    expect(triage.onScan).toBeDefined();
  });
});

describe("SreAgent", () => {
  const sre = new SreAgent();

  test("has correct name", () => {
    expect(sre.name).toBe("sre-agent");
  });

  test("has onThreadCreated handler", () => {
    expect(sre.onThreadCreated).toBeDefined();
  });

  test("has onMention handler", () => {
    expect(sre.onMention).toBeDefined();
  });

  test("has onScan handler", () => {
    expect(sre.onScan).toBeDefined();
  });
});
