const PROOF_SDK_URL =
  process.env.PROOF_SDK_URL ?? "http://localhost:4000";

interface CreateDocumentOptions {
  markdown?: string;
  title?: string;
}

interface CreateDocumentResult {
  slug: string;
  accessToken: string;
  ownerSecret: string;
  url: string;
  shareUrl: string;
  docId: string;
}

interface DocumentState {
  slug: string;
  markdown: string;
  title: string;
  revision: number;
  updatedAt: string;
  connectedClients: number;
  shareState: string;
  marks: Record<string, unknown>;
}

interface PresenceOptions {
  agentId: string;
  name?: string;
  status?: string;
  details?: string;
}

interface PendingEvent {
  id: number;
  type: string;
  data: Record<string, unknown>;
  actor: string;
  createdAt: string;
}

interface PendingEventsResult {
  events: PendingEvent[];
  cursor: number;
}

interface AddCommentOptions {
  by: string;
  quote: string;
  text: string;
}

export class ProofClient {
  private baseUrl: string;

  constructor(baseUrl: string = PROOF_SDK_URL) {
    this.baseUrl = baseUrl;
  }

  async createDocument(
    options: CreateDocumentOptions = {}
  ): Promise<CreateDocumentResult> {
    const res = await fetch(`${this.baseUrl}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      throw new Error(`createDocument failed: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<CreateDocumentResult>;
  }

  async getState(slug: string, token?: string): Promise<DocumentState> {
    const url = new URL(`${this.baseUrl}/documents/${slug}/state`);
    if (token) url.searchParams.set("token", token);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`getState failed: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<DocumentState>;
  }

  async setPresence(slug: string, options: PresenceOptions): Promise<void> {
    const res = await fetch(`${this.baseUrl}/documents/${slug}/presence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Id": options.agentId,
      },
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      throw new Error(`setPresence failed: ${res.status} ${res.statusText}`);
    }
  }

  async getPendingEvents(
    slug: string,
    after: number = 0,
    limit: number = 100
  ): Promise<PendingEventsResult> {
    const url = new URL(`${this.baseUrl}/documents/${slug}/events/pending`);
    url.searchParams.set("after", String(after));
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(
        `getPendingEvents failed: ${res.status} ${res.statusText}`
      );
    }

    return res.json() as Promise<PendingEventsResult>;
  }

  async addComment(slug: string, options: AddCommentOptions): Promise<void> {
    const res = await fetch(`${this.baseUrl}/documents/${slug}/ops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "comment.add",
        ...options,
      }),
    });

    if (!res.ok) {
      throw new Error(`addComment failed: ${res.status} ${res.statusText}`);
    }
  }

  async isReachable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
