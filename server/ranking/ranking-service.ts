import Anthropic from "@anthropic-ai/sdk";
import type { Thread } from "../thread-store.ts";
import { PROFILES, type ProfileName } from "./profiles.ts";
import db from "../db/index.ts";

export interface RankedEntry {
  threadId: string;
  score: number;
  reason: string;
}

interface CacheEntry {
  rankedEntries: RankedEntry[];
  cachedAt: number;
  threadFingerprint: string;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const cache = new Map<string, CacheEntry>();

const anthropic = new Anthropic();

function buildFingerprint(threads: Thread[]): string {
  return threads
    .map((t) => `${t.id}:${t.updatedAt}`)
    .sort()
    .join("|");
}

function buildPrompt(threads: Thread[], profile: ProfileName): string {
  const ctx = PROFILES[profile]!;
  const threadList = threads
    .map(
      (t) =>
        `- ID: ${t.id} | Title: "${t.title}" | Status: ${t.status} | Tags: [${t.tags.join(", ")}] | Created: ${t.createdAt}`
    )
    .join("\n");

  return `You are a priority ranking assistant for a ${ctx.name} professional.
Their focus areas are: ${ctx.focus}.

Rank the following threads by priority for this profile. For each thread, assign a score from 0-100 (100 = most urgent) and a brief reason.

Threads:
${threadList}

Respond with ONLY a JSON array, no other text. Each element must have:
- "threadId": the thread ID
- "score": number 0-100
- "reason": brief explanation (max 20 words)

Example: [{"threadId":"abc","score":85,"reason":"Production incident needs immediate attention"}]`;
}

function parseResponse(text: string): RankedEntry[] {
  // Extract JSON array from response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array found in LLM response");

  const parsed = JSON.parse(match[0]) as Array<{
    threadId: string;
    score: number;
    reason: string;
  }>;

  return parsed
    .map((entry) => ({
      threadId: entry.threadId,
      score: Math.max(0, Math.min(100, entry.score)),
      reason: entry.reason,
    }))
    .sort((a, b) => b.score - a.score);
}

export async function rankThreads(
  threads: Thread[],
  profile: ProfileName
): Promise<RankedEntry[]> {
  if (threads.length === 0) return [];

  const fingerprint = buildFingerprint(threads);
  const cacheKey = profile;
  const cached = cache.get(cacheKey);

  if (
    cached &&
    cached.threadFingerprint === fingerprint &&
    Date.now() - cached.cachedAt < CACHE_TTL_MS
  ) {
    return cached.rankedEntries;
  }

  const prompt = buildPrompt(threads, profile);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  const rankedEntries = parseResponse(text);

  // Update cache
  cache.set(cacheKey, {
    rankedEntries,
    cachedAt: Date.now(),
    threadFingerprint: fingerprint,
  });

  // Persist priority cache per thread
  const updateStmt = db.prepare(
    "UPDATE threads SET priority_cache = ?, priority_cached_at = datetime('now') WHERE id = ?"
  );
  for (const entry of rankedEntries) {
    updateStmt.run(
      JSON.stringify({ score: entry.score, reason: entry.reason }),
      entry.threadId
    );
  }

  return rankedEntries;
}

export function invalidateCache(profile?: string): void {
  if (profile) {
    cache.delete(profile);
  } else {
    cache.clear();
  }
}
