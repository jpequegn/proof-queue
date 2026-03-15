import { describe, test, expect, beforeEach } from "bun:test";
import { parseMentions, handleMentions } from "./mention-parser.ts";
import { AgentRegistry } from "./registry.ts";
import type { AgentMentionEvent } from "./types.ts";
import type { ProofEvent } from "./event-poller.ts";
import type { Thread } from "../thread-store.ts";

function makeThread(): Thread {
  return {
    id: "t1",
    slug: "slug-1",
    accessToken: "tok",
    ownerSecret: "secret",
    title: "Test",
    status: "open",
    tags: [],
    createdBy: "agent-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    lastEventId: 0,
    priorityCache: null,
    priorityCachedAt: null,
  };
}

function makeEvent(text: string, type = "comment.added"): ProofEvent {
  return {
    id: 1,
    type,
    data: { text },
    actor: "user:someone",
    createdAt: "2026-01-01T00:00:00Z",
  };
}

describe("parseMentions", () => {
  test("extracts single mention", () => {
    expect(parseMentions("Hey @sre-agent check this")).toEqual(["sre-agent"]);
  });

  test("extracts multiple mentions", () => {
    expect(parseMentions("@alice and @bob please look")).toEqual([
      "alice",
      "bob",
    ]);
  });

  test("deduplicates mentions", () => {
    expect(parseMentions("@sre-agent @sre-agent hello")).toEqual(["sre-agent"]);
  });

  test("returns empty for no mentions", () => {
    expect(parseMentions("no mentions here")).toEqual([]);
  });

  test("handles mentions with hyphens and underscores", () => {
    expect(parseMentions("@my_agent-v2 help")).toEqual(["my_agent-v2"]);
  });
});

describe("handleMentions", () => {
  beforeEach(() => {
    // Clear registry by re-registering nothing
    // Registry doesn't have a clear method, so we just test with fresh agents
  });

  test("dispatches to registered agent", async () => {
    const calls: AgentMentionEvent[] = [];
    AgentRegistry.register({
      name: "test-agent",
      onMention(event) {
        calls.push(event);
      },
    });

    await handleMentions(makeThread(), makeEvent("Hey @test-agent check this"));

    expect(calls).toHaveLength(1);
    expect(calls[0]!.mentionedAgent).toBe("test-agent");
    expect(calls[0]!.comment.text).toBe("Hey @test-agent check this");
    expect(calls[0]!.thread.id).toBe("t1");
  });

  test("ignores non-comment events", async () => {
    const calls: AgentMentionEvent[] = [];
    AgentRegistry.register({
      name: "test-agent-2",
      onMention(event) {
        calls.push(event);
      },
    });

    await handleMentions(makeThread(), makeEvent("@test-agent-2 hello", "doc.updated"));

    expect(calls).toHaveLength(0);
  });

  test("silently ignores unrecognised mentions", async () => {
    // Should not throw
    await handleMentions(
      makeThread(),
      makeEvent("@nonexistent-agent help me")
    );
  });

  test("handles handler errors without crashing", async () => {
    AgentRegistry.register({
      name: "error-agent",
      onMention() {
        throw new Error("handler broke");
      },
    });

    // Should not throw
    await handleMentions(makeThread(), makeEvent("@error-agent do something"));
  });
});
