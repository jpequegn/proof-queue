import { describe, test, expect, beforeAll, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { migrate } from "../db/migrate.ts";

// We test the EventPoller class directly with a mock ProofClient
import { EventPoller, type ProofEvent } from "./event-poller.ts";
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
    createdBy: "agent-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    lastEventId: 0,
    priorityCache: null,
    priorityCachedAt: null,
    ...overrides,
  };
}

describe("EventPoller", () => {
  test("registers handlers", () => {
    const poller = new EventPoller();
    let called = false;
    poller.onEvent(() => {
      called = true;
    });
    // Handler registered but not called yet
    expect(called).toBe(false);
  });

  test("start/stop thread tracking", () => {
    const poller = new EventPoller();
    const thread = makeThread();

    poller.startThread(thread);
    expect(poller.activeThreadIds).toContain("t1");

    poller.stopThread("t1");
    expect(poller.activeThreadIds).not.toContain("t1");
  });

  test("doesn't duplicate polling for same thread", () => {
    const poller = new EventPoller();
    const thread = makeThread();

    poller.startThread(thread);
    poller.startThread(thread); // duplicate
    expect(poller.activeThreadIds).toHaveLength(1);

    poller.stopAll();
  });

  test("stopAll clears all timers", () => {
    const poller = new EventPoller();
    poller.startThread(makeThread({ id: "a" }));
    poller.startThread(makeThread({ id: "b" }));
    expect(poller.activeThreadIds).toHaveLength(2);

    poller.stopAll();
    expect(poller.activeThreadIds).toHaveLength(0);
  });
});
