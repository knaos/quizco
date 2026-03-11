import { describe, expect, it, vi } from "vitest";
import { ILogger } from "./Logger";
import { withErrorLogging } from "./safeHandler";

describe("withErrorLogging", () => {
  it("logs and swallows async errors", async () => {
    const logger: ILogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };
    const handler = withErrorLogging(
      logger,
      "socket:TEST_EVENT",
      async () => {
        throw new Error("boom");
      },
    );

    handler();
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      "Unhandled error in socket:TEST_EVENT",
      expect.any(Error),
    );
  });

  it("does not log on success", async () => {
    const logger: ILogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };
    const handler = withErrorLogging(
      logger,
      "socket:TEST_EVENT",
      async () => Promise.resolve(),
    );

    handler();
    await Promise.resolve();

    expect(logger.error).not.toHaveBeenCalled();
  });
});

