import { describe, test, expect } from "bun:test";
import { ScheduledScanner } from "./scheduled-scanner.ts";

describe("ScheduledScanner", () => {
  describe("parseScanResponse", () => {
    test("parses valid JSON array", () => {
      const text = `[{"threadId":"t1","reason":"Stale for 2 hours"}]`;
      const result = ScheduledScanner.parseScanResponse(text);
      expect(result).toHaveLength(1);
      expect(result[0]!.threadId).toBe("t1");
      expect(result[0]!.reason).toBe("Stale for 2 hours");
    });

    test("extracts JSON from surrounding text", () => {
      const text = `Here are the flagged threads:\n[{"threadId":"t2","reason":"Escalated"}]\nDone.`;
      const result = ScheduledScanner.parseScanResponse(text);
      expect(result).toHaveLength(1);
      expect(result[0]!.threadId).toBe("t2");
    });

    test("returns empty array for empty response", () => {
      expect(ScheduledScanner.parseScanResponse("[]")).toEqual([]);
    });

    test("returns empty array for no JSON", () => {
      expect(ScheduledScanner.parseScanResponse("no threads need attention")).toEqual([]);
    });

    test("returns empty array for invalid JSON", () => {
      expect(ScheduledScanner.parseScanResponse("[invalid json}")).toEqual([]);
    });

    test("handles multiple flagged threads", () => {
      const text = `[{"threadId":"a","reason":"Stale"},{"threadId":"b","reason":"Escalated"},{"threadId":"c","reason":"Urgent"}]`;
      const result = ScheduledScanner.parseScanResponse(text);
      expect(result).toHaveLength(3);
    });
  });

  describe("lifecycle", () => {
    test("start and stop", () => {
      ScheduledScanner.start();
      expect(ScheduledScanner.isRunning).toBe(true);

      ScheduledScanner.stop();
      expect(ScheduledScanner.isRunning).toBe(false);
    });

    test("start is idempotent", () => {
      ScheduledScanner.start();
      ScheduledScanner.start(); // no-op
      expect(ScheduledScanner.isRunning).toBe(true);

      ScheduledScanner.stop();
    });
  });
});
