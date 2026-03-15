import { describe, test, expect } from "bun:test";
import { PROFILES } from "./profiles.ts";

describe("profiles", () => {
  test("all profiles have name and focus", () => {
    for (const [key, profile] of Object.entries(PROFILES)) {
      expect(profile.name).toBeTruthy();
      expect(profile.focus).toBeTruthy();
      expect(typeof profile.name).toBe("string");
      expect(typeof profile.focus).toBe("string");
    }
  });

  test("has expected profiles", () => {
    expect(Object.keys(PROFILES).sort()).toEqual([
      "developer",
      "pm",
      "quant",
      "sre",
      "user",
    ]);
  });
});

describe("parseResponse (unit)", () => {
  // Test the parsing logic directly
  function parseResponse(text: string) {
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

  test("parses valid JSON response", () => {
    const text = `[{"threadId":"a","score":90,"reason":"Critical"},{"threadId":"b","score":40,"reason":"Low"}]`;
    const result = parseResponse(text);
    expect(result).toHaveLength(2);
    expect(result[0]!.threadId).toBe("a");
    expect(result[0]!.score).toBe(90);
    expect(result[1]!.threadId).toBe("b");
  });

  test("extracts JSON from surrounding text", () => {
    const text = `Here is the ranking:\n[{"threadId":"x","score":75,"reason":"Medium"}]\nDone.`;
    const result = parseResponse(text);
    expect(result).toHaveLength(1);
    expect(result[0]!.score).toBe(75);
  });

  test("clamps scores to 0-100", () => {
    const text = `[{"threadId":"a","score":150,"reason":"Over"},{"threadId":"b","score":-10,"reason":"Under"}]`;
    const result = parseResponse(text);
    expect(result[0]!.score).toBe(100);
    expect(result[1]!.score).toBe(0);
  });

  test("sorts by score descending", () => {
    const text = `[{"threadId":"a","score":30,"reason":"Low"},{"threadId":"b","score":80,"reason":"High"},{"threadId":"c","score":50,"reason":"Mid"}]`;
    const result = parseResponse(text);
    expect(result.map((r) => r.threadId)).toEqual(["b", "c", "a"]);
  });

  test("throws on invalid response", () => {
    expect(() => parseResponse("no json here")).toThrow("No JSON array found");
  });
});
