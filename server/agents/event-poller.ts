import { ProofClient } from "../proof-client.ts";
import { ThreadStore, type Thread } from "../thread-store.ts";

export interface ProofEvent {
  id: number;
  type: string;
  data: Record<string, unknown>;
  actor: string;
  createdAt: string;
}

export type AgentHandler = (thread: Thread, event: ProofEvent) => void | Promise<void>;

const POLL_INTERVAL_MS = 5_000;

export class EventPoller {
  private proofClient: ProofClient;
  private handlers: AgentHandler[] = [];
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private polling = new Map<string, boolean>();

  constructor(proofClient?: ProofClient) {
    this.proofClient = proofClient ?? new ProofClient();
  }

  /** Register an agent handler that will receive all events. */
  onEvent(handler: AgentHandler): void {
    this.handlers.push(handler);
  }

  /** Start polling for a single thread. */
  startThread(thread: Thread): void {
    if (this.timers.has(thread.id)) return; // already polling

    const poll = async () => {
      if (this.polling.get(thread.id)) return; // debounce
      this.polling.set(thread.id, true);

      try {
        // Re-read thread to get latest lastEventId
        const current = ThreadStore.findById(thread.id);
        if (!current || current.status === "resolved") {
          this.stopThread(thread.id);
          return;
        }

        const result = await this.proofClient.getPendingEvents(
          current.slug,
          current.lastEventId
        );

        if (result.events.length === 0) return;

        for (const event of result.events) {
          for (const handler of this.handlers) {
            try {
              await handler(current, event as ProofEvent);
            } catch (err) {
              console.error(
                `Handler error for event ${event.id} on thread ${current.id}:`,
                err
              );
            }
          }
        }

        // Persist the cursor
        const maxEventId = Math.max(...result.events.map((e) => e.id));
        ThreadStore.updateLastEventId(current.id, maxEventId);
      } catch (err) {
        console.error(`Poll error for thread ${thread.id}:`, err);
      } finally {
        this.polling.set(thread.id, false);
      }
    };

    // Run immediately, then on interval
    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    this.timers.set(thread.id, timer);
  }

  /** Stop polling for a thread. */
  stopThread(threadId: string): void {
    const timer = this.timers.get(threadId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(threadId);
      this.polling.delete(threadId);
    }
  }

  /** Start polling for all open threads. */
  startAll(): void {
    const threads = ThreadStore.findAllOpen();
    for (const thread of threads) {
      this.startThread(thread);
    }
    console.log(`EventPoller: started polling for ${threads.length} open threads`);
  }

  /** Stop all polling. */
  stopAll(): void {
    for (const threadId of this.timers.keys()) {
      this.stopThread(threadId);
    }
  }

  /** Get the set of thread IDs being polled. */
  get activeThreadIds(): string[] {
    return [...this.timers.keys()];
  }
}

// Singleton for use across modules
let _instance: EventPoller | null = null;

export function initEventPoller(proofClient?: ProofClient): EventPoller {
  _instance = new EventPoller(proofClient);
  return _instance;
}

export function getEventPoller(): EventPoller {
  if (!_instance) throw new Error("EventPoller not initialized");
  return _instance;
}
