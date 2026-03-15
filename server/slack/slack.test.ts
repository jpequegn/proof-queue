import { describe, test, expect } from "bun:test";
import { threadCard, queueTable } from "./formatters.ts";
import { isSlackEnabled } from "./slack-app.ts";
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

describe("formatters", () => {
  describe("threadCard", () => {
    test("returns Block Kit blocks", () => {
      const blocks = threadCard(makeThread());
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0]!.type).toBe("header");
    });

    test("includes priority reason in context block", () => {
      const blocks = threadCard({
        ...makeThread(),
        priority: { score: 85, reason: "Critical incident" },
      });
      const context = blocks.find((b) => b.type === "context");
      expect(context).toBeDefined();
    });

    test("includes actions with Proof URL", () => {
      const blocks = threadCard(makeThread({ slug: "my-slug", accessToken: "my-tok" }));
      const actions = blocks.find((b) => b.type === "actions") as { elements: Array<{ url: string }> };
      expect(actions).toBeDefined();
      expect(actions.elements[0]!.url).toContain("my-slug");
      expect(actions.elements[0]!.url).toContain("my-tok");
    });
  });

  describe("queueTable", () => {
    test("returns empty message for no threads", () => {
      expect(queueTable([])).toBe("No threads in the queue.");
    });

    test("formats thread list", () => {
      const result = queueTable([
        { ...makeThread({ title: "Thread A" }), priority: { score: 90, reason: "Urgent" } },
        { ...makeThread({ title: "Thread B" }), priority: { score: 40, reason: "Low" } },
      ]);
      expect(result).toContain("Thread A");
      expect(result).toContain("Thread B");
      expect(result).toContain("90");
    });
  });
});

describe("isSlackEnabled", () => {
  test("returns false when env vars not set", () => {
    // In test env, SLACK_BOT_TOKEN should not be set
    expect(isSlackEnabled()).toBe(false);
  });
});
